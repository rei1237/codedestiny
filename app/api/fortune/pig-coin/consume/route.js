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

function getSubscriptionFreeLimit(user) {
  const tier = String(user?.profileSubscription?.tier || "free");
  const expiresAtRaw = user?.profileSubscription?.expiresAt;
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime())) return 0;
  if (expiresAt.getTime() <= Date.now()) return 0;
  return Number(SUBSCRIPTION_FREE_LIMIT[tier] || 0);
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

  // 관리자 모드: 코인 차감 없이 즉시 통과
  if (adminMode && !userId) {
    return NextResponse.json({
      ok: true,
      adminMode: true,
      message: "관리자 프리패스로 처리되었습니다.",
      requiredCoins: cost,
    });
  }

  try {
    const User = await getUserModel();
    const user = await User.findById(userId).select("points profileSubscription").lean();
    if (!user) {
      return NextResponse.json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    const freeLimit = getSubscriptionFreeLimit(user);
    if (freeLimit > 0 && cost <= freeLimit) {
      getPointHistoryModel().then(PH => PH.create({
        userId,
        kind: "adjust",
        delta: 0,
        balanceAfter: Number(user.points || 0),
        reason: `${reason} (구독 무료 사용)`,
        featureKey,
        metadata: { source: "fortune.pig-coin.consume", subscriptionFree: true, freeLimit, requestedCost: cost },
      })).catch(() => {});

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

    // 히스토리 비동기 기록 (실패해도 응답에 영향 없음)
    getPointHistoryModel().then(PH => PH.create({
      userId,
      kind: "deduct",
      delta: -cost,
      balanceAfter: Number(updatedUser.points || 0),
      reason,
      featureKey,
      metadata: { source: "fortune.pig-coin.consume" },
    })).catch(() => {});

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
