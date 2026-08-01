"use client";

import { useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useI18n } from "@/components/LangProvider";

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT || "kiyong0263@naver.com";

export default function ContactPage() {
  const { t } = useI18n();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject || "[PlanLedger] 문의"
    )}&body=${encodeURIComponent(message)}`;
    window.location.href = href;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">
          {t("contact.title")}
        </h1>
        <p className="mb-6 text-sm text-slate-500">{t("contact.intro")}</p>

        <div className="mb-6 rounded-lg border bg-white p-4 text-sm">
          <span className="text-slate-500">{t("contact.emailLabel")}: </span>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-emerald-700 underline"
          >
            {CONTACT_EMAIL}
          </a>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-700">
              {t("contact.subject")}
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("contact.subjectPlaceholder")}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">
              {t("contact.message")}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder={t("contact.messagePlaceholder")}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            {t("contact.send")}
          </button>
        </form>
        <p className="mt-3 text-xs text-slate-400">{t("contact.note")}</p>

        <div className="mt-8">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
            {t("common.toHome")}
          </Link>
        </div>
      </main>
    </div>
  );
}
