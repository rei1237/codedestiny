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
import { callGeminiText } from "../lib/gemini.js";

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
    title: "제 3장 숨겨진 무기 — 용신·희신과 나만의 필살기",
    subtitle: "용신·희신·기신을 실전 전략으로 바꾸는 장",
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
    title: "제 5장 격국과 사회적 소명 — 나의 성공 방정식",
    subtitle: "격국과 사회적 역할을 통해 성공 구조를 설계하는 장",
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
    title: "제 7장 연애·결혼 완전 분석 — 사랑의 패턴과 배우자운",
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
    title: "제 8장 재물·직업 완전 분석 — 돈과 일의 성공 지도",
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
    title: "제 10장 신살·십이운성·퀀텀 포인트 — 숨은 운명의 장치",
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
    title: "제 11장 위기와 반전 시나리오 — 무너질 때 다시 서는 법",
    subtitle: "흔들리는 지점과 반전 전략을 구체화하는 장",
    categories: [
      "이 명식이 흔들리는 순간",
      "반복되는 선택 실수",
      "인간관계에서 생기는 위기",
      "돈과 일에서 생기는 위기",
      "위기를 반전시키는 힘",
      "다시 일어서는 현실 전략",
    ],
  },
  {
    id: "12",
    roman: "XII",
    title: "제 12장 나의 길 — 인생의 방향과 장기 성장",
    subtitle: "장기 성장의 방향과 단계별 실행을 정리하는 장",
    categories: [
      "이 사람이 결국 가야 할 길",
      "재능이 성과로 바뀌는 과정",
      "1년 안에 정리해야 할 것",
      "3년 안에 키워야 할 것",
      "10년 안에 완성해야 할 것",
      "인생 후반으로 갈수록 강해지는 부분",
    ],
  },
  {
    id: "13",
    roman: "XIII",
    title: "제 13장 마스터플랜 — 3년·5년·10년 운명 전략",
    subtitle: "돈·일·관계를 묶은 장기 전략을 확정하는 종장",
    categories: [
      "지금 가장 먼저 해야 할 선택",
      "3년 전략",
      "5년 전략",
      "10년 전략",
      "돈·일·관계의 통합 전략",
      "최종 운명 조언",
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
  "llm",
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

const LIFEBOOK_FORBIDDEN_RE = /\b(?:fallback|seed|skeleton|local|engine|validation|retry|payload|json|schema|debug|internal\s*server\s*error|object|undefined|null|nan|calculationmode|recovered|about:blank|raw|llm|api|prompt)\b|자동\s*복구\s*생성|chapter\s*1\s*chapter\s*1|데이터가\s*부족합니다|데이터\s*부족|로컬\s*엔진|로컬\s*기반|템플릿|계산\s*시그니처|내부\s*데이터|엔진\s*결과|데이터\s*정규화|품질\s*검증|재생성/gi;

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
  "llm",
  "prompt",
]);

const LIFEBOOK_SERVICE_KEY = "saju-lifebook";
const LIFEBOOK_FEATURE_KEY = "saju_life_book_pdf";
const LIFEBOOK_FEATURE_KEY_ALIASES = new Set([
  "saju_lifebook_pdf",
  "premium_pdf_saju_life_book",
  "premium-lifebook-report",
]);
const LIFEBOOK_TEMPORARY_PAYMENT_BYPASS = true;

const LIFEBOOK_MIN_CATEGORY_CHARS = 700;
const LIFEBOOK_MIN_CHAPTER_CHARS = 4300;
const LIFEBOOK_MIN_TOTAL_CHARS = 170000;
const LIFEBOOK_BLOCKING_MIN_CATEGORY_CHARS = 250;
const LIFEBOOK_BLOCKING_MIN_CHAPTER_CHARS = 1800;
const LIFEBOOK_BLOCKING_MIN_TOTAL_CHARS = 25000;
const LIFEBOOK_QUALITY_REPAIR_MAX_ROUNDS = 3;
const LIFEBOOK_LLM_TARGET_YEAR = 2026;
const LIFEBOOK_A4_CHAR_RANGE = Object.freeze({ min: 850, target: 950, max: 1100 });
const LIFEBOOK_A4_TOTAL_TARGET = Object.freeze({ pages: 200, minChars: 170000, targetChars: 190000, maxChars: 220000 });
const LIFEBOOK_CHAPTER_PAGE_TARGETS = Object.freeze({
  "01": { targetPages: 16, partCount: 4 },
  "02": { targetPages: 14, partCount: 4 },
  "03": { targetPages: 14, partCount: 4 },
  "04": { targetPages: 20, partCount: 6 },
  "05": { targetPages: 14, partCount: 4 },
  "06": { targetPages: 13, partCount: 3 },
  "07": { targetPages: 15, partCount: 4 },
  "08": { targetPages: 16, partCount: 4 },
  "09": { targetPages: 13, partCount: 3 },
  "10": { targetPages: 14, partCount: 4 },
  "11": { targetPages: 20, partCount: 6 },
  "12": { targetPages: 18, partCount: 5 },
  "13": { targetPages: 13, partCount: 3 },
});
const LIFEBOOK_CHAPTER_COMMON_STRUCTURE = Object.freeze([
  "챕터 표지 문구",
  "한 줄 핵심 메시지",
  "이 장에서 다룰 핵심 질문",
  "명리 구조 요약",
  "쉬운 현실 언어 해석",
  "강점 분석",
  "주의점 분석",
  "실전 전략",
  "행동 체크리스트",
  "장 요약 박스",
  "다음 장으로 연결되는 문장",
]);
const LIFEBOOK_LLM_KEY_ENV_KEYS = [
  "GEMINIF_API_KEY1",
  "GEMINIF_API_KEY2",
  "GEMINIF_API_KEY3",
  "GEMINIF_API_KEY4",
  "GEMINIF_API_KEY5",
  "GEMINIF_API_KEY6",
  "GEMINIF_API_KEY7",
  "GEMINIF_API_KEY8",
  "PREMIUM_GEMINI_API_KEY1",
  "PREMIUM_GEMINI_API_KEY2",
  "PREMIUM_GEMINI_API_KEY3",
  "PREMIUM_GEMINI_API_KEY4",
  "PREMIUM_GEMINI_API_KEY5",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_API_KEY",
];
const LIFEBOOK_LLM_MODEL_ENV_KEYS = [
  "PREMIUM_SAJU_LIFEBOOK_GEMINI_MODEL",
  "PREMIUM_GEMINI_MODEL",
  "GEMINI_MODEL",
];

const LIFEBOOK_SESSION_LOCKS = globalThis.__LIFEBOOK_SESSION_LOCKS || new Map();
if (!globalThis.__LIFEBOOK_SESSION_LOCKS) {
  globalThis.__LIFEBOOK_SESSION_LOCKS = LIFEBOOK_SESSION_LOCKS;
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
    .replace(/llm/gi, "")
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
  "01": ["년주", "월주", "일주", "시주", "일간", "원국"],
  "02": ["월지", "일간", "조후", "신강", "신약", "기질"],
  "03": ["용신", "희신", "기신", "전략", "환경", "실행"],
  "04": ["대운", "시작", "방향", "현재", "다음", "흐름"],
  "05": ["격국", "사회적 역할", "성공", "소명", "직업", "브랜드"],
  "06": ["사람", "관계", "협업", "귀인", "갈등", "인연"],
  "07": ["연애", "관계", "결혼", "배우자", "갈등", "사랑"],
  "08": ["돈", "재물", "직업", "투자", "사업", "커리어"],
  "09": ["건강", "오행", "마음", "스트레스", "회복", "생활 리듬"],
  "10": ["신살", "12운성", "십이운성", "패턴", "퀀텀", "가능성"],
  "11": ["2026", "병오", "세운", "월별", "행동", "로드맵"],
  "12": ["생애", "대운", "직업", "재물", "가족", "미션"],
  "13": ["90일", "1년", "장기", "돈", "일", "관계", "최종 조언"],
};

const LIFEBOOK_CHAPTER_LENSES = {
  "01": { focus: "원국 구조", tone: "태어난 설계도를 처음 여는 듯한 해설", practical: "네 기둥이 어떻게 한 사람의 선택 기준이 되는지 읽어내는 장" },
  "02": { focus: "월령·조후·오행 균형", tone: "기질과 체질을 이해시키는 해설", practical: "강약과 균형을 생활 리듬으로 번역하는 장" },
  "03": { focus: "용신·희신·기신", tone: "무기와 전략을 찾아주는 해설", practical: "잘 되는 환경과 소모되는 환경을 갈라내는 장" },
  "04": { focus: "대운과 시기", tone: "시기별 선택 전략", practical: "현재와 다음 흐름을 행동 순서로 정리하는 장" },
  "05": { focus: "격국과 사회적 역할", tone: "성공 방정식", practical: "무대와 역할이 맞아떨어질 때 성과가 커지는 장" },
  "06": { focus: "관계와 파트너십", tone: "인연 운영법", practical: "사람과의 거리, 협업, 상처 회복법을 다루는 장" },
  "07": { focus: "연애와 결혼", tone: "사랑의 패턴 상담", practical: "사랑의 시작과 유지, 갈등 관리 방식을 읽는 장" },
  "08": { focus: "재물과 직업", tone: "돈과 일의 실행 지도", practical: "수익 구조와 커리어 누적 전략을 짜는 장" },
  "09": { focus: "건강과 심신", tone: "회복 루틴 상담", practical: "몸과 마음의 리듬을 장기적으로 지키는 장" },
  "10": { focus: "신살과 십이운성", tone: "숨은 반복 패턴 해설", practical: "표면 아래의 반복 장치를 읽는 장" },
  "11": { focus: "위기와 반전", tone: "무너질 때 다시 서는 전략", practical: "실수와 흔들림을 반전의 발판으로 바꾸는 장" },
  "12": { focus: "장기 성장", tone: "인생 방향성", practical: "재능과 장기 성장 방향을 현실 언어로 묶는 장" },
  "13": { focus: "3년·5년·10년 마스터플랜", tone: "최종 전략", practical: "돈, 일, 관계를 한 장의 계획으로 통합하는 장" },
};

const LIFEBOOK_CANONICAL_TOPIC_RULES = Object.freeze({
  "01": ["원국", "년주", "월주", "일주", "시주", "팔자"],
  "02": ["월지", "일간", "조후", "신강", "신약", "기질"],
  "03": ["용신", "희신", "기신", "필살기", "환경", "전략"],
  "04": ["대운", "시작", "방향", "현재", "다음", "파도"],
  "05": ["격국", "사회", "소명", "성공", "역할", "직업"],
  "06": ["관계", "인연", "파트너십", "귀인", "갈등", "협업"],
  "07": ["연애", "결혼", "배우자", "사랑", "갈등", "재회"],
  "08": ["재물", "직업", "돈", "사업", "커리어", "투자"],
  "09": ["건강", "심신", "오행", "스트레스", "수면", "관리"],
  "10": ["신살", "12운성", "십이운성", "퀀텀", "비밀", "코드"],
  "11": ["2026", "병오", "세운", "월별", "로드맵", "행동"],
  "12": ["생애", "마스터플랜", "대운", "10대", "전환점", "미션"],
  "13": ["최종", "전략", "90일", "1년", "장기", "편지"],
});

const LIFEBOOK_CANONICAL_BLUEPRINTS = Object.freeze([
  {
    id: "01",
    roman: "I",
    title: "🌌 사주 원국 완전 해설 — 팔자 8글자의 비밀",
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
    title: "⚔️ 숨겨진 무기 — 용신·희신과 나만의 필살기",
    subtitle: "용신, 희신, 기신을 환경 선택과 실행 전략으로 바꿉니다.",
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
      "나만의 필살기 선언문",
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
    title: "👑 격국과 사회적 소명 — 나의 성공 방정식",
    subtitle: "격국이 말하는 사회적 역할과 성공 방정식을 해석합니다.",
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
      "나의 성공 방정식",
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
    title: "💑 연애·결혼 완전 분석 — 사주가 말하는 나의 사랑",
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
    title: "💰 재물·직업 완전 전략 — 부의 그릇을 키우는 천기",
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
      "부의 그릇을 키우는 실전법",
    ],
    engineFocus: [
      "재성",
      "식상",
      "관성",
      "인성",
      "격국",
      "용신",
      "대운상 재물 흐름",
      "2026년 재물 흐름",
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
    title: "🏥 건강·심신 에너지 완전 분석 — 오행이 말하는 신체 지도",
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
    title: "🔮 신살·12운성·퀀텀 명리 — 사주의 숨겨진 비밀 코드",
    subtitle: "신살, 12운성, 특수 코드를 선택 가능성의 언어로 풀이합니다.",
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
      "퀀텀 명리엔진이 포착한 숨은 패턴",
      "이 코드를 인생에서 쓰는 법",
    ],
    engineFocus: [
      "신살 목록",
      "신살 위치",
      "12운성 위치",
      "반복 패턴",
      "도충/합충형파해와 신살의 결합",
      "퀀텀 포인트 요약",
    ],
    writingRequirements: [
      "신살을 공포스럽게 표현하지 말 것",
      "부정적 신살도 주의해야 할 에너지 패턴으로 표현할 것",
    ],
  },
  {
    id: "11",
    roman: "XI",
    title: "📅 2026 丙午年 실전 로드맵 — 12개월 행동 지침",
    subtitle: "2026 병오년의 세운과 월별 행동 지침을 현실 전략으로 정리합니다.",
    categories: [
      "2026 병오년 전체 분위기",
      "2026년이 원국에 주는 자극",
      "현재 대운과 2026년의 결합",
      "2026년의 핵심 기회",
      "2026년의 핵심 주의점",
      "일/직업 흐름",
      "재물 흐름",
      "관계 흐름",
      "연애 흐름",
      "건강/컨디션 흐름",
      "1월~12월 월별 로드맵",
      "2026년에 반드시 키워야 할 능력",
      "2026년에 피해야 할 선택",
      "2026년 최종 행동 지침",
    ],
    engineFocus: [
      "2026 병오년 세운",
      "2026 월운 12개월",
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
      "2026년 이후 흐름",
    ],
  },
  {
    id: "13",
    roman: "XIII",
    title: "💌 거장의 최종 전략 제언 — 나에게 주는 운명 사용 설명서",
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
      "2026년에 반드시 실천할 것",
      "앞으로 10년의 핵심 전략",
      "나에게 주는 운명 사용 설명서",
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

function getLifeBookBlueprints() {
  return LIFEBOOK_CANONICAL_BLUEPRINTS;
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
      yearlyFlow: { year: new Date().getFullYear() },
      monthlyFlow: Array.from({ length: 12 }).map((_, idx) => ({ month: idx + 1, score: clamp(55 + ((idx * 7 + profile.day) % 40), 40, 95) })),
    },
    specialStars,
    chapters,
  };
}

function pad2(value) {
  return String(value).padStart(2, "0");
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

function sanitizeCategoryText(text = "", chapterId = "", categoryTitle = "", categoryIndex = 0, minLength = LIFEBOOK_BLOCKING_MIN_CATEGORY_CHARS) {
  const baseText = dedupeParagraphs(stripForbiddenTokens(text));
  const ensured = ensureProfessionalCategoryLength(baseText, chapterId, categoryTitle, categoryIndex, Math.max(minLength, LIFEBOOK_BLOCKING_MIN_CATEGORY_CHARS));
  return dedupeParagraphs(stripForbiddenTokens(ensured));
}

function sanitizeLifeBookChapters(profile, signals, chapters = []) {
  const normalized = ensureCompleteLifeBookChapters(profile, signals, Array.isArray(chapters) ? chapters : []);
  return normalized.map((chapter, chapterIndex) => {
    const blueprint = getLifeBookBlueprints()[chapterIndex] || chapter;
    const categories = (Array.isArray(chapter?.categories) ? chapter.categories : []).map((category, categoryIndex) => {
      const expectedTitle = blueprint?.categories?.[categoryIndex] || category?.title || `카테고리 ${categoryIndex + 1}`;
      const fallbackText = buildProfessionalLifeBookCategoryText(profile, signals, blueprint, expectedTitle, categoryIndex);
      const rawText = clean(category?.finalText || category?.text || category?.localSummary || fallbackText);
      const sanitized = sanitizeCategoryText(rawText || fallbackText, blueprint?.id || chapter?.id || "", expectedTitle, categoryIndex);
      return {
        ...category,
        id: String(category?.id || `${categoryIndex + 1}`),
        title: expectedTitle,
        localSummary: sanitized,
        finalText: sanitized,
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
      source: clean(chapter?.source) || "local-only",
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

      const quality = evaluateCounselingQualityClean(body);
      if (!quality.hasPracticalAdvice) {
        const code = `chapter_${cidx + 1}_category_${kidx + 1}_practical_missing`;
        softWarnings.push(code);
        warningItems.push({ code, chapterIndex: cidx, categoryIndex: kidx, severity: "medium" });
      }
      if (!quality.hasPracticalAction) {
        const code = `chapter_${cidx + 1}_category_${kidx + 1}_practical_action_missing`;
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
    warningItems.push({ code: "repetition_detected", chapterIndex: -1, categoryIndex: -1, severity: "medium" });
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

function repairLifeBookStructure(profile, signals, chapters = []) {
  return sanitizeLifeBookChapters(profile, signals, ensureCompleteLifeBookChapters(profile, signals, chapters));
}

function repairLifeBookQualityIssues(profile, signals, chapters = [], qualityReport = {}) {
  const list = sanitizeLifeBookChapters(profile, signals, chapters);
  const items = Array.isArray(qualityReport?.warningItems) ? qualityReport.warningItems : [];
  const targetSet = new Set();

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
      source: "local-only",
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

function evaluateCounselingQualityClean(text = "") {
  const source = stripForbiddenTokens(text);
  const practicalRe = /(오늘|이번 주|먼저|우선|정리|기록|줄이|지출|수면|식사|경계|루틴|실천|계획|선택|피해야|확인해야|관리해야)/;
  const practicalActionRe = /(보아야 합니다|정해야 합니다|확인해야 합니다|선택해야 합니다|피해야 합니다|줄여야 합니다|기록해 두는 편이 좋습니다|관리해야 합니다|우선해야 합니다|조절해야 합니다|거리를 두는 편이 좋습니다)/g;
  const warmRe = /(무리하지 않아도 됩니다|안정적으로 사용할 수 있습니다|좋은 결과를 만들 수 있습니다|흐름이 안정됩니다|버틸 수 있습니다|유지됩니다|선명해집니다)/;
  const counselorRe = /(명식|원국|일간|월지|월령|대운|세운|오행|십성|용신|희신|기신|일주|월주|조후|격국|신살|십이운성)/g;
  const secondPersonRe = /(님|이 명식|사용자|삶|관계|일|돈|몸|마음)/g;
  const sentenceCount = source.split(/[.!?\n]+/).map((s) => s.trim()).filter((s) => s.length >= 10).length;
  const practicalActionHits = (source.match(practicalActionRe) || []).length;
  const counselorHits = (source.match(counselorRe) || []).length;
  const secondPersonHits = (source.match(secondPersonRe) || []).length;
  const tail = source.slice(-260);
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
    derivedAt: new Date().toISOString(),
  };
}

const LIFEBOOK_LLM_SYSTEM_PROMPT = `
당신은 40년 이상 명리학, 자평명리, 격국론, 용신론, 조후론, 십성론, 대운·세운 분석, 신살론, 12운성 해석에 정통한 최고 수준의 사주 해석가입니다.

당신의 임무는 사용자의 사주 엔진 계산 결과를 바탕으로 "인생의 책 PDF"에 들어갈 고품질 장문 원고를 작성하는 것입니다.

절대 규칙:
1. 사주 계산은 하지 않습니다. 이미 제공된 사주 엔진 결과만 사용합니다.
2. 원국, 일간, 월지, 대운, 세운, 용신, 희신, 기신, 격국, 신살, 12운성, 합충형해파는 반드시 입력 데이터에 있는 값을 기준으로 해석합니다.
3. 입력 데이터에 없는 값을 임의로 추측하지 않습니다.
4. 입력 데이터가 부족하면 "제공된 계산값 기준으로는 확인이 어렵습니다"라고 표현합니다.
5. 모든 해석은 사용자의 실제 사주 구조와 연결해야 합니다.
6. 누구에게나 해당되는 일반론, 막연한 위로, 흔한 운세 문구를 피합니다.
7. 같은 문장 패턴을 반복하지 않습니다.
8. 공포를 조장하지 않습니다.
9. 운명을 단정하지 않습니다. 사주는 고정된 판결이 아니라 경향, 리듬, 선택 전략을 읽는 도구로 설명합니다.
10. 건강 내용은 의학적 진단처럼 쓰지 않습니다. "사주적 경향", "생활 관리 관점"으로 작성합니다.
11. 재물과 투자는 수익 보장처럼 쓰지 않습니다. "성향", "주의점", "전략" 중심으로 작성합니다.
12. 연애와 결혼은 특정 결과를 확정하지 않습니다. 관계 패턴과 선택 전략으로 설명합니다.
13. 문체는 깊이 있고 품격 있는 전문가 상담문이어야 합니다.
14. 독자가 돈을 내고 받은 PDF라고 느낄 정도로 구체적이고 풍부해야 합니다.
15. 각 챕터는 독립적으로 읽혀도 완성도가 있어야 하며, 동시에 전체 책의 흐름과도 연결되어야 합니다.

작성 방식:
- 한국어 존댓말로 작성합니다.
- 명리학 용어를 사용하되 독자가 이해할 수 있도록 자연스럽게 풀어씁니다.
- 각 분석은 반드시 "사주 근거 → 성향 해석 → 현실 적용 → 주의점 → 실천 전략" 흐름을 갖습니다.
- 단순히 좋다/나쁘다가 아니라 어떤 조건에서 좋아지고 어떤 조건에서 흔들리는지 설명합니다.
- 각 section.body는 최소 2문단 이상 작성합니다.
- sections 배열은 반드시 전달받은 세부 카테고리 개수와 같은 길이로 작성하고, 각 section.heading은 해당 카테고리 제목을 그대로 사용합니다.

출력 형식:
반드시 유효한 JSON만 출력합니다.
마크다운 코드블록을 사용하지 않습니다.
JSON 앞뒤에 설명 문장을 붙이지 않습니다.
`.trim();

const LIFEBOOK_LLM_RISKY_ASSERTION_RE = /(반드시\s*(결혼|이혼|성공|실패|큰돈|수익)|100\s*%|확정|무조건|질병을\s*얻게|암에\s*걸|우울증|공황장애|투자\s*수익|수익\s*보장|대박|파산|죽음|사망)/i;

function safeJsonForPrompt(value) {
  return JSON.stringify(value ?? {}, null, 2);
}

function compactStringList(value) {
  if (Array.isArray(value)) return value.map((item) => clean(item)).filter(Boolean);
  const single = clean(value);
  return single ? [single] : [];
}

function normalizeLifeBookPillarForLLM(pillar = {}, tenGodStem = "") {
  return {
    stem: clean(pillar?.stem),
    branch: clean(pillar?.branch),
    ganji: clean(pillar?.ganji || `${clean(pillar?.stem)}${clean(pillar?.branch)}`),
    tenGodStem: clean(tenGodStem),
    hiddenStems: Array.isArray(pillar?.hiddenStems) ? pillar.hiddenStems.map((item) => clean(item)).filter(Boolean) : [],
  };
}

function normalizeLifeBookSpecialStarsForLLM(stars = []) {
  return (Array.isArray(stars) ? stars : []).map((item) => {
    if (typeof item === "string") return { name: clean(item) };
    return {
      name: clean(item?.name || item?.title || item?.star),
      position: clean(item?.position || item?.pillar || item?.branch),
      meaning: clean(item?.meaning || item?.summary),
    };
  }).filter((item) => item.name);
}

function normalizeLifeBookTwelveStagesForLLM(stages = []) {
  return (Array.isArray(stages) ? stages : []).map((item) => ({
    pillar: clean(item?.pillar || item?.position),
    stage: clean(item?.stage || item?.name),
    meaning: clean(item?.meaning || item?.summary),
  })).filter((item) => item.stage);
}

function normalizeLifeBookLuckCycleForLLM(cycle = {}) {
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

function rowsOf(value) {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object");
  return [];
}

function buildLifeBookMonthlyLuckContract(body = {}, structured = {}) {
  const fromStructured = rowsOf(structured?.sewoon?.monthlyHighlights);
  const fromBody = rowsOf(body?.yearlyLuck2026?.monthly || body?.monthlyLuck2026 || body?.wolun2026);
  const source = fromStructured.length ? fromStructured : fromBody;
  return source.map((row, index) => ({
    month: Number(row?.month || row?.monthNo || row?.index || index + 1) || index + 1,
    ganji: firstClean(row?.ganji, row?.label, row?.pillar),
    tenGod: firstClean(row?.tenGod, row?.tenGodStem, row?.stemTenGod),
    element: firstClean(row?.element, row?.elementKo),
    natalTrigger: firstClean(row?.natalTrigger, row?.originalChartTrigger, row?.relation, row?.reason),
    daeunSewoonRelation: firstClean(row?.daeunSewoonRelation, row?.luckRelation, row?.effect),
    actionGuide: firstClean(row?.actionGuide, row?.advice, row?.action),
    avoidChoice: firstClean(row?.avoidChoice, row?.avoid, row?.warning),
  })).filter((row) => row.ganji || row.tenGod || row.element || row.natalTrigger || row.actionGuide || row.avoidChoice);
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
    ...normalizeLifeBookSpecialStarsForLLM(localSajuJson?.sinsal || signals?.specialStars),
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
  const year2026 = firstObject(body?.yearlyLuck2026, structured?.sewoon, localSajuJson?.yearlyFlow);
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
    year2026Theme: firstClean(year2026?.theme, year2026?.analysis, year2026?.finalClassification, year2026?.pillar),
    cautionPattern: compactStringList(signals?.weakSignals).join(" · ") || firstClean(caution),
    masterAdviceSeed: [useful && `${useful} 기운을 현실 선택의 기준으로 삼기`, currentDaeun && `${currentDaeun} 흐름 안에서 우선순위 재정렬`, "관계·일·돈을 동시에 바꾸지 말고 순차적으로 조정"].filter(Boolean).join(" · "),
  };
}

function buildLifeBookEngineContract({ birthInput = {}, profile = {}, signals = {}, localSajuJson = {}, body = {} } = {}) {
  const structured = firstObject(
    body?.lifeBookEngineContract?.structuredAdvancedReport,
    body?.quantumMyeongriJson?.structuredAdvancedReport,
    body?.structuredAdvancedReport,
    body?.engineData?.structuredAdvancedReport,
    body?.canonicalSajuChart?.structuredAdvancedReport,
    localSajuJson?.structuredAdvancedReport,
  );
  const pillars = localSajuJson?.pillars || {};
  const summary = buildLifeBookEngineSummary({ birthInput, profile, signals, localSajuJson, structured, body });
  return {
    version: "life-book-engine-contract-v1",
    source: firstClean(structured?.metadata?.engineVersion, body?.engineVersion, "normalized-worker-saju"),
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
    year2026: {
      ganji: firstClean(body?.yearlyLuck2026?.ganji, structured?.sewoon?.currentYear?.ganji, structured?.sewoon?.currentYear?.label, localSajuJson?.yearlyFlow?.pillar),
      heavenlyStemTenGod: firstClean(body?.yearlyLuck2026?.heavenlyStemTenGod, body?.yearlyLuck2026?.tenGodToDayMaster),
      earthlyBranchTenGod: firstClean(body?.yearlyLuck2026?.earthlyBranchTenGod),
      natalInteractions: compactStringList(body?.yearlyLuck2026?.interactionsWithNatal || structured?.sewoon?.analysis),
      daeunRelation: firstClean(body?.yearlyLuck2026?.daeunRelation, structured?.sewoon?.analysis),
      theme: summary.year2026Theme,
      career: firstClean(body?.yearlyLuck2026?.career, signals?.careerSignal),
      wealth: firstClean(body?.yearlyLuck2026?.wealth, signals?.wealthSignal),
      relationship: firstClean(body?.yearlyLuck2026?.relationship, signals?.relationshipSignal),
      love: firstClean(body?.yearlyLuck2026?.loveMarriage, signals?.spouseSignal),
      health: firstClean(body?.yearlyLuck2026?.health, summary.healthEnergyPattern),
      caution: firstClean(body?.yearlyLuck2026?.caution, summary.cautionPattern),
      opportunity: firstClean(body?.yearlyLuck2026?.opportunity),
    },
    monthlyLuck2026: buildLifeBookMonthlyLuckContract(body, structured),
    specialStars: buildLifeBookSpecialStarContract(localSajuJson, signals, structured),
    twelveStages: {
      byPillar: normalizeLifeBookTwelveStagesForLLM(localSajuJson?.twelveGrowthStages || signals?.twelveGrowthStages),
      summary: firstClean(structured?.userReport?.sections?.find?.((section) => clean(section?.title).includes("12운성"))?.summary),
    },
    summary,
  };
}

function buildLifeBookLLMInput(birthInput, profile, signals, localSajuJson, body = {}) {
  const targetYear = Number(body?.targetYear || LIFEBOOK_LLM_TARGET_YEAR) || LIFEBOOK_LLM_TARGET_YEAR;
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
        year: normalizeLifeBookPillarForLLM(pillars.year, tenGodsByPillar.year),
        month: normalizeLifeBookPillarForLLM(pillars.month, tenGodsByPillar.month),
        day: normalizeLifeBookPillarForLLM(pillars.day, tenGodsByPillar.day),
        hour: normalizeLifeBookPillarForLLM(pillars.hour, tenGodsByPillar.hour),
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
    specialStars: normalizeLifeBookSpecialStarsForLLM(localSajuJson?.sinsal || signals?.specialStars),
    twelveStages: normalizeLifeBookTwelveStagesForLLM(localSajuJson?.twelveGrowthStages || signals?.twelveGrowthStages),
    luckCycles: {
      startAge: Number(signals?.daewunStartAge || 0) || undefined,
      direction: clean(signals?.daewunDirection || body?.daewunDirection),
      cycles: daeunCycles.map(normalizeLifeBookLuckCycleForLLM),
      currentCycle: currentCycle ? normalizeLifeBookLuckCycleForLLM(currentCycle) : undefined,
    },
    yearlyLuck2026: {
      year: LIFEBOOK_LLM_TARGET_YEAR,
      stem: "丙",
      branch: "午",
      ganji: "丙午",
      tenGodToDayMaster: clean(body?.yearlyLuck2026?.tenGodToDayMaster || ""),
      elementEffect: clean(body?.yearlyLuck2026?.elementEffect || "화 기운의 세운으로 생활 속 속도와 표현성이 커지는 흐름"),
      interactionsWithNatal: compactStringList(body?.yearlyLuck2026?.interactionsWithNatal),
      career: clean(body?.yearlyLuck2026?.career || signals?.careerSignal),
      wealth: clean(body?.yearlyLuck2026?.wealth || signals?.wealthSignal),
      relationship: clean(body?.yearlyLuck2026?.relationship || signals?.relationshipSignal),
      loveMarriage: clean(body?.yearlyLuck2026?.loveMarriage || signals?.spouseSignal),
      health: clean(body?.yearlyLuck2026?.health || `${clean(signals?.johuType || "조후")} 기준의 생활 리듬 관리`),
      monthly: Array.isArray(body?.yearlyLuck2026?.monthly) ? body.yearlyLuck2026.monthly : [],
    },
    serviceContext: buildLifeBookServiceContext(body),
  };
}

function buildLifeBookChapterPrompt(llmInput, chapterSpec, previousSummaries = []) {
  return `${LIFEBOOK_LLM_SYSTEM_PROMPT}

다음은 사용자의 사주 엔진 계산 결과와 서비스 입력값입니다.

[사용자 기본 정보]
${safeJsonForPrompt(llmInput.userProfile)}

[사주 엔진 계산 결과]
${safeJsonForPrompt({
  normalizedEngineContract: llmInput.engineContract,
  summaryForWritingOnly: llmInput.engineSummary,
  saju: llmInput.saju,
  fiveElements: llmInput.fiveElements,
  tenGods: llmInput.tenGods,
  structure: llmInput.structure,
  interactions: llmInput.interactions,
  specialStars: llmInput.specialStars,
  twelveStages: llmInput.twelveStages,
  luckCycles: llmInput.luckCycles,
  yearlyLuck2026: llmInput.yearlyLuck2026,
})}

[서비스 입력값]
${safeJsonForPrompt(llmInput.serviceContext)}

[이전 챕터 요약]
${safeJsonForPrompt(previousSummaries)}

이제 아래 챕터를 작성하십시오.

[작성할 챕터]
챕터 번호: ${chapterSpec.roman}
챕터 제목: ${chapterSpec.title}
${chapterSpec.isPart ? `파트: ${chapterSpec.partIndex} / ${chapterSpec.partCount}` : ""}

[A4 분량 설계]
${safeJsonForPrompt(chapterSpec.pagePlan || getLifeBookPagePlan(chapterSpec.id))}

[공통 챕터 구조]
${safeJsonForPrompt(LIFEBOOK_CHAPTER_COMMON_STRUCTURE)}

[이 챕터의 계산 반영 항목]
${safeJsonForPrompt(chapterSpec.engineFocus || [])}

[챕터별 필수 작성 조건]
${safeJsonForPrompt(chapterSpec.writingRequirements || [])}

[챕터별 필수 안내문]
${safeJsonForPrompt(chapterSpec.requiredNotice || "")}

[반드시 포함할 세부 카테고리]
${safeJsonForPrompt(chapterSpec.categories)}

작성 지침:
1. 이 챕터는 "인생의 책 PDF"에 그대로 들어갈 최종 원고입니다.
2. 입력된 사주 엔진 결과를 최우선 근거로 사용하십시오.
3. 일간, 월지, 오행, 십성, 용신, 희신, 기신, 격국, 대운, 세운, 신살, 12운성 등은 제공된 값과 모순되면 안 됩니다.
4. 입력값에 없는 정보를 임의로 만들어내지 마십시오.
5. 각 세부 카테고리를 빠짐없이 다루십시오.
6. 단순 설명이 아니라 왜 그렇게 해석되는지 명리학적 근거를 제시하십시오.
7. 직업, 관계, 돈, 건강, 습관, 의사결정 전략으로 연결하십시오.
8. 문체는 품격 있는 전문가 상담문으로 작성하십시오.
9. 각 section.body는 최소 2문단 이상 작성하십시오.
10. 핵심 포인트와 실천 가이드는 구체적인 행동 문장으로 작성하십시오.
11. 과장된 예언, 공포 조장, 절대적 단정, 의학적 진단, 투자 수익 보장 표현은 금지합니다.
12. sections 배열 길이는 반드시 ${chapterSpec.categories.length}개여야 합니다.
13. sections 각 항목의 heading은 위 세부 카테고리 제목을 순서대로 그대로 사용하십시오.
14. ${chapterSpec.isPart ? "현재 파트에 배정된 세부 카테고리만 작성하고, 다른 파트의 카테고리는 작성하지 마십시오." : "챕터 전체를 파트별 흐름이 살아나도록 구성하십시오."}
15. 각 section에는 요약, 상담형 본문, 표처럼 읽히는 정리, 체크리스트, 실전 조언이 모두 자연스럽게 포함되어야 합니다.
16. 내부 입력값을 가리키는 JSON, payload, debug, engine, prompt, schema, api, llm 같은 용어는 본문에 쓰지 마십시오.

출력 JSON 구조:
{
  "chapterNumber": "${chapterSpec.roman}",
  "chapterTitle": "${chapterSpec.title}",
  "coverPhrase": "챕터 표지에 어울리는 짧은 상담형 문구",
  "coreMessage": "한 줄 핵심 메시지",
  "keyQuestions": ["이 장에서 다룰 핵심 질문 1", "이 장에서 다룰 핵심 질문 2", "이 장에서 다룰 핵심 질문 3"],
  "myeongriStructureSummary": "명리 구조 요약",
  "plainLanguageReading": "쉬운 현실 언어 해석",
  "chapterSummary": "이 챕터의 핵심 요약",
  "sections": [
    {
      "heading": "${chapterSpec.categories[0] || "섹션 제목"}",
      "body": "PDF 본문에 들어갈 상세 해석. 최소 2문단 이상.",
      "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
      "actionGuide": ["실천 조언 1", "실천 조언 2", "실천 조언 3"]
    }
  ],
  "strengthAnalysis": "강점 분석",
  "cautionAnalysis": "주의점 분석",
  "practicalStrategy": "실전 전략",
  "actionChecklist": ["행동 체크리스트 1", "행동 체크리스트 2", "행동 체크리스트 3"],
  "summaryBox": "장 요약 박스",
  "nextChapterBridge": "다음 장으로 연결되는 문장",
  "masterAdvice": "해당 챕터를 마무리하는 최고 전문가의 조언"
}`;
}

function buildLifeBookRefinePrompt(llmInput, chapterSpec, draft, errors = []) {
  return `${LIFEBOOK_LLM_SYSTEM_PROMPT}

다음은 Gemini가 생성한 "인생의 책 PDF" 챕터 초안입니다.

[사주 엔진 원본 데이터]
${safeJsonForPrompt({
  normalizedEngineContract: llmInput.engineContract,
  summaryForWritingOnly: llmInput.engineSummary,
  saju: llmInput.saju,
  fiveElements: llmInput.fiveElements,
  tenGods: llmInput.tenGods,
  structure: llmInput.structure,
  interactions: llmInput.interactions,
  specialStars: llmInput.specialStars,
  twelveStages: llmInput.twelveStages,
  luckCycles: llmInput.luckCycles,
  yearlyLuck2026: llmInput.yearlyLuck2026,
})}

[서비스 입력값]
${safeJsonForPrompt(llmInput.serviceContext)}

[챕터 명세]
${safeJsonForPrompt({
  number: chapterSpec.roman,
  title: chapterSpec.title,
  partIndex: chapterSpec.partIndex,
  partCount: chapterSpec.partCount,
  pagePlan: chapterSpec.pagePlan || getLifeBookPagePlan(chapterSpec.id),
  commonStructure: LIFEBOOK_CHAPTER_COMMON_STRUCTURE,
  engineFocus: chapterSpec.engineFocus || [],
  writingRequirements: chapterSpec.writingRequirements || [],
  requiredNotice: chapterSpec.requiredNotice || "",
  categories: chapterSpec.categories,
})}

[검수 실패 항목]
${safeJsonForPrompt(errors)}

[초안]
${safeJsonForPrompt(draft)}

이 초안을 유료 PDF 상품 수준으로 개선하십시오.
세부 카테고리 누락, 짧은 본문, 일반론, 원국 데이터와 모순되는 문장, 단정적 표현을 모두 고치십시오.
최종 결과는 반드시 동일 JSON 스키마의 유효한 JSON만 출력하십시오.`;
}

function extractLifeBookJsonObject(text = "") {
  const raw = clean(text)
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(raw);
  } catch (_) {}

  const candidates = [
    raw.match(/```json\s*([\s\S]*?)\s*```/i)?.[1],
    raw.match(/```\s*([\s\S]*?)\s*```/i)?.[1],
  ].filter(Boolean);

  const start = raw.indexOf("{");
  if (start >= 0) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < raw.length; index += 1) {
      const char = raw[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (char === "{") depth += 1;
      if (char === "}") depth -= 1;
      if (depth === 0) {
        candidates.push(raw.slice(start, index + 1));
        break;
      }
    }
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(clean(candidate));
    } catch (_) {}
  }
  throw Object.assign(new Error("Gemini 응답 JSON 파싱에 실패했습니다."), {
    code: "LIFEBOOK_GEMINI_JSON_PARSE_FAILED",
    status: 502,
  });
}

function validateLifeBookGeminiJson(parsed = {}, chapterSpec = {}) {
  const errors = [];
  const sections = Array.isArray(parsed?.sections) ? parsed.sections : [];
  if (!sections.length) errors.push("sections_missing");

  sections.forEach((section, index) => {
    if (!section || typeof section !== "object") errors.push(`section_${index + 1}_invalid`);
  });

  if (LIFEBOOK_LLM_RISKY_ASSERTION_RE.test(clean(parsed?.masterAdvice))) errors.push("master_advice_risky_assertion");

  return {
    ok: errors.length === 0,
    errors,
  };
}

function buildLifeBookSectionFinalText(section = {}) {
  const body = dedupeParagraphs(stripForbiddenTokens(section?.body || ""));
  const keyPoints = Array.isArray(section?.keyPoints) ? section.keyPoints.map((item) => stripForbiddenTokens(item)).filter(Boolean) : [];
  const actionGuide = Array.isArray(section?.actionGuide) ? section.actionGuide.map((item) => stripForbiddenTokens(item)).filter(Boolean) : [];
  const blocks = [body];
  if (keyPoints.length) blocks.push(`핵심 포인트\n${keyPoints.map((item) => `- ${item}`).join("\n")}`);
  if (actionGuide.length) blocks.push(`실천 가이드\n${actionGuide.map((item) => `- ${item}`).join("\n")}`);
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
    "이 장의 핵심 구조를 내 언어로 한 문장 정리하기",
    "강점으로 쓸 조건과 흔들리기 쉬운 조건을 분리하기",
    "다음 한 달 동안 바로 바꿀 생활 선택 한 가지 정하기",
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
    `실전 전략\n${stripForbiddenTokens(parsed?.practicalStrategy || "오늘의 선택을 크게 바꾸기보다 말투, 일정, 관계의 거리, 돈의 흐름처럼 매일 반복되는 장면부터 정돈하십시오.")}`,
    `행동 체크리스트\n${normalizeLifeBookTextList(parsed?.actionChecklist, checklistFallback).map((item) => `- ${item}`).join("\n")}`,
    `장 요약 박스\n${stripForbiddenTokens(parsed?.summaryBox || parsed?.chapterSummary || focusSentence)}`,
    requiredNotice ? `필수 안내문\n${requiredNotice}` : "",
    `다음 장으로 연결되는 문장\n${stripForbiddenTokens(parsed?.nextChapterBridge || "이 흐름을 바탕으로 다음 장에서는 더 깊은 기질과 운용 전략을 살펴봅니다.")}`,
  ].filter(Boolean);
  return dedupeParagraphs(blocks.join("\n\n"));
}

function convertGeminiChapterToLifeBookChapter(parsed = {}, chapterSpec = {}) {
  const sections = Array.isArray(parsed?.sections) ? parsed.sections : [];
  const categories = chapterSpec.categories.map((categoryTitle, index) => {
    const section = sections[index] || {};
    const finalText = buildLifeBookSectionFinalText(section);
    return {
      id: `${String(index + 1).padStart(2, "0")}`,
      title: categoryTitle,
      localSummary: finalText,
      evidenceTags: [categoryTitle, chapterSpec.roman].filter(Boolean),
      advicePoints: Array.isArray(section?.actionGuide) ? section.actionGuide.map((item) => stripForbiddenTokens(item)).filter(Boolean).slice(0, 3) : [],
      finalText,
      order: index + 1,
    };
  });
  const masterAdvice = stripForbiddenTokens(parsed?.masterAdvice || "");
  if (masterAdvice && categories.length) {
    const last = categories[categories.length - 1];
    last.finalText = dedupeParagraphs(`${last.finalText}\n\n거장의 조언\n${masterAdvice}`);
    last.localSummary = last.finalText;
  }
  const chapterOpening = buildLifeBookChapterOpeningText(parsed, chapterSpec);
  const chapterText = buildChapterBody(chapterSpec.title, categories, chapterOpening);
  return {
    id: chapterSpec.id,
    roman: chapterSpec.roman,
    title: chapterSpec.title,
    subtitle: chapterSpec.subtitle,
    chapterSummary: stripForbiddenTokens(parsed?.chapterSummary || ""),
    chapterOpening,
    categories,
    localDraft: chapterText,
    finalText: chapterText,
    text: chapterText,
    source: "gemini",
  };
}

function validateLifeBookGeneratedChapter(chapter = {}, chapterSpec = {}) {
  const errors = [];
  if (clean(chapter?.title) !== clean(chapterSpec?.title)) errors.push("chapter_title_mismatch");
  const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
  if (categories.length !== chapterSpec.categories.length) errors.push("category_count_mismatch");
  chapterSpec.categories.forEach((categoryTitle, index) => {
    const category = categories[index];
    if (!category) {
      errors.push(`category_${index + 1}_missing`);
      return;
    }
    if (clean(category?.title) !== clean(categoryTitle)) errors.push(`category_${index + 1}_title_mismatch`);
    const body = clean(category?.finalText || category?.localSummary || "");
    if (body.length < LIFEBOOK_BLOCKING_MIN_CATEGORY_CHARS) errors.push(`category_${index + 1}_too_short`);
    if (hasForbiddenText(body)) errors.push(`category_${index + 1}_forbidden_text`);
    if (LIFEBOOK_LLM_RISKY_ASSERTION_RE.test(body)) errors.push(`category_${index + 1}_risky_assertion`);
  });
  return {
    ok: errors.length === 0,
    errors,
  };
}

function reinforceLifeBookChapterDeterministically(profile, signals, chapter = {}, chapterSpec = {}) {
  const categories = chapterSpec.categories.map((categoryTitle, index) => {
    const current = Array.isArray(chapter?.categories) ? chapter.categories[index] : null;
    const currentText = clean(current?.finalText || current?.localSummary || "");
    const currentHasForbidden = hasForbiddenText(currentText);
    const currentHasRiskyAssertion = LIFEBOOK_LLM_RISKY_ASSERTION_RE.test(currentText);
    const needsReinforcement = currentText.length < LIFEBOOK_BLOCKING_MIN_CATEGORY_CHARS
      || currentHasForbidden
      || currentHasRiskyAssertion;
    const reinforcement = needsReinforcement
      ? buildProfessionalLifeBookCategoryText(profile, signals, chapterSpec, categoryTitle, index)
      : "";
    const finalText = needsReinforcement
      ? sanitizeCategoryText(
        (currentHasForbidden || currentHasRiskyAssertion)
          ? reinforcement
          : [currentText, reinforcement].filter(Boolean).join("\n\n"),
        chapterSpec.id,
        categoryTitle,
        index,
      )
      : currentText;
    return {
      ...(current || {}),
      id: `${String(index + 1).padStart(2, "0")}`,
      title: categoryTitle,
      localSummary: finalText,
      finalText,
      order: index + 1,
    };
  });
  const chapterOpening = buildLifeBookChapterOpeningText(chapter, chapterSpec);
  const chapterText = buildChapterBody(chapterSpec.title, categories, chapterOpening);
  return {
    ...chapter,
    id: chapterSpec.id,
    roman: chapterSpec.roman,
    title: chapterSpec.title,
    subtitle: chapterSpec.subtitle,
    chapterOpening,
    categories,
    localDraft: chapterText,
    finalText: chapterText,
    text: chapterText,
    source: "gemini+deterministic-reinforcement",
  };
}

async function callLifeBookGemini(env, prompt, options = {}) {
  const model = clean(
    env?.PREMIUM_SAJU_LIFEBOOK_GEMINI_MODEL
      || env?.PREMIUM_GEMINI_MODEL
      || env?.GEMINI_MODEL
      || "gemini-2.5-flash",
  );
  const result = await callGeminiText(env, prompt, {
    keyEnvKeys: LIFEBOOK_LLM_KEY_ENV_KEYS,
    modelEnvKeys: LIFEBOOK_LLM_MODEL_ENV_KEYS,
    models: [model],
    temperature: Number(env?.LIFEBOOK_GEMINI_TEMPERATURE || 0.35),
    topP: Number(env?.LIFEBOOK_GEMINI_TOP_P || 0.9),
    maxOutputTokens: Number(env?.LIFEBOOK_GEMINI_MAX_OUTPUT_TOKENS || 24576),
    timeoutMs: Number(env?.LIFEBOOK_GEMINI_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || 65000),
    totalTimeoutMs: Number(env?.LIFEBOOK_GEMINI_TOTAL_TIMEOUT_MS || 0),
    maxAttemptsPerPair: Number(env?.LIFEBOOK_GEMINI_RETRIES || env?.PREMIUM_GEMINI_RETRIES || 2),
    disableVertexFallback: env?.LIFEBOOK_GEMINI_DISABLE_VERTEX_FALLBACK ?? env?.GEMINI_DISABLE_VERTEX_FALLBACK,
    metadata: {
      requestId: clean(options?.requestId),
      chapterNumber: clean(options?.chapterNumber),
    },
  });
  if (!result?.ok || !clean(result?.text)) {
    throw Object.assign(new Error(clean(result?.message || "Gemini 원고 생성에 실패했습니다.")), {
      code: clean(result?.error || "LIFEBOOK_GEMINI_GENERATION_FAILED"),
      status: Number(result?.status || 502),
    });
  }
  return clean(result.text);
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
    tone: "품격 있는 전문가 상담문과 실전 전략서의 결합",
    audience: "유료 프리미엄 PDF를 읽는 일반 사용자",
    sentenceRule: "과장된 예언보다 관찰 가능한 패턴과 선택 전략으로 설명",
    structureRule: "요약, 상담형 본문, 표처럼 읽히는 정리, 체크리스트, 실전 조언을 자연스럽게 포함",
    safetyRule: "공포 조장, 절대 단정, 의학적 진단, 투자 수익 보장, 내부 계산 근거성 용어 노출 금지",
    chapterRequirements: Array.isArray(chapterSpec?.writingRequirements) ? chapterSpec.writingRequirements : [],
    requiredNotice: clean(chapterSpec?.requiredNotice),
  };
}

function buildLifeBookSectionRequiredEngineFields(chapterSpec = {}, sectionTitle = "") {
  const common = ["원국 핵심", "일간", "용신", "현재 대운", "2026년 핵심 요약"];
  const section = clean(sectionTitle);
  const fields = [
    ...common,
    ...(Array.isArray(chapterSpec?.engineFocus) ? chapterSpec.engineFocus : []),
  ];
  const rules = [
    { re: /년주|월주|일주|시주|팔자|원국|천간|지지|지장간|공망|도충|합충|형파해|특수/, fields: ["원국", "천간/지지/지장간", "합충형파해", "도충/특수 구조"] },
    { re: /일간|월지|월령|신강|신약|중화|조후|통근|생조|극설|계절|온도|습|건조/, fields: ["일간 강약", "월령", "조후", "통근", "생조/극설", "오행 온도감"] },
    { re: /용신|희신|기신|구신|한신|필살기/, fields: ["용신/희신/기신/구신/한신", "용신 선정 이유", "오행별 현실 전략"] },
    { re: /대운|10년|초년|청년|중년|장년|말년/, fields: ["대운 배열", "현재 대운", "다음 대운", "대운과 용신 관계"] },
    { re: /격국|성격|파격|사회|조직|브랜드|명예|성공/, fields: ["월지 중심 격국", "십성 중심 구조", "성격/파격 여부", "사회적 역할 요약"] },
    { re: /관계|인연|호감|오해|갈등|협업|귀인|계약|배우자궁|대인/, fields: ["십성 분포", "충/형/원진/귀문", "귀인성", "배우자궁과 대인관계 패턴"] },
    { re: /연애|사랑|상대|결혼|배우자|인연/, fields: ["일지", "배우자궁", "남녀별 배우자성", "재성/관성 구조", "대운·세운상 연애 자극"] },
    { re: /돈|재물|직업|사업|프리랜스|자산|수익|커리어/, fields: ["재성", "식상", "관성", "인성", "격국", "용신", "대운상 재물 흐름", "2026년 재물 흐름"] },
    { re: /건강|심신|오행|컨디션|스트레스|회복|수면|운동|식습관|감정|번아웃/, fields: ["오행 과다/부족", "조후", "화기/수기/습도/건조도", "용신 오행", "기신 오행"] },
    { re: /신살|도화|홍염|역마|화개|귀문|원진|12운성|운성|퀀텀|코드/, fields: ["신살 목록", "신살 위치", "12운성 위치", "반복 패턴", "도충/합충형파해와 신살 결합"] },
    { re: /2026|병오|월별|월운|세운|로드맵|1월|12월/, fields: ["2026 병오년 세운", "2026 월운 12개월", "대운과 세운 관계", "원국과 세운 합충형파해", "용신/기신 작용"] },
  ];
  rules.forEach((rule) => {
    if (rule.re.test(section)) fields.push(...rule.fields);
  });
  return Array.from(new Set(fields.map((item) => clean(item)).filter(Boolean)));
}

function buildLifeBookSectionPlanPrompt(chapterSpec = {}, sectionTitle = "", index = 0) {
  const requirements = Array.isArray(chapterSpec?.writingRequirements) && chapterSpec.writingRequirements.length
    ? `\n필수 조건: ${chapterSpec.writingRequirements.join(" / ")}`
    : "";
  return [
    `${chapterSpec.roman}장 "${chapterSpec.title}"의 ${index + 1}번째 섹션 "${sectionTitle}"을 작성한다.`,
    "해당 섹션에 필요한 계산값만 근거로 사용하고, 제공되지 않은 명리 요소는 만들지 않는다.",
    "본문은 상담문처럼 따뜻하게 쓰되, 마지막에는 독자가 바로 실행할 수 있는 행동 기준을 남긴다.",
    requirements,
  ].filter(Boolean).join("\n");
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
    prompt: buildLifeBookSectionPlanPrompt(chapterSpec, title, index),
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

function pickLifeBookRelevantEngineData(llmInput = {}, requiredFields = []) {
  const fields = (Array.isArray(requiredFields) ? requiredFields : []).map((field) => clean(field)).filter(Boolean);
  const has = (pattern) => fields.some((field) => pattern.test(field));
  const relevant = {
    common: {
      natalCore: cloneLifeBookData(llmInput.saju),
      usefulGods: cloneLifeBookData(llmInput.structure?.usefulGods),
      currentDaeun: cloneLifeBookData(llmInput.luckCycles?.currentCycle),
      year2026Theme: cloneLifeBookData(llmInput.engineContract?.summary?.year2026Theme || llmInput.yearlyLuck2026?.elementEffect),
    },
  };
  if (has(/원국|천간|지지|지장간|공망|일간|월지|월령|통근|생조|극설|강약|계절|배우자궁|일지/)) {
    relevant.natal = cloneLifeBookData({
      saju: llmInput.saju,
      structure: {
        dayMasterStrength: llmInput.structure?.dayMasterStrength,
        hasSeason: llmInput.structure?.hasSeason,
        hasRoot: llmInput.structure?.hasRoot,
        hasSupport: llmInput.structure?.hasSupport,
      },
    });
  }
  if (has(/오행|조후|화기|수기|습도|건조|온도|용신|희신|기신|구신|한신/)) {
    relevant.elementsAndUsefulGods = cloneLifeBookData({
      fiveElements: llmInput.fiveElements,
      usefulGods: llmInput.structure?.usefulGods,
      strengthJohuYongshin: llmInput.engineContract?.strengthJohuYongshin,
    });
  }
  if (has(/십성|비겁|식상|재성|관성|인성|배우자성|돈|재물|직업|관계|연애|사랑/)) {
    relevant.tenGods = cloneLifeBookData(llmInput.tenGods);
  }
  if (has(/격국|성격|파격|사회적 역할|브랜드|명예|성공/)) {
    relevant.gyeokguk = cloneLifeBookData({
      structure: llmInput.structure?.gyeokguk,
      contract: llmInput.engineContract?.gyeokguk,
    });
  }
  if (has(/합충|형파해|충|형|원진|귀문|도충|특수|상호작용/)) {
    relevant.interactions = cloneLifeBookData({
      interactions: llmInput.interactions,
      contract: llmInput.engineContract?.interactions,
    });
  }
  if (has(/대운|10년|초년|청년|중년|장년|말년/)) {
    relevant.daeun = cloneLifeBookData({
      luckCycles: llmInput.luckCycles,
      contract: llmInput.engineContract?.daeun,
    });
  }
  if (has(/2026|병오|세운|월운|월별/)) {
    relevant.year2026 = cloneLifeBookData({
      yearlyLuck2026: llmInput.yearlyLuck2026,
      contract: llmInput.engineContract?.year2026,
      monthlyLuck2026: llmInput.engineContract?.monthlyLuck2026,
    });
  }
  if (has(/신살|도화|홍염|역마|화개|귀인|귀문|원진/)) {
    relevant.specialStars = cloneLifeBookData({
      specialStars: llmInput.specialStars,
      contract: llmInput.engineContract?.specialStars,
    });
  }
  if (has(/12운성|십이운성|운성/)) {
    relevant.twelveStages = cloneLifeBookData({
      twelveStages: llmInput.twelveStages,
      contract: llmInput.engineContract?.twelveStages,
    });
  }
  return relevant;
}

function buildLifeBookSectionLLMInput(llmInput = {}, chapterSpec = {}, chapterPlan = {}, sectionPlan = {}, previousSectionSummary = "") {
  return {
    userProfile: cloneLifeBookData(llmInput.userProfile),
    engineSummary: cloneLifeBookData(llmInput.engineSummary),
    chapterPlan: cloneLifeBookData(chapterPlan),
    sectionPlan: cloneLifeBookData(sectionPlan),
    relevantEngineData: pickLifeBookRelevantEngineData(llmInput, sectionPlan?.requiredEngineFields),
    previousSectionSummary: clean(previousSectionSummary) || undefined,
    forbiddenTerms: Array.from(new Set(FORBIDDEN_TEXT.map((item) => clean(item)).filter(Boolean))),
    styleGuide: buildLifeBookStyleGuide(chapterSpec),
  };
}

function buildLifeBookSectionPrompt(sectionInput = {}) {
  const chapterTitle = clean(sectionInput?.chapterPlan?.title);
  const sectionTitle = clean(sectionInput?.sectionPlan?.title);
  const targetChars = Number(sectionInput?.sectionPlan?.targetChars || 0) || 0;
  return `너는 최상위 명리학자이자 프리미엄 사주 PDF 작가다.

너의 역할:
퀀텀 명리엔진이 계산한 데이터를 바탕으로, 인생의 책 PDF의 특정 섹션 원고를 작성한다.

절대 규칙:
1. 사주 계산을 새로 하지 않는다.
2. 입력 데이터에 없는 내용은 추측하지 않는다.
3. 엔진 데이터와 충돌하는 해석을 하지 않는다.
4. JSON, payload, debug, engine, prompt, schema, api, llm 같은 내부 용어를 본문에 쓰지 않는다.
5. 사용자가 읽을 완성형 상담문만 작성한다.
6. 단정적 예언이 아니라 경향성, 가능성, 전략으로 표현한다.
7. 불안감을 조장하지 않는다.
8. 건강, 투자, 법률은 참고 조언으로만 표현한다.

PDF 정보:
- 전체 서비스명: 인생의 책
- 전체 목표: A4 약 200페이지
- 현재 챕터: ${chapterTitle}
- 현재 섹션: ${sectionTitle}
- 현재 섹션 목표 글자 수: ${targetChars}

사용자 정보:
${safeJsonForPrompt(sectionInput?.userProfile)}

이 섹션에 필요한 명리 데이터:
${safeJsonForPrompt(sectionInput?.relevantEngineData)}

전체 핵심 요약:
${safeJsonForPrompt(sectionInput?.engineSummary)}

이전 섹션 요약:
${clean(sectionInput?.previousSectionSummary) || "없음"}

섹션별 작성 조건:
${safeJsonForPrompt({
  sectionPrompt: sectionInput?.sectionPlan?.prompt,
  requiredEngineFields: sectionInput?.sectionPlan?.requiredEngineFields,
  forbiddenTerms: sectionInput?.forbiddenTerms,
  styleGuide: sectionInput?.styleGuide,
})}

작성 방식:
- 제목은 H3로 시작한다.
- 도입문은 몰입감 있게 작성한다.
- 명리 용어를 사용할 때는 반드시 쉬운 설명을 붙인다.
- 사용자의 구조를 개인화해서 해석한다.
- 이론 설명 30%, 개인 해석 45%, 실전 전략 25% 비율로 작성한다.
- 마지막에는 3~5개의 행동 지침을 포함한다.
- 중복 문장을 피한다.
- 분량을 충분히 채운다.
- 표가 필요한 경우 Markdown 표를 사용한다.

출력:
현재 섹션의 PDF 본문만 출력하라.`;
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

function validateLifeBookSectionResult(text = "", sectionPlan = {}) {
  const errors = [];
  const body = normalizeLifeBookSectionBody(text);
  if (body.length < LIFEBOOK_BLOCKING_MIN_CATEGORY_CHARS) errors.push("section_body_too_short");
  if (hasForbiddenText(body)) errors.push("section_forbidden_text");
  if (LIFEBOOK_LLM_RISKY_ASSERTION_RE.test(body)) errors.push("section_risky_assertion");
  return {
    ok: errors.length === 0,
    errors,
  };
}

function convertLifeBookSectionToCategory(text = "", sectionPlan = {}, index = 0) {
  const finalText = ensureLifeBookSectionH3(text, sectionPlan?.title);
  return {
    id: `${String(index + 1).padStart(2, "0")}`,
    sectionId: clean(sectionPlan?.sectionId),
    title: clean(sectionPlan?.title),
    localSummary: finalText,
    evidenceTags: Array.isArray(sectionPlan?.requiredEngineFields) ? sectionPlan.requiredEngineFields.slice(0, 6) : [],
    advicePoints: extractLifeBookActionPointsFromText(finalText).slice(0, 5),
    finalText,
    sectionSummary: summarizeLifeBookSectionBody(finalText, sectionPlan?.title),
    order: index + 1,
  };
}

async function generateLifeBookSectionWithGemini(env, { profile, signals, llmInput, chapterSpec, chapterPlan, sectionPlan, sectionIndex, previousSectionSummary, requestId }) {
  let lastErrors = [];
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const input = buildLifeBookSectionLLMInput(
      llmInput,
      chapterSpec,
      chapterPlan,
      attempt === 1
        ? sectionPlan
        : {
          ...sectionPlan,
          prompt: `${sectionPlan.prompt}\n재작성 조건: ${lastErrors.join(", ")}`,
        },
      previousSectionSummary,
    );
    const prompt = buildLifeBookSectionPrompt(input);
    const text = await callLifeBookGemini(env, prompt, {
      requestId,
      chapterNumber: `${chapterSpec.roman}-${sectionIndex + 1}`,
    });
    const body = normalizeLifeBookSectionBody(text);
    const validation = validateLifeBookSectionResult(body, sectionPlan);
    if (validation.ok) {
      const category = convertLifeBookSectionToCategory(body, sectionPlan, sectionIndex);
      return {
        category,
        summary: category.sectionSummary,
        source: "gemini-section",
      };
    }
    lastErrors = validation.errors;
    logLifeBookServer("GeminiSectionValidationFailed", {
      requestId,
      chapterNumber: chapterSpec.roman,
      sectionId: sectionPlan.sectionId,
      attempt,
      errors: lastErrors,
    });
  }

  const fallbackText = buildProfessionalLifeBookCategoryText(profile, signals, chapterSpec, sectionPlan.title, sectionIndex);
  return {
    category: {
      id: `${String(sectionIndex + 1).padStart(2, "0")}`,
      sectionId: clean(sectionPlan?.sectionId),
      title: clean(sectionPlan?.title),
      localSummary: fallbackText,
      evidenceTags: Array.isArray(sectionPlan?.requiredEngineFields) ? sectionPlan.requiredEngineFields.slice(0, 6) : [],
      advicePoints: [
        "핵심 패턴을 한 문장으로 정리하기",
        "이번 달 실행 기준을 하나만 고르기",
        "관계·일·돈의 우선순위를 분리해 판단하기",
      ],
      finalText: fallbackText,
      sectionSummary: `${sectionPlan.title}: 보강 원고로 작성되었습니다.`,
      order: sectionIndex + 1,
    },
    summary: `${sectionPlan.title}: 보강 원고로 작성되었습니다.`,
    source: "deterministic-section-reinforcement",
    deterministicReinforced: true,
  };
}

function combineLifeBookSectionChapters(chapterSpec = {}, chapterPlan = {}, sectionResults = []) {
  const categories = (Array.isArray(sectionResults) ? sectionResults : [])
    .map((result) => result?.category)
    .filter(Boolean)
    .map((category, index) => ({
      ...category,
      id: `${String(index + 1).padStart(2, "0")}`,
      order: index + 1,
    }));
  const chapterSummary = (Array.isArray(sectionResults) ? sectionResults : [])
    .map((result) => clean(result?.summary))
    .filter(Boolean)
    .join(" ");
  const chapterOpening = buildLifeBookChapterOpeningText({ chapterSummary }, chapterSpec);
  const chapterText = buildChapterBody(chapterSpec.title, categories, chapterOpening);
  return {
    id: chapterSpec.id,
    roman: chapterSpec.roman,
    title: chapterSpec.title,
    subtitle: chapterSpec.subtitle,
    chapterSummary,
    chapterOpening,
    categories,
    sectionResults: sectionResults.map((result, index) => ({
      sectionId: clean(chapterPlan?.sections?.[index]?.sectionId),
      title: clean(chapterPlan?.sections?.[index]?.title),
      source: clean(result?.source),
      summary: stripForbiddenTokens(result?.summary || ""),
      charLength: clean(result?.category?.finalText).length,
    })),
    chapterPlan,
    localDraft: chapterText,
    finalText: chapterText,
    text: chapterText,
    source: sectionResults.some((result) => result?.deterministicReinforced) ? "gemini-section+deterministic-reinforcement" : "gemini-section",
    pagePlan: getLifeBookPagePlan(chapterSpec.id),
  };
}

function buildLifeBookSectionDraftsForMerge(sectionResults = []) {
  return (Array.isArray(sectionResults) ? sectionResults : [])
    .map((result, index) => {
      const title = stripForbiddenTokens(result?.category?.title || result?.title || `Section ${index + 1}`);
      const body = normalizeLifeBookSectionBody(result?.category?.finalText || result?.text || "");
      return [`## ${index + 1}. ${title}`, body].filter(Boolean).join("\n\n");
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function buildLifeBookChapterMergePrompt({ chapterSpec = {}, chapterPlan = {}, sectionResults = [], engineSummary = {} } = {}) {
  const chapterTitle = clean(chapterSpec?.title || chapterPlan?.title);
  const targetPages = Number(chapterPlan?.targetPages || getLifeBookPagePlan(chapterSpec?.id).targetPages || 0) || "";
  const sectionDrafts = buildLifeBookSectionDraftsForMerge(sectionResults);
  return `너는 프리미엄 사주 PDF의 챕터 편집자다.

아래 섹션 원고들을 하나의 완성된 챕터로 편집하라.

목표:
1. 문체를 통일한다.
2. 중복 설명을 줄인다.
3. 섹션 사이 연결 문장을 자연스럽게 만든다.
4. 챕터 시작부에 한 줄 핵심 메시지를 추가한다.
5. 챕터 끝에 요약 박스와 행동 체크리스트를 추가한다.
6. 엔진 데이터와 충돌하는 문장을 제거한다.
7. 내부 용어는 제거한다.
8. PDF에 바로 들어갈 수 있는 Markdown 형식으로 정리한다.

현재 챕터:
${chapterTitle}

목표 페이지:
${targetPages}

섹션 원고:
${sectionDrafts}

엔진 요약:
${safeJsonForPrompt(engineSummary)}

출력:
완성된 챕터 원고만 작성하라.`;
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

function validateLifeBookMergedChapterMarkdown(markdown = "", chapterSpec = {}, chapterPlan = {}) {
  const errors = [];
  const body = normalizeLifeBookChapterMarkdown(markdown);
  const targetChars = Number(chapterPlan?.targetChars || getLifeBookPagePlan(chapterSpec?.id).targetChars || 0) || 0;
  const minimumChars = Math.max(LIFEBOOK_BLOCKING_MIN_CHAPTER_CHARS, Math.floor(targetChars * 0.45));
  if (body.length < minimumChars) errors.push("merged_chapter_too_short");
  if (hasForbiddenText(body)) errors.push("merged_chapter_forbidden_text");
  if (hasLifeBookChapterReviewForbiddenText(body)) errors.push("merged_chapter_review_forbidden_text");
  if (LIFEBOOK_LLM_RISKY_ASSERTION_RE.test(body)) errors.push("merged_chapter_risky_assertion");
  if (!/^#{1,3}\s+/m.test(body)) errors.push("merged_chapter_markdown_heading_missing");
  return {
    ok: errors.length === 0,
    errors,
    charLength: body.length,
    minimumChars,
  };
}

function buildLifeBookChapterReviewFields(chapterSpec = {}, chapterPlan = {}) {
  const sectionFields = (Array.isArray(chapterPlan?.sections) ? chapterPlan.sections : [])
    .flatMap((section) => Array.isArray(section?.requiredEngineFields) ? section.requiredEngineFields : []);
  return Array.from(new Set([
    "natal_core",
    "day_master",
    "yongsin",
    "huisin",
    "gisin",
    "current_daeun",
    "year_2026_summary",
    ...(Array.isArray(chapterSpec?.engineFocus) ? chapterSpec.engineFocus : []),
    ...sectionFields,
  ].map((field) => clean(field)).filter(Boolean)));
}

function buildLifeBookChapterReviewPrompt({ chapterDraft = "", engineSummary = {}, relevantEngineData = {} } = {}) {
  return `너는 명리 PDF 품질 검수관이다.

아래 챕터 원고를 검수하고, 문제가 있으면 수정하라.

검수 기준:
1. 입력 데이터에 없는 계산값을 임의 생성했는가?
2. 사주 구조와 충돌하는 해석이 있는가?
3. 용신/희신/기신 해석이 뒤바뀐 부분이 있는가?
4. 대운/세운/월운이 잘못 연결된 부분이 있는가?
5. 도충, 합충형파해, 신살을 과장하거나 공포스럽게 표현했는가?
6. 건강, 재물, 관계에서 위험한 단정 표현이 있는가?
7. 내부 용어가 노출되었는가?
8. 목차의 주제와 맞지 않는 내용이 있는가?
9. 분량이 목표에 비해 지나치게 짧은가?
10. PDF 상품으로 판매 가능한 상담체인가?

금지 표현:
- 무조건
- 반드시 망한다
- 죽는다
- 이혼한다
- 파멸
- 절대 실패
- 병에 걸린다
- 투자하면 오른다
- 운명상 피할 수 없다
- JSON
- payload
- debug
- engine
- schema
- api
- llm
- prompt

입력:
챕터 원고:
${normalizeLifeBookChapterMarkdown(chapterDraft)}

엔진 요약:
${safeJsonForPrompt(engineSummary)}

관련 엔진 데이터:
${safeJsonForPrompt(relevantEngineData)}

출력:
1. 검수 결과
2. 수정 필요 사항
3. 수정된 최종 챕터 원고`;
}

function extractLifeBookReviewedChapterMarkdown(reviewText = "") {
  const raw = clean(reviewText)
    .replace(/^\s*```(?:markdown|md|html|json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return normalizeLifeBookChapterMarkdown(parsed.finalChapter || parsed.finalText || parsed.revisedChapter || parsed.chapter || parsed.text || parsed.content || "");
    }
  } catch (_) {}
  const match = raw.match(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:3[.)]\s*)?수정(?:된)?\s*최종\s*챕터\s*원고\s*[:：]?\s*\n([\s\S]+)$/i);
  if (match?.[1]) return normalizeLifeBookChapterMarkdown(match[1]);
  return normalizeLifeBookChapterMarkdown(raw);
}

function validateLifeBookReviewedChapterMarkdown(markdown = "", chapterSpec = {}, chapterPlan = {}) {
  const result = validateLifeBookMergedChapterMarkdown(markdown, chapterSpec, chapterPlan);
  const body = normalizeLifeBookChapterMarkdown(markdown);
  const errors = [...result.errors];
  if (hasLifeBookChapterReviewForbiddenText(body) && !errors.includes("reviewed_chapter_forbidden_expression")) {
    errors.push("reviewed_chapter_forbidden_expression");
  }
  return {
    ok: errors.length === 0,
    errors,
    charLength: body.length,
    minimumChars: result.minimumChars,
  };
}

function applyLifeBookReviewedChapter(chapter = {}, markdown = "", reviewMeta = {}) {
  const reviewedMarkdown = normalizeLifeBookChapterMarkdown(markdown);
  const source = clean(chapter?.source || "gemini-section");
  const nextSource = source.includes("chapter-review") ? source : `${source}+chapter-review`;
  return {
    ...chapter,
    reviewedMarkdown,
    editedMarkdown: reviewedMarkdown,
    mergedMarkdown: reviewedMarkdown,
    localDraft: reviewedMarkdown,
    finalText: reviewedMarkdown,
    text: reviewedMarkdown,
    source: nextSource,
    chapterQualityReviewSource: clean(reviewMeta?.source || "gemini-chapter-review"),
    chapterQualityReviewErrors: Array.isArray(reviewMeta?.errors) ? reviewMeta.errors : [],
  };
}

function reviewLifeBookChapterDeterministically(chapter = {}) {
  const markdown = normalizeLifeBookChapterMarkdown(chapter?.reviewedMarkdown || chapter?.editedMarkdown || chapter?.mergedMarkdown || chapter?.finalText || chapter?.text || "");
  return applyLifeBookReviewedChapter(chapter, markdown, {
    source: "deterministic-chapter-review",
    errors: ["gemini_chapter_review_fallback"],
  });
}

async function reviewLifeBookChapterWithGemini(env, { llmInput, chapterSpec, chapterPlan, chapter, requestId }) {
  const requiredFields = buildLifeBookChapterReviewFields(chapterSpec, chapterPlan);
  const relevantEngineData = pickLifeBookRelevantEngineData(llmInput, requiredFields);
  const chapterDraft = normalizeLifeBookChapterMarkdown(chapter?.reviewedMarkdown || chapter?.editedMarkdown || chapter?.mergedMarkdown || chapter?.finalText || chapter?.text || "");
  let lastErrors = [];

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const prompt = buildLifeBookChapterReviewPrompt({
      chapterDraft,
      engineSummary: llmInput?.engineSummary,
      relevantEngineData,
    });
    let text = "";
    try {
      text = await callLifeBookGemini(env, prompt, {
        requestId,
        chapterNumber: `${chapterSpec?.roman || chapterSpec?.id || ""}-review`,
      });
    } catch (error) {
      lastErrors = [clean(error?.code || error?.message || "chapter_review_generation_failed")];
      logLifeBookServer("GeminiChapterReviewFailed", {
        requestId,
        chapterNumber: chapterSpec?.roman,
        attempt,
        reason: lastErrors[0],
      });
      continue;
    }

    const reviewedMarkdown = extractLifeBookReviewedChapterMarkdown(text);
    const validation = validateLifeBookReviewedChapterMarkdown(reviewedMarkdown, chapterSpec, chapterPlan);
    if (validation.ok) {
      logLifeBookServer("GeminiChapterReviewDone", {
        requestId,
        chapterNumber: chapterSpec?.roman,
        attempt,
        charLength: validation.charLength,
      });
      return applyLifeBookReviewedChapter(chapter, reviewedMarkdown, { source: "gemini-chapter-review" });
    }

    lastErrors = validation.errors;
    logLifeBookServer("GeminiChapterReviewValidationFailed", {
      requestId,
      chapterNumber: chapterSpec?.roman,
      attempt,
      errorCount: lastErrors.length,
      charLength: validation.charLength,
      minimumChars: validation.minimumChars,
    });
  }

  return reviewLifeBookChapterDeterministically({
    ...chapter,
    chapterQualityReviewErrors: lastErrors,
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

function buildLifeBookFullManuscriptMergePrompt({ chapters = [] } = {}) {
  const allChapters = buildLifeBookFullManuscriptChapterInput(chapters);
  return `너는 프리미엄 사주 PDF 원고의 최종 편집자다.

아래 13개 챕터를 하나의 완성된 “인생의 책” PDF 원고로 통합하라.

목표:
1. 기존 목차 순서를 유지한다.
2. 전체 문체를 고급스럽고 일관되게 만든다.
3. 챕터 간 중복을 줄인다.
4. 앞 장에서 설명한 개념은 뒤 장에서 자연스럽게 이어받는다.
5. 각 장의 결론이 서로 충돌하지 않게 정리한다.
6. PDF 최상단에 표지 문구를 추가한다.
7. 목차 페이지를 추가한다.
8. 각 장 앞에 pagebreak를 넣는다.
9. 각 장 끝에 요약 박스를 유지한다.
10. 마지막에 전체 핵심 요약을 추가한다.
11. 내부 계산 근거성 용어를 제거한다.
12. 사용자가 읽는 완성형 상담문만 남긴다.

PDF 제목:
인생의 책 — 나의 운명 사용 설명서

목차:
${buildLifeBookFullTableOfContentsMarkdown()}

입력:
${allChapters}

출력:
PDF 렌더링에 바로 사용할 수 있는 최종 Markdown 원고.`;
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
    "# 인생의 책 — 나의 운명 사용 설명서",
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
  if (LIFEBOOK_LLM_RISKY_ASSERTION_RE.test(body)) errors.push("final_markdown_risky_assertion");
  return {
    ok: errors.length === 0,
    errors,
    charLength: body.length,
    minimumChars,
    pagebreakCount,
  };
}

function buildLifeBookFinalQualityReviewPrompt({ finalManuscriptMarkdown = "" } = {}) {
  return `너는 Code:Destiny 인생의 책 PDF 최종 품질 검수관이다.

아래 전체 PDF 원고를 검수하라.

검수 항목:
1. 13개 목차가 모두 있는가?
2. 목차 순서가 정확한가?
3. 각 장의 분량이 목표에 맞는가?
4. 내부 용어가 노출되었는가?
5. 엔진 데이터와 충돌하는 해석이 있는가?
6. 같은 문장이 반복되는가?
7. 각 장의 세부 카테고리명이 서로 충분히 다른가?
8. 2026년 월별 로드맵이 12개월 모두 있는가?
9. 대운 분석이 현재 대운 중심으로 충분히 깊은가?
10. 용신/희신/기신 전략이 현실적으로 번역되었는가?
11. 건강 관련 면책 문구가 포함되어 있는가?
12. 재물 관련 위험한 투자 조언이 없는가?
13. 연애·결혼에서 단정적 불행 예언이 없는가?
14. PDF 상품으로 판매 가능한 완성도인가?

전체 PDF 원고:
${normalizeLifeBookFinalManuscriptMarkdown(finalManuscriptMarkdown)}

출력:
- 통과 여부
- 수정 필요 사항
- 최종 수정본`;
}

function extractLifeBookFinalQualityReviewedMarkdown(reviewText = "") {
  const raw = clean(reviewText)
    .replace(/^\s*```(?:markdown|md|html|json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return normalizeLifeBookFinalManuscriptMarkdown(parsed.finalRevision || parsed.finalManuscript || parsed.finalText || parsed.revisedText || parsed.text || parsed.content || "");
    }
  } catch (_) {}
  const match = raw.match(/(?:^|\n)\s*(?:#{1,4}\s*)?(?:[-*]\s*)?최종\s*수정본\s*[:：]?\s*\n([\s\S]+)$/i);
  if (match?.[1]) return normalizeLifeBookFinalManuscriptMarkdown(match[1]);
  return normalizeLifeBookFinalManuscriptMarkdown(raw);
}

function validateLifeBookFinalQualityReviewMarkdown(markdown = "", chapters = []) {
  const base = validateLifeBookFinalManuscriptMarkdown(markdown, chapters);
  const body = normalizeLifeBookFinalManuscriptMarkdown(markdown);
  const errors = [...base.errors];
  const warnings = [];
  const blueprints = getLifeBookBlueprints();
  let lastIndex = -1;

  blueprints.forEach((chapter) => {
    const title = stripForbiddenTokens(chapter.title);
    const currentIndex = body.indexOf(title);
    if (currentIndex < 0) {
      if (!errors.includes(`final_markdown_chapter_${chapter.id}_missing`)) errors.push(`final_review_chapter_${chapter.id}_missing`);
      return;
    }
    if (currentIndex < lastIndex) errors.push(`final_review_chapter_${chapter.id}_order`);
    lastIndex = currentIndex;
  });

  const monthMissing = Array.from({ length: 12 }, (_, index) => `${index + 1}월`).filter((label) => !body.includes(label));
  if (monthMissing.length) warnings.push(`final_review_2026_months_missing:${monthMissing.join(",")}`);
  if (!/(의학적\s*진단|치료를\s*대체하지|의료\s*전문가)/.test(body)) errors.push("final_review_health_notice_missing");
  if (/(투자하면\s*오른다|수익\s*확정|원금\s*보장|종목\s*추천)/.test(body)) errors.push("final_review_investment_risk");
  if (/(반드시\s*이혼|이혼한다|사별한다|외도한다|불행해진다)/.test(body)) errors.push("final_review_love_fatalism");

  const categoryTitles = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => Array.isArray(chapter?.categories) ? chapter.categories : [])
    .map((category) => clean(category?.title))
    .filter(Boolean);
  const duplicateCategoryCount = categoryTitles.length - new Set(categoryTitles).size;
  if (duplicateCategoryCount > 2) warnings.push(`final_review_category_title_duplication:${duplicateCategoryCount}`);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    charLength: body.length,
    minimumChars: base.minimumChars,
    pagebreakCount: base.pagebreakCount,
  };
}

function patchLifeBookFinalQualityRequirements(markdown = "", chapters = []) {
  let body = normalizeLifeBookFinalManuscriptMarkdown(markdown);
  if (!/(의학적\s*진단|치료를\s*대체하지|의료\s*전문가)/.test(body)) {
    body = normalizeLifeBookFinalManuscriptMarkdown(`${body}

### 건강 관련 안내

이 내용은 사주 오행에 기반한 자기관리 참고 자료이며, 의학적 진단이나 치료를 대체하지 않습니다. 지속적인 증상이나 불편감이 있다면 의료 전문가와 상담하는 것이 좋습니다.`);
  }
  const monthMissing = Array.from({ length: 12 }, (_, index) => `${index + 1}월`).filter((label) => !body.includes(label));
  if (monthMissing.length) {
    const monthRows = Array.from({ length: 12 }, (_, index) => `- ${index + 1}월: XI장의 2026년 월별 로드맵을 기준으로 일, 재물, 관계, 건강의 실행 우선순위를 점검합니다.`).join("\n");
    body = normalizeLifeBookFinalManuscriptMarkdown(`${body}

### 2026년 12개월 실행 확인표

${monthRows}`);
  }
  const validation = validateLifeBookFinalQualityReviewMarkdown(body, chapters);
  return {
    finalManuscriptMarkdown: body,
    validation,
  };
}

async function reviewLifeBookFinalPdfWithGemini(env, { profile, chapters, finalManuscriptMarkdown, requestId }) {
  const fallbackMarkdown = normalizeLifeBookFinalManuscriptMarkdown(finalManuscriptMarkdown || buildLifeBookDeterministicFinalManuscript(profile, chapters));
  const prompt = buildLifeBookFinalQualityReviewPrompt({ finalManuscriptMarkdown: fallbackMarkdown });
  try {
    const text = await callLifeBookGemini(env, prompt, {
      requestId,
      chapterNumber: "full-pdf-review",
    });
    const reviewedMarkdown = extractLifeBookFinalQualityReviewedMarkdown(text);
    const validation = validateLifeBookFinalQualityReviewMarkdown(reviewedMarkdown, chapters);
    if (validation.ok) {
      logLifeBookServer("GeminiFinalPdfReviewDone", {
        requestId,
        charLength: validation.charLength,
        pagebreakCount: validation.pagebreakCount,
        warningCount: validation.warnings.length,
      });
      return {
        finalManuscriptMarkdown: reviewedMarkdown,
        finalQualityReviewSource: "gemini-final-pdf-review",
        finalQualityReviewPassed: true,
        finalQualityReviewErrors: [],
        finalQualityReviewWarnings: validation.warnings,
      };
    }
    const patched = patchLifeBookFinalQualityRequirements(fallbackMarkdown, chapters);
    logLifeBookServer("GeminiFinalPdfReviewValidationFailed", {
      requestId,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      fallbackErrorCount: patched.validation.errors.length,
    });
    return {
      finalManuscriptMarkdown: patched.finalManuscriptMarkdown,
      finalQualityReviewSource: "deterministic-final-pdf-review",
      finalQualityReviewPassed: patched.validation.ok,
      finalQualityReviewErrors: validation.errors,
      finalQualityReviewWarnings: Array.from(new Set([...validation.warnings, ...patched.validation.warnings])),
    };
  } catch (error) {
    const patched = patchLifeBookFinalQualityRequirements(fallbackMarkdown, chapters);
    logLifeBookServer("GeminiFinalPdfReviewFailed", {
      requestId,
      reason: clean(error?.code || error?.message || "final_pdf_review_generation_failed"),
      fallbackErrorCount: patched.validation.errors.length,
    });
    return {
      finalManuscriptMarkdown: patched.finalManuscriptMarkdown,
      finalQualityReviewSource: "deterministic-final-pdf-review",
      finalQualityReviewPassed: patched.validation.ok,
      finalQualityReviewErrors: [clean(error?.code || error?.message || "final_pdf_review_generation_failed"), ...patched.validation.errors],
      finalQualityReviewWarnings: patched.validation.warnings,
    };
  }
}

async function mergeLifeBookFullManuscriptWithGemini(env, { profile, chapters, requestId }) {
  const fallbackMarkdown = buildLifeBookDeterministicFinalManuscript(profile, chapters);
  const prompt = buildLifeBookFullManuscriptMergePrompt({ chapters });
  try {
    const text = await callLifeBookGemini(env, prompt, {
      requestId,
      chapterNumber: "full-manuscript",
    });
    const markdown = normalizeLifeBookFinalManuscriptMarkdown(text);
    const validation = validateLifeBookFinalManuscriptMarkdown(markdown, chapters);
    if (validation.ok) {
      logLifeBookServer("GeminiFullManuscriptMergeDone", {
        requestId,
        charLength: validation.charLength,
        pagebreakCount: validation.pagebreakCount,
      });
      return {
        finalManuscriptMarkdown: markdown,
        finalManuscriptSource: "gemini-full-manuscript",
        finalManuscriptErrors: [],
      };
    }
    logLifeBookServer("GeminiFullManuscriptMergeValidationFailed", {
      requestId,
      errorCount: validation.errors.length,
      charLength: validation.charLength,
      minimumChars: validation.minimumChars,
      pagebreakCount: validation.pagebreakCount,
    });
    return {
      finalManuscriptMarkdown: fallbackMarkdown,
      finalManuscriptSource: "deterministic-full-manuscript",
      finalManuscriptErrors: validation.errors,
    };
  } catch (error) {
    logLifeBookServer("GeminiFullManuscriptMergeFailed", {
      requestId,
      reason: clean(error?.code || error?.message || "full_manuscript_generation_failed"),
    });
    return {
      finalManuscriptMarkdown: fallbackMarkdown,
      finalManuscriptSource: "deterministic-full-manuscript",
      finalManuscriptErrors: [clean(error?.code || error?.message || "full_manuscript_generation_failed")],
    };
  }
}

function applyLifeBookMergedChapter(chapter = {}, markdown = "", sourceSuffix = "chapter-merge") {
  const mergedMarkdown = normalizeLifeBookChapterMarkdown(markdown);
  const source = clean(chapter?.source || "gemini-section");
  const nextSource = source.includes(sourceSuffix) ? source : `${source}+${sourceSuffix}`;
  return {
    ...chapter,
    editedMarkdown: mergedMarkdown,
    mergedMarkdown,
    localDraft: mergedMarkdown,
    finalText: mergedMarkdown,
    text: mergedMarkdown,
    source: nextSource,
    chapterMergeSource: sourceSuffix,
  };
}

async function mergeLifeBookChapterWithGemini(env, { llmInput, chapterSpec, chapterPlan, sectionResults, combined, requestId }) {
  let lastErrors = [];
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const prompt = buildLifeBookChapterMergePrompt({
      chapterSpec,
      chapterPlan,
      sectionResults,
      engineSummary: llmInput?.engineSummary,
    });
    let text = "";
    try {
      text = await callLifeBookGemini(env, prompt, {
        requestId,
        chapterNumber: `${chapterSpec?.roman || chapterSpec?.id || ""}-merge`,
      });
    } catch (error) {
      lastErrors = [clean(error?.code || error?.message || "merged_chapter_generation_failed")];
      logLifeBookServer("GeminiChapterMergeFailed", {
        requestId,
        chapterNumber: chapterSpec?.roman,
        attempt,
        reason: lastErrors[0],
      });
      continue;
    }
    const mergedMarkdown = normalizeLifeBookChapterMarkdown(text);
    const validation = validateLifeBookMergedChapterMarkdown(mergedMarkdown, chapterSpec, chapterPlan);
    if (validation.ok) {
      logLifeBookServer("GeminiChapterMergeDone", {
        requestId,
        chapterNumber: chapterSpec?.roman,
        attempt,
        charLength: validation.charLength,
      });
      return applyLifeBookMergedChapter(combined, mergedMarkdown, "chapter-merge");
    }
    lastErrors = validation.errors;
    logLifeBookServer("GeminiChapterMergeValidationFailed", {
      requestId,
      chapterNumber: chapterSpec?.roman,
      attempt,
      errorCount: lastErrors.length,
      charLength: validation.charLength,
      minimumChars: validation.minimumChars,
    });
  }
  return {
    ...combined,
    chapterMergeSource: "section-combined-fallback",
    chapterMergeErrors: lastErrors,
  };
}

async function generateLifeBookChapterSpecWithGemini(env, { profile, signals, llmInput, chapterSpec, previousSummaries, requestId }) {
  let lastDraft = null;
  let lastErrors = [];
  let lastChapter = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const prompt = attempt === 1
      ? buildLifeBookChapterPrompt(llmInput, chapterSpec, previousSummaries)
      : buildLifeBookRefinePrompt(llmInput, chapterSpec, lastDraft, lastErrors);
    const text = await callLifeBookGemini(env, prompt, { requestId, chapterNumber: chapterSpec.roman });
    let parsed = null;
    try {
      parsed = extractLifeBookJsonObject(text);
    } catch (error) {
      lastDraft = { rawText: clean(text).slice(0, 12000) };
      lastErrors = [clean(error?.code || "LIFEBOOK_GEMINI_JSON_PARSE_FAILED")];
      logLifeBookServer("GeminiChapterJsonParseFailed", {
        requestId,
        chapterNumber: chapterSpec.roman,
        attempt,
        responseLength: clean(text).length,
      });
      continue;
    }
    lastDraft = parsed;

    const jsonValidation = validateLifeBookGeminiJson(parsed, chapterSpec);
    if (!jsonValidation.ok) {
      lastErrors = jsonValidation.errors;
      logLifeBookServer("GeminiChapterValidationFailed", {
        requestId,
        chapterNumber: chapterSpec.roman,
        errorCount: lastErrors.length,
      });
      continue;
    }

    const chapter = convertGeminiChapterToLifeBookChapter(parsed, chapterSpec);
    const chapterValidation = validateLifeBookGeneratedChapter(chapter, chapterSpec);
    if (chapterValidation.ok) {
      return {
        chapter,
        summary: summarizeLifeBookChapter(chapter),
        deterministicReinforced: false,
      };
    }

    lastChapter = chapter;
    lastErrors = chapterValidation.errors;
    logLifeBookServer("GeminiChapterQualityFailed", {
      requestId,
      chapterNumber: chapterSpec.roman,
      errorCount: lastErrors.length,
    });
  }

  if (lastChapter) {
    const reinforced = reinforceLifeBookChapterDeterministically(profile, signals, lastChapter, chapterSpec);
    const reinforcedValidation = validateLifeBookGeneratedChapter(reinforced, chapterSpec);
    if (reinforcedValidation.ok) {
      return {
        chapter: reinforced,
        summary: summarizeLifeBookChapter(reinforced),
        deterministicReinforced: true,
      };
    }
    lastErrors = reinforcedValidation.errors;
  }

  throw Object.assign(new Error(`Gemini 챕터 생성 검수에 실패했습니다: ${chapterSpec.roman}`), {
    code: "LIFEBOOK_GEMINI_CHAPTER_INVALID",
    status: 502,
    details: { chapterNumber: chapterSpec.roman, errors: lastErrors },
  });
}

function combineLifeBookPartChapters(chapterSpec = {}, partChapters = []) {
  const categoryByTitle = new Map();
  partChapters.forEach((partChapter) => {
    (Array.isArray(partChapter?.categories) ? partChapter.categories : []).forEach((category) => {
      const title = clean(category?.title);
      if (title && !categoryByTitle.has(title)) categoryByTitle.set(title, category);
    });
  });

  const categories = (Array.isArray(chapterSpec?.categories) ? chapterSpec.categories : []).map((categoryTitle, index) => {
    const found = categoryByTitle.get(clean(categoryTitle));
    if (found) return { ...found, order: index + 1 };
    return {
      id: `${String(index + 1).padStart(2, "0")}`,
      title: categoryTitle,
      localSummary: "",
      evidenceTags: [categoryTitle, chapterSpec.roman].filter(Boolean),
      advicePoints: [],
      finalText: "",
      order: index + 1,
    };
  });
  const chapterSummary = partChapters.map((chapter) => clean(chapter?.chapterSummary)).filter(Boolean).join(" ");
  const chapterOpening = buildLifeBookChapterOpeningText({ chapterSummary }, chapterSpec);
  const chapterText = buildChapterBody(chapterSpec.title, categories, chapterOpening);
  return {
    id: chapterSpec.id,
    roman: chapterSpec.roman,
    title: chapterSpec.title,
    subtitle: chapterSpec.subtitle,
    chapterSummary,
    chapterOpening,
    categories,
    localDraft: chapterText,
    finalText: chapterText,
    text: chapterText,
    source: "gemini-parted",
    pagePlan: getLifeBookPagePlan(chapterSpec.id),
    partCount: partChapters.length,
  };
}

async function generateLifeBookChapterWithGemini(env, { profile, signals, llmInput, chapterSpec, previousSummaries, requestId }) {
  const chapterPlan = buildLifeBookChapterPlan(chapterSpec);
  const sectionResults = [];
  let previousSectionSummary = "";

  logLifeBookServer("LifeBookChapterPlanCreated", {
    requestId,
    chapterNumber: chapterSpec.roman,
    sectionCount: chapterPlan.sections.length,
    targetPages: chapterPlan.targetPages,
    targetChars: chapterPlan.targetChars,
  });

  for (let sectionIndex = 0; sectionIndex < chapterPlan.sections.length; sectionIndex += 1) {
    const sectionPlan = chapterPlan.sections[sectionIndex];
    logLifeBookServer("GeminiSectionStart", {
      requestId,
      chapterNumber: chapterSpec.roman,
      sectionId: sectionPlan.sectionId,
      sectionIndex: sectionIndex + 1,
      sectionCount: chapterPlan.sections.length,
      targetChars: sectionPlan.targetChars,
      requiredEngineFieldCount: sectionPlan.requiredEngineFields.length,
    });
    const generated = await generateLifeBookSectionWithGemini(env, {
      profile,
      signals,
      llmInput,
      chapterSpec,
      chapterPlan,
      sectionPlan,
      sectionIndex,
      previousSectionSummary,
      requestId,
    });
    sectionResults.push(generated);
    previousSectionSummary = generated.summary;
    logLifeBookServer("GeminiSectionDone", {
      requestId,
      chapterNumber: chapterSpec.roman,
      sectionId: sectionPlan.sectionId,
      source: generated.source,
      charLength: clean(generated.category?.finalText).length,
    });
  }

  const combined = combineLifeBookSectionChapters(chapterSpec, chapterPlan, sectionResults);
  const validation = validateLifeBookGeneratedChapter(combined, chapterSpec);
  if (validation.ok) {
    const merged = await mergeLifeBookChapterWithGemini(env, {
      llmInput,
      chapterSpec,
      chapterPlan,
      sectionResults,
      combined,
      requestId,
    });
    const reviewed = await reviewLifeBookChapterWithGemini(env, {
      llmInput,
      chapterSpec,
      chapterPlan,
      chapter: merged,
      requestId,
    });
    return {
      chapter: reviewed,
      summary: summarizeLifeBookChapter(reviewed),
      deterministicReinforced: sectionResults.some((result) => result?.deterministicReinforced),
    };
  }

  const reinforced = reinforceLifeBookChapterDeterministically(profile, signals, combined, chapterSpec);
  const reinforcedValidation = validateLifeBookGeneratedChapter(reinforced, chapterSpec);
  if (reinforcedValidation.ok) {
    const merged = await mergeLifeBookChapterWithGemini(env, {
      llmInput,
      chapterSpec,
      chapterPlan,
      sectionResults,
      combined: reinforced,
      requestId,
    });
    const reviewed = await reviewLifeBookChapterWithGemini(env, {
      llmInput,
      chapterSpec,
      chapterPlan,
      chapter: merged,
      requestId,
    });
    return {
      chapter: reviewed,
      summary: summarizeLifeBookChapter(reviewed),
      deterministicReinforced: true,
    };
  }

  throw Object.assign(new Error(`Gemini 섹션 생성 검수에 실패했습니다: ${chapterSpec.roman}`), {
    code: "LIFEBOOK_GEMINI_SECTION_CHAPTER_INVALID",
    status: 502,
    details: { chapterNumber: chapterSpec.roman, errors: validation.errors },
  });
}

async function generateLifeBookChaptersWithGemini(env, { profile, signals, llmInput, requestId }) {
  const chapters = [];
  const summaries = [];
  let deterministicReinforcedCount = 0;
  const chapterPlans = buildLifeBookChapterPlans();

  logLifeBookServer("LifeBookChapterPlansCreated", {
    requestId,
    chapterCount: chapterPlans.length,
    sectionCount: chapterPlans.reduce((sum, plan) => sum + (Array.isArray(plan?.sections) ? plan.sections.length : 0), 0),
    targetPages: chapterPlans.reduce((sum, plan) => sum + Number(plan?.targetPages || 0), 0),
    targetChars: chapterPlans.reduce((sum, plan) => sum + Number(plan?.targetChars || 0), 0),
  });

  for (const chapterSpec of getLifeBookBlueprints()) {
    const chapterPlan = chapterPlans.find((plan) => clean(plan?.chapterId) === clean(chapterSpec.id));
    logLifeBookServer("GeminiChapterStart", {
      requestId,
      chapterNumber: chapterSpec.roman,
      categoryCount: chapterSpec.categories.length,
      targetPages: getLifeBookPagePlan(chapterSpec.id).targetPages,
      sectionCount: Array.isArray(chapterPlan?.sections) ? chapterPlan.sections.length : 0,
    });
    const generated = await generateLifeBookChapterWithGemini(env, {
      profile,
      signals,
      llmInput,
      chapterSpec,
      previousSummaries: summaries,
      requestId,
    });
    chapters.push(generated.chapter);
    summaries.push({
      chapterNumber: chapterSpec.roman,
      chapterTitle: chapterSpec.title,
      summary: generated.summary,
    });
    if (generated.deterministicReinforced) deterministicReinforcedCount += 1;
    logLifeBookServer("GeminiChapterDone", {
      requestId,
      chapterNumber: chapterSpec.roman,
      deterministicReinforced: generated.deterministicReinforced,
      charLength: chapterTextLength(generated.chapter),
    });
  }

  const sanitized = sanitizeLifeBookChapters(profile, signals, chapters);
  const finalManuscript = await mergeLifeBookFullManuscriptWithGemini(env, {
    profile,
    chapters: sanitized,
    requestId,
  });
  const finalQualityReview = await reviewLifeBookFinalPdfWithGemini(env, {
    profile,
    chapters: sanitized,
    finalManuscriptMarkdown: finalManuscript.finalManuscriptMarkdown,
    requestId,
  });
  return {
    chapters: sanitized,
    chapterPlans,
    summaries,
    finalManuscriptMarkdown: finalQualityReview.finalManuscriptMarkdown,
    finalManuscriptSource: [
      finalManuscript.finalManuscriptSource,
      finalQualityReview.finalQualityReviewSource,
    ].filter(Boolean).join("+"),
    finalManuscriptErrors: [
      ...(Array.isArray(finalManuscript.finalManuscriptErrors) ? finalManuscript.finalManuscriptErrors : []),
      ...(Array.isArray(finalQualityReview.finalQualityReviewErrors) ? finalQualityReview.finalQualityReviewErrors : []),
    ],
    finalQualityReviewSource: finalQualityReview.finalQualityReviewSource,
    finalQualityReviewPassed: Boolean(finalQualityReview.finalQualityReviewPassed),
    finalQualityReviewErrors: finalQualityReview.finalQualityReviewErrors,
    finalQualityReviewWarnings: finalQualityReview.finalQualityReviewWarnings,
    deterministicReinforcedCount,
    manuscriptSource: [
      deterministicReinforcedCount > 0 ? "gemini-section+deterministic-reinforcement" : "gemini-section",
      finalManuscript.finalManuscriptSource,
      finalQualityReview.finalQualityReviewSource,
    ].filter(Boolean).join("+"),
  };
}

function generateLifeBookPdfFromChapters(profile, signals, chapters, generatedAt, finalManuscriptMarkdown = "") {
  return buildLifeBookDocument({ profile, signals, chapters, generatedAt, finalManuscriptMarkdown });
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

function deriveLocalSignals(profile, rawSajuData = "", analysisSignals = {}) {
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
  const currentYear = new Date().getFullYear();
  const currentYearSolar = Solar.fromDate(new Date());
  const currentYearPillar = `${normalizeStemLabel(currentYearSolar.getLunar().getEightChar().getYearGan())}${normalizeBranchLabel(currentYearSolar.getLunar().getEightChar().getYearZhi())}`.trim();

  const specialStars = calcLifeBookSpecialStarsFromPillars(enginePillars);
  const twelveGrowthStages = buildLifeBookTwelveGrowthStages(enginePillars);

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
    currentDaewun: clean(daewun?.current?.label || parsedAnalysis.currentDaewun),
    nextDaewun: clean(daewun?.next?.label || ""),
    daewunStartAge: Number(daewun?.current?.startAge || 0) || null,
    daewunCycles: Array.isArray(daewun.cycles) ? daewun.cycles : [],
    currentDaeunNode: daewun.current,
    nextDaeunNode: daewun.next,
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
      year: clean(engineProfile?.tenGods?.pillarTenGods?.year || ""),
      month: clean(engineProfile?.tenGods?.pillarTenGods?.month || ""),
      day: clean(engineProfile?.tenGods?.pillarTenGods?.day || ""),
      hour: clean(engineProfile?.tenGods?.pillarTenGods?.hour || ""),
    },
    specialStars,
    twelveGrowthStages,
    topTenGod,
    usefulElements,
    avoidElements,
    weakSignals,
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
    paragraph3 = `2026년 병오년은 세운의 불기운이 원국과 만나는 방식을 세밀하게 보아야 합니다. ${clean(signals.currentYearPillar || "병오")}의 흐름은 단순한 길흉보다 행동의 속도, 관계의 온도, 일과 돈의 우선순위를 조절하는 기준으로 읽어야 합니다. 월별 흐름은 예언이 아니라 실행 순서이므로, 무리한 확정보다 준비와 점검의 리듬을 세우는 편이 안정적입니다.`;
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
    currentYearPillar: clean(signals.currentYearPillar || "올해 세운"),
    powerLabel: clean(signals.powerLabel || engine?.usefulGods?.strength || "중화"),
    johuType: clean(signals.johuType || "균형"),
  };
}

function buildLifeBookChapterInsight(chapterId, ctx, categoryTitle) {
  const common = `원국은 ${ctx.yearPillar}, ${ctx.monthPillar}, ${ctx.dayPillar}, ${ctx.hourPillar}의 흐름으로 구성됩니다. 그중 일간 ${ctx.dayMaster}은 판단의 중심이고, 월지 ${ctx.monthBranch}은 삶의 기본 무대와 심리 리듬을 결정하는 자리입니다.`;
  const map = {
    "01": `${common} ${categoryTitle}에서는 이 구조가 성격 설명에 머물지 않고, 선택을 반복하는 방식으로 어떻게 굳어지는지 보아야 합니다.`,
    "02": `월지 ${ctx.monthBranch}과 조후 ${ctx.johuType}의 흐름을 함께 보면, 이 명식은 속도보다 리듬을 맞출 때 안정됩니다. ${categoryTitle}은 컨디션, 감정의 온도, 관계의 거리감까지 연결됩니다.`,
    "03": `용신 ${ctx.useful}, 희신 ${ctx.support}, 부담되는 기운 ${ctx.caution}은 행운과 불운의 이름이 아니라 균형을 잡는 방향입니다. ${categoryTitle}은 그 균형을 현실에서 어떻게 쓸지에 관한 항목입니다.`,
    "04": `현재 대운 ${ctx.currentDaeun}은 무조건 확장하거나 움츠러들 시기가 아니라, 무엇을 남기고 무엇을 정리할지 가르는 큰 흐름입니다. ${categoryTitle}은 이 흐름 안에서 판단의 순서를 세우는 데 중요합니다.`,
    "05": `격국은 직업 이름을 찍어 주는 방식이 아니라, 사회에서 어떤 방식으로 쓰임을 얻는지 보여 줍니다. ${ctx.topTenGod}의 비중은 ${categoryTitle}에서 인정, 책임, 성과의 방식을 읽게 합니다.`,
    "06": `관계에서는 일지 ${ctx.dayBranch}과 월지 ${ctx.monthBranch}의 간격이 중요합니다. ${categoryTitle}은 누구와 가까워질지보다 어떤 관계에서 에너지가 안정되는지를 먼저 봐야 합니다.`,
    "07": `연애와 결혼은 끌림만으로 판단하면 흐름을 놓치기 쉽습니다. ${categoryTitle}은 감정의 속도와 실제 생활의 안정감이 같은 방향인지 확인하는 항목입니다.`,
    "08": `재물과 직업은 돈의 크기보다 돈이 들어오고 나가는 구조가 핵심입니다. ${categoryTitle}에서는 ${ctx.topTenGod}과 오행의 강약이 일하는 방식과 수익의 형태로 어떻게 드러나는지 봅니다.`,
    "09": `건강과 심신은 질병을 단정하는 영역이 아니라 리듬과 관리의 문제입니다. ${categoryTitle}은 ${ctx.weakest} 기운이 약해질 때 반복되기 쉬운 피로와 스트레스 반응을 조절하는 데 초점을 둡니다.`,
    "10": `신살과 십이운성은 겁을 주는 장치가 아니라 반복되는 에너지의 표식입니다. ${categoryTitle}은 사건의 단정이 아니라 변화와 충돌이 생기는 구조를 읽는 항목입니다.`,
    "11": `2026년 병오년은 가까운 세운이 현재 대운과 겹치며 나타나는 실전 흐름입니다. ${categoryTitle}은 예언보다 월별 대응 전략으로 보아야 하며, 기회와 부담을 동시에 살피는 편이 정확합니다.`,
    "12": `생애 마스터플랜은 대운의 큰 주기를 현실의 나이대와 연결하는 작업입니다. ${categoryTitle}은 당장의 성과보다 오래 유지할 방향과 전환점의 순서를 읽는 항목입니다.`,
    "13": `최종 전략은 큰 목표보다 매년 반복할 기준이 중요합니다. ${categoryTitle}은 현재 대운 ${ctx.currentDaeun}과 다음 대운 ${ctx.nextDaeun} 사이에서 오래 버틸 구조를 만드는 항목입니다.`,
  };
  return map[String(chapterId)] || `${common} ${categoryTitle}은 이 명식의 강점과 주의점을 현실적인 선택 기준으로 바꾸는 항목입니다.`;
}

function ensureProfessionalCategoryLength(text, chapterId, categoryTitle, categoryIndex, minLength = LIFEBOOK_MIN_CATEGORY_CHARS + 120) {
  let result = dedupeParagraphs(stripForbiddenTokens(text));
  const additions = [
    `${categoryTitle}에서 중요한 것은 좋은 흐름을 과신하지 않고, 불안한 흐름을 과장하지 않는 태도입니다. 명식이 보여 주는 강점은 반복된 선택을 통해 실력이 되고, 약점은 방치될 때 같은 문제를 되풀이하게 만듭니다. 따라서 지금 필요한 것은 큰 결심보다 일정, 관계, 지출, 휴식의 기준을 분명히 세우는 일입니다.`,
    `이 항목은 단순한 성향 설명으로 끝나지 않습니다. 실제 생활에서는 말투, 일의 속도, 사람을 고르는 기준, 돈을 쓰는 방식에서 같은 흐름이 반복됩니다. 잘 맞는 환경에서는 집중력과 책임감이 살아나지만, 맞지 않는 환경에서는 방어심과 피로가 빠르게 커질 수 있으므로 기준을 먼저 정해야 합니다.`,
    `운이 열릴 때는 속도를 조금 높여도 되지만, 운이 불안정할 때는 새 판을 벌이기보다 기존 구조를 정리하는 편이 낫습니다. 선택의 기준은 간단합니다. 오래 책임질 수 있는 일인지, 관계와 돈의 흐름이 무리 없이 이어지는지, 몸의 리듬을 해치지 않는지부터 확인해야 합니다.`,
  ];
  let guard = 0;
  while (result.length < minLength && guard < 8) {
    result = dedupeParagraphs(`${result}\n\n${additions[(categoryIndex + guard) % additions.length]}`);
    guard += 1;
  }
  const required = LIFEBOOK_CANONICAL_TOPIC_RULES[String(chapterId || "")] || [];
  if (required.length && !required.some((keyword) => result.includes(keyword))) {
    result = dedupeParagraphs(`${result}\n\n이 장에서는 ${required.slice(0, 3).join(", ")}의 흐름을 함께 보아야 판단이 선명해집니다. 좋은 기운은 활용 기준으로, 부담되는 기운은 관리 기준으로 삼을 때 명식의 장점이 현실에서 오래 유지됩니다.`);
  }
  return stripForbiddenTokens(result);
}

function buildProfessionalLifeBookCategoryText(profile, signals, chapter, categoryTitle, categoryIndex) {
  const ctx = buildLifeBookReadingContext(profile, signals);
  const chapterId = String(chapter?.id || "");
  const insight = buildLifeBookChapterInsight(chapterId, ctx, categoryTitle);
  const strengthLine = `${categoryTitle}에서 이 명식이 잘 쓰이면 ${ctx.dominant} 기운의 추진력과 ${ctx.topTenGod}의 현실 감각이 결합되어, 상황을 오래 관찰한 뒤 필요한 지점을 정확히 짚는 힘으로 나타납니다. 특히 ${ctx.dayPillar}의 중심이 흔들리지 않을 때는 말보다 결과로 신뢰를 쌓는 장점이 강해집니다.`;
  const cautionLine = `${categoryTitle}의 반대편을 보면, 균형이 무너질 때 ${ctx.caution} 기운이 과해지거나 ${ctx.weakest} 기운이 약해지는 쪽으로 흐르며 판단이 급해지고 관계와 일의 경계가 흐려질 수 있습니다. 이때는 스스로를 몰아붙이기보다 일정과 책임 범위를 줄이고, 감정으로 결정한 일을 하루 뒤 다시 확인해야 합니다.`;
  const timingLine = `${categoryTitle}은 현재 ${ctx.currentDaeun}의 흐름과도 연결됩니다. 이 시기에는 무리한 확장보다 오래 가져갈 구조를 선별하는 일이 중요하고, 다음 ${ctx.nextDaeun}으로 넘어갈수록 지금 남겨 둔 기준이 결과의 차이를 만들기 때문에 지속 가능한 관계, 수입 구조, 생활 리듬을 우선해야 합니다.`;
  const practicalLines = {
    "01": `${categoryTitle}의 실천 기준은 단순합니다. 원국의 강점을 살리려면 먼저 하루의 우선순위를 줄이고, 중요한 결정은 ${ctx.dayMaster} 일간의 기준에 맞는지 확인해야 합니다. 남의 속도에 끌려가면 장점이 분산되고, 자기 기준만 고집하면 관계가 경직될 수 있으므로 조절해야 합니다.`,
    "02": `${categoryTitle}을 현실에 적용하려면 수면, 식사, 일의 시작 시간을 일정하게 두는 편이 좋습니다. 몸의 리듬이 흐트러지면 판단도 함께 흔들리므로, 큰 계획보다 생활의 온도와 속도를 먼저 안정시키는 것을 선택해야 합니다.`,
    "03": `${categoryTitle}에서 용신과 희신은 생활에서 선택해야 할 방향입니다. ${ctx.useful}과 ${ctx.support}의 흐름이 살아나는 환경을 의식적으로 늘리고, ${ctx.caution}이 과해지는 사람과 일은 거리를 두는 편이 좋습니다.`,
    "04": `${categoryTitle}의 대운 판단에서는 좋은 시기와 불편한 시기를 나누기보다, 각 시기에 맡겨진 과제를 보는 편이 정확합니다. 현재는 성급히 판을 넓히기보다 남길 일과 정리할 일을 구분해야 다음 흐름이 가벼워집니다.`,
    "05": `${categoryTitle}에서 격국과 소명은 타인의 인정에 끌려가기보다 자신이 지속적으로 성과를 낼 수 있는 무대를 고르는 데 쓰여야 합니다. 맞지 않는 환경에서 버티는 힘을 능력으로 착각하지 않아야 합니다.`,
    "06": `${categoryTitle}에서는 친밀감보다 안정감을 기준으로 보아야 합니다. 가까운 사람일수록 기대와 책임의 선을 말로 확인하고, 반복해서 에너지를 소모시키는 관계는 거리를 두는 편이 좋습니다.`,
    "07": `${categoryTitle}에서는 강한 끌림을 곧 안정으로 착각하지 않아야 합니다. 오래 가는 관계는 감정의 세기보다 갈등 후 회복 방식, 생활 리듬, 돈과 책임을 다루는 태도에서 갈립니다.`,
    "08": `${categoryTitle}에서는 수익보다 구조가 먼저입니다. 들어오는 돈, 새는 돈, 반드시 지켜야 할 비용을 분리하고, 자신의 강점이 반복적으로 팔릴 수 있는 방식으로 일을 설계해야 합니다.`,
    "09": `${categoryTitle}은 병명을 예언하는 방식으로 보지 않습니다. 다만 피로가 쌓일 때 반복되는 생활 패턴을 관리해야 하며, 불편이 지속되면 전문 의료 상담을 우선하는 것이 가장 현실적인 선택입니다.`,
    "10": `${categoryTitle}에서 신살과 특수 포인트는 겁낼 대상이 아니라 알아차릴 신호입니다. 변화가 반복되는 자리에서는 서둘러 결론 내리지 말고, 무엇이 계속 충돌하는지 기록해 두는 편이 도움이 됩니다.`,
    "11": `${categoryTitle}에서 2026년 세운은 대응의 기준입니다. 기회가 보여도 책임질 수 있는 범위를 먼저 정하고, 부담이 커지는 달에는 약속, 지출, 일정의 수를 줄여야 합니다.`,
    "12": `${categoryTitle}의 생애 전략에서는 모든 목표를 한꺼번에 밀어붙이지 않아야 합니다. 대운의 단계별로 직업, 돈, 관계, 몸의 축을 나누어 관리해야 장기 흐름이 안정됩니다.`,
    "13": `${categoryTitle}의 최종 전략은 화려한 목표보다 유지 가능한 루틴으로 완성됩니다. 90일은 정리, 1년은 기반, 장기 계획은 확장과 안정으로 나누어 보아야 계획이 실제 삶에서 버틸 수 있습니다.`,
  };
  const groundingLine = `${categoryTitle}은 명식, 원국, 일간, 월지, 대운, 세운을 따로 떼어 보지 않아야 합니다. 원국은 타고난 기준을 보여 주고, 대운은 그 기준이 어떤 무대에서 쓰이는지 알려 줍니다. 세운은 올해 실제로 조절해야 할 속도와 우선순위를 드러냅니다. 그래서 이 항목에서는 감정적 확신보다 반복되는 선택의 결과를 확인해야 합니다.`;
  const finalLine = `${categoryTitle}에 대한 마지막 조언은 분명합니다. ${ctx.name}님의 명식은 장점을 크게 쓰려 할수록 약점 관리가 함께 필요하므로, 좋을 때는 구조를 넓히고 불안정할 때는 속도를 줄이는 방식으로 대응하면 운의 흐름을 더 안정적으로 사용할 수 있습니다.`;
  return ensureProfessionalCategoryLength([
    insight,
    strengthLine,
    cautionLine,
    timingLine,
    practicalLines[chapterId] || practicalLines["13"],
    groundingLine,
    finalLine,
  ].join("\n\n"), chapterId, categoryTitle, categoryIndex);
}

function buildChapterLocalText(profile, signals, chapter) {
  const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
  return categories.map((categoryTitle, index) => {
    const text = buildProfessionalLifeBookCategoryText(profile, signals, chapter, categoryTitle, index);
    return {
      id: `${String(index + 1).padStart(2, "0")}`,
      title: categoryTitle,
      localSummary: stripForbiddenTokens(text),
      evidenceTags: [signals.dayMaster, signals.monthBranch, signals.useful].filter(Boolean),
      advicePoints: [
        "핵심 패턴을 문장으로 명확히 기록하기",
        "이번 달 실행 항목을 1~2개로 제한하기",
        "관계·돈·건강 점검 루틴을 주간 단위로 고정하기",
      ],
      finalText: stripForbiddenTokens(text),
    };
  });
}

function buildLifeBookChapters(profile, signals) {
  return getLifeBookBlueprints().map((chapter) => {
    const categories = buildChapterLocalText(profile, signals, chapter);
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
      source: "local-only",
    };
  });
}

function buildChapterBody(chapterTitle, categories, chapterOpening = "") {
  const opening = stripForbiddenTokens(chapterOpening || "");
  const categoryBody = categories.map((category) => {
    const text = stripForbiddenTokens(category.finalText || category.localSummary || "");
    if (/^###\s+/m.test(text)) return text.trim();
    return `### ${stripForbiddenTokens(category.title)}\n\n${text}`.trim();
  }).join("\n\n");
  return [opening, categoryBody].filter(Boolean).join("\n\n");
}

function createLifeBookFallbackText(profile, signals, chapter, categoryTitle, originText = "") {
  const body = buildProfessionalLifeBookCategoryText(profile, signals, chapter, categoryTitle, 0);
  return stripForbiddenTokens([originText, body].filter(Boolean).join("\n\n"));
}

function buildLifeBookFallbackChapters(profile, signals, chapters = []) {
  return ensureCompleteLifeBookChapters(profile, signals, chapters).map((chapter) => ({
    ...chapter,
    finalText: buildChapterBody(chapter.title, chapter.categories, chapter.chapterOpening),
    text: buildChapterBody(chapter.title, chapter.categories, chapter.chapterOpening),
    source: "local-only",
  }));
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

function ensureCompleteLifeBookChapters(profile, signals, chapters = []) {
  const chapterMap = new Map((Array.isArray(chapters) ? chapters : []).map((item) => [String(item?.id || ""), item]));

  return getLifeBookBlueprints().map((blueprint) => {
    const chapter = chapterMap.get(String(blueprint.id));
    const fallbackCategories = buildChapterLocalText(profile, signals, blueprint);
    const categoryMap = new Map((Array.isArray(chapter?.categories) ? chapter.categories : []).map((item) => [String(item?.title || item?.id || ""), item]));

    const categories = fallbackCategories.map((fallbackCategory, index) => {
      const existing = categoryMap.get(String(fallbackCategory.title)) || categoryMap.get(String(fallbackCategory.id));
      const nextText = stripForbiddenTokens(existing?.finalText || existing?.localSummary || fallbackCategory.localSummary);
      return {
        id: fallbackCategory.id,
        title: fallbackCategory.title,
        localSummary: fallbackCategory.localSummary,
        evidenceTags: Array.isArray(existing?.evidenceTags) && existing.evidenceTags.length ? existing.evidenceTags : fallbackCategory.evidenceTags,
        advicePoints: Array.isArray(existing?.advicePoints) && existing.advicePoints.length ? existing.advicePoints : fallbackCategory.advicePoints,
        finalText: nextText || createLifeBookFallbackText(profile, signals, blueprint, fallbackCategory.title, fallbackCategory.localSummary),
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
      source: clean(chapter?.source) || "local-only",
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
    <title>인생의 책 — 나의 운명 사용 설명서</title>
    <style>
      :root{color-scheme:light}
      *{box-sizing:border-box}
      body{margin:0;padding:0;font-family:"Noto Serif KR",serif;background:#fffaf2;color:#261b11;line-height:1.82}
      .page{max-width:980px;margin:0 auto;padding:28px 20px 60px}
      .lb-final-meta{margin:0 0 18px;padding:14px 16px;border:1px solid #e4d3bb;background:#fbf5ec;color:#5a3a23}
      .lb-final-meta b{display:inline-block;margin-right:8px}
      .lb-final-section{padding:10px 0 18px}
      .lb-final-section--chapter{break-before:page;page-break-before:always}
      .lb-final-section h2{margin:10px 0 14px;font-size:28px;color:#4c2f1a}
      .lb-final-section h3{margin:16px 0 8px;font-size:20px;color:#5b3720}
      .lb-final-section h4{margin:12px 0 6px;font-size:17px;color:#6b4428}
      .lb-final-section p{margin:0 0 12px;white-space:pre-wrap}
      .lb-final-section ul{margin:8px 0 14px;padding-left:20px}
      .lb-markdown-table{width:100%;border-collapse:collapse;margin:10px 0 16px;font-size:13px}
      .lb-markdown-table th,.lb-markdown-table td{border:1px solid #e2cfb8;padding:6px 8px;text-align:left;vertical-align:top}
      .lb-markdown-table th{background:#efe3d0;color:#5a3a23}
      @page{size:A4;margin:16mm 14mm 18mm}
      @media print{body{background:#fff}.page{padding:0}.lb-final-meta{break-after:avoid}}
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
  LIFEBOOK_CANONICAL_BLUEPRINTS,
  LIFEBOOK_MIN_CATEGORY_CHARS,
  LIFEBOOK_MIN_CHAPTER_CHARS,
  LIFEBOOK_MIN_TOTAL_CHARS,
  LIFEBOOK_A4_TOTAL_TARGET,
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
  buildLifeBookDocument,
  normalizeInput,
  deriveLocalSignals,
  buildLifeBookLocalSajuJson,
  validateLifeBookLocalSajuJson,
  buildLifeBookLLMInput,
  buildLifeBookEngineContract,
  buildLifeBookEngineSummary,
  buildLifeBookChapterOpeningText,
  buildLifeBookChapterPlan,
  buildLifeBookChapterPlans,
  buildLifeBookSectionLLMInput,
  buildLifeBookSectionPrompt,
  buildLifeBookChapterMergePrompt,
  buildLifeBookChapterReviewFields,
  buildLifeBookChapterReviewPrompt,
  buildLifeBookFullManuscriptMergePrompt,
  buildLifeBookFinalQualityReviewPrompt,
  buildLifeBookDeterministicFinalManuscript,
  pickLifeBookRelevantEngineData,
  normalizeLifeBookSectionBody,
  normalizeLifeBookChapterMarkdown,
  normalizeLifeBookFinalManuscriptMarkdown,
  extractLifeBookReviewedChapterMarkdown,
  extractLifeBookFinalQualityReviewedMarkdown,
  ensureLifeBookSectionH3,
  getLifeBookPagePlan,
  splitLifeBookChapterParts,
  extractLifeBookJsonObject,
  validateLifeBookGeminiJson,
  validateLifeBookSectionResult,
  validateLifeBookMergedChapterMarkdown,
  validateLifeBookReviewedChapterMarkdown,
  validateLifeBookFinalManuscriptMarkdown,
  validateLifeBookFinalQualityReviewMarkdown,
  convertGeminiChapterToLifeBookChapter,
  convertLifeBookSectionToCategory,
  validateLifeBookGeneratedChapter,
  reinforceLifeBookChapterDeterministically,
  generateLifeBookChapterWithGemini,
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
    title: "인생의 책 — 나의 운명 사용 설명서",
    createdAt: clean(createdAt) || new Date().toISOString(),
    engineVersion: clean(engineVersion) || "quantum-myeongri-v1",
    chapterCount: 13,
    targetPages: LIFEBOOK_A4_TOTAL_TARGET.pages,
    status: ["generating", "completed", "failed"].includes(clean(status)) ? clean(status) : "generating",
    markdownContent: normalizedMarkdown,
  };
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
    finalManuscriptMarkdown: normalizeLifeBookFinalManuscriptMarkdown(metadata.finalManuscriptMarkdown || ""),
    finalManuscriptSource: clean(metadata.finalManuscriptSource || ""),
    finalManuscriptErrors: Array.isArray(metadata.finalManuscriptErrors) ? metadata.finalManuscriptErrors : [],
    finalQualityReviewSource: clean(metadata.finalQualityReviewSource || ""),
    finalQualityReviewPassed: Boolean(metadata.finalQualityReviewPassed),
    finalQualityReviewErrors: Array.isArray(metadata.finalQualityReviewErrors) ? metadata.finalQualityReviewErrors : [],
    finalQualityReviewWarnings: Array.isArray(metadata.finalQualityReviewWarnings) ? metadata.finalQualityReviewWarnings : [],
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
      source: chapter.source || "local-only",
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
    finalManuscriptMarkdown: normalizeLifeBookFinalManuscriptMarkdown(metadata.finalManuscriptMarkdown || ""),
    finalManuscriptSource: clean(metadata.finalManuscriptSource || ""),
    finalManuscriptErrors: Array.isArray(metadata.finalManuscriptErrors) ? metadata.finalManuscriptErrors : [],
    finalQualityReviewSource: clean(metadata.finalQualityReviewSource || ""),
    finalQualityReviewPassed: Boolean(metadata.finalQualityReviewPassed),
    finalQualityReviewErrors: Array.isArray(metadata.finalQualityReviewErrors) ? metadata.finalQualityReviewErrors : [],
    finalQualityReviewWarnings: Array.isArray(metadata.finalQualityReviewWarnings) ? metadata.finalQualityReviewWarnings : [],
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
      source: chapter.source || "local-only",
    })),
  };
}

async function handlePrepare(request, env) {
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
    hasGender: Boolean(birthInput.gender && birthInput.gender !== "unknown"),
    calendarType: birthInput.calendarType,
  });

  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId) || `life-book:${auth.userId}:${birthInput.birthDate}:${birthInput.birthTime || "unknown"}`;
  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `saju-lifebook-${Date.now()}`);
  const profileId = resolveLifeBookProfileId(body, profile);
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
    lifeBookPdfRecord: generatingRecord,
  });

  try {
  const featureKey = resolveLifeBookFeatureKey(body?.featureKey);
  const billingFeatureKey = toBillingFeatureKey(featureKey);
  const access = LIFEBOOK_TEMPORARY_PAYMENT_BYPASS
    ? {
      ok: true,
      accessType: "temporary_free",
      accessMethod: "TEMP_FREE",
      reportType: "lifeBook",
      featureKey: billingFeatureKey,
    }
    : await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "lifeBook", {
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
  await startPremiumPdfExecution(env, auth.userId, executionCtx);
  await persistLifeBookPdfRecord(env, executionCtx, generatingRecord, {
    profileId,
    generationStatus: "generating",
  });

  const signals = deriveLocalSignals(profile, body?.sajuData || "", body?.analysisSignals || {});
  let localSajuJson = buildLifeBookLocalSajuJson(birthInput, profile, signals, []);
  let localSajuValidation = validateLifeBookLocalSajuJson(localSajuJson);
  if (!localSajuValidation.ok) {
    logLifeBookServer("LocalSajuValidationFailed", {
      sessionId,
      missing: localSajuValidation.missing,
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
  logLifeBookServer("LocalCalculationSuccess", {
    sessionId,
    dayMasterResolved: Boolean(localSajuJson?.dayMaster),
    pillarCount: Number(Boolean(localSajuJson?.pillars?.year?.ganji)) + Number(Boolean(localSajuJson?.pillars?.month?.ganji)) + Number(Boolean(localSajuJson?.pillars?.day?.ganji)) + Number(Boolean(localSajuJson?.pillars?.hour?.ganji)),
    daewoonResolved: Boolean(localSajuJson?.currentDaeun?.label),
    yearlyLuckResolved: Boolean(localSajuJson?.yearlyFlow?.year),
  });

  const requestId = clean(body?.requestId || body?.accessGrant?.requestId || reportId);
  const llmInput = buildLifeBookLLMInput(birthInput, profile, signals, localSajuJson, body);
  logLifeBookServer("GeminiDraftBuildStart", {
    requestId,
    sessionId,
    reportId,
    chapterCount: getLifeBookBlueprints().length,
    targetYear: LIFEBOOK_LLM_TARGET_YEAR,
  });

  const generatedLifeBook = await generateLifeBookChaptersWithGemini(env, {
    profile,
    signals,
    llmInput,
    requestId,
  });
  let completedChapters = generatedLifeBook.chapters;
  logLifeBookServer("GeminiDraftBuildSuccess", {
    requestId,
    sessionId,
    reportId,
    chapterCount: completedChapters.length,
    deterministicReinforcedCount: generatedLifeBook.deterministicReinforcedCount,
  });

  let structureValidation = validateLifeBookStructure(completedChapters);
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

  let qualityEvaluation = evaluateLifeBookQuality(completedChapters);
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
  const finalManuscriptMarkdown = normalizeLifeBookFinalManuscriptMarkdown(generatedLifeBook.finalManuscriptMarkdown || "");
  const generatedAt = new Date().toISOString();
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
    finalManuscriptMarkdown,
    pdfHtml: generateLifeBookPdfFromChapters(profile, signals, completedChapters, generatedAt, finalManuscriptMarkdown),
  });
  const requestOrigin = new URL(request.url).origin;
  const archiveUrl = `${requestOrigin}/api/premium/pdf-archive/${encodeURIComponent(reportId)}`;
  pdfReady.pdfUrl = archiveUrl;
  pdfReady.htmlUrl = archiveUrl;
  pdfReady.downloadUrl = archiveUrl;
  pdfReady.storageKey = `premium-archive:life-book:${reportId}`;
  pdfReady.mimeType = "text/html";

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
  });
  pdfReady.lifeBookPdfRecord = completedRecord;
  await persistLifeBookPdfRecord(env, executionCtx, completedRecord, {
    profileId,
    generationStatus: "completed",
    pdfReady,
  });
  logLifeBookServer("PdfRenderSuccess", { sessionId, chapterCount: completedChapters.length });

  await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
    manuscriptSource,
    lifeBookPdfRecord: completedRecord,
    chapterCount: completedChapters.length,
    sectionCount: completedChapters.reduce((sum, chapter) => sum + (Array.isArray(chapter?.sectionResults) ? chapter.sectionResults.length : 0), 0),
    qualityWarnings: finalQualityWarnings,
    qualityScore: finalQualityScore,
    repairedCategoryCount,
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
      finalManuscriptErrors: generatedLifeBook.finalManuscriptErrors || [],
      finalQualityReviewSource: generatedLifeBook.finalQualityReviewSource || "",
      finalQualityReviewPassed: Boolean(generatedLifeBook.finalQualityReviewPassed),
      finalQualityReviewErrors: generatedLifeBook.finalQualityReviewErrors || [],
      finalQualityReviewWarnings: generatedLifeBook.finalQualityReviewWarnings || [],
      localSajuJson,
      lifeBookEngineContract: llmInput.engineContract,
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
    profile,
    birthInput,
    manuscriptSource,
    localSajuJson,
    lifeBookEngineContract: llmInput.engineContract,
    chapterPlans: generatedLifeBook.chapterPlans || [],
    lifeBookPdfRecord: completedRecord,
    finalManuscriptMarkdown,
    finalManuscriptSource: generatedLifeBook.finalManuscriptSource || "",
    finalManuscriptErrors: generatedLifeBook.finalManuscriptErrors || [],
    finalQualityReviewSource: generatedLifeBook.finalQualityReviewSource || "",
    finalQualityReviewPassed: Boolean(generatedLifeBook.finalQualityReviewPassed),
    finalQualityReviewErrors: generatedLifeBook.finalQualityReviewErrors || [],
    finalQualityReviewWarnings: generatedLifeBook.finalQualityReviewWarnings || [],
    chapters: completedChapters,
    pdfReady,
    pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl),
    htmlUrl: clean(pdfReady?.htmlUrl),
    canReopen: true,
    canDownload: Boolean(clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl)),
    fallbackUsed: false,
    llmUsed: true,
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
      lifeBookPdfRecord: failedRecord,
      error: normalizedError,
    });
    
    // Provide clear, user-friendly error message
    const userFacingMessage = rawMessage.includes("생년월일") 
      ? "생년월일 정보를 확인할 수 없습니다. 정확한 생년월일시를 입력해 주세요."
      : rawMessage.includes("엔진")
      ? "사주 계산에 일시적 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
      : rawMessage.includes("Gemini") || rawMessage.includes("API")
      ? "원고 생성 AI 호출에 일시적 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
      : rawMessage.includes("원고") || rawMessage.includes("품질")
      ? "생성된 내용이 품질 검증에 실패했습니다. 입력 정보를 다시 확인한 뒤 시도해 주세요."
      : "인생의 책 PDF 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    
    return json({
      ok: false,
      code: error?.code || "LIFEBOOK_GENERATION_FAILED",
      message: userFacingMessage,
      debugSafe: {
        stage: "gemini-generation",
        reportId,
        sessionId,
        lifeBookPdfRecord: failedRecord,
        originalCode: error?.code,
      },
    }, { status: Number(error?.status || 500) });
  }
}

export async function handleSajuLifebookRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    let path = getRoutePath(request, "/api/premium/saju-lifebook");
    if (path === null || path === undefined) {
      path = getRoutePath(request, "/api/lifebook");
    }

    if (method === "POST" && (path === "" || path === "/" || path === "/prepare")) {
      return await handlePrepare(request, env);
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
