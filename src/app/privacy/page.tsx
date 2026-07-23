import Link from "next/link";
import Nav from "@/components/Nav";
import { getLang, getT } from "@/lib/getLang";

export const dynamic = "force-dynamic";

const SERVICE_NAME = "PlanLedger";
const CONTACT = process.env.NEXT_PUBLIC_CONTACT || "관리자 이메일";

const KO = [
  {
    h: "1. 수집하는 개인정보 항목",
    p: [
      `${SERVICE_NAME}(이하 "서비스")는 회원가입 및 서비스 제공을 위해 다음 정보를 수집합니다.`,
      "• 필수: 이메일 주소, 비밀번호, 이름 또는 단체명",
      "• 서비스 이용 과정에서 이용자가 직접 입력·업로드하는 기획안·제안서 내용 및 첨부 이미지",
    ],
  },
  {
    h: "2. 개인정보의 수집·이용 목적",
    p: [
      "• 회원 식별 및 로그인, 서비스 제공",
      "• 이용자가 작성한 문서의 저장·조회·내보내기",
      "• 서비스 운영 통계(내보내기 횟수 등) 집계 — 개인을 특정하지 않는 범위",
    ],
  },
  {
    h: "3. 보유 및 이용 기간",
    p: [
      "이용자의 개인정보는 회원 탈퇴 시 또는 수집·이용 목적 달성 시까지 보유하며, 그 후 지체 없이 파기합니다.",
      "이용자는 언제든지 계정 삭제를 요청할 수 있으며, 요청 시 관련 데이터를 삭제합니다.",
    ],
  },
  {
    h: "4. 개인정보의 처리위탁 및 국외 이전",
    p: [
      "서비스는 안정적인 운영을 위해 아래 해외 클라우드 서비스에 데이터 저장·처리를 위탁합니다.",
      "• Supabase (데이터베이스·인증·파일 저장) — 미국 등",
      "• Vercel (웹 호스팅) — 미국 등",
      "이용자가 입력한 정보는 위 서비스의 서버(국외)에 저장될 수 있습니다.",
    ],
  },
  {
    h: "5. 이용자의 권리",
    p: [
      "이용자는 자신의 개인정보에 대해 열람·정정·삭제·처리정지를 요구할 수 있습니다.",
      `요청은 아래 문의처(${CONTACT})로 접수할 수 있습니다.`,
    ],
  },
  {
    h: "6. 개인정보 보호책임자 및 문의",
    p: [`문의: ${CONTACT}`],
  },
  {
    h: "7. 고지의 의무",
    p: [
      "본 방침은 관련 법령·서비스 변경에 따라 개정될 수 있으며, 변경 시 서비스 내 공지합니다.",
    ],
  },
];

const EN = [
  {
    h: "1. Information We Collect",
    p: [
      `${SERVICE_NAME} (the "Service") collects the following for account creation and service provision.`,
      "• Required: email address, password, name or organization",
      "• Documents (proposals) and attached images you create or upload while using the Service",
    ],
  },
  {
    h: "2. Purpose of Collection and Use",
    p: [
      "• Member identification, login, and service provision",
      "• Saving, viewing, and exporting documents you create",
      "• Aggregate usage statistics (e.g. export counts) that do not identify individuals",
    ],
  },
  {
    h: "3. Retention Period",
    p: [
      "Your data is retained until you delete your account or the purpose of collection is fulfilled, after which it is destroyed without delay.",
      "You may request account deletion at any time; related data will be deleted upon request.",
    ],
  },
  {
    h: "4. Sub-processing and International Transfer",
    p: [
      "For reliable operation, the Service entrusts data storage/processing to the following overseas cloud providers.",
      "• Supabase (database, authentication, file storage) — USA, etc.",
      "• Vercel (web hosting) — USA, etc.",
      "Your information may be stored on the servers of these providers, located outside your country.",
    ],
  },
  {
    h: "5. Your Rights",
    p: [
      "You may request access to, correction, deletion of, or suspension of processing of your personal data.",
      `Requests can be sent to the contact below (${CONTACT}).`,
    ],
  },
  {
    h: "6. Data Protection Contact",
    p: [`Contact: ${CONTACT}`],
  },
  {
    h: "7. Changes to This Policy",
    p: [
      "This policy may be revised in line with applicable laws or service changes; changes will be announced within the Service.",
    ],
  },
];

export default function PrivacyPage() {
  const { t } = getT();
  const lang = getLang();
  const sections = lang === "ko" ? KO : EN;
  const updated = lang === "ko" ? "최종 개정일: 2026-07-23" : "Last updated: 2026-07-23";

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
