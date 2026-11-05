export type Project = {
  slug: string;
  title: string;
  link: string;
  video: string; // 60fps recording of the live site: node scripts/record.mjs <slug|all>
  poster: string;
};

const p = (slug: string, title: string, link: string): Project => ({
  slug,
  title,
  link,
  video: `/projects/${slug}.mp4`,
  poster: `/projects/${slug}.jpg`,
});

export const projects: Project[] = [
  p("purrfectui", "purrfect ui - Animated React Components", "https://purrfectui.com/"),
  p("bountydesk", "BountyDesk - Bug Bounty Triage", "https://bountydesk.vaibhav.quest/"),
  p("poinu", "Poinu - Illustration Portfolio", "https://poinu.vercel.app/"),
  p("armour", "Armour AI finance app", "https://armour.vaibhavtomar.com/"),
  p("mapinly", "Mapinly - Events & Community", "https://mapinly.vaibhavtomar.com/"),
  p("lernpi", "LernPI - School Management", "https://lernpi.ai/"),
  p("fluxgen", "FluxGen - Water Intelligence", "https://fluxgen.com/"),
];
