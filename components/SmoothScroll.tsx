"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Inertial wheel/trackpad scrolling, driven by gsap's ticker so ScrollTrigger scrubs stay in sync. Frozen while `active` is false. */
export default function SmoothScroll({ active }: { active: boolean }) {
  const lenis = useRef<Lenis | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const l = new Lenis({ lerp: 0.08 });
    l.stop();
    lenis.current = l;
    l.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => l.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      l.destroy();
      lenis.current = null;
    };
  }, []);

  useEffect(() => {
    if (active) lenis.current?.start();
    else lenis.current?.stop();
  }, [active]);

  return null;
}
