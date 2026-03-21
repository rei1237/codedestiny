import type { MetadataRoute } from "next";
import { BASE_URL, LOCALE_PREFIXES, ROUTES } from "../lib/seo-site-urls";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of ROUTES) {
    for (const prefix of LOCALE_PREFIXES) {
      const localizedPath = prefix
        ? `${prefix}${route.path === "/" ? "" : route.path}`
        : route.path;
      entries.push({
        url: new URL(localizedPath, BASE_URL).toString(),
        lastModified: now,
        changeFrequency: route.changeFrequency,
        priority: route.priority ?? 0.7,
      });
    }
  }

  return entries;
}
