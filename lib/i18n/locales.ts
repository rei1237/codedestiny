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
    siteName: "Code Destiny",
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

export function localizePath(locale: Locale, routePath: string): string {
  const normalized = normalizePath(routePath);
  const prefix = LOCALE_CONFIG[locale].pathPrefix;
  if (!prefix) return normalized;
  if (normalized === "/") return prefix;
  return `${prefix}${normalized}`;
}
