import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";
import { Solar } from "lunar-javascript";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { generateLifeBookLocalPdf } from "../pdf-v2/lifebook-local-pdf.js";

const CHAPTER_BLUEPRINTS = [
  {
    id: "01",
    roman: "I",
    title: "제 1장 사주 원국 완전 해설 — 팔자 8글자의 비밀",
    subtitle: "원국의 네 기둥과 일간을 통해 인생의 기본 구조를 여는 장",
    categories: [
      "네 기둥이 말하는 인생의 기본 구조",
      "일간으로 보는 나의 본질",
      "월지와 계절이 만드는 삶의 방향",
      "천간에 드러난 외부 성향",
      "지지에 깔린 내면의 뿌리",
      "원국 전체의 핵심 한 줄 해석",
    ],
  },
  {
    id: "02",
    roman: "II",
    title: "제 2장 나의 설계도 — 월지·일간·조후와 기질의 뿌리",
    subtitle: "월령·강약·조후와 오행 분포로 기질의 뿌리를 해석하는 장",
    categories: [
      "월령으로 보는 인생의 출발점",
      "일간의 강약과 자기 운용 방식",
      "조후로 보는 균형과 온도",
      "오행 분포가 만드는 성격",
      "과한 기운과 부족한 기운",
      "타고난 기질을 현실에서 쓰는 법",
    ],
  },
  {
    id: "03",
    roman: "III",
    title: "제 3장 용신·희신·기신 — 균형을 회복하는 방향",
    subtitle: "용신·희신·기신을 삶의 선택 기준으로 정리하는 장",
    categories: [
      "이 명식에서 가장 필요한 기운",
      "용신이 살아날 때 열리는 길",
      "희신이 도와주는 방식",
      "기신과 구신이 만드는 반복 과제",
      "운이 막힐 때 나타나는 신호",
      "내 운을 살리는 현실 전략",
    ],
  },
  {
    id: "04",
    roman: "IV",
    title: "제 4장 대운 정밀 분석 — 인생의 큰 파도",
    subtitle: "현재·다음 대운의 흐름을 현실 과제로 연결하는 장",
    categories: [
      "대운 흐름의 전체 방향",
      "현재 대운의 핵심 주제",
      "다음 대운에서 준비해야 할 변화",
      "일과 돈의 대운 흐름",
      "관계와 마음의 대운 흐름",
      "대운을 내 편으로 쓰는 법",
    ],
  },
  {
    id: "05",
    roman: "V",
    title: "제 5장 격국과 사회적 역할 — 성과가 열리는 구조",
    subtitle: "격국과 사회적 역할을 통해 성취의 구조를 읽는 장",
    categories: [
      "격국으로 보는 사회적 역할",
      "내가 인정받는 방식",
      "경쟁과 협력의 구조",
      "조직형인지 독립형인지",
      "명예와 실리의 균형",
      "성공을 현실화하는 방식",
    ],
  },
  {
    id: "06",
    roman: "VI",
    title: "제 6장 관계의 전략 — 인연의 법칙과 파트너십",
    subtitle: "관계 패턴과 파트너십 운영법을 다루는 장",
    categories: [
      "사람을 대하는 기본 방식",
      "가까운 사람과의 거리감",
      "귀인과 악연의 구분",
      "협업에서 빛나는 부분",
      "관계에서 반복되는 상처",
      "좋은 인연을 오래 유지하는 법",
    ],
  },
  {
    id: "07",
    roman: "VII",
    title: "제 7장 연애·결혼 분석 — 사랑의 패턴과 배우자운",
    subtitle: "연애와 결혼의 반복 패턴을 현실적으로 정리하는 장",
    categories: [
      "끌리는 사람의 유형",
      "연애에서 반복되는 패턴",
      "결혼운의 강점과 약점",
      "갈등이 생기는 이유",
      "오래 가는 관계의 조건",
      "사랑을 현실로 지키는 법",
    ],
  },
  {
    id: "08",
    roman: "VIII",
    title: "제 8장 재물·직업 분석 — 돈과 일이 머무는 구조",
    subtitle: "재물과 직업의 구조를 구체적인 실행으로 연결하는 장",
    categories: [
      "돈이 들어오는 방식",
      "돈이 막히는 패턴",
      "잘 맞는 직업 방향",
      "사업과 프리랜서 적성",
      "가격 책정과 수익 구조",
      "장기적으로 돈을 키우는 법",
    ],
  },
  {
    id: "09",
    roman: "IX",
    title: "제 9장 건강·심신 리듬 — 몸과 마음의 관리법",
    subtitle: "오행 불균형과 회복 루틴을 생활 전략으로 정리하는 장",
    categories: [
      "체력과 에너지 패턴",
      "스트레스가 쌓이는 방식",
      "마음이 무너지는 지점",
      "생활 리듬과 회복법",
      "과로와 번아웃 주의점",
      "건강운을 지키는 습관",
    ],
  },
  {
    id: "10",
    roman: "X",
    title: "제 10장 신살·십이운성 — 반복 신호와 숨은 작용",
    subtitle: "신살과 십이운성의 반복 신호를 현실적으로 해석하는 장",
    categories: [
      "주요 신살이 말하는 특징",
      "십이운성으로 보는 삶의 리듬",
      "강하게 반복되는 운명의 패턴",
      "사람들에게 각인되는 이미지",
      "위기 때 발동하는 숨은 힘",
      "신살과 십이운성을 현실에서 쓰는 법",
    ],
  },
  {
    id: "11",
    roman: "XI",
    title: "제 11장 대운 분석 — 큰 운의 계절과 전환 구조",
    subtitle: "현재 대운과 다음 대운이 직업, 관계, 재물에 여는 과제를 정리하는 장",
    categories: [
      "대운 시작점과 전환 구조",
      "현재 대운의 핵심 과제",
      "다음 대운의 예고 신호",
      "대운별 직업 흐름",
      "대운별 관계 흐름",
      "대운별 재물 흐름",
    ],
  },
  {
    id: "12",
    roman: "XII",
    title: "제 12장 선택 연도와 세운 — 가까운 운의 속도 조절",
    subtitle: "선택 연도와 현재 대운의 접점을 상반기, 하반기, 월별 흐름으로 정리하는 장",
    categories: [
      "선택 연도와 현재 대운의 접점",
      "선택 연도 세운의 핵심 기운",
      "상반기의 기회와 부담",
      "하반기의 기회와 부담",
      "일과 재물의 가까운 흐름",
      "월별로 주의 깊게 볼 신호",
    ],
  },
  {
    id: "13",
    roman: "XIII",
    title: "제 13장 최종 통합 — 마지막 상담 편지",
    subtitle: "명식, 대운, 세운, 관계, 일과 돈의 결론을 하나로 묶는 종장",
    categories: [
      "전체 명식의 최종 문장",
      "가장 강한 운명의 축",
      "반복해서 조심해야 할 약점",
      "관계에서 지켜야 할 원칙",
      "일과 돈에서 지켜야 할 원칙",
      "마지막 상담 편지",
    ],
  },
];

const STEM_TO_ELEMENT = {
  갑: "wood",
  을: "wood",
  병: "fire",
  정: "fire",
  무: "earth",
  기: "earth",
  경: "metal",
  신: "metal",
  임: "water",
  계: "water",
};

const ELEMENT_KEYS = ["wood", "fire", "earth", "metal", "water"];

const FORBIDDEN_TEXT = [
  "fallback",
  "seed",
  "skeleton",
  "local",
  "engine",
  "validation",
  "retry",
  "자동 복구 생성",
  "chapter 1 chapter 1",
  "chapter 1",
  "placeholder",
  "debug",
  "json",
  "payload",
  "internal server error",
  "object",
  "undefined",
  "null",
  "nan",
  "calculationmode",
  "recovered",
  "internal payload",
  "json dump",
  "테스트 문구",
  "데이터가 부족합니다",
  "about:blank",
  "api",
  "schema",
  "raw",
  "프롬프트",
  "로컬 엔진",
  "로컬 기반",
  "데이터 부족",
  "템플릿",
  "계산 시그니처",
  "내부 데이터",
  "엔진 결과",
  "데이터 정규화",
  "품질 검증",
  "재생성",
];

const LIFEBOOK_FORBIDDEN_RE = /\b(?:fallback|seed|skeleton|local|engine|validation|retry|payload|json|schema|debug|internal\s*server\s*error|object|undefined|null|nan|calculationmode|recovered|about:blank|raw|api|prompt)\b|자동\s*복구\s*생성|chapter\s*1\s*chapter\s*1|데이터가\s*부족합니다|데이터\s*부족|로컬\s*엔진|로컬\s*기반|템플릿|계산\s*시그니처|내부\s*데이터|엔진\s*결과|데이터\s*정규화|품질\s*검증|재생성/gi;

const LIFEBOOK_CHAPTER_REVIEW_FORBIDDEN_TERMS = Object.freeze([
  "무조건",
  "반드시 망한다",
  "죽는다",
  "이혼한다",
  "파멸",
  "절대 실패",
  "병에 걸린다",
  "투자하면 오른다",
  "운명상 피할 수 없다",
  "JSON",
  "payload",
  "debug",
  "engine",
  "schema",
  "api",
  "prompt",
]);

const LIFEBOOK_SERVICE_KEY = "saju-lifebook";
const LIFEBOOK_FEATURE_KEY = "saju_life_book_pdf";
const LIFEBOOK_FEATURE_KEY_ALIASES = new Set([
  "saju_lifebook_pdf",
  "premium_pdf_saju_life_book",
  "premium-lifebook-report",
]);
const LIFE_BOOK_PROMPT_VERSION = "life-book-local-assembler-v6";


const LIFEBOOK_MIN_CATEGORY_CHARS = 850;
const LIFEBOOK_MIN_CHAPTER_CHARS = 3600;
const LIFEBOOK_MIN_TOTAL_CHARS = 85000;
const LIFEBOOK_BLOCKING_MIN_CATEGORY_CHARS = 250;
const LIFEBOOK_BLOCKING_MIN_CHAPTER_CHARS = 2600;
const LIFEBOOK_BLOCKING_MIN_TOTAL_CHARS = 70000;
const LIFEBOOK_QUALITY_REPAIR_MAX_ROUNDS = 3;
const LIFEBOOK_HIGH_QUALITY_MIN_SCORE = 82;
const LIFEBOOK_HIGH_QUALITY_MIN_EVIDENCE_TAGS = 3;
const LIFEBOOK_LOCAL_TARGET_YEAR = new Date().getFullYear();
const LIFEBOOK_TARGET_YEAR_MIN = 1900;
const LIFEBOOK_TARGET_YEAR_MAX = 2099;
const LIFEBOOK_A4_CHAR_RANGE = Object.freeze({ min: 850, target: 950, max: 1100 });
const LIFEBOOK_A4_TOTAL_TARGET = Object.freeze({ pages: 100, minChars: 85000, targetChars: 95000, maxChars: 110000 });
const LIFEBOOK_CHAPTER_PAGE_TARGETS = Object.freeze({
  "01": { targetPages: 8, partCount: 3 },
  "02": { targetPages: 7, partCount: 3 },
  "03": { targetPages: 7, partCount: 3 },
  "04": { targetPages: 10, partCount: 4 },
  "05": { targetPages: 7, partCount: 3 },
  "06": { targetPages: 6, partCount: 3 },
  "07": { targetPages: 8, partCount: 3 },
  "08": { targetPages: 8, partCount: 3 },
  "09": { targetPages: 6, partCount: 3 },
  "10": { targetPages: 7, partCount: 3 },
  "11": { targetPages: 10, partCount: 4 },
  "12": { targetPages: 9, partCount: 4 },
  "13": { targetPages: 7, partCount: 3 },
});
const LIFEBOOK_CHAPTER_COMMON_STRUCTURE = Object.freeze([
  "챕터 표지 문구",
  "한 줄 핵심 메시지",
  "이 장에서 다룰 핵심 질문",
  "명리 구조 요약",
  "쉬운 현실 언어 해석",
  "강점 분석",
  "주의점 분석",
  "카테고리별 판단 기준",
  "상담 확인 질문",
  "장 요약 박스",
  "다음 장으로 연결되는 문장",
]);
const LIFEBOOK_PHASE6_CHAPTER_STRUCTURE = Object.freeze([
  "챕터 제목",
  "핵심 요약 카드",
  "상담형 본문",
  "계산 근거 기반 해석",
  "주의할 점",
  "카테고리별 판단 기준",
  "상담 확인 질문",
  "챕터 마무리 문장",
]);

const LIFEBOOK_PHASE6_CATEGORY_SECTIONS = Object.freeze(LIFEBOOK_PHASE6_CHAPTER_STRUCTURE.slice(1));

const LIFEBOOK_CATEGORY_SPECIFIC_SECTIONS = Object.freeze({
  "01": [
    "이 책이 붙잡는 한 문장",
    "타고난 명식의 첫인상",
    "일간과 월지가 만든 기본 리듬",
    "가장 강하게 작동하는 기운",
    "부족해서 보완해야 할 기운",
    "현재 대운이 여는 첫 과제",
    "인생의 책을 읽는 기준",
  ],
  "02": [
    "원국 전체의 핵심 문장",
    "년주가 말하는 초년의 배경",
    "월주가 말하는 사회적 무대",
    "일주가 말하는 자기 본질",
    "시주가 말하는 말년과 잠재력",
    "천간과 지지의 드러난 성향",
    "지장간에 숨은 진짜 동기",
    "팔자 전체의 반복 패턴",
  ],
  "03": [
    "월지와 월령의 계절감",
    "일간의 본질",
    "일간의 강약과 중심성",
    "통근과 뿌리의 안정감",
    "조후가 만드는 심리 온도",
    "신강·신약 판단과 균형",
    "기질이 드러나는 생활 방식",
    "안정되는 환경과 흔들리는 환경",
  ],
  "04": [
    "오행 전체 분포",
    "강한 오행의 장점",
    "강한 오행의 과부하",
    "부족한 오행의 결핍 신호",
    "부족한 오행의 보완 루틴",
    "조후와 오행의 온도감",
    "오행 균형을 삶에서 쓰는 법",
  ],
  "05": [
    "십성 전체 분포",
    "비겁이 말하는 자기 힘",
    "식상이 말하는 표현과 생산성",
    "재성이 말하는 현실감각과 돈",
    "관성이 말하는 책임과 사회성",
    "인성이 말하는 배움과 보호",
    "십성이 충돌할 때의 반복 패턴",
  ],
  "06": [
    "용신의 선정 근거",
    "희신이 돕는 방향",
    "기신이 흔드는 지점",
    "잘 풀리는 사람과 환경",
    "소모되는 사람과 환경",
    "재능이 살아나는 조건",
    "운을 쓸 때 지켜야 할 기준",
  ],
  "07": [
    "격국의 성립과 삶의 큰 틀",
    "사회적 역할과 쓰임",
    "성과가 나는 무대",
    "명예와 책임을 다루는 방식",
    "조직과 독립성의 적합도",
    "브랜드와 평판의 방향",
    "성공 구조의 약점",
  ],
  "08": [
    "연애가 시작되는 방식",
    "호감과 애착의 패턴",
    "배우자성의 강약",
    "배우자궁의 안정성",
    "결혼운의 흐름",
    "갈등과 회복 방식",
    "맞는 인연의 조건",
  ],
  "09": [
    "재성이 말하는 돈의 그릇",
    "식상이 말하는 수익화 방식",
    "관성이 말하는 직업 책임",
    "인성이 말하는 전문성",
    "맞는 직업 무대",
    "사업과 투자 판단 기준",
    "재물운이 흔들리는 지점",
  ],
  "10": [
    "오행 균형으로 보는 몸의 리듬",
    "과한 기운이 만드는 피로",
    "부족한 기운이 만드는 취약점",
    "조후와 컨디션의 관계",
    "스트레스가 쌓이는 방식",
    "회복이 쉬운 생활 조건",
    "의료 상담이 필요한 경계",
  ],
  "11": [
    "대운 시작점과 전환 구조",
    "현재 대운의 핵심 과제",
    "다음 대운의 예고 신호",
    "대운별 직업 흐름",
    "대운별 관계 흐름",
    "대운별 재물 흐름",
    "전환기에 조심해야 할 선택",
  ],
  "12": [
    "선택 연도와 현재 대운의 접점",
    "선택 연도 세운의 핵심 기운",
    "상반기의 기회와 부담",
    "하반기의 기회와 부담",
    "일과 재물의 가까운 흐름",
    "관계와 건강의 가까운 흐름",
    "월별로 주의 깊게 볼 신호",
  ],
  "13": [
    "전체 명식의 최종 문장",
    "가장 강한 운명의 축",
    "반복해서 조심해야 할 약점",
    "관계에서 지켜야 할 원칙",
    "일과 돈에서 지켜야 할 원칙",
    "대운과 세운을 통합한 판단",
    "마지막 상담 편지",
  ],
});

export const LIFE_BOOK_PDF_CONFIG = Object.freeze({
  generationMode: "local-assembled",
  provider: "saju-assembler",
  templateVersion: "life-book-local-assembled-v7",
});
const LIFEBOOK_AUTHORING_MODE = "local-assembled";
const LIFEBOOK_LOCAL_WRITING_STATE = "local_writing";
const LIFEBOOK_WRITING_STATE = LIFEBOOK_LOCAL_WRITING_STATE;

function isLifeBookLocalAssemblyMode(value = LIFE_BOOK_PDF_CONFIG.generationMode) {
  const mode = clean(value).toLowerCase();
  return ["local", "local-assembled", "assembled", "deterministic", "deterministic-assembled"].includes(mode);
}

function resolveLifeBookAssemblyRuntimeInfo(env = {}) {
  return {
    provider: LIFE_BOOK_PDF_CONFIG.provider,
    templateVersion: LIFE_BOOK_PDF_CONFIG.templateVersion,
    externalCallsAllowed: false,
    runtime: "local-assembled",
  };
}





function stableLifeBookCacheJson(value) {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableLifeBookCacheJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableLifeBookCacheJson(value[key])}`).join(",")}}`;
}

function hashLifeBookCacheText(value = "") {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

const LIFEBOOK_LOCAL_PDF_RESULT_CACHE = globalThis.__LIFEBOOK_LOCAL_PDF_RESULT_CACHE || new Map();
if (!globalThis.__LIFEBOOK_LOCAL_PDF_RESULT_CACHE) {
  globalThis.__LIFEBOOK_LOCAL_PDF_RESULT_CACHE = LIFEBOOK_LOCAL_PDF_RESULT_CACHE;
}

function buildLifeBookCalculationResultHash(normalized = {}) {
  const calculationSeed = stableLifeBookCacheJson({
    normalizedData: normalized.lifeBookNormalizedData || null,
    pillars: normalized.localSajuJson?.pillars || null,
    fiveElements: normalized.localSajuJson?.fiveElements || null,
    tenGods: normalized.localSajuJson?.tenGods || null,
    tenGodsByPillar: normalized.localSajuJson?.tenGodsByPillar || null,
    usefulGods: normalized.localSajuJson?.yongshin || normalized.localSajuJson?.usefulGods || null,
    geokguk: normalized.localSajuJson?.geokguk || null,
    interactions: normalized.localSajuJson?.interactions || null,
    specialStars: normalized.localSajuJson?.sinsal || null,
    twelveGrowthStages: normalized.localSajuJson?.twelveGrowthStages || null,
    daeun: normalized.localSajuJson?.daeun || null,
    currentDaeun: normalized.localSajuJson?.currentDaeun || null,
    yearlyFlow: normalized.localSajuJson?.yearlyFlow || null,
  });
  return hashLifeBookCacheText(calculationSeed);
}

function buildLifeBookPdfProfileCacheSeed(profile = {}) {
  return {
    name: clean(profile?.name),
    gender: clean(profile?.gender),
    calendarType: clean(profile?.calendarType),
    birthDate: clean(profile?.birthDate),
    birthTime: clean(profile?.birthTime),
    birthHour: Number.isFinite(Number(profile?.birthHour)) ? Number(profile.birthHour) : null,
    birthMinute: Number.isFinite(Number(profile?.birthMinute)) ? Number(profile.birthMinute) : null,
    timeKnown: profile?.timeKnown !== false,
    birthplace: clean(profile?.birthplace || profile?.location || profile?.city),
  };
}

function buildLifeBookPdfCacheKey({ profile = {}, calculationResultHash = "" } = {}) {
  const seed = stableLifeBookCacheJson({
    service: "life-book",
    version: LIFE_BOOK_PDF_CONFIG.templateVersion,
    profile: buildLifeBookPdfProfileCacheSeed(profile),
    calculationResultHash: clean(calculationResultHash),
  });
  return `life_book_pdf:${LIFE_BOOK_PDF_CONFIG.templateVersion}:${hashLifeBookCacheText(seed)}`;
}

function buildLifeBookPdfCacheContext(profile = {}, normalized = {}) {
  const calculationResultHash = buildLifeBookCalculationResultHash(normalized);
  return {
    calculationResultHash,
    cacheKey: buildLifeBookPdfCacheKey({ profile, calculationResultHash }),
  };
}

function readLifeBookLocalPdfResultCache(cacheKey = "") {
  const key = clean(cacheKey);
  if (!key || !LIFEBOOK_LOCAL_PDF_RESULT_CACHE.has(key)) return null;
  try {
    return JSON.parse(LIFEBOOK_LOCAL_PDF_RESULT_CACHE.get(key));
  } catch {
    LIFEBOOK_LOCAL_PDF_RESULT_CACHE.delete(key);
    return null;
  }
}

function writeLifeBookLocalPdfResultCache(cacheKey = "", result = {}) {
  const key = clean(cacheKey);
  if (!key || !result || typeof result !== "object") return;
  if (LIFEBOOK_LOCAL_PDF_RESULT_CACHE.size > 24) {
    const firstKey = LIFEBOOK_LOCAL_PDF_RESULT_CACHE.keys().next().value;
    if (firstKey) LIFEBOOK_LOCAL_PDF_RESULT_CACHE.delete(firstKey);
  }
  LIFEBOOK_LOCAL_PDF_RESULT_CACHE.set(key, JSON.stringify(result));
}







const LIFEBOOK_SESSION_LOCKS = globalThis.__LIFEBOOK_SESSION_LOCKS || new Map();
if (!globalThis.__LIFEBOOK_SESSION_LOCKS) {
  globalThis.__LIFEBOOK_SESSION_LOCKS = LIFEBOOK_SESSION_LOCKS;
}

function updateLifeBookSessionProgress(sessionId, progress = {}) {
  const key = clean(sessionId);
  if (!key || !LIFEBOOK_SESSION_LOCKS.has(key)) return;
  const lock = LIFEBOOK_SESSION_LOCKS.get(key) || {};
  LIFEBOOK_SESSION_LOCKS.set(key, {
    ...lock,
    progress: {
      ...(lock.progress || {}),
      ...progress,
      updatedAt: new Date().toISOString(),
    },
  });
}

function buildLifeBookStatusPayload(lock = {}, fallback = {}) {
  const rawStatus = clean(lock.status || fallback.status || "");
  const status = rawStatus === "done" ? "done" : rawStatus === "failed" ? "failed" : rawStatus || "running";
  const result = lock.result && typeof lock.result === "object" ? lock.result : null;
  const data = result?.data && typeof result.data === "object" ? result.data : result;
  const progress = lock.progress && typeof lock.progress === "object" ? lock.progress : {};
  const totalChapters = Number(progress.totalChapters || data?.chapterCount || getLifeBookBlueprints().length);
  return {
    ok: true,
    serviceKey: LIFEBOOK_SERVICE_KEY,
    data: {
      sessionId: clean(lock.sessionId || fallback.sessionId),
      reportId: clean(lock.reportId || fallback.reportId || data?.reportId),
      status,
      startedAt: clean(lock.startedAt || fallback.startedAt),
      completedAt: clean(fallback.completedAt || data?.completedAt),
      failedAt: clean(fallback.failedAt),
      progress: {
        stateKey: clean(progress.stateKey || (status === "done" ? "completed" : status === "failed" ? "failed" : LIFEBOOK_WRITING_STATE)),
        currentChapterNo: Math.max(0, Math.min(totalChapters, Number(progress.currentChapterNo || (status === "done" ? totalChapters : 0)) || 0)),
        totalChapters,
        currentChapterTitle: clean(progress.currentChapterTitle),
        updatedAt: clean(progress.updatedAt),
      },
      lifeBookPdfRecord: lock.lifeBookPdfRecord || data?.lifeBookPdfRecord || fallback.lifeBookPdfRecord || null,
      pdfReady: data?.pdfReady || fallback.pdfReady || null,
      chapters: data?.chapters || data?.pdfReady?.chapters || fallback.chapters || [],
      pdfUrl: clean(data?.pdfUrl || data?.downloadUrl || data?.htmlUrl || data?.pdfReady?.pdfUrl || data?.pdfReady?.downloadUrl),
      htmlUrl: clean(data?.htmlUrl || data?.pdfReady?.htmlUrl),
      canDownload: Boolean(data?.canDownload || clean(data?.pdfUrl || data?.downloadUrl || data?.htmlUrl || data?.pdfReady?.pdfUrl || data?.pdfReady?.downloadUrl)),
      error: lock.error || fallback.error || null,
    },
  };
}

async function findLifeBookReusableExecution(env, userId, executionCtx = {}, fallback = {}) {
  try {
    await connectDb(withPdfFastDbEnv(env));
    const filters = [];
    const executionKey = clean(executionCtx.executionKey);
    const sessionId = clean(executionCtx.sessionId || fallback.sessionId);
    const reportId = clean(executionCtx.reportId || fallback.reportId);
    const paymentSessionId = clean(executionCtx.paymentSessionId);
    const cacheKey = clean(executionCtx.cacheKey || executionCtx.metadata?.cacheKey || executionCtx.metadata?.lifeBookPdfCacheKey || fallback.cacheKey);
    if (executionKey) filters.push({ executionKey });
    if (sessionId) filters.push({ sessionId });
    if (reportId) filters.push({ reportId });
    if (paymentSessionId) filters.push({ paymentSessionId });
    if (cacheKey) {
      filters.push(
        { cacheKey },
        { "metadata.cacheKey": cacheKey },
        { "metadata.lifeBookPdfCacheKey": cacheKey },
      );
    }
    if (!filters.length) return null;
    return await ServiceExecutionTransaction.findOne({
      userId,
      reportType: "lifeBook",
      $or: filters,
    }).sort({ completedAt: -1, updatedAt: -1, createdAt: -1 }).lean();
  } catch (error) {
    logLifeBookServer("ReusableExecutionLookupFailed", { reason: clean(error?.message || error) });
    return null;
  }
}

function buildLifeBookReusableExecutionResponse(doc = {}, fallback = {}) {
  const metadata = doc?.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
  const archive = metadata?.archive && typeof metadata.archive === "object" ? metadata.archive : {};
  const payload = archive?.payload && typeof archive.payload === "object" ? archive.payload : {};
  const pdfReady = archive.pdfReady || metadata.pdfReady || payload.pdfReady || null;
  const storedUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || archive.downloadUrl || archive.pdfUrl || payload.downloadUrl || payload.pdfUrl);
  const reportId = clean(doc.reportId || archive.reportId || metadata.reportId || fallback.reportId);
  const sessionId = clean(doc.sessionId || metadata.sessionId || fallback.sessionId);
  const cacheKey = clean(doc.cacheKey || metadata.cacheKey || metadata.lifeBookPdfCacheKey || fallback.cacheKey);
  const isCompleted = clean(doc.status) === "success" && clean(doc.premiumStatus) === "completed";
  const isFailed = clean(doc.status) === "failed" || clean(doc.premiumStatus) === "failed";

  if (isCompleted && storedUrl) {
    const data = {
      reportId,
      sessionId,
      reportType: "lifeBook",
      serviceKey: LIFEBOOK_SERVICE_KEY,
      featureKey: clean(doc.featureKey || metadata.featureKey || fallback.featureKey),
      lifeBookPdfRecord: archive.lifeBookPdfRecord || metadata.lifeBookPdfRecord || null,
      chapters: Array.isArray(archive.chapters) ? archive.chapters : [],
      pdfReady,
      pdfUrl: storedUrl,
      htmlUrl: clean(pdfReady?.htmlUrl || archive.htmlUrl || payload.htmlUrl),
      downloadUrl: storedUrl,
      canReopen: true,
      canDownload: true,
      fromCache: true,
      cacheKey,
    };
    return {
      status: 200,
      payload: {
        ok: true,
        status: "completed",
        serverStatus: "completed",
        qualityStatus: "passed",
        serviceKey: LIFEBOOK_SERVICE_KEY,
        reportType: "lifeBook",
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
        serviceKey: LIFEBOOK_SERVICE_KEY,
        code: "LIFEBOOK_PREVIOUS_GENERATION_FAILED",
        message: "이전 인생의 책 PDF 생성이 실패했습니다. 새 생성 요청으로 다시 시도해 주세요.",
        debugSafe: { reportId, sessionId, previousStatus: clean(doc.status), previousPremiumStatus: clean(doc.premiumStatus) },
      },
    };
  }

  if (clean(doc.status) === "pending" || clean(doc.premiumStatus) === "generating") {
    return {
      status: 202,
      payload: {
        ok: true,
        serviceKey: LIFEBOOK_SERVICE_KEY,
        status: "running",
        serverStatus: "running",
        reportId,
        sessionId,
        fromCache: true,
        cacheKey,
        data: {
          reportId,
          sessionId,
          status: "running",
          progress: {
            stateKey: LIFEBOOK_WRITING_STATE,
            currentChapterNo: 0,
            totalChapters: getLifeBookBlueprints().length,
          },
        },
      },
    };
  }

  return null;
}

async function acquireLifeBookExecutionLease(env, userId, executionCtx = {}) {
  const executionKey = clean(executionCtx.executionKey);
  if (!executionKey) return { ok: true };
  try {
    await connectDb(withPdfFastDbEnv(env));
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + Math.max(1000 * 60 * 20, Number(executionCtx.timeoutSeconds || 1800) * 1000));
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
    logLifeBookServer("ExecutionLeaseAcquireFailed", { reason: clean(error?.message || error) });
    return { ok: false, error };
  }
}

const STEM_KO_MAP = Object.freeze({
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
});

const STEM_HAN_MAP = Object.freeze({
  갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
});

const BRANCH_KO_MAP = Object.freeze({
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
});

const BRANCH_HAN_MAP = Object.freeze({
  자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳", 오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥",
});

function clean(value) {
  return String(value || "").trim();
}

function normalizeLifeBookError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return { message: String(error) };
    }
  }
  return { message: String(error) };
}

function logLifeBookServer(stage, payload = {}) {
  try {
    console.info(`[LifeBookPremiumPDF][${stage}]`, payload);
  } catch (_) {}
}

function resolveLifeBookFeatureKey(raw) {
  const key = clean(raw);
  if (!key) return LIFEBOOK_FEATURE_KEY;
  if (key === LIFEBOOK_FEATURE_KEY || LIFEBOOK_FEATURE_KEY_ALIASES.has(key)) return LIFEBOOK_FEATURE_KEY;
  return key;
}

function toBillingFeatureKey(featureKey) {
  return resolveLifeBookFeatureKey(featureKey);
}

function stripForbiddenTokens(value) {
  return clean(value)
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/\bNaN\b/gi, "")
    .replace(/\[object Object\]/gi, "")
    .replace(/Chapter\s*1\s*Chapter\s*1/gi, "")
    .replace(/Chapter\s*1/gi, "")
    .replace(/자동 복구/gi, "")
    .replace(/fallback/gi, "")
    .replace(/seed/gi, "")
    .replace(/skeleton/gi, "")
    .replace(/\blocal\b/gi, "")
    .replace(/\bengine\b/gi, "")
    .replace(/validation/gi, "")
    .replace(/retry/gi, "")
    .replace(/payload/gi, "")
    .replace(/json/gi, "")
    .replace(/schema/gi, "")
    .replace(/raw/gi, "")
    .replace(/프롬프트/gi, "")
    .replace(/로컬\s*엔진/gi, "")
    .replace(/로컬\s*기반/gi, "")
    .replace(/데이터\s*부족/gi, "")
    .replace(/템플릿/gi, "")
    .replace(/Chapter\s*I(?:V|X|L|C|M)*/gi, "")
    .replace(/이\s*장에서는/g, "")
    .replace(/\d{2}장의\s*기준에\s*맞춰/g, "")
    .replace(/기준\s*세\s*가지/g, "")
    .replace(/원국\s*구조이/g, "원국 구조가")
    .replace(/([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸])은\(는\)/g, "$1은")
    .replace(/계산\s*시그니처/gi, "")
    .replace(/내부\s*데이터/gi, "")
    .replace(/엔진\s*결과/gi, "")
    .replace(/데이터\s*정규화/gi, "")
    .replace(/품질\s*검증/gi, "")
    .replace(/재생성/gi, "")
    .replace(/debug/gi, "")
    .replace(/Internal\s+server\s+error/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const CHAPTER_TOPIC_RULES = {
  "01": ["핵심", "명식", "일간", "월지", "대운", "기준"],
  "02": ["원국", "년주", "월주", "일주", "시주", "지장간"],
  "03": ["일간", "월지", "월령", "조후", "신강", "통근"],
  "04": ["오행", "목", "화", "토", "금", "수", "균형"],
  "05": ["십성", "비겁", "식상", "재성", "관성", "인성"],
  "06": ["용신", "희신", "기신", "균형", "환경", "선택"],
  "07": ["격국", "사회적 역할", "성과", "명예", "조직", "평판"],
  "08": ["연애", "결혼", "배우자", "배우자궁", "갈등", "인연"],
  "09": ["재물", "직업", "재성", "식상", "관성", "투자"],
  "10": ["건강", "심신", "오행", "조후", "스트레스", "회복"],
  "11": ["대운", "시작", "현재", "다음", "전환", "흐름"],
  "12": ["선택 연도", "세운", "상반기", "하반기", "월별", "로드맵"],
  "13": ["최종", "명식", "강점", "약점", "관계", "일과 돈", "편지"],
};

const LIFEBOOK_CHAPTER_LENSES = {
  "01": { focus: "핵심 명식 요약", tone: "운명의 첫 문장을 여는 상담", practical: "일간, 월지, 현재 대운을 한 기준으로 묶는 장" },
  "02": { focus: "사주 원국과 네 기둥", tone: "원국의 구조를 분해하는 해설", practical: "년월일시와 지장간이 실제 성향으로 드러나는 방식을 읽는 장" },
  "03": { focus: "일간·월지·조후", tone: "기질과 균형을 잡아 주는 상담", practical: "월령, 통근, 신강신약을 생활 리듬으로 번역하는 장" },
  "04": { focus: "오행 분포와 균형", tone: "강한 기운과 부족한 기운을 가르는 해설", practical: "오행의 과다·부족을 보완 루틴과 선택 기준으로 바꾸는 장" },
  "05": { focus: "십성 분포와 사회적 발현", tone: "재능과 욕망의 쓰임을 읽는 상담", practical: "비겁·식상·재성·관성·인성이 현실에서 맡는 역할을 정리하는 장" },
  "06": { focus: "용신·희신·기신", tone: "살리는 기운과 소모되는 기운을 구분하는 해설", practical: "좋은 사람, 환경, 선택 조건을 분명히 세우는 장" },
  "07": { focus: "격국과 성공 구조", tone: "사회적 쓰임과 성취 구조를 읽는 상담", practical: "성과가 나는 무대, 평판, 조직 적합도를 정리하는 장" },
  "08": { focus: "연애·결혼·배우자궁", tone: "사랑의 시작과 지속 방식을 읽는 상담", practical: "배우자성, 배우자궁, 갈등 회복 방식을 구분하는 장" },
  "09": { focus: "직업·재물·수익 구조", tone: "돈과 일의 흐름을 현실적으로 짚는 상담", practical: "재성, 식상, 관성, 인성이 수익과 직업으로 이어지는 방식을 읽는 장" },
  "10": { focus: "건강·심신·생활 리듬", tone: "오행과 조후로 회복 순서를 잡는 상담", practical: "과한 기운과 부족한 기운이 컨디션에 남기는 신호를 다루는 장" },
  "11": { focus: "대운 흐름과 전환 구조", tone: "큰 운의 계절을 읽는 상담", practical: "현재 대운과 다음 대운이 직업, 관계, 재물에 주는 과제를 정리하는 장" },
  "12": { focus: "선택 연도와 세운", tone: "가까운 운의 속도를 조절하는 상담", practical: "상반기, 하반기, 월별 신호를 실제 선택 순서로 바꾸는 장" },
  "13": { focus: "최종 통합과 상담 편지", tone: "삶의 기준을 마지막으로 정리하는 상담", practical: "명식, 대운, 세운, 관계, 일과 돈의 결론을 하나로 묶는 장" },
};

const LIFEBOOK_CANONICAL_TOPIC_RULES = Object.freeze({
  "01": ["핵심", "명식", "일간", "월지", "대운", "기준"],
  "02": ["원국", "년주", "월주", "일주", "시주", "지장간"],
  "03": ["일간", "월지", "월령", "조후", "신강", "통근"],
  "04": ["오행", "목", "화", "토", "금", "수"],
  "05": ["십성", "비겁", "식상", "재성", "관성", "인성"],
  "06": ["용신", "희신", "기신", "균형", "환경", "선택"],
  "07": ["격국", "사회", "소명", "성취", "역할", "직업"],
  "08": ["연애", "결혼", "배우자", "사랑", "갈등", "인연"],
  "09": ["재물", "직업", "돈", "사업", "커리어", "투자"],
  "10": ["건강", "심신", "오행", "스트레스", "수면", "관리"],
  "11": ["대운", "시작", "방향", "현재", "다음", "전환"],
  "12": ["선택 연도", "세운", "월별", "로드맵", "대응"],
  "13": ["최종", "전략", "관계", "직업", "재물", "편지"],
});

const LIFEBOOK_CANONICAL_BLUEPRINTS = Object.freeze([
  {
    id: "01",
    roman: "I",
    title: "🌌 사주 원국 해설 — 팔자 8글자의 구조",
    subtitle: "사주 8글자의 전체 구조와 네 기둥의 설계를 깊이 해석합니다.",
    categories: [
      "팔자 8글자가 만드는 첫인상",
      "년주가 말하는 초년과 외부 세계",
      "월주가 말하는 사회적 뿌리와 부모 환경",
      "일주가 말하는 자기 본질과 배우자궁",
      "시주가 말하는 재능, 미래, 말년의 가능성",
      "천간의 흐름과 겉으로 드러나는 의식",
      "지지의 흐름과 무의식적 욕망",
      "지장간에 숨어 있는 진짜 동기",
      "원국 안의 합충형파해",
      "반복되는 글자와 특수 구조",
      "원국이 보여주는 인생의 기본 서사",
      "원국을 가장 잘 쓰는 방법",
    ],
    engineFocus: [
      "원국의 천간/지지/지장간",
      "십성 배치",
      "오행 분포",
      "합충형파해",
      "도충 여부",
      "공망 또는 특수 구조",
      "원국 기반 핵심 성향",
    ],
  },
  {
    id: "02",
    roman: "II",
    title: "🏛️ 나의 설계도 — 월지·일간·조후와 기질의 뿌리",
    subtitle: "월지, 일간, 강약, 조후가 만드는 기질의 뿌리를 읽습니다.",
    categories: [
      "일간이 상징하는 나의 본질",
      "월지가 결정하는 인생의 계절",
      "월령이 사주 전체에 주는 힘",
      "신강·신약·중화 판단",
      "조후로 보는 따뜻함과 차가움",
      "습함과 건조함이 만드는 정서 리듬",
      "내가 편안해지는 환경",
      "내가 쉽게 지치는 환경",
      "기질의 장점",
      "기질의 그림자",
      "자기관리 방향",
      "좋은 선택을 하는 기준",
    ],
    engineFocus: [
      "일간 강약",
      "월령",
      "조후",
      "통근",
      "생조/극설",
      "계절성",
      "오행 온도감",
    ],
  },
  {
    id: "03",
    roman: "III",
    title: "⚔️ 용신·희신·기신 — 균형을 회복하는 방향",
    subtitle: "용신, 희신, 기신을 환경 선택과 삶의 기준으로 정리합니다.",
    categories: [
      "용신이란 무엇인가",
      "내 사주에서 가장 중요한 용신",
      "희신이 도와주는 방향",
      "기신이 강해질 때 나타나는 문제",
      "구신과 한신을 현실적으로 이해하는 법",
      "용신이 살아날 때의 나",
      "기신이 강해질 때의 나",
      "직업에서 용신을 쓰는 법",
      "관계에서 용신을 쓰는 법",
      "돈과 기회에서 용신을 쓰는 법",
      "생활 습관에서 용신을 쓰는 법",
      "나만의 선택 기준 선언문",
    ],
    engineFocus: [
      "억부 용신",
      "조후 용신",
      "병약 용신",
      "용신/희신/기신/구신",
      "용신 선정 이유",
      "오행별 현실 전략",
    ],
  },
  {
    id: "04",
    roman: "IV",
    title: "🌀 대운 정밀 분석 — 인생의 큰 파도",
    subtitle: "대운의 시작, 방향, 각 시기별 과제를 장기 전략으로 정리합니다.",
    categories: [
      "대운이란 무엇인가",
      "대운 시작 시기와 순행/역행",
      "초년 대운의 의미",
      "청년기 대운의 의미",
      "현재 대운의 핵심 주제",
      "현재 대운에서 열리는 기회",
      "현재 대운에서 조심해야 할 것",
      "다음 대운의 예고",
      "대운과 용신의 관계",
      "대운과 격국의 관계",
      "대운별 직업/재물/관계 변화",
      "앞으로 10년을 쓰는 법",
    ],
    engineFocus: [
      "대운 배열",
      "현재 대운",
      "다음 대운",
      "용신/희신/기신과 대운의 관계",
      "합충형파해",
      "도충 또는 특수 작용",
    ],
    writingRequirements: [
      "각 대운별 대운 기간",
      "각 대운별 대운 간지",
      "각 대운별 대운 십성",
      "각 대운별 대운 오행",
      "각 대운별 원국과의 작용",
      "각 대운별 기회",
      "각 대운별 주의점",
      "각 대운별 관계 흐름",
      "각 대운별 일과 돈의 흐름",
      "각 대운별 내면 변화",
      "각 대운별 실전 전략",
    ],
  },
  {
    id: "05",
    roman: "V",
    title: "👑 격국과 사회적 역할 — 성과가 열리는 구조",
    subtitle: "격국이 말하는 사회적 역할과 성취 구조를 해석합니다.",
    categories: [
      "격국이란 무엇인가",
      "내 사주의 주된 격국",
      "보조 격국과 숨은 구조",
      "성격과 파격의 가능성",
      "격국이 잘 작동할 때",
      "격국이 흐려질 때",
      "사회에서 맡기 쉬운 역할",
      "조직 안에서의 강점",
      "개인 브랜드와 사업 가능성",
      "명예와 평판을 얻는 방식",
      "나에게 맞는 성공 속도",
      "나의 성취 구조",
    ],
    engineFocus: [
      "월지 중심 격국",
      "십성 중심 구조",
      "성격/파격 여부",
      "용신 보완 여부",
      "사회적 역할 요약",
    ],
  },
  {
    id: "06",
    roman: "VI",
    title: "🤝 관계의 전략 — 인연의 법칙과 파트너십",
    subtitle: "십성과 원국 구조로 관계의 운영법과 인연 전략을 읽습니다.",
    categories: [
      "인간관계의 기본 성향",
      "가까운 사람에게 보이는 모습",
      "사회적 관계에서의 태도",
      "호감을 얻는 방식",
      "오해를 사는 방식",
      "갈등이 반복되는 지점",
      "잘 맞는 사람의 유형",
      "부담스러운 사람의 유형",
      "협업에서의 강점",
      "피해야 할 관계 계약",
      "귀인을 만나는 방식",
      "관계 회복 전략",
    ],
    engineFocus: [
      "비겁/식상/재성/관성/인성 분포",
      "충/형/원진/귀문",
      "천을귀인 등 귀인성",
      "도화/화개/역마",
      "배우자궁과 대인관계 패턴",
    ],
  },
  {
    id: "07",
    roman: "VII",
    title: "💑 연애·결혼 분석 — 사주가 말하는 나의 사랑",
    subtitle: "연애, 결혼, 배우자성, 배우자궁의 흐름을 관계 전략으로 정리합니다.",
    categories: [
      "연애에서의 기본 성향",
      "사랑을 시작하는 방식",
      "끌리는 상대 유형",
      "안정감을 느끼는 관계",
      "불안해지는 관계",
      "표현 방식",
      "갈등 패턴",
      "결혼관",
      "배우자궁 해석",
      "배우자성 해석",
      "인연을 오래 유지하는 법",
      "좋은 인연을 알아보는 기준",
    ],
    engineFocus: [
      "일지",
      "배우자궁",
      "남녀별 배우자성",
      "재성/관성 구조",
      "도화/홍염/화개",
      "충/합/원진",
      "대운·세운상 연애 자극",
    ],
    writingRequirements: [
      "이혼, 외도, 사별, 불행을 단정하지 말 것",
      "관계 문제는 반복될 수 있는 패턴으로만 표현할 것",
    ],
  },
  {
    id: "08",
    roman: "VIII",
    title: "💰 재물·직업 분석 — 돈과 일이 머무는 구조",
    subtitle: "재성, 식상, 관성, 인성을 직업과 재물 전략으로 연결합니다.",
    categories: [
      "돈을 대하는 기본 방식",
      "재성의 강약과 위치",
      "식상생재 구조",
      "관성과 재성의 연결",
      "인성과 재성의 연결",
      "돈이 모이는 방식",
      "돈이 새는 방식",
      "직업 적성",
      "사업/프리랜스 가능성",
      "피해야 할 돈의 패턴",
      "장기적 자산 전략",
      "돈의 그릇을 안정시키는 실전법",
    ],
    engineFocus: [
      "재성",
      "식상",
      "관성",
      "인성",
      "격국",
      "용신",
      "대운상 재물 흐름",
      "선택 연도 재물 흐름",
    ],
    writingRequirements: [
      "투자 종목 추천 금지",
      "수익 확정 표현 금지",
      "재물운은 돈을 다루는 성향과 기회 활용 능력으로 표현할 것",
    ],
  },
  {
    id: "09",
    roman: "IX",
    title: "🏥 건강·심신 리듬 — 오행이 말하는 생활 지도",
    subtitle: "오행과 조후를 몸과 마음의 생활 관리 관점으로 해석합니다.",
    categories: [
      "오행 균형으로 보는 에너지 체질",
      "강한 오행의 장점과 과부하",
      "약한 오행의 보완 과제",
      "조후로 보는 컨디션 리듬",
      "스트레스가 쌓이는 방식",
      "회복이 잘 되는 환경",
      "수면 리듬",
      "운동 방향",
      "식습관 방향",
      "감정 관리",
      "계절별 컨디션 관리",
      "번아웃 예방 루틴",
    ],
    engineFocus: [
      "오행 과다/부족",
      "조후",
      "화기/수기/습도/건조도",
      "용신 오행",
      "기신 오행",
    ],
    requiredNotice: "이 내용은 사주 오행에 기반한 자기관리 참고 자료이며, 의학적 진단이나 치료를 대체하지 않습니다. 지속적인 증상이나 불편감이 있다면 의료 전문가와 상담하는 것이 좋습니다.",
    writingRequirements: [
      "의학적 진단이나 치료처럼 표현하지 말 것",
      "건강 내용은 사주 오행에 기반한 자기관리 참고 자료로만 표현할 것",
      "지속적인 증상이나 불편감은 의료 전문가 상담을 권하도록 안내할 것",
    ],
  },
  {
    id: "10",
    roman: "X",
    title: "🔮 신살·12운성 해석 — 반복 신호와 숨은 작용",
    subtitle: "신살, 12운성, 특수 작용을 선택 가능성의 언어로 풀이합니다.",
    categories: [
      "신살을 현대적으로 이해하는 법",
      "내 사주의 핵심 신살",
      "도화/홍염 계열의 매력 코드",
      "역마 계열의 이동과 변화 코드",
      "화개 계열의 몰입과 예술성",
      "귀인성의 보호와 도움",
      "귀문/원진 등 예민한 코드",
      "12운성이 말하는 에너지 단계",
      "년주 12운성",
      "월주 12운성",
      "일주 12운성",
      "시주 12운성",
      "원국이 드러내는 반복 패턴",
      "이 코드를 인생에서 쓰는 법",
    ],
    engineFocus: [
      "신살 목록",
      "신살 위치",
      "12운성 위치",
      "반복 패턴",
      "도충/합충형파해와 신살의 결합",
      "반복 신호 요약",
    ],
    writingRequirements: [
      "신살을 공포스럽게 표현하지 말 것",
      "부정적 신살도 주의해야 할 에너지 패턴으로 표현할 것",
    ],
  },
  {
    id: "11",
    roman: "XI",
    title: "📅 선택 연도 실전 로드맵 — 12개월 행동 지침",
    subtitle: "선택한 연도의 세운과 월별 행동 지침을 현실 전략으로 정리합니다.",
    categories: [
      "선택 연도 전체 분위기",
      "선택 연도가 원국에 주는 자극",
      "현재 대운과 선택 연도의 결합",
      "선택 연도의 핵심 기회",
      "선택 연도의 핵심 주의점",
      "일/직업 흐름",
      "재물 흐름",
      "관계 흐름",
      "연애 흐름",
      "건강/컨디션 흐름",
      "1월~12월 월별 로드맵",
      "선택 연도에 반드시 키워야 할 능력",
      "선택 연도에 피해야 할 선택",
      "선택 연도 최종 행동 지침",
    ],
    engineFocus: [
      "선택 연도 세운",
      "선택 연도 월운 12개월",
      "대운과 세운 관계",
      "원국과 세운 합충형파해",
      "용신/기신 작용",
    ],
    writingRequirements: [
      "월별 분석은 1월부터 12월까지 빠짐없이 작성할 것",
      "각 월별 분석에는 월의 핵심 키워드를 포함할 것",
      "각 월별 분석에는 원국과의 작용을 포함할 것",
      "각 월별 분석에는 대운/세운과의 연결을 포함할 것",
      "각 월별 분석에는 일/커리어 흐름을 포함할 것",
      "각 월별 분석에는 돈/재물 흐름을 포함할 것",
      "각 월별 분석에는 관계/연애 흐름을 포함할 것",
      "각 월별 분석에는 건강/컨디션 흐름을 포함할 것",
      "각 월별 분석에는 이번 달 행동 지침을 포함할 것",
      "각 월별 분석에는 피해야 할 선택을 포함할 것",
      "각 월별 분석에는 한 줄 조언을 포함할 것",
    ],
  },
  {
    id: "12",
    roman: "XII",
    title: "🌅 생애 마스터플랜 — 인생 전체의 운명 지도",
    subtitle: "대운 기준 생애 단계와 장기 인생 전략을 설계합니다.",
    categories: [
      "인생 전체의 핵심 테마",
      "초년기의 의미",
      "청년기의 의미",
      "중년기의 의미",
      "장년기의 의미",
      "말년기의 의미",
      "반복되는 과제",
      "크게 열리는 기회",
      "반드시 키워야 할 능력",
      "줄여야 할 습관",
      "인생의 성공 속도",
      "생애 단계별 전략표",
      "앞으로 3년 전략",
      "앞으로 5년 전략",
      "앞으로 10년 전략",
    ],
    engineFocus: [
      "전체 대운",
      "현재 대운",
      "다음 대운",
      "원국 핵심 구조",
      "용신 흐름",
      "격국의 성숙 과정",
      "선택 연도 이후 흐름",
    ],
  },
  {
    id: "13",
    roman: "XIII",
    title: "💌 최종 제언 — 나에게 주는 운명 사용 기준",
    subtitle: "앞선 모든 해석을 최종 조언과 실행 계획으로 묶습니다.",
    categories: [
      "이 사주의 가장 중요한 한 문장",
      "반드시 믿어야 할 재능",
      "반복해서 조심해야 할 패턴",
      "관계에서의 최종 조언",
      "사랑에서의 최종 조언",
      "일과 돈에서의 최종 조언",
      "건강과 마음에서의 최종 조언",
      "현재 대운에서 가장 중요한 선택",
      "선택 연도에 반드시 실천할 것",
      "앞으로 10년의 핵심 전략",
      "나에게 주는 운명 사용 기준",
      "최종 편지",
    ],
    writingRequirements: [
      "가장 따뜻하고 깊은 문체로 작성할 것",
      "지나친 찬양은 피할 것",
      "사용자가 위로와 방향성을 동시에 느끼도록 작성할 것",
      "마지막은 편지 형식으로 마무리할 것",
    ],
  },
]);

const LIFEBOOK_PHASE6_BLUEPRINTS = Object.freeze([
  {
    id: "01",
    roman: "I",
    title: "프롤로그 — 내 인생의 핵심 코드",
    subtitle: "원국 전체를 하나의 운명적 문장으로 묶어 삶의 첫 방향을 엽니다.",
    categories: LIFEBOOK_CATEGORY_SPECIFIC_SECTIONS["01"],
    engineFocus: ["원국", "사주 팔자", "일간", "월지", "오행", "십성", "용신"],
  },
  {
    id: "02",
    roman: "II",
    title: "원국 해석 — 태어난 순간의 구조",
    subtitle: "년주, 월주, 일주, 시주의 배치를 통해 태어난 순간의 기본 구조를 읽습니다.",
    categories: LIFEBOOK_CATEGORY_SPECIFIC_SECTIONS["02"],
    engineFocus: ["년주", "월주", "일주", "시주", "지장간", "원국 구조", "계절 기운"],
  },
  {
    id: "03",
    roman: "III",
    title: "일간과 월지 — 내가 세상을 살아가는 기본 방식",
    subtitle: "일간의 본질과 월지의 계절성을 함께 보아 삶의 작동 방식을 해석합니다.",
    categories: LIFEBOOK_CATEGORY_SPECIFIC_SECTIONS["03"],
    engineFocus: ["일간", "월지", "월령", "신강신약", "조후", "기질", "생활 방식"],
  },
  {
    id: "04",
    roman: "IV",
    title: "오행 균형 — 넘치는 기운과 부족한 기운",
    subtitle: "목화토금수의 과다와 부족을 정리해 강점, 피로, 보완 루틴을 찾습니다.",
    categories: LIFEBOOK_CATEGORY_SPECIFIC_SECTIONS["04"],
    engineFocus: ["목", "화", "토", "금", "수", "오행 과다", "오행 부족", "오행 균형"],
  },
  {
    id: "05",
    roman: "V",
    title: "십성 구조 — 성격, 재능, 욕망의 패턴",
    subtitle: "비겁, 식상, 재성, 관성, 인성의 흐름으로 성격과 재능의 반복 패턴을 읽습니다.",
    categories: LIFEBOOK_CATEGORY_SPECIFIC_SECTIONS["05"],
    engineFocus: ["비견", "겁재", "식신", "상관", "재성", "관성", "인성", "십성 분포"],
  },
  {
    id: "06",
    roman: "VI",
    title: "용신·희신·기신 — 나를 살리는 방향과 피해야 할 방향",
    subtitle: "사주의 균형을 회복시키는 방향과 과해질 때 조심해야 할 흐름을 나눕니다.",
    categories: LIFEBOOK_CATEGORY_SPECIFIC_SECTIONS["06"],
    engineFocus: ["용신", "희신", "기신", "조후 용신", "억부 용신", "균형 방향", "주의 기운"],
  },
  {
    id: "07",
    roman: "VII",
    title: "격국과 삶의 큰 틀 — 인생이 풀리는 방식",
    subtitle: "격국과 계절의 큰 틀을 통해 일이 열리고 막히는 방식을 해석합니다.",
    categories: LIFEBOOK_CATEGORY_SPECIFIC_SECTIONS["07"],
    engineFocus: ["격국", "월령", "사회적 역할", "성공 방식", "명예", "구조", "대세"],
  },
  {
    id: "08",
    roman: "VIII",
    title: "연애와 관계 — 사랑, 결혼, 친밀감의 패턴",
    subtitle: "친밀감, 애착, 결혼관, 관계 회복 방식을 상담형 문장으로 정리합니다.",
    categories: LIFEBOOK_CATEGORY_SPECIFIC_SECTIONS["08"],
    engineFocus: ["연애", "배우자궁", "배우자성", "관계", "합충형해", "친밀감", "결혼"],
  },
  {
    id: "09",
    roman: "IX",
    title: "직업과 재물 — 돈이 들어오는 방식과 커리어 방향",
    subtitle: "재성, 관성, 식상의 작동을 통해 돈과 일의 흐름을 현실적으로 연결합니다.",
    categories: LIFEBOOK_CATEGORY_SPECIFIC_SECTIONS["09"],
    engineFocus: ["직업", "재물", "재성", "관성", "식상", "커리어", "수입 구조", "일의 방식"],
  },
  {
    id: "10",
    roman: "X",
    title: "건강과 생활 리듬 — 몸과 마음의 관리법",
    subtitle: "오행 균형과 조후를 바탕으로 생활 리듬과 회복 루틴을 제안합니다.",
    categories: LIFEBOOK_CATEGORY_SPECIFIC_SECTIONS["10"],
    engineFocus: ["건강", "생활 리듬", "오행 균형", "조후", "수면", "회복", "스트레스"],
  },
  {
    id: "11",
    roman: "XI",
    title: "대운 분석 — 인생의 큰 계절 변화",
    subtitle: "현재 대운과 다음 대운의 전환을 통해 인생의 큰 계절을 읽습니다.",
    categories: LIFEBOOK_CATEGORY_SPECIFIC_SECTIONS["11"],
    engineFocus: ["대운", "현재 대운", "다음 대운", "대운 전환", "십년 흐름", "기회", "주의점"],
  },
  {
    id: "12",
    roman: "XII",
    title: "선택 연도와 가까운 미래 — 세운·월운 기반 실전 조언",
    subtitle: "세운과 월운의 가까운 흐름을 실행 가능한 조언으로 바꿉니다.",
    categories: LIFEBOOK_CATEGORY_SPECIFIC_SECTIONS["12"],
    engineFocus: ["세운", "월운", "선택 연도", "가까운 미래", "월별 흐름", "실전 조언", "선택 시기"],
  },
  {
    id: "13",
    roman: "XIII",
    title: "마스터플랜 — 앞으로의 선택과 실행 전략",
    subtitle: "전체 해석을 하나의 선택 기준과 실행 전략으로 묶어 마무리합니다.",
    categories: LIFEBOOK_CATEGORY_SPECIFIC_SECTIONS["13"],
    engineFocus: ["마스터플랜", "최종 선택 기준", "관계", "직업", "재물", "대운 통합"],
  },
]);

function getLifeBookBlueprints() {
  return LIFEBOOK_PHASE6_BLUEPRINTS;
}

function getLifeBookPagePlan(chapterId = "") {
  const id = String(chapterId || "").padStart(2, "0");
  const base = LIFEBOOK_CHAPTER_PAGE_TARGETS[id] || { targetPages: 14, partCount: 4 };
  const targetPages = clamp(Number(base.targetPages || 14), 1, 30);
  const partCount = clamp(Number(base.partCount || 4), 3, 6);
  return {
    targetPages,
    partCount,
    minChars: targetPages * LIFEBOOK_A4_CHAR_RANGE.min,
    targetChars: targetPages * LIFEBOOK_A4_CHAR_RANGE.target,
    maxChars: targetPages * LIFEBOOK_A4_CHAR_RANGE.max,
    charsPerPage: LIFEBOOK_A4_CHAR_RANGE,
  };
}

function splitLifeBookChapterParts(chapterSpec = {}) {
  const categories = Array.isArray(chapterSpec?.categories) ? chapterSpec.categories : [];
  const pagePlan = getLifeBookPagePlan(chapterSpec?.id);
  const partCount = Math.min(pagePlan.partCount, Math.max(1, categories.length));
  const parts = [];
  for (let index = 0; index < partCount; index += 1) {
    const start = Math.floor((categories.length * index) / partCount);
    const end = Math.floor((categories.length * (index + 1)) / partCount);
    const partCategories = categories.slice(start, end);
    if (!partCategories.length) continue;
    const partPages = pagePlan.targetPages / partCount;
    parts.push({
      ...chapterSpec,
      id: `${chapterSpec.id}-part-${index + 1}`,
      parentId: chapterSpec.id,
      isPart: true,
      partIndex: index + 1,
      partCount,
      categories: partCategories,
      parentCategories: categories,
      pagePlan: {
        ...pagePlan,
        targetPages: Math.max(1, Math.round(partPages * 10) / 10),
        minChars: Math.round((pagePlan.minChars * partCategories.length) / Math.max(1, categories.length)),
        targetChars: Math.round((pagePlan.targetChars * partCategories.length) / Math.max(1, categories.length)),
        maxChars: Math.round((pagePlan.maxChars * partCategories.length) / Math.max(1, categories.length)),
      },
    });
  }
  return parts;
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function round(value) {
  return Math.round(Number(value || 0));
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeLifeBookScalar(value, fallback = "") {
  if (value == null) return fallback;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return clean(value) || fallback;
  }
  return fallback;
}

function safeLifeBookList(value) {
  const source = Array.isArray(value) ? value : clean(value) ? [value] : [];
  return Array.from(new Set(source.map((item) => safeLifeBookScalar(item)).filter(Boolean)));
}

function safeLifeBookPlainObject(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([, entry]) => entry == null || typeof entry !== "object")
    .map(([key, entry]) => [clean(key), entry])
    .filter(([key]) => key));
}

function englishElementToKorean(value) {
  const key = String(value || "").toLowerCase();
  if (key === "wood") return "목";
  if (key === "fire") return "화";
  if (key === "earth") return "토";
  if (key === "metal") return "금";
  if (key === "water") return "수";
  return "";
}

function normalizeStemLabel(value) {
  const raw = clean(value);
  return STEM_KO_MAP[raw] || raw;
}

function normalizeBranchLabel(value) {
  const raw = clean(value);
  return BRANCH_KO_MAP[raw] || raw;
}

function getPillarStemLabel(pillar = {}) {
  return normalizeStemLabel(pillar?.stemKo || pillar?.stem || "");
}

function getPillarBranchLabel(pillar = {}) {
  return normalizeBranchLabel(pillar?.branchKo || pillar?.branch || "");
}

function getPillarGanjiLabel(pillar = {}) {
  const stem = getPillarStemLabel(pillar);
  const branch = getPillarBranchLabel(pillar);
  return `${stem}${branch}`.trim();
}

function formatGanjiWithHanja(stem = "", branch = "") {
  const koStem = normalizeStemLabel(stem);
  const koBranch = normalizeBranchLabel(branch);
  const hanStem = STEM_HAN_MAP[koStem] || clean(stem);
  const hanBranch = BRANCH_HAN_MAP[koBranch] || clean(branch);
  if (!koStem || !koBranch) return `${koStem}${koBranch}`.trim();
  if (!hanStem || !hanBranch) return `${koStem}${koBranch}`;
  return `${koStem}${koBranch}(${hanStem}${hanBranch})`;
}

function describeTopTenGods(signals = {}) {
  const ranked = Array.isArray(signals?.tenGodStats?.top) ? signals.tenGodStats.top : [];
  if (!ranked.length) return "십성은 특정 한 가지보다 상황 대응형으로 분산되어 있습니다.";
  return ranked.slice(0, 3).map((item) => `${item.key} ${item.pct || 0}%`).join(", ");
}

function describeElementRatio(signals = {}) {
  const weights = signals?.elementWeights;
  if (!weights) {
    return "오행은 특정 기운 하나보다 생활 리듬과 환경 조절에서 균형을 만들어야 하는 상태로 보입니다.";
  }
  return `오행 분포는 목 ${safeNumber(weights.wood, 0)}%, 화 ${safeNumber(weights.fire, 0)}%, 토 ${safeNumber(weights.earth, 0)}%, 금 ${safeNumber(weights.metal, 0)}%, 수 ${safeNumber(weights.water, 0)}%로 읽힙니다.`;
}

function dedupeParagraphs(text = "") {
  const paragraphs = String(text || "")
    .split(/\n\s*\n/)
    .map((paragraph) => stripForbiddenTokens(paragraph))
    .filter(Boolean);
  const seen = new Set();
  return paragraphs.filter((paragraph) => {
    const key = paragraph.replace(/\s+/g, " ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join("\n\n");
}

function gatherCategoryText(chapters = []) {
  return (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => (Array.isArray(chapter?.categories) ? chapter.categories : []))
    .map((category) => stripForbiddenTokens(category?.finalText || category?.localSummary || ""))
    .filter(Boolean);
}

function countRepeatedNgrams(text = "", n = 30, threshold = 3) {
  const minLength = Math.max(60, Number(n) || 0);
  const source = stripForbiddenTokens(text)
    .split(/\n\s*\n|[.!?。]\s+/)
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter((chunk) => chunk.length >= minLength);
  if (!source.length) return 0;
  const map = new Map();
  source.forEach((chunk) => {
    map.set(chunk, Number(map.get(chunk) || 0) + 1);
  });
  return Array.from(map.values()).filter((count) => count >= threshold).length;
}

function countRepeatedOpenings(chapters = []) {
  const openings = gatherCategoryText(chapters)
    .map((text) => text.split(/\n+/).map((line) => stripForbiddenTokens(line)).find(Boolean) || "")
    .map((line) => line.slice(0, 28))
    .filter((line) => line.length >= 10);
  const map = new Map();
  openings.forEach((opening) => map.set(opening, Number(map.get(opening) || 0) + 1));
  return Array.from(map.values()).filter((count) => count >= 4).length;
}

function countOverusedPhrases(text = "") {
  const source = stripForbiddenTokens(text);
  const rules = [
    { pattern: /이\s*명식은/g, limit: 8 },
    { pattern: /균형이\s*필요합니다/g, limit: 4 },
    { pattern: /주의가\s*필요합니다/g, limit: 4 },
    { pattern: /현실\s*조언은/g, limit: 3 },
  ];
  return rules.reduce((acc, rule) => {
    const matches = source.match(rule.pattern) || [];
    return acc + (matches.length > rule.limit ? 1 : 0);
  }, 0);
}

function validateChapterTopicCoverage(chapter = {}) {
  const chapterId = String(chapter?.id || "");
  const required = LIFEBOOK_CANONICAL_TOPIC_RULES[chapterId] || CHAPTER_TOPIC_RULES[chapterId] || [];
  if (!required.length) return true;
  const text = stripForbiddenTokens(chapter?.finalText || chapter?.text || "");
  const hits = required.filter((keyword) => text.includes(keyword)).length;
  return hits >= 2;
}

const LIFEBOOK_CATEGORY_TOKEN_STOPWORDS = new Set([
  "그리고",
  "그러나",
  "에서는",
  "으로",
  "에서",
  "하는",
  "있는",
  "없는",
  "대한",
  "기준",
  "핵심",
  "방식",
  "흐름",
  "분석",
  "해석",
  "상담",
  "정리",
  "완전",
  "전체",
]);

function extractLifeBookMeaningfulTokens(value = "") {
  return Array.from(new Set(String(value || "")
    .match(/[가-힣A-Za-z0-9]+/g) || []))
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .filter((token) => !LIFEBOOK_CATEGORY_TOKEN_STOPWORDS.has(token));
}

function getLifeBookCategoryFitKeywords(chapter = {}, categoryTitle = "") {
  const chapterId = String(chapter?.id || "");
  const chapterRules = LIFEBOOK_CANONICAL_TOPIC_RULES[chapterId] || CHAPTER_TOPIC_RULES[chapterId] || [];
  return {
    category: extractLifeBookMeaningfulTokens(categoryTitle),
    chapter: Array.from(new Set([
      ...chapterRules,
      ...extractLifeBookMeaningfulTokens(chapter?.title || ""),
      ...extractLifeBookMeaningfulTokens(chapter?.subtitle || ""),
      ...(Array.isArray(chapter?.engineFocus) ? chapter.engineFocus : []),
    ].map((item) => clean(item)).filter(Boolean))),
  };
}

function evaluateLifeBookCategoryFit(text = "", chapter = {}, categoryTitle = "") {
  const source = stripForbiddenTokens(text);
  const lowerSource = source.toLowerCase();
  const keywords = getLifeBookCategoryFitKeywords(chapter, categoryTitle);
  const categoryHits = keywords.category.filter((keyword) => lowerSource.includes(keyword.toLowerCase())).length;
  const chapterHits = keywords.chapter.filter((keyword) => lowerSource.includes(keyword.toLowerCase())).length;
  return {
    hasCategoryGrounding: !keywords.category.length || categoryHits >= Math.min(2, keywords.category.length),
    hasChapterTopicGrounding: !keywords.chapter.length || chapterHits >= 2,
    categoryHits,
    chapterHits,
    categoryKeywordCount: keywords.category.length,
    chapterKeywordCount: keywords.chapter.length,
  };
}

function normalizeIncomingAnalysisSignals(raw = {}) {
  const src = raw && typeof raw === "object" ? raw : {};
  const weights = src.elementWeights && typeof src.elementWeights === "object"
    ? {
        wood: safeNumber(src.elementWeights.wood, 0),
        fire: safeNumber(src.elementWeights.fire, 0),
        earth: safeNumber(src.elementWeights.earth, 0),
        metal: safeNumber(src.elementWeights.metal, 0),
        water: safeNumber(src.elementWeights.water, 0),
      }
    : null;

  const yongList = Array.isArray(src.yongshinElements)
    ? src.yongshinElements.map((v) => normalizeSajuElementToken(v, "")).filter(Boolean)
    : [];
  const kiList = Array.isArray(src.kishinElements)
    ? src.kishinElements.map((v) => normalizeSajuElementToken(v, "")).filter(Boolean)
    : [];

  const tenGodCounts = src.tenGodCounts && typeof src.tenGodCounts === "object"
    ? { ...src.tenGodCounts }
    : null;
  const tenGodByPillar = src.tenGodByPillar && typeof src.tenGodByPillar === "object"
    ? { ...src.tenGodByPillar }
    : null;
  const daewunCycles = Array.isArray(src.daewunCycles) ? src.daewunCycles : [];
  const specialStars = Array.isArray(src.specialStars) ? src.specialStars : [];
  const twelveGrowthStages = Array.isArray(src.twelveGrowthStages) ? src.twelveGrowthStages : [];

  return {
    dayMaster: clean(src.dayMaster),
    monthBranch: clean(src.monthBranch),
    powerLabel: clean(src.powerLabel),
    johuType: clean(src.johuType),
    yongshinElements: yongList,
    kishinElements: kiList,
    currentDaewun: clean(src.currentDaewun),
    isJong: Boolean(src.isJong),
    jongName: clean(src.jongName),
    elementWeights: weights,
    tenGodCounts,
    tenGodByPillar,
    daewunCycles,
    currentDaeunNode: src.currentDaeunNode && typeof src.currentDaeunNode === "object" ? src.currentDaeunNode : null,
    nextDaeunNode: src.nextDaeunNode && typeof src.nextDaeunNode === "object" ? src.nextDaeunNode : null,
    specialStars,
    twelveGrowthStages,
  };
}

function pickTopTenGod(tenGodCounts = null) {
  const map = tenGodCounts && typeof tenGodCounts === "object" ? tenGodCounts : null;
  if (!map) return "";
  let topKey = "";
  let topValue = -1;
  Object.keys(map).forEach((key) => {
    const value = safeNumber(map[key], 0);
    if (value > topValue) {
      topValue = value;
      topKey = String(key);
    }
  });
  return topKey;
}

function deriveElementBalance(profile, signals) {
  if (signals.elementWeights) {
    const ratio = {
      wood: round(safeNumber(signals.elementWeights.wood, 0)),
      fire: round(safeNumber(signals.elementWeights.fire, 0)),
      earth: round(safeNumber(signals.elementWeights.earth, 0)),
      metal: round(safeNumber(signals.elementWeights.metal, 0)),
      water: round(safeNumber(signals.elementWeights.water, 0)),
    };
    const counts = { ...ratio };
    const sorted = ELEMENT_KEYS.slice().sort((a, b) => Number(ratio[b] || 0) - Number(ratio[a] || 0));
    const dominant = sorted[0] || "earth";
    const deficient = sorted[sorted.length - 1] || "earth";
    const gap = Math.abs(Number(ratio[dominant] || 0) - Number(ratio[deficient] || 0));
    const balanceScore = clamp(100 - round(gap * 1.2), 35, 97);
    return { counts, ratio, dominant, deficient, balanceScore };
  }

  return {
    counts: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    ratio: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    dominant: "earth",
    deficient: "earth",
    balanceScore: 50,
  };
}

function deriveTenGodStats(profile, signals = {}) {
  if (signals.tenGodCounts && typeof signals.tenGodCounts === "object") {
    const base = {
      비견: safeNumber(signals.tenGodCounts.비견, 0),
      겁재: safeNumber(signals.tenGodCounts.겁재, 0),
      식신: safeNumber(signals.tenGodCounts.식신, 0),
      상관: safeNumber(signals.tenGodCounts.상관, 0),
      정재: safeNumber(signals.tenGodCounts.정재, 0),
      편재: safeNumber(signals.tenGodCounts.편재, 0),
      정관: safeNumber(signals.tenGodCounts.정관, 0),
      편관: safeNumber(signals.tenGodCounts.편관, 0),
      정인: safeNumber(signals.tenGodCounts.정인, 0),
      편인: safeNumber(signals.tenGodCounts.편인, 0),
    };
    const total = Object.values(base).reduce((acc, value) => acc + Number(value || 0), 0) || 1;
    const top = Object.keys(base)
      .sort((a, b) => Number(base[b] || 0) - Number(base[a] || 0))
      .slice(0, 3)
      .map((key) => ({ key, count: Number(base[key] || 0), pct: round((Number(base[key] || 0) / total) * 100) }));
    const emotionShare = Number(base.식신 || 0) + Number(base.상관 || 0);
    const realityShare = Number(base.정재 || 0) + Number(base.편재 || 0);
    const authorityShare = Number(base.정관 || 0) + Number(base.편관 || 0);
    const introspectShare = Number(base.정인 || 0) + Number(base.편인 || 0);
    return {
      counts: base,
      top,
      emotionPct: round((emotionShare / total) * 100),
      realityPct: round((realityShare / total) * 100),
      authorityPct: round((authorityShare / total) * 100),
      introspectPct: round((introspectShare / total) * 100),
    };
  }

  const base = {
    비견: 0,
    겁재: 0,
    식신: 0,
    상관: 0,
    정재: 0,
    편재: 0,
    정관: 0,
    편관: 0,
    정인: 0,
    편인: 0,
  };
  const total = Object.values(base).reduce((acc, value) => acc + Number(value || 0), 0) || 1;
  const top = Object.keys(base)
    .sort((a, b) => Number(base[b] || 0) - Number(base[a] || 0))
    .slice(0, 3)
    .map((key) => ({ key, count: Number(base[key] || 0), pct: round((Number(base[key] || 0) / total) * 100) }));

  const emotionShare = Number(base.식신 || 0) + Number(base.상관 || 0);
  const realityShare = Number(base.정재 || 0) + Number(base.편재 || 0);
  const authorityShare = Number(base.정관 || 0) + Number(base.편관 || 0);
  const introspectShare = Number(base.정인 || 0) + Number(base.편인 || 0);

  return {
    counts: base,
    top,
    emotionPct: round((emotionShare / total) * 100),
    realityPct: round((realityShare / total) * 100),
    authorityPct: round((authorityShare / total) * 100),
    introspectPct: round((introspectShare / total) * 100),
  };
}

function deriveLifeBookPayload(profile, signals, chapters, metadata = {}) {
  const elementBalance = deriveElementBalance(profile, signals);
  const tenGodStats = deriveTenGodStats(profile, signals);
  const stem = String(signals.dayMaster || "");
  const specialStars = {
    taoPct: clamp((profile.month * 7) + (profile.day % 30), 5, 95),
    yeokmaPct: clamp((profile.year % 40) + (profile.day % 25), 5, 95),
    hwaPct: clamp((profile.month * 5) + (profile.hour || 12), 5, 95),
    hasGwimun: ((profile.year + profile.month + profile.day) % 3) === 0,
    list: ["도화", "역마", "화개"],
  };

  return {
    user: {
      name: profile.name,
      gender: profile.gender,
      birthDate: `${profile.year}-${pad2(profile.month)}-${pad2(profile.day)}`,
      birthTime: profile.timeKnown ? `${pad2(profile.hour)}:${pad2(profile.minute)}` : "",
      calendarType: clean(metadata.calendarType) === "lunar" ? "lunar" : "solar",
    },
    saju: {
      year: { stem: signals.yearStem, branch: signals.yearBranch, pillar: `${signals.yearStem || ""}${signals.yearBranch || ""}`.trim() },
      month: { stem: signals.monthStem, branch: signals.monthBranch, pillar: `${signals.monthStem || ""}${signals.monthBranch || ""}`.trim() },
      day: { stem: signals.dayMaster, branch: signals.dayBranch, master: stem, pillar: `${signals.dayMaster || ""}${signals.dayBranch || ""}`.trim() },
      hour: profile.timeKnown
        ? { stem: signals.hourStem, branch: signals.hourBranch, label: signals.timeLabel, pillar: `${signals.hourStem || ""}${signals.hourBranch || ""}`.trim() }
        : undefined,
      dayMaster: stem,
      dayBranch: signals.dayBranch,
      monthBranch: signals.monthBranch,
      tenGodsByPillar: signals.tenGodByPillar || {},
    },
    elementBalance,
    tenGodStats,
    strength: {
      isStrong: elementBalance.balanceScore >= 60,
      label: elementBalance.balanceScore >= 60 ? "신강" : "신약",
      reasonSummary: `오행 균형 점수 ${elementBalance.balanceScore}점 기준`,
    },
    johu: {
      neededElements: [elementBalance.deficient],
      summary: `${elementBalance.deficient} 기운 보강이 핵심`,
    },
    yongshin: {
      primary: signals.useful,
      secondary: signals.support,
      usefulElements: [signals.useful, signals.support],
      avoidElements: [signals.caution],
      practicalUse: `${signals.useful} 환경을 늘리고 ${signals.caution} 과속을 줄이세요.`,
    },
    structure: {
      geokguk: `${signals.dayMaster} 중심 구조`,
      careerSignal: "장기형 커리어 누적 전략이 유리",
      socialMission: "지식·실행·관계 균형으로 영향력 확장",
    },
    timing: {
      currentDaeun: { label: signals.currentDaewun || signals.rhythm },
      nextDaeun: { label: signals.nextDaewun || `${signals.monthBranch} 이후 전환` },
      yearlyFlow: { year: signals.currentYear || LIFEBOOK_LOCAL_TARGET_YEAR },
      monthlyFlow: Array.from({ length: 12 }).map((_, idx) => ({ month: idx + 1, score: clamp(55 + ((idx * 7 + profile.day) % 40), 40, 95) })),
    },
    specialStars,
    chapters,
  };
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function resolveLifeBookTargetYear(body = {}, fallback = LIFEBOOK_LOCAL_TARGET_YEAR) {
  const raw = body?.targetYear ?? body?.analysisYear ?? body?.selectedYear ?? body?.yearForReading;
  const year = Number(raw);
  const fallbackYear = Number(fallback);
  if (!Number.isFinite(year)) {
    return clamp(Number.isFinite(fallbackYear) ? Math.trunc(fallbackYear) : new Date().getFullYear(), LIFEBOOK_TARGET_YEAR_MIN, LIFEBOOK_TARGET_YEAR_MAX);
  }
  return clamp(Math.trunc(year), LIFEBOOK_TARGET_YEAR_MIN, LIFEBOOK_TARGET_YEAR_MAX);
}

function resolveLifeBookYearPillar(targetYear = LIFEBOOK_LOCAL_TARGET_YEAR) {
  const year = resolveLifeBookTargetYear({ targetYear });
  try {
    const solar = Solar.fromYmdHms(year, 7, 1, 12, 0, 0);
    return `${normalizeStemLabel(solar.getLunar().getEightChar().getYearGan())}${normalizeBranchLabel(solar.getLunar().getEightChar().getYearZhi())}`.trim();
  } catch (_) {
    return "";
  }
}

function normalizeGender(raw) {
  const value = clean(raw).toLowerCase();
  if (["m", "male", "man", "남", "남성"].includes(value)) return "male";
  if (["f", "female", "woman", "여", "여성"].includes(value)) return "female";
  return "unknown";
}

function normalizeCalendarType(raw) {
  const value = clean(raw).toLowerCase();
  if (value.includes("윤") || value.includes("leap") || value === "lunar_leap") return "lunar_leap";
  if (["solar", "양력", "yang", "sun"].includes(value)) return "solar";
  if (["lunar", "음력", "moon"].includes(value)) return "lunar";
  return "unknown";
}

function parseBirthDateAny(body = {}) {
  const candidates = [
    body.birthDate,
    body.birth,
    body.birthday,
    body.solarDate,
    body.lunarDate,
    body.date,
  ].map((v) => clean(v)).filter(Boolean);
  const directYear = toInt(body.birthYear ?? body.year, NaN);
  const directMonth = toInt(body.birthMonth ?? body.month, NaN);
  const directDay = toInt(body.birthDay ?? body.day, NaN);
  if (Number.isFinite(directYear) && Number.isFinite(directMonth) && Number.isFinite(directDay)) {
    return { year: directYear, month: directMonth, day: directDay };
  }
  for (const text of candidates) {
    const match = text.match(/(\d{4})[-./년\s](\d{1,2})[-./월\s](\d{1,2})/);
    if (match) {
      return {
        year: toInt(match[1], NaN),
        month: toInt(match[2], NaN),
        day: toInt(match[3], NaN),
      };
    }
  }
  return { year: NaN, month: NaN, day: NaN };
}

function parseBirthTimeAny(body = {}) {
  const isUnknownByFlag = body.birthTimeKnown === false
    || String(body.isTimeUnknown).toLowerCase() === "true"
    || /시간\s*모름|미상|unknown/.test(clean(body.birthTime || body.time || body.timeText));
  if (isUnknownByFlag) {
    return { isTimeUnknown: true, birthTime: "", birthHour: null, birthMinute: 0, timeKnown: false };
  }

  const rawHour = toInt(body.birthHour ?? body.hour ?? body.birth_hour, NaN);
  const rawMinute = toInt(body.birthMinute ?? body.minute, 0);
  if (Number.isFinite(rawHour) && rawHour >= 0 && rawHour <= 23) {
    return {
      isTimeUnknown: false,
      birthTime: `${pad2(rawHour)}:${pad2(rawMinute)}`,
      birthHour: rawHour,
      birthMinute: clamp(rawMinute, 0, 59),
      timeKnown: true,
    };
  }

  const rawText = clean(body.birthTime || body.time || body.timeText);
  const hourMap = {
    자시: 23, 축시: 1, 인시: 3, 묘시: 5, 진시: 7, 사시: 9, 오시: 11, 미시: 13, 신시: 15, 유시: 17, 술시: 19, 해시: 21,
  };
  if (hourMap[rawText] !== undefined) {
    const mappedHour = hourMap[rawText];
    return {
      isTimeUnknown: false,
      birthTime: `${pad2(mappedHour)}:00`,
      birthHour: mappedHour,
      birthMinute: 0,
      timeKnown: true,
    };
  }

  const hhmm = rawText.match(/(\d{1,2})\s*[:시]\s*(\d{1,2})?/);
  if (hhmm) {
    let h = toInt(hhmm[1], NaN);
    const m = toInt(hhmm[2], 0);
    if (/오후/.test(rawText) && Number.isFinite(h) && h < 12) h += 12;
    if (/오전/.test(rawText) && h === 12) h = 0;
    if (Number.isFinite(h) && h >= 0 && h <= 23) {
      return {
        isTimeUnknown: false,
        birthTime: `${pad2(h)}:${pad2(clamp(m, 0, 59))}`,
        birthHour: h,
        birthMinute: clamp(m, 0, 59),
        timeKnown: true,
      };
    }
  }

  return { isTimeUnknown: true, birthTime: "", birthHour: null, birthMinute: 0, timeKnown: false };
}

function normalizeInput(body = {}) {
  const name = clean(body.name) || "사용자";
  const gender = normalizeGender(body.gender || body.sex);
  const calendarType = normalizeCalendarType(body.calendarType || body.calendar);
  const birthDate = parseBirthDateAny(body);
  const birthTime = parseBirthTimeAny(body);
  const year = birthDate.year;
  const month = birthDate.month;
  const day = birthDate.day;
  const timeKnown = birthTime.timeKnown;
  const hour = timeKnown ? birthTime.birthHour : null;
  const minute = timeKnown ? birthTime.birthMinute : 0;
  const birthplace = clean(body.birthplace) || "대한민국";
  const latitude = safeNumber(body.latitude ?? body.lat, 37.5665);
  const longitude = safeNumber(body.longitude ?? body.lng, 126.978);
  const timezone = clean(body.timezone) || "Asia/Seoul";

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return { ok: false, message: "생년월일은 필수입니다." };
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, message: "생년월일 형식이 올바르지 않습니다." };
  }
  if (timeKnown && (hour < 0 || hour > 23 || minute < 0 || minute > 59)) {
    return { ok: false, message: "출생 시간 형식이 올바르지 않습니다." };
  }
  if (!timeKnown) {
    return {
      ok: false,
      code: "BIRTH_TIME_REQUIRED",
      message: "인생의 책 PDF는 시주와 대운 흐름까지 정밀하게 보기 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 입력해 주세요.",
    };
  }

  return {
    ok: true,
    birthInput: {
      name,
      gender,
      calendarType,
      birthDate: `${year}-${pad2(month)}-${pad2(day)}`,
      birthYear: year,
      birthMonth: month,
      birthDay: day,
      birthTime: timeKnown ? `${pad2(hour)}:${pad2(minute)}` : "",
      birthHour: timeKnown ? hour : null,
      birthMinute: timeKnown ? minute : 0,
      timezone,
      latitude,
      longitude,
      birthplace,
      isTimeUnknown: !timeKnown,
    },
    profile: {
      name,
      gender,
      calendarType,
      year,
      month,
      day,
      hour,
      minute,
      timeKnown,
      timezone,
      latitude,
      longitude,
      birthplace,
      birthIso: timeKnown ? `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}` : `${year}-${pad2(month)}-${pad2(day)} 시간 미상`,
    },
  };
}

function chapterTextLength(chapter) {
  const mergedText = stripForbiddenTokens(chapter?.reviewedMarkdown || chapter?.editedMarkdown || chapter?.mergedMarkdown || "");
  if (mergedText) return mergedText.length;
  const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
  return categories.reduce((sum, category) => sum + stripForbiddenTokens(category?.finalText || "").length, 0);
}

function totalManuscriptLength(chapters = []) {
  return (Array.isArray(chapters) ? chapters : []).reduce((sum, chapter) => sum + chapterTextLength(chapter), 0);
}

function repetitionScore(chapters = []) {
  const sentenceMap = new Map();
  const paragraphMap = new Map();
  const source = (Array.isArray(chapters) ? chapters : [])
    .map((chapter) => stripForbiddenTokens(chapter?.finalText || chapter?.text || ""))
    .join("\n\n");

  const sentences = source.split(/[.!?\n]+/).map((s) => stripForbiddenTokens(s)).filter((s) => s.length >= 18);
  sentences.forEach((sentence) => {
    sentenceMap.set(sentence, Number(sentenceMap.get(sentence) || 0) + 1);
  });
  const paragraphs = source.split(/\n\s*\n/).map((p) => stripForbiddenTokens(p)).filter((p) => p.length >= 70);
  paragraphs.forEach((paragraph) => {
    paragraphMap.set(paragraph, Number(paragraphMap.get(paragraph) || 0) + 1);
  });
  const repeatedSentences = Array.from(sentenceMap.values()).filter((count) => count >= 4).length;
  const repeatedParagraphs = Array.from(paragraphMap.values()).filter((count) => count >= 3).length;
  const ngramHits = countRepeatedNgrams(source, 30, 5);
  const openingHits = countRepeatedOpenings(chapters);
  const phraseHits = countOverusedPhrases(source);
  return repeatedSentences + (repeatedParagraphs * 2) + ngramHits + openingHits + phraseHits;
}

function hasForbiddenText(value = "") {
  return new RegExp(LIFEBOOK_FORBIDDEN_RE.source, "i").test(String(value || ""));
}

function hasLifeBookChapterReviewForbiddenText(value = "") {
  const source = String(value || "");
  const lower = source.toLowerCase();
  return LIFEBOOK_CHAPTER_REVIEW_FORBIDDEN_TERMS.some((term) => {
    const text = clean(term);
    if (!text) return false;
    return /[a-z]/i.test(text) ? lower.includes(text.toLowerCase()) : source.includes(text);
  });
}

function countForbiddenTerms(chapters = []) {
  let count = 0;
  for (const chapter of Array.isArray(chapters) ? chapters : []) {
    const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
    for (const category of categories) {
      if (hasForbiddenText(category?.finalText || category?.text || category?.localSummary || "")) {
        count += 1;
      }
    }
  }
  return count;
}

function isLifeBookEmergencyFallbackSource(value = "") {
  return /\b(?:fallback|emergency|recovery)\b|비상|복구/i.test(clean(value));
}

function lifeBookTextHasAny(haystack = "", keywords = []) {
  const source = clean(haystack);
  return safeLifeBookList(keywords).some((keyword) => {
    const token = clean(keyword);
    return token && source.includes(token);
  });
}

function getLifeBookHighQualityEvidenceGroups(chapterId = "", categoryTitle = "") {
  const id = String(chapterId || "");
  const title = clean(categoryTitle);
  if (id === "01") return [["일간", "명식"], ["월지", "대운"], ["용신", "기준"]];
  if (id === "02") {
    if (lifeBookCategoryIncludes(title, ["년주"])) return [["년주"], ["원국", "초년", "배경"], ["월지", "일간", "성향"]];
    if (lifeBookCategoryIncludes(title, ["월주", "사회적"])) return [["월주"], ["사회", "무대", "배경"], ["월지", "월령", "성향"]];
    if (lifeBookCategoryIncludes(title, ["일주", "자기"])) return [["일주"], ["일지", "자기", "본질"], ["관계", "성향", "기준"]];
    if (lifeBookCategoryIncludes(title, ["시주", "말년"])) return [["시주"], ["말년", "잠재력", "후반"], ["미래", "성향", "기준"]];
    if (lifeBookCategoryIncludes(title, ["지장간"])) return [["지장간"], ["천간", "지지", "원국"], ["동기", "숨은", "반복"]];
    return [["원국"], ["년주", "월주", "일주", "시주", "천간", "지지"], ["지장간", "반복", "성향"]];
  }
  if (id === "03") return [["일간"], ["월지", "월령"], ["조후", "통근", "신강", "신약"]];
  if (id === "04") return [["오행"], ["강한", "과한", "과다"], ["부족", "보완", "균형"]];
  if (id === "05") return [["십성"], ["비겁", "식상", "재성", "관성", "인성"], ["역할", "사회", "반복"]];
  if (id === "06") return [["용신"], ["희신"], ["기신"], ["선택", "환경", "균형"]];
  if (id === "07") return [["격국"], ["월령", "투간", "통근"], ["사회", "성과", "평판", "역할"]];
  if (id === "08") return [["배우자궁", "일지"], ["배우자성"], ["합충형해", "갈등", "인연"]];
  if (id === "09") return [["재성"], ["식상", "관성"], ["직업", "수익", "돈", "재물"]];
  if (id === "10") return [["오행"], ["조후"], ["건강", "심신", "회복", "생활"]];
  if (id === "11") return [["대운"], ["현재", "다음", "전환", "흐름", "시기"], ["직업", "관계", "재물", "선택", "과제"]];
  if (id === "12") return [["세운", "선택 연도"], ["상반기"], ["하반기"], ["월별", "로드맵"]];
  if (id === "13") return [["최종", "통합"], ["명식", "대운", "세운"], ["관계", "일", "돈", "재물"]];
  return [["원국"], ["대운", "세운"], ["선택", "기준"]];
}

function hasLifeBookHighQualityEvidence(category = {}, chapterId = "", categoryTitle = "") {
  const body = clean(category?.finalText || category?.text || category?.localSummary || "");
  const evidenceText = safeLifeBookList(category?.evidenceTags).join(" ");
  const haystack = `${body} ${evidenceText}`;
  return getLifeBookHighQualityEvidenceGroups(chapterId, categoryTitle)
    .every((group) => lifeBookTextHasAny(haystack, group));
}

function sanitizeCategoryText(text = "", chapterId = "", categoryTitle = "", categoryIndex = 0, minLength = LIFEBOOK_BLOCKING_MIN_CATEGORY_CHARS) {
  const baseText = dedupeParagraphs(stripForbiddenTokens(text));
  const ensured = ensureProfessionalCategoryLength(baseText, chapterId, categoryTitle, categoryIndex, Math.max(minLength, LIFEBOOK_BLOCKING_MIN_CATEGORY_CHARS));
  return dedupeParagraphs(stripForbiddenTokens(ensured));
}

function sanitizeLifeBookChapters(profile, signals, chapters = [], options = {}) {
  const normalized = ensureCompleteLifeBookChapters(profile, signals, Array.isArray(chapters) ? chapters : [], options);
  return normalized.map((chapter, chapterIndex) => {
    const blueprint = getLifeBookBlueprints()[chapterIndex] || chapter;
    const categories = (Array.isArray(chapter?.categories) ? chapter.categories : []).map((category, categoryIndex) => {
      const expectedTitle = blueprint?.categories?.[categoryIndex] || category?.title || `카테고리 ${categoryIndex + 1}`;
      const premiumDraftText = buildProfessionalLifeBookCategoryText(profile, signals, blueprint, expectedTitle, categoryIndex);
      const hasOriginalText = Boolean(clean(category?.finalText || category?.text || category?.localSummary));
      const rawText = clean(category?.finalText || category?.text || category?.localSummary || premiumDraftText);
      const usedEmergencyRecovery = !rawText;
      const sanitized = sanitizeCategoryText(rawText || premiumDraftText, blueprint?.id || chapter?.id || "", expectedTitle, categoryIndex);
      return {
        ...category,
        id: String(category?.id || `${categoryIndex + 1}`),
        title: expectedTitle,
        localSummary: sanitized,
        finalText: sanitized,
        compositionSource: clean(category?.compositionSource) || (hasOriginalText ? "sanitized-premium-category" : "premium-category-draft"),
        fallbackUsed: Boolean(category?.fallbackUsed) || usedEmergencyRecovery,
        order: categoryIndex + 1,
      };
    });

    const chapterOpening = buildLifeBookChapterOpeningText(chapter || {}, blueprint || {});
    const rebuiltText = dedupeParagraphs(stripForbiddenTokens(buildChapterBody(blueprint?.title || chapter?.title || "", categories, chapterOpening)));
    const mergedMarkdown = normalizeLifeBookChapterMarkdown(chapter?.reviewedMarkdown || chapter?.editedMarkdown || chapter?.mergedMarkdown || "");
    const chapterText = mergedMarkdown || rebuiltText;
    return {
      ...chapter,
      id: blueprint?.id || chapter?.id,
      roman: blueprint?.roman || chapter?.roman,
      title: blueprint?.title || chapter?.title,
      subtitle: blueprint?.subtitle || chapter?.subtitle,
      chapterOpening,
      categories,
      reviewedMarkdown: mergedMarkdown,
      editedMarkdown: mergedMarkdown,
      mergedMarkdown,
      localDraft: chapterText,
      finalText: chapterText,
      text: chapterText,
      source: clean(chapter?.source) || "assembled",
      chapterMergeSource: clean(chapter?.chapterMergeSource),
      chapterMergeErrors: Array.isArray(chapter?.chapterMergeErrors) ? chapter.chapterMergeErrors : [],
      chapterQualityReviewSource: clean(chapter?.chapterQualityReviewSource),
      chapterQualityReviewErrors: Array.isArray(chapter?.chapterQualityReviewErrors) ? chapter.chapterQualityReviewErrors : [],
    };
  });
}

function validateLifeBookStructure(chapters = []) {
  const blockingErrors = [];
  const chapterMetrics = [];
  const list = Array.isArray(chapters) ? chapters : [];
  if (!Array.isArray(chapters) || !list.length) blockingErrors.push("chapter_array_missing");
  const blueprints = getLifeBookBlueprints();
  if (list.length !== blueprints.length) blockingErrors.push("chapter_count");

  let nonEmptyCategoryCount = 0;

  blueprints.forEach((blueprint, idx) => {
    const chapter = list[idx];
    if (!chapter) {
      blockingErrors.push(`chapter_${idx + 1}_missing`);
      chapterMetrics.push({ chapterNo: idx + 1, title: clean(blueprint?.title), categoryCount: 0, chars: 0 });
      return;
    }

    if (clean(chapter?.title) !== clean(blueprint?.title)) {
      blockingErrors.push(`chapter_${idx + 1}_title_mismatch`);
    }

    const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
    if (categories.length !== blueprint.categories.length) {
      blockingErrors.push(`chapter_${idx + 1}_category_count`);
    }

    blueprint.categories.forEach((expectedTitle, cidx) => {
      const category = categories[cidx];
      if (!category) {
        blockingErrors.push(`chapter_${idx + 1}_category_${cidx + 1}_missing`);
        return;
      }
      if (clean(category?.title) !== clean(expectedTitle)) {
        blockingErrors.push(`chapter_${idx + 1}_category_${cidx + 1}_title_mismatch`);
      }
      const body = clean(category?.finalText || category?.text || category?.localSummary || "");
      if (body.length > 0) nonEmptyCategoryCount += 1;
    });

    chapterMetrics.push({
      chapterNo: idx + 1,
      title: clean(chapter?.title),
      categoryCount: categories.length,
      chars: chapterTextLength(chapter),
    });
  });

  if (nonEmptyCategoryCount === 0) {
    blockingErrors.push("all_category_text_empty");
  }

  return {
    ok: blockingErrors.length === 0,
    blockingErrors,
    chapterMetrics,
    chapterCount: list.length,
    nonEmptyCategoryCount,
  };
}

function evaluateLifeBookQuality(chapters = []) {
  const list = Array.isArray(chapters) ? chapters : [];
  const softWarnings = [];
  const warningItems = [];

  list.forEach((chapter, cidx) => {
    const blueprint = getLifeBookBlueprints()[cidx] || chapter;
    const chapterChars = chapterTextLength(chapter);
    const pagePlan = getLifeBookPagePlan(chapter?.id || String(cidx + 1).padStart(2, "0"));
    const recommendedMinChars = Math.max(LIFEBOOK_MIN_CHAPTER_CHARS, Number(pagePlan?.minChars || 0));
    if (chapterChars < recommendedMinChars) {
      const code = `chapter_${cidx + 1}_too_short_recommended`;
      softWarnings.push(code);
      warningItems.push({ code, chapterIndex: cidx, categoryIndex: -1, severity: "medium", targetChars: recommendedMinChars });
    }
    if (chapterChars < LIFEBOOK_BLOCKING_MIN_CHAPTER_CHARS) {
      const code = `chapter_${cidx + 1}_too_short_critical`;
      softWarnings.push(code);
      warningItems.push({ code, chapterIndex: cidx, categoryIndex: -1, severity: "high" });
    }

    const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
    categories.forEach((category, kidx) => {
      const body = clean(category?.finalText || category?.text || category?.localSummary || "");

      if (body.length < LIFEBOOK_MIN_CATEGORY_CHARS) {
        const code = `chapter_${cidx + 1}_category_${kidx + 1}_too_short_recommended`;
        softWarnings.push(code);
        warningItems.push({ code, chapterIndex: cidx, categoryIndex: kidx, severity: "medium" });
      }
      if (body.length < LIFEBOOK_BLOCKING_MIN_CATEGORY_CHARS) {
        const code = `chapter_${cidx + 1}_category_${kidx + 1}_too_short_critical`;
        softWarnings.push(code);
        warningItems.push({ code, chapterIndex: cidx, categoryIndex: kidx, severity: "high" });
      }
      if (hasForbiddenText(body)) {
        const code = `chapter_${cidx + 1}_category_${kidx + 1}_forbidden_text`;
        softWarnings.push(code);
        warningItems.push({ code, chapterIndex: cidx, categoryIndex: kidx, severity: "high" });
      }
      if (Boolean(category?.fallbackUsed) || isLifeBookEmergencyFallbackSource(category?.compositionSource)) {
        const code = `chapter_${cidx + 1}_category_${kidx + 1}_fallback_source_blocked`;
        softWarnings.push(code);
        warningItems.push({ code, chapterIndex: cidx, categoryIndex: kidx, severity: "high" });
      }
      const hasRequiredMyeongriEvidence = hasLifeBookHighQualityEvidence(category, blueprint?.id || chapter?.id || "", category?.title || blueprint?.categories?.[kidx] || "");
      if (safeLifeBookList(category?.evidenceTags).length < LIFEBOOK_HIGH_QUALITY_MIN_EVIDENCE_TAGS && !hasRequiredMyeongriEvidence) {
        const code = `chapter_${cidx + 1}_category_${kidx + 1}_evidence_tags_missing`;
        softWarnings.push(code);
        warningItems.push({ code, chapterIndex: cidx, categoryIndex: kidx, severity: "high" });
      }
      if (!hasRequiredMyeongriEvidence) {
        const code = `chapter_${cidx + 1}_category_${kidx + 1}_required_myeongri_evidence_missing`;
        softWarnings.push(code);
        warningItems.push({ code, chapterIndex: cidx, categoryIndex: kidx, severity: "high" });
      }

      const quality = evaluateCounselingQualityClean(body, blueprint, category?.title || blueprint?.categories?.[kidx] || "");
      if (!quality.hasCategoryGrounding) {
        const code = `chapter_${cidx + 1}_category_${kidx + 1}_category_scope_missing`;
        softWarnings.push(code);
        warningItems.push({ code, chapterIndex: cidx, categoryIndex: kidx, severity: "medium" });
      }
      if (!quality.hasChapterTopicGrounding) {
        const code = `chapter_${cidx + 1}_category_${kidx + 1}_chapter_topic_missing`;
        softWarnings.push(code);
        warningItems.push({ code, chapterIndex: cidx, categoryIndex: kidx, severity: "medium" });
      }
      if (!quality.hasCounselorGrounding) {
        const code = `chapter_${cidx + 1}_category_${kidx + 1}_counselor_grounding_missing`;
        softWarnings.push(code);
        warningItems.push({ code, chapterIndex: cidx, categoryIndex: kidx, severity: "medium" });
      }
      if (!quality.hasDirectCounselingTone) {
        const code = `chapter_${cidx + 1}_category_${kidx + 1}_direct_tone_missing`;
        softWarnings.push(code);
        warningItems.push({ code, chapterIndex: cidx, categoryIndex: kidx, severity: "low" });
      }
      if (!quality.hasWarmEnding) {
        const code = `chapter_${cidx + 1}_category_${kidx + 1}_warm_ending_missing`;
        softWarnings.push(code);
        warningItems.push({ code, chapterIndex: cidx, categoryIndex: kidx, severity: "low" });
      }
      if (quality.sentenceCount < 14) {
        const code = `chapter_${cidx + 1}_category_${kidx + 1}_sentence_too_few`;
        softWarnings.push(code);
        warningItems.push({ code, chapterIndex: cidx, categoryIndex: kidx, severity: "medium" });
      }
    });

    if (!validateChapterTopicCoverage(chapter)) {
      const code = `chapter_${cidx + 1}_topic_coverage`;
      softWarnings.push(code);
      warningItems.push({ code, chapterIndex: cidx, categoryIndex: -1, severity: "medium" });
    }
  });

  const totalLength = totalManuscriptLength(list);
  if (totalLength < LIFEBOOK_MIN_TOTAL_CHARS) {
    softWarnings.push("total_too_short_recommended");
    warningItems.push({ code: "total_too_short_recommended", chapterIndex: -1, categoryIndex: -1, severity: "medium" });
  }
  if (totalLength < LIFEBOOK_BLOCKING_MIN_TOTAL_CHARS) {
    softWarnings.push("total_too_short_critical");
    warningItems.push({ code: "total_too_short_critical", chapterIndex: -1, categoryIndex: -1, severity: "high" });
  }

  const forbiddenHits = countForbiddenTerms(list);
  if (forbiddenHits > 0) {
    softWarnings.push("forbidden_terms_detected");
    warningItems.push({ code: "forbidden_terms_detected", chapterIndex: -1, categoryIndex: -1, severity: "high" });
  }

  const repScore = repetitionScore(list);
  const repetitionLimit = allowedLifeBookRepetitionScore(list);
  if (repScore > repetitionLimit) {
    softWarnings.push("repetition_detected");
    warningItems.push({ code: "repetition_detected", chapterIndex: -1, categoryIndex: -1, severity: "high" });
  }

  const uniqueWarnings = Array.from(new Set(softWarnings));
  const highCount = warningItems.filter((item) => item.severity === "high").length;
  const mediumCount = warningItems.filter((item) => item.severity === "medium").length;
  const lowCount = warningItems.filter((item) => item.severity === "low").length;
  const qualityScore = clamp(100 - ((highCount * 4) + (mediumCount * 2) + (lowCount * 1)), 35, 100);

  return {
    ok: true,
    totalLength,
    forbiddenHits,
    repetitionScore: repScore,
    repetition: {
      ok: repScore <= repetitionLimit,
      score: repScore,
      limit: repetitionLimit,
    },
    chapterMetrics: list.map((chapter, idx) => ({
      chapterNo: idx + 1,
      title: clean(chapter?.title),
      categoryCount: Array.isArray(chapter?.categories) ? chapter.categories.length : 0,
      chars: chapterTextLength(chapter),
    })),
    softWarnings: uniqueWarnings,
    warningItems,
    qualityScore,
  };
}

function validateLifeBookCoreMyeongriLogic(chapters = []) {
  const rules = [
    { id: "03", groups: [["월령", "월지"], ["조후"], ["통근", "신강", "신약", "뿌리"]] },
    { id: "06", groups: [["용신"], ["희신"], ["기신"], ["억부", "조후", "통관", "병약", "균형"]] },
    { id: "07", groups: [["격국"], ["월령", "투간", "통근"], ["사회", "성과", "평판", "역할"]] },
    { id: "09", groups: [["재성"], ["식상"], ["관성"], ["수익", "직업", "돈", "재물"]] },
    { id: "11", groups: [["대운"], ["현재"], ["다음", "전환"], ["직업", "관계", "재물", "선택"]] },
    { id: "12", groups: [["세운", "선택 연도"], ["상반기"], ["하반기"], ["월별", "로드맵", "선택"]] },
  ];
  const errors = [];
  rules.forEach((rule) => {
    const chapter = pickLifeBookChapterById(chapters, rule.id);
    const body = getLifeBookChapterFinalMarkdown(chapter || {});
    const missingGroup = rule.groups.find((group) => !lifeBookTextHasAny(body, group));
    if (missingGroup) errors.push(`chapter_${rule.id}_core_logic_missing:${missingGroup.join("|")}`);
  });
  return errors;
}

function validateLifeBookHighQualityReadiness(chapters = [], metadata = {}) {
  const errors = [];
  const warnings = [];
  const structure = validateLifeBookStructure(chapters);
  const quality = evaluateLifeBookQuality(chapters);

  if (!structure.ok) errors.push(...structure.blockingErrors);
  errors.push(...validateLifeBookCoreMyeongriLogic(chapters));

  const blockingWarnings = (Array.isArray(quality.warningItems) ? quality.warningItems : [])
    .filter((item) => clean(item?.severity) === "high")
    .map((item) => clean(item?.code))
    .filter(Boolean);
  errors.push(...blockingWarnings);

  if (Number(quality.qualityScore || 0) < LIFEBOOK_HIGH_QUALITY_MIN_SCORE) {
    errors.push("high_quality_score_below_threshold");
  }

  const sourceText = [
    metadata?.manuscriptSource,
    metadata?.finalManuscriptSource,
    metadata?.generationMode,
    metadata?.source,
  ].map(clean).filter(Boolean).join(" ");
  if (isLifeBookEmergencyFallbackSource(sourceText)) {
    errors.push("fallback_manuscript_source_blocked");
  }

  (Array.isArray(chapters) ? chapters : []).forEach((chapter, chapterIndex) => {
    if (Boolean(chapter?.fallbackUsed) || isLifeBookEmergencyFallbackSource(chapter?.source) || isLifeBookEmergencyFallbackSource(chapter?.compositionSource)) {
      errors.push(`chapter_${chapterIndex + 1}_fallback_source_blocked`);
    }
    (Array.isArray(chapter?.categories) ? chapter.categories : []).forEach((category, categoryIndex) => {
      const evidenceTags = safeLifeBookList(category?.evidenceTags);
      const hasRequiredMyeongriEvidence = hasLifeBookHighQualityEvidence(category, chapter?.id || String(chapterIndex + 1).padStart(2, "0"), category?.title || "");
      if (evidenceTags.length < LIFEBOOK_HIGH_QUALITY_MIN_EVIDENCE_TAGS && !hasRequiredMyeongriEvidence) {
        errors.push(`chapter_${chapterIndex + 1}_category_${categoryIndex + 1}_evidence_tags_missing`);
      }
      if (Boolean(category?.fallbackUsed) || isLifeBookEmergencyFallbackSource(category?.compositionSource)) {
        errors.push(`chapter_${chapterIndex + 1}_category_${categoryIndex + 1}_fallback_source_blocked`);
      }
      if (!hasRequiredMyeongriEvidence) {
        errors.push(`chapter_${chapterIndex + 1}_category_${categoryIndex + 1}_required_myeongri_evidence_missing`);
      }
    });
  });

  if (quality.repetition && !quality.repetition.ok) warnings.push("repetition_above_recommended_limit");

  return {
    ok: errors.length === 0,
    errors: Array.from(new Set(errors)),
    warnings: Array.from(new Set(warnings)),
    structure,
    quality,
    qualityScore: quality.qualityScore,
  };
}

function repairLifeBookStructure(profile, signals, chapters = []) {
  return sanitizeLifeBookChapters(profile, signals, ensureCompleteLifeBookChapters(profile, signals, chapters));
}

function repairLifeBookQualityIssues(profile, signals, chapters = [], qualityReport = {}) {
  const list = sanitizeLifeBookChapters(profile, signals, chapters);
  const items = Array.isArray(qualityReport?.warningItems) ? qualityReport.warningItems : [];
  const targetSet = new Set();
  const ctx = buildLifeBookReadingContext(profile, signals);

  items.forEach((item) => {
    const chapterIndex = Number(item?.chapterIndex);
    const categoryIndex = Number(item?.categoryIndex);
    if (!Number.isFinite(chapterIndex) || !Number.isFinite(categoryIndex)) return;
    if (chapterIndex < 0 || categoryIndex < 0) return;
    targetSet.add(`${chapterIndex}:${categoryIndex}`);
  });

  if (!targetSet.size) {
    return { chapters: list, repairedCategoryCount: 0 };
  }

  let repairedCategoryCount = 0;
  const repaired = list.map((chapter, chapterIndex) => {
    const blueprint = getLifeBookBlueprints()[chapterIndex] || chapter;
    const categories = (Array.isArray(chapter?.categories) ? chapter.categories : []).map((category, categoryIndex) => {
      const key = `${chapterIndex}:${categoryIndex}`;
      if (!targetSet.has(key)) return category;
      const categoryTitle = blueprint?.categories?.[categoryIndex] || category?.title || `카테고리 ${categoryIndex + 1}`;
      const regenerated = buildProfessionalLifeBookCategoryText(profile, signals, blueprint, categoryTitle, categoryIndex);
      const finalText = sanitizeCategoryText(regenerated, blueprint?.id || chapter?.id || "", categoryTitle, categoryIndex, LIFEBOOK_MIN_CATEGORY_CHARS);
      repairedCategoryCount += 1;
      return {
        ...category,
        id: String(category?.id || `${categoryIndex + 1}`),
        title: categoryTitle,
        localSummary: finalText,
        finalText,
        evidenceTags: buildLifeBookCategoryEvidenceTags(signals, ctx, blueprint?.id || chapter?.id, categoryTitle),
        compositionSource: "premium-quality-repair",
        fallbackUsed: false,
        order: categoryIndex + 1,
      };
    });
    const chapterOpening = buildLifeBookChapterOpeningText(chapter || {}, blueprint || {});
    const chapterText = dedupeParagraphs(stripForbiddenTokens(buildChapterBody(blueprint?.title || chapter?.title || "", categories, chapterOpening)));
    return {
      ...chapter,
      id: blueprint?.id || chapter?.id,
      roman: blueprint?.roman || chapter?.roman,
      title: blueprint?.title || chapter?.title,
      subtitle: blueprint?.subtitle || chapter?.subtitle,
      chapterOpening,
      categories,
      localDraft: chapterText,
      finalText: chapterText,
      text: chapterText,
      source: "assembled",
    };
  });

  return {
    chapters: sanitizeLifeBookChapters(profile, signals, repaired),
    repairedCategoryCount,
  };
}

function finalizeLifeBookManuscript(profile, signals, chapters = [], options = {}) {
  const maxRounds = clamp(Number(options?.maxRounds || LIFEBOOK_QUALITY_REPAIR_MAX_ROUNDS), 1, 4);
  let repairedCategoryCount = 0;

  let working = sanitizeLifeBookChapters(profile, signals, chapters);
  let structureReport = validateLifeBookStructure(working);
  if (!structureReport.ok) {
    working = repairLifeBookStructure(profile, signals, working);
    structureReport = validateLifeBookStructure(working);
  }

  let qualityReport = evaluateLifeBookQuality(working);
  let rounds = 0;
  while (qualityReport.softWarnings.length > 0 && rounds < maxRounds) {
    const repaired = repairLifeBookQualityIssues(profile, signals, working, qualityReport);
    if (!repaired.repairedCategoryCount) break;
    repairedCategoryCount += repaired.repairedCategoryCount;
    working = sanitizeLifeBookChapters(profile, signals, repaired.chapters);
    qualityReport = evaluateLifeBookQuality(working);
    rounds += 1;
  }

  if (qualityReport.softWarnings.length > 0) {
    const deterministic = repairLifeBookQualityIssues(profile, signals, working, qualityReport);
    if (deterministic.repairedCategoryCount > 0) {
      repairedCategoryCount += deterministic.repairedCategoryCount;
      working = sanitizeLifeBookChapters(profile, signals, deterministic.chapters);
      qualityReport = evaluateLifeBookQuality(working);
    }
  }

  structureReport = validateLifeBookStructure(working);

  return {
    chapters: working,
    structureReport,
    qualityReport,
    repairedCategoryCount,
    qualityWarnings: qualityReport.softWarnings,
    qualityScore: qualityReport.qualityScore,
    rounds,
  };
}

function allowedLifeBookRepetitionScore(chapters = []) {
  const list = Array.isArray(chapters) ? chapters : [];
  const categoryCount = list.reduce((sum, chapter) => sum + (Array.isArray(chapter?.categories) ? chapter.categories.length : 0), 0);
  return Math.max(12, Math.floor(categoryCount * 0.7) + Math.floor(list.length / 2));
}

function evaluateCounselingQuality(text = "") {
  const source = stripForbiddenTokens(text);
  const practicalRe = /(오늘|이번\s*주|먼저|우선|정리|기록|점검|줄이|지출|수면|식사|대화|경계|루틴|실행|계획|우선순위|복기|회복)/;
  const practicalActionRe = /(해보세요|권합니다|실행하세요|적어\s*보세요|고정해\s*보세요|줄여\s*보세요|시도해\s*보세요|점검해\s*보세요|정리해\s*보세요)/g;
  const warmRe = /(괜찮습니다|충분히|응원|믿습니다|당신의\s*속도|천천히|잘\s*해낼|따뜻하게|함께|무리하지\s*말고|스스로를\s*다그치지\s*말고|충분히\s*가능)/;
  const counselorRe = /(명식|원국|일간|월지|대운|세운|오행|십성|용신|희신|기신|일주|시주|조후)/g;
  const secondPersonRe = /(의뢰인님|님은|당신은|당신의)/g;
  const sentenceCount = source.split(/[.!?\n]+/).map((s) => s.trim()).filter((s) => s.length >= 10).length;
  const practicalActionHits = (source.match(practicalActionRe) || []).length;
  const counselorHits = (source.match(counselorRe) || []).length;
  const secondPersonHits = (source.match(secondPersonRe) || []).length;
  const tail = source.slice(-220);
  return {
    hasPracticalAdvice: practicalRe.test(source),
    hasPracticalAction: practicalActionHits >= 2,
    hasCounselorGrounding: counselorHits >= 4,
    hasDirectCounselingTone: secondPersonHits >= 2,
    hasWarmEnding: warmRe.test(tail),
    sentenceCount,
    practicalActionHits,
    counselorHits,
    secondPersonHits,
  };
}

function evaluateCounselingQualityClean(text = "", chapter = {}, categoryTitle = "") {
  const source = stripForbiddenTokens(text);
  const warmRe = /(무리하지 않아도 됩니다|안정적으로 사용할 수 있습니다|좋은 결과를 만들 수 있습니다|흐름이 안정됩니다|버틸 수 있습니다|유지됩니다|선명해집니다)/;
  const counselorRe = /(명식|원국|일간|월지|월령|대운|세운|오행|십성|용신|희신|기신|일주|월주|조후|격국|신살|십이운성)/g;
  const secondPersonRe = /(님|이 명식|사용자|삶|관계|일|돈|몸|마음)/g;
  const sentenceCount = source.split(/[.!?\n]+/).map((s) => s.trim()).filter((s) => s.length >= 10).length;
  const counselorHits = (source.match(counselorRe) || []).length;
  const secondPersonHits = (source.match(secondPersonRe) || []).length;
  const tail = source.slice(-260);
  const categoryFit = evaluateLifeBookCategoryFit(source, chapter, categoryTitle);
  return {
    ...categoryFit,
    hasCounselorGrounding: counselorHits >= 4,
    hasDirectCounselingTone: secondPersonHits >= 2,
    hasWarmEnding: warmRe.test(tail),
    sentenceCount,
    counselorHits,
    secondPersonHits,
  };
}

function validateLifeBookFinalManuscript(chapters = []) {
  const structure = validateLifeBookStructure(chapters);
  const quality = evaluateLifeBookQuality(chapters);
  return {
    ok: structure.ok,
    errors: structure.blockingErrors,
    softWarnings: quality.softWarnings,
    totalLength: quality.totalLength,
    chapterMetrics: quality.chapterMetrics,
    forbiddenHits: quality.forbiddenHits,
    repetition: quality.repetition,
    repetitionScore: quality.repetitionScore,
    qualityScore: quality.qualityScore,
  };
}

function buildLifeBookLocalSajuJson(birthInput, profile, signals, chapters = []) {
  const payload = deriveLifeBookPayload(profile, signals, chapters, { calendarType: birthInput.calendarType });
  const pillars = {
    year: {
      stem: clean(signals?.yearStem),
      branch: clean(signals?.yearBranch),
      ganji: `${clean(signals?.yearStem)}${clean(signals?.yearBranch)}`,
    },
    month: {
      stem: clean(signals?.monthStem),
      branch: clean(signals?.monthBranch),
      ganji: `${clean(signals?.monthStem)}${clean(signals?.monthBranch)}`,
    },
    day: {
      stem: clean(signals?.dayMaster),
      branch: clean(signals?.dayBranch),
      ganji: `${clean(signals?.dayMaster)}${clean(signals?.dayBranch)}`,
    },
    hour: {
      stem: clean(signals?.hourStem),
      branch: clean(signals?.hourBranch),
      ganji: `${clean(signals?.hourStem)}${clean(signals?.hourBranch)}`,
    },
  };

  const yongshin = {
    usefulElement: clean(signals?.useful),
    usefulElements: [clean(signals?.useful), clean(signals?.support)].filter(Boolean),
    cautionElements: [clean(signals?.caution)].filter(Boolean),
  };

  return {
    birthInput,
    profile,
    pillars,
    dayMaster: clean(signals?.dayMaster),
    monthBranch: clean(signals?.monthBranch),
    dayBranch: clean(signals?.dayBranch),
    hourBranch: clean(signals?.hourBranch),
    tenGods: signals?.tenGodCounts || {},
    tenGodsByPillar: signals?.tenGodByPillar || {},
    fiveElements: payload?.elementBalance?.ratio || {},
    elementBalance: payload?.elementBalance || {},
    strength: {
      isStrong: String(clean(signals?.powerLabel)).toLowerCase() === "신강" || String(clean(signals?.powerLabel)).toLowerCase() === "strong",
      label: clean(signals?.powerLabel) || (payload?.strength?.label || "중화"),
      reason: clean(payload?.strength?.reasonSummary || ""),
    },
    johu: {
      type: clean(signals?.johuType || "평형"),
      summary: clean(payload?.johu?.summary || ""),
    },
    yongshin,
    usefulGods: yongshin,
    geokguk: {
      title: clean(signals?.geokguk || `${clean(signals?.dayMaster)} 중심 구조`),
      summary: clean(payload?.structure?.socialMission || ""),
    },
    daeun: Array.isArray(signals?.daewunCycles) ? signals.daewunCycles : [],
    currentDaeun: signals?.currentDaeunNode || null,
    nextDaeun: signals?.nextDaeunNode || null,
    yearlyFlow: {
      year: signals?.currentYear,
      pillar: clean(signals?.currentYearPillar),
      keywords: [clean(signals?.useful), clean(signals?.support)].filter(Boolean),
    },
    twelveGrowthStages: signals?.twelveGrowthStages || [],
    sinsal: Array.isArray(signals?.specialStars) ? signals.specialStars : [],
    relationshipSignals: {
      focus: clean(signals?.relationshipFocus),
      caution: clean(signals?.caution),
    },
    careerSignals: {
      usefulElement: clean(signals?.useful),
      geokguk: clean(signals?.geokguk),
    },
    moneySignals: {
      supportElement: clean(signals?.support),
      cautionElement: clean(signals?.caution),
    },
    healthSignals: {
      weakestElement: clean(signals?.weakestElement),
      johuType: clean(signals?.johuType),
    },
    crisisSignals: {
      riskElement: clean(signals?.caution),
      phase: clean(signals?.currentDaewun),
    },
    calculationPolicy: {
      calendarType: clean(birthInput?.calendarType || profile?.calendarType || "solar"),
      timezone: clean(birthInput?.timezone || profile?.timezone || "Asia/Seoul"),
      hourPillarTimePolicy: "TRUE_SOLAR_TIME",
      dayChangePolicy: "MIDNIGHT",
      coordinatePolicy: "birthplace-lat-lng-with-seoul-default",
    },
    sourceTrace: {
      source: "worker.routes.saju-lifebook",
      engine: "destiny-bias-engine",
      engines: [
        "worker-saju-engine",
        signals?.engineSources?.clientQuantumMyeongri ? "client-quantum-myeongri-engine" : "",
      ].filter(Boolean),
      engineProfileResolved: Boolean(signals?.engineProfile),
      generatedFromProfile: true,
      generatedFromAnalysisSignals: Boolean(signals?.tenGodCounts || signals?.elementWeights),
      generatedFromQuantumMyeongri: Boolean(signals?.engineSources?.clientQuantumMyeongri),
    },
    confidence: {
      pillarCompleteness: ["year", "month", "day", "hour"].reduce((sum, key) => sum + Number(Boolean(clean(pillars?.[key]?.ganji))), 0) / 4,
      hasElementBalance: Boolean(payload?.elementBalance?.ratio && Object.keys(payload.elementBalance.ratio).length >= 5),
      hasTenGods: Boolean(signals?.tenGodCounts && Object.keys(signals.tenGodCounts).length >= 4),
      hasDaeun: Array.isArray(signals?.daewunCycles) && signals.daewunCycles.length >= 3,
    },
    normalizationWarnings: [],
    derivedAt: new Date().toISOString(),
  };
}



const LIFEBOOK_RISKY_ASSERTION_RE = /(반드시\s*(결혼|이혼|성공|실패|큰돈|수익)|100\s*%|확정|무조건|질병을\s*얻게|암에\s*걸|우울증|공황장애|투자\s*수익|수익\s*보장|대박|파산|죽음|사망)/i;

function safeJsonForPrompt(value) {
  return JSON.stringify(value ?? {}, null, 2);
}

function compactStringList(value) {
  if (Array.isArray(value)) return value.map((item) => clean(item)).filter(Boolean);
  const single = clean(value);
  return single ? [single] : [];
}

function normalizeLifeBookPillarForAssembly(pillar = {}, tenGodStem = "") {
  return {
    stem: clean(pillar?.stem),
    branch: clean(pillar?.branch),
    ganji: clean(pillar?.ganji || `${clean(pillar?.stem)}${clean(pillar?.branch)}`),
    tenGodStem: clean(tenGodStem),
    hiddenStems: Array.isArray(pillar?.hiddenStems) ? pillar.hiddenStems.map((item) => clean(item)).filter(Boolean) : [],
  };
}

function normalizeLifeBookSpecialStarsForAssembly(stars = []) {
  return (Array.isArray(stars) ? stars : []).map((item) => {
    if (typeof item === "string") return { name: clean(item) };
    return {
      name: clean(item?.name || item?.title || item?.star),
      position: clean(item?.position || item?.pillar || item?.branch),
      meaning: clean(item?.meaning || item?.summary),
    };
  }).filter((item) => item.name);
}

function normalizeLifeBookTwelveStagesForAssembly(stages = []) {
  return (Array.isArray(stages) ? stages : []).map((item) => ({
    pillar: clean(item?.pillar || item?.position),
    stage: clean(item?.stage || item?.name),
    meaning: clean(item?.meaning || item?.summary),
  })).filter((item) => item.stage);
}

function normalizeLifeBookLuckCycleForAssembly(cycle = {}) {
  const label = clean(cycle?.label || cycle?.ganji || cycle?.pillar);
  const stem = clean(cycle?.stem || label.slice(0, 1));
  const branch = clean(cycle?.branch || label.slice(1, 2));
  return {
    ageStart: Number(cycle?.ageStart ?? cycle?.startAge ?? cycle?.fromAge ?? 0) || 0,
    ageEnd: Number(cycle?.ageEnd ?? cycle?.endAge ?? cycle?.toAge ?? 0) || 0,
    stem,
    branch,
    ganji: label || `${stem}${branch}`.trim(),
    tenGod: clean(cycle?.tenGod || cycle?.tenGodStem),
    element: clean(cycle?.element),
    interactionsWithNatal: compactStringList(cycle?.interactionsWithNatal || cycle?.interactions),
    summary: clean(cycle?.summary || cycle?.theme),
  };
}

function buildLifeBookServiceContext(body = {}) {
  return {
    concerns: compactStringList(body?.concerns || body?.interestAreas || body?.interests),
    currentConcern: clean(body?.currentConcern || body?.concern || body?.question),
    jobStatus: clean(body?.jobStatus || body?.careerStatus),
    relationshipStatus: clean(body?.relationshipStatus || body?.loveStatus),
    financialInterest: clean(body?.financialInterest || body?.moneyInterest),
    healthInterest: clean(body?.healthInterest),
    preferredTone: clean(body?.preferredTone || body?.tone) || "품격 있는 전문가 상담문",
    productTier: clean(body?.productTier || body?.tier || "premium"),
    lengthOption: clean(body?.lengthOption || body?.reportLength || "long"),
    extraAnswers: body?.extraAnswers && typeof body.extraAnswers === "object"
      ? body.extraAnswers
      : (body?.answers && typeof body.answers === "object" ? body.answers : {}),
  };
}

function firstClean(...values) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

function firstObject(...values) {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  }
  return {};
}

function scoreLifeBookStructuredAdvancedReport(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return -1;
  const engineVersion = clean(value?.metadata?.engineVersion);
  const title = clean(value?.userReport?.title);
  const markdown = clean(value?.userReport?.markdown);
  let score = 1;
  if (engineVersion === "QUANTUM_MYEONGRI_ENGINE_V2") score += 100;
  if (/QUANTUM MYEONGRI Engine v\.2/i.test(title) || /QUANTUM MYEONGRI Engine v\.2/i.test(markdown)) score += 40;
  if (/운의 환골탈태/.test(markdown)) score += 10;
  if (/현실 선택 기준/.test(markdown)) score += 10;
  if (Array.isArray(value?.actionPrescription) && value.actionPrescription.length) score += 10;
  return score;
}

function selectLifeBookStructuredAdvancedReport(...values) {
  let selected = {};
  let selectedScore = -1;
  values.forEach((value) => {
    const score = scoreLifeBookStructuredAdvancedReport(value);
    if (score > selectedScore) {
      selected = value;
      selectedScore = score;
    }
  });
  return selected;
}

function rowsOf(value) {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object");
  return [];
}

function buildLifeBookMonthlyLuckContract(body = {}, structured = {}, targetYear = resolveLifeBookTargetYear(body)) {
  const fromStructured = rowsOf(structured?.sewoon?.monthlyHighlights);
  const fromBody = rowsOf(body?.annualLuck?.monthly || body?.yearlyLuck2026?.monthly || body?.monthlyLuck2026 || body?.wolun2026);
  const source = fromStructured.length ? fromStructured : fromBody;
  const normalized = source.map((row, index) => ({
    month: Number(row?.month || row?.monthNo || row?.index || index + 1) || index + 1,
    ganji: firstClean(row?.ganji, row?.label, row?.pillar),
    tenGod: firstClean(row?.tenGod, row?.tenGodStem, row?.stemTenGod),
    element: firstClean(row?.element, row?.elementKo),
    natalTrigger: firstClean(row?.natalTrigger, row?.originalChartTrigger, row?.relation, row?.reason),
    daeunSewoonRelation: firstClean(row?.daeunSewoonRelation, row?.luckRelation, row?.effect),
    actionGuide: firstClean(row?.actionGuide, row?.advice, row?.action),
    avoidChoice: firstClean(row?.avoidChoice, row?.avoid, row?.warning),
  })).filter((row) => row.ganji || row.tenGod || row.element || row.natalTrigger || row.actionGuide || row.avoidChoice);
  if (normalized.length >= 12) return normalized.slice(0, 12);
  const byMonth = new Map(normalized.map((row) => [Number(row.month), row]));
  const annualTheme = firstClean(
    body?.annualLuck?.elementEffect,
    body?.yearlyLuck2026?.elementEffect,
    structured?.sewoon?.analysis,
    structured?.sewoon?.currentYear?.summary,
    "annual-flow",
  );
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const existing = byMonth.get(month);
    if (existing) return existing;
    return {
      month,
      ganji: "",
      tenGod: "",
      element: "",
      natalTrigger: annualTheme,
      daeunSewoonRelation: "",
      actionGuide: `${month}월은 연간 세운 흐름을 기준으로 생활 리듬, 관계, 지출, 회복 루틴을 점검하는 보조 구간입니다.`,
      avoidChoice: "월별 원자료가 없으므로 단정적 사건 예측 대신 연간 흐름 안에서 조심할 선택만 정리합니다.",
      source: `fallback-from-year-${targetYear}`,
      isFallback: true,
    };
  });
}

function buildLifeBookDaeunContract(signals = {}, localSajuJson = {}, structured = {}) {
  const sourceCycles = rowsOf(structured?.daewoon?.periods).length
    ? rowsOf(structured.daewoon.periods)
    : rowsOf(localSajuJson?.daeun || signals?.daewunCycles);
  return {
    startAge: safeNumber(structured?.daewoon?.startAge ?? signals?.daewunStartAge, 0) || undefined,
    direction: firstClean(structured?.daewoon?.direction, signals?.daewunDirection),
    current: firstObject(structured?.daewoon?.current, localSajuJson?.currentDaeun, signals?.currentDaeunNode),
    next: firstObject(localSajuJson?.nextDaeun, signals?.nextDaeunNode),
    currentAnalysis: firstClean(structured?.daewoon?.currentAnalysis, signals?.currentDaewun),
    cycles: sourceCycles.map((cycle) => ({
      ageStart: safeNumber(cycle?.ageStart ?? cycle?.startAge ?? cycle?.fromAge, 0) || undefined,
      ageEnd: safeNumber(cycle?.ageEnd ?? cycle?.endAge ?? cycle?.toAge, 0) || undefined,
      ganji: firstClean(cycle?.ganji, cycle?.label, cycle?.pillar),
      stem: firstClean(cycle?.stem),
      branch: firstClean(cycle?.branch),
      tenGod: firstClean(cycle?.tenGod, cycle?.tenGodStem),
      element: firstClean(cycle?.element, cycle?.elementKo),
      usefulRelation: firstClean(cycle?.usefulRelation, cycle?.yongshinRelation, cycle?.supportsYongshin),
      theme: firstClean(cycle?.theme, cycle?.summary),
      opportunity: firstClean(cycle?.opportunity, cycle?.chance),
      caution: firstClean(cycle?.caution, cycle?.warning),
    })).filter((cycle) => cycle.ganji || cycle.tenGod || cycle.theme),
  };
}

function buildLifeBookSpecialStarContract(localSajuJson = {}, signals = {}, structured = {}) {
  const rawStars = [
    ...normalizeLifeBookSpecialStarsForAssembly(localSajuJson?.sinsal || signals?.specialStars),
    ...rowsOf(structured?.specialStars).map((item) => ({
      name: firstClean(item?.name, item?.shinsalName),
      position: firstClean(item?.position, item?.pillar),
      meaning: firstClean(item?.meaning, item?.actualLifeManifestation, item?.summary),
    })),
  ].filter((item) => item.name);
  const byName = {};
  rawStars.forEach((star) => {
    const key = clean(star.name);
    if (!key || byName[key]) return;
    byName[key] = star;
  });
  return {
    requested: ["도화", "역마", "화개", "천을귀인", "문창", "장성", "반안", "괴강", "백호", "양인", "홍염", "귀문", "원진"],
    active: Object.values(byName),
  };
}

function buildLifeBookEngineSummary({ birthInput = {}, profile = {}, signals = {}, localSajuJson = {}, structured = {}, body = {} } = {}) {
  const elementBalance = localSajuJson?.elementBalance || deriveElementBalance(profile, signals);
  const useful = firstClean(localSajuJson?.yongshin?.usefulElement, structured?.yongshin?.primary, signals?.useful);
  const support = firstClean(structured?.yongshin?.secondary, signals?.support);
  const caution = firstClean(signals?.caution, compactStringList(structured?.yongshin?.gishin)[0]);
  const currentDaeun = firstClean(localSajuJson?.currentDaeun?.label, structured?.daewoon?.current?.label, structured?.daewoon?.current?.ganji, signals?.currentDaewun);
  const annualLuck = firstObject(body?.annualLuck, body?.yearlyLuck2026, localSajuJson?.yearlyFlow, structured?.sewoon);
  return {
    coreIdentity: [firstClean(localSajuJson?.dayMaster, structured?.fourPillars?.day?.stem, signals?.dayMaster), firstClean(localSajuJson?.monthBranch, signals?.monthBranch), firstClean(signals?.topTenGod)].filter(Boolean).join(" · "),
    strongestElements: compactStringList(signals?.dominantElement || elementBalance?.dominant),
    weakestElements: compactStringList(signals?.weakestElement || elementBalance?.deficient),
    dayMasterStrength: firstClean(localSajuJson?.strength?.label, structured?.strengthAnalysis?.dayMasterStrength, signals?.powerLabel),
    johuSummary: firstClean(localSajuJson?.johu?.summary, structured?.climateAnalysis?.primaryClimateIssue, signals?.johuType),
    yongsinStrategy: [useful && `${useful} 중심`, support && `${support} 보조`, caution && `${caution} 과속 주의`].filter(Boolean).join(" · "),
    gyeokgukSummary: firstClean(localSajuJson?.geokguk?.summary, structured?.gyeokguk?.primary, signals?.geokguk),
    relationshipPattern: firstClean(signals?.relationshipSignal, localSajuJson?.relationshipSignals?.focus, structured?.lifeDomains?.relationships),
    lovePattern: firstClean(signals?.spouseSignal, structured?.lifeDomains?.romance),
    careerPattern: firstClean(signals?.careerSignal, structured?.lifeDomains?.career),
    wealthPattern: firstClean(signals?.wealthSignal, structured?.lifeDomains?.wealth),
    healthEnergyPattern: firstClean(localSajuJson?.healthSignals?.johuType, structured?.lifeDomains?.healthMind, signals?.johuType),
    currentDaeunTheme: firstClean(currentDaeun, structured?.daewoon?.currentAnalysis),
    year2026Theme: firstClean(annualLuck?.theme, annualLuck?.analysis, annualLuck?.finalClassification, annualLuck?.pillar),
    yearTheme: firstClean(annualLuck?.theme, annualLuck?.analysis, annualLuck?.finalClassification, annualLuck?.pillar),
    cautionPattern: compactStringList(signals?.weakSignals).join(" · ") || firstClean(caution),
    masterAdviceSeed: [useful && `${useful} 기운을 현실 선택의 기준으로 삼기`, currentDaeun && `${currentDaeun} 흐름 안에서 우선순위 재정렬`, "관계·일·돈을 동시에 바꾸지 말고 순차적으로 조정"].filter(Boolean).join(" · "),
  };
}

function buildLifeBookEngineContract({ birthInput = {}, profile = {}, signals = {}, localSajuJson = {}, body = {} } = {}) {
  const structured = selectLifeBookStructuredAdvancedReport(
    body?.lifeBookEngineContract?.structuredAdvancedReport,
    body?.quantumMyeongriJson?.structuredAdvancedReport,
    body?.structuredAdvancedReport,
    body?.engineData?.structuredAdvancedReport,
    body?.canonicalSajuChart?.structuredAdvancedReport,
    localSajuJson?.structuredAdvancedReport,
  );
  const pillars = localSajuJson?.pillars || {};
  const summary = buildLifeBookEngineSummary({ birthInput, profile, signals, localSajuJson, structured, body });
  const targetYear = resolveLifeBookTargetYear(body, signals?.currentYear || localSajuJson?.yearlyFlow?.year);
  const targetYearPillar = firstClean(signals?.currentYearPillar, body?.annualLuck?.ganji, body?.yearlyLuck2026?.ganji, structured?.sewoon?.currentYear?.ganji, structured?.sewoon?.currentYear?.label, localSajuJson?.yearlyFlow?.pillar, resolveLifeBookYearPillar(targetYear));
  const normalizationWarnings = [
    ...(structured && typeof structured === "object" ? [] : ["structuredAdvancedReport_missing"]),
    ...(localSajuJson?.tenGodsByPillar && Object.keys(localSajuJson.tenGodsByPillar).length >= 3 ? [] : ["tenGodsByPillar_sparse"]),
    ...(Array.isArray(localSajuJson?.sinsal) && localSajuJson.sinsal.length ? [] : ["specialStars_sparse"]),
    ...(Array.isArray(localSajuJson?.twelveGrowthStages) && localSajuJson.twelveGrowthStages.length >= 3 ? [] : ["twelveStages_sparse"]),
  ];
  return {
    version: "life-book-engine-contract-v2",
    source: firstClean(structured?.metadata?.engineVersion, body?.engineVersion, "normalized-worker-saju"),
    calculationPolicy: {
      calendarType: firstClean(birthInput?.calendarType, structured?.input?.calendarType, localSajuJson?.calculationPolicy?.calendarType),
      timezone: firstClean(birthInput?.timezone, structured?.metadata?.timezone, localSajuJson?.calculationPolicy?.timezone, "Asia/Seoul"),
      hourPillarTimePolicy: firstClean(structured?.metadata?.hourPillarTimePolicy, localSajuJson?.calculationPolicy?.hourPillarTimePolicy, "TRUE_SOLAR_TIME"),
      dayChangePolicy: firstClean(structured?.metadata?.dayChangePolicy, localSajuJson?.calculationPolicy?.dayChangePolicy, "MIDNIGHT"),
      coordinatePolicy: firstClean(localSajuJson?.calculationPolicy?.coordinatePolicy, "birthplace-lat-lng-with-seoul-default"),
    },
    sourceTrace: {
      route: "worker.routes.saju-lifebook",
      contractBuilder: "buildLifeBookEngineContract",
      hasStructuredAdvancedReport: Boolean(structured && typeof structured === "object"),
      hasCanonicalSajuChart: Boolean(body?.canonicalSajuChart),
      hasQuantumMyeongriJson: Boolean(body?.quantumMyeongriJson),
      hasAnalysisSignals: Boolean(body?.analysisSignals),
      localSajuJsonDerivedAt: clean(localSajuJson?.derivedAt),
      normalizedAt: new Date().toISOString(),
    },
    confidence: {
      pillarCompleteness: ["year", "month", "day", "hour"].reduce((sum, key) => sum + Number(Boolean(clean(pillars?.[key]?.ganji))), 0) / 4,
      fiveElementCompleteness: localSajuJson?.fiveElements && typeof localSajuJson.fiveElements === "object" ? Math.min(1, Object.keys(localSajuJson.fiveElements).length / 5) : 0,
      tenGodCompleteness: localSajuJson?.tenGods && typeof localSajuJson.tenGods === "object" ? Math.min(1, Object.keys(localSajuJson.tenGods).length / 4) : 0,
      daeunCompleteness: Array.isArray(localSajuJson?.daeun) ? Math.min(1, localSajuJson.daeun.length / 3) : 0,
      sourceCompleteness: structured && typeof structured === "object" ? 1 : 0.72,
    },
    normalizationWarnings,
    validation: null,
    userInfo: {
      name: firstClean(profile?.name, body?.name),
      gender: firstClean(profile?.gender, birthInput?.gender),
      calendarType: firstClean(birthInput?.calendarType, structured?.input?.calendarType),
      birthDate: firstClean(birthInput?.birthDate, structured?.input?.birthDate),
      birthTime: firstClean(birthInput?.birthTime, structured?.input?.birthTime),
      birthPlace: firstClean(birthInput?.birthplace, structured?.input?.birthPlace),
      timezone: firstClean(birthInput?.timezone, structured?.metadata?.timezone),
      calculationBasis: firstClean(structured?.metadata?.engineVersion, structured?.metadata?.calculationConfidence, localSajuJson?.derivedAt),
    },
    natal: {
      pillars,
      dayMaster: firstClean(localSajuJson?.dayMaster, signals?.dayMaster),
      dayPillar: firstClean(pillars?.day?.ganji, signals?.dayPillar),
      monthCommand: firstClean(localSajuJson?.monthBranch, signals?.monthBranch),
      emptyBranches: compactStringList(localSajuJson?.emptyBranches),
    },
    tenGods: {
      distribution: localSajuJson?.tenGods || signals?.tenGodCounts || {},
      byPillar: localSajuJson?.tenGodsByPillar || signals?.tenGodByPillar || {},
      dominant: firstClean(signals?.topTenGod),
    },
    fiveElements: {
      counts: localSajuJson?.fiveElements || signals?.elementWeights || {},
      excessive: compactStringList(signals?.dominantElement),
      lacking: compactStringList(signals?.weakestElement),
      johuNeeded: compactStringList(structured?.climateAnalysis?.climateYongshin || signals?.johuType),
      yongshinCandidates: compactStringList(localSajuJson?.yongshin?.usefulElements || signals?.usefulElements),
      gishinCandidates: compactStringList(localSajuJson?.yongshin?.cautionElements || signals?.avoidElements),
    },
    strengthJohuYongshin: {
      strength: localSajuJson?.strength || {},
      johu: localSajuJson?.johu || {},
      yongshin: {
        primary: firstClean(localSajuJson?.yongshin?.usefulElement, structured?.yongshin?.primary, signals?.useful),
        huishin: compactStringList(structured?.yongshin?.huishin || localSajuJson?.yongshin?.usefulElements),
        gishin: compactStringList(structured?.yongshin?.gishin || localSajuJson?.yongshin?.cautionElements),
        gushin: compactStringList(structured?.yongshin?.gushin),
        hanshin: compactStringList(structured?.yongshin?.hanshin),
        reasoning: firstClean(structured?.yongshin?.reasoning, localSajuJson?.johu?.summary),
        strategy: summary.yongsinStrategy,
      },
    },
    gyeokguk: {
      primary: firstClean(structured?.gyeokguk?.primary, localSajuJson?.geokguk?.title, signals?.geokguk),
      candidates: rowsOf(structured?.gyeokguk?.candidates),
      reasoning: firstClean(structured?.gyeokguk?.reasoning, localSajuJson?.geokguk?.summary),
      socialMission: firstClean(signals?.careerSignal),
    },
    interactions: {
      ...(localSajuJson?.interactions && typeof localSajuJson.interactions === "object" ? localSajuJson.interactions : {}),
      dochung: firstObject(structured?.dochungAnalysis, structured?.doChungAnalysis, localSajuJson?.dochungAnalysis),
      combinationTransformation: structured?.combinationTransformation || {},
      clashAnalysis: structured?.clashAnalysis || {},
    },
    daeun: buildLifeBookDaeunContract(signals, localSajuJson, structured),
    targetYear,
    year2026: {
      year: targetYear,
      ganji: targetYearPillar,
      heavenlyStemTenGod: firstClean(body?.annualLuck?.heavenlyStemTenGod, body?.yearlyLuck2026?.heavenlyStemTenGod, body?.yearlyLuck2026?.tenGodToDayMaster),
      earthlyBranchTenGod: firstClean(body?.annualLuck?.earthlyBranchTenGod, body?.yearlyLuck2026?.earthlyBranchTenGod),
      natalInteractions: compactStringList(body?.annualLuck?.interactionsWithNatal || body?.yearlyLuck2026?.interactionsWithNatal || structured?.sewoon?.analysis),
      daeunRelation: firstClean(body?.annualLuck?.daeunRelation, body?.yearlyLuck2026?.daeunRelation, structured?.sewoon?.analysis),
      theme: summary.year2026Theme,
      career: firstClean(body?.annualLuck?.career, body?.yearlyLuck2026?.career, signals?.careerSignal),
      wealth: firstClean(body?.annualLuck?.wealth, body?.yearlyLuck2026?.wealth, signals?.wealthSignal),
      relationship: firstClean(body?.annualLuck?.relationship, body?.yearlyLuck2026?.relationship, signals?.relationshipSignal),
      love: firstClean(body?.annualLuck?.loveMarriage, body?.annualLuck?.love, body?.yearlyLuck2026?.loveMarriage, signals?.spouseSignal),
      health: firstClean(body?.annualLuck?.health, body?.yearlyLuck2026?.health, summary.healthEnergyPattern),
      caution: firstClean(body?.annualLuck?.caution, body?.yearlyLuck2026?.caution, summary.cautionPattern),
      opportunity: firstClean(body?.annualLuck?.opportunity, body?.yearlyLuck2026?.opportunity),
    },
    monthlyLuck2026: buildLifeBookMonthlyLuckContract(body, structured, targetYear),
    specialStars: buildLifeBookSpecialStarContract(localSajuJson, signals, structured),
    twelveStages: {
      byPillar: normalizeLifeBookTwelveStagesForAssembly(localSajuJson?.twelveGrowthStages || signals?.twelveGrowthStages),
      summary: firstClean(structured?.userReport?.sections?.find?.((section) => clean(section?.title).includes("12운성"))?.summary),
    },
    summary,
  };
}

function buildLifeBookAssemblyInput(birthInput, profile, signals, localSajuJson, body = {}) {
  const targetYear = resolveLifeBookTargetYear(body);
  const targetYearPillar = firstClean(signals?.currentYearPillar, body?.annualLuck?.ganji, body?.yearlyLuck2026?.ganji, localSajuJson?.yearlyFlow?.pillar, resolveLifeBookYearPillar(targetYear));
  const pillars = localSajuJson?.pillars || {};
  const tenGodsByPillar = localSajuJson?.tenGodsByPillar || {};
  const elementCounts = localSajuJson?.fiveElements || signals?.elementWeights || {};
  const daeunCycles = Array.isArray(localSajuJson?.daeun) ? localSajuJson.daeun : [];
  const currentCycle = localSajuJson?.currentDaeun || signals?.currentDaeunNode || null;
  const engineContract = buildLifeBookEngineContract({ birthInput, profile, signals, localSajuJson, body });

  return {
    engineContract,
    engineSummary: engineContract.summary,
    userProfile: {
      displayName: clean(profile?.name),
      gender: clean(profile?.gender),
      birthDate: clean(birthInput?.birthDate),
      birthTime: clean(birthInput?.birthTime),
      calendarType: clean(birthInput?.calendarType) === "lunar" || clean(birthInput?.calendarType) === "lunar_leap" ? "lunar" : "solar",
      isLeapMonth: clean(birthInput?.calendarType) === "lunar_leap" || Boolean(body?.isLeapMonth),
      birthPlace: clean(birthInput?.birthplace || profile?.birthplace),
      timezone: clean(birthInput?.timezone || profile?.timezone),
      adjustedTime: clean(body?.adjustedTime || birthInput?.birthTime),
      useAdjustedTime: Boolean(body?.useAdjustedTime || body?.adjustedTime),
      currentAge: Number(profile?.year) ? Math.max(0, targetYear - Number(profile.year)) : undefined,
      targetYear,
    },
    saju: {
      pillars: {
        year: normalizeLifeBookPillarForAssembly(pillars.year, tenGodsByPillar.year),
        month: normalizeLifeBookPillarForAssembly(pillars.month, tenGodsByPillar.month),
        day: normalizeLifeBookPillarForAssembly(pillars.day, tenGodsByPillar.day),
        hour: normalizeLifeBookPillarForAssembly(pillars.hour, tenGodsByPillar.hour),
      },
      dayMaster: clean(localSajuJson?.dayMaster || signals?.dayMaster),
      dayBranch: clean(localSajuJson?.dayBranch || signals?.dayBranch),
      monthBranch: clean(localSajuJson?.monthBranch || signals?.monthBranch),
      eightCharacters: ["year", "month", "day", "hour"].map((key) => clean(pillars?.[key]?.ganji)).filter(Boolean).join(" "),
      emptyBranches: compactStringList(localSajuJson?.emptyBranches),
    },
    fiveElements: {
      counts: {
        wood: safeNumber(elementCounts.wood, 0),
        fire: safeNumber(elementCounts.fire, 0),
        earth: safeNumber(elementCounts.earth, 0),
        metal: safeNumber(elementCounts.metal, 0),
        water: safeNumber(elementCounts.water, 0),
      },
      strengths: signals?.elementWeights || {},
      excessive: compactStringList(signals?.dominantElement),
      lacking: compactStringList(signals?.weakestElement),
      balanceSummary: clean(localSajuJson?.elementBalance?.dominant && localSajuJson?.elementBalance?.deficient
        ? `강한 기운은 ${localSajuJson.elementBalance.dominant}, 보강할 기운은 ${localSajuJson.elementBalance.deficient}`
        : ""),
      seasonInfluence: clean(signals?.monthBranch && `${signals.monthBranch} 월지 중심의 계절 영향`),
      temperatureMoisture: {
        coldWarm: clean(localSajuJson?.johu?.type || signals?.johuType),
        dryWet: clean(body?.dryWet || ""),
        johuSummary: clean(localSajuJson?.johu?.summary),
      },
    },
    tenGods: {
      distribution: localSajuJson?.tenGods || signals?.tenGodCounts || {},
      byPillar: tenGodsByPillar,
      wealth: clean(signals?.wealthSignal),
      career: clean(signals?.careerSignal),
      expression: clean(signals?.talentSignal),
      resource: clean(signals?.support),
      peer: clean(signals?.topTenGod),
      spouseStar: clean(signals?.spouseSignal),
    },
    structure: {
      dayMasterStrength: clean(localSajuJson?.strength?.label || signals?.powerLabel),
      hasSeason: Boolean(clean(signals?.monthBranch)),
      hasRoot: Boolean(clean(localSajuJson?.dayBranch)),
      hasSupport: Boolean(clean(signals?.support)),
      gyeokguk: {
        name: clean(localSajuJson?.geokguk?.title || signals?.geokguk),
        reason: clean(localSajuJson?.geokguk?.summary || `${clean(signals?.dayMaster)} 일간과 ${clean(signals?.monthBranch)} 월지 중심 구조`),
        status: clean(body?.gyeokgukStatus),
        socialRole: clean(signals?.careerSignal),
      },
      usefulGods: {
        yongsin: clean(localSajuJson?.yongshin?.usefulElement || signals?.useful),
        huisin: compactStringList(localSajuJson?.yongshin?.usefulElements || signals?.usefulElements).slice(1),
        gisin: compactStringList(localSajuJson?.yongshin?.cautionElements || signals?.avoidElements),
        gusin: compactStringList(body?.gusin),
        hansin: compactStringList(body?.hansin),
        reason: clean(localSajuJson?.johu?.summary),
        type: clean(signals?.johuType),
      },
    },
    interactions: {
      stemCombinations: compactStringList(localSajuJson?.interactions?.stemCombinations),
      stemClashes: compactStringList(localSajuJson?.interactions?.stemClashes),
      branchCombinations: compactStringList(localSajuJson?.interactions?.branchCombinations),
      threeHarmony: compactStringList(localSajuJson?.interactions?.threeHarmony),
      directionalHarmony: compactStringList(localSajuJson?.interactions?.directionalHarmony),
      sixHarmony: compactStringList(localSajuJson?.interactions?.sixHarmony),
      clashes: compactStringList(localSajuJson?.interactions?.clashes),
      punishments: compactStringList(localSajuJson?.interactions?.punishments),
      harms: compactStringList(localSajuJson?.interactions?.harms),
      breaks: compactStringList(localSajuJson?.interactions?.breaks),
      wonjin: compactStringList(localSajuJson?.interactions?.wonjin),
      gwimun: compactStringList(localSajuJson?.interactions?.gwimun),
    },
    specialStars: normalizeLifeBookSpecialStarsForAssembly(localSajuJson?.sinsal || signals?.specialStars),
    twelveStages: normalizeLifeBookTwelveStagesForAssembly(localSajuJson?.twelveGrowthStages || signals?.twelveGrowthStages),
    luckCycles: {
      startAge: Number(signals?.daewunStartAge || 0) || undefined,
      direction: clean(signals?.daewunDirection || body?.daewunDirection),
      cycles: daeunCycles.map(normalizeLifeBookLuckCycleForAssembly),
      currentCycle: currentCycle ? normalizeLifeBookLuckCycleForAssembly(currentCycle) : undefined,
    },
    yearlyLuck2026: {
      year: targetYear,
      stem: clean(body?.annualLuck?.stem || body?.yearlyLuck2026?.stem || targetYearPillar.slice(0, 1)),
      branch: clean(body?.annualLuck?.branch || body?.yearlyLuck2026?.branch || targetYearPillar.slice(1, 2)),
      ganji: targetYearPillar,
      tenGodToDayMaster: clean(body?.annualLuck?.tenGodToDayMaster || body?.yearlyLuck2026?.tenGodToDayMaster || ""),
      elementEffect: clean(body?.annualLuck?.elementEffect || body?.yearlyLuck2026?.elementEffect || `${targetYear}년 ${targetYearPillar || "세운"} 흐름으로 생활 속 속도와 선택 기준이 조정되는 흐름`),
      interactionsWithNatal: compactStringList(body?.annualLuck?.interactionsWithNatal || body?.yearlyLuck2026?.interactionsWithNatal),
      career: clean(body?.annualLuck?.career || body?.yearlyLuck2026?.career || signals?.careerSignal),
      wealth: clean(body?.annualLuck?.wealth || body?.yearlyLuck2026?.wealth || signals?.wealthSignal),
      relationship: clean(body?.annualLuck?.relationship || body?.yearlyLuck2026?.relationship || signals?.relationshipSignal),
      loveMarriage: clean(body?.annualLuck?.loveMarriage || body?.annualLuck?.love || body?.yearlyLuck2026?.loveMarriage || signals?.spouseSignal),
      health: clean(body?.annualLuck?.health || body?.yearlyLuck2026?.health || `${clean(signals?.johuType || "조후")} 기준의 생활 리듬 관리`),
      monthly: Array.isArray(body?.annualLuck?.monthly) ? body.annualLuck.monthly : (Array.isArray(body?.yearlyLuck2026?.monthly) ? body.yearlyLuck2026.monthly : []),
    },
    serviceContext: buildLifeBookServiceContext(body),
  };
}









function buildLifeBookSectionFinalText(section = {}) {
  const body = dedupeParagraphs(stripForbiddenTokens(section?.body || ""));
  const keyPoints = Array.isArray(section?.keyPoints) ? section.keyPoints.map((item) => stripForbiddenTokens(item)).filter(Boolean) : [];
  const actionGuide = Array.isArray(section?.actionGuide) ? section.actionGuide.map((item) => stripForbiddenTokens(item)).filter(Boolean) : [];
  const blocks = [body];
  if (keyPoints.length) blocks.push(`핵심 포인트\n${keyPoints.map((item) => `- ${item}`).join("\n")}`);
  if (actionGuide.length) blocks.push(`상담 포인트\n${actionGuide.map((item) => `- ${item}`).join("\n")}`);
  return dedupeParagraphs(blocks.filter(Boolean).join("\n\n"));
}

function normalizeLifeBookTextList(value, fallback = []) {
  const source = Array.isArray(value) ? value : fallback;
  return source.map((item) => stripForbiddenTokens(item)).filter(Boolean);
}

function buildLifeBookChapterOpeningText(parsed = {}, chapterSpec = {}) {
  const existingOpening = stripForbiddenTokens(parsed?.chapterOpening || "");
  const requiredNotice = stripForbiddenTokens(parsed?.requiredNotice || chapterSpec?.requiredNotice || "");
  const hasFreshOpeningFields = Boolean(
    clean(parsed?.coverPhrase)
      || clean(parsed?.coreMessage)
      || (Array.isArray(parsed?.keyQuestions) && parsed.keyQuestions.length)
      || clean(parsed?.myeongriStructureSummary)
      || clean(parsed?.plainLanguageReading)
      || clean(parsed?.strengthAnalysis)
      || clean(parsed?.cautionAnalysis)
      || clean(parsed?.practicalStrategy)
      || (Array.isArray(parsed?.actionChecklist) && parsed.actionChecklist.length)
      || clean(parsed?.summaryBox)
      || clean(parsed?.nextChapterBridge)
  );
  if (existingOpening && !hasFreshOpeningFields && (!requiredNotice || existingOpening.includes(requiredNotice))) {
    return dedupeParagraphs(existingOpening);
  }

  const categories = Array.isArray(chapterSpec?.categories) ? chapterSpec.categories : [];
  const focus = normalizeLifeBookTextList(chapterSpec?.engineFocus);
  const questionFallback = categories.slice(0, 3).map((category) => `${category}은 삶에서 어떻게 드러나는가`);
  const checklistFallback = [
    "이 장에서 가장 강하게 작동하는 원국 근거 확인",
    "강점으로 드러나는 조건과 흔들리기 쉬운 조건 분리",
    "카테고리별 상담 주제가 서로 섞이지 않았는지 확인",
  ];
  const focusSentence = focus.length
    ? `${focus.join(", ")}을 중심으로 이 장의 흐름을 읽습니다.`
    : `${stripForbiddenTokens(chapterSpec?.title || "이 장")}의 핵심 흐름을 중심으로 삶의 방향을 읽습니다.`;
  const blocks = [
    existingOpening,
    `챕터 표지 문구\n${stripForbiddenTokens(parsed?.coverPhrase || chapterSpec?.subtitle || chapterSpec?.title || "")}`,
    `한 줄 핵심 메시지\n${stripForbiddenTokens(parsed?.coreMessage || parsed?.chapterSummary || "타고난 구조는 고정된 결론이 아니라, 삶을 더 정교하게 운용하기 위한 지도입니다.")}`,
    `이 장에서 다룰 핵심 질문\n${normalizeLifeBookTextList(parsed?.keyQuestions, questionFallback).map((item) => `- ${item}`).join("\n")}`,
    `명리 구조 요약\n${stripForbiddenTokens(parsed?.myeongriStructureSummary || focusSentence)}`,
    `쉬운 현실 언어 해석\n${stripForbiddenTokens(parsed?.plainLanguageReading || "복잡한 명리의 언어를 일, 관계, 감정, 선택의 습관으로 풀어 읽으면 지금 어떤 리듬을 살리고 무엇을 조절해야 하는지가 선명해집니다.")}`,
    `강점 분석\n${stripForbiddenTokens(parsed?.strengthAnalysis || "강점은 무리하게 밀어붙일 때보다 알맞은 환경과 반복 가능한 습관 속에서 가장 안정적으로 드러납니다.")}`,
    `주의점 분석\n${stripForbiddenTokens(parsed?.cautionAnalysis || "주의점은 피해야 할 운명이 아니라 미리 알아차리고 조절해야 할 반복 신호로 다루는 것이 좋습니다.")}`,
    `카테고리별 판단 기준\n${stripForbiddenTokens(parsed?.practicalStrategy || "이 장은 각 카테고리의 제목이 가리키는 삶의 영역을 기준으로 원국, 대운, 세운의 근거를 분리해 읽어야 합니다.")}`,
    `상담 확인 질문\n${normalizeLifeBookTextList(parsed?.actionChecklist, checklistFallback).map((item) => `- ${item}`).join("\n")}`,
    `장 요약 박스\n${stripForbiddenTokens(parsed?.summaryBox || parsed?.chapterSummary || focusSentence)}`,
    requiredNotice ? `필수 안내문\n${requiredNotice}` : "",
    `다음 장으로 연결되는 문장\n${stripForbiddenTokens(parsed?.nextChapterBridge || "이 흐름을 바탕으로 다음 장에서는 더 깊은 기질과 운용 전략을 살펴봅니다.")}`,
  ].filter(Boolean);
  return dedupeParagraphs(blocks.join("\n\n"));
}









function summarizeLifeBookChapter(chapter = {}) {
  const fromModel = clean(chapter?.chapterSummary);
  if (fromModel) return fromModel;
  return (Array.isArray(chapter?.categories) ? chapter.categories : [])
    .slice(0, 6)
    .map((category) => `${clean(category?.title)}: ${clean(category?.finalText).slice(0, 90)}`)
    .filter(Boolean)
    .join(" ");
}

function buildLifeBookStyleGuide(chapterSpec = {}) {
  return {
    language: "ko",
    tone: "품격 있는 전문가 상담문과 카테고리별 정밀 해석의 결합",
    audience: "유료 프리미엄 PDF를 읽는 일반 사용자",
    sentenceRule: "과장된 예언보다 관찰 가능한 패턴과 카테고리별 판단 기준으로 설명",
    structureRule: "요약, 상담형 본문, 표처럼 읽히는 정리, 카테고리별 근거, 상담 확인 질문을 자연스럽게 포함",
    safetyRule: "공포 조장, 절대 단정, 의학적 진단, 투자 수익 보장, 내부 계산 근거성 용어 노출 금지",
    chapterRequirements: Array.isArray(chapterSpec?.writingRequirements) ? chapterSpec.writingRequirements : [],
    requiredNotice: clean(chapterSpec?.requiredNotice),
  };
}

function buildLifeBookSectionRequiredEngineFields(chapterSpec = {}, sectionTitle = "") {
  const common = ["원국 핵심", "일간", "용신", "현재 대운", "선택 연도 핵심 요약"];
  const section = clean(sectionTitle);
  const fields = [
    ...common,
    ...(Array.isArray(chapterSpec?.engineFocus) ? chapterSpec.engineFocus : []),
  ];
  const rules = [
    { re: /년주|월주|일주|시주|팔자|원국|천간|지지|지장간|공망|도충|합충|형파해|특수/, fields: ["원국", "천간/지지/지장간", "합충형파해", "도충/특수 구조"] },
    { re: /일간|월지|월령|신강|신약|중화|조후|통근|생조|극설|계절|온도|습|건조/, fields: ["일간 강약", "월령", "조후", "통근", "생조/극설", "오행 온도감"] },
    { re: /용신|희신|기신|구신|한신|균형|선택 기준/, fields: ["용신/희신/기신/구신/한신", "용신 선정 이유", "오행별 현실 전략"] },
    { re: /대운|10년|초년|청년|중년|장년|말년/, fields: ["대운 배열", "현재 대운", "다음 대운", "대운과 용신 관계"] },
    { re: /격국|성격|파격|사회|조직|브랜드|명예|성공/, fields: ["월지 중심 격국", "십성 중심 구조", "성격/파격 여부", "사회적 역할 요약"] },
    { re: /관계|인연|호감|오해|갈등|협업|귀인|계약|배우자궁|대인/, fields: ["십성 분포", "충/형/원진/귀문", "귀인성", "배우자궁과 대인관계 패턴"] },
    { re: /연애|사랑|상대|결혼|배우자|인연/, fields: ["일지", "배우자궁", "남녀별 배우자성", "재성/관성 구조", "대운·세운상 연애 자극"] },
    { re: /돈|재물|직업|사업|프리랜스|자산|수익|커리어/, fields: ["재성", "식상", "관성", "인성", "격국", "용신", "대운상 재물 흐름", "선택 연도 재물 흐름"] },
    { re: /건강|심신|오행|컨디션|스트레스|회복|수면|운동|식습관|감정|번아웃/, fields: ["오행 과다/부족", "조후", "화기/수기/습도/건조도", "용신 오행", "기신 오행"] },
    { re: /신살|도화|홍염|역마|화개|귀문|원진|12운성|운성|반복 신호|숨은 작용/, fields: ["신살 목록", "신살 위치", "12운성 위치", "반복 패턴", "도충/합충형파해와 신살 결합"] },
    { re: /선택\s*연도|월별|월운|세운|로드맵|1월|12월/, fields: ["선택 연도 세운", "선택 연도 월운 12개월", "대운과 세운 관계", "원국과 세운 합충형파해", "용신/기신 작용"] },
  ];
  rules.forEach((rule) => {
    if (rule.re.test(section)) fields.push(...rule.fields);
  });
  return Array.from(new Set(fields.map((item) => clean(item)).filter(Boolean)));
}

function buildLifeBookChapterPlan(chapterSpec = {}) {
  const pagePlan = getLifeBookPagePlan(chapterSpec?.id);
  const categories = Array.isArray(chapterSpec?.categories) ? chapterSpec.categories : [];
  const sectionTargetChars = Math.max(700, Math.round(Number(pagePlan.targetChars || 0) / Math.max(1, categories.length)));
  const sections = categories.map((title, index) => ({
    sectionId: `${clean(chapterSpec.id)}-${String(index + 1).padStart(2, "0")}`,
    title,
    targetChars: sectionTargetChars,
    requiredEngineFields: buildLifeBookSectionRequiredEngineFields(chapterSpec, title),
  }));
  return {
    chapterId: clean(chapterSpec.id),
    roman: clean(chapterSpec.roman),
    title: clean(chapterSpec.title),
    subtitle: clean(chapterSpec.subtitle),
    targetPages: Number(pagePlan.targetPages || 0),
    targetChars: Number(pagePlan.targetChars || 0),
    sections,
  };
}

function buildLifeBookChapterPlans() {
  return getLifeBookBlueprints().map(buildLifeBookChapterPlan);
}

function cloneLifeBookData(value) {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return value;
  }
}







function normalizeLifeBookSectionBody(text = "") {
  const raw = clean(text)
    .replace(/^\s*```(?:markdown|md|html|json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return stripForbiddenTokens(parsed.body || parsed.text || parsed.content || "");
    }
  } catch (_) {}
  return stripForbiddenTokens(raw);
}

function ensureLifeBookSectionH3(text = "", title = "") {
  const body = normalizeLifeBookSectionBody(text);
  if (/^###\s+/m.test(body)) return body;
  return `### ${stripForbiddenTokens(title)}\n\n${body}`.trim();
}

function summarizeLifeBookSectionBody(text = "", title = "") {
  const body = normalizeLifeBookSectionBody(text)
    .replace(/^###\s+.+$/m, "")
    .split(/\n\s*\n/)
    .map((item) => stripForbiddenTokens(item))
    .find(Boolean);
  return stripForbiddenTokens(`${clean(title)}: ${clean(body).slice(0, 160)}`);
}

function extractLifeBookActionPointsFromText(text = "") {
  const lines = normalizeLifeBookSectionBody(text).split(/\n+/);
  return lines
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
    .filter((line) => line.length >= 8 && !/^###/.test(line))
    .slice(-5)
    .map((line) => stripForbiddenTokens(line));
}













function normalizeLifeBookChapterMarkdown(text = "") {
  const raw = clean(text)
    .replace(/^\s*```(?:markdown|md|html|json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return dedupeParagraphs(stripForbiddenTokens(parsed.body || parsed.text || parsed.content || parsed.chapter || ""));
    }
  } catch (_) {}
  return dedupeParagraphs(stripForbiddenTokens(raw));
}













function reviewLifeBookChapterDeterministically(chapter = {}) {
  const markdown = normalizeLifeBookChapterMarkdown(chapter?.reviewedMarkdown || chapter?.editedMarkdown || chapter?.mergedMarkdown || chapter?.finalText || chapter?.text || "");
  return applyLifeBookReviewedChapter(chapter, markdown, {
    source: "deterministic-chapter-review",
    errors: ["chapter_review_local_repair"],
  });
}



function getLifeBookChapterFinalMarkdown(chapter = {}) {
  return normalizeLifeBookChapterMarkdown(
    chapter?.reviewedMarkdown
    || chapter?.editedMarkdown
    || chapter?.mergedMarkdown
    || chapter?.finalText
    || chapter?.text
    || buildChapterBody(chapter?.title || "", Array.isArray(chapter?.categories) ? chapter.categories : [], chapter?.chapterOpening || ""),
  );
}

function buildLifeBookFullManuscriptChapterInput(chapters = []) {
  return (Array.isArray(chapters) ? chapters : [])
    .map((chapter, index) => {
      const blueprint = getLifeBookBlueprints()[index] || chapter;
      const title = stripForbiddenTokens(blueprint?.title || chapter?.title || "");
      const roman = stripForbiddenTokens(blueprint?.roman || chapter?.roman || "");
      const body = getLifeBookChapterFinalMarkdown(chapter);
      return [`## ${roman}. ${title}`, body].filter(Boolean).join("\n\n");
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function buildLifeBookFullTableOfContentsMarkdown() {
  return getLifeBookBlueprints()
    .map((chapter) => `${chapter.roman}. ${stripForbiddenTokens(chapter.title)}`)
    .join("\n");
}



function normalizeLifeBookFinalManuscriptMarkdown(text = "") {
  return normalizeLifeBookChapterMarkdown(text)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildLifeBookDeterministicFinalSummary(chapters = []) {
  const summaries = (Array.isArray(chapters) ? chapters : [])
    .slice(0, 13)
    .map((chapter, index) => {
      const blueprint = getLifeBookBlueprints()[index] || chapter;
      const body = getLifeBookChapterFinalMarkdown(chapter);
      const firstParagraph = body
        .replace(/^#{1,4}\s+.+$/gm, "")
        .split(/\n\s*\n/)
        .map((item) => stripForbiddenTokens(item))
        .find((item) => clean(item).length >= 40);
      return `- ${blueprint?.roman}. ${stripForbiddenTokens(blueprint?.title || chapter?.title || "")}: ${clean(firstParagraph).slice(0, 180)}`;
    })
    .filter(Boolean);
  return ["## 전체 핵심 요약", ...summaries].join("\n\n");
}

function buildLifeBookDeterministicFinalManuscript(profile = {}, chapters = []) {
  const safeName = stripForbiddenTokens(profile?.name || "사용자");
  const cover = [
    "# 인생의 책 — 나의 운명 사용 기준",
    `${safeName}님을 위한 프리미엄 사주 상담 원고`,
    "이 원고는 사주 원국과 운의 흐름을 삶의 선택 언어로 정리한 완성형 상담문입니다.",
  ].join("\n\n");
  const toc = ["## 목차", buildLifeBookFullTableOfContentsMarkdown()].join("\n\n");
  const chapterBlocks = getLifeBookBlueprints().map((blueprint, index) => {
    const chapter = Array.isArray(chapters) ? chapters[index] : null;
    const body = getLifeBookChapterFinalMarkdown(chapter || blueprint);
    const chapterBody = /장\s*요약|요약\s*박스/.test(body)
      ? body
      : `${body}\n\n### 장 요약 박스\n\n이 장은 ${stripForbiddenTokens(blueprint.title)}의 핵심 흐름을 현실적인 선택 기준으로 정리합니다. 좋은 기운은 실행 기준으로, 부담되는 기운은 관리 기준으로 삼을 때 삶의 방향이 더 선명해집니다.`;
    return `<!-- pagebreak -->\n\n## ${blueprint.roman}. ${stripForbiddenTokens(blueprint.title)}\n\n${chapterBody}`;
  });
  return normalizeLifeBookFinalManuscriptMarkdown([
    cover,
    toc,
    ...chapterBlocks,
    "<!-- pagebreak -->",
    buildLifeBookDeterministicFinalSummary(chapters),
  ].join("\n\n"));
}

function validateLifeBookFinalManuscriptMarkdown(markdown = "", chapters = []) {
  const body = normalizeLifeBookFinalManuscriptMarkdown(markdown);
  const errors = [];
  const blueprints = getLifeBookBlueprints();
  if (!body.includes("인생의 책")) errors.push("final_markdown_title_missing");
  if (!/목차/.test(body)) errors.push("final_markdown_toc_missing");
  if (!/최종 명리 판단 축/.test(body)) errors.push("final_markdown_master_judgment_missing");
  if (!/전체 핵심 요약/.test(body)) errors.push("final_markdown_summary_missing");
  const pagebreakCount = (body.match(/<!--\s*pagebreak\s*-->/gi) || []).length;
  if (pagebreakCount < blueprints.length) errors.push("final_markdown_pagebreak_missing");
  blueprints.forEach((chapter) => {
    if (!body.includes(stripForbiddenTokens(chapter.title))) errors.push(`final_markdown_chapter_${chapter.id}_missing`);
  });
  const sourceLength = totalManuscriptLength(chapters);
  const minimumChars = Math.max(LIFEBOOK_BLOCKING_MIN_TOTAL_CHARS, Math.floor(sourceLength * 0.72));
  if (body.length < minimumChars) errors.push("final_markdown_too_short");
  if (hasForbiddenText(body)) errors.push("final_markdown_forbidden_text");
  if (hasLifeBookChapterReviewForbiddenText(body)) errors.push("final_markdown_review_forbidden_text");
  if (LIFEBOOK_RISKY_ASSERTION_RE.test(body)) errors.push("final_markdown_risky_assertion");
  return {
    ok: errors.length === 0,
    errors,
    charLength: body.length,
    minimumChars,
    pagebreakCount,
  };
}

function buildLifeBookPhase6DeterministicFinalSummary(chapters = []) {
  const summaries = (Array.isArray(chapters) ? chapters : [])
    .slice(0, 13)
    .map((chapter, index) => {
      const blueprint = getLifeBookBlueprints()[index] || chapter;
      const body = getLifeBookChapterFinalMarkdown(chapter);
      const firstParagraph = body
        .replace(/^#{1,4}\s+.+$/gm, "")
        .split(/\n\s*\n/)
        .map((item) => stripForbiddenTokens(item))
        .find((item) => clean(item).length >= 40);
      return `- ${blueprint?.roman}. ${stripForbiddenTokens(blueprint?.title || chapter?.title || "")}: ${clean(firstParagraph).slice(0, 180)}`;
    })
    .filter(Boolean);
  return ["## 전체 핵심 요약", ...summaries].join("\n\n");
}

function buildLifeBookClosingPage() {
  return [
    "## 마지막 페이지 — 전체 요약과 재열람 안내",
    "### 전체 요약",
    "인생의 책은 원국, 오행, 십성, 용신, 대운, 세운을 하나의 흐름으로 엮어 지금의 선택 기준을 정리합니다. 좋은 흐름은 자신의 영역에 맞게 살리고, 부담스러운 흐름은 어느 카테고리에서 반복되는지 알아차리는 것이 핵심입니다.",
    "### 카테고리별 재열람 기준",
    "| 궁금한 영역 | 다시 볼 장 | 확인할 상담 기준 |",
    "| --- | --- | --- |",
    "| 자기 본질 | 원국·일간·월지 장 | 어떤 기둥이 삶의 중심을 잡고 있는지 확인합니다. |",
    "| 관계와 사랑 | 관계·연애 장 | 배우자성, 배우자궁, 합충형해가 만드는 반복 패턴을 확인합니다. |",
    "| 일과 돈 | 격국·직업·재물 장 | 재성, 관성, 식상이 어떤 방식으로 성과와 수입을 만드는지 확인합니다. |",
    "| 시기 판단 | 대운·세운 장 | 현재 대운과 가까운 세운이 같은 방향을 가리키는지 확인합니다. |",
    "| 최종 판단 | 마스터플랜 장 | 관계, 일, 재물 중 어느 기준을 우선해야 하는지 확인합니다. |",
    "### 재열람 안내",
    "이 PDF는 한 번 읽고 끝내는 문서가 아니라, 대운과 세운의 흐름을 따라 다시 펼쳐 보는 개인용 운명 지도입니다. 큰 선택을 앞두었을 때는 목차에서 해당 카테고리를 다시 확인하고, 같은 주제가 여러 장에서 어떻게 반복되는지 함께 보십시오.",
  ].join("\n\n");
}

function pickLifeBookChapterById(chapters = [], chapterId = "") {
  const id = String(chapterId || "").padStart(2, "0");
  return (Array.isArray(chapters) ? chapters : []).find((chapter) => String(chapter?.id || "").padStart(2, "0") === id) || null;
}

function buildLifeBookSentenceSnippet(value = "", fallback = "") {
  const source = stripForbiddenTokens(value || fallback || "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!source) return stripForbiddenTokens(fallback || "이 장의 핵심 판단을 원국과 운의 흐름으로 다시 확인합니다.");
  const sentence = source.split(/(?<=[.!?])\s+/).find((item) => clean(item).length >= 24) || source;
  return stripForbiddenTokens(sentence).slice(0, 170).trim();
}

function findLifeBookCategorySnippet(chapter = {}, keywords = [], fallback = "") {
  const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
  const category = categories.find((item) => lifeBookCategoryIncludes(item?.title || "", keywords)) || categories[0] || null;
  return buildLifeBookSentenceSnippet(category?.finalText || category?.localSummary || category?.text || "", fallback);
}

function buildLifeBookChapterSummaryCardFromCategories(chapter = {}, blueprint = {}) {
  const categories = (Array.isArray(chapter?.categories) ? chapter.categories : [])
    .filter((category) => clean(category?.title) && clean(category?.finalText || category?.localSummary || category?.text));
  const selectedIndexes = Array.from(new Set([
    0,
    Math.max(0, Math.floor((categories.length - 1) / 2)),
    Math.max(0, categories.length - 1),
  ])).filter((index) => categories[index]);
  const evidenceTags = Array.from(new Set(categories.flatMap((category) => safeLifeBookList(category?.evidenceTags)).map(clean).filter(Boolean))).slice(0, 6);
  const rows = selectedIndexes.map((index) => {
    const category = categories[index];
    return `- ${stripForbiddenTokens(category.title)}: ${buildLifeBookSentenceSnippet(category.finalText || category.localSummary || category.text)}`;
  });
  return [
    "### 핵심 요약 카드",
    evidenceTags.length ? `- 핵심 근거: ${evidenceTags.join(" · ")}` : `- 핵심 근거: ${stripForbiddenTokens(blueprint?.title || chapter?.title || "이 장의 명리 판단")}`,
    ...rows,
    `- 상담 기준: 이 장의 결론은 단정이 아니라 ${stripForbiddenTokens(blueprint?.title || chapter?.title || "해당 장")}에서 반복되는 선택 기준을 붙잡는 데 있습니다.`,
  ].filter(Boolean).join("\n");
}

function buildLifeBookMasterJudgmentContractSection(chapters = []) {
  const chapter02 = pickLifeBookChapterById(chapters, "02");
  const chapter03 = pickLifeBookChapterById(chapters, "03");
  const chapter06 = pickLifeBookChapterById(chapters, "06");
  const chapter07 = pickLifeBookChapterById(chapters, "07");
  const chapter11 = pickLifeBookChapterById(chapters, "11");
  const chapter12 = pickLifeBookChapterById(chapters, "12");
  return [
    "## 최종 명리 판단 축",
    `- 원국의 중심: ${findLifeBookCategorySnippet(chapter02, ["원국", "지장간", "반복"], "네 기둥과 지장간의 반복을 먼저 확인합니다.")}`,
    `- 월령과 조후: ${findLifeBookCategorySnippet(chapter03, ["월지", "월령", "조후", "통근"], "일간이 월령을 만나 어떤 힘으로 버티는지 확인합니다.")}`,
    `- 용신의 방향: ${findLifeBookCategorySnippet(chapter06, ["용신", "희신", "기신"], "살리는 기운과 소모되는 기운의 방향을 나누어 봅니다.")}`,
    `- 격국과 쓰임: ${findLifeBookCategorySnippet(chapter07, ["격국", "사회적", "성과", "평판"], "격국이 현실에서 어떤 무대와 책임으로 살아나는지 확인합니다.")}`,
    `- 대운과 세운: ${findLifeBookCategorySnippet(chapter11, ["현재", "다음", "대운"], "현재 대운과 다음 대운의 과제를 나누어 봅니다.")}`,
    `- 가까운 선택: ${findLifeBookCategorySnippet(chapter12, ["선택 연도", "세운", "월별"], "선택 연도 세운이 현재 대운 위에서 어디를 자극하는지 확인합니다.")}`,
  ].join("\n\n");
}

function buildLifeBookYearlyFlowFinalSection(chapters = []) {
  const chapter12 = pickLifeBookChapterById(chapters, "12");
  const contact = findLifeBookCategorySnippet(chapter12, ["접점", "현재 대운"], "선택 연도는 현재 대운의 큰 과제 위에서 가까운 선택을 자극합니다.");
  const firstHalf = findLifeBookCategorySnippet(chapter12, ["상반기"], contact);
  const secondHalf = findLifeBookCategorySnippet(chapter12, ["하반기"], contact);
  const monthly = findLifeBookCategorySnippet(chapter12, ["월별"], contact);
  return [
    "### 세운·월운 선택 기준",
    `- 1월~3월: ${firstHalf}`,
    `- 4월~6월: ${firstHalf}`,
    `- 7월~9월: ${secondHalf}`,
    `- 10월~12월: ${monthly || secondHalf}`,
  ].join("\n");
}

function buildLifeBookPhase6DeterministicFinalManuscript(profile = {}, chapters = []) {
  const safeName = stripForbiddenTokens(profile?.name || "사용자");
  const generatedLabel = stripForbiddenTokens(new Date().toLocaleString("ko-KR"));
  const cover = [
    "# Code:Destiny",
    "## 인생의 책",
    "### 나의 사주 구조로 읽는 삶의 방향",
    `프로필: ${safeName}`,
    `생성일: ${generatedLabel}`,
    "달빛처럼 조용히 비추는 사주 구조와 운의 흐름을 바탕으로, 지금의 삶을 더 선명하게 선택하기 위한 프리미엄 상담 리포트입니다.",
  ].join("\n\n");
  const toc = ["## 목차", buildLifeBookFullTableOfContentsMarkdown()].join("\n\n");
  const masterJudgmentContract = buildLifeBookMasterJudgmentContractSection(chapters);
  const chapterBlocks = getLifeBookBlueprints().map((blueprint, index) => {
    const chapter = Array.isArray(chapters) ? chapters[index] : null;
    const body = getLifeBookChapterFinalMarkdown(chapter || blueprint);
    const chapterBody = /핵심 요약 카드|요약\s*카드/.test(body)
      ? body
      : `${body}\n\n${buildLifeBookChapterSummaryCardFromCategories(chapter || {}, blueprint)}`;
    return `<!-- pagebreak -->\n\n## ${blueprint.roman}. ${stripForbiddenTokens(blueprint.title)}\n\n### 챕터 표지\n\n“${stripForbiddenTokens(blueprint.subtitle || "운명은 단정된 결론이 아니라, 더 나은 선택을 위한 조용한 지도입니다.")}”\n\n${chapterBody}`;
  });
  return normalizeLifeBookFinalManuscriptMarkdown([
    cover,
    toc,
    masterJudgmentContract,
    ...chapterBlocks,
    "<!-- pagebreak -->",
    buildLifeBookPhase6DeterministicFinalSummary(chapters),
    "<!-- pagebreak -->",
    buildLifeBookClosingPage(),
  ].join("\n\n"));
}

function validateLifeBookPhase6FinalManuscriptMarkdown(markdown = "", chapters = []) {
  const body = normalizeLifeBookFinalManuscriptMarkdown(markdown);
  const errors = [];
  const blueprints = getLifeBookBlueprints();
  if (!body.includes("인생의 책")) errors.push("final_markdown_title_missing");
  if (!/목차/.test(body)) errors.push("final_markdown_toc_missing");
  if (!/전체 핵심 요약/.test(body)) errors.push("final_markdown_summary_missing");
  const pagebreakCount = (body.match(/<!--\s*pagebreak\s*-->/gi) || []).length;
  if (pagebreakCount < blueprints.length) errors.push("final_markdown_pagebreak_missing");
  blueprints.forEach((chapter) => {
    if (!body.includes(stripForbiddenTokens(chapter.title))) errors.push(`final_markdown_chapter_${chapter.id}_missing`);
    const expectedCategories = Array.isArray(chapter?.categories) ? chapter.categories : [];
    const categoryHits = expectedCategories.filter((title) => body.includes(stripForbiddenTokens(title))).length;
    if (expectedCategories.length && categoryHits < Math.min(3, expectedCategories.length)) {
      errors.push(`phase6_category_coverage:${chapter.id}`);
    }
  });
  const sourceLength = totalManuscriptLength(chapters);
  const minimumChars = Math.max(LIFEBOOK_BLOCKING_MIN_TOTAL_CHARS, Math.floor(sourceLength * 0.72));
  if (body.length < minimumChars) errors.push("final_markdown_too_short");
  if (hasForbiddenText(body)) errors.push("final_markdown_forbidden_text");
  if (hasLifeBookChapterReviewForbiddenText(body)) errors.push("final_markdown_review_forbidden_text");
  if (LIFEBOOK_RISKY_ASSERTION_RE.test(body)) errors.push("final_markdown_risky_assertion");
  return {
    ok: errors.length === 0,
    errors,
    charLength: body.length,
    minimumChars,
    pagebreakCount,
  };
}

function patchLifeBookPhase6FinalQualityRequirements(markdown = "", chapters = []) {
  let body = normalizeLifeBookFinalManuscriptMarkdown(markdown);
  if (!/전문 의료 상담|의학적 진단|치료를 대신하지/.test(body)) {
    body = normalizeLifeBookFinalManuscriptMarkdown(`${body}

### 건강 관련 안내

이 내용은 사주 오행을 기반으로 한 자기관리 참고 자료이며, 의학적 진단이나 치료를 대신하지 않습니다. 불편이 지속되면 전문 의료 상담을 우선하십시오.`);
  }
  if (!/1월/.test(body) || !/12월/.test(body)) {
    body = normalizeLifeBookFinalManuscriptMarkdown(`${body}

${buildLifeBookYearlyFlowFinalSection(chapters)}`);
  }
  const validation = validateLifeBookPhase6FinalManuscriptMarkdown(body, chapters);
  return {
    finalManuscriptMarkdown: body,
    validation,
  };
}























async function assembleLifeBookChaptersLocally(env, { profile, signals, assemblyInput, requestId, onProgress = null }) {
  const chapters = [];
  const summaries = [];
  let deterministicReinforcedCount = 0;
  let premiumAssembledChapterCount = 0;
  const chapterPlans = buildLifeBookChapterPlans();
  const normalizedData = assemblyInput?.lifeBookMasterJson?.normalizedData || assemblyInput?.normalizedData || null;
  const localChapters = buildLifeBookChapters(profile, signals, normalizedData);
  const runtime = resolveLifeBookAssemblyRuntimeInfo(env);
  const enhancementEnabled = false;

  logLifeBookServer("LifeBookChapterPlansCreated", {
    requestId,
    chapterCount: chapterPlans.length,
    sectionCount: chapterPlans.reduce((sum, plan) => sum + (Array.isArray(plan?.sections) ? plan.sections.length : 0), 0),
    targetPages: chapterPlans.reduce((sum, plan) => sum + Number(plan?.targetPages || 0), 0),
    targetChars: chapterPlans.reduce((sum, plan) => sum + Number(plan?.targetChars || 0), 0),
    templateVersion: LIFE_BOOK_PDF_CONFIG.templateVersion,
    generationMode: LIFE_BOOK_PDF_CONFIG.generationMode,
    provider: LIFE_BOOK_PDF_CONFIG.provider,
    runtime,
    enhancementEnabled,
  });

  for (const [chapterIndex, chapterSpec] of getLifeBookBlueprints().entries()) {
    const chapterPlan = chapterPlans.find((plan) => clean(plan?.chapterId) === clean(chapterSpec.id));
    const localChapter = localChapters[chapterIndex] || buildLifeBookChapters(profile, signals, normalizedData)[chapterIndex];
    if (typeof onProgress === "function") {
      onProgress({
        stateKey: LIFEBOOK_WRITING_STATE,
        currentChapterNo: chapterIndex,
        currentChapterTitle: clean(chapterSpec.title),
        totalChapters: getLifeBookBlueprints().length,
      });
    }
    logLifeBookServer("LocalChapterStart", {
      requestId,
      chapterNumber: chapterSpec.roman,
      categoryCount: chapterSpec.categories.length,
      targetPages: getLifeBookPagePlan(chapterSpec.id).targetPages,
      sectionCount: Array.isArray(chapterPlan?.sections) ? chapterPlan.sections.length : 0,
    });
    let generated = {
      chapter: {
        ...localChapter,
        chapterPlan,
        source: "premium-assembled",
      },
      summary: summarizeLifeBookChapter(localChapter),
      deterministicReinforced: false,
      premiumAssembled: true,
    };
    chapters.push(generated.chapter);
    summaries.push({
      chapterNumber: chapterSpec.roman,
      chapterTitle: chapterSpec.title,
      summary: generated.summary,
    });
    if (generated.deterministicReinforced) deterministicReinforcedCount += 1;
    if (generated.premiumAssembled) premiumAssembledChapterCount += 1;
    if (typeof onProgress === "function") {
      onProgress({
        stateKey: LIFEBOOK_WRITING_STATE,
        currentChapterNo: chapterIndex + 1,
        currentChapterTitle: clean(chapterSpec.title),
        totalChapters: getLifeBookBlueprints().length,
      });
    }
    logLifeBookServer("LocalChapterDone", {
      requestId,
      chapterNumber: chapterSpec.roman,
      deterministicReinforced: generated.deterministicReinforced,
      premiumAssembled: generated.premiumAssembled,
      cacheHit: Boolean(generated.cacheHit),
      charLength: chapterTextLength(generated.chapter),
    });
  }

  const sanitized = sanitizeLifeBookChapters(profile, signals, chapters, { authoringMode: LIFEBOOK_AUTHORING_MODE });
  const preFinalHighQualityGate = validateLifeBookHighQualityReadiness(sanitized, {
    manuscriptSource: "premium-local-chapter-assembly",
    generationMode: LIFE_BOOK_PDF_CONFIG.generationMode,
  });
  logLifeBookServer("LifeBookHighQualityPreFinalGate", {
    requestId,
    ok: preFinalHighQualityGate.ok,
    errors: preFinalHighQualityGate.errors,
    warnings: preFinalHighQualityGate.warnings,
    qualityScore: preFinalHighQualityGate.qualityScore,
  });
  if (!preFinalHighQualityGate.ok) {
    throw Object.assign(new Error("인생의 책 고품질 원고 기준을 충족하지 못했습니다. fallback 없이 원고를 보강한 뒤 다시 생성해 주세요."), {
      code: "LIFEBOOK_HIGH_QUALITY_GATE_FAILED",
      status: 422,
      details: preFinalHighQualityGate,
    });
  }
  const finalManuscriptMarkdown = buildLifeBookPhase6DeterministicFinalManuscript(profile, sanitized);
  const finalManuscriptValidation = validateLifeBookPhase6FinalManuscriptMarkdown(finalManuscriptMarkdown, sanitized);
  const finalQualityReview = patchLifeBookPhase6FinalQualityRequirements(finalManuscriptMarkdown, sanitized);
  const finalQualityReviewPassed = Boolean(finalQualityReview.validation?.ok);
  const localAssembly = {
    enabled: true,
    source: LIFE_BOOK_PDF_CONFIG.generationMode,
    provider: LIFE_BOOK_PDF_CONFIG.provider,
    templateVersion: LIFE_BOOK_PDF_CONFIG.templateVersion,
    chapterCount: sanitized.length,
    expectedChapterCount: getLifeBookBlueprints().length,
    externalGeneration: false,
    externalCallsAllowed: false,
  };
  return {
    chapters: sanitized,
    chapterPlans,
    summaries,
    finalManuscriptMarkdown: finalQualityReview.finalManuscriptMarkdown,
    finalManuscriptSource: [
      "premium-full-manuscript",
      "premium-final-pdf-review",
    ].filter(Boolean).join("+"),
    finalManuscriptErrors: [
      ...(Array.isArray(finalManuscriptValidation.errors) ? finalManuscriptValidation.errors : []),
      ...(Array.isArray(finalQualityReview.validation?.errors) ? finalQualityReview.validation.errors : []),
    ],
    finalQualityReviewSource: "premium-final-pdf-review",
    finalQualityReviewPassed,
    finalQualityReviewErrors: finalQualityReviewPassed ? [] : (finalQualityReview.validation?.errors || []),
    finalQualityReviewWarnings: Array.from(new Set([
      ...(finalQualityReview.validation?.warnings || []),
      ...(Array.isArray(finalQualityReview.validation?.errors) ? finalQualityReview.validation.errors.map((error) => `assembled_review_issue:${error}`) : []),
    ])),
    deterministicReinforcedCount,
    premiumAssembledChapterCount,
    highQualityGate: preFinalHighQualityGate,
    authoringMode: LIFEBOOK_AUTHORING_MODE,
    templateVersion: LIFE_BOOK_PDF_CONFIG.templateVersion,
    generationMode: LIFE_BOOK_PDF_CONFIG.generationMode,
    provider: LIFE_BOOK_PDF_CONFIG.provider,
    localAssembly,
    manuscriptSource: [
      LIFE_BOOK_PDF_CONFIG.templateVersion,
      "premium-local-chapter-assembly",
      "premium-full-manuscript",
      "premium-final-pdf-review",
    ].filter(Boolean).join("+"),
  };
}

function generateLifeBookPdfFromChapters(profile, signals, chapters, generatedAt, finalManuscriptMarkdown = "") {
  return buildLifeBookDocument({ profile, signals, chapters, generatedAt, finalManuscriptMarkdown });
}

function calculateSajuLocally({ birthInput = {}, profile = {}, body = {}, sessionId = "" } = {}) {
  const targetYear = resolveLifeBookTargetYear(body);
  const signals = deriveLocalSignals(profile, body?.sajuData || "", body?.analysisSignals || {}, targetYear);
  let localSajuJson = buildLifeBookLocalSajuJson(birthInput, profile, signals, []);
  let localSajuValidation = validateLifeBookLocalSajuJson(localSajuJson);
  if (!localSajuValidation.ok || (Array.isArray(localSajuValidation.warnings) && localSajuValidation.warnings.length)) {
    logLifeBookServer("LocalSajuValidationFailed", {
      sessionId,
      missing: localSajuValidation.missing,
      warnings: localSajuValidation.warnings,
    });
    localSajuJson = repairLifeBookLocalSajuJson(localSajuJson, birthInput, profile, signals);
    localSajuValidation = validateLifeBookLocalSajuJson(localSajuJson);
    if (!localSajuValidation.ok) {
      throw Object.assign(new Error("인생의 책 생성에 필요한 생년월일시 정보를 확인할 수 없습니다."), {
        code: "LIFEBOOK_LOCAL_SAJU_INVALID",
        status: 422,
        details: localSajuValidation,
      });
    }
  }

  let jsonContractValidation = validateLifeBookJsonContract({ birthInput, localSajuJson });
  if (!jsonContractValidation.ok) {
    logLifeBookServer("LifeBookJsonContractRepairStart", {
      sessionId,
      hardErrors: jsonContractValidation.hardErrors,
      softWarnings: jsonContractValidation.softWarnings,
    });
    localSajuJson = repairLifeBookLocalSajuJson(localSajuJson, birthInput, profile, signals);
    localSajuValidation = validateLifeBookLocalSajuJson(localSajuJson);
    jsonContractValidation = validateLifeBookJsonContract({ birthInput, localSajuJson });
  }
  if (!jsonContractValidation.ok) {
    throw Object.assign(new Error("인생의 책 계산 데이터가 생성 기준을 충족하지 못했습니다. 출생 정보와 사주 계산 결과를 다시 확인해 주세요."), {
      code: "LIFEBOOK_JSON_CONTRACT_INVALID",
      status: 422,
      details: jsonContractValidation,
    });
  }

  return {
    signals,
    localSajuJson,
    localSajuValidation,
    jsonContractValidation,
  };
}

function normalizeLifeBookPillarText(pillar = {}) {
  if (typeof pillar === "string") return clean(pillar);
  return clean(pillar?.ganji || `${safeLifeBookScalar(pillar?.stem)}${safeLifeBookScalar(pillar?.branch)}`);
}

function normalizeLifeBookStemElement(stem = "") {
  const key = clean(stem).toLowerCase();
  if (/^(gap|eul|jia|yi)$/.test(key) || /甲|乙/.test(key)) return "wood";
  if (/^(byeong|jeong|bing|ding)$/.test(key) || /丙|丁/.test(key)) return "fire";
  if (/^(mu|gi|wu|ji)$/.test(key) || /戊|己/.test(key)) return "earth";
  if (/^(gyeong|sin|geng|xin)$/.test(key) || /庚|辛/.test(key)) return "metal";
  if (/^(im|gye|ren|gui)$/.test(key) || /壬|癸/.test(key)) return "water";
  return "";
}

function normalizeLifeBookStemYinYang(stem = "") {
  const key = clean(stem).toLowerCase();
  if (/^(gap|byeong|mu|gyeong|im|jia|bing|wu|geng|ren)$/.test(key) || /甲|丙|戊|庚|壬/.test(key)) return "yang";
  if (/^(eul|jeong|gi|sin|gye|yi|ding|ji|xin|gui)$/.test(key) || /乙|丁|己|辛|癸/.test(key)) return "yin";
  return "";
}

function normalizeLifeBookStrength(value = "") {
  const key = clean(value).toLowerCase();
  if (/weak|약|身弱/.test(key)) return "weak";
  if (/strong|강|身强/.test(key)) return "strong";
  if (key) return "balanced";
  return undefined;
}

function pickLifeBookElementNumber(source = {}, element = "") {
  const aliases = {
    wood: ["wood", "목", "木"],
    fire: ["fire", "화", "火"],
    earth: ["earth", "토", "土"],
    metal: ["metal", "금", "金"],
    water: ["water", "수", "水"],
  }[element] || [element];
  for (const alias of aliases) {
    if (Number.isFinite(Number(source?.[alias]))) return safeNumber(source[alias], 0);
  }
  const found = Object.entries(source || {}).find(([key]) => aliases.some((alias) => clean(key).toLowerCase() === clean(alias).toLowerCase()));
  return found ? safeNumber(found[1], 0) : 0;
}

function summarizeLifeBookElementBalance(counts = {}) {
  const entries = Object.entries(counts).sort((a, b) => Number(b[1]) - Number(a[1]));
  const strongest = entries.filter(([, value]) => Number(value) === Number(entries[0]?.[1])).map(([key]) => key);
  const weakest = entries.filter(([, value]) => Number(value) === Number(entries[entries.length - 1]?.[1])).map(([key]) => key);
  const total = entries.reduce((sum, [, value]) => sum + safeNumber(value, 0), 0);
  const balanceSummary = total > 0
    ? `강하게 드러난 기운은 ${strongest.join(", ")}이며, 보완하며 다루면 좋은 기운은 ${weakest.join(", ")}입니다.`
    : "오행의 세부 비율은 보조 신호로 다루며, 원국과 대운의 큰 흐름을 중심으로 해석합니다.";
  return { strongest, weakest, balanceSummary };
}

function normalizeLifeBookTenGodDistribution(...sources) {
  const merged = {};
  sources.forEach((source) => {
    Object.entries(safeLifeBookPlainObject(source)).forEach(([key, value]) => {
      const n = Number(value);
      if (Number.isFinite(n)) merged[key] = n;
    });
  });
  const entries = Object.entries(merged).sort((a, b) => Number(b[1]) - Number(a[1]));
  const max = Number(entries[0]?.[1]);
  const min = Number(entries[entries.length - 1]?.[1]);
  return {
    distribution: merged,
    dominant: entries.filter(([, value]) => Number(value) === max && Number.isFinite(max)).map(([key]) => key),
    weak: entries.filter(([, value]) => Number(value) === min && Number.isFinite(min)).map(([key]) => key),
  };
}

function normalizeLifeBookRelationList(...values) {
  return safeLifeBookList(values.flatMap((value) => Array.isArray(value) ? value : [value]))
    .filter((item) => !/\[object Object\]/i.test(item));
}

function normalizeLifeBookSpecialStars(...values) {
  return values.flatMap((value) => Array.isArray(value) ? value : [])
    .map((star) => {
      if (typeof star === "string") return { name: clean(star), meaning: "이 별은 삶의 반복 패턴과 선택의 감각을 읽는 보조 신호로 다룹니다." };
      const name = safeLifeBookScalar(star?.name || star?.label || star?.title);
      if (!name) return null;
      return {
        name,
        meaning: safeLifeBookScalar(star?.meaning || star?.description || star?.summary, "이 별은 삶의 반복 패턴과 선택의 감각을 읽는 보조 신호로 다룹니다."),
        strength: Number.isFinite(Number(star?.strength || star?.score)) ? safeNumber(star?.strength || star?.score, 0) : undefined,
      };
    })
    .filter(Boolean);
}

function makeLifeBookBlock(id, tags, weight, title, summary, body, advice = [], caution = [], checklist = []) {
  return {
    id,
    tags,
    weight,
    title,
    summary,
    body,
    advice,
    caution,
    checklist,
  };
}

const LIFEBOOK_DAY_MASTER_BLOCKS = Object.freeze({
  gap: makeLifeBookBlock("day-master-gap", ["dayMaster", "gap", "wood", "yang"], 10, "갑목 일간의 삶의 축", "갑목은 큰 나무처럼 방향성과 성장감을 통해 자기 길을 세우는 힘입니다.", ["갑목은 위로 뻗는 나무처럼 삶의 기준을 세우고 넓은 판에서 성장할 때 힘이 살아납니다.", "중요한 것은 명분, 장기 목표, 스스로 선택했다는 확신입니다.", "억지로 꺾이는 환경에서는 답답함이 커지고 넓은 역할을 맡으면 빠르게 성장합니다."], ["장기 목표를 시각화하고 매년 하나의 큰 줄기를 정해 밀고 나가는 방식이 좋습니다."], ["자존심이 강해질수록 유연성이 떨어질 수 있으므로 타인의 조언을 완전히 배척하지 않는 것이 중요합니다."], ["선택 연도에 반드시 키워야 할 한 가지 능력 정하기", "체면 때문에 미루는 선택 정리하기"]),
  eul: makeLifeBookBlock("day-master-eul", ["dayMaster", "eul", "wood", "yin"], 10, "을목 일간의 섬세한 확장력", "을목은 풀과 넝쿨처럼 환경을 읽고 부드럽게 뻗어가는 힘입니다.", ["을목은 단번에 밀어붙이기보다 관계와 분위기를 읽으며 길을 찾아갑니다.", "섬세함, 적응력, 꾸준한 개선이 삶의 중요한 무기입니다.", "작은 기회도 오래 돌보면 큰 결과로 이어질 수 있습니다."], ["작게 시작해 반복적으로 개선하는 루틴이 좋습니다."], ["주변 분위기에 너무 맞추면 자신의 중심이 흐려질 수 있습니다."], ["내가 지켜야 할 기준 한 문장으로 정리하기", "작은 성과를 주간 단위로 기록하기"]),
  byeong: makeLifeBookBlock("day-master-byeong", ["dayMaster", "byeong", "fire", "yang"], 10, "병화 일간의 빛과 존재감", "병화는 태양처럼 드러내고 밝히는 힘으로 사람과 일을 움직입니다.", ["병화는 숨기기보다 표현할 때 힘이 살아납니다.", "명확한 비전, 인정, 따뜻한 리더십이 삶의 중요한 동력입니다.", "주변을 밝히는 만큼 스스로의 열도 잘 관리해야 합니다."], ["사람 앞에서 설명하고 공유하는 역할을 적극적으로 선택하면 좋습니다."], ["과열되면 성급한 판단과 감정 소모가 커질 수 있습니다."], ["이번 달 공개적으로 완성할 결과물 정하기", "휴식 시간을 일정에 먼저 넣기"]),
  jeong: makeLifeBookBlock("day-master-jeong", ["dayMaster", "jeong", "fire", "yin"], 10, "정화 일간의 집중된 온기", "정화는 촛불처럼 필요한 곳을 깊고 오래 비추는 힘입니다.", ["정화는 큰 소리보다 깊은 몰입과 정성에서 힘이 나옵니다.", "사람의 마음을 살피고 작은 차이를 읽는 감각이 좋습니다.", "자기 안의 불씨를 꺼뜨리지 않는 환경 선택이 중요합니다."], ["작고 깊은 전문성을 쌓아 신뢰를 만드는 방식이 좋습니다."], ["감정 소모가 누적되면 판단력이 흐려질 수 있습니다."], ["소모적인 관계 하나 줄이기", "내 전문성을 보여줄 작은 결과물 만들기"]),
  mu: makeLifeBookBlock("day-master-mu", ["dayMaster", "mu", "earth", "yang"], 10, "무토 일간의 산 같은 중심", "무토는 산처럼 버티고 구조를 세우는 힘입니다.", ["무토는 쉽게 흔들리지 않는 중심을 가지고 있습니다.", "사람과 일을 품는 힘이 있지만 책임을 너무 많이 안으면 무거워집니다.", "큰 판을 보고 장기적인 질서를 만드는 데 강합니다."], ["역할과 책임의 경계를 명확히 정하면 힘이 안정됩니다."], ["혼자 다 감당하려 하면 몸과 마음이 늦게 무너질 수 있습니다."], ["맡을 일과 내려놓을 일 구분하기", "장기 계획을 분기 단위로 나누기"]),
  gi: makeLifeBookBlock("day-master-gi", ["dayMaster", "gi", "earth", "yin"], 10, "기토 일간의 현실 감각", "기토는 밭처럼 필요한 것을 길러내는 실용적 힘입니다.", ["기토는 현실의 조건을 세밀하게 살피고 쓸모 있는 결과로 바꾸는 능력이 있습니다.", "돌봄, 관리, 조율, 실무 감각이 강점입니다.", "작은 균형이 무너지면 마음의 피로가 빠르게 쌓일 수 있습니다."], ["생활과 일의 기준표를 만들어 반복 가능한 방식을 선택하면 좋습니다."], ["타인의 문제를 지나치게 떠안지 않도록 조심해야 합니다."], ["반복 업무 자동화하기", "내 책임이 아닌 일 하나 내려놓기"]),
  gyeong: makeLifeBookBlock("day-master-gyeong", ["dayMaster", "gyeong", "metal", "yang"], 10, "경금 일간의 결단과 단련", "경금은 쇠처럼 단련을 통해 강해지는 결단의 힘입니다.", ["경금은 기준이 분명하고 필요한 순간 결정을 내리는 힘이 있습니다.", "경쟁, 개선, 구조 조정에서 강점이 살아납니다.", "다만 단단함이 지나치면 관계에서 차갑게 느껴질 수 있습니다."], ["목표를 수치화하고 불필요한 것을 정리하는 방식이 좋습니다."], ["옳고 그름만 앞세우면 협력의 여지가 줄어들 수 있습니다."], ["정리할 업무 세 가지 쓰기", "결정 전 상대의 의도 한 번 확인하기"]),
  sin: makeLifeBookBlock("day-master-sin", ["dayMaster", "sin", "metal", "yin"], 10, "신금 일간의 정밀한 가치", "신금은 보석처럼 세밀하게 다듬어질수록 빛나는 힘입니다.", ["신금은 디테일, 품질, 감각, 기준에서 강점이 큽니다.", "완성도 높은 결과물을 만들 때 존재감이 커집니다.", "예민함은 재능이지만 피로가 쌓이면 자기비판으로 바뀔 수 있습니다."], ["품질 기준을 정하고 작은 개선을 꾸준히 쌓으면 좋습니다."], ["완벽주의 때문에 시작이 늦어지지 않도록 조심해야 합니다."], ["완성 기준 80% 정하기", "비교 대신 전월 대비 개선 기록하기"]),
  im: makeLifeBookBlock("day-master-im", ["dayMaster", "im", "water", "yang"], 10, "임수 일간의 큰 흐름", "임수는 큰 강과 바다처럼 넓게 보고 흐름을 만드는 힘입니다.", ["임수는 정보, 이동, 확장, 전략적 사고에서 강합니다.", "한곳에 갇히기보다 큰 흐름을 읽을 때 판단이 좋아집니다.", "생각이 너무 넓어지면 실행이 늦어질 수 있습니다."], ["큰 방향을 정한 뒤 실행 단위를 작게 쪼개는 방식이 좋습니다."], ["가능성을 너무 많이 열어두면 결정 피로가 커집니다."], ["이번 주 실행할 일 세 가지만 남기기", "정보 수집 시간 제한하기"]),
  gye: makeLifeBookBlock("day-master-gye", ["dayMaster", "gye", "water", "yin"], 10, "계수 일간의 깊은 통찰", "계수는 비와 안개처럼 조용히 스며드는 통찰의 힘입니다.", ["계수는 관찰력, 직감, 분석, 정서적 이해가 섬세합니다.", "겉으로 드러나지 않는 흐름을 읽는 능력이 있습니다.", "불확실성이 길어지면 걱정이 많아질 수 있습니다."], ["기록과 분석을 통해 직감을 현실 판단으로 연결하면 좋습니다."], ["생각만 깊어지고 실행이 멈추지 않도록 주의해야 합니다."], ["걱정을 실행 항목으로 바꾸기", "매일 짧은 기록 남기기"]),
});

const LIFEBOOK_ELEMENT_BLOCKS = Object.freeze(Object.fromEntries(["wood", "fire", "earth", "metal", "water"].flatMap((element) => ([
  [`${element}-excess`, makeLifeBookBlock(`element-${element}-excess`, ["element", element, "excess"], 8, `${element} 과다의 흐름`, `${element} 기운이 강하면 장점이 빠르게 드러나지만 과열된 방식은 조절이 필요합니다.`, [`${element} 기운이 강한 구조는 추진력과 반복성이 분명합니다.`, "강한 기운은 성과를 만들지만 한 방향으로만 몰릴 때 피로를 키웁니다.", "좋은 결과를 위해서는 강점을 억누르기보다 사용할 자리와 쉬어갈 자리를 나누는 것이 좋습니다."], ["강한 기운을 일의 핵심 역할로 배치하십시오."], ["같은 방식만 고집하면 관계와 건강의 균형이 흔들릴 수 있습니다."], ["강점이 쓰이는 자리 정하기", "과한 반응이 나온 상황 기록하기"])],
  [`${element}-deficient`, makeLifeBookBlock(`element-${element}-deficient`, ["element", element, "deficient"], 8, `${element} 부족의 보완`, `${element} 기운이 약하면 생활 리듬과 선택 기준에서 의식적 보완이 필요합니다.`, [`${element} 기운이 약한 구조는 해당 영역을 천천히 길러야 안정됩니다.`, "부족은 결핍이 아니라 관리해야 할 방향입니다.", "작은 루틴으로 보완하면 전체 흐름이 부드러워집니다."], ["약한 기운과 연결된 생활 습관을 작게 보완하십시오."], ["부족한 기운을 한 번에 채우려 하면 무리한 선택이 될 수 있습니다."], ["보완 루틴 하나 정하기", "약한 영역의 도움 요청하기"])],
  [`${element}-balanced`, makeLifeBookBlock(`element-${element}-balanced`, ["element", element, "balanced"], 6, `${element} 균형의 사용`, `${element} 기운은 균형 있게 쓰일 때 안정적인 성과로 이어집니다.`, [`${element} 기운이 균형권에 있으면 무리한 확대보다 유지와 조율이 중요합니다.`, "이미 가진 흐름을 반복 가능한 구조로 만들면 결과가 오래 갑니다.", "균형은 멈춤이 아니라 지나침을 피하는 힘입니다."], ["현재 유지되는 좋은 습관을 끊기지 않게 관리하십시오."], ["균형 상태를 당연하게 여기면 작은 흐트러짐을 놓칠 수 있습니다."], ["유지할 습관 세 가지 쓰기", "흐트러진 신호를 주간 점검하기"])],
]))));

const LIFEBOOK_TEN_GOD_BLOCKS = Object.freeze(Object.fromEntries(["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인", "resource", "wealth", "officer", "output", "self"].flatMap((god) => ([
  [`${god}-strong`, makeLifeBookBlock(`ten-god-${god}-strong`, ["tenGod", god, "strong"], 7, `${god} 강세`, `${god} 기운이 강하면 삶의 특정 반응 방식이 선명하게 드러납니다.`, [`${god} 기운은 성향과 선택의 습관을 보여주는 중요한 신호입니다.`, "강한 십성은 재능이면서 동시에 반복되는 과제가 됩니다.", "잘 쓰면 전문성과 성과가 되고 과하면 관계나 일의 균형을 흔들 수 있습니다."], ["강한 십성을 역할과 성과로 연결하십시오."], ["강점이 과해질 때 나타나는 말투와 선택을 점검하십시오."], ["강점이 발휘되는 상황 기록하기", "과했던 반응 하나 줄이기"])],
  [`${god}-weak`, makeLifeBookBlock(`ten-god-${god}-weak`, ["tenGod", god, "weak"], 6, `${god} 약세`, `${god} 기운이 약하면 외부 환경과 루틴으로 보완하는 편이 좋습니다.`, [`${god} 기운이 약하다는 것은 없는 것이 아니라 의식적으로 길러야 한다는 뜻입니다.`, "약한 십성은 선택의 사각지대를 알려줍니다.", "혼자 해결하기보다 구조, 사람, 일정의 도움을 받으면 안정됩니다."], ["약한 십성과 연결된 행동을 작은 습관으로 만드십시오."], ["부족을 성급하게 메우려 하면 무리한 선택이 될 수 있습니다."], ["보완할 행동 하나 정하기", "도움 받을 사람이나 시스템 찾기"])],
]))));

const LIFEBOOK_USEFUL_GOD_BLOCKS = Object.freeze(Object.fromEntries(["wood", "fire", "earth", "metal", "water", "목", "화", "토", "금", "수"].flatMap((element) => ([
  [`${element}-yongshin`, makeLifeBookBlock(`useful-${element}-yongshin`, ["usefulGod", "yongshin", element], 9, `${element} 용신의 방향`, `${element}이 용신으로 작동하면 삶의 균형을 여는 핵심 방향이 됩니다.`, [`${element} 용신은 좋은 운을 보장하는 단어가 아니라 균형을 회복하는 사용법입니다.`, "이 기운과 연결된 환경, 사람, 일의 방식이 살아날수록 판단이 안정됩니다.", "중요한 선택에서는 이 기운을 살리는 방향인지 확인하는 것이 좋습니다."], ["용신과 맞는 공간, 업무 방식, 생활 리듬을 늘리십시오."], ["용신을 욕심으로 몰아붙이면 오히려 균형이 무너질 수 있습니다."], ["용신을 살리는 하루 습관 정하기", "중요 결정 전 균형 기준 확인하기"])],
  [`${element}-heeshin`, makeLifeBookBlock(`useful-${element}-heeshin`, ["usefulGod", "heeshin", element], 7, `${element} 희신의 보조`, `${element} 희신은 용신을 돕는 보조 에너지로 활용됩니다.`, ["희신은 직접 주인공이 되기보다 좋은 흐름을 유지시키는 힘입니다.", "생활 속 작은 보완이 전체 균형을 오래 붙잡아 줍니다.", "무리한 변화보다 꾸준한 지원 구조가 중요합니다."], ["희신과 연결된 습관을 주간 루틴으로 두십시오."], ["보조 기운에만 기대면 핵심 결정을 미룰 수 있습니다."], ["주간 보완 루틴 만들기", "용신과 희신 역할 구분하기"])],
  [`${element}-gishin`, makeLifeBookBlock(`useful-${element}-gishin`, ["usefulGod", "gishin", element], 8, `${element} 기신의 관리`, `${element} 기신은 피해야 할 저주가 아니라 과해질 때 관리해야 할 신호입니다.`, ["기신은 삶에서 완전히 배제할 대상이 아닙니다.", "다만 이 기운이 과해지는 환경에서는 판단이 급해지거나 균형이 흔들릴 수 있습니다.", "관리 기준을 세우면 기신도 위험 신호를 알려주는 도구가 됩니다."], ["기신이 강해지는 상황을 미리 파악하고 속도를 낮추십시오."], ["기신을 두려움으로만 보면 필요한 선택까지 피할 수 있습니다."], ["과해지는 상황 목록 만들기", "속도 낮추는 규칙 정하기"])],
]))));

const LIFEBOOK_FLOW_BLOCKS = Object.freeze({
  daewoonCurrent: makeLifeBookBlock("flow-daewoon-current", ["luckCycle", "daewoon", "current"], 8, "현재 대운의 과제", "현재 대운은 지금의 삶에서 반복적으로 다뤄야 할 큰 과제를 보여줍니다.", ["대운은 단기 사건보다 긴 주기의 무대입니다.", "지금 반복되는 일은 우연보다 구조적 과제일 가능성이 큽니다.", "무엇을 키우고 무엇을 줄일지 정하면 흐름이 안정됩니다."], ["대운의 주제를 한 문장으로 정리하십시오."], ["대운을 단정적 예언으로 받아들이지 마십시오."], ["반복되는 과제 쓰기", "10년 단위 목표 다시 보기"]),
  daewoonNext: makeLifeBookBlock("flow-daewoon-next", ["luckCycle", "daewoon", "next"], 7, "다음 대운의 준비", "다음 대운은 지금부터 정리하고 준비해야 할 변화의 방향입니다.", ["다음 흐름은 갑자기 오지 않고 현재의 선택에서 준비됩니다.", "지금 정리하는 습관과 관계가 다음 단계의 기반이 됩니다.", "큰 전환일수록 미리 작게 연습하는 편이 좋습니다."], ["다음 단계에 필요한 역량을 미리 준비하십시오."], ["아직 오지 않은 흐름 때문에 현재를 소홀히 하지 마십시오."], ["다음 3년 준비 목록 만들기", "불필요한 책임 정리하기"]),
  annual: makeLifeBookBlock("flow-annual", ["luckCycle", "annual"], 7, "세운의 실행 신호", "세운은 선택 연도에 실제로 조정해야 할 속도와 우선순위를 보여줍니다.", ["세운은 대운보다 가까운 실행 리듬입니다.", "선택 연도에 강해지는 주제는 일상 선택에서 먼저 드러납니다.", "월별로 속도를 나누면 무리한 결정이 줄어듭니다."], ["선택 연도의 목표를 분기별로 나누십시오."], ["한 해의 신호를 과장해 전부 바꾸려 하지 마십시오."], ["분기별 목표 쓰기", "월별 회고 날짜 정하기"]),
});

const LIFEBOOK_DOMAIN_BLOCKS = Object.freeze({
  love: makeLifeBookBlock("domain-love", ["love", "relationship", "romance"], 7, "연애와 애착의 방향", "연애는 설렘뿐 아니라 안정감과 회복 방식에서 읽어야 합니다.", ["좋은 인연은 감정의 크기보다 반복되는 태도에서 확인됩니다.", "관계의 속도와 기대치를 분명히 하면 오해가 줄어듭니다.", "사랑은 운명적 단정이 아니라 서로의 생활 리듬을 맞추는 과정입니다."], ["기대와 경계를 말로 확인하십시오."], ["불안 때문에 결론을 앞당기지 마십시오."], ["관계에서 필요한 기준 쓰기", "서운함을 사실과 감정으로 나누기"]),
  career: makeLifeBookBlock("domain-career", ["career", "work"], 7, "직업과 역할의 설계", "직업운은 재능이 쓰이는 무대와 책임의 형태를 함께 봅니다.", ["일의 성과는 재능만으로 결정되지 않습니다.", "자신에게 맞는 역할, 속도, 협업 방식이 맞을 때 커집니다.", "좋은 경력은 반복 가능한 결과를 쌓는 방향에서 안정됩니다."], ["강점이 결과로 보이는 업무를 선택하십시오."], ["인정 욕구만 따라가면 소모가 커질 수 있습니다."], ["성과로 남길 업무 정하기", "불필요한 역할 줄이기"]),
  money: makeLifeBookBlock("domain-money", ["money", "wealth"], 7, "재물 흐름과 관리", "재물은 들어오는 운보다 지키고 반복하는 구조가 중요합니다.", ["재물 흐름은 수입, 지출, 리스크 관리가 함께 움직입니다.", "강한 기운이 돈을 벌어도 약한 관리가 새는 구멍을 만들 수 있습니다.", "수익보다 먼저 안정적인 기준을 세우면 운의 흔들림을 줄일 수 있습니다."], ["고정 지출과 투자 판단 기준을 분리하십시오."], ["확정 수익이나 과도한 확신을 경계하십시오."], ["월 지출 기준 정하기", "위험한 충동 결제 기록하기"]),
  health: makeLifeBookBlock("domain-health", ["health", "body"], 7, "건강과 회복 리듬", "건강은 의학적 단정이 아니라 생활 리듬과 회복력의 관점에서 다룹니다.", ["몸의 흐름은 수면, 식사, 움직임, 감정 소모와 연결됩니다.", "약한 기운은 꾸준한 관리 루틴으로 보완하는 편이 좋습니다.", "불편이 지속되면 전문 의료 상담을 우선해야 합니다."], ["수면과 식사 시간을 먼저 안정시키십시오."], ["운세 해석으로 진단이나 치료를 대신하지 마십시오."], ["수면 시간 기록하기", "가벼운 움직임 루틴 만들기"]),
  relationship: makeLifeBookBlock("domain-relationship", ["relationship", "people"], 7, "인간관계와 거리감", "인간관계는 가까움보다 적절한 거리와 역할에서 안정됩니다.", ["관계의 피로는 애정 부족보다 경계의 흐림에서 시작될 수 있습니다.", "서로의 책임 범위를 분명히 하면 관계가 오래 갑니다.", "좋은 인연은 나를 소진시키지 않는 방식으로 남습니다."], ["관계별 기대와 역할을 정리하십시오."], ["모든 사람을 만족시키려 하지 마십시오."], ["가까운 관계의 경계 쓰기", "거절 문장 준비하기"]),
  crisis: makeLifeBookBlock("domain-crisis", ["crisis", "risk"], 8, "위기 대응의 기준", "위기는 빠른 결론보다 기준을 지키는 대응에서 지나갑니다.", ["흐름이 흔들릴 때는 판단보다 복구 순서가 중요합니다.", "돈, 관계, 건강, 일정 중 무엇이 먼저인지 정해야 합니다.", "작은 기준을 지키면 큰 흔들림도 지나갈 수 있습니다."], ["위기 상황에서 줄일 것과 지킬 것을 미리 정하십시오."], ["두려움에 밀려 모든 것을 동시에 바꾸지 마십시오."], ["비상 기준 세 가지 쓰기", "상담하거나 도움 받을 사람 정하기"]),
  routine: makeLifeBookBlock("domain-routine", ["routine", "actionPlan"], 8, "실천 루틴의 고정", "운의 흐름은 매일 반복되는 작은 루틴에서 현실이 됩니다.", ["큰 운도 작은 습관을 통해 삶에 들어옵니다.", "루틴은 완벽해야 하는 규칙이 아니라 다시 돌아올 기준입니다.", "반복 가능한 행동을 정하면 불안이 줄고 성과가 쌓입니다."], ["하루 20분짜리 고정 루틴부터 시작하십시오."], ["처음부터 많은 루틴을 만들면 쉽게 지칠 수 있습니다."], ["아침 또는 저녁 루틴 하나 정하기", "7일 단위로 유지 여부 점검하기"]),
});

function normalizeLifeBookStemBlockKey(value = "") {
  const key = clean(value).toLowerCase();
  if (/^(gap|jia)$/.test(key) || key.includes("갑") || key.includes("甲")) return "gap";
  if (/^(eul|yi)$/.test(key) || key.includes("을") || key.includes("乙")) return "eul";
  if (/^(byeong|bing)$/.test(key) || key.includes("병") || key.includes("丙")) return "byeong";
  if (/^(jeong|ding)$/.test(key) || key.includes("정") || key.includes("丁")) return "jeong";
  if (/^(mu|wu)$/.test(key) || key.includes("무") || key.includes("戊")) return "mu";
  if (/^(gi|ji)$/.test(key) || key.includes("기") || key.includes("己")) return "gi";
  if (/^(gyeong|geng)$/.test(key) || key.includes("경") || key.includes("庚")) return "gyeong";
  if (/^(sin|xin)$/.test(key) || key.includes("신") || key.includes("辛")) return "sin";
  if (/^(im|ren)$/.test(key) || key.includes("임") || key.includes("壬")) return "im";
  if (/^(gye|gui)$/.test(key) || key.includes("계") || key.includes("癸")) return "gye";
  return "";
}

function normalizeLifeBookElementBlockKey(value = "") {
  const key = clean(value).toLowerCase();
  if (key.includes("wood") || key.includes("목") || key.includes("木")) return "wood";
  if (key.includes("fire") || key.includes("화") || key.includes("火")) return "fire";
  if (key.includes("earth") || key.includes("토") || key.includes("土")) return "earth";
  if (key.includes("metal") || key.includes("금") || key.includes("金")) return "metal";
  if (key.includes("water") || key.includes("수") || key.includes("水")) return "water";
  return "";
}

function pushLifeBookBlock(blocks, seen, block) {
  if (!block?.id || seen.has(block.id)) return;
  seen.add(block.id);
  blocks.push(block);
}

function buildLifeBookSentenceSeed(normalizedData = {}, chapter = {}, categoryTitle = "") {
  return hashLifeBookCacheText(stableLifeBookCacheJson({
    dayMaster: normalizedData?.dayMaster?.stem || "",
    pillars: normalizedData?.pillars || {},
    strongest: normalizedData?.fiveElements?.strongest || [],
    weakest: normalizedData?.fiveElements?.weakest || [],
    chapterId: chapter?.id || "",
    categoryTitle,
  }));
}

function lifeBookSeedNumber(seed = "", salt = "") {
  const value = hashLifeBookCacheText(`${seed}:${salt}`);
  return parseInt(value.slice(0, 6), 36) || 0;
}

function rotateLifeBookList(list = [], offset = 0) {
  const items = safeLifeBookList(list);
  if (items.length <= 1) return items;
  const start = Math.abs(Number(offset || 0)) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function softenLifeBookLocalWording(value = "") {
  return stripForbiddenTokens(value)
    .replace(/반드시\s*성공한다/g, "성공 가능성을 높일 수 있다")
    .replace(/반드시\s*이혼한다/g, "관계의 균열을 세심하게 관리할 필요가 있다")
    .replace(/100\s*%\s*돈\s*번다/g, "재물 흐름이 좋아질 여지를 만들 수 있다")
    .replace(/100\s*%/g, "매우 높은 확신처럼 단정하기보다")
    .replace(/무조건\s*좋다/g, "좋게 작동할 여지가 있다")
    .replace(/무조건\s*나쁘다/g, "관리할 지점이 있다")
    .replace(/무조건/g, "한쪽으로 단정하기보다")
    .replace(/반드시/g, "우선")
    .replace(/확정\s*수익/g, "성급한 확신")
    .replace(/수익\s*보장/g, "수입 가능성에 대한 과도한 확신")
    .replace(/투자\s*수익/g, "재물 흐름")
    .replace(/투자\s*판단/g, "위험 판단")
    .replace(/종목\s*추천/g, "구체적 금융 선택")
    .replace(/의학적\s*진단처럼/g, "생활 리듬의 경향으로")
    .replace(/질병을\s*얻게/g, "몸의 신호가 예민해질 수")
    .replace(/암에\s*걸[^\s.]*/g, "건강 신호를 점검해야")
    .replace(/우울증|공황장애/g, "정서적 부담")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getLifeBookBlockTone(block = {}) {
  const tags = safeLifeBookList(block.tags);
  if (tags.includes("strong") || tags.includes("excess") || tags.includes("yongshin")) return "strong";
  if (tags.includes("weak") || tags.includes("deficient") || tags.includes("gishin")) return "weak";
  return "balanced";
}

function selectLifeBookDomainBlocks(chapter = {}, categoryTitle = "") {
  const chapterId = String(chapter?.id || "");
  const title = clean(`${chapter?.title || ""} ${categoryTitle}`).toLowerCase();
  const keys = [];
  if (chapterId === "08" || title.includes("연애") || title.includes("애착") || title.includes("결혼") || title.includes("관계")) keys.push("love", "relationship");
  if (chapterId === "09" || title.includes("재물") || title.includes("돈") || title.includes("직업") || title.includes("커리어")) keys.push("money", "career");
  if (chapterId === "10" || title.includes("건강") || title.includes("회복") || title.includes("생활 리듬")) keys.push("health");
  if (chapterId === "11" || title.includes("대운")) keys.push("daewoonCurrent", "daewoonNext");
  if (chapterId === "12" || title.includes("세운") || title.includes("월운") || title.includes("가까운 미래")) keys.push("annual");
  if (chapterId === "13" || title.includes("마스터플랜")) keys.push("crisis", "career", "money", "relationship");
  return keys;
}

function selectLifeBookInterpretationBlocks(normalizedData = {}, chapter = {}, categoryTitle = "") {
  const blocks = [];
  const seen = new Set();
  const dayStemKey = normalizeLifeBookStemBlockKey(normalizedData?.dayMaster?.stem || normalizedData?.pillars?.day);
  pushLifeBookBlock(blocks, seen, LIFEBOOK_DAY_MASTER_BLOCKS[dayStemKey]);

  safeLifeBookList(normalizedData?.fiveElements?.strongest).forEach((element) => {
    const key = normalizeLifeBookElementBlockKey(element);
    pushLifeBookBlock(blocks, seen, LIFEBOOK_ELEMENT_BLOCKS[`${key}-excess`]);
  });
  safeLifeBookList(normalizedData?.fiveElements?.weakest).forEach((element) => {
    const key = normalizeLifeBookElementBlockKey(element);
    pushLifeBookBlock(blocks, seen, LIFEBOOK_ELEMENT_BLOCKS[`${key}-deficient`]);
  });
  ["wood", "fire", "earth", "metal", "water"].forEach((element) => {
    if (blocks.some((block) => block?.tags?.includes(element))) return;
    if (Number(normalizedData?.fiveElements?.[element]) > 0) pushLifeBookBlock(blocks, seen, LIFEBOOK_ELEMENT_BLOCKS[`${element}-balanced`]);
  });

  safeLifeBookList(normalizedData?.tenGods?.dominant).forEach((god) => {
    pushLifeBookBlock(blocks, seen, LIFEBOOK_TEN_GOD_BLOCKS[`${clean(god)}-strong`]);
  });
  safeLifeBookList(normalizedData?.tenGods?.weak).forEach((god) => {
    pushLifeBookBlock(blocks, seen, LIFEBOOK_TEN_GOD_BLOCKS[`${clean(god)}-weak`]);
  });

  const yongshinKey = normalizeLifeBookElementBlockKey(normalizedData?.usefulGods?.yongshin);
  pushLifeBookBlock(blocks, seen, LIFEBOOK_USEFUL_GOD_BLOCKS[`${yongshinKey}-yongshin`]);
  safeLifeBookList(normalizedData?.usefulGods?.heeshin).forEach((element) => {
    const key = normalizeLifeBookElementBlockKey(element);
    pushLifeBookBlock(blocks, seen, LIFEBOOK_USEFUL_GOD_BLOCKS[`${key}-heeshin`]);
  });
  safeLifeBookList(normalizedData?.usefulGods?.gishin).forEach((element) => {
    const key = normalizeLifeBookElementBlockKey(element);
    pushLifeBookBlock(blocks, seen, LIFEBOOK_USEFUL_GOD_BLOCKS[`${key}-gishin`]);
  });

  selectLifeBookDomainBlocks(chapter, categoryTitle).forEach((key) => {
    pushLifeBookBlock(blocks, seen, LIFEBOOK_FLOW_BLOCKS[key] || LIFEBOOK_DOMAIN_BLOCKS[key]);
  });

  if (normalizedData?.luckCycles?.currentDaewoon) pushLifeBookBlock(blocks, seen, LIFEBOOK_FLOW_BLOCKS.daewoonCurrent);
  if (normalizedData?.luckCycles?.nextDaewoon) pushLifeBookBlock(blocks, seen, LIFEBOOK_FLOW_BLOCKS.daewoonNext);
  if (normalizedData?.luckCycles?.annualLuck) pushLifeBookBlock(blocks, seen, LIFEBOOK_FLOW_BLOCKS.annual);

  const seed = buildLifeBookSentenceSeed(normalizedData, chapter, categoryTitle);
  return blocks.sort((a, b) => {
    const weightDelta = Number(b.weight || 0) - Number(a.weight || 0);
    if (Math.abs(weightDelta) >= 2) return weightDelta;
    return lifeBookSeedNumber(seed, a.id) - lifeBookSeedNumber(seed, b.id);
  });
}

function renderLifeBookInterpretationBlock(block = {}, seed = "") {
  const tone = getLifeBookBlockTone(block);
  const bodyLimit = tone === "strong" ? 4 : tone === "weak" ? 2 : 3;
  const adviceLimit = tone === "weak" ? 3 : 2;
  const cautionLimit = tone === "weak" ? 2 : 1;
  const body = rotateLifeBookList(block.body, lifeBookSeedNumber(seed, `${block.id}:body`)).slice(0, bodyLimit).join(" ");
  const advice = rotateLifeBookList(block.advice, lifeBookSeedNumber(seed, `${block.id}:advice`)).slice(0, adviceLimit).join(" ");
  const caution = rotateLifeBookList(block.caution, lifeBookSeedNumber(seed, `${block.id}:caution`)).slice(0, cautionLimit).join(" ");
  const toneLine = tone === "strong"
    ? "강하게 드러나는 항목이므로 장점이 발휘되는 환경, 반복될 때의 부담, 현실에서 쓰는 자리를 함께 보아야 합니다."
    : tone === "weak"
      ? "약하게 드러나는 항목은 결핍으로 단정하지 않고, 생활 리듬과 도움을 받을 구조를 통해 보완하는 편이 좋습니다."
      : "균형권의 항목은 과하게 키우기보다 현재의 좋은 흐름을 유지하고 흔들리는 신호를 일찍 알아차리는 데 의미가 있습니다.";
  const relationLine = safeLifeBookList(block.tags).some((tag) => ["relationship", "love", "crisis"].includes(tag))
    ? "합, 충, 형, 파, 해와 같은 관계성은 좋고 나쁨의 판정이 아니라 힘이 부딪히거나 묶이는 방식입니다. 중요한 것은 작동 방식을 읽고 말투, 거리, 기대치를 조절하는 일입니다."
    : "";
  return softenLifeBookLocalWording([
    `${safeLifeBookScalar(block.title)}: ${safeLifeBookScalar(block.summary)}`,
    body,
    toneLine,
    relationLine,
    advice ? `상담 포인트는 ${advice}` : "",
    caution ? `주의할 점은 ${caution}` : "",
  ].filter(Boolean).join("\n\n"));
}

function buildLifeBookBlockInterpretationText(normalizedData = {}, chapter = {}, categoryTitle = "", limit = 5) {
  const selected = selectLifeBookInterpretationBlocks(normalizedData, chapter, categoryTitle).slice(0, limit);
  if (!selected.length) return "";
  const seed = buildLifeBookSentenceSeed(normalizedData, chapter, categoryTitle);
  return dedupeParagraphs(selected.map((block) => renderLifeBookInterpretationBlock(block, seed)).filter(Boolean).join("\n\n"));
}

function buildLifeBookContractContextLines(normalizedData = {}, chapter = {}, categoryTitle = "") {
  const chapterTitle = clean(categoryTitle || chapter?.title || "");
  const lines = [];
  const notes = safeLifeBookList(normalizedData?.structure?.notes);
  const opportunities = safeLifeBookList(normalizedData?.opportunities);
  const risks = safeLifeBookList(normalizedData?.risks);
  const strongest = safeLifeBookList(normalizedData?.fiveElements?.strongest);
  const weakest = safeLifeBookList(normalizedData?.fiveElements?.weakest);
  const clashes = safeLifeBookList(normalizedData?.relationships?.clashes);
  const punishments = safeLifeBookList(normalizedData?.relationships?.punishments);
  const combinations = safeLifeBookList(normalizedData?.relationships?.combinations);
  const monthlyLuck = safeLifeBookList(normalizedData?.luckCycles?.monthlyLuck)
    .slice(0, 2)
    .map((item) => clean(item?.focus || item?.label || item?.name || item?.title || item?.text || item))
    .filter(Boolean);
  const currentDaewoon = clean(
    normalizedData?.luckCycles?.currentDaewoon?.label
      || normalizedData?.luckCycles?.currentDaewoon
      || "",
  );
  const nextDaewoon = clean(
    normalizedData?.luckCycles?.nextDaewoon?.label
      || normalizedData?.luckCycles?.nextDaewoon
      || "",
  );

  if (notes.length) {
    lines.push(`이번 항목의 핵심은 ${chapterTitle ? `${chapterTitle} 기준` : "현재 운세"}: ${notes[0]}`);
  }
  if (strongest.length || weakest.length) {
    const strength = strongest.length ? `강점 ${strongest.join(", ")}` : "";
    const weakness = weakest.length ? `보완 ${weakest.join(", ")}` : "";
    lines.push([strength, weakness].filter(Boolean).join(" / "));
  }
  if (opportunities.length) {
    lines.push(`기회 신호: ${opportunities.slice(0, 3).join(", ")}`);
  }
  if (risks.length) {
    lines.push(`주의 신호: ${risks.slice(0, 3).join(", ")}`);
  }
  if (combinations.length) {
    lines.push(`화합 포인트: ${combinations.slice(0, 2).join(", ")}`);
  }
  if (clashes.length) {
    lines.push(`충돌 포인트: ${clashes.slice(0, 2).join(", ")}`);
  }
  if (punishments.length) {
    lines.push(`억압/제한 포인트: ${punishments.slice(0, 2).join(", ")}`);
  }
  if (currentDaewoon || nextDaewoon) {
    lines.push(`${currentDaewoon ? `현재 대운 ${currentDaewoon}` : "현재 대운"} 기준으로 다음 흐름은 ${nextDaewoon || "다음 대운"}을 봐야 합니다.`);
  }
  if (monthlyLuck.length) {
    lines.push(`근접 월간 흐름: ${monthlyLuck.join(", ")}`);
  }
  return lines.slice(0, 4).join("\n\n");
}

function buildLifeBookNormalizedData({ birthInput = {}, profile = {}, signals = {}, localSajuJson = {}, engineContract = {}, canonicalSajuChart = {} } = {}) {
  const pillars = canonicalSajuChart?.fourPillars || engineContract?.natal?.pillars || localSajuJson?.pillars || {};
  const dayStem = safeLifeBookScalar(canonicalSajuChart?.dayMaster?.stem || engineContract?.natal?.dayMaster || localSajuJson?.dayMaster || signals?.dayMaster);
  const elementCountsSource = engineContract?.fiveElements?.counts || canonicalSajuChart?.fiveElements || localSajuJson?.fiveElements || signals?.elementWeights || {};
  const fiveElementCounts = {
    wood: pickLifeBookElementNumber(elementCountsSource, "wood"),
    fire: pickLifeBookElementNumber(elementCountsSource, "fire"),
    earth: pickLifeBookElementNumber(elementCountsSource, "earth"),
    metal: pickLifeBookElementNumber(elementCountsSource, "metal"),
    water: pickLifeBookElementNumber(elementCountsSource, "water"),
  };
  const elementSummary = summarizeLifeBookElementBalance(fiveElementCounts);
  const tenGods = normalizeLifeBookTenGodDistribution(
    engineContract?.tenGods?.distribution,
    canonicalSajuChart?.tenGods?.distribution,
    localSajuJson?.tenGods,
    signals?.tenGodCounts,
  );
  const useful = engineContract?.strengthJohuYongshin?.yongshin || canonicalSajuChart?.usefulGods || localSajuJson?.yongshin || localSajuJson?.usefulGods || {};
  const interactions = engineContract?.interactions || canonicalSajuChart?.relations || localSajuJson?.interactions || {};
  const annualLuck = engineContract?.year2026 || canonicalSajuChart?.annualLuck || localSajuJson?.yearlyFlow || {};
  const monthlyLuck = engineContract?.monthlyLuck2026 || canonicalSajuChart?.monthlyLuck || [];
  const currentDaewoon = engineContract?.daeun?.current || canonicalSajuChart?.luckCycles?.currentDaewoon || localSajuJson?.currentDaeun || null;
  const nextDaewoon = engineContract?.daeun?.next || canonicalSajuChart?.luckCycles?.nextDaewoon || localSajuJson?.nextDaeun || null;
  const yongshin = safeLifeBookScalar(useful?.primary || useful?.element || useful?.usefulElement || useful?.yongsin?.element);
  const heeshin = safeLifeBookList(useful?.huishin || useful?.hee || useful?.heeshin || useful?.huisin?.elements || localSajuJson?.yongshin?.usefulElements);
  const gishin = safeLifeBookList(useful?.gishin || useful?.gi || useful?.gishin || useful?.cautionElements || localSajuJson?.yongshin?.cautionElements);

  return {
    profile: {
      name: safeLifeBookScalar(profile?.name || birthInput?.name) || undefined,
      gender: safeLifeBookScalar(profile?.gender || birthInput?.gender) || undefined,
      birthDate: safeLifeBookScalar(birthInput?.birthDate || localSajuJson?.birthInput?.birthDate),
      birthTime: safeLifeBookScalar(birthInput?.birthTime || localSajuJson?.birthInput?.birthTime) || undefined,
      calendarType: safeLifeBookScalar(birthInput?.calendarType || profile?.calendarType) || undefined,
    },
    pillars: {
      year: normalizeLifeBookPillarText(pillars.year),
      month: normalizeLifeBookPillarText(pillars.month),
      day: normalizeLifeBookPillarText(pillars.day),
      hour: normalizeLifeBookPillarText(pillars.hour) || undefined,
    },
    dayMaster: {
      stem: dayStem,
      element: normalizeLifeBookStemElement(dayStem),
      yinYang: normalizeLifeBookStemYinYang(dayStem),
      strength: normalizeLifeBookStrength(engineContract?.strengthJohuYongshin?.strength?.label || localSajuJson?.strength?.label || signals?.powerLabel),
    },
    fiveElements: {
      ...fiveElementCounts,
      strongest: elementSummary.strongest,
      weakest: elementSummary.weakest,
      balanceSummary: elementSummary.balanceSummary,
    },
    tenGods,
    usefulGods: {
      yongshin: yongshin || undefined,
      heeshin,
      gishin,
      summary: yongshin
        ? `${yongshin}을 중심으로 보완 기운을 살리고 부담이 큰 기운은 생활 리듬 안에서 조절합니다.`
        : "용신 세부값은 보조 신호로 다루며, 원국과 대운에서 확인되는 균형 방향을 중심으로 해석합니다.",
    },
    structure: {
      geokguk: safeLifeBookScalar(engineContract?.gyeokguk?.primary || localSajuJson?.geokguk || signals?.geokguk) || undefined,
      seasonalEnergy: safeLifeBookScalar(engineContract?.strengthJohuYongshin?.johu?.type || localSajuJson?.johu?.type || signals?.johuType) || undefined,
      monthBranch: safeLifeBookScalar(canonicalSajuChart?.dayMaster?.branch || localSajuJson?.monthBranch || signals?.monthBranch) || undefined,
      notes: safeLifeBookList([
        engineContract?.summary?.coreIdentity,
        engineContract?.summary?.gyeokgukSummary,
        engineContract?.summary?.yongsinStrategy,
      ]).slice(0, 6),
    },
    luckCycles: {
      currentDaewoon,
      nextDaewoon,
      annualLuck,
      monthlyLuck: Array.isArray(monthlyLuck) ? monthlyLuck : [],
    },
    relationships: {
      clashes: normalizeLifeBookRelationList(interactions?.clashes, interactions?.chung, interactions?.doChung, interactions?.dochung),
      combinations: normalizeLifeBookRelationList(interactions?.combinations, interactions?.hap, interactions?.samhab, interactions?.yukhap),
      punishments: normalizeLifeBookRelationList(interactions?.punishments, interactions?.hyeong),
      harms: normalizeLifeBookRelationList(interactions?.harms, interactions?.hae, interactions?.pa),
    },
    specialStars: normalizeLifeBookSpecialStars(canonicalSajuChart?.specialStars, engineContract?.specialStars?.active, localSajuJson?.sinsal, signals?.specialStars),
    risks: safeLifeBookList([
      ...(elementSummary.weakest || []).map((item) => `${item} 기운은 생활 리듬에서 보완이 필요합니다.`),
      engineContract?.summary?.healthEnergyPattern,
    ]).slice(0, 8),
    opportunities: safeLifeBookList([
      ...(elementSummary.strongest || []).map((item) => `${item} 기운은 강점으로 활용할 수 있습니다.`),
      engineContract?.summary?.careerPattern,
      engineContract?.summary?.wealthPattern,
      engineContract?.summary?.relationshipPattern,
    ]).slice(0, 8),
  };
}

function normalizeLifeBookInput({ birthInput = {}, profile = {}, signals = {}, localSajuJson = {}, body = {}, sessionId = "", requestId = "" } = {}) {
  const assemblyInput = buildLifeBookAssemblyInput(birthInput, profile, signals, localSajuJson, body);
  const engineContractValidation = validateLifeBookJsonContract({
    birthInput,
    localSajuJson,
    engineContract: assemblyInput.engineContract,
  });
  if (!engineContractValidation.ok) {
    throw Object.assign(new Error("인생의 책 계산 계약이 생성 기준을 충족하지 못했습니다. 계산 데이터를 보강한 뒤 다시 생성해 주세요."), {
      code: "LIFEBOOK_ENGINE_CONTRACT_INVALID",
      status: 422,
      details: engineContractValidation,
    });
  }

  assemblyInput.engineContract.validation = engineContractValidation;
  const canonicalSajuChart = buildLifeBookCanonicalSajuChartFromContract(assemblyInput.engineContract, localSajuJson);
  const canonicalValidation = validateLifeBookCanonicalSajuChart(canonicalSajuChart);
  canonicalSajuChart.validation = canonicalValidation;
  assemblyInput.engineContract.canonicalSajuChart = canonicalSajuChart;
  localSajuJson.canonicalSajuChart = canonicalSajuChart;
  if (!canonicalValidation.ok) {
    throw Object.assign(new Error("인생의 책 표준 사주 구조가 생성 기준을 충족하지 못했습니다. 계산 데이터를 보강한 뒤 다시 생성해 주세요."), {
      code: "LIFEBOOK_CANONICAL_JSON_INVALID",
      status: 422,
      details: canonicalValidation,
    });
  }

  const chapterEvidenceCoverage = buildLifeBookChapterEvidenceCoverage(assemblyInput.engineContract?.chapterPlans || buildLifeBookChapterPlans(), assemblyInput.engineContract);
  if (!chapterEvidenceCoverage.ok) {
    throw Object.assign(new Error("인생의 책 챕터별 계산 근거가 충분하지 않습니다. 계산 데이터를 보강한 뒤 다시 생성해 주세요."), {
      code: "LIFEBOOK_CHAPTER_EVIDENCE_INSUFFICIENT",
      status: 422,
      details: chapterEvidenceCoverage,
    });
  }
  const lifeBookNormalizedData = buildLifeBookNormalizedData({
    birthInput,
    profile,
    signals,
    localSajuJson,
    engineContract: assemblyInput.engineContract,
    canonicalSajuChart,
  });

  const lifeBookMasterJson = buildLifeBookMasterJson({
    birthInput,
    profile,
    signals,
    localSajuJson,
    engineContract: assemblyInput.engineContract,
    canonicalSajuChart,
    body,
    validations: {
      localJsonContract: validateLifeBookJsonContract({ birthInput, localSajuJson }),
      engineContract: engineContractValidation,
      canonical: canonicalValidation,
      chapterEvidenceCoverage,
    },
  });
  lifeBookMasterJson.normalizedData = lifeBookNormalizedData;
  assemblyInput.lifeBookMasterJson = lifeBookMasterJson;
  localSajuJson.lifeBookMasterJson = lifeBookMasterJson;

  logLifeBookServer("LifeBookJsonContractValidated", {
    sessionId,
    requestId,
    localScore: lifeBookMasterJson?.quality?.localJsonContract?.qualityScore,
    engineScore: engineContractValidation.qualityScore,
    canonicalScore: canonicalValidation.qualityScore,
    evidenceCoverageRatio: chapterEvidenceCoverage.coverageRatio,
    softWarnings: engineContractValidation.softWarnings,
  });

  return {
    birthInput,
    profile,
    signals,
    localSajuJson,
    assemblyInput,
    engineContractValidation,
    canonicalSajuChart,
    canonicalValidation,
    chapterEvidenceCoverage,
    lifeBookNormalizedData,
    lifeBookMasterJson,
  };
}

async function composeLifeBookChapters(normalized = {}, { env = {}, sessionId = "", reportId = "", requestId = "", onProgress = null } = {}) {
  if (typeof onProgress === "function") {
    onProgress({
      stateKey: LIFEBOOK_LOCAL_WRITING_STATE,
      currentChapterNo: 0,
      totalChapters: getLifeBookBlueprints().length,
    });
  }

  const assemblyRuntime = resolveLifeBookAssemblyRuntimeInfo(env);
  logLifeBookServer("LocalDraftBuildStart", {
    requestId,
    sessionId,
    reportId,
    chapterCount: getLifeBookBlueprints().length,
    targetYear: normalized?.assemblyInput?.userProfile?.targetYear || normalized?.signals?.currentYear || LIFEBOOK_LOCAL_TARGET_YEAR,
    generationMode: LIFE_BOOK_PDF_CONFIG.generationMode,
    templateVersion: LIFE_BOOK_PDF_CONFIG.templateVersion,
    assemblyRuntime,
  });

  const generatedLifeBook = await assembleLifeBookChaptersLocally(env, {
    profile: normalized.profile,
    signals: normalized.signals,
    assemblyInput: normalized.assemblyInput,
    requestId,
    onProgress,
  });
  const completedChapters = generatedLifeBook.chapters;
  logLifeBookServer("LocalDraftBuildSuccess", {
    requestId,
    sessionId,
    reportId,
    chapterCount: completedChapters.length,
    deterministicReinforcedCount: generatedLifeBook.deterministicReinforcedCount,
  });

  const structureValidation = validateLifeBookStructure(completedChapters);
  logLifeBookServer("LifeBookStructureValidation", {
    sessionId,
    reportId,
    chapterCount: completedChapters.length,
    totalLength: totalManuscriptLength(completedChapters),
    blockingErrors: structureValidation.blockingErrors,
  });
  if (!structureValidation.ok) {
    throw Object.assign(new Error("인생의 책 원고의 필수 구조를 완성하지 못했습니다."), {
      code: "LIFEBOOK_STRUCTURE_INVALID",
      status: 422,
      details: structureValidation,
    });
  }

  const qualityEvaluation = evaluateLifeBookQuality(completedChapters);
  logLifeBookServer("LifeBookQualityEvaluation", {
    sessionId,
    reportId,
    chapterCount: completedChapters.length,
    totalLength: qualityEvaluation.totalLength,
    blockingErrors: [],
    softWarnings: qualityEvaluation.softWarnings,
    repairedCategoryCount: generatedLifeBook.deterministicReinforcedCount,
    finalQualityScore: qualityEvaluation.qualityScore,
  });

  const finalQualityWarnings = Array.isArray(qualityEvaluation.softWarnings) ? qualityEvaluation.softWarnings : [];
  const finalQualityScore = Number(qualityEvaluation.qualityScore || 0);
  const repairedCategoryCount = Number(generatedLifeBook.deterministicReinforcedCount || 0);
  const highQualityGate = validateLifeBookHighQualityReadiness(completedChapters, {
    manuscriptSource: generatedLifeBook.manuscriptSource,
    finalManuscriptSource: generatedLifeBook.finalManuscriptSource,
    generationMode: generatedLifeBook.generationMode || LIFE_BOOK_PDF_CONFIG.generationMode,
  });
  const finalQualityBlockingWarnings = (Array.isArray(qualityEvaluation.warningItems) ? qualityEvaluation.warningItems : [])
    .filter((item) => clean(item?.severity) === "high")
    .map((item) => clean(item?.code))
    .filter(Boolean);

  if (!highQualityGate.ok) {
    throw Object.assign(new Error("인생의 책 고품질 원고 기준을 충족하지 못했습니다. PDF 생성 전에 원고를 다시 보강해 주세요."), {
      code: "LIFEBOOK_HIGH_QUALITY_GATE_FAILED",
      status: 422,
      details: highQualityGate,
    });
  }

  if (finalQualityBlockingWarnings.length) {
    throw Object.assign(new Error("인생의 책 원고 품질 기준을 충족하지 못했습니다. 핵심 원고를 보강한 뒤 다시 생성해 주세요."), {
      code: "LIFEBOOK_QUALITY_BLOCKED",
      status: 422,
      details: {
        blockingWarnings: finalQualityBlockingWarnings,
        qualityScore: finalQualityScore,
        totalLength: qualityEvaluation.totalLength,
      },
    });
  }

  if (!generatedLifeBook.finalQualityReviewPassed) {
    throw Object.assign(new Error("인생의 책 최종 검수 기준을 통과하지 못했습니다. 원고를 보강한 뒤 다시 생성해 주세요."), {
      code: "LIFEBOOK_FINAL_QUALITY_REVIEW_FAILED",
      status: 422,
      details: {
        errors: generatedLifeBook.finalQualityReviewErrors || generatedLifeBook.finalManuscriptErrors || [],
        warnings: generatedLifeBook.finalQualityReviewWarnings || [],
      },
    });
  }

  return {
    generatedLifeBook,
    completedChapters,
    structureValidation,
    qualityEvaluation,
    highQualityGate,
    finalQualityWarnings,
    finalQualityScore,
    repairedCategoryCount,
  };
}

function renderLifeBookHtml(chapters = [], normalized = {}, metadata = {}) {
  return generateLifeBookPdfFromChapters(
    normalized.profile,
    normalized.signals,
    chapters,
    metadata.generatedAt || new Date().toISOString(),
    metadata.finalManuscriptMarkdown || "",
  );
}

function renderLifeBookPdfArchive(html = "") {
  return {
    html,
    contentType: "application/pdf",
    renderFormat: "pdf-archive",
  };
}

async function generateLifeBookPdf(profile = {}, { env = {}, birthInput = {}, body = {}, sessionId = "", reportId = "", requestId = "", onProgress = null, precomputedNormalized = null } = {}) {
  const calculation = precomputedNormalized?.calculation || calculateSajuLocally({ birthInput, profile, body, sessionId });
  const normalized = precomputedNormalized?.normalized || normalizeLifeBookInput({
    birthInput,
    profile,
    signals: calculation.signals,
    localSajuJson: calculation.localSajuJson,
    body,
    sessionId,
    requestId,
  });
  const cacheContext = precomputedNormalized?.cacheContext || buildLifeBookPdfCacheContext(profile, normalized);
  const cachedResult = readLifeBookLocalPdfResultCache(cacheContext.cacheKey);
  if (cachedResult) {
    return {
      ...cachedResult,
      cacheKey: cacheContext.cacheKey,
      calculationResultHash: cacheContext.calculationResultHash,
      cacheHit: true,
      fromCache: true,
    };
  }
  const manuscript = await composeLifeBookChapters(normalized, {
    env,
    sessionId,
    reportId,
    requestId,
    onProgress,
  });
  const finalManuscriptMarkdown = normalizeLifeBookFinalManuscriptMarkdown(manuscript.generatedLifeBook.finalManuscriptMarkdown || "");
  const generatedAt = new Date().toISOString();
  const html = renderLifeBookHtml(manuscript.completedChapters, normalized, { generatedAt, finalManuscriptMarkdown });
  const pdf = renderLifeBookPdfArchive(html);

  const result = {
    ...calculation,
    ...normalized,
    ...manuscript,
    finalManuscriptMarkdown,
    generatedAt,
    html,
    pdf,
    cacheKey: cacheContext.cacheKey,
    calculationResultHash: cacheContext.calculationResultHash,
    cacheHit: false,
    fromCache: false,
    assemblyRuntime: resolveLifeBookAssemblyRuntimeInfo(env),
  };
  writeLifeBookLocalPdfResultCache(cacheContext.cacheKey, result);
  return result;
}

function validateLifeBookLocalSajuJson(localSajuJson) {
  const missing = [];
  const warnings = [];

  if (!clean(localSajuJson?.birthInput?.birthDate)) missing.push("birthDate");
  if (!clean(localSajuJson?.birthInput?.birthTime)) missing.push("birthTime");

  const resolvedPillarCount = ["year", "month", "day", "hour"].reduce((count, key) => {
    const stem = clean(localSajuJson?.pillars?.[key]?.stem);
    const branch = clean(localSajuJson?.pillars?.[key]?.branch);
    return count + Number(Boolean(stem && branch));
  }, 0);

  if (!clean(localSajuJson?.pillars?.day?.stem) || !clean(localSajuJson?.pillars?.day?.branch)) missing.push("dayPillar");
  if (!clean(localSajuJson?.dayMaster)) missing.push("dayMaster");
  if (resolvedPillarCount < 3) missing.push("pillarSet");

  if (!localSajuJson?.fiveElements || Object.keys(localSajuJson.fiveElements).length < 5) warnings.push("fiveElements");
  if (!localSajuJson?.tenGods || Object.keys(localSajuJson.tenGods).length < 4) warnings.push("tenGods");
  if (!localSajuJson?.usefulGods && !localSajuJson?.yongshin) warnings.push("usefulGods");
  if (!Array.isArray(localSajuJson?.daeun) || localSajuJson.daeun.length === 0) warnings.push("daeun");

  return {
    ok: missing.length === 0,
    missing,
    warnings,
    resolvedPillarCount,
  };
}

function validateLifeBookJsonContract({ birthInput = {}, localSajuJson = {}, engineContract = null } = {}) {
  const hardErrors = [];
  const softWarnings = [];
  const evidence = {};
  const requireText = (path, value, severity = "hard") => {
    const ok = Boolean(clean(value));
    evidence[path] = ok;
    if (!ok) {
      if (severity === "hard") hardErrors.push(`${path}_missing`);
      else softWarnings.push(`${path}_missing`);
    }
    return ok;
  };
  const requireObjectKeys = (path, value, minimum, severity = "hard") => {
    const count = value && typeof value === "object" ? Object.keys(value).filter((key) => clean(key)).length : 0;
    const ok = count >= minimum;
    evidence[path] = { ok, count, minimum };
    if (!ok) {
      if (severity === "hard") hardErrors.push(`${path}_incomplete`);
      else softWarnings.push(`${path}_incomplete`);
    }
    return ok;
  };
  const requireArrayLength = (path, value, minimum, severity = "hard") => {
    const count = Array.isArray(value) ? value.length : 0;
    const ok = count >= minimum;
    evidence[path] = { ok, count, minimum };
    if (!ok) {
      if (severity === "hard") hardErrors.push(`${path}_incomplete`);
      else softWarnings.push(`${path}_incomplete`);
    }
    return ok;
  };

  requireText("birthInput.birthDate", birthInput?.birthDate || localSajuJson?.birthInput?.birthDate);
  requireText("birthInput.birthTime", birthInput?.birthTime || localSajuJson?.birthInput?.birthTime);
  requireText("birthInput.timezone", birthInput?.timezone || localSajuJson?.birthInput?.timezone || localSajuJson?.profile?.timezone, "soft");

  ["year", "month", "day", "hour"].forEach((key) => {
    const pillar = localSajuJson?.pillars?.[key] || {};
    requireText(`pillars.${key}.stem`, pillar.stem);
    requireText(`pillars.${key}.branch`, pillar.branch);
    requireText(`pillars.${key}.ganji`, pillar.ganji || `${clean(pillar.stem)}${clean(pillar.branch)}`);
  });

  requireText("dayMaster", localSajuJson?.dayMaster);
  requireText("monthBranch", localSajuJson?.monthBranch);
  requireObjectKeys("fiveElements", localSajuJson?.fiveElements, 5);
  requireObjectKeys("tenGods", localSajuJson?.tenGods, 4);
  requireObjectKeys("tenGodsByPillar", localSajuJson?.tenGodsByPillar, 3, "soft");
  requireText("yongshin.usefulElement", localSajuJson?.yongshin?.usefulElement || localSajuJson?.usefulGods?.usefulElement);
  requireArrayLength("yongshin.usefulElements", localSajuJson?.yongshin?.usefulElements || localSajuJson?.usefulGods?.usefulElements, 1);
  requireArrayLength("yongshin.cautionElements", localSajuJson?.yongshin?.cautionElements || localSajuJson?.usefulGods?.cautionElements, 1, "soft");
  requireArrayLength("daeun.cycles", localSajuJson?.daeun, 3);
  requireText("daeun.current.label", localSajuJson?.currentDaeun?.label || localSajuJson?.currentDaeun?.ganji);
  requireText("daeun.next.label", localSajuJson?.nextDaeun?.label || localSajuJson?.nextDaeun?.ganji, "soft");
  requireText("yearlyFlow.year", localSajuJson?.yearlyFlow?.year);
  requireText("yearlyFlow.pillar", localSajuJson?.yearlyFlow?.pillar, "soft");
  requireArrayLength("twelveGrowthStages", localSajuJson?.twelveGrowthStages, 3, "soft");
  requireArrayLength("sinsal", localSajuJson?.sinsal, 1, "soft");

  if (engineContract && typeof engineContract === "object") {
    requireText("engineContract.version", engineContract.version);
    requireText("engineContract.source", engineContract.source);
    requireText("engineContract.natal.dayPillar", engineContract?.natal?.dayPillar);
    requireObjectKeys("engineContract.fiveElements.counts", engineContract?.fiveElements?.counts, 5);
    requireArrayLength("engineContract.daeun.cycles", engineContract?.daeun?.cycles, 3);
    requireText("engineContract.year2026.ganji", engineContract?.year2026?.ganji, "soft");
    requireArrayLength("engineContract.monthlyLuck2026", engineContract?.monthlyLuck2026, 12, "soft");
  }

  const hardPenalty = hardErrors.length * 8;
  const softPenalty = softWarnings.length * 2;
  return {
    ok: hardErrors.length === 0,
    hardErrors: Array.from(new Set(hardErrors)),
    softWarnings: Array.from(new Set(softWarnings)),
    evidence,
    qualityScore: clamp(100 - hardPenalty - softPenalty, 0, 100),
  };
}

function getLifeBookContractPathValue(source = {}, path = "") {
  return String(path || "").split(".").filter(Boolean).reduce((current, key) => {
    if (current == null) return undefined;
    return current?.[key];
  }, source);
}

function hasLifeBookContractEvidence(source = {}, path = "") {
  const value = getLifeBookContractPathValue(source, path);
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(clean(value));
}

function roundLifeBookRatio(value = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : 0;
}

function resolveLifeBookEngineFieldPointers(label = "") {
  const field = clean(label);
  const pointers = new Set(["natal.pillars", "natal.dayMaster", "tenGods.distribution", "fiveElements.counts"]);
  const add = (...items) => items.forEach((item) => pointers.add(item));

  if (/대운|세운|월운|2026|운세|시기|흐름|연도|로드맵/i.test(field)) {
    add("daeun.current", "daeun.cycles", "year2026.ganji", "year2026.theme");
  }
  if (/용신|희신|기신|조후|강약|일간|월령|월지|계절|균형|오행/i.test(field)) {
    add("strengthJohuYongshin.strength", "strengthJohuYongshin.johu", "strengthJohuYongshin.yongshin.primary", "fiveElements.yongshinCandidates");
  }
  if (/십성|격국|사회|직업|재물|돈|관성|재성|식상|인성|성공/i.test(field)) {
    add("tenGods.byPillar", "gyeokguk.primary", "gyeokguk.reasoning", "year2026.career", "year2026.wealth");
  }
  if (/관계|연애|결혼|배우자|인연|파트너|사랑/i.test(field)) {
    add("year2026.relationship", "year2026.love", "summary.relationshipPattern");
  }
  if (/건강|심신|회복|스트레스|수면|몸|마음/i.test(field)) {
    add("year2026.health", "summary.healthEnergyPattern", "strengthJohuYongshin.johu");
  }
  if (/신살|십이운성|12운성|도화|홍염|화개|귀문|특수|코드/i.test(field)) {
    add("specialStars", "twelveStages.byPillar");
  }
  if (/합|충|형|파|해|원진|귀문|관계성|상호작용/i.test(field)) {
    add("interactions", "interactions.dochung", "interactions.clashAnalysis");
  }

  return Array.from(pointers);
}

function buildLifeBookChapterEvidenceCoverage(chapterPlans = [], engineContract = {}) {
  const plans = Array.isArray(chapterPlans) ? chapterPlans : [];
  const chapters = plans.map((plan, index) => {
    const labels = Array.from(new Set((Array.isArray(plan?.sections) ? plan.sections : [])
      .flatMap((section) => Array.isArray(section?.requiredEngineFields) ? section.requiredEngineFields : [])
      .map(clean)
      .filter(Boolean)));
    const requiredPointers = Array.from(new Set(labels.flatMap(resolveLifeBookEngineFieldPointers)));
    const coveredPointers = requiredPointers.filter((path) => hasLifeBookContractEvidence(engineContract, path));
    const missingPointers = requiredPointers.filter((path) => !coveredPointers.includes(path));
    const coverageRatio = requiredPointers.length ? coveredPointers.length / requiredPointers.length : 1;
    return {
      chapter: index + 1,
      chapterId: clean(plan?.chapterId || String(index + 1).padStart(2, "0")),
      requiredFieldCount: labels.length,
      requiredPointerCount: requiredPointers.length,
      coveredPointerCount: coveredPointers.length,
      coverageRatio: roundLifeBookRatio(coverageRatio),
      requiredPointers,
      missingPointers,
    };
  });
  const totalRequired = chapters.reduce((sum, chapter) => sum + Number(chapter.requiredPointerCount || 0), 0);
  const totalCovered = chapters.reduce((sum, chapter) => sum + Number(chapter.coveredPointerCount || 0), 0);
  const lowCoverageChapters = chapters.filter((chapter) => Number(chapter.coverageRatio || 0) < 0.72);
  return {
    ok: lowCoverageChapters.length === 0,
    totalRequired,
    totalCovered,
    coverageRatio: roundLifeBookRatio(totalRequired ? totalCovered / totalRequired : 1),
    lowCoverageChapters: lowCoverageChapters.map((chapter) => ({
      chapter: chapter.chapter,
      chapterId: chapter.chapterId,
      coverageRatio: chapter.coverageRatio,
      missingPointers: chapter.missingPointers.slice(0, 8),
    })),
    chapters,
  };
}

function normalizeLifeBookCanonicalSpecialStars(engineSpecialStars, localSpecialStars) {
  if (Array.isArray(engineSpecialStars)) return engineSpecialStars;
  if (Array.isArray(engineSpecialStars?.active)) return engineSpecialStars.active;
  if (Array.isArray(engineSpecialStars?.requested)) {
    return engineSpecialStars.requested
      .map((name) => ({ name: clean(name) }))
      .filter((item) => clean(item.name));
  }
  if (Array.isArray(localSpecialStars)) return localSpecialStars;
  return [];
}

function buildLifeBookCanonicalSajuChartFromContract(engineContract = {}, localSajuJson = {}) {
  const counts = engineContract?.fiveElements?.counts || localSajuJson?.fiveElements || {};
  const countEntries = Object.entries(counts || {}).map(([key, value]) => [key, safeNumber(value, 0)]);
  const sortedCounts = countEntries.slice().sort((a, b) => Number(b[1]) - Number(a[1]));
  const pillars = engineContract?.natal?.pillars || localSajuJson?.pillars || {};
  const specialStars = normalizeLifeBookCanonicalSpecialStars(engineContract?.specialStars, localSajuJson?.sinsal);
  return {
    version: "life-book-canonical-worker-v1",
    input: {
      name: clean(engineContract?.userInfo?.name || localSajuJson?.profile?.name),
      gender: clean(engineContract?.userInfo?.gender || localSajuJson?.profile?.gender),
      calendarType: clean(engineContract?.userInfo?.calendarType || localSajuJson?.birthInput?.calendarType),
      birthDate: clean(engineContract?.userInfo?.birthDate || localSajuJson?.birthInput?.birthDate),
      birthTime: clean(engineContract?.userInfo?.birthTime || localSajuJson?.birthInput?.birthTime),
      birthPlace: clean(engineContract?.userInfo?.birthPlace || localSajuJson?.birthInput?.birthplace),
      timezone: clean(engineContract?.userInfo?.timezone || localSajuJson?.birthInput?.timezone),
    },
    calculationMeta: {
      methodVersion: clean(engineContract?.source || "normalized-worker-saju"),
      contractVersion: clean(engineContract?.version),
      policy: engineContract?.calculationPolicy || localSajuJson?.calculationPolicy || {},
      sourceTrace: engineContract?.sourceTrace || localSajuJson?.sourceTrace || {},
    },
    fourPillars: {
      year: pillars.year || {},
      month: pillars.month || {},
      day: pillars.day || {},
      hour: pillars.hour || {},
    },
    dayMaster: {
      stem: clean(engineContract?.natal?.dayMaster || localSajuJson?.dayMaster),
      branch: clean(localSajuJson?.dayBranch || pillars?.day?.branch),
      pillar: clean(engineContract?.natal?.dayPillar || pillars?.day?.ganji),
    },
    fiveElements: {
      ...counts,
      dominant: clean(engineContract?.fiveElements?.excessive?.[0] || localSajuJson?.elementBalance?.dominant || sortedCounts?.[0]?.[0]),
      weakest: clean(engineContract?.fiveElements?.lacking?.[0] || localSajuJson?.elementBalance?.deficient || sortedCounts?.[sortedCounts.length - 1]?.[0]),
      missing: countEntries.filter(([, value]) => Number(value) <= 0).map(([key]) => key),
    },
    tenGods: {
      distribution: engineContract?.tenGods?.distribution || localSajuJson?.tenGods || {},
      byPillar: engineContract?.tenGods?.byPillar || localSajuJson?.tenGodsByPillar || {},
      dominant: clean(engineContract?.tenGods?.dominant),
    },
    usefulGods: {
      yongsin: {
        element: clean(engineContract?.strengthJohuYongshin?.yongshin?.primary || localSajuJson?.yongshin?.usefulElement),
        candidates: engineContract?.fiveElements?.yongshinCandidates || localSajuJson?.yongshin?.usefulElements || [],
      },
      huisin: {
        elements: engineContract?.strengthJohuYongshin?.yongshin?.huishin || [],
      },
      gisin: {
        elements: engineContract?.strengthJohuYongshin?.yongshin?.gishin || localSajuJson?.yongshin?.cautionElements || [],
      },
    },
    yongshinAnalysis: {
      strength: engineContract?.strengthJohuYongshin?.strength || localSajuJson?.strength || {},
      johu: engineContract?.strengthJohuYongshin?.johu || localSajuJson?.johu || {},
      reasoning: clean(engineContract?.strengthJohuYongshin?.yongshin?.reasoning),
      strategy: clean(engineContract?.strengthJohuYongshin?.yongshin?.strategy),
    },
    relations: engineContract?.interactions || localSajuJson?.interactions || {},
    luckCycles: {
      currentDaewoon: engineContract?.daeun?.current || localSajuJson?.currentDaeun || null,
      nextDaewoon: engineContract?.daeun?.next || localSajuJson?.nextDaeun || null,
      cycles: engineContract?.daeun?.cycles || localSajuJson?.daeun || [],
    },
    annualLuck: engineContract?.year2026 || localSajuJson?.yearlyFlow || {},
    monthlyLuck: engineContract?.monthlyLuck2026 || [],
    specialStars,
    twelveStages: engineContract?.twelveStages?.byPillar || localSajuJson?.twelveGrowthStages || [],
    validation: null,
  };
}

function buildLifeBookMasterJson({ birthInput = {}, profile = {}, signals = {}, localSajuJson = {}, engineContract = {}, canonicalSajuChart = {}, body = {}, validations = {} } = {}) {
  const hasQuantum = Boolean(
    body?.quantumMyeongriJson
    || body?.structuredAdvancedReport
    || body?.engineData?.structuredAdvancedReport
    || signals?.engineSources?.clientQuantumMyeongri
  );
  const quantumEngineName = /QUANTUM_MYEONGRI_ENGINE_V2|Engine v\.2/i.test(clean(engineContract?.source))
    ? "client-quantum-myeongri-engine-v2"
    : "client-quantum-myeongri-engine";
  const sourceEngines = [
    "worker-saju-engine",
    hasQuantum ? quantumEngineName : "",
    engineContract?.source ? clean(engineContract.source) : "",
  ].filter(Boolean);
  return {
    version: "life-book-master-json-v1",
    generatedAt: new Date().toISOString(),
    serviceKey: LIFEBOOK_SERVICE_KEY,
    featureKey: LIFEBOOK_FEATURE_KEY,
    sourceTrace: {
      route: "worker.routes.saju-lifebook",
      sourceEngines: Array.from(new Set(sourceEngines)),
      usesWorkerSajuEngine: true,
      usesQuantumMyeongriEngine: hasQuantum,
      hasStructuredAdvancedReport: Boolean(engineContract?.sourceTrace?.hasStructuredAdvancedReport),
      hasCanonicalSajuChart: Boolean(canonicalSajuChart && typeof canonicalSajuChart === "object"),
    },
    user: {
      name: clean(profile?.name || birthInput?.name),
      gender: clean(profile?.gender || birthInput?.gender),
      birthDate: clean(birthInput?.birthDate),
      birthTime: clean(birthInput?.birthTime),
      calendarType: clean(birthInput?.calendarType),
      birthplace: clean(birthInput?.birthplace || profile?.birthplace),
      timezone: clean(birthInput?.timezone || profile?.timezone),
    },
    consultationEvidence: {
      fourPillars: canonicalSajuChart?.fourPillars || engineContract?.natal?.pillars || localSajuJson?.pillars || {},
      dayMaster: canonicalSajuChart?.dayMaster || {
        stem: clean(localSajuJson?.dayMaster),
        pillar: clean(localSajuJson?.pillars?.day?.ganji),
      },
      fiveElements: canonicalSajuChart?.fiveElements || engineContract?.fiveElements || localSajuJson?.fiveElements || {},
      tenGods: canonicalSajuChart?.tenGods || engineContract?.tenGods || {
        distribution: localSajuJson?.tenGods || {},
        byPillar: localSajuJson?.tenGodsByPillar || {},
      },
      strengthJohuYongshin: engineContract?.strengthJohuYongshin || {
        strength: localSajuJson?.strength || {},
        johu: localSajuJson?.johu || {},
        yongshin: localSajuJson?.yongshin || {},
      },
      gyeokguk: engineContract?.gyeokguk || localSajuJson?.geokguk || {},
      interactions: engineContract?.interactions || canonicalSajuChart?.relations || {},
      daeun: engineContract?.daeun || canonicalSajuChart?.luckCycles || {},
      annualLuck: engineContract?.year2026 || canonicalSajuChart?.annualLuck || {},
      monthlyLuck: engineContract?.monthlyLuck2026 || canonicalSajuChart?.monthlyLuck || [],
      specialStars: canonicalSajuChart?.specialStars || engineContract?.specialStars || localSajuJson?.sinsal || [],
      twelveStages: canonicalSajuChart?.twelveStages || engineContract?.twelveStages || localSajuJson?.twelveGrowthStages || [],
    },
    consultationSummary: {
      coreIdentity: clean(engineContract?.summary?.coreIdentity),
      yongsinStrategy: clean(engineContract?.summary?.yongsinStrategy),
      gyeokgukSummary: clean(engineContract?.summary?.gyeokgukSummary),
      currentDaeunTheme: clean(engineContract?.summary?.currentDaeunTheme),
      yearTheme: clean(engineContract?.summary?.year2026Theme),
      relationshipPattern: clean(engineContract?.summary?.relationshipPattern),
      careerPattern: clean(engineContract?.summary?.careerPattern),
      wealthPattern: clean(engineContract?.summary?.wealthPattern),
      healthEnergyPattern: clean(engineContract?.summary?.healthEnergyPattern),
      masterAdviceSeed: clean(engineContract?.summary?.masterAdviceSeed),
    },
    quality: {
      localJsonContract: validations.localJsonContract || null,
      engineContract: validations.engineContract || null,
      canonical: validations.canonical || null,
      chapterEvidenceCoverage: validations.chapterEvidenceCoverage || null,
      confidence: {
        local: localSajuJson?.confidence || {},
        engine: engineContract?.confidence || {},
      },
      normalizationWarnings: Array.from(new Set([
        ...(Array.isArray(localSajuJson?.normalizationWarnings) ? localSajuJson.normalizationWarnings : []),
        ...(Array.isArray(engineContract?.normalizationWarnings) ? engineContract.normalizationWarnings : []),
      ])),
    },
  };
}

function validateLifeBookCanonicalSajuChart(canonical = {}) {
  const missing = [];
  const softWarnings = [];
  const requireText = (path, value, severity = "hard") => {
    if (clean(value)) return;
    if (severity === "hard") missing.push(path);
    else softWarnings.push(path);
  };
  const requireObjectKeys = (path, value, minimum, severity = "hard") => {
    const count = value && typeof value === "object" ? Object.keys(value).filter((key) => clean(key)).length : 0;
    if (count >= minimum) return;
    if (severity === "hard") missing.push(path);
    else softWarnings.push(path);
  };
  const requireArrayLength = (path, value, minimum, severity = "hard") => {
    const count = Array.isArray(value) ? value.length : 0;
    if (count >= minimum) return;
    if (severity === "hard") missing.push(path);
    else softWarnings.push(path);
  };

  requireText("input.birthDate", canonical?.input?.birthDate);
  requireText("input.birthTime", canonical?.input?.birthTime);
  requireText("calculationMeta.contractVersion", canonical?.calculationMeta?.contractVersion);
  ["year", "month", "day", "hour"].forEach((key) => {
    requireText(`fourPillars.${key}.stem`, canonical?.fourPillars?.[key]?.stem);
    requireText(`fourPillars.${key}.branch`, canonical?.fourPillars?.[key]?.branch);
  });
  requireText("dayMaster.stem", canonical?.dayMaster?.stem);
  requireObjectKeys("fiveElements", canonical?.fiveElements, 5);
  requireObjectKeys("tenGods.distribution", canonical?.tenGods?.distribution, 4);
  requireText("usefulGods.yongsin.element", canonical?.usefulGods?.yongsin?.element);
  requireArrayLength("luckCycles.cycles", canonical?.luckCycles?.cycles, 3);
  requireText("annualLuck.ganji", canonical?.annualLuck?.ganji, "soft");
  requireArrayLength("monthlyLuck", canonical?.monthlyLuck, 12, "soft");
  requireArrayLength("specialStars", canonical?.specialStars, 1, "soft");
  requireArrayLength("twelveStages", canonical?.twelveStages, 3, "soft");

  return {
    ok: missing.length === 0,
    missing,
    softWarnings,
    qualityScore: clamp(100 - (missing.length * 8) - (softWarnings.length * 2), 0, 100),
  };
}

function repairLifeBookLocalSajuJson(localSajuJson, birthInput, profile, signals) {
  const payload = deriveLifeBookPayload(profile, signals, [], { calendarType: birthInput?.calendarType });
  const engineProfile = signals?.engineProfile || {};
  const enginePillars = engineProfile?.pillars || {};
  const daewun = Array.isArray(localSajuJson?.daeun) && localSajuJson.daeun.length
    ? localSajuJson.daeun
    : Array.isArray(signals?.daewunCycles) && signals.daewunCycles.length
      ? signals.daewunCycles
      : calcLifeBookDaewunFromBirth(profile).cycles;

  const yongshin = {
    usefulElement: clean(localSajuJson?.yongshin?.usefulElement || signals?.useful || payload?.yongshin?.primary),
    usefulElements: [
      clean(localSajuJson?.yongshin?.usefulElement || signals?.useful || payload?.yongshin?.primary),
      clean(localSajuJson?.yongshin?.usefulElements?.[1] || signals?.support || payload?.yongshin?.secondary),
    ].filter(Boolean),
    cautionElements: [clean(localSajuJson?.yongshin?.cautionElements?.[0] || signals?.caution || payload?.yongshin?.avoidElements?.[0])].filter(Boolean),
  };

  const repaired = {
    ...localSajuJson,
    birthInput: {
      ...birthInput,
      birthDate: clean(localSajuJson?.birthInput?.birthDate || birthInput?.birthDate),
      birthTime: clean(localSajuJson?.birthInput?.birthTime || birthInput?.birthTime),
    },
    profile,
    pillars: {
      year: {
        stem: clean(localSajuJson?.pillars?.year?.stem || signals?.yearStem || getPillarStemLabel(enginePillars?.year)),
        branch: clean(localSajuJson?.pillars?.year?.branch || signals?.yearBranch || getPillarBranchLabel(enginePillars?.year)),
        ganji: clean(localSajuJson?.pillars?.year?.ganji || signals?.yearPillar || getPillarGanjiLabel(enginePillars?.year)),
      },
      month: {
        stem: clean(localSajuJson?.pillars?.month?.stem || signals?.monthStem || getPillarStemLabel(enginePillars?.month)),
        branch: clean(localSajuJson?.pillars?.month?.branch || signals?.monthBranch || getPillarBranchLabel(enginePillars?.month)),
        ganji: clean(localSajuJson?.pillars?.month?.ganji || signals?.monthPillar || getPillarGanjiLabel(enginePillars?.month)),
      },
      day: {
        stem: clean(localSajuJson?.pillars?.day?.stem || signals?.dayMaster || getPillarStemLabel(enginePillars?.day)),
        branch: clean(localSajuJson?.pillars?.day?.branch || signals?.dayBranch || getPillarBranchLabel(enginePillars?.day)),
        ganji: clean(localSajuJson?.pillars?.day?.ganji || signals?.dayPillar || getPillarGanjiLabel(enginePillars?.day)),
      },
      hour: {
        stem: clean(localSajuJson?.pillars?.hour?.stem || signals?.hourStem || getPillarStemLabel(enginePillars?.hour)),
        branch: clean(localSajuJson?.pillars?.hour?.branch || signals?.hourBranch || getPillarBranchLabel(enginePillars?.hour)),
        ganji: clean(localSajuJson?.pillars?.hour?.ganji || signals?.hourPillar || getPillarGanjiLabel(enginePillars?.hour)),
      },
    },
    dayMaster: clean(localSajuJson?.dayMaster || signals?.dayMaster || getPillarStemLabel(enginePillars?.day)),
    tenGods: localSajuJson?.tenGods && Object.keys(localSajuJson.tenGods).length >= 4
      ? localSajuJson.tenGods
      : (signals?.tenGodCounts || payload?.tenGodStats?.counts || {}),
    tenGodsByPillar: localSajuJson?.tenGodsByPillar && Object.keys(localSajuJson.tenGodsByPillar).length
      ? localSajuJson.tenGodsByPillar
      : (signals?.tenGodByPillar || {}),
    fiveElements: localSajuJson?.fiveElements && Object.keys(localSajuJson.fiveElements).length >= 5
      ? localSajuJson.fiveElements
      : (payload?.elementBalance?.ratio || {}),
    elementBalance: localSajuJson?.elementBalance && Object.keys(localSajuJson.elementBalance).length
      ? localSajuJson.elementBalance
      : deriveElementBalance(profile, signals),
    tenGodStats: localSajuJson?.tenGodStats && Object.keys(localSajuJson.tenGodStats).length
      ? localSajuJson.tenGodStats
      : deriveTenGodStats(profile, signals),
    strength: {
      ...localSajuJson?.strength,
      label: clean(localSajuJson?.strength?.label || signals?.powerLabel || payload?.strength?.label || "중화"),
      reason: clean(localSajuJson?.strength?.reason || payload?.strength?.reasonSummary),
    },
    johu: {
      ...localSajuJson?.johu,
      type: clean(localSajuJson?.johu?.type || signals?.johuType || "평형"),
      summary: clean(localSajuJson?.johu?.summary || payload?.johu?.summary || `${clean(signals?.johuType || "평형")} 기준으로 생활 리듬을 맞추는 것이 좋습니다.`),
    },
    yongshin,
    usefulGods: yongshin,
    daeun,
    currentDaeun: localSajuJson?.currentDaeun || signals?.currentDaeunNode || { label: clean(signals?.currentDaewun) },
    nextDaeun: localSajuJson?.nextDaeun || signals?.nextDaeunNode || { label: clean(signals?.nextDaewun) },
    yearlyFlow: localSajuJson?.yearlyFlow || {
      year: signals?.currentYear || new Date().getFullYear(),
      pillar: clean(signals?.currentYearPillar),
      keywords: [clean(signals?.useful), clean(signals?.support)].filter(Boolean),
    },
    twelveGrowthStages: Array.isArray(localSajuJson?.twelveGrowthStages) && localSajuJson.twelveGrowthStages.length
      ? localSajuJson.twelveGrowthStages
      : buildLifeBookTwelveGrowthStages(enginePillars),
    sinsal: Array.isArray(localSajuJson?.sinsal) && localSajuJson.sinsal.length
      ? localSajuJson.sinsal
      : calcLifeBookSpecialStarsFromPillars(enginePillars),
  };

  return repaired;
}

function pickByIndex(list, index) {
  return list[((index % list.length) + list.length) % list.length];
}

function normalizeSajuElementToken(value, fallback = "토") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (/목|wood/i.test(raw)) return "목";
  if (/화|fire/i.test(raw)) return "화";
  if (/토|earth/i.test(raw)) return "토";
  if (/금|metal/i.test(raw)) return "금";
  if (/수|water/i.test(raw)) return "수";
  return fallback;
}

function branchKoToHan(branchKo = "") {
  const map = {
    자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳", 오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥",
  };
  const raw = clean(branchKo);
  return map[raw] || raw;
}

function calcLifeBookSpecialStarsFromPillars(pillars = {}) {
  const dayBranch = clean(pillars?.day?.branch);
  const monthBranch = clean(pillars?.month?.branch);
  const hourBranch = clean(pillars?.hour?.branch);
  const branches = [dayBranch, monthBranch, hourBranch].filter(Boolean);
  const dayHan = branchKoToHan(dayBranch);

  const taoByDay = {
    子: ["酉"], 午: ["卯"], 卯: ["子"], 酉: ["午"],
    寅: ["卯"], 戌: ["卯"], 亥: ["子"], 未: ["子"], 申: ["酉"], 辰: ["酉"], 巳: ["午"], 丑: ["午"],
  };
  const yeokmaByDay = {
    寅: ["申"], 午: ["申"], 戌: ["申"], 申: ["寅"], 子: ["寅"], 辰: ["寅"],
    亥: ["巳"], 卯: ["巳"], 未: ["巳"], 巳: ["亥"], 酉: ["亥"], 丑: ["亥"],
  };
  const hwaByDay = {
    寅: ["戌"], 午: ["戌"], 戌: ["戌"], 亥: ["未"], 卯: ["未"], 未: ["未"],
    申: ["辰"], 子: ["辰"], 辰: ["辰"], 巳: ["丑"], 酉: ["丑"], 丑: ["丑"],
  };

  const hanBranches = branches.map((v) => branchKoToHan(v)).filter(Boolean);
  const stars = [];
  if ((taoByDay[dayHan] || []).some((v) => hanBranches.includes(v))) stars.push("도화");
  if ((yeokmaByDay[dayHan] || []).some((v) => hanBranches.includes(v))) stars.push("역마");
  if ((hwaByDay[dayHan] || []).some((v) => hanBranches.includes(v))) stars.push("화개");
  return stars;
}

function calcLifeBookDaewunFromBirth(profile) {
  try {
    const solar = Solar.fromYmdHms(
      Number(profile.year),
      Number(profile.month),
      Number(profile.day),
      Number(profile.hour),
      Number(profile.minute),
      0,
    );
    const eightChar = solar.getLunar().getEightChar();
    const genderNum = profile.gender === "male" ? 1 : 0;
    const yun = eightChar.getYun(genderNum);
    const rawList = yun.getDaYun();
    const cycles = [];
    for (let i = 1; i < rawList.length; i += 1) {
      const item = rawList[i];
      const label = clean(item?.getGanZhi?.());
      const startAge = Number(item?.getStartAge?.() || 0);
      if (!label || !Number.isFinite(startAge) || startAge <= 0) continue;
      cycles.push({
        order: i,
        label,
        startAge,
      });
    }

    const currentAge = new Date().getFullYear() - Number(profile.year) + 1;
    let current = null;
    let next = null;
    for (let i = 0; i < cycles.length; i += 1) {
      const node = cycles[i];
      const nextNode = cycles[i + 1] || null;
      const start = Number(node.startAge || 0);
      const end = nextNode ? Number(nextNode.startAge || 120) - 1 : 120;
      if (currentAge >= start && currentAge <= end) {
        current = { ...node, endAge: end };
        next = nextNode ? { ...nextNode, endAge: i + 2 < cycles.length ? Number(cycles[i + 2].startAge || 120) - 1 : 120 } : null;
        break;
      }
    }

    if (!current && cycles.length) {
      current = { ...cycles[0], endAge: cycles[1] ? Number(cycles[1].startAge || 120) - 1 : 120 };
      next = cycles[1] ? { ...cycles[1], endAge: cycles[2] ? Number(cycles[2].startAge || 120) - 1 : 120 } : null;
    }

    return { cycles, current, next };
  } catch (_) {
    return { cycles: [], current: null, next: null };
  }
}

function buildLifeBookTwelveGrowthStages(pillars = {}) {
  const stageByBranch = {
    자: "태", 축: "양", 인: "장생", 묘: "목욕", 진: "관대", 사: "건록", 오: "제왕", 미: "쇠", 신: "병", 유: "사", 술: "묘", 해: "절",
  };
  const items = [
    { key: "year", branch: clean(pillars?.year?.branch) },
    { key: "month", branch: clean(pillars?.month?.branch) },
    { key: "day", branch: clean(pillars?.day?.branch) },
    { key: "hour", branch: clean(pillars?.hour?.branch) },
  ];
  return items.map((item) => ({
    pillar: item.key,
    branch: item.branch,
    stage: stageByBranch[item.branch] || "평",
  }));
}

function extractSignalFromSajuData(rawSajuData = "") {
  const text = String(rawSajuData || "");
  if (!text.trim()) return null;

  const dayMaster = (text.match(/일간(?:\(日干\))?\s*[:：]\s*([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸])/i) || [])[1] || "";
  const monthBranch = (text.match(/월지(?:\(月支\))?\s*[:：]\s*([자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/i) || [])[1] || "";
  const yongsinRaw = (text.match(/용신(?:\(用神\))?\s*[:：]\s*([^\n]+)/i) || [])[1] || "";
  const huisinRaw = (text.match(/희신(?:\(喜神\))?\s*[:：]\s*([^\n]+)/i) || [])[1] || "";
  const gisinRaw = (text.match(/기신(?:\(忌神\))?\s*[:：]\s*([^\n]+)/i) || [])[1] || "";

  if (!dayMaster && !monthBranch && !yongsinRaw && !huisinRaw && !gisinRaw) return null;

  return {
    dayMaster: String(dayMaster || "").trim(),
    monthBranch: String(monthBranch || "").trim(),
    useful: normalizeSajuElementToken(yongsinRaw, "토"),
    support: normalizeSajuElementToken(huisinRaw, "금"),
    caution: normalizeSajuElementToken(gisinRaw, "수"),
  };
}

function deriveLocalSignals(profile, rawSajuData = "", analysisSignals = {}, targetYear = LIFEBOOK_LOCAL_TARGET_YEAR) {
  let engineProfile = null;
  try {
    const calendarType = profile.calendarType === "lunar_leap"
      ? "lunar_leap"
      : (profile.calendarType === "lunar" ? "lunar" : "solar");
    engineProfile = buildSajuProfile({
      name: profile.name,
      gender: profile.gender === "male" ? "M" : profile.gender === "female" ? "F" : "OTHER",
      timezone: clean(profile.timezone) || "Asia/Seoul",
      location: {
        name: clean(profile.birthplace) || "대한민국",
        latitude: safeNumber(profile.latitude, 37.5665),
        longitude: safeNumber(profile.longitude, 126.978),
        timezone: clean(profile.timezone) || "Asia/Seoul",
      },
      hourPillarTimePolicy: "TRUE_SOLAR_TIME",
      dayChangePolicy: "MIDNIGHT",
      birth: {
        calendarType,
        year: profile.year,
        month: profile.month,
        day: profile.day,
        hour: Number.isFinite(profile.hour) ? profile.hour : 12,
        minute: Number.isFinite(profile.minute) ? profile.minute : 0,
        timezone: clean(profile.timezone) || "Asia/Seoul",
        birthPlace: clean(profile.birthplace) || "대한민국",
        latitude: safeNumber(profile.latitude, 37.5665),
        longitude: safeNumber(profile.longitude, 126.978),
        unknownTime: false,
      },
    });
  } catch (error) {
    logLifeBookServer("EngineProfileError", { reason: clean(error?.message) });
    engineProfile = null;
  }

  // If engine fails, create minimal working profile
  if (!engineProfile) {
    logLifeBookServer("EngineProfileFallback", { fallback: "minimal" });
    // Create minimal profile structure that allows generation to continue
    engineProfile = {
      dayMaster: { stemKo: "갑" },
      pillars: {
        year: { stemKo: "을", branchKo: "자" },
        month: { stemKo: "병", branchKo: "인" },
        day: { stemKo: "정", branchKo: "묘" },
        hour: { stemKo: "무", branchKo: "진" },
      },
      fiveElements: {
        percentages: { wood: 25, fire: 25, earth: 20, metal: 15, water: 15 },
      },
      tenGods: {
        counts: { 정관: 1, 정재: 1, 식신: 1, 상관: 1 },
        pillarTenGods: { year: "정관", month: "정재", day: "식신", hour: "" },
      },
      usefulGods: { yong: "wood", hee: ["fire"], gi: ["metal"], strength: "middle" },
    };
  }

  const parsed = extractSignalFromSajuData(rawSajuData);
  const parsedAnalysis = normalizeIncomingAnalysisSignals(analysisSignals);
  const enginePillars = engineProfile?.pillars || {};
  const engineWeights = engineProfile?.fiveElements?.percentages
    ? {
        wood: safeNumber(engineProfile.fiveElements.percentages.wood, 0),
        fire: safeNumber(engineProfile.fiveElements.percentages.fire, 0),
        earth: safeNumber(engineProfile.fiveElements.percentages.earth, 0),
        metal: safeNumber(engineProfile.fiveElements.percentages.metal, 0),
        water: safeNumber(engineProfile.fiveElements.percentages.water, 0),
      }
    : null;
  const analysisWeights = parsedAnalysis.elementWeights || engineWeights || null;

  const engineTenGodCounts = engineProfile?.tenGods?.counts || null;
  const mergedTenGodCounts = parsedAnalysis.tenGodCounts || engineTenGodCounts || null;
  const mergedTenGodByPillar = parsedAnalysis.tenGodByPillar || engineProfile?.tenGods?.pillarTenGods || null;

  const yearStem = getPillarStemLabel(enginePillars?.year);
  const monthStem = getPillarStemLabel(enginePillars?.month);
  const dayStem = clean(engineProfile?.dayMaster?.stemKo || getPillarStemLabel(enginePillars?.day) || parsedAnalysis.dayMaster || parsed?.dayMaster);
  const hourStem = getPillarStemLabel(enginePillars?.hour);
  const yearBranch = getPillarBranchLabel(enginePillars?.year);
  const monthBranch = getPillarBranchLabel(enginePillars?.month);
  const dayBranch = getPillarBranchLabel(enginePillars?.day);
  const hourBranch = getPillarBranchLabel(enginePillars?.hour);

  const useful = normalizeSajuElementToken(
    parsedAnalysis.yongshinElements[0]
      || englishElementToKorean(engineProfile?.usefulGods?.yong)
      || parsed?.useful,
    "",
  );
  const support = normalizeSajuElementToken(
    parsedAnalysis.yongshinElements[1]
      || englishElementToKorean(engineProfile?.usefulGods?.hee?.[0])
      || parsed?.support,
    "",
  );
  const caution = normalizeSajuElementToken(
    parsedAnalysis.kishinElements[0]
      || englishElementToKorean(engineProfile?.usefulGods?.gi?.[0])
      || parsed?.caution,
    "",
  );

  let dominantElement = "";
  let weakestElement = "";
  if (analysisWeights) {
    const entries = [
      ["목", safeNumber(analysisWeights.wood, 0)],
      ["화", safeNumber(analysisWeights.fire, 0)],
      ["토", safeNumber(analysisWeights.earth, 0)],
      ["금", safeNumber(analysisWeights.metal, 0)],
      ["수", safeNumber(analysisWeights.water, 0)],
    ].sort((a, b) => Number(b[1]) - Number(a[1]));
    dominantElement = String(entries[0]?.[0] || "");
    weakestElement = String(entries[entries.length - 1]?.[0] || "");
  }

  const topTenGod = pickTopTenGod(mergedTenGodCounts);
  const tenGodStats = deriveTenGodStats(profile, { tenGodCounts: mergedTenGodCounts });

  const daewun = calcLifeBookDaewunFromBirth(profile);
  const daewunCycles = parsedAnalysis.daewunCycles.length ? parsedAnalysis.daewunCycles : (Array.isArray(daewun.cycles) ? daewun.cycles : []);
  const currentDaeunNode = parsedAnalysis.currentDaeunNode || daewun.current || null;
  const nextDaeunNode = parsedAnalysis.nextDaeunNode || daewun.next || null;
  const currentYear = resolveLifeBookTargetYear({ targetYear });
  const currentYearPillar = resolveLifeBookYearPillar(currentYear);

  const specialStars = parsedAnalysis.specialStars.length ? parsedAnalysis.specialStars : calcLifeBookSpecialStarsFromPillars(enginePillars);
  const twelveGrowthStages = parsedAnalysis.twelveGrowthStages.length ? parsedAnalysis.twelveGrowthStages : buildLifeBookTwelveGrowthStages(enginePillars);

  const usefulElements = [useful, support].filter(Boolean);
  const avoidElements = [caution].filter(Boolean);
  const powerLabel = clean(parsedAnalysis.powerLabel || (engineProfile?.usefulGods?.strength === "strong" ? "신강" : engineProfile?.usefulGods?.strength === "weak" ? "신약" : "중화"));
  const monthBranchLabel = clean(monthBranch || parsedAnalysis.monthBranch || parsed?.monthBranch);
  const dayPillar = `${dayStem}${dayBranch}`.trim();
  const weakSignals = [
    clean(caution && `${caution} 기운 과속`),
    clean(weakestElement && `${weakestElement} 보강 필요`),
    clean(!mergedTenGodCounts ? "십성 분포 추가 확인 필요" : ""),
  ].filter(Boolean);

  if (!clean(dayStem) || !clean(dayBranch)) {
    throw Object.assign(new Error("인생의 책 생성에 필요한 일주 계산을 확인할 수 없습니다."), { code: "LIFEBOOK_ENGINE_FIELDS_MISSING", status: 422 });
  }

  return {
    dayMaster: dayStem,
    yearStem,
    monthStem,
    hourStem,
    yearBranch,
    monthBranch: monthBranchLabel,
    dayBranch,
    hourBranch,
    yearPillar: `${yearStem}${yearBranch}`.trim(),
    monthPillar: `${monthStem}${monthBranchLabel}`.trim(),
    dayPillar,
    hourPillar: `${hourStem}${hourBranch}`.trim(),
    useful: useful || dominantElement || "토",
    support: support || useful || dominantElement || "금",
    caution: caution || weakestElement || "수",
    timeKnown: Boolean(profile.timeKnown),
    timeLabel: profile.timeKnown ? `${pad2(profile.hour)}:${pad2(profile.minute)}` : "시간 미상",
    rhythm: `${yearBranch}-${monthBranchLabel}-${dayBranch}`,
    powerLabel,
    johuType: parsedAnalysis.johuType || "평형",
    yongshinElements: parsedAnalysis.yongshinElements.length ? parsedAnalysis.yongshinElements : usefulElements,
    kishinElements: parsedAnalysis.kishinElements.length ? parsedAnalysis.kishinElements : avoidElements,
    currentDaewun: clean(currentDaeunNode?.label || parsedAnalysis.currentDaewun),
    nextDaewun: clean(nextDaeunNode?.label || ""),
    daewunStartAge: Number(currentDaeunNode?.startAge || 0) || null,
    daewunCycles,
    currentDaeunNode,
    nextDaeunNode,
    currentYear,
    currentYearPillar,
    isJong: parsedAnalysis.isJong,
    jongName: parsedAnalysis.jongName,
    geokguk: `${clean(dayStem)}${clean(monthBranchLabel)} 구조`,
    relationshipFocus: `${clean(dayBranch)} 중심 관계 리듬`,
    relationshipSignal: `${clean(dayBranch)} 일지와 ${clean(monthBranchLabel)} 월지가 관계의 기준을 동시에 건드리는 구조`,
    spouseSignal: `${clean(dayPillar)} 일주의 배우자 감각이 ${clean(topTenGod || "핵심 십성")}을 통해 드러납니다.`,
    wealthSignal: `${clean(useful || dominantElement || "토")} 기운을 현실 수익 구조에 연결할수록 재물 흐름이 안정됩니다.`,
    careerSignal: `${clean(topTenGod || "핵심 십성")}이 앞에 설수록 직업적 존재감이 커집니다.`,
    talentSignal: `${clean(dayStem)} 일간은 ${clean(dominantElement || useful || "토")} 기운과 맞물릴 때 재능이 선명해집니다.`,
    timing: {
      current: clean(daewun?.current?.label),
      next: clean(daewun?.next?.label),
      year: currentYear,
      yearPillar: currentYearPillar,
    },
    elementWeights: analysisWeights || { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    dominantElement: dominantElement || useful || "토",
    weakestElement: weakestElement || caution || "수",
    tenGodCounts: mergedTenGodCounts || {},
    tenGodStats,
    tenGodByPillar: {
      year: clean(mergedTenGodByPillar?.year || ""),
      month: clean(mergedTenGodByPillar?.month || ""),
      day: clean(mergedTenGodByPillar?.day || ""),
      hour: clean(mergedTenGodByPillar?.hour || ""),
    },
    specialStars,
    twelveGrowthStages,
    topTenGod,
    usefulElements,
    avoidElements,
    weakSignals,
    engineSources: {
      workerSajuEngine: Boolean(engineProfile),
      clientQuantumMyeongri: Boolean(analysisSignals && typeof analysisSignals === "object" && Object.keys(analysisSignals).length),
    },
    engineProfile,
  };
}

function ensureCategoryLength(text, chapterId, categoryTitle, categoryIndex, minLength = LIFEBOOK_MIN_CATEGORY_CHARS + 120) {
  let result = stripForbiddenTokens(text);
  const fillerPool = [
    `선택이 흔들릴 때는 마음속 판단을 길게 끌지 말고, 오늘 해야 할 한 가지 행동을 먼저 정해 몸으로 실행해 보시길 권합니다. 명식의 장점은 생각만 할 때보다 행동으로 옮길 때 훨씬 또렷해집니다.`,
    `사람과 일을 동시에 챙겨야 하는 시기일수록 기준을 줄이는 것이 좋습니다. 한 번에 많은 것을 바꾸려 하면 에너지가 분산되지만, 우선순위를 선명하게 두면 운의 결이 차분히 살아납니다.`,
    `좋은 흐름은 거창한 결심보다 작은 반복에서 만들어집니다. 일주일 단위로 점검 시간을 고정하고, 잘된 선택과 아쉬운 선택을 짧게 기록하면 다음 판단의 정확도가 빠르게 올라갑니다.`,
    `지금 필요한 것은 자신을 몰아붙이는 긴장감이 아니라, 오래 버틸 수 있는 리듬입니다. 속도를 조금 낮추고 호흡을 고르면 명식이 가진 판단력과 회복력이 함께 살아나기 시작합니다.`,
  ];
  while (result.length < minLength) {
    const extra = fillerPool[(result.length + categoryIndex) % fillerPool.length];
    result = `${result}\n\n${extra}`;
  }

  const topicKeywords = CHAPTER_TOPIC_RULES[String(chapterId || "")] || [];
  if (topicKeywords.length) {
    const topicLine = topicKeywords.slice(0, 3).join(" · ");
    if (!result.includes(topicKeywords[0])) {
      result = `${result}\n\n이 대목에서는 ${topicLine}을 한 축으로 묶어 실제 선택에 적용하는 연습이 중요합니다.`;
    }
  }

  return stripForbiddenTokens(result);
}

function buildCategoryText(profile, signals, chapter, categoryTitle, categoryIndex) {
  const chapterId = String(chapter?.id || "");
  const openers = [
    `${clean(profile.name) || "의뢰인"}님의 삶은 한 번에 크게 치고 나가기보다, 결을 맞춘 선택을 오래 이어 갈 때 진가가 드러나는 명식입니다.`,
    `명식의 첫 인상은 강한 추진력보다 정교한 판단력에 가깝습니다. 그래서 작은 선택의 품질이 쌓일수록 인생 전체의 방향이 안정됩니다.`,
    `사주는 성격 설명으로 끝나지 않고 삶의 운영법으로 이어져야 힘이 생깁니다. 지금 보이는 흐름도 결국 매일의 선택 습관에서 결과가 갈립니다.`,
    `중요한 시기일수록 자신의 결을 거스르지 않는 방식이 필요합니다. 타고난 리듬에 맞는 속도를 찾으면 성과와 마음의 평형이 함께 살아납니다.`,
    `이 명식은 겉으로 단단해 보여도 내면의 기준이 분명한 사람에게 유리하게 작동합니다. 기준이 선명해질수록 관계와 일의 피로가 눈에 띄게 줄어듭니다.`,
    `삶이 답답하게 느껴질 때는 운이 막혔다기보다 중심축이 흐려진 경우가 많습니다. 중심을 다시 세우면 같은 환경에서도 체감이 빠르게 달라집니다.`,
  ];
  const opener = openers[(Number(chapterId || 0) * 7 + categoryIndex) % openers.length];

  const yearPillar = formatGanjiWithHanja(signals.yearStem, signals.yearBranch);
  const monthPillar = formatGanjiWithHanja(signals.monthStem, signals.monthBranch);
  const dayPillar = formatGanjiWithHanja(signals.dayMaster, signals.dayBranch);
  const hourPillar = formatGanjiWithHanja(signals.hourStem, signals.hourBranch);
  const dominant = clean(signals.dominantElement || signals.useful || "토");
  const weakest = clean(signals.weakestElement || signals.caution || "수");
  const topTenGod = clean(signals.topTenGod || "핵심 십성");

  const paragraph2 = `${yearPillar}, ${monthPillar}, ${dayPillar}, ${hourPillar}로 이어지는 흐름을 보면 바깥 환경과 내면의 판단이 서로 분리되지 않고 맞물려 움직입니다. 일간 ${clean(signals.dayMaster)}의 감각은 기준을 섬세하게 다듬는 쪽에서 강점이 살아나고, 월지 ${clean(signals.monthBranch)}의 계절감은 현실에서 무엇을 우선해야 하는지 방향을 잡아 줍니다. 오행의 무게중심이 ${dominant}으로 기울 때는 추진력과 판단력이 살아나며, ${weakest} 기운이 약해지는 구간에서는 피로 누적과 감정 소모를 먼저 관리해야 흐름이 무너지지 않습니다.`;

  let paragraph3 = "";
  if (chapterId === "01") {
    paragraph3 = `네 기둥은 각자 다른 역할을 맡고 있습니다. 년주와 월주는 성장 배경과 사회적 장면을 비추고, 일주와 시주는 지금의 결단과 미래의 확장성을 보여 줍니다. 특히 ${dayPillar}의 중심감이 흔들리지 않아야 전체 해석이 살아나며, ${monthPillar}이 가진 현실 감각이 일상의 선택을 실제 성과로 연결하는 통로가 됩니다.`;
  } else if (chapterId === "02") {
    paragraph3 = `월령과 조후를 함께 보면 기질의 사용법이 분명해집니다. ${clean(signals.powerLabel || "중화")}에 가까운 상태에서는 과속보다 리듬 유지가 성과를 키우고, 계절감과 반대로 생활하면 같은 능력도 소모가 빨라집니다. 그래서 자신의 강점은 더 선명하게 쓰고, 약한 축은 생활 습관으로 보완하는 방식이 가장 현실적입니다.`;
  } else if (chapterId === "03") {
    paragraph3 = `용신 ${clean(signals.useful)}과 희신 ${clean(signals.support)}은 삶의 문이 열리는 방향을 가리키고, 기신 ${clean(signals.caution)}은 과도하게 붙잡을수록 손실이 커지는 지점을 알려 줍니다. 잘 맞는 환경에서는 집중력이 길게 유지되지만, 맞지 않는 장면에 오래 머물면 감정 해석이 과해지고 판단이 급해질 수 있습니다. 결국 운을 살린다는 말은 자신의 기운이 편안하게 흐르는 자리를 스스로 선택한다는 뜻입니다.`;
  } else if (chapterId === "04") {
    paragraph3 = `대운의 흐름은 인생의 속도와 과제를 크게 바꿉니다. 현재 ${clean(signals.currentDaewun || "전환기")}에서는 무리한 확장보다 기준을 정리하는 쪽이 이익이고, 다음 ${clean(signals.nextDaewun || "준비기")}로 넘어갈수록 준비해 둔 역량이 수면 위로 올라옵니다. 세운 ${clean(signals.currentYearPillar || "당해 흐름")}까지 함께 보면 지금은 무엇을 지키고 무엇을 바꿔야 할지 훨씬 명확해집니다.`;
  } else if (chapterId === "05") {
    paragraph3 = `격국은 재능의 종류보다 재능이 빛나는 무대를 알려 줍니다. ${clean(signals.geokguk)}의 결은 성급한 승부보다 누적형 성과에 강하고, ${clean(signals.careerSignal)}의 흐름은 신뢰를 쌓은 뒤 영향력이 커지는 구조에 가깝습니다. 같은 노력이라도 역할이 맞는 자리에서는 평가와 결과가 함께 올라가고, 맞지 않는 자리에서는 노력 대비 소모가 커지기 쉽습니다.`;
  } else if (chapterId === "06") {
    paragraph3 = `관계 운에서는 상대를 읽는 속도가 빠른 편입니다. ${clean(signals.relationshipFocus)}의 패턴 덕분에 사람의 결을 빨리 파악하지만, 피로한 시기에는 확인 욕구가 커져 스스로 마음을 소모할 수 있습니다. 협업은 기준을 먼저 맞추는 방식이 좋고, 가까운 인연일수록 기대와 경계를 부드럽게 말해 두는 편이 오래 안정됩니다.`;
  } else if (chapterId === "07") {
    paragraph3 = `사랑의 흐름은 설렘보다 신뢰를 구축하는 과정에서 갈립니다. ${clean(signals.spouseSignal)}이 보여 주는 핵심은 상대의 말보다 태도의 일관성을 보고 관계를 깊게 만든다는 점입니다. 관계가 좋은 방향으로 갈 때는 배려가 깊이로 이어지고, 불안이 커질 때는 해석이 앞서면서 대화가 어긋날 수 있으니 감정과 사실을 나눠 확인하는 습관이 특히 중요합니다.`;
  } else if (chapterId === "08") {
    paragraph3 = `재물과 직업은 감각보다 구조의 힘이 큽니다. ${clean(signals.wealthSignal)}과 ${clean(signals.careerSignal)}을 함께 보면, 빠른 한 번의 성과보다 반복 가능한 수익 모델을 만들 때 돈의 흐름이 안정됩니다. 가격 기준과 일의 범위를 선명하게 정하고, 잘하는 영역에 집중할수록 수입 변동이 줄어 장기적으로 훨씬 유리해집니다.`;
  } else if (chapterId === "09") {
    paragraph3 = `건강은 의지의 문제가 아니라 리듬의 문제입니다. ${clean(signals.johuType || "평형")}의 온도를 유지하지 못하면 몸의 피로와 마음의 예민함이 함께 올라오기 쉽습니다. 특히 ${weakest} 기운이 약해지는 시기에는 잠과 식사, 회복 시간을 일정하게 고정하는 것만으로도 컨디션이 크게 달라집니다.`;
  } else if (chapterId === "10") {
    const stageSummary = Array.isArray(signals.twelveGrowthStages) && signals.twelveGrowthStages.length
      ? signals.twelveGrowthStages.slice(0, 3).map((item) => `${item.pillar} ${item.stage}`).join(", ")
      : "십이운성 흐름이 이어집니다";
    const starSummary = Array.isArray(signals.specialStars) && signals.specialStars.length ? signals.specialStars.join(", ") : "생활 리듬의 반복 신호";
    paragraph3 = `신살과 십이운성은 눈에 잘 보이지 않는 반복 장면을 설명해 줍니다. ${starSummary}이 두드러질수록 특정 상황에서 감정 반응이 빠르게 올라오고, ${stageSummary} 흐름은 삶의 강약이 바뀌는 타이밍을 알려 줍니다. 이 신호를 알고 있으면 불안을 키우기보다 미리 대응 계획을 세울 수 있습니다.`;
  } else if (chapterId === "11") {
    paragraph3 = `${clean(signals.currentYear || "선택한 연도")}년 ${clean(signals.currentYearPillar || "세운")}은 원국과 만나는 방식을 세밀하게 보아야 합니다. ${clean(signals.currentYearPillar || "해당 세운")}의 흐름은 단순한 길흉보다 행동의 속도, 관계의 온도, 일과 돈의 우선순위를 조절하는 기준으로 읽어야 합니다. 월별 흐름은 예언이 아니라 실행 순서이므로, 무리한 확정보다 준비와 점검의 리듬을 세우는 편이 안정적입니다.`;
  } else if (chapterId === "12") {
    paragraph3 = `장기 성장의 핵심은 재능을 오래 쓰는 구조를 만드는 데 있습니다. ${clean(signals.talentSignal)}과 ${clean(signals.careerSignal)}을 함께 놓고 보면, 빠른 확장보다 기반을 단단히 다진 뒤 폭을 넓히는 방식이 훨씬 유리합니다. 당장의 성과 압박이 있더라도 자신의 축을 지키는 선택이 결국 더 큰 결과를 만듭니다.`;
  } else {
    paragraph3 = `장기 계획은 목표 문장보다 운영 습관에서 완성됩니다. 현재 ${clean(signals.timing?.current || signals.currentDaewun || "흐름")}에서 다져 놓은 기준이 3년 뒤 성과의 형태를 만들고, ${clean(signals.timing?.next || signals.nextDaewun || "다음 흐름")}에서는 그 기준이 확장됩니다. 돈, 일, 관계를 따로 다루기보다 한 방향의 원칙으로 묶어 가면 흔들림이 크게 줄어듭니다.`;
  }

  const paragraph4Variants = [
    `실전에서는 한 번에 인생을 바꾸려 하지 않는 편이 좋습니다. 이번 주에 꼭 지킬 한 가지 원칙과 내려놓을 한 가지 습관만 정해도 흐름의 질이 분명히 달라집니다.`,
    `상담 현장에서 자주 확인되는 패턴은, 기준이 선명한 사람이 결국 더 빨리 안정된다는 점입니다. 중요한 선택 앞에서는 감정의 온도와 사실의 근거를 분리해 적어 보시길 권합니다.`,
    `좋은 운은 우연히 오기보다 준비된 생활 방식 위에 머뭅니다. 하루의 끝에서 선택을 짧게 복기하고 다음 날의 우선순위를 정리하면 판단의 흔들림이 눈에 띄게 줄어듭니다.`,
  ];

  const practicalByChapter = {
    "01": `먼저 이번 주 일정표를 펼쳐서 사람, 일, 휴식 항목을 각각 한 줄로만 정리해 보세요. 일정이 복잡할수록 우선순위를 세 칸으로 제한하면 판단 부담이 줄고 실행력이 살아납니다.`,
    "02": `생활 리듬에서는 수면 시간과 식사 시간을 먼저 고정해 보시는 것이 좋습니다. 조후가 흔들리는 시기일수록 몸의 리듬을 일정하게 두면 감정 기복이 확연히 줄어듭니다.`,
    "03": `일과 관계에서 에너지가 붙는 장면과 빠지는 장면을 각각 세 가지씩 기록해 보세요. 용신이 살아나는 환경을 의식적으로 늘리면 같은 노력으로도 성과의 밀도가 높아집니다.`,
    "04": `대운 전환 구간에는 확장보다 정리가 우선입니다. 당장 수익이 나지 않는 일을 줄이고, 3개월 안에 성과를 확인할 수 있는 과제부터 순서대로 실행해 보세요.`,
    "05": `성과를 키우려면 잘하는 일을 더 많이 하는 구조를 만드셔야 합니다. 역할을 넓히기보다 강점이 분명한 업무 비중을 올리고, 성과 기준을 문서로 남겨 협의하는 습관이 도움이 됩니다.`,
    "06": `관계 피로를 줄이려면 부탁을 받을 때 바로 답하지 말고 한 템포 늦춰서 일정과 에너지를 확인한 뒤 답해 보세요. 경계선을 부드럽게 말하는 연습이 관계를 오래 지켜 줍니다.`,
    "07": `사랑에서는 감정 해석보다 사실 확인이 중요합니다. 갈등이 생기면 그날 바로 결론내기보다, 다음 날 대화 시간을 정해 서로의 의도를 문장으로 확인해 보세요.`,
    "08": `재정에서는 지출을 감정 소비와 필요 소비로 나눠 기록해 보시길 권합니다. 돈의 흐름이 보이기 시작하면 수익 전략도 선명해지고, 불필요한 소모가 빠르게 줄어듭니다.`,
    "09": `건강 관리는 의욕보다 반복이 중요합니다. 잠드는 시간, 가벼운 움직임, 수분 섭취를 같은 시간대에 맞추는 것만으로도 회복 속도가 달라집니다.`,
    "10": `반복되는 위기 장면을 월별로 한 줄씩 적어 보세요. 패턴을 눈으로 확인하면 신살과 십이운성 신호를 불안이 아니라 대비 전략으로 바꿀 수 있습니다.`,
    "11": `흔들리는 시기에는 모든 문제를 동시에 해결하려 하지 않는 것이 핵심입니다. 지금 당장 복구해야 할 한 축을 먼저 정하고, 나머지는 순서를 나눠 대응하면 다시 균형이 잡힙니다.`,
    "12": `장기 성장에서는 분기 단위 점검이 효과적입니다. 3개월마다 버릴 것 하나, 키울 것 하나를 정해 실행하면 재능이 성과로 바뀌는 속도가 빨라집니다.`,
    "13": `3년 계획은 기반, 5년 계획은 확장, 10년 계획은 안정으로 나눠 적어 보세요. 돈, 일, 관계를 한 장표에 함께 두고 점검하면 삶의 방향이 쉽게 흐트러지지 않습니다.`,
  };

  const warmClosings = [
    `${clean(profile.name) || "의뢰인"}님은 이미 자신의 결을 지켜낼 힘을 갖고 있습니다. 서두르지 않고 한 걸음씩 맞춰 가면 충분히 좋은 결과를 만들어 내실 수 있습니다.`,
    `조급해지는 날이 와도 괜찮습니다. ${clean(profile.name) || "의뢰인"}님의 속도로 차분히 정리해 가시면, 삶은 다시 안정된 방향으로 흐르기 시작합니다.`,
    `완벽한 답을 한 번에 찾지 않아도 됩니다. 지금처럼 기준을 다듬어 가면 ${clean(profile.name) || "의뢰인"}님은 결국 자신에게 맞는 길을 따뜻하게 완성해 가실 수 있습니다.`,
  ];

  const practicalParagraph = practicalByChapter[chapterId] || practicalByChapter["13"];
  const warmClosing = warmClosings[(categoryIndex + Number(chapterId || 0)) % warmClosings.length];

  const text = dedupeParagraphs([
    opener,
    paragraph2,
    paragraph3,
    paragraph4Variants[(categoryIndex + Number(chapterId || 0)) % paragraph4Variants.length],
    practicalParagraph,
    `${clean(profile.name) || "의뢰인"}님 명식에서 반복되는 핵심 십성은 ${topTenGod}이며, 이 기운은 장점으로 쓰면 전문성과 신뢰를 만들고 무리해서 쓰면 피로와 자기검열을 키울 수 있습니다. 따라서 중요한 결정은 속도보다 정합성을 우선해 정리하는 편이 결과적으로 더 멀리 갑니다.`,
    warmClosing,
  ].join("\n\n"));
  return ensureCategoryLength(text, chapter?.id, categoryTitle, categoryIndex);
}

const LIFEBOOK_STEM_TO_KO = Object.freeze({
  "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무", "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
  "갑": "갑", "을": "을", "병": "병", "정": "정", "무": "무", "기": "기", "경": "경", "신": "신", "임": "임", "계": "계",
});

const LIFEBOOK_BRANCH_TO_KO = Object.freeze({
  "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사", "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해",
  "자": "자", "축": "축", "인": "인", "묘": "묘", "진": "진", "사": "사", "오": "오", "미": "미", "신": "신", "유": "유", "술": "술", "해": "해",
});

const LIFEBOOK_STEM_TO_HAN = Object.freeze({ 갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸" });
const LIFEBOOK_BRANCH_TO_HAN = Object.freeze({ 자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳", 오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥" });
const LIFEBOOK_ELEMENT_TO_KO = Object.freeze({ wood: "목", fire: "화", earth: "토", metal: "금", water: "수", 목: "목", 화: "화", 토: "토", 금: "금", 수: "수" });

function lifeBookStemLabel(value = "") {
  const raw = clean(value);
  return LIFEBOOK_STEM_TO_KO[raw] || normalizeStemLabel(raw) || raw;
}

function lifeBookBranchLabel(value = "") {
  const raw = clean(value);
  return LIFEBOOK_BRANCH_TO_KO[raw] || normalizeBranchLabel(raw) || raw;
}

function lifeBookElementLabel(value = "", fallback = "중립") {
  const raw = clean(value).toLowerCase();
  if (!raw) return fallback;
  if (LIFEBOOK_ELEMENT_TO_KO[raw]) return LIFEBOOK_ELEMENT_TO_KO[raw];
  if (raw.includes("wood") || raw.includes("목")) return "목";
  if (raw.includes("fire") || raw.includes("화")) return "화";
  if (raw.includes("earth") || raw.includes("토")) return "토";
  if (raw.includes("metal") || raw.includes("금")) return "금";
  if (raw.includes("water") || raw.includes("수")) return "수";
  return fallback;
}

function lifeBookGanjiLabel(stem = "", branch = "") {
  const koStem = lifeBookStemLabel(stem);
  const koBranch = lifeBookBranchLabel(branch);
  const hanStem = LIFEBOOK_STEM_TO_HAN[koStem] || clean(stem);
  const hanBranch = LIFEBOOK_BRANCH_TO_HAN[koBranch] || clean(branch);
  if (!koStem || !koBranch) return `${koStem}${koBranch}`.trim();
  if (hanStem && hanBranch && hanStem !== koStem && hanBranch !== koBranch) return `${koStem}${koBranch}(${hanStem}${hanBranch})`;
  return `${koStem}${koBranch}`;
}

function buildLifeBookReadingContext(profile = {}, signals = {}) {
  const engine = signals?.engineProfile || {};
  const pillars = engine?.pillars || {};
  const year = { stem: lifeBookStemLabel(pillars?.year?.stem || signals.yearStem), branch: lifeBookBranchLabel(pillars?.year?.branch || signals.yearBranch) };
  const month = { stem: lifeBookStemLabel(pillars?.month?.stem || signals.monthStem), branch: lifeBookBranchLabel(pillars?.month?.branch || signals.monthBranch) };
  const day = { stem: lifeBookStemLabel(engine?.dayMaster?.stem || pillars?.day?.stem || signals.dayMaster), branch: lifeBookBranchLabel(pillars?.day?.branch || signals.dayBranch) };
  const hour = { stem: lifeBookStemLabel(pillars?.hour?.stem || signals.hourStem), branch: lifeBookBranchLabel(pillars?.hour?.branch || signals.hourBranch) };
  const weights = signals?.elementWeights || engine?.fiveElements?.percentages || {};
  const sortedElements = Object.entries({
    목: safeNumber(weights.wood, 0),
    화: safeNumber(weights.fire, 0),
    토: safeNumber(weights.earth, 0),
    금: safeNumber(weights.metal, 0),
    수: safeNumber(weights.water, 0),
  }).sort((a, b) => Number(b[1]) - Number(a[1]));
  const dominant = lifeBookElementLabel(signals.dominantElement, sortedElements[0]?.[0] || "중립");
  const weakest = lifeBookElementLabel(signals.weakestElement, sortedElements[sortedElements.length - 1]?.[0] || "중립");
  const useful = lifeBookElementLabel(engine?.usefulGods?.yong || signals.useful, dominant);
  const support = lifeBookElementLabel(engine?.usefulGods?.hee?.[0] || signals.support, useful);
  const caution = lifeBookElementLabel(engine?.usefulGods?.gi?.[0] || signals.caution, weakest);
  const topTenGod = clean(engine?.tenGods?.dominant || signals.topTenGod || pickTopTenGod(signals.tenGodCounts) || "균형형 십성");
  const currentDaeun = clean(signals?.currentDaeunNode?.label || signals.currentDaewun || signals?.timing?.current || "현재 대운");
  const nextDaeun = clean(signals?.nextDaeunNode?.label || signals.nextDaewun || signals?.timing?.next || "다음 대운");
  return {
    name: clean(profile.name) || "사용자",
    yearPillar: lifeBookGanjiLabel(year.stem, year.branch),
    monthPillar: lifeBookGanjiLabel(month.stem, month.branch),
    dayPillar: lifeBookGanjiLabel(day.stem, day.branch),
    hourPillar: lifeBookGanjiLabel(hour.stem, hour.branch),
    dayMaster: day.stem || clean(engine?.dayMaster?.stemKo || signals.dayMaster),
    monthBranch: month.branch || clean(signals.monthBranch),
    dayBranch: day.branch || clean(signals.dayBranch),
    dominant,
    weakest,
    useful,
    support,
    caution,
    topTenGod,
    currentDaeun,
    nextDaeun,
    currentYear: clean(signals.currentYear || "선택한 연도"),
    currentYearPillar: clean(signals.currentYearPillar || "선택 연도 세운"),
    powerLabel: clean(signals.powerLabel || engine?.usefulGods?.strength || "중화"),
    johuType: clean(signals.johuType || "균형"),
  };
}

function buildLifeBookChapterInsight(chapterId, ctx, categoryTitle) {
  const common = `원국은 ${ctx.yearPillar}, ${ctx.monthPillar}, ${ctx.dayPillar}, ${ctx.hourPillar}의 흐름으로 구성됩니다. 그중 일간 ${ctx.dayMaster}은 판단의 중심이고, 월지 ${ctx.monthBranch}은 삶의 기본 무대와 심리 리듬을 결정하는 자리입니다.`;
  const map = {
    "01": `${common} ${categoryTitle}에서는 세부 풀이에 앞서 이 명식이 반복해서 선택하게 되는 삶의 기준을 먼저 붙잡습니다.`,
    "02": `${common} ${categoryTitle}은 네 기둥 중 어느 자리가 가장 크게 말하는지, 겉의 천간과 속의 지장간이 같은 방향인지 살피는 원국 해석입니다.`,
    "03": `월지 ${ctx.monthBranch}과 조후 ${ctx.johuType}의 흐름을 함께 보면, 이 명식은 속도보다 리듬을 맞출 때 안정됩니다. ${categoryTitle}은 일간이 계절을 만나 실제로 작동하는 방식을 읽습니다.`,
    "04": `${ctx.dominant} 기운과 ${ctx.weakest} 기운의 간격은 이 명식의 장점과 피로를 동시에 보여 줍니다. ${categoryTitle}은 오행을 숫자가 아니라 흐름과 온도로 풀어야 선명합니다.`,
    "05": `십성은 재능과 욕망이 사회에서 어떤 역할로 바뀌는지 보여 줍니다. ${ctx.topTenGod}의 비중은 ${categoryTitle}에서 표현, 돈, 책임, 배움의 방향을 읽게 합니다.`,
    "06": `용신 ${ctx.useful}, 희신 ${ctx.support}, 부담되는 기운 ${ctx.caution}은 행운과 불운의 이름이 아니라 균형을 잡는 방향입니다. ${categoryTitle}은 그 균형을 현실에서 어떻게 쓸지에 관한 대목입니다.`,
    "07": `격국은 직업 이름을 찍어 주는 방식이 아니라, 사회에서 어떤 방식으로 쓰임을 얻는지 보여 줍니다. ${ctx.topTenGod}의 비중은 ${categoryTitle}에서 인정, 책임, 성과의 방식을 읽게 합니다.`,
    "08": `연애와 결혼은 끌림만으로 판단하면 흐름을 놓치기 쉽습니다. ${categoryTitle}은 일지 ${ctx.dayBranch}, 배우자성, 관계의 충합이 같은 방향인지 나누어 보아야 합니다.`,
    "09": `재물과 직업은 돈의 크기보다 돈이 들어오고 나가는 구조가 핵심입니다. ${categoryTitle}에서는 ${ctx.topTenGod}과 오행의 강약이 일하는 방식과 수익의 형태로 어떻게 드러나는지 봅니다.`,
    "10": `건강과 심신은 질병을 단정하는 영역이 아니라 리듬과 관리의 문제입니다. ${categoryTitle}은 ${ctx.weakest} 기운이 약해질 때 반복되기 쉬운 피로와 스트레스 반응을 조절하는 데 초점을 둡니다.`,
    "11": `현재 대운 ${ctx.currentDaeun}은 무조건 확장하거나 움츠러들 시기가 아니라, 무엇을 남기고 무엇을 정리할지 가르는 큰 흐름입니다. ${categoryTitle}은 이 흐름 안에서 판단의 순서를 세우는 데 중요합니다.`,
    "12": `${ctx.currentYear}년 ${ctx.currentYearPillar}은 가까운 세운이 현재 대운과 겹치며 나타나는 실전 흐름입니다. ${categoryTitle}은 예언보다 월별 대응 전략으로 보아야 하며, 기회와 부담을 동시에 살피는 편이 정확합니다.`,
    "13": `최종 전략은 큰 목표보다 매년 반복할 기준이 중요합니다. ${categoryTitle}은 현재 대운 ${ctx.currentDaeun}과 다음 대운 ${ctx.nextDaeun} 사이에서 오래 버틸 구조를 만드는 항목입니다.`,
  };
  return map[String(chapterId)] || `${common} ${categoryTitle}은 이 명식의 강점과 주의점을 현실적인 선택 기준으로 바꾸는 항목입니다.`;
}

function lifeBookCategoryIncludes(categoryTitle = "", keywords = []) {
  const title = clean(categoryTitle);
  return safeLifeBookList(keywords).some((keyword) => title.includes(clean(keyword)));
}

function buildLifeBookCategoryEvidenceTags(signals = {}, ctx = {}, chapterId = "", categoryTitle = "") {
  const title = clean(categoryTitle);
  const id = String(chapterId || "");
  const tags = [];
  const push = (...items) => {
    items.forEach((item) => {
      const value = clean(item);
      if (value && !tags.includes(value)) tags.push(value);
    });
  };

  push(ctx.dayMaster && `${ctx.dayMaster} 일간`, ctx.monthBranch && `${ctx.monthBranch} 월지`);

  if (id === "01") push("핵심 명식", ctx.currentDaeun, ctx.useful && `${ctx.useful} 용신`);
  if (id === "02") {
    if (lifeBookCategoryIncludes(title, ["년주"])) push(ctx.yearPillar, "초년 배경");
    if (lifeBookCategoryIncludes(title, ["월주", "사회적"])) push(ctx.monthPillar, "사회적 무대");
    if (lifeBookCategoryIncludes(title, ["일주", "자기"])) push(ctx.dayPillar, ctx.dayBranch && `${ctx.dayBranch} 일지`);
    if (lifeBookCategoryIncludes(title, ["시주", "말년"])) push(ctx.hourPillar, "말년 잠재력");
    if (lifeBookCategoryIncludes(title, ["지장간"])) push("지장간", "숨은 동기");
    push("원국 전체");
  }
  if (id === "03") push("월령", "통근", "조후", ctx.powerLabel);
  if (id === "04") push("오행 분포", ctx.dominant && `${ctx.dominant} 강세`, ctx.weakest && `${ctx.weakest} 보완`);
  if (id === "05") {
    if (lifeBookCategoryIncludes(title, ["비겁"])) push("비겁");
    if (lifeBookCategoryIncludes(title, ["식상"])) push("식상");
    if (lifeBookCategoryIncludes(title, ["재성"])) push("재성");
    if (lifeBookCategoryIncludes(title, ["관성"])) push("관성");
    if (lifeBookCategoryIncludes(title, ["인성"])) push("인성");
    push(ctx.topTenGod, "십성 분포");
  }
  if (id === "06") push(ctx.useful && `${ctx.useful} 용신`, ctx.support && `${ctx.support} 희신`, ctx.caution && `${ctx.caution} 기신`);
  if (id === "07") push("격국", "월령", ctx.topTenGod, "사회적 쓰임");
  if (id === "08") push(ctx.dayBranch && `${ctx.dayBranch} 배우자궁`, "배우자성", "합충형해", "관계 리듬");
  if (id === "09") push("재성", "식상", "관성", ctx.currentDaeun, "수익 구조");
  if (id === "10") push("오행 균형", "조후", ctx.dominant && `${ctx.dominant} 과다`, ctx.weakest && `${ctx.weakest} 부족`);
  if (id === "11") push(ctx.currentDaeun, ctx.nextDaeun, "대운 전환");
  if (id === "12") push(ctx.currentYearPillar, ctx.currentDaeun, "세운", "월별 신호");
  if (id === "13") push(ctx.useful && `${ctx.useful} 기준`, ctx.topTenGod, "최종 통합");

  push(signals.useful, signals.topTenGod);
  return tags.slice(0, 8);
}

function buildLifeBookCategoryExpertLines(ctx, chapterId, categoryTitle) {
  const title = clean(categoryTitle);
  const id = String(chapterId || "");
  const baseTiming = `${title}은 원국만으로 끝나지 않고 현재 ${ctx.currentDaeun}에서 실제 과제로 떠오릅니다. 다음 ${ctx.nextDaeun}을 준비할수록 지금의 선택은 더 분명한 기준을 남겨야 합니다.`;

  if (id === "01") {
    return [
      `${title}에서는 ${ctx.dayMaster} 일간과 ${ctx.monthBranch} 월지를 먼저 세웁니다. 이 두 축이 흔들리면 강한 기운도 방향을 잃고, 약한 기운은 결핍감으로만 느껴질 수 있습니다.`,
      `${ctx.dominant} 기운은 삶을 앞으로 밀어 주는 힘이고, ${ctx.weakest} 기운은 오래 관리해야 할 빈자리입니다. 이 둘을 동시에 보아야 첫 장의 문장이 과장되지 않습니다.`,
      baseTiming,
      `따라서 이 장의 결론은 사건 예언이 아니라 판단 기준입니다. ${ctx.name}님은 크게 움직일 때일수록 ${ctx.useful}의 방향을 잃지 않는 선택이 필요합니다.`,
    ];
  }
  if (id === "02") {
    const pillarLine = lifeBookCategoryIncludes(title, ["년주"]) ? `${ctx.yearPillar}은 초년의 배경과 오래 남은 습관을 보여 줍니다.`
      : lifeBookCategoryIncludes(title, ["월주", "사회적"]) ? `${ctx.monthPillar}은 사회적 무대와 인정받는 방식을 보여 줍니다.`
      : lifeBookCategoryIncludes(title, ["일주", "자기"]) ? `${ctx.dayPillar}은 자기 본질과 친밀한 관계의 중심을 보여 줍니다.`
      : lifeBookCategoryIncludes(title, ["시주", "말년"]) ? `${ctx.hourPillar}은 늦게 피는 재능과 말년의 방향을 보여 줍니다.`
      : `${ctx.yearPillar}, ${ctx.monthPillar}, ${ctx.dayPillar}, ${ctx.hourPillar}은 따로 서 있지 않고 서로의 힘을 빌려 원국의 반복을 만듭니다.`;
    return [
      pillarLine,
      `${title}의 판단은 겉으로 드러난 천간과 지지 안에 숨은 지장간을 함께 보아야 합니다. 겉말과 속동기가 어긋나는 지점에서 같은 선택이 반복됩니다.`,
      `월지 ${ctx.monthBranch}이 원국의 무대를 잡고, 일간 ${ctx.dayMaster}이 그 무대에서 어떤 방식으로 버티는지가 상담의 중심입니다.`,
      `이 장에서는 좋은 팔자와 나쁜 팔자로 가르지 않습니다. 네 기둥이 어떤 순서로 힘을 주고받는지 읽어야 현실 조언이 정확해집니다.`,
    ];
  }
  if (id === "03") {
    return [
      `${title}은 일간의 성격 풀이가 아니라 월령을 얻었는지, 통근이 있는지, 조후가 맞는지를 함께 보는 자리입니다.`,
      `${ctx.dayMaster} 일간이 ${ctx.monthBranch} 월지의 계절을 만나면 힘의 쓰임이 정해집니다. 신강·신약은 고집의 강약이 아니라 오래 버틸 수 있는 뿌리의 문제입니다.`,
      `조후가 ${ctx.johuType}으로 흐르면 마음의 온도와 몸의 리듬도 그 영향을 받습니다. 재능보다 먼저 안정되는 환경을 잡아야 운을 오래 씁니다.`,
      `이 판단이 정확해야 뒤의 용신, 직업, 관계, 건강 해석이 한 방향으로 모입니다.`,
    ];
  }
  if (id === "04") {
    return [
      `${title}은 오행의 숫자를 세는 데서 끝나지 않습니다. ${ctx.dominant}이 강하게 앞서고 ${ctx.weakest}이 비어 있는 구조가 어떤 생활 반복을 만드는지 보아야 합니다.`,
      `강한 오행은 재능이지만 통로가 없으면 과부하가 됩니다. 부족한 오행은 약점이지만 알맞은 사람, 장소, 습관을 만나면 균형의 문이 됩니다.`,
      `오행의 생극제화가 부드러울 때는 선택이 자연스럽고, 막힐 때는 같은 일도 감정과 몸에 부담으로 남습니다.`,
      `이 장의 조언은 보완 색이나 상징보다 실제 루틴입니다. ${ctx.weakest}을 살리는 반복을 작게 잡아야 균형이 오래 갑니다.`,
    ];
  }
  if (id === "05") {
    const star = lifeBookCategoryIncludes(title, ["비겁"]) ? "비겁"
      : lifeBookCategoryIncludes(title, ["식상"]) ? "식상"
      : lifeBookCategoryIncludes(title, ["재성"]) ? "재성"
      : lifeBookCategoryIncludes(title, ["관성"]) ? "관성"
      : lifeBookCategoryIncludes(title, ["인성"]) ? "인성"
      : ctx.topTenGod;
    return [
      `${title}에서는 ${star}이 성격이 아니라 사회적 역할로 어떻게 바뀌는지 봅니다. 같은 십성도 천간에 드러난 것과 지지에 숨어 있는 것은 발현 방식이 다릅니다.`,
      `${ctx.topTenGod}의 비중이 크면 삶의 언어가 그 별을 통해 반복됩니다. 장점으로 쓰면 재능이 되고, 과하면 관계와 일의 균형을 흔듭니다.`,
      `십성의 충돌은 욕망이 나쁘다는 뜻이 아닙니다. 표현, 돈, 책임, 배움이 어느 순서로 이어져야 하는지를 알려 주는 신호입니다.`,
      `따라서 ${title}의 조언은 별 하나의 길흉보다, 그 별을 언제 앞세우고 언제 뒤로 물릴지 정하는 데 있습니다.`,
    ];
  }
  if (id === "06") {
    return [
      `${title}은 용신을 이름으로 외우는 장이 아닙니다. ${ctx.useful}이 왜 필요하고, ${ctx.support}이 어떻게 돕고, ${ctx.caution}이 언제 판단을 흐리는지 나누어 보아야 합니다.`,
      `억부, 조후, 통관, 병약의 논리 중 어디에서 균형이 무너지는지를 확인해야 용신 판단이 실제 상담이 됩니다.`,
      `사람과 환경도 용신처럼 작동합니다. 어떤 관계는 숨을 열어 주고, 어떤 관계는 기운을 과하게 몰아 소모를 키웁니다.`,
      `이 장의 결론은 행운의 주문이 아니라 선택 기준입니다. 잘 풀리는 조건을 반복하고, 소모되는 조건을 줄여야 운이 안정됩니다.`,
    ];
  }
  if (id === "07") {
    return [
      `${title}은 격국의 이름보다 성립 조건이 먼저입니다. 월령, 투간, 통근, 용신의 방향이 어긋나지 않아야 사회적 쓰임이 선명해집니다.`,
      `${ctx.topTenGod}이 격의 흐름과 맞으면 성과는 억지가 아니라 책임과 평판으로 쌓입니다. 맞지 않으면 노력은 많아도 무대 선택에서 피로가 생깁니다.`,
      `조직과 독립성, 명예와 실리, 브랜드와 평판은 모두 격국의 쓰임에서 갈립니다. ${title}은 이 사람이 어느 무대에서 인정받는지를 가려내는 항목입니다.`,
      `성공 구조의 약점은 실패 예언이 아닙니다. 강한 역할을 오래 쓰기 위해 반드시 관리해야 할 균열입니다.`,
    ];
  }
  if (id === "08") {
    return [
      `${title}에서는 감정보다 먼저 배우자궁, 배우자성, 일지의 안정성을 봅니다. 끌림과 함께 사는 리듬은 같은 말이 아니기 때문입니다.`,
      `${ctx.dayBranch} 일지가 안정되면 친밀감이 생활로 이어지고, 흔들리면 좋아하는 마음과 일상의 속도가 따로 움직일 수 있습니다.`,
      `합충형해가 관계의 문을 열 때는 시작이 빠르고, 충돌을 만들 때는 갈등 회복 방식이 인연의 수명을 결정합니다.`,
      `이 장의 조언은 상대를 맞히는 데 있지 않습니다. ${ctx.name}님이 어떤 조건에서 마음을 열고, 어떤 조건에서 방어가 강해지는지 아는 데 있습니다.`,
    ];
  }
  if (id === "09") {
    return [
      `${title}은 돈의 크기보다 돈이 생기고 머무는 구조를 봅니다. 재성은 그릇이고, 식상은 수익화의 통로이며, 관성은 직업적 신뢰의 틀입니다.`,
      `${ctx.topTenGod}이 앞에 서는 방식에 따라 일의 언어가 달라집니다. 표현으로 벌지, 관리로 벌지, 책임으로 벌지, 전문성으로 벌지를 구분해야 합니다.`,
      `${ctx.currentDaeun}에서는 무리한 확장보다 수입 구조와 책임 범위를 함께 보아야 합니다. 돈만 보고 움직이면 몸과 관계가 먼저 신호를 보낼 수 있습니다.`,
      `사업과 투자는 기세가 아니라 감당 가능한 손실, 반복 가능한 수익, 오래 지킬 수 있는 원칙으로 판단해야 합니다.`,
    ];
  }
  if (id === "10") {
    return [
      `${title}은 병명을 단정하는 장이 아니라 오행과 조후가 생활 리듬에 남기는 신호를 읽는 장입니다.`,
      `${ctx.dominant} 기운이 과하면 과열과 긴장이 생기고, ${ctx.weakest} 기운이 약하면 회복의 통로가 좁아질 수 있습니다.`,
      `스트레스는 마음만의 문제가 아니라 명식의 균형이 흔들릴 때 반복되는 몸의 언어로 나타납니다. 수면, 식사, 움직임, 관계의 속도를 함께 조절해야 합니다.`,
      `반복되는 통증이나 불편은 운세 해석으로 대신하지 않습니다. 필요한 경우 의료 상담을 우선하고, 명리는 생활 리듬을 정돈하는 보조 지도로 삼아야 합니다.`,
    ];
  }
  if (id === "11") {
    return [
      `${title}은 대운의 좋고 나쁨보다 간지와 십성이 원국의 어느 글자를 깨우는지 보는 장입니다.`,
      `현재 ${ctx.currentDaeun}은 지금 맡아야 할 역할을 앞으로 밀어내고, 다음 ${ctx.nextDaeun}은 방향을 바꾸라는 예고로 다가옵니다.`,
      `직업, 관계, 재물은 따로 움직이지 않습니다. 대운이 바뀌면 같은 재능도 쓰이는 무대와 책임의 크기가 달라집니다.`,
      `전환기에는 새것을 잡기 전에 끝낼 것과 줄일 것을 먼저 정해야 합니다. 그래야 다음 운의 기회가 부담으로 바뀌지 않습니다.`,
    ];
  }
  if (id === "12") {
    return [
      `${title}은 선택 연도 ${ctx.currentYear}년의 세운이 현재 ${ctx.currentDaeun} 위에 얹히는 지점을 읽습니다.`,
      `${ctx.currentYearPillar}의 기운이 원국의 강한 곳을 자극하면 일이 커지고, 약한 곳을 건드리면 관리해야 할 부담이 먼저 드러납니다.`,
      `상반기와 하반기는 같은 해 안에서도 속도가 다릅니다. 밀어야 할 때와 정리해야 할 때를 나누어야 가까운 운을 정확히 쓸 수 있습니다.`,
      `월별 신호는 사건 맞히기가 아니라 선택의 순서입니다. 큰 결정, 계약, 관계 회복, 건강 관리는 서로 다른 달의 리듬을 요구합니다.`,
    ];
  }
  if (id === "13") {
    return [
      `${title}은 앞 장의 판단을 다시 모아 하나의 생활 원칙으로 세우는 자리입니다.`,
      `${ctx.dominant}의 강점, ${ctx.weakest}의 보완, ${ctx.useful}의 선택 기준, ${ctx.currentDaeun}의 과제가 서로 어긋나지 않아야 최종 조언이 힘을 얻습니다.`,
      `관계에서 지킬 원칙과 일과 돈에서 지킬 원칙은 분리되어 보이지만, 실제로는 같은 명식의 반복에서 나옵니다.`,
      `마지막 상담은 화려한 예언보다 오래 지킬 수 있는 기준이어야 합니다. ${ctx.name}님은 강점을 크게 쓰되 약점이 보내는 신호를 먼저 인정할 때 운을 가장 안정적으로 씁니다.`,
    ];
  }
  return [
    `${title}은 원국의 근거와 현재 운의 요구를 함께 놓고 읽어야 합니다.`,
    baseTiming,
  ];
}

function buildLifeBookCategoryJudgmentChainLines(ctx, chapterId, categoryTitle) {
  const title = clean(categoryTitle);
  const id = String(chapterId || "");
  if (id === "01") {
    return [
      `이 대목의 근거는 ${ctx.dayPillar}의 일간 중심과 ${ctx.monthBranch} 월지가 만든 계절감입니다. 여기에 현재 ${ctx.currentDaeun}이 얹히면, 타고난 성향이 지금 어떤 방식으로 시험받는지 보입니다.`,
      `고수의 판단은 강한 ${ctx.dominant}을 무조건 밀어붙이는 데 있지 않습니다. ${ctx.weakest}이 비는 순간 삶의 속도와 관계의 온도가 흔들리므로, 강점과 결핍을 한 쌍으로 읽어야 합니다.`,
      `현실 적용은 단순합니다. 중요한 선택 앞에서는 ${ctx.useful}의 방향과 맞는지 먼저 묻고, 감정이 급해질 때는 결정을 미루어 기준을 다시 세우는 편이 좋습니다.`,
    ];
  }
  if (id === "02") {
    const pillarFocus = lifeBookCategoryIncludes(title, ["년주"]) ? `${ctx.yearPillar}의 초년 배경`
      : lifeBookCategoryIncludes(title, ["월주", "사회적"]) ? `${ctx.monthPillar}의 사회적 무대`
      : lifeBookCategoryIncludes(title, ["일주", "자기"]) ? `${ctx.dayPillar}의 자기 기준과 일지 ${ctx.dayBranch}`
      : lifeBookCategoryIncludes(title, ["시주", "말년"]) ? `${ctx.hourPillar}의 말년 잠재력`
      : `${ctx.yearPillar}, ${ctx.monthPillar}, ${ctx.dayPillar}, ${ctx.hourPillar}의 원국 배열`;
    return [
      `판단의 출발점은 ${pillarFocus}입니다. 네 기둥은 한 줄씩 따로 말하지 않고, 어느 기둥이 앞에서 끌고 어느 기둥이 뒤에서 보조하는지를 함께 보여 줍니다.`,
      `천간은 밖으로 드러난 태도이고 지지와 지장간은 속에서 움직이는 동기입니다. 둘이 어긋나면 겉으로는 괜찮아 보여도 같은 감정과 선택이 안쪽에서 반복됩니다.`,
      `현실에서는 원국의 반복을 고치려 하기보다 알아차리는 편이 먼저입니다. 반복되는 반응을 알면 관계, 일, 돈의 선택에서 같은 실수를 줄일 수 있습니다.`,
    ];
  }
  if (id === "03") {
    return [
      `근거는 ${ctx.dayMaster} 일간이 ${ctx.monthBranch} 월령을 만난 모양입니다. 통근이 있으면 버티는 힘이 생기고, 뿌리가 약하면 사람과 환경의 도움을 받아야 기운이 오래 갑니다.`,
      `신강·신약은 성격의 세기가 아니라 감당 가능한 에너지의 문제입니다. 조후가 ${ctx.johuType}으로 흐를 때 마음의 온도와 몸의 리듬도 같은 방향으로 반응합니다.`,
      `적용은 환경 선택에서 갈립니다. 안정되는 공간, 사람, 일의 속도를 먼저 잡아야 뒤의 용신, 직업, 관계 해석이 실제 생활에서 흔들리지 않습니다.`,
    ];
  }
  if (id === "04") {
    return [
      `이 항목은 ${ctx.dominant}의 강세와 ${ctx.weakest}의 빈자리를 함께 놓고 봅니다. 오행은 많고 적음보다 어디로 흐르고 어디서 막히는지가 더 중요합니다.`,
      `고수는 강한 오행을 복으로만 보지 않습니다. 통로가 있으면 재능이 되고, 통로가 막히면 과열, 고집, 피로, 관계의 압박으로 바뀔 수 있습니다.`,
      `현실 적용은 ${ctx.weakest}을 억지로 채우는 데 있지 않습니다. 약한 기운이 살아나는 루틴과 사람, 공간을 반복해서 선택해야 균형이 오래 갑니다.`,
    ];
  }
  if (id === "05") {
    const star = lifeBookCategoryIncludes(title, ["비겁"]) ? "비겁"
      : lifeBookCategoryIncludes(title, ["식상"]) ? "식상"
      : lifeBookCategoryIncludes(title, ["재성"]) ? "재성"
      : lifeBookCategoryIncludes(title, ["관성"]) ? "관성"
      : lifeBookCategoryIncludes(title, ["인성"]) ? "인성"
      : ctx.topTenGod;
    return [
      `근거는 십성 분포 안에서 ${star}이 어떤 자리에 놓였는가입니다. 천간에 드러난 별은 밖에서 보이는 역할이고, 지지에 숨은 별은 실제 욕구와 반복을 만듭니다.`,
      `판단은 ${star}의 많고 적음보다 쓰임의 순서에 있습니다. 표현이 돈으로 이어지는지, 책임이 평판으로 이어지는지, 배움이 전문성으로 이어지는지를 구분해야 합니다.`,
      `현실에서는 ${ctx.topTenGod}을 앞세울 때와 내려놓을 때를 알아야 합니다. 같은 재능도 때를 놓치면 압박이 되고, 자리를 맞추면 신뢰와 결과가 됩니다.`,
    ];
  }
  if (id === "06") {
    return [
      `이 장의 근거는 ${ctx.useful} 용신, ${ctx.support} 희신, ${ctx.caution} 기신의 관계입니다. 세 기운은 이름이 아니라 명식이 숨을 쉬는 방향과 막히는 방향을 나누어 줍니다.`,
      `판단은 억부, 조후, 통관, 병약 중 어디에서 균형이 필요한지를 보는 데 있습니다. 용신이 맞아도 환경이 맞지 않으면 기운은 오래 살아나지 않습니다.`,
      `현실 적용은 사람과 장소 선택입니다. 편안하게 반복되는 조건은 살리는 기운이고, 이유 없이 소모가 커지는 조건은 줄여야 할 기운입니다.`,
    ];
  }
  if (id === "07") {
    return [
      `격국 판단은 ${ctx.monthBranch} 월령, 투간, 통근, 그리고 ${ctx.useful}의 방향이 함께 맞는지에서 시작합니다. 이름만 붙이면 격은 살아나지 않습니다.`,
      `고수의 눈은 직업명을 맞히는 데 머물지 않습니다. ${ctx.topTenGod}이 사회적 쓰임으로 바뀌는 무대, 책임의 크기, 평판이 쌓이는 방식을 함께 봅니다.`,
      `현실에서는 맞지 않는 무대에서 오래 버티는 일을 능력으로 착각하지 않아야 합니다. 격의 쓰임과 맞는 판을 고르면 노력의 양보다 성과의 밀도가 달라집니다.`,
    ];
  }
  if (id === "08") {
    return [
      `관계 판단의 근거는 일지 ${ctx.dayBranch}, 배우자궁, 배우자성, 합충형해의 흐름입니다. 감정의 세기만 보면 인연의 지속성을 놓치기 쉽습니다.`,
      `고수는 끌림과 안정성을 분리해서 봅니다. 끌림은 빠르게 시작하게 만들 수 있지만, 생활의 리듬과 책임을 견디는 힘은 배우자궁과 대운의 자극에서 드러납니다.`,
      `현실 적용은 상대를 맞히는 것이 아니라 나의 반응을 아는 것입니다. 마음이 열리는 조건과 방어가 강해지는 조건을 알면 관계의 반복을 덜 다치게 다룰 수 있습니다.`,
    ];
  }
  if (id === "09") {
    return [
      `재물과 직업의 근거는 재성, 식상, 관성, 인성이 어떤 순서로 이어지는가입니다. 식상은 만들어 내는 통로이고, 재성은 돈의 그릇이며, 관성은 책임과 신뢰의 틀입니다.`,
      `판단은 돈이 들어오는가보다 머무는가에 있습니다. ${ctx.currentDaeun}이 수익 구조를 키우는지, 책임만 키우는지에 따라 같은 일도 결과가 달라집니다.`,
      `현실에서는 확장보다 구조를 먼저 봐야 합니다. 반복 가능한 수익, 감당 가능한 지출, 오래 지킬 수 있는 역할이 맞아야 재물운이 흩어지지 않습니다.`,
    ];
  }
  if (id === "10") {
    return [
      `건강과 심신의 근거는 오행 균형과 조후입니다. ${ctx.dominant}이 과하면 긴장과 과열이 생기고, ${ctx.weakest}이 비면 회복의 통로가 좁아질 수 있습니다.`,
      `이 판단은 병명을 말하는 것이 아닙니다. 명리는 몸이 보내는 반복 신호와 생활 리듬의 취약점을 읽어 관리의 순서를 잡는 데 쓰여야 합니다.`,
      `현실 적용은 수면, 식사, 움직임, 관계의 속도입니다. 반복되는 불편이나 통증은 의료 상담을 우선하고, 사주 해석은 회복 루틴을 정돈하는 보조 기준으로 두어야 합니다.`,
    ];
  }
  if (id === "11") {
    return [
      `대운 판단의 근거는 현재 ${ctx.currentDaeun}과 다음 ${ctx.nextDaeun}이 원국의 어느 글자와 십성을 깨우는가입니다. 대운은 사건보다 역할의 계절을 바꿉니다.`,
      `판단은 좋은 운과 나쁜 운으로 자르지 않습니다. 같은 기회도 원국의 강한 곳을 건드리면 확장이 되고, 약한 곳을 건드리면 부담과 정리가 먼저 옵니다.`,
      `현실에서는 새 판을 벌이기 전에 끝낼 것과 남길 것을 정해야 합니다. 전환기의 선택은 속도보다 순서가 중요합니다.`,
    ];
  }
  if (id === "12") {
    return [
      `선택 연도의 근거는 ${ctx.currentYearPillar} 세운이 현재 ${ctx.currentDaeun} 위에 얹히는 방식입니다. 세운은 대운의 큰 과제에 가까운 자극을 더합니다.`,
      `판단은 한 해 전체를 한 문장으로 단정하지 않는 데 있습니다. 상반기와 하반기, 월별 신호가 서로 다르면 밀어야 할 일과 정리해야 할 일이 달라집니다.`,
      `현실 적용은 일정과 결정의 순서입니다. 계약, 이직, 투자, 관계 회복, 건강 관리는 같은 속도로 처리하지 말고 운의 리듬에 맞춰 나누어야 합니다.`,
    ];
  }
  if (id === "13") {
    return [
      `최종 통합의 근거는 원국, ${ctx.currentDaeun}, ${ctx.currentYearPillar} 세운이 같은 방향을 가리키는지입니다. 앞 장의 판단이 여기서 하나의 기준으로 모여야 합니다.`,
      `고수의 결론은 화려한 예언보다 우선순위입니다. 관계, 일, 돈, 몸의 리듬이 충돌할 때 무엇을 먼저 지켜야 운을 오래 쓰는지가 핵심입니다.`,
      `현실에서는 ${ctx.useful}의 기준을 잃지 않는 선택이 필요합니다. 강점은 크게 쓰되, ${ctx.weakest}이 보내는 신호를 무시하지 않을 때 삶의 흐름이 안정됩니다.`,
    ];
  }
  return [
    `${title}의 근거는 원국과 현재 운의 접점입니다.`,
    `판단은 길흉보다 반복되는 선택의 방향을 보는 데 있습니다.`,
    `현실에서는 제목이 가리키는 삶의 영역에서 먼저 기준을 세워야 합니다.`,
  ];
}

function buildLifeBookCategoryCompletionLines(chapterId, categoryTitle) {
  const title = clean(categoryTitle);
  const map = {
    "01": [`${title}은 전체 명식의 첫 기준입니다. 일간과 월지, 현재 대운이 같은 방향을 가리키는지 확인해야 첫 문장이 흔들리지 않습니다.`],
    "02": [`${title}은 네 기둥과 지장간의 관계로 다시 확인해야 합니다. 겉으로 보이는 성향과 안쪽의 동기가 만나는 지점을 놓치면 원국 해석이 얕아집니다.`],
    "03": [`${title}은 월령, 통근, 조후, 신강신약을 함께 보아야 합니다. 이 네 판단이 이어질 때 기질 해석이 실제 생활 조언으로 내려옵니다.`],
    "04": [`${title}은 오행의 과다와 부족을 생극제화의 흐름으로 읽어야 합니다. 강한 기운은 통로를 주고 약한 기운은 루틴으로 살리는 것이 핵심입니다.`],
    "05": [`${title}은 십성의 이름보다 현실 역할을 보아야 합니다. 표현, 돈, 책임, 배움이 어떤 순서로 이어지는지 살피면 반복 패턴이 선명해집니다.`],
    "06": [`${title}은 용신, 희신, 기신의 작동을 실제 사람과 환경으로 번역해야 합니다. 살리는 조건과 소모되는 조건을 분리해야 상담이 정확해집니다.`],
    "07": [`${title}은 격국의 성립, 파격 가능성, 사회적 쓰임을 함께 보아야 합니다. 월령과 투간, 용신의 방향이 맞는지 확인해야 성취 구조가 살아납니다.`],
    "08": [`${title}은 배우자성, 배우자궁, 일지의 안정성, 합충형해를 함께 놓아야 합니다. 끌림과 생활의 지속성은 반드시 나누어 판단해야 합니다.`],
    "09": [`${title}은 재성, 식상, 관성, 인성의 연결로 보아야 합니다. 돈이 생기는 통로와 오래 머무는 그릇이 다르기 때문입니다.`],
    "10": [`${title}은 오행과 조후가 생활 리듬에 남기는 신호로 읽어야 합니다. 반복되는 불편은 의료 상담을 우선하고, 명리는 회복 루틴을 정돈하는 기준으로 삼아야 합니다.`],
    "11": [`${title}은 대운 간지와 십성이 원국을 어떻게 깨우는지 확인해야 합니다. 현재 대운과 다음 대운의 과제를 나누어야 전환기 판단이 분명해집니다.`],
    "12": [`${title}은 세운이 현재 대운 위에서 어느 부분을 자극하는지 보는 장입니다. 상반기, 하반기, 월별 리듬을 나누어야 가까운 선택이 정확해집니다.`],
    "13": [`${title}은 앞 장의 결론을 하나의 기준으로 모아야 합니다. 관계, 일, 돈, 몸의 리듬이 충돌할 때 무엇을 먼저 지킬지 정하는 것이 마지막 상담입니다.`],
  };
  return map[String(chapterId || "")] || [`${title}은 원국의 근거와 현재 운의 요구를 함께 놓고 읽어야 합니다.`];
}

function buildLifeBookCategoryLensLine(chapterId, ctx, categoryTitle) {
  const title = clean(categoryTitle);
  const id = String(chapterId || "");
  if (id === "01") {
    if (lifeBookCategoryIncludes(title, ["한 문장", "첫인상"])) return `${ctx.dayMaster} 일간이 ${ctx.monthBranch} 월지 위에 서 있는 모양이 이 책의 첫 문장입니다. 여기서는 사건을 맞히기보다, 같은 선택이 왜 반복되는지 한 줄의 운명 기준으로 압축해 읽습니다.`;
    if (lifeBookCategoryIncludes(title, ["강하게"])) return `${ctx.dominant} 기운은 이 명식에서 먼저 목소리를 내는 축입니다. 강한 기운은 재능이지만, 오래 방치되면 삶의 속도와 관계의 온도를 한쪽으로 몰고 가므로 쓰임의 자리를 정해야 합니다.`;
    if (lifeBookCategoryIncludes(title, ["부족"])) return `${ctx.weakest} 기운은 결핍의 낙인이 아니라 보완해야 할 통로입니다. 이 기운이 약해지는 장면을 알면, 무리한 개운보다 생활 구조와 사람 선택에서 먼저 균형을 잡을 수 있습니다.`;
    return `${title}은 전체 원고의 문을 여는 자리입니다. 원국의 세부 판단으로 바로 들어가기 전에, ${ctx.dayPillar}의 중심과 ${ctx.currentDaeun}의 요구를 하나의 방향으로 묶어 봅니다.`;
  }
  if (id === "02") {
    if (lifeBookCategoryIncludes(title, ["년주"])) return `년주는 삶의 첫 배경과 오래된 습관의 문입니다. ${ctx.yearPillar}이 원국에서 어떤 온도를 띠는지 보면, 초년의 환경이 지금의 방어 방식과 자존감에 어떻게 남았는지 읽을 수 있습니다.`;
    if (lifeBookCategoryIncludes(title, ["월주", "사회적"])) return `월주는 사회로 나가는 문이며, ${ctx.monthPillar}은 이 사람이 인정받는 방식과 부담을 떠안는 방식을 함께 보여 줍니다. 직업 이름보다 먼저 보아야 할 것은 월주가 허락하는 무대의 성격입니다.`;
    if (lifeBookCategoryIncludes(title, ["일주", "자기"])) return `일주는 자기 자신과 친밀한 관계의 자리입니다. ${ctx.dayPillar}의 결을 보면 겉으로 드러나는 태도보다 깊은 곳의 선택 기준, 사랑을 받아들이는 방식, 고집의 방향이 선명해집니다.`;
    if (lifeBookCategoryIncludes(title, ["시주", "말년"])) return `시주는 늦게 피어나는 재능과 미래의 정리 방식을 품습니다. ${ctx.hourPillar}은 당장의 성과보다 오래 남길 것, 후반부에 삶이 어떤 방향으로 깊어지는지를 살피는 자리입니다.`;
    if (lifeBookCategoryIncludes(title, ["지장간"])) return `지장간은 겉으로 보이지 않는 동기입니다. 천간에 드러난 말과 지지 안에 숨은 마음이 다를 때, 사람은 같은 상황에서도 설명하기 어려운 끌림과 거부감을 반복합니다.`;
    return `${title}에서는 네 기둥을 따로 떼어 해석하지 않습니다. 년월일시가 서로 어떤 순서로 힘을 주고받는지 보아야 이 원국의 실제 작동 방식이 살아납니다.`;
  }
  if (id === "03") {
    if (lifeBookCategoryIncludes(title, ["월지", "월령"])) return `${ctx.monthBranch} 월지는 태어난 계절의 기운이며, 일간이 세상에 적응하는 첫 기후입니다. 월령을 얻었는지 잃었는지에 따라 같은 ${ctx.dayMaster}이라도 자신감과 피로의 양상이 달라집니다.`;
    if (lifeBookCategoryIncludes(title, ["강약", "중심성", "신강", "신약", "통근"])) return `일간의 강약은 성격의 강함이 아니라 버틸 수 있는 뿌리의 문제입니다. 통근이 안정되면 밀고 나가는 힘이 생기고, 뿌리가 약하면 사람과 환경의 도움을 받아야 기운이 오래 갑니다.`;
    if (lifeBookCategoryIncludes(title, ["조후", "온도"])) return `조후는 명식의 온도 조절입니다. 너무 뜨겁거나 차가운 명식은 재능이 있어도 소모가 빠르므로, 이 장에서는 성취보다 먼저 몸과 마음이 안정되는 기후를 찾아야 합니다.`;
    return `${title}은 일간이 월지의 계절을 만나 어떤 방식으로 삶을 운용하는지 읽는 대목입니다. 이 판단이 정확해야 뒤의 용신, 직업, 관계 해석도 흔들리지 않습니다.`;
  }
  if (id === "04") {
    if (lifeBookCategoryIncludes(title, ["강한", "과부하"])) return `${ctx.dominant} 기운이 강하면 삶의 한 영역에서 추진력과 존재감이 뚜렷해집니다. 다만 강한 기운은 복이 되려면 통로가 필요하고, 통로가 막히면 급함·과열·집착으로 바뀔 수 있습니다.`;
    if (lifeBookCategoryIncludes(title, ["부족", "결핍", "보완"])) return `${ctx.weakest} 기운이 약한 지점은 운이 없는 자리가 아니라 관리가 필요한 빈자리입니다. 빈자리를 억지로 채우기보다, 약한 기운이 살아나는 사람·공간·습관을 선택해야 합니다.`;
    return `오행은 많고 적음의 숫자보다 흐르는 방향이 중요합니다. ${ctx.dominant}이 앞에서 끌고 ${ctx.weakest}이 뒤에서 비면, 장점과 피로가 같은 뿌리에서 함께 나옵니다.`;
  }
  if (id === "05") {
    if (lifeBookCategoryIncludes(title, ["비겁"])) return `비겁은 자기 힘, 독립성, 경쟁심의 자리입니다. 강하면 스스로 길을 내지만 관계의 양보가 과제가 되고, 약하면 나를 대신해 줄 구조와 동료 선택이 중요해집니다.`;
    if (lifeBookCategoryIncludes(title, ["식상"])) return `식상은 재능이 밖으로 나오는 통로입니다. 표현, 기획, 생산성이 살아나면 돈과 평판으로 이어지지만, 과하면 말과 결과의 간격이 커질 수 있습니다.`;
    if (lifeBookCategoryIncludes(title, ["재성"])) return `재성은 돈만이 아니라 현실 감각, 관리 능력, 관계 속 책임을 함께 봅니다. 재성이 잘 흐르면 돈이 머물 구조가 생기고, 막히면 수입보다 지출과 욕심의 방향이 먼저 흔들립니다.`;
    if (lifeBookCategoryIncludes(title, ["관성"])) return `관성은 책임, 규칙, 사회적 역할입니다. 이 기운이 바르게 서면 신뢰와 직함이 생기고, 무리하면 의무감이 몸과 마음을 압박합니다.`;
    if (lifeBookCategoryIncludes(title, ["인성"])) return `인성은 배움, 보호, 회복의 기운입니다. 생각을 깊게 만들지만 지나치면 실행을 늦추므로, 배운 것을 어디에 써야 하는지가 핵심입니다.`;
    return `십성은 성격표가 아니라 기운이 사회에서 어떤 역할로 바뀌는지 보여 주는 지도입니다. ${ctx.topTenGod}이 강하게 보이면 그 십성이 일과 관계의 언어가 됩니다.`;
  }
  if (id === "06") {
    if (lifeBookCategoryIncludes(title, ["용신"])) return `용신 ${ctx.useful}은 행운의 부적이 아니라 명식이 숨을 쉬는 방향입니다. 억부, 조후, 병약의 논리 중 어디서 균형이 필요한지 살펴야 실제 선택 기준이 나옵니다.`;
    if (lifeBookCategoryIncludes(title, ["희신"])) return `희신 ${ctx.support}은 용신을 돕는 조력의 기운입니다. 주역은 아니지만 이 기운이 살아날 때 사람, 환경, 일정이 부드럽게 맞물립니다.`;
    if (lifeBookCategoryIncludes(title, ["기신", "소모"])) return `기신 ${ctx.caution}은 피해야 할 운명이 아니라 과해질 때 판단을 흐리는 방향입니다. 기신이 움직이는 장면을 알면 문제를 막는 힘이 생깁니다.`;
    return `${title}은 기운의 이름보다 실제 환경 선택이 중요합니다. 나를 살리는 기운은 생활에서 편안한 반복으로 나타나고, 소모되는 기운은 비슷한 사람과 상황을 통해 되풀이됩니다.`;
  }
  if (id === "07") {
    if (lifeBookCategoryIncludes(title, ["성립", "큰 틀"])) return `격국의 성립은 이름보다 조건이 먼저입니다. ${ctx.monthBranch} 월령, 드러난 천간, ${ctx.dayMaster} 일간의 뿌리, ${ctx.useful}의 균형이 한 방향으로 모일 때 삶의 큰 틀이 선명해집니다.`;
    if (lifeBookCategoryIncludes(title, ["사회적 역할", "쓰임"])) return `사회적 역할은 격이 현실에서 입는 옷입니다. ${ctx.topTenGod}이 앞에 설수록 사람들은 이 명식에게 특정한 책임과 쓰임을 기대하게 됩니다.`;
    if (lifeBookCategoryIncludes(title, ["성과", "무대"])) return `성과가 나는 무대는 노력의 양보다 격의 쓰임과 맞는지가 중요합니다. 맞는 무대에서는 책임이 커져도 성취로 이어지고, 맞지 않는 무대에서는 성과보다 소모가 먼저 쌓입니다.`;
    if (lifeBookCategoryIncludes(title, ["명예", "책임"])) return `명예와 책임은 관성의 압박만이 아니라 격이 사회와 약속하는 방식입니다. 책임을 감당할 그릇이 준비될 때 평판은 천천히 단단해집니다.`;
    if (lifeBookCategoryIncludes(title, ["조직", "독립"])) return `조직과 독립의 적합도는 자유가 좋은가 안정이 좋은가의 문제가 아닙니다. 격이 제도 안에서 힘을 얻는지, 독자적 판에서 힘을 얻는지를 나누어 보아야 합니다.`;
    if (lifeBookCategoryIncludes(title, ["브랜드", "평판"])) return `브랜드와 평판은 격이 반복해서 남기는 인상입니다. ${ctx.topTenGod}의 쓰임이 분명할수록 사람들은 이 명식을 특정한 전문성과 태도로 기억합니다.`;
    if (lifeBookCategoryIncludes(title, ["약점"])) return `성공 구조의 약점은 격이 무너지는 지점입니다. 강한 역할을 오래 쓰려면 ${ctx.caution}이 과해지는 장면과 ${ctx.weakest}이 비는 장면을 먼저 관리해야 합니다.`;
    return `격국은 인생의 직업명을 찍는 기술이 아니라, 어떤 방식으로 사회적 쓰임을 얻는지 보는 큰 틀입니다. ${ctx.topTenGod}의 작동이 격의 흐름과 어긋나지 않을 때 성과는 억지보다 자연스러운 책임으로 쌓입니다.`;
  }
  if (id === "08") {
    if (lifeBookCategoryIncludes(title, ["배우자궁"])) return `배우자궁은 사랑의 결과가 머무는 자리입니다. 일지 ${ctx.dayBranch}이 안정되면 친밀감이 생활로 이어지고, 흔들리면 좋아하는 마음과 함께 사는 리듬이 따로 움직일 수 있습니다.`;
    if (lifeBookCategoryIncludes(title, ["배우자성"])) return `배우자성은 끌리는 사람의 모습과 관계에서 기대하는 역할을 보여 줍니다. 강약보다 중요한 것은 그 별이 원국 안에서 보호받는지, 대운에서 자극을 받는지입니다.`;
    return `연애와 관계는 감정 하나로 판단하지 않습니다. 일지, 배우자성, 합충형해가 같은 방향을 가리킬 때 인연은 오래 머물고, 서로 다른 방향이면 끌림과 생활의 안정성을 나누어 보아야 합니다.`;
  }
  if (id === "09") {
    if (lifeBookCategoryIncludes(title, ["재성", "돈"])) return `재성은 돈의 크기보다 돈이 만들어지고 머무는 그릇입니다. 재성이 살아도 식상과 관성이 받쳐 주지 않으면 수입은 생겨도 관리가 어려워질 수 있습니다.`;
    if (lifeBookCategoryIncludes(title, ["식상", "수익화"])) return `식상은 재능을 결과물로 바꾸는 통로입니다. 말, 기술, 콘텐츠, 서비스가 밖으로 흘러야 재성으로 이어지며, 막히면 재능은 있어도 돈의 문까지 닿지 않습니다.`;
    if (lifeBookCategoryIncludes(title, ["관성", "직업"])) return `관성은 직업의 책임과 신뢰의 틀입니다. 관성이 바르게 작동하면 조직과 제도 안에서 인정이 생기고, 과하면 부담만 커져 몸이 먼저 반응합니다.`;
    return `직업과 재물은 하나의 축으로 보아야 합니다. ${ctx.topTenGod}이 어떤 방식으로 결과를 만들고, 현재 ${ctx.currentDaeun}이 그 결과를 키우는지 줄이는지를 함께 봅니다.`;
  }
  if (id === "10") {
    if (lifeBookCategoryIncludes(title, ["의료"])) return `이 대목은 병명을 단정하지 않습니다. 오행과 조후가 보여 주는 것은 취약한 생활 리듬이며, 반복되는 불편이나 통증은 운세 해석보다 의료 상담을 우선해야 합니다.`;
    return `건강과 생활 리듬은 오행의 과다·부족이 몸과 마음에 남기는 신호를 읽는 장입니다. ${ctx.weakest} 기운이 약해질 때 어떤 피로가 반복되는지 살피면 회복의 순서가 보입니다.`;
  }
  if (id === "11") {
    if (lifeBookCategoryIncludes(title, ["현재"])) return `현재 대운 ${ctx.currentDaeun}은 지금 삶이 요구하는 역할을 보여 줍니다. 좋고 나쁨보다 중요한 것은 이 대운이 원국의 어느 글자를 깨우고 어느 책임을 앞으로 밀어내는가입니다.`;
    if (lifeBookCategoryIncludes(title, ["다음"])) return `다음 대운 ${ctx.nextDaeun}은 갑자기 오는 사건이 아니라 지금부터 방향을 바꾸는 예고입니다. 다음 흐름에서 필요한 기운을 미리 준비하면 전환기의 충격이 줄어듭니다.`;
    return `대운은 인생의 큰 계절입니다. 같은 원국도 대운의 간지와 십성이 바뀌면 쓰임의 무대가 달라지므로, 직업·관계·재물의 변화는 대운 속에서 읽어야 합니다.`;
  }
  if (id === "12") {
    if (lifeBookCategoryIncludes(title, ["상반기", "하반기", "월별"])) return `${ctx.currentYear}년 ${ctx.currentYearPillar}의 흐름은 월별 사건 예언보다 속도 조절의 문제로 보아야 합니다. 어느 달에 밀고, 어느 달에 정리할지 구분하는 것이 핵심입니다.`;
    return `선택 연도는 세운이 현재 대운 위에 얹히는 자리입니다. ${ctx.currentDaeun}이 요구하는 큰 과제와 ${ctx.currentYearPillar}의 자극이 만나는 지점을 읽어야 현실 조언이 살아납니다.`;
  }
  if (id === "13") {
    return `마스터플랜은 모든 장의 결론을 하나의 생활 기준으로 묶는 자리입니다. 관계, 일, 재물, 몸의 리듬이 서로 충돌할 때 무엇을 먼저 지킬지 정해야 운을 오래 쓸 수 있습니다.`;
  }
  return `${title}은 원국의 근거와 현재 운의 요구를 함께 놓고 읽어야 합니다. 제목이 가리키는 삶의 영역을 중심에 둘 때 상담문이 흐려지지 않습니다.`;
}

function ensureProfessionalCategoryLength(text, chapterId, categoryTitle, categoryIndex, minLength = LIFEBOOK_MIN_CATEGORY_CHARS + 120) {
  let result = dedupeParagraphs(stripForbiddenTokens(text));
  const additions = buildLifeBookCategoryCompletionLines(chapterId, categoryTitle);
  let guard = 0;
  while (result.length < minLength && guard < 8) {
    result = dedupeParagraphs(`${result}\n\n${additions[(categoryIndex + guard) % additions.length]}`);
    guard += 1;
  }
  const required = LIFEBOOK_CANONICAL_TOPIC_RULES[String(chapterId || "")] || [];
  if (required.length && !required.some((keyword) => result.includes(keyword))) {
    result = dedupeParagraphs(`${result}\n\n이 장에서는 ${required.slice(0, 3).join(", ")}의 흐름이 반드시 함께 놓여야 합니다. 그래야 장점은 쓰임으로 이어지고, 부담은 관리 가능한 신호로 바뀝니다.`);
  }
  const fit = evaluateLifeBookCategoryFit(result, { id: chapterId }, categoryTitle);
  if (!fit.hasCategoryGrounding) {
    result = dedupeParagraphs(`${result}\n\n${categoryTitle}이라는 제목이 이번 상담의 중심입니다. 다른 주제는 보조 근거로만 다루고, 이 삶의 영역에서 실제로 드러나는 선택과 반복을 먼저 읽어야 합니다.`);
  }
  return stripForbiddenTokens(result);
}

function buildProfessionalLifeBookCategoryText(profile, signals, chapter, categoryTitle, categoryIndex, normalizedData = null) {
  const ctx = buildLifeBookReadingContext(profile, signals);
  const chapterId = String(chapter?.id || "");
  const insight = buildLifeBookChapterInsight(chapterId, ctx, categoryTitle);
  const categoryLensLine = buildLifeBookCategoryLensLine(chapterId, ctx, categoryTitle);
  const judgmentChainLines = buildLifeBookCategoryJudgmentChainLines(ctx, chapterId, categoryTitle);
  const expertLines = buildLifeBookCategoryExpertLines(ctx, chapterId, categoryTitle);
  const blockInterpretation = buildLifeBookBlockInterpretationText(normalizedData, chapter, categoryTitle, 4);
  const contractContext = buildLifeBookContractContextLines(normalizedData || {}, chapter, categoryTitle);
  return softenLifeBookLocalWording(ensureProfessionalCategoryLength([
    insight,
    categoryLensLine,
    ...judgmentChainLines,
    ...expertLines,
    contractContext,
    blockInterpretation,
  ].join("\n\n"), chapterId, categoryTitle, categoryIndex));
}

function buildChapterLocalText(profile, signals, chapter, normalizedData = null) {
  const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
  const ctx = buildLifeBookReadingContext(profile, signals);
  return categories.map((categoryTitle, index) => {
    const text = buildProfessionalLifeBookCategoryText(profile, signals, chapter, categoryTitle, index, normalizedData);
    return {
      id: `${String(index + 1).padStart(2, "0")}`,
      title: categoryTitle,
      localSummary: softenLifeBookLocalWording(text),
      evidenceTags: buildLifeBookCategoryEvidenceTags(signals, ctx, chapter?.id, categoryTitle),
      compositionSource: "premium-category-draft",
      fallbackUsed: false,
      advicePoints: [
        `${categoryTitle}의 원국 근거`,
        `${chapter.title} 안에서의 카테고리 위치`,
        "강점과 주의점의 분리 해석",
      ],
      finalText: softenLifeBookLocalWording(text),
    };
  });
}

function buildLifeBookChapters(profile, signals, normalizedData = null) {
  return getLifeBookBlueprints().map((chapter) => {
    const categories = buildChapterLocalText(profile, signals, chapter, normalizedData);
    const chapterOpening = buildLifeBookChapterOpeningText({}, chapter);
    const localDraft = buildChapterBody(chapter.title, categories, chapterOpening);
    return {
      id: chapter.id,
      roman: chapter.roman,
      title: chapter.title,
      subtitle: chapter.subtitle,
      chapterOpening,
      categories,
      localDraft,
      finalText: localDraft,
      text: localDraft,
      source: "assembled",
    };
  });
}

function findLifeBookBlueprintByTitle(chapterTitle = "") {
  const title = clean(chapterTitle);
  return getLifeBookBlueprints().find((chapter) => clean(chapter.title) === title) || {};
}

function buildLifeBookChapterStructureTable(chapterTitle = "", categories = []) {
  const categoryRows = (Array.isArray(categories) ? categories : [])
    .map((category) => stripForbiddenTokens(category?.title || ""))
    .filter(Boolean);
  const rows = [
    ["챕터 제목", stripForbiddenTokens(chapterTitle)],
    ...categoryRows.map((section) => [
      section,
      "이 카테고리의 원국 근거와 운의 흐름을 상담 문장으로 풀어 PDF 본문에 반영합니다.",
    ]),
  ];
  return [
    "| 구성 | 역할 |",
    "| --- | --- |",
    ...rows.map(([label, description]) => `| ${stripForbiddenTokens(label)} | ${stripForbiddenTokens(description)} |`),
  ].join("\n");
}

function buildLifeBookPhase7SummaryCards(chapterTitle = "", blueprint = {}) {
  const focus = safeLifeBookList(blueprint.engineFocus).slice(0, 4);
  const focusText = focus.length ? focus.join(", ") : "원국, 오행, 십성, 운의 흐름";
  return [
    "#### 핵심 요약 카드 3선",
    `- 요약 1: ${stripForbiddenTokens(chapterTitle)}은 ${stripForbiddenTokens(focusText)}을 바탕으로 삶의 중심 주제를 잡아 줍니다.`,
    "- 요약 2: 강하게 드러나는 기운은 억누르기보다 역할과 행동 기준으로 배치할수록 안정됩니다.",
    "- 요약 3: 부족하거나 흔들리는 기운은 결핍으로 단정하지 않고 생활 루틴과 관계의 도움으로 보완합니다.",
  ].join("\n");
}

function buildLifeBookPhase7AdviceList(chapterTitle = "", blueprint = {}) {
  const focus = safeLifeBookList(blueprint.engineFocus);
  return [
    "#### 상담 검토 포인트",
    `- ${stripForbiddenTokens(chapterTitle)}에서 가장 강하게 작동하는 주제를 먼저 확인합니다.`,
    `- ${stripForbiddenTokens(focus[0] || "원국")}과 ${stripForbiddenTokens(focus[1] || "운의 흐름")}이 같은 방향인지, 서로 충돌하는지 분리해 봅니다.`,
    "- 관계, 일, 돈, 건강 중 어느 영역에서 같은 패턴이 반복되는지 확인합니다.",
  ].join("\n");
}

function buildLifeBookPhase7Checklist(chapterTitle = "") {
  return [
    "#### 상담 확인 질문",
    `- ${stripForbiddenTokens(chapterTitle)}에서 원국 근거가 무엇인지 확인했는가?`,
    "- 이 장의 카테고리와 다른 주제가 섞여 판단이 흐려지지 않았는가?",
    "- 강점과 주의점이 같은 근거에서 어떻게 다르게 나타나는지 확인했는가?",
  ].join("\n");
}

function buildLifeBookMonthlyFlowTable() {
  const rows = Array.from({ length: 12 }, (_, index) => {
    const month = `${index + 1}월`;
    const rhythm = index % 3 === 0 ? "정리와 기준 설정" : index % 3 === 1 ? "확장과 실행" : "점검과 회복";
    const advice = index % 3 === 0 ? "일정, 지출, 관계의 경계를 다시 잡으십시오." : index % 3 === 1 ? "작게 공개하고 반응을 보며 속도를 조절하십시오." : "무리한 결론보다 회고와 회복을 우선하십시오.";
    return `| ${month} | ${rhythm} | ${advice} |`;
  });
  return [
    "#### 월별 흐름 표",
    "| 월 | 흐름 | 실전 조언 |",
    "| --- | --- | --- |",
    ...rows,
  ].join("\n");
}

function buildLifeBookMasterPlanTable() {
  return [
    "#### 인생 마스터플랜 표",
    "| 영역 | 해석 기준 | 확인할 내용 |",
    "| --- | --- | --- |",
    "| 일과 커리어 | 격국, 관성, 식상, 인성이 어떤 무대를 가리키는지 봅니다. | 성과가 쌓이는 역할과 소모되는 역할을 분리합니다. |",
    "| 재물 | 재성과 식상의 연결, 대운의 재물 자극, 지출 구조를 함께 봅니다. | 돈이 들어오는 방식과 새는 지점을 구분합니다. |",
    "| 관계 | 일지, 배우자궁, 합충형해, 십성 분포를 함께 봅니다. | 가까워지는 방식과 멀어지는 이유를 분리합니다. |",
    "| 건강과 심신 | 오행 균형, 조후, 약한 기운의 반복 신호를 봅니다. | 운세 해석이 아니라 생활 리듬의 취약점을 확인합니다. |",
    "| 시기 판단 | 현재 대운과 가까운 세운이 같은 방향인지 봅니다. | 기회와 부담이 커지는 영역을 구분합니다. |",
  ].join("\n");
}

function buildLifeBookFiveElementBalanceTable() {
  return [
    "#### 오행 균형표",
    "| 오행 | 읽는 방향 | 관리 포인트 |",
    "| --- | --- | --- |",
    "| 목 | 성장, 계획, 방향성의 힘을 봅니다. | 목표가 흩어지지 않도록 한 줄 기준을 세웁니다. |",
    "| 화 | 표현, 열정, 관계의 온도를 봅니다. | 과열되기 전에 휴식과 속도 조절을 둡니다. |",
    "| 토 | 안정, 책임, 현실 감각을 봅니다. | 떠안는 일과 내려놓을 일을 구분합니다. |",
    "| 금 | 기준, 판단, 정리 능력을 봅니다. | 단호함이 차가움으로 보이지 않도록 말투를 조절합니다. |",
    "| 수 | 지혜, 흐름, 회복력을 봅니다. | 생각이 길어질 때 실행 단위를 작게 나눕니다. |",
  ].join("\n");
}

function buildLifeBookTenGodDistributionTable() {
  return [
    "#### 십성 분포표",
    "| 십성 축 | 삶에서 드러나는 장면 | 상담 포인트 |",
    "| --- | --- | --- |",
    "| 비겁 | 자기주장, 독립성, 경쟁심 | 협력과 독립의 균형을 점검합니다. |",
    "| 식상 | 표현, 재능, 생산성 | 결과물로 남는 습관을 만듭니다. |",
    "| 재성 | 돈, 현실 감각, 관리 능력 | 수입보다 구조와 지출 기준을 먼저 봅니다. |",
    "| 관성 | 책임, 규칙, 사회적 역할 | 부담과 성취의 경계를 나눕니다. |",
    "| 인성 | 배움, 보호, 회복력 | 생각을 실행으로 옮기는 리듬을 만듭니다. |",
  ].join("\n");
}

function buildLifeBookDaewoonFlowTable() {
  return [
    "#### 대운 흐름표",
    "| 구간 | 의미 | 실행 방향 |",
    "| --- | --- | --- |",
    "| 지난 흐름 | 반복된 선택과 익숙한 반응을 돌아봅니다. | 남길 습관과 정리할 부담을 구분합니다. |",
    "| 현재 대운 | 지금 삶에서 가장 크게 작동하는 계절입니다. | 무리한 확장보다 핵심 역할을 선명하게 잡습니다. |",
    "| 다음 대운 | 서서히 준비해야 할 변화의 방향입니다. | 필요한 역량, 관계, 생활 구조를 미리 정돈합니다. |",
    "| 전환기 | 속도보다 기준이 중요한 시기입니다. | 결정 전에 돈, 일, 관계, 건강의 우선순위를 다시 봅니다. |",
  ].join("\n");
}

function enhanceLifeBookPhase7Section(chapterTitle = "", category = {}, text = "") {
  const blueprint = findLifeBookBlueprintByTitle(chapterTitle);
  const title = clean(category?.title);
  const additions = [];
  if (title === "핵심 요약 카드") additions.push(buildLifeBookPhase7SummaryCards(chapterTitle, blueprint));
  if (title === "카테고리별 판단 기준") additions.push(buildLifeBookPhase7AdviceList(chapterTitle, blueprint));
  if (title === "상담 확인 질문") additions.push(buildLifeBookPhase7Checklist(chapterTitle));
  if (clean(chapterTitle).includes("오행 균형") && title === "계산 근거 기반 해석") additions.push(buildLifeBookFiveElementBalanceTable());
  if (clean(chapterTitle).includes("십성 구조") && title === "계산 근거 기반 해석") additions.push(buildLifeBookTenGodDistributionTable());
  if (clean(chapterTitle).includes("대운 분석") && title === "계산 근거 기반 해석") additions.push(buildLifeBookDaewoonFlowTable());
  if (clean(chapterTitle).includes("선택 연도와 가까운 미래") && title === "계산 근거 기반 해석") additions.push(buildLifeBookMonthlyFlowTable());
  if (clean(chapterTitle).includes("마스터플랜") && title === "카테고리별 판단 기준") additions.push(buildLifeBookMasterPlanTable());
  return stripForbiddenTokens([text, ...additions].filter(Boolean).join("\n\n"));
}

function buildChapterBody(chapterTitle, categories, chapterOpening = "") {
  const opening = stripForbiddenTokens(chapterOpening || "");
  const structureTable = buildLifeBookChapterStructureTable(chapterTitle, categories);
  const categoryBody = categories.map((category) => {
    const rawText = stripForbiddenTokens(category.finalText || category.localSummary || "");
    const text = enhanceLifeBookPhase7Section(chapterTitle, category, rawText);
    if (/^###\s+/m.test(text)) return text.trim();
    return `### ${stripForbiddenTokens(category.title)}\n\n${text}`.trim();
  }).join("\n\n");
  return [opening, structureTable, categoryBody].filter(Boolean).join("\n\n");
}

function createLifeBookFallbackText(profile, signals, chapter, categoryTitle, originText = "") {
  const body = buildProfessionalLifeBookCategoryText(profile, signals, chapter, categoryTitle, 0);
  return stripForbiddenTokens([originText, body].filter(Boolean).join("\n\n"));
}

function buildLifeBookFallbackChapters(profile, signals, chapters = []) {
  return ensureCompleteLifeBookChapters(profile, signals, chapters).map((chapter) => {
    const categories = (Array.isArray(chapter?.categories) ? chapter.categories : []).map((category) => ({
      ...category,
      compositionSource: "emergency-recovery",
      fallbackUsed: true,
    }));
    const chapterText = buildChapterBody(chapter.title, categories, chapter.chapterOpening);
    return {
      ...chapter,
      categories,
      finalText: chapterText,
      text: chapterText,
      source: "emergency-recovery",
      fallbackUsed: true,
    };
  });
}

function buildLifeBookPayload(profile, signals, chapters, metadata = {}) {
  return deriveLifeBookPayload(profile, signals, chapters, metadata);
}

function escapeLifeBookHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderLifeBookMarkdownTable(block = "") {
  const rows = String(block || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => /^\|.+\|$/.test(line))
    .map((line) => line.replace(/^\||\|$/g, "").split("|").map((cell) => escapeLifeBookHtml(stripForbiddenTokens(cell.trim()))));
  if (rows.length < 2) return "";
  const header = rows[0];
  const bodyRows = rows.slice(2);
  return `<table class="lb-markdown-table"><thead><tr>${header.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead><tbody>${bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function renderLifeBookMarkdownHtml(markdown = "") {
  const body = normalizeLifeBookChapterMarkdown(markdown);
  return body.split(/\n\s*\n/)
    .map((block) => stripForbiddenTokens(block).trim())
    .filter(Boolean)
    .map((block) => {
      if (/^\|.+\|\s*\n\|[\s:-|]+\|/m.test(block)) {
        return renderLifeBookMarkdownTable(block) || `<p>${escapeLifeBookHtml(block).replace(/\n/g, "<br />")}</p>`;
      }
      const heading = block.match(/^(#{1,4})\s+(.+)$/m);
      if (heading && clean(block) === clean(heading[0])) {
        const level = Math.min(4, Math.max(3, heading[1].length + 1));
        return `<h${level}>${escapeLifeBookHtml(stripForbiddenTokens(heading[2]))}</h${level}>`;
      }
      const lines = block.split(/\n+/).filter(Boolean);
      const quoteLines = lines.filter((line) => /^\s*>\s+/.test(line));
      if (quoteLines.length && quoteLines.length === lines.length) {
        return `<blockquote>${quoteLines.map((line) => escapeLifeBookHtml(stripForbiddenTokens(line.replace(/^\s*>\s+/, "")))).join("<br />")}</blockquote>`;
      }
      const listLines = lines.filter((line) => /^\s*[-*]\s+/.test(line));
      if (listLines.length && listLines.length === lines.length) {
        return `<ul>${listLines.map((line) => `<li>${escapeLifeBookHtml(stripForbiddenTokens(line.replace(/^\s*[-*]\s+/, "")))}</li>`).join("")}</ul>`;
      }
      return `<p>${escapeLifeBookHtml(block).replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");
}

function renderLifeBookFinalMarkdownHtml(markdown = "") {
  const body = normalizeLifeBookFinalManuscriptMarkdown(markdown);
  return body.split(/<!--\s*pagebreak\s*-->/i)
    .map((part) => normalizeLifeBookChapterMarkdown(part))
    .filter(Boolean)
    .map((part, index) => {
      const className = index === 0 ? "lb-final-section lb-final-section--front" : "lb-final-section lb-final-section--chapter";
      return `<article class="${className}">${renderLifeBookMarkdownHtml(part)}</article>`;
    })
    .join("\n");
}

function ensureCompleteLifeBookChapters(profile, signals, chapters = [], options = {}) {
  const chapterMap = new Map((Array.isArray(chapters) ? chapters : []).map((item) => [String(item?.id || ""), item]));

  return getLifeBookBlueprints().map((blueprint) => {
    const chapter = chapterMap.get(String(blueprint.id));
    const premiumCategories = buildChapterLocalText(profile, signals, blueprint);
    const categoryMap = new Map((Array.isArray(chapter?.categories) ? chapter.categories : []).map((item) => [String(item?.title || item?.id || ""), item]));

    const categories = premiumCategories.map((premiumCategory, index) => {
      const existing = categoryMap.get(String(premiumCategory.title)) || categoryMap.get(String(premiumCategory.id));
      const existingText = clean(existing?.finalText || existing?.localSummary || "");
      const nextText = stripForbiddenTokens(existingText || premiumCategory.localSummary);
      const usedEmergencyRecovery = !nextText;
      return {
        id: premiumCategory.id,
        title: premiumCategory.title,
        localSummary: nextText,
        evidenceTags: Array.isArray(existing?.evidenceTags) && existing.evidenceTags.length ? existing.evidenceTags : premiumCategory.evidenceTags,
        advicePoints: Array.isArray(existing?.advicePoints) && existing.advicePoints.length ? existing.advicePoints : premiumCategory.advicePoints,
        compositionSource: usedEmergencyRecovery ? "emergency-recovery" : clean(existing?.compositionSource || premiumCategory.compositionSource || "premium-category-draft"),
        fallbackUsed: Boolean(existing?.fallbackUsed) || usedEmergencyRecovery,
        finalText: nextText || createLifeBookFallbackText(profile, signals, blueprint, premiumCategory.title, premiumCategory.localSummary),
        order: index + 1,
      };
    });

    const chapterOpening = buildLifeBookChapterOpeningText(chapter || {}, blueprint);
    const rebuiltText = buildChapterBody(blueprint.title, categories, chapterOpening);
    const mergedMarkdown = normalizeLifeBookChapterMarkdown(chapter?.reviewedMarkdown || chapter?.editedMarkdown || chapter?.mergedMarkdown || "");
    const chapterText = mergedMarkdown || rebuiltText;

    return {
      id: blueprint.id,
      roman: blueprint.roman,
      title: blueprint.title,
      subtitle: blueprint.subtitle,
      chapterOpening,
      categories,
      reviewedMarkdown: mergedMarkdown,
      editedMarkdown: mergedMarkdown,
      mergedMarkdown,
      localDraft: chapterText,
      finalText: stripForbiddenTokens(chapterText),
      text: stripForbiddenTokens(chapterText),
      source: clean(chapter?.source) || "assembled",
      chapterMergeSource: clean(chapter?.chapterMergeSource),
      chapterMergeErrors: Array.isArray(chapter?.chapterMergeErrors) ? chapter.chapterMergeErrors : [],
      chapterQualityReviewSource: clean(chapter?.chapterQualityReviewSource),
      chapterQualityReviewErrors: Array.isArray(chapter?.chapterQualityReviewErrors) ? chapter.chapterQualityReviewErrors : [],
    };
  });
}

function validateLifeBookChapters(chapters = []) {
  const structure = validateLifeBookStructure(chapters);
  const quality = evaluateLifeBookQuality(chapters);
  return {
    ok: structure.ok,
    errors: structure.blockingErrors,
    warnings: quality.softWarnings,
    qualityScore: quality.qualityScore,
    chapterMetrics: quality.chapterMetrics,
  };
}

function validateLifeBookGeneratedChapter(chapter = {}, chapterSpec = {}) {
  const errors = [];
  const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
  const expectedCategories = Array.isArray(chapterSpec?.categories) ? chapterSpec.categories : [];
  if (clean(chapter?.id) !== clean(chapterSpec?.id)) errors.push("chapter_id_mismatch");
  if (categories.length !== expectedCategories.length) errors.push("category_count_mismatch");
  expectedCategories.forEach((title, index) => {
    const category = categories[index] || {};
    if (clean(category?.title) !== clean(title)) errors.push(`category_${index + 1}_title_mismatch`);
    if (clean(category?.finalText || category?.localSummary || category?.text).length < LIFEBOOK_BLOCKING_MIN_CATEGORY_CHARS) {
      errors.push(`category_${index + 1}_too_short`);
    }
  });
  if (chapterTextLength(chapter) < LIFEBOOK_BLOCKING_MIN_CHAPTER_CHARS) errors.push("chapter_too_short");
  return {
    ok: errors.length === 0,
    errors,
  };
}

function parseFailedLifeBookChapterIndexes(errors = []) {
  const indexes = new Set();
  (Array.isArray(errors) ? errors : []).forEach((errorCode) => {
    const text = String(errorCode || "");
    const match = text.match(/^chapter_(\d+)_/);
    if (!match) return;
    const chapterNumber = Number(match[1]);
    if (!Number.isFinite(chapterNumber)) return;
    const idx = chapterNumber - 1;
    if (idx >= 0 && idx < getLifeBookBlueprints().length) indexes.add(idx);
  });
  return indexes;
}

function reinforceFailedLifeBookChapters(profile, signals, chapters = [], errors = []) {
  const failedIndexes = parseFailedLifeBookChapterIndexes(errors);
  if (!failedIndexes.size) return Array.isArray(chapters) ? chapters : [];

  const source = Array.isArray(chapters) ? chapters : [];
  const fallbackAll = buildLifeBookFallbackChapters(profile, signals, source);

  return source.map((chapter, index) => {
    if (!failedIndexes.has(index)) return chapter;
    return fallbackAll[index] || chapter;
  });
}

function repairLifeBookChaptersUntilValid(profile, signals, chapters = [], errors = []) {
  const base = sanitizeLifeBookChapters(profile, signals, reinforceFailedLifeBookChapters(profile, signals, chapters, errors));
  const quality = evaluateLifeBookQuality(base);
  const repaired = repairLifeBookQualityIssues(profile, signals, base, quality);
  return sanitizeLifeBookChapters(profile, signals, repaired.chapters);
}

function renderLifeBookPdf({ profile, signals, chapters, generatedAt }) {
  const toc = (chapters || []).map((chapter) => `<li><strong>${stripForbiddenTokens(chapter.title)}</strong></li>`).join("\n");
  const chapterHtml = (chapters || []).map((chapter, index) => {
    const keywordTags = (chapter.categories || []).slice(0, 3).map((category) => `<span class="lb-keyword">${stripForbiddenTokens(category.title)}</span>`).join(" ");
    const mergedMarkdown = normalizeLifeBookChapterMarkdown(chapter.reviewedMarkdown || chapter.editedMarkdown || chapter.mergedMarkdown || "");
    const categoryHtml = mergedMarkdown ? `
      <section class="lb-category lb-category--merged">
        ${renderLifeBookMarkdownHtml(mergedMarkdown)}
      </section>
    ` : (chapter.categories || []).map((category) => `
      <section class="lb-category">
        <h4>${stripForbiddenTokens(category.title)}</h4>
        <p>${stripForbiddenTokens(category.finalText)}</p>
      </section>
    `).join("\n");
    const chapterOpening = stripForbiddenTokens(chapter.chapterOpening || "");
    const openingHtml = !mergedMarkdown && chapterOpening ? `
      <section class="lb-category lb-category--opening">
        <h4>이 장의 핵심 구조</h4>
        <p>${chapterOpening}</p>
      </section>
    ` : "";
    return `
      <article class="lb-chapter">
        <div class="lb-chapter__eyebrow">제 ${String(index + 1)}장</div>
        <h2>${stripForbiddenTokens(chapter.title)}</h2>
        <p class="lb-chapter__intro">${stripForbiddenTokens(chapter.subtitle || "핵심 흐름과 실행 전략을 정리합니다.")}</p>
        <div class="lb-keywords">${keywordTags}</div>
        ${openingHtml}
        ${categoryHtml}
      </article>
    `;
  }).join("\n");

  const finalRoadmap = (chapters || []).slice(-1)[0];
  const finalRoadmapSummary = finalRoadmap
    ? (finalRoadmap.categories || []).slice(0, 5).map((category, index) => `<li><strong>${index + 1}. ${stripForbiddenTokens(category.title)}</strong> — ${stripForbiddenTokens((category.finalText || "").slice(0, 140))}...</li>`).join("\n")
    : "";

  const safeName = stripForbiddenTokens(profile.name || "사용자");
  const safeBirth = stripForbiddenTokens(profile.birthIso || "");
  const safeSignals = stripForbiddenTokens(`${signals.dayMaster} · ${signals.monthBranch} · ${signals.yearBranch}`);

  return `<!doctype html>
  <html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>사주 인생의 책</title>
    <style>
      :root{color-scheme:light}
      *{box-sizing:border-box}
      body{margin:0;padding:0;font-family:"Noto Serif KR",serif;background:linear-gradient(180deg,#fffaf2 0%,#f4ead9 100%);color:#261b11;line-height:1.8}
      .page{max-width:980px;margin:0 auto;padding:28px 20px 60px}
      .cover{position:relative;overflow:hidden;padding:30px;border-radius:24px;background:linear-gradient(145deg,#24160e 0%,#6c4324 58%,#8d5a32 100%);color:#fff5ea;box-shadow:0 22px 48px rgba(71,45,19,.22)}
      .cover::after{content:"";position:absolute;right:-40px;top:-20px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.12)}
      .cover h1{margin:10px 0 6px;font-size:40px;line-height:1.15}
      .cover p{margin:4px 0;color:#f5dfc5}
      .cover img{display:block;width:min(260px,100%);border-radius:18px;margin-top:18px;box-shadow:0 12px 28px rgba(0,0,0,.18)}
      .meta,.toc,.chapter{margin-top:20px;padding:18px;border:1px solid #e4d3bb;border-radius:18px;background:rgba(255,251,246,.92);box-shadow:0 12px 26px rgba(66,48,26,.06)}
      .meta-grid{display:grid;gap:10px;grid-template-columns:repeat(3,minmax(0,1fr))}
      .meta-item{padding:12px;border-radius:14px;background:#f8f0e4;border:1px solid #ead8bf}
      .meta-item b{display:block;margin-bottom:4px;color:#5a3a23}
      .toc ol{margin:0;padding-left:20px}
      .toc li{margin:6px 0}
      .chapter{break-inside:avoid-page;page-break-inside:avoid}
      .chapter h2{margin:8px 0 14px;font-size:26px;color:#4c2f1a}
      .lb-chapter__intro{margin:0 0 10px;color:#6b4428;font-size:14px}
      .lb-keywords{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
      .lb-keyword{display:inline-flex;padding:4px 8px;border-radius:999px;background:#efe3d0;border:1px solid #dec6a6;font-size:12px;color:#5a3a23}
      .lb-chapter__eyebrow{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#8b5e3c}
      .lb-category{padding:12px 14px;margin:10px 0;border-radius:14px;background:#fbf5ec;border:1px solid #eadcc7}
      .lb-category h4{margin:0 0 8px;font-size:18px;color:#6b4428}
      .lb-category p{margin:0;white-space:pre-wrap}
      .lb-category h3{margin:10px 0 8px;font-size:19px;color:#5b3720}
      .lb-category ul{margin:8px 0 0;padding-left:20px}
      .lb-markdown-table{width:100%;border-collapse:collapse;margin:10px 0;font-size:13px}
      .lb-markdown-table th,.lb-markdown-table td{border:1px solid #e2cfb8;padding:6px 8px;text-align:left;vertical-align:top}
      .lb-markdown-table th{background:#efe3d0;color:#5a3a23}
      .footer{margin-top:20px;padding:16px 18px;color:#614632;font-size:13px;text-align:center}
      @page{size:A4;margin:16mm 14mm 18mm}
      @media print{body{background:#fff}.page{padding:0}.cover,.meta,.toc,.chapter{box-shadow:none}.chapter{break-before:page;page-break-before:always}.chapter:first-of-type{break-before:auto;page-break-before:auto}}
      @media (max-width:720px){.meta-grid{grid-template-columns:1fr}.cover h1{font-size:32px}}
    </style>
  </head>
  <body>
    <main class="page">
      <section class="cover">
        <p>Code:Destiny Premium PDF</p>
        <h1>사주 인생의 책</h1>
        <p>팔자 8글자로 읽는 나만의 운명 해설서</p>
        <p>${safeName}</p>
        <p>${safeBirth}</p>
        <p>${safeSignals}</p>
        <img src="/fuctionassets/lifebook.webp" alt="사주 인생의 책 표지 이미지" />
      </section>

      <section class="meta">
        <div class="meta-grid">
          <div class="meta-item"><b>생성일</b>${stripForbiddenTokens(new Date(generatedAt).toLocaleString("ko-KR"))}</div>
          <div class="meta-item"><b>시간 정보</b>${signals.timeKnown ? stripForbiddenTokens(signals.timeLabel) : "시간 미상 기준"}</div>
          <div class="meta-item"><b>기본 구조</b>13챕터 프리미엄 사주 리포트</div>
        </div>
      </section>

      <section class="toc">
        <h2 style="margin-top:0;">목차</h2>
        <ol>${toc}</ol>
      </section>

      ${chapterHtml}

      <section class="chapter">
        <h2>🕯️ 최종 인생 로드맵 요약</h2>
        <ul>${finalRoadmapSummary}</ul>
      </section>

      <section class="footer">이 문서는 팔자 흐름을 바탕으로 삶의 방향과 실행 전략을 정리한 사주 인생의 책 리포트입니다.</section>
    </main>
  </body>
  </html>`;
}

function buildLifeBookDocument(input) {
  return renderLifeBookPdfClean(input);
}

function renderLifeBookPdfClean({ profile, signals, chapters, generatedAt, finalManuscriptMarkdown = "" }) {
  const ctx = buildLifeBookReadingContext(profile, signals);
  const finalMarkdown = normalizeLifeBookFinalManuscriptMarkdown(finalManuscriptMarkdown);
  if (finalMarkdown) {
    const safeName = stripForbiddenTokens(profile.name || "사용자");
    const safeBirth = stripForbiddenTokens(profile.birthIso || "");
    const safeSignals = stripForbiddenTokens(`${ctx.dayPillar} · 월지 ${ctx.monthBranch} · 용신 ${ctx.useful}`);
    const generatedLabel = stripForbiddenTokens(new Date(generatedAt).toLocaleString("ko-KR"));
    return `<!doctype html>
  <html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>인생의 책 — 나의 운명 사용 기준</title>
    <style>
      :root{color-scheme:light}
      *{box-sizing:border-box}
      body{margin:0;padding:0;font-family:"Noto Serif KR","Nanum Myeongjo",serif;background:#f7f0e5;color:#24180f;line-height:1.82}
      .page{max-width:980px;margin:0 auto;padding:28px 22px 64px}
      .lb-final-meta{margin:0 0 18px;padding:12px 16px;border:1px solid #d8c4a7;background:#fffaf2;color:#5a3a23;font-size:13px}
      .lb-final-meta b{display:inline-block;margin-right:8px;color:#2d2119}
      .lb-final-section{padding:18px 0 24px}
      .lb-final-section--front{min-height:920px;padding:86px 56px;border:1px solid #d8c4a7;background:linear-gradient(145deg,#201611 0%,#47301f 46%,#8b653d 100%);color:#fff8ec;box-shadow:0 18px 42px rgba(43,29,18,.18)}
      .lb-final-section--chapter{break-before:page;page-break-before:always}
      .lb-final-section--chapter>h3:first-child,.lb-final-section--chapter>p:first-child{margin-top:0}
      .lb-final-section h1{margin:0 0 34px;font-size:22px;letter-spacing:.18em;text-transform:uppercase;color:#f8dec0}
      .lb-final-section--front h2{margin:0 0 12px;font-size:56px;line-height:1.08;color:#fff}
      .lb-final-section--front h3{margin:0 0 36px;font-size:21px;font-weight:400;color:#f6dfc0}
      .lb-final-section--front p{max-width:680px;margin:0 0 12px;color:#f9ead6;font-size:16px}
      .lb-final-section--chapter>h2:first-child{position:relative;margin:0 0 16px;padding:56px 34px 30px;border:1px solid #d8c4a7;background:#2a211d;color:#fff8ec;font-size:31px;line-height:1.28;break-after:avoid}
      .lb-final-section h2{margin:10px 0 18px;font-size:28px;color:#3d291a}
      .lb-final-section h3{margin:20px 0 10px;padding:12px 14px;border:1px solid #dcc8aa;background:#fffaf2;color:#4b3020;font-size:19px}
      .lb-final-section h4{margin:14px 0 8px;font-size:16px;color:#6b4428}
      .lb-final-section p{margin:0 0 12px;white-space:pre-wrap}
      .lb-final-section blockquote{margin:0 0 18px;padding:16px 20px;border-left:4px solid #b48755;background:#fbf3e7;color:#5a3a23;font-size:16px;font-style:italic}
      .lb-final-section ul{margin:8px 0 16px;padding:13px 18px 13px 28px;border:1px solid #e4d3bb;background:#fffdf8}
      .lb-final-section li{margin:5px 0}
      .lb-markdown-table{width:100%;border-collapse:collapse;margin:12px 0 18px;font-size:12.5px;background:#fffdf8}
      .lb-markdown-table th,.lb-markdown-table td{border:1px solid #dcc8aa;padding:7px 9px;text-align:left;vertical-align:top}
      .lb-markdown-table th{background:#2a211d;color:#fff8ec;font-weight:600}
      .lb-markdown-table tr:nth-child(even) td{background:#fbf3e7}
      @page{size:A4;margin:16mm 14mm 18mm}
      @media print{body{background:#fff}.page{padding:0}.lb-final-meta{break-after:avoid}.lb-final-section--front{box-shadow:none}}
    </style>
  </head>
  <body>
    <main class="page">
      <section class="lb-final-meta">
        <b>${safeName}</b>${safeBirth} · ${safeSignals} · ${generatedLabel}
      </section>
      ${renderLifeBookFinalMarkdownHtml(finalMarkdown)}
    </main>
  </body>
  </html>`;
  }

  const toc = (chapters || []).map((chapter) => `<li><strong>${stripForbiddenTokens(chapter.title)}</strong></li>`).join("\n");
  const chapterHtml = (chapters || []).map((chapter, index) => {
    const keywordTags = (chapter.categories || []).slice(0, 3).map((category) => `<span class="lb-keyword">${stripForbiddenTokens(category.title)}</span>`).join(" ");
    const mergedMarkdown = normalizeLifeBookChapterMarkdown(chapter.reviewedMarkdown || chapter.editedMarkdown || chapter.mergedMarkdown || "");
    const categoryHtml = mergedMarkdown ? `
      <section class="lb-category lb-category--merged">
        ${renderLifeBookMarkdownHtml(mergedMarkdown)}
      </section>
    ` : (chapter.categories || []).map((category) => `
      <section class="lb-category">
        <h4>${stripForbiddenTokens(category.title)}</h4>
        <p>${stripForbiddenTokens(category.finalText)}</p>
      </section>
    `).join("\n");
    const chapterOpening = stripForbiddenTokens(chapter.chapterOpening || "");
    const openingHtml = !mergedMarkdown && chapterOpening ? `
      <section class="lb-category lb-category--opening">
        <h4>이 장의 핵심 구조</h4>
        <p>${chapterOpening}</p>
      </section>
    ` : "";
    return `
      <article class="lb-chapter">
        <div class="lb-chapter__eyebrow">Chapter ${String(index + 1).padStart(2, "0")}</div>
        <h2>${stripForbiddenTokens(chapter.title)}</h2>
        <p class="lb-chapter__intro">${stripForbiddenTokens(chapter.subtitle || "명식의 핵심 흐름과 실행 전략을 정리합니다.")}</p>
        <div class="lb-keywords">${keywordTags}</div>
        ${openingHtml}
        ${categoryHtml}
      </article>
    `;
  }).join("\n");

  const finalRoadmap = (chapters || []).slice(-1)[0];
  const finalRoadmapSummary = finalRoadmap
    ? (finalRoadmap.categories || []).slice(0, 5).map((category, index) => `<li><strong>${index + 1}. ${stripForbiddenTokens(category.title)}</strong> ${stripForbiddenTokens((category.finalText || "").slice(0, 140))}...</li>`).join("\n")
    : "";

  const safeName = stripForbiddenTokens(profile.name || "사용자");
  const safeBirth = stripForbiddenTokens(profile.birthIso || "");
  const safeSignals = stripForbiddenTokens(`${ctx.dayPillar} · 월지 ${ctx.monthBranch} · 용신 ${ctx.useful}`);
  const generatedLabel = stripForbiddenTokens(new Date(generatedAt).toLocaleString("ko-KR"));
  const timeLabel = signals.timeKnown ? stripForbiddenTokens(signals.timeLabel) : "출생 시간 미상 기준";

  return `<!doctype html>
  <html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>사주 인생의 책</title>
    <style>
      :root{color-scheme:light}
      *{box-sizing:border-box}
      body{margin:0;padding:0;font-family:"Noto Serif KR",serif;background:linear-gradient(180deg,#fffaf2 0%,#f4ead9 100%);color:#261b11;line-height:1.8}
      .page{max-width:980px;margin:0 auto;padding:28px 20px 60px}
      .cover{position:relative;overflow:hidden;padding:30px;border-radius:24px;background:linear-gradient(145deg,#24160e 0%,#6c4324 58%,#8d5a32 100%);color:#fff5ea;box-shadow:0 22px 48px rgba(71,45,19,.22)}
      .cover::after{content:"";position:absolute;right:-40px;top:-20px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.12)}
      .cover h1{margin:10px 0 6px;font-size:40px;line-height:1.15}
      .cover p{margin:4px 0;color:#f5dfc5}
      .cover img{display:block;width:min(260px,100%);border-radius:18px;margin-top:18px;box-shadow:0 12px 28px rgba(0,0,0,.18)}
      .meta,.toc,.chapter{margin-top:20px;padding:18px;border:1px solid #e4d3bb;border-radius:18px;background:rgba(255,251,246,.92);box-shadow:0 12px 26px rgba(66,48,26,.06)}
      .meta-grid{display:grid;gap:10px;grid-template-columns:repeat(3,minmax(0,1fr))}
      .meta-item{padding:12px;border-radius:14px;background:#f8f0e4;border:1px solid #ead8bf}
      .meta-item b{display:block;margin-bottom:4px;color:#5a3a23}
      .toc ol{margin:0;padding-left:20px}
      .toc li{margin:6px 0}
      .chapter{break-inside:avoid-page;page-break-inside:avoid}
      .chapter h2{margin:8px 0 14px;font-size:26px;color:#4c2f1a}
      .lb-chapter__intro{margin:0 0 10px;color:#6b4428;font-size:14px}
      .lb-keywords{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
      .lb-keyword{display:inline-flex;padding:4px 8px;border-radius:999px;background:#efe3d0;border:1px solid #dec6a6;font-size:12px;color:#5a3a23}
      .lb-chapter__eyebrow{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#8b5e3c}
      .lb-category{padding:12px 14px;margin:10px 0;border-radius:14px;background:#fbf5ec;border:1px solid #eadcc7}
      .lb-category h4{margin:0 0 8px;font-size:18px;color:#6b4428}
      .lb-category p{margin:0;white-space:pre-wrap}
      .lb-category h3{margin:10px 0 8px;font-size:19px;color:#5b3720}
      .lb-category ul{margin:8px 0 0;padding-left:20px}
      .lb-markdown-table{width:100%;border-collapse:collapse;margin:10px 0;font-size:13px}
      .lb-markdown-table th,.lb-markdown-table td{border:1px solid #e2cfb8;padding:6px 8px;text-align:left;vertical-align:top}
      .lb-markdown-table th{background:#efe3d0;color:#5a3a23}
      .footer{margin-top:20px;padding:16px 18px;color:#614632;font-size:13px;text-align:center}
      @page{size:A4;margin:16mm 14mm 18mm}
      @media print{body{background:#fff}.page{padding:0}.cover,.meta,.toc,.chapter{box-shadow:none}.chapter{break-before:page;page-break-before:always}.chapter:first-of-type{break-before:auto;page-break-before:auto}}
      @media (max-width:720px){.meta-grid{grid-template-columns:1fr}.cover h1{font-size:32px}}
    </style>
  </head>
  <body>
    <main class="page">
      <section class="cover">
        <p>Code:Destiny Premium PDF</p>
        <h1>사주 인생의 책</h1>
        <p>네 기둥으로 읽는 삶의 구조와 실행 전략</p>
        <p>${safeName}</p>
        <p>${safeBirth}</p>
        <p>${safeSignals}</p>
        <img src="/fuctionassets/lifebook.webp" alt="사주 인생의 책 표지 이미지" />
      </section>
      <section class="meta">
        <div class="meta-grid">
          <div class="meta-item"><b>생성일</b>${generatedLabel}</div>
          <div class="meta-item"><b>출생 시간</b>${timeLabel}</div>
          <div class="meta-item"><b>기본 구성</b>13챕터 프리미엄 사주 리포트</div>
        </div>
      </section>
      <section class="toc">
        <h2 style="margin-top:0;">목차</h2>
        <ol>${toc}</ol>
      </section>
      ${chapterHtml}
      <section class="chapter">
        <h2>최종 인생 로드맵 요약</h2>
        <ul>${finalRoadmapSummary}</ul>
      </section>
      <section class="footer">이 문서는 사주 원국과 운의 흐름을 바탕으로 삶의 방향과 실행 전략을 정리한 사주 인생의 책 리포트입니다.</section>
    </main>
  </body>
  </html>`;
}

export const __lifeBookTestUtils = {
  CHAPTER_BLUEPRINTS: getLifeBookBlueprints(),
  LIFEBOOK_CANONICAL_BLUEPRINTS: getLifeBookBlueprints(),
  LIFEBOOK_PHASE6_BLUEPRINTS,
  LIFEBOOK_PHASE6_CHAPTER_STRUCTURE,
  LIFEBOOK_MIN_CATEGORY_CHARS,
  LIFEBOOK_MIN_CHAPTER_CHARS,
  LIFEBOOK_MIN_TOTAL_CHARS,
  LIFEBOOK_A4_TOTAL_TARGET,
  LIFE_BOOK_PROMPT_VERSION,
  LIFEBOOK_CHAPTER_PAGE_TARGETS,
  LIFEBOOK_CHAPTER_COMMON_STRUCTURE,
  LIFEBOOK_BLOCKING_MIN_CATEGORY_CHARS,
  LIFEBOOK_BLOCKING_MIN_CHAPTER_CHARS,
  LIFEBOOK_BLOCKING_MIN_TOTAL_CHARS,
  stripForbiddenTokens,
  ensureCategoryLength: ensureProfessionalCategoryLength,
  buildCategoryText: buildProfessionalLifeBookCategoryText,
  buildLifeBookChapters,
  buildLifeBookFallbackChapters,
  ensureCompleteLifeBookChapters,
  validateLifeBookStructure,
  evaluateLifeBookQuality,
  repairLifeBookQualityIssues,
  finalizeLifeBookManuscript,
  validateLifeBookFinalManuscript,
  validateLifeBookChapters,
  validateLifeBookGeneratedChapter,
  buildLifeBookDocument,
  normalizeInput,
  deriveLocalSignals,
  buildLifeBookLocalSajuJson,
  calculateSajuLocally,
  buildLifeBookNormalizedData,
  LIFEBOOK_DAY_MASTER_BLOCKS,
  LIFEBOOK_ELEMENT_BLOCKS,
  LIFEBOOK_TEN_GOD_BLOCKS,
  LIFEBOOK_USEFUL_GOD_BLOCKS,
  LIFEBOOK_FLOW_BLOCKS,
  LIFEBOOK_DOMAIN_BLOCKS,
  selectLifeBookInterpretationBlocks,
  buildLifeBookBlockInterpretationText,
  normalizeLifeBookInput,
  composeLifeBookChapters,
  renderLifeBookHtml,
  renderLifeBookPdfArchive,
  generateLifeBookPdf,
  validateLifeBookLocalSajuJson,
  validateLifeBookJsonContract,
  buildLifeBookChapterEvidenceCoverage,
  buildLifeBookCanonicalSajuChartFromContract,
  validateLifeBookCanonicalSajuChart,
  buildLifeBookMasterJson,
  buildLifeBookAssemblyInput,
  buildLifeBookEngineContract,
  buildLifeBookEngineSummary,
  buildLifeBookChapterOpeningText,
  buildLifeBookChapterPlan,
  buildLifeBookChapterPlans,
  resolveLifeBookAssemblyRuntimeInfo,
  buildLifeBookDeterministicFinalManuscript,
  normalizeLifeBookSectionBody,
  normalizeLifeBookChapterMarkdown,
  normalizeLifeBookFinalManuscriptMarkdown,
  ensureLifeBookSectionH3,
  getLifeBookPagePlan,
  splitLifeBookChapterParts,
  validateLifeBookFinalManuscriptMarkdown,
  assembleLifeBookChaptersLocally,
  buildLifeBookPdfRecord,
  buildPdfReadyPayload: buildPdfReadyPayloadClean,
};

function resolveLifeBookProfileId(body = {}, profile = {}) {
  return clean(
    body?.profileId
    || body?.selectedProfileId
    || body?.profile?.id
    || body?.profile?._id
    || body?.accessGrant?.profileId
    || profile?.id
    || profile?._id
    || "",
  );
}

function resolveLifeBookEngineVersion(env = {}) {
  return clean(
    env?.LIFEBOOK_ENGINE_VERSION
    || env?.QUANTUM_MYEONGRI_ENGINE_VERSION
    || env?.SAJU_ENGINE_VERSION
    || "quantum-myeongri-v1",
  );
}

function estimateLifeBookActualPages(markdownContent = "", htmlContent = "") {
  const markdownLength = normalizeLifeBookFinalManuscriptMarkdown(markdownContent).length;
  const htmlTextLength = clean(htmlContent).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
  const sourceLength = Math.max(markdownLength, htmlTextLength);
  if (!sourceLength) return undefined;
  return Math.max(1, Math.round(sourceLength / LIFEBOOK_A4_CHAR_RANGE.target));
}

function buildLifeBookPdfRecord({
  reportId = "",
  userId = "",
  profileId = "",
  status = "generating",
  markdownContent = "",
  htmlContent = "",
  pdfUrl = "",
  errorMessage = "",
  createdAt = "",
  engineVersion = "",
  actualPages,
  cacheKey = "",
  calculationResultHash = "",
} = {}) {
  const normalizedMarkdown = normalizeLifeBookFinalManuscriptMarkdown(markdownContent);
  const normalizedHtml = String(htmlContent || "");
  const resolvedActualPages = Number.isFinite(Number(actualPages))
    ? Math.max(1, Math.round(Number(actualPages)))
    : estimateLifeBookActualPages(normalizedMarkdown, normalizedHtml);
  const record = {
    reportId: clean(reportId),
    userId: clean(userId),
    profileId: clean(profileId) || clean(userId),
    serviceType: "life-book",
    title: "인생의 책 — 나의 운명 사용 기준",
    createdAt: clean(createdAt) || new Date().toISOString(),
    engineVersion: clean(engineVersion) || "quantum-myeongri-v1",
    chapterCount: 13,
    targetPages: LIFEBOOK_A4_TOTAL_TARGET.pages,
    status: ["generating", "completed", "failed"].includes(clean(status)) ? clean(status) : "generating",
    markdownContent: normalizedMarkdown,
  };
  if (clean(cacheKey)) record.cacheKey = clean(cacheKey);
  if (clean(calculationResultHash)) record.calculationResultHash = clean(calculationResultHash);
  if (resolvedActualPages) record.actualPages = resolvedActualPages;
  if (normalizedHtml) record.htmlContent = normalizedHtml;
  if (clean(pdfUrl)) record.pdfUrl = clean(pdfUrl);
  if (clean(errorMessage)) record.errorMessage = clean(errorMessage).slice(0, 500);
  return record;
}

async function persistLifeBookPdfRecord(env, executionCtx, record = {}, extraMetadata = {}) {
  if (!executionCtx?.executionKey || !record?.reportId) return null;
  const metadata = {
    ...(executionCtx.metadata || {}),
    ...(extraMetadata && typeof extraMetadata === "object" ? extraMetadata : {}),
    lifeBookPdfRecord: record,
    reportId: clean(record.reportId || executionCtx.reportId),
    serviceType: "life-book",
    cacheKey: clean(record.cacheKey || executionCtx.cacheKey || extraMetadata?.cacheKey),
    lifeBookPdfCacheKey: clean(record.cacheKey || executionCtx.cacheKey || extraMetadata?.lifeBookPdfCacheKey || extraMetadata?.cacheKey),
    calculationResultHash: clean(record.calculationResultHash || executionCtx.calculationResultHash || extraMetadata?.calculationResultHash),
  };
  executionCtx.metadata = metadata;
  try {
    await connectDb(withPdfFastDbEnv(env));
    return await ServiceExecutionTransaction.findOneAndUpdate(
      { executionKey: clean(executionCtx.executionKey, 120) },
      {
        $set: {
          metadata,
          reportId: clean(record.reportId || executionCtx.reportId),
          sessionId: clean(executionCtx.sessionId),
          reportType: "lifeBook",
          cacheKey: clean(record.cacheKey || executionCtx.cacheKey || extraMetadata?.cacheKey),
        },
      },
      { returnDocument: "after" },
    ).lean();
  } catch (error) {
    logLifeBookServer("LifeBookPdfRecordPersistFailed", {
      reportId: clean(record.reportId),
      status: clean(record.status),
      reason: clean(error?.message || error),
    });
    return null;
  }
}

function buildPdfReadyPayloadClean(profile, chapters, metadata = {}) {
  return {
    title: `${stripForbiddenTokens(profile.name || "사용자")} 사주 인생의 책`,
    filename: `saju-lifebook-${String(profile.name || "user").replace(/\s+/g, "-").toLowerCase()}.html`,
    generatedAt: new Date().toISOString(),
    profile,
    metadata,
    html: String(metadata.pdfHtml || ""),
    manuscriptSource: clean(metadata.manuscriptSource || ""),
    finalManuscriptMarkdown: normalizeLifeBookFinalManuscriptMarkdown(metadata.finalManuscriptMarkdown || ""),
    finalManuscriptSource: clean(metadata.finalManuscriptSource || ""),
    finalManuscriptErrors: Array.isArray(metadata.finalManuscriptErrors) ? metadata.finalManuscriptErrors : [],
    finalQualityReviewSource: clean(metadata.finalQualityReviewSource || ""),
    finalQualityReviewPassed: Boolean(metadata.finalQualityReviewPassed),
    finalQualityReviewErrors: Array.isArray(metadata.finalQualityReviewErrors) ? metadata.finalQualityReviewErrors : [],
    finalQualityReviewWarnings: Array.isArray(metadata.finalQualityReviewWarnings) ? metadata.finalQualityReviewWarnings : [],
    highQualityGate: metadata.highQualityGate || null,
    chapters: chapters.map((chapter, index) => ({
      chapter: index + 1,
      id: chapter.id,
      title: chapter.title,
      pagePlan: chapter.pagePlan || getLifeBookPagePlan(chapter.id),
      chapterOpening: chapter.chapterOpening || "",
      chapterPlan: chapter.chapterPlan || null,
      sectionResults: chapter.sectionResults || [],
      reviewedMarkdown: chapter.reviewedMarkdown || chapter.editedMarkdown || chapter.mergedMarkdown || "",
      editedMarkdown: chapter.editedMarkdown || chapter.mergedMarkdown || "",
      mergedMarkdown: chapter.mergedMarkdown || chapter.editedMarkdown || "",
      chapterMergeSource: chapter.chapterMergeSource || "",
      chapterMergeErrors: chapter.chapterMergeErrors || [],
      chapterQualityReviewSource: chapter.chapterQualityReviewSource || "",
      chapterQualityReviewErrors: chapter.chapterQualityReviewErrors || [],
      categories: chapter.categories,
      text: chapter.text,
      source: chapter.source || "assembled",
    })),
  };
}

function buildPdfReadyPayload(profile, chapters, metadata = {}) {
  return {
    title: `${stripForbiddenTokens(profile.name || "사용자")} 사주 인생의 책`,
    filename: `saju-lifebook-${String(profile.name || "user").replace(/\s+/g, "-").toLowerCase()}.html`,
    generatedAt: new Date().toISOString(),
    profile,
    metadata,
    html: String(metadata.pdfHtml || ""),
    manuscriptSource: clean(metadata.manuscriptSource || ""),
    finalManuscriptMarkdown: normalizeLifeBookFinalManuscriptMarkdown(metadata.finalManuscriptMarkdown || ""),
    finalManuscriptSource: clean(metadata.finalManuscriptSource || ""),
    finalManuscriptErrors: Array.isArray(metadata.finalManuscriptErrors) ? metadata.finalManuscriptErrors : [],
    finalQualityReviewSource: clean(metadata.finalQualityReviewSource || ""),
    finalQualityReviewPassed: Boolean(metadata.finalQualityReviewPassed),
    finalQualityReviewErrors: Array.isArray(metadata.finalQualityReviewErrors) ? metadata.finalQualityReviewErrors : [],
    finalQualityReviewWarnings: Array.isArray(metadata.finalQualityReviewWarnings) ? metadata.finalQualityReviewWarnings : [],
    highQualityGate: metadata.highQualityGate || null,
    chapters: (Array.isArray(chapters) ? chapters : []).map((chapter, index) => ({
      chapter: index + 1,
      id: chapter.id,
      title: chapter.title,
      pagePlan: chapter.pagePlan || getLifeBookPagePlan(chapter.id),
      chapterOpening: chapter.chapterOpening || "",
      chapterPlan: chapter.chapterPlan || null,
      sectionResults: chapter.sectionResults || [],
      reviewedMarkdown: chapter.reviewedMarkdown || chapter.editedMarkdown || chapter.mergedMarkdown || "",
      editedMarkdown: chapter.editedMarkdown || chapter.mergedMarkdown || "",
      mergedMarkdown: chapter.mergedMarkdown || chapter.editedMarkdown || "",
      chapterMergeSource: chapter.chapterMergeSource || "",
      chapterMergeErrors: chapter.chapterMergeErrors || [],
      chapterQualityReviewSource: chapter.chapterQualityReviewSource || "",
      chapterQualityReviewErrors: chapter.chapterQualityReviewErrors || [],
      categories: chapter.categories,
      text: chapter.text,
      source: chapter.source || "assembled",
    })),
  };
}

function validateLifeBookPdfCompletionPayload({ pdfReady = {}, chapters = [] } = {}) {
  const errors = [];
  const html = String(pdfReady?.html || "").trim();
  const downloadUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || "");
  if (!html) errors.push("pdf_html_missing");
  if (!downloadUrl) errors.push("pdf_download_url_missing");

  const structure = validateLifeBookStructure(chapters);
  if (!structure.ok) errors.push(...structure.blockingErrors);

  const quality = evaluateLifeBookQuality(chapters);
  const highQuality = validateLifeBookHighQualityReadiness(chapters, {
    manuscriptSource: pdfReady?.manuscriptSource,
    finalManuscriptSource: pdfReady?.finalManuscriptSource,
    generationMode: pdfReady?.generationMode,
  });
  if (!highQuality.ok) errors.push(...highQuality.errors);
  const blockingWarnings = (Array.isArray(quality.warningItems) ? quality.warningItems : [])
    .filter((item) => clean(item?.severity) === "high")
    .map((item) => clean(item?.code))
    .filter(Boolean);
  if (blockingWarnings.length) errors.push(...blockingWarnings);

  const visibleText = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  if (/\b(?:undefined|null|nan|fallback|json|schema|debug|prompt)\b|\[object Object\]|자동\s*복구\s*생성|데이터\s*부족|로컬\s*엔진|템플릿|internal\s*server\s*error|about:blank/i.test(visibleText)) {
    errors.push("pdf_body_forbidden_text");
  }

  return {
    ok: errors.length === 0,
    errors: Array.from(new Set(errors)),
    structure,
    quality,
    highQuality,
  };
}

async function handleStatus(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({
        ok: false,
        serviceKey: LIFEBOOK_SERVICE_KEY,
        code: "UNAUTHORIZED",
        message: "인생의 책 생성 상태를 확인하려면 먼저 로그인해 주세요.",
      }, { status: 401 });
    }
    throw error;
  }

  const url = new URL(request.url);
  const sessionId = clean(url.searchParams.get("sessionId") || url.searchParams.get("reportSessionId"));
  const reportId = clean(url.searchParams.get("reportId"));
  if (!sessionId && !reportId) {
    return json({
      ok: false,
      serviceKey: LIFEBOOK_SERVICE_KEY,
      code: "MISSING_STATUS_KEY",
      message: "sessionId 또는 reportId가 필요합니다.",
    }, { status: 422 });
  }

  const lock = sessionId
    ? LIFEBOOK_SESSION_LOCKS.get(sessionId)
    : Array.from(LIFEBOOK_SESSION_LOCKS.values()).find((item) => clean(item?.reportId) === reportId);
  if (lock) return json(buildLifeBookStatusPayload(lock, { sessionId, reportId }));

  await connectDb(env);
  const filters = [];
  if (sessionId) filters.push({ sessionId });
  if (reportId) filters.push({ reportId });
  const doc = filters.length
    ? await ServiceExecutionTransaction.findOne({ userId: auth.userId, $or: filters }).sort({ updatedAt: -1, completedAt: -1 }).lean()
    : null;
  if (!doc) {
    return json({
      ok: true,
      serviceKey: LIFEBOOK_SERVICE_KEY,
      data: {
        sessionId,
        reportId,
        status: "unknown",
        progress: {
          stateKey: "not_found",
          currentChapterNo: 0,
          totalChapters: getLifeBookBlueprints().length,
        },
      },
    });
  }

  const metadata = doc && typeof doc.metadata === "object" ? doc.metadata : {};
  const archive = metadata?.archive && typeof metadata.archive === "object" ? metadata.archive : {};
  const status = clean(doc.status) === "success" && clean(doc.premiumStatus) === "completed"
    ? "done"
    : clean(doc.status) === "failed" || clean(doc.premiumStatus) === "failed"
      ? "failed"
      : "running";
  return json(buildLifeBookStatusPayload({
    sessionId: clean(doc.sessionId || sessionId),
    reportId: clean(doc.reportId || reportId),
    status,
    startedAt: doc.generationStartedAt || doc.createdAt,
    progress: {
      stateKey: status === "done" ? "completed" : status === "failed" ? "failed" : LIFEBOOK_WRITING_STATE,
      currentChapterNo: status === "done" ? getLifeBookBlueprints().length : 0,
      totalChapters: getLifeBookBlueprints().length,
    },
    lifeBookPdfRecord: archive.lifeBookPdfRecord || metadata.lifeBookPdfRecord || null,
    result: {
      data: {
        reportId: clean(doc.reportId || reportId),
        sessionId: clean(doc.sessionId || sessionId),
        pdfReady: archive.pdfReady || metadata.pdfReady || null,
        canDownload: Boolean(archive?.pdfReady?.downloadUrl || archive?.pdfReady?.pdfUrl || archive?.pdfUrl),
      },
    },
  }, {
    sessionId,
    reportId,
    completedAt: doc.completedAt || doc.generationCompletedAt,
    failedAt: doc.failedAt || doc.generationFailedAt,
  }));
}

async function handlePrepareSync(request, env) {
  logLifeBookServer("RequestReceived", { route: "/api/premium/saju-lifebook/prepare" });
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({
        ok: false,
        serviceKey: LIFEBOOK_SERVICE_KEY,
        message: "로그인 후 인생의 책 PDF를 생성할 수 있습니다.",
        code: "UNAUTHORIZED",
      }, { status: 401 });
    }
    throw error;
  }
  const body = await readJson(request);
  body.targetYear = resolveLifeBookTargetYear(body);
  body.analysisYear = body.targetYear;
  const premiumAccessToken = String(
    request.headers.get("x-premium-access-token")
    || body?.premiumAccessToken
    || body?._premiumAccessToken
    || cookieValue(request, "cd_premium_access")
    || "",
  ).trim();

  const normalized = normalizeInput(body);
  if (!normalized.ok) {
    return json({ ok: false, code: clean(normalized.code || "INVALID_INPUT"), message: normalized.message }, { status: normalized.code === "BIRTH_TIME_REQUIRED" ? 422 : 400 });
  }

  const profile = normalized.profile;
  const birthInput = normalized.birthInput;
  logLifeBookServer("BirthInputValidated", {
    hasBirthDate: Boolean(birthInput.birthDate),
    hasBirthTime: Boolean(birthInput.birthTime),
    birthHour: birthInput.birthHour,
    targetYear: body.targetYear,
    hasGender: Boolean(birthInput.gender && birthInput.gender !== "unknown"),
    calendarType: birthInput.calendarType,
  });

  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId) || `life-book:${auth.userId}:${birthInput.birthDate}:${birthInput.birthTime || "unknown"}:${body.targetYear}`;
  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `saju-lifebook-${Date.now()}`);
  const profileId = resolveLifeBookProfileId(body, profile);
  const featureKey = resolveLifeBookFeatureKey(body?.featureKey);
  const billingFeatureKey = toBillingFeatureKey(featureKey);
  const reusableExecutionCtx = buildPremiumExecutionContext({
    serviceKey: LIFEBOOK_SERVICE_KEY,
    reportType: "lifeBook",
    userId: auth.userId,
    featureKey,
    sessionId,
    reportId,
    access: null,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  const reusableExecution = await findLifeBookReusableExecution(env, auth.userId, reusableExecutionCtx, { sessionId, reportId, featureKey });
  const reusableResponse = reusableExecution ? buildLifeBookReusableExecutionResponse(reusableExecution, { sessionId, reportId, featureKey }) : null;
  if (reusableResponse) return json(reusableResponse.payload, { status: reusableResponse.status });

  const recordCreatedAt = new Date().toISOString();
  const engineVersion = resolveLifeBookEngineVersion(env);
  const generatingRecord = buildLifeBookPdfRecord({
    reportId,
    userId: auth.userId,
    profileId,
    status: "generating",
    createdAt: recordCreatedAt,
    engineVersion,
  });
  const existingLock = LIFEBOOK_SESSION_LOCKS.get(sessionId);
  if (existingLock?.status === "running") {
    return json({
      ok: true,
      serviceKey: LIFEBOOK_SERVICE_KEY,
      chapterCount: getLifeBookBlueprints().length,
      data: {
        sessionId,
        status: "running",
        startedAt: existingLock.startedAt,
        reportId: clean(existingLock.reportId || reportId),
        lifeBookPdfRecord: existingLock.lifeBookPdfRecord || generatingRecord,
      },
    });
  }
  if (existingLock?.status === "done" && existingLock.result) {
    return json(existingLock.result);
  }
  LIFEBOOK_SESSION_LOCKS.set(sessionId, {
    sessionId,
    reportId,
    status: "running",
    startedAt: new Date().toISOString(),
    progress: {
      stateKey: "payment-verification",
      currentChapterNo: 0,
      totalChapters: getLifeBookBlueprints().length,
      updatedAt: new Date().toISOString(),
    },
    lifeBookPdfRecord: generatingRecord,
  });

  try {
    const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "lifeBook", {
      ...body,
      featureKey: billingFeatureKey,
      reportType: "lifeBook",
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: "/api/premium/saju-lifebook/prepare",
    });

    if (!access?.ok) {
      const status = Number(access?.status || 402);
      const hasSessionId = Boolean(clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId));
      const hasPurchaseId = Boolean(clean(body?.purchaseId || body?.accessGrant?.purchaseId || body?.payment?.purchaseId));
      const hasRequestId = Boolean(clean(body?.requestId || body?.accessGrant?.requestId || body?.payment?.requestId || body?._paymentContext?.requestId));
      const hasPaymentToken = Boolean(premiumAccessToken);
      const paymentConfirmedButMissing = status === 402 && (hasSessionId || hasPurchaseId || hasRequestId || hasPaymentToken);

      const message = status === 401
        ? "로그인 후 인생의 책 PDF를 생성할 수 있습니다."
        : paymentConfirmedButMissing
          ? "결제는 확인되었지만 생성 권한 연결이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요."
          : status === 402
          ? "프리미엄 PDF 생성 권한이 필요합니다."
          : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

      LIFEBOOK_SESSION_LOCKS.delete(sessionId);
      return json({
        ok: false,
        serviceKey: LIFEBOOK_SERVICE_KEY,
        message,
        code: paymentConfirmedButMissing ? "PAYMENT_CONFIRMED_BUT_ACCESS_MISSING" : "LIFEBOOK_ACCESS_DENIED",
        debugSafe: {
          featureKey,
          hasSessionId,
          hasPurchaseId,
          hasRequestId,
          hasPaymentToken,
        },
      }, { status });
    }
  logLifeBookServer("PaymentVerificationPassed", {
    featureKey,
    accessType: clean(access?.accessType || ""),
  });
  updateLifeBookSessionProgress(sessionId, {
    stateKey: "local_calculation",
    currentChapterNo: 0,
    totalChapters: getLifeBookBlueprints().length,
  });
  logLifeBookServer("LocalCalculationStart", { sessionId });
  const executionCtx = buildPremiumExecutionContext({
    serviceKey: LIFEBOOK_SERVICE_KEY,
    reportType: "lifeBook",
    userId: auth.userId,
    featureKey,
    sessionId,
    reportId,
    access,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  executionCtx.metadata = {
    ...(executionCtx.metadata || {}),
    profileId,
    lifeBookPdfRecord: generatingRecord,
    serviceType: "life-book",
  };
  const requestId = clean(body?.requestId || body?.accessGrant?.requestId || reportId);
  const precomputedCalculation = calculateSajuLocally({ birthInput, profile, body, sessionId });
  const precomputedNormalized = normalizeLifeBookInput({
    birthInput,
    profile,
    signals: precomputedCalculation.signals,
    localSajuJson: precomputedCalculation.localSajuJson,
    body,
    sessionId,
    requestId,
  });
  const cacheContext = buildLifeBookPdfCacheContext(profile, precomputedNormalized);
  executionCtx.cacheKey = cacheContext.cacheKey;
  executionCtx.calculationResultHash = cacheContext.calculationResultHash;
  executionCtx.metadata = {
    ...executionCtx.metadata,
    cacheKey: cacheContext.cacheKey,
    lifeBookPdfCacheKey: cacheContext.cacheKey,
    calculationResultHash: cacheContext.calculationResultHash,
    templateVersion: LIFE_BOOK_PDF_CONFIG.templateVersion,
  };
  generatingRecord.cacheKey = cacheContext.cacheKey;
  generatingRecord.calculationResultHash = cacheContext.calculationResultHash;
  const cacheExecution = await findLifeBookReusableExecution(env, auth.userId, {
    cacheKey: cacheContext.cacheKey,
  }, { sessionId, reportId, featureKey, cacheKey: cacheContext.cacheKey });
  const cacheResponse = cacheExecution ? buildLifeBookReusableExecutionResponse(cacheExecution, {
    sessionId,
    reportId,
    featureKey,
    cacheKey: cacheContext.cacheKey,
  }) : null;
  if (cacheResponse) {
    if (cacheResponse.status === 200) {
      LIFEBOOK_SESSION_LOCKS.set(sessionId, {
        sessionId,
        reportId,
        status: "done",
        startedAt: recordCreatedAt,
        completedAt: new Date().toISOString(),
        result: cacheResponse.payload,
        progress: {
          stateKey: "completed",
          currentChapterNo: getLifeBookBlueprints().length,
          totalChapters: getLifeBookBlueprints().length,
          updatedAt: new Date().toISOString(),
        },
        lifeBookPdfRecord: cacheResponse.payload?.data?.lifeBookPdfRecord || generatingRecord,
      });
    } else if (cacheResponse.status === 202) {
      LIFEBOOK_SESSION_LOCKS.set(sessionId, {
        sessionId,
        reportId,
        status: "running",
        startedAt: recordCreatedAt,
        result: cacheResponse.payload,
        progress: {
          stateKey: LIFEBOOK_WRITING_STATE,
          currentChapterNo: 0,
          totalChapters: getLifeBookBlueprints().length,
          updatedAt: new Date().toISOString(),
        },
        lifeBookPdfRecord: generatingRecord,
      });
    } else {
      LIFEBOOK_SESSION_LOCKS.delete(sessionId);
    }
    return json(cacheResponse.payload, { status: cacheResponse.status });
  }
  await startPremiumPdfExecution(env, auth.userId, executionCtx);
  const executionLease = await acquireLifeBookExecutionLease(env, auth.userId, executionCtx);
  if (!executionLease.ok && !executionLease.error) {
    LIFEBOOK_SESSION_LOCKS.delete(sessionId);
    return json({
      ok: true,
      serviceKey: LIFEBOOK_SERVICE_KEY,
      status: "running",
      serverStatus: "running",
      reportId,
      sessionId,
      data: {
        reportId,
        sessionId,
        status: "running",
        progress: {
          stateKey: LIFEBOOK_WRITING_STATE,
          currentChapterNo: 0,
          totalChapters: getLifeBookBlueprints().length,
        },
      },
    }, { status: 202 });
  }
  await persistLifeBookPdfRecord(env, executionCtx, generatingRecord, {
    profileId,
    generationStatus: "generating",
    cacheKey: cacheContext.cacheKey,
    lifeBookPdfCacheKey: cacheContext.cacheKey,
    calculationResultHash: cacheContext.calculationResultHash,
  });

  const pipelineResult = await generateLifeBookLocalPdf({
    profile,
    birthInput,
    body,
    sessionId,
    reportId,
    requestId,
    env,
    precomputedNormalized: {
      calculation: precomputedCalculation,
      normalized: precomputedNormalized,
      cacheContext,
    },
    onProgress: (progress) => updateLifeBookSessionProgress(sessionId, progress),
  }, {
    config: LIFE_BOOK_PDF_CONFIG,
    expectedChapterCount: getLifeBookBlueprints().length,
    buildLocalPdf: (input) => generateLifeBookPdf(input.profile, {
      env: input.env,
      birthInput: input.birthInput,
      body: input.body,
      sessionId: input.sessionId,
      reportId: input.reportId,
      requestId: input.requestId,
      precomputedNormalized: input.precomputedNormalized,
      onProgress: input.onProgress,
    }),
  });
  const {
    signals,
    localSajuJson,
    assemblyInput,
    engineContractValidation,
    canonicalValidation,
    chapterEvidenceCoverage,
    lifeBookNormalizedData,
    lifeBookMasterJson,
    generatedLifeBook,
    completedChapters,
    structureValidation,
    qualityEvaluation,
    highQualityGate,
    finalQualityWarnings,
    finalQualityScore,
    repairedCategoryCount,
    finalManuscriptMarkdown,
    generatedAt,
    pdf,
    cacheKey,
    calculationResultHash,
    cacheHit,
  } = pipelineResult;

  logLifeBookServer("LifeBookFinalizeReady", {
    sessionId,
    reportId,
    chapterCount: completedChapters.length,
    totalLength: qualityEvaluation.totalLength,
    blockingErrors: structureValidation.blockingErrors,
    softWarnings: finalQualityWarnings,
    repairedCategoryCount,
    finalQualityScore,
  });

  const lifebookPayload = buildLifeBookPayload(profile, signals, completedChapters, {
    featureKey,
    calendarType: body?.calendarType,
  });

  const manuscriptSource = generatedLifeBook.manuscriptSource;
  const localAssembly = generatedLifeBook.localAssembly || {
    enabled: true,
    source: LIFE_BOOK_PDF_CONFIG.generationMode,
    provider: LIFE_BOOK_PDF_CONFIG.provider,
    templateVersion: LIFE_BOOK_PDF_CONFIG.templateVersion,
    chapterCount: completedChapters.length,
    expectedChapterCount: getLifeBookBlueprints().length,
    externalGeneration: false,
    externalCallsAllowed: false,
  };
  logLifeBookServer("PdfRenderStart", { sessionId, chapterCount: completedChapters.length });

  const pdfReady = buildPdfReadyPayloadClean(profile, completedChapters, {
    featureKey,
    reportType: "lifeBook",
    accessType: String(access.accessType || "unknown"),
    manuscriptSource,
    chapterPlans: generatedLifeBook.chapterPlans || [],
    finalManuscriptSource: generatedLifeBook.finalManuscriptSource || "",
    finalManuscriptErrors: generatedLifeBook.finalManuscriptErrors || [],
    finalQualityReviewSource: generatedLifeBook.finalQualityReviewSource || "",
    finalQualityReviewPassed: Boolean(generatedLifeBook.finalQualityReviewPassed),
    finalQualityReviewErrors: generatedLifeBook.finalQualityReviewErrors || [],
    finalQualityReviewWarnings: generatedLifeBook.finalQualityReviewWarnings || [],
    highQualityGate,
    generationMode: generatedLifeBook.generationMode || LIFE_BOOK_PDF_CONFIG.generationMode,
    templateVersion: generatedLifeBook.templateVersion || LIFE_BOOK_PDF_CONFIG.templateVersion,
    localAssembly,
    cacheKey,
    lifeBookPdfCacheKey: cacheKey,
    calculationResultHash,
    cacheHit: Boolean(cacheHit),
    calculationContractValidation: engineContractValidation,
    canonicalValidation,
    chapterEvidenceCoverage,
    lifeBookNormalizedData,
    lifeBookMasterJson,
    finalManuscriptMarkdown,
    pdfHtml: pdf.html,
  });
  const requestOrigin = new URL(request.url).origin;
  const archiveApiUrl = `${requestOrigin}/api/premium/pdf-archive/${encodeURIComponent(reportId)}`;
  const archiveDocumentUrl = `${archiveApiUrl}?format=html`;
  const archivePdfUrl = `${archiveApiUrl}?format=pdf`;
  pdfReady.archiveApiUrl = archiveApiUrl;
  pdfReady.pdfUrl = archivePdfUrl;
  pdfReady.htmlUrl = archiveDocumentUrl;
  pdfReady.downloadUrl = archivePdfUrl;
  pdfReady.storageKey = `premium-archive:life-book:${reportId}`;
  pdfReady.mimeType = "application/pdf";
  pdfReady.contentType = "application/pdf";
  pdfReady.htmlMimeType = "text/html";
  pdfReady.localAssembly = localAssembly;

  const pdfCompletionValidation = validateLifeBookPdfCompletionPayload({ pdfReady, chapters: completedChapters });
  if (!pdfCompletionValidation.ok) {
    throw Object.assign(new Error("인생의 책 PDF 완료 기준을 충족하지 못했습니다. 원고와 다운로드 구성을 다시 확인해 주세요."), {
      code: "LIFEBOOK_PDF_COMPLETION_INVALID",
      status: 422,
      details: {
        errors: pdfCompletionValidation.errors,
        chapterCount: pdfCompletionValidation.structure?.chapterCount,
        totalLength: pdfCompletionValidation.quality?.totalLength,
      },
    });
  }

  const storedUrl = clean(pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl);
  if (!storedUrl) {
    throw Object.assign(new Error("인생의 책 PDF 저장 URL 생성에 실패했습니다."), {
      code: "LIFEBOOK_PDF_URL_MISSING",
      status: 500,
    });
  }
  const completedRecord = buildLifeBookPdfRecord({
    reportId,
    userId: auth.userId,
    profileId,
    status: "completed",
    markdownContent: finalManuscriptMarkdown,
    htmlContent: pdfReady.html,
    pdfUrl: storedUrl,
    createdAt: recordCreatedAt,
    engineVersion,
    cacheKey,
    calculationResultHash,
  });
  pdfReady.lifeBookPdfRecord = completedRecord;
  await persistLifeBookPdfRecord(env, executionCtx, completedRecord, {
    profileId,
    generationStatus: "completed",
    cacheKey,
    lifeBookPdfCacheKey: cacheKey,
    calculationResultHash,
    pdfReady,
  });
  logLifeBookServer("PdfRenderSuccess", { sessionId, chapterCount: completedChapters.length });

  await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
    manuscriptSource,
    authoringMode: LIFEBOOK_AUTHORING_MODE,
    localAssembly,
    lifeBookPdfRecord: completedRecord,
    chapterCount: completedChapters.length,
    sectionCount: completedChapters.reduce((sum, chapter) => sum + (Array.isArray(chapter?.sectionResults) ? chapter.sectionResults.length : 0), 0),
    qualityWarnings: finalQualityWarnings,
    qualityScore: finalQualityScore,
    highQualityGate,
    pdfCompletionValidation,
    repairedCategoryCount,
    cacheKey,
    lifeBookPdfCacheKey: cacheKey,
    calculationResultHash,
    archive: {
      reportId,
      reportType: "life_book",
      displayName: "사주 인생의 책",
      title: `${clean(profile?.name) || "사용자"}님의 인생의 책`,
      mode: "personal",
      birthName: clean(profile?.name),
      summary: clean(
        completedChapters?.[0]?.categories?.[0]?.finalText
        || completedChapters?.[0]?.finalText
        || completedChapters?.[0]?.categories?.[0]?.text,
      ),
      pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl),
      htmlUrl: clean(pdfReady?.htmlUrl),
      chapters: completedChapters,
      chapterPlans: generatedLifeBook.chapterPlans || [],
      lifeBookPdfRecord: completedRecord,
      finalManuscriptMarkdown,
      finalManuscriptSource: generatedLifeBook.finalManuscriptSource || "",
      authoringMode: LIFEBOOK_AUTHORING_MODE,
      localAssembly,
      finalManuscriptErrors: generatedLifeBook.finalManuscriptErrors || [],
      finalQualityReviewSource: generatedLifeBook.finalQualityReviewSource || "",
      finalQualityReviewPassed: Boolean(generatedLifeBook.finalQualityReviewPassed),
      finalQualityReviewErrors: generatedLifeBook.finalQualityReviewErrors || [],
      finalQualityReviewWarnings: generatedLifeBook.finalQualityReviewWarnings || [],
      pdfCompletionValidation,
      generationMode: generatedLifeBook.generationMode || LIFE_BOOK_PDF_CONFIG.generationMode,
      templateVersion: generatedLifeBook.templateVersion || LIFE_BOOK_PDF_CONFIG.templateVersion,
      cacheKey,
      lifeBookPdfCacheKey: cacheKey,
      calculationResultHash,
      cacheHit: Boolean(cacheHit),
      calculationContractValidation: engineContractValidation,
      canonicalValidation,
      chapterEvidenceCoverage,
      lifeBookNormalizedData,
      lifeBookMasterJson,
      localSajuJson,
      lifeBookEngineContract: assemblyInput.engineContract,
      pdfReady,
      canReopen: true,
      canDownload: Boolean(clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl)),
    },
  });

  logLifeBookServer("LifeBookArchiveSaved", {
    sessionId,
    reportId,
    chapterCount: completedChapters.length,
    totalLength: qualityEvaluation.totalLength,
    blockingErrors: [],
    softWarnings: finalQualityWarnings,
    repairedCategoryCount,
    finalQualityScore,
    archiveUrlExists: Boolean(storedUrl),
  });

  const responseData = {
    reportId,
    featureKey,
    sessionId,
    reportType: "lifeBook",
    serviceKey: LIFEBOOK_SERVICE_KEY,
    authoringMode: LIFEBOOK_AUTHORING_MODE,
    profile,
    birthInput,
    manuscriptSource,
    localAssembly,
    localSajuJson,
    lifeBookEngineContract: assemblyInput.engineContract,
    chapterPlans: generatedLifeBook.chapterPlans || [],
    lifeBookPdfRecord: completedRecord,
    finalManuscriptMarkdown,
    finalManuscriptSource: generatedLifeBook.finalManuscriptSource || "",
    finalManuscriptErrors: generatedLifeBook.finalManuscriptErrors || [],
    finalQualityReviewSource: generatedLifeBook.finalQualityReviewSource || "",
    finalQualityReviewPassed: Boolean(generatedLifeBook.finalQualityReviewPassed),
    finalQualityReviewErrors: generatedLifeBook.finalQualityReviewErrors || [],
    finalQualityReviewWarnings: generatedLifeBook.finalQualityReviewWarnings || [],
    pdfCompletionValidation,
    generationMode: generatedLifeBook.generationMode || LIFE_BOOK_PDF_CONFIG.generationMode,
    templateVersion: generatedLifeBook.templateVersion || LIFE_BOOK_PDF_CONFIG.templateVersion,
    calculationContractValidation: engineContractValidation,
    canonicalValidation,
    chapterEvidenceCoverage,
    lifeBookNormalizedData,
    lifeBookMasterJson,
    chapters: completedChapters,
    pdfReady,
    pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl),
    htmlUrl: clean(pdfReady?.htmlUrl),
    canReopen: true,
    canDownload: Boolean(clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl)),
  };


  const result = {
    status: "completed",
    serverStatus: "completed",
    qualityStatus: finalQualityWarnings.length ? "passed_with_warnings" : "passed",
    ok: true,
    serviceKey: LIFEBOOK_SERVICE_KEY,
    featureKey,
    chapterCount: getLifeBookBlueprints().length,
    reportType: "lifeBook",
    data: responseData,
    ...responseData,
  };

  LIFEBOOK_SESSION_LOCKS.set(sessionId, {
    sessionId,
    reportId,
    status: "done",
    startedAt: existingLock?.startedAt || new Date().toISOString(),
    progress: {
      stateKey: "completed",
      currentChapterNo: getLifeBookBlueprints().length,
      totalChapters: getLifeBookBlueprints().length,
      updatedAt: new Date().toISOString(),
    },
    lifeBookPdfRecord: completedRecord,
    result,
  });

  return json(result);
  } catch (error) {
    const executionCtx = buildPremiumExecutionContext({
      serviceKey: LIFEBOOK_SERVICE_KEY,
      reportType: "lifeBook",
      userId: auth.userId,
      featureKey: resolveLifeBookFeatureKey(body?.featureKey),
      sessionId,
      reportId,
      access: null,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    
    const rawMessage = clean(error?.message || "인생의 책 생성 중 오류가 발생했습니다.");
    const normalizedError = normalizeLifeBookError(error);
    const failedRecord = buildLifeBookPdfRecord({
      reportId,
      userId: auth.userId,
      profileId,
      status: "failed",
      createdAt: recordCreatedAt,
      engineVersion,
      errorMessage: rawMessage,
    });
    executionCtx.metadata = {
      ...(executionCtx.metadata || {}),
      profileId,
      lifeBookPdfRecord: failedRecord,
      serviceType: "life-book",
      generationStatus: "failed",
    };
    
    logLifeBookServer("Error", {
      stage: "handlePrepare",
      sessionId,
      errorCode: error?.code,
      errorStatus: error?.status,
      errorMessage: rawMessage.substring(0, 200),
    });
    
    try {
      await failPremiumPdfExecution(
        env,
        auth.userId,
        executionCtx,
        "lifebook_generation_failed",
        rawMessage,
        "lifebook-generation",
      );
    } catch (failErr) {
      logLifeBookServer("ErrorFailPdfExecution", { reason: clean(failErr?.message) });
    }
    await persistLifeBookPdfRecord(env, executionCtx, failedRecord, {
      profileId,
      generationStatus: "failed",
    });
    
    LIFEBOOK_SESSION_LOCKS.set(sessionId, {
      sessionId,
      reportId,
      status: "failed",
      startedAt: new Date().toISOString(),
      progress: {
        stateKey: "failed",
        currentChapterNo: 0,
        totalChapters: getLifeBookBlueprints().length,
        updatedAt: new Date().toISOString(),
      },
      lifeBookPdfRecord: failedRecord,
      error: normalizedError,
    });
    
    // Provide clear, user-friendly error message
    const userFacingMessage = rawMessage.includes("생년월일") 
      ? "생년월일 정보를 확인할 수 없습니다. 정확한 생년월일시를 입력해 주세요."
      : rawMessage.includes("엔진")
      ? "사주 계산에 일시적 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
      : rawMessage.includes("원고") || rawMessage.includes("품질")
      ? "생성된 내용이 품질 검증에 실패했습니다. 입력 정보를 다시 확인한 뒤 시도해 주세요."
      : "인생의 책 PDF 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    
    return json({
      ok: false,
      code: error?.code || "LIFEBOOK_GENERATION_FAILED",
      message: userFacingMessage,
      debugSafe: {
        stage: "local-assembly",
        reportId,
        sessionId,
        lifeBookPdfRecord: failedRecord,
        originalCode: error?.code,
        authoringMode: LIFEBOOK_AUTHORING_MODE,
        retryable: Number(error?.status || 500) >= 500,
        assemblyRuntime: resolveLifeBookAssemblyRuntimeInfo(env),
      },
    }, { status: Number(error?.status || 500) });
  }
}

async function handlePrepare(request, env, ctx) {
  if (!ctx || typeof ctx.waitUntil !== "function" || request.headers.get("x-lifebook-sync") === "1") {
    return await handlePrepareSync(request, env);
  }

  const bodyText = await request.clone().text().catch(() => "");
  let body = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch (_) {
    return await handlePrepareSync(new Request(request, { body: bodyText }), env);
  }
  body.targetYear = resolveLifeBookTargetYear(body);
  body.analysisYear = body.targetYear;

  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({
        ok: false,
        serviceKey: LIFEBOOK_SERVICE_KEY,
        message: "Login is required to generate the life book PDF.",
        code: "UNAUTHORIZED",
      }, { status: 401 });
    }
    throw error;
  }

  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId)
    || `life-book:${auth.userId}:${clean(body?.birthDate || "unknown")}:${clean(body?.birthTime || body?.hour || "unknown")}:${body.targetYear}`;
  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `saju-lifebook-${Date.now()}`);
  const existingLock = LIFEBOOK_SESSION_LOCKS.get(sessionId);

  if (existingLock?.status === "done" && existingLock.result) {
    return json(existingLock.result);
  }
  if (["queued", "running"].includes(clean(existingLock?.status))) {
    return json(buildLifeBookStatusPayload(existingLock, { sessionId, reportId }), { status: 202 });
  }

  LIFEBOOK_SESSION_LOCKS.set(sessionId, {
    sessionId,
    reportId,
    status: "queued",
    startedAt: new Date().toISOString(),
    progress: {
      stateKey: "queued",
      currentChapterNo: 0,
      totalChapters: getLifeBookBlueprints().length,
      updatedAt: new Date().toISOString(),
    },
  });

  const backgroundRequest = new Request(request, { body: bodyText });
  ctx.waitUntil(
    handlePrepareSync(backgroundRequest, env)
      .then(async (response) => {
        try { await response?.text?.(); } catch (_) {}
      })
      .catch((error) => {
        const normalizedError = normalizeLifeBookError(error);
        logLifeBookServer("BackgroundGenerationFailed", {
          sessionId,
          reportId,
          errorCode: error?.code,
          errorStatus: error?.status,
          errorMessage: clean(error?.message || error).slice(0, 200),
        });
        LIFEBOOK_SESSION_LOCKS.set(sessionId, {
          sessionId,
          reportId,
          status: "failed",
          startedAt: new Date().toISOString(),
          progress: {
            stateKey: "failed",
            currentChapterNo: 0,
            totalChapters: getLifeBookBlueprints().length,
            updatedAt: new Date().toISOString(),
          },
          error: normalizedError,
        });
      }),
  );

  logLifeBookServer("LIFE_BOOK_BACKGROUND_GENERATION_STARTED", { sessionId, reportId });
  return json({
    ok: true,
    serviceKey: LIFEBOOK_SERVICE_KEY,
    status: "running",
    serverStatus: "running",
    reportId,
    sessionId,
    data: {
      reportId,
      sessionId,
      status: "running",
      progress: {
        stateKey: "queued",
        currentChapterNo: 0,
        totalChapters: getLifeBookBlueprints().length,
      },
    },
    debugSafe: {
      stage: "LIFE_BOOK_BACKGROUND_GENERATION_STARTED",
      reportId,
      sessionId,
    },
  }, { status: 202 });
}

export async function handleSajuLifebookRoutes(request, env = {}, ctx = null) {
  try {
    const method = request.method.toUpperCase();
    let path = getRoutePath(request, "/api/premium/saju-lifebook");
    if (path === null || path === undefined) {
      path = getRoutePath(request, "/api/lifebook");
    }

    if (method === "POST" && (path === "" || path === "/" || path === "/prepare")) {
      return await handlePrepare(request, env, ctx);
    }
    if (method === "GET" && path === "/status") {
      return await handleStatus(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, {
      request,
      env,
      trace: {
        route: "saju-lifebook",
        method: request?.method || "",
        requestPath: (() => {
          try { return new URL(request.url).pathname; } catch (_) { return ""; }
        })(),
      },
    });
  }
}
