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
          "/*?utm_",
          "/*?fbclid=",
          "/*?gclid=",
          "/*?session=",
          "/*?token=",
        ],
      },
      // 공개 API는 봇 직접 접근 불필요
      {
        userAgent: "GPTBot",
        disallow: ["/api", "/admin", "/_admin"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
      },
      {
        userAgent: "Bingbot",
        allow: "/",
      },
      {
        userAgent: "Yeti",
        allow: "/",
      },
      {
        userAgent: "Baiduspider",
        allow: "/",
      },
      {
        userAgent: "NaverBot",
        allow: "/",
      },
    ],
    sitemap: [
      "https://code-destiny.com/sitemap.xml",
      "https://code-destiny.com/rss.xml",
    ],
    host: "code-destiny.com",
  };
}

