import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FUSION_FORTUNE_PROFILE,
  SEO_ROUTE_PROFILES,
  getSeoProfileKeywords,
  getTopicClusterLinks,
} from "../lib/seo/entity-registry.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const shouldVerifyBuild = process.argv.includes("--built");

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function hasRouteSource(routePath) {
  const relative = routePath.replace(/^\//, "");
  const candidates = ["page.js", "page.jsx", "page.ts", "page.tsx"]
    .map((name) => path.join(root, "app", relative, name));
  return candidates.some((candidate) => fs.existsSync(candidate));
}

function getOutputHtmlPath(routePath) {
  return path.join(root, "out", routePath.replace(/^\//, ""), "index.html");
}

function getJsonLdParseErrors(html) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return blocks.flatMap(([, raw], index) => {
    try {
      JSON.parse(raw);
      return [];
    } catch (error) {
      return [`Invalid JSON-LD block ${index + 1}: ${error.message}`];
    }
  });
}

const primaryOwners = new Map();
for (const [routePath, profile] of Object.entries(SEO_ROUTE_PROFILES)) {
  assert(routePath === profile.path, `Registry key/path mismatch: ${routePath}`);
  assert(/^\/[a-z0-9/-]*$/.test(routePath), `Non-canonical registry path: ${routePath}`);
  assert(Boolean(profile.title?.trim()), `Missing title: ${routePath}`);
  assert(Boolean(profile.primary?.trim()), `Missing primary keyword: ${routePath}`);
  assert(Array.isArray(profile.secondary) && profile.secondary.length > 0, `Missing secondary keywords: ${routePath}`);
  assert(Array.isArray(profile.longTail) && profile.longTail.length > 0, `Missing long-tail keyword: ${routePath}`);
  assert(Array.isArray(profile.relatedPaths) && profile.relatedPaths.length > 0, `Missing topic links: ${routePath}`);
  assert(hasRouteSource(routePath), `Public route source not found: ${routePath}`);

  const normalizedPrimary = profile.primary.trim().toLocaleLowerCase("ko-KR");
  const existingOwner = primaryOwners.get(normalizedPrimary);
  assert(!existingOwner, `Primary keyword collision: "${profile.primary}" (${existingOwner}, ${routePath})`);
  primaryOwners.set(normalizedPrimary, routePath);

  for (const relatedPath of profile.relatedPaths) {
    assert(Boolean(SEO_ROUTE_PROFILES[relatedPath]), `Unknown related route: ${routePath} -> ${relatedPath}`);
  }

  assert(getTopicClusterLinks(routePath).length >= profile.relatedPaths.length, `Unresolvable topic link: ${routePath}`);
  assert(getSeoProfileKeywords(routePath).length >= 3, `Incomplete keyword map: ${routePath}`);
}

assert(
  FUSION_FORTUNE_PROFILE.publicationState === "published",
  "Fusion Fortune must be registered as the published canonical hub",
);

const structuredDataSource = readProjectFile("lib/structured-data.ts");
const layoutSource = readProjectFile("app/layout.js");
const brandLandingSource = readProjectFile("app/kkul-kkul-unse/page.js");
const jsonLdComponentSource = readProjectFile("app/components/SeoJsonLd.jsx");
const metadataSource = readProjectFile("lib/generate-page-metadata.ts");
const seoSource = readProjectFile("lib/seo.ts");
const i18nMetadataSource = readProjectFile("lib/seo/createI18nMetadata.ts");
const rootStaticSource = readProjectFile("index.html");
const fusionPageSource = readProjectFile("app/fusion-fortune/page.tsx");

assert(!structuredDataSource.includes("SearchAction"), "Shared WebSite JSON-LD declares an unsupported SearchAction");
assert(!layoutSource.includes("SearchAction"), "Root layout declares an unsupported SearchAction");
assert(!rootStaticSource.includes("SearchAction"), "Static home declares an unsupported SearchAction");
assert(!jsonLdComponentSource.includes('price: "0"'), "SoftwareApplication component declares an unsupported zero-price offer");
assert(!metadataSource.includes('price: "0"'), "Metadata helper declares an unsupported zero-price offer");
assert(!jsonLdComponentSource.includes("isAccessibleForFree: true"), "SoftwareApplication component defaults to free access");
assert(!metadataSource.includes("isAccessibleForFree: true"), "Metadata helper defaults to free access");
assert(seoSource.includes("getSeoProfileKeywords(path)"), "Primary metadata helper does not use the registry");
assert(i18nMetadataSource.includes("getSeoProfileKeywords(routeByLocale.ko)"), "Korean i18n metadata does not use the registry");
assert(structuredDataSource.includes("knowsAbout"), "Organization JSON-LD does not describe Fusion Fortune");
assert(brandLandingSource.includes("FUSION_FORTUNE_SUMMARY"), "Brand landing page is missing visible Fusion Fortune content");
assert(brandLandingSource.includes('href="/fusion-fortune"'), "Brand landing page does not link to Fusion Fortune");
assert(!brandLandingSource.includes("fusionFortuneServiceJsonLd"), "Brand landing page duplicates the Fusion Fortune Service JSON-LD");
assert(fusionPageSource.includes("buildServiceJsonLd"), "Fusion Fortune hub is missing Service JSON-LD");
assert(fusionPageSource.includes("buildFaqPageJsonLd"), "Fusion Fortune hub is missing FAQPage JSON-LD");

if (shouldVerifyBuild) {
  for (const profile of Object.values(SEO_ROUTE_PROFILES)) {
    const outputPath = getOutputHtmlPath(profile.path);
    assert(fs.existsSync(outputPath), `Built HTML not found: ${profile.path}`);
    if (!fs.existsSync(outputPath)) continue;

    const html = fs.readFileSync(outputPath, "utf8");
    const h1Count = (html.match(/<h1\b/gi) || []).length;
    const expectedCanonical = `https://code-destiny.com${profile.path}/`;
    const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);

    assert(canonicalMatch?.[1] === expectedCanonical, `Canonical missing or wrong: ${profile.path}`);
    assert(h1Count === 1, `Expected one H1, found ${h1Count}: ${profile.path}`);
    assert(!html.includes("SearchAction"), `Unsupported SearchAction in built HTML: ${profile.path}`);
    assert(!html.includes('"price":"0"'), `Unsupported zero-price offer in built HTML: ${profile.path}`);

    for (const error of getJsonLdParseErrors(html)) {
      failures.push(`${profile.path}: ${error}`);
    }
  }

  const brandOutputPath = getOutputHtmlPath("/kkul-kkul-unse");
  if (fs.existsSync(brandOutputPath)) {
    const brandHtml = fs.readFileSync(brandOutputPath, "utf8");
    assert(brandHtml.includes("초융합 운세"), "Fusion Fortune is missing from built brand landing page");
    assert(brandHtml.includes('href="/fusion-fortune'), "Fusion Fortune link is missing from built brand landing page");
  }

  const fusionOutputPath = getOutputHtmlPath("/fusion-fortune");
  if (fs.existsSync(fusionOutputPath)) {
    const fusionHtml = fs.readFileSync(fusionOutputPath, "utf8");
    assert(fusionHtml.includes("CODE DESTINY 초융합 운세"), "Fusion Fortune Service JSON-LD is missing from the hub");
    assert(fusionHtml.includes("초융합 운세 FAQ"), "Visible Fusion Fortune FAQ is missing from the hub");
  }
}

if (failures.length > 0) {
  console.error("[verify-seo-entity-registry] FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `[verify-seo-entity-registry] PASS profiles=${Object.keys(SEO_ROUTE_PROFILES).length} built=${shouldVerifyBuild} fusion=${FUSION_FORTUNE_PROFILE.publicationState}`,
);
