import type { Metadata } from "next";
import Link from "next/link";
import GalleryGrid from "@/components/GalleryGrid";

export const metadata: Metadata = {
  title: "Gallery — Vaibhav Tomar",
  description: "Photos by Vaibhav Tomar: an endless grid to drag around, each photo framed with a note beside it.",
  alternates: { canonical: "/gallery" },
};

export default function GalleryPage() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-[#f4f4f4] text-[#111]">
      <GalleryGrid />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-[14vh] bg-gradient-to-b from-[#f4f4f4] via-[#f4f4f4]/85 to-transparent" />
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between px-[2.8vw] py-[3vh] text-[max(14px,1.05vw)] uppercase leading-none">
        <Link href="/" className="pointer-events-auto outline-offset-4">
          Vaibhav Tomar
        </Link>
        <h1 className="font-normal">Gallery</h1>
        <span className="opacity-60 max-sm:hidden">Drag to explore, click a photo</span>
        <span className="hidden opacity-60 max-sm:inline">Drag</span>
      </header>
    </main>
  );
}
