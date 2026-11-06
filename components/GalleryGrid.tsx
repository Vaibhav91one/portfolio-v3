"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { PHOTOS } from "@/data/gallery";
import { PhotoFrame, TILT, frameWidth } from "./PhotoFrame";
import GalleryViewer, { type From } from "./GalleryViewer";

const LERP = 0.075; // fraction of the gap closed per 60fps frame, as in the reference gallery
const FLING_MS = 220; // how far a flick carries on, in ms of release velocity
const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Endless photo grid you drag around. A small pool of cells is wrapped around the viewport and re-used: each cell
 * shows photo (col + 3 * row) mod N for its world column/row, so the set repeats without end. Every cell is one photo
 * in an instant-camera frame. Only `transform` is written per frame; a cell's photo is swapped only when its world
 * index changes. Drag, flick, wheel and arrow keys all move one target; the view eases toward it (1:1 with reduced
 * motion). A click (not a drag) on a frame opens it in the viewer, with its text beside it.
 */
export default function GalleryGrid() {
  const root = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ cw: number; ch: number; cols: number; rows: number } | null>(null);
  const cells = useRef<{ box: HTMLDivElement; frame: HTMLDivElement; win: HTMLDivElement; img: HTMLImageElement }[]>([]);
  const locked = useRef(false); // the viewer is open: the grid stands still and ignores input
  const [open, setOpen] = useState<{ idx: number; n: number; from: From } | null>(null);

  // cell size from the viewport; the pool covers the screen plus a cell of margin
  useEffect(() => {
    const measure = () => {
      const { innerWidth: w, innerHeight: h } = window;
      const ch = Math.round(Math.max(300, Math.min(520, h * 0.5)));
      const cw = Math.round(ch * 0.8);
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

    // the frame is as tall as the cell allows, whatever the photo's shape; a wide photo is capped to the cell width
    const fill = (c: (typeof cells.current)[number], idx: number) => {
      const p = PHOTOS[idx];
      c.frame.style.width = `${Math.min(frameWidth(ch * 0.82, p.w / p.h), cw * 0.92)}px`;
      c.frame.style.transform = `rotate(${TILT[idx % TILT.length]}deg)`;
      c.win.style.aspectRatio = `${p.w} / ${p.h}`;
      c.img.src = p.src;
      c.img.alt = p.title;
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
          fill(c, idx);
        }
      });
    };

    const tick = (_t: number, dt: number) => {
      if (locked.current) return;
      const k = reduce ? 1 : 1 - (1 - LERP) ** (dt / 16.67);
      x += (tx - x) * k;
      y += (ty - y) * k;
      draw();
    };
    gsap.ticker.add(tick);

    // drag + flick
    let drag: { id: number; px: number; py: number; vx: number; vy: number; t: number } | null = null;
    let press: { cell: Element | null; x: number; y: number } | null = null; // where the press started, to tell a click from a drag
    const onDown = (e: PointerEvent) => {
      if (locked.current) return;
      el.setPointerCapture(e.pointerId);
      press = { cell: (e.target as Element).closest("[data-frame]"), x: e.clientX, y: e.clientY };
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
      const n = press?.cell && e.type === "pointerup" && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 6 ? cells.current.findIndex((c) => c.frame === press!.cell) : -1;
      press = null;
      if (n >= 0) {
        // a click: freeze the grid and open that photo from where its frame is now
        const f = cells.current[n].frame;
        const r = f.getBoundingClientRect();
        locked.current = true;
        drag = null;
        el.style.cursor = "grab";
        f.style.visibility = "hidden"; // the viewer draws its own copy until it has shrunk back
        setOpen({ idx: last[n], n, from: { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: f.offsetWidth, rot: TILT[last[n] % TILT.length] } });
        return;
      }
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
      if (locked.current) return;
      tx -= e.deltaX;
      ty -= e.deltaY;
    };
    const onKey = (e: KeyboardEvent) => {
      if (locked.current) return;
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
                cells.current[n] = { box, frame: box.querySelector("[data-frame]")!, win: box.querySelector("[data-win]")!, img: box.querySelector("img")! };
              }}
              aria-hidden
              className="absolute left-0 top-0 flex items-center justify-center will-change-transform"
              style={{ width: dims.cw, height: dims.ch }}
            >
              <PhotoFrame data-frame src={PHOTOS[0].src} aspect="3 / 4" />
            </div>
          ))}
      </div>
      {open && (
        <GalleryViewer
          photo={PHOTOS[open.idx]}
          from={open.from}
          onClosed={() => {
            cells.current[open.n].frame.style.visibility = "";
            locked.current = false;
            setOpen(null);
            root.current?.focus();
          }}
        />
      )}
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
