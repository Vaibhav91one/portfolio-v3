"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { projects } from "@/data/projects";

const COLS = 28;
const ROWS = 3;
const CELL = 8; // px per block; each block is a 2x2 of 4px sub-pixels so it can dither
const BAND = 4; // blocks between "solid" and "empty": the dithered, flickering front edge
const ROW_SKEW = [-0.7, 0.6, -0.2]; // each row's front is a little ahead/behind, so the edge is ragged, like the sky on andreas.vision
const BAYER = [0.125, 0.625, 0.875, 0.375]; // 2x2 ordered-dither thresholds
const hash = (a: number, b: number) => {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Rolling project title + a pixel progress bar (no lines): a small grid of square blocks that fills left to right with
 * scroll. Behind the front the blocks are solid; at the front they dither (2x2 checker steps) and each one scales up
 * and down on its own rhythm, so pixels keep coming and going; ahead of it only faint dots are left.
 * `progress` (0..1) is written by the scroll render, `idx` comes from state. `ui` is the faded wrapper.
 * `instant`: jump to the first title position without rolling (a reload deep in the carousel must not scroll through).
 */
export default function ProjectsUI({
  idx,
  progress,
  ui,
  instant,
}: {
  idx: number;
  progress: RefObject<number>;
  ui: RefObject<HTMLDivElement | null>;
  instant: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = COLS * CELL * dpr;
    cv.height = ROWS * CELL * dpr;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sub = CELL / 2;
    let last = "";

    const draw = (time: number) => {
      const p = progress.current ?? 0;
      const key = still ? String(p) : "";
      if (still && key === last) return; // reduced motion: only redraw when the progress moved
      last = key;
      if (ui.current && +ui.current.style.opacity < 0.01) return; // nothing to draw while it is faded out

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL);
      const front = p * (COLS + BAND);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const d = front - (c + 0.5 + ROW_SKEW[r]);
          const k = c / (COLS - 1); // yellow -> orange along the bar
          ctx.fillStyle = `rgb(${Math.round(255 - 11 * k)},${Math.round(203 - 93 * k)},${Math.round(98 - 66 * k)})`;
          const t = d >= BAND ? 1 : d <= 0 ? 0 : d / BAND; // 0 empty .. 1 solid
          // blocks on the front scale up and down, each on its own rhythm; solid and empty ones hold still
          const live = t > 0 && t < 1 && !still;
          const phase = hash(c, r) * Math.PI * 2;
          const rate = 3 + hash(r, c) * 5;
          const s = live ? 0.35 + 0.85 * (0.5 + 0.5 * Math.sin(time * rate + phase)) : 1;
          const size = CELL * s;
          const x0 = c * CELL + (CELL - size) / 2;
          const y0 = r * CELL + (CELL - size) / 2;
          if (t >= 1) {
            ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
          } else {
            // ordered dither inside the block: more of the 2x2 lights up as t rises (empty = one faint dot)
            const tone = t === 0 ? 0.01 : t;
            for (let i = 0; i < 4; i++) {
              if (tone <= BAYER[i]) continue;
              const sx = (i % 2) * sub;
              const sy = Math.floor(i / 2) * sub;
              ctx.fillRect(x0 + (sx / CELL) * size, y0 + (sy / CELL) * size, (sub / CELL) * size, (sub / CELL) * size);
            }
            if (t === 0) {
              ctx.fillStyle = "#fff";
              ctx.globalAlpha = 0.22; // faint dot where the bar has not reached yet
              ctx.fillRect(c * CELL + sub / 2, r * CELL + sub / 2, sub, sub);
              ctx.globalAlpha = 1;
            }
          }
        }
      }
    };
    const tick = (t: number) => draw(t);
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [progress, ui]);

  return (
    <div ref={ui} className="pointer-events-none absolute inset-x-0 bottom-[6vh] z-30 flex flex-col items-center text-white opacity-0">
      <canvas ref={canvas} aria-hidden style={{ width: COLS * CELL, height: ROWS * CELL }} />
      <div className="mt-3 h-6 w-[min(80vw,28rem)] overflow-hidden text-center text-[max(14px,1.1vw)]" aria-live="polite">
        <div className={`transition-transform ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:duration-0 ${instant ? "duration-0" : "duration-[450ms]"}`} style={{ transform: `translateY(${-idx * 1.5}rem)` }}>
          {projects.map((p) => (
            <p key={p.slug} title={p.title} className="h-6 truncate leading-6">
              {p.title}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
