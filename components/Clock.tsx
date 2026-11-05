"use client";

import { useSyncExternalStore } from "react";

const fmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });

const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
};
const now = () => fmt.format(new Date()).toUpperCase(); // "03:40 PM"

/** Live IST clock. The server snapshot is empty, so there is no hydration mismatch; the time appears after mount. */
export default function Clock() {
  const t = useSyncExternalStore(subscribe, now, () => "");
  return <span className="tabular-nums">{t || "--:-- --"} IST</span>;
}
