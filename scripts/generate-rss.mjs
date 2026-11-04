import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { resolve } from "node:path";
import { BRAND_FACTS } from "../lib/brand/brand-facts.mjs";
import { renderInsightsRss } from "../lib/seo/insights-rss.mjs";

// 사이트맵·정적 상세 페이지와 같은 공개 원고를 사용한다. CMS 발행 글은 Edge에서 병합한다.
register(new URL("./app-module-loader.mjs", import.meta.url));
const { INSIGHT_SEED_ARTICLES } = await import("../app/insights/seed-articles.js");
const origin = new URL(process.env.SITE_URL || BRAND_FACTS.service.siteUrl).origin;
const sitemap = readFileSync("sitemap.xml", "utf8");
const urls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]));
const articles = INSIGHT_SEED_ARTICLES.filter(article =>
  article.title && article.contentHtml?.trim() &&
  urls.has(`${origin}/insights/${encodeURIComponent(article.slug)}/`),
);
if (!articles.length) throw new Error("[rss] 사이트맵에 포함된 공개 인사이트 본문이 없습니다.");

for (const prefix of ["", "insights/"]) {
  const path = prefix + "rss.xml";
  const xml = renderInsightsRss(articles, origin, "/" + path);
  for (const root of [".", "public"]) {
    mkdirSync(resolve(root, prefix), { recursive: true });
    writeFileSync(resolve(root, path), xml, "utf8");
  }
}
console.log(`[rss] 공개 인사이트 ${Math.min(articles.length, 60)}건 발행`);
