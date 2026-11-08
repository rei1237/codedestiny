/** Free Flower of Destiny: public, server-calculated matching limited per IP (plus a public per-flower card for share links), no purchase or result storage. Historical flower-fc purchases remain in the payment ledger. */
import { createHash } from "node:crypto";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { incrementRateLimit } from "../lib/rate-limit.js";
import {
  matchDestinyFlower,
  matchAstrologyFlower,
  matchJamidusuFlower,
  matchSukuyoFlower,
  updateFlowerTheme,
  getPublicFlowerCard,
  withDestinyFlowerLocale,
} from "../lib/destiny-flower-engine.js";
import { sajuAuthorityOn } from "../lib/saju-authority-consumer.js";

/** 아틀리에 전체 해금 키. `worker/lib/paid-feature-registry.js` 의 `unlock.flower_fc` 와 같은 값이다. */
export const FLOWER_UNLOCK_FEATURE_KEY = "flower-fc";

/**
 * 2026-11-08 무료 바이럴 퍼널: 로그인 없이 매칭한다. 결과는 결정론 계산(LLM·DB 쓰기 없음)이라
 * 인증 대신 IP 기준 한도만 건다. 저장소는 destiny-compass·destiny-anatomy 와 같은 Mongo
 * `abuse_scores`(worker/lib/rate-limit.js)이고, IP 는 SHA-256 으로만 남긴다.
 */
export const FLOWER_MATCH_RATE_LIMIT = Object.freeze({ max: 30, windowMs: 60 * 1000, endpoint: "destiny-flower:match" });
const localBuckets = new Map();

function readClientKey(request) {
  return String(
    request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "local",
  ).slice(0, 160);
}

/** DB 가 죽었을 때만 쓰는 아이솔레이트 폴백. 한도가 없는 것보다는 낫다(destiny-compass 와 같은 방식). */
function checkLocalRateLimit(key) {
  const now = Date.now();
  const current = localBuckets.get(key);
  if (!current || current.resetAt <= now) {
    localBuckets.set(key, { count: 1, resetAt: now + FLOWER_MATCH_RATE_LIMIT.windowMs });
    if (localBuckets.size > 512) {
      for (const [bucketKey, bucket] of localBuckets) if (bucket.resetAt <= now) localBuckets.delete(bucketKey);
    }
    return true;
  }
  if (current.count >= FLOWER_MATCH_RATE_LIMIT.max) return false;
  current.count += 1;
  return true;
}

async function checkRateLimit(request, env) {
  const ip = readClientKey(request);
  try {
    const { count } = await incrementRateLimit({
      subjectHash: createHash("sha256").update(ip).digest("hex"),
      endpoint: FLOWER_MATCH_RATE_LIMIT.endpoint,
      windowMs: FLOWER_MATCH_RATE_LIMIT.windowMs,
      env,
    });
    return count <= FLOWER_MATCH_RATE_LIMIT.max;
  } catch (error) {
    console.warn("[destiny-flower] rate-limit increment failed", String(error?.message || error).slice(0, 200));
    return checkLocalRateLimit(ip);
  }
}

const SOURCES = Object.freeze(["saju", "astrology", "jamidusu", "sukuyo"]);

const MATCHER_BY_SOURCE = Object.freeze({
  saju: (payload, env) => matchDestinyFlower(payload, { limit: 5, approvedSajuWording: sajuAuthorityOn(env) }),
  astrology: (payload) => matchAstrologyFlower(payload, { source: "astrology" }),
  jamidusu: (payload) => matchJamidusuFlower(payload, { source: "jamidusu" }),
  sukuyo: (payload) => matchSukuyoFlower(payload, { source: "sukuyo" }),
});

function normalizeSources(value) {
  if (!Array.isArray(value) || !value.length) return SOURCES;
  const picked = value
    .map((item) => String(item || "").trim().toLowerCase())
    .filter((item) => SOURCES.includes(item));
  return picked.length ? Array.from(new Set(picked)) : SOURCES;
}

async function handleMatch(request, env) {
  const body = await readJson(request);
  const payload = body && typeof body.profile === "object" && body.profile ? body.profile : null;
  if (!payload) {
    return json({ ok: false, code: "BAD_REQUEST", message: "프로필 정보가 필요합니다." }, { status: 400 });
  }

  if (!(await checkRateLimit(request, env))) {
    return json(
      { ok: false, code: "RATE_LIMITED", message: "요청이 잠시 많아요. 1분 뒤 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  // 꽃 이름·꽃말·근거 문장은 요청 로케일로 번역해 내보낸다. 없거나 ko 면 한국어 원문 그대로.
  const lang = typeof body.lang === "string" ? body.lang : (request.headers.get("x-code-destiny-locale") || "");
  const sources = {};
  for (const source of normalizeSources(body.sources)) {
    try {
      sources[source] = withDestinyFlowerLocale(lang, () => MATCHER_BY_SOURCE[source](payload, env)) || null;
    } catch (error) {
      // 한 체계가 실패해도 나머지 셋은 내보낸다 — 넷을 한 화면에 그리는 4-up 이 통째로 비지 않게.
      console.warn("[destiny-flower] match failed", source, String(error?.message || error).slice(0, 200));
      sources[source] = null;
    }
  }

  let theme = null;
  try {
    theme = withDestinyFlowerLocale(lang, () => updateFlowerTheme(payload, {})) || null;
  } catch (_) {
    theme = null;
  }

  return json({ ok: true, sources, theme });
}

/** 친구 꽃 미리보기: 로그인 없이 꽃 id 로 공개 정보만 돌려준다. 카탈로그에 없는 id 는 404. */
function handlePublicFlower(flowerId) {
  const card = getPublicFlowerCard(flowerId);
  if (!card) return notFound();
  return json({ ok: true, flower: card }, { headers: { "Cache-Control": "public, max-age=86400" } });
}

export async function handleDestinyFlowerRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    if (method === "OPTIONS") return new Response(null, { status: 204 });

    const path = getRoutePath(request, "/api/destiny-flower");
    const publicFlower = path.match(/^\/flower\/([^/]+)$/);
    if (publicFlower) {
      if (method !== "GET") return methodNotAllowed();
      return handlePublicFlower(publicFlower[1].toLowerCase());
    }

    if (method !== "POST") return methodNotAllowed();
    if (path !== "/match") return notFound();

    return await handleMatch(request, env);
  } catch (error) {
    return handleRouteError(error);
  }
}
