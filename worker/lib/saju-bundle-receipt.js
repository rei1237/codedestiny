import * as models from "./models.js";

// 라이트 사주 풀이(saju_lifetime_bundle) 결과 화면에 영구 표시하는 결제번호(=주문번호 merchantUid) 조회.
// 읽기 전용이다. 권한 행의 orderId 를 그대로 믿지 않고, 같은 userId 의 결제 완료 주문(Payment)과 대조해
// 그 주문의 merchantUid 만 돌려준다 — 월정석·이용권·선물 등 주문이 아닌 근거(orderId 가 requestId)나
// 환불·취소된 주문, 다른 계정의 주문은 null 이다(번호를 주지 않는다).
// 어떤 오류든 null 이다: 번호가 안 보이는 것이 풀이를 막거나 남의 번호를 보이는 것보다 낫다.
export const SAJU_RECEIPT_FEATURE_KEYS = Object.freeze(["section_summary", "section_daewun", "saju_lifetime_bundle"]);

const PAID_ORDER_STATUSES = Object.freeze(["paid", "success", "fulfilled"]);

export async function readBundleReceipt(userId, evidence) {
  const uid = String(userId || "").trim();
  const orderId = String(evidence?.orderId || "").trim().slice(0, 160);
  if (!uid || !orderId || !models.Payment) return null;
  try {
    const order = await models.Payment.findOne({
      userId: uid,
      merchantUid: orderId,
      status: { $in: PAID_ORDER_STATUSES },
      orderState: { $nin: ["CANCELLED", "PARTIAL_CANCELLED"] },
      "metadata.unlockRevoked": { $ne: true },
      "pricingSnapshot.unlockRevoked": { $ne: true },
    }).select("merchantUid").lean();
    const orderNumber = String(order?.merchantUid || "").trim();
    return orderNumber && orderNumber === orderId ? { orderNumber } : null;
  } catch {
    return null;
  }
}
