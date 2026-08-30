/** Shared with app/sitemap.ts — single source for public indexable URLs. */

import { PSYCHOTESTS } from "./psychotest-catalog";
import { publishedCelebritySajuSeeds } from "./famous-saju/celebrity-data";
import { isNoindexPath } from "./seo/siteSeo";

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

// `/famous-saju` 허브와 카테고리 12개는 2026-08-17 에 라우트째 삭제하고 `public/_redirects`
// 로 `/insights/famous-saju/` 에 접었다. 정본은 아래 INSIGHT 항목 하나뿐이다.
const FAMOUS_SAJU_INSIGHT_ROUTE_ENTRIES: SitemapRouteEntry[] = [
  { path: "/insights/famous-saju", changeFrequency: "weekly", priority: 0.89 },
  ...publishedCelebritySajuSeeds.map((item) => ({
    path: `/insights/famous-saju/${item.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.78,
  })),
];

const ROUTE_CANDIDATES: SitemapRouteEntry[] = [
  // ── 홈 (최우선) ──────────────────────────────────────────────
  { path: "/", changeFrequency: "daily", priority: 1.0 },

  // ── 핵심 SEO 랜딩 페이지 (브랜드/일반 키워드 타겟) ─────────────
  { path: "/kkul-kkul-unse", changeFrequency: "weekly", priority: 0.99 },
  { path: "/saju",          changeFrequency: "daily", priority: 0.98 },
  { path: "/saju/guide",    changeFrequency: "monthly", priority: 0.90 },
  { path: "/saju/ten-gods", changeFrequency: "monthly", priority: 0.89 },
  { path: "/saju/five-elements", changeFrequency: "monthly", priority: 0.89 },
  { path: "/health-report/guide", changeFrequency: "monthly", priority: 0.87 },
  { path: "/manse",         changeFrequency: "daily", priority: 0.98 },
  { path: "/today",         changeFrequency: "daily", priority: 0.97 },
  { path: "/calendar/guide", changeFrequency: "monthly", priority: 0.88 },
  { path: "/compatibility", changeFrequency: "weekly", priority: 0.96 },
  { path: "/saju/compatibility", changeFrequency: "weekly", priority: 0.96 },
  { path: "/tarot",         changeFrequency: "weekly", priority: 0.96 },
  { path: "/tarot/guide",   changeFrequency: "monthly", priority: 0.90 },
  { path: "/tarot/numerology", changeFrequency: "weekly", priority: 0.88 },
  { path: "/tarot/prompt-maker", changeFrequency: "weekly", priority: 0.86 },
  { path: "/tarot/reunion", changeFrequency: "weekly", priority: 0.94 },
  { path: "/tarot/mindscan", changeFrequency: "weekly", priority: 0.94 },
  { path: "/ziwei",         changeFrequency: "weekly", priority: 0.95 },
  { path: "/ziwei/guide",   changeFrequency: "monthly", priority: 0.89 },
  { path: "/astrology",     changeFrequency: "weekly", priority: 0.95 },
  { path: "/astrology/guide", changeFrequency: "monthly", priority: 0.89 },
  { path: "/sukuyo",        changeFrequency: "weekly", priority: 0.94 },
  { path: "/sukuyo/guide",  changeFrequency: "monthly", priority: 0.89 },
  { path: "/sukuyo/compatibility", changeFrequency: "weekly", priority: 0.93 },
  { path: "/vedic",         changeFrequency: "weekly", priority: 0.94 },
  { path: "/vedic/guide",   changeFrequency: "monthly", priority: 0.89 },
  { path: "/mayan-calendar/guide", changeFrequency: "monthly", priority: 0.88 },
  { path: "/music/guide",   changeFrequency: "monthly", priority: 0.86 },
  { path: "/fortune-tea-house", changeFrequency: "weekly", priority: 0.86 },
  { path: "/master-love-codex", changeFrequency: "monthly", priority: 0.9 },
  { path: "/yeon-star-hug", changeFrequency: "weekly", priority: 0.84 },
  { path: "/dream",         changeFrequency: "weekly", priority: 0.94 },
  { path: "/love",          changeFrequency: "weekly", priority: 0.94 },
  { path: "/physiognomy",   changeFrequency: "weekly", priority: 0.93 },
  { path: "/sukuyo-compatibility-ai", changeFrequency: "monthly", priority: 0.87 },
  // ── 기존 핵심 서비스 (직접 사용자 inflow) ─────────────────────
  { path: "/life-book-ai",     changeFrequency: "weekly", priority: 0.94 },
  { path: "/saju/basic",       changeFrequency: "weekly", priority: 0.95 },
  { path: "/saju/sibyl",       changeFrequency: "weekly", priority: 0.90 },
  { path: "/saju/love-simulation", changeFrequency: "weekly", priority: 0.90 },
  { path: "/saju/animal-destiny", changeFrequency: "weekly", priority: 0.90 },
  { path: "/saju/destiny-meeting-place", changeFrequency: "weekly", priority: 0.90 },
  { path: "/ziwei/chart",      changeFrequency: "weekly", priority: 0.92 },
  { path: "/oracle/sukuyo",    changeFrequency: "weekly", priority: 0.93 },
  { path: "/oracle/hwatu",     changeFrequency: "weekly", priority: 0.90 },
  { path: "/oracle/juyuk",     changeFrequency: "weekly", priority: 0.90 },
  { path: "/ifa-oracle.html",  changeFrequency: "weekly", priority: 0.90, noLocale: true },
  { path: "/tarot/mingri",     changeFrequency: "weekly", priority: 0.93 },
  { path: "/vedic/jyotish",    changeFrequency: "weekly", priority: 0.93 },
  { path: "/astrology/cosmic", changeFrequency: "weekly", priority: 0.92 },
  { path: "/tarot/love",       changeFrequency: "weekly", priority: 0.90 },
  { path: "/tarot/self-esteem", changeFrequency: "weekly", priority: 0.90 },
  { path: "/tarot/year",       changeFrequency: "weekly", priority: 0.90 },
  { path: "/oracle/hwatu-life",      changeFrequency: "weekly", priority: 0.88 },
  { path: "/dream/tarot",            changeFrequency: "weekly", priority: 0.88 },
  { path: "/dream/psycho",           changeFrequency: "weekly", priority: 0.88 },
  { path: "/animal/mbti",            changeFrequency: "weekly", priority: 0.87 },
  ...PSYCHOTEST_ROUTE_ENTRIES,

  // ── 콘텐츠 허브 ───────────────────────────────────────────────
  { path: "/insights",    changeFrequency: "weekly", priority: 0.90 },
  { path: "/insights/saju", changeFrequency: "weekly", priority: 0.86 },
  { path: "/insights/ziwei", changeFrequency: "weekly", priority: 0.89 },
  { path: "/insights/ziwei-basics", changeFrequency: "monthly", priority: 0.83 },
  { path: "/insights/sukuyo", changeFrequency: "weekly", priority: 0.89 },
  { path: "/insights/sukuyo-basics", changeFrequency: "monthly", priority: 0.83 },
  { path: "/insights/tarot", changeFrequency: "weekly", priority: 0.85 },
  { path: "/insights/astrology", changeFrequency: "weekly", priority: 0.85 },
  { path: "/insights/vedic", changeFrequency: "weekly", priority: 0.85 },
  { path: "/insights/dream", changeFrequency: "weekly", priority: 0.84 },
  { path: "/insights/compatibility", changeFrequency: "weekly", priority: 0.84 },
  ...FAMOUS_SAJU_INSIGHT_ROUTE_ENTRIES,
  { path: "/guides",  changeFrequency: "weekly", priority: 0.88 },

  // ── High-Value 개별 문서 ──────────────────────────────────────
  { path: "/guides/complete-guide-to-saju",               changeFrequency: "monthly", priority: 0.82 },
  { path: "/guides/how-tarot-actually-works",              changeFrequency: "monthly", priority: 0.82 },
  { path: "/guides/understanding-your-destiny",            changeFrequency: "monthly", priority: 0.82 },
  { path: "/guides/what-your-birth-date-says-about-you",   changeFrequency: "monthly", priority: 0.80 },
  { path: "/guides/top-10-signs-of-compatibility",         changeFrequency: "monthly", priority: 0.80 },
  { path: "/guides/common-user-questions-faq",             changeFrequency: "monthly", priority: 0.80 },
  { path: "/guides/category/saju-beginner",                changeFrequency: "monthly", priority: 0.78 },
  { path: "/guides/category/tarot-reading",                changeFrequency: "monthly", priority: 0.78 },
  { path: "/guides/category/compatibility-relationship",   changeFrequency: "monthly", priority: 0.78 },
  { path: "/guides/category/daily-fortune",                changeFrequency: "monthly", priority: 0.78 },
  { path: "/guides/category/astrology-ziwei",              changeFrequency: "monthly", priority: 0.78 },
  { path: "/guides/category/methodology",                  changeFrequency: "monthly", priority: 0.78 },

  // ── 신뢰 & 정책 문서 ────────────────────────────────────────
  { path: "/about",            changeFrequency: "monthly", priority: 0.80 },
  { path: "/methodology",      changeFrequency: "monthly", priority: 0.78 },
  { path: "/faq",              changeFrequency: "monthly", priority: 0.70 },
  { path: "/contact",          changeFrequency: "yearly",  priority: 0.58 },
  { path: "/privacy",          changeFrequency: "yearly",  priority: 0.56 },
  { path: "/terms",            changeFrequency: "yearly",  priority: 0.56 },
  { path: "/disclaimer",       changeFrequency: "yearly",  priority: 0.54 },
  { path: "/advertising-policy", changeFrequency: "yearly", priority: 0.54 },
  { path: "/editorial-policy", changeFrequency: "yearly", priority: 0.54 },
];

export const ROUTES: SitemapRouteEntry[] = ROUTE_CANDIDATES.filter(
  (route) => route.path !== "/account/delete" && !isNoindexPath(route.path),
);

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
