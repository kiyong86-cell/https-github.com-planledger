import Link from "next/link";
import Nav from "@/components/Nav";
import { getLang, getT } from "@/lib/getLang";

export const dynamic = "force-dynamic";

const SERVICE_NAME = "PlanLedger";
const CONTACT = process.env.NEXT_PUBLIC_CONTACT || "kiyong0263@naver.com";

const KO = [
  {
    h: "1. 회원가입을 받지 않습니다",
    p: [
      `${SERVICE_NAME}(이하 "서비스")는 회원가입·로그인 없이 이용할 수 있으며, 이름·이메일 등 어떤 개인정보도 수집하지 않습니다.`,
    ],
  },
  {
    h: "2. 작성한 문서는 어디에 저장되나요",
    p: [
      "이용자가 작성한 기획안·제안서와 첨부한 사진은 이용자 본인의 브라우저 저장소에만 저장되며, 서버로 전송되지 않습니다.",
      "Word 파일을 한글 파일로 바꾸는 변환 기능도 전부 브라우저 안에서 처리되어, 업로드한 파일이 서버로 전송되지 않습니다.",
      "따라서 브라우저 데이터를 삭제하거나 다른 기기·브라우저를 사용하면 작성한 문서는 보이지 않습니다. 중요한 문서는 Word·한글 파일로 내보내 따로 보관해주세요.",
    ],
  },
  {
    h: "3. 수집하는 이용 통계",
    p: [
      "서비스 개선을 위해 기능 사용 횟수(문서 내보내기·변환 등)만 익명으로 집계합니다.",
      "이 기록에는 이용자를 식별할 수 있는 정보나 문서 내용이 포함되지 않습니다.",
    ],
  },
  {
    h: "4. 서비스 운영 위탁",
    p: [
      "서비스는 웹사이트 호스팅을 위해 Vercel(미국 등)을 이용하며, 접속 과정에서 통상적인 접속 기록(IP 등)이 해당 업체에 의해 처리될 수 있습니다.",
    ],
  },
  {
    h: "5. 문의",
    p: [`문의: ${CONTACT}`],
  },
  {
    h: "6. 고지의 의무",
    p: [
      "본 방침은 관련 법령·서비스 변경에 따라 개정될 수 있으며, 변경 시 서비스 내 공지합니다.",
    ],
  },
];

const EN = [
  {
    h: "1. No Sign-up Required",
    p: [
      `${SERVICE_NAME} (the "Service") can be used without any sign-up or login, and collects no personal information such as your name or email.`,
    ],
  },
  {
    h: "2. Where Your Documents Are Stored",
    p: [
      "Documents you create and images you attach are stored only in your own browser storage — they are never sent to a server.",
      "The Word-to-HWP conversion also runs entirely inside your browser; uploaded files are never transmitted to a server.",
      "As a result, clearing your browser data or switching devices/browsers means your documents will no longer appear. Please export important documents to Word or HWP and keep your own copy.",
    ],
  },
  {
    h: "3. Usage Statistics",
    p: [
      "To improve the Service, we count only anonymous feature usage (e.g. exports and conversions).",
      "These records contain no personally identifying information and no document content.",
    ],
  },
  {
    h: "4. Service Providers",
    p: [
      "The Service uses Vercel (USA, etc.) for web hosting; standard access logs (such as IP addresses) may be processed by that provider.",
    ],
  },
  {
    h: "5. Contact",
    p: [`Contact: ${CONTACT}`],
  },
  {
    h: "6. Changes to This Policy",
    p: [
      "This policy may be revised in line with applicable laws or service changes; changes will be announced within the Service.",
    ],
  },
];

export default function PrivacyPage() {
  const { t } = getT();
  const lang = getLang();
  const sections = lang === "ko" ? KO : EN;
  const updated =
    lang === "ko" ? "최종 개정일: 2026-08-01" : "Last updated: 2026-08-01";

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">
          {t("privacy.title")}
        </h1>
        <p className="mb-8 text-xs text-slate-400">{updated}</p>

        <div className="space-y-6">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="mb-2 text-base font-semibold text-slate-800">
                {s.h}
              </h2>
              {s.p.map((line, i) => (
                <p
                  key={i}
                  className="mb-1 text-sm leading-relaxed text-slate-600"
                >
                  {line}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-10">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
            {t("privacy.toHome")}
          </Link>
        </div>
      </main>
    </div>
  );
}
