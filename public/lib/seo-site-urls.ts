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
  { path: "/tarot/self-esteem", changeFrequency: "weekly", priority: 0.84 },
  { path: "/tarot/reunion", changeFrequency: "weekly", priority: 0.84 },
  { path: "/tarot/year", changeFrequency: "weekly", priority: 0.84 },
  { path: "/oracle/hwatu", changeFrequency: "weekly", priority: 0.82 },
  { path: "/oracle/kemet", changeFrequency: "weekly", priority: 0.82 },
  { path: "/oracle/juyuk", changeFrequency: "weekly", priority: 0.82 },
  { path: "/oracle/sukuyo", changeFrequency: "weekly", priority: 0.82 },
  { path: "/vedic/jyotish", changeFrequency: "weekly", priority: 0.82 },
  { path: "/animal/physio", changeFrequency: "weekly", priority: 0.8 },
  { path: "/animal/mbti", changeFrequency: "weekly", priority: 0.8 },
  { path: "/animal/totem", changeFrequency: "weekly", priority: 0.8 },
  { path: "/flower/destiny", changeFrequency: "weekly", priority: 0.78 },
  { path: "/flower/astrology", changeFrequency: "weekly", priority: 0.76 },
  { path: "/flower/jamidusu", changeFrequency: "weekly", priority: 0.76 },
  { path: "/flower/sukuyo", changeFrequency: "weekly", priority: 0.76 },
  { path: "/dream/tarot", changeFrequency: "weekly", priority: 0.78 },
  { path: "/dream/psycho", changeFrequency: "weekly", priority: 0.78 },
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
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/points", changeFrequency: "weekly", priority: 0.5 },
  { path: "/login", changeFrequency: "monthly", priority: 0.3 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.3 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms-of-service", changeFrequency: "yearly", priority: 0.2 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.35 },
  { path: "/contact-us", changeFrequency: "yearly", priority: 0.3 },
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
