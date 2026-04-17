import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/_admin",
          "/api",
          "/dev-status",
          "/_lib",
          "/_locale",
          "/login",
          "/signup",
          "/*?session=*",
          "/*?token=*",
          "/*?auth=*",
          "/*.json$",
        ],
      },
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
    ],
    sitemap: [
      "https://code-destiny.com/sitemap.xml",
      "https://code-destiny.com/rss.xml",
    ],
    host: "code-destiny.com",
  };
}

