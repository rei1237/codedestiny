/**
 * hreflang 단일 함수. HTML 메타(lib/seo.ts·lib/generate-page-metadata.ts·lib/seo/createI18nMetadata.ts,
 * scripts/build-fortune-hub-shell.mjs)와 사이트맵(scripts/generate-sitemap.mjs)이 이 함수 하나로 같은 집합을 낸다.
 *
 * 규칙(설계 판단 8): 언어마다 대표 코드 1개 + 범위를 넓히는 별칭(간체 zh·zh-Hans, 번체 zh-Hant). x-default 는 한국어 URL.
 * 색인 불가 형제(원장 lib/seo/index-policy.mjs)는 뺀다. 남은 언어가 2개 미만이면 빈 배열이다.
 * Next(TS)와 Node 스크립트가 모두 읽으므로 의존성 없는 ESM 으로 둔다.
 */
import { BRAND_FACTS } from "../brand/brand-facts.mjs";
import { LOCALES, LOCALE_DATA } from "../i18n/locale-data.mjs";
import { isIndexablePath } from "./index-policy.mjs";

export const HREFLANG_CODES = Object.freeze(
  Object.fromEntries(
    ["ko", "ja", "en", "zh", "zh-TW"].map((locale) => [
      locale,
      Object.freeze([LOCALE_DATA[locale].hrefLang, ...LOCALE_DATA[locale].hrefLangAliases]),
    ]),
  ),
);

// 호출 쪽 지도의 키는 로케일 키(zh·zh-TW), 소문자 경로 세그먼트(zh-tw), hreflang 코드(zh-CN·zh-Hant), 옛 표기(ko-KR)가 섞여 있다.
const LOCALE_BY_KEY = new Map(
  LOCALES.flatMap((locale) => {
    const data = LOCALE_DATA[locale];
    return [locale, data.pathPrefix.slice(1), data.hrefLang, ...data.hrefLangAliases, ...data.legacyTags]
      .filter(Boolean)
      .map((key) => [key.toLowerCase(), locale]);
  }),
);

/** 지도 키 → 로케일 키. x-default·모르는 키는 null. */
export function hreflangLocaleKey(key) {
  return LOCALE_BY_KEY.get(String(key || "").trim().toLowerCase()) ?? null;
}

function toHref(pathOrUrl, origin) {
  const raw = String(pathOrUrl || "/").trim();
  let pathname = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      pathname = new URL(raw).pathname || "/";
    } catch {
      pathname = "/";
    }
  }
  const noQuery = pathname.split("?")[0].split("#")[0] || "/";
  const leading = noQuery.startsWith("/") ? noQuery : `/${noQuery}`;
  const trimmed = leading.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  const path = !trimmed ? "/" : /\.[a-z0-9]+$/i.test(trimmed) ? trimmed : `${trimmed}/`;
  return `${origin}${path}`;
}

/**
 * @param {Record<string, string | undefined>} routeByLocale 형제 지도(로케일 → 경로). x-default 키는 무시한다(ko 가 정한다).
 * @param {{ isIndexable?: (path: string) => boolean, origin?: string }} [options]
 * @returns {Array<{ hreflang: string, href: string }>} 순서: ko, ja, zh 묶음, zh-TW 묶음, en, x-default
 */
export function alternatesFor(routeByLocale, options = {}) {
  const isIndexable = options.isIndexable || isIndexablePath;
  const origin = String(options.origin || BRAND_FACTS.service.siteUrl).replace(/\/+$/, "");
  const byLocale = {};
  for (const [key, path] of Object.entries(routeByLocale || {})) {
    const locale = hreflangLocaleKey(key);
    if (!locale || !path || byLocale[locale]) continue;
    byLocale[locale] = path;
  }
  const kept = LOCALES.filter((locale) => byLocale[locale] && isIndexable(byLocale[locale]));
  if (kept.length < 2) return [];
  const list = kept.flatMap((locale) => {
    const href = toHref(byLocale[locale], origin);
    return HREFLANG_CODES[locale].map((hreflang) => ({ hreflang, href }));
  });
  if (kept.includes("ko")) list.push({ hreflang: "x-default", href: toHref(byLocale.ko, origin) });
  return list;
}

/**
 * 홈 hreflang 묶음(2026-11-14 사용자 결정, docs/seo/bundle2-decisions.md §2 A안).
 * 한국어 대표는 사이트 대표 홈 `/` 이고 x-default 도 `/` 다. `/ggulggul/` 은 hreflang 없이 자기 canonical 만 갖는다.
 * 화면 이동용 지도(I18N_ROUTE_MAP.home, ko=/ggulggul)와는 다르다 — 이 묶음은 검색엔진 신호에만 쓴다.
 */
export const HOME_HREFLANG_ROUTES = Object.freeze({ ko: "/", ja: "/ja", zh: "/zh", "zh-TW": "/zh-tw", en: "/en" });

/** Next `alternates.languages` 모양. */
export function toNextLanguages(list) {
  return Object.fromEntries((list || []).map((alt) => [alt.hreflang, alt.href]));
}

/** 한국어 경로 하나에서 로케일 접두사 형제를 만든다. `/fortune/today` → `{ ko, ja: "/ja/fortune/today", … }` */
export function localeSiblings(basePath, locales = LOCALES) {
  const base = String(basePath || "/");
  return Object.fromEntries(
    locales.map((locale) => {
      const prefix = LOCALE_DATA[locale].pathPrefix;
      return [locale, !prefix ? base : base === "/" ? prefix : `${prefix}${base}`];
    }),
  );
}
