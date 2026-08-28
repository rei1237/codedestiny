export type Locale = "ko" | "ja" | "zh" | "zh-TW" | "en";

export const LOCALES = ["ko", "ja", "zh", "zh-TW", "en"] as const;
export const PUBLIC_LOCALES = ["ja", "zh", "zh-TW", "en"] as const;
// 2026-07: 일본 오가닉 유입 확보를 위해 다국어 색인 개방.
// 2026-08: 대만 번체(zh-TW)를 zh(중국 간체)와 분리된 별도 로케일로 개방.
// ja/zh/zh-TW/en SSR 페이지(app/[locale]/*)는 네이티브 품질 번역이 완료된 상태
// (lib/seo/i18nKeywords.ts, lib/seo/i18nInsights.ts 참고).
export const SEO_INDEXABLE_LOCALES = ["ko", "ja", "zh", "zh-TW", "en"] as const;
export const LOCALE_NAVIGATION_LOCALES = LOCALES;

const LOCALE_LABELS_TEXT_TRANSLATIONS = {
  ko: "한국어",
  ja: "日本語",
  zh: "中文(简体)",
  "zh-TW": "中文(繁體)",
  en: "English",
} as const;

export const LOCALE_CONFIG: Record<Locale, {
  label: string;
  htmlLang: string;
  pathPrefix: string;
  siteName: string;
  ogLocale: string;
  hrefLang: string;
  hrefLangAliases?: string[];
}> = {
  ko: {
    label: LOCALE_LABELS_TEXT_TRANSLATIONS.ko,
    htmlLang: "ko",
    pathPrefix: "",
    siteName: "꿀꿀 운세",
    ogLocale: "ko_KR",
    hrefLang: "ko",
    hrefLangAliases: ["ko-KR"],
  },
  ja: {
    label: LOCALE_LABELS_TEXT_TRANSLATIONS.ja,
    htmlLang: "ja-JP",
    pathPrefix: "/ja",
    siteName: "Code Destiny Japan",
    ogLocale: "ja_JP",
    hrefLang: "ja",
    hrefLangAliases: ["ja-JP"],
  },
  zh: {
    label: LOCALE_LABELS_TEXT_TRANSLATIONS.zh,
    htmlLang: "zh-CN",
    pathPrefix: "/zh",
    siteName: "Code Destiny China",
    ogLocale: "zh_CN",
    hrefLang: "zh-CN",
    hrefLangAliases: ["zh", "zh-Hans"],
  },
  "zh-TW": {
    label: LOCALE_LABELS_TEXT_TRANSLATIONS["zh-TW"],
    htmlLang: "zh-TW",
    pathPrefix: "/zh-tw",
    siteName: "Code Destiny Taiwan",
    ogLocale: "zh_TW",
    hrefLang: "zh-TW",
    hrefLangAliases: ["zh-Hant"],
  },
  en: {
    label: LOCALE_LABELS_TEXT_TRANSLATIONS.en,
    htmlLang: "en",
    pathPrefix: "/en",
    siteName: "Code Destiny",
    ogLocale: "en_US",
    hrefLang: "en",
    hrefLangAliases: ["en-US"],
  },
};

export function isLocale(value: string): value is Locale {
  const normalized = String(value || "").toLowerCase();
  return (LOCALES as readonly string[]).some((locale) => locale.toLowerCase() === normalized);
}

export function toLocale(value?: string): Locale | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (!isLocale(normalized)) return null;
  return (LOCALES as readonly string[]).find((locale) => locale.toLowerCase() === normalized) as Locale;
}

export function normalizePath(path: string): string {
  const raw = String(path || "/").trim();
  if (!raw) return "/";
  const noQuery = raw.split("?")[0].split("#")[0] || "/";
  const withSlash = noQuery.startsWith("/") ? noQuery : `/${noQuery}`;
  if (withSlash === "/") return "/";
  return withSlash.replace(/\/+$/, "") || "/";
}

/**
 * app/[locale]/**\/page.js 의 generateStaticParams() 전용.
 *
 * 🔴 `PUBLIC_LOCALES` 의 원소를 그대로 `{ locale }` 로 반환하지 말 것 — Next.js 정적
 * export 는 그 문자열을 URL 세그먼트 그대로 쓴다. "zh-TW" 는 대문자 T/W 를 포함하는데
 * pathPrefix/sitemap/canonical 은 전부 소문자 "/zh-tw" 다. Windows(NTFS)는 경로 조회가
 * 대소문자 무관이라 로컬 빌드에서는 안 걸리지만, Linux CI 러너(대소문자 구분 파일시스템)
 * 에서는 실제 산출물이 /zh-TW/... 에 있고 sitemap 은 /zh-tw/... 를 가리켜 404 로 잡힌다
 * (verify-adsense-readiness.mjs: "sitemap route has no generated artifact").
 * 이 함수로 만든 소문자 세그먼트를 쓰면 산출물 경로와 sitemap 이 항상 일치하고,
 * 페이지 쪽 resolveLocale()/toLocale() 이 대소문자 무관 매칭이라 되돌아 정상 인식된다.
 */
export function localeUrlSegment(locale: Locale): string {
  return LOCALE_CONFIG[locale].pathPrefix.replace(/^\//, "");
}

/**
 * 로케일 URL 프리픽스 전량. 🔴 손으로 열거하지 말고 `LOCALE_CONFIG` 에서 **파생**한다 —
 * 같은 목록이 두 곳에 있으면 어긋났을 때 로케일 푸터가 중복되거나 통째로 사라진다
 * (`AppChrome` 의 스킵 판정과 `app/[locale]/layout.js` 의 커버리지가 이 하나를 공유한다).
 * ko 는 `pathPrefix` 가 빈 문자열이라 자연히 빠진다.
 */
export const LOCALE_ROUTE_PREFIXES: string[] = LOCALES
  .map((locale) => LOCALE_CONFIG[locale].pathPrefix)
  .filter((prefix) => prefix.length > 0);

/**
 * 경로가 로케일 프리픽스 아래인지 판정하고 그 로케일을 돌려준다. 아니면 null(= 한국어 기본).
 * `/january` 가 `/ja` 로 오인되지 않도록 **정확히 프리픽스이거나 그 다음이 `/`** 인 경우만 매칭한다.
 * 더 긴 프리픽스(`/zh-tw`)를 먼저 보므로 `/zh` 가 `/zh-tw/...` 를 가로채지 않는다.
 */
export function localeFromPathname(pathname: string): Locale | null {
  const path = normalizePath(pathname);
  const matched = LOCALES
    .filter((locale) => LOCALE_CONFIG[locale].pathPrefix.length > 0)
    .sort((a, b) => LOCALE_CONFIG[b].pathPrefix.length - LOCALE_CONFIG[a].pathPrefix.length)
    .find((locale) => {
      const prefix = LOCALE_CONFIG[locale].pathPrefix;
      return path === prefix || path.startsWith(`${prefix}/`);
    });
  return matched ?? null;
}

export function localizePath(locale: Locale, routePath: string): string {
  const normalized = normalizePath(routePath);
  const prefix = LOCALE_CONFIG[locale].pathPrefix;
  if (!prefix) return normalized;
  if (normalized === "/") return prefix;
  return `${prefix}${normalized}`;
}
