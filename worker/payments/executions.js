import { createHash } from "node:crypto";
import { PaidExecutionRecord, Payment } from "../lib/models.js";
import { toObjectId } from "./db.js";
import { paymentError } from "./errors.js";
import { PurchaseEntitlement } from "./purchase-entitlement-model.js";

export const USABLE_EXECUTION_STATUSES = ["paid_pending_generation", "generating", "completed", "generation_failed"];
const PAID = ["paid", "success", "fulfilled"];

export function paidExecutionDocumentId(executionId) {
  return toObjectId(createHash("sha256").update(executionId).digest("hex").slice(0, 24));
}

export async function resolveExecutionRegistration({ executionId, userId, featureKey, requestId, paymentId }) {
  const existing = await PaidExecutionRecord.findOne({ userId: String(userId), featureId: featureKey,
    $or: [{ executionId }, ...(paymentId ? [{ paymentId: String(paymentId) }] : [])],
  }).lean();
  if (existing && (existing.requestId !== requestId || existing.userId !== String(userId)
      || existing.featureId !== featureKey || !USABLE_EXECUTION_STATUSES.includes(existing.status)
      || (existing.paymentId && paymentId && existing.paymentId !== String(paymentId)))) {
    throw paymentError("INVALID_REQUEST", "구매한 회차의 상태를 확인해 주세요.");
  }
  return existing || { _id: paidExecutionDocumentId(executionId) };
}

/** Same identity as deferred/register; old and new clients share one execution. */
export function paidExecutionIdentity(order) {
  const requestId = String(order.requestId || order.idempotencyKey || order.merchantUid || "");
  return {
    executionId: `deferred:${order.featureKey}:${order.userId}:${requestId}`.slice(0, 160),
    requestId,
  };
}

function executionForOrderQuery(order) {
  return { userId: String(order.userId), featureId: String(order.featureKey),
    $or: [{ executionId: paidExecutionIdentity(order).executionId }, { paymentId: String(order.merchantUid) }],
  };
}

function assertPurchaseOwner(record, order, identity) {
  if (!record || String(record.userId) !== String(order.userId) || record.featureKey !== order.featureKey
      || record.requestId !== identity.requestId || (record.orderId && record.orderId !== String(order.merchantUid))
      || (record.paymentId && record.paymentId !== String(order.merchantUid))
      || record.status !== "granted") {
    throw paymentError("INVALID_REQUEST", "구매 회차 상태를 확인해 주세요.");
  }
}

/** Persist a per-use right before reporting fulfillment. Never reset a used/refunded record. */
export async function grantPurchaseEntitlement(db, order, product, now = new Date()) {
  const orderId = String(order.merchantUid || "");
  const current = await db.findOne(Payment, { merchantUid: orderId });
  if (!current || !PAID.includes(current.status) || String(current.userId) !== String(order.userId)
      || current.featureKey !== product.featureKey || current.featureKey !== order.featureKey) {
    throw paymentError("INVALID_REQUEST", "승인된 주문을 확인할 수 없습니다.");
  }
  const identity = paidExecutionIdentity(order);
  const _id = paidExecutionDocumentId(`purchase:${orderId}`);
  const existing = await db.findOne(PurchaseEntitlement, { _id });
  if (existing) {
    assertPurchaseOwner(existing, order, identity);
    return existing;
  }
  const record = await db.findOneAndUpdate(PurchaseEntitlement, { _id }, { $setOnInsert: {
    _id, entitlementId: `purchase:${orderId}`, requestId: identity.requestId,
    userId: String(order.userId), featureKey: product.featureKey, productId: String(product.productId || order.productId || product.featureKey),
    orderId, paymentId: orderId, type: "service_run", status: "granted", grantedAt: now, updatedAt: now,
  } }, { upsert: true, returnDocument: "after" });
  // Validate the persisted order binding, including a concurrent upsert winner,
  // before this order receives a fulfillment marker.
  assertPurchaseOwner(record, order, identity);
  // A refund can race the insert. The refund handler covers rows already present;
  // this second read covers rows inserted after its revocation update.
  const settled = await db.findOne(Payment, { merchantUid: orderId });
  if (!settled || !PAID.includes(settled.status)) {
    await revokePurchaseEntitlement(db, orderId, now);
    throw paymentError("INVALID_REQUEST", "취소 또는 환불된 주문입니다.");
  }
  return record;
}

export async function revokePurchaseEntitlement(db, orderId, now = new Date()) {
  const right = await db.updateOne(PurchaseEntitlement, { _id: paidExecutionDocumentId(`purchase:${orderId}`) }, {
    $set: { status: "refunded", updatedAt: now },
  });
  const execution = await db.updateOne(PaidExecutionRecord, { orderId, accessMethod: "single" }, {
    $set: { status: "refunded", updatedAt: now },
  });
  return { matchedCount: Math.max(Number(right?.matchedCount || 0), Number(execution?.matchedCount || 0)) };
}

export async function readPurchaseEntitlement(db, order) {
  return db.findOne(PurchaseEntitlement, { _id: paidExecutionDocumentId(`purchase:${order.merchantUid}`), userId: String(order.userId), featureKey: order.featureKey });
}

export async function readPaidExecution(db, order) {
  return db.findOne(PaidExecutionRecord, executionForOrderQuery(order));
}
