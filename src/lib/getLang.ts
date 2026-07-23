import { cookies } from "next/headers";
import { DEFAULT_LANG, isLang, Lang, LANG_COOKIE, translate } from "./i18n";

// 서버 컴포넌트에서 현재 언어를 읽는다 (쿠키 기반).
export function getLang(): Lang {
  const value = cookies().get(LANG_COOKIE)?.value;
  return isLang(value) ? value : DEFAULT_LANG;
}

// 서버 컴포넌트용 번역 헬퍼
export function getT(): { lang: Lang; t: (key: string) => string } {
  const lang = getLang();
  return { lang, t: (key: string) => translate(lang, key) };
}
