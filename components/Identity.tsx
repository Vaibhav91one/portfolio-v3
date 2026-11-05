import Clock from "./Clock";
import Nav from "./Nav";
import { RollButton } from "./RollButton";

const EMAIL = "vaibhavtomar3003@gmail.com";
const LINKS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/vaibhavtomar91/" },
  { label: "X", href: "https://x.com/VrsatileVaibhav" },
  { label: "GitHub", href: "https://github.com/Vaibhav91one" },
];
const LINK = "transition-opacity hover:opacity-60";

/** Footer, left: tagline + profiles + email. */
export function Identity() {
  return (
    <div>
      <p className="text-[max(30px,4.2vw)] font-normal leading-[1]">
        Let&rsquo;s build
        <br />
        something together.
      </p>
      <ul className="mt-[2.5vh] flex flex-wrap gap-x-[1.6vw] gap-y-1 text-[max(13px,1.05vw)] leading-none max-sm:gap-x-4">
        {LINKS.map((l) => (
          <li key={l.label}>
            <a href={l.href} target="_blank" rel="me noopener" className={LINK}>
              {l.label}
            </a>
          </li>
        ))}
        <li>
          <a href={`mailto:${EMAIL}`} className={LINK}>
            {EMAIL}
          </a>
        </li>
      </ul>
    </div>
  );
}

/** Footer, right: "Contact me" button, page links and the live IST clock. */
export function Meta() {
  return (
    <div className="flex flex-col items-end text-right max-sm:items-start max-sm:text-left">
      <RollButton href={`mailto:${EMAIL}`}>Contact me</RollButton>
      <div className="mt-[3vh]">
        <Nav label="Footer" listClass="flex flex-col items-end gap-[1.1vh] max-sm:items-start" linkClass="text-[max(13px,1.05vw)]" />
      </div>
      <p className="mt-[3vh] text-[max(13px,1.05vw)] leading-none opacity-60">
        <span className="mr-3">India</span>
        <Clock />
      </p>
    </div>
  );
}
