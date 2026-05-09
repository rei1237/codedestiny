import type { MetadataRoute } from "next";
import { BASE_URL, ROUTES } from "../lib/seo-site-urls";
import { INSIGHT_SEED_ARTICLES } from "./insights/seed-articles";
import { LOCALES } from "../lib/i18n/locales";
import { I18N_ROUTE_MAP } from "../lib/i18n/routes";
import { I18N_INSIGHT_ARTICLES } from "../lib/seo/i18nInsights";

export const dynamic = "force-static";
const useInsightsApi = String(process.env.SITEMAP_USE_INSIGHTS_API || "").toLowerCase() === "1";

type InsightListItem = {
  slug?: string;
  canonicalUrl?: string;
  updatedAt?: string;
};

type SeedInsightItem = {
  slug?: string;
  updatedAt?: string;
};

function normalizeDate(value?: string): Date {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return new Date();
  return date;
}

function buildBaseEntries(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of ROUTES) {
    entries.push({
      url: new URL(route.path, BASE_URL).toString(),
      lastModified: now,
      changeFrequency: route.changeFrequency || "weekly",
      priority: route.priority ?? 0.7,
    });
  }

  entries.push({
    url: `${BASE_URL}/insights/rss.xml`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.2,
  });

  return entries;
}

function buildLanguagesAlternates(routeByLocale: Record<"ko" | "ja" | "zh" | "en", string>) {
  return {
    languages: {
      ko: new URL(routeByLocale.ko, BASE_URL).toString(),
      ja: new URL(routeByLocale.ja, BASE_URL).toString(),
      zh: new URL(routeByLocale.zh, BASE_URL).toString(),
      en: new URL(routeByLocale.en, BASE_URL).toString(),
      "x-default": new URL(routeByLocale.ko, BASE_URL).toString(),
    },
  };
}

function buildI18nEntries(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  const keyMeta = [
    { key: "home", changeFrequency: "daily", priority: 1.0 },
    { key: "ziwei", changeFrequency: "weekly", priority: 0.95 },
    { key: "sukuyo", changeFrequency: "weekly", priority: 0.94 },
    { key: "today", changeFrequency: "daily", priority: 0.97 },
    { key: "insights", changeFrequency: "weekly", priority: 0.9 },
  ] as const;

  for (const item of keyMeta) {
    const routeByLocale = I18N_ROUTE_MAP[item.key];
    const alternates = buildLanguagesAlternates(routeByLocale);

    for (const locale of LOCALES) {
      entries.push({
        url: new URL(routeByLocale[locale], BASE_URL).toString(),
        lastModified: now,
        changeFrequency: item.changeFrequency,
        priority: item.priority,
        alternates,
      });
    }
  }

  for (const article of I18N_INSIGHT_ARTICLES) {
    const routeByLocale = I18N_ROUTE_MAP[article.id];
    const alternates = buildLanguagesAlternates(routeByLocale);
    for (const locale of LOCALES) {
      entries.push({
        url: new URL(routeByLocale[locale], BASE_URL).toString(),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.78,
        alternates,
      });
    }
  }

  return entries;
}

function buildSeedInsightEntries(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const item of INSIGHT_SEED_ARTICLES as SeedInsightItem[]) {
    const slug = String(item?.slug || "").trim();
    if (!slug) continue;

    entries.push({
      url: `${BASE_URL}/insights/${encodeURIComponent(slug)}`,
      lastModified: normalizeDate(item?.updatedAt),
      changeFrequency: "monthly",
      priority: 0.76,
    });
  }

  return entries;
}

async function fetchPublishedInsights(): Promise<MetadataRoute.Sitemap> {
  const apiBase = String(process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_AUTH_API_BASE_URL || BASE_URL).replace(/\/$/, "");
  const seen = new Set<string>();
  const out: MetadataRoute.Sitemap = [];

  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 200) {
    const url = `${apiBase}/api/insights?sort=latest&pageSize=50&page=${page}&excludeNoIndex=1`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) break;

    const data = await response.json().catch(() => ({}));
    const items: InsightListItem[] = Array.isArray(data?.items) ? data.items : [];

    for (const item of items) {
      const slug = String(item?.slug || "").trim();
      if (!slug) continue;

      const canonicalUrl = String(item?.canonicalUrl || "").trim() || `${BASE_URL}/insights/${encodeURIComponent(slug)}`;
      if (seen.has(canonicalUrl)) continue;
      seen.add(canonicalUrl);

      out.push({
        url: canonicalUrl,
        lastModified: normalizeDate(item?.updatedAt),
        changeFrequency: "weekly",
        priority: 0.74,
      });
    }

    hasMore = Boolean(data?.hasMore);
    page += 1;
  }

  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseEntries = buildBaseEntries();
  const i18nEntries = buildI18nEntries();
  const seedEntries = buildSeedInsightEntries();

  if (!useInsightsApi) {
    const merged = [...baseEntries, ...i18nEntries, ...seedEntries];
    const uniq = new Map<string, MetadataRoute.Sitemap[number]>();

    for (const entry of merged) {
      uniq.set(String(entry.url), entry);
    }

    return Array.from(uniq.values());
  }

  try {
    const insightsEntries = await fetchPublishedInsights();
    const merged = [...baseEntries, ...i18nEntries, ...seedEntries, ...insightsEntries];
    const uniq = new Map<string, MetadataRoute.Sitemap[number]>();

    for (const entry of merged) {
      uniq.set(String(entry.url), entry);
    }

    return Array.from(uniq.values());
  } catch {
    const merged = [...baseEntries, ...i18nEntries, ...seedEntries];
    const uniq = new Map<string, MetadataRoute.Sitemap[number]>();

    for (const entry of merged) {
      uniq.set(String(entry.url), entry);
    }

    return Array.from(uniq.values());
  }
}
