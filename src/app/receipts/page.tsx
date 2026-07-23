import Nav from "@/components/Nav";
import ReceiptManager from "@/components/ReceiptManager";

export default function ReceiptsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold text-slate-900">영수증 정리</h1>
        <ReceiptManager />
      </main>
    </div>
  );
}
