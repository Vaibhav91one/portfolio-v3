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
  const lines = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const el = p.current;
    if (!el) return;
    const split = new SplitType(el, { types: "lines,chars" });
    lines.current = split.lines ?? [];
    gsap.set(lines.current, { opacity: 0 });
    gsap.set(el, { opacity: 1 }); // the paragraph was hidden until split, so there is no flash of unsplit text

    const flip = (e: Event) =>
      void gsap.fromTo(e.currentTarget, { opacity: 0, y: -5, rotationX: 180 }, { opacity: 1, y: 0, rotationX: 0, duration: 0.5, ease: "expo.out", overwrite: "auto" });
    const chars = (split.chars ?? []) as HTMLElement[];
    // pointer-only, and none at all for reduced motion
    const hoverOk = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches;
    chars.forEach((c) => {
      c.style.display = "inline-block"; // keeps layout still while a character flips
      if (hoverOk) c.addEventListener("mouseenter", flip);
    });

    return () => {
      chars.forEach((c) => c.removeEventListener("mouseenter", flip));
      split.revert();
    };
  }, []);

  useEffect(() => {
    if (!play) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(lines.current, { opacity: 1 });
      return;
    }
    const tween = gsap.to(lines.current, { opacity: 1, stagger: 0.15, duration: 0.9, ease: "expo.out" });
    return () => void tween.kill();
  }, [play]);

  return (
    <p ref={p} className={`opacity-0 ${className}`}>
      {text}
    </p>
  );
}
