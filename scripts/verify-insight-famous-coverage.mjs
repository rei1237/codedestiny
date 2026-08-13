import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function collectSlugs(source) {
  return Array.from(source.matchAll(/\bslug:\s*["']([^"']+)["']/g))
    .map((match) => String(match[1] || "").trim())
    .filter(Boolean);
}

const insightRoute = read("app/insights/[slug]/page.js");
const insightHub = read("app/insights/page.js");
const seedArticles = read("app/insights/seed-articles.js");
const seoGrowthArticles = read("app/insights/seo-growth-articles.js");
const famousDetail = read("app/insights/famous-saju/[slug]/page.tsx");
const redirects = read("public/_redirects");
const celebrityData = read("lib/famous-saju/celebrity-data.ts");

const seoGrowthSlugs = collectSlugs(seoGrowthArticles);
const seedHasSeoGrowth = seedArticles.includes("SEO_GROWTH_ARTICLES");
const uniqueSeoGrowthSlugs = new Set(seoGrowthSlugs);

assert(seedHasSeoGrowth, "seed-articles must include SEO_GROWTH_ARTICLES");
assert(insightRoute.includes("INSIGHT_SEED_ARTICLES"), "insight detail route must generate from INSIGHT_SEED_ARTICLES");
assert(insightRoute.includes("getInsightSeedBySlug"), "insight detail route must resolve seed article slugs");
assert(insightHub.includes("INSIGHT_SEED_ARTICLES"), "insight hub must show the same seed article pool as detail pages");
assert(uniqueSeoGrowthSlugs.size > 0, "seo growth articles should expose slug entries");
// 2026-08-13: /famous-saju/<slug> 는 /insights/famous-saju/<slug> 와 같은 페이지를 두 URL 로
// 빌드해 130개를 중복 크롤시켰다. 라우트를 지우고 301 로 대체했으므로, 여기서는 "alias 가
// 정본을 미러링하는가" 대신 "alias 가 다시 생기지 않았는가 + 301 이 살아있는가"를 지킨다.
assert(!existsSync("app/famous-saju/[slug]"), "top-level /famous-saju/[slug] alias route must stay deleted (use the 301 in public/_redirects)");
assert(/^\/famous-saju\/:slug\/?\s+\/insights\/famous-saju\/:slug\/\s+301/m.test(redirects), "public/_redirects must 301 /famous-saju/:slug to /insights/famous-saju/:slug/");
assert(/^\/famous-saju\/category\//m.test(redirects), "the /famous-saju/category/ rule must stay ahead of the :slug rule so category pages are not swallowed");
assert(famousDetail.includes("getPublishedCelebrityStaticSlugs"), "famous detail route must generate all celebrity static slugs");
assert(famousDetail.includes('rel="noopener noreferrer nofollow"'), "Pexels credit link must carry safe rel attributes");
assert(celebrityData.includes("getCelebrityStaticSlugs"), "celebrity data must expose static slug generation");

console.log(`[verify-insight-famous-coverage] PASS seoGrowthSlugs=${uniqueSeoGrowthSlugs.size}`);
