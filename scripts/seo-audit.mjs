import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = (process.env.SEO_AUDIT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const outJson = path.resolve("seo-audit-report.json");
const outMd = path.resolve("seo-audit-report.md");
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
  "/high-value",
  "/high-value/complete-guide-to-saju",
  "/high-value/how-tarot-actually-works",
  "/high-value/understanding-your-destiny",
  "/high-value/what-your-birth-date-says-about-you",
  "/high-value/top-10-signs-of-compatibility",
  "/high-value/common-user-questions-faq",
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
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
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

async function fetchText(url) {
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
const report = {
  baseUrl,
  generatedAt: new Date().toISOString(),
  routes,
  duplicates,
  support,
  issues: [],
};
report.issues = buildIssues(routes, support);

await fs.writeFile(outJson, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await fs.writeFile(outMd, buildMarkdown(report), "utf8");

console.log(`SEO audit complete: ${outJson}`);
console.log(`SEO audit markdown: ${outMd}`);
console.log(`Issues: ${report.issues.length}`);
if (report.issues.length) {
  for (const issue of report.issues.slice(0, 20)) console.log(`- ${issue}`);
  process.exitCode = 1;
}
