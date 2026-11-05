import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

const title = "Vaibhav Tomar — Design Engineer & Software Developer";
const description =
  "Vaibhav Tomar is a design engineer and software developer in India, building fast, playful web experiences with Next.js, React and GSAP. See projects and get in touch.";
const OG = "/assets/Images/opengraph.jpg";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-96.png", type: "image/png", sizes: "96x96" }, // square raster, multiple of 48px, for Google's favicon crawler
    ],
  },
  keywords: ["Vaibhav Tomar", "Vaibhav91one", "Design Engineer", "Software Developer", "Frontend Developer", "Next.js", "React", "GSAP", "Portfolio"],
  authors: [{ name: "Vaibhav Tomar", url: SITE_URL }],
  twitter: { card: "summary_large_image", title, description, creator: "@VrsatileVaibhav", images: [OG] },
  openGraph: {
    type: "profile",
    url: "/",
    siteName: "Vaibhav Tomar",
    title,
    description,
    images: [{ url: OG, width: 2400, height: 1260, alt: "Vaibhav Tomar — Design Engineer & Software Developer" }],
  },
};

// schema.org graph: Person + WebSite + ProfilePage, so search engines tie the name, the site and the profiles to one person
const personId = `${SITE_URL}/#person`;
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": personId,
      name: "Vaibhav Tomar",
      alternateName: ["Vaibhav91one", "VrsatileVaibhav"],
      description,
      url: SITE_URL,
      image: `${SITE_URL}${OG}`,
      email: "mailto:vaibhavtomar3003@gmail.com",
      jobTitle: ["Design Engineer", "Software Developer"],
      knowsAbout: ["Web development", "Next.js", "React", "GSAP", "Three.js", "UI design", "Motion design"],
      worksFor: { "@type": "Organization", name: "Jio Platforms Limited" },
      address: { "@type": "PostalAddress", addressCountry: "IN" },
      sameAs: ["https://github.com/Vaibhav91one", "https://www.linkedin.com/in/vaibhavtomar91/", "https://x.com/VrsatileVaibhav"],
    },
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: "Vaibhav Tomar", alternateName: "vaibhavtomar.com", publisher: { "@id": personId } },
    { "@type": "ProfilePage", url: SITE_URL, mainEntity: { "@id": personId } },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning // the boot script below sets data-boot before React runs
    >
      <head>
        {/* reloaded while the page was dark: paint dark from the very first frame instead of flashing paper */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(sessionStorage.getItem("pv3-dark")==="1")document.documentElement.dataset.boot="dark"}catch(e){}`,
          }}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      {/* suppressHydrationWarning: extensions add attributes to <body> before React hydrates */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
