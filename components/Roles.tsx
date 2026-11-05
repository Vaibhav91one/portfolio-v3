"use client";

import { useSyncExternalStore, type RefObject } from "react";
import { stampSlots } from "./stack";
import { RollButton } from "./RollButton";

const ROLES = ["Design Engineer", "Software Developer", "Cybersecurity Researcher", "Freelancer"];
const ABOUT = "I design and build interfaces, write the software behind them, break things to make them safer, and take on freelance work when the project is right."; // ponytail: placeholder copy, edit freely

// viewport size as one string so useSyncExternalStore sees a stable value; null on the server (labels appear after hydration)
const subscribe = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const size = () => `${innerWidth}x${innerHeight}`;

/** One box per character so the scroll render can reveal the text char by char (`data-char`); `bg` paints each box (white behind the role labels). */
const Chars = ({ text, bg = "" }: { text: string; bg?: string }) =>
  text.split(" ").map((word, w) => (
    <span key={w} aria-hidden className="inline-block whitespace-nowrap">
      {[...word, " "].map((ch, i) => (
        <span key={i} data-char className={`inline-block opacity-0 ${bg}`}>
          {ch}
        </span>
      ))}
    </span>
  ));

/**
 * Third section text: "What I do" heading, a role label on each pixel-art tile (same rects the 3D panels land on), and
 * a short intro with the contact button on the right. `tags` moves with the tiles when they slide away; `bio` rises in
 * from below like the "Selected Work" tag; `box` is faded by the scroll render.
 */
export default function Roles({ box, bio, tags }: { box: RefObject<HTMLDivElement | null>; bio: RefObject<HTMLDivElement | null>; tags: RefObject<HTMLDivElement | null> }) {
  const vp = useSyncExternalStore(subscribe, size, () => null);
  const slots = vp ? stampSlots(...(vp.split("x").map(Number) as [number, number])) : [];
  return (
    <div ref={box} className="pointer-events-none absolute inset-0 z-[15] text-[#111]">
      <h2 aria-label="What I do" className="absolute left-[2.8vw] top-[11vh] text-[max(30px,4.6vw)] font-normal leading-[1.1]">
        <Chars text="What I do" />
      </h2>
      <div ref={tags} className="absolute inset-0">
        {slots.map((s, i) => (
          <p
            key={i}
            className="absolute flex items-center justify-center px-[4%] text-center text-[max(18px,2.4vw)] font-normal leading-[1.25]"
            style={{ left: s.win.cx - s.win.w / 2, top: s.win.cy - s.win.h / 2, width: s.win.w, height: s.win.h, transform: `rotate(${s.rot}deg)` }}
          >
            <span className="sr-only">{ROLES[i]}</span>
            <span aria-hidden>
              <Chars text={ROLES[i]} bg="bg-white" />
            </span>
          </p>
        ))}
      </div>
      <div ref={bio} className="pointer-events-auto absolute right-[2.8vw] top-[15vh] max-w-[22vw] opacity-0 max-lg:top-[11vh] max-lg:max-w-[340px] max-sm:left-[2.8vw] max-sm:top-[17vh] max-sm:max-w-none">
        <p className="text-[max(14px,1.15vw)] font-normal leading-[1.25]">{ABOUT}</p>
        <RollButton href="mailto:vaibhavtomar3003@gmail.com" className="mt-[3vh]">
          Contact me
        </RollButton>
      </div>
    </div>
  );
}
