import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, mongoose } from "../lib/db.js";
import { MonthlyCreditLedger, NewYearAiConsultation, PointHistory, User } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canUseByPass, normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";
import { callGeminiText } from "../lib/gemini.js";

const SERVICE_KEY = "new-year-ai";
const FEATURE_KEY = "new-year-ai-consultation";
const ACCESS_TOKEN_TYPE = "new-year-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "신년운세 AI 상담";
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "AI 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";

const FORBIDDEN_RESULT_PATTERN = /\bPDF\b|챕터|\bprogress\b|\bjob\b/i;

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

function normalizeConsultationInput(body = {}) {
  const year = Math.floor(Number(body.year ?? body.targetYear ?? body.consultationYear));
  const birthInfo = body.birthInfo && typeof body.birthInfo === "object" ? body.birthInfo : {};
  const name = clean(body.name ?? body.nickname ?? birthInfo.name, 80);
  const gender = normalizeGender(body.gender ?? birthInfo.gender);
  const birthDate = clean(body.birthDate ?? birthInfo.birthDate, 10);
  const birthTime = clean(body.birthTime ?? birthInfo.birthTime, 5);
  const calendarType = clean(body.calendarType ?? birthInfo.calendarType, 20).toLowerCase();
  const topic = clean(body.topic ?? body.question ?? body.consultationTopic, 1000);

  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return { ok: false, message: "상담 연도를 정확히 입력해 주세요." };
  }
  if (!gender) return { ok: false, message: "성별을 선택해 주세요." };
  if (!isValidDateKey(birthDate)) return { ok: false, message: "생년월일을 YYYY-MM-DD 형식으로 입력해 주세요." };
  if (birthTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) {
    return { ok: false, message: "출생시간은 HH:mm 형식으로 입력해 주세요." };
  }
  if (calendarType !== "solar" && calendarType !== "lunar") {
    return { ok: false, message: "양력 또는 음력을 선택해 주세요." };
  }
  if (topic.length < 2) return { ok: false, message: "상담 주제를 입력해 주세요." };

  const normalized = {
    year,
    birthInfo: { name, gender, birthDate, birthTime, calendarType },
    topic,
  };

  return {
    ok: true,
    input: normalized,
    inputHash: sha256(stableJson(normalized)),
  };
}

function invalidInput(message, status = 422) {
  return json({ ok: false, reason: "INVALID_INPUT", message: clean(message) || "입력값을 확인해 주세요." }, { status });
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
  const amountKRW = Number(pricing?.amountKRW || pricing?.paymentAmount || coinPrice * 100);
  if (!resolved?.ok || !pricing || !Number.isInteger(coinPrice) || coinPrice <= 0 || !Number.isInteger(amountKRW) || amountKRW <= 0) {
    const error = new Error("new-year-ai price not found");
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

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function uniq(values = []) {
  return [...new Set(values.map((value) => clean(value, 180)).filter(Boolean))];
}

function readBillingContext(body = {}) {
  const billing = asObject(body.billingGate || body.billingEvidence || body.billing || body.paymentEvidence);
  const consume = asObject(body.consume || billing.consume);
  const accessGrant = asObject(body.accessGrant || billing.accessGrant);
  const pricing = asObject(body.pricing || billing.pricing);
  return { billing, consume, accessGrant, pricing };
}

function collectBillingTokens(body = {}, idempotencyKey = "") {
  const ctx = readBillingContext(body);
  return uniq([
    idempotencyKey,
    body.paymentId,
    body.transactionId,
    body.purchaseId,
    body.requestId,
    ctx.billing.transactionId,
    ctx.billing.purchaseId,
    ctx.billing.paymentId,
    ctx.billing.requestId,
    ctx.consume.transactionId,
    ctx.consume.purchaseId,
    ctx.consume.requestId,
    ctx.consume.receiptId,
    ctx.consume.pointHistoryId,
    ctx.consume.ledgerId,
    ctx.consume.monthlyCreditLedgerId,
    ctx.accessGrant.evidenceId,
    ctx.accessGrant.purchaseId,
    ctx.accessGrant.paymentId,
    ctx.accessGrant.requestId,
  ]);
}

function readBillingAccessSignal(body = {}) {
  const ctx = readBillingContext(body);
  return [
    body.accessType,
    body.accessMethod,
    body.paymentMode,
    ctx.billing.accessType,
    ctx.billing.accessMethod,
    ctx.billing.paymentMode,
    ctx.billing.paymentMethod,
    ctx.consume.accessType,
    ctx.consume.accessMethod,
    ctx.consume.paymentMethod,
    ctx.consume.paymentMode,
    ctx.consume.transactionType,
    ctx.accessGrant.accessType,
    ctx.accessGrant.accessMethod,
    ctx.accessGrant.paymentMethod,
  ].map((value) => clean(value).toLowerCase()).filter(Boolean).join("|");
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
    if (mongoose.Types.ObjectId.isValid(token)) clauses.push({ _id: token });
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
    if (mongoose.Types.ObjectId.isValid(token)) clauses.push({ _id: token });
  });
  return clauses;
}

function normalizeBillingAccessType(value) {
  const accessType = clean(value).toLowerCase();
  if (["membership_credit", "monthly_credit", "moonlight_stone", "monthly", "subscription"].includes(accessType)) return "subscription";
  if (["membership_pass", "license_pass", "subscription_pass", "usage_pass", "pass", "family", "family_pass"].includes(accessType)) return "pass";
  return "paid";
}

async function resolveBillingGateAccess({ auth, user, body, pricing, idempotencyKey }) {
  const signal = readBillingAccessSignal(body);
  const tokens = collectBillingTokens(body, idempotencyKey);
  const ctx = readBillingContext(body);
  const featureKey = clean(ctx.pricing.featureKey || ctx.billing.featureKey || ctx.consume.featureKey || ctx.accessGrant.featureKey);
  const hasEvidencePayload = tokens.length > 0
    || signal.includes("pass")
    || signal.includes("monthly")
    || signal.includes("credit")
    || signal.includes("coin");
  if (!hasEvidencePayload) return null;
  if (featureKey && featureKey !== FEATURE_KEY) return null;

  if (signal.includes("pass")) {
    const pass = normalizeHoneyPassEntitlement(user || {});
    const usageMarker = `usage-pass:${FEATURE_KEY}:${idempotencyKey}`;
    const usagePassConsumed = Array.isArray(user?.recentConsumeRequestIds) && user.recentConsumeRequestIds.includes(usageMarker);
    if (canUseByPass(pass, pricing.coinPrice) || usagePassConsumed) {
      return { ok: true, accessType: "pass", paymentId: tokens[0] || "", prepaid: true };
    }
  }

  const pointClauses = pointHistoryTokenClauses(tokens);
  if (pointClauses.length) {
    const pointHistory = await PointHistory.findOne({
      userId: auth.userId,
      kind: "deduct",
      featureKey: FEATURE_KEY,
      "metadata.coinRefundedForUnlockFailure": { $ne: true },
      "metadata.monthlyCreditRefundedForUnlockFailure": { $ne: true },
      "metadata.refundedForServiceExecution": { $ne: true },
      $or: pointClauses,
    }).sort({ createdAt: -1 }).lean();
    if (pointHistory) {
      return {
        ok: true,
        accessType: normalizeBillingAccessType(pointHistory?.metadata?.accessType || signal),
        paymentId: clean(pointHistory._id, 160),
        prepaid: true,
      };
    }
  }

  const monthlyClauses = monthlyCreditTokenClauses(tokens);
  if (monthlyClauses.length) {
    const ledger = await MonthlyCreditLedger.findOne({
      userId: auth.userId,
      type: "MONTHLY_CREDIT_SPEND",
      "metadata.featureKey": FEATURE_KEY,
      "metadata.refundedForUnlockFailure": { $ne: true },
      "metadata.refundedForServiceExecution": { $ne: true },
      $or: monthlyClauses,
    }).sort({ createdAt: -1 }).lean();
    if (ledger) {
      return { ok: true, accessType: "subscription", paymentId: clean(ledger._id, 160), prepaid: true };
    }
  }

  return null;
}

function buildBillingGatePayload({ pricing, idempotencyKey }) {
  return {
    billingMode: "coin-gate",
    featureKey: FEATURE_KEY,
    serviceKey: SERVICE_KEY,
    reason: ORDER_NAME,
    cost: pricing.coinPrice,
    coinPrice: pricing.coinPrice,
    amountKRW: pricing.amountKRW,
    membershipCreditCost: pricing.membershipCreditCost,
    requestId: idempotencyKey,
    idempotencyKey,
  };
}

async function resolveServerAccess({ auth, user, pricing }) {
  if (isAdmin(auth) || clean(user?.role).toLowerCase() === "admin") {
    return { ok: true, accessType: "admin", paymentId: "" };
  }

  const pass = normalizeHoneyPassEntitlement(user || {});
  if (canUseByPass(pass, pricing.coinPrice)) {
    return { ok: true, accessType: "pass", paymentId: "" };
  }

  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

function buildSystemPrompt() {
  return [
    "당신은 신년운세를 상담하는 최고 수준의 명리학 상담가입니다.",
    "",
    "사용자의 생년월일, 성별, 출생시간, 양력/음력 정보와 상담 연도를 바탕으로 신년운세를 상담형으로 해석합니다.",
    "",
    "반드시 지켜야 할 원칙:",
    "1. 보고서처럼 딱딱하게 쓰지 말고, 실제 상담사가 말하듯 자연스럽게 답변합니다.",
    "2. 명리학적 근거를 사용하되 사용자가 이해하기 쉬운 말로 풀이합니다.",
    "3. 재물운, 연애운, 직장/사업운, 인간관계, 건강/멘탈, 월별 흐름을 균형 있게 봅니다.",
    "4. 불안감을 조장하지 않습니다.",
    "5. 운세를 절대적 예언처럼 말하지 않습니다.",
    "6. 사용자가 당장 실천할 수 있는 조언을 포함합니다.",
    "7. 같은 문장을 반복하지 않습니다.",
    "8. “AI로 생성되었습니다”, “프롬프트”, “시스템” 같은 표현은 결과에 노출하지 않습니다.",
    "9. 사용자의 질문 주제가 있으면 그 주제를 가장 깊게 다룹니다.",
    "10. 답변 마지막에는 사용자가 추가로 물어볼 수 있도록 자연스럽게 상담을 이어갑니다.",
    "11. PDF, 챕터, progress, job이라는 단어를 쓰지 않습니다.",
  ].join("\n");
}

function buildFirstPrompt(input) {
  const birth = input.birthInfo || {};
  return [
    "[상담 정보]",
    `이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `성별: ${birth.gender}`,
    `생년월일: ${birth.birthDate}`,
    `출생시간: ${birth.birthTime || "모름"}`,
    `달력: ${birth.calendarType === "lunar" ? "음력" : "양력"}`,
    `상담 연도: ${input.year}`,
    `상담 주제: ${input.topic}`,
    "",
    "아래 흐름으로 답변하되, 항목명은 자연스럽게 유지하고 각 항목은 상담하듯 풀어주세요.",
    "- 올해의 핵심 흐름",
    "- 가장 강하게 들어오는 기회",
    "- 조심해야 할 흐름",
    "- 재물운",
    "- 연애운",
    "- 직장/사업운",
    "- 인간관계",
    "- 건강/멘탈",
    "- 월별 흐름",
    "- 현실 조언",
    "- 마지막 상담 메시지",
  ].join("\n");
}

function buildFollowUpPrompt(consultation, question) {
  const birth = consultation.birthInfo || {};
  const history = (consultation.messages || [])
    .slice(-8)
    .map((message) => `${message.role === "assistant" ? "상담가" : "사용자"}: ${clean(message.content, 1400)}`)
    .join("\n\n");
  return [
    "[상담 정보]",
    `이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `성별: ${birth.gender}`,
    `생년월일: ${birth.birthDate}`,
    `출생시간: ${birth.birthTime || "모름"}`,
    `달력: ${birth.calendarType === "lunar" ? "음력" : "양력"}`,
    `상담 연도: ${consultation.year}`,
    `처음 상담 주제: ${consultation.topic}`,
    "",
    "[이전 대화]",
    history,
    "",
    "[새 질문]",
    question,
    "",
    "이전 흐름을 이어받아 자연스럽게 답변하고, 질문에 직접 답해주세요.",
  ].join("\n");
}

function cleanForbiddenResult(text) {
  return clean(text)
    .replace(/\bPDF\b/gi, "상담")
    .replace(/챕터/g, "상담 항목")
    .replace(/\bprogress\b/gi, "흐름")
    .replace(/\bjob\b/gi, "상담");
}

async function generateConsultationText(env, prompt, options = {}) {
  const ai = await callGeminiText(env, prompt, {
    systemPrompt: buildSystemPrompt(),
    taskType: "fortune",
    temperature: 0.72,
    maxOutputTokens: options.maxOutputTokens || 6144,
    timeoutMs: Number(env?.NEW_YEAR_AI_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || 55000),
  });
  const provider = clean(ai?.provider || ai?.model || "gemini");
  const isMock = /mock/i.test(provider) || ai?.isMock === true;
  const text = clean(ai?.text);
  if (!ai?.ok || isMock || text.length < (options.minLength || 180)) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed."));
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_GENERATION_FAILED";
    throw error;
  }
  if (!FORBIDDEN_RESULT_PATTERN.test(text)) return { text, provider, model: clean(ai?.model) };

  const repair = await callGeminiText(env, [
    "다음 상담 답변에서 금지된 시스템성 표현을 모두 제거하고, 자연스러운 신년운세 상담문으로만 다시 써주세요.",
    "",
    text,
  ].join("\n"), {
    systemPrompt: buildSystemPrompt(),
    taskType: "fortune",
    temperature: 0.58,
    maxOutputTokens: options.maxOutputTokens || 6144,
  });
  const repaired = clean(repair?.text);
  return {
    text: cleanForbiddenResult(repair?.ok && repaired.length >= 120 ? repaired : text),
    provider: clean(repair?.provider || provider),
    model: clean(repair?.model || ai?.model),
  };
}

async function applyUsageOnce({ sessionId }) {
  const existing = await NewYearAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;
  await NewYearAiConsultation.updateOne(
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
      }),
      accessType: "admin",
    });
  }

  await connectDb(env);
  const user = await loadBillingUser(auth.userId);
  if (!user) return loginRequired();

  const access = await resolveServerAccess({ auth, user, pricing });
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
    });
  }
  if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);

  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    paymentPayload: buildBillingGatePayload({ pricing, idempotencyKey }),
  }, { status: 402 });
}

async function resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey }) {
  const token = clean(body?.accessToken || request.headers.get("x-new-year-ai-access-token"));
  if (token) {
    const payload = await verifyAccessToken(env, token);
    if (clean(payload.userId) !== clean(auth.userId) || clean(payload.idempotencyKey) !== idempotencyKey || clean(payload.inputHash) !== normalized.inputHash) {
      return { ok: false, reason: "INVALID_INPUT", message: "상담 접근 정보가 현재 입력값과 일치하지 않습니다." };
    }
    return { ok: true, accessType: clean(payload.accessType), paymentId: clean(payload.paymentId, 160) };
  }

  const user = await loadBillingUser(auth.userId);
  if (!user && !isAdmin(auth)) return { ok: false, reason: "LOGIN_REQUIRED" };
  const billingAccess = await resolveBillingGateAccess({ auth, user, body, pricing, idempotencyKey });
  if (billingAccess?.ok) return billingAccess;
  return resolveServerAccess({ auth, user, pricing });
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

  const existing = await NewYearAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
  if (existing && clean(existing.inputHash) !== normalized.inputHash) {
    return invalidInput("같은 요청 키로 다른 상담 정보를 사용할 수 없습니다.", 409);
  }
  if (existing?.status === "completed") return json(publicSession(existing));
  if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < 90000) {
    return json({ ok: true, sessionId: existing.id, status: "generating", message: "올해의 흐름을 읽고 있습니다" }, { status: 202 });
  }

  const sessionId = existing?.id || `nyai_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}_${randomToken(8)}`;
  const now = new Date();
  const seed = {
    id: sessionId,
    userId: clean(auth.userId),
    year: normalized.input.year,
    birthInfo: normalized.input.birthInfo,
    topic: normalized.input.topic,
    accessType: access.accessType,
    paymentId: clean(access.paymentId, 160),
    messages: [],
    idempotencyKey,
    inputHash: normalized.inputHash,
    status: "generating",
    generationError: null,
  };

  if (existing) {
    await NewYearAiConsultation.updateOne(
      { id: existing.id },
      { $set: { ...seed, updatedAt: now } },
    );
  } else {
    try {
      await NewYearAiConsultation.create(seed);
    } catch (error) {
      if (error?.code === 11000) {
        const duplicate = await NewYearAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
        if (duplicate?.status === "completed") return json(publicSession(duplicate));
        return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: "올해의 흐름을 읽고 있습니다" }, { status: 202 });
      }
      throw error;
    }
  }

  try {
    const generated = await generateConsultationText(env, buildFirstPrompt(normalized.input), { minLength: 240, maxOutputTokens: 7000 });
    await applyUsageOnce({ userId: auth.userId, sessionId, accessType: access.accessType, pricing, prepaid: access.prepaid === true });
    const completed = await NewYearAiConsultation.findOneAndUpdate(
      { id: sessionId },
      {
        $set: {
          status: "completed",
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
    await NewYearAiConsultation.updateOne(
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
  const consultation = await NewYearAiConsultation.findOne({
    id: sessionId,
    userId: clean(auth.userId),
    status: "completed",
  }).lean();
  if (!consultation) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);

  try {
    const generated = await generateConsultationText(env, buildFollowUpPrompt(consultation, message), {
      minLength: 80,
      maxOutputTokens: 4096,
    });
    const userMessage = { role: "user", content: message, createdAt: new Date() };
    const assistantMessage = { role: "assistant", content: generated.text, createdAt: new Date() };
    const updated = await NewYearAiConsultation.findOneAndUpdate(
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

export async function handleNewYearAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/new-year-ai");

  try {
    if (method === "POST" && path === "/ensure-access") return await handleEnsureAccess(request, env);
    if (method === "POST" && path === "/start") return await handleStart(request, env);
    if (method === "POST" && path === "/message") return await handleMessage(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[new-year-ai]", clean(error?.code || error?.message || error, 500));
    return serverError();
  }
}

export const __newYearAiTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  normalizeConsultationInput,
  buildFirstPrompt,
  buildSystemPrompt,
  cleanForbiddenResult,
};
