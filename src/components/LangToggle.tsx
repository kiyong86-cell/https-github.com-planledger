"use client";

import { useI18n } from "./LangProvider";

export default function LangToggle() {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex items-center rounded-md border text-xs">
      <button
        onClick={() => setLang("ko")}
        className={`rounded-l-md px-2 py-1 ${
          lang === "ko"
            ? "bg-slate-900 font-medium text-white"
            : "text-slate-500 hover:text-slate-900"
        }`}
      >
        한국어
      </button>
      <button
        onClick={() => setLang("en")}
        className={`rounded-r-md px-2 py-1 ${
          lang === "en"
            ? "bg-slate-900 font-medium text-white"
            : "text-slate-500 hover:text-slate-900"
        }`}
      >
        EN
      </button>
    </div>
  );
}
