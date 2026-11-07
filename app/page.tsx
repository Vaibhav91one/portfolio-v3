"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Showcase from "@/components/Showcase";
import SmoothScroll from "@/components/SmoothScroll";
import Preloader from "@/components/Preloader";

const KEY = "pv3-intro-2"; // sessionStorage: the preloader plays once per browser session (renamed when the photos moved from .jpg to .webp, so old stored paths are ignored). The boot script in app/layout.tsx reads it too.
const DEFAULT_STACK = ["/preloader/9.webp", "/preloader/10.webp", "/preloader/11.webp", "/preloader/12.webp"];

let stored: string[] | null | undefined; // read once per page load so every render agrees
const readStored = () => {
  if (stored !== undefined) return stored;
  if (!document.documentElement.dataset.seen) return (stored = null); // set by the boot script before first paint
  try {
    return (stored = JSON.parse(sessionStorage.getItem(KEY)!) as string[]);
  } catch {
    return (stored = DEFAULT_STACK);
  }
};
const noop = () => () => {};

export default function Home() {
  // The preloader is in the server HTML (its photos start loading before any JS). First visit: the client snapshot is null
  // like the server's, so hydration renders once. Played earlier this session: the boot script already hid it
  // (html[data-seen]) and the stored pile takes over.
  const seen = useSyncExternalStore(noop, readStored, () => null);
  const [finished, setFinished] = useState<string[] | null>(null);

  // one batched update: the Preloader unmounts and Hero shows the same pile in the same frame
  const done = useCallback((srcs: string[]) => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(srcs));
    } catch {}
    setFinished(srcs);
  }, []);

  const pile = finished ?? seen;
  const play = !!pile;

  return (
    <>
      <SmoothScroll active={play} />
      {!play && <Preloader onDone={done} />}
      <main>
        <Showcase play={play} stack={pile ?? DEFAULT_STACK} />
      </main>
    </>
  );
}
