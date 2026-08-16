import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { STATIC_CANONICAL_ROUTES } from "./static-canonical-route-map.mjs";
import { createSitemapLastmodLedger } from "./lib/sitemap-lastmod.mjs";
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
const fortuneSignSourcePath = resolve(rootDir, "lib", "fortune", "sign-profiles.ts");
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
  // 체계 간 비교 문서. 경쟁사 비교가 아니라 우리가 실제로 제공하는 체계끼리의 비교라
  // 지어낸 내용이 없고, 각 체계 허브를 잇는 내부 링크 역할도 한다.
  { path: "/compare/saju-vs-ziwei", changefreq: "monthly", priority: 0.8 },
  { path: "/compare/sukuyo-vs-vedic", changefreq: "monthly", priority: 0.8 },
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
  { path: "/insights/fusion", changefreq: "weekly", priority: 0.83 },
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
  zh: ["zh-CN", "zh", "zh-Hans"],
  "zh-TW": ["zh-TW", "zh-Hant"],
  en: ["en", "en-US"],
};

const i18nRouteGroups = [
  {
    paths: { ko: "/", ja: "/ja", zh: "/zh", "zh-TW": "/zh-tw", en: "/en" },
    changefreq: "daily",
    priority: 1.0,
  },
  {
    paths: { ko: "/ziwei", ja: "/ja/ziwei", zh: "/zh/ziwei", "zh-TW": "/zh-tw/ziwei", en: "/en/ziwei" },
    changefreq: "weekly",
    priority: 0.95,
  },
  {
    paths: { ko: "/sukuyo", ja: "/ja/sukuyo", zh: "/zh/sukuyo", "zh-TW": "/zh-tw/sukuyo", en: "/en/sukuyo" },
    changefreq: "weekly",
    priority: 0.94,
  },
  {
    paths: { ko: "/today", ja: "/ja/today", zh: "/zh/today", "zh-TW": "/zh-tw/today", en: "/en/today" },
    changefreq: "daily",
    priority: 0.97,
  },
  {
    paths: { ko: "/insights", ja: "/ja/insights", zh: "/zh/insights", "zh-TW": "/zh-tw/insights", en: "/en/insights" },
    changefreq: "weekly",
    priority: 0.9,
  },
  {
    paths: {
      ko: "/insights/ziwei-basics",
      ja: "/ja/insights/ziwei-basics-jp",
      zh: "/zh/insights/ziwei-basics-zh",
      "zh-TW": "/zh-tw/insights/ziwei-basics-tw",
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
      "zh-TW": "/zh-tw/insights/sukuyo-basics-tw",
      en: "/en/insights/sukuyo-basics-en",
    },
    changefreq: "monthly",
    priority: 0.8,
  },
  // PG 심사용 다국어 약관/정책 페이지 (app/[locale]/{terms-of-service,privacy-policy,refund-policy}).
  // ko는 /terms-of-service·/privacy-policy 가 아니라 짧은 별칭 /terms·/privacy 를 가리킨다 —
  // 두 URL이 완전히 같은 컴포넌트를 렌더해 title/description이 동일하므로, sitemap에 두 개를
  // 함께 넣으면 verify-adsense-readiness.mjs 의 "duplicate sitemap title" 검사에 걸린다.
  // /terms-of-service 자신도 canonical 을 /terms 로 잡아 이 dedup 을 이미 따르고 있다(coreRoutes
  // 참고). refund-policy는 ko 전용 URL이 없으므로(실질은 /terms-of-service 12조에 있음) 이 그룹에
  // ko를 넣지 않는다 — x-default는 이 그룹만 "/"로 폴백된다(buildI18nAlternates 참고).
  {
    paths: { ko: "/terms", ja: "/ja/terms-of-service", zh: "/zh/terms-of-service", "zh-TW": "/zh-tw/terms-of-service", en: "/en/terms-of-service" },
    changefreq: "yearly",
    priority: 0.55,
  },
  {
    paths: { ko: "/privacy", ja: "/ja/privacy-policy", zh: "/zh/privacy-policy", "zh-TW": "/zh-tw/privacy-policy", en: "/en/privacy-policy" },
    changefreq: "yearly",
    priority: 0.55,
  },
  {
    paths: { ja: "/ja/refund-policy", zh: "/zh/refund-policy", "zh-TW": "/zh-tw/refund-policy", en: "/en/refund-policy" },
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
  // lastmod 를 붙이지 않는다 — 실제 갱신일을 아는 소스가 없다. 예전에는 여기 `today` 가 박혀 있어
  // 이 URL 하나가 빌드마다 "오늘 수정됨" 으로 나갔다. 아래 조립부의 서명 원장을 타게 둔다.
  const routes = [{ path: "/psychotest", changefreq: "weekly", priority: 0.84 }];

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
  // 🔴 5번째 필드는 **생년월일**이다(RawCelebritySeed 튜플: slug, nameKo, category, country, birthDate).
  // 갱신일 필드는 이 튜플에 애초에 없다. 예전에는 이 값을 `updatedAt` 으로 받아 최대값을
  // lastmod 로 썼고, 그 결과 가장 늦게 태어난 인물의 생일(2008-04-21)이 아래 13개 URL 의
  // lastmod 로 나갔다 — 구글에 "18년간 미갱신"으로 신고하던 셈이다. 여기서는 튜플 모양을
  // 확인하는 앵커로만 쓰고 날짜로는 절대 쓰지 않는다.
  const itemRegex = /\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"[^"]+"\s*,\s*"([0-9]{4}-[0-9]{2}-[0-9]{2})"/g;
  const categoryRoutes = new Set();
  const seen = new Set();

  let match;
  while ((match = itemRegex.exec(source)) !== null) {
    const slug = String(match[1] || "").trim();
    const category = String(match[3] || "").trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    // 상세 페이지(/insights/famous-saju/<slug>)는 사이트맵에 넣지 않는다.
    // app/insights/famous-saju/[slug]/page.tsx 가 전량 noindex 이며, 이름·생일만
    // 바뀌는 템플릿 조립물이라 색인 대상이 아니다. 허브와 카테고리만 남긴다.
    const cSlug = famousCategorySlug(category);
    if (cSlug) categoryRoutes.add(cSlug);
  }

  // lastmod 를 붙이지 않는다 — 이 라우트들의 실제 갱신 시각을 알 수 있는 소스가 없다.
  // 아래 조립부의 `route.lastmod || today` 폴백을 타서 다른 라우트와 같은 취급을 받는다.
  return [
    { path: "/insights/famous-saju", changefreq: "weekly", priority: 0.89 },
    ...Array.from(categoryRoutes).map((slug) => ({ path: `/famous-saju/category/${slug}`, changefreq: "weekly", priority: 0.72 })),
  ];
}

/**
 * /fortune/{today,tomorrow} 허브 2개 + 별자리·띠 24종 상세 48개.
 *
 * 🔴 목록을 여기에 손으로 적지 않는다. app/fortune/[period]/[sign] 의 generateStaticParams 는
 *    lib/fortune/sign-profiles.ts 를 읽으므로, 사이트맵도 같은 파일에서 전수 발견해야 둘이
 *    어긋나지 않는다. 24종이 아니면 실패시킨다(fail-closed) — 사이트맵에만 있고 산출물이 없으면
 *    verify-seo-heading-integrity 가 PR CI 에서 막고, 반대면 색인에서 조용히 빠진다.
 */
function extractFortuneSignRoutes() {
  const source = readFileSync(fortuneSignSourcePath, "utf8");
  const idRegex = /^\s{4}id:\s*"([a-z]+)",/gm;
  const ids = [];
  let match;
  while ((match = idRegex.exec(source)) !== null) {
    if (!ids.includes(match[1])) ids.push(match[1]);
  }

  if (ids.length !== 24) {
    throw new Error(
      `[sitemap] lib/fortune/sign-profiles.ts 에서 별자리·띠 24종을 찾지 못했습니다(발견 ${ids.length}종). ` +
        "파일 구조가 바뀌었다면 이 추출기를 함께 고쳐야 합니다.",
    );
  }

  // lib/fortune/periods.ts 의 FORTUNE_PERIOD_IDS 와 같아야 한다.
  // 주간·월간은 갱신 주기가 길지만 changefreq 는 크롤러의 참고값일 뿐이고,
  // 실제로는 매일 재배포되며 요일별 표와 월건 구간이 함께 갱신되므로 daily 로 둔다.
  const periods = ["today", "tomorrow", "weekly", "monthly"];
  const routes = [];
  for (const period of periods) {
    routes.push({ path: `/fortune/${period}`, changefreq: "daily", priority: 0.9 });
    for (const id of ids) {
      routes.push({ path: `/fortune/${period}/${id}`, changefreq: "daily", priority: 0.82 });
    }
  }
  return routes;
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

  for (const locale of ["ko", "ja", "zh", "zh-TW", "en"]) {
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

  // SEO_INDEXABLE_LOCALES=["ko","ja","zh","zh-TW","en"] — 전체 로케일 URL을 hreflang alternates 와
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
    ...extractFortuneSignRoutes(),
  ];

  // 자체 갱신일이 없는 라우트는 여기서 콘텐츠 서명으로 날짜를 정한다.
  // 예전에는 그냥 `|| today` 였고, 그 결과 429개 중 315개가 빌드마다 "오늘 수정됨" 으로 나갔다.
  const lastmodLedger = createSitemapLastmodLedger({
    rootDir,
    today,
    previousSitemapPath: sitemapRootPath,
  });

  const entryMap = new Map();

  for (const route of routeEntries) {
    if (!isPublicSitemapPath(route.path)) continue;

    const normalizedPath = normalizeSitemapPath(route.path);
    const loc = toUrl(normalizedPath);
    const next = {
      loc,
      lastmod: route.lastmod || lastmodLedger.lastmodFor(normalizedPath),
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

  // 🔴 사이트맵을 쓰기 **전**에 원장을 확정한다. 여기서 던지는 검사(미분류 런타임 데이터 의존,
  // 풀리지 않는 로컬 import)가 통과 못 하면 서명이 부실하다는 뜻이므로, 그 상태의 사이트맵을
  // 디스크에 남기면 안 된다.
  const ledger = lastmodLedger.save();

  writeFileSync(sitemapRootPath, xml, "utf8");
  writeFileSync(sitemapPublicPath, xml, "utf8");

  const { kept, updated, seeded } = lastmodLedger.summary();
  console.log(`[sitemap] Generated ${sorted.length} URLs -> sitemap.xml, public/sitemap.xml`);
  console.log(
    `[sitemap] lastmod 원장 ${ledger.path}: ${ledger.count}개 (유지 ${kept} / 갱신 ${updated} / 이전 사이트맵에서 승계 ${seeded})`,
  );
}

main();
