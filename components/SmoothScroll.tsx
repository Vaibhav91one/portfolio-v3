"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Inertial wheel/trackpad scrolling, driven by gsap's ticker so ScrollTrigger scrubs stay in sync. Lenis is only
 * downloaded once `active` turns true (after the intro), so it stays out of the first load; its few CSS rules live in
 * globals.css. Before that there's nothing to scroll anyway (the preloader locks the page).
 */
export default function SmoothScroll({ active }: { active: boolean }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.ticker.lagSmoothing(0);
  }, []);

  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    let stop = () => {};
    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const l = new Lenis({ lerp: 0.08 });
      l.on("scroll", ScrollTrigger.update);
      const tick = (t: number) => l.raf(t * 1000);
      gsap.ticker.add(tick);
      stop = () => {
        gsap.ticker.remove(tick);
        l.destroy();
      };
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [active]);

  return null;
}
