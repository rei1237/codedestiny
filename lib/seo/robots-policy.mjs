/**
 * robots.txt 정책 정본. app/robots.ts(Next 가 out/robots.txt → dist/robots.txt 로 내보냄),
 * scripts/verify-sitemap-integrity.mjs(빌드 전), scripts/seo/verify-dist.mjs `robots-policy`(빌드 뒤)가
 * 모두 여기서 읽는다. 루트·public/ 의 robots.txt 사본은 두지 않는다.
 *
 * Next 와 Node 스크립트가 모두 읽으므로 의존성 없는 ESM 으로 두고, brand-facts 만 가져온다.
 */
import { BRAND_FACTS } from "../brand/brand-facts.mjs";

/**
 * 🔴 동적 OG 카드(`/api/og`)는 Disallow 아래 있으면 안 된다. 구글은 리치 결과·Discover 썸네일에
 * 쓸 이미지를 **직접 크롤링해야** 하고, robots.txt 로 막힌 이미지는 쓰지 않는다. robots.txt 는
 * 가장 긴 일치 규칙이 이기므로 Allow:/api/og 가 Disallow:/api/ 를 이 경로에서만 덮는다.
 * 나머지 /api/ 는 그대로 막힌 채다.
 */
export const PUBLIC_API_ALLOW_RULES = Object.freeze(["/", "/api/og"]);

export const PRIVATE_DISALLOW_RULES = Object.freeze([
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
  "/points/",
  "/success/",
  "/fail/",
  "/result/",
  "/results/",
  "/records/",
  "/yeongnyangi/library/",
  "/yeongnyangi/room/",
  "/report/progress/",
  "/my/",
  "/me/",
  "/mypage/private/",
  "/*?session=",
  "/*?token=",
  "/*?auth=",
]);

// Search indexing, user-triggered retrieval, and training are separate purposes.
// Every named crawler shares the '*' group, so it keeps every private-path restriction.
export const CITATION_AI_CRAWLERS = Object.freeze([
  "Googlebot", "Bingbot", "Yeti", "OAI-SearchBot", "Claude-SearchBot", "PerplexityBot",
  "ChatGPT-User", "Claude-User", "Perplexity-User",
]);
// Preserve the existing training permissions; these tokens do not promise search inclusion.
export const ALLOWED_TRAINING_CRAWLERS = Object.freeze([
  "GPTBot", "ClaudeBot", "anthropic-ai", "Claude-Web", "Google-Extended", "Applebot-Extended",
]);

/**
 * 학습 말뭉치 수집 전용 크롤러. 검색 결과나 AI 답변의 인용 경로에 관여하지 않으므로
 * 막아도 인용 가능성이 줄지 않는다.
 */
export const TRAINING_ONLY_CRAWLERS = Object.freeze(["CCBot"]);

/**
 * Next `MetadataRoute.Robots` 모양. RFC 9309 그룹 2개: 공개 그룹(User-agent 여러 줄이 규칙 하나를
 * 공유)과 학습 전용 차단 그룹. `host` 는 두지 않는다(구글·빙이 읽지 않는 비표준 줄).
 *
 * @param {string} siteUrl 끝 슬래시 없는 오리진
 * @returns {{ rules: Array<{ userAgent: string[], allow?: string[], disallow: string[] }>, sitemap: string[] }}
 */
export function buildRobotsRules(siteUrl) {
  const origin = String(siteUrl).replace(/\/+$/, "");
  return {
    rules: [
      {
        userAgent: ["*", "Mediapartners-Google", ...CITATION_AI_CRAWLERS, ...ALLOWED_TRAINING_CRAWLERS],
        allow: [...PUBLIC_API_ALLOW_RULES],
        disallow: [...PRIVATE_DISALLOW_RULES],
      },
      {
        userAgent: [...TRAINING_ONLY_CRAWLERS],
        disallow: ["/"],
      },
    ],
    // sitemap-index.xml 하나만 선언한다. 하위 사이트맵은 색인 파일이 가리킨다.
    sitemap: [`${origin}/sitemap-index.xml`],
  };
}

/**
 * Next 가 app/robots.ts 를 내보낼 때와 같은 형식으로 렌더한다(`User-Agent:` 줄들 → `Allow:`/`Disallow:` → 빈 줄,
 * 끝에 `Sitemap:`). 빌드 전 검사기가 dist 없이 같은 정책을 읽는 데 쓴다.
 */
export function renderRobotsTxt(siteUrl = BRAND_FACTS.service.siteUrl) {
  const { rules, sitemap } = buildRobotsRules(siteUrl);
  let text = "";
  for (const rule of rules) {
    for (const agent of rule.userAgent) text += `User-Agent: ${agent}\n`;
    for (const path of rule.allow || []) text += `Allow: ${path}\n`;
    for (const path of rule.disallow) text += `Disallow: ${path}\n`;
    text += "\n";
  }
  for (const url of sitemap) text += `Sitemap: ${url}\n`;
  return text;
}
