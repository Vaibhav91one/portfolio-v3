"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import AnimatedParagraph from "./AnimatedParagraph";
import Clock from "./Clock";
import NameMarquee from "./NameMarquee";
import Nav from "./Nav";
import PixelSky from "./PixelSky";
import type { Paint } from "./Displacement";
import { CARD_CLASS, HERO_POSE, POSES, STACK_CARD, poseTransform } from "./stack";

// WebGL, pointer-only: its code loads on the first mouse move over the hero, so none of it runs during page load
const Displacement = dynamic(() => import("./Displacement"), { ssr: false });

const BIO = "A Swiss-army-knife(-ish!) Design Engineer — crafting playful, minimal, and functional experiences where design meets code.";

/**
 * The finished layout. The photo pile is the exact end state of the Preloader's fly-in (same sizes, poses and images),
 * so the hand-off is invisible. `stack` = the four trail images the preloader chose, oldest first.
 */
export default function Hero({ play, stack }: { play: boolean; stack: string[] }) {
  const root = useRef<HTMLElement>(null);
  const cards = useRef<HTMLDivElement>(null);
  const [fx, setFx] = useState(false); // displacement started (first pointer move)
  const [fxReady, setFxReady] = useState(false); // its first frame is up: hide the DOM cards

  useEffect(() => {
    const el = root.current!;
    if (!play || !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const start = () => setFx(true);
    el.addEventListener("pointermove", start, { once: true, passive: true });
    return () => el.removeEventListener("pointermove", start);
  }, [play]);

  // Redraw the pile where the DOM lays it out (centre, rotation, size, cover-fit crop) into the displacement canvas
  const paintPile: Paint = (ctx) => {
    const wrap = cards.current;
    if (!wrap) return;
    const box = wrap.getBoundingClientRect();
    for (const card of Array.from(wrap.children) as HTMLElement[]) {
      const img = card.querySelector("img");
      if (!img || !img.naturalWidth) continue;
      const r = card.getBoundingClientRect();
      const w = card.offsetWidth;
      const h = card.offsetHeight;
      const m = new DOMMatrix(getComputedStyle(card).transform);
      const ia = img.naturalWidth / img.naturalHeight;
      const ca = w / h;
      const sw = ia > ca ? img.naturalHeight * ca : img.naturalWidth;
      const sh = ia > ca ? img.naturalHeight : img.naturalWidth / ca;
      ctx.save();
      ctx.translate(r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top);
      ctx.rotate(Math.atan2(m.b, m.a));
      ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  };

  useEffect(() => {
    // no intro when reloaded part-way down: the scroll-driven scene owns those elements
    if (!play || window.scrollY > 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = root.current!;
    const tl = gsap.timeline({ delay: 0.15 });
    tl.fromTo(el.querySelector("[data-name]"), { yPercent: 110 }, { yPercent: 0, duration: 1.2, ease: "expo.out" })
      .fromTo(el.querySelectorAll("[data-in]"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "expo.out" }, 0.2);
    return () => void tl.kill();
  }, [play]);

  const vis = { visibility: play ? "visible" : "hidden" } as const; // nothing shows under the trail

  return (
    <section ref={root} className="relative h-screen w-full overflow-hidden text-[color:var(--fg,#111)]">
      <PixelSky play={play} />

      {/* giant name marquee, vertically centred behind the pile (box = one text line, 11.5vw * 0.8) */}
      <div data-exit className="absolute inset-x-0 top-[calc(50%-4.6vw)] z-0 overflow-hidden px-[2.8vw]" style={vis}>
        <h1 className="sr-only">Vaibhav Tomar</h1>
        <NameMarquee />
      </div>

      {/* photo pile */}
      <div data-pile className="absolute inset-0 z-10" style={vis}>
        <div ref={cards} className={`absolute inset-0 ${fxReady ? "invisible" : ""}`}>
          {stack.map((src, i) => (
            <div key={src} className={`${STACK_CARD} ${CARD_CLASS}`} style={{ transform: poseTransform(POSES[i]), zIndex: i + 1 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- must be pixel-identical to the Preloader's cards */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
          <div className={`${STACK_CARD} ${CARD_CLASS}`} style={{ transform: poseTransform(HERO_POSE), zIndex: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- must be pixel-identical to the Preloader's hero card */}
            <img src="/hero.jpg" alt="Vaibhav Tomar" className="h-full w-full object-cover" />
          </div>
        </div>
        {fx && <Displacement host={root} paint={paintPile} onReady={() => setFxReady(true)} grid={40} threshold={300} strength={0.15} scramble={0} />}
      </div>

      {/* text layer */}
      <div className="pointer-events-none absolute inset-0 z-20 px-[2.8vw] py-[3vh]" style={vis}>
        <div data-exit className="pointer-events-auto w-fit max-sm:mx-auto max-sm:mt-[9vh]">
          <AnimatedParagraph
            text={BIO}
            play={play}
            className="max-w-[22vw] text-[max(15px,1.45vw)] font-normal leading-[1.25] max-sm:max-w-[72vw] max-sm:text-center"
          />
        </div>
        <div data-in data-nav className="pointer-events-auto absolute right-[2.8vw] top-[3vh]">
          <Nav />
        </div>
        <p data-in data-exit className="absolute right-[2.8vw] top-[66vh] text-[max(20px,2.4vw)] font-normal leading-none">
          © 2026
        </p>
        <p data-in data-exit className="absolute bottom-[3vh] right-[2.8vw] text-[max(13px,1.05vw)] font-normal uppercase leading-none">
          <span className="mr-2 text-black/45">India</span>
          <Clock />
        </p>
      </div>
    </section>
  );
}
