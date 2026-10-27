import { ContentEntitlement, PaidExecutionRecord, ServiceExecutionTransaction } from "./models.js";
import { billingEvidenceClaimId } from "./billing-evidence-claim.js";
import { findBillingEvidenceClaim } from "./billing-evidence-claim-store.js";

/**
 * 코인 자동 환불(/api/fortune/pig-coin/refund · /api/billing/refund)의 단일 자격 판정.
 *
 * 왜 있는가 — 환불 핸들러가 "48시간 안의 내 차감 행"이면 무엇이든 되돌려 줘, 결과를 받은 뒤
 * 환불을 불러 코인을 돌려받고(해금은 그대로) 같은 콘텐츠를 공짜로 가질 수 있었다(2026-10-16).
 * 그래서 차감 행을 되돌리기 전에 "이 결제로 이미 무언가 전달됐는가"를 서버 기록으로 본다.
 *
 * 전달 근거(하나라도 있으면 409 REFUND_NOT_ELIGIBLE, 잔액 변화 없음):
 *  1. billing_evidence_claims — 증빙을 쓴 요청이 있다. 생성이 최종 실패하면 그 요청이 claim 을 푼다.
 *     단, 서버 라우트가 자기 실패를 환불할 때는 failedRequestId 로 자기 claim 만 제외한다(본문 값 아님).
 *     회당 리포트 claim(kind "premium-report")은 실패해도 풀리지 않으므로 그 자체로는 거절하지 않고,
 *     그 claim 요청(requestId, "|" 앞 원요청 포함)의 2·3 기록이 있을 때만 전달로 본다.
 *  2. ServiceExecutionTransaction — success / delivered / completed 로 끝난 실행, 또는 확정 파트가 이미
 *     화면에 나간 진행 중 paid-narrative(서버 onExhausted 환불의 자기 기록은 제외).
 *  3. PaidExecutionRecord — completed / partial / delivery_pending(본문이 이미 나간 상태).
 *  4. ContentEntitlement ACTIVE — 이 차감으로 연 영구 해금. 해지(revoke)하지 않고 환불을 거절한다.
 *  5. 출생 기반이 아닌 영구 해금 키의 차감 — 차감 행 자체가 해금 근거다(resolvePersistedUnlockFeatures).
 *     환불은 그 행을 지우지 않으므로 되돌리면 해금이 공짜로 남는다. 해금은 유지되므로 재생성은 무료다.
 * 조회 오류는 삼키지 않고 503 — 확인 못 한 채 코인을 내주지도, 결제한 사람을 409 로 막지도 않는다.
 */
export const REFUND_NOT_ELIGIBLE = "REFUND_NOT_ELIGIBLE";
export const REFUND_NOT_ELIGIBLE_MESSAGE = "이미 전달된 결제는 자동 환불할 수 없습니다. 고객센터로 문의해 주세요.";
export const REFUND_VERIFY_UNAVAILABLE = "REFUND_VERIFY_UNAVAILABLE";
export const REFUND_VERIFY_UNAVAILABLE_MESSAGE = "환불 가능 여부를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.";

const clean = (value, max = 200) => String(value ?? "").trim().slice(0, max);

function deductionEvidenceIds(deduction = {}) {
  const meta = deduction?.metadata && typeof deduction.metadata === "object" ? deduction.metadata : {};
  return [...new Set([deduction?._id, meta.requestId, meta.idempotencyKey, meta.purchaseId, meta.orderId, meta.paymentId]
    .map((value) => clean(value, 180)).filter(Boolean))];
}

const notEligible = (reason) => ({ ok: false, status: 409, code: REFUND_NOT_ELIGIBLE, message: REFUND_NOT_ELIGIBLE_MESSAGE, reason });

/**
 * @param {object} env
 * @param {{userId:string, deduction:object, failedRequestId?:string, isPermanentUnlockKey?:(key:string)=>boolean}} input
 * @returns {Promise<{ok:true} | {ok:false, status:number, code:string, message:string, reason?:string, retryable?:boolean}>}
 */
export async function assertDeductionRefundable(env, { userId, deduction, failedRequestId = "", isPermanentUnlockKey = null } = {}) {
  const uid = clean(userId, 64);
  const ids = deductionEvidenceIds(deduction);
  const ownRequestId = clean(failedRequestId, 200);
  if (!uid || !ids.length) return notEligible("NO_DEDUCTION");
  try {
    const reportRequestIds = [];
    for (const id of ids) {
      const claim = await findBillingEvidenceClaim(env, billingEvidenceClaimId(id));
      if (!claim || (ownRequestId && claim.userId === uid && claim.requestId === ownRequestId)) continue;
      // 회당 리포트(requirePremiumReportAccess) claim 은 생성이 실패해도 풀리지 않는다 — 실패를 409 로 막지 않도록
      // claim 만으로는 전달로 보지 않고, 그 요청의 저장·전달 기록(아래 2·3)이 있을 때만 거절한다.
      if (claim.kind === "premium-report" && claim.userId === uid) {
        const claimRequestId = clean(claim.requestId, 200);
        reportRequestIds.push(claimRequestId, claimRequestId.split("|")[0]); // sukuyo 처럼 "요청|조합" 으로 묶인 claim
        continue;
      }
      return notEligible("EVIDENCE_CLAIMED");
    }
    const deliveryIds = [...new Set([...ids, ...reportRequestIds.filter(Boolean)])];
    const startedParts = (path) => ({ $and: [
      { [path]: { $exists: true } },
      { [path]: { $ne: {} } },
      ...(ownRequestId ? [{ idempotencyKey: { $ne: ownRequestId } }] : []),
    ] });

    const executed = await ServiceExecutionTransaction.findOne({
      userId: uid,
      $and: [
        { $or: [
          { status: "success" },
          { deliveryStatus: "delivered" },
          { premiumStatus: "completed" },
          // 진행 중 paid-narrative·celestial 도 확정된 파트는 202 응답으로 이미 화면에 나간다(respond 의 render).
          // 서버가 자기 실패를 환불할 때(onExhausted)는 그 요청 자신의 기록만 제외한다.
          startedParts("metadata.paidNarrative.parts"),
          startedParts("metadata.celestialDelivery.delivery.parts"),
        ] },
        { $or: [
          { coinTransactionId: { $in: deliveryIds } },
          { sourceTransactionId: { $in: deliveryIds } },
          { paymentId: { $in: deliveryIds } },
          { orderId: { $in: deliveryIds } },
          { idempotencyKey: { $in: deliveryIds } },
          { "metadata.paidNarrative.body.sourceTransactionId": { $in: deliveryIds } },
          { "metadata.paidNarrative.body.transactionId": { $in: deliveryIds } },
          { "metadata.paidNarrative.paymentProof.sourceTransactionId": { $in: deliveryIds } },
          { "metadata.paidNarrativeProof.transactionId": { $in: deliveryIds } },
        ] },
      ],
    }).select({ _id: 1 }).lean();
    if (executed) return notEligible("EXECUTION_DELIVERED");

    const record = await PaidExecutionRecord.findOne({
      userId: uid,
      status: { $in: ["completed", "partial", "delivery_pending"] },
      $or: [{ paymentId: { $in: deliveryIds } }, { requestId: { $in: deliveryIds } }, { idempotencyKey: { $in: deliveryIds } }, { orderId: { $in: deliveryIds } }],
    }).select({ _id: 1 }).lean();
    if (record) return notEligible("EXECUTION_DELIVERED");

    const unlock = await ContentEntitlement.findOne({
      userId: uid,
      status: "ACTIVE",
      $or: [
        { paymentId: { $in: ids } },
        { orderId: { $in: ids } },
        { evidenceId: { $in: ids } },
        { passId: { $in: ids } },
        { mergedOrderIds: { $in: ids } },
      ],
    }).select({ _id: 1 }).lean();
    if (unlock) return notEligible("PERMANENT_UNLOCK");
  } catch (error) {
    console.warn("[pig-coin-refund] eligibility check unavailable", { userId: uid, message: String(error?.message || error) });
    return { ok: false, status: 503, code: REFUND_VERIFY_UNAVAILABLE, message: REFUND_VERIFY_UNAVAILABLE_MESSAGE, retryable: true };
  }

  if (typeof isPermanentUnlockKey === "function" && isPermanentUnlockKey(clean(deduction?.featureKey, 160))) {
    return notEligible("PERMANENT_UNLOCK");
  }
  return { ok: true };
}
