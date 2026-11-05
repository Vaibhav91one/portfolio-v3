"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const TONES = ["rgba(255,203,98,.26)", "rgba(255,150,50,.40)"]; // warm, translucent: they tint the glow behind; level 0 is clear
const FPS = 20; // the drift is slow; no need to redraw at display rate
const hash = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** value noise, 0..1 */
const noise = (x: number, y: number, z: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const u = smooth(x - xi);
  const v = smooth(y - yi);
  const w = smooth(z - zi);
  const l = (dz: number) =>
    lerp(lerp(hash(xi, yi, zi + dz), hash(xi + 1, yi, zi + dz), u), lerp(hash(xi, yi + 1, zi + dz), hash(xi + 1, yi + 1, zi + dz), u), v);
  return lerp(l(0), l(1), w);
};
const fbm = (x: number, y: number, z: number) => noise(x, y, z) * 0.6 + noise(x * 2.1, y * 2.1, z * 1.5) * 0.28 + noise(x * 4.3, y * 4.3, z * 2) * 0.12;
const edge = (a: number, b: number, v: number) => smooth(Math.min(1, Math.max(0, (v - a) / (b - a))));

/**
 * Pixel-art "sky" behind the hero (after andreas.vision): chunky blocks in a few soft grey tones, with fine 2-tone
 * checker dither where two tones meet, drifting slowly. The field is weighted toward the edges so the middle, where
 * the photo pile and text sit, stays clear paper. `wrap` is faded by the scroll render (data-fade); the canvas fades
 * in on its own once `play` is true.
 */
export default function PixelSky({ play }: { play: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = cv.current!;
    const ctx = canvas.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0;
    let H = 0;
    let CELL = 24;

    // 8x8 checker tiles (4px squares) for each pair of neighbouring tones; cell size is a multiple of 8 so they line up
    const pair = (a: string, b: string) => {
      const t = document.createElement("canvas");
      t.width = t.height = 8;
      const c = t.getContext("2d")!;
      c.fillStyle = a;
      c.fillRect(0, 0, 8, 8);
      c.fillStyle = b;
      c.fillRect(0, 0, 4, 4);
      c.fillRect(4, 4, 4, 4);
      return ctx.createPattern(t, "repeat")!;
    };
    const paper = "rgba(0,0,0,0)";
    const checks = [pair(paper, TONES[0]), pair(TONES[0], TONES[1])];

    const size = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      CELL = W < 700 ? 16 : 32;
    };

    const draw = (time: number) => {
      const cols = Math.ceil(W / CELL);
      const rows = Math.ceil(H / CELL);
      ctx.clearRect(0, 0, W, H);
      const z = time * 0.05;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // clear in the middle, building toward the edges and the bottom
          const dx = ((c + 0.5) / cols - 0.5) / 0.5;
          const dy = ((r + 0.5) / rows - 0.52) / 0.5;
          const weight = edge(0.75, 1.25, Math.hypot(dx, dy * 1.1));
          // clouds drift sideways and slowly morph
          const n = fbm(c * 0.075 + time * 0.12, r * 0.075, z);
          const level = edge(0.45, 0.72, n) * weight * 2; // 0..2
          const base = Math.floor(level);
          const frac = level - base;
          const x = c * CELL;
          const y = r * CELL;
          if (frac > 0.38 && frac < 0.62 && base < 2) {
            ctx.fillStyle = checks[base]; // dither band between two tones
          } else {
            const tone = base + (frac >= 0.62 ? 1 : 0);
            if (tone === 0) continue;
            ctx.fillStyle = TONES[Math.min(tone, 2) - 1];
          }
          ctx.fillRect(x, y, CELL, CELL);
        }
      }
    };

    size();
    draw(40);
    let last = 0;
    const tick = (t: number) => {
      if (still || t - last < 1 / FPS) return;
      last = t;
      if (+(wrap.current?.style.opacity ?? 1) < 0.01 || document.hidden) return; // scrolled away: stop drawing
      draw(t);
    };
    gsap.ticker.add(tick);
    const onResize = () => {
      size();
      draw(performance.now() / 1000);
    };
    window.addEventListener("resize", onResize);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div ref={wrap} data-fade aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {/* soft orange-yellow glow, bottom-weighted; the pixel clouds below tint over it */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60vw 50vh at 88% 105%, rgba(255,150,40,.38), transparent 70%), radial-gradient(55vw 45vh at 8% 100%, rgba(255,205,80,.38), transparent 70%)",
        }}
      />
      <canvas
        ref={cv}
        className={`h-full w-full transition-opacity duration-[1600ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${play ? "opacity-100" : "opacity-0"}`}
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
