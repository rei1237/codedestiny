import type { MetadataRoute } from "next";
import { BASE_URL, ROUTES } from "../lib/seo-site-urls";

export const dynamic = "force-static";

type InsightListItem = {
  slug?: string;
  canonicalUrl?: string;
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

  try {
    const insightsEntries = await fetchPublishedInsights();
    const merged = [...baseEntries, ...insightsEntries];
    const uniq = new Map<string, MetadataRoute.Sitemap[number]>();

    for (const entry of merged) {
      uniq.set(String(entry.url), entry);
    }

    return Array.from(uniq.values());
  } catch {
    return baseEntries;
  }
}
