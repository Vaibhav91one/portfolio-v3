/** Shared by Preloader (flies the trail images into the pile) and Hero (renders the finished pile), so the hand-off is identical. */

export const CARD_CLASS = "w-[28vw] h-[min(35vw,74vh)]";
export const STACK_CARD = "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden";

/** Photos (preloader trail, pile, hero) ship as <name>.webp plus a 360px-wide <name>-360.webp for phones. Preloader and
 *  Hero use the same srcset/sizes, so the trail image and its pile card pick the same file and the hand-off stays identical. */
export const PHOTO_SIZES = "30vw";
// Real pixel widths of the full-size files. The w descriptor has to be the true width: the browser derives the image's
// natural size from it, and Hero's displacement crops with naturalWidth/Height (a wrong width = a zoomed-in corner).
const FULL_W: Record<string, number> = { "/preloader/2.webp": 825, "/preloader/3.webp": 1100, "/preloader/4.webp": 825, "/preloader/5.webp": 825, "/preloader/6.webp": 825, "/preloader/7.webp": 825 }; // the rest are 619
export const photoSrcSet = (src: string) => `${src.replace(/\.webp$/, "-360.webp")} 360w, ${src} ${FULL_W[src] ?? 619}w`;
/** Real pixel width of the file an <img> picked (its currentSrc). With a srcset, naturalWidth/Height are density-corrected
 *  CSS px, but canvas drawImage crops in file pixels: scale by this / naturalWidth before cropping. */
export const photoPixelWidth = (url: string) => {
  const path = new URL(url, location.href).pathname;
  return path.endsWith("-360.webp") ? 360 : (FULL_W[path] ?? 619);
};

/** Card size in px for a viewport, matching CARD_CLASS. */
export const cardSize = (w: number, h: number) => ({ w: w * 0.28, h: Math.min(w * 0.35, h * 0.74) });

export type Pose = { rot: number; x: number; y: number }; // rot in deg, x in vw, y in vh, from screen centre

/** Bottom to top: the last four trail images, oldest first. The hero photo sits on top of them. */
export const POSES: Pose[] = [
  { rot: -22, x: -4, y: -3 },
  { rot: 11, x: 4, y: 2 },
  { rot: -10, x: -2, y: -1 },
  { rot: -4, x: 3, y: 3 },
];
export const HERO_POSE: Pose = { rot: 4, x: 0, y: 0 };

export const poseTransform = (p: Pose) => `translate(${p.x}vw, ${p.y}vh) rotate(${p.rot}deg)`;

/** scroll progress (0..1) where the pile has become a row and the carousel starts moving */
export const CAROUSEL_AT = 0.4;

// scroll progress (0..1 over the pinned wrapper) where each nav target is on screen: the carousel, "What I do", the footer
const SECTION_AT: Record<string, number> = { projects: 0.265, about: 0.78, contact: 1 };
/** Nav click: glide to the section. The pinned scene has no real section elements, so it scrolls to a progress; the plain fallback page uses the ids. */
export const goTo = (id: string) => {
  const pinned = document.querySelector("[data-pinned]");
  const el = document.getElementById(id);
  if (!pinned && el) return el.scrollIntoView({ behavior: "smooth" });
  window.scrollTo({ top: (SECTION_AT[id] ?? 0) * (document.documentElement.scrollHeight - innerHeight), behavior: "smooth" });
};

/** Film-style speed ramp (slow, fast, slow). Same curve as gsap's "expo.inOut"; RAMP is the string form for tweens. */
export const RAMP = "expo.inOut";
export const ramp = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2);

/** Carousel position (0..n-1, fractional while moving) for scroll progress P: each hop ramps in the middle 70% of its
 *  segment and dwells on the project for the rest, so the row glides between projects and settles on each. */
export const carouselPos = (P: number, n: number) => {
  const raw = (n - 1) * Math.min(1, Math.max(0, (P - CAROUSEL_AT) / (1 - CAROUSEL_AT)));
  const i = Math.floor(raw);
  const g = Math.min(1, Math.max(0, (raw - i - 0.15) / 0.7));
  return i + ramp(g);
};

export type Slot = {
  rot: number; // deg, slight tilt like a stamp lying on the table
  x: number; // card box, px from the top-left of the screen
  y: number;
  w: number;
  h: number;
  win: { cx: number; cy: number; w: number; h: number }; // the picture window inside the card
};
/** The four stamp cards of the "Things I work on" section, shared by the DOM cards and the 3D panels that turn into them. */
export const stampSlots = (W: number, H: number): Slot[] => {
  const phone = W < 700;
  const w = phone ? W * 0.42 : Math.min(W * 0.2, H * 0.36); // short landscape screens: tiles shrink with the height
  const h = w * 1.3;
  const gap = phone ? W * 0.05 : W * 0.025;
  const cols = phone ? 2 : 4;
  const left = (W - (cols * w + (cols - 1) * gap)) / 2;
  const top = phone ? H * 0.42 : H * 0.64 - h / 2;
  return [-1.5, 1.2, -0.8, 1.6].map((rot, i) => {
    const x = left + (i % cols) * (w + gap);
    const y = top + Math.floor(i / cols) * (h + gap);
    const ww = w * 0.9;
    const wh = h * 0.58;
    return { rot, x, y, w, h, win: { cx: x + w / 2, cy: y + h * 0.04 + wh / 2, w: ww, h: wh } };
  });
};
