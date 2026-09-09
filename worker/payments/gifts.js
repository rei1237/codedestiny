import { Gift, GiftGrant, GiftClaimContext } from "../lib/gift-models.js";
import { Payment, User } from "../lib/models.js";
import { toObjectId } from "./db.js";
import { paymentError } from "./errors.js";
import { activatePassSubscription, resolvePassPlan } from "./passes.js";
import { computePassExpiry, evaluatePassTierTransition } from "../lib/profile-limits.js";
import { GIFT_POLICY_VERSION, GIFTABLE_TIERS } from "../../lib/payment/gift-policy.js";

export function purchaseTypeOf(value) {
  if (value === undefined || value === null) return "SELF";
  if (value !== "SELF" && value !== "GIFT") throw paymentError("INVALID_REQUEST", "구매 방식이 올바르지 않습니다.");
  return value;
}
function inputText(value, max) {
  if (value == null) return "";
  if (typeof value !== "string" || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    throw paymentError("INVALID_REQUEST", "선물 이름이나 메시지 길이를 확인해 주세요.");
  }
  return value.trim();
}
export function giftDraftFor(body, plan) {
  if (!GIFTABLE_TIERS.includes(plan.tier)) throw paymentError("PRODUCT_NOT_FOUND", "선물할 수 없는 상품입니다.");
  return {
    senderName: inputText(body?.senderName, 40), recipientName: inputText(body?.recipientName, 40),
    giftMessage: inputText(body?.giftMessage, 500), policyVersion: GIFT_POLICY_VERSION,
    productSnapshot: { ...plan, currency: "KRW" },
  };
}
export async function hashGiftToken(raw) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}
export function newGiftToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
}
export function assertRawGiftToken(raw) {
  if (typeof raw !== "string" || !/^[0-9a-f]{64}$/.test(raw)) throw paymentError("GIFT_NOT_FOUND", "선물 링크를 확인해 주세요.");
}
export function giftExpiry(paidAt) {
  const date = new Date(paidAt);
  const month = date.getUTCMonth();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  if (date.getUTCMonth() !== month) date.setUTCDate(0);
  return date;
}
export async function assertGiftIndexes(db) {
  for (const [model, keys] of [[Gift, ["giftId", "orderId", "claimTokenHash"]], [GiftGrant, ["giftId"]], [GiftClaimContext, ["contextHash"]]]) {
    const indexes = await db.indexes(model);
    for (const key of keys) {
      if (!indexes.some(i => i.unique && Object.keys(i.key).length === 1 && i.key[key] === 1)) {
        throw paymentError("GIFT_UNAVAILABLE", "선물 구매 준비 중입니다. 잠시 후 확인해 주세요.");
      }
    }
  }
}
export function assertGiftPurchasesEnabled(env, request) {
  if (String(env?.GIFTS_ENABLED || "") !== "1" || /^(1|true)$/i.test(request.headers.get("X-CD-App") || "")) {
    throw paymentError("GIFT_UNAVAILABLE", "현재 선물 구매를 준비 중입니다.");
  }
}
export async function ensureGiftForOrder(db, order) {
  const draft = order.metadata?.giftDraft;
  if (order.purchaseType !== "GIFT" || !draft?.productSnapshot) throw paymentError("INVALID_REQUEST", "선물 주문이 아닙니다.");
  const now = new Date();
  const giftId = `gift_${order.merchantUid}`;
  const _id = toObjectId((await hashGiftToken(giftId)).slice(0, 24));
  await db.findOneAndUpdate(Gift, { _id }, { $setOnInsert: {
    _id, giftId, orderId: order.merchantUid, purchaserUserId: order.userId, productId: order.productId,
    ...draft, status: "PENDING_PAYMENT", tokenVersion: 0, createdAt: now, updatedAt: now,
  } }, { upsert: true, returnDocument: "after" });
  if (["paid", "success", "fulfilled"].includes(order.status)) {
    const paidAt = new Date(order.paidAt || now);
    await db.updateOne(Gift, { _id, status: "PENDING_PAYMENT" }, { $set: {
      status: "PAID", purchasedAt: paidAt, expiresAt: giftExpiry(paidAt),
      paymentId: order.impUid || order.merchantUid, updatedAt: now,
    } });
  }
  return db.findOne(Gift, { _id });
}
export function presentGift(gift, { owner = false, now = new Date() } = {}) {
  if (!gift) throw paymentError("GIFT_NOT_FOUND", "선물 링크를 확인해 주세요.");
  const status = gift.status === "PAID" && new Date(gift.expiresAt) <= now ? "EXPIRED" : gift.status;
  return {
    giftId: gift.giftId, productId: gift.productId, product: gift.productSnapshot,
    senderName: gift.senderName || "누군가", recipientName: gift.recipientName || "",
    giftMessage: gift.giftMessage || "", status, purchasedAt: gift.purchasedAt,
    claimedAt: gift.claimedAt, expiresAt: gift.expiresAt, reviewRequired: Boolean(gift.reviewRequired),
    ...(owner ? { orderId: gift.orderId, hasLink: Boolean(gift.claimTokenHash), tokenVersion: gift.tokenVersion || 0 } : {}),
  };
}
export async function issueGiftLink(db, { giftId, userId, version }) {
  if (!Number.isSafeInteger(version) || version < 0) throw paymentError("INVALID_REQUEST", "선물 정보를 다시 확인해 주세요.");
  const raw = newGiftToken();
  const gift = await db.findOneAndUpdate(Gift, {
    giftId, purchaserUserId: toObjectId(userId), status: "PAID", expiresAt: { $gt: new Date() }, tokenVersion: version,
  }, { $set: { claimTokenHash: await hashGiftToken(raw), updatedAt: new Date() }, $inc: { tokenVersion: 1 } }, { returnDocument: "after" });
  if (!gift) throw paymentError("GIFT_CONFLICT", "링크가 변경되었거나 수령할 수 없는 선물입니다. 새로고침해 주세요.");
  return { gift: presentGift(gift, { owner: true }), claimPath: `/gift/claim#token=${raw}` };
}
export async function claimGift(db, { tokenHash, userId, now = new Date() }) {
  return db.transaction(async tx => {
    const gift = await tx.findOne(Gift, { claimTokenHash: tokenHash });
    if (!gift) throw paymentError("GIFT_NOT_FOUND", "선물 링크를 확인해 주세요.");
    if (gift.status === "CLAIMED") {
      if (String(gift.recipientUserId) !== String(userId)) throw paymentError("GIFT_CLAIMED", "이미 수령된 선물입니다.");
      const grant = await tx.findOne(GiftGrant, { giftId: gift.giftId });
      if (!grant) throw paymentError("DB_UNAVAILABLE", "수령 상태를 확인 중입니다. 다시 확인해 주세요.");
      return { gift: presentGift(gift), grant, replayed: true };
    }
    if (gift.status !== "PAID" || !(new Date(gift.expiresAt) > now)) throw paymentError("GIFT_UNCLAIMABLE", "취소·환불·만료되었거나 아직 준비 중인 선물입니다.");
    const user = await tx.findOne(User, { _id: toObjectId(userId) });
    if (!user) throw paymentError("UNAUTHORIZED", "로그인이 필요합니다.");
    const plan = gift.productSnapshot;
    if (!resolvePassPlan(plan?.tier, 1)) throw paymentError("PRODUCT_NOT_FOUND", "이용권 정보를 확인할 수 없습니다.");
    const transition = evaluatePassTierTransition(user.profileSubscription, plan.tier, now);
    if (!["NEW", "EXTENSION_ALLOWED"].includes(transition.code)) throw paymentError("GIFT_TIER_CONFLICT", "현재 이용권이 종료된 후 이 선물을 수령할 수 있습니다.");
    // The payment write serializes operator/webhook cancellation with claiming.
    const payment = await tx.findOneAndUpdate(Payment, {
      merchantUid: gift.orderId, purchaseType: "GIFT", status: { $in: ["paid", "success", "fulfilled"] },
      refundRequestedAt: null,
    }, { $inc: { "metadata.giftClaimVersion": 1 } }, { returnDocument: "after" });
    if (!payment) throw paymentError("GIFT_UNCLAIMABLE", "결제 또는 환불 상태를 확인 중입니다.");
    const claimed = await tx.findOneAndUpdate(Gift, { _id: gift._id, status: "PAID", claimTokenHash: tokenHash, expiresAt: { $gt: now } }, {
      $set: { status: "CLAIMED", recipientUserId: user._id, claimedAt: now, updatedAt: now },
    }, { returnDocument: "after" });
    if (!claimed) throw paymentError("GIFT_CONFLICT", "수령 상태가 변경되었습니다. 다시 확인해 주세요.");
    const activation = await activatePassSubscription(tx, {
      userId, plan, orderId: gift.giftId, paidAt: now, now, existing: user,
      paymentMethod: "gift", expiresAt: computePassExpiry({ transition, paidAt: now, now, durationDays: plan.durationDays }),
    });
    if (activation.conflict) throw paymentError("GIFT_CONFLICT", "이용권이 변경되었습니다. 다시 수령해 주세요.");
    const grant = {
      giftId: gift.giftId, source: "GIFT", purchaserUserId: gift.purchaserUserId,
      recipientUserId: user._id, orderId: gift.orderId, paymentId: gift.paymentId,
      before: user.profileSubscription || null, after: activation.user.profileSubscription,
      grantedAt: now, createdAt: now, updatedAt: now,
    };
    await tx.insertOne(GiftGrant, grant);
    return { gift: presentGift(claimed), grant, replayed: false };
  });
}

/** Called on verified provider cancellation, including unsolicited cancellation. */
export async function settleGiftCancellation(db, order, { partial = false } = {}) {
  const gift = await ensureGiftForOrder(db, order);
  if (["REFUNDED", "CANCELLED"].includes(gift.status)) return { reviewRequired: Boolean(gift.reviewRequired) };
  const claimed = gift.status === "CLAIMED";
  await db.updateOne(Gift, { _id: gift._id, status: gift.status }, { $set: {
    status: claimed ? "CLAIMED" : gift.status === "PENDING_PAYMENT" ? "CANCELLED" : partial ? "REFUND_PENDING" : "REFUNDED",
    reviewRequired: claimed || partial, paymentCancellation: { partial, at: new Date() }, updatedAt: new Date(),
  } });
  return { reviewRequired: claimed || partial };
}

export async function listGifts(db, { userId, received = false, cursor = "" }) {
  const filter = { [received ? "recipientUserId" : "purchaserUserId"]: toObjectId(userId) };
  if (cursor) {
    if (!toObjectId(cursor)) throw paymentError("INVALID_REQUEST", "페이지 정보가 올바르지 않습니다.");
    filter._id = { $lt: toObjectId(cursor) };
  }
  const rows = await db.find(Gift, filter, { sort: { _id: -1 }, limit: 21 });
  return { gifts: rows.slice(0, 20).map(g => presentGift(g, { owner: !received })), nextCursor: rows.length > 20 ? String(rows[19]._id) : null };
}
