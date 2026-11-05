import type { RefObject } from "react";
import { projects } from "@/data/projects";

/** Top-left label for the carousel, in the bio's spot. Opacity/position are driven from the scroll render via `tag`. */
export default function SectionTag({ tag }: { tag: RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={tag}
      className="pointer-events-none absolute left-[2.8vw] top-[3vh] z-30 text-[color:var(--fg,#111)] opacity-0"
    >
      <p className="text-[max(15px,1.45vw)] font-normal leading-[1.25]">Selected Work</p>
      <p className="text-[max(12px,0.95vw)] font-normal leading-[1.25] opacity-50">
        {String(projects.length).padStart(2, "0")} projects
      </p>
    </div>
  );
}
