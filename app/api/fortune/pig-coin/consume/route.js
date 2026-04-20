import { NextResponse } from "next/server";
import { getUserModel } from "../../../../_lib/models/UserModel";
import { getPointHistoryModel } from "../../../../_lib/models/PointHistoryModel";
import { isAdminRequest, verifyJwtFromRequest } from "../../../_lib/adminAccess";

export const runtime = "nodejs";

const PIG_COIN_DEFAULT_UNLOCK_COST = 50;
const PIG_COIN_MAX_COST = 50000;
const SUBSCRIPTION_FREE_LIMIT = {
  standard: 30,
  premium: 50,
  vvip: 100,
};

const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9:_\-.]{8,120}$/;

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
  const forceDeduct = body?.forceDeduct === true || String(body?.forceDeduct || "").toLowerCase() === "true";
  const idempotencyKey = normalizeIdempotencyKey(body?.requestId || request.headers.get("x-idempotency-key") || "");

  // 관리자 모드: 코인 차감 없이 즉시 통과 (로그인 userId 존재 여부와 무관)
  if (adminMode) {
    return NextResponse.json({
      ok: true,
      adminMode: true,
      message: "관리자 프리패스로 처리되었습니다.",
      requiredCoins: cost,
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

    const user = await User.findById(userId).select("points profileSubscription").lean();
    if (!user) {
      return NextResponse.json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    const freeLimit = getSubscriptionFreeLimit(user);
    if (!forceDeduct && freeLimit > 0 && cost <= freeLimit) {
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
        user: { id: String(userId), points: Number(user.points || 0) },
      });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, points: { $gte: cost } },
      { $inc: { points: -cost } },
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
      return NextResponse.json({
        ok: false,
        message: "결제 기록 저장에 실패하여 코인을 복구했습니다. 잠시 후 다시 시도해 주세요.",
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: `${cost.toLocaleString("ko-KR")} 코인이 차감되었습니다.`,
      requiredCoins: cost,
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
