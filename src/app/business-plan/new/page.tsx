import Nav from "@/components/Nav";
import BusinessPlanForm from "@/components/BusinessPlanForm";
import { emptyContent } from "@/lib/businessPlanTemplate";

export default function NewBusinessPlanPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold text-slate-900">
          새 기획안 작성
        </h1>
        <div className="rounded-lg border bg-white p-6">
          <BusinessPlanForm
            initialTitle="새 기획안"
            initialContent={emptyContent("internal")}
          />
        </div>
      </main>
    </div>
  );
}
