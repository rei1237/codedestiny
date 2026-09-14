import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { getContentReview, hasAdvertisingReview } from "../lib/content/editorial-review.mjs";
import { inspectPublisherDocument } from "./lib/publisher-document.mjs";
import { INSIGHT_SEO_TITLES } from "../app/insights/seo-titles.js";
import { EDITORIAL_READING_SLUGS } from "../app/insights/editorial-reading-paths.mjs";

const bundled = await build({ stdin: { contents: 'export { INSIGHT_SEED_ARTICLES } from "./app/insights/seed-articles.js"; export { buildArticleJsonLd } from "./lib/structured-data.ts";', resolveDir: process.cwd() }, bundle: true, write: false, platform: "node", format: "esm" });
const { INSIGHT_SEED_ARTICLES, buildArticleJsonLd } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const records = JSON.parse(await readFile("docs/adsense/review/ai-editorial-reviews.json", "utf8"));
const xml = await readFile("sitemap.xml", "utf8");
const blocks = [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map(([block]) => block);
assert.equal(records.length, EDITORIAL_READING_SLUGS.length);
assert.equal(new Set(records.map((record) => record.slug)).size, EDITORIAL_READING_SLUGS.length);
assert.deepEqual(new Set(records.map((record) => record.slug)), new Set(EDITORIAL_READING_SLUGS));
for (const record of records) {
  const article = INSIGHT_SEED_ARTICLES.find((item) => item.slug === record.slug);
  assert.ok(article, record.slug);
  assert.equal(createHash("sha256").update(article.contentHtml).digest("hex"), record.manuscriptSha256, `Stale review: ${record.slug}`);
  assert.equal(record.title, article.title);
  const searchTitle = INSIGHT_SEO_TITLES[article.slug] || `${article.title} | 운세 인사이트`;
  const titleWidth = [...searchTitle].reduce((width, char) => width + (/[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/u.test(char) ? 2 : 1), 0);
  assert.ok(titleWidth <= 60, `Search title exceeds display budget: ${record.slug} (${titleWidth})`);
  assert.equal(record.status, "ai-edited");
  const path = `/insights/${record.slug}/`;
  assert.equal(getContentReview(path), null, "AI editing must not create human review");
  assert.equal(hasAdvertisingReview(path), false, "AI editing must not grant advertising");
  const schema = buildArticleJsonLd({ title: article.title, description: article.description, path, author: article.author });
  if (article.author.includes("편집팀") || article.author === "Code Destiny Editorial Team") assert.equal(schema.author["@type"], "Organization", record.slug);
  const document = inspectPublisherDocument(`<html><body><section data-article-body="true">${article.contentHtml}</section></body></html>`, `https://code-destiny.com${path}`);
  assert.ok(document.bodyChars > 0, record.slug);
}
const riskPhraseChecks = {
  "sukuyo-antai": ["가장 신비롭고", "재회가 반복", "좋은 성과를 낼 가능성"],
  "sukuyo-ankai": ["가장 강렬하고 운명적인", "가장 강력한 긍정", "큰 성공과 큰 갈등"],
  "vedic-astrology-navamsa-basics": ["행성의 진짜 힘", "모든 행성의 최종", "여성의 차트에서는 목성"],
  "tarot-major-arcana-22-complete-meanings": ["달이 지면 반드시 해가 뜬다", "시험 합격, 이사, 사업 확장 등 명확한 승리", "자신 있게 좋은 소식을", "최종 결과를 묻는 질문에서 가장 강력한"],
};
for (const [slug, phrases] of Object.entries(riskPhraseChecks)) {
  const article = INSIGHT_SEED_ARTICLES.find((item) => item.slug === slug);
  for (const phrase of phrases) assert.ok(!article.contentHtml.includes(phrase), `${slug}: risky claim returned: ${phrase}`);
}
let omitted = 0;
for (const article of INSIGHT_SEED_ARTICLES) {
  const block = blocks.find((item) => item.includes(`<loc>https://code-destiny.com/insights/${article.slug}/</loc>`));
  if (!block) continue;
  const date = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] || null;
  assert.equal(date, article.updatedAt?.slice(0, 10) || null, `Sitemap must match proven article date: ${article.slug}`);
  if (!date) omitted++;
}
console.log(`[editorial-manuscripts] ${records.length} fixed review hashes; no human/ad escalation; ${omitted} unproven sitemap dates omitted`);
