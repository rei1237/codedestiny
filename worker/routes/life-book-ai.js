import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, mongoose } from "../lib/db.js";
import { LifeBookAiConsultation, MonthlyCreditLedger, PaidExecutionRecord, Payment, PointHistory, User } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canUseByPass, normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";
import { canAccessPaidFeature } from "../lib/paid-feature-access.js";
import { callGeminiText } from "../lib/gemini.js";
import { calculateLifeBookAiSaju } from "../lib/life-book-ai-saju.js";
import { handleBillingRoutes } from "./billing.js";

const SERVICE_KEY = "life-book-ai";
const FEATURE_KEY = "life-book-ai-consultation";
const ACCESS_TOKEN_TYPE = "life-book-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "인생의 책 AI 상담";

const GEMINI_ENV_KEYS = [
  "GEMINIF_API_KEY",
  "GEMINIF_API_KEY1",
  "GEMINIF_API_KEY2",
  "GEMINIF_API_KEY3",
  "GEMINIF_API_KEY4",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
];

const MESSAGES = Object.freeze({
  login: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  paymentRequired: "이용권 또는 결제가 필요한 상담입니다. 결제 정보를 확인해 주세요.",
  paymentVerifyFailed: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  invalidInput: "인생의 책을 열기 위한 정보가 부족합니다. 생년월일과 성별을 다시 확인해 주세요.",
  birthTimeMissing: "출생시간을 입력하거나 출생시간 모름을 선택해 주세요.",
  prepareFailed: "인생의 책 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  llmFailed: "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
  network: "연결이 불안정해요. 잠시 후 다시 시도해 주세요.",
  resultNotFound: "저장된 인생의 책을 찾을 수 없습니다.",
});

const FOCUS_AREA_LABELS = Object.freeze({
  overall: "전체 인생 흐름",
  love: "사랑과 관계의 흐름",
  money: "재물과 안정의 흐름",
  career: "일과 커리어의 방향",
  relationship: "인간관계의 반복 장면",
  family: "가족과 인연의 장",
  lifePurpose: "삶의 목적과 사명",
  turningPoint: "전환점과 기회의 장",
});

const LEGACY_TOPIC_TO_FOCUS = Object.freeze({
  "전체 인생 흐름": "overall",
  "타고난 성향": "overall",
  "인생의 사명": "lifePurpose",
  "직업/사업 방향": "career",
  "재물 흐름": "money",
  "연애와 결혼": "love",
  "인간관계": "relationship",
  "가족과 상처": "family",
  "현재 인생의 전환점": "turningPoint",
  "앞으로의 기회": "turningPoint",
  "반복되는 실패 패턴": "overall",
  "나에게 맞는 삶의 방식": "lifePurpose",
});

const FOCUS_AREAS = new Set(Object.keys(FOCUS_AREA_LABELS));
const FORBIDDEN_RESULT_PATTERN = /\bPDF\b|\bprogress\b|\bjob\b|프롬프트|시스템|\bAI\b|인공지능/gi;
const CANONICAL_TEN_GODS = Object.freeze(["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"]);
const LIFE_BOOK_EXPECTED_CHAPTER_COUNT = 10;
const LIFE_BOOK_MIN_CHAPTER_CONTENT_CHARS = 700;
const LIFE_BOOK_MIN_TOTAL_CONTENT_CHARS = 10000;
const LIFE_BOOK_MAX_TOTAL_CONTENT_CHARS = 20000;
const startLocks = new Map();

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function readProcessEnv(key) {
  if (typeof process === "undefined") return "";
  return clean(process.env?.[key], 2000);
}

function getProviderDiagnostics(env = {}) {
  const hasGeminiKey = GEMINI_ENV_KEYS.some((key) => clean(env?.[key], 2000) || readProcessEnv(key));
  const hasEnvAI = typeof env?.AI?.run === "function";
  return {
    hasEnvAI,
    willUseRealLLM: hasGeminiKey || hasEnvAI,
    providerReason: hasGeminiKey ? "gemini_api_key_available" : hasEnvAI ? "workers_ai_binding_available" : "no_real_llm_provider_detected",
  };
}

function isDevelopmentEnv(env = {}) {
  const mode = clean(env?.NODE_ENV || env?.ENVIRONMENT || env?.APP_ENV || readProcessEnv("NODE_ENV"), 40).toLowerCase();
  return mode && mode !== "production";
}

function maskBirthDate(value) {
  const text = clean(value, 10);
  const match = text.match(/^(\d{4})-/);
  return match ? `${match[1]}-**-**` : "";
}

function maskName(value) {
  const text = clean(value, 80);
  if (!text) return "";
  if (text.length <= 1) return "*";
  return `${text.slice(0, 1)}${"*".repeat(Math.min(3, text.length - 1))}`;
}

function safeLogPayload({ route = "", requestId = "", body = {}, normalized = null, validation = "", access = "", payment = "", env = {}, error = null, providerReason = "" } = {}) {
  const input = normalized?.input || {};
  const birthInfo = input.birthInfo || body.birthInfo || {};
  const diagnostics = getProviderDiagnostics(env);
  return {
    route: clean(route || "/api/life-book-ai", 120),
    requestId: clean(requestId || body.requestId || body.idempotencyKey, 180),
    serviceType: clean(input.serviceType || body.serviceType || body.featureKey || FEATURE_KEY, 80),
    consultationType: clean(input.consultationType || body.consultationType || "lifeBook", 40),
    focusArea: clean(input.focusArea || body.focusArea || "", 40),
    validation,
    access,
    payment,
    name: maskName(input.birthInfo?.name || birthInfo.name || body.userName || body.name),
    gender: clean(input.birthInfo?.gender || birthInfo.gender || body.gender, 20),
    birthDate: maskBirthDate(input.birthInfo?.birthDate || birthInfo.birthDate || body.birthDate),
    calendarType: clean(input.birthInfo?.calendarType || birthInfo.calendarType || body.calendarType, 20),
    emphasisArea: clean(input.focusArea || body.focusArea || "", 40),
    ...diagnostics,
    providerReason: providerReason || diagnostics.providerReason,
    ...(error ? {
      errorMessage: clean(error?.message || error, 500),
      ...(isDevelopmentEnv(env) ? { stack: clean(error?.stack, 2000) } : {}),
    } : {}),
  };
}

function logLifeBookAi(marker, details = {}, level = "info") {
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
  console[method](`[LifeBook AI ${marker}]`, details);
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
      || body?.requestId
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key"),
    180,
  ).replace(/[^a-zA-Z0-9._:-]/g, "-");
}

function randomToken(length = 10) {
  const bytes = new Uint8Array(Math.max(8, Math.ceil(length * 0.75)));
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map((byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, length);
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
  if (["solar", "양력"].includes(text)) return "solar";
  if (["lunar", "음력"].includes(text)) return "lunar";
  return "";
}

function normalizeServiceType(value) {
  const text = clean(value || FEATURE_KEY, 80);
  if ([FEATURE_KEY, SERVICE_KEY].includes(text)) return FEATURE_KEY;
  return "";
}

function normalizeConsultationType(value) {
  const text = clean(value || "lifeBook", 40);
  if (["lifeBook", "lifebook", "life-book", "life_book"].includes(text)) return "lifeBook";
  return "";
}

function normalizeFocusArea(value, fallbackTopic = "") {
  const token = clean(value, 40);
  if (FOCUS_AREAS.has(token)) return token;
  const topic = clean(fallbackTopic, 120);
  if (LEGACY_TOPIC_TO_FOCUS[topic]) return LEGACY_TOPIC_TO_FOCUS[topic];
  const matched = Object.entries(FOCUS_AREA_LABELS).find(([, label]) => label === topic);
  return matched?.[0] || "";
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeConsultationInput(body = {}) {
  const birthSource = body.birthInfo && typeof body.birthInfo === "object" ? body.birthInfo : body;
  const serviceType = normalizeServiceType(body.serviceType || body.featureKey || FEATURE_KEY);
  const consultationType = normalizeConsultationType(body.consultationType || "lifeBook");
  const name = clean(body.userName ?? body.name ?? body.nickname ?? birthSource.name ?? birthSource.nickname, 80);
  const gender = normalizeGender(body.gender ?? birthSource.gender);
  const birthDate = clean(body.birthDate ?? birthSource.birthDate, 10);
  const birthTimeUnknown = body.birthTimeUnknown === true || birthSource.birthTimeUnknown === true;
  const birthTime = birthTimeUnknown ? "" : clean(body.birthTime ?? birthSource.birthTime, 5);
  const calendarType = normalizeCalendarType(body.calendarType ?? birthSource.calendarType);
  const focusArea = normalizeFocusArea(body.focusArea, body.topic ?? body.consultationTopic);
  const topic = clean(body.topic ?? body.consultationTopic ?? FOCUS_AREA_LABELS[focusArea], 120);
  const locale = clean(body.locale || "ko", 12) || "ko";

  if (!serviceType || !consultationType) return { ok: false, message: MESSAGES.invalidInput };
  if (!gender) return { ok: false, message: MESSAGES.invalidInput };
  if (!isValidDateKey(birthDate)) return { ok: false, message: MESSAGES.invalidInput };
  if (!calendarType) return { ok: false, message: MESSAGES.invalidInput };
  if (!birthTimeUnknown && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) return { ok: false, message: MESSAGES.birthTimeMissing };
  if (!focusArea || !FOCUS_AREAS.has(focusArea)) return { ok: false, message: MESSAGES.invalidInput };

  const normalized = {
    serviceType,
    consultationType,
    birthInfo: {
      name,
      gender,
      birthDate,
      birthTime,
      birthTimeUnknown,
      calendarType,
    },
    focusArea,
    topic: topic || FOCUS_AREA_LABELS[focusArea],
    locale,
  };
  return { ok: true, input: normalized, inputHash: sha256(stableJson(normalized)) };
}

function invalidInput(message = MESSAGES.invalidInput, status = 422) {
  return json({ ok: false, reason: "INVALID_INPUT", message }, { status });
}

function loginRequired() {
  return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 });
}

function serverError(message = MESSAGES.prepareFailed, status = 500) {
  return json({ ok: false, reason: "SERVER_ERROR", message }, { status });
}

function paymentVerifyFailed() {
  return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED", message: MESSAGES.paymentVerifyFailed }, { status: 402 });
}

function getPricing() {
  const resolved = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  const pricing = resolved?.pricing || null;
  const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 300);
  const amountKRW = Number(pricing?.amountKRW || pricing?.paymentAmount || 30000);
  if (!resolved?.ok || !pricing || !Number.isInteger(coinPrice) || coinPrice <= 0 || !Number.isInteger(amountKRW) || amountKRW <= 0) {
    const error = new Error("life-book-ai price not found");
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
    .select("email name phoneNumber role points profileSubscription monthlySubscription subscription membership pass entitlement licenses paidFeatures unlockedFeatures")
    .lean();
}

async function findPaidPayment({ userId, idempotencyKey = "", paymentId = "" }) {
  const clauses = [];
  if (idempotencyKey) clauses.push({ idempotencyKey });
  if (paymentId) clauses.push({ merchantUid: paymentId }, { impUid: paymentId }, { requestId: paymentId });
  if (!clauses.length) return null;
  return Payment.findOne({
    userId,
    featureKey: FEATURE_KEY,
    paymentType: "digital_content",
    accessType: "single_purchase",
    status: { $in: ["paid", "success", "fulfilled"] },
    $or: clauses,
  }).sort({ updatedAt: -1, paidAt: -1, createdAt: -1 }).lean();
}

function mapPaidDecision(decision = {}) {
  const source = clean(decision.accessSource).toLowerCase();
  const license = clean(decision.licenseType).toLowerCase();
  const reason = clean(decision.reason).toLowerCase();
  if (license === "single_purchase" || source.includes("paidfeature") || reason.includes("already_purchased")) return null;
  if (source.includes("monthly") || license.includes("monthly") || reason.includes("monthly")) {
    return { accessType: "subscription", accessSource: "monthly_subscription" };
  }
  if (source.includes("license") || license.includes("license")) return { accessType: "pass", accessSource: source || "license" };
  return { accessType: "pass", accessSource: source || "pass" };
}

async function resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash, paymentId = "" }) {
  if (isAdmin(auth) || clean(user?.role).toLowerCase() === "admin") {
    return { ok: true, accessType: "admin", accessSource: "admin", paymentId: "" };
  }

  const paidPayment = await findPaidPayment({ userId: auth.userId, idempotencyKey, paymentId });
  if (paidPayment) {
    const storedHash = clean(paidPayment?.pricingSnapshot?.inputHash);
    if (storedHash && storedHash !== inputHash) return { ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput };
    return { ok: true, accessType: "paid", accessSource: "single_purchase", paymentId: clean(paidPayment.merchantUid || paidPayment.impUid || paymentId, 160) };
  }

  const pass = normalizeHoneyPassEntitlement(user || {});
  if (canUseByPass(pass, pricing.coinPrice)) return { ok: true, accessType: "pass", accessSource: "license_pass", paymentId: "" };

  const decision = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env: pricing.env, reason: ORDER_NAME });
  if (decision?.allowed) {
    const mapped = mapPaidDecision(decision);
    if (mapped) return { ok: true, ...mapped, paymentId: "" };
  }

  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

function buildBillingGatePayload(pricing, idempotencyKey) {
  return {
    featureKey: FEATURE_KEY,
    serviceId: SERVICE_KEY,
    serviceType: FEATURE_KEY,
    contentId: FEATURE_KEY,
    contentType: SERVICE_KEY,
    orderName: ORDER_NAME,
    reason: ORDER_NAME,
    cost: pricing.coinPrice,
    coinPrice: pricing.coinPrice,
    amountKRW: pricing.amountKRW,
    amountKrw: pricing.amountKRW,
    paymentAmount: pricing.amountKRW,
    membershipCreditCost: pricing.membershipCreditCost,
    requestId: idempotencyKey,
    idempotencyKey,
    runtimeGate: {
      categoryKey: "premium-consultation",
      subFeatureKey: FEATURE_KEY,
      featureKey: FEATURE_KEY,
      reason: ORDER_NAME,
      productId: SERVICE_KEY,
      productType: SERVICE_KEY,
      serviceType: FEATURE_KEY,
      cost: pricing.coinPrice,
      coinPrice: pricing.coinPrice,
      amountKRW: pricing.amountKRW,
      membershipCreditCost: pricing.membershipCreditCost,
    },
  };
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function billingGateSource(body = {}) {
  return objectValue(body.billingGate || body.billing || body.billingResult || body.paymentContext || body._paymentContext);
}

function collectBillingObjects(body = {}) {
  const gate = billingGateSource(body);
  const consume = objectValue(body.consume || gate.consume);
  const accessGrant = objectValue(body.accessGrant || gate.accessGrant || gate.accessGateResult);
  const pricing = objectValue(body.pricing || gate.pricing);
  const payment = objectValue(body.payment || gate.payment);
  const licensePass = objectValue(gate.licensePass || gate.membershipPass);
  return { gate, consume, accessGrant, pricing, payment, licensePass };
}

function billingFeatureMatches(body = {}) {
  const { gate, consume, accessGrant, pricing, payment, licensePass } = collectBillingObjects(body);
  const keys = [
    body.featureKey,
    body.subFeatureKey,
    body.serviceType,
    gate.featureKey,
    gate.subFeatureKey,
    gate.serviceType,
    consume.featureKey,
    accessGrant.featureKey,
    pricing.featureKey,
    pricing.subFeatureKey,
    payment.featureKey,
    licensePass.featureKey,
  ].map((item) => clean(item).toLowerCase()).filter(Boolean);
  return keys.includes(FEATURE_KEY) || keys.includes(SERVICE_KEY);
}

function addEvidenceId(ids, value) {
  const id = clean(value, 180);
  if (id) ids.add(id);
}

function collectBillingEvidenceIds(body = {}) {
  const ids = new Set();
  const { gate, consume, accessGrant, payment, licensePass } = collectBillingObjects(body);
  const sources = [body, gate, consume, accessGrant, payment, licensePass];
  for (const source of sources) {
    addEvidenceId(ids, source?._id);
    addEvidenceId(ids, source?.id);
    addEvidenceId(ids, source?.paymentId);
    addEvidenceId(ids, source?.merchantUid);
    addEvidenceId(ids, source?.impUid);
    addEvidenceId(ids, source?.transactionId);
    addEvidenceId(ids, source?.purchaseId);
    addEvidenceId(ids, source?.ledgerId);
    addEvidenceId(ids, source?.evidenceId);
    addEvidenceId(ids, source?.requestId);
    addEvidenceId(ids, source?.idempotencyKey);
    addEvidenceId(ids, source?.orderId);
    addEvidenceId(ids, source?.executionId);
  }
  return [...ids];
}

function objectIdLike(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function pointHistoryEvidenceClauses(ids = []) {
  const clauses = [];
  for (const id of ids) {
    clauses.push({ "metadata.requestId": id });
    clauses.push({ "metadata.purchaseId": id });
    clauses.push({ "metadata.idempotencyKey": id });
    clauses.push({ "metadata.orderId": id });
    clauses.push({ "metadata.transactionId": id });
    clauses.push({ "metadata.ledgerId": id });
    clauses.push({ "metadata.evidenceId": id });
    clauses.push({ impUid: id });
    clauses.push({ merchantUid: id });
    if (objectIdLike(id)) clauses.push({ _id: id }, { paymentId: id });
  }
  return clauses;
}

function paymentEvidenceClauses(ids = []) {
  const clauses = [];
  for (const id of ids) {
    clauses.push({ requestId: id });
    clauses.push({ idempotencyKey: id });
    clauses.push({ merchantUid: id });
    clauses.push({ impUid: id });
    if (objectIdLike(id)) clauses.push({ _id: id });
  }
  return clauses;
}

function monthlyLedgerEvidenceClauses(ids = []) {
  const clauses = [];
  for (const id of ids) {
    clauses.push({ sourceId: id });
    clauses.push({ "metadata.requestId": id });
    clauses.push({ "metadata.purchaseId": id });
    clauses.push({ "metadata.idempotencyKey": id });
    clauses.push({ "metadata.orderId": id });
    clauses.push({ "metadata.pointHistoryId": id });
    clauses.push({ "metadata.transactionId": id });
    clauses.push({ "metadata.ledgerId": id });
    clauses.push({ "metadata.evidenceId": id });
    if (objectIdLike(id)) clauses.push({ _id: id });
  }
  return clauses;
}

function mapBillingGateAccessType(source = {}) {
  const haystack = [
    source.accessType,
    source.accessMethod,
    source.paymentMethod,
    source.transactionType,
    source.paymentMode,
  ].map((item) => clean(item).toLowerCase()).join(" ");
  if (/admin/.test(haystack)) return "admin";
  if (/membership_credit|monthly|moonlight/.test(haystack)) return "subscription";
  if (/membership_pass|family_pass|license|pass|family/.test(haystack)) return "pass";
  return "paid";
}

async function resolveBillingGateAccess({ env, auth, body }) {
  if (!billingFeatureMatches(body)) return null;
  const ids = collectBillingEvidenceIds(body);
  if (!ids.length) return null;

  await connectDb(env);
  const deferredClauses = [];
  for (const id of ids) {
    deferredClauses.push({ requestId: id }, { executionId: id }, { paymentId: id }, { orderId: id });
    if (objectIdLike(id)) deferredClauses.push({ _id: id });
  }
  const deferredRecord = deferredClauses.length
    ? await PaidExecutionRecord.findOne({
      userId: clean(auth.userId),
      featureId: FEATURE_KEY,
      status: { $in: ["paid_pending_generation", "generating", "generation_failed", "completed"] },
      $or: deferredClauses,
    }).sort({ updatedAt: -1, createdAt: -1 }).select("_id executionId accessMethod paymentId result status").lean()
    : null;
  if (deferredRecord) {
    const deferredUsage = objectValue(deferredRecord?.result?.deferredUsage);
    return {
      ok: true,
      accessType: mapBillingGateAccessType({
        accessType: deferredUsage.accessType,
        accessMethod: deferredUsage.paymentMethod || deferredRecord.accessMethod,
      }),
      accessSource: "billing_gate_deferred",
      executionId: clean(deferredRecord.executionId, 160),
      paymentId: String(deferredRecord._id || deferredRecord.paymentId || ""),
    };
  }

  const pointClauses = pointHistoryEvidenceClauses(ids);
  const pointHistory = pointClauses.length
    ? await PointHistory.findOne({
      userId: auth.userId,
      kind: "deduct",
      featureKey: FEATURE_KEY,
      "metadata.refundedForServiceExecution": { $ne: true },
      $or: pointClauses,
    }).sort({ createdAt: -1 }).select("_id delta metadata").lean()
    : null;
  if (pointHistory) {
    return {
      ok: true,
      accessType: mapBillingGateAccessType(pointHistory.metadata || {}),
      accessSource: "billing_gate",
      paymentId: String(pointHistory._id || ""),
      evidenceType: "coin",
      evidenceId: String(pointHistory._id || ""),
      amount: Math.max(0, Math.floor(Math.abs(Number(pointHistory.delta || pointHistory?.metadata?.chargedCoins || 0)))),
    };
  }

  const ledgerClauses = monthlyLedgerEvidenceClauses(ids);
  const ledger = ledgerClauses.length
    ? await MonthlyCreditLedger.findOne({
      userId: auth.userId,
      type: "MONTHLY_CREDIT_SPEND",
      serviceKey: { $in: [FEATURE_KEY, SERVICE_KEY] },
      "metadata.refundedForServiceExecution": { $ne: true },
      $or: ledgerClauses,
    }).sort({ createdAt: -1 }).select("_id amount sourceId").lean()
    : null;
  if (ledger) {
    return {
      ok: true,
      accessType: "subscription",
      accessSource: "billing_gate",
      paymentId: String(ledger._id || ""),
      evidenceType: "monthly_credit",
      evidenceId: String(ledger._id || ""),
      amount: Math.max(0, Math.floor(Number(ledger.amount || 0))),
    };
  }

  const paymentClauses = paymentEvidenceClauses(ids);
  const payment = paymentClauses.length
    ? await Payment.findOne({
      userId: auth.userId,
      paymentType: "digital_content",
      status: { $in: ["paid", "success", "fulfilled"] },
      $and: [
        { $or: paymentClauses },
        {
          $or: [
            { featureKey: FEATURE_KEY },
            { "pricingSnapshot.featureKey": FEATURE_KEY },
            { "metadata.featureKey": FEATURE_KEY },
          ],
        },
      ],
    }).sort({ paidAt: -1, updatedAt: -1, createdAt: -1 }).select("_id merchantUid impUid requestId").lean()
    : null;
  if (payment) {
    return {
      ok: true,
      accessType: "paid",
      accessSource: "billing_gate",
      paymentId: clean(payment.merchantUid || payment.impUid || payment.requestId || payment._id, 160),
      evidenceType: "payment",
      evidenceId: String(payment._id || ""),
    };
  }

  return null;
}

function buildSystemPrompt() {
  return [
    "당신은 30년 경력의 사주 명리학자이자, 한 사람의 삶을 조용히 오래 살펴 온 운명 상담가입니다.",
    "사용자의 생년월일, 성별, 출생시간, 계산된 사주 명리 데이터를 바탕으로 삶의 흐름을 한 권의 책처럼 읽어 줍니다.",
    "질문에 짧게 답하지 말고, 타고난 사주, 성격, 사랑, 일, 재물, 대운, 세운, 삶의 목적이 서로 이어지는 깊은 상담문으로 작성합니다.",
    "각 장은 명식에서 드러나는 근거, 그 근거가 삶에서 만드는 의미, 지금 현실에서 선택할 수 있는 조언의 순서로 자연스럽게 흐르게 합니다.",
    "인생을 단정하거나 겁주지 말고, 사용자가 앞으로 선택할 수 있는 방향을 부드럽고도 분명하게 비춥니다.",
    "“당신은 이렇게 살 운명이다”, “반드시 실패한다”, “무조건 성공한다” 같은 단정적 표현을 쓰지 않습니다.",
    `십성 이름은 계산 데이터에 있는 이름만 그대로 사용합니다. 허용되는 십성 이름: ${CANONICAL_TEN_GODS.join(", ")}.`,
    "각 장은 자연스러운 한국어 문장으로 충분히 길고 구체적으로 작성하되, 같은 표현과 같은 결론을 반복하지 않습니다.",
    "사용자가 실제로 오늘 선택할 수 있는 행동 조언을 포함하고, 조언은 감정 위로와 현실적 방향이 함께 느껴지게 씁니다.",
    "PDF, 다운로드, 진행률, job, prompt, system, AI 같은 기술 표현은 결과에 드러내지 않습니다.",
  ].join("\n");
}

function buildFirstPrompt(input, sajuResult) {
  const birth = input.birthInfo || {};
  return [
    "아래 입력과 계산 가능한 명리 데이터를 바탕으로 인생의 책 리포트를 작성하세요.",
    "문체는 전문 명리학자가 조용한 서재에서 한 사람을 오래 마주하고 직접 읽어 주듯 따뜻하고 깊게 유지하세요.",
    "각 장은 명식 근거, 삶에서 드러나는 의미, 오늘부터 현실에서 조정할 수 있는 선택을 자연스럽게 이어 주세요.",
    "가능하면 아래 JSON 구조만 반환하세요. JSON이 어렵다면 같은 장 구성을 Markdown `##` 제목으로 작성하세요.",
    "",
    "[사용자 입력]",
    `- 이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `- 성별: ${birth.gender}`,
    `- 생년월일: ${birth.birthDate}`,
    `- 출생시간: ${birth.birthTimeUnknown ? "모름" : birth.birthTime}`,
    `- 달력 기준: ${birth.calendarType === "lunar" ? "음력" : "양력"}`,
    `- 리포트 강조 영역: ${input.topic}`,
    "",
    "[계산 가능한 사주 명리 데이터]",
    JSON.stringify(sajuResult, null, 2),
    "",
    "[반환 JSON 구조]",
    JSON.stringify({
      title: "인생의 책",
      subtitle: "타고난 사주와 시간의 흐름으로 읽는 삶의 장면",
      profileSummary: {
        name: birth.name || "",
        birthDate: birth.birthDate || "",
        calendarType: birth.calendarType === "lunar" ? "음력" : "양력",
        birthTime: birth.birthTimeUnknown ? "모름" : birth.birthTime || "",
        gender: birth.gender || "",
      },
      coreSummary: {
        oneLine: "",
        lifeTheme: "",
        strongestElement: "",
        neededBalance: "",
      },
      chapters: [
        { chapterNumber: 1, title: "타고난 사주의 원형", summary: "", content: "", advice: [] },
        { chapterNumber: 2, title: "성격과 내면의 작동 방식", summary: "", content: "", advice: [] },
        { chapterNumber: 3, title: "재능과 일의 방향", summary: "", content: "", advice: [] },
        { chapterNumber: 4, title: "사랑과 인연", summary: "", content: "", advice: [] },
        { chapterNumber: 5, title: "재물과 현실 기반", summary: "", content: "", advice: [] },
        { chapterNumber: 6, title: "인간관계와 가족의 장", summary: "", content: "", advice: [] },
        { chapterNumber: 7, title: "건강과 조후의 균형", summary: "", content: "", advice: [] },
        { chapterNumber: 8, title: "대운으로 보는 인생의 큰 장면", summary: "", content: "", advice: [] },
        { chapterNumber: 9, title: "가까운 시기의 세운 조언", summary: "", content: "", advice: [] },
        { chapterNumber: 10, title: "인생의 책 마지막 문장", summary: "", content: "", advice: [] },
      ],
      expertReadings: [
        { title: "일간과 월지가 여는 중심 기질", content: "", guidance: [] },
        { title: "오행과 조후가 청하는 보완", content: "", guidance: [] },
        { title: "십성으로 읽는 관계와 일의 방식", content: "", guidance: [] },
        { title: "대운과 세운이 비추는 선택의 시기", content: "", guidance: [] },
      ],
      finalMessage: "",
      pdfSections: [],
    }, null, 2),
    "",
    "반드시 포함할 분석: 일간 중심 기질, 월지와 계절감, 오행 균형, 십성 구조, 조후, 강점과 약점, 사랑과 인연, 일과 재능, 재물 흐름, 인간관계, 가족과 뿌리, 건강과 생활 리듬, 대운 흐름, 가까운 세운 흐름, 삶의 목적, 지금 실천할 조언.",
    "십성 이름은 계산 데이터의 tenGods 키와 허용 목록에 있는 이름만 사용하세요. 없는 십성 이름을 새로 만들거나 바꿔 부르지 마세요.",
    "계산 데이터가 제한적이면 단정하지 말고 계산 가능한 범위에서만 상담하세요.",
    "열 장의 content와 expertReadings의 content를 모두 합산한 전체 본문은 10,000자 이상 20,000자 이하로 맞추며, 장별 10,000자가 아니라 전체 합산 기준입니다.",
    "분량이 부족할 때는 같은 문장을 늘리지 말고, 사주 전문가로서 일간·월지·오행·조후·십성·대운·세운을 더 세밀하게 판독하는 expertReadings를 보강하세요.",
    "문장의 양보다 명식 근거, 해석의 연결성, 현실 조언의 정확도를 우선하고, 근거 없이 감성 문장만 길게 늘리지 마세요.",
    "각 장 summary는 한 장의 핵심을 한 문장으로 담고, content는 최소 700자 이상의 3문단 이상으로 충분히 깊게 쓰며, advice는 사용자가 바로 붙잡을 수 있는 현실 조언을 2개 이상 담으세요.",
    "열 장의 관점이 서로 겹치지 않게 하며, 같은 표현을 반복하기보다 장마다 다른 결을 살려 주세요.",
  ].join("\n");
}

function cleanForbiddenResult(value) {
  return clean(value, 60000).replace(FORBIDDEN_RESULT_PATTERN, "").replace(/\n{3,}/g, "\n\n").trim();
}

function extractReportJson(content) {
  const raw = clean(content, 60000).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

function getLifeBookReportQualityIssues(content) {
  const issues = [];
  const text = clean(content, 60000);
  if (!text) return ["empty_result"];
  if (hasForbiddenResultTerms(text)) issues.push("forbidden_terms");
  const report = extractReportJson(text);
  if (!report) {
    issues.push("report_json_missing");
    if (text.length < LIFE_BOOK_MIN_TOTAL_CONTENT_CHARS) issues.push("total_content_too_short");
    if (text.length > LIFE_BOOK_MAX_TOTAL_CONTENT_CHARS) issues.push("total_content_too_long");
    return issues;
  }

  const chapters = Array.isArray(report.chapters) ? report.chapters : [];
  if (chapters.length !== LIFE_BOOK_EXPECTED_CHAPTER_COUNT) issues.push("chapter_count_mismatch");

  let totalContentLength = 0;
  chapters.forEach((chapter, index) => {
    const chapterNumber = index + 1;
    const summary = clean(chapter?.summary, 1200);
    const chapterContent = clean(chapter?.content, 20000);
    const advice = Array.isArray(chapter?.advice)
      ? chapter.advice.map((item) => clean(item, 1000)).filter(Boolean)
      : [];
    totalContentLength += chapterContent.length;
    if (!summary) issues.push(`chapter_${chapterNumber}_summary_missing`);
    if (!chapterContent) issues.push(`chapter_${chapterNumber}_content_missing`);
    if (chapterContent && chapterContent.length < LIFE_BOOK_MIN_CHAPTER_CONTENT_CHARS) issues.push(`chapter_${chapterNumber}_content_too_short`);
    if (!advice.length) issues.push(`chapter_${chapterNumber}_advice_missing`);
  });

  const expertReadings = Array.isArray(report.expertReadings) ? report.expertReadings : [];
  expertReadings.forEach((reading, index) => {
    const readingNumber = index + 1;
    const title = clean(reading?.title, 200);
    const readingContent = clean(reading?.content, 12000);
    const guidance = Array.isArray(reading?.guidance)
      ? reading.guidance.map((item) => clean(item, 1000)).filter(Boolean)
      : [];
    totalContentLength += readingContent.length;
    if (!title) issues.push(`expert_reading_${readingNumber}_title_missing`);
    if (!readingContent) issues.push(`expert_reading_${readingNumber}_content_missing`);
    if (readingContent && readingContent.length < 350) issues.push(`expert_reading_${readingNumber}_content_too_short`);
    if (readingContent && !guidance.length) issues.push(`expert_reading_${readingNumber}_guidance_missing`);
  });

  if (totalContentLength < LIFE_BOOK_MIN_TOTAL_CONTENT_CHARS) issues.push("total_content_too_short");
  if (totalContentLength > LIFE_BOOK_MAX_TOTAL_CONTENT_CHARS) issues.push("total_content_too_long");
  return issues;
}

function buildLifeBookRepairPrompt(content, issues) {
  return [
    "다음 인생의 책 상담문을 같은 JSON 구조로 다시 정돈해 주세요.",
    "열 장을 모두 채우고, 각 장에는 summary, content, advice를 빠짐없이 담아 주세요.",
    "열 장 content와 expertReadings content의 전체 합산은 10,000자 이상 20,000자 이하로 조정하고, 각 장 content는 최소 700자 이상으로 유지해 주세요.",
    "짧은 문장을 반복하지 말고, 부족한 깊이는 사주 전문가의 판독으로 expertReadings에 더해 주세요. 20,000자를 넘었다면 반복되는 위로와 중복 결론을 덜어내고 핵심 근거를 선명하게 남겨 주세요.",
    "각 장 content는 명식 근거, 삶에서 드러나는 의미, 현실 조언이 자연스럽게 이어지도록 충분히 깊게 써 주세요.",
    "전체 본문은 짧게 줄이지 말고, 같은 표현을 반복하지 않으며 전문 명리학자의 상담처럼 부드럽고 분명하게 유지하세요.",
    "기술 표현은 결과에 드러내지 말고, 계산 데이터에 없는 십성 이름은 만들지 마세요.",
    `보완할 지점: ${issues.join(", ")}`,
    "",
    content,
  ].join("\n");
}

function hasForbiddenResultTerms(value) {
  FORBIDDEN_RESULT_PATTERN.lastIndex = 0;
  return FORBIDDEN_RESULT_PATTERN.test(value);
}

async function generateConsultationText(env, prompt, options = {}) {
  const diagnostics = getProviderDiagnostics(env);
  logLifeBookAi("LLM Provider Selected", {
    ...(options.logContext || {}),
    ...diagnostics,
    providerReason: diagnostics.providerReason,
  });
  const ai = await callGeminiText(env, prompt, {
    systemPrompt: buildSystemPrompt(),
    taskType: "fortune",
    temperature: options.temperature || 0.72,
    maxOutputTokens: options.maxOutputTokens || 18000,
    timeoutMs: Number(env.LIFE_BOOK_AI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 55000),
  });
  const provider = clean(ai?.provider || ai?.model || "gemini");
  const isMock = /mock/i.test(provider) || ai?.isMock === true;
  const text = clean(ai?.text);
  if (!ai?.ok || isMock || !text) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed."));
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_GENERATION_FAILED";
    throw error;
  }
  const issues = getLifeBookReportQualityIssues(text);
  if (!issues.length) return { text, provider, model: clean(ai?.model) };

  const repair = await callGeminiText(env, buildLifeBookRepairPrompt(text, issues), {
    systemPrompt: buildSystemPrompt(),
    taskType: "fortune",
    temperature: 0.52,
    maxOutputTokens: Math.max(Number(options.maxOutputTokens || 0), 18000),
  });
  const repaired = cleanForbiddenResult(repair?.ok ? repair?.text : text);
  const repairedIssues = getLifeBookReportQualityIssues(repaired);
  if (repairedIssues.length) {
    const error = new Error(`Life book result quality check failed: ${repairedIssues.join(", ")}`);
    error.code = "LLM_QUALITY_CHECK_FAILED";
    throw error;
  }
  return {
    text: repaired,
    provider: clean(repair?.provider || provider),
    model: clean(repair?.model || ai?.model),
  };
}

function extractTitle(content, fallbackName = "") {
  const report = extractReportJson(content);
  if (report?.title) return clean(report.title, 100);
  const lines = clean(content).split(/\n+/).map((line) => line.replace(/^[-*#\s]+/, "").trim()).filter(Boolean);
  const firstLine = lines[0] || "";
  const title = firstLine
    .replace(/^(인생의 책이 여는 첫 문장|첫 문장)\s*[:：]?\s*/, "")
    .replace(/^["“”'‘’]+|["“”'‘’]+$/g, "")
    .trim();
  return clean(title || `${fallbackName || "당신"}의 인생의 책`, 100);
}

function extractKeywords(content, topic) {
  const report = extractReportJson(content);
  if (Array.isArray(report?.chapters)) {
    const chapterWords = report.chapters.map((chapter) => clean(chapter?.title, 40)).filter(Boolean);
    const picked = [topic, ...chapterWords].filter(Boolean).slice(0, 3);
    while (picked.length < 3) picked.push(["자기 이해", "전환점", "오늘의 행동"][picked.length]);
    return Array.from(new Set(picked)).slice(0, 3);
  }
  const candidates = [
    topic,
    "전환점",
    "자기 이해",
    "관계",
    "재물",
    "기질",
    "오늘의 행동",
  ];
  const text = clean(content);
  const picked = candidates.filter((word) => word && text.includes(word)).slice(0, 3);
  while (picked.length < 3) picked.push(["자기 이해", "전환점", "오늘의 행동"][picked.length]);
  return Array.from(new Set(picked)).slice(0, 3);
}

async function callDeferredBillingRoute({ request, env, path, body }) {
  const url = new URL(request.url);
  url.pathname = `/api/billing/coin-gate/deferred/${path}`;
  url.search = "";
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  return handleBillingRoutes(new Request(url.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }), env);
}

async function finalizeDeferredBillingUsage({ request, env, access, idempotencyKey, sessionId }) {
  if (access.accessSource !== "billing_gate_deferred") return true;
  const response = await callDeferredBillingRoute({
    request,
    env,
    path: "apply",
    body: {
      featureKey: FEATURE_KEY,
      productId: SERVICE_KEY,
      serviceType: FEATURE_KEY,
      reason: ORDER_NAME,
      requestId: idempotencyKey,
      idempotencyKey,
      executionId: access.executionId || access.paymentId || "",
      paymentId: access.paymentId || "",
      sessionId,
      resultId: sessionId,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok !== true) {
    throw Object.assign(new Error(MESSAGES.paymentVerifyFailed), { code: "DEFERRED_USAGE_APPLY_FAILED" });
  }
  return true;
}

async function cancelDeferredBillingUsage({ request, env, access, idempotencyKey, sessionId, error }) {
  if (access?.accessSource !== "billing_gate_deferred") return false;
  await callDeferredBillingRoute({
    request,
    env,
    path: "cancel",
    body: {
      featureKey: FEATURE_KEY,
      productId: SERVICE_KEY,
      serviceType: FEATURE_KEY,
      reason: ORDER_NAME,
      requestId: idempotencyKey,
      idempotencyKey,
      executionId: access.executionId || access.paymentId || "",
      paymentId: access.paymentId || "",
      sessionId,
      code: clean(error?.code || "LLM_GENERATION_FAILED", 80),
      message: clean(error?.message || error, 500),
    },
  }).catch(() => null);
  return true;
}

async function restoreBillingGateAccessOnFailure({ userId, access, reason = MESSAGES.llmFailed }) {
  if (access?.accessSource !== "billing_gate") return false;
  if (access.evidenceType === "coin" && access.evidenceId && access.amount > 0) {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { points: access.amount } },
      { new: true, projection: { points: 1 } },
    ).lean();
    if (!updatedUser) return false;
    await PointHistory.create({
      userId,
      kind: "refund",
      delta: access.amount,
      balanceAfter: Number(updatedUser.points || 0),
      reason,
      featureKey: FEATURE_KEY,
      metadata: {
        source: "life-book-ai",
        refundedForServiceExecution: true,
        originalPointHistoryId: access.evidenceId,
        refundedAt: new Date(),
      },
    }).catch(() => {});
    await PointHistory.updateOne(
      { _id: access.evidenceId, userId },
      { $set: { "metadata.refundedForServiceExecution": true, "metadata.refundedAt": new Date() } },
    ).catch(() => {});
    return true;
  }

  if (access.evidenceType === "monthly_credit" && access.evidenceId && access.amount > 0) {
    const refundSourceId = `life-book-ai-restore:${access.evidenceId}`.slice(0, 180);
    const existing = await MonthlyCreditLedger.findOne({ userId, type: "MONTHLY_CREDIT_GRANT", sourceId: refundSourceId }).lean();
    if (existing) return true;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          "profileSubscription.membershipCreditBalance": access.amount,
          "profileSubscription.membershipCreditUsed": -access.amount,
        },
      },
      { new: true, projection: { profileSubscription: 1 } },
    ).lean();
    if (!updatedUser) return false;
    const afterBalance = Math.max(0, Math.floor(Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0)));
    await MonthlyCreditLedger.create({
      userId,
      type: "MONTHLY_CREDIT_GRANT",
      amount: access.amount,
      beforeBalance: Math.max(0, afterBalance - access.amount),
      afterBalance,
      reason,
      sourceId: refundSourceId,
      serviceKey: FEATURE_KEY,
      metadata: {
        source: "life-book-ai",
        refundedForServiceExecution: true,
        originalLedgerId: access.evidenceId,
        refundedAt: new Date(),
      },
    }).catch((error) => {
      if (error?.code !== 11000) throw error;
    });
    await MonthlyCreditLedger.updateOne(
      { _id: access.evidenceId, userId },
      { $set: { "metadata.refundedForServiceExecution": true, "metadata.refundedAt": new Date() } },
    ).catch(() => {});
    return true;
  }
  return false;
}

async function applyUsageOnce({ request, env, userId, sessionId, access, idempotencyKey, pricing }) {
  const existing = await LifeBookAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;

  if (access.accessSource === "billing_gate_deferred") {
    await finalizeDeferredBillingUsage({ request, env, access, idempotencyKey, sessionId });
  } else if (access.accessSource !== "billing_gate" && access.accessType === "subscription") {
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
        serviceKey: FEATURE_KEY,
        metadata: { featureKey: FEATURE_KEY, sessionId, requestId: idempotencyKey },
      }).catch((error) => {
        if (error?.code !== 11000) throw error;
      });
    }
  } else if (access.accessSource !== "billing_gate" && access.accessType === "pass") {
    await User.updateOne(
      { _id: userId, "profileSubscription.passRemainingUses": { $gt: 0 } },
      {
        $inc: {
          "profileSubscription.passRemainingUses": -1,
          "profileSubscription.passUsedCount": 1,
        },
      },
    ).catch(() => {});
  } else if (access.accessType === "paid" && access.paymentId) {
    await Payment.updateOne(
      { userId, featureKey: FEATURE_KEY, merchantUid: access.paymentId },
      {
        $set: {
          status: "fulfilled",
          orderState: "UNLOCKED",
          reportId: sessionId,
          sessionId,
          "pricingSnapshot.sessionId": sessionId,
          "pricingSnapshot.usageAppliedAt": new Date().toISOString(),
        },
      },
    ).catch(() => {});
  }

  await LifeBookAiConsultation.updateOne(
    { id: sessionId, usageAppliedAt: null },
    { $set: { usageAppliedAt: new Date() } },
  );
  return true;
}

function publicSession(doc) {
  return {
    ok: true,
    sessionId: clean(doc.id),
    consultationId: clean(doc.id),
    idempotencyKey: clean(doc.idempotencyKey),
    accessType: clean(doc.accessType),
    status: clean(doc.status),
    title: clean(doc.title || ""),
    topic: clean(doc.topic || ""),
    birthInfo: doc.birthInfo || null,
    keywords: Array.isArray(doc.keywords) ? doc.keywords : [],
    sajuResult: doc.sajuResult || null,
    reportJson: doc.llmMeta?.reportJson || null,
    generationError: doc.generationError || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    messages: Array.isArray(doc.messages)
      ? doc.messages.map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      }))
      : [],
  };
}

async function handleEnsureAccess(request, env, route = "/api/life-book-ai/prepare") {
  logLifeBookAi("LLM Prepare Start", { route });
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logLifeBookAi("LLM Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));

  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logLifeBookAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "failed", env, error: normalized.message }), "warn");
    return invalidInput(normalized.message);
  }
  if (idempotencyKey.length < 12) return invalidInput(MESSAGES.invalidInput);
  logLifeBookAi("LLM Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", env }));

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  logLifeBookAi("LLM Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: "checking", env }));
  const pricing = { ...getPricing(), env };
  if (isAdmin(auth)) {
    logLifeBookAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: "admin", env }));
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        accessType: "admin",
        accessSource: "admin",
        idempotencyKey,
        inputHash: normalized.inputHash,
      }),
      accessType: "admin",
    });
  }

  await connectDb(env);
  const user = await loadBillingUser(auth.userId);
  if (!user) return loginRequired();

  const access = await resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash });
  if (access.ok) {
    logLifeBookAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: access.accessType, env }));
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        accessType: access.accessType,
        accessSource: access.accessSource,
        idempotencyKey,
        inputHash: normalized.inputHash,
        paymentId: access.paymentId || "",
      }),
      accessType: access.accessType,
    });
  }
  if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);

  logLifeBookAi("Payment Required", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: "payment_required", env }));
  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    paymentPayload: buildBillingGatePayload(pricing, idempotencyKey),
  }, { status: 402 });
}

async function resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey }) {
  const token = clean(body?.accessToken || request.headers.get("x-life-book-ai-access-token"));
  if (token) {
    try {
      const payload = await verifyAccessToken(env, token);
      if (clean(payload.userId) !== clean(auth.userId) || clean(payload.idempotencyKey) !== idempotencyKey || clean(payload.inputHash) !== normalized.inputHash) {
        return { ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput };
      }
      return {
        ok: true,
        accessType: clean(payload.accessType),
        accessSource: clean(payload.accessSource),
        paymentId: clean(payload.paymentId, 160),
      };
    } catch (_) {
      return { ok: false, reason: "PAYMENT_VERIFY_FAILED" };
    }
  }

  const billingGateAccess = await resolveBillingGateAccess({ env, auth, body });
  if (billingGateAccess?.ok) return billingGateAccess;

  const user = await loadBillingUser(auth.userId);
  if (!user && !isAdmin(auth)) return { ok: false, reason: "LOGIN_REQUIRED" };
  return resolveServerAccess({ auth, user, pricing: { ...pricing, env }, idempotencyKey, inputHash: normalized.inputHash });
}

function buildLimitedSajuResult(error, birthInfo = {}) {
  return {
    yearPillar: "",
    monthPillar: "",
    dayPillar: "",
    hourPillar: "",
    dayMaster: "",
    fiveElements: null,
    tenGods: null,
    strength: "",
    usefulGod: "",
    unfavorableGod: "",
    majorLuck: null,
    yearlyLuck: null,
    calculationMeta: {
      available: false,
      birthTimeUnknown: Boolean(birthInfo.birthTimeUnknown),
      limitation: "입력값 기준으로 계산 가능한 범위에서만 상담합니다.",
      errorCode: clean(error?.code || "SAJU_CALCULATION_LIMITED", 80),
    },
  };
}

async function handleResult(request, env, pathId = "") {
  const url = new URL(request.url);
  const attemptId = clean(url.searchParams.get("attemptId") || url.searchParams.get("idempotencyKey"), 180);
  const sessionId = clean(pathId || url.searchParams.get("sessionId") || url.searchParams.get("consultationId"), 120);
  if (!attemptId && !sessionId) return invalidInput(MESSAGES.resultNotFound, 404);

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const clauses = [];
  if (attemptId) clauses.push({ idempotencyKey: attemptId }, { id: attemptId });
  if (sessionId) clauses.push({ id: sessionId });

  const consultation = await LifeBookAiConsultation.findOne({
    userId: clean(auth.userId),
    $or: clauses,
  }).lean();

  if (!consultation) return json({ ok: false, reason: "RESULT_NOT_FOUND", message: MESSAGES.resultNotFound }, { status: 404 });
  if (consultation.status === "generating") {
    return json({ ...publicSession(consultation), message: "인생의 책을 완성하는 중입니다." }, { status: 202 });
  }
  if (consultation.status === "generation_failed") {
    return json({
      ...publicSession(consultation),
      ok: false,
      reason: "LLM_ERROR",
      message: MESSAGES.llmFailed,
    }, { status: 503 });
  }

  const payload = publicSession(consultation);
  const assistantContent = payload.messages.find((message) => message.role === "assistant")?.content || "";
  if (!assistantContent.trim()) {
    return json({ ok: false, reason: "RESULT_EMPTY", message: MESSAGES.llmFailed }, { status: 409 });
  }
  return json(payload);
}

async function handleStart(request, env, route = "/api/life-book-ai/generate") {
  logLifeBookAi("LLM Generate Start", { route });
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logLifeBookAi("LLM Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));

  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logLifeBookAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "failed", env, error: normalized.message }), "warn");
    return invalidInput(normalized.message);
  }
  if (idempotencyKey.length < 12) return invalidInput(MESSAGES.invalidInput);
  logLifeBookAi("LLM Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", env }));

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  const lockKey = `${clean(auth.userId)}:${idempotencyKey}`;
  if (startLocks.has(lockKey)) return startLocks.get(lockKey);

  const pending = (async () => {
    await connectDb(env);
    const pricing = getPricing();
    logLifeBookAi("LLM Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: "checking", env }));
    const access = await resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey });
    if (!access.ok) {
      if (access.reason === "LOGIN_REQUIRED") return loginRequired();
      if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
      return paymentVerifyFailed();
    }
    logLifeBookAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: access.accessType, env }));

    const existing = await LifeBookAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
    if (existing && clean(existing.inputHash) !== normalized.inputHash) return invalidInput(MESSAGES.invalidInput, 409);
    if (existing?.status === "completed") return json(publicSession(existing));
    if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < 90000) {
      return json({ ok: true, sessionId: existing.id, status: "generating", message: "인생의 책 상담문을 완성하는 중입니다." }, { status: 202 });
    }

    let sajuResult = null;
    try {
      sajuResult = calculateLifeBookAiSaju(normalized.input.birthInfo);
    } catch (error) {
      sajuResult = buildLimitedSajuResult(error, normalized.input.birthInfo);
      logLifeBookAi("LLM Error", safeLogPayload({
        route,
        requestId: idempotencyKey,
        body,
        normalized,
        validation: "saju_calculation_limited",
        access: access.accessType,
        env,
        error,
      }), "warn");
    }

    const sessionId = existing?.id || `lbai_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}_${randomToken(8)}`;
    const now = new Date();
    const seed = {
      id: sessionId,
      userId: clean(auth.userId),
      birthInfo: normalized.input.birthInfo,
      sajuResult,
      topic: normalized.input.topic,
      accessType: access.accessType,
      accessSource: access.accessSource || "",
      paymentId: clean(access.paymentId, 160),
      messages: [],
      title: "",
      keywords: [],
      idempotencyKey,
      inputHash: normalized.inputHash,
      status: "generating",
      generationError: null,
      llmMeta: {
        input: {
          serviceType: normalized.input.serviceType,
          consultationType: normalized.input.consultationType,
          focusArea: normalized.input.focusArea,
          locale: normalized.input.locale,
        },
      },
    };

    if (existing) {
      await LifeBookAiConsultation.updateOne(
        { id: existing.id },
        { $set: { ...seed, updatedAt: now } },
      );
    } else {
      try {
        await LifeBookAiConsultation.create(seed);
      } catch (error) {
        if (error?.code === 11000) {
          const duplicate = await LifeBookAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
          if (duplicate?.status === "completed") return json(publicSession(duplicate));
          return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: "인생의 책 상담문을 완성하는 중입니다." }, { status: 202 });
        }
        throw error;
      }
    }

    try {
      const logContext = safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: access.accessType, env });
      const generated = await generateConsultationText(env, buildFirstPrompt(normalized.input, sajuResult), {
        minLength: LIFE_BOOK_MIN_TOTAL_CONTENT_CHARS,
        maxOutputTokens: 18000,
        logContext,
      });
      await applyUsageOnce({
        request,
        env,
        userId: auth.userId,
        sessionId,
        access,
        idempotencyKey,
        pricing,
      });
      if (access.accessType === "pass") {
        logLifeBookAi("Pass Consumed", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: access.accessType, payment: "usage_applied", env }));
      }
      const title = extractTitle(generated.text, normalized.input.birthInfo.name);
      const keywords = extractKeywords(generated.text, normalized.input.topic);
      const reportJson = extractReportJson(generated.text);
      const completed = await LifeBookAiConsultation.findOneAndUpdate(
        { id: sessionId },
        {
          $set: {
            status: "completed",
            title,
            keywords,
            messages: [
              { role: "user", content: `리포트 강조 영역: ${normalized.input.topic}`, createdAt: now },
              { role: "assistant", content: generated.text, createdAt: new Date() },
            ],
            llmMeta: {
              provider: generated.provider,
              model: generated.model,
              reportJson,
              completedAt: new Date().toISOString(),
              input: {
                serviceType: normalized.input.serviceType,
                consultationType: normalized.input.consultationType,
                focusArea: normalized.input.focusArea,
                locale: normalized.input.locale,
              },
            },
            generationError: null,
          },
        },
        { new: true },
      ).lean();
      logLifeBookAi("LLM Generate Success", safeLogPayload({
        route,
        requestId: idempotencyKey,
        body,
        normalized,
        validation: "passed",
        access: access.accessType,
        payment: "usage_applied",
        env,
        providerReason: generated.provider || generated.model,
      }));
      return json(publicSession(completed));
    } catch (error) {
      const deferredCanceled = await cancelDeferredBillingUsage({
        request,
        env,
        access,
        idempotencyKey,
        sessionId,
        error,
      });
      const restored = deferredCanceled || await restoreBillingGateAccessOnFailure({ userId: auth.userId, access, reason: MESSAGES.llmFailed }).catch(() => false);
      logLifeBookAi("Refund Or Restore", safeLogPayload({
        route,
        requestId: idempotencyKey,
        body,
        normalized,
        validation: "passed",
        access: access.accessType,
        payment: restored ? "restored_or_canceled" : "no_deferred_usage_to_restore",
        env,
        error,
      }), restored ? "info" : "warn");
      await LifeBookAiConsultation.updateOne(
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
      logLifeBookAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: access.accessType, env, error }), "error");
      if (clean(error?.code) === "DEFERRED_USAGE_APPLY_FAILED") return paymentVerifyFailed();
      return json({ ok: false, reason: "LLM_ERROR", message: MESSAGES.llmFailed }, { status: 503 });
    }
  })().catch((error) => {
    logLifeBookAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "server_error", env, error }), "error");
    return serverError();
  }).finally(() => {
    startLocks.delete(lockKey);
  });
  startLocks.set(lockKey, pending);
  return pending;
}

export async function handleLifeBookAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/life-book-ai");
  const route = `/api/life-book-ai${path}`;
  try {
    logLifeBookAi("Route Matched", { route, method });
    if (method === "GET" && path === "/result") return await handleResult(request, env);
    if (method === "GET" && path.startsWith("/result/")) return await handleResult(request, env, path.slice("/result/".length));
    if (method === "POST" && (path === "/prepare" || path === "/ensure-access")) {
      return await handleEnsureAccess(request, env, path === "/prepare" ? "/api/life-book-ai/prepare" : "/api/life-book-ai/ensure-access");
    }
    if (method === "POST" && (path === "/generate" || path === "/start")) {
      return await handleStart(request, env, path === "/generate" ? "/api/life-book-ai/generate" : "/api/life-book-ai/start");
    }
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    logLifeBookAi("LLM Error", {
      route,
      message: clean(error?.message || error, 500),
      ...(isDevelopmentEnv(env) ? { stack: clean(error?.stack, 2000) } : {}),
    }, "error");
    return serverError();
  }
}

export const __lifeBookAiTestUtils = {
  normalizeConsultationInput,
  extractTitle,
  extractKeywords,
  cleanForbiddenResult,
};
