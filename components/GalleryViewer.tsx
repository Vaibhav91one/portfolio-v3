"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { Photo } from "@/data/gallery";
import { PhotoFrame, frameHeight, frameWidth } from "./PhotoFrame";

/** Where the clicked frame is on screen: centre, card width and tilt. */
export type From = { cx: number; cy: number; w: number; rot: number };

/**
 * Popup for one photo: its frame grows from where it was clicked to the middle of the screen over a dimmed backdrop,
 * then the text appears beside it (below it on a phone). The popup's layout (flex) decides where the frame lands: an
 * empty slot is measured and the frame, drawn on top of it, is scaled/moved/untilted from the clicked spot to the slot.
 * Closing plays the same timeline backwards. Esc, the scrim and the "Back to exploring" button all close it. onClosed fires when it is gone.
 */
export default function GalleryViewer({ photo, from, onClosed }: { photo: Photo; from: From; onClosed: () => void }) {
  const scrim = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const closing = useRef(false);

  // the frame's size in the popup: tall on desktop, upper half of the screen on a phone
  const [size] = useState(() => {
    const phone = window.innerWidth < 700;
    const a = photo.w / photo.h;
    const H = phone ? Math.min(window.innerHeight * 0.5, 460) : Math.min(window.innerHeight * 0.78, 720);
    const w = Math.min(frameWidth(H, a), window.innerWidth * (phone ? 0.8 : 0.5));
    return { w, h: frameHeight(w, a) };
  });

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    tl.current?.timeScale(1.5).reverse();
  };

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const r = slot.current!.getBoundingClientRect();
    const f = frame.current!;
    gsap.set(f, { left: r.left, top: r.top, width: r.width, visibility: "visible" });
    const kids = Array.from(text.current!.children);
    const t = gsap.timeline({ onReverseComplete: onClosed });
    t.fromTo(scrim.current, { opacity: 0 }, { opacity: 1, duration: reduce ? 0.2 : 0.4, ease: "power2.out" }, 0);
    if (reduce) {
      t.fromTo(f, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0).fromTo(kids, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.1);
    } else {
      t.fromTo(
        f,
        { x: from.cx - (r.left + r.width / 2), y: from.cy - (r.top + r.height / 2), scale: from.w / r.width, rotation: from.rot },
        { x: 0, y: 0, scale: 1, rotation: 0, duration: 0.7, ease: "expo.out" },
        0
      ).fromTo(kids, { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out", stagger: 0.08 }, 0.35);
    }
    tl.current = t;
    closeBtn.current?.focus();
    return () => void t.kill();
    // runs once per popup; the photo and origin are fixed for its lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") e.preventDefault(); // the Close button is the only stop
    };
    window.addEventListener("keydown", key);
    window.addEventListener("resize", close); // the measured layout would be stale
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("resize", close);
    };
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-label={photo.title} className="fixed inset-0 z-50 text-[#111]">
      <div ref={scrim} onClick={close} className="absolute inset-0 bg-[#f4f4f4]/90 backdrop-blur-sm" />
      <button
        ref={closeBtn}
        onClick={close}
        className="absolute left-[2.8vw] top-[3vh] z-10 rounded-full bg-[#111] px-4 py-2.5 text-[max(14px,1.05vw)] uppercase leading-none text-[#f4f4f4] outline-offset-4 focus-visible:outline-2"
      >
        ← Back to exploring
      </button>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-[4vh] px-[2.8vw] sm:flex-row sm:gap-[5vw]">
        <div ref={slot} className="shrink-0" style={{ width: size.w, height: size.h }} />
        <div ref={text} className="pointer-events-auto max-h-[34vh] max-w-[30rem] overflow-y-auto sm:max-h-none">
          <h2 className="text-[max(20px,2.4vw)] font-normal uppercase leading-none">{photo.title}</h2>
          <p className="mt-3 text-[max(13px,1.05vw)] uppercase leading-none opacity-55">
            {photo.place} · {photo.date}
          </p>
          <p className="mt-5 text-[max(14px,1.15vw)] font-normal leading-[1.25]">{photo.note}</p>
        </div>
      </div>
      <PhotoFrame
        ref={frame}
        src={photo.src}
        alt={photo.title}
        aspect={`${photo.w} / ${photo.h}`}
        className="pointer-events-none fixed"
        style={{ visibility: "hidden" }}
      />
    </div>
  );
}
