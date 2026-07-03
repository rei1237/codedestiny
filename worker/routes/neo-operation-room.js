import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, mongoose } from "../lib/db.js";
import {
  MonthlyCreditLedger,
  NeoOperationRoomConsultation,
  PaidExecutionRecord,
  Payment,
  PointHistory,
  User,
} from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canUseByPass, normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";
import { callGeminiText } from "../lib/gemini.js";
import { calculateLifeBookAiSaju } from "../lib/life-book-ai-saju.js";
import { calculateZiweiAiChart } from "../lib/ziwei-ai-chart.js";
import { calculateVedicAiChart } from "../lib/vedic-ai-chart.js";
import { prepareAstroPremiumCalculation } from "../lib/astro-premium-generator.js";
import {
  completeServiceExecution,
  failServiceExecution,
  startServiceExecution,
} from "../lib/service-execution-task.js";
import {
  buildNeoOperationRoomInitialPrompt,
  buildNeoOperationRoomRefinedPrompt,
  parseNeoOperationRoomBriefingResponse,
  parseNeoOperationRoomRefinedResponse,
} from "../lib/neo-operation-room-prompt.js";

const SERVICE_KEY = "neo-operation-room";
const FEATURE_KEY = "neo-operation-room-consultation";
const ACCESS_TOKEN_TYPE = "neo-operation-room-access";
const ACCESS_TOKEN_TTL = "45m";
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
  const input = {
    selectedMethod,
    topic,
    intensity,
    question,
    birthInfo: {
      ...birthInfo,
      birthPlace: {
        city: birthInfo.city,
        country: birthInfo.country,
        timezone: birthInfo.timezone,
        latitude: birthInfo.latitude,
        longitude: birthInfo.longitude,
      },
    },
  };
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

async function loadUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(String(userId || ""))) return null;
  return User.findById(userId)
    .select("role profileSubscription paidFeatures unlockedFeatures licenses monthlySubscription subscription membership membershipPass pass entitlement licensePass accessGateResult plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt")
    .lean();
}

async function resolveEnsureAccess(env, auth, pricing, idempotencyKey, inputHash) {
  await connectDb(env);
  const existing = await NeoOperationRoomConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean();
  if (existing && clean(existing.inputHash) !== inputHash) {
    return { ok: false, reason: "INVALID_INPUT" };
  }
  if (existing?.status === "completed") {
    return { ok: true, accessType: clean(existing.accessType) || "paid", paymentId: clean(existing.paymentId, 160), existing };
  }
  if (existing?.status === "generating") {
    return { ok: true, accessType: clean(existing.accessType) || "paid", paymentId: clean(existing.paymentId, 160), existing };
  }
  const user = await loadUser(auth.userId);
  if (!user) return { ok: false, reason: "LOGIN_REQUIRED" };
  if (clean(user.role).toLowerCase() === "admin" || clean(auth.role).toLowerCase() === "admin") {
    return { ok: true, accessType: "admin", paymentId: "" };
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
  const token = clean(body?.accessToken || request.headers.get("x-neo-operation-room-access-token"));
  if (token) {
    const payload = await verifyAccessToken(env, token);
    if (clean(payload.userId) !== clean(auth.userId) || clean(payload.idempotencyKey) !== idempotencyKey || clean(payload.inputHash) !== normalized.inputHash) {
      return { ok: false, reason: "INVALID_INPUT", message: INVALID_INPUT_MESSAGE };
    }
    return { ok: true, accessType: clean(payload.accessType), paymentId: clean(payload.paymentId, 160), source: "token" };
  }
  const ctx = billingContextFromBody(body);
  const paidPayment = await hasPaidPayment(auth, ctx.paymentId, idempotencyKey);
  if (paidPayment) {
    return {
      ok: true,
      accessType: "paid",
      paymentId: clean(paidPayment.merchantUid || paidPayment.impUid || ctx.paymentId, 160),
      source: "payment",
    };
  }
  if (ctx.accessType === "membership_credit" || ctx.accessMethod === "MONTHLY" || ctx.accessMethod === "MONTHLY_CREDIT" || ctx.accessMethod === "MOONLIGHT_STONE") {
    if (await hasMonthlyConsume(auth, ctx, idempotencyKey)) {
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
  if (ctx.accessType === "membership_pass" || ctx.accessType === "usage_pass" || ctx.accessType === "family" || ctx.accessMethod === "PASS" || ctx.accessMethod === "MEMBERSHIP_PASS" || ctx.accessMethod === "FAMILY_PASS") {
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
  const user = await loadUser(auth.userId);
  if (!user) return { ok: false, reason: "LOGIN_REQUIRED" };
  if (clean(user.role).toLowerCase() === "admin") return { ok: true, accessType: "admin", paymentId: "", source: "server" };
  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

function compactObject(value, maxEntries = 10) {
  const source = asObject(value);
  return Object.fromEntries(Object.entries(source).filter(([, item]) => item !== undefined && item !== null && item !== "").slice(0, maxEntries));
}

function summarizeSaju(chart) {
  return {
    method: "saju",
    summary: "사주 엔진이 산출한 사주팔자, 일간, 오행 분포, 십성 분포, 대운과 세운 흐름을 근거로 삼는다.",
    evidenceSummary: [
      `연월일시 기둥: ${[chart.yearPillar, chart.monthPillar, chart.dayPillar, chart.hourPillar].filter(Boolean).join(" / ")}`,
      chart.dayMaster ? `일간: ${chart.dayMaster}` : "",
      chart.strength ? `신강약 판단: ${chart.strength}` : "",
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
    majorLuck: safeArray(chart.majorLuck).slice(0, 4),
    yearlyLuck: safeArray(chart.yearlyLuck).slice(0, 4),
    calculationMeta: compactObject(chart.calculationMeta, 6),
  };
}

function summarizeZiwei(chart) {
  return {
    method: "ziwei",
    summary: clean(chart?.chartSummary || "자미두수 엔진이 산출한 명궁, 신궁, 주요 별 배치와 궁위 흐름을 근거로 삼는다.", 900),
    evidenceSummary: [
      chart?.mingGong ? `명궁: ${JSON.stringify(chart.mingGong)}` : "",
      chart?.shenGong ? `신궁: ${JSON.stringify(chart.shenGong)}` : "",
    ].filter(Boolean).join("\n") || "자미두수 명반 계산 결과를 근거로 삼는다.",
    mingGong: chart?.mingGong || chart?.lifePalace || null,
    shenGong: chart?.shenGong || chart?.bodyPalace || null,
    palaces: safeArray(chart?.palaces).slice(0, 12),
    stars: safeArray(chart?.stars).slice(0, 20),
    majorLuck: chart?.majorLuck || chart?.decadeLuck || null,
    yearlyFlow: chart?.yearlyFlow || chart?.annualLuck || null,
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
      chart?.dasha?.current ? `현재 다샤: ${JSON.stringify(chart.dasha.current)}` : "",
    ].filter(Boolean).join("\n") || "베다 차트 계산 결과를 근거로 삼는다.",
    lagna: chart?.lagna || null,
    moon: chart?.moon || null,
    sun: chart?.sun || null,
    planets: safeArray(chart?.planets).slice(0, 12),
    houses: safeArray(chart?.houses).slice(0, 12),
    dasha: chart?.dasha || null,
    transits: chart?.transits || null,
    yogas: safeArray(chart?.yogas).slice(0, 10),
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
    calculationMode: clean(chart?.calculationMode || prepared?.resolved?.source, 120),
  };
}

async function calculateMethodSummary(env, normalized, request) {
  const input = normalized.input;
  if (input.selectedMethod === "saju") {
    return summarizeSaju(calculateLifeBookAiSaju(input.birthInfo));
  }
  if (input.selectedMethod === "ziwei") {
    return summarizeZiwei(calculateZiweiAiChart({ birthInfo: input.birthInfo }, { year: new Date().getFullYear() }));
  }
  if (input.selectedMethod === "vedic") {
    return summarizeVedic(await calculateVedicAiChart(env, {
      birthInfo: input.birthInfo,
      topic: input.topic,
      userQuestion: input.question,
    }, { requestUrl: request.url }));
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

function hasForbiddenResultText(value) {
  const text = JSON.stringify(value || "");
  return /\b(mock|dry-run|provider|system|prompt)\b/i.test(text);
}

async function generateBriefing(env, normalized, methodSummary) {
  const prompt = buildNeoOperationRoomInitialPrompt(normalized.input, methodSummary);
  const ai = await callGeminiText(env, prompt, { maxOutputTokens: 6500, temperature: 0.72 });
  const provider = clean(ai?.provider || "");
  const model = clean(ai?.model || "");
  const isMock = /mock/i.test(provider) || /mock/i.test(model) || ai?.isMock === true;
  if (!ai?.ok || isMock || clean(ai?.text).length < 80) {
    const error = new Error(LLM_ERROR_MESSAGE);
    error.code = "LLM_FAILED";
    error.status = 503;
    throw error;
  }
  const briefing = parseNeoOperationRoomBriefingResponse(ai.text, normalized.input, methodSummary);
  if (hasForbiddenResultText(briefing)) {
    const error = new Error("Neo briefing contains internal wording");
    error.code = "LLM_RESPONSE_INVALID";
    error.status = 503;
    throw error;
  }
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
  const prompt = buildNeoOperationRoomRefinedPrompt(consultation, realityCheck);
  const ai = await callGeminiText(env, prompt, { maxOutputTokens: 7000, temperature: 0.72 });
  const provider = clean(ai?.provider || "");
  const model = clean(ai?.model || "");
  const isMock = /mock/i.test(provider) || /mock/i.test(model) || ai?.isMock === true;
  if (!ai?.ok || isMock || clean(ai?.text).length < 80) {
    const error = new Error(LLM_ERROR_MESSAGE);
    error.code = "LLM_FAILED";
    error.status = 503;
    throw error;
  }
  const refinedOrder = parseNeoOperationRoomRefinedResponse(ai.text, consultation);
  if (hasForbiddenResultText(refinedOrder)) {
    const error = new Error("Neo refined order contains internal wording");
    error.code = "LLM_RESPONSE_INVALID";
    error.status = 503;
    throw error;
  }
  return { refinedOrder, provider, model };
}

async function applyUsageOnce({ userId, sessionId, accessType, pricing, source }) {
  const existing = await NeoOperationRoomConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;
  if (source !== "billing-gate" && accessType === "subscription") {
    const sourceId = `${SERVICE_KEY}:${sessionId}`;
    const ledger = await MonthlyCreditLedger.findOne({ userId, type: "MONTHLY_CREDIT_SPEND", sourceId }).lean();
    if (!ledger) {
      const beforeUser = await User.findById(userId).select("profileSubscription.membershipCreditBalance").lean();
      const beforeBalance = Math.max(0, Math.floor(Number(beforeUser?.profileSubscription?.membershipCreditBalance || 0)));
      const updated = await User.findOneAndUpdate(
        { _id: userId, "profileSubscription.membershipCreditBalance": { $gte: pricing.membershipCreditCost } },
        {
          $inc: {
            "profileSubscription.membershipCreditBalance": -pricing.membershipCreditCost,
            "profileSubscription.membershipCreditUsed": pricing.membershipCreditCost,
          },
        },
        { new: true },
      ).select("profileSubscription.membershipCreditBalance").lean();
      if (!updated) {
        const error = new Error("membership credit balance is insufficient");
        error.code = "MEMBERSHIP_CREDIT_CONSUME_FAILED";
        throw error;
      }
      await MonthlyCreditLedger.create({
        userId,
        type: "MONTHLY_CREDIT_SPEND",
        amount: pricing.membershipCreditCost,
        beforeBalance,
        afterBalance: Math.max(0, Math.floor(Number(updated?.profileSubscription?.membershipCreditBalance || 0))),
        reason: TITLE,
        sourceId,
        serviceKey: FEATURE_KEY,
        metadata: { featureKey: FEATURE_KEY, sessionId },
      }).catch((error) => {
        if (error?.code !== 11000) throw error;
      });
    }
  }
  if (source !== "billing-gate" && accessType === "pass") {
    const pass = await User.findById(userId).select("profileSubscription").lean().then((user) => normalizeHoneyPassEntitlement(user || {})).catch(() => null);
    if (pass && canUseByPass(pass, pricing.coinPrice)) {
      await User.updateOne(
        { _id: userId, "profileSubscription.passRemainingUses": { $gt: 0 } },
        {
          $inc: {
            "profileSubscription.passRemainingUses": -1,
            "profileSubscription.passUsedCount": 1,
          },
        },
      ).catch(() => {});
    }
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

async function handleEnsureAccess(request, env) {
  const body = await readJson(request);
  const normalized = normalizeInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  const idempotencyKey = readIdempotencyKey(request, body);
  if (idempotencyKey.length < 12) return invalidInput(INVALID_INPUT_MESSAGE);
  const auth = await getOptionalUserFromRequest(request, env);
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
  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const pricing = getPricing();
  const access = await resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey });
  if (!access.ok) {
    if (access.reason === "LOGIN_REQUIRED") return loginRequired();
    if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
    return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED", message: PAYMENT_VERIFY_FAILED_MESSAGE }, { status: 402 });
  }

  const existing = await NeoOperationRoomConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean();
  if (existing && clean(existing.inputHash) !== normalized.inputHash) return invalidInput(INVALID_INPUT_MESSAGE, 409);
  if (existing?.status === "completed") return json(publicSession(existing));
  if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < 90000) {
    return json({ ok: true, sessionId: existing.id, status: "generating", message: "운명의 작전 지도를 펼치는 중이다." }, { status: 202 });
  }

  const sessionId = existing?.id || `neoop_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}`;
  const now = new Date();
  const seed = {
    id: sessionId,
    userId: auth.userId,
    idempotencyKey,
    inputHash: normalized.inputHash,
    birthInfo: normalized.input.birthInfo,
    selectedMethod: normalized.input.selectedMethod,
    topic: normalized.input.topic,
    intensity: normalized.input.intensity,
    question: normalized.input.question,
    methodSummary: null,
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
  try {
    const methodSummary = await calculateMethodSummary(env, normalized, request);
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
  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();
  await connectDb(env);
  const consultation = await NeoOperationRoomConsultation.findOne({
    userId: auth.userId,
    $or: [{ id: resultId }, { idempotencyKey: resultId }],
  }).lean();
  if (!consultation) return json({ ok: false, reason: "RESULT_NOT_FOUND", message: RESULT_NOT_FOUND_MESSAGE }, { status: 404 });
  return json(publicSession(consultation));
}

async function handleRefine(request, env) {
  const body = await readJson(request);
  const normalized = normalizeRealityCheckInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const existing = await NeoOperationRoomConsultation.findOne({
    id: normalized.sessionId,
    userId: auth.userId,
    status: "completed",
  }).lean();
  if (!existing?.initialBriefing) {
    return json({ ok: false, reason: "RESULT_NOT_FOUND", message: RESULT_NOT_FOUND_MESSAGE }, { status: 404 });
  }
  if (existing?.refinedOrder && existing?.realityCheck?.answerHash === normalized.realityCheck.answerHash) {
    return json(publicSession(existing));
  }

  await NeoOperationRoomConsultation.updateOne(
    { id: normalized.sessionId, userId: auth.userId },
    {
      $set: {
        refinementStatus: "generating",
        refinementError: null,
        realityCheck: normalized.realityCheck,
      },
    },
  );

  try {
    const generated = await generateRefinedOrder(env, existing, normalized.realityCheck);
    const historyEntry = {
      version: 2,
      documentType: "refined_order",
      operationTitle: generated.refinedOrder.operationTitle,
      realityCheck: normalized.realityCheck,
      createdAt: new Date().toISOString(),
    };
    const updated = await NeoOperationRoomConsultation.findOneAndUpdate(
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
    ).lean();
    return json(publicSession(updated));
  } catch (error) {
    await NeoOperationRoomConsultation.updateOne(
      { id: normalized.sessionId, userId: auth.userId },
      {
        $set: {
          refinementStatus: "generation_failed",
          refinementError: {
            code: clean(error?.code || "REFINEMENT_FAILED", 80),
            message: clean(error?.message || error, 500),
            at: new Date().toISOString(),
          },
        },
      },
    ).catch(() => {});
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
}

export async function handleNeoOperationRoomRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/neo-operation-room");
  try {
    if (method === "GET" && path === "/result") return await handleResult(request, env);
    if (method === "GET" && path.startsWith("/result/")) return await handleResult(request, env, path.slice("/result/".length));
    if (method === "POST" && path === "/ensure-access") return await handleEnsureAccess(request, env);
    if (method === "POST" && path === "/start") return await handleStart(request, env);
    if (method === "POST" && path === "/refine") return await handleRefine(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[neo-operation-room]", clean(error?.stack || error?.message || error, 1200));
    return serverError();
  }
}

export const __neoOperationRoomTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  normalizeInput,
};
