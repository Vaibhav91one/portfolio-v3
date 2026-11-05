import { cloneElement, isValidElement, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Base = {
  variant?: "solid" | "ghost";
  /** `md` is 46px tall; `lg` is 64px with wider padding. */
  size?: "md" | "lg";
  /** Full width. */
  wide?: boolean;
  icon?: ReactNode;
  iconPosition?: "start" | "end";
  /** Render the one child (a Next `<Link>`, a router link) as the button: it gets the classes and props, its own children are the label. */
  asChild?: boolean;
  children: ReactNode;
  className?: string;
};
export type RollButtonProps =
  | (Base & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children">)
  | (Base & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">);

const EASE = "ease-[cubic-bezier(0.23,1,0.32,1)]";
const ROLL_EASE = "ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"; // the letter roll's own curve
const STEP = 20; // ms between neighbouring letters
const MAX_DELAY = 168; // a long label must not wait seconds for its outer letters
const ROLL_MAX = 24; // width in cells; longer labels are plain text that wraps, instead of a pill wider than its parent
const ROLL_MAX_LG = 20; // `lg` letters and padding are wider, so the cap is lower
const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠]/; // CJK glyphs are about two letters wide
// RTL or joined scripts (Hebrew, Arabic, Indic) read right to left or change shape with their neighbours, so they cannot be split into letters
const JOINED = /[֐-׿؀-ۿݐ-ݿऀ-෿]/;
const cells = (parts: string[]) => parts.reduce((n, g) => n + (WIDE.test(g) ? 2 : 1), 0);
let segmenter: Intl.Segmenter | undefined; // one for every button, made on first use
const graphemes = (s: string) => [...(segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" })).segment(s)].map((x) => x.segment);

/**
 * Label whose letters roll up on hover, starting from the middle and spreading out, while a copy rolls in from below.
 * Only for plain-text labels.
 */
function StaggerText({ text, chars }: { text: string; chars: string[] }) {
  const mid = Math.floor((chars.length + 1) / 2); // the centre of the label plus its trailing space, so the wave starts where it does on Armour
  // the stagger is for the roll in only: leaving is a response, so every letter snaps back at once in 200ms
  const roll = `transition-[translate,opacity] duration-200 ${ROLL_EASE} [transition-delay:0ms] [@media(hover:hover)_and_(pointer:fine)]:group-hover/btn:duration-300 [@media(hover:hover)_and_(pointer:fine)]:group-hover/btn:[transition-delay:var(--d,0ms)] group-data-[hover=true]/btn:duration-300 group-data-[hover=true]/btn:[transition-delay:var(--d,0ms)] motion-reduce:transition-none`;
  return (
    <span dir="ltr" className="inline-flex leading-none">
      <span className="sr-only">{text}</span>
      {chars.map((c, i) => (
        <span key={i} aria-hidden className="relative inline-block overflow-clip whitespace-pre">
          <span
            style={{ "--d": `${Math.min(Math.abs(i - mid) * STEP, MAX_DELAY)}ms` } as CSSProperties}
            className={`block ${roll} [@media(hover:hover)_and_(pointer:fine)]:group-hover/btn:-translate-y-full group-data-[hover=true]/btn:-translate-y-full motion-reduce:[@media(hover:hover)_and_(pointer:fine)]:group-hover/btn:translate-y-0 motion-reduce:group-data-[hover=true]/btn:translate-y-0`}
          >
            <span className={`block opacity-85 ${roll} [@media(hover:hover)_and_(pointer:fine)]:group-hover/btn:opacity-0 group-data-[hover=true]/btn:opacity-0 motion-reduce:[@media(hover:hover)_and_(pointer:fine)]:group-hover/btn:opacity-85 motion-reduce:group-data-[hover=true]/btn:opacity-85`}>{c}</span>
            <span className={`absolute top-full left-0 opacity-0 ${roll} [@media(hover:hover)_and_(pointer:fine)]:group-hover/btn:opacity-100 group-data-[hover=true]/btn:opacity-100 motion-reduce:[@media(hover:hover)_and_(pointer:fine)]:group-hover/btn:opacity-0 motion-reduce:group-data-[hover=true]/btn:opacity-0`}>{c}</span>
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * Pill button (46px). Renders an <a> when `href` is set, or your own link with `asChild`. A string label rolls up letter
 * by letter from the middle on hover; the button lifts 2px (an invisible strip under it keeps the pointer over it, so the
 * lift cannot flicker) and presses down to 97%. Optional `icon` sits before or after the label. `data-hover="true"` shows
 * the hover state without a pointer.
 */
export function RollButton({ variant = "solid", size = "md", wide, icon, iconPosition = "start", asChild, className, children, ...rest }: RollButtonProps) {
  const child = asChild && isValidElement(children) ? (children as ReactElement<{ className?: string; children?: ReactNode }>) : null;
  const body = child ? child.props.children : children;
  const label = typeof body === "string" ? body : null;
  const chars = label ? graphemes(label) : [];
  const roll = label !== null && label.length > 0 && !JOINED.test(label) && cells(chars) <= (size === "lg" ? ROLL_MAX_LG : ROLL_MAX);
  const wraps = !roll; // anything that does not roll (long, joined or non-string labels) may wrap; short ones still sit on one line
  const cls = cn(
    `group/btn relative inline-flex ${size === "lg" ? "min-h-16 min-w-16 px-10" : "min-h-[46px] min-w-[46px] px-[22px]"} max-w-full items-center justify-center gap-2 rounded-full text-base font-medium`,
    wraps ? "py-3 text-center whitespace-normal" : "shrink-0 whitespace-nowrap",
    `transition-[translate,scale,opacity,background-color] duration-200 ${EASE} active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50`,
    "[@media(hover:hover)_and_(pointer:fine)]:motion-safe:hover:-translate-y-0.5 data-[hover=true]:motion-safe:-translate-y-0.5 before:absolute before:inset-x-0 before:-bottom-[3px] before:h-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
    variant === "solid" ? "bg-foreground text-background [@media(hover:hover)_and_(pointer:fine)]:hover:bg-foreground/85 data-[hover=true]:bg-foreground/85" : "border border-foreground text-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-foreground/5 data-[hover=true]:bg-foreground/5",
    wide && "w-full",
    child?.props.className,
    className,
  );
  const iconEl = icon ? <span className="inline-flex items-center justify-center">{icon}</span> : null;
  const content = (
    <>
      {iconPosition === "start" && iconEl}
      {roll ? <StaggerText text={label!} chars={chars} /> : body}
      {iconPosition === "end" && iconEl}
    </>
  );
  if (child) return cloneElement(child, { ...rest, className: cls }, content);
  if ("href" in rest && rest.href !== undefined)
    return (
      <a className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </a>
    );
  return (
    <button type="button" className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {content}
    </button>
  );
}
