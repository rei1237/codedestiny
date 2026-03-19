import type { MetadataRoute } from "next";

const BASE_URL = "https://code-destiny.com";

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
  return ROUTES.map((r) => ({
    url: new URL(r.path, BASE_URL).toString(),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.path === "/" ? 1 : 0.7,
  }));
}

