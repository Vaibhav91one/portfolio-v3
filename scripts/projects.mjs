// One entry per project in data/projects.ts. interact "page": the whole page scrolled down and back (a seamless loop).
// session / local: the site's one-time intro or dialog marked as seen (same flags purrfectui's captures use), so the clip shows the page.
const PS = { "poinu-loader": "1", "poinu-gallery": "1" };
const MS = { "mapinly-intro": "1" };
const ML = { hasSeenLocaleDialog: "true" };

export const CLIPS = {
  purrfectui: { site: "https://purrfectui.com", interact: "page", session: { "purrfect-intro": "1" }, local: { sound: "off" }, depth: 1.6 },
  bountydesk: { site: "https://bountydesk.vaibhav.quest", interact: "page", realtime: true, depth: 1.6 },
  poinu: { site: "https://poinu.vercel.app/shop", interact: "page", realtime: true, session: PS, depth: 1.4 },
  armour: { site: "https://armour.vaibhavtomar.com", interact: "page", realtime: true, depth: 1.6 },
  mapinly: { site: "https://mapinly.vaibhavtomar.com", interact: "page", session: MS, local: ML, depth: 1.6 },
  lernpi: { site: "https://lernpi.ai", interact: "page", depth: 1.6 },
  fluxgen: { site: "https://fluxgen.com", interact: "page", depth: 1.4 },
};
