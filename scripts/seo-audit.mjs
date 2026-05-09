#!/usr/bin/env node

import fs from "node:fs";

const args = process.argv.slice(2);

function readArg(name, fallback = "") {
  const idx = args.indexOf(name);
  if (idx >= 0 && idx + 1 < args.length) return String(args[idx + 1]);
  return fallback;
}

const BASE_URL = String(readArg("--base", process.env.SEO_AUDIT_BASE || "https://code-destiny.com")).replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = Number(readArg("--timeout", process.env.SEO_AUDIT_TIMEOUT || "15000"));
const CONCURRENCY = Math.max(1, Number(readArg("--concurrency", process.env.SEO_AUDIT_CONCURRENCY || "8")));
const baseHostname = (() => {
  try {
    return new URL(BASE_URL).hostname.toLowerCase();
  } catch {
    return "";
  }
})();
const IS_LOCAL_BASE = /^(localhost|127\.0\.0\.1)$/i.test(baseHostname);
const FETCH_RETRIES = Math.max(
  0,
  Number(readArg("--retries", process.env.SEO_AUDIT_RETRIES || (IS_LOCAL_BASE ? "0" : "2"))),
);

const REQUIRED_URLS = [
  "/",
  "/saju",
  "/ziwei",
  "/ziwei/chart",
  "/sukuyo",
  "/sukuyo/compatibility",
  "/astrology",
  "/vedic",
  "/tarot",
  "/compatibility",
  "/dream",
  "/physiognomy",
  "/insights",
  "/insights/ziwei",
  "/insights/sukuyo",
  "/insights/saju",
  "/insights/tarot",
  "/insights/astrology",
  "/insights/vedic",
  "/insights/dream",
  "/insights/compatibility",
];

const TITLE_H1_EXPECTATIONS = {
  "/saju": {
    title: "무료 사주풀이 · 사주팔자 만세력 분석 | Code Destiny",
    h1: "무료 사주풀이와 사주팔자 만세력 분석",
  },
  "/ziwei": {
    title: "자미두수 무료 명반 · 12궁 운명 분석 | Code Destiny",
    h1: "자미두수 무료 명반과 12궁 운명 분석",
  },
  "/ziwei/chart": {
    title: "자미두수 명반 보기 · 명궁·재백궁·관록궁 해석 | Code Destiny",
    h1: "자미두수 명반으로 보는 내 인생의 12궁",
  },
  "/sukuyo": {
    title: "숙요점 무료 궁합 · 27숙 관계 분석 | Code Destiny",
    h1: "숙요점으로 보는 27숙 궁합과 관계의 흐름",
  },
  "/sukuyo/compatibility": {
    title: "숙요점 궁합 보기 · 영친·업태·안괴 관계 해석 | Code Destiny",
    h1: "숙요점 궁합으로 보는 두 사람의 관계 패턴",
  },
  "/astrology": {
    title: "무료 점성술 차트 · 태양궁·달궁·상승궁 해석 | Code Destiny",
    h1: "무료 점성술 차트와 나의 별자리 지도",
  },
  "/vedic": {
    title: "베다점성술 무료 분석 · 라그나와 카르마 차트 | Code Destiny",
    h1: "베다점성술로 보는 라그나와 카르마 블루프린트",
  },
  "/tarot": {
    title: "무료 타로 리딩 · 연애운·재회운·상대방 속마음 | Code Destiny",
    h1: "무료 타로 리딩으로 보는 지금의 마음과 선택",
  },
  "/compatibility": {
    title: "무료 궁합 보기 · 사주·숙요점·자미두수 관계 분석 | Code Destiny",
    h1: "무료 궁합 보기와 두 사람의 관계 분석",
  },
  "/dream": {
    title: "무료 꿈해몽 · 꿈의 상징과 운세 해석 | Code Destiny",
    h1: "무료 꿈해몽으로 보는 무의식의 메시지",
  },
  "/physiognomy": {
    title: "동물관상 · 얼굴 관상과 성향 분석 | Code Destiny",
    h1: "동물관상으로 보는 나의 인상과 성향",
  },
  "/insights": {
    title: "운세 인사이트 허브 · 사주·자미두수·숙요점·타로 가이드 | Code Destiny",
    h1: "운세 인사이트 허브",
  },
};

const PRIVATE_PATHS = ["/admin", "/me", "/mypage/private"];
const INSIGHTS_CATEGORY_SLUGS = new Set(["ziwei", "sukuyo", "saju", "tarot", "astrology", "vedic", "dream", "compatibility"]);

function absolute(path) {
  return new URL(path, `${BASE_URL}/`).toString();
}

function stripTags(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

async function fetchWithTimeout(url, init = {}) {
  const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

  const isRetryableError = (error) => {
    const bag = `${error?.name || ""} ${error?.message || ""}`.toLowerCase();
    return /abort|timed?out|fetch failed|econnreset|eai_again|enotfound|socket hang up/.test(bag);
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let lastNetworkError = null;
  let lastHttpResult = null;

  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        redirect: "follow",
        ...init,
        signal: controller.signal,
        headers: {
          "user-agent": "CodeDestiny-SEO-Audit/1.0",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          ...(init.headers || {}),
        },
      });

      const text = await response.text();
      const current = { ok: true, response, text, attempts: attempt + 1 };
      lastHttpResult = current;

      if (RETRYABLE_STATUS.has(response.status) && attempt < FETCH_RETRIES) {
        await wait(Math.min(2000, 250 * (attempt + 1)));
        continue;
      }

      return current;
    } catch (error) {
      lastNetworkError = error;
      if (attempt < FETCH_RETRIES && isRetryableError(error)) {
        await wait(Math.min(2000, 250 * (attempt + 1)));
        continue;
      }
      return { ok: false, error, attempts: attempt + 1 };
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastHttpResult) return lastHttpResult;
  return { ok: false, error: lastNetworkError, attempts: FETCH_RETRIES + 1 };
}

function parseTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeEntities(stripTags(m?.[1] || ""));
}

function parseMetaContent(html, matcher) {
  const metaRegex = /<meta\b[^>]*>/gi;
  const tags = html.match(metaRegex) || [];
  for (const tag of tags) {
    if (!matcher(tag)) continue;
    const m = tag.match(/content\s*=\s*(["'])([\s\S]*?)\1/i);
    if (m?.[2]) return decodeEntities(m[2].trim());
  }
  return "";
}

function parseCanonical(html) {
  const links = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of links) {
    if (!/rel\s*=\s*(["'])canonical\1/i.test(tag)) continue;
    const m = tag.match(/href\s*=\s*(["'])([\s\S]*?)\1/i);
    if (m?.[2]) return m[2].trim();
  }
  return "";
}

function parseH1(html) {
  const all = [];
  const regex = /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi;
  let m;
  while ((m = regex.exec(html))) {
    const text = decodeEntities(stripTags(m[1]));
    if (text) all.push(text);
  }
  return all;
}

function hasJsonLd(html) {
  return /<script[^>]*type\s*=\s*(["'])application\/ld\+json\1[^>]*>[\s\S]*?<\/script>/i.test(html);
}

function parseRobotsMeta(html) {
  const content = parseMetaContent(
    html,
    (tag) => /name\s*=\s*(["'])robots\1/i.test(tag) || /name\s*=\s*(["'])googlebot\1/i.test(tag),
  ).toLowerCase();
  return content;
}

async function checkHtmlPage(path, issues, checks) {
  const url = absolute(path);
  const r = await fetchWithTimeout(url);

  if (!r.ok) {
    issues.push({ level: "error", msg: `${path}: 요청 실패 (${String(r.error)})` });
    return null;
  }

  if (r.response.status !== 200) {
    issues.push({ level: "error", msg: `${path}: 상태 코드 ${r.response.status} (200 필요)` });
  }

  const html = r.text || "";
  const title = parseTitle(html);
  const description = parseMetaContent(html, (tag) => /name\s*=\s*(["'])description\1/i.test(tag));
  const canonical = parseCanonical(html);
  const h1List = parseH1(html);
  const ogTitle = parseMetaContent(html, (tag) => /property\s*=\s*(["'])og:title\1/i.test(tag));
  const ogDescription = parseMetaContent(html, (tag) => /property\s*=\s*(["'])og:description\1/i.test(tag));
  const robots = parseRobotsMeta(html);

  if (!title) issues.push({ level: "error", msg: `${path}: <title> 누락` });
  if (!description) issues.push({ level: "error", msg: `${path}: meta description 누락` });
  if (!canonical) {
    issues.push({ level: "error", msg: `${path}: canonical 누락` });
  } else {
    const canonicalUrl = new URL(canonical, `${BASE_URL}/`).toString();
    const isExpectedHost = canonicalUrl.startsWith(`${BASE_URL}/`) || canonicalUrl === BASE_URL;
    const isLocalCanonical = IS_LOCAL_BASE && canonicalUrl.startsWith("https://code-destiny.com/");
    if (!isExpectedHost && !isLocalCanonical) {
      issues.push({ level: "error", msg: `${path}: canonical이 사이트 외부를 가리킴 (${canonicalUrl})` });
    }
  }

  if (h1List.length === 0) issues.push({ level: "error", msg: `${path}: H1 누락` });
  if (!ogTitle || !ogDescription) issues.push({ level: "error", msg: `${path}: og:title 또는 og:description 누락` });
  if (!hasJsonLd(html)) issues.push({ level: "error", msg: `${path}: JSON-LD 누락` });

  if (!checks.allowNoindex && /noindex/.test(robots)) {
    issues.push({ level: "error", msg: `${path}: 공개 페이지인데 noindex 메타가 존재` });
  }

  const expectation = TITLE_H1_EXPECTATIONS[path];
  if (expectation) {
    if (!title.includes(expectation.title)) {
      issues.push({ level: "error", msg: `${path}: title 불일치 (기대 포함값: ${expectation.title})` });
    }
    const hasExpectedH1 = h1List.some((text) => text.includes(expectation.h1));
    if (!hasExpectedH1) {
      issues.push({ level: "error", msg: `${path}: H1 불일치 (기대 포함값: ${expectation.h1})` });
    }
  }

  return { path, html, title, description, canonical, h1List, robots };
}

function parseSitemapUrls(xmlText) {
  const urls = [];
  const regex = /<loc>([\s\S]*?)<\/loc>/gi;
  let m;
  while ((m = regex.exec(xmlText))) {
    const raw = String(m[1] || "").trim();
    if (!raw) continue;
    urls.push(raw);
  }
  return urls;
}

function safePathname(urlLike) {
  try {
    return new URL(urlLike).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return "";
  }
}

function toAuditUrl(urlLike) {
  if (!IS_LOCAL_BASE) return urlLike;
  try {
    const u = new URL(urlLike);
    return new URL(`${u.pathname}${u.search}${u.hash}`, `${BASE_URL}/`).toString();
  } catch {
    return urlLike;
  }
}

async function asyncPool(items, limit, worker) {
  const executing = new Set();
  const results = [];

  for (const item of items) {
    const p = Promise.resolve().then(() => worker(item));
    results.push(p);
    executing.add(p);

    const remove = () => executing.delete(p);
    p.then(remove, remove);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}

function tryReadSeoGrowthSlugs() {
  try {
    const text = fs.readFileSync(new URL("../app/insights/seo-growth-articles.js", import.meta.url), "utf8");
    const matches = Array.from(text.matchAll(/slug:\s*"([^"]+)"/g));
    return matches.map((m) => m[1]).filter(Boolean);
  } catch {
    return [];
  }
}

async function main() {
  const issues = [];
  const notes = [];

  const robotsUrl = absolute("/robots.txt");
  const sitemapUrl = absolute("/sitemap.xml");

  let robotsRes = await fetchWithTimeout(robotsUrl);
  let sitemapRes = await fetchWithTimeout(sitemapUrl);

  if ((!robotsRes.ok || robotsRes.response.status !== 200) && IS_LOCAL_BASE) {
    try {
      const robotsText = fs.readFileSync(new URL("../robots.txt", import.meta.url), "utf8");
      robotsRes = { ok: true, response: { status: 200 }, text: robotsText };
      notes.push("로컬 모드: robots.txt를 파일 시스템에서 대체 로드");
    } catch {
      // ignore fallback failure
    }
  }

  if ((!sitemapRes.ok || sitemapRes.response.status !== 200) && IS_LOCAL_BASE) {
    try {
      const sitemapText = fs.readFileSync(new URL("../sitemap.xml", import.meta.url), "utf8");
      sitemapRes = { ok: true, response: { status: 200 }, text: sitemapText };
      notes.push("로컬 모드: sitemap.xml을 파일 시스템에서 대체 로드");
    } catch {
      // ignore fallback failure
    }
  }

  if (!robotsRes.ok || robotsRes.response.status !== 200) {
    issues.push({ level: "error", msg: `robots.txt 접근 실패 (${robotsUrl})` });
  }

  if (!sitemapRes.ok || sitemapRes.response.status !== 200) {
    issues.push({ level: "error", msg: `sitemap.xml 접근 실패 (${sitemapUrl})` });
  }

  const sitemapUrls = sitemapRes.ok ? parseSitemapUrls(sitemapRes.text || "") : [];
  const sitemapPathSet = new Set(sitemapUrls.map(safePathname).filter(Boolean));
  if (sitemapUrls.length === 0) {
    issues.push({ level: "error", msg: "sitemap.xml URL 목록이 비어 있음" });
  }

  for (const path of REQUIRED_URLS) {
    const normalizedPath = safePathname(absolute(path));
    if (!sitemapPathSet.has(normalizedPath)) {
      issues.push({ level: "error", msg: `필수 URL 누락: ${path} (sitemap 미포함)` });
    }
  }

  await asyncPool(REQUIRED_URLS, CONCURRENCY, async (path) => {
    await checkHtmlPage(path, issues, { allowNoindex: false });
  });

  await checkHtmlPage("/astrology/cosmic", issues, { allowNoindex: false });

  if (robotsRes.ok) {
    const robotsText = robotsRes.text || "";
    const requiredDisallow = ["/admin/", "/me/", "/mypage/private/"];
    for (const disallowPath of requiredDisallow) {
      if (!robotsText.includes(`Disallow: ${disallowPath}`)) {
        issues.push({ level: "error", msg: `robots.txt 누락: Disallow: ${disallowPath}` });
      }
    }
  }

  if (IS_LOCAL_BASE) {
    notes.push("로컬 모드: 비공개 경로 noindex 강제 검사를 건너뜀");
  } else {
    await asyncPool(PRIVATE_PATHS, CONCURRENCY, async (path) => {
      const r = await fetchWithTimeout(absolute(path));
      if (!r.ok) {
        notes.push(`${path}: 접근 실패(인증/차단 가능)`);
        return;
      }

      if ([401, 403, 404].includes(r.response.status)) {
        notes.push(`${path}: ${r.response.status} (비공개 경로로 허용)`);
        return;
      }

      if (r.response.status === 200) {
        const robots = parseRobotsMeta(r.text || "");
        if (!/noindex/.test(robots)) {
          issues.push({ level: "error", msg: `${path}: 비공개 경로인데 noindex 없음` });
        }
      }
    });
  }

  const insightsPage = await checkHtmlPage("/insights", issues, { allowNoindex: false });
  if (insightsPage?.html) {
    const matches = Array.from(insightsPage.html.matchAll(/href\s*=\s*(["'])\/insights\/([^"'#?\/]+)\1/gi));
    const articleSlugs = new Set(matches.map((m) => String(m[2] || "").trim()).filter(Boolean));
    if (articleSlugs.size === 0) {
      if (IS_LOCAL_BASE) {
        notes.push("로컬 모드: /insights 초기 HTML에서 링크를 찾지 못했지만 런타임 렌더 가능성 있음");
      } else {
        issues.push({ level: "error", msg: "/insights 아카이브가 0건으로 감지됨" });
      }
    } else {
      notes.push(`/insights 렌더 글 수(중복 제거): ${articleSlugs.size}`);
    }
  }

  const insightSitemapUrls = sitemapUrls.filter((u) => {
    try {
      const pathname = new URL(u).pathname.replace(/\/+$/, "");
      if (!pathname.startsWith("/insights/")) return false;
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length !== 2) return false;
      return !INSIGHTS_CATEGORY_SLUGS.has(parts[1]);
    } catch {
      return false;
    }
  });

  if (insightSitemapUrls.length === 0) {
    issues.push({ level: "error", msg: "sitemap 내 인사이트 상세 URL이 0건" });
  } else {
    notes.push(`sitemap 인사이트 상세 URL 수: ${insightSitemapUrls.length}`);
  }

  const growthSlugs = tryReadSeoGrowthSlugs();
  if (growthSlugs.length > 0) {
    const missingGrowth = growthSlugs.filter((slug) => !sitemapPathSet.has(`/insights/${slug}`));
    if (missingGrowth.length > 0) {
      issues.push({ level: "error", msg: `신규 SEO 인사이트 slug 누락(${missingGrowth.length}건): ${missingGrowth.slice(0, 10).join(", ")}` });
    }
  }

  const sitemapStatusChecks = await asyncPool(sitemapUrls, CONCURRENCY, async (url) => {
    const checkUrl = toAuditUrl(url);
    const r = await fetchWithTimeout(checkUrl, { method: "GET" });
    if (!r.ok) return { url, ok: false, reason: String(r.error) };
    return { url, ok: r.response.status === 200, status: r.response.status };
  });

  const sitemapFailures = sitemapStatusChecks.filter((item) => !item.ok);
  if (sitemapFailures.length > 0) {
    const preview = sitemapFailures
      .slice(0, 15)
      .map((x) => `${x.url} (${x.status || x.reason})`)
      .join(" | ");
    issues.push({ level: "error", msg: `sitemap URL 상태코드 실패 ${sitemapFailures.length}건: ${preview}` });
  }

  const elapsedSec = ((Date.now() - globalThis.__seoAuditStart) / 1000).toFixed(1);

  console.log("\n[SEO AUDIT]", BASE_URL);
  console.log(`검사 대상 URL: ${sitemapUrls.length}개, 동시성 ${CONCURRENCY}, 타임아웃 ${REQUEST_TIMEOUT_MS}ms`);
  if (notes.length > 0) {
    for (const note of notes) {
      console.log(`- NOTE: ${note}`);
    }
  }

  if (issues.length > 0) {
    console.log(`\n실패 ${issues.length}건`);
    for (const issue of issues) {
      console.log(`- ${issue.level.toUpperCase()}: ${issue.msg}`);
    }
    console.log(`\n완료 시간: ${elapsedSec}s`);
    process.exitCode = 1;
    return;
  }

  console.log("\n모든 SEO 감사 항목 통과");
  console.log(`완료 시간: ${elapsedSec}s`);
}

globalThis.__seoAuditStart = Date.now();
main();
