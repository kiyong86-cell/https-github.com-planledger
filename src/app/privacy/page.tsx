import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import { getLang, getT } from "@/lib/getLang";
import { PRIVACY_VERSION } from "@/lib/privacy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "개인정보처리방침 — PlanLedger",
  description: "PlanLedger의 개인정보 처리방침을 안내합니다.",
};

const SERVICE_NAME = "PlanLedger";
const CONTACT = process.env.NEXT_PUBLIC_CONTACT || "kiyong0263@naver.com";

const KO = [
  {
    h: "1. 로그인 없이 쓸 때는 아무것도 수집하지 않습니다",
    p: [
      `${SERVICE_NAME}(이하 "서비스")의 기획안 작성과 Word→한글 변환은 회원가입·로그인 없이 사용할 수 있습니다.`,
      "로그인하지 않고 사용하면 작성한 문서와 첨부한 사진은 이용자 본인의 브라우저에만 저장되고 서버로 전송되지 않습니다. Word→한글 변환도 전부 브라우저 안에서 처리되어 업로드한 파일이 서버로 전송되지 않습니다.",
      "이 경우 브라우저 데이터를 지우거나 다른 기기를 쓰면 문서가 보이지 않습니다. 중요한 문서는 Word·한글 파일로 내보내 따로 보관해주세요.",
    ],
  },
  {
    h: "2. 계정을 만들면 수집하는 정보",
    p: [
      "여러 기기에서 이어 쓰기를 원하는 분만 이메일로 계정을 만들 수 있습니다. 계정을 만들면 아래 정보를 수집·보관합니다.",
      "· 이메일 주소, 비밀번호(암호화되어 저장되며 운영자도 볼 수 없습니다)",
      "· 가입 일시, 개인정보처리방침 동의 일시와 동의한 방침 버전 (동의 사실을 증명하기 위해 보관합니다)",
      "· 계정에 저장한 기획안·제안서 내용과 첨부 사진 (여러 기기에서 이어 쓰기 위한 목적)",
    ],
  },
  {
    h: "3. 정직이들(학교 시간 계획표)에서 추가로 수집하는 정보",
    p: [
      "학교 전용 기능인 '정직이들'을 이용 신청하면 아래 정보를 추가로 수집합니다.",
      "· 이름, 구분(학생·교사), 학번, 학년, 반 — 이용 승인과 본인 확인 목적",
      "· 주간 시간 계획과 실행 기록, 할 일, 묵상·감사·자기평가로 적은 내용 — 서비스 제공 목적",
      "이용이 승인되면 담당 교사와 관리자가 학생의 이름·학번·학년·반과 주간 계획 기록(작성 여부, 계획·실행 시간, 달성률, 할 일 완료 수)을 볼 수 있습니다. 학습 지도 목적 외에는 사용하지 않습니다.",
      "만 14세 미만 아동은 법정대리인의 동의를 받은 뒤 신청해야 합니다.",
    ],
  },
  {
    h: "4. 수집하는 이용 통계",
    p: [
      "서비스 개선을 위해 기능 사용 횟수(문서 내보내기·변환 등)만 익명으로 집계합니다.",
      "이 기록에는 이용자를 식별할 수 있는 정보나 문서 내용이 포함되지 않습니다.",
    ],
  },
  {
    h: "5. 보관 기간과 파기",
    p: [
      "수집한 정보는 이용자가 삭제를 요청하거나 계정을 삭제할 때까지 보관하며, 요청을 받으면 지체 없이 파기합니다.",
      "동의 기록(동의 일시·버전)은 계정이 삭제될 때 함께 파기됩니다.",
    ],
  },
  {
    h: "6. 처리 위탁과 국외 이전",
    p: [
      "서비스는 아래 업체에 개인정보 처리를 위탁하며, 해당 업체의 서버가 국외에 있습니다.",
      "· Vercel Inc. (미국) — 웹사이트 호스팅. 접속 과정의 통상적인 접속 기록(IP 등)이 처리될 수 있습니다.",
      "· Supabase Inc. (서버 위치: 호주 시드니) — 계정 인증, 데이터베이스, 파일 보관. 위 2·3항의 정보가 저장됩니다.",
      "이용자는 국외 이전을 원하지 않을 경우 계정을 만들지 않고 로그인 없이 서비스를 이용할 수 있습니다.",
    ],
  },
  {
    h: "7. 제3자 제공",
    p: [
      "수집한 정보를 광고 등 다른 목적으로 판매하거나 제3자에게 제공하지 않습니다. 법령에 따라 요구되는 경우에만 예외로 합니다.",
    ],
  },
  {
    h: "8. 이용자의 권리",
    p: [
      "이용자는 언제든지 본인의 개인정보에 대해 열람·정정·삭제·처리정지를 요구하고, 동의를 철회할 수 있습니다. 아래 연락처로 요청하면 지체 없이 처리합니다.",
      "정직이들 이용 학생은 담당 교사나 관리자를 통해서도 요청할 수 있습니다.",
    ],
  },
  {
    h: "9. 안전 조치",
    p: [
      "비밀번호는 암호화되어 저장되며 운영자도 확인할 수 없습니다.",
      "데이터베이스는 본인만 자기 자료를 읽고 쓸 수 있도록 접근 권한을 제한하고 있습니다. 교사·관리자 권한은 관리자가 승인한 계정에만 부여됩니다.",
      "서비스 접속 구간은 HTTPS로 암호화됩니다.",
    ],
  },
  {
    h: "10. 개인정보 보호책임자 · 문의",
    p: ["개인정보 보호책임자: 박기용", `문의: ${CONTACT}`],
  },
  {
    h: "11. 고지의 의무",
    p: [
      "본 방침은 관련 법령·서비스 변경에 따라 개정될 수 있으며, 변경 시 서비스 내 공지합니다.",
    ],
  },
];

const EN = [
  {
    h: "1. Nothing Is Collected When You Use It Without Logging In",
    p: [
      `Writing proposals and converting Word to HWP in ${SERVICE_NAME} (the "Service") works without any sign-up or login.`,
      "When used without logging in, your documents and attached images stay in your own browser and are never sent to a server. The Word-to-HWP conversion also runs entirely inside your browser.",
      "In that case, clearing browser data or switching devices means your documents will no longer appear. Please export important documents to Word or HWP and keep your own copy.",
    ],
  },
  {
    h: "2. Information Collected If You Create an Account",
    p: [
      "An email account is optional and only needed to continue your work across devices. If you create one, we collect and store:",
      "· Email address and password (stored encrypted; the operator cannot read it)",
      "· Sign-up date, and the date and version of the privacy policy you agreed to (kept as proof of consent)",
      "· Proposals and attached images you save to your account, so they are available on your other devices",
    ],
  },
  {
    h: "3. Additional Information for 정직이들 (School Timetable)",
    p: [
      "If you apply to use the school-only feature, we additionally collect:",
      "· Name, role (student or teacher), student number, grade and class — to approve access and identify you",
      "· Weekly plan and actual time records, to-do items, and the reflection and self-review notes you write",
      "Once approved, your teacher and the administrator can see your name, student number, grade, class, and weekly records (whether you filled it in, planned and actual hours, goal rate, completed to-dos). This is used only for study guidance.",
      "Children under 14 must obtain consent from a legal guardian before applying.",
    ],
  },
  {
    h: "4. Usage Statistics",
    p: [
      "To improve the Service, we count only anonymous feature usage (e.g. exports and conversions).",
      "These records contain no personally identifying information and no document content.",
    ],
  },
  {
    h: "5. Retention and Deletion",
    p: [
      "Collected information is kept until you request deletion or delete your account, and is destroyed without delay upon request.",
      "Consent records are destroyed together with the account.",
    ],
  },
  {
    h: "6. Processors and Overseas Transfer",
    p: [
      "The Service entrusts processing to the following providers, whose servers are located outside Korea:",
      "· Vercel Inc. (USA) — web hosting; standard access logs (such as IP addresses) may be processed.",
      "· Supabase Inc. (servers in Sydney, Australia) — authentication, database and file storage for the data in sections 2 and 3.",
      "If you prefer no overseas transfer, you can use the Service without creating an account.",
    ],
  },
  {
    h: "7. Sharing with Third Parties",
    p: [
      "We do not sell or share collected information for advertising or any other purpose, except where required by law.",
    ],
  },
  {
    h: "8. Your Rights",
    p: [
      "You may request access, correction, deletion or suspension of processing of your personal data, and withdraw consent, at any time via the contact below. Requests are handled without delay.",
      "Students using 정직이들 may also make requests through their teacher or the administrator.",
    ],
  },
  {
    h: "9. Security Measures",
    p: [
      "Passwords are stored encrypted and cannot be read by the operator.",
      "Database access is restricted so that each person can read and write only their own data. Teacher and administrator permissions are granted only to accounts approved by the administrator.",
      "All traffic to the Service is encrypted with HTTPS.",
    ],
  },
  {
    h: "10. Data Protection Officer · Contact",
    p: ["Data protection officer: Ki Young Park", `Contact: ${CONTACT}`],
  },
  {
    h: "11. Changes to This Policy",
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
    lang === "ko"
      ? `최종 개정일: ${PRIVACY_VERSION}`
      : `Last updated: ${PRIVACY_VERSION}`;

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
