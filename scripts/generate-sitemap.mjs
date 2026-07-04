import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { STATIC_CANONICAL_ROUTES } from "./static-canonical-route-map.mjs";

const rootDir = process.cwd();
const sitemapRootPath = resolve(rootDir, "sitemap.xml");
const sitemapPublicPath = resolve(rootDir, "public", "sitemap.xml");
const insightsSourcePath = resolve(rootDir, "app", "insights", "articles.js");
const insightsAdsenseReadySourcePath = resolve(rootDir, "app", "insights", "adsense-ready-articles.js");
const insightsSeoGrowthSourcePath = resolve(rootDir, "app", "insights", "seo-growth-articles.js");
const highValueSourcePath = resolve(rootDir, "app", "high-value", "content.js");
const famousSajuSourcePath = resolve(rootDir, "lib", "famous-saju", "celebrity-data.ts");
const psychotestSourcePath = resolve(rootDir, "lib", "psychotest-catalog.ts");
const siteBaseUrl = (process.env.SITE_URL || "https://code-destiny.com").replace(/\/$/, "");
const insightsApiBase = (process.env.INSIGHTS_API_BASE_URL || process.env.SITE_URL || "https://code-destiny.com").replace(/\/$/, "");
const useInsightsApi = String(process.env.SITEMAP_USE_INSIGHTS_API || "").toLowerCase() === "1";
const today = new Date().toISOString().slice(0, 10);
// public/_headers 의 X-Robots-Tag: noindex 정책과 동기화 유지할 것.
// noindex 경로를 사이트맵에 넣으면 GSC/네이버에서 "제출된 URL에 noindex" 오류가 난다.
const noindexPathPrefixes = [
  "/animal/physio",
  "/maya",
  "/oracle/royal-tea",
  "/oracle/sikojen-povailu",
  "/palm-reading",
  "/pdf",
  "/premium",
  "/premium-reports",
  "/saju/destiny-bias",
  "/saju/love-simulation",
  "/saju-fpti",
  "/saju-guardian",
  "/saju-picture",
  "/sukuyo/calendar",
  "/tarot/year",
  "/tarot/healing",
  "/ziwei/chart",
  "/blog",
  "/famous",
  "/fortune/sikojen-povailu",
];
const privateRoutePatterns = [
  /^\/api(?:\/|$)/,
  /^\/admin(?:\/|$)/,
  /^\/auth(?:\/|$)/,
  /^\/login(?:\/|$)/,
  /^\/signup(?:\/|$)/,
  /^\/me(?:\/|$)/,
  /^\/my(?:\/|$)/,
  /^\/points(?:\/|$)/,
  /^\/profile(?:\/|$)/,
  /^\/payment(?:\/|$)/,
  /^\/payments(?:\/|$)/,
  /^\/checkout(?:\/|$)/,
  /^\/premium-unlock(?:\/|$)/,
  /^\/dev-status(?:\/|$)/,
  /\/play(?:\/|$)/,
  /\/stage(?:\/|$)/,
  /\/start(?:\/|$)/,
  /\/callback(?:\/|$)/,
];
const excludedInsightCategories = new Set([
  "상담 윤리",
  "콘텐츠 운영",
  "사용자 가이드",
  "기술 SEO",
  "운영 체크리스트",
  "법률/운영",
]);
const staticCanonicalAliasPaths = new Set(
  STATIC_CANONICAL_ROUTES.flatMap((route) => route.aliases || [])
    .map((path) => normalizeSitemapPath(path).replace(/\/+$/, "")),
);
const staticCanonicalRouteEntries = STATIC_CANONICAL_ROUTES.map((route) => ({
  path: route.canonical,
  changefreq: "weekly",
  priority: route.canonical === "/life-book-ai" ? 0.94 : 0.9,
}));

const coreRoutes = [
  { path: "/", changefreq: "daily", priority: 1.0 },
  { path: "/kkul-kkul-unse", changefreq: "weekly", priority: 0.99 },
  { path: "/saju", changefreq: "daily", priority: 0.98 },
  { path: "/manse", changefreq: "daily", priority: 0.98 },
  { path: "/today", changefreq: "daily", priority: 0.97 },
  { path: "/daily-fortune", changefreq: "daily", priority: 0.97 },
  { path: "/compatibility", changefreq: "weekly", priority: 0.96 },
  { path: "/saju/compatibility", changefreq: "weekly", priority: 0.96 },
  { path: "/tarot", changefreq: "weekly", priority: 0.96 },
  { path: "/tarot/reunion", changefreq: "weekly", priority: 0.94 },
  { path: "/tarot/mindscan", changefreq: "weekly", priority: 0.94 },
  { path: "/ziwei", changefreq: "weekly", priority: 0.95 },
  { path: "/ziwei/chart", changefreq: "weekly", priority: 0.92 },
  { path: "/astrology", changefreq: "weekly", priority: 0.95 },
  { path: "/astrology/cosmic", changefreq: "weekly", priority: 0.92 },
  { path: "/sukuyo", changefreq: "weekly", priority: 0.94 },
  { path: "/sukuyo/compatibility", changefreq: "weekly", priority: 0.93 },
  { path: "/vedic", changefreq: "weekly", priority: 0.94 },
  { path: "/vedic/jyotish", changefreq: "weekly", priority: 0.93 },
  { path: "/dream", changefreq: "weekly", priority: 0.94 },
  { path: "/dream/tarot", changefreq: "weekly", priority: 0.88 },
  { path: "/dream/psycho", changefreq: "weekly", priority: 0.88 },
  { path: "/love", changefreq: "weekly", priority: 0.94 },
  { path: "/physiognomy", changefreq: "weekly", priority: 0.93 },
  { path: "/premium", changefreq: "weekly", priority: 0.93 },
  { path: "/premium-reports", changefreq: "weekly", priority: 0.92 },
  { path: "/pdf/life-book", changefreq: "monthly", priority: 0.88 },
  { path: "/pdf/love-report", changefreq: "monthly", priority: 0.88 },
  { path: "/sukuyo-compatibility-ai", changefreq: "monthly", priority: 0.87 },
  { path: "/saju/basic", changefreq: "weekly", priority: 0.95 },
  { path: "/oracle/sukuyo", changefreq: "weekly", priority: 0.93 },
  { path: "/tarot/mingri", changefreq: "weekly", priority: 0.93 },
  { path: "/tarot/love", changefreq: "weekly", priority: 0.9 },
  { path: "/tarot/healing", changefreq: "weekly", priority: 0.9 },
  { path: "/oracle/hwatu-life", changefreq: "weekly", priority: 0.88 },
  { path: "/animal/mbti", changefreq: "weekly", priority: 0.87 },
  { path: "/oracle/sikojen-povailu", changefreq: "weekly", priority: 0.87 },
  { path: "/saju-picture", changefreq: "weekly", priority: 0.86 },
  { path: "/fortune-tea-house", changefreq: "weekly", priority: 0.86 },
  { path: "/fortune/prompt-hub", changefreq: "monthly", priority: 0.7 },
  { path: "/oracle/rune", changefreq: "weekly", priority: 0.86 },
  { path: "/love-secret-ai", changefreq: "monthly", priority: 0.86 },
  { path: "/new-year-ai-consultation", changefreq: "monthly", priority: 0.86 },
  { path: "/ziwei-ai", changefreq: "weekly", priority: 0.88 },
  { path: "/vedic-ai", changefreq: "weekly", priority: 0.87 },
  { path: "/karma-destiny-ai", changefreq: "monthly", priority: 0.85 },
  { path: "/about", changefreq: "monthly", priority: 0.9 },
  { path: "/faq", changefreq: "monthly", priority: 0.88 },
  { path: "/methodology", changefreq: "monthly", priority: 0.86 },
  { path: "/contact", changefreq: "yearly", priority: 0.6 },
  { path: "/privacy", changefreq: "yearly", priority: 0.55 },
  { path: "/terms", changefreq: "yearly", priority: 0.55 },
  { path: "/disclaimer", changefreq: "yearly", priority: 0.54 },
  { path: "/advertising-policy", changefreq: "yearly", priority: 0.54 },
  { path: "/editorial-policy", changefreq: "yearly", priority: 0.54 },
  { path: "/insights", changefreq: "weekly", priority: 0.85 },
  { path: "/insights/saju", changefreq: "weekly", priority: 0.84 },
  { path: "/insights/ziwei", changefreq: "weekly", priority: 0.88 },
  { path: "/insights/sukuyo", changefreq: "weekly", priority: 0.88 },
  { path: "/insights/tarot", changefreq: "weekly", priority: 0.83 },
  { path: "/insights/astrology", changefreq: "weekly", priority: 0.83 },
  { path: "/insights/vedic", changefreq: "weekly", priority: 0.83 },
  { path: "/insights/dream", changefreq: "weekly", priority: 0.82 },
  { path: "/insights/compatibility", changefreq: "weekly", priority: 0.82 },
  { path: "/famous-saju", changefreq: "weekly", priority: 0.88 },
  { path: "/high-value", changefreq: "weekly", priority: 0.84 },
  { path: "/high-value/complete-guide-to-saju", changefreq: "monthly", priority: 0.82 },
  { path: "/high-value/category/saju-beginner", changefreq: "monthly", priority: 0.78 },
  { path: "/high-value/category/tarot-reading", changefreq: "monthly", priority: 0.78 },
  { path: "/high-value/category/compatibility-relationship", changefreq: "monthly", priority: 0.78 },
  { path: "/high-value/category/daily-fortune", changefreq: "monthly", priority: 0.78 },
  { path: "/high-value/category/astrology-ziwei", changefreq: "monthly", priority: 0.78 },
  { path: "/high-value/category/methodology", changefreq: "monthly", priority: 0.78 },
  { path: "/saju/guide", changefreq: "monthly", priority: 0.8 },
  { path: "/saju/ten-gods", changefreq: "monthly", priority: 0.78 },
  { path: "/saju/five-elements", changefreq: "monthly", priority: 0.78 },
  { path: "/ziwei/guide", changefreq: "monthly", priority: 0.8 },
  { path: "/sukuyo/guide", changefreq: "monthly", priority: 0.8 },
  { path: "/astrology/guide", changefreq: "monthly", priority: 0.8 },
  { path: "/vedic/guide", changefreq: "monthly", priority: 0.8 },
  { path: "/tarot/guide", changefreq: "monthly", priority: 0.8 },
  { path: "/mayan-calendar/guide", changefreq: "monthly", priority: 0.78 },
  { path: "/calendar/guide", changefreq: "monthly", priority: 0.78 },
  { path: "/health-report/guide", changefreq: "monthly", priority: 0.78 },
  { path: "/music/guide", changefreq: "monthly", priority: 0.78 },
];

const localeHreflangAliases = {
  ko: ["ko", "ko-KR"],
  ja: ["ja", "ja-JP"],
  zh: ["zh-CN", "zh", "zh-Hans", "zh-TW", "zh-Hant"],
  en: ["en", "en-US"],
};

const i18nRouteGroups = [
  {
    paths: { ko: "/", ja: "/ja", zh: "/zh", en: "/en" },
    changefreq: "daily",
    priority: 1.0,
  },
  {
    paths: { ko: "/ziwei", ja: "/ja/ziwei", zh: "/zh/ziwei", en: "/en/ziwei" },
    changefreq: "weekly",
    priority: 0.95,
  },
  {
    paths: { ko: "/sukuyo", ja: "/ja/sukuyo", zh: "/zh/sukuyo", en: "/en/sukuyo" },
    changefreq: "weekly",
    priority: 0.94,
  },
  {
    paths: { ko: "/today", ja: "/ja/today", zh: "/zh/today", en: "/en/today" },
    changefreq: "daily",
    priority: 0.97,
  },
  {
    paths: { ko: "/insights", ja: "/ja/insights", zh: "/zh/insights", en: "/en/insights" },
    changefreq: "weekly",
    priority: 0.9,
  },
  {
    paths: {
      ko: "/insights/ziwei-basics",
      ja: "/ja/insights/ziwei-basics-jp",
      zh: "/zh/insights/ziwei-basics-zh",
      en: "/en/insights/ziwei-basics-en",
    },
    changefreq: "monthly",
    priority: 0.8,
  },
  {
    paths: {
      ko: "/insights/sukuyo-basics",
      ja: "/ja/insights/sukuyo-basics-jp",
      zh: "/zh/insights/sukuyo-basics-zh",
      en: "/en/insights/sukuyo-basics-en",
    },
    changefreq: "monthly",
    priority: 0.8,
  },
];

function normalizeDate(dateLike) {
  const parsed = new Date(typeof dateLike === "string" ? dateLike : Date.now());
  if (Number.isNaN(parsed.getTime())) return today;
  return parsed.toISOString().slice(0, 10);
}

function extractInsightRoutes() {
  const routes = [];
  const seen = new Set();

  const legacySource = readFileSync(insightsSourcePath, "utf8");
  const legacyArticleRegex =
    /{\s*slug:\s*"([^"]+)"[\s\S]*?category:\s*"([^"]+)"[\s\S]*?updatedAt:\s*"([0-9]{4}-[0-9]{2}-[0-9]{2})"/g;

  let match;
  while ((match = legacyArticleRegex.exec(legacySource)) !== null) {
    const slug = String(match[1] || "").trim();
    const category = String(match[2] || "").trim();
    const updatedAt = String(match[3] || "").trim();

    if (!slug || seen.has(slug) || excludedInsightCategories.has(category)) continue;

    seen.add(slug);
    routes.push({
      path: `/insights/${slug}`,
      changefreq: "monthly",
      priority: 0.74,
      lastmod: normalizeDate(updatedAt),
    });
  }

  return routes;
}

function extractSeoGrowthInsightRoutes() {
  const source = [
    readFileSync(insightsAdsenseReadySourcePath, "utf8"),
    readFileSync(insightsSeoGrowthSourcePath, "utf8"),
  ].join("\n");
  const slugRegex = /slug:\s*["']([a-z0-9-]+)["']/g;
  const seen = new Set();
  const routes = [];

  let match;
  while ((match = slugRegex.exec(source)) !== null) {
    const slug = String(match[1] || "").trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    routes.push({ path: `/insights/${slug}`, changefreq: "monthly", priority: 0.74, lastmod: today });
  }

  return routes;
}

function extractPsychotestRoutes() {
  const source = readFileSync(psychotestSourcePath, "utf8");
  const slugRegex = /slug:\s*["']([a-z0-9-]+)["']/g;
  const seen = new Set();
  const routes = [{ path: "/psychotest", changefreq: "weekly", priority: 0.84, lastmod: today }];

  let match;
  while ((match = slugRegex.exec(source)) !== null) {
    const slug = String(match[1] || "").trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    routes.push({ path: `/psychotest/${slug}`, changefreq: "monthly", priority: 0.72, lastmod: today });
  }

  return routes;
}

function famousCategorySlug(value) {
  const table = {
    "역사 위인": "history",
    "왕족·정치인": "politics",
    "K-스타": "k-star",
    "배우": "actor",
    "가수": "singer",
    "스포츠": "sports",
    "기업인": "business",
    "감독·작가": "director-writer",
    "JP 일본": "jp",
    "CN 중국": "cn",
    "US 미국": "us",
    "사상가·예술가": "thinker-artist",
  };
  return table[value] || String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function extractFamousSajuRoutes() {
  const source = readFileSync(famousSajuSourcePath, "utf8");
  const itemRegex = /\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"[^"]+"\s*,\s*"([0-9]{4}-[0-9]{2}-[0-9]{2})"/g;
  const routes = [{ path: "/insights/famous-saju", changefreq: "weekly", priority: 0.89, lastmod: today }];
  const categoryRoutes = new Set();
  const seen = new Set();

  let match;
  while ((match = itemRegex.exec(source)) !== null) {
    const slug = String(match[1] || "").trim();
    const category = String(match[3] || "").trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    // 상세(/insights/famous-saju/<slug>)는 현재 robots index:false 라 사이트맵에서 제외.
    // 색인을 다시 열면 여기서 detail 라우트 push를 복원할 것.

    const cSlug = famousCategorySlug(category);
    if (cSlug) categoryRoutes.add(cSlug);
  }

  return [
    ...routes,
    ...Array.from(categoryRoutes).map((slug) => ({ path: `/famous-saju/category/${slug}`, changefreq: "weekly", priority: 0.72, lastmod: today })),
  ];
}

function extractHighValueRoutes() {
  const source = readFileSync(highValueSourcePath, "utf8");
  const pageRegex =
    /{\s*slug:\s*"([a-z0-9-]+)"[\s\S]*?category:\s*"([^"]+)"[\s\S]*?updatedAt:\s*"([0-9]{4}-[0-9]{2}-[0-9]{2})"/g;

  const categorySlug = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const pageRoutes = [];
  const categoryRoutes = new Map();
  const seenPage = new Set();

  let match;
  while ((match = pageRegex.exec(source)) !== null) {
    const slug = String(match[1] || "").trim();
    const category = String(match[2] || "").trim();
    const updatedAt = String(match[3] || "").trim();

    if (slug && !seenPage.has(slug)) {
      seenPage.add(slug);
      if (slug !== "saju-beginner") {
        pageRoutes.push({
          path: `/high-value/${slug}`,
          changefreq: "monthly",
          priority: 0.72,
          lastmod: normalizeDate(updatedAt),
        });
      }
    }

    const cSlug = categorySlug(category);
    if (cSlug && !categoryRoutes.has(cSlug)) {
      categoryRoutes.set(cSlug, {
        path: `/high-value/category/${cSlug}`,
        changefreq: "monthly",
        priority: 0.68,
      });
    }
  }

  return [...pageRoutes, ...Array.from(categoryRoutes.values())];
}

function toUrl(pathname) {
  return new URL(pathname, siteBaseUrl).toString();
}

function normalizeSitemapPath(pathname) {
  const raw = String(pathname || "/").trim();
  const noQuery = raw.split("?")[0].split("#")[0] || "/";
  const leading = noQuery.startsWith("/") ? noQuery : `/${noQuery}`;
  const compact = leading.replace(/\/{2,}/g, "/");
  if (compact === "/") return "/";
  const trimmed = compact.replace(/\/+$/, "");
  return /\.[a-z0-9]+$/i.test(trimmed) ? trimmed : `${trimmed}/`;
}

function isPublicSitemapPath(pathname) {
  const normalized = normalizeSitemapPath(pathname);
  if (staticCanonicalAliasPaths.has(normalized.replace(/\/+$/, ""))) return false;
  if (noindexPathPrefixes.some((prefix) => normalized.startsWith(`${prefix}/`))) return false;
  return !privateRoutePatterns.some((pattern) => pattern.test(normalized));
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildI18nAlternates(paths) {
  const links = [];
  const seen = new Set();

  for (const locale of ["ko", "ja", "zh", "en"]) {
    const path = paths[locale];
    if (!path) continue;
    const href = toUrl(normalizeSitemapPath(path));
    for (const hreflang of localeHreflangAliases[locale] || []) {
      const key = `${hreflang}|${href}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ hreflang, href });
    }
  }

  const defaultHref = toUrl(normalizeSitemapPath(paths.ko || "/"));
  links.push({ hreflang: "x-default", href: defaultHref });
  return links;
}

function buildI18nRouteEntries() {
  const entries = [];

  // SEO_INDEXABLE_LOCALES=["ko","ja","zh","en"] — 전체 로케일 URL을 hreflang alternates 와
  // 함께 싣는다 (lib/i18n/locales.ts 와 동기화 유지).
  for (const group of i18nRouteGroups) {
    const alternates = buildI18nAlternates(group.paths);
    for (const path of Object.values(group.paths)) {
      entries.push({
        path,
        changefreq: group.changefreq,
        priority: group.priority,
        alternates,
      });
    }
  }

  return entries;
}

async function fetchPublishedInsightsFromApi() {
  const out = [];
  const seen = new Set();

  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 200) {
    const url = `${insightsApiBase}/api/insights?sort=latest&pageSize=50&page=${page}&excludeNoIndex=1`;
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) break;

    const data = await response.json().catch(() => ({}));
    const items = Array.isArray(data?.items) ? data.items : [];

    for (const item of items) {
      const slug = String(item?.slug || "").trim();
      if (!slug) continue;

      const canonicalUrl = String(item?.canonicalUrl || "").trim()
        || `${siteBaseUrl}/insights/${encodeURIComponent(slug)}`;

      if (seen.has(canonicalUrl)) continue;
      seen.add(canonicalUrl);

      out.push({
        path: canonicalUrl.replace(siteBaseUrl, "") || "/",
        changefreq: "weekly",
        priority: 0.74,
        lastmod: normalizeDate(item?.updatedAt),
      });
    }

    hasMore = Boolean(data?.hasMore);
    page += 1;
  }

  return out;
}

async function main() {
  const dynamicInsights = useInsightsApi ? await fetchPublishedInsightsFromApi().catch(() => []) : [];
  const localInsights = extractInsightRoutes();

  const routeEntries = [
    ...coreRoutes,
    ...buildI18nRouteEntries(),
    ...staticCanonicalRouteEntries,
    ...localInsights,
    ...extractSeoGrowthInsightRoutes(),
    ...dynamicInsights,
    ...extractFamousSajuRoutes(),
    ...extractPsychotestRoutes(),
    ...extractHighValueRoutes(),
  ];

  const entryMap = new Map();

  for (const route of routeEntries) {
    if (!isPublicSitemapPath(route.path)) continue;

    const loc = toUrl(normalizeSitemapPath(route.path));
    const next = {
      loc,
      lastmod: route.lastmod || today,
      changefreq: route.changefreq || "weekly",
      priority: Number(route.priority ?? 0.7).toFixed(2),
      alternates: Array.isArray(route.alternates) ? route.alternates : [],
    };

    const prev = entryMap.get(loc);
    if (!prev) {
      entryMap.set(loc, next);
      continue;
    }

    const prevTime = new Date(prev.lastmod).getTime();
    const nextTime = new Date(next.lastmod).getTime();
    entryMap.set(loc, {
      loc,
      lastmod: Number.isFinite(nextTime) && nextTime > prevTime ? next.lastmod : prev.lastmod,
      changefreq: prev.changefreq || next.changefreq,
      priority: Number(Math.max(Number(prev.priority), Number(next.priority))).toFixed(2),
      alternates: prev.alternates?.length ? prev.alternates : next.alternates,
    });
  }

  const sorted = Array.from(entryMap.values()).sort((a, b) => a.loc.localeCompare(b.loc));
  const body = sorted
    .map(
      (entry) => {
        const alternateLines = (entry.alternates || []).map(
          (alternate) =>
            `    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hreflang)}" href="${escapeXml(alternate.href)}" />`,
        );

        return [
          "  <url>",
          `    <loc>${escapeXml(entry.loc)}</loc>`,
          ...alternateLines,
          `    <lastmod>${entry.lastmod}</lastmod>`,
          `    <changefreq>${entry.changefreq}</changefreq>`,
          `    <priority>${entry.priority}</priority>`,
          "  </url>",
        ].join("\n");
      },
    )
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    body,
    "</urlset>",
    "",
  ].join("\n");

  writeFileSync(sitemapRootPath, xml, "utf8");
  writeFileSync(sitemapPublicPath, xml, "utf8");
  console.log(`[sitemap] Generated ${sorted.length} URLs -> sitemap.xml, public/sitemap.xml`);
}

main();
