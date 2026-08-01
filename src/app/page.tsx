"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useI18n } from "@/components/LangProvider";
import { getCurrentUser, listPlans } from "@/lib/planStore";

const CLOUD_ENABLED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export default function HomePage() {
  const { t } = useI18n();
  const [planCount, setPlanCount] = useState<number | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => setLoggedIn(Boolean(u)));
    listPlans()
      .then((p) => setPlanCount(p.length))
      .catch(() => setPlanCount(0));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">
          {t("home.greeting")}
        </h1>
        <p className="mb-8 text-sm text-slate-500">{t("home.subtitle")}</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/business-plan"
            className="rounded-lg border bg-white p-6 hover:border-slate-400"
          >
            <p className="text-sm text-slate-500">{t("home.myPlans")}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {planCount ?? "–"}
              {t("home.count")}
            </p>
            <p className="mt-2 text-sm text-slate-400">{t("home.plansHint")}</p>
          </Link>

          <Link
            href="/business-plan/new"
            className="rounded-lg border bg-white p-6 hover:border-slate-400"
          >
            <p className="text-sm text-slate-500">{t("home.createNew")}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {t("home.newDoc")}
            </p>
            <p className="mt-2 text-sm text-slate-400">{t("home.createHint")}</p>
          </Link>
        </div>

        <p className="mt-8 text-xs text-slate-400">{t("home.noSignup")}</p>
        {CLOUD_ENABLED && !loggedIn && (
          <p className="mt-1 text-xs text-slate-400">
            <Link href="/login" className="text-emerald-700 underline">
              {t("auth.loginToSync")}
            </Link>
          </p>
        )}
      </main>
    </div>
  );
}
