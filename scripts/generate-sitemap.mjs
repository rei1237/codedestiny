import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const sitemapRootPath = resolve(rootDir, "sitemap.xml");
const insightsSourcePath = resolve(rootDir, "app", "insights", "articles.js");
const siteBaseUrl = (process.env.SITE_URL || "https://code-destiny.com").replace(/\/$/, "");
const today = new Date().toISOString().slice(0, 10);

const localePrefixes = [
  "",
  "/en-us",
  "/ja-jp",
  "/zh-cn",
  "/hi-in",
  "/es-es",
  "/fr-fr",
  "/de-de",
  "/nl-nl",
  "/ms-my",
];

const coreRoutes = [
  { path: "/", changefreq: "weekly", priority: 1.0 },
  { path: "/insights", changefreq: "weekly", priority: 0.9 },
  { path: "/saju/basic", changefreq: "weekly", priority: 0.9 },
  { path: "/ziwei/chart", changefreq: "weekly", priority: 0.88 },
  { path: "/astrology/cosmic", changefreq: "weekly", priority: 0.88 },
  { path: "/tarot/mingri", changefreq: "weekly", priority: 0.88 },
  { path: "/tarot/love", changefreq: "weekly", priority: 0.86 },
  { path: "/tarot/healing", changefreq: "weekly", priority: 0.86 },
  { path: "/tarot/self-esteem", changefreq: "weekly", priority: 0.84 },
  { path: "/tarot/reunion", changefreq: "weekly", priority: 0.84 },
  { path: "/tarot/year", changefreq: "weekly", priority: 0.84 },
  { path: "/oracle/hwatu", changefreq: "weekly", priority: 0.82 },
  { path: "/oracle/kemet", changefreq: "weekly", priority: 0.82 },
  { path: "/oracle/juyuk", changefreq: "weekly", priority: 0.82 },
  { path: "/oracle/sukuyo", changefreq: "weekly", priority: 0.82 },
  { path: "/vedic/jyotish", changefreq: "weekly", priority: 0.82 },
  { path: "/animal/physio", changefreq: "weekly", priority: 0.8 },
  { path: "/animal/mbti", changefreq: "weekly", priority: 0.8 },
  { path: "/animal/totem", changefreq: "weekly", priority: 0.8 },
  { path: "/flower/destiny", changefreq: "weekly", priority: 0.78 },
  { path: "/flower/astrology", changefreq: "weekly", priority: 0.76 },
  { path: "/flower/jamidusu", changefreq: "weekly", priority: 0.76 },
  { path: "/flower/sukuyo", changefreq: "weekly", priority: 0.76 },
  { path: "/dream/tarot", changefreq: "weekly", priority: 0.78 },
  { path: "/dream/psycho", changefreq: "weekly", priority: 0.78 },
  { path: "/about", changefreq: "monthly", priority: 0.6 },
  { path: "/points", changefreq: "weekly", priority: 0.5 },
  { path: "/login", changefreq: "monthly", priority: 0.3 },
  { path: "/signup", changefreq: "monthly", priority: 0.3 },
  { path: "/privacy-policy", changefreq: "yearly", priority: 0.2 },
  { path: "/terms-of-service", changefreq: "yearly", priority: 0.2 },
  { path: "/faq", changefreq: "monthly", priority: 0.35 },
  { path: "/contact-us", changefreq: "yearly", priority: 0.3 },
  { path: "/rss.xml", changefreq: "hourly", priority: 0.2 },
];

function normalizeDate(dateLike) {
  const parsed = new Date(typeof dateLike === "string" ? dateLike : Date.now());
  if (Number.isNaN(parsed.getTime())) return today;
  return parsed.toISOString().slice(0, 10);
}

function buildRoutes() {
  const source = readFileSync(insightsSourcePath, "utf8");
  const nonEssentialCategories = new Set([
    "상담 윤리",
    "콘텐츠 운영",
    "사용자 가이드",
    "기술 SEO",
    "운영 체크리스트",
    "법률/운영",
  ]);

  const articleRegex = /{\s*slug:\s*"([^"]+)"[\s\S]*?category:\s*"([^"]+)"[\s\S]*?updatedAt:\s*"([0-9]{4}-[0-9]{2}-[0-9]{2})"/g;
  const seen = new Set();
  const dynamicInsightRoutes = [];

  let match;
  while ((match = articleRegex.exec(source)) !== null) {
    const slug = String(match[1] || "").trim();
    const category = String(match[2] || "").trim();
    const updatedAt = String(match[3] || "").trim();

    if (!slug || seen.has(slug) || nonEssentialCategories.has(category)) {
      continue;
    }

    seen.add(slug);
    dynamicInsightRoutes.push({
      path: `/insights/${slug}`,
      changefreq: "monthly",
      priority: 0.75,
      lastmod: normalizeDate(updatedAt),
    });
  }

  return [...coreRoutes, ...dynamicInsightRoutes];
}

function toUrl(pathname) {
  return new URL(pathname, siteBaseUrl).toString();
}

function buildLocalizedPath(prefix, path) {
  if (!prefix) return path;
  if (path === "/") return prefix;
  if (path === "/rss.xml") return path;
  return `${prefix}${path}`;
}

function main() {
  const routeEntries = buildRoutes();
  const entryMap = new Map();

  for (const route of routeEntries) {
    for (const prefix of localePrefixes) {
      const localizedPath = buildLocalizedPath(prefix, route.path);
      const url = toUrl(localizedPath);
      const existing = entryMap.get(url);
      const nextEntry = {
        loc: url,
        lastmod: route.lastmod || today,
        changefreq: route.changefreq || "weekly",
        priority: (route.priority ?? 0.7).toFixed(1),
      };

      if (!existing) {
        entryMap.set(url, nextEntry);
        continue;
      }

      const existingDate = new Date(existing.lastmod).getTime();
      const nextDate = new Date(nextEntry.lastmod).getTime();
      entryMap.set(url, {
        loc: url,
        lastmod: Number.isFinite(nextDate) && nextDate > existingDate ? nextEntry.lastmod : existing.lastmod,
        changefreq: existing.changefreq || nextEntry.changefreq,
        priority: String(Math.max(Number(existing.priority), Number(nextEntry.priority)).toFixed(1)),
      });
    }
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
  console.log(`[sitemap] Generated ${sorted.length} routes -> sitemap.xml`);
}

main();
