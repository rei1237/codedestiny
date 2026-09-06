import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, isTransientMongoError, mongoose, withMongoRetry } from "../lib/db.js";
import {
  NeoOperationRoomConsultation,
  PaidExecutionRecord,
  Payment,
  User,
} from "../lib/models.js";
import { findMoonstoneSpendEvidence } from "../lib/moonstone-spend-proof.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canAccessPaidFeature, PAID_FEATURE_ACCESS_USER_PROJECTION } from "../lib/paid-feature-access.js";
import { callGeminiText } from "../lib/gemini.js";
import { SYNC_LLM_TIMEOUT_CEILING_MS } from "../lib/sync-llm-timeout.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { calculateLifeBookAiSaju } from "../lib/life-book-ai-saju.js";
import { calculateZiweiAiChart, describeBrightness, formatStarWithBrightness } from "../lib/ziwei-ai-chart.js";
import { calculateVedicAiChart } from "../lib/vedic-ai-chart.js";
import { prepareAstroPremiumCalculation } from "../lib/astro-premium-generator.js";
import {
  completeServiceExecution,
  failServiceExecution,
  startServiceExecution,
} from "../lib/service-execution-task.js";
import {
  buildNeoCompat,
  NEO_COMPAT_METHODS,
  NEO_COMPAT_TOPIC_KEY,
  neoVedicMoonLongitude,
  NEO_RELATIONSHIP_STATUSES,
  normalizeTopicKey,
} from "../lib/neo-operation-room-compat.js";
import { assembleNakshatraCompat } from "../lib/nakshatra-compat.js";
import { buildNeoAstroSynastry } from "../lib/neo-synastry.js";
import {
  buildPreviousAdviceLog,
  neoCompatInitialSections,
  NEO_INITIAL_SECTIONS,
  NEO_REFINED_SECTIONS,
  buildNeoInitialSectionPrompt,
  buildNeoRefinedSectionPrompt,
  parseNeoSectionResponse,
  mergeNeoInitialSections,
  mergeNeoRefinedSections,
} from "../lib/neo-operation-room-prompt.js";

const SERVICE_KEY = "neo-operation-room";
const FEATURE_KEY = "neo-operation-room-consultation";
const ACCESS_TOKEN_TYPE = "neo-operation-room-access";
const ACCESS_TOKEN_TTL = "45m";
// 백그라운드 생성(14챕터)이 완주하는 최악 시간을 덮는 신선도 창. 이 창 안의 재-POST는 2차 생성을
// 기동하지 않고 202로 흡수돼 이중 작업/이중 과금을 막는다.
const GENERATION_FRESHNESS_MS = 300000;
const TITLE = "네오의 팩폭 작전실";
const LOGIN_REQUIRED_MESSAGE = "작전을 시작하려면 로그인이 필요하다. 로그인하고 다시 앉아라.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제나 이용권 확인이 끝나지 않았다. 권한을 확인한 뒤 다시 시도해라.";
const INVALID_INPUT_MESSAGE = "작전 정보가 부족하다. 출생정보, 분석 방식, 주제, 강도, 질문을 다시 확인해라.";
const CALCULATION_ERROR_MESSAGE = "운명의 계산 지도를 펼치는 중 문제가 생겼다. 입력값을 확인하고 다시 시도해라.";
const LLM_ERROR_MESSAGE = "작전 브리핑 작성에 실패했다. 이용권이나 결제 권한은 보존되니 다시 시도해라.";
const SERVER_ERROR_MESSAGE = "작전실을 여는 중 문제가 생겼다. 결제 금액은 차감하지 않았다.";
const RESULT_NOT_FOUND_MESSAGE = "저장된 작전 브리핑을 찾지 못했다.";
const METHODS = new Set(["saju", "ziwei", "vedic", "astrology"]);
const INTENSITIES = new Set(["soft", "standard", "roar"]);
const RELATIONSHIP_STATUSES = new Set(NEO_RELATIONSHIP_STATUSES);
const MIN_QUESTION_LENGTH = 12;

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

function isValidDateKey(value) {
  const raw = clean(value, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day && year >= 1900 && year <= 2100;
}

function normalizeGender(value) {
  const text = clean(value).toLowerCase();
  if (["male", "m", "남", "남성"].includes(text)) return "male";
  if (["female", "f", "여", "여성"].includes(text)) return "female";
  if (["unknown", "none", "미선택"].includes(text)) return "unknown";
  return "";
}

function normalizeBirthInfo(source = {}) {
  const birth = asObject(source.birthInput || source.userProfile || source.birthInfo || source.birth);
  const birthPlace = asObject(birth.birthPlace || birth.place || source.birthPlace);
  const latitude = numberOrNull(birth.latitude ?? birth.lat ?? birthPlace.latitude ?? birthPlace.lat);
  const longitude = numberOrNull(birth.longitude ?? birth.lng ?? birth.lon ?? birthPlace.longitude ?? birthPlace.lng ?? birthPlace.lon);
  const birthTimeUnknown = birth.birthTimeUnknown === true || birth.birthTimeKnown === false;
  return {
    name: clean(birth.name || birth.nickname, 80),
    gender: normalizeGender(birth.gender),
    birthDate: clean(birth.birthDate, 10),
    birthTime: birthTimeUnknown ? "" : clean(birth.birthTime, 5),
    birthTimeUnknown,
    calendarType: clean(birth.calendarType).toLowerCase() === "lunar" ? "lunar" : "solar",
    city: clean(birth.city || birthPlace.city || birth.birthCity, 80),
    country: clean(birth.country || birthPlace.country, 80),
    timezone: clean(birth.timezone || birth.tz || birthPlace.timezone || birthPlace.timeZone, 80),
    latitude,
    longitude,
  };
}

function withBirthPlace(birthInfo) {
  return {
    ...birthInfo,
    birthPlace: {
      city: birthInfo.city,
      country: birthInfo.country,
      timezone: birthInfo.timezone,
      latitude: birthInfo.latitude,
      longitude: birthInfo.longitude,
    },
  };
}

/** 궁합을 지원하는 술수. 교차 엔진이 있는 술수만 들어간다(정본은 궁합 모듈이 들고 있다). */
const COMPAT_METHODS = new Set(NEO_COMPAT_METHODS);

/**
 * 궁합 모드(상대 명반 동반)로 볼지 판정한다.
 *
 * 🔴 연애·재회 주제에서만 궁합을 연다. 궁합 챕터 4개가 관계 전용이기 때문이다 — 특히
 *    교전 패턴 챕터는 연인 간 대화를 재구성하므로, 돈·직업 주제에서 열리면 상담이 주제를
 *    통째로 벗어난다. 주제는 자유 문자열로 오므로 normalizeTopicKey 로 정규화해 본다.
 * 🔴 자미두수에서만 궁합을 연다. 재사용하는 궁합 엔진(master-love-codex-compat)이 명반 교차를
 *    전제로 하기 때문이고, 사주·베다·점성술에는 대응하는 결정론 엔진이 없다.
 * 🔴 조건을 못 채운 상대 정보는 422 로 막지 않고 **버린다.** 이 값은 전부 선택 입력이라,
 *    거부하면 상대 칸을 실수로 건드린 사용자가 기존 1인 분석까지 못 하게 된다.
 */
function normalizePartnerBirthInfo(body, selectedMethod, topic) {
  if (!COMPAT_METHODS.has(selectedMethod)) return null;
  if (normalizeTopicKey(topic) !== NEO_COMPAT_TOPIC_KEY) return null;
  const source = body.partnerBirthInput || body.partnerBirthInfo || body.partner;
  if (!source || typeof source !== "object") return null;
  const partner = normalizeBirthInfo({ birthInput: source });
  if (!isValidDateKey(partner.birthDate)) return null;
  if (!partner.gender) return null;
  if (!partner.birthTimeUnknown && !partner.birthTime) return null;
  return withBirthPlace(partner);
}

function normalizeInput(body = {}) {
  const selectedMethod = clean(body.selectedMethod || body.method, 30);
  const topic = clean(body.topic, 120);
  const intensity = clean(body.intensity, 30);
  const question = clean(body.question || body.userQuestion, 1200);
  const birthInfo = normalizeBirthInfo(body);
  if (!METHODS.has(selectedMethod)) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!topic) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!INTENSITIES.has(intensity)) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (question.length < MIN_QUESTION_LENGTH) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!isValidDateKey(birthInfo.birthDate)) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!birthInfo.gender) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!birthInfo.birthTimeUnknown && !birthInfo.birthTime) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if ((selectedMethod === "vedic" || selectedMethod === "astrology") && !birthInfo.timezone) {
    return { ok: false, message: INVALID_INPUT_MESSAGE };
  }
  const partnerBirthInfo = normalizePartnerBirthInfo(body, selectedMethod, topic);
  const relationshipStatusRaw = clean(body.relationshipStatus, 20);
  const relationshipStatus = RELATIONSHIP_STATUSES.has(relationshipStatusRaw) ? relationshipStatusRaw : "";
  const input = {
    selectedMethod,
    topic,
    intensity,
    question,
    birthInfo: withBirthPlace(birthInfo),
  };
  // 🔴 궁합 모드가 아닐 때는 키를 **넣지 않는다**. null 이라도 실으면 stableJson 이 바뀌어
  //    기존 1인 상담의 inputHash 가 전부 갈리고, 30일 LLM 캐시가 통째로 무효화된다.
  if (partnerBirthInfo) {
    input.partnerBirthInfo = partnerBirthInfo;
    if (relationshipStatus) input.relationshipStatus = relationshipStatus;
  }
  return {
    ok: true,
    input,
    inputHash: sha256(stableJson(input)),
  };
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

function getPricing() {
  const result = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  const pricing = result?.pricing || null;
  const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 0);
  const amountKRW = Number(pricing?.amountKRW || pricing?.paymentAmount || coinPrice * 100);
  if (!result?.ok || !Number.isInteger(coinPrice) || coinPrice <= 0 || !Number.isInteger(amountKRW) || amountKRW <= 0) {
    const error = new Error("neo operation room price not found");
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

// 폴링(/result)에서 로그인 세션이 일시적으로 확인되지 않을 때, 헤더/쿼리의 네오 액세스 토큰으로 신원을 폴백한다.
// 서명·TTL·serviceKey/featureKey가 검증된 토큰의 userId만 신뢰하며, 그 값으로 자기 세션만 조회한다(조회 전용).
async function resolveResultUserIdFromToken(request, env) {
  const url = new URL(request.url);
  const token = clean(
    request.headers.get("x-neo-operation-room-access-token") || url.searchParams.get("accessToken"),
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
  const existing = await withMongoRetry(env, () => NeoOperationRoomConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean());
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

// 🔴 예전에는 클라이언트가 되돌려 준 ledgerId/transactionId 가 **유효 ObjectId 일 때만** 조회했다.
//    결제 V2 는 성공 응답에 ledgerId 를 비워 보내고 transactionId 자리에 requestId 문자열을 싣기
//    때문에(compat.legacyMoonstoneEnvelope) 두 분기가 모두 건너뛰어져 **월정석이 차감된 사용자가
//    항상 402 PAYMENT_VERIFY_FAILED** 를 받았다. 이제 증빙은 클라이언트 에코가 아니라 원장을
//    직접 읽는 정본(worker/lib/moonstone-spend-proof.js)이 판정한다.
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
  const token = clean(body?.accessToken || request.headers.get("x-neo-operation-room-access-token"));
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

function compactObject(value, maxEntries = 10) {
  const source = asObject(value);
  return Object.fromEntries(Object.entries(source).filter(([, item]) => item !== undefined && item !== null && item !== "").slice(0, maxEntries));
}

const EVIDENCE_TOKEN_ALIASES = Object.freeze({
  Sun: "태양", Moon: "달", Mars: "화성", Mercury: "수성", Jupiter: "목성", Venus: "금성", Saturn: "토성", Rahu: "라후", Ketu: "케투",
  Aries: "양자리", Taurus: "황소자리", Gemini: "쌍둥이자리", Cancer: "게자리", Leo: "사자자리", Virgo: "처녀자리",
  Libra: "천칭자리", Scorpio: "전갈자리", Sagittarius: "사수자리", Capricorn: "염소자리", Aquarius: "물병자리", Pisces: "물고기자리",
});

function buildEvidenceTokens(values) {
  const tokens = [];
  for (const value of values) {
    const token = clean(value, 60);
    if (!token || tokens.includes(token)) continue;
    // 한 글자 한글 토큰(지지 등)은 일반 단어와 오탐 매칭되므로 제외 (한자 단일 글자는 허용)
    if (token.length < 2 && !/[一-鿿]/.test(token)) continue;
    tokens.push(token);
    const alias = EVIDENCE_TOKEN_ALIASES[token];
    if (alias && !tokens.includes(alias)) tokens.push(alias);
  }
  return tokens.slice(0, 24);
}

function compactSajuLuckCycle(cycle) {
  if (!cycle || typeof cycle !== "object") return null;
  return compactObject({
    pillar: cycle.pillar,
    startAge: cycle.startAge,
    endAge: cycle.endAge,
    startYear: cycle.startYear,
    endYear: cycle.endYear,
    stemTenGod: cycle.stemTenGod,
    isCurrent: cycle.isCurrent === true ? true : undefined,
  }, 8);
}

function summarizeSajuMajorLuck(majorLuck) {
  const source = asObject(majorLuck);
  if (source.available === false) {
    return { available: false, reason: clean(source.reason, 200) };
  }
  const currentCycle = compactSajuLuckCycle(source.currentCycle);
  return compactObject({
    available: true,
    direction: source.direction,
    startSolarDate: source.startSolarDate,
    currentCycle,
    cycles: safeArray(source.cycles).map(compactSajuLuckCycle).filter(Boolean).slice(0, 6),
  }, 6);
}

function summarizeSaju(chart) {
  const majorLuck = summarizeSajuMajorLuck(chart.majorLuck);
  const currentCycle = majorLuck?.currentCycle || null;
  const yearlyLuck = safeArray(chart.yearlyLuck).slice(0, 4);
  const thisYear = yearlyLuck[0] || null;
  return {
    method: "saju",
    summary: "사주 엔진이 산출한 사주팔자, 일간, 오행 분포, 십성 분포, 용신, 합충, 대운과 세운 흐름을 근거로 삼는다.",
    evidenceSummary: [
      `연월일시 기둥: ${[chart.yearPillar, chart.monthPillar, chart.dayPillar, chart.hourPillar].filter(Boolean).join(" / ")}`,
      chart.dayMaster ? `일간: ${chart.dayMaster}` : "",
      chart.strength ? `신강약 판단: ${chart.strength}` : "",
      currentCycle?.pillar ? `현재 대운: ${currentCycle.pillar} (${currentCycle.startAge}-${currentCycle.endAge}세, ${majorLuck.direction || ""})`.trim() : "",
      thisYear?.pillar ? `올해 세운: ${thisYear.year}년 ${thisYear.pillar}${thisYear.stemTenGod ? ` (${thisYear.stemTenGod})` : ""}` : "",
      chart.usefulGod ? `용신 방향: ${chart.usefulGod}` : "",
    ].filter(Boolean).join("\n"),
    pillars: compactObject({
      year: chart.yearPillar,
      month: chart.monthPillar,
      day: chart.dayPillar,
      hour: chart.hourPillar,
      dayMaster: chart.dayMaster,
    }),
    fiveElements: chart.fiveElements || null,
    tenGods: chart.tenGods || null,
    strength: clean(chart.strength, 200) || null,
    usefulGod: clean(chart.usefulGod, 200) || null,
    unfavorableGod: clean(chart.unfavorableGod, 200) || null,
    seasonalBalance: compactObject(chart.seasonalBalance, 6),
    natalInteractions: compactObject(chart.natalInteractions, 6),
    strongestTenGods: safeArray(chart.fortuneFacts?.strongestTenGods).slice(0, 5),
    majorLuck,
    yearlyLuck,
    evidenceTokens: buildEvidenceTokens([
      chart.yearPillar,
      chart.monthPillar,
      chart.dayPillar,
      chart.hourPillar,
      chart.dayMaster,
      currentCycle?.pillar,
      currentCycle?.stemTenGod,
      thisYear?.pillar,
      thisYear?.stemTenGod,
      ...safeArray(chart.fortuneFacts?.strongestTenGods).map((item) => item?.name),
    ]),
    calculationMeta: compactObject(chart.calculationMeta, 6),
  };
}

const ZIWEI_TRANSFORMATION_LABELS = { huaLu: "화록", huaQuan: "화권", huaKe: "화과", huaJi: "화기" };

// 궁의 별 이름 배열에 brightness(강약) 표기를 붙인다. 표에 없는 별은 이름만(가짜 강약 생성 금지).
function ziweiStarsWithBrightness(palace) {
  const brightness = palace?.brightness && typeof palace.brightness === "object" ? palace.brightness : {};
  const stars = [
    ...safeArray(palace?.mainStars),
    ...safeArray(palace?.assistantStars),
    ...safeArray(palace?.maleficStars),
  ];
  return stars.map((name) => formatStarWithBrightness(name, brightness[name]));
}

// evidenceSummary는 900자로 잘리므로(normalizeEvidence), 심볼만 붙인 한 줄 압축 표기를 쓴다.
function ziweiStarsWithBrightnessCompact(palace) {
  const brightness = palace?.brightness && typeof palace.brightness === "object" ? palace.brightness : {};
  const stars = [
    ...safeArray(palace?.mainStars),
    ...safeArray(palace?.assistantStars),
    ...safeArray(palace?.maleficStars),
  ];
  return stars
    .map((name) => {
      const desc = describeBrightness(brightness[name]);
      return desc ? `${name}${desc.symbol}` : name;
    })
    .join("·");
}

function summarizeZiwei(chart) {
  const lifePalaceName = clean(chart?.mingGong || chart?.lifePalace, 40);
  const bodyPalaceName = clean(chart?.shenGong || chart?.bodyPalace, 40);
  const palaces = safeArray(chart?.palaces).slice(0, 12);
  const lifePalaceDetail = palaces.find((palace) => palace?.name && palace.name === lifePalaceName) || null;
  const fourTransformations = asObject(chart?.fourTransformations);
  const transformationLine = Object.entries(ZIWEI_TRANSFORMATION_LABELS)
    .map(([key, label]) => (fourTransformations[key] ? `${label}: ${fourTransformations[key]}` : ""))
    .filter(Boolean)
    .join(", ");
  const yearlyLuck = chart?.yearlyLuck || chart?.yearlyFlow || chart?.annualLuck || null;
  const brightnessSummaryLine = palaces
    .map((palace) => {
      const stars = ziweiStarsWithBrightnessCompact(palace);
      return stars ? `${palace.name}:${stars}` : "";
    })
    .filter(Boolean)
    .join(" / ");
  return {
    method: "ziwei",
    summary: clean(chart?.chartSummary || "자미두수 엔진이 산출한 명궁, 신궁, 사화, 주요 별 배치와 궁위 흐름을 근거로 삼는다.", 900),
    evidenceSummary: [
      lifePalaceName ? `명궁: ${lifePalaceName}${lifePalaceDetail?.earthlyBranch ? `(${lifePalaceDetail.earthlyBranch}궁)` : ""}${lifePalaceDetail ? ` — 주성: ${ziweiStarsWithBrightness(lifePalaceDetail).join(", ") || "무주성"}` : ""}` : "",
      bodyPalaceName ? `신궁: ${bodyPalaceName}` : "",
      transformationLine ? `생년 사화 — ${transformationLine}` : "",
      yearlyLuck?.year ? `올해(${yearlyLuck.year}년) 유년궁: ${yearlyLuck.palaceName || yearlyLuck.earthlyBranch || ""}${safeArray(yearlyLuck.mainStars).length ? ` (주성: ${safeArray(yearlyLuck.mainStars).join(", ")})` : ""}` : "",
      brightnessSummaryLine ? `12궁 강약(◎묘·O득·▲리·△평·X함): ${brightnessSummaryLine}` : "",
    ].filter(Boolean).join("\n") || "자미두수 명반 계산 결과를 근거로 삼는다.",
    mingGong: lifePalaceName || null,
    shenGong: bodyPalaceName || null,
    palaces,
    fourTransformations: compactObject(fourTransformations, 4),
    keyStars: safeArray(chart?.keyFeatures?.keyStars).slice(0, 8),
    strongestPalaces: safeArray(chart?.keyFeatures?.strongestPalaces).slice(0, 3),
    sanFangSiZheng: compactObject({
      core: chart?.sanFangSiZheng?.core,
      lifePalace: lifePalaceName ? asObject(chart?.sanFangSiZheng?.byPalace)[lifePalaceName] : undefined,
    }, 2),
    majorLuck: safeArray(chart?.majorLuck || chart?.decadeLuck).slice(0, 12),
    yearlyLuck,
    evidenceTokens: buildEvidenceTokens([
      lifePalaceDetail?.earthlyBranch,
      bodyPalaceName,
      ...safeArray(lifePalaceDetail?.mainStars),
      ...Object.values(fourTransformations),
      yearlyLuck?.palaceName,
      ...safeArray(yearlyLuck?.mainStars),
      ...safeArray(chart?.keyFeatures?.keyStars),
    ]),
    calculationMeta: compactObject(chart?.calculationMeta, 8),
  };
}

function summarizeVedic(chart) {
  return {
    method: "vedic",
    summary: clean(chart?.chartSummary || "베다점 엔진이 산출한 라그나, 달, 태양, 행성, 다샤와 고차라 흐름을 근거로 삼는다.", 900),
    evidenceSummary: [
      chart?.lagna ? `라그나: ${JSON.stringify(chart.lagna)}` : "",
      chart?.moon ? `달: ${JSON.stringify(chart.moon)}` : "",
      chart?.dasha?.current?.lord ? `현재 마하다샤: ${chart.dasha.current.lord} (${chart.dasha.current.startDate} ~ ${chart.dasha.current.endDate}까지)` : "",
      chart?.dasha?.currentAntardashaPeriod?.lord ? `현재 안타르다샤: ${chart.dasha.currentAntardashaPeriod.lord} (~${chart.dasha.currentAntardashaPeriod.endDate}까지)` : "",
    ].filter(Boolean).join("\n") || "베다 차트 계산 결과를 근거로 삼는다.",
    lagna: chart?.lagna || null,
    moon: chart?.moon || null,
    sun: chart?.sun || null,
    planets: safeArray(chart?.planets).slice(0, 12),
    houses: safeArray(chart?.houses).slice(0, 12),
    dasha: chart?.dasha ? compactObject({
      system: chart.dasha.system,
      birthNakshatra: chart.dasha.birthNakshatra,
      currentMahadasha: chart.dasha.current,
      currentAntardasha: chart.dasha.currentAntardashaPeriod,
      upcoming: safeArray(chart.dasha.timeline)
        .filter((period) => period?.endDate >= (chart.dasha.current?.startDate || ""))
        .slice(0, 4)
        .map((period) => ({ lord: period.lord, startDate: period.startDate, endDate: period.endDate })),
    }, 6) : null,
    transits: chart?.transits || null,
    yogas: safeArray(chart?.yogas).slice(0, 10),
    evidenceTokens: buildEvidenceTokens([
      chart?.lagna?.rashi || chart?.lagna?.sign,
      chart?.lagna?.rashiKo,
      chart?.moon?.sign,
      chart?.moon?.nakshatra,
      chart?.sun?.sign,
      chart?.dasha?.current?.lord,
      chart?.dasha?.currentAntardashaPeriod?.lord,
    ]),
    calculationMeta: compactObject(chart?.calculationMeta, 8),
  };
}

function summarizeAstrology(prepared) {
  const chart = prepared?.localAstroChartJson || {};
  const chartBody = chart.chart || chart;
  return {
    method: "astrology",
    summary: "점성술 계산 엔진이 산출한 행성, 하우스, 각도, 트랜짓 흐름을 근거로 삼는다.",
    evidenceSummary: [
      chartBody?.sun ? `태양: ${JSON.stringify(chartBody.sun)}` : "",
      chartBody?.moon ? `달: ${JSON.stringify(chartBody.moon)}` : "",
      chartBody?.ascendant ? `상승궁: ${JSON.stringify(chartBody.ascendant)}` : "",
    ].filter(Boolean).join("\n") || "점성술 차트 계산 결과를 근거로 삼는다.",
    sun: chartBody?.sun || null,
    moon: chartBody?.moon || null,
    ascendant: chartBody?.ascendant || chartBody?.asc || null,
    planets: safeArray(chartBody?.planets).slice(0, 12),
    houses: safeArray(chartBody?.houses).slice(0, 12),
    aspects: safeArray(chartBody?.aspects).slice(0, 18),
    timingInsights: chart?.timingInsights || null,
    evidenceTokens: buildEvidenceTokens([
      chartBody?.sun?.sign,
      chartBody?.moon?.sign,
      (chartBody?.ascendant || chartBody?.asc)?.sign,
      ...safeArray(chartBody?.planets).slice(0, 6).flatMap((planet) => [planet?.name, planet?.sign]),
    ]),
    calculationMode: clean(chart?.calculationMode || prepared?.resolved?.source, 120),
  };
}

/**
 * 베다 아쉬타쿠타 교차. 궁합 모듈이 nakshatra-* 를 직접 물 수 없어(그 파일 머리말 참고)
 * 라우트가 계산해 주입한다.
 * 🔴 sukuyo 는 넘기지 않는다 — 네오는 숙요를 계산하지 않는다. 넘기지 않으면
 *    assembleNakshatraCompat 이 dongyang 을 null 로 두고 아쉬타쿠타만 성립시킨다.
 */
/**
 * 점성술 계산기가 받는 출생 입력 모양. 1인 경로가 쓰던 것과 같은 매핑이며, 궁합에서 상대에게도
 * 그대로 쓴다 — 상대만 다른 모양으로 넣으면 두 차트가 다른 규칙으로 세워진다.
 */
function astroBirthInput(birth) {
  return {
    birthDate: birth.birthDate,
    birthTime: birth.birthTimeUnknown ? "12:00" : birth.birthTime,
    birthTimeUnknown: birth.birthTimeUnknown,
    gender: birth.gender,
    timezone: birth.timezone,
    birthPlace: birth.city,
    latitude: birth.latitude,
    longitude: birth.longitude,
    location: birth.birthPlace,
  };
}

function buildNeoVedicCompat(selfChart, partnerChart, partnerInfo) {
  const selfMoon = neoVedicMoonLongitude(selfChart);
  const partnerMoon = neoVedicMoonLongitude(partnerChart);
  if (!Number.isFinite(selfMoon) || !Number.isFinite(partnerMoon)) return null;
  return assembleNakshatraCompat(
    { moonLon: selfMoon },
    { moonLon: partnerMoon, gender: clean(partnerInfo?.gender, 20) },
  );
}

/**
 * 궁합 확정값을 붙인다. 🔴 상대가 없으면 summary 를 **그대로** 돌려준다 — 1인 경로는
 * 이 함수를 지나도 한 바이트도 달라지지 않아야 한다.
 */
function withCompat(summary, input, method, selfChart, partnerChart, engineExtras = {}) {
  if (!partnerChart) return summary;
  const compat = buildNeoCompat({
    method,
    selfChart,
    partnerChart,
    ...engineExtras,
    relationshipStatus: input.relationshipStatus || "",
    partnerGender: input.partnerBirthInfo?.gender || "",
  });
  return compat ? { ...summary, compat } : summary;
}

async function calculateMethodSummary(env, normalized, request) {
  const input = normalized.input;
  const partner = input.partnerBirthInfo || null;
  if (input.selectedMethod === "saju") {
    const selfChart = calculateLifeBookAiSaju(input.birthInfo);
    const partnerChart = partner ? calculateLifeBookAiSaju(partner) : null;
    return withCompat(summarizeSaju(selfChart), input, "saju", selfChart, partnerChart);
  }
  if (input.selectedMethod === "ziwei") {
    const year = new Date().getFullYear();
    const selfChart = calculateZiweiAiChart({ birthInfo: input.birthInfo }, { year });
    const partnerChart = partner ? calculateZiweiAiChart({ birthInfo: partner }, { year }) : null;
    return withCompat(summarizeZiwei(selfChart), input, "ziwei", selfChart, partnerChart);
  }
  if (input.selectedMethod === "vedic") {
    const vedicChart = (birthInfo) => calculateVedicAiChart(env, {
      birthInfo,
      topic: input.topic,
      userQuestion: input.question,
    }, { requestUrl: request.url });
    // 두 차트를 병렬로 세운다. 천체력 파일을 네트워크로 가져오는 구간이 겹치게 하려는 것이다.
    //
    // 🔴 이 시간은 SYNC_LLM_TIMEOUT_CEILING_MS(85s) 예산을 깎지 않는다 — 그 시계는
    //    generateBriefing 안에서 이 함수가 끝난 **뒤에** 시작한다. 걸리는 것은
    //    EDGE_RESPONSE_DEADLINE_MS(100s) 와의 차이, 즉 인증·DB·차트·후처리가 나눠 쓰는
    //    15초 여유다(worker/lib/sync-llm-timeout.js). 차트가 그 여유를 먹으면 결제까지
    //    마친 사용자가 라우트의 실패 처리도 못 받고 엣지에서 끊긴다.
    //
    // 실측(2026-08-26, staging): 상대 차트 한 장을 더 세우는 비용은 **측정 한계 이하**다.
    //   웜 isolate 에서 Swiss 계산 있는 응답 400~451ms vs 계산 없는 같은 라우터 응답
    //   398~428ms — 차이가 노이즈 안이다. 콜드 isolate 의 1.0~1.3초는 WASM 초기화와
    //   천체력 fetch 값인데, swissPromise 가 isolate 단위로 메모이즈하므로 같은 요청의
    //   두 번째 차트는 그 값을 다시 내지 않는다.
    //   재현: POST https://staging.code-destiny.com/api/nakshatra/resolve 에 매번 다른 분(minute)을
    //   주고 같은 라우터의 빈 바디(400) 응답과 번갈아 잰다. 인증·결제·LLM 이 필요 없는 경로다.
    const [selfChart, partnerChart] = await Promise.all([
      vedicChart(input.birthInfo),
      partner ? vedicChart(partner) : Promise.resolve(null),
    ]);
    return withCompat(summarizeVedic(selfChart), input, "vedic", selfChart, partnerChart, {
      // 아쉬타쿠타는 여기서 계산해 넣는다 — neo-operation-room-compat.js 가 nakshatra-* 를 직접
      // 물면 번들러 밖(가드·테스트)에서 로드되지 않는다. 그 이유는 그 파일 머리말에 적혀 있다.
      vedicCompat: partnerChart ? buildNeoVedicCompat(selfChart, partnerChart, partner) : null,
    });
  }
  if (partner) {
    // 베다와 같은 이유로 병렬 — 위 주석의 15초 여유 설명이 그대로 적용된다.
    const [selfPrepared, partnerPrepared] = await Promise.all([
      prepareAstroPremiumCalculation(env, { birthInput: astroBirthInput(input.birthInfo) }, { requestUrl: request.url }),
      prepareAstroPremiumCalculation(env, { birthInput: astroBirthInput(partner) }, { requestUrl: request.url }),
    ]);
    return withCompat(
      summarizeAstrology(selfPrepared),
      input,
      "astrology",
      selfPrepared,
      partnerPrepared,
      // 시나스트리도 라우트가 계산해 주입한다 — swiss-ephemeris 는 WASM 을 끌고 오므로
      // 궁합 모듈이 물면 가드가 그 모듈을 못 읽는다.
      { synastry: buildNeoAstroSynastry(selfPrepared, partnerPrepared) },
    );
  }
  const birth = input.birthInfo;
  return summarizeAstrology(await prepareAstroPremiumCalculation(env, {
    birthInput: {
      birthDate: birth.birthDate,
      birthTime: birth.birthTimeUnknown ? "12:00" : birth.birthTime,
      birthTimeUnknown: birth.birthTimeUnknown,
      gender: birth.gender,
      timezone: birth.timezone,
      birthPlace: birth.city,
      latitude: birth.latitude,
      longitude: birth.longitude,
      location: birth.birthPlace,
    },
  }, { requestUrl: request.url }));
}

// 🔴 맨 영어 단어 provider/system/prompt 를 여기 두면 안 된다. 2차 명령서의 neoReview 챕터는
// "[사용자 현실 점검 답변]을 직접 인용해 시작"하도록 프롬프트가 강제하는데(neo-operation-room-prompt.js
// 의 neoReview rules), 사용자 자유입력(최대 1800자)에 그 흔한 단어가 하나만 들어가도 인용한 챕터가
// 통째로 폐기됐다 — operationTitle 까지 같이 사라진다. 내부 누출 탐지는 실제 내부 식별자와
// 한국어 지시어로 좁힌다(karma-destiny-ai.js·new-year-ai.js 의 FORBIDDEN_RESULT_PATTERN 과 같은 계열).
function hasForbiddenResultText(value) {
  const text = JSON.stringify(value || "");
  return /\b(mock|dry-run|systemPrompt|rawProviderDebug|providerReason|maxOutputTokens)\b|시스템\s*(?:메시지|지시)/i.test(text);
}

function briefingCitesEvidence(briefing, tokens) {
  const text = [
    ...safeArray(briefing?.methodEvidence).map((item) => clean(item?.summary, 2000)),
    clean(briefing?.bluntTruth, 2000),
    clean(briefing?.frontlineSummary, 3000),
  ].join("\n");
  if (!text) return false;
  return tokens.some((token) => token && text.includes(token));
}

// 챕터 동시 생성(레이트리밋·subrequest 안전 상한). ziwei-deep-report 패턴 재사용.
const NEO_SECTION_CONCURRENCY = 4;

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

// 문자열 텍스트 총량(간이) — 파국적 생성 실패 감지용.
function countNeoTextChars(value) {
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countNeoTextChars(item), 0);
  if (value && typeof value === "object") return Object.values(value).reduce((sum, item) => sum + countNeoTextChars(item), 0);
  return 0;
}

const NEO_SECTION_BASE_TOKENS = 8192;
const NEO_SECTION_TIMEOUT_MS = 45000;

// 챕터 하나 생성 → { id, parsed, provider, model, ok }. 실패해도 parsed={}로 폴백(전체 실패 방지).
// 잘림(MAX_TOKENS)이나 빈 파싱이면 캐시를 우회해 1회 재시도한다(잘린 문장이 결과에 남는 것 방지).
//
// 🔴 이 루프를 공유 헬퍼 callGeminiJsonWithRetry 로 갈아끼우지 말 것. 그쪽은 잘림에만 재시도하고
// (빈 파싱은 재시도 안 함) 재시도에도 cache 를 그대로 넘긴다 — 여기서 필요한 두 가지를 다 잃는다.
// deadlineAt 을 주면 남은 예산 안에서만 호출한다(엣지 100s 전에 라우트가 먼저 판정하도록).
async function generateNeoSectionOnce(env, section, prompt, cacheConfig, deadlineAt = 0) {
  try {
    let ai = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      // 🔴 예산 검사는 여기 한 곳뿐이다. 시작 가드와 재시도 가드를 따로 두지 말 것(중첩 사전검사).
      const remaining = deadlineAt > 0 ? deadlineAt - Date.now() : NEO_SECTION_TIMEOUT_MS;
      // 남은 예산이 의미 있는 생성을 담기엔 모자라면 시작하지 않는다 — 시작해 봐야 엣지가 끊는다.
      if (remaining < 5000) break;
      // 재시도는 한 챕터분이 온전히 남았을 때만. 반쯤 가다 끊기면 이미 받아 둔 응답까지 버린다.
      if (attempt > 0 && remaining < NEO_SECTION_TIMEOUT_MS) break;
      const useCache = attempt === 0 && cacheConfig;
      ai = await callGeminiText(env, prompt, {
        // 잘렸으면 다음 시도에서 출력 상한을 올린다(같은 상한으로 다시 부르면 또 잘린다).
        maxOutputTokens: attempt === 0 ? NEO_SECTION_BASE_TOKENS : Math.round(NEO_SECTION_BASE_TOKENS * 1.3),
        temperature: 0.65,
        thinkingBudget: 0,
        timeoutMs: Math.min(NEO_SECTION_TIMEOUT_MS, remaining),
        // 순수 JSON 을 강제해 코드펜스·서론으로 토큰을 낭비하지 않게 한다. 이것만으로 충분하지는
        // 않다 — 긴 한국어 본문에서 문자열 안 raw 개행이 섞여 오므로 파서가 복구까지 한다
        // (neo-operation-room-prompt.js 의 extractJsonObject).
        responseMimeType: "application/json",
        // Workers AI 폴백이 이 챕터 최소 분량의 40% 미만이면 실패로 돌린다.
        // 아래 40자 게이트는 목적이 다르다 — 전 provider 대상 "렌더 가능한 응답" 하한.
        fallbackMinChars: Math.round((section.minChars || 500) * 0.4),
        ...(useCache ? { cache: cacheConfig } : {}),
      });
      // Gemini 는 truncated(MAX_TOKENS)로, Workers AI 는 finishReason("length")로만 잘림을 알린다.
      const truncated = ai?.truncated === true || /^(MAX_TOKENS|length)$/i.test(clean(ai?.finishReason, 40));
      const needsRetry = ai?.ok && (truncated || Object.keys(parseNeoSectionResponse(ai.text)).length === 0);
      if (!needsRetry) break;
    }
    const provider = clean(ai?.provider || "");
    const model = clean(ai?.model || "");
    const isMock = /mock/i.test(provider) || /mock/i.test(model) || ai?.isMock === true;
    if (!ai?.ok || isMock || clean(ai?.text).length < 40) {
      return { id: section.id, parsed: {}, provider, model, ok: false };
    }
    const parsed = parseNeoSectionResponse(ai.text);
    if (hasForbiddenResultText(parsed)) {
      return { id: section.id, parsed: {}, provider, model, ok: false };
    }
    return { id: section.id, parsed, provider, model, ok: Object.keys(parsed).length > 0 };
  } catch (error) {
    return { id: section.id, parsed: {}, provider: "", model: "", ok: false, error: clean(error?.message, 120) };
  }
}

async function generateBriefing(env, normalized, methodSummary) {
  const ctx = {
    selectedMethod: normalized.input.selectedMethod,
    topic: normalized.input.topic,
    intensity: normalized.input.intensity,
    question: normalized.input.question,
    birthTimeUnknown: normalized.input.birthInfo?.birthTimeUnknown === true,
    relationshipStatus: normalized.input.relationshipStatus || "",
    methodSummary,
  };
  // 궁합 모드는 챕터를 **더하지 않고 갈아 끼운다**(개수 14 유지) — 웨이브가 늘면
  // SYNC_LLM_TIMEOUT_CEILING_MS 예산 안에서 완주하지 못한다.
  const sections = methodSummary?.compat
    ? neoCompatInitialSections(normalized.input.selectedMethod)
    : NEO_INITIAL_SECTIONS;
  const cacheStore = createLlmCacheStore(env);
  // #706 은 /refine 에만 예산을 넣고 /start 는 "안정적으로 도는 경로"라 손대지 않았다. 여기서 함께
  // 건다 — 1차는 14챕터/동시성 4 = 4웨이브라 2차(2웨이브)보다 노출이 크고, 이 PR 이 폴백 잘림까지
  // 재시도 대상으로 넓혔다. 예산은 일을 앞당겨 끊을 뿐 늘리지 않으므로, 엣지가 요청을 통째로
  // 끊어 환불 경로까지 죽는 것보다 부분 결과라도 라우트가 판정하는 쪽이 낫다.
  const deadlineAt = Date.now() + SYNC_LLM_TIMEOUT_CEILING_MS;
  const results = await runWithConcurrency(sections, NEO_SECTION_CONCURRENCY, (section) => {
    const prompt = buildNeoInitialSectionPrompt(section, ctx);
    const cacheConfig = {
      store: cacheStore,
      deterministic: true,
      ttlSeconds: 30 * 24 * 60 * 60,
      // v3(2026-08-19): 자미두수 챕터 프롬프트에 성향 Context 지침을 추가했다. 버전은 4개 술수가
      // 공유하지만, 캐시 무효화 부작용은 "추가 LLM 비용 없는 재생성"뿐이라 전체를 함께 올린다.
      keyExtra: `neo-operation-room-v3-init-${section.id}`,
      // 🔴 minChars 없이 저장하면 llm-cache 가 !truncated 만 보므로, 폴백이 40% 게이트를 겨우
      //    넘긴 짧은 응답이 TTL 30일 동안 고착된다.
      //    llm-cache 의 관례값은 "라우트의 미달 판정 문턱"인데, 네오에는 챕터 단위 분량 판정이
      //    없다(라우트 게이트는 브리핑 전체 200자와 응답 40자뿐). 실제로 존재하는 유일한 하한인
      //    fallbackMinChars 와 같은 값을 쓴다 — section.minChars 를 그대로 쓰면 목표에 살짝
      //    못 미친 정상 응답까지 전부 캐시 미스가 되어 챕터 14개가 매번 정가가 된다.
      minChars: Math.round((section.minChars || 500) * 0.4),
    };
    return generateNeoSectionOnce(env, section, prompt, cacheConfig, deadlineAt);
  });

  let briefing = mergeNeoInitialSections(results, normalized.input, methodSummary);

  // 근거 인용 가드: 정찰 보고(methodEvidence) 챕터가 계산값을 인용하지 않으면 그 챕터만 재생성.
  const tokens = safeArray(methodSummary?.evidenceTokens).map((token) => clean(token, 60)).filter(Boolean);
  if (tokens.length && !briefingCitesEvidence(briefing, tokens)) {
    const evidenceSection = sections.find((section) => section.id === "methodEvidence");
    if (evidenceSection) {
      const retryPrompt = [
        buildNeoInitialSectionPrompt(evidenceSection, ctx),
        "",
        "[재작성 지시]",
        `각 methodEvidence.summary 안에 다음 값 중 최소 2개를 그대로 인용해 다시 작성한다: ${tokens.slice(0, 14).join(", ")}`,
      ].join("\n");
      const retried = await generateNeoSectionOnce(env, evidenceSection, retryPrompt, null, deadlineAt);
      if (retried.ok) {
        briefing = mergeNeoInitialSections(results.map((entry) => (entry.id === "methodEvidence" ? retried : entry)), normalized.input, methodSummary);
      }
    }
  }

  if (countNeoTextChars(briefing) < 200) {
    const error = new Error(LLM_ERROR_MESSAGE);
    error.code = "LLM_FAILED";
    error.status = 503;
    throw error;
  }
  const provider = clean(results.find((entry) => entry.provider)?.provider || "gemini");
  const model = clean(results.find((entry) => entry.model)?.model || "");
  return { briefing, provider, model };
}

function normalizeRealityCheckInput(body = {}) {
  const sessionId = clean(body.sessionId || body.consultationId || body.id, 120);
  const selectedChecks = safeArray(body.selectedChecks || body.checks)
    .map((item) => clean(item, 220))
    .filter(Boolean)
    .slice(0, 12);
  const freeform = clean(body.freeform || body.answer || body.realityAnswer, 1800);
  if (!sessionId) return { ok: false, message: RESULT_NOT_FOUND_MESSAGE };
  if (!selectedChecks.length && freeform.length < 4) {
    return { ok: false, message: "현실 점검 답변을 하나 이상 남겨라." };
  }
  return {
    ok: true,
    sessionId,
    realityCheck: {
      selectedChecks,
      freeform,
      answerHash: sha256(stableJson({ selectedChecks, freeform })),
      submittedAt: new Date().toISOString(),
    },
  };
}

async function generateRefinedOrder(env, consultation, realityCheck) {
  const ctx = {
    selectedMethod: clean(consultation?.selectedMethod || consultation?.initialBriefing?.selectedMethod, 30),
    topic: consultation?.topic || "",
    intensity: consultation?.intensity || "",
    question: consultation?.question || "",
    methodSummary: consultation?.methodSummary || {},
    initialBriefing: consultation?.initialBriefing || {},
    realityCheck,
    previousAdviceLog: buildPreviousAdviceLog(consultation?.initialBriefing),
  };
  // 8챕터 ÷ 동시성 4 = 2웨이브, 웨이브마다 최대 2시도 × 45s → 최악 180s 로 엣지(100s)를 넘긴다.
  // 그러면 라우트가 실패를 판정하기 전에 요청이 잘려 refinementStatus 도 못 남기고 사용자만
  // 정체불명의 오류를 본다. 예산 안에서 끝내 부분 결과라도 반드시 응답으로 전달한다.
  const deadlineAt = Date.now() + SYNC_LLM_TIMEOUT_CEILING_MS;
  // 2차는 현실 점검(자유 입력) 반영이라 비결정적 → 캐시 미사용.
  const results = await runWithConcurrency(NEO_REFINED_SECTIONS, NEO_SECTION_CONCURRENCY, (section) => {
    const prompt = buildNeoRefinedSectionPrompt(section, ctx);
    return generateNeoSectionOnce(env, section, prompt, null, deadlineAt);
  });
  const refinedOrder = mergeNeoRefinedSections(results, consultation);
  if (countNeoTextChars(refinedOrder) < 200) {
    const error = new Error(LLM_ERROR_MESSAGE);
    error.code = "LLM_FAILED";
    error.status = 503;
    throw error;
  }
  const provider = clean(results.find((entry) => entry.provider)?.provider || "gemini");
  const model = clean(results.find((entry) => entry.model)?.model || "");
  return { refinedOrder, provider, model };
}

async function applyUsageOnce({ userId, sessionId, accessType, pricing, source }) {
  const existing = await NeoOperationRoomConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;
  if (source !== "billing-gate" && accessType === "subscription") {
    const error = new Error("A Payment Service access grant is required for monthly usage.");
    error.code = "PAYMENT_ACCESS_GRANT_REQUIRED";
    throw error;
  }
  await NeoOperationRoomConsultation.updateOne({ id: sessionId, usageAppliedAt: null }, { $set: { usageAppliedAt: new Date() } });
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
    console.warn("[neo-operation-room] execution guard start failed", { message: clean(error?.message || error, 300) });
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
    console.warn("[neo-operation-room] execution guard complete failed", { message: clean(error?.message || error, 300) });
  });
}

async function failRefundableExecution(env, auth, idempotencyKey, sessionId, error) {
  await failServiceExecution(env, auth.userId, {
    executionKey: `${FEATURE_KEY}:${idempotencyKey}`,
    requestId: `${FEATURE_KEY}:${idempotencyKey}`,
    sessionId,
    reportId: sessionId,
    reasonCode: clean(error?.code || "neo_operation_room_generation_failed", 80),
    reasonMessage: clean(error?.message || LLM_ERROR_MESSAGE, 300),
    forceRefundOnClose: true,
  }).catch((refundError) => {
    console.error("[neo-operation-room] execution guard refund failed", { message: clean(refundError?.message || refundError, 300) });
  });
}

function publicSession(doc) {
  const raw = typeof doc?.toObject === "function" ? doc.toObject() : doc;
  const compat = raw?.methodSummary?.compat || null;
  return {
    ok: true,
    id: clean(raw?.id || raw?._id),
    sessionId: clean(raw?.id || raw?._id),
    status: clean(raw?.status),
    accessType: clean(raw?.accessType),
    selectedMethod: clean(raw?.selectedMethod),
    topic: clean(raw?.topic),
    intensity: clean(raw?.intensity),
    question: clean(raw?.question),
    // 궁합 모드 요약. 🔴 상대의 생년월일·출생지는 싣지 않는다 — 결과 화면이 쓰지 않는 값이라
    //    응답에 담을 이유가 없다(상담 문서에는 재열람을 위해 남는다).
    relationshipMode: compat ? "compat" : "solo",
    relationshipStatus: clean(raw?.relationshipStatus),
    compatScores: compat?.scores || null,
    partnerBirthTimeUnknown: compat?.uncertainty?.partnerBirthTimeUnknown === true,
    methodSummary: raw?.methodSummary || null,
    initialBriefing: raw?.initialBriefing || null,
    realityCheck: raw?.realityCheck || null,
    refinedOrder: raw?.refinedOrder || null,
    refinementStatus: clean(raw?.refinementStatus),
    generationError: raw?.generationError || null,
    refinementError: raw?.refinementError || null,
    versionHistory: safeArray(raw?.versionHistory).map((entry) => ({
      version: entry?.version,
      documentType: entry?.documentType,
      operationTitle: entry?.operationTitle || entry?.title || "",
      createdAt: entry?.createdAt || entry?.completedAt || "",
    })),
    messages: safeArray(raw?.messages).map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
    resultUrl: raw?.id ? `/neo-operation-room/result?attemptId=${encodeURIComponent(raw.id)}` : "",
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

// ── 사자 휘장(배지) 서버 지갑 ─────────────────────────────────────────────
// 꿀방울(fortune-tea-house)과 동일한 "지갑+멱등 원장" 패턴. 코인/월정석 등 결제 재화와
// 완전히 분리된 무료 보상 재화이므로 models.js를 건드리지 않고 raw 컬렉션으로 자기완결 구현한다.
const NEO_BADGE_SCOPE = "NEO_OPERATION_ROOM";
const NEO_BADGE_LETTER_COST = 5; // 편지/PDF 해금에 필요한 휘장 수(프론트 NEO_LETTER_BADGE_COST와 동일)
const NEO_BADGE_GRADE_COUNT = 10; // 휘장 등급 이미지 종류

function neoBadgeCollections() {
  const db = mongoose.connection.db;
  return {
    wallets: db.collection("neo_operation_room_badge_wallets"),
    ledgers: db.collection("neo_operation_room_badge_ledgers"),
  };
}

function neoBadgePayload(doc, extra = {}) {
  const balance = Math.max(0, Math.floor(Number(doc?.balance ?? 0)));
  const totalEarned = Math.max(0, Math.floor(Number(doc?.totalEarned ?? 0)));
  const totalSpent = Math.max(0, Math.floor(Number(doc?.totalSpent ?? 0)));
  return {
    serviceScope: NEO_BADGE_SCOPE,
    balance,
    totalEarned,
    totalSpent,
    // 방금 받은 휘장의 등급 인덱스(가장 최근 적립분). 장식용 스탬프 이미지 선택에만 쓰인다.
    currentBadgeIndex: totalEarned > 0 ? (totalEarned - 1) % NEO_BADGE_GRADE_COUNT : 0,
    letterCost: NEO_BADGE_LETTER_COST,
    unlocked: balance >= NEO_BADGE_LETTER_COST,
    authenticated: true,
    ...extra,
  };
}

// 상담 1회당 휘장 1개 적립 — 멱등 원장(_id: earn:userId:sessionId)으로 중복 적립을 막는다.
async function grantNeoResultBadge(userId, sessionId) {
  const cleanUserId = clean(userId);
  const cleanSessionId = clean(sessionId, 180);
  if (!cleanUserId || !cleanSessionId) return false;
  const now = new Date();
  const { wallets, ledgers } = neoBadgeCollections();
  let earned = false;
  try {
    await ledgers.insertOne({
      _id: `earn:${cleanUserId}:${cleanSessionId}`,
      userId: cleanUserId,
      type: "earn",
      amount: 1,
      reason: "NEO_OPERATION_ROOM_CONSULTATION_REWARD",
      serviceScope: NEO_BADGE_SCOPE,
      relatedSessionId: cleanSessionId,
      createdAt: now,
    });
    earned = true;
  } catch (error) {
    if (Number(error?.code) !== 11000) throw error;
  }
  if (earned) {
    await wallets.updateOne(
      { userId: cleanUserId, serviceScope: NEO_BADGE_SCOPE },
      {
        $inc: { balance: 1, totalEarned: 1 },
        $set: { lastEarnedAt: now, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }
  return earned;
}

// 최초 조회 시 서버 상담기록 기준으로 과거 완료 상담 수만큼 1회 backfill(사용자 선택).
// migratedAt 가드로 이후 조회에서는 건너뛴다. grant가 멱등이라 중간 실패 후 재실행돼도 안전.
async function ensureNeoBadgeBackfill(userId) {
  const cleanUserId = clean(userId);
  if (!cleanUserId) return;
  const { wallets } = neoBadgeCollections();
  const wallet = await wallets.findOne({ userId: cleanUserId, serviceScope: NEO_BADGE_SCOPE });
  if (wallet?.migratedAt) return;
  const sessions = await NeoOperationRoomConsultation.find({ userId: cleanUserId, status: "completed" })
    .select("id")
    .lean();
  for (const session of sessions) {
    await grantNeoResultBadge(cleanUserId, session?.id);
  }
  const now = new Date();
  await wallets.updateOne(
    { userId: cleanUserId, serviceScope: NEO_BADGE_SCOPE },
    { $set: { migratedAt: now, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
}

// 계정 귀속 휘장 잔량 조회(달빛 앨범 방식). 미인증은 401이 아니라 authenticated:false로 반환하고,
// 프론트 가드가 이를 검사해 정상 잔량을 0으로 덮지 않는다(꿀방울 회귀 방지와 동일 원칙).
async function readNeoBadgeState(request, env) {
  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth?.userId) {
    return neoBadgePayload(null, { authenticated: false });
  }
  try {
    await connectDb(env);
    const doc = await withMongoRetry(env, async () => {
      await ensureNeoBadgeBackfill(auth.userId);
      const { wallets } = neoBadgeCollections();
      return wallets.findOne({ userId: clean(auth.userId), serviceScope: NEO_BADGE_SCOPE });
    });
    return neoBadgePayload(doc, { authenticated: true });
  } catch (error) {
    console.warn("[neo-operation-room/badges] read failed", clean(error?.message || error, 300));
    return neoBadgePayload(null, { authenticated: true, disabled: true });
  }
}

// 특정 세션 로드용: 이 세션 휘장 적립 보장 + 잔량 + 이 세션 편지/PDF 해금 여부.
// 상담 완료 결과를 여는 첫 로드에서 적립되며(awardedNow=true → "새 휘장 수여" 연출),
// 재조회 시에는 멱등이라 awardedNow=false. 결과 조회는 반드시 발생하므로 "상담 1회당 1개"가 보장된다.
async function readNeoBadgeForSession(userId, sessionId) {
  const cleanUserId = clean(userId);
  if (!cleanUserId) return neoBadgePayload(null, { authenticated: false });
  const cleanSessionId = clean(sessionId, 180);
  const awardedNow = await grantNeoResultBadge(cleanUserId, cleanSessionId);
  await ensureNeoBadgeBackfill(cleanUserId);
  const { wallets, ledgers } = neoBadgeCollections();
  const [wallet, spend] = await Promise.all([
    wallets.findOne({ userId: cleanUserId, serviceScope: NEO_BADGE_SCOPE }),
    cleanSessionId ? ledgers.findOne({ _id: `spend:${cleanUserId}:${cleanSessionId}` }) : Promise.resolve(null),
  ]);
  return neoBadgePayload(wallet, { authenticated: true, benefitsUnlocked: Boolean(spend), awardedNow });
}

// 휘장 5개로 편지/PDF 해금. 멱등 원장(_id: spend:userId:sessionId)으로 동일 세션 이중 차감을 막는다.
async function spendNeoBadges(request, env, sessionId) {
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth?.userId) return { ok: false, reason: "LOGIN_REQUIRED", badge: neoBadgePayload(null, { authenticated: false }) };
  const cleanSessionId = clean(sessionId, 180);
  if (!cleanSessionId) return { ok: false, reason: "missing_key", badge: neoBadgePayload(null, { authenticated: true }) };
  await connectDb(env);
  const cleanUserId = clean(auth.userId);
  await ensureNeoBadgeBackfill(cleanUserId);
  const { wallets, ledgers } = neoBadgeCollections();
  const spendId = `spend:${cleanUserId}:${cleanSessionId}`;

  // 이미 이 세션으로 해금했으면(멱등) 재차감 없이 성공.
  const existingSpend = await ledgers.findOne({ _id: spendId });
  if (existingSpend) {
    const wallet = await wallets.findOne({ userId: cleanUserId, serviceScope: NEO_BADGE_SCOPE });
    return { ok: true, badge: neoBadgePayload(wallet, { authenticated: true, benefitsUnlocked: true }) };
  }

  const now = new Date();
  // 원자 조건부 차감: 잔액이 5 이상일 때만 modifiedCount=1.
  const deducted = await wallets.updateOne(
    { userId: cleanUserId, serviceScope: NEO_BADGE_SCOPE, balance: { $gte: NEO_BADGE_LETTER_COST } },
    { $inc: { balance: -NEO_BADGE_LETTER_COST, totalSpent: NEO_BADGE_LETTER_COST }, $set: { updatedAt: now } },
  );
  if (!deducted.modifiedCount) {
    const wallet = await wallets.findOne({ userId: cleanUserId, serviceScope: NEO_BADGE_SCOPE });
    return { ok: false, reason: "not_enough", badge: neoBadgePayload(wallet, { authenticated: true }) };
  }

  try {
    await ledgers.insertOne({
      _id: spendId,
      userId: cleanUserId,
      type: "spend",
      amount: NEO_BADGE_LETTER_COST,
      reason: "NEO_OPERATION_ROOM_BENEFIT_UNLOCK",
      serviceScope: NEO_BADGE_SCOPE,
      relatedSessionId: cleanSessionId,
      createdAt: now,
    });
  } catch (error) {
    if (Number(error?.code) !== 11000) throw error;
    // 동시 요청이 먼저 이 세션을 해금함 — 방금 뺀 5를 되돌려 이중 차감을 막는다.
    await wallets.updateOne(
      { userId: cleanUserId, serviceScope: NEO_BADGE_SCOPE },
      { $inc: { balance: NEO_BADGE_LETTER_COST, totalSpent: -NEO_BADGE_LETTER_COST }, $set: { updatedAt: new Date() } },
    );
  }

  const wallet = await wallets.findOne({ userId: cleanUserId, serviceScope: NEO_BADGE_SCOPE });
  return { ok: true, badge: neoBadgePayload(wallet, { authenticated: true, benefitsUnlocked: true }) };
}

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

async function handleStart(request, env, ctx = null) {
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

  const existing = await withMongoRetry(env, () => NeoOperationRoomConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean());
  if (existing && clean(existing.inputHash) !== normalized.inputHash) return invalidInput(INVALID_INPUT_MESSAGE, 409);
  if (existing?.status === "completed") return json(publicSession(existing));
  if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < GENERATION_FRESHNESS_MS) {
    return json({ ok: true, sessionId: existing.id, status: "generating", message: "운명의 작전 지도를 펼치는 중이다." }, { status: 202 });
  }

  // 정찰 지도(계산)는 LLM이 아니므로 포그라운드에서 즉시 검증한다 — 출생정보/차트 오류는 여기서 422로 빠르게 반환.
  let methodSummary;
  try {
    methodSummary = await calculateMethodSummary(env, normalized, request);
  } catch (error) {
    const isCalculationError = clean(error?.code).includes("BIRTH") || clean(error?.code).includes("CHART") || Number(error?.status) === 422;
    return json({
      ok: false,
      reason: isCalculationError ? "CALCULATION_ERROR" : "LLM_ERROR",
      message: isCalculationError ? CALCULATION_ERROR_MESSAGE : LLM_ERROR_MESSAGE,
    }, { status: isCalculationError ? 422 : 503 });
  }

  const sessionId = existing?.id || `neoop_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}`;
  const now = new Date();
  const seed = {
    id: sessionId,
    userId: auth.userId,
    idempotencyKey,
    inputHash: normalized.inputHash,
    birthInfo: normalized.input.birthInfo,
    // 궁합 모드가 아니면 null 로 남는다. 결과 재열람 때 같은 명반을 다시 계산하기 위해 저장하며,
    // 재사용 가능한 프로필(ProfileCard)로는 승격하지 않는다.
    partnerBirthInfo: normalized.input.partnerBirthInfo || null,
    relationshipStatus: normalized.input.relationshipStatus || "",
    selectedMethod: normalized.input.selectedMethod,
    topic: normalized.input.topic,
    intensity: normalized.input.intensity,
    question: normalized.input.question,
    methodSummary,
    initialBriefing: null,
    accessType: access.accessType,
    paymentId: clean(access.paymentId, 160),
    messages: [],
    status: "generating",
    generationError: null,
  };
  if (existing) {
    await NeoOperationRoomConsultation.updateOne({ id: existing.id }, { $set: { ...seed, updatedAt: now } });
  } else {
    try {
      await NeoOperationRoomConsultation.create(seed);
    } catch (error) {
      if (error?.code === 11000) {
        const duplicate = await NeoOperationRoomConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean();
        if (duplicate?.status === "completed") return json(publicSession(duplicate));
        return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: "운명의 작전 지도를 펼치는 중이다." }, { status: 202 });
      }
      throw error;
    }
  }

  await startRefundableExecution(env, auth, access, idempotencyKey, sessionId, pricing);

  // 14챕터 LLM 브리핑을 요청 안에서 '동기'로 생성해 완료 결과를 바로 반환한다.
  // 비동기(waitUntil)+/result 폴링 방식은, 하나의 공유 MongoDB 연결을 여러 요청 컨텍스트가 재사용하게 만들어
  // Cloudflare Workers의 요청 간 I/O 격리("Cannot perform I/O on behalf of a different request")와 충돌 →
  // 생성 DB 쓰기가 취소·타임아웃돼 결과가 영영 'generating'에 고착되던 문제가 있었다. 생성 전체(연결+LLM+쓰기)를
  // 한 요청 안에서 끝내는 동기 방식은 이 제약에 걸리지 않는다(비동기 전환 전 잘 되던 방식). 계산 검증은 위에서 완료.
  try {
    const generated = await generateBriefing(env, normalized, methodSummary);
    await applyUsageOnce({ userId: auth.userId, sessionId, accessType: access.accessType, pricing, source: access.source });
    await recordSuccessfulUsage(auth, idempotencyKey, access, sessionId, pricing);
    const completed = await NeoOperationRoomConsultation.findOneAndUpdate(
      { id: sessionId },
      {
        $set: {
          status: "completed",
          methodSummary,
          initialBriefing: generated.briefing,
          messages: [
            { role: "user", content: normalized.input.question, createdAt: now },
            { role: "assistant", content: JSON.stringify(generated.briefing), createdAt: new Date() },
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
    await NeoOperationRoomConsultation.updateOne(
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
  // 아니라 재시도 가능한 503으로 흘려보내 클라가 계속 폴링하도록 한다(찻집과 동일한 완충).
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
  // 토큰의 userId로만 자기 세션을 조회하므로 타인 데이터 접근이 불가능하다(이용권/월정석 경로 강화).
  if (!auth) {
    const fallbackUserId = await resolveResultUserIdFromToken(request, env);
    if (fallbackUserId) auth = { userId: fallbackUserId };
  }
  if (!auth) return loginRequired();
  await connectDb(env);
  const consultation = await NeoOperationRoomConsultation.findOne({
    userId: auth.userId,
    $or: [{ id: resultId }, { idempotencyKey: resultId }],
  }).lean();
  if (!consultation) return json({ ok: false, reason: "RESULT_NOT_FOUND", message: RESULT_NOT_FOUND_MESSAGE }, { status: 404 });

  const status = clean(consultation.status);
  // 백그라운드 생성이 진행 중 — 프론트가 폴링으로 완료를 수렴하도록 202를 반환한다.
  // 생성 중에도 선택 술수/주제를 실어 결과 화면이 "네오가 무엇으로 작전을 짜는 중"인지 보여주게 한다.
  if (status === "generating") {
    return json(
      {
        ok: true,
        sessionId: clean(consultation.id),
        status: "generating",
        selectedMethod: clean(consultation.selectedMethod),
        topic: clean(consultation.topic),
        message: "운명의 작전 지도를 펼치는 중이다.",
      },
      { status: 202, headers: { "Retry-After": "3" } },
    );
  }
  // 생성 실패 — 실제 원인(계산/LLM)을 코드로 실어 프론트가 정확한 문구를 띄우게 한다(이용권 오표시 방지).
  if (status === "generation_failed" || status === "failed") {
    const failCode = clean(consultation.generationError?.code);
    const isCalculationError = failCode.includes("BIRTH") || failCode.includes("CHART") || failCode.includes("CALCULATION");
    return json({
      ok: false,
      reason: isCalculationError ? "CALCULATION_ERROR" : "LLM_ERROR",
      message: isCalculationError ? CALCULATION_ERROR_MESSAGE : LLM_ERROR_MESSAGE,
    }, { status: 409 });
  }
  // 완료 세션을 여는 바로 그 로드에서 휘장 잔량이 항상 정확히 보이도록 적립(멱등)+backfill 후 payload에 싣는다.
  let badge = null;
  try {
    badge = await withMongoRetry(env, () => readNeoBadgeForSession(auth.userId, consultation.id));
  } catch (error) {
    console.warn("[neo-operation-room/result] badge attach failed", clean(error?.message || error, 300));
  }
  return json({ ...publicSession(consultation), badge });
}

async function handleRefine(request, env) {
  const body = await readJson(request);
  const normalized = normalizeRealityCheckInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  await connectDb(env);
  // 🔴 withMongoRetry 없이 생짜로 부르면 풀 재연결 시점의 일시 오류가 그대로 아래 catch 로 떨어져
  // "LLM 실패"로 오표시된다. 이 파일의 다른 DB 접근 8곳은 전부 감싸고 있는데 여기만 빠져 있었다.
  const existing = await withMongoRetry(env, () => NeoOperationRoomConsultation.findOne({
    id: normalized.sessionId,
    userId: auth.userId,
    status: "completed",
  }).lean());
  if (!existing?.initialBriefing) {
    return json({ ok: false, reason: "RESULT_NOT_FOUND", message: RESULT_NOT_FOUND_MESSAGE }, { status: 404 });
  }
  if (existing?.refinedOrder && existing?.realityCheck?.answerHash === normalized.realityCheck.answerHash) {
    return json(publicSession(existing));
  }
  // 같은 답변으로 이미 생성이 돌고 있으면 새로 기동하지 않고 202 로 흡수한다 — 없으면 사용자가
  // 재시도할 때마다 8챕터 생성이 통째로 중복 기동돼 LLM 비용과 쓰기 경합이 같이 늘어난다.
  // /start 의 GENERATION_FRESHNESS_MS 흡수(위 handleStart)와 같은 규칙이다.
  if (
    existing?.refinementStatus === "generating"
    && existing?.realityCheck?.answerHash === normalized.realityCheck.answerHash
    && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < GENERATION_FRESHNESS_MS
  ) {
    return json(
      { ok: true, sessionId: existing.id, refinementStatus: "generating", message: "수정 작전 명령서를 다시 쓰는 중이다." },
      { status: 202, headers: { "Retry-After": "3" } },
    );
  }

  await withMongoRetry(env, () => NeoOperationRoomConsultation.updateOne(
    { id: normalized.sessionId, userId: auth.userId },
    {
      $set: {
        refinementStatus: "generating",
        refinementError: null,
        realityCheck: normalized.realityCheck,
      },
    },
  ));

  try {
    const generated = await generateRefinedOrder(env, existing, normalized.realityCheck);
    const historyEntry = {
      version: 2,
      documentType: "refined_order",
      operationTitle: generated.refinedOrder.operationTitle,
      realityCheck: normalized.realityCheck,
      createdAt: new Date().toISOString(),
    };
    const updated = await withMongoRetry(env, () => NeoOperationRoomConsultation.findOneAndUpdate(
      { id: normalized.sessionId, userId: auth.userId },
      {
        $set: {
          refinedOrder: generated.refinedOrder,
          realityCheck: normalized.realityCheck,
          refinementStatus: "completed",
          refinementError: null,
          llmMeta: {
            ...(existing.llmMeta || {}),
            refinedProvider: generated.provider,
            refinedModel: generated.model,
            refinedAt: new Date().toISOString(),
          },
        },
        $push: {
          versionHistory: historyEntry,
          messages: {
            $each: [
              { role: "user", content: JSON.stringify(normalized.realityCheck), createdAt: new Date() },
              { role: "assistant", content: JSON.stringify(generated.refinedOrder), createdAt: new Date() },
            ],
          },
        },
      },
      { new: true },
    ).lean());
    return json(publicSession(updated));
  } catch (error) {
    // 🔴 DB 일시 장애를 LLM 실패로 적으면 두 가지가 같이 망가진다 — 사용자는 "운세 생성 실패"를 보고,
    // refinementStatus 에도 LLM 실패로 남아 원인 추적이 어긋난다. 최상위 catch 가 하던 구분을
    // 여기서도 한다(이 try/catch 가 먼저 삼켜 거기까지 가지 않는다).
    const isInfra = isTransientMongoError(error) || isAuthDbInfraError(error);
    await NeoOperationRoomConsultation.updateOne(
      { id: normalized.sessionId, userId: auth.userId },
      {
        $set: {
          refinementStatus: "generation_failed",
          refinementError: {
            code: clean(error?.code || (isInfra ? "DB_DEGRADED" : "REFINEMENT_FAILED"), 80),
            message: clean(error?.message || error, 500),
            at: new Date().toISOString(),
          },
        },
      },
    ).catch(() => {});
    if (isInfra) {
      return json({
        ok: false,
        retryable: true,
        reason: "DB_DEGRADED",
        message: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요.",
      }, { status: 503 });
    }
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
}

export async function handleNeoOperationRoomRoutes(request, env = {}, ctx = null) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/neo-operation-room");
  try {
    if (method === "GET" && path === "/result") return await handleResult(request, env);
    if (method === "GET" && path.startsWith("/result/")) return await handleResult(request, env, path.slice("/result/".length));
    if (method === "POST" && path === "/ensure-access") return await handleEnsureAccess(request, env);
    if (method === "POST" && path === "/start") return await handleStart(request, env, ctx);
    if (method === "POST" && path === "/refine") return await handleRefine(request, env);
    if (method === "GET" && (path === "/badges" || path === "/badges/balance")) {
      return json({ ok: true, badge: await readNeoBadgeState(request, env) });
    }
    if (method === "POST" && path === "/badges/unlock-benefits") {
      const body = await readJson(request);
      return json(await spendNeoBadges(request, env, body?.sessionId));
    }
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[neo-operation-room]", clean(error?.stack || error?.message || error, 1200));
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

export const __neoOperationRoomTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  hasForbiddenResultText,
  normalizeInput,
  summarizeSaju,
  summarizeZiwei,
  summarizeVedic,
  summarizeAstrology,
};
