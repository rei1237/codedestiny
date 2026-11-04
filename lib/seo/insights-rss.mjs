import { BRAND_FACTS } from "../brand/brand-facts.mjs";
import { actualContentDate } from "../content/editorial-review.mjs";

export const INSIGHTS_RSS_TITLE = `${BRAND_FACTS.service.name} 인사이트`;

export function escapeFeedXml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

// 본문은 공개 상세 페이지와 같은 HTML이다. 피드 리더에서도 사이트 내부 링크와 그림을 열 수 있게 한다.
export function renderInsightsRss(articles, origin, feedPath) {
  const items = articles.map(article => {
    const url = new URL(`/insights/${encodeURIComponent(article.slug)}/`, origin).href;
    const date = [article.publishedAt, article.updatedAt]
      .map(value => actualContentDate(value instanceof Date ? value.toJSON() : value))
      .find(Boolean);
    const body = (article.contentHtml || article.description || "").replace(
      /\b(href|src)=(["'])(\/(?!\/)[^"']*)\2/gi,
      (_, attr, quote, path) => `${attr}=${quote}${origin}${path}${quote}`,
    );
    return { url, date, body, article };
  }).sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.url.localeCompare(b.url)).slice(0, 60);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeFeedXml(INSIGHTS_RSS_TITLE)}</title>`,
    `    <link>${escapeFeedXml(origin)}/insights/</link>`,
    "    <description>사주·타로·자미두수·점성술을 읽는 방법과 공개 해설</description>",
    "    <language>ko</language>",
    `    <atom:link href="${escapeFeedXml(origin + feedPath)}" rel="self" type="application/rss+xml" />`,
    ...items.flatMap(({ url, date, body, article }) => [
      "    <item>",
      `      <title>${escapeFeedXml(article.title)}</title>`,
      `      <link>${escapeFeedXml(url)}</link>`,
      `      <guid isPermaLink="true">${escapeFeedXml(url)}</guid>`,
      `      <description>${escapeFeedXml(body)}</description>`,
      `      <category>${escapeFeedXml(article.category || "인사이트")}</category>`,
      ...(date ? [`      <pubDate>${new Date(date).toUTCString()}</pubDate>`] : []),
      "    </item>",
    ]),
    "  </channel>", "</rss>", "",
  ].join("\n");
}
