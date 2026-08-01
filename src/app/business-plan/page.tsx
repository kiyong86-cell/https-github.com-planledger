"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useI18n } from "@/components/LangProvider";
import { getCurrentUser, listPlans } from "@/lib/planStore";
import { BusinessPlan } from "@/lib/types";

type PlanRow = Pick<BusinessPlan, "id" | "title" | "updated_at">;

const CLOUD_ENABLED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export default function BusinessPlanListPage() {
  const { t, lang } = useI18n();
  const [plans, setPlans] = useState<PlanRow[] | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => setLoggedIn(Boolean(u)));
    listPlans()
      .then(setPlans)
      .catch(() => setPlans([]));
  }, []);

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

        {plans === null ? null : plans.length > 0 ? (
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

        <p className="mt-4 text-xs text-slate-400">
          {loggedIn ? (
            t("auth.savedToAccount")
          ) : (
            <>
              {t("auth.savedToBrowser")}{" "}
              {CLOUD_ENABLED && (
                <Link href="/login" className="text-emerald-700 underline">
                  {t("auth.loginToSync")}
                </Link>
              )}
            </>
          )}
        </p>
      </main>
    </div>
  );
}
