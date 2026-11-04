import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_PATH = resolve(ROOT, "lib/marketing/wordpress-publications.generated.json");
const SITE_URL = "https://ggulggulinsights.wordpress.com/";
const API_URL = new URL("https://public-api.wordpress.com/wp/v2/sites/ggulggulinsights.wordpress.com/posts");
API_URL.searchParams.set("per_page", "100");
API_URL.searchParams.set("status", "publish");
API_URL.searchParams.set("_fields", "id,date_gmt,modified_gmt,link,slug,status,title,excerpt,content,categories,tags");

const argv = new Set(process.argv.slice(2));
const liveCheck = argv.has("--check");
const offlineCheck = argv.has("--offline-check");

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&hellip;/gi, "…")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&lsquo;|&rsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function plainText(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUtc(value) {
  const raw = String(value || "").trim();
  return raw ? `${raw.replace(/Z$/, "")}Z` : null;
}

function extractServiceLinks(content) {
  const links = [];
  for (const match of String(content || "").matchAll(/href=["']([^"']+)["']/gi)) {
    const decoded = decodeHtmlEntities(match[1]);
    try {
      const url = new URL(decoded);
      if (url.protocol === "https:" && ["code-destiny.com", "www.code-destiny.com"].includes(url.hostname)) {
        links.push(url.toString());
      }
    } catch {
      // WordPress 내부 상대 링크와 잘못된 외부 링크는 공개 서비스 연결 목록에 포함하지 않는다.
    }
  }
  return [...new Set(links)];
}

function normalizePost(post) {
  assert.equal(post?.status, "publish", `WordPress post ${post?.id || "unknown"} is not published`);
  const contentText = plainText(post.content?.rendered);
  return {
    id: Number(post.id),
    slug: decodeHtmlEntities(post.slug),
    url: String(post.link || "").trim(),
    title: plainText(post.title?.rendered),
    excerpt: plainText(post.excerpt?.rendered),
    publishedAt: absoluteUtc(post.date_gmt),
    modifiedAt: absoluteUtc(post.modified_gmt),
    contentTextLength: contentText.length,
    serviceLinks: extractServiceLinks(post.content?.rendered),
    categoryIds: Array.isArray(post.categories) ? post.categories.map(Number).filter(Number.isFinite) : [],
    tagIds: Array.isArray(post.tags) ? post.tags.map(Number).filter(Number.isFinite) : [],
  };
}

function validateManifest(manifest) {
  assert.equal(manifest.schemaVersion, 1, "unexpected WordPress publication schema");
  assert.equal(manifest.siteUrl, SITE_URL, "unexpected WordPress site URL");
  assert.ok(Array.isArray(manifest.posts) && manifest.posts.length > 0, "no published WordPress posts recorded");
  assert.equal(new Set(manifest.posts.map((post) => post.id)).size, manifest.posts.length, "duplicate WordPress post id");
  assert.equal(new Set(manifest.posts.map((post) => post.url)).size, manifest.posts.length, "duplicate WordPress post URL");

  let previousPublishedAt = "9999-12-31T23:59:59Z";
  for (const post of manifest.posts) {
    assert.ok(Number.isInteger(post.id) && post.id > 0, "publication id must be a positive integer");
    assert.ok(post.title && post.excerpt, `publication ${post.id} is missing visible copy`);
    assert.ok(post.url.startsWith(SITE_URL), `publication ${post.id} does not belong to the official WordPress site`);
    assert.ok(post.publishedAt && !Number.isNaN(Date.parse(post.publishedAt)), `publication ${post.id} has an invalid date`);
    assert.ok(post.publishedAt <= previousPublishedAt, "WordPress publications must be newest first");
    previousPublishedAt = post.publishedAt;
    assert.ok(Number.isInteger(post.contentTextLength) && post.contentTextLength > 0, `publication ${post.id} has no measured body`);
    assert.ok(Array.isArray(post.serviceLinks) && post.serviceLinks.length > 0, `publication ${post.id} has no Code Destiny path`);
    for (const link of post.serviceLinks) {
      const url = new URL(link);
      assert.equal(url.protocol, "https:", `publication ${post.id} has a non-HTTPS service link`);
      assert.ok(["code-destiny.com", "www.code-destiny.com"].includes(url.hostname), `publication ${post.id} has an unexpected service host`);
    }
  }
}

async function readCurrent() {
  return JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
}

async function fetchManifest() {
  const response = await fetch(API_URL, { headers: { accept: "application/json", "user-agent": "CodeDestinyEditorialSync/1.0" } });
  if (!response.ok) throw new Error(`WordPress API ${response.status} ${response.statusText}`);
  const payload = await response.json();
  const posts = payload.map(normalizePost).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const manifest = {
    schemaVersion: 1,
    siteUrl: SITE_URL,
    feedUrl: `${SITE_URL}feed/`,
    source: API_URL.origin,
    syncedAt: new Date().toISOString(),
    posts,
  };
  validateManifest(manifest);
  return manifest;
}

if (offlineCheck) {
  const current = await readCurrent();
  validateManifest(current);
  console.log(`WordPress publications OK: ${current.posts.length} published posts, synced ${current.syncedAt}`);
} else {
  const next = await fetchManifest();
  if (liveCheck) {
    const current = await readCurrent();
    validateManifest(current);
    assert.deepEqual(current.posts, next.posts, "WordPress publication manifest is stale; run npm run marketing:wordpress:sync");
    console.log(`WordPress publication manifest is current: ${next.posts.length} posts`);
  } else {
    await writeFile(OUTPUT_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    console.log(`Synced ${next.posts.length} WordPress publications -> ${OUTPUT_PATH}`);
  }
}
