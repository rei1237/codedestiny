import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INDEX_POLICY,
  META_NOINDEX_PREFIXES,
  PRIVATE_DISALLOW_RULES,
  ROBOTS_META,
  SITEMAP_EXCLUDED_EXACT_PATHS,
  SITEMAP_NOINDEX_PREFIXES,
  SITEMAP_PRIVATE_ROUTE_PATTERNS,
  buildRobotsRules,
  isIndexablePath,
  isMetaNoindexPath,
  isSitemapExcludedPath,
  matchPolicyEntries,
  normalizePolicyPath,
} from "../../lib/seo/index-policy.mjs";
import * as robotsPolicy from "../../lib/seo/robots-policy.mjs";

// 원장으로 옮기기 직전(2026-11-08) lib/seo/siteSeo.ts noindexPathPrefixes 리터럴. 순서까지 고정한다.
const SITE_SEO_NOINDEX_PREFIXES_BEFORE = [
  "/saju/love-simulation", "/secret-house_real", "/destiny-poker", "/mini-games", "/fortune/date",
  "/neo-operation-room/strategy-books", "/records", "/consultations", "/api", "/api-hello-test", "/admin", "/auth",
  "/login", "/signup", "/profile", "/payment", "/payments", "/checkout", "/success", "/fail", "/debug", "/test",
  "/dev-status", "/me", "/my", "/points", "/account/delete", "/premium-unlock", "/result", "/results",
  "/report/progress", "/diary", "/animal/physio", "/maya", "/oracle/royal-tea", "/oracle/sikojen-povailu",
  "/palm-reading", "/pdf", "/premium", "/premium-reports", "/oracle/juyuk", "/oracle/hwatu", "/blog",
  "/fortune/sikojen-povailu", "/guides/category",
];

// 같은 날 scripts/generate-sitemap.mjs 의 세 목록 리터럴.
const SITEMAP_EXCLUDED_EXACT_BEFORE = [
  "/secret-house_real.html", "/destiny-poker.html",
  "/kkul-kkul-unse/", "/saju/basic/", "/oracle/sukuyo/", "/vedic/jyotish/", "/astrology/cosmic/",
  "/ifa-oracle.html",
  "/account/delete/",
];
const SITEMAP_NOINDEX_PREFIXES_BEFORE = [
  "/saju/love-simulation", "/secret-house_real", "/destiny-poker", "/mini-games", "/fortune/date",
  "/neo-operation-room/strategy-books", "/records", "/business/api/dashboard", "/consultations", "/animal/physio", "/diary", "/maya",
  "/oracle/royal-tea", "/oracle/sikojen-povailu", "/palm-reading", "/pdf", "/premium", "/premium-reports",
  "/oracle/juyuk", "/oracle/hwatu", "/blog", "/fortune/sikojen-povailu", "/guides/category", "/flower",
];
const SITEMAP_PRIVATE_PATTERNS_BEFORE = [
  /^\/api(?:\/|$)/, /^\/admin(?:\/|$)/, /^\/auth(?:\/|$)/, /^\/login(?:\/|$)/, /^\/signup(?:\/|$)/,
  /^\/me(?:\/|$)/, /^\/my(?:\/|$)/, /^\/points(?:\/|$)/, /^\/profile(?:\/|$)/, /^\/payment(?:\/|$)/,
  /^\/payments(?:\/|$)/, /^\/checkout(?:\/|$)/, /^\/premium-unlock(?:\/|$)/, /^\/account\/password(?:\/|$)/,
  /^\/dev-status(?:\/|$)/, /\/play(?:\/|$)/, /\/stage(?:\/|$)/, /\/start(?:\/|$)/, /\/callback(?:\/|$)/,
];

const sorted = (values) => [...values].sort();

test("derived lists equal the literals they replace", () => {
  assert.deepEqual([...META_NOINDEX_PREFIXES], SITE_SEO_NOINDEX_PREFIXES_BEFORE);
  assert.deepEqual(sorted(SITEMAP_EXCLUDED_EXACT_PATHS), sorted(SITEMAP_EXCLUDED_EXACT_BEFORE));
  // 사이트맵 쪽은 `.some()` 판정이라 순서가 결과를 바꾸지 않는다. 원소와 개수만 고정한다.
  assert.deepEqual(sorted(SITEMAP_NOINDEX_PREFIXES), sorted(SITEMAP_NOINDEX_PREFIXES_BEFORE));
  assert.equal(SITEMAP_NOINDEX_PREFIXES.length, SITEMAP_NOINDEX_PREFIXES_BEFORE.length);
  assert.deepEqual(sorted(SITEMAP_PRIVATE_ROUTE_PATTERNS.map(String)), sorted(SITEMAP_PRIVATE_PATTERNS_BEFORE.map(String)));
  assert.equal(SITEMAP_PRIVATE_ROUTE_PATTERNS.length, SITEMAP_PRIVATE_PATTERNS_BEFORE.length);
});

test("ledger entries are well formed and unique", () => {
  const keys = INDEX_POLICY.map((entry) => `${entry.match}:${entry.path}`);
  assert.equal(new Set(keys).size, keys.length);
  for (const entry of INDEX_POLICY) {
    assert.match(entry.path, /^\//);
    assert.ok(["prefix", "exact", "pattern"].includes(entry.match), entry.path);
    assert.ok(entry.meta === null || entry.meta === "noindex", entry.path);
    assert.equal(typeof entry.sitemap, "boolean");
    assert.equal(typeof entry.private, "boolean");
    if (entry.private) assert.equal(entry.sitemap, false, entry.path);
  }
  assert.ok(Object.isFrozen(INDEX_POLICY) && Object.isFrozen(INDEX_POLICY[0]));
});

test("prefix boundary: neighbours are not swallowed", () => {
  assert.deepEqual(matchPolicyEntries("/premium-reports/x").map((entry) => entry.path), ["/premium-reports"]);
  assert.deepEqual(matchPolicyEntries("/premium/x").map((entry) => entry.path), ["/premium"]);
  for (const path of ["/mythology", "/mypage", "/mayan-calendar/guide", "/guides/some-slug", "/testimonials", "/apiary"]) {
    assert.deepEqual(matchPolicyEntries(path), [], path);
    assert.equal(isMetaNoindexPath(path), false, path);
    assert.equal(isSitemapExcludedPath(path), false, path);
    assert.equal(isIndexablePath(path), true, path);
  }
  assert.equal(isMetaNoindexPath("/my/orders"), true);
  assert.equal(isSitemapExcludedPath("/tarot/play/"), true);
  assert.equal(isSitemapExcludedPath("/tarot/player"), false);
});

test("normalizes slashes, queries, origins and double slashes the same way", () => {
  const forms = ["/checkout", "/checkout/", "/checkout/?x=1", "https://code-destiny.com//checkout/", "checkout#top"];
  for (const form of forms) {
    assert.equal(normalizePolicyPath(form), "/checkout", form);
    assert.equal(isMetaNoindexPath(form), true, form);
    assert.equal(isSitemapExcludedPath(form), true, form);
    assert.equal(isIndexablePath(form), false, form);
  }
  assert.equal(normalizePolicyPath(""), "/");
  assert.equal(normalizePolicyPath("https://code-destiny.com"), "/");
  assert.equal(isSitemapExcludedPath("/kkul-kkul-unse"), true);
  assert.equal(isSitemapExcludedPath("/kkul-kkul-unse/child/"), false);
});

test("/flower is sitemap-excluded but not meta noindex (share button)", () => {
  for (const path of ["/flower", "/flower/", "/flower/rose/"]) {
    assert.equal(isMetaNoindexPath(path), false, path);
    assert.equal(isSitemapExcludedPath(path), true, path);
    assert.equal(isIndexablePath(path), false, path);
  }
});

test("robots meta constants and robots.txt re-exports", () => {
  assert.deepEqual(ROBOTS_META.INDEX, { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 });
  assert.deepEqual(ROBOTS_META.NOINDEX_FOLLOW, { index: false, follow: true });
  assert.deepEqual(ROBOTS_META.NOINDEX, { index: false, follow: false });
  assert.equal(PRIVATE_DISALLOW_RULES, robotsPolicy.PRIVATE_DISALLOW_RULES);
  assert.equal(buildRobotsRules, robotsPolicy.buildRobotsRules);
});

// Task 3: 예전 목록을 들고 있던 곳이 이제 원장을 읽는다.
import { readFileSync } from "node:fs";
const source = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

test("siteSeo.ts reads its meta noindex list from the ledger", () => {
  const text = source("lib/seo/siteSeo.ts");
  assert.match(text, /import \{[^}]*\bMETA_NOINDEX_PREFIXES\b[^}]*\bisMetaNoindexPath\b[^}]*\} from "\.\/index-policy\.mjs"/);
  assert.match(text, /export const noindexPathPrefixes = META_NOINDEX_PREFIXES;/);
  assert.match(text, /return isMetaNoindexPath\(pathOrUrl\);/);
  assert.doesNotMatch(text, /noindexPathPrefixes = \[/);
});

test("generate-sitemap.mjs reads its exclusion lists from the ledger", () => {
  const text = source("scripts/generate-sitemap.mjs");
  for (const name of ["SITEMAP_EXCLUDED_EXACT_PATHS", "SITEMAP_NOINDEX_PREFIXES", "SITEMAP_PRIVATE_ROUTE_PATTERNS"]) {
    assert.match(text, new RegExp(`import \\{[^}]*\\b${name}\\b[^}]*\\} from "\\.\\./lib/seo/index-policy\\.mjs"`), name);
  }
  assert.doesNotMatch(text, /const (noindexPathPrefixes|privateRoutePatterns) = \[/);
  assert.doesNotMatch(text, /const excludedExactSitemapPaths = new Set\(\[/);
});

test("adsense sitemapForbiddenPrefixes stays a ledger-noindex subset (kept outside the ledger)", () => {
  const block = source("scripts/verify-adsense-readiness.mjs").match(/const sitemapForbiddenPrefixes = \[([\s\S]*?)\n\];/);
  assert.ok(block, "sitemapForbiddenPrefixes 배열을 찾지 못했다");
  const prefixes = [...block[1].matchAll(/^\s*"([^"]+)",?\s*$/gm)].map((m) => m[1]);
  assert.ok(prefixes.length > 10);
  for (const prefix of prefixes) assert.equal(isIndexablePath(prefix), false, `${prefix}: 사이트맵 금지인데 원장에서 색인 대상`);
});
