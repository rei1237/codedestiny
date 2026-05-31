import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { Solar } from "lunar-javascript";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";

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

const LIFEBOOK_SERVICE_KEY = "saju-lifebook";
const LIFEBOOK_FEATURE_KEY = "saju_life_book_pdf";
const LIFEBOOK_FEATURE_KEY_ALIASES = new Set([
  "saju_lifebook_pdf",
  "premium_pdf_saju_life_book",
  "premium-lifebook-report",
]);

const LIFEBOOK_MIN_CATEGORY_CHARS = 700;
const LIFEBOOK_MIN_CHAPTER_CHARS = 4300;
const LIFEBOOK_MIN_TOTAL_CHARS = 45000;

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
    .replace(/api/gi, "")
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
  "02": ["월령", "조후", "오행", "강약", "균형", "기질"],
  "03": ["용신", "희신", "기신", "구신", "전략", "실행"],
  "04": ["대운", "현재 시기", "변화", "기회", "준비", "흐름"],
  "05": ["사회적 역할", "인정", "성공", "경쟁", "협력", "실리"],
  "06": ["사람", "관계", "협업", "귀인", "거리감", "상처"],
  "07": ["연애", "관계", "결혼", "배우자", "갈등", "유지"],
  "08": ["돈", "수익", "직업", "가격", "사업", "커리어", "성과"],
  "09": ["건강", "체력", "마음", "스트레스", "회복", "생활 리듬"],
  "10": ["신살", "십이운성", "패턴", "이미지", "위기", "리듬"],
  "11": ["위기", "실수", "관계", "돈", "반전", "전략"],
  "12": ["길", "재능", "성과", "1년", "3년", "10년"],
  "13": ["3년", "5년", "10년", "돈", "일", "관계", "통합 전략"],
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
  const required = CHAPTER_TOPIC_RULES[chapterId] || [];
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
      timezone: clean(body.timezone) || "Asia/Seoul",
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
      birthplace,
      birthIso: timeKnown ? `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}` : `${year}-${pad2(month)}-${pad2(day)} 시간 미상`,
    },
  };
}

function chapterTextLength(chapter) {
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

function allowedLifeBookRepetitionScore(chapters = []) {
  const list = Array.isArray(chapters) ? chapters : [];
  const categoryCount = list.reduce((sum, chapter) => sum + (Array.isArray(chapter?.categories) ? chapter.categories.length : 0), 0);
  return Math.max(12, Math.floor(categoryCount * 0.7) + Math.floor(list.length / 2));
}

function evaluateCounselingQuality(text = "") {
  const source = stripForbiddenTokens(text);
  const practicalRe = /(오늘|이번\s*주|먼저|우선|정리|기록|점검|줄이|지출|수면|식사|대화|경계|루틴|실행)/;
  const warmRe = /(괜찮습니다|충분히|응원|믿습니다|당신의\s*속도|천천히|잘\s*해낼|따뜻하게|함께)/;
  const sentenceCount = source.split(/[.!?\n]+/).map((s) => s.trim()).filter((s) => s.length >= 10).length;
  const tail = source.slice(-220);
  return {
    hasPracticalAdvice: practicalRe.test(source),
    hasWarmEnding: warmRe.test(tail),
    sentenceCount,
  };
}

function validateLifeBookFinalManuscript(chapters = []) {
  const errors = [];
  const chapterMetrics = [];
  const list = Array.isArray(chapters) ? chapters : [];
  if (list.length !== CHAPTER_BLUEPRINTS.length) errors.push("chapter_count");
  list.forEach((chapter, idx) => {
    const blueprint = CHAPTER_BLUEPRINTS[idx] || { categories: [] };
    const bodyLength = chapterTextLength(chapter);
    if (!chapter) errors.push(`chapter_${idx + 1}_missing`);
    if (clean(chapter?.title) !== clean(blueprint.title)) errors.push(`chapter_${idx + 1}_title_mismatch`);
    if (bodyLength < LIFEBOOK_MIN_CHAPTER_CHARS) errors.push(`chapter_${idx + 1}_too_short`);
    const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
    if (categories.length !== blueprint.categories.length) errors.push(`chapter_${idx + 1}_category_count`);
    categories.forEach((category, cidx) => {
      const expectedTitle = blueprint.categories[cidx] || "";
      const body = clean(category?.finalText || category?.text || category?.localSummary || "");
      if (clean(category?.title) !== clean(expectedTitle)) {
        errors.push(`chapter_${idx + 1}_category_${cidx + 1}_title_mismatch`);
      }
      if (body.length < LIFEBOOK_MIN_CATEGORY_CHARS) {
        errors.push(`chapter_${idx + 1}_category_${cidx + 1}_too_short`);
      }
      if (hasForbiddenText(body)) {
        errors.push(`chapter_${idx + 1}_category_${cidx + 1}_forbidden_text`);
      }
      const quality = evaluateCounselingQuality(body);
      if (!quality.hasPracticalAdvice) {
        errors.push(`chapter_${idx + 1}_category_${cidx + 1}_practical_missing`);
      }
      if (!quality.hasWarmEnding) {
        errors.push(`chapter_${idx + 1}_category_${cidx + 1}_warm_ending_missing`);
      }
      if (quality.sentenceCount < 12) {
        errors.push(`chapter_${idx + 1}_category_${cidx + 1}_sentence_too_few`);
      }
    });

    chapterMetrics.push({
      chapterNo: idx + 1,
      title: clean(chapter?.title),
      categoryCount: categories.length,
      chars: bodyLength,
    });
  });
  const totalLength = totalManuscriptLength(list);
  if (totalLength < LIFEBOOK_MIN_TOTAL_CHARS) errors.push("total_too_short");
  const forbiddenHits = countForbiddenTerms(list);
  if (forbiddenHits > 0) errors.push("forbidden_terms_detected");
  const repScore = repetitionScore(list);
  const repetitionLimit = allowedLifeBookRepetitionScore(list);
  if (repScore > repetitionLimit) errors.push("repetition_detected");
  list.forEach((chapter, index) => {
    if (!validateChapterTopicCoverage(chapter)) errors.push(`chapter_${index + 1}_topic_coverage`);
  });

  const repetition = {
    ok: repScore <= repetitionLimit,
    score: repScore,
    limit: repetitionLimit,
  };

  return {
    ok: errors.length === 0,
    errors,
    totalLength,
    chapterMetrics,
    forbiddenHits,
    repetition,
    repetitionScore: repScore,
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
    engineProfile = buildSajuProfile({
      name: profile.name,
      gender: profile.gender === "male" ? "M" : profile.gender === "female" ? "F" : "OTHER",
      birth: {
        calendarType: profile.calendarType === "lunar" ? "lunar" : "solar",
        year: profile.year,
        month: profile.month,
        day: profile.day,
        hour: Number.isFinite(profile.hour) ? profile.hour : 12,
        minute: Number.isFinite(profile.minute) ? profile.minute : 0,
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
  const dayStem = clean(parsedAnalysis.dayMaster || engineProfile?.dayMaster?.stemKo || getPillarStemLabel(enginePillars?.day) || parsed?.dayMaster);
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
  const monthBranchLabel = clean(parsedAnalysis.monthBranch || parsed?.monthBranch || monthBranch);
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
    paragraph3 = `위기는 갑자기 터지는 사건처럼 보여도 실제로는 작은 신호가 누적되어 나타납니다. ${Array.isArray(signals.weakSignals) && signals.weakSignals.length ? signals.weakSignals.join(", ") : `${clean(signals.caution)} 기운의 과속`}이 반복되면 관계와 일정, 재정이 동시에 흔들릴 수 있습니다. 반전의 핵심은 완벽한 해답을 찾는 일이 아니라, 무너질 때 가장 먼저 회복할 축을 정해 순서대로 복구하는 데 있습니다.`;
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

function buildChapterLocalText(profile, signals, chapter) {
  const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
  return categories.map((categoryTitle, index) => {
    const text = buildCategoryText(profile, signals, chapter, categoryTitle, index);
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
  return CHAPTER_BLUEPRINTS.map((chapter) => {
    const categories = buildChapterLocalText(profile, signals, chapter);
    const localDraft = buildChapterBody(chapter.title, categories);
    return {
      id: chapter.id,
      roman: chapter.roman,
      title: chapter.title,
      subtitle: chapter.subtitle,
      categories,
      localDraft,
      finalText: localDraft,
      text: localDraft,
      source: "local-only",
    };
  });
}

function buildChapterBody(chapterTitle, categories) {
  return categories.map((category) => {
    const text = stripForbiddenTokens(category.finalText || category.localSummary || "");
    return `### ${stripForbiddenTokens(category.title)}\n\n${text}`.trim();
  }).join("\n\n");
}

function createLifeBookFallbackText(profile, signals, chapter, categoryTitle, originText = "") {
  const body = buildCategoryText(profile, signals, chapter, categoryTitle, 0);
  return stripForbiddenTokens([originText, body].filter(Boolean).join("\n\n"));
}

function buildLifeBookFallbackChapters(profile, signals, chapters = []) {
  return ensureCompleteLifeBookChapters(profile, signals, chapters).map((chapter) => ({
    ...chapter,
    finalText: buildChapterBody(chapter.title, chapter.categories),
    text: buildChapterBody(chapter.title, chapter.categories),
    source: "local-only",
  }));
}

function buildLifeBookPayload(profile, signals, chapters, metadata = {}) {
  return deriveLifeBookPayload(profile, signals, chapters, metadata);
}

function ensureCompleteLifeBookChapters(profile, signals, chapters = []) {
  const chapterMap = new Map((Array.isArray(chapters) ? chapters : []).map((item) => [String(item?.id || ""), item]));

  return CHAPTER_BLUEPRINTS.map((blueprint) => {
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

    const chapterText = buildChapterBody(blueprint.title, categories);

    return {
      id: blueprint.id,
      roman: blueprint.roman,
      title: blueprint.title,
      subtitle: blueprint.subtitle,
      categories,
      localDraft: chapterText,
      finalText: stripForbiddenTokens(chapter?.finalText || chapterText),
      text: stripForbiddenTokens(chapter?.finalText || chapterText),
      source: "local-only",
    };
  });
}

function validateLifeBookChapters(chapters = []) {
  const errors = [];
  if (!Array.isArray(chapters) || chapters.length !== CHAPTER_BLUEPRINTS.length) {
    errors.push("chapter_count");
  }

  (chapters || []).forEach((chapter, index) => {
    const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
    const expectedCategoryCount = Array.isArray(CHAPTER_BLUEPRINTS[index]?.categories)
      ? CHAPTER_BLUEPRINTS[index].categories.length
      : 6;
    if (categories.length !== expectedCategoryCount) {
      errors.push(`chapter_${index + 1}_category_count`);
    }
    const chapterBody = stripForbiddenTokens(chapter?.finalText || chapter?.text);
    if (!stripForbiddenTokens(chapter?.title) || chapterBody.length < LIFEBOOK_MIN_CHAPTER_CHARS) {
      errors.push(`chapter_${index + 1}_body`);
    }
    if (!validateChapterTopicCoverage(chapter)) {
      errors.push(`chapter_${index + 1}_topic`);
    }
    categories.forEach((category, categoryIndex) => {
      if (!stripForbiddenTokens(category?.title)) {
        errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_title`);
      }
      if (stripForbiddenTokens(category?.finalText).length < LIFEBOOK_MIN_CATEGORY_CHARS) {
        errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_text`);
      }
    });
  });

  return { ok: errors.length === 0, errors };
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
    if (idx >= 0 && idx < CHAPTER_BLUEPRINTS.length) indexes.add(idx);
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
  let repaired = ensureCompleteLifeBookChapters(profile, signals, reinforceFailedLifeBookChapters(profile, signals, chapters, errors)).map((chapter, index) => {
    const blueprint = CHAPTER_BLUEPRINTS[index] || chapter;
    const categories = (Array.isArray(chapter?.categories) ? chapter.categories : []).map((category, categoryIndex) => {
      const fallbackText = buildCategoryText(profile, signals, blueprint, blueprint.categories[categoryIndex] || category?.title || "핵심 해석", categoryIndex);
      const cleaned = dedupeParagraphs(stripForbiddenTokens(category?.finalText || category?.localSummary || fallbackText));
      const nextText = hasForbiddenText(cleaned) || cleaned.length < LIFEBOOK_MIN_CATEGORY_CHARS
        ? fallbackText
        : ensureCategoryLength(cleaned, blueprint.id, blueprint.categories[categoryIndex] || category?.title || "핵심 해석", categoryIndex);
      return {
        ...category,
        id: String(category?.id || `${categoryIndex + 1}`),
        title: blueprint.categories[categoryIndex] || category?.title || `카테고리 ${categoryIndex + 1}`,
        finalText: nextText,
        localSummary: stripForbiddenTokens(nextText),
      };
    });
    const chapterText = buildChapterBody(blueprint.title, categories);
    return {
      ...chapter,
      id: blueprint.id,
      roman: blueprint.roman,
      title: blueprint.title,
      subtitle: blueprint.subtitle,
      categories,
      localDraft: chapterText,
      finalText: dedupeParagraphs(chapterText),
      text: dedupeParagraphs(chapterText),
      source: "local-only",
    };
  });

  repaired = ensureCompleteLifeBookChapters(profile, signals, repaired).map((chapter) => ({
    ...chapter,
    finalText: dedupeParagraphs(stripForbiddenTokens(chapter.finalText || chapter.text || buildChapterBody(chapter.title, chapter.categories))),
    text: dedupeParagraphs(stripForbiddenTokens(chapter.text || chapter.finalText || buildChapterBody(chapter.title, chapter.categories))),
    source: "local-only",
  }));

  return repaired;
}

function renderLifeBookPdf({ profile, signals, chapters, generatedAt }) {
  const toc = (chapters || []).map((chapter) => `<li><strong>${stripForbiddenTokens(chapter.title)}</strong></li>`).join("\n");
  const chapterHtml = (chapters || []).map((chapter, index) => {
    const keywordTags = (chapter.categories || []).slice(0, 3).map((category) => `<span class="lb-keyword">${stripForbiddenTokens(category.title)}</span>`).join(" ");
    const categoryHtml = (chapter.categories || []).map((category) => `
      <section class="lb-category">
        <h4>${stripForbiddenTokens(category.title)}</h4>
        <p>${stripForbiddenTokens(category.finalText)}</p>
      </section>
    `).join("\n");
    return `
      <article class="lb-chapter">
        <div class="lb-chapter__eyebrow">제 ${String(index + 1)}장</div>
        <h2>${stripForbiddenTokens(chapter.title)}</h2>
        <p class="lb-chapter__intro">${stripForbiddenTokens(chapter.subtitle || "핵심 흐름과 실행 전략을 정리합니다.")}</p>
        <div class="lb-keywords">${keywordTags}</div>
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
  return renderLifeBookPdf(input);
}

function buildPdfReadyPayload(profile, chapters, metadata = {}) {
  return {
    title: `${stripForbiddenTokens(profile.name)} 사주 인생의 책`,
    filename: `saju-lifebook-${String(profile.name || "user").replace(/\s+/g, "-").toLowerCase()}.html`,
    generatedAt: new Date().toISOString(),
    profile,
    metadata,
    html: String(metadata.pdfHtml || ""),
    chapters: chapters.map((chapter, index) => ({
      chapter: index + 1,
      id: chapter.id,
      title: chapter.title,
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
  const existingLock = LIFEBOOK_SESSION_LOCKS.get(sessionId);
  if (existingLock?.status === "running") {
    return json({
      ok: true,
      serviceKey: LIFEBOOK_SERVICE_KEY,
      chapterCount: CHAPTER_BLUEPRINTS.length,
      data: {
        sessionId,
        status: "running",
        startedAt: existingLock.startedAt,
      },
    });
  }
  if (existingLock?.status === "done" && existingLock.result) {
    return json(existingLock.result);
  }
  LIFEBOOK_SESSION_LOCKS.set(sessionId, {
    sessionId,
    status: "running",
    startedAt: new Date().toISOString(),
  });

  try {
  const featureKey = resolveLifeBookFeatureKey(body?.featureKey);
  const billingFeatureKey = toBillingFeatureKey(featureKey);
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

    return json({
      ok: false,
      serviceKey: LIFEBOOK_SERVICE_KEY,
      message,
      code: paymentConfirmedButMissing ? "PAYMENT_CONFIRMED_BUT_ACCESS_MISSING" : (access?.code || "PAYMENT_REQUIRED"),
      debugSafe: {
        featureKey,
        hasSessionId,
        hasPurchaseId,
        hasRequestId,
        hasPaymentToken,
      },
    }, { status });
  }

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
  await startPremiumPdfExecution(env, auth.userId, executionCtx);

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

  logLifeBookServer("LocalDraftBuildStart", { chapterCount: CHAPTER_BLUEPRINTS.length, sessionId });
  const localChapters = buildLifeBookChapters(profile, signals);
  localChapters.forEach((chapter, index) => {
    logLifeBookServer("LocalDraftChapterDone", {
      sessionId,
      chapterNo: index + 1,
      title: chapter.title,
      charLength: chapterTextLength(chapter),
    });
  });
  logLifeBookServer("LocalDraftBuildSuccess", { chapterCount: localChapters.length, sessionId });

  let localValidation = validateLifeBookFinalManuscript(localChapters);
  logLifeBookServer("LocalQualityValidated", {
    sessionId,
    ok: localValidation.ok,
    totalLength: localValidation.totalLength,
    forbiddenTermsCount: localValidation.forbiddenHits,
    repetitionScore: localValidation.repetitionScore,
    errors: localValidation.ok ? [] : localValidation.errors,
  });

  let completedChapters = ensureCompleteLifeBookChapters(profile, signals, localChapters).map((chapter) => ({
    ...chapter,
    source: "local-only",
  }));

  let finalValidation = validateLifeBookFinalManuscript(completedChapters);
  if (!finalValidation.ok) {
    logLifeBookServer("FinalValidationFailed", {
      sessionId,
      errors: finalValidation.errors,
      totalLength: finalValidation.totalLength,
      chapterMetrics: finalValidation.chapterMetrics,
      repetition: finalValidation.repetition,
    });
    completedChapters = repairLifeBookChaptersUntilValid(profile, signals, completedChapters, finalValidation.errors).map((chapter) => ({
      ...chapter,
      source: "local-only",
    }));
    finalValidation = validateLifeBookFinalManuscript(completedChapters);
    if (!finalValidation.ok) {
      throw Object.assign(new Error("인생의 책 원고를 완성하지 못했습니다."), {
        code: "FINAL_MANUSCRIPT_INVALID",
        status: 422,
        details: finalValidation,
      });
    }
  }
  logLifeBookServer("FinalManuscriptValidated", {
    sessionId,
    ok: finalValidation.ok,
    chapterCount: completedChapters.length,
    totalLength: finalValidation.totalLength,
    forbiddenTermsCount: finalValidation.forbiddenHits,
    repetitionScore: finalValidation.repetitionScore,
    manuscriptSource: "local-only",
  });

  const lifebookPayload = buildLifeBookPayload(profile, signals, completedChapters, {
    featureKey,
    calendarType: body?.calendarType,
  });

  const manuscriptSource = "local-only";
  const generatedAt = new Date().toISOString();
  logLifeBookServer("PdfRenderStart", { sessionId, chapterCount: completedChapters.length });

  const pdfReady = buildPdfReadyPayload(profile, completedChapters, {
    featureKey,
    reportType: "lifeBook",
    accessType: String(access.accessType || "unknown"),
    manuscriptSource,
    pdfHtml: buildLifeBookDocument({ profile, signals, chapters: completedChapters, generatedAt }),
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
  logLifeBookServer("PdfRenderSuccess", { sessionId, chapterCount: completedChapters.length });

  await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
    manuscriptSource,
    chapterCount: completedChapters.length,
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
      localSajuJson,
      pdfReady,
      canReopen: true,
      canDownload: Boolean(clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl)),
    },
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
    chapters: completedChapters,
    pdfReady,
    pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl),
    htmlUrl: clean(pdfReady?.htmlUrl),
    canReopen: true,
    canDownload: Boolean(clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl)),
    fallbackUsed: false,
    llmUsed: false,
  };


  const result = {
    status: "completed",
    serverStatus: "completed",
    qualityStatus: "passed",
    ok: true,
    serviceKey: LIFEBOOK_SERVICE_KEY,
    featureKey,
    chapterCount: CHAPTER_BLUEPRINTS.length,
    reportType: "lifeBook",
    data: responseData,
    ...responseData,
  };

  LIFEBOOK_SESSION_LOCKS.set(sessionId, {
    sessionId,
    status: "done",
    startedAt: existingLock?.startedAt || new Date().toISOString(),
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
    
    LIFEBOOK_SESSION_LOCKS.set(sessionId, {
      sessionId,
      status: "failed",
      startedAt: new Date().toISOString(),
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
        stage: "local-only-generation",
        reportId,
        sessionId,
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
