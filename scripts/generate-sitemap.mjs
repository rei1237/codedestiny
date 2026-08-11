import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { STATIC_CANONICAL_ROUTES } from "./static-canonical-route-map.mjs";
import { createRequire } from "node:module";
const requireJson = createRequire(import.meta.url);
const STORY_EPISODE_SLUGS = requireJson("../lib/stories/vn/episodes.generated.json").episodes.map((e) => e.slug);

// app/insights/seed-articles.js 를 소스 그대로 import 하기 위한 확장자 보완 로더.
register(pathToFileURL(resolve(process.cwd(), "scripts", "app-module-loader.mjs")));
const { INSIGHT_SEED_ARTICLES } = await import(
  pathToFileURL(resolve(process.cwd(), "app", "insights", "seed-articles.js")).href
);

const rootDir = process.cwd();
const sitemapRootPath = resolve(rootDir, "sitemap.xml");
const sitemapPublicPath = resolve(rootDir, "public", "sitemap.xml");
const highValueSourcePath = resolve(rootDir, "app", "high-value", "content.js");
const famousSajuSourcePath = resolve(rootDir, "lib", "famous-saju", "celebrity-data.ts");
const siteBaseUrl = (process.env.SITE_URL || "https://code-destiny.com").replace(/\/$/, "");
const insightsApiBase = (process.env.INSIGHTS_API_BASE_URL || process.env.SITE_URL || "https://code-destiny.com").replace(/\/$/, "");
const useInsightsApi = String(process.env.SITEMAP_USE_INSIGHTS_API || "").toLowerCase() === "1";
const today = new Date().toISOString().slice(0, 10);
// 확장자가 있는 경로는 normalizeSitemapPath 가 후행 슬래시를 붙이지 않아
// noindexPathPrefixes(startsWith prefix + "/")로 걸러지지 않는다. 정확 일치로 제외한다.
const excludedExactSitemapPaths = new Set([
  "/ifa-oracle.html",
  "/account/delete/",
]);
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
  // 정적 셸 사본 라우트(writeStaticShellCanonicalRoutes 산출물) — 본문이 루트
  // index.html 과 99.9% 동일하다. 기능은 유지하고 색인만 막으므로 사이트맵에서도 뺀다.
  "/saju/basic",
  "/saju/sibyl",
  "/tarot/mingri",
  "/tarot/love",
  "/tarot/reunion",
  "/tarot/self-esteem",
  "/astrology/cosmic",
  "/oracle/sukuyo",
  "/oracle/juyuk",
  "/oracle/hwatu",
  "/neo-operation-room",
  "/tadagochi",
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
  // 로그인 사용자 전용 비밀번호 변경 폼. 본문이 입력창뿐이라 색인 대상이 아니다.
  /^\/account\/password(?:\/|$)/,
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
  "통합 리다이렉트",
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
  // 브랜드 별칭("꿀꿀 운세"·"꿀꿀 만세력") 의 대표 URL 은 홈 "/" 다. 이 페이지는 그 관계를
  // 설명하는 보조 안내라 홈보다 우선순위를 낮춰 브랜드 쿼리에서 자기잠식하지 않게 한다.
  { path: "/kkul-kkul-unse", changefreq: "weekly", priority: 0.85 },
  { path: "/saju", changefreq: "daily", priority: 0.98 },
  { path: "/manse", changefreq: "daily", priority: 0.98 },
  { path: "/destiny-compass", changefreq: "weekly", priority: 0.9 },
  { path: "/reviews", changefreq: "daily", priority: 0.85 },
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
  { path: "/nakshatra", changefreq: "weekly", priority: 0.9 },
  // 27수 도감(0–26) — /nakshatra/calc·/result 는 색인 제외이므로 등록하지 않는다.
  ...Array.from({ length: 27 }, (_, i) => ({ path: `/nakshatra/codex/${i}`, changefreq: "monthly", priority: 0.72 })),
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
  { path: "/master-love-codex", changefreq: "monthly", priority: 0.9 },
  { path: "/naming-ai", changefreq: "monthly", priority: 0.86 },
  { path: "/new-year-ai-consultation", changefreq: "monthly", priority: 0.86 },
  { path: "/ziwei-ai", changefreq: "weekly", priority: 0.88 },
  { path: "/vedic-ai", changefreq: "weekly", priority: 0.87 },
  { path: "/karma-destiny-ai", changefreq: "monthly", priority: 0.85 },
  { path: "/yeon-star-hug", changefreq: "weekly", priority: 0.85 },
  { path: "/about", changefreq: "monthly", priority: 0.9 },
  { path: "/faq", changefreq: "monthly", priority: 0.88 },
  { path: "/methodology", changefreq: "monthly", priority: 0.86 },
  { path: "/contact", changefreq: "yearly", priority: 0.6 },
  { path: "/privacy", changefreq: "yearly", priority: 0.55 },
  { path: "/terms", changefreq: "yearly", priority: 0.55 },
  { path: "/ja/tokushoho", changefreq: "yearly", priority: 0.5 },
  { path: "/account/delete", changefreq: "yearly", priority: 0.5 },
  { path: "/disclaimer", changefreq: "yearly", priority: 0.54 },
  { path: "/advertising-policy", changefreq: "yearly", priority: 0.54 },
  { path: "/editorial-policy", changefreq: "yearly", priority: 0.54 },
  { path: "/insights", changefreq: "weekly", priority: 0.85 },
  // 연이의 운명 노벨 텍스트 리더 — 허브 + 44화.
  // 슬러그는 생성물(lib/stories/vn/episodes.generated.json)에서 읽어 하드코딩 드리프트를 막는다.
  { path: "/stories", changefreq: "monthly", priority: 0.86 },
  ...STORY_EPISODE_SLUGS.map((slug) => ({ path: `/stories/${slug}`, changefreq: "yearly", priority: 0.7 })),
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
  { path: "/tarot/prompt-maker", changefreq: "monthly", priority: 0.76 },
  { path: "/mayan-calendar/guide", changefreq: "monthly", priority: 0.78 },
  { path: "/calendar/guide", changefreq: "monthly", priority: 0.78 },
  { path: "/health-report/guide", changefreq: "monthly", priority: 0.78 },
  { path: "/music/guide", changefreq: "monthly", priority: 0.78 },
  { path: "/flower/destiny", changefreq: "weekly", priority: 0.85 },
  { path: "/flower/astrology", changefreq: "weekly", priority: 0.82 },
  { path: "/flower/jamidusu", changefreq: "weekly", priority: 0.82 },
  { path: "/flower/sukuyo", changefreq: "weekly", priority: 0.82 },
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
  // PG 심사용 다국어 약관/정책 페이지 (app/[locale]/{terms-of-service,privacy-policy,refund-policy}).
  // ko는 기존 페이지(각각 /terms-of-service, /privacy-policy)를 그대로 가리킨다 — 새 ko 페이지를
  // 만들지 않았다. refund-policy는 ko 전용 URL이 없으므로(실질은 /terms-of-service 12조에 있음)
  // ko를 이 그룹에 넣지 않는다 — sitemap URL과 hreflang 안전을 위해 fragment(#)를 <loc>으로
  // 넣지 않는다. x-default는 이 그룹만 "/"로 폴백된다(buildI18nAlternates 참고).
  {
    paths: { ko: "/terms-of-service", ja: "/ja/terms-of-service", zh: "/zh/terms-of-service", en: "/en/terms-of-service" },
    changefreq: "yearly",
    priority: 0.55,
  },
  {
    paths: { ko: "/privacy-policy", ja: "/ja/privacy-policy", zh: "/zh/privacy-policy", en: "/en/privacy-policy" },
    changefreq: "yearly",
    priority: 0.55,
  },
  {
    paths: { ja: "/ja/refund-policy", zh: "/zh/refund-policy", en: "/en/refund-policy" },
    changefreq: "yearly",
    priority: 0.5,
  },
];

function normalizeDate(dateLike) {
  const parsed = new Date(typeof dateLike === "string" ? dateLike : Date.now());
  if (Number.isNaN(parsed.getTime())) return today;
  return parsed.toISOString().slice(0, 10);
}

// app/insights/[slug]/page.js 의 uniqueArticles() 와 동일한 판정.
// 본문(sections / contentHtml / body)이 없는 글은 generateStaticParams 에서 빠져
// 페이지가 export 되지 않는다. 사이트맵이 이 조건을 재현하지 못하면 404 URL 이 생긴다.
function insightArticleHasBody(article) {
  const sections = Array.isArray(article?.sections) ? article.sections : [];
  if (sections.length > 0) return true;
  return String(article?.contentHtml || article?.body || "").trim().length > 0;
}

// 정규식 스크래핑 대신 페이지 생성이 쓰는 바로 그 모듈에서 뽑는다.
// (과거 extractSeoGrowthInsightRoutes 가 슬러그만 긁어 카테고리·본문 조건을 무시했고,
//  그 결과 사이트맵에 404 URL 15개가 올라가 있었다.)
function extractInsightRoutes() {
  const routes = [];
  const seen = new Set();

  for (const article of INSIGHT_SEED_ARTICLES) {
    const slug = String(article?.slug || "").trim();
    if (!slug || seen.has(slug)) continue;
    if (excludedInsightCategories.has(String(article?.category || "").trim())) continue;
    if (!insightArticleHasBody(article)) continue;

    seen.add(slug);
    routes.push({
      path: `/insights/${slug}`,
      changefreq: "monthly",
      priority: 0.74,
      lastmod: normalizeDate(article?.updatedAt) || today,
    });
  }

  return routes;
}

function extractPsychotestRoutes() {
  // 상세(/psychotest/<slug>) 14개는 app/psychotest/[slug]/page.tsx 에서 전량 noindex 다.
  // 서로 텍스트의 81.5% 를 공유하는 템플릿 산출물이라 색인 대상이 아니다. 허브만 남긴다.
  const routes = [{ path: "/psychotest", changefreq: "weekly", priority: 0.84, lastmod: today }];

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
  const categoryRoutes = new Set();
  const seen = new Set();
  let latest = "";

  let match;
  while ((match = itemRegex.exec(source)) !== null) {
    const slug = String(match[1] || "").trim();
    const category = String(match[3] || "").trim();
    const updatedAt = String(match[4] || "").trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    if (updatedAt > latest) latest = updatedAt;

    // 상세 페이지(/insights/famous-saju/<slug>)는 사이트맵에 넣지 않는다.
    // app/insights/famous-saju/[slug]/page.tsx 가 전량 noindex 이며, 이름·생일만
    // 바뀌는 템플릿 조립물이라 색인 대상이 아니다. 허브와 카테고리만 남긴다.
    const cSlug = famousCategorySlug(category);
    if (cSlug) categoryRoutes.add(cSlug);
  }

  const lastmod = normalizeDate(latest) || today;

  return [
    { path: "/insights/famous-saju", changefreq: "weekly", priority: 0.89, lastmod },
    ...Array.from(categoryRoutes).map((slug) => ({ path: `/famous-saju/category/${slug}`, changefreq: "weekly", priority: 0.72, lastmod })),
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
  if (excludedExactSitemapPaths.has(normalized)) return false;
  if (noindexPathPrefixes.some((prefix) => normalized === `${prefix}/` || normalized.startsWith(`${prefix}/`))) return false;
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
