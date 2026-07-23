import Link from "next/link";
import Nav from "@/components/Nav";
import { getT } from "@/lib/getLang";

export const dynamic = "force-dynamic";

// 후원 정보는 환경변수로 설정 (미설정 시 안내 문구 표시)
const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME;
const BANK_ACCOUNT = process.env.NEXT_PUBLIC_BANK_ACCOUNT;
const BANK_HOLDER = process.env.NEXT_PUBLIC_BANK_HOLDER;
const DONATE_LINK = process.env.NEXT_PUBLIC_DONATE_LINK;

export default function SupportPage() {
  const { t } = getT();
  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <div className="mb-3 text-4xl">☕️</div>
          <h1 className="mb-2 text-2xl font-semibold text-slate-900">
            {t("support.title")}
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-slate-500">
            {t("support.body1")}
            <br />
            {t("support.body2")}
            <br />
            {t("support.body3")}
          </p>

          {DONATE_LINK && (
            <a
              href={DONATE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 inline-block rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {t("support.donateLink")}
            </a>
          )}

          {BANK_ACCOUNT ? (
            <div className="mx-auto max-w-sm rounded-lg bg-slate-50 p-5 text-left text-sm">
              <p className="mb-2 text-center text-xs text-slate-400">
                {t("support.byAccount")}
              </p>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">{t("support.bank")}</span>
                <span className="font-medium text-slate-900">{BANK_NAME}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">{t("support.account")}</span>
                <span className="font-medium text-slate-900">
                  {BANK_ACCOUNT}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">{t("support.holder")}</span>
                <span className="font-medium text-slate-900">{BANK_HOLDER}</span>
              </div>
            </div>
          ) : (
            !DONATE_LINK && (
              <div className="mx-auto max-w-sm rounded-lg border border-dashed bg-slate-50 p-4 text-sm text-slate-500">
                {t("support.notSet")}
              </div>
            )
          )}

          <p className="mt-8 text-xs text-slate-400">
            {t("support.voluntary")}
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
            {t("support.toHome")}
          </Link>
        </div>
      </main>
    </div>
  );
}
