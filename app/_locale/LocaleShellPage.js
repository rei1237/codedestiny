import { redirect } from "next/navigation";

/**
 * Locale roots (/en-us, /ja-jp, …)
 * - 한국어 경로(/static/index.html)로 강제 통합하지 않는다.
 * - 각 로케일은 해당 로케일의 정적 메인 UI(/xx-xx/index.html)로 이동한다.
 */
export function createLocaleShellPage(localeSlug) {
  return function LocaleShellPage() {
    redirect(`/${localeSlug}/index.html`);
  };
}

