/** Shared with app/sitemap.ts — single source for public indexable URLs. */

import { PSYCHOTESTS } from "./psychotest-catalog";
import { categoryToSlug, publishedCelebritySajuSeeds } from "./famous-saju/celebrity-data";

export const BASE_URL = "https://code-destiny.com";

export const LOCALE_PREFIXES = [
  "",
];

export type SitemapRouteEntry = {
  path: string;
  changeFrequency?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
  /** true면 locale prefix를 붙이지 않음 (정적 HTML 파일 등 단일 언어 전용 경로) */
  noLocale?: boolean;
};

const PSYCHOTEST_ROUTE_ENTRIES: SitemapRouteEntry[] = [
  { path: "/psychotest", changeFrequency: "weekly", priority: 0.89 },
  ...PSYCHOTESTS.map((item) => ({
    path: `/psychotest/${item.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.84,
  })),
];

const FAMOUS_SAJU_CATEGORY_ROUTE_ENTRIES: SitemapRouteEntry[] = Array.from(
  new Set(publishedCelebritySajuSeeds.map((item) => categoryToSlug(item.category))),
).map((slug) => ({
  path: `/famous-saju/category/${slug}`,
  changeFrequency: "weekly" as const,
  priority: 0.72,
}));

const FAMOUS_SAJU_ROUTE_ENTRIES: SitemapRouteEntry[] = [
  { path: "/famous-saju", changeFrequency: "weekly", priority: 0.88 },
  ...FAMOUS_SAJU_CATEGORY_ROUTE_ENTRIES,
];

const FAMOUS_SAJU_INSIGHT_ROUTE_ENTRIES: SitemapRouteEntry[] = [
  { path: "/insights/famous-saju", changeFrequency: "weekly", priority: 0.89 },
  ...publishedCelebritySajuSeeds.map((item) => ({
    path: `/insights/famous-saju/${item.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.78,
  })),
];

export const ROUTES: SitemapRouteEntry[] = [
  // ── 홈 (최우선) ──────────────────────────────────────────────
  { path: "/", changeFrequency: "daily", priority: 1.0 },

  // ── 핵심 SEO 랜딩 페이지 (브랜드/일반 키워드 타겟) ─────────────
  { path: "/saju",          changeFrequency: "daily", priority: 0.98 },
  { path: "/manse",         changeFrequency: "daily", priority: 0.98 },
  { path: "/today",         changeFrequency: "daily", priority: 0.97 },
  { path: "/daily-fortune", changeFrequency: "daily", priority: 0.97 },
  { path: "/compatibility", changeFrequency: "weekly", priority: 0.96 },
  { path: "/saju/compatibility", changeFrequency: "weekly", priority: 0.96 },
  { path: "/tarot",         changeFrequency: "weekly", priority: 0.96 },
  { path: "/tarot/reunion", changeFrequency: "weekly", priority: 0.94 },
  { path: "/tarot/mindscan", changeFrequency: "weekly", priority: 0.94 },
  { path: "/ziwei",         changeFrequency: "weekly", priority: 0.95 },
  { path: "/astrology",     changeFrequency: "weekly", priority: 0.95 },
  { path: "/sukuyo",        changeFrequency: "weekly", priority: 0.94 },
  { path: "/sukuyo/compatibility", changeFrequency: "weekly", priority: 0.93 },
  { path: "/vedic",         changeFrequency: "weekly", priority: 0.94 },
  { path: "/dream",         changeFrequency: "weekly", priority: 0.94 },
  { path: "/love",          changeFrequency: "weekly", priority: 0.94 },
  { path: "/physiognomy",   changeFrequency: "weekly", priority: 0.93 },
  { path: "/premium",       changeFrequency: "weekly", priority: 0.93 },
  { path: "/premium-reports", changeFrequency: "weekly", priority: 0.92 },
  { path: "/pdf/life-book", changeFrequency: "monthly", priority: 0.88 },
  { path: "/pdf/love-report", changeFrequency: "monthly", priority: 0.88 },
  { path: "/pdf/new-year", changeFrequency: "monthly", priority: 0.88 },

  // ── 기존 핵심 서비스 (직접 사용자 inflow) ─────────────────────
  { path: "/saju/basic",       changeFrequency: "weekly", priority: 0.95 },
  { path: "/oracle/sukuyo",    changeFrequency: "weekly", priority: 0.93 },
  { path: "/tarot/mingri",     changeFrequency: "weekly", priority: 0.93 },
  { path: "/vedic/jyotish",    changeFrequency: "weekly", priority: 0.93 },
  { path: "/ziwei/chart",      changeFrequency: "weekly", priority: 0.92 },
  { path: "/astrology/cosmic", changeFrequency: "weekly", priority: 0.92 },
  { path: "/tarot/love",       changeFrequency: "weekly", priority: 0.90 },
  { path: "/tarot/healing",    changeFrequency: "weekly", priority: 0.90 },
  { path: "/oracle/hwatu-life",      changeFrequency: "weekly", priority: 0.88 },
  { path: "/dream/tarot",            changeFrequency: "weekly", priority: 0.88 },
  { path: "/dream/psycho",           changeFrequency: "weekly", priority: 0.88 },
  { path: "/animal/mbti",            changeFrequency: "weekly", priority: 0.87 },
  ...PSYCHOTEST_ROUTE_ENTRIES,
  { path: "/oracle/sikojen-povailu", changeFrequency: "weekly", priority: 0.87 },
  { path: "/saju-picture",           changeFrequency: "weekly", priority: 0.86 },

  // ── 콘텐츠 허브 ───────────────────────────────────────────────
  { path: "/insights",    changeFrequency: "weekly", priority: 0.90 },
  { path: "/insights/saju", changeFrequency: "weekly", priority: 0.86 },
  { path: "/insights/ziwei", changeFrequency: "weekly", priority: 0.89 },
  { path: "/insights/sukuyo", changeFrequency: "weekly", priority: 0.89 },
  { path: "/insights/tarot", changeFrequency: "weekly", priority: 0.85 },
  { path: "/insights/astrology", changeFrequency: "weekly", priority: 0.85 },
  { path: "/insights/vedic", changeFrequency: "weekly", priority: 0.85 },
  { path: "/insights/dream", changeFrequency: "weekly", priority: 0.84 },
  { path: "/insights/compatibility", changeFrequency: "weekly", priority: 0.84 },
  ...FAMOUS_SAJU_INSIGHT_ROUTE_ENTRIES,
  ...FAMOUS_SAJU_ROUTE_ENTRIES,
  { path: "/high-value",  changeFrequency: "weekly", priority: 0.88 },

  // ── High-Value 개별 문서 ──────────────────────────────────────
  { path: "/high-value/complete-guide-to-saju",               changeFrequency: "monthly", priority: 0.82 },
  { path: "/high-value/how-tarot-actually-works",              changeFrequency: "monthly", priority: 0.82 },
  { path: "/high-value/understanding-your-destiny",            changeFrequency: "monthly", priority: 0.82 },
  { path: "/high-value/what-your-birth-date-says-about-you",   changeFrequency: "monthly", priority: 0.80 },
  { path: "/high-value/top-10-signs-of-compatibility",         changeFrequency: "monthly", priority: 0.80 },
  { path: "/high-value/common-user-questions-faq",             changeFrequency: "monthly", priority: 0.80 },
  { path: "/high-value/category/saju-beginner",                changeFrequency: "monthly", priority: 0.78 },
  { path: "/high-value/category/tarot-reading",                changeFrequency: "monthly", priority: 0.78 },
  { path: "/high-value/category/compatibility-relationship",   changeFrequency: "monthly", priority: 0.78 },
  { path: "/high-value/category/daily-fortune",                changeFrequency: "monthly", priority: 0.78 },
  { path: "/high-value/category/astrology-ziwei",              changeFrequency: "monthly", priority: 0.78 },
  { path: "/high-value/category/methodology",                  changeFrequency: "monthly", priority: 0.78 },

  // ── 신뢰 & 정책 문서 ────────────────────────────────────────
  { path: "/about",            changeFrequency: "monthly", priority: 0.80 },
  { path: "/methodology",      changeFrequency: "monthly", priority: 0.78 },
  { path: "/faq",              changeFrequency: "monthly", priority: 0.70 },
  { path: "/contact",          changeFrequency: "yearly",  priority: 0.58 },
  { path: "/privacy",          changeFrequency: "yearly",  priority: 0.56 },
  { path: "/terms",            changeFrequency: "yearly",  priority: 0.56 },
  { path: "/disclaimer",       changeFrequency: "yearly",  priority: 0.54 },
  { path: "/advertising-policy", changeFrequency: "yearly", priority: 0.54 },
];

export function getAllSitemapUrls(): string[] {
  const urls: string[] = [];
  for (const route of ROUTES) {
    const prefixes = route.noLocale ? [""] : LOCALE_PREFIXES;
    for (const prefix of prefixes) {
      const localizedPath = prefix
        ? `${prefix}${route.path === "/" ? "" : route.path}`
        : route.path;
      urls.push(new URL(localizedPath, BASE_URL).toString());
    }
  }
  return urls;
}
