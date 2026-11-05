import { projects } from "@/data/projects";

/** Reduced-motion / no-WebGL stand-in: a plain list of project cards. ponytail: posters only, no video. */
export default function ProjectsFallback() {
  return (
    <section className="bg-[#0a0a0a] px-[2.8vw] py-16 text-white">
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
  );
}
