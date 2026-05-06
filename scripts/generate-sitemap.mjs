import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const sitemapRootPath = resolve(rootDir, "sitemap.xml");
const sitemapPublicPath = resolve(rootDir, "public", "sitemap.xml");
const insightsSourcePath = resolve(rootDir, "app", "insights", "articles.js");
const highValueSourcePath = resolve(rootDir, "app", "high-value", "content.js");
const siteBaseUrl = (process.env.SITE_URL || "https://code-destiny.com").replace(/\/$/, "");
const insightsApiBase = (process.env.INSIGHTS_API_BASE_URL || process.env.SITE_URL || "https://code-destiny.com").replace(/\/$/, "");
const today = new Date().toISOString().slice(0, 10);

const coreRoutes = [
  { path: "/", changefreq: "daily", priority: 1.0 },
  { path: "/about", changefreq: "monthly", priority: 0.9 },
  { path: "/faq", changefreq: "monthly", priority: 0.88 },
  { path: "/methodology", changefreq: "monthly", priority: 0.86 },
  { path: "/contact-us", changefreq: "yearly", priority: 0.6 },
  { path: "/privacy-policy", changefreq: "yearly", priority: 0.55 },
  { path: "/terms-of-service", changefreq: "yearly", priority: 0.55 },
  { path: "/insights", changefreq: "weekly", priority: 0.85 },
  { path: "/high-value", changefreq: "weekly", priority: 0.84 },
  { path: "/rss.xml", changefreq: "daily", priority: 0.2 },
  { path: "/insights/rss.xml", changefreq: "daily", priority: 0.2 },
];

function normalizeDate(dateLike) {
  const parsed = new Date(typeof dateLike === "string" ? dateLike : Date.now());
  if (Number.isNaN(parsed.getTime())) return today;
  return parsed.toISOString().slice(0, 10);
}

function extractInsightRoutes() {
  const source = readFileSync(insightsSourcePath, "utf8");
  const articleRegex =
    /{\s*slug:\s*"([^"]+)"[\s\S]*?updatedAt:\s*"([0-9]{4}-[0-9]{2}-[0-9]{2})"/g;

  const routes = [];
  const seen = new Set();

  let match;
  while ((match = articleRegex.exec(source)) !== null) {
    const slug = String(match[1] || "").trim();
    const updatedAt = String(match[2] || "").trim();

    if (!slug || seen.has(slug)) continue;

    seen.add(slug);
    routes.push({
      path: `/insights/${slug}`,
      changefreq: "monthly",
      priority: 0.74,
      lastmod: normalizeDate(updatedAt),
    });
  }

  return routes;
}

function extractHighValueRoutes() {
  const source = readFileSync(highValueSourcePath, "utf8");
  const pageRegex =
    /{\s*slug:\s*"([a-z0-9-]+)"[\s\S]*?category:\s*"([^"]+)"[\s\S]*?updatedAt:\s*"([0-9]{4}-[0-9]{2}-[0-9]{2})"/g;

  const categorySlug = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const pageRoutes = [];
  const categoryRoutes = new Map();
  const seenPage = new Set();

  let match;
  while ((match = pageRegex.exec(source)) !== null) {
    const slug = String(match[1] || "").trim();
    const category = String(match[2] || "").trim();
    const updatedAt = String(match[3] || "").trim();

    if (slug && !seenPage.has(slug)) {
      seenPage.add(slug);
      pageRoutes.push({
        path: `/high-value/${slug}`,
        changefreq: "monthly",
        priority: 0.72,
        lastmod: normalizeDate(updatedAt),
      });
    }

    const cSlug = categorySlug(category);
    if (cSlug && !categoryRoutes.has(cSlug)) {
      categoryRoutes.set(cSlug, {
        path: `/high-value/category/${cSlug}`,
        changefreq: "monthly",
        priority: 0.68,
      });
    }
  }

  return [...pageRoutes, ...Array.from(categoryRoutes.values())];
}

function toUrl(pathname) {
  return new URL(pathname, siteBaseUrl).toString();
}

async function fetchPublishedInsightsFromApi() {
  const out = [];
  const seen = new Set();

  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 200) {
    const url = `${insightsApiBase}/api/insights?sort=latest&pageSize=50&page=${page}&excludeNoIndex=1`;
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) break;

    const data = await response.json().catch(() => ({}));
    const items = Array.isArray(data?.items) ? data.items : [];

    for (const item of items) {
      const slug = String(item?.slug || "").trim();
      if (!slug) continue;

      const canonicalUrl = String(item?.canonicalUrl || "").trim()
        || `${siteBaseUrl}/insights/${encodeURIComponent(slug)}`;

      if (seen.has(canonicalUrl)) continue;
      seen.add(canonicalUrl);

      out.push({
        path: canonicalUrl.replace(siteBaseUrl, "") || "/",
        changefreq: "weekly",
        priority: 0.74,
        lastmod: normalizeDate(item?.updatedAt),
      });
    }

    hasMore = Boolean(data?.hasMore);
    page += 1;
  }

  return out;
}

async function main() {
  const dynamicInsights = await fetchPublishedInsightsFromApi().catch(() => []);
  const fallbackInsights = dynamicInsights.length > 0 ? [] : extractInsightRoutes();

  const routeEntries = [
    ...coreRoutes,
    ...fallbackInsights,
    ...dynamicInsights,
    ...extractHighValueRoutes(),
  ];

  const entryMap = new Map();

  for (const route of routeEntries) {
    const loc = toUrl(route.path);
    const next = {
      loc,
      lastmod: route.lastmod || today,
      changefreq: route.changefreq || "weekly",
      priority: Number(route.priority ?? 0.7).toFixed(2),
    };

    const prev = entryMap.get(loc);
    if (!prev) {
      entryMap.set(loc, next);
      continue;
    }

    const prevTime = new Date(prev.lastmod).getTime();
    const nextTime = new Date(next.lastmod).getTime();
    entryMap.set(loc, {
      loc,
      lastmod: Number.isFinite(nextTime) && nextTime > prevTime ? next.lastmod : prev.lastmod,
      changefreq: prev.changefreq || next.changefreq,
      priority: Number(Math.max(Number(prev.priority), Number(next.priority))).toFixed(2),
    });
  }

  const sorted = Array.from(entryMap.values()).sort((a, b) => a.loc.localeCompare(b.loc));
  const body = sorted
    .map(
      (entry) =>
        [
          "  <url>",
          `    <loc>${entry.loc}</loc>`,
          `    <lastmod>${entry.lastmod}</lastmod>`,
          `    <changefreq>${entry.changefreq}</changefreq>`,
          `    <priority>${entry.priority}</priority>`,
          "  </url>",
        ].join("\n"),
    )
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    "</urlset>",
    "",
  ].join("\n");

  writeFileSync(sitemapRootPath, xml, "utf8");
  writeFileSync(sitemapPublicPath, xml, "utf8");
  console.log(`[sitemap] Generated ${sorted.length} URLs -> sitemap.xml, public/sitemap.xml`);
}

main();
