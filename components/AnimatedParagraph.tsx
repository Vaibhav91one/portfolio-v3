"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import SplitType from "split-type";

/**
 * The original site's paragraph: split into lines and characters, lines fade in one after another when `play`
 * turns true, and each character flips over when the pointer passes it.
 */
export default function AnimatedParagraph({ text, play, className = "" }: { text: string; play: boolean; className?: string }) {
  const p = useRef<HTMLParagraphElement>(null);

  // Split only once `play` turns true: the paragraph is invisible until then (opacity-0), and splitting on mount put a
  // forced layout plus a span per character into the page's hydration task.
  useEffect(() => {
    const el = p.current;
    if (!el || !play) return;
    const split = new SplitType(el, { types: "lines,chars" });
    const lines = split.lines ?? [];
    gsap.set(lines, { opacity: 0 });
    gsap.set(el, { opacity: 1 }); // the paragraph was hidden until split, so there is no flash of unsplit text

    const flip = (e: Event) =>
      void gsap.fromTo(e.currentTarget, { opacity: 0, y: -5, rotationX: 180 }, { opacity: 1, y: 0, rotationX: 0, duration: 0.5, ease: "expo.out", overwrite: "auto" });
    const chars = (split.chars ?? []) as HTMLElement[];
    // pointer-only, and none at all for reduced motion
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hoverOk = !still && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    chars.forEach((c) => {
      c.style.display = "inline-block"; // keeps layout still while a character flips
      if (hoverOk) c.addEventListener("mouseenter", flip);
    });
    const tween = still ? gsap.set(lines, { opacity: 1 }) : gsap.to(lines, { opacity: 1, stagger: 0.15, duration: 0.9, ease: "expo.out" });

    return () => {
      tween.kill();
      chars.forEach((c) => c.removeEventListener("mouseenter", flip));
      split.revert();
    };
  }, [play]);

  return (
    <p ref={p} className={`opacity-0 ${className}`}>
      {text}
    </p>
  );
}
