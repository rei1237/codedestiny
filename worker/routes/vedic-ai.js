import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, mongoose } from "../lib/db.js";
import { MonthlyCreditLedger, Payment, PointHistory, User, VedicAiConsultation } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canUseByPass, normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";
import { callGeminiText } from "../lib/gemini.js";
import { calculateVedicAiChart } from "../lib/vedic-ai-chart.js";

const SERVICE_KEY = "vedic-ai";
const FEATURE_KEY = "vedic-ai-consultation";
const PRODUCT_ID = "vedic-ai-consultation";
const CONSULTATION_TYPE = "vedic";
const ACCESS_TOKEN_TYPE = "vedic-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "베다점 AI 상담";
const AMOUNT_KRW = 30000;
const COIN_PRICE = 300;
const startLocks = new Map();

const FOCUS_AREA_LABELS = Object.freeze({
  overall: "전체 흐름",
  love: "연애와 인연",
  money: "재물과 자원",
  career: "일과 진로",
  health: "건강과 에너지",
  relationship: "관계와 협력",
  spirituality: "영성과 내면",
  custom: "직접 질문",
});
const FOCUS_AREA_VALUES = new Set(Object.keys(FOCUS_AREA_LABELS));
const GEMINI_ENV_KEYS = [
  "GEMINIF_API_KEY",
  "GEMINIF_API_KEY1",
  "GEMINIF_API_KEY2",
  "GEMINIF_API_KEY3",
  "GEMINIF_API_KEY4",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
];

const MESSAGES = {
  login: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  paymentRequired: "이용권 또는 결제가 필요한 상담입니다. 결제 정보를 확인해 주세요.",
  paymentVerifyFailed: "결제 정보를 확인하지 못했어요. 결제나 이용권은 차감되지 않았습니다.",
  invalidInput: "베다점 상담에 필요한 정보가 부족해요. 생년월일, 성별, 출생시간 정보를 다시 확인해 주세요.",
  birthTimeRequired: "베다점은 출생시간이 중요해요. 출생시간을 입력하거나 ‘출생시간 모름’을 선택해 주세요.",
  customQuestionRequired: "직접 질문을 선택했다면 지금 가장 궁금한 내용을 함께 적어 주세요.",
  placeInvalid: "출생지와 시간대를 확인하기 어려워요. 도시명 또는 시간대를 다시 확인해 주세요.",
  calculationFailed: "베다 차트를 계산하는 중 문제가 발생했어요. 입력한 출생 정보를 다시 확인해 주세요.",
  serverFailed: "베다점 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  llmFailed: "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
};

const SYSTEM_PROMPT = [
  "당신은 베다 점성술, 조티시, 나크샤트라, 라시 차트, 다샤 흐름을 바탕으로 상담하는 전문 상담가입니다.",
  "사용자의 생년월일, 성별, 출생시간, 가능한 경우 출생지와 차트 정보를 바탕으로 현재 질문에 맞는 상담을 제공합니다.",
  "답변은 신비롭지만 현실적인 문장으로 작성합니다.",
  "전문 용어를 무리하게 나열하지 말고, 사용자가 이해하기 쉬운 말로 풀어 설명합니다.",
  "불안감을 자극하거나 과장된 예언을 하지 않습니다.",
  "무조건 성공한다, 반드시 실패한다 같은 단정적 표현을 쓰지 않습니다.",
  "사용자가 실제로 선택할 수 있는 행동 조언을 제시합니다.",
  "",
  "결과는 아래 흐름을 자연스러운 한국어 상담문으로 나누어 작성합니다.",
  "1. 우주가 말하는 핵심 결론",
  "2. 나의 베다 차트 기질",
  "3. 현재 질문과 연결되는 별의 흐름",
  "4. 나크샤트라가 비추는 감정",
  "5. 일과 재물의 방향",
  "6. 관계와 인연의 흐름",
  "7. 조심해야 할 선택",
  "8. 오늘의 별빛 행동 처방",
  "9. 마지막 조언",
  "",
  "AI, 시스템, PDF, 챕터, job, progress, 프롬프트 같은 구현 용어는 결과에 드러내지 않습니다.",
].join("\n");

function clean(value, maxLength = 0) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function cleanMultiline(value, maxLength = 0) {
  const text = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function normalizeId(value) {
  return clean(value, 180).replace(/[^a-zA-Z0-9._:-]/g, "-");
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

function objectId(userId) {
  const id = String(userId || "");
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

function isDevEnv(env) {
  return ["development", "dev", "local", "test"].includes(clean(env?.NODE_ENV || env?.ENVIRONMENT).toLowerCase());
}

function maskedBirthDate(value) {
  const text = clean(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text.slice(0, 4)}-**-**` : "";
}

function errorPayload(error, env) {
  return {
    errorMessage: clean(error?.message || error, 300),
    ...(isDevEnv(env) && error?.stack ? { stack: String(error.stack).slice(0, 2000) } : {}),
  };
}

function logVedicAi(stage, payload = {}, level = "log") {
  const logger = typeof console[level] === "function" ? console[level] : console.log;
  logger(`[Vedic AI ${stage}]`, payload);
}

function routeLogContext(request, body = {}, normalized = null, requestId = "") {
  const input = normalized?.input || {};
  return {
    route: new URL(request.url).pathname,
    requestId: requestId || clean(body.requestId || body.idempotencyKey, 180),
    serviceType: clean(body.serviceType || FEATURE_KEY, 80),
    focusArea: clean(input.focusArea || body.focusArea || "", 40),
    birthDate: maskedBirthDate(input.birthInfo?.birthDate || body.birthDate || body.birthInfo?.birthDate),
    questionLength: clean(input.userQuestion || body.question || body.userQuestion || body.message).length,
  };
}

function readIdempotencyKey(request, body = {}) {
  return normalizeId(
    body?.requestId
      || body?.idempotencyKey
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key"),
  );
}

function randomSuffix() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, 12);
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidBirthTime(value) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function normalizeGender(value) {
  const text = clean(value, 20).toLowerCase();
  if (["m", "male", "man", "남", "남성", "남자"].includes(text)) return "male";
  if (["f", "female", "woman", "여", "여성", "여자"].includes(text)) return "female";
  if (["unknown", "other", "none", "비공개", "기타"].includes(text)) return "unknown";
  return text || "";
}

function normalizeCalendarType(value) {
  const text = clean(value, 20).toLowerCase();
  if (["solar", "gregorian", "양력"].includes(text)) return "solar";
  if (["lunar", "음력"].includes(text)) return "lunar";
  return "";
}

function inferFocusAreaFromTopic(topic) {
  const text = clean(topic, 80);
  if (/연애|사랑|결혼|인연/.test(text)) return "love";
  if (/돈|재물|금전/.test(text)) return "money";
  if (/직업|사업|일|진로|창업/.test(text)) return "career";
  if (/건강|멘탈|에너지/.test(text)) return "health";
  if (/관계|가족|부모/.test(text)) return "relationship";
  if (/영성|카르마|전환/.test(text)) return "spirituality";
  return "overall";
}

function normalizeFocusArea(value, fallbackTopic = "") {
  const text = clean(value, 40).toLowerCase();
  if (FOCUS_AREA_VALUES.has(text)) return text;
  return inferFocusAreaFromTopic(fallbackTopic);
}

function normalizeBirthPlace(body = {}, sourceBirth = {}) {
  const rawBirthPlace = body.birthPlace ?? sourceBirth.birthPlace ?? {};
  const src = rawBirthPlace && typeof rawBirthPlace === "object" ? rawBirthPlace : {};
  const label = typeof rawBirthPlace === "string"
    ? clean(rawBirthPlace, 120)
    : clean(src.label || src.displayName || src.place || src.city || "", 120);
  const [cityFromLabel = "", countryFromLabel = ""] = label.split(",").map((item) => item.trim());
  const latitude = Number(body.latitude ?? src.latitude ?? src.lat);
  const longitude = Number(body.longitude ?? src.longitude ?? src.lng ?? src.lon);
  const place = {
    city: clean(src.city || cityFromLabel || src.place || sourceBirth.birthCity, 80),
    country: clean(src.country || countryFromLabel, 80),
    timezone: clean(body.timezone || src.timezone || src.timeZone || sourceBirth.timezone, 80),
  };
  if (Number.isFinite(latitude)) place.latitude = latitude;
  if (Number.isFinite(longitude)) place.longitude = longitude;
  return place;
}

function normalizeConsultationInput(body = {}) {
  const sourceBirth = body.birthInfo && typeof body.birthInfo === "object" ? body.birthInfo : {};
  const rawTopic = clean(body.topic ?? body.consultationTopic, 80);
  const focusArea = normalizeFocusArea(body.focusArea, rawTopic);
  const name = clean(body.userName ?? body.name ?? body.nickname ?? sourceBirth.name, 80);
  const gender = normalizeGender(body.gender ?? sourceBirth.gender);
  const birthDate = clean(body.birthDate ?? sourceBirth.birthDate, 10);
  const birthTimeUnknown = body.birthTimeUnknown === true || sourceBirth.birthTimeUnknown === true;
  const birthTime = clean(body.birthTime ?? sourceBirth.birthTime, 5);
  const calendarType = normalizeCalendarType(body.calendarType ?? sourceBirth.calendarType);
  const birthPlace = normalizeBirthPlace(body, sourceBirth);
  const topic = FOCUS_AREA_LABELS[focusArea] || rawTopic || FOCUS_AREA_LABELS.overall;
  const userQuestion = clean(body.question ?? body.userQuestion ?? body.message, 1500);
  const errors = [];

  if (body.serviceType && clean(body.serviceType, 80) !== FEATURE_KEY) errors.push("serviceType");
  if (body.consultationType && clean(body.consultationType, 40) !== CONSULTATION_TYPE) errors.push("consultationType");
  if (!gender) errors.push("gender");
  if (!isValidDateKey(birthDate)) errors.push("birthDate");
  if (!calendarType) errors.push("calendarType");
  if (!birthTimeUnknown && !isValidBirthTime(birthTime)) errors.push("birthTime");
  if (!birthPlace.city && !birthPlace.timezone && (!Number.isFinite(Number(birthPlace.latitude)) || !Number.isFinite(Number(birthPlace.longitude)))) errors.push("birthPlace");
  if (!FOCUS_AREA_VALUES.has(focusArea)) errors.push("focusArea");
  if (focusArea === "custom" && userQuestion.length < 2) errors.push("question");

  const normalized = {
    serviceType: FEATURE_KEY,
    consultationType: CONSULTATION_TYPE,
    locale: clean(body.locale, 10) || "ko",
    focusArea,
    birthInfo: {
      name,
      gender,
      birthDate,
      birthTime: birthTimeUnknown ? "" : birthTime,
      birthTimeUnknown,
      calendarType,
      birthPlace,
    },
    topic,
    userQuestion,
  };

  let message = MESSAGES.invalidInput;
  if (errors.includes("birthTime")) message = MESSAGES.birthTimeRequired;
  if (errors.includes("question")) message = MESSAGES.customQuestionRequired;
  if (errors.includes("birthPlace")) message = MESSAGES.placeInvalid;

  return {
    ok: errors.length === 0,
    errors,
    message,
    input: normalized,
    inputHash: sha256(stableJson(normalized)),
  };
}

function getPricing() {
  const resolved = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  const pricing = resolved?.pricing || null;
  const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 0);
  const amountKRW = Number(pricing?.amountKRW || pricing?.paymentAmount || coinPrice * 100);
  if (!resolved?.ok || !pricing || coinPrice !== COIN_PRICE || amountKRW !== AMOUNT_KRW) {
    const error = new Error("vedic-ai price not found");
    error.code = "PRICE_NOT_FOUND";
    throw error;
  }
  return {
    pricing: { ...pricing, featureKey: FEATURE_KEY, productId: PRODUCT_ID },
    coinPrice,
    amountKRW,
    membershipCreditCost: calculateMembershipCreditCost(coinPrice),
  };
}

function buildPaymentPayload(idempotencyKey) {
  const pricing = getPricing();
  return {
    serviceKey: SERVICE_KEY,
    serviceType: FEATURE_KEY,
    consultationType: CONSULTATION_TYPE,
    featureKey: FEATURE_KEY,
    productId: PRODUCT_ID,
    reason: ORDER_NAME,
    orderName: ORDER_NAME,
    title: ORDER_NAME,
    cost: pricing.coinPrice,
    coinPrice: pricing.coinPrice,
    amountKRW: pricing.amountKRW,
    amountKrw: pricing.amountKRW,
    paymentAmount: pricing.amountKRW,
    membershipCreditCost: pricing.membershipCreditCost,
    requestId: idempotencyKey,
    idempotencyKey,
    paymentType: "digital_content",
    allowedPaymentModes: ["MEMBERSHIP_PASS", "MOONLIGHT_STONE", "DIRECT_KRW"],
    commonPaidGate: true,
  };
}

async function createAccessToken(env, payload) {
  return signJwt({
    typ: ACCESS_TOKEN_TYPE,
    serviceKey: SERVICE_KEY,
    featureKey: FEATURE_KEY,
    ...payload,
  }, getAccessTokenSecret(env), {
    expiresIn: ACCESS_TOKEN_TTL,
    issuer: getJwtIssuer(env),
    audience: getJwtAudience(env),
  });
}

async function verifyAccessToken(env, token) {
  const payload = await verifyJwt(token, getAccessTokenSecret(env), {
    issuer: getJwtIssuer(env),
    audience: getJwtAudience(env),
  });
  if (payload?.typ !== ACCESS_TOKEN_TYPE || payload?.serviceKey !== SERVICE_KEY || payload?.featureKey !== FEATURE_KEY) {
    throw Object.assign(new Error("INVALID_ACCESS_TOKEN"), { status: 403 });
  }
  return payload;
}

function loginRequired() {
  return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 });
}

function invalidInput(message = MESSAGES.invalidInput, errors = []) {
  return json({ ok: false, reason: "INVALID_INPUT", message, errors }, { status: 422 });
}

function paymentRequired(idempotencyKey) {
  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    message: MESSAGES.paymentRequired,
    paymentPayload: buildPaymentPayload(idempotencyKey),
  }, { status: 402 });
}

function paymentVerifyFailed() {
  return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED", message: MESSAGES.paymentVerifyFailed }, { status: 402 });
}

function serverError(message = MESSAGES.serverFailed, status = 500, reason = "SERVER_ERROR") {
  return json({ ok: false, reason, message }, { status });
}

async function loadBillingUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(String(userId || ""))) return null;
  return User.findById(userId)
    .select("email name phoneNumber points role profileSubscription subscription membership pass entitlement paidFeatures unlockedFeatures recentConsumeRequestIds usagePasses")
    .lean();
}

function isAdmin(auth = {}, user = {}) {
  return clean(auth.role || user?.role).toLowerCase() === "admin";
}

function collectEvidenceIds(...sources) {
  const ids = new Set();
  const visit = (value, depth = 0) => {
    if (depth > 4 || value == null) return;
    if (typeof value === "string" || typeof value === "number") {
      const text = normalizeId(value);
      if (text && text.length <= 180) ids.add(text);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (typeof value === "object") {
      [
        "transactionId", "paymentId", "purchaseId", "requestId", "idempotencyKey",
        "orderId", "merchantUid", "impUid", "evidenceId", "ledgerId", "pointHistoryId",
        "monthlyCreditLedgerId", "_id",
      ].forEach((key) => {
        if (value[key]) visit(value[key], depth + 1);
      });
      ["payload", "data", "accessGrant", "consume", "payment", "order", "access", "billingEvidence"].forEach((key) => {
        if (value[key]) visit(value[key], depth + 1);
      });
    }
  };
  sources.forEach((source) => visit(source));
  return Array.from(ids).filter(Boolean);
}

function flattenEvidence(body = {}) {
  const evidence = body.billingEvidence && typeof body.billingEvidence === "object"
    ? body.billingEvidence
    : (body.paymentEvidence && typeof body.paymentEvidence === "object" ? body.paymentEvidence : {});
  return {
    ...evidence,
    bodyPaymentId: body.paymentId,
    bodyTransactionId: body.transactionId,
    bodyAccessGrant: body.accessGrant,
    bodyConsume: body.consume,
    bodyPayment: body.payment,
  };
}

function readEvidenceAccessType(evidence = {}, body = {}) {
  const signal = [
    body.accessType,
    body.accessMethod,
    body.paymentMode,
    evidence.accessType,
    evidence.accessMethod,
    evidence.paymentMode,
    evidence.bodyAccessGrant?.accessType,
    evidence.bodyAccessGrant?.accessMethod,
    evidence.bodyConsume?.accessType,
    evidence.bodyConsume?.accessMethod,
    stableJson(evidence),
  ].map((value) => clean(value).toLowerCase()).filter(Boolean).join("|");
  if (signal.includes("membership_credit") || signal.includes("moonlight_stone") || signal.includes("monthly")) return "subscription";
  if (signal.includes("membership_pass") || signal.includes("usage_pass") || signal.includes("family") || signal.includes("pass")) return "pass";
  if (signal.includes("coin") || signal.includes("point")) return "paid";
  return "paid";
}

function pointHistoryTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ "metadata.requestId": token });
    clauses.push({ "metadata.purchaseId": token });
    clauses.push({ "metadata.idempotencyKey": token });
    clauses.push({ "metadata.orderId": token });
    clauses.push({ "metadata.transactionId": token });
    clauses.push({ "metadata.pointHistoryId": token });
    if (mongoose.Types.ObjectId.isValid(token)) clauses.push({ _id: new mongoose.Types.ObjectId(token) });
  });
  return clauses;
}

function monthlyCreditTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ sourceId: token });
    clauses.push({ "metadata.requestId": token });
    clauses.push({ "metadata.purchaseId": token });
    clauses.push({ "metadata.idempotencyKey": token });
    clauses.push({ "metadata.orderId": token });
    clauses.push({ "metadata.pointHistoryId": token });
    clauses.push({ "metadata.ledgerId": token });
    clauses.push({ "metadata.monthlyCreditLedgerId": token });
    if (mongoose.Types.ObjectId.isValid(token)) clauses.push({ _id: new mongoose.Types.ObjectId(token) });
  });
  return clauses;
}

async function findDirectPayment(userObjectId, ids, idempotencyKey) {
  const clauses = [];
  if (idempotencyKey) clauses.push({ idempotencyKey }, { requestId: idempotencyKey });
  ids.forEach((id) => {
    clauses.push({ idempotencyKey: id }, { requestId: id }, { merchantUid: id }, { impUid: id });
    if (mongoose.Types.ObjectId.isValid(id)) clauses.push({ _id: new mongoose.Types.ObjectId(id) });
  });
  if (!clauses.length) return null;
  return Payment.findOne({
    userId: userObjectId,
    featureKey: FEATURE_KEY,
    paymentType: "digital_content",
    status: { $in: ["paid", "processing", "success", "fulfilled"] },
    paymentAmount: AMOUNT_KRW,
    $or: clauses,
  }).sort({ updatedAt: -1, paidAt: -1, createdAt: -1 }).lean();
}

async function findPointEvidence(userObjectId, ids, idempotencyKey, pricing) {
  const clauses = pointHistoryTokenClauses(Array.from(new Set([idempotencyKey, ...ids].filter(Boolean))));
  if (!clauses.length) return null;
  const history = await PointHistory.findOne({
    userId: userObjectId,
    featureKey: FEATURE_KEY,
    kind: "deduct",
    "metadata.coinRefundedForUnlockFailure": { $ne: true },
    "metadata.refundedForServiceExecution": { $ne: true },
    $or: clauses,
  }).sort({ createdAt: -1 }).lean();
  if (!history) return null;
  return {
    accessType: "paid",
    paymentId: clean(history._id, 160),
    source: "coin-history",
    prepaid: true,
    evidenceType: "coin",
    evidenceId: clean(history._id, 160),
    amount: Math.max(0, Math.floor(Math.abs(Number(history.delta || history?.metadata?.chargedCoins || pricing.coinPrice || 0)))),
    purchaseId: clean(history?.metadata?.purchaseId || history?.metadata?.idempotencyKey || history?.metadata?.orderId || idempotencyKey, 180),
  };
}

async function findMonthlyEvidence(userObjectId, ids, idempotencyKey, pricing) {
  const clauses = monthlyCreditTokenClauses(Array.from(new Set([idempotencyKey, ...ids].filter(Boolean))));
  if (!clauses.length) return null;
  const ledger = await MonthlyCreditLedger.findOne({
    userId: userObjectId,
    type: "MONTHLY_CREDIT_SPEND",
    serviceKey: { $in: [FEATURE_KEY, SERVICE_KEY] },
    "metadata.refundedForUnlockFailure": { $ne: true },
    "metadata.refundedForServiceExecution": { $ne: true },
    $or: clauses,
  }).sort({ createdAt: -1 }).lean();
  if (!ledger) return null;
  return {
    accessType: "subscription",
    paymentId: clean(ledger._id, 160),
    source: "monthly-ledger",
    prepaid: true,
    evidenceType: "monthly_credit",
    evidenceId: clean(ledger._id, 160),
    amount: Math.max(0, Math.floor(Number(ledger.amount || pricing.membershipCreditCost || 0))),
    purchaseId: clean(ledger.sourceId || ledger?.metadata?.purchaseId || ledger?.metadata?.idempotencyKey || idempotencyKey, 180),
  };
}

async function resolveBillingEvidence({ env, userId, body, idempotencyKey, pricing }) {
  const userObjectId = objectId(userId);
  if (!userObjectId) return null;
  const evidence = flattenEvidence(body);
  const ids = collectEvidenceIds(evidence, body.paymentId, body.transactionId, body.accessGrant, body.consume, idempotencyKey);
  const likelyAccessType = readEvidenceAccessType(evidence, body);
  await connectDb(env);

  const user = await loadBillingUser(userObjectId);
  if (likelyAccessType === "pass") {
    const usageMarker = `usage-pass:${FEATURE_KEY}:${idempotencyKey}`;
    const usagePassConsumed = Array.isArray(user?.recentConsumeRequestIds) && user.recentConsumeRequestIds.includes(usageMarker);
    const pass = normalizeHoneyPassEntitlement(user || {});
    if (usagePassConsumed || canUseByPass(pass, pricing.coinPrice)) {
      const category = clean(evidence.bodyConsume?.category || evidence.bodyAccessGrant?.category || "", 120);
      return {
        accessType: "pass",
        paymentId: ids[0] || "",
        source: usagePassConsumed ? "usage-pass" : "pass-entitlement",
        prepaid: usagePassConsumed,
        evidenceType: usagePassConsumed ? "usage_pass" : "pass",
        usageMarker: usagePassConsumed ? usageMarker : "",
        usageCategory: category,
      };
    }
  }

  const direct = await findDirectPayment(userObjectId, ids, idempotencyKey);
  if (direct) {
    return {
      accessType: "paid",
      paymentId: clean(direct.merchantUid || direct.impUid || direct._id, 160),
      source: "direct-payment",
      paymentDocId: clean(direct._id, 160),
      prepaid: true,
      evidenceType: "direct_payment",
      evidenceId: clean(direct._id, 160),
    };
  }

  if (likelyAccessType === "subscription") {
    const monthly = await findMonthlyEvidence(userObjectId, ids, idempotencyKey, pricing);
    if (monthly) return monthly;
  }

  const point = await findPointEvidence(userObjectId, ids, idempotencyKey, pricing);
  if (point) return point;

  const monthly = await findMonthlyEvidence(userObjectId, ids, idempotencyKey, pricing);
  if (monthly) return monthly;

  return null;
}

async function restorePrepaidAccessOnFailure({ userId, access = {}, idempotencyKey = "", pricing = getPricing(), error = null, env = {} }) {
  if (!access?.prepaid) return false;
  const userObjectId = objectId(userId);
  if (!userObjectId) return false;
  const evidenceType = clean(access.evidenceType, 80);
  const evidenceId = clean(access.evidenceId || access.paymentId, 160);
  const failureMessage = clean(error?.message || error || "service execution failed", 500);
  const now = new Date();

  try {
    if (evidenceType === "usage_pass" && access.usageMarker && access.usageCategory) {
      await User.updateOne(
        {
          _id: userObjectId,
          recentConsumeRequestIds: access.usageMarker,
          "usagePasses.category": access.usageCategory,
        },
        {
          $inc: { "usagePasses.$.remainingUses": 1 },
          $set: { "usagePasses.$.updatedAt": now },
          $pull: { recentConsumeRequestIds: access.usageMarker },
        },
      );
      return true;
    }

    if (evidenceType === "coin" && mongoose.Types.ObjectId.isValid(evidenceId)) {
      const history = await PointHistory.findOne({
        _id: new mongoose.Types.ObjectId(evidenceId),
        userId: userObjectId,
        kind: "deduct",
        featureKey: FEATURE_KEY,
        "metadata.refundedForServiceExecution": { $ne: true },
      }).lean();
      if (!history) return false;

      const refundCoins = Math.max(0, Math.floor(Math.abs(Number(history.delta || access.amount || pricing.coinPrice || 0))));
      if (!refundCoins) return false;

      const marked = await PointHistory.updateOne(
        { _id: history._id, userId: userObjectId, "metadata.refundedForServiceExecution": { $ne: true } },
        {
          $set: {
            "metadata.refundedForServiceExecution": true,
            "metadata.serviceExecutionRefundedAt": now,
            "metadata.serviceExecutionFailureMessage": failureMessage,
          },
        },
      );
      if (!marked.modifiedCount) return false;

      const purchaseId = clean(access.purchaseId || history?.metadata?.purchaseId || history?.metadata?.idempotencyKey || idempotencyKey, 180);
      const updated = await User.findByIdAndUpdate(
        userObjectId,
        {
          $inc: { points: refundCoins },
          ...(purchaseId ? { $pull: { recentConsumeRequestIds: purchaseId } } : {}),
        },
        { new: true, projection: { points: 1 } },
      ).lean();

      await PointHistory.create({
        userId: userObjectId,
        kind: "refund",
        delta: refundCoins,
        balanceAfter: Math.max(0, Math.floor(Number(updated?.points || 0))),
        reason: `${ORDER_NAME} 생성 실패 환급`,
        featureKey: FEATURE_KEY,
        metadata: {
          refundedForServiceExecution: true,
          originalPointHistoryId: clean(history._id, 160),
          idempotencyKey,
          purchaseId,
          failureMessage,
        },
      }).catch(() => {});
      return true;
    }

    if (evidenceType === "monthly_credit") {
      const ledgerQuery = mongoose.Types.ObjectId.isValid(evidenceId)
        ? { _id: new mongoose.Types.ObjectId(evidenceId) }
        : { sourceId: access.purchaseId || idempotencyKey };
      const ledger = await MonthlyCreditLedger.findOne({
        ...ledgerQuery,
        userId: userObjectId,
        type: "MONTHLY_CREDIT_SPEND",
        serviceKey: { $in: [FEATURE_KEY, SERVICE_KEY] },
        "metadata.refundedForServiceExecution": { $ne: true },
      }).lean();
      if (!ledger) return false;

      const refundCredit = Math.max(0, Math.floor(Number(ledger.amount || access.amount || pricing.membershipCreditCost || 0)));
      if (!refundCredit) return false;

      const marked = await MonthlyCreditLedger.updateOne(
        { _id: ledger._id, userId: userObjectId, "metadata.refundedForServiceExecution": { $ne: true } },
        {
          $set: {
            "metadata.refundedForServiceExecution": true,
            "metadata.serviceExecutionRefundedAt": now,
            "metadata.serviceExecutionFailureMessage": failureMessage,
          },
        },
      );
      if (!marked.modifiedCount) return false;

      const purchaseId = clean(access.purchaseId || ledger.sourceId || idempotencyKey, 180);
      await User.findByIdAndUpdate(
        userObjectId,
        {
          $inc: {
            "profileSubscription.membershipCreditBalance": refundCredit,
            "profileSubscription.membershipCreditUsed": -refundCredit,
          },
          ...(purchaseId ? { $pull: { recentConsumeRequestIds: purchaseId } } : {}),
        },
      ).catch(() => {});

      const clauses = pointHistoryTokenClauses([purchaseId, evidenceId, idempotencyKey].filter(Boolean));
      if (clauses.length) {
        await PointHistory.updateMany(
          {
            userId: userObjectId,
            kind: "deduct",
            featureKey: FEATURE_KEY,
            "metadata.refundedForServiceExecution": { $ne: true },
            $or: clauses,
          },
          {
            $set: {
              "metadata.refundedForServiceExecution": true,
              "metadata.serviceExecutionRefundedAt": now,
              "metadata.serviceExecutionFailureMessage": failureMessage,
            },
          },
        ).catch(() => {});
      }
      return true;
    }
  } catch (restoreError) {
    logVedicAi("Refund Or Restore", {
      userId: clean(userId, 80),
      evidenceType,
      evidenceId,
      restored: false,
      ...errorPayload(restoreError, env),
    }, "warn");
  }
  return false;
}

function compactChartForPrompt(chart) {
  return {
    ayanamsa: chart.ayanamsa,
    lagna: chart.lagna,
    moon: chart.moon,
    sun: chart.sun,
    planets: chart.planets,
    rahuKetu: chart.rahuKetu,
    houses: chart.houses,
    divisionalCharts: chart.divisionalCharts,
    yogas: chart.yogas,
    dasha: chart.dasha,
    transits: chart.transits,
    chartSummary: chart.chartSummary,
    calculationMeta: chart.calculationMeta,
  };
}

function buildFirstPrompt(input, chart) {
  return [
    "아래 베다 차트와 사용자 질문을 바탕으로 조티시 상담을 시작하세요.",
    "불안을 자극하지 말고, 사용자가 오늘 실제로 선택할 수 있는 방향을 제시하세요.",
    "",
    `이름 또는 닉네임: ${input.birthInfo.name || "미입력"}`,
    `성별: ${input.birthInfo.gender}`,
    `생년월일: ${input.birthInfo.birthDate}`,
    `출생시간: ${input.birthInfo.birthTimeUnknown ? "모름" : input.birthInfo.birthTime}`,
    `달력 기준: ${input.birthInfo.calendarType}`,
    `출생지: ${[input.birthInfo.birthPlace?.city, input.birthInfo.birthPlace?.country].filter(Boolean).join(", ") || "미입력"}`,
    `시간대: ${input.birthInfo.birthPlace?.timezone || "미입력"}`,
    `상담 주제: ${input.topic}`,
    `자유 질문: ${input.userQuestion || "전체 흐름을 먼저 알고 싶습니다."}`,
    `해석 기준: ${chart.calculationMeta?.interpretationMode === "moon-chart" ? "출생시간이 불확실하므로 Moon Chart 중심" : "Lagna Chart 중심"}`,
    "",
    "계산된 베다 차트 데이터:",
    JSON.stringify(compactChartForPrompt(chart), null, 2),
  ].join("\n");
}

function buildFollowUpPrompt(consultation, question) {
  const recentMessages = (consultation.messages || []).slice(-8).map((message) => ({
    role: message.role,
    content: message.content,
  }));
  return [
    "이전 상담 맥락과 계산된 베다 차트를 유지하면서 사용자의 추가 질문에 답하세요.",
    "별의 이름을 나열하는 대신, 지금의 선택과 감정 흐름으로 부드럽게 풀어 주세요.",
    "",
    `상담 주제: ${consultation.topic}`,
    `추가 질문: ${question}`,
    "",
    "계산된 베다 차트 데이터:",
    JSON.stringify(compactChartForPrompt(consultation.vedicChart || {}), null, 2),
    "",
    "최근 상담 맥락:",
    JSON.stringify(recentMessages, null, 2),
  ].join("\n");
}

function sanitizeAssistantText(value) {
  let text = cleanMultiline(value, 60000);
  text = text.replace(/\bPDF\b/gi, "상담문");
  text = text.replace(/챕터|chapter/gi, "흐름");
  text = text.replace(/\bjob\b/gi, "상담");
  text = text.replace(/\bprogress\b/gi, "진행");
  text = text.replace(/프롬프트/g, "질문");
  text = text.replace(/시스템/g, "상담 기준");
  return text.trim();
}

function getProviderDiagnostics(env) {
  const hasGeminiEnv = GEMINI_ENV_KEYS.some((key) => Boolean(clean(env?.[key])));
  const hasWorkersAi = Boolean(env?.AI);
  return {
    hasEnvAI: hasGeminiEnv || hasWorkersAi,
    willUseRealLLM: hasGeminiEnv || hasWorkersAi,
    providerReason: hasGeminiEnv ? "gemini-env" : (hasWorkersAi ? "workers-ai-binding" : "missing-ai-env"),
  };
}

async function callConsultationLlm(env, prompt, logContext = {}) {
  logVedicAi("LLM Provider Selected", {
    ...logContext,
    ...getProviderDiagnostics(env),
  });
  const result = await callGeminiText(env, prompt, {
    systemPrompt: SYSTEM_PROMPT,
    maxOutputTokens: 6500,
    temperature: 0.72,
    taskType: "fortune",
  });
  const provider = clean(result?.provider || result?.model || "gemini");
  const isMock = /mock/i.test(provider) || result?.isMock === true;
  const content = sanitizeAssistantText(result?.text || "");
  if (!result?.ok || isMock || !content) {
    const error = new Error(result?.message || (isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_FAILED"));
    error.code = "LLM_FAILED";
    error.llm = result || null;
    throw error;
  }
  return { content, meta: { provider, model: clean(result.model || ""), isMock: false } };
}

function summaryCards(chart) {
  const dasha = [chart.dasha?.currentMahadasha, chart.dasha?.currentAntardasha].filter(Boolean).join(" / ");
  const keywordSeed = [
    chart.lagna?.sign ? `${chart.lagna.sign} Lagna` : "Moon Chart",
    chart.moon?.nakshatra || chart.moon?.sign || "",
    chart.rahuKetu?.rahu?.house ? `Rahu ${chart.rahuKetu.rahu.house}H` : "",
    dasha || "",
  ].filter(Boolean);
  return {
    lagna: chart.lagna?.sign || "Moon Chart",
    moonSign: chart.moon?.sign || "",
    nakshatra: chart.moon?.nakshatra || "",
    currentDasha: dasha,
    keywords: keywordSeed.slice(0, 4),
    d1: chart.divisionalCharts?.d1 || null,
    d9: chart.divisionalCharts?.d9 || null,
  };
}

function consultationPayload(doc) {
  return {
    id: doc.id,
    status: doc.status,
    birthInfo: doc.birthInfo,
    topic: doc.topic,
    userQuestion: doc.userQuestion || "",
    vedicChart: doc.vedicChart,
    accessType: doc.accessType,
    paymentId: doc.paymentId || "",
    messages: doc.messages || [],
    summaryCards: summaryCards(doc.vedicChart || {}),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function handleEnsureAccess(request, env) {
  if (request.method !== "POST") return methodNotAllowed();
  const body = await readJson(request);
  const normalized = normalizeConsultationInput(body);
  const idempotencyKey = readIdempotencyKey(request, body);
  const context = routeLogContext(request, body, normalized, idempotencyKey);
  logVedicAi("LLM Prepare Start", context);
  logVedicAi("LLM Payload Received", context);

  if (!normalized.ok) {
    logVedicAi("LLM Payload Validated", { ...context, validationResult: "failed", errors: normalized.errors }, "warn");
    return invalidInput(normalized.message, normalized.errors);
  }
  logVedicAi("LLM Payload Validated", { ...context, validationResult: "success" });

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth?.userId) return loginRequired();
  const requestId = idempotencyKey || `vedic-ai-${auth.userId}-${normalized.inputHash.slice(0, 16)}-${Date.now()}-${randomSuffix()}`;
  const pricing = getPricing();
  logVedicAi("LLM Access Check Start", { ...context, requestId });

  await connectDb(env);
  const existing = await VedicAiConsultation.findOne({
    userId: String(auth.userId),
    idempotencyKey: requestId,
    inputHash: normalized.inputHash,
    status: "completed",
  }).lean();
  if (existing) {
    const accessToken = await createAccessToken(env, {
      userId: String(auth.userId),
      idempotencyKey: requestId,
      inputHash: normalized.inputHash,
      accessType: existing.accessType,
      paymentId: existing.paymentId || "",
      reuse: true,
    });
    logVedicAi("LLM Access Check Success", { ...context, requestId, accessCheckResult: "existing" });
    return json({
      ok: true,
      accessToken,
      accessType: existing.accessType,
      consultation: consultationPayload(existing),
    });
  }

  const user = await loadBillingUser(auth.userId);
  if (isAdmin(auth, user)) {
    const accessToken = await createAccessToken(env, {
      userId: String(auth.userId),
      idempotencyKey: requestId,
      inputHash: normalized.inputHash,
      accessType: "pass",
      paymentId: "",
      admin: true,
    });
    logVedicAi("LLM Access Check Success", { ...context, requestId, accessCheckResult: "admin" });
    return json({ ok: true, accessToken, accessType: "pass" });
  }

  logVedicAi("LLM Access Check Success", {
    ...context,
    requestId,
    accessCheckResult: "payment_required",
    coinPrice: pricing.coinPrice,
  });
  return paymentRequired(requestId);
}

async function resolveStartAccess({ env, auth, body, normalized, idempotencyKey, pricing }) {
  const token = clean(body.accessToken);
  if (token) {
    const payload = await verifyAccessToken(env, token);
    if (String(payload.userId) !== String(auth.userId) || payload.idempotencyKey !== idempotencyKey || payload.inputHash !== normalized.inputHash) {
      throw Object.assign(new Error("INVALID_ACCESS_TOKEN"), { status: 403 });
    }
    return {
      accessType: payload.accessType || "paid",
      paymentId: payload.paymentId || "",
      source: payload.admin ? "admin-token" : "access-token",
      prepaid: false,
    };
  }
  return resolveBillingEvidence({
    env,
    userId: auth.userId,
    body,
    idempotencyKey,
    pricing,
  });
}

async function generateConsultation({ request, env, auth, body, normalized, idempotencyKey }) {
  const pricing = getPricing();
  const context = routeLogContext(request, body, normalized, idempotencyKey);
  await connectDb(env);
  const existing = await VedicAiConsultation.findOne({
    userId: String(auth.userId),
    idempotencyKey,
  });
  if (existing?.status === "completed" && existing.inputHash === normalized.inputHash) {
    return json({ ok: true, consultation: consultationPayload(existing.toObject()) });
  }

  const access = await resolveStartAccess({ env, auth, body, normalized, idempotencyKey, pricing });
  if (!access) return paymentVerifyFailed();
  logVedicAi("LLM Payment Guard Passed", { ...context, accessCheckResult: access.source || access.accessType });

  const sessionId = existing?.id || `vedic-ai-${Date.now()}-${randomSuffix()}`;
  const doc = existing || new VedicAiConsultation({
    id: sessionId,
    userId: String(auth.userId),
    idempotencyKey,
    inputHash: normalized.inputHash,
  });
  doc.birthInfo = normalized.input.birthInfo;
  doc.topic = normalized.input.topic;
  doc.userQuestion = normalized.input.userQuestion;
  doc.accessType = ["pass", "subscription"].includes(access.accessType) ? access.accessType : "paid";
  doc.paymentId = access.paymentId || "";
  doc.status = "generating";
  doc.generationError = null;
  doc.messages = [];
  await doc.save();

  let chart;
  try {
    logVedicAi("Chart Data Start", context);
    chart = await calculateVedicAiChart(env, normalized.input, { requestUrl: request.url });
    logVedicAi("Chart Data Success", {
      ...context,
      hasLagna: Boolean(chart?.lagna),
      hasNakshatra: Boolean(chart?.moon?.nakshatra),
      interpretationMode: clean(chart?.calculationMeta?.interpretationMode, 80),
    });
  } catch (error) {
    doc.status = "generation_failed";
    doc.generationError = { code: error?.code || "CHART_CALCULATION_FAILED", message: clean(error?.message || error, 500), at: new Date() };
    await doc.save();
    const restored = await restorePrepaidAccessOnFailure({ userId: auth.userId, access, idempotencyKey, pricing, error, env });
    logVedicAi("Refund Or Restore", { ...context, restored, reason: "chart_failed" }, restored ? "log" : "warn");
    logVedicAi("LLM Error", { ...context, ...errorPayload(error, env) }, "error");
    if (error?.code === "BIRTH_PLACE_INVALID") return serverError(MESSAGES.placeInvalid, 422, "BIRTH_PLACE_INVALID");
    return serverError(MESSAGES.calculationFailed, 422, "CHART_CALCULATION_FAILED");
  }

  try {
    logVedicAi("LLM Generate Start", context);
    const { content, meta } = await callConsultationLlm(env, buildFirstPrompt(normalized.input, chart), context);
    doc.vedicChart = chart;
    doc.messages = [
      ...(normalized.input.userQuestion ? [{ role: "user", content: normalized.input.userQuestion, createdAt: new Date() }] : []),
      { role: "assistant", content, createdAt: new Date() },
    ];
    doc.status = "completed";
    doc.usageAppliedAt = doc.usageAppliedAt || new Date();
    doc.llmMeta = meta;
    await doc.save();
    if (access.source === "direct-payment" && access.paymentDocId) {
      await Payment.updateOne(
        { _id: new mongoose.Types.ObjectId(access.paymentDocId), userId: objectId(auth.userId), featureKey: FEATURE_KEY },
        { $set: { status: "fulfilled", sessionId: doc.id, orderState: "UNLOCKED" } },
      ).catch(() => {});
    }
    logVedicAi("LLM Generate Success", { ...context, provider: meta.provider, model: meta.model });
    return json({ ok: true, consultation: consultationPayload(doc.toObject()) });
  } catch (error) {
    doc.vedicChart = chart;
    doc.status = "generation_failed";
    doc.generationError = { code: "LLM_FAILED", message: clean(error?.message || error, 500), at: new Date() };
    await doc.save();
    const restored = await restorePrepaidAccessOnFailure({ userId: auth.userId, access, idempotencyKey, pricing, error, env });
    logVedicAi("Refund Or Restore", { ...context, restored, reason: "llm_failed" }, restored ? "log" : "warn");
    logVedicAi("LLM Error", { ...context, ...errorPayload(error, env) }, "error");
    return serverError(MESSAGES.llmFailed, 502, "LLM_FAILED");
  }
}

async function handleStart(request, env) {
  if (request.method !== "POST") return methodNotAllowed();
  const body = await readJson(request);
  const normalized = normalizeConsultationInput(body);
  const idempotencyKey = readIdempotencyKey(request, body);
  const context = routeLogContext(request, body, normalized, idempotencyKey);
  logVedicAi("Submit Start", context);

  if (!normalized.ok) {
    logVedicAi("LLM Payload Validated", { ...context, validationResult: "failed", errors: normalized.errors }, "warn");
    return invalidInput(normalized.message, normalized.errors);
  }
  logVedicAi("LLM Payload Validated", { ...context, validationResult: "success" });

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth?.userId) return loginRequired();
  if (!idempotencyKey) return invalidInput(MESSAGES.invalidInput);
  getPricing();

  const lockKey = `${auth.userId}:${idempotencyKey}`;
  if (startLocks.has(lockKey)) return startLocks.get(lockKey);
  const promise = generateConsultation({ request, env, auth, body, normalized, idempotencyKey })
    .finally(() => startLocks.delete(lockKey));
  startLocks.set(lockKey, promise);
  return promise;
}

async function handleMessage(request, env) {
  if (request.method !== "POST") return methodNotAllowed();
  const body = await readJson(request);
  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth?.userId) return loginRequired();
  const consultationId = clean(body.consultationId || body.sessionId, 120);
  const content = clean(body.message || body.question, 1800);
  if (!consultationId || content.length < 2) return invalidInput("상담에 이어서 물어볼 내용을 입력해 주세요.");

  await connectDb(env);
  const consultation = await VedicAiConsultation.findOne({
    userId: String(auth.userId),
    id: consultationId,
    status: "completed",
  });
  if (!consultation) return notFound();

  const context = {
    route: new URL(request.url).pathname,
    requestId: consultation.idempotencyKey,
    serviceType: FEATURE_KEY,
    focusArea: "",
    questionLength: content.length,
  };

  try {
    logVedicAi("LLM Generate Start", context);
    const { content: answer, meta } = await callConsultationLlm(env, buildFollowUpPrompt(consultation.toObject(), content), context);
    consultation.messages.push({ role: "user", content, createdAt: new Date() });
    consultation.messages.push({ role: "assistant", content: answer, createdAt: new Date() });
    consultation.llmMeta = meta;
    await consultation.save();
    logVedicAi("LLM Generate Success", { ...context, provider: meta.provider, model: meta.model });
    return json({ ok: true, consultation: consultationPayload(consultation.toObject()) });
  } catch (error) {
    logVedicAi("LLM Error", { ...context, ...errorPayload(error, env) }, "error");
    return serverError(MESSAGES.llmFailed, 502, "LLM_FAILED");
  }
}

export async function handleVedicAiRoutes(request, env) {
  const path = getRoutePath(request, "/api/vedic-ai");
  if (path === "/ensure-access") return handleEnsureAccess(request, env);
  if (path === "/start") return handleStart(request, env);
  if (path === "/message") return handleMessage(request, env);
  return notFound();
}

export const __vedicAiTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  normalizeConsultationInput,
  buildFirstPrompt,
  buildPaymentPayload,
  sanitizeAssistantText,
  collectEvidenceIds,
};
