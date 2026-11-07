import type { Metadata } from "next";
import Link from "next/link";
import GalleryGrid from "@/components/GalleryGrid";
import { RollButton } from "@/components/RollButton";

const title = "Gallery — Vaibhav Tomar";
const description = "Photos by Vaibhav Tomar: an endless grid to drag around, each photo framed with a note beside it.";

// openGraph/twitter set here too, else the share card keeps the home page's title and url (the images come from app/opengraph-image.jpg)
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/gallery" },
  openGraph: { type: "website", url: "/gallery", siteName: "Vaibhav Tomar", title, description },
  twitter: { card: "summary_large_image", title, description, creator: "@VrsatileVaibhav" },
};

export default function GalleryPage() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-[#f4f4f4] text-[#111]">
      <GalleryGrid />
      <h1 className="sr-only">Gallery</h1>
      <RollButton asChild icon={<span aria-hidden>←</span>} className="absolute left-[2.8vw] top-[3vh] z-10">
        <Link href="/">Back to exploring</Link>
      </RollButton>
    </main>
  );
}
