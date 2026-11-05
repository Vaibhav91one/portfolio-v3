"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import AnimatedParagraph from "./AnimatedParagraph";
import Clock from "./Clock";
import Nav from "./Nav";
import { CARD_CLASS, HERO_POSE, POSES, STACK_CARD, poseTransform } from "./stack";

const BIO = "A Swiss-army-knife(-ish!) Design Engineer — crafting playful, minimal, and functional experiences where design meets code.";

/**
 * The finished layout. The photo pile is the exact end state of the Preloader's fly-in (same sizes, poses and images),
 * so the hand-off is invisible. `stack` = the four trail images the preloader chose, oldest first.
 */
export default function Hero({ play, stack }: { play: boolean; stack: string[] }) {
  const root = useRef<HTMLElement>(null);

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
      {/* giant name, behind the pile */}
      <div data-exit className="absolute inset-x-0 bottom-0 z-0 overflow-hidden px-[2.8vw] pb-[1.2vw]" style={vis}>
        <h1
          data-name
          className="text-[11.5vw] font-normal leading-[0.8] whitespace-nowrap"
        >
          Vaibhav Tomar
        </h1>
      </div>

      {/* photo pile */}
      <div data-pile className="absolute inset-0 z-10" style={vis}>
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

      {/* text layer */}
      <div className="absolute inset-0 z-20 px-[2.8vw] py-[3vh]" style={vis}>
        <div data-exit>
          <AnimatedParagraph
            text={BIO}
            play={play}
            className="max-w-[22vw] text-[max(15px,1.45vw)] font-normal leading-[1.25]"
          />
        </div>
        <div data-in className="absolute right-[2.8vw] top-[3vh]">
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
