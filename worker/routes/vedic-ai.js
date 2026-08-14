import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest, isAuthDbInfraError, peekAccessTokenUserId } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, isTransientMongoError, mongoose, withMongoRetry } from "../lib/db.js";
import { clampSyncLlmTimeoutMs } from "../lib/sync-llm-timeout.js";
import { MonthlyCreditLedger, Payment, PointHistory, User, VedicAiConsultation } from "../lib/models.js";
import { restoreMonthlyCreditLot } from "../lib/monthly-credit-store.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { resolveFeatureAccessPolicy } from "../lib/entitlement-policy.js";
import { cmsPromptText } from "../lib/cms-prompts.js";
import { callGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { calculateVedicAiChart } from "../lib/vedic-ai-chart.js";
import { basisGroup, basisItem, basisStage, buildAnalysisBasisPayload } from "../lib/analysis-basis-contract.js";
import {
  buildEvidenceRuleLines,
  buildReasoningSectionRuleLines,
  buildReasoningSectionSchema,
} from "../lib/fortune-reasoning-contract.js";
import { buildVedicKnowledgeContext } from "../lib/vedic-ai-knowledge.js";

const SERVICE_KEY = "vedic-ai";
const FEATURE_KEY = "vedic-ai-consultation";
const PRODUCT_ID = "vedic-ai-consultation";
const CONSULTATION_TYPE = "vedic";
const ACCESS_TOKEN_TYPE = "vedic-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "베다점 전문가 상담";
const AMOUNT_KRW = 30000;
const COIN_PRICE = 300;
const MIN_INITIAL_READING_CHARS = 15000;
const MAX_INITIAL_READING_CHARS = 23000;
const MAX_ASSISTANT_TEXT_CHARS = 60000;
// ── 첫 상담을 나눠 쓰는 단위 ────────────────────────────────────────────────
//
// 🔴 예전에는 4개 읽기 섹션 + 근거 5흐름을 **한 번의 호출**로 요구했다(33,000토큰). 그런데
//    모델은 한 호출에서 6천자 근처면 스스로 멈춘다 — 그래서 "한 섹션당 2,500~5,000자"라고
//    적어 둔 프롬프트가 실제로는 전체 6천자로 수렴했고, 요구 하한 10,000자는 거의 매번
//    total_body_too_short → 전면 재작성 repair 를 돌렸다(입력에 초안을 통째로 다시 넣는 호출).
//    호출당 목표를 모델이 한 번에 채우는 크기로 낮추면 그 고리가 사라진다.
//    (같은 결론의 선례: worker/routes/astrology-ai.js, worker/lib/saju-ai-prompt.js)
//
// 🔴 분량 판정(validateConsultationQuality)은 READING_SECTION_KEYS 4개의 body 만 센다.
//    근거 흐름 그룹은 화면에는 나가지만 분량 합계에는 들어가지 않는다 — 그래서 요구 하한
//    15,000자는 **읽기 섹션 4개만으로** 채워야 하고, 그룹 minChars 합도 그 기준으로 잡았다.
const VEDIC_GROUP_MAX_OUTPUT_TOKENS = 11000;
const VEDIC_READING_GROUP_MIN_CHARS = 3800;
const VEDIC_READING_GROUP_MAX_CHARS = 5600;
const VEDIC_REASONING_GROUP_KEY = "reasoning_flows";
// 상담문은 차트 요소별 나열이 아니라 삶의 주제 네 갈래로 쓴다.
// 요소별 7섹션 시절에는 라그나·라시·그라하를 각각 설명하느라 "요소 설명서"가 됐고,
// 나바암샤(D9)는 데이터로만 들어가 관계·후반기 해석이 얕았다.
const READING_SECTION_KEYS = [
  "karma_origin",
  "dharma_artha",
  "relationship_soul",
  "dasha_upaya",
];
const REQUIRED_SECTION_LABELS = Object.freeze({
  karma_origin: "카르마의 기원",
  dharma_artha: "물질적 성취와 다르마",
  relationship_soul: "인연과 영혼의 파트너",
  dasha_upaya: "현재의 다샤 흐름과 우파야",
});
// 구 7섹션 키 — 재시도/repair 응답이 옛 형식으로 돌아와도 일관성 검증이 빈 문자열을 보고
// 오탐을 쌓지 않도록 본문 조회의 폴백으로만 남긴다(필수 섹션 목록에는 넣지 않는다).
const LEGACY_SECTION_KEYS = Object.freeze({
  karma_origin: ["lagna", "rashi", "nakshatra"],
  dharma_artha: ["graha", "bhava"],
  relationship_soul: [],
  dasha_upaya: ["dasha", "vimshottari_dasha"],
});

/**
 * 첫 상담의 병렬 생성 단위. 읽기 섹션 4개는 각각 자기 호출을 갖고, 근거 5흐름은 한 그룹으로 묶는다
 * (근거 흐름은 fortune-reasoning-contract 의 공용 스키마/규칙을 그대로 쓰므로 쪼개지 않는다).
 *
 * scores 는 첫 그룹만 낸다 — 그룹마다 점수를 매기면 병합에서 어느 쪽을 쓸지 임의로 정하게 된다.
 */
const VEDIC_SECTION_GROUPS = Object.freeze(READING_SECTION_KEYS.map((key, index) => Object.freeze({
  key,
  sectionKeys: Object.freeze([key]),
  label: REQUIRED_SECTION_LABELS[key],
  minChars: VEDIC_READING_GROUP_MIN_CHARS,
  maxChars: VEDIC_READING_GROUP_MAX_CHARS,
  includeScores: index === 0,
  includeReasoning: false,
})).concat([Object.freeze({
  key: VEDIC_REASONING_GROUP_KEY,
  sectionKeys: Object.freeze([]),
  label: "해석 근거 흐름",
  // 분량 합계에 들어가지 않는 그룹이라 목표는 화면에서 읽을 만한 최소치로만 잡는다.
  minChars: 2600,
  maxChars: 4200,
  includeScores: false,
  includeReasoning: true,
})]));
const VEDIC_RESULT_ONLY_SYSTEM_PROMPT = `
당신은 파라샤라 전통을 따르는 조티쉬(Jyotish) 베다 점성술 상담가입니다.
천체 위치, 라그나, 라시, 바바, 나크샤트라, 다샤를 직접 계산하지 않습니다.
반드시 제공된 VedicChartResult JSON의 계산값만 해석합니다.
JSON에 없는 행성 위치, 하우스, 나크샤트라, 파다, 다샤 기간은 지어내지 않습니다.
결과는 JSON만 반환하고, 마크다운 코드블록이나 설명 문장을 JSON 밖에 쓰지 않습니다.
sections의 각 body 안에서는 문단 사이를 빈 줄로 구분하고, 핵심 문구만 **굵게** 표시합니다. 필요할 때만 '-' 목록을 쓰고, 그 외 마크다운(제목 #, 코드블록, 표)은 쓰지 않습니다.
예언을 단정하지 말고 좋고 나쁨보다 어떤 삶의 주제가 강조되는지 초보자도 이해할 수 있는 한국어로 풉니다.
라후와 케투는 물리 행성이 아니라 달의 노드로 설명합니다.

해석의 기준은 다음 네 축이며, 용어를 처음 듣는 사람도 따라올 수 있게 매번 한 줄로 뜻을 풀어 씁니다.
- 라그나(상승궁): 차트를 읽는 기준 자리. 그 사람의 본질과 인생 전반의 방향을 여기서부터 봅니다.
- 나바암샤(D9): 라시(D1)가 드러난 삶이라면 D9는 내면의 잠재력, 인생 후반기, 결혼과 파트너십의 실제 결입니다. D1과 D9가 어긋날 때 그 차이 자체가 해석의 핵심이므로 두 차트를 대조해 서술합니다.
- 나크샤트라: 달이 머무는 성수로 심리적 기질과 業(카르마)의 결을 읽습니다. 운명론으로 단정하지 말고 되풀이되는 경향으로 서술합니다.
- 빔쇼타리 다샤: 지금 적용 중인 마하다샤·안타르다샤 로드를 근거로 시기를 말합니다. 기간이 언제 끝나는지 함께 밝혀 시의성을 잃지 않게 합니다.

우파야(개운법)는 현재 다샤 로드와 품위가 약한 그라하에 근거해, 오늘 실제로 실행할 수 있는 행위(생활 습관, 관계에서의 태도, 시간의 배분, 전통적으로 그 그라하에 연결된 색·요일·보시)로 제시합니다.
부적 판매, 유료 의식, 공포를 자극하는 경고, 의료·법률·투자 확정 조언은 쓰지 않습니다.
`.trim();
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
];

const MESSAGES = {
  login: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  paymentRequired: "이용권 또는 결제가 필요한 상담입니다. 결제 정보를 확인해 주세요.",
  paymentVerifyFailed: "결제 정보를 확인하지 못했어요. 결제나 이용권은 차감되지 않았습니다.",
  invalidInput: "베다점 상담에 필요한 정보가 부족해요. 생년월일, 성별, 출생시간 정보를 다시 확인해 주세요.",
  birthTimeRequired: "베다점은 출생시간이 중요해요. 출생시간을 입력하거나 ‘출생시간 모름’을 선택해 주세요.",
  customQuestionRequired: "직접 질문을 선택했다면 지금 가장 궁금한 내용을 함께 적어 주세요.",
  placeInvalid: "라그나와 바바 계산에는 출생지 좌표가 필요해요. 도시명을 다시 확인해 주세요.",
  calculationFailed: "베다 차트를 계산하는 중 문제가 발생했어요. 입력한 출생 정보를 다시 확인해 주세요.",
  serverFailed: "베다점 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  llmFailed: "전문가 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
};

/** 관리자 CMS 기본값 노출용(worker/lib/cms-prompt-defaults.js). */
export function getDefaultSystemPrompt() {
  return VEDIC_RESULT_ONLY_SYSTEM_PROMPT;
}

const SYSTEM_PROMPT = VEDIC_RESULT_ONLY_SYSTEM_PROMPT;

const ALL_SIGNS_KO = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const GRAHA_KO_MAP = { Sun: "태양", Moon: "달", Mars: "화성", Mercury: "수성", Jupiter: "목성", Venus: "금성", Saturn: "토성", Rahu: "라후", Ketu: "케투" };

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

function optionalCoordinate(value) {
  const text = clean(value, 40);
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function normalizeBirthPlace(body = {}, sourceBirth = {}) {
  const rawBirthPlace = body.birthPlace ?? sourceBirth.birthPlace ?? {};
  const src = rawBirthPlace && typeof rawBirthPlace === "object" ? rawBirthPlace : {};
  const label = typeof rawBirthPlace === "string"
    ? clean(rawBirthPlace, 120)
    : clean(src.label || src.displayName || src.place || src.city || "", 120);
  const [cityFromLabel = "", countryFromLabel = ""] = label.split(",").map((item) => item.trim());
  const latitude = optionalCoordinate(body.latitude ?? src.latitude ?? src.lat);
  const longitude = optionalCoordinate(body.longitude ?? src.longitude ?? src.lng ?? src.lon);
  const place = {
    city: clean(src.city || cityFromLabel || src.place || sourceBirth.birthCity, 80),
    country: clean(src.country || countryFromLabel, 80),
    timezone: clean(body.timezone || src.timezone || src.timeZone || sourceBirth.timezone, 80),
  };
  if (Number.isFinite(latitude) && latitude >= -90 && latitude <= 90) place.latitude = latitude;
  if (Number.isFinite(longitude) && longitude >= -180 && longitude <= 180) place.longitude = longitude;
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
  if (!birthPlace.city && (!Number.isFinite(Number(birthPlace.latitude)) || !Number.isFinite(Number(birthPlace.longitude)))) errors.push("birthPlace");
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
    .select("email name phoneNumber points role profileSubscription subscription membership pass entitlement paidFeatures unlockedFeatures recentConsumeRequestIds")
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
  if (/usage[-_]pass/.test(signal)) return "removed_pass";
  if (signal.includes("membership_pass") || signal.includes("family") || signal.includes("pass")) return "pass";
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

  // 풀 초기화(MongoPoolClearedError) 순간에도 접근 판정 read가 1회 실패로 죽지 않도록 재시도.
  const user = await withMongoRetry(env, () => loadBillingUser(userObjectId));
  if (likelyAccessType === "pass") {
    const featureAccess = resolveFeatureAccessPolicy({ user: user || {}, pricing, coinCost: pricing.coinPrice });
    if (featureAccess.allowed) {
      return {
        accessType: featureAccess.accessType || "pass",
        paymentId: ids[0] || "",
        source: "pass-entitlement",
        prepaid: false,
        evidenceType: "pass",
      };
    }
  }

  const direct = await withMongoRetry(env, () => findDirectPayment(userObjectId, ids, idempotencyKey));
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
    const monthly = await withMongoRetry(env, () => findMonthlyEvidence(userObjectId, ids, idempotencyKey, pricing));
    if (monthly) return monthly;
  }

  const point = await withMongoRetry(env, () => findPointEvidence(userObjectId, ids, idempotencyKey, pricing));
  if (point) return point;

  const monthly = await withMongoRetry(env, () => findMonthlyEvidence(userObjectId, ids, idempotencyKey, pricing));
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
      // 🔴 스칼라(membershipCreditBalance)만 $inc 하면 환불이 조용히 증발한다 — 읽기 정본인
      // ensureLotsForBalance 는 lot 배열이 비어 있지 않으면 lot 만 보고, 다음 lot 쓰기가 스칼라를
      // lot 합계로 덮어쓴다. 형제 라우트 9곳(ziwei-island-ai.js:445 등)이 이미 쓰는 lot 복원 헬퍼로
      // 통일한다. membershipCreditUsed 되돌리기·recentConsumeRequestIds $pull·잔량 캐시 무효화까지
      // 이 헬퍼가 함께 처리하므로 별도 User 쓰기가 필요 없다. lotId 로 멱등이다.
      await restoreMonthlyCreditLot({
        userId: userObjectId,
        lotId: `vedic-refund:${String(ledger._id)}`,
        amount: refundCredit,
        pullRequestId: purchaseId || "",
      }).catch(() => {});

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
    calculationConfig: chart.calculationConfig,
    ayanamsa: chart.ayanamsa,
    lagna: chart.lagna,
    rashis: chart.rashis,
    grahas: chart.grahas,
    bhavas: chart.bhavas,
    moonNakshatra: chart.moonNakshatra,
    vimshottariDasha: chart.vimshottariDasha,
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

function buildCanonicalFactsLine(chart) {
  const facts = [];
  if (chart?.lagna?.rashiKo) facts.push(`라그나=${chart.lagna.rashiKo}(${chart.lagna.sign})`);
  if (chart?.moonNakshatra?.name) facts.push(`달의 나크샤트라=${chart.moonNakshatra.name}${chart.moonNakshatra.pada ? ` ${chart.moonNakshatra.pada}파다` : ""}`);
  const mahaLord = chart?.vimshottariDasha?.currentMahadasha?.lord;
  if (mahaLord) facts.push(`현재 마하다샤=${GRAHA_KO_MAP[mahaLord] || mahaLord}(${mahaLord})`);
  const antarLord = chart?.vimshottariDasha?.currentAntardasha?.lord;
  if (antarLord) facts.push(`현재 안타르다샤=${GRAHA_KO_MAP[antarLord] || antarLord}(${antarLord})`);
  return facts.join(" · ");
}

const DIGNITY_TONE = { exalted: "positive", "own sign": "positive", "friendly sign": "positive", debilitated: "caution", "enemy sign": "caution" };

// 서버가 계산한 조티시 차트를 화면과 프롬프트가 함께 쓰는 근거 형태로 옮긴다.
function buildVedicAnalysisBasis(chart) {
  const grahas = Array.isArray(chart?.grahas) ? chart.grahas : [];
  const bhavas = Array.isArray(chart?.bhavas) ? chart.bhavas : [];
  const dasha = chart?.vimshottariDasha || {};
  const lagnaAvailable = chart?.calculationMeta?.lagnaBhavaAvailable !== false;

  const coreItems = [
    basisItem("라그나", lagnaAvailable && chart?.lagna?.rashiKo ? `${chart.lagna.rashiKo}${chart.lagna.sign ? ` (${chart.lagna.sign})` : ""}` : "출생시간 미상으로 확정하지 않음", { term: "라그나", tone: lagnaAvailable ? "neutral" : "caution" }),
    chart?.moon?.signKo || chart?.moon?.sign ? basisItem("달의 라시", `${chart.moon.signKo || chart.moon.sign}`) : null,
    chart?.moonNakshatra?.name
      ? basisItem("나크샤트라", `${chart.moonNakshatra.name}${chart.moonNakshatra.pada ? ` · ${chart.moonNakshatra.pada}파다` : ""}`)
      : null,
    chart?.ayanamsa ? basisItem("아야남사", String(chart.ayanamsa)) : null,
  ];

  const grahaItems = grahas.slice(0, 9).map((graha) => basisItem(
    graha.nameKo || graha.nameEn || "그라하",
    [graha.rashiKo || graha.rashi, Number.isFinite(Number(graha.house)) ? `${graha.house}바바` : "", graha.dignity, graha.retrograde ? "역행" : ""].filter(Boolean).join(" · "),
    { tone: DIGNITY_TONE[String(graha.dignity || "").toLowerCase()] || "neutral" },
  ));

  const bhavaItems = bhavas
    .filter((bhava) => Array.isArray(bhava.grahas) && bhava.grahas.length)
    .slice(0, 8)
    .map((bhava) => basisItem(`${bhava.house}바바`, `${bhava.rashiKo || bhava.rashi || ""} · ${bhava.grahas.join(", ")}`.trim()));

  const dashaItems = [
    dasha.currentMahadasha?.lord
      ? basisItem("마하다샤", `${GRAHA_KO_MAP[dasha.currentMahadasha.lord] || dasha.currentMahadasha.lord}${dasha.currentMahadasha.end ? ` · ${String(dasha.currentMahadasha.end).slice(0, 10)}까지` : ""}`, { term: "다샤" })
      : null,
    dasha.currentAntardasha?.lord
      ? basisItem("안타르다샤", `${GRAHA_KO_MAP[dasha.currentAntardasha.lord] || dasha.currentAntardasha.lord}${dasha.currentAntardasha.end ? ` · ${String(dasha.currentAntardasha.end).slice(0, 10)}까지` : ""}`)
      : null,
    chart?.rahuKetu?.rahu ? basisItem("라후", `${chart.rahuKetu.rahu.rashiKo || chart.rahuKetu.rahu.rashi || ""}${Number.isFinite(Number(chart.rahuKetu.rahu.house)) ? ` · ${chart.rahuKetu.rahu.house}바바` : ""}`.trim(), { term: "라후", tone: "caution" }) : null,
    chart?.rahuKetu?.ketu ? basisItem("케투", `${chart.rahuKetu.ketu.rashiKo || chart.rahuKetu.ketu.rashi || ""}${Number.isFinite(Number(chart.rahuKetu.ketu.house)) ? ` · ${chart.rahuKetu.ketu.house}바바` : ""}`.trim(), { term: "케투", tone: "caution" }) : null,
  ];

  return buildAnalysisBasisPayload({
    featureKey: FEATURE_KEY,
    groups: [
      basisGroup("core", "차트의 기준점", coreItems, { hint: "라그나는 차트를 읽는 기준 자리, 나크샤트라는 다샤 흐름의 출발점입니다." }),
      basisGroup("graha", "그라하 배치", grahaItems, { hint: "각 행성이 어느 라시·바바에 놓였고 그 자리에서 힘을 얻는지(품위)를 봅니다." }),
      basisGroup("bhava", "바바에 놓인 것들", bhavaItems, { hint: "행성이 모인 바바가 이번 생에서 힘이 실리는 삶의 영역입니다." }),
      basisGroup("dasha", "지금의 다샤", dashaItems, { hint: "어느 행성의 기간에 있는지가 지금 시기의 주제를 정합니다." }),
    ],
    stages: [
      basisStage("lagna", "라그나를 세우는 중", "기준 자리와 아야남사", ["core"]),
      basisStage("graha", "그라하를 배치하는 중", "아홉 행성의 라시와 품위", ["graha"]),
      basisStage("bhava", "바바를 나누는 중", "열두 삶의 영역", ["bhava"]),
      basisStage("dasha", "다샤를 세는 중", "마하다샤·안타르다샤", ["dasha"]),
    ],
    uncertainty: lagnaAvailable ? undefined : { birthTimeUnknown: true },
  });
}

// 섹션 라벨만 주면 LLM 이 라그나 이야기로 쏠리고 D9·다샤는 한 줄 장식으로 남는다.
// 섹션마다 어떤 계산값을 본문에 그대로 인용해야 하는지 값과 함께 못 박는다.
function buildSectionEvidenceLines(chart) {
  const lagnaAvailable = chart?.calculationMeta?.lagnaBhavaAvailable !== false;
  const varga = (kind) => (chart?.divisionalCharts?.[kind] && typeof chart.divisionalCharts[kind] === "object" ? chart.divisionalCharts[kind] : null);
  const vargaLine = (table, names) => {
    if (!table) return "";
    return names
      .map((name) => {
        const cell = table[name];
        if (!cell?.sign) return "";
        return `${GRAHA_KO_MAP[name] || name} ${cell.sign}${cell.natalSign && cell.natalSign !== cell.sign ? `(D1 ${cell.natalSign})` : ""}`;
      })
      .filter(Boolean)
      .join(" · ");
  };

  const d9Line = vargaLine(varga("d9"), ["Venus", "Jupiter", "Moon", "Sun", "Mars", "Saturn"]);
  const d10Line = vargaLine(varga("d10"), ["Sun", "Saturn", "Mercury", "Jupiter"]);
  const dasha = chart?.vimshottariDasha || {};
  const dashaLine = [
    dasha.currentMahadasha?.lord ? `마하다샤 ${GRAHA_KO_MAP[dasha.currentMahadasha.lord] || dasha.currentMahadasha.lord}${dasha.currentMahadasha.end ? ` (${String(dasha.currentMahadasha.end).slice(0, 10)}까지)` : ""}` : "",
    dasha.currentAntardasha?.lord ? `안타르다샤 ${GRAHA_KO_MAP[dasha.currentAntardasha.lord] || dasha.currentAntardasha.lord}${dasha.currentAntardasha.end ? ` (${String(dasha.currentAntardasha.end).slice(0, 10)}까지)` : ""}` : "",
  ].filter(Boolean).join(" · ");

  return [
    `- karma_origin "${REQUIRED_SECTION_LABELS.karma_origin}": ${lagnaAvailable ? "lagna(라그나 라시와 도수)" : "출생시간이 없어 라그나는 확정하지 않는다고 밝히고 달 중심으로"}, moonNakshatra(이름·파다·로드), moon(라시)을 근거로 이 사람의 본질과 인생 전반의 방향, 되풀이되는 심리적 기질을 씁니다. 나크샤트라가 가리키는 業의 결을 운명 선고가 아니라 반복되는 패턴으로 설명하세요.`,
    `- dharma_artha "${REQUIRED_SECTION_LABELS.dharma_artha}": ${lagnaAvailable ? "bhavas 중 2·6·10·11번" : "출생시간이 없어 바바는 확정하지 않는다고 밝히고 그라하의 라시와 품위만"}, grahas의 dignity(품위)와 배치를 근거로 직업의 성격, 재물이 들어오고 나가는 방식, 그 사람의 다르마(마땅히 할 일)를 씁니다.${d10Line ? ` D10(직업 분차트) 참고값: ${d10Line}.` : ""}`,
    `- relationship_soul "${REQUIRED_SECTION_LABELS.relationship_soul}": ${d9Line ? `D9(나바암샤) 값을 반드시 본문에 인용하세요 — ${d9Line}.` : "divisionalCharts.d9 값이 비어 있으므로 D9 해석은 출생 정보 한계로 확정할 수 없다고 밝히고 지어내지 마세요."} D1(드러난 관계 방식)과 D9(내면의 잠재력·후반기·배우자의 실제 결)를 대조해, 두 차트가 어긋나는 지점 자체를 해석의 핵심으로 삼으세요.${lagnaAvailable ? " 7번 바바와 금성·목성의 배치도 함께 봅니다." : ""}`,
    `- dasha_upaya "${REQUIRED_SECTION_LABELS.dasha_upaya}": ${dashaLine ? `현재 다샤를 반드시 본문에 인용하세요 — ${dashaLine}.` : "vimshottariDasha 값이 비어 있으므로 시기 예언을 지어내지 말고 확인이 제한된다고 밝히세요."} 지금 이 기간이 어떤 삶의 주제를 끌어올리는지, 언제까지 이어지는지 밝힌 뒤 우파야(개운법)로 마무리합니다. 우파야는 다샤 로드와 품위가 약한 그라하에 근거해 오늘 실행 가능한 행위로만 제시하고, 부적·유료 의식·공포 조장은 쓰지 마세요.`,
  ];
}

function buildGroupPrompt(input, chart, group, repairLines = []) {
  const canonicalFacts = buildCanonicalFactsLine(chart);
  const sectionKeys = group.sectionKeys || [];
  const otherLabels = READING_SECTION_KEYS
    .filter((key) => !sectionKeys.includes(key))
    .map((key) => `"${REQUIRED_SECTION_LABELS[key]}"`)
    .join(", ");
  const schemaSections = {
    ...Object.fromEntries(sectionKeys.map((key) => [key, {
      title: REQUIRED_SECTION_LABELS[key],
      body: "제공된 계산값만 바탕으로 해석합니다.",
    }])),
    ...(group.includeReasoning ? buildReasoningSectionSchema() : {}),
  };
  return [
    "아래 VedicChartResult JSON과 사용자 질문을 바탕으로 조티시 상담문 중 **지정된 부분만** 쓰세요.",
    "이 글은 다른 부분과 합쳐져 하나의 상담문이 됩니다. 인사말·전체 요약·맺음말을 새로 쓰지 마세요.",
    otherLabels ? `${otherLabels} 는 다른 호출이 맡습니다. 여기서는 쓰지도 말고 요약하지도 마세요.` : "",
    "LLM은 계산하지 않습니다. 라그나, 라시, 그라하, 바바, 나크샤트라, 다샤는 제공된 JSON 값만 해석하세요.",
    "JSON에 null 또는 빈 배열로 표시된 값은 출생 정보 한계로 확인이 제한된다고 안내하고 추측하지 마세요.",
    "불안을 자극하지 말고, 사용자가 오늘 실제로 선택할 수 있는 방향을 제시하세요.",
    "각 섹션 body는 (1) 계산값 근거 명시 → (2) 삶의 주제 해석 → (3) 실행 가능한 조언 순서로 쓰세요. 해당 섹션의 핵심 계산값(라시·나크샤트라·다샤 lord 등)을 본문에 그대로 언급한 뒤 해석하세요.",
    `모든 섹션의 마지막 문단은 상담 주제 "${input.topic}"${input.userQuestion ? "와 사용자의 자유 질문" : ""}에 연결해 마무리하세요.`,
    `이번 부분의 body 합산은 공백 제외 ${group.minChars.toLocaleString("ko-KR")}자 이상 ${group.maxChars.toLocaleString("ko-KR")}자 이하로 쓰세요.`,
    "분량을 채우려고 같은 문장을 반복하지 말고, 새로 짚을 장면과 판단 기준을 더하세요. 요약으로 끝내지 말고 근거→해석→조언을 각각 여러 문단으로 전개하세요.",
    "반환은 JSON 객체 하나만 허용합니다.",
    "",
    "섹션별로 반드시 인용해야 할 계산값과 다룰 내용:",
    // 이 그룹이 맡은 섹션의 근거 줄만 싣는다 — 남의 섹션 지시가 들어가면 모델이 그것까지 쓴다.
    ...buildSectionEvidenceLines(chart).filter((line) => sectionKeys.some((key) => line.startsWith(`- ${key} `))),
    ...(canonicalFacts ? ["", `계산 확정값 (본문에서 이 값과 다르게 서술하는 것을 금지): ${canonicalFacts}`] : []),
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
    `해석 기준: ${chart.calculationMeta?.lagnaBhavaAvailable === false ? "출생시간이 없으므로 라그나와 바바는 계산하지 않고 달, 라시, 나크샤트라, 다샤 중심" : "Lagna Chart와 Whole Sign Bhava 중심"}`,
    "",
    "이번 부분이 낼 sections 키와 title:",
    JSON.stringify(Object.fromEntries(sectionKeys.map((key) => [key, REQUIRED_SECTION_LABELS[key]]))),
    "",
    "반환 JSON 형식 (아래 키만 내고, 다른 키는 넣지 마세요):",
    JSON.stringify({
      // scores 는 첫 그룹만 낸다. 나머지 그룹이 함께 내면 병합에서 어느 쪽을 쓸지 임의로 정하게 된다.
      ...(group.includeScores ? { scores: { dharma: 0, artha: 0, kama: 0, moksha: 0, overall: 0 } } : {}),
      // 근거를 먼저 밝히는 다섯 흐름. 품질 검증(READING_SECTION_KEYS)에는 넣지 않는다 —
      // 빠지면 화면에서 생략될 뿐, 결제까지 끝난 상담 전체를 실패로 만들지 않기 위해서다.
      sections: schemaSections,
    }),
    "",
    "계산된 VedicChartResult 데이터:",
    JSON.stringify(compactChartForPrompt(chart)),
    "",
    "전통 조티시 해석 어휘 (계산값에만 적용):",
    JSON.stringify(buildVedicKnowledgeContext(chart)),
    "",
    // 아래 확정값은 그대로 사용자 화면의 근거 패널로도 나간다. 본문이 그 표를 벗어나지 않게 못 박는다.
    ...buildEvidenceRuleLines(buildVedicAnalysisBasis(chart)),
    "",
    ...(group.includeReasoning ? buildReasoningSectionRuleLines() : []),
    ...(repairLines.length ? ["", "[보강 요청]", ...repairLines] : []),
  ].filter(Boolean).join("\n");
}

function sanitizeAssistantText(value) {
  let text = cleanMultiline(value, MAX_ASSISTANT_TEXT_CHARS);
  text = text.replace(/\bPDF\b/gi, "상담문");
  text = text.replace(/챕터|chapter/gi, "흐름");
  text = text.replace(/\bjob\b/gi, "상담");
  text = text.replace(/\bprogress\b/gi, "진행");
  text = text.replace(/프롬프트/g, "질문");
  text = text.replace(/시스템/g, "상담 기준");
  return text.trim();
}

function readingTextLength(value) {
  return cleanMultiline(value).replace(/\s+/g, "").length;
}

function parseStructuredConsultationText(value) {
  const text = cleanMultiline(value, MAX_ASSISTANT_TEXT_CHARS)
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (!text.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// LLM 본문이 서버 계산값과 모순되게 서술하지 않았는지 사후 검증한다.
// (프롬프트 지시만으로는 수치 위조를 막을 수 없으므로 응답 단계에서 대조)
function validateChartConsistency(content, chart) {
  const issues = [];
  if (!chart) return issues;
  const parsed = parseStructuredConsultationText(cleanMultiline(content, MAX_ASSISTANT_TEXT_CHARS));
  const sections = parsed?.sections && typeof parsed.sections === "object" ? parsed.sections : null;
  // 새 4섹션 키를 먼저 보고, 구 7섹션 키가 섞여 오면 그 본문도 함께 읽는다.
  // 폴백이 없으면 옛 형식 응답에서 본문이 빈 문자열로 보여 검사가 통째로 건너뛰어진다.
  const sectionBody = (key) => [key, ...(LEGACY_SECTION_KEYS[key] || [])]
    .map((name) => cleanMultiline(sections?.[name]?.body || ""))
    .filter(Boolean)
    .join("\n")
    .trim();
  const fullText = sections
    ? Object.values(sections).map((section) => cleanMultiline(section?.body || "")).join("\n")
    : cleanMultiline(content);

  const lagnaKo = clean(chart?.lagna?.rashiKo, 20);
  if (lagnaKo) {
    const wrongLagna = ALL_SIGNS_KO.some((signKo) => signKo !== lagnaKo && new RegExp(`${signKo}\\s*라그나`).test(fullText));
    if (wrongLagna) issues.push("consistency.lagna_sign_mismatch");
    const lagnaBody = sectionBody("karma_origin");
    if (lagnaBody && !lagnaBody.includes(lagnaKo) && !lagnaBody.includes(clean(chart?.lagna?.sign, 20) || "\u0000")) {
      issues.push("consistency.lagna_sign_unstated");
    }
  }

  const nakshatraName = clean(chart?.moonNakshatra?.name, 40);
  const nakshatraBody = sectionBody("karma_origin");
  if (nakshatraName && nakshatraBody && !nakshatraBody.includes(nakshatraName)) {
    issues.push("consistency.moon_nakshatra_unstated");
  }

  const mahaLord = clean(chart?.vimshottariDasha?.currentMahadasha?.lord, 20);
  if (mahaLord) {
    const lordKo = GRAHA_KO_MAP[mahaLord] || mahaLord;
    const dashaText = sectionBody("dasha_upaya");
    if (dashaText && !dashaText.includes(mahaLord) && !dashaText.includes(lordKo)) {
      issues.push("consistency.mahadasha_lord_unstated");
    }
  }
  return issues;
}

function describeQualityIssuesForRepair(issues, chart) {
  const lines = [];
  const canonical = buildCanonicalFactsLine(chart);
  if (issues.some((issue) => issue.startsWith("consistency."))) {
    lines.push(`- 본문 서술이 계산 확정값과 어긋났다. 반드시 이 값 그대로 서술하라: ${canonical}`);
  }
  if (issues.includes("consistency.lagna_sign_unstated")) lines.push("- karma_origin 섹션 본문에 라그나 라시 이름을 그대로 언급한 뒤 해석하라.");
  if (issues.includes("consistency.moon_nakshatra_unstated")) lines.push("- karma_origin 섹션 본문에 달의 나크샤트라 이름을 그대로 언급한 뒤 해석하라.");
  if (issues.includes("consistency.mahadasha_lord_unstated")) lines.push("- dasha_upaya 섹션 본문에 현재 마하다샤 lord를 그대로 언급한 뒤 해석하라.");
  if (issues.includes("total_body_too_short")) lines.push(`- sections body 전체 합산 공백 제외 ${MIN_INITIAL_READING_CHARS.toLocaleString()}자 이상으로 더 깊고 길게 쓰라.`);
  if (issues.includes("total_body_too_long")) lines.push(`- sections body 전체 합산 공백 제외 ${MAX_INITIAL_READING_CHARS.toLocaleString()}자 이하로 압축하라.`);
  if (issues.includes("structured_json.missing")) lines.push("- 반환은 JSON 객체 하나만 허용한다. JSON 밖에 어떤 텍스트도 쓰지 마라.");
  if (!lines.length) lines.push("- 요구된 섹션 구조와 길이 기준을 모두 충족해 다시 작성하라.");
  return lines;
}

function validateConsultationQuality(content, options = {}) {
  const minTotalChars = Number(options.minTotalChars || 0);
  const maxTotalChars = Number(options.maxTotalChars || 0);
  const requireStructured = options.requireStructured === true;
  const text = cleanMultiline(content, MAX_ASSISTANT_TEXT_CHARS);
  const issues = [];
  let totalChars = readingTextLength(text);
  let sectionCount = 0;

  if (!text) issues.push("content.empty");
  if (/\b(?:undefined|null|NaN)\b|\[object Object\]|```|schema/i.test(text)) issues.push("raw_leak");
  if (/이 기능은|이 결과는|분석 결과는/.test(text)) issues.push("mechanical_label");

  const parsed = parseStructuredConsultationText(text);
  if (!parsed) {
    if (requireStructured) issues.push("structured_json.missing");
  } else {
    const scores = parsed.scores && typeof parsed.scores === "object" ? parsed.scores : {};
    const sections = parsed.sections && typeof parsed.sections === "object" ? parsed.sections : {};
    if (!Object.keys(scores).length) issues.push("scores.missing");
    totalChars = 0;
    for (const key of READING_SECTION_KEYS) {
      const section = sections[key] && typeof sections[key] === "object" ? sections[key] : {};
      const title = clean(section.title, 160);
      const body = cleanMultiline(section.body, MAX_ASSISTANT_TEXT_CHARS);
      if (!title) issues.push(`${key}.title_missing`);
      if (title && REQUIRED_SECTION_LABELS[key] && !title.includes(REQUIRED_SECTION_LABELS[key])) issues.push(`${key}.required_label_missing`);
      if (!body) issues.push(`${key}.body_missing`);
      if (body) sectionCount += 1;
      totalChars += readingTextLength(body);
    }
  }

  if (minTotalChars > 0 && totalChars < minTotalChars) issues.push("total_body_too_short");
  if (maxTotalChars > 0 && totalChars > maxTotalChars) issues.push("total_body_too_long");
  if (options.chart) issues.push(...validateChartConsistency(text, options.chart));
  return { ok: issues.length === 0, issues, totalChars, sectionCount };
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

function summaryCards(chart) {
  const dasha = [
    chart.vimshottariDasha?.currentMahadasha?.lord || chart.dasha?.currentMahadasha,
    chart.vimshottariDasha?.currentAntardasha?.lord || chart.dasha?.currentAntardasha,
  ].filter(Boolean).join(" / ");
  const strongGrahas = (Array.isArray(chart.grahas) ? chart.grahas : [])
    .filter((graha) => ["exalted", "own sign", "friendly sign"].includes(clean(graha?.dignity)))
    .map((graha) => graha.nameKo || graha.nameEn)
    .filter(Boolean)
    .slice(0, 4);
  const majorBhavas = (Array.isArray(chart.bhavas) ? chart.bhavas : [])
    .filter((bhava) => Array.isArray(bhava.grahas) && bhava.grahas.length)
    .map((bhava) => `${bhava.house}H ${bhava.rashiKo || bhava.rashi}`)
    .slice(0, 4);
  const keywordSeed = [
    chart.lagna?.rashiKo ? `${chart.lagna.rashiKo} Lagna` : "출생시간 필요",
    chart.moonNakshatra?.name || chart.moon?.nakshatra || chart.moon?.sign || "",
    strongGrahas.length ? `강한 그라하 ${strongGrahas.join(", ")}` : "",
    dasha || "",
  ].filter(Boolean);
  return {
    lagna: chart.lagna?.rashiKo || chart.lagna?.sign || "출생시간 필요",
    moonSign: chart.moon?.signKo || chart.moon?.sign || "",
    nakshatra: chart.moonNakshatra?.name || chart.moon?.nakshatra || "",
    currentDasha: dasha,
    strongGrahas,
    majorBhavas,
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
    // 차트는 예전부터 저장돼 있었으므로 이 변경 이전에 만들어진 상담도 근거 패널을 그대로 얻는다.
    analysisBasis: doc.vedicChart ? buildVedicAnalysisBasis(doc.vedicChart) : null,
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

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth?.userId) return loginRequired();
  const requestId = idempotencyKey || `vedic-ai-${auth.userId}-${normalized.inputHash.slice(0, 16)}-${Date.now()}-${randomSuffix()}`;
  const pricing = getPricing();
  logVedicAi("LLM Access Check Start", { ...context, requestId });

  await connectDb(env);
  const existing = await withMongoRetry(env, () => VedicAiConsultation.findOne({
    userId: String(auth.userId),
    idempotencyKey: requestId,
    inputHash: normalized.inputHash,
    status: "completed",
  }).lean());
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

  const user = await withMongoRetry(env, () => loadBillingUser(auth.userId));
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

  const featureAccess = resolveFeatureAccessPolicy({ user: user || {}, pricing, coinCost: pricing.coinPrice });
  if (featureAccess.allowed) {
    const accessToken = await createAccessToken(env, {
      userId: String(auth.userId),
      idempotencyKey: requestId,
      inputHash: normalized.inputHash,
      accessType: "pass",
      paymentId: "",
    });
    logVedicAi("LLM Access Check Success", { ...context, requestId, accessCheckResult: "pass" });
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

/**
 * 그룹 하나를 생성한다. **절대 던지지 않는다** — 한 그룹의 실패가 나머지 그룹까지 죽이면
 * 결제까지 끝난 사용자가 아무것도 못 받는다. 실패는 빈 텍스트로 돌려주고 병합이 알아서 뺀다.
 */
async function generateVedicGroup(env, input, chart, group, context, repairLines = []) {
  // 동기 생성이라 엣지가 100초에 요청을 끊는다. clamp 를 걸어야 라우트가 먼저 판정해
  // 짧아진 결과라도 degrade 경로로 전달하고, 생성 실패 기록·선차감 복원이 실행된다.
  const vedicTimeoutMs = clampSyncLlmTimeoutMs(Number(env?.VEDIC_AI_TIMEOUT_MS) || 180000);
  try {
    const result = await callGeminiJsonWithRetry(env, buildGroupPrompt(input, chart, group, repairLines), {
      systemPrompt: await cmsPromptText(env, "vedic-ai", SYSTEM_PROMPT),
      taskType: "fortune",
      temperature: repairLines.length ? 0.62 : 0.72,
      baseTokens: VEDIC_GROUP_MAX_OUTPUT_TOKENS,
      capTokens: Math.round(VEDIC_GROUP_MAX_OUTPUT_TOKENS * 1.3),
      responseMimeType: "application/json",
      timeoutMs: vedicTimeoutMs,
      // 그룹 단위 문턱 — 전체 목표가 아니라 이 그룹 목표의 40%.
      fallbackMinChars: Math.round(group.minChars * 0.4),
      logContext: { ...context, group: group.key },
    });
    const provider = clean(result?.provider || result?.model || "gemini");
    if (!result?.ok || /mock/i.test(provider) || result?.isMock === true) return { group, text: "", provider: "", model: "" };
    return { group, text: sanitizeAssistantText(result?.text || ""), provider, model: clean(result?.model || "") };
  } catch (error) {
    logVedicAi("Group Generation Failed", { ...context, group: group.key, message: clean(error?.message, 200) }, "warn");
    return { group, text: "", provider: "", model: "" };
  }
}

/** 그룹별 JSON 을 하나의 상담문 JSON 으로 합친다. 출력 계약(구조화 JSON 문자열)은 그대로다. */
function mergeVedicGroupPayloads(rows) {
  const sections = {};
  let scores = null;
  for (const row of rows) {
    if (!row?.text) continue;
    const parsed = parseStructuredConsultationText(cleanMultiline(row.text, MAX_ASSISTANT_TEXT_CHARS));
    if (!parsed) continue;
    if (parsed.sections && typeof parsed.sections === "object") {
      for (const [key, value] of Object.entries(parsed.sections)) {
        // 그룹이 남의 섹션을 덤으로 냈다면 그 그룹의 담당 키만 채택한다(중복 서술 방지).
        const owned = !row.group.sectionKeys.length || row.group.sectionKeys.includes(key) || row.group.includeReasoning;
        if (owned && value && typeof value === "object") sections[key] = value;
      }
    }
    if (!scores && parsed.scores && typeof parsed.scores === "object" && Object.keys(parsed.scores).length) {
      scores = parsed.scores;
    }
  }
  return JSON.stringify({ scores: scores || {}, sections });
}

async function generateInitialReading(env, input, chart, context) {
  logVedicAi("LLM Provider Selected", { ...context, ...getProviderDiagnostics(env) });
  const qualityOptions = {
    minTotalChars: MIN_INITIAL_READING_CHARS,
    maxTotalChars: MAX_INITIAL_READING_CHARS,
    requireStructured: true,
    chart,
  };

  // 웨이브 1 — 전 그룹 동시 생성. 벽시계는 그룹 시간의 합이 아니라 가장 느린 그룹 하나다.
  let rows = await Promise.all(VEDIC_SECTION_GROUPS.map((group) => generateVedicGroup(env, input, chart, group, context)));

  // 웨이브 2 — 비었거나 목표에 못 미치는 그룹만 다시 쓴다(전면 재생성 금지).
  const groupChars = (row) => {
    const parsed = row?.text ? parseStructuredConsultationText(cleanMultiline(row.text, MAX_ASSISTANT_TEXT_CHARS)) : null;
    const sections = parsed?.sections && typeof parsed.sections === "object" ? parsed.sections : {};
    return Object.values(sections).reduce((sum, section) => sum + readingTextLength(cleanMultiline(section?.body || "")), 0);
  };
  const shortfall = rows.filter((row) => groupChars(row) < row.group.minChars);
  if (shortfall.length) {
    logVedicAi("Group Repair Wave", { ...context, groups: shortfall.map((row) => row.group.key) }, "warn");
    const repaired = await Promise.all(shortfall.map((row) => generateVedicGroup(env, input, chart, row.group, context, [
      `직전 응답이 ${groupChars(row).toLocaleString("ko-KR")}자로 목표에 못 미칩니다. ${row.group.minChars.toLocaleString("ko-KR")}자 이상이 되도록 근거와 장면을 더해 다시 쓰세요.`,
      "분량만 늘리지 말고, 아직 짚지 않은 계산 근거와 실제 장면을 새로 더하세요.",
    ])));
    // 다시 쓴 결과가 더 짧으면 원본을 지킨다 — 보강이 개악이 되는 경우가 있다.
    rows = rows.map((row) => {
      const next = repaired.find((item) => item.group.key === row.group.key);
      return next && groupChars(next) > groupChars(row) ? next : row;
    });
  }

  let content = mergeVedicGroupPayloads(rows);
  let quality = validateConsultationQuality(content, qualityOptions);

  // 웨이브 3 — 품질 이슈가 남으면 **그 이슈를 책임지는 그룹만** 다시 쓴다.
  // (구조 전환 전에는 여기서 프롬프트 전체를 다시 돌렸다. 그 전면 재작성이 출력을 2~3배로 태웠다.)
  if (!quality.ok) {
    const repairHints = describeQualityIssuesForRepair(quality.issues, chart);
    const targets = rows.filter((row) => row.group.sectionKeys.some(
      (key) => quality.issues.some((issue) => issue.startsWith(`${key}.`) || repairHints.some((hint) => hint.includes(`${key} 섹션`))),
    ));
    if (targets.length) {
      logVedicAi("Group Quality Repair", { ...context, groups: targets.map((row) => row.group.key), issues: quality.issues }, "warn");
      const requalified = await Promise.all(targets.map((row) => generateVedicGroup(env, input, chart, row.group, context, repairHints)));
      rows = rows.map((row) => {
        const next = requalified.find((item) => item.group.key === row.group.key);
        return next?.text && groupChars(next) >= groupChars(row) ? next : row;
      });
      content = mergeVedicGroupPayloads(rows);
      quality = validateConsultationQuality(content, qualityOptions);
    }
  }

  const alive = rows.filter((row) => row.text);
  if (!alive.length) {
    const error = new Error("LLM_FAILED");
    error.code = "LLM_FAILED";
    throw error;
  }
  const provider = clean(alive[0].provider || "gemini");
  const model = clean(alive[0].model || "");
  if (!quality.ok) {
    // 경량 보장 계약: 품질 미달이라도 렌더 가능한 상담문이면 버리지 않고 degrade 로 전달한다.
    if (hasRenderableLlmText(content, { minChars: 400 })) {
      return { content, meta: { provider, model, isMock: false, quality, degraded: true } };
    }
    const error = new Error(`LLM_QUALITY_FAILED:${quality.issues.join(",")}`);
    error.code = "LLM_FAILED";
    error.quality = quality;
    throw error;
  }
  return { content, meta: { provider, model, isMock: false, quality } };
}

async function generateConsultation({ request, env, auth, body, normalized, idempotencyKey }) {
  const pricing = getPricing();
  const context = routeLogContext(request, body, normalized, idempotencyKey);
  await connectDb(env);
  const existing = await withMongoRetry(env, () => VedicAiConsultation.findOne({
    userId: String(auth.userId),
    idempotencyKey,
  }));
  if (existing?.status === "completed" && existing.inputHash === normalized.inputHash) {
    return json({ ok: true, consultation: consultationPayload(existing.toObject()) });
  }
  // 진행 중 생성에 대한 재-POST는 재생성하지 않고 202로 안내(폴링 대상).
  // 신선도 창 = 차트 계산 + 초기 180s + 품질 재시도 180s + 마진.
  if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < 420000) {
    return json({ ok: true, sessionId: existing.id, status: "generating", message: "나크샤트라의 빛을 읽고 있습니다" }, { status: 202 });
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
    const { content, meta } = await generateInitialReading(env, normalized.input, chart, context);
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
    return serverError(MESSAGES.llmFailed, 503, "LLM_FAILED");
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

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
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

async function handleResult(request, env) {
  if (request.method !== "GET") return methodNotAllowed();
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth?.userId) return loginRequired();

  const path = getRoutePath(request, "/api/vedic-ai");
  const url = new URL(request.url);
  const pathId = path.startsWith("/result/") ? decodeURIComponent(path.slice("/result/".length)) : "";
  const id = clean(pathId || url.searchParams.get("id") || url.searchParams.get("consultationId"), 120);

  await connectDb(env);
  if (!id) {
    const rows = await VedicAiConsultation.find({ userId: String(auth.userId), status: "completed" })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select("id topic birthInfo vedicChart.chartSummary createdAt updatedAt")
      .lean();
    return json({
      ok: true,
      consultations: rows.map((row) => ({
        id: row.id,
        topic: row.topic || "",
        name: clean(row.birthInfo?.name, 80),
        chartSummary: clean(row.vedicChart?.chartSummary, 200),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    });
  }

  const consultation = await VedicAiConsultation.findOne({
    userId: String(auth.userId),
    id,
  }).lean();
  if (!consultation) return notFound();
  // 생성 중이면 202로 알려 클라이언트 폴링이 수렴하게 한다(start의 202 바디와 동일 형태).
  if (consultation.status === "generating") {
    return json(
      { ok: true, sessionId: consultation.id, status: "generating", message: "나크샤트라의 빛을 읽고 있습니다" },
      { status: 202, headers: { "Retry-After": "3" } },
    );
  }
  if (consultation.status !== "completed") {
    return json({ ok: false, reason: "GENERATION_FAILED", message: MESSAGES.llmFailed }, { status: 409 });
  }
  return json({ ok: true, consultation: consultationPayload(consultation) });
}

// 계산 근거만 즉시 돌려준다 — LLM 미호출, DB 접근 없음, 과금 없음.
// 신원 확인은 로컬 JWT 검증만 써서 Mongo를 한 번도 건드리지 않는다.
async function handleBasis(request, env) {
  if (request.method !== "POST") return methodNotAllowed();
  const userId = await peekAccessTokenUserId(request, env);
  if (!userId) return loginRequired();

  const normalized = normalizeConsultationInput(await readJson(request));
  if (!normalized.ok) return invalidInput(normalized.message);

  try {
    const chart = await calculateVedicAiChart(env, normalized.input, { requestUrl: request.url });
    return json(buildVedicAnalysisBasis(chart));
  } catch (error) {
    console.warn("[vedic-ai] basis failed", clean(error?.message || error, 200));
    return json({ ok: false, reason: "CALCULATION_FAILED" }, { status: 503 });
  }
}

export async function handleVedicAiRoutes(request, env) {
  const path = getRoutePath(request, "/api/vedic-ai");
  try {
    if (path === "/basis") return await handleBasis(request, env);
    if (path === "/ensure-access") return await handleEnsureAccess(request, env);
    if (path === "/start") return await handleStart(request, env);
    if (path === "/result" || path.startsWith("/result/")) return await handleResult(request, env);
    return notFound();
  } catch (error) {
    // 풀 초기화 버스트/인증 조회 중 일시 DB 장애는 재시도 신호와 함께 503으로 — 하드 500 방지.
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) {
      return json({
        ok: false,
        retryable: true,
        reason: "DB_DEGRADED",
        message: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요.",
      }, { status: 503 });
    }
    // 비일시 에러를 전역 라우터로 re-throw하면 오도성 catch-all 500이 나가므로, 로컬 serverError로 통일한다.
    return serverError();
  }
}

export const __vedicAiTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  normalizeConsultationInput,
  VEDIC_SECTION_GROUPS,
  VEDIC_GROUP_MAX_OUTPUT_TOKENS,
  MIN_INITIAL_READING_CHARS,
  MAX_INITIAL_READING_CHARS,
  buildGroupPrompt,
  mergeVedicGroupPayloads,
  generateInitialReading,
  buildPaymentPayload,
  sanitizeAssistantText,
  validateConsultationQuality,
  validateChartConsistency,
  buildCanonicalFactsLine,
  buildVedicAnalysisBasis,
  collectEvidenceIds,
};
