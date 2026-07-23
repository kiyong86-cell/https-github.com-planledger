import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import BusinessPlanForm from "@/components/BusinessPlanForm";
import { getPlan } from "@/lib/backend";
import { normalizeContent } from "@/lib/businessPlanTemplate";
import { getT } from "@/lib/getLang";

export const dynamic = "force-dynamic";

export default async function BusinessPlanDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const plan = await getPlan(params.id);

  if (!plan) {
    notFound();
  }

  const { t } = getT();

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold text-slate-900">
          {t("plans.editTitle")}
        </h1>
        <div className="rounded-lg border bg-white p-6">
          <BusinessPlanForm
            planId={plan.id}
            initialTitle={plan.title}
            initialContent={normalizeContent(plan.content)}
          />
        </div>
      </main>
    </div>
  );
}
