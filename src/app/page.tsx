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
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-semibold leading-snug text-slate-900 sm:text-3xl">
          {t("home.hook1")}
          <br />
          {t("home.hook2")}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">
          {t("home.subtitle")}
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col rounded-lg border bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">
              {t("home.card1.title")}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
              {t("home.card1.body")}
            </p>
            <Link
              href="/business-plan/new"
              className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-700"
            >
              {t("home.card1.cta")}
            </Link>
          </div>

          <div className="flex flex-col rounded-lg border bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">
              {t("home.card2.title")}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
              {t("home.card2.body")}
            </p>
            <Link
              href="/convert"
              className="mt-4 inline-block rounded-md border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              {t("home.card2.cta")}
            </Link>
          </div>
        </div>

        {planCount !== null && planCount > 0 && (
          <Link
            href="/business-plan"
            className="mt-4 flex items-center justify-between rounded-lg border bg-white px-6 py-4 hover:border-slate-400"
          >
            <span className="text-sm text-slate-600">
              {t("home.myPlans")}{" "}
              <span className="font-semibold text-slate-900">
                {planCount}
                {t("home.count")}
              </span>
            </span>
            <span className="text-sm text-slate-400">
              {t("home.plansHint")}
            </span>
          </Link>
        )}

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
