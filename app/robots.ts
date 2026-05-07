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
        "/auth",
        "/dev-status",
        "/test",
        "/debug",
        "/payment",
        "/payment/callback",
        "/payments",
        "/payments/callback",
        "/blog",
        "/fortune",
        "/famous",
        "/sample",
        "/static",
        "/404",
        "/404.html",
        "/contact-us",
        "/privacy-policy",
        "/terms-of-service",
        "/_lib",
        "/_locale",
        "/login",
        "/signup",
        "/*?session=",
        "/*?token=",
        "/*?auth=",
        "/*.json$",
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
