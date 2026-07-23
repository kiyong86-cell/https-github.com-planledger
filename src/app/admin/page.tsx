import Link from "next/link";
import Nav from "@/components/Nav";
import { isCloudMode } from "@/lib/mode";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

const TYPE_LABELS: Record<string, string> = {
  export_docx: "Word 내보내기",
  export_hwpx: "한글 내보내기",
  export_pdf: "PDF 인쇄/저장",
  plan_created: "기획안 생성",
  receipt_created: "영수증 생성",
};

type EventRow = { type: string; user_id: string | null; created_at: string };
type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default async function AdminPage() {
  if (!isCloudMode()) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <p className="text-sm text-slate-500">
            통계는 웹(클라우드 모드)에서만 제공됩니다.
          </p>
        </main>
      </div>
    );
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 제작자(관리자) 이메일이 아니면 접근 차단
  if (!user || !ADMIN_EMAIL || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="mb-2 text-xl font-semibold text-slate-900">
            접근 권한 없음
          </h1>
          <p className="text-sm text-slate-500">
            이 페이지는 제작자만 볼 수 있습니다.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-slate-500 hover:text-slate-900"
          >
            &larr; 홈으로
          </Link>
        </main>
      </div>
    );
  }

  // 이벤트 조회 (RLS가 관리자에게만 허용). 최근 10,000건까지 집계.
  const { data } = await supabase
    .from("events")
    .select("type, user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(10000);

  const events = (data ?? []) as EventRow[];

  // 가입자 목록 (이름/단체명 포함)
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, display_name, email, created_at")
    .order("created_at", { ascending: false });

  const profiles = (profileData ?? []) as ProfileRow[];

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;

  const totalByType: Record<string, number> = {};
  const monthByType: Record<string, number> = {};
  const users = new Set<string>();

  for (const e of events) {
    totalByType[e.type] = (totalByType[e.type] ?? 0) + 1;
    if (e.created_at.startsWith(monthPrefix)) {
      monthByType[e.type] = (monthByType[e.type] ?? 0) + 1;
    }
    if (e.user_id) users.add(e.user_id);
  }

  const totalExports =
    (totalByType.export_docx ?? 0) +
    (totalByType.export_hwpx ?? 0) +
    (totalByType.export_pdf ?? 0);
  const monthExports =
    (monthByType.export_docx ?? 0) +
    (monthByType.export_hwpx ?? 0) +
    (monthByType.export_pdf ?? 0);

  const orderedTypes = [
    "export_docx",
    "export_hwpx",
    "export_pdf",
    "plan_created",
    "receipt_created",
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">
          사용 통계 (제작자 전용)
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          {user.email} 님만 볼 수 있는 페이지입니다.
        </p>

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="총 내보내기" value={totalExports} />
          <StatCard label="이번 달 내보내기" value={monthExports} />
          <StatCard label="활동한 사용자 수" value={users.size} />
        </div>

        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2">항목</th>
                <th className="px-4 py-2 text-right">이번 달</th>
                <th className="px-4 py-2 text-right">전체</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orderedTypes.map((t) => (
                <tr key={t}>
                  <td className="px-4 py-2 text-slate-700">
                    {TYPE_LABELS[t] ?? t}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {(monthByType[t] ?? 0).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-slate-900">
                    {(totalByType[t] ?? 0).toLocaleString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {events.length === 0 && (
          <p className="mt-4 text-sm text-slate-400">
            아직 기록된 사용 내역이 없습니다. (또는 events 테이블이 아직 생성되지
            않았습니다 — supabase/analytics.sql을 실행하세요.)
          </p>
        )}

        <h2 className="mb-3 mt-10 text-lg font-semibold text-slate-900">
          가입자 목록 ({profiles.length}명)
        </h2>
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2">이름/단체명</th>
                <th className="px-4 py-2">이메일</th>
                <th className="px-4 py-2 text-right">가입일</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {p.display_name || "(이름 없음)"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{p.email}</td>
                  <td className="px-4 py-2 text-right text-slate-500">
                    {new Date(p.created_at).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {profiles.length === 0 && (
            <p className="p-4 text-sm text-slate-400">
              아직 가입자가 없습니다. (또는 profiles 테이블이 아직 생성되지
              않았습니다 — supabase/profiles.sql을 실행하세요.)
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
