import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/*?utm_*", "/*?fbclid=*", "/*?gclid=*"],
      },
    ],
    sitemap: [
      "https://code-destiny.com/sitemap.xml",
      "https://code-destiny.com/rss.xml",
    ],
    host: "https://code-destiny.com",
  };
}

