import { NextResponse } from "next/server";
import { getUserModel } from "../../../../../_lib/models/UserModel";
import { getPointHistoryModel } from "../../../../../_lib/models/PointHistoryModel";
import { isAdminRequest, verifyJwtFromRequest } from "../../../../_lib/adminAccess";

export const runtime = "nodejs";

const PROFILE_SUB_PLANS = {
  standard: { name: "스탠다드 꿀",  coins: 115, profileLimit: 3,  durationDays: 30, lowWarnAt: 30 },
  premium:  { name: "프리미엄 꿀",  coins: 360, profileLimit: 7,  durationDays: 30, lowWarnAt: 50 },
  vvip:     { name: "VVIP 꿀단지", coins: 700, profileLimit: 15, durationDays: 30, lowWarnAt: 100 },
};

function getAdminTestTier(request) {
  const raw = String(request.headers.get("x-admin-subscription-tier") || "").trim().toLowerCase();
  if (raw === "standard" || raw === "premium" || raw === "vvip") return raw;
  return "";
}

function verifyToken(request) {
  return verifyJwtFromRequest(request);
}

export async function GET(request) {
  const jwtPayload = verifyToken(request);
  const adminMode = await isAdminRequest(request);
  if (!jwtPayload && !adminMode) return NextResponse.json({ ok: false, message: "인증이 필요합니다." }, { status: 401 });

  const userId = jwtPayload?.userId;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const User = await getUserModel();
    const user = await User.findById(userId).select("points profileSubscription has_started_paid_service first_service_access_date").lean();
    if (!user) return NextResponse.json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });

    const sub    = user.profileSubscription || {};
    const tier   = sub.tier || "free";
    const expAt  = sub.expiresAt || null;
    const points = Number(user.points || 0);
    const plan   = PROFILE_SUB_PLANS[tier];
    const now    = new Date();

    let effectiveTier  = "free";
    let effectiveExpAt = expAt ? new Date(expAt) : null;
    let autoRenewed    = false;
    const adminTestTier = adminMode ? getAdminTestTier(request) : "";

    // 관리자 티어 테스트: 실제 구독 대신 특정 티어로 시뮬레이션 (코인 수동 실제 잔액 유지)
    if (adminMode && adminTestTier) {
      const adminPlan = PROFILE_SUB_PLANS[adminTestTier];
      return NextResponse.json({
        ok: true,
        tier: adminTestTier,
        isActive: true,
        expiresAt: null,
        profileLimit: adminPlan?.profileLimit ?? 1,
        points,
        lowBalanceWarning: false,
        autoRenewed: false,
        adminMode: true,
        adminTestTier,
        hasStartedPaidService: true,
        firstServiceAccessDate: null,
      });
    }

    if (tier !== "free" && effectiveExpAt) {
      if (effectiveExpAt > now) {
        effectiveTier = tier;
      } else if (plan && points >= plan.coins) {
        const newExpAt = new Date(
          Math.max(effectiveExpAt.getTime(), now.getTime()) + plan.durationDays * 24 * 60 * 60 * 1000
        );
        const renewed = await User.findOneAndUpdate(
          { _id: userId, points: { $gte: plan.coins } },
          {
            $inc: { points: -plan.coins },
            $set: { "profileSubscription.expiresAt": newExpAt, "profileSubscription.startedAt": now },
          },
          { new: true, projection: { points: 1 } }
        ).lean();
        if (renewed) {
          effectiveTier  = tier;
          effectiveExpAt = newExpAt;
          autoRenewed    = true;
          getPointHistoryModel().then(PH => PH.create({
            userId,
            kind:         "deduct",
            delta:        -plan.coins,
            balanceAfter: Number(renewed.points || 0),
            reason:       `${plan.name} 구독 자동 갱신`,
            featureKey:   "profile-subscription-auto-renew",
            metadata:     { tier, expiresAt: newExpAt.toISOString(), autoRenew: true },
          })).catch(() => {});
        }
      }
    }

    const isActive          = effectiveTier !== "free";
    const profileLimit      = isActive ? (PROFILE_SUB_PLANS[effectiveTier]?.profileLimit ?? 1) : 1;
    const lowBalanceWarning = isActive && points <= (PROFILE_SUB_PLANS[effectiveTier]?.lowWarnAt ?? 30);

    return NextResponse.json({
      ok:                true,
      tier:              effectiveTier,
      isActive:          !!isActive,
      expiresAt:         effectiveExpAt ? effectiveExpAt.toISOString() : null,
      profileLimit,
      points,
      lowBalanceWarning: !!lowBalanceWarning,
      autoRenewed:       !!autoRenewed,
      hasStartedPaidService: !!user.has_started_paid_service,
      firstServiceAccessDate: user.first_service_access_date ? new Date(user.first_service_access_date).toISOString() : null,
    });
  } catch (err) {
    console.error("[profile-subscription/status] error:", err);
    return NextResponse.json({ ok: false, message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

function methodNotAllowed() {
  return NextResponse.json(
    { ok: false, message: "지원하지 않는 메서드입니다." },
    { status: 405, headers: { Allow: "GET" } },
  );
}

export async function PUT() {
  return methodNotAllowed();
}

export async function PATCH() {
  return methodNotAllowed();
}

export async function DELETE() {
  return methodNotAllowed();
}

export async function OPTIONS() {
  return methodNotAllowed();
}

export async function HEAD() {
  return methodNotAllowed();
}
