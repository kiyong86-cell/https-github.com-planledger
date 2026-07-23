"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { Lang, LANG_COOKIE, translate } from "@/lib/i18n";

type LangCtx = {
  lang: Lang;
  t: (key: string) => string;
  setLang: (lang: Lang) => void;
};

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(initialLang);

  function setLang(next: Lang) {
    setLangState(next);
    // 1년짜리 쿠키로 저장 → 서버 컴포넌트도 같은 언어를 읽는다
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000`;
    router.refresh();
  }

  const t = (key: string) => translate(lang, key);

  return <Ctx.Provider value={{ lang, t, setLang }}>{children}</Ctx.Provider>;
}

export function useI18n(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Provider 밖에서 호출되면 기본 한국어로 안전하게 동작
    return {
      lang: "ko",
      t: (key: string) => translate("ko", key),
      setLang: () => {},
    };
  }
  return ctx;
}
