const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; // 4x4 ordered dither
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** `src` redrawn as chunky 3-tone pixel art in one tint (Bayer-dithered luminance). Resolves with a w x h canvas. */
export const ditherArt = (src: string, tint: string, w: number, h: number) =>
  new Promise<HTMLCanvasElement>((resolve) => {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      const k = Math.max(w / img.naturalWidth, h / img.naturalHeight); // cover
      ctx.drawImage(img, (w - img.naturalWidth * k) / 2, (h - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
      const d = ctx.getImageData(0, 0, w, h);
      const t = rgb(tint);
      const tones = [t, mix(t, [255, 255, 255], 0.55), mix(t, [247, 247, 249], 0.88)];
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const lum = (0.3 * d.data[i] + 0.59 * d.data[i + 1] + 0.11 * d.data[i + 2]) / 255;
          const v = lum + ((BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16 - 0.5) * 0.45;
          const c = tones[v < 0.38 ? 0 : v < 0.68 ? 1 : 2];
          d.data[i] = c[0];
          d.data[i + 1] = c[1];
          d.data[i + 2] = c[2];
          d.data[i + 3] = 255;
        }
      ctx.putImageData(d, 0, 0);
      resolve(cv);
    };
    img.onerror = () => {
      ctx.fillStyle = tint; // a missing photo is a flat tint block
      ctx.fillRect(0, 0, w, h);
      resolve(cv);
    };
    img.src = src;
  });
