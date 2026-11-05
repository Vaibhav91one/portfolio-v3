// node scripts/record.mjs <slug|all>   Records each project's live site into public/projects/<slug>.{mp4,jpg} at 60fps (page mode: the whole page scrolled down and back).
// Engine lifted from purrfectui/scripts/capture/capture.mjs.
// (original header follows)
// Renders a component on the real site (hover / click: scroll to it, camera push-in, interact once, pull out, scroll back
// so the loop has no seam; scroll: scroll it through the viewport; load: record the page's own entrance) into public/projects/<slug>.{mp4,jpg}.
// Frame-exact 60fps: page time is virtual, so each step advances the page (CSS, rAF, GSAP) by exactly 1/60s no matter how
// long a frame takes to render. The camera (zoom + pan) is applied afterwards on a canvas with fractional source
// rects, so the zoom is sub-pixel smooth. Needs Chrome and system ffmpeg.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";
import { CLIPS } from "./projects.mjs";

const W = 1440; // CSS px; same ratio as the output, which is the gallery card's (aspect-[300/220]) so a card shows the whole frame
const H = 1056;
const DPR = 2; // rendered at 3x so the 3x camera zoom still has a source pixel per output pixel
const OUT_W = 1440;
const OUT_H = 1056; // 1440 / 1056 = 300 / 220; sharp in the dialog on a 2x screen
const FPS = 60;
const OUT = "public/projects";

// seconds
const T = { hold: 1.2, scroll: 1.4, push: 1.0, stay: 1.6, pull: 0.7, back: 1.2, rest: 1.0 };

const args = process.argv.slice(2);
const baseAt = args.indexOf("--base");
const baseArg = baseAt >= 0 ? args.splice(baseAt, 2)[1] : null;
const wanted = args[0] === "all" || !args[0] ? Object.keys(CLIPS) : [args[0]];

const sh = (cmd, a) => {
  const r = spawnSync(cmd, a, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${cmd} failed:\n${r.stderr.slice(-1500)}`);
};
const ease = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2); // ease-in-out cubic
const seg = (t, a, d) => ease(Math.min(1, Math.max(0, (t - a) / d)));
const lerp = (a, b, k) => a + (b - a) * k;

// draws one captured frame through the camera onto an ow x oh canvas, plus the cursor
const COMPOSE = async ({ img, sx, sy, sw, cur, press, ow, oh }) => {
  const c = (window.__c ??= Object.assign(document.createElement("canvas"), { width: ow, height: oh }));
  const g = (window.__g ??= c.getContext("2d"));
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  const bmp = await createImageBitmap(await (await fetch(`data:image/jpeg;base64,${img}`)).blob());
  const k = ow / sw;
  g.drawImage(bmp, sx, sy, sw, (sw * oh) / ow, 0, 0, ow, oh);
  bmp.close();
  const x = (cur[0] - sx) * k;
  const y = (cur[1] - sy) * k;
  const s = 1.15 * (ow / 960) * (press ? 0.9 : 1); // sized for a 960-wide frame, so it keeps its look at any output size
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.shadowColor = "rgba(0,0,0,.35)";
  g.shadowBlur = 8;
  g.shadowOffsetY = 2;
  g.beginPath(); // arrow pointer
  g.moveTo(0, 0);
  g.lineTo(0, 17);
  g.lineTo(4.4, 13);
  g.lineTo(7.4, 20);
  g.lineTo(10, 18.8);
  g.lineTo(7.1, 12);
  g.lineTo(12.5, 12);
  g.closePath();
  g.fillStyle = "#fff";
  g.fill();
  g.shadowColor = "transparent";
  g.lineWidth = 1.4;
  g.strokeStyle = "#111";
  g.stroke();
  g.restore();
  return c.toDataURL("image/jpeg", 0.96).split(",")[1];
};

// The timeline of a clip, one object per mode: what the page scroll, the cursor, a mouse press and the camera do at time t.
//   hover / click: scroll to the target, push in, interact once, pull out, scroll back (the loop has no seam)
//   scroll:        hold, scroll the target through the viewport, hold, scroll back
//   load:          the page's own entrance, from first paint (no scroll, no cursor); the clip ends on the settled page
const PARK = [W - 60, 60];
const HIDDEN = [-200, -200];
function planFor(clip, m) {
  const mode = clip.interact === "page" ? "scroll" : (clip.interact ?? "hover");
  if (mode === "load") {
    const z = clip.zoom ?? 1;
    if (clip.push != null) {
      // push in on the focus once the entrance has landed, hold, pull back out (the same camera as hover)
      const pull = clip.push + T.push + (clip.stay ?? T.stay);
      const end = pull + T.pull + T.rest;
      return {
        end, y: () => 0, cur: () => HIDDEN, press: () => false,
        cam: (t) => {
          const e = seg(t, clip.push, T.push) - seg(t, pull, T.pull);
          return { z: Math.exp(Math.log(z) * e), cx: lerp(W / 2, m.focus[0], e), cy: lerp(H / 2, m.focus[1], e) };
        },
      };
    }
    const end = (clip.seconds ?? 4.2) + T.rest;
    return { end, y: () => 0, cur: () => HIDDEN, press: () => false, cam: () => ({ z, cx: m.focus[0], cy: m.focus[1] }) };
  }
  if (mode === "scroll") {
    const a = 1.0; // hold
    const run = clip.seconds ?? 4.0; // scroll in
    const stay = 1.0;
    const back = 2.0;
    const end = a + run + stay + back + 0.6;
    return { end, y: (t) => m.from + (m.to - m.from) * (seg(t, a, run) - seg(t, a + run + stay, back)), cur: () => HIDDEN, press: () => false, cam: () => ({ z: clip.zoom ?? 1, cx: W / 2, cy: H / 2 }) };
  }
  // hover / click
  const stay = clip.stay ?? T.stay;
  const tPush = T.hold + T.scroll;
  const tPull = tPush + T.push + stay;
  const tBack = tPull + T.pull;
  const end = tBack + T.back + T.rest;
  const Z = clip.zoom ?? m.Z;
  const presses = mode === "click" ? [[tPush + T.push + 0.2, tPush + T.push + 0.4], ...(clip.toggle ? [[tPush + T.push + 0.2 + clip.toggle, tPush + T.push + 0.4 + clip.toggle]] : [])] : [];
  return {
    end,
    y: (t) => lerp(0, m.dest, seg(t, T.hold, T.scroll)) - lerp(0, m.dest, seg(t, tBack, T.back)),
    cur: (t) => {
      const k = seg(t, tPush + 0.1, T.push) - seg(t, tPull, T.pull);
      return [lerp(PARK[0], m.target[0], k), lerp(PARK[1], m.target[1], k)];
    },
    press: (t) => presses.some(([a, b]) => t > a && t < b),
    cam: (t) => {
      const e = seg(t, tPush, T.push) - seg(t, tPull, T.pull);
      return { z: Math.exp(Math.log(Z) * e), cx: lerp(W / 2, m.target[0], e), cy: lerp(H / 2, m.target[1], e) };
    },
  };
}

async function render(slug, clip, base, browser) {
  const mode = clip.interact === "page" ? "scroll" : (clip.interact ?? "hover");
  const dir = mkdtempSync(path.join(tmpdir(), `clip-${slug}-`));
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
  // a site's intro is skipped on a repeat visit in the same tab: preset its sessionStorage flags (clip.session, the portfolio's
  // by default), or none with fresh: true when the clip is of that intro
  // clip.local: localStorage flags for the same reason (a site's one-time dialog, Mapinly's language picker)
  await ctx.addInitScript(([session, local]) => {
    try {
      for (const [k, v] of Object.entries(session)) sessionStorage.setItem(k, v);
      for (const [k, v] of Object.entries(local)) localStorage.setItem(k, v);
    } catch {}
    // motion runs opacity through the Web Animations API, which the virtual clock does not delay, while it drives
    // transforms from its own JS clock: an entrance would fade in long before it moves. Without WAAPI both share one clock.
    delete Element.prototype.animate;
  }, [clip.fresh ? {} : (clip.session ?? { seenPreloader: "1" }), clip.local ?? {}]);
  const page = await ctx.newPage();
  const mixer = await ctx.newPage(); // blank page that composes frames
  await mixer.goto("about:blank");
  // the mixer opened last and is the visible tab: on the real clock a hidden tab barely paints (a few screencast frames a
  // second) and does not repaint after a scroll, so the recorded page comes to the front
  if (clip.realtime) await page.bringToFront();
  const cdp = await ctx.newCDPSession(page);
  const evalIn = async (expression) => (await cdp.send("Runtime.evaluate", { expression, returnByValue: true })).result.value;
  const centreOf = (sel) => evalIn(`(() => { const n = document.querySelector(${JSON.stringify(sel)}); if (!n) return null; const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width, r.height]; })()`);

  let lastShot = null;
  let top = 0; // the page's real scroll offset; the screenshot clip is in document coordinates
  const policy = mode === "load" || mode === "click" ? "pauseIfNetworkFetchesPending" : "advance"; // time waits for any fetch the page starts (an intro, an opened menu)
  const step = async (shot = true) => {
    const done = new Promise((res) => cdp.once("Emulation.virtualTimeBudgetExpired", res));
    await cdp.send("Emulation.setVirtualTimePolicy", { policy, budget: 1000 / FPS });
    // the budget event can be skipped (fetches pending); do not wait on it forever
    await Promise.race([done, new Promise((r) => setTimeout(r, 2000))]);
    if (!shot) return null; // waiting for a start condition: only time needs to move
    // a screenshot can stall while the page is busy: try again, and only then reuse the last good frame
    let data = null;
    for (let tries = 0; tries < 3 && data === null; tries++) {
      const shot = cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 95, optimizeForSpeed: true, clip: { x: 0, y: top, width: W, height: H, scale: DPR } }).then((r) => r.data);
      data = await Promise.race([shot, new Promise((r) => setTimeout(() => r(null), 4000))]);
    }
    if (data === null && lastShot === null) throw new Error("the page never produced a frame");
    if (data !== null) lastShot = data;
    return data ?? lastShot;
  };

  // camera: zoom in log space so the push feels even; the centre travels with the same ease
  const emit = async (i, img, { z, cx: ccx, cy: ccy }, cur, press, px = DPR) => {
    const sw = (W * px) / z;
    const sh = (H * px) / z;
    const cx = ccx * px;
    const cy = ccy * px;
    const sx = Math.min(Math.max(cx - sw / 2, 0), W * px - sw);
    const sy = Math.min(Math.max(cy - sh / 2, 0), H * px - sh);
    const jpg = await mixer.evaluate(COMPOSE, { img, sx, sy, sw, cur: [cur[0] * px, cur[1] * px], press, ow: OUT_W, oh: OUT_H });
    writeFileSync(path.join(dir, `c${String(i).padStart(5, "0")}.jpg`), Buffer.from(jpg, "base64"));
  };

  const m = {}; // what the plan needs, measured on the real page
  if (mode === "load") {
    // Virtual time only moves in our steps, and not at all while a fetch is pending, so the page finishes loading before
    // its entrance plays and none of it is missed. Recording starts on the first frame where `start` is true.
    await cdp.send("Page.enable");
    await cdp.send("Page.navigate", { url: base });
    let started = false;
    // realtime: a page whose intro never lets a screenshot finish under paused time (Mapinly's preloader); poll the real clock
    for (let i = 0; clip.realtime && i < 1500 && !started; i++) {
      started = !!(await evalIn(clip.start).catch(() => false));
      if (!started) await page.waitForTimeout(10);
    }
    for (let i = 0; !clip.realtime && i < 2400 && !started; i++) {
      await step(false);
      started = !!(await evalIn(clip.start));
      if (i % 20 === 0) process.stdout.write(`\r  waiting for the entrance ${i} ${await evalIn("document.readyState + ' ' + (document.querySelector('nav')?.style.cssText ?? 'no nav')")}  `);
    }
    if (!started) throw new Error(`"${slug}": the entrance never started (clip.start: ${clip.start})`);
    // a target below the fold (a looping card): record it centred instead of the page top; the camera aims at it too
    if (clip.target) top = await evalIn(`(() => { const r = document.querySelector(${JSON.stringify(clip.target)}).getBoundingClientRect(); scrollTo({ top: r.top + scrollY + r.height / 2 - innerHeight / 2, behavior: "instant" }); return scrollY; })()`);
    const f = clip.focus ?? clip.target ? await centreOf(clip.focus ?? clip.target) : null;
    m.focus = f ? [f[0], f[1]] : [W / 2, H / 2];
  } else {
    await page.goto(base, { waitUntil: "load" });
    await page.waitForLoadState("networkidle").catch(() => {});
    const el = clip.interact === "page" ? null : page.locator(clip.target).first();
    if (el) await el.waitFor({ state: "attached", timeout: 15000 });
    if (clip.interact === "page") {
      const docH = await evalIn("document.documentElement.scrollHeight");
      m.from = 0;
      m.to = Math.max(1, Math.min(docH - H, H * (clip.depth ?? 1.4))); // down the page and back
    } else if (mode === "scroll") {
      const docTop = await el.evaluate((n) => n.getBoundingClientRect().top + scrollY);
      m.from = Math.max(0, docTop - H * (clip.startAt ?? 0.97)); // the text is just below the fold (startAt: a shorter run, its top lower on screen)
      m.to = Math.max(m.from + 1, docTop - H * (clip.endAt ?? 0.1)); // its top near the top of the screen
    } else {
      // where the camera will look, measured once the target is centred
      const centre = await el.evaluate((n) => {
        const r = n.getBoundingClientRect();
        return r.top + scrollY + r.height / 2;
      });
      m.dest = Math.max(0, centre - H / 2);
      await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), m.dest);
      await page.waitForTimeout(400);
      const r = await el.boundingBox();
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForTimeout(400);
      m.target = [r.x + r.width / 2, r.y + r.height / 2];
      m.Z = Math.max(1.5, Math.min((H * 0.5) / r.height, (W * 0.42) / r.width, 3));
    }
    if (mode === "scroll") {
      await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), m.from);
      await page.waitForTimeout(400);
    }
    // from here on page time only moves when we say so: 1/60s per step, one frame each
    if (!clip.realtime) await cdp.send("Emulation.setVirtualTimePolicy", { policy: "pause" });
  }

  if (clip.realtime) {
    // Armour's open menu never lets a screenshot finish while virtual time is paused, so this clip runs on the real clock:
    // raw screenshots are stamped as they arrive (a few tens of ms apart), then composed at the full frame rate with the
    // camera and cursor evaluated at each exact frame time, so the push-in stays smooth.
    if (mode !== "load") {
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: PARK[0], y: PARK[1] });
      await page.waitForTimeout(1000);
    }
    const rt = planFor(clip, m);
    const shots = [];
    let t0 = 0;
    // the screencast pushes a frame whenever the page paints, so the page is captured at about its own frame rate
    cdp.on("Page.screencastFrame", (f) => {
      shots.push({ t: (Date.now() - t0) / 1000, data: f.data });
      cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    });
    t0 = Date.now();
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: W * DPR, maxHeight: H * DPR, everyNthFrame: 1 });
    let at = null;
    let held = false;
    let sy = 0;
    for (let t = 0; t < rt.end; t = (Date.now() - t0) / 1000) {
      // the same scroll to the target and back as the paused-time path (without it a target below the fold is never seen)
      const y = mode === "load" ? 0 : rt.y(t);
      if (Math.abs(y - sy) > 0.5) {
        sy = y;
        await evalIn(`scrollTo({ top: ${y}, behavior: "instant" })`);
      }
      const cur = rt.cur(t);
      if (!at || Math.abs(cur[0] - at[0]) + Math.abs(cur[1] - at[1]) > 0.01) await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: cur[0], y: cur[1] });
      at = cur;
      const press = rt.press(t);
      if (press !== held) {
        held = press;
        if (press) await evalIn(`document.querySelector(${JSON.stringify(clip.target)})?.click()`);
      }
      await new Promise((r) => setTimeout(r, 8));
    }
    await cdp.send("Page.stopScreencast");
    // the screencast opens with the last frame it had, from before the jump to the target: drop it
    if (mode === "load" && clip.target && shots.length > 1) shots.shift();
    const jpgW = Buffer.from(shots[0].data, "base64");
    let o = 2; // the frame's pixel size, from its JPEG header
    while (o < jpgW.length && !(jpgW[o] === 0xff && jpgW[o + 1] >= 0xc0 && jpgW[o + 1] <= 0xc3)) o += 2 + jpgW.readUInt16BE(o + 2);
    const px = jpgW.readUInt16BE(o + 7) / W; // frame pixels per CSS px (the screencast sends CSS-px sized frames)
    const rn = Math.round(rt.end * FPS);
    process.stdout.write(`  ${shots.length} real-time screenshots (${(shots.length / rt.end).toFixed(1)}/s)\n`);
    let k = 0;
    for (let i = 0; i < rn; i++) {
      const t = i / FPS;
      while (k + 1 < shots.length && shots[k + 1].t <= t) k++;
      await emit(i, shots[k].data, rt.cam(t), rt.cur(t), rt.press(t), px);
      if (i % 60 === 0) process.stdout.write(`\r  frame ${i}/${rn}`);
    }
    process.stdout.write("\n");
    await ctx.close();
    return { dir, n: rn, poster: "c00000.jpg" };
  }

  if (mode !== "load") {
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: PARK[0], y: PARK[1] });
    for (let i = 0; i < 90; i++) await step(); // let the page settle
  }

  const plan = planFor(clip, m);
  const n = Math.round(plan.end * FPS);
  let scrollY = mode === "scroll" ? m.from : 0;
  if (mode === "scroll") top = m.from; // the page starts already scrolled, so the screenshot clip starts there too (not at 0, which is blank above the viewport)
  let down = false;
  let last = null;
  for (let i = 0; i < n; i++) {
    const t = i / FPS;
    // page state at time t: scroll, then cursor
    const y = plan.y(t);
    if (Math.abs(y - scrollY) > 1e-3 && mode !== "load") {
      scrollY = y;
      // page.evaluate can stall while time is paused, so go through CDP
      top = await evalIn(`scrollTo({ top: ${y}, behavior: "instant" }), scrollY`);
    }
    const cur = plan.cur(t);
    if (mode !== "load" && mode !== "scroll") {
      if (!last || Math.abs(cur[0] - last[0]) + Math.abs(cur[1] - last[1]) > 0.01) await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: cur[0], y: cur[1] }); // only when it moved: a busy page (an opening menu) does not answer input events under paused time
      last = cur; // the press itself is only drawn (see below): a pressed-button state blocks under paused time
      const press = plan.press(t);
      if (press !== down) {
        down = press;
        // a CDP mouse press blocks while virtual time is paused, so the click is the element's own (the cursor still shows the press)
        if (press) await evalIn(`document.querySelector(${JSON.stringify(clip.target)})?.click()`);
      }
    }

    const img = await step();
    lastShot = img;

    await emit(i, img, plan.cam(t), cur, down);
    if (i % 60 === 0) process.stdout.write(`\r  frame ${i}/${n}`);
  }
  process.stdout.write("\n");
  await ctx.close();
  // an intro starts from a blank page, so its poster is the settled last frame rather than the first
  return { dir, n, poster: mode === "load" ? `c${String(n - 1).padStart(5, "0")}.jpg` : "c00000.jpg" };
}

function encode(slug, rec) {
  const src = ["-y", "-hide_banner", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(rec.dir, "c%05d.jpg"), "-an"];
  mkdirSync(OUT, { recursive: true });
  sh("ffmpeg", [...src, "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-profile:v", "high", "-g", String(FPS), "-vf", "scale=in_range=pc:out_range=tv,format=yuv420p", "-color_range", "tv", "-movflags", "+faststart", `${OUT}/${slug}.mp4`]);
  sh("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", path.join(rec.dir, rec.poster), "-q:v", "4", `${OUT}/${slug}.jpg`]);
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const slug of wanted) {
    const clip = CLIPS[slug];
    if (!clip) throw new Error(`no entry for "${slug}" in scripts/capture/clips.mjs`);
    const base = baseArg ?? clip.site;
    console.log(`rendering ${slug} from ${base}`);
    const rec = await render(slug, clip, base, browser);
    if (clip.poster != null) rec.poster = `c${String(Math.round(clip.poster * FPS)).padStart(5, "0")}.jpg`; // the still at that second
    encode(slug, rec);
    rmSync(rec.dir, { recursive: true, force: true });
    console.log(`  ${OUT}/${slug}.mp4 / .jpg`);
  }
} finally {
  await browser.close();
}
