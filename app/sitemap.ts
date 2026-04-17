import type { MetadataRoute } from "next";
import { INSIGHT_ARTICLES } from "./insights/articles";
import { HIGH_VALUE_CATEGORIES, HIGH_VALUE_PAGES } from "./high-value/content";
import { BASE_URL } from "../lib/seo-site-urls";

type SitemapEntry = MetadataRoute.Sitemap[number];

type CoreRoute = {
  path: string;
  changeFrequency: SitemapEntry["changeFrequency"];
  priority: number;
};

const LOCALE_HOME_ROUTES = [
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

const CORE_STATIC_ROUTES: CoreRoute[] = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/saju", changeFrequency: "daily", priority: 0.97 },
  { path: "/saju/basic", changeFrequency: "weekly", priority: 0.95 },
  { path: "/saju/basic/play", changeFrequency: "weekly", priority: 0.94 },
  { path: "/saju/lifebook", changeFrequency: "weekly", priority: 0.92 },
  { path: "/saju/love-secret", changeFrequency: "weekly", priority: 0.91 },
  { path: "/saju/love-simulation", changeFrequency: "weekly", priority: 0.9 },
  { path: "/saju/sibyl", changeFrequency: "weekly", priority: 0.88 },
  { path: "/saju-picture", changeFrequency: "weekly", priority: 0.86 },
  { path: "/ziwei/chart", changeFrequency: "weekly", priority: 0.95 },
  { path: "/astrology/cosmic", changeFrequency: "weekly", priority: 0.9 },
  { path: "/tarot", changeFrequency: "weekly", priority: 0.92 },
  { path: "/tarot/year", changeFrequency: "monthly", priority: 0.85 },
  { path: "/tarot/healing", changeFrequency: "monthly", priority: 0.84 },
  { path: "/tarot/healing/start", changeFrequency: "monthly", priority: 0.83 },
  { path: "/tarot/love", changeFrequency: "monthly", priority: 0.82 },
  { path: "/tarot/reunion", changeFrequency: "monthly", priority: 0.81 },
  { path: "/tarot/self-esteem", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tarot/mindscan", changeFrequency: "monthly", priority: 0.79 },
  { path: "/tarot/mingri", changeFrequency: "monthly", priority: 0.78 },
  { path: "/tarot/mingri/play", changeFrequency: "monthly", priority: 0.77 },
  { path: "/tarot/crystal-soul", changeFrequency: "monthly", priority: 0.76 },
  { path: "/oracle", changeFrequency: "weekly", priority: 0.88 },
  { path: "/oracle/hwatu-life", changeFrequency: "monthly", priority: 0.78 },
  { path: "/oracle/hwatu-life/play", changeFrequency: "monthly", priority: 0.76 },
  { path: "/oracle/royal-tea", changeFrequency: "monthly", priority: 0.76 },
  { path: "/oracle/sikojen-povailu", changeFrequency: "monthly", priority: 0.74 },
  { path: "/oracle/sikojen-povailu/play", changeFrequency: "monthly", priority: 0.72 },
  { path: "/olympus", changeFrequency: "monthly", priority: 0.72 },
  { path: "/premium-unlock", changeFrequency: "monthly", priority: 0.68 },
  { path: "/points", changeFrequency: "monthly", priority: 0.66 },
  { path: "/points/history", changeFrequency: "monthly", priority: 0.62 },
  { path: "/about", changeFrequency: "monthly", priority: 0.9 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.88 },
  { path: "/methodology", changeFrequency: "monthly", priority: 0.86 },
  { path: "/contact-us", changeFrequency: "yearly", priority: 0.6 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.55 },
  { path: "/terms-of-service", changeFrequency: "yearly", priority: 0.55 },
  { path: "/insights", changeFrequency: "weekly", priority: 0.85 },
  { path: "/high-value", changeFrequency: "weekly", priority: 0.84 },
  { path: "/rss.xml", changeFrequency: "daily", priority: 0.2 },
];

function toLastModified(value: unknown, fallback: Date): Date {
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function toAbsoluteUrl(pathname: string): string {
  return new URL(pathname, BASE_URL).toString();
}

function upsertEntry(bucket: Map<string, SitemapEntry>, next: SitemapEntry): void {
  const prev = bucket.get(next.url);
  if (!prev) {
    bucket.set(next.url, next);
    return;
  }

  const prevModified = new Date(prev.lastModified ?? 0).getTime();
  const nextModified = new Date(next.lastModified ?? 0).getTime();

  bucket.set(next.url, {
    ...prev,
    lastModified: nextModified > prevModified ? next.lastModified : prev.lastModified,
    priority: Math.max(prev.priority ?? 0, next.priority ?? 0),
    changeFrequency: prev.changeFrequency ?? next.changeFrequency,
  });
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entriesByUrl = new Map<string, SitemapEntry>();

  for (const localePath of LOCALE_HOME_ROUTES) {
    upsertEntry(entriesByUrl, {
      url: toAbsoluteUrl(localePath),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.82,
    });
  }

  for (const route of CORE_STATIC_ROUTES) {
    upsertEntry(entriesByUrl, {
      url: toAbsoluteUrl(route.path),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    });
  }

  for (const article of INSIGHT_ARTICLES) {
    const slug = String(article?.slug || "").trim();
    if (!slug) continue;

    upsertEntry(entriesByUrl, {
      url: toAbsoluteUrl(`/insights/${slug}`),
      lastModified: toLastModified(article?.updatedAt, now),
      changeFrequency: "monthly",
      priority: 0.74,
    });
  }

  for (const page of HIGH_VALUE_PAGES) {
    const slug = String(page?.slug || "").trim();
    if (!slug) continue;

    upsertEntry(entriesByUrl, {
      url: toAbsoluteUrl(`/high-value/${slug}`),
      lastModified: toLastModified(page?.updatedAt, now),
      changeFrequency: "monthly",
      priority: 0.72,
    });
  }

  for (const category of HIGH_VALUE_CATEGORIES) {
    const slug = String(category?.slug || "").trim();
    if (!slug) continue;

    upsertEntry(entriesByUrl, {
      url: toAbsoluteUrl(`/high-value/category/${slug}`),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.68,
    });
  }

  return Array.from(entriesByUrl.values()).sort((a, b) => {
    const pDiff = (b.priority ?? 0) - (a.priority ?? 0);
    if (pDiff !== 0) return pDiff;

    const tDiff =
      new Date(b.lastModified ?? 0).getTime() -
      new Date(a.lastModified ?? 0).getTime();
    if (tDiff !== 0) return tDiff;

    return a.url.localeCompare(b.url);
  });
}
