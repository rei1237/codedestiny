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
    const response = await fetch(url, { method: "GET" });
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

async function main() {
  const fromApi = await fetchInsightsFromApi().catch(() => []);
  const articles = fromApi.length > 0
    ? fromApi
    : parseArticlesFromSource(readFileSync(insightsSourcePath, "utf8"));

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
