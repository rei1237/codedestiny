// 공개 인기 상담 순위 API — GET /api/popular-services
//
// 최근 30일 실제 구매(ops_revenue_facts) 를 featureKey 별로 세어 TOP5 순위만 공개한다.
// 🔴 읽기 전용 집계다. 어떤 컬렉션에도 쓰지 않는다(새 컬렉션·인덱스·스냅샷 문서 없음).
//    "하루 스냅샷" 은 KST 날짜를 키로 한 엣지 캐시(readCmsThroughCache)가 맡는다.
// 🔴 응답에는 순위·출처(sales|curated)만 싣는다. 건수·금액·사용자 정보는 내보내지 않는다.
// 제외: 테스트 계정·0원·미결제(xpState≠counted), 환불(refundState≠none), featureKey 없음.

import { withMongoRetry } from "../lib/db.js";
import { readCmsThroughCache } from "../lib/cms-cache.js";
import { json, methodNotAllowed } from "../lib/http.js";
import { openOpsCollections } from "../ops-hq/db.js";
import { kstDateKey, addDaysKey } from "../ops-hq/time.js";
import {
  POPULAR_WINDOW_DAYS,
  popularPaymentKeys,
  rankPopularServices,
} from "../../js/core/popular-services.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_SECONDS = 24 * 60 * 60;
// DB 가 흔들릴 때만 쓰는 여유분. 어제 순위라도 내보내는 편이 빈 섹션보다 낫다.
const CACHE_STALE_TTL_SECONDS = 3 * 24 * 60 * 60;
const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400";
const CACHE_VERSION = "v1";

export function buildPopularMatch(now = new Date()) {
  return {
    xpState: "counted",
    refundState: "none",
    netKRW: { $gt: 0 },
    paidAt: { $gte: new Date(now.getTime() - POPULAR_WINDOW_DAYS * DAY_MS) },
    featureKey: { $in: popularPaymentKeys() },
  };
}

async function defaultLoadCounts(env, now) {
  const collections = await openOpsCollections(env);
  return withMongoRetry(env, () => collections.revenueFacts.aggregate([
    { $match: buildPopularMatch(now) },
    { $group: { _id: "$featureKey", n: { $sum: 1 } } },
  ]).toArray());
}

function cacheKey(dateKey) {
  return `popular-services:${CACHE_VERSION}:${dateKey}`;
}

/**
 * @param {Request} request
 * @param {object} env
 * @param {{ loadCounts?: (env: object, now: Date) => Promise<Array>, now?: () => Date, readThroughCache?: Function }} [deps]
 */
export async function handlePopularServicesRoutes(request, env, deps = {}) {
  if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed();

  const loadCounts = deps.loadCounts || defaultLoadCounts;
  const readThroughCache = deps.readThroughCache || readCmsThroughCache;
  const now = deps.now ? deps.now() : new Date();
  const today = kstDateKey(now);

  let loaded = false;
  const load = async () => {
    loaded = true;
    const rows = await loadCounts(env, now);
    return { asOf: today, windowDays: POPULAR_WINDOW_DAYS, items: rankPopularServices(rows) };
  };

  let result = null;
  try {
    result = await readThroughCache({ key: cacheKey(today), ttlSeconds: CACHE_TTL_SECONDS, staleTtlSeconds: CACHE_STALE_TTL_SECONDS, load });
  } catch (error) {
    // 날짜가 막 바뀐 직후 DB 가 실패하면 어제 키라도 꺼낸다. 그것도 없으면 503 — 화면은 섹션을 숨긴다.
    try {
      result = await readThroughCache({
        key: cacheKey(addDaysKey(today, -1)),
        ttlSeconds: 0,
        staleTtlSeconds: CACHE_STALE_TTL_SECONDS,
        load: async () => { throw error; },
      });
      result = { ...result, stale: true };
      loaded = false;
    } catch {
      console.warn("[popular-services] load failed", String(error?.message || error).slice(0, 200));
      return json({ ok: false, items: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  }

  const value = result?.value || {};
  const body = {
    ok: true,
    asOf: String(value.asOf || today),
    windowDays: POPULAR_WINDOW_DAYS,
    // 캐시에 무엇이 들어 있든 공개 필드만 다시 고른다(건수 누출 방지).
    items: (Array.isArray(value.items) ? value.items : []).map((item) => ({
      featureKey: String(item.featureKey),
      rank: Number(item.rank),
      source: item.source === "sales" ? "sales" : "curated",
    })),
  };
  const state = loaded ? "miss" : result?.stale ? "stale" : "hit";
  return json(body, { headers: { "Cache-Control": CACHE_CONTROL, "X-CD-Cache": state } });
}
