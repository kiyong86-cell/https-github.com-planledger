import Link from "next/link";
import Nav from "@/components/Nav";
import { listPlans } from "@/lib/backend";
import { getT, getLang } from "@/lib/getLang";

export const dynamic = "force-dynamic";

export default async function BusinessPlanListPage() {
  const plans = await listPlans();
  const { t } = getT();
  const lang = getLang();

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">
            {t("plans.title")}
          </h1>
          <Link
            href="/business-plan/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            {t("plans.new")}
          </Link>
        </div>

        {plans.length > 0 ? (
          <ul className="divide-y rounded-lg border bg-white">
            {plans.map((plan) => (
              <li key={plan.id}>
                <Link
                  href={`/business-plan/${plan.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-900">
                    {plan.title || t("plans.noTitle")}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(plan.updated_at).toLocaleString(
                      lang === "ko" ? "ko-KR" : "en-US"
                    )}{" "}
                    {t("plans.edited")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed bg-white p-10 text-center text-sm text-slate-400">
            {t("plans.empty")}
          </div>
        )}
      </main>
    </div>
  );
}
