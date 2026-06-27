import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, mongoose } from "../lib/db.js";
import { MonthlyCreditLedger, Payment, PointHistory, VedicAiConsultation } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { callGeminiText } from "../lib/gemini.js";
import { calculateVedicAiChart } from "../lib/vedic-ai-chart.js";

const SERVICE_KEY = "vedic-ai";
const FEATURE_KEY = "vedic-ai-consultation";
const PRODUCT_ID = "vedic-ai-consultation";
const ACCESS_TOKEN_TYPE = "vedic-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "베다점 AI 상담";
const AMOUNT_KRW = 30000;
const COIN_PRICE = 300;
const startLocks = new Map();

const TOPICS = new Set([
  "전체 인생 흐름",
  "타고난 성향",
  "영혼의 방향성",
  "직업/사업운",
  "재물운",
  "연애/결혼운",
  "인간관계",
  "가족/부모운",
  "건강/멘탈",
  "이직/창업",
  "올해 운세",
  "다샤 흐름",
  "현재 고민 상담",
  "인생 전환기 상담",
]);

const MESSAGES = {
  login: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  paymentRequired: "베다점 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
  paymentVerifyFailed: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  invalidInput: "생년월일, 출생시간, 출생지 정보를 다시 확인해 주세요.",
  placeInvalid: "출생지 정보를 확인하지 못했습니다. 도시와 국가를 다시 입력해 주세요.",
  calculationFailed: "베다 차트 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  serverFailed: "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.",
  llmFailed: "AI 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.",
};

const SYSTEM_PROMPT = [
  "당신은 베다 점성술, 즉 Jyotish를 상담하는 최고 수준의 베다 점성술 상담가입니다.",
  "",
  "사용자의 생년월일, 성별, 출생시간, 출생지 정보와 계산된 베다 점성술 차트 데이터를 바탕으로 사용자의 삶의 흐름을 상담형으로 해석합니다.",
  "",
  "반드시 지켜야 할 원칙:",
  "1. 보고서처럼 딱딱하게 쓰지 말고, 실제 상담사가 차트를 놓고 설명하듯 자연스럽게 답변합니다.",
  "2. Lagna, Moon Sign, Nakshatra, D1 Rashi Chart, D9 Navamsa, house lordship, yoga, dasha, Rahu/Ketu의 의미를 정확하게 반영합니다.",
  "3. 행성 이름과 별자리만 나열하지 말고, 사용자의 삶에서 어떤 성향과 사건 패턴으로 나타나는지 풀어냅니다.",
  "4. Lagna는 삶의 기본 방향과 현실적 성향으로 해석합니다.",
  "5. Moon은 감정, 마음의 안정, 반응 패턴, 내면의 욕구로 해석합니다.",
  "6. Sun은 자아감, 명예, 권위, 삶의 중심감으로 해석합니다.",
  "7. Nakshatra는 영혼의 성향, 감정의 결, 반복되는 선택 패턴으로 해석합니다.",
  "8. D9 Navamsa는 결혼, 내면의 성숙, 후천적으로 드러나는 운명의 질감으로 해석합니다.",
  "9. D10이 있으면 직업과 사회적 역할을 해석할 때 참고합니다.",
  "10. Vimshottari Dasha는 현재 시기와 인생의 전환 흐름을 읽는 핵심 축으로 사용합니다.",
  "11. Rahu는 강한 욕망, 낯선 방향, 집착, 성장의 실험으로 해석합니다.",
  "12. Ketu는 분리감, 과거의 숙련, 허무감, 영적 거리감으로 해석합니다.",
  "13. 어려운 배치나 약한 행성을 공포스럽게 말하지 말고, 조심해야 할 습관과 성장 과제로 설명합니다.",
  "14. 운세를 절대적 예언처럼 말하지 않습니다.",
  "15. 불안감을 조장하지 않습니다.",
  "16. 같은 문장을 반복하지 않습니다.",
  "17. AI, 프롬프트, 시스템, PDF, 챕터, job, progress 같은 표현을 결과에 노출하지 않습니다.",
  "18. 사용자가 선택한 상담 주제와 자유 질문을 가장 깊게 다룹니다.",
  "19. 마지막에는 사용자가 추가 질문을 할 수 있도록 자연스럽게 상담을 이어갑니다.",
  "",
  "첫 답변 출력 흐름:",
  "차트의 핵심 인상, Lagna로 본 삶의 기본 방향, Moon과 Nakshatra로 본 마음의 패턴, 가장 강하게 작동하는 행성 흐름, 삶에서 반복되기 쉬운 패턴, 직업/사업 방향, 재물 흐름, 연애/결혼 흐름, 인간관계와 사회적 위치, Rahu/Ketu로 본 욕망과 숙제, 현재 Dasha 흐름, 현재 상담 주제에 대한 집중 해석, 앞으로 살려야 할 방향, 조심해야 할 선택, 현실적인 행동 조언, 마지막 상담 메시지.",
].join("\n");

function clean(value, maxLength = 0) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
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

function readIdempotencyKey(request, body = {}) {
  return normalizeId(
    body?.idempotencyKey
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
  if (["other", "none", "기타", "비공개"].includes(text)) return "other";
  return text || "";
}

function normalizeBirthPlace(value = {}) {
  const src = value && typeof value === "object" ? value : {};
  const latitude = Number(src.latitude ?? src.lat);
  const longitude = Number(src.longitude ?? src.lng ?? src.lon);
  const place = {
    city: clean(src.city || src.birthCity || src.place, 80),
    country: clean(src.country, 80),
    timezone: clean(src.timezone || src.timeZone, 80),
  };
  if (Number.isFinite(latitude)) place.latitude = latitude;
  if (Number.isFinite(longitude)) place.longitude = longitude;
  return place;
}

function normalizeConsultationInput(body = {}) {
  const sourceBirth = body.birthInfo && typeof body.birthInfo === "object" ? body.birthInfo : {};
  const name = clean(body.name ?? body.nickname ?? sourceBirth.name, 80);
  const gender = normalizeGender(body.gender ?? sourceBirth.gender);
  const birthDate = clean(body.birthDate ?? sourceBirth.birthDate, 10);
  const birthTimeUnknown = body.birthTimeUnknown === true || sourceBirth.birthTimeUnknown === true;
  const birthTime = clean(body.birthTime ?? sourceBirth.birthTime, 5);
  const birthPlace = normalizeBirthPlace(body.birthPlace || sourceBirth.birthPlace || {});
  const topic = clean(body.topic ?? body.consultationTopic, 80);
  const userQuestion = clean(body.userQuestion ?? body.question ?? body.message, 1500);
  const errors = [];

  if (!gender) errors.push("gender");
  if (!isValidDateKey(birthDate)) errors.push("birthDate");
  if (!birthTimeUnknown && !isValidBirthTime(birthTime)) errors.push("birthTime");
  if (!birthPlace.city && (!Number.isFinite(Number(birthPlace.latitude)) || !Number.isFinite(Number(birthPlace.longitude)))) errors.push("birthPlace");
  if (!TOPICS.has(topic)) errors.push("topic");

  const normalized = {
    birthInfo: {
      name,
      gender,
      birthDate,
      birthTime: birthTimeUnknown ? "" : birthTime,
      birthTimeUnknown,
      birthPlace,
    },
    topic,
    userQuestion,
  };

  return {
    ok: errors.length === 0,
    errors,
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
    throw new Error("INVALID_ACCESS_TOKEN");
  }
  return payload;
}

function loginRequired() {
  return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 });
}

function invalidInput(message = MESSAGES.invalidInput) {
  return json({ ok: false, reason: "INVALID_INPUT", message }, { status: 422 });
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

function objectId(userId) {
  const id = String(userId || "");
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
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
      ].forEach((key) => {
        if (value[key]) visit(value[key], depth + 1);
      });
      ["payload", "data", "accessGrant", "consume", "payment", "order", "access"].forEach((key) => {
        if (value[key]) visit(value[key], depth + 1);
      });
    }
  };
  sources.forEach((source) => visit(source));
  return Array.from(ids).filter(Boolean);
}

function flattenEvidence(body = {}) {
  const evidence = body.paymentEvidence && typeof body.paymentEvidence === "object" ? body.paymentEvidence : {};
  return {
    ...evidence,
    bodyPaymentId: body.paymentId,
    bodyTransactionId: body.transactionId,
    bodyAccessGrant: body.accessGrant,
    bodyConsume: body.consume,
  };
}

function readEvidenceAccessType(evidence = {}) {
  const text = stableJson(evidence).toLowerCase();
  if (text.includes("membership_credit") || text.includes("moonlight_stone") || text.includes("monthly")) return "subscription";
  if (text.includes("membership_pass") || text.includes("accessmethod\":\"pass") || text.includes("family")) return "pass";
  return "paid";
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
  }).lean();
}

async function findMonthlyEvidence(userObjectId, ids, idempotencyKey) {
  const candidates = Array.from(new Set([idempotencyKey, ...ids].filter(Boolean)));
  const ledgerClauses = [];
  candidates.forEach((id) => {
    ledgerClauses.push(
      { sourceId: id },
      { "metadata.requestId": id },
      { "metadata.purchaseId": id },
      { "metadata.idempotencyKey": id },
      { "metadata.orderId": id },
      { "metadata.pointHistoryId": id },
    );
  });
  if (ledgerClauses.length) {
    const ledger = await MonthlyCreditLedger.findOne({
      userId: userObjectId,
      type: "MONTHLY_CREDIT_SPEND",
      serviceKey: FEATURE_KEY,
      "metadata.accessType": "membership_credit",
      "metadata.monthlyCreditRefundedForUnlockFailure": { $ne: true },
      $or: ledgerClauses,
    }).lean();
    if (ledger) return { source: "monthly-ledger", record: ledger };
  }
  const historyClauses = [];
  candidates.forEach((id) => {
    historyClauses.push(
      { "metadata.requestId": id },
      { "metadata.purchaseId": id },
      { "metadata.idempotencyKey": id },
      { "metadata.orderId": id },
    );
    if (mongoose.Types.ObjectId.isValid(id)) historyClauses.push({ _id: new mongoose.Types.ObjectId(id) });
  });
  if (!historyClauses.length) return null;
  const history = await PointHistory.findOne({
    userId: userObjectId,
    featureKey: FEATURE_KEY,
    kind: "deduct",
    "metadata.accessType": "membership_credit",
    "metadata.monthlyCreditRefundedForUnlockFailure": { $ne: true },
    $or: historyClauses,
  }).lean();
  return history ? { source: "monthly-history", record: history } : null;
}

async function findPassEvidence(userObjectId, ids, idempotencyKey) {
  const candidates = Array.from(new Set([idempotencyKey, ...ids].filter(Boolean)));
  const clauses = [];
  candidates.forEach((id) => {
    clauses.push(
      { "metadata.requestId": id },
      { "metadata.purchaseId": id },
      { "metadata.idempotencyKey": id },
      { "metadata.orderId": id },
    );
    if (mongoose.Types.ObjectId.isValid(id)) clauses.push({ _id: new mongoose.Types.ObjectId(id) });
  });
  if (!clauses.length) return null;
  const history = await PointHistory.findOne({
    userId: userObjectId,
    featureKey: FEATURE_KEY,
    kind: "deduct",
    $or: clauses,
    $and: [{
      $or: [
        { "metadata.accessType": { $in: ["membership_pass", "family"] } },
        { "metadata.accessMethod": { $in: ["PASS", "FAMILY"] } },
      ],
    }],
  }).lean();
  return history ? { source: "pass-history", record: history } : null;
}

async function resolveBillingEvidence({ env, userId, body, idempotencyKey }) {
  const userObjectId = objectId(userId);
  if (!userObjectId) return null;
  const evidence = flattenEvidence(body);
  const ids = collectEvidenceIds(evidence, body.paymentId, body.transactionId, body.accessGrant, body.consume, idempotencyKey);
  await connectDb(env);
  const direct = await findDirectPayment(userObjectId, ids, idempotencyKey);
  if (direct) {
    return {
      accessType: "paid",
      paymentId: String(direct.merchantUid || direct.impUid || direct._id || ""),
      source: "direct-payment",
      paymentDocId: String(direct._id || ""),
    };
  }
  const likelyAccessType = readEvidenceAccessType(evidence);
  if (likelyAccessType === "subscription") {
    const monthly = await findMonthlyEvidence(userObjectId, ids, idempotencyKey);
    if (monthly) {
      return {
        accessType: "subscription",
        paymentId: String(monthly.record?._id || monthly.record?.sourceId || ""),
        source: monthly.source,
      };
    }
  }
  if (likelyAccessType === "pass") {
    const pass = await findPassEvidence(userObjectId, ids, idempotencyKey);
    if (pass) {
      return {
        accessType: "pass",
        paymentId: String(pass.record?._id || ""),
        source: pass.source,
      };
    }
  }
  const monthly = await findMonthlyEvidence(userObjectId, ids, idempotencyKey);
  if (monthly) {
    return {
      accessType: "subscription",
      paymentId: String(monthly.record?._id || monthly.record?.sourceId || ""),
      source: monthly.source,
    };
  }
  const pass = await findPassEvidence(userObjectId, ids, idempotencyKey);
  if (pass) {
    return {
      accessType: "pass",
      paymentId: String(pass.record?._id || ""),
      source: pass.source,
    };
  }
  return null;
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
    "아래의 계산된 베다 점성술 차트만 바탕으로 상담을 시작하세요.",
    "사용자가 선택한 주제와 질문을 가장 깊게 다루되, 불안 조장이나 단정적 예언은 피하세요.",
    "",
    `이름 또는 닉네임: ${input.birthInfo.name || "미입력"}`,
    `성별: ${input.birthInfo.gender}`,
    `상담 주제: ${input.topic}`,
    `현재 질문: ${input.userQuestion || "자연스럽게 전체 흐름을 먼저 보고 싶어 합니다."}`,
    `출생시간 신뢰도: ${chart.calculationMeta?.birthTimeConfidence || ""}`,
    `해석 기준: ${chart.calculationMeta?.interpretationMode === "moon-chart" ? "출생시간이 불확실하므로 Moon Chart 중심" : "Lagna Chart 중심"}`,
    "",
    "계산된 차트 데이터:",
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
    "행성 이름 나열이 아니라 삶의 패턴과 현실적 선택으로 풀어 주세요.",
    "",
    `상담 주제: ${consultation.topic}`,
    `추가 질문: ${question}`,
    "",
    "계산된 차트 데이터:",
    JSON.stringify(compactChartForPrompt(consultation.vedicChart || {}), null, 2),
    "",
    "최근 상담 맥락:",
    JSON.stringify(recentMessages, null, 2),
  ].join("\n");
}

function sanitizeAssistantText(value) {
  let text = clean(value, 60000);
  text = text.replace(/\bPDF\b/gi, "상담");
  text = text.replace(/챕터|chapter/gi, "흐름");
  text = text.replace(/\bjob\b/gi, "상담");
  text = text.replace(/\bprogress\b/gi, "진행");
  text = text.replace(/프롬프트/g, "질문");
  text = text.replace(/시스템/g, "상담 기준");
  text = text.replace(/\bAI\b/g, "상담");
  return text.trim();
}

async function callConsultationLlm(env, prompt) {
  const result = await callGeminiText(env, prompt, {
    systemPrompt: SYSTEM_PROMPT,
    maxOutputTokens: 6500,
    temperature: 0.72,
    taskType: "fortune",
  });
  if (!result?.ok || !clean(result.text)) {
    const error = new Error(result?.message || "LLM_FAILED");
    error.code = "LLM_FAILED";
    error.llm = result || null;
    throw error;
  }
  const content = sanitizeAssistantText(result.text);
  if (!content) {
    const error = new Error("EMPTY_LLM_RESULT");
    error.code = "LLM_FAILED";
    throw error;
  }
  return { content, meta: { provider: result.provider || "", model: result.model || "" } };
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
    keywords: keywordSeed.slice(0, 3),
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
  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth?.userId) return loginRequired();

  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) return invalidInput(MESSAGES.invalidInput);
  const idempotencyKey = readIdempotencyKey(request, body) || `vedic-ai-${auth.userId}-${normalized.inputHash.slice(0, 16)}-${Date.now()}-${randomSuffix()}`;
  getPricing();
  await connectDb(env);
  const existing = await VedicAiConsultation.findOne({
    userId: String(auth.userId),
    idempotencyKey,
    inputHash: normalized.inputHash,
    status: "completed",
  }).lean();
  if (existing) {
    const accessToken = await createAccessToken(env, {
      userId: String(auth.userId),
      idempotencyKey,
      inputHash: normalized.inputHash,
      accessType: existing.accessType,
      paymentId: existing.paymentId || "",
      reuse: true,
    });
    return json({
      ok: true,
      accessToken,
      accessType: existing.accessType,
      consultation: consultationPayload(existing),
    });
  }
  return paymentRequired(idempotencyKey);
}

async function resolveStartAccess({ request, env, auth, body, normalized, idempotencyKey }) {
  const token = clean(body.accessToken);
  if (token) {
    const payload = await verifyAccessToken(env, token);
    if (String(payload.userId) !== String(auth.userId) || payload.idempotencyKey !== idempotencyKey || payload.inputHash !== normalized.inputHash) {
      throw Object.assign(new Error("INVALID_ACCESS_TOKEN"), { status: 403 });
    }
    return {
      accessType: payload.accessType || "paid",
      paymentId: payload.paymentId || "",
      source: "access-token",
    };
  }
  const evidence = await resolveBillingEvidence({
    env,
    userId: auth.userId,
    body,
    idempotencyKey,
  });
  if (!evidence) return null;
  return evidence;
}

async function generateConsultation({ request, env, auth, body, normalized, idempotencyKey }) {
  await connectDb(env);
  const existing = await VedicAiConsultation.findOne({
    userId: String(auth.userId),
    idempotencyKey,
  });
  if (existing?.status === "completed" && existing.inputHash === normalized.inputHash) {
    return json({ ok: true, consultation: consultationPayload(existing.toObject()) });
  }

  const access = await resolveStartAccess({ request, env, auth, body, normalized, idempotencyKey });
  if (!access) return paymentVerifyFailed();

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
  doc.accessType = access.accessType;
  doc.paymentId = access.paymentId || "";
  doc.status = "generating";
  doc.generationError = null;
  doc.messages = [];
  await doc.save();

  let chart;
  try {
    chart = await calculateVedicAiChart(env, normalized.input, { requestUrl: request.url });
  } catch (error) {
    console.warn("[vedic-ai] chart calculation failed", {
      userId: String(auth.userId),
      idempotencyKey,
      code: error?.code || "",
      message: clean(error?.message || error, 300),
    });
    doc.status = "generation_failed";
    doc.generationError = { code: error?.code || "CHART_CALCULATION_FAILED", message: clean(error?.message || error, 500), at: new Date() };
    await doc.save();
    if (error?.code === "BIRTH_PLACE_INVALID") return serverError(MESSAGES.placeInvalid, 422, "BIRTH_PLACE_INVALID");
    return serverError(MESSAGES.calculationFailed, 422, "CHART_CALCULATION_FAILED");
  }

  try {
    const { content, meta } = await callConsultationLlm(env, buildFirstPrompt(normalized.input, chart));
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
        { _id: access.paymentDocId, userId: objectId(auth.userId), featureKey: FEATURE_KEY },
        { $set: { status: "fulfilled", sessionId: doc.id, orderState: "UNLOCKED" } },
      ).catch(() => {});
    }
    return json({ ok: true, consultation: consultationPayload(doc.toObject()) });
  } catch (error) {
    console.warn("[vedic-ai] llm failed", {
      userId: String(auth.userId),
      idempotencyKey,
      code: error?.code || "",
      message: clean(error?.message || error, 300),
    });
    doc.vedicChart = chart;
    doc.status = "generation_failed";
    doc.generationError = { code: "LLM_FAILED", message: clean(error?.message || error, 500), at: new Date() };
    await doc.save();
    return serverError(MESSAGES.llmFailed, 502, "LLM_FAILED");
  }
}

async function handleStart(request, env) {
  if (request.method !== "POST") return methodNotAllowed();
  const body = await readJson(request);
  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth?.userId) return loginRequired();
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) return invalidInput(MESSAGES.invalidInput);
  const idempotencyKey = readIdempotencyKey(request, body);
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

  try {
    const { content: answer, meta } = await callConsultationLlm(env, buildFollowUpPrompt(consultation.toObject(), content));
    consultation.messages.push({ role: "user", content, createdAt: new Date() });
    consultation.messages.push({ role: "assistant", content: answer, createdAt: new Date() });
    consultation.llmMeta = meta;
    await consultation.save();
    return json({ ok: true, consultation: consultationPayload(consultation.toObject()) });
  } catch (error) {
    console.warn("[vedic-ai] follow-up llm failed", {
      userId: String(auth.userId),
      consultationId,
      message: clean(error?.message || error, 300),
    });
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
  normalizeConsultationInput,
  buildPaymentPayload,
  collectEvidenceIds,
  sanitizeAssistantText,
};
