"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import BusinessPlanForm from "@/components/BusinessPlanForm";
import { normalizeContent } from "@/lib/businessPlanTemplate";
import { useI18n } from "@/components/LangProvider";
import { getPlan } from "@/lib/planStore";
import { BusinessPlan } from "@/lib/types";

export default function BusinessPlanDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { t } = useI18n();
  const [plan, setPlan] = useState<BusinessPlan | null | "loading">("loading");

  useEffect(() => {
    getPlan(params.id)
      .then(setPlan)
      .catch(() => setPlan(null));
  }, [params.id]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold text-slate-900">
          {t("plans.editTitle")}
        </h1>
        {plan === "loading" ? null : plan === null ? (
          <div className="rounded-lg border border-dashed bg-white p-10 text-center text-sm text-slate-400">
            {t("plans.notFound")}
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-6">
            <BusinessPlanForm
              planId={plan.id}
              initialTitle={plan.title}
              initialContent={normalizeContent(plan.content)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
