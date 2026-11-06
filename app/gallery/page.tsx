import type { Metadata } from "next";
import Link from "next/link";
import GalleryGrid from "@/components/GalleryGrid";
import { RollButton } from "@/components/RollButton";

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
      <RollButton asChild className="absolute left-[2.8vw] top-[3vh] z-10">
        <Link href="/">Vaibhav Tomar</Link>
      </RollButton>
    </main>
  );
}
