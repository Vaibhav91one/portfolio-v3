"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const ITEMS = [
  { label: "Work", id: "projects" },
  { label: "About", id: "about" },
  { label: "Contact", id: "contact" },
];

/**
 * Nav with the original site's hover: the label rolls up and away in 3D while a copy rolls in from below.
 * Plays on hover/focus, reverses on leave/blur. Clicking scrolls to the section id.
 */
export default function Nav() {
  const links = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const cleanups: (() => void)[] = [];
    links.current.forEach((a) => {
      const base = a?.querySelector(".nav-text--base");
      const front = a?.querySelector(".nav-text--front");
      if (!a || !base || !front) return;

      gsap.set(front, { rotationX: -90, yPercent: -25, opacity: 0 });
      const tl = gsap
        .timeline({ paused: true, defaults: { duration: 0.45, ease: "expo.out" } })
        .to(base, { yPercent: -50, rotationX: 90 })
        .to(front, { yPercent: -100, rotationX: 0, opacity: 1 }, 0)
        .to(base, { opacity: 0, duration: 0.15 }, 0.2);

      const hoverOk = window.matchMedia("(hover: hover) and (pointer: fine)").matches; // touch fires false hovers on tap
      const play = () => void tl.play();
      const reverse = () => void tl.reverse();
      if (hoverOk) {
        a.addEventListener("mouseenter", play);
        a.addEventListener("mouseleave", reverse);
      }
      a.addEventListener("focus", play);
      a.addEventListener("blur", reverse);
      cleanups.push(() => {
        tl.kill();
        a.removeEventListener("mouseenter", play);
        a.removeEventListener("mouseleave", reverse);
        a.removeEventListener("focus", play);
        a.removeEventListener("blur", reverse);
      });
    });
    return () => cleanups.forEach((c) => c());
  }, []);

  return (
    <nav aria-label="Main">
      <ul className="flex items-center gap-[5vw]">
        {ITEMS.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
              }}
              ref={(el) => void (links.current[i] = el)}
              style={{ perspective: "380px" }}
              className="relative flex flex-col items-center text-[max(14px,1.05vw)] font-normal uppercase leading-none outline-offset-4 focus-visible:outline-2"
            >
              <span className="nav-text--base">{item.label}</span>
              <span className="nav-text--front absolute left-0 top-full opacity-0">{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
