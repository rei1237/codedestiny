export type Locale = "ko" | "ja" | "zh" | "en";

export const LOCALES = ["ko", "ja", "zh", "en"] as const;
export const PUBLIC_LOCALES = ["ja", "zh", "en"] as const;

export const LOCALE_CONFIG: Record<Locale, {
  label: string;
  htmlLang: string;
  pathPrefix: string;
  siteName: string;
  ogLocale: string;
  hrefLang: string;
}> = {
  ko: {
    label: "한국어",
    htmlLang: "ko",
    pathPrefix: "",
    siteName: "Code Destiny | 꿀꿀 만세력",
    ogLocale: "ko_KR",
    hrefLang: "ko",
  },
  ja: {
    label: "日本語",
    htmlLang: "ja-JP",
    pathPrefix: "/ja",
    siteName: "Code Destiny Japan",
    ogLocale: "ja_JP",
    hrefLang: "ja",
  },
  zh: {
    label: "简体中文",
    htmlLang: "zh-CN",
    pathPrefix: "/zh",
    siteName: "Code Destiny 中文",
    ogLocale: "zh_CN",
    hrefLang: "zh-CN",
  },
  en: {
    label: "English",
    htmlLang: "en",
    pathPrefix: "/en",
    siteName: "Code Destiny",
    ogLocale: "en_US",
    hrefLang: "en",
  },
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(String(value || "").toLowerCase());
}

export function toLocale(value?: string): Locale | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  return isLocale(normalized) ? normalized : null;
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
