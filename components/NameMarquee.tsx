"use client";

import { useEffect, useRef } from "react";

const SPEED = 80; // px per second, as on the original site
const LOOPS = 1000; // head room for reverse playback

/**
 * The giant name as a marquee (from the original site): one track of 3 copies slid by exactly one copy width, forever.
 * It runs as a Web Animation, so the compositor moves it and busy main-thread work at page load can't make it stutter.
 * Scrolling down runs it one way, scrolling up reverses it. Paused while faded out. `data-name` is the wrapper the Hero's
 * intro reveals, so that tween and the loop never share a transform.
 */
export default function NameMarquee() {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current!;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const fade = el.closest<HTMLElement>("[data-exit]");
    let lastY = window.scrollY;
    let anim: Animation | undefined;

    const faded = () => !!fade && fade.style.opacity !== "" && +fade.style.opacity < 0.01;
    const start = () => {
      const copyWidth = (el.children[0] as HTMLElement).offsetWidth;
      const keep = anim ? ((+(anim.currentTime ?? 0) / +(anim.effect!.getTiming().duration as number)) % 1) : 0; // position within one copy
      const rate = anim?.playbackRate ?? 1;
      anim?.cancel();
      const duration = (copyWidth / SPEED) * 1000;
      anim = el.animate([{ transform: "translateX(0)" }, { transform: `translateX(${-copyWidth}px)` }], { duration, iterations: Infinity, easing: "linear" });
      anim.currentTime = (LOOPS + keep) * duration; // start deep inside the loop so it can also play backwards
      anim.playbackRate = rate;
      if (faded()) anim.pause();
    };
    // playbackRate 1 = name slides left (page scrolled down); -1 plays the same loop backwards
    const onScroll = () => {
      const y = window.scrollY;
      if (y !== lastY && anim) {
        const next = y > lastY ? 1 : -1;
        if (anim.playbackRate !== next) anim.updatePlaybackRate(next);
        lastY = y;
      }
      if (anim) {
        if (faded() && anim.playState === "running") anim.pause();
        else if (!faded() && anim.playState === "paused") anim.play();
      }
    };
    start(); // starts moving left, as before
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", start);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", start);
      anim?.cancel();
    };
  }, []);

  return (
    <div data-name>
      <div ref={track} className="flex w-max text-[11.5vw] font-normal leading-[0.8] whitespace-nowrap">
        {[0, 1, 2].map((i) => (
          <span key={i} className="pr-[0.3em]" aria-hidden={i ? true : undefined}>
            Vaibhav Tomar —
          </span>
        ))}
      </div>
    </div>
  );
}
