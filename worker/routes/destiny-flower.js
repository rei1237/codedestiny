/** Flower of Destiny: public, server-calculated matching limited per IP (plus a public per-flower card for share links). The saju result card is free; the full atelier detail (other three sources, theme story, candidates, deep flower language) is returned only to accounts holding the flower-fc unlock. No result storage. */
import { createHash } from "node:crypto";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { incrementRateLimit } from "../lib/rate-limit.js";
import { getOptionalUserFromRequest } from "../lib/auth.js";
import { hasPurchasedAccountContentAccess } from "../lib/paid-content-read-access.js";
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

/**
 * 2026-11-08 사용자 결정 "결과 카드만 무료": 해금 없는 요청에는 사주 결과 카드에 필요한 필드만 보낸다.
 * 🔴 상세(나머지 세 체계, 후보 꽃, 이야기·근거, 나의 꽃말, flower_data 의 의식·관계·일 테마 등)는
 *    flower-fc 권한이 있을 때만 응답에 실린다 — 클라이언트 잠금만 믿지 않는다.
 */
function toFreeSajuCard(matched) {
  if (!matched || typeof matched !== "object") return null;
  const saju = (matched.profile && matched.profile.domains && matched.profile.domains.saju) || {};
  const flowerData = matched.flower_data || {};
  const pick = (obj, keys) => Object.fromEntries(keys.filter((key) => obj[key] !== undefined).map((key) => [key, obj[key]]));
  return {
    profile: { domains: { saju: pick(saju, ["day_master", "day_master_stem", "day_master_hanja", "day_master_element", "season"]) } },
    flower: matched.flower || matched.flowerSymbology || null,
    flower_data: pick(flowerData, ["sticker_label", "day_master_badge", "season_label", "scenario_title", "scenario_reason"]),
    saju_verdict: matched.saju_verdict || "",
    share_hook: matched.share_hook || null,
    fallback_logic: { used: Boolean(matched.fallback_logic && matched.fallback_logic.used) },
  };
}

/**
 * 아틀리에 상세 권한. 로그인하지 않았으면 false.
 * 🔴 인증·권한 조회의 DB 장애는 "미구매"로 바꾸지 않는다 — degraded 로 알려 클라이언트가 결제 버튼 대신 재시도를 보이게 한다.
 */
async function resolveAtelierAccess(request, env) {
  try {
    const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
    if (!auth?.userId) return { unlocked: false, degraded: false };
    const unlocked = await hasPurchasedAccountContentAccess(env, { userId: auth.userId, featureKey: FLOWER_UNLOCK_FEATURE_KEY });
    return { unlocked: Boolean(unlocked), degraded: false };
  } catch (error) {
    console.warn("[destiny-flower] atelier access check failed", String(error?.message || error).slice(0, 200));
    return { unlocked: false, degraded: true };
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
  const access = await resolveAtelierAccess(request, env);
  const sources = {};
  for (const source of access.unlocked ? normalizeSources(body.sources) : ["saju"]) {
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

  if (!access.unlocked) {
    sources.saju = toFreeSajuCard(sources.saju);
    return json({ ok: true, atelierUnlocked: false, entitlementDegraded: access.degraded, sources, theme });
  }
  return json({ ok: true, atelierUnlocked: true, sources, theme });
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
