import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { getContentReview, hasAdvertisingReview } from "../lib/content/editorial-review.mjs";
import { inspectPublisherDocument } from "./lib/publisher-document.mjs";

const bundled = await build({ stdin: { contents: 'export { INSIGHT_SEED_ARTICLES } from "./app/insights/seed-articles.js"; export { buildArticleJsonLd } from "./lib/structured-data.ts";', resolveDir: process.cwd() }, bundle: true, write: false, platform: "node", format: "esm" });
const { INSIGHT_SEED_ARTICLES, buildArticleJsonLd } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const records = JSON.parse(await readFile("docs/adsense/review/ai-editorial-reviews.json", "utf8"));
const xml = await readFile("sitemap.xml", "utf8");
const blocks = [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map(([block]) => block);
assert.equal(records.length, 20);
assert.equal(new Set(records.map((record) => record.slug)).size, 20);
for (const record of records) {
  const article = INSIGHT_SEED_ARTICLES.find((item) => item.slug === record.slug);
  assert.ok(article, record.slug);
  assert.equal(createHash("sha256").update(article.contentHtml).digest("hex"), record.manuscriptSha256, `Stale review: ${record.slug}`);
  assert.equal(record.title, article.title);
  assert.equal(record.status, "ai-edited");
  const path = `/insights/${record.slug}/`;
  assert.equal(getContentReview(path), null, "AI editing must not create human review");
  assert.equal(hasAdvertisingReview(path), false, "AI editing must not grant advertising");
  const schema = buildArticleJsonLd({ title: article.title, description: article.description, path, author: article.author });
  if (article.author.includes("편집팀") || article.author === "Code Destiny Editorial Team") assert.equal(schema.author["@type"], "Organization", record.slug);
  const document = inspectPublisherDocument(`<html><body><section data-article-body="true">${article.contentHtml}</section></body></html>`, `https://code-destiny.com${path}`);
  assert.ok(document.bodyChars > 0, record.slug);
}
let omitted = 0;
for (const article of INSIGHT_SEED_ARTICLES) {
  const block = blocks.find((item) => item.includes(`<loc>https://code-destiny.com/insights/${article.slug}/</loc>`));
  if (!block) continue;
  const date = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] || null;
  assert.equal(date, article.updatedAt?.slice(0, 10) || null, `Sitemap must match proven article date: ${article.slug}`);
  if (!date) omitted++;
}
console.log(`[editorial-manuscripts] 20 fixed review hashes; no human/ad escalation; ${omitted} unproven sitemap dates omitted`);
