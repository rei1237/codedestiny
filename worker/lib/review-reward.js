// 후기 작성 보상(월정석) 지급 — 유일한 정본.
//
// 지급 시점은 **관리자 승인**이다. 작성 즉시가 아니다: 후기는 항상 pending 으로 저장되고
// (worker/routes/reviews.js) 승인 게이트가 이미 어뷰징 방어를 겸하므로, 그 게이트를 지급
// 조건으로 재사용하면 새 방어 장치를 만들 필요가 없다.
//
// 🔴 새 배관을 만들지 않는다 — grantMonthlyCreditLotDetailed(monthly-credit-store.js) +
// MonthlyCreditLedger 원장 기록은 admin-feedback.js 의 버그 제보 보상과 같은 방식이다.
// 다른 점은 멱등키 단위뿐이다: reviewId 하나가 곧 lotId 라, 반려했다가 다시 승인해도
// lot 이 같아 중복 지급되지 않는다.
//
// 🔴 이 함수는 던지지 않는다. 호출부는 관리자 승인 경로(handleAdminReviewStatus)이고,
// 지급이 실패했다고 승인 자체가 막히면 "공개는 안 되는데 보상만 못 받은" 상태가 아니라
// **후기가 영영 공개되지 않는** 상태가 된다. 실패는 결과 객체로 돌려 화면에 드러낸다.

import { mongoose, withMongoRetry } from "./db.js";
import { MonthlyCreditLedger, User } from "./models.js";
import { grantMonthlyCreditLotDetailed } from "./monthly-credit-store.js";
import { Review } from "./review-models.js";

// 월정석 1개 = 10원(KRW_PER_COIN 100 ÷ MEMBERSHIP_CREDIT_PER_COIN 10)이므로 1,000원 상당이다.
// 버그 제보 보상(300 = 3,000원 상당)보다 낮게 둔다 — 재현 정보를 정리해 보내는 노동보다
// 후기 작성이 가볍고, 상품별로 1건씩 받을 수 있어 누적 상한이 훨씬 높기 때문이다.
export const REVIEW_REWARD_AMOUNT = 100;

const REVIEW_REWARD_SERVICE_KEY = "review_reward";

export function buildReviewRewardSourceId(reviewId) {
  return `review-reward:${reviewId}`;
}

function toText(value) {
  return String(value || "").trim();
}

function skip(reason) {
  return { granted: false, skipped: true, reason, amount: 0 };
}

/**
 * 승인된 후기 1건에 대해 작성자에게 월정석을 지급한다.
 *
 * @param {{ reviewDoc: object, actorId?: string, env?: object }} input
 * @returns {Promise<{ granted: boolean, skipped?: boolean, reason?: string, amount: number,
 *   balanceAfter?: number, idempotent?: boolean, sourceId?: string }>}
 */
export async function grantReviewApprovalReward({ reviewDoc, actorId = "", env } = {}) {
  const reviewId = toText(reviewDoc?._id);
  if (!reviewId) return skip("REVIEW_NOT_FOUND");

  // 🔴 운영진 시딩 리뷰(createdByAdmin)는 지급 대상이 아니다. 작성자가 실사용자가 아니고,
  // userId 가 비어 있거나 남의 계정을 가리킬 수 있다.
  if (reviewDoc?.createdByAdmin) return skip("ADMIN_SEEDED_REVIEW");

  const userId = toText(reviewDoc?.userId);
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return skip("NO_AUTHOR_ACCOUNT");

  if (reviewDoc?.reviewReward?.granted) {
    return {
      granted: true,
      idempotent: true,
      amount: Math.max(0, Math.floor(Number(reviewDoc.reviewReward.amount || 0))),
      sourceId: toText(reviewDoc.reviewReward.ledgerSourceId),
    };
  }

  const user = await withMongoRetry(env, () => User.findById(userId)
    .select("status profileSubscription")
    .lean()).catch(() => null);
  if (!user?._id) return skip("TARGET_USER_NOT_FOUND");
  if (toText(user.status || "active").toLowerCase() === "withdrawn") return skip("TARGET_USER_WITHDRAWN");

  const sourceId = buildReviewRewardSourceId(reviewId);

  try {
    // 🔴 withMongoRetry 로 감싸지 말 것 — 내부가 이미 낙관적 CAS 를 5회 돌린다.
    const applied = await grantMonthlyCreditLotDetailed({
      userId: user._id,
      lotId: sourceId,
      amount: REVIEW_REWARD_AMOUNT,
    });
    if (!applied?.user) return skip("MONTHLY_CREDIT_GRANT_FAILED");

    const afterBalance = Math.max(0, Math.floor(Number(applied.user?.profileSubscription?.membershipCreditBalance || 0)));

    try {
      await MonthlyCreditLedger.updateOne(
        { userId: user._id, type: "MONTHLY_CREDIT_GRANT", sourceId },
        {
          $setOnInsert: {
            userId: user._id,
            type: "MONTHLY_CREDIT_GRANT",
            amount: REVIEW_REWARD_AMOUNT,
            beforeBalance: Math.max(0, Math.floor(Number(applied.beforeBalance || 0))),
            afterBalance,
            reason: `후기 작성 보상 (${toText(reviewDoc?.productName) || "상품 미상"})`,
            sourceId,
            serviceKey: REVIEW_REWARD_SERVICE_KEY,
            profileId: "",
            metadata: {
              grantKind: "review_reward",
              reviewId,
              productId: toText(reviewDoc?.productId),
              actorId: toText(actorId) || "admin",
            },
          },
        },
        { upsert: true },
      );
    } catch (error) {
      // unique 충돌은 같은 지급을 두 번 기록하려 한 것뿐이라 정상 경로다.
      if (Number(error?.code) !== 11000) throw error;
    }

    await Review.updateOne({ _id: reviewDoc._id }, {
      $set: {
        "reviewReward.granted": true,
        "reviewReward.amount": REVIEW_REWARD_AMOUNT,
        "reviewReward.grantedAt": new Date(),
        "reviewReward.grantedBy": toText(actorId) || "admin",
        "reviewReward.ledgerSourceId": sourceId,
      },
    });

    return {
      granted: true,
      idempotent: applied.added !== true,
      amount: REVIEW_REWARD_AMOUNT,
      balanceAfter: afterBalance,
      sourceId,
    };
  } catch (error) {
    return {
      granted: false,
      skipped: false,
      reason: "MONTHLY_CREDIT_GRANT_FAILED",
      amount: 0,
      message: String(error?.message || "월정석 지급 중 오류가 발생했습니다."),
    };
  }
}
