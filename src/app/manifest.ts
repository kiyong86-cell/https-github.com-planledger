import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PlanLedger — 기획안 & 제안서",
    short_name: "PlanLedger",
    description:
      "기획안과 기업 제안서를 손쉽게 작성하고 Word·한글로 내보내는 서비스",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#2C4A2E",
    lang: "ko",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
