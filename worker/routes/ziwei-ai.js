import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest, isAuthDbInfraError, peekAccessTokenUserId } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, isTransientMongoError, mongoose, withMongoRetry } from "../lib/db.js";
import { clampSyncLlmTimeoutMs } from "../lib/sync-llm-timeout.js";
import { cmsPromptText } from "../lib/cms-prompts.js";
import { MonthlyCreditLedger, Payment, PointHistory, User, ZiweiAiConsultation } from "../lib/models.js";
import { findMoonstoneSpendEvidence } from "../lib/moonstone-spend-proof.js";
import { decryptPhoneNumber } from "../lib/pii-crypto.js";
import { restoreMonthlyCreditLot } from "../lib/monthly-credit-store.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { resolveFeatureAccessPolicy } from "../lib/entitlement-policy.js";
import { fetchPortOnePayment, getPortOnePublicConfig } from "../lib/portone.js";
import { callGeminiText } from "../lib/gemini.js";
import { callGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { calculateZiweiAiChart, formatStarWithBrightness } from "../lib/ziwei-ai-chart.js";
import { basisGroup, basisItem, basisStage, buildAnalysisBasisPayload } from "../lib/analysis-basis-contract.js";
import {
  buildDomainAnalysisRuleLines,
  buildEvidenceRuleLines,
  buildReasoningSectionSchema,
  REASONING_SECTION_SPECS,
} from "../lib/fortune-reasoning-contract.js";
import { applyZiweiHanjaToStructuredText, stripEmptyParens } from "../lib/ziwei-hanja.js";
import { buildZiweiDomainBriefLines, getZiweiPromptTemplate, resolveZiweiDomainFromFocus } from "../lib/ziwei-ai-prompt-templates.mjs";

const SERVICE_KEY = "ziwei-ai";
const FEATURE_KEY = "ziwei-ai-consultation";
const ACCESS_TOKEN_TYPE = "ziwei-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "자미두수 전문가 상담";
const COIN_PRICE = 300;
const AMOUNT_KRW = 30000;
const MIN_INITIAL_CONSULTATION_BODY_CHARS = 20000;
const MAX_INITIAL_CONSULTATION_BODY_CHARS = 30000;
// 초기 상담 body 합산 20,000~30,000자 JSON 요구(한국어 1자≈1~1.5토큰) — 구 상한 26000은
// 최소 분량도 여유가 없어 상시 잘림→JSON 파싱 실패→degraded 결과를 유발했다.
// 구 45000은 상한 30,000자를 최악 비율로 채우면 정확히 소진돼 완충이 0이었다(JSON 키·제목 몫도 없음).
// tokensRequiredForChars(30000) = 47,250 이상을 확보한다.
//
// 🔴 이 예산은 "한 번의 호출"이 아니라 아래 SECTION_GROUP_SPECS 6그룹이 나눠 쓰는 총량이다.
// 예전에는 단일 호출에 48,000토큰을 걸었는데, 동기 라우트라 LLM 대기가 85초(clampSyncLlmTimeoutMs)로
// 잘리는 반면 20,000자를 뽑으려면 그 3~4배의 시간이 필요했다. 시간 예산 < 토큰 예산이라
// 매번 잘리거나 Workers AI 폴백으로 넘어갔고(70B는 목표의 60~77%만 쓰고 멈춘다),
// 최종적으로 degrade 경로가 그 짧은 결과를 ₩30,000 정상 결제로 배달했다.
// 그룹으로 쪼개 병렬로 부르면 각 호출이 시간 예산 안에 완주해 실제 분량이 나온다.
const INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS = 48000;

// ── 초기 상담 섹션 그룹(병렬 생성 단위) ──────────────────────────────
// 그룹 하나가 담당하는 분량은 40초 안에 Gemini 가 완주할 수 있는 크기로 잡았다.
// targetChars 합계는 MIN_INITIAL_CONSULTATION_BODY_CHARS 를 넘도록 배분한다.
const SECTION_GROUP_TARGET_TOKENS = Math.floor(INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS / 6);
// 그룹 1회 호출의 LLM 대기 상한. 잘림 재시도(attempts)까지 겹쳐도 아래 총 예산 안에 들도록 짧게 잡는다.
const SECTION_GROUP_TIMEOUT_MS = 40000;
// callGeminiJsonWithRetry 기본값은 attempts=3 이라 한 호출이 최악 timeout×3 을 쓴다.
// 동기 라우트에서 그건 엣지 100초를 그냥 넘긴다 — 그룹 호출은 2회로 묶는다.
const SECTION_GROUP_ATTEMPTS = 2;
// 생성 전체(1차 병렬 + 미달 그룹 재생성)의 벽시계 예산. 엣지 100초 앞에서 스스로 멈춘다.
const INITIAL_CONSULTATION_DEADLINE_MS = 88000;
// 재생성을 걸 가치가 있는 최소 잔여 시간.
const SECTION_GROUP_RETRY_MIN_BUDGET_MS = 18000;
// 그룹이 목표의 이 비율에 못 미치면 다시 부른다. 낮게 잡으면(구 0.6) 목표의 65%짜리 그룹들이
// 그대로 통과해 합계가 MIN_INITIAL_CONSULTATION_BODY_CHARS 아래로 내려앉는다.
const SECTION_GROUP_RETRY_RATIO = 0.8;
// `generating` 문서를 "아직 누가 만들고 있다"고 믿어 줄 창.
// 생성은 요청 안에서 INITIAL_CONSULTATION_DEADLINE_MS(88초) 예산으로 끝나고 엣지는 100초에 요청을 끊으므로,
// 이 창은 그 둘보다 조금만 길면 된다. 예전 값 540초는 "초기 240s + repair 240s" 순차 파이프라인 시절의
// 계산인데 그 파이프라인이 사라진 뒤에도 남아 있었다 — 엣지에 잘린 세션이 9분간 좀비로 남고, 그동안
// /start 는 202만 돌려주고 /result 는 창을 보지도 않아, 아무도 생성하지 않는 채로 클라이언트 폴링이
// 통째로 헛돌았다(최대 65회·약 8분).
const GENERATING_FRESHNESS_MS = 150000;

// targetChars 합계는 MIN_INITIAL_CONSULTATION_BODY_CHARS(20,000)보다 넉넉히 위여야 한다.
// 딱 맞춰 두면 모델이 목표의 90%만 써도 곧바로 미달로 떨어진다. 대신 그룹 하나의 몫은
// SECTION_GROUP_TIMEOUT_MS(40초) 안에 완주할 크기(4,400자 ≈ 5,300 출력 토큰)를 넘기지 않는다.
const SECTION_GROUP_SPECS = Object.freeze([
  {
    id: "foundation",
    sections: ["reading_guide", "structure_core", "influence_factors"],
    targetChars: 3600,
    focus: "이 명반을 어떤 순서로 읽어야 하는지와, 이번 흐름을 만드는 핵심 구조·영향 요인",
  },
  {
    id: "essence",
    sections: ["evidence_basis", "essence"],
    targetChars: 3800,
    focus: "판단의 근거를 먼저 드러내고, 명궁·신궁이 말하는 타고난 본질로 잇는 흐름",
  },
  {
    id: "flow",
    sections: ["flow", "triad_axis", "twelve_palaces"],
    targetChars: 4400,
    focus: "사화의 흐름, 삼방사정이 여는 축, 12궁이 서로 주고받는 연결 구조",
  },
  {
    id: "achievement",
    sections: ["career", "wealth", "domain_matrix"],
    targetChars: 4400,
    focus: "사회적 성취와 금전 — 관록궁·재백궁을 중심으로 한 현실 영역",
  },
  {
    id: "relation",
    sections: ["relationship", "dayun_now", "timing_strategy"],
    targetChars: 4200,
    focus: "인연과 환경 — 부부궁·천이궁을 중심으로 한 관계, 그리고 현재 대운과 세운의 시기 전략",
  },
  {
    id: "closing",
    sections: ["caution", "core_answer", "action_plan", "prescription"],
    targetChars: 4000,
    focus: "반복되는 함정과 전환점, 질문에 대한 핵심 답, 지금 실행할 처방",
  },
]);

const SECTION_TITLES = Object.freeze({
  reading_guide: "이 명반을 읽는 순서",
  essence: "명궁이 말하는 본질",
  flow: "사화와 흐름의 물결",
  triad_axis: "삼방사정이 여는 축",
  twelve_palaces: "12궁의 연결 지도",
  career: "일과 사업의 지도",
  wealth: "재물이 머무는 방식",
  relationship: "관계와 인연의 결",
  dayun_now: "지금의 대운",
  timing_strategy: "대한과 세운의 선택 전략",
  caution: "반복되는 함정과 전환점",
  core_answer: "지금 질문에 대한 별궁의 답",
  prescription: "지금의 처방",
});

// 섹션별 작성 규칙. 그룹 프롬프트는 자기가 맡은 섹션의 규칙만 싣는다.
const SECTION_RULES = Object.freeze({
  reading_guide: "reading_guide는 이 명반을 어떤 순서로 읽으면 좋은지 안내하는 3~4문장입니다. '한 폭의 그림처럼'류의 상투적·일반론적 도입 대신, 실제 명궁 주성·신궁 위치·현재 대운궁을 직접 짚어 '먼저 명궁의 OO별로 타고난 성향을, 신궁으로 후천의 힘을 보고, 질문과 가까운 OO궁과 삼방사정으로 이어 읽으세요'처럼 이 사람의 명반에 맞춘 구체적 길잡이로 쓰세요. 이 문단만은 3단 구조를 적용하지 않습니다.",
  essence: "essence는 명궁 주성과 강약을 첫 흐름에 자연스럽게 밝히고, 신궁·보성·살성의 영향까지 통합하세요.",
  flow: "flow는 화록·화권·화과·화기 네 별을 모두 별 이름으로 직접 언급하고, 계산 확정값의 궁 위치 그대로 각 사화가 놓인 궁의 욕망, 힘, 인정, 막힘을 현실적인 언어로 풀어주세요.",
  triad_axis: "triad_axis는 질문과 가장 가까운 궁의 삼방사정, 대궁, 협조궁을 함께 읽어 에너지가 들어오고 새는 길을 밝히세요.",
  twelve_palaces: "twelve_palaces는 12궁 전체를 단순 나열하지 말고 명궁·재백궁·관록궁·부부궁·복덕궁·질액궁의 상호작용을 중심으로 연결해 주세요.",
  career: "career는 관록궁의 주성 강약과 삼방사정, 대운·세운 흐름을 질문 주제와 연결해 일의 성질과 지속 가능성을 밝히세요.",
  wealth: "wealth는 재백궁을 복덕궁·전택궁과 함께 읽어 버는 힘과 새는 통로를 나누어 말하세요.",
  relationship: "relationship은 부부궁과 그 삼방사정(관록·천이·복덕)을 함께 읽고, 노복궁의 관계망까지 이어 인연의 결을 밝히세요.",
  dayun_now: "dayun_now는 현재 대운궁의 주성과 사화를 근거로 지금 구간의 성격을 규정하세요.",
  timing_strategy: "timing_strategy는 현재 대한, 올해 세운, 가까운 4주와 6개월의 선택 리듬을 분리해 말하세요.",
  caution: "caution은 반복되는 패턴 1~2개와 전환 방법을 흐름 있게 말하되, 겁을 주는 예언형 문장은 피하세요. 화기가 앉은 궁이 있으면 그 주의점이 직관적으로 드러나게 짚되, 반드시 대처법을 함께 제시하세요.",
  core_answer: "core_answer는 사용자의 질문에 대해 자미두수 전문가가 마지막으로 짚어 줄 핵심 답을 명확하게 전하세요.",
  prescription: "prescription은 지금 집중할 방향을 3가지 이내의 자연스러운 문단으로 마무리하세요.",
  domain_matrix: "domain_matrix에서 건강을 다룰 때는 질병을 단정하지 말고 질액궁의 긴장, 회복 습관, 생활 리듬의 취약 경향으로 조심스럽게 말하세요.",
});
const GEMINI_ENV_KEYS = [
  "GEMINIF_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
];

const MESSAGES = Object.freeze({
  login: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  paymentRequired: "이용권 또는 결제가 필요한 상담입니다. 결제 정보를 확인해 주세요.",
  paymentVerifyFailed: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  invalidInput: "자미두수 상담에 필요한 정보가 부족해요. 생년월일, 성별, 출생시간 정보를 다시 확인해 주세요.",
  birthTimeMissing: "자미두수는 출생시간이 중요해요. 출생시간을 입력하거나 ‘출생시간 모름’을 선택해 주세요.",
  customQuestionRequired: "별궁에 묻고 싶은 질문을 조금 더 구체적으로 적어 주세요.",
  calculationFailed: "자미두수 명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  serverFailed: "자미두수 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  llmFailed: "전문가 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
});

const TOPICS = new Set([
  "전체 명반 해석",
  "타고난 성향",
  "인생의 큰 흐름",
  "직업/사업운",
  "재물운",
  "연애/결혼운",
  "인간관계",
  "가족/부모운",
  "건강/멘탈",
  "이직/창업",
  "올해 운세",
  "대운 흐름",
  "현재 고민 상담",
]);
const FOCUS_AREA_LABELS = Object.freeze({
  overall: "전체 명반 해석",
  love: "연애/결혼운",
  money: "재물운",
  career: "직업/사업운",
  health: "건강/멘탈",
  relationship: "인간관계",
  personality: "타고난 성향",
  custom: "현재 고민 상담",
});
const FOCUS_AREAS = new Set(Object.keys(FOCUS_AREA_LABELS));

const FORBIDDEN_RESULT_PATTERN = /\bAI\b|PDF|챕터|chapter|\bjob\b|\bprogress\b|프롬프트|시스템/i;

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function extractJsonObjectText(text) {
  const normalized = clean(text).replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end <= start) return "";
  return normalized.slice(start, end + 1);
}

/**
 * JSON 문자열 리터럴 안에 들어온 raw 제어문자를 이스케이프해 되살린다.
 *
 * 🔴 실측(2026-08-01, 6그룹 병렬 라이브 호출): `responseMimeType: "application/json"` 을 줘도
 * gemini-2.5-flash 는 긴 한국어 상담문에서 문단을 나누며 **문자열 안에 raw 개행을 그대로** 넣는다.
 * 그러면 JSON.parse 가 `Bad control character in string literal` 로 죽고, 토큰은 정상 생성됐는데도
 * (2,000토큰 안팎) 그 그룹이 통째로 0자로 집계된다. 6그룹 중 2그룹이 이렇게 날아가
 * 합계가 목표의 66%에 머물렀다 — 분량 미달의 가장 큰 원인이었다.
 * 파싱은 값을 버리는 자리라, 되살릴 수 있으면 되살리는 편이 항상 낫다.
 */
function escapeRawControlCharsInJsonStrings(jsonText) {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of jsonText) {
    if (escaped) { out += ch; escaped = false; continue; }
    if (ch === "\\") { out += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; out += ch; continue; }
    if (inString && ch.charCodeAt(0) < 0x20) {
      // 개행·탭은 의미가 있으니 이스케이프해 살리고, 나머지 제어문자는 버린다.
      if (ch === "\n") out += "\\n";
      else if (ch === "\r") out += "\\r";
      else if (ch === "\t") out += "\\t";
      continue;
    }
    out += ch;
  }
  return out;
}

function parseStructuredConsultationResult(text) {
  const jsonText = extractJsonObjectText(text);
  if (!jsonText) return null;
  const isUsable = (value) => (
    value && typeof value === "object" && value.sections && typeof value.sections === "object" ? value : null
  );
  try {
    return isUsable(JSON.parse(jsonText));
  } catch {
    // 1차 실패는 대개 문자열 안 raw 개행이다. 이스케이프해서 한 번 더 시도한다.
    try {
      return isUsable(JSON.parse(escapeRawControlCharsInJsonStrings(jsonText)));
    } catch {
      return null;
    }
  }
}

function countStructuredConsultationBodyChars(text) {
  const parsed = parseStructuredConsultationResult(text);
  if (!parsed) return 0;
  return Object.values(parsed.sections || {}).reduce((sum, section) => {
    if (!section || typeof section !== "object") return sum;
    return sum + clean(section.body).length;
  }, 0);
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

function safeLogPayload({ route = "", requestId = "", body = {}, normalized = null, validation = "", access = "", env = {}, error = null, providerReason = "" } = {}) {
  const input = normalized?.input || {};
  const birthInfo = input.birthInfo || body.birthInfo || {};
  const question = clean(input.userQuestion ?? input.question ?? body.userQuestion ?? body.question ?? body.message, 1200);
  return {
    route: clean(route || "/api/ziwei-ai", 120),
    requestId: clean(requestId || body.requestId || body.idempotencyKey, 180),
    serviceType: clean(input.serviceType || body.serviceType || body.featureKey || FEATURE_KEY, 80),
    consultationType: clean(input.consultationType || body.consultationType || "ziwei", 40),
    focusArea: clean(input.focusArea || body.focusArea || "overall", 40),
    validation,
    access,
    name: maskName(input.birthInfo?.name || birthInfo.name || body.userName || body.name),
    gender: clean(input.birthInfo?.gender || birthInfo.gender || body.gender, 20),
    birthDate: maskBirthDate(input.birthInfo?.birthDate || birthInfo.birthDate || body.birthDate),
    calendarType: clean(input.birthInfo?.calendarType || birthInfo.calendarType || body.calendarType, 20),
    questionLength: question.length,
    ...getProviderDiagnostics(env),
    providerReason: providerReason || getProviderDiagnostics(env).providerReason,
    ...(error ? {
      errorMessage: clean(error?.message || error, 500),
      ...(isDevelopmentEnv(env) ? { stack: clean(error?.stack, 2000) } : {}),
    } : {}),
  };
}

function logZiweiAi(marker, details = {}, level = "info") {
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
  console[method](`[Ziwei AI LLM ${marker}]`, details);
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
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes).map((byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, length);
}

function buildPaymentId(userId) {
  const suffix = clean(userId, 40).replace(/[^a-zA-Z0-9_-]/g, "").slice(-10) || "guest";
  return `cd-zwai-${suffix}-${Date.now()}-${randomToken(8)}`;
}

function normalizeGender(value) {
  const text = clean(value, 20).toLowerCase();
  if (["m", "male", "man", "남", "남성", "남자"].includes(text)) return "male";
  if (["f", "female", "woman", "여", "여성", "여자"].includes(text)) return "female";
  if (["unknown", "other", "기타", "비공개"].includes(text)) return "unknown";
  return text || "";
}

function normalizeCalendarType(value) {
  const text = clean(value, 20).toLowerCase();
  if (text === "lunar" || text === "음력") return "lunar";
  return "solar";
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeFocusArea(value, fallbackTopic = "") {
  const token = clean(value, 40).toLowerCase();
  if (FOCUS_AREAS.has(token)) return token;
  const topic = clean(fallbackTopic, 80);
  const matched = Object.entries(FOCUS_AREA_LABELS).find(([, label]) => label === topic);
  return matched?.[0] || "overall";
}

function normalizeConsultationInput(body = {}) {
  const birthSource = body.birthInfo && typeof body.birthInfo === "object" ? body.birthInfo : body;
  const name = clean(body.userName ?? body.name ?? body.nickname ?? birthSource.name ?? birthSource.nickname, 80);
  const gender = normalizeGender(body.gender ?? birthSource.gender);
  const birthDate = clean(body.birthDate ?? birthSource.birthDate, 10);
  const birthTimeUnknown = body.birthTimeUnknown === true || birthSource.birthTimeUnknown === true;
  const birthTime = birthTimeUnknown ? "" : clean(body.birthTime ?? birthSource.birthTime, 5);
  const calendarType = normalizeCalendarType(body.calendarType ?? birthSource.calendarType);
  const isLeapMonth = body.isLeapMonth === true || birthSource.isLeapMonth === true;
  const focusArea = normalizeFocusArea(body.focusArea, body.topic ?? body.consultationTopic);
  const topic = clean(body.topic ?? body.consultationTopic ?? FOCUS_AREA_LABELS[focusArea], 80);
  const userQuestion = clean(body.userQuestion ?? body.question ?? body.message, 1200);
  const serviceType = clean(body.serviceType || FEATURE_KEY, 80);
  const consultationType = clean(body.consultationType || "ziwei", 40);
  const locale = clean(body.locale || "ko", 12);

  if (!gender) return { ok: false, message: MESSAGES.invalidInput };
  if (!isValidDateKey(birthDate)) return { ok: false, message: MESSAGES.invalidInput };
  if (!birthTimeUnknown && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) return { ok: false, message: MESSAGES.birthTimeMissing };
  if (!TOPICS.has(topic)) return { ok: false, message: "상담 주제를 다시 선택해 주세요." };
  if (!FOCUS_AREAS.has(focusArea)) return { ok: false, message: "상담 주제를 다시 선택해 주세요." };
  if (focusArea === "custom" && userQuestion.length < 2) return { ok: false, message: MESSAGES.customQuestionRequired };
  if (userQuestion && userQuestion.length < 2) return { ok: false, message: "현재 가장 궁금한 질문을 조금 더 구체적으로 적어 주세요." };

  const normalized = {
    serviceType,
    consultationType,
    focusArea,
    locale,
    birthInfo: {
      name,
      gender,
      birthDate,
      birthTime,
      birthTimeUnknown,
      calendarType,
      isLeapMonth,
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

function invalidInput(message = MESSAGES.invalidInput, status = 422) {
  return json({ ok: false, reason: "INVALID_INPUT", message: clean(message) || MESSAGES.invalidInput }, { status });
}

function loginRequired() {
  return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 });
}

function serverError(message = MESSAGES.serverFailed, status = 500) {
  return json({ ok: false, reason: "SERVER_ERROR", message }, { status });
}

function paymentVerifyFailed() {
  return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED", message: MESSAGES.paymentVerifyFailed }, { status: 402 });
}

function calculationFailed() {
  return json({ ok: false, reason: "CALCULATION_FAILED", message: MESSAGES.calculationFailed }, { status: 422 });
}

function getPricing() {
  const resolved = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  const pricing = resolved?.pricing || {};
  const coinPrice = Number(pricing.coinPrice || pricing.cost || COIN_PRICE);
  const amountKRW = Number(pricing.amountKRW || pricing.paymentAmount || AMOUNT_KRW);
  return {
    pricing: {
      ...pricing,
      featureKey: FEATURE_KEY,
      cost: coinPrice,
      coinPrice,
      amountKRW,
      paymentAmount: amountKRW,
      reason: pricing.reason || ORDER_NAME,
    },
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

async function loadBillingUser(userId, env) {
  if (!mongoose.Types.ObjectId.isValid(String(userId || ""))) return null;
  const user = await User.findById(userId)
    .select("email name phoneNumber points role profileSubscription subscription membership pass entitlement paidFeatures unlockedFeatures recentConsumeRequestIds")
    .lean();
  // 저장값이 암호화 봉투일 수 있으므로 여기서 평문으로 되돌린다(worker/lib/pii-crypto.js).
  // 아래 customerFromUser 는 동기 함수라 그대로 두고, 로드 지점 한 곳에서만 푼다.
  if (user) user.phoneNumber = await decryptPhoneNumber(user.phoneNumber, env);
  return user;
}

function hasMonthlyCredit(user = {}, membershipCreditCost = 0) {
  const balance = Math.max(0, Math.floor(Number(user?.profileSubscription?.membershipCreditBalance || user?.profileSubscription?.monthlyStoneBalance || 0)));
  return membershipCreditCost > 0 && balance >= membershipCreditCost;
}

async function findPaidPayment({ userId, idempotencyKey = "", paymentId = "" }) {
  const clauses = [];
  if (idempotencyKey) clauses.push({ idempotencyKey });
  if (paymentId) clauses.push({ merchantUid: paymentId }, { impUid: paymentId });
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

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function uniq(values = []) {
  return [...new Set(values.map((value) => clean(value, 180)).filter(Boolean))];
}

function readBillingContext(body = {}) {
  const billing = asObject(body.billingEvidence || body.billing || body.paymentEvidence);
  const consume = asObject(body.consume || billing.consume);
  const accessGrant = asObject(body.accessGrant || billing.accessGrant);
  const payment = asObject(body.payment || billing.payment);
  return { billing, consume, accessGrant, payment };
}

function collectBillingTokens(body = {}, idempotencyKey = "") {
  const ctx = readBillingContext(body);
  return uniq([
    idempotencyKey,
    body.paymentId,
    body.merchantUid,
    body.merchant_uid,
    body.impUid,
    body.imp_uid,
    body.transactionId,
    body.purchaseId,
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
    ctx.accessGrant.merchantUid,
    ctx.accessGrant.impUid,
    ctx.accessGrant.requestId,
    ctx.payment.paymentId,
    ctx.payment.merchantUid,
    ctx.payment.impUid,
    ctx.payment.id,
    ctx.payment._id,
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
    clauses.push({ requestId: token });
    clauses.push({ idempotencyKey: token });
    clauses.push({ merchantUid: token });
    clauses.push({ impUid: token });
    if (mongoose.Types.ObjectId.isValid(token)) clauses.push({ _id: token });
  });
  return clauses;
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

async function resolveBillingGateAccess({ env, auth, user, body, pricing, idempotencyKey }) {
  const signal = readBillingAccessSignal(body);
  const tokens = collectBillingTokens(body, idempotencyKey);
  const featureKeys = [FEATURE_KEY];
  const hasEvidencePayload = tokens.length > 0 || signal.includes("pass") || signal.includes("monthly") || signal.includes("credit") || signal.includes("coin");
  if (!hasEvidencePayload) return null;

  if (/usage[-_]pass/.test(signal)) return null;

  if (signal.includes("pass") || signal.includes("membership_pass")) {
    const featureAccess = resolveFeatureAccessPolicy({ user: user || {}, pricing, coinCost: pricing.coinPrice });
    if (featureAccess.allowed) {
      return {
        ok: true,
        accessType: featureAccess.accessType || "pass",
        paymentId: tokens[0] || "",
        prepaid: true,
        evidenceType: "pass",
      };
    }
  }

  const paymentClauses = billingTokenClauses(tokens);
  if (paymentClauses.length) {
    const payment = await Payment.findOne({
      userId: auth.userId,
      paymentType: "digital_content",
      featureKey: { $in: featureKeys },
      status: { $in: ["paid", "success", "fulfilled"] },
      $or: paymentClauses,
    }).sort({ updatedAt: -1, paidAt: -1, createdAt: -1 }).lean();
    if (payment) {
      return {
        ok: true,
        accessType: "paid",
        paymentId: clean(payment.merchantUid || payment.impUid || payment._id, 160),
        prepaid: true,
        evidenceType: "direct_payment",
        evidenceId: clean(payment._id, 160),
      };
    }
  }

  const pointClauses = pointHistoryTokenClauses(tokens);
  if (pointClauses.length) {
    const pointHistory = await PointHistory.findOne({
      userId: auth.userId,
      kind: "deduct",
      featureKey: { $in: featureKeys },
      "metadata.coinRefundedForUnlockFailure": { $ne: true },
      "metadata.refundedForServiceExecution": { $ne: true },
      $or: pointClauses,
    }).sort({ createdAt: -1 }).lean();
    if (pointHistory) {
      return {
        ok: true,
        accessType: "paid",
        paymentId: clean(pointHistory._id, 160),
        prepaid: true,
        evidenceType: "coin",
        evidenceId: clean(pointHistory._id, 160),
        amount: Math.max(0, Math.floor(Math.abs(Number(pointHistory.delta || pointHistory?.metadata?.chargedCoins || pricing.coinPrice || 0)))),
        purchaseId: clean(pointHistory?.metadata?.purchaseId || pointHistory?.metadata?.idempotencyKey || pointHistory?.metadata?.orderId || "", 180),
      };
    }
  }

  // 월정석 증빙은 정본 하나로 판정한다(worker/lib/moonstone-spend-proof.js) — 미정산 예약행 배제와
  // 구 원장 호환이 거기 모여 있다. 라우트마다 쿼리를 따로 두면 writer 가 바뀔 때 조용히 죽는다.
  const monthlyEvidence = await findMoonstoneSpendEvidence(env, {
    userId: auth.userId,
    featureKeys: [FEATURE_KEY, SERVICE_KEY],
    tokens,
  });
  if (monthlyEvidence) {
    return {
      ok: true,
      accessType: "subscription",
      paymentId: clean(monthlyEvidence.ledgerId, 160),
      prepaid: true,
      evidenceType: "monthly_credit",
      evidenceId: clean(monthlyEvidence.ledgerId, 160),
      amount: Math.max(0, Math.floor(Number(monthlyEvidence.amount || pricing.membershipCreditCost || 0))),
      purchaseId: clean(monthlyEvidence.sourceId, 180),
    };
  }

  return null;
}

async function resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash, paymentId = "" }) {
  if (isAdmin(auth) || clean(user?.role).toLowerCase() === "admin") {
    return { ok: true, accessType: "admin", paymentId: "" };
  }

  const paidPayment = await findPaidPayment({ userId: auth.userId, idempotencyKey, paymentId });
  if (paidPayment) {
    const storedHash = clean(paidPayment?.pricingSnapshot?.inputHash);
    if (storedHash && storedHash !== inputHash) {
      return { ok: false, reason: "INVALID_INPUT", message: "같은 요청 키로 다른 상담 정보를 사용할 수 없습니다." };
    }
    return { ok: true, accessType: "paid", paymentId: clean(paidPayment.merchantUid || paidPayment.impUid || paymentId, 160) };
  }

  const featureAccess = resolveFeatureAccessPolicy({ user: user || {}, pricing, coinCost: pricing.coinPrice });
  if (featureAccess.allowed) {
    return { ok: true, accessType: featureAccess.accessType || "pass", paymentId: "" };
  }

  if (hasMonthlyCredit(user, pricing.membershipCreditCost)) {
    return { ok: true, accessType: "subscription", paymentId: "" };
  }

  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

function customerFromUser(user, userId) {
  const email = clean(user?.email).toLowerCase();
  const safeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : `buyer-${clean(userId).slice(-10) || "guest"}@code-destiny.com`;
  return {
    fullName: clean(user?.name, 40) || "Code Destiny",
    email: safeEmail,
    phoneNumber: clean(user?.phoneNumber).replace(/\D/g, "").slice(0, 11),
  };
}

function buildPaymentPayload({ config, paymentId, pricing, user, userId, idempotencyKey }) {
  return {
    storeId: config.storeId || "",
    channelKey: config.channelKey || "",
    paymentId,
    merchantUid: paymentId,
    orderName: ORDER_NAME,
    totalAmount: pricing.amountKRW,
    paymentAmount: pricing.amountKRW,
    amountKRW: pricing.amountKRW,
    currency: config.currency || "CURRENCY_KRW",
    payMethod: config.payMethod || "CARD",
    customer: customerFromUser(user, userId),
    featureKey: FEATURE_KEY,
    serviceId: SERVICE_KEY,
    serviceKey: SERVICE_KEY,
    contentId: FEATURE_KEY,
    contentType: SERVICE_KEY,
    idempotencyKey,
    noticeUrl: config.noticeUrl || "",
    customData: {
      serviceKey: SERVICE_KEY,
      featureKey: FEATURE_KEY,
      idempotencyKey,
    },
    runtimeGate: {
      title: ORDER_NAME,
      reason: ORDER_NAME,
      featureKey: FEATURE_KEY,
      categoryKey: "premium-consultation",
      subFeatureKey: FEATURE_KEY,
      serviceKey: SERVICE_KEY,
      cost: pricing.coinPrice,
      coinPrice: pricing.coinPrice,
      amountKRW: pricing.amountKRW,
      amountKrw: pricing.amountKRW,
      membershipCreditCost: pricing.membershipCreditCost,
      requestId: idempotencyKey,
      idempotencyKey,
    },
  };
}

async function createOrReusePaymentPayload({ env, auth, user, pricing, idempotencyKey, inputHash }) {
  const config = getPortOnePublicConfig(env || {});

  // 결제 read만 재시도 — Payment.create(쓰기)는 이중결제 위험으로 래핑하지 않는다.
  const existing = await withMongoRetry(env, () => Payment.findOne({
    userId: auth.userId,
    idempotencyKey,
    paymentType: "digital_content",
  }).sort({ createdAt: -1 }).lean());

  if (existing) {
    if (clean(existing.featureKey) !== FEATURE_KEY || clean(existing?.pricingSnapshot?.inputHash) !== inputHash) {
      return { ok: false, message: "같은 요청 키로 다른 결제 요청을 만들 수 없습니다." };
    }
    const paymentId = clean(existing.merchantUid || existing.impUid, 160);
    return {
      ok: true,
      paymentPayload: buildPaymentPayload({ config, paymentId, pricing, user, userId: auth.userId, idempotencyKey }),
    };
  }

  if (!config.configured) {
    return {
      ok: true,
      paymentPayload: buildPaymentPayload({ config, paymentId: idempotencyKey, pricing, user, userId: auth.userId, idempotencyKey }),
    };
  }

  const paymentId = buildPaymentId(auth.userId);
  await Payment.create({
    userId: auth.userId,
    merchantUid: paymentId,
    idempotencyKey,
    paymentAmount: pricing.amountKRW,
    expectedChargedPoints: pricing.coinPrice,
    chargedPoints: 0,
    featureKey: FEATURE_KEY,
    productId: SERVICE_KEY,
    coinPrice: pricing.coinPrice,
    membershipCreditCost: pricing.membershipCreditCost,
    accessType: "single_purchase",
    requestId: idempotencyKey,
    pricingSnapshot: {
      ...pricing.pricing,
      serviceKey: SERVICE_KEY,
      serviceId: SERVICE_KEY,
      featureKey: FEATURE_KEY,
      contentId: FEATURE_KEY,
      contentType: SERVICE_KEY,
      inputHash,
      idempotencyKey,
      paymentId,
      orderName: ORDER_NAME,
      amountKRW: pricing.amountKRW,
      coinPrice: pricing.coinPrice,
      createdAt: new Date().toISOString(),
      returnPath: "/ziwei-ai",
    },
    paymentMethod: "CARD",
    status: "pending",
    orderState: "PENDING",
    source: "prepare",
    paymentType: "digital_content",
  });

  return {
    ok: true,
    paymentPayload: buildPaymentPayload({ config, paymentId, pricing, user, userId: auth.userId, idempotencyKey }),
  };
}

function extractPortOneStoreId(payment = {}) {
  const raw = payment?.rawV2 && typeof payment.rawV2 === "object" ? payment.rawV2 : payment;
  return clean(raw?.storeId || raw?.store?.id || raw?.store?.storeId);
}

function isKrwCurrency(value) {
  const currency = clean(value).toUpperCase();
  return currency === "KRW" || currency === "CURRENCY_KRW";
}

async function verifyPaymentForStart({ env, auth, paymentId, idempotencyKey, inputHash, pricing }) {
  const normalizedPaymentId = clean(paymentId, 160);
  if (!normalizedPaymentId) return { ok: false };

  const order = await withMongoRetry(env, () => Payment.findOne({
    userId: auth.userId,
    merchantUid: normalizedPaymentId,
    featureKey: FEATURE_KEY,
    paymentType: "digital_content",
    accessType: "single_purchase",
  }).lean());
  if (!order) return { ok: false };
  if (clean(order?.pricingSnapshot?.inputHash) !== inputHash || clean(order.idempotencyKey) !== idempotencyKey) return { ok: false };

  if (["paid", "success", "fulfilled"].includes(clean(order.status).toLowerCase())) {
    return { ok: true, accessType: "paid", paymentId: normalizedPaymentId };
  }

  let portOnePayment = null;
  try {
    portOnePayment = await fetchPortOnePayment(env, normalizedPaymentId);
  } catch (error) {
    // 🔴 예전에는 여기서 아무 흔적 없이 { ok:false } 만 돌려줬다. 2026-07 PortOne 401 장애 때
    // 카드는 승인됐는데 주문은 pending 인 채 실패 사유가 어디에도 안 남아 원인 추적이 막혔다.
    // 동작은 그대로 두고 실패 사유만 주문에 남긴다.
    console.error("[ziwei-ai] PortOne payment lookup failed", normalizedPaymentId, error?.message || error);
    await Payment.findByIdAndUpdate(order._id, {
      $set: {
        failureCode: "portone_fetch_failed",
        failureMessage: String(error?.message || "PortOne payment lookup failed.").slice(0, 300),
        failureStage: "ziwei_ai_portone_fetch",
        lastErrorAt: new Date(),
      },
    }).catch(() => {});
    return { ok: false };
  }

  const config = getPortOnePublicConfig(env);
  const portOneStoreId = extractPortOneStoreId(portOnePayment);
  const amount = Number(portOnePayment?.amount || 0);
  const status = clean(portOnePayment?.status).toLowerCase();
  if (clean(portOnePayment?.paymentId || portOnePayment?.id) !== normalizedPaymentId) return { ok: false };
  if (config.storeId && portOneStoreId && portOneStoreId !== config.storeId) return { ok: false };
  if (amount !== pricing.amountKRW) return { ok: false };
  if (!isKrwCurrency(portOnePayment?.currency)) return { ok: false };
  if (status !== "paid") return { ok: false };

  const paidAt = portOnePayment?.paid_at
    ? new Date(Number(portOnePayment.paid_at) * 1000)
    : new Date();

  await Payment.findByIdAndUpdate(order._id, {
    $set: {
      impUid: normalizedPaymentId,
      merchantUid: normalizedPaymentId,
      paymentAmount: pricing.amountKRW,
      expectedChargedPoints: pricing.coinPrice,
      chargedPoints: 0,
      coinPrice: pricing.coinPrice,
      membershipCreditCost: pricing.membershipCreditCost,
      status: "success",
      orderState: "PAID_VERIFIED",
      paidAt,
      source: "confirm",
      rawPortOne: portOnePayment,
      failureCode: null,
      failureMessage: null,
      failureStage: null,
      lastErrorAt: null,
    },
    $inc: { confirmAttempts: 1 },
  }).catch(() => {});

  return { ok: true, accessType: "paid", paymentId: normalizedPaymentId };
}

/** 관리자 CMS 가 기본값을 보여줄 때 읽어 간다(worker/lib/cms-prompt-defaults.js). */
export function getDefaultSystemPrompt() {
  return buildSystemPrompt();
}

/** CMS 오버라이드가 있으면 그것을, 없거나 조회 실패면 코드 기본값을 쓴다. */
function resolveSystemPrompt(env) {
  return cmsPromptText(env, "ziwei-ai", buildSystemPrompt());
}

function buildSystemPrompt() {
  return [
    "당신은 30년 경력의 자미두수(紫微斗數) 명인입니다. 눈앞에 앉은 사람의 명반을 손끝으로 짚어 가며, 따뜻하지만 정확하게 짚어 주는 현역 상담가처럼 답합니다.",
    "",
    "대만·홍콩 정통 파계를 기반으로 하되, 현대인의 삶에 실용적으로 적용하는 심화 독법으로 상담합니다.",
    "정확도는 계산된 명반 데이터에 둡니다. 없는 별, 없는 궁, 확인되지 않은 사건은 만들지 말고, 근거가 약한 부분은 부드러운 가능성으로 말합니다.",
    "상담은 사용자의 질문을 중심에 두고, 명반의 근거와 현실의 선택지를 한 흐름으로 이어 줍니다.",
    "",
    "가장 중요한 두 원칙(무조건 우선):",
    "A. 별 하나만 보고 길흉을 단정하지 않습니다. 반드시 해당 궁의 주성·보좌성, 삼방사정에서 회조(會照)되는 별, 회·조·협 관계, 사화(祿權科忌)의 비입/자화를 함께 종합해 서술합니다.",
    "B. 사전식 별 정의를 나열하지 않습니다('자미는 제왕의 별입니다' 같은 문장 금지). 대신 그 근거가 사용자의 삶에서 어떤 성향·사건 패턴·선택 습관으로 나타나는지로 풀어냅니다.",
    "",
    "서술 방식(각 핵심 문단을 이 3단으로):",
    "① 한 줄 핵심 — 이 궁/주제의 기조를 은유·이미지로 한 문장. (감성 한 스푼)",
    "② 왜 그런가(근거) — 성요·강약·사화·삼방사정을 근거로 '명궁의 자미가 삼방에서 천부를 회조하니…'처럼 논리를 노출해 2~3문장.",
    "③ 그래서 삶에서는 — 추상론이 아니라 지금 실행할 수 있는 행동 제안 1~2문장.",
    "",
    "표기 규칙: 별·용어는 한자를 한 번 병기하고(예: 자미(紫微), 화기(化忌)), 초심자도 읽히게 그 자리에서 한 번은 쉬운 말로 풀어 줍니다.",
    "",
    "그 밖의 원칙:",
    "1. 보고서처럼 딱딱하게 쓰지 말고, 실제 상담사가 명반을 놓고 설명하듯 자연스럽게 답변합니다.",
    "2. 명반 데이터의 각 궁에는 별의 강약(묘·왕·득·리·평·함) 값이 brightness로 함께 제공됩니다. 이 값을 반드시 해석의 핵심 근거로 사용하고([아래 계산 확정값]의 강약 표기를 그대로 인용), 표에 없는 별은 강약을 지어내지 말고 궁의 조합·사화·삼방사정으로만 근거를 세웁니다.",
    "3. 사화는 화록·화권·화과·화기가 어느 궁에 떨어지는지에 따라 확장, 장악력, 인정, 집착과 차질의 흐름으로 구분합니다.",
    "4. 보성은 도움과 보완으로, 살성은 위험 단정이 아니라 긴장, 압박, 돌파력, 반복되는 시험으로 해석합니다.",
    "5. 현재 대운과 세운은 지금 사용자가 실제로 선택할 타이밍 언어로 연결합니다.",
    "6. 화기(化忌)가 앉은 궁은 '주의'가 직관적으로 드러나게 짚되, 공포를 조장하지 말고 반드시 대처법을 함께 제시합니다.",
    "7. 질액궁은 건강을 단정하지 말고 생활 습관과 취약 경향으로 조심스럽게 해석합니다.",
    "8. 운세를 절대적 예언처럼 말하지 않고 불안감을 조장하지 않습니다.",
    "9. 같은 문장을 반복하지 않습니다.",
    "10. PDF, 챕터, job, progress, 프롬프트, 시스템 같은 표현을 결과에 노출하지 않습니다.",
    "11. 사용자가 선택한 상담 주제와 자유 질문을 가장 깊게 다룹니다.",
    "12. 삼방사정은 한 궁만 따로 끊어 보지 않고, 질문과 연결된 축의 힘이 어디서 들어오고 어디로 새는지 읽는 방식으로 반영합니다.",
    "13. 문단 사이는 빈 줄로 구분하고, 핵심 문구는 **굵게** 표시합니다. 필요할 때만 '-' 목록을 쓰고, 그 외 마크다운(제목 #, 코드블록, 표)은 쓰지 않습니다.",
  ].join("\n");
}

// 사화 4성이 실제로 앉은 궁을 명반에서 찾아 확정값으로 요약한다.
function resolveSihuaPlacements(chart) {
  const palaces = Array.isArray(chart?.palaces) ? chart.palaces : [];
  const transforms = chart?.fourTransformations || {};
  const labels = { huaLu: "화록", huaQuan: "화권", huaKe: "화과", huaJi: "화기" };
  const placements = {};
  for (const [key, star] of Object.entries(transforms)) {
    if (!star) continue;
    const palace = palaces.find((item) => [
      ...(item.mainStars || []),
      ...(item.assistantStars || []),
      ...(item.maleficStars || []),
    ].includes(star));
    placements[key] = { label: labels[key] || key, star, palace: palace?.name || "" };
  }
  return placements;
}

// 궁의 주성/보성/살성 이름에 brightness(강약) 표기를 붙인 텍스트로 변환한다. 표에 없는 별은 이름만 표기(가짜 강약 생성 금지).
function starsWithBrightness(palace, stars) {
  const list = Array.isArray(stars) ? stars : [];
  if (!list.length) return "무주성(차성안궁)";
  const brightness = palace?.brightness && typeof palace.brightness === "object" ? palace.brightness : {};
  return list.map((name) => formatStarWithBrightness(name, brightness[name])).join(", ");
}

function buildCanonicalZiweiFacts(chart) {
  const lines = [];
  const palaces = Array.isArray(chart?.palaces) ? chart.palaces : [];
  const lifePalaceData = palaces.find((item) => item.name === "명궁");
  if (chart?.lifePalace || lifePalaceData) {
    lines.push(`명궁: ${lifePalaceData?.earthlyBranch ? `${lifePalaceData.earthlyBranch}궁` : ""} 주성 ${starsWithBrightness(lifePalaceData, lifePalaceData?.mainStars)}`.trim());
  }
  if (chart?.bodyPalace) lines.push(`신궁: ${chart.bodyPalace}`);
  const sihua = resolveSihuaPlacements(chart);
  const sihuaLine = Object.values(sihua)
    .map((item) => `${item.label}=${item.star}${item.palace ? `(${item.palace})` : ""}`)
    .join(" · ");
  if (sihuaLine) lines.push(`사화: ${sihuaLine}`);
  if (chart?.bureau?.name) lines.push(`오행국: ${chart.bureau.name} (첫 대한 ${chart.bureau.number}세 시작)`);
  if (palaces.length) {
    lines.push("12궁 강약(◎=묘·최상, O=득·안정, ▲=리·이로움, △=평·보통, X=함·주의):");
    for (const palace of palaces) {
      const allStars = [...(palace.mainStars || []), ...(palace.assistantStars || []), ...(palace.maleficStars || [])];
      if (!allStars.length) continue;
      lines.push(`- ${palace.name}(${palace.earthlyBranch}): ${starsWithBrightness(palace, allStars)}`);
    }
  }
  return lines;
}

// 대한은 오행국이 정한 첫 대한 나이부터 10년씩 흐른다. 세는나이 기준이라 라벨에 그대로 밝힌다.
function resolveCurrentMajorLuck(chart, birthDate) {
  const birthYear = Number(String(birthDate || "").slice(0, 4));
  if (!Number.isFinite(birthYear) || birthYear < 1900) return null;
  const age = new Date().getFullYear() - birthYear + 1;
  const rows = Array.isArray(chart?.majorLuck) ? chart.majorLuck : [];
  const current = rows.find((row) => age >= Number(row?.startAge) && age <= Number(row?.endAge));
  return current ? { ...current, age } : null;
}

// 서버가 계산한 명반을 화면과 프롬프트가 함께 쓰는 근거 형태로 옮긴다.
// 여기 없는 별·궁·수치는 본문에도 등장하면 안 된다(buildEvidenceRuleLines가 그 규칙을 건다).
function buildZiweiAnalysisBasis(chart, birthInfo = {}) {
  const palaces = Array.isArray(chart?.palaces) ? chart.palaces : [];
  const lifeData = palaces.find((item) => item.name === "명궁") || null;
  const bodyData = palaces.find((item) => item.name === chart?.bodyPalace) || null;
  const sihua = resolveSihuaPlacements(chart);
  const currentLuck = resolveCurrentMajorLuck(chart, birthInfo?.birthDate);
  const yearly = chart?.yearlyLuck || {};
  const triad = chart?.sanFangSiZheng?.byPalace?.["명궁"] || null;

  const coreItems = [
    lifeData || chart?.lifePalace
      ? basisItem("명궁", `${lifeData?.earthlyBranch ? `${lifeData.earthlyBranch}궁 · ` : ""}${starsWithBrightness(lifeData, lifeData?.mainStars)}`)
      : null,
    chart?.bodyPalace ? basisItem("신궁", `${chart.bodyPalace}${bodyData?.mainStars?.length ? ` · ${starsWithBrightness(bodyData, bodyData.mainStars)}` : ""}`) : null,
    chart?.bureau?.name ? basisItem("오행국", `${chart.bureau.name} · 첫 대한 ${chart.bureau.number}세부터`) : null,
  ];

  const sihuaItems = Object.values(sihua).map((item) => basisItem(
    item.label,
    `${item.star}${item.palace ? ` → ${item.palace}` : ""}`,
    { term: item.label, tone: item.label === "화기" ? "caution" : "positive" },
  ));

  const palaceItems = palaces
    .map((palace) => {
      const stars = [...(palace.mainStars || []), ...(palace.assistantStars || []), ...(palace.maleficStars || [])];
      if (!stars.length) return null;
      return basisItem(`${palace.name}(${palace.earthlyBranch})`, starsWithBrightness(palace, stars));
    })
    .filter(Boolean);

  const luckItems = [
    currentLuck
      ? basisItem("대한", `${currentLuck.palaceName} · ${currentLuck.range}세 · ${currentLuck.direction} (세는나이 ${currentLuck.age}세 기준)`)
      : null,
    yearly?.palaceName
      ? basisItem("올해 세운", `${yearly.year}년 ${yearly.earthlyBranch} · ${yearly.palaceName}${yearly.mainStars?.length ? ` · ${yearly.mainStars.join(", ")}` : ""}`)
      : null,
    triad?.palaceNames?.length ? basisItem("삼방사정", `명궁 ↔ ${triad.palaceNames.filter((name) => name !== "명궁").join(" · ")}`) : null,
  ];

  return buildAnalysisBasisPayload({
    featureKey: FEATURE_KEY,
    groups: [
      basisGroup("core", "명궁과 신궁", coreItems, { hint: "명반을 읽는 첫 자리입니다. 명궁이 타고난 결, 신궁이 살면서 매달리게 되는 자리입니다." }),
      basisGroup("sihua", "사화가 앉은 자리", sihuaItems, { hint: "네 가지 변화가 어느 궁에 놓였는지가 힘이 실리는 방향과 막히는 지점을 정합니다." }),
      basisGroup("palaces", "12궁 강약", palaceItems, { hint: "◎묘 · O득 · ▲리 · △평 · X함. 강한 자리는 확장으로, 약한 자리는 관리로 읽습니다." }),
      basisGroup("luck", "지금의 흐름", luckItems, { hint: "타고난 배치 위에 현재 어떤 조명이 들어와 있는지를 봅니다." }),
    ],
    stages: [
      basisStage("palace", "명궁을 세우는 중", "12궁 배치와 오행국", ["core"]),
      basisStage("stars", "성계를 배치하는 중", "주성·보성·살성의 강약", ["palaces"]),
      basisStage("sihua", "사화의 흐름을 읽는 중", "화록·화권·화과·화기", ["sihua"]),
      basisStage("luck", "대한의 물길을 찾는 중", "현재 대한과 올해 세운", ["luck"]),
    ],
    uncertainty: chart?.uncertainty?.birthTimeUnknown ? { birthTimeUnknown: true } : undefined,
  });
}

// LLM 응답의 meta를 서버 계산 확정값으로 덮어쓰고, 본문이 사화·12궁을 실제로 참조했는지 검증한다.
function enforceZiweiChartFacts(text, chart) {
  const parsed = parseStructuredConsultationResult(text);
  if (!parsed || typeof parsed !== "object") return { text, issues: [] };

  const palaces = Array.isArray(chart?.palaces) ? chart.palaces : [];
  const lifeData = palaces.find((item) => item.name === "명궁") || null;
  const bodyData = palaces.find((item) => item.name === chart?.bodyPalace) || null;
  const sihua = resolveSihuaPlacements(chart);
  const meta = parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {};

  meta.mingong = {
    ...(meta.mingong && typeof meta.mingong === "object" ? meta.mingong : {}),
    branch: lifeData?.earthlyBranch || "",
    main_stars: lifeData?.mainStars || [],
  };
  meta.shengong = {
    ...(meta.shengong && typeof meta.shengong === "object" ? meta.shengong : {}),
    palace: chart?.bodyPalace || "",
    main_stars: bodyData?.mainStars || [],
  };
  const sihuaKeyMap = { huaLu: "lu", huaQuan: "quan", huaKe: "ke", huaJi: "ji" };
  const metaSihua = meta.sihua && typeof meta.sihua === "object" ? meta.sihua : {};
  for (const [key, placement] of Object.entries(sihua)) {
    metaSihua[sihuaKeyMap[key] || key] = { star: placement.star, palace: placement.palace };
  }
  meta.sihua = metaSihua;

  const currentYear = new Date().getFullYear();
  const lunarYear = Number(chart?.lunar?.year);
  const age = Number.isFinite(lunarYear) ? currentYear - lunarYear + 1 : null;
  const currentLuck = age != null
    ? (chart?.majorLuck || []).find((cycle) => Number(cycle.startAge) <= age && age <= Number(cycle.endAge))
    : null;
  if (currentLuck) {
    const luckPalace = palaces.find((item) => item.name === currentLuck.palaceName) || null;
    meta.dayun = {
      ...(meta.dayun && typeof meta.dayun === "object" ? meta.dayun : {}),
      current_palace: currentLuck.palaceName || "",
      age_range: currentLuck.range || "",
      main_stars: luckPalace?.mainStars || [],
    };
  }
  parsed.meta = meta;

  const sections = parsed.sections && typeof parsed.sections === "object" ? parsed.sections : {};
  const bodyText = Object.values(sections).map((section) => clean(section?.body)).join("\n");
  const issues = [];
  for (const placement of Object.values(sihua)) {
    if (placement.star && bodyText && !bodyText.includes(placement.star)) {
      issues.push(`SIHUA_STAR_UNSTATED:${placement.star}`);
    }
  }
  if (bodyText && palaces.length) {
    const mentioned = palaces.filter((item) => bodyText.includes(item.name)).length;
    if (mentioned < 9) issues.push(`PALACE_COVERAGE:${mentioned}/12`);
  }
  if (bodyText && (lifeData?.mainStars || []).length && !lifeData.mainStars.some((star) => bodyText.includes(star))) {
    issues.push("MINGGONG_STAR_UNSTATED");
  }

  return { text: JSON.stringify(parsed, null, 2), issues };
}

function describeZiweiGroundingIssues(issues, chart) {
  const lines = [];
  const missingStars = issues.filter((issue) => issue.startsWith("SIHUA_STAR_UNSTATED:")).map((issue) => issue.split(":")[1]);
  if (missingStars.length) lines.push(`- 사화 별 ${missingStars.join(", ")}를 본문에서 별 이름으로 직접 언급하며 해석하라.`);
  if (issues.some((issue) => issue.startsWith("PALACE_COVERAGE"))) {
    lines.push("- 12궁 가운데 최소 9개 궁을 본문에서 궁 이름으로 직접 참조하라. 막연한 총평으로 궁 참조를 대체하지 마라.");
  }
  if (issues.includes("MINGGONG_STAR_UNSTATED")) lines.push("- 명궁 주성을 본문에서 별 이름으로 직접 언급하며 근거로 삼아라.");
  lines.push("아래 계산 확정값과 다르게 서술하는 것은 금지한다:");
  lines.push(...buildCanonicalZiweiFacts(chart));
  return lines;
}

// 모든 그룹 프롬프트가 공유하는 머리말. 명반 데이터와 계산 확정값, 그리고 주제 특화 블록이 여기 들어간다.
// 그룹마다 이 헤더가 반복되므로 입력 토큰은 늘지만(명반 JSON 몫), 출력 토큰 총량은 그대로다.
function buildConsultationHeaderLines(input, chart) {
  const birth = input.birthInfo || {};
  const domain = resolveZiweiDomainFromFocus(input.focusArea, input.userQuestion);
  const domainTemplate = getZiweiPromptTemplate(domain);
  return [
    "[상담 정보]",
    `이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `성별: ${birth.gender}`,
    `생년월일: ${birth.birthDate}`,
    `출생시간: ${birth.birthTimeUnknown ? "모름" : birth.birthTime}`,
    `달력: ${birth.calendarType === "lunar" ? "음력" : "양력"}`,
    `윤달 여부: ${birth.isLeapMonth ? "윤달" : "아님"}`,
    `상담 주제: ${input.topic}`,
    `현재 가장 궁금한 질문: ${input.userQuestion || "자미두수 명반의 전체 흐름을 알고 싶습니다."}`,
    "",
    "[계산된 자미두수 명반 데이터]",
    JSON.stringify(chart),
    "",
    "[계산 확정값 — 본문과 meta에서 이 값과 다르게 서술하는 것을 금지]",
    ...buildCanonicalZiweiFacts(chart),
    "",
    // 주제별로 주궁·삼방사정·리딩 순서·필수 확인 성요가 달라진다(worker/lib/ziwei-ai-prompt-templates.mjs).
    ...buildZiweiDomainBriefLines(domainTemplate),
  ].filter(Boolean);
}

// 전 섹션 공통 규칙. 한자는 서버(worker/lib/ziwei-hanja.js)가 붙이므로 여기서는 쓰지 못하게 막는다.
function buildSharedSectionRuleLines(chart) {
  return [
    "공통 작성 규칙:",
    "- 각 body는 완결된 상담 문단으로 작성하고, '① 한 줄 핵심(은유) → ② 근거(궁·별·강약·사화·삼방사정) → ③ 지금 실행할 행동 조언' 3단으로 자연스럽게 이어 쓰세요. 다만 3단 골격이 기계적으로 드러나지 않게 하고, 섹션마다 도입 은유와 첫 문장 문형을 서로 다르게 바꿔 같은 리듬이 반복되지 않게 하세요. '~은 ~를 보여줍니다/의미합니다'류의 설명 투나 동일한 접속·어미 패턴을 연달아 쓰지 마세요.",
    "- 사용자의 상담 주제와 자유 질문을 먼저 붙잡고, 그 질문에 직접 닿는 궁과 별을 우선순위로 삼으세요.",
    "- 리딩의 논리 사슬을 문장에 드러내세요: 명궁 주성과 강약 → 신궁이 실어 주는 후천의 힘 → 해당 주제의 궁 → 삼방사정 회조 → 사화의 비입·자화 순으로 근거를 이어 말합니다.",
    "- 별 하나만 보고 길흉을 단정하지 마세요. 6길성(좌보·우필·문창·문곡·천괴·천월)의 부조와 6흉성(경양·타라·화성·영성·지공·지겁)의 충파를 명반에 실제로 있는 것만 근거로 함께 녹이세요.",
    "- 사전식 별 정의를 나열하지 마세요('자미는 제왕의 별입니다' 같은 문장 금지). 그 근거가 이 사람의 삶에서 어떤 성향·사건 패턴·선택 습관으로 나타나는지로 풀어냅니다.",
    "- [계산 확정값]의 '12궁 강약' 표기(◎묘·O득·▲리·△평·X함)를 모든 궁 해석의 핵심 근거로 사용하세요. 각 섹션은 추상적 서술에 그치지 말고 최소 한 번은 이 명반의 구체적 강약 표기·실제 별 이름·궁 위치를 근거로 인용하세요. 강한 별(◎/O)은 확장·기회로, 약한 별(△/X)은 관리·주의가 필요한 지점으로 명시적으로 연결하고, 표에 없는 별의 강약은 지어내지 마세요.",
    // 🔴 한자 금지 — 규칙으로 "빈 괄호 금지"를 두 번 못 박았는데도 운영 화면에 `천이궁( )` 이 나왔다.
    //    병기는 서버가 결정론적으로 붙인다. 모델이 괄호를 열 이유 자체를 없앤다.
    "- 한자를 쓰지 마세요. 궁 이름·별 이름·전문 용어는 모두 한글로만 적습니다(예: '명궁', '자미', '화기'). 괄호를 열어 한자나 병기를 넣지 마세요. 강약 표기 괄호(예: 최상(◎))만 예외입니다.",
    "- 초심자도 읽히게, 전문 용어를 처음 쓴 자리에서 한 번은 쉬운 말로 풀어 주세요.",
    "- 전체 문체는 전문적이고 신비롭되, 개발 문서나 기능 안내처럼 들리면 안 됩니다.",
    "- 결과를 소개하거나 화면을 설명하는 도입어, 서비스나 기능 안내처럼 들리는 표현을 쓰지 마세요.",
    chart?.uncertainty?.birthTimeUnknown ? "- 출생시간을 모르는 입력이므로, 단정하지 말고 '입력된 정보 기준으로 본 흐름'이라는 뉘앙스를 자연스럽게 반영해 주세요." : "",
  ].filter(Boolean);
}

function buildSectionSchemaFor(sectionKeys) {
  const reasoningSchema = buildReasoningSectionSchema();
  const schema = {};
  for (const key of sectionKeys) {
    schema[key] = reasoningSchema[key] || { title: SECTION_TITLES[key] || key, body: "상담 본문" };
  }
  return schema;
}

// reading_guide 는 "3~4문장 길잡이"라 길게 쓰면 오히려 나쁘다. 이 섹션만 고정된 짧은 몫을 주고
// 나머지 분량은 다른 섹션이 나눠 갖는다.
const SHORT_SECTION_CHARS = Object.freeze({ reading_guide: 300 });

/**
 * 그룹 목표 분량을 섹션별 목표로 배분한다.
 *
 * 🔴 왜 필요한가: "이 그룹 합산 3,600자 이상"처럼 총량만 주면 모델이 배분을 스스로 낮게 잡는다.
 * 게다가 근거 중심 섹션에는 REASONING_SECTION_SPECS 의 minChars(360~780자)가 함께 실리는데,
 * 그 구체적인 숫자가 앵커가 되어 그룹 전체를 그 수준으로 끌어내렸다 — foundation 그룹은 목표가
 * 3,600자인데 섹션 지시를 다 더하면 1,100자(31%)여서, 목표 분량 도달이 구조적으로 불가능했다.
 * 그 minChars 는 "다섯 섹션을 단일 호출에 더하면 maxOutputTokens 상한에 걸린다"는 이유로
 * 의도적으로 작게 잡힌 값이라(fortune-reasoning-contract.js 주석), 그룹당 8,000토큰을 따로 쓰는
 * 지금의 병렬 생성에는 해당되지 않는다. 공유 상수는 그대로 두고 여기서만 그룹 목표로 덮어쓴다.
 */
function buildSectionCharTargets(group) {
  const shortKeys = group.sections.filter((key) => SHORT_SECTION_CHARS[key]);
  const normalKeys = group.sections.filter((key) => !SHORT_SECTION_CHARS[key]);
  const shortTotal = shortKeys.reduce((sum, key) => sum + SHORT_SECTION_CHARS[key], 0);
  const perNormal = normalKeys.length
    ? Math.ceil(Math.max(0, group.targetChars - shortTotal) / normalKeys.length)
    : 0;
  const targets = {};
  for (const key of shortKeys) targets[key] = SHORT_SECTION_CHARS[key];
  for (const key of normalKeys) targets[key] = perNormal;
  return targets;
}

// 그룹이 맡은 근거 중심 섹션의 규칙만 싣는다. domain_matrix 를 맡은 그룹만 분야별 분석 규칙을 받는다.
// 최소 분량은 공유 상수의 minChars 가 아니라 위에서 배분한 그룹 목표를 쓴다(같은 프롬프트 안에서
// 두 숫자가 충돌하면 모델은 작은 쪽을 따른다).
function buildGroupReasoningRuleLines(sectionKeys, charTargets = {}) {
  const specs = REASONING_SECTION_SPECS.filter((spec) => sectionKeys.includes(spec.key));
  if (!specs.length) return [];
  const lines = ["[근거 중심 섹션 작성 규칙]"];
  for (const spec of specs) {
    const minChars = Math.max(spec.minChars, Number(charTargets[spec.key]) || 0);
    lines.push(`- ${spec.key}(${spec.title}): ${spec.guide} 최소 ${minChars.toLocaleString("ko-KR")}자.`);
  }
  return sectionKeys.includes("domain_matrix") ? lines.concat(buildDomainAnalysisRuleLines()) : lines;
}

/**
 * 섹션 그룹 하나를 생성시키는 프롬프트.
 * group.sections 가 전체 18개면 예전과 동일한 단일 프롬프트가 되고(= buildFirstPrompt),
 * 그보다 작으면 그 그룹만 쓰게 하는 병렬 생성용 프롬프트가 된다.
 */
function buildSectionGroupPrompt(input, chart, group) {
  const birth = input.birthInfo || {};
  const sectionKeys = group.sections;
  const charTargets = buildSectionCharTargets(group);
  const otherSections = SECTION_GROUP_SPECS
    .filter((spec) => spec.id !== group.id)
    .flatMap((spec) => spec.sections)
    .filter((key) => !sectionKeys.includes(key));

  return [
    ...buildConsultationHeaderLines(input, chart),
    "",
    group.focus ? `[이번에 쓸 부분] ${group.focus}` : "",
    "",
    "반드시 아래 JSON 구조만 반환해 주세요. JSON 앞뒤에 설명, 마크다운 코드블록, 인사말을 붙이지 마세요.",
    JSON.stringify({ sections: buildSectionSchemaFor(sectionKeys) }),
    "",
    // 실측(2026-08-01): responseMimeType 을 줘도 긴 한국어 본문에서 JSON 이 확률적으로 깨진다.
    // 문자열 안 큰따옴표가 흔한 원인이라 아예 쓰지 않게 한다(개행은 파서가 복구하므로 허용).
    "- body 문자열 안에서 큰따옴표(\") 를 쓰지 마세요. 인용이나 강조가 필요하면 작은따옴표(') 나 낫표(「」) 를 쓰세요.",
    `- 위 JSON 의 ${sectionKeys.join(", ")} 만 작성합니다. 다른 키를 새로 만들지 마세요.`,
    otherSections.length
      ? `- ${otherSections.join(", ")} 는 이 상담의 다른 대목에서 따로 다룹니다. 필요하면 한 줄로 언급만 하고 여기서 펼치지 마세요.`
      : "",
    `- 이 부분의 body 합산은 공백 포함 ${Number(group.targetChars).toLocaleString("ko-KR")}자 이상 ${Number(Math.round(group.targetChars * 1.35)).toLocaleString("ko-KR")}자 이하로 작성하세요. 문장만 늘리지 말고 자미두수 전문가가 실제로 더 살필 파트를 각 흐름에 고르게 나누어 주세요.`,
    "- 섹션별 최소 분량(반드시 지킬 것. 짧게 쓰고 넘어가면 상담이 성립하지 않습니다):",
    ...sectionKeys.map((key) => `  · ${key}: 최소 ${Number(charTargets[key] || 0).toLocaleString("ko-KR")}자`),
    "- 분량을 채우려고 같은 말을 바꿔 쓰지 마세요. 명반에서 아직 인용하지 않은 별·궁·강약 표기·사화 배치를 새로 끌어와 근거를 더하고, 그 근거가 현실에서 어떤 장면으로 나타나는지 구체적인 예를 들어 늘리세요.",
    "",
    ...buildSharedSectionRuleLines(chart),
    "",
    "섹션별 작성 규칙:",
    ...sectionKeys.map((key) => (SECTION_RULES[key] ? `- ${SECTION_RULES[key]}` : "")).filter(Boolean),
    "",
    // 위 [계산 확정값]이 그대로 사용자 화면의 근거 패널로도 나간다. 본문이 그 표를 벗어나지 않게 못 박는다.
    ...buildEvidenceRuleLines(buildZiweiAnalysisBasis(chart, birth), { includeFactTable: false }),
    "",
    ...buildGroupReasoningRuleLines(sectionKeys, charTargets),
  ].filter(Boolean).join("\n");
}

// meta 는 본문보다 훨씬 짧고, 대부분의 값은 enforceZiweiChartFacts 가 계산 확정값으로 덮어쓴다.
// 모델에게는 description/theme/scores 같은 판단 몫만 맡기면 되므로 별도의 가벼운 호출로 분리했다.
function buildMetaPrompt(input, chart) {
  const birth = input.birthInfo || {};
  return [
    ...buildConsultationHeaderLines(input, chart),
    "",
    "반드시 아래 JSON 구조만 반환해 주세요. JSON 앞뒤에 설명, 마크다운 코드블록, 인사말을 붙이지 마세요.",
    JSON.stringify({
      meta: {
        name: birth.name || "이름 미입력",
        gender: birth.gender || "미입력",
        mingong: {
          branch: "명궁 지지",
          main_stars: ["별 이름"],
          description: "명궁 핵심 요약",
        },
        shengong: {
          palace: "신궁 이름",
          main_stars: ["별 이름"],
        },
        sihua: {
          lu: { star: "별 이름", palace: "궁 이름" },
          quan: { star: "별 이름", palace: "궁 이름" },
          ke: { star: "별 이름", palace: "궁 이름" },
          ji: { star: "별 이름", palace: "궁 이름" },
        },
        dayun: {
          current_palace: "현재 대운궁 이름",
          age_range: "나이 범위",
          main_stars: ["별 이름"],
          theme: "현재 대운의 핵심 한 줄",
        },
        scores: {
          career: 0,
          wealth: 0,
          relationship: 0,
          health: 0,
          overall: 0,
        },
      },
      sections: {},
    }),
    "",
    "- mingong.description 은 명궁 주성과 강약을 근거로 한 2~3문장 요약입니다.",
    "- dayun.theme 는 현재 대운의 성격을 한 줄로 규정합니다.",
    "- career, wealth, relationship, health 는 각 20점 만점, overall 은 별도 종합 판단으로 100점 만점에 맞추세요.",
    "- 점수는 계산 확정값의 강약 표기와 사화 배치를 근거로 매기고, 근거 없이 후하게 주지 마세요.",
    "- sections 는 빈 객체 그대로 두세요.",
    "- 한자를 쓰지 마세요. 궁 이름과 별 이름은 한글로만 적습니다.",
  ].filter(Boolean).join("\n");
}

// 전 섹션을 한 프롬프트에 담은 형태. 병렬 생성 이전의 계약(근거 규칙·분야별 분석 규칙·근거 섹션 키가
// 하나의 프롬프트 안에 모두 있어야 한다)을 그대로 유지하며, verify:analysis-basis-contract 가 이 함수를 본다.
function buildFirstPrompt(input, chart) {
  const allSections = SECTION_GROUP_SPECS.flatMap((group) => group.sections);
  return buildSectionGroupPrompt(input, chart, {
    id: "__all__",
    sections: allSections,
    targetChars: MIN_INITIAL_CONSULTATION_BODY_CHARS,
    focus: "명반 전체 — 읽는 순서와 근거부터 본질·성취·인연·마무리까지",
  });
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
    `출생시간: ${birth.birthTimeUnknown ? "모름" : birth.birthTime}`,
    `달력: ${birth.calendarType === "lunar" ? "음력" : "양력"}`,
    `처음 상담 주제: ${consultation.topic}`,
    "",
    "[자미두수 명반 데이터]",
    JSON.stringify(consultation.ziweiChart || {}),
    "",
    "[이전 대화]",
    history,
    "",
    "[새 질문]",
    question,
    "",
    "이전 상담의 흐름을 이어받아 새 질문에 직접 답해 주세요. 질문과 가장 가까운 궁을 먼저 잡고, 명궁·신궁·주성 강약·사화·삼방사정·대운/세운 연결을 사용자가 이해할 수 있는 상담형 문장으로 풀어 주세요.",
    "새 답변도 명반 근거, 현실에서 드러나는 모습, 지금 선택할 조언이 자연스럽게 이어져야 합니다. 절대적 예언, 건강 단정, 불안을 키우는 표현은 피하세요.",
  ].join("\n");
}

function cleanForbiddenResult(text) {
  return clean(text)
    .replace(/\bAI\b/gi, "상담")
    .replace(/PDF/gi, "상담")
    .replace(/챕터/g, "흐름")
    .replace(/chapter/gi, "흐름")
    .replace(/\bprogress\b/gi, "흐름")
    .replace(/\bjob\b/gi, "상담")
    .replace(/프롬프트/g, "질문")
    .replace(/시스템/g, "상담 흐름");
}

function bodyCharRangeProblem(bodyChars, minBodyChars, maxBodyChars) {
  if (minBodyChars && bodyChars < minBodyChars) return "short";
  if (maxBodyChars && bodyChars > maxBodyChars) return "long";
  return "";
}

async function generateConsultationText(env, prompt, options = {}) {
  const logContext = options.logContext || {};
  logZiweiAi("Provider Selected", {
    ...logContext,
    ...getProviderDiagnostics(env),
  });
  // 자미두수 상담(자유질문 포함) → 캐시 키가 프롬프트 전체(질문 포함)로 잡혀 동일 입력만 히트.
  // 재제출/더블클릭 dedup + 결정적 재열람. follow-up(handleMessage)은 캐시 대상 아님.
  // 🔴 keyExtra 는 생성 방식을 바꿀 때마다 올린다. v1 시절의 짧은 결과가 30일 TTL 캐시에 남아 있어
  //    그대로 두면 병렬 생성으로 바꿔도 옛 결과가 계속 히트해 변경이 통째로 무효가 된다.
  //    그룹 병렬 생성은 그룹마다 다른 프롬프트를 쓰므로 keyExtra 에 그룹 id 까지 실어 서로 섞이지 않게 한다.
  //    v3(2026-08-01): 섹션별 목표 배분 + JSON 파손 복구 이전에 v2 로 캐시된 결과는 목표의 66% 분량이라
  //    같은 입력에서 30일간 그대로 히트한다. 프롬프트가 바뀌어 키가 달라지는 그룹도 있지만, 파싱 실패로
  //    0자였던 그룹은 프롬프트가 같아 옛 결과를 그대로 집는다 — 버전을 올려 일괄로 끊는다.
  const ziweiLlmCache = {
    store: createLlmCacheStore(env),
    deterministic: true,
    ttlSeconds: 30 * 24 * 60 * 60,
    keyExtra: `ziwei-ai-v3${options.cacheKeyExtra ? `-${options.cacheKeyExtra}` : ""}`,
  };
  // 초기 상담은 대형 구조화 JSON이라 JSON 모드(responseMimeType) + 잘림 반응형 재시도로
  // 첫 생성이 잘리지 않게 보장한다. follow-up 등 프로즈 응답은 기존 단발 호출을 유지한다.
  const baseMaxOutputTokens = options.maxOutputTokens || 7000;
  // PREMIUM_GEMINI_TIMEOUT_MS(운영 45s)를 || 체인에 넣으면 큰 기본값이 죽는다(45s 단락 함정).
  // 이 라우트는 동기 생성이라(아래 handleStart 참고) 엣지가 100초에 요청을 끊는다. 구 240s는 그 한계의
  // 2.4배여서, 오래 걸리는 생성은 라우트가 실패를 판정하기도 전에 잘려 나갔다 — 생성 실패 기록도
  // 선차감 접근권 복원도 실행되지 못한 채 사용자만 정체불명의 오류를 봤다.
  // clamp를 걸면 라우트가 먼저 타임아웃을 판정해, 짧아진 결과라도 아래 degrade 경로로 반드시 전달한다.
  // 초기 상담의 그룹 호출은 이보다 더 짧은 상한을 넘겨받는다(SECTION_GROUP_TIMEOUT_MS) —
  // callGeminiJsonWithRetry 가 잘림 재시도를 하므로 한 그룹이 timeout×attempts 를 쓸 수 있기 때문이다.
  const ziweiTimeoutMs = clampSyncLlmTimeoutMs(Number(options.timeoutMs) || Number(env?.ZIWEI_AI_TIMEOUT_MS) || 240000);
  const ziweiCallOptions = {
    systemPrompt: await resolveSystemPrompt(env),
    taskType: "fortune",
    temperature: 0.72,
    timeoutMs: ziweiTimeoutMs,
    cache: ziweiLlmCache,
  };
  const ai = options.responseMimeType
    ? await callGeminiJsonWithRetry(env, prompt, {
        ...ziweiCallOptions,
        ...(options.attempts ? { attempts: options.attempts } : {}),
        baseTokens: baseMaxOutputTokens,
        capTokens: Math.round(baseMaxOutputTokens * 1.3),
        responseMimeType: options.responseMimeType,
        // 폴백 허용(폴백 JSON 은 structured-consultation 이 정화). 너무 짧으면 실패로 돌린다.
        // 관례는 그 호출의 최소 분량 × 0.4 — 그룹 호출은 그룹 목표 기준으로 넘겨받는다.
        fallbackMinChars: Number(options.fallbackMinChars) || 2000,
      })
    : await callGeminiText(env, prompt, { ...ziweiCallOptions, maxOutputTokens: baseMaxOutputTokens });
  const provider = clean(ai?.provider || ai?.model || "gemini");
  const isMock = /mock/i.test(provider) || ai?.isMock === true;
  let text = clean(ai?.text);
  if (!ai?.ok || isMock || text.length < (options.minLength || 180)) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed."));
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_GENERATION_FAILED";
    throw error;
  }
  const minBodyChars = Number(options.minBodyChars || 0);
  const maxBodyChars = Number(options.maxBodyChars || 0);
  // 경량 보장 계약의 통과 하한. 기본 400자는 follow-up 처럼 짧은 응답을 위한 값이다.
  // 초기 상담은 ₩30,000 상품이라 이 하한을 그대로 두면 목표의 2%짜리 결과가 정상 결제로 배달된다 —
  // 호출부(generateInitialConsultation)가 목표 분량에 비례한 값을 명시적으로 넘긴다.
  const renderableMinChars = Number(options.renderableMinChars) || 400;
  // 분량 미달을 한 번 더 부르는 "range repair"는 없앴다. 이 함수는 초기 상담에서 그룹 단위로 불리는데,
  // 그룹 안에서 추가 호출을 하면 한 그룹이 timeout×attempts + repair 를 써 엣지 100초를 넘긴다.
  // 분량 보강은 상위(generateInitialConsultation)가 미달 그룹만 골라 다시 부르는 쪽으로 일원화했다.
  if (!FORBIDDEN_RESULT_PATTERN.test(text)) {
    const cleanText = cleanForbiddenResult(text);
    const finalBodyChars = countStructuredConsultationBodyChars(cleanText);
    const rangeProblem = bodyCharRangeProblem(finalBodyChars, minBodyChars, maxBodyChars);
    if (rangeProblem) {
      // 경량 보장 계약: 목표 분량 범위를 벗어나도 렌더 가능한 상담문이면 버리지 않고 degrade로 전달한다.
      if (hasRenderableLlmText(cleanText, { minChars: renderableMinChars })) {
        return { text: cleanText, provider, model: clean(ai?.model), degraded: true };
      }
      const error = new Error("Generated consultation body is outside required range.");
      error.code = rangeProblem === "short" ? "INSUFFICIENT_RESULT_LENGTH" : "EXCESSIVE_RESULT_LENGTH";
      throw error;
    }
    return { text: cleanText, provider, model: clean(ai?.model) };
  }

  const repair = await callGeminiText(env, [
    "다음 상담 답변에서 개발 또는 제작 과정처럼 들리는 표현을 모두 빼고, 자연스러운 자미두수 상담문으로만 다시 써 주세요.",
    minBodyChars && maxBodyChars ? `sections의 모든 body 합산은 ${Number(minBodyChars).toLocaleString("ko-KR")}자 이상 ${Number(maxBodyChars).toLocaleString("ko-KR")}자 이하로 유지해 주세요.` : "",
    "금지 표현: AI, PDF, 챕터, chapter, job, progress, 프롬프트, 시스템",
    "",
    text,
  ].filter(Boolean).join("\n"), {
    systemPrompt: await resolveSystemPrompt(env),
    taskType: "fortune",
    temperature: 0.58,
    maxOutputTokens: options.maxOutputTokens || INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS,
    // 45,000토큰 재작성은 90s에 잘린다 — 초기 생성과 동일한 상한을 쓴다.
    timeoutMs: ziweiTimeoutMs,
    cache: ziweiLlmCache,
  });
  const repaired = clean(repair?.text);
  const finalText = cleanForbiddenResult(repair?.ok && repaired.length >= 120 ? repaired : text);
  const finalBodyChars = countStructuredConsultationBodyChars(finalText);
  const finalRangeProblem = bodyCharRangeProblem(finalBodyChars, minBodyChars, maxBodyChars);
  if (finalRangeProblem) {
    // 경량 보장 계약: 수선 후에도 분량 범위를 벗어나나, 렌더 가능한 상담문이면 degrade로 전달한다.
    if (hasRenderableLlmText(finalText, { minChars: renderableMinChars })) {
      return {
        text: finalText,
        provider: clean(repair?.provider || provider),
        model: clean(repair?.model || ai?.model),
        degraded: true,
      };
    }
    const error = new Error("Generated consultation body is outside required range.");
    error.code = finalRangeProblem === "short" ? "INSUFFICIENT_RESULT_LENGTH" : "EXCESSIVE_RESULT_LENGTH";
    throw error;
  }
  return {
    text: finalText,
    provider: clean(repair?.provider || provider),
    model: clean(repair?.model || ai?.model),
  };
}

function parseSectionsFromGroupText(text) {
  const parsed = parseStructuredConsultationResult(text);
  return parsed?.sections && typeof parsed.sections === "object" ? parsed.sections : {};
}

function parseMetaFromText(text) {
  const jsonText = extractJsonObjectText(text);
  if (!jsonText) return null;
  try {
    const parsed = JSON.parse(jsonText);
    return parsed?.meta && typeof parsed.meta === "object" ? parsed.meta : null;
  } catch {
    return null;
  }
}

function countSectionChars(sections, keys) {
  return keys.reduce((sum, key) => sum + clean(sections?.[key]?.body).length, 0);
}

/**
 * 초기 상담 생성 — meta 1회 + 섹션 그룹 5회를 병렬로 부르고 하나의 구조화 JSON으로 병합한다.
 *
 * 왜 병렬인가: 이 라우트는 동기 생성이라 LLM 대기가 85초(clampSyncLlmTimeoutMs)로 잘리는데,
 * 목표 분량 20,000자를 단일 호출로 뽑으려면 그 3~4배의 시간이 든다. 시간 예산이 토큰 예산보다
 * 먼저 바닥나 매번 잘리거나 Workers AI 폴백으로 넘어갔고, degrade 경로가 그 짧은 결과를
 * ₩30,000 정상 결제로 배달했다. 그룹당 3,600~4,600자면 40초 안에 완주하므로 폴백을 타지 않는다.
 * 전체 벽시계는 가장 느린 그룹 기준이라 예산 안에 들어온다.
 */
async function generateInitialConsultation(env, { input, chart, logContext = {} }) {
  const startedAt = Date.now();
  const remainingMs = () => INITIAL_CONSULTATION_DEADLINE_MS - (Date.now() - startedAt);
  const retryTimeoutMs = () => Math.max(18000, Math.min(SECTION_GROUP_TIMEOUT_MS, remainingMs() - 6000));

  const runGroup = (group, { attempts = SECTION_GROUP_ATTEMPTS, timeoutMs = SECTION_GROUP_TIMEOUT_MS, extraPrompt = "" } = {}) => {
    const basePrompt = buildSectionGroupPrompt(input, chart, group);
    // 재생성은 프롬프트가 달라지므로 캐시 키도 달라진다 — 직전의 짧은 결과를 다시 집지 않는다.
    const prompt = extraPrompt ? `${basePrompt}\n\n${extraPrompt}` : basePrompt;
    const groupMinChars = Math.round(group.targetChars * 0.4);
    return generateConsultationText(env, prompt, {
      minLength: 200,
      maxOutputTokens: SECTION_GROUP_TARGET_TOKENS,
      responseMimeType: "application/json",
      attempts,
      timeoutMs,
      fallbackMinChars: groupMinChars,
      renderableMinChars: groupMinChars,
      cacheKeyExtra: group.id,
      logContext: { ...logContext, sectionGroup: group.id },
    });
  };

  const settled = await Promise.allSettled([
    generateConsultationText(env, buildMetaPrompt(input, chart), {
      minLength: 120,
      maxOutputTokens: 2600,
      responseMimeType: "application/json",
      attempts: SECTION_GROUP_ATTEMPTS,
      timeoutMs: SECTION_GROUP_TIMEOUT_MS,
      fallbackMinChars: 200,
      renderableMinChars: 120,
      cacheKeyExtra: "meta",
      logContext: { ...logContext, sectionGroup: "meta" },
    }),
    ...SECTION_GROUP_SPECS.map((group) => runGroup(group)),
  ]);

  const [metaSettled, ...groupSettled] = settled;
  const meta = metaSettled.status === "fulfilled" ? parseMetaFromText(metaSettled.value.text) : null;
  if (metaSettled.status !== "fulfilled") {
    // meta 대부분은 아래 enforceZiweiChartFacts 가 계산 확정값으로 덮어쓴다. 점수만 빠지므로 실패 처리하지 않는다.
    logZiweiAi("Meta Group Failed", { ...logContext, errorMessage: clean(metaSettled.reason?.message || metaSettled.reason, 300) }, "warn");
  }

  const sections = {};
  const providers = new Set();
  const models = new Set();
  const failedGroups = [];
  let degraded = metaSettled.status !== "fulfilled";

  groupSettled.forEach((result, index) => {
    const group = SECTION_GROUP_SPECS[index];
    if (result.status !== "fulfilled") {
      failedGroups.push(group);
      logZiweiAi("Section Group Failed", {
        ...logContext,
        sectionGroup: group.id,
        errorMessage: clean(result.reason?.message || result.reason, 300),
      }, "warn");
      return;
    }
    Object.assign(sections, parseSectionsFromGroupText(result.value.text));
    if (result.value.degraded) degraded = true;
    if (result.value.provider) providers.add(clean(result.value.provider));
    if (result.value.model) models.add(clean(result.value.model));
  });

  // 실패했거나 목표를 크게 밑돈 그룹만 다시 부른다. 전체 재생성이 아니라 그룹 단위라 예산 안에 들어온다.
  // 임계가 낮으면(구 0.6) 목표의 65%짜리 그룹이 그대로 통과해 합계가 MIN 아래로 내려앉는다.
  const shortGroups = SECTION_GROUP_SPECS.filter((group) => (
    !failedGroups.includes(group) && countSectionChars(sections, group.sections) < group.targetChars * SECTION_GROUP_RETRY_RATIO
  ));
  // 🔴 그룹별 비율만 보면 합계를 보장하지 못한다. 목표 합계(24,400)는 MIN(20,000) 대비 여유가 22%뿐이라,
  // 모든 그룹이 임계 바로 위(80%)를 써도 합계는 19,520자로 MIN 아래다. 합계가 모자라면 부족분이 있는
  // 그룹을 부족한 순서로 더 담는다. 재생성은 병렬이라 대상이 늘어도 벽시계는 그대로다.
  const mergedChars = () => SECTION_GROUP_SPECS.reduce((sum, group) => sum + countSectionChars(sections, group.sections), 0);
  if (mergedChars() < MIN_INITIAL_CONSULTATION_BODY_CHARS) {
    const extra = SECTION_GROUP_SPECS
      .filter((group) => !failedGroups.includes(group) && !shortGroups.includes(group))
      .map((group) => ({ group, deficit: group.targetChars - countSectionChars(sections, group.sections) }))
      .filter((item) => item.deficit > 0)
      .sort((a, b) => b.deficit - a.deficit)
      .map((item) => item.group);
    shortGroups.push(...extra);
  }
  const retryTargets = [...failedGroups, ...shortGroups];
  if (retryTargets.length && remainingMs() > SECTION_GROUP_RETRY_MIN_BUDGET_MS) {
    const retried = await Promise.allSettled(retryTargets.map((group) => {
      const currentChars = countSectionChars(sections, group.sections);
      const perSection = buildSectionCharTargets(group);
      return runGroup(group, {
        attempts: 1,
        timeoutMs: retryTimeoutMs(),
        // 얼마나 모자란지 숫자로 알려 준다. "더 촘촘하게" 같은 정성적 지시만으로는 분량이 안 는다.
        extraPrompt: [
          `직전 시도는 이 부분을 ${currentChars.toLocaleString("ko-KR")}자로 썼습니다. 목표 ${Number(group.targetChars).toLocaleString("ko-KR")}자에 크게 못 미칩니다.`,
          "처음부터 다시 쓰되, 아래 섹션별 최소 분량을 반드시 채우세요:",
          ...group.sections.map((key) => `  · ${key}: 최소 ${Number(perSection[key] || 0).toLocaleString("ko-KR")}자`),
          "같은 말을 바꿔 쓰지 말고, 아직 인용하지 않은 별·궁·강약 표기·사화 배치를 새로 끌어와 근거를 더하고 현실의 장면으로 풀어 늘리세요.",
        ].join("\n"),
      });
    }));
    retried.forEach((result, index) => {
      if (result.status !== "fulfilled") return;
      const group = retryTargets[index];
      const next = parseSectionsFromGroupText(result.value.text);
      // 재생성이 더 길 때만 교체한다 — 더 짧아진 결과로 기존 본문을 덮어쓰지 않는다.
      if (countSectionChars(next, group.sections) > countSectionChars(sections, group.sections)) {
        Object.assign(sections, next);
        if (result.value.provider) providers.add(clean(result.value.provider));
      }
    });
  } else if (retryTargets.length) {
    logZiweiAi("Section Group Retry Skipped", {
      ...logContext,
      remainingMs: remainingMs(),
      groups: retryTargets.map((group) => group.id),
    }, "warn");
    degraded = true;
  }

  let grounding = enforceZiweiChartFacts(JSON.stringify({ meta: meta || {}, sections }, null, 2), chart);
  if (grounding.issues.length && remainingMs() > SECTION_GROUP_RETRY_MIN_BUDGET_MS) {
    // 근거 미달(사화 별 미언급·12궁 커버리지·명궁 주성 미언급)은 본질·사화·12궁을 맡은 essence 그룹의 몫이다.
    // 예전처럼 상담 전체를 다시 만들지 않고 그 그룹만 다시 부른다.
    const essenceGroup = SECTION_GROUP_SPECS.find((group) => group.id === "essence");
    logZiweiAi("Grounding Retry", { ...logContext, issues: grounding.issues, sectionGroup: essenceGroup.id }, "warn");
    try {
      const regenerated = await runGroup(essenceGroup, {
        attempts: 1,
        timeoutMs: retryTimeoutMs(),
        extraPrompt: [
          "직전 답변이 아래 근거 기준을 지키지 못해 반려되었다. 전부 지켜 처음부터 다시 작성하라:",
          ...describeZiweiGroundingIssues(grounding.issues, chart),
        ].join("\n"),
      });
      const next = parseSectionsFromGroupText(regenerated.text);
      if (Object.keys(next).length) {
        Object.assign(sections, next);
        grounding = enforceZiweiChartFacts(JSON.stringify({ meta: meta || {}, sections }, null, 2), chart);
      }
    } catch (retryError) {
      logZiweiAi("Grounding Retry Failed", { ...logContext, errorMessage: clean(retryError?.message || retryError, 300) }, "warn");
    }
  }
  // meta 는 서버 확정값으로 덮어썼으므로, 본문 인용이 여전히 부족해도 실패 처리하지 않고 경고만 남긴다.
  if (grounding.issues.length) logZiweiAi("Grounding Residual", { ...logContext, issues: grounding.issues }, "warn");

  // 한자는 여기서 서버가 붙인다(worker/lib/ziwei-hanja.js). 모델이 남긴 빈 괄호도 함께 사라진다.
  const finalText = applyZiweiHanjaToStructuredText(cleanForbiddenResult(grounding.text));
  const finalBodyChars = countStructuredConsultationBodyChars(finalText);
  const rangeProblem = bodyCharRangeProblem(finalBodyChars, MIN_INITIAL_CONSULTATION_BODY_CHARS, MAX_INITIAL_CONSULTATION_BODY_CHARS);
  // 경량 보장 계약의 하한. 구 400자는 ₩30,000 상품에 비해 터무니없이 낮아, 목표의 2%짜리 결과도
  // 정상 결제로 배달됐다. 목표의 55% 아래면 실패로 돌려 기존 환불·접근권 복원 경로를 그대로 타게 한다.
  const minDeliverableChars = Math.round(MIN_INITIAL_CONSULTATION_BODY_CHARS * 0.55);

  logZiweiAi("Section Groups Merged", {
    ...logContext,
    bodyChars: finalBodyChars,
    elapsedMs: Date.now() - startedAt,
    failedGroups: failedGroups.map((group) => group.id),
    retriedGroups: retryTargets.map((group) => group.id),
  });

  if (finalBodyChars < minDeliverableChars) {
    const error = new Error(`Generated consultation body is too short (${finalBodyChars} chars, need ${minDeliverableChars}).`);
    error.code = "INSUFFICIENT_RESULT_LENGTH";
    throw error;
  }

  return {
    text: finalText,
    provider: Array.from(providers).filter(Boolean).join(",") || "gemini",
    model: Array.from(models).filter(Boolean).join(","),
    degraded: degraded || rangeProblem === "short",
  };
}

async function restorePrepaidAccessOnFailure({ userId, access = {}, idempotencyKey = "", pricing = getPricing(), error = null }) {
  if (!access?.prepaid) return false;
  const evidenceType = clean(access.evidenceType, 80);
  const evidenceId = clean(access.evidenceId || access.paymentId, 160);
  const failureMessage = clean(error?.message || error || "service execution failed", 500);
  const now = new Date();

  try {
    if (evidenceType === "coin" && mongoose.Types.ObjectId.isValid(evidenceId)) {
      const history = await PointHistory.findOne({
        _id: evidenceId,
        userId,
        kind: "deduct",
        featureKey: FEATURE_KEY,
        "metadata.refundedForServiceExecution": { $ne: true },
      }).lean();
      if (!history) return false;

      const refundCoins = Math.max(0, Math.floor(Math.abs(Number(history.delta || access.amount || pricing.coinPrice || 0))));
      if (!refundCoins) return false;

      const marked = await PointHistory.updateOne(
        { _id: history._id, userId, "metadata.refundedForServiceExecution": { $ne: true } },
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
        userId,
        {
          $inc: { points: refundCoins },
          ...(purchaseId ? { $pull: { recentConsumeRequestIds: purchaseId } } : {}),
        },
        { new: true, projection: { points: 1 } },
      ).lean();

      await PointHistory.create({
        userId,
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
        ? { _id: evidenceId }
        : { sourceId: access.purchaseId || idempotencyKey };
      const ledger = await MonthlyCreditLedger.findOne({
        ...ledgerQuery,
        userId,
        type: "MONTHLY_CREDIT_SPEND",
        serviceKey: { $in: [FEATURE_KEY, SERVICE_KEY] },
        "metadata.refundedForServiceExecution": { $ne: true },
      }).lean();
      if (!ledger) return false;

      const refundCredit = Math.max(0, Math.floor(Number(ledger.amount || access.amount || pricing.membershipCreditCost || 0)));
      if (!refundCredit) return false;

      const marked = await MonthlyCreditLedger.updateOne(
        { _id: ledger._id, userId, "metadata.refundedForServiceExecution": { $ne: true } },
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
      // 복원분은 신규 30일 lot으로 재적립(lotId=원장 id로 멱등). recentConsumeRequestIds도 정리.
      await restoreMonthlyCreditLot({
        userId,
        lotId: `ziwei-ai-refund:${String(ledger._id)}`,
        amount: refundCredit,
        pullRequestId: purchaseId || "",
      }).catch(() => {});

      const clauses = pointHistoryTokenClauses([purchaseId, evidenceId, idempotencyKey].filter(Boolean));
      if (clauses.length) {
        await PointHistory.updateMany(
          {
            userId,
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
    console.warn("[ziwei-ai] prepaid access restore failed", {
      userId: clean(userId, 80),
      evidenceType,
      evidenceId,
      message: clean(restoreError?.message || restoreError, 300),
    });
  }
  return false;
}

async function applyUsageOnce({ userId, sessionId, accessType, paymentId, pricing, prepaid = false }) {
  const existing = await ZiweiAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;
  if (prepaid) {
    await ZiweiAiConsultation.updateOne(
      { id: sessionId, usageAppliedAt: null },
      { $set: { usageAppliedAt: new Date() } },
    );
    return true;
  }

  if (accessType === "subscription") {
    const error = new Error("A Payment Service access grant is required for monthly usage.");
    error.code = "PAYMENT_ACCESS_GRANT_REQUIRED";
    throw error;
  }

  if (accessType === "paid" && paymentId) {
    await Payment.updateOne(
      { userId, featureKey: FEATURE_KEY, merchantUid: paymentId },
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

  await ZiweiAiConsultation.updateOne(
    { id: sessionId, usageAppliedAt: null },
    { $set: { usageAppliedAt: new Date() } },
  );
  return true;
}

function buildSummaryCards(chart = {}, topic = "") {
  const palaces = Array.isArray(chart.palaces) ? chart.palaces : [];
  const life = palaces.find((item) => item.name === chart.lifePalace) || palaces.find((item) => item.name === "명궁") || {};
  const keyStars = [...new Set([
    ...(life.mainStars || []),
    ...palaces.flatMap((item) => item.mainStars || []),
  ])].slice(0, 4);
  const keywords = [
    topic,
    life.mainStars?.[0] ? `${life.mainStars[0]}의 중심성` : "명궁의 방향",
    chart.fourTransformations?.huaJi ? `${chart.fourTransformations.huaJi} 화기 조율` : "삼방사정 균형",
  ].filter(Boolean).slice(0, 3);
  return {
    lifePalace: chart.lifePalace || "",
    bodyPalace: chart.bodyPalace || "",
    keyStars,
    keywords,
  };
}

function publicConsultation(doc) {
  const chart = doc.ziweiChart || {};
  return {
    ok: true,
    sessionId: clean(doc.id),
    consultation: {
      id: clean(doc.id),
      accessType: clean(doc.accessType),
      status: clean(doc.status),
      birthInfo: doc.birthInfo || {},
      topic: clean(doc.topic),
      userQuestion: clean(doc.userQuestion),
      summaryCards: buildSummaryCards(chart, doc.topic),
      // 명반은 예전부터 저장돼 있었으므로, 이 변경 이전에 생성된 상담도 근거 패널을 그대로 얻는다.
      analysisBasis: buildZiweiAnalysisBasis(chart, doc.birthInfo),
      ziweiChart: chart,
      messages: Array.isArray(doc.messages)
        ? doc.messages.map((message) => ({
          role: message.role,
          // 이 변경 이전에 저장된 상담에는 모델이 남긴 빈 괄호(`천이궁( ) 거문( )`)가 그대로 들어 있다.
          // 재열람 응답에서 지워야 과거 상담도 화면에서 깨끗해진다(생성 경로는 이미 정화된 텍스트를 저장한다).
          content: stripEmptyParens(message.content),
          createdAt: message.createdAt,
        }))
        : [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    },
  };
}

async function handleEnsureAccess(request, env, route = "/api/ziwei-ai/prepare") {
  logZiweiAi("Prepare Start", safeLogPayload({ route, env }));
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logZiweiAi("Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logZiweiAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, validation: "failed", env, error: new Error(normalized.message) }), "warn");
    return invalidInput(normalized.message);
  }
  logZiweiAi("Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  try {
    logZiweiAi("Chart Data Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
    calculateZiweiAiChart(normalized.input, { year: new Date().getFullYear() });
    logZiweiAi("Chart Data Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  } catch (error) {
    logZiweiAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "chart_data_failed", env, error }), "error");
    return calculationFailed();
  }

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  const pricing = getPricing();
  logZiweiAi("Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "checking", env }));
  if (isAdmin(auth)) {
    logZiweiAi("Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "admin", env }));
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
  const user = await withMongoRetry(env, () => loadBillingUser(auth.userId, env));
  if (!user) return loginRequired();

  const access = await withMongoRetry(env, () => resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash }));
  // 이용권(pass)·월정석(subscription)·결제(paid) 등 커버되는 접근은 네오 작전실과 동일하게
  // prepare에서 곧바로 접근 토큰을 발급한다. 이용권 보유자가 결제 게이트로 새어
  // "이용권 상태를 일시적으로 확인하지 못했습니다"로 막히던 문제를 차단한다.
  if (access.ok) {
    logZiweiAi("Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
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

  const payment = await createOrReusePaymentPayload({
    env,
    auth,
    user,
    pricing,
    idempotencyKey,
    inputHash: normalized.inputHash,
  });
  if (!payment.ok) {
    if (payment.serverError) return serverError(payment.message, 503);
    return invalidInput(payment.message, 409);
  }

  logZiweiAi("Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "payment_required", env }));
  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    message: MESSAGES.paymentRequired,
    paymentPayload: payment.paymentPayload,
  }, { status: 402 });
}

async function resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey }) {
  const token = clean(body?.accessToken || request.headers.get("x-ziwei-ai-access-token"));
  if (token) {
    const payload = await verifyAccessToken(env, token);
    if (clean(payload.userId) !== clean(auth.userId) || clean(payload.idempotencyKey) !== idempotencyKey || clean(payload.inputHash) !== normalized.inputHash) {
      return { ok: false, reason: "INVALID_INPUT", message: "상담 접근 정보가 현재 입력값과 일치하지 않습니다." };
    }
    const accessType = clean(payload.accessType);
    // prepare에서 발급한 이용권/월정석/결제/관리자 토큰을 모두 신뢰한다(네오와 동일).
    // 월정석(subscription)은 아래 handleStart의 applyUsageOnce에서 실제 차감된다.
    if (!["admin", "paid", "pass", "subscription"].includes(accessType)) return { ok: false, reason: "PAYMENT_REQUIRED" };
    return { ok: true, accessType, paymentId: clean(payload.paymentId, 160) };
  }

  const paymentId = clean(body?.paymentId || body?.merchantUid || body?.merchant_uid, 160);
  if (paymentId) {
    const directVerify = await verifyPaymentForStart({ env, auth, paymentId, idempotencyKey, inputHash: normalized.inputHash, pricing });
    if (directVerify.ok) return directVerify;
  }

  const user = await withMongoRetry(env, () => loadBillingUser(auth.userId, env));
  if (!user && !isAdmin(auth)) return { ok: false, reason: "LOGIN_REQUIRED" };
  const billingAccess = await withMongoRetry(env, () => resolveBillingGateAccess({ env, auth, user, body, pricing, idempotencyKey }));
  if (billingAccess?.ok) return billingAccess;
  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

async function handleStart(request, env, route = "/api/ziwei-ai/generate", ctx = null) {
  logZiweiAi("Generate Start", safeLogPayload({ route, env }));
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logZiweiAi("Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logZiweiAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, validation: "failed", env, error: new Error(normalized.message) }), "warn");
    return invalidInput(normalized.message);
  }
  logZiweiAi("Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  await connectDb(env);
  const pricing = getPricing();
  logZiweiAi("Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "checking", env }));
  const access = await resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey });
  if (!access.ok) {
    if (access.reason === "LOGIN_REQUIRED") return loginRequired();
    if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
    return paymentVerifyFailed();
  }
  logZiweiAi("Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
  logZiweiAi("Payment Guard Passed", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));

  const existing = await withMongoRetry(env, () => ZiweiAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean());
  if (existing && clean(existing.inputHash) !== normalized.inputHash) {
    return invalidInput("같은 요청 키로 다른 상담 정보를 사용할 수 없습니다.", 409);
  }
  if (existing?.status === "completed") return json(publicConsultation(existing));
  // 창이 짧으면 재-POST가 중복 생성을 기동하고, 길면 잘린 세션이 좀비로 남는다(GENERATING_FRESHNESS_MS 주석 참고).
  if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < GENERATING_FRESHNESS_MS) {
    return json({ ok: true, sessionId: existing.id, status: "generating", message: "별궁의 흐름을 읽고 있습니다" }, { status: 202 });
  }

  let chart;
  try {
    logZiweiAi("Chart Data Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
    chart = calculateZiweiAiChart(normalized.input, { year: new Date().getFullYear() });
    logZiweiAi("Chart Data Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
  } catch (error) {
    logZiweiAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "chart_data_failed", access: access.accessType, env, error }), "error");
    await restorePrepaidAccessOnFailure({ userId: auth.userId, access, idempotencyKey, pricing, error });
    return calculationFailed();
  }

  const sessionId = existing?.id || `zwai_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}_${randomToken(8)}`;
  const now = new Date();
  const seed = {
    id: sessionId,
    userId: clean(auth.userId),
    birthInfo: normalized.input.birthInfo,
    topic: normalized.input.topic,
    userQuestion: normalized.input.userQuestion,
    ziweiChart: chart,
    accessType: access.accessType,
    paymentId: clean(access.paymentId, 160),
    messages: [],
    idempotencyKey,
    inputHash: normalized.inputHash,
    status: "generating",
    generationError: null,
  };

  if (existing) {
    await ZiweiAiConsultation.updateOne(
      { id: existing.id },
      { $set: { ...seed, updatedAt: now } },
    );
  } else {
    try {
      await ZiweiAiConsultation.create(seed);
    } catch (error) {
      if (error?.code === 11000) {
        const duplicate = await ZiweiAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
        if (duplicate?.status === "completed") return json(publicConsultation(duplicate));
        return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: "별궁의 흐름을 읽고 있습니다" }, { status: 202 });
      }
      throw error;
    }
  }

  // 결제/이용권 확인이 끝난 이 시점에 즉시 202를 돌려주고, LLM 생성은 백그라운드(waitUntil)에서 완주한다.
  // 클라이언트(패널·페이지)는 /result 폴링으로 수렴하므로 연결이 끊겨도 유료 결과가 유실되지 않는다(neo와 동일 패턴).
  // 실패 시 환불(restorePrepaidAccessOnFailure)·generation_failed 기록은 아래 catch가 백그라운드에서도 그대로 수행한다.
  const runGeneration = async () => {
  try {
    const logContext = safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env });
    // 섹션 그룹 병렬 생성 — 근거 재시도(grounding)와 한자 병기, 최종 분량 판정까지 이 안에서 끝난다.
    // 예전의 단일 호출 옵션(minBodyChars: MIN_INITIAL_CONSULTATION_BODY_CHARS,
    // maxBodyChars: MAX_INITIAL_CONSULTATION_BODY_CHARS)은 병합 결과를 판정하는 기준으로 그대로 살아 있다.
    const generated = await generateInitialConsultation(env, { input: normalized.input, chart, logContext });
    await applyUsageOnce({ userId: auth.userId, sessionId, accessType: access.accessType, paymentId: access.paymentId || "", pricing, prepaid: access.prepaid === true });
    const firstUserMessage = normalized.input.userQuestion || normalized.input.topic;
    const completed = await ZiweiAiConsultation.findOneAndUpdate(
      { id: sessionId },
      {
        $set: {
          status: "completed",
          messages: [
            { role: "user", content: firstUserMessage, createdAt: now },
            { role: "assistant", content: generated.text, createdAt: new Date() },
          ],
          llmMeta: { provider: generated.provider, model: generated.model, completedAt: new Date().toISOString() },
          generationError: null,
        },
      },
      { new: true },
    ).lean();
    logZiweiAi("Generate Success", {
      ...logContext,
      providerReason: generated.provider || generated.model || "real_llm_success",
      provider: generated.provider,
      model: generated.model,
    });
    return completed;
  } catch (error) {
    logZiweiAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error }), "error");
    const restored = await restorePrepaidAccessOnFailure({ userId: auth.userId, access, idempotencyKey, pricing, error });
    logZiweiAi("Refund Or Restore", {
      ...safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }),
      restored,
      accessPrepaid: access.prepaid === true,
    }, restored ? "info" : "warn");
    await ZiweiAiConsultation.updateOne(
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
    throw error;
  }
  };

  // 동기 생성: 요청 안에서 완결해 완료 결과를 바로 반환한다. waitUntil 백그라운드+/result 폴링은 공유 DB 연결을
  // 여러 요청이 재사용하게 만들어 Cloudflare Workers 요청 간 I/O 격리로 결과가 고착되던 문제가 있어 쓰지 않는다(네오와 동일).
  try {
    return json(publicConsultation(await runGeneration()));
  } catch {
    return json({ ok: false, reason: "LLM_ERROR", message: MESSAGES.llmFailed }, { status: 503 });
  }
}

async function handleMessage(request, env) {
  const route = "/api/ziwei-ai/message";
  const body = await readJson(request);
  const sessionId = clean(body?.sessionId || body?.consultationId, 120);
  const message = clean(body?.message || body?.question, 1200);
  if (!sessionId) return invalidInput("상담 기록을 찾을 수 없습니다.", 404);
  if (message.length < 2) return invalidInput("추가 질문을 입력해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  await connectDb(env);
  const consultation = await ZiweiAiConsultation.findOne({
    id: sessionId,
    userId: clean(auth.userId),
    status: "completed",
  }).lean();
  if (!consultation) return invalidInput("상담 기록을 찾을 수 없습니다.", 404);

  try {
    const logContext = safeLogPayload({ route, requestId: sessionId, body, access: "follow_up", env });
    const generated = await generateConsultationText(env, buildFollowUpPrompt(consultation, message), {
      minLength: 100,
      maxOutputTokens: 5000,
      logContext,
    });
    const userMessage = { role: "user", content: message, createdAt: new Date() };
    const assistantMessage = { role: "assistant", content: generated.text, createdAt: new Date() };
    const updated = await ZiweiAiConsultation.findOneAndUpdate(
      { id: sessionId, userId: clean(auth.userId) },
      {
        $push: { messages: { $each: [userMessage, assistantMessage] } },
        $set: {
          llmMeta: { provider: generated.provider, model: generated.model, updatedAt: new Date().toISOString() },
        },
      },
      { new: true },
    ).lean();
    logZiweiAi("Generate Success", {
      ...logContext,
      providerReason: generated.provider || generated.model || "real_llm_success",
      provider: generated.provider,
      model: generated.model,
    });
    return json(publicConsultation(updated));
  } catch (error) {
    logZiweiAi("Error", safeLogPayload({ route, requestId: sessionId, body, access: "follow_up", env, error }), "error");
    return json({ ok: false, reason: "LLM_ERROR", message: MESSAGES.llmFailed }, { status: 503 });
  }
}

async function handleResult(request, env) {
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
  const url = new URL(request.url);
  const sessionId = clean(url.searchParams.get("id") || url.searchParams.get("sessionId"), 120);

  await connectDb(env);
  if (!sessionId) {
    const rows = await ZiweiAiConsultation.find({ userId: clean(auth.userId), status: "completed" })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select("id topic birthInfo ziweiChart.lifePalace ziweiChart.chartSummary createdAt updatedAt")
      .lean();
    return json({
      ok: true,
      consultations: rows.map((row) => ({
        id: clean(row.id),
        topic: clean(row.topic),
        name: clean(row.birthInfo?.name, 80),
        lifePalace: clean(row.ziweiChart?.lifePalace, 20),
        chartSummary: clean(row.ziweiChart?.chartSummary, 200),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    });
  }

  const consultation = await ZiweiAiConsultation.findOne({
    id: sessionId,
    userId: clean(auth.userId),
  }).lean();
  if (!consultation) return notFound();
  // 생성 중이면 202로 알려 클라이언트 폴링이 수렴하게 한다(start의 202 바디와 동일 형태).
  if (consultation.status === "generating") {
    // 단, 신선도 창을 넘긴 `generating`은 생성 주체가 이미 사라진 좀비다(엣지 컷·워커 크래시).
    // 계속 202를 돌려주면 클라이언트가 최대 65회를 헛돌다 타임아웃 문구로 끝난다 — 그 자리에서 종단시킨다.
    const generatingAgeMs = Date.now() - new Date(consultation.updatedAt || consultation.createdAt).getTime();
    if (generatingAgeMs >= GENERATING_FRESHNESS_MS) {
      logZiweiAi("Stale Generating Terminated", { route: "/api/ziwei-ai/result", sessionId: consultation.id, generatingAgeMs }, "warn");
      return json({ ok: false, reason: "GENERATION_FAILED", message: MESSAGES.llmFailed }, { status: 409 });
    }
    return json(
      { ok: true, sessionId: consultation.id, status: "generating", message: "별궁의 흐름을 읽고 있습니다" },
      { status: 202, headers: { "Retry-After": "3" } },
    );
  }
  if (consultation.status !== "completed") {
    return json({ ok: false, reason: "GENERATION_FAILED", message: MESSAGES.llmFailed }, { status: 409 });
  }
  return json(publicConsultation(consultation));
}

// 계산 근거만 즉시 돌려준다 — LLM 미호출, DB 접근 없음, 과금 없음.
// 생성이 도는 동안 대기 화면이 실제 명반 값을 보여 주기 위한 경로라 반드시 가벼워야 한다.
// 신원 확인은 로컬 JWT 검증(peekAccessTokenUserId)만 써서 Mongo를 한 번도 건드리지 않는다.
async function handleBasis(request, env) {
  const userId = await peekAccessTokenUserId(request, env);
  if (!userId) return loginRequired();

  const normalized = normalizeConsultationInput(await readJson(request));
  if (!normalized.ok) return invalidInput(normalized.message);

  try {
    const chart = calculateZiweiAiChart(normalized.input, { year: new Date().getFullYear() });
    return json(buildZiweiAnalysisBasis(chart, normalized.input.birthInfo));
  } catch (error) {
    console.warn("[ziwei-ai] basis failed", clean(error?.message || error, 200));
    return calculationFailed();
  }
}

export async function handleZiweiAiRoutes(request, env = {}, ctx = null) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/ziwei-ai");

  try {
    if (method === "GET" && path === "/result") return await handleResult(request, env);
    if (method === "POST" && path === "/basis") return await handleBasis(request, env);
    if (method === "POST" && (path === "/prepare" || path === "/ensure-access")) {
      return await handleEnsureAccess(request, env, path === "/prepare" ? "/api/ziwei-ai/prepare" : "/api/ziwei-ai/ensure-access");
    }
    if (method === "POST" && (path === "/generate" || path === "/start")) {
      return await handleStart(request, env, path === "/generate" ? "/api/ziwei-ai/generate" : "/api/ziwei-ai/start", ctx);
    }
    if (method === "POST" && path === "/message") return await handleMessage(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[ziwei-ai]", clean(error?.code || error?.message || error, 500));
    // 풀 초기화 버스트/인증 조회 중 일시 DB 장애는 재시도 신호와 함께 503으로 — 하드 500 방지.
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

export const __ziweiAiTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  normalizeConsultationInput,
  buildFirstPrompt,
  buildSystemPrompt,
  buildCanonicalZiweiFacts,
  buildZiweiAnalysisBasis,
  resolveSihuaPlacements,
  enforceZiweiChartFacts,
  describeZiweiGroundingIssues,
  cleanForbiddenResult,
  countStructuredConsultationBodyChars,
  MIN_INITIAL_CONSULTATION_BODY_CHARS,
  MAX_INITIAL_CONSULTATION_BODY_CHARS,
  // 섹션 그룹 병렬 생성
  SECTION_GROUP_SPECS,
  SECTION_GROUP_TIMEOUT_MS,
  SECTION_GROUP_RETRY_RATIO,
  INITIAL_CONSULTATION_DEADLINE_MS,
  GENERATING_FRESHNESS_MS,
  buildSectionCharTargets,
  buildSectionGroupPrompt,
  buildMetaPrompt,
  parseSectionsFromGroupText,
  countSectionChars,
};
