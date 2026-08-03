// 운영자(관리자) 환불의 단일 구현.
//
// 왜 별도 모듈인가: 환불 진입점이 둘이다 — 기존 `/api/payments/single/cancel`(User JWT role=admin)과
// 신규 `/api/admin/orders/:id/refund`(flower-admin 토큰). 두 신원 체계가 갈라져 있어(auth.js의
// PAID_SERVICE_ADMIN_AUTH_PATHS 에 /api/payments 가 없다) 라우트를 합칠 수 없다. 로직까지 두 벌이
// 되면 한쪽만 고쳐지는 사고가 나므로 코어를 여기 한 곳에 둔다.
//
// 운영 정책: KG이니시스 PG사 관리자 페이지에서 직접 취소하지 말고 포트원 대시보드 또는 이 서버 API를
// 통해서만 취소 상태를 동기화한다.
import { mongoose } from "./db.js";
import {
  CONTENT_ENTITLEMENT_STATUSES,
  MonthlyCreditLedger,
  Payment,
  PointHistory,
  User,
} from "./models.js";
import { cancelPortOnePayment } from "./portone.js";
import { revokePaymentContentAccess } from "./content-unlocks.js";

export const PAYMENT_ORDER_STATES = Object.freeze({
  CANCELLED: "CANCELLED",
  PARTIAL_CANCELLED: "PARTIAL_CANCELLED",
  ERROR: "ERROR",
});

// billing.js의 결제-접근 결정 캐시 + 표시용 잔량 캐시(둘 다 globalThis 공유)를 해당 유저 단위로 무효화한다.
// import 순환(billing.js→payments.js)을 피하려고 캐시 객체에 붙은 메서드를 직접 호출한다.
// 결제/환불로 잠금해제 상태나 잔량이 바뀌므로 함께 무효화해 직후 stale 응답을 막는다.
export function invalidatePaidAccessDecisionCacheForUser(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return;
  try { globalThis.__paidAccessDecisionCache?.invalidateForUser?.(uid); } catch {}
  try { globalThis.__billingBalanceCache?.invalidateForUser?.(uid); } catch {}
  try { globalThis.__membershipPassCache?.invalidateForUser?.(uid); } catch {}
  try { globalThis.__accessStateCache?.invalidateForUser?.(uid); } catch {}
  try { globalThis.__codeDestinyAccessUnlocksCache?.invalidateForUser?.(uid); } catch {}
}

export async function revokeSinglePaymentContentAccess(payment, { status = CONTENT_ENTITLEMENT_STATUSES.REFUNDED, reason = "", session = null } = {}) {
  if (!payment?._id && !payment?.merchantUid && !payment?.impUid) {
    return { unlockRevoked: false, adminReviewRequired: true, reason: "PAYMENT_MISSING" };
  }
  try {
    const result = await revokePaymentContentAccess({ payment, revokedStatus: status, reason, session });
    invalidatePaidAccessDecisionCacheForUser(payment?.userId);
    return {
      ...result,
      unlockRevoked: result.unlockRevoked === true,
      adminReviewRequired: result.ok !== true,
    };
  } catch (error) {
    return {
      ok: false,
      unlockRevoked: false,
      adminReviewRequired: true,
      error: String(error?.message || error || "Unlock revocation failed.").slice(0, 500),
    };
  }
}

export function extractPortOneCancelStatus(cancelResult = {}) {
  const raw = cancelResult?.rawV2 && typeof cancelResult.rawV2 === "object" ? cancelResult.rawV2 : cancelResult;
  const cancellations = Array.isArray(raw?.cancellations) ? raw.cancellations : [];
  return String(
    raw?.cancellation?.status
      || raw?.cancel?.status
      || cancellations[0]?.status
      || raw?.status
      || cancelResult?.status
      || "",
  ).trim().toUpperCase();
}

export function isPortOneCancelSucceeded(cancelResult = {}) {
  return ["SUCCEEDED", "SUCCESS", "CANCELLED", "CANCELED", "PARTIAL_CANCELLED"]
    .includes(extractPortOneCancelStatus(cancelResult));
}

export function isPartialCancel({ requestedAmount, paidAmount, cancelResult }) {
  if (extractPortOneCancelStatus(cancelResult) === "PARTIAL_CANCELLED") return true;
  return Number.isInteger(requestedAmount) && requestedAmount > 0 && requestedAmount < Number(paidAmount || 0);
}

// 결제 유형별로 "무엇을 되돌려야 하는가"가 다르다. 되돌리지 못한 부분은 조용히 삼키지 않고
// adminReviewRequired 로 표면화한다.
function isSinglePurchase(payment) {
  return String(payment?.paymentType || "") === "digital_content"
    && String(payment?.accessType || "") === "single_purchase";
}

// 이용권/구독: profileSubscription 은 단일 객체라 중첩 연장의 정확한 역산이 불가능하다.
// 이 결제가 늘린 durationMonths 만큼 expiresAt 을 되감고, 과거가 되면 등급을 free 로 내린다.
// 되감을 근거(durationMonths)가 없거나 이미 만료됐으면 손대지 않고 관리자 검토로 넘긴다.
async function revokeMembershipPassGrant(payment) {
  const userId = payment?.userId;
  if (!userId) return { reverted: false, adminReviewRequired: true, reason: "MISSING_USER" };

  const durationMonths = Math.max(0, Math.floor(Number(payment?.pricingSnapshot?.durationMonths || payment?.durationMonths || 0)));
  const user = await User.findById(userId).select("profileSubscription").lean();
  const sub = user?.profileSubscription || null;
  if (!sub) return { reverted: false, adminReviewRequired: true, reason: "NO_SUBSCRIPTION" };
  if (durationMonths <= 0) return { reverted: false, adminReviewRequired: true, reason: "UNKNOWN_DURATION" };

  const currentExpiresAt = sub.expiresAt ? new Date(sub.expiresAt) : null;
  if (!currentExpiresAt || Number.isNaN(currentExpiresAt.getTime())) {
    return { reverted: false, adminReviewRequired: true, reason: "NO_EXPIRY" };
  }

  const rewound = new Date(currentExpiresAt);
  rewound.setMonth(rewound.getMonth() - durationMonths);
  const now = new Date();
  const downgraded = rewound <= now;

  const set = { "profileSubscription.expiresAt": rewound };
  if (downgraded) {
    set["profileSubscription.tier"] = "free";
    set["profileSubscription.passTier"] = "";
    set["profileSubscription.passLimit"] = 0;
    set["profileSubscription.maxCoveredCoin"] = 0;
  }
  await User.updateOne({ _id: userId }, { $set: set });

  // 이 결제로 지급된 월정석 회수. 지급 원장은 {userId, type, sourceId} 유니크이므로 sourceId 로 찾는다.
  const sourceIds = [payment?.merchantUid, payment?.impUid, String(payment?._id || "")]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  let creditsRevoked = 0;
  let creditShortfall = false;
  if (sourceIds.length) {
    const grants = await MonthlyCreditLedger.find({
      userId,
      type: "MONTHLY_CREDIT_GRANT",
      sourceId: { $in: sourceIds },
    }).lean();
    const granted = grants.reduce((sum, row) => sum + Math.max(0, Number(row.amount || 0)), 0);
    if (granted > 0) {
      const fresh = await User.findById(userId).select("profileSubscription.membershipCreditBalance").lean();
      const balance = Math.max(0, Number(fresh?.profileSubscription?.membershipCreditBalance || 0));
      // 이미 써 버린 만큼은 되돌릴 수 없다. 있는 만큼만 회수하고 부족분은 검토 대상으로 남긴다.
      creditsRevoked = Math.min(balance, granted);
      creditShortfall = creditsRevoked < granted;
      if (creditsRevoked > 0) {
        await User.updateOne({ _id: userId }, {
          $inc: { "profileSubscription.membershipCreditBalance": -creditsRevoked },
        });
      }
    }
  }

  invalidatePaidAccessDecisionCacheForUser(userId);
  return {
    reverted: true,
    downgraded,
    rewoundTo: rewound.toISOString(),
    creditsRevoked,
    adminReviewRequired: creditShortfall,
    reason: creditShortfall ? "MONTHLY_CREDIT_ALREADY_SPENT" : "",
  };
}

// 레거시 포인트충전: 충전된 포인트를 회수한다. 이미 써서 잔액이 모자라면 되돌리지 않고 검토로 넘긴다
// (사용자 셀프 취소 경로가 409 로 막는 것과 같은 판단 기준).
async function revokePointChargeGrant(payment) {
  const userId = payment?.userId;
  const chargedPoints = Math.max(0, Number(payment?.chargedPoints || payment?.expectedChargedPoints || 0));
  if (!userId || chargedPoints <= 0) return { reverted: true, pointsRolledBack: 0, adminReviewRequired: false };

  const user = await User.findById(userId).select("points").lean();
  const balance = Math.max(0, Number(user?.points || 0));
  if (balance < chargedPoints) {
    return { reverted: false, pointsRolledBack: 0, adminReviewRequired: true, reason: "POINTS_ALREADY_SPENT" };
  }

  const updated = await User.findByIdAndUpdate(userId, { $inc: { points: -chargedPoints } }, { returnDocument: "after" }).lean();
  await PointHistory.create({
    userId,
    kind: "deduct",
    delta: -chargedPoints,
    balanceAfter: Number(updated?.points || 0),
    reason: "Point rollback after operator refund",
    impUid: payment?.impUid,
    merchantUid: payment?.merchantUid,
    paymentId: payment?._id,
    metadata: { source: "operator_refund" },
  }).catch(() => {});
  invalidatePaidAccessDecisionCacheForUser(userId);
  return { reverted: true, pointsRolledBack: chargedPoints, adminReviewRequired: false };
}

/**
 * 운영자 환불 코어. PG 취소 → 유형별 권한 회수 → 주문 갱신을 한 번에 수행한다.
 * 호출부는 인증·입력검증만 하고 이 함수의 결과를 그대로 응답하면 된다.
 *
 * 반환: { ok, status(HTTP), code?, idempotent, orderState, unlockRevoked, adminReviewRequired, revocation, payment }
 */
export async function refundPaymentAsOperator({
  env,
  payment,
  reason = "Operator refund",
  amount,
  currentCancellableAmount,
  actorId = "admin",
} = {}) {
  if (!payment?._id) {
    return { ok: false, status: 404, code: "ORDER_NOT_FOUND", message: "Payment order was not found." };
  }

  const normalizedReason = String(reason || "Operator refund").trim().slice(0, 120);
  const paidAmount = Math.max(0, Number(payment.paymentAmount || 0));
  const requestedAmount = Number.isInteger(amount) && amount > 0 ? amount : undefined;

  if (payment.status === "cancelled" || payment.orderState === PAYMENT_ORDER_STATES.CANCELLED) {
    return {
      ok: true,
      status: 200,
      idempotent: true,
      orderState: PAYMENT_ORDER_STATES.CANCELLED,
      unlockRevoked: false,
      adminReviewRequired: true,
      payment,
    };
  }
  if (requestedAmount !== undefined && requestedAmount > paidAmount) {
    return { ok: false, status: 400, code: "CANCEL_AMOUNT_EXCEEDS_PAID_AMOUNT", message: "Cancel amount exceeds paid amount." };
  }

  // 🔴 cancelPortOnePayment 는 PG 거절 시 throw 한다(예: 이미 카드사에서 취소된 건 → PG_PROVIDER).
  // 그대로 두면 관리자 화면이 500 과 스택을 받아 무엇이 문제인지 알 수 없다. 구조화된 오류로 바꾼다.
  let cancelResult = null;
  try {
    cancelResult = await cancelPortOnePayment(env, {
      impUid: payment.impUid || undefined,
      merchantUid: payment.merchantUid || undefined,
      reason: normalizedReason,
      amount: requestedAmount,
      currentCancellableAmount,
      idempotencyKey: `refund-${String(payment.merchantUid || payment.impUid || payment._id)}-${requestedAmount || paidAmount}`,
    });
  } catch (error) {
    const detail = String(error?.message || error || "").slice(0, 300);
    await Payment.findByIdAndUpdate(payment._id, {
      $set: {
        failureCode: "portone_cancel_request_failed",
        failureMessage: detail,
        failureStage: "operator_refund_portone",
        lastErrorAt: new Date(),
      },
      $inc: { confirmAttempts: 1 },
    }).catch(() => {});
    return {
      ok: false,
      status: 502,
      code: "PORTONE_CANCEL_REQUEST_FAILED",
      message: `결제사 취소 요청이 거절되었습니다: ${detail}`,
    };
  }

  if (!isPortOneCancelSucceeded(cancelResult)) {
    await Payment.findByIdAndUpdate(payment._id, {
      $set: {
        orderState: PAYMENT_ORDER_STATES.ERROR,
        rawPortOne: cancelResult,
        failureCode: "portone_cancel_not_succeeded",
        failureMessage: "PortOne cancellation response was not successful.",
        failureStage: "operator_refund_portone",
        lastErrorAt: new Date(),
      },
      $inc: { confirmAttempts: 1 },
    }).catch(() => {});
    return { ok: false, status: 502, code: "PORTONE_CANCEL_NOT_SUCCEEDED", message: "PortOne cancellation was not successful." };
  }

  const partial = isPartialCancel({ requestedAmount, paidAmount, cancelResult });
  const orderState = partial ? PAYMENT_ORDER_STATES.PARTIAL_CANCELLED : PAYMENT_ORDER_STATES.CANCELLED;
  const nextStatus = partial ? "refunded" : "cancelled";

  // 부분 취소는 무엇을 얼마나 회수해야 하는지가 정책적으로 정해져 있지 않다 — 기존 관례대로
  // 권한을 건드리지 않고 관리자 검토로 넘긴다.
  let revocation = { unlockRevoked: false, adminReviewRequired: true, reason: "PARTIAL_CANCEL" };
  let grantRevocation = null;
  if (!partial) {
    if (isSinglePurchase(payment)) {
      revocation = await revokeSinglePaymentContentAccess(payment, {
        status: CONTENT_ENTITLEMENT_STATUSES.CANCELLED,
        reason: "operator_refund",
      });
    } else if (String(payment.paymentType || "") === "membership_pass") {
      grantRevocation = await revokeMembershipPassGrant(payment);
      revocation = {
        unlockRevoked: grantRevocation.reverted === true,
        adminReviewRequired: grantRevocation.adminReviewRequired === true,
        reason: grantRevocation.reason || "",
      };
    } else if (String(payment.paymentType || "") === "point_charge") {
      grantRevocation = await revokePointChargeGrant(payment);
      revocation = {
        unlockRevoked: grantRevocation.reverted === true,
        adminReviewRequired: grantRevocation.adminReviewRequired === true,
        reason: grantRevocation.reason || "",
      };
    } else {
      // 구독 회차 결제 등 회수 규칙이 정의되지 않은 유형 — 돈만 돌려주고 검토로 넘긴다.
      revocation = { unlockRevoked: false, adminReviewRequired: true, reason: "UNSUPPORTED_PAYMENT_TYPE" };
    }
  }

  const adminReviewRequired = partial || revocation.adminReviewRequired === true;
  const updatedPayment = await Payment.findByIdAndUpdate(payment._id, {
    $set: {
      status: nextStatus,
      orderState,
      source: "system",
      rawPortOne: cancelResult,
      "pricingSnapshot.cancellationReviewRequired": adminReviewRequired,
      "pricingSnapshot.unlockRevoked": revocation.unlockRevoked === true,
      "pricingSnapshot.cancelledBy": String(actorId || "admin"),
      "pricingSnapshot.cancelReason": normalizedReason,
      "pricingSnapshot.cancelAmount": requestedAmount || paidAmount,
      "pricingSnapshot.cancelledAt": new Date().toISOString(),
      "metadata.unlockRevoked": revocation.unlockRevoked === true,
      "metadata.unlockRevocationStatus": revocation.status || (partial ? "" : CONTENT_ENTITLEMENT_STATUSES.CANCELLED),
      "metadata.unlockRevocationError": revocation.error || revocation.reason || "",
      ...(grantRevocation ? { "metadata.grantRevocation": grantRevocation } : {}),
      failureCode: partial ? "partial_cancel_admin_review" : "cancel_admin_review",
      failureMessage: partial
        ? "Partial cancellation completed. Unlock is not revoked automatically."
        : (adminReviewRequired
          ? "Cancellation completed. Grant revocation requires administrator review."
          : "Cancellation completed. Grant was revoked."),
      failureStage: adminReviewRequired ? "operator_refund_admin_review" : "operator_refund_revoked",
      lastErrorAt: new Date(),
    },
    $inc: { confirmAttempts: 1 },
  }, { returnDocument: "after" }).lean();

  return {
    ok: true,
    status: 200,
    idempotent: false,
    orderState,
    unlockRevoked: revocation.unlockRevoked === true,
    adminReviewRequired,
    revocation: grantRevocation || revocation,
    payment: updatedPayment,
  };
}

// mongoose ObjectId 검증은 호출부 여러 곳에서 필요하다.
export function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}
