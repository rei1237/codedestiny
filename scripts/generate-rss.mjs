import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const insightsSourcePath = resolve(rootDir, "app", "insights", "articles.js");
const rootRssPath = resolve(rootDir, "rss.xml");
const publicRssPath = resolve(rootDir, "public", "rss.xml");
const rootInsightsRssPath = resolve(rootDir, "insights", "rss.xml");
const publicInsightsRssPath = resolve(rootDir, "public", "insights", "rss.xml");

const BASE_URL = (process.env.SITE_URL || "https://code-destiny.com").replace(/\/$/, "");
const INSIGHTS_API_BASE_URL = (process.env.INSIGHTS_API_BASE_URL || process.env.SITE_URL || "https://code-destiny.com").replace(/\/$/, "");
const SITE_TITLE = "Code Destiny Insights RSS";
const SITE_DESCRIPTION = "사주·타로·자미두수·점성술 인사이트 업데이트 피드";
const FEED_URL = `${BASE_URL}/rss.xml`;
const INSIGHTS_FEED_URL = `${BASE_URL}/insights/rss.xml`;
const SITE_LINK = `${BASE_URL}/insights`;
const MAX_ITEMS = 60;

const NON_ESSENTIAL_CATEGORIES = new Set([
  "상담 윤리",
  "콘텐츠 운영",
  "사용자 가이드",
  "기술 SEO",
  "운영 체크리스트",
  "법률/운영",
]);

function escapeXml(value) {
  const text = String(value ?? "");
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toPubDate(dateLike) {
  const parsed = new Date(typeof dateLike === "string" ? dateLike : Date.now());
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toUTCString();
  }
  return parsed.toUTCString();
}

function parseArticlesFromSource(source) {
  const articleRegex = /{\s*slug:\s*"([^"]+)"[\s\S]*?title:\s*"([^"]+)"[\s\S]*?description:\s*"([\s\S]*?)"[\s\S]*?category:\s*"([^"]+)"[\s\S]*?updatedAt:\s*"([0-9]{4}-[0-9]{2}-[0-9]{2})"/g;
  const result = [];
  const seen = new Set();

  let match;
  while ((match = articleRegex.exec(source)) !== null) {
    const slug = String(match[1] || "").trim();
    const title = String(match[2] || "").trim();
    const description = String(match[3] || "").replace(/\s+/g, " ").trim();
    const category = String(match[4] || "").trim();
    const updatedAt = String(match[5] || "").trim();

    if (!slug || seen.has(slug) || NON_ESSENTIAL_CATEGORIES.has(category)) {
      continue;
    }

    seen.add(slug);
    result.push({ slug, title, description, category, updatedAt });
  }

  return result;
}

function buildRssXml(articles) {
  const now = new Date().toUTCString();
  const sorted = [...articles].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const items = sorted.slice(0, MAX_ITEMS).map((article) => {
    const link = `${BASE_URL}/insights/${encodeURIComponent(article.slug)}`;
    return [
      "    <item>",
      `      <title>${escapeXml(article.title || "Untitled")}</title>`,
      `      <link>${link}</link>`,
      `      <guid isPermaLink="true">${link}</guid>`,
      `      <description>${escapeXml(article.description || "")}</description>`,
      `      <category>${escapeXml(article.category || "Insights")}</category>`,
      `      <pubDate>${toPubDate(article.updatedAt)}</pubDate>`,
      "    </item>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(SITE_TITLE)}</title>`,
    `    <link>${SITE_LINK}</link>`,
    `    <description>${escapeXml(SITE_DESCRIPTION)}</description>`,
    "    <language>ko</language>",
    `    <lastBuildDate>${now}</lastBuildDate>`,
    "    <docs>https://www.rssboard.org/rss-specification</docs>",
    "    <generator>Code Destiny RSS Generator</generator>",
    "    <ttl>60</ttl>",
    `    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

function normalizeApiInsight(item) {
  return {
    slug: String(item?.slug || "").trim(),
    title: String(item?.title || "").trim(),
    description: String(item?.excerpt || "").replace(/\s+/g, " ").trim(),
    category: String(item?.category || "").trim() || "Insights",
    updatedAt: String(item?.publishedAt || item?.updatedAt || "").trim(),
  };
}

async function fetchInsightsFromApi() {
  const out = [];
  const seen = new Set();

  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 200 && out.length < MAX_ITEMS * 2) {
    const url = `${INSIGHTS_API_BASE_URL}/api/insights?sort=latest&pageSize=50&page=${page}&excludeNoIndex=1`;
    // 🔴 타임아웃 없이 두면 안 된다 — 이 생성기는 빌드 파이프라인(build-cf-main.mjs)에서 돌고,
    // 프로덕션 API 가 느린 순간에 응답을 무한정 기다리면 배포 잡이 워크플로 timeout 까지 매달린다.
    // 호출자가 실패를 삼키므로(main() 의 .catch(() => [])) 끊기면 소스 파싱 폴백으로 넘어간다.
    const response = await fetch(url, { method: "GET", signal: AbortSignal.timeout(10_000) });
    if (!response.ok) break;

    const data = await response.json().catch(() => ({}));
    const items = Array.isArray(data?.items) ? data.items : [];

    for (const raw of items) {
      const item = normalizeApiInsight(raw);
      if (!item.slug || seen.has(item.slug)) continue;
      seen.add(item.slug);
      out.push(item);
    }

    hasMore = Boolean(data?.hasMore);
    page += 1;
  }

  return out;
}

/**
 * 사이트맵에 실재하는 `/insights/<slug>` 만 남긴다.
 *
 * 🔴 이 필터가 없으면 죽은 URL 을 피드로 내보낸다. `/api/insights`(MongoDB)에는 정적 페이지가
 * 생성되지 않은 문서가 섞여 있어서, 2026-08-15 실측 기준 51개 중 14개가 404 였다
 * (예: /insights/compatibility-reading-ethics, /insights/day-master-survival-winning-strategy).
 * 같은 사고로 `sitemap-insights.xml` 이 2026-07 에 제거됐다 — 피드는 사이트맵의 부분집합이어야 한다.
 *
 * 사이트맵은 build-cf-main.mjs 에서 이 생성기 바로 앞 스텝(`sitemap:generate`)이 만든다.
 */
function filterToSitemapArticles(articles) {
  const sitemapPath = resolve(rootDir, "sitemap.xml");
  let sitemap;
  try {
    sitemap = readFileSync(sitemapPath, "utf8");
  } catch {
    throw new Error("[rss] sitemap.xml 이 없다 — `npm run sitemap:generate` 를 먼저 돌려야 한다. 걸러지지 않은 피드는 내보내지 않는다.");
  }

  const sitemapSlugs = new Set(
    [...sitemap.matchAll(/<loc>[^<]*\/insights\/([^/<]+)\/?<\/loc>/g)].map((match) => decodeURIComponent(match[1])),
  );
  if (sitemapSlugs.size === 0) {
    throw new Error("[rss] sitemap.xml 에서 /insights/<slug> 를 하나도 찾지 못했다 — 파서가 깨졌다.");
  }

  const kept = articles.filter((article) => sitemapSlugs.has(article.slug));
  const dropped = articles.length - kept.length;
  if (kept.length === 0) {
    throw new Error(`[rss] 사이트맵과 겹치는 기사가 0건이다(입력 ${articles.length}건) — 슬러그 규칙이 어긋났다.`);
  }
  if (dropped > 0) {
    console.log(`[rss] 사이트맵에 없는 기사 ${dropped}건 제외 (입력 ${articles.length} → 발행 ${kept.length})`);
  }
  return kept;
}

async function main() {
  const fromApi = await fetchInsightsFromApi().catch(() => []);
  const articles = filterToSitemapArticles(
    fromApi.length > 0
      ? fromApi
      : parseArticlesFromSource(readFileSync(insightsSourcePath, "utf8")),
  );

  const xml = buildRssXml(articles);
  const insightsXml = xml.replace(FEED_URL, INSIGHTS_FEED_URL);

  mkdirSync(resolve(rootDir, "public", "insights"), { recursive: true });
  mkdirSync(resolve(rootDir, "insights"), { recursive: true });

  writeFileSync(rootRssPath, xml, "utf8");
  writeFileSync(publicRssPath, xml, "utf8");
  writeFileSync(rootInsightsRssPath, insightsXml, "utf8");
  writeFileSync(publicInsightsRssPath, insightsXml, "utf8");

  console.log(`[rss] Generated ${Math.min(articles.length, MAX_ITEMS)} items -> rss.xml, insights/rss.xml, public/rss.xml, public/insights/rss.xml`);
}

main();
