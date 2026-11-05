"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { projects } from "@/data/projects";
import Hero from "./Hero";
import ProjectsFallback from "./ProjectsFallback";
import Asterisk from "./Asterisk";
import Footer from "./Footer";
import PixelSky from "./PixelSky";
import Roles from "./Roles";
import ProjectsUI from "./ProjectsUI";
import SectionTag from "./SectionTag";
import { carouselPos, ramp } from "./stack";
import type { StageApi } from "./ProjectsStage";

gsap.registerPlugin(ScrollTrigger);

const ProjectsStage = dynamic(() => import("./ProjectsStage"), { ssr: false }); // three.js stays out of the first load

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const noop = () => () => {};
// "gl" on the server so hydration matches; the client may downgrade to the plain list
let cached: "gl" | "list" | undefined; // getSnapshot runs on every render: probe WebGL once, not once per render
const mode = () => {
  if (cached) return cached;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return (cached = "list");
  try {
    return (cached = document.createElement("canvas").getContext("webgl2") ? "gl" : "list");
  } catch {
    return (cached = "list");
  }
};

/** Pinned scroll stage: hero pile -> flip + fan out -> curved video carousel. */
export default function Showcase({ play, stack }: { play: boolean; stack: string[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const bar = useRef(0); // 0..1 through the carousel, read by the pixel bar
  const tag = useRef<HTMLDivElement>(null);
  const ast = useRef<HTMLDivElement>(null);
  const spin = useRef<SVGGElement>(null);
  const ui = useRef<HTMLDivElement>(null);
  const roles = useRef<HTMLDivElement>(null);
  const bio = useRef<HTMLDivElement>(null);
  const tags = useRef<HTMLDivElement>(null);
  const sky = useRef<HTMLDivElement>(null); // the calmer pixel sky for the stamps section
  const pages = useRef<HTMLDivElement>(null); // the footer screen
  const [api, setApi] = useState<StageApi | null>(null);
  const [idx, setIdx] = useState(0);
  const [settled, setSettled] = useState(false); // false until the first position is drawn: no rolling title on load
  const kind = useSyncExternalStore(noop, mode, () => "gl");

  // Reloaded part-way down (the browser restores the scroll): keep the stage invisible until the scene is drawn at
  // that exact position, then fade it in, so it never flashes the hero or glides there from the top.
  useLayoutEffect(() => {
    if (!play || window.scrollY < 2) return;
    const st = stage.current!;
    st.style.opacity = "0";
    const bail = setTimeout(() => (st.style.opacity = "1"), 3000); // never stay hidden if the scene can't load
    return () => clearTimeout(bail);
  }, [play]);

  useEffect(() => {
    if (!api) return;
    const st = stage.current!;
    const pile = st.querySelector<HTMLElement>("[data-pile]")!;
    const exits = st.querySelectorAll<HTMLElement>("[data-exit]");
    const fades = st.querySelectorAll<HTMLElement>("[data-fade]"); // fade only (no slide): the pixel sky
    const nav = st.querySelector<HTMLElement>("[data-nav]");
    let navGone = false;
    let idle = 0; // extra degrees from the footer idle spin
    let idleW = 0; // 0..1 weight of that spin: grows as the star arrives at the footer
    let lastS = 0;
    let shown = -1;
    let wasDark: boolean | undefined;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const update = (S: number) => {
      // S = raw scroll progress over the whole wrapper (1300vh). u counts the old "15 per 1400vh" units: (1300-100)*15/1400,
      // so P (hero + carousel) keeps its exact old scroll speed. F: the carousel panels turn into the stamp cards. H: the
      // stamps leave and the footer comes in; a short hold follows.
      const u = S * 12.857;
      const P = clamp01(u / 8);
      const F = clamp01((u - 8) / 2);
      const H = clamp01((u - 10) / 2);
      const on = P > 0.001; // first scroll: canvas takes over from the DOM pile in the same frame
      pile.style.visibility = on ? "hidden" : "visible";
      api.setVisible(on);
      api.render(P, F, H);

      const out = ramp(clamp01(P / 0.08));
      gsap.set(exits, { opacity: 1 - out, y: -24 * out });
      gsap.set(fades, { opacity: 1 - out });
      const dark = ramp(clamp01((P - 0.15) / 0.25)) * (1 - ramp(clamp01((F - 0.25) / 0.3))); // paper -> near black as the cards flip, back to paper into the contact section
      const bg = `rgb(${mix(244, 10, dark)},${mix(244, 10, dark)},${mix(244, 10, dark)})`;
      wrap.current!.style.background = bg;
      const isDark = dark > 0.5; // remembered so a reload paints dark from the first frame (see the boot script in layout)
      if (isDark !== wasDark) {
        wasDark = isDark;
        try {
          sessionStorage.setItem("pv3-dark", isDark ? "1" : "0");
        } catch {}
      }
      st.style.setProperty("--fg", `rgb(${mix(17, 255, dark)},${mix(17, 255, dark)},${mix(17, 255, dark)})`);

      const pos = carouselPos(P, projects.length);
      ui.current!.style.opacity = String(clamp01((P - 0.3) / 0.1) * (1 - clamp01(F / 0.3)));
      bar.current = projects.length > 1 ? pos / (projects.length - 1) : 1;
      lastS = S;
      if (!still) spin.current!.setAttribute("transform", `rotate(${S * 2700 + idle} 7 7)`); // scroll down = clockwise, up = anticlockwise
      // one star, always visible: bottom-left corner (carousel, stamps) -> bottom centre, bigger (footer)
      const m = ramp(clamp01((H - 0.1) / 0.7)); // corner -> bottom centre
      const corner = 1 - 0.45 * ramp(clamp01((P - 0.1) / 0.3)); // shrinks into the corner so it stays clear of the carousel
      const sz = Math.min(innerWidth * 0.32, innerHeight * 0.6); // the star's box (SIZE in Asterisk.tsx)
      idleW = m;
      const T = Math.min(innerWidth * 0.9, innerHeight * 0.8); // its final box: fills the bottom centre
      const sc = lerp(corner, T / sz, m);
      const y = -m * ((sz * sc) / 2 - innerHeight * 0.1); // the lowest arm tip bleeds ~10vh below the bottom edge
      ast.current!.style.transform = `translate(${50 * m}vw, ${y}px) scale(${sc})`;
      const navOut = ramp(clamp01((H - 0.3) / 0.3)); // the top nav is not part of the footer
      if (nav && (navOut > 0 || navGone)) {
        nav.style.opacity = String(1 - navOut);
        nav.style.pointerEvents = navOut > 0.5 ? "none" : "";
        navGone = navOut > 0; // only touched while hidden, so the hero intro tween is left alone
      }
      const tg = ramp(clamp01((P - 0.28) / 0.1)); // the corner is free once the bio has gone and the cards are dark
      tag.current!.style.opacity = String(tg * (1 - clamp01(F / 0.3))); // not part of the footer
      tag.current!.style.transform = `translateY(${(1 - tg) * 12}px)`;
      const out2 = ramp(clamp01((H - 0.1) / 0.4)); // the third section leaves as the footer comes in
      const rl = roles.current!;
      rl.style.opacity = String(1 - out2);
      rl.style.transform = `translateY(${-3 * out2}vh)`;
      tags.current!.style.transform = `translateY(${ramp(clamp01(H / 0.5)) * innerHeight * 1.1}px)`; // role labels leave with their tiles
      const bg2 = ramp(clamp01((F - 0.35) / 0.12)); // the bio and button rise from below, like the "Selected Work" tag
      bio.current!.style.opacity = String(bg2);
      bio.current!.style.transform = `translateY(${(1 - bg2) * 24}px)`;
      const rv = clamp01((F - 0.4) / 0.4); // roles statement: characters appear in order, rising a little
      const chars = [...st.querySelectorAll<HTMLElement>("[data-char]")]; // "What I do" and the role labels (these mount after hydration, so look them up here)
      const N = chars.length;
      chars.forEach((el, i) => {
        const l = clamp01((rv * (N + 8) - i) / 8);
        const e = l * l * (3 - 2 * l);
        el.style.opacity = String(e);
        el.style.transform = `translateY(${(1 - e) * 45}%)`;
      });
      sky.current!.style.opacity = String(ramp(clamp01((F - 0.3) / 0.4))); // the hero pixels return after the carousel and stay to the end
      const pg = pages.current!;
      pg.style.opacity = String(ramp(clamp01((H - 0.35) / 0.45))); // the footer fades in as the stamps leave
      pg.style.pointerEvents = H > 0.9 ? "auto" : "none";
      const i = Math.round(pos);
      if (i !== shown) setIdx((shown = i));
    };

    // Scroll progress -> scene, through a critically-damped follower (no scrub tween): at creation it starts AT the
    // current scroll position instead of animating up from zero, and it moves the same way up and down.
    const trigger = ScrollTrigger.create({ trigger: wrap.current, start: "top top", end: "bottom bottom" });
    const progress = () => clamp01((window.scrollY - trigger.start) / (trigger.end - trigger.start || 1));
    let target = progress();
    let cur = target;
    update(cur);
    if (st.style.opacity === "0") {
      st.style.transition = "opacity 450ms cubic-bezier(0.23, 1, 0.32, 1)";
      requestAnimationFrame(() => (st.style.opacity = "1"));
    }
    // the scene now paints its own background: drop the boot colour once the fade is done
    const bootOff = setTimeout(() => document.documentElement.removeAttribute("data-boot"), 600);
    const settle = setTimeout(() => setSettled(true), 100);

    const follow = (_t: number, dt: number) => {
      target = progress();
      if (target === cur) return;
      const next = cur + (target - cur) * (1 - Math.exp(-dt / 1000 / 0.1));
      cur = Math.abs(target - next) < 1e-4 ? target : next;
      update(cur);
    };
    gsap.ticker.add(follow);
    // in the footer the star keeps turning on its own (clockwise), so it never freezes when the page stops
    const idleSpin = (_t: number, dt: number) => {
      if (still || idleW <= 0) return;
      idle += (dt / 1000) * 36 * idleW;
      spin.current!.setAttribute("transform", `rotate(${lastS * 2700 + idle} 7 7)`);
    };
    gsap.ticker.add(idleSpin);
    return () => {
      clearTimeout(bootOff);
      clearTimeout(settle);
      gsap.ticker.remove(follow);
      gsap.ticker.remove(idleSpin);
      trigger.kill();
      pile.style.visibility = "";
      gsap.set(exits, { clearProps: "opacity,transform" });
      gsap.set(fades, { clearProps: "opacity" });
    };
  }, [api]);

  if (kind === "list")
    return (
      <>
        <Hero play={play} stack={stack} />
        <ProjectsFallback />
      </>
    );

  return (
    <div ref={wrap} className="relative h-[1300vh]" style={{ background: "#f4f4f4" }}>
      <div ref={stage} className="sticky top-0 h-screen overflow-clip">
        <div ref={sky} data-gate className="pointer-events-none absolute inset-0 opacity-0">
          <PixelSky play={play} calm />
        </div>
        <Asterisk play={play} box={ast} spin={spin} />
        <Hero play={play} stack={stack} />
        {play && <ProjectsStage stack={stack} onReady={setApi} />}
        <Roles box={roles} bio={bio} tags={tags} />
        <div ref={pages} className="pointer-events-none absolute inset-x-0 top-0 z-[16] opacity-0 text-[color:var(--fg,#111)] [&>section]:h-screen">
          <Footer />
        </div>
        <SectionTag tag={tag} />
        <ProjectsUI idx={idx} progress={bar} ui={ui} instant={!settled} />
        <ul className="sr-only">
          {projects.map((p) => (
            <li key={p.slug}>
              <a href={p.link} target="_blank" rel="noopener">
                {p.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
