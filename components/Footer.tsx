import { Identity, Meta } from "./Identity";

/** Footer screen: tagline + links on the left; "Contact me", page links and clock on the right; the big star (drawn by the stage) sits bottom centre. */
export default function Footer() {
  return (
    <section className="relative min-h-screen overflow-hidden px-[2.8vw] py-[5vh]">
      <div className="flex items-start justify-between pt-[3vh] max-sm:flex-col max-sm:gap-6 max-sm:pt-[4vh]">
        <Identity />
        <Meta />
      </div>
      <p className="absolute bottom-[3vh] right-[2.8vw] text-[max(12px,0.95vw)] opacity-50">&copy; 2026 Vaibhav Tomar</p>
    </section>
  );
}
