// 나크샤트라 결정판 전문가 심화 상담 — 결제·생성 라우트 (2덱: 숙요/베다)
//
//   POST /api/nakshatra-ai/ensure-access : 이용권 선검사 → 커버 시 accessToken, 미커버 시 402(결제창)
//   POST /api/nakshatra-ai/start         : 결제/이용권 확정 → 동기 생성(숙요+베다 두 덱) → 완료 결과
//   GET  /api/nakshatra-ai/result        : 폴백 폴링(연결 끊김 시 결과 조회)
//
// 결제·과금·환불·멱등 계약은 네오 작전실(neo-operation-room.js)의 검증된 헬퍼를 거의 그대로 복사한다
// (상수·모델만 교체). 나크샤트라는 refine·method선택·주제·강도가 없어 더 린하다 — 항상 숙요+베다 두 덱을 생성한다.
// ⚠ 생성은 반드시 '동기'(waitUntil 금지). 비동기 전환은 Workers 요청 간 I/O 격리와 충돌해 결과가 'generating'에
// 고착됐던 이력이 있다(네오와 동일 결론). 계산 검증은 포그라운드에서 먼저 끝낸다.

import { createHash } from "node:crypto";
import { Solar } from "lunar-javascript";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, isTransientMongoError, mongoose, withMongoRetry } from "../lib/db.js";
import {
  MonthlyCreditLedger,
  NakshatraAiConsultation,
  PaidExecutionRecord,
  Payment,
  PointHistory,
  User,
} from "../lib/models.js";
import { consumeMonthlyCreditLots } from "../lib/monthly-credit-store.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canAccessPaidFeature, PAID_FEATURE_ACCESS_USER_PROJECTION } from "../lib/paid-feature-access.js";
import { callGeminiText } from "../lib/gemini.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import {
  completeServiceExecution,
  failServiceExecution,
  startServiceExecution,
} from "../lib/service-execution-task.js";
import { getSwissVedicPlanets } from "../lib/swiss-ephemeris.js";
import { assembleNatalCodex } from "../lib/nakshatra-codex.js";
import {
  NAKSHATRA_SECTIONS,
  buildSectionPrompt,
  buildFactContext,
  parseSectionResponse,
  mergeConsultationSections,
  hasForbiddenResultText,
} from "../lib/nakshatra-ai-prompt.js";

const SERVICE_KEY = "nakshatra-ai";
const FEATURE_KEY = "nakshatra-ai-consultation";
const ACCESS_TOKEN_TYPE = "nakshatra-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ACCESS_TOKEN_HEADER = "x-nakshatra-ai-access-token";
// 동기 생성(11챕터)이 완주하는 최악 시간을 덮는 신선도 창. 이 창 안의 재-POST는 2차 생성을 기동하지 않고
// 202로 흡수돼 이중 작업/이중 과금을 막는다.
const GENERATION_FRESHNESS_MS = 300000;
const TITLE = "나크샤트라 결정판 전문가 심화 상담";
const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요해요. 로그인 후 다시 시도해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제나 이용권 확인이 아직 끝나지 않았어요. 권한을 확인한 뒤 다시 시도해 주세요.";
const INVALID_INPUT_MESSAGE = "생년월일 정보가 올바르지 않아요. 입력값을 확인하고 다시 시도해 주세요.";
const CALCULATION_ERROR_MESSAGE = "별자리 계산 중 문제가 생겼어요. 입력값을 확인하고 다시 시도해 주세요.";
const LLM_ERROR_MESSAGE = "상담문 작성에 실패했어요. 이용권이나 결제 권한은 보존되니 잠시 후 다시 시도해 주세요.";
const SERVER_ERROR_MESSAGE = "상담실을 여는 중 문제가 생겼어요. 결제 금액은 차감하지 않았어요.";
const RESULT_NOT_FOUND_MESSAGE = "저장된 상담을 찾지 못했어요.";
const SECTION_CONCURRENCY = 4;

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function sha256(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function readIdempotencyKey(request, body = {}) {
  return clean(body.idempotencyKey || body.attemptId || body.requestId || request.headers.get("Idempotency-Key"), 180);
}

// ── 입력 정규화 — 나크샤트라는 수치 생년월일(+출생지) + 선택 질문 ────────────────────────
function normalizeBirthInput(source = {}) {
  const src = asObject(source.birthInput || source.birthInfo || source.birth || source);
  const timeUnknown = Boolean(src.timeUnknown === true || src.timeUnknown === "true" || src.birthTimeUnknown === true);
  const gender = clean(src.gender).toLowerCase();
  return {
    year: Math.trunc(Number(src.year)),
    month: Math.trunc(Number(src.month)),
    day: Math.trunc(Number(src.day)),
    hour: timeUnknown ? 12 : Math.trunc(Number(src.hour ?? 12)),
    minute: timeUnknown ? 0 : Math.trunc(Number(src.minute ?? 0)),
    timezone: Number(src.timezone ?? 9),
    lat: Number(src.lat ?? src.latitude ?? 37.5665),
    lon: Number(src.lon ?? src.lng ?? src.longitude ?? 126.978),
    timeUnknown,
    gender: gender === "male" || gender === "female" ? gender : "",
  };
}

function isValidBirthInput(b) {
  return (
    Number.isInteger(b.year) && b.year >= 1900 && b.year <= 2100 &&
    Number.isInteger(b.month) && b.month >= 1 && b.month <= 12 &&
    Number.isInteger(b.day) && b.day >= 1 && b.day <= 31 &&
    Number.isFinite(b.hour) && b.hour >= 0 && b.hour <= 23 &&
    Number.isFinite(b.minute) && b.minute >= 0 && b.minute <= 59 &&
    Number.isFinite(b.timezone) && Number.isFinite(b.lat) && Number.isFinite(b.lon)
  );
}

function normalizeInput(body = {}) {
  const birthInfo = normalizeBirthInput(body);
  const question = clean(body.question || body.userQuestion, 1200);
  if (!isValidBirthInput(birthInfo)) return { ok: false, message: INVALID_INPUT_MESSAGE };
  const input = { birthInfo, question };
  return { ok: true, input, inputHash: sha256(stableJson(input)) };
}

function invalidInput(message = INVALID_INPUT_MESSAGE, status = 422) {
  return json({ ok: false, reason: "INVALID_INPUT", message }, { status });
}

function loginRequired() {
  return json({ ok: false, reason: "LOGIN_REQUIRED", message: LOGIN_REQUIRED_MESSAGE }, { status: 401 });
}

function serverError(message = SERVER_ERROR_MESSAGE, status = 500) {
  return json({ ok: false, reason: "SERVER_ERROR", message }, { status });
}

// ── 결제/과금/환불 헬퍼 — 네오 작전실 verbatim(상수·모델만 교체) ────────────────────────
function getPricing() {
  const result = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  const pricing = result?.pricing || null;
  const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 0);
  const amountKRW = Number(pricing?.amountKRW || pricing?.paymentAmount || coinPrice * 100);
  if (!result?.ok || !Number.isInteger(coinPrice) || coinPrice <= 0 || !Number.isInteger(amountKRW) || amountKRW <= 0) {
    const error = new Error("nakshatra ai price not found");
    error.code = "PRICE_NOT_FOUND";
    throw error;
  }
  return {
    pricing,
    coinPrice,
    amountKRW,
    membershipCreditCost: calculateMembershipCreditCost(coinPrice),
  };
}

function paymentRequired(pricing, idempotencyKey) {
  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    paymentPayload: {
      billingMode: "coin-gate",
      featureKey: FEATURE_KEY,
      serviceKey: SERVICE_KEY,
      serviceId: SERVICE_KEY,
      serviceType: FEATURE_KEY,
      categoryKey: "premium-consultation",
      subFeatureKey: FEATURE_KEY,
      contentId: FEATURE_KEY,
      contentType: SERVICE_KEY,
      title: TITLE,
      reason: TITLE,
      orderName: TITLE,
      cost: pricing.coinPrice,
      coinPrice: pricing.coinPrice,
      totalAmount: pricing.amountKRW,
      paymentAmount: pricing.amountKRW,
      amountKRW: pricing.amountKRW,
      amountKrw: pricing.amountKRW,
      currency: "KRW",
      membershipCreditCost: pricing.membershipCreditCost,
      requestId: idempotencyKey,
      idempotencyKey,
      checkoutEndpoint: "/api/billing/checkout",
      confirmEndpoint: "/api/billing/confirm",
      runtimeGate: {
        title: TITLE,
        reason: TITLE,
        featureKey: FEATURE_KEY,
        categoryKey: "premium-consultation",
        subFeatureKey: FEATURE_KEY,
        serviceKey: SERVICE_KEY,
        cost: pricing.coinPrice,
        coinPrice: pricing.coinPrice,
        totalAmount: pricing.amountKRW,
        paymentAmount: pricing.amountKRW,
        amountKRW: pricing.amountKRW,
        amountKrw: pricing.amountKRW,
        membershipCreditCost: pricing.membershipCreditCost,
        productId: SERVICE_KEY,
        productType: SERVICE_KEY,
        serviceType: FEATURE_KEY,
        allowedPaymentModes: ["direct", "monthly", "pass"],
        requestId: idempotencyKey,
        idempotencyKey,
      },
    },
  }, { status: 402 });
}

async function createAccessToken(env, payload) {
  return signJwt(
    {
      typ: ACCESS_TOKEN_TYPE,
      serviceKey: SERVICE_KEY,
      featureKey: FEATURE_KEY,
      ...payload,
    },
    getAccessTokenSecret(env),
    {
      expiresIn: ACCESS_TOKEN_TTL,
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    },
  );
}

async function verifyAccessToken(env, token) {
  const payload = await verifyJwt(token, getAccessTokenSecret(env), {
    issuer: getJwtIssuer(env),
    audience: getJwtAudience(env),
  });
  if (payload?.typ !== ACCESS_TOKEN_TYPE || payload?.serviceKey !== SERVICE_KEY || payload?.featureKey !== FEATURE_KEY) {
    const error = new Error("invalid access token");
    error.code = "INVALID_ACCESS_TOKEN";
    throw error;
  }
  return payload;
}

// 폴링(/result)에서 로그인 세션이 일시적으로 확인되지 않을 때, 헤더/쿼리의 액세스 토큰으로 신원을 폴백한다.
// 서명·TTL·serviceKey/featureKey가 검증된 토큰의 userId만 신뢰하며, 그 값으로 자기 세션만 조회한다(조회 전용).
async function resolveResultUserIdFromToken(request, env) {
  const url = new URL(request.url);
  const token = clean(
    request.headers.get(ACCESS_TOKEN_HEADER) || url.searchParams.get("accessToken"),
    2048,
  );
  if (!token) return "";
  try {
    const payload = await verifyAccessToken(env, token);
    const userId = clean(payload?.userId);
    return mongoose.Types.ObjectId.isValid(userId) ? userId : "";
  } catch (error) {
    return "";
  }
}

async function loadUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(String(userId || ""))) return null;
  return User.findById(userId)
    .select("role profileSubscription paidFeatures unlockedFeatures licenses monthlySubscription subscription membership membershipPass pass entitlement licensePass accessGateResult plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt")
    .lean();
}

function mapPaidFeatureAccessType(decision = {}) {
  const haystack = [
    decision.accessSource,
    decision.licenseType,
    decision.reason,
    decision.subscriptionStatus,
  ].map((item) => clean(item, 100).toLowerCase()).join(" ");
  if (/admin/.test(haystack)) return "admin";
  if (/monthly|subscription|membership_credit/.test(haystack)) return "subscription";
  if (/pass|family|license/.test(haystack)) return "pass";
  return "paid";
}

function isReusablePaidFeatureAccess(decision = {}) {
  if (!decision?.allowed) return false;
  const haystack = [
    decision.accessSource,
    decision.licenseType,
    decision.reason,
    decision.subscriptionStatus,
  ].map((item) => clean(item, 100).toLowerCase()).join(" ");
  if (/single_purchase|already_purchased|paidfeatures/.test(haystack)) return false;
  return /admin|monthly|subscription|membership_credit|license|pass|family/.test(haystack);
}

async function resolveEnsureAccess(env, auth, pricing, idempotencyKey, inputHash) {
  await connectDb(env);
  // 풀 초기화(MongoPoolClearedError) 순간에도 접근 판정 read가 1회 실패로 죽지 않도록 재시도.
  const existing = await withMongoRetry(env, () => NakshatraAiConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean());
  if (existing && clean(existing.inputHash) !== inputHash) {
    return { ok: false, reason: "INVALID_INPUT" };
  }
  if (existing?.status === "completed") {
    return { ok: true, accessType: clean(existing.accessType) || "paid", paymentId: clean(existing.paymentId, 160), existing };
  }
  if (existing?.status === "generating") {
    return { ok: true, accessType: clean(existing.accessType) || "paid", paymentId: clean(existing.paymentId, 160), existing };
  }
  // 인증 단계가 같은 문서를 이미 읽었으면 재조회하지 않는다(authUserDoc는 access-token 경로에만 붙으므로 폴백 유지).
  const user = auth.authUserDoc || await withMongoRetry(env, () => loadUser(auth.userId));
  if (!user) return { ok: false, reason: "LOGIN_REQUIRED" };
  if (clean(user.role).toLowerCase() === "admin" || clean(auth.role).toLowerCase() === "admin") {
    return { ok: true, accessType: "admin", paymentId: "" };
  }
  const decision = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env, reason: TITLE, userDoc: user });
  if (isReusablePaidFeatureAccess(decision)) {
    return {
      ok: true,
      accessType: mapPaidFeatureAccessType(decision),
      paymentId: "",
    };
  }
  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

function paymentIdFromBody(body = {}) {
  const billingGate = asObject(body.billingGate || body.billing || body.billingResult || body.paymentContext || body._paymentContext);
  const payment = asObject(body.payment || billingGate.payment);
  const accessGrant = asObject(body.accessGrant || billingGate.accessGrant || billingGate.accessGateResult);
  const consume = asObject(body.consume || billingGate.consume);
  return clean(
    body.paymentId
      || body.transactionId
      || body.purchaseId
      || body.ledgerId
      || body.executionId
      || body.impUid
      || body.merchantUid
      || billingGate.paymentId
      || billingGate.transactionId
      || billingGate.purchaseId
      || payment.paymentId
      || payment.impUid
      || payment.merchantUid
      || accessGrant.paymentId
      || accessGrant.purchaseId
      || accessGrant.transactionId
      || accessGrant.evidenceId
      || consume.paymentId
      || consume.purchaseId
      || consume.transactionId
      || consume.evidenceId,
    160,
  );
}

function billingContextFromBody(body = {}) {
  const billingGate = asObject(body.billingGate || body.billing || body.billingResult || body.paymentContext || body._paymentContext);
  const consume = asObject(body.consume || billingGate.consume);
  const accessGrant = asObject(body.accessGrant || billingGate.accessGrant || billingGate.accessGateResult);
  const payment = asObject(body.payment || billingGate.payment);
  const pricing = asObject(body.pricing || billingGate.pricing);
  return {
    billingGate,
    consume,
    accessGrant,
    payment,
    pricing,
    accessType: clean(consume.accessType || accessGrant.accessType || billingGate.accessType || body.accessType).toLowerCase(),
    accessMethod: clean(consume.accessMethod || consume.paymentMethod || accessGrant.accessMethod || accessGrant.paymentMethod || billingGate.accessMethod || billingGate.paymentMode || body.accessMethod || body.paymentMode).toUpperCase(),
    featureKey: clean(consume.featureKey || accessGrant.featureKey || payment.featureKey || pricing.featureKey || billingGate.featureKey || body.featureKey),
    requestId: clean(consume.requestId || accessGrant.requestId || payment.requestId || billingGate.requestId || body.requestId || body.idempotencyKey, 180),
    transactionId: clean(consume.transactionId || accessGrant.transactionId || billingGate.transactionId || body.transactionId, 160),
    ledgerId: clean(consume.ledgerId || accessGrant.ledgerId || billingGate.ledgerId || body.ledgerId, 160),
    paymentId: paymentIdFromBody(body),
  };
}

async function hasPaidPayment(auth, paymentId, idempotencyKey) {
  const clauses = [];
  if (paymentId) clauses.push({ impUid: paymentId }, { merchantUid: paymentId }, { requestId: paymentId }, { idempotencyKey: paymentId });
  if (idempotencyKey) clauses.push({ requestId: idempotencyKey }, { idempotencyKey });
  if (!clauses.length) return null;
  return Payment.findOne({
    userId: auth.userId,
    featureKey: FEATURE_KEY,
    paymentType: "digital_content",
    status: { $in: ["paid", "success", "fulfilled"] },
    $or: clauses,
  }).sort({ updatedAt: -1, paidAt: -1, createdAt: -1 }).lean();
}

async function hasMonthlyConsume(auth, ctx, idempotencyKey) {
  if (ctx.featureKey && ctx.featureKey !== FEATURE_KEY) return false;
  if (ctx.requestId && ctx.requestId !== idempotencyKey) return false;
  if (ctx.ledgerId && mongoose.Types.ObjectId.isValid(ctx.ledgerId)) {
    const ledger = await MonthlyCreditLedger.exists({
      _id: ctx.ledgerId,
      userId: auth.userId,
      type: "MONTHLY_CREDIT_SPEND",
      serviceKey: FEATURE_KEY,
    });
    if (ledger) return true;
  }
  if (ctx.transactionId && mongoose.Types.ObjectId.isValid(ctx.transactionId)) {
    const history = await PointHistory.exists({
      _id: ctx.transactionId,
      userId: auth.userId,
      kind: "deduct",
      featureKey: FEATURE_KEY,
      "metadata.accessType": "membership_credit",
    });
    if (history) return true;
  }
  return false;
}

async function resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey }) {
  await connectDb(env);
  const token = clean(body?.accessToken || request.headers.get(ACCESS_TOKEN_HEADER));
  if (token) {
    const payload = await verifyAccessToken(env, token);
    if (clean(payload.userId) !== clean(auth.userId) || clean(payload.idempotencyKey) !== idempotencyKey || clean(payload.inputHash) !== normalized.inputHash) {
      return { ok: false, reason: "INVALID_INPUT", message: INVALID_INPUT_MESSAGE };
    }
    return { ok: true, accessType: clean(payload.accessType), paymentId: clean(payload.paymentId, 160), source: "token" };
  }
  const ctx = billingContextFromBody(body);
  const paidPayment = await withMongoRetry(env, () => hasPaidPayment(auth, ctx.paymentId, idempotencyKey));
  if (paidPayment) {
    return {
      ok: true,
      accessType: "paid",
      paymentId: clean(paidPayment.merchantUid || paidPayment.impUid || ctx.paymentId, 160),
      source: "payment",
    };
  }
  if (ctx.accessType === "membership_credit" || ctx.accessMethod === "MONTHLY" || ctx.accessMethod === "MONTHLY_CREDIT" || ctx.accessMethod === "MOONLIGHT_STONE") {
    if (await withMongoRetry(env, () => hasMonthlyConsume(auth, ctx, idempotencyKey))) {
      return {
        ok: true,
        accessType: "subscription",
        paymentId: ctx.transactionId || ctx.ledgerId || idempotencyKey,
        source: "billing-gate",
        executionSourceTransactionId: ctx.transactionId,
        executionPayment: body.payment,
        billingContext: ctx,
      };
    }
  }
  if (ctx.accessType === "membership_pass" || ctx.accessType === "family" || ctx.accessMethod === "PASS" || ctx.accessMethod === "MEMBERSHIP_PASS" || ctx.accessMethod === "FAMILY_PASS") {
    if ((!ctx.featureKey || ctx.featureKey === FEATURE_KEY) && (!ctx.requestId || ctx.requestId === idempotencyKey)) {
      return {
        ok: true,
        accessType: "pass",
        paymentId: ctx.transactionId || ctx.paymentId || "",
        source: "billing-gate",
        executionSourceTransactionId: ctx.transactionId,
        executionPayment: body.payment,
        billingContext: ctx,
      };
    }
  }
  const user = await withMongoRetry(env, () => loadUser(auth.userId));
  if (!user) return { ok: false, reason: "LOGIN_REQUIRED" };
  if (clean(user.role).toLowerCase() === "admin") return { ok: true, accessType: "admin", paymentId: "", source: "server" };
  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

async function applyUsageOnce({ userId, sessionId, accessType, pricing, source }) {
  const existing = await NakshatraAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;
  if (source !== "billing-gate" && accessType === "subscription") {
    const sourceId = `${SERVICE_KEY}:${sessionId}`;
    const ledger = await MonthlyCreditLedger.findOne({ userId, type: "MONTHLY_CREDIT_SPEND", sourceId }).lean();
    if (!ledger) {
      // 월정석 지급분별(lot) FIFO 차감(만료분 제외) — 스칼라 직접 차감 대신 lot 회계로 통일.
      const consume = await consumeMonthlyCreditLots({ userId, amount: pricing.membershipCreditCost });
      if (!consume.ok) {
        const error = new Error("membership credit balance is insufficient");
        error.code = "MEMBERSHIP_CREDIT_CONSUME_FAILED";
        throw error;
      }
      const afterBalance = Math.max(0, Math.floor(Number(consume.balance || 0)));
      const beforeBalance = afterBalance + Math.max(0, Math.floor(Number(pricing.membershipCreditCost || 0)));
      await MonthlyCreditLedger.create({
        userId,
        type: "MONTHLY_CREDIT_SPEND",
        amount: pricing.membershipCreditCost,
        beforeBalance,
        afterBalance,
        reason: TITLE,
        sourceId,
        serviceKey: FEATURE_KEY,
        metadata: { featureKey: FEATURE_KEY, sessionId },
      }).catch((error) => {
        if (error?.code !== 11000) throw error;
      });
    }
  }
  await NakshatraAiConsultation.updateOne({ id: sessionId, usageAppliedAt: null }, { $set: { usageAppliedAt: new Date() } });
  return true;
}

function executionAccessMethod(accessType) {
  if (accessType === "paid") return "single";
  if (accessType === "subscription") return "monthly";
  if (accessType === "admin") return "admin";
  return "pass";
}

async function recordSuccessfulUsage(auth, idempotencyKey, access, sessionId, pricing) {
  const accessMethod = executionAccessMethod(access.accessType);
  await PaidExecutionRecord.findOneAndUpdate(
    {
      userId: String(auth.userId || ""),
      featureId: FEATURE_KEY,
      profileId: "default",
      requestId: idempotencyKey,
    },
    {
      $setOnInsert: {
        executionId: `${FEATURE_KEY}:${auth.userId}:${idempotencyKey}`.slice(0, 160),
        requestId: idempotencyKey,
        userId: String(auth.userId || ""),
        featureId: FEATURE_KEY,
        profileId: "default",
        accessMode: "per_use",
        accessMethod,
        amountCoins: accessMethod === "single" ? pricing.coinPrice : 0,
        amountKRW: accessMethod === "single" ? pricing.amountKRW : 0,
        monthlyDeductedAmount: accessMethod === "monthly" ? pricing.coinPrice : 0,
        paymentId: access.paymentId || "",
        orderId: access.paymentId || idempotencyKey,
        consumedAt: new Date(),
        idempotencyKey: `${FEATURE_KEY}:${auth.userId}:${idempotencyKey}`.slice(0, 180),
      },
      $set: {
        status: "completed",
        completedAt: new Date(),
        resultId: sessionId,
      },
    },
    { upsert: true, new: true },
  );
}

async function startRefundableExecution(env, auth, access, idempotencyKey, sessionId, pricing) {
  if (access.source !== "billing-gate" || !access.executionSourceTransactionId) return null;
  const result = await startServiceExecution(env, auth.userId, {
    executionKey: `${FEATURE_KEY}:${idempotencyKey}`,
    requestId: `${FEATURE_KEY}:${idempotencyKey}`,
    featureKey: FEATURE_KEY,
    cost: pricing.coinPrice,
    sourceTransactionId: access.executionSourceTransactionId,
    sessionId,
    payment: access.executionPayment,
    idempotencyKey,
    metadata: {
      serviceKey: SERVICE_KEY,
      featureKey: FEATURE_KEY,
      billing: access.billingContext || null,
    },
  }).catch((error) => {
    console.warn("[nakshatra-ai] execution guard start failed", { message: clean(error?.message || error, 300) });
    return null;
  });
  return result?.execution || null;
}

async function completeRefundableExecution(env, auth, idempotencyKey, sessionId) {
  await completeServiceExecution(env, auth.userId, {
    executionKey: `${FEATURE_KEY}:${idempotencyKey}`,
    requestId: `${FEATURE_KEY}:${idempotencyKey}`,
    sessionId,
    reportId: sessionId,
    metadata: { serviceKey: SERVICE_KEY, featureKey: FEATURE_KEY, sessionId },
  }).catch((error) => {
    console.warn("[nakshatra-ai] execution guard complete failed", { message: clean(error?.message || error, 300) });
  });
}

async function failRefundableExecution(env, auth, idempotencyKey, sessionId, error) {
  await failServiceExecution(env, auth.userId, {
    executionKey: `${FEATURE_KEY}:${idempotencyKey}`,
    requestId: `${FEATURE_KEY}:${idempotencyKey}`,
    sessionId,
    reportId: sessionId,
    reasonCode: clean(error?.code || "nakshatra_ai_generation_failed", 80),
    reasonMessage: clean(error?.message || LLM_ERROR_MESSAGE, 300),
    forceRefundOnClose: true,
  }).catch((refundError) => {
    console.error("[nakshatra-ai] execution guard refund failed", { message: clean(refundError?.message || refundError, 300) });
  });
}

function publicSession(doc) {
  const raw = typeof doc?.toObject === "function" ? doc.toObject() : doc;
  return {
    ok: true,
    id: clean(raw?.id || raw?._id),
    sessionId: clean(raw?.id || raw?._id),
    status: clean(raw?.status),
    accessType: clean(raw?.accessType),
    question: clean(raw?.question),
    // 결과 렌더에 필요한 필드만 노출 — 내부 근거 텍스트(summaryText)·codex 원본은 은닉.
    natal: raw?.factSummary?.identity || null,
    decks: raw?.decks || null,
    generationError: raw?.generationError || null,
    resultUrl: raw?.id ? `/nakshatra/ai/result?attemptId=${encodeURIComponent(raw.id)}` : "",
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

// ── 계산(근거) — LLM이 아니므로 포그라운드에서 즉시 검증(출생정보/차트 오류는 여기서 422) ────────
function birthUtcFromInput(input) {
  const utcMillis =
    Date.UTC(input.year, input.month - 1, input.day, 0, 0, 0, 0) +
    (input.hour + input.minute / 60 - input.timezone) * 3600000;
  return new Date(utcMillis);
}

function lunarFromInput(input) {
  const lunar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0).getLunar();
  // lunar-javascript: 윤달이면 getMonth()가 음수. 절댓값이 월, 음수면 윤달.
  const rawMonth = lunar.getMonth();
  return { month: Math.abs(rawMonth), day: lunar.getDay(), isLeap: rawMonth < 0 };
}

async function computeNatalFacts(env, normalized, request) {
  const input = normalized.input.birthInfo;
  const swiss = await getSwissVedicPlanets(env, input, { requestUrl: request.url });
  const moonLon = Number(swiss?.planets?.Moon);
  if (!Number.isFinite(moonLon)) {
    const error = new Error("moon longitude unavailable");
    error.code = "CHART_MOON_UNAVAILABLE";
    error.status = 422;
    throw error;
  }
  const lunar = lunarFromInput(input);
  const birthUtc = birthUtcFromInput(input);
  const codex = assembleNatalCodex({ moonLon, birthUtc, lunar, timeUnknown: input.timeUnknown, now: new Date() });
  const { summaryText, evidenceTokens } = buildFactContext(codex, normalized.input.question);
  const identity = {
    sukuyoKo: clean(codex?.dongyang?.nameKo),
    sukuyoHan: clean(codex?.dongyang?.nameHan),
    nakshatraKo: clean(codex?.india?.nameKo),
    nakshatraEn: clean(codex?.india?.nameEn),
  };
  return { summaryText, evidenceTokens, identity };
}

// ── 동기 생성 — 숙요+베다 두 덱(11챕터). ziwei-deep-report/네오 동시성 패턴 재사용 ──────────
async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function runner() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, () => runner());
  await Promise.all(runners);
  return results;
}

function countTextChars(value) {
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countTextChars(item), 0);
  if (value && typeof value === "object") return Object.values(value).reduce((sum, item) => sum + countTextChars(item), 0);
  return 0;
}

// 챕터 하나 생성 → { id, body, provider, model, ok }. 실패해도 body=""로 폴백(전체 실패 방지).
// 잘림(MAX_TOKENS)이나 빈 파싱이면 캐시를 우회해 1회 재시도한다(잘린 문장이 결과에 남는 것 방지).
async function generateSectionOnce(env, section, prompt, cacheConfig) {
  try {
    let ai = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const useCache = attempt === 0 && cacheConfig;
      ai = await callGeminiText(env, prompt, {
        maxOutputTokens: 8192,
        temperature: 0.65,
        thinkingBudget: 0,
        timeoutMs: 45000,
        ...(useCache ? { cache: cacheConfig } : {}),
      });
      const needsRetry = ai?.ok && (ai.truncated === true || !parseSectionResponse(ai.text).body);
      if (!needsRetry) break;
    }
    const provider = clean(ai?.provider || "");
    const model = clean(ai?.model || "");
    const isMock = /mock/i.test(provider) || /mock/i.test(model) || ai?.isMock === true;
    if (!ai?.ok || isMock || clean(ai?.text).length < 40) {
      return { id: section.id, body: "", provider, model, ok: false };
    }
    const parsed = parseSectionResponse(ai.text);
    if (!parsed.body || hasForbiddenResultText(parsed)) {
      return { id: section.id, body: "", provider, model, ok: false };
    }
    return { id: section.id, body: parsed.body, provider, model, ok: true };
  } catch (error) {
    return { id: section.id, body: "", provider: "", model: "", ok: false, error: clean(error?.message, 120) };
  }
}

async function generateConsultation(env, normalized, facts) {
  const ctx = { summaryText: facts.summaryText, question: normalized.input.question };
  const cacheStore = createLlmCacheStore(env);
  const results = await runWithConcurrency(NAKSHATRA_SECTIONS, SECTION_CONCURRENCY, (section) => {
    const prompt = buildSectionPrompt(section, ctx);
    const cacheConfig = {
      store: cacheStore,
      deterministic: true,
      ttlSeconds: 30 * 24 * 60 * 60,
      keyExtra: `nakshatra-ai-v1-${section.id}`,
    };
    return generateSectionOnce(env, section, prompt, cacheConfig);
  });

  const decks = mergeConsultationSections(results.map((entry) => ({ id: entry.id, body: entry.body })));
  // 두 덱 모두 최소 한 챕터 이상 + 총 분량 하한을 통과해야 완료로 인정(파국적 생성 실패 방지).
  if (countTextChars(decks) < 400 || decks.sukuyo.length === 0 || decks.vedic.length === 0) {
    const error = new Error(LLM_ERROR_MESSAGE);
    error.code = "LLM_FAILED";
    error.status = 503;
    throw error;
  }
  const provider = clean(results.find((entry) => entry.provider)?.provider || "gemini");
  const model = clean(results.find((entry) => entry.model)?.model || "");
  return { decks, provider, model };
}

// ── 핸들러 ───────────────────────────────────────────────────────────────────
async function handleEnsureAccess(request, env) {
  const body = await readJson(request);
  const normalized = normalizeInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  const idempotencyKey = readIdempotencyKey(request, body);
  if (idempotencyKey.length < 12) return invalidInput(INVALID_INPUT_MESSAGE);
  // 인증하면서 접근 판정 필드까지 한 번에 읽어 authUserDoc로 받는다(선검사의 User 재조회 제거).
  const auth = await getOptionalUserFromRequest(request, env, {
    surfaceDbInfraError: true,
    userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION,
  });
  if (!auth) return loginRequired();
  const pricing = getPricing();
  const access = await resolveEnsureAccess(env, auth, pricing, idempotencyKey, normalized.inputHash);
  if (access.ok) {
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        accessType: access.accessType,
        idempotencyKey,
        inputHash: normalized.inputHash,
        paymentId: access.paymentId || "",
      }),
      accessType: access.accessType,
      consultation: access.existing ? publicSession(access.existing) : null,
    });
  }
  if (access.reason === "LOGIN_REQUIRED") return loginRequired();
  if (access.reason === "INVALID_INPUT") return invalidInput(INVALID_INPUT_MESSAGE, 409);
  return paymentRequired(pricing, idempotencyKey);
}

async function handleStart(request, env) {
  const body = await readJson(request);
  const normalized = normalizeInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  const idempotencyKey = readIdempotencyKey(request, body);
  if (idempotencyKey.length < 12) return invalidInput(INVALID_INPUT_MESSAGE);
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  await connectDb(env);
  const pricing = getPricing();
  const access = await resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey });
  if (!access.ok) {
    if (access.reason === "LOGIN_REQUIRED") return loginRequired();
    if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
    return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED", message: PAYMENT_VERIFY_FAILED_MESSAGE }, { status: 402 });
  }

  const existing = await withMongoRetry(env, () => NakshatraAiConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean());
  if (existing && clean(existing.inputHash) !== normalized.inputHash) return invalidInput(INVALID_INPUT_MESSAGE, 409);
  if (existing?.status === "completed") return json(publicSession(existing));
  if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < GENERATION_FRESHNESS_MS) {
    return json({ ok: true, sessionId: existing.id, status: "generating", message: "두 대가가 당신의 별을 읽는 중이에요." }, { status: 202 });
  }

  // 정찰 지도(계산)는 LLM이 아니므로 포그라운드에서 즉시 검증한다 — 출생정보/차트 오류는 여기서 422로 빠르게 반환.
  let facts;
  try {
    facts = await computeNatalFacts(env, normalized, request);
  } catch (error) {
    const isCalculationError = clean(error?.code).includes("BIRTH") || clean(error?.code).includes("CHART") || Number(error?.status) === 422;
    return json({
      ok: false,
      reason: isCalculationError ? "CALCULATION_ERROR" : "LLM_ERROR",
      message: isCalculationError ? CALCULATION_ERROR_MESSAGE : LLM_ERROR_MESSAGE,
    }, { status: isCalculationError ? 422 : 503 });
  }

  const sessionId = existing?.id || `nakai_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}`;
  const now = new Date();
  const seed = {
    id: sessionId,
    userId: auth.userId,
    idempotencyKey,
    inputHash: normalized.inputHash,
    birthInfo: normalized.input.birthInfo,
    question: normalized.input.question,
    factSummary: { identity: facts.identity, evidenceTokens: facts.evidenceTokens },
    decks: null,
    accessType: access.accessType,
    paymentId: clean(access.paymentId, 160),
    messages: [],
    status: "generating",
    generationError: null,
  };
  if (existing) {
    await NakshatraAiConsultation.updateOne({ id: existing.id }, { $set: { ...seed, updatedAt: now } });
  } else {
    try {
      await NakshatraAiConsultation.create(seed);
    } catch (error) {
      if (error?.code === 11000) {
        const duplicate = await NakshatraAiConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean();
        if (duplicate?.status === "completed") return json(publicSession(duplicate));
        return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: "두 대가가 당신의 별을 읽는 중이에요." }, { status: 202 });
      }
      throw error;
    }
  }

  await startRefundableExecution(env, auth, access, idempotencyKey, sessionId, pricing);

  // 11챕터(숙요 5 + 베다 6) LLM 상담을 요청 안에서 '동기'로 생성해 완료 결과를 바로 반환한다.
  // waitUntil(비동기)은 하나의 공유 MongoDB 연결을 여러 요청 컨텍스트가 재사용하게 만들어 Cloudflare Workers의
  // 요청 간 I/O 격리와 충돌 → 생성 DB 쓰기가 취소·타임아웃돼 'generating'에 고착됐다. 동기 방식은 이 제약에 걸리지 않는다.
  try {
    const generated = await generateConsultation(env, normalized, facts);
    await applyUsageOnce({ userId: auth.userId, sessionId, accessType: access.accessType, pricing, source: access.source });
    await recordSuccessfulUsage(auth, idempotencyKey, access, sessionId, pricing);
    const completed = await NakshatraAiConsultation.findOneAndUpdate(
      { id: sessionId },
      {
        $set: {
          status: "completed",
          decks: generated.decks,
          messages: [
            { role: "user", content: normalized.input.question || "(자유 상담)", createdAt: now },
            { role: "assistant", content: JSON.stringify(generated.decks), createdAt: new Date() },
          ],
          llmMeta: { provider: generated.provider, model: generated.model, completedAt: new Date().toISOString() },
          generationError: null,
        },
      },
      { new: true },
    ).lean();
    await completeRefundableExecution(env, auth, idempotencyKey, sessionId);
    return json(publicSession(completed));
  } catch (error) {
    await failRefundableExecution(env, auth, idempotencyKey, sessionId, error);
    await NakshatraAiConsultation.updateOne(
      { id: sessionId },
      {
        $set: {
          status: "generation_failed",
          generationError: {
            code: clean(error?.code || "GENERATION_FAILED", 80),
            message: clean(error?.message || error, 500),
            at: new Date().toISOString(),
          },
        },
      },
    ).catch(() => {});
    const isCalculationError = clean(error?.code).includes("BIRTH") || clean(error?.code).includes("CHART") || Number(error?.status) === 422;
    return json({
      ok: false,
      reason: isCalculationError ? "CALCULATION_ERROR" : "LLM_ERROR",
      message: isCalculationError ? CALCULATION_ERROR_MESSAGE : LLM_ERROR_MESSAGE,
    }, { status: isCalculationError ? 422 : 503 });
  }
}

async function handleResult(request, env, pathId = "") {
  const url = new URL(request.url);
  const rawId = pathId || url.searchParams.get("attemptId") || url.searchParams.get("id") || "";
  const resultId = clean(decodeURIComponent(rawId), 120);
  if (!resultId) return invalidInput(RESULT_NOT_FOUND_MESSAGE, 404);
  // 폴링은 이미 인가된 세션의 결과 조회다. 인증 판정에서 일시적 DB 장애가 나면 로그아웃 유발 401/하드 500이
  // 아니라 재시도 가능한 503으로 흘려보내 클라가 계속 폴링하도록 한다(네오/찻집과 동일한 완충).
  let auth = null;
  try {
    auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  } catch (error) {
    return json({
      ok: false,
      retryable: true,
      reason: "DB_DEGRADED",
      message: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요.",
    }, { status: 503 });
  }
  // 로그인 쿠키 판정이 흔들려도, ensure-access가 발급한 서명 액세스 토큰(userId 포함)으로 신원을 확정한다.
  if (!auth) {
    const fallbackUserId = await resolveResultUserIdFromToken(request, env);
    if (fallbackUserId) auth = { userId: fallbackUserId };
  }
  if (!auth) return loginRequired();
  await connectDb(env);
  const consultation = await NakshatraAiConsultation.findOne({
    userId: auth.userId,
    $or: [{ id: resultId }, { idempotencyKey: resultId }],
  }).lean();
  if (!consultation) return json({ ok: false, reason: "RESULT_NOT_FOUND", message: RESULT_NOT_FOUND_MESSAGE }, { status: 404 });

  const status = clean(consultation.status);
  if (status === "generating") {
    return json(
      {
        ok: true,
        sessionId: clean(consultation.id),
        status: "generating",
        natal: consultation.factSummary?.identity || null,
        message: "두 대가가 당신의 별을 읽는 중이에요.",
      },
      { status: 202, headers: { "Retry-After": "3" } },
    );
  }
  if (status === "generation_failed" || status === "failed") {
    const failCode = clean(consultation.generationError?.code);
    const isCalculationError = failCode.includes("BIRTH") || failCode.includes("CHART") || failCode.includes("CALCULATION");
    return json({
      ok: false,
      reason: isCalculationError ? "CALCULATION_ERROR" : "LLM_ERROR",
      message: isCalculationError ? CALCULATION_ERROR_MESSAGE : LLM_ERROR_MESSAGE,
    }, { status: 409 });
  }
  return json(publicSession(consultation));
}

export async function handleNakshatraAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/nakshatra-ai");
  try {
    if (method === "GET" && path === "/result") return await handleResult(request, env);
    if (method === "GET" && path.startsWith("/result/")) return await handleResult(request, env, path.slice("/result/".length));
    if (method === "POST" && path === "/ensure-access") return await handleEnsureAccess(request, env);
    if (method === "POST" && path === "/start") return await handleStart(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[nakshatra-ai]", clean(error?.stack || error?.message || error, 1200));
    // 풀 초기화 버스트/인증 조회 중 일시 DB 장애는 재시도 신호와 함께 503으로 — 하드 500 방지(다른 AI 라우트와 동일 정본).
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) {
      return json({
        ok: false,
        retryable: true,
        reason: "DB_DEGRADED",
        message: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요.",
      }, { status: 503 });
    }
    return serverError();
  }
}
