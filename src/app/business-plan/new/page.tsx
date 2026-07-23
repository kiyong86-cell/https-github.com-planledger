import Nav from "@/components/Nav";
import BusinessPlanForm from "@/components/BusinessPlanForm";
import { emptyContent } from "@/lib/businessPlanTemplate";
import { getT, getLang } from "@/lib/getLang";

export const dynamic = "force-dynamic";

export default function NewBusinessPlanPage() {
  const { t } = getT();
  const lang = getLang();
  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold text-slate-900">
          {t("plans.newTitle")}
        </h1>
        <div className="rounded-lg border bg-white p-6">
          <BusinessPlanForm
            initialTitle={t("plans.defaultTitle")}
            initialContent={emptyContent("internal", lang)}
          />
        </div>
      </main>
    </div>
  );
}
