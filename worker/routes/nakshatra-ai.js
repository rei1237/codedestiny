// 나크샤트라 결정판 통합 상담 — 결제·생성 라우트 (두 전통 교차 해석, 9개 장)
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
// 🔴 9개 장도 한 요청에 전부 동기 생성하면 엣지 응답 한도(100초)를 넘을 수 있다.
//    그래서 마스터 인연의 서(20장 5만자)가 프로덕션에서 완주시키는 배치 패턴을 이식했다 —
//    **한 요청 = 1 동시성 웨이브(4섹션)**, 완료분은 매 배치 Mongo 에 누적, 진행 위치의 정본은 서버,
//    중복 기동은 lockedAt/lockToken CAS 로 차단. waitUntil 은 여전히 쓰지 않는다.
//
// 🔴 각 장은 처음부터 숙요·베다 계산 근거를 함께 받는다. 별도 덱을 이어 붙이지 않고,
//    앞 장의 결론만 짧게 보존해 의미가 겹치지 않는 하나의 상담을 완성한다.

import { createHash } from "node:crypto";
import { solarToLunar } from "../../lib/korean-calendar/index.js";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, isTransientMongoError, mongoose, withMongoRetry } from "../lib/db.js";
import {
  NakshatraAiConsultation,
  PaidExecutionRecord,
  PointHistory,
  MonthlyCreditLedger,
  Payment,
  User,
} from "../lib/models.js";
import { resultStorageUnavailable, resultStorageFailurePayload } from "../lib/result-storage.js";
import { countPaidReportBodyChars, hasRepeatedReportPassage } from "../lib/paid-report-quality.js";
import { findMoonstoneSpendEvidence } from "../lib/moonstone-spend-proof.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canAccessPaidFeature, PAID_FEATURE_ACCESS_USER_PROJECTION } from "../lib/paid-feature-access.js";
import { callGeminiText } from "../lib/gemini.js";
import { isStagingLlmMockEnabled } from "../lib/staging-llm-mock.js";
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
  NAKSHATRA_PHASE_CONSULTATION,
  NAKSHATRA_TOTAL_MIN_CHARS,
  buildSectionPrompt,
  buildFactContext,
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
const SECTION_TIMEOUT_MS = 45000;
// 배치 1회(생성 + 캐시우회 재시도 최악 시간)를 덮어야 병렬 폴링이 같은 배치를 중복 기동하지 않는다.
const BATCH_LOCK_TTL_MS = 120000;
// 섹션이 자기 목표의 이 비율에 못 미치면 '미완'으로 보고 다음 배치에서 다시 생성한다.
// 이 하한은 9개 통합 장의 실제 상담 밀도를 지킨다. 장 수가 아닌 각 장의 의미 범위를 기준으로 둔다.
const SECTION_MIN_RATIO = 1;
const SECTION_MAX_ATTEMPTS = 3;
// 신규 결과의 필수 본문 분량. 미완료 장은 보존하며 완료로 표시하지 않는다.
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
    body = { ...body, paymentId: payload.paymentId || body.paymentId };
  }
  const ctx = billingContextFromBody(body);
  const tokens = [...new Set([idempotencyKey, ctx.paymentId, ctx.requestId, ctx.transactionId, ctx.ledgerId].filter(Boolean))];
  const ids = tokens.flatMap(value => ["requestId", "idempotencyKey", "paymentId", "orderId", "impUid", "merchantUid", "executionId"].map(key => ({ [key]: value })));
  const metadataIds = tokens.flatMap(value => ["sourceId", "metadata.requestId", "metadata.idempotencyKey", "metadata.transactionId"].map(key => ({ [key]: value })));
  const markers = ["refundedForServiceExecution", "coinRefundedForUnlockFailure", "monthlyCreditRefundedForServiceExecution", "refundedForUnlockFailure", "monthlyCreditRefundedForUnlockFailure", "monthlyCreditRefundedForLedgerFailure"].map(key => ({ [`metadata.${key}`]: true }));
  const revoked = ["refunded", "cancelled", "canceled", "REFUNDED", "CANCELLED"];
  const blocked = await Promise.all([
    PaidExecutionRecord.findOne({ userId: auth.userId, featureId: FEATURE_KEY, status: { $in: revoked }, $or: ids }).lean(),
    Payment.findOne({ userId: auth.userId, featureKey: FEATURE_KEY, status: { $in: revoked }, $or: ids }).lean(),
    PointHistory.findOne({ userId: auth.userId, featureKey: FEATURE_KEY, $and: [{ $or: metadataIds }, { $or: markers }] }).lean(),
    MonthlyCreditLedger.findOne({ userId: auth.userId, $and: [{ $or: [{ serviceKey: FEATURE_KEY }, { "metadata.featureKey": FEATURE_KEY }] }, { $or: metadataIds }, { $or: markers }] }).lean(),
  ]);
  if (blocked.some(Boolean)) return { ok: false, reason: "PAYMENT_REQUIRED" };
  const paidPayment = await withMongoRetry(env, () => hasPaidPayment(auth, ctx.paymentId, idempotencyKey));
  if (paidPayment) {
    return {
      ok: true,
      accessType: "paid",
      paymentId: clean(paidPayment.merchantUid || paidPayment.impUid || ctx.paymentId, 160),
      source: "payment",
      // 생성 실패 시 이 결제를 되짚을 열쇠다. 🔴 클라이언트가 준 ctx.paymentId 가 아니라 위
      // hasPaidPayment 가 {userId, featureKey, paymentType, status} 로 좁혀 찾은 문서의 _id 를 싣는다
      // — 조작된 식별자가 환불 대상으로 흘러들 여지를 남기지 않는다.
      paymentDocId: clean(paidPayment._id, 64),
    };
  }
  {
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
  const user = await withMongoRetry(env, () => loadUser(auth.userId));
  if (!user) return { ok: false, reason: "LOGIN_REQUIRED" };
  if (clean(user.role).toLowerCase() === "admin") return { ok: true, accessType: "admin", paymentId: "", source: "server" };
  const decision = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env, reason: TITLE, userDoc: user });
  if (isReusablePaidFeatureAccess(decision) && mapPaidFeatureAccessType(decision) === "pass") {
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
  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

async function applyUsageOnce({ userId, sessionId, accessType, pricing, source }) {
  const existing = await NakshatraAiConsultation.findOne({ id: sessionId, userId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;
  if (source !== "billing-gate" && accessType === "subscription") {
    const error = new Error("A Payment Service access grant is required for monthly usage.");
    error.code = "PAYMENT_ACCESS_GRANT_REQUIRED";
    throw error;
  }
  await NakshatraAiConsultation.updateOne({ id: sessionId, userId, usageAppliedAt: null }, { $set: { usageAppliedAt: new Date() } });
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
      status: { $nin: ["cancelled", "canceled", "refunded", "revoked"] },
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
    requestId: clean(raw?.idempotencyKey),
    accessType: clean(raw?.accessType),
    question: clean(raw?.question),
    // 결과 렌더에 필요한 필드만 노출 — 내부 근거 텍스트(summaryText)·codex 원본은 은닉.
    natal: raw?.factSummary?.identity || null,
    decks: raw?.decks || (readSections(raw).some(isSectionSettled) ? mergeConsultationSections(readSections(raw).filter(isSectionSettled)) : null),
    // 진행 인디케이터는 서버 진행률에 실제로 물려 있어야 한다(가짜 진행바 금지).
    progress: {
      completed: raw?.status === "completed" ? Number(raw?.generationProgress?.total || NAKSHATRA_SECTIONS.length) : countSettled(readSections(raw)),
      total: Number(raw?.generationProgress?.total || NAKSHATRA_SECTIONS.length),
      phase: clean(raw?.generationProgress?.phase) || (raw?.status === "completed" ? "done" : "consultation"),
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

// 🔴 음력은 한국 음양력 코어(KST 삭 기준)가 낸다. 중국 음력(lunar-javascript)은 삭이 CST 23시대에
//    들면 그 달 전체가 하루 밀려 27수 본명숙이 통째로 다른 수가 된다(실측 3.57%).
//    입력 범위는 isValidBirthInput 이 1900~2100 으로 이미 막는다.
function lunarFromInput(input) {
  const lunar = solarToLunar(input.year, input.month, input.day);
  if (!lunar) throw new RangeError(`지원 범위 밖 생년월일: ${input.year}-${input.month}-${input.day}`);
  return { month: lunar.lunarMonth, day: lunar.lunarDay, isLeap: lunar.isLeapMonth };
}

// 🔴 검증 전용 표면. verify:sukuyo-korean-calendar 가 음력 축을 **실제로 실행해** 본다.
export const __nakshatraAiTestUtils = { normalizeBirthInput, isValidBirthInput, lunarFromInput };

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
    sukuyoDirection: clean(codex?.dongyang?.direction),
    sukuyoGuardian: clean(codex?.dongyang?.fourSymbol),
    nakshatraKo: clean(codex?.india?.nameKo),
    nakshatraEn: clean(codex?.india?.nameEn),
    pada: codex?.india?.pada ?? null,
    lordKo: clean(codex?.india?.lordKo),
  };
  return { summaryText, evidenceTokens, identity };
}

// 챕터 하나 생성 → 섹션 엔트리. 실패해도 body=""로 남겨(전체 실패 방지) 다음 배치에서 재시도한다.
// 잘림·빈 파싱·목표 미달은 다음 요청에서 해당 장만 제한적으로 다시 생성한다.
// 🔴 fallbackMinChars: Workers AI 폴백(70B는 약 1,700자에서 스스로 멈춘다)이 짧은 응답을 완성본으로
//    돌려주는 것을 막는다. 이게 없으면 2만자 상품이 8% 분량으로 '완료' 저장된다(CLAUDE.md 필수 규칙).
async function generateSectionOnce(env, section, prompt, cacheConfig) {
  const base = { id: section.id, deck: section.deck, title: section.title, keyInsight: "", vedicEvidence: "", sukuyoEvidence: "", body: "", chars: 0, ok: false };
  try {
    const ai = await callGeminiText(env, prompt, { maxOutputTokens: 10000, temperature: 0.65, thinkingBudget: 0,
      responseMimeType: "application/json", timeoutMs: clampSyncLlmTimeoutMs(SECTION_TIMEOUT_MS), fallbackToWorkersAI: false,
      ...(cacheConfig ? { cache: cacheConfig } : {}) });
    const isMock = (/mock/i.test(ai?.provider || "") || /mock/i.test(ai?.model || "") || ai?.isMock === true) && !isStagingLlmMockEnabled(env);
    if (!ai?.ok || isMock || ai.truncated || /^(MAX_TOKENS|length)$/i.test(ai.finishReason || "")) return base;
    const parsed = parseSectionResponse(ai.text);
    if (!parsed.body || hasForbiddenResultText(parsed)) return base;
    return { ...base, ...parsed, chars: countPaidReportBodyChars(parsed.body), provider: clean(ai.provider), model: clean(ai.model), ok: true };
  } catch { return base; }
}

// ── 배치 진행 계산 ───────────────────────────────────────────────────────────
// 정상 내용과 본문 최소 분량을 모두 충족한 장만 완료된 부분으로 인정한다.
// 정착하지 않은 섹션은 다음 배치에서 자동으로 다시 생성된다 → 이게 광고 분량을 실제로 떠받친다.
function isSectionSettled(entry) {
  const spec = SECTION_BY_ID.get(entry?.id);
  return Boolean(spec && entry.ok && entry.keyInsight && entry.vedicEvidence && entry.sukuyoEvidence
    && countPaidReportBodyChars(entry.body) >= spec.minChars && !hasRepeatedReportPassage(entry.body) && !hasForbiddenResultText([entry.keyInsight, entry.body, entry.vedicEvidence, entry.sukuyoEvidence]));
}

function readSections(doc) {
  return Array.isArray(doc?.sections) ? doc.sections.filter((entry) => entry && entry.id) : [];
}

// 다음에 생성할 섹션 묶음. 모든 장은 이미 두 전통의 계산 근거를 함께 받아 하나의 상담으로 쓴다.
function pickNextBatch(done) {
  const byId = new Map(done.map((entry) => [entry.id, entry]));
  const settled = (section) => isSectionSettled(byId.get(section.id));
  const pool = NAKSHATRA_PHASE_CONSULTATION.filter((section) => !settled(section));
  return { phase: "consultation", slice: pool.slice(0, SECTION_BATCH_SIZE), remaining: pool.length };
}

function countSettled(done) {
  const byId = new Map(done.map((entry) => [entry.id, entry]));
  return NAKSHATRA_SECTIONS.filter((section) => isSectionSettled(byId.get(section.id))).length;
}

function sumSectionChars(done) {
  return done.reduce((sum, entry) => sum + countPaidReportBodyChars(entry?.body), 0);
}

// 완료 조립. 첫 장과 핵심 장이 비면 하나의 통합 상담 계약이 깨진 것이므로 실패로 돌린다.
function buildCompletion(sections) {
  const decks = mergeConsultationSections(sections);
  const totalCharCount = sumSectionChars(sections);
  if (countSettled(sections) !== NAKSHATRA_SECTIONS.length || totalCharCount < Math.max(20000, MIN_TOTAL_CHARS)
    || hasRepeatedReportPassage(sections.map(row => row.body).join("\n"))) throw Object.assign(new Error(LLM_ERROR_MESSAGE), { code: "LLM_FAILED" });
  return { decks, totalCharCount, provider: clean(sections.find(row => row.provider)?.provider), model: clean(sections.find(row => row.model)?.model), topInsights: extractTopInsights(sections.find(row => row.id === "lifeManual")?.body) };
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
      status: { $in: ["generating", "delivery_pending"] },
      $or: [
        { "generationProgress.lockedAt": { $exists: false } },
        { "generationProgress.lockedAt": null },
        { "generationProgress.lockedAt": { $lt: new Date(now - BATCH_LOCK_TTL_MS) } },
      ],
    },
    // Legacy rows can have generationProgress:null; dotted writes fail with Mongo code 28.
    { $set: { generationProgress: { lockedAt: new Date(now), lockToken } } },
    { new: true },
  ).lean());
  return updated ? { ok: true, lockToken, doc: updated } : { ok: false };
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
  if (existing?.status === "generation_failed") return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 409 });
  if (existing && ["generating", "delivery_pending"].includes(existing.status)) {
    return json({ ok: true, sessionId: existing.id, status: "generating", message: "두 개의 별 언어를 한 사람의 이야기로 엮는 중이에요." }, { status: 202 });
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
    generationProgress: { completed: 0, total: NAKSHATRA_SECTIONS.length, phase: "consultation", lockedAt: null, lockToken: "" },
    totalCharCount: 0,
    accessType: access.accessType,
    accessSource: clean(access.source, 40),
    paymentId: clean(access.paymentId, 160),
    messages: [],
    status: "generating",
    generationError: null,
    llmMeta: { resumeBody: { ...body, accessToken: undefined, idempotencyKey }, attempts: {} },
  };
  if (existing) {
    await saveNakshatraDelivery({ id: existing.id, userId: auth.userId, status: { $ne: "completed" } }, { ...seed, updatedAt: now }, sessionId);
  } else {
    try {
      const created = await NakshatraAiConsultation.create(seed);
      if (!created) throw resultStorageUnavailable(sessionId);
      const confirmed = await NakshatraAiConsultation.findOne({ id: sessionId, userId: auth.userId }).lean();
      if (!confirmed || confirmed.idempotencyKey !== idempotencyKey || confirmed.inputHash !== normalized.inputHash || !confirmed.llmMeta?.resumeBody) throw resultStorageUnavailable(sessionId);
    } catch (error) {
      if (error?.code === 11000) {
        const duplicate = await NakshatraAiConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean();
        if (!duplicate) throw resultStorageUnavailable(sessionId);
        if (duplicate?.status === "completed") return json(publicSession(duplicate));
        return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: "두 개의 별 언어를 한 사람의 이야기로 엮는 중이에요." }, { status: 202 });
      }
      throw resultStorageUnavailable(sessionId);
    }
  }

  await startRefundableExecution(env, auth, access, idempotencyKey, sessionId, pricing);

  // 첫 웨이브만 굽고 진행률을 돌려준다. 나머지는 클라가 /generate 를 반복 호출해 채운다.
  // 한 요청 = 1 동시성 웨이브라 엣지 100초 컷에 걸리지 않는다(waitUntil 은 여전히 쓰지 않는다).
  return advanceGeneration({ request, env, auth, sessionId, idempotencyKey, access, pricing });
}

// /start 와 /generate 가 공유하는 진행 엔진. 락 → 1 웨이브 → 부분 저장 → (완료면) 정산.
async function saveNakshatraDelivery(filter, fields, resultId) {
  try {
    const saved = await NakshatraAiConsultation.findOneAndUpdate(filter, { $set: fields }, { new: true }).lean();
    if (!saved) throw resultStorageUnavailable(resultId);
    const confirmed = await NakshatraAiConsultation.findOne({ id: resultId, userId: filter.userId }).lean();
    const equal = (left, right) => stableJson(JSON.parse(JSON.stringify(left))) === stableJson(JSON.parse(JSON.stringify(right)));
    if (!confirmed || Object.keys(fields).some(key => !equal(fields[key], saved[key]) || !equal(saved[key], confirmed[key]))) throw resultStorageUnavailable(resultId);
    return confirmed;
  } catch { throw resultStorageUnavailable(resultId); }
}
async function advanceGeneration({ request, env, auth, sessionId, idempotencyKey, access, pricing }) {
  let lock;
  try { lock = await acquireBatchLock(env, sessionId, auth.userId); } catch { throw resultStorageUnavailable(sessionId); }
  if (!lock.ok) {
    const current = await NakshatraAiConsultation.findOne({ id: sessionId, userId: auth.userId }).lean();
    if (!current) throw resultStorageUnavailable(sessionId);
    return json(publicSession(current), { status: current?.status === "completed" ? 200 : 202 });
  }
  let session = lock.doc;
  const filter = { id: sessionId, userId: auth.userId, "generationProgress.lockToken": lock.lockToken, status: { $ne: "completed" } };
  try {
    const missing = pickNextBatch(readSections(session)).slice;
    const attempts = { ...session.llmMeta?.attempts };
    const exhausted = missing.filter(section => Number(attempts[section.id] || 0) >= SECTION_MAX_ATTEMPTS);
    if (exhausted.length) {
      // 응답·저장 확인이 유실된 실행은 생성 실패로 확정하거나 자동 환불하지 않는다.
      if (exhausted.some(section => Number(session.llmMeta?.generationFailures?.[section.id] || 0) < SECTION_MAX_ATTEMPTS)) throw resultStorageUnavailable(sessionId);
      throw Object.assign(new Error(LLM_ERROR_MESSAGE), { code: "LLM_FAILED" });
    }
    if (missing.length) {
      missing.forEach(section => { attempts[section.id] = Number(attempts[section.id] || 0) + 1; });
      session = await saveNakshatraDelivery(filter, { llmMeta: { ...session.llmMeta, attempts } }, sessionId);
      const context = { summaryText: session.factSummary?.summaryText, question: session.question, writtenMemory: buildWrittenMemory(readSections(session)) };
      let queue = Promise.resolve();
      const recordGenerationFailure = (sectionId) => {
        const write = queue.catch(() => {}).then(async () => {
          const generationFailures = { ...session.llmMeta?.generationFailures };
          generationFailures[sectionId] = Number(generationFailures[sectionId] || 0) + 1;
          session = await saveNakshatraDelivery(filter, { llmMeta: { ...session.llmMeta, generationFailures } }, sessionId);
        });
        queue = write; return write;
      };
      const outcomes = await Promise.allSettled(missing.map(async section => {
        const prompt = buildSectionPrompt(section, context);
        const row = await generateSectionOnce(env, section, prompt, { store: createLlmCacheStore(env), deterministic: true, ttlSeconds: 2592000,
          minChars: section.minChars, keyExtra: `nakshatra-delivery-v4-${section.id}-r${attempts[section.id]}` });
        const identity = session.factSummary?.identity;
        if (!isSectionSettled(row) || (identity?.nakshatraKo && !row.vedicEvidence.includes(identity.nakshatraKo)) || (identity?.sukuyoKo && !row.sukuyoEvidence.includes(identity.sukuyoKo))) { await recordGenerationFailure(section.id); return; }
        const write = queue.catch(() => {}).then(async () => {
          const sections = [...readSections(session).filter(saved => saved.id !== row.id), row].sort((a,b) => NAKSHATRA_SECTIONS.findIndex(spec => spec.id === a.id) - NAKSHATRA_SECTIONS.findIndex(spec => spec.id === b.id));
          if (hasRepeatedReportPassage(sections.map(saved => saved.body).join("\n"))) {
            const generationFailures = { ...session.llmMeta?.generationFailures, [section.id]: Number(session.llmMeta?.generationFailures?.[section.id] || 0) + 1 };
            session = await saveNakshatraDelivery(filter, { llmMeta: { ...session.llmMeta, generationFailures } }, sessionId);
            return;
          }
          session = await saveNakshatraDelivery(filter, { sections, totalCharCount: sumSectionChars(sections), generationProgress: { ...session.generationProgress, completed: countSettled(sections), total: NAKSHATRA_SECTIONS.length, phase: "consultation" } }, sessionId);
        }); queue = write; await write;
      }));
      const failure = outcomes.find(outcome => outcome.status === "rejected");
      if (failure) throw failure.reason;
    }
    if (pickNextBatch(readSections(session)).slice.length) return json(publicSession(session), { status: 202 });
    const completion = buildCompletion(readSections(session));
    if (session.status !== "delivery_pending") session = await saveNakshatraDelivery(filter, { status: "delivery_pending", decks: completion.decks, totalCharCount: completion.totalCharCount,
      llmMeta: { ...session.llmMeta, provider: completion.provider, model: completion.model, topInsights: completion.topInsights } }, sessionId);
    try {
      access = await resolveStartAccess({ request, env, auth, body: session.llmMeta?.resumeBody || { paymentId: session.paymentId }, normalized: { inputHash: session.inputHash }, pricing, idempotencyKey });
    } catch { throw resultStorageUnavailable(sessionId); }
    if (!access.ok) return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED" }, { status: 402 });
    try { await applyUsageOnce({ userId: auth.userId, sessionId, accessType: access.accessType, pricing, source: access.source }); }
    catch { throw resultStorageUnavailable(sessionId); }
    session = await saveNakshatraDelivery(filter, { status: "completed", generationError: null,
      generationProgress: { completed: NAKSHATRA_SECTIONS.length, total: NAKSHATRA_SECTIONS.length, phase: "done", lockToken: "", lockedAt: null },
      messages: [{ role: "user", content: session.question || "(자유 상담)", createdAt: new Date() }, { role: "assistant", content: JSON.stringify(completion.decks), createdAt: new Date() }] }, sessionId);
    await recordSuccessfulUsage(auth, idempotencyKey, access, sessionId, pricing).catch(error => console.warn("[nakshatra-ai] usage record", clean(error?.message, 120)));
    await completeRefundableExecution(env, auth, idempotencyKey, sessionId).catch(error => console.warn("[nakshatra-ai] completion record", clean(error?.message, 120)));
    return json(publicSession(session));
  } catch (error) {
    if (error?.code === "RESULT_STORAGE_UNAVAILABLE") throw error;
    await saveNakshatraDelivery(filter, { status: "generation_failed", generationError: { code: clean(error?.code || "LLM_FAILED"), message: clean(error?.message, 500) } }, sessionId);
    await failRefundableExecution(env, auth, idempotencyKey, sessionId, error);
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  } finally {
    await NakshatraAiConsultation.updateOne(filter, { $set: { "generationProgress.lockToken": "", "generationProgress.lockedAt": null } }).catch(() => {});
  }
}

// POST /generate — 원래 서버 요청의 소유권과 현재 결제 증빙을 다시 확인한다.
async function handleGenerate(request, env) {
  const body = await readJson(request);
  const sessionId = clean(body?.sessionId || body?.attemptId, 120);
  const idempotencyKey = readIdempotencyKey(request, body);
  if (!sessionId) return invalidInput(INVALID_INPUT_MESSAGE);
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
  const originalKey = clean(session.idempotencyKey);
  if (idempotencyKey && idempotencyKey !== originalKey) return invalidInput(INVALID_INPUT_MESSAGE, 409);
  const access = await resolveStartAccess({ request, env, auth, body: session.llmMeta?.resumeBody || { paymentId: session.paymentId }, normalized: { inputHash: session.inputHash }, pricing, idempotencyKey: originalKey });
  if (!access.ok) return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED" }, { status: 402 });
  return advanceGeneration({ request, env, auth, sessionId, idempotencyKey: originalKey, access, pricing });

}

async function handleResult(request, env, pathId = "") {
  const url = new URL(request.url);
  const rawId = pathId || url.searchParams.get("attemptId") || url.searchParams.get("id") || "";
  const resultId = clean(decodeURIComponent(rawId), 120);

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
    ...(resultId ? { $or: [{ id: resultId }, { idempotencyKey: resultId }] } : { status: { $in: ["generating", "delivery_pending"] } }),
  }).lean();
  if (!consultation) return json({ ok: false, reason: "RESULT_NOT_FOUND", message: RESULT_NOT_FOUND_MESSAGE }, { status: 404 });

  const status = clean(consultation.status);
  if (["generating", "delivery_pending"].includes(status)) {
    const access = await resolveStartAccess({ request, env, auth, body: consultation.llmMeta?.resumeBody || { paymentId: consultation.paymentId }, normalized: { inputHash: consultation.inputHash }, pricing: getPricing(), idempotencyKey: consultation.idempotencyKey });
    if (!access.ok) return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED" }, { status: 402 });
    return json(publicSession(consultation), { status: 202, headers: { "Retry-After": "3" } });
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
    if (error?.code === "RESULT_STORAGE_UNAVAILABLE") return json(resultStorageFailurePayload(error), { status: 503 });
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
