import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "기획안 · 제안서 작성 — PlanLedger",
  description:
    "내부/외부 기획안, 기업 제안서를 온라인에서 작성하고 Word·한글 파일로 내보내세요. 회원가입 없이 무료로 바로 시작할 수 있습니다.",
};

export default function BusinessPlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
