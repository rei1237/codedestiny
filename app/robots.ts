import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/insights", "/insights/"],
      disallow: [
        "/admin",
        "/_admin",
        "/api",
        "/dev-status",
        "/_lib",
        "/_locale",
        "/login",
        "/signup",
      ],
    },
    sitemap: [
      "https://code-destiny.com/sitemap.xml",
      "https://code-destiny.com/rss.xml",
      "https://code-destiny.com/insights/rss.xml",
    ],
    host: "https://code-destiny.com",
  };
}
