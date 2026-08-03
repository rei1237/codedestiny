import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FUSION_FORTUNE_PENDING_PROFILE,
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

function getMetaContent(html, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<meta[^>]+name=["']${escapedName}["'][^>]+content=["']([^"']*)["']`, "i"));
  return match?.[1] || "";
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
    assert(relatedPath !== FUSION_FORTUNE_PENDING_PROFILE.path, `Pending Fusion Fortune route linked: ${routePath}`);
  }

  assert(getTopicClusterLinks(routePath).length === profile.relatedPaths.length, `Unresolvable topic link: ${routePath}`);
  assert(getSeoProfileKeywords(routePath).length >= 3, `Incomplete keyword map: ${routePath}`);
}

assert(
  FUSION_FORTUNE_PENDING_PROFILE.publicationState === "pending-feature-merge",
  "Fusion Fortune must remain pending until the feature route is merged",
);

const structuredDataSource = readProjectFile("lib/structured-data.ts");
const layoutSource = readProjectFile("app/layout.js");
const jsonLdComponentSource = readProjectFile("app/components/SeoJsonLd.jsx");
const metadataSource = readProjectFile("lib/generate-page-metadata.ts");
const seoSource = readProjectFile("lib/seo.ts");
const i18nMetadataSource = readProjectFile("lib/seo/createI18nMetadata.ts");

assert(!structuredDataSource.includes("SearchAction"), "Shared WebSite JSON-LD declares an unsupported SearchAction");
assert(!layoutSource.includes("SearchAction"), "Root layout declares an unsupported SearchAction");
assert(!jsonLdComponentSource.includes('price: "0"'), "SoftwareApplication component declares an unsupported zero-price offer");
assert(!metadataSource.includes('price: "0"'), "Metadata helper declares an unsupported zero-price offer");
assert(!jsonLdComponentSource.includes("isAccessibleForFree: true"), "SoftwareApplication component defaults to free access");
assert(!metadataSource.includes("isAccessibleForFree: true"), "Metadata helper defaults to free access");
assert(seoSource.includes("getSeoProfileKeywords(path)"), "Primary metadata helper does not use the registry");
assert(i18nMetadataSource.includes("getSeoProfileKeywords(routeByLocale.ko)"), "Korean i18n metadata does not use the registry");

if (shouldVerifyBuild) {
  for (const profile of Object.values(SEO_ROUTE_PROFILES)) {
    const outputPath = getOutputHtmlPath(profile.path);
    assert(fs.existsSync(outputPath), `Built HTML not found: ${profile.path}`);
    if (!fs.existsSync(outputPath)) continue;

    const html = fs.readFileSync(outputPath, "utf8");
    const keywords = getMetaContent(html, "keywords");
    const h1Count = (html.match(/<h1\b/gi) || []).length;
    const expectedCanonical = `https://code-destiny.com${profile.path}/`;

    assert(html.includes(expectedCanonical), `Canonical missing or wrong: ${profile.path}`);
    assert(h1Count === 1, `Expected one H1, found ${h1Count}: ${profile.path}`);
    assert(keywords.includes(profile.primary), `Primary keyword missing from built metadata: ${profile.path}`);
    assert(!html.includes("SearchAction"), `Unsupported SearchAction in built HTML: ${profile.path}`);
    assert(!html.includes('"price":"0"'), `Unsupported zero-price offer in built HTML: ${profile.path}`);

    for (const error of getJsonLdParseErrors(html)) {
      failures.push(`${profile.path}: ${error}`);
    }
  }
}

if (failures.length > 0) {
  console.error("[verify-seo-entity-registry] FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `[verify-seo-entity-registry] PASS profiles=${Object.keys(SEO_ROUTE_PROFILES).length} built=${shouldVerifyBuild} pendingFusion=${FUSION_FORTUNE_PENDING_PROFILE.publicationState}`,
);
