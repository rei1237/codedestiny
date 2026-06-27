import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, mongoose } from "../lib/db.js";
import { KarmaDestinyAiConsultation, MonthlyCreditLedger, Payment, PointHistory, User } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canUseByPass, normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";
import { callGeminiText } from "../lib/gemini.js";
import { buildKarmaDestinyIntegratedResult } from "../lib/karma-destiny-ai-calculations.js";

const SERVICE_KEY = "karma-destiny-ai";
const FEATURE_KEY = "karma-destiny-ai-consultation";
const ACCESS_TOKEN_TYPE = "karma-destiny-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "운명의 업 AI 상담";
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "AI 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const INVALID_INPUT_MESSAGE = "생년월일, 출생시간, 출생지 정보를 다시 확인해 주세요.";
const PLACE_ERROR_MESSAGE = "출생지 정보를 확인하지 못했습니다. 도시와 국가를 다시 입력해 주세요.";
const CALCULATION_ERROR_MESSAGE = "운명의 업 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.";

const VALID_TOPICS = new Set([
  "전체 운명의 업",
  "반복되는 인생 패턴",
  "관계에서 반복되는 상처",
  "돈과 일에서 반복되는 문제",
  "가족과 인연의 업",
  "사랑과 이별의 업",
  "고독감과 내면의 숙제",
  "재능과 사명의 방향",
  "지금 인생의 전환점",
  "앞으로 풀어야 할 삶의 과제",
  "올해의 업과 기회",
  "현재 고민 상담",
]);

const FORBIDDEN_RESULT_PATTERN = /\bPDF\b|챕터|\bchapter\b|\bprogress\b|\bjob\b|프롬프트|시스템|\bAI\b/gi;

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function asObject(value) {
  return value && typeof value === "object" ? value : {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
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
  return clean(
    body?.idempotencyKey
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key"),
    180,
  );
}

function randomToken(length = 10) {
  const bytes = new Uint8Array(Math.max(8, Math.ceil(length * 0.75)));
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, length);
}

function normalizeGender(value) {
  const text = clean(value, 20).toLowerCase();
  if (["m", "male", "man", "남", "남성"].includes(text)) return "male";
  if (["f", "female", "woman", "여", "여성"].includes(text)) return "female";
  if (["other", "unknown", "none", "기타"].includes(text)) return "other";
  return text || "";
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidTimeKey(value) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clean(value, 5));
}

function parseFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeBirthPlace(value = {}) {
  const place = asObject(value);
  const city = clean(place.city || place.name || place.birthCity, 100);
  const country = clean(place.country || place.countryCode || place.birthCountry, 100);
  const timezone = clean(place.timezone || place.tz || place.timezoneName, 80);
  const latitude = parseFiniteNumber(place.latitude ?? place.lat);
  const longitude = parseFiniteNumber(place.longitude ?? place.lng ?? place.lon);
  return { city, country, latitude, longitude, timezone };
}

function normalizeConsultationInput(body = {}) {
  const birthInfo = asObject(body.birthInfo);
  const name = clean(body.name ?? body.nickname ?? birthInfo.name, 80);
  const gender = normalizeGender(body.gender ?? birthInfo.gender);
  const birthDate = clean(body.birthDate ?? birthInfo.birthDate, 10);
  const birthTimeUnknown = body.birthTimeUnknown === true || birthInfo.birthTimeUnknown === true;
  const birthTime = birthTimeUnknown ? "" : clean(body.birthTime ?? birthInfo.birthTime, 5);
  const calendarType = clean(body.calendarType ?? birthInfo.calendarType, 20).toLowerCase();
  const birthPlace = normalizeBirthPlace(body.birthPlace || birthInfo.birthPlace || {});
  const topic = clean(body.topic ?? body.consultationTopic, 100);
  const userQuestion = clean(body.userQuestion ?? body.question, 1600);

  if (!gender) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!isValidDateKey(birthDate)) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!birthTimeUnknown && !isValidTimeKey(birthTime)) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (calendarType !== "solar" && calendarType !== "lunar") return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!birthPlace.city || !birthPlace.country || !birthPlace.timezone) return { ok: false, message: PLACE_ERROR_MESSAGE };
  if ((birthPlace.latitude !== null && (birthPlace.latitude < -90 || birthPlace.latitude > 90))
    || (birthPlace.longitude !== null && (birthPlace.longitude < -180 || birthPlace.longitude > 180))) {
    return { ok: false, message: PLACE_ERROR_MESSAGE };
  }
  if (!VALID_TOPICS.has(topic)) return { ok: false, message: "상담 주제를 다시 선택해 주세요." };
  if (userQuestion.length < 2) return { ok: false, message: "현재 가장 궁금한 질문을 입력해 주세요." };

  const normalized = {
    birthInfo: {
      name,
      gender,
      birthDate,
      birthTime,
      birthTimeUnknown,
      calendarType,
      birthPlace,
    },
    topic,
    userQuestion,
  };

  return {
    ok: true,
    input: normalized,
    inputHash: sha256(stableJson(normalized)),
  };
}

function invalidInput(message, status = 422) {
  return json({ ok: false, reason: "INVALID_INPUT", message: clean(message) || INVALID_INPUT_MESSAGE }, { status });
}

function loginRequired() {
  return json({ ok: false, reason: "LOGIN_REQUIRED", message: LOGIN_REQUIRED_MESSAGE }, { status: 401 });
}

function serverError(message = SERVER_ERROR_MESSAGE, status = 500) {
  return json({ ok: false, reason: "SERVER_ERROR", message }, { status });
}

function paymentVerifyFailed() {
  return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED", message: PAYMENT_VERIFY_FAILED_MESSAGE }, { status: 402 });
}

function getPricing() {
  const resolved = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  const pricing = resolved?.pricing || null;
  const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 0);
  const amountKRW = Number(pricing?.amountKRW || pricing?.paymentAmount || 50000);
  if (!resolved?.ok || !pricing || !Number.isInteger(coinPrice) || coinPrice <= 0 || !Number.isInteger(amountKRW) || amountKRW <= 0) {
    const error = new Error("karma-destiny-ai price not found");
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

function isAdmin(auth = {}) {
  return clean(auth.role).toLowerCase() === "admin";
}

async function loadBillingUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(String(userId || ""))) return null;
  return User.findById(userId)
    .select("email name phoneNumber points role profileSubscription subscription membership pass entitlement paidFeatures unlockedFeatures")
    .lean();
}

function hasMonthlyCredit(user = {}, membershipCreditCost = 0) {
  const balance = Math.max(0, Math.floor(Number(user?.profileSubscription?.membershipCreditBalance || user?.profileSubscription?.monthlyStoneBalance || 0)));
  return membershipCreditCost > 0 && balance >= membershipCreditCost;
}

function normalizeAccessType(value) {
  const raw = clean(value).toLowerCase();
  if (["membership_credit", "monthly_credit", "monthly", "subscription"].includes(raw)) return "subscription";
  if (["membership_pass", "family_pass", "pass", "usage_pass"].includes(raw)) return "pass";
  if (["admin"].includes(raw)) return "admin";
  return "paid";
}

function extractBillingEvidence(body = {}, idempotencyKey = "") {
  const consume = asObject(body.billingConsume || body.consume);
  const accessGrant = asObject(body.billingAccessGrant || body.accessGrant);
  const requestId = clean(
    body.billingRequestId
      || accessGrant.requestId
      || consume.requestId
      || body.requestId
      || idempotencyKey,
    180,
  );
  const transactionId = clean(
    body.transactionId
      || consume.transactionId
      || consume.receiptId
      || accessGrant.evidenceId
      || accessGrant.purchaseId
      || accessGrant.paymentId,
    160,
  );
  const accessType = normalizeAccessType(
    consume.accessType
      || consume.transactionType
      || consume.accessMethod
      || accessGrant.accessType
      || accessGrant.accessMethod,
  );
  return { requestId, transactionId, accessType };
}

async function findBillingGateEvidence({ userId, idempotencyKey, body = {} }) {
  const evidence = extractBillingEvidence(body, idempotencyKey);
  const clauses = [];
  if (evidence.transactionId && mongoose.Types.ObjectId.isValid(evidence.transactionId)) {
    clauses.push({ _id: evidence.transactionId });
  }
  if (evidence.requestId) clauses.push({ "metadata.requestId": evidence.requestId });
  if (idempotencyKey) clauses.push({ "metadata.requestId": idempotencyKey });
  if (clauses.length && mongoose.Types.ObjectId.isValid(String(userId || ""))) {
    const point = await PointHistory.findOne({
      userId,
      featureKey: FEATURE_KEY,
      kind: "deduct",
      $or: clauses,
    }).sort({ createdAt: -1 }).lean();
    if (point) {
      return {
        ok: true,
        accessType: normalizeAccessType(point?.metadata?.accessType || point?.metadata?.paymentMethod || evidence.accessType),
        paymentId: clean(point._id, 160),
        billingRequestId: clean(point?.metadata?.requestId || evidence.requestId, 180),
      };
    }
  }

  const paymentClauses = [];
  if (evidence.requestId) paymentClauses.push({ requestId: evidence.requestId }, { idempotencyKey: evidence.requestId });
  if (idempotencyKey) paymentClauses.push({ requestId: idempotencyKey }, { idempotencyKey });
  if (evidence.transactionId) paymentClauses.push({ merchantUid: evidence.transactionId }, { impUid: evidence.transactionId });
  if (paymentClauses.length && mongoose.Types.ObjectId.isValid(String(userId || ""))) {
    const payment = await Payment.findOne({
      userId,
      featureKey: FEATURE_KEY,
      status: { $in: ["paid", "success", "fulfilled"] },
      $or: paymentClauses,
    }).sort({ updatedAt: -1, paidAt: -1, createdAt: -1 }).lean();
    if (payment) {
      return {
        ok: true,
        accessType: "paid",
        paymentId: clean(payment.merchantUid || payment.impUid || evidence.transactionId, 160),
        billingRequestId: clean(payment.requestId || payment.idempotencyKey || evidence.requestId, 180),
      };
    }
  }

  return null;
}

async function resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash, body = {} }) {
  if (isAdmin(auth) || clean(user?.role).toLowerCase() === "admin") {
    return { ok: true, accessType: "admin", paymentId: "", usageAlreadyApplied: true };
  }

  const existing = await KarmaDestinyAiConsultation.findOne({
    userId: clean(auth.userId),
    idempotencyKey,
    inputHash,
    status: "completed",
  }).select("id accessType paymentId billingRequestId").lean();
  if (existing) {
    return {
      ok: true,
      accessType: clean(existing.accessType) || "paid",
      paymentId: clean(existing.paymentId, 160),
      billingRequestId: clean(existing.billingRequestId, 180),
      usageAlreadyApplied: true,
    };
  }

  const billing = await findBillingGateEvidence({ userId: auth.userId, idempotencyKey, body });
  if (billing?.ok) return { ...billing, usageAlreadyApplied: true };

  const pass = normalizeHoneyPassEntitlement(user || {});
  if (canUseByPass(pass, pricing.coinPrice)) {
    return { ok: true, accessType: "pass", paymentId: "", usageAlreadyApplied: false };
  }

  if (hasMonthlyCredit(user, pricing.membershipCreditCost)) {
    return { ok: true, accessType: "subscription", paymentId: "", usageAlreadyApplied: false };
  }

  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

function buildBillingGatePayload(pricing, idempotencyKey) {
  return {
    featureKey: FEATURE_KEY,
    serviceId: SERVICE_KEY,
    contentId: FEATURE_KEY,
    orderName: ORDER_NAME,
    reason: ORDER_NAME,
    requestId: idempotencyKey,
    idempotencyKey,
    coinPrice: pricing.coinPrice,
    cost: pricing.coinPrice,
    membershipCreditCost: pricing.membershipCreditCost,
    totalAmount: pricing.amountKRW,
    paymentAmount: pricing.amountKRW,
    amountKRW: pricing.amountKRW,
    currency: "CURRENCY_KRW",
  };
}

function buildSystemPrompt() {
  return [
    "당신은 사주, 서양 점성술, 베다 점성술을 종합해 운명의 업을 상담하는 최고 수준의 운명 상담가입니다.",
    "",
    "사용자의 생년월일, 성별, 출생시간, 출생지 정보와 서버에서 계산된 사주, 서양 점성술, 베다 점성술 데이터를 바탕으로 사용자의 삶에서 반복되는 패턴과 풀어야 할 과제를 상담형으로 해석합니다.",
    "",
    "반드시 지켜야 할 원칙:",
    "1. 보고서처럼 딱딱하게 쓰지 말고 실제 상담사가 차분하게 설명하듯 자연스럽게 답변합니다.",
    "2. 계산 결과를 단순 나열하지 말고 공통적으로 반복되는 패턴을 종합해 해석합니다.",
    "3. 업은 죄, 벌, 저주가 아니라 삶에서 반복되는 선택 패턴과 성장 과제로 해석합니다.",
    "4. 전생, 카르마, 영혼이라는 표현은 상징적이고 상담적인 표현으로만 사용합니다.",
    "5. 사용자의 삶을 단정하거나 낙인찍지 않습니다.",
    "6. 평생 벗어날 수 없다는 식의 표현을 쓰지 않습니다.",
    "7. 사주에서는 오행, 십성, 일간, 합충형해파, 대운과 세운의 흐름을 참고합니다.",
    "8. 서양 점성술에서는 Sun, Moon, Ascendant, Chart Ruler, Aspect, House, Transit의 흐름을 참고합니다.",
    "9. 베다 점성술에서는 Lagna, Moon, Nakshatra, Rahu와 Ketu, D9, Dasha의 흐름을 참고합니다.",
    "10. 세 시스템의 결과가 다르게 보이면 억지로 맞추지 말고 겉으로 드러나는 방식과 내면의 작동 방식이 다르다고 조화롭게 설명합니다.",
    "11. 불안감을 조장하지 않습니다.",
    "12. 공포 마케팅을 하지 않습니다.",
    "13. 운세를 절대적 예언처럼 말하지 않습니다.",
    "14. 같은 문장을 반복하지 않습니다.",
    "15. PDF, 챕터, chapter, job, progress, 프롬프트, 시스템이라는 표현을 결과에 노출하지 않습니다.",
    "16. 사용자가 선택한 상담 주제와 자유 질문을 가장 깊게 다룹니다.",
    "17. 마지막에는 사용자가 추가 질문을 할 수 있도록 자연스럽게 상담을 이어갑니다.",
  ].join("\n");
}

function buildFirstPrompt(input, integratedResult) {
  const birth = input.birthInfo || {};
  const place = birth.birthPlace || {};
  return [
    "[상담 정보]",
    `이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `성별: ${birth.gender}`,
    `생년월일: ${birth.birthDate}`,
    `출생시간: ${birth.birthTimeUnknown ? "모름" : birth.birthTime}`,
    `달력: ${birth.calendarType === "lunar" ? "음력" : "양력"}`,
    `출생지: ${[place.city, place.country].filter(Boolean).join(", ")}`,
    `상담 주제: ${input.topic}`,
    `현재 가장 궁금한 질문: ${input.userQuestion}`,
    "",
    "[서버 계산 데이터]",
    JSON.stringify(integratedResult),
    "",
    "아래 흐름을 유지하되, 실제 상담처럼 자연스럽게 이어서 답변하세요.",
    "- 운명의 업 핵심 요약",
    "- 삶에서 반복되는 가장 큰 패턴",
    "- 사주로 본 업의 구조",
    "- 서양 점성술로 본 심리적 반복 패턴",
    "- 베다 점성술로 본 영혼의 과제",
    "- 관계에서 반복되는 상처",
    "- 일과 돈에서 반복되는 숙제",
    "- 가족과 인연의 흐름",
    "- 고독감과 내면의 그림자",
    "- 숨겨진 재능과 풀어야 할 사명",
    "- 지금 인생에서 바뀌어야 할 선택",
    "- 올해 또는 현재 시기의 전환점",
    "- 현실적으로 업을 풀어가는 방법",
    "- 마지막 상담 메시지",
  ].join("\n");
}

function buildFollowUpPrompt(consultation, question) {
  const birth = consultation.birthInfo || {};
  const history = safeArray(consultation.messages)
    .slice(-8)
    .map((message) => `${message.role === "assistant" ? "상담가" : "사용자"}: ${clean(message.content, 1400)}`)
    .join("\n\n");
  return [
    "[상담 정보]",
    `이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `성별: ${birth.gender}`,
    `생년월일: ${birth.birthDate}`,
    `출생시간: ${birth.birthTimeUnknown ? "모름" : birth.birthTime}`,
    `처음 상담 주제: ${consultation.topic}`,
    "",
    "[서버 계산 데이터]",
    JSON.stringify(consultation.integratedResult || {}),
    "",
    "[이전 대화]",
    history,
    "",
    "[새 질문]",
    question,
    "",
    "이전 상담 흐름을 이어받아 질문에 직접 답하고, 업을 죄나 벌이 아닌 반복 패턴과 성장 과제로 풀어주세요.",
  ].join("\n");
}

function cleanForbiddenResult(text) {
  return clean(text)
    .replace(/\bPDF\b/gi, "상담")
    .replace(/챕터/g, "상담 항목")
    .replace(/\bchapter\b/gi, "상담 항목")
    .replace(/\bprogress\b/gi, "흐름")
    .replace(/\bjob\b/gi, "상담")
    .replace(/프롬프트/g, "상담 문장")
    .replace(/시스템/g, "상담 흐름")
    .replace(/\bAI\b/g, "상담");
}

async function generateConsultationText(env, prompt, options = {}) {
  const ai = await callGeminiText(env, prompt, {
    systemPrompt: buildSystemPrompt(),
    taskType: "fortune",
    temperature: 0.74,
    maxOutputTokens: options.maxOutputTokens || 7600,
    timeoutMs: Number(env?.KARMA_DESTINY_AI_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || 65000),
  });
  const provider = clean(ai?.provider || ai?.model || "gemini");
  const isMock = /mock/i.test(provider) || ai?.isMock === true;
  const text = clean(ai?.text);
  if (!ai?.ok || isMock || text.length < (options.minLength || 220)) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed."));
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_GENERATION_FAILED";
    throw error;
  }
  if (!FORBIDDEN_RESULT_PATTERN.test(text)) return { text, provider, model: clean(ai?.model) };

  const repair = await callGeminiText(env, [
    "다음 상담 답변에서 시스템성 표현과 작업 용어를 모두 제거하고, 자연스러운 운명의 업 상담문으로만 다시 써주세요.",
    "",
    text,
  ].join("\n"), {
    systemPrompt: buildSystemPrompt(),
    taskType: "fortune",
    temperature: 0.58,
    maxOutputTokens: options.maxOutputTokens || 7600,
  });
  const repaired = clean(repair?.text);
  return {
    text: cleanForbiddenResult(repair?.ok && repaired.length >= 160 ? repaired : text),
    provider: clean(repair?.provider || provider),
    model: clean(repair?.model || ai?.model),
  };
}

function buildSummaryCards(integratedResult = {}) {
  const synthesis = asObject(integratedResult.synthesis);
  const themes = safeArray(synthesis.karmicThemes).map((item) => clean(item)).filter(Boolean);
  const patterns = safeArray(synthesis.commonPatterns).map((item) => clean(item)).filter(Boolean);
  return {
    keywords: [
      "반복 선택",
      "관계의 매듭",
      "재능의 숙제",
    ],
    repeatingPattern: patterns[0] || "익숙한 감정 반응이 관계와 일의 선택에서 되풀이되는 흐름",
    currentTask: clean(synthesis.currentLifeTask) || themes[0] || "같은 장면에서 한 번 더 느린 선택을 연습하는 일",
  };
}

async function applyUsageOnce({ userId, sessionId, accessType, pricing }) {
  const existing = await KarmaDestinyAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;

  if (accessType === "subscription") {
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
        reason: ORDER_NAME,
        sourceId,
        serviceKey: SERVICE_KEY,
        metadata: { featureKey: FEATURE_KEY, sessionId },
      }).catch((error) => {
        if (error?.code !== 11000) throw error;
      });
    }
  }

  if (accessType === "pass") {
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

  await KarmaDestinyAiConsultation.updateOne(
    { id: sessionId, usageAppliedAt: null },
    { $set: { usageAppliedAt: new Date() } },
  );
  return true;
}

function publicSession(doc) {
  return {
    ok: true,
    sessionId: clean(doc.id),
    accessType: clean(doc.accessType),
    status: clean(doc.status),
    integratedResult: doc.integratedResult || null,
    summaryCards: doc.summaryCards || null,
    messages: safeArray(doc.messages).map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
  };
}

async function handleEnsureAccess(request, env) {
  const body = await readJson(request);
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  const idempotencyKey = readIdempotencyKey(request, body);
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  const pricing = getPricing();
  if (isAdmin(auth)) {
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        accessType: "admin",
        idempotencyKey,
        inputHash: normalized.inputHash,
        usageAlreadyApplied: true,
      }),
      accessType: "admin",
    });
  }

  await connectDb(env);
  const user = await loadBillingUser(auth.userId);
  if (!user) return loginRequired();

  const access = await resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash, body });
  if (access.ok) {
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        accessType: access.accessType,
        idempotencyKey,
        inputHash: normalized.inputHash,
        paymentId: access.paymentId || "",
        billingRequestId: access.billingRequestId || "",
        usageAlreadyApplied: access.usageAlreadyApplied === true,
      }),
      accessType: access.accessType,
    });
  }

  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    message: "운명의 업 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
    paymentPayload: buildBillingGatePayload(pricing, idempotencyKey),
  }, { status: 402 });
}

async function resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey }) {
  const token = clean(body?.accessToken || request.headers.get("x-karma-destiny-ai-access-token"));
  if (token) {
    const payload = await verifyAccessToken(env, token);
    if (clean(payload.userId) !== clean(auth.userId) || clean(payload.idempotencyKey) !== idempotencyKey || clean(payload.inputHash) !== normalized.inputHash) {
      return { ok: false, reason: "INVALID_INPUT", message: "상담 접근 정보가 현재 입력값과 일치하지 않습니다." };
    }
    return {
      ok: true,
      accessType: clean(payload.accessType),
      paymentId: clean(payload.paymentId, 160),
      billingRequestId: clean(payload.billingRequestId, 180),
      usageAlreadyApplied: payload.usageAlreadyApplied === true,
    };
  }

  const billing = await findBillingGateEvidence({ userId: auth.userId, idempotencyKey, body });
  if (billing?.ok) return { ...billing, usageAlreadyApplied: true };

  const user = await loadBillingUser(auth.userId);
  if (!user && !isAdmin(auth)) return { ok: false, reason: "LOGIN_REQUIRED" };
  return resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash, body });
}

async function handleStart(request, env) {
  const body = await readJson(request);
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  const idempotencyKey = readIdempotencyKey(request, body);
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const pricing = getPricing();
  const access = await resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey });
  if (!access.ok) {
    if (access.reason === "LOGIN_REQUIRED") return loginRequired();
    if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
    return paymentVerifyFailed();
  }

  const existing = await KarmaDestinyAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
  if (existing && clean(existing.inputHash) !== normalized.inputHash) {
    return invalidInput("같은 요청 키로 다른 상담 정보를 사용할 수 없습니다.", 409);
  }
  if (existing?.status === "completed") return json(publicSession(existing));
  if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < 90000) {
    return json({ ok: true, sessionId: existing.id, status: "generating", message: "삶의 반복 패턴과 업의 흐름을 읽고 있습니다" }, { status: 202 });
  }

  const sessionId = existing?.id || `kdai_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}_${randomToken(8)}`;
  const now = new Date();
  const seed = {
    id: sessionId,
    userId: clean(auth.userId),
    birthInfo: normalized.input.birthInfo,
    topic: normalized.input.topic,
    userQuestion: normalized.input.userQuestion,
    accessType: access.accessType,
    paymentId: clean(access.paymentId, 160),
    billingRequestId: clean(access.billingRequestId || idempotencyKey, 180),
    messages: [],
    idempotencyKey,
    inputHash: normalized.inputHash,
    status: "generating",
    generationError: null,
  };

  if (existing) {
    await KarmaDestinyAiConsultation.updateOne(
      { id: existing.id },
      { $set: { ...seed, updatedAt: now } },
    );
  } else {
    try {
      await KarmaDestinyAiConsultation.create(seed);
    } catch (error) {
      if (error?.code === 11000) {
        const duplicate = await KarmaDestinyAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
        if (duplicate?.status === "completed") return json(publicSession(duplicate));
        return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: "삶의 반복 패턴과 업의 흐름을 읽고 있습니다" }, { status: 202 });
      }
      throw error;
    }
  }

  try {
    const integratedResult = await buildKarmaDestinyIntegratedResult(env, normalized.input.birthInfo);
    if (!integratedResult?.saju && !integratedResult?.westernAstrology && !integratedResult?.vedicAstrology) {
      return json({ ok: false, reason: "CALCULATION_ERROR", message: CALCULATION_ERROR_MESSAGE }, { status: 422 });
    }
    const summaryCards = buildSummaryCards(integratedResult);
    const generated = await generateConsultationText(env, buildFirstPrompt(normalized.input, integratedResult), { minLength: 360, maxOutputTokens: 8200 });
    if (!access.usageAlreadyApplied && ["pass", "subscription"].includes(access.accessType)) {
      await applyUsageOnce({ userId: auth.userId, sessionId, accessType: access.accessType, pricing });
    } else {
      await KarmaDestinyAiConsultation.updateOne(
        { id: sessionId, usageAppliedAt: null },
        { $set: { usageAppliedAt: new Date() } },
      );
    }
    const completed = await KarmaDestinyAiConsultation.findOneAndUpdate(
      { id: sessionId },
      {
        $set: {
          status: "completed",
          integratedResult,
          summaryCards,
          messages: [
            { role: "user", content: `${normalized.input.topic}\n${normalized.input.userQuestion}`, createdAt: now },
            { role: "assistant", content: generated.text, createdAt: new Date() },
          ],
          llmMeta: { provider: generated.provider, model: generated.model, completedAt: new Date().toISOString() },
          generationError: null,
        },
      },
      { new: true },
    ).lean();
    return json(publicSession(completed));
  } catch (error) {
    await KarmaDestinyAiConsultation.updateOne(
      { id: sessionId },
      {
        $set: {
          status: "generation_failed",
          generationError: {
            code: clean(error?.code || "LLM_GENERATION_FAILED", 80),
            message: clean(error?.message || error, 500),
            at: new Date().toISOString(),
          },
        },
      },
    ).catch(() => {});
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
}

async function handleMessage(request, env) {
  const body = await readJson(request);
  const sessionId = clean(body?.sessionId || body?.consultationId, 120);
  const message = clean(body?.message || body?.question, 1200);
  if (!sessionId) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);
  if (message.length < 2) return invalidInput("추가 질문을 입력해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const consultation = await KarmaDestinyAiConsultation.findOne({
    id: sessionId,
    userId: clean(auth.userId),
    status: "completed",
  }).lean();
  if (!consultation) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);

  try {
    const generated = await generateConsultationText(env, buildFollowUpPrompt(consultation, message), {
      minLength: 100,
      maxOutputTokens: 4600,
    });
    const userMessage = { role: "user", content: message, createdAt: new Date() };
    const assistantMessage = { role: "assistant", content: generated.text, createdAt: new Date() };
    const updated = await KarmaDestinyAiConsultation.findOneAndUpdate(
      { id: sessionId, userId: clean(auth.userId) },
      {
        $push: { messages: { $each: [userMessage, assistantMessage] } },
        $set: {
          llmMeta: { provider: generated.provider, model: generated.model, updatedAt: new Date().toISOString() },
        },
      },
      { new: true },
    ).lean();
    return json(publicSession(updated));
  } catch (error) {
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
}

export async function handleKarmaDestinyAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/karma-destiny-ai");

  try {
    if (method === "POST" && path === "/ensure-access") return await handleEnsureAccess(request, env);
    if (method === "POST" && path === "/start") return await handleStart(request, env);
    if (method === "POST" && path === "/message") return await handleMessage(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[karma-destiny-ai]", clean(error?.code || error?.message || error, 500));
    return serverError();
  }
}

export const __karmaDestinyAiTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  normalizeConsultationInput,
  buildFirstPrompt,
  buildSystemPrompt,
  cleanForbiddenResult,
};
