import { INSIGHT_ARTICLES } from "../insights/articles";

const BASE_URL = "https://code-destiny.com";
const SITE_TITLE = "Code Destiny Insights RSS";
const SITE_DESCRIPTION = "사주·타로·자미두수·점성술 인사이트 업데이트 피드";
const FEED_URL = `${BASE_URL}/rss.xml`;
const SITE_LINK = `${BASE_URL}/insights`;
const MAX_ITEMS = 60;

function escapeXml(value: unknown): string {
  const text = String(value ?? "");
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toPubDate(dateLike: unknown): string {
  const parsed = new Date(typeof dateLike === "string" ? dateLike : Date.now());
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toUTCString();
  }
  return parsed.toUTCString();
}

export const revalidate = 3600;

export async function GET() {
  const now = new Date().toUTCString();

  const sorted = [...INSIGHT_ARTICLES].sort((a, b) => {
    const aTime = new Date(a?.updatedAt || 0).getTime();
    const bTime = new Date(b?.updatedAt || 0).getTime();
    return bTime - aTime;
  });

  const items = sorted.slice(0, MAX_ITEMS).map((article) => {
    const slug = String(article?.slug || "").trim();
    if (!slug) return "";

    const title = escapeXml(article?.title || "Untitled");
    const description = escapeXml(article?.description || "");
    const category = escapeXml(article?.category || "Insights");
    const link = `${BASE_URL}/insights/${encodeURIComponent(slug)}`;
    const guid = link;
    const pubDate = toPubDate(article?.updatedAt);

    return [
      "    <item>",
      `      <title>${title}</title>`,
      `      <link>${link}</link>`,
      `      <guid isPermaLink=\"true\">${guid}</guid>`,
      `      <description>${description}</description>`,
      `      <category>${category}</category>`,
      `      <pubDate>${pubDate}</pubDate>`,
      "    </item>",
    ].join("\n");
  }).filter(Boolean);

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(SITE_TITLE)}</title>`,
    `    <link>${SITE_LINK}</link>`,
    `    <description>${escapeXml(SITE_DESCRIPTION)}</description>`,
    "    <language>ko</language>",
    `    <lastBuildDate>${now}</lastBuildDate>`,
    `    <docs>https://www.rssboard.org/rss-specification</docs>`,
    `    <generator>Code Destiny Next.js RSS</generator>`,
    `    <ttl>60</ttl>`,
    `    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
