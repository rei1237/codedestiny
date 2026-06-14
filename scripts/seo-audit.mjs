import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = (process.env.SEO_AUDIT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const outJson = path.resolve("seo-audit-report.json");
const outMd = path.resolve("seo-audit-report.md");
const crawlSitemap = process.argv.includes("--crawl-sitemap");

const indexablePaths = [
  "/",
  "/about",
  "/faq",
  "/methodology",
  "/manse",
  "/saju/basic",
  "/saju/compatibility",
  "/tarot",
  "/tarot/reunion",
  "/tarot/mindscan",
  "/ziwei",
  "/astrology",
  "/sukuyo",
  "/vedic",
  "/dream",
  "/today",
  "/love",
  "/premium-reports",
  "/pdf/life-book",
  "/pdf/love-report",
  "/pdf/new-year",
  "/high-value",
  "/high-value/complete-guide-to-saju",
  "/high-value/how-tarot-actually-works",
  "/high-value/understanding-your-destiny",
  "/high-value/what-your-birth-date-says-about-you",
  "/high-value/top-10-signs-of-compatibility",
  "/high-value/common-user-questions-faq",
];

const noindexPaths = [
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
  "/en",
  "/ja",
  "/zh",
];

const seedPathsToAudit = [...new Set([...indexablePaths, ...noindexPaths])];

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
  const shouldBeIndexed = indexablePaths.includes(normalizedPath) || sitemapIndexablePaths.has(normalizedPath);
  const shouldBeNoindex = noindexPaths.includes(normalizedPath);
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

function buildIssues(rows, support) {
  const issues = [];
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

const sitemapPaths = crawlSitemap ? await readSitemapPaths() : [];
const sitemapIndexablePaths = new Set(sitemapPaths);
const pathsToAudit = [...new Set([...seedPathsToAudit, ...sitemapPaths])];

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
