import { Gift } from "../lib/gift-models.js";
import { Payment } from "../lib/models.js";
import { cancelPortOnePayment, fetchPortOnePayment } from "../lib/portone.js";
import { withPaymentDb, createPaymentContext } from "./db.js";

export async function reconcileGiftRefunds(env) {
  const ctx = createPaymentContext({ requestId: `gift-refunds-${Date.now()}`, route: "CRON gift-refunds" });
  const orders = await withPaymentDb(env, ctx, async db => {
    const gifts = await db.find(Gift, { status: "REFUND_PENDING", refundRequestId: { $type: "string" }, updatedAt: { $lt: new Date(Date.now() - 60_000) } }, { limit: 5 });
    const orders = [];
    for (const gift of gifts) {
      const order = await db.findOne(Payment, { merchantUid: gift.orderId });
      if (order) orders.push(order);
    }
    return orders;
  });
  let completed = 0;
  for (const payment of orders) {
    const result = await refundGiftAsOperator({ env, payment, reason: "Resume requested gift refund", actorId: "reconcile" });
    if (result.ok) completed++;
  }
  return { scanned: orders.length, completed };
}

/** PG side effects stay outside transactions. A pending refund never permits claim. */
export async function refundGiftAsOperator({ env, payment, reason, amount, actorId }, deps = {}) {
  const withDb = deps.withDb || withPaymentDb;
  const fetchPayment = deps.fetchPayment || fetchPortOnePayment;
  const cancelPayment = deps.cancelPayment || cancelPortOnePayment;
  if (amount !== undefined && amount !== Number(payment.paymentAmount)) return { ok: false, status: 409, code: "GIFT_PARTIAL_REFUND_REVIEW", message: "선물 부분 환불은 별도 운영 확인이 필요합니다." };
  const ctx = createPaymentContext({ requestId: `gift-refund-${payment.merchantUid}`, route: "gift-operator-refund" });
  const lock = await withDb(env, ctx, db => db.transaction(async tx => {
    const gift = await tx.findOne(Gift, { orderId: payment.merchantUid });
    if (!gift) return { blocked: true };
    if (gift.status === "REFUNDED") return { done: true };
    if (gift.status === "REFUND_PENDING") return { pending: true, gift };
    if (!["PAID", "EXPIRED"].includes(gift.status)) return { blocked: true };
    const updated = await tx.findOneAndUpdate(Gift, { _id: gift._id, status: gift.status }, { $set: {
      status: "REFUND_PENDING", refundPreviousStatus: gift.status, refundRequestId: `gift-refund-${gift.orderId}`,
      updatedAt: new Date(), reviewRequired: true,
    } }, { returnDocument: "after" });
    const order = await tx.findOneAndUpdate(Payment, { _id: payment._id, status: { $in: ["paid", "success", "fulfilled"] } }, {
      $set: { refundRequestedAt: new Date(), adminReviewRequired: true }, $inc: { "metadata.giftClaimVersion": 1 },
    }, { returnDocument: "after" });
    if (!updated || !order) throw new Error("Gift refund state conflict");
    return { gift: updated };
  }));
  if (lock.blocked) return { ok: false, status: 409, code: "GIFT_REFUND_REVIEW", message: "수령된 선물 또는 결제 상태는 운영자 확인이 필요합니다." };
  if (lock.done) return { ok: true, status: 200, idempotent: true, payment, adminReviewRequired: false };
  try {
    // On an uncertain previous request, query provider first; never reopen claiming on timeout.
    let pg = await fetchPayment(env, payment.merchantUid);
    if (pg.status !== "cancelled") {
      if (pg.status !== "paid" || lock.gift.paymentCancellation?.partial) return { ok: false, status: 409, code: "GIFT_REFUND_PENDING", message: "환불 결과를 확인 중입니다. 운영 결제 내역을 확인해 주세요." };
      await cancelPayment(env, { merchantUid: payment.merchantUid, impUid: payment.impUid || undefined, reason, idempotencyKey: lock.gift.refundRequestId });
      pg = await fetchPayment(env, payment.merchantUid);
    }
    // The shared normalizer also maps PARTIAL_CANCELLED to cancelled; inspect provider truth.
    if (pg.status !== "cancelled" || /PARTIAL/i.test(String(pg.rawV2?.status || ""))) {
      return { ok: false, status: 409, code: "GIFT_REFUND_PENDING", message: "전체 환불 완료를 확인 중입니다.", adminReviewRequired: true };
    }
    const updated = await withDb(env, ctx, db => db.transaction(async tx => {
      await tx.updateOne(Gift, { orderId: payment.merchantUid, status: "REFUND_PENDING" }, { $set: { status: "REFUNDED", reviewRequired: false, updatedAt: new Date() } });
      return tx.findOneAndUpdate(Payment, { _id: payment._id }, { $set: { status: "refunded", orderState: "REFUNDED", adminReviewRequired: false, updatedAt: new Date() } }, { returnDocument: "after" });
    }));
    console.info("[GIFT_REFUNDED]", { orderId: payment.merchantUid, actorId });
    return { ok: true, status: 200, payment: updated, adminReviewRequired: false, unlockRevoked: false };
  } catch {
    return { ok: false, status: 409, code: "GIFT_REFUND_PENDING", message: "환불 결과가 아직 확인되지 않았습니다. 다시 결제하지 말고 운영 결제 내역을 확인해 주세요.", adminReviewRequired: true };
  }
}
