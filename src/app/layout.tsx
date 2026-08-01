import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";
import Footer from "@/components/Footer";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { getLang } from "@/lib/getLang";

export const metadata: Metadata = {
  title: "PlanLedger — 기획안 & 제안서 작성",
  description:
    "내부/외부 기획안과 기업 제안서를 손쉽게 작성하고 Word·한글로 내보내는 사이트",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "PlanLedger",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2C4A2E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        <ServiceWorkerRegister />
        <LangProvider initialLang={lang}>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </LangProvider>
      </body>
    </html>
  );
}
