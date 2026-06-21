import type { MetadataRoute } from "next";
import { SEO_V2_SITE } from "../lib/seo.v2";

export const dynamic = "force-static";

const privateDisallowRules = [
  "/api/",
  "/api-hello-test/",
  "/admin/",
  "/auth/",
  "/debug/",
  "/test/",
  "/login/",
  "/signup/",
  "/profile/",
  "/payment/",
  "/payments/",
  "/checkout/",
  "/success/",
  "/fail/",
  "/points/",
  "/premium-unlock/",
  "/result/",
  "/results/",
  "/report/progress/",
  "/my/",
  "/me/",
  "/mypage/private/",
  "/*?session=",
  "/*?token=",
  "/*?auth=",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: privateDisallowRules,
      },
      {
        userAgent: "Mediapartners-Google",
        allow: ["/"],
        disallow: privateDisallowRules,
      },
    ],
    sitemap: [`${SEO_V2_SITE.siteUrl}/sitemap.xml`],
    host: SEO_V2_SITE.siteUrl,
  };
}
