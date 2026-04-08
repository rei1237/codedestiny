// GET /api/fortune/pig-coin/profile-subscription/status
// 로그인 사용자의 프로필 구독 상태 조회 (자동 갱신 포함)
export const runtime = "nodejs";

import jwt from "jsonwebtoken";
import { dbConnect } from "../../../../../_lib/dbConnect.js";
import { getUserModel } from "../../../../../_lib/models/UserModel.js";
import { getPointHistoryModel } from "../../../../../_lib/models/PointHistoryModel.js";

const PROFILE_SUB_PLANS = {
  standard: { name: "스탠다드 꿀",  coins: 115, profileLimit: 3,  durationDays: 30, lowWarnAt: 30  },
  premium:  { name: "프리미엄 꿀",  coins: 360, profileLimit: 7,  durationDays: 30, lowWarnAt: 50  },
  vvip:     { name: "VVIP 꿀단지", coins: 700, profileLimit: 15, durationDays: 30, lowWarnAt: 100 },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function extractToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7).trim();

  const cookieHeader = request.headers.get("cookie") || "";
  const chunks = cookieHeader.split(";").map((v) => v.trim());
  for (const chunk of chunks) {
    const [k, ...rest] = chunk.split("=");
    if (k.trim() === "fortune_auth_token") {
      try { return decodeURIComponent(rest.join("=")); } catch { return rest.join("="); }
    }
  }
  return null;
}

export async function GET(request) {
  try {
    const token = extractToken(request);
    if (!token) return json({ message: "인증 토큰이 필요합니다." }, 401);

    let auth;
    try {
      auth = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    } catch {
      return json({ message: "유효하지 않거나 만료된 토큰입니다." }, 401);
    }

    if (!auth?.userId) return json({ message: "유효하지 않은 토큰입니다." }, 401);

    await dbConnect();
    const User = await getUserModel();
    const PointHistory = await getPointHistoryModel();

    const user = await User.findById(auth.userId)
      .select("points profileSubscription")
      .lean();

    if (!user) return json({ message: "사용자 정보를 찾을 수 없습니다." }, 404);

    const sub    = user.profileSubscription || {};
    const tier   = sub.tier || "free";
    const expAt  = sub.expiresAt || null;
    const points = Number(user.points || 0);

    const plan = PROFILE_SUB_PLANS[tier];
    const now  = new Date();

    let effectiveTier  = "free";
    let effectiveExpAt = expAt ? new Date(expAt) : null;
    let autoRenewed    = false;

    if (tier !== "free" && effectiveExpAt) {
      if (effectiveExpAt > now) {
        // 구독 활성
        effectiveTier = tier;
      } else if (plan && points >= plan.coins) {
        // 만료됐지만 코인 충분 → 자동 갱신
        const newExpAt = new Date(
          Math.max(effectiveExpAt.getTime(), now.getTime()) +
          plan.durationDays * 24 * 60 * 60 * 1000,
        );
        const updatedUser = await User.findOneAndUpdate(
          { _id: auth.userId, points: { $gte: plan.coins } },
          {
            $inc: { points: -plan.coins },
            $set: {
              "profileSubscription.expiresAt": newExpAt,
              "profileSubscription.startedAt": now,
            },
          },
          { new: true, projection: { points: 1 } },
        ).lean();
        if (updatedUser) {
          effectiveTier  = tier;
          effectiveExpAt = newExpAt;
          autoRenewed    = true;
          await PointHistory.create({
            userId:       auth.userId,
            kind:         "deduct",
            delta:        -plan.coins,
            balanceAfter: Number(updatedUser.points || 0),
            reason:       `${plan.name} 구독 자동 갱신`,
            featureKey:   "profile-subscription-auto-renew",
            metadata:     { tier, expiresAt: newExpAt.toISOString(), autoRenew: true },
          }).catch(() => {});
        }
      }
    }

    const isActive           = effectiveTier !== "free";
    const profileLimit       = isActive ? (PROFILE_SUB_PLANS[effectiveTier]?.profileLimit ?? 1) : 1;
    const lowBalanceWarning  = isActive && points <= (PROFILE_SUB_PLANS[effectiveTier]?.lowWarnAt ?? 30);

    return json({
      tier:              effectiveTier,
      isActive:          !!isActive,
      expiresAt:         effectiveExpAt ? effectiveExpAt.toISOString() : null,
      profileLimit,
      points,
      lowBalanceWarning: !!lowBalanceWarning,
      autoRenewed:       !!autoRenewed,
    });
  } catch (err) {
    console.error("[pig-coin/profile-subscription/status GET]", err?.message || err, err?.stack || "");
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}
