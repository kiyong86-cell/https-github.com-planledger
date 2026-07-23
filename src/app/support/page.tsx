import Link from "next/link";
import Nav from "@/components/Nav";

export const dynamic = "force-dynamic";

// 후원 정보는 환경변수로 설정 (미설정 시 안내 문구 표시)
const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME;
const BANK_ACCOUNT = process.env.NEXT_PUBLIC_BANK_ACCOUNT;
const BANK_HOLDER = process.env.NEXT_PUBLIC_BANK_HOLDER;
const DONATE_LINK = process.env.NEXT_PUBLIC_DONATE_LINK; // 토스/카카오페이 송금 링크(선택)

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <div className="mb-3 text-4xl">☕️</div>
          <h1 className="mb-2 text-2xl font-semibold text-slate-900">
            후원하기
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-slate-500">
            이 도구는 누구나 <strong>무료로</strong> 쓰실 수 있어요.
            <br />
            혹시 도움이 되셨다면, 커피 한 잔의 마음으로 후원해주시면
            <br />
            더 좋은 기능을 만드는 데 큰 힘이 됩니다. 🙏
          </p>

          {DONATE_LINK && (
            <a
              href={DONATE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 inline-block rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700"
            >
              간편 송금으로 후원하기
            </a>
          )}

          {BANK_ACCOUNT ? (
            <div className="mx-auto max-w-sm rounded-lg bg-slate-50 p-5 text-left text-sm">
              <p className="mb-2 text-center text-xs text-slate-400">
                계좌로 후원하기
              </p>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">은행</span>
                <span className="font-medium text-slate-900">{BANK_NAME}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">계좌번호</span>
                <span className="font-medium text-slate-900">
                  {BANK_ACCOUNT}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">예금주</span>
                <span className="font-medium text-slate-900">{BANK_HOLDER}</span>
              </div>
            </div>
          ) : (
            !DONATE_LINK && (
              <div className="mx-auto max-w-sm rounded-lg border border-dashed bg-slate-50 p-4 text-sm text-slate-500">
                후원 정보가 아직 설정되지 않았습니다. (관리자: 환경변수{" "}
                <code className="rounded bg-slate-200 px-1">
                  NEXT_PUBLIC_BANK_ACCOUNT
                </code>{" "}
                또는{" "}
                <code className="rounded bg-slate-200 px-1">
                  NEXT_PUBLIC_DONATE_LINK
                </code>{" "}
                를 설정하세요.)
              </div>
            )
          )}

          <p className="mt-8 text-xs text-slate-400">
            후원은 순수한 자발적 후원이며, 후원 여부와 관계없이 모든 기능을
            제한 없이 사용하실 수 있습니다.
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            &larr; 홈으로
          </Link>
        </div>
      </main>
    </div>
  );
}
