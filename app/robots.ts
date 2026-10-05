import type { MetadataRoute } from "next";
import { SEO_V2_SITE } from "../lib/seo.v2";

export const dynamic = "force-static";

/**
 * 🔴 동적 OG 카드(`/api/og`)는 Disallow 아래 있으면 안 된다. 구글은 리치 결과·Discover 썸네일에
 * 쓸 이미지를 **직접 크롤링해야** 하고, robots.txt 로 막힌 이미지는 쓰지 않는다. robots.txt 는
 * 가장 긴 일치 규칙이 이기므로 Allow:/api/og 가 Disallow:/api/ 를 이 경로에서만 덮는다.
 * 나머지 /api/ 는 그대로 막힌 채다.
 */
const PUBLIC_API_ALLOW_RULES = ["/", "/api/og"];

const privateDisallowRules = [
  "/api/",
  "/api-hello-test/",
  "/admin/",
  "/account/",
  "/staging/",
  "/preview/",
  "/*-debug/",
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

// Search indexing, user-triggered retrieval, and training are separate purposes.
// Explicit groups retain every private-path restriction; they do not inherit '*'.
const CITATION_AI_CRAWLERS = [
  "Googlebot", "Bingbot", "Yeti", "OAI-SearchBot", "Claude-SearchBot", "PerplexityBot",
  "ChatGPT-User", "Claude-User", "Perplexity-User",
];
// Preserve the existing training permissions; these tokens do not promise search inclusion.
const ALLOWED_TRAINING_CRAWLERS = ["GPTBot", "ClaudeBot", "anthropic-ai", "Claude-Web", "Google-Extended", "Applebot-Extended"];

/**
 * 학습 말뭉치 수집 전용 크롤러. 검색 결과나 AI 답변의 인용 경로에 관여하지 않으므로
 * 막아도 인용 가능성이 줄지 않는다.
 */
const TRAINING_ONLY_CRAWLERS = ["CCBot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: PUBLIC_API_ALLOW_RULES,
        disallow: privateDisallowRules,
      },
      {
        userAgent: "Mediapartners-Google",
        allow: PUBLIC_API_ALLOW_RULES,
        disallow: privateDisallowRules,
      },
      ...[...CITATION_AI_CRAWLERS, ...ALLOWED_TRAINING_CRAWLERS].map((userAgent) => ({
        userAgent,
        allow: PUBLIC_API_ALLOW_RULES,
        disallow: privateDisallowRules,
      })),
      ...TRAINING_ONLY_CRAWLERS.map((userAgent) => ({
        userAgent,
        disallow: ["/"],
      })),
    ],
    // sitemap-insights.xml 은 생성되지 않는다(빌드 파이프라인에 해당 산출물이 없음).
    // 선언만 남겨두면 Search Console 사이트맵 가져오기가 404 로 실패한다.
    sitemap: ["sitemap-index.xml"].map((name) => `${SEO_V2_SITE.siteUrl}/${name}`),
    host: SEO_V2_SITE.siteUrl,
  };
}
