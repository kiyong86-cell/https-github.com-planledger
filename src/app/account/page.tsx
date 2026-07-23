"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { useI18n } from "@/components/LangProvider";
import { createClient } from "@/lib/supabase/client";

export default function AccountPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setEmail(user.email ?? "");
      setName((user.user_metadata?.display_name as string) ?? "");
    })();
  }, [router]);

  async function handleDelete() {
    if (!confirm(t("account.confirm"))) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) throw new Error();
      // 클라이언트 세션도 정리
      await createClient().auth.signOut();
      alert(t("account.deleted"));
      router.push("/login");
      router.refresh();
    } catch {
      setError(t("account.deleteFailed"));
      setDeleting(false);
    }
  }

  const canDelete = confirmText.trim() === t("account.confirmWord");

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">
          {t("account.title")}
        </h1>

        <div className="mb-8 space-y-3 rounded-lg border bg-white p-5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">{t("account.email")}</span>
            <span className="font-medium text-slate-900">{email}</span>
          </div>
          {name && (
            <div className="flex justify-between">
              <span className="text-slate-500">{t("account.name")}</span>
              <span className="font-medium text-slate-900">{name}</span>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="mb-1 text-sm font-semibold text-red-700">
            {t("account.dangerTitle")}
          </h2>
          <p className="mb-3 text-xs text-red-600">{t("account.dangerDesc")}</p>

          <label className="mb-1 block text-xs text-red-700">
            {t("account.confirmType")}
          </label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={t("account.confirmWord")}
            className="mb-3 w-full max-w-xs rounded-md border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
          />

          {error && <p className="mb-2 text-sm text-red-700">{error}</p>}

          <button
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            className="block rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? t("account.deleting") : t("account.deleteBtn")}
          </button>
        </div>
      </main>
    </div>
  );
}
