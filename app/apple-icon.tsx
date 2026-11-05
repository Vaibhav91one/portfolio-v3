import { ImageResponse } from "next/og";

// iOS home-screen icon: the same ✺ starburst as the tab icon (app/icon.svg), black on white
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#fff" }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <path
            d="M104.00 90.00L152.00 90.00M102.93 95.36L147.28 113.73M99.90 99.90L133.84 133.84M95.36 102.93L113.73 147.28M90.00 104.00L90.00 152.00M84.64 102.93L66.27 147.28M80.10 99.90L46.16 133.84M77.07 95.36L32.72 113.73M76.00 90.00L28.00 90.00M77.07 84.64L32.72 66.27M80.10 80.10L46.16 46.16M84.64 77.07L66.27 32.72M90.00 76.00L90.00 28.00M95.36 77.07L113.73 32.72M99.90 80.10L133.84 46.16M102.93 84.64L147.28 66.27"
            fill="none"
            stroke="#000"
            strokeWidth={9}
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
