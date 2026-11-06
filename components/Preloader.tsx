"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { HERO_POSE, POSES, RAMP, cardSize } from "./stack";

const IMAGES = Array.from({ length: 12 }, (_, i) => `/preloader/${i + 1}.webp`);
const HERO = "/hero.webp"; // the last frame of the trail: dropped at the centre, then settles on top of the pile
const MAX_IMAGES = 8; // visible at once
const STEP_PX = 120; // cursor travel between two images
const PATH_S = 6; // seconds the fake cursor takes: loop around the corners, then spiral into the centre
const TURNS = 1.25; // laps around the screen before it is done
const LOOP_SHARE = 0.55; // first part of the path hugs the corners, the rest spirals inward
const SAMPLES = 1200; // path resolution
const FLY_S = 0.9; // the last trail images fly into the pile
const FLY_STAGGER_S = 0.08;
const END_HOLD_S = 0.3; // beat on the finished pile before the hand-off
const PILE_ZONE_PX = STEP_PX * 4.5; // phones: drops this close to the end of the path land on the centre (>= the 4 pile cards)
const PHONE_MAX_W = 700; // same cut as stampSlots

/** Superellipse point (exponent < 1 squares the loop so it reaches the corners). r in 0..1 of the half-size. */
const pointAt = (angle: number, r: number, w: number, h: number) => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const sq = (v: number) => Math.sign(v) * Math.abs(v) ** 0.6;
  return { x: w / 2 + sq(c) * (w / 2) * r, y: h / 2 + sq(s) * (h / 2) * r };
};

/**
 * Mouse image gallery (Olivier Larose) as a preloader. A scripted cursor circles the screen's corners, then spirals
 * into the centre, feeding the original rule: an image every STEP_PX of travel, newest on top, the oldest disappears
 * once 8 are showing. The path is walked by arc length for an even, smooth speed. At the centre the last four trail
 * images and the hero photo (the trail's final frame, dropped at the centre) fly into a rotated pile; onDone(srcs)
 * then hands the pile to Hero.
 */
export default function Preloader({ onDone }: { onDone: (stack: string[]) => void }) {
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const hero = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDone(IMAGES.slice(0, POSES.length));
      return;
    }

    let tl: gsap.core.Timeline | undefined;
    let raf = 0;
    let cancelled = false;
    document.body.style.overflow = "hidden";

    const run = () => {
      if (cancelled) return;
      const { innerWidth: w, innerHeight: h } = window;
      const g = { steps: 0, current: 0, visible: 0, z: 0 };
      const dropped: HTMLImageElement[] = []; // every image placed, in order
      // The path is short on a phone, so its last drops (the pile cards) sat on the left edge and then flew to the middle:
      // there the final drops land on the centre and the pile forms in place.
      const phone = w < PHONE_MAX_W;

      // the original mousemove handler, fed (x, y, travelled px) instead of a MouseEvent
      const move = (x: number, y: number, travelled: number, left: number) => {
        g.steps += travelled;
        if (g.steps >= g.current * STEP_PX) {
          const img = imgs.current[g.current];
          if (img) {
            const centre = phone && left < PILE_ZONE_PX;
            img.style.left = `${centre ? w / 2 : x}px`;
            img.style.top = `${centre ? h / 2 : y}px`;
            img.style.display = "block";
            img.style.zIndex = String(++g.z);
            dropped.push(img);
            g.current++;
            g.visible++;
          }
          if (g.visible === MAX_IMAGES) {
            const oldest = imgs.current[(g.current - g.visible + IMAGES.length) % IMAGES.length];
            if (oldest) oldest.style.display = "none";
            g.visible--;
          }
        }
        if (g.current === IMAGES.length) {
          g.current = 0;
          g.steps = -STEP_PX;
        }
      };

      // sample the whole route once, with cumulative length, so it can be walked at an even speed
      const startAngle = -Math.PI * 0.75; // top-left corner, clockwise
      const ease = gsap.parseEase("power2.inOut");
      const pts: { x: number; y: number; d: number }[] = [];
      for (let i = 0; i <= SAMPLES; i++) {
        const u = i / SAMPLES;
        const k = u <= LOOP_SHARE ? 0 : (u - LOOP_SHARE) / (1 - LOOP_SHARE);
        const p = pointAt(startAngle + u * TURNS * Math.PI * 2, 1 - ease(k), w, h);
        const prev = pts[i - 1];
        pts.push({ ...p, d: prev ? prev.d + Math.hypot(p.x - prev.x, p.y - prev.y) : 0 });
      }
      const total = pts[SAMPLES].d;
      const glide = gsap.parseEase("sine.inOut"); // start and stop like a hand, not a machine

      const t0 = performance.now();
      let idx = 0;
      let prev = pts[0];
      const tick = (now: number) => {
        const t = Math.min((now - t0) / 1000 / PATH_S, 1);
        const s = glide(t) * total;
        while (idx < SAMPLES - 1 && pts[idx + 1].d < s) idx++;
        const a = pts[idx];
        const b = pts[idx + 1];
        const f = b.d > a.d ? (s - a.d) / (b.d - a.d) : 0;
        const x = a.x + (b.x - a.x) * f;
        const y = a.y + (b.y - a.y) * f;
        move(x, y, Math.hypot(x - prev.x, y - prev.y), total - s);
        prev = { x, y, d: s };
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      // the end: the cursor drops the hero photo at the centre as the trail's final frame, then it and the last four
      // trail images fly into the pile together
      const toPile = () => {
        const cards = dropped.slice(-POSES.length); // oldest first = bottom of the pile
        const rest = imgs.current.filter((f): f is HTMLImageElement => !!f && !cards.includes(f));
        gsap.to(rest, { opacity: 0, duration: 0.3, onComplete: () => rest.forEach((f) => (f.style.display = "none")) });

        const heroEl = hero.current!;
        heroEl.style.left = `${w / 2}px`;
        heroEl.style.top = `${h / 2}px`;
        heroEl.style.display = "block";
        heroEl.style.zIndex = String(++g.z);

        const size = cardSize(w, h);
        const fly = gsap.timeline();
        cards.forEach((el, i) => {
          const pose = POSES[i];
          // freeze the natural height first so height can tween to the card's crop
          gsap.set(el, { height: el.offsetHeight });
          fly.to(
            el,
            {
              left: w / 2,
              top: h / 2,
              x: (pose.x * w) / 100,
              y: (pose.y * h) / 100,
              rotation: pose.rot,
              width: size.w,
              height: size.h,
              duration: FLY_S,
              ease: RAMP,
            },
            i * FLY_STAGGER_S
          );
        });
        gsap.set(heroEl, { height: heroEl.offsetHeight });
        fly.to(
          heroEl,
          { left: w / 2, top: h / 2, x: 0, y: 0, rotation: HERO_POSE.rot, width: size.w, height: size.h, duration: FLY_S, ease: RAMP },
          cards.length * FLY_STAGGER_S
        );
        fly.call(() => onDone(cards.map((c) => c.getAttribute("src")!)), [], `>${END_HOLD_S}`);
        tl = fly;
      };
      tl = gsap.timeline().call(toPile, [], PATH_S);
    };

    // preloader job: don't start before every image is decoded (a failed one is just skipped)
    Promise.allSettled(
      [...IMAGES, HERO].map((src) => {
        const i = new Image();
        i.src = src;
        return i.decode();
      })
    ).then(run);

    const frames = imgs.current;
    const heroEl = hero.current;
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      tl?.kill();
      frames.forEach((f) => f && (f.style.display = "none")); // StrictMode remount starts clean
      if (heroEl) heroEl.style.display = "none";
      document.body.style.overflow = "";
    };
  }, [onDone]);

  return (
    <div aria-hidden className="fixed inset-0 z-50 overflow-hidden bg-[#f4f4f4]">
      {IMAGES.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- local frames toggled by display, must be eager
        <img
          key={src}
          ref={(n) => void (imgs.current[i] = n)}
          src={src}
          alt=""
          className="absolute hidden w-[30vw] -translate-x-1/2 -translate-y-1/2 object-cover"
        />
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element -- same frame as the trail; ends pixel-identical to the Hero's hero card */}
      <img ref={hero} src={HERO} alt="" className="absolute hidden w-[30vw] -translate-x-1/2 -translate-y-1/2 object-cover" />
    </div>
  );
}
