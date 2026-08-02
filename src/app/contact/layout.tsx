import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "문의하기 — PlanLedger",
  description: "PlanLedger 이용 중 궁금한 점이나 개선 요청을 보내주세요.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
