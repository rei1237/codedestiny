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
  { path: "/en-au", changeFrequency: "weekly" },
  { path: "/en-ca", changeFrequency: "weekly" },
  { path: "/en-gb", changeFrequency: "weekly" },
  { path: "/en-in", changeFrequency: "weekly" },
  { path: "/en-ph", changeFrequency: "weekly" },
  { path: "/en-us", changeFrequency: "weekly" },
  { path: "/en-sg", changeFrequency: "weekly" },
  { path: "/en-za", changeFrequency: "weekly" },
  { path: "/fr-ca", changeFrequency: "weekly" },
  { path: "/fr-fr", changeFrequency: "weekly" },
  { path: "/de-de", changeFrequency: "weekly" },
  { path: "/it-it", changeFrequency: "weekly" },
  { path: "/hu-hu", changeFrequency: "weekly" },
  { path: "/hi-in", changeFrequency: "weekly" },
  { path: "/nl-nl", changeFrequency: "weekly" },
  { path: "/ja-jp", changeFrequency: "weekly" },
  { path: "/zh-cn", changeFrequency: "weekly" },
  { path: "/zh-cn/tarot", changeFrequency: "weekly" },
  { path: "/zh-tw", changeFrequency: "weekly" },
  { path: "/th-th", changeFrequency: "weekly" },
  { path: "/vi-vn", changeFrequency: "weekly" },
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

