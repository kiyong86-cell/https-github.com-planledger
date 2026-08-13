import type { Metadata, Viewport } from "next";

// 학교 전용 구역 — 검색엔진에 노출하지 않는다.
// 앱 이름·아이콘(정직이들)은 루트 레이아웃에서 경로를 보고 정한다.
export const metadata: Metadata = {
  title: "정직이들 — 학교 전용",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#2f4a6b",
};

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
