import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, isTransientMongoError, mongoose, withMongoRetry } from "../lib/db.js";
import { MonthlyCreditLedger, NewYearAiConsultation, PaidExecutionRecord, Payment, PointHistory, User } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canUseByPass, normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";
import { callGeminiText } from "../lib/gemini.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { handleBillingRoutes } from "./billing.js";
import { Lunar, Solar } from "lunar-javascript";

const SERVICE_KEY = "new-year-ai";
const FEATURE_KEY = "new-year-ai-consultation";
const ACCESS_TOKEN_TYPE = "new-year-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "신년운세 AI 상담";
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "AI 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const NEW_YEAR_AI_MIN_TOTAL_CHARS = 10000;
const NEW_YEAR_AI_MAX_TOTAL_CHARS = 20000;
// 총 10,000~20,000자(권장 12,000~18,000자) 요구(한국어 1자≈1~1.5토큰) — 구 상한 16000은
// 권장 분량대에서 상시 잘려 확장 재시도/degraded로 빠졌다.
const NEW_YEAR_AI_MAX_OUTPUT_TOKENS = 30000;
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

const FORBIDDEN_RESULT_PATTERN = /\bPDF\b|챕터|\bprogress\b|\bjob\b|프롬프트|시스템|\bAI\b|기능/i;
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
    return Lunar.fromYmdHms(dateParts.year, dateParts.month, dateParts.day, birthTime.hour, birthTime.minute, 0);
  }
  return Solar.fromYmdHms(dateParts.year, dateParts.month, dateParts.day, birthTime.hour, birthTime.minute, 0).getLunar();
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
  const yearPillar = toKoreanGanzi(lunar.getYearInGanZhi());
  const monthPillar = toKoreanGanzi(lunar.getMonthInGanZhi());
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
  const targetLunar = Solar.fromYmdHms(targetYear, 7, 1, 12, 0, 0).getLunar();
  const targetPillar = toKoreanGanzi(targetLunar.getYearInGanZhi());
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
    const monthPillar = toKoreanGanzi(Solar.fromYmdHms(targetYear, month, 15, 12, 0, 0).getLunar().getMonthInGanZhi());
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

  if (/usage[-_]pass/.test(signal)) return null;

  if (signal.includes("pass")) {
    const pass = normalizeHoneyPassEntitlement(user || {});
    if (canUseByPass(pass, pricing.coinPrice)) {
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

async function resolveServerAccess({ auth, user, pricing, idempotencyKey = "", inputHash = "", body = {} }) {
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

  const billing = await resolveBillingGateAccess({ auth, user, body, pricing, idempotencyKey });
  if (billing?.ok) {
    return {
      ...billing,
      usageAlreadyApplied: billing.usageAlreadyApplied === true,
    };
  }

  const pass = normalizeHoneyPassEntitlement(user || {});
  if (canUseByPass(pass, pricing.coinPrice)) {
    return { ok: true, accessType: "pass", paymentId: "", usageAlreadyApplied: false };
  }

  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

function buildSystemPrompt() {
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
    "13. 완성 상담문 전체 본문은 공백을 제외하고 10,000자 이상 20,000자 이하로 씁니다. 권장 분량은 12,000~18,000자이며, 항목마다 10,000자를 쓰라는 뜻이 아닙니다.",
    "14. 분량이 부족할 때는 같은 말을 늘리지 말고, 명리 전문가로서 격국·월령, 용신·기신, 조후, 대운·세운, 천간·지지 합충, 월운, 현실 처방 파트를 새로 보강합니다.",
    "15. 문단 사이는 빈 줄로 구분하고, 핵심 문구는 **굵게** 표시합니다. 필요할 때만 '-' 목록을 쓰고, 그 외 마크다운(제목 #, 코드블록, 표)은 쓰지 않습니다.",
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

function buildFirstPrompt(input, fortuneData) {
  const birth = input.birthInfo || {};
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
    ...(input.hasCustomQuestion ? [
      "[사용자가 직접 남긴 질문 — 최우선으로 답할 것]",
      `"${input.question}"`,
      "이 질문은 사용자가 가장 궁금해하는 개인화된 질문입니다. 아래 답변 맨 앞에 반드시 소제목 **질문에 대한 답변**을 굵게 쓰고, 그 아래에 이 질문에 대한 직접적이고 구체적인 결론을 먼저 씁니다. 범용적인 총론과 겹치지 않게, 이 질문의 단어와 맥락에 특화된 근거와 조언을 담으세요.",
      "",
    ] : []),
    "[계산된 사주와 세운 데이터]",
    JSON.stringify(fortuneData, null, 2),
    "",
    "[계산 확정값 — 본문에서 이 값과 다르게 서술하는 것을 금지]",
    ...buildCanonicalNewYearFacts(fortuneData),
    "",
    "[카테고리별 참고 신호 — 아래 6번 항목에서 각 소제목 문단의 출발점으로 삼되, 표현은 자연스럽게 재구성할 것]",
    ...buildDomainSignalLines(fortuneData),
    "",
    "첫 답변은 아래 흐름을 모두 자연스럽게 포함하세요.",
    ...(input.hasCustomQuestion ? [
      "0. 다른 무엇보다 먼저, 소제목 **질문에 대한 답변**을 굵게 쓰고 사용자가 직접 남긴 질문에 직접적이고 구체적으로 답합니다. 이 답변을 마친 뒤에 아래 1번부터 이어갑니다.",
    ] : []),
    "1. 타고난 성향 총론을 가장 먼저 씁니다. 일간·월령·격국·오행 분포를 근거로 이 사람이 타고난 기질과 성향이 어떤지 전반적으로 짚어, 상담자가 '나를 정확히 봤다'고 느끼도록 신뢰를 먼저 세웁니다.",
    "2. 새해 전체 운의 핵심 결론을 말합니다.",
    "3. 원국의 격국, 용신·기신, 조후가 올해 어떤 방식으로 쓰이는지 쉽게 풀어냅니다.",
    "4. 대운의 배경 위에 세운이 어떤 사건성과 선택 압력을 일으키는지 짚습니다. 이때 세운 간지와, 세운이 원국의 어느 기둥과 합·충하는지를 본문에 직접 인용해 근거로 삼습니다.",
    "5. 사용자가 선택한 집중 상담 분야를 가장 깊게 다룹니다.",
    "6. 월별 흐름과는 별개로, 다음 6개 소제목을 **굵게** 표시해 각각 최소 한 문단 이상 씁니다(순서는 자유롭게 정하되 6개 모두 반드시 포함): **연애·재회**, **재물·수입**, **직업·이직**, **건강·멘탈**, **가족·관계**, **학업·성장**. 집중 분야로 고른 항목을 가장 깊게 쓰고 나머지도 위 카테고리별 참고 신호를 근거로 자연스럽게 채웁니다.",
    "7. 월별 흐름에서는 1월부터 12월까지 열두 달을 하나도 빠뜨리지 않고 각각 최소 한 문단씩 씁니다. 각 달 문단은 반드시 `**{월}월 · {그 달의 월주 간지} · {4~8자 핵심 키워드}**` 형식의 소제목으로 시작하세요(예: **3월 · 병인 · 관계 재정비**). 키워드는 그 달의 조언을 한눈에 요약하는 짧은 표현이어야 합니다. 이어지는 본문에서는 위 월별 확정 스펙의 월주 간지와 십신을 직접 언급하고, 판정(기회/주의/정비)에 맞는 조언을 이웃한 달과 겹치지 않게 다르게 씁니다. 또한 각 달의 도메인 강약(총운·재물·애정·직업·건강) 중 그 달에 두드러진 축(강하거나 약한 것)을 근거로 삼아, 해당 도메인에 대한 구체적인 실천 조언을 문단 안에 자연스럽게 녹여 쓰세요. 다섯 도메인을 매달 기계적으로 나열하지 말고, 그 달에 의미 있는 축을 골라 이야기하듯 풀어냅니다.",
    "8. 조심해야 할 패턴은 겁주지 말고, 피해야 할 선택과 회복 방법을 함께 말합니다.",
    "9. 마지막에는 사용자가 올해 붙잡을 수 있는 현실 조언과 새해를 여는 한 줄을 남깁니다.",
    "",
    "완성 상담문 전체 본문 합계는 공백을 제외하고 10,000자 이상 20,000자 이하로 맞추세요.",
    "권장 분량은 12,000~18,000자이며, 더 중요한 기준은 분량보다 상담 품질과 명리 근거의 밀도입니다.",
    "각 항목마다 10,000자를 쓰지 말고, 전체 상담문이 충분히 깊고 완성된 분량이 되도록 균형 있게 확장하세요.",
    "분량이 부족하면 단순히 문장을 길게 늘이지 말고, 명리 전문가로서 격국과 월령, 용신·기신, 조후, 대운과 세운, 천간·지지 합충, 월운, 현실 처방을 새 파트로 보강하세요.",
    "",
    "출생시간이 없거나 계산상 불확실한 부분은 단정하지 말고 입력된 정보 기준으로 본 흐름이라고 자연스럽게 말하세요.",
    "전체 길이는 충분히 깊게 유지하되, 같은 의미의 문장을 반복하지 말고 각 문단마다 다른 근거와 조언을 담으세요.",
  ].join("\n");
}

function cleanForbiddenResult(text) {
  return clean(text)
    .replace(/\bPDF\b/gi, "상담")
    .replace(/챕터/g, "상담 항목")
    .replace(/\bprogress\b/gi, "흐름")
    .replace(/\bjob\b/gi, "상담")
    .replace(/프롬프트/g, "상담 문장")
    .replace(/시스템/g, "상담 흐름")
    .replace(/\bAI\b/g, "상담")
    .replace(/기능/g, "상담");
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
  if (FORBIDDEN_RESULT_PATTERN.test(cleaned)) issues.push("FORBIDDEN_RESULT_PATTERN");
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
  const missingCategories = issues.find((issue) => issue.startsWith("MISSING_CATEGORIES:"));
  if (missingCategories) {
    const labels = missingCategories.split(":")[1].split(",")
      .map((category) => NEW_YEAR_AI_REQUIRED_CATEGORY_LABELS[category]?.[0]).filter(Boolean);
    lines.push(`빠진 카테고리 소제목이 있습니다(${labels.join(", ")}). 월별 흐름과 별개로 연애·재회, 재물·수입, 직업·이직, 건강·멘탈, 가족·관계, 학업·성장 6개 소제목을 각각 최소 한 문단씩 굵게 표시해 보강하세요.`);
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

function buildConsultationExpansionPrompt(originalText, minTotalChars = NEW_YEAR_AI_MIN_TOTAL_CHARS, maxTotalChars = NEW_YEAR_AI_MAX_TOTAL_CHARS, issues = [], fortuneData = null) {
  return [
    "아래 신년운세 상담문은 방향은 좋지만 완성본으로 보기에는 깊이가 부족합니다.",
    ...describeConsistencyIssuesForRepair(issues, fortuneData),
    `기존 흐름과 어조를 유지하면서 전체 본문 합계가 공백 제외 ${minTotalChars.toLocaleString("ko-KR")}자 이상 ${maxTotalChars.toLocaleString("ko-KR")}자 이하가 되도록 보강하세요.`,
    "단순히 문장의 양만 늘리지 말고, 부족한 부분에는 명리 전문가로서 새로운 파트를 추가하세요.",
    "새 파트는 격국과 월령, 용신·기신, 조후, 대운과 세운, 천간·지지 합충, 월운, 현실 처방을 필요한 만큼 자연스럽게 보강해야 합니다.",
    "항목마다 같은 분량을 강제로 늘리지 말고, 전체 상담문이 한 번에 읽히는 긴 상담처럼 자연스럽게 이어 주세요.",
    "원국의 격국, 용신·기신, 조후, 대운과 세운의 관계, 월별 기회와 주의, 현실 조언을 더 깊게 풀되 같은 문장을 반복하지 마세요.",
    "기계적인 설명, 내부 작업 표현, 목차 안내처럼 들리는 문장은 쓰지 마세요.",
    "",
    "[기존 상담문]",
    originalText,
  ].join("\n");
}

function buildConsultationCompressionPrompt(originalText, minTotalChars = NEW_YEAR_AI_MIN_TOTAL_CHARS, maxTotalChars = NEW_YEAR_AI_MAX_TOTAL_CHARS) {
  return [
    "아래 신년운세 상담문은 분량이 길어졌습니다.",
    `명리 근거와 상담 품질을 유지하면서 전체 본문 합계가 공백 제외 ${minTotalChars.toLocaleString("ko-KR")}자 이상 ${maxTotalChars.toLocaleString("ko-KR")}자 이하가 되도록 다시 다듬으세요.`,
    "격국·월령, 용신·기신, 조후, 대운·세운, 천간·지지 합충, 월운, 현실 처방은 모두 남기고, 반복 문장과 장황한 비유만 줄이세요.",
    "상담가가 직접 말하는 자연스러운 문체를 유지하세요.",
    "",
    "[기존 상담문]",
    originalText,
  ].join("\n");
}

function buildMockConsultationText(options = {}) {
  const targetChars = Number(options.targetChars || 13000) || 13000;
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

async function generateConsultationText(env, prompt, options = {}) {
  const minTotalChars = Number(options.minTotalChars || NEW_YEAR_AI_MIN_TOTAL_CHARS) || NEW_YEAR_AI_MIN_TOTAL_CHARS;
  const maxTotalChars = Number(options.maxTotalChars || NEW_YEAR_AI_MAX_TOTAL_CHARS) || NEW_YEAR_AI_MAX_TOTAL_CHARS;
  const providerDiagnostics = getProviderDiagnostics(env);
  logNewYearAi("Provider Selected", {
    ...(options.logContext || {}),
    ...providerDiagnostics,
  });
  // 신년운세 상담(custom focus 시 자유질문 포함) → 캐시 키가 프롬프트 전체로 잡혀 동일 입력만 히트.
  const newYearLlmCache = {
    store: createLlmCacheStore(env),
    deterministic: true,
    ttlSeconds: 30 * 24 * 60 * 60,
    keyExtra: "new-year-ai-v1",
  };
  // PREMIUM_GEMINI_TIMEOUT_MS(운영 45s)를 || 체인에 넣으면 큰 기본값이 죽는다(45s 단락 함정).
  // 30,000토큰(gemini-2.5-flash ~200tok/s ≈ 150s) 장문이라 150s가 필요하다.
  const newYearTimeoutMs = Number(env?.NEW_YEAR_AI_TIMEOUT_MS) || 150000;
  const ai = await callGeminiText(env, prompt, {
    systemPrompt: buildSystemPrompt(),
    taskType: "fortune",
    temperature: 0.72,
    maxOutputTokens: options.maxOutputTokens || NEW_YEAR_AI_MAX_OUTPUT_TOKENS,
    timeoutMs: newYearTimeoutMs,
    // 초기 장문은 llama 폴백이 분량을 못 채움 — 폴백 대기 없이 즉시 실패(신년운세는 초기 생성 전용 라우트).
    fallbackToWorkersAI: false,
    cache: newYearLlmCache,
  });
  const provider = clean(ai?.provider || ai?.model || "gemini");
  const isMock = /mock/i.test(provider) || ai?.isMock === true;
  const text = clean(ai?.text);
  if (!ai?.ok || isMock || text.length < (options.minLength || 180)) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed."));
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_GENERATION_FAILED";
    error.providerDiagnostics = providerDiagnostics;
    throw error;
  }
  let finalText = text;
  let finalProvider = provider;
  let finalModel = clean(ai?.model);

  if (FORBIDDEN_RESULT_PATTERN.test(finalText)) {
    const repair = await callGeminiText(env, [
      "다음 상담 답변에서 금지된 표현을 모두 걷어내고, 자연스러운 신년운세 상담문으로만 다시 써주세요.",
      "",
      finalText,
    ].join("\n"), {
      systemPrompt: buildSystemPrompt(),
      taskType: "fortune",
      temperature: 0.58,
      maxOutputTokens: options.maxOutputTokens || NEW_YEAR_AI_MAX_OUTPUT_TOKENS,
      timeoutMs: newYearTimeoutMs,
      fallbackToWorkersAI: false,
      cache: newYearLlmCache,
    });
    const repaired = clean(repair?.text);
    if (repair?.ok && repaired.length >= 120) {
      finalText = repaired;
      finalProvider = clean(repair?.provider || finalProvider);
      finalModel = clean(repair?.model || finalModel);
    }
  }

  const fortuneData = options.fortuneData || null;
  let quality = validateConsultationQuality(finalText, { minTotalChars, maxTotalChars, fortuneData, hasCustomQuestion: options.hasCustomQuestion });
  const EXPANDABLE_ISSUE_PATTERN = /^(MIN_TOTAL_CHARS|SECTION_COUNT|MISSING_EXPERT_TOPICS|MISSING_MONTHS|MISSING_CATEGORIES|ANNUAL_PILLAR_UNSTATED|MONTHLY_PILLAR_CITATIONS|SEWOON_INTERACTION_UNSTATED|QUESTION_ANSWER_SECTION_MISSING)/;
  const shouldExpand = quality.issues.some((issue) => EXPANDABLE_ISSUE_PATTERN.test(issue));
  if (shouldExpand) {
    const expansion = await callGeminiText(env, buildConsultationExpansionPrompt(quality.text, minTotalChars, maxTotalChars, quality.issues, fortuneData), {
      systemPrompt: buildSystemPrompt(),
      taskType: "fortune",
      temperature: 0.66,
      maxOutputTokens: options.expansionMaxOutputTokens || NEW_YEAR_AI_MAX_OUTPUT_TOKENS,
      timeoutMs: newYearTimeoutMs,
      fallbackToWorkersAI: false,
      cache: newYearLlmCache,
    });
    const expansionProvider = clean(expansion?.provider || expansion?.model || "");
    const expansionText = clean(expansion?.text);
    if (expansion?.ok && !/mock/i.test(expansionProvider) && expansion?.isMock !== true && expansionText.length > quality.text.length) {
      finalText = expansionText;
      finalProvider = clean(expansion?.provider || finalProvider);
      finalModel = clean(expansion?.model || finalModel);
      quality = validateConsultationQuality(finalText, { minTotalChars, maxTotalChars, fortuneData, hasCustomQuestion: options.hasCustomQuestion });
    }
  }

  if (quality.issues.some((issue) => issue.startsWith("MAX_TOTAL_CHARS"))) {
    const compressed = await callGeminiText(env, buildConsultationCompressionPrompt(quality.text, minTotalChars, maxTotalChars), {
      systemPrompt: buildSystemPrompt(),
      taskType: "fortune",
      temperature: 0.52,
      maxOutputTokens: options.compressionMaxOutputTokens || NEW_YEAR_AI_MAX_OUTPUT_TOKENS,
      timeoutMs: newYearTimeoutMs,
      fallbackToWorkersAI: false,
      cache: newYearLlmCache,
    });
    const compressedProvider = clean(compressed?.provider || compressed?.model || "");
    const compressedText = clean(compressed?.text);
    if (compressed?.ok && !/mock/i.test(compressedProvider) && compressed?.isMock !== true && compressedText.length < quality.text.length) {
      finalText = compressedText;
      finalProvider = clean(compressed?.provider || finalProvider);
      finalModel = clean(compressed?.model || finalModel);
      quality = validateConsultationQuality(finalText, { minTotalChars, maxTotalChars, fortuneData, hasCustomQuestion: options.hasCustomQuestion });
    }
  }

  if (!quality.ok) {
    // 경량 보장 계약: 품질 기준 미달이라도 렌더 가능한 상담문이 있으면 버리지 않고 degrade로 전달한다.
    // (기존 커밋/과금 경로가 그대로 결과를 저장·과금하므로 결제 후 무결과를 막는다.)
    if (hasRenderableLlmText(quality.text, { minChars: 400 })) {
      return {
        text: quality.text,
        provider: finalProvider,
        model: finalModel,
        quality,
        degraded: true,
      };
    }
    const error = new Error("신년운세 상담문 품질 기준을 충족하지 못했습니다.");
    error.code = "NEW_YEAR_AI_QUALITY_FAILED";
    error.quality = quality;
    error.providerDiagnostics = providerDiagnostics;
    throw error;
  }

  return {
    text: quality.text,
    provider: finalProvider,
    model: finalModel,
    quality,
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

async function callDeferredUsageRoute({ request, env, path, idempotencyKey, sessionId, code = "", message = "" }) {
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
  }), env);
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

  const auth = await getOptionalUserFromRequest(request, env);
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

  const access = await withMongoRetry(env, () => resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash, body }));
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
  const billingAccess = await withMongoRetry(env, () => resolveBillingGateAccess({ auth, user, body, pricing, idempotencyKey }));
  if (billingAccess?.ok) {
    return {
      ...billingAccess,
      usageAlreadyApplied: billingAccess.usageAlreadyApplied === true,
    };
  }
  return withMongoRetry(env, () => resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash, body }));
}

async function handleStart(request, env) {
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

  const auth = await getOptionalUserFromRequest(request, env);
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
  // 신선도 창 = 최악 파이프라인(초기 150s + 금지어 repair + expand/compress 각 150s) + 마진.
  if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < 480000) {
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
    const generated = await generateConsultationText(env, buildFirstPrompt(normalized.input, fortuneData), {
      minLength: 1000,
      minTotalChars: NEW_YEAR_AI_MIN_TOTAL_CHARS,
      maxTotalChars: NEW_YEAR_AI_MAX_TOTAL_CHARS,
      maxOutputTokens: NEW_YEAR_AI_MAX_OUTPUT_TOKENS,
      fortuneData,
      hasCustomQuestion: normalized.input.hasCustomQuestion,
      logContext: safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }),
    });
    if (access.deferredUsage) {
      await callDeferredUsageRoute({ request, env, path: "apply", idempotencyKey, sessionId });
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
    message: "신년운세 AI 상담은 처음 입력한 흐름을 기준으로 한 번 생성됩니다. 더 깊게 보고 싶은 내용은 상담 시작 전에 입력해 주세요.",
  }, { status: 410 });
}

async function handleResult(request, env) {
  const auth = await getOptionalUserFromRequest(request, env);
  if (!auth?.userId) {
    return json({ ok: false, reason: "LOGIN_REQUIRED", message: LOGIN_REQUIRED_MESSAGE }, { status: 401 });
  }
  const url = new URL(request.url);
  const sessionId = clean(url.searchParams.get("sessionId") || url.searchParams.get("id"), 180);

  await connectDb(env);
  if (!sessionId) {
    const rows = await NewYearAiConsultation.find({ userId: clean(auth.userId), status: "completed" })
      .sort({ updatedAt: -1 })
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

export async function handleNewYearAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/new-year-ai");

  try {
    if (method === "POST" && path === "/ensure-access") return await handleEnsureAccess(request, env);
    if (method === "POST" && path === "/start") return await handleStart(request, env);
    if (method === "POST" && path === "/message") return await handleMessage(request, env);
    if (method === "GET" && path === "/result") return await handleResult(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[new-year-ai]", clean(error?.code || error?.message || error, 500));
    logNewYearAi("Error", safeLogPayload({ route: "/api/new-year-ai", env, error }), "error");
    // 풀 초기화 버스트 등 일시적 DB 오류는 재시도 신호와 함께 503으로 — 하드 500 방지.
    if (isTransientMongoError(error)) {
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
};
