import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Real robots.txt (without it the request falls through to the HTML 404 page)
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${SITE_URL}/sitemap.xml` };
}
