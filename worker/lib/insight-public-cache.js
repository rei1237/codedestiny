// Insight 컬렉션의 **공개** 조회 캐시 키 원장 + 무효화 한 곳.
//
// 캐시 자체는 worker/lib/cms-cache.js(readCmsThroughCache: 아이솔레이트 memo + caches.default + stale
// 폴백)를 그대로 쓴다. 이 파일은 세 라우트 파일이 같은 키를 봐야 해서 존재한다 —
//   읽기: worker/routes/insights.js(/api/insights 목록·상세) · worker/routes/content.js(sitemap·rss 피드)
//   쓰기: worker/routes/admin.js(/api/admin/insights·/api/admin/content 저장·휴지통·복원)
// 쓰기 쪽이 키를 모르면 저장 후 최대 TTL(5분) 동안 옛 글이 보인다.
//
// 왜 캐시하나(실측 2026-08-21, docs/context/ai-and-db.md "지리"): 워커(LAX)→Atlas(서울) 핸드셰이크가
// 요청마다 ~1.3초다. 히트는 쿼리가 아니라 connectDb 자체를 건너뛰므로 그 1.3초가 통째로 빠진다.
//
// 🔴 caches.default 는 접두사 삭제가 없다 — purgeCmsCache 의 접두사 일치는 memo 에만 통한다.
//    그래서 상세 키는 슬러그 단위로 **정확히** 지운다. 쓰기 핸들러는 변경 전·후 슬러그를 모두 넘길 것.

import { purgeCmsCache } from "./cms-cache.js";

export const INSIGHT_PUBLIC_CACHE_TTL_SECONDS = 300;
export const INSIGHT_PUBLIC_STALE_TTL_SECONDS = 900;

export const INSIGHT_PUBLIC_LIST_KEY = "insights-public:v1:list";
export const CONTENT_FEED_RSS_KEY = "content-feed:v1:rss";
export const CONTENT_FEED_SITEMAP_KEY = "content-feed:v1:sitemap";

export function insightDetailCacheKey(slug) {
  return `insights-public:v1:detail:${String(slug || "")}`;
}

/** Insight 문서를 쓴 직후 호출한다. 목록·피드는 항상, 상세는 넘겨받은 슬러그만 지운다. */
export async function purgeInsightPublicCache(slugs = []) {
  const list = (Array.isArray(slugs) ? slugs : [slugs])
    .map((slug) => String(slug || "").trim())
    .filter(Boolean);
  await purgeCmsCache([
    INSIGHT_PUBLIC_LIST_KEY,
    CONTENT_FEED_RSS_KEY,
    CONTENT_FEED_SITEMAP_KEY,
    ...Array.from(new Set(list)).map((slug) => insightDetailCacheKey(slug)),
  ]);
}
