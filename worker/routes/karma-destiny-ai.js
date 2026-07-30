import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, isTransientMongoError, mongoose, withMongoRetry } from "../lib/db.js";
import { KarmaDestinyAiConsultation, MonthlyCreditLedger, PaidExecutionRecord, Payment, PointHistory, User } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canUseByPass, normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";
import { callGeminiText } from "../lib/gemini.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";

// 결정적(생년월일+질문 기반) 생성 → 캐시 + in-flight dedup으로 재시도/새로고침 중복 과금 방지.
// 초기 생성이 최대 3회(생성→교정→확장) 순차 호출이라 각 단계에 개별 키로 캐시를 건다.
function buildKarmaLlmCache(env, stageKey) {
  return {
    store: createLlmCacheStore(env),
    deterministic: true,
    ttlSeconds: 30 * 24 * 60 * 60,
    keyExtra: `karma-destiny-ai-v1-${stageKey}`,
  };
}
import { buildKarmaDestinyIntegratedResult } from "../lib/karma-destiny-ai-calculations.js";
import { handleBillingRoutes } from "./billing.js";

const SERVICE_KEY = "karma-destiny-ai";
const FEATURE_KEY = "karma-destiny-ai-consultation";
const ACCESS_TOKEN_TYPE = "karma-destiny-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "운명의 업 전문가 상담";
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const INVALID_INPUT_MESSAGE = "생년월일, 출생시간, 출생지 정보를 다시 확인해 주세요.";
const PLACE_ERROR_MESSAGE = "출생지 정보를 확인하지 못했습니다. 도시와 국가를 다시 입력해 주세요.";
const CALCULATION_ERROR_MESSAGE = "운명의 업 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.";
const CUSTOM_QUESTION_REQUIRED_MESSAGE = "직접 질문을 선택했다면 지금 가장 궁금한 내용을 짧게 적어 주세요.";

const GEMINI_ENV_KEYS = [
  "GEMINIF_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
];

const FOCUS_AREA_LABELS = Object.freeze({
  overall: "전체 운명의 업",
  love: "사랑과 이별의 업",
  money: "돈과 일에서 반복되는 문제",
  career: "재능과 사명의 방향",
  relationship: "관계에서 반복되는 상처",
  family: "가족과 인연의 업",
  lifePattern: "반복되는 인생 패턴",
  spirituality: "고독감과 내면의 숙제",
  custom: "현재 고민 상담",
});

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

const INITIAL_CONSULTATION_MIN_LENGTH = 30000;
const INITIAL_CONSULTATION_MAX_LENGTH = 0;
const INITIAL_CONSULTATION_SECTION_MIN_LENGTH = 1500;
// 배치 1회 = 4챕터 × 1,900~2,400자 + 요약/인용 JSON ≈ 9천~1.15만자(한국어 1자≈1~1.5토큰).
// 구 상한 12000은 잘림→JSON 파싱 실패(LLM_JSON_PARSE_FAILED)를 유발했다.
const INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS = 20000;
const PREMIUM_BATCH_SIZE = 4;
// 배치 1회 = 생성(120s) + JSON 수선/보강 재호출 가능성까지의 최악 시간을 덮어야 한다.
// 락이 파이프라인보다 짧으면 병렬 폴링 POST가 같은 배치를 중복 기동한다(찻집 390s 락과 같은 원리).
const PREMIUM_BATCH_LOCK_TTL_MS = 390_000;
const PREMIUM_REINFORCEMENT_MAX_ATTEMPTS = 2;
const PREMIUM_CHAPTER_TARGET_LENGTH = "1,900~2,400자";
const INITIAL_SECTION_SYMBOLS = ["業", "柱", "情", "家", "財", "職", "心", "前", "試", "緣", "年", "策", "儀", "禁", "句", "箋"];
const PREMIUM_CHAPTERS = Object.freeze([
  { id: "chapter-01", order: 1, symbol: "業", title: "운명의 업 총론", minLength: 1500, required: ["타고난 성향과 선택 패턴(일간·오행 근거로 가장 먼저 전반적으로 짚어 신뢰를 세운다)", "반복해서 마주치는 핵심 과제", "비슷한 상황이 반복되는 이유", "이번 생에서 풀어야 할 주제"] },
  { id: "chapter-02", order: 2, symbol: "柱", title: "사주/명리 기반 업의 구조", minLength: 1500, required: ["일간", "월지", "십성", "오행 균형", "강약", "용신/기신 흐름", "가능성 중심 표현"] },
  { id: "chapter-03", order: 3, symbol: "情", title: "관계의 업", minLength: 1500, required: ["연애", "이별", "재회", "결혼", "끌리는 사람의 유형", "상처받는 방식", "좋은 인연의 기준"] },
  { id: "chapter-04", order: 4, symbol: "家", title: "가족과 원가족의 업", minLength: 1500, required: ["부모와 형제", "가족 분위기", "인정 욕구", "책임감", "죄책감", "감정적 독립"] },
  { id: "chapter-05", order: 5, symbol: "財", title: "돈과 생존의 업", minLength: 1500, required: ["돈을 버는 방식", "돈이 새는 패턴", "불안 때문에 하는 선택", "손실 구조", "재물운을 살리는 행동 지침"] },
  { id: "chapter-06", order: 6, symbol: "職", title: "직업과 사명의 업", minLength: 1500, required: ["잘 맞는 일", "직장/사업 문제", "성공을 위해 버릴 태도", "타고난 재능", "장기 전문성"] },
  { id: "chapter-07", order: 7, symbol: "心", title: "마음의 업과 자기파괴 패턴", minLength: 1500, required: ["불안", "회피", "과몰입", "인정 욕구", "분노", "무기력", "회복 루틴"] },
  { id: "chapter-08", order: 8, symbol: "前", title: "전생적 상징 해석", minLength: 1500, required: ["상징적 서사", "무의식의 archetype", "왕", "수행자", "상인", "전사", "예술가", "방랑자", "치유자"] },
  { id: "chapter-09", order: 9, symbol: "試", title: "이번 생에서 반복되는 시험", minLength: 1500, required: ["선택의 갈림길", "같은 실수의 상황", "운이 막히는 신호", "운이 열리는 신호", "선택 기준"] },
  { id: "chapter-10", order: 10, symbol: "緣", title: "인연의 빚과 갚아야 할 감정", minLength: 1500, required: ["매달리는 이유", "밀어내는 이유", "미련과 집착", "정리할 때", "기다릴 때", "감정의 빚 정리"] },
  { id: "chapter-11", order: 11, symbol: "年", title: "앞으로 1년의 업 해소 흐름", minLength: 1500, required: ["12개월 흐름", "분기별 주의점", "관계", "일", "돈", "건강한 루틴", "전략적 표현"] },
  { id: "chapter-12", order: 12, symbol: "策", title: "3년 장기 운명 전략", minLength: 1500, required: ["1년 차 정리", "2년 차 재구성", "3년 차 확장", "실제 행동"] },
  { id: "chapter-13", order: 13, symbol: "儀", title: "업을 풀기 위한 실천 의식", minLength: 1500, required: ["글쓰기", "정리", "사과", "거리두기", "감사 기록", "매일 5분", "매주 1회", "매월 1회"] },
  { id: "chapter-14", order: 14, symbol: "禁", title: "피해야 할 선택과 사람", minLength: 1500, required: ["불운을 키우는 선택", "피해야 할 관계 유형", "일의 방식", "돈 습관", "약해질 때 하지 말아야 할 행동"] },
  { id: "chapter-15", order: 15, symbol: "句", title: "운명을 바꾸는 핵심 문장", minLength: 900, required: ["사용자가 기억할 문장 10개", "상담 맥락에 맞춘 문장", "흔한 자기계발 문구 금지"] },
  { id: "chapter-16", order: 16, symbol: "箋", title: "최종 편지", minLength: 1500, required: ["따뜻한 편지", "현실적 결심", "감정적 만족감", "여운 있는 마지막 문장"] },
]);
const GENERATION_STAGES = Object.freeze([
  "운명의 실타래를 펼치는 중",
  "반복된 인생 패턴을 읽는 중",
  "관계와 감정의 업을 해석하는 중",
  "돈과 직업의 흐름을 정리하는 중",
  "앞으로의 해소 전략을 작성하는 중",
  "최종 편지를 봉인하는 중",
]);

const FORBIDDEN_RESULT_PATTERN = /\bPDF\b|챕터|\bchapter\b|\bprogress\b|\bjob\b|프롬프트|시스템|\bAI\b|JSON|rawProviderDebug|providerReason|debug|model|token|토큰|모델명|이 기능은|해당 기능|본 기능|기능|이 결과는|결과는|상담 결과|생성 결과|분석 결과|결과물|출력|서버 계산 데이터|분석 데이터/i;

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
  const mode = clean(env?.NODE_ENV || env?.ENVIRONMENT || readProcessEnv("NODE_ENV"), 40).toLowerCase();
  return mode && mode !== "production";
}

function maskBirthDate(value) {
  const text = clean(value, 10);
  const match = text.match(/^(\d{4})-/);
  return match ? `${match[1]}-**-**` : "";
}

function safeLogPayload({ route = "", requestId = "", body = {}, normalized = null, validation = "", access = "", env = {}, error = null } = {}) {
  const input = normalized?.input || {};
  const birthInfo = input.birthInfo || body.birthInfo || {};
  const question = clean(input.question ?? body.question ?? input.userQuestion ?? body.userQuestion, 2000);
  return {
    route,
    requestId: clean(requestId || body.requestId || body.idempotencyKey, 180),
    serviceType: clean(input.serviceType || body.serviceType || FEATURE_KEY, 80),
    focusArea: clean(input.focusArea || body.focusArea || "overall", 40),
    validation,
    access,
    birthDate: maskBirthDate(input.birthInfo?.birthDate || birthInfo.birthDate || body.birthDate),
    questionLength: question.length,
    ...getProviderDiagnostics(env),
    ...(error ? {
      errorMessage: clean(error?.message || error, 500),
      ...(isDevelopmentEnv(env) ? { stack: clean(error?.stack, 2000) } : {}),
    } : {}),
  };
}

function logKarmaAi(marker, details = {}, level = "info") {
  const payload = { marker: `[Karma AI ${marker}]`, ...details };
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
  console[method](payload.marker, JSON.stringify(payload));
}

function asObject(value) {
  return value && typeof value === "object" ? value : {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniq(values = []) {
  return [...new Set(values.map((value) => clean(value, 180)).filter(Boolean))];
}

function objectIdLike(value) {
  const text = clean(value);
  return Boolean(text && mongoose.Types.ObjectId.isValid(text));
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
  if (["other", "unknown", "none", "기타", "비공개"].includes(text)) return "unknown";
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

function normalizeBirthPlace(value = {}, fallback = {}) {
  const place = asObject(value);
  const fallbackPlace = asObject(fallback.birthPlace);
  const textPlace = typeof value === "string"
    ? clean(value, 160)
    : typeof fallback.birthPlace === "string"
      ? clean(fallback.birthPlace, 160)
      : "";
  const [textCity = "", ...textCountryParts] = textPlace.split(",").map((part) => clean(part, 100)).filter(Boolean);
  const textCountry = textCountryParts.join(", ");
  const city = clean(place.city || place.name || place.birthCity || fallbackPlace.city || fallbackPlace.name || fallback.city || textCity, 100);
  const country = clean(place.country || place.countryCode || place.birthCountry || fallbackPlace.country || fallbackPlace.countryCode || fallback.country || textCountry, 100);
  const timezone = clean(place.timezone || place.tz || place.timezoneName || fallbackPlace.timezone || fallbackPlace.tz || fallback.timezone || fallback.tz, 80);
  const latitude = parseFiniteNumber(place.latitude ?? place.lat ?? fallback.latitude ?? fallback.lat);
  const longitude = parseFiniteNumber(place.longitude ?? place.lng ?? place.lon ?? fallback.longitude ?? fallback.lng ?? fallback.lon);
  return { city, country, latitude, longitude, timezone };
}

function normalizeFocusArea(value) {
  const raw = clean(value, 40);
  if (FOCUS_AREA_LABELS[raw]) return raw;
  const lower = raw.toLowerCase();
  if (FOCUS_AREA_LABELS[lower]) return lower;
  return "overall";
}

function normalizeConsultationInput(body = {}) {
  const birthInfo = asObject(body.birthInfo);
  const name = clean(body.userName ?? body.name ?? body.nickname ?? birthInfo.name, 80);
  const gender = normalizeGender(body.gender ?? birthInfo.gender);
  const birthDate = clean(body.birthDate ?? birthInfo.birthDate, 10);
  const birthTimeUnknown = body.birthTimeUnknown === true || birthInfo.birthTimeUnknown === true;
  const birthTime = birthTimeUnknown ? "" : clean(body.birthTime ?? birthInfo.birthTime, 5);
  const calendarType = clean(body.calendarType ?? birthInfo.calendarType, 20).toLowerCase();
  const birthPlace = normalizeBirthPlace(body.birthPlace || birthInfo.birthPlace || {}, body);
  const focusArea = normalizeFocusArea(body.focusArea);
  const topic = clean(body.topic ?? body.consultationTopic ?? FOCUS_AREA_LABELS[focusArea], 100);
  const question = clean(body.question ?? body.userQuestion, 1600);

  if (!gender) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!isValidDateKey(birthDate)) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!birthTimeUnknown && !isValidTimeKey(birthTime)) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (calendarType !== "solar" && calendarType !== "lunar") return { ok: false, message: INVALID_INPUT_MESSAGE };
  if ((birthPlace.latitude !== null && (birthPlace.latitude < -90 || birthPlace.latitude > 90))
    || (birthPlace.longitude !== null && (birthPlace.longitude < -180 || birthPlace.longitude > 180))) {
    return { ok: false, message: PLACE_ERROR_MESSAGE };
  }
  if (!VALID_TOPICS.has(topic)) return { ok: false, message: "상담 주제를 다시 선택해 주세요." };
  if (focusArea === "custom" && question.length < 2) return { ok: false, message: CUSTOM_QUESTION_REQUIRED_MESSAGE };

  const normalized = {
    serviceType: clean(body.serviceType || "karma-ai-consultation", 80),
    consultationType: clean(body.consultationType || "destinyKarma", 80),
    birthInfo: {
      name,
      gender,
      birthDate,
      birthTime,
      birthTimeUnknown,
      calendarType,
      birthPlace,
    },
    focusArea,
    topic,
    question,
    userQuestion: question,
    locale: clean(body.locale || "ko", 10),
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

function normalizeAccessType(value) {
  const raw = clean(value).toLowerCase();
  if (["membership_credit", "monthly_credit", "monthly", "subscription"].includes(raw)) return "monthly_credit";
  if (["membership_pass", "family_pass", "pass"].includes(raw)) return "pass";
  if (["admin"].includes(raw)) return "admin";
  return "paid";
}

function isMonthlyCreditAccess(accessType) {
  return ["membership_credit", "monthly_credit", "monthly", "subscription"].includes(clean(accessType).toLowerCase());
}

function readBillingContext(body = {}) {
  const billing = asObject(body.billingGate || body.billingEvidence || body.billing || body.paymentEvidence);
  const consume = asObject(body.billingConsume || body.consume || billing.consume);
  const accessGrant = asObject(body.billingAccessGrant || body.accessGrant || billing.accessGrant);
  const pricing = asObject(body.pricing || billing.pricing);
  return { billing, consume, accessGrant, pricing };
}

function collectBillingTokens(body = {}, idempotencyKey = "") {
  const ctx = readBillingContext(body);
  return uniq([
    idempotencyKey,
    body.billingRequestId,
    body.paymentId,
    body.transactionId,
    body.purchaseId,
    body.requestId,
    ctx.billing.executionId,
    ctx.billing.transactionId,
    ctx.billing.purchaseId,
    ctx.billing.paymentId,
    ctx.billing.requestId,
    ctx.consume.executionId,
    ctx.consume.transactionId,
    ctx.consume.purchaseId,
    ctx.consume.requestId,
    ctx.consume.receiptId,
    ctx.consume.pointHistoryId,
    ctx.consume.ledgerId,
    ctx.consume.monthlyCreditLedgerId,
    ctx.accessGrant.executionId,
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

function billingTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ "metadata.requestId": token });
    clauses.push({ "metadata.purchaseId": token });
    clauses.push({ "metadata.idempotencyKey": token });
    clauses.push({ "metadata.orderId": token });
    clauses.push({ "metadata.transactionId": token });
    clauses.push({ "metadata.pointHistoryId": token });
    clauses.push({ sourceId: token });
    if (objectIdLike(token)) clauses.push({ _id: token }, { paymentId: token });
  });
  return clauses;
}

function paymentTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ requestId: token }, { idempotencyKey: token }, { merchantUid: token }, { impUid: token });
    clauses.push({ "metadata.requestId": token }, { "metadata.purchaseId": token }, { "metadata.idempotencyKey": token });
  });
  return clauses;
}

function deferredTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ requestId: token }, { idempotencyKey: token }, { executionId: token }, { paymentId: token }, { orderId: token });
    clauses.push({ "result.deferredUsage.requestId": token }, { "result.deferredUsage.paymentId": token });
    if (objectIdLike(token)) clauses.push({ _id: token });
  });
  return clauses;
}

function normalizeDeferredAccessType(value) {
  const raw = clean(value).toLowerCase();
  if (["monthly", "membership_credit", "monthly_credit"].includes(raw)) return "monthly_credit";
  if (["pass", "family", "membership_pass", "family_pass"].includes(raw)) return "pass";
  return "paid";
}

async function findBillingGateEvidence({ userId, idempotencyKey, body = {} }) {
  const tokens = collectBillingTokens(body, idempotencyKey);
  const signal = readBillingAccessSignal(body);
  const ctx = readBillingContext(body);
  const featureKey = clean(ctx.pricing.featureKey || ctx.billing.featureKey || ctx.consume.featureKey || ctx.accessGrant.featureKey);
  if (featureKey && featureKey !== FEATURE_KEY) return null;

  const pointClauses = billingTokenClauses(tokens);
  if (pointClauses.length && mongoose.Types.ObjectId.isValid(String(userId || ""))) {
    const point = await PointHistory.findOne({
      userId,
      featureKey: FEATURE_KEY,
      kind: "deduct",
      "metadata.coinRefundedForUnlockFailure": { $ne: true },
      "metadata.monthlyCreditRefundedForUnlockFailure": { $ne: true },
      "metadata.refundedForServiceExecution": { $ne: true },
      $or: pointClauses,
    }).sort({ createdAt: -1 }).lean();
    if (point) {
      return {
        ok: true,
        accessType: normalizeAccessType(point?.metadata?.accessType || point?.metadata?.paymentMethod || signal),
        paymentId: clean(point._id, 160),
        billingRequestId: clean(point?.metadata?.requestId || idempotencyKey, 180),
        usageAlreadyApplied: true,
      };
    }
  }

  const monthlyClauses = billingTokenClauses(tokens);
  if (monthlyClauses.length && mongoose.Types.ObjectId.isValid(String(userId || ""))) {
    const ledger = await MonthlyCreditLedger.findOne({
      userId,
      type: "MONTHLY_CREDIT_SPEND",
      "metadata.featureKey": FEATURE_KEY,
      "metadata.refundedForUnlockFailure": { $ne: true },
      "metadata.refundedForServiceExecution": { $ne: true },
      $or: monthlyClauses,
    }).sort({ createdAt: -1 }).lean();
    if (ledger) {
      return {
        ok: true,
        accessType: "monthly_credit",
        paymentId: clean(ledger._id, 160),
        billingRequestId: clean(ledger?.metadata?.requestId || idempotencyKey, 180),
        usageAlreadyApplied: true,
      };
    }
  }

  const deferredClauses = deferredTokenClauses(tokens);
  if (deferredClauses.length && mongoose.Types.ObjectId.isValid(String(userId || ""))) {
    const record = await PaidExecutionRecord.findOne({
      userId: clean(userId),
      featureId: FEATURE_KEY,
      status: { $in: ["paid_pending_generation", "generating", "completed"] },
      $or: deferredClauses,
    }).sort({ updatedAt: -1, createdAt: -1 }).lean();
    if (record) {
      return {
        ok: true,
        accessType: normalizeDeferredAccessType(record.accessMethod || signal),
        paymentId: clean(record._id, 160),
        billingRequestId: clean(record.requestId || idempotencyKey, 180),
        deferredUsage: record.status !== "completed",
        usageAlreadyApplied: record.status === "completed",
      };
    }
  }

  const paymentClauses = paymentTokenClauses(tokens);
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
        paymentId: clean(payment.merchantUid || payment.impUid || tokens[0], 160),
        billingRequestId: clean(payment.requestId || payment.idempotencyKey || idempotencyKey, 180),
        usageAlreadyApplied: true,
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
  if (billing?.ok) return {
    ...billing,
    usageAlreadyApplied: billing.usageAlreadyApplied === true,
  };

  const pass = normalizeHoneyPassEntitlement(user || {});
  if (canUseByPass(pass, pricing.coinPrice)) {
    return { ok: true, accessType: "pass", paymentId: "", usageAlreadyApplied: false };
  }

  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

function buildBillingGatePayload(pricing, idempotencyKey) {
  return {
    billingMode: "coin-gate",
    featureKey: FEATURE_KEY,
    serviceKey: SERVICE_KEY,
    serviceId: SERVICE_KEY,
    serviceType: "karma-ai-consultation",
    consultationType: "destinyKarma",
    categoryKey: "premium-consultation",
    subFeatureKey: FEATURE_KEY,
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
    runtimeGate: {
      categoryKey: "premium-consultation",
      subFeatureKey: FEATURE_KEY,
      featureKey: FEATURE_KEY,
      reason: ORDER_NAME,
      productId: SERVICE_KEY,
      productType: SERVICE_KEY,
      serviceType: "karma-ai-consultation",
      cost: pricing.coinPrice,
      coinPrice: pricing.coinPrice,
      amountKRW: pricing.amountKRW,
      membershipCreditCost: pricing.membershipCreditCost,
    },
  };
}

function buildSystemPrompt(mode = "initial") {
  const shared = [
    "당신은 오래 상담해 온 운명의 업 상담가입니다.",
    "명리학자의 현실 감각, 서양 점성술사의 상징 해석, 베다 점성술사의 카르마 통찰을 한 목소리로 엮습니다.",
    "사주명리학은 일간의 기질, 오행 구조, 대운 흐름, 육친 관계, 강약 오행에서 드러나는 현실 처방을 맡습니다.",
    "서양 점성술은 태양의 욕구, 달의 감정 반응, 상승궁의 대면 방식, 카이런의 상처와 치유 서사를 맡습니다.",
    "베다 점성술은 라시와 나크샤트라의 본질, 다샤 행성 주기, 라후-케투 축의 카르마 과제, 다르마와 아르타 하우스의 소명을 맡습니다.",
    "세 체계의 이름을 설명표처럼 나열하지 말고, 필요한 근거가 상담 문장 안에서 자연스럽게 드러나게 합니다.",
    "",
    "언어와 문체:",
    "한국어 격식체로 씁니다.",
    "운세 전문가가 직접 사용자를 마주 보고 말하듯 전문적이고 신비로우며 감정적으로 자연스럽게 씁니다.",
    "각 단락은 서로 다른 은유와 이미지를 사용합니다.",
    "분량을 채우기 위해 같은 표현, 같은 조언, 같은 상징을 반복하지 않고, 부족한 분량은 계산 근거에서 새 관점과 구체적 처방을 꺼내 채웁니다.",
    "‘업’은 벌이나 저주가 아니라 반복되는 선택, 감정 습관, 관계 패턴, 성장 과제로 해석합니다.",
    "불안감이나 죄책감을 자극하지 않고, 운명 확정 표현을 사실처럼 단정하지 않습니다.",
    "PDF, 챕터, chapter, job, progress, 프롬프트, 시스템, AI, 기능, 결과, 분석 결과, 출력, 데이터 같은 작업 표현을 노출하지 않습니다.",
    "문단 사이는 빈 줄로 구분하고, 핵심 문구만 **굵게** 표시합니다. 그 외 마크다운(제목 #, 코드블록, 표)은 쓰지 않습니다.",
  ];

  if (mode === "follow_up") {
    return [
      ...shared,
      "",
      "추가 질문 응답 방식:",
      "처음 상담의 16개 장 제목을 반복하지 않습니다.",
      "첫 문장부터 사용자의 새 질문에 직접 답합니다.",
      "이전 상담에서 이미 말한 내용을 길게 되풀이하지 말고, 새 질문에 필요한 흐름만 다시 짚습니다.",
      "사주, 서양 점성술, 베다 점성술의 근거는 필요한 만큼만 섞어 2~4개의 완성된 산문 단락으로 답합니다.",
      "단순 위로가 아니라 지금 사용자가 취할 수 있는 말, 태도, 선택을 구체적으로 비춥니다.",
      "불릿 포인트와 번호 나열을 사용하지 않습니다.",
      "전체 분량은 900~1,600자로 맞춥니다.",
      "마지막 문장은 사용자가 지금 해볼 수 있는 한 가지 행동으로 따뜻하게 닫습니다.",
    ].join("\n");
  }

  return [
    ...shared,
    "",
    "초기 상담 구조:",
    "최종 상담은 16개 장으로 완성합니다. 한 번에 전부 쓰지 않고 요청받은 장만 깊게 씁니다.",
    `각 장은 목표 ${PREMIUM_CHAPTER_TARGET_LENGTH}의 완성된 산문이며, 각 장 마지막에는 “이번 장의 핵심” 3줄을 둡니다.`,
    "장마다 감정적 해석과 현실적 전략을 함께 담고, 관계·직업·돈·가족·전생적 상징·1년 흐름·3년 전략이 서로 이어지게 씁니다.",
    "전생은 사실 단정이 아니라 무의식의 상징적 서사로만 다룹니다.",
    "질병, 사망, 사고, 파산, 이혼, 투자 손실 같은 일을 확정 예언하지 않습니다.",
    "법률·의료·투자 판단을 대신하지 않습니다.",
    "내부 작업 표현, 결제 표현, 모델명, 토큰, 원시 응답, 디버그 사유를 노출하지 않습니다.",
    "흔한 위로나 자기계발식 문장을 반복하지 말고, 사용자의 입력과 계산 근거에 맞는 구체적 장면과 선택 기준을 씁니다.",
    "",
    "초기 상담 금지 사항:",
    "‘당신은 반드시’, ‘전생에 실제로’, ‘무조건’처럼 확정하거나 겁주는 표현을 금지합니다.",
    "동일한 내용을 다른 장에서 반복하지 않습니다.",
    "‘~할 수 있습니다’, ‘~일 것입니다’의 반복적 어미를 피합니다.",
    "마지막에 추가 질문을 유도하지 않습니다.",
    `최종 합산 분량은 실제 사용자가 읽는 plain text 기준 ${INITIAL_CONSULTATION_MIN_LENGTH.toLocaleString("ko-KR")}자 이상이어야 합니다.`,
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
    `상담 초점: ${input.focusArea}`,
    `현재 가장 궁금한 질문: ${input.question || "선택한 상담 주제를 중심으로 봅니다."}`,
    "",
    "[상담 근거]",
    JSON.stringify(integratedResult),
    "",
    "위 계산 데이터를 바탕으로 16개 장을 순서대로 작성하고, 전체 상담문은 실제 사용자가 읽는 plain text 기준 30,000자 이상으로 완성하세요.",
    "각 장 제목은 지정된 순서와 한글 제목을 그대로 사용하되, 본문은 산문으로 이어 쓰세요.",
    "사용자의 선택 주제와 질문은 전체 서사의 중심 감정으로 녹이고, 별도 문답 형식으로 나누지 마세요.",
    "각 파트에는 사주명리학, 서양 점성술, 베다 점성술의 근거가 설명표처럼 분리되지 않고 자연스럽게 스며들어야 합니다.",
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
    `처음 상담 질문: ${consultation.userQuestion || "선택한 상담 주제를 중심으로 봅니다."}`,
    "",
    "[상담 근거]",
    JSON.stringify(consultation.integratedResult || {}),
    "",
    "[이전 대화]",
    history,
    "",
    "[새 질문]",
    question,
    "",
    "16개 장을 반복하지 말고, 첫 문장부터 새 질문에 직접 답하세요.",
    "이전 상담 흐름을 이어받되 필요한 부분만 짚고, 업을 죄나 벌이 아닌 반복 패턴과 성장 과제로 풀어주세요.",
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
    .replace(/\bAI\b/g, "상담")
    .replace(/이 기능은|해당 기능|본 기능/g, "이 흐름은")
    .replace(/기능/g, "흐름")
    .replace(/분석 결과는|이 결과는|상담 결과는|생성 결과는|결과는/g, "상담 흐름은")
    .replace(/분석 결과|상담 결과|생성 결과|결과물/g, "상담 흐름")
    .replace(/출력/g, "상담")
    .replace(/서버 계산 데이터|분석 데이터/g, "상담 근거");
}

function normalizePlainText(text) {
  return clean(text)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function countMeaningfulChars(text) {
  return normalizePlainText(text).length;
}

function countUserVisibleChars(text) {
  return normalizePlainText(text).length;
}

function formatChapterHeading(chapter) {
  const order = Number(chapter?.order || 0);
  const title = clean(chapter?.title, 120);
  return `${order}장. ${title}`;
}

function formatChapterContent(chapter) {
  const keyTakeaways = safeArray(chapter?.keyTakeaways).map((item) => clean(item, 220)).filter(Boolean).slice(0, 3);
  return [
    `## ${formatChapterHeading(chapter)}`,
    "",
    clean(chapter?.content, 14000),
    "",
    "이번 장의 핵심",
    ...keyTakeaways.map((item) => `- ${item}`),
  ].filter(Boolean).join("\n");
}

function formatChaptersAsConsultationText(chapters = []) {
  return safeArray(chapters)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map(formatChapterContent)
    .join("\n\n");
}

function parseKarmaConsultationSections(text) {
  const normalized = clean(text).replace(/\r\n/g, "\n");
  if (!normalized) return [];
  const headingPattern = /(?:^|\n)(?:#{1,3}\s*)?(\d{1,2})장\.\s*([^\n]+)/g;
  const matches = [...normalized.matchAll(headingPattern)];
  return matches.map((match, index) => {
    const start = (match.index || 0) + match[0].length;
    const end = matches[index + 1]?.index ?? normalized.length;
    const order = Number(match[1]);
    const definition = PREMIUM_CHAPTERS[order - 1] || {};
    return {
      symbol: clean(definition.symbol || match[1], 3),
      id: clean(definition.id || `chapter-${String(order).padStart(2, "0")}`, 40),
      order,
      title: `${order}장. ${clean(match[2]).replace(/\*\*/g, "")}`,
      body: normalized.slice(start, end).trim(),
    };
  }).filter((section) => section.order && section.body);
}

function detectRepeatedParagraphs(text) {
  const counts = new Map();
  const paragraphs = clean(text)
    .split(/\n{2,}/)
    .map((paragraph) => normalizePlainText(paragraph).replace(/[.,!?。？！\s]/g, ""))
    .filter((paragraph) => paragraph.length >= 80);
  for (const paragraph of paragraphs) counts.set(paragraph, (counts.get(paragraph) || 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([paragraph, count]) => ({ sample: paragraph.slice(0, 80), count }))
    .slice(0, 8);
}

function detectGenericAdviceWarnings(text) {
  const normalized = normalizePlainText(text);
  const genericPhrases = [
    "자신을 사랑하세요",
    "긍정적으로 생각하세요",
    "마음을 열어보세요",
    "너무 걱정하지 마세요",
    "천천히 나아가세요",
    "스스로를 믿으세요",
  ];
  return genericPhrases
    .map((phrase) => ({ phrase, count: (normalized.match(new RegExp(phrase, "g")) || []).length }))
    .filter((item) => item.count >= 3);
}

function normalizeChapter(rawChapter, definition) {
  const content = cleanForbiddenResult(clean(rawChapter?.content || rawChapter?.body, 14000));
  const rawTakeaways = safeArray(rawChapter?.keyTakeaways || rawChapter?.takeaways || rawChapter?.coreLines)
    .map((item) => cleanForbiddenResult(clean(item, 220)))
    .filter(Boolean);
  const summary = cleanForbiddenResult(clean(rawChapter?.summary, 1200));
  const keyTakeaways = rawTakeaways.length >= 3
    ? rawTakeaways.slice(0, 3)
    : [
      ...rawTakeaways,
      ...clean(summary).split(/\n+/).map((line) => line.replace(/^[-•\d.)\s]+/, "").trim()).filter(Boolean),
    ].slice(0, 3);
  while (keyTakeaways.length < 3 && content) {
    keyTakeaways.push(`${definition.title}의 흐름은 반복되는 감정과 현실 선택을 함께 비춥니다.`);
  }
  const highlightQuotes = safeArray(rawChapter?.highlightQuotes || rawChapter?.quotes)
    .map((item) => cleanForbiddenResult(clean(item, 180)))
    .filter(Boolean)
    .slice(0, 3);
  const normalized = {
    id: definition.id,
    order: definition.order,
    title: definition.title,
    content,
    summary,
    keyTakeaways: keyTakeaways.slice(0, 3),
    highlightQuotes,
  };
  return {
    ...normalized,
    charCount: countUserVisibleChars(formatChapterContent(normalized)),
  };
}

function validatePremiumReportQuality(chapters, options = {}) {
  const minLength = Number(options.minLength || INITIAL_CONSULTATION_MIN_LENGTH);
  const chapterMinCount = Number(options.chapterMinCount || PREMIUM_CHAPTERS.length);
  const ordered = safeArray(chapters).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const reportText = formatChaptersAsConsultationText(ordered);
  const totalChars = countUserVisibleChars(reportText);
  const missingChapters = PREMIUM_CHAPTERS
    .filter((definition) => !ordered.some((chapter) => chapter.id === definition.id && clean(chapter.content).length > 0))
    .map((definition) => definition.id);
  const shortChapters = ordered
    .filter((chapter) => countUserVisibleChars(formatChapterContent(chapter)) < Number(PREMIUM_CHAPTERS[Number(chapter.order || 1) - 1]?.minLength || INITIAL_CONSULTATION_SECTION_MIN_LENGTH))
    .map((chapter) => chapter.id);
  const summaryWarnings = ordered
    .filter((chapter) => safeArray(chapter.keyTakeaways).filter(Boolean).length < 3)
    .map((chapter) => chapter.id);
  const repeatedPhraseWarnings = detectRepeatedParagraphs(reportText);
  const genericAdviceWarnings = detectGenericAdviceWarnings(reportText);
  const promptLeakDetected = FORBIDDEN_RESULT_PATTERN.test(reportText);
  const ok = totalChars >= minLength
    && ordered.length >= chapterMinCount
    && missingChapters.length === 0
    && shortChapters.length === 0
    && summaryWarnings.length === 0
    && repeatedPhraseWarnings.length === 0
    && genericAdviceWarnings.length === 0
    && !promptLeakDetected;
  return {
    passed: ok,
    ok,
    totalCharCount: totalChars,
    totalChars,
    minLength,
    chapterCount: ordered.length,
    chapterMinCount,
    missingChapters,
    shortChapters,
    summaryWarnings,
    repeatedPhraseWarnings,
    genericAdviceWarnings,
    promptLeakDetected,
    hasForbiddenText: promptLeakDetected,
    tooShort: totalChars < minLength,
    tooLong: false,
  };
}

function validateInitialConsultationQuality(text, options = {}) {
  const sections = parseKarmaConsultationSections(cleanForbiddenResult(text));
  const chapters = sections.map((section) => normalizeChapter({
    content: section.body,
    summary: "",
    keyTakeaways: [],
  }, PREMIUM_CHAPTERS[section.order - 1] || {
    id: section.id,
    order: section.order,
    title: clean(section.title.replace(/^\d+장\.\s*/, ""), 120),
    minLength: INITIAL_CONSULTATION_SECTION_MIN_LENGTH,
  }));
  return validatePremiumReportQuality(chapters, options);
}

async function repairForbiddenConsultationText(env, text, systemPrompt, options = {}) {
  if (!FORBIDDEN_RESULT_PATTERN.test(text)) return clean(text);
  const repair = await callGeminiText(env, [
    "다음 상담 답변에서 시스템성 표현과 작업 용어를 모두 제거하고, 자연스러운 운명의 업 상담문으로만 다시 써주세요.",
    "16개 장 제목과 전체 분량은 유지하고, 상담가가 직접 말하는 문장만 남겨주세요.",
    "",
    text,
  ].join("\n"), {
    systemPrompt,
    taskType: "fortune",
    temperature: 0.58,
    maxOutputTokens: options.maxOutputTokens || INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS,
    timeoutMs: options.timeoutMs,
    cache: buildKarmaLlmCache(env, "repair"),
  });
  const repaired = clean(repair?.text);
  return cleanForbiddenResult(repair?.ok && repaired.length >= 160 ? repaired : text);
}

async function ensureInitialConsultationQuality(env, text, prompt, systemPrompt, options = {}) {
  const minLength = Number(options.minLength || INITIAL_CONSULTATION_MIN_LENGTH);
  const maxLength = Number(options.maxLength || INITIAL_CONSULTATION_MAX_LENGTH);
  const maxOutputTokens = Number(options.maxOutputTokens || INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS);
  // PREMIUM_GEMINI_TIMEOUT_MS(운영 45s)를 || 체인에 넣으면 큰 기본값이 죽는다(45s 단락 함정).
  const timeoutMs = Number(env?.KARMA_DESTINY_AI_TIMEOUT_MS) || 120000;
  let current = await repairForbiddenConsultationText(env, text, systemPrompt, { maxOutputTokens, timeoutMs });
  let quality = validateInitialConsultationQuality(current, { minLength, maxLength });
  if (quality.ok) return current;

  const expanded = await callGeminiText(env, [
    "다음 운명의 업 상담문을 같은 계산 근거 안에서 더 깊고 균형 잡힌 완성 원고로 다시 써주세요.",
    `전체 분량은 실제 사용자가 읽는 plain text 기준 ${minLength}자 이상이어야 합니다.`,
    "16개 장과 지정된 제목 순서는 반드시 유지합니다.",
    "각 장은 새로운 관점과 실제 상담의 밀도를 가져야 하며, 같은 문장을 늘리거나 비슷한 조언을 반복하지 않습니다.",
    "명리학자, 점성술사, 베다 점성술사의 근거는 장마다 자연스럽게 연결됩니다.",
    "PDF, 챕터, 프롬프트, 시스템, AI, 기능, 결과, 출력, 데이터 같은 작업 표현은 쓰지 않습니다.",
    "",
    "[원래 요청]",
    prompt,
    "",
    "[현재 상담문]",
    current,
  ].join("\n"), {
    systemPrompt,
    taskType: "fortune",
    temperature: 0.64,
    maxOutputTokens,
    timeoutMs,
    cache: buildKarmaLlmCache(env, "expand"),
  });
  const expandedText = clean(expanded?.text);
  if (expanded?.ok && expandedText) {
    current = await repairForbiddenConsultationText(env, expandedText, systemPrompt, { maxOutputTokens, timeoutMs });
    quality = validateInitialConsultationQuality(current, { minLength, maxLength });
  }
  if (!quality.ok) {
    // 경량 보장 계약: 품질 기준 미달이라도 렌더 가능한 상담문이 있으면 버리지 않고 degrade로 전달한다.
    // 너무 길어 실패한 경우(tooLong)는 그대로 전달, 그 외엔 최소 분량을 넘는 경우만 degrade.
    if (quality.tooLong || hasRenderableLlmText(current, { minChars: 400 })) {
      return current;
    }
    const error = new Error("Karma destiny consultation did not meet quality length or section requirements.");
    error.code = quality.tooShort ? "LLM_RESULT_TOO_SHORT" : quality.tooLong ? "LLM_RESULT_TOO_LONG" : "LLM_RESULT_QUALITY_FAILED";
    error.quality = quality;
    throw error;
  }
  return current;
}

function buildKarmaDestinyAiMockConsultation() {
  const paragraphSeeds = [
    "당신 안에는 오래 눌러 두었던 직감과 현실을 끝까지 확인하려는 힘이 함께 머무릅니다. 마음은 먼저 기척을 알아차리고, 몸은 그 기척이 실제 삶에서 어떤 선택으로 이어질지 천천히 따져 봅니다. 그래서 중요한 국면마다 서두르는 듯 보여도 속으로는 이미 여러 번 길을 가늠하고 있습니다.",
    "반복되는 매듭은 약함의 흔적이 아니라 아직 다르게 써 보지 못한 능력의 그림자에 가깝습니다. 같은 사람, 같은 말투, 같은 기다림 앞에서 마음이 흔들릴 때마다 운명은 당신에게 더 단단한 기준을 세우라고 속삭입니다. 그 기준은 차가운 선이 아니라 스스로를 함부로 넘기지 않는 온기입니다.",
    "지금의 시기는 닫힌 문 앞에서 멈춘 계절이 아니라, 안쪽에서 잠금이 풀리는 소리를 듣는 때에 가깝습니다. 밖으로 드러난 변화가 작아 보여도 내면에서는 무엇을 더 붙들고 무엇을 내려놓을지 이미 정리가 시작되었습니다. 이 흐름을 믿을수록 선택은 한결 조용하고 정확해집니다.",
    "관계에서는 상대의 마음을 읽으려는 섬세함이 강하게 떠오르지만, 그 섬세함이 오래 지속되면 자신의 욕구를 뒤로 미루는 습관이 됩니다. 이제는 먼저 맞추는 사람이 아니라 함께 맞춰 갈 수 있는지를 보는 사람이 되어야 합니다. 사랑도 인연도 당신의 생기를 줄이지 않을 때 더 깊어집니다.",
    "재능과 물질의 자리에서는 한 번에 크게 빛나는 운보다 꾸준히 쌓아 올린 감각이 더 강하게 열립니다. 당신은 흩어진 경험을 하나로 묶을 때 돈의 길도 함께 보이는 사람입니다. 지금 필요한 것은 더 많은 일을 떠안는 것이 아니라, 이미 가진 능력에 이름을 붙이고 값을 정하는 일입니다.",
    "이 생의 과제는 모든 것을 혼자 감당하는 품을 내려놓고, 필요한 순간에 도움과 협력을 받아들이는 데 있습니다. 운명은 당신에게 강함만을 요구하지 않습니다. 오히려 부드럽게 기대고도 무너지지 않는 법, 마음을 열고도 자신을 잃지 않는 법을 배우도록 이끌고 있습니다.",
    "오늘은 오래 미뤄 둔 작은 결정을 하나만 실제 행동으로 옮겨 보세요. 누군가에게 답장을 보내거나, 정리하지 못한 문장을 적거나, 마음속에서만 재던 제안을 조용히 꺼내는 것으로 충분합니다. 운명은 거창한 선언보다 정확한 한 걸음에 더 빠르게 반응합니다.",
  ];
  const chapters = PREMIUM_CHAPTERS.map((definition, sectionIndex) => {
    const paragraphs = Array.from({ length: sectionIndex === 14 ? 6 : 9 }, (_, paragraphIndex) => {
      const first = paragraphSeeds[(sectionIndex + paragraphIndex) % paragraphSeeds.length];
      const second = paragraphSeeds[(sectionIndex + paragraphIndex + 2) % paragraphSeeds.length];
      return `${definition.title}의 ${paragraphIndex + 1}번째 흐름에서, ${first} ${second}`;
    });
    const content = [
      ...paragraphs,
      "이번 장의 핵심",
      `- ${definition.title}은 지금 반복되는 선택의 모양을 더 선명하게 드러냅니다.`,
      "- 감정의 원인을 운명 탓으로 돌리지 않고, 현실에서 바꿀 수 있는 기준으로 옮기는 일이 중요합니다.",
      "- 오늘의 작은 실천이 오래된 매듭을 느슨하게 만드는 첫 방향이 됩니다.",
    ].join("\n\n");
    return {
      ...definition,
      content,
      summary: `${definition.title}에서 가장 중요한 흐름은 반복을 알아차리고 다른 선택을 세우는 일입니다.`,
      keyTakeaways: [
        `${definition.title}은 오래 반복된 감정의 결을 비춥니다.`,
        "현실에서 바꿀 수 있는 기준을 한 가지 정해야 합니다.",
        "작은 행동이 다음 운의 문을 여는 시작점입니다.",
      ],
      highlightQuotes: ["운명은 거창한 선언보다 정확한 한 걸음에 더 빠르게 반응합니다."],
    };
  });
  return formatChaptersAsConsultationText(chapters);
}

async function generateConsultationText(env, prompt, options = {}) {
  const providerDiagnostics = getProviderDiagnostics(env);
  const mode = options.mode === "follow_up" ? "follow_up" : "initial";
  const systemPrompt = buildSystemPrompt(mode);
  logKarmaAi("LLM Provider Selected", {
    ...(options.logContext || {}),
    ...providerDiagnostics,
  });
  const ai = await callGeminiText(env, prompt, {
    systemPrompt,
    taskType: "fortune",
    temperature: options.temperature || (mode === "follow_up" ? 0.68 : 0.74),
    maxOutputTokens: options.maxOutputTokens || (mode === "initial" ? INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS : 7600),
    // 45s 단락 함정 회피(위 ensureInitialConsultationQuality 주석 참고). 배치당 2만 토큰 ≈ 100s.
    timeoutMs: Number(env?.KARMA_DESTINY_AI_TIMEOUT_MS) || 120000,
    // 초기 장문도 폴백을 허용하되 목표의 40% 미만이면 실패로 돌린다(재시도·환불 경로 유지).
    ...(mode === "initial" ? { fallbackMinChars: Math.round(INITIAL_CONSULTATION_MIN_LENGTH * 0.4) } : {}),
    cache: buildKarmaLlmCache(env, mode),
  });
  const provider = clean(ai?.provider || ai?.model || "gemini");
  const isMock = /mock/i.test(provider) || ai?.isMock === true;
  let text = clean(ai?.text);
  if (!ai?.ok || isMock) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed."));
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_GENERATION_FAILED";
    error.providerDiagnostics = providerDiagnostics;
    throw error;
  }
  if (mode === "initial") {
    text = await ensureInitialConsultationQuality(env, text, prompt, systemPrompt, {
      minLength: options.minLength || INITIAL_CONSULTATION_MIN_LENGTH,
      maxLength: options.maxLength || INITIAL_CONSULTATION_MAX_LENGTH,
      maxOutputTokens: options.maxOutputTokens || INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS,
    });
    return { text, provider, model: clean(ai?.model) };
  }
  if (text.length < (options.minLength || 220)) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed."));
    error.code = "LLM_GENERATION_FAILED";
    error.providerDiagnostics = providerDiagnostics;
    throw error;
  }
  if (!FORBIDDEN_RESULT_PATTERN.test(text)) return { text, provider, model: clean(ai?.model) };

  const repair = await callGeminiText(env, [
    "다음 상담 답변에서 시스템성 표현과 작업 용어를 모두 제거하고, 자연스러운 운명의 업 상담문으로만 다시 써주세요.",
    "",
    text,
  ].join("\n"), {
    systemPrompt,
    taskType: "fortune",
    temperature: 0.58,
    maxOutputTokens: options.maxOutputTokens || 7600,
    cache: buildKarmaLlmCache(env, "follow-up-repair"),
  });
  const repaired = clean(repair?.text);
  return {
    text: cleanForbiddenResult(repair?.ok && repaired.length >= 160 ? repaired : text),
    provider: clean(repair?.provider || provider),
    model: clean(repair?.model || ai?.model),
  };
}

function buildGenerationProgress(doc = {}, overrides = {}) {
  const chapters = safeArray(overrides.chapters || doc.chapters);
  const completedChapters = chapters.length;
  const totalChapters = PREMIUM_CHAPTERS.length;
  const nextDefinition = PREMIUM_CHAPTERS[Math.min(completedChapters, totalChapters - 1)] || PREMIUM_CHAPTERS[totalChapters - 1];
  const basePercent = Math.min(96, Math.round((completedChapters / totalChapters) * 96));
  const stageIndex = Math.min(GENERATION_STAGES.length - 1, Math.floor((completedChapters / totalChapters) * GENERATION_STAGES.length));
  const status = clean(overrides.status || doc.status || "generating");
  return {
    totalChapters,
    completedChapters,
    currentChapterId: completedChapters < totalChapters ? nextDefinition.id : "",
    currentChapterTitle: completedChapters < totalChapters ? nextDefinition.title : "최종 품질을 확인하는 중",
    activeBatchIndex: Number(overrides.activeBatchIndex ?? doc.generationProgress?.activeBatchIndex ?? Math.floor(completedChapters / PREMIUM_BATCH_SIZE)),
    totalBatches: Math.ceil(totalChapters / PREMIUM_BATCH_SIZE),
    percent: status === "completed" ? 100 : Number(overrides.percent ?? basePercent),
    stageLabel: clean(overrides.stageLabel || GENERATION_STAGES[stageIndex] || GENERATION_STAGES[0], 80),
    lockedAt: overrides.lockedAt ?? doc.generationProgress?.lockedAt ?? null,
    lockToken: clean(overrides.lockToken ?? doc.generationProgress?.lockToken, 80),
    updatedAt: new Date().toISOString(),
  };
}

function buildPublicUserInput(doc = {}) {
  const birth = doc.birthInfo || {};
  const place = birth.birthPlace || {};
  return {
    name: clean(birth.name, 80),
    gender: clean(birth.gender, 20),
    birthDate: clean(birth.birthDate, 10),
    birthTime: birth.birthTimeUnknown ? "모름" : clean(birth.birthTime, 5),
    birthTimeUnknown: birth.birthTimeUnknown === true,
    calendarType: clean(birth.calendarType, 10),
    birthPlace: {
      city: clean(place.city, 100),
      country: clean(place.country, 100),
      timezone: clean(place.timezone, 80),
    },
    topic: clean(doc.topic, 100),
    question: clean(doc.userQuestion, 1600),
  };
}

function buildResultLookup(identifier, auth) {
  const value = clean(identifier, 180);
  return {
    userId: clean(auth.userId),
    $or: [
      { id: value },
      { reportId: value },
      { attemptId: value },
      { idempotencyKey: value },
    ],
  };
}

function extractJsonPayload(text) {
  const raw = clean(text);
  const unfenced = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = unfenced.indexOf("{");
  const last = unfenced.lastIndexOf("}");
  if (first < 0 || last <= first) {
    const error = new Error("LLM batch response was not valid JSON.");
    error.code = "LLM_JSON_PARSE_FAILED";
    throw error;
  }
  return JSON.parse(unfenced.slice(first, last + 1));
}

function buildBatchPrompt(consultation, batchIndex) {
  const birth = consultation.birthInfo || {};
  const place = birth.birthPlace || {};
  const start = batchIndex * PREMIUM_BATCH_SIZE;
  const definitions = PREMIUM_CHAPTERS.slice(start, start + PREMIUM_BATCH_SIZE);
  const previousSummaries = safeArray(consultation.chapterSummaries)
    .map((item) => clean(item?.summary || item?.carryForward || item, 500))
    .filter(Boolean)
    .slice(-8);
  const avoidPhrases = uniq(safeArray(consultation.generationProgress?.avoidPhrases).map((item) => clean(item, 120))).slice(0, 16);
  return [
    "[사용자 입력]",
    `이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `성별: ${birth.gender}`,
    `생년월일: ${birth.birthDate}`,
    `출생시간: ${birth.birthTimeUnknown ? "모름" : birth.birthTime}`,
    `달력: ${birth.calendarType === "lunar" ? "음력" : "양력"}`,
    `출생지: ${[place.city, place.country, place.timezone].filter(Boolean).join(", ")}`,
    `상담 주제: ${consultation.topic}`,
    `현재 질문: ${consultation.userQuestion || "선택한 상담 주제를 중심으로 봅니다."}`,
    "",
    "[명리·점성·베다 계산 요약]",
    clean(JSON.stringify(consultation.integratedResult || {}), 14000),
    "",
    "[앞 장에서 이어받을 흐름]",
    previousSummaries.length ? previousSummaries.join("\n") : "아직 앞 장이 없습니다. 전체 상담의 기둥을 세우듯 시작합니다.",
    "",
    "[반복하지 않을 표현]",
    avoidPhrases.length ? avoidPhrases.join(", ") : "흔한 위로, 뻔한 자기계발 문장, 같은 은유의 반복",
    "",
    "[이번에 작성할 장]",
    JSON.stringify(definitions.map((definition) => ({
      id: definition.id,
      order: definition.order,
      title: definition.title,
      targetLength: PREMIUM_CHAPTER_TARGET_LENGTH,
      required: definition.required,
    }))),
    "",
    "위 장들만 깊게 작성하세요. 각 장 content는 산문 중심으로 충분히 길게 쓰고, 각 장 마지막 흐름을 summary와 keyTakeaways 3개로 정리하세요.",
    "전생적 상징은 사실 단정이 아니라 무의식의 상징처럼 보이는 서사로만 표현하세요.",
    "사용자가 실제로 취할 수 있는 관계, 돈, 일, 가족, 마음의 행동 전략을 각 장 안에 자연스럽게 넣으세요.",
    "반환은 아래 형태의 JSON 객체 하나만 허용합니다. content 안에는 JSON, 프롬프트, 시스템, AI, 모델, 토큰, 결제, 디버그 표현을 넣지 마세요.",
    '{"chapters":[{"id":"chapter-01","title":"운명의 업 총론","content":"...","summary":"...","keyTakeaways":["...","...","..."],"highlightQuotes":["..."]}],"chapterSummary":{"summary":"...","carryForward":"...","avoidPhrases":["..."]},"avoidPhrases":["..."]}',
  ].join("\n");
}

async function callRealGeminiText(env, prompt, options = {}) {
  const ai = await callGeminiText(env, prompt, {
    systemPrompt: options.systemPrompt || buildSystemPrompt("initial"),
    taskType: "fortune",
    temperature: options.temperature ?? 0.72,
    maxOutputTokens: options.maxOutputTokens || INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS,
    // 45s 단락 함정 회피. 배치 JSON 폴백은 허용하되 섹션 최소치의 40% 미만이면 실패로 돌린다.
    timeoutMs: Number(env?.KARMA_DESTINY_AI_TIMEOUT_MS) || 120000,
    fallbackMinChars: Math.round(INITIAL_CONSULTATION_SECTION_MIN_LENGTH * 0.4),
    cache: buildKarmaLlmCache(env, "chapter-batch"),
  });
  const provider = clean(ai?.provider || ai?.model || "gemini");
  const isMock = /mock/i.test(provider) || ai?.isMock === true;
  if (!ai?.ok || isMock || !clean(ai?.text)) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed.", 500));
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_GENERATION_FAILED";
    error.providerDiagnostics = getProviderDiagnostics(env);
    throw error;
  }
  return { text: clean(ai.text), provider, model: clean(ai?.model) };
}

async function generateChapterBatch(env, consultation, batchIndex, logContext = {}) {
  const prompt = buildBatchPrompt(consultation, batchIndex);
  const generated = await callRealGeminiText(env, prompt, {
    temperature: 0.72,
    maxOutputTokens: INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS,
    systemPrompt: buildSystemPrompt("initial"),
  });
  let payload;
  try {
    payload = extractJsonPayload(generated.text);
  } catch (error) {
    const repaired = await callRealGeminiText(env, [
      "아래 답변을 내용 손실 없이 지정된 JSON 객체 형식으로만 다시 정리하세요.",
      "새 내용을 쓰지 말고, 이미 쓴 상담문을 장별 content, summary, keyTakeaways, highlightQuotes로만 옮기세요.",
      "",
      generated.text,
    ].join("\n"), {
      temperature: 0.35,
      maxOutputTokens: INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS,
      systemPrompt: "당신은 텍스트를 지정된 JSON 구조로 정리하는 편집자입니다. JSON 객체 하나만 반환합니다.",
    });
    payload = extractJsonPayload(repaired.text);
    generated.provider = repaired.provider || generated.provider;
    generated.model = repaired.model || generated.model;
  }
  const definitions = PREMIUM_CHAPTERS.slice(batchIndex * PREMIUM_BATCH_SIZE, (batchIndex + 1) * PREMIUM_BATCH_SIZE);
  const incoming = safeArray(payload?.chapters);
  const chapters = definitions.map((definition) => {
    const raw = incoming.find((item) => clean(item?.id) === definition.id || Number(item?.order) === definition.order || clean(item?.title) === definition.title);
    if (!raw) {
      const error = new Error(`Missing generated chapter ${definition.id}`);
      error.code = "LLM_BATCH_CHAPTER_MISSING";
      throw error;
    }
    return normalizeChapter(raw, definition);
  });
  logKarmaAi("LLM Batch Generated", { ...logContext, batchIndex, chapterIds: chapters.map((chapter) => chapter.id), provider: generated.provider, model: generated.model });
  return {
    chapters,
    chapterSummary: {
      batchIndex,
      summary: clean(payload?.chapterSummary?.summary, 800),
      carryForward: clean(payload?.chapterSummary?.carryForward, 800),
      avoidPhrases: uniq(safeArray(payload?.chapterSummary?.avoidPhrases).map((item) => clean(item, 120))).slice(0, 12),
    },
    avoidPhrases: uniq(safeArray(payload?.avoidPhrases).map((item) => clean(item, 120))).slice(0, 12),
    provider: generated.provider,
    model: generated.model,
  };
}

function pickReinforcementTargets(chapters, quality) {
  const byId = new Map(safeArray(chapters).map((chapter) => [chapter.id, chapter]));
  const explicit = [
    ...safeArray(quality.shortChapters),
    ...safeArray(quality.missingChapters),
  ].map((id) => PREMIUM_CHAPTERS.find((definition) => definition.id === id)).filter(Boolean);
  if (explicit.length) return explicit.slice(0, PREMIUM_BATCH_SIZE);
  return [...PREMIUM_CHAPTERS]
    .sort((a, b) => countUserVisibleChars(formatChapterContent(byId.get(a.id) || {})) - countUserVisibleChars(formatChapterContent(byId.get(b.id) || {})))
    .slice(0, PREMIUM_BATCH_SIZE);
}

async function reinforcePremiumReport(env, consultation, chapters, quality, attempt, logContext = {}) {
  const targets = pickReinforcementTargets(chapters, quality);
  const chapterMap = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const prompt = [
    "현재 운명의 업 상담 결과가 목표 분량보다 부족하다. 기존 내용을 반복하지 말고, 구체적 사례, 시기별 흐름, 관계 패턴, 현실 행동 전략, 주의할 선택, 회복 루틴을 추가하여 부족한 분량을 보강하라.",
    "",
    "[사용자 입력]",
    JSON.stringify(buildPublicUserInput(consultation)),
    "",
    "[보강해야 할 장]",
    JSON.stringify(targets.map((definition) => ({
      id: definition.id,
      order: definition.order,
      title: definition.title,
      required: definition.required,
      currentCharCount: countUserVisibleChars(formatChapterContent(chapterMap.get(definition.id) || {})),
    }))),
    "",
    "[현재 품질 점검]",
    JSON.stringify({
      totalCharCount: quality.totalCharCount,
      minLength: quality.minLength,
      shortChapters: quality.shortChapters,
      repeatedPhraseWarnings: quality.repeatedPhraseWarnings,
      genericAdviceWarnings: quality.genericAdviceWarnings,
    }),
    "",
    "각 supplement content는 기존 장에 이어 붙일 수 있는 새 산문이어야 합니다. 이미 쓴 문단을 다시 쓰지 말고, 더 구체적인 사례와 선택 기준을 추가하세요.",
    "반환은 JSON 객체 하나만 허용합니다.",
    '{"supplements":[{"id":"chapter-01","content":"...","summary":"...","keyTakeaways":["...","...","..."],"highlightQuotes":["..."]}],"avoidPhrases":["..."]}',
  ].join("\n");
  const generated = await callRealGeminiText(env, prompt, {
    temperature: 0.66,
    maxOutputTokens: INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS,
    systemPrompt: buildSystemPrompt("initial"),
  });
  const payload = extractJsonPayload(generated.text);
  const supplements = safeArray(payload?.supplements);
  const merged = chapters.map((chapter) => {
    const supplement = supplements.find((item) => clean(item?.id) === chapter.id);
    if (!supplement) return chapter;
    const definition = PREMIUM_CHAPTERS[chapter.order - 1] || chapter;
    const content = [chapter.content, cleanForbiddenResult(clean(supplement.content, 8000))].filter(Boolean).join("\n\n");
    const keyTakeaways = safeArray(supplement.keyTakeaways).length
      ? safeArray(supplement.keyTakeaways).map((item) => cleanForbiddenResult(clean(item, 220))).filter(Boolean).slice(0, 3)
      : chapter.keyTakeaways;
    const mergedChapter = {
      ...chapter,
      content,
      summary: cleanForbiddenResult(clean(supplement.summary || chapter.summary, 1200)),
      keyTakeaways: keyTakeaways.length >= 3 ? keyTakeaways : chapter.keyTakeaways,
      highlightQuotes: uniq([...safeArray(chapter.highlightQuotes), ...safeArray(supplement.highlightQuotes)].map((item) => cleanForbiddenResult(clean(item, 180)))).slice(0, 3),
    };
    return {
      ...mergedChapter,
      charCount: countUserVisibleChars(formatChapterContent({ ...mergedChapter, title: definition.title })),
    };
  });
  logKarmaAi("LLM Reinforcement Generated", { ...logContext, attempt, targetIds: targets.map((target) => target.id), provider: generated.provider, model: generated.model });
  return {
    chapters: merged,
    avoidPhrases: uniq(safeArray(payload?.avoidPhrases).map((item) => clean(item, 120))).slice(0, 12),
    provider: generated.provider,
    model: generated.model,
  };
}

async function applyUsageAfterSuccessfulGeneration({ request, env, auth, consultation, pricing }) {
  const billingState = asObject(consultation.billingState);
  if (billingState.deferredUsage) {
    await callDeferredUsageRoute({
      request,
      env,
      path: "apply",
      idempotencyKey: consultation.idempotencyKey,
      sessionId: consultation.id,
    });
  } else if (!billingState.usageAlreadyApplied && consultation.accessType === "pass") {
    await applyUsageOnce({ userId: auth.userId, sessionId: consultation.id, accessType: consultation.accessType, pricing });
  } else if (!billingState.usageAlreadyApplied && isMonthlyCreditAccess(consultation.accessType)) {
    const gateError = new Error("monthly credit must be confirmed by common billing gate");
    gateError.code = "MONTHLY_CREDIT_GATE_REQUIRED";
    throw gateError;
  } else {
    await KarmaDestinyAiConsultation.updateOne(
      { id: consultation.id, usageAppliedAt: null },
      { $set: { usageAppliedAt: new Date() } },
    );
  }
}

async function cancelDeferredUsageIfNeeded({ request, env, consultation, error }) {
  const billingState = asObject(consultation?.billingState);
  if (!billingState.deferredUsage || consultation?.usageAppliedAt) return;
  await callDeferredUsageRoute({
    request,
    env,
    path: "cancel",
    idempotencyKey: consultation.idempotencyKey,
    sessionId: consultation.id,
    code: clean(error?.code || "LLM_GENERATION_FAILED", 80),
    message: clean(error?.message || error, 500),
  });
}

function buildSummaryCards(integratedResult = {}) {
  const synthesis = asObject(integratedResult.synthesis);
  const themes = safeArray(synthesis.karmicThemes).map((item) => clean(item)).filter(Boolean);
  const patterns = safeArray(synthesis.commonPatterns).map((item) => clean(item)).filter(Boolean);
  const keywordCandidates = uniq([...themes, ...patterns]
    .map((item) => clean(String(item).replace(/[.!?。]/g, "").split(/[·ㆍ,，:：/]/)[0], 28))
    .filter(Boolean));
  const keywords = uniq([...keywordCandidates, "반복 선택", "관계의 매듭", "재능의 숙제"]).slice(0, 3);
  return {
    keywords,
    repeatingPattern: clean(patterns[0], 180) || "익숙한 감정 반응이 관계와 일의 선택에서 되풀이되는 흐름",
    currentTask: clean(synthesis.currentLifeTask, 180) || clean(themes[0], 180) || "같은 장면에서 한 번 더 느린 선택을 연습하는 일",
  };
}

async function applyUsageOnce({ userId, sessionId, accessType, pricing }) {
  const existing = await KarmaDestinyAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;

  await KarmaDestinyAiConsultation.updateOne(
    { id: sessionId, usageAppliedAt: null },
    { $set: { usageAppliedAt: new Date() } },
  );
  return true;
}

function publicSession(doc) {
  const chapters = safeArray(doc.chapters).map((chapter) => ({
    id: clean(chapter.id, 40),
    order: Number(chapter.order || 0),
    title: clean(chapter.title, 120),
    content: clean(chapter.content, 14000),
    summary: clean(chapter.summary, 1200),
    keyTakeaways: safeArray(chapter.keyTakeaways).map((item) => clean(item, 220)).filter(Boolean).slice(0, 3),
    highlightQuotes: safeArray(chapter.highlightQuotes).map((item) => clean(item, 180)).filter(Boolean).slice(0, 3),
    charCount: Number(chapter.charCount || countUserVisibleChars(formatChapterContent(chapter))),
  })).sort((a, b) => a.order - b.order);
  const assistantMessages = safeArray(doc.messages).filter((message) => message.role === "assistant");
  const generatedAt = doc.generatedAt || assistantMessages[assistantMessages.length - 1]?.createdAt || null;
  return {
    ok: true,
    sessionId: clean(doc.id),
    reportId: clean(doc.reportId || doc.id),
    attemptId: clean(doc.attemptId || doc.idempotencyKey),
    accessType: clean(doc.accessType),
    status: clean(doc.status),
    generatedAt,
    totalCharCount: Number(doc.totalCharCount || (chapters.length ? countUserVisibleChars(formatChaptersAsConsultationText(chapters)) : 0)),
    userInput: buildPublicUserInput(doc),
    integratedResult: doc.integratedResult || null,
    summaryCards: doc.summaryCards || null,
    chapters,
    finalLetter: clean(doc.finalLetter, 14000),
    qualityCheck: doc.qualityCheck ? {
      passed: doc.qualityCheck.passed === true || doc.qualityCheck.ok === true,
      totalCharCount: Number(doc.qualityCheck.totalCharCount || doc.qualityCheck.totalChars || 0),
      chapterCount: Number(doc.qualityCheck.chapterCount || 0),
      repeatedPhraseWarnings: safeArray(doc.qualityCheck.repeatedPhraseWarnings).slice(0, 8),
      promptLeakDetected: doc.qualityCheck.promptLeakDetected === true,
    } : null,
    generationProgress: doc.generationProgress || buildGenerationProgress(doc),
    messages: safeArray(doc.messages).map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
  };
}

async function handleEnsureAccess(request, env) {
  const route = "/api/karma-destiny-ai/ensure-access";
  logKarmaAi("LLM Prepare Start", safeLogPayload({ route, env }));
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logKarmaAi("LLM Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logKarmaAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, validation: "failed", env, error: new Error(normalized.message) }), "warn");
    return invalidInput(normalized.message);
  }
  logKarmaAi("LLM Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  const pricing = getPricing();
  logKarmaAi("LLM Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "checking", env }));
  if (isAdmin(auth)) {
    logKarmaAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "admin", env }));
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
  // 풀 초기화(MongoPoolClearedError) 순간에도 접근 판정 read가 1회 실패로 죽지 않도록 재시도.
  const user = await withMongoRetry(env, () => loadBillingUser(auth.userId));
  if (!user) return loginRequired();

  const access = await withMongoRetry(env, () => resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash, body }));
  if (access.ok) {
    logKarmaAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
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
        deferredUsage: access.deferredUsage === true,
      }),
      accessType: access.accessType,
    });
  }

  logKarmaAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "payment_required", env }));
  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    message: "운명의 업 전문가 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
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
      deferredUsage: payload.deferredUsage === true,
    };
  }

  const billing = await withMongoRetry(env, () => findBillingGateEvidence({ userId: auth.userId, idempotencyKey, body }));
  if (billing?.ok) return {
    ...billing,
    usageAlreadyApplied: billing.usageAlreadyApplied === true,
  };

  return {
    ok: false,
    reason: "PAYMENT_REQUIRED",
    message: "상담 생성 전 결제 확인이 필요합니다.",
    code: "START_ACCESS_CONFIRMATION_REQUIRED",
  };
}

function cloneBillingHeaders(request) {
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  headers.delete("content-length");
  return headers;
}

async function callDeferredUsageRoute({ request, env, path, idempotencyKey, sessionId, code = "", message = "" }) {
  const url = new URL(request.url);
  url.pathname = `/api/billing/coin-gate/deferred/${path}`;
  url.search = "";
  const response = await handleBillingRoutes(new Request(url.toString(), {
    method: "POST",
    headers: cloneBillingHeaders(request),
    body: JSON.stringify({
      featureKey: FEATURE_KEY,
      serviceType: "karma-ai-consultation",
      consultationType: "destinyKarma",
      reason: ORDER_NAME,
      requestId: idempotencyKey,
      idempotencyKey,
      sessionId,
      resultId: sessionId,
      code,
      message,
    }),
  }), env);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    const error = new Error(clean(payload?.message || payload?.error?.message || `Deferred usage ${path} failed.`, 500));
    error.code = clean(payload?.error?.code || `DEFERRED_USAGE_${path.toUpperCase()}_FAILED`, 80);
    throw error;
  }
  return payload?.data || payload;
}

async function handleStart(request, env) {
  const route = "/api/karma-destiny-ai/start";
  logKarmaAi("LLM Generate Start", safeLogPayload({ route, env }));
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logKarmaAi("LLM Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logKarmaAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, validation: "failed", env, error: new Error(normalized.message) }), "warn");
    return invalidInput(normalized.message);
  }
  logKarmaAi("LLM Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  await connectDb(env);
  const pricing = getPricing();
  logKarmaAi("LLM Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "checking", env }));
  const access = await resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey });
  if (!access.ok) {
    if (access.reason === "LOGIN_REQUIRED") return loginRequired();
    if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
    return paymentVerifyFailed();
  }
  logKarmaAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
  logKarmaAi("LLM Payment Guard Passed", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));

  const existing = await withMongoRetry(env, () => KarmaDestinyAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean());
  if (existing && clean(existing.inputHash) !== normalized.inputHash) {
    return invalidInput("같은 요청 키로 다른 상담 정보를 사용할 수 없습니다.", 409);
  }
  if (existing?.status === "completed") return json(publicSession(existing));

  const sessionId = existing?.id || `kdai_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}_${randomToken(8)}`;
  const now = new Date();
  const seed = {
    id: sessionId,
    reportId: clean(existing?.reportId || sessionId, 120),
    attemptId: idempotencyKey,
    userId: clean(auth.userId),
    birthInfo: normalized.input.birthInfo,
    topic: normalized.input.topic,
    userQuestion: normalized.input.userQuestion,
    accessType: access.accessType,
    paymentId: clean(access.paymentId, 160),
    billingRequestId: clean(access.billingRequestId || idempotencyKey, 180),
    billingState: {
      deferredUsage: access.deferredUsage === true,
      usageAlreadyApplied: access.usageAlreadyApplied === true,
      paymentId: clean(access.paymentId, 160),
      billingRequestId: clean(access.billingRequestId || idempotencyKey, 180),
      preparedAt: now.toISOString(),
    },
    messages: existing?.status === "generating" ? safeArray(existing.messages) : [],
    chapters: existing?.status === "generating" ? safeArray(existing.chapters) : [],
    chapterSummaries: existing?.status === "generating" ? safeArray(existing.chapterSummaries) : [],
    finalLetter: existing?.status === "generating" ? clean(existing.finalLetter, 14000) : "",
    generatedAt: null,
    totalCharCount: existing?.status === "generating" ? Number(existing.totalCharCount || 0) : 0,
    qualityCheck: null,
    generationProgress: buildGenerationProgress(existing || {}, {
      chapters: existing?.status === "generating" ? safeArray(existing.chapters) : [],
      stageLabel: GENERATION_STAGES[0],
      activeBatchIndex: Math.floor((existing?.status === "generating" ? safeArray(existing.chapters).length : 0) / PREMIUM_BATCH_SIZE),
      lockToken: "",
      lockedAt: null,
    }),
    idempotencyKey,
    inputHash: normalized.inputHash,
    status: "generating",
    generationError: null,
  };

  try {
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
          return json(publicSession(duplicate || seed), { status: 202 });
        }
        throw error;
      }
    }

    logKarmaAi("LLM Fortune Data Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
    const integratedResult = existing?.integratedResult || await buildKarmaDestinyIntegratedResult(env, normalized.input.birthInfo);
    if (!integratedResult?.saju && !integratedResult?.westernAstrology && !integratedResult?.vedicAstrology) {
      const calculationError = new Error(CALCULATION_ERROR_MESSAGE);
      calculationError.code = "CALCULATION_ERROR";
      throw calculationError;
    }
    logKarmaAi("LLM Fortune Data Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
    const summaryCards = existing?.summaryCards || buildSummaryCards(integratedResult);
    const prepared = await KarmaDestinyAiConsultation.findOneAndUpdate(
      { id: sessionId },
      {
        $set: {
          status: "generating",
          integratedResult,
          summaryCards,
          generationProgress: buildGenerationProgress({ ...seed, integratedResult, summaryCards }),
          generationError: null,
        },
      },
      { new: true },
    ).lean();
    return json(publicSession(prepared), { status: 202 });
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
    logKarmaAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error }), "error");
    if (access.deferredUsage) {
      await cancelDeferredUsageIfNeeded({
        request,
        env,
        consultation: { ...seed, usageAppliedAt: null },
        error,
      }).catch((restoreError) => {
        logKarmaAi("LLM Refund Or Restore", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error: restoreError }), "warn");
      });
    }
    logKarmaAi("LLM Refund Or Restore", {
      ...safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error }),
      restoreMode: access.deferredUsage ? "deferred_usage_cancelled_or_pending" : "same_request_id_retry_preserves_billing_evidence",
    }, "warn");
    if (clean(error?.code) === "CALCULATION_ERROR") {
      return json({ ok: false, reason: "CALCULATION_ERROR", message: CALCULATION_ERROR_MESSAGE }, { status: 422 });
    }
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
}

async function handleGenerateBatch(request, env) {
  const route = "/api/karma-destiny-ai/generate-batch";
  const body = await readJson(request);
  const sessionId = clean(body?.sessionId || body?.reportId || body?.attemptId || body?.idempotencyKey, 180);
  if (!sessionId) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  await connectDb(env);
  const pricing = getPricing();
  let consultation = await KarmaDestinyAiConsultation.findOne(buildResultLookup(sessionId, auth)).lean();
  if (!consultation) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);
  if (consultation.status === "completed") return json(publicSession(consultation));
  if (consultation.status === "generation_failed") {
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE, sessionId: consultation.id, status: consultation.status }, { status: 409 });
  }
  if (!consultation.integratedResult) {
    return json({ ok: false, reason: "CALCULATION_ERROR", message: CALCULATION_ERROR_MESSAGE }, { status: 422 });
  }

  const lock = asObject(consultation.generationProgress);
  const lockAgeMs = lock.lockedAt ? Date.now() - new Date(lock.lockedAt).getTime() : Number.POSITIVE_INFINITY;
  if (clean(lock.lockToken) && lockAgeMs >= 0 && lockAgeMs < PREMIUM_BATCH_LOCK_TTL_MS) {
    return json(publicSession(consultation), { status: 202 });
  }

  const lockToken = randomToken(12);
  const currentChapters = safeArray(consultation.chapters);
  const batchIndex = Math.min(Math.floor(currentChapters.length / PREMIUM_BATCH_SIZE), Math.ceil(PREMIUM_CHAPTERS.length / PREMIUM_BATCH_SIZE) - 1);
  await KarmaDestinyAiConsultation.updateOne(
    { id: consultation.id, userId: clean(auth.userId), status: "generating" },
    {
      $set: {
        generationProgress: buildGenerationProgress(consultation, {
          chapters: currentChapters,
          activeBatchIndex: batchIndex,
          lockToken,
          lockedAt: new Date(),
          stageLabel: GENERATION_STAGES[Math.min(batchIndex + 1, GENERATION_STAGES.length - 1)],
        }),
      },
    },
  );
  consultation = await KarmaDestinyAiConsultation.findOne({ id: consultation.id, userId: clean(auth.userId) }).lean();

  const logContext = safeLogPayload({
    route,
    requestId: consultation.idempotencyKey,
    body,
    normalized: {
      input: {
        serviceType: "karma-ai-consultation",
        focusArea: "batch_generation",
        question: consultation.userQuestion,
        birthInfo: consultation.birthInfo,
      },
    },
    access: consultation.accessType,
    env,
  });

  try {
    let chapters = safeArray(consultation.chapters).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    if (chapters.length < PREMIUM_CHAPTERS.length) {
      const generated = await generateChapterBatch(env, consultation, batchIndex, logContext);
      const generatedIds = new Set(generated.chapters.map((chapter) => chapter.id));
      chapters = [
        ...chapters.filter((chapter) => !generatedIds.has(chapter.id)),
        ...generated.chapters,
      ].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
      const chapterSummaries = [
        ...safeArray(consultation.chapterSummaries).filter((item) => Number(item?.batchIndex) !== batchIndex),
        generated.chapterSummary,
      ].sort((a, b) => Number(a?.batchIndex || 0) - Number(b?.batchIndex || 0));
      const avoidPhrases = uniq([
        ...safeArray(consultation.generationProgress?.avoidPhrases),
        ...generated.avoidPhrases,
        ...safeArray(generated.chapterSummary?.avoidPhrases),
      ]).slice(0, 24);

      consultation = await KarmaDestinyAiConsultation.findOneAndUpdate(
        { id: consultation.id, userId: clean(auth.userId) },
        {
          $set: {
            chapters,
            chapterSummaries,
            totalCharCount: countUserVisibleChars(formatChaptersAsConsultationText(chapters)),
            generationProgress: {
              ...buildGenerationProgress(consultation, {
                chapters,
                activeBatchIndex: Math.floor(chapters.length / PREMIUM_BATCH_SIZE),
                lockToken: "",
                lockedAt: null,
                stageLabel: chapters.length >= PREMIUM_CHAPTERS.length ? "최종 품질을 확인하는 중" : GENERATION_STAGES[Math.min(batchIndex + 1, GENERATION_STAGES.length - 1)],
              }),
              avoidPhrases,
            },
            llmMeta: { provider: generated.provider, model: generated.model, updatedAt: new Date().toISOString() },
          },
        },
        { new: true },
      ).lean();
    }

    chapters = safeArray(consultation.chapters).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    if (chapters.length < PREMIUM_CHAPTERS.length) {
      return json(publicSession(consultation), { status: 202 });
    }

    let quality = validatePremiumReportQuality(chapters);
    let provider = clean(consultation.llmMeta?.provider);
    let model = clean(consultation.llmMeta?.model);
    for (let attempt = 1; attempt <= PREMIUM_REINFORCEMENT_MAX_ATTEMPTS && !quality.ok; attempt += 1) {
      const reinforced = await reinforcePremiumReport(env, consultation, chapters, quality, attempt, logContext);
      chapters = reinforced.chapters;
      provider = reinforced.provider || provider;
      model = reinforced.model || model;
      quality = validatePremiumReportQuality(chapters);
    }

    if (!quality.ok) {
      const error = new Error("Karma destiny consultation did not meet premium quality requirements.");
      error.code = quality.tooShort ? "LLM_RESULT_TOO_SHORT" : "LLM_RESULT_QUALITY_FAILED";
      error.quality = quality;
      throw error;
    }

    await applyUsageAfterSuccessfulGeneration({ request, env, auth, consultation, pricing });
    const completedAt = new Date();
    const assistantContent = formatChaptersAsConsultationText(chapters);
    const finalLetter = clean(chapters.find((chapter) => chapter.id === "chapter-16")?.content, 14000);
    const completed = await KarmaDestinyAiConsultation.findOneAndUpdate(
      { id: consultation.id, userId: clean(auth.userId) },
      {
        $set: {
          status: "completed",
          chapters,
          finalLetter,
          generatedAt: completedAt,
          totalCharCount: quality.totalCharCount,
          qualityCheck: quality,
          generationProgress: buildGenerationProgress({ ...consultation, status: "completed" }, { chapters, status: "completed", percent: 100, lockToken: "", lockedAt: null, stageLabel: "최종 편지를 봉인했습니다" }),
          messages: [
            { role: "user", content: `${consultation.topic}${consultation.userQuestion ? `\n${consultation.userQuestion}` : ""}`, createdAt: consultation.createdAt || completedAt },
            { role: "assistant", content: assistantContent, createdAt: completedAt },
          ],
          usageAppliedAt: completedAt,
          llmMeta: { provider, model, completedAt: completedAt.toISOString(), deferredUsageApplied: asObject(consultation.billingState).deferredUsage === true },
          generationError: null,
        },
      },
      { new: true },
    ).lean();
    logKarmaAi("LLM Generate Success", { ...logContext, provider, model, totalCharCount: quality.totalCharCount, chapterCount: chapters.length });
    return json(publicSession(completed));
  } catch (error) {
    await KarmaDestinyAiConsultation.updateOne(
      { id: consultation.id, userId: clean(auth.userId) },
      {
        $set: {
          status: "generation_failed",
          qualityCheck: error?.quality || null,
          generationProgress: {
            ...buildGenerationProgress(consultation, { chapters: safeArray(consultation.chapters), lockToken: "", lockedAt: null }),
            lockToken: "",
            lockedAt: null,
          },
          generationError: {
            code: clean(error?.code || "LLM_GENERATION_FAILED", 80),
            message: clean(error?.message || error, 500),
            at: new Date().toISOString(),
          },
        },
      },
    ).catch(() => {});
    await cancelDeferredUsageIfNeeded({ request, env, consultation, error }).catch((restoreError) => {
      logKarmaAi("LLM Refund Or Restore", safeLogPayload({ route, requestId: consultation.idempotencyKey, body, access: consultation.accessType, env, error: restoreError }), "warn");
    });
    logKarmaAi("LLM Error", safeLogPayload({ route, requestId: consultation.idempotencyKey, body, access: consultation.accessType, env, error }), "error");
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE, sessionId: consultation.id, status: "generation_failed" }, { status: 503 });
  }
}

async function handleResult(request, env, path) {
  const url = new URL(request.url);
  const pathId = path.startsWith("/result/") ? decodeURIComponent(path.slice("/result/".length)) : "";
  const identifier = clean(pathId || url.searchParams.get("sessionId") || url.searchParams.get("reportId") || url.searchParams.get("attemptId") || url.searchParams.get("idempotencyKey"), 180);
  if (!identifier) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);

  // 폴링은 이미 인가된 세션의 결과 조회다. 인증 판정에서 일시적 DB 장애가 나면 하드 503으로 끊지 말고
  // 재시도 가능하다는 신호를 실어 보내 클라가 폴링을 이어가게 한다(nakshatra/neo와 동일한 완충).
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
  if (!auth) return loginRequired();

  await connectDb(env);
  const consultation = await KarmaDestinyAiConsultation.findOne(buildResultLookup(identifier, auth)).lean();
  if (!consultation) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);
  const statusCode = consultation.status === "generating" ? 202 : consultation.status === "generation_failed" ? 409 : 200;
  return json(publicSession(consultation), { status: statusCode });
}

async function handleMessage(request, env) {
  const route = "/api/karma-destiny-ai/message";
  const body = await readJson(request);
  const sessionId = clean(body?.sessionId || body?.consultationId, 120);
  const message = clean(body?.message || body?.question, 1200);
  if (!sessionId) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);
  if (message.length < 2) return invalidInput("추가 질문을 입력해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  await connectDb(env);
  const consultation = await KarmaDestinyAiConsultation.findOne({
    id: sessionId,
    userId: clean(auth.userId),
    status: "completed",
  }).lean();
  if (!consultation) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);

  try {
    const logContext = safeLogPayload({
      route,
      requestId: sessionId,
      body: { ...body, question: message },
      normalized: {
        input: {
          serviceType: "karma-ai-consultation",
          focusArea: "follow_up",
          question: message,
          birthInfo: consultation.birthInfo,
        },
      },
      access: consultation.accessType,
      env,
    });
    const generated = await generateConsultationText(env, buildFollowUpPrompt(consultation, message), {
      mode: "follow_up",
      minLength: 180,
      maxOutputTokens: 4600,
      logContext,
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
    logKarmaAi("LLM Generate Success", { ...logContext, provider: generated.provider, model: generated.model });
    return json(publicSession(updated));
  } catch (error) {
    logKarmaAi("LLM Error", safeLogPayload({ route, requestId: sessionId, body, access: "follow_up", env, error }), "error");
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
}

export async function handleKarmaDestinyAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/karma-destiny-ai");

  try {
    if (method === "POST" && path === "/ensure-access") return await handleEnsureAccess(request, env);
    if (method === "POST" && path === "/start") return await handleStart(request, env);
    if (method === "POST" && path === "/generate-batch") return await handleGenerateBatch(request, env);
    if (method === "GET" && (path === "/result" || path.startsWith("/result/"))) return await handleResult(request, env, path);
    if (method === "POST" && path === "/message") return await handleMessage(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[karma-destiny-ai]", clean(error?.code || error?.message || error, 500));
    logKarmaAi("LLM Error", safeLogPayload({ route: "/api/karma-destiny-ai", env, error }), "error");
    // 풀 초기화 버스트/인증 조회 중 일시 DB 장애는 재시도 신호와 함께 503으로 — 하드 500 방지(전 AI 라우트 정본).
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

export const __karmaDestinyAiTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  normalizeConsultationInput,
  resolveStartAccess,
  buildFirstPrompt,
  buildSystemPrompt,
  cleanForbiddenResult,
  parseKarmaConsultationSections,
  validateInitialConsultationQuality,
  validatePremiumReportQuality,
  formatChaptersAsConsultationText,
  PREMIUM_CHAPTERS,
  buildKarmaDestinyAiMockConsultation,
};
