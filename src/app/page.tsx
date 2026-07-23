import Link from "next/link";
import Nav from "@/components/Nav";
import { listPlans, listReceipts } from "@/lib/backend";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const planCount = (await listPlans()).length;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyTotal = (await listReceipts())
    .filter((r) => r.receipt_date.startsWith(thisMonth))
    .reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">안녕하세요!</h1>
        <p className="mb-8 text-sm text-slate-500">
          사업계획서를 작성하고 영수증을 정리해보세요. 모든 데이터는 이 컴퓨터에만 저장됩니다.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/business-plan"
            className="rounded-lg border bg-white p-6 hover:border-slate-400"
          >
            <p className="text-sm text-slate-500">기획안</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {planCount}건
            </p>
            <p className="mt-2 text-sm text-slate-400">
              작성 · 수정 · Word 내보내기 &rarr;
            </p>
          </Link>

          <Link
            href="/receipts"
            className="rounded-lg border bg-white p-6 hover:border-slate-400"
          >
            <p className="text-sm text-slate-500">이번 달 영수증 합계</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {monthlyTotal.toLocaleString("ko-KR")}원
            </p>
            <p className="mt-2 text-sm text-slate-400">
              업로드 · 정리 · CSV 내보내기 &rarr;
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
