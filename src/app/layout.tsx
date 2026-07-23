import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "사업계획서 & 영수증 관리",
  description: "사업계획서를 작성하고 영수증을 손쉽게 정리·첨부하는 사이트",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
