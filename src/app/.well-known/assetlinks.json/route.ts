import { NextResponse } from "next/server";

// 구글 플레이 앱(정직이들)과 이 웹사이트가 같은 주인임을 증명하는 파일.
// 이 확인이 되어야 앱에서 주소창이 사라지고 진짜 앱처럼 보인다.
//
// 넣는 방법: Vercel 환경변수 ANDROID_FINGERPRINTS 에
// 앱 서명 인증서의 SHA-256 지문을 넣는다. 여러 개면 쉼표로 구분.
// (보통 두 개가 필요하다 — 내 컴퓨터의 업로드 키, 구글 플레이가 다시 서명하는 키)
export const dynamic = "force-dynamic";

const PACKAGE_NAME =
  process.env.ANDROID_PACKAGE_NAME || "kr.co.planledger.jeongjik";

export async function GET() {
  const fingerprints = (process.env.ANDROID_FINGERPRINTS || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const body = fingerprints.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: PACKAGE_NAME,
            sha256_cert_fingerprints: fingerprints,
          },
        },
      ]
    : [];

  return NextResponse.json(body, {
    headers: { "content-type": "application/json" },
  });
}
