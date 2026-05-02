import { redirect } from "next/navigation";

/**
 * Locale roots (/en-us, /ja-jp, …)
 * - 더 이상 로케일별 Next/정적 쉘로 이동하지 않는다.
 * - 메인 서비스 화면(/)에 Google Translate intent만 넘겨 빈 로딩 화면을 방지한다.
 */
const LOCALE_LANG = {
  "de-de": "de",
  "en-us": "en",
  "es-es": "es",
  "fr-fr": "fr",
  "hi-in": "hi",
  "ja-jp": "ja",
  "ms-my": "ms",
  "nl-nl": "nl",
  "zh-cn": "zh-CN",
};

export function createLocaleShellPage(localeSlug) {
  return function LocaleShellPage() {
    const lang = LOCALE_LANG[localeSlug] || "ko";
    redirect(lang === "ko" ? "/" : `/?lang=${encodeURIComponent(lang)}`);
  };
}
