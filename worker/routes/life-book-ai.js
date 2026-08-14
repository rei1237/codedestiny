import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, isTransientMongoError, mongoose, withMongoRetry } from "../lib/db.js";
import { LifeBookAiConsultation, MonthlyCreditLedger, PaidExecutionRecord, Payment, PointHistory, User } from "../lib/models.js";
import { restoreMonthlyCreditLot } from "../lib/monthly-credit-store.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { resolveFeatureAccessPolicy } from "../lib/entitlement-policy.js";
import { canAccessPaidFeature, PAID_FEATURE_ACCESS_USER_PROJECTION } from "../lib/paid-feature-access.js";
import { callGeminiText } from "../lib/gemini.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { calculateLifeBookAiSaju } from "../lib/life-book-ai-saju.js";
import { canStripForbiddenText } from "../lib/llm-leak-guard.js";
import { clampSyncLlmTimeoutMs } from "../lib/sync-llm-timeout.js";
import { handleBillingRoutes, BILLING_SNAPSHOT_USER_PROJECTION } from "./billing.js";

const SERVICE_KEY = "life-book-ai";
const FEATURE_KEY = "life-book-ai-consultation";
// 인생 총운은 2026-08-01 부터 별도 SKU(50,000원). 구 SKU 로 결제된 세션은 문서의 featureKey 로 계속 정산한다.
const LIFE_FORTUNE_FEATURE_KEY = "life-fortune-ai-consultation";
const LEGACY_LIFE_FORTUNE_FEATURE_KEY = FEATURE_KEY;
const ACCESS_TOKEN_TYPE = "life-book-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "인생의 책 전문가 상담";

const GEMINI_ENV_KEYS = [
  "GEMINIF_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
];

const MESSAGES = Object.freeze({
  login: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  paymentRequired: "이용권 또는 결제가 필요한 상담입니다. 결제 정보를 확인해 주세요.",
  paymentVerifyFailed: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  invalidInput: "인생의 책을 열기 위한 정보가 부족합니다. 생년월일과 성별을 다시 확인해 주세요.",
  genderRequired: "대운 흐름을 정확히 계산하려면 성별을 선택해 주세요.",
  birthTimeMissing: "출생시간을 입력하거나 출생시간 모름을 선택해 주세요.",
  prepareFailed: "인생의 책 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  sajuCalculationFailed: "명식 계산을 완료하지 못했습니다. 결제나 이용권은 차감되지 않았습니다.",
  llmFailed: "상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
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
const FORBIDDEN_RESULT_PATTERN = /\bPDF\b|\bprogress\b|\bjob\b|프롬프트|시스템|\bAI\b|인공지능|이 기능은|이 결과는|분석 결과는/gi;
const CANONICAL_TEN_GODS = Object.freeze(["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"]);
const LIFE_BOOK_EXPECTED_CHAPTER_COUNT = 10;
// 10챕터 병렬 생성이라 분량은 챕터 목표를 키워서 올린다(챕터당 1,500~2,600자는 모델이 한 번에
// 채우는 크기 안쪽이다). 총합 하한 15,000자 = A4 10장.
const LIFE_BOOK_MIN_CHAPTER_CONTENT_CHARS = 1500;
const LIFE_BOOK_MIN_TOTAL_CONTENT_CHARS = 15000;
const LIFE_BOOK_MAX_TOTAL_CONTENT_CHARS = 26000;
const LIFE_FORTUNE_MIN_CHAPTER_CONTENT_CHARS = 2400;
const LIFE_FORTUNE_MIN_EXPERT_READING_CONTENT_CHARS = 1200;
const LIFE_FORTUNE_MIN_TOTAL_CONTENT_CHARS = 30000;
const LIFE_FORTUNE_MAX_TOTAL_CONTENT_CHARS = 60000;
// 🔴 장문 단일 호출은 구조적으로 불가능하다. 총운 30,000자 ≈ 45,000토큰이고 gemini-2.5-flash 는
//    비스트리밍 ~200tok/s 라 225초가 필요한데 엣지 응답 데드라인은 100초다. 그래서 15섹션으로 쪼개
//    한 요청 = 동시성 4 웨이브 하나(≈42초)만 돌리고, 클라가 /generate 를 반복 호출해 진행한다.
//    (정본 패턴: master-love-codex.js CHAPTER_CONCURRENCY / nakshatra-ai.js SECTION_CONCURRENCY)
const SECTION_CONCURRENCY = 4;
const SECTION_BATCH_SIZE = SECTION_CONCURRENCY;
// 웨이브 최악(≈42초)의 2배. 이 값보다 STALE 창이 짧으면 락 보유 중인 정상 세션을 죽인다.
const SECTION_LOCK_TTL_MS = 90 * 1000;
// 1회 생성 + 자동 재시도 2회.
const LIFE_BOOK_MAX_SECTION_ATTEMPTS = 3;
// 세션당 웨이브 상한. /generate 는 레이트리밋상 하루 60회라 무한 재개를 막아야 한다.
const MAX_GENERATION_WAVES = 8;
const SECTION_TIMEOUT_MS = 45000;
// 🔴 클라 폴링 예산(≈400초) 안이어야 GENERATION_STALLED 가 사용자에게 실제로 도달한다.
//    하한은 락 TTL 90s + 웨이브 최악 42s = 132s 이므로 180s 밑으로 내리지 말 것.
const LIFE_BOOK_GENERATING_STALE_MS = 3 * 60 * 1000;
const LIFE_BOOK_RESULT_TEXT_MAX_CHARS = 140000;
// 재시도를 다 쓰고도 미달일 때 총운을 전달할 하한(최소치의 80%). 그 미만은 환불.
const LIFE_FORTUNE_DEGRADE_MIN_TOTAL_CHARS = Math.round(LIFE_FORTUNE_MIN_TOTAL_CONTENT_CHARS * 0.8);
const LIFE_FORTUNE_CHAPTER_TITLES = Object.freeze([
  "타고난 명식의 중심",
  "성격과 마음의 결",
  "재능과 일의 방향",
  "재물과 생활 기반",
  "사랑과 인연의 흐름",
  "관계와 가족의 장",
  "건강과 생활 리듬",
  "대운으로 보는 큰 전환",
  "가까운 세운의 흐름",
  "앞으로 열릴 선택",
]);
const LIFE_FORTUNE_EVIDENCE_REF_ROOTS = Object.freeze([
  "yearPillar",
  "monthPillar",
  "dayPillar",
  "hourPillar",
  "dayMaster",
  "pillarDetails",
  "fiveElements",
  "tenGods",
  "tenGodsByPillar",
  "strength",
  "usefulGod",
  "unfavorableGod",
  "seasonalBalance",
  "natalInteractions",
  "relationSummary",
  "majorLuck",
  "yearlyLuck",
  "fortuneFacts",
  "interpretationPlan",
  "calculationMeta",
]);

// ── 섹션 정본 ───────────────────────────────────────────────────────────────
// 🔴 장 제목·evidenceRefs 는 getLifeBookReportQualityIssues 가 그대로 검사하므로 정본은 여기 하나다.
//    섹션 프롬프트와 품질 게이트가 같은 배열을 보게 해서 둘이 갈라지지 않게 한다.
const LIFE_FORTUNE_CHAPTER_GUIDES = Object.freeze([
  "년주·월주·일주·시주, 일간, 월지, 지장간, 오행 분포, 신강·신약의 근거를 먼저 잡고 명식 전체의 중심축을 풉니다.",
  "일간과 월령, 인성·비겁·식상의 작동을 통해 마음의 방어 방식, 회복 방식, 반복되는 감정 습관을 풉니다.",
  "식상·재성·관성의 연결, 월주와 시주의 사회적 쓰임, 직업 선택에서 살아나는 강점과 피해야 할 소모를 풉니다.",
  "재성의 위치와 강약, 비겁과 재성의 관계, 식상이 재성을 생하는 흐름, 지출과 축적의 리듬을 풉니다.",
  "배우자성, 일지, 합충형파해 가능성, 관계에서 반복되는 끌림과 거리 조절 방식을 풉니다.",
  "년주·월주가 드러내는 뿌리, 가족 안에서 맡기 쉬운 역할, 인간관계에서 생기는 책임과 경계의 문제를 풉니다.",
  "월령과 조후, 오행 과다·부족, 수면·소화·호흡·긴장 패턴처럼 현실 생활에서 조절할 리듬을 풉니다.",
  "majorLuck.currentCycle, cycles, direction, startSolarDate, natalInteractions를 근거로 현재 대운의 배경과 다음 전환의 준비를 풉니다.",
  "yearlyLuck의 각 연도 간지, 세운 십성, majorLuckPillar, natalInteractions를 바탕으로 가까운 5년의 기회와 주의 흐름을 풉니다.",
  "앞선 9장의 근거를 종합해 삶, 일, 재물, 관계, 건강을 어떤 순서로 조율하면 좋은지 구체적인 선택 기준을 남깁니다.",
]);
const LIFE_FORTUNE_CHAPTER_EVIDENCE_REFS = Object.freeze([
  ["dayMaster", "monthPillar", "seasonalBalance"],
  ["dayMaster", "tenGodsByPillar.day", "tenGods"],
  ["tenGods", "tenGodsByPillar.month", "fortuneFacts.strongestTenGods"],
  ["tenGods", "fiveElements", "usefulGod"],
  ["pillarDetails.day", "natalInteractions", "tenGodsByPillar"],
  ["pillarDetails.year", "pillarDetails.month", "relationSummary"],
  ["seasonalBalance", "fiveElements", "strength"],
  ["majorLuck.currentCycle", "majorLuck.cycles", "majorLuck.direction"],
  ["yearlyLuck", "majorLuck.currentCycle", "yearlyLuck.natalInteractions"],
  ["fortuneFacts", "interpretationPlan", "usefulGod"],
]);
const LIFE_BOOK_CHAPTER_TITLES = Object.freeze([
  "타고난 사주의 원형",
  "성격과 내면의 작동 방식",
  "재능과 일의 방향",
  "사랑과 인연",
  "재물과 현실 기반",
  "인간관계와 가족의 장",
  "건강과 조후의 균형",
  "대운으로 보는 인생의 큰 장면",
  "가까운 시기의 세운 조언",
  "인생의 책 마지막 문장",
]);
const LIFE_BOOK_CHAPTER_GUIDES = Object.freeze([
  "일간과 월지, 지장간, 오행 분포로 타고난 성정의 원형을 이야기처럼 풉니다.",
  "인성·비겁·식상의 작동으로 마음이 스스로를 지키고 회복하는 방식을 풉니다.",
  "식상·재성·관성의 연결로 재능이 살아나는 자리와 소모되는 자리를 풉니다.",
  "배우자성과 일지, 합충형파해로 사랑에서 반복되는 끌림과 거리감을 풉니다.",
  "재성의 강약과 비겁·식상의 관계로 돈이 들어오고 나가는 리듬을 풉니다.",
  "년주·월주의 뿌리로 가족 안의 역할과 관계에서 지게 되는 책임을 풉니다.",
  "월령과 조후, 오행 과부족으로 몸이 먼저 반응하는 지점을 풉니다.",
  "majorLuck 의 대운 흐름으로 인생의 큰 장면이 바뀌는 시기를 풉니다.",
  "yearlyLuck 으로 가까운 시기에 붙잡을 기회와 조심할 결을 풉니다.",
  "앞선 아홉 장을 한 사람의 이야기로 매듭짓는 마지막 문장을 남깁니다.",
]);
const EXPERT_READING_SPECS = Object.freeze([
  { title: "일간과 월지가 여는 중심 기질", evidenceRefs: ["dayMaster", "seasonalBalance", "pillarDetails.month"] },
  { title: "오행과 조후가 청하는 보완", evidenceRefs: ["fiveElements", "seasonalBalance", "usefulGod"] },
  { title: "십성으로 읽는 관계와 일의 방식", evidenceRefs: ["tenGods", "tenGodsByPillar", "fortuneFacts.strongestTenGods"] },
  { title: "대운과 세운이 비추는 선택의 시기", evidenceRefs: ["majorLuck", "yearlyLuck", "relationSummary"] },
]);
// 섹션 목표치. 총운 = 10×3,000 + 4×1,400 = 35,600자(요구 30,000~60,000 안).
// 인생의 책 = 10×1,200 + 4×600 = 14,400자(요구 10,000~20,000 안).
const SECTION_TARGETS = Object.freeze({
  lifeFortune: Object.freeze({
    chapter: Object.freeze({ minChars: LIFE_FORTUNE_MIN_CHAPTER_CONTENT_CHARS, targetChars: 3000, maxOutputTokens: 10000, minAdvice: 3 }),
    expert: Object.freeze({ minChars: LIFE_FORTUNE_MIN_EXPERT_READING_CONTENT_CHARS, targetChars: 1400, maxOutputTokens: 8000, minAdvice: 2 }),
    frame: Object.freeze({ minChars: 0, targetChars: 0, maxOutputTokens: 2000, minAdvice: 0 }),
  }),
  lifeBook: Object.freeze({
    // maxOutputTokens 는 챕터 상한(총합 26,000 / 10챕터 = 2,600자)에 완충을 더한 값이어야 한다
    // — tokensRequiredForChars(2600) = 6,150(worker/lib/llm-budget.js).
    chapter: Object.freeze({ minChars: LIFE_BOOK_MIN_CHAPTER_CONTENT_CHARS, targetChars: 2000, maxOutputTokens: 7000, minAdvice: 2 }),
    expert: Object.freeze({ minChars: 350, targetChars: 600, maxOutputTokens: 4000, minAdvice: 2 }),
    frame: Object.freeze({ minChars: 0, targetChars: 0, maxOutputTokens: 2000, minAdvice: 0 }),
  }),
});

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
    hasGeminiKey,
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

function shortHash(value, length = 16) {
  const text = clean(value);
  return text ? sha256(text).slice(0, length) : "";
}

function logLifeBookAction(action, details = {}, level = "info") {
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
  console[method]("[LifeBook AI action]", {
    action,
    requestId: clean(details.requestId || "", 180),
    serviceId: clean(details.serviceId || FEATURE_KEY, 80),
    userIdHash: clean(details.userIdHash || shortHash(details.userId), 64),
    profileIdPresent: Boolean(details.profileId || details.profileIdPresent),
    idempotencyKeyHash: clean(details.idempotencyKeyHash || shortHash(details.idempotencyKey || details.requestId), 64),
    providerCallCount: Number(details.providerCallCount || 0) || 0,
    cacheHit: Boolean(details.cacheHit),
    duplicateBlocked: Boolean(details.duplicateBlocked),
    status: clean(details.status || "", 40),
    route: clean(details.route || "", 120),
    reason: clean(details.reason || "", 120),
  });
}

function buildProviderLogContext({ requestId = "", userId = "", idempotencyKey = "", providerCallCount = 0, cacheHit = false, duplicateBlocked = false } = {}) {
  return {
    requestId: clean(requestId, 180),
    serviceId: FEATURE_KEY,
    userIdHash: shortHash(userId),
    profileIdPresent: false,
    idempotencyKeyHash: shortHash(idempotencyKey || requestId),
    providerCallCount,
    cacheHit,
    duplicateBlocked,
  };
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
  if ([FEATURE_KEY, LIFE_FORTUNE_FEATURE_KEY, SERVICE_KEY].includes(text)) return FEATURE_KEY;
  return "";
}

function normalizeConsultationType(value) {
  const text = clean(value || "lifeBook", 40);
  const lower = text.toLowerCase();
  if (["lifeBook", "lifebook", "life-book", "life_book"].includes(text)) return "lifeBook";
  if (["lifefortune", "life-fortune", "life_fortune", "lifeFortune"].includes(text) || ["lifefortune", "life-fortune", "life_fortune"].includes(lower)) return "lifeFortune";
  return "";
}

function isLifeFortuneInput(input = {}) {
  return clean(input.consultationType, 40) === "lifeFortune";
}

function getConsultationOrderName(input = {}) {
  return isLifeFortuneInput(input) ? "인생 총운 전문가 상담" : ORDER_NAME;
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
  const normalizedFocusArea = normalizeFocusArea(body.focusArea, body.topic ?? body.consultationTopic);
  const focusArea = consultationType === "lifeFortune" ? (normalizedFocusArea || "overall") : normalizedFocusArea;
  const topic = consultationType === "lifeFortune"
    ? clean(body.topic ?? body.consultationTopic ?? "전체 인생 총운", 120)
    : clean(body.topic ?? body.consultationTopic ?? FOCUS_AREA_LABELS[focusArea], 120);
  const locale = clean(body.locale || "ko", 12) || "ko";

  if (!serviceType || !consultationType) return { ok: false, message: MESSAGES.invalidInput };
  if (!gender) return { ok: false, message: MESSAGES.invalidInput };
  if (consultationType === "lifeFortune" && gender === "unknown") return { ok: false, message: MESSAGES.genderRequired };
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

// 이 요청이 어느 SKU 로 과금되어야 하는가. 인생의 책 30,000원 / 인생 총운 50,000원.
function getConsultationFeatureKey(input = {}) {
  return isLifeFortuneInput(input) ? LIFE_FORTUNE_FEATURE_KEY : FEATURE_KEY;
}

// 조회(access resolve)에서 허용할 SKU 집합. 총운은 구 SKU 로 결제된 증거도 계속 인정한다.
// 🔴 과금 부작용(apply/cancel/refund)에는 이 집합을 쓰지 말 것 — 반드시 access.featureKey 한 값만 쓴다.
function getAcceptedFeatureKeys(input = {}) {
  return isLifeFortuneInput(input)
    ? [LIFE_FORTUNE_FEATURE_KEY, LEGACY_LIFE_FORTUNE_FEATURE_KEY]
    : [FEATURE_KEY];
}

function getPricing(input = {}) {
  const featureKey = getConsultationFeatureKey(input);
  const resolved = getBillingFeaturePricing({ featureKey });
  const pricing = resolved?.pricing || null;
  const coinPrice = Number(pricing?.coinPrice ?? pricing?.cost);
  const amountKRW = Number(pricing?.amountKRW ?? pricing?.paymentAmount ?? pricing?.cashPrice);
  if (!resolved?.ok || !pricing || !Number.isInteger(coinPrice) || coinPrice <= 0 || !Number.isInteger(amountKRW) || amountKRW <= 0) {
    const error = new Error(`${featureKey} price not found`);
    error.code = "PRICE_NOT_FOUND";
    throw error;
  }
  return {
    featureKey,
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
      featureKey: payload?.featureKey || FEATURE_KEY,
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

async function verifyAccessToken(env, token, acceptedFeatureKeys = [FEATURE_KEY]) {
  const payload = await verifyJwt(token, getAccessTokenSecret(env), {
    issuer: getJwtIssuer(env),
    audience: getJwtAudience(env),
  });
  if (payload?.typ !== ACCESS_TOKEN_TYPE || payload?.serviceKey !== SERVICE_KEY || !acceptedFeatureKeys.includes(payload?.featureKey)) {
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

async function findPaidPayment({ userId, idempotencyKey = "", paymentId = "", acceptedFeatureKeys = [FEATURE_KEY] }) {
  const clauses = [];
  if (idempotencyKey) clauses.push({ idempotencyKey });
  if (paymentId) clauses.push({ merchantUid: paymentId }, { impUid: paymentId }, { requestId: paymentId });
  if (!clauses.length) return null;
  return Payment.findOne({
    userId,
    featureKey: { $in: acceptedFeatureKeys },
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

async function resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash, input = {}, paymentId = "" }) {
  const orderName = getConsultationOrderName(input);
  const featureKey = getConsultationFeatureKey(input);
  const acceptedFeatureKeys = getAcceptedFeatureKeys(input);
  if (isAdmin(auth) || clean(user?.role).toLowerCase() === "admin") {
    return { ok: true, accessType: "admin", accessSource: "admin", paymentId: "", featureKey };
  }

  // canAccessPaidFeature(481)는 내부에 자체 withMongoRetry가 있어 통째 래핑 시 바깥 상한이
  // 안쪽 재시도를 절단한다 — 커버 안 된 read(findPaidPayment)만 개별 래핑.
  const paidPayment = await withMongoRetry(pricing.env, () => findPaidPayment({ userId: auth.userId, idempotencyKey, paymentId, acceptedFeatureKeys }));
  if (paidPayment) {
    const storedHash = clean(paidPayment?.pricingSnapshot?.inputHash);
    if (storedHash && storedHash !== inputHash) return { ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput };
    // 🔴 실제로 결제된 SKU 를 그대로 들고 간다(구 SKU 결제 세션이 신규 키로 정산되면 대사가 어긋난다).
    return { ok: true, accessType: "paid", accessSource: "single_purchase", paymentId: clean(paidPayment.merchantUid || paidPayment.impUid || paymentId, 160), featureKey: clean(paidPayment.featureKey, 80) || featureKey };
  }

  const featureAccess = resolveFeatureAccessPolicy({ user: user || {}, pricing, coinCost: pricing.coinPrice });
  if (featureAccess.allowed) return { ok: true, accessType: featureAccess.accessType || "pass", accessSource: "license_pass", paymentId: "", featureKey };

  // 인증 단계에서 이미 읽은 User 문서를 재사용한다(없으면 내부에서 종전대로 조회).
  const decision = await canAccessPaidFeature(auth.userId, featureKey, { env: pricing.env, reason: orderName, userDoc: auth.authUserDoc });
  if (decision?.allowed) {
    const mapped = mapPaidDecision(decision);
    if (mapped) return { ok: true, ...mapped, paymentId: "", featureKey };
  }

  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

function buildBillingGatePayload(pricing, idempotencyKey, input = {}, inputHash = "") {
  const orderName = getConsultationOrderName(input);
  const consultationType = normalizeConsultationType(input.consultationType || "lifeBook");
  const featureKey = pricing.featureKey || getConsultationFeatureKey(input);
  return {
    billingMode: "coin-gate",
    featureKey,
    serviceId: SERVICE_KEY,
    serviceType: featureKey,
    contentId: featureKey,
    contentType: SERVICE_KEY,
    consultationType,
    orderName,
    reason: orderName,
    cost: pricing.coinPrice,
    coinPrice: pricing.coinPrice,
    amountKRW: pricing.amountKRW,
    amountKrw: pricing.amountKRW,
    paymentAmount: pricing.amountKRW,
    membershipCreditCost: pricing.membershipCreditCost,
    requestId: idempotencyKey,
    idempotencyKey,
    inputHash,
    deferUsage: true,
    runtimeGate: {
      categoryKey: "premium-consultation",
      subFeatureKey: featureKey,
      featureKey,
      consultationType,
      orderName,
      reason: orderName,
      productId: SERVICE_KEY,
      productType: SERVICE_KEY,
      serviceType: featureKey,
      cost: pricing.coinPrice,
      coinPrice: pricing.coinPrice,
      amountKRW: pricing.amountKRW,
      amountKrw: pricing.amountKRW,
      paymentAmount: pricing.amountKRW,
      membershipCreditCost: pricing.membershipCreditCost,
      requestId: idempotencyKey,
      idempotencyKey,
      inputHash,
      deferUsage: true,
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
  const result = objectValue(body.result || gate.result);
  const payment = objectValue(body.payment || gate.payment);
  const consume = objectValue(body.consume || gate.consume);
  const accessGrant = objectValue(body.accessGrant || gate.accessGrant || gate.accessGateResult);
  const pricing = objectValue(body.pricing || gate.pricing);
  const pricingSnapshot = objectValue(body.pricingSnapshot || gate.pricingSnapshot || payment.pricingSnapshot || pricing.pricingSnapshot);
  const runtimeGate = objectValue(body.runtimeGate || gate.runtimeGate || accessGrant.runtimeGate);
  const licensePass = objectValue(body.licensePass || body.membershipPass || gate.licensePass || gate.membershipPass || accessGrant.licensePass || accessGrant.membershipPass);
  const metadata = objectValue(body.metadata || gate.metadata || payment.metadata || consume.metadata || accessGrant.metadata || pricing.metadata || pricingSnapshot.metadata);
  const deferredUsage = objectValue(body.deferredUsage || gate.deferredUsage || result.deferredUsage || metadata.deferredUsage);
  return { gate, runtimeGate, consume, accessGrant, pricing, pricingSnapshot, payment, licensePass, metadata, deferredUsage };
}

function billingFeatureMatches(body = {}, acceptedFeatureKeys = [FEATURE_KEY]) {
  const { gate, runtimeGate, consume, accessGrant, pricing, pricingSnapshot, payment, licensePass, metadata, deferredUsage } = collectBillingObjects(body);
  const keys = [
    body.featureKey,
    body.subFeatureKey,
    body.serviceType,
    gate.featureKey,
    gate.subFeatureKey,
    gate.serviceType,
    runtimeGate.featureKey,
    runtimeGate.subFeatureKey,
    runtimeGate.serviceType,
    consume.featureKey,
    accessGrant.featureKey,
    pricing.featureKey,
    pricing.subFeatureKey,
    pricingSnapshot.featureKey,
    pricingSnapshot.subFeatureKey,
    payment.featureKey,
    licensePass.featureKey,
    metadata.featureKey,
    metadata.subFeatureKey,
    deferredUsage.featureKey,
    deferredUsage.serviceType,
  ].map((item) => clean(item).toLowerCase()).filter(Boolean);
  const accepted = acceptedFeatureKeys.map((key) => key.toLowerCase());
  return keys.some((key) => accepted.includes(key)) || keys.includes(SERVICE_KEY);
}

function addEvidenceId(ids, value) {
  const id = clean(value, 180);
  if (id) ids.add(id);
}

function collectBillingEvidenceIds(body = {}) {
  const ids = new Set();
  const visit = (source, depth = 0) => {
    if (!source || typeof source !== "object" || Array.isArray(source) || depth > 3) return;
    [
      "_id",
      "id",
      "paymentId",
      "merchantUid",
      "merchant_uid",
      "impUid",
      "imp_uid",
      "transactionId",
      "purchaseId",
      "ledgerId",
      "evidenceId",
      "requestId",
      "idempotencyKey",
      "orderId",
      "executionId",
      "pointHistoryId",
      "monthlyCreditLedgerId",
      "receiptId",
    ].forEach((key) => addEvidenceId(ids, source?.[key]));
    [
      "data",
      "billingGate",
      "billing",
      "billingResult",
      "paymentContext",
      "_paymentContext",
      "runtimeGate",
      "consume",
      "accessGrant",
      "accessGateResult",
      "pricing",
      "pricingSnapshot",
      "payment",
      "licensePass",
      "membershipPass",
      "metadata",
      "result",
      "deferredUsage",
      "evidence",
    ].forEach((key) => visit(source?.[key], depth + 1));
  };
  visit(body);
  return [...ids];
}

function collectBillingContractValues(body = {}, field = "") {
  const values = new Set();
  const { gate, runtimeGate, consume, accessGrant, pricing, pricingSnapshot, payment, licensePass, metadata, deferredUsage } = collectBillingObjects(body);
  const deferredEvidence = objectValue(deferredUsage.evidence);
  const sources = [body, gate, runtimeGate, consume, accessGrant, pricing, pricingSnapshot, payment, licensePass, metadata, deferredUsage, deferredEvidence];
  for (const source of sources) {
    addEvidenceId(values, source?.[field]);
    if (field === "requestId" || field === "idempotencyKey") {
      addEvidenceId(values, source?.purchaseId);
      addEvidenceId(values, source?.executionId);
    }
    if (field === "inputHash") {
      addEvidenceId(values, source?.payloadHash);
      addEvidenceId(values, source?.input_hash);
      addEvidenceId(values, source?.pricingSnapshot?.inputHash);
      addEvidenceId(values, source?.pricingSnapshot?.payloadHash);
    }
  }
  return [...values];
}

function billingContractMatches(body = {}, { idempotencyKey = "", inputHash = "", consultationType = "" } = {}) {
  const requestValues = new Set([
    ...collectBillingContractValues(body, "requestId"),
    ...collectBillingContractValues(body, "idempotencyKey"),
  ].map((value) => clean(value, 180)).filter(Boolean));
  if (idempotencyKey && (!requestValues.size || !requestValues.has(idempotencyKey))) return false;

  const inputHashes = collectBillingContractValues(body, "inputHash").map((value) => clean(value, 120)).filter(Boolean);
  if (inputHashes.length && inputHash && !inputHashes.includes(inputHash)) return false;

  const consultationTypes = collectBillingContractValues(body, "consultationType").map((value) => normalizeConsultationType(value)).filter(Boolean);
  if (consultationTypes.length && consultationType && !consultationTypes.includes(consultationType)) return false;

  return true;
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
    clauses.push({ "metadata.requestId": id });
    clauses.push({ "metadata.idempotencyKey": id });
    clauses.push({ "metadata.purchaseId": id });
    clauses.push({ "metadata.transactionId": id });
    clauses.push({ "metadata.paymentId": id });
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

function billingContractEvidenceClauses({ idempotencyKey = "", inputHash = "" } = {}) {
  const clauses = [];
  if (idempotencyKey) {
    clauses.push(
      { requestId: idempotencyKey },
      { idempotencyKey },
      { executionId: idempotencyKey },
      { orderId: idempotencyKey },
      { sourceId: idempotencyKey },
      { "metadata.requestId": idempotencyKey },
      { "metadata.idempotencyKey": idempotencyKey },
      { "metadata.orderId": idempotencyKey },
      { "metadata.purchaseId": idempotencyKey },
      { "metadata.sourceId": idempotencyKey },
      { "result.deferredUsage.requestId": idempotencyKey },
      { "result.deferredUsage.idempotencyKey": idempotencyKey },
      { "result.deferredUsage.purchaseId": idempotencyKey },
      { "result.deferredUsage.evidence.requestId": idempotencyKey },
    );
  }
  if (inputHash) {
    clauses.push(
      { inputHash },
      { payloadHash: inputHash },
      { "metadata.inputHash": inputHash },
      { "metadata.payloadHash": inputHash },
      { "pricingSnapshot.inputHash": inputHash },
      { "pricingSnapshot.payloadHash": inputHash },
      { "result.deferredUsage.inputHash": inputHash },
      { "result.deferredUsage.payloadHash": inputHash },
      { "result.deferredUsage.evidence.inputHash": inputHash },
      { "result.deferredUsage.evidence.payloadHash": inputHash },
    );
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

async function resolveBillingGateAccess({ env, auth, body, idempotencyKey = "", inputHash = "", consultationType = "", acceptedFeatureKeys = [FEATURE_KEY] }) {
  // 🔴 조회는 허용 집합, 반환은 실제로 매칭된 한 키. 이 값이 이후 apply/cancel/refund 의 정본이 된다.
  const fallbackFeatureKey = acceptedFeatureKeys[0] || FEATURE_KEY;
  if (!billingFeatureMatches(body, acceptedFeatureKeys)) return null;
  if (!billingContractMatches(body, { idempotencyKey, inputHash, consultationType })) return null;
  const ids = collectBillingEvidenceIds(body);
  if (!ids.length) return null;
  const contractClauses = billingContractEvidenceClauses({ idempotencyKey, inputHash });

  await connectDb(env);
  const deferredClauses = [];
  for (const id of ids) {
    deferredClauses.push({ requestId: id }, { executionId: id }, { paymentId: id }, { orderId: id });
    if (objectIdLike(id)) deferredClauses.push({ _id: id });
  }
  const deferredRecord = deferredClauses.length
    ? await PaidExecutionRecord.findOne({
      userId: clean(auth.userId),
      featureId: { $in: acceptedFeatureKeys },
      status: { $in: ["paid_pending_generation", "generating", "generation_failed", "completed"] },
      $and: [
        { $or: deferredClauses },
        ...(contractClauses.length ? [{ $or: contractClauses }] : []),
      ],
    }).sort({ updatedAt: -1, createdAt: -1 }).select("_id executionId accessMethod paymentId result status featureId").lean()
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
      featureKey: clean(deferredRecord.featureId, 80) || fallbackFeatureKey,
    };
  }

  const pointClauses = pointHistoryEvidenceClauses(ids);
  const pointHistory = pointClauses.length
    ? await PointHistory.findOne({
      userId: auth.userId,
      kind: "deduct",
      featureKey: { $in: acceptedFeatureKeys },
      "metadata.refundedForServiceExecution": { $ne: true },
      $and: [
        { $or: pointClauses },
        ...(contractClauses.length ? [{ $or: contractClauses }] : []),
      ],
    }).sort({ createdAt: -1 }).select("_id delta metadata featureKey").lean()
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
      featureKey: clean(pointHistory.featureKey, 80) || fallbackFeatureKey,
    };
  }

  const ledgerClauses = monthlyLedgerEvidenceClauses(ids);
  const ledger = ledgerClauses.length
    ? await MonthlyCreditLedger.findOne({
      userId: auth.userId,
      type: "MONTHLY_CREDIT_SPEND",
      serviceKey: { $in: [...acceptedFeatureKeys, SERVICE_KEY] },
      "metadata.refundedForServiceExecution": { $ne: true },
      $and: [
        { $or: ledgerClauses },
        ...(contractClauses.length ? [{ $or: contractClauses }] : []),
      ],
    }).sort({ createdAt: -1 }).select("_id amount sourceId serviceKey").lean()
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
      featureKey: acceptedFeatureKeys.includes(clean(ledger.serviceKey, 80)) ? clean(ledger.serviceKey, 80) : fallbackFeatureKey,
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
        ...(contractClauses.length ? [{ $or: contractClauses }] : []),
        {
          $or: [
            { featureKey: { $in: acceptedFeatureKeys } },
            { "pricingSnapshot.featureKey": { $in: acceptedFeatureKeys } },
            { "metadata.featureKey": { $in: acceptedFeatureKeys } },
          ],
        },
      ],
    }).sort({ paidAt: -1, updatedAt: -1, createdAt: -1 }).select("_id merchantUid impUid requestId featureKey").lean()
    : null;
  if (payment) {
    return {
      ok: true,
      accessType: "paid",
      accessSource: "billing_gate",
      paymentId: clean(payment.merchantUid || payment.impUid || payment.requestId || payment._id, 160),
      evidenceType: "payment",
      evidenceId: String(payment._id || ""),
      featureKey: clean(payment.featureKey, 80) || fallbackFeatureKey,
    };
  }

  return null;
}

/** 관리자 CMS 가 기본값을 보여줄 때 읽어 간다(worker/lib/cms-prompt-defaults.js). */
export function getDefaultSystemPrompt() {
  return buildSystemPrompt();
}

/* 관리자 프롬프트 랩 전용. 결제·LLM 없이 프로덕션과 똑같은 프롬프트를 조립한다
   (lib/admin/prompt-lab-registry.mjs 참고). 장(section)이 여러 개라 variants 로 목록을 함께 돌려주고,
   options.variant 로 고른 장의 프롬프트를 만든다. */
export function buildAdminLabPrompt(body = {}, options = {}) {
  // 분야는 프로덕션에서 사용자가 화면에서 고르는 값이라 랩에서는 기본값으로 채운다.
  // 이 기능의 "질문"은 상담 주제(topic)로 들어간다 — 프롬프트 안에서 그 이름으로 쓰인다.
  const question = String(body?.question || "").trim();
  const normalized = normalizeConsultationInput({
    focusArea: "overall",
    ...body,
    ...(question ? { topic: question } : {}),
  });
  if (!normalized.ok) {
    throw new Error(normalized.message || "인생의 책 프롬프트에 필요한 입력이 부족합니다.");
  }

  const sajuResult = calculateLifeBookAiSaju(normalized.input.birthInfo);
  const plan = buildSectionPlan(normalized.input);
  const section = plan.find((item) => item.id === options.variant) || plan[0];
  if (!section) throw new Error("인생의 책 섹션 구성을 만들지 못했습니다.");

  const consultationType = isLifeFortuneInput(normalized.input) ? "lifeFortune" : "lifeBook";

  return {
    systemPrompt: buildSystemPrompt(consultationType),
    prompt: buildSectionPrompt(normalized.input, pickSajuSlice(sajuResult, section.evidenceRefs), section, ""),
    variantKey: section.id,
    variants: plan.map((item) => ({ key: item.id, label: item.title || item.id })),
  };
}

function buildSystemPrompt(consultationType = "lifeBook") {
  const isFortune = consultationType === "lifeFortune";
  const toneLines = isFortune
    ? [
      "이 상담은 '인생 총운' — 서사보다 정확한 진단과 통찰이 중심입니다. 문장마다 명리 근거(일간, 용신, 십성, 대운)를 붙이고, 근거 없는 덕담과 보일러플레이트('당신은 특별합니다' 류)는 금지합니다.",
      "강점과 리스크를 균형 있게 제시합니다. 리스크를 말할 때는 반드시 조절 방법을 함께 붙이고, 강점을 말할 때는 그것이 통하는 조건을 함께 붙입니다.",
    ]
    : [
      "이 상담은 '인생의 책' — 읽는 경험 자체가 선물인 서사형 리포트입니다. 각 장은 설명문 나열이 아니라, 한 사람의 인생 소설을 곁에서 읽어 주는 다정한 화자의 이야기로 씁니다.",
      "명리 근거는 각주처럼 나열하지 말고 이야기 속 문장으로 자연스럽게 녹입니다. 예: '경금 일간의 당신은…'처럼 근거가 서사의 일부가 되게 하되, 근거 없는 뜬구름 덕담으로 문단을 채우지 않습니다.",
      "화자의 시점과 톤은 처음부터 끝까지 같은 사람이 읽어 주듯 일관되게 유지합니다.",
    ];
  return [
    "당신은 30년 경력의 사주 명리학자이자, 한 사람의 삶을 조용히 오래 살펴 온 운명 상담가입니다.",
    "사용자의 생년월일, 성별, 출생시간, 계산된 사주 명리 데이터를 바탕으로 삶의 흐름을 한 권의 책처럼 읽어 줍니다.",
    ...toneLines,
    "질문에 짧게 답하지 말고, 타고난 사주, 성격, 사랑, 일, 재물, 대운, 세운, 삶의 목적이 서로 이어지는 깊은 상담문으로 작성합니다.",
    "각 장은 명식에서 드러나는 근거, 그 근거가 삶에서 만드는 의미, 지금 현실에서 선택할 수 있는 조언의 순서로 자연스럽게 흐르게 합니다.",
    "인생을 단정하거나 겁주지 말고, 사용자가 앞으로 선택할 수 있는 방향을 부드럽고도 분명하게 비춥니다.",
    "“당신은 이렇게 살 운명이다”, “반드시 실패한다”, “무조건 성공한다” 같은 단정적 표현을 쓰지 않습니다.",
    `십성 이름은 계산 데이터에 있는 이름만 그대로 사용합니다. 허용되는 십성 이름: ${CANONICAL_TEN_GODS.join(", ")}.`,
    "명식, 십성, 대운, 세운은 서버 계산 JSON의 값을 근거로 삼고, 계산 데이터에 없는 간지·십성·대운 시작일을 새로 만들지 않습니다.",
    "각 장은 자연스러운 한국어 문장으로 충분히 길고 구체적으로 작성하되, 같은 표현과 같은 결론을 반복하지 않습니다.",
    "사용자가 실제로 오늘 선택할 수 있는 행동 조언을 포함하고, 조언은 감정 위로와 현실적 방향이 함께 느껴지게 씁니다.",
    "PDF, 다운로드, 진행률, job, prompt, system, AI 같은 기술 표현은 결과에 드러내지 않습니다.",
  ].join("\n");
}

function getSectionTargets(lifeFortune) {
  return lifeFortune ? SECTION_TARGETS.lifeFortune : SECTION_TARGETS.lifeBook;
}

// 15섹션(장 10 + 깊은 판독 4 + 프레임 1). 장 제목·evidenceRefs 는 품질 게이트가 검사하는 정본을 그대로 쓴다.
function buildSectionPlan(input = {}) {
  const lifeFortune = isLifeFortuneInput(input);
  const targets = getSectionTargets(lifeFortune);
  const chapterTitles = lifeFortune ? LIFE_FORTUNE_CHAPTER_TITLES : LIFE_BOOK_CHAPTER_TITLES;
  const chapterGuides = lifeFortune ? LIFE_FORTUNE_CHAPTER_GUIDES : LIFE_BOOK_CHAPTER_GUIDES;
  const sections = chapterTitles.map((title, index) => ({
    id: `chapter-${index + 1}`,
    kind: "chapter",
    index,
    title,
    guide: chapterGuides[index] || "",
    evidenceRefs: LIFE_FORTUNE_CHAPTER_EVIDENCE_REFS[index] || [],
    minChars: targets.chapter.minChars,
    targetChars: targets.chapter.targetChars,
    maxOutputTokens: targets.chapter.maxOutputTokens,
    minAdvice: targets.chapter.minAdvice,
  }));
  EXPERT_READING_SPECS.forEach((spec, index) => {
    sections.push({
      id: `expert-${index + 1}`,
      kind: "expert",
      index,
      title: spec.title,
      guide: "",
      evidenceRefs: spec.evidenceRefs,
      minChars: targets.expert.minChars,
      targetChars: targets.expert.targetChars,
      maxOutputTokens: targets.expert.maxOutputTokens,
      minAdvice: targets.expert.minAdvice,
    });
  });
  sections.push({
    id: "frame",
    kind: "frame",
    index: 0,
    title: lifeFortune ? "인생 총운" : "인생의 책",
    guide: "",
    evidenceRefs: [],
    minChars: targets.frame.minChars,
    targetChars: targets.frame.targetChars,
    maxOutputTokens: targets.frame.maxOutputTokens,
    minAdvice: 0,
  });
  return sections;
}

// 섹션이 실제로 참조하는 루트만 추린다. 계산 JSON 전량을 15번 반복 전송하면 입력 토큰이 15배가 되고
// TTFT 도 그만큼 늘어나 웨이브가 엣지 예산을 넘긴다.
const SECTION_SAJU_BASE_ROOTS = Object.freeze([
  "yearPillar",
  "monthPillar",
  "dayPillar",
  "hourPillar",
  "dayMaster",
  "fiveElements",
  "strength",
  "seasonalBalance",
  "calculationMeta",
]);

function pickSajuSlice(sajuResult, evidenceRefs = []) {
  if (!sajuResult || typeof sajuResult !== "object") return sajuResult;
  const roots = new Set(SECTION_SAJU_BASE_ROOTS);
  for (const ref of evidenceRefs) {
    const root = evidenceRefRoot(ref);
    if (root) roots.add(root);
  }
  const slice = {};
  for (const root of roots) {
    if (sajuResult[root] !== undefined) slice[root] = sajuResult[root];
  }
  return slice;
}

function buildSectionSchema(section, birth, lifeFortune) {
  if (section.kind === "frame") {
    return {
      title: lifeFortune ? "인생 총운" : "인생의 책",
      subtitle: "",
      profileSummary: {
        name: birth.name || "",
        birthDate: birth.birthDate || "",
        calendarType: birth.calendarType === "lunar" ? "음력" : "양력",
        birthTime: birth.birthTimeUnknown ? "모름" : birth.birthTime || "",
        gender: birth.gender || "",
      },
      coreSummary: { oneLine: "", lifeTheme: "", strongestElement: "", neededBalance: "" },
      finalMessage: "",
    };
  }
  if (section.kind === "expert") {
    return lifeFortune
      ? { title: section.title, content: "", guidance: [], evidenceRefs: section.evidenceRefs }
      : { title: section.title, content: "", guidance: [] };
  }
  return lifeFortune
    ? { chapterNumber: section.index + 1, title: section.title, summary: "", content: "", advice: [], evidenceRefs: section.evidenceRefs }
    : { chapterNumber: section.index + 1, title: section.title, summary: "", content: "", advice: [] };
}

function buildSectionPrompt(input, sajuSlice, section, digest = "") {
  const lifeFortune = isLifeFortuneInput(input);
  const birth = input.birthInfo || {};
  const reportName = lifeFortune ? "인생 총운 상담문" : "인생의 책 상담문";
  const lines = [
    `${reportName} 중 아래에 지정된 한 조각만 작성하세요. 다른 장은 쓰지 마세요.`,
    "문체는 전문 명리학자가 한 사람을 오래 마주하고 직접 읽어 주듯 따뜻하고 깊게 유지하세요.",
    "반드시 JSON 객체 하나만 반환하세요. Markdown 제목, 코드블록, 안내 문장 없이 JSON만 남기세요.",
    "",
    "[사용자 입력]",
    `- 이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `- 성별: ${birth.gender}`,
    `- 생년월일: ${birth.birthDate}`,
    `- 출생시간: ${birth.birthTimeUnknown ? "모름" : birth.birthTime}`,
    `- 달력 기준: ${birth.calendarType === "lunar" ? "음력" : "양력"}`,
    `- 상담 주제: ${input.topic || (lifeFortune ? "전체 인생 총운" : "전체 인생 흐름")}`,
    "",
    "[계산 가능한 사주 명리 데이터]",
    JSON.stringify(sajuSlice),
    "",
    "[이번에 쓸 조각]",
  ];

  if (section.kind === "frame") {
    lines.push(
      "이 조각은 상담문 전체의 표지입니다. 제목, 부제, 핵심 요약(한 줄 요약·삶의 주제·가장 강한 기운·보완할 균형), 마지막 문장을 씁니다.",
      lifeFortune
        ? "title 은 반드시 \"인생 총운\" 을 포함하세요."
        : "title 은 인생의 책의 결을 유지하세요.",
      "finalMessage 는 상담을 닫는 세 문장 이내의 문단으로 씁니다.",
    );
  } else if (section.kind === "expert") {
    lines.push(
      `깊은 판독 ${section.index + 1}: "${section.title}".`,
      `content 는 최소 ${section.minChars}자 이상, 목표 ${section.targetChars}자 안팎으로 쓰세요.`,
      `guidance 는 현실에서 바로 쓸 수 있는 조언을 ${section.minAdvice}개 이상 담으세요.`,
      "원국·오행·조후·십성·대운·세운 중 이 판독의 관점에서만 깊게 파고들고, 다른 판독과 겹치지 마세요.",
    );
  } else {
    lines.push(
      `${section.index + 1}장: "${section.title}".`,
      section.guide ? `이 장에서 풀 내용: ${section.guide}` : "",
      `summary 는 이 장의 핵심을 한 문장으로, content 는 최소 ${section.minChars}자 이상(목표 ${section.targetChars}자 안팎), advice 는 ${section.minAdvice}개 이상 담으세요.`,
      "content 는 명식 근거 → 삶에서 드러나는 의미 → 현실에서 조정할 선택의 순서로 자연스럽게 이어 주세요.",
    );
  }

  if (lifeFortune && section.evidenceRefs.length) {
    lines.push(
      `evidenceRefs 는 계산 JSON 안의 경로만 적고 ${section.kind === "chapter" ? 3 : 2}개 이상 담으세요. 기본값으로 ${section.evidenceRefs.join(", ")} 를 쓰되, 실제로 근거로 삼은 경로가 있으면 그것으로 바꿔도 됩니다.`,
      `evidenceRefs 의 첫 경로는 다음 중 하나여야 합니다: ${LIFE_FORTUNE_EVIDENCE_REF_ROOTS.join(", ")}.`,
      "대운은 majorLuck 의 direction, startSolarDate, currentCycle, cycles, natalInteractions 값만, 세운은 yearlyLuck 의 year, pillar, stemTenGod, majorLuckPillar, natalInteractions 값만 근거로 삼으세요.",
      "합·충·형·파·해, 삼합, 방합은 계산 JSON 의 natalInteractions 에 있는 항목만 말하세요.",
    );
  }

  if (digest) {
    lines.push(
      "",
      "[이미 쓰인 다른 조각의 첫 문장들 — 같은 문장·같은 결론을 반복하지 마세요]",
      digest,
    );
  }

  lines.push(
    "",
    "[반환 JSON 구조]",
    JSON.stringify(buildSectionSchema(section, birth, lifeFortune)),
    "",
    "십성 이름은 계산 데이터의 tenGods 키와 허용 목록에 있는 이름만 사용하고, 없는 십성 이름을 새로 만들지 마세요.",
    "출생시간을 모르는 입력이거나 계산 데이터가 제한적이면 단정하지 말고 계산 가능한 범위에서만 상담하세요.",
    "분량이 부족할 때 같은 문장을 늘리지 말고, 일간·월지·오행·조후·십성·대운·세운을 더 세밀하게 판독해 채우세요.",
    "content 안에서는 문단 사이를 빈 줄로 구분하고 핵심 문구만 **굵게** 표시하세요. 필요할 때만 '-' 목록을 쓰고, 그 외 마크다운(제목 #, 코드블록, 표)은 쓰지 마세요.",
  );

  return lines.filter((line) => line !== "").join("\n");
}

function cleanForbiddenResult(value) {
  const trimmed = clean(value, LIFE_BOOK_RESULT_TEXT_MAX_CHARS);
  // 🔴 삭제는 ko 에서만. FORBIDDEN_RESULT_PATTERN 에 \bPDF\b·\bprogress\b·\bjob\b·\bAI\b 가 들어 있어
  // 비-ko 에서 돌리면 영어 상담문의 정상 단어가 문장 중간에서 사라진다.
  const stripped = canStripForbiddenText()
    ? trimmed.replace(FORBIDDEN_RESULT_PATTERN, "")
    : trimmed;
  return stripped.replace(/\n{3,}/g, "\n\n").trim();
}

function extractReportJson(content) {
  const raw = clean(content, LIFE_BOOK_RESULT_TEXT_MAX_CHARS).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
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

function cleanEvidenceRefs(value) {
  return Array.isArray(value)
    ? value.map((item) => clean(item, 160)).filter(Boolean)
    : [];
}

function evidenceRefRoot(ref = "") {
  return clean(ref, 160).split(".")[0] || "";
}

function hasValidEvidenceRefs(refs = [], minCount = 1) {
  const cleaned = cleanEvidenceRefs(refs);
  if (cleaned.length < minCount) return false;
  return cleaned.every((ref) => LIFE_FORTUNE_EVIDENCE_REF_ROOTS.includes(evidenceRefRoot(ref)));
}

function getLifeBookReportQualityIssues(content, input = {}) {
  const issues = [];
  const text = clean(content, LIFE_BOOK_RESULT_TEXT_MAX_CHARS);
  const lifeFortune = isLifeFortuneInput(input);
  const minChapterContentChars = lifeFortune ? LIFE_FORTUNE_MIN_CHAPTER_CONTENT_CHARS : LIFE_BOOK_MIN_CHAPTER_CONTENT_CHARS;
  const minExpertReadingContentChars = lifeFortune ? LIFE_FORTUNE_MIN_EXPERT_READING_CONTENT_CHARS : 350;
  const minTotalContentChars = lifeFortune ? LIFE_FORTUNE_MIN_TOTAL_CONTENT_CHARS : LIFE_BOOK_MIN_TOTAL_CONTENT_CHARS;
  const maxTotalContentChars = lifeFortune ? LIFE_FORTUNE_MAX_TOTAL_CONTENT_CHARS : LIFE_BOOK_MAX_TOTAL_CONTENT_CHARS;
  if (!text) return ["empty_result"];
  if (hasForbiddenResultTerms(text)) issues.push("forbidden_terms");
  const report = extractReportJson(text);
  if (!report) {
    issues.push("report_json_missing");
    if (text.length < minTotalContentChars) issues.push("total_content_too_short");
    if (text.length > maxTotalContentChars) issues.push("total_content_too_long");
    return issues;
  }

  if (lifeFortune && !clean(report.title, 120).includes("인생 총운")) issues.push("life_fortune_title_missing");

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
    if (lifeFortune && !clean(chapter?.title, 120).includes(LIFE_FORTUNE_CHAPTER_TITLES[index] || "")) issues.push(`chapter_${chapterNumber}_title_mismatch`);
    if (lifeFortune && !hasValidEvidenceRefs(chapter?.evidenceRefs, 3)) issues.push(`chapter_${chapterNumber}_evidence_refs_missing`);
    if (!summary) issues.push(`chapter_${chapterNumber}_summary_missing`);
    if (!chapterContent) issues.push(`chapter_${chapterNumber}_content_missing`);
    if (chapterContent && chapterContent.length < minChapterContentChars) issues.push(`chapter_${chapterNumber}_content_too_short`);
    if (advice.length < (lifeFortune ? 3 : 1)) issues.push(`chapter_${chapterNumber}_advice_missing`);
  });

  const expertReadings = Array.isArray(report.expertReadings) ? report.expertReadings : [];
  if (lifeFortune && expertReadings.length < 4) issues.push("expert_reading_count_too_short");
  expertReadings.forEach((reading, index) => {
    const readingNumber = index + 1;
    const title = clean(reading?.title, 200);
    const readingContent = clean(reading?.content, 12000);
    const guidance = Array.isArray(reading?.guidance)
      ? reading.guidance.map((item) => clean(item, 1000)).filter(Boolean)
      : [];
    totalContentLength += readingContent.length;
    if (lifeFortune && !hasValidEvidenceRefs(reading?.evidenceRefs, 2)) issues.push(`expert_reading_${readingNumber}_evidence_refs_missing`);
    if (!title) issues.push(`expert_reading_${readingNumber}_title_missing`);
    if (!readingContent) issues.push(`expert_reading_${readingNumber}_content_missing`);
    if (readingContent && readingContent.length < minExpertReadingContentChars) issues.push(`expert_reading_${readingNumber}_content_too_short`);
    if (readingContent && !guidance.length) issues.push(`expert_reading_${readingNumber}_guidance_missing`);
  });

  if (totalContentLength < minTotalContentChars) issues.push("total_content_too_short");
  if (totalContentLength > maxTotalContentChars) issues.push("total_content_too_long");

  // 장 간 중복 서사 검출: 20자 이상 동일 문장이 서로 다른 장에 다시 나오면 반려
  const sentenceOwner = new Map();
  let duplicateCount = 0;
  chapters.forEach((chapter, index) => {
    const sentences = clean(chapter?.content, 20000)
      .split(/(?<=[.!?다요])\s+|\n+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length >= 20);
    for (const sentence of new Set(sentences)) {
      if (sentenceOwner.has(sentence) && sentenceOwner.get(sentence) !== index) duplicateCount += 1;
      else sentenceOwner.set(sentence, index);
    }
  });
  if (duplicateCount >= 3) issues.push(`duplicate_narrative:${duplicateCount}`);
  return issues;
}

function hasForbiddenResultTerms(value) {
  FORBIDDEN_RESULT_PATTERN.lastIndex = 0;
  return FORBIDDEN_RESULT_PATTERN.test(value);
}

// nakshatra-ai.js / master-love-codex.js 와 같은 구현. 한 요청 = 1 웨이브라 동시성은 4로 고정한다
// (Workers 동시 연결 6 + AI 라우트 레이트리밋 안전선).
async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = new Array(Math.min(Math.max(1, limit), items.length || 1)).fill(null).map(async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

function resolveSectionTimeoutMs(env = {}) {
  // 🔴 clampSyncLlmTimeoutMs 는 0/음수/NaN 을 받으면 상한 85s 로 되돌아간다 — 하한 가드가 반드시 앞에 있어야 한다.
  const requested = Number(env.LIFE_BOOK_AI_TIMEOUT_MS) || SECTION_TIMEOUT_MS;
  return clampSyncLlmTimeoutMs(Math.max(15000, requested));
}

// 🔴 절대 throw 하지 않는다. 한 섹션의 실패가 같은 웨이브의 나머지를 죽이면 안 된다.
async function generateSectionOnce(env, section, prompt, options = {}) {
  const startedAt = Date.now();
  const base = {
    id: section.id,
    kind: section.kind,
    ok: false,
    body: null,
    chars: 0,
    provider: "",
    model: "",
    promptChars: prompt.length,
    durationMs: 0,
    parsed: false,
    error: "",
  };
  try {
    const ai = await callGeminiText(env, prompt, {
      systemPrompt: buildSystemPrompt(options.consultationType || "lifeBook"),
      taskType: "fortune",
      temperature: options.temperature || 0.72,
      maxOutputTokens: section.maxOutputTokens,
      timeoutMs: resolveSectionTimeoutMs(env),
      // 폴백은 켜 둔다. 섹션 목표가 3,000자까지 내려오면 Workers AI 실측 정지점(≈1,700자)이
      // 이 문턱을 넘기므로, 단일 3만자 호출에서 무용지물이던 폴백이 여기서는 실제 안전망이 된다.
      fallbackMinChars: Math.round(section.minChars * 0.4),
      logContext: options.logContext,
      cache: options.cache,
    });
    base.durationMs = Date.now() - startedAt;
    const provider = clean(ai?.provider || ai?.model || "gemini");
    const isMock = /mock/i.test(provider) || ai?.isMock === true;
    const text = clean(ai?.text);
    base.provider = provider;
    base.model = clean(ai?.model);
    if (!ai?.ok || isMock || !text) {
      base.error = isMock ? "MOCK_PROVIDER_BLOCKED" : clean(ai?.message || ai?.error || "LLM generation failed.", 300);
      return base;
    }
    const parsed = extractReportJson(cleanForbiddenResult(text));
    if (!parsed) {
      base.error = "SECTION_JSON_MISSING";
      return base;
    }
    base.parsed = true;
    const normalizedBody = normalizeSectionBody(section, parsed);
    base.body = normalizedBody;
    base.chars = sectionBodyChars(section, normalizedBody);
    base.ok = section.kind === "frame" ? true : base.chars > 0;
    if (!base.ok) base.error = "SECTION_CONTENT_EMPTY";
    return base;
  } catch (error) {
    base.durationMs = Date.now() - startedAt;
    base.error = clean(error?.code || error?.message || error, 300);
    return base;
  }
}

function toStringList(value, maxItems = 12) {
  return Array.isArray(value)
    ? value.map((item) => clean(item, 1000)).filter(Boolean).slice(0, maxItems)
    : [];
}

function normalizeSectionBody(section, parsed) {
  if (section.kind === "frame") {
    const core = parsed.coreSummary && typeof parsed.coreSummary === "object" ? parsed.coreSummary : {};
    return {
      title: clean(parsed.title, 120) || section.title,
      subtitle: clean(parsed.subtitle, 300),
      profileSummary: parsed.profileSummary && typeof parsed.profileSummary === "object" ? parsed.profileSummary : {},
      coreSummary: {
        oneLine: clean(core.oneLine, 400),
        lifeTheme: clean(core.lifeTheme, 200),
        strongestElement: clean(core.strongestElement, 200),
        neededBalance: clean(core.neededBalance, 200),
      },
      finalMessage: clean(parsed.finalMessage, 2000),
    };
  }
  if (section.kind === "expert") {
    return {
      title: clean(parsed.title, 200) || section.title,
      content: clean(parsed.content, 20000),
      guidance: toStringList(parsed.guidance),
      evidenceRefs: cleanEvidenceRefs(parsed.evidenceRefs).length
        ? cleanEvidenceRefs(parsed.evidenceRefs)
        : [...section.evidenceRefs],
    };
  }
  return {
    chapterNumber: section.index + 1,
    title: clean(parsed.title, 200) || section.title,
    summary: clean(parsed.summary, 1200),
    content: clean(parsed.content, 20000),
    advice: toStringList(parsed.advice),
    evidenceRefs: cleanEvidenceRefs(parsed.evidenceRefs).length
      ? cleanEvidenceRefs(parsed.evidenceRefs)
      : [...section.evidenceRefs],
  };
}

function sectionBodyChars(section, body) {
  if (!body) return 0;
  if (section.kind === "frame") return clean(body.finalMessage, 2000).length;
  return clean(body.content, 20000).length;
}

// 앞 섹션의 첫 문장만 모아 장 간 중복 서사(duplicate_narrative)를 억제한다.
function buildSectionDigest(plan, sections, currentId) {
  const parts = [];
  for (const section of plan) {
    if (section.id === currentId || section.kind === "frame") continue;
    const stored = sections[section.id];
    const content = clean(stored?.body?.content, 20000);
    if (!content) continue;
    const first = content.split(/(?<=[.!?다요])\s+|\n+/).map((s) => s.trim()).find((s) => s.length >= 20);
    if (first) parts.push(`- ${section.title}: ${first.slice(0, 160)}`);
  }
  return parts.join("\n");
}

function assembleReport(input, plan, sections) {
  const lifeFortune = isLifeFortuneInput(input);
  const birth = input.birthInfo || {};
  const frame = sections.frame?.body || null;
  const chapters = plan
    .filter((section) => section.kind === "chapter")
    .map((section) => sections[section.id]?.body)
    .filter(Boolean);
  const expertReadings = plan
    .filter((section) => section.kind === "expert")
    .map((section) => sections[section.id]?.body)
    .filter(Boolean);
  return {
    title: clean(frame?.title, 120) || (lifeFortune ? "인생 총운" : "인생의 책"),
    subtitle: clean(frame?.subtitle, 300) || (lifeFortune
      ? "타고난 명식과 시간의 흐름으로 읽는 삶의 큰 방향"
      : "타고난 사주와 시간의 흐름으로 읽는 삶의 장면"),
    profileSummary: {
      name: birth.name || "",
      birthDate: birth.birthDate || "",
      calendarType: birth.calendarType === "lunar" ? "음력" : "양력",
      birthTime: birth.birthTimeUnknown ? "모름" : birth.birthTime || "",
      gender: birth.gender || "",
    },
    coreSummary: frame?.coreSummary || { oneLine: "", lifeTheme: "", strongestElement: "", neededBalance: "" },
    chapters,
    expertReadings,
    finalMessage: clean(frame?.finalMessage, 2000),
    pdfSections: [],
  };
}

function reportTotalContentChars(report) {
  const chapters = Array.isArray(report?.chapters) ? report.chapters : [];
  const readings = Array.isArray(report?.expertReadings) ? report.expertReadings : [];
  return chapters.reduce((sum, chapter) => sum + clean(chapter?.content, 20000).length, 0)
    + readings.reduce((sum, reading) => sum + clean(reading?.content, 12000).length, 0);
}

// 품질 이슈를 책임 섹션에 되돌린다. 이슈 코드가 chapter_{n}_* / expert_reading_{n}_* 형태라 기계적으로 매핑된다.
// 🔴 전체 재생성 금지 — 결손이 있는 섹션만 다시 쓴다.
function mapIssuesToSections(issues = [], plan = [], sections = {}) {
  const targets = new Set();
  let trimOnly = false;
  for (const raw of issues) {
    const issue = String(raw || "");
    const chapterMatch = issue.match(/^chapter_(\d+)_/);
    if (chapterMatch) {
      targets.add(`chapter-${Number(chapterMatch[1])}`);
      continue;
    }
    const expertMatch = issue.match(/^expert_reading_(\d+)_/);
    if (expertMatch) {
      targets.add(`expert-${Number(expertMatch[1])}`);
      continue;
    }
    if (issue.startsWith("duplicate_narrative")) {
      // 중복 문장의 뒤쪽 소유 섹션부터 다시 쓴다.
      const withContent = plan.filter((section) => section.kind === "chapter" && sections[section.id]?.body);
      const last = withContent[withContent.length - 1];
      if (last) targets.add(last.id);
      continue;
    }
    if (issue === "total_content_too_short") {
      // 가장 짧은 장부터 보강한다.
      const shortest = plan
        .filter((section) => section.kind === "chapter")
        .map((section) => ({ id: section.id, chars: sections[section.id]?.chars || 0 }))
        .sort((a, b) => a.chars - b.chars)[0];
      if (shortest) targets.add(shortest.id);
      continue;
    }
    if (issue === "total_content_too_long") {
      // 추가 호출 없이 절단으로 해소한다.
      trimOnly = true;
      continue;
    }
    if (issue === "life_fortune_title_missing" || issue === "chapter_count_mismatch" || issue === "expert_reading_count_too_short") {
      if (issue === "life_fortune_title_missing") targets.add("frame");
      continue;
    }
    if (issue === "forbidden_terms" || issue === "report_json_missing" || issue === "empty_result") {
      continue;
    }
  }
  return { targets: [...targets], trimOnly };
}

// total_content_too_long 은 재생성 없이 가장 긴 장을 문단 경계에서 잘라 해소한다.
function trimLongestChapter(sections, plan, overflowChars) {
  const chapterIds = plan.filter((section) => section.kind === "chapter").map((section) => section.id);
  let longest = "";
  let longestChars = 0;
  for (const id of chapterIds) {
    const chars = sections[id]?.chars || 0;
    if (chars > longestChars) {
      longestChars = chars;
      longest = id;
    }
  }
  if (!longest) return false;
  const body = sections[longest].body;
  const content = clean(body?.content, 20000);
  const keep = Math.max(600, content.length - overflowChars);
  const paragraphs = content.split(/\n{2,}/);
  let trimmed = "";
  for (const paragraph of paragraphs) {
    if (trimmed && (trimmed.length + paragraph.length + 2) > keep) break;
    trimmed = trimmed ? `${trimmed}\n\n${paragraph}` : paragraph;
  }
  if (!trimmed || trimmed.length >= content.length) return false;
  sections[longest] = {
    ...sections[longest],
    body: { ...body, content: trimmed },
    chars: trimmed.length,
  };
  return true;
}
function extractTitle(content, fallbackName = "", consultationType = "lifeBook") {
  const report = extractReportJson(content);
  if (report?.title) return clean(report.title, 100);
  const lines = clean(content).split(/\n+/).map((line) => line.replace(/^[-*#\s]+/, "").trim()).filter(Boolean);
  const firstLine = lines[0] || "";
  const title = firstLine
    .replace(/^(인생의 책이 여는 첫 문장|첫 문장)\s*[:：]?\s*/, "")
    .replace(/^["“”'‘’]+|["“”'‘’]+$/g, "")
    .trim();
  if (consultationType === "lifeFortune") return clean(title || `${fallbackName || "당신"}의 인생 총운`, 100);
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

async function callDeferredBillingRoute({ request, env, auth, path, body }) {
  const url = new URL(request.url);
  url.pathname = `/api/billing/coin-gate/deferred/${path}`;
  url.search = "";
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  return handleBillingRoutes(new Request(url.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }), env, { preverifiedAuth: auth });
}

// 🔴 과금 부작용(apply/cancel/refund)의 유일한 featureKey 원천. 중간에 다시 계산하면 레거시 세션에서 어긋난다.
function billingFeatureKeyOf(access = {}) {
  return clean(access.featureKey, 80) || FEATURE_KEY;
}

async function finalizeDeferredBillingUsage({ request, env, auth, access, idempotencyKey, sessionId, orderName = ORDER_NAME }) {
  if (access.accessSource !== "billing_gate_deferred") return true;
  const response = await callDeferredBillingRoute({
    request,
    env,
    auth,
    path: "apply",
    body: {
      featureKey: billingFeatureKeyOf(access),
      productId: SERVICE_KEY,
      serviceType: billingFeatureKeyOf(access),
      orderName,
      reason: orderName,
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

async function cancelDeferredBillingUsage({ request, env, auth, access, idempotencyKey, sessionId, error, orderName = ORDER_NAME }) {
  if (access?.accessSource !== "billing_gate_deferred") return false;
  await callDeferredBillingRoute({
    request,
    env,
    auth,
    path: "cancel",
    body: {
      featureKey: billingFeatureKeyOf(access),
      productId: SERVICE_KEY,
      serviceType: billingFeatureKeyOf(access),
      orderName,
      reason: orderName,
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

async function restoreBillingGateAccessOnFailure({ userId, access, reason = MESSAGES.llmFailed, orderName = ORDER_NAME }) {
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
      featureKey: billingFeatureKeyOf(access),
      metadata: {
        source: "life-book-ai",
        orderName,
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
    // 복원분은 신규 30일 lot으로 재적립. lotId=refundSourceId로 멱등.
    const updatedUser = await restoreMonthlyCreditLot({ userId, lotId: refundSourceId, amount: access.amount });
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
      serviceKey: billingFeatureKeyOf(access),
      metadata: {
        source: "life-book-ai",
        orderName,
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

async function applyUsageOnce({ request, env, auth, userId, sessionId, access, idempotencyKey, pricing, orderName = ORDER_NAME }) {
  const existing = await LifeBookAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt llmMeta.pricingSnapshot").lean();
  if (existing?.usageAppliedAt) return true;

  if (access.accessSource === "billing_gate_deferred") {
    await finalizeDeferredBillingUsage({ request, env, auth, access, idempotencyKey, sessionId, orderName });
  } else if (access.accessSource !== "billing_gate" && access.accessType === "subscription") {
    const error = new Error("A Payment Service access grant is required for monthly usage.");
    error.code = "PAYMENT_ACCESS_GRANT_REQUIRED";
    throw error;
  } else if (access.accessType === "paid" && access.paymentId) {
    await Payment.updateOne(
      { userId, featureKey: billingFeatureKeyOf(access), merchantUid: access.paymentId },
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

function buildSectionProgress(doc) {
  const plan = Array.isArray(doc?.llmMeta?.plan) ? doc.llmMeta.plan : [];
  const sections = doc?.llmMeta?.sections && typeof doc.llmMeta.sections === "object" ? doc.llmMeta.sections : {};
  if (!plan.length) return null;
  return {
    completed: plan.filter((section) => sections[section.id]?.ok).length,
    total: plan.length,
  };
}

function publicSession(doc) {
  return {
    ok: true,
    sessionId: clean(doc.id),
    consultationId: clean(doc.id),
    idempotencyKey: clean(doc.idempotencyKey),
    accessType: clean(doc.accessType),
    status: clean(doc.status),
    consultationType: clean(doc.llmMeta?.input?.consultationType || "lifeBook"),
    title: clean(doc.title || ""),
    topic: clean(doc.topic || ""),
    birthInfo: doc.birthInfo || null,
    keywords: Array.isArray(doc.keywords) ? doc.keywords : [],
    sajuResult: doc.sajuResult || null,
    reportJson: doc.llmMeta?.reportJson || null,
    featureKey: clean(doc.featureKey || FEATURE_KEY, 80),
    // 🔴 열화 전달을 클라가 알 수 있어야 한다 — 없으면 조용한 과금이 된다.
    degraded: doc.llmMeta?.degraded === true,
    progress: buildSectionProgress(doc),
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

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true, userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  if (!auth) return loginRequired();
  logLifeBookAction("entitlement_check", {
    route,
    requestId: idempotencyKey,
    userId: auth.userId,
    idempotencyKey,
    status: "checking",
  });

  logLifeBookAi("LLM Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: "checking", env }));
  const pricing = { ...getPricing(normalized.input), env };
  if (isAdmin(auth)) {
    logLifeBookAction("entitlement_check", {
      route,
      requestId: idempotencyKey,
      userId: auth.userId,
      idempotencyKey,
      status: "granted",
      reason: "admin",
    });
    logLifeBookAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: "admin", env }));
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        featureKey: getConsultationFeatureKey(normalized.input),
        accessType: "admin",
        accessSource: "admin",
        idempotencyKey,
        inputHash: normalized.inputHash,
      }),
      accessType: "admin",
    });
  }

  await connectDb(env);
  // 풀 초기화(MongoPoolClearedError) 순간에도 접근 판정 read가 1회 실패로 죽지 않도록 재시도.
  const user = await withMongoRetry(env, () => loadBillingUser(auth.userId));
  if (!user) return loginRequired();

  const access = await resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash, input: normalized.input });
  if (access.ok) {
    logLifeBookAction("entitlement_check", {
      route,
      requestId: idempotencyKey,
      userId: auth.userId,
      idempotencyKey,
      status: "granted",
      reason: access.accessType,
    });
    logLifeBookAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: access.accessType, env }));
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        featureKey: access.featureKey || getConsultationFeatureKey(normalized.input),
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

  logLifeBookAction("entitlement_check", {
    route,
    requestId: idempotencyKey,
    userId: auth.userId,
    idempotencyKey,
    status: "payment_required",
    reason: access.reason,
  });
  logLifeBookAi("Payment Required", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: "payment_required", env }));
  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    paymentPayload: buildBillingGatePayload(pricing, idempotencyKey, normalized.input, normalized.inputHash),
  }, { status: 402 });
}

async function resolveStartAccess({ request, env, auth, body, normalized, idempotencyKey }) {
  const token = clean(body?.accessToken || request.headers.get("x-life-book-ai-access-token"));
  if (token) {
    try {
      const acceptedFeatureKeys = getAcceptedFeatureKeys(normalized.input);
      const payload = await verifyAccessToken(env, token, acceptedFeatureKeys);
      if (clean(payload.userId) !== clean(auth.userId) || clean(payload.idempotencyKey) !== idempotencyKey || clean(payload.inputHash) !== normalized.inputHash) {
        return { ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput };
      }
      if (clean(payload.featureKey, 80) === LEGACY_LIFE_FORTUNE_FEATURE_KEY && isLifeFortuneInput(normalized.input)) {
        logLifeBookAi("Legacy SKU Token", { route: "/api/life-book-ai/generate", requestId: idempotencyKey, featureKey: clean(payload.featureKey, 80), marker: "legacy_sku_token" });
      }
      return {
        ok: true,
        accessType: clean(payload.accessType),
        accessSource: clean(payload.accessSource),
        paymentId: clean(payload.paymentId, 160),
        featureKey: clean(payload.featureKey, 80) || getConsultationFeatureKey(normalized.input),
      };
    } catch (_) {
      return { ok: false, reason: "PAYMENT_VERIFY_FAILED" };
    }
  }

  const billingGateAccess = await withMongoRetry(env, () => resolveBillingGateAccess({
    env,
    auth,
    body,
    idempotencyKey,
    inputHash: normalized.inputHash,
    consultationType: normalized.input.consultationType,
    acceptedFeatureKeys: getAcceptedFeatureKeys(normalized.input),
  }));
  if (billingGateAccess?.ok) return billingGateAccess;

  return { ok: false, reason: "PAYMENT_VERIFY_FAILED" };
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

function hasRequiredLifeFortuneSaju(sajuResult, birthInfo = {}) {
  if (!sajuResult || sajuResult.calculationMeta?.available === false) return false;
  if (!sajuResult.yearPillar || !sajuResult.monthPillar || !sajuResult.dayPillar || !sajuResult.dayMaster) return false;
  if (!birthInfo.birthTimeUnknown && !sajuResult.hourPillar) return false;
  if (!sajuResult.pillarDetails?.year || !sajuResult.pillarDetails?.month || !sajuResult.pillarDetails?.day) return false;
  if (!sajuResult.fiveElements || !sajuResult.tenGods) return false;
  if (!sajuResult.tenGodsByPillar?.month || !sajuResult.seasonalBalance?.monthBranch) return false;
  if (!sajuResult.natalInteractions || !sajuResult.relationSummary || !sajuResult.fortuneFacts) return false;
  if (!Array.isArray(sajuResult.interpretationPlan) || sajuResult.interpretationPlan.length < 10) return false;
  if (sajuResult.majorLuck?.available !== true || !Array.isArray(sajuResult.majorLuck?.cycles) || !sajuResult.majorLuck.cycles.length) return false;
  if (!Array.isArray(sajuResult.yearlyLuck) || !sajuResult.yearlyLuck.length) return false;
  return true;
}

async function restoreAccessBeforeGenerationFailure({ request, env, auth, userId, access, idempotencyKey, sessionId, error, orderName, reason = MESSAGES.llmFailed }) {
  const deferredCanceled = await cancelDeferredBillingUsage({
    request,
    env,
    auth,
    access,
    idempotencyKey,
    sessionId,
    error,
    orderName,
  });
  return deferredCanceled || await restoreBillingGateAccessOnFailure({ userId, access, reason, orderName }).catch(() => false);
}

// 웨이브 단일비행. 인메모리 startLocks 는 아이솔레이트 단위라 다중 아이솔레이트에서 무효 —
// 진짜 방어선은 이 DB 락이다(계층이 다르므로 중첩이 아니다).
// 획득 실패는 PROVIDER_DUPLICATE_BLOCKED 로 남긴다(기존 클라 처리·회귀 가드 핀 보존).
async function reserveProviderCallOnce({ userId, sessionId, idempotencyKey, route }) {
  const now = Date.now();
  const lockToken = randomToken(12);
  const staleBefore = new Date(now - SECTION_LOCK_TTL_MS).toISOString();
  const updated = await LifeBookAiConsultation.findOneAndUpdate(
    {
      id: sessionId,
      userId: clean(userId),
      idempotencyKey,
      status: "generating",
      $or: [
        { "llmMeta.lockedAt": { $exists: false } },
        { "llmMeta.lockedAt": null },
        { "llmMeta.lockedAt": { $lt: staleBefore } },
      ],
    },
    {
      $inc: { "llmMeta.providerCallCount": 1, "llmMeta.waveCount": 1 },
      $set: {
        "llmMeta.lockedAt": new Date(now).toISOString(),
        "llmMeta.lockToken": lockToken,
        "llmMeta.providerCallLastAt": new Date(now).toISOString(),
      },
    },
    { new: true },
  ).lean();

  if (!updated) {
    const existing = await LifeBookAiConsultation.findOne({ userId: clean(userId), idempotencyKey }).select("id status llmMeta").lean();
    logLifeBookAction("generate_blocked_duplicate", {
      route,
      requestId: idempotencyKey,
      userId,
      idempotencyKey,
      status: existing?.status || "unknown",
      providerCallCount: Number(existing?.llmMeta?.providerCallCount || 0),
      waveCount: Number(existing?.llmMeta?.waveCount || 0),
      duplicateBlocked: true,
      reason: "wave_lock_held",
    }, "warn");
    const error = new Error("Generation wave already in progress.");
    error.code = "PROVIDER_DUPLICATE_BLOCKED";
    throw error;
  }

  return { lockToken, doc: updated, waveCount: Number(updated.llmMeta?.waveCount || 1), providerCallCount: Number(updated.llmMeta?.providerCallCount || 1) };
}

async function releaseSectionLock(sessionId, lockToken) {
  await LifeBookAiConsultation.updateOne(
    { id: sessionId, "llmMeta.lockToken": lockToken },
    { $set: { "llmMeta.lockedAt": null, "llmMeta.lockToken": "" } },
  ).catch(() => {});
}

async function handleResult(request, env, pathId = "") {
  const url = new URL(request.url);
  const attemptId = clean(url.searchParams.get("attemptId") || url.searchParams.get("idempotencyKey"), 180);
  const sessionId = clean(pathId || url.searchParams.get("sessionId") || url.searchParams.get("consultationId"), 120);
  if (!attemptId && !sessionId) return invalidInput(MESSAGES.resultNotFound, 404);

  // 폴링은 이미 인가된 세션의 결과 조회다. 인증 판정에서 일시적 DB 장애가 나면 하드 503으로 끊지 말고
  // 재시도 가능하다는 신호를 실어 보내 클라가 폴링을 이어가게 한다(nakshatra/neo와 동일한 완충).
  let auth = null;
  try {
    // 결제 프로젝션을 함께 요청해, stale 승격 시 restoreAccessBeforeGenerationFailure 의 내부
    // coin-gate/deferred 위임이 users 를 다시 읽지 않게 한다(preverifiedAuth). 병합이라 기존
    // PAID_FEATURE_ACCESS_USER_PROJECTION 필드는 그대로 유지된다.
    auth = await getOptionalUserFromRequest(request, env, {
      surfaceDbInfraError: true,
      userProjection: { ...PAID_FEATURE_ACCESS_USER_PROJECTION, ...BILLING_SNAPSHOT_USER_PROJECTION },
    });
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
  const clauses = [];
  if (attemptId) clauses.push({ idempotencyKey: attemptId }, { id: attemptId });
  if (sessionId) clauses.push({ id: sessionId });

  const consultation = await LifeBookAiConsultation.findOne({
    userId: clean(auth.userId),
    $or: clauses,
  }).lean();

  if (!consultation) {
    logLifeBookAction("status_check", {
      requestId: attemptId || sessionId,
      userId: auth.userId,
      idempotencyKey: attemptId,
      status: "not_found",
      cacheHit: false,
      reason: "RESULT_NOT_FOUND",
      route: "/api/life-book-ai/result",
    });
    return json({ ok: false, reason: "RESULT_NOT_FOUND", message: MESSAGES.resultNotFound }, { status: 404 });
  }
  if (consultation.status === "generating") {
    const lastTouchedAt = new Date(consultation.updatedAt || consultation.createdAt).getTime();
    if (Date.now() - lastTouchedAt >= LIFE_BOOK_GENERATING_STALE_MS) {
      // 🔴 stale 승격은 확정 실패다 — 보류된 차감(deferred hold)을 여기서 풀지 않으면 영영 방치된다.
      await restoreAccessBeforeGenerationFailure({
        request,
        env,
        auth,
        userId: auth.userId,
        access: {
          accessType: clean(consultation.accessType),
          accessSource: clean(consultation.accessSource),
          paymentId: clean(consultation.paymentId, 160),
          featureKey: clean(consultation.featureKey, 80) || FEATURE_KEY,
        },
        idempotencyKey: clean(consultation.idempotencyKey, 180),
        sessionId: consultation.id,
        error: Object.assign(new Error("Generation did not complete within the allowed window."), { code: "GENERATION_STALLED" }),
        orderName: getConsultationOrderName({ consultationType: consultation.llmMeta?.input?.consultationType }),
      }).catch(() => false);
      await LifeBookAiConsultation.updateOne(
        { id: consultation.id, status: "generating" },
        {
          $set: {
            status: "generation_failed",
            generationError: {
              code: "GENERATION_STALLED",
              message: "Generation did not complete within the allowed window.",
              at: new Date().toISOString(),
            },
          },
        },
      ).catch(() => {});
      const failed = await LifeBookAiConsultation.findOne({ id: consultation.id }).lean();
      logLifeBookAction("result_fetch", {
        requestId: attemptId || sessionId,
        userId: auth.userId,
        idempotencyKey: consultation.idempotencyKey,
        status: "generation_failed",
        cacheHit: true,
        providerCallCount: Number(consultation.llmMeta?.providerCallCount || 0),
        reason: "GENERATION_STALLED",
        route: "/api/life-book-ai/result",
      }, "warn");
      return json({
        ...publicSession(failed || consultation),
        ok: false,
        reason: "GENERATION_STALLED",
        message: MESSAGES.llmFailed,
      }, { status: 503 });
    }
    const orderName = getConsultationOrderName({ consultationType: consultation.llmMeta?.input?.consultationType });
    logLifeBookAction("status_check", {
      requestId: attemptId || sessionId,
      userId: auth.userId,
      idempotencyKey: consultation.idempotencyKey,
      status: "generating",
      cacheHit: true,
      providerCallCount: Number(consultation.llmMeta?.providerCallCount || 0),
      route: "/api/life-book-ai/result",
    });
    return json({ ...publicSession(consultation), message: `${orderName}을 완성하는 중입니다.` }, { status: 202, headers: { "Retry-After": "3", "Cache-Control": "no-store" } });
  }
  if (consultation.status === "generation_failed") {
    logLifeBookAction("result_fetch", {
      requestId: attemptId || sessionId,
      userId: auth.userId,
      idempotencyKey: consultation.idempotencyKey,
      status: "generation_failed",
      cacheHit: true,
      providerCallCount: Number(consultation.llmMeta?.providerCallCount || 0),
      reason: clean(consultation.generationError?.code || "LLM_ERROR", 80),
      route: "/api/life-book-ai/result",
    }, "warn");
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
    logLifeBookAction("result_fetch", {
      requestId: attemptId || sessionId,
      userId: auth.userId,
      idempotencyKey: consultation.idempotencyKey,
      status: "empty",
      cacheHit: true,
      providerCallCount: Number(consultation.llmMeta?.providerCallCount || 0),
      reason: "RESULT_EMPTY",
      route: "/api/life-book-ai/result",
    }, "warn");
    return json({ ok: false, reason: "RESULT_EMPTY", message: MESSAGES.llmFailed }, { status: 409 });
  }
  logLifeBookAction("result_fetch", {
    requestId: attemptId || sessionId,
    userId: auth.userId,
    idempotencyKey: consultation.idempotencyKey,
    status: "completed",
    cacheHit: true,
    providerCallCount: Number(consultation.llmMeta?.providerCallCount || 0),
    route: "/api/life-book-ai/result",
  });
  return json(payload, { headers: { "Cache-Control": "private, max-age=300" } });
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

  // 결제 프로젝션을 함께 요청해, 아래 applyUsageOnce/restoreAccessBeforeGenerationFailure 의 내부
  // coin-gate/deferred 위임이 users 를 다시 읽지 않게 한다(preverifiedAuth).
  const auth = await getOptionalUserFromRequest(request, env, {
    surfaceDbInfraError: true,
    userProjection: { ...PAID_FEATURE_ACCESS_USER_PROJECTION, ...BILLING_SNAPSHOT_USER_PROJECTION },
  });
  if (!auth) return loginRequired();
  logLifeBookAction("generate_start", {
    route,
    requestId: idempotencyKey,
    userId: auth.userId,
    idempotencyKey,
    status: "received",
  });

  const lockKey = `${clean(auth.userId)}:${idempotencyKey}`;
  if (startLocks.has(lockKey)) {
    logLifeBookAction("generate_reused", {
      route,
      requestId: idempotencyKey,
      userId: auth.userId,
      idempotencyKey,
      status: "single_flight",
      cacheHit: true,
      duplicateBlocked: true,
      reason: "in_memory_lock",
    });
    const lockedResponse = await startLocks.get(lockKey);
    return lockedResponse.clone();
  }

  const pending = (async () => {
    await connectDb(env);
    const pricing = getPricing(normalized.input);
    const orderName = getConsultationOrderName(normalized.input);

    const existing = await LifeBookAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
    if (existing && clean(existing.inputHash) !== normalized.inputHash) return invalidInput(MESSAGES.invalidInput, 409);
    if (existing?.status === "completed") {
      logLifeBookAction("generate_reused", {
        route,
        requestId: idempotencyKey,
        userId: auth.userId,
        idempotencyKey,
        status: "completed",
        cacheHit: true,
        providerCallCount: Number(existing.llmMeta?.providerCallCount || 0),
      });
      return json(publicSession(existing));
    }
    if (existing?.status === "generating") {
      const lastTouchedAt = new Date(existing.updatedAt || existing.createdAt).getTime();
      if (Date.now() - lastTouchedAt >= LIFE_BOOK_GENERATING_STALE_MS) {
        await LifeBookAiConsultation.updateOne(
          { id: existing.id, status: "generating" },
          {
            $set: {
              status: "generation_failed",
              generationError: {
                code: "GENERATION_STALLED",
                message: "Generation did not complete within the allowed window.",
                at: new Date().toISOString(),
              },
            },
          },
        ).catch(() => {});
        const failed = await LifeBookAiConsultation.findOne({ id: existing.id }).lean();
        logLifeBookAction("generate_blocked_duplicate", {
          route,
          requestId: idempotencyKey,
          userId: auth.userId,
          idempotencyKey,
          status: "generation_failed",
          cacheHit: true,
          duplicateBlocked: true,
          providerCallCount: Number(failed?.llmMeta?.providerCallCount || existing.llmMeta?.providerCallCount || 0),
          reason: "GENERATION_STALLED",
        }, "warn");
        return json({
          ...publicSession(failed || existing),
          ok: false,
          reason: "GENERATION_STALLED",
          message: MESSAGES.llmFailed,
        }, { status: 503 });
      }
      logLifeBookAction("generate_reused", {
        route,
        requestId: idempotencyKey,
        userId: auth.userId,
        idempotencyKey,
        status: "generating",
        cacheHit: true,
        duplicateBlocked: true,
        providerCallCount: Number(existing.llmMeta?.providerCallCount || 0),
      });
      return json({ ok: true, sessionId: existing.id, status: "generating", message: `${orderName}을 완성하는 중입니다.` }, { status: 202 });
    }
    if (existing?.status === "generation_failed") {
      logLifeBookAction("generate_blocked_duplicate", {
        route,
        requestId: idempotencyKey,
        userId: auth.userId,
        idempotencyKey,
        status: "generation_failed",
        cacheHit: true,
        duplicateBlocked: true,
        providerCallCount: Number(existing.llmMeta?.providerCallCount || 0),
        reason: clean(existing.generationError?.code || "GENERATION_ALREADY_FAILED", 80),
      }, "warn");
      return json({
        ...publicSession(existing),
        ok: false,
        reason: "GENERATION_ALREADY_FAILED",
        message: MESSAGES.llmFailed,
      }, { status: 409 });
    }

    logLifeBookAi("LLM Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: "checking", env }));
    const access = await resolveStartAccess({ request, env, auth, body, normalized, idempotencyKey });
    if (!access.ok) {
      if (access.reason === "LOGIN_REQUIRED") return loginRequired();
      if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
      return paymentVerifyFailed();
    }
    logLifeBookAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: access.accessType, env }));

    let sajuResult = null;
    try {
      sajuResult = calculateLifeBookAiSaju(normalized.input.birthInfo);
    } catch (error) {
      if (isLifeFortuneInput(normalized.input)) {
        await restoreAccessBeforeGenerationFailure({
          request,
          env,
          auth,
          userId: auth.userId,
          access,
          idempotencyKey,
          sessionId: existing?.id || idempotencyKey,
          error,
          orderName,
          reason: MESSAGES.sajuCalculationFailed,
        });
        logLifeBookAi("LLM Error", safeLogPayload({
          route,
          requestId: idempotencyKey,
          body,
          normalized,
          validation: "saju_calculation_failed",
          access: access.accessType,
          env,
          error,
        }), "warn");
        return json({ ok: false, reason: "SAJU_CALCULATION_FAILED", message: MESSAGES.sajuCalculationFailed }, { status: 422 });
      }
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
    if (isLifeFortuneInput(normalized.input) && !hasRequiredLifeFortuneSaju(sajuResult, normalized.input.birthInfo)) {
      const error = Object.assign(new Error("life fortune saju result is incomplete"), { code: "SAJU_RESULT_INCOMPLETE" });
      await restoreAccessBeforeGenerationFailure({
        request,
        env,
        auth,
        userId: auth.userId,
        access,
        idempotencyKey,
        sessionId: existing?.id || idempotencyKey,
        error,
        orderName,
        reason: MESSAGES.sajuCalculationFailed,
      });
      logLifeBookAi("LLM Error", safeLogPayload({
        route,
        requestId: idempotencyKey,
        body,
        normalized,
        validation: "saju_result_incomplete",
        access: access.accessType,
        env,
        error,
      }), "warn");
      return json({ ok: false, reason: "SAJU_CALCULATION_FAILED", message: MESSAGES.sajuCalculationFailed }, { status: 422 });
    }

    const sessionId = existing?.id || `lbai_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}_${randomToken(8)}`;
    const now = new Date();
    const sectionPlan = buildSectionPlan(normalized.input);
    const seed = {
      id: sessionId,
      userId: clean(auth.userId),
      // 🔴 실제로 돈이 움직인 SKU. 구 SKU 로 결제된 총운 세션은 이 값으로 계속 정산해야
      //    apply/cancel/refund 가 원 차감 레코드와 같은 키로 대사된다.
      featureKey: access.featureKey || getConsultationFeatureKey(normalized.input),
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
        providerCallCount: 0,
        providerCallLastAt: null,
        waveCount: 0,
        lockedAt: null,
        lockToken: "",
        plan: sectionPlan,
        sections: {},
        // 결제창이 사용자에게 보여준 금액. applyUsageOnce 가 현재가 대신 이 값을 쓰므로
        // SKU 가격이 바뀌어도 진행 중 세션이 안내와 다른 금액으로 차감되지 않는다.
        pricingSnapshot: {
          coinPrice: Number(pricing.coinPrice || 0),
          amountKRW: Number(pricing.amountKRW || 0),
          membershipCreditCost: Number(pricing.membershipCreditCost || 0),
        },
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
          logLifeBookAction("generate_reused", {
            route,
            requestId: idempotencyKey,
            userId: auth.userId,
            idempotencyKey,
            status: duplicate?.status || "generating",
            cacheHit: true,
            duplicateBlocked: true,
            providerCallCount: Number(duplicate?.llmMeta?.providerCallCount || 0),
            reason: "unique_index_collision",
          });
          if (duplicate?.status === "completed") return json(publicSession(duplicate));
          if (duplicate?.status === "generation_failed") {
            return json({
              ...publicSession(duplicate),
              ok: false,
              reason: "GENERATION_ALREADY_FAILED",
              message: MESSAGES.llmFailed,
            }, { status: 409 });
          }
          return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: `${orderName}을 완성하는 중입니다.` }, { status: 202 });
        }
        throw error;
      }
    }

    // 🔴 waitUntil 백그라운드 금지(요청 간 I/O 격리 + 예외 소실). 대신 한 요청 = 동시성 4 웨이브 하나만
    //    돌려 엣지 100초 안에서 끝내고, 남은 섹션이 있으면 202 + progress 를 돌려준다.
    //    클라(master-love-codex 의 runBatches 패턴)가 /generate 를 반복 호출해 진행을 이어받는다.
    try {
      const doc = await LifeBookAiConsultation.findOne({ id: sessionId }).lean();
      const plan = Array.isArray(doc?.llmMeta?.plan) && doc.llmMeta.plan.length ? doc.llmMeta.plan : sectionPlan;
      const storedSections = doc?.llmMeta?.sections && typeof doc.llmMeta.sections === "object" ? { ...doc.llmMeta.sections } : {};
      const waveCount = Number(doc?.llmMeta?.waveCount || 0);
      if (waveCount >= MAX_GENERATION_WAVES) {
        const error = Object.assign(new Error("Generation wave budget exhausted."), { code: "GENERATION_STALLED" });
        throw error;
      }

      const lock = await reserveProviderCallOnce({ userId: auth.userId, sessionId, idempotencyKey, route });
      let sections = storedSections;
      let finished = false;
      let responsePayload = null;

      try {
        const pending = plan.filter((section) => {
          const stored = sections[section.id];
          if (!stored) return true;
          if (stored.needsRepair) return Number(stored.attempts || 0) < LIFE_BOOK_MAX_SECTION_ATTEMPTS;
          if (!stored.ok) return Number(stored.attempts || 0) < LIFE_BOOK_MAX_SECTION_ATTEMPTS;
          return false;
        }).slice(0, SECTION_BATCH_SIZE);

        const baseLogContext = {
          ...safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: access.accessType, env }),
          ...buildProviderLogContext({
            requestId: idempotencyKey,
            userId: auth.userId,
            idempotencyKey,
            providerCallCount: lock.providerCallCount,
          }),
          featureKey: seed.featureKey,
          waveIndex: lock.waveCount,
        };

        if (pending.length) {
          const consultationType = isLifeFortuneInput(normalized.input) ? "lifeFortune" : "lifeBook";
          const results = await runWithConcurrency(pending, SECTION_CONCURRENCY, async (section) => {
            const stored = sections[section.id];
            const attempt = Number(stored?.attempts || 0) + 1;
            // 재시도에서는 목표 분량을 올려 잡아 "또 짧게" 오는 것을 막는다.
            const boosted = stored?.needsRepair
              ? { ...section, targetChars: Math.round(section.targetChars * 1.25) }
              : section;
            const digest = buildSectionDigest(plan, sections, section.id);
            const prompt = buildSectionPrompt(normalized.input, pickSajuSlice(sajuResult, section.evidenceRefs), boosted, digest);
            const result = await generateSectionOnce(env, boosted, prompt, {
              consultationType,
              // 재시도는 캐시를 우회해야 같은 짧은 응답을 다시 받지 않는다.
              cache: attempt > 1 ? null : {
                store: createLlmCacheStore(env),
                deterministic: true,
                ttlSeconds: 30 * 24 * 60 * 60,
                keyExtra: `life-book-ai-v2-${consultationType}-${section.id}`,
              },
              logContext: { ...baseLogContext, sectionId: section.id, attempt },
            });
            logLifeBookAction(result.ok ? "section_generate" : "section_retry", {
              route,
              requestId: idempotencyKey,
              userId: auth.userId,
              idempotencyKey,
              featureKey: seed.featureKey,
              status: result.ok ? "ok" : "failed",
              sectionId: section.id,
              waveIndex: lock.waveCount,
              attempt,
              promptChars: result.promptChars,
              responseChars: result.chars,
              durationMs: result.durationMs,
              parsed: result.parsed,
              providerCallCount: lock.providerCallCount,
              reason: result.error || "",
            }, result.ok ? "info" : "warn");
            return { section, attempt, result };
          });

          for (const entry of results) {
            if (!entry) continue;
            const { section, attempt, result } = entry;
            const previous = sections[section.id];
            // 실패했는데 이전 성공본이 있으면 그것을 지키고 시도 횟수만 올린다.
            if (!result.ok && previous?.ok) {
              sections[section.id] = { ...previous, attempts: attempt, needsRepair: previous.needsRepair || false };
              continue;
            }
            sections[section.id] = {
              id: section.id,
              kind: section.kind,
              ok: result.ok,
              body: result.body,
              chars: result.chars,
              attempts: attempt,
              provider: result.provider,
              model: result.model,
              error: result.error,
              needsRepair: false,
            };
          }
        }

        // ── 조립 + 품질 게이트(정본 재사용). 결손은 책임 섹션에만 매핑한다.
        const missing = plan.filter((section) => !sections[section.id]?.ok
          && Number(sections[section.id]?.attempts || 0) < LIFE_BOOK_MAX_SECTION_ATTEMPTS);
        let repairTargets = [];
        let assembled = null;
        let assembledText = "";
        let issues = [];

        if (!missing.length) {
          assembled = assembleReport(normalized.input, plan, sections);
          assembledText = JSON.stringify(assembled);
          issues = getLifeBookReportQualityIssues(assembledText, normalized.input);
          const mapped = mapIssuesToSections(issues, plan, sections);
          if (mapped.trimOnly) {
            const overflow = reportTotalContentChars(assembled) - (isLifeFortuneInput(normalized.input)
              ? LIFE_FORTUNE_MAX_TOTAL_CONTENT_CHARS
              : LIFE_BOOK_MAX_TOTAL_CONTENT_CHARS);
            if (overflow > 0 && trimLongestChapter(sections, plan, overflow)) {
              assembled = assembleReport(normalized.input, plan, sections);
              assembledText = JSON.stringify(assembled);
              issues = getLifeBookReportQualityIssues(assembledText, normalized.input);
            }
          }
          repairTargets = mapIssuesToSections(issues, plan, sections).targets
            .filter((id) => Number(sections[id]?.attempts || 0) < LIFE_BOOK_MAX_SECTION_ATTEMPTS);
          for (const id of repairTargets) {
            if (sections[id]) sections[id] = { ...sections[id], needsRepair: true };
          }
          logLifeBookAction("quality_gate", {
            route,
            requestId: idempotencyKey,
            userId: auth.userId,
            idempotencyKey,
            featureKey: seed.featureKey,
            status: issues.length ? "issues" : "passed",
            waveIndex: lock.waveCount,
            responseChars: reportTotalContentChars(assembled),
            reason: issues.slice(0, 8).join(","),
          }, issues.length ? "warn" : "info");
        }

        const stillPending = plan.filter((section) => {
          const stored = sections[section.id];
          if (!stored) return true;
          if (stored.needsRepair || !stored.ok) return Number(stored.attempts || 0) < LIFE_BOOK_MAX_SECTION_ATTEMPTS;
          return false;
        });
        const completedCount = plan.filter((section) => sections[section.id]?.ok).length;

        if (stillPending.length && (lock.waveCount < MAX_GENERATION_WAVES)) {
          await LifeBookAiConsultation.updateOne(
            { id: sessionId },
            {
              $set: {
                "llmMeta.sections": sections,
                // 정상 진행 중임을 stale 판정에 알린다.
                updatedAt: new Date(),
                // 부분 결과를 클라가 순차 공개할 수 있게 조립본을 미리 올려 둔다.
                "llmMeta.reportJson": assembled || assembleReport(normalized.input, plan, sections),
              },
            },
          );
          logLifeBookAction("wave_complete", {
            route,
            requestId: idempotencyKey,
            userId: auth.userId,
            idempotencyKey,
            featureKey: seed.featureKey,
            status: "generating",
            waveIndex: lock.waveCount,
            persisted: true,
            reason: `pending:${stillPending.length}`,
          });
          responsePayload = json({
            ok: true,
            sessionId,
            status: "generating",
            progress: { completed: completedCount, total: plan.length },
            message: `${orderName}을 완성하는 중입니다.`,
          }, { status: 202, headers: { "Retry-After": "1" } });
        } else {
          finished = true;
        }

        if (finished) {
          const finalReport = assembled || assembleReport(normalized.input, plan, sections);
          const finalText = JSON.stringify(finalReport);
          const finalIssues = issues.length ? issues : getLifeBookReportQualityIssues(finalText, normalized.input);
          const totalChars = reportTotalContentChars(finalReport);
          const degraded = finalIssues.length > 0;

          if (isLifeFortuneInput(normalized.input)
            && (totalChars < LIFE_FORTUNE_DEGRADE_MIN_TOTAL_CHARS
              || (Array.isArray(finalReport.chapters) ? finalReport.chapters.length : 0) !== LIFE_BOOK_EXPECTED_CHAPTER_COUNT)) {
            const error = new Error(`Life fortune report quality check failed: ${finalIssues.join(", ") || "total_content_too_short"}`);
            error.code = "LIFE_FORTUNE_REPORT_INVALID";
            throw error;
          }
          if (!hasRenderableLlmText(finalText, { minChars: 400 })) {
            const error = new Error(`Life book result quality check failed: ${finalIssues.join(", ") || "empty_result"}`);
            error.code = "LLM_QUALITY_CHECK_FAILED";
            throw error;
          }

          await applyUsageOnce({
            request,
            env,
            auth,
            userId: auth.userId,
            sessionId,
            access,
            idempotencyKey,
            pricing,
            orderName,
          });
          if (access.accessType === "pass") {
            logLifeBookAi("Pass Consumed", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "passed", access: access.accessType, payment: "usage_applied", env }));
          }
          const title = extractTitle(finalText, normalized.input.birthInfo.name, normalized.input.consultationType);
          const keywords = extractKeywords(finalText, normalized.input.topic);
          const userMessage = normalized.input.consultationType === "lifeFortune"
            ? `상담 주제: ${normalized.input.topic}`
            : `리포트 강조 영역: ${normalized.input.topic}`;
          const usedProvider = clean(Object.values(sections).find((section) => section?.provider)?.provider || "gemini");
          const usedModel = clean(Object.values(sections).find((section) => section?.model)?.model);
          const completed = await LifeBookAiConsultation.findOneAndUpdate(
            { id: sessionId },
            {
              $set: {
                status: "completed",
                title,
                keywords,
                messages: [
                  { role: "user", content: userMessage, createdAt: now },
                  { role: "assistant", content: finalText, createdAt: new Date() },
                ],
                "llmMeta.provider": usedProvider,
                "llmMeta.model": usedModel,
                "llmMeta.reportJson": finalReport,
                "llmMeta.sections": sections,
                "llmMeta.degraded": degraded,
                "llmMeta.qualityIssues": finalIssues.slice(0, 20),
                "llmMeta.providerCallLastAt": new Date().toISOString(),
                "llmMeta.completedAt": new Date().toISOString(),
                generationError: null,
              },
            },
            { new: true },
          ).lean();
          logLifeBookAction("wave_complete", {
            route,
            requestId: idempotencyKey,
            userId: auth.userId,
            idempotencyKey,
            featureKey: seed.featureKey,
            status: "completed",
            waveIndex: lock.waveCount,
            responseChars: totalChars,
            persisted: Boolean(completed),
            parsed: true,
            degraded,
          });
          logLifeBookAi("LLM Generate Success", safeLogPayload({
            route,
            requestId: idempotencyKey,
            body,
            normalized,
            validation: "passed",
            access: access.accessType,
            payment: "usage_applied",
            env,
            providerReason: usedProvider || usedModel,
          }));
          responsePayload = json(publicSession(completed));
        }
      } finally {
        await releaseSectionLock(sessionId, lock.lockToken);
      }
      return responsePayload;
    } catch (error) {
      if (clean(error?.code) === "PROVIDER_DUPLICATE_BLOCKED") {
        const duplicate = await LifeBookAiConsultation.findOne({ id: sessionId }).lean();
        if (duplicate?.status === "completed") return json(publicSession(duplicate));
        if (duplicate?.status === "generation_failed") {
          return json({
            ...publicSession(duplicate),
            ok: false,
            reason: "GENERATION_ALREADY_FAILED",
            message: MESSAGES.llmFailed,
          }, { status: 409 });
        }
        return json({
          ok: false,
          retryable: true,
          reason: "GENERATION_IN_PROGRESS",
          sessionId,
          status: "generating",
          message: `${orderName}을 완성하는 중입니다.`,
        }, { status: 409, headers: { "Retry-After": "4" } });
      }
      const restored = await restoreAccessBeforeGenerationFailure({
        request,
        env,
        auth,
        userId: auth.userId,
        access,
        idempotencyKey,
        sessionId,
        error,
        orderName,
      });
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
      return json({ ok: false, reason: "LLM_ERROR", message: MESSAGES.llmFailed, refunded: Boolean(restored) }, { status: 503 });
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

// 🔴 ctx 를 받지 않는다 — waitUntil 백그라운드 생성은 이 레포에서 금지다(요청 간 I/O 격리로 결과 고착).
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
    // 풀 초기화 버스트/인증 조회 중 일시 DB 장애는 재시도 신호와 함께 503으로 — 하드 500 방지.
    // (surfaceDbInfraError로 재-throw된 인증 인프라 에러는 isAuthDbInfraError에만 걸리므로 함께 검사)
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

export const __lifeBookAiTestUtils = {
  normalizeConsultationInput,
  extractTitle,
  extractKeywords,
  cleanForbiddenResult,
  getLifeBookReportQualityIssues,
  buildSectionPlan,
  buildSectionPrompt,
  pickSajuSlice,
  assembleReport,
  mapIssuesToSections,
  reportTotalContentChars,
};
