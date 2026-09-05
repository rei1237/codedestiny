import fs from "node:fs/promises";
import path from "node:path";

const PRODUCTION_ORIGIN = "https://code-destiny.com";

// `--source=out` 은 빌드 산출물(out/)을 **파일로** 읽어 감사한다(네트워크 요청 0회).
// HTTP 모드가 못 보는 층이 있어서 붙였다 — canonical 상속, `_headers` X-Robots-Tag 와
// meta robots 의 충돌, hreflang 상호참조, 그리고 **실제 링크 그래프**다. 소스 grep 으로는
// `/fortune/${period}/${sign}` 같은 템플릿 문자열 때문에 고아 판정이 위양성 148건을 냈다.
// 파서는 새로 만들지 않고 아래 기존 함수(getCanonical/getHreflang/getJsonLd/...)를 그대로 쓴다.
const sourceArg = process.argv.find((arg) => arg.startsWith("--source="));
const source = sourceArg ? sourceArg.slice("--source=".length) : "http";
if (source !== "http" && source !== "out") {
  console.error(`unknown --source=${source} (expected "http" or "out")`);
  process.exit(1);
}
const artifactRoot = path.resolve(process.env.SEO_AUDIT_OUT_DIR || "out");
// 🔴 out 모드의 기준 오리진은 프로덕션이다. 산출물 HTML 의 canonical·og:url 이 절대 URL 이라
//    localhost 를 기준으로 잡으면 전 페이지가 "canonical 불일치"로 오보고된다.
const baseUrl = source === "out"
  ? PRODUCTION_ORIGIN
  : (process.env.SEO_AUDIT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
// 프로덕션 대상 리포트를 덮지 않도록 파일명을 분리한다.
const reportSuffix = source === "out" ? "-out" : "";
const outJson = path.resolve(`seo-audit-report${reportSuffix}.json`);
const outMd = path.resolve(`seo-audit-report${reportSuffix}.md`);
const crawlSitemap = process.argv.includes("--crawl-sitemap");

// 🔴 색인 대상의 정본은 **사이트맵**이지 이 파일의 배열이 아니다.
//
// 예전에는 여기 하드코딩한 목록이 판정을 지배했고, 그 목록이 정본과 갈라진 채 방치돼
// **프로덕션 상대 실행이 이슈 11건을 뱉는데 그중 10건이 거짓**이었다(2026-08-14 실측):
//   - `/saju/basic` `/tarot/reunion` `/premium-reports` `/pdf/life-book` `/pdf/love-report`
//     을 "색인 대상"으로 단언했지만, 이 다섯은 `scripts/generate-sitemap.mjs` 의
//     `noindexPathPrefixes` 가 **일부러** 빼는 경로다(정적 셸 사본이거나 PDF 랜딩).
//     → "indexable page has noindex" 5건.
//   - `/en` `/ja` `/zh` 를 "비공개" 로 단언했지만 셋 다 사이트맵에 있는 실제 로케일 홈이다.
//     → "private/test page is missing noindex" 3건.
//   - 거기서 파생된 2건: `/pdf/life-book` 이 리다이렉트라 H1 이 0개라는 신고, 그리고
//     저 넷의 canonical 이 사이트맵에 없다는 신고. **잘못된 전제가 이슈를 번식시킨다.**
//
// 거짓이 10/11 인 감사는 아무도 읽지 않게 된다. 그래서 목록을 고치는 대신
// **사이트맵에서 유도**하도록 바꿨다. 아래 seed 는 "판정 기준"이 아니라 두 가지 용도다:
//   ① 사이트맵을 못 읽었을 때의 폴백
//   ② 사이트맵과 어긋나면 **이슈로 신고**해서 이 목록이 다시 조용히 썩지 않게 하는 장치
const seedIndexablePaths = [
  "/",
  "/about",
  "/faq",
  "/methodology",
  "/manse",
  "/saju/compatibility",
  "/tarot",
  "/tarot/mindscan",
  "/ziwei",
  "/astrology",
  "/sukuyo",
  "/vedic",
  "/dream",
  "/today",
  "/love",
  "/sukuyo-compatibility-ai",
  "/guides",
  "/guides/complete-guide-to-saju",
  "/guides/how-tarot-actually-works",
  "/guides/understanding-your-destiny",
  "/guides/what-your-birth-date-says-about-you",
  "/guides/top-10-signs-of-compatibility",
  "/guides/common-user-questions-faq",
];

// 사이트맵에 애초에 들어가지 않는 비공개·인증 라우트의 점검용 표본.
// 🔴 로케일 홈(`/en` `/ja` `/zh`)을 여기 넣지 말 것 — 사이트맵에 있는 색인 대상이다.
const seedNoindexPaths = [
  "/login",
  "/signup",
  "/profile",
  "/payment",
  "/checkout",
  "/success",
  "/fail",
  "/points",
  "/admin",
  "/api-hello-test",
];

const seedPathsToAudit = [...new Set([...seedIndexablePaths, ...seedNoindexPaths])];

function normalizePathname(pathname) {
  const cleanPath = pathname.replace(/\/+$/, "");
  return cleanPath || "/";
}

function absoluteUrl(inputPath) {
  return new URL(inputPath, `${baseUrl}/`).toString();
}

function productionUrl(inputPath) {
  const cleanPath = inputPath === "/" ? "/" : `${normalizePathname(inputPath)}/`;
  return new URL(cleanPath, "https://code-destiny.com").toString();
}

async function readSitemapPaths() {
  try {
    const { response, text } = await fetchText(absoluteUrl("/sitemap.xml"));
    if (response.status !== 200) return [];
    return [...text.matchAll(/<loc>([^<]+)<\/loc>/gi)]
      .map((match) => decodeHtml(match[1]))
      .map((href) => {
        try {
          return normalizePathname(new URL(href).pathname);
        } catch {
          return "";
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value = "") {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, " ")
    .trim();
}

function getTagContent(html, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta\\s+[^>]*(?:name|property)=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i");
  const match = html.match(pattern);
  return decodeHtml(match?.[1] || "");
}

function getTitle(html) {
  return decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
}

function getCanonical(html) {
  return decodeHtml(html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] || "");
}

function getLang(html) {
  return decodeHtml(html.match(/<html\s+[^>]*lang=["']([^"']+)["'][^>]*>/i)?.[1] || "");
}

function getHreflang(html) {
  const links = [];
  const pattern = /<link\s+[^>]*rel=["']alternate["'][^>]*>/gi;
  for (const tag of html.match(pattern) || []) {
    const lang = tag.match(/hreflang=["']([^"']+)["']/i)?.[1];
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (lang && href) links.push({ lang, href });
  }
  return links;
}

function getH1s(html) {
  return [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => stripTags(match[1]));
}

function getJsonLd(html) {
  const blocks = [...html.matchAll(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return blocks.map((match) => {
    const raw = match[1].trim();
    try {
      return { valid: true, raw, parsed: JSON.parse(raw) };
    } catch (error) {
      return { valid: false, raw, error: error.message };
    }
  });
}

function getImagesMissingAlt(html) {
  // 🔴 원본 HTML 을 그대로 훑지 말 것. 정적 셸은 주석과 인라인 스크립트 안에 `<img>` 라는
  //    **문자열**을 갖고 있어서(예: "정적 <img>가 박혀 있는 카드만…") alt 없는 이미지로
  //    잡힌다. 2026-08-27 실측: 5개 셸에서 신고된 10건이 전부 이 위양성이었다.
  const markup = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const images = [...markup.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  return images.filter((tag) => !/\salt=["'][^"']*["']/i.test(tag)).length;
}

function getInternalLinks(html) {
  const links = new Set();
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = match[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const url = new URL(href, `${baseUrl}/`);
      if (url.origin === baseUrl) links.add(url.pathname);
    } catch {}
  }
  return [...links];
}

function hasNoindex(html) {
  const robots = [getTagContent(html, "robots"), getTagContent(html, "googlebot")].join(",").toLowerCase();
  return robots.includes("noindex");
}

/**
 * out/ 산출물에서 URL 하나를 읽는다. `output: "export"` 규약대로
 * `/` → `out/index.html`, `/x` → `out/x/index.html`(없으면 `out/x.html`),
 * 확장자가 있으면 `out/<그대로>`. 없으면 404 로 취급해 HTTP 모드와 같은 모양을 돌려준다.
 */
async function readArtifact(url) {
  const { pathname } = new URL(url);
  let rel;
  try {
    rel = decodeURIComponent(pathname).replace(/^\/+/, "").replace(/\/+$/, "");
  } catch {
    return { response: { status: 400 }, text: "" };
  }
  const candidates = rel === ""
    ? ["index.html"]
    : /\.[a-z0-9]+$/i.test(rel)
      ? [rel]
      : [`${rel}/index.html`, `${rel}.html`];
  for (const candidate of candidates) {
    const file = path.resolve(artifactRoot, ...candidate.split("/"));
    if (!file.startsWith(artifactRoot)) continue;
    try {
      return { response: { status: 200 }, text: await fs.readFile(file, "utf8") };
    } catch {}
  }
  return { response: { status: 404 }, text: "" };
}

async function fetchText(url) {
  if (source === "out") return readArtifact(url);
  const response = await fetch(url, { redirect: "follow" });
  const text = await response.text().catch(() => "");
  return { response, text };
}

async function auditPath(inputPath, sitemapIndexablePaths = new Set()) {
  const url = absoluteUrl(inputPath);
  const normalizedPath = normalizePathname(inputPath);
  // 사이트맵을 읽었으면 그것만이 판정 기준이다. 못 읽었을 때만 seed 로 폴백한다.
  const shouldBeIndexed = sitemapIndexablePaths.size > 0
    ? sitemapIndexablePaths.has(normalizedPath)
    : seedIndexablePaths.includes(normalizedPath);
  const shouldBeNoindex = seedNoindexPaths.includes(normalizedPath);
  try {
    let { response, text } = await fetchText(url);
    if (response.status === 404 && inputPath !== "/" && !inputPath.endsWith("/")) {
      const retry = await fetchText(absoluteUrl(`${inputPath}/`));
      if (retry.response.status < 400) {
        response = retry.response;
        text = retry.text;
      }
    }
    const jsonLd = getJsonLd(text);
    const h1s = getH1s(text);
    const bodyText = stripTags(text);
    return {
      url,
      path: inputPath,
      httpStatus: response.status,
      robots: hasNoindex(text) ? "noindex" : "index",
      canonicalUrl: getCanonical(text),
      title: getTitle(text),
      metaDescription: getTagContent(text, "description"),
      h1Count: h1s.length,
      h1Text: h1s,
      ogTitle: getTagContent(text, "og:title"),
      ogDescription: getTagContent(text, "og:description"),
      ogImage: getTagContent(text, "og:image"),
      twitterCard: getTagContent(text, "twitter:card"),
      lang: getLang(text),
      hreflang: getHreflang(text),
      hasStructuredData: jsonLd.length > 0,
      jsonLdValid: jsonLd.every((item) => item.valid),
      jsonLdErrors: jsonLd.filter((item) => !item.valid).map((item) => item.error),
      missingImageAltCount: getImagesMissingAlt(text),
      bodyTextLength: bodyText.length,
      internalLinkCount: getInternalLinks(text).length,
      shouldBeIndexed,
      shouldBeNoindex,
      error: null,
    };
  } catch (error) {
    return {
      url,
      path: inputPath,
      httpStatus: 0,
      robots: "unknown",
      canonicalUrl: "",
      title: "",
      metaDescription: "",
      h1Count: 0,
      h1Text: [],
      ogTitle: "",
      ogDescription: "",
      ogImage: "",
      twitterCard: "",
      lang: "",
      hreflang: [],
      hasStructuredData: false,
      jsonLdValid: false,
      jsonLdErrors: [error.message],
      missingImageAltCount: 0,
      bodyTextLength: 0,
      internalLinkCount: 0,
      shouldBeIndexed,
      shouldBeNoindex,
      error: error.message,
    };
  }
}

function duplicateMap(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!value) continue;
    const bucket = map.get(value) || [];
    bucket.push(row.path);
    map.set(value, bucket);
  }
  return [...map.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([value, paths]) => ({ value, paths }));
}

async function auditSitemapAndRobots(rows) {
  const sitemapUrl = absoluteUrl("/sitemap.xml");
  const robotsUrl = absoluteUrl("/robots.txt");
  const sitemap = { url: sitemapUrl, status: 0, urls: [], errors: [] };
  const robots = { url: robotsUrl, status: 0, hasSitemap: false, disallows: [], errors: [] };

  try {
    const { response, text } = await fetchText(sitemapUrl);
    sitemap.status = response.status;
    sitemap.urls = [...text.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => decodeHtml(match[1]));
  } catch (error) {
    sitemap.errors.push(error.message);
  }

  try {
    const { response, text } = await fetchText(robotsUrl);
    robots.status = response.status;
    robots.hasSitemap = /sitemap:\s*https?:\/\/\S+\/sitemap\.xml/i.test(text);
    robots.disallows = [...text.matchAll(/^disallow:\s*(.+)$/gim)].map((match) => match[1].trim());
  } catch (error) {
    robots.errors.push(error.message);
  }

  const noindexInSitemap = rows
    .filter((row) => row.robots === "noindex")
    .filter((row) => sitemap.urls.includes(productionUrl(row.path)))
    .map((row) => row.path);

  const canonicalMismatch = rows
    .filter((row) => row.shouldBeIndexed && row.httpStatus === 200)
    .filter((row) => row.canonicalUrl && !sitemap.urls.includes(row.canonicalUrl))
    .map((row) => ({ path: row.path, canonicalUrl: row.canonicalUrl }));

  return { sitemap, robots, noindexInSitemap, canonicalMismatch };
}

/**
 * seed 목록이 사이트맵과 어긋나면 신고한다.
 *
 * 이 감사가 거짓 이슈 8건을 상시로 뱉고 있던 이유가 정확히 이 드리프트였다. 목록을 한 번
 * 고치는 것만으로는 다음에 또 갈라지고, 그때도 아무도 모른다 — 그래서 어긋남 자체를 실패로 만든다.
 */
function buildSeedDriftIssues(sitemapPathSet) {
  if (sitemapPathSet.size === 0) {
    return ["/sitemap.xml: 읽지 못해 seed 목록으로 판정했다 — 색인 판정 결과를 신뢰하지 말 것"];
  }
  const issues = [];
  for (const path of seedIndexablePaths) {
    if (!sitemapPathSet.has(path)) {
      issues.push(`seed drift: ${path} 가 seedIndexablePaths 에 있는데 사이트맵에 없다 — 의도적 noindex 면 이 목록에서 지울 것`);
    }
  }
  for (const path of seedNoindexPaths) {
    if (sitemapPathSet.has(path)) {
      issues.push(`seed drift: ${path} 가 seedNoindexPaths 에 있는데 사이트맵에 있다 — 색인 대상이면 이 목록에서 지울 것`);
    }
  }
  return issues;
}

function buildIssues(rows, support) {
  const issues = [...buildSeedDriftIssues(sitemapIndexablePaths)];
  for (const row of rows) {
    if (row.error) issues.push(`${row.path}: fetch failed (${row.error})`);
    if (row.shouldBeIndexed && row.httpStatus !== 200) issues.push(`${row.path}: indexable page is not 200`);
    if (row.shouldBeIndexed && row.robots === "noindex") issues.push(`${row.path}: indexable page has noindex`);
    if (row.shouldBeNoindex && row.httpStatus === 200 && row.robots !== "noindex") issues.push(`${row.path}: private/test page is missing noindex`);
    if (row.shouldBeIndexed && !row.title) issues.push(`${row.path}: missing title`);
    if (row.shouldBeIndexed && !row.metaDescription) issues.push(`${row.path}: missing meta description`);
    if (row.shouldBeIndexed && row.h1Count !== 1) issues.push(`${row.path}: expected exactly one H1, found ${row.h1Count}`);
    if (row.shouldBeIndexed && !row.canonicalUrl) issues.push(`${row.path}: missing canonical`);
    if (row.shouldBeIndexed && !row.ogImage) issues.push(`${row.path}: missing OG image`);
    if (row.hasStructuredData && !row.jsonLdValid) issues.push(`${row.path}: invalid JSON-LD`);
  }
  if (support.sitemap.status !== 200) issues.push("/sitemap.xml: not 200");
  if (support.robots.status !== 200) issues.push("/robots.txt: not 200");
  if (!support.robots.hasSitemap) issues.push("/robots.txt: missing sitemap directive");
  if (support.noindexInSitemap.length > 0) issues.push(`sitemap includes noindex paths: ${support.noindexInSitemap.join(", ")}`);
  if (support.canonicalMismatch.length > 0) issues.push(`canonical URL missing from sitemap: ${support.canonicalMismatch.map((item) => item.path).join(", ")}`);
  return issues;
}

// ── 산출물 전수 스윕 (`--source=out` 전용) ─────────────────────────────────
// 위의 라우트별 감사는 "사이트맵에 있는 것"만 본다. 여기서는 out/ 의 HTML 을 전부 열어
// 색인 정책의 사각지대와 관계형 결함(자기참조 canonical, hreflang 역방향, breadcrumb 목적지,
// 인바운드 링크 0)을 잡는다. 판정 근거는 전부 산출물이고, 손으로 쓴 대상 목록은 두지 않는다.

// 라우트가 아닌 산출물. 색인 정책 판정에서 제외한다.
const ARTIFACT_ROUTE_EXCLUDE = new Set(["/404", "/500"]);

async function listArtifactRoutes() {
  const found = new Map();
  const stack = [artifactRoot];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // _next 는 정적 자산이라 라우트가 아니다.
        if (entry.name !== "_next") stack.push(full);
        continue;
      }
      if (!entry.name.endsWith(".html")) continue;
      const rel = path.relative(artifactRoot, full).split(path.sep).join("/");
      const isIndexFile = rel === "index.html" || rel.endsWith("/index.html");
      const routePath = rel === "index.html"
        ? "/"
        : isIndexFile
          ? `/${rel.slice(0, -"/index.html".length)}`
          : `/${rel.slice(0, -".html".length)}`;
      // `X/index.html` 과 `X.html` 이 둘 다 있으면 전자가 정본이다.
      if (found.has(routePath) && !isIndexFile) continue;
      found.set(routePath, full);
    }
  }
  return found;
}

async function readFirstExisting(files) {
  for (const file of files) {
    try {
      return await fs.readFile(file, "utf8");
    } catch {}
  }
  return "";
}

/**
 * Cloudflare `_headers` 에서 X-Robots-Tag 규칙만 뽑는다.
 * 들여쓰지 않은 줄이 경로 패턴, 들여쓴 줄이 그 패턴의 헤더다.
 * 🔴 Cloudflare 의 정확한 우선순위까지 재현하지 않는다 — 목적이 "충돌 탐지"이므로
 *    매칭되는 규칙을 전부 모아 하나라도 noindex 면 noindex 로 본다.
 */
function parseHeaderRobotsRules(text) {
  const rules = [];
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (/^\s/.test(rawLine)) {
      const match = trimmed.match(/^X-Robots-Tag:\s*(.+)$/i);
      if (match && current) current.robots = match[1].trim().toLowerCase();
      continue;
    }
    current = { pattern: trimmed, robots: "" };
    rules.push(current);
  }
  return rules.filter((rule) => rule.robots && rule.pattern.startsWith("/"));
}

function headerRobotsFor(routePath, rules) {
  const values = [];
  for (const rule of rules) {
    const matched = rule.pattern.endsWith("*")
      ? routePath.startsWith(rule.pattern.slice(0, -1))
      : normalizePathname(rule.pattern) === routePath;
    if (matched) values.push(rule.robots);
  }
  return values;
}

/** @graph·배열을 펼쳐 JSON-LD 노드를 전부 돌려준다. */
function flattenJsonLd(value) {
  const nodes = [];
  const visit = (node) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") return;
    nodes.push(node);
    if (node["@graph"]) visit(node["@graph"]);
  };
  visit(value);
  return nodes;
}

function pathFromUrl(href) {
  try {
    return normalizePathname(new URL(href, `${baseUrl}/`).pathname);
  } catch {
    return "";
  }
}

/**
 * 산출물 라우트 조회. `X.html` 은 Cloudflare Pages 가 확장자를 떼고 `X` 로 서빙하므로
 * 두 표기를 같은 문서로 본다(이 별칭이 없으면 `/ifa-oracle` 의 canonical 이 위양성이 된다).
 */
function lookupArtifactPage(pages, routePath) {
  if (pages.has(routePath)) return routePath;
  const stripped = routePath.replace(/\.html$/i, "");
  return stripped !== routePath && pages.has(stripped) ? stripped : "";
}

/**
 * 사이트맵의 `xhtml:link rel="alternate"` 을 경로별로 모은다.
 * Google 은 HTML link 태그 · HTTP 헤더 · 사이트맵을 **동등한** hreflang 전달 수단으로 본다
 * (Search Central, Localized versions). 홈 `/` 은 정적 셸 승격본이라 HTML 태그가 없지만
 * 사이트맵이 alternate 를 싣고 있으므로 역방향 링크가 성립한다.
 * 반환값은 경로 → Map<목적지 경로, hreflang 코드 배열>. Set 처럼 has/size 로도 쓴다.
 */
async function readSitemapAlternates() {
  const { response, text } = await fetchText(absoluteUrl("/sitemap.xml"));
  if (response.status !== 200) return new Map();
  const map = new Map();
  for (const block of text.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const body = block[1];
    const loc = body.match(/<loc>([^<]+)<\/loc>/i);
    if (!loc) continue;
    const from = pathFromUrl(decodeHtml(loc[1]));
    if (!from) continue;
    const targets = new Map();
    for (const alt of body.matchAll(/hreflang="([^"]+)"\s+href="([^"]+)"/gi)) {
      const to = pathFromUrl(decodeHtml(alt[2]));
      if (to) targets.set(to, [...(targets.get(to) || []), alt[1]]);
    }
    map.set(from, targets);
  }
  return map;
}

async function auditArtifacts(sitemapPathSet) {
  const routeFiles = await listArtifactRoutes();
  const headerRules = parseHeaderRobotsRules(
    await readFirstExisting([path.join(artifactRoot, "_headers"), path.resolve("_headers")]),
  );
  const sitemapAlternates = await readSitemapAlternates();
  const pages = new Map();
  const inbound = new Map();

  for (const [routePath, file] of routeFiles) {
    const html = await fs.readFile(file, "utf8");
    const jsonLdBlocks = getJsonLd(html);
    const jsonLdTypes = new Set();
    const breadcrumbItems = [];
    let jsonLdMissingType = false;
    for (const block of jsonLdBlocks) {
      if (!block.valid) continue;
      const nodes = flattenJsonLd(block.parsed);
      if (nodes.length === 0 || nodes.every((node) => !node["@type"])) jsonLdMissingType = true;
      for (const node of nodes) {
        const types = [].concat(node["@type"] || []);
        types.forEach((type) => jsonLdTypes.add(String(type)));
        if (!types.includes("BreadcrumbList")) continue;
        for (const element of [].concat(node.itemListElement || [])) {
          const item = element && element.item;
          const id = typeof item === "string" ? item : (item && item["@id"]) || (element && element["@id"]);
          if (id) breadcrumbItems.push(String(id));
        }
      }
    }
    for (const link of new Set(getInternalLinks(html).map(normalizePathname))) {
      if (link === routePath) continue;
      inbound.set(link, (inbound.get(link) || 0) + 1);
    }
    pages.set(routePath, {
      canonical: getCanonical(html),
      metaNoindex: hasNoindex(html),
      hreflang: getHreflang(html),
      headerRobots: headerRobotsFor(routePath, headerRules),
      jsonLdTypes: [...jsonLdTypes],
      jsonLdValid: jsonLdBlocks.every((block) => block.valid),
      jsonLdMissingType,
      breadcrumbItems,
    });
  }

  // `/x.html` 로 걸린 링크는 Pages 가 308 로 `/x` 에 붙인다(2026-08-27 프로덕션 실측:
  // `/destiny-poker.html` → 308 → `/destiny-poker`). 접지 않으면 사이트맵 표기가 `/x` 인
  // 페이지가 인바운드 0 으로 잡히는 위양성이 난다.
  for (const [linkPath, count] of [...inbound]) {
    const resolved = lookupArtifactPage(pages, linkPath);
    if (!resolved || resolved === linkPath) continue;
    inbound.set(resolved, (inbound.get(resolved) || 0) + count);
    inbound.delete(linkPath);
  }

  const issues = [];
  const headerNoindex = (page) => page.headerRobots.some((value) => value.includes("noindex"));

  // 1. 사이트맵 URL 은 자기 자신을 canonical 로 가리켜야 한다.
  for (const routePath of sitemapPathSet) {
    const page = pages.get(routePath);
    if (!page) {
      issues.push(`artifact: ${routePath} 는 사이트맵에 있는데 out/ 에 HTML 이 없다`);
      continue;
    }
    if (!page.canonical) {
      issues.push(`artifact: ${routePath} 에 canonical 이 없다`);
      continue;
    }
    const canonicalPath = pathFromUrl(page.canonical);
    if (canonicalPath !== routePath) {
      issues.push(`artifact: ${routePath} 의 canonical 이 자기 자신이 아니다 (${page.canonical})`);
    }
  }

  // 2. 사이트맵 밖 페이지가 다른 URL 로 canonical 을 위임하면 그 목적지가 색인 대상이어야 한다.
  for (const [routePath, page] of pages) {
    if (sitemapPathSet.has(routePath) || !page.canonical) continue;
    // 자기 자신이 색인 대상이 아니면 어디를 가리키든 색인에 영향이 없다(/admin/* 등).
    if (page.metaNoindex || headerNoindex(page)) continue;
    const canonicalPath = pathFromUrl(page.canonical);
    if (!canonicalPath || canonicalPath === routePath) continue;
    const resolved = lookupArtifactPage(pages, canonicalPath);
    if (!resolved) {
      issues.push(`artifact: ${routePath} 의 canonical 목적지 ${canonicalPath} 가 out/ 에 없다`);
    } else if (!sitemapPathSet.has(resolved)) {
      issues.push(`artifact: ${routePath} 의 canonical 목적지 ${resolved} 가 사이트맵에 없다`);
    } else if (pages.get(resolved).metaNoindex) {
      issues.push(`artifact: ${routePath} 의 canonical 목적지 ${resolved} 가 noindex 다`);
    }
  }

  // 3. 색인 대상인데 noindex 신호가 붙은 것. meta 와 헤더 양쪽을 본다(헤더가 더 세다).
  for (const routePath of sitemapPathSet) {
    const page = pages.get(routePath);
    if (!page) continue;
    if (page.metaNoindex) issues.push(`artifact: ${routePath} 는 사이트맵에 있는데 meta robots 가 noindex 다`);
    if (headerNoindex(page)) issues.push(`artifact: ${routePath} 는 사이트맵에 있는데 _headers 가 noindex 다`);
  }

  // 4. hreflang 상호참조 — 목적지가 실재하고, 되돌아오는 alternate 를 갖고, x-default 는 1개.
  //    2026-09-05 까지는 HTML 에 hreflang 이 없는 페이지를 `continue` 로 통째로 건너뛰었는데,
  //    실측(같은 날 SEO 진단 F-09)으로 hreflang 을 HTML 태그로 가진 산출물은 1개뿐이고 나머지
  //    그래프는 전부 사이트맵 xhtml:link 에 있었다 — 즉 이 검사가 사실상 아무것도 안 보고 있었다.
  //    이제 HTML 태그와 사이트맵 alternate 를 합쳐 한 그래프로 보고, 어느 쪽에도 없는 페이지는
  //    (가) 로케일 접두 아래 색인 대상이면 이슈(다른 언어판이 있다는 뜻인데 서로를 안 가리킨다),
  //    (나) 접두 없는 한국어 단독 라우트(실측 401개)면 정상으로 둔다. 예외는 `/ja/` 접두 하나 —
  //    特定商取引法 표기처럼 일본 전용이라 다른 로케일이 존재하지 않는 라우트다.
  //    로케일 접두 집합은 손글 목록이 아니라 사이트맵 alternate 의 lang↔경로 첫 조각에서 뽑는다(원칙 10).
  const localePrefixes = new Set();
  for (const targets of sitemapAlternates.values()) {
    for (const [targetPath, langs] of targets) {
      const seg = targetPath.split("/")[1] || "";
      for (const code of langs.map((lang) => lang.toLowerCase())) {
        if (!seg || code === "x-default") continue;
        if (code === seg || code.split("-")[0] === seg.split("-")[0]) localePrefixes.add(seg);
      }
    }
  }
  const declaredAlternates = (routePath, page) => {
    const merged = new Map();
    // 같은 (lang, 목적지) 를 HTML·사이트맵 양쪽이 선언하면 하나로 센다 — href 는 절대 URL 과 경로가
    // 섞여 오므로 경로로 정규화한다(안 하면 x-default 가 2개로 잡히는 위양성이 난다 — 2026-09-05 실측).
    for (const { lang, href } of page.hreflang) {
      merged.set(`${lang.toLowerCase()}|${pathFromUrl(href)}`, { lang, href, from: "HTML" });
    }
    for (const [targetPath, langs] of sitemapAlternates.get(routePath) || new Map()) {
      for (const lang of langs) {
        const key = `${lang.toLowerCase()}|${targetPath}`;
        if (!merged.has(key)) merged.set(key, { lang, href: targetPath, from: "사이트맵" });
      }
    }
    return [...merged.values()];
  };
  for (const [routePath, page] of pages) {
    const alternates = declaredAlternates(routePath, page);
    if (alternates.length === 0) {
      const prefix = routePath.split("/")[1] || "";
      if (sitemapPathSet.has(routePath) && localePrefixes.has(prefix) && prefix !== "ja") {
        issues.push(`artifact: ${routePath} 는 /${prefix}/ 로케일판인데 hreflang 이 HTML·사이트맵 어느 쪽에도 없다 (일본 전용 /ja/ 접두만 허용)`);
      }
      continue;
    }
    const xDefaults = alternates.filter((link) => link.lang.toLowerCase() === "x-default");
    if (xDefaults.length !== 1) {
      issues.push(`artifact: ${routePath} 의 x-default 가 ${xDefaults.length}개다 (1개여야 한다)`);
    }
    for (const { lang, href, from } of alternates) {
      const targetPath = pathFromUrl(href);
      if (!targetPath) {
        issues.push(`artifact: ${routePath} 의 hreflang(${lang}) href 를 URL 로 못 읽었다 (${href})`);
        continue;
      }
      const target = pages.get(targetPath);
      if (!target) {
        issues.push(`artifact: ${routePath} 의 ${from} hreflang(${lang}) 목적지 ${targetPath} 가 out/ 에 없다`);
        continue;
      }
      if (targetPath === routePath) continue;
      // 역방향은 HTML 태그 **또는** 사이트맵 alternate 중 하나만 있으면 성립한다.
      const reciprocal = target.hreflang.some((link) => pathFromUrl(link.href) === routePath)
        || (sitemapAlternates.get(targetPath) || new Map()).has(routePath);
      if (!reciprocal) {
        issues.push(`artifact: hreflang 역방향 누락 — ${routePath} → ${targetPath} 는 있는데 ${targetPath} 가 HTML·사이트맵 어느 쪽으로도 ${routePath} 를 안 가리킨다`);
      }
    }
  }

  // 5. JSON-LD 건전성 — 색인 대상만 본다.
  for (const routePath of sitemapPathSet) {
    const page = pages.get(routePath);
    if (!page) continue;
    if (!page.jsonLdValid) issues.push(`artifact: ${routePath} 의 JSON-LD 가 파싱되지 않는다`);
    if (page.jsonLdMissingType) issues.push(`artifact: ${routePath} 의 JSON-LD 블록에 @type 이 없다`);
    for (const item of page.breadcrumbItems) {
      const itemPath = pathFromUrl(item);
      if (itemPath && !lookupArtifactPage(pages, itemPath)) {
        issues.push(`artifact: ${routePath} 의 BreadcrumbList item ${itemPath} 가 out/ 에 없다`);
      }
    }
  }

  // 6. 진짜 고아 — out/ HTML 전량의 <a href> 로 센 인바운드가 0인 사이트맵 URL.
  const orphans = [...sitemapPathSet]
    .filter((routePath) => routePath !== "/")
    .filter((routePath) => !(inbound.get(routePath) > 0))
    .sort();
  if (orphans.length > 0) {
    issues.push(`artifact: 내부 인바운드 링크가 0인 사이트맵 URL ${orphans.length}개 — ${orphans.slice(0, 10).join(", ")}${orphans.length > 10 ? " …" : ""}`);
  }

  // 7. 색인 정책 사각지대 — 사이트맵에 없고, noindex 신호도 없고, 다른 URL 로 위임하지도 않는 페이지.
  const strayIndexable = [];
  for (const [routePath, page] of pages) {
    if (ARTIFACT_ROUTE_EXCLUDE.has(routePath) || sitemapPathSet.has(routePath)) continue;
    if (page.metaNoindex || headerNoindex(page)) continue;
    const canonicalPath = page.canonical ? pathFromUrl(page.canonical) : "";
    if (canonicalPath && canonicalPath !== routePath) continue;
    strayIndexable.push(routePath);
  }
  strayIndexable.sort();
  if (strayIndexable.length > 0) {
    issues.push(`artifact: 사이트맵에 없는데 색인 가능한 페이지 ${strayIndexable.length}개 — ${strayIndexable.slice(0, 10).join(", ")}${strayIndexable.length > 10 ? " …" : ""}`);
  }

  const headerOnlyNoindex = [...pages.entries()]
    .filter(([routePath, page]) => !ARTIFACT_ROUTE_EXCLUDE.has(routePath) && headerNoindex(page) && !page.metaNoindex)
    .map(([routePath]) => routePath)
    .sort();

  return {
    artifactRoot,
    htmlPageCount: pages.size,
    headerRuleCount: headerRules.length,
    orphans,
    strayIndexable,
    // 헤더만 noindex 인 것은 결함이 아니다(X-Robots-Tag 가 meta 보다 세다). 규모만 남긴다.
    headerOnlyNoindex,
    issues: [...new Set(issues)],
  };
}
function mdEscape(value) {
  return String(value || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function buildMarkdown(report) {
  const lines = [];
  lines.push(`# SEO Audit Report`);
  lines.push("");
  lines.push(`- Base URL: ${report.baseUrl}`);
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Sitemap URLs: ${report.support.sitemap.urls.length}`);
  lines.push(`- Issues: ${report.issues.length}`);
  if (report.artifacts) {
    lines.push(`- Artifact root: ${report.artifacts.artifactRoot}`);
    lines.push(`- Artifact HTML pages: ${report.artifacts.htmlPageCount}`);
    lines.push(`- _headers X-Robots rules: ${report.artifacts.headerRuleCount}`);
    lines.push(`- Sitemap URLs with zero inbound links: ${report.artifacts.orphans.length}`);
    lines.push(`- Indexable pages missing from sitemap: ${report.artifacts.strayIndexable.length}`);
    lines.push(`- Header-only noindex pages (not a defect): ${report.artifacts.headerOnlyNoindex.length}`);
  }
  lines.push("");
  lines.push("## Route Matrix");
  lines.push("| URL | Status | Robots | Canonical | Title | Description | H1 | OG Image | Lang | Hreflang | JSON-LD | Missing Alt | Text Length | Links | Index Target | Duplicates |");
  lines.push("|---|---:|---|---|---|---|---|---|---|---:|---|---:|---:|---:|---|---|");
  for (const row of report.routes) {
    const duplicateFlags = [
      report.duplicates.titles.some((item) => item.paths.includes(row.path)) ? "title" : "",
      report.duplicates.descriptions.some((item) => item.paths.includes(row.path)) ? "description" : "",
    ].filter(Boolean).join(", ");
    lines.push(`| ${mdEscape(row.url)} | ${row.httpStatus} | ${row.robots} | ${mdEscape(row.canonicalUrl)} | ${mdEscape(row.title)} | ${mdEscape(row.metaDescription)} | ${mdEscape(row.h1Text.join(" / "))} | ${row.ogImage ? "yes" : "no"} | ${mdEscape(row.lang)} | ${row.hreflang.length} | ${row.hasStructuredData ? (row.jsonLdValid ? "valid" : "invalid") : "none"} | ${row.missingImageAltCount} | ${row.bodyTextLength} | ${row.internalLinkCount} | ${row.shouldBeIndexed ? "index" : row.shouldBeNoindex ? "noindex" : "review"} | ${duplicateFlags || "-"} |`);
  }
  lines.push("");
  lines.push("## Issues");
  if (report.issues.length === 0) {
    lines.push("- No blocking SEO issues detected by the automated audit.");
  } else {
    for (const issue of report.issues) lines.push(`- ${issue}`);
  }
  lines.push("");
  lines.push("## Sitemap URLs");
  for (const url of report.support.sitemap.urls) lines.push(`- ${url}`);
  return `${lines.join("\n")}\n`;
}

// 사이트맵은 **항상** 읽는다(요청 1회). 색인 판정의 정본이기 때문이다.
// `--crawl-sitemap` 은 "사이트맵의 URL 을 전부 감사할 것인가"만 정한다(현재 329개 = 그만큼 요청).
const sitemapPaths = await readSitemapPaths();
const sitemapIndexablePaths = new Set(sitemapPaths);
const pathsToAudit = [...new Set([...seedPathsToAudit, ...(crawlSitemap ? sitemapPaths : [])])];

const routes = [];
for (const inputPath of pathsToAudit) {
  routes.push(await auditPath(inputPath, sitemapIndexablePaths));
}

const duplicates = {
  titles: duplicateMap(routes.filter((row) => row.shouldBeIndexed), "title"),
  descriptions: duplicateMap(routes.filter((row) => row.shouldBeIndexed), "metaDescription"),
};
const support = await auditSitemapAndRobots(routes);
// out 모드에서만 산출물 전수 스윕을 돌린다(HTTP 모드에는 읽을 파일이 없다).
const artifacts = source === "out" ? await auditArtifacts(sitemapIndexablePaths) : null;
const report = {
  baseUrl,
  source,
  generatedAt: new Date().toISOString(),
  routes,
  duplicates,
  support,
  artifacts,
  issues: [],
};
report.issues = [...buildIssues(routes, support), ...(artifacts ? artifacts.issues : [])];

await fs.writeFile(outJson, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await fs.writeFile(outMd, buildMarkdown(report), "utf8");

console.log(`SEO audit complete: ${outJson}`);
console.log(`SEO audit markdown: ${outMd}`);
console.log(`Issues: ${report.issues.length}`);
if (report.issues.length) {
  for (const issue of report.issues.slice(0, 20)) console.log(`- ${issue}`);
  process.exitCode = 1;
}
