import { requireAuth } from "../lib/auth.js";
import { connectDb, mongoose } from "../lib/db.js";
import { json, methodNotAllowed, notFound, readJson, getRoutePath } from "../lib/http.js";
import {
  CONTENT_ENTITLEMENT_SCOPES,
  CONTENT_ENTITLEMENT_SOURCES,
  PointHistory,
  User,
} from "../lib/models.js";
import { hasUnlockedContent, upsertContentUnlock } from "../lib/content-unlocks.js";

const DAEHAN_COST = 200;
const DAEHAN_SERVICE_KEY = "ziwei";
const DAEHAN_FEATURE_KEY = "ziwei_daehan_timeline";
const DAEHAN_CONTENT_KEY = "ziwei.daehanTimeline";
const DAEHAN_REASON = "대한(大限) 타임라인 인생 전체 분석 해금";

let daehanIndexPromise = null;

function cleanId(value, maxLen = 100) {
  return String(value || "").trim().slice(0, maxLen).replace(/\s+/g, "_");
}

function nowIso() {
  return new Date().toISOString();
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
  const collection = mongoose.connection.db.collection("daehan_purchases");
  return collection.findOne({ userId: String(userId), profileId: String(profileId) });
}

async function isDaehanPurchased(userId, profileId) {
  if (!userId || !profileId) return false;
  const purchase = await getDaehanPurchase(userId, profileId);
  if (purchase) return true;
  return hasUnlockedContent({
    userId: String(userId),
    profileId: String(profileId),
    serviceKey: DAEHAN_SERVICE_KEY,
    contentKey: DAEHAN_CONTENT_KEY,
  });
}

async function getUserCoinBalance(userId) {
  const user = await User.findById(userId).select("points recentConsumeRequestIds").lean();
  return {
    points: Math.max(0, Math.floor(Number(user?.points || 0))),
    recentConsumeRequestIds: Array.isArray(user?.recentConsumeRequestIds) ? user.recentConsumeRequestIds : [],
  };
}

function daehanStatusPayload({ profileId, isPurchased, userCoins, data = null }) {
  return {
    ok: true,
    success: true,
    isPurchased: Boolean(isPurchased),
    data,
    profileId,
    required: DAEHAN_COST,
    userCoins,
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

  const [isPurchased, balance] = await Promise.all([
    isDaehanPurchased(auth.userId, profileId),
    getUserCoinBalance(auth.userId),
  ]);

  return json(daehanStatusPayload({
    profileId,
    isPurchased,
    userCoins: balance.points,
  }));
}

async function handleDaehanUnlock(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  await connectDb(env);
  await ensureDaehanIndexes();

  const profileId = await resolveDaehanProfileId(auth.userId, getRequestProfileSource(request, body));
  if (!profileId) {
    return json({ ok: false, error: "MISSING_PROFILE_ID", message: "프로필을 먼저 선택해 주세요." }, { status: 400 });
  }

  const alreadyPurchased = await isDaehanPurchased(auth.userId, profileId);
  const initialBalance = await getUserCoinBalance(auth.userId);
  if (alreadyPurchased) {
    return json({
      ...daehanStatusPayload({ profileId, isPurchased: true, userCoins: initialBalance.points }),
      alreadyPurchased: true,
      localOnly: true,
    });
  }

  const requestId = cleanId(
    body?.requestId
      || body?.idempotencyKey
      || body?.purchaseId
      || `${DAEHAN_FEATURE_KEY}:${profileId}:${Date.now().toString(36)}`,
    160,
  );

  const updatedUser = await User.findOneAndUpdate(
    {
      _id: auth.userId,
      points: { $gte: DAEHAN_COST },
      ...(requestId ? { recentConsumeRequestIds: { $ne: requestId } } : {}),
    },
    {
      $inc: { points: -DAEHAN_COST },
      ...(requestId ? { $addToSet: { recentConsumeRequestIds: requestId } } : {}),
    },
    { returnDocument: "after", projection: { points: 1, recentConsumeRequestIds: 1 } },
  ).lean();

  if (!updatedUser) {
    const current = await getUserCoinBalance(auth.userId);
    if (requestId && current.recentConsumeRequestIds.includes(requestId)) {
      const purchased = await isDaehanPurchased(auth.userId, profileId);
      if (!purchased) {
        return json({
          ok: false,
          success: false,
          error: "REQUEST_ALREADY_PROCESSED",
          message: "이미 처리 중인 해금 요청입니다. 잠시 후 다시 확인해 주세요.",
          profileId,
          userCoins: current.points,
        }, { status: 409 });
      }
      return json({
        ...daehanStatusPayload({ profileId, isPurchased: purchased, userCoins: current.points }),
        idempotent: true,
      });
    }
    return json({
      ok: false,
      success: false,
      error: "INSUFFICIENT_COINS",
      required: DAEHAN_COST,
      current: current.points,
      userCoins: current.points,
      message: `대한 타임라인 해금에 ${(DAEHAN_COST * 100).toLocaleString("ko-KR")}원 결제가 필요합니다. 현재 보유 원화 가치: ${(Math.max(0, Number(current.points || 0)) * 100).toLocaleString("ko-KR")}원`,
    }, { status: 402 });
  }

  const balanceAfter = Math.max(0, Math.floor(Number(updatedUser?.points || 0)));
  let history = null;

  try {
    history = await PointHistory.create({
      userId: auth.userId,
      kind: "deduct",
      delta: -DAEHAN_COST,
      balanceAfter,
      reason: DAEHAN_REASON,
      featureKey: DAEHAN_FEATURE_KEY,
      metadata: {
        accessType: "coin",
        accessMethod: "COIN",
        paymentMethod: "COIN",
        transactionType: "coin",
        requestId,
        purchaseId: requestId,
        idempotencyKey: cleanId(body?.idempotencyKey || requestId, 160),
        orderId: cleanId(body?.orderId || requestId, 160),
        profileId,
        selectedProfileId: profileId,
        serviceKey: DAEHAN_SERVICE_KEY,
        contentKey: DAEHAN_CONTENT_KEY,
        featureKey: DAEHAN_FEATURE_KEY,
        coinPrice: DAEHAN_COST,
        chargedCoins: DAEHAN_COST,
        paidAt: nowIso(),
      },
    });

    await mongoose.connection.db.collection("daehan_purchases").updateOne(
      { userId: String(auth.userId), profileId },
      {
        $set: {
          userId: String(auth.userId),
          profileId,
          coinsPaid: DAEHAN_COST,
          contentKey: DAEHAN_CONTENT_KEY,
          featureKey: DAEHAN_FEATURE_KEY,
          purchaseId: requestId,
          pointHistoryId: String(history?._id || ""),
          purchasedAt: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );

    await upsertContentUnlock({
      userId: String(auth.userId),
      profileId,
      serviceKey: DAEHAN_SERVICE_KEY,
      contentKey: DAEHAN_CONTENT_KEY,
      scope: CONTENT_ENTITLEMENT_SCOPES.PROFILE,
      source: CONTENT_ENTITLEMENT_SOURCES.COIN,
      paymentId: String(history?._id || requestId),
      orderId: requestId,
      coinAmount: DAEHAN_COST,
    });
  } catch (error) {
    await User.findByIdAndUpdate(auth.userId, {
      $inc: { points: DAEHAN_COST },
      ...(requestId ? { $pull: { recentConsumeRequestIds: requestId } } : {}),
    }).catch(() => {});
    if (history?._id) {
      await PointHistory.updateOne(
        { _id: history._id, userId: auth.userId },
        {
          $set: {
            "metadata.coinRefundedForUnlockFailure": true,
            "metadata.coinRefundedAt": new Date(),
            "metadata.unlockFailureMessage": String(error?.message || "").slice(0, 500),
          },
        },
      ).catch(() => {});
    }
    throw error;
  }

  return json({
    ...daehanStatusPayload({ profileId, isPurchased: true, userCoins: balanceAfter }),
    chargedCoins: DAEHAN_COST,
    balanceAfter,
    purchaseId: requestId,
    localOnly: true,
  });
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
