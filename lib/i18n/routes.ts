import { LOCALE_CONFIG, LOCALES, Locale, LOCALE_NAVIGATION_LOCALES } from "./locales";

export const I18N_ROUTE_KEYS = [
  "home",
  "ziwei",
  "sukuyo",
  "today",
  "insights",
  "insightZiweiBasics",
  "insightSukuyoBasics",
] as const;

export type I18nRouteKey = (typeof I18N_ROUTE_KEYS)[number];

export const I18N_ROUTE_MAP: Record<I18nRouteKey, Record<Locale, string>> = {
  home: {
    ko: "/",
    ja: "/ja",
    zh: "/zh",
    "zh-TW": "/zh-tw",
    en: "/en",
  },
  ziwei: {
    ko: "/ziwei",
    ja: "/ja/ziwei",
    zh: "/zh/ziwei",
    "zh-TW": "/zh-tw/ziwei",
    en: "/en/ziwei",
  },
  sukuyo: {
    ko: "/sukuyo",
    ja: "/ja/sukuyo",
    zh: "/zh/sukuyo",
    "zh-TW": "/zh-tw/sukuyo",
    en: "/en/sukuyo",
  },
  today: {
    ko: "/today",
    ja: "/ja/today",
    zh: "/zh/today",
    "zh-TW": "/zh-tw/today",
    en: "/en/today",
  },
  insights: {
    ko: "/insights",
    ja: "/ja/insights",
    zh: "/zh/insights",
    "zh-TW": "/zh-tw/insights",
    en: "/en/insights",
  },
  insightZiweiBasics: {
    ko: "/insights/ziwei-basics",
    ja: "/ja/insights/ziwei-basics-jp",
    zh: "/zh/insights/ziwei-basics-zh",
    "zh-TW": "/zh-tw/insights/ziwei-basics-tw",
    en: "/en/insights/ziwei-basics-en",
  },
  insightSukuyoBasics: {
    ko: "/insights/sukuyo-basics",
    ja: "/ja/insights/sukuyo-basics-jp",
    zh: "/zh/insights/sukuyo-basics-zh",
    "zh-TW": "/zh-tw/insights/sukuyo-basics-tw",
    en: "/en/insights/sukuyo-basics-en",
  },
};

export function getLocalizedRoute(routeKey: I18nRouteKey, locale: Locale): string {
  return I18N_ROUTE_MAP[routeKey][locale];
}

export function getAlternatesByRouteKey(routeKey: I18nRouteKey): Record<Locale, string> {
  return I18N_ROUTE_MAP[routeKey];
}

export function getRouteKeyByLocalizedPath(pathname: string): I18nRouteKey | null {
  const normalized = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  for (const routeKey of I18N_ROUTE_KEYS) {
    const routes = I18N_ROUTE_MAP[routeKey];
    for (const locale of LOCALES) {
      const candidate = routes[locale];
      if (normalized === candidate) return routeKey;
    }
  }
  return null;
}

export function getLocaleLinksForRoute(routeKey: I18nRouteKey) {
  return LOCALE_NAVIGATION_LOCALES.map((locale) => ({
    locale,
    href: I18N_ROUTE_MAP[routeKey][locale],
    hrefLang: LOCALE_CONFIG[locale].hrefLang,
    label: LOCALE_CONFIG[locale].label,
  }));
}
