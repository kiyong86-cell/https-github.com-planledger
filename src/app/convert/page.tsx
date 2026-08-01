"use client";

import { useRef, useState } from "react";
import Nav from "@/components/Nav";
import { useI18n } from "@/components/LangProvider";
import { trackEvent } from "@/lib/track";

type Status = "idle" | "converting" | "done" | "failed";

export default function ConvertPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleConvert() {
    if (!file) return;
    setStatus("converting");
    try {
      const { convertDocxToHwpx, downloadHwpx } = await import(
        "@/lib/docxToHwpx"
      );
      const { blob } = await convertDocxToHwpx(file);
      downloadHwpx(blob, file.name);
      trackEvent("convert_docx");
      setStatus("done");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">
          {t("convert.title")}
        </h1>
        <p className="mb-6 text-sm text-slate-500">{t("convert.intro")}</p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mb-4 w-full rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500 hover:border-emerald-500 hover:text-emerald-700"
        >
          {file ? (
            <>
              <span className="block text-xs text-slate-400">
                {t("convert.selected")}
              </span>
              <span className="mt-1 block font-medium text-slate-900">
                {file.name}
              </span>
            </>
          ) : (
            <>
              <span className="mb-1 block text-3xl">📄</span>
              {t("convert.pick")}
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setStatus("idle");
          }}
        />

        <button
          onClick={handleConvert}
          disabled={!file || status === "converting"}
          className="w-full rounded-md bg-emerald-600 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "converting"
            ? t("convert.converting")
            : t("convert.button")}
        </button>

        {status === "done" && (
          <p className="mt-3 text-sm text-emerald-700">{t("convert.done")}</p>
        )}
        {status === "failed" && (
          <p className="mt-3 text-sm text-red-600">{t("convert.failed")}</p>
        )}

        <div className="mt-8 space-y-2 rounded-lg border bg-white p-4 text-xs text-slate-500">
          <p>🔒 {t("convert.privacy")}</p>
          <p>ℹ️ {t("convert.limits")}</p>
        </div>
      </main>
    </div>
  );
}
