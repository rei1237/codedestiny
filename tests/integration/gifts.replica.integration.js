/** @jest-environment node */
import { mongoose } from "../../worker/lib/db.js";
import { Gift, GiftGrant, GiftClaimContext } from "../../worker/lib/gift-models.js";
import { Payment, User } from "../../worker/lib/models.js";
import { __paymentDbTestUtils } from "../../worker/payments/db.js";
import { createPassOrder, resolvePassPlan, activatePassSubscription } from "../../worker/payments/passes.js";
import { giftDraftFor, ensureGiftForOrder, issueGiftLink, hashGiftToken, claimGift, assertGiftIndexes, settleGiftCancellation } from "../../worker/payments/gifts.js";
import { __paymentsContextTestUtils, handlePaymentsContext } from "../../worker/payments/index.js";
import { signAuthToken } from "../../worker/lib/auth.js";
import { handleGiftRoute } from "../../worker/payments/gift-routes.js";
import { refundGiftAsOperator } from "../../worker/payments/gift-refund.js";
import { applyEntitlementUpdate } from "../../worker/routes/app-store.js";

const uri = "mongodb://127.0.0.1:27029/gift_integration_test?replicaSet=gift-test";
const purchaser = new mongoose.Types.ObjectId("64b000000000000000000001");
const receiver = new mongoose.Types.ObjectId("64b000000000000000000002");
const other = new mongoose.Types.ObjectId("64b000000000000000000003");
const env = { GIFTS_ENABLED: "1", JWT_ACCESS_SECRET: "test-access-secret-value-0123456789", PORTONE_STORE_ID: "store-test", PORTONE_CHANNEL_KEY: "channel-test", PORTONE_API_SECRET: "test-secret", SECURITY_GUARD_MODE: "off" };
let db;
const now = new Date();
const day = 86400000;
beforeAll(async () => {
  await mongoose.connect(uri, { autoIndex: false, serverSelectionTimeoutMS: 5000 });
  for (const m of [Gift, GiftGrant, GiftClaimContext, Payment]) await m.createIndexes();
  db = __paymentDbTestUtils.makeCountingDb({ mongoOps: 0 });
}, 15000);
beforeEach(async () => {
  for (const m of [Gift, GiftGrant, GiftClaimContext, Payment, User]) await m.collection.deleteMany({});
  await User.collection.insertMany([purchaser, receiver, other].map(_id => ({ _id, email: `${_id}@example.test`, name: "test", phoneNumber: "01012345678", profileSubscription: { tier: "free", expiresAt: null } })));
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
async function paidGift(tier = "standard") {
  const plan = resolvePassPlan(tier, 1);
  let order = await createPassOrder(db, { userId: purchaser, plan, idempotencyKey: crypto.randomUUID(), purchaseType: "GIFT", giftDraft: giftDraftFor({}, plan) });
  await Payment.collection.updateOne({ _id: order._id }, { $set: { status: "paid", paidAt: now } });
  order = await Payment.collection.findOne({ _id: order._id });
  const gift = await ensureGiftForOrder(db, order);
  const link = await issueGiftLink(db, { giftId: gift.giftId, userId: purchaser, version: 0 });
  return { gift, order, tokenHash: await hashGiftToken(link.claimPath.split("=")[1]), token: link.claimPath.split("=")[1] };
}
test("required unique indexes exist", async () => { await assertGiftIndexes(db); });

test("app pass activation racing gift claim preserves both grants and replay safety", async () => {
  const g = await paidGift();
  const args = { userId: receiver, product: { kind: "pass", passTier: "standard", productId: "standard-30", featureKey: "standard-pass" }, googlePurchase: {}, now, passOrderId: "google-test-order" };
  await Promise.all([claimGift(db, { tokenHash: g.tokenHash, userId: receiver }), applyEntitlementUpdate(args)]);
  const user = await User.findById(receiver).lean();
  expect(new Date(user.profileSubscription.expiresAt).getTime()).toBeGreaterThanOrEqual(now.getTime() + 60 * day);
  expect(user.passGrantOrderIds).toEqual(expect.arrayContaining([g.gift.giftId, "google-test-order"]));
  await applyEntitlementUpdate(args);
  expect((await User.findById(receiver).lean()).profileSubscription).toEqual(user.profileSubscription);
  expect(await GiftGrant.countDocuments()).toBe(1);
});

test("cancellation before approval cannot be reversed by a later callback", async () => {
  const plan = resolvePassPlan("standard", 1);
  const order = await createPassOrder(db, { userId: purchaser, plan, idempotencyKey: "cancel-first", purchaseType: "GIFT", giftDraft: giftDraftFor({}, plan) });
  await ensureGiftForOrder(db, order);
  await __paymentsContextTestUtils.applyNonPaidPgEvent(db, { eventType: "Transaction.Cancelled", orderId: order.merchantUid });
  expect((await Gift.findOne({ orderId: order.merchantUid }).lean()).status).toBe("CANCELLED");
  await expect(__paymentsContextTestUtils.confirmOrder(env, {}, { orderId: order.merchantUid }, { withDb: (_e, _c, fn) => fn(db), deps: { fetchPayment: async () => ({ paymentId: order.merchantUid, status: "paid", amount: plan.wonPrice, currency: "KRW" }) } })).rejects.toBeDefined();
  expect((await Gift.findOne({ orderId: order.merchantUid }).lean()).status).toBe("CANCELLED");
  expect(await GiftGrant.countDocuments()).toBe(0);
});

test("external cancellation after claim preserves recipient entitlement for review", async () => {
  const g = await paidGift();
  await claimGift(db, { tokenHash: g.tokenHash, userId: receiver });
  const before = (await User.findById(receiver).lean()).profileSubscription;
  await __paymentsContextTestUtils.applyNonPaidPgEvent(db, { eventType: "Transaction.Cancelled", orderId: g.order.merchantUid });
  const gift = await Gift.findOne({ giftId: g.gift.giftId }).lean();
  expect(gift.status).toBe("CLAIMED"); expect(gift.reviewRequired).toBe(true);
  expect((await User.findById(receiver).lean()).profileSubscription).toEqual(before);
});
test("verified fulfillment creates one gift and never activates purchaser", async () => {
  const plan = resolvePassPlan("premium", 1);
  const order = await createPassOrder(db, { userId: purchaser, plan, idempotencyKey: "verify", purchaseType: "GIFT", giftDraft: giftDraftFor({}, plan) });
  const pending = await ensureGiftForOrder(db, order);
  expect(pending.status).toBe("PENDING_PAYMENT");
  const deps = { fetchPayment: async () => ({ paymentId: order.merchantUid, status: "paid", amount: plan.wonPrice, currency: "KRW", paid_at: now.getTime() / 1000 }) };
  await Promise.all(Array.from({ length: 5 }, () => __paymentsContextTestUtils.confirmOrder(env, {}, { orderId: order.merchantUid, actorUserId: String(purchaser) }, { withDb: (_e, _c, fn) => fn(db), deps })));
  expect(await Gift.countDocuments({ orderId: order.merchantUid })).toBe(1);
  expect((await Gift.findOne({ orderId: order.merchantUid }).lean()).status).toBe("PAID");
  expect((await User.findById(purchaser).lean()).profileSubscription.tier).toBe("free");
});
test.each([[9800, "KRW", "paid"], [9900, "USD", "paid"], [9900, "KRW", "failed"]])("unverified payment never issues gift (%s %s %s)", async (amount, currency, status) => {
  const plan = resolvePassPlan("standard", 1);
  const order = await createPassOrder(db, { userId: purchaser, plan, idempotencyKey: "invalid", purchaseType: "GIFT", giftDraft: giftDraftFor({}, plan) });
  await ensureGiftForOrder(db, order);
  await expect(__paymentsContextTestUtils.confirmOrder(env, {}, { orderId: order.merchantUid }, { withDb: (_e, _c, fn) => fn(db), deps: { fetchPayment: async () => ({ paymentId: order.merchantUid, status, amount, currency }) } })).rejects.toBeDefined();
  expect((await Gift.findOne({ orderId: order.merchantUid }).lean()).status).toBe("PENDING_PAYMENT");
});
test("concurrent recipients get exactly one grant; winner retries idempotently", async () => {
  const { gift, tokenHash } = await paidGift();
  const results = await Promise.allSettled(Array.from({ length: 12 }, (_, i) => claimGift(db, { tokenHash, userId: i % 2 ? receiver : other, now })));
  expect(results.some(r => r.status === "fulfilled")).toBe(true);
  expect(await GiftGrant.countDocuments({ giftId: gift.giftId })).toBe(1);
  const claimed = await Gift.findOne({ giftId: gift.giftId }).lean();
  expect((await claimGift(db, { tokenHash, userId: claimed.recipientUserId, now })).replayed).toBe(true);
  expect(await User.countDocuments({ "profileSubscription.tier": "standard" })).toBe(1);
});
test("same-tier claim preserves spend and adds period and budget", async () => {
  const { tokenHash } = await paidGift();
  const expiry = new Date(now.getTime() + 10 * day);
  await User.collection.updateOne({ _id: receiver }, { $set: { profileSubscription: { tier: "standard", expiresAt: expiry, premiumUseCycleKey: expiry.toISOString(), monthlyLimitCoin: 600, monthlySpendCoin: 120, premiumUseCount: 3 } } });
  const result = await claimGift(db, { tokenHash, userId: receiver, now });
  expect(new Date(result.grant.after.expiresAt).getTime()).toBe(expiry.getTime() + 30 * day);
  expect(result.grant.after.monthlySpendCoin).toBe(120);
  expect(result.grant.after.monthlyLimitCoin).toBeGreaterThan(600);
});
test.each(["premium", "family"])("different active tier %s preserves gift and account", async tier => {
  const { gift, tokenHash } = await paidGift();
  await User.collection.updateOne({ _id: receiver }, { $set: { profileSubscription: { tier, expiresAt: new Date(now.getTime() + day) } } });
  await expect(claimGift(db, { tokenHash, userId: receiver, now })).rejects.toMatchObject({ code: "GIFT_TIER_CONFLICT" });
  expect((await Gift.findById(gift._id).lean()).status).toBe("PAID");
  expect(await GiftGrant.countDocuments()).toBe(0);
});
test("self claim is permitted", async () => { const g = await paidGift(); expect((await claimGift(db, { tokenHash: g.tokenHash, userId: purchaser, now })).gift.status).toBe("CLAIMED"); });
test.each(["REFUNDED", "REFUND_PENDING", "CANCELLED", "EXPIRED"])("%s cannot claim", async status => {
  const g = await paidGift(); await Gift.collection.updateOne({ _id: g.gift._id }, { $set: { status } });
  await expect(claimGift(db, { tokenHash: g.tokenHash, userId: receiver, now })).rejects.toMatchObject({ code: "GIFT_UNCLAIMABLE" });
});
test("expired time blocks before sweep", async () => {
  const g = await paidGift(); await Gift.collection.updateOne({ _id: g.gift._id }, { $set: { expiresAt: now } });
  await expect(claimGift(db, { tokenHash: g.tokenHash, userId: receiver, now })).rejects.toMatchObject({ code: "GIFT_UNCLAIMABLE" });
});
test("link rotation revokes old token and stale double issuance", async () => {
  const g = await paidGift(); await issueGiftLink(db, { giftId: g.gift.giftId, userId: purchaser, version: 1 });
  await expect(claimGift(db, { tokenHash: g.tokenHash, userId: receiver })).rejects.toMatchObject({ code: "GIFT_NOT_FOUND" });
  await expect(issueGiftLink(db, { giftId: g.gift.giftId, userId: purchaser, version: 1 })).rejects.toMatchObject({ code: "GIFT_CONFLICT" });
});
test("grant insertion failure rolls back gift, payment and account", async () => {
  const g = await paidGift();
  const broken = { ...db, transaction: fn => db.transaction(tx => fn({ ...tx, insertOne: async () => { throw new Error("injected grant failure"); } })) };
  await expect(claimGift(broken, { tokenHash: g.tokenHash, userId: receiver, now })).rejects.toThrow("injected");
  expect((await Gift.findById(g.gift._id).lean()).status).toBe("PAID");
  expect((await User.findById(receiver).lean()).profileSubscription.tier).toBe("free");
  expect((await Payment.findById(g.order._id).lean()).metadata.giftClaimVersion).toBeUndefined();
});
test("cancellation racing claim either blocks claim or flags claimed gift for review", async () => {
  const g = await paidGift();
  await Promise.allSettled([claimGift(db, { tokenHash: g.tokenHash, userId: receiver, now }), db.transaction(async tx => {
    await settleGiftCancellation(tx, g.order);
    await tx.updateOne(Payment, { _id: g.order._id }, { $set: { status: "refunded" } });
  })]);
  const gift = await Gift.findById(g.gift._id).lean();
  expect(["CLAIMED", "REFUNDED"]).toContain(gift.status);
  if (gift.status === "CLAIMED") expect(gift.reviewRequired).toBe(true);
  else expect(await GiftGrant.countDocuments()).toBe(0);
});
test("concurrent SELF update cannot erase successful gift", async () => {
  const g = await paidGift();
  const old = await User.findById(receiver).lean();
  await claimGift(db, { tokenHash: g.tokenHash, userId: receiver, now });
  const result = await activatePassSubscription(db, { userId: receiver, plan: resolvePassPlan("standard", 1), orderId: "self-other", paidAt: now, expiresAt: new Date(now.getTime() + 30 * day), existing: old, now });
  expect(result.conflict).toBe(true);
  expect((await User.findById(receiver).lean()).profileSubscription.lastPassOrderId).toBe(g.gift.giftId);
});
test("gift prepare bypasses buyer tier, binds intent and does not reuse SELF key", async () => {
  await User.collection.updateOne({ _id: purchaser }, { $set: { "profileSubscription.tier": "family", "profileSubscription.expiresAt": new Date(now.getTime() + day) } });
  const auth = await signAuthToken({ _id: String(purchaser), email: "test@example.test", role: "user" }, env);
  const post = body => handlePaymentsContext(new Request("https://code-destiny.com/api/payments/subscription/prepare", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://code-destiny.com", Authorization: `Bearer ${auth}` }, body: JSON.stringify(body) }), env, { withDb: (_e, _c, fn) => fn(db) });
  const body = { tier: "standard", durationMonths: 1, purchaseType: "GIFT", idempotencyKey: "bound", gift: { giftMessage: "hello" } };
  const res = await post(body); expect(res.status).toBe(201);
  expect((await res.json()).order.purchaseType).toBe("GIFT");
  expect((await post({ ...body, gift: { giftMessage: "changed" } })).status).toBe(409);
  expect(await Gift.countDocuments()).toBe(1);
});

test("login context stores only hashes and survives the OAuth round trip", async () => {
  const g = await paidGift();
  const call = async (path, body, cookie = "", userId = "") => {
    const auth = userId ? await signAuthToken({ _id: String(userId), email: "test@example.test", role: "user" }, env) : "";
    return handleGiftRoute({ path, env, ctx: { requestId: "context-test" }, withDb: (_e, _c, fn) => fn(db), request: new Request(`https://code-destiny.com/api/payments/gifts${path}`, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "https://code-destiny.com", Cookie: cookie, ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify(body),
    }) });
  };
  const context = await call("/context", { token: g.token });
  expect(context.status).toBe(200);
  const cookie = context.headers.get("Set-Cookie");
  expect(cookie).toContain("HttpOnly");
  expect(JSON.stringify(await GiftClaimContext.find().lean())).not.toContain(g.token);
  const preview = await call("/preview", {}, cookie.split(";")[0]);
  expect((await preview.json()).gift.status).toBe("PAID");
  const claimed = await call("/claim", {}, cookie.split(";")[0], receiver);
  expect(claimed.status).toBe(200);
  expect((await claimed.json()).gift.status).toBe("CLAIMED");
});
test("cross-origin context creation is rejected before DB writes", async () => {
  const res = await handleGiftRoute({ path: "/context", env, ctx: {}, withDb: () => { throw new Error("must not access DB"); }, request: new Request("https://code-destiny.com/api/payments/gifts/context", { method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, body: "{}" }) });
  expect(res.status).toBe(403);
});
test("unclaimed operator refund invokes PG once and prevents claiming", async () => {
  const g = await paidGift(); let calls = 0;
  const deps = { withDb: (_e, _c, fn) => fn(db), fetchPayment: async () => ({ status: calls ? "cancelled" : "paid" }), cancelPayment: async () => { calls++; return { status: "cancelled" }; } };
  const args = { env, payment: g.order, reason: "test cancellation", actorId: "test-admin" };
  expect((await refundGiftAsOperator(args, deps)).ok).toBe(true);
  expect((await refundGiftAsOperator(args, deps)).idempotent).toBe(true);
  expect(calls).toBe(1);
  await expect(claimGift(db, { tokenHash: g.tokenHash, userId: receiver })).rejects.toMatchObject({ code: "GIFT_UNCLAIMABLE" });
});
test("claimed gift cannot invoke automatic PG refund", async () => {
  const g = await paidGift(); await claimGift(db, { tokenHash: g.tokenHash, userId: receiver });
  let calls = 0;
  const r = await refundGiftAsOperator({ env, payment: g.order, reason: "test" }, { withDb: (_e, _c, fn) => fn(db), fetchPayment: async () => { calls++; } });
  expect(r.code).toBe("GIFT_REFUND_REVIEW"); expect(calls).toBe(0);
});

test("partial provider cancellation cannot be confirmed as a full refund", async () => {
  const g = await paidGift();
  const result = await refundGiftAsOperator({ env, payment: g.order, reason: "test" }, {
    withDb: (_e, _c, fn) => fn(db), fetchPayment: async () => ({ status: "cancelled", rawV2: { status: "PARTIAL_CANCELLED" } }),
    cancelPayment: async () => { throw new Error("Must not cancel a partial cancellation automatically"); },
  });
  expect(result.code).toBe("GIFT_REFUND_PENDING");
  expect((await Gift.findOne({ giftId: g.gift.giftId }).lean()).status).toBe("REFUND_PENDING");
  await expect(claimGift(db, { tokenHash: g.tokenHash, userId: receiver })).rejects.toMatchObject({ code: "GIFT_UNCLAIMABLE" });
});
test("lost refund response remains locked and recovers from provider truth", async () => {
  const g = await paidGift();
  const args = { env, payment: g.order, reason: "test" };
  const withDb = (_e, _c, fn) => fn(db);
  const first = await refundGiftAsOperator(args, { withDb, fetchPayment: async () => ({ status: "paid" }), cancelPayment: async () => { throw new Error("timeout after approval"); } });
  expect(first.code).toBe("GIFT_REFUND_PENDING");
  await expect(claimGift(db, { tokenHash: g.tokenHash, userId: receiver })).rejects.toMatchObject({ code: "GIFT_UNCLAIMABLE" });
  expect((await refundGiftAsOperator(args, { withDb, fetchPayment: async () => ({ status: "cancelled" }) })).ok).toBe(true);
});
test("commit response uncertainty retries without a second entitlement", async () => {
  const g = await paidGift();
  await mongoose.connection.db.admin().command({ configureFailPoint: "failCommand", mode: { times: 1 }, data: { failCommands: ["commitTransaction"], closeConnection: true } });
  const r = await claimGift(db, { tokenHash: g.tokenHash, userId: receiver });
  expect(r.gift.status).toBe("CLAIMED"); expect(await GiftGrant.countDocuments()).toBe(1);
});
