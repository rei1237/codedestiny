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

/**
 * 인용을 원하는 AI 크롤러. 여기 있는 봇을 막으면 그 플랫폼은 우리를 **인용할 수 없다.**
 * 지금도 `User-agent: *` 로 이미 허용돼 있으므로 이 블록이 동작을 바꾸지는 않는다 —
 * 의도를 기록해 나중에 누가 일괄 Disallow 를 넣는 사고를 막는 것이 목적이다.
 *
 * 🔴 각 봇 그룹은 privateDisallowRules 를 **함께 들고 있어야 한다.** robots.txt 에서 특정
 * User-agent 그룹은 `*` 그룹을 상속하지 않고 **대체**한다 — 이름만 적고 Allow 만 두면
 * 그 봇에게 /admin/·/payment/ 까지 열어 주는 셈이 된다.
 */
const CITATION_AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "PerplexityBot",
  "Google-Extended",
];

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
      ...CITATION_AI_CRAWLERS.map((userAgent) => ({
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
    sitemap: [`${SEO_V2_SITE.siteUrl}/sitemap.xml`],
    host: SEO_V2_SITE.siteUrl,
  };
}
