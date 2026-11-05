"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const SPEED = 80; // px per second, as on the original site

/**
 * The giant name as a marquee (from the original site): one track of 3 copies, moved in px/s on GSAP's ticker and
 * wrapped by exactly one copy width. Scrolling down runs it one way, scrolling up reverses it. Stops while faded out.
 */
export default function NameMarquee() {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current!;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const fade = el.closest<HTMLElement>("[data-exit]");
    const setX = gsap.quickSetter(el, "x", "px");
    let copyWidth = (el.children[0] as HTMLElement).offsetWidth;
    let x = 0;
    let dir = -1;
    let lastY = window.scrollY;

    const tick = (_t: number, dt: number) => {
      if (fade && +fade.style.opacity < 0.01 && fade.style.opacity !== "") return; // scrolled away: nothing to move
      const y = window.scrollY;
      if (y !== lastY) {
        dir = y > lastY ? -1 : 1; // down = left, up = right
        lastY = y;
      }
      x += (dir * SPEED * dt) / 1000;
      if (x <= -copyWidth) x += copyWidth;
      else if (x > 0) x -= copyWidth;
      setX(x);
    };
    const onResize = () => (copyWidth = (el.children[0] as HTMLElement).offsetWidth);
    gsap.ticker.add(tick);
    window.addEventListener("resize", onResize);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", onResize);
      gsap.set(el, { x: 0 });
    };
  }, []);

  return (
    <div ref={track} data-name className="flex w-max text-[11.5vw] font-normal leading-[0.8] whitespace-nowrap">
      {[0, 1, 2].map((i) => (
        <span key={i} className="pr-[0.3em]" aria-hidden={i ? true : undefined}>
          Vaibhav Tomar —
        </span>
      ))}
    </div>
  );
}
