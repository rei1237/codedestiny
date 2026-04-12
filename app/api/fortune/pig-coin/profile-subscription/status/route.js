import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { getUserModel } from "../../../../../_lib/models/UserModel";
import { getPointHistoryModel } from "../../../../../_lib/models/PointHistoryModel";
import { extractAdminTokenFromRequest, verifyFlowerAdminToken } from "../../../../../_lib/flowerAdminToken";

export const runtime = "nodejs";
const ADMIN_VIRTUAL_COINS = 9999999;

const PROFILE_SUB_PLANS = {
  standard: { name: "스탠다드 꿀",  coins: 115, profileLimit: 3,  durationDays: 30, lowWarnAt: 30 },
  premium:  { name: "프리미엄 꿀",  coins: 360, profileLimit: 7,  durationDays: 30, lowWarnAt: 50 },
  vvip:     { name: "VVIP 꿀단지", coins: 700, profileLimit: 15, durationDays: 30, lowWarnAt: 100 },
};

function verifyToken(request) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
  } catch {
    return null;
  }
}

async function isAdminRequest(request, payload) {
  if (payload?.role === "admin") return true;

  if (payload?.userId) {
    try {
      const User = await getUserModel();
      const user = await User.findById(payload.userId).select("role").lean();
      if (user?.role === "admin") return true;
    } catch {
      // DB 조회 실패 시 아래 토큰 검증으로 폴백
    }
  }

  const adminToken = extractAdminTokenFromRequest(request);
  if (!adminToken) return false;
  return verifyFlowerAdminToken(adminToken);
}

export async function GET(request) {
  const jwtPayload = verifyToken(request);
  const adminMode = await isAdminRequest(request, jwtPayload);
  if (!jwtPayload && !adminMode) return NextResponse.json({ ok: false, message: "인증이 필요합니다." }, { status: 401 });

  const userId = jwtPayload?.userId;
  if (!userId && !adminMode) return NextResponse.json({ ok: false }, { status: 401 });

  if (adminMode) {
    return NextResponse.json({
      ok: true,
      adminBypass: true,
      tier: "vvip",
      isActive: true,
      expiresAt: null,
      profileLimit: 9999,
      points: ADMIN_VIRTUAL_COINS,
      lowBalanceWarning: false,
      autoRenewed: false,
      hasStartedPaidService: true,
      firstServiceAccessDate: new Date().toISOString(),
    });
  }

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

export async function PUT(request) {
  return proxyLegacyApi(request);
}

export async function PATCH(request) {
  return proxyLegacyApi(request);
}

export async function DELETE(request) {
  return proxyLegacyApi(request);
}

export async function OPTIONS(request) {
  return proxyLegacyApi(request);
}

export async function HEAD(request) {
  return proxyLegacyApi(request);
}
