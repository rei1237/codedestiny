// 나크샤트라 결정판 전문가 심화 상담 — 결제·생성 라우트 (3덱: 숙요/베다/융합, 21섹션)
//
//   POST /api/nakshatra-ai/ensure-access : 이용권 선검사 → 커버 시 accessToken, 미커버 시 402(결제창)
//   POST /api/nakshatra-ai/start         : 결제/이용권 확정 → 세션 개설 + 첫 웨이브 생성 → 진행률 반환
//   POST /api/nakshatra-ai/generate      : 다음 웨이브 생성(완료까지 클라가 반복 호출) → 진행률/완료 결과
//   GET  /api/nakshatra-ai/result        : 폴백 폴링(연결 끊김 시 결과 조회)
//
// 결제·과금·환불·멱등 계약은 네오 작전실(neo-operation-room.js)의 검증된 헬퍼를 거의 그대로 복사한다.
//
// ⚠ 생성은 반드시 '동기'(waitUntil 금지). 비동기 전환은 Workers 요청 간 I/O 격리와 충돌해 결과가 'generating'에
// 고착됐던 이력이 있다(네오와 동일 결론). 계산 검증은 포그라운드에서 먼저 끝낸다.
//
// 🔴 그런데 21섹션을 '한 요청에 전부' 동기 생성하면 엣지 응답 한도(100초)를 확실히 넘는다.
//    그래서 마스터 인연의 서(20장 5만자)가 프로덕션에서 완주시키는 배치 패턴을 이식했다 —
//    **한 요청 = 1 동시성 웨이브(4섹션)**, 완료분은 매 배치 Mongo 에 누적, 진행 위치의 정본은 서버,
//    중복 기동은 lockedAt/lockToken CAS 로 차단. waitUntil 은 여전히 쓰지 않는다.
//
// 🔴 융합 덱(10섹션)은 숙요·베다 11섹션이 끝난 뒤에만 생성한다(2페이즈). 두 대가가 실제로 무엇이라
//    말했는지를 근거로 받아야 "비교"가 성립하기 때문이다 — 이게 이 상품의 존재 이유다.

import { createHash } from "node:crypto";
import { Solar } from "lunar-javascript";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, isTransientMongoError, mongoose, withMongoRetry } from "../lib/db.js";
import {
  NakshatraAiConsultation,
  PaidExecutionRecord,
  Payment,
  User,
} from "../lib/models.js";
import { findMoonstoneSpendEvidence } from "../lib/moonstone-spend-proof.js";
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
import { clampSyncLlmTimeoutMs } from "../lib/sync-llm-timeout.js";
import {
  NAKSHATRA_SECTIONS,
  NAKSHATRA_PHASE_DECKS,
  NAKSHATRA_PHASE_FUSION,
  NAKSHATRA_TOTAL_MIN_CHARS,
  buildSectionPrompt,
  buildFactContext,
  buildDeckDigest,
  buildWrittenMemory,
  parseSectionResponse,
  mergeConsultationSections,
  extractTopInsights,
  hasForbiddenResultText,
} from "../lib/nakshatra-ai-prompt.js";

const SERVICE_KEY = "nakshatra-ai";
const FEATURE_KEY = "nakshatra-ai-consultation";
const ACCESS_TOKEN_TYPE = "nakshatra-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ACCESS_TOKEN_HEADER = "x-nakshatra-ai-access-token";
// 배치 생성이 완주하는 최악 시간을 덮는 신선도 창. 이 창 안의 재-POST(start)는 2차 생성을 기동하지 않고
// 202로 흡수돼 이중 작업/이중 과금을 막는다.
const GENERATION_FRESHNESS_MS = 900000;
const TITLE = "나크샤트라 결정판 전문가 심화 상담";
const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요해요. 로그인 후 다시 시도해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제나 이용권 확인이 아직 끝나지 않았어요. 권한을 확인한 뒤 다시 시도해 주세요.";
const INVALID_INPUT_MESSAGE = "생년월일 정보가 올바르지 않아요. 입력값을 확인하고 다시 시도해 주세요.";
const CALCULATION_ERROR_MESSAGE = "별자리 계산 중 문제가 생겼어요. 입력값을 확인하고 다시 시도해 주세요.";
const LLM_ERROR_MESSAGE = "상담문 작성에 실패했어요. 이용권이나 결제 권한은 보존되니 잠시 후 다시 시도해 주세요.";
const SERVER_ERROR_MESSAGE = "상담실을 여는 중 문제가 생겼어요. 결제 금액은 차감하지 않았어요.";
const RESULT_NOT_FOUND_MESSAGE = "저장된 상담을 찾지 못했어요.";
const SECTION_CONCURRENCY = 4;
// 한 요청 = 1 동시성 웨이브 → 엣지 100초 컷 회피(master-love-codex.js:88-92 와 동일 계약).
const SECTION_BATCH_SIZE = SECTION_CONCURRENCY;
const SECTION_TIMEOUT_MS = 60000;
// 배치 1회(생성 + 캐시우회 재시도 최악 시간)를 덮어야 병렬 폴링이 같은 배치를 중복 기동하지 않는다.
const BATCH_LOCK_TTL_MS = 390000;
// 섹션이 자기 목표의 이 비율에 못 미치면 '미완'으로 보고 다음 배치에서 다시 생성한다.
// 이 하한이 곧 상품이 광고하는 분량의 근거다(21섹션 × 목표 합계 19,600자 × 0.75 ≈ 14,700자).
const SECTION_MIN_RATIO = 0.75;
const SECTION_MAX_ATTEMPTS = 2;
// 총량 관문. 미달이어도 이미 결제된 결과를 파기하지 않고 전달하되(결제 후 결과 전달 보장), 경고를 남긴다.
const MIN_TOTAL_CHARS = Math.floor(NAKSHATRA_TOTAL_MIN_CHARS * SECTION_MIN_RATIO);
const SECTION_BY_ID = new Map(NAKSHATRA_SECTIONS.map((section) => [section.id, section]));

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

// 🔴 클라이언트가 되돌려 준 ledgerId/transactionId 를 ObjectId 로 요구하던 구현은 결제 V2 에서
//    항상 실패한다(V2 는 ledgerId 를 비우고 transactionId 자리에 requestId 문자열을 싣는다).
//    증빙은 원장을 직접 읽는 정본(worker/lib/moonstone-spend-proof.js)이 판정한다.
async function hasMonthlyConsume(env, auth, ctx, idempotencyKey) {
  if (ctx.featureKey && ctx.featureKey !== FEATURE_KEY) return false;
  if (ctx.requestId && ctx.requestId !== idempotencyKey) return false;
  const evidence = await findMoonstoneSpendEvidence(env, {
    userId: auth.userId,
    featureKeys: [FEATURE_KEY, SERVICE_KEY],
    tokens: [idempotencyKey, ctx.requestId, ctx.ledgerId, ctx.transactionId, ctx.paymentId],
  });
  return Boolean(evidence);
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
    if (await withMongoRetry(env, () => hasMonthlyConsume(env, auth, ctx, idempotencyKey))) {
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
    const error = new Error("A Payment Service access grant is required for monthly usage.");
    error.code = "PAYMENT_ACCESS_GRANT_REQUIRED";
    throw error;
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
    // 진행 인디케이터는 서버 진행률에 실제로 물려 있어야 한다(가짜 진행바 금지).
    progress: {
      completed: Number(raw?.generationProgress?.completed || 0),
      total: Number(raw?.generationProgress?.total || NAKSHATRA_SECTIONS.length),
      phase: clean(raw?.generationProgress?.phase) || (raw?.status === "completed" ? "done" : "decks"),
      chars: Number(raw?.totalCharCount || 0),
    },
    totalCharCount: Number(raw?.totalCharCount || 0),
    minTotalChars: MIN_TOTAL_CHARS,
    topInsights: Array.isArray(raw?.llmMeta?.topInsights) ? raw.llmMeta.topInsights : [],
    generationError: raw?.generationError || null,
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

// 챕터 하나 생성 → 섹션 엔트리. 실패해도 body=""로 남겨(전체 실패 방지) 다음 배치에서 재시도한다.
// 잘림(MAX_TOKENS)·빈 파싱·목표 미달이면 캐시를 우회해 1회 재시도한다.
// 🔴 fallbackMinChars: Workers AI 폴백(70B는 약 1,700자에서 스스로 멈춘다)이 짧은 응답을 완성본으로
//    돌려주는 것을 막는다. 이게 없으면 2만자 상품이 8% 분량으로 '완료' 저장된다(CLAUDE.md 필수 규칙).
async function generateSectionOnce(env, section, prompt, cacheConfig) {
  const base = { id: section.id, deck: section.deck, title: section.title, keyInsight: "", body: "", chars: 0 };
  try {
    let ai = null;
    let parsed = { keyInsight: "", body: "" };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const useCache = attempt === 0 && cacheConfig;
      ai = await callGeminiText(env, prompt, {
        maxOutputTokens: 8192,
        temperature: 0.65,
        thinkingBudget: 0,
        timeoutMs: clampSyncLlmTimeoutMs(SECTION_TIMEOUT_MS),
        fallbackMinChars: Math.floor(section.minChars * 0.4),
        ...(useCache ? { cache: cacheConfig } : {}),
      });
      parsed = ai?.ok ? parseSectionResponse(ai.text) : { keyInsight: "", body: "" };
      const tooShort = parsed.body.length < Math.floor(section.minChars * SECTION_MIN_RATIO);
      const needsRetry = ai?.ok && (ai.truncated === true || !parsed.body || tooShort);
      if (!needsRetry) break;
    }
    const provider = clean(ai?.provider || "");
    const model = clean(ai?.model || "");
    const isMock = /mock/i.test(provider) || /mock/i.test(model) || ai?.isMock === true;
    if (!ai?.ok || isMock || clean(ai?.text).length < 40) {
      return { ...base, provider, model, ok: false };
    }
    if (!parsed.body || hasForbiddenResultText(parsed)) {
      return { ...base, provider, model, ok: false };
    }
    return {
      ...base,
      keyInsight: parsed.keyInsight,
      body: parsed.body,
      chars: parsed.body.length,
      provider,
      model,
      ok: true,
    };
  } catch (error) {
    return { ...base, provider: "", model: "", ok: false, error: clean(error?.message, 120) };
  }
}

// ── 배치 진행 계산 ───────────────────────────────────────────────────────────
// 섹션이 '정착(settled)' 했는가 = 목표 분량의 SECTION_MIN_RATIO 를 넘겼거나, 시도 상한을 다 썼는가.
// 정착하지 않은 섹션은 다음 배치에서 자동으로 다시 생성된다 → 이게 광고 분량을 실제로 떠받친다.
function isSectionSettled(entry) {
  if (!entry) return false;
  const spec = SECTION_BY_ID.get(entry.id);
  const floor = spec ? Math.floor(spec.minChars * SECTION_MIN_RATIO) : 1;
  if (entry.ok && Number(entry.chars || 0) >= floor) return true;
  return (Number(entry.attempts) || 1) >= SECTION_MAX_ATTEMPTS;
}

function readSections(doc) {
  return Array.isArray(doc?.sections) ? doc.sections.filter((entry) => entry && entry.id) : [];
}

// 다음에 생성할 섹션 묶음. 융합 덱은 숙요·베다가 전부 정착한 뒤에만 열린다(2페이즈).
function pickNextBatch(done) {
  const byId = new Map(done.map((entry) => [entry.id, entry]));
  const settled = (section) => isSectionSettled(byId.get(section.id));
  const decksPending = NAKSHATRA_PHASE_DECKS.filter((section) => !settled(section));
  const phase = decksPending.length ? "decks" : "fusion";
  const pool = decksPending.length ? decksPending : NAKSHATRA_PHASE_FUSION.filter((section) => !settled(section));
  return { phase, slice: pool.slice(0, SECTION_BATCH_SIZE), remaining: pool.length };
}

function countSettled(done) {
  const byId = new Map(done.map((entry) => [entry.id, entry]));
  return NAKSHATRA_SECTIONS.filter((section) => isSectionSettled(byId.get(section.id))).length;
}

function sumSectionChars(done) {
  return done.reduce((sum, entry) => sum + (Number(entry?.chars) || 0), 0);
}

// 한 웨이브만 생성하고 누적 섹션 배열을 돌려준다(요청당 wall-clock = 1 웨이브).
async function runGenerationBatch(env, session, facts) {
  const done = readSections(session);
  const { phase, slice } = pickNextBatch(done);
  if (!slice.length) return { sections: done, phase, generated: 0 };

  const ctx = {
    summaryText: facts.summaryText,
    question: clean(session?.question),
    // 융합 섹션은 두 대가가 실제로 쓴 본문 요약을 근거로 받는다 — 없으면 또 한 번 일반론이 된다.
    deckDigest: phase === "fusion" ? buildDeckDigest(done) : "",
    writtenMemory: buildWrittenMemory(done),
  };
  const cacheStore = createLlmCacheStore(env);
  const results = await runWithConcurrency(slice, SECTION_CONCURRENCY, (section) => {
    const prompt = buildSectionPrompt(section, ctx);
    // 재시도 회차마다 캐시 키를 갈라야 같은 짧은 응답을 다시 받지 않는다.
    const priorAttempts = Number(done.find((entry) => entry.id === section.id)?.attempts || 0);
    const cacheConfig = {
      store: cacheStore,
      deterministic: true,
      ttlSeconds: 30 * 24 * 60 * 60,
      keyExtra: `nakshatra-ai-v2-${section.id}${priorAttempts ? `-r${priorAttempts}` : ""}`,
    };
    return generateSectionOnce(env, section, prompt, cacheConfig);
  });

  const merged = done.slice();
  for (const result of results) {
    const priorIndex = merged.findIndex((entry) => entry.id === result.id);
    const attempts = (Number(priorIndex >= 0 ? merged[priorIndex].attempts : 0) || 0) + 1;
    const prior = priorIndex >= 0 ? merged[priorIndex] : null;
    // 재시도가 더 짧게 나오면 이전 결과를 지키다(분량이 뒷걸음질치지 않게).
    const keepPrior = prior?.ok && Number(prior.chars || 0) > Number(result.chars || 0);
    const next = keepPrior ? { ...prior, attempts } : { ...result, attempts };
    if (priorIndex >= 0) merged[priorIndex] = next;
    else merged.push(next);
  }
  // 섹션 순서를 레지스트리 순서로 정렬해 보관한다(부분 결과를 그대로 렌더할 수 있게).
  const order = new Map(NAKSHATRA_SECTIONS.map((section, index) => [section.id, index]));
  merged.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
  return { sections: merged, phase, generated: results.length };
}

// 완료 조립. 두 대가 덱이 통째로 비면 상품 계약(2관점 상담)이 깨진 것이므로 실패로 돌린다.
function buildCompletion(sections) {
  const decks = mergeConsultationSections(sections);
  if (countTextChars(decks) < 400 || decks.sukuyo.length === 0 || decks.vedic.length === 0) {
    const error = new Error(LLM_ERROR_MESSAGE);
    error.code = "LLM_FAILED";
    error.status = 503;
    throw error;
  }
  const totalCharCount = sumSectionChars(sections);
  if (totalCharCount < MIN_TOTAL_CHARS) {
    // 파기하지 않는다 — 결제한 사용자에게 짧은 실제 상담이 실패 안내보다 낫다. 대신 계측을 남긴다.
    console.warn("[nakshatra-ai] total chars below floor", { totalCharCount, floor: MIN_TOTAL_CHARS });
  }
  const provider = clean(sections.find((entry) => entry.provider)?.provider || "gemini");
  const model = clean(sections.find((entry) => entry.model)?.model || "");
  const practice = decks.fusion.find((entry) => entry.id === "fusionPractice");
  return { decks, totalCharCount, provider, model, topInsights: extractTopInsights(practice?.body) };
}

// ── 배치 락 / 진행률 ─────────────────────────────────────────────────────────
// 폴링이 겹쳐도 같은 배치를 두 번 굽지 않게 원자적 CAS 로 잡는다(master-love-codex:759-777).
async function acquireBatchLock(env, sessionId, userId) {
  const now = Date.now();
  const lockToken = `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const updated = await withMongoRetry(env, () => NakshatraAiConsultation.findOneAndUpdate(
    {
      id: sessionId,
      userId,
      status: "generating",
      $or: [
        { "generationProgress.lockedAt": { $exists: false } },
        { "generationProgress.lockedAt": null },
        { "generationProgress.lockedAt": { $lt: new Date(now - BATCH_LOCK_TTL_MS) } },
      ],
    },
    { $set: { "generationProgress.lockedAt": new Date(now), "generationProgress.lockToken": lockToken } },
    { new: true },
  ).lean());
  return updated ? { ok: true, lockToken, doc: updated } : { ok: false };
}

async function releaseBatchLock(env, sessionId) {
  await withMongoRetry(env, () => NakshatraAiConsultation.updateOne(
    { id: sessionId },
    { $set: { "generationProgress.lockedAt": null, "generationProgress.lockToken": "" } },
  )).catch(() => {});
}

function progressPayload(sessionId, sections, phase) {
  const completed = countSettled(sections);
  return {
    ok: true,
    sessionId,
    status: "generating",
    progress: {
      completed,
      total: NAKSHATRA_SECTIONS.length,
      phase,
      chars: sumSectionChars(sections),
    },
    message: phase === "fusion"
      ? "두 대가의 해석을 겹쳐 읽는 중이에요."
      : "두 대가가 당신의 별을 읽는 중이에요.",
  };
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
    // summaryText 는 /generate 가 매 배치마다 Swiss 계산을 다시 돌리지 않도록 함께 보관한다(내부 전용, 미노출).
    factSummary: { identity: facts.identity, evidenceTokens: facts.evidenceTokens, summaryText: facts.summaryText },
    decks: null,
    sections: [],
    generationProgress: { completed: 0, total: NAKSHATRA_SECTIONS.length, phase: "decks", lockedAt: null, lockToken: "" },
    totalCharCount: 0,
    accessType: access.accessType,
    accessSource: clean(access.source, 40),
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

  // 첫 웨이브만 굽고 진행률을 돌려준다. 나머지는 클라가 /generate 를 반복 호출해 채운다.
  // 한 요청 = 1 동시성 웨이브라 엣지 100초 컷에 걸리지 않는다(waitUntil 은 여전히 쓰지 않는다).
  return advanceGeneration({ env, auth, sessionId, idempotencyKey, access, pricing, firstWave: true });
}

// /start 와 /generate 가 공유하는 진행 엔진. 락 → 1 웨이브 → 부분 저장 → (완료면) 정산.
async function advanceGeneration({ env, auth, sessionId, idempotencyKey, access, pricing, firstWave = false }) {
  const lock = await acquireBatchLock(env, sessionId, auth.userId);
  if (!lock.ok) {
    // 다른 요청이 같은 배치를 굽고 있다. 이중 생성/이중 과금을 만들지 않고 폴링을 이어 가게 한다.
    const current = await withMongoRetry(env, () => NakshatraAiConsultation.findOne({ id: sessionId, userId: auth.userId }).lean());
    if (current?.status === "completed") return json(publicSession(current));
    const sections = readSections(current);
    return json(progressPayload(sessionId, sections, pickNextBatch(sections).phase), { status: 202, headers: { "Retry-After": "3" } });
  }

  const session = lock.doc;
  const facts = {
    summaryText: clean(session?.factSummary?.summaryText),
    identity: session?.factSummary?.identity || null,
  };
  if (!facts.summaryText) {
    await releaseBatchLock(env, sessionId);
    return json({ ok: false, reason: "CALCULATION_ERROR", message: CALCULATION_ERROR_MESSAGE }, { status: 422 });
  }

  try {
    const batch = await runGenerationBatch(env, session, facts);
    const sections = batch.sections;
    const nextBatch = pickNextBatch(sections);
    const finished = nextBatch.slice.length === 0;

    if (!finished) {
      await withMongoRetry(env, () => NakshatraAiConsultation.updateOne(
        { id: sessionId },
        {
          $set: {
            sections,
            totalCharCount: sumSectionChars(sections),
            generationProgress: {
              completed: countSettled(sections),
              total: NAKSHATRA_SECTIONS.length,
              phase: nextBatch.phase,
              lockedAt: null,
              lockToken: "",
            },
          },
        },
      ));
      return json(progressPayload(sessionId, sections, nextBatch.phase), { status: 202, headers: { "Retry-After": "1" } });
    }

    const completion = buildCompletion(sections);
    await applyUsageOnce({ userId: auth.userId, sessionId, accessType: access.accessType, pricing, source: access.source });
    await recordSuccessfulUsage(auth, idempotencyKey, access, sessionId, pricing);
    const completed = await withMongoRetry(env, () => NakshatraAiConsultation.findOneAndUpdate(
      { id: sessionId },
      {
        $set: {
          status: "completed",
          sections,
          decks: completion.decks,
          totalCharCount: completion.totalCharCount,
          generationProgress: {
            completed: NAKSHATRA_SECTIONS.length,
            total: NAKSHATRA_SECTIONS.length,
            phase: "done",
            lockedAt: null,
            lockToken: "",
          },
          messages: [
            { role: "user", content: clean(session?.question) || "(자유 상담)", createdAt: new Date(session?.createdAt || Date.now()) },
            { role: "assistant", content: JSON.stringify(completion.decks), createdAt: new Date() },
          ],
          llmMeta: {
            provider: completion.provider,
            model: completion.model,
            totalCharCount: completion.totalCharCount,
            minTotalChars: MIN_TOTAL_CHARS,
            topInsights: completion.topInsights,
            completedAt: new Date().toISOString(),
          },
          generationError: null,
        },
      },
      { new: true },
    ).lean());
    await completeRefundableExecution(env, auth, idempotencyKey, sessionId);
    return json(publicSession(completed));
  } catch (error) {
    await releaseBatchLock(env, sessionId);
    // 첫 웨이브에서 파국이면 환불하고 실패로 닫는다. 이후 웨이브 실패는 부분 결과가 남아 있으므로
    // 세션을 죽이지 않고 다음 폴링에서 다시 시도하게 둔다(결제 후 결과 전달 보장).
    if (!firstWave) {
      const current = await withMongoRetry(env, () => NakshatraAiConsultation.findOne({ id: sessionId, userId: auth.userId }).lean()).catch(() => null);
      const sections = readSections(current);
      if (sections.length) {
        return json(progressPayload(sessionId, sections, pickNextBatch(sections).phase), { status: 202, headers: { "Retry-After": "3" } });
      }
    }
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

// POST /generate — 결제는 /start 에서 이미 끝났다. 여기서는 세션 소유만 확인하고 다음 웨이브를 굽는다.
async function handleGenerate(request, env) {
  const body = await readJson(request);
  const sessionId = clean(body?.sessionId || body?.attemptId, 120);
  const idempotencyKey = readIdempotencyKey(request, body);
  if (!sessionId || idempotencyKey.length < 12) return invalidInput(INVALID_INPUT_MESSAGE);
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  await connectDb(env);
  const session = await withMongoRetry(env, () => NakshatraAiConsultation.findOne({ id: sessionId, userId: auth.userId }).lean());
  if (!session) return json({ ok: false, reason: "NOT_FOUND", message: RESULT_NOT_FOUND_MESSAGE }, { status: 404 });
  if (session.status === "completed") return json(publicSession(session));
  if (session.status === "generation_failed") {
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE, generationError: session.generationError || null }, { status: 409 });
  }

  const pricing = getPricing();
  // 🔴 source 는 반드시 /start 가 보존한 값을 그대로 쓴다. "resume" 같은 새 값을 넣으면
  // applyUsageOnce 가 billing-gate 로 이미 차감된 월정석을 완료 시 한 번 더 소비한다.
  const access = {
    accessType: clean(session.accessType) || "paid",
    source: clean(session.accessSource) || "billing-gate",
    paymentId: clean(session.paymentId, 160),
  };
  return advanceGeneration({ env, auth, sessionId, idempotencyKey: clean(session.idempotencyKey) || idempotencyKey, access, pricing });
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
    if (method === "POST" && path === "/generate") return await handleGenerate(request, env);
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
