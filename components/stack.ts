/** Shared by Preloader (flies the trail images into the pile) and Hero (renders the finished pile), so the hand-off is identical. */

export const CARD_CLASS = "w-[28vw] h-[min(35vw,74vh)]";
export const STACK_CARD = "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden";

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
