/** Shared with app/sitemap.ts — single source for public indexable URLs. */

export const BASE_URL = "https://code-destiny.com";

export const LOCALE_PREFIXES = [
  "",
  "/en-us",
  "/ja-jp",
  "/zh-cn",
  "/hi-in",
  "/es-es",
  "/fr-fr",
  "/de-de",
  "/nl-nl",
  "/ms-my",
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

export const ROUTES: SitemapRouteEntry[] = [
  // ── 홈 (최우선) ──────────────────────────────────────────────
  { path: "/", changeFrequency: "daily", priority: 1.0 },

  // ── 핵심 서비스 (직접 사용자 inflow) ─────────────────────────
  { path: "/saju/basic",       changeFrequency: "weekly", priority: 0.95 },
  { path: "/tarot/mingri",     changeFrequency: "weekly", priority: 0.93 },
  { path: "/ziwei/chart",      changeFrequency: "weekly", priority: 0.92 },
  { path: "/astrology/cosmic", changeFrequency: "weekly", priority: 0.92 },
  { path: "/tarot/love",       changeFrequency: "weekly", priority: 0.90 },
  { path: "/tarot/healing",    changeFrequency: "weekly", priority: 0.90 },
  { path: "/oracle/hwatu-life",      changeFrequency: "weekly", priority: 0.88 },
  { path: "/oracle/sikojen-povailu", changeFrequency: "weekly", priority: 0.87 },
  { path: "/saju-picture",           changeFrequency: "weekly", priority: 0.86 },
  { path: "/geomancy-oracle-v4.html", changeFrequency: "weekly", priority: 0.85, noLocale: true },
  { path: "/royal-tea-oracle.html",   changeFrequency: "weekly", priority: 0.84, noLocale: true },

  // ── 콘텐츠 허브 ───────────────────────────────────────────────
  { path: "/insights",    changeFrequency: "weekly", priority: 0.90 },
  { path: "/high-value",  changeFrequency: "weekly", priority: 0.88 },

  // ── High-Value 개별 문서 ──────────────────────────────────────
  { path: "/high-value/complete-guide-to-saju",               changeFrequency: "monthly", priority: 0.82 },
  { path: "/high-value/how-tarot-actually-works",              changeFrequency: "monthly", priority: 0.82 },
  { path: "/high-value/understanding-your-destiny",            changeFrequency: "monthly", priority: 0.82 },
  { path: "/high-value/what-your-birth-date-says-about-you",   changeFrequency: "monthly", priority: 0.80 },
  { path: "/high-value/top-10-signs-of-compatibility",         changeFrequency: "monthly", priority: 0.80 },
  { path: "/high-value/common-user-questions-faq",             changeFrequency: "monthly", priority: 0.80 },
  { path: "/high-value/category/ultimate-guide",               changeFrequency: "monthly", priority: 0.78 },
  { path: "/high-value/category/informational-article",        changeFrequency: "monthly", priority: 0.78 },
  { path: "/high-value/category/faq-page",                     changeFrequency: "monthly", priority: 0.78 },

  // ── 신뢰 & 정책 문서 ────────────────────────────────────────
  { path: "/about",            changeFrequency: "monthly", priority: 0.80 },
  { path: "/methodology",      changeFrequency: "monthly", priority: 0.78 },
  { path: "/faq",              changeFrequency: "monthly", priority: 0.70 },
  { path: "/contact-us",       changeFrequency: "yearly",  priority: 0.55 },
  { path: "/privacy-policy",   changeFrequency: "yearly",  priority: 0.50 },
  { path: "/terms-of-service", changeFrequency: "yearly",  priority: 0.50 },
  { path: "/points",           changeFrequency: "weekly",  priority: 0.50 },
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
