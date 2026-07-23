import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";
import { getLang } from "@/lib/getLang";

export const metadata: Metadata = {
  title: "PlanLedger — 기획안 & 제안서 작성",
  description:
    "내부/외부 기획안과 기업 제안서를 손쉽게 작성하고 Word·한글로 내보내는 사이트",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = getLang();
  return (
    <html lang={lang}>
      <body>
        <LangProvider initialLang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
