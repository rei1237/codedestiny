import { mongoose } from "./db.js";
import { Payment, User, FusionFortuneTicketBalance, FusionFortuneTicketTransaction } from "./models.js";
import { fetchPortOnePayment, getPortOnePublicConfig } from "./portone.js";

// 판매 중단된 상품의 정의. 신규 주문은 만들지 않지만 과거 Payment 레코드를 식별해야
// 환불·멱등성 가드가 계속 동작하므로 모양만 남긴다(삭제 마이그레이션에서 함께 정리).
const FUSION_FORTUNE_TICKET_PRODUCT = Object.freeze({
  productId: "fusion_fortune_ticket_1",
  productType: "fusion_fortune_ticket",
  name: "초융합 운세 상담권",
  priceKRW: 10000,
  ticketAmount: 1,
  description: "판매 종료된 상품입니다.",
  allowedPurchaseChannels: [],
});

function assertFusionFortuneTicketPurchaseAllowed() {
  throw error("FUSION_FORTUNE_TICKET_SALES_ENDED", "초융합 운세 상담권 판매는 종료되었습니다. 초융합 운세는 1회 30,000원 결제로 이용할 수 있어요.", 410);
}

function text(value, max = 180) { return String(value || "").trim().slice(0, max); }
function objectIdOrString(value) { const normalized = text(value, 120); return mongoose.Types.ObjectId.isValid(normalized) ? new mongoose.Types.ObjectId(normalized) : normalized; }
function error(code, message, status = 400) { const value = new Error(message); value.code = code; value.status = status; return value; }
function randomId(prefix) { return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`; }
function paid(status) { return ["paid", "success", "fulfilled", "done", "completed"].includes(text(status, 40).toLowerCase()); }
function paymentAmount(payment) { return Number(payment?.amount || payment?.totalAmount || payment?.paidAmount || 0); }
function customer(user, userId) { return { customerId: text(userId, 120), fullName: text(user?.name || user?.fullName || user?.displayName || "Code Destiny 사용자", 80), email: text(user?.email, 160) || `buyer-${text(userId, 24).replace(/[^A-Za-z0-9]/g, "") || "user"}@code-destiny.com`, phoneNumber: text(user?.phoneNumber || user?.phone, 40) }; }

/**
 * 🔴 초융합 상담권 판매는 영구 중단됐다(2026-08-07).
 *
 * 초융합이 표준 회당 결제(fusion-fortune-consultation, 30,000원)로 옮겨가면서 워커가 티켓을
 * 더 이상 소비하지 않는다. env 플래그가 켜져 있어도 팔면 소비 불가능한 재화를 파는 셈이라
 * 플래그를 읽지 않고 false 로 고정한다.
 */
export function isFusionFortuneTicketSalesEnabled() { return false; }
export function getFusionFortuneTicketCatalog() { return []; }
export function isFusionFortuneTicketPaymentRecord(record) { return Boolean(record?.metadata?.fusionFortuneTicket === true) && record?.productId === FUSION_FORTUNE_TICKET_PRODUCT.productId && record?.metadata?.productType === FUSION_FORTUNE_TICKET_PRODUCT.productType; }

export async function getFusionFortuneTicketBalance(userId) {
  if (!text(userId)) return { remaining: 0, purchasedTotal: 0, usedTotal: 0, refundedTotal: 0 };
  const balance = await FusionFortuneTicketBalance.findOne({ userId: objectIdOrString(userId) }).lean();
  return { remaining: Math.max(0, Number(balance?.totalRemaining || 0)), purchasedTotal: Math.max(0, Number(balance?.purchasedTotal || 0)), usedTotal: Math.max(0, Number(balance?.usedTotal || 0)), refundedTotal: Math.max(0, Number(balance?.refundedTotal || 0)) };
}

export async function createFusionFortuneTicketOrder({ env = {}, userId, body = {}, requestUrl = "", paymentModel = Payment, userModel = User } = {}) {
  const user = text(userId, 120); if (!user) throw error("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  if (body.productId !== FUSION_FORTUNE_TICKET_PRODUCT.productId || body.productType !== FUSION_FORTUNE_TICKET_PRODUCT.productType || (body.amount !== undefined && Number(body.amount) !== FUSION_FORTUNE_TICKET_PRODUCT.priceKRW)) throw error("FUSION_FORTUNE_PRODUCT_MISMATCH", "초융합 운세 상담권 상품 또는 가격이 일치하지 않습니다.");
  assertFusionFortuneTicketPurchaseAllowed(body.paymentMethod || body.paymentMode || "pg");
  const config = getPortOnePublicConfig(env); if (!config.configured) throw error("PORTONE_V2_CONFIG_MISSING", "PG 결제 설정을 확인할 수 없습니다.", 503);
  const idempotencyKey = text(body.idempotencyKey, 180) || randomId("fusion-ticket-key");
  const existing = await paymentModel.findOne({ userId: objectIdOrString(user), idempotencyKey, paymentType: "digital_content" }).sort({ createdAt: -1 }).lean();
  if (existing) {
    if (!isFusionFortuneTicketPaymentRecord(existing) || Number(existing.paymentAmount) !== FUSION_FORTUNE_TICKET_PRODUCT.priceKRW) throw error("IDEMPOTENCY_CONFLICT", "같은 결제 키가 다른 상품에 사용되었습니다.", 409);
    return { ok: true, idempotent: true, order: { merchantUid: existing.merchantUid, product: FUSION_FORTUNE_TICKET_PRODUCT, paymentMethod: "pg", customer: customer(await userModel.findById(user).lean(), user), redirectUrl: `${new URL(requestUrl || "https://code-destiny.com").origin}/points?fusion_fortune_payment=1&merchantUid=${encodeURIComponent(existing.merchantUid)}` } };
  }
  const merchantUid = randomId("fusion-ticket"); const userRecord = await userModel.findById(user).select("name email phone phoneNumber fullName displayName").lean();
  await paymentModel.create({ userId: objectIdOrString(user), merchantUid, idempotencyKey, paymentAmount: FUSION_FORTUNE_TICKET_PRODUCT.priceKRW, expectedChargedPoints: 0, chargedPoints: 0, featureKey: "fusion-fortune", productId: FUSION_FORTUNE_TICKET_PRODUCT.productId, coinPrice: 0, membershipCreditCost: 0, accessType: "single_purchase", paymentMethod: "pg", status: "pending", orderState: "PENDING", source: "fusion_fortune_prepare", paymentType: "digital_content", subscriptionTier: "", pricingSnapshot: { productId: FUSION_FORTUNE_TICKET_PRODUCT.productId, productType: FUSION_FORTUNE_TICKET_PRODUCT.productType, ticketAmount: 1, amountKRW: 10000, currency: "KRW", paymentChannel: "pg" }, metadata: { fusionFortuneTicket: true, productType: FUSION_FORTUNE_TICKET_PRODUCT.productType } });
  return { ok: true, idempotent: false, order: { merchantUid, product: FUSION_FORTUNE_TICKET_PRODUCT, paymentMethod: "pg", customer: customer(userRecord, user), redirectUrl: `${new URL(requestUrl || "https://code-destiny.com").origin}/points?fusion_fortune_payment=1&merchantUid=${encodeURIComponent(merchantUid)}` } };
}

export async function grantFusionFortuneTicketPurchase({ userId, paymentId, now = new Date() } = {}) {
  const user = text(userId, 120); const payment = text(paymentId, 160); if (!user || !payment) throw error("FUSION_FORTUNE_GRANT_INVALID", "이용권 적립 정보가 부족합니다.");
  const session = await mongoose.startSession(); let result;
  try {
    await session.withTransaction(async () => {
      const existing = await FusionFortuneTicketTransaction.findOne({ paymentId: payment, type: "purchase" }).session(session).lean();
      if (existing) { result = { ok: true, idempotent: true, balanceAfter: Number(existing.balanceAfter || 0) }; return; }
      const current = await FusionFortuneTicketBalance.findOne({ userId: objectIdOrString(user) }).session(session).lean(); const before = Math.max(0, Number(current?.totalRemaining || 0));
      const updated = await FusionFortuneTicketBalance.findOneAndUpdate({ userId: objectIdOrString(user) }, { $inc: { totalRemaining: 1, purchasedTotal: 1 }, $set: { updatedAt: now } }, { upsert: true, new: true, session, setDefaultsOnInsert: true }).lean();
      const after = Math.max(0, Number(updated?.totalRemaining || 0)); await FusionFortuneTicketTransaction.create([{ userId: objectIdOrString(user), type: "purchase", amount: 1, balanceAfter: after, productId: FUSION_FORTUNE_TICKET_PRODUCT.productId, paymentId: payment, reason: "fusion_fortune_ticket_purchase" }], { session }); result = { ok: true, idempotent: false, balanceAfter: after, beforeBalance: before };
    }); return result;
  } catch (cause) { if (Number(cause?.code) === 11000) { const existing = await FusionFortuneTicketTransaction.findOne({ paymentId: payment, type: "purchase" }).lean(); if (existing) return { ok: true, idempotent: true, balanceAfter: Number(existing.balanceAfter || 0) }; } throw cause; } finally { await session.endSession(); }
}

export async function settleFusionFortuneTicketPayment({ env = {}, paymentId, providerPaymentId = paymentId, userId, paymentModel = Payment, fetchPayment = fetchPortOnePayment, now = new Date() } = {}) {
  const merchantUid = text(paymentId, 160); if (!merchantUid) throw error("PAYMENT_ID_REQUIRED", "paymentId가 필요합니다.");
  const order = await paymentModel.findOne({ merchantUid, paymentType: "digital_content", accessType: "single_purchase" }).lean();
  if (!order || !isFusionFortuneTicketPaymentRecord(order)) throw error("FUSION_FORTUNE_ORDER_NOT_FOUND", "초융합 운세 상담권 주문을 찾을 수 없습니다.", 404);
  if (text(userId) && String(order.userId) !== String(userId)) throw error("FORBIDDEN", "결제 주문에 접근할 수 없습니다.", 403);
  const provider = await fetchPayment(env, text(providerPaymentId, 160) || merchantUid);
  if (!paid(provider?.status) || paymentAmount(provider) !== 10000 || !["krw", "currency_krw"].includes(text(provider?.currency, 30).toLowerCase())) throw error("FUSION_FORTUNE_PAYMENT_MISMATCH", "결제 상태, 통화 또는 금액이 상품과 일치하지 않습니다.");
  const granted = await grantFusionFortuneTicketPurchase({ userId: String(order.userId), paymentId: merchantUid, now });
  const payment = await paymentModel.findOneAndUpdate({ _id: order._id }, { $set: { impUid: text(providerPaymentId, 160) || merchantUid, status: "success", orderState: "UNLOCKED", paidAt: now, paymentMethod: "pg", source: "fusion_fortune_confirm" }, $inc: { confirmAttempts: 1 } }, { new: true }).lean();
  return { ok: true, idempotent: granted.idempotent, product: FUSION_FORTUNE_TICKET_PRODUCT, payment, balanceAfter: granted.balanceAfter };
}
