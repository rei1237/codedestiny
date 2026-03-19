import type { MetadataRoute } from "next";

const BASE_URL = "https://code-destiny.com";
const LOCALE_PREFIXES = ["", "/en-us", "/ja-jp", "/zh-cn", "/hi-in", "/es-es", "/fr-fr", "/de-de", "/nl-nl", "/ms-my"];

const ROUTES: Array<{ path: string; changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
  { path: "/", changeFrequency: "weekly" },
  { path: "/tarot/healing", changeFrequency: "weekly" },
  { path: "/points", changeFrequency: "weekly" },
  { path: "/login", changeFrequency: "monthly" },
  { path: "/signup", changeFrequency: "monthly" },
  { path: "/privacy-policy", changeFrequency: "yearly" },
  { path: "/terms-of-service", changeFrequency: "yearly" },
  { path: "/contact-us", changeFrequency: "yearly" },
];

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
        priority: route.path === "/" ? 1 : 0.7,
      });
    }
  }

  return entries;
}

