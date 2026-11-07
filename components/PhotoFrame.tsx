import type { ComponentProps } from "react";

/** Slight hand-placed tilt per photo (deg), so the grid doesn't look machine-ruled. The popup untilts from the same angle. */
export const TILT = [
  -1.6, 1.2, -0.8, 2, -2.2, 0.9, -1.2, 1.7, -0.5, 2.1, -1.9, 0.6, -1,
];

// card = instant-photo frame; every size is a fraction of the card's width (cqw: the wrapper is an inline-size container,
// since % padding would follow the parent's width), so it scales anywhere (grid cell, popup)
const SIDE = 0.06; // white border on top and sides
const CHIN = 0.2; // the thicker white strip under the photo
/** Card width that gives a card height H around a photo of aspect a (w/h). */
export const frameWidth = (H: number, a: number) =>
  H / ((1 - 2 * SIDE) / a + SIDE + CHIN);
/** Card height for a given width and photo aspect (the inverse). */
export const frameHeight = (W: number, a: number) =>
  W * ((1 - 2 * SIDE) / a + SIDE + CHIN);

const CARD: React.CSSProperties = {
  padding: `${SIDE * 100}cqw ${SIDE * 100}cqw ${CHIN * 100}cqw`,
  borderRadius: "3% / 2.2%",
  background: "linear-gradient(145deg, #ffffff, #f4f2ec)", // paper sheen
  // raised, rounded moulding: a light edge top-left, a shade bottom-right, then a tight contact shadow and a soft ambient one
  boxShadow:
    "inset 0 0 0 1px rgba(0,0,0,.06), inset 2px 2px 3px rgba(255,255,255,.95), inset -2px -2px 4px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.25), 0 18px 28px -14px rgba(0,0,0,.35)",
};

/** A white instant-photo frame around one photo. `aspect` is the photo's "w / h". Extra props (width, transform, data-*) go to the wrapper. */
export function PhotoFrame({
  src,
  alt = "",
  aspect,
  style,
  ...rest
}: { src: string; alt?: string; aspect: string } & ComponentProps<"div">) {
  return (
    <div {...rest} style={{ containerType: "inline-size", ...style }}>
      <div style={CARD}>
        <div
          data-win
          className="relative overflow-hidden"
          style={{ aspectRatio: aspect, borderRadius: "1.6% / 1.2%" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- grid cells swap their photo on the fly */}
          <img
            src={src}
            alt={alt}
            draggable={false}
            decoding="async"
            className="h-full w-full object-cover"
          />
          {/* recessed window + a curved gloss across the glass */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              boxShadow:
                "inset 0 0 0 1px rgba(0,0,0,.12), inset 0 2px 6px rgba(0,0,0,.25)",
              background:
                "linear-gradient(115deg, rgba(255,255,255,.28), rgba(255,255,255,0) 38%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
