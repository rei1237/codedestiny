import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { resolveForbiddenPatterns } from "../lib/llm-leak-guard.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { EDGE_RESPONSE_DEADLINE_MS, clampSyncLlmTimeoutMs } from "../lib/sync-llm-timeout.js";
import { connectDb, isTransientMongoError, mongoose, withMongoRetry } from "../lib/db.js";
import { NewYearAiConsultation, PaidExecutionRecord, Payment, PointHistory, User } from "../lib/models.js";
import { findMoonstoneSpendEvidence } from "../lib/moonstone-spend-proof.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { resolveFeatureAccessPolicy } from "../lib/entitlement-policy.js";
import { callGeminiText } from "../lib/gemini.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { handleBillingRoutes, BILLING_SNAPSHOT_USER_PROJECTION } from "./billing.js";
import { Solar } from "lunar-javascript";

// 🔴 년주·월주는 **절기 프레임**이고 그 경계는 코어의 KST 절기표에서만 나온다.
// 예전에는 월주를 lunar-javascript `getMonthInGanZhi()` 로 잡았는데, 그 라이브러리의 절기 시각은
// 중국 표준시(CST) 벽시계라 KST 로는 월건 경계가 정확히 60분 일렀다(실측 2026-08-27:
// 節 경계 −30분·−1분 표본 각 72/72 전건 불일치, −61/+1/+30/+61분 0/72).
// 🔴 년주도 `getYearInGanZhi()` — **음력 프레임(설날 경계)** 이었다. 그 아래 격국·용신·십신은
// 사주 계산이라 년주는 **입춘 경계**여야 한다(실측: 정오 표본 6,804건 중 129건 1.90% 가 갈렸다).
// 🔴 일주·시주는 여기서 바꾸지 않는다 — 코어의 야자시 기본값(shift-day)과 lunar-javascript 가
// 23시대에서 정면으로 갈린다(실측 540/540). 그 축을 정하는 것은 PR-F 의 몫이다.
import {
  BRANCH_HANJA,
  STEM_HANJA,
  ganji,
  lunarToSolar,
  sexagenaryYearIndexes,
} from "../../lib/korean-calendar/index.js";

const SERVICE_KEY = "new-year-ai";
const FEATURE_KEY = "new-year-ai-consultation";
const ACCESS_TOKEN_TYPE = "new-year-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "신년운세 전문가 상담";
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "전문가 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const NEW_YEAR_AI_MIN_TOTAL_CHARS = 15000;
const NEW_YEAR_AI_MAX_TOTAL_CHARS = 24000;
// 총 10,000~20,000자(한국어 1자≈1~1.5토큰)를 한 번의 동기 호출로 뽑으면
// gemini-2.5-flash(~200tok/s) 기준 75~112s가 필요한데, Cloudflare 엣지는 100s에 요청을 끊는다.
// 그 조합에서 라우트는 실패 판정을 내리기도 전에 잘려 generation_failed 기록도, 이용권 복원도
// 실행되지 못했다(사용자는 결제 후 503 또는 정체불명의 오류를 봤다).
// 그래서 아웃라인을 상담 분야별 5섹션으로 쪼개 한 요청 안에서 동시에 던진다.
// 벽시계가 "섹션 시간의 합"이 아니라 "가장 느린 섹션 하나"가 되어 엣지 한계 안쪽에서 완결된다.
// 4 동시성이 이 워커에서 안전하다는 것은 master-love-codex의 CHAPTER_CONCURRENCY=4가 이미 증명했다.
//
// 분할 축은 "총론/카테고리/월별/마무리"(작성 순서)가 아니라 **상담 분야**다 — 사용자가 결과 화면에서
// 총운·재물직업·애정대인·건강개운 네 장의 카드로 소비하기 때문에, 그 경계와 생성 단위를 일치시켜야
// 섹션 하나가 실패해도 "그 분야만" 비고 나머지 분야는 온전하게 배달된다.
// heading은 각 섹션 본문이 반드시 시작해야 하는 굵은 소제목 마커다. 구조화 응답(llmMeta.sections)이
// 없는 구버전 세션을 클라이언트가 다시 분야별로 가를 때 이 마커가 유일한 앵커가 된다.
// categories는 validateFortuneDataConsistency의 6개 카테고리 소제목 중 이 섹션이 책임지는 것들이다.
const NEW_YEAR_AI_SECTIONS = Object.freeze([
  {
    key: "overview",
    label: "올해의 총운",
    heading: "올해의 총운",
    categories: ["study"],
    minChars: 3200,
    maxChars: 4800,
    covered: "재물·직업 상세, 애정·대인관계 상세, 1~12월 월별 흐름, 건강과 개운법, 마무리 한 줄",
  },
  {
    key: "wealth",
    label: "재물과 직업",
    heading: "재물과 직업",
    categories: ["money", "career"],
    minChars: 3000,
    maxChars: 4600,
    covered: "타고난 성향 총론, 격국·용신·조후 해설, 대운-세운 해석, 애정·대인관계, 1~12월 월별 흐름, 건강과 개운법",
  },
  {
    key: "romance",
    label: "애정과 대인관계",
    heading: "애정과 대인관계",
    categories: ["love", "relationship"],
    minChars: 3000,
    maxChars: 4600,
    covered: "타고난 성향 총론, 격국·용신·조후 해설, 대운-세운 해석, 재물·직업, 1~12월 월별 흐름, 건강과 개운법",
  },
  {
    key: "monthly",
    label: "1월~12월 월별 흐름",
    heading: "",
    categories: [],
    minChars: 3400,
    maxChars: 5000,
    covered: "총론과 명식 근거, 재물·직업 상세, 애정·대인관계 상세, 건강과 개운법, 마무리 한 줄",
  },
  {
    key: "health",
    label: "건강과 개운법",
    heading: "건강과 개운법",
    categories: ["health"],
    minChars: 2600,
    maxChars: 4200,
    covered: "총론과 명식 근거, 재물·직업 상세, 애정·대인관계 상세, 1~12월 월별 흐름",
  },
]);
// 섹션 min 합 15,200자 / max 합 23,200자 → 요구 밴드(15,000~24,000자) 안쪽.
// 정상 경로에서 MIN_TOTAL_CHARS·MAX_TOTAL_CHARS 어느 쪽도 걸리지 않아 압축 패스가 불필요하다.
// 상한 5,000자 × 1.5tok/자 + 완충 = llm-budget의 tokensRequiredForChars(5000)=9,750 이상.
//
// 🔴 분량을 더 늘려야 하면 섹션 목표를 키우지 말고 **섹션을 늘려라.** 다만 그 한계는 "호출당 목표"이지
//    "섹션당 목표"가 아니다 — 한 호출에 1~2만자를 요구하면 모델이 6천자에서 멈추지만(astrology-ai.js
//    의 실패 기록), 3,000~5,000자는 astrology(4,600)·sukuyo(6,000)·love-secret(6,500)이 이미 쓰고 있는
//    검증된 구간이다. 위 값은 그 구간 안에서 올린 것이고, 5,000자를 넘기지 말 것.
const NEW_YEAR_AI_SECTION_MAX_OUTPUT_TOKENS = 10500;
// 섹션 1개의 LLM 대기 상한. 4개가 동시에 도니 이 값이 곧 1웨이브의 벽시계 상한이다.
const NEW_YEAR_AI_SECTION_TIMEOUT_MS = 52000;
// 요청 시작 시점 기준 LLM 총 예산. 남는 18초는 인증·결제·DB 기록·응답 직렬화 몫이다(엣지 100s).
const NEW_YEAR_AI_LLM_BUDGET_MS = 82000;
// 결손 섹션 재생성/압축을 시작하려면 최소 이만큼 남아 있어야 한다. 모자라면 있는 것으로 조립해 전달한다.
const NEW_YEAR_AI_REPAIR_MIN_REMAINING_MS = 18000;
// 섹션 응답이 이 길이 미만이면 실패로 본다(전체 기준 minLength 1000은 섹션 단위에 맞지 않는다).
const NEW_YEAR_AI_SECTION_MIN_LENGTH = 300;
// 4섹션 중 이 개수 이상 살아 있으면 degraded로 전달·과금한다. 그 미만이면 실패로 돌려
// 기존 503 + 이용권/결제 복원 경로를 그대로 탄다(결제 후 무결과도, 반쪽에 과금도 막는 절충).
const NEW_YEAR_AI_MIN_USABLE_SECTIONS = 2;
// generating 문서를 "아직 진행 중"으로 인정할 창.
// 생성은 요청 안에서 끝나므로 엣지 컷(100s)보다 오래된 generating은 진행 중이 아니라 잘린 좀비다.
// 구 480s는 실제로 아무도 생성하지 않는 8분 동안 /start가 202만 돌려주게 만들어,
// 클라 폴링 40회(≈5분)가 통째로 헛돌고 재시도조차 막혔다.
const NEW_YEAR_AI_GENERATING_FRESH_MS = EDGE_RESPONSE_DEADLINE_MS + 20000;
const NEW_YEAR_AI_REQUIRED_TOPIC_PATTERNS = Object.freeze({
  structure: /격국|월령|일간|원국|명식/,
  usefulGod: /용신|기신|희신/,
  climate: /조후|한난조습|계절|온도/,
  luckCycle: /대운|세운/,
  interaction: /천간|지지|합|충|형|파|해|십신/,
  monthly: /월별|월운|1월|2월|3월|4월|5월|6월|7월|8월|9월|10월|11월|12월/,
  practice: /선택|실천|조언|정돈|회복|관리/,
});
// 월별 흐름과 별개로 요구하는 6개 카테고리 소제목 — 라벨 중 하나라도 있으면 해당 카테고리는 다룬 것으로 인정한다.
const NEW_YEAR_AI_REQUIRED_CATEGORY_LABELS = Object.freeze({
  love: ["연애", "재회"],
  money: ["재물", "수입"],
  career: ["직업", "이직"],
  health: ["건강", "멘탈"],
  relationship: ["가족", "관계"],
  study: ["학업", "성장"],
});

// 상담 본문에 새어 나오면 안 되는 것은 (1) 내부 작업 용어와 (2) AI 자기지칭 두 종류뿐이다.
// 구 패턴의 `시스템`·`기능`·단독 `\bAI\b`는 "면역 시스템"·"소화 기능"·"신장 기능" 같은
// 건강·멘탈 문단의 정상 한국어를 오탐했다. 그 오탐은 두 가지 실제 피해를 냈다:
//   ① 불필요한 전체 재생성(금지어 repair)이 한 요청 안에서 또 한 번의 장문 호출을 유발
//   ② cleanForbiddenResult가 배달 본문을 "면역 상담 흐름"·"소화 상담"으로 훼손 —
//      validateConsultationQuality가 cleaned를 돌려주고 그게 그대로 사용자에게 나간다.
const FORBIDDEN_RESULT_PATTERN = /\bPDF\b|챕터|\bprogress\b|\bjob\b|프롬프트|시스템\s*(?:메시지|지시)|(?:AI|인공지능)\s*(?:가|이|는|은|를|을|로|로서|에\s*의해)?\s*(?:생성|작성|제작|답변|응답|만들)|(?:저는|제가|나는)\s*(?:AI|인공지능|언어\s*모델)/i;

// 🔴 위 패턴은 **ko 전용**이다. `\bjob\b`·`\bprogress\b`·`\bAI\b`·`chapter` 는 영어·독일어
//    상담문에서 자연스러운 단어라, 비-ko 응답에 그대로 돌리면 모델이 정상적으로 답해도 반려된다
//    (실측 2026-08-20: "Your job situation improves and progress comes steadily" → 반려).
//    llm-leak-guard 가 정확히 이 상황을 위해 있다 — ko 면 넘긴 패턴을 그대로 돌려주므로
//    **한국어 판정은 한 글자도 바뀌지 않고**, 비-ko 면 보편 패턴 + 로케일 패턴으로 갈아탄다.
function hasForbiddenResult(value) {
  const body = String(value ?? "");
  return resolveForbiddenPatterns(FORBIDDEN_RESULT_PATTERN).some((pattern) => pattern.test(body));
}
const FOCUS_AREA_LABELS = Object.freeze({
  overall: "전체운",
  love: "연애운",
  money: "재물운",
  career: "일과 직업운",
  health: "건강운",
  relationship: "인간관계",
  study: "학업운",
  custom: "직접 질문",
});
const GEMINI_ENV_KEYS = [
  "GEMINIF_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
];
const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
// lunar-javascript는 간지를 한자로 반환하므로, 한글 키 오행/십신 테이블과 맞추기 위해 정규화한다.
const HANJA_TO_KO_GANZI = {
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};

function toKoreanGanzi(value) {
  return String(value || "").split("").map((char) => HANJA_TO_KO_GANZI[char] || char).join("");
}
const ELEMENTS = ["목", "화", "토", "금", "수"];
const STEM_ELEMENT = {
  갑: "목", 을: "목",
  병: "화", 정: "화",
  무: "토", 기: "토",
  경: "금", 신: "금",
  임: "수", 계: "수",
};
const STEM_POLARITY = {
  갑: "yang", 병: "yang", 무: "yang", 경: "yang", 임: "yang",
  을: "yin", 정: "yin", 기: "yin", 신: "yin", 계: "yin",
};
const BRANCH_ELEMENT = {
  자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화",
  오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수",
};
const HIDDEN_STEMS = {
  자: ["계"],
  축: ["기", "계", "신"],
  인: ["갑", "병", "무"],
  묘: ["을"],
  진: ["무", "을", "계"],
  사: ["병", "무", "경"],
  오: ["정", "기"],
  미: ["기", "정", "을"],
  신: ["경", "임", "무"],
  유: ["신"],
  술: ["무", "신", "정"],
  해: ["임", "갑"],
};
const PRODUCES = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const CONTROLS = { 목: "토", 화: "금", 토: "수", 금: "목", 수: "화" };
const BRANCH_CLASH = { 자: "오", 축: "미", 인: "신", 묘: "유", 진: "술", 사: "해", 오: "자", 미: "축", 신: "인", 유: "묘", 술: "진", 해: "사" };
const BRANCH_COMBINATION = { 자: "축", 축: "자", 인: "해", 해: "인", 묘: "술", 술: "묘", 진: "유", 유: "진", 사: "신", 신: "사", 오: "미", 미: "오" };
const STEM_COMBINATION = { 갑: "기", 기: "갑", 을: "경", 경: "을", 병: "신", 신: "병", 정: "임", 임: "정", 무: "계", 계: "무" };
const STEM_CLASH = { 갑: "경", 경: "갑", 을: "신", 신: "을", 병: "임", 임: "병", 정: "계", 계: "정" };
const BRANCH_SEASON = {
  인: "봄의 시작", 묘: "봄의 절정", 진: "봄에서 여름으로 넘어가는 토기",
  사: "여름의 시작", 오: "여름의 절정", 미: "여름에서 가을로 넘어가는 토기",
  신: "가을의 시작", 유: "가을의 절정", 술: "가을에서 겨울로 넘어가는 토기",
  해: "겨울의 시작", 자: "겨울의 절정", 축: "겨울에서 봄으로 넘어가는 토기",
};
const TEN_GOD_DOMAIN = {
  비견: "자기주도와 경쟁",
  겁재: "공동 자원과 지출 관리",
  식신: "실력 발휘와 안정적인 생산성",
  상관: "표현력과 규칙 조정",
  편재: "기회형 재물과 외부 활동",
  정재: "고정 수입과 현실적 관리",
  편관: "압박 속 승부와 책임",
  정관: "평판, 조직, 약속",
  편인: "새 공부와 관점 전환",
  정인: "보호, 문서, 회복",
};
const MONTHLY_DOMAIN_KEYS = ["overall", "money", "love", "career", "health"];
const MONTHLY_DOMAIN_LABELS = { overall: "총운", money: "재물", love: "애정", career: "직업", health: "건강" };

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
  const question = clean(input.question ?? body.question ?? body.topic ?? body.consultationTopic, 1000);
  const diagnostics = getProviderDiagnostics(env);
  return {
    route,
    requestId: clean(requestId || body.requestId || body.idempotencyKey, 180),
    serviceType: clean(input.serviceType || body.serviceType || body.featureKey || FEATURE_KEY, 80),
    targetYear: Number(input.targetYear || input.year || body.targetYear || body.year || 0) || null,
    focusArea: clean(input.focusArea || body.focusArea || "overall", 40),
    validation,
    access,
    birthDate: maskBirthDate(input.birthInfo?.birthDate || birthInfo.birthDate || body.birthDate),
    questionLength: question.length,
    ...diagnostics,
    ...(error ? {
      errorMessage: clean(error?.message || error, 500),
      ...(isDevelopmentEnv(env) ? { stack: clean(error?.stack, 2000) } : {}),
    } : {}),
  };
}

function logNewYearAi(marker, details = {}, level = "info") {
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
  console[method](`[NewYear AI LLM ${marker}]`, details);
}

function parseDateParts(value) {
  const raw = clean(value, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  // 한국 음양력 코어가 답하는 구간. 밖이면 조용히 중국 달력으로 떨어지지 않고 입력을 거절한다.
  if (year < 1900 || year > 2100) return null;
  return { year, month, day };
}

function parseBirthTime(value) {
  const raw = clean(value, 5);
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return { hour: 12, minute: 0, timeUnknown: true };
  return { hour: Number(match[1]), minute: Number(match[2]), timeUnknown: false };
}

function pillarStem(pillar = "") {
  return clean(pillar).slice(0, 1);
}

function pillarBranch(pillar = "") {
  return clean(pillar).slice(1, 2);
}

function emptyElementCounts() {
  return ELEMENTS.reduce((acc, element) => ({ ...acc, [element]: 0 }), {});
}

function addElement(counts, element, weight = 1) {
  if (!element || !Object.prototype.hasOwnProperty.call(counts, element)) return;
  counts[element] = Number((Number(counts[element] || 0) + weight).toFixed(2));
}

function tenGodFor(dayStem, targetStem) {
  const dayElement = STEM_ELEMENT[dayStem];
  const targetElement = STEM_ELEMENT[targetStem];
  const samePolarity = STEM_POLARITY[dayStem] === STEM_POLARITY[targetStem];
  if (!dayElement || !targetElement) return "";
  if (targetElement === dayElement) return samePolarity ? "비견" : "겁재";
  if (PRODUCES[dayElement] === targetElement) return samePolarity ? "식신" : "상관";
  if (CONTROLS[dayElement] === targetElement) return samePolarity ? "편재" : "정재";
  if (CONTROLS[targetElement] === dayElement) return samePolarity ? "편관" : "정관";
  if (PRODUCES[targetElement] === dayElement) return samePolarity ? "편인" : "정인";
  return "";
}

function buildElementDistribution(pillars) {
  const counts = emptyElementCounts();
  for (const pillar of pillars.filter(Boolean)) {
    addElement(counts, STEM_ELEMENT[pillarStem(pillar)], 1);
    addElement(counts, BRANCH_ELEMENT[pillarBranch(pillar)], 1);
  }
  return counts;
}

function buildTenGodDistribution(dayStem, pillars) {
  const counts = {};
  for (const pillar of pillars.filter(Boolean)) {
    const stem = pillarStem(pillar);
    const branch = pillarBranch(pillar);
    const main = tenGodFor(dayStem, stem);
    if (main) counts[main] = Number((Number(counts[main] || 0) + 1).toFixed(2));
    for (const hidden of HIDDEN_STEMS[branch] || []) {
      const hiddenGod = tenGodFor(dayStem, hidden);
      if (hiddenGod) counts[hiddenGod] = Number((Number(counts[hiddenGod] || 0) + 0.35).toFixed(2));
    }
  }
  return counts;
}

function pickElement(fiveElements, direction = "dominant") {
  const entries = Object.entries(fiveElements || {}).sort((a, b) => (
    direction === "weak" ? Number(a[1]) - Number(b[1]) : Number(b[1]) - Number(a[1])
  ));
  return entries[0]?.[0] || "";
}

function judgeStrength(dayStem, fiveElements) {
  const dayElement = STEM_ELEMENT[dayStem] || "";
  const total = Object.values(fiveElements || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const own = Number(fiveElements?.[dayElement] || 0);
  const ratio = total > 0 ? own / total : 0;
  if (ratio >= 0.34) return "일간의 기운이 강한 편";
  if (ratio <= 0.18) return "일간의 기운이 약한 편";
  return "일간의 기운이 비교적 균형적인 편";
}

function describeBranchRelation(sourceBranch, targetBranch) {
  if (!sourceBranch || !targetBranch) return "";
  if (BRANCH_CLASH[sourceBranch] === targetBranch) return `${sourceBranch}-${targetBranch} 충으로 변화와 조정 압력이 생기기 쉬움`;
  if (BRANCH_COMBINATION[sourceBranch] === targetBranch) return `${sourceBranch}-${targetBranch} 합으로 관계와 협력의 실마리가 열리기 쉬움`;
  if (sourceBranch === targetBranch) return `${targetBranch} 기운이 반복되어 같은 패턴이 강해지기 쉬움`;
  // "충"·"합" 글자를 포함하면 timing/트리거 판정 정규식에 오탐되므로 중립 표현을 유지할 것
  return "큰 마찰보다는 기존 구조 위에 새 기운이 더해지는 흐름";
}

function describeStemRelation(sourceStem, targetStem) {
  if (!sourceStem || !targetStem) return "";
  if (STEM_CLASH[sourceStem] === targetStem) return `${sourceStem}-${targetStem} 천간충으로 표면 사건과 판단이 흔들리기 쉬움`;
  if (STEM_COMBINATION[sourceStem] === targetStem) return `${sourceStem}-${targetStem} 천간합으로 관계, 계약, 선택의 묶임이 생기기 쉬움`;
  if (sourceStem === targetStem) return `${targetStem} 천간이 반복되어 같은 의지와 경쟁심이 강해지기 쉬움`;
  return "천간은 직접 부딪히기보다 새 역할이 더해지는 흐름";
}

function rankedElements(fiveElements) {
  return Object.entries(fiveElements || {})
    .map(([element, power]) => ({ element, power: Number(power || 0) }))
    .sort((a, b) => b.power - a.power);
}

function buildGyeokgukSummary(dayMaster, monthPillar) {
  const monthStem = pillarStem(monthPillar);
  const monthBranch = pillarBranch(monthPillar);
  const monthTenGod = tenGodFor(dayMaster, monthStem) || "월간 십성 미산출";
  const hiddenTenGods = (HIDDEN_STEMS[monthBranch] || []).map((stem) => ({
    stem,
    tenGod: tenGodFor(dayMaster, stem),
  })).filter((row) => row.tenGod);
  const mainHidden = hiddenTenGods[0]?.tenGod || monthTenGod;
  return {
    monthCommand: `${monthBranch}월령`,
    season: BRANCH_SEASON[monthBranch] || "계절 기운 미산출",
    visibleTenGod: monthTenGod,
    hiddenStemTenGods: hiddenTenGods,
    finalGyeokguk: `${mainHidden} 중심으로 현실 작용을 읽는 구조`,
    reading: `월령의 ${mainHidden} 기운을 중심으로 격국을 잡고, 드러난 ${monthTenGod}이 실제 선택 방식으로 올라오는지 함께 봅니다.`,
  };
}

function buildYongshinSummary(dayMaster, fiveElements) {
  const ranking = rankedElements(fiveElements);
  const dominant = ranking[0]?.element || "";
  const weak = [...ranking].reverse()[0]?.element || "";
  const dayElement = STEM_ELEMENT[dayMaster] || "";
  const strength = judgeStrength(dayMaster, fiveElements);
  return {
    dayElement,
    strength,
    elementRanking: ranking,
    coreYongshinKo: weak || "보완 오행 미산출",
    heesinKo: PRODUCES[weak] || dayElement || "",
    gisinKo: dominant || "과한 오행 미산출",
    reading: `${strength}이므로 ${weak || "부족한 기운"}을 보완하고 ${dominant || "강한 기운"}이 과해지는 선택을 조절하는 방향을 우선합니다.`,
  };
}

function buildJohuSummary(monthBranch, fiveElements) {
  const season = BRANCH_SEASON[monthBranch] || "";
  const urgentElement = ["사", "오", "미"].includes(monthBranch)
    ? "수"
    : ["해", "자", "축"].includes(monthBranch)
      ? "화"
      : ["신", "유", "술"].includes(monthBranch)
        ? "목"
        : ["인", "묘", "진"].includes(monthBranch)
          ? "금"
          : pickElement(fiveElements, "weak");
  return {
    season,
    urgentElementKo: urgentElement,
    climate: `${season || "월령"}의 온도와 습도를 기준으로 ${urgentElement || "부족한 기운"} 조절을 먼저 봅니다.`,
    reading: `${urgentElement || "균형 기운"}이 살아나면 판단과 컨디션이 안정되고, 과열되거나 얼어붙은 흐름이 완만해집니다.`,
  };
}

function buildAnnualInteractions(pillarMap, targetStem, targetBranch) {
  const labels = { year: "년주", month: "월주", day: "일주", hour: "시주" };
  return Object.entries(pillarMap)
    .filter(([, pillar]) => pillar)
    .map(([key, pillar]) => ({
      pillar: labels[key] || key,
      ganji: pillar,
      heavenlyStem: describeStemRelation(pillarStem(pillar), targetStem),
      earthlyBranch: describeBranchRelation(pillarBranch(pillar), targetBranch),
    }));
}

function buildDaewoonSewoonSummary({ birthYear, gender, yearStem, targetYear, targetPillar, targetTenGod, annualInteractions }) {
  const age = Number(targetYear) - Number(birthYear) + 1;
  const forward = (gender === "male" && STEM_POLARITY[yearStem] === "yang") || (gender === "female" && STEM_POLARITY[yearStem] === "yin");
  const strongestAnnual = annualInteractions.find((item) => /충|합|반복/.test(`${item.heavenlyStem} ${item.earthlyBranch}`));
  return {
    targetAgeKoreanStyle: Number.isFinite(age) ? age : null,
    daewoonDirection: gender === "unknown" ? "성별 비공개로 순역 판단은 보수적으로 해석" : forward ? "순행 흐름" : "역행 흐름",
    annualPillar: targetPillar,
    annualTenGod: targetTenGod,
    annualEventTrigger: strongestAnnual || null,
    integratedReading: `${targetPillar} 세운은 ${targetTenGod || "새 십성"}의 사건성을 띠며, 대운의 배경 위에서 ${strongestAnnual?.pillar || "원국"}을 통해 체감되기 쉽습니다.`,
  };
}

function buildDomainSignals({ annualTenGod, yongshin, johu, monthlyFlow }) {
  const opportunityMonths = monthlyFlow.filter((row) => row.timing === "기회").map((row) => `${row.month}월 ${row.pillar}`).slice(0, 4);
  const cautionMonths = monthlyFlow.filter((row) => row.timing === "주의").map((row) => `${row.month}월 ${row.pillar}`).slice(0, 4);
  const domain = TEN_GOD_DOMAIN[annualTenGod] || "새해의 역할 변화";
  return {
    career: `${annualTenGod || "세운"}은 ${domain}을 통해 일의 방향을 드러냅니다.`,
    money: `${yongshin.coreYongshinKo}이 살아나는 달에는 수입의 숨통이 열리고, ${yongshin.gisinKo}이 과한 달에는 지출을 줄이는 쪽이 안정적입니다.`,
    love: "합이 드는 달에는 관계가 가까워지고, 충이 드는 달에는 오래 미룬 대화가 표면으로 올라옵니다.",
    health: `${johu.urgentElementKo} 조절이 컨디션의 핵심이며, 수면과 호흡의 리듬을 먼저 다듬는 편이 좋습니다.`,
    relationship: `${domain}과 맞닿은 인간관계 신호가 강해, 오래된 인연은 ${annualTenGod || "세운"}의 흐름 속에서 다시 정비되고 새 인연은 조직·모임을 통해 이어지기 쉽습니다.`,
    study: `${yongshin.coreYongshinKo}을 채우는 시기에 집중력과 몰입도가 오르고, ${johu.urgentElementKo}이 흐트러지는 시기엔 무리한 목표보다 리듬 회복을 먼저 다루는 편이 낫습니다.`,
    opportunityMonths,
    cautionMonths,
  };
}

function levelFromScore(score) {
  if (score >= 1) return "강";
  if (score <= -1) return "약";
  return "중";
}

// 일간을 극하는 오행(=관성 오행)을 찾는다.
function officerElementOf(dayElement) {
  for (const [element, controlled] of Object.entries(CONTROLS)) {
    if (controlled === dayElement) return element;
  }
  return "";
}

// 한 달의 간지·십신·일지 관계를 명식(용신/기신/조후)과 대조해 5개 도메인의 강약과 근거를 확정한다.
// 조언 문장이 아니라 사실 진술(근거)만 만든다 — 조언 서술은 LLM 상담문이 담당한다.
function buildMonthlyDomainSignals({ element, branch, tenGod, relationToDayBranch }, ctx) {
  const { dayElement, yongshin, johu, targetTenGod, gender } = ctx;
  const core = yongshin.coreYongshinKo;
  const heesin = yongshin.heesinKo;
  const gisin = yongshin.gisinKo;
  const urgent = johu.urgentElementKo;
  const branchElement = BRANCH_ELEMENT[branch] || "";
  const hasHap = /합/.test(relationToDayBranch);
  const hasChung = /충/.test(relationToDayBranch);
  const wealthElement = CONTROLS[dayElement] || "";
  const officerElement = officerElementOf(dayElement);
  const supportsYongshin = element === core || element === heesin || branchElement === core;
  const feedsGisin = element === gisin || branchElement === gisin;

  let overall = 0;
  if (supportsYongshin) overall += 1;
  if (feedsGisin) overall -= 1;
  if (hasHap) overall += 1;
  if (hasChung) overall -= 1;
  const overallBasis = supportsYongshin
    ? `월지 기운이 용신 ${core}을 살려 흐름이 트이는 달`
    : feedsGisin
      ? `기신 ${gisin}이 강해져 속도를 조절할 달`
      : hasChung
        ? "일지와 부딪혀 변화·정비가 잦은 달"
        : hasHap
          ? "일지와 어울려 관계·협력이 매끄러운 달"
          : "큰 굴곡 없이 기존 리듬을 다지는 달";

  const moneyStar = tenGod === "정재" || tenGod === "편재";
  const moneyElementLive = element === wealthElement || branchElement === wealthElement;
  let money = 0;
  if (moneyStar) money += 1;
  if (moneyElementLive) money += 1;
  if (wealthElement === gisin) money -= 1;
  const moneyBasis = moneyStar
    ? `${tenGod}이 드러나 수입·지출이 크게 움직이는 달`
    : moneyElementLive
      ? `재성 ${wealthElement} 기운이 실려 재물 활동이 늘어나는 달`
      : "재물은 큰 출입 없이 관리 중심으로 흐르는 달";

  const loveElement = gender === "male" ? wealthElement : officerElement;
  const loveStar = gender === "male"
    ? (tenGod === "정재" || tenGod === "편재")
    : (tenGod === "정관" || tenGod === "편관");
  const loveElementLive = loveStar || element === loveElement || branchElement === loveElement;
  let love = 0;
  if (hasHap) love += 1;
  if (hasChung) love -= 1;
  if (loveElementLive) love += 1;
  const loveBasis = hasHap
    ? "배우자궁 일지에 합이 들어 관계가 가까워지는 달"
    : hasChung
      ? "배우자궁 일지가 흔들려 미룬 대화가 올라오는 달"
      : loveElementLive
        ? `인연을 뜻하는 ${loveElement} 기운이 살아나는 달`
        : "관계는 큰 파동 없이 잔잔하게 이어지는 달";

  const officerStar = tenGod === "정관" || tenGod === "편관";
  const outputStar = tenGod === "식신" || tenGod === "상관";
  let career = 0;
  if (officerStar) career += 1;
  if (outputStar) career += 1;
  if (tenGod && tenGod === targetTenGod) career += 1;
  if (hasChung) career -= 1;
  const careerBasis = officerStar
    ? `${tenGod}이 올라와 평판·조직·책임이 부각되는 달`
    : outputStar
      ? `${tenGod}이 살아나 실력과 표현이 결과로 이어지는 달`
      : tenGod && tenGod === targetTenGod
        ? "세운과 같은 결이 겹쳐 일의 방향이 또렷해지는 달"
        : "직업 운은 흐름을 유지하며 내실을 다지는 달";

  const healthElementLive = element === urgent || branchElement === urgent;
  let health = 0;
  if (healthElementLive) health += 1;
  if (feedsGisin) health -= 1;
  if (hasChung) health -= 1;
  const healthBasis = healthElementLive
    ? `조후 급용신 ${urgent}이 채워져 컨디션이 안정되는 달`
    : hasChung
      ? "변동의 여파로 피로·리듬 관리가 필요한 달"
      : feedsGisin
        ? `${gisin} 기운이 과해 무리보다 회복이 우선인 달`
        : "건강은 큰 이상 없이 리듬을 지키면 좋은 달";

  return {
    overall: { level: levelFromScore(overall), basis: overallBasis },
    money: { level: levelFromScore(money), basis: moneyBasis },
    love: { level: levelFromScore(love), basis: loveBasis },
    career: { level: levelFromScore(career), basis: careerBasis },
    health: { level: levelFromScore(health), basis: healthBasis },
  };
}

function buildLunarFromInput(dateParts, birthTime, calendarType) {
  if (calendarType === "lunar") {
    // 🔴 음력 입력의 양력 환산도 코어가 한다. lunar-javascript 는 중국 음력이라 표본 4,860건 중
    // 180건(3.70%)에서 하루 어긋나고(실측 2026-08-27), 그 하루가 네 기둥을 통째로 옮긴다.
    const converted = lunarToSolar(dateParts.year, dateParts.month, dateParts.day, false);
    if (!converted) {
      const error = new Error("Invalid lunar birth date for new-year consultation.");
      error.code = "INVALID_BIRTH_DATE";
      throw error;
    }
    return Solar.fromYmdHms(converted.year, converted.month, converted.day, birthTime.hour, birthTime.minute, 0).getLunar();
  }
  return Solar.fromYmdHms(dateParts.year, dateParts.month, dateParts.day, birthTime.hour, birthTime.minute, 0).getLunar();
}

/** 코어의 절기 프레임 년주·월주(한자). 지원 범위(1900~2100) 밖이면 던진다. */
function coreYearMonthPillars(solar) {
  const core = ganji({
    year: solar.getYear(),
    month: solar.getMonth(),
    day: solar.getDay(),
    hour: solar.getHour(),
    minute: solar.getMinute(),
  });
  if (!core) {
    // parseDateParts 가 1900~2100 으로 자르므로 여기 오면 표가 깨진 것이다.
    // 조용히 CST 달력으로 떨어지지 않는다.
    const error = new Error(`korean-calendar core returned no ganji for ${solar.toYmd()}`);
    error.code = "CALENDAR_OUT_OF_RANGE";
    throw error;
  }
  return {
    year: `${STEM_HANJA[core.year.stemIndex]}${BRANCH_HANJA[core.year.branchIndex]}`,
    month: `${STEM_HANJA[core.month.stemIndex]}${BRANCH_HANJA[core.month.branchIndex]}`,
  };
}

/** 서기 연도의 세차(한자). 세운은 입춘이 지난 뒤를 보므로 연도만으로 닫힌다. */
function coreSexagenaryYear(year) {
  const indexes = sexagenaryYearIndexes(year);
  return `${STEM_HANJA[indexes.stemIndex]}${BRANCH_HANJA[indexes.branchIndex]}`;
}

/** 그 해 그 달의 월건(한자). 세운·월운은 15일 정오를 대표 시각으로 쓴다(기존 관례 그대로). */
function coreMonthPillar(year, month) {
  const core = ganji({ year, month, day: 15, hour: 12, minute: 0 });
  if (!core) {
    const error = new Error(`korean-calendar core returned no ganji for ${year}-${month}-15`);
    error.code = "CALENDAR_OUT_OF_RANGE";
    throw error;
  }
  return `${STEM_HANJA[core.month.stemIndex]}${BRANCH_HANJA[core.month.branchIndex]}`;
}

// 사주·세운 계산은 LLM에 넘길 구조 데이터만 만들고, 해석 문장은 LLM 상담 단계에서 생성한다.
function calculateNewYearFortuneData(input) {
  const birth = input.birthInfo || {};
  const dateParts = parseDateParts(birth.birthDate);
  if (!dateParts) {
    const error = new Error("Invalid birth date for new-year consultation.");
    error.code = "INVALID_BIRTH_DATE";
    throw error;
  }
  const birthTime = parseBirthTime(birth.birthTime);
  const lunar = buildLunarFromInput(dateParts, birthTime, birth.calendarType);
  const solar = lunar.getSolar();
  const corePillars = coreYearMonthPillars(solar);
  const yearPillar = toKoreanGanzi(corePillars.year);
  const monthPillar = toKoreanGanzi(corePillars.month);
  const dayPillar = toKoreanGanzi(lunar.getDayInGanZhi());
  const hourPillar = birthTime.timeUnknown ? "" : toKoreanGanzi(lunar.getTimeInGanZhi());
  const pillarMap = { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar };
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar].filter(Boolean);
  const dayMaster = pillarStem(dayPillar);
  const dayBranch = pillarBranch(dayPillar);
  const monthBranch = pillarBranch(monthPillar);
  const fiveElements = buildElementDistribution(pillars);
  const tenGods = buildTenGodDistribution(dayMaster, pillars);
  const strength = judgeStrength(dayMaster, fiveElements);
  const dominantElement = pickElement(fiveElements, "dominant");
  const balancingElement = pickElement(fiveElements, "weak");
  const targetYear = Number(input.targetYear || input.year);
  const targetPillar = toKoreanGanzi(coreSexagenaryYear(targetYear));
  const targetStem = pillarStem(targetPillar);
  const targetBranch = pillarBranch(targetPillar);
  const targetTenGod = tenGodFor(dayMaster, targetStem);
  const annualInteractions = buildAnnualInteractions(pillarMap, targetStem, targetBranch);
  const gyeokguk = buildGyeokgukSummary(dayMaster, monthPillar);
  const yongshin = buildYongshinSummary(dayMaster, fiveElements);
  const johu = buildJohuSummary(monthBranch, fiveElements);
  const domainContext = {
    dayElement: STEM_ELEMENT[dayMaster] || "",
    yongshin,
    johu,
    targetTenGod,
    gender: birth.gender,
  };
  const monthlyFlow = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const monthPillar = toKoreanGanzi(coreMonthPillar(targetYear, month));
    const stem = pillarStem(monthPillar);
    const branch = pillarBranch(monthPillar);
    const element = STEM_ELEMENT[stem] || BRANCH_ELEMENT[branch] || "";
    const tenGod = tenGodFor(dayMaster, stem);
    const branchRelation = describeBranchRelation(dayBranch, branch);
    const timing = element === balancingElement || /합/.test(branchRelation)
      ? "기회"
      : element === dominantElement || /충/.test(branchRelation)
        ? "주의"
        : "정비";
    return {
      month,
      pillar: monthPillar,
      stem,
      branch,
      element,
      tenGod,
      domain: TEN_GOD_DOMAIN[tenGod] || "생활 리듬 조정",
      stemRelationToDayMaster: describeStemRelation(dayMaster, stem),
      relationToDayBranch: branchRelation,
      timing,
      domains: buildMonthlyDomainSignals({ element, branch, tenGod, relationToDayBranch: branchRelation }, domainContext),
    };
  });
  const daewoonSewoon = buildDaewoonSewoonSummary({
    birthYear: dateParts.year,
    gender: birth.gender,
    yearStem: pillarStem(yearPillar),
    targetYear,
    targetPillar,
    targetTenGod,
    annualInteractions,
  });
  const domainSignals = buildDomainSignals({ annualTenGod: targetTenGod, yongshin, johu, monthlyFlow });

  return {
    birthCalendar: {
      solarDate: `${solar.getYear()}-${String(solar.getMonth()).padStart(2, "0")}-${String(solar.getDay()).padStart(2, "0")}`,
      inputCalendarType: birth.calendarType,
      timeUnknown: birthTime.timeUnknown,
    },
    saju: {
      yearPillar,
      monthPillar,
      dayPillar,
      hourPillar: hourPillar || "출생시간 미입력",
      dayMaster,
      dayBranch,
      fiveElements,
      tenGods,
      strength,
      dominantElement,
      balancingElement,
    },
    targetYear: {
      year: targetYear,
      pillar: targetPillar,
      stem: targetStem,
      branch: targetBranch,
      stemElement: STEM_ELEMENT[targetStem] || "",
      branchElement: BRANCH_ELEMENT[targetBranch] || "",
      tenGodToDayMaster: targetTenGod,
      relationToDayBranch: describeBranchRelation(dayBranch, targetBranch),
      relationToYearBranch: describeBranchRelation(pillarBranch(yearPillar), targetBranch),
    },
    advancedSajuSummary: {
      gyeokguk,
      yongshin,
      johu,
      annualInteractions,
      daewoonSewoon,
      domainSignals,
    },
    focus: {
      focusArea: input.focusArea,
      focusLabel: FOCUS_AREA_LABELS[input.focusArea] || FOCUS_AREA_LABELS.overall,
      question: input.question || "",
    },
    monthlyFlow,
  };
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

function normalizeFocusArea(value) {
  const text = clean(value, 40).toLowerCase();
  if (Object.prototype.hasOwnProperty.call(FOCUS_AREA_LABELS, text)) return text;
  return "overall";
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeConsultationInput(body = {}) {
  const rawYear = body.targetYear ?? body.year ?? body.consultationYear;
  const year = Math.floor(Number(rawYear));
  const birthInfo = body.birthInfo && typeof body.birthInfo === "object" ? body.birthInfo : {};
  const serviceType = clean(body.serviceType || body.featureKey || FEATURE_KEY, 80) || FEATURE_KEY;
  const consultationType = clean(body.consultationType || "newYearFortune", 80);
  const name = clean(body.userName ?? body.name ?? body.nickname ?? birthInfo.name, 80);
  const gender = normalizeGender(body.gender ?? birthInfo.gender);
  const birthDate = clean(body.birthDate ?? birthInfo.birthDate, 10);
  const birthTime = clean(body.birthTime ?? birthInfo.birthTime, 5);
  const calendarType = clean(body.calendarType ?? birthInfo.calendarType, 20).toLowerCase();
  const focusArea = normalizeFocusArea(body.focusArea ?? body.topicArea ?? body.domain);
  const question = clean(body.question ?? body.topic ?? body.consultationTopic, 1000);
  const topic = question || `${FOCUS_AREA_LABELS[focusArea] || FOCUS_AREA_LABELS.overall} 중심의 ${year || ""}년 신년운세`;
  const hasCustomQuestion = Boolean(body.hasCustomQuestion) && question.length >= 2;

  if (rawYear === undefined || rawYear === null || clean(rawYear) === "") {
    return { ok: false, message: "상담할 연도를 선택해 주세요." };
  }
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return { ok: false, message: "상담 연도를 정확히 입력해 주세요." };
  }
  if (!gender || !birthDate || !calendarType) {
    return { ok: false, message: "신년운세 상담에 필요한 정보가 부족해요. 생년월일, 성별, 달력 기준을 다시 확인해 주세요." };
  }
  if (!isValidDateKey(birthDate)) return { ok: false, message: "생년월일을 YYYY-MM-DD 형식으로 입력해 주세요." };
  if (birthTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) {
    return { ok: false, message: "출생시간은 HH:mm 형식으로 입력해 주세요." };
  }
  if (calendarType !== "solar" && calendarType !== "lunar") {
    return { ok: false, message: "양력 또는 음력을 선택해 주세요." };
  }
  if (focusArea === "custom" && question.length < 2) return { ok: false, message: "직접 질문을 선택했다면 궁금한 내용을 짧게 적어 주세요." };

  const normalized = {
    year,
    targetYear: year,
    serviceType,
    consultationType,
    birthInfo: { name, gender, birthDate, birthTime, calendarType },
    focusArea,
    question,
    topic,
    hasCustomQuestion,
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

function objectIdLike(value) {
  const text = clean(value, 180);
  return Boolean(text && mongoose.Types.ObjectId.isValid(text));
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
    body.executionId,
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

function pointHistoryTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ "metadata.requestId": token });
    clauses.push({ "metadata.purchaseId": token });
    clauses.push({ "metadata.idempotencyKey": token });
    clauses.push({ "metadata.orderId": token });
    clauses.push({ "metadata.transactionId": token });
    clauses.push({ "metadata.pointHistoryId": token });
    if (objectIdLike(token)) clauses.push({ _id: token });
  });
  return clauses;
}

function deferredTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ requestId: token });
    clauses.push({ idempotencyKey: token });
    clauses.push({ executionId: token });
    clauses.push({ paymentId: token });
    clauses.push({ orderId: token });
    clauses.push({ "result.deferredUsage.requestId": token });
    clauses.push({ "result.deferredUsage.paymentId": token });
    if (objectIdLike(token)) clauses.push({ _id: token });
  });
  return clauses;
}

function paymentTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ requestId: token });
    clauses.push({ idempotencyKey: token });
    clauses.push({ merchantUid: token });
    clauses.push({ impUid: token });
    clauses.push({ "metadata.requestId": token });
    clauses.push({ "metadata.purchaseId": token });
    clauses.push({ "metadata.idempotencyKey": token });
  });
  return clauses;
}

function normalizeBillingAccessType(value) {
  const accessType = clean(value).toLowerCase();
  if (["membership_credit", "monthly_credit", "moonlight_stone", "monthly", "subscription"].includes(accessType)) return "subscription";
  if (["membership_pass", "license_pass", "subscription_pass", "pass", "family", "family_pass"].includes(accessType)) return "pass";
  return "paid";
}

async function resolveBillingGateAccess({ env, auth, user, body, pricing, idempotencyKey }) {
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

  if (/usage[-_]pass/.test(signal)) return null;

  if (signal.includes("pass")) {
    const featureAccess = resolveFeatureAccessPolicy({ user: user || {}, pricing, coinCost: pricing.coinPrice });
    if (featureAccess.allowed) {
      return { ok: true, accessType: featureAccess.accessType || "pass", paymentId: tokens[0] || "", prepaid: true };
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

  // 🔴 예전에는 `metadata.featureKey` 로 걸렀는데 결제 V2 원장의 metadata 에는 그 필드가 없다
  //    (worker/payments/moonstone.js 는 기능키를 top-level serviceKey 에 적는다) — 그래서 이 조회는
  //    V2 이후 **한 번도 매치되지 않았고** 월정석 결제자가 차감만 당하고 결과를 못 받았다.
  //    기능키 매칭과 정산 확인은 정본(worker/lib/moonstone-spend-proof.js)이 담당한다.
  const monthlyEvidence = await findMoonstoneSpendEvidence(env, {
    userId: auth.userId,
    featureKeys: [FEATURE_KEY, SERVICE_KEY],
    tokens,
  });
  if (monthlyEvidence) {
    return { ok: true, accessType: "subscription", paymentId: clean(monthlyEvidence.ledgerId, 160), prepaid: true };
  }

  const deferredClauses = deferredTokenClauses(tokens);
  if (deferredClauses.length) {
    const record = await PaidExecutionRecord.findOne({
      userId: clean(auth.userId),
      featureId: FEATURE_KEY,
      status: { $in: ["paid_pending_generation", "generating", "completed"] },
      $or: deferredClauses,
    }).sort({ updatedAt: -1, createdAt: -1 }).lean();
    if (record) {
      const deferredUsage = asObject(asObject(record.result).deferredUsage);
      return {
        ok: true,
        accessType: normalizeBillingAccessType(deferredUsage.accessType || record.accessMethod || signal),
        paymentId: clean(record._id, 160),
        billingRequestId: clean(record.requestId || idempotencyKey, 180),
        deferredUsage: record.status !== "completed",
        usageAlreadyApplied: record.status === "completed",
        prepaid: true,
      };
    }
  }

  const paymentClauses = paymentTokenClauses(tokens);
  if (paymentClauses.length) {
    const payment = await Payment.findOne({
      userId: auth.userId,
      featureKey: FEATURE_KEY,
      status: { $in: ["paid", "success", "fulfilled"] },
      $or: paymentClauses,
    }).sort({ updatedAt: -1, paidAt: -1, createdAt: -1 }).lean();
    if (payment) {
      return {
        ok: true,
        accessType: "paid",
        paymentId: clean(payment.merchantUid || payment.impUid || payment._id || tokens[0], 160),
        billingRequestId: clean(payment.requestId || payment.idempotencyKey || idempotencyKey, 180),
        usageAlreadyApplied: true,
        prepaid: true,
      };
    }
  }

  return null;
}

function buildBillingGatePayload({ pricing, idempotencyKey }) {
  return {
    billingMode: "coin-gate",
    featureKey: FEATURE_KEY,
    serviceKey: SERVICE_KEY,
    serviceId: SERVICE_KEY,
    serviceType: FEATURE_KEY,
    consultationType: "newYearFortune",
    categoryKey: "premium-consultation",
    subFeatureKey: FEATURE_KEY,
    contentId: FEATURE_KEY,
    orderName: ORDER_NAME,
    reason: ORDER_NAME,
    cost: pricing.coinPrice,
    coinPrice: pricing.coinPrice,
    totalAmount: pricing.amountKRW,
    paymentAmount: pricing.amountKRW,
    amountKRW: pricing.amountKRW,
    currency: "CURRENCY_KRW",
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

async function resolveServerAccess({ env, auth, user, pricing, idempotencyKey = "", inputHash = "", body = {} }) {
  if (isAdmin(auth) || clean(user?.role).toLowerCase() === "admin") {
    return { ok: true, accessType: "admin", paymentId: "", usageAlreadyApplied: true };
  }

  if (idempotencyKey && inputHash) {
    const existing = await NewYearAiConsultation.findOne({
      userId: clean(auth.userId),
      idempotencyKey,
      inputHash,
      status: "completed",
    }).select("id accessType paymentId").lean();
    if (existing) {
      return {
        ok: true,
        accessType: clean(existing.accessType) || "paid",
        paymentId: clean(existing.paymentId, 160),
        billingRequestId: idempotencyKey,
        usageAlreadyApplied: true,
      };
    }
  }

  const billing = await resolveBillingGateAccess({ env, auth, user, body, pricing, idempotencyKey });
  if (billing?.ok) {
    return {
      ...billing,
      usageAlreadyApplied: billing.usageAlreadyApplied === true,
    };
  }

  const featureAccess = resolveFeatureAccessPolicy({ user: user || {}, pricing, coinCost: pricing.coinPrice });
  if (featureAccess.allowed) {
    return { ok: true, accessType: featureAccess.accessType || "pass", paymentId: "", usageAlreadyApplied: false };
  }

  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

/** 관리자 CMS 가 기본값을 보여줄 때 읽어 간다(worker/lib/cms-prompt-defaults.js). */
export function getDefaultSystemPrompt() {
  return buildSystemPrompt();
}

/* 관리자 프롬프트 랩 전용. 결제·LLM 없이 프로덕션과 똑같은 프롬프트를 조립해 돌려준다
   (lib/admin/prompt-lab-registry.mjs 참고). 프로덕션 경로가 쓰는 함수를 그대로 부르므로
   여기서 프롬프트 문장을 새로 쓰지 않는다 — 다르게 쓰면 랩이 거짓말을 하게 된다. */
export function buildAdminLabPrompt(body = {}, options = {}) {
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    throw new Error(normalized.message || "신년운세 프롬프트에 필요한 입력이 부족합니다.");
  }

  const section = options.section || null;
  const fortuneData = calculateNewYearFortuneData(normalized.input);

  return {
    systemPrompt: buildSystemPrompt(section),
    prompt: buildFirstPrompt(normalized.input, fortuneData, section),
  };
}

// section을 넘기면 "완성본 전체"가 아니라 그 부분만 쓰는 지시가 뒤에 붙는다.
// 인자 없이 부르면 출력이 기존과 완전히 동일하다(verify-new-year-ai-flow가 이 문자열들을 단언).
function buildSystemPrompt(section = null) {
  return [
    "당신은 사주명리학과 세운 분석을 깊게 다루는 최고 수준의 명리학자입니다.",
    "문체는 프리미엄 상담실에서 오래 마주 앉아 말하는 사람처럼 고요하고 분명해야 합니다.",
    "",
    "사용자의 생년월일, 원국의 격국과 용신·기신, 조후, 대운의 배경, 목표 연도의 세운과 월운을 함께 묶어 신년운세를 읽습니다.",
    "",
    "반드시 지켜야 할 원칙:",
    "1. 보고서처럼 딱딱하게 쓰지 말고, 오래 상담해 온 명리학자가 마주 앉아 말하듯 자연스럽게 답변합니다.",
    "2. 일간, 월령, 격국, 용신·기신, 조후, 천간합충, 지지합충, 대운과 세운의 관계를 근거로 삼되 쉬운 말로 풀어냅니다.",
    "3. 핵심 결론, 명식 근거, 대운-세운 해석, 사용자가 선택한 집중 분야, 월별 기회와 주의, 현실 조언, 마지막 한 줄을 빠뜨리지 않습니다.",
    "4. 불안감을 조장하지 않습니다.",
    "5. 무조건 성공한다, 반드시 망한다 같은 단정적 표현을 쓰지 않습니다.",
    "6. 사용자가 당장 실천할 수 있는 조언을 구체적인 행동과 시기 감각으로 포함합니다.",
    "7. 같은 문장을 반복하지 않습니다.",
    "8. “AI로 생성되었습니다”, “프롬프트”, “시스템” 같은 표현은 결과에 노출하지 않습니다.",
    "9. 사용자가 처음 입력한 더 깊게 보고 싶은 흐름이 있으면 그 주제를 가장 깊게 다룹니다.",
    "10. 답변 마지막에는 추가 질문을 유도하지 말고, 새해를 여는 한 줄 조언으로 마무리합니다.",
    "11. PDF, 챕터, progress, job이라는 단어를 쓰지 않습니다.",
    "12. 계산 항목을 나열하는 대신, 왜 그런 흐름이 드러나는지 명식의 근거와 생활 선택을 한 문맥으로 이어 말합니다.",
    "13. 완성 상담문 전체 본문은 공백을 제외하고 15,000자 이상 24,000자 이하로 씁니다. 권장 분량은 17,000~22,000자이며, 항목마다 15,000자를 쓰라는 뜻이 아닙니다.",
    "14. 분량이 부족할 때는 같은 말을 늘리지 말고, 명리 전문가로서 격국·월령, 용신·기신, 조후, 대운·세운, 천간·지지 합충, 월운, 현실 처방 파트를 새로 보강합니다.",
    "15. 문단 사이는 빈 줄로 구분하고, 핵심 문구는 **굵게** 표시합니다. 필요할 때만 '-' 목록을 쓰고, 그 외 마크다운(제목 #, 코드블록, 표)은 쓰지 않습니다.",
    ...(section ? [
      "",
      `이번 요청은 완성 상담문 전체가 아니라 "${section.label}" 부분만 쓰는 작업입니다.`,
      "위 13번의 전체 분량 기준은 여러 부분을 합친 최종 결과에 적용됩니다. 이번 응답에서는 사용자 프롬프트가 지정한 이 부분의 분량 범위만 지키세요.",
      "인사말·자기소개·전체 총평·마무리 인사를 새로 만들지 말고, 지정된 항목의 내용만 이어서 씁니다.",
    ] : []),
  ].join("\n");
}

// 세운·월운 계산 확정값을 프롬프트 앵커로 요약한다.
// 본문이 이 값과 다르게 서술하면 품질 게이트(validateConsultationQuality)에서 반려된다.
function buildCanonicalNewYearFacts(fortuneData = {}) {
  const target = fortuneData.targetYear || {};
  const trigger = fortuneData.advancedSajuSummary?.daewoonSewoon?.annualEventTrigger || null;
  const monthly = Array.isArray(fortuneData.monthlyFlow) ? fortuneData.monthlyFlow : [];
  const lines = [];
  if (target.pillar) {
    lines.push(`세운: ${target.year}년 ${target.pillar} (천간 ${target.stem}=${target.stemElement}, 지지 ${target.branch}=${target.branchElement}, 일간 기준 십신 ${target.tenGodToDayMaster || "미산출"})`);
  }
  if (trigger) {
    lines.push(`세운이 가장 강하게 닿는 원국 자리: ${trigger.pillar} ${trigger.ganji} — 천간 ${trigger.heavenlyStem} / 지지 ${trigger.earthlyBranch}`);
  }
  if (monthly.length) {
    lines.push("월별 확정 스펙 (달마다 이 간지·십신·판정과 도메인 강약을 근거로, 두드러진 축을 서로 다른 조언으로 쓸 것):");
    monthly.forEach((row) => {
      const d = row.domains || {};
      const domainDigest = MONTHLY_DOMAIN_KEYS
        .map((key) => d[key]?.level ? `${MONTHLY_DOMAIN_LABELS[key]}${d[key].level}` : "")
        .filter(Boolean)
        .join("·");
      const domainPart = domainDigest ? ` | ${domainDigest}` : "";
      lines.push(`- ${row.month}월 ${row.pillar} · ${row.tenGod || "십신 미산출"} · ${row.timing} · ${row.relationToDayBranch}${domainPart}`);
    });
  }
  return lines;
}

// 카테고리별 소제목 작성의 출발점이 되는 6개 도메인 신호를 프롬프트에서 바로 보이도록 정리한다.
function buildDomainSignalLines(fortuneData = {}) {
  const domainSignals = fortuneData.advancedSajuSummary?.domainSignals || {};
  const entries = [
    ["연애·재회", domainSignals.love],
    ["재물·수입", domainSignals.money],
    ["직업·이직", domainSignals.career],
    ["건강·멘탈", domainSignals.health],
    ["가족·관계", domainSignals.relationship],
    ["학업·성장", domainSignals.study],
  ];
  return entries.filter(([, signal]) => signal).map(([label, signal]) => `- ${label}: ${signal}`);
}

// 9항목 아웃라인. 섹션에 번호로 배분하기 위해 문자열 배열이 아니라 { no, line }으로 들고 있는다.
// 항목 문구는 기존과 한 글자도 다르지 않다 — verify-new-year-ai-flow가 이 문장들을 단언한다.
function buildConsultationOutline(input) {
  return [
    ...(input.hasCustomQuestion ? [{
      no: 0,
      line: "0. 다른 무엇보다 먼저, 소제목 **질문에 대한 답변**을 굵게 쓰고 사용자가 직접 남긴 질문에 직접적이고 구체적으로 답합니다. 이 답변을 마친 뒤에 아래 1번부터 이어갑니다.",
    }] : []),
    { no: 1, line: "1. 타고난 성향 총론을 가장 먼저 씁니다. 일간·월령·격국·오행 분포를 근거로 이 사람이 타고난 기질과 성향이 어떤지 전반적으로 짚어, 상담자가 '나를 정확히 봤다'고 느끼도록 신뢰를 먼저 세웁니다." },
    { no: 2, line: "2. 새해 전체 운의 핵심 결론을 말합니다." },
    { no: 3, line: "3. 원국의 격국, 용신·기신, 조후가 올해 어떤 방식으로 쓰이는지 쉽게 풀어냅니다." },
    { no: 4, line: "4. 대운의 배경 위에 세운이 어떤 사건성과 선택 압력을 일으키는지 짚습니다. 이때 세운 간지와, 세운이 원국의 어느 기둥과 합·충하는지를 본문에 직접 인용해 근거로 삼습니다." },
    { no: 5, line: "5. 사용자가 선택한 집중 상담 분야를 가장 깊게 다룹니다." },
    { no: 6, line: "6. 월별 흐름과는 별개로, 다음 6개 소제목을 **굵게** 표시해 각각 최소 한 문단 이상 씁니다(순서는 자유롭게 정하되 6개 모두 반드시 포함): **연애·재회**, **재물·수입**, **직업·이직**, **건강·멘탈**, **가족·관계**, **학업·성장**. 집중 분야로 고른 항목을 가장 깊게 쓰고 나머지도 위 카테고리별 참고 신호를 근거로 자연스럽게 채웁니다." },
    { no: 7, line: "7. 월별 흐름에서는 1월부터 12월까지 열두 달을 하나도 빠뜨리지 않고 각각 최소 한 문단씩 씁니다. 각 달 문단은 반드시 `**{월}월 · {그 달의 월주 간지} · {4~8자 핵심 키워드}**` 형식의 소제목으로 시작하세요(예: **3월 · 병인 · 관계 재정비**). 키워드는 그 달의 조언을 한눈에 요약하는 짧은 표현이어야 합니다. 이어지는 본문에서는 위 월별 확정 스펙의 월주 간지와 십신을 직접 언급하고, 판정(기회/주의/정비)에 맞는 조언을 이웃한 달과 겹치지 않게 다르게 씁니다. 또한 각 달의 도메인 강약(총운·재물·애정·직업·건강) 중 그 달에 두드러진 축(강하거나 약한 것)을 근거로 삼아, 해당 도메인에 대한 구체적인 실천 조언을 문단 안에 자연스럽게 녹여 쓰세요. 다섯 도메인을 매달 기계적으로 나열하지 말고, 그 달에 의미 있는 축을 골라 이야기하듯 풀어냅니다." },
    { no: 8, line: "8. 조심해야 할 패턴은 겁주지 말고, 피해야 할 선택과 회복 방법을 함께 말합니다." },
    { no: 9, line: "9. 마지막에는 사용자가 올해 붙잡을 수 있는 현실 조언과 새해를 여는 한 줄을 남깁니다." },
  ];
}

// 분야별 섹션이 실제로 쓰는 아웃라인. 위 buildConsultationOutline(전체 1회 생성용)은
// verify-new-year-ai-flow가 문장을 리터럴로 단언하므로 건드리지 않고, 섹션 모드만 이 표를 쓴다.
// 월별(monthly)은 기존 7번 항목을 그대로 재사용한다 — 그 문장의 `**{월}월 · {간지} · {키워드}**`
// 형식은 클라이언트 MONTH_LETTER_HEADING_RE가 파싱하는 계약이라 바꾸면 월별 편지가 통째로 사라진다.
const NEW_YEAR_AI_SECTION_OUTLINES = Object.freeze({
  overview: [
    "1. 타고난 성향 총론을 가장 먼저 씁니다. 일간·월령·격국·오행 분포를 근거로 이 사람이 타고난 기질과 성향이 어떤지 전반적으로 짚어, 상담자가 '나를 정확히 봤다'고 느끼도록 신뢰를 먼저 세웁니다.",
    "2. 올해 세운의 천간과 지지가 일간(日主)과 원국 전체에 어떤 변화를 만드는지, 조후(온도·습도)와 억부(일간의 강약)를 중심으로 짚습니다. 세운 천간이 일간을 돕는지 누르는지, 세운 지지가 월령의 계절 기운을 어느 쪽으로 기울이는지를 명시하고, 그 결과 올해 이 사람의 기운이 작년보다 강해지는지 약해지는지 결론을 냅니다.",
    "3. 원국의 격국, 용신·기신, 조후가 올해 어떤 방식으로 쓰이는지 쉽게 풀어냅니다.",
    "4. 대운의 배경 위에 세운이 어떤 사건성과 선택 압력을 일으키는지 짚습니다. 이때 세운 간지와, 세운이 원국의 어느 기둥과 합·충하는지를 본문에 직접 인용해 근거로 삼습니다.",
    "5. 사용자가 선택한 집중 상담 분야를 이 총운 안에서 한 문단 이상 깊게 다룹니다.",
    "6. 소제목 **학업·성장**을 굵게 표시하고 최소 한 문단 이상 씁니다. 위 카테고리별 참고 신호의 학업·성장 항목을 출발점으로 삼되 표현은 자연스럽게 재구성합니다.",
  ],
  wealth: [
    "1. 재성(정재·편재)의 동태를 먼저 봅니다. 원국에 재성이 있는지·강한지 약한지, 올해 세운과 월운이 그 재성을 살리는지 흩는지를 십신 이름과 함께 짚어, 올해 돈이 모이는 방식과 새는 자리를 구분해 말합니다.",
    "2. 관성(정관·편관)의 동태를 봅니다. 명예와 직장, 조직 안에서의 자리와 책임이 올해 어떻게 움직이는지, 세운의 십신이 관성을 밀어 올리는지 눌러 앉히는지를 근거로 삼습니다.",
    "3. 구체적인 시기를 반드시 월 숫자로 지목합니다. 위 월별 확정 스펙에서 재물 도메인이 강한 달과 약한 달, 직업 도메인이 강한 달과 약한 달을 골라 '몇 월에 무엇을 하고 무엇을 미룰지'를 말합니다. 여기서는 열두 달을 모두 나열하지 말고, 재물과 직업에서 의미 있는 달만 골라 씁니다.",
    "4. 투자와 이직 판단 기준을 제시합니다. 올해의 재성·관성 흐름과 용신·기신을 근거로, 어떤 조건이면 움직이고 어떤 조건이면 지키는 편이 나은지 판단 기준으로 말합니다. 특정 종목이나 회사를 지목하지 말고, 무조건 벌린다·무조건 접는다 같은 단정도 하지 않습니다.",
    "5. 소제목 **재물·수입**과 **직업·이직**을 각각 **굵게** 표시하고 각각 최소 한 문단 이상 씁니다. 위 카테고리별 참고 신호의 해당 항목을 출발점으로 삼되 표현은 자연스럽게 재구성합니다.",
  ],
  romance: [
    "1. 식상(식신·상관)과 비겁(비견·겁재), 인성(정인·편인)의 흐름을 먼저 봅니다. 올해 이 사람의 표현과 마음이 밖으로 나가는 결(식상), 사람들과 자원을 나누는 결(비겁), 보호받고 기대는 결(인성) 중 어디가 살아나고 어디가 과해지는지를 십신 이름과 함께 짚습니다.",
    "2. 올해의 귀인운을 말합니다. 어떤 성향의 사람이 도움이 되고 어떤 자리(조직·모임·오래된 인연)에서 그 사람이 나타나기 쉬운지를, 인성과 세운 십신의 흐름을 근거로 구체적으로 씁니다.",
    "3. 연애운을 봅니다. 남성 명식이면 재성, 여성 명식이면 관성을 인연의 축으로 삼고, 일지(배우자궁)에 합이 드는 달과 충이 드는 달을 근거로 인연이 가까워지는 시기와 서두르지 말아야 할 시기를 나눠 말합니다. 재회 가능성을 물었다면 지난 인연이 다시 닿는 결과 그때 필요한 태도를 함께 짚습니다.",
    "4. 주의해야 할 인간관계의 단절과 구설수를 다룹니다. 겁재가 강해지는 자리에서는 돈과 사람이 함께 빠지고, 상관이 과해지는 자리에서는 말이 앞서 신뢰가 깎입니다. 겁주지 말고, 어떤 말과 선택을 피하면 관계가 유지되는지 회복 방법과 함께 말합니다.",
    "5. 소제목 **연애·재회**와 **가족·관계**를 각각 **굵게** 표시하고 각각 최소 한 문단 이상 씁니다. 위 카테고리별 참고 신호의 해당 항목을 출발점으로 삼되 표현은 자연스럽게 재구성합니다.",
  ],
  monthly: [
    "1. 1월부터 12월까지 열두 달을 하나도 빠뜨리지 않고 각각 최소 한 문단씩 씁니다. 각 달 문단은 반드시 `**{월}월 · {그 달의 월주 간지} · {4~8자 핵심 키워드}**` 형식의 소제목으로 시작하세요(예: **3월 · 병인 · 관계 재정비**). 키워드는 그 달의 조언을 한눈에 요약하는 짧은 표현이어야 합니다. 이어지는 본문에서는 위 월별 확정 스펙의 월주 간지와 십신을 직접 언급하고, 판정(기회/주의/정비)에 맞는 조언을 이웃한 달과 겹치지 않게 다르게 씁니다. 또한 각 달의 도메인 강약(총운·재물·애정·직업·건강) 중 그 달에 두드러진 축(강하거나 약한 것)을 근거로 삼아, 해당 도메인에 대한 구체적인 실천 조언을 문단 안에 자연스럽게 녹여 쓰세요. 다섯 도메인을 매달 기계적으로 나열하지 말고, 그 달에 의미 있는 축을 골라 이야기하듯 풀어냅니다.",
  ],
  health: [
    "1. 오행 분포의 쏠림을 먼저 봅니다. 어떤 오행이 과하고 어떤 오행이 비어 있는지를 원국의 오행 분포로 짚고, 그 쏠림이 몸의 어느 계통(예: 목=간담과 근육, 화=심장과 순환, 토=소화, 금=호흡기와 피부, 수=신장과 수분 대사)과 어떤 멘탈 리듬으로 드러나기 쉬운지 말합니다. 병을 단정하지 말고 '무리하면 먼저 신호가 오는 자리'로 표현합니다.",
    "2. 조심해야 할 패턴은 겁주지 말고, 피해야 할 선택과 회복 방법을 함께 말합니다. 기신이 강해지는 시기와 조후가 흐트러지는 시기를 근거로, 그때 몸과 마음이 어떻게 흔들리고 무엇을 먼저 되돌리면 되는지 씁니다.",
    "3. 실생활에서 바로 쓸 수 있는 개운법을 제시합니다. 용신·희신 오행과 조후 급용신을 근거로 삼아 (가) 가까이 두면 좋은 색, (나) 힘을 얻는 방향, (다) 생활 습관과 리듬, (라) 마음가짐 네 가지를 구체적으로 말합니다. 오행과 색·방향의 연결(목=청록/동쪽, 화=붉은색/남쪽, 토=황토색/중앙, 금=흰색/서쪽, 수=검정과 남색/북쪽)을 근거로 쓰되, 부적이나 값비싼 물건을 사라는 식으로 말하지 않고 옷·소품·공간 배치·산책 방향처럼 돈이 들지 않는 실천으로 풀어냅니다.",
    "4. 소제목 **건강·멘탈**을 굵게 표시하고 최소 한 문단 이상 씁니다. 위 카테고리별 참고 신호의 해당 항목을 출발점으로 삼되 표현은 자연스럽게 재구성합니다.",
    "5. 마지막에는 사용자가 올해 붙잡을 수 있는 현실 조언과 새해를 여는 한 줄을 남깁니다. 이 문장이 상담문 전체의 마지막이 되므로 새 주제를 열지 말고 조용히 닫습니다.",
  ],
});

function buildSectionOutlineLines(input, section) {
  const lines = NEW_YEAR_AI_SECTION_OUTLINES[section.key] || [];
  // 사용자가 직접 남긴 질문은 총운 섹션이 맨 앞에서 책임진다(조립 순서상 상담문 첫머리).
  const questionLine = input.hasCustomQuestion && section.key === "overview"
    ? ["0. 다른 무엇보다 먼저, 소제목 **질문에 대한 답변**을 굵게 쓰고 사용자가 직접 남긴 질문에 직접적이고 구체적으로 답합니다. 이 답변을 마친 뒤에 아래 1번부터 이어갑니다."]
    : [];
  const headingLine = section.heading
    ? [`이 부분의 본문은 반드시 소제목 **${section.heading}**을(를) 굵게 쓴 줄로 시작하고, 그 아래에 아래 항목들을 이어서 씁니다.`]
    : [];
  return [...headingLine, ...questionLine, ...lines];
}

// 섹션 모드에서 전체 분량 지시(10,000~20,000자)를 대신하는 줄들.
// covered로 다른 섹션이 담당하는 내용을 명시해 이어 붙였을 때의 중복을 막는다.
function buildSectionLengthLines(section) {
  return [
    `이 부분의 본문은 공백을 제외하고 ${section.minChars.toLocaleString("ko-KR")}자 이상 ${section.maxChars.toLocaleString("ko-KR")}자 이하로 쓰세요.`,
    "위에 나열된 항목들에 분량을 고르게 배분하고, 한 항목만 길게 쓰지 마세요.",
    `다른 부분에서 따로 다루는 내용(${section.covered})은 여기서 반복하지 마세요.`,
    "분량이 부족하면 문장을 길게 늘이지 말고, 격국과 월령, 용신·기신, 조후, 대운과 세운, 천간·지지 합충의 근거를 더 촘촘하게 채우세요.",
    "마지막 문장을 중간에 끊지 말고 반드시 완결해 끝내세요.",
  ];
}

// section을 넘기면 그 섹션이 맡은 아웃라인 항목만 남기고 분량 지시도 섹션 기준으로 바뀐다.
// 2인자로 부르면 출력이 기존과 완전히 동일하다(verify-new-year-ai-flow가 이 프롬프트를 단언).
function buildFirstPrompt(input, fortuneData, section = null) {
  const birth = input.birthInfo || {};
  const outline = buildConsultationOutline(input);
  return [
    "아래 사용자 입력과 서버에서 계산된 사주·세운 데이터를 바탕으로 신년운세 첫 상담문을 작성하세요.",
    "문장은 전문적이고 신비로우며 따뜻하게, 실제 선택에 도움이 되도록 현실적으로 말하세요.",
    "격국, 용신·기신, 조후, 대운-세운 관계, 세운 천간/지지 충합, 월별 흐름을 서로 따로 나열하지 말고 한 사람의 새해 흐름으로 엮어 주세요.",
    "짧은 제목을 쓰더라도 보고서 목차처럼 굳히지 말고, 상담가의 말결이 살아 있는 문단으로 이어 주세요.",
    "",
    "[사용자 입력]",
    `- 이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `- 성별: ${birth.gender}`,
    `- 생년월일: ${birth.birthDate}`,
    `- 출생시간: ${birth.birthTime || "모름"}`,
    `- 달력: ${birth.calendarType === "lunar" ? "음력" : "양력"}`,
    `- 상담 연도: ${input.targetYear || input.year}`,
    `- 집중 상담 분야: ${FOCUS_AREA_LABELS[input.focusArea] || FOCUS_AREA_LABELS.overall}`,
    `- 처음 입력한 더 깊게 보고 싶은 흐름: ${input.question || "전체 흐름 중심"}`,
    "",
    // "질문에 대한 답변" 소제목은 총운 섹션 하나만 쓴다. 섹션 전부에 이 지시가 들어가면
    // 조립본에 같은 소제목이 다섯 번 반복되고, 분야 카드마다 같은 답이 머리에 붙는다.
    ...(input.hasCustomQuestion && (!section || section.key === "overview") ? [
      "[사용자가 직접 남긴 질문 — 최우선으로 답할 것]",
      `"${input.question}"`,
      "이 질문은 사용자가 가장 궁금해하는 개인화된 질문입니다. 아래 답변 맨 앞에 반드시 소제목 **질문에 대한 답변**을 굵게 쓰고, 그 아래에 이 질문에 대한 직접적이고 구체적인 결론을 먼저 씁니다. 범용적인 총론과 겹치지 않게, 이 질문의 단어와 맥락에 특화된 근거와 조언을 담으세요.",
      "",
    ] : []),
    // 다른 분야 섹션에는 질문을 맥락으로만 준다 — 답변 소제목은 만들지 않는다.
    ...(input.hasCustomQuestion && section && section.key !== "overview" ? [
      "[사용자가 직접 남긴 질문 — 맥락 참고용]",
      `"${input.question}"`,
      "이 질문에 대한 직접적인 답변 소제목은 다른 부분에서 이미 씁니다. 여기서는 **질문에 대한 답변** 소제목을 만들지 말고, 이 부분이 맡은 분야가 그 질문과 맞닿는 지점만 자연스럽게 반영하세요.",
      "",
    ] : []),
    "[계산된 사주와 세운 데이터]",
    JSON.stringify(fortuneData),
    "",
    "[계산 확정값 — 본문에서 이 값과 다르게 서술하는 것을 금지]",
    ...buildCanonicalNewYearFacts(fortuneData),
    "",
    "[카테고리별 참고 신호 — 아래 6번 항목에서 각 소제목 문단의 출발점으로 삼되, 표현은 자연스럽게 재구성할 것]",
    ...buildDomainSignalLines(fortuneData),
    "",
    ...(section ? [
      `이번에는 완성 상담문 중 "${section.label}" 부분만 씁니다. 아래 항목만 쓰고 다른 항목은 쓰지 마세요.`,
      "이 부분은 더 긴 상담문의 일부로 그대로 이어 붙습니다. 도입 인사나 전체 요약을 새로 만들지 말고 바로 내용부터 쓰세요.",
    ] : [
      "첫 답변은 아래 흐름을 모두 자연스럽게 포함하세요.",
    ]),
    ...(section ? buildSectionOutlineLines(input, section) : outline.map((item) => item.line)),
    "",
    ...(section ? buildSectionLengthLines(section) : [
      "완성 상담문 전체 본문 합계는 공백을 제외하고 15,000자 이상 24,000자 이하로 맞추세요.",
      "권장 분량은 17,000~22,000자이며, 더 중요한 기준은 분량보다 상담 품질과 명리 근거의 밀도입니다.",
      "각 항목마다 15,000자를 쓰지 말고, 전체 상담문이 충분히 깊고 완성된 분량이 되도록 균형 있게 확장하세요.",
      "분량이 부족하면 단순히 문장을 길게 늘이지 말고, 명리 전문가로서 격국과 월령, 용신·기신, 조후, 대운과 세운, 천간·지지 합충, 월운, 현실 처방을 새 파트로 보강하세요.",
    ]),
    "",
    "출생시간이 없거나 계산상 불확실한 부분은 단정하지 말고 입력된 정보 기준으로 본 흐름이라고 자연스럽게 말하세요.",
    "전체 길이는 충분히 깊게 유지하되, 같은 의미의 문장을 반복하지 말고 각 문단마다 다른 근거와 조언을 담으세요.",
  ].join("\n");
}

// FORBIDDEN_RESULT_PATTERN의 모든 갈래를 빠짐없이 덮어야 한다 — 정화 후 다시 test하는 구조라,
// 못 덮는 갈래가 있으면 이슈가 영원히 남아 재생성이 끝나지 않는다.
// 좁은 문맥만 치환하므로 "면역 시스템"·"소화 기능" 같은 정상 표현은 그대로 배달된다.
function cleanForbiddenResult(text) {
  return clean(text)
    .replace(/\bPDF\b/gi, "상담")
    .replace(/챕터/g, "상담 항목")
    .replace(/\bprogress\b/gi, "흐름")
    .replace(/\bjob\b/gi, "상담")
    // "시스템 메시지"는 "프롬프트" 치환보다 먼저 걷어낸다(둘 다 걸리는 문구가 있다).
    .replace(/시스템\s*(?:메시지|지시)/g, "상담 안내")
    .replace(/프롬프트/g, "상담 문장")
    // 자기지칭을 먼저 없애야 아래 "AI+생성" 치환이 남은 문장을 어색하게 만들지 않는다.
    .replace(/(?:저는|제가|나는)\s*(?:AI|인공지능|언어\s*모델)/gi, "저는 상담자")
    .replace(/(?:AI|인공지능)\s*(?:가|이|는|은|를|을|로|로서|에\s*의해)?\s*(생성|작성|제작|답변|응답|만들)/gi, "상담자가 $1");
}

function countConsultationChars(text) {
  return clean(text).replace(/\s+/g, "").length;
}

// 세운·월운 계산값 대비 본문 정합성 검증 (fortuneData가 있을 때만 동작)
function validateFortuneDataConsistency(cleaned, fortuneData, hasCustomQuestion = false) {
  const issues = [];
  if (hasCustomQuestion && !cleaned.includes("질문에 대한 답변")) issues.push("QUESTION_ANSWER_SECTION_MISSING");
  if (!fortuneData || typeof fortuneData !== "object") return issues;

  const missingMonths = Array.from({ length: 12 }, (_, index) => index + 1)
    .filter((month) => !new RegExp(`(?<![0-9])${month}\\s*월`).test(cleaned));
  if (missingMonths.length) issues.push(`MISSING_MONTHS:${missingMonths.join(",")}`);

  const missingCategories = Object.entries(NEW_YEAR_AI_REQUIRED_CATEGORY_LABELS)
    .filter(([, labels]) => !labels.some((label) => cleaned.includes(label)))
    .map(([category]) => category);
  if (missingCategories.length) issues.push(`MISSING_CATEGORIES:${missingCategories.join(",")}`);

  const annualPillar = clean(fortuneData.targetYear?.pillar);
  if (annualPillar && !cleaned.includes(annualPillar)) issues.push("ANNUAL_PILLAR_UNSTATED");

  const monthly = Array.isArray(fortuneData.monthlyFlow) ? fortuneData.monthlyFlow : [];
  if (monthly.length === 12) {
    const cited = monthly.filter((row) => row.pillar && cleaned.includes(row.pillar)).length;
    if (cited < 8) issues.push(`MONTHLY_PILLAR_CITATIONS:${cited}/12`);
  }

  const trigger = fortuneData.advancedSajuSummary?.daewoonSewoon?.annualEventTrigger || null;
  if (trigger) {
    const match = `${trigger.heavenlyStem} ${trigger.earthlyBranch}`.match(/(.)-(.)\s*(천간충|천간합|충|합)/);
    if (match) {
      const [, source, target] = match;
      const pairPattern = new RegExp(`${source}\\s*[-·와과]?\\s*${target}|${target}\\s*[-·와과]?\\s*${source}`);
      if (!pairPattern.test(cleaned)) issues.push("SEWOON_INTERACTION_UNSTATED");
    }
  }
  return issues;
}

function validateConsultationQuality(text, options = {}) {
  const minTotalChars = Number(options.minTotalChars || NEW_YEAR_AI_MIN_TOTAL_CHARS) || NEW_YEAR_AI_MIN_TOTAL_CHARS;
  const maxTotalChars = Number(options.maxTotalChars || NEW_YEAR_AI_MAX_TOTAL_CHARS) || NEW_YEAR_AI_MAX_TOTAL_CHARS;
  const cleaned = cleanForbiddenResult(text);
  const totalChars = countConsultationChars(cleaned);
  const sections = cleaned.split(/\n{2,}/).map((section) => clean(section)).filter((section) => section.length >= 80);
  const missingTopics = Object.entries(NEW_YEAR_AI_REQUIRED_TOPIC_PATTERNS)
    .filter(([, pattern]) => !pattern.test(cleaned))
    .map(([topic]) => topic);
  const issues = [];
  if (totalChars < minTotalChars) issues.push(`MIN_TOTAL_CHARS:${totalChars}/${minTotalChars}`);
  if (totalChars > maxTotalChars) issues.push(`MAX_TOTAL_CHARS:${totalChars}/${maxTotalChars}`);
  if (hasForbiddenResult(cleaned)) issues.push("FORBIDDEN_RESULT_PATTERN");
  if (sections.length < 6) issues.push(`SECTION_COUNT:${sections.length}/6`);
  if (missingTopics.length) issues.push(`MISSING_EXPERT_TOPICS:${missingTopics.join("|")}`);
  issues.push(...validateFortuneDataConsistency(cleaned, options.fortuneData, options.hasCustomQuestion));
  return {
    ok: issues.length === 0,
    text: cleaned,
    totalChars,
    minTotalChars,
    maxTotalChars,
    sectionCount: sections.length,
    missingTopics,
    issues,
  };
}

function describeConsistencyIssuesForRepair(issues = [], fortuneData = null) {
  const lines = [];
  if (issues.includes("QUESTION_ANSWER_SECTION_MISSING")) {
    lines.push("사용자가 직접 남긴 질문에 대한 답변이 빠졌습니다. 본문 맨 앞에 소제목 **질문에 대한 답변**을 굵게 쓰고 그 질문에 직접적이고 구체적으로 답한 뒤, 나머지 내용을 이어가세요.");
  }
  const missingMonths = issues.find((issue) => issue.startsWith("MISSING_MONTHS:"));
  if (missingMonths) {
    lines.push(`빠진 달이 있습니다(${missingMonths.split(":")[1]}월). 1월부터 12월까지 모든 달을 각각 최소 한 문단씩 쓰세요.`);
  }
  // 이제 카테고리는 분야 섹션마다 나뉘어 있으므로, 그 섹션이 실제로 책임지는 소제목만 지목한다
  // (6개 전부를 요구하면 남의 섹션 내용을 중복 생성해 조립본이 어지러워진다).
  const missingCategoryLabels = issues
    .filter((issue) => issue.startsWith("MISSING_CATEGORIES:"))
    .flatMap((issue) => issue.split(":")[1].split(","))
    .map((category) => NEW_YEAR_AI_REQUIRED_CATEGORY_LABELS[category]?.join("·"))
    .filter(Boolean);
  if (missingCategoryLabels.length) {
    const bolded = [...new Set(missingCategoryLabels)].map((label) => `**${label}**`).join(", ");
    lines.push(`이 부분이 책임지는 카테고리 소제목이 빠졌습니다(${bolded}). 월별 흐름과 별개로 각각 최소 한 문단씩 굵게 표시해 보강하세요.`);
  }
  if (issues.includes("ANNUAL_PILLAR_UNSTATED") && fortuneData?.targetYear?.pillar) {
    lines.push(`올해의 세운 간지 "${fortuneData.targetYear.pillar}"를 본문에 직접 언급하며 해석하세요.`);
  }
  if (issues.some((issue) => issue.startsWith("MONTHLY_PILLAR_CITATIONS"))) {
    lines.push("월별 문단마다 그 달의 월주 간지(계산 확정값)를 직접 인용해 근거로 삼으세요.");
  }
  if (issues.includes("SEWOON_INTERACTION_UNSTATED")) {
    const trigger = fortuneData?.advancedSajuSummary?.daewoonSewoon?.annualEventTrigger;
    lines.push(`세운이 원국과 만나는 합·충 근거(${trigger ? `${trigger.pillar} ${trigger.ganji} 기준 ${trigger.heavenlyStem} / ${trigger.earthlyBranch}` : "계산된 상호작용"})를 본문에 직접 인용하세요.`);
  }
  if (lines.length && fortuneData) {
    lines.push("아래 계산 확정값과 다르게 서술하는 것은 금지합니다:");
    lines.push(...buildCanonicalNewYearFacts(fortuneData));
  }
  return lines;
}

// 재생성은 "처음부터 다시"가 아니라 "직전 결과를 살리며 보강"이다 — 살릴 내용을 잃지 않는다.
function buildSectionPrompt(input, fortuneData, section, repairLines = [], previousText = "") {
  const base = buildFirstPrompt(input, fortuneData, section);
  if (!repairLines.length) return base;
  return [
    base,
    "",
    "[이번에 반드시 고칠 점]",
    ...repairLines,
    "",
    "[직전에 쓴 이 부분 — 살릴 내용은 유지하고 위 지적을 반영해 다시 쓰세요]",
    previousText,
  ].join("\n");
}

// 조립본 검증 이슈를 그 이슈를 책임지는 섹션에만 매핑하기 위한 표.
// MISSING_CATEGORIES는 여기 없다 — 카테고리마다 책임 섹션이 달라 아래 표로 낱개 분배한다.
const NEW_YEAR_AI_ISSUE_SECTION_KEY = Object.freeze({
  QUESTION_ANSWER_SECTION_MISSING: "overview",
  ANNUAL_PILLAR_UNSTATED: "overview",
  SEWOON_INTERACTION_UNSTATED: "overview",
  MISSING_MONTHS: "monthly",
  MONTHLY_PILLAR_CITATIONS: "monthly",
});
const NEW_YEAR_AI_TOPIC_SECTION_KEY = Object.freeze({
  structure: "overview",
  usefulGod: "overview",
  climate: "overview",
  luckCycle: "overview",
  interaction: "overview",
  monthly: "monthly",
  practice: "health",
});
// 6개 카테고리 소제목 각각의 책임 섹션. NEW_YEAR_AI_SECTIONS[].categories에서 파생하므로
// 섹션 표를 고치면 여기도 자동으로 따라온다(두 곳이 어긋나면 이슈가 영영 해소되지 않는다).
const NEW_YEAR_AI_CATEGORY_SECTION_KEY = Object.freeze(
  Object.fromEntries(NEW_YEAR_AI_SECTIONS.flatMap((section) => section.categories.map((category) => [category, section.key]))),
);

// 전체를 다시 쓰지 않기 위해, 어떤 섹션이 어떤 이슈를 책임지는지 가려낸다.
function mapIssuesToSections(quality, results) {
  const bySection = new Map();
  const push = (key, issue) => {
    if (!key) return;
    const list = bySection.get(key) || [];
    if (!list.includes(issue)) list.push(issue);
    bySection.set(key, list);
  };

  for (const issue of quality.issues) {
    const code = issue.split(":")[0];
    if (code === "MISSING_EXPERT_TOPICS") {
      for (const topic of issue.split(":")[1].split("|")) push(NEW_YEAR_AI_TOPIC_SECTION_KEY[topic], issue);
      continue;
    }
    // 카테고리 소제목은 분야별로 책임 섹션이 갈린다. 빠진 카테고리만 해당 섹션에 낱개로 보낸다
    // (한 섹션에 몰아주면 그 섹션은 남의 카테고리를 못 쓰고, 이슈가 매 웨이브 재발해 예산을 태운다).
    if (code === "MISSING_CATEGORIES") {
      for (const category of issue.split(":")[1].split(",")) {
        const key = NEW_YEAR_AI_CATEGORY_SECTION_KEY[category];
        if (key) push(key, `MISSING_CATEGORIES:${category}`);
      }
      continue;
    }
    if (code === "FORBIDDEN_RESULT_PATTERN") {
      // 어느 섹션이 실제로 걸렸는지 본다. 전체를 다시 쓰지 않는다.
      for (const row of results) if (hasForbiddenResult(row.text)) push(row.key, issue);
      continue;
    }
    // 분량 합계로는 책임 섹션을 알 수 없다 — 아래에서 섹션 실측으로 판정한다.
    if (code === "MIN_TOTAL_CHARS" || code === "MAX_TOTAL_CHARS" || code === "SECTION_COUNT") continue;
    push(NEW_YEAR_AI_ISSUE_SECTION_KEY[code], issue);
  }

  // 잘림은 합계와 무관하게 항상 고친다 — 중간에 끊긴 문장은 문자·주제 검사를 통과해도 배달 불가다.
  for (const row of results) if (row.truncated) push(row.key, `SECTION_TRUNCATED:${row.key}`);
  // 통째로 비어 있는 섹션은 무조건 다시 시도한다.
  for (const row of results) if (!clean(row.text)) push(row.key, `SECTION_EMPTY:${row.key}`);
  // 분량 미달은 전체 하한을 못 넘겼을 때만, 그때도 자기 하한에 못 미치는 섹션만 대상으로 한다.
  if (quality.issues.some((issue) => issue.startsWith("MIN_TOTAL_CHARS"))) {
    for (const row of results) {
      if (clean(row.text) && countConsultationChars(row.text) < row.section.minChars) push(row.key, `SECTION_MIN_CHARS:${row.key}`);
    }
  }
  return bySection;
}

// 기존 describeConsistencyIssuesForRepair를 필터링된 이슈로 재사용한다(그 함수는 그대로 둔다).
function buildSectionRepairLines(section, issues, fortuneData) {
  const lines = describeConsistencyIssuesForRepair(issues, fortuneData);
  if (issues.some((issue) => issue.startsWith("SECTION_TRUNCATED"))) {
    // 토큰을 올리면 시간 예산이 무너진다 — 늘리지 말고 완결하게 만든다.
    lines.unshift(`직전 답변이 출력 한도에서 끊겼습니다. 같은 내용을 ${section.minChars.toLocaleString("ko-KR")}자 안팎으로 압축하고, 반드시 마지막 문장까지 완결해 끝내세요.`);
  } else if (issues.some((issue) => issue.startsWith("SECTION_MIN_CHARS") || issue.startsWith("SECTION_EMPTY"))) {
    lines.unshift(`이 부분의 분량이 부족합니다. 공백 제외 ${section.minChars.toLocaleString("ko-KR")}자 이상이 되도록 명리 근거를 더 촘촘하게 채우세요.`);
  }
  if (issues.includes("FORBIDDEN_RESULT_PATTERN")) {
    lines.unshift("내부 작업 용어(PDF·챕터·프롬프트)나 '상담자가 생성했다'는 식의 표현을 모두 걷어내고 자연스러운 상담문으로만 쓰세요.");
  }
  const missingTopics = issues.find((issue) => issue.startsWith("MISSING_EXPERT_TOPICS:"));
  if (missingTopics) {
    lines.push(`다음 주제가 본문에 드러나지 않았습니다: ${missingTopics.split(":")[1].split("|").join(", ")}. 해당 근거를 본문에 직접 언급하세요.`);
  }
  return lines;
}

function buildConsultationCompressionPrompt(originalText, minTotalChars = NEW_YEAR_AI_MIN_TOTAL_CHARS, maxTotalChars = NEW_YEAR_AI_MAX_TOTAL_CHARS) {
  return [
    "아래 신년운세 상담문 일부는 분량이 길어졌습니다.",
    `명리 근거와 상담 품질을 유지하면서 공백을 제외하고 ${minTotalChars.toLocaleString("ko-KR")}자 이상 ${maxTotalChars.toLocaleString("ko-KR")}자 이하가 되도록 다시 다듬으세요.`,
    "격국·월령, 용신·기신, 조후, 대운·세운, 천간·지지 합충, 월운, 현실 처방은 모두 남기고, 반복 문장과 장황한 비유만 줄이세요.",
    "상담가가 직접 말하는 자연스러운 문체를 유지하세요.",
    "",
    "[기존 상담문]",
    originalText,
  ].join("\n");
}

function buildMockConsultationText(options = {}) {
  const targetChars = Number(options.targetChars || 17000) || 17000;
  const titles = [
    "새해 전체 운의 결",
    "명식에서 먼저 드러나는 힘",
    "대운과 세운이 만나는 자리",
    "일과 돈의 흐름",
    "관계와 마음의 온도",
    "몸과 생활 리듬",
    "월별로 열리는 문",
    "한 해를 여는 조언",
  ];
  const paragraphs = titles.map((title, index) => [
    `**${title}**`,
    `${index + 1}번째 흐름에서는 새해가 한꺼번에 달려오는 것이 아니라, 이미 오래전부터 쌓여 온 선택의 결이 조금씩 모습을 드러냅니다. 원국 안에서 강하게 빛나는 기운은 올해 더 선명하게 쓰이고, 약하게 남아 있던 자리는 대운과 세운이 닿을 때 생활의 균형을 다시 묻습니다. 이 운은 겁을 주는 징조가 아니라, 어떤 마음가짐으로 시간을 대해야 힘이 덜 새는지를 알려 주는 흐름에 가깝습니다.`,
    `올해는 서둘러 결론을 만들기보다 먼저 내 안의 기준을 정돈할수록 길이 안정됩니다. 일에서는 역할의 이름이 바뀌거나 책임의 폭이 달라질 수 있고, 돈에서는 들어오는 흐름보다 새는 자리를 관리하는 감각이 중요하게 떠오릅니다. 관계에서는 오래 익숙했던 말투와 반응을 그대로 반복하지 않을 때 새로운 신뢰가 열리며, 몸과 마음은 일정한 수면과 식사의 리듬을 되찾을수록 운의 흔들림을 부드럽게 받아 냅니다.`,
  ].join("\n"));
  const expertParts = [
    [
      "**격국과 월령으로 보는 새해의 뼈대**",
      "명식의 격국은 한 해를 해석할 때 가장 먼저 붙잡아야 할 중심입니다. 월령이 강하게 잡아 주는 계절의 힘이 있으면 올해의 선택은 밖으로 넓히는 방식보다 내 구조를 정확히 쓰는 쪽에서 빛납니다. 일간이 감당할 수 있는 힘과 원국이 이미 품고 있는 습관을 함께 보아야 새해의 사건을 단순한 행운이나 불운으로 오해하지 않습니다.",
      "이 파트에서는 원국이 가진 재성, 관성, 인성, 식상의 균형을 먼저 보고, 어느 십신이 올해 실제 생활에서 역할을 얻는지를 살핍니다. 격국이 무너지지 않도록 지켜야 할 기준이 있고, 반대로 오래 묶여 있던 능력이 밖으로 나올 때도 있습니다. 새해는 그 기준을 먼저 세운 뒤에야 움직임이 단단해집니다.",
    ].join("\n"),
    [
      "**용신·기신과 조후가 말하는 선택의 온도**",
      "용신은 올해 붙잡아야 할 길이고, 기신은 힘이 과해질 때 먼저 새는 자리입니다. 조후는 그 길이 너무 차갑거나 뜨겁지 않게 흐르도록 온도를 맞추는 감각입니다. 한난조습의 균형이 맞지 않으면 좋은 기회도 몸과 마음이 따라가지 못해 부담으로 느껴질 수 있습니다.",
      "따라서 올해의 조언은 무조건 앞으로 나가라는 말이 아닙니다. 필요한 때에는 속도를 낮추고, 필요한 때에는 말과 행동을 분명히 하며, 필요한 때에는 쉬어야 운이 오래 갑니다. 용신의 흐름이 살아나는 달에는 제안과 만남을 열고, 기신이 강해지는 달에는 지출과 감정적인 결정을 줄이는 편이 좋습니다.",
    ].join("\n"),
    [
      "**대운과 세운, 천간·지지의 합충이 여는 사건성**",
      "대운은 배경이고 세운은 문을 두드리는 손길입니다. 천간에서 합이 오면 생각과 계약, 말의 방향이 바뀌기 쉽고, 충이 오면 이미 미뤄 둔 문제가 더 이상 미뤄지지 않습니다. 지지의 합충형파해는 생활의 자리, 관계의 거리, 몸의 리듬에서 더 구체적으로 드러납니다.",
      "이 흐름은 무조건 나쁘거나 좋은 것이 아니라, 정체되어 있던 것을 움직이는 힘입니다. 합은 편안하게 묶이지만 때로는 지나친 타협이 되고, 충은 불편하게 흔들지만 때로는 길을 트는 계기가 됩니다. 올해는 움직임이 생겼을 때 즉시 결론을 내리기보다, 그 일이 원국의 어느 자리를 건드리는지 먼저 살피는 태도가 필요합니다.",
    ].join("\n"),
    [
      "**월운과 현실 처방**",
      "월별 흐름은 한 해의 큰 결을 실제 생활로 내려오게 합니다. 1월과 2월에는 기준을 정리하고, 3월과 4월에는 사람과 일의 제안이 늘어날 수 있으며, 5월과 6월에는 무리한 확장보다 점검이 필요합니다. 7월과 8월에는 관계의 말투와 돈의 흐름을 함께 살피고, 9월과 10월에는 오래 준비한 일이 형태를 얻기 쉽습니다. 11월과 12월에는 새해 전체를 정리하며 다음 선택의 씨앗을 남기는 시간이 좋습니다.",
      "현실 처방은 거창하지 않아도 됩니다. 중요한 약속은 기록하고, 큰 지출은 하루 더 늦추며, 관계에서 마음이 급해질 때는 먼저 몸의 피로를 확인하세요. 올해의 운은 성급한 단정이 아니라 꾸준한 정돈 속에서 열립니다.",
    ].join("\n"),
  ];
  let text = [...paragraphs, ...expertParts].join("\n\n");
  const deepen = [
    "이 대목에서 중요한 것은 큰 운이 좋은가 나쁜가를 단정하는 일이 아니라, 나의 명식이 어느 계절의 기운을 만나 편안해지고 어느 자리에서 과해지는지를 섬세하게 살피는 일입니다.",
    "세운이 건드리는 자리가 강하면 바깥의 사건이 먼저 오고, 약하면 마음속 결심이 먼저 일어납니다. 그래서 올해의 선택은 속도보다 순서가 중요합니다.",
    "한 번에 모든 것을 바꾸려 하기보다, 지킬 것은 지키고 비울 것은 비우는 방식으로 움직일 때 새해의 문이 더 안정적으로 열립니다.",
  ];
  let index = 0;
  while (countConsultationChars(text) < targetChars) {
    text += `\n\n${deepen[index % deepen.length]} ${deepen[(index + 1) % deepen.length]} ${deepen[(index + 2) % deepen.length]}`;
    index += 1;
  }
  return text;
}

// 섹션 하나를 생성한다. **절대 throw 하지 않는다** — 실패를 값으로 돌려주어
// 한 섹션의 실패가 나머지 세 섹션까지 죽이지 못하게 한다(master-love-codex의 챕터 폴백과 같은 철학).
async function generateConsultationSection(env, options) {
  const { input, fortuneData, section, cache, timeoutMs, logContext, repairLines = [], previousText = "" } = options;
  const base = { key: section.key, section, provider: "", model: "", truncated: false, isMock: false };
  // 예산이 바닥났으면 호출 자체를 건너뛴다(직전 텍스트가 있으면 그대로 살린다).
  if (!(timeoutMs > 0)) return { ...base, text: previousText, ok: false, reason: "BUDGET_EXHAUSTED" };
  try {
    const ai = await callGeminiText(env, buildSectionPrompt(input, fortuneData, section, repairLines, previousText), {
      systemPrompt: buildSystemPrompt(section),
      taskType: "fortune",
      temperature: repairLines.length ? 0.62 : 0.72,
      maxOutputTokens: NEW_YEAR_AI_SECTION_MAX_OUTPUT_TOKENS,
      timeoutMs,
      // 폴백 허용. 섹션 목표의 40% 미만이면 gemini.js가 실패로 돌려 재시도·환불 경로를 지킨다.
      // 섹션 단위(2,600~5,000자)라 문턱이 1,040~1,360자이고, 실측 폴백 분량(~1,700자)이 이를 넘긴다 —
      // 단일 2만자 호출에서는 넘길 수 없어 폴백이 사실상 무용지물이었다.
      // 🔴 섹션 하한을 4,250자 이상으로 올리면 문턱이 1,700자를 넘어 폴백이 다시 무용지물이 된다.
      fallbackMinChars: Math.round(section.minChars * 0.4),
      cache,
      logContext,
    });
    const provider = clean(ai?.provider || ai?.model || "gemini");
    const isMock = /mock/i.test(provider) || ai?.isMock === true;
    const text = clean(ai?.text);
    if (!ai?.ok || isMock || text.length < NEW_YEAR_AI_SECTION_MIN_LENGTH) {
      return { ...base, text: previousText, ok: false, isMock, reason: clean(ai?.error || ai?.message || "SECTION_FAILED", 120) };
    }
    // ai.truncated(finishReason === "MAX_TOKENS")를 여기서 처음으로 실제로 읽는다.
    return { ...base, text, ok: true, truncated: ai?.truncated === true, provider, model: clean(ai?.model), reason: "" };
  } catch (error) {
    console.error("[new-year-ai] section", section.key, clean(error?.message, 200));
    return { ...base, text: previousText, ok: false, reason: clean(error?.code || error?.message, 120) };
  }
}

// 아웃라인 순서를 유지해 이어 붙인다. 실패한 섹션은 조용히 빠지고 나머지가 그대로 배달된다.
function assembleConsultationSections(results) {
  return results.map((row) => clean(row.text)).filter(Boolean).join("\n\n");
}

// 재생성 결과는 조립본의 이슈 수가 실제로 줄 때만 채택한다 — 재생성이 후퇴가 되는 것을 막는다.
function adoptRepairedSection(results, index, candidate, qualityOptions) {
  const text = clean(candidate.text);
  if (text.length < NEW_YEAR_AI_SECTION_MIN_LENGTH) return results;
  const next = results.map((row, i) => (i === index ? {
    ...row,
    text,
    ok: true,
    truncated: candidate.truncated === true,
    provider: candidate.provider || row.provider,
    model: candidate.model || row.model,
  } : row));
  // 원본이 비어 있었다면 무조건 채택한다 — 결제한 사용자에게는 뭐라도 있는 편이 낫다.
  if (!clean(results[index].text)) return next;
  const before = validateConsultationQuality(assembleConsultationSections(results), qualityOptions);
  const after = validateConsultationQuality(assembleConsultationSections(next), qualityOptions);
  return after.issues.length < before.issues.length ? next : results;
}

// 재생성 뒤에도 잘린 섹션이 남으면, 중간에 끊긴 문장을 배달하지 않도록 완결된 문장까지만 남긴다.
function trimToLastCompleteSentence(text) {
  const source = clean(text);
  const lastStop = Math.max(source.lastIndexOf("."), source.lastIndexOf("!"), source.lastIndexOf("?"), source.lastIndexOf("…"));
  return lastStop >= NEW_YEAR_AI_SECTION_MIN_LENGTH ? source.slice(0, lastStop + 1) : source;
}

async function generateConsultationText(env, input, fortuneData, options = {}) {
  const minTotalChars = Number(options.minTotalChars || NEW_YEAR_AI_MIN_TOTAL_CHARS) || NEW_YEAR_AI_MIN_TOTAL_CHARS;
  const maxTotalChars = Number(options.maxTotalChars || NEW_YEAR_AI_MAX_TOTAL_CHARS) || NEW_YEAR_AI_MAX_TOTAL_CHARS;
  const providerDiagnostics = getProviderDiagnostics(env);
  logNewYearAi("Provider Selected", {
    ...(options.logContext || {}),
    ...providerDiagnostics,
  });
  // 프롬프트가 섹션마다 달라 캐시 키도 섹션별로 갈린다(동시 4콜이 in-flight dedup에 서로 걸리지 않는다).
  // v1 엔트리는 프롬프트 구조가 바뀌어 더 이상 의미가 없다.
  const newYearLlmCache = {
    store: createLlmCacheStore(env),
    deterministic: true,
    ttlSeconds: 30 * 24 * 60 * 60,
    keyExtra: "new-year-ai-v2",
  };
  const qualityOptions = { minTotalChars, maxTotalChars, fortuneData, hasCustomQuestion: options.hasCustomQuestion };

  // 남은 예산 안에서만 기다린다. 0을 돌려주면 호출 자체를 건너뛴다.
  // clampSyncLlmTimeoutMs는 0/음수를 받으면 상한 85s로 되돌아가므로 반드시 그 앞에서 막는다.
  const deadlineAt = Number(options.deadlineAt) || (Date.now() + NEW_YEAR_AI_LLM_BUDGET_MS);
  const sectionTimeoutMs = () => {
    const remaining = deadlineAt - Date.now();
    if (remaining < NEW_YEAR_AI_REPAIR_MIN_REMAINING_MS) return 0;
    return clampSyncLlmTimeoutMs(Math.min(NEW_YEAR_AI_SECTION_TIMEOUT_MS, remaining));
  };

  // 웨이브 1 — 4섹션 동시 생성. 벽시계 = 섹션 시간의 합이 아니라 가장 느린 섹션 하나.
  const wave1TimeoutMs = sectionTimeoutMs();
  let results = await Promise.all(NEW_YEAR_AI_SECTIONS.map((section) => generateConsultationSection(env, {
    input,
    fortuneData,
    section,
    cache: newYearLlmCache,
    timeoutMs: wave1TimeoutMs,
    logContext: options.logContext,
  })));
  let quality = validateConsultationQuality(assembleConsultationSections(results), qualityOptions);

  // 웨이브 2 — 결손 섹션만 다시 쓴다(전체 재생성 금지). 예산이 남아 있을 때만.
  const targets = mapIssuesToSections(quality, results);
  if (targets.size && sectionTimeoutMs() > 0) {
    const wave2TimeoutMs = sectionTimeoutMs();
    const repaired = await Promise.all([...targets.entries()].map(([key, issues]) => {
      const row = results.find((item) => item.key === key);
      return generateConsultationSection(env, {
        input,
        fortuneData,
        section: row.section,
        cache: newYearLlmCache,
        timeoutMs: wave2TimeoutMs,
        logContext: options.logContext,
        repairLines: buildSectionRepairLines(row.section, issues, fortuneData),
        previousText: row.text,
      });
    }));
    for (const candidate of repaired) {
      if (!candidate.ok) continue;
      results = adoptRepairedSection(results, results.findIndex((item) => item.key === candidate.key), candidate, qualityOptions);
    }
    quality = validateConsultationQuality(assembleConsultationSections(results), qualityOptions);
  }

  // 잘린 채 남은 섹션은 마지막 완결 문장까지만 남겨 배달한다.
  if (results.some((row) => row.truncated)) {
    logNewYearAi("Error", {
      ...(options.logContext || {}),
      truncatedSections: results.filter((row) => row.truncated).map((row) => row.key).join(","),
    }, "warn");
    results = results.map((row) => (row.truncated ? { ...row, text: trimToLastCompleteSentence(row.text) } : row));
    quality = validateConsultationQuality(assembleConsultationSections(results), qualityOptions);
  }

  // 상한 초과 — 전체가 아니라 가장 긴 섹션 하나만 압축한다(전체 재작성은 예산상 불가능하다).
  if (quality.issues.some((issue) => issue.startsWith("MAX_TOTAL_CHARS")) && sectionTimeoutMs() > 0) {
    const index = results.reduce((best, row, i) => (countConsultationChars(row.text) > countConsultationChars(results[best].text) ? i : best), 0);
    const longest = results[index];
    const overflow = quality.totalChars - maxTotalChars;
    const targetMaxChars = Math.max(longest.section.minChars, countConsultationChars(longest.text) - overflow - 200);
    const compressed = await callGeminiText(env, buildConsultationCompressionPrompt(longest.text, longest.section.minChars, targetMaxChars), {
      systemPrompt: buildSystemPrompt(longest.section),
      taskType: "fortune",
      temperature: 0.52,
      maxOutputTokens: NEW_YEAR_AI_SECTION_MAX_OUTPUT_TOKENS,
      timeoutMs: sectionTimeoutMs(),
      fallbackMinChars: Math.round(longest.section.minChars * 0.4),
      cache: newYearLlmCache,
    });
    const compressedText = clean(compressed?.text);
    if (compressed?.ok && compressed?.truncated !== true && !/mock/i.test(clean(compressed?.provider))
      && compressedText.length >= NEW_YEAR_AI_SECTION_MIN_LENGTH && compressedText.length < clean(longest.text).length) {
      results = results.map((row, i) => (i === index ? { ...row, text: compressedText } : row));
      quality = validateConsultationQuality(assembleConsultationSections(results), qualityOptions);
    }
  }

  const usable = results.filter((row) => clean(row.text));
  const sectionStatus = results.map((row) => ({
    key: row.key,
    ok: row.ok === true,
    chars: countConsultationChars(row.text),
    truncated: row.truncated === true,
  }));

  // 경량 보장 계약: 살아남은 섹션이 하한 이상이고 렌더 가능하면 버리지 않고 degrade로 전달한다.
  // (기존 커밋/과금 경로가 그대로 결과를 저장·과금하므로 결제 후 무결과를 막는다.)
  // 그 미만이면 실패로 돌려 503 + 이용권/결제 복원 경로를 그대로 탄다 — 반쪽 결과에 과금하지 않는다.
  if (usable.length < NEW_YEAR_AI_MIN_USABLE_SECTIONS || !hasRenderableLlmText(quality.text, { minChars: 400 })) {
    const isMock = results.some((row) => row.isMock);
    const error = new Error(isMock ? "Mock provider blocked." : "신년운세 상담문을 생성하지 못했습니다.");
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_GENERATION_FAILED";
    error.quality = quality;
    error.providerDiagnostics = providerDiagnostics;
    throw error;
  }

  return {
    text: quality.text,
    // 분야별 본문. 조립본(text)은 PDF·구버전 호환을 위해 그대로 두고, 클라이언트는 이 배열이 있으면
    // 분야 카드를 마커 파싱 없이 곧바로 그린다. 조립본과 달리 금지어 정화(cleanForbiddenResult)를
    // 여기서도 한 번 통과시켜야 배달 본문과 카드 본문이 어긋나지 않는다.
    sections: results
      .map((row) => ({ key: row.key, label: row.section.label, text: cleanForbiddenResult(row.text) }))
      .filter((row) => row.text),
    provider: clean(results.find((row) => row.provider)?.provider || "gemini"),
    model: clean(results.find((row) => row.model)?.model),
    quality,
    sectionStatus,
    ...(quality.ok && usable.length === NEW_YEAR_AI_SECTIONS.length ? {} : { degraded: true }),
  };
}

async function applyUsageOnce({ userId, sessionId, accessType }) {
  const existing = await NewYearAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;

  await NewYearAiConsultation.updateOne(
    { id: sessionId, usageAppliedAt: null },
    { $set: { usageAppliedAt: new Date() } },
  );
  return true;
}

function buildBasicSajuProfile(doc = {}) {
  const fortuneData = doc?.llmMeta?.fortuneData && typeof doc.llmMeta.fortuneData === "object" ? doc.llmMeta.fortuneData : null;
  const saju = fortuneData?.saju && typeof fortuneData.saju === "object" ? fortuneData.saju : {};
  if (!clean(saju.yearPillar || saju.monthPillar || saju.dayPillar || saju.hourPillar)) return null;
  const advanced = fortuneData?.advancedSajuSummary && typeof fortuneData.advancedSajuSummary === "object" ? fortuneData.advancedSajuSummary : {};
  const targetYear = fortuneData?.targetYear && typeof fortuneData.targetYear === "object" ? fortuneData.targetYear : {};
  const birthInfo = doc?.birthInfo && typeof doc.birthInfo === "object" ? doc.birthInfo : {};
  const domainSignals = advanced?.domainSignals && typeof advanced.domainSignals === "object" ? advanced.domainSignals : {};
  return {
    birthInfo: {
      name: clean(birthInfo.name),
      gender: clean(birthInfo.gender),
      birthDate: clean(birthInfo.birthDate),
      birthTime: clean(birthInfo.birthTime || "모름"),
      calendarType: clean(birthInfo.calendarType),
    },
    pillars: [
      { label: "년주", value: clean(saju.yearPillar) },
      { label: "월주", value: clean(saju.monthPillar) },
      { label: "일주", value: clean(saju.dayPillar) },
      { label: "시주", value: clean(saju.hourPillar || "미산출") },
    ],
    dayMaster: clean(saju.dayMaster),
    strength: clean(saju.strength),
    dominantElement: clean(saju.dominantElement),
    balancingElement: clean(saju.balancingElement),
    targetYear: {
      year: Number(targetYear.year || doc.year || 0) || null,
      pillar: clean(targetYear.pillar),
      tenGod: clean(targetYear.tenGodToDayMaster),
      relationToDayBranch: clean(targetYear.relationToDayBranch),
    },
    gyeokguk: clean(advanced?.gyeokguk?.finalGyeokguk || advanced?.gyeokguk?.reading),
    yongshin: {
      core: clean(advanced?.yongshin?.coreYongshinKo),
      heesin: clean(advanced?.yongshin?.heesinKo),
      gisin: clean(advanced?.yongshin?.gisinKo),
      reading: clean(advanced?.yongshin?.reading),
    },
    johu: {
      urgentElement: clean(advanced?.johu?.urgentElementKo),
      reading: clean(advanced?.johu?.reading || advanced?.johu?.climate),
    },
    daewoonSewoon: clean(advanced?.daewoonSewoon?.integratedReading),
    monthlyHighlights: {
      opportunity: Array.isArray(domainSignals.opportunityMonths) ? domainSignals.opportunityMonths.map((item) => clean(item)).filter(Boolean).slice(0, 4) : [],
      caution: Array.isArray(domainSignals.cautionMonths) ? domainSignals.cautionMonths.map((item) => clean(item)).filter(Boolean).slice(0, 4) : [],
    },
  };
}

function publicMonthlyDomains(domains) {
  if (!domains || typeof domains !== "object") return null;
  const result = {};
  for (const key of MONTHLY_DOMAIN_KEYS) {
    const signal = domains[key];
    if (!signal || typeof signal !== "object") continue;
    const level = clean(signal.level);
    const basis = clean(signal.basis);
    if (level || basis) result[key] = { level, basis };
  }
  return Object.keys(result).length ? result : null;
}

function publicMonthlyFlow(doc) {
  const fortuneData = doc?.llmMeta?.fortuneData && typeof doc.llmMeta.fortuneData === "object" ? doc.llmMeta.fortuneData : null;
  const rows = Array.isArray(fortuneData?.monthlyFlow) ? fortuneData.monthlyFlow : [];
  return rows.map((row) => ({
    month: Number(row.month) || 0,
    pillar: clean(row.pillar),
    element: clean(row.element),
    tenGod: clean(row.tenGod),
    domain: clean(row.domain),
    relationToDayBranch: clean(row.relationToDayBranch),
    timing: clean(row.timing),
    domains: publicMonthlyDomains(row.domains),
  })).filter((row) => row.month >= 1 && row.month <= 12);
}

// 분야별 본문. 이 필드가 없는 구버전 세션(2026-08 이전 상담)은 빈 배열을 돌려주고,
// 클라이언트가 조립본을 소제목 마커로 다시 가르는 폴백 경로를 탄다.
function publicSections(doc) {
  const rows = Array.isArray(doc?.llmMeta?.sections) ? doc.llmMeta.sections : [];
  return rows
    .map((row) => ({ key: clean(row?.key, 40), label: clean(row?.label, 80), text: clean(row?.text) }))
    .filter((row) => row.key && row.text);
}

function publicSession(doc) {
  const fortuneData = doc?.llmMeta?.fortuneData && typeof doc.llmMeta.fortuneData === "object" ? doc.llmMeta.fortuneData : null;
  const target = fortuneData?.targetYear && typeof fortuneData.targetYear === "object" ? fortuneData.targetYear : {};
  return {
    ok: true,
    sessionId: clean(doc.id),
    accessType: clean(doc.accessType),
    status: clean(doc.status),
    sajuProfile: buildBasicSajuProfile(doc),
    targetYear: {
      year: Number(target.year || doc.year || 0) || null,
      pillar: clean(target.pillar),
      stem: clean(target.stem),
      branch: clean(target.branch),
      stemElement: clean(target.stemElement),
      tenGod: clean(target.tenGodToDayMaster),
    },
    monthlyFlow: publicMonthlyFlow(doc),
    sections: publicSections(doc),
    messages: Array.isArray(doc.messages)
      ? doc.messages.map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      }))
      : [],
  };
}

function cloneBillingHeaders(request) {
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  headers.delete("content-length");
  return headers;
}

async function callDeferredUsageRoute({ request, env, auth, path, idempotencyKey, sessionId, code = "", message = "" }) {
  const url = new URL(request.url);
  url.pathname = `/api/billing/coin-gate/deferred/${path}`;
  url.search = "";
  const response = await handleBillingRoutes(new Request(url.toString(), {
    method: "POST",
    headers: cloneBillingHeaders(request),
    body: JSON.stringify({
      featureKey: FEATURE_KEY,
      serviceType: FEATURE_KEY,
      consultationType: "newYearFortune",
      reason: ORDER_NAME,
      requestId: idempotencyKey,
      idempotencyKey,
      sessionId,
      resultId: sessionId,
      code,
      message,
    }),
  }), env, { preverifiedAuth: auth });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    const error = new Error(clean(payload?.message || payload?.error?.message || `Deferred usage ${path} failed.`, 500));
    error.code = clean(payload?.error?.code || `DEFERRED_USAGE_${path.toUpperCase()}_FAILED`, 80);
    throw error;
  }
  return payload?.data || payload;
}

async function handleEnsureAccess(request, env) {
  const route = "/api/new-year-ai/ensure-access";
  logNewYearAi("Prepare Start", safeLogPayload({ route, env }));
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logNewYearAi("Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logNewYearAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, validation: "failed", env, error: new Error(normalized.message) }), "warn");
    return invalidInput(normalized.message);
  }
  logNewYearAi("Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  const pricing = getPricing();
  logNewYearAi("Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "checking", env }));
  if (isAdmin(auth)) {
    logNewYearAi("Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "admin", env }));
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
  // 풀 초기화(MongoPoolClearedError) 순간에도 접근 판정 read가 1회 실패로 죽지 않도록 재시도.
  const user = await withMongoRetry(env, () => loadBillingUser(auth.userId));
  if (!user) return loginRequired();

  const access = await withMongoRetry(env, () => resolveServerAccess({ env, auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash, body }));
  if (access.ok) {
    logNewYearAi("Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
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
  if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);

  logNewYearAi("Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "payment_required", env }));
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
    return {
      ok: true,
      accessType: clean(payload.accessType),
      paymentId: clean(payload.paymentId, 160),
      billingRequestId: clean(payload.billingRequestId, 180),
      usageAlreadyApplied: payload.usageAlreadyApplied === true,
      deferredUsage: payload.deferredUsage === true,
    };
  }

  const user = await withMongoRetry(env, () => loadBillingUser(auth.userId));
  if (!user && !isAdmin(auth)) return { ok: false, reason: "LOGIN_REQUIRED" };
  const billingAccess = await withMongoRetry(env, () => resolveBillingGateAccess({ env, auth, user, body, pricing, idempotencyKey }));
  if (billingAccess?.ok) {
    return {
      ...billingAccess,
      usageAlreadyApplied: billingAccess.usageAlreadyApplied === true,
    };
  }
  return withMongoRetry(env, () => resolveServerAccess({ env, auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash, body }));
}

async function handleStart(request, env, ctx) {
  // LLM 예산의 기산점. 인증·결제·DB 기록에 쓴 시간만큼 생성에 쓸 수 있는 시간이 줄어든다.
  const startedAt = Date.now();
  const route = "/api/new-year-ai/start";
  logNewYearAi("Generate Start", safeLogPayload({ route, env }));
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logNewYearAi("Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logNewYearAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, validation: "failed", env, error: new Error(normalized.message) }), "warn");
    return invalidInput(normalized.message);
  }
  logNewYearAi("Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  // billing 프로젝션으로 한 번에 읽어 두면, 아래 callDeferredUsageRoute 의 내부 coin-gate 위임이
  // users 를 다시 읽지 않고 이 인증 결과를 그대로 재사용한다(preverifiedAuth).
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true, userProjection: BILLING_SNAPSHOT_USER_PROJECTION });
  if (!auth) return loginRequired();

  await connectDb(env);
  const pricing = getPricing();
  logNewYearAi("Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "checking", env }));
  const access = await resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey });
  if (!access.ok) {
    if (access.reason === "LOGIN_REQUIRED") return loginRequired();
    if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
    return paymentVerifyFailed();
  }
  logNewYearAi("Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
  logNewYearAi("Payment Guard Passed", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));

  let fortuneData = null;
  try {
    logNewYearAi("Fortune Data Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
    fortuneData = calculateNewYearFortuneData(normalized.input);
    logNewYearAi("Fortune Data Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
  } catch (error) {
    logNewYearAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "fortune_data_failed", access: access.accessType, env, error }), "error");
    if (access.deferredUsage) {
      await callDeferredUsageRoute({
        request,
        env,
        auth,
        path: "cancel",
        idempotencyKey,
        sessionId: idempotencyKey,
        code: clean(error?.code || "FORTUNE_DATA_FAILED", 80),
        message: clean(error?.message || error, 500),
      }).catch((restoreError) => {
        logNewYearAi("Refund Or Restore", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error: restoreError }), "warn");
      });
    }
    return serverError(SERVER_ERROR_MESSAGE, 500);
  }

  const existing = await withMongoRetry(env, () => NewYearAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean());
  if (existing && clean(existing.inputHash) !== normalized.inputHash) {
    return invalidInput("같은 요청 키로 다른 상담 정보를 사용할 수 없습니다.", 409);
  }
  if (existing?.status === "completed") return json(publicSession(existing));
  // 생성은 이 요청 안에서 끝난다(엣지가 100s에 요청을 끊는다). 그보다 오래 generating인 문서는
  // 진행 중이 아니라 엣지에 잘린 좀비이므로, 여기서 202를 돌려주면 아무도 생성하지 않는 채로
  // 클라 폴링만 헛돌고 재시도까지 막힌다. 창을 엣지 컷 + 여유로 좁혀 재시도가 실제로 다시 생성하게 한다.
  if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < NEW_YEAR_AI_GENERATING_FRESH_MS) {
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

  // 결제/이용권 확인·"생성중" 문서 기록이 끝난 이 시점에 즉시 202를 돌려주고, LLM 생성은 백그라운드(waitUntil)에서 완주한다.
  // 클라는 /result 폴링으로 수렴한다(ziwei·찻집과 동일). 실패 시 환불·generation_failed 기록은 아래 catch가 백그라운드에서도 수행한다.
  const runGeneration = async () => {
  try {
    const generated = await generateConsultationText(env, normalized.input, fortuneData, {
      minTotalChars: NEW_YEAR_AI_MIN_TOTAL_CHARS,
      maxTotalChars: NEW_YEAR_AI_MAX_TOTAL_CHARS,
      hasCustomQuestion: normalized.input.hasCustomQuestion,
      deadlineAt: startedAt + NEW_YEAR_AI_LLM_BUDGET_MS,
      logContext: safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }),
    });
    if (access.deferredUsage) {
      await callDeferredUsageRoute({ request, env, auth, path: "apply", idempotencyKey, sessionId });
    } else if (!access.usageAlreadyApplied && access.accessType === "pass") {
      await applyUsageOnce({ userId: auth.userId, sessionId, accessType: access.accessType, pricing });
    } else if (!access.usageAlreadyApplied && access.accessType === "subscription") {
      const gateError = new Error("monthly credit must be confirmed by common billing gate");
      gateError.code = "MONTHLY_CREDIT_GATE_REQUIRED";
      throw gateError;
    } else {
      await NewYearAiConsultation.updateOne(
        { id: sessionId, usageAppliedAt: null },
        { $set: { usageAppliedAt: new Date() } },
      );
    }
    const completed = await NewYearAiConsultation.findOneAndUpdate(
      { id: sessionId },
      {
        $set: {
          status: "completed",
          messages: [
            { role: "user", content: normalized.input.topic, createdAt: now },
            { role: "assistant", content: generated.text, createdAt: new Date() },
          ],
          usageAppliedAt: new Date(),
          llmMeta: {
            provider: generated.provider,
            model: generated.model,
            completedAt: new Date().toISOString(),
            deferredUsageApplied: access.deferredUsage === true,
            billingRequestId: clean(access.billingRequestId || idempotencyKey, 180),
            fortuneData,
            sections: generated.sections,
            quality: generated.quality,
          },
          generationError: null,
        },
      },
      { new: true },
    ).lean();
    logNewYearAi("Generate Success", {
      ...safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }),
      provider: generated.provider,
      model: generated.model,
      totalChars: generated.quality?.totalChars,
      qualityStatus: generated.quality?.ok ? "passed" : "unknown",
      // 섹션별 실측 분량 — 섹션 minChars 캘리브레이션과 이음매 진단의 근거다.
      sections: generated.sectionStatus,
      elapsedMs: Date.now() - startedAt,
      degraded: generated.degraded === true,
    });
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
    logNewYearAi("Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error }), "error");
    if (access.deferredUsage) {
      await callDeferredUsageRoute({
        request,
        env,
        auth,
        path: "cancel",
        idempotencyKey,
        sessionId,
        code: clean(error?.code || "LLM_GENERATION_FAILED", 80),
        message: clean(error?.message || error, 500),
      }).catch((restoreError) => {
        logNewYearAi("Refund Or Restore", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error: restoreError }), "warn");
      });
    }
    logNewYearAi("Refund Or Restore", {
      ...safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error }),
      restoreMode: access.deferredUsage ? "deferred_usage_cancelled_or_pending" : "same_request_id_retry_preserves_billing_evidence",
    }, "warn");
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
  };

  // 동기 생성: 요청 안에서 완결해 완료 결과를 바로 반환한다. waitUntil 백그라운드+/result 폴링은 공유 DB 연결을
  // 여러 요청이 재사용하게 만들어 Cloudflare Workers 요청 간 I/O 격리로 결과가 고착되던 문제가 있어 쓰지 않는다(네오와 동일).
  return await runGeneration();
}

async function handleMessage(request, env) {
  const route = "/api/new-year-ai/message";
  const body = await readJson(request);
  const requestId = clean(body?.requestId || body?.idempotencyKey || body?.sessionId || body?.consultationId, 180);
  logNewYearAi("Error", {
    ...safeLogPayload({ route, requestId, body, env }),
    disabledReason: "follow_up_llm_disabled",
  }, "warn");
  return json({
    ok: false,
    reason: "FOLLOW_UP_DISABLED",
    message: "신년운세 전문가 상담은 처음 입력한 흐름을 기준으로 한 번 생성됩니다. 더 깊게 보고 싶은 내용은 상담 시작 전에 입력해 주세요.",
  }, { status: 410 });
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
  if (!auth?.userId) {
    return json({ ok: false, reason: "LOGIN_REQUIRED", message: LOGIN_REQUIRED_MESSAGE }, { status: 401 });
  }
  const url = new URL(request.url);
  const sessionId = clean(url.searchParams.get("sessionId") || url.searchParams.get("id"), 180);

  await connectDb(env);
  if (!sessionId) {
    const rows = await NewYearAiConsultation.find({ userId: clean(auth.userId), status: "completed" })
      // createdAt 정렬은 기존 {userId,createdAt:-1} 인덱스를 그대로 탄다. updatedAt 에는 인덱스가
      // 없어 해당 사용자의 문서를 전부 FETCH 한 뒤 메모리 정렬하므로 아래 select 가 무력화된다.
      .sort({ createdAt: -1 })
      .limit(10)
      .select("id year birthInfo llmMeta.fortuneData.targetYear createdAt updatedAt")
      .lean();
    return json({
      ok: true,
      sessions: rows.map((row) => ({
        sessionId: clean(row.id),
        year: Number(row.llmMeta?.fortuneData?.targetYear?.year || row.year || 0) || null,
        pillar: clean(row.llmMeta?.fortuneData?.targetYear?.pillar),
        name: clean(row.birthInfo?.name, 80),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    });
  }

  const doc = await NewYearAiConsultation.findOne({
    userId: clean(auth.userId),
    id: sessionId,
  }).lean();
  if (!doc) return notFound();
  // 생성 중이면 202로 알려 클라이언트 폴링이 수렴하게 한다(start의 202 바디와 동일 형태).
  if (doc.status === "generating") {
    // start와 같은 창을 쓴다. 이보다 오래된 generating은 진행 중이 아니라 엣지에 잘린 세션이므로,
    // 폴링을 5분 내내 붙잡아 두지 말고 재시도할 수 있는 실패로 종단시킨다.
    if (Date.now() - new Date(doc.updatedAt || doc.createdAt).getTime() >= NEW_YEAR_AI_GENERATING_FRESH_MS) {
      return json({ ok: false, reason: "GENERATION_FAILED", message: LLM_ERROR_MESSAGE }, { status: 409 });
    }
    return json(
      { ok: true, sessionId: doc.id, status: "generating", message: "올해의 흐름을 읽고 있습니다" },
      { status: 202, headers: { "Retry-After": "3" } },
    );
  }
  if (doc.status !== "completed") {
    return json({ ok: false, reason: "GENERATION_FAILED", message: LLM_ERROR_MESSAGE }, { status: 409 });
  }
  return json(publicSession(doc));
}

export async function handleNewYearAiRoutes(request, env = {}, ctx) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/new-year-ai");

  try {
    if (method === "POST" && path === "/ensure-access") return await handleEnsureAccess(request, env);
    if (method === "POST" && path === "/start") return await handleStart(request, env, ctx);
    if (method === "POST" && path === "/message") return await handleMessage(request, env);
    if (method === "GET" && path === "/result") return await handleResult(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[new-year-ai]", clean(error?.code || error?.message || error, 500));
    logNewYearAi("Error", safeLogPayload({ route: "/api/new-year-ai", env, error }), "error");
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

export const __newYearAiTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  normalizeConsultationInput,
  calculateNewYearFortuneData,
  buildFirstPrompt,
  buildSystemPrompt,
  buildCanonicalNewYearFacts,
  cleanForbiddenResult,
  countConsultationChars,
  validateConsultationQuality,
  validateFortuneDataConsistency,
  buildMockConsultationText,
  buildBasicSajuProfile,
  publicSession,
  // 분야별 5섹션 병렬 생성의 조립·라우팅 로직 — LLM 없이 검증할 수 있게 노출한다.
  NEW_YEAR_AI_SECTIONS,
  NEW_YEAR_AI_CATEGORY_SECTION_KEY,
  assembleConsultationSections,
  mapIssuesToSections,
  adoptRepairedSection,
  trimToLastCompleteSentence,
  generateConsultationText,
};
