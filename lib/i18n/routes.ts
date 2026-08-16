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

/**
 * 약관·정책 페이지의 로케일별 URL. `I18N_ROUTE_MAP` 과 분리한 이유는 refund-policy 에 ko 전용 URL 이
 * 없어(실질 내용은 /terms 12조) `Record<Locale, string>` 를 만족하지 못하기 때문이다.
 *
 * 🔴 이 표는 `scripts/generate-sitemap.mjs` 의 `i18nRouteGroups` 마지막 3개 그룹과 **같은 값이어야 한다.**
 * HTML 의 hreflang 과 사이트맵의 `xhtml:link` 가 어긋나면 Google 은 그 쌍을 통째로 버린다.
 * 2026-08-16 이전에는 실제로 어긋나 있었다 — HTML 쪽에 `zh-TW` 가 아예 없어서 `/zh-tw/**` 정책 페이지가
 * 자기 자신을 hreflang 집합에 포함하지 못했고(자기참조 누락 = 전체 무시), `x-default` 는
 * `/privacy-policy`·`/terms-of-service` 를 가리켰는데 그 두 URL 은 각각 `/privacy`·`/terms` 로
 * canonical 되는 별칭이라 "hreflang 대상이 비정본" 조건에도 걸렸다.
 *
 * ko 가 짧은 별칭(`/privacy`·`/terms`)인 것도 사이트맵과 같은 이유다 — 두 URL 이 같은 컴포넌트를 렌더해
 * title/description 이 동일하므로 사이트맵에 둘 다 넣으면 중복 title 검사에 걸린다.
 */
export const I18N_POLICY_ROUTE_MAP = {
  privacy: {
    ko: "/privacy",
    ja: "/ja/privacy-policy",
    zh: "/zh/privacy-policy",
    "zh-TW": "/zh-tw/privacy-policy",
    en: "/en/privacy-policy",
    "x-default": "/privacy",
  },
  terms: {
    ko: "/terms",
    ja: "/ja/terms-of-service",
    zh: "/zh/terms-of-service",
    "zh-TW": "/zh-tw/terms-of-service",
    en: "/en/terms-of-service",
    "x-default": "/terms",
  },
  refundPolicy: {
    ja: "/ja/refund-policy",
    zh: "/zh/refund-policy",
    "zh-TW": "/zh-tw/refund-policy",
    en: "/en/refund-policy",
    // ko 전용 URL 이 없어 사이트맵의 buildI18nAlternates 도 이 그룹만 "/" 로 폴백한다.
    "x-default": "/",
  },
} as const;

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
