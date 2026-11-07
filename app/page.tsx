"use client";

import { useCallback, useEffect, useState } from "react";
import Showcase from "@/components/Showcase";
import SmoothScroll from "@/components/SmoothScroll";
import Preloader from "@/components/Preloader";

const KEY = "pv3-intro-2"; // sessionStorage: the preloader plays once per browser session (renamed when the photos moved from .jpg to .webp, so old stored paths are ignored). The boot script in app/layout.tsx reads it too.
const DEFAULT_STACK = ["/preloader/9.webp", "/preloader/10.webp", "/preloader/11.webp", "/preloader/12.webp"];

export default function Home() {
  // The preloader is in the server HTML (its photos start loading before any JS) and the first client render matches it.
  // Played earlier this session: the boot script already hid it (html[data-seen]), and the effect hands over the stored pile.
  const [finished, setFinished] = useState<string[] | null>(null);

  useEffect(() => {
    if (!document.documentElement.dataset.seen) return;
    try {
      setFinished(JSON.parse(sessionStorage.getItem(KEY)!) as string[]);
    } catch {
      setFinished(DEFAULT_STACK);
    }
  }, []);

  // one batched update: the Preloader unmounts and Hero shows the same pile in the same frame
  const done = useCallback((srcs: string[]) => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(srcs));
    } catch {}
    setFinished(srcs);
  }, []);

  const play = !!finished;

  return (
    <>
      <SmoothScroll active={play} />
      {!play && <Preloader onDone={done} />}
      <main>
        <Showcase play={play} stack={finished ?? DEFAULT_STACK} />
      </main>
    </>
  );
}
