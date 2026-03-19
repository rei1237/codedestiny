import type { MetadataRoute } from "next";

const BASE_URL = "https://code-destiny.com";
const LOCALE_PREFIXES = ["", "/en-us", "/ja-jp", "/zh-cn", "/hi-in", "/es-es", "/fr-fr", "/de-de", "/nl-nl", "/ms-my"];

const ROUTES: Array<{ path: string; changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
  { path: "/", changeFrequency: "weekly" },
  { path: "/about", changeFrequency: "monthly" },
  { path: "/insights", changeFrequency: "weekly" },
  { path: "/insights/saju-four-pillars-basics", changeFrequency: "monthly" },
  { path: "/insights/ten-heavenly-stems-practical", changeFrequency: "monthly" },
  { path: "/insights/twelve-earthly-branches-and-seasons", changeFrequency: "monthly" },
  { path: "/insights/ten-gods-beginner-map", changeFrequency: "monthly" },
  { path: "/insights/yongshin-how-to-think", changeFrequency: "monthly" },
  { path: "/insights/tarot-major-arcana-symbols", changeFrequency: "monthly" },
  { path: "/insights/tarot-reversed-card-framework", changeFrequency: "monthly" },
  { path: "/insights/tarot-spread-design-principles", changeFrequency: "monthly" },
  { path: "/insights/astrology-vs-saju-differences", changeFrequency: "monthly" },
  { path: "/insights/sukuyo-lunar-mansion-primer", changeFrequency: "monthly" },
  { path: "/insights/vedic-astrology-navamsa-basics", changeFrequency: "monthly" },
  { path: "/insights/ziwei-doushu-stars-intro", changeFrequency: "monthly" },
  { path: "/insights/astrology-houses-quick-guide", changeFrequency: "monthly" },
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

