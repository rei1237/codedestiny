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
  "/profile/",
  "/payment/",
  "/payments/",
  "/checkout/",
  "/success/",
  "/fail/",
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
    // sitemap-insights.xml 은 생성되지 않는다(빌드 파이프라인에 해당 산출물이 없음).
    // 선언만 남겨두면 Search Console 사이트맵 가져오기가 404 로 실패한다.
    sitemap: [`${SEO_V2_SITE.siteUrl}/sitemap.xml`],
    host: SEO_V2_SITE.siteUrl,
  };
}
