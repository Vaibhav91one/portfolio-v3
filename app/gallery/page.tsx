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
      <h1 className="sr-only">Gallery</h1>
      <Link
        href="/"
        className="absolute left-[2.8vw] top-[3vh] z-10 rounded-full bg-[#f4f4f4]/90 px-4 py-2.5 text-[max(14px,1.05vw)] uppercase leading-none backdrop-blur-sm outline-offset-4"
      >
        Vaibhav Tomar
      </Link>
    </main>
  );
}
