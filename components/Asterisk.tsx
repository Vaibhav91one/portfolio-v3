import type { RefObject } from "react";

const SIZE = "min(32vw, 60vh)"; // reach = half of this above the corner: stays clear of the name line on any screen shape

/**
 * The Mapinly asterisk as polished green metal, centred on the bottom-left corner so a quarter shows. The star shape
 * is a mask that turns with scroll (`spin`, set from the scroll render: down = clockwise, up = anticlockwise); the chrome
 * bands behind it stay put, so reflections slide across the arms as it rotates. `box` is the corner wrapper (scaled by the scroll render, origin = the corner); the inner element fades in with `play`.
 */
export default function Asterisk({ play, box, spin }: { play: boolean; box: RefObject<HTMLDivElement | null>; spin: RefObject<SVGGElement | null> }) {
  return (
    <div ref={box} aria-hidden className="pointer-events-none absolute bottom-0 left-0 z-0 size-0">
      <div className={`transition-opacity duration-[1600ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${play ? "opacity-100" : "opacity-0"}`}>
        <svg
          viewBox="0 0 14 14"
          className="absolute"
          style={{ width: SIZE, height: SIZE, left: `calc(${SIZE} / -2)`, top: `calc(${SIZE} / -2)` }}
        >
          <defs>
            <linearGradient id="ast-metal" gradientUnits="userSpaceOnUse" x1="1" y1="1" x2="13" y2="13">
              <stop offset="0" stopColor="#f6faf1" />
              <stop offset=".14" stopColor="#a9bf98" />
              <stop offset=".28" stopColor="#3f6338" />
              <stop offset=".4" stopColor="#dfe9d6" />
              <stop offset=".5" stopColor="#8aa879" />
              <stop offset=".62" stopColor="#2f4d2b" />
              <stop offset=".76" stopColor="#c9dbbd" />
              <stop offset=".88" stopColor="#58813f" />
              <stop offset="1" stopColor="#eef5e8" />
            </linearGradient>
            <linearGradient id="ast-sheen" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="14">
              <stop offset="0" stopColor="#fff" stopOpacity=".45" />
              <stop offset=".5" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity=".18" />
            </linearGradient>
            <mask id="ast-mask" maskUnits="userSpaceOnUse" x="-2" y="-2" width="18" height="18">
              <g ref={spin}>
                <path
                  fill="#fff"
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M7 .09a1 1 0 0 1 1 1v4.088l3.463-2.204a1 1 0 0 1 1.074 1.688L8.863 7l3.674 2.338a1 1 0 0 1-1.074 1.688L8 8.822v4.087a1 1 0 1 1-2 0V8.822l-3.463 2.204a1 1 0 1 1-1.074-1.688L5.137 7 1.463 4.662a1 1 0 1 1 1.074-1.688L6 5.178V1.091a1 1 0 0 1 1-1"
                />
              </g>
            </mask>
          </defs>
          <g mask="url(#ast-mask)">
            <rect x="-2" y="-2" width="18" height="18" fill="url(#ast-metal)" />
            <rect x="-2" y="-2" width="18" height="18" fill="url(#ast-sheen)" />
          </g>
        </svg>
      </div>
    </div>
  );
}
