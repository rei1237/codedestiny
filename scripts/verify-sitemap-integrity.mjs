import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { indexerGroups } from "./lib/robots-groups.mjs";

const rootDir = process.cwd();
const sitemapPath = resolve(rootDir, "sitemap.xml");
const publicSitemapPath = resolve(rootDir, "public", "sitemap.xml");
const robotsPath = resolve(rootDir, "robots.txt");
const headersPath = resolve(rootDir, "public", "_headers");

const LIVE_ORIGIN = "https://code-destiny.com";
const LIVE_SITEMAP_URL = `${LIVE_ORIGIN}/sitemap.xml`;
const LIVE_ROBOTS_URL = `${LIVE_ORIGIN}/robots.txt`;
const LIVE_INSIGHTS_SITEMAP_URL = `${LIVE_ORIGIN}/sitemap-insights.xml`;

const ACTION_ROUTE_PATTERNS = [
  /^\/api(?:\/|$)/,
  /^\/admin(?:\/|$)/,
  /^\/auth(?:\/|$)/,
  /^\/login(?:\/|$)/,
  /^\/signup(?:\/|$)/,
  /^\/profile(?:\/|$)/,
  /^\/payment(?:\/|$)/,
  /^\/payments(?:\/|$)/,
  /^\/checkout(?:\/|$)/,
  /^\/success(?:\/|$)/,
  /^\/fail(?:\/|$)/,
  /^\/debug(?:\/|$)/,
  /^\/test(?:\/|$)/,
  /^\/dev-status(?:\/|$)/,
  /^\/me(?:\/|$)/,
  /^\/my(?:\/|$)/,
  /^\/points(?:\/|$)/,
  /^\/premium-unlock(?:\/|$)/,
  /^\/result(?:\/|$)/,
  /^\/results(?:\/|$)/,
  /^\/report\/progress(?:\/|$)/,
  /\/play(?:\/|$)/,
  /\/stage(?:\/|$)/,
  /\/start(?:\/|$)/,
  /\/callback(?:\/|$)/,
];

function fail(message) {
  throw new Error(message);
}

function normalizePath(pathOrUrl) {
  const raw = String(pathOrUrl || "/").trim();
  if (!raw) return "/";
  const pathname = /^https?:\/\//i.test(raw) ? new URL(raw).pathname || "/" : raw;
  const compact = pathname.split("?")[0].split("#")[0].replace(/\/{2,}/g, "/");
  if (compact === "/") return "/";
  return compact.replace(/\/+$/, "");
}

function parseSitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
}

function parseNoindexHeaderRules(headersText) {
  const lines = headersText.split(/\r?\n/);
  const rules = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || /^\s*#/.test(line) || /^\s/.test(line)) continue;
    const rulePath = line.trim();
    let robot = "";
    let j = i + 1;
    while (j < lines.length && /^\s/.test(lines[j])) {
      const match = lines[j].match(/X-Robots-Tag:\s*(.+)$/i);
      if (match) robot = match[1].trim();
      j += 1;
    }
    if (/noindex/i.test(robot)) rules.push({ path: rulePath, robot });
  }

  return rules;
}

/**
 * 색인 크롤러에 적용되는 Disallow 만 모은다.
 *
 * 🔴 예전에는 User-agent 블록을 무시하고 파일 안의 모든 `Disallow:` 를 전역 규칙처럼 모았다.
 * robots.txt 는 그렇게 동작하지 않는다 — 특정 봇 그룹의 규칙은 그 봇에만 적용된다.
 * 그래서 학습 전용 크롤러 하나를 막으려고 `User-agent: CCBot` + `Disallow: /` 를 넣는 순간
 * 그 줄이 전역으로 읽혀 **홈(`/`)이 "사이트맵에 있는 비공개 경로"로 잡히고 빌드가 죽었다.**
 *
 * 이 검사의 목적은 "사이트맵에 실은 URL 을 색인 크롤러가 못 읽게 막아 두지 않았는가" 이므로
 * 색인 크롤러 그룹만 본다. 쿼리 패턴(`/*?token=`)은 경로 비교 대상이 아니라 제외한다.
 */
function parseRobotsDisallowRules(robotsText) {
  return indexerGroups(robotsText)
    .flatMap((group) => group.disallow)
    .filter((value) => !value.includes("?"));
}

function matchesHeaderRule(rulePath, pathname) {
  if (rulePath.endsWith("/*")) {
    const base = rulePath.slice(0, -2);
    return pathname === base || pathname.startsWith(`${base}/`);
  }
  if (rulePath.endsWith("*")) {
    return pathname.startsWith(rulePath.slice(0, -1));
  }
  return pathname === rulePath;
}

function matchesRobotsDisallow(disallowPath, pathname) {
  if (disallowPath === "/") return pathname === "/";
  const normalizedRule = normalizePath(disallowPath);
  return pathname === normalizedRule || pathname.startsWith(`${normalizedRule}/`);
}

function assertLocalSitemaps() {
  const rootXml = readFileSync(sitemapPath, "utf8");
  const publicXml = readFileSync(publicSitemapPath, "utf8");
  const robotsText = readFileSync(robotsPath, "utf8");
  const headersText = readFileSync(headersPath, "utf8");

  const rootUrls = parseSitemapUrls(rootXml);
  const publicUrls = parseSitemapUrls(publicXml);

  if (rootUrls.length !== publicUrls.length) {
    fail(`sitemap.xml and public/sitemap.xml URL counts differ: ${rootUrls.length} vs ${publicUrls.length}`);
  }

  const onlyRoot = rootUrls.filter((url) => !publicUrls.includes(url));
  const onlyPublic = publicUrls.filter((url) => !rootUrls.includes(url));
  if (onlyRoot.length || onlyPublic.length) {
    fail(`sitemap.xml and public/sitemap.xml differ. onlyRoot=${onlyRoot.length}, onlyPublic=${onlyPublic.length}`);
  }

  const duplicateUrls = rootUrls.filter((url, index) => rootUrls.indexOf(url) !== index);
  if (duplicateUrls.length) {
    fail(`duplicate sitemap URLs found: ${duplicateUrls.slice(0, 10).join(", ")}`);
  }

  const paths = rootUrls.map((url) => normalizePath(url));
  const noindexRules = parseNoindexHeaderRules(headersText);
  const disallowRules = parseRobotsDisallowRules(robotsText);

  const badNoindexPaths = [];
  const badPrivatePaths = [];

  for (const path of paths) {
    if (path === "/account/delete") {
      fail("/account/delete must not be present in sitemap.xml");
    }

    if (ACTION_ROUTE_PATTERNS.some((pattern) => pattern.test(path))) {
      badPrivatePaths.push(path);
      continue;
    }

    if (disallowRules.some((rule) => matchesRobotsDisallow(rule, path))) {
      badPrivatePaths.push(path);
      continue;
    }

    const matchedNoindexRule = noindexRules.find((rule) => matchesHeaderRule(rule.path, path));
    if (matchedNoindexRule) {
      badNoindexPaths.push(`${path} -> ${matchedNoindexRule.path} (${matchedNoindexRule.robot})`);
    }
  }

  if (badPrivatePaths.length) {
    fail(`private/action routes found in sitemap: ${badPrivatePaths.slice(0, 20).join(", ")}`);
  }

  if (badNoindexPaths.length) {
    fail(`noindex routes found in sitemap: ${badNoindexPaths.slice(0, 20).join(", ")}`);
  }

  console.log(`[verify:sitemap] local sitemap OK (${rootUrls.length} URLs)`);
  return rootUrls;
}

async function fetchWithFallback(url) {
  try {
    const head = await fetch(url, { method: "HEAD", redirect: "follow" });
    if ([403, 405, 406, 429, 500, 501].includes(head.status)) {
      const get = await fetch(url, { method: "GET", redirect: "follow" });
      return { initialStatus: head.status, finalStatus: get.status, finalUrl: get.url, redirected: get.redirected, method: "GET" };
    }
    return { initialStatus: head.status, finalStatus: head.status, finalUrl: head.url, redirected: head.redirected, method: "HEAD" };
  } catch {
    const get = await fetch(url, { method: "GET", redirect: "follow" });
    return { initialStatus: get.status, finalStatus: get.status, finalUrl: get.url, redirected: get.redirected, method: "GET" };
  }
}

async function assertLiveSitemap(localUrls) {
  const liveSitemapRes = await fetch(LIVE_SITEMAP_URL, { method: "GET", redirect: "follow" });
  if (liveSitemapRes.status !== 200) {
    fail(`live sitemap is not 200: ${liveSitemapRes.status}`);
  }

  const liveSitemapXml = await liveSitemapRes.text();
  const liveUrls = parseSitemapUrls(liveSitemapXml);
  const onlyLocal = localUrls.filter((url) => !liveUrls.includes(url));
  const onlyLive = liveUrls.filter((url) => !localUrls.includes(url));
  const hasDrift = liveUrls.length !== localUrls.length || onlyLocal.length > 0 || onlyLive.length > 0;

  const concurrency = 12;
  const queue = [...liveUrls];
  const results = [];

  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) continue;
      const probe = await fetchWithFallback(url);
      results.push({ url, ...probe });
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const badResults = results.filter((result) => result.finalStatus !== 200);
  if (badResults.length) {
    fail(`live sitemap contains non-200 URLs: ${badResults.slice(0, 10).map((item) => `${item.url} -> ${item.finalStatus}`).join(", ")}`);
  }

  const liveRobotsRes = await fetch(LIVE_ROBOTS_URL, { method: "GET", redirect: "follow" });
  if (liveRobotsRes.status !== 200) {
    fail(`live robots.txt is not 200: ${liveRobotsRes.status}`);
  }

  const liveRobotsText = await liveRobotsRes.text();
  if (!/Sitemap:\s*https:\/\/code-destiny\.com\/sitemap\.xml/i.test(liveRobotsText)) {
    fail("live robots.txt does not point to https://code-destiny.com/sitemap.xml");
  }

  const insightsRes = await fetch(LIVE_INSIGHTS_SITEMAP_URL, { method: "HEAD", redirect: "follow" });
  console.log(`[verify:sitemap] live sitemap OK (${results.length} URLs, all 200)`);
  console.log("[verify:sitemap] live robots sitemap directive OK");
  console.log(`[verify:sitemap] live sitemap-insights.xml status: ${insightsRes.status}`);

  if (hasDrift) {
    fail(
      `live sitemap differs from local: live=${liveUrls.length}, local=${localUrls.length}, onlyLocal=${onlyLocal.length}, onlyLive=${onlyLive.length}`,
    );
  }
}

async function main() {
  const runLive = process.argv.includes("--live");
  const localUrls = assertLocalSitemaps();
  if (runLive) {
    await assertLiveSitemap(localUrls);
  }
}

await main();
