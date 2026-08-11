import type { MetadataRoute } from "next";

const BASE = "https://planledger.co.kr";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  // 학교 전용 구역(/school)은 검색에 노출하지 않는다.
  const paths = ["/", "/business-plan", "/convert", "/contact", "/privacy"];
  return paths.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
  }));
}
