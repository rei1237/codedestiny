import { mongoose } from "./db.js";
import {
  GuardianFortuneChatCreditBalance,
  GuardianFortuneChatCreditTransaction,
  Payment,
  User,
} from "./models.js";
import { fetchPortOnePayment, getPortOnePublicConfig } from "./portone.js";

export const GUARDIAN_FORTUNE_CREDIT_PRODUCT_TYPE = "guardian_fortune_conversation_credit";
export const GUARDIAN_FORTUNE_CREDIT_FEATURE_KEY = "guardian_fortune_conversation_credit";
export const GUARDIAN_FORTUNE_CREDIT_SALES_FLAG = "ENABLE_GUARDIAN_FORTUNE_CREDITS";

const BLOCKED_PURCHASE_CHANNELS = Object.freeze([
  "monthly_membership_payment",
  "pass",
  "family_pass",
  "free_pass",
  "event_pass",
  "credit",
  "conversation_credit",
  "entitlement",
  "price_coverage",
]);

const PRODUCTS = Object.freeze([
  Object.freeze({
    productId: "guardian_fortune_chat_3",
    productName: "달빛 귀인 대화권 3회",
    productType: GUARDIAN_FORTUNE_CREDIT_PRODUCT_TYPE,
    priceKrw: 10000,
    creditAmount: 3,
    badge: "가볍게 더 보기",
    description: "오늘 더 묻고 싶은 흐름이 있다면, 연이와 네오에게 3번 더 물어볼 수 있어요.",
    allowedPurchaseChannels: ["pg"],
    blockedPurchaseChannels: BLOCKED_PURCHASE_CHANNELS,
  }),
  Object.freeze({
    productId: "guardian_fortune_chat_10",
    productName: "달빛 귀인 대화권 10회",
    productType: GUARDIAN_FORTUNE_CREDIT_PRODUCT_TYPE,
    priceKrw: 30000,
    creditAmount: 10,
    badge: "가장 합리적",
    description: "연애, 일, 마음, 선택까지 여러 흐름을 천천히 보고 싶은 분께 좋아요.",
    allowedPurchaseChannels: ["pg"],
    blockedPurchaseChannels: BLOCKED_PURCHASE_CHANNELS,
  }),
]);

function text(value, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizedChannel(value) {
  const raw = text(value, 60).toLowerCase().replace(/[\s-]+/g, "_");
  if (["", "card", "direct", "direct_krw", "portone", "inicis", "pg"].includes(raw)) return "pg";
  return raw;
}

function policyError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizedUserId(value) {
  return text(value, 120);
}

function objectIdOrString(value) {
  const normalized = normalizedUserId(value);
  if (mongoose.Types.ObjectId.isValid(normalized)) return new mongoose.Types.ObjectId(normalized);
  return normalized;
}

function createRandomId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}_${uuid.replace(/-/g, "")}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 16)}`;
}

function isSalesFlagEnabled(env = {}) {
  const value = env?.[GUARDIAN_FORTUNE_CREDIT_SALES_FLAG];
  return value === true || String(value || "").trim().toLowerCase() === "true";
}

/**
 * 🔴 대화권 판매는 영구 중단됐다(2026-08-07).
 *
 * 연이 운명 상담이 표준 회당 결제(fortune-chat-consultation, 5,000원)로 옮겨가면서 워커가
 * 대화권을 더 이상 소비하지 않는다. env 플래그가 켜져 있어도 팔면 안 되는 이유가 이것이다 —
 * 사용자가 소비 불가능한 재화에 돈을 낸다. 잔액/조회 경로는 삭제 마이그레이션 전까지만 남는다.
 */
export function isGuardianFortuneCreditSalesEnabled() {
  return false;
}

export function listGuardianFortuneCreditProducts() {
  return PRODUCTS.map(clone);
}

export function getGuardianFortuneCreditProduct(productId) {
  const product = PRODUCTS.find((item) => item.productId === text(productId, 120));
  return product ? clone(product) : null;
}

export function isGuardianFortuneConversationCreditProduct(productOrId) {
  const product = typeof productOrId === "object"
    ? productOrId
    : getGuardianFortuneCreditProduct(productOrId);
  return Boolean(product && product.productType === GUARDIAN_FORTUNE_CREDIT_PRODUCT_TYPE);
}

export function assertGuardianFortuneCreditPurchaseAllowed(channel, productId = "") {
  const normalized = normalizedChannel(channel);
  const product = productId ? getGuardianFortuneCreditProduct(productId) : null;
  if (productId && !product) {
    throw policyError("GUARDIAN_FORTUNE_PRODUCT_NOT_FOUND", "대화권 상품을 확인할 수 없습니다.", 400);
  }
  if (normalized !== "pg") {
    throw policyError(
      "GUARDIAN_FORTUNE_PURCHASE_CHANNEL_BLOCKED",
      "대화권은 PG사 단건 결제로만 구매할 수 있어요. 보유 이용권이나 월정석 크레딧은 구매 수단으로 사용할 수 없습니다.",
      403,
    );
  }
  return { channel: normalized, product };
}

export function assertGuardianFortuneCreditProduct({ productId, productType, amount } = {}) {
  const product = getGuardianFortuneCreditProduct(productId);
  if (!product) throw policyError("GUARDIAN_FORTUNE_PRODUCT_NOT_FOUND", "대화권 상품을 확인할 수 없습니다.", 400);
  if (productType !== undefined && text(productType, 120) !== product.productType) {
    throw policyError("GUARDIAN_FORTUNE_PRODUCT_TYPE_MISMATCH", "대화권 상품 유형이 일치하지 않습니다.", 400);
  }
  if (amount !== undefined && amount !== null && amount !== "" && number(amount) !== product.priceKrw) {
    throw policyError("GUARDIAN_FORTUNE_PRICE_MISMATCH", "상품 가격이 일치하지 않습니다.", 400);
  }
  return product;
}

function buildCustomer(user, userId, paymentId) {
  const email = text(user?.email, 160);
  const phone = text(user?.phoneNumber || user?.phone, 40);
  return {
    customerId: normalizedUserId(userId),
    fullName: text(user?.name || user?.fullName || user?.displayName || "Code Destiny 사용자", 80),
    email: email || `buyer-${text(userId, 24).replace(/[^A-Za-z0-9]/g, "") || "user"}@code-destiny.com`,
    phoneNumber: phone,
    paymentId,
  };
}

function buildRedirectUrl(requestUrl, merchantUid) {
  try {
    const url = new URL(requestUrl || "https://code-destiny.com/points");
    url.pathname = "/points";
    url.search = "";
    url.searchParams.set("guardian_fortune_payment", "1");
    url.searchParams.set("merchantUid", merchantUid);
    return url.toString();
  } catch {
    return `https://code-destiny.com/points?guardian_fortune_payment=1&merchantUid=${encodeURIComponent(merchantUid)}`;
  }
}

function buildOrderResponse({ product, paymentId, paymentMethod, requestUrl, customer }) {
  return {
    merchantUid: paymentId,
    paymentId,
    paymentAmount: product.priceKrw,
    productId: product.productId,
    productName: product.productName,
    productType: product.productType,
    creditAmount: product.creditAmount,
    paymentMethod,
    redirectUrl: buildRedirectUrl(requestUrl, paymentId),
    customer,
  };
}

export async function createGuardianFortuneCreditOrder({
  env = {},
  userId,
  body = {},
  requestUrl = "",
  paymentModel = Payment,
  userModel = User,
  now = new Date(),
} = {}) {
  const normalizedUser = normalizedUserId(userId);
  if (!normalizedUser) throw policyError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  const product = assertGuardianFortuneCreditProduct({
    productId: body.productId,
    productType: body.productType,
    amount: body.amount,
  });
  const { channel } = assertGuardianFortuneCreditPurchaseAllowed(body.paymentMethod || body.paymentMode || "pg", product.productId);
  const config = getPortOnePublicConfig(env);
  if (!config.configured) throw policyError("PORTONE_V2_CONFIG_MISSING", "PG 결제 설정이 준비되지 않았습니다.", 503);

  const idempotencyKey = text(body.idempotencyKey || createRandomId("gfk"), 180);
  const existing = await paymentModel.findOne({
    userId: objectIdOrString(normalizedUser),
    idempotencyKey,
    paymentType: "digital_content",
  }).sort({ createdAt: -1 }).lean();
  if (existing) {
    const existingProduct = getGuardianFortuneCreditProduct(existing.productId);
    if (!existingProduct || existingProduct.productId !== product.productId || Number(existing.paymentAmount) !== product.priceKrw) {
      throw policyError("IDEMPOTENCY_CONFLICT", "이미 사용된 결제 키의 상품이 일치하지 않습니다.", 409);
    }
    const user = await userModel.findById(normalizedUser).select("name email phone phoneNumber fullName displayName").lean();
    return { ok: true, idempotent: true, order: buildOrderResponse({ product, paymentId: existing.merchantUid, paymentMethod: channel, requestUrl, customer: buildCustomer(user, normalizedUser, existing.merchantUid) }) };
  }

  const paymentId = createRandomId("gfpay");
  const user = await userModel.findById(normalizedUser).select("name email phone phoneNumber fullName displayName").lean();
  await paymentModel.create({
    userId: objectIdOrString(normalizedUser),
    merchantUid: paymentId,
    idempotencyKey,
    paymentAmount: product.priceKrw,
    expectedChargedPoints: 0,
    chargedPoints: 0,
    featureKey: GUARDIAN_FORTUNE_CREDIT_FEATURE_KEY,
    productId: product.productId,
    coinPrice: 0,
    membershipCreditCost: 0,
    accessType: "single_purchase",
    pricingSnapshot: {
      productId: product.productId,
      productType: product.productType,
      creditAmount: product.creditAmount,
      amountKRW: product.priceKrw,
      currency: "KRW",
      paymentChannel: channel,
      source: "guardian_fortune_credit_catalog",
    },
    metadata: {
      guardianFortuneCredit: true,
      productType: product.productType,
      creditAmount: product.creditAmount,
      preparedAt: now.toISOString(),
    },
    paymentMethod: channel,
    status: "pending",
    orderState: "PENDING",
    source: "prepare",
    paymentType: "digital_content",
    subscriptionTier: "",
  });

  return {
    ok: true,
    idempotent: false,
    order: buildOrderResponse({ product, paymentId, paymentMethod: channel, requestUrl, customer: buildCustomer(user, normalizedUser, paymentId) }),
  };
}

function isPaidStatus(status) {
  return ["paid", "success", "fulfilled", "done", "completed"].includes(text(status, 40).toLowerCase());
}

function isKrw(currency) {
  return ["krw", "currency_krw"].includes(text(currency, 32).toLowerCase());
}

function normalizedProviderAmount(payment) {
  return number(payment?.amount || payment?.totalAmount || payment?.paidAmount);
}

function paymentRecordIsGuardian(record) {
  return Boolean(record?.metadata?.guardianFortuneCredit === true)
    && isGuardianFortuneConversationCreditProduct(record.productId);
}

export function isGuardianFortuneCreditPaymentRecord(record) {
  return paymentRecordIsGuardian(record);
}

export function createMemoryGuardianFortunePurchaseStore(seed = {}) {
  const balances = new Map(Object.entries(seed.balances || {}).map(([key, value]) => [key, { ...value }]));
  const transactions = Array.isArray(seed.transactions) ? seed.transactions.map(clone) : [];
  return { balances, transactions };
}

export async function grantGuardianFortunePurchase({
  userId,
  productId,
  paymentId,
  store,
  now = new Date(),
} = {}) {
  const user = normalizedUserId(userId);
  const payment = text(paymentId, 160);
  const product = assertGuardianFortuneCreditProduct({ productId });
  if (!user || !payment) throw policyError("GUARDIAN_FORTUNE_GRANT_INPUT_INVALID", "대화권 적립 정보가 부족합니다.", 400);

  if (store) {
    const existing = store.transactions.find((item) => item.type === "purchase" && item.paymentId === payment);
    if (existing) {
      if (existing.productId !== product.productId) throw policyError("GUARDIAN_FORTUNE_PAYMENT_PRODUCT_MISMATCH", "결제 상품이 일치하지 않습니다.", 409);
      return { ok: true, idempotent: true, balanceAfter: Number(existing.balanceAfter || 0), transaction: existing };
    }
    const current = store.balances.get(user) || { remaining: 0, purchasedTotal: 0, usedTotal: 0, refundedTotal: 0 };
    const before = Math.max(0, Math.floor(Number(current.remaining || 0)));
    const after = before + product.creditAmount;
    const updated = { ...current, remaining: after, purchasedTotal: Math.max(0, Number(current.purchasedTotal || 0)) + product.creditAmount };
    const transaction = { userId: user, type: "purchase", amount: product.creditAmount, beforeBalance: before, afterBalance: after, balanceAfter: after, productId: product.productId, paymentId: payment, reason: "guardian_fortune_credit_purchase", createdAt: now.toISOString() };
    store.balances.set(user, updated);
    store.transactions.push(transaction);
    return { ok: true, idempotent: false, balanceAfter: after, transaction };
  }

  const session = await mongoose.startSession();
  let result = null;
  try {
    await session.withTransaction(async () => {
      const existing = await GuardianFortuneChatCreditTransaction.findOne({ paymentId: payment, type: "purchase" }).session(session).lean();
      if (existing) {
        if (existing.productId !== product.productId) throw policyError("GUARDIAN_FORTUNE_PAYMENT_PRODUCT_MISMATCH", "결제 상품이 일치하지 않습니다.", 409);
        result = { ok: true, idempotent: true, balanceAfter: Number(existing.balanceAfter || 0), transaction: existing };
        return;
      }
      const current = await GuardianFortuneChatCreditBalance.findOne({ userId: objectIdOrString(user) }).session(session).lean();
      const before = Math.max(0, Math.floor(Number(current?.remaining || 0)));
      const updated = await GuardianFortuneChatCreditBalance.findOneAndUpdate(
        { userId: objectIdOrString(user) },
        { $inc: { remaining: product.creditAmount, purchasedTotal: product.creditAmount }, $set: { updatedAt: now } },
        { upsert: true, new: true, setDefaultsOnInsert: true, session },
      ).session(session).lean();
      const after = Math.max(0, Math.floor(Number(updated?.remaining || 0)));
      const [transaction] = await GuardianFortuneChatCreditTransaction.create([{
        userId: objectIdOrString(user),
        type: "purchase",
        amount: product.creditAmount,
        beforeBalance: before,
        afterBalance: after,
        balanceAfter: after,
        productId: product.productId,
        paymentId: payment,
        reason: "guardian_fortune_credit_purchase",
      }], { session });
      result = { ok: true, idempotent: false, balanceAfter: after, transaction };
    });
    return result;
  } catch (error) {
    if (Number(error?.code) === 11000) {
      const existing = await GuardianFortuneChatCreditTransaction.findOne({ paymentId: payment, type: "purchase" }).lean();
      if (existing && existing.productId === product.productId) return { ok: true, idempotent: true, balanceAfter: Number(existing.balanceAfter || 0), transaction: existing };
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function getGuardianFortuneCreditBalance(userId, { store } = {}) {
  const user = normalizedUserId(userId);
  if (!user) return { remaining: 0, purchasedTotal: 0, usedTotal: 0, refundedTotal: 0 };
  if (store) {
    const balance = store.balances.get(user) || {};
    return { remaining: Math.max(0, Number(balance.remaining || 0)), purchasedTotal: Math.max(0, Number(balance.purchasedTotal || 0)), usedTotal: Math.max(0, Number(balance.usedTotal || 0)), refundedTotal: Math.max(0, Number(balance.refundedTotal || 0)) };
  }
  const balance = await GuardianFortuneChatCreditBalance.findOne({ userId: objectIdOrString(user) }).lean();
  return { remaining: Math.max(0, Number(balance?.remaining || 0)), purchasedTotal: Math.max(0, Number(balance?.purchasedTotal || 0)), usedTotal: Math.max(0, Number(balance?.usedTotal || 0)), refundedTotal: Math.max(0, Number(balance?.refundedTotal || 0)) };
}

export async function settleGuardianFortunePayment({
  env = {},
  paymentId,
  providerPaymentId = paymentId,
  userId,
  source = "confirm",
  paymentModel = Payment,
  fetchPayment = fetchPortOnePayment,
  grant = grantGuardianFortunePurchase,
  now = new Date(),
} = {}) {
  const requestedPaymentId = text(paymentId, 160);
  const requestedProviderPaymentId = text(providerPaymentId, 160) || requestedPaymentId;
  if (!requestedPaymentId) throw policyError("PAYMENT_ID_REQUIRED", "paymentId가 필요합니다.", 400);
  const query = { merchantUid: requestedPaymentId, paymentType: "digital_content", accessType: "single_purchase" };
  const order = await paymentModel.findOne(query).lean();
  if (!order || !paymentRecordIsGuardian(order)) throw policyError("GUARDIAN_FORTUNE_ORDER_NOT_FOUND", "대화권 결제 주문을 찾을 수 없습니다.", 404);
  if (userId && String(order.userId) !== String(userId)) throw policyError("FORBIDDEN", "결제 주문에 접근할 수 없습니다.", 403);

  const product = assertGuardianFortuneCreditProduct({ productId: order.productId, amount: order.paymentAmount });
  const providerPayment = await fetchPayment(env, requestedProviderPaymentId);
  if (!isPaidStatus(providerPayment?.status)) {
    await paymentModel.updateOne({ _id: order._id }, { $set: { status: "failed", orderState: "FAILED", source, failureCode: "guardian_fortune_payment_not_paid" }, $inc: { confirmAttempts: 1 } });
    throw policyError("GUARDIAN_FORTUNE_PAYMENT_NOT_PAID", "결제가 완료되지 않았습니다.", 400);
  }
  if (normalizedProviderAmount(providerPayment) !== product.priceKrw || !isKrw(providerPayment?.currency)) {
    await paymentModel.updateOne({ _id: order._id }, { $set: { status: "failed", orderState: "VERIFY_FAILED", source, failureCode: "guardian_fortune_payment_mismatch" }, $inc: { confirmAttempts: 1 } });
    throw policyError("GUARDIAN_FORTUNE_PAYMENT_MISMATCH", "결제 금액 또는 통화가 상품과 일치하지 않습니다.", 400);
  }

  const granted = await grant({ userId: String(order.userId), productId: product.productId, paymentId: requestedPaymentId, now });
  const paidAt = providerPayment?.paid_at ? new Date(Number(providerPayment.paid_at) * 1000) : now;
  const updated = await paymentModel.findOneAndUpdate(
    { _id: order._id },
    { $set: { impUid: requestedProviderPaymentId, status: "success", orderState: "UNLOCKED", paidAt, source, paymentMethod: "pg" }, $inc: { confirmAttempts: 1 } },
    { new: true },
  ).lean();
  return { ok: true, idempotent: Boolean(granted.idempotent), payment: updated, product, balanceAfter: granted.balanceAfter, transaction: granted.transaction };
}

export function buildGuardianFortunePurchasePolicySummary() {
  return {
    productType: GUARDIAN_FORTUNE_CREDIT_PRODUCT_TYPE,
    allowedPurchaseChannels: ["pg"],
    blockedPurchaseChannels: [...BLOCKED_PURCHASE_CHANNELS],
    monthlyMembershipPayment: "disabled_until_separate_monetary_flow_exists",
  };
}
