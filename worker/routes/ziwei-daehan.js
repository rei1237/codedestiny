import { requireAuth } from "../lib/auth.js";
import { connectDb, mongoose, withMongoRetry } from "../lib/db.js";
import { json, methodNotAllowed, notFound, readJson, getRoutePath } from "../lib/http.js";
import { User } from "../lib/models.js";
import { hasUnlockedContent } from "../lib/content-unlocks.js";
import { handleBillingRoutes, BILLING_SNAPSHOT_USER_PROJECTION } from "./billing.js";

const DAEHAN_COST = 100;
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
    mongoose.connection.db.collection("daehan_purchases").createIndex(
      { userId: 1, profileId: 1 },
      { unique: true, name: "uniq_daehan_purchase_user_profile" },
    ),
  ]).catch((error) => {
    daehanIndexPromise = null;
    throw error;
  });
  return daehanIndexPromise;
}

async function resolveDaehanProfileId(userId, source = {}) {
  const explicit = cleanId(source?.profileId || source?.selectedProfileId || source?.profile?.profileId || source?.profile?.id);
  if (explicit || !userId) return explicit;
  const user = await User.findById(userId).select("destinyProfilesCurrentId").lean();
  return cleanId(user?.destinyProfilesCurrentId);
}

async function getDaehanPurchase(userId, profileId) {
  if (!userId || !profileId) return null;
  return mongoose.connection.db.collection("daehan_purchases").findOne({
    userId: String(userId),
    profileId: String(profileId),
  });
}

async function isDaehanPurchased(userId, profileId, env = {}) {
  if (!userId || !profileId) return false;
  return withMongoRetry(env, async () => {
    if (await getDaehanPurchase(userId, profileId)) return true;
    for (const contentKey of [DAEHAN_CONTENT_KEY, LEGACY_DAEHAN_CONTENT_KEY]) {
      if (await hasUnlockedContent({
        userId: String(userId),
        profileId: String(profileId),
        serviceKey: DAEHAN_SERVICE_KEY,
        contentKey,
      })) return true;
    }
    return false;
  });
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
  await ensureDaehanIndexes();

  const profileId = await resolveDaehanProfileId(auth.userId, getRequestProfileSource(request));
  if (!profileId) {
    return json({ ok: false, error: "MISSING_PROFILE_ID", message: "프로필을 먼저 선택해 주세요." }, { status: 400 });
  }

  const isPurchased = await isDaehanPurchased(auth.userId, profileId, env);
  return json(daehanStatusPayload({ profileId, isPurchased }));
}

async function handleDaehanUnlock(request, env) {
  // billing 프로젝션으로 한 번에 읽어 authUserDoc 를 확보해 두면, 아래 내부 위임(coin-gate)이
  // users 를 다시 읽지 않고 이 인증 결과를 그대로 재사용한다(preverifiedAuth).
  const auth = await requireAuth(request, env, { userProjection: BILLING_SNAPSHOT_USER_PROJECTION });
  const body = await readJson(request);
  await connectDb(env);
  await ensureDaehanIndexes();

  const profileId = await resolveDaehanProfileId(auth.userId, getRequestProfileSource(request, body));
  if (!profileId) {
    return json({ ok: false, error: "MISSING_PROFILE_ID", message: "프로필을 먼저 선택해 주세요." }, { status: 400 });
  }

  if (await isDaehanPurchased(auth.userId, profileId, env)) {
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
