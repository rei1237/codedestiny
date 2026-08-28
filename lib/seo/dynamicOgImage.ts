import { SEO_V2_SITE } from "../seo.v2";

/**
 * 동적 OG 카드 URL 을 만든다(워커 라우트 `GET /api/og`).
 *
 * 🔴 이 함수는 왜 lib/seo.v2.ts 가 아니라 별도 파일에 있는가 —
 * 사이트맵 lastmod 원장(scripts/lib/sitemap-lastmod.mjs)은 각 라우트의 **import 클로저 내용**을
 * 해시해 서명으로 쓴다. seo.v2.ts 는 118개 페이지가 물고 있어서, 거기에 함수를 하나 더하기만 해도
 * 그 118개의 lastmod 가 오늘로 밀린다(2026-08-28 실측 — verify:sitemap-drift 가 PR CI 를 막았다).
 * 아무도 안 쓰는 헬퍼를 추가했다는 이유로 구글에 118건의 거짓 신선도 신호를 보내게 된다.
 * 이 파일은 실제로 쓰는 페이지만 물게 되므로, 그때 그 페이지의 lastmod 만 정확히 움직인다.
 *
 * 🔴 기존 정적 OG 를 대체하지 않는다. 이미 공유된 페이지의 og:image 를 갈아 끼워도 카카오는
 * **페이지 URL** 을 키로 캐시한 옛 카드를 계속 보여 준다. 신규 페이지에만 쓸 것.
 *
 * badge 는 워커의 프리셋 키다. 모르는 키는 워커가 조용히 기본값으로 떨어뜨린다.
 *
 * 결과를 buildSeoMetadata / SeoV2Content 의 image 로 넘겨도 안전하다 — normalizeUrl 이 지우는
 * 것은 TRACKING_PARAMS(utm_*·fbclid·session·token 등)뿐이고 title/desc/badge/theme 는 남는다.
 */
export type DynamicOgBadge =
  | "saju"
  | "tarot"
  | "astrology"
  | "ziwei"
  | "dream"
  | "compatibility"
  | "fortune"
  | "insight";

export function buildDynamicOgImageUrl(input: {
  title: string;
  description?: string;
  badge?: DynamicOgBadge;
  theme?: "dark" | "light";
}): string {
  const params = new URLSearchParams();
  params.set("title", String(input.title || "").trim());
  if (input.description) params.set("desc", input.description.trim());
  if (input.badge) params.set("badge", input.badge);
  if (input.theme) params.set("theme", input.theme);
  return `${SEO_V2_SITE.siteUrl}/api/og?${params.toString()}`;
}
