/** Shared with app/sitemap.ts — single source for public indexable URLs. */

export const BASE_URL = "https://code-destiny.com";

export const LOCALE_PREFIXES = [
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

export type SitemapRouteEntry = {
  path: string;
  changeFrequency?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
};

export const ROUTES: SitemapRouteEntry[] = [
  /** Legacy home shell (canonical URL is /; /static/index.html → 308 to /). */
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/insights", changeFrequency: "weekly", priority: 0.9 },
  { path: "/saju/basic", changeFrequency: "weekly", priority: 0.9 },
  { path: "/ziwei/chart", changeFrequency: "weekly", priority: 0.88 },
  { path: "/astrology/cosmic", changeFrequency: "weekly", priority: 0.88 },
  { path: "/tarot/mingri", changeFrequency: "weekly", priority: 0.88 },
  { path: "/tarot/love", changeFrequency: "weekly", priority: 0.86 },
  { path: "/tarot/healing", changeFrequency: "weekly", priority: 0.86 },
  { path: "/geomancy-oracle-v4.html", changeFrequency: "weekly", priority: 0.84 },
  { path: "/oracle/hwatu-life", changeFrequency: "weekly", priority: 0.81 },
  { path: "/oracle/sikojen-povailu", changeFrequency: "weekly", priority: 0.80 },
  { path: "/royal-tea-oracle.html", changeFrequency: "weekly", priority: 0.8 },
  { path: "/saju-picture", changeFrequency: "weekly", priority: 0.8 },
  { path: "/insights/saju-four-pillars-basics", changeFrequency: "monthly", priority: 0.75 },
  { path: "/insights/ten-heavenly-stems-practical", changeFrequency: "monthly", priority: 0.75 },
  { path: "/insights/twelve-earthly-branches-and-seasons", changeFrequency: "monthly", priority: 0.75 },
  { path: "/insights/ten-gods-beginner-map", changeFrequency: "monthly", priority: 0.75 },
  { path: "/insights/yongshin-how-to-think", changeFrequency: "monthly", priority: 0.75 },
  { path: "/insights/tarot-major-arcana-symbols", changeFrequency: "monthly", priority: 0.75 },
  { path: "/insights/tarot-reversed-card-framework", changeFrequency: "monthly", priority: 0.75 },
  { path: "/insights/tarot-spread-design-principles", changeFrequency: "monthly", priority: 0.75 },
  { path: "/insights/astrology-vs-saju-differences", changeFrequency: "monthly", priority: 0.75 },
  { path: "/insights/sukuyo-lunar-mansion-primer", changeFrequency: "monthly", priority: 0.75 },
  { path: "/insights/vedic-astrology-navamsa-basics", changeFrequency: "monthly", priority: 0.75 },
  { path: "/insights/ziwei-doushu-stars-intro", changeFrequency: "monthly", priority: 0.75 },
  { path: "/insights/astrology-houses-quick-guide", changeFrequency: "monthly", priority: 0.75 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/points", changeFrequency: "weekly", priority: 0.5 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.5 },
  { path: "/terms-of-service", changeFrequency: "yearly", priority: 0.5 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact-us", changeFrequency: "yearly", priority: 0.55 },
];

export function getAllSitemapUrls(): string[] {
  const urls: string[] = [];
  for (const route of ROUTES) {
    for (const prefix of LOCALE_PREFIXES) {
      const localizedPath = prefix
        ? `${prefix}${route.path === "/" ? "" : route.path}`
        : route.path;
      urls.push(new URL(localizedPath, BASE_URL).toString());
    }
  }
  return urls;
}
