import type { MetadataRoute } from "next";
import { INSIGHT_ARTICLES } from "./insights/articles";
import { SEO_GROWTH_ARTICLES } from "./insights/seo-growth-articles";
import { buildSitemapEntriesV2, getCanonicalUrl } from "../lib/seo.v2";

export const dynamic = "force-static";

function buildInsightArticleEntries(date: Date): MetadataRoute.Sitemap {
  return Array.from(
    new Set(
      [...INSIGHT_ARTICLES, ...SEO_GROWTH_ARTICLES]
        .map((article) => String(article?.slug || "").trim())
        .filter(Boolean),
    ),
  ).map((slug) => ({
    url: getCanonicalUrl(`/insights/${slug}`),
    lastModified: date,
    changeFrequency: "monthly" as const,
    priority: 0.74,
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries = [...buildSitemapEntriesV2(now), ...buildInsightArticleEntries(now)];
  const unique = new Map<string, MetadataRoute.Sitemap[number]>();

  for (const entry of entries) {
    unique.set(String(entry.url), entry);
  }

  return Array.from(unique.values());
}
