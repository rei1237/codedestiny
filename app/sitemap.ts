import type { MetadataRoute } from "next";
import { INSIGHT_ARTICLES } from "./insights/articles";
import { BASE_URL, LOCALE_PREFIXES, ROUTES } from "../lib/seo-site-urls";

type SitemapEntry = MetadataRoute.Sitemap[number];

function toLastModified(value: unknown, fallback: Date): Date {
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function addLocalizedEntries(
  bucket: Map<string, SitemapEntry>,
  routePath: string,
  changeFrequency: SitemapEntry["changeFrequency"],
  priority: number,
  lastModified: Date,
) {
  for (const prefix of LOCALE_PREFIXES) {
    const localizedPath = prefix
      ? `${prefix}${routePath === "/" ? "" : routePath}`
      : routePath;
    const url = new URL(localizedPath, BASE_URL).toString();

    const existing = bucket.get(url);
    if (!existing) {
      bucket.set(url, {
        url,
        lastModified,
        changeFrequency,
        priority,
      });
      continue;
    }

    const prevModified = new Date(existing.lastModified ?? 0).getTime();
    const nextModified = lastModified.getTime();
    bucket.set(url, {
      ...existing,
      lastModified: nextModified > prevModified ? lastModified : existing.lastModified,
      changeFrequency: existing.changeFrequency ?? changeFrequency,
      priority: Math.max(existing.priority ?? 0, priority),
    });
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entriesByUrl = new Map<string, SitemapEntry>();

  for (const route of ROUTES) {
    addLocalizedEntries(
      entriesByUrl,
      route.path,
      route.changeFrequency,
      route.priority ?? 0.7,
      now,
    );
  }

  for (const article of INSIGHT_ARTICLES) {
    const slug = String(article?.slug || "").trim();
    if (!slug) continue;

    addLocalizedEntries(
      entriesByUrl,
      `/insights/${slug}`,
      "monthly",
      0.75,
      toLastModified(article?.updatedAt, now),
    );
  }

  return Array.from(entriesByUrl.values());
}

