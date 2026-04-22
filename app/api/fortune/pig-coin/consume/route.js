import { NextResponse } from "next/server";
import { getUserModel } from "../../../../_lib/models/UserModel";
import { getPointHistoryModel } from "../../../../_lib/models/PointHistoryModel";
import { isAdminRequest, verifyJwtFromRequest } from "../../../_lib/adminAccess";
import { resolveUnlockAliasKeys } from "../../../../_lib/featureUnlocks";

export const runtime = "nodejs";

const PIG_COIN_DEFAULT_UNLOCK_COST = 50;
const PIG_COIN_MAX_COST = 50000;
const TEST_INICIS_LOGIN_ID = "test_inicis";
const SUBSCRIPTION_FREE_LIMIT = {
  standard: 30,
  premium: 50,
  vvip: 100,
};

const PROFILE_SUB_PLANS = {
  standard: { name: "스탠다드 꿀", coins: 115, profileLimit: 3, freeLimit: 30 },
  premium: { name: "프리미엄 꿀", coins: 360, profileLimit: 7, freeLimit: 50 },
  vvip: { name: "VVIP 꿀단지", coins: 700, profileLimit: 15, freeLimit: 100 },
};

const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9:_\-.]{8,120}$/;

const TEST_ACCOUNT_LOGIN_IDS = new Set(
  String(process.env.TEST_ACCOUNT_LOGIN_IDS || TEST_INICIS_LOGIN_ID)
    .split(",")
    .map((v) => String(v || "").trim().toLowerCase())
    .filter(Boolean)
);

function getAdminTestTier(request) {
  const raw = String(request.headers.get("x-admin-subscription-tier") || "").trim().toLowerCase();
  if (raw === "standard" || raw === "premium" || raw === "vvip") return raw;
  return "";
}

function getSubscriptionFreeLimit(user) {
  const tier = String(user?.profileSubscription?.tier || "free");
  const expiresAtRaw = user?.profileSubscription?.expiresAt;
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime())) return 0;
  if (expiresAt.getTime() <= Date.now()) return 0;
  return Number(SUBSCRIPTION_FREE_LIMIT[tier] || 0);
}

function normalizeIdempotencyKey(rawValue) {
  const key = String(rawValue || "").trim();
  if (!key) return "";
  if (!IDEMPOTENCY_KEY_RE.test(key)) return "";
  return key.slice(0, 120);
}

function isTestAccountUser(user) {
  const email = String(user?.email || "").trim().toLowerCase();
  if (!email) return false;
  return TEST_ACCOUNT_LOGIN_IDS.has(email);
}

export async function POST(request) {
  const payload = verifyJwtFromRequest(request);
  const adminMode = await isAdminRequest(request);
  if (!payload && !adminMode) return NextResponse.json({ ok: false, message: "인증이 필요합니다." }, { status: 401 });

  const userId = payload?.userId;
  if (!userId && !adminMode) return NextResponse.json({ ok: false, message: "로그인이 필요합니다." }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { body = {}; }

  const requestedCost = Number(body?.cost);
  const cost = Number.isFinite(requestedCost) && requestedCost > 0
    ? Math.floor(requestedCost)
    : PIG_COIN_DEFAULT_UNLOCK_COST;

  if (cost <= 0 || cost > PIG_COIN_MAX_COST) {
    return NextResponse.json({ ok: false, message: "유효하지 않은 코인 차감 수량입니다." }, { status: 400 });
  }

  const reason = String(body?.reason || "유료 섹션 잠금 해제").trim().slice(0, 120);
  const featureKey = String(body?.featureKey || "pig-coin-unlock").trim().slice(0, 60);
  const shouldPersistUnlock = featureKey && featureKey !== "pig-coin-unlock";
  const unlockKeys = shouldPersistUnlock ? resolveUnlockAliasKeys(featureKey) : [];
  const forceDeduct = body?.forceDeduct === true || String(body?.forceDeduct || "").toLowerCase() === "true";
  const idempotencyKey = normalizeIdempotencyKey(body?.requestId || request.headers.get("x-idempotency-key") || "");
  const adminTestTier = adminMode ? getAdminTestTier(request) : "";

  // 관리자 모드: 티어 테스트가 선택된 경우 실제 차감 없이 티어 혜택/차감 대상을 시뮬레이션한다.
  if (adminMode) {
    const plan = adminTestTier ? PROFILE_SUB_PLANS[adminTestTier] : null;
    const freeLimit = Number(plan?.freeLimit || 0);
    const profileLimit = Number(plan?.profileLimit || 1);
    const recommendedCoins = Number(plan?.coins || 0);

    let currentPoints = 0;
    if (userId) {
      try {
        const User = await getUserModel();
        const user = await User.findById(userId).select("points").lean();
        currentPoints = Number(user?.points || 0);
      } catch {
        currentPoints = 0;
      }
    }

    const message = adminTestTier
      ? `관리자 프리패스 적용 (${plan?.name || adminTestTier}). 시뮬레이션 기준: 무료 한도 ${freeLimit}코인, 프로필 ${profileLimit}개, 기준 코인 ${recommendedCoins}코인.`
      : "관리자 프리패스로 처리되었습니다. (티어 테스트 미적용)";

    return NextResponse.json({
      ok: true,
      adminMode: true,
      adminTestTier: adminTestTier || null,
      simulated: true,
      subscriptionFree: true,
      freeLimit,
      profileLimit,
      recommendedCoins,
      simulatedChargeCoins: 0,
      forceDeduct,
      message,
      requiredCoins: cost,
      ...(userId ? { user: { id: String(userId), points: currentPoints } } : {}),
    });
  }

  try {
    const User = await getUserModel();
    const PointHistory = await getPointHistoryModel();

    if (idempotencyKey) {
      const existing = await PointHistory.findOne({
        userId,
        featureKey,
        kind: { $in: ["deduct", "adjust"] },
        "metadata.idempotencyKey": idempotencyKey,
      }).sort({ createdAt: -1 }).lean();

      if (existing) {
        const existingUser = await User.findById(userId).select("points").lean();
        const existingPoints = Number(existingUser?.points ?? existing?.balanceAfter ?? 0);
        return NextResponse.json({
          ok: true,
          idempotentReplay: true,
          subscriptionFree: Boolean(existing?.metadata?.subscriptionFree),
          message: "이미 처리된 결제 요청입니다.",
          requiredCoins: cost,
          user: { id: String(userId), points: existingPoints },
        });
      }
    }

    const user = await User.findById(userId).select("points profileSubscription email").lean();
    if (!user) {
      return NextResponse.json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    if (isTestAccountUser(user)) {
      if (unlockKeys.length) {
        await User.findByIdAndUpdate(userId, {
          $addToSet: { unlockedFeatures: { $each: unlockKeys } },
        }).catch(() => {});
      }

      await PointHistory.create({
        userId,
        kind: "adjust",
        delta: 0,
        balanceAfter: Number(user.points || 0),
        reason: `${reason} (테스트 계정 예외)` ,
        featureKey,
        metadata: {
          source: "fortune.pig-coin.consume",
          testAccountBypass: true,
          requestedCost: cost,
          idempotencyKey: idempotencyKey || undefined,
        },
      }).catch(() => {});

      return NextResponse.json({
        ok: true,
        testAccountBypass: true,
        message: "테스트 계정 예외가 적용되어 코인 차감 없이 이용됩니다.",
        requiredCoins: cost,
        unlockKeys,
        user: { id: String(userId), points: Number(user.points || 0) },
      });
    }

    const freeLimit = getSubscriptionFreeLimit(user);
    if (!forceDeduct && freeLimit > 0 && cost <= freeLimit) {
      if (unlockKeys.length) {
        await User.findByIdAndUpdate(userId, {
          $addToSet: { unlockedFeatures: { $each: unlockKeys } },
        }).catch(() => {});
      }

      await PointHistory.create({
        userId,
        kind: "adjust",
        delta: 0,
        balanceAfter: Number(user.points || 0),
        reason: `${reason} (구독 무료 사용)`,
        featureKey,
        metadata: {
          source: "fortune.pig-coin.consume",
          subscriptionFree: true,
          freeLimit,
          requestedCost: cost,
          idempotencyKey: idempotencyKey || undefined,
        },
      }).catch(() => {});

      return NextResponse.json({
        ok: true,
        subscriptionFree: true,
        message: `구독 혜택으로 ${cost.toLocaleString("ko-KR")}코인 서비스가 무료 처리되었습니다.`,
        requiredCoins: cost,
        unlockKeys,
        user: { id: String(userId), points: Number(user.points || 0) },
      });
    }

    const updateOps = { $inc: { points: -cost } };
    if (unlockKeys.length) {
      updateOps.$addToSet = { unlockedFeatures: { $each: unlockKeys } };
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, points: { $gte: cost } },
      updateOps,
      { new: true, projection: { points: 1 } }
    ).lean();

    if (!updatedUser) {
      return NextResponse.json({ ok: false, message: "코인이 부족합니다.", requiredCoins: cost }, { status: 402 });
    }

    try {
      await PointHistory.create({
        userId,
        kind: "deduct",
        delta: -cost,
        balanceAfter: Number(updatedUser.points || 0),
        reason,
        featureKey,
        metadata: {
          source: "fortune.pig-coin.consume",
          idempotencyKey: idempotencyKey || undefined,
          forceDeduct,
        },
      });
    } catch (historyErr) {
      console.error("[pig-coin/consume] history write failed, refunding:", historyErr);
      await User.findByIdAndUpdate(userId, { $inc: { points: cost } }).catch((rollbackErr) => {
        console.error("[pig-coin/consume] refund rollback failed:", rollbackErr);
      });

      if (unlockKeys.length) {
        await User.findByIdAndUpdate(userId, {
          $pull: { unlockedFeatures: { $in: unlockKeys } },
        }).catch(() => {});
      }

      return NextResponse.json({
        ok: false,
        message: "결제 기록 저장에 실패하여 코인을 복구했습니다. 잠시 후 다시 시도해 주세요.",
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: `${cost.toLocaleString("ko-KR")} 코인이 차감되었습니다.`,
      requiredCoins: cost,
      unlockKeys,
      user: { id: String(userId), points: Number(updatedUser.points || 0) },
    });
  } catch (err) {
    console.error("[pig-coin/consume] error:", err);
    return NextResponse.json({ ok: false, message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function PUT(request) {
  return NextResponse.json({ ok: false, message: "허용되지 않은 메서드입니다." }, { status: 405 });
}

export async function PATCH(request) {
  return NextResponse.json({ ok: false, message: "허용되지 않은 메서드입니다." }, { status: 405 });
}

export async function DELETE(request) {
  return NextResponse.json({ ok: false, message: "허용되지 않은 메서드입니다." }, { status: 405 });
}

export async function OPTIONS(request) {
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function HEAD(request) {
  return new Response(null, { status: 200 });
}
