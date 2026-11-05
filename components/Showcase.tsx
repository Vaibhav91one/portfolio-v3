"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { projects } from "@/data/projects";
import Hero from "./Hero";
import ProjectsFallback from "./ProjectsFallback";
import ProjectsUI from "./ProjectsUI";
import SectionTag from "./SectionTag";
import { carouselPos, ramp } from "./stack";
import type { StageApi } from "./ProjectsStage";

gsap.registerPlugin(ScrollTrigger);

const ProjectsStage = dynamic(() => import("./ProjectsStage"), { ssr: false }); // three.js stays out of the first load

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
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
  const ui = useRef<HTMLDivElement>(null);
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
    let shown = -1;
    let wasDark: boolean | undefined;

    const update = (P: number) => {
      const on = P > 0.001; // first scroll: canvas takes over from the DOM pile in the same frame
      pile.style.visibility = on ? "hidden" : "visible";
      api.setVisible(on);
      api.render(P);

      const out = ramp(clamp01(P / 0.08));
      gsap.set(exits, { opacity: 1 - out, y: -24 * out });
      gsap.set(fades, { opacity: 1 - out });
      const dark = ramp(clamp01((P - 0.15) / 0.25)); // paper -> near black as the cards flip
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
      ui.current!.style.opacity = String(clamp01((P - 0.3) / 0.1));
      bar.current = projects.length > 1 ? pos / (projects.length - 1) : 1;
      const tg = ramp(clamp01((P - 0.28) / 0.1)); // the corner is free once the bio has gone and the cards are dark
      tag.current!.style.opacity = String(tg);
      tag.current!.style.transform = `translateY(${(1 - tg) * 12}px)`;
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
    return () => {
      clearTimeout(bootOff);
      clearTimeout(settle);
      gsap.ticker.remove(follow);
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
    <div ref={wrap} className="relative h-[800vh]" style={{ background: "#f4f4f4" }}>
      <div ref={stage} className="sticky top-0 h-screen overflow-clip">
        <Hero play={play} stack={stack} />
        {play && <ProjectsStage stack={stack} onReady={setApi} />}
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
