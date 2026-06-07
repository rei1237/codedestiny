import type { MetadataRoute } from "next";
import { BASE_URL } from "../lib/seo-site-urls";
import { buildSitemapEntriesV2 } from "../lib/seo.v2";
import { LOCALES } from "../lib/i18n/locales";
import { I18N_ROUTE_MAP } from "../lib/i18n/routes";
import { createHreflangFromRoutes } from "../lib/seo/createHreflang";

export const dynamic = "force-static";

function buildBaseEntries(): MetadataRoute.Sitemap {
  const now = new Date();
  return buildSitemapEntriesV2(now).concat({
    url: `${BASE_URL}/insights/rss.xml`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.2,
  });
}

function buildLanguagesAlternates(routeByLocale: Record<"ko" | "ja" | "zh" | "en", string>) {
  return {
    languages: createHreflangFromRoutes(routeByLocale),
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

  return entries;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const merged = [...buildBaseEntries(), ...buildI18nEntries()];
  const uniq = new Map<string, MetadataRoute.Sitemap[number]>();

  for (const entry of merged) {
    uniq.set(String(entry.url), entry);
  }

  return Array.from(uniq.values());
}
