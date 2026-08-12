import Link from "next/link";
import Nav from "@/components/Nav";
import { isCloudMode } from "@/lib/mode";
import { getT } from "@/lib/getLang";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

type EventRow = { type: string; user_id: string | null; created_at: string };

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default async function AdminPage() {
  const { t } = getT();
  if (!isCloudMode()) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <p className="text-sm text-slate-500">{t("admin.cloudOnly")}</p>
        </main>
      </div>
    );
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 제작자 이메일이거나, 관리자로 임명된 사람만 볼 수 있다.
  const { getSchoolSession } = await import("@/lib/schoolAuth");
  const session = await getSchoolSession();
  const allowed =
    Boolean(user) &&
    ((ADMIN_EMAIL && user?.email === ADMIN_EMAIL) || session?.isAdmin);

  if (!allowed) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="mb-2 text-xl font-semibold text-slate-900">
            {t("admin.noAccess")}
          </h1>
          <p className="text-sm text-slate-500">{t("admin.noAccessBody")}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-slate-500 hover:text-slate-900"
          >
            {t("common.toHome")}
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

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;

  const totalByType: Record<string, number> = {};
  const monthByType: Record<string, number> = {};

  for (const e of events) {
    totalByType[e.type] = (totalByType[e.type] ?? 0) + 1;
    if (e.created_at.startsWith(monthPrefix)) {
      monthByType[e.type] = (monthByType[e.type] ?? 0) + 1;
    }
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
    "convert_docx",
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">
          {t("admin.title")}
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          {user?.email}
          {t("admin.onlyYou")}{" "}
          <Link href="/school/admin" className="text-emerald-700 underline">
            가입자 · 권한 관리 →
          </Link>
        </p>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <StatCard label={t("admin.totalExports")} value={totalExports} />
          <StatCard label={t("admin.monthExports")} value={monthExports} />
        </div>

        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2">{t("admin.colItem")}</th>
                <th className="px-4 py-2 text-right">{t("admin.colMonth")}</th>
                <th className="px-4 py-2 text-right">{t("admin.colTotal")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orderedTypes.map((evType) => (
                <tr key={evType}>
                  <td className="px-4 py-2 text-slate-700">
                    {t(`admin.type.${evType}`)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {(monthByType[evType] ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-slate-900">
                    {(totalByType[evType] ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}
