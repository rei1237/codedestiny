// 테스트용: nakshatra-paid-access 모킹에 settlePerUseAccessDecision 을 붙인다.
// 정본(worker/lib/nakshatra-paid-access.js)과 같은 규칙으로, 그 테스트가 넣은 verifyPerUsePayment 대역을 호출한다.
const clean = (value) => String(value ?? "").trim();

export function withSettle(mod) {
  return {
    ...mod,
    settlePerUseAccessDecision: async (env, { decision, userId, featureKey, coinPrice = 0, requestId = "", profileId = "", acceptSettled = false } = {}) => {
      const denied = { allowed: false, source: "", reason: clean(decision?.reason) || "PAYMENT_REQUIRED" };
      if (!decision?.allowed && !acceptSettled) return denied;
      if (!clean(requestId)) return { allowed: false, source: "", reason: "NO_REQUEST_ID" };
      const proof = await mod.verifyPerUsePayment(env, { userId, featureKey, coinPrice, requestId, profileId, requireExisting: !decision?.allowed });
      if (!decision?.allowed && proof?.proven === false) return denied;
      if (proof?.proven === null) return { allowed: null, source: "", reason: proof?.reason || "DB_DEGRADED" };
      if (!proof?.proven) return { allowed: false, source: "", reason: proof?.reason || "PAYMENT_REQUIRED" };
      return { allowed: true, source: proof.source, reason: "", ...(proof.transactionId ? { transactionId: proof.transactionId } : {}), ...(proof.passRefund ? { passRefund: proof.passRefund } : {}) };
    },
  };
}
