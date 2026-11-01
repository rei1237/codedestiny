import type { MetadataRoute } from "next";
import { SEO_V2_SITE } from "../lib/seo.v2";
import { buildRobotsRules } from "../lib/seo/robots-policy.mjs";

export const dynamic = "force-static";

// 정책 정본은 lib/seo/robots-policy.mjs 다. 규칙·크롤러 목록은 그곳에서만 고친다.
export default function robots(): MetadataRoute.Robots {
  return buildRobotsRules(SEO_V2_SITE.siteUrl);
}
