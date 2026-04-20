import { getUserModel } from "../../_lib/models/UserModel";
import { getPointHistoryModel } from "../../_lib/models/PointHistoryModel";

/**
 * 구독자 등급별 무료 혜택 한도 (ESM)
 */
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

/**
 * [Senior Security Expert] 유료 기능 진입 시 코인 유효성을 강제 검증하고 차감하는 엔진입니다.
 * 프론트엔드의 검증을 우회하더라도 서버에서 2차로 차감 및 중복 확인을 수행합니다.
 * 
 * @param {string} userId - 검증할 사용자 ID (Mongoose ObjectId)
 * @param {number} cost - 해당 기능 이용 시 필요한 코인 수량
 * @param {string} featureKey - 중복 결제 방지를 위한 고유 기능 키 (예: 'sibyl-report')
 * @param {string} reason - 포인트 기록에 남길 사유
 * @returns {Promise<{ok: boolean, status?: number, message: string, alreadyPaid?: boolean, subscriptionFree?: boolean}>}
 */
export async function verifyAndConsumePoints(userId, cost, featureKey, reason) {
  if (!userId) {
    return { ok: false, status: 401, message: "로그인이 필요합니다." };
  }

  const User = await getUserModel();
  const PointHistory = await getPointHistoryModel();

  // 1. [보안] 최근 30분 내 동일 기능에 대한 유효한 결제 기록이 있는지 확인 (중복 차감 방지 및 세션 유지)
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentPayment = await PointHistory.findOne({
      userId,
      featureKey,
      kind: { $in: ["deduct", "adjust"] },
      createdAt: { $gte: thirtyMinutesAgo }
    }).sort({ createdAt: -1 }).lean();

    if (recentPayment) {
      return { 
        ok: true, 
        alreadyPaid: true, 
        message: "최근 30분 이내에 이미 결제된 내역이 있습니다. 추가 차감 없이 이용 가능합니다." 
      };
    }
  } catch (err) {
    console.error("[PaymentCheck] Error finding recent history:", err);
    // 히스토리 조회 실패 시 계속 진행 (사용자 편의)
  }

  // 2. 사용자 정보 및 구독 등급 조회
  const user = await User.findById(userId).select("points profileSubscription").lean();
  if (!user) {
    return { ok: false, status: 404, message: "사용자를 찾을 수 없습니다." };
  }

  // 3. [구독 혜택] 구독 중인 등급에 따라 해당 금액 이하의 기능은 무료 패스
  const freeLimit = getSubscriptionFreeLimit(user);
  if (freeLimit > 0 && cost <= freeLimit) {
    await PointHistory.create({
      userId,
      kind: "adjust",
      delta: 0,
      balanceAfter: Number(user.points || 0),
      reason: `${reason} (구독 멤버십 혜택)`,
      featureKey,
      metadata: { source: "verifyAndConsume", isSubscriptionFree: true, freeLimit, requestedCost: cost },
    }).catch(e => console.error("[PaymentSuccess] Log error:", e));

    return { ok: true, subscriptionFree: true, message: "구독 멤버십 혜택으로 코인 소모 없이 승인되었습니다." };
  }

  // 4. [보안/트랜잭션] 코인 잔액 원자적 검증 및 차감
  // $gte를 조건에 넣어 잔액이 부족하면 업데이트가 수행되지 않도록 하여 레이스 컨디션 방지
  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, points: { $gte: cost } },
    { $inc: { points: -cost } },
    { new: true, projection: { points: 1 } }
  ).lean();

  if (!updatedUser) {
    return { 
      ok: false, 
      status: 402, 
      message: "코인이 부족합니다. 기능을 이용하려면 코인을 충전해 주세요.",
      requiredCoins: cost 
    };
  }

  // 5. [추적성] 차감 성공 기록 남기기
  await PointHistory.create({
    userId,
    kind: "deduct",
    delta: -cost,
    balanceAfter: Number(updatedUser.points || 0),
    reason,
    featureKey,
    metadata: { source: "verifyAndConsume" },
  }).catch(e => console.error("[PaymentSuccess] Log error:", e));

  return { ok: true, message: `${cost}코인이 정상적으로 지불되었습니다.` };
}
