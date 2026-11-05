import { projects } from "@/data/projects";
import Footer from "./Footer";
import { RollButton } from "./RollButton";

/** Reduced-motion / no-WebGL stand-in: a plain list of project cards, then the footer screen. ponytail: posters only, no video, no star. */
export default function ProjectsFallback() {
  return (
    <>
      <section id="projects" className="bg-[#0a0a0a] px-[2.8vw] py-16 text-white">
        <ul className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.slug}>
              <a href={p.link} target="_blank" rel="noopener" className="group block">
                {/* eslint-disable-next-line @next/next/no-img-element -- static posters */}
                <img src={p.poster} alt="" loading="lazy" className="aspect-[2.39/1] w-full rounded object-cover" />
                <p className="mt-2 text-sm group-hover:underline">{p.title}</p>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <div className="bg-[#f4f4f4] text-[#111]">
        <section id="about" className="px-[2.8vw] py-16">
          <h2 className="text-[max(30px,4.6vw)] font-normal leading-[1.1]">What I do</h2>
          <ul className="mt-6 text-[max(18px,1.7vw)] leading-[1.3]">
            {["Design Engineer", "Software Developer", "Cybersecurity Researcher", "Freelancer"].map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <RollButton href="mailto:vaibhavtomar3003@gmail.com" className="mt-10">
            Contact me
          </RollButton>
        </section>
        <Footer />
      </div>
    </>
  );
}
