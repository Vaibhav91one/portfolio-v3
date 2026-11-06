export type Photo = {
  src: string;
  w: number; // pixel size of the file (the frame letterboxes it, nothing is cropped)
  h: number;
  title: string;
  place: string;
  date: string;
  note: string;
};

const p = (src: string, w: number, h: number, n: number): Photo => ({
  src,
  w,
  h,
  title: `Photo ${n}`, // ponytail: placeholder text for every photo, edit freely
  place: "Somewhere",
  date: "2026",
  note: "A short note about this photo goes here: where it was taken, what was going on, why it stayed with you.",
});

export const PHOTOS: Photo[] = [
  p("/hero.webp", 619, 1100, 1),
  p("/preloader/1.webp", 619, 1100, 2),
  p("/preloader/2.webp", 825, 1100, 3),
  p("/preloader/3.webp", 1100, 825, 4), // the one landscape photo
  p("/preloader/4.webp", 825, 1100, 5),
  p("/preloader/5.webp", 825, 1100, 6),
  p("/preloader/6.webp", 825, 1100, 7),
  p("/preloader/7.webp", 825, 1100, 8),
  p("/preloader/8.webp", 619, 1100, 9),
  p("/preloader/9.webp", 619, 1100, 10),
  p("/preloader/10.webp", 619, 1100, 11),
  p("/preloader/11.webp", 619, 1100, 12),
  p("/preloader/12.webp", 619, 1100, 13),
];
