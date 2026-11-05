"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Showcase from "@/components/Showcase";
import SmoothScroll from "@/components/SmoothScroll";
import Preloader from "@/components/Preloader";

const KEY = "pv3-intro-2"; // sessionStorage: the preloader plays once per browser session (renamed when the photos moved from .jpg to .webp, so old stored paths are ignored)
const DEFAULT_STACK = ["/preloader/9.webp", "/preloader/10.webp", "/preloader/11.webp", "/preloader/12.webp"];

type Boot = { first: boolean; stack: string[] };
let boot: Boot | undefined; // read once per page load so every render agrees
const readBoot = (): Boot => {
  if (boot) return boot;
  try {
    const s = sessionStorage.getItem(KEY);
    boot = s ? { first: false, stack: JSON.parse(s) as string[] } : { first: true, stack: DEFAULT_STACK };
  } catch {
    boot = { first: true, stack: DEFAULT_STACK }; // storage blocked: just play it
  }
  return boot;
};
const noop = () => () => {};

export default function Home() {
  // false on the server and during hydration, true after: nothing shows until we know whether to play the intro
  const ready = useSyncExternalStore(noop, () => true, () => false);
  const [finished, setFinished] = useState<string[] | null>(null);
  const b = ready ? readBoot() : { first: false, stack: DEFAULT_STACK };

  // one batched update: the Preloader unmounts and Hero shows the same pile in the same frame
  const done = useCallback((srcs: string[]) => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(srcs));
    } catch {}
    setFinished(srcs);
  }, []);

  const loading = ready && b.first && !finished;
  const play = ready && !loading;

  return (
    <>
      <SmoothScroll active={play} />
      {loading && <Preloader onDone={done} />}
      <main>
        <Showcase play={play} stack={finished ?? b.stack} />
      </main>
    </>
  );
}
