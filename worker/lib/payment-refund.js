// 운영자(관리자) 환불의 단일 구현.
//
// 왜 별도 모듈인가: 환불 진입점이 둘이다 — 기존 `/api/payments/single/cancel`(User JWT role=admin)과
// 신규 `/api/admin/orders/:id/refund`(flower-admin 토큰). 두 신원 체계가 갈라져 있어(auth.js의
// PAID_SERVICE_ADMIN_AUTH_PATHS 에 /api/payments 가 없다) 라우트를 합칠 수 없다. 로직까지 두 벌이
// 되면 한쪽만 고쳐지는 사고가 나므로 코어를 여기 한 곳에 둔다.
//
// 운영 정책: KG이니시스 PG사 관리자 페이지에서 직접 취소하지 말고 포트원 대시보드 또는 이 서버 API를
// 통해서만 취소 상태를 동기화한다.
import { mongoose, withMongoRetry } from "./db.js";
import {
  CONTENT_ENTITLEMENT_STATUSES,
  MonthlyCreditLedger,
  Payment,
  PointHistory,
  User,
} from "./models.js";
import { buildPassRefundRevokeFields } from "./profile-limits.js";
import { cancelPortOnePayment } from "./portone.js";
import { revokePaymentContentAccess } from "./content-unlocks.js";
import { ensureLotsForBalance } from "./monthly-credit-lots.js";
import { consumeMonthlyCreditLots } from "./monthly-credit-store.js";

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
// 2026-10-11 부터 이용권에 기간이 없다. 이 결제가 더한 한도를 빼고, 남은 한도로 열 수 있는 게 없으면
// 등급을 free 로 내린다(passes.js revokePassGrantForOrder 와 같은 규칙 — buildPassRefundRevokeFields).
// 이용권 주문인지 판단할 근거(durationMonths)나 만료일이 없으면 손대지 않고 관리자 검토로 넘긴다.
async function revokeMembershipPassGrant(payment) {
  const userId = payment?.userId;
  if (!userId) return { reverted: false, adminReviewRequired: true, reason: "MISSING_USER" };

  // V2 이용권 주문(passes.js createPayablePassOrder)은 metadata.durationMonths 에만 기간을 쓴다 — 이 항이
  // 없으면 V2 주문 전부가 UNKNOWN_DURATION 으로 빠져 관리자 환불이 이용권을 회수하지 못한다(2026-09-03).
  const durationMonths = Math.max(0, Math.floor(Number(
    payment?.pricingSnapshot?.durationMonths || payment?.durationMonths || payment?.metadata?.durationMonths || 0,
  )));
  const user = await User.findById(userId).select("profileSubscription").lean();
  const sub = user?.profileSubscription || null;
  if (!sub) return { reverted: false, adminReviewRequired: true, reason: "NO_SUBSCRIPTION" };
  if (durationMonths <= 0) return { reverted: false, adminReviewRequired: true, reason: "UNKNOWN_DURATION" };

  const currentExpiresAt = sub.expiresAt ? new Date(sub.expiresAt) : null;
  if (!currentExpiresAt || Number.isNaN(currentExpiresAt.getTime())) {
    return { reverted: false, adminReviewRequired: true, reason: "NO_EXPIRY" };
  }

  const { downgraded, fields } = buildPassRefundRevokeFields({ subscription: sub, now: new Date() });
  const set = Object.fromEntries(Object.entries(fields).map(([key, value]) => [`profileSubscription.${key}`, value]));
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
      // 🔴 예전에는 스칼라(membershipCreditBalance)만 읽고 $inc 로 깎았는데, 읽기 정본인
      // ensureLotsForBalance 는 lot 배열이 비어 있지 않으면 lot 만 본다 — 회수가 실제로 반영되지 않고
      // 다음 lot 쓰기가 스칼라를 lot 합계로 되돌려 놓았다. lot FIFO 차감 헬퍼로 통일한다.
      // incrementUsed:false — 지급 자체가 취소된 것이지 사용자가 쓴 게 아니다.
      const fresh = await User.findById(userId).select("profileSubscription").lean();
      const balance = Math.max(0, Math.floor(Number(
        ensureLotsForBalance(fresh?.profileSubscription || {}, Date.now()).balance || 0,
      )));
      // 이미 써 버린 만큼은 되돌릴 수 없다. 있는 만큼만 회수하고 부족분은 검토 대상으로 남긴다.
      creditsRevoked = Math.min(balance, granted);
      creditShortfall = creditsRevoked < granted;
      if (creditsRevoked > 0) {
        const consumed = await consumeMonthlyCreditLots({
          userId,
          amount: creditsRevoked,
          incrementUsed: false,
        });
        if (!consumed?.ok) {
          // 경합(다른 요청이 그 사이 소비)으로 회수가 못 돌면 실제 회수액은 0이다 — 검토로 넘긴다.
          creditsRevoked = 0;
          creditShortfall = true;
        }
      }
    }
  }

  invalidatePaidAccessDecisionCacheForUser(userId);
  return {
    reverted: true,
    downgraded,
    monthlyLimitCoin: fields.monthlyLimitCoin,
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
  }).catch(logSwallowedPaymentError("operator_refund_point_history", { paymentId: String(payment?._id || "") }));
  invalidatePaidAccessDecisionCacheForUser(userId);
  return { reverted: true, pointsRolledBack: chargedPoints, adminReviewRequired: false };
}

/** 이용권 주문 뒤의 사용 이력. 라우트는 mongoose 연결을 쓰므로 어댑터로 passes.js 조회에 연결한다. */
export async function readPassUseForOrder(payment) {
  const { findPassUseSinceOrder } = await import("../payments/passes.js");
  return findPassUseSinceOrder(
    { countDocuments: (Model, filter) => Model.countDocuments(filter) },
    { userId: payment.userId, paidAt: payment.paidAt || payment.createdAt },
  );
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

  if (payment.purchaseType === "GIFT") {
    const { refundGiftAsOperator } = await import("../payments/gift-refund.js");
    return refundGiftAsOperator({ env, payment, reason, amount, actorId });
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
  // A PG timeout is ambiguous. Suspend this consultation before requesting a
  // refund; only reconciliation/operator resolution may resume a suspended order.
  if (String(payment.featureKey || "").startsWith("yeongnyangi-")) {
    await withMongoRetry(env, () => Payment.updateOne({_id:payment._id}, {
      $set:{"metadata.yeongnyangiRefundPending":true},
    }));
  }
  try {
    const { paypalCancellationAmounts } = await import('../payments/paypal.js');
    cancelResult = await cancelPortOnePayment(env, {
      impUid: payment.impUid || undefined,
      merchantUid: payment.merchantUid || undefined,
      reason: normalizedReason,
      ...paypalCancellationAmounts(payment, { amount: requestedAmount, currentCancellableAmount }),
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
    }).catch(logSwallowedPaymentError("operator_refund_cancel_request_failed", { paymentId: String(payment._id) }));
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
    }).catch(logSwallowedPaymentError("operator_refund_cancel_not_succeeded", { paymentId: String(payment._id) }));
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

  // 운영자 판단 자료일 뿐이라 조회 실패로 이미 끝난 환불을 실패로 돌리지 않는다.
  const passUse = String(payment.paymentType || "") === "membership_pass"
    ? await readPassUseForOrder(payment).catch(() => null)
    : null;

  return {
    ok: true,
    status: 200,
    idempotent: false,
    orderState,
    unlockRevoked: revocation.unlockRevoked === true,
    adminReviewRequired,
    revocation: grantRevocation || revocation,
    payment: updatedPayment,
    passUse,
  };
}

// mongoose ObjectId 검증은 호출부 여러 곳에서 필요하다.
export const __paymentRefundTestUtils = { revokeMembershipPassGrant };

export function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

// ─── 지급 실패 시 단건 결제 자동 환불 ────────────────────────────────────────────
// 원래 worker/routes/payments.js 안에 있었지만, AI 프롬프트 생성 실패 경로(worker/routes/fortune.js)도
// 같은 취소·회수를 해야 한다. fortune.js 가 payments.js 를 통째로 import 하면 Worker 번들(1MB 제한)이
// 커지므로, 이 파일 첫머리 주석의 원칙대로 "실제 취소/회수는 공용 코어에 위임"을 따라 여기로 옮겼다.
// payments.js 는 이 모듈에서 다시 import 해 쓴다 — 동작은 그대로다.

// 결제 본 흐름을 막지 않는 부수 쓰기(실패 기록·포인트 이력)의 거절을 `.catch(() => {})` 로 지우면 사후에
// 무슨 일이 있었는지 알 수 없다. 흐름·응답은 그대로 두고 한 줄만 남긴다 — 로깅 자체가 던지지 않게 감싼다.
export function logSwallowedPaymentError(stage, ids = {}) {
  return (error) => {
    try {
      console.warn("[payment-swallowed]", JSON.stringify({ stage, ...ids, error: String(error?.message || error).slice(0, 200) }));
    } catch (_) { /* 로깅 실패는 결제 흐름에 영향을 주지 않는다 */ }
  };
}

export function buildSinglePaymentRefundIdempotencyKey(payment, jobId = "no-job") {
  const paymentId = String(payment?.impUid || payment?.merchantUid || payment?._id || "no-payment").trim();
  const serviceId = String(payment?.pricingSnapshot?.serviceId || payment?.productId || payment?.featureKey || "unknown-service").trim();
  return `refund:${paymentId}:${serviceId}:${jobId || "no-job"}`.slice(0, 220);
}

function logPaidServicePaymentEvent(marker, payment = {}, extras = {}) {
  try {
    console.info(marker, JSON.stringify({
      userId: String(payment?.userId || extras.userId || ""),
      profileId: String(payment?.pricingSnapshot?.profileId || extras.profileId || ""),
      serviceId: String(payment?.pricingSnapshot?.serviceId || payment?.productId || payment?.featureKey || extras.serviceId || ""),
      paymentId: String(payment?.impUid || payment?.merchantUid || extras.paymentId || ""),
      merchantUid: String(payment?.merchantUid || extras.merchantUid || ""),
      impUid: String(payment?.impUid || extras.impUid || ""),
      jobId: String(extras.jobId || "no-job"),
      amount: Number(payment?.paymentAmount || extras.amount || 0),
      deliveryStatus: String(extras.deliveryStatus || ""),
      refundStatus: String(extras.refundStatus || ""),
      failureReason: String(extras.failureReason || payment?.failureMessage || ""),
    }));
  } catch (_) {
    console.info(marker);
  }
}

export async function autoRefundSinglePaymentDeliveryFailure(env, payment, reasonCode, reasonMessage, failureStage) {
  if (!payment?._id) return { refunded: false, reason: "PAYMENT_MISSING" };
  if (payment.status === "cancelled" || payment.orderState === PAYMENT_ORDER_STATES.CANCELLED) {
    logPaidServicePaymentEvent("[PaidService Duplicate Refund Blocked]", payment, {
      deliveryStatus: "refunded",
      refundStatus: "refunded",
      failureReason: reasonMessage,
    });
    return { refunded: true, idempotent: true, payment };
  }

  const refundIdempotencyKey = buildSinglePaymentRefundIdempotencyKey(payment);
  logPaidServicePaymentEvent("[PaidService Auto Refund Requested]", payment, {
    deliveryStatus: "refund_pending",
    refundStatus: "pending",
    failureReason: reasonMessage,
  });

  try {
    const { paypalCancellationAmounts } = await import('../payments/paypal.js');
    const canceledPortOne = await cancelPortOnePayment(env, {
      impUid: payment.impUid || payment.merchantUid,
      merchantUid: payment.merchantUid || payment.impUid,
      reason: reasonMessage,
      ...paypalCancellationAmounts(payment, { checksum: Number(payment.paymentAmount || 0) || undefined }),
      idempotencyKey: refundIdempotencyKey,
    });
    if (payment.metadata?.paypalCharge && !isPortOneCancelSucceeded(canceledPortOne)) {
      throw new Error('PayPal refund is pending. Await cancellation confirmation.');
    }

    const now = new Date();
    const revocation = await revokeSinglePaymentContentAccess(payment, {
      status: CONTENT_ENTITLEMENT_STATUSES.REFUNDED,
      reason: reasonCode,
    });
    const canceledPayment = await Payment.findByIdAndUpdate(
      payment._id,
      {
        $set: {
          impUid: payment.impUid || payment.merchantUid || "",
          merchantUid: payment.merchantUid || payment.impUid || "",
          paymentAmount: Number(payment.paymentAmount || 0),
          status: "cancelled",
          orderState: PAYMENT_ORDER_STATES.CANCELLED,
          rawPortOne: canceledPortOne,
          failureCode: reasonCode,
          failureMessage: reasonMessage,
          failureStage,
          lastErrorAt: now,
          "metadata.deliveryStatus": "refunded",
          "metadata.refundStatus": "refunded",
          "metadata.refundIdempotencyKey": refundIdempotencyKey,
          "metadata.autoRefundedAt": now,
          "metadata.refundReason": reasonMessage,
          "metadata.unlockRevoked": revocation.unlockRevoked === true,
          "metadata.unlockRevocationStatus": revocation.status || CONTENT_ENTITLEMENT_STATUSES.REFUNDED,
          "metadata.unlockRevocationError": revocation.error || "",
        },
      },
      { returnDocument: "after" },
    ).lean();

    logPaidServicePaymentEvent("[PaidService Auto Refund Success]", canceledPayment || payment, {
      deliveryStatus: "refunded",
      refundStatus: "refunded",
      failureReason: reasonMessage,
    });
    return { refunded: true, payment: canceledPayment || payment };
  } catch (error) {
    const now = new Date();
    const failedPayment = await Payment.findByIdAndUpdate(
      payment._id,
      {
        $set: {
          orderState: PAYMENT_ORDER_STATES.ERROR,
          failureCode: `${reasonCode}_refund_failed`.slice(0, 120),
          failureMessage: String(error?.message || reasonMessage || "Automatic refund failed.").slice(0, 500),
          failureStage,
          lastErrorAt: now,
          "metadata.deliveryStatus": "refund_failed",
          "metadata.refundStatus": "refund_failed",
          "metadata.refundIdempotencyKey": refundIdempotencyKey,
          "metadata.refundFailedAt": now,
          "metadata.refundFailureReason": String(error?.message || error || "").slice(0, 500),
        },
      },
      { returnDocument: "after" },
    ).lean();
    logPaidServicePaymentEvent("[PaidService Auto Refund Failed]", failedPayment || payment, {
      deliveryStatus: "refund_failed",
      refundStatus: "refund_failed",
      failureReason: String(error?.message || reasonMessage || ""),
    });
    return { refunded: false, refundFailed: true, payment: failedPayment || payment, reason: String(error?.message || error || "") };
  }
}

// ── 전달 실패 자동 환불 재시도(2026-11-28) ─────────────────────────────────────────────
// 위 autoRefundSinglePaymentDeliveryFailure 가 PG 취소에 실패하면 Payment 는 paid 로 남고
// metadata.refundStatus 만 "refund_failed" 가 된다. 예전에는 이 상태를 다시 읽는 곳이 없어서
// 고객이 결과도 환불도 받지 못한 채 남았다. 10분 크론이 아래 함수로 다시 시도한다.
//
// 🔴 중복 환불 방지 세 겹:
//   1) 선점: nextAt 을 미래로 미는 원자적 findOneAndUpdate 로 한 틱·한 워커만 같은 주문을 잡는다.
//   2) PG 사전 조회: 이미 전액 취소돼 있으면 PG 를 다시 부르지 않고 로컬 상태만 맞춘다.
//      부분 취소는 자동으로 손대지 않고 운영자 검토로 넘긴다.
//   3) 같은 멱등 키: buildSinglePaymentRefundIdempotencyKey 는 같은 주문이면 같은 키를 만든다.
// 한도를 넘으면 metadata.refundRetry.manualReview=true 로 멈추고, 운영자 알림
// (worker/payments/reconcile.js alertPaymentAnomalies 의 refundFailures)이 사람에게 넘긴다.
export const REFUND_RETRY_MAX_ATTEMPTS = 5;
export const REFUND_RETRY_BATCH_LIMIT = 10;
/** 첫 실패 직후 요청 경로가 아직 정리 중일 수 있어 이 시간이 지난 건만 잡는다. 재시도 간격의 기본값이기도 하다. */
export const REFUND_RETRY_MIN_AGE_MS = 10 * 60_000;
const REFUND_RETRY_MAX_BACKOFF_MS = 6 * 60 * 60_000;
/** 재시도는 최근 실패만 본다. 오래 묵은 건은 운영자가 이미 다르게 처리했을 수 있다. */
export const REFUND_RETRY_LOOKBACK_MS = 3 * 24 * 60 * 60_000;
/**
 * 🔴 이 장치가 생기기 전에 실패한 건은 자동으로 환불하지 않는다. 기존 데이터에 대한 일괄 환불은
 * 조사 보고서(docs/operations/PAYMENT_DELIVERY_AUDIT.md)와 운영자 승인을 먼저 거친다.
 */
export const REFUND_RETRY_NOT_BEFORE = new Date("2026-11-28T15:00:00.000Z");
const REFUND_FAILED_SUFFIX = /_refund_failed$/;

export function refundRetryBackoffMs(attempt) {
  const n = Math.max(1, Number(attempt) || 1);
  return Math.min(REFUND_RETRY_MIN_AGE_MS * 2 ** (n - 1), REFUND_RETRY_MAX_BACKOFF_MS);
}

/** 재시도 대상 조건. 선점 CAS 도 같은 조건을 다시 건다 — 겹친 틱은 한쪽만 잡는다. */
export function buildRefundRetryFilter(now = new Date(), { maxAttempts = REFUND_RETRY_MAX_ATTEMPTS } = {}) {
  return {
    "metadata.refundStatus": "refund_failed",
    status: { $ne: "cancelled" },
    orderState: { $ne: PAYMENT_ORDER_STATES.CANCELLED },
    "metadata.refundRetry.manualReview": { $ne: true },
    "metadata.refundFailedAt": {
      $lte: new Date(now.getTime() - REFUND_RETRY_MIN_AGE_MS),
      $gte: new Date(Math.max(now.getTime() - REFUND_RETRY_LOOKBACK_MS, REFUND_RETRY_NOT_BEFORE.getTime())),
    },
    $and: [
      { $or: [
        { "metadata.refundRetry.count": { $exists: false } },
        { "metadata.refundRetry.count": { $lt: maxAttempts } },
      ] },
      { $or: [
        { "metadata.refundRetry.nextAt": { $exists: false } },
        { "metadata.refundRetry.nextAt": null },
        { "metadata.refundRetry.nextAt": { $lte: now } },
      ] },
    ],
  };
}

function rawPortOneStatus(pgPayment) {
  // 정규화된 status 는 부분 취소도 "cancelled" 로 뭉개므로 PG 원본 상태만 본다.
  return String(pgPayment?.rawV2?.status || "").trim().toUpperCase();
}

async function finalizeAlreadyCancelledRefund(model, payment, pgPayment, now, revoke) {
  const reasonCode = String(payment.failureCode || "").replace(REFUND_FAILED_SUFFIX, "") || "delivery_refund_retry";
  const revocation = await revoke(payment, {
    status: CONTENT_ENTITLEMENT_STATUSES.REFUNDED,
    reason: reasonCode,
  });
  await model.updateOne(
    { _id: payment._id, status: { $ne: "cancelled" } },
    {
      $set: {
        status: "cancelled",
        orderState: PAYMENT_ORDER_STATES.CANCELLED,
        failureCode: reasonCode,
        lastErrorAt: now,
        "metadata.deliveryStatus": "refunded",
        "metadata.refundStatus": "refunded",
        "metadata.autoRefundedAt": now,
        "metadata.refundRetry.resolvedBy": "pg_already_cancelled",
        "metadata.refundRetry.pgStatus": rawPortOneStatus(pgPayment).slice(0, 40),
        "metadata.unlockRevoked": revocation.unlockRevoked === true,
        "metadata.unlockRevocationStatus": revocation.status || CONTENT_ENTITLEMENT_STATUSES.REFUNDED,
        "metadata.unlockRevocationError": revocation.error || "",
      },
    },
  );
}

async function markRefundRetryManualReview(model, payment, reason, now) {
  await model.updateOne(
    { _id: payment._id },
    {
      $set: {
        "metadata.refundRetry.manualReview": true,
        "metadata.refundRetry.manualReviewAt": now,
        "metadata.refundRetry.manualReviewReason": String(reason || "").slice(0, 200),
      },
    },
  );
}

/**
 * refund_failed 단건 주문을 다시 환불한다. 크론 전용. 던지지 않는다.
 * 돌려주는 값은 건수만 — 주문번호·사용자 정보는 싣지 않는다.
 */
export async function retryFailedSinglePaymentRefunds(env, {
  now = new Date(),
  limit = REFUND_RETRY_BATCH_LIMIT,
  maxAttempts = REFUND_RETRY_MAX_ATTEMPTS,
  model = Payment,
  // 조회 함수는 지연 로드 — portone.js 를 cancel 만 흉내 내는 기존 테스트 목을 깨지 않는다.
  fetchPayment = async (...args) => (await import("./portone.js")).fetchPortOnePayment(...args),
  refund = autoRefundSinglePaymentDeliveryFailure,
  revoke = revokeSinglePaymentContentAccess,
} = {}) {
  const summary = { scanned: 0, claimed: 0, refunded: 0, alreadyCancelled: 0, failed: 0, manualReview: 0, errors: 0 };
  let candidates = [];
  try {
    candidates = await model.find(buildRefundRetryFilter(now, { maxAttempts }))
      .sort({ "metadata.refundFailedAt": 1 })
      .limit(limit)
      .lean();
  } catch (error) {
    summary.errors += 1;
    logSwallowedPaymentError("refund_retry_query")(error);
    return summary;
  }
  summary.scanned = candidates.length;

  for (const candidate of candidates) {
    const ids = { merchantUid: String(candidate?.merchantUid || "").slice(-8) };
    try {
      const attempt = Number(candidate?.metadata?.refundRetry?.count || 0) + 1;
      const claimed = await model.findOneAndUpdate(
        { _id: candidate._id, ...buildRefundRetryFilter(now, { maxAttempts }) },
        {
          $set: {
            "metadata.refundRetry.lastAttemptAt": now,
            "metadata.refundRetry.nextAt": new Date(now.getTime() + refundRetryBackoffMs(attempt)),
          },
          $inc: { "metadata.refundRetry.count": 1 },
        },
        { returnDocument: "after" },
      ).lean();
      if (!claimed) continue;
      summary.claimed += 1;
      const count = Number(claimed?.metadata?.refundRetry?.count || attempt);
      const paymentId = String(claimed.impUid || claimed.merchantUid || "").trim();

      let pgPayment = null;
      if (paymentId) {
        try {
          pgPayment = await fetchPayment(env, paymentId);
        } catch (error) {
          // 조회 실패는 취소 시도를 막지 않는다 — 같은 멱등 키와 PG 측 잔액 검증이 중복을 막는다.
          logSwallowedPaymentError("refund_retry_pg_lookup", ids)(error);
        }
      }
      const pgStatus = rawPortOneStatus(pgPayment);
      if (pgStatus === "CANCELLED" || pgStatus === "CANCELED") {
        await finalizeAlreadyCancelledRefund(model, claimed, pgPayment, now, revoke);
        summary.alreadyCancelled += 1;
        continue;
      }
      if (pgStatus === "PARTIAL_CANCELLED") {
        await markRefundRetryManualReview(model, claimed, "pg_partial_cancelled", now);
        summary.manualReview += 1;
        continue;
      }

      const reasonCode = String(claimed.failureCode || "").replace(REFUND_FAILED_SUFFIX, "") || "delivery_refund_retry";
      const reasonMessage = String(claimed.metadata?.refundReason || claimed.failureMessage || "결과 전달 실패 자동 환불 재시도").slice(0, 120);
      const result = await refund(env, claimed, reasonCode, reasonMessage, claimed.failureStage || "refund_retry");
      if (result?.refunded) {
        summary.refunded += 1;
        continue;
      }
      summary.failed += 1;
      if (count >= maxAttempts) {
        await markRefundRetryManualReview(model, claimed, "max_attempts", now);
        summary.manualReview += 1;
      }
    } catch (error) {
      summary.errors += 1;
      logSwallowedPaymentError("refund_retry_item", ids)(error);
    }
  }
  if (summary.claimed > 0 || summary.errors > 0) {
    console.info("[refund-retry]", JSON.stringify(summary));
  }
  return summary;
}

/** 10분 크론 진입점. 절대 throw 하지 않는다(scheduled 의 다른 태스크를 함께 죽이지 않기 위해). */
export async function runRefundRetryTask(env, options = {}) {
  try {
    // 지연 로드 — db.js 를 일부만 흉내 내는 기존 테스트 목을 깨지 않는다.
    const { connectDb } = await import("./db.js");
    await connectDb(env);
    return await retryFailedSinglePaymentRefunds(env, options);
  } catch (error) {
    console.error("[refund-retry] task failed", String(error?.message || error).slice(0, 200));
    return { ok: false };
  }
}
