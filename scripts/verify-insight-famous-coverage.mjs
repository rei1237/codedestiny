import { readFileSync } from "node:fs";

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
const famousAliasRoute = read("app/famous-saju/[slug]/page.tsx");
const celebrityData = read("lib/famous-saju/celebrity-data.ts");

const seoGrowthSlugs = collectSlugs(seoGrowthArticles);
const seedHasSeoGrowth = seedArticles.includes("SEO_GROWTH_ARTICLES");
const uniqueSeoGrowthSlugs = new Set(seoGrowthSlugs);

assert(seedHasSeoGrowth, "seed-articles must include SEO_GROWTH_ARTICLES");
assert(insightRoute.includes("INSIGHT_SEED_ARTICLES"), "insight detail route must generate from INSIGHT_SEED_ARTICLES");
assert(insightRoute.includes("getInsightSeedBySlug"), "insight detail route must resolve seed article slugs");
assert(insightHub.includes("INSIGHT_SEED_ARTICLES"), "insight hub must show the same seed article pool as detail pages");
assert(uniqueSeoGrowthSlugs.size > 0, "seo growth articles should expose slug entries");
assert(famousAliasRoute.includes("../../insights/famous-saju/[slug]/page"), "top-level famous route must mirror insights famous route");
assert(famousDetail.includes("getPublishedCelebrityStaticSlugs"), "famous detail route must generate all celebrity static slugs");
assert(famousDetail.includes('rel="noopener noreferrer nofollow"'), "Pexels credit link must carry safe rel attributes");
assert(celebrityData.includes("getCelebrityStaticSlugs"), "celebrity data must expose static slug generation");

console.log(`[verify-insight-famous-coverage] PASS seoGrowthSlugs=${uniqueSeoGrowthSlugs.size}`);
