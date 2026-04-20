import { NextResponse } from "next/server";
import { getUserModel } from "../../../../../_lib/models/UserModel";
import { getPointHistoryModel } from "../../../../../_lib/models/PointHistoryModel";
import { isAdminRequest, verifyJwtFromRequest } from "../../../../_lib/adminAccess";

export const runtime = "nodejs";

const PROFILE_SUB_PLANS = {
  standard: { name: "스탠다드 꿀", coins: 115, profileLimit: 3, durationDays: 30 },
  premium: { name: "프리미엄 꿀", coins: 360, profileLimit: 7, durationDays: 30 },
  vvip: { name: "VVIP 꿀단지", coins: 700, profileLimit: 15, durationDays: 30 },
};

function verifyToken(request) {
  return verifyJwtFromRequest(request);
}

export async function POST(request) {
  const jwtPayload = verifyToken(request);
  const adminMode = await isAdminRequest(request);

  if (!jwtPayload && !adminMode) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  if (!jwtPayload?.userId) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const reqTier = String(body?.tier || "").trim();
    const plan = PROFILE_SUB_PLANS[reqTier];

    if (!plan) {
      return NextResponse.json({ message: "지원하지 않는 구독 플랜입니다." }, { status: 400 });
    }

    const User = await getUserModel();
    const PointHistory = await getPointHistoryModel();

    const now = new Date();
    const existingUser = await User.findById(jwtPayload.userId)
      .select("points profileSubscription")
      .lean();

    if (!existingUser) {
      return NextResponse.json({ message: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    const cost = Number(plan.coins || 0);
    const prevExpAt = existingUser.profileSubscription?.expiresAt;
    const baseTime = prevExpAt && new Date(prevExpAt) > now
      ? new Date(prevExpAt).getTime()
      : now.getTime();
    const expiresAt = new Date(baseTime + Number(plan.durationDays || 30) * 24 * 60 * 60 * 1000);

    const isFirstSub = !existingUser.profileSubscription?.firstSubAt;

    const updatedUser = await User.findOneAndUpdate(
      { _id: jwtPayload.userId, points: { $gte: cost } },
      {
        $inc: { points: -cost },
        $set: {
          "profileSubscription.tier": reqTier,
          "profileSubscription.startedAt": now,
          "profileSubscription.expiresAt": expiresAt,
          ...(isFirstSub ? { "profileSubscription.firstSubAt": now } : {}),
        },
      },
      { new: true, projection: { points: 1, profileSubscription: 1 } },
    ).lean();

    if (!updatedUser) {
      return NextResponse.json({ message: "코인이 부족합니다.", requiredCoins: cost }, { status: 402 });
    }

    const balanceAfter = Number(updatedUser.points || 0);

    await PointHistory.create({
      userId: jwtPayload.userId,
      kind: "deduct",
      delta: -cost,
      balanceAfter,
      reason: `프로필 ${plan.name} 구독`,
      featureKey: "profile-subscription",
      metadata: {
        tier: reqTier,
        expiresAt: expiresAt.toISOString(),
      },
    }).catch(() => {});

    return NextResponse.json({
      message: `${plan.name} 구독이 시작되었습니다. (30일간 유효)`,
      subscription: {
        tier: reqTier,
        isActive: true,
        expiresAt: expiresAt.toISOString(),
        profileLimit: Number(plan.profileLimit || 1),
      },
      user: { points: balanceAfter },
    });
  } catch (error) {
    console.error("[profile-subscription/subscribe] error:", error);
    return NextResponse.json({ message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
