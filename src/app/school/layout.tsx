import type { Metadata } from "next";

// 학교 전용 구역 — 검색엔진에 노출하지 않는다.
export const metadata: Metadata = {
  title: "KAIROS — 학교 전용",
  robots: { index: false, follow: false },
};

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
