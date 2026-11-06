"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { PHOTOS, type Photo } from "@/data/gallery";

const LERP = 0.075; // fraction of the gap closed per 60fps frame, as in the reference gallery
const FLING_MS = 220; // how far a flick carries on, in ms of release velocity
const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Endless photo grid you drag around. A small pool of cells is wrapped around the viewport and re-used: each cell
 * shows photo (col + 3 * row) mod N for its world column/row, so the set repeats without end. Every cell is a framed
 * photo (a mat and a thin border) with its text on the right. Only `transform` is written per frame; a cell's
 * photo and text are swapped only when its world index changes. Drag, flick, wheel and arrow keys all move one target;
 * the view eases toward it (1:1 with reduced motion).
 */
export default function GalleryGrid() {
  const root = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ cw: number; ch: number; cols: number; rows: number } | null>(null);
  const cells = useRef<{ box: HTMLDivElement; img: HTMLImageElement; title: HTMLElement; meta: HTMLElement; note: HTMLElement }[]>([]);

  // cell size from the viewport; the pool covers the screen plus a cell of margin
  useEffect(() => {
    const measure = () => {
      const { innerWidth: w, innerHeight: h } = window;
      const cw = w < 700 ? Math.round(w * 0.9) : Math.round(Math.max(420, Math.min(560, w * 0.34)));
      const ch = Math.round(cw * 0.75);
      setDims({ cw, ch, cols: Math.ceil(w / cw) + 2, rows: Math.ceil(h / ch) + 2 });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!dims) return;
    const el = root.current!;
    const { cw, ch, cols, rows } = dims;
    cells.current.length = cols * rows; // drop cells left over from a bigger pool
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    PHOTOS.forEach((p) => void (new Image().src = p.src)); // warm the cache so swapping a cell's photo is instant

    let tx = 0; // target offset of the world, px
    let ty = 0;
    let x = 0; // eased offset actually drawn
    let y = 0;
    const last = cells.current.map(() => -1); // photo index each cell shows now
    const lastPos = cells.current.map(() => "");

    const fill = (c: (typeof cells.current)[number], p: Photo) => {
      c.img.src = p.src;
      c.img.alt = p.title;
      c.title.textContent = p.title;
      c.meta.textContent = `${p.place} · ${p.date}`;
      c.note.textContent = p.note;
    };

    const draw = () => {
      cells.current.forEach((c, n) => {
        const i = n % cols;
        const j = Math.floor(n / cols);
        const ux = i * cw + x;
        const uy = j * ch + y;
        const kx = Math.floor(ux / (cols * cw));
        const ky = Math.floor(uy / (rows * ch));
        const px = ux - kx * cols * cw - cw;
        const py = uy - ky * rows * ch - ch;
        const pos = `translate3d(${Math.round(px)}px,${Math.round(py)}px,0)`;
        if (pos !== lastPos[n]) {
          c.box.style.transform = pos;
          lastPos[n] = pos;
        }
        const idx = mod(i - kx * cols + 3 * (j - ky * rows), PHOTOS.length);
        if (idx !== last[n]) {
          last[n] = idx;
          fill(c, PHOTOS[idx]);
        }
      });
    };

    const tick = (_t: number, dt: number) => {
      const k = reduce ? 1 : 1 - (1 - LERP) ** (dt / 16.67);
      x += (tx - x) * k;
      y += (ty - y) * k;
      draw();
    };
    gsap.ticker.add(tick);

    // drag + flick
    let drag: { id: number; px: number; py: number; vx: number; vy: number; t: number } | null = null;
    const onDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      drag = { id: e.pointerId, px: e.clientX, py: e.clientY, vx: 0, vy: 0, t: e.timeStamp };
      el.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.px;
      const dy = e.clientY - drag.py;
      const dt = Math.max(1, e.timeStamp - drag.t);
      drag.vx = 0.6 * drag.vx + 0.4 * (dx / dt); // px/ms, lightly smoothed
      drag.vy = 0.6 * drag.vy + 0.4 * (dy / dt);
      drag.px = e.clientX;
      drag.py = e.clientY;
      drag.t = e.timeStamp;
      tx += dx;
      ty += dy;
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!reduce && e.timeStamp - drag.t < 80) {
        tx += drag.vx * FLING_MS;
        ty += drag.vy * FLING_MS;
      }
      drag = null;
      el.style.cursor = "grab";
    };
    // wheel / trackpad: scrolling down moves the photos up
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      tx -= e.deltaX;
      ty -= e.deltaY;
    };
    const onKey = (e: KeyboardEvent) => {
      const step: Record<string, [number, number]> = { ArrowLeft: [cw, 0], ArrowRight: [-cw, 0], ArrowUp: [0, ch], ArrowDown: [0, -ch] };
      const s = step[e.key];
      if (!s) return;
      e.preventDefault();
      tx += s[0];
      ty += s[1];
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("keydown", onKey);
    draw();
    return () => {
      gsap.ticker.remove(tick);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("keydown", onKey);
    };
  }, [dims]);

  return (
    <>
      <div
        ref={root}
        role="region"
        aria-label="Photo gallery, drag or use the arrow keys to explore"
        tabIndex={0}
        className="absolute inset-0 cursor-grab touch-none select-none outline-offset-[-4px] focus-visible:outline-2"
      >
        {dims &&
          Array.from({ length: dims.cols * dims.rows }, (_, n) => (
            <div
              key={`${dims.cw}-${n}`}
              ref={(box) => {
                if (!box) return;
                cells.current[n] = { box, img: box.querySelector("img")!, title: box.querySelector("[data-t]")!, meta: box.querySelector("[data-m]")!, note: box.querySelector("[data-n]")! };
              }}
              aria-hidden
              className="absolute left-0 top-0 flex items-center gap-[clamp(14px,2vw,28px)] p-[clamp(14px,2vw,28px)] will-change-transform"
              style={{ width: dims.cw, height: dims.ch }}
            >
              {/* the frame: outer border, a paper mat, a soft shadow; the photo is letterboxed inside, never cropped */}
              <div className="aspect-[3/4] h-full shrink-0 border border-[#111]/80 bg-[#fbfbfb] p-[6%] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- cells swap their photo on the fly */}
                <img src={PHOTOS[0].src} alt="" draggable={false} decoding="async" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0 text-[max(12px,0.95vw)] leading-[1.3]">
                <p data-t className="uppercase" />
                <p data-m className="mt-1 opacity-55" />
                <p data-n className="mt-3 opacity-80" />
              </div>
            </div>
          ))}
      </div>
      {/* the screen-reader view: each photo once, not the endless repeats */}
      <ul className="sr-only">
        {PHOTOS.map((p) => (
          <li key={p.src}>
            {p.title}, {p.place}, {p.date}. {p.note}
          </li>
        ))}
      </ul>
    </>
  );
}
