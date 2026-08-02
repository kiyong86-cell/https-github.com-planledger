import type { MetadataRoute } from "next";

const BASE = "https://planledger.co.kr";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/business-plan", "/convert", "/contact", "/privacy"];
  return paths.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
  }));
}
