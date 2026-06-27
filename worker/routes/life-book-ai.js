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
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "AI 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const INVALID_INPUT_MESSAGE = "생년월일과 상담 정보를 다시 확인해 주세요.";
const CALCULATION_ERROR_MESSAGE = "명식 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.";
const TOPICS = new Set([
  "전체 인생 흐름",
  "타고난 성향",
  "인생의 사명",
  "직업/사업 방향",
  "재물 흐름",
  "연애와 결혼",
  "인간관계",
  "가족과 상처",
  "현재 인생의 전환점",
  "앞으로의 기회",
  "반복되는 실패 패턴",
  "나에게 맞는 삶의 방식",
]);
const FORBIDDEN_RESULT_PATTERN = /\bPDF\b|챕터|chapter|\bprogress\b|\bjob\b|프롬프트|시스템|\bAI\b|인공지능/gi;
const startLocks = new Map();

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
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
  ).replace(/[^a-zA-Z0-9._:-]/g, "-");
}

function randomToken(length = 10) {
  const bytes = new Uint8Array(Math.max(8, Math.ceil(length * 0.75)));
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, length);
}

function normalizeGender(value) {
  const text = clean(value, 20).toLowerCase();
  if (["m", "male", "man", "남", "남성", "남자"].includes(text)) return "male";
  if (["f", "female", "woman", "여", "여성", "여자"].includes(text)) return "female";
  if (["other", "unknown", "none", "기타", "비공개"].includes(text)) return "other";
  return text || "";
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeConsultationInput(body = {}) {
  const birthInfo = body.birthInfo && typeof body.birthInfo === "object" ? body.birthInfo : {};
  const name = clean(body.name ?? body.nickname ?? birthInfo.name, 80);
  const gender = normalizeGender(body.gender ?? birthInfo.gender);
  const birthDate = clean(body.birthDate ?? birthInfo.birthDate, 10);
  const birthTimeUnknown = body.birthTimeUnknown === true || birthInfo.birthTimeUnknown === true;
  const birthTime = birthTimeUnknown ? "" : clean(body.birthTime ?? birthInfo.birthTime, 5);
  const calendarType = clean(body.calendarType ?? birthInfo.calendarType, 20).toLowerCase();
  const topic = clean(body.topic ?? body.questionTopic ?? body.consultationTopic, 120);

  if (!gender) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!isValidDateKey(birthDate)) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!birthTimeUnknown && birthTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (calendarType !== "solar" && calendarType !== "lunar") return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!TOPICS.has(topic)) return { ok: false, message: INVALID_INPUT_MESSAGE };

  const normalized = {
    birthInfo: {
      name,
      gender,
      birthDate,
      birthTime,
      birthTimeUnknown,
      calendarType,
    },
    topic,
  };
  return { ok: true, input: normalized, inputHash: sha256(stableJson(normalized)) };
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

function paymentVerifyFailed() {
  return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED", message: PAYMENT_VERIFY_FAILED_MESSAGE }, { status: 402 });
}

function getPricing() {
  const resolved = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  const pricing = resolved?.pricing || null;
  const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 500);
  const amountKRW = Number(pricing?.amountKRW || pricing?.paymentAmount || 50000);
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
    .select("email name phoneNumber role profileSubscription monthlySubscription subscription membership pass entitlement licenses paidFeatures unlockedFeatures")
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
    if (storedHash && storedHash !== inputHash) return { ok: false, reason: "INVALID_INPUT", message: INVALID_INPUT_MESSAGE };
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
      serviceType: SERVICE_KEY,
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
    body.categoryKey,
    gate.featureKey,
    gate.subFeatureKey,
    consume.featureKey,
    accessGrant.featureKey,
    pricing.featureKey,
    pricing.subFeatureKey,
    payment.featureKey,
    licensePass.featureKey,
  ].map((item) => clean(item).toLowerCase()).filter(Boolean);
  return keys.includes(FEATURE_KEY);
}

function addEvidenceId(ids, value) {
  const id = clean(value, 180);
  if (id) ids.add(id);
}

function collectBillingEvidenceIds(body = {}) {
  const ids = new Set();
  const { gate, consume, accessGrant, payment, licensePass } = collectBillingObjects(body);
  const sources = [
    body,
    gate,
    consume,
    accessGrant,
    payment,
    licensePass,
  ];
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
      $or: pointClauses,
    }).sort({ createdAt: -1 }).select("_id metadata").lean()
    : null;
  if (pointHistory) {
    return {
      ok: true,
      accessType: mapBillingGateAccessType(pointHistory.metadata || {}),
      accessSource: "billing_gate",
      paymentId: String(pointHistory._id || ""),
    };
  }

  const ledgerClauses = monthlyLedgerEvidenceClauses(ids);
  const ledger = ledgerClauses.length
    ? await MonthlyCreditLedger.findOne({
      userId: auth.userId,
      type: "MONTHLY_CREDIT_SPEND",
      serviceKey: FEATURE_KEY,
      $or: ledgerClauses,
    }).sort({ createdAt: -1 }).select("_id").lean()
    : null;
  if (ledger) {
    return {
      ok: true,
      accessType: "subscription",
      accessSource: "billing_gate",
      paymentId: String(ledger._id || ""),
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
    };
  }

  return null;
}

function buildSystemPrompt() {
  return [
    "당신은 한 사람의 인생을 한 권의 책처럼 읽어주는 최고 수준의 명리학 상담가이자 인생 상담가입니다.",
    "",
    "사용자의 생년월일, 성별, 출생시간, 양력/음력 정보와 계산된 사주 명식 데이터를 바탕으로, 사용자의 삶의 흐름을 따뜻하고 깊이 있게 상담합니다.",
    "",
    "반드시 지켜야 할 원칙:",
    "1. 보고서처럼 딱딱하게 쓰지 말고, 실제 상담사가 말하듯 자연스럽게 답변합니다.",
    "2. 사용자의 삶을 한 권의 책처럼 비유하되, 과장된 문학 표현만 남발하지 않습니다.",
    "3. 명리학적 근거를 사용하되 사용자가 이해하기 쉬운 말로 풀이합니다.",
    "4. 타고난 성향, 반복되는 삶의 패턴, 상처, 재능, 관계 방식, 일과 돈의 흐름을 균형 있게 봅니다.",
    "5. 사용자의 인생을 단정하거나 낙인찍지 않습니다.",
    "6. 불안감을 조장하지 않습니다.",
    "7. 운세를 절대적 예언처럼 말하지 않습니다.",
    "8. 당신은 안 된다, 망한다, 평생 힘들다 같은 표현을 금지합니다.",
    "9. 같은 문장을 반복하지 않습니다.",
    "10. AI, 프롬프트, 시스템, PDF, 챕터, job, progress 같은 표현을 결과에 노출하지 않습니다.",
    "11. 사용자가 선택한 상담 주제를 가장 깊게 다룹니다.",
    "12. 마지막에는 사용자가 추가 질문을 할 수 있도록 자연스럽게 상담을 이어갑니다.",
  ].join("\n");
}

function buildFirstPrompt(input, sajuResult) {
  return [
    "아래 입력과 계산된 명식 데이터를 바탕으로 첫 인생 상담 답변을 작성하세요.",
    "문장은 따뜻하고 깊게, 그러나 실제 선택에 도움이 되도록 현실적으로 말하세요.",
    "",
    "[사용자 입력]",
    `- 이름 또는 닉네임: ${input.birthInfo.name || "이름 미입력"}`,
    `- 성별: ${input.birthInfo.gender}`,
    `- 생년월일: ${input.birthInfo.birthDate}`,
    `- 출생시간: ${input.birthInfo.birthTimeUnknown ? "모름" : input.birthInfo.birthTime}`,
    `- 달력: ${input.birthInfo.calendarType === "lunar" ? "음력" : "양력"}`,
    `- 상담 주제: ${input.topic}`,
    "",
    "[계산된 사주 명식 데이터]",
    JSON.stringify(sajuResult, null, 2),
    "",
    "첫 답변은 다음 흐름을 모두 자연스럽게 포함하세요.",
    "당신의 인생 책 제목, 이 삶의 핵심 주제, 타고난 성향과 기질, 반복되는 인생 패턴, 숨겨진 재능과 강점, 상처받기 쉬운 지점, 일과 돈의 흐름, 사랑과 인간관계의 흐름, 인생의 중요한 전환점, 앞으로 살려야 할 방향, 지금 가장 필요한 현실 조언, 마지막 상담 메시지.",
    "출생시간이 없거나 계산상 불확실한 부분은 단정하지 말고 입력된 정보 기준으로 본 흐름이라고 자연스럽게 말하세요.",
  ].join("\n");
}

function buildFollowUpPrompt(consultation, message) {
  return [
    "아래 기존 상담 맥락을 이어서 답하세요.",
    "명식 데이터와 이전 상담의 흐름을 바꾸지 말고, 사용자의 추가 질문에 직접 답하세요.",
    "",
    "[명식 요약]",
    JSON.stringify({
      birthInfo: consultation.birthInfo,
      sajuResult: consultation.sajuResult,
      topic: consultation.topic,
    }, null, 2),
    "",
    "[최근 상담 흐름]",
    (consultation.messages || []).slice(-8).map((item) => `${item.role}: ${clean(item.content, 1800)}`).join("\n\n"),
    "",
    `[사용자의 추가 질문]\n${message}`,
  ].join("\n");
}

function cleanForbiddenResult(value) {
  return clean(value, 60000).replace(FORBIDDEN_RESULT_PATTERN, "").replace(/\n{3,}/g, "\n\n").trim();
}

function hasForbiddenResultTerms(value) {
  FORBIDDEN_RESULT_PATTERN.lastIndex = 0;
  return FORBIDDEN_RESULT_PATTERN.test(value);
}

async function generateConsultationText(env, prompt, options = {}) {
  const ai = await callGeminiText(env, prompt, {
    systemPrompt: buildSystemPrompt(),
    taskType: "fortune",
    temperature: options.temperature || 0.74,
    maxOutputTokens: options.maxOutputTokens || 7000,
    timeoutMs: Number(env.LIFE_BOOK_AI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 55000),
  });
  const provider = clean(ai?.provider || ai?.model || "gemini");
  const isMock = /mock/i.test(provider) || ai?.isMock === true;
  const text = clean(ai?.text);
  if (!ai?.ok || isMock || text.length < (options.minLength || 220)) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed."));
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_GENERATION_FAILED";
    throw error;
  }
  if (!hasForbiddenResultTerms(text)) return { text, provider, model: clean(ai?.model) };

  const repair = await callGeminiText(env, [
    "다음 상담 답변에서 금지된 기술 용어를 모두 제거하고, 자연스러운 인생 상담문으로만 다시 써 주세요.",
    "",
    text,
  ].join("\n"), {
    systemPrompt: buildSystemPrompt(),
    taskType: "fortune",
    temperature: 0.58,
    maxOutputTokens: options.maxOutputTokens || 7000,
  });
  const repaired = cleanForbiddenResult(repair?.ok ? repair?.text : text);
  if (hasForbiddenResultTerms(repaired) || repaired.length < (options.minLength || 120)) {
    const error = new Error("Forbidden result terms remained.");
    error.code = "LLM_FORBIDDEN_TERMS";
    throw error;
  }
  return {
    text: repaired,
    provider: clean(repair?.provider || provider),
    model: clean(repair?.model || ai?.model),
  };
}

function extractTitle(content, fallbackName = "") {
  const lines = clean(content).split(/\n+/).map((line) => line.replace(/^[-*#\s]+/, "").trim()).filter(Boolean);
  const titleLine = lines.find((line) => /인생\s*책\s*제목|책\s*제목/.test(line)) || lines[0] || "";
  const title = titleLine.replace(/^.*(?:인생\s*책\s*제목|책\s*제목)\s*[:：-]\s*/, "").replace(/^["“”']+|["“”']+$/g, "").trim();
  return clean(title || `${fallbackName || "당신"}의 인생 책`, 80);
}

function extractKeywords(content, topic) {
  const candidates = [
    topic,
    "회복",
    "전환",
    "자기 이해",
    "관계",
    "재능",
    "균형",
    "현실 조언",
    "삶의 방식",
  ];
  const text = clean(content);
  const picked = candidates.filter((word) => word && text.includes(word)).slice(0, 3);
  while (picked.length < 3) picked.push(["자기 이해", "전환", "회복"][picked.length]);
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
      serviceType: SERVICE_KEY,
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
    throw Object.assign(new Error(PAYMENT_VERIFY_FAILED_MESSAGE), { code: "DEFERRED_USAGE_APPLY_FAILED" });
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
      serviceType: SERVICE_KEY,
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

async function applyUsageOnce({ request, env, sessionId, access, idempotencyKey }) {
  const existing = await LifeBookAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;
  await finalizeDeferredBillingUsage({ request, env, access, idempotencyKey, sessionId });
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
    accessType: clean(doc.accessType),
    status: clean(doc.status),
    title: clean(doc.title || ""),
    keywords: Array.isArray(doc.keywords) ? doc.keywords : [],
    sajuResult: doc.sajuResult || null,
    messages: Array.isArray(doc.messages)
      ? doc.messages.map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      }))
      : [],
  };
}

async function handleEnsureAccess(request, env) {
  const body = await readJson(request);
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  const idempotencyKey = readIdempotencyKey(request, body);
  if (idempotencyKey.length < 12) return invalidInput(INVALID_INPUT_MESSAGE);

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  const pricing = { ...getPricing(), env };
  if (isAdmin(auth)) {
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
        return { ok: false, reason: "INVALID_INPUT", message: INVALID_INPUT_MESSAGE };
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

async function handleStart(request, env) {
  const body = await readJson(request);
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  const idempotencyKey = readIdempotencyKey(request, body);
  if (idempotencyKey.length < 12) return invalidInput(INVALID_INPUT_MESSAGE);

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  const lockKey = `${clean(auth.userId)}:${idempotencyKey}`;
  if (startLocks.has(lockKey)) return startLocks.get(lockKey);

  const pending = (async () => {
    await connectDb(env);
    const pricing = getPricing();
    const access = await resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey });
    if (!access.ok) {
      if (access.reason === "LOGIN_REQUIRED") return loginRequired();
      if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
      return paymentVerifyFailed();
    }

    const existing = await LifeBookAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
    if (existing && clean(existing.inputHash) !== normalized.inputHash) return invalidInput(INVALID_INPUT_MESSAGE, 409);
    if (existing?.status === "completed") return json(publicSession(existing));
    if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < 90000) {
      return json({ ok: true, sessionId: existing.id, status: "generating", message: "삶의 흐름을 읽고 있습니다" }, { status: 202 });
    }

    let sajuResult = null;
    try {
      sajuResult = calculateLifeBookAiSaju(normalized.input.birthInfo);
    } catch (error) {
      console.warn("[life-book-ai] saju calculation failed", {
        userId: clean(auth.userId),
        code: clean(error?.code || ""),
        message: clean(error?.message || error, 200),
      });
      return json({ ok: false, reason: "CALCULATION_ERROR", message: CALCULATION_ERROR_MESSAGE }, { status: 422 });
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
          return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: "삶의 흐름을 읽고 있습니다" }, { status: 202 });
        }
        throw error;
      }
    }

    try {
      const generated = await generateConsultationText(env, buildFirstPrompt(normalized.input, sajuResult), { minLength: 260, maxOutputTokens: 7000 });
      await applyUsageOnce({
        request,
        env,
        sessionId,
        access,
        idempotencyKey,
      });
      const title = extractTitle(generated.text, normalized.input.birthInfo.name);
      const keywords = extractKeywords(generated.text, normalized.input.topic);
      const completed = await LifeBookAiConsultation.findOneAndUpdate(
        { id: sessionId },
        {
          $set: {
            status: "completed",
            title,
            keywords,
            messages: [
              { role: "user", content: normalized.input.topic, createdAt: now },
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
      await cancelDeferredBillingUsage({
        request,
        env,
        access,
        idempotencyKey,
        sessionId,
        error,
      });
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
      console.error("[life-book-ai] generation failed", { code: clean(error?.code || ""), message: clean(error?.message || error, 240) });
      if (clean(error?.code) === "DEFERRED_USAGE_APPLY_FAILED") return paymentVerifyFailed();
      return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
    }
  })().catch((error) => {
    console.error("[life-book-ai] start failed", clean(error?.message || error, 500));
    return serverError();
  }).finally(() => {
    startLocks.delete(lockKey);
  });
  startLocks.set(lockKey, pending);
  return pending;
}

async function handleMessage(request, env) {
  const body = await readJson(request);
  const sessionId = clean(body?.sessionId || body?.consultationId, 120);
  const message = clean(body?.message || body?.question, 1600);
  const idempotencyKey = readIdempotencyKey(request, body);
  if (!sessionId || message.length < 2) return invalidInput(INVALID_INPUT_MESSAGE);

  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth) return loginRequired();

  await connectDb(env);
  const consultation = await LifeBookAiConsultation.findOne({
    id: sessionId,
    userId: clean(auth.userId),
    status: "completed",
  }).lean();
  if (!consultation) return json({ ok: false, reason: "NOT_FOUND", message: "상담 내역을 찾을 수 없습니다." }, { status: 404 });

  const duplicate = idempotencyKey
    ? (consultation.messages || []).find((item) => clean(item.idempotencyKey) === idempotencyKey && item.role === "assistant")
    : null;
  if (duplicate) return json({ ok: true, consultation: publicSession(consultation), message: duplicate });

  try {
    const generated = await generateConsultationText(env, buildFollowUpPrompt(consultation, message), {
      minLength: 90,
      maxOutputTokens: 4096,
      temperature: 0.72,
    });
    const userMessage = { role: "user", content: message, createdAt: new Date(), idempotencyKey };
    const assistantMessage = { role: "assistant", content: generated.text, createdAt: new Date(), idempotencyKey };
    const updated = await LifeBookAiConsultation.findOneAndUpdate(
      { id: sessionId, userId: clean(auth.userId) },
      {
        $push: { messages: { $each: [userMessage, assistantMessage] } },
        $set: {
          llmMeta: { provider: generated.provider, model: generated.model, updatedAt: new Date().toISOString() },
        },
      },
      { new: true },
    ).lean();
    return json({ ...publicSession(updated), message: assistantMessage });
  } catch (_) {
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
}

export async function handleLifeBookAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/life-book-ai");
  try {
    if (method === "POST" && path === "/ensure-access") return await handleEnsureAccess(request, env);
    if (method === "POST" && path === "/start") return await handleStart(request, env);
    if (method === "POST" && path === "/message") return await handleMessage(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[life-book-ai]", clean(error?.code || error?.message || error, 500));
    return serverError();
  }
}

export const __lifeBookAiTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  normalizeConsultationInput,
  buildFirstPrompt,
  buildSystemPrompt,
  cleanForbiddenResult,
};
