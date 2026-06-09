import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { callGeminiText } from "../lib/gemini.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";
import {
  BRANCH_BREAKS,
  BRANCH_CLASHES,
  BRANCH_COMBOS,
  BRANCH_ELEMENT,
  BRANCH_HARMS,
  BRANCHES,
  CONTROLS,
  COVER_IMAGE,
  ELEMENT_KO,
  FEATURE_ALIASES,
  FEATURE_KEY,
  FORBIDDEN_TEXT_RE,
  GENERATES,
  MIN_CATEGORY_TEXT_LENGTH,
  MIN_CHAPTER_CHARS,
  MIN_SECTION_CHARS,
  MIN_TOTAL_CHARS,
  MONTH_BRANCHES,
  NEW_YEAR_CHAPTERS,
  NEW_YEAR_PDF_LOCK_TTL_MS,
  SERVICE_KEY,
  STEM_ELEMENT,
  STEM_YINYANG,
  STEMS,
} from "../lib/saju-new-year-constants.js";

const newYearPdfLocks = new Map();
const annualFortuneLlmCache = new Map();
export { NEW_YEAR_CHAPTERS };

export const YEARLY_SAJU_PDF_CONFIG = Object.freeze({
  generationMode: "local",
  llmEnabled: false,
  provider: "none",
  templateVersion: "yearly-saju-local-v2",
});

const ANNUAL_FORTUNE_PRODUCT_ID = "saju_annual_fortune";
const ANNUAL_FORTUNE_PROMPT_VERSION = YEARLY_SAJU_PDF_CONFIG.templateVersion;
const ANNUAL_FORTUNE_ENGINE_VERSION = "worker-saju-new-year-engine.v1";
const ANNUAL_FORTUNE_LLM_ENHANCEMENT_ENV = "ANNUAL_FORTUNE_LLM_ENHANCEMENT_ENABLED";
const ANNUAL_FORTUNE_QUARTERLY_LLM_ENV = "ANNUAL_FORTUNE_QUARTERLY_LLM_ENABLED";
const ANNUAL_FORTUNE_LLM_CACHE_ENV = "ANNUAL_FORTUNE_LLM_CACHE_ENABLED";
const ANNUAL_FORTUNE_CHAPTER_CACHE_REPORT_TYPE = "sajuNewYearChapterCache";
const ANNUAL_FORTUNE_CHAPTER_CACHE_TTL_DAYS = 90;
const ANNUAL_FORTUNE_CACHE_LIMIT = 160;
const ANNUAL_FORTUNE_LLM_ENHANCED_CHAPTERS = Object.freeze([
  "annual_overview",
  "annual_pillar_interaction",
  "major_luck_annual_luck",
  "career_business",
  "wealth_money",
  "relationship_family",
  "relationship_love_family",
  "caution_periods",
  "annual_master_plan",
]);
const ANNUAL_FORTUNE_OPTIONAL_QUARTERLY_LLM_CHAPTERS = Object.freeze([
  "monthly_q1",
  "monthly_q2",
  "monthly_q3",
  "monthly_q4",
  "quarterly_decision",
]);
const ANNUAL_FORTUNE_CHAPTER_ID_BY_NO = Object.freeze({
  1: "annual_overview",
  2: "career_business",
  3: "wealth_money",
  4: "relationship_family",
  5: "relationship_love_family",
  6: "health_lifestyle",
  7: "quarterly_decision",
  8: "caution_periods",
  9: "monthly_map",
  10: "annual_master_plan",
});
const ANNUAL_FORTUNE_RISK_REPLACEMENTS = Object.freeze([
  [/반드시\s*망한다/gi, "무리한 확장은 부담으로 돌아올 수 있으니 속도 조절이 필요합니다"],
  [/큰\s*사고가\s*난다/gi, "이동, 일정, 컨디션 관리에서 평소보다 신중함이 필요합니다"],
  [/병에\s*걸린다/gi, "생활 리듬과 체력 관리에 신경 써야 하는 시기입니다"],
  [/돈을\s*(?:크게\s*)?잃는다/gi, "충동적인 지출이나 검증되지 않은 투자는 보수적으로 접근하는 편이 좋습니다"],
  [/해고된다/gi, "직장 내 역할 변화나 책임 조정이 생길 수 있으므로 관계와 성과 관리가 중요합니다"],
  [/사업이\s*실패한다/gi, "사업 운영에서는 속도보다 검증과 현금 흐름 관리가 중요합니다"],
  [/이별한다/gi, "관계의 속도와 기대치 차이를 조율해야 하는 시기입니다"],
  [/소송에\s*휘말린다/gi, "계약과 약속은 문서와 절차를 더 세심하게 확인하는 편이 좋습니다"],
  [/가족\s*문제가\s*터진다/gi, "가족과 가까운 관계에서는 미뤄 둔 대화를 차분히 정리할 필요가 있습니다"],
  [/올해는\s*최악이다/gi, "압박감이 커질 수 있지만 방향을 정리하면 기준을 세우기 좋은 해입니다"],
  [/아무것도\s*하지\s*마라/gi, "큰 결정보다 점검과 정리에 집중하는 편이 좋습니다"],
  [/무조건\s*투자하지\s*마라/gi, "투자는 검증된 범위 안에서 보수적으로 판단하는 편이 좋습니다"],
  [/무조건\s*결혼하지\s*마라/gi, "관계의 약속은 속도와 책임을 충분히 맞춘 뒤 결정하는 편이 좋습니다"],
  [/반드시\s*성공한다/gi, "성과로 이어질 가능성을 키울 수 있습니다"],
  [/무조건\s*성공한다/gi, "좋은 흐름을 현실 성과로 옮길 여지가 있습니다"],
  [/100\s*%\s*돈\s*번다/gi, "수입 구조를 점검하고 키울 여지가 있습니다"],
  [/무조건\s*이별한다/gi, "관계의 거리와 기대치를 조율해야 할 수 있습니다"],
  [/사고가\s*난다/gi, "이동, 일정, 컨디션 관리에서 평소보다 신중함이 필요합니다"],
  [/송사/gi, "문서와 절차를 조심해야 하는 일"],
  [/관재/gi, "약속과 기록을 조심해야 하는 일"],
  [/의료\s*진단/gi, "생활 리듬 점검"],
  [/진단처럼/gi, "생활 리듬을 살피는 방식으로"],
  [/투자\s*조언/gi, "지출과 수입 구조 점검"],
  [/투자/gi, "큰돈을 쓰는 결정"],
]);
const NEW_YEAR_LOCAL_FORBIDDEN_RE = /\b(?:json|payload|debug|schema|engine|prompt|llm|api|undefined|null|nan|object|todo|fixme|placeholder)\b|\[object Object\]/gi;
const NEW_YEAR_MANUSCRIPT_SOURCE = Object.freeze({
  LLM: "worker-native-llm",
  HYBRID: "annual-fortune-hybrid",
  LOCAL: "local-rule-completed",
});
const NEW_YEAR_LLM_KEY_ENV_KEYS = Object.freeze([
  "PREMIUM_SAJU_NEW_YEAR_GEMINI_API_KEY1",
  "PREMIUM_SAJU_NEW_YEAR_GEMINI_API_KEY2",
  "PREMIUM_SAJU_NEW_YEAR_GEMINI_API_KEY3",
  "PREMIUM_SAJU_NEW_YEAR_GEMINI_API_KEY4",
  "PREMIUM_SAJU_NEW_YEAR_GEMINI_API_KEY5",
  "PREMIUM_GEMINI_API_KEY1",
  "PREMIUM_GEMINI_API_KEY2",
  "PREMIUM_GEMINI_API_KEY3",
  "PREMIUM_GEMINI_API_KEY4",
  "PREMIUM_GEMINI_API_KEY5",
]);
const NEW_YEAR_LLM_MODEL_ENV_KEYS = Object.freeze(["PREMIUM_SAJU_NEW_YEAR_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"]);

const LOCAL_STEMS = Object.freeze(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
const LOCAL_BRANCHES = Object.freeze(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);
const LOCAL_MONTH_BRANCHES = Object.freeze(["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"]);
const LOCAL_STEM_ELEMENT = Object.freeze({ 甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water" });
const LOCAL_BRANCH_ELEMENT = Object.freeze({ 子: "water", 丑: "earth", 寅: "wood", 卯: "wood", 辰: "earth", 巳: "fire", 午: "fire", 未: "earth", 申: "metal", 酉: "metal", 戌: "earth", 亥: "water" });
const LOCAL_ELEMENT_KO = Object.freeze({ wood: "목", fire: "화", earth: "토", metal: "금", water: "수" });
const LOCAL_GENERATES = Object.freeze({ wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" });
const LOCAL_CONTROLS = Object.freeze({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" });
const LOCAL_BRANCH_COMBOS = Object.freeze({ 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" });
const LOCAL_BRANCH_CLASHES = Object.freeze({ 子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅", 卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳" });
const LOCAL_BRANCH_HARMS = Object.freeze({ 子: "未", 未: "子", 丑: "午", 午: "丑", 寅: "巳", 巳: "寅", 卯: "辰", 辰: "卯", 申: "亥", 亥: "申", 酉: "戌", 戌: "酉" });
const LOCAL_BRANCH_BREAKS = Object.freeze({ 子: "酉", 酉: "子", 丑: "辰", 辰: "丑", 寅: "亥", 亥: "寅", 卯: "午", 午: "卯", 巳: "申", 申: "巳", 未: "戌", 戌: "未" });

const YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE = Object.freeze([
  "핵심 요약 카드",
  "상담형 본문",
  "계산 근거 기반 해석",
  "주의할 점",
  "실천 조언",
  "체크리스트",
  "챕터 마무리 문장",
]);

const LOCAL_NEW_YEAR_CHAPTERS = Object.freeze([
  { no: 1, title: "프롤로그 — 올해 내 운의 전체 분위기", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 2, title: "올해의 핵심 키워드 — 세운이 나에게 주는 메시지", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 3, title: "대운과 세운의 만남 — 큰 흐름 속 올해의 위치", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 4, title: "일과 커리어 — 성취, 역할, 방향 전환의 운", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 5, title: "재물과 소비 — 돈이 들어오고 나가는 구조", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 6, title: "연애와 인간관계 — 가까워질 사람과 멀어질 사람", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 7, title: "건강과 생활 리듬 — 무리하기 쉬운 지점과 회복법", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 8, title: "위험 신호와 기회 신호 — 조심할 시기와 잡아야 할 시기", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 9, title: "12개월 월별 운세 — 매달의 흐름과 실천 조언", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 10, title: "올해의 마스터플랜 — 1년을 잘 쓰는 실행 전략", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
]);

function buildSajuNewYearChapterSpecs(targetYear) {
  const year = toInt(targetYear, resolveDefaultTargetYear());
  return LOCAL_NEW_YEAR_CHAPTERS.map((chapter) => ({
    no: chapter.no,
    id: String(chapter.no),
    title: chapter.title.replace(/\{YEAR\}/g, String(year)),
    categories: chapter.categories,
  }));
}

function clean(value) {
  return String(value || "").trim();
}

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function pad2(value) {
  return String(toInt(value, 0)).padStart(2, "0");
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeFeatureKey(raw) {
  const value = clean(raw);
  if (!value) return FEATURE_KEY;
  if (value === FEATURE_KEY || FEATURE_ALIASES.has(value)) return FEATURE_KEY;
  return value;
}

function normalizeNewYearBookError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      code: clean(error.code || ""),
      status: Number(error.status || 0) || undefined,
      stage: clean(error.stage || ""),
      message: error.message,
      causeMessage: clean(error.cause?.message || error.cause || ""),
      stack: error.stack,
    };
  }
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch (_) {
      return { message: String(error) };
    }
  }
  return { message: String(error) };
}

function stripForbiddenText(value) {
  return clean(value)
    .replace(/```[a-z]*|```/gi, "")
    .replace(FORBIDDEN_TEXT_RE, "")
    .replace(NEW_YEAR_LOCAL_FORBIDDEN_RE, "")
    .replace(/\s{3,}/g, " ")
    .trim();
}

function yearlySentenceSeed(seed = {}, extra = "") {
  return [
    seed?.targetYear,
    seed?.birthProfile?.birthDate,
    seed?.birthProfile?.birthTime,
    seed?.saju?.annualLuck?.label,
    extra,
  ].map(clean).filter(Boolean).join("|");
}

function stableYearlyHash(value) {
  const text = clean(value);
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function rotateYearlyLines(lines = [], seed = {}, extra = "") {
  const cleaned = lines.map((line) => clean(line)).filter(Boolean);
  if (cleaned.length <= 1) return cleaned;
  const offset = stableYearlyHash(yearlySentenceSeed(seed, extra)) % cleaned.length;
  return cleaned.slice(offset).concat(cleaned.slice(0, offset));
}

function assembleYearlyLocalLines(lines = [], seed = {}, extra = "") {
  const seen = new Set();
  const softened = rotateYearlyLines(lines, seed, extra)
    .map((line) => softenAnnualFortuneRiskText(line, seed?.targetYear))
    .filter(Boolean);
  return softened.filter((line) => {
    const key = line.replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cloneNewYearValue(value) {
  if (!value || typeof value !== "object") return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function compactNewYearObject(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => compactNewYearObject(item))
      .filter((item) => item !== undefined && item !== "");
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      const normalized = compactNewYearObject(item);
      if (normalized === undefined || normalized === "") continue;
      if (Array.isArray(normalized) && normalized.length === 0) continue;
      if (normalized && typeof normalized === "object" && !Array.isArray(normalized) && Object.keys(normalized).length === 0) continue;
      out[key] = normalized;
    }
    return out;
  }
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return clean(value) || undefined;
  return value;
}

function readBooleanFlag(env = {}, key, fallback = false) {
  const raw = env?.[key];
  if (raw === undefined || raw === null || raw === "") return fallback;
  if (typeof raw === "boolean") return raw;
  return /^(1|true|yes|on)$/i.test(clean(raw));
}

function stableNewYearStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableNewYearStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableNewYearStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function hashAnnualFortuneValue(value) {
  const input = stableNewYearStringify(value);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(36)}${(h1 >>> 0).toString(36)}`;
}

function buildYearlySajuPdfCacheKey(normalized = {}) {
  const seed = normalized.seed || {};
  const targetYear = Number(normalized.targetYear || seed.targetYear || 0) || resolveDefaultTargetYear();
  const profile = normalized.profile || seed.birthProfile || {};
  const natalCalculation = normalized.natalCalculation || seed.saju || {};
  const annualCalculation = normalized.yearlyCalculation || seed.saju?.annualLuck || {};
  const monthlyCalculation = normalized.monthlyCalculation || seed.saju?.monthlyLuck || [];
  return `yearly-saju-cache:${hashAnnualFortuneValue({
    service: "yearly-saju",
    version: YEARLY_SAJU_PDF_CONFIG.templateVersion,
    targetYear,
    profile,
    natalCalculationResultHash: hashAnnualFortuneValue(natalCalculation),
    annualCalculationResultHash: hashAnnualFortuneValue(annualCalculation),
    monthlyCalculationResultHash: hashAnnualFortuneValue(monthlyCalculation),
  })}`;
}

function buildYearlySajuPdfCacheExecutionContext(baseCtx = {}, cacheKey = "") {
  const executionKey = clean(cacheKey, 120);
  if (!executionKey) return baseCtx;
  return {
    ...baseCtx,
    executionKey,
    idempotencyKey: executionKey,
    metadata: {
      ...(baseCtx.metadata || {}),
      cacheKind: "yearly-saju-pdf",
      cacheKey: executionKey,
      templateVersion: YEARLY_SAJU_PDF_CONFIG.templateVersion,
    },
  };
}

function interpretationBlock({ id, tags = [], weight = 1, title, summary, body = [], advice = [], caution = [], checklist = [] }) {
  return Object.freeze({
    id: clean(id),
    tags: tags.map((tag) => clean(tag)).filter(Boolean),
    weight: Number(weight) || 1,
    title: clean(title),
    summary: clean(summary),
    body: body.map((line) => clean(line)).filter(Boolean),
    advice: advice.map((line) => clean(line)).filter(Boolean),
    caution: caution.map((line) => clean(line)).filter(Boolean),
    checklist: checklist.map((line) => clean(line)).filter(Boolean),
  });
}

const ANNUAL_STEM_META = Object.freeze({
  "甲": ["큰 나무처럼 기준을 세우는 천간", "시작, 성장, 원칙, 장기 계획"],
  "乙": ["풀과 꽃처럼 유연하게 번지는 천간", "관계, 조율, 섬세함, 협업"],
  "丙": ["태양처럼 드러내고 밝히는 천간", "표현, 명예, 공개성, 자신감"],
  "丁": ["촛불처럼 집중력과 감각을 깨우는 천간", "몰입, 직감, 기획, 정교함"],
  "戊": ["큰 산처럼 중심과 책임을 세우는 천간", "기반, 신뢰, 축적, 안정"],
  "己": ["밭처럼 현실을 가꾸고 정리하는 천간", "관리, 생활, 루틴, 실속"],
  "庚": ["큰 쇠처럼 결단과 정리를 요구하는 천간", "판단, 구조조정, 승부, 절제"],
  "辛": ["보석처럼 가치와 기준을 세공하는 천간", "품질, 미감, 선택, 정밀함"],
  "壬": ["큰 물처럼 흐름을 넓히는 천간", "이동, 확장, 지혜, 유통"],
  "癸": ["비와 안개처럼 내면을 적시는 천간", "회복, 학습, 감수성, 준비"],
});

const ANNUAL_BRANCH_META = Object.freeze({
  "子": ["깊은 물의 씨앗이 움직이는 지지", "준비, 정보, 회복, 시작 전 정리"],
  "丑": ["겨울 땅이 축적을 품는 지지", "저장, 인내, 재정비, 느린 성과"],
  "寅": ["봄의 첫 기세가 열리는 지지", "도전, 추진, 새로운 역할, 방향 전환"],
  "卯": ["관계와 생장이 부드럽게 번지는 지지", "인연, 조율, 미감, 확장"],
  "辰": ["변화의 문턱을 품은 습토 지지", "전환, 정리, 숨은 가능성, 구조 변경"],
  "巳": ["열기와 집중이 강해지는 지지", "실행, 노출, 기술, 열정"],
  "午": ["한낮의 불처럼 정점에 오르는 지지", "주목, 성취, 속도, 표현"],
  "未": ["여름 끝의 땅처럼 결과를 다듬는 지지", "마무리, 관계 책임, 생활 기반"],
  "申": ["금기가 시작되어 판을 재편하는 지지", "변경, 협상, 기술, 이동"],
  "酉": ["결실을 선별하고 가치화하는 지지", "성과, 평가, 품질, 수익화"],
  "戌": ["가을 끝의 땅처럼 경계를 정하는 지지", "보호, 약속, 책임, 정리"],
  "亥": ["큰 물의 문이 열리는 지지", "휴식, 학습, 이동, 내면 성장"],
});

const ANNUAL_TEN_GOD_META = Object.freeze({
  "비견": ["자기 기준이 선명해지는 해", "독립성, 자존감, 자기 분야의 중심을 다시 잡는 흐름"],
  "겁재": ["경쟁과 재편이 강해지는 해", "사람, 돈, 기회의 경계가 흔들리기 쉬운 흐름"],
  "식신": ["생산성과 표현이 안정되는 해", "꾸준한 생산, 생활 만족, 결과물 축적의 흐름"],
  "상관": ["표현과 변화가 강해지는 해", "말, 기획, 창의성, 기존 질서의 재해석 흐름"],
  "편재": ["기회와 현금 흐름이 넓어지는 해", "사람, 정보, 시장의 움직임을 통한 재물 흐름"],
  "정재": ["안정 수입과 현실 관리가 중요해지는 해", "고정 수입, 생활 기반, 계획적 재정 관리 흐름"],
  "편관": ["압박 속에서 역량을 증명하는 해", "책임, 경쟁, 긴장 속에서 실전 능력을 끌어올리는 흐름"],
  "정관": ["질서와 책임이 커지는 해", "책임, 기준, 신뢰, 공식적인 역할이 중요해지는 흐름"],
  "편인": ["직감과 학습이 깊어지는 해", "내면 감각, 연구, 전환 학습으로 길을 찾는 흐름"],
  "정인": ["회복과 보호가 작동하는 해", "배움, 보호, 문서, 안정된 지원을 통한 회복 흐름"],
});

const ANNUAL_STEM_BLOCKS = Object.freeze(Object.fromEntries(Object.entries(ANNUAL_STEM_META).map(([stem, [title, keywords]]) => [stem, interpretationBlock({
  id: `annual-stem-${stem}`,
  tags: ["annual", "stem", `stem:${stem}`],
  weight: 1,
  title,
  summary: `${stem} 천간은 올해 ${keywords}의 결을 세운 위에 드러낸다.`,
  body: [
    `세운 천간 ${stem}은 겉으로 드러나는 선택 방식과 사회적 태도를 조율한다.`,
    `${keywords}의 흐름이 강해지므로 올해의 중요한 판단은 속도보다 방향과 태도를 먼저 보아야 한다.`,
    "천간의 기운은 마음의 의지와 말의 표현으로 먼저 나타나므로, 초반의 작은 선택이 연말의 큰 흐름을 만든다.",
  ],
  advice: ["올해의 대표 태도를 한 문장으로 정하라.", "중요한 선택은 천간의 키워드와 맞는지 점검하라."],
  caution: ["겉으로 드러나는 모습에만 치우쳐 실제 기반을 놓치지 말라."],
  checklist: ["올해 태도 키워드 정리", "중요한 말과 약속 기록", "상반기 방향 점검"],
})])));

const ANNUAL_BRANCH_BLOCKS = Object.freeze(Object.fromEntries(Object.entries(ANNUAL_BRANCH_META).map(([branch, [title, keywords]]) => [branch, interpretationBlock({
  id: `annual-branch-${branch}`,
  tags: ["annual", "branch", `branch:${branch}`],
  weight: 1,
  title,
  summary: `${branch} 지지는 올해 ${keywords}의 사건 배경을 만든다.`,
  body: [
    `세운 지지 ${branch}는 실제 사건이 나타나는 장소와 관계의 배경을 보여준다.`,
    `${keywords}의 흐름이 생활 속에서 반복될 수 있으니, 올해는 감정보다 패턴을 읽는 태도가 중요하다.`,
    "지지의 기운은 천천히 쌓이다가 특정 달에 사건으로 드러나므로 월운과 함께 보아야 한다.",
  ],
  advice: ["올해 반복될 생활 패턴을 미리 관찰하라.", "월별 사건을 같은 기준으로 기록하라."],
  caution: ["한 번의 사건만으로 한 해 전체를 단정하지 말라."],
  checklist: ["반복 사건 기록", "월운 강약 표시", "관계·돈·건강 패턴 점검"],
})])));

const ANNUAL_TEN_GOD_BLOCKS = Object.freeze(Object.fromEntries(Object.entries(ANNUAL_TEN_GOD_META).map(([tenGodName, [title, flow]]) => [tenGodName, interpretationBlock({
  id: `annual-ten-god-${tenGodName}`,
  tags: ["annual", "ten-god", `ten-god:${tenGodName}`],
  weight: 1.25,
  title,
  summary: `${tenGodName} 세운은 ${flow}을 올해의 중심 과제로 올린다.`,
  body: [
    `${tenGodName}이 세운의 중심으로 들어오면 올해는 ${flow}이 반복적으로 드러난다.`,
    "이 흐름은 한 번의 사건보다 태도와 선택 방식의 변화로 먼저 나타나며, 월운이 강한 시기에 현실 사건으로 선명해진다.",
    "좋은 쪽으로 쓰면 성장의 발판이 되지만, 균형을 잃으면 같은 주제가 부담과 소모로 반복될 수 있다.",
  ],
  advice: ["올해 이 십성이 요구하는 역할을 현실 일정으로 옮겨라.", "강한 달에는 실행하고 약한 달에는 정리하는 리듬을 만들라."],
  caution: ["십성의 장점이 과해질 때 생기는 고집, 과속, 회피, 부담을 조심하라."],
  checklist: ["올해 핵심 역할 기록", "월별 실행과 정비 구분", "반복 부담 신호 점검"],
})])));

const YEARLY_CONTEXT_BLOCKS = Object.freeze({
  elementExcess: interpretationBlock({
    id: "five-elements-excess-year",
    tags: ["five-elements", "excess"],
    weight: 1,
    title: "강한 오행을 방향성으로 다루는 해",
    summary: "과다한 오행은 재능이자 과열 지점이므로 쓰임과 절제가 함께 필요하다.",
    body: ["강한 오행은 올해 빠르게 드러나는 장점이지만, 같은 방식이 반복되면 피로와 갈등도 만든다.", "강한 기운은 밀어붙이는 힘보다 어디에 쓸지 정하는 기준이 있을 때 성과가 된다."],
    advice: ["강한 오행이 드러나는 분야를 핵심 목표로 삼되 휴식 장치를 함께 둬라."],
    caution: ["익숙하다는 이유로 같은 선택만 반복하지 말라."],
    checklist: ["강점 사용처 정리", "과열 신호 기록", "휴식 장치 마련"],
  }),
  elementDeficit: interpretationBlock({
    id: "five-elements-deficit-year",
    tags: ["five-elements", "deficit"],
    weight: 1,
    title: "부족한 오행을 보완하는 해",
    summary: "부족한 오행은 억지로 채우기보다 생활 방식과 선택 환경으로 보완해야 한다.",
    body: ["약한 오행은 올해 반복적으로 빈틈처럼 느껴질 수 있지만, 그것은 무능이 아니라 보완해야 할 리듬이다.", "환경, 사람, 루틴을 통해 부족한 기운을 조금씩 보태면 선택의 안정감이 커진다."],
    advice: ["부족한 오행과 맞는 활동을 월별 루틴에 넣어라."],
    caution: ["부족함을 단번에 해결하려고 과한 결정을 하지 말라."],
    checklist: ["보완 루틴 1개 설정", "도움 되는 환경 찾기", "월별 균형 점검"],
  }),
  usefulFavorable: interpretationBlock({
    id: "useful-god-favorable-year",
    tags: ["useful-god", "favorable"],
    weight: 1.1,
    title: "세운이 필요한 기운을 보태는 해",
    summary: "세운이 용신·희신 쪽으로 작동하면 무리한 확장보다 정확한 실행에서 성과가 난다.",
    body: ["올해는 이미 갖춘 장점보다 부족했던 균형이 보완되는 흐름이 중요하다.", "작은 실행도 운의 방향과 맞으면 예상보다 오래 가는 기반이 된다."],
    advice: ["좋은 달에는 준비해 둔 일을 실제 일정에 올려라."],
    caution: ["좋은 흐름을 과신해 검증 절차를 생략하지 말라."],
    checklist: ["유리한 오행 활동 정리", "좋은 달 실행 일정 배치", "도움받을 자원 확인"],
  }),
  usefulUnfavorable: interpretationBlock({
    id: "useful-god-unfavorable-year",
    tags: ["useful-god", "unfavorable"],
    weight: 1.1,
    title: "기신성 자극을 관리해야 하는 해",
    summary: "세운이 부담 기운을 자극하면 확장보다 조절, 정리, 속도 관리가 중요하다.",
    body: ["올해는 큰 기회처럼 보이는 일도 내 체력과 구조를 흔드는지 먼저 살펴야 한다.", "불리한 기운은 피해야 할 운명이 아니라 관리해야 할 압력이다."],
    advice: ["큰 결정은 하루 이상 숙성시킨 뒤 판단하라."],
    caution: ["불안해서 더 크게 벌리는 선택을 조심하라."],
    checklist: ["결정 유예 규칙 만들기", "지출 상한선 정하기", "갈등 조기 정리"],
  }),
  daewoonAnnual: interpretationBlock({
    id: "daewoon-annual-combination",
    tags: ["daewoon", "annual"],
    weight: 1,
    title: "대운의 배경 위에 세운이 사건을 여는 해",
    summary: "대운은 무대이고 세운은 올해 실제로 눌리는 버튼이다.",
    body: ["올해의 판단은 세운 한 줄만 보지 않고 현재 대운의 배경 위에서 읽어야 한다.", "대운이 준비한 방향과 세운이 건드리는 사건이 맞물리면 전환점이 분명해진다."],
    advice: ["큰 선택은 10년 흐름과 올해 사건성을 함께 보라."],
    caution: ["올해의 감정만으로 장기 방향을 바꾸지 말라."],
    checklist: ["현재 대운 키워드 확인", "올해 사건성 표시", "장기 선택과 단기 선택 분리"],
  }),
  relationClash: interpretationBlock({
    id: "annual-relation-clash",
    tags: ["relation", "clash", "risk"],
    weight: 1.15,
    title: "충의 변화 압력을 다루는 해",
    summary: "충이 드러나는 해에는 이동, 결별, 방향 전환의 신호가 강해진다.",
    body: ["충은 무조건 나쁜 신호가 아니라 멈춰 있던 흐름을 흔들어 방향을 바꾸게 하는 압력이다.", "일정, 관계, 계약에서 갑작스러운 변경이 생길 수 있으므로 여지를 남겨두는 운영이 필요하다."],
    advice: ["중요 일정에는 대안을 하나 더 준비하라."],
    caution: ["감정이 올라온 순간에 바로 결론을 내리지 말라."],
    checklist: ["대체 일정 확보", "계약 변경 조건 확인", "감정적 결정 유예"],
  }),
  relationCombination: interpretationBlock({
    id: "annual-relation-combination",
    tags: ["relation", "combination", "opportunity"],
    weight: 1.1,
    title: "합의 연결 기회를 살리는 해",
    summary: "합이 드러나는 해에는 협력, 인연, 제휴의 문이 열릴 수 있다.",
    body: ["올해의 연결은 우연처럼 보여도 실제로는 오래 준비된 흐름이 만나는 장면일 수 있다.", "사람과 기회가 들어올 때 목적과 역할을 분명히 하면 합의 기운이 성과로 이어진다."],
    advice: ["제안이 오면 역할과 기대치를 초기에 맞춰라."],
    caution: ["좋다는 이유만으로 경계 없이 섞이지 않도록 하라."],
    checklist: ["협업 역할 정의", "인연 관리 목록", "약속 이행 점검"],
  }),
  relationHarmBreakPunishment: interpretationBlock({
    id: "annual-relation-harm-break-punishment",
    tags: ["relation", "harm", "break", "punishment"],
    weight: 1.1,
    title: "형·파·해의 미세한 균열을 관리하는 해",
    summary: "형·파·해는 큰 충돌보다 반복되는 오해, 약속 변경, 피로 누적으로 드러난다.",
    body: ["올해의 균열은 갑작스러운 사고보다 사소한 말, 일정 변경, 책임 미루기에서 커질 수 있다.", "초기에 바로잡으면 큰 손실 없이 지나가지만 방치하면 신뢰 비용이 커진다."],
    advice: ["불편한 약속은 빨리 조정하고 기록으로 남겨라."],
    caution: ["작은 오해를 대수롭지 않게 넘기지 말라."],
    checklist: ["약속 변경 기록", "관계 오해 조기 확인", "책임 분담 점검"],
  }),
  monthlyOpportunity: interpretationBlock({
    id: "monthly-opportunity-window",
    tags: ["monthly", "opportunity"],
    weight: 1.05,
    title: "기회가 열리는 달을 실행 창으로 쓰는 법",
    summary: "월운이 강한 달은 준비한 일을 꺼내는 창으로 쓰는 것이 좋다.",
    body: ["좋은 달은 갑자기 모든 것을 해결해 주는 시간이 아니라, 이미 준비한 것을 현실에 올리기 좋은 시간이다.", "중요한 제안, 발표, 협상, 출시를 흐름이 좋은 달에 배치하면 실행의 저항이 줄어든다."],
    advice: ["기회 달에는 한 가지 핵심 목표만 전면에 세워라."],
    caution: ["좋은 달이라고 여러 일을 동시에 벌리지 말라."],
    checklist: ["기회 달 표시", "핵심 목표 1개 선정", "성과 지표 설정"],
  }),
  monthlyRisk: interpretationBlock({
    id: "monthly-risk-window",
    tags: ["monthly", "risk"],
    weight: 1.05,
    title: "주의 달을 방어와 정비의 시간으로 쓰는 법",
    summary: "월운이 낮은 달은 손실을 줄이고 구조를 고치는 시간이다.",
    body: ["주의 달에는 큰 결론보다 점검과 보완이 중요하다.", "몸과 감정이 흔들리는 시기에 중요한 계약이나 지출을 서두르면 작은 균열이 커질 수 있다."],
    advice: ["낮은 달에는 검토, 수정, 회복 일정을 먼저 배치하라."],
    caution: ["불안해서 즉흥적으로 방향을 바꾸지 말라."],
    checklist: ["큰 지출 보류", "건강 루틴 강화", "관계 오해 조기 정리"],
  }),
  career: interpretationBlock({
    id: "career-year-local",
    tags: ["career", "work"],
    weight: 1,
    title: "일의 기준을 재정렬하는 해",
    summary: "올해의 일운은 세운 십성과 월별 강약에 맞춰 책임, 표현, 성과의 순서를 정할 때 안정된다.",
    body: ["직업운은 한 번의 승부보다 어떤 방식으로 인정받을지를 정하는 데서 시작된다.", "강한 달에는 보여주고 약한 달에는 다듬는 리듬을 만들면 연간 성과가 흔들리지 않는다."],
    advice: ["분기별 핵심 업무를 하나씩 정하라."],
    caution: ["인정 욕구 때문에 감당 못 할 일을 떠안지 말라."],
    checklist: ["분기 목표 작성", "발표·협상 달 배치", "업무 부담 상한선 설정"],
  }),
  money: interpretationBlock({
    id: "money-year-local",
    tags: ["money", "spending"],
    weight: 1,
    title: "수입과 소비의 질서를 세우는 해",
    summary: "재물운은 기회의 크기보다 관리의 지속성에서 안정된다.",
    body: ["올해 돈은 들어오는 흐름과 나가는 흐름을 함께 봐야 한다.", "좋은 달에는 수익 구조를 키우고 약한 달에는 비용과 계약을 점검하면 재물운의 진폭을 줄일 수 있다."],
    advice: ["월별 수입과 지출을 한 표에 정리하라."],
    caution: ["기분 전환 소비가 반복되면 좋은 운도 새어 나간다."],
    checklist: ["고정비 점검", "투자 상한선 설정", "비상금 확보"],
  }),
  relationship: interpretationBlock({
    id: "relationship-year-local",
    tags: ["relationship", "love"],
    weight: 1,
    title: "관계의 온도와 경계를 조율하는 해",
    summary: "관계운은 들어오는 인연보다 내가 어떤 태도로 관계를 유지하는지에서 갈린다.",
    body: ["올해는 가까워지는 사람과 멀어지는 사람이 함께 드러날 수 있다.", "합의 흐름은 연결을 만들고 충의 흐름은 경계를 다시 묻게 하므로, 관계의 속도보다 신뢰의 질을 살펴야 한다."],
    advice: ["중요한 관계에는 기대와 역할을 말로 분명히 하라."],
    caution: ["상대의 반응을 시험하듯 대하지 말라."],
    checklist: ["관계 기대치 정리", "갈등 대화 문장 준비", "신뢰 행동 기록"],
  }),
  health: interpretationBlock({
    id: "health-year-local",
    tags: ["health", "rhythm"],
    weight: 1,
    title: "생활 리듬이 운의 체력을 만드는 해",
    summary: "건강운은 세운 오행과 월별 강약에 따라 피로가 쌓이는 방식을 읽는 데서 시작된다.",
    body: ["올해 몸의 신호는 큰 사건보다 반복되는 피로, 수면, 소화, 긴장 패턴으로 먼저 나타날 수 있다.", "좋은 달에도 과열을 조심하고 약한 달에는 회복을 일정에 넣어야 한다."],
    advice: ["수면, 식사, 움직임 중 하나를 핵심 루틴으로 고정하라."],
    caution: ["버티는 힘을 건강운으로 착각하지 말라."],
    checklist: ["수면 시간 기록", "주의 달 휴식 예약", "반복 증상 메모"],
  }),
  routine12: interpretationBlock({
    id: "twelve-month-action-routine",
    tags: ["routine", "monthly", "action"],
    weight: 1,
    title: "12개월 실천 루틴",
    summary: "한 해의 운을 실제 결과로 바꾸려면 매달 같은 기준으로 점검해야 한다.",
    body: ["매월 초에는 이번 달의 기회 한 가지와 조심할 것 한 가지를 적는다.", "매월 말에는 돈, 관계, 건강, 일의 결과를 짧게 기록해 다음 달의 선택 기준으로 삼는다."],
    advice: ["월초 계획과 월말 회고를 같은 양식으로 반복하라."],
    caution: ["기분에 따라 기준을 매달 바꾸면 흐름을 읽기 어렵다."],
    checklist: ["월초 기회 1개 기록", "월초 주의 1개 기록", "월말 4영역 회고"],
  }),
});

function normalizeAnnualFortunePillar(pillar = {}) {
  return compactNewYearObject({
    stem: clean(pillar?.stem),
    branch: clean(pillar?.branch),
    label: clean(pillar?.label || `${clean(pillar?.stem)}${clean(pillar?.branch)}`),
    element: clean(pillar?.element),
    elementKo: clean(pillar?.elementKo),
  });
}

function getAnnualFortuneChapterId(chapterSpec = {}) {
  return ANNUAL_FORTUNE_CHAPTER_ID_BY_NO[Number(chapterSpec?.no || 0)] || `chapter_${Number(chapterSpec?.no || 0) || "unknown"}`;
}

function getYearlySajuPdfConfig() {
  return YEARLY_SAJU_PDF_CONFIG;
}

function annualFortuneLlmEnabled(env = {}) {
  const config = getYearlySajuPdfConfig(env);
  return config.generationMode !== "local" && config.llmEnabled === true && config.provider !== "none" && readBooleanFlag(env, ANNUAL_FORTUNE_LLM_ENHANCEMENT_ENV, false);
}

function annualFortuneQuarterlyLlmEnabled(env = {}) {
  if (!annualFortuneLlmEnabled(env)) return false;
  return readBooleanFlag(env, ANNUAL_FORTUNE_QUARTERLY_LLM_ENV, false);
}

function annualFortuneLlmCacheEnabled(env = {}) {
  if (!annualFortuneLlmEnabled(env)) return false;
  return readBooleanFlag(env, ANNUAL_FORTUNE_LLM_CACHE_ENV, false);
}

function shouldEnhanceAnnualFortuneChapter(chapterSpec = {}, env = {}) {
  if (!annualFortuneLlmEnabled(env)) return false;
  const chapterId = getAnnualFortuneChapterId(chapterSpec);
  if (ANNUAL_FORTUNE_LLM_ENHANCED_CHAPTERS.includes(chapterId)) return true;
  if (ANNUAL_FORTUNE_OPTIONAL_QUARTERLY_LLM_CHAPTERS.includes(chapterId)) return annualFortuneQuarterlyLlmEnabled(env);
  return false;
}

function softenAnnualFortuneRiskText(value, targetYear) {
  let result = stripForbiddenText(value);
  for (const [pattern, replacement] of ANNUAL_FORTUNE_RISK_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  const year = Number(targetYear || 0);
  if (year >= 1900 && year <= 2100) {
    result = result.replace(/\b(19\d{2}|20\d{2}|21\d{2})년/g, (match, rawYear) => (
      Number(rawYear) === year ? match : `${year}년`
    ));
  }
  return result.replace(/\s{3,}/g, " ").trim();
}

function deriveAnnualFortuneDayMasterStrength(seed = {}) {
  const dayMaster = clean(seed?.saju?.dayMaster || seed?.saju?.pillars?.day?.stem || "戊");
  const element = STEM_ELEMENT[dayMaster] || LOCAL_STEM_ELEMENT[dayMaster] || "earth";
  const count = Number(seed?.saju?.fiveElements?.[element] || 0);
  if (count >= 3) return "강";
  if (count <= 1) return "약";
  return "중화";
}

function buildAnnualFortuneMonthlyPoint(item = {}, seed = {}) {
  const month = Number(item?.month || 0);
  const monthLabel = `${month || ""}월`;
  const tone = clean(item?.tone || toneFromScore(item?.finalScore || item?.score));
  const pillar = clean(item?.pillar?.label);
  const relation = clean(item?.relation);
  const decision = clean(item?.decision || decisionFromScore(item?.finalScore || item?.score));
  return compactNewYearObject({
    monthIndex: month,
    monthLabel,
    monthTheme: `${pillar} 월운 · ${tone} 운영`,
    monthPillar: normalizeAnnualFortunePillar(item?.pillar),
    monthTenGodForDayMaster: localTenGod(clean(seed?.saju?.dayMaster || "戊"), clean(item?.pillar?.stem || "甲")),
    elementImpact: {
      element: clean(item?.pillar?.element),
      elementKo: LOCAL_ELEMENT_KO[item?.pillar?.element] || ELEMENT_KO[item?.pillar?.element] || "",
      relation,
      baseScore: item?.baseScore,
      finalScore: item?.finalScore ?? item?.score,
      decision,
    },
    combinationsAndConflicts: [],
    themeKeywords: [pillar, tone, relation, decision].filter(Boolean),
    careerPoint: `${monthLabel}에는 ${tone} 리듬에 맞춰 업무 우선순위와 일정 밀도를 조절하는 편이 좋습니다.`,
    wealthPoint: `${monthLabel} 재물 흐름은 지출 속도와 계약 조건을 확인하며 보수적으로 관리하면 안정됩니다.`,
    relationshipPoint: `${monthLabel} 관계에서는 기대치를 먼저 말로 정리하고 약속의 범위를 좁혀 가는 방식이 유리합니다.`,
    healthLifestylePoint: `${monthLabel} 생활 리듬은 수면, 식사, 이동 일정을 무리하지 않게 배치하는 것이 핵심입니다.`,
    cautionPoint: decision === "STOP" ? "큰 결정을 서두르기보다 확인과 보완에 집중하세요." : "좋은 흐름이 있더라도 기록과 검토를 함께 두면 흔들림이 줄어듭니다.",
    actionGuide: clean(item?.advice || `${tone} 관점으로 한 달 계획을 조정하세요.`),
  });
}

function buildAnnualFortuneFacts(seed = {}) {
  const annual = seed?.saju?.annualLuck || {};
  const quantum = seed?.quantumMyeongri || seed?.saju?.quantumMyeongri || {};
  const monthly = Array.isArray(seed?.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  const relations = Array.isArray(seed?.saju?.relations?.branchRelations) ? seed.saju.relations.branchRelations : [];
  const usefulKeywords = Array.isArray(seed?.structure?.usefulGodKeywords) ? seed.structure.usefulGodKeywords.filter(Boolean) : [];
  return compactNewYearObject({
    productId: ANNUAL_FORTUNE_PRODUCT_ID,
    targetYear: Number(seed?.targetYear || annual?.year || 0),
    displayYearLabel: `${Number(seed?.targetYear || annual?.year || 0)}년`,
    calculationBasis: {
      yearBoundary: "existing_engine_basis",
      monthBoundary: "existing_engine_basis",
      usesSolarTerms: true,
      engineVersion: ANNUAL_FORTUNE_ENGINE_VERSION,
    },
    birthInfo: seed?.birthProfile || seed?.input,
    fourPillars: seed?.saju?.pillars,
    dayMaster: clean(seed?.saju?.dayMaster),
    dayMasterStrength: deriveAnnualFortuneDayMasterStrength(seed),
    fiveElementBalance: seed?.saju?.fiveElements,
    tenGods: seed?.saju?.tenGods,
    usefulGods: usefulKeywords,
    avoidGods: Array.isArray(quantum?.cautionElements) ? quantum.cautionElements : [],
    structureType: clean(seed?.structure?.geokguk),
    currentMajorLuckCycle: seed?.saju?.luckCycle,
    annualPillar: normalizeAnnualFortunePillar(annual),
    annualTenGodForDayMaster: clean(annual?.tenGod),
    annualElementImpact: {
      element: clean(annual?.element),
      elementKo: clean(annual?.elementKo),
      dayMasterRelation: clean(annual?.dayMasterRelation),
      quantum: annual?.quantum || quantum?.annualQuantum,
    },
    annualUsefulGodImpact: Array.isArray(quantum?.favorableElements) ? quantum.favorableElements.join("·") : "",
    annualAvoidGodImpact: Array.isArray(quantum?.cautionElements) ? quantum.cautionElements.join("·") : "",
    annualCombinationsAndConflicts: relations.map((row) => compactNewYearObject({
      type: row?.type,
      target: row?.target,
      message: row?.message,
    })),
    annualStars: [],
    annualThemeKeywords: seed?.luckCycles?.targetYearSewoon?.keywords || [annual?.label, annual?.tenGod, annual?.dayMasterRelation].filter(Boolean),
    careerFortune: seed?.derivedSignals?.careerSignals,
    wealthFortune: seed?.derivedSignals?.moneySignals,
    relationshipFortune: [
      ...(seed?.derivedSignals?.loveRelationshipSignals || []),
      ...(seed?.derivedSignals?.humanRelationSignals || []),
    ].slice(0, 8),
    healthLifestyleFortune: seed?.derivedSignals?.healthMindSignals,
    studyGrowthFortune: seed?.interpretationSeeds?.study || [],
    familySocialFortune: seed?.derivedSignals?.humanRelationSignals,
    riskWarnings: seed?.derivedSignals?.crisisSignals,
    opportunitySignals: seed?.derivedSignals?.opportunitySignals,
    monthlyFlows: monthly.map((item) => buildAnnualFortuneMonthlyPoint(item, seed)),
    quarterlyStrategy: seed?.interpretationSeeds?.monthly || [],
    annualStrategy: seed?.interpretationSeeds?.finalStrategy || [],
    doList: seed?.derivedSignals?.opportunitySignals || [],
    avoidList: seed?.derivedSignals?.crisisSignals || [],
  });
}

function buildAnnualFortuneLockedFacts(facts = {}, chapterSpec = {}) {
  const monthly = Array.isArray(facts?.monthlyFlows) ? facts.monthlyFlows : [];
  const goMonths = monthly.filter((item) => item?.elementImpact?.decision === "GO").map((item) => item.monthLabel).slice(0, 4);
  const stopMonths = monthly.filter((item) => item?.elementImpact?.decision === "STOP").map((item) => item.monthLabel).slice(0, 4);
  const base = [
    `대상 연도는 ${facts.displayYearLabel || `${facts.targetYear}년`}입니다.`,
    "계산 기준은 기존 서비스의 절기와 월운 기준을 그대로 따릅니다.",
    `일간은 ${facts.dayMaster || "확인 필요"}이고 일간 강약은 ${facts.dayMasterStrength || "중화"}입니다.`,
    `세운은 ${facts?.annualPillar?.label || "세운"}이며 일간 기준 십성은 ${facts.annualTenGodForDayMaster || "십성"}입니다.`,
    `세운과 일간의 관계는 ${facts?.annualElementImpact?.dayMasterRelation || "관계"}입니다.`,
    `월운은 1월부터 12월까지 ${monthly.length}개가 확정되어 있습니다.`,
  ];
  const chapterId = getAnnualFortuneChapterId(chapterSpec);
  if (/career/.test(chapterId)) base.push(...(facts.careerFortune || []).slice(0, 3));
  if (/wealth/.test(chapterId)) base.push(...(facts.wealthFortune || []).slice(0, 3));
  if (/relationship/.test(chapterId)) base.push(...(facts.relationshipFortune || []).slice(0, 3));
  if (/health/.test(chapterId)) base.push(...(facts.healthLifestyleFortune || []).slice(0, 3));
  if (/caution/.test(chapterId)) base.push(...(facts.riskWarnings || []).slice(0, 3));
  if (/master|overview/.test(chapterId)) base.push(...(facts.annualStrategy || []).slice(0, 3));
  if (goMonths.length) base.push(`기회가 강한 달은 ${goMonths.join("·")}입니다.`);
  if (stopMonths.length) base.push(`조심할 달은 ${stopMonths.join("·")}입니다.`);
  return base.map(stripForbiddenText).filter(Boolean);
}

function buildAnnualFortuneChapterPlans(seed = {}, chapterSpecs = []) {
  const facts = seed?.annualFortuneFacts || buildAnnualFortuneFacts(seed);
  const specs = Array.isArray(chapterSpecs) && chapterSpecs.length ? chapterSpecs : buildSajuNewYearChapterSpecs(seed?.targetYear || resolveDefaultTargetYear());
  return specs.map((chapterSpec) => {
    const chapterId = getAnnualFortuneChapterId(chapterSpec);
    const local = buildDeterministicChapterFromSpec(seed, chapterSpec, "annual_fortune_plan_local_draft");
    return compactNewYearObject({
      chapterId,
      chapterTitle: clean(chapterSpec?.title),
      targetYear: facts.targetYear,
      purpose: `${clean(chapterSpec?.title)}에서 확정된 세운·월운·원국 근거를 독자가 이해할 수 있는 상담문으로 풀어냅니다.`,
      lockedFacts: buildAnnualFortuneLockedFacts(facts, chapterSpec),
      interpretationPoints: (chapterSpec?.categories || []).map((title, index) => `${index + 1}. ${title}`).concat((facts.annualThemeKeywords || []).slice(0, 4)),
      warnings: [
        "사주 계산, 세운 계산, 월운 계산을 새로 하지 않습니다.",
        "lockedFacts와 충돌하는 문장을 쓰지 않습니다.",
        "건강·금전·관계·직업 결과를 단정적으로 예언하지 않습니다.",
        "월별 운세는 제공된 12개월 월운을 벗어나 임의 생성하지 않습니다.",
      ],
      recommendedTone: "전문적이고 신비로운 프리미엄 신년운세 상담체",
      localDraft: local.text,
    });
  });
}

function buildAnnualFortuneLlmCacheKey(facts = {}, chapterPlan = {}) {
  return [
    ANNUAL_FORTUNE_PRODUCT_ID,
    `targetYear:${facts.targetYear}`,
    `birth:${hashAnnualFortuneValue(facts.birthInfo || {})}`,
    `engine:${ANNUAL_FORTUNE_ENGINE_VERSION}`,
    `prompt:${ANNUAL_FORTUNE_PROMPT_VERSION}`,
    `chapter:${clean(chapterPlan.chapterId)}`,
    `basis:${hashAnnualFortuneValue(facts.calculationBasis || {})}`,
  ].join("|");
}

function buildAnnualFortunePersistentCacheExecutionKey(cacheKey) {
  return `ny-ch:${hashAnnualFortuneValue(cacheKey)}`;
}

function rememberAnnualFortuneLlmCache(key, chapter) {
  if (!clean(key) || !chapter) return;
  annualFortuneLlmCache.set(key, cloneNewYearValue(chapter));
  while (annualFortuneLlmCache.size > ANNUAL_FORTUNE_CACHE_LIMIT) {
    const oldest = annualFortuneLlmCache.keys().next().value;
    annualFortuneLlmCache.delete(oldest);
  }
}

async function findAnnualFortunePersistentChapterCache(env = {}, userId, cacheKey) {
  if (!annualFortuneLlmCacheEnabled(env) || !userId || !clean(cacheKey)) return null;
  try {
    await connectDb(withPdfFastDbEnv(env));
    const doc = await ServiceExecutionTransaction.findOne({
      userId,
      executionKey: buildAnnualFortunePersistentCacheExecutionKey(cacheKey),
      reportType: ANNUAL_FORTUNE_CHAPTER_CACHE_REPORT_TYPE,
      status: "success",
      premiumStatus: "completed",
    }).lean();
    const metadata = doc?.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
    if (clean(metadata.cacheKey) !== clean(cacheKey)) return null;
    if (clean(metadata.promptVersion) !== ANNUAL_FORTUNE_PROMPT_VERSION) return null;
    if (clean(metadata.engineVersion) !== ANNUAL_FORTUNE_ENGINE_VERSION) return null;
    const chapter = metadata.chapter && typeof metadata.chapter === "object" ? metadata.chapter : null;
    if (!chapter || !Array.isArray(chapter.sections)) return null;
    return cloneNewYearValue(chapter);
  } catch (error) {
    console.warn("[NewYearPremiumPDF][AnnualFortuneChapterCacheReadFailed]", {
      reason: clean(error?.message || error),
    });
    return null;
  }
}

async function rememberAnnualFortunePersistentChapterCache(env = {}, userId, cacheKey, chapter, extra = {}) {
  if (!annualFortuneLlmCacheEnabled(env) || !userId || !clean(cacheKey) || !chapter) return false;
  try {
    await connectDb(withPdfFastDbEnv(env));
    const now = new Date();
    const ttlDays = clamp(Number(env?.ANNUAL_FORTUNE_LLM_CACHE_TTL_DAYS || ANNUAL_FORTUNE_CHAPTER_CACHE_TTL_DAYS), 1, 365);
    const retentionUntil = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);
    const executionKey = buildAnnualFortunePersistentCacheExecutionKey(cacheKey);
    await ServiceExecutionTransaction.findOneAndUpdate(
      { userId, executionKey },
      {
        $set: {
          reportType: ANNUAL_FORTUNE_CHAPTER_CACHE_REPORT_TYPE,
          reportId: executionKey,
          sessionId: executionKey,
          featureKey: FEATURE_KEY,
          cost: 0,
          status: "success",
          premiumStatus: "completed",
          completedAt: now,
          generationCompletedAt: now,
          timeoutAt: retentionUntil,
          retentionUntil,
          metadata: {
            cacheKind: "saju-new-year-annual-fortune-chapter",
            productId: ANNUAL_FORTUNE_PRODUCT_ID,
            cacheKey,
            promptVersion: ANNUAL_FORTUNE_PROMPT_VERSION,
            engineVersion: ANNUAL_FORTUNE_ENGINE_VERSION,
            chapter: cloneNewYearValue(chapter),
            ...compactNewYearObject(extra),
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    return true;
  } catch (error) {
    console.warn("[NewYearPremiumPDF][AnnualFortuneChapterCacheWriteFailed]", {
      reason: clean(error?.message || error),
    });
    return false;
  }
}

function pickNewYearGeminiModels(env = {}) {
  return Array.from(new Set([
    env?.PREMIUM_SAJU_NEW_YEAR_GEMINI_MODEL,
    env?.PREMIUM_GEMINI_MODEL,
    env?.GEMINI_MODEL,
    "gemini-2.5-flash",
  ].map((model) => clean(model)).filter(Boolean)));
}

function compactNewYearLocks(now = Date.now()) {
  for (const [key, lock] of newYearPdfLocks.entries()) {
    const startedAtMs = Number(lock?.startedAtMs || 0);
    if (!startedAtMs || now - startedAtMs > NEW_YEAR_PDF_LOCK_TTL_MS) {
      newYearPdfLocks.delete(key);
    }
  }
}

function resolveDefaultTargetYear() {
  const now = new Date();
  return now.getFullYear() + 1;
}

function parseBirthDateParts(raw) {
  const token = clean(raw);
  if (!token) return null;

  const standard = token.match(/^(\d{4})[-./\s](\d{1,2})[-./\s](\d{1,2})$/);
  if (standard) {
    return {
      year: toInt(standard[1], 0),
      month: toInt(standard[2], 0),
      day: toInt(standard[3], 0),
    };
  }

  const compact = token.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    return {
      year: toInt(compact[1], 0),
      month: toInt(compact[2], 0),
      day: toInt(compact[3], 0),
    };
  }
  return null;
}

function parseBirthTime(rawTime, rawHour, rawMinute) {
  const text = clean(rawTime).toLowerCase();
  const unknownTokens = ["모름", "시간 모름", "unknown", "미상", "na", "n/a", "없음"];
  if (unknownTokens.some((token) => text.includes(token))) {
    return { isTimeUnknown: true, birthHour: null, birthMinute: null, birthTime: "" };
  }

  const branchHourMap = { 자: 23, 축: 1, 인: 3, 묘: 5, 진: 7, 사: 9, 오: 11, 미: 13, 신: 15, 유: 17, 술: 19, 해: 21 };
  const branchMatch = text.match(/([자축인묘진사오미신유술해])\s*시/);
  if (branchMatch && branchHourMap[branchMatch[1]] !== undefined) {
    return {
      isTimeUnknown: false,
      birthHour: branchHourMap[branchMatch[1]],
      birthMinute: 0,
      birthTime: `${pad2(branchHourMap[branchMatch[1]])}:00`,
    };
  }

  let hour = Number.isFinite(Number(rawHour)) ? clamp(rawHour, 0, 23) : null;
  let minute = Number.isFinite(Number(rawMinute)) ? clamp(rawMinute, 0, 59) : 0;

  const hm = text.match(/(?:오전|오후)?\s*(\d{1,2})\s*(?::|시)\s*(\d{1,2})?\s*(?:분)?/);
  if (hm) {
    hour = toInt(hm[1], 0);
    minute = hm[2] === undefined ? 0 : toInt(hm[2], 0);
  }

  const hourOnly = text.match(/^(\d{1,2})\s*시?$/);
  if (hourOnly && hour === null) {
    hour = toInt(hourOnly[1], 0);
    minute = 0;
  }

  if (text.includes("오후") && hour !== null && hour < 12) hour += 12;
  if (text.includes("오전") && hour === 12) hour = 0;
  if (hour !== null && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
    return { isTimeUnknown: false, birthHour: hour, birthMinute: minute, birthTime: `${pad2(hour)}:${pad2(minute)}` };
  }

  return { isTimeUnknown: true, birthHour: null, birthMinute: null, birthTime: "" };
}

function normalizeInput(body = {}) {
  const directBirthInput = body.birthInput && typeof body.birthInput === "object" ? body.birthInput : {};
  if (Object.keys(directBirthInput).length) {
    body = {
      ...body,
      ...directBirthInput,
      birthDate: directBirthInput.birthDate || directBirthInput.date || body.birthDate,
      birthTime: directBirthInput.birthTime || directBirthInput.time || body.birthTime,
      birthYear: directBirthInput.birthYear || directBirthInput.year || body.birthYear,
      birthMonth: directBirthInput.birthMonth || directBirthInput.month || body.birthMonth,
      birthDay: directBirthInput.birthDay || directBirthInput.day || body.birthDay,
      birthHour: directBirthInput.birthHour ?? directBirthInput.hour ?? body.birthHour,
      birthMinute: directBirthInput.birthMinute ?? directBirthInput.minute ?? body.birthMinute,
      birthPlace: directBirthInput.birthPlace || directBirthInput.place || body.birthPlace,
      calendarType: directBirthInput.calendarType || directBirthInput.calendar || body.calendarType,
      timezone: directBirthInput.timezone || body.timezone,
      latitude: directBirthInput.latitude ?? body.latitude,
      longitude: directBirthInput.longitude ?? directBirthInput.lng ?? body.longitude,
    };
  }
  const profile = body.profile && typeof body.profile === "object" ? body.profile : {};
  const birth = profile.birth && typeof profile.birth === "object" ? profile.birth : {};
  const birthDateRaw = clean(
    directBirthInput.birthDate
    || directBirthInput.date
    || body.birthDate
    || body.birthday
    || body.solarDate
    || body.lunarDate
    || body.date
    || body.dob
    || profile.birthDate
    || birth.birthDate
    || birth.date,
  );
  const parts = parseBirthDateParts(birthDateRaw) || {};
  const year = toInt(directBirthInput.birthYear || directBirthInput.year || body.birthYear || body.year || birth.year || parts.year, 0);
  const month = toInt(directBirthInput.birthMonth || directBirthInput.month || body.month || body.birthMonth || birth.month || parts.month, 0);
  const day = toInt(directBirthInput.birthDay || directBirthInput.day || body.day || body.birthDay || birth.day || parts.day, 0);
  const timeInfo = parseBirthTime(
    directBirthInput.birthTime || directBirthInput.time || body.birthTime || body.time || body.timeText || body.hourText || profile.birthTime || birth.birthTime,
    directBirthInput.hour ?? directBirthInput.birthHour ?? body.hour ?? body.birthHour ?? body.birth_hour ?? birth.hour,
    directBirthInput.minute ?? directBirthInput.birthMinute ?? body.minute ?? body.birthMinute ?? birth.minute,
  );

  const targetYear = toInt(
    body.targetYear || body.selectedYear || body.fortuneYear || body.target_year,
    resolveDefaultTargetYear(),
  );

  if (!year || !month || !day) {
    return { ok: false, code: "MISSING_BIRTH", message: "정확한 신년운세 계산을 위해 생년월일시 정보를 확인해 주세요." };
  }
  if (!targetYear || targetYear < 1900 || targetYear > 2100) return { ok: false, code: "INVALID_TARGET_YEAR", message: "신년운세를 볼 대상 연도를 선택해 주세요." };

  const name = clean(body.name || profile.name || profile.userName) || "사용자";
  const genderRaw = clean(body.gender || body.sex || profile.gender || profile.sex || "").toLowerCase();
  const gender = genderRaw === "f" || genderRaw.includes("female") || genderRaw.includes("여") ? "female" : genderRaw === "m" || genderRaw.includes("male") || genderRaw.includes("남") ? "male" : "unknown";
  const calendarRaw = clean(body.calendarType || body.calendar || birth.calendarType || birth.calType || profile.calendarType || "solar").toLowerCase();
  const calendarType = calendarRaw.includes("lunar") || calendarRaw.includes("음")
    ? (calendarRaw.includes("leap") || calendarRaw.includes("윤") ? "lunar_leap" : "lunar")
    : calendarRaw.includes("solar") || calendarRaw.includes("양")
      ? "solar"
      : "unknown";
  const latitudeRaw = Number(body.latitude ?? profile.latitude ?? birth.latitude ?? 37.5665);
  const longitudeRaw = Number(body.longitude ?? body.lng ?? profile.longitude ?? profile.lng ?? birth.longitude ?? birth.lng ?? 126.978);
  const latitude = clamp(latitudeRaw, -90, 90);
  const longitude = clamp(longitudeRaw, -180, 180);
  const birthPlace = clean(body.birthPlace || body.place || profile.birthPlace || profile.place || birth.birthPlace || birth.place || "대한민국") || "대한민국";
  const birthInput = {
    name,
    gender,
    calendarType,
    birthDate: `${year}-${pad2(month)}-${pad2(day)}`,
    birthYear: year,
    birthMonth: month,
    birthDay: day,
    birthTime: timeInfo.birthTime,
    birthHour: timeInfo.birthHour,
    birthMinute: timeInfo.birthMinute,
    timezone: clean(body.timezone || profile.timezone || birth.timezone || "Asia/Seoul") || "Asia/Seoul",
    latitude,
    longitude,
    birthPlace,
    isTimeUnknown: Boolean(timeInfo.isTimeUnknown),
  };

  return {
    ok: true,
    birthInput,
    profile: {
      name: birthInput.name,
      gender: birthInput.gender,
      birth: {
        year: birthInput.birthYear,
        month: birthInput.birthMonth,
        day: birthInput.birthDay,
        hour: birthInput.birthHour === null ? 12 : clamp(birthInput.birthHour, 0, 23),
        minute: birthInput.birthMinute === null ? 0 : clamp(birthInput.birthMinute, 0, 59),
        calendarType,
        timezone: birthInput.timezone,
        birthPlace,
        latitude,
        longitude,
        unknownTime: birthInput.isTimeUnknown,
      },
      calendarType,
      timezone: birthInput.timezone,
      location: {
        name: birthPlace,
        latitude,
        longitude,
        timezone: birthInput.timezone,
      },
    },
    targetYear,
  };
}

function sexagenaryYear(year) {
  const index = ((toInt(year, 1984) - 1984) % 60 + 60) % 60;
  return { stem: STEMS[index % 10], branch: BRANCHES[index % 12], label: `${STEMS[index % 10]}${BRANCHES[index % 12]}` };
}

function monthPillar(targetYear, month) {
  const yearStemIndex = STEMS.indexOf(sexagenaryYear(targetYear).stem);
  const firstMonthStemIndex = ((yearStemIndex % 5) * 2 + 2) % 10;
  const stem = STEMS[(firstMonthStemIndex + month - 1) % 10];
  const branch = MONTH_BRANCHES[(month - 1) % 12];
  return { month, stem, branch, label: `${stem}${branch}`, element: BRANCH_ELEMENT[branch] || STEM_ELEMENT[stem] || "earth" };
}

function elementRelation(dayElement, otherElement) {
  if (!dayElement || !otherElement) return "중립";
  if (dayElement === otherElement) return "동기 공명";
  if (GENERATES[dayElement] === otherElement) return "표현과 생산";
  if (GENERATES[otherElement] === dayElement) return "지원과 회복";
  if (CONTROLS[dayElement] === otherElement) return "관리와 재물";
  if (CONTROLS[otherElement] === dayElement) return "압박과 책임";
  return "중립";
}

function tenGod(dayStem, otherStem) {
  const dayElement = STEM_ELEMENT[dayStem];
  const otherElement = STEM_ELEMENT[otherStem];
  const samePolarity = STEM_YINYANG[dayStem] === STEM_YINYANG[otherStem];
  if (!dayElement || !otherElement) return "미정";
  if (dayElement === otherElement) return samePolarity ? "비견" : "겁재";
  if (GENERATES[dayElement] === otherElement) return samePolarity ? "식신" : "상관";
  if (CONTROLS[dayElement] === otherElement) return samePolarity ? "편재" : "정재";
  if (CONTROLS[otherElement] === dayElement) return samePolarity ? "편관" : "정관";
  if (GENERATES[otherElement] === dayElement) return samePolarity ? "편인" : "정인";
  return "미정";
}

function relationRows(pillars, annualBranch) {
  const rows = [];
  const natal = [
    ["년지", pillars?.year?.branch],
    ["월지", pillars?.month?.branch],
    ["일지", pillars?.day?.branch],
    ["시지", pillars?.hour?.branch],
  ].filter(([, branch]) => branch);

  for (const [label, branch] of natal) {
    if (BRANCH_COMBOS[annualBranch] === branch) rows.push({ type: "합", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 합을 이루어 협력과 연결성이 강해집니다.` });
    if (BRANCH_CLASHES[annualBranch] === branch) rows.push({ type: "충", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 충을 이루어 이동, 변화, 결단 압력이 커집니다.` });
    if (BRANCH_HARMS[annualBranch] === branch) rows.push({ type: "해", label, branch, message: `${label} ${branch}와 세운 ${annualBranch} 사이에 해가 있어 관계의 미세한 오해를 관리해야 합니다.` });
    if (BRANCH_BREAKS[annualBranch] === branch) rows.push({ type: "파", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 파를 이루어 계획 변경과 약속 관리가 중요합니다.` });
  }
  return rows;
}

function normalizeEngineSaju(profile, body = {}) {
  let engine = null;
  try {
    const baseLocation = profile?.location && typeof profile.location === "object" ? profile.location : {};
    const location = {
      name: clean(baseLocation.name || profile?.birth?.birthPlace || "대한민국") || "대한민국",
      latitude: Number.isFinite(Number(baseLocation.latitude)) ? Number(baseLocation.latitude) : Number(profile?.birth?.latitude || 37.5665),
      longitude: Number.isFinite(Number(baseLocation.longitude)) ? Number(baseLocation.longitude) : Number(profile?.birth?.longitude || 126.978),
      timezone: clean(profile.timezone || profile?.birth?.timezone || "Asia/Seoul") || "Asia/Seoul",
    };
    engine = buildSajuProfile({
      name: profile.name,
      gender: profile.gender,
      birth: profile.birth,
      calendarType: profile.calendarType,
      timezone: profile.timezone || "Asia/Seoul",
      location,
      hourPillarTimePolicy: clean(body?.hourPillarTimePolicy || profile?.hourPillarTimePolicy || "TRUE_SOLAR_TIME") || "TRUE_SOLAR_TIME",
      dayChangePolicy: clean(body?.dayChangePolicy || profile?.dayChangePolicy || "MIDNIGHT") || "MIDNIGHT",
    });
  } catch (error) {
    console.error("[NewYearBook][LocalSajuEngineFailed]", {
      message: clean(error?.message || error),
      birth: profile.birth,
    });
  }

  if (!engine?.pillars?.day?.stem || !engine?.pillars?.month?.branch) {
    const err = new Error("신년운세 PDF 생성을 위한 사주 원국 계산에 실패했습니다.");
    err.code = "SAJU_LOCAL_ENGINE_FAILED";
    err.status = 422;
    throw err;
  }

  const sajuBase = body.sajuBase && typeof body.sajuBase === "object" ? body.sajuBase : {};
  const pillars = engine.pillars;
  const dayMaster = clean(engine.dayMaster?.stem || engine.pillars.day?.stem);
  const fiveElements = engine.fiveElements || {};
  const tenGods = engine.tenGods || {};
  const usefulGods = engine.usefulGods || {};
  const daeun = Array.isArray(engine.daeun)
    ? engine.daeun
    : (Array.isArray(sajuBase?.timing?.daeun) ? sajuBase.timing.daeun : []);

  return { engine, pillars, dayMaster, fiveElements, tenGods, usefulGods, daeun };
}

function dominantElement(fiveElements = {}, fallback = "earth") {
  const source = fiveElements.scores || fiveElements.counts || fiveElements.ratio || fiveElements;
  const keys = ["wood", "fire", "earth", "metal", "water"];
  return keys.slice().sort((a, b) => Number(source?.[b] || 0) - Number(source?.[a] || 0))[0] || fallback;
}

function buildMonthlyLuck(targetYear, dayStem) {
  const dayElement = STEM_ELEMENT[dayStem] || "earth";
  return Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const pillar = monthPillar(targetYear, month);
    const relation = elementRelation(dayElement, pillar.element);
    const score = clamp(62 + (relation === "지원과 회복" ? 12 : relation === "표현과 생산" ? 8 : relation === "관리와 재물" ? 6 : relation === "압박과 책임" ? -7 : 2) + ((month * 7 + targetYear) % 9), 38, 92);
    const tone = score >= 75 ? "확장" : score >= 60 ? "정비" : "보수";
    return { month, pillar, relation, score: Math.round(score), tone, advice: `${month}월은 ${pillar.label} ${ELEMENT_KO[pillar.element] || "토"} 기운이 두드러져 ${tone} 관점으로 일정을 운영하는 것이 좋습니다.` };
  });
}

// ── 십성별 신년운세 해석 라이브러리 ───────────────────────────────
const SAJU_YEARLY_TEN_GOD_LIBRARY = {
  "비견": {
    yearlyTheme: "이 해는 나의 기준과 자립심이 더 선명하게 드러나는 시기입니다. 스스로 결정하고 스스로 책임지는 흐름이 강해지며, 그 과정에서 경쟁과 자기 확인의 압력도 함께 찾아옵니다.",
    money: "재물의 흐름은 한 번에 큰 덩어리로 들어오기보다 내가 직접 생산하고 제공하는 방식으로 움직입니다. 가격, 서비스, 역할을 스스로 정할수록 수익의 안정성이 높아집니다. 다만 경쟁 구도에서 지나치게 가격을 낮추거나 자신을 과소평가하면 재물운이 새어나갈 수 있습니다.",
    career: "일에서는 나의 능력을 직접 보여주는 방식이 유리합니다. 팀보다 개인 성과가 평가 기준이 되는 자리, 또는 자신만의 전문 영역을 키우는 방향으로 에너지를 써야 성과가 납니다.",
    relationship: "가까운 사람과 동등한 관계를 원하지만 비교와 경쟁심이 의도치 않게 작동할 수 있습니다. 사랑에서도 자존심보다 공감이 먼저 필요한 순간을 인식하는 것이 중요합니다.",
    health: "자신을 몰아붙이는 에너지가 강해져 과로와 긴장이 반복될 수 있습니다. 규칙적인 수면과 혼자 있는 회복 시간이 이 해의 건강운을 지키는 핵심입니다.",
    caution: "경쟁심이 지나치면 협력의 기회를 놓칩니다. 내 기준만 옳다는 태도가 관계를 좁히지 않도록 주의하세요.",
    advice: "독립성을 강점으로 쓰되, 혼자 다 하려는 고집을 내려놓는 것이 이 해를 풍요롭게 만드는 첫 번째 선택입니다.",
  },
  "겁재": {
    yearlyTheme: "이 해는 경쟁과 변동의 에너지가 강하게 작동합니다. 같은 자리를 두고 누군가와 부딪히는 상황이 생기거나, 내가 원하던 기회가 예상치 못한 방식으로 흔들릴 수 있습니다.",
    money: "재물의 흐름이 예측하기 어렵게 움직입니다. 큰 수익을 노리다 오히려 손실이 생기거나, 믿었던 수입원이 흔들릴 수 있으므로 분산 관리와 비상 자금 확보가 필요합니다.",
    career: "일에서의 경쟁이 심해지는 시기입니다. 남과 비교하기보다 나만의 차별점을 명확히 하고, 성과 구조를 선명하게 정의해야 인정받을 수 있습니다.",
    relationship: "가까운 관계에서 이해충돌이나 감정 충돌이 생길 수 있습니다. 말의 온도를 조절하고 역할 경계를 먼저 정리하는 것이 갈등을 줄이는 방법입니다.",
    health: "신경과 근육이 긴장하기 쉬운 구조입니다. 감정의 소모를 줄이고 뇌와 몸의 회복 루틴을 의도적으로 만들어야 합니다.",
    caution: "충동적인 결정, 갑작스러운 지출, 보증과 대출은 이 해에 특히 신중해야 합니다.",
    advice: "변동성을 기회로 삼으려면 먼저 내 기반을 단단히 다져야 합니다. 흔들리지 않는 중심이 이 해의 가장 큰 자산입니다.",
  },
  "식신": {
    yearlyTheme: "이 해는 자신의 재능과 표현이 현실로 펼쳐지는 흐름이 강합니다. 내가 가진 것을 밖으로 드러낼수록 기회가 열리며, 창의성과 생산성이 함께 높아지는 시기입니다.",
    money: "재물은 내가 만들어낸 것, 제공한 것에 비례해 들어오는 구조입니다. 콘텐츠, 기술, 서비스, 상품처럼 표현과 생산의 형태로 수익 구조를 키울수록 재물운이 살아납니다.",
    career: "전문성과 창의성을 발휘하는 분야에서 두드러진 성과를 낼 수 있습니다. 기획, 교육, 상담, 콘텐츠, 아이디어 기반 업무에서 강점이 나타납니다.",
    relationship: "여유와 따뜻함이 관계를 부드럽게 만드는 해입니다. 다만 지나치게 주기만 하다 보면 소진될 수 있으니, 받는 것에도 편안해지는 연습이 필요합니다.",
    health: "몸과 마음이 비교적 안정되지만, 즐거움을 위해 과식하거나 지나치게 편안함을 추구하다 보면 생활 리듬이 흐트러질 수 있습니다.",
    caution: "너무 여유로운 태도가 기회를 놓치게 만들 수 있습니다. 편안함 속에서도 실행을 놓치지 않는 것이 중요합니다.",
    advice: "내가 즐기면서 할 수 있는 일이 이 해에는 가장 큰 성과를 냅니다. 억지로 하는 일보다 자연스럽게 흘러나오는 표현에 투자하세요.",
  },
  "상관": {
    yearlyTheme: "이 해는 기존의 틀을 깨고 새로운 방식으로 나아가는 에너지가 강합니다. 말과 표현이 기회가 되기도 하고, 기존 관계나 구조와의 충돌 원인이 되기도 합니다.",
    money: "재물은 창의적인 방식, 새로운 아이디어, 기존과 다른 접근법으로 열립니다. 다만 실행력이 뒷받침되지 않으면 아이디어만 남고 수익은 생기지 않을 수 있습니다.",
    career: "변화와 혁신이 필요한 자리에서 강점이 발휘됩니다. 기존 질서를 따르기보다 새로운 방법을 제시하는 역할이 잘 맞으며, 창업이나 독립적인 프로젝트에도 좋은 시기입니다.",
    relationship: "말과 표현이 풍부하지만 날카로울 수 있습니다. 가까운 사람에게 정확한 말이 차갑게 들릴 수 있으므로, 상대의 감정 리듬을 먼저 파악한 후 대화를 시작하는 것이 필요합니다.",
    health: "신경 소모와 산만함이 건강의 약점이 될 수 있습니다. 생각과 계획이 과잉되면 수면의 질이 떨어지므로, 하루를 정리하는 시간을 의도적으로 만들어야 합니다.",
    caution: "날카로운 말, 기존 체계와의 충돌, 감정적 발언이 관계와 기회를 동시에 잃게 만들 수 있습니다.",
    advice: "표현력을 강점으로 쓰되, 관계 안에서는 결론보다 과정을 먼저 보여주는 방식으로 소통하면 갈등 없이 영향력을 키울 수 있습니다.",
  },
  "편재": {
    yearlyTheme: "이 해는 다양한 기회와 가능성이 열리는 흐름입니다. 사람, 돈, 정보가 활발하게 움직이며 넓은 무대에서 활동하는 힘이 강해집니다.",
    money: "재물이 다양한 방향으로 들어오지만 지출도 함께 커지는 구조입니다. 넓게 쓸수록 손이 열리는 만큼 관리가 중요하며, 투자와 고정 수익의 균형을 맞춰야 합니다.",
    career: "영업, 유통, 중개, 네트워크 기반 업무에서 성과가 강합니다. 사람을 통해 기회가 열리는 시기이므로 인맥 관리와 협업 구조 설계가 핵심 전략입니다.",
    relationship: "만남이 많아지고 다양한 인연이 들어오는 시기입니다. 새로운 사람에 대한 매력이 강해지지만 깊이보다 넓이를 쫓다 보면 진짜 관계를 놓칠 수 있습니다.",
    health: "활동량이 많아지면서 에너지 소모가 커집니다. 과식, 음주, 불규칙한 생활이 체력 저하로 이어질 수 있으니 기본 루틴을 지키는 것이 중요합니다.",
    caution: "충동적인 투자, 과도한 지출, 큰 판에 대한 욕심이 재물을 흩어지게 만들 수 있습니다.",
    advice: "기회를 모두 잡으려 하기보다 가장 현실성 있는 한두 가지를 선택하고 깊이 파고드는 것이 이 해의 재물운을 키우는 방법입니다.",
  },
  "정재": {
    yearlyTheme: "이 해는 안정적이고 실질적인 성과를 차근차근 만들어가는 흐름이 강합니다. 일관된 노력이 현실적인 결과로 이어지는 시기이며, 기반을 다지는 것이 핵심입니다.",
    money: "꾸준한 수입이 늘어나는 구조입니다. 고정수익, 월급, 장기 계약처럼 안정된 구조에서 재물운이 강하게 살아납니다. 섣부른 투자보다 이미 가진 수입 구조를 다지는 것이 더 유리합니다.",
    career: "성실함과 전문성이 인정받는 시기입니다. 조직 안에서 꾸준히 성과를 쌓거나, 안정적인 클라이언트 기반을 확장하는 방향이 커리어에 긍정적으로 작동합니다.",
    relationship: "신뢰와 안정감을 중요하게 여기는 관계가 깊어지는 해입니다. 결혼이나 진지한 만남의 흐름이 강해질 수 있으며, 생활 조건과 책임에 대한 대화가 관계를 견고하게 만듭니다.",
    health: "큰 이상은 없지만 과로가 누적될 수 있습니다. 규칙적인 생활 리듬이 이 해의 건강을 지키는 가장 효과적인 방법입니다.",
    caution: "지나치게 보수적인 태도가 성장의 기회를 놓치게 만들 수 있습니다. 안전만 추구하다 보면 확장의 타이밍을 잃습니다.",
    advice: "지금 당신이 가진 것의 가치를 정확히 알고, 그것을 더 단단하게 만드는 것이 이 해의 가장 강력한 전략입니다.",
  },
  "편관": {
    yearlyTheme: "이 해는 압박과 도전이 강해지는 동시에 그것을 이겨낼 때 가장 큰 성장이 일어나는 시기입니다. 외부의 요구와 책임이 커지지만, 그 무게를 받아내는 힘도 함께 올라옵니다.",
    money: "재물 흐름은 안정보다 변동성이 큰 구조입니다. 사업, 독립, 성과 기반 수익 구조에서 큰 기회가 생길 수 있지만, 예상치 못한 지출이나 위험 요소도 함께 관리해야 합니다.",
    career: "강한 책임감과 도전 정신이 커리어에서 빛을 발하는 시기입니다. 남들이 피하는 자리, 어려운 프로젝트를 맡을수록 실력이 증명됩니다. 다만 번아웃을 주의해야 합니다.",
    relationship: "관계에서도 강한 에너지가 작동합니다. 리더십을 발휘하는 것이 좋지만 너무 강하게 밀어붙이면 주변이 부담을 느낄 수 있으므로 강약 조절이 필요합니다.",
    health: "몸이 혹독하게 쓰이는 시기입니다. 근골격계 긴장, 면역력 저하, 과로가 반복될 수 있으니 의도적인 휴식과 병원 점검이 필요합니다.",
    caution: "두려움에서 나온 결정보다 확신에서 나온 결정을 해야 합니다. 압박에 쫓기는 선택은 후회로 이어질 수 있습니다.",
    advice: "외부의 압력을 성장의 재료로 삼을 때 이 해의 운이 가장 강하게 살아납니다. 피하기보다 준비하고 마주서는 자세가 결과를 만듭니다.",
  },
  "정관": {
    yearlyTheme: "이 해는 사회적 역할과 책임이 부각되는 시기입니다. 원칙과 질서를 지키는 힘이 인정과 신뢰로 돌아오며, 커리어와 사회적 위치가 안정되는 흐름이 강합니다.",
    money: "재물은 실력과 신뢰를 기반으로 들어오는 구조입니다. 급격한 수익보다 꾸준한 수입과 사회적 인정이 재물의 흐름을 만들어냅니다. 계약, 공식적 합의, 안정된 수익 구조가 강점입니다.",
    career: "승진, 인정, 역할 확대가 일어날 수 있는 시기입니다. 조직 안에서의 신뢰도가 높아지며, 책임 있는 자리를 맡을 가능성이 커집니다. 공정함과 원칙을 지키는 태도가 핵심입니다.",
    relationship: "진지하고 신뢰할 수 있는 관계가 깊어지는 시기입니다. 결혼이나 장기적인 인연에 좋은 흐름이 생길 수 있으며, 공식적인 관계 전환의 기회가 찾아올 수 있습니다.",
    health: "과도한 책임감이 스트레스로 쌓일 수 있습니다. 몸보다 마음의 긴장이 먼저 신호를 보내므로, 완벽함보다 지속 가능한 수준을 유지하는 것이 건강운을 지키는 방법입니다.",
    caution: "틀에 너무 갇혀 유연성을 잃으면 기회를 놓칩니다. 원칙을 지키되 상황에 따라 유연하게 움직이는 것도 이 해의 필수 역량입니다.",
    advice: "책임과 인정이 함께 따라오는 해입니다. 사회적 위치를 높이고 싶다면 지금의 신뢰를 더 단단히 쌓는 것이 가장 효과적입니다.",
  },
  "편인": {
    yearlyTheme: "이 해는 내면의 감각과 직관이 강해지는 시기입니다. 논리보다 느낌으로 먼저 상황을 파악하는 힘이 발동되며, 독창적인 생각과 배움에 대한 욕구가 강해집니다.",
    money: "재물은 특정한 전문성이나 고유한 방식으로 들어오는 구조입니다. 일반적인 방법보다 남들이 잘 하지 않는 영역에서 수익 구조를 만들수록 성과가 납니다.",
    career: "연구, 기획, 저술, 전문 컨설팅처럼 깊이 있는 사고를 요구하는 분야에서 강점이 드러납니다. 팀워크보다 독립적인 작업 방식에서 더 높은 성취를 경험할 수 있습니다.",
    relationship: "관계에서 심리적인 거리감이 생기기 쉬운 시기입니다. 혼자 있는 시간을 즐기는 것이 좋지만, 중요한 사람과의 연결이 약해지지 않도록 의도적으로 소통하는 것이 필요합니다.",
    health: "신경계 과부하와 수면 불안정이 반복될 수 있습니다. 명상, 산책, 고요한 시간이 이 해의 건강을 유지하는 핵심 루틴입니다.",
    caution: "지나친 고독과 타인에 대한 경계가 고립으로 이어질 수 있습니다. 마음을 닫기보다 신뢰할 수 있는 한두 명과의 연결을 유지하세요.",
    advice: "내면의 통찰을 현실 결과물로 만드는 연습이 필요합니다. 아이디어와 직관을 실행으로 연결하는 습관이 이 해의 잠재력을 현실로 바꿉니다.",
  },
  "정인": {
    yearlyTheme: "이 해는 배움, 성장, 보호의 에너지가 강하게 작동합니다. 새로운 지식과 기술을 습득하거나 기존의 것을 더 깊이 이해하는 과정에서 큰 발전이 일어납니다.",
    money: "재물은 전문성, 자격, 신뢰를 기반으로 천천히 쌓여가는 구조입니다. 자격증, 교육, 전문 지식에 투자하면 장기적으로 수익 기반이 확장됩니다.",
    career: "교육, 연구, 법률, 의료, 상담처럼 신뢰와 전문성이 중요한 분야에서 성과가 납니다. 조언을 구하거나 멘토를 찾는 것도 이 해의 커리어에 긍정적으로 작동합니다.",
    relationship: "든든하고 안정적인 관계를 원하는 마음이 강해집니다. 상대에게 의지할수록 편안함이 생기지만, 지나친 의존은 자기 결정력을 약하게 만들 수 있습니다.",
    health: "심리적 안정이 신체 건강에도 직접 연결됩니다. 걱정과 불안이 쌓이면 위장과 면역 기능이 떨어질 수 있으니, 마음을 안정시키는 루틴이 중요합니다.",
    caution: "지나치게 보호받으려는 태도가 성장을 막을 수 있습니다. 도움을 받는 것과 스스로 결정하는 것 사이의 균형이 필요합니다.",
    advice: "이 해의 성장은 빠른 성과보다 깊은 이해에서 나옵니다. 멀리 보고 차근차근 쌓아가는 방식이 이 해를 가장 풍요롭게 만듭니다.",
  },
  "미정": {
    yearlyTheme: "이 해는 다양한 가능성이 열려 있는 시기입니다. 세운의 방향이 원국과 복잡하게 얽혀 있어 단일한 흐름이 아닌 상황에 따른 유연한 대응이 필요합니다.",
    money: "재물의 흐름은 고정된 패턴보다 변수에 따라 달라집니다. 월별 점수와 월운의 강약을 면밀히 살피며 기회와 위험을 분리 운영하는 것이 중요합니다.",
    career: "특정한 방향보다 다양한 가능성을 열어두고 움직이는 시기입니다. 지금 있는 자리에서 역량을 키우면서 새로운 기회가 왔을 때 빠르게 반응할 수 있는 준비가 필요합니다.",
    relationship: "관계에서 기대와 현실의 차이가 생기기 쉬운 시기입니다. 상대를 있는 그대로 보고 기대를 조율하는 태도가 관계를 안정시킵니다.",
    health: "전체적인 균형을 유지하는 것이 중요합니다. 어느 한 곳에 지나치게 에너지를 쏟으면 다른 영역이 무너질 수 있으니, 분산된 관리가 필요합니다.",
    caution: "방향이 명확하지 않을 때 충동적인 결정을 하면 뒤늦게 후회하는 상황이 생깁니다. 천천히 정보를 모으고 결정을 내리세요.",
    advice: "불확실성을 불안으로 받아들이기보다 가능성이 많은 시기로 해석하는 것이 이 해를 가장 잘 쓰는 방법입니다.",
  },
};

// ── 합충형해파 해석 라이브러리 ───────────────────────────────
const SAJU_YEARLY_RELATION_LIBRARY = {
  "합": {
    theme: "연결과 협력의 에너지가 강해지는 신호입니다.",
    career: "협업, 파트너십, 계약, 공식적인 연결이 강화됩니다. 주변 사람과의 공동 프로젝트나 팀 기반 성과가 개인 역량보다 더 크게 나타날 수 있는 시기입니다.",
    money: "합의 기운이 재성이나 식상을 건드릴 때 재물의 흐름이 열립니다. 계약, 파트너십, 공동 수익 구조에서 기회가 강해집니다.",
    relationship: "인연이 맺어지거나 기존 관계가 더 단단해지는 흐름입니다. 새로운 사람과 빠르게 연결되거나, 오래된 관계가 공식화될 수 있습니다.",
    caution: "합은 묶이는 에너지이기도 합니다. 잘못된 연결은 빠져나오기 어려워지므로, 파트너를 선택할 때 조건과 역할을 먼저 명확히 해야 합니다.",
    advice: "합의 에너지를 최대한 활용하려면 먼저 연결하고 싶은 사람이나 방향을 선명하게 정해두는 것이 필요합니다.",
  },
  "충": {
    theme: "변화와 이동, 전환의 압력이 강해지는 신호입니다.",
    career: "직업의 전환, 이직, 사업 구조 변경, 이동이 일어날 수 있습니다. 기존 방식을 고집하면 충돌이 커지므로, 변화를 선제적으로 설계하는 것이 유리합니다.",
    money: "재물의 흐름에 예상치 못한 변동이 생깁니다. 갑작스러운 지출이나 수입 변화가 있을 수 있으므로, 비상 자금과 유동성을 미리 확보해야 합니다.",
    relationship: "관계에서 갈등이나 이별, 재편이 일어날 수 있습니다. 오래된 관계가 정리되거나 새로운 인연으로 빠르게 채워질 수 있습니다.",
    caution: "충의 시기에는 충동적인 결정이 큰 손실로 이어질 수 있습니다. 결정 전 최소 하루를 더 두고 생각하는 것이 안전합니다.",
    advice: "충의 에너지는 막을 수 없지만 방향을 잡을 수는 있습니다. 이동이나 변화가 불가피하다면 타이밍을 내가 선택하는 방식으로 전환해야 합니다.",
  },
  "형": {
    theme: "압박과 단련의 에너지가 작동하는 신호입니다.",
    career: "과도한 업무나 불합리한 요구가 쌓일 수 있습니다. 그러나 그 과정에서 실력이 검증되고 인정받는 기회가 생기기도 합니다.",
    money: "법적 분쟁, 계약 문제, 예상치 못한 비용이 발생할 수 있습니다. 문서와 계약 조항을 꼼꼼히 점검하는 것이 필요합니다.",
    relationship: "가까운 관계에서 갈등과 오해가 반복될 수 있습니다. 말보다 행동으로 보여주는 것이 관계를 안정시키는 방법입니다.",
    caution: "억압적인 상황에서 감정을 폭발시키면 더 큰 문제가 생깁니다. 참고 버티는 것과 분명하게 거절하는 것을 구분해야 합니다.",
    advice: "형의 에너지를 단련의 기회로 받아들이면, 이 해에 통과한 것들이 이후의 가장 큰 자산이 됩니다.",
  },
  "해": {
    theme: "미세한 오해와 관계의 어긋남이 발생하기 쉬운 신호입니다.",
    career: "팀 내에서 의사소통 문제나 역할 갈등이 생길 수 있습니다. 기대치를 명확히 공유하고, 의도를 직접 말로 전달하는 방식이 필요합니다.",
    money: "눈에 보이지 않는 손실, 예상치 못한 비용, 신뢰 관계에서의 금전 문제가 생길 수 있습니다.",
    relationship: "사소한 오해가 커지거나, 말하지 않아서 생기는 거리감이 관계를 소원하게 만들 수 있습니다.",
    caution: "해의 신호는 크게 드러나지 않아 무시하기 쉽습니다. 작은 불편함이나 어색함을 방치하지 말고 초기에 대화로 풀어야 합니다.",
    advice: "해의 에너지가 작동하는 시기에는 상대의 말을 글자 그대로 해석하기보다 맥락과 감정을 함께 읽는 것이 필요합니다.",
  },
  "파": {
    theme: "계획의 변경과 약속의 어긋남이 생기기 쉬운 신호입니다.",
    career: "진행 중이던 프로젝트가 예상치 못한 방향으로 흘러가거나, 합의가 뒤집히는 상황이 생길 수 있습니다.",
    money: "계획했던 수입이나 투자 결과가 달라질 수 있습니다. 유연한 대안을 미리 준비해두는 것이 손실을 줄이는 방법입니다.",
    relationship: "약속이나 기대가 어긋나면서 실망이 쌓일 수 있습니다. 처음부터 너무 확정적인 기대를 갖기보다 유연하게 접근하는 것이 좋습니다.",
    caution: "파의 에너지가 강할 때 고집을 부리면 손실이 커집니다. 상황이 바뀌면 계획도 바꾸는 유연성이 필요합니다.",
    advice: "파의 신호가 보인다면 단기 계획보다 장기 방향을 먼저 확인하고, 세부 사항은 여유 있게 수정하는 방식으로 운영하세요.",
  },
};

// ── 신년운세 로컬 상담문 생성 라이브러리 ───────────────────────────────
function getTenGodLib(tenGod) {
  return SAJU_YEARLY_TEN_GOD_LIBRARY[tenGod] || SAJU_YEARLY_TEN_GOD_LIBRARY["미정"];
}

function getMainRelationLib(relations) {
  const types = (relations || []).map((r) => r.type);
  for (const t of ["충", "형", "합", "해", "파"]) {
    if (types.includes(t)) return SAJU_YEARLY_RELATION_LIBRARY[t];
  }
  return null;
}

function describeMonthlyGroup(months, seed) {
  if (!months || months.length === 0) return "";
  const annual = seed.saju.annualLuck;
  const parts = months.map((item) => {
    const tone = item.score >= 75 ? "이 시기는 확장과 실행에 적합한 흐름" : item.score >= 60 ? "이 시기는 안정적인 운영에 어울리는 흐름" : "이 시기는 보수적인 판단과 점검이 필요한 흐름";
    const branchKo = { 子: "자수", 丑: "축토", 寅: "인목", 卯: "묘목", 辰: "진토", 巳: "사화", 午: "오화", 未: "미토", 申: "신금", 酉: "유금", 戌: "술토", 亥: "해수" };
    const stemKo = { 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" };
    const stemName = stemKo[item.pillar?.stem] || item.pillar?.stem || "";
    const branchName = branchKo[item.pillar?.branch] || item.pillar?.branch || "";
    return `${item.month}월은 ${stemName}${branchName} 월운으로 ${tone}입니다. ${item.advice} `;
  });
  const highMonths = months.filter((m) => m.score >= 75);
  const lowMonths = months.filter((m) => m.score < 60);
  let summary = "";
  if (highMonths.length > 0) {
    summary += `이 구간에서 ${highMonths.map((m) => `${m.month}월`).join("과 ")}에는 ${annual.label} 세운의 기운이 현실 성과로 연결되기 좋은 시기이므로, 중요한 제안이나 계획 실행을 이 달에 맞추는 것이 유리합니다. `;
  }
  if (lowMonths.length > 0) {
    summary += `반면 ${lowMonths.map((m) => `${m.month}월`).join("과 ")}에는 일정을 과도하게 확장하기보다 현재 상황을 점검하고 다음 기회를 준비하는 데 에너지를 쓰는 것이 더 안전합니다. `;
  }
  return parts.join("") + "\n\n" + summary;
}

function buildInterpretationSeeds(seed) {
  const annual = seed.saju.annualLuck;
  const tenGodLib = getTenGodLib(annual.tenGod);
  const dayMaster = seed.saju.dayMaster || "戊";
  const dayElement = STEM_ELEMENT[dayMaster] || "earth";
  const dayElementKo = ELEMENT_KO[dayElement] || "토";
  const annualElementKo = annual.elementKo || "토";
  const monthPillar = seed.saju.pillars?.month?.branch || "";
  const dayPillar = seed.saju.pillars?.day?.branch || "";
  const relations = seed.saju.relations?.branchRelations || [];
  const clashes = relations.filter((r) => r.type === "충");
  const combos = relations.filter((r) => r.type === "합");
  const monthlyStrong = seed.saju.monthlyLuck.filter((m) => m.score >= 75).map((m) => `${m.month}월`);
  const monthlyCare = seed.saju.monthlyLuck.filter((m) => m.score < 60).map((m) => `${m.month}월`);
  const hasClash = clashes.length > 0;
  const hasCombo = combos.length > 0;
  const seasonLabel = ["寅", "卯", "辰"].includes(annual.branch) ? "봄" : ["巳", "午", "未"].includes(annual.branch) ? "여름" : ["申", "酉", "戌"].includes(annual.branch) ? "가을" : "겨울";

  return {
    yearlyTheme: [
      `${seed.targetYear}년은 ${annual.label} 세운입니다. 이 해는 ${annualElementKo} 기운이 핵심 에너지로 작동하며, 일간 ${dayMaster}와의 관계는 ${annual.tenGod}으로 읽힙니다. ${tenGodLib.yearlyTheme}`,
      `${annual.dayMasterRelation}의 방식으로 세운이 원국에 들어오는 만큼, 이 해는 ${hasClash ? "변화와 이동의 압력이 강한 해" : hasCombo ? "연결과 협력의 기회가 열리는 해" : "운영과 균형 조정이 핵심인 해"}입니다. ${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).join("·") + "에 기회가 집중되고" : "전반적으로 기회가 분산되며"}, ${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).join("·") + "에는 보수적인 판단이 필요합니다." : "큰 위험 구간은 없습니다."}`,
    ],
    career: [
      `${tenGodLib.career} ${annual.dayMasterRelation}의 흐름 속에서 일은 ${annual.tenGod === "식신" || annual.tenGod === "상관" ? "표현력과 창의성을 발휘하는 방향" : annual.tenGod === "편관" || annual.tenGod === "정관" ? "책임과 역할 확대의 방향" : annual.tenGod === "편재" || annual.tenGod === "정재" ? "성과 관리와 수익 구조화의 방향" : "자기 기반을 강화하는 방향"}으로 전략을 짜야 합니다.`,
      `${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).join("·") + "는 커리어에서 제안, 발표, 전환의 타이밍으로 활용하기 좋습니다." : "올해는 전반적으로 꾸준한 성과 축적이 커리어 전략의 핵심입니다."} ${hasClash ? "충 신호가 있는 만큼 직업 변화나 이직을 고려한다면 이 해가 자연스러운 전환점이 될 수 있습니다." : hasCombo ? "합 신호가 있어 협업과 파트너십 기반의 커리어 확장이 유리합니다." : ""}`,
    ],
    wealth: [
      `${tenGodLib.money} 세운 ${annual.label}의 ${annualElementKo} 기운이 원국의 ${dayElementKo} 일간과 ${annual.dayMasterRelation} 관계를 이루는 만큼, 재물의 흐름은 ${annual.tenGod === "편재" || annual.tenGod === "정재" ? "직접 관리하고 구조화할수록" : annual.tenGod === "식신" || annual.tenGod === "상관" ? "생산과 표현을 통해 수익으로 전환할수록" : "기반을 다지고 안정을 확보할수록"} 더 살아납니다.`,
      `${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).join("·") + "에는 계약, 투자, 큰 지출 결정을 보류하거나 점검하는 것이 안전합니다." : "월별 점수가 고르게 분포되어 있어 꾸준한 재물 관리가 유효합니다."} ${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 2).join("·") + "에는 새로운 수익 구조를 제안하거나 계약을 확정하기 좋은 타이밍입니다." : ""}`,
    ],
    love: [
      `${tenGodLib.relationship} ${dayPillar ? dayPillar + " 일지의 성격이 올해의 관계 흐름과 만나면서" : "일지의 에너지가 세운과 만나면서"} ${hasClash && clashes.some((c) => c.label === "일지") ? "관계에서 이동과 전환의 압력이 강해집니다." : hasCombo && combos.some((c) => c.label === "일지") ? "새로운 인연이나 관계의 발전 가능성이 열립니다." : "관계의 방향을 조율하고 안정을 찾는 흐름이 강합니다."}`,
      `${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).join("·") + "에는 감정 표현과 만남의 기회가 더 자연스럽게 열립니다." : ""} 사랑에서 중요한 것은 감정의 크기보다 말과 행동의 일관성입니다. 이 해에는 기대치를 먼저 말로 정리하고, 상대와 함께 방향을 확인하는 방식이 관계를 안정시키는 핵심 전략입니다.`,
    ],
    relationships: [
      `${tenGodLib.yearlyTheme} 올해의 인간관계는 ${hasClash ? "갈등과 재편의 에너지가 강하게 작동하는 만큼 역할과 경계를 미리 정해두는 것이 충돌을 줄이는 방법입니다." : hasCombo ? "연결과 협력의 기운이 강해 귀인과 파트너가 들어오기 좋은 시기입니다." : "새로운 관계보다 기존 관계의 질을 높이는 방향이 더 유리합니다."}`,
      `말의 온도와 타이밍이 이 해의 인간관계를 좌우합니다. ${annual.tenGod === "상관" ? "표현력이 강한 만큼 의도와 다르게 전달되는 상황을 주의해야 합니다." : annual.tenGod === "비견" || annual.tenGod === "겁재" ? "경쟁심이 관계 안으로 들어오지 않도록 역할 경계를 명확히 하는 것이 필요합니다." : "상대의 상황을 먼저 파악하고 대화하는 순서가 관계 갈등을 줄여줍니다."}`,
    ],
    health: [
      `${tenGodLib.health} ${annualElementKo} 기운이 강해지는 해이므로, ${annualElementKo === "목" ? "간, 근골격계, 신경 쪽의 긴장이 누적될 수 있습니다." : annualElementKo === "화" ? "심장, 혈압, 열성 체질의 과부하를 주의해야 합니다." : annualElementKo === "토" ? "소화기, 위장, 과식 습관을 점검해야 합니다." : annualElementKo === "금" ? "폐, 피부, 호흡기 관리가 중요합니다." : "신장, 방광, 수분 관리와 냉증에 주의해야 합니다."}`,
      `생활 리듬이 흔들리면 전반적인 건강운이 떨어집니다. 수면, 식사 시간, 운동 루틴을 작은 단위로 고정하는 것이 이 해의 건강을 지키는 가장 현실적인 방법입니다. ${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).join("·") + "에는 과로와 무리한 스케줄을 피하는 것이 좋습니다." : ""}`,
    ],
    monthly: seed.saju.monthlyLuck.map((item) => {
      const stemKo = { 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" };
      const branchKo = { 子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해" };
      const sn = stemKo[item.pillar?.stem] || item.pillar?.stem || "";
      const bn = branchKo[item.pillar?.branch] || item.pillar?.branch || "";
      const toneKo = item.tone === "확장" ? "확장·실행" : item.tone === "정비" ? "정비·유지" : "보수·점검";
      return `${item.month}월(${sn}${bn}): ${toneKo} 흐름. ${item.score}점. ${item.advice}`;
    }),
    opportunities: [
      `${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 4).join("·") + "에는 세운의 긍정적 에너지가 가장 강하게 작동합니다." : "올해는 꾸준한 준비와 실행이 가장 큰 기회를 만듭니다."}`,
      `${hasCombo ? "합의 기운이 작동하는 만큼 파트너십, 협업, 계약 기반의 기회가 강하게 열립니다." : hasClash ? "충의 기운이 있어 기존 구조에서 벗어나 새로운 방향으로 전환하는 기회가 열립니다." : "안정적인 흐름 속에서 기반을 다지고 확장을 준비하는 것이 가장 효과적입니다."}`,
    ],
    risks: [
      `${monthlyCare.length > 0 ? monthlyCare.slice(0, 3).join("·") + "에는 중요한 결정을 서두르지 말고 점검과 보완에 더 집중하는 것이 안전합니다." : "올해는 전반적으로 위험 구간이 고르게 분산되어 있어 항상 일정한 수준의 관리가 필요합니다."}`,
      `${tenGodLib.caution} ${hasClash ? "충 신호가 있는 달에는 계약, 이동, 감정적 결정을 하루 이상 유보하는 습관이 손실을 줄여줍니다." : ""}`,
    ],
    finalStrategy: [
      `올해의 전략은 세운 ${annual.label}의 ${annual.tenGod} 흐름을 현실 선택의 기준으로 쓰는 것입니다. ${tenGodLib.advice}`,
      `${seed.targetYear}년을 마무리하는 시점에 "올해 나는 무엇을 얻었고 무엇을 내려놓았는가"라는 질문에 선명하게 답할 수 있도록, 지금부터 분기별 목표를 작게 쪼개어 실행하는 것이 가장 효과적인 연간 전략입니다.`,
    ],
  };
}

// (buildCategoryEvidence는 localParagraph 내부에서 직접 처리됩니다)

function localSexagenaryYear(year) {
  const index = ((toInt(year, 1984) - 1984) % 60 + 60) % 60;
  const stem = LOCAL_STEMS[index % 10];
  const branch = LOCAL_BRANCHES[index % 12];
  return { stem, branch, label: `${stem}${branch}` };
}

function localMonthPillar(targetYear, month) {
  const yearStemIndex = LOCAL_STEMS.indexOf(localSexagenaryYear(targetYear).stem);
  const firstMonthStemIndex = ((yearStemIndex % 5) * 2 + 2) % 10;
  const stem = LOCAL_STEMS[(firstMonthStemIndex + month - 1) % 10];
  const branch = LOCAL_MONTH_BRANCHES[(month - 1) % 12];
  return { month, stem, branch, label: `${stem}${branch}`, element: LOCAL_BRANCH_ELEMENT[branch] || LOCAL_STEM_ELEMENT[stem] || "earth" };
}

function localElementRelation(dayElement, otherElement) {
  if (!dayElement || !otherElement) return "균형 조정";
  if (dayElement === otherElement) return "자기 강화";
  if (LOCAL_GENERATES[dayElement] === otherElement) return "표현과 생산";
  if (LOCAL_GENERATES[otherElement] === dayElement) return "지원과 회복";
  if (LOCAL_CONTROLS[dayElement] === otherElement) return "관리와 재물";
  if (LOCAL_CONTROLS[otherElement] === dayElement) return "압박과 책임";
  return "균형 조정";
}

function localTenGod(dayStem, otherStem) {
  const dayElement = LOCAL_STEM_ELEMENT[dayStem];
  const otherElement = LOCAL_STEM_ELEMENT[otherStem];
  if (!dayElement || !otherElement) return "미정";
  const samePolarity = LOCAL_STEMS.indexOf(dayStem) % 2 === LOCAL_STEMS.indexOf(otherStem) % 2;
  if (dayElement === otherElement) return samePolarity ? "비견" : "겁재";
  if (LOCAL_GENERATES[dayElement] === otherElement) return samePolarity ? "식신" : "상관";
  if (LOCAL_CONTROLS[dayElement] === otherElement) return samePolarity ? "편재" : "정재";
  if (LOCAL_CONTROLS[otherElement] === dayElement) return samePolarity ? "편관" : "정관";
  if (LOCAL_GENERATES[otherElement] === dayElement) return samePolarity ? "편인" : "정인";
  return "미정";
}

function localRelationRows(pillars, annualBranch) {
  const natal = [
    ["연지", pillars?.year?.branch],
    ["월지", pillars?.month?.branch],
    ["일지", pillars?.day?.branch],
    ["시지", pillars?.hour?.branch],
  ].filter(([, branch]) => branch);
  const rows = [];
  for (const [label, branch] of natal) {
    if (LOCAL_BRANCH_COMBOS[annualBranch] === branch) rows.push({ type: "합", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 합을 이루어 연결과 협력의 기운이 살아납니다.` });
    if (LOCAL_BRANCH_CLASHES[annualBranch] === branch) rows.push({ type: "충", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 충을 이루어 이동, 변화, 결정 압력이 커집니다.` });
    if (LOCAL_BRANCH_HARMS[annualBranch] === branch) rows.push({ type: "해", label, branch, message: `${label} ${branch}와 세운 ${annualBranch} 사이에 미세한 오해와 관계 조율의 과제가 생깁니다.` });
    if (LOCAL_BRANCH_BREAKS[annualBranch] === branch) rows.push({ type: "파", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 파를 이루어 계획 변경과 약속 관리가 중요해집니다.` });
  }
  return rows;
}

function normalizeElementName(value) {
  const raw = clean(value).toLowerCase();
  if (!raw) return "";
  if (/wood|목|甲|乙|寅|卯/.test(raw)) return "wood";
  if (/fire|화|丙|丁|巳|午/.test(raw)) return "fire";
  if (/earth|토|戊|己|辰|戌|丑|未/.test(raw)) return "earth";
  if (/metal|금|庚|辛|申|酉/.test(raw)) return "metal";
  if (/water|수|壬|癸|亥|子/.test(raw)) return "water";
  return "";
}

function collectElementHints(source, preferredKeys = []) {
  const out = [];
  const seen = new Set();
  const push = (value) => {
    const element = normalizeElementName(value);
    if (element && !seen.has(element)) {
      seen.add(element);
      out.push(element);
    }
  };
  const visit = (value, depth = 0) => {
    if (depth > 3 || value == null) return;
    if (typeof value === "string" || typeof value === "number") {
      push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (typeof value === "object") {
      const keys = preferredKeys.length ? preferredKeys : Object.keys(value);
      keys.forEach((key) => visit(value?.[key], depth + 1));
    }
  };
  visit(source);
  return out;
}

function inferJohuProfile(pillars = {}, usefulGods = {}) {
  const monthBranch = clean(pillars?.month?.branch || "");
  const rawType = clean(usefulGods?.johu?.type || usefulGods?.johu?.name || usefulGods?.johuType || "").toLowerCase();
  let type = "neutral";
  if (/hot|warm|조열|더움|화/.test(rawType) || ["巳", "午", "未"].includes(monthBranch)) type = "hot";
  else if (/cold|cool|한랭|추움|수/.test(rawType) || ["亥", "子", "丑", "寅"].includes(monthBranch)) type = "cold";
  else if (["申", "酉", "戌"].includes(monthBranch)) type = "dry";

  const favorable = type === "hot"
    ? ["water", "metal"]
    : type === "cold"
      ? ["fire", "wood"]
      : type === "dry"
        ? ["water", "wood"]
        : [];
  const caution = type === "hot"
    ? ["fire", "wood"]
    : type === "cold"
      ? ["water", "metal"]
      : type === "dry"
        ? ["metal", "earth"]
        : [];

  return {
    type,
    monthBranch,
    favorable,
    caution,
    summary: type === "hot"
      ? "조후상 열기가 강하므로 수·금의 냉각과 정리가 균형을 돕습니다."
      : type === "cold"
        ? "조후상 한기가 강하므로 화·목의 온기와 생장이 균형을 돕습니다."
        : type === "dry"
          ? "조후상 건조함이 두드러지므로 수·목의 순환과 유연성이 균형을 돕습니다."
          : "조후는 극단보다 균형 조정 관점에서 보정합니다.",
  };
}

function buildQuantumElementRoles({ pillars = {}, fiveElements = {}, usefulGods = {} } = {}) {
  const elements = ["wood", "fire", "earth", "metal", "water"];
  const counts = fiveElements?.counts || fiveElements?.scores || fiveElements?.ratio || fiveElements || {};
  const strongest = dominantElement(fiveElements, "earth");
  const weakest = elements.slice().sort((a, b) => Number(counts?.[a] || 0) - Number(counts?.[b] || 0))[0] || "water";
  const total = elements.reduce((sum, el) => sum + Number(counts?.[el] || 0), 0);
  const dominantCount = Number(counts?.[strongest] || 0);
  const possibleJong = total > 0 && dominantCount >= 5 && dominantCount / total >= 0.55;
  const johu = inferJohuProfile(pillars, usefulGods);
  const usefulHints = collectElementHints(usefulGods, ["yong", "hi", "hee", "useful", "yongsin", "huisin", "primary", "secondary"]);
  const cautionHints = collectElementHints(usefulGods, ["gisin", "kishin", "avoid", "忌神", "bad"]);
  const useful = usefulHints.length ? usefulHints : [weakest];
  const caution = cautionHints.length ? cautionHints : [strongest].filter((el) => Number(counts?.[el] || 0) >= 3);
  const roleByElement = {};

  elements.forEach((element) => {
    let score = 0;
    const reasons = [];
    if (useful.includes(element)) {
      score += 2;
      reasons.push("용신·희신 후보");
    }
    if (caution.includes(element)) {
      score -= 2;
      reasons.push("기신·과다 후보");
    }
    if (johu.favorable.includes(element)) {
      score += 2;
      reasons.push("조후 보정 유리");
    }
    if (johu.caution.includes(element)) {
      score -= 2;
      reasons.push("조후 보정 주의");
    }
    if (possibleJong && (element === strongest || element === LOCAL_GENERATES[strongest])) {
      score += 1;
      reasons.push("종격 추정 흐름 보조");
    }
    if (possibleJong && element === LOCAL_CONTROLS[strongest]) {
      score -= 1;
      reasons.push("종격 추정 흐름 제어");
    }

    const role = score >= 2 ? "good" : score <= -2 ? "bad" : "neutral";
    roleByElement[element] = {
      element,
      label: LOCAL_ELEMENT_KO[element] || element,
      role,
      roleLabel: role === "good" ? "유리" : role === "bad" ? "주의" : "중립",
      score,
      reasons: reasons.length ? reasons : ["균형 관찰"],
    };
  });

  return {
    mode: "조후+억부+합화 보정",
    johu,
    strongest,
    weakest,
    possibleJong,
    usefulElements: useful,
    cautionElements: caution,
    roles: elements.map((element) => roleByElement[element]),
    roleByElement,
  };
}

function analyzeQuantumHap({ pillar = {}, natalPillars = {}, roleByElement = {}, label = "" } = {}) {
  const ganHap = { 甲: { 己: "earth" }, 己: { 甲: "earth" }, 乙: { 庚: "metal" }, 庚: { 乙: "metal" }, 丙: { 辛: "water" }, 辛: { 丙: "water" }, 丁: { 壬: "wood" }, 壬: { 丁: "wood" }, 戊: { 癸: "fire" }, 癸: { 戊: "fire" } };
  const jiHap = { 子: { 丑: "earth" }, 丑: { 子: "earth" }, 寅: { 亥: "wood" }, 亥: { 寅: "wood" }, 卯: { 戌: "fire" }, 戌: { 卯: "fire" }, 辰: { 酉: "metal" }, 酉: { 辰: "metal" }, 巳: { 申: "water" }, 申: { 巳: "water" }, 午: { 未: "fire" }, 未: { 午: "fire" } };
  const natalStems = [natalPillars?.year?.stem, natalPillars?.month?.stem, natalPillars?.day?.stem, natalPillars?.hour?.stem].filter(Boolean);
  const natalBranches = [natalPillars?.year?.branch, natalPillars?.month?.branch, natalPillars?.day?.branch, natalPillars?.hour?.branch].filter(Boolean);
  const results = [];
  const pushResult = (type, src, partner, hapElement, originalElement) => {
    const before = roleByElement?.[originalElement]?.role || "neutral";
    const after = roleByElement?.[hapElement]?.role || "neutral";
    const effect = after === "good" && before !== "good" ? "supportive" : after === "bad" ? "caution" : "neutral";
    results.push({
      type,
      label,
      src,
      partner,
      originalElement,
      originalRole: before,
      transformedElement: hapElement,
      transformedRole: after,
      effect,
      changed: before !== after,
      summary: `${label || "운"} ${src}와 원국 ${partner}의 ${type}은 ${LOCAL_ELEMENT_KO[hapElement] || hapElement} 기운으로 합화되어 ${effect === "supportive" ? "용신 방향의 기회" : effect === "caution" ? "기신 방향의 과몰입 주의" : "중립 보정"}로 읽힙니다.`,
    });
  };

  natalStems.forEach((stem) => {
    const hapElement = ganHap[pillar?.stem]?.[stem] || ganHap[stem]?.[pillar?.stem];
    if (hapElement) pushResult("천간합", pillar.stem, stem, hapElement, LOCAL_STEM_ELEMENT[pillar.stem] || hapElement);
  });
  natalBranches.forEach((branch) => {
    const hapElement = jiHap[pillar?.branch]?.[branch] || jiHap[branch]?.[pillar?.branch];
    if (hapElement) pushResult("지지합", pillar.branch, branch, hapElement, LOCAL_BRANCH_ELEMENT[pillar.branch] || hapElement);
  });
  return results;
}

function decisionFromScore(score) {
  return score >= 75 ? "GO" : score >= 60 ? "WATCH" : "STOP";
}

function toneFromScore(score) {
  return score >= 75 ? "확장" : score >= 60 ? "정비" : "보수";
}

function buildQuantumPillarJudgement({ pillar = {}, natalPillars = {}, elementRoles = {}, relations = [], label = "", baseScore = 62 } = {}) {
  const element = pillar?.element || LOCAL_BRANCH_ELEMENT[pillar?.branch] || LOCAL_STEM_ELEMENT[pillar?.stem] || "earth";
  const role = elementRoles.roleByElement?.[element] || { role: "neutral", roleLabel: "중립", reasons: ["균형 관찰"] };
  const hapHwa = analyzeQuantumHap({ pillar, natalPillars, roleByElement: elementRoles.roleByElement, label });
  const supportiveHap = hapHwa.filter((item) => item.effect === "supportive").length;
  const cautionHap = hapHwa.filter((item) => item.effect === "caution").length;
  const comboCount = relations.filter((item) => item.type === "합").length;
  const clashCount = relations.filter((item) => item.type === "충").length;
  const subtleRiskCount = relations.filter((item) => item.type === "해" || item.type === "파" || item.type === "형").length;
  const roleAdjustment = role.role === "good" ? 7 : role.role === "bad" ? -8 : 0;
  const hapAdjustment = supportiveHap * 4 - cautionHap * 5;
  const relationAdjustment = comboCount * 3 - clashCount * 6 - subtleRiskCount * 3;
  const quantumAdjustment = clamp(roleAdjustment + hapAdjustment + relationAdjustment, -18, 18);
  const finalScore = clamp(Math.round(Number(baseScore || 62) + quantumAdjustment), 0, 100);
  const decision = decisionFromScore(finalScore);
  const reasons = [
    `${LOCAL_ELEMENT_KO[element] || element} 오행 ${role.roleLabel}`,
    ...role.reasons,
    supportiveHap ? `용신 방향 합화 ${supportiveHap}건` : "",
    cautionHap ? `기신 방향 합화 ${cautionHap}건` : "",
    comboCount ? `합 ${comboCount}건` : "",
    clashCount ? `충 ${clashCount}건` : "",
    subtleRiskCount ? `해·파 ${subtleRiskCount}건` : "",
  ].filter(Boolean);

  return {
    label,
    pillar,
    element,
    elementLabel: LOCAL_ELEMENT_KO[element] || element,
    elementRole: role.role,
    elementRoleLabel: role.roleLabel,
    baseScore: Math.round(Number(baseScore || 62)),
    quantumAdjustment,
    finalScore,
    decision,
    tone: toneFromScore(finalScore),
    hapHwa,
    relations,
    reasons,
    summary: `${label || "운"}은 ${pillar?.label || ""} ${LOCAL_ELEMENT_KO[element] || element} 기운이며 퀀텀 보정은 ${quantumAdjustment >= 0 ? "+" : ""}${quantumAdjustment}점입니다. 최종 판정은 ${decision}입니다.`,
  };
}

function buildQuantumMyeongriLayer({ computed, targetYear, annualLuck, monthlyLuck = [] } = {}) {
  const elementRoles = buildQuantumElementRoles({
    pillars: computed?.pillars || {},
    fiveElements: computed?.fiveElements || {},
    usefulGods: computed?.usefulGods || {},
  });
  const annualPillar = {
    year: targetYear,
    stem: annualLuck?.stem,
    branch: annualLuck?.branch,
    label: annualLuck?.label,
    element: annualLuck?.element,
  };
  const annualRelations = localRelationRows(computed?.pillars || {}, annualPillar.branch);
  const annualQuantum = buildQuantumPillarJudgement({
    pillar: annualPillar,
    natalPillars: computed?.pillars || {},
    elementRoles,
    relations: annualRelations,
    label: `${targetYear}년 세운`,
    baseScore: 68,
  });
  const monthlyQuantum = monthlyLuck.map((item) => {
    const relations = localRelationRows(computed?.pillars || {}, item?.pillar?.branch);
    return {
      month: item.month,
      ...buildQuantumPillarJudgement({
        pillar: item.pillar,
        natalPillars: computed?.pillars || {},
        elementRoles,
        relations,
        label: `${item.month}월 월운`,
        baseScore: item.score,
      }),
    };
  });
  const favorableElements = elementRoles.roles.filter((item) => item.role === "good").map((item) => item.label);
  const cautionElements = elementRoles.roles.filter((item) => item.role === "bad").map((item) => item.label);
  const riskCorrection = monthlyQuantum.map((item) => ({
    month: item.month,
    decision: item.decision,
    finalScore: item.finalScore,
    correction: item.quantumAdjustment,
    message: item.decision === "GO"
      ? `${item.month}월은 합화·용신 보정이 살아나 실행성이 높습니다.`
      : item.decision === "STOP"
        ? `${item.month}월은 기신·충해파 보정이 겹치므로 큰 결정을 늦추는 편이 안전합니다.`
        : `${item.month}월은 기회와 부담이 공존하므로 점검 후 실행하는 흐름입니다.`,
  }));

  return {
    version: "new-year-quantum-v1",
    mode: elementRoles.mode,
    elementRoles: elementRoles.roles,
    favorableElements,
    cautionElements,
    johuType: elementRoles.johu.type,
    johuSummary: elementRoles.johu.summary,
    annualQuantum,
    monthlyQuantum,
    riskCorrection,
    professionalSummary: `퀀텀 명리 보정상 유리 오행은 ${favorableElements.join("·") || "중립"}이고, 주의 오행은 ${cautionElements.join("·") || "중립"}입니다. ${elementRoles.johu.summary} 세운 ${annualLuck?.label || ""}은 ${annualQuantum.elementRoleLabel} 흐름으로 판정되며, 월별 Go/Stop은 기본 월운에 합화와 용신·기신 보정을 더해 해석합니다.`,
  };
}

function buildLocalMonthlyLuck(targetYear, dayStem) {
  const dayElement = LOCAL_STEM_ELEMENT[dayStem] || "earth";
  return Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const pillar = localMonthPillar(targetYear, month);
    const relation = localElementRelation(dayElement, pillar.element);
    const score = clamp(62 + (relation === "지원과 회복" ? 12 : relation === "표현과 생산" ? 8 : relation === "관리와 재물" ? 6 : relation === "압박과 책임" ? -7 : 2) + ((month * 7 + targetYear) % 9), 38, 92);
    const tone = score >= 75 ? "확장" : score >= 60 ? "정비" : "보수";
    return { month, pillar, relation, score: Math.round(score), tone, advice: `${month}월은 ${pillar.label} 월운과 ${LOCAL_ELEMENT_KO[pillar.element] || "오행"} 기운이 들어오므로 ${tone} 관점으로 일정과 선택을 조절하는 것이 좋습니다.` };
  });
}

function buildPdfSeed(profile, targetYear, body = {}) {
  const computed = normalizeEngineSaju(profile, body);
  const annual = localSexagenaryYear(targetYear);
  const annualElement = LOCAL_BRANCH_ELEMENT[annual.branch] || LOCAL_STEM_ELEMENT[annual.stem] || "earth";
  const dayStem = computed.dayMaster || computed.pillars.day?.stem || "戊";
  const annualLuck = {
    year: targetYear,
    ...annual,
    element: annualElement,
    elementKo: ELEMENT_KO[annualElement] || "토",
    tenGod: localTenGod(dayStem, annual.stem),
    dayMasterRelation: localElementRelation(LOCAL_STEM_ELEMENT[dayStem] || "earth", annualElement),
  };
  annualLuck.elementKo = LOCAL_ELEMENT_KO[annualElement] || "오행";
  let monthlyLuck = buildLocalMonthlyLuck(targetYear, dayStem);
  const branchRelations = localRelationRows(computed.pillars, annual.branch);
  const quantumMyeongri = buildQuantumMyeongriLayer({
    computed,
    targetYear,
    annualLuck,
    monthlyLuck,
  });
  annualLuck.quantum = quantumMyeongri.annualQuantum;
  monthlyLuck = monthlyLuck.map((item, index) => {
    const quantum = quantumMyeongri.monthlyQuantum[index] || {};
    const finalScore = Number(quantum.finalScore || item.score);
    const tone = toneFromScore(finalScore);
    return {
      ...item,
      baseScore: item.score,
      quantumAdjustment: Number(quantum.quantumAdjustment || 0),
      finalScore,
      score: finalScore,
      tone,
      decision: clean(quantum.decision || decisionFromScore(finalScore)),
      quantumRole: clean(quantum.elementRole || "neutral"),
      quantumSummary: clean(quantum.summary || ""),
      quantum,
      advice: `${item.month}월은 ${item.pillar.label} 월운과 ${LOCAL_ELEMENT_KO[item.pillar.element] || "오행"} 기운이 들어오며, 퀀텀 보정 ${Number(quantum.quantumAdjustment || 0) >= 0 ? "+" : ""}${Number(quantum.quantumAdjustment || 0)}점으로 ${tone} 관점의 ${clean(quantum.decision || decisionFromScore(finalScore))} 운영이 적합합니다.`,
    };
  });
  quantumMyeongri.monthlyQuantum = monthlyLuck.map((item) => ({
    ...item.quantum,
    baseScore: item.baseScore,
    quantumAdjustment: item.quantumAdjustment,
    finalScore: item.finalScore,
    decision: item.decision,
    tone: item.tone,
  }));
  const seed = {
    mode: "single",
    targetYear,
    birthProfile: {
      name: profile.name,
      birthDate: `${profile.birth.year}-${pad2(profile.birth.month)}-${pad2(profile.birth.day)}`,
      birthTime: profile.birth.unknownTime ? "" : `${pad2(profile.birth.hour)}:${pad2(profile.birth.minute)}`,
      calendarType: profile.calendarType,
      gender: profile.gender,
    },
    saju: {
      dayMaster: dayStem,
      pillars: computed.pillars,
      fiveElements: computed.fiveElements,
      tenGods: computed.tenGods,
      usefulGod: computed.usefulGods,
      luckCycle: computed.daeun,
      annualLuck,
      monthlyLuck,
      quantumMyeongri,
      relations: {
        stems: [{ dayMaster: dayStem, annualStem: annual.stem, tenGod: annualLuck.tenGod }],
        branches: [{ annualBranch: annual.branch, annualElement }],
        branchRelations,
        combinations: branchRelations.filter((item) => item.type === "합"),
        clashes: branchRelations.filter((item) => item.type === "충"),
        harms: branchRelations.filter((item) => item.type === "해"),
        breaks: branchRelations.filter((item) => item.type === "파"),
        punishments: [],
      },
    },
    interpretationSeeds: {},
    chapters: [],
  };
  seed.interpretationSeeds = buildInterpretationSeeds(seed);
  seed.quantumMyeongri = quantumMyeongri;

  const strongest = dominantElement(seed?.saju?.fiveElements || {}, "earth");
  const weakest = Object.keys(seed?.saju?.fiveElements || {}).sort((a, b) => Number(seed.saju.fiveElements[a] || 0) - Number(seed.saju.fiveElements[b] || 0))[0] || "water";
  const chapterSpecs = buildSajuNewYearChapterSpecs(seed.targetYear);
  seed.input = {
    name: seed.birthProfile.name,
    gender: seed.birthProfile.gender,
    birthDate: seed.birthProfile.birthDate,
    birthTime: seed.birthProfile.birthTime,
    calendarType: seed.birthProfile.calendarType,
    targetYear: seed.targetYear,
  };
  seed.natalChart = {
    dayMaster: seed.saju.dayMaster,
    yearPillar: `${seed.saju.pillars?.year?.stem || ""}${seed.saju.pillars?.year?.branch || ""}`,
    monthPillar: `${seed.saju.pillars?.month?.stem || ""}${seed.saju.pillars?.month?.branch || ""}`,
    dayPillar: `${seed.saju.pillars?.day?.stem || ""}${seed.saju.pillars?.day?.branch || ""}`,
    hourPillar: `${seed.saju.pillars?.hour?.stem || ""}${seed.saju.pillars?.hour?.branch || ""}`,
    monthBranch: seed.saju.pillars?.month?.branch || "",
    dayBranch: seed.saju.pillars?.day?.branch || "",
    season: "봄",
  };
  seed.fiveElements = {
    ...seed.saju.fiveElements,
    strongest: [ELEMENT_KO[strongest] || "토"],
    weakest: [ELEMENT_KO[weakest] || "수"],
  };
  seed.luckCycles = {
    targetYearSewoon: {
      year: seed.targetYear,
      pillar: seed.saju.annualLuck.label,
      tenGodToDayMaster: seed.saju.annualLuck.tenGod,
      elementEffect: [seed.saju.annualLuck.elementKo, seed.saju.annualLuck.dayMasterRelation],
      clashOrCombinationWithNatal: (seed.saju.relations?.branchRelations || []).map((row) => row.message).slice(0, 4),
      keywords: [seed.saju.annualLuck.label, seed.saju.annualLuck.tenGod, seed.saju.annualLuck.dayMasterRelation].filter(Boolean),
    },
    monthlyFortunes: (seed.saju.monthlyLuck || []).map((item) => ({
      month: item.month,
      pillar: item.pillar.label,
      baseScore: item.baseScore,
      quantumAdjustment: item.quantumAdjustment,
      score: item.score,
      finalScore: item.finalScore,
      decision: item.decision,
      keywords: [item.pillar.label, item.tone, item.relation, item.decision],
      opportunitySignals: item.finalScore >= 72 ? ["확장", item.pillar.label, "퀀텀 보정"] : [],
      cautionSignals: item.finalScore < 60 ? ["보수", item.pillar.label, "퀀텀 주의"] : [],
    })),
  };
  seed.structure = {
    geokguk: clean(seed.saju.usefulGod?.johu?.type || "건록격"),
    usefulGodKeywords: [clean(seed.saju.usefulGod?.yong || seed.saju.usefulGod?.useful || ""), clean(seed.saju.usefulGod?.hi || seed.saju.usefulGod?.hee || "")].filter(Boolean),
  };
  seed.derivedSignals = {
    yearlyThemeSignals: seed.interpretationSeeds.yearlyTheme.slice(0, 4),
    careerSignals: seed.interpretationSeeds.career.slice(0, 4),
    moneySignals: seed.interpretationSeeds.wealth.slice(0, 4),
    loveRelationshipSignals: seed.interpretationSeeds.love.slice(0, 4),
    humanRelationSignals: seed.interpretationSeeds.relationships.slice(0, 4),
    healthMindSignals: seed.interpretationSeeds.health.slice(0, 4),
    crisisSignals: seed.interpretationSeeds.risks.slice(0, 4),
    opportunitySignals: seed.interpretationSeeds.opportunities.slice(0, 4),
    monthlyStrategySignals: seed.interpretationSeeds.monthly.slice(0, 12),
    quantumSignals: [
      quantumMyeongri.professionalSummary,
      `유리 오행: ${quantumMyeongri.favorableElements.join("·") || "중립"}`,
      `주의 오행: ${quantumMyeongri.cautionElements.join("·") || "중립"}`,
      `세운 퀀텀 판정: ${quantumMyeongri.annualQuantum.decision}`,
    ],
  };
  seed.twelveGrowthStages = [{ stage: "장생" }, { stage: "목욕" }, { stage: "관대" }, { stage: "임관" }];
  seed.chapterSpecs = chapterSpecs;
  seed.annualFortuneFacts = buildAnnualFortuneFacts(seed);
  seed.annualFortuneChapterPlans = buildAnnualFortuneChapterPlans(seed, chapterSpecs);
  return seed;
}

function buildNewYearChapterLocalGuide(seed, chapterSpec) {
  return [
    "사주 명리학 기반 신년운세 프리미엄 PDF의 챕터 구조를 따라 원고를 작성합니다.",
    "챕터 구조와 세부 카테고리를 누락하지 않습니다.",
    "각 세부 카테고리 본문은 최소 700자 이상, 가능하면 900자 이상으로 확장합니다.",
    `챕터 구조: ${JSON.stringify(chapterSpec || {})}`,
    `로컬 계산 입력: ${JSON.stringify({ input: seed?.input, natalChart: seed?.natalChart, luckCycles: seed?.luckCycles })}`,
  ].join("\n");
}

function desiredSectionLength() {
  return Math.max(MIN_SECTION_CHARS + 220, 920);
}

function normalizeGeneratedChapter(chapterSpec, parsed = {}) {
  const sections = (chapterSpec?.categories || []).map((title, index) => {
    const source = (Array.isArray(parsed.sections) ? parsed.sections[index] : null) || {};
    const body = stripForbiddenText(source.body || source.text || "");
    return {
      title,
      body,
    };
  });
  return {
    no: Number(chapterSpec?.no || 0),
    title: clean(chapterSpec?.title || ""),
    sections,
    text: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
    source: NEW_YEAR_MANUSCRIPT_SOURCE.LLM,
  };
}

function validateSajuNewYearSeed(seed = {}) {
  const errors = [];
  if (!clean(seed?.natalChart?.dayMaster)) errors.push("natalChart.dayMaster");
  if (!Array.isArray(seed?.luckCycles?.monthlyFortunes) || seed.luckCycles.monthlyFortunes.length !== 12) errors.push("luckCycles.monthlyFortunes");
  if (!clean(seed?.input?.targetYear)) errors.push("input.targetYear");
  if (!Array.isArray(seed?.quantumMyeongri?.elementRoles) || seed.quantumMyeongri.elementRoles.length !== 5) errors.push("quantumMyeongri.elementRoles");
  if (!seed?.quantumMyeongri?.annualQuantum) errors.push("quantumMyeongri.annualQuantum");
  if (!Array.isArray(seed?.quantumMyeongri?.monthlyQuantum) || seed.quantumMyeongri.monthlyQuantum.length !== 12) errors.push("quantumMyeongri.monthlyQuantum");
  (seed?.quantumMyeongri?.monthlyQuantum || []).forEach((item, index) => {
    const score = Number(item?.finalScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) errors.push(`quantumMyeongri.monthlyQuantum.${index + 1}.finalScore`);
    if (!["GO", "WATCH", "STOP"].includes(clean(item?.decision))) errors.push(`quantumMyeongri.monthlyQuantum.${index + 1}.decision`);
  });
  return { ok: errors.length === 0, errors };
}

function buildDeterministicChapterFromSpec(seed, chapterSpec, reason = "") {
  const chapter = {
    no: Number(chapterSpec?.no || 0),
    title: clean(chapterSpec?.title || ""),
    categories: (chapterSpec?.categories || []).slice(),
  };
  const sections = (chapterSpec?.categories || []).map((categoryTitle, idx) => ({
    title: categoryTitle,
    body: ensureMinLength(buildHighQualityNewYearSection(seed, chapter, categoryTitle, idx), desiredSectionLength(), seed, categoryTitle),
  }));
  return {
    no: chapter.no,
    title: chapter.title,
    sections,
    text: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
    source: "local-reinforced",
  };
}

function reinforceChapterFromSpec({ seed, chapterSpec, chapter, reason = "" } = {}) {
  const srcSections = Array.isArray(chapter?.sections) ? chapter.sections : [];
  let reinforced = false;
  const sections = (chapterSpec?.categories || []).map((title, idx) => {
    const src = srcSections[idx] || {};
    const body = stripForbiddenText(src.body || src.finalText || src.text || "");
    if (clean(src.title) === clean(title) && body.length >= MIN_SECTION_CHARS && !hasForbiddenText(body)) {
      return { title, body };
    }
    reinforced = true;
    return {
      title,
      body: ensureMinLength(buildHighQualityNewYearSection(seed, chapterSpec, title, idx), desiredSectionLength(), seed, title),
    };
  });
  return {
    reinforced,
    chapter: {
      no: Number(chapterSpec?.no || 0),
      title: clean(chapterSpec?.title || ""),
      sections,
      text: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
      source: reinforced ? "local-reinforced" : clean(chapter?.source || "local-only"),
    },
  };
}

function validateSajuNewYearPdfQuality({ chapters = [], expectedChapters = buildSajuNewYearChapterSpecs(resolveDefaultTargetYear()), minChapterLength = MIN_CHAPTER_CHARS, minSectionLength = MIN_SECTION_CHARS } = {}) {
  const errors = [];
  if (!Array.isArray(chapters) || chapters.length !== expectedChapters.length) {
    errors.push("chapter_count");
    return { ok: false, errors, stats: { chapterCount: Array.isArray(chapters) ? chapters.length : 0, totalChars: 0 } };
  }
  let totalChars = 0;
  expectedChapters.forEach((spec, chapterIndex) => {
    const chapter = chapters[chapterIndex];
    if (!chapter || clean(chapter.title) !== clean(spec.title)) {
      errors.push(`chapter_${chapterIndex + 1}_title`);
      return;
    }
    const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
    if (sections.length !== spec.categories.length) {
      errors.push(`chapter_${chapterIndex + 1}_section_count`);
      return;
    }
    let chapterChars = 0;
    spec.categories.forEach((categoryTitle, secIndex) => {
      const section = sections[secIndex] || {};
      const body = clean(section.body || "");
      chapterChars += body.length;
      if (clean(section.title) !== clean(categoryTitle)) errors.push(`chapter_${chapterIndex + 1}_section_${secIndex + 1}_title`);
      if (body.length < minSectionLength) errors.push(`chapter_${chapterIndex + 1}_section_${secIndex + 1}_min_chars`);
    });
    if (chapterChars < minChapterLength) errors.push(`chapter_${chapterIndex + 1}_min_chars`);
    totalChars += chapterChars;
  });
  if (totalChars < MIN_TOTAL_CHARS) {
    errors.push("total_min_chars");
  }
  return {
    ok: errors.length === 0,
    errors,
    stats: {
      chapterCount: chapters.length,
      totalChars,
    },
  };
}

function buildNewYearConsultationEvidence(masterJson = {}) {
  const chart = masterJson?.natalChart || {};
  const yearly = masterJson?.yearlyFlow || {};
  const quantum = masterJson?.quantumMyeongri || {};
  const monthRows = Array.isArray(masterJson?.monthlyFlow) ? masterJson.monthlyFlow : [];
  const goMonths = monthRows.filter((item) => item.decision === "GO").slice(0, 4).map((item) => `${item.month}월`);
  const stopMonths = monthRows.filter((item) => item.decision === "STOP").slice(0, 4).map((item) => `${item.month}월`);

  return compactNewYearObject({
    sajuEvidence: [
      `원국 8글자: ${clean(chart.eightCharacters)}`,
      `일간과 일지: ${clean(chart.dayMaster)} / ${clean(chart.dayBranch)}`,
      `세운: ${clean(yearly.pillar)} · 십성 ${clean(yearly.tenGodToDayMaster)} · 관계 ${clean(yearly.dayMasterRelation)}`,
      `세운 합충형해파: ${(yearly.natalInteractions || []).join(" · ")}`,
      `용신 키워드: ${(masterJson?.structure?.usefulGodKeywords || []).join(" · ")}`,
      `퀀텀 명리: ${clean(quantum.professionalSummary)}`,
      `실행 달: ${goMonths.join("·") || "월별 점검"} / 주의 달: ${stopMonths.join("·") || "월별 점검"}`,
    ].filter((line) => clean(line).replace(/undefined|null/g, "").length > 8),
    interpretationOrder: ["사주 근거", "올해의 흐름", "현실 발현", "월별 실행", "품격 있는 주의점"],
    writingVoice: "최고의 신년운세 명리 상담가가 한 해의 선택 기준을 짚어 주는 전문적이고 신비로운 존댓말 상담체",
    safety: ["결과 단정 금지", "불안 조장 금지", "투자·건강 진단 확정 금지", "개발 용어 노출 금지"],
  });
}

function buildNewYearMasterJson(seed = {}, body = {}) {
  const pillars = seed?.saju?.pillars || {};
  const annual = seed?.saju?.annualLuck || {};
  const monthly = Array.isArray(seed?.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  const clientEvidence = body?.quantumMyeongriJson || body?.clientEngineEvidence || body?.clientMyeongriJson || null;
  const masterJson = compactNewYearObject({
    schemaVersion: "saju-new-year-master-json.v1",
    calculationSource: "worker-saju-new-year-engine",
    generationMode: "annual-fortune-facts-plan-hybrid-v1",
    productId: ANNUAL_FORTUNE_PRODUCT_ID,
    promptVersion: ANNUAL_FORTUNE_PROMPT_VERSION,
    engineVersion: ANNUAL_FORTUNE_ENGINE_VERSION,
    serviceKey: SERVICE_KEY,
    targetYear: seed?.targetYear,
    input: seed?.input,
    birthProfile: seed?.birthProfile,
    natalChart: {
      dayMaster: clean(seed?.saju?.dayMaster),
      yearPillar: pillars.year,
      monthPillar: pillars.month,
      dayPillar: pillars.day,
      hourPillar: pillars.hour,
      eightCharacters: ["year", "month", "day", "hour"]
        .map((key) => `${clean(pillars?.[key]?.stem)}${clean(pillars?.[key]?.branch)}`)
        .filter(Boolean)
        .join(" "),
      monthBranch: clean(pillars?.month?.branch),
      dayBranch: clean(pillars?.day?.branch),
      fiveElements: seed?.saju?.fiveElements,
      tenGods: seed?.saju?.tenGods,
      usefulGod: seed?.saju?.usefulGod,
      luckCycle: seed?.saju?.luckCycle,
    },
    yearlyFlow: {
      year: annual.year,
      pillar: clean(annual.label),
      heavenlyStem: clean(annual.stem),
      earthlyBranch: clean(annual.branch),
      element: clean(annual.element),
      elementKo: clean(annual.elementKo),
      tenGodToDayMaster: clean(annual.tenGod),
      dayMasterRelation: clean(annual.dayMasterRelation),
      natalInteractions: (seed?.saju?.relations?.branchRelations || []).map((row) => clean(row?.message)).filter(Boolean),
      quantum: annual.quantum,
    },
    monthlyFlow: monthly.map((item) => compactNewYearObject({
      month: item.month,
      pillar: clean(item?.pillar?.label),
      element: clean(item?.pillar?.element),
      relation: clean(item?.relation),
      baseScore: item.baseScore,
      quantumAdjustment: item.quantumAdjustment,
      finalScore: item.finalScore ?? item.score,
      decision: clean(item.decision || decisionFromScore(item.finalScore || item.score)),
      tone: clean(item.tone),
      advice: clean(item.advice),
      quantumSummary: clean(item.quantumSummary),
    })),
    quantumMyeongri: seed?.quantumMyeongri || seed?.saju?.quantumMyeongri,
    annualFortuneFacts: seed?.annualFortuneFacts || buildAnnualFortuneFacts(seed),
    annualFortuneChapterPlans: (seed?.annualFortuneChapterPlans || []).map((plan) => ({
      ...plan,
      localDraft: clean(plan.localDraft).slice(0, 2400),
    })),
    structure: seed?.structure,
    derivedSignals: seed?.derivedSignals,
    chapterSpecs: seed?.chapterSpecs,
    localSeedSummary: {
      yearlyThemeSignals: seed?.derivedSignals?.yearlyThemeSignals,
      careerSignals: seed?.derivedSignals?.careerSignals,
      moneySignals: seed?.derivedSignals?.moneySignals,
      relationshipSignals: seed?.derivedSignals?.humanRelationSignals,
      healthSignals: seed?.derivedSignals?.healthMindSignals,
      riskSignals: seed?.derivedSignals?.crisisSignals,
    },
    clientEngineEvidence: clientEvidence && typeof clientEvidence === "object"
      ? {
          usagePolicy: "supplemental_only_worker_engine_is_source_of_truth",
          snapshot: cloneNewYearValue(clientEvidence),
        }
      : undefined,
    qualityRules: {
      mustUseOnlyProvidedEvidence: true,
      mustKeepCounselingTone: true,
      mustAvoidDeterministicClaims: true,
      mustIncludeMonthlyAction: true,
    },
  });

  return {
    ...masterJson,
    consultationEvidence: buildNewYearConsultationEvidence(masterJson),
  };
}

function validateNewYearMasterJson(masterJson = {}) {
  const errors = [];
  const requireField = (condition, code) => {
    if (!condition) errors.push(code);
  };
  const monthly = Array.isArray(masterJson?.monthlyFlow) ? masterJson.monthlyFlow : [];
  const quantumMonthly = Array.isArray(masterJson?.quantumMyeongri?.monthlyQuantum) ? masterJson.quantumMyeongri.monthlyQuantum : [];

  requireField(clean(masterJson?.schemaVersion) === "saju-new-year-master-json.v1", "schema_version_invalid");
  requireField(clean(masterJson?.calculationSource) === "worker-saju-new-year-engine", "calculation_source_invalid");
  requireField(Number(masterJson?.targetYear) >= 1900 && Number(masterJson?.targetYear) <= 2100, "target_year_invalid");
  requireField(clean(masterJson?.birthProfile?.birthDate), "birth_date_missing");
  requireField(clean(masterJson?.natalChart?.dayMaster), "day_master_missing");
  requireField(clean(masterJson?.natalChart?.yearPillar?.stem) && clean(masterJson?.natalChart?.yearPillar?.branch), "year_pillar_missing");
  requireField(clean(masterJson?.natalChart?.monthPillar?.stem) && clean(masterJson?.natalChart?.monthPillar?.branch), "month_pillar_missing");
  requireField(clean(masterJson?.natalChart?.dayPillar?.stem) && clean(masterJson?.natalChart?.dayPillar?.branch), "day_pillar_missing");
  requireField(clean(masterJson?.yearlyFlow?.pillar), "yearly_pillar_missing");
  requireField(clean(masterJson?.yearlyFlow?.tenGodToDayMaster), "yearly_ten_god_missing");
  requireField(monthly.length === 12, "monthly_flow_count");
  monthly.forEach((item, index) => {
    const score = Number(item?.finalScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) errors.push(`monthly_flow_${index + 1}_score`);
    if (!["GO", "WATCH", "STOP"].includes(clean(item?.decision))) errors.push(`monthly_flow_${index + 1}_decision`);
  });
  requireField(quantumMonthly.length === 12, "quantum_monthly_count");
  requireField((masterJson?.consultationEvidence?.sajuEvidence || []).length >= 6, "consultation_evidence_too_thin");
  requireField(Array.isArray(masterJson?.chapterSpecs) && masterJson.chapterSpecs.length === 10, "chapter_specs_count");
  requireField(clean(masterJson?.annualFortuneFacts?.productId) === ANNUAL_FORTUNE_PRODUCT_ID, "annual_fortune_facts_product");
  requireField(Number(masterJson?.annualFortuneFacts?.targetYear) === Number(masterJson?.targetYear), "annual_fortune_facts_target_year");
  requireField(Array.isArray(masterJson?.annualFortuneFacts?.monthlyFlows) && masterJson.annualFortuneFacts.monthlyFlows.length === 12, "annual_fortune_facts_monthly_count");
  requireField(Array.isArray(masterJson?.annualFortuneChapterPlans) && masterJson.annualFortuneChapterPlans.length === 10, "annual_fortune_chapter_plans_count");

  return { ok: errors.length === 0, errors };
}

function parseNewYearGeminiJson(text, schemaName) {
  const raw = clean(text).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const candidates = [
    raw,
    raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1),
  ].filter((candidate) => clean(candidate).length > 1);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }
  throw new Error(`SAJU_NEW_YEAR_LLM_JSON_PARSE_FAILED:${schemaName}`);
}

async function generateNewYearGeminiJson(env, { systemPrompt, userPrompt, requestId, schemaName }) {
  if (!annualFortuneLlmEnabled(env)) {
    throw Object.assign(new Error("SAJU_NEW_YEAR_LLM_DISABLED"), {
      code: "SAJU_NEW_YEAR_LLM_DISABLED",
      status: 503,
      provider: YEARLY_SAJU_PDF_CONFIG.provider,
    });
  }
  const result = await callGeminiText(env, `${systemPrompt}\n\n${userPrompt}`, {
    keyEnvKeys: NEW_YEAR_LLM_KEY_ENV_KEYS,
    modelEnvKeys: NEW_YEAR_LLM_MODEL_ENV_KEYS,
    models: pickNewYearGeminiModels(env),
    temperature: Number(env?.SAJU_NEW_YEAR_GEMINI_TEMPERATURE || env?.PREMIUM_GEMINI_TEMPERATURE || 0.35),
    topP: Number(env?.SAJU_NEW_YEAR_GEMINI_TOP_P || env?.PREMIUM_GEMINI_TOP_P || 0.9),
    maxOutputTokens: Number(env?.SAJU_NEW_YEAR_GEMINI_MAX_OUTPUT_TOKENS || env?.PREMIUM_GEMINI_MAX_OUTPUT_TOKENS || 8192),
    timeoutMs: Number(env?.SAJU_NEW_YEAR_GEMINI_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || 45000),
    totalTimeoutMs: Number(env?.SAJU_NEW_YEAR_GEMINI_TOTAL_TIMEOUT_MS || 0),
    maxAttemptsPerPair: Math.min(1, Number(env?.SAJU_NEW_YEAR_GEMINI_RETRIES || env?.PREMIUM_GEMINI_RETRIES || 1)),
    useSdk: false,
    disableVertexFallback: true,
    metadata: { requestId, schemaName },
  });
  if (!result?.ok) {
    throw Object.assign(new Error(clean(result?.message || "신년운세 원고 생성에 실패했습니다.")), {
      code: clean(result?.error || "SAJU_NEW_YEAR_LLM_GENERATION_FAILED"),
      status: Number(result?.status || 0) || null,
    });
  }
  return parseNewYearGeminiJson(result.text, schemaName);
}

function normalizeNewYearGeneratedChapter(parsed = {}, chapterSpec = {}, seed = {}) {
  const sourceSections = Array.isArray(parsed?.sections) ? parsed.sections : [];
  const sections = (chapterSpec?.categories || []).map((title, index) => {
    const source = sourceSections[index] || {};
    const body = softenAnnualFortuneRiskText(source.body || source.text || "", seed?.targetYear);
    return {
      title,
      body,
      sajuEvidence: Array.isArray(source.sajuEvidence) ? source.sajuEvidence.map(stripForbiddenText).filter(Boolean).slice(0, 8) : [],
      actionGuide: Array.isArray(source.actionGuide) ? source.actionGuide.map(stripForbiddenText).filter(Boolean).slice(0, 8) : [],
      monthlyStrategy: Array.isArray(source.monthlyStrategy) ? source.monthlyStrategy.map(stripForbiddenText).filter(Boolean).slice(0, 12) : [],
      caution: Array.isArray(source.caution) ? source.caution.map(stripForbiddenText).filter(Boolean).slice(0, 8) : [],
    };
  });
  const categories = sections.map((section) => ({
    title: section.title,
    localSummary: section.body,
    finalText: section.body,
    sajuEvidence: section.sajuEvidence,
    actionGuide: section.actionGuide,
    monthlyStrategy: section.monthlyStrategy,
    caution: section.caution,
  }));
  return {
    no: Number(chapterSpec?.no || parsed?.chapterNumber || 0),
    title: clean(chapterSpec?.title || parsed?.chapterTitle || ""),
    categories,
    sections,
    text: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
    masterAdvice: softenAnnualFortuneRiskText(parsed?.masterAdvice || "", seed?.targetYear),
    source: NEW_YEAR_MANUSCRIPT_SOURCE.LLM,
  };
}

function countAnnualFortuneLockedFactMatches(text = "", lockedFacts = []) {
  const body = clean(text);
  if (!body || !Array.isArray(lockedFacts) || lockedFacts.length === 0) return 0;
  return lockedFacts.reduce((acc, fact) => {
    const tokens = clean(fact).match(/[가-힣A-Za-z0-9甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]{2,}/g) || [];
    return acc + (tokens.some((token) => body.includes(token)) ? 1 : 0);
  }, 0);
}

function sanitizeAnnualFortuneChapter({ seed, chapterSpec, chapter, chapterPlan, source = NEW_YEAR_MANUSCRIPT_SOURCE.LOCAL } = {}) {
  const plan = chapterPlan || {};
  const lockedFacts = Array.isArray(plan.lockedFacts) ? plan.lockedFacts : [];
  const localDraft = buildDeterministicChapterFromSpec(seed, chapterSpec, "annual_fortune_chapter_sanitize");
  const srcSections = Array.isArray(chapter?.sections)
    ? chapter.sections
    : Array.isArray(chapter?.categories)
      ? chapter.categories.map((item) => ({ title: item?.title, body: item?.finalText || item?.localSummary || item?.body || "" }))
      : [];
  let fallbackSections = 0;
  const sections = (chapterSpec?.categories || []).map((title, index) => {
    const src = srcSections[index] || {};
    const localBody = clean(localDraft.sections?.[index]?.body || buildHighQualityNewYearSection(seed, chapterSpec, title, index));
    let body = softenAnnualFortuneRiskText(src.body || src.finalText || src.text || "", seed?.targetYear);
    if (clean(src.title) !== clean(title) || body.length < MIN_SECTION_CHARS || hasForbiddenText(body)) {
      fallbackSections += 1;
      body = localBody;
    }
    const matches = countAnnualFortuneLockedFactMatches(body, lockedFacts);
    if (lockedFacts.length && matches < Math.min(3, lockedFacts.length)) {
      body = `${body}\n\n이 장에서 변하지 않는 기준은 ${lockedFacts.slice(0, 3).join(" ")} 이 흐름입니다. 따라서 ${seed?.targetYear}년의 판단은 제공된 세운과 월운, 원국 관계를 벗어나지 않는 선에서 조정해야 합니다.`;
    }
    return {
      title,
      body: ensureMinLength(softenAnnualFortuneRiskText(body, seed?.targetYear), desiredSectionLength(), seed, title),
    };
  });
  const categories = sections.map((section) => ({
    title: section.title,
    localSummary: section.body,
    finalText: section.body,
  }));
  return {
    chapter: {
      no: Number(chapterSpec?.no || 0),
      title: clean(chapterSpec?.title || ""),
      categories,
      sections,
      text: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
      masterAdvice: softenAnnualFortuneRiskText(chapter?.masterAdvice || "", seed?.targetYear),
      source: fallbackSections > 0 && source === NEW_YEAR_MANUSCRIPT_SOURCE.LLM ? "hybrid-llm-with-local-fallback" : source,
      chapterPlanId: clean(plan.chapterId || getAnnualFortuneChapterId(chapterSpec)),
      fallbackSections,
    },
    fallbackSections,
  };
}

function buildNewYearChapterPrompt({ masterJson, chapterSpec, chapterPlan = {}, previousSummaries = [], validationFeedback = "" }) {
  const systemPrompt = [
    "당신은 사주 계산자가 아닙니다.",
    "당신은 세운이나 월운을 새로 산출하는 사람이 아닙니다.",
    "아래 제공되는 신년운세 계산 결과는 이미 확정된 값입니다.",
    "일간, 일간 강약, 오행 분포, 십성, 용신, 희신, 기신, 격국, 대운, 세운, 월운, 충합형파해, 신살을 절대 변경하지 마세요.",
    "새로운 사주 계산, 세운 계산, 월운 계산을 하지 마세요.",
    "제공되지 않은 정보를 단정하지 마세요.",
    "lockedFacts는 반드시 반영하세요.",
    "로컬 계산 결과와 모순되는 문장을 쓰지 마세요.",
    "독자의 불안감을 과도하게 자극하지 마세요.",
    "반드시 망한다, 큰 사고가 난다, 돈을 잃는다, 병에 걸린다, 이별한다, 실패한다 같은 단정적이고 공포를 조장하는 표현을 피하세요.",
    "건강, 사고, 금전 손실, 이별, 소송, 해고 같은 민감한 주제는 가능성, 주의점, 관리법 중심으로 표현하세요.",
    "신년운세 상담문처럼 자연스럽고 깊이 있게 작성하세요.",
    "반복 문장을 줄이고, 챕터마다 다른 관점으로 설명하세요.",
    "한국어로 작성하세요.",
    "최종 PDF 독자가 돈을 내고 읽는 프리미엄 신년운세 리포트처럼 느껴지게 작성하세요.",
    "실천 조언은 구체적이되, 과도한 확정 예언처럼 쓰지 마세요.",
    "당신은 사주 원국, 세운, 월운, 대운을 바탕으로 신년운세 PDF의 개인화 본문만 다듬는 명리 상담가입니다.",
    "챕터 제목, 섹션 제목, 목차, 표지 문구, 공통 안내문은 이미 정적 템플릿으로 준비되어 있으므로 생성하지 마세요.",
    "제공된 마스터 상담 JSON과 계산 근거만 사용하고, 없는 값은 만들지 마세요.",
    "좋다/나쁘다로 단정하지 말고 올해의 선택 기준, 실행 전략, 주의점으로 표현하세요.",
    "재물, 건강, 직업 결과를 확정하거나 공포를 조장하지 마세요.",
    "본문에는 JSON, schema, prompt, API, Gemini, LLM, 엔진 같은 개발 용어를 절대 쓰지 마세요.",
    "출력은 순수 JSON 객체 하나만 허용합니다. 코드블록과 설명문은 쓰지 마세요.",
    "응답은 반드시 { 로 시작해서 } 로 끝나야 합니다.",
  ].join("\n");
  const userPrompt = JSON.stringify({
    task: "사주 신년운세 프리미엄 PDF 개인화 본문 생성",
    promptVersion: ANNUAL_FORTUNE_PROMPT_VERSION,
    requiredOutputShape: {
      chapterNumber: chapterSpec.no,
      sections: [
        {
          body: "string",
          sajuEvidence: ["string"],
          actionGuide: ["string"],
          monthlyStrategy: ["string"],
          caution: ["string"],
        },
      ],
      masterAdvice: "string",
    },
    staticTemplatePolicy: {
      chapterTitleIsFixed: chapterSpec.title,
      sectionTitlesAreFixedInThisOrder: chapterSpec.categories,
      doNotGenerate: ["표지", "목차", "챕터 제목", "섹션 제목", "공통 안내문", "면책 문구", "다운로드 안내"],
    },
    sectionRules: {
      categories: chapterSpec.categories,
      oneSectionPerCategory: true,
      minimumBodyLengthPerSection: desiredSectionLength(),
      eachSectionMustInclude: ["사주 근거", "올해 현실 발현", "월별 또는 분기별 실행", "주의점", "품격 있는 조언"],
      tone: "전문적인 명리 상담가가 한 해의 길을 조용히 열어 주는 신비롭고 품격 있는 상담체",
    },
    annualFortuneChapterPlan: {
      chapterId: chapterPlan.chapterId,
      chapterTitle: chapterPlan.chapterTitle,
      targetYear: chapterPlan.targetYear,
      purpose: chapterPlan.purpose,
      lockedFacts: chapterPlan.lockedFacts,
      interpretationPoints: chapterPlan.interpretationPoints,
      warnings: chapterPlan.warnings,
      recommendedTone: chapterPlan.recommendedTone,
      localDraft: clean(chapterPlan.localDraft).slice(0, 5200),
    },
    outputConditions: [
      "한국어",
      "프리미엄 사주 신년운세 상담문 스타일",
      "독자에게 직접 말하는 문체",
      "불필요한 반복 금지",
      "계산 결과 변경 금지",
      "세운/월운 임의 생성 금지",
      "lockedFacts 누락 금지",
      "과장, 공포 마케팅 금지",
      "건강/사고/금전/이별 관련 단정 금지",
      "각 섹션 본문은 바로 PDF에 넣을 수 있게 작성",
    ],
    previousSummaries,
    validationFeedback: clean(validationFeedback),
    masterJson,
  });
  return { systemPrompt, userPrompt };
}

async function generateNewYearChapterWithGemini(env, { masterJson, seed, chapterSpec, chapterPlan = {}, previousSummaries = [], requestId, validationFeedback = "" }) {
  const { systemPrompt, userPrompt } = buildNewYearChapterPrompt({ masterJson, chapterSpec, chapterPlan, previousSummaries, validationFeedback });
  const parsed = await generateNewYearGeminiJson(env, {
    systemPrompt,
    userPrompt,
    requestId,
    schemaName: `SajuNewYearChapter${chapterSpec.no}`,
  });
  return normalizeNewYearGeneratedChapter(parsed, chapterSpec, seed);
}

async function generateAnnualFortuneHybridChapters(env, { masterJson, seed, chapterSpecs, requestId, userId = null }) {
  const facts = seed?.annualFortuneFacts || buildAnnualFortuneFacts(seed);
  const plans = Array.isArray(seed?.annualFortuneChapterPlans) && seed.annualFortuneChapterPlans.length
    ? seed.annualFortuneChapterPlans
    : buildAnnualFortuneChapterPlans(seed, chapterSpecs);
  const localChapters = buildLocalSkeleton(seed);
  const chapters = [];
  const previousSummaries = [];
  const stats = {
    promptVersion: ANNUAL_FORTUNE_PROMPT_VERSION,
    engineVersion: ANNUAL_FORTUNE_ENGINE_VERSION,
    generationMode: YEARLY_SAJU_PDF_CONFIG.generationMode,
    provider: YEARLY_SAJU_PDF_CONFIG.provider,
    llmEnabled: annualFortuneLlmEnabled(env),
    quarterlyLlmEnabled: annualFortuneQuarterlyLlmEnabled(env),
    llmAttempted: 0,
    llmSucceeded: 0,
    llmCached: 0,
    persistentCacheHits: 0,
    persistentCacheWrites: 0,
    llmSkipped: 0,
    localFallback: 0,
    fallbackSections: 0,
    cacheKeys: [],
    enhancedChapterIds: [],
    skippedChapterIds: [],
  };
  for (const chapterSpec of chapterSpecs) {
    const index = Math.max(0, Number(chapterSpec?.no || 1) - 1);
    const chapterPlan = plans.find((plan) => clean(plan?.chapterId) === getAnnualFortuneChapterId(chapterSpec)) || plans[index] || {};
    const chapterId = clean(chapterPlan?.chapterId || getAnnualFortuneChapterId(chapterSpec));
    const localChapter = localChapters[index] || buildDeterministicChapterFromSpec(seed, chapterSpec, "annual_fortune_hybrid_local");
    if (!shouldEnhanceAnnualFortuneChapter(chapterSpec, env)) {
      stats.llmSkipped += 1;
      stats.skippedChapterIds.push(chapterId);
      chapters.push({ ...localChapter, source: NEW_YEAR_MANUSCRIPT_SOURCE.LOCAL, chapterPlanId: chapterId });
      continue;
    }

    const cacheKey = buildAnnualFortuneLlmCacheKey(facts, chapterPlan);
    stats.cacheKeys.push(cacheKey);
    const cached = annualFortuneLlmCache.get(cacheKey);
    if (cached) {
      stats.llmCached += 1;
      stats.enhancedChapterIds.push(chapterId);
      chapters.push({ ...cloneNewYearValue(cached), source: "annual-fortune-llm-cache", chapterPlanId: chapterId });
      previousSummaries.push({
        no: cached.no,
        title: cached.title,
        summary: clean(cached.masterAdvice || cached.sections?.[0]?.body || "").slice(0, 420),
      });
      continue;
    }

    const persistentCached = await findAnnualFortunePersistentChapterCache(env, userId, cacheKey);
    if (persistentCached) {
      rememberAnnualFortuneLlmCache(cacheKey, persistentCached);
      stats.llmCached += 1;
      stats.persistentCacheHits += 1;
      stats.enhancedChapterIds.push(chapterId);
      chapters.push({ ...persistentCached, source: "annual-fortune-db-cache", chapterPlanId: chapterId });
      previousSummaries.push({
        no: persistentCached.no,
        title: persistentCached.title,
        summary: clean(persistentCached.masterAdvice || persistentCached.sections?.[0]?.body || "").slice(0, 420),
      });
      continue;
    }

    stats.llmAttempted += 1;
    try {
      const generated = await generateNewYearChapterWithGemini(env, {
        masterJson,
        seed,
        chapterSpec,
        chapterPlan,
        previousSummaries,
        requestId: clean(requestId || `saju-new-year:${seed?.targetYear}:${Date.now().toString(36)}`),
      });
      const sanitized = sanitizeAnnualFortuneChapter({
        seed,
        chapterSpec,
        chapter: generated,
        chapterPlan,
        source: NEW_YEAR_MANUSCRIPT_SOURCE.LLM,
      });
      stats.fallbackSections += sanitized.fallbackSections;
      stats.llmSucceeded += 1;
      stats.enhancedChapterIds.push(chapterId);
      rememberAnnualFortuneLlmCache(cacheKey, sanitized.chapter);
      if (await rememberAnnualFortunePersistentChapterCache(env, userId, cacheKey, sanitized.chapter, {
        targetYear: facts.targetYear,
        chapterId,
        calculationBasisHash: hashAnnualFortuneValue(facts.calculationBasis || {}),
        birthInfoHash: hashAnnualFortuneValue(facts.birthInfo || {}),
      })) {
        stats.persistentCacheWrites += 1;
      }
      chapters.push(sanitized.chapter);
      previousSummaries.push({
        no: sanitized.chapter.no,
        title: sanitized.chapter.title,
        summary: clean(sanitized.chapter.masterAdvice || sanitized.chapter.sections?.[0]?.body || "").slice(0, 420),
      });
    } catch (error) {
      stats.localFallback += 1;
      console.warn("[NewYearPremiumPDF][AnnualFortuneChapterFallback]", {
        chapterId,
        reason: clean(error?.code || error?.message || "llm_failed"),
      });
      const sanitized = sanitizeAnnualFortuneChapter({
        seed,
        chapterSpec,
        chapter: localChapter,
        chapterPlan,
        source: NEW_YEAR_MANUSCRIPT_SOURCE.LOCAL,
      });
      stats.fallbackSections += sanitized.fallbackSections;
      chapters.push(sanitized.chapter);
    }
  }
  return { chapters, stats };
}

async function generateNewYearChaptersWithGemini(env, { masterJson, seed, chapterSpecs, requestId }) {
  const result = await generateAnnualFortuneHybridChapters(env, { masterJson, seed, chapterSpecs, requestId });
  return result.chapters;
}

function localParagraph(seed, chapter, category, idx) {
  const annual = seed.saju.annualLuck;
  const tenGodLib = getTenGodLib(annual.tenGod);
  const relations = seed.saju.relations?.branchRelations || [];
  const clashes = relations.filter((r) => r.type === "충");
  const combos = relations.filter((r) => r.type === "합");
  const monthlyStrong = seed.saju.monthlyLuck.filter((m) => m.score >= 75);
  const monthlyCare = seed.saju.monthlyLuck.filter((m) => m.score < 60);
  const dayMaster = seed.saju.dayMaster || "戊";
  const dayElementKo = ELEMENT_KO[STEM_ELEMENT[dayMaster] || "earth"] || "토";
  const yearPillar = seed.saju.pillars?.year?.branch || "";
  const monthPillarBranch = seed.saju.pillars?.month?.branch || "";
  const dayPillarBranch = seed.saju.pillars?.day?.branch || "";
  const hourPillarBranch = seed.saju.pillars?.hour?.branch || "";
  const relMsgs = relations.slice(0, 3).map((r) => r.message).join(" ");
  const canonicalChapterNo = Number(chapter.no || 0);

  // Chapter 9 — 월별 Go/Stop
  if (canonicalChapterNo === 9) {
    if (idx === 0) {
      const firstHalf = seed.saju.monthlyLuck.slice(0, 6);
      return describeMonthlyGroup(firstHalf, seed) + `\n\n상반기는 올해 전체 방향을 실제 행동으로 바꾸는 구간입니다. ${annual.label} 세운이 초반에 던지는 신호를 흘려보내지 말고, 1월부터 6월까지의 흐름을 연결해서 보면 어디에서 속도를 내고 어디에서 균형을 잡아야 하는지가 선명해집니다. 상반기에 무리하게 모든 것을 끝내려 하기보다, 6월까지 기반을 단단히 세우고 관계와 일의 우선순위를 정리해 두면 하반기의 성과가 훨씬 안정적으로 이어집니다.`;
    }
    if (idx === 1) {
      const secondHalf = seed.saju.monthlyLuck.slice(6, 12);
      return describeMonthlyGroup(secondHalf, seed) + `\n\n하반기는 상반기에 만들어 둔 흐름을 수확과 재배치로 연결하는 구간입니다. 7월부터 12월까지는 운의 강약이 더 분명하게 체감되기 쉬우므로, 기회가 오는 달에는 과감히 밀어붙이고 부담이 커지는 달에는 무리한 결정을 늦추는 식의 운영이 필요합니다. 하반기를 잘 쓰는 사람은 연말에 성과만 남기는 것이 아니라, 다음 해로 이어질 기반까지 함께 남깁니다.`;
    }
    if (idx === 2) {
      const careMonths = seed.saju.monthlyLuck.filter((m) => m.score < 60);
      return `${careMonths.length ? careMonths.map((m) => `${m.month}월`).join("·") : "올해는 특정 한 달보다 상황별 대응이 더 중요합니다."}에는 특히 조심해야 할 흐름이 드러납니다. ${careMonths.length ? `${careMonths.map((m) => `${m.month}월`).join("·")}에는 세운과 월운이 원국에 부담으로 겹치면서 일정 변경, 감정 소모, 지출 증가, 관계 오해가 함께 움직일 가능성이 큽니다.` : "점수가 급격히 무너지는 달이 적더라도, 무리한 투자나 감정적 결정을 반복하면 충분히 흐름이 흔들릴 수 있습니다."} 이런 시기에는 새로운 시작보다 이미 잡아 놓은 계획을 점검하고, 사람과 돈, 일정의 균형을 다시 맞추는 것이 더 중요합니다. 조심해야 할 달의 핵심은 겁을 먹는 것이 아니라, 속도를 조절하고 방어선을 세우는 데 있습니다. 중요한 계약이나 큰 지출은 하루 이틀이라도 더 시간을 두고 검토하고, 관계에서는 말의 결론보다 말의 온도를 먼저 관리해야 손실을 줄일 수 있습니다. 결국 조심해야 할 달을 잘 보내는 사람이 한 해 전체의 안정감을 지킬 수 있습니다.`;
    }
    if (idx === 3) {
      const opportunityMonths = seed.saju.monthlyLuck.filter((m) => m.score >= 75);
      return `${opportunityMonths.length ? opportunityMonths.map((m) => `${m.month}월`).join("·") : "올해의 기회는 특정 한 달에 몰리기보다 준비된 순간에 열립니다."}에는 기회를 잡기 좋은 흐름이 강하게 작동합니다. ${opportunityMonths.length ? `${opportunityMonths.map((m) => `${m.month}월`).join("·")}은 세운의 힘이 월운과 맞물리면서 일, 재물, 관계에서 성과를 현실로 끌어오기 좋은 달입니다.` : "기회가 한 달에 몰리지 않더라도, 준비된 사람에게는 언제든 흐름이 열릴 수 있습니다."} 이 시기에는 준비만 하다가 타이밍을 놓치지 않도록 제안, 발표, 계약, 전환 같은 핵심 행동을 미리 배치해 두는 것이 좋습니다. 기회를 잡기 좋은 달에는 완벽한 조건을 기다리기보다 이미 준비한 것을 시장과 관계 속에 내놓는 용기가 필요합니다. 올해의 좋은 달을 잘 쓰는 사람은 단순히 운이 좋았던 것이 아니라, 좋은 달이 왔을 때 바로 움직일 수 있도록 미리 정리해 둔 사람입니다.`;
    }
    return `월별 운세는 달마다 점수가 다르다는 사실을 보는 데서 끝나면 큰 의미가 없습니다. 중요한 것은 그 달의 기운을 실제 계획에 어떻게 배치하느냐입니다. 점수가 높은 달에는 사람을 만나고, 제안을 하고, 중요한 결정을 내리는 쪽으로 일정을 설계하고, 점수가 낮은 달에는 점검과 정리, 관계 조율, 비용 관리에 무게를 두는 방식이 가장 현실적입니다. 또한 올해의 월운은 원국과 대운, 세운이 함께 만든 리듬이므로 한 달만 떼어 보지 말고 앞뒤 달의 연결까지 함께 봐야 흐름이 읽힙니다. 월별 운세 활용법의 핵심은 달의 좋고 나쁨을 따지는 것이 아니라, 달마다 해야 할 행동의 성격을 다르게 가져가는 데 있습니다. 그 기준만 잡혀 있으면 한 해 전체가 훨씬 덜 흔들리고, 운을 생활 속 선택으로 바꾸는 힘이 생깁니다.`;
  }

  if (canonicalChapterNo === 7) {
    const q1 = seed.saju.monthlyLuck.slice(0, 3);
    const q2 = seed.saju.monthlyLuck.slice(3, 6);
    const q3 = seed.saju.monthlyLuck.slice(6, 9);
    const q4 = seed.saju.monthlyLuck.slice(9, 12);
    const quarterText = (label, rows) => {
      const strong = rows.filter((m) => Number(m.score || 0) >= 75).map((m) => `${m.month}월`);
      const care = rows.filter((m) => Number(m.score || 0) < 60).map((m) => `${m.month}월`);
      return `${label}는 ${rows.map((m) => `${m.month}월 ${m.pillar?.label || ""}(${m.score}점)`).join(", ")}의 흐름으로 열립니다. ${strong.length ? `${strong.join("·")}에는 제안, 실행, 발표, 관계 확장처럼 밖으로 드러나는 선택을 배치하는 것이 좋습니다.` : "무리한 확장보다 기반을 다듬는 운영이 더 중요합니다."} ${care.length ? `${care.join("·")}에는 일정, 지출, 감정 반응을 보수적으로 조절해야 합니다.` : "크게 꺾이는 달이 적더라도 결정의 순서를 정돈해야 안정감이 유지됩니다."}`;
    };
    const texts = [
      `${quarterText("1분기", q1)} 1분기는 한 해의 기준을 세우는 문입니다. 이 시기에는 새로운 목표를 많이 늘리기보다, 원국과 세운이 가리키는 핵심 과제를 먼저 한 문장으로 정리해야 합니다. 세운 ${annual.label}의 ${annual.tenGod} 기운이 초반부터 압박이나 기회로 들어올 수 있으므로, 사람·돈·일정의 우선순위를 빠르게 확정하는 것이 좋습니다. 1분기에 선택해야 할 것은 큰 승부가 아니라 올해 끝까지 지킬 기준입니다.`,
      `${quarterText("2분기", q2)} 2분기는 1분기에 세운 기준을 현실에서 검증하는 시기입니다. 좋은 흐름이 열리면 제안과 실행을 늦추지 말고, 흐름이 약한 달에는 계약 조건과 협업 구조를 다시 확인해야 합니다. 이때 중요한 것은 확장 자체가 아니라 확장한 뒤 감당할 수 있는가입니다. 세운과 월운이 함께 살아나는 달에는 커리어, 재물, 관계에서 눈에 보이는 반응이 들어올 수 있으므로 미리 준비한 안건을 꺼내는 용기가 필요합니다.`,
      `${quarterText("3분기", q3)} 3분기는 상반기의 결과가 사람과 돈, 감정의 문제로 되돌아오는 구간입니다. 이 시기에는 속도보다 조율이 중요하며, 이미 시작한 일의 손익과 관계의 온도를 함께 살펴야 합니다. 충이나 해의 신호가 강한 달에는 작은 오해가 큰 피로로 커질 수 있으므로 말의 결론보다 말의 순서를 조심해야 합니다. 3분기를 잘 쓰면 한 해의 중반 피로가 성과 회수의 힘으로 바뀝니다.`,
      `${quarterText("4분기", q4)} 4분기는 마무리와 재설계가 함께 필요한 시기입니다. 성과가 난 일은 구조화하고, 힘만 들고 남은 것이 적은 일은 과감하게 덜어내야 합니다. 연말의 운은 다음 해의 기반과 이어지므로, 단순히 버티는 방식보다 무엇을 남기고 무엇을 닫을지 분명히 정하는 것이 좋습니다. 4분기에는 큰 결론보다 정리의 품질이 다음 흐름을 결정합니다.`,
      `올해 가장 중요한 결정 타이밍은 월운 점수가 높은 달과 세운의 ${annual.tenGod} 기운이 현실 사건으로 드러나는 순간이 겹칠 때입니다. ${monthlyStrong.length ? `${monthlyStrong.slice(0, 3).map((m) => `${m.month}월`).join("·")}은 실행 후보가 될 수 있고,` : "좋은 흐름은 특정 달 하나보다 준비된 순간에 열릴 수 있고,"} ${monthlyCare.length ? `${monthlyCare.slice(0, 2).map((m) => `${m.month}월`).join("·")}은 재검토 후보가 됩니다.` : "낮은 흐름은 감정과 일정이 동시에 무거워질 때 재검토해야 합니다."} 분기별 의사결정의 핵심은 운을 기다리는 것이 아니라, 강한 달에는 열고 약한 달에는 닫는 문을 정확히 구분하는 데 있습니다.`,
    ];
    return texts[idx] || texts[0];
  }

  const chapterNo = ({ 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 8: 9 }[canonicalChapterNo] || canonicalChapterNo);

  // Chapter 1 — 올해의 큰 흐름
  if (chapterNo === 1) {
    const openings = [
      `${seed.targetYear}년을 시작하면서 가장 먼저 알아야 할 것은 이 해가 어떤 에너지로 열리는가입니다. 세운 ${annual.label}은 ${annual.elementKo} 기운을 중심으로 움직이며, 이 기운이 당신의 원국과 만나는 방식에서 올해의 큰 그림이 결정됩니다.`,
      `올해의 분위기를 한 마디로 설명한다면, ${annual.tenGod}의 에너지가 당신의 일상 선택에 어떻게 들어오느냐입니다. ${tenGodLib.yearlyTheme}`,
      `세운 ${annual.label}이 원국에 들어올 때 ${annual.dayMasterRelation}의 방식으로 작동합니다. 이것은 올해가 ${annual.dayMasterRelation === "압박과 책임" ? "외부의 요구와 책임이 커지는 해" : annual.dayMasterRelation === "표현과 생산" ? "내가 가진 것을 외부로 드러내고 생산하는 해" : annual.dayMasterRelation === "관리와 재물" ? "재물과 성과를 직접 관리하는 해" : annual.dayMasterRelation === "지원과 회복" ? "지원받고 회복하며 기반을 다지는 해" : "내 기준과 중심을 더 선명하게 세우는 해"}임을 말해줍니다.`,
      `${clashes.length > 0 ? `올해의 큰 흐름에서 주목할 점은 원국의 ${clashes.map((c) => c.branch).join("·")}과 세운 ${annual.branch}의 충 신호입니다. 이것은 이동, 변화, 결단의 압력이 강해진다는 뜻이며, 기존에 유지하던 구조에 변화를 줄 시점임을 알려줍니다.` : combos.length > 0 ? `올해의 큰 흐름에서 주목할 점은 원국과 세운의 합 신호입니다. 이것은 협력과 연결이 강화되며 새로운 인연이나 기회와 자연스럽게 이어질 가능성이 높다는 뜻입니다.` : `올해의 큰 흐름은 급격한 충돌보다 운영과 균형을 조율하는 방향으로 움직입니다. 큰 사건보다 선택의 누적이 올해 성과를 만들어냅니다.`}`,
      `${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).map((m) => `${m.month}월`).join("·") + "에는 기회가 강하게 열리는 흐름이 있으며," : "상반기부터 꾸준히 기회가 분산되어 있으며,"} ${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).map((m) => `${m.month}월`).join("·") + "에는 보수적인 판단이 필요한 구간이 있습니다." : "위험 구간은 고르게 관리됩니다."} 올해는 좋은 달에 밀고 조심할 달에 점검하는 이중 트랙 운영이 핵심 전략입니다.`,
      `올해를 여는 핵심 조언은 세운을 기다리는 것이 아니라 세운의 에너지를 내 선택의 기준으로 삼는 것입니다. ${tenGodLib.advice}`,
    ];
    return openings[idx] || openings[0];
  }

  // Chapter 2 — 원국과 올해의 관계
  if (chapterNo === 2) {
    const texts = [
      `일간 ${dayMaster}는 ${dayElementKo} 기운을 중심으로 원국 전체를 주도합니다. 세운 ${annual.label}의 ${annual.elementKo} 기운이 이 일간과 만나면 ${annual.tenGod}의 방식으로 작동하며, 이것은 올해 ${annual.dayMasterRelation}의 방향으로 당신의 일상이 움직인다는 것을 의미합니다. 일간이 세운을 받아들이는 방식이 올해 모든 선택의 출발점이 됩니다.`,
      `월지 ${monthPillarBranch ? monthPillarBranch : ""}는 현실적인 활동성과 사회적 목표를 나타내는 자리입니다. 이 자리가 세운 ${annual.branch}와 ${relations.find((r) => r.label === "월지")?.type ? relations.find((r) => r.label === "월지").type + "의 관계를 이룬다면, " + relations.find((r) => r.label === "월지").message : "특별한 합충 없이 만나더라도,"} 일과 수익, 현실 목표의 방향에 변화가 생기는 흐름이 감지됩니다. 올해 현실적인 성과를 내려면 월지의 에너지를 어떤 방향으로 쓸지 먼저 정해두는 것이 효과적입니다.`,
      `일지 ${dayPillarBranch ? dayPillarBranch : ""}는 관계와 배우자, 자기 내면의 실질적인 자리입니다. 세운과 일지의 에너지가 만나면 ${relations.find((r) => r.label === "일지")?.message || "관계에서 새로운 흐름이 감지됩니다."} 올해 관계에서 가장 중요한 것은 내가 무엇을 원하는지를 먼저 명확히 하고, 그것을 상대에게 솔직하게 표현하는 것입니다.`,
      `천간에서는 세운의 ${annual.stem}과 원국 천간의 관계가 올해의 의지, 판단, 결정 방식에 영향을 줍니다. 세운 천간이 원국 천간을 자극하면 말, 사고방식, 의사결정의 패턴이 바뀌는 신호가 됩니다. ${tenGodLib.career} 이 해에는 생각을 행동으로 바꾸는 속도가 성과를 좌우합니다.`,
      `지지에서는 세운 ${annual.branch}이 원국의 연지 ${yearPillar}, 월지 ${monthPillarBranch}, 일지 ${dayPillarBranch}, 시지 ${hourPillarBranch}와 어떻게 만나는지가 중요합니다. ${relMsgs || "지지의 관계가 비교적 안정적인 흐름을 유지하며, 사건보다 선택의 누적이 올해 결과를 만듭니다."} 지지의 흐름은 몸이 느끼는 현실, 생활 환경, 인간관계의 실제 변화로 드러납니다.`,
      `원국 전체를 놓고 올해의 방향을 보면, ${annual.dayMasterRelation}의 흐름 속에서 ${tenGodLib.yearlyTheme} 이 해에 원국이 가장 강하게 살아나는 영역은 ${annual.tenGod === "식신" || annual.tenGod === "상관" ? "표현, 창의, 생산의 영역" : annual.tenGod === "편재" || annual.tenGod === "정재" ? "재물, 성과, 관리의 영역" : annual.tenGod === "편관" || annual.tenGod === "정관" ? "책임, 역할, 사회적 위치의 영역" : annual.tenGod === "편인" || annual.tenGod === "정인" ? "배움, 회복, 내면 성장의 영역" : "자기 기준, 독립, 자립의 영역"}입니다.`,
    ];
    return texts[idx] || texts[0];
  }

  // Chapter 3 — 커리어
  if (chapterNo === 3) {
    const texts = [
      `${tenGodLib.career} 올해의 직업운은 ${annual.tenGod} 에너지가 일의 현실에 어떻게 작동하느냐에 달려 있습니다. 세운 ${annual.label}의 ${annual.elementKo} 기운이 원국과 ${annual.dayMasterRelation}을 이루는 만큼, 지금 있는 자리에서 더 깊이 파고들수록 성과가 나는 해인지, 새로운 방향으로 전환할 준비를 해야 하는 해인지를 먼저 판단해야 합니다.`,
      `일에서 인정받는 방식은 올해의 세운 에너지에 따라 달라집니다. ${annual.tenGod === "정관" || annual.tenGod === "편관" ? "책임감 있게 역할을 수행하고 신뢰를 쌓는 방식이 가장 강하게 인정받습니다." : annual.tenGod === "식신" || annual.tenGod === "상관" ? "창의적인 아이디어나 표현력, 새로운 방법을 제시하는 방식이 주목받는 시기입니다." : annual.tenGod === "편재" || annual.tenGod === "정재" ? "성과 수치와 실질적인 결과를 보여주는 방식이 가장 강한 설득력을 가집니다." : "자기 기준을 지키며 꾸준히 전문성을 쌓는 방식이 결국 인정으로 돌아옵니다."} 남들이 보기 좋은 방식보다 실제 가치를 만들어내는 방식에 집중하는 것이 올해의 커리어 전략입니다.`,
      `올해 조직과 독립 중 어느 방향이 더 유리한지는 월별 흐름과 합충 신호로 판단합니다. ${combos.length > 0 ? "합 신호가 있어 파트너십이나 팀 기반의 협업이 개인 역량보다 더 강한 결과를 낼 가능성이 있습니다." : clashes.length > 0 ? "충 신호가 있어 기존 조직 구조에서 벗어나 독립적인 방향으로 전환하는 움직임이 자연스럽게 나타날 수 있습니다." : "조직과 독립의 선택에서 지금 당장의 안정보다 3~5년 후 어디에 있고 싶은지를 기준으로 결정하는 것이 유리합니다."}`,
      `일에서 경쟁과 압박이 강해지는 시기입니다. ${annual.tenGod === "겁재" ? "겁재의 에너지가 경쟁 구도를 만들어내므로, 남과 비교하기보다 내 고유한 역량과 차별점을 선명하게 보여주는 것이 핵심입니다." : annual.tenGod === "편관" ? "편관의 압박은 역량을 증명하는 기회입니다. 어려운 과제를 정면으로 받아내는 태도가 장기적인 신뢰를 만듭니다." : "경쟁이 강해질 때는 남의 속도보다 내 방향을 먼저 확인하는 것이 중요합니다."} ${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).map((m) => `${m.month}월`).join("·") + "에는 과도한 업무 수용을 조심해야 합니다." : ""}`,
      `커리어 전환이나 확장의 가능성이 있는 해입니다. ${clashes.length > 0 ? "충의 에너지가 기존 구조에 변화를 요구하므로, 이직이나 업무 영역 확장을 고려한다면 이 해에 결정을 내리는 것이 자연스러운 흐름입니다." : monthlyStrong.length > 0 ? monthlyStrong.slice(0, 2).map((m) => `${m.month}월`).join("·") + "에 새로운 기회나 제안이 들어올 가능성이 있으므로 미리 자신의 방향을 정리해두는 것이 좋습니다." : "커리어 확장은 급격한 변화보다 현재의 역량을 더 깊이 발전시키는 방향에서 기회가 열립니다."}`,
      `${tenGodLib.advice} 올해 일운을 가장 잘 살리는 전략은 내가 가장 잘할 수 있는 것을 가장 명확한 형태로 보여주는 것입니다. ${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).map((m) => `${m.month}월`).join("·") + "에 중요한 제안, 발표, 협상을 집중시키고" : "일의 기회를 월별 점수가 높은 시기에 집중시키고"} 낮은 점수 구간에는 실력을 다듬고 다음 기회를 준비하는 방식으로 연간 커리어를 설계하세요.`,
    ];
    return texts[idx] || texts[0];
  }

  // Chapter 4 — 재물운
  if (chapterNo === 4) {
    const texts = [
      `${tenGodLib.money} 올해 돈이 들어오는 방식은 세운 ${annual.label}의 ${annual.tenGod} 에너지와 직접 연결됩니다. ${annual.tenGod === "편재" || annual.tenGod === "정재" ? "재성이 직접 작동하는 해이므로 수익 구조를 명확히 정리할수록 재물이 더 안정적으로 흐릅니다." : annual.tenGod === "식신" || annual.tenGod === "상관" ? "식상이 재를 생하는 구조로 내가 생산하고 표현하는 만큼 재물이 따라옵니다." : "재물은 직접적인 행운보다 내가 제공하는 가치와 역량에 비례해 들어오는 구조입니다."} 올해 재물운의 흐름을 이해하는 첫 번째 출발점은 어떤 방식으로 가치를 제공하고 있는지 점검하는 것입니다.`,
      `수익이 커지는 조건은 올해의 세운 흐름과 월별 에너지가 맞아야 합니다. ${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).map((m) => `${m.month}월`).join("·") + "에는 새로운 수익 구조를 시작하거나 기존 수익을 확장하기 좋은 타이밍입니다." : "꾸준한 실행이 수익 증가의 핵심 조건입니다."} 수익이 커지려면 내가 제공하는 것의 가격, 범위, 방식을 명확하게 정의하는 것이 먼저입니다.`,
      `돈이 막히는 패턴을 미리 파악하면 손실을 줄일 수 있습니다. ${annual.tenGod === "겁재" ? "경쟁 구도에서 가격을 낮추거나 조건을 양보하는 방식이 결국 재물을 깎아먹습니다." : annual.tenGod === "편관" ? "외부의 압박에 쫓겨 충동적인 지출이나 급한 투자를 결정하는 것이 손실의 원인이 됩니다." : "계획 없이 지출을 늘리거나 충동적인 소비가 재물운을 막는 주요 패턴입니다."} ${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).map((m) => `${m.month}월`).join("·") + "에는 큰 지출이나 새로운 투자 결정을 늦추는 것이 안전합니다." : ""}`,
      `투자와 계약, 가격 책정에서는 세운의 충 신호를 반드시 확인해야 합니다. ${clashes.length > 0 ? `원국의 ${clashes.map((c) => c.branch).join("·")}과 세운의 충이 있어 계약 조항이나 투자 구조를 평소보다 더 꼼꼼하게 점검하는 것이 필요합니다.` : "계약과 투자에서는 서두르는 것보다 조건을 충분히 검토하는 것이 더 유리합니다."} 가격 책정에서는 시장 평균보다 내가 제공하는 가치를 기준으로 책정하는 것이 장기적으로 더 안정적인 수익 구조를 만들어냅니다.`,
      `고정수익과 확장수익의 균형을 유지하는 것이 올해 재물 전략의 핵심입니다. 고정수익은 안정의 기반이고 확장수익은 성장의 연료입니다. ${annual.tenGod === "정재" ? "정재의 흐름은 안정적인 고정 수입 구조에서 더 강하게 작동합니다. 무리한 확장보다 지금 있는 수익 구조를 더 견고하게 만드는 것이 유리합니다." : annual.tenGod === "편재" ? "편재의 흐름은 다양한 수익 채널을 열 때 더 강하게 작동합니다. 단, 너무 많은 채널을 동시에 관리하면 오히려 수익이 분산됩니다." : "올해는 한 가지 수익 구조를 충분히 성장시킨 다음 다음 단계를 설계하는 순서가 더 효과적입니다."}`,
      `${tenGodLib.advice} 올해 재물운을 키우는 가장 현실적인 방법은 수입 구조, 지출 패턴, 저축 목표를 한 페이지로 정리해두는 것입니다. 월별 흐름이 좋은 달에는 새로운 수익 구조를 시도하고, 흐름이 약한 달에는 기존 구조를 점검하고 비용을 줄이는 방식으로 1년을 설계하세요.`,
    ];
    return texts[idx] || texts[0];
  }

  // Chapter 5 — 인간관계
  if (chapterNo === 5) {
    const texts = [
      `${tenGodLib.yearlyTheme} 올해 가까워지는 사람은 단순히 성향이 맞는 사람보다, 지금 당신이 풀어야 하는 과제와 연결되는 사람일 가능성이 큽니다. ${annual.tenGod === "비견" || annual.tenGod === "겁재" ? "같은 분야에서 경쟁과 협력을 동시에 경험하는 사람들, 혹은 비슷한 위치에서 서로를 자극하는 관계가 가까워질 수 있습니다." : annual.tenGod === "정관" || annual.tenGod === "편관" ? "책임감이 강하고 현실 감각이 분명한 사람이 올해의 인간관계에서 중요한 축이 되기 쉽습니다." : "생각을 넓혀 주고 감정의 밀도를 바꿔 주는 사람이 올해는 더 큰 의미로 들어올 가능성이 높습니다."} 가까워지는 사람을 무조건 오래 붙잡는 것이 중요한 것이 아니라, 그 사람이 내 삶에 어떤 방향을 열어 주는지를 읽어내는 것이 더 중요합니다. 관계의 초반에는 편안함보다 배울 점이 있는지, 긴장되더라도 성장의 계기를 주는지를 함께 보세요. 그런 기준으로 사람을 보면 올해 인간관계의 질이 훨씬 선명해집니다.`,
      `${combos.length > 0 ? "합의 기운이 강하게 들어오면 귀인운은 의외로 자연스럽게 작동합니다. 억지로 도움을 요청하기보다, 이미 연결된 사람 안에서 다음 단계로 이어 줄 다리가 나타나는 경우가 많습니다." : "귀인운은 화려한 인맥보다 적절한 순간에 현실적인 도움을 주는 관계에서 드러납니다."} 올해 도움을 받을 수 있는 관계는 감정적으로만 편한 사람보다, 당신의 결정을 더 정확하게 만들고 시야를 넓혀 주는 사람입니다. 일에서는 방향을 정리해 주는 조언자, 돈 문제에서는 손익 감각을 잡아 주는 현실적인 사람, 감정에서는 과열된 마음을 가라앉혀 주는 차분한 사람이 귀인의 역할을 합니다. 중요한 것은 도움을 받을 때 막연히 기대는 것이 아니라, 내가 어떤 도움을 필요로 하는지 먼저 분명히 알고 다가가는 태도입니다. 그래야 관계가 일방적인 기대가 아니라 서로에게 의미 있는 연결로 남습니다.`,
      `${clashes.length > 0 ? `올해는 ${clashes.map((c) => c.branch).join("·")} 자리의 충 신호가 관계 재편으로 드러날 가능성이 있습니다. 그래서 멀어질 수 있는 인연은 갑작스러운 사건 때문이라기보다, 이미 맞지 않던 방식이 더 이상 유지되지 않는 방향으로 정리되기 쉽습니다.` : "멀어질 수 있는 인연은 크게 싸워서 끊어지는 경우보다, 결이 맞지 않던 관계가 자연스럽게 소원해지는 방식으로 드러날 가능성이 높습니다."} 여기서 중요한 것은 관계가 멀어진다는 사실 자체를 실패로 해석하지 않는 것입니다. 지금의 삶과 방향에 맞지 않는 관계를 억지로 붙들면 오히려 에너지가 오래 소모됩니다. 올해는 모두를 만족시키려 하기보다, 내 시간을 쓰고 싶은 사람과 그렇지 않은 사람을 더 분명히 나누는 훈련이 필요합니다. 그 과정이 차갑게 느껴질 수 있어도, 결국 건강한 관계 구조를 만드는 데는 반드시 필요한 정리입니다.`,
      `갈등이 생기는 이유는 표면적인 사건보다 기대와 역할의 차이에서 더 자주 시작됩니다. ${annual.tenGod === "상관" ? "특히 말이 빠르고 판단이 선명해지는 해에는 내가 한 말의 논리가 맞더라도 상대가 상처를 받는 경우가 생깁니다." : annual.tenGod === "비견" || annual.tenGod === "겁재" ? "비교와 자존심이 관계 안으로 들어오면 작은 일도 힘겨루기로 변할 수 있습니다." : "상대가 당연히 알아줄 것이라고 기대하는 부분이 실제로는 가장 큰 오해의 출발점이 되기 쉽습니다."} 갈등을 줄이려면 문제를 키운 뒤에 설명하는 것이 아니라, 불편함이 생긴 초기에 말의 온도를 낮춰서 꺼내는 습관이 필요합니다. 누가 옳은지를 가리기보다 지금 무엇이 어긋났는지를 확인하는 방식으로 대화를 열어야 관계가 덜 소모됩니다. 올해의 인간관계는 감정의 크기보다 조율의 기술이 결과를 좌우합니다.`,
      `${tenGodLib.advice} 좋은 인연을 붙잡는 태도는 결국 분별력과 지속성에 달려 있습니다. 처음의 강한 호감만으로 관계를 판단하지 말고, 시간이 지나도 약속을 지키는지, 말과 행동이 일치하는지, 내가 약해졌을 때도 관계의 균형이 유지되는지를 보세요. 그런 사람에게는 조금 더 시간을 쓰고, 먼저 마음을 열고, 작게라도 신뢰를 쌓는 행동을 반복하는 것이 좋습니다. 올해 인연운은 많은 사람을 만나는 데서 완성되지 않습니다. 정말 남겨야 할 사람을 알아보고 그 관계를 오래 가는 구조로 만드는 데서 비로소 빛이 납니다.`,
    ];
    return texts[idx] || texts[0];
  }

  // Chapter 6 — 연애와 결혼운
  if (chapterNo === 6) {
    const texts = [
      `${tenGodLib.relationship} 올해 연애 기운의 강도는 세운 ${annual.label}이 원국의 배우자성, 일지, 관계 관련 십성과 만나는 방식에서 드러납니다. ${annual.tenGod === "정관" || annual.tenGod === "정재" ? "올해는 관계를 안정적으로 정리하고 한 사람과의 깊이를 키우는 방향으로 기운이 모이기 쉽습니다." : annual.tenGod === "편재" || annual.tenGod === "편관" ? "새로운 자극과 만남의 가능성이 커지는 대신, 선택을 서두르면 관계의 소모도 커질 수 있습니다." : "연애 기운이 아예 약하다기보다, 감정의 파도보다 관계의 방향을 먼저 확인해야 하는 해에 가깝습니다."} 그래서 올해 사랑운은 강한 끌림 하나로 판단하기보다, 그 인연이 내 삶의 구조와 얼마나 잘 맞는지까지 함께 보아야 정확합니다. 감정이 올라오는 순간과 관계가 오래 가는 조건은 다를 수 있다는 점을 먼저 기억하세요.`,
      `${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).map((m) => `${m.month}월`).join("·") + "에는 새로운 인연이 들어올 가능성이 높습니다." : "새로운 인연은 한 달에 몰리기보다 준비된 시기에 자연스럽게 들어올 수 있습니다."} 새로운 인연이 들어오는 방식은 ${combos.length > 0 ? "합의 기운을 타고 지인의 소개, 일 연결, 자연스러운 협업 속에서 가까워지는 흐름" : "억지로 만남을 만들기보다, 내가 꾸준히 드러나는 공간에서 천천히 연결되는 흐름"}에 더 가깝습니다. 올해는 화려한 첫인상보다 관계의 리듬이 맞는지를 더 중요하게 봐야 합니다. 처음엔 강하게 느껴지지 않아도 대화가 편안하고 약속이 안정적인 사람이 오히려 오래 갈 가능성이 큽니다. 인연을 찾는 과정에서 기준을 낮추기보다, 내가 반복해서 상처받는 패턴이 무엇인지 먼저 아는 것이 더 중요합니다.`,
      `${clashes.find((c) => c.label === "일지") ? "일지에 충 신호가 들어오면 기존 관계에서 숨겨 두었던 문제들이 더 이상 미뤄지지 않고 드러날 수 있습니다." : "기존 관계의 문제는 갑자기 생긴다기보다, 오래 묵어 있던 감정과 생활 습관의 차이가 더 선명해지는 방식으로 드러날 가능성이 큽니다."} 올해 기존 관계에서 드러나는 문제는 대개 사랑이 식어서라기보다, 기대와 역할을 다루는 방식이 어긋나기 때문입니다. 상대가 알아서 맞춰 주길 기다리거나, 반대로 내가 모두 참아 주는 구조가 오래 지속되면 관계는 겉으로는 조용해도 안쪽에서 빠르게 마릅니다. 올해는 불편함을 참는 능력보다, 불편함을 상처로 만들기 전에 대화로 조율하는 능력이 더 중요합니다. 문제를 피하지 않고 언어로 다루기 시작할 때 관계는 무너지는 대신 다시 설계될 수 있습니다.`,
      `${annual.tenGod === "정관" || annual.tenGod === "정재" ? "결혼이나 장기 관계 가능성은 올해 비교적 분명하게 열릴 수 있습니다. 특히 현실 조건과 미래 계획을 함께 맞춰 갈 수 있는 상대라면 관계의 공식화가 자연스럽게 논의될 수 있습니다." : "결혼이나 장기 관계 가능성은 감정의 속도보다 생활 구조와 책임을 함께 감당할 수 있는지에서 결정됩니다."} 사랑이 깊어진다고 해서 곧바로 오래 가는 관계가 되는 것은 아닙니다. 올해 장기 관계를 판단할 때는 감정 표현의 빈도보다 갈등이 생겼을 때 어떻게 해결하는지, 돈과 시간의 우선순위를 어떻게 맞추는지, 각자의 삶을 존중하면서도 함께 갈 수 있는지를 보아야 합니다. 그 조건이 갖춰진 관계라면 올해는 충분히 다음 단계로 넘어갈 수 있습니다. 반대로 그 기준이 불분명하다면, 서두르지 않는 것이 오히려 관계를 지키는 선택입니다.`,
      `${tenGodLib.caution} 사랑에서 조심해야 할 태도는 내가 불안할수록 더 뚜렷해집니다. ${annual.tenGod === "상관" ? "말로 상대를 시험하거나, 상처받기 전에 먼저 거리를 두는 태도" : annual.tenGod === "비견" || annual.tenGod === "겁재" ? "자존심 때문에 원하는 것을 말하지 않거나, 비교심으로 관계를 흔드는 태도" : "상대에게 맞춰 주는 척하면서 실제 감정은 쌓아 두는 태도"}는 올해 특히 관계를 어렵게 만들 수 있습니다. 사랑에서 중요한 것은 멋지게 보이는 대응이 아니라, 내가 무엇을 원하는지 솔직히 말하고 상대의 반응을 있는 그대로 보는 용기입니다. 서운함을 돌려 말하거나 기대를 숨기면, 관계는 더 오래 꼬입니다. 올해 사랑을 지키려면 감정을 미화하지 말고, 다정하지만 분명한 태도로 관계의 기준을 세우는 연습이 필요합니다.`,
    ];
    return texts[idx] || texts[0];
  }

  // Chapter 7 — 건강
  if (chapterNo === 7) {
    const texts = [
      `${tenGodLib.health} 올해 몸이 예민해지는 부분은 세운 ${annual.label}의 ${annual.elementKo} 기운이 원국의 약한 오행이나 이미 과도한 오행을 건드리는 지점에서 먼저 드러납니다. ${annual.elementKo === "목" ? "근육의 긴장, 눈의 피로, 간담 계열의 답답함처럼 몸의 긴장이 먼저 느껴질 수 있습니다." : annual.elementKo === "화" ? "열감, 심장 두근거림, 혈압성 피로, 과열된 신경 반응처럼 몸과 마음이 동시에 들뜨는 양상이 나타날 수 있습니다." : annual.elementKo === "토" ? "소화기 부담, 체중 기복, 몸이 무거워지는 느낌처럼 정체감이 두드러질 수 있습니다." : annual.elementKo === "금" ? "호흡기, 피부, 건조감, 예민한 신경 반응처럼 외부 자극에 민감해지는 흐름이 생길 수 있습니다." : "냉증, 부종, 수면의 질 저하처럼 체내 순환과 회복 리듬에서 불편함이 먼저 드러날 수 있습니다."} 올해는 몸이 보내는 작은 신호를 무시하지 않는 태도가 중요합니다. 병명을 단정하기보다, 반복해서 예민해지는 부분을 생활 리듬과 연결해 살피는 것이 훨씬 현실적인 관리 방법입니다.`,
      `${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).map((m) => `${m.month}월`).join("·") + "에는 마음이 흔들리는 시기가 더 선명하게 드러날 수 있습니다." : "올해는 특정 시기보다 피로가 누적된 순간에 마음의 흔들림이 더 크게 느껴질 수 있습니다."} 감정이 흔들릴 때 그것을 성격 문제로 몰아가지 말고, 몸의 피로와 일정의 밀도를 함께 보아야 합니다. ${annual.tenGod === "상관" ? "생각이 많아질수록 잠이 얕아지고, 잠이 얕아질수록 감정 기복이 더 커지는 흐름이 반복되기 쉽습니다." : annual.tenGod === "편관" ? "외부 압박을 오래 견디다 보면 멀쩡한 척하다가 한 번에 무너지는 방식으로 드러날 수 있습니다." : "참고 넘긴 감정이 쌓일수록 사소한 일에도 예민하게 반응하게 될 수 있습니다."} 올해 심리 리듬을 지키려면 감정을 통제하는 데만 집중하지 말고, 감정이 요동치기 전 몸의 신호를 먼저 읽어내는 연습이 필요합니다.`,
      `스트레스가 쌓이는 방식은 사람마다 다르지만, 당신의 경우에는 운의 흐름이 강해질수록 더 분명한 패턴이 드러납니다. ${annual.tenGod === "비견" || annual.tenGod === "겁재" ? "경쟁과 비교, 자존심을 지키려는 압박이 스트레스를 키우기 쉽습니다." : annual.tenGod === "정관" || annual.tenGod === "편관" ? "책임을 놓치면 안 된다는 긴장감이 몸을 먼저 굳게 만들 수 있습니다." : annual.tenGod === "식신" || annual.tenGod === "상관" ? "생각과 표현이 많아질수록 정리되지 않은 자극이 피로로 쌓일 수 있습니다." : "겉으로는 조용해 보여도 감정과 걱정을 오래 안으로 묻어 두는 방식이 누적 피로를 만들 수 있습니다."} 스트레스를 줄이려면 큰 결심보다 배출 통로를 만드는 것이 먼저입니다. 하루에 짧게라도 걷기, 기록하기, 사람과 말하기 같은 방식으로 마음속 에너지가 멈춰 서지 않게 흘려보내야 올해의 건강운이 무너지지 않습니다.`,
      `회복력을 높이는 생활 리듬은 특별한 비법보다 반복 가능한 기본에서 나옵니다. 수면 시간을 일정하게 맞추고, 식사 간격을 크게 무너뜨리지 않고, 몸을 지나치게 몰아붙인 날에는 반드시 회복 시간을 다음 일정 안에 포함시키는 식의 운영이 필요합니다. 특히 올해는 "버틸 수 있으니 더 한다"는 방식이 누적 손상을 만들기 쉽습니다. ${annual.elementKo === "화" ? "열을 식히는 휴식과 자극을 줄이는 밤 루틴" : annual.elementKo === "금" ? "건조함을 막는 습도 관리와 호흡을 길게 만드는 습관" : annual.elementKo === "수" ? "몸을 따뜻하게 하고 수면 깊이를 회복하는 습관" : annual.elementKo === "목" ? "몸을 풀어 주는 스트레칭과 긴장 완화 루틴" : "소화 부담을 줄이는 식사 리듬과 걷기"}이 올해 회복력을 높이는 데 특히 유효합니다. 회복력은 여유가 생긴 뒤 챙기는 것이 아니라, 일정이 많을수록 먼저 넣어 두어야 하는 필수 항목입니다.`,
      `${tenGodLib.advice} 건강운을 지키는 조언을 한 가지로 압축하면, 무너지기 전에 조절하는 습관을 만드는 것입니다. 올해는 참아 내는 힘보다 조절하는 힘이 더 중요합니다. 몸이 보내는 예민함을 무시하지 말고, 마음이 흔들릴 때 큰 결정을 잠시 미루고, 일정이 빽빽할수록 일부러 빈 시간을 만들어 두세요. 그렇게 하면 올해의 건강운은 단순히 아프지 않은 수준을 넘어, 중요한 순간에 필요한 에너지를 안정적으로 유지하는 방향으로 바뀝니다. 결국 몸과 마음의 리듬을 지키는 사람만이 올해의 기회도 오래 붙잡을 수 있습니다.`,
    ];
    return texts[idx] || texts[0];
  }

  // Chapter 9 — 위기와 반전
  if (chapterNo === 9) {
    const texts = [
      `올해 가장 흔들리기 쉬운 문제는 ${clashes.length > 0 ? `원국과 세운의 충이 작동하는 ${monthlyCare.map((m) => `${m.month}월`).slice(0, 2).join("·") || "점수가 낮은 시기"}에 더 뚜렷하게 드러날 가능성이 있습니다.` : `${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).map((m) => `${m.month}월`).join("·") + " 같은 구간에서" : "운의 강약이 엇갈리는 순간에"} 작게 시작한 문제가 빠르게 커질 수 있습니다.`} 흔들리기 쉬운 문제의 본질은 외부 사건 그 자체보다, 이미 쌓여 있던 피로와 미뤄 둔 결정이 한꺼번에 표면으로 올라오는 데 있습니다. 그래서 올해의 위기는 예상 밖 재난처럼 오기보다, 조금씩 무시해 온 신호가 어느 순간 더는 미룰 수 없게 되는 방식으로 나타날 가능성이 큽니다. 이 점을 이해하면 위기를 두려워하기보다, 신호를 먼저 읽고 구조를 정리하는 방향으로 대응할 수 있습니다.`,
      `반복될 수 있는 실수는 대체로 익숙한 방식으로 다시 반응하는 데서 시작됩니다. ${annual.tenGod === "겁재" ? "이기고 싶다는 마음이 앞서 판단을 서두르는 실수" : annual.tenGod === "상관" ? "생각이 앞서 방향을 자주 바꾸고 끝맺음을 늦추는 실수" : annual.tenGod === "편관" ? "압박을 견디기 위해 무리하게 버티다가 뒤늦게 무너지는 실수" : "감정 상태를 점검하지 않은 채 중요한 선택을 내려 후회하는 실수"}가 올해 반복될 가능성이 높습니다. 실수를 줄이는 가장 좋은 방법은 완벽해지는 것이 아니라, 내가 어떤 순간에 같은 패턴으로 무너지는지를 정확히 아는 것입니다. 결정 앞에서 한 번 더 멈추고, 지금 내 상태가 과열인지 피곤한지부터 확인하는 습관만 생겨도 반복 실수의 절반은 줄어듭니다. 올해는 능력보다 자기 패턴을 읽는 힘이 더 큰 보호막이 됩니다.`,
      `${clashes.length > 0 ? "위기가 기회로 바뀌는 조건은 변화 자체를 피하지 않는 데 있습니다. 충의 기운이 작동하면 기존 구조가 흔들릴 수밖에 없는데, 그때 무엇을 지키고 무엇을 바꿀지 스스로 선택하면 위기는 전환점이 됩니다." : "위기가 기회로 바뀌는 조건은 문제를 빠르게 인정하고, 감정 반응보다 구조 조정에 먼저 들어가는 데 있습니다."} 올해는 감정적으로만 버티는 방식으로는 반전이 잘 일어나지 않습니다. 일과 돈, 관계, 생활 리듬 중 어디가 먼저 무너졌는지 확인하고 그 지점을 다시 설계해야 합니다. 위기를 기회로 만드는 사람은 특별히 강한 사람이 아니라, 흔들릴 때 원인을 명확히 보고 작은 조정을 빠르게 반복하는 사람입니다. 올해 반전의 계기는 한 번의 큰 승부보다, 무너지는 흐름을 끊어 내는 작은 기준에서 시작될 가능성이 큽니다.`,
      `피해야 할 선택은 겉으로는 쉬워 보이지만, 뒤로 갈수록 더 큰 비용을 남기는 선택입니다. 예를 들어 불안하다고 해서 무조건 확장하는 선택, 외롭다고 해서 맞지 않는 관계를 붙잡는 선택, 손실이 두려워 확인도 없이 결정을 미루는 선택은 모두 올해의 흐름을 더 꼬이게 만들 수 있습니다. ${tenGodLib.caution} 특히 ${annual.tenGod === "비견" || annual.tenGod === "겁재" ? "자존심 때문에 협력 기회를 놓치는 선택" : annual.tenGod === "상관" ? "말로 이기려다 관계 기반을 잃는 선택" : annual.tenGod === "편관" ? "압박을 버티기 위해 몸과 마음을 소진시키는 선택" : "겉으로는 무난해 보여도 본심과 다른 방향으로 끌려가는 선택"}은 오래 갈수록 손실이 커질 가능성이 높습니다. 올해는 순간의 편안함보다 장기적인 균형을 남기는 선택인지 스스로에게 계속 물어야 합니다.`,
      `${tenGodLib.advice} 반전을 만드는 행동은 의외로 단순합니다. 미뤄 둔 문제를 작은 단위로 정리하고, 관계에서 불편한 부분을 초기에 말로 다루고, 돈과 일정에서 새는 구멍을 먼저 막고, 기회가 오는 달에는 망설이기보다 준비한 것을 꺼내는 것입니다. 반전은 갑자기 뒤집는 극적인 장면에서 나오지 않습니다. 흔들리는 흐름을 정확히 읽고, 그 흐름을 더 나빠지지 않게 끊는 행동에서 시작됩니다. 올해는 무섭게 예언을 듣는 해가 아니라, 위험 신호를 현실적인 선택으로 바꾸는 해여야 합니다. 그렇게 해야 비로소 위기가 지나간 자리에서 더 단단한 방향이 남습니다.`,
    ];
    return texts[idx] || texts[0];
  }

  // Chapter 10 — 마스터플랜
  if (chapterNo === 10) {
    const texts = [
      `올해의 핵심 메시지는 세운 ${annual.label}을 막연한 분위기로 받아들이지 말고, 실제 선택의 기준으로 쓰라는 것입니다. ${tenGodLib.yearlyTheme} 이 해는 좋고 나쁨을 단정하는 해가 아니라, 무엇에 에너지를 써야 하고 무엇을 줄여야 하는지를 빨리 알아차리는 사람이 훨씬 유리한 해입니다. 그래서 올해의 핵심 메시지는 "운을 기다리지 말고 흐름에 맞게 움직이라"는 말로 정리할 수 있습니다. 기회가 오는 달에는 바로 움직일 수 있도록 미리 준비하고, 부담이 커지는 달에는 과감하게 속도를 줄이며 구조를 다시 세우는 태도가 필요합니다. 이 기준만 분명하면 한 해 전체가 훨씬 덜 흔들립니다.`,
      `가장 먼저 정리해야 할 것은 마음속 불안보다 실제로 에너지를 빼앗는 요소들입니다. 사람 문제인지, 돈 문제인지, 생활 리듬인지, 미뤄 둔 결정인지부터 나눠 보아야 올해의 흐름이 선명해집니다. ${monthlyStrong.length > 0 ? `${monthlyStrong[0].month}월 전후로 흐름이 강해지기 전에 우선순위를 정리해 두면` : "초반 흐름을 정리해 두면"} 좋은 운이 들어와도 허공으로 새지 않습니다. 쌓인 피로와 미정 상태를 그대로 둔 채 새 계획을 올리면 좋은 운도 오래 못 갑니다. 올해는 큰 목표부터 잡는 것보다, 먼저 치워야 할 문제를 정리하고 에너지 누수를 막는 것이 진짜 출발선입니다.`,
      `반드시 밀어붙여야 할 것은 지금까지 준비해 왔지만 망설임 때문에 밖으로 꺼내지 못했던 일입니다. ${annual.tenGod === "식신" || annual.tenGod === "상관" ? "표현하고 제안하고 결과물로 만드는 일" : annual.tenGod === "편재" || annual.tenGod === "정재" ? "수익 구조와 계약, 성과를 명확하게 만드는 일" : annual.tenGod === "편관" || annual.tenGod === "정관" ? "책임을 맡고 자리의 무게를 받아내는 일" : "내 기준을 세우고 방향을 결정하는 일"}은 올해 미루면 아쉬움이 더 크게 남을 가능성이 있습니다. ${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).map((m) => `${m.month}월`).join("·") + "처럼 흐름이 강한 달에는" : "흐름이 열리는 순간에는"} 완벽해진 뒤 움직이겠다는 생각보다, 준비한 것을 실제로 세상과 관계 속에 놓는 쪽이 훨씬 큰 성과로 이어집니다. 올해는 주저하는 시간보다 실행의 리듬이 더 중요합니다.`,
      `내려놓아야 할 것은 늘 해 오던 방식인데도 이미 효율이 떨어진 습관들입니다. ${annual.tenGod === "비견" || annual.tenGod === "겁재" ? "혼자 다 해내려는 태도와 필요 이상으로 버티는 습관" : annual.tenGod === "상관" ? "말과 생각만 많고 끝맺음이 늦어지는 패턴" : annual.tenGod === "편관" ? "압박을 견디는 것 자체를 성실함으로 착각하는 태도" : "상황이 바뀌었는데도 익숙하다는 이유로 붙들고 있는 방식"}은 올해의 흐름을 무겁게 만들 수 있습니다. 내려놓는다는 것은 포기하는 것이 아니라, 지금의 삶에 맞지 않는 방식에 더 이상 에너지를 주지 않는다는 뜻입니다. 그래야 정말 밀어붙여야 할 것에 힘이 모입니다. 올해는 덜어 내는 결단이 오히려 전진의 속도를 높여 줄 수 있습니다.`,
      `${tenGodLib.advice} 1년을 잘 보내기 위한 실전 전략은 복잡하지 않습니다. 좋은 달에는 실행, 어려운 달에는 조정, 흔들리는 순간에는 기준 확인이라는 세 가지 원칙을 계속 반복하면 됩니다. 이 원칙을 지키기 위해 분기마다 한 번씩 현재 흐름을 점검하고, 월별로는 중요한 일정과 지출, 관계 에너지를 짧게라도 기록해 두세요. 기록이 쌓이면 운은 더 이상 막연한 느낌이 아니라, 실제 선택을 돕는 데이터가 됩니다. 결국 올해를 잘 보내는 사람은 운이 좋은 사람보다, 자신의 흐름을 읽고 거기에 맞게 움직일 줄 아는 사람입니다. ${seed.targetYear}년은 바로 그 감각을 길러 주는 한 해가 되어야 합니다.`,
    ];
    return texts[idx] || texts[0];
  }

  // Fallback
  const seeds = seed.interpretationSeeds;
  const keyMap = { "일": "career", "커리어": "career", "재물": "wealth", "돈": "wealth", "연애": "love", "사랑": "love", "관계": "relationships", "건강": "health", "마음": "health", "위기": "risks", "전략": "finalStrategy" };
  const found = Object.keys(keyMap).find((token) => category.includes(token));
  const list = seeds[found ? keyMap[found] : "yearlyTheme"] || seeds.yearlyTheme;
  const base = list[idx % list.length] || list[0] || "";
  return `${base}\n\n${tenGodLib.yearlyTheme}\n\n${relMsgs || "올해는 선택의 기준을 미리 세워두는 것이 가장 중요한 준비입니다."}\n\n${tenGodLib.advice}`;
}

function getNewYearSectionFocus(categoryTitle = "") {
  const title = clean(categoryTitle);
  if (/커리어|직장|조직|평가|이직|전환|확장|성과|업무|일\b/.test(title)) {
    return {
      toneKey: "career",
      subject: "일의 방향과 사회적 역할",
      reality: "올해 현실에서는 맡은 역할, 평가 기준, 성과가 드러나는 방식이 함께 움직입니다. 관성이 강하면 책임과 신뢰가 중요해지고, 식상이 살아나면 표현과 결과물이 성과로 이어지며, 재성이 작동하면 일의 결과가 수익과 계약으로 연결됩니다.",
    };
  }
  if (/재물|돈|수익|지출|손실|계약|투자|가격/.test(title)) {
    return {
      toneKey: "money",
      subject: "돈의 흐름과 손익 구조",
      reality: "올해 현실에서는 수입의 통로, 지출의 압력, 계약 조건이 한 덩어리로 움직입니다. 재성이 직접 열리는 달에는 수익 기회가 살아나고, 충·해·파가 강한 구간에는 작은 비용 결정도 손실로 커질 수 있으므로 숫자와 약속을 함께 관리해야 합니다.",
    };
  }
  if (/연애|인연|결혼|약속|가족|관계|귀인|협업|파트너|감정|거리/.test(title)) {
    return {
      toneKey: "relationship",
      subject: "사람과 마음의 연결 방식",
      reality: "올해 현실에서는 가까워지는 사람, 멀어지는 사람, 책임이 필요한 관계가 선명하게 갈립니다. 합의 기운은 연결을 만들고, 충의 기운은 관계의 재배치를 요구하므로 감정의 크기보다 약속과 역할의 균형을 먼저 보아야 합니다.",
    };
  }
  if (/건강|심리|몸|피로|스트레스|마음|회복|멘탈|생활/.test(title)) {
    return {
      toneKey: "health",
      subject: "몸과 마음의 회복 리듬",
      reality: "올해 현실에서는 몸의 예민함과 감정의 밀도가 함께 움직입니다. 약한 오행이 눌리거나 과한 오행이 더 과열되는 달에는 피로, 수면, 소화, 호흡, 긴장 반응이 먼저 신호를 보내므로 생활 리듬을 운의 강약에 맞춰 조절해야 합니다.",
    };
  }
  if (/위험|위기|흔들|합충|형파해|사건|실수|회복 플랜|주의/.test(title)) {
    return {
      toneKey: "caution",
      subject: "위험 신호와 반전의 조건",
      reality: "올해 현실에서는 작은 균열이 사람, 돈, 일정, 감정 중 한 곳에서 먼저 드러납니다. 합은 기회를 만들지만 과한 기대를 부를 수 있고, 충·해·파는 변화를 재촉하므로 위기를 피하려 하기보다 초기에 구조를 조정하는 태도가 필요합니다.",
    };
  }
  if (/분기|월별|Go\/Stop|상반기|하반기|타이밍|로드맵|루틴|메시지|정리|밀어붙일|내려놓/.test(title)) {
    return {
      toneKey: "advice",
      subject: "시간표와 실행 순서",
      reality: "올해 현실에서는 어느 달에 열고 어느 달에 닫을지가 성과를 가릅니다. 좋은 흐름은 실행으로 쓰고, 부담이 커지는 흐름은 점검과 정리로 쓰면 같은 운도 훨씬 안정적인 결과로 이어집니다.",
    };
  }
  return {
    toneKey: "yearlyTheme",
    subject: "올해 전체 운의 방향",
    reality: "올해 현실에서는 세운의 기운이 원국의 강점과 약점을 동시에 드러냅니다. 중요한 것은 길흉을 단정하는 것이 아니라, 어떤 선택이 운을 살리고 어떤 습관이 흐름을 막는지 구체적으로 구분하는 일입니다.",
  };
}

function buildHighQualityNewYearSection(seed, chapterSpec, categoryTitle, sectionIndex = 0) {
  const annual = seed?.saju?.annualLuck || {};
  const pillars = seed?.saju?.pillars || {};
  const dayMaster = clean(seed?.saju?.dayMaster || pillars?.day?.stem || "戊");
  const dayElement = STEM_ELEMENT[dayMaster] || "earth";
  const dayElementKo = ELEMENT_KO[dayElement] || "토";
  const annualStem = clean(annual?.stem || "");
  const annualBranch = clean(annual?.branch || "");
  const annualLabel = clean(annual?.label || `${annualStem}${annualBranch}` || "세운");
  const annualTenGod = clean(annual?.tenGod || tenGod(dayMaster, annualStem || "甲"));
  const dayMasterRelation = clean(annual?.dayMasterRelation || elementRelation(dayElement, annual?.element || "earth"));
  const relationRows = Array.isArray(seed?.saju?.relations?.branchRelations) ? seed.saju.relations.branchRelations : [];
  const relationSummary = relationRows.length
    ? relationRows.slice(0, 4).map((row) => row.message).join(" ")
    : "원국 지지와 세운 지지 사이에 큰 충돌이 드러나지 않더라도, 월별 강약에 따라 체감 리듬은 충분히 달라질 수 있습니다.";
  const monthly = Array.isArray(seed?.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  const strongMonths = monthly.filter((m) => Number(m?.score || 0) >= 75).slice(0, 4).map((m) => `${m.month}월`);
  const careMonths = monthly.filter((m) => Number(m?.score || 0) < 60).slice(0, 4).map((m) => `${m.month}월`);
  const geokguk = clean(seed?.structure?.geokguk || "");
  const usefulKeywords = Array.isArray(seed?.structure?.usefulGodKeywords) ? seed.structure.usefulGodKeywords.filter(Boolean) : [];
  const usefulSummary = usefulKeywords.length
    ? `용신·희신 흐름은 ${usefulKeywords.join(" / ")} 방향에서 힘을 보태며, 기신이 강해지는 구간에서는 과열된 결정을 낮추는 방식이 필요합니다.`
    : "용신과 희신의 방향은 균형 회복에 맞추고, 기신이 강해질 때는 속도를 조절하는 원칙으로 운영해야 안정감이 높아집니다.";
  const tone = getTenGodLib(annualTenGod);
  const focus = getNewYearSectionFocus(categoryTitle);
  const domainTone = clean(tone?.[focus.toneKey] || tone?.yearlyTheme || "");
  const quantum = seed?.quantumMyeongri || seed?.saju?.quantumMyeongri || {};
  const annualQuantum = quantum?.annualQuantum || {};
  const quantumSummary = clean(quantum?.professionalSummary || "");
  const quantumStrongMonths = Array.isArray(quantum?.monthlyQuantum)
    ? quantum.monthlyQuantum.filter((m) => m.decision === "GO").slice(0, 4).map((m) => `${m.month}월`)
    : [];
  const quantumCareMonths = Array.isArray(quantum?.monthlyQuantum)
    ? quantum.monthlyQuantum.filter((m) => m.decision === "STOP").slice(0, 4).map((m) => `${m.month}월`)
    : [];

  const lines = [
    "핵심 진단",
    `${seed.targetYear}년 ${annualLabel} 세운은 일간 ${dayMaster}(${dayElementKo})에게 ${annualTenGod} 흐름으로 작동합니다. ${categoryTitle}는 ${focus.subject}을 읽는 자리이며, ${dayMasterRelation}의 패턴이 실제 선택 안에서 체감됩니다. 단순한 길흉 판단보다 이 주제가 올해 어떤 기준을 요구하는지 선명하게 잡는 것이 우선입니다. ${domainTone}`,
    "",
    "명식 근거",
    `원국의 일간은 ${dayMaster}이며, 세운 간지는 ${annualLabel}입니다. 세운 십성은 ${annualTenGod}, 일간과 세운 오행 관계는 ${dayMasterRelation}로 읽힙니다. 원국 지지(년지 ${clean(pillars?.year?.branch || "-")}, 월지 ${clean(pillars?.month?.branch || "-")}, 일지 ${clean(pillars?.day?.branch || "-")}, 시지 ${clean(pillars?.hour?.branch || "-")})와 세운 지지 ${annualBranch || "-"}의 합·충·해·파 관계는 다음과 같습니다. ${relationSummary} ${geokguk ? `격국은 ${geokguk} 흐름을 기준으로 해석하며,` : ""} ${usefulSummary} 퀀텀 명리 보정에서는 세운이 ${clean(annualQuantum.elementRoleLabel || "중립")} 흐름으로 판정되고, 최종 세운 점수는 ${Number(annualQuantum.finalScore || 0) || "관찰"} 기준입니다. ${quantumSummary}`,
    "",
    "올해 현실에서 드러나는 모습",
    `${focus.reality} 재성 흐름이 열리면 수익과 관리 이슈가 먼저 올라오고, 관성이 강하면 책임과 기준 정렬이 필요해집니다. 식상이 강한 달에는 표현과 실행이 성과로 이어지며, 인성 흐름이 들어오면 배움과 회복이 장기 성과의 기반이 됩니다. 비겁이 강해지는 구간은 경쟁과 비교가 커질 수 있으므로 역할 경계를 선명하게 정해야 합니다.`,
    "",
    "주의할 흐름",
    `${careMonths.length ? `${careMonths.join("·")}은` : "월운 점수가 낮아지는 구간은"} 감정적 결론, 무리한 일정 확장, 준비 없는 지출 결정이 손실로 이어질 수 있습니다. ${tone.caution} 특히 지지 충·해·파 신호가 겹치는 시기에는 관계와 계약의 말투, 일정 확정 방식, 비용 지출 순서를 보수적으로 가져가야 불필요한 소모를 줄일 수 있습니다. 중요한 결정은 하루 이상 간격을 두고 검토하는 습관이 안전합니다.`,
    "",
    "기회를 살리는 방법",
    `${strongMonths.length ? `${strongMonths.join("·")}에는` : "월운이 살아나는 구간에는"} 핵심 제안, 협상, 발표, 전환 행동을 집중 배치하세요. ${tone.advice} 이때 핵심은 완벽한 조건을 기다리는 것이 아니라, 이미 준비한 기준을 실행 순서에 올리는 것입니다. 실행한 뒤에는 결과를 문장으로 기록해 다음 달 전략에 반영하면 운의 강약이 실제 성과로 바뀌는 속도가 빨라집니다.`,
    "",
    "월별 실행 조언",
    `1분기에는 기반 정비와 우선순위 확정, 2분기에는 실행 범위 확대, 3분기에는 성과 회수와 관계 조율, 4분기에는 손익 정리와 다음 해 준비를 권합니다. ${monthly.length ? `월운 상위 달(${strongMonths.join("·") || "해당 없음"})에는 확장 행동을, 하위 달(${careMonths.join("·") || "해당 없음"})에는 점검 행동을 적용하면 연간 변동을 안정적으로 다룰 수 있습니다.` : "월운 점수 변화를 월별로 기록해 실행 강약을 조절하세요."} 퀀텀 Go 판정 달(${quantumStrongMonths.join("·") || "해당 없음"})에는 실행을 앞세우고, Stop 판정 달(${quantumCareMonths.join("·") || "해당 없음"})에는 큰 결정을 늦추는 것이 좋습니다. ${sectionIndex + 1}번째 세부 항목인 ${categoryTitle}에서는 매달 하나의 실행 항목과 하나의 금지 항목을 동시에 정해 운영하면 체감 성과가 가장 빠르게 개선됩니다.`,
  ];

  return lines.join("\n");
}

function repairSajuNewYearChapters({ seed, chapters, expectedChapters, errors = [] } = {}) {
  const expected = Array.isArray(expectedChapters) && expectedChapters.length
    ? expectedChapters
    : buildSajuNewYearChapterSpecs(seed?.targetYear || resolveDefaultTargetYear());

  return expected.map((spec, chapterIndex) => {
    const current = Array.isArray(chapters) ? chapters[chapterIndex] : null;
    const currentSections = Array.isArray(current?.sections)
      ? current.sections
      : Array.isArray(current?.categories)
        ? current.categories.map((item) => ({ title: item?.title, body: item?.finalText || item?.localSummary || "" }))
        : [];

    if (!current || clean(current.title) !== clean(spec.title)) {
      const repaired = buildDeterministicChapterFromSpec(seed, spec, "missing_or_title_mismatch");
      const categories = repaired.sections.map((section) => ({
        title: section.title,
        localSummary: section.body,
        finalText: section.body,
      }));
      return {
        no: spec.no,
        title: spec.title,
        categories,
        sections: repaired.sections,
        text: repaired.sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
        source: "local-rule-completed",
      };
    }

    const fixedSections = spec.categories.map((categoryTitle, sectionIndex) => {
      const currentSection = currentSections[sectionIndex] || null;
      const body = stripForbiddenText(currentSection?.body || currentSection?.finalText || currentSection?.text || "");

      if (
        clean(currentSection?.title) !== clean(categoryTitle)
        || body.length < desiredSectionLength()
        || hasForbiddenText(body)
      ) {
        return {
          title: categoryTitle,
          body: ensureMinLength(
            buildHighQualityNewYearSection(seed, spec, categoryTitle, sectionIndex),
            desiredSectionLength(),
            seed,
            categoryTitle,
          ),
        };
      }

      return {
        title: categoryTitle,
        body,
      };
    });

    const categories = fixedSections.map((section) => ({
      title: section.title,
      localSummary: section.body,
      finalText: section.body,
    }));

    return {
      no: spec.no,
      title: spec.title,
      categories,
      sections: fixedSections,
      text: fixedSections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
      source: "local-rule-completed",
      repairSignals: Array.isArray(errors) ? errors.slice(0, 30) : [],
    };
  });
}

function buildLocalSkeleton(seed) {
  const expectedChapters = buildSajuNewYearChapterSpecs(seed?.targetYear || resolveDefaultTargetYear());
  return expectedChapters.map((chapter) => {
    const categories = chapter.categories.map((category, idx) => {
      const base = buildHighQualityNewYearSection(seed, chapter, category, idx);
      const expanded = ensureMinLength(base, desiredSectionLength(), seed, category);
      const sanitized = stripForbiddenText(expanded);
      return {
        title: category,
        localSummary: sanitized,
        finalText: sanitized,
      };
    });
    return {
      no: chapter.no,
      title: chapter.title,
      categories,
      text: categories.map((category) => `## ${category.title}\n${category.finalText}`).join("\n\n"),
      sections: categories.map((c) => ({ title: c.title, body: c.finalText })),
      source: "local-only",
    };
  });
}

function ensureMinLength(text, minLength, seed, categoryTitle) {
  let result = softenAnnualFortuneRiskText(text, seed?.targetYear);
  const annual = seed?.saju?.annualLuck || {};
  const addition = `${seed.targetYear}년 ${annual.label || "세운"} 기준으로 ${categoryTitle} 판단은 월별 강약과 관계 신호를 함께 보아야 안정적입니다. 점수가 높은 달에는 실행 폭을 넓히고, 낮은 달에는 문서·관계·지출을 재점검하는 이중 트랙 운영이 손실을 줄입니다. 또한 선택 기준을 미리 문장화해 두면 같은 변수에도 흔들림 없이 대응할 수 있습니다.`;
  while (result.length < minLength) {
    result = `${result}\n\n${addition}`;
  }
  return softenAnnualFortuneRiskText(result, seed?.targetYear);
}

function chapterTextLength(chapter) {
  const fromCategories = (chapter?.categories || []).reduce((acc, category) => acc + clean(category?.finalText || category?.localSummary).length, 0);
  if (fromCategories > 0) return fromCategories;
  return (chapter?.sections || []).reduce((acc, section) => acc + clean(section?.body || section?.finalText || section?.text).length, 0);
}

function hasForbiddenText(text) {
  const token = clean(text);
  if (!token) return false;
  const safeRegex = new RegExp(FORBIDDEN_TEXT_RE.source, "i");
  return safeRegex.test(token);
}

function validateChapters(chapters) {
  const expected = buildSajuNewYearChapterSpecs(resolveDefaultTargetYear());
  if (!Array.isArray(chapters) || chapters.length !== expected.length) return false;
  const totalChars = chapters.reduce((acc, chapter) => acc + chapterTextLength(chapter), 0);
  if (totalChars < MIN_TOTAL_CHARS) return false;
  return expected.every((blueprint, idx) => {
    const chapter = chapters[idx];
    if (!chapter || clean(chapter.title) !== clean(blueprint.title)) return false;
    const sections = Array.isArray(chapter.sections)
      ? chapter.sections
      : Array.isArray(chapter.categories)
        ? chapter.categories.map((item) => ({ title: item?.title, body: item?.finalText || item?.localSummary || "" }))
        : [];
    if (sections.length !== blueprint.categories.length) return false;
    if (chapterTextLength(chapter) < MIN_CHAPTER_CHARS) return false;
    return blueprint.categories.every((category, catIdx) => {
      const text = clean(sections[catIdx]?.body || sections[catIdx]?.finalText || sections[catIdx]?.text);
      if (clean(sections[catIdx]?.title) !== clean(category)) return false;
      if (text.length < MIN_SECTION_CHARS) return false;
      if (hasForbiddenText(text)) return false;
      const paragraphCount = text.split(/\n\s*\n/).filter(Boolean).length;
      return paragraphCount >= 3;
    });
  });
}

function escHtml(value) {
  return clean(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

function renderNewYearSectionBody(body = "") {
  return stripForbiddenText(body)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (/^(핵심 진단|명식 근거|올해 현실에서 드러나는 모습|주의할 흐름|기회를 살리는 방법|월별 실행 조언)$/.test(line)) {
        return `<h5>${escHtml(line)}</h5>`;
      }
      return `<p>${escHtml(line)}</p>`;
    })
    .join("");
}

function buildYearlyPdfInsightSections(seed = {}) {
  const annual = seed.saju?.annualLuck || {};
  const quantum = seed?.quantumMyeongri || seed?.saju?.quantumMyeongri || {};
  const opportunities = topYearlyMonths(seed, "opportunity", 3);
  const risks = topYearlyMonths(seed, "risk", 3);
  const cards = [
    ["세운", clean(annual.label || "")],
    ["십성", clean(annual.tenGod || "")],
    ["일간 관계", clean(annual.dayMasterRelation || "")],
    ["유리 오행", (quantum.favorableElements || []).join("·") || "중립"],
    ["주의 오행", (quantum.cautionElements || []).join("·") || "중립"],
    ["기회 1순위", opportunities[0] ? `${opportunities[0].month}월 ${opportunities[0].pillar?.label || ""}` : "월운 확인"],
    ["기회 2순위", opportunities[1] ? `${opportunities[1].month}월 ${opportunities[1].pillar?.label || ""}` : "월운 확인"],
    ["기회 3순위", opportunities[2] ? `${opportunities[2].month}월 ${opportunities[2].pillar?.label || ""}` : "월운 확인"],
    ["주의 1순위", risks[0] ? `${risks[0].month}월 ${risks[0].pillar?.label || ""}` : "월운 확인"],
    ["연간 전략", "좋은 달에는 실행, 낮은 달에는 정비"],
  ];
  const cardHtml = cards.map(([label, value]) => `<div class="metric-card"><strong>${escHtml(label)}</strong><span>${escHtml(value)}</span></div>`).join("");
  const monthRows = (rows, mode) => rows.map((item, index) => `<tr><td>TOP ${index + 1}</td><td>${Number(item.month || 0)}월</td><td>${escHtml(item.pillar?.label || "")}</td><td>${escHtml(item.decision || decisionFromScore(item.finalScore || item.score))}</td><td>${Number(item.finalScore ?? item.score ?? 0)}</td><td>${escHtml(mode === "opportunity" ? "준비한 일을 실제 일정에 올리는 달" : "지출, 관계, 건강 리듬을 점검하는 달")}</td></tr>`).join("");
  const masterRows = [
    ["1분기", "기준 정리", "올해 목표와 금지 행동을 한 문장으로 정리"],
    ["2분기", "실행과 검증", "기회 달에 제안, 발표, 협상 배치"],
    ["3분기", "조율과 회복", "관계, 비용, 체력의 새는 부분 정비"],
    ["4분기", "마무리와 재설계", "남길 것과 내려놓을 것을 구분"],
  ].map((row) => `<tr><td>${escHtml(row[0])}</td><td>${escHtml(row[1])}</td><td>${escHtml(row[2])}</td></tr>`).join("");
  return `
    <section class="insight-panel">
      <h2>올해의 핵심 카드</h2>
      <div class="metric-grid">${cardHtml}</div>
    </section>
    <section class="insight-panel">
      <h2>기회 시기 TOP 3</h2>
      <table class="yearly-rank-table"><thead><tr><th>순위</th><th>월</th><th>월운</th><th>판정</th><th>점수</th><th>활용법</th></tr></thead><tbody>${monthRows(opportunities, "opportunity")}</tbody></table>
    </section>
    <section class="insight-panel">
      <h2>주의 시기 TOP 3</h2>
      <table class="yearly-rank-table"><thead><tr><th>순위</th><th>월</th><th>월운</th><th>판정</th><th>점수</th><th>대응법</th></tr></thead><tbody>${monthRows(risks, "risk")}</tbody></table>
    </section>
    <section class="insight-panel">
      <h2>올해의 마스터플랜 표</h2>
      <table class="masterplan-table"><thead><tr><th>구간</th><th>운영 키워드</th><th>실천 기준</th></tr></thead><tbody>${masterRows}</tbody></table>
    </section>`;
}

function buildMonthlyFortuneCardsHtml(monthlySections = []) {
  const rows = Array.isArray(monthlySections) ? monthlySections.slice(0, 12) : [];
  if (!rows.length) return "";
  const cards = rows.map((item) => `
    <article class="monthly-fortune-card">
      <h3>${escHtml(item.month)}월</h3>
      <p><strong>핵심 키워드:</strong> ${escHtml(item.summary)}</p>
      <p><strong>기회:</strong> ${escHtml(item.opportunity)}</p>
      <p><strong>주의:</strong> ${escHtml(item.caution)}</p>
      <p><strong>일/커리어:</strong> ${escHtml(item.career)}</p>
      <p><strong>돈/소비:</strong> ${escHtml(item.money)}</p>
      <p><strong>관계:</strong> ${escHtml(item.relationship)}</p>
      <p><strong>건강/리듬:</strong> ${escHtml(item.health)}</p>
      <p><strong>이번 달 실천:</strong> ${escHtml(item.action)}</p>
      <p><strong>행운 루틴:</strong> ${escHtml(item.luckyRoutine)}</p>
    </article>`).join("");
  return `
    <section class="monthly-card-panel page-break">
      <h2>12개월 월별 운세 카드</h2>
      <div class="monthly-card-grid">${cards}</div>
    </section>`;
}

function displayPillarValue(value) {
  if (!value) return "";
  if (typeof value === "string") return clean(value);
  return clean(value.label || `${clean(value.stem)}${clean(value.branch)}`);
}

function tableRows(rows = []) {
  return rows.map(([label, value]) => `<tr><th>${escHtml(label)}</th><td>${escHtml(value || "확인 가능한 계산값 없음")}</td></tr>`).join("");
}

function buildYearlyPremiumTables(seed = {}) {
  const saju = seed.saju || {};
  const annual = saju.annualLuck || {};
  const pillars = saju.pillars || {};
  const quantum = seed?.quantumMyeongri || saju?.quantumMyeongri || {};
  const daewoon = saju.currentDaewoon || seed.luckCycles?.currentDaewoon || seed.luckCycles?.daewoon || {};
  const natalRows = [
    ["년주", displayPillarValue(pillars.year)],
    ["월주", displayPillarValue(pillars.month)],
    ["일주", displayPillarValue(pillars.day)],
    ["시주", displayPillarValue(pillars.hour)],
    ["일간", clean(saju.dayMaster || saju.dayMasterInfo?.stem || "")],
    ["오행 분포", ["wood", "fire", "earth", "metal", "water"].map((key) => `${LOCAL_ELEMENT_KO[key] || key} ${Number(saju.fiveElements?.[key] || 0)}`).join(" · ")],
  ];
  const annualRows = [
    ["세운", clean(annual.label || "")],
    ["천간", clean(annual.stem || annual.heavenlyStem || "")],
    ["지지", clean(annual.branch || annual.earthlyBranch || "")],
    ["일간 기준 십성", clean(annual.tenGod || "")],
    ["일간 관계", clean(annual.dayMasterRelation || "")],
    ["유리 오행", (quantum.favorableElements || []).join(" · ") || "중립"],
    ["주의 오행", (quantum.cautionElements || []).join(" · ") || "중립"],
  ];
  const daewoonRows = [
    ["현재 대운", cleanNormalizedText(daewoon) || clean(daewoon.label || daewoon.name || "")],
    ["대운 흐름", clean(daewoon.flow || daewoon.relation || daewoon.summary || "대운은 올해 세운이 작동하는 큰 배경으로 참고합니다.")],
    ["세운과의 관계", clean(annual.dayMasterRelation || "세운의 십성 흐름을 중심으로 올해의 선택 기준을 봅니다.")],
    ["운영 기준", "강한 달에는 실행을 앞에 두고, 부담이 커지는 달에는 문서·약속·일정 점검을 우선합니다."],
  ];
  return `
    <section class="content premium-table-section page-break">
      <h2>사주 신년운세 계산 요약</h2>
      <div class="premium-table-grid">
        <article><h3>원국 요약표</h3><table class="premium-info-table">${tableRows(natalRows)}</table></article>
        <article><h3>세운 요약표</h3><table class="premium-info-table">${tableRows(annualRows)}</table></article>
        <article><h3>대운·세운 관계표</h3><table class="premium-info-table">${tableRows(daewoonRows)}</table></article>
      </div>
    </section>`;
}

function chapterQuote(chapter = {}, seed = {}) {
  const annual = seed.saju?.annualLuck || {};
  const quotes = [
    `${clean(annual.label || "올해의 운")}은 기다리는 운이 아니라, 선택의 기준으로 읽을 때 가장 선명해집니다.`,
    "좋은 달에는 문을 열고, 부담이 큰 달에는 기준을 정비하는 사람이 한 해를 안정적으로 씁니다.",
    "운의 흐름은 단정이 아니라 리듬입니다. 올해는 그 리듬을 생활 속 판단으로 옮기는 해입니다.",
    "사주가 보여주는 것은 결과의 확정이 아니라, 더 나은 선택을 위한 방향입니다.",
  ];
  return quotes[(Number(chapter.no || 1) - 1) % quotes.length];
}

function buildFinalSummaryPage(seed = {}, monthlySections = []) {
  const annual = seed.saju?.annualLuck || {};
  const opportunities = topYearlyMonths(seed, "opportunity", 3).map((item) => `${Number(item.month || 0)}월`).filter(Boolean).join(" · ") || "준비된 시기";
  const risks = topYearlyMonths(seed, "risk", 3).map((item) => `${Number(item.month || 0)}월`).filter(Boolean).join(" · ") || "점검이 필요한 시기";
  const routineRows = monthlySections.slice(0, 12).map((item) => `<tr><td>${escHtml(item.month)}월</td><td>${escHtml(item.action)}</td><td>${escHtml(item.luckyRoutine)}</td></tr>`).join("");
  return `
    <section class="final-page page-break">
      <span class="badge dark">CODE · SAJU NEW YEAR</span>
      <h2>마지막 정리</h2>
      <div class="final-summary-grid">
        <div><strong>전체 요약</strong><p>${escHtml(seed.targetYear)}년은 ${escHtml(annual.label || "세운")}의 ${escHtml(annual.tenGod || "흐름")}을 기준으로, 좋은 달에는 실행하고 부담이 커지는 달에는 관계·돈·일정을 정비하는 해입니다.</p></div>
        <div><strong>기회 흐름</strong><p>${escHtml(opportunities)}에는 제안, 발표, 협상, 실행 일정을 앞에 두기 좋습니다.</p></div>
        <div><strong>주의 흐름</strong><p>${escHtml(risks)}에는 큰 결정보다 문서, 약속, 기록, 절차를 한 번 더 살피는 편이 안정적입니다.</p></div>
      </div>
      <h3>12개월 실행 루틴</h3>
      <table class="masterplan-table"><thead><tr><th>월</th><th>이번 달 실천</th><th>루틴</th></tr></thead><tbody>${routineRows}</tbody></table>
      <div class="reopen-note">
        <strong>재열람 안내</strong>
        <p>결제 완료 후 제공되는 보관 링크에서 같은 리포트를 다시 열람할 수 있습니다. 저장된 PDF는 생성 당시의 계산값과 원고를 기준으로 보존됩니다.</p>
      </div>
    </section>`;
}

function buildReportHtml(seed, chapters) {
  const profile = seed.birthProfile;
  const quantum = seed?.quantumMyeongri || seed?.saju?.quantumMyeongri || {};
  const generatedDate = new Date().toISOString().slice(0, 10);
  const profileName = clean(profile.name || "") || "익명";
  const annual = seed.saju?.annualLuck || {};
  const monthlyRows = seed.saju.monthlyLuck.map((item) => `<tr><td>${item.month}월</td><td>${escHtml(item.pillar.label)}</td><td>${item.baseScore ?? item.score}</td><td>${Number(item.quantumAdjustment || 0) >= 0 ? "+" : ""}${Number(item.quantumAdjustment || 0)}</td><td>${item.finalScore ?? item.score}</td><td>${escHtml(item.decision || decisionFromScore(item.finalScore || item.score))}</td><td>${escHtml(item.advice)}</td></tr>`).join("");
  const monthlyFortuneSections = buildMonthlyFortuneSections({ seed });
  const toc = chapters.map((chapter) => `<li><span>${chapter.no}</span>${escHtml(chapter.title)}</li>`).join("");
  const body = chapters.map((chapter, idx) => {
    const sections = Array.isArray(chapter?.sections)
      ? chapter.sections
      : Array.isArray(chapter?.categories)
        ? chapter.categories.map((item) => ({ title: item?.title, body: item?.finalText || item?.localSummary || "" }))
        : [];
    return `
    <section class="chapter-cover page-break">
      <p class="chapter-kicker">CHAPTER ${String(chapter.no).padStart(2, "0")}</p>
      <h2>${escHtml(chapter.title)}</h2>
      <blockquote>${escHtml(chapterQuote(chapter, seed))}</blockquote>
    </section>
    <section class="chapter">
      <h2>${escHtml(chapter.title)}</h2>
      ${sections.map((section) => `<article><h3>${escHtml(section.title)}</h3><div class="section-body">${renderNewYearSectionBody(section.body || section.finalText || section.text || "")}</div></article>`).join("")}
    </section>`;
  }).join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${seed.targetYear} 신년운세 프리미엄 리포트</title><style>
    @page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;background:#0b1020;color:#1f2937;font-family:Arial,'Noto Sans KR',sans-serif;line-height:1.72}.page{background:#fff;min-height:100vh}.cover{min-height:100vh;padding:54px 48px;color:#fff;background:linear-gradient(145deg,#080b19,#182044 48%,#5b1b2b);display:flex;flex-direction:column;justify-content:space-between}.cover img{width:100%;max-height:300px;object-fit:cover;border-radius:14px;border:1px solid rgba(250,204,21,.42);box-shadow:0 24px 60px rgba(0,0,0,.32)}.badge{display:inline-block;padding:7px 12px;border:1px solid rgba(250,204,21,.7);border-radius:999px;color:#fde68a;font-size:12px;letter-spacing:.08em}.badge.dark{color:#7f1d1d;border-color:#d9b45f}.cover h1{font-size:48px;margin:18px 0 8px;color:#fff4c2;letter-spacing:0}.cover p{font-size:17px;color:#fef3c7}.cover-meta{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:20px;color:#fde68a;font-size:13px}.cover-meta div{border:1px solid rgba(250,204,21,.32);padding:10px;border-radius:8px}.content,.insight-panel,.monthly-card-panel,.final-page{padding:34px 42px;background:#fff}.summary,.metric-grid,.body-card-grid,.final-summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}.summary div,.metric-card,.body-card-grid div,.final-summary-grid div{border:1px solid #f1d58b;background:#fff8e1;border-radius:8px;padding:12px}.metric-card strong,.body-card-grid strong,.final-summary-grid strong{display:block;color:#7f1d1d}.metric-card span{display:block;margin-top:6px}.premium-table-grid{display:grid;grid-template-columns:1fr;gap:18px}.premium-table-grid article{break-inside:avoid}.premium-info-table{width:100%;border-collapse:collapse;background:#fff}.premium-info-table th,.premium-info-table td{border:1px solid #ead7a6;padding:9px;font-size:12px;text-align:left}.premium-info-table th{width:30%;background:#fff8e1;color:#7f1d1d}.monthly-card-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:18px 0}.monthly-fortune-card{border:1px solid #ead7a6;background:#fffaf0;border-radius:8px;padding:14px;break-inside:avoid}.monthly-fortune-card h3{margin:0 0 8px;color:#7f1d1d}.monthly-fortune-card p{margin:6px 0;font-size:12px;line-height:1.68}.monthly-fortune-card strong{color:#92400e}.toc{padding:34px 42px;background:#fffaf0}.toc h2,.chapter h2,.insight-panel h2,.monthly-card-panel h2,.premium-table-section h2,.final-page h2{color:#7f1d1d}.toc li{margin:8px 0}.toc span{display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;margin-right:8px;border-radius:50%;background:#991b1b;color:#fff}.chapter-cover{min-height:72vh;padding:64px 48px;background:linear-gradient(145deg,#fffaf0,#fff 54%,#f8e7b0);display:flex;flex-direction:column;justify-content:center;border-top:8px solid #7f1d1d}.chapter-kicker{color:#b45309;font-size:13px;letter-spacing:.12em}.chapter-cover h2{font-size:32px;color:#7f1d1d;margin:8px 0 18px}.chapter-cover blockquote{margin:0;padding:18px 22px;border-left:4px solid #d97706;background:rgba(255,255,255,.72);font-size:17px;color:#4b5563}.chapter{padding:32px 42px;background:#fff}.chapter h2{font-size:25px;border-bottom:2px solid #f59e0b;padding-bottom:10px}.chapter article{margin:18px 0;padding:16px;border-left:4px solid #d97706;background:#fffaf0;border-radius:0 8px 8px 0;break-inside:avoid}.chapter h3{margin:0 0 8px;color:#92400e}.section-body{display:flex;flex-direction:column;gap:12px}.section-body h5{margin:18px 0 2px;color:#8a5a32;font-weight:800}.section-body p{margin:0;line-height:1.9;word-break:keep-all;overflow-wrap:break-word}.monthly,.yearly-rank-table,.masterplan-table{width:100%;border-collapse:collapse;margin:18px 0;background:#fff}.monthly th,.monthly td,.yearly-rank-table th,.yearly-rank-table td,.masterplan-table th,.masterplan-table td{border:1px solid #ead7a6;padding:8px;font-size:12px;text-align:left}.monthly th,.yearly-rank-table th,.masterplan-table th{background:#7f1d1d;color:#fff}.reopen-note{margin-top:22px;padding:16px;border:1px solid #ead7a6;background:#fffaf0;border-radius:8px}.page-break{page-break-before:always}@media print{body{background:#fff}.page{min-height:auto}.cover{height:100vh}.page-break{break-before:page}.chapter-cover{height:100vh}}
  </style></head><body><main class="page">
    <section class="cover"><div><span class="badge">Code</span><h1>사주 신년운세</h1><p>나의 사주 구조로 읽는 1년의 흐름</p><div class="cover-meta"><div><strong>대상 연도</strong><br>${escHtml(seed.targetYear)}년</div><div><strong>생성일</strong><br>${escHtml(generatedDate)}</div><div><strong>프로필</strong><br>${escHtml(profileName)}</div><div><strong>서비스명</strong><br>Code</div></div></div><img src="${COVER_IMAGE}" alt="사주 신년운세 표지 이미지" onerror="this.style.display='none'"><p>${escHtml(seed.targetYear)}년 나의 운의 흐름과 선택 전략</p></section>
    <section class="content"><h2>본문 카드</h2><div class="body-card-grid"><div><strong>올해의 핵심 키워드</strong><p>${escHtml(annual.label || "세운")} · ${escHtml(annual.tenGod || "흐름")} · ${escHtml(annual.dayMasterRelation || "중립")}</p></div><div><strong>올해의 강점</strong><p>${escHtml((quantum.favorableElements || []).join(" · ") || "균형을 유지하는 힘")}</p></div><div><strong>올해의 주의점</strong><p>${escHtml((quantum.cautionElements || []).join(" · ") || "속도와 지출 관리")}</p></div><div><strong>올해의 실천 조언</strong><p>좋은 달에는 실행을 앞에 두고, 부담이 커지는 달에는 문서·약속·일정을 정비하세요.</p></div></div><h2>올해의 핵심 요약</h2><div class="summary"><div><strong>세운</strong><br>${escHtml(seed.saju.annualLuck.label)} · ${escHtml(seed.saju.annualLuck.elementKo)}</div><div><strong>일간 관계</strong><br>${escHtml(seed.saju.annualLuck.tenGod)} · ${escHtml(seed.saju.annualLuck.dayMasterRelation)}</div><div><strong>퀀텀 보정</strong><br>${escHtml((quantum.favorableElements || []).join("·") || "중립")} 유리 · ${escHtml((quantum.cautionElements || []).join("·") || "중립")} 주의</div></div><p>${escHtml(quantum.professionalSummary || "월별 운영은 기본 월운과 퀀텀 보정을 함께 보아 실행 강약을 조절합니다.")}</p><table class="monthly"><thead><tr><th>월</th><th>월운</th><th>기본</th><th>퀀텀</th><th>최종</th><th>판정</th><th>전략</th></tr></thead><tbody>${monthlyRows}</tbody></table></section>
    ${buildYearlyPremiumTables(seed)}
    ${buildYearlyPdfInsightSections(seed)}
    ${buildMonthlyFortuneCardsHtml(monthlyFortuneSections)}
    <section class="toc page-break"><h2>목차</h2><p>사주 신년운세 10챕터 목록</p><ol>${toc}</ol></section>${body}
    ${buildFinalSummaryPage(seed, monthlyFortuneSections)}
  </main></body></html>`;
}

function buildPdfReadyPayload(seed, chapters, metadata = {}) {
  return {
    title: `${seed.targetYear} 신년운세 프리미엄 리포트`,
    filename: `saju-new-year-${seed.targetYear}-${clean(seed.birthProfile.name || "user").replace(/\s+/g, "-").toLowerCase()}.html`,
    generatedAt: new Date().toISOString(),
    profile: seed.birthProfile,
    targetYear: seed.targetYear,
    quantumMyeongri: seed.quantumMyeongri || seed.saju?.quantumMyeongri || null,
    metadata,
    html: buildReportHtml(seed, chapters),
    chapters: chapters.map((chapter) => ({
      chapter: chapter.no,
      title: chapter.title,
      categories: (Array.isArray(chapter.categories) ? chapter.categories : []).map((category) => category.title),
      text: chapter.text,
      source: chapter.source,
    })),
  };
}

function pillarLabel(pillar = {}) {
  return clean(pillar?.label || `${clean(pillar?.stem)}${clean(pillar?.branch)}`);
}

function toCleanArray(value) {
  if (Array.isArray(value)) return value.map((item) => cleanNormalizedText(item)).filter(Boolean);
  if (value && typeof value === "object") {
    const text = clean(value.label || value.name || value.title || value.text || value.summary || value.meaning || value.value || "");
    return text ? [text] : [];
  }
  const text = clean(value);
  return text ? [text] : [];
}

function cleanNormalizedText(value) {
  if (!value || typeof value !== "object") return clean(value);
  return clean(value.label || value.name || value.title || value.text || value.summary || value.meaning || value.value || "");
}

function normalizeElementCounts(fiveElements = {}) {
  const source = fiveElements?.counts || fiveElements?.scores || fiveElements?.ratio || fiveElements || {};
  return ["wood", "fire", "earth", "metal", "water"].reduce((acc, key) => {
    acc[key] = Number(source?.[key] || 0);
    return acc;
  }, {});
}

function rankedKeysFromCounts(counts = {}, order = "desc") {
  const rows = Object.entries(counts).filter(([, value]) => Number(value) > 0);
  rows.sort((a, b) => order === "asc" ? Number(a[1]) - Number(b[1]) : Number(b[1]) - Number(a[1]));
  if (!rows.length) return [];
  const edge = Number(rows[0][1]);
  return rows.filter(([, value]) => Number(value) === edge).map(([key]) => key);
}

function normalizeTenGodDistribution(tenGods = {}) {
  const source = tenGods?.distribution || tenGods?.counts || tenGods?.scores || tenGods || {};
  return Object.entries(source).reduce((acc, [key, value]) => {
    const name = clean(key);
    const score = Number(value);
    if (name && Number.isFinite(score)) acc[name] = score;
    return acc;
  }, {});
}

function usefulGodRelationFromRole(role) {
  const value = clean(role).toLowerCase();
  if (!value) return "neutral";
  if (/support|favorable|useful|good|go/.test(value)) return "favorable";
  if (/caution|unfavorable|avoid|bad|stop/.test(value)) return "unfavorable";
  if (/mixed/.test(value)) return "mixed";
  return "neutral";
}

function uniqueInterpretationBlocks(blocks = []) {
  const seen = new Set();
  return blocks
    .filter(Boolean)
    .filter((block) => {
      const id = clean(block.id);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a, b) => Number(b.weight || 0) - Number(a.weight || 0));
}

function selectYearlyInterpretationBlocks(normalizedData = {}) {
  const annual = normalizedData.annual || {};
  const natal = normalizedData.natal || {};
  const monthly = Array.isArray(normalizedData.monthly) ? normalizedData.monthly : [];
  const blocks = [
    ANNUAL_STEM_BLOCKS[annual.heavenlyStem],
    ANNUAL_BRANCH_BLOCKS[annual.earthlyBranch],
    ANNUAL_TEN_GOD_BLOCKS[annual.tenGodToDayMaster],
    YEARLY_CONTEXT_BLOCKS.elementExcess,
    YEARLY_CONTEXT_BLOCKS.elementDeficit,
    annual.usefulGodRelation === "favorable" ? YEARLY_CONTEXT_BLOCKS.usefulFavorable : null,
    annual.usefulGodRelation === "unfavorable" ? YEARLY_CONTEXT_BLOCKS.usefulUnfavorable : null,
    annual.currentDaewoon ? YEARLY_CONTEXT_BLOCKS.daewoonAnnual : null,
    (annual.clashes || []).length ? YEARLY_CONTEXT_BLOCKS.relationClash : null,
    (annual.combinations || []).length ? YEARLY_CONTEXT_BLOCKS.relationCombination : null,
    ((annual.punishments || []).length || (annual.harms || []).length) ? YEARLY_CONTEXT_BLOCKS.relationHarmBreakPunishment : null,
    monthly.some((item) => (item.opportunities || []).length || /favorable/i.test(clean(item.usefulGodRelation))) ? YEARLY_CONTEXT_BLOCKS.monthlyOpportunity : null,
    monthly.some((item) => (item.risks || []).length || /unfavorable/i.test(clean(item.usefulGodRelation))) ? YEARLY_CONTEXT_BLOCKS.monthlyRisk : null,
    YEARLY_CONTEXT_BLOCKS.career,
    YEARLY_CONTEXT_BLOCKS.money,
    YEARLY_CONTEXT_BLOCKS.relationship,
    YEARLY_CONTEXT_BLOCKS.health,
    YEARLY_CONTEXT_BLOCKS.routine12,
  ];
  const all = uniqueInterpretationBlocks(blocks);
  return {
    all,
    byId: Object.fromEntries(all.map((block) => [block.id, block])),
    byTag: all.reduce((acc, block) => {
      for (const tag of block.tags || []) {
        if (!acc[tag]) acc[tag] = [];
        acc[tag].push(block);
      }
      return acc;
    }, {}),
    monthlyCoverage: monthly.length,
    elementFocus: {
      strongest: natal.fiveElements?.strongest || [],
      weakest: natal.fiveElements?.weakest || [],
    },
  };
}

function buildYearlySajuNormalizedData({ seed = {}, masterJson = {} } = {}) {
  const profile = seed.birthProfile || {};
  const pillars = seed.saju?.pillars || {};
  const annual = seed.saju?.annualLuck || {};
  const relations = seed.saju?.relations || {};
  const useful = seed.saju?.usefulGod || {};
  const elementCounts = normalizeElementCounts(seed.saju?.fiveElements || {});
  const tenGodDistribution = normalizeTenGodDistribution(seed.saju?.tenGods || {});
  const dominantTenGodScore = Math.max(0, ...Object.values(tenGodDistribution).map((value) => Number(value) || 0));
  const weakTenGodScore = Math.min(...Object.values(tenGodDistribution).filter((value) => Number(value) > 0).map((value) => Number(value)));
  const monthlyFlow = Array.isArray(masterJson.monthlyFlow) ? masterJson.monthlyFlow : [];
  const monthlyLuck = Array.isArray(seed.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  const derived = seed.derivedSignals || {};
  const facts = seed.annualFortuneFacts || buildAnnualFortuneFacts(seed);
  const natalRelationMessages = (relations.branchRelations || []).map((row) => clean(row?.message)).filter(Boolean);
  const opportunities = toCleanArray(derived.opportunitySignals).concat(toCleanArray(facts.opportunityWindows)).slice(0, 8);
  const risks = toCleanArray(derived.crisisSignals).concat(toCleanArray(facts.riskWarnings)).slice(0, 8);

  return {
    service: "yearly-saju",
    targetYear: Number(seed.targetYear || masterJson.targetYear || resolveDefaultTargetYear()),
    profile: {
      name: clean(profile.name),
      gender: clean(profile.gender),
      birthDate: clean(profile.birthDate),
      birthTime: clean(profile.birthTime),
      calendarType: clean(profile.calendarType),
    },
    natal: {
      pillars: {
        year: pillarLabel(pillars.year),
        month: pillarLabel(pillars.month),
        day: pillarLabel(pillars.day),
        hour: pillarLabel(pillars.hour),
      },
      dayMaster: {
        stem: clean(seed.saju?.dayMaster),
        element: clean(LOCAL_STEM_ELEMENT[seed.saju?.dayMaster] || STEM_ELEMENT[seed.saju?.dayMaster] || ""),
        yinYang: clean(STEM_YINYANG[seed.saju?.dayMaster] || ""),
        strength: clean(seed.saju?.dayMasterStrength || seed.saju?.strength || ""),
      },
      fiveElements: {
        ...elementCounts,
        strongest: rankedKeysFromCounts(elementCounts, "desc"),
        weakest: rankedKeysFromCounts(elementCounts, "asc"),
        balanceSummary: clean(seed.quantumMyeongri?.professionalSummary || "계산 가능한 오행 분포만 반영했습니다."),
      },
      tenGods: {
        distribution: tenGodDistribution,
        dominant: Object.entries(tenGodDistribution).filter(([, value]) => Number(value) === dominantTenGodScore && dominantTenGodScore > 0).map(([key]) => key),
        weak: Object.entries(tenGodDistribution).filter(([, value]) => Number(value) === weakTenGodScore && Number.isFinite(weakTenGodScore)).map(([key]) => key),
      },
      usefulGods: {
        yongshin: cleanNormalizedText(useful.yong || useful.useful || useful.primary || ""),
        heeshin: toCleanArray(useful.hi || useful.hee || useful.heeshin || useful.secondary),
        gishin: toCleanArray(useful.gisin || useful.kishin || useful.avoid),
        summary: clean(seed.structure?.usefulGodKeywords?.length ? `용신·희신 키워드는 ${seed.structure.usefulGodKeywords.join(" / ")} 흐름입니다.` : "확정된 용신 보조 키워드만 반영했습니다."),
      },
      structure: {
        geokguk: clean(seed.structure?.geokguk),
        seasonalEnergy: clean(seed.natalChart?.season),
        monthBranch: clean(seed.natalChart?.monthBranch || pillars.month?.branch),
        notes: toCleanArray(seed.structure?.usefulGodKeywords),
      },
    },
    annual: {
      yearGanji: clean(annual.label),
      heavenlyStem: clean(annual.stem),
      earthlyBranch: clean(annual.branch),
      tenGodToDayMaster: clean(annual.tenGod),
      elementInfluence: [clean(annual.elementKo), clean(annual.dayMasterRelation), clean(annual.quantum?.summary)].filter(Boolean),
      usefulGodRelation: usefulGodRelationFromRole(annual.quantum?.elementRole || annual.quantum?.decision),
      currentDaewoon: Array.isArray(seed.saju?.luckCycle) ? seed.saju.luckCycle.find((item) => {
        const start = Number(item?.startYear || item?.fromYear || item?.year || 0);
        const end = Number(item?.endYear || item?.toYear || 0);
        return start && end ? Number(seed.targetYear) >= start && Number(seed.targetYear) <= end : false;
      }) || null : null,
      annualStars: [],
      clashes: (relations.clashes || []).map((row) => clean(row?.message)).filter(Boolean),
      combinations: (relations.combinations || []).map((row) => clean(row?.message)).filter(Boolean),
      punishments: (relations.punishments || []).map((row) => clean(row?.message || row?.label)).filter(Boolean),
      harms: (relations.harms || []).map((row) => clean(row?.message)).filter(Boolean),
      opportunities,
      risks,
      summaryKeywords: toCleanArray(seed.luckCycles?.targetYearSewoon?.keywords).concat(natalRelationMessages.slice(0, 2)).slice(0, 8),
    },
    monthly: monthlyLuck.map((item, index) => {
      const flow = monthlyFlow[index] || {};
      const opportunitySignals = toCleanArray(seed.luckCycles?.monthlyFortunes?.[index]?.opportunitySignals);
      const cautionSignals = toCleanArray(seed.luckCycles?.monthlyFortunes?.[index]?.cautionSignals);
      return {
        month: Number(item.month || flow.month || index + 1),
        monthGanji: clean(item.pillar?.label || flow.pillar),
        tenGodToDayMaster: clean(localTenGod(seed.saju?.dayMaster, item.pillar?.stem || "")),
        elementInfluence: [clean(LOCAL_ELEMENT_KO[item.pillar?.element] || ELEMENT_KO[item.pillar?.element] || ""), clean(item.relation || flow.relation), clean(item.quantumSummary || flow.quantumSummary)].filter(Boolean),
        usefulGodRelation: usefulGodRelationFromRole(item.quantumRole || item.decision || flow.decision),
        opportunities: opportunitySignals,
        risks: cautionSignals,
        relationshipHint: clean(item.finalScore >= 70 ? "관계 조율과 만남에 힘을 실을 수 있는 달입니다." : ""),
        moneyHint: clean(item.finalScore >= 72 ? "수익 구조 점검과 실행에 활용하기 좋은 달입니다." : ""),
        careerHint: clean(item.finalScore >= 72 ? "일정, 제안, 발표를 전진시키기 좋은 달입니다." : ""),
        healthHint: clean(item.finalScore < 60 ? "무리한 일정과 피로 누적을 조심해야 하는 달입니다." : ""),
        actionHint: clean(item.advice || flow.advice),
      };
    }),
    yearlyThemes: {
      mainTheme: toCleanArray(derived.yearlyThemeSignals),
      career: toCleanArray(derived.careerSignals),
      money: toCleanArray(derived.moneySignals),
      relationship: toCleanArray(derived.humanRelationSignals).concat(toCleanArray(derived.loveRelationshipSignals)).slice(0, 8),
      health: toCleanArray(derived.healthMindSignals),
      studyOrGrowth: toCleanArray(derived.quantumSignals).slice(0, 4),
      caution: risks,
      actionPlan: toCleanArray(derived.monthlyStrategySignals).slice(0, 12),
    },
  };
}

function normalizeYearlySajuInput({ profile, targetYear, body = {}, natalCalculation = null } = {}) {
  const seed = natalCalculation || buildPdfSeed(profile, targetYear, body);
  const seedValidation = validateSajuNewYearSeed(seed);
  if (!seedValidation.ok) {
    throw Object.assign(new Error(`SAJU_NEW_YEAR_SEED_INVALID:${seedValidation.errors.join(",")}`), {
      code: "SAJU_NEW_YEAR_SEED_INVALID",
      status: 422,
    });
  }

  const masterJson = buildNewYearMasterJson(seed, body);
  const masterJsonValidation = validateNewYearMasterJson(masterJson);
  if (!masterJsonValidation.ok) {
    throw Object.assign(new Error(`SAJU_NEW_YEAR_MASTER_JSON_INVALID:${masterJsonValidation.errors.join(",")}`), {
      code: "SAJU_NEW_YEAR_MASTER_JSON_INVALID",
      status: 422,
    });
  }

  const normalizedData = buildYearlySajuNormalizedData({ seed, masterJson });
  const interpretationBlocks = selectYearlyInterpretationBlocks(normalizedData);
  const monthlyFortuneSections = buildMonthlyFortuneSections({ seed });

  return {
    profile: seed.birthProfile,
    targetYear: seed.targetYear,
    seed,
    natalCalculation: seed.saju,
    yearlyCalculation: seed.saju?.annualLuck || null,
    monthlyCalculation: Array.isArray(seed.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [],
    masterJson,
    masterJsonValidation,
    normalizedData,
    interpretationBlocks,
    monthlyFortuneSections,
    expectedChapters: buildSajuNewYearChapterSpecs(seed.targetYear),
  };
}

function composeMonthlyFortuneTable(normalized = {}) {
  return Array.isArray(normalized.monthlyCalculation) ? normalized.monthlyCalculation : [];
}

function formatInterpretationBlockForChapter(block, seed = {}) {
  if (!block) return "";
  const lines = [
    `해석 블록: ${block.title}`,
    block.summary,
    ...block.body.slice(0, 2),
    block.advice.length ? `실천 조언: ${block.advice.slice(0, 2).join(" ")}` : "",
    block.caution.length ? `주의할 점: ${block.caution.slice(0, 1).join(" ")}` : "",
    block.checklist.length ? `실천 체크: ${block.checklist.slice(0, 3).join(" / ")}` : "",
  ];
  if (Number(block.weight || 0) >= 3) {
    lines.push(...block.body.slice(2, 4));
    lines.push(...block.advice.slice(2, 3).map((line) => `보완 조언: ${line}`));
  }
  return assembleYearlyLocalLines(lines, seed, `interpretation:${block.id}`).join("\n");
}

function topYearlyMonths(seed = {}, mode = "opportunity", limit = 3) {
  const rows = Array.isArray(seed.saju?.monthlyLuck) ? seed.saju.monthlyLuck.slice() : [];
  rows.sort((a, b) => mode === "risk"
    ? Number(a.finalScore ?? a.score ?? 0) - Number(b.finalScore ?? b.score ?? 0)
    : Number(b.finalScore ?? b.score ?? 0) - Number(a.finalScore ?? a.score ?? 0));
  return rows.slice(0, limit);
}

function monthListText(rows = []) {
  return rows.map((item) => `${Number(item.month || 0)}월 ${clean(item.pillar?.label || "")}`).filter(Boolean).join(", ");
}

function monthlyPhrase(pool = [], index = 0, seedKey = "") {
  if (!pool.length) return "";
  const offset = stableYearlyHash(seedKey);
  return pool[Math.abs((Number(index) || 0) + offset) % pool.length];
}

function buildMonthlyFortuneSectionsLegacy(normalized = {}) {
  const seed = normalized.seed || {};
  const annual = seed.saju?.annualLuck || {};
  const monthly = Array.isArray(seed.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  const dayMaster = clean(seed.saju?.dayMaster || "");
  const annualLabel = clean(annual.label || "올해 세운");
  const annualTenGod = clean(annual.tenGod || "세운");
  const fallbackMonthly = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    pillar: { label: "", stem: "", branch: "", element: annual.element || "earth" },
    finalScore: 62,
    score: 62,
    decision: "BALANCE",
    tone: "정비",
    relation: annual.dayMasterRelation || "중립",
  }));
  const source = monthly.length ? monthly : fallbackMonthly;
  return source.map((item, index) => {
    const month = Number(item.month || index + 1);
    const pillar = item.pillar || {};
    const score = Number(item.finalScore ?? item.score ?? 62);
    const decision = clean(item.decision || decisionFromScore(score));
    const monthGanji = clean(pillar.label || `${clean(pillar.stem)}${clean(pillar.branch)}`);
    const monthlyTenGod = clean(localTenGod(dayMaster, pillar.stem || ""));
    const relation = clean(item.relation || annual.dayMasterRelation || "중립");
    const usefulRelation = usefulGodRelationFromRole(item.quantumRole || decision);
    const isOpportunity = score >= 72 || usefulRelation === "favorable" || /GO/i.test(decision);
    const isRisk = score < 60 || usefulRelation === "unfavorable" || /STOP/i.test(decision);
    const isCombo = /합|combination/i.test(JSON.stringify(item));
    const isVolatile = /충|형|파|해|clash|harm|break|punishment/i.test(JSON.stringify(item));
    const monthlyKeyword = [
      monthGanji && `${monthGanji} 월운`,
      monthlyTenGod && `${monthlyTenGod} 흐름`,
      relation,
      decision,
    ].filter(Boolean).slice(0, 3).join(" · ");
    const opportunityBase = isOpportunity
      ? monthlyPhrase([
        "준비해 둔 제안과 실행 계획을 밖으로 꺼내기 좋은 달입니다.",
        "작게 열어 둔 일이 실제 반응으로 이어질 수 있는 달입니다.",
        "실행의 저항이 줄어드니 핵심 일정 하나를 전면에 세워도 좋습니다.",
      ], index)
      : monthlyPhrase([
        "큰 확장보다 준비와 정리에서 기회를 만드는 달입니다.",
        "기회는 빠른 승부보다 조건을 다듬는 과정에서 생깁니다.",
        "눈에 띄는 성과보다 다음 달을 위한 기반 정리가 더 유리합니다.",
      ], index);
    const cautionBase = isRisk
      ? monthlyPhrase([
        "무리한 지출, 감정적 결론, 급한 약속 변경을 줄여야 합니다.",
        "속도를 낮추고 사람과 돈의 경계를 분명히 해야 손실을 줄입니다.",
        "피로와 조급함이 판단을 흐릴 수 있으니 결정 사이에 여백을 두세요.",
      ], index)
      : monthlyPhrase([
        "좋은 흐름이 있어도 조건 확인과 일정 관리는 필요합니다.",
        "확장과 관리의 균형을 잃지 않는 것이 이번 달의 안전장치입니다.",
        "성과가 보이는 달일수록 기록과 약속을 명확히 남기세요.",
      ], index);
    const relationNote = isCombo
      ? "합의 기운이 있어 기회가 생길 수 있으나 관계와 조건을 확인해야 하는 달입니다."
      : isVolatile
        ? "충·형·파·해성 변동이 느껴질 수 있으니 과장보다 변동성 관리가 중요합니다."
        : "관계는 급히 넓히기보다 말의 온도와 약속의 지속성을 보는 편이 좋습니다.";
    return {
      month,
      title: `${month}월 ${monthGanji || "월운"} 운세`,
      summary: `${annualLabel} 세운의 ${annualTenGod} 흐름 위에 ${monthlyKeyword || "월별 생활 리듬"}이 겹치는 달입니다. ${isOpportunity ? "실행과 제안에 힘을 실을 수 있습니다." : isRisk ? "속도 조절과 정비가 우선입니다." : "균형 있게 운영할 때 안정감이 커집니다."}`,
      opportunity: opportunityBase,
      caution: cautionBase,
      relationship: relationNote,
      money: isOpportunity
        ? "수입 가능성은 열리지만 조건, 수수료, 지출 계획을 함께 확인해야 합니다."
        : isRisk
          ? "새 지출보다 고정비와 미뤄 둔 비용을 점검하는 데 적합합니다."
          : "소비는 계획 안에서 움직이고 작은 수익 구조를 점검하기 좋습니다.",
      career: isOpportunity
        ? "일과 커리어에서는 발표, 제안, 협상, 지원처럼 밖으로 보이는 행동이 유리합니다."
        : isRisk
          ? "업무에서는 검토, 수정, 일정 재배치가 필요하며 무리한 확장은 피하는 편이 좋습니다."
          : "기존 업무의 완성도와 협업 조건을 다듬으면 다음 기회가 편해집니다.",
      health: isRisk
        ? "수면, 소화, 긴장 누적을 가볍게 보지 말고 회복 일정을 먼저 확보하세요."
        : "몸의 리듬은 무난하지만 과열을 막기 위해 휴식 시간을 일정 안에 넣는 편이 좋습니다.",
      action: isOpportunity
        ? "이번 달 실천은 핵심 목표 하나를 정하고 실제 일정에 올리는 것입니다."
        : isRisk
          ? "이번 달 실천은 중요한 결정을 늦추고 점검표를 먼저 채우는 것입니다."
          : "이번 달 실천은 진행 중인 일을 하나 끝맺고 다음 달 준비를 시작하는 것입니다.",
      luckyRoutine: monthlyPhrase([
        "월초 목표 1개와 금지 행동 1개를 적고 매주 같은 요일에 점검하세요.",
        "아침에는 일정 우선순위를, 저녁에는 지출과 감정 소모를 짧게 기록하세요.",
        "중요한 대화 전에는 원하는 결론과 양보 가능한 범위를 먼저 적어 두세요.",
        "하루 20분 정리 시간을 고정해 생각, 돈, 관계의 흐름을 가볍게 비우세요.",
      ], index),
    };
  });
}

function buildMonthlyFortuneSections(normalized = {}) {
  const seed = normalized.seed || {};
  const annual = seed.saju?.annualLuck || {};
  const monthly = Array.isArray(seed.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  const dayMaster = clean(seed.saju?.dayMaster || "");
  const annualLabel = clean(annual.label || "올해 세운");
  const annualTenGod = clean(annual.tenGod || "세운");
  const annualRelation = clean(annual.dayMasterRelation || "중립");
  const fallbackMonthly = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    pillar: { label: "", stem: "", branch: "", element: annual.element || "earth" },
    finalScore: 62,
    score: 62,
    decision: "BALANCE",
    relation: annualRelation,
    advice: "",
  }));
  const monthlyByMonth = new Map(monthly
    .map((item, index) => [Number(item?.month || index + 1), item])
    .filter(([month]) => Number.isFinite(month) && month >= 1 && month <= 12));
  const source = fallbackMonthly.map((fallback) => monthlyByMonth.get(fallback.month) || fallback);
  const phraseSeed = yearlySentenceSeed(seed, "monthly-card");

  return source.map((item, index) => {
    const month = Number(item.month || index + 1);
    const pillar = item.pillar || {};
    const score = Number(item.finalScore ?? item.score ?? 62);
    const decision = clean(item.decision || decisionFromScore(score));
    const monthGanji = clean(pillar.label || `${clean(pillar.stem)}${clean(pillar.branch)}`);
    const monthlyTenGod = clean(localTenGod(dayMaster, pillar.stem || ""));
    const relation = clean(item.relation || annualRelation);
    const usefulRelation = usefulGodRelationFromRole(item.quantumRole || decision);
    const itemText = JSON.stringify(item);
    const isOpportunity = score >= 72 || usefulRelation === "favorable" || /GO/i.test(decision);
    const isRisk = score < 60 || usefulRelation === "unfavorable" || /STOP/i.test(decision);
    const isCombo = /합|combination/i.test(itemText);
    const isVolatile = /충|형|파|해|clash|harm|break|punishment/i.test(itemText);
    const keyword = [
      monthGanji ? `${monthGanji} 월운` : "생활 리듬 정비",
      monthlyTenGod ? `${monthlyTenGod} 흐름` : annualTenGod,
      relation,
    ].filter(Boolean).slice(0, 3).join(" · ");
    const opportunity = isOpportunity
      ? monthlyPhrase([
        "준비해 둔 제안과 실행 계획을 바깥으로 꺼내기 좋은 달입니다.",
        "작게 이어 온 일이 실제 반응으로 이어질 수 있으니 핵심 일정을 앞에 두세요.",
        "실행의 탄력이 생기므로 한 가지 목표를 분명하게 잡으면 성과가 또렷해집니다.",
      ], index, phraseSeed)
      : monthlyPhrase([
        "빠른 확장보다 조건 정리와 기반 다지기에서 기회가 생기는 달입니다.",
        "눈에 보이는 성과보다 다음 달을 위한 준비가 운의 쓰임을 살립니다.",
        "작은 약속과 기록을 정돈하면 뒤늦게 좋은 흐름으로 이어질 수 있습니다.",
      ], index, phraseSeed);
    const caution = isRisk
      ? monthlyPhrase([
        "무리한 지출, 감정적 결론, 급한 일정 변경을 줄여야 합니다.",
        "속도를 낮추고 사람과 돈의 경계를 분명히 해야 손실을 줄일 수 있습니다.",
        "조급함이 판단을 흐릴 수 있으니 중요한 결정 사이에 여백을 두세요.",
      ], index, phraseSeed)
      : monthlyPhrase([
        "좋은 흐름이 있어도 조건 확인과 일정 관리는 끝까지 필요합니다.",
        "확장과 관리의 균형을 잃지 않는 것이 이번 달의 안전장치입니다.",
        "성과가 보일수록 기록, 약속, 책임 범위를 명확히 남기세요.",
      ], index, phraseSeed);
    const relationship = isCombo
      ? "합의 기운이 있어 기회가 생길 수 있으나 관계와 조건을 확인해야 하는 달입니다."
      : isVolatile
        ? "충·형·파·해 계열 신호는 과장된 불안보다 변동성 관리로 받아들이는 편이 좋습니다."
        : "관계는 급히 넓히기보다 말의 온도와 약속의 지속성을 살피는 쪽이 안정적입니다.";

    const section = {
      month,
      title: `${month}월 ${monthGanji || "월운"} 운세`,
      summary: `${annualLabel}의 ${annualTenGod} 흐름 위에 ${keyword}가 겹치는 달입니다. ${isOpportunity ? "실행과 제안에 힘을 실을 수 있습니다." : isRisk ? "속도 조절과 정비가 우선입니다." : "균형 있게 운영하면 안정감이 커집니다."}`,
      opportunity,
      caution,
      relationship,
      money: isOpportunity
        ? "수입 가능성은 열리지만 계약 조건, 수수료, 지출 계획을 함께 확인해야 합니다."
        : isRisk
          ? "큰 지출보다 고정비와 미뤄 둔 비용을 점검하는 데 적합합니다."
          : "소비는 계획 안에서 움직이고 작은 수익 구조를 점검하기 좋습니다.",
      career: isOpportunity
        ? "일과 커리어에서는 발표, 제안, 협상, 지원처럼 바깥으로 보이는 행동이 유리합니다."
        : isRisk
          ? "업무에서는 검토, 수정, 일정 재배치가 필요하며 무리한 확장은 피하는 편이 좋습니다."
          : "기존 업무의 완성도를 높이고 작업 조건을 다듬으면 다음 기회가 선명해집니다.",
      health: isRisk
        ? "수면, 소화, 긴장 누적을 가볍게 보지 말고 회복 일정을 먼저 확보하세요."
        : "몸의 리듬은 무난하지만 과열을 막기 위해 휴식 시간을 일정 안에 넣는 편이 좋습니다.",
      action: isOpportunity
        ? "이번 달 실천은 핵심 목표 하나를 정하고 실제 일정에 올리는 것입니다."
        : isRisk
          ? "이번 달 실천은 중요한 결정을 늦추고 점검표를 먼저 채우는 것입니다."
          : "이번 달 실천은 진행 중인 일을 하나 마감하고 다음 달 준비를 시작하는 것입니다.",
      luckyRoutine: monthlyPhrase([
        "월초 목표 1개와 금지 행동 1개를 적고 매주 같은 요일에 점검하세요.",
        "아침에는 일정 우선순위를, 저녁에는 지출과 감정 소모를 짧게 기록하세요.",
        "중요한 대화 전에는 원하는 결론과 양보 가능한 범위를 먼저 적어 두세요.",
        "하루 20분 정리 시간을 고정해 생각, 돈, 관계의 흐름을 가볍게 비우세요.",
      ], index, phraseSeed),
    };
    for (const key of ["title", "summary", "opportunity", "caution", "relationship", "money", "career", "health", "action", "luckyRoutine"]) {
      section[key] = softenAnnualFortuneRiskText(section[key], seed?.targetYear);
    }
    return section;
  });
}

function buildChapterMinimumLines(seed = {}, chapter = {}, sectionTitle = "") {
  const annual = seed.saju?.annualLuck || {};
  const opportunityMonths = topYearlyMonths(seed, "opportunity", 3);
  const riskMonths = topYearlyMonths(seed, "risk", 3);
  const chapterTitle = clean(chapter.title || "");
  const tenGod = clean(annual.tenGod || "세운");
  const annualLabel = clean(annual.label || "올해 세운");
  const relation = clean(annual.dayMasterRelation || "중립");
  const opportunityText = monthListText(opportunityMonths) || "흐름이 열리는 달";
  const riskText = monthListText(riskMonths) || "속도 조절이 필요한 달";

  if (sectionTitle === "핵심 요약 카드") {
    return [
      `핵심 요약 1. ${chapterTitle}의 중심은 ${annualLabel} 세운과 ${tenGod} 흐름이 만드는 선택 기준입니다.`,
      `핵심 요약 2. 일간과 세운의 관계는 ${relation}로 작동하므로, 올해의 판단은 감정적 속도보다 흐름의 쓰임을 먼저 보아야 합니다.`,
      `핵심 요약 3. 기회 달은 ${opportunityText}이며, 이 시기에는 준비해 둔 일을 실제 행동으로 옮기는 것이 좋습니다.`,
    ];
  }
  if (sectionTitle === "계산 근거 기반 해석") {
    return [
      `계산 근거 1. 세운 간지는 ${annualLabel}이고 일간 기준 십성은 ${tenGod}입니다.`,
      `계산 근거 2. 월별 강약은 12개월 월운 점수와 퀀텀 보정의 최종 판단을 함께 반영했습니다.`,
      `계산 근거 3. 조심할 달은 ${riskText} 중심으로 보며, 무리한 확장보다 점검과 정비에 적합합니다.`,
    ];
  }
  if (sectionTitle === "주의할 점") {
    return [
      `주의 1. ${riskText}에는 큰 지출, 감정적 결론, 무리한 일정 확장을 줄이는 편이 안전합니다.`,
      "주의 2. 좋은 흐름이 들어와도 계약, 약속, 책임 범위를 확인하지 않으면 운의 이익이 흩어질 수 있습니다.",
      "주의 3. 같은 문젯거리가 반복되면 운이 나쁜 것이 아니라 조정해야 할 패턴이 드러난 것으로 보아야 합니다.",
    ];
  }
  if (sectionTitle === "실천 조언") {
    return [
      `실천 조언 1. ${opportunityText}에는 제안, 발표, 협상, 실행 일정을 우선 배치하세요.`,
      `실천 조언 2. ${riskText}에는 검토, 회복, 관계 조율, 비용 점검을 먼저 배치하세요.`,
      "실천 조언 3. 매월 초에는 이번 달의 한 가지 목표와 한 가지 금지 행동을 함께 적어 두세요.",
    ];
  }
  if (sectionTitle === "체크리스트") {
    return [
      "체크리스트 1. 이번 챕터에서 바로 실행할 행동 1가지를 정했는가.",
      "체크리스트 2. 기회 달과 주의 달을 실제 달력에 표시했는가.",
      "체크리스트 3. 사람, 돈, 건강, 일 중 가장 먼저 조정할 영역을 골랐는가.",
    ];
  }
  if (sectionTitle === "챕터 마무리 문장") {
    return [
      `마무리. ${chapterTitle}은 단정적인 예언보다 올해의 흐름을 현실 선택으로 바꾸기 위한 기준입니다.`,
      "마무리. 좋은 달에는 행동하고, 낮은 달에는 정비하며, 매달 같은 기준으로 자신을 점검할 때 한 해의 운은 더 안정적으로 열립니다.",
    ];
  }
  return [];
}

function enforceYearlySajuChapterMinimums(chapter = {}, seed = {}) {
  const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
  const nextSections = sections.map((section) => {
    const additions = buildChapterMinimumLines(seed, chapter, clean(section.title));
    if (!additions.length) return section;
    const existing = stripForbiddenText(section.body || section.finalText || section.text || "");
    const missing = assembleYearlyLocalLines(additions, seed, `minimum:${chapter.no}:${section.title}`).filter((line) => !existing.includes(line));
    if (!missing.length) return { ...section, body: existing };
    return { ...section, body: softenAnnualFortuneRiskText(`${existing}\n\n${missing.join("\n")}`, seed?.targetYear) };
  });
  const categories = nextSections.map((section) => ({
    title: section.title,
    localSummary: section.body,
    finalText: section.body,
  }));
  return {
    ...chapter,
    sections: nextSections,
    categories,
    text: nextSections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
  };
}

function blocksForChapter(chapterNo, interpretationBlocks = {}) {
  const byTag = interpretationBlocks.byTag || {};
  const all = Array.isArray(interpretationBlocks.all) ? interpretationBlocks.all : [];
  const pick = (...tags) => uniqueInterpretationBlocks(tags.flatMap((tag) => byTag[tag] || []));
  if (chapterNo === 1) return uniqueInterpretationBlocks([...(byTag.annual || []), ...(byTag["five-elements"] || []), ...(byTag["useful-god"] || [])]).slice(0, 4);
  if (chapterNo === 2) return uniqueInterpretationBlocks([...(byTag.annual || []), ...(byTag["ten-god"] || []), ...(byTag.stem || []), ...(byTag.branch || [])]).slice(0, 4);
  if (chapterNo === 3) return pick("daewoon", "annual", "opportunity", "risk").slice(0, 4);
  if (chapterNo === 4) return pick("career", "work", "opportunity", "risk").slice(0, 3);
  if (chapterNo === 5) return pick("money", "spending", "opportunity", "risk").slice(0, 3);
  if (chapterNo === 6) return pick("relationship", "love", "relation", "combination", "clash").slice(0, 4);
  if (chapterNo === 7) return pick("health", "rhythm", "risk").slice(0, 3);
  if (chapterNo === 8) return pick("risk", "opportunity", "clash", "harm", "break", "punishment", "monthly").slice(0, 4);
  if (chapterNo === 9) return pick("monthly", "routine", "action", "opportunity", "risk").slice(0, 4);
  if (chapterNo === 10) return uniqueInterpretationBlocks([...(byTag.action || []), ...(byTag.routine || []), ...all]).slice(0, 4);
  return all.slice(0, 2);
}

function enrichChapterWithInterpretationBlocks(chapter = {}, interpretationBlocks = {}, seed = {}) {
  const selected = blocksForChapter(Number(chapter.no || 0), interpretationBlocks);
  if (!selected.length) return chapter;
  const sections = Array.isArray(chapter.sections) ? chapter.sections.slice() : [];
  if (!sections.length) return chapter;
  const nextSections = sections.map((section, index) => {
    const block = selected[index % selected.length];
    const addition = formatInterpretationBlockForChapter(block, seed);
    if (!addition) return section;
    const body = softenAnnualFortuneRiskText(`${section.body || section.finalText || section.text || ""}\n\n${addition}`, seed?.targetYear);
    return { ...section, body };
  });
  const categories = nextSections.map((section) => ({
    title: section.title,
    localSummary: section.body,
    finalText: section.body,
  }));
  return {
    ...chapter,
    sections: nextSections,
    categories,
    text: nextSections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
    interpretationBlockIds: selected.map((block) => block.id),
  };
}

function composeYearlySajuChapters(normalized = {}) {
  const seed = normalized.seed || {};
  const expectedChapters = Array.isArray(normalized.expectedChapters) && normalized.expectedChapters.length
    ? normalized.expectedChapters
    : buildSajuNewYearChapterSpecs(seed.targetYear || resolveDefaultTargetYear());
  const localChapters = buildLocalSkeleton(seed);
  const plans = Array.isArray(seed.annualFortuneChapterPlans) ? seed.annualFortuneChapterPlans : [];
  const stats = {
    promptVersion: ANNUAL_FORTUNE_PROMPT_VERSION,
    engineVersion: ANNUAL_FORTUNE_ENGINE_VERSION,
    generationMode: YEARLY_SAJU_PDF_CONFIG.generationMode,
    provider: YEARLY_SAJU_PDF_CONFIG.provider,
    llmEnabled: false,
    quarterlyLlmEnabled: false,
    llmAttempted: 0,
    llmSucceeded: 0,
    llmCached: 0,
    persistentCacheHits: 0,
    persistentCacheWrites: 0,
    llmSkipped: expectedChapters.length,
    localFallback: 0,
    fallbackSections: 0,
    cacheKeys: [],
    enhancedChapterIds: [],
    skippedChapterIds: expectedChapters.map((chapterSpec) => getAnnualFortuneChapterId(chapterSpec)),
    localChapterCount: expectedChapters.length,
  };

  let chapters = expectedChapters.map((chapterSpec, index) => {
    const chapterPlan = plans.find((plan) => clean(plan?.chapterId) === getAnnualFortuneChapterId(chapterSpec)) || plans[index] || {};
    const localChapter = localChapters[index] || buildDeterministicChapterFromSpec(seed, chapterSpec, "yearly_saju_pipeline_local");
    const sanitized = sanitizeAnnualFortuneChapter({
      seed,
      chapterSpec,
      chapter: localChapter,
      chapterPlan,
      source: NEW_YEAR_MANUSCRIPT_SOURCE.LOCAL,
    });
    stats.fallbackSections += sanitized.fallbackSections;
    return enforceYearlySajuChapterMinimums(enrichChapterWithInterpretationBlocks(sanitized.chapter, normalized.interpretationBlocks, seed), seed);
  });

  let fallbackUsed = false;
  let llmFallbackReason = "";
  let validation = validateSajuNewYearPdfQuality({
    chapters,
    expectedChapters,
    minChapterLength: Math.max(MIN_CHAPTER_CHARS, 4000),
    minSectionLength: desiredSectionLength(),
  });

  if (!validation.ok) {
    const beforeRepair = validation.errors.slice(0, 20);
    chapters = repairSajuNewYearChapters({
      seed,
      chapters,
      expectedChapters,
      errors: validation.errors,
    }).map((chapter) => enforceYearlySajuChapterMinimums(enrichChapterWithInterpretationBlocks(chapter, normalized.interpretationBlocks, seed), seed));
    fallbackUsed = true;
    llmFallbackReason = `local_quality_repaired:${beforeRepair.join(",")}`;
    validation = validateSajuNewYearPdfQuality({
      chapters,
      expectedChapters,
      minChapterLength: Math.max(MIN_CHAPTER_CHARS, 4000),
      minSectionLength: desiredSectionLength(),
    });
  }

  return {
    chapters,
    expectedChapters,
    validation,
    manuscriptSource: NEW_YEAR_MANUSCRIPT_SOURCE.LOCAL,
    fallbackUsed,
    llmFallbackReason,
    hybridStats: stats,
    monthlyTable: composeMonthlyFortuneTable(normalized),
  };
}

function renderYearlySajuHtml(chapters, normalized = {}) {
  return buildReportHtml(normalized.seed || {}, chapters);
}

function renderYearlySajuPdf({ normalized = {}, chapters = [], metadata = {} } = {}) {
  const pdfReady = buildPdfReadyPayload(normalized.seed || {}, chapters, metadata);
  pdfReady.html = renderYearlySajuHtml(chapters, normalized);
  return pdfReady;
}

function generateYearlySajuPdf(profile, targetYear, options = {}) {
  const normalized = normalizeYearlySajuInput({
    profile,
    targetYear,
    body: options.body || {},
    natalCalculation: options.natalCalculation || null,
  });
  const chapterResult = composeYearlySajuChapters(normalized);
  if (!chapterResult.validation.ok) {
    throw Object.assign(new Error(`SAJU_NEW_YEAR_FINAL_VALIDATION_FAILED:${chapterResult.validation.errors.slice(0, 20).join(",")}`), {
      code: "SAJU_NEW_YEAR_FINAL_VALIDATION_FAILED",
      status: 422,
    });
  }

  const pdfReady = renderYearlySajuPdf({
    normalized,
    chapters: chapterResult.chapters,
    metadata: {
      ...(options.metadata || {}),
      fallbackUsed: chapterResult.fallbackUsed,
      llmFallbackReason: chapterResult.llmFallbackReason,
      manuscriptSource: chapterResult.manuscriptSource,
      localDraftChapterCount: chapterResult.chapters.length,
      writingPipeline: YEARLY_SAJU_PDF_CONFIG.templateVersion,
      promptVersion: ANNUAL_FORTUNE_PROMPT_VERSION,
      engineVersion: ANNUAL_FORTUNE_ENGINE_VERSION,
      generationMode: YEARLY_SAJU_PDF_CONFIG.generationMode,
      provider: YEARLY_SAJU_PDF_CONFIG.provider,
      hybridStats: chapterResult.hybridStats,
      masterJsonValidation: normalized.masterJsonValidation,
      normalizedData: normalized.normalizedData,
      monthlyFortuneSections: normalized.monthlyFortuneSections,
      interpretationBlockIds: (normalized.interpretationBlocks?.all || []).map((block) => block.id),
    },
  });

  return {
    ...chapterResult,
    normalized,
    seed: normalized.seed,
    localYearSajuJson: normalized.seed,
    masterJson: normalized.masterJson,
    newYearMasterJson: normalized.masterJson,
    masterJsonValidation: normalized.masterJsonValidation,
    normalizedData: normalized.normalizedData,
    interpretationBlocks: normalized.interpretationBlocks,
    monthlyFortuneSections: normalized.monthlyFortuneSections,
    pdfReady,
  };
}

function buildNewYearArchiveUrl(origin, reportId) {
  const base = clean(origin).replace(/\/+$/, "");
  if (!base) return "";
  return `${base}/api/premium/pdf-archive/${encodeURIComponent(reportId)}`;
}

function buildNewYearArchiveUrls(origin, reportId) {
  const archiveUrl = buildNewYearArchiveUrl(origin, reportId);
  return {
    archiveUrl,
    htmlUrl: archiveUrl ? `${archiveUrl}?format=html` : "",
    pdfUrl: archiveUrl ? `${archiveUrl}?format=pdf` : "",
  };
}

async function findNewYearReusableExecution(env, userId, executionCtx = {}, fallback = {}) {
  try {
    await connectDb(withPdfFastDbEnv(env));
    const filters = [];
    const executionKey = clean(executionCtx.executionKey);
    const sessionId = clean(executionCtx.sessionId || fallback.sessionId);
    const reportId = clean(executionCtx.reportId || fallback.reportId);
    const paymentSessionId = clean(executionCtx.paymentSessionId);
    if (executionKey) filters.push({ executionKey });
    if (sessionId) filters.push({ sessionId });
    if (reportId) filters.push({ reportId });
    if (paymentSessionId) filters.push({ paymentSessionId });
    if (!filters.length) return null;
    return await ServiceExecutionTransaction.findOne({
      userId,
      reportType: "sajuNewYear",
      $or: filters,
    }).sort({ completedAt: -1, updatedAt: -1, createdAt: -1 }).lean();
  } catch (error) {
    console.warn("[new-year][reusable-execution-lookup-failed]", clean(error?.message || error));
    return null;
  }
}

function buildNewYearReusableExecutionResponse(doc = {}, fallback = {}) {
  const metadata = doc?.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
  const archive = metadata?.archive && typeof metadata.archive === "object" ? metadata.archive : {};
  const payload = archive?.payload && typeof archive.payload === "object" ? archive.payload : {};
  const pdfReady = archive.pdfReady || metadata.pdfReady || payload.pdfReady || null;
  if (pdfReady?.html && /\b(?:undefined|null|NaN)\b|\[object Object\]|준비중|생성 실패|스켈레톤/i.test(String(pdfReady.html || ""))) {
    return null;
  }
  const storedUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || archive.downloadUrl || archive.pdfUrl || payload.downloadUrl || payload.pdfUrl);
  const reportId = clean(doc.reportId || archive.reportId || metadata.reportId || fallback.reportId);
  const sessionId = clean(doc.sessionId || metadata.sessionId || fallback.sessionId);
  const targetYear = Number(archive.targetYear || metadata.targetYear || payload.targetYear || fallback.targetYear || 0) || null;
  const cacheKey = clean(metadata.cacheKey || archive.cacheKey || payload.cacheKey || fallback.cacheKey);
  const isCompleted = clean(doc.status) === "success" && clean(doc.premiumStatus) === "completed";
  const isFailed = clean(doc.status) === "failed" || clean(doc.premiumStatus) === "failed";

  if (isCompleted && storedUrl) {
    const chapters = Array.isArray(archive.chapters) ? archive.chapters : [];
    const data = {
      reportId,
      featureKey: clean(doc.featureKey || metadata.featureKey || fallback.featureKey),
      sessionId,
      reportType: "sajuNewYear",
      serviceKey: SERVICE_KEY,
      targetYear,
      chapterCount: Number(archive.chapterCount || payload.chapterCount || chapters.length),
      chapters,
      localSajuJson: archive.localSajuJson || metadata.localSajuJson || null,
      newYearMasterJson: archive.newYearMasterJson || metadata.newYearMasterJson || null,
      masterJsonValidation: archive.masterJsonValidation || metadata.masterJsonValidation || null,
      normalizedData: archive.normalizedData || metadata.normalizedData || null,
      monthlyFortuneSections: archive.monthlyFortuneSections || metadata.monthlyFortuneSections || null,
      hybridStats: archive.hybridStats || metadata.hybridStats || null,
      pdfReady,
      pdfUrl: storedUrl,
      htmlUrl: clean(pdfReady?.htmlUrl || archive.htmlUrl || payload.htmlUrl),
      downloadUrl: storedUrl,
      canReopen: true,
      canDownload: true,
      fromCache: true,
      cacheKey,
      cacheHit: true,
    };
    return {
      status: 200,
      payload: {
        ok: true,
        serviceKey: SERVICE_KEY,
        reportType: "sajuNewYear",
        status: "completed",
        serverStatus: "completed",
        qualityStatus: "passed",
        data,
        ...data,
      },
    };
  }

  if (isFailed) {
    return {
      status: 409,
      payload: {
        ok: false,
        serviceKey: SERVICE_KEY,
        code: "SAJU_NEW_YEAR_PREVIOUS_GENERATION_FAILED",
        message: "이전 신년운세 PDF 생성이 실패했습니다. 새 생성 요청으로 다시 시도해 주세요.",
        debugSafe: { reportId, sessionId, previousStatus: clean(doc.status), previousPremiumStatus: clean(doc.premiumStatus) },
      },
    };
  }

  if (clean(doc.status) === "pending" || clean(doc.premiumStatus) === "generating") {
    return {
      status: 202,
      payload: {
        ok: true,
        serviceKey: SERVICE_KEY,
        status: "running",
        serverStatus: "running",
        reportId,
        sessionId,
        targetYear,
        message: "동일 세션의 신년운세 PDF 생성이 이미 진행 중입니다.",
      },
    };
  }

  return null;
}

async function acquireNewYearExecutionLease(env, userId, executionCtx = {}) {
  const executionKey = clean(executionCtx.executionKey);
  if (!executionKey) return { ok: true };
  try {
    await connectDb(withPdfFastDbEnv(env));
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + Math.max(NEW_YEAR_PDF_LOCK_TTL_MS, Number(executionCtx.timeoutSeconds || 1800) * 1000));
    const token = `${executionKey}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    const doc = await ServiceExecutionTransaction.findOneAndUpdate(
      {
        userId,
        executionKey,
        status: "pending",
        $or: [
          { "lock.until": { $lte: now } },
          { "lock.until": null },
          { "lock.until": { $exists: false } },
          { "lock.token": "" },
        ],
      },
      {
        $set: {
          "lock.token": token,
          "lock.until": leaseUntil,
          "lock.acquiredAt": now,
          heartbeatAt: now,
        },
      },
      { returnDocument: "after" },
    ).lean();
    return { ok: Boolean(doc), doc, token };
  } catch (error) {
    console.warn("[new-year][execution-lease-acquire-failed]", clean(error?.message || error));
    return { ok: false, error };
  }
}

async function handlePrepare(request, env) {
  compactNewYearLocks();
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({ ok: false, serviceKey: SERVICE_KEY, code: "UNAUTHORIZED", message: "신년운세 PDF 생성을 위해 먼저 로그인해 주세요." }, { status: 401 });
    }
    throw error;
  }

  const body = await readJson(request);
  console.info("[NewYearPremiumPDF][RequestReceived]", { hasBody: Boolean(body) });
  const normalized = normalizeInput(body);
  if (!normalized.ok) return json({ ok: false, serviceKey: SERVICE_KEY, code: normalized.code, message: normalized.message }, { status: 422 });
  console.info("[NewYearPremiumPDF][TargetYearValidated]", { targetYear: normalized.targetYear });
  console.info("[NewYearPremiumPDF][BirthInputValidated]", { birthDate: normalized.birthInput.birthDate, isTimeUnknown: normalized.birthInput.isTimeUnknown });

  const featureKey = normalizeFeatureKey(body?.featureKey);
  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `saju-new-year-${normalized.targetYear}-${Date.now().toString(36)}`);
  const sessionKey = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || body?.sessionKey) || `saju-new-year:${reportId}`;
  const reusableExecutionCtx = buildPremiumExecutionContext({
    serviceKey: SERVICE_KEY,
    reportType: "sajuNewYear",
    userId: auth.userId,
    featureKey,
    sessionId: sessionKey,
    reportId,
    access: null,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  const reusableExecution = await findNewYearReusableExecution(env, auth.userId, reusableExecutionCtx, {
    sessionId: sessionKey,
    reportId,
    featureKey,
    targetYear: normalized.targetYear,
  });
  const reusableResponse = reusableExecution ? buildNewYearReusableExecutionResponse(reusableExecution, {
    sessionId: sessionKey,
    reportId,
    featureKey,
    targetYear: normalized.targetYear,
  }) : null;
  if (reusableResponse) return json(reusableResponse.payload, { status: reusableResponse.status });

  const lock = newYearPdfLocks.get(sessionKey);
  if (lock?.status === "running") {
    return json({
      ok: true,
      serviceKey: SERVICE_KEY,
      status: "running",
      sessionId: sessionKey,
      reportId,
      targetYear: normalized.targetYear,
      message: "동일 세션의 신년운세 PDF 생성이 이미 진행 중입니다.",
    }, { status: 202 });
  }
  if (lock?.status === "done" && lock?.result) {
    return json({
      ...lock.result,
      status: lock.result?.status || "completed",
      serverStatus: lock.result?.serverStatus || "completed",
      sessionId: sessionKey,
      fromCache: true,
    });
  }
  newYearPdfLocks.set(sessionKey, { status: "running", startedAtMs: Date.now() });
  let activeExecutionCtx = null;

  try {
    const premiumAccessToken = clean(request.headers.get("x-premium-access-token") || body?.premiumAccessToken || body?._premiumAccessToken || cookieValue(request, "cd_premium_access"));

    console.info("[NewYearPremiumPDF][PaymentVerificationStarted]", { featureKey, userId: auth.userId });
    const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "sajuNewYear", {
      ...body,
      featureKey,
      reportType: "sajuNewYear",
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: "/api/saju-new-year/prepare",
    });
    if (!access?.ok) {
      const status = Number(access?.status || 402);
      const hasSessionId = Boolean(clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId));
      const hasPurchaseId = Boolean(clean(body?.purchaseId || body?.accessGrant?.purchaseId || body?.payment?.purchaseId));
      const hasRequestId = Boolean(clean(body?.requestId || body?.accessGrant?.requestId || body?.payment?.requestId || body?._paymentContext?.requestId));
      const hasPaymentToken = Boolean(premiumAccessToken);
      const paymentConfirmedButMissing = status === 402 && (hasSessionId || hasPurchaseId || hasRequestId || hasPaymentToken);
      newYearPdfLocks.delete(sessionKey);
      return json({
        ok: false,
        serviceKey: SERVICE_KEY,
        code: paymentConfirmedButMissing ? "PAYMENT_CONFIRMED_BUT_ACCESS_MISSING" : (access?.code || (status === 401 ? "UNAUTHORIZED" : "PAYMENT_REQUIRED")),
        message: status === 401
          ? "신년운세 PDF 생성을 위해 먼저 로그인해 주세요."
          : paymentConfirmedButMissing
            ? "결제는 확인되었지만 생성 권한 연결이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요."
            : status === 402
            ? "프리미엄 PDF 생성을 위해 코인 또는 이용권 확인이 필요합니다."
            : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        debugSafe: {
          featureKey,
          hasSessionId,
          hasPurchaseId,
          hasRequestId,
          hasPaymentToken,
        },
      }, { status });
    }
    console.info("[NewYearPremiumPDF][PaymentVerificationPassed]", { featureKey, accessType: clean(access.accessType || "") });

    const cacheNormalized = normalizeYearlySajuInput({
      profile: normalized.profile,
      targetYear: normalized.targetYear,
      body,
    });
    const yearlySajuPdfCacheKey = buildYearlySajuPdfCacheKey(cacheNormalized);
    const baseExecutionCtx = buildPremiumExecutionContext({
      serviceKey: SERVICE_KEY,
      reportType: "sajuNewYear",
      userId: auth.userId,
      featureKey,
      sessionId: sessionKey,
      reportId,
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    const executionCtx = buildYearlySajuPdfCacheExecutionContext(baseExecutionCtx, yearlySajuPdfCacheKey);
    activeExecutionCtx = executionCtx;
    const cachedPdfExecution = await findNewYearReusableExecution(env, auth.userId, executionCtx, {
      sessionId: sessionKey,
      reportId,
      featureKey,
      targetYear: normalized.targetYear,
      cacheKey: yearlySajuPdfCacheKey,
    });
    const cachedPdfResponse = cachedPdfExecution ? buildNewYearReusableExecutionResponse(cachedPdfExecution, {
      sessionId: sessionKey,
      reportId,
      featureKey,
      targetYear: normalized.targetYear,
      cacheKey: yearlySajuPdfCacheKey,
    }) : null;
    if (cachedPdfResponse) {
      newYearPdfLocks.delete(sessionKey);
      return json(cachedPdfResponse.payload, { status: cachedPdfResponse.status });
    }
    await startPremiumPdfExecution(env, auth.userId, executionCtx);
    const executionLease = await acquireNewYearExecutionLease(env, auth.userId, executionCtx);
    if (!executionLease.ok && !executionLease.error) {
      newYearPdfLocks.delete(sessionKey);
      return json({
        ok: true,
        serviceKey: SERVICE_KEY,
        status: "running",
        serverStatus: "running",
        sessionId: sessionKey,
        reportId,
        targetYear: normalized.targetYear,
        message: "동일 세션의 신년운세 PDF 생성이 이미 진행 중입니다.",
      }, { status: 202 });
    }

    const yearlySajuPdfConfig = getYearlySajuPdfConfig(env);

    console.info("[NewYearPremiumPDF][YearlySajuLocalPipelineStarted]", {
      targetYear: normalized.targetYear,
      sessionId: sessionKey,
      generationMode: yearlySajuPdfConfig.generationMode,
      provider: yearlySajuPdfConfig.provider,
      llmEnabled: annualFortuneLlmEnabled(env),
    });
    const pipelineResult = generateYearlySajuPdf(normalized.profile, normalized.targetYear, {
      body,
      natalCalculation: cacheNormalized.seed,
      metadata: {
        featureKey,
        reportType: "sajuNewYear",
        sessionId: sessionKey,
        accessType: clean(access.accessType || "unknown"),
        cacheKey: yearlySajuPdfCacheKey,
      },
    });
    const localYearSajuJson = pipelineResult.localYearSajuJson;
    const newYearMasterJson = pipelineResult.newYearMasterJson;
    const masterJsonValidation = pipelineResult.masterJsonValidation;
    const normalizedData = pipelineResult.normalizedData;
    const chapters = pipelineResult.chapters;
    const validation = pipelineResult.validation;
    const manuscriptSource = pipelineResult.manuscriptSource;
    const fallbackUsed = pipelineResult.fallbackUsed;
    const llmFallbackReason = pipelineResult.llmFallbackReason;
    const hybridStats = pipelineResult.hybridStats;
    const monthlyFortuneSections = pipelineResult.monthlyFortuneSections;
    const pdfReady = pipelineResult.pdfReady;
    const finalTotalChars = chapters.reduce((acc, chapter) => acc + chapterTextLength(chapter), 0);
    console.info("[NewYearPremiumPDF][YearlySajuLocalPipelineCompleted]", {
      chapterCount: chapters.length,
      targetYear: localYearSajuJson.targetYear,
      totalChars: finalTotalChars,
      manuscriptSource,
      fallbackUsed,
      hybridStats,
      validationOk: validation.ok,
    });
    console.info("[NewYearPremiumPDF][FinalValidationPassed]", { chapterCount: chapters.length, manuscriptSource });
    const requestOrigin = new URL(request.url).origin;
    const archiveUrls = buildNewYearArchiveUrls(requestOrigin, reportId);
    const archiveUrl = archiveUrls.archiveUrl;

    console.info("[NewYearPremiumPDF][PDFRenderStarted]", { chapterCount: chapters.length });
    pdfReady.htmlUrl = archiveUrls.htmlUrl || archiveUrl;
    pdfReady.pdfUrl = archiveUrls.pdfUrl || archiveUrl;
    pdfReady.downloadUrl = archiveUrls.pdfUrl || archiveUrl;
    pdfReady.storageKey = `premium-archive:saju-new-year:${reportId}`;
    pdfReady.mimeType = "application/pdf";
    pdfReady.contentType = "application/pdf";
    pdfReady.renderFormat = "pdf-archive";
    console.info("[NewYearPremiumPDF][PDFRenderCompleted]", { chapterCount: chapters.length, manuscriptSource, archiveUrl });

    const storedUrl = clean(
      pdfReady.downloadUrl
      || pdfReady.pdfUrl
      || pdfReady.htmlUrl,
    );
    if (!storedUrl) {
      throw Object.assign(new Error("신년운세 PDF 저장 URL 생성에 실패했습니다."), {
        code: "NEW_YEAR_PDF_URL_MISSING",
        status: 500,
      });
    }

    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      manuscriptSource,
      chapterCount: chapters.length,
      targetYear: localYearSajuJson.targetYear,
      archive: {
        reportId,
        cacheKey: yearlySajuPdfCacheKey,
        reportType: "new_year",
        displayName: "사주 신년운세",
        title: `${clean(normalized?.profile?.name) || "사용자"}님의 ${String(localYearSajuJson.targetYear || "")}년 신년운세`,
        mode: "personal",
        birthName: clean(normalized?.profile?.name),
        summary: clean(chapters?.[0]?.categories?.[0]?.finalText || chapters?.[0]?.text || "", 1000),
        pdfUrl: storedUrl,
        htmlUrl: clean(pdfReady.htmlUrl),
        downloadUrl: clean(pdfReady.downloadUrl || storedUrl),
        chapters,
        localSajuJson: localYearSajuJson,
        normalizedData,
        monthlyFortuneSections,
        newYearMasterJson,
        masterJsonValidation,
        hybridStats,
        pdfReady,
        canReopen: true,
        canDownload: true,
      },
      cacheKey: yearlySajuPdfCacheKey,
    });

    const responseData = {
      reportId,
      featureKey,
      sessionId: sessionKey,
      reportType: "sajuNewYear",
      serviceKey: SERVICE_KEY,
      targetYear: localYearSajuJson.targetYear,
      chapterCount: chapters.length,
      localDraftChapterCount: chapters.length,
      finalChapterCount: chapters.length,
      manuscriptSource,
      localEngineUsed: true,
      writingPipeline: YEARLY_SAJU_PDF_CONFIG.templateVersion,
      promptVersion: ANNUAL_FORTUNE_PROMPT_VERSION,
      engineVersion: ANNUAL_FORTUNE_ENGINE_VERSION,
      generationMode: YEARLY_SAJU_PDF_CONFIG.generationMode,
      provider: YEARLY_SAJU_PDF_CONFIG.provider,
      cacheKey: yearlySajuPdfCacheKey,
      cacheHit: false,
      fallbackUsed,
      llmFallbackReason,
      hybridStats,
      chapters,
      seed: { ...localYearSajuJson, chapters: undefined },
      newYearPayload: localYearSajuJson,
      localSajuJson: localYearSajuJson,
      normalizedData,
      monthlyFortuneSections,
      newYearMasterJson,
      masterJsonValidation,
      pdfReady,
      pdfUrl: storedUrl,
      htmlUrl: clean(pdfReady.htmlUrl),
      downloadUrl: clean(pdfReady.downloadUrl || storedUrl),
      canReopen: true,
      canDownload: true,
    };

    const responsePayload = {
      ok: true,
      serviceKey: SERVICE_KEY,
      reportType: "sajuNewYear",
      status: "completed",
      serverStatus: "completed",
      qualityStatus: validation.ok ? "passed" : "completed_with_warnings",
      data: responseData,
      ...responseData,
    };

    newYearPdfLocks.set(sessionKey, { status: "done", startedAtMs: Date.now(), result: responsePayload });
    return json(responsePayload);
  } catch (error) {
    const executionCtx = activeExecutionCtx || buildPremiumExecutionContext({
      serviceKey: SERVICE_KEY,
      reportType: "sajuNewYear",
      userId: auth.userId,
      featureKey,
      sessionId: sessionKey,
      reportId,
      access: null,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    try {
      await failPremiumPdfExecution(
        env,
        auth.userId,
        executionCtx,
        "new_year_generation_failed",
        clean(error?.message || "신년운세 PDF 생성에 실패했습니다."),
        "new-year-generation",
      );
    } catch (_) {}
    newYearPdfLocks.delete(sessionKey);
    const rawMessage = clean(error?.message || "신년운세 PDF 생성 중 오류가 발생했습니다.");
    console.error("[NewYearPremiumPDF][Error][prepare]", normalizeNewYearBookError(error));
    const userMessage = rawMessage.includes("생년월일")
      ? "생년월일 정보를 확인할 수 없습니다. 정확한 생년월일시를 입력해 주세요."
      : rawMessage.includes("원국") || rawMessage.includes("사주")
        ? "신년운세 계산에 필요한 사주 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."
        : rawMessage.includes("결제")
          ? "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
          : rawMessage.includes("원고") || rawMessage.includes("품질")
            ? "신년운세 원고를 완성하지 못했습니다. 잠시 후 다시 시도해 주세요."
            : "신년운세 PDF 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return json({
      ok: false,
      serviceKey: SERVICE_KEY,
      code: error?.code || "SAJU_NEW_YEAR_GENERATION_FAILED",
      message: userMessage,
      debugSafe: {
        reportId,
        sessionId: sessionKey,
        originalCode: error?.code || "",
        stage: clean(error?.stage || "prepare"),
        status: Number(error?.status || 500),
        causeMessage: clean(error?.cause?.message || error?.cause || error?.message || ""),
      },
    }, { status: Number(error?.status || 500) });
  }
}

async function handleChapters() {
  const targetYear = resolveDefaultTargetYear();
  const chapters = buildSajuNewYearChapterSpecs(targetYear);
  return json({ ok: true, serviceKey: SERVICE_KEY, targetYear, chapterCount: chapters.length, chapters });
}

export async function handleSajuNewYearRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/saju-new-year");
    if (method === "GET" && (path === "/chapters" || path === "chapters")) return await handleChapters();
    if (method === "POST" && (path === "" || path === "/" || path === "/prepare" || path === "prepare")) return await handlePrepare(request, env);
    if (!["GET", "POST"].includes(method)) return methodNotAllowed(["GET", "POST"]);
    return json({ ok: false, serviceKey: SERVICE_KEY, message: "지원하지 않는 사주 신년운세 PDF 경로입니다." }, { status: 404 });
  } catch (error) {
    console.error("[NewYearBook][Error]", normalizeNewYearBookError(error));
    return handleRouteError(error, "SajuNewYearRoutes");
  }
}

export const __sajuNewYearTestUtils = {
  NEW_YEAR_CHAPTERS,
  YEARLY_SAJU_PDF_CONFIG,
  getYearlySajuPdfConfig,
  normalizeInput,
  buildPdfSeed,
  buildLocalSkeleton,
  validateChapters,
  buildSajuNewYearChapterSpecs,
  validateSajuNewYearSeed,
  buildNewYearMasterJson,
  validateNewYearMasterJson,
  buildNewYearChapterPrompt,
  buildAnnualFortuneFacts,
  buildAnnualFortuneChapterPlans,
  buildAnnualFortuneLlmCacheKey,
  annualFortuneLlmEnabled,
  shouldEnhanceAnnualFortuneChapter,
  ANNUAL_STEM_BLOCKS,
  ANNUAL_BRANCH_BLOCKS,
  ANNUAL_TEN_GOD_BLOCKS,
  YEARLY_CONTEXT_BLOCKS,
  buildYearlySajuNormalizedData,
  buildYearlySajuPdfCacheKey,
  buildYearlySajuPdfCacheExecutionContext,
  buildNewYearReusableExecutionResponse,
  selectYearlyInterpretationBlocks,
  enrichChapterWithInterpretationBlocks,
  normalizeYearlySajuInput,
  composeMonthlyFortuneTable,
  buildMonthlyFortuneSections,
  buildMonthlyFortuneCardsHtml,
  composeYearlySajuChapters,
  renderYearlySajuHtml,
  renderYearlySajuPdf,
  generateYearlySajuPdf,
  generateAnnualFortuneHybridChapters,
  softenAnnualFortuneRiskText,
  normalizeNewYearGeneratedChapter,
  generateNewYearChapterWithGemini,
  generateNewYearChaptersWithGemini,
  buildNewYearChapterLocalGuide,
  normalizeGeneratedChapter,
  buildDeterministicChapterFromSpec,
  buildHighQualityNewYearSection,
  repairSajuNewYearChapters,
  reinforceChapterFromSpec,
  validateSajuNewYearPdfQuality,
  stripForbiddenText,
  buildPdfReadyPayload,
  buildNewYearArchiveUrls,
};
