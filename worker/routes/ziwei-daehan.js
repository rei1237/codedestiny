import { FEATURE_KEY_PRICE_TABLE } from "../lib/paid-feature-registry.js";
import { requireAuth } from "../lib/auth.js";
import { connectDb, mongoose, withMongoRetry } from "../lib/db.js";
import { json, methodNotAllowed, notFound, readJson, getRoutePath } from "../lib/http.js";
import { findActivePaidContentUnlock } from "../lib/content-unlocks.js";
import { readProfileBirthUnlock } from "../lib/paid-content-read-access.js";
import { handleBillingRoutes, BILLING_SNAPSHOT_USER_PROJECTION } from "./billing.js";
import { scopeConnection } from "../lib/db-scope-connection.js";

const DAEHAN_COST = FEATURE_KEY_PRICE_TABLE["ziwei_decade_luck"].cost;
const DAEHAN_SERVICE_KEY = "ziwei";
const DAEHAN_FEATURE_KEY = "ziwei_decade_luck";
const DAEHAN_CONTENT_KEY = "ziwei.decadeLuck";
const LEGACY_DAEHAN_CONTENT_KEY = "ziwei.daehanTimeline";

let daehanIndexPromise = null;

function cleanId(value, maxLen = 100) {
  return String(value || "").trim().slice(0, maxLen).replace(/\s+/g, "_");
}

function getRequestProfileSource(request, body = {}) {
  const url = new URL(request.url);
  return {
    profileId: url.searchParams.get("profileId") || body?.profileId,
    selectedProfileId: url.searchParams.get("selectedProfileId") || body?.selectedProfileId,
    profile: body?.profile,
  };
}

async function ensureDaehanIndexes() {
  if (daehanIndexPromise) return daehanIndexPromise;
  daehanIndexPromise = Promise.all([
    (scopeConnection() || mongoose.connection).db.collection("daehan_purchases").createIndex(
      { userId: 1, profileId: 1 },
      { unique: true, name: "uniq_daehan_purchase_user_profile" },
    ),
  ]).catch((error) => {
    daehanIndexPromise = null;
    throw error;
  });
  return daehanIndexPromise;
}

// 🔴 대한 흐름은 출생 기반 해금(userId + birthKey + contentKey)이다. 요청이 실은 저장 프로필만 받는다 —
// 현재 프로필(destinyProfilesCurrentId) 폴백은 없앴다. 합성 출생 id("birth:…")는 프로필이 아니다.
function resolveDaehanProfileId(source = {}) {
  const id = cleanId(source?.profileId || source?.selectedProfileId || source?.profile?.profileId || source?.profile?.id, 80);
  return id.startsWith("birth:") ? "" : id;
}

async function getDaehanPurchase(userId, profileId) {
  if (!userId || !profileId) return null;
  return (scopeConnection() || mongoose.connection).db.collection("daehan_purchases").findOne({
    userId: String(userId),
    profileId: String(profileId),
  });
}

/* 해금 판정. { ok:false, reason } 이면 프로필 문제(MISSING_PROFILE_ID / INVALID_PROFILE)다.
   출생 기반 근거(BIRTH 행)만 본다 — USER·"__user__" 행과 계정 배열은 근거가 아니다.
   레거시 contentKey(ziwei.daehanTimeline)도 featureKey 를 함께 넘겨 출생 분기로만 읽는다
   (featureKey 없이 contentKey 만 넘기면 계정 스코프 절로 떨어진다). DB 오류는 그대로 던진다(503). */
async function readDaehanAccess(userId, profileId, env = {}) {
  const access = await readProfileBirthUnlock(env, { userId: String(userId || ""), profileId, featureKey: DAEHAN_FEATURE_KEY });
  if (!access.ok) return { ok: false, reason: access.reason, isPurchased: false };
  if (access.unlocked) return { ok: true, isPurchased: true };
  const isPurchased = await withMongoRetry(env, async () => {
    if (await getDaehanPurchase(userId, profileId)) return true;
    const legacy = await findActivePaidContentUnlock({
      userId: String(userId),
      profileId,
      featureKey: DAEHAN_FEATURE_KEY,
      serviceKey: DAEHAN_SERVICE_KEY,
      contentKey: LEGACY_DAEHAN_CONTENT_KEY,
      findProfileCard: async ({ profileId: wanted }) => (wanted === profileId ? access.card : null),
    });
    return Boolean(legacy?._id);
  });
  return { ok: true, isPurchased };
}

function daehanProfileErrorResponse(reason) {
  if (reason === "LOGIN_REQUIRED") {
    return json({ ok: false, success: false, error: "UNAUTHORIZED", message: "로그인이 필요합니다." }, { status: 401 });
  }
  if (reason === "INVALID_PROFILE") {
    return json({
      ok: false,
      success: false,
      error: "INVALID_PROFILE",
      reason: "INVALID_PROFILE",
      requiresProfile: true,
      message: "선택한 프로필을 찾지 못했습니다. 저장된 프로필을 다시 선택해 주세요.",
    }, { status: 403 });
  }
  return json({
    ok: false,
    success: false,
    error: "MISSING_PROFILE_ID",
    reason: "MISSING_PROFILE_ID",
    requiresProfile: true,
    message: "프로필을 저장한 뒤 구매해 주세요.",
  }, { status: 400 });
}

function daehanStatusPayload({ profileId, isPurchased, data = null }) {
  return {
    ok: true,
    success: true,
    isPurchased: Boolean(isPurchased),
    data,
    profileId,
    required: DAEHAN_COST,
    featureKey: DAEHAN_FEATURE_KEY,
    contentKey: DAEHAN_CONTENT_KEY,
  };
}

async function handleDaehanStatus(request, env) {
  const auth = await requireAuth(request, env);
  await connectDb(env);
  // 🔴 여기서 ensureDaehanIndexes() 를 부르지 않는다. 조회 경로는 유니크 제약이 필요 없는데,
  // 아이솔레이트가 새로 뜰 때마다 이 엔드포인트의 최초 요청이 createIndex 왕복을 지불하고 있었다.
  // 인덱스 생성은 scripts/migrations/20260816-add-daehan-purchase-index.mjs 가 맡고,
  // 중복 구매를 실제로 막아야 하는 unlock(쓰기) 경로에는 호출이 그대로 남아 있다.

  const profileId = resolveDaehanProfileId(getRequestProfileSource(request));
  if (!profileId) return daehanProfileErrorResponse("MISSING_PROFILE_ID");

  const access = await readDaehanAccess(auth.userId, profileId, env);
  if (!access.ok) return daehanProfileErrorResponse(access.reason);
  return json(daehanStatusPayload({ profileId, isPurchased: access.isPurchased }));
}

async function handleDaehanUnlock(request, env) {
  // billing 프로젝션으로 한 번에 읽어 authUserDoc 를 확보해 두면, 아래 내부 위임(coin-gate)이
  // users 를 다시 읽지 않고 이 인증 결과를 그대로 재사용한다(preverifiedAuth).
  const auth = await requireAuth(request, env, { userProjection: BILLING_SNAPSHOT_USER_PROJECTION });
  const body = await readJson(request);
  await connectDb(env);
  await ensureDaehanIndexes();

  const profileId = resolveDaehanProfileId(getRequestProfileSource(request, body));
  if (!profileId) return daehanProfileErrorResponse("MISSING_PROFILE_ID");

  const access = await readDaehanAccess(auth.userId, profileId, env);
  if (!access.ok) return daehanProfileErrorResponse(access.reason);
  if (access.isPurchased) {
    return json({
      ...daehanStatusPayload({ profileId, isPurchased: true }),
      alreadyPurchased: true,
      localOnly: true,
    });
  }

  const billingUrl = new URL("/api/billing/coin-gate", request.url);
  const billingHeaders = new Headers(request.headers || {});
  billingHeaders.set("Content-Type", "application/json");
  const billingRequest = new Request(billingUrl.toString(), {
    method: "POST",
    headers: billingHeaders,
    body: JSON.stringify({
      ...body,
      featureKey: DAEHAN_FEATURE_KEY,
      contentKey: DAEHAN_CONTENT_KEY,
      reason: "자미두수 대한 흐름 해금",
      cost: DAEHAN_COST,
      coinPrice: DAEHAN_COST,
      profileId,
      selectedProfileId: profileId,
    }),
  });
  const billingResponse = await handleBillingRoutes(billingRequest, env, { preverifiedAuth: auth });
  if (!billingResponse.ok) return billingResponse;

  let billingPayload = {};
  try { billingPayload = await billingResponse.clone().json(); } catch (_) {}
  return json({
    ...(billingPayload && typeof billingPayload === "object" ? billingPayload : {}),
    ...daehanStatusPayload({ profileId, isPurchased: true, data: billingPayload?.data || null }),
    billing: billingPayload?.data || billingPayload || null,
  }, { status: billingResponse.status, headers: billingResponse.headers });
}

function routeError(error) {
  const status = Number(error?.status || 500);
  const code = String(error?.payload?.code || error?.code || (status === 401 ? "UNAUTHORIZED" : "DAEHAN_UNLOCK_FAILED"));
  return json({
    ok: false,
    success: false,
    error: code,
    message: String(error?.message || "대한 타임라인 처리 중 오류가 발생했습니다."),
  }, { status });
}

export async function handleZiweiDaehanRoutes(request, env) {
  try {
    const path = getRoutePath(request, "/api/ziwei/daehan");
    const method = request.method.toUpperCase();
    if (method === "OPTIONS") return new Response(null, { status: 204 });
    if (path === "/status") {
      if (method !== "GET") return methodNotAllowed();
      return await handleDaehanStatus(request, env);
    }
    if (path === "/") {
      if (method !== "POST") return methodNotAllowed();
      return await handleDaehanUnlock(request, env);
    }
    return notFound();
  } catch (error) {
    return routeError(error);
  }
}
