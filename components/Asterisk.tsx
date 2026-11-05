/**
 * The Mapinly asterisk (four rounded arms, sage -> green gradient), centred on the bottom-left corner so a quarter of
 * it shows, turning slowly. `data-fade` lets the scroll render fade the wrapper; the inner element fades in with `play`.
 */
export default function Asterisk({ play }: { play: boolean }) {
  return (
    <div data-fade aria-hidden className="pointer-events-none absolute bottom-0 left-0 z-0 size-0">
      <div className={`transition-opacity duration-[1600ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${play ? "opacity-100" : "opacity-0"}`}>
        <svg
          viewBox="0 0 14 14"
          fill="none"
          className="asterisk-spin absolute left-[-24vw] top-[-24vw] size-[48vw]"
        >
          <defs>
            <linearGradient id="asterisk-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#B8CCA8" />
              <stop offset="50%" stopColor="#568145" />
              <stop offset="100%" stopColor="#B8CCA8" />
            </linearGradient>
          </defs>
          <path
            fill="url(#asterisk-gradient)"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M7 .09a1 1 0 0 1 1 1v4.088l3.463-2.204a1 1 0 0 1 1.074 1.688L8.863 7l3.674 2.338a1 1 0 0 1-1.074 1.688L8 8.822v4.087a1 1 0 1 1-2 0V8.822l-3.463 2.204a1 1 0 1 1-1.074-1.688L5.137 7 1.463 4.662a1 1 0 1 1 1.074-1.688L6 5.178V1.091a1 1 0 0 1 1-1"
          />
        </svg>
      </div>
    </div>
  );
}
