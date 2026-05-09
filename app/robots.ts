import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/"],
      disallow: [
        "/api/",
        "/admin/",
        "/auth/",
        "/login/",
        "/signup/",
        "/profile/",
        "/payment/",
        "/checkout/",
        "/result/private/",
        "/my/",
        "/me/",
        "/mypage/private/",
        "/*?session=",
        "/*?token=",
        "/*?auth=",
      ],
    },
    sitemap: ["https://code-destiny.com/sitemap.xml"],
    host: "https://code-destiny.com",
  };
}
