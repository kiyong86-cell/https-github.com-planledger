import type { MetadataRoute } from "next";
import { headers } from "next/headers";

// 같은 주소(/manifest.webmanifest)지만 어느 화면에서 요청했는지에 따라
// 다른 앱 정보를 내준다.
// - /school 에서 요청 → "정직이들" 앱 (학생·교사용 시간 계획표)
// - 그 밖의 화면 → "PlanLedger" 앱 (기획안·변환)
export const dynamic = "force-dynamic";

export default function manifest(): MetadataRoute.Manifest {
  const referer = headers().get("referer") ?? "";
  const fromSchool = /\/school(\/|$|\?)/.test(referer);

  if (fromSchool) {
    return {
      name: "정직이들 — 주간 시간 계획표",
      short_name: "정직이들",
      description:
        "24시간 계획과 실행을 한 표에 기록하고, 목표 달성률을 자동으로 확인하는 학교 전용 시간 계획표",
      start_url: "/school",
      scope: "/school",
      display: "standalone",
      background_color: "#f8fafc",
      theme_color: "#2f4a6b",
      lang: "ko",
      icons: [
        {
          src: "/jeongjik-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/jeongjik-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/jeongjik-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    };
  }

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
