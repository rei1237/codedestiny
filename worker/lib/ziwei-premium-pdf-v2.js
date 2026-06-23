import { callLLM } from "../../lib/llm-client.ts";

export const ZIWEI_PDF_FEATURE_KEY = "premium-ziwei-report";
export const ZIWEI_PDF_CHAPTER_COUNT = 15;
export const ZIWEI_PDF_CONFIG = Object.freeze({
  generationMode: "llm-html-v3",
  provider: "workers-ai-primary-gemini-fallback",
  templateVersion: "ziwei-premium-html-v3.0.0",
});

const PROVIDER_TIMEOUT_MS = 45000;
const ZIWEI_PDF_ENGINE_VERSION = "pdf-v3-llm-only";
const ZIWEI_PDF_CHAPTER_PLAN_VERSION = "ziwei-premium-chapter-plan-v3";
const ZIWEI_PDF_PROMPT_VERSION = "ziwei-premium-prompt-v5";
const ZIWEI_PDF_QUALITY_VERSION = "category-depth-v4";
const CHAPTER_CACHE = new Map();
const MIN_SECTION_BODY_LENGTH = 300;
const MIN_SECTION_PARAGRAPH_COUNT = 3;
const MIN_CHAPTER_LENGTH_RATIO = 0.85;
const DANGEROUS_HTML_RE = /<(script|iframe|object|embed|link|meta|base|form|input|button|textarea|select)\b[\s\S]*?<\/\1>|<(script|iframe|object|embed|link|meta|base|form|input|button|textarea|select)\b[^>]*\/?>/gi;
const EXECUTABLE_HTML_RE = /<(script|iframe|object|embed|form|input|button|textarea|select)\b[\s\S]*?<\/\1>|<(script|iframe|object|embed|form|input|button|textarea|select)\b[^>]*\/?>/gi;
const ALLOWED_CHAPTER_HTML_TAGS = Object.freeze(["article", "h1", "section", "h2", "p"]);
const FORBIDDEN_PDF_TOKENS = Object.freeze([
  "json",
  "payload",
  "schema",
  "chapterplan",
  "sourceoftruth",
  "raw calculation",
  "markdown",
  "fallback",
  "llm",
  "api",
  "debug",
  "engine",
  "internal server error",
  "undefined",
  "null",
  "nan",
  "about:blank",
  "[object object]",
]);

const FORBIDDEN_ZIWEI_REPORT_TERMS = Object.freeze([
  "별자리",
  "패밀리 테스트",
  "패밀리 테스트 결과",
  "cũ",
  "huy",
  "satisfaction",
  "稳定",
  "새로운 기회를 잘 포착",
  "새로운 기회",
  "잘 포착",
  "그에 따라 행동하세요",
  "그에 따라",
  "행동하세요",
  "도움이 됩니다",
  "죽습니다",
  "사망",
  "수명이",
  "암에 걸",
  "병에 걸립니다",
  "반드시 이혼",
  "반드시 파산",
  "파산합니다",
  "재앙",
  "돌이킬 수 없습니다",
  "피할 수 없습니다",
  "무조건 실패",
]);

const FORBIDDEN_ZIWEI_FILLER_SECTIONS = Object.freeze([
  "실전 조언",
  "주의할 흐름",
  "전환의 문장",
]);

const ZIWEI_CORE_TERMS_RE = /(명궁|신궁|12궁|주성|보좌성|살성|사화|대한|유년|재백궁|관록궁|부부궁|자녀궁|천이궁|전택궁|노복궁|형제궁|복덕궁|부모궁|질액궁|화록|화권|화과|화기|자미|천기|태양|무곡|천동|염정|천부|태음|탐랑|거문|천상|천량|칠살|파군)/g;
const ZIWEI_PRACTICAL_SCENE_TERMS = Object.freeze([
  "일의",
  "업무",
  "직업",
  "직장",
  "성과",
  "돈",
  "재정",
  "수입",
  "소비",
  "저축",
  "관계",
  "연애",
  "배우자",
  "친밀감",
  "가족",
  "생활",
  "이동",
  "주거",
  "기반",
  "건강",
  "컨디션",
  "스트레스",
  "수면",
  "휴식",
  "과로",
  "협업",
  "역할",
  "계획",
  "회복",
  "루틴",
]);

const ZIWEI_CHAPTER_PRACTICAL_FOCUS = Object.freeze({
  ch01: ["일", "돈", "관계", "이동", "회복", "생활"],
  ch02: ["생활", "관계", "역할", "계획"],
  ch03: ["생활", "돈", "관계", "계획", "회복"],
  ch04: ["일", "직업", "성과", "성취", "관계", "돈"],
  ch05: ["관계", "협업", "스트레스", "생활", "역할"],
  ch06: ["돈", "재정", "수입", "소비", "직업", "직장", "업무", "성과", "성취"],
  ch07: ["관계", "연애", "배우자", "친밀감", "가족", "생활", "역할"],
  ch08: ["이동", "주거", "기반", "생활", "계획"],
  ch09: ["협업", "관계", "역할", "생활"],
  ch10: ["회복", "생활", "가족", "역할"],
  ch11: ["건강", "컨디션", "스트레스", "수면", "휴식", "과로", "회복", "루틴", "생활"],
  ch12: ["계획", "장기", "일", "관계", "돈", "이동", "기반"],
  ch13: ["올해", "상반기", "하반기", "계획", "생활", "관계"],
  ch14: ["초년", "중년", "말년", "전환점", "일", "관계", "기반", "이동"],
  ch15: ["돈", "일", "관계", "회복", "생활"],
});

function countOccurrences(text = "", needle = "") {
  if (!needle) return 0;
  return String(text || "").split(needle).length - 1;
}

function countRegexMatches(text = "", regex) {
  return (String(text || "").match(regex) || []).length;
}

function sleep(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

function retryDelayMs(retry = 0) {
  const base = Math.min(8000, 1000 * (2 ** Math.max(0, Number(retry) || 0)));
  return base + Math.floor(Math.random() * 350);
}

function normalizeQualityText(value = "") {
  return clean(String(value || "").replace(/\s+/g, " "));
}

function splitReportSentences(value = "") {
  return String(value || "")
    .split(/[.!?。！？\n]|다\.|요\.|니다\./)
    .map((item) => normalizeQualityText(item))
    .filter((item) => item.length >= 80);
}

function firstReportSentence(value = "") {
  const text = normalizeQualityText(value);
  const dotIndex = text.indexOf(".");
  return dotIndex >= 0 ? text.slice(0, Math.min(dotIndex + 1, 180)) : text.slice(0, 180);
}

function hasSectionHeadingEcho(sectionTitle = "", body = "") {
  const title = clean(sectionTitle);
  if (title.length < 3) return false;
  return firstReportSentence(body).includes(title);
}

function hasRepeatedLongSentences(text = "") {
  const seen = new Set();
  for (const sentence of splitReportSentences(text)) {
    const key = sentence.replace(/\s+/g, " ");
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function hasRepeatedLongParagraphs(paragraphs = []) {
  const seen = new Set();
  for (const paragraph of paragraphs.map(normalizeQualityText).filter((item) => item.length >= 80)) {
    if (seen.has(paragraph)) return true;
    seen.add(paragraph);
  }
  return false;
}

function paragraphSimilarity(a = "", b = "") {
  const toGrams = (value) => {
    const text = normalizeQualityText(value).replace(/\s+/g, "");
    if (text.length < 12) return new Set(text.split("").filter(Boolean));
    const grams = [];
    for (let index = 0; index <= text.length - 3; index += 1) {
      grams.push(text.slice(index, index + 3));
    }
    return new Set(grams);
  };
  const left = toGrams(a);
  const right = toGrams(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const item of left) if (right.has(item)) shared += 1;
  return shared / Math.max(left.size, right.size);
}

function hasTooManySimilarParagraphs(paragraphs = []) {
  const list = paragraphs.map(normalizeQualityText).filter((item) => item.length >= 100);
  let similarPairs = 0;
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      if (paragraphSimilarity(list[i], list[j]) >= 0.82) similarPairs += 1;
      if (similarPairs >= 3) return true;
    }
  }
  return false;
}

function hasForeignReportToken(value = "") {
  const text = String(value || "");
  if (/\b(cũ|huy|satisfaction)\b/i.test(text)) return true;
  if (/稳定/.test(text)) return true;
  return /[\u00c0-\u024f]|[\u0400-\u04ff]|[\u0600-\u06ff]/.test(text);
}

function hasAsciiReportToken(value = "") {
  return /[A-Za-z]{2,}|\b[A-Za-z]\b/.test(String(value || ""));
}

function hasDangerousHtml(value = "") {
  DANGEROUS_HTML_RE.lastIndex = 0;
  const found = DANGEROUS_HTML_RE.test(String(value || ""));
  DANGEROUS_HTML_RE.lastIndex = 0;
  return found;
}

function hasExecutableHtml(value = "") {
  EXECUTABLE_HTML_RE.lastIndex = 0;
  const found = EXECUTABLE_HTML_RE.test(String(value || ""));
  EXECUTABLE_HTML_RE.lastIndex = 0;
  return found;
}

function hasDisallowedChapterTag(value = "") {
  const tags = Array.from(String(value || "").matchAll(/<\/?\s*([a-zA-Z][\w:-]*)\b/g)).map((match) => clean(match[1]).toLowerCase());
  return tags.some((tag) => !ALLOWED_CHAPTER_HTML_TAGS.includes(tag));
}

function hasForbiddenZiweiReportTerm(value = "") {
  const text = String(value || "");
  return FORBIDDEN_ZIWEI_REPORT_TERMS.some((term) => text.includes(term))
    || FORBIDDEN_ZIWEI_FILLER_SECTIONS.some((term) => text.includes(term));
}

function displayReportName(value = "") {
  const name = clean(value || "본인", 80);
  return /패밀리\s*테스트/i.test(name) ? "본인" : name;
}

function extractHeadings(html = "", tag = "h2") {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  return Array.from(String(html || "").matchAll(re)).map((match) => stripTags(match[1]));
}

function hasDuplicateItems(items = []) {
  const seen = new Set();
  for (const item of items.map((value) => clean(value)).filter(Boolean)) {
    if (seen.has(item)) return true;
    seen.add(item);
  }
  return false;
}

export const ZIWEI_PREMIUM_CHAPTERS_V2 = Object.freeze([
  {
    id: "ch01",
    order: 1,
    title: "제1장 자미 명반 총론 — 운명의 중심 지도",
    purpose: "명궁, 신궁, 12궁, 주성, 사화 흐름을 종합해 명반 전체의 중심 구조를 잡는다.",
    required: true,
    minLength: 1800,
    sections: ["명반 전체 인상", "명궁과 신궁의 중심축", "12궁 배치가 드러내는 삶의 무대", "강하게 작동하는 주성과 사화", "이 명반을 읽는 핵심 기준"],
  },
  {
    id: "ch02",
    order: 2,
    title: "제2장 명궁과 신궁 — 타고난 나와 완성되는 나",
    purpose: "명궁의 선천 기질과 신궁의 후천적 완성 방향을 분리해 설명한다.",
    required: true,
    minLength: 1800,
    sections: ["명궁이 보여 주는 타고난 성향", "신궁이 드러내는 후천적 변화", "선천 기질과 실제 행동의 차이", "나이가 들수록 강해지는 모습", "나를 안정시키는 운영법"],
  },
  {
    id: "ch03",
    order: 3,
    title: "제3장 선천 사화 정밀 해석",
    purpose: "화록, 화권, 화과, 화기의 작용을 실제 궁과 주성·보좌성·살성 배치에 연결한다.",
    required: true,
    minLength: 1900,
    sections: ["화록이 여는 기회와 매력", "화권이 요구하는 책임과 추진력", "화과가 비추는 평판과 인정", "화기가 알려 주는 집착과 막힘", "사화를 균형 있게 쓰는 방법"],
  },
  {
    id: "ch04",
    order: 4,
    title: "제4장 14주성 완전 해석",
    purpose: "실제 명반에 놓인 14주성을 중심으로 성향과 선택 패턴을 해석한다.",
    required: true,
    minLength: 1900,
    sections: ["명반에서 직접 작동하는 주성", "주성의 강약과 현실 발현", "주성 조합이 만드는 장점", "주성 조합이 만드는 부담", "주성을 성과로 바꾸는 방법"],
  },
  {
    id: "ch05",
    order: 5,
    title: "제5장 보좌성과 살성의 역학 관계",
    purpose: "보좌성, 살성, 보조 성曜의 배치가 흐름을 돕거나 흔드는 방식을 설명한다.",
    required: true,
    minLength: 1900,
    sections: ["보좌성이 더해 주는 보호와 지원", "살성이 만드는 긴장과 경계", "보조 성曜의 현실 작동 방식", "성曜 조합이 만드는 기회와 압박", "강한 성曜의 힘을 다루는 균형법"],
  },
  {
    id: "ch06",
    order: 6,
    title: "제6장 재백궁과 관록궁 — 돈과 사회적 성취",
    purpose: "재백궁과 관록궁을 통해 돈 버는 방식, 직업 방향, 사회적 성취 구조를 해석한다.",
    required: true,
    minLength: 1900,
    sections: ["재백궁이 말하는 돈의 흐름", "관록궁이 비추는 직업 방향", "돈과 성취가 연결되는 방식", "현실에서 조심해야 할 재정 리듬", "성과를 오래 지키는 전략"],
  },
  {
    id: "ch07",
    order: 7,
    title: "제7장 부부궁과 자녀궁 — 사랑과 가족 리듬",
    purpose: "부부궁과 자녀궁을 중심으로 연애, 배우자상, 가족 리듬을 현실적으로 풀이한다.",
    required: true,
    minLength: 1900,
    sections: ["부부궁이 보여 주는 관계 패턴", "배우자상과 친밀감의 흐름", "가족 안에서 반복되는 감정 구조", "자녀궁이 말하는 창조성과 생활 리듬", "사랑을 안정시키는 관계 조언"],
  },
  {
    id: "ch08",
    order: 8,
    title: "제8장 천이궁과 전택궁 — 이동과 기반의 운",
    purpose: "천이궁과 전택궁으로 이동, 외부 활동, 이직, 주거, 기반을 분리해 해석한다.",
    required: true,
    minLength: 1800,
    sections: ["천이궁이 여는 외부 기회", "전택궁이 말하는 주거와 기반", "이동과 변화가 강해지는 시기", "생활 공간에서 조심할 부분", "변화를 안정으로 바꾸는 방법"],
  },
  {
    id: "ch09",
    order: 9,
    title: "제9장 노복궁과 형제궁 — 인맥과 협업 운",
    purpose: "노복궁과 형제궁을 통해 인맥, 협업, 친구, 동료의 도움과 부담을 설명한다.",
    required: true,
    minLength: 1800,
    sections: ["노복궁이 보여 주는 인맥의 질", "협업에서 힘이 되는 사람", "형제궁이 말하는 가까운 관계", "관계에서 생기는 도움과 부담", "사람 운을 지키는 경계선"],
  },
  {
    id: "ch10",
    order: 10,
    title: "제10장 복덕궁과 부모궁 — 내면 회복과 뿌리",
    purpose: "복덕궁과 부모궁으로 마음의 안정, 정서 회복, 부모 영향과 뿌리의 과제를 풀이한다.",
    required: true,
    minLength: 1800,
    sections: ["복덕궁이 비추는 내면의 쉼터", "부모궁이 남긴 정서적 뿌리", "혼자 있을 때 회복되는 방식", "권위와 기대 앞에서 반복되는 반응", "마음을 지키는 생활 루틴"],
  },
  {
    id: "ch11",
    order: 11,
    title: "제11장 질액궁 — 몸과 마음의 취약 신호",
    purpose: "의학적 단정 없이 질액궁을 생활 리듬, 스트레스, 취약 신호 중심으로 설명한다.",
    required: true,
    minLength: 1800,
    sections: ["질액궁이 알려 주는 몸의 신호", "스트레스가 쌓이는 방식", "생활 리듬에서 흔들리기 쉬운 부분", "회복력을 높이는 조건", "몸과 마음을 지키는 점검법"],
  },
  {
    id: "ch12",
    order: 12,
    title: "제12장 대한 정밀 분석 — 10년 주기의 방향",
    purpose: "현재 대한의 방향, 기회, 과제를 장기 흐름으로 정리한다.",
    required: true,
    minLength: 1900,
    sections: ["현재 대한의 중심 주제", "10년 주기에서 열리는 기회", "대한에서 조심해야 할 과제", "장기 선택의 우선순위", "대한을 전략으로 바꾸는 법"],
  },
  {
    id: "ch13",
    order: 13,
    title: "제13장 유년 로드맵 — 올해의 운 흐름",
    purpose: "올해 운의 흐름, 상반기와 하반기, 주의점과 실행 방향을 제시한다.",
    required: true,
    minLength: 1900,
    sections: ["올해 흐름의 전체 기조", "상반기에 붙잡아야 할 기회", "하반기에 조심해야 할 리듬", "올해 무리하지 말아야 할 부분", "유년 운을 현실로 쓰는 행동"],
  },
  {
    id: "ch14",
    order: 14,
    title: "제14장 생애 마스터플랜 — 전환점과 장기 전략",
    purpose: "초년, 중년, 말년, 전환점, 장기 전략을 명반 전체로 조망한다.",
    required: true,
    minLength: 1900,
    sections: ["초년에 강하게 드러나는 흐름", "중년에 확장되는 가능성", "말년에 안정되는 기반", "중요한 전환점과 선택의 문", "장기 인생 운영 전략"],
  },
  {
    id: "ch15",
    order: 15,
    title: "제15장 자미 거장의 최종 전략 제언",
    purpose: "전체 명반을 종합해 강점, 약점, 돈, 일, 관계, 운이 약할 때의 대처법을 정리한다.",
    required: true,
    minLength: 2000,
    sections: ["명반 전체의 최종 핵심", "강점을 살리는 핵심 행동", "약할 때 피해야 할 위험 행동", "돈과 일과 관계를 함께 지키는 법", "마지막 전략 메시지"],
  },
]);

const ZIWEI_CHAPTER_EXPERT_GUIDANCE = Object.freeze({
  ch01: [
    "명궁, 신궁, 12궁의 균형, 강한 주성, 선천 사화를 한눈에 묶어 명반의 중심 기운을 잡으세요.",
    "운명이 좋다 나쁘다로 단정하지 말고 어떤 삶의 장면에서 힘이 먼저 열리는지 설명하세요.",
    "전체 인상은 추상적인 칭찬보다 돈, 일, 관계, 이동, 회복의 우선순위가 보이게 쓰세요.",
  ],
  ch02: [
    "명궁은 선천적 반응, 신궁은 시간이 지날수록 완성되는 방향으로 분리해 쓰세요.",
    "명궁과 신궁이 충돌하거나 보완되는 지점은 실제 선택 습관과 관계 태도로 풀어주세요.",
    "나이 들수록 강해지는 모습은 과장하지 말고 생활 리듬과 책임 방식으로 설명하세요.",
  ],
  ch03: [
    "화록, 화권, 화과, 화기는 각각 어느 별과 궁에서 작동하는지 제공된 정보 기준으로 연결하세요.",
    "사화는 복을 늘리는 장식이 아니라 욕망, 책임, 평판, 집착이 흐르는 통로로 해석하세요.",
    "화기가 있는 흐름은 불안 조장이 아니라 집착을 관리하는 현실 조언으로 마무리하세요.",
  ],
  ch04: [
    "14주성은 실제 명반에 드러난 주성을 중심으로 쓰고, 없는 주성을 길게 지어내지 마세요.",
    "주성의 강약은 성격 설명에 그치지 말고 일, 관계, 돈, 선택 속도에서 나타나는 방식으로 풀어주세요.",
    "좋은 별도 과하면 부담이 되고 약한 별도 환경에 따라 보완된다는 균형을 유지하세요.",
  ],
  ch05: [
    "보좌성은 돕는 힘, 살성은 긴장과 단련의 힘으로 나누어 배치된 궁의 맥락에서 설명하세요.",
    "좌보, 우필, 문창, 문곡, 천괴, 천월, 경양, 타라, 화성, 영성 등 실제 단서가 있을 때만 구체화하세요.",
    "살성은 겁주는 표현이 아니라 압박 상황에서 어떤 선택 습관을 만들 수 있는지로 풀어주세요.",
  ],
  ch06: [
    "재백궁은 돈이 들어오고 나가는 방식, 관록궁은 사회적 역할과 성취 방식을 중심으로 쓰세요.",
    "재물운을 단정하지 말고 수입 구조, 소비 리듬, 직업 선택의 유리한 방향으로 설명하세요.",
    "돈과 일이 서로를 돕는 지점과 서로를 소모시키는 지점을 모두 짚으세요.",
  ],
  ch07: [
    "부부궁은 관계에서 반복되는 감정 패턴, 자녀궁은 가족 리듬과 돌봄의 방식으로 해석하세요.",
    "결혼과 자녀를 단정하지 말고 친밀감, 책임, 가족 안에서의 역할을 현실적으로 설명하세요.",
    "관계 조언은 상대를 바꾸라는 말보다 본인의 반응과 약속 방식을 정리하는 방향으로 쓰세요.",
  ],
  ch08: [
    "천이궁은 이동, 외부 활동, 이직, 낯선 환경에서 열리는 운을 중심으로 해석하세요.",
    "전택궁은 집, 기반, 주거 안정, 마음이 쉬는 공간을 중심으로 분리해 설명하세요.",
    "이동과 정착이 서로 충돌할 때 어떤 순서로 선택하면 좋은지 구체적으로 제안하세요.",
  ],
  ch09: [
    "노복궁은 친구, 동료, 협업, 도움을 주고받는 사람의 질을 중심으로 쓰세요.",
    "형제궁은 가까운 관계, 수평적 경쟁, 비교심, 손발이 맞는 사람과의 흐름으로 해석하세요.",
    "사람 운은 무조건 넓히기보다 어떤 경계를 세워야 관계가 오래 가는지까지 말해주세요.",
  ],
  ch10: [
    "복덕궁은 혼자 있을 때의 회복력, 마음의 여유, 삶의 만족을 중심으로 해석하세요.",
    "부모궁은 뿌리, 기대, 권위와의 관계, 어릴 때 익숙해진 정서 반응으로 풀어주세요.",
    "부모 영향을 단정하지 말고 현재의 마음 관리와 관계 경계로 연결하세요.",
  ],
  ch11: [
    "질액궁은 의학적 진단을 피하고 스트레스, 수면, 생활 리듬, 과로 신호 중심으로 쓰세요.",
    "취약 신호는 겁주는 표현 대신 몸과 마음이 먼저 보내는 조절 요청으로 설명하세요.",
    "건강 조언은 병명 예측이 아니라 휴식, 루틴, 점검, 전문가 상담 권유처럼 안전하게 마무리하세요.",
  ],
  ch12: [
    "대한은 10년 단위의 큰 방향, 책임, 확장되는 무대, 오래 끌고 갈 과제를 중심으로 쓰세요.",
    "현재 대한 단서가 부족하면 제공된 명반 기준에서 확인되는 큰 흐름만 신중하게 설명하세요.",
    "10년 주기의 조언은 한 해의 사건 예언이 아니라 선택 기준과 우선순위로 정리하세요.",
  ],
  ch13: [
    "유년은 올해의 운 흐름을 상반기와 하반기 리듬, 주의점, 실행 방향으로 나누어 쓰세요.",
    "올해의 기회와 리스크를 단정하지 말고 어떤 태도를 취할 때 유리한지로 설명하세요.",
    "월별 예언처럼 꾸미지 말고 현실적인 점검 루틴과 선택의 속도를 제안하세요.",
  ],
  ch14: [
    "초년, 중년, 말년의 흐름은 명반의 강약이 시간에 따라 어떻게 달라지는지로 설명하세요.",
    "전환점은 사건을 찍어 말하지 말고 일, 관계, 기반, 이동 중 어디에서 선택의 문이 열리는지 쓰세요.",
    "장기 전략은 강점을 반복해서 쓰는 법과 약한 운에서 손실을 줄이는 법으로 정리하세요.",
  ],
  ch15: [
    "전체 명반을 종합해 강점, 약점, 돈, 일, 관계, 회복, 운이 약할 때의 대처를 균형 있게 정리하세요.",
    "최종 조언은 추상적인 응원보다 오늘부터 바꿀 수 있는 생활 선택과 관계 태도로 끝맺으세요.",
    "자미 거장의 말처럼 단단하되 사용자를 겁주지 말고, 운을 다루는 품격 있는 문장으로 마무리하세요.",
  ],
});

export const ZIWEI_CHAPTER_EVIDENCE_FOCUS = Object.freeze({
  ch01: ["명궁", "신궁", "12궁 전체", "강한 주성", "선천 사화"],
  ch02: ["명궁", "신궁", "오행국", "명궁 주성", "신궁 흐름"],
  ch03: ["화록", "화권", "화과", "화기", "사화가 머무는 궁"],
  ch04: ["14주성", "명궁 주성", "관록궁 주성", "재백궁 주성", "부부궁 주성"],
  ch05: ["보좌성", "살성", "좌보", "우필", "경양", "타라", "화성", "영성"],
  ch06: ["재백궁", "관록궁", "화록", "화권", "재물과 직업의 연결"],
  ch07: ["부부궁", "자녀궁", "부부궁 주성", "가족 리듬", "관계 사화"],
  ch08: ["천이궁", "전택궁", "이동 운", "주거 기반", "외부 활동"],
  ch09: ["노복궁", "형제궁", "협업 운", "친구와 동료", "관계 경계"],
  ch10: ["복덕궁", "부모궁", "내면 회복", "뿌리의 영향", "정서 안정"],
  ch11: ["질액궁", "살성의 긴장", "생활 리듬", "스트레스 신호", "회복 루틴"],
  ch12: ["대한", "10년 주기", "대한이 머무는 궁", "장기 과제", "확장 방향"],
  ch13: ["유년", "올해의 궁", "상반기 흐름", "하반기 흐름", "실행 조언"],
  ch14: ["초년", "중년", "말년", "전환점", "장기 전략"],
  ch15: ["명궁", "신궁", "재백궁", "관록궁", "부부궁", "복덕궁", "최종 처방"],
});

const ZIWEI_CHAPTER_REQUIRED_TERMS = Object.freeze({
  ch03: ["화록", "화권", "화과", "화기"],
  ch04: ["14주성", "주성"],
  ch05: ["보좌성", "살성"],
  ch06: ["재백궁", "관록궁"],
  ch07: ["부부궁", "자녀궁"],
  ch08: ["천이궁", "전택궁"],
  ch09: ["노복궁", "형제궁"],
  ch10: ["복덕궁", "부모궁"],
  ch11: ["질액궁"],
  ch12: ["대한", "10년 주기"],
  ch13: ["유년", "상반기", "하반기"],
  ch14: ["초년", "중년", "말년", "전환점"],
  ch15: ["명궁", "신궁", "재백궁", "관록궁", "부부궁", "복덕궁"],
});

export function sectionEvidenceTerms(chapterSpec = {}, sectionIndex = 0) {
  const focus = asArray(ZIWEI_CHAPTER_EVIDENCE_FOCUS[chapterSpec.id]);
  if (!focus.length) return [];
  const primary = focus[sectionIndex % focus.length];
  const secondary = focus[(sectionIndex + 2) % focus.length];
  return [primary, secondary].map((item) => clean(item)).filter((item, itemIndex, list) => item && list.indexOf(item) === itemIndex);
}

export function countEvidenceTerms(value = "", terms = []) {
  const text = String(value || "");
  return asArray(terms).map((item) => clean(item)).filter(Boolean).filter((term) => text.includes(term)).length;
}

function requiredChapterEvidenceCount(chapterSpec = {}) {
  const focus = asArray(ZIWEI_CHAPTER_EVIDENCE_FOCUS[chapterSpec.id]).map((item) => clean(item)).filter(Boolean);
  if (!focus.length) return 0;
  return Math.min(3, Math.max(1, Math.ceil(focus.length / 3)));
}

function missingRequiredChapterTerms(value = "", chapterSpec = {}) {
  const text = String(value || "");
  return asArray(ZIWEI_CHAPTER_REQUIRED_TERMS[chapterSpec.id]).map((item) => clean(item)).filter(Boolean).filter((term) => !text.includes(term));
}

function splitEvidenceLine(value = "") {
  return clean(value)
    .split(/[,/·ㆍ|]+|\s{2,}/)
    .map((item) => clean(item))
    .filter((item) => item.length >= 2 && !["확인", "제한", "명반", "기준"].includes(item));
}

function actualChartEvidenceTerms(facts = {}) {
  const chart = facts.chart || {};
  const terms = [
    ...splitEvidenceLine(chart.strongStars),
    ...splitEvidenceLine(chart.cautionStars),
    ...asArray(chart.transformations).flatMap(splitEvidenceLine),
    ...asArray(chart.decadeLuck).flatMap(splitEvidenceLine),
    ...asArray(chart.annualLuck).flatMap(splitEvidenceLine),
    ...asArray(chart.palaces).flatMap((palace) => [
      ...splitEvidenceLine(palace.mainStars),
      ...splitEvidenceLine(palace.auxStars),
      ...splitEvidenceLine(palace.maleficStars),
    ]),
  ];
  return terms.filter((term, index, list) => term && list.indexOf(term) === index).slice(0, 24);
}

function buildSectionEvidenceHints(chapterSpec = {}) {
  const sections = asArray(chapterSpec.sections);
  if (!asArray(ZIWEI_CHAPTER_EVIDENCE_FOCUS[chapterSpec.id]).length || !sections.length) return "";
  return sections.map((sectionTitle, index) => {
    const evidence = sectionEvidenceTerms(chapterSpec, index).join(", ");
    return `- ${sectionTitle}: ${evidence}`;
  }).join("\n");
}

function buildCategoryQualityHints(chapterSpec = {}) {
  return asArray(chapterSpec.sections).map((sectionTitle, index) => {
    const evidence = sectionEvidenceTerms(chapterSpec, index).join(", ") || "명반 근거";
    return `- ${index + 1}번째 카테고리 「${sectionTitle}」: 첫 문단은 ${evidence}를 근거로 해석하고, 둘째 문단은 현실 장면을 풀고, 셋째 문단은 조심할 점과 실행 방향을 자연스럽게 정리하세요.`;
  }).join("\n");
}

function clean(value, max = 100000) {
  const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  return Number.isFinite(max) ? text.slice(0, max) : text;
}

function block(value, max = 100000) {
  const text = String(value == null ? "" : value).replace(/\r/g, "").trim();
  return Number.isFinite(max) ? text.slice(0, max) : text;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asRecordList(value, keyName = "name") {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(/[,/·ㆍ|]+|\n+/).map((item) => clean(item)).filter(Boolean).map((item) => ({ [keyName]: item }));
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).map(([key, item]) => (
    item && typeof item === "object" && !Array.isArray(item)
      ? { [keyName]: key, ...item }
      : { [keyName]: key, value: item }
  ));
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function stripTags(value) {
  return clean(decodeEntities(String(value || "").replace(/<[^>]+>/g, " ")));
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashStable(value) {
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function containsKorean(value = "") {
  return /[가-힣]/.test(String(value || ""));
}

function hasPracticalScene(value = "") {
  const text = String(value || "");
  return ZIWEI_PRACTICAL_SCENE_TERMS.some((term) => text.includes(term));
}

function missingChapterPracticalFocus(value = "", chapterSpec = {}) {
  const text = String(value || "");
  const focus = asArray(ZIWEI_CHAPTER_PRACTICAL_FOCUS[chapterSpec.id]).map((item) => clean(item)).filter(Boolean);
  if (!focus.length) return [];
  const matched = focus.filter((term) => text.includes(term));
  const required = Math.min(2, focus.length);
  return matched.length >= required ? [] : focus.filter((term) => !matched.includes(term));
}

function hasForbiddenPdfToken(value = "") {
  const text = String(value || "").toLowerCase();
  return FORBIDDEN_PDF_TOKENS.some((token) => text.includes(String(token).toLowerCase()));
}

function cleanBlock(value) {
  return block(value).trim();
}

function hasMarkdownArtifact(value = "") {
  const text = String(value || "");
  return /```/.test(text)
    || /(^|[\n>])\s*#{1,6}\s+/.test(text)
    || /^\s*\|?\s*-{3,}\s*\|/m.test(text);
}

function isSingleArticleFragment(value = "") {
  const text = String(value || "").trim();
  return /^<article\b[\s\S]*<\/article>$/.test(text);
}

function extractTag(html, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  return stripTags(html.match(re)?.[1] || "");
}

function extractSections(html) {
  const sections = [];
  const re = /<section\b[^>]*>([\s\S]*?)<\/section>/gi;
  let match;
  while ((match = re.exec(html))) {
    const fragment = match[1] || "";
    const title = extractTag(fragment, "h2");
    const paragraphs = [];
    const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    let pMatch;
    while ((pMatch = pRe.exec(fragment))) {
      const text = stripTags(pMatch[1]);
      if (text) paragraphs.push(text);
    }
    const body = paragraphs.length ? paragraphs.join("\n\n") : stripTags(fragment.replace(/<h2\b[\s\S]*?<\/h2>/i, ""));
    sections.push({ title, paragraphs: paragraphs.length ? paragraphs : body.split(/\n{2,}/).map((item) => clean(item)).filter(Boolean), body });
  }
  return sections;
}

function starName(star = {}) {
  if (typeof star === "string") return clean(star);
  return clean(star.nameKo || star.name || star.label || star.star || star.starName || star.displayName || star.ko || star["성명"] || star["별"] || "");
}

function starLine(stars = [], limit = 5) {
  const list = typeof stars === "string"
    ? stars.split(/[,/·ㆍ|]+|\s{2,}/).map((item) => clean(item)).filter(Boolean)
    : asArray(stars).map(starName).filter(Boolean);
  return list.slice(0, limit).join(", ");
}

function palaceStars(palace = {}, keys = []) {
  for (const key of keys) {
    const value = palace[key];
    if (Array.isArray(value) ? value.length : clean(value)) return value;
  }
  return [];
}

function transformationLine(item = {}) {
  if (typeof item === "string") return clean(item);
  const star = clean(item.star || item.starName || item.nameKo || item.name || item.targetStar || item.value || item["별"] || "");
  const type = clean(item.type || item.typeKo || item.labelKo || item.label || item.transformation || item.hua || item.sihua || item["사화"] || "");
  const palace = clean(item.palace || item.palaceName || item.house || item["궁"] || "");
  return [star, type, palace].filter(Boolean).join(" ");
}

function normalizeFacts(input = {}) {
  const profile = input.profile || {};
  const seed = input.seed || {};
  const chart = seed.chart || seed.ziweiChart || seed.localZiweiChartJson?.chart || {};
  const local = seed.localZiweiChartJson || {};
  const palaces = asRecordList(
    chart.palaces
    || chart.houses
    || chart.twelvePalaces
    || chart.palaceStarData
    || local?.chart?.palaces
    || local?.chart?.houses
    || local?.chart?.twelvePalaces
  ).slice(0, 12);
  const birthInput = input.birthInput || local.birthInput || {};
  const name = clean(profile.name || birthInput.name || "사용자", 80);
  const birthDate = clean(seed.birthProfile?.birthDate || birthInput.birthDate || profile.birthIso || "");
  const birthTime = clean(seed.birthProfile?.birthTime || birthInput.birthTime || "");
  const mainStars = palaces.flatMap((palace) => (
    typeof palace.mainStars === "string" || typeof palace.majorStars === "string" || typeof palace.stars === "string" || typeof palace.primaryStars === "string" || typeof palace["주성"] === "string"
      ? starLine(palaceStars(palace, ["mainStars", "majorStars", "stars", "primaryStars", "mainStar", "주성"])).split(/,\s*/)
      : asArray(palaceStars(palace, ["mainStars", "majorStars", "stars", "primaryStars", "mainStar", "주성"]))
  ));
  const maleficStars = palaces.flatMap((palace) => (
    typeof palace.maleficStars === "string" || typeof palace.badStars === "string" || typeof palace["살성"] === "string"
      ? starLine(palaceStars(palace, ["maleficStars", "badStars", "shaStars", "살성"])).split(/,\s*/)
      : asArray(palaceStars(palace, ["maleficStars", "badStars", "shaStars", "살성"]))
  ));
  const transformations = asRecordList(
    chart.transformations
    || chart.sihua
    || chart.siHua
    || chart.fourTransformations
    || local?.chart?.transformations
    || local?.chart?.sihua
    || local?.chart?.fourTransformations
  , "type");
  const normalizedPalaces = palaces.map((palace) => ({
    name: clean(palace.nameKo || palace.name || palace.palace || palace.palaceName || palace.label || palace.title || palace["궁"] || ""),
    branch: clean(palace.branch || palace.earthlyBranch || palace.ji || palace["지지"] || ""),
    mainStars: starLine(palaceStars(palace, ["mainStars", "majorStars", "stars", "primaryStars", "mainStar", "주성"])),
    auxStars: starLine(palaceStars(palace, ["auxStars", "auxiliaryStars", "minorStars", "supportStars", "보좌성"]), 4),
    maleficStars: starLine(palaceStars(palace, ["maleficStars", "badStars", "shaStars", "살성"]), 4),
  }));
  const mingGong = clean(chart.mingGong || chart.lifePalace || chart.lifePalaceBranch || chart["명궁"] || local?.chart?.mingGong || local?.chart?.lifePalace || "");
  const shenGong = clean(chart.shenGong || chart.bodyPalace || chart.bodyPalaceBranch || chart["신궁"] || local?.chart?.shenGong || local?.chart?.bodyPalace || "");
  const normalizedTransformations = transformations.slice(0, 8).map(transformationLine).filter(Boolean);
  const inputWarnings = [
    birthDate ? "" : "birth_date_missing",
    birthTime ? "" : "birth_time_missing",
    mingGong ? "" : "ming_gong_missing",
    shenGong ? "" : "shen_gong_missing",
    normalizedPalaces.length >= 12 ? "" : "palace_count_incomplete",
    normalizedPalaces.some((palace) => palace.mainStars) ? "" : "main_stars_missing",
    normalizedTransformations.length ? "" : "four_transformations_missing",
  ].filter(Boolean);
  return {
    reportId: clean(input.reportId || ""),
    sessionId: clean(input.sessionId || ""),
    requestId: clean(input.requestId || input.reportId || input.sessionId || "ziwei-premium", 100),
    inputWarnings,
    profile: {
      name,
      gender: clean(profile.gender || birthInput.gender || ""),
      birthDate,
      birthTime,
      calendarType: clean(seed.birthProfile?.calendarType || birthInput.calendarType || profile.calendarType || ""),
      birthplace: clean(seed.birthProfile?.birthplace || profile.birthplace || ""),
    },
    chart: {
      mingGong,
      shenGong,
      fiveElementBureau: clean(chart.fiveElementBureau || local?.chart?.fiveElementBureau || ""),
      yearStemBranch: clean(chart.yearStemBranch || local?.chart?.yearStemBranch || ""),
      palaces: normalizedPalaces,
      strongStars: starLine(mainStars, 8),
      cautionStars: starLine(maleficStars, 8),
      transformations: normalizedTransformations,
      decadeLuck: asArray(chart.decadeLuck).slice(0, 4).map((item) => clean(item?.label || item?.range || item?.name || item?.palace || "", 80)).filter(Boolean),
      annualLuck: asArray(chart.annualLuck).slice(0, 4).map((item) => clean(item?.label || item?.year || item?.palace || "", 80)).filter(Boolean),
    },
  };
}

function buildSystemPrompt() {
  return [
    "당신은 최고 수준의 자미두수 고수이자 유료 PDF 리포트 전문 작가입니다.",
    "제공된 자미두수 명반 계산 결과만 근거로 삼고, 주성·보좌성·살성·궁·사화·대한·유년 정보를 임의로 바꾸거나 지어내지 마세요.",
    "명궁, 신궁, 12궁, 14주성, 보좌성, 살성, 선천 사화, 대한, 유년 흐름을 중심으로 한국어 상담 리포트를 작성하세요.",
    "출력은 article, h1, section, h2, p 태그만 사용하는 HTML fragment 하나여야 합니다.",
    "JSON, Markdown 코드블록, schema 설명, 내부 key, raw calculation dump, 기술 용어를 절대 출력하지 마세요.",
    "자미두수 용어를 정확히 사용하세요. 별자리라는 표현은 금지하고, 궁·주성·보좌성·살성·사화·대한·유년이라고 쓰세요.",
    "각 section은 서로 다른 관점으로 쓰고, 이전 section 문장을 복사하거나 재사용하지 마세요.",
    "조언·주의·전환을 제목처럼 붙인 고정 라벨을 별도 섹션처럼 추가하지 마세요.",
    "새로운 기회를 잘 포착, 그에 따라 행동하세요, 도움이 됩니다 같은 일반론을 반복하지 마세요.",
    "cũ, huy, satisfaction, 稳定 같은 외국어 조각과 깨진 토큰을 절대 출력하지 마세요.",
    "각 해석은 명반 근거, 자미두수적 의미, 현실 패턴, 조심할 부분, 실천 방향이 자연스럽게 흐르도록 쓰세요.",
    "건강, 결혼, 재물, 미래를 단정하지 말고 자기이해와 엔터테인먼트 목적의 리딩으로 부드럽게 표현하세요.",
  ].join("\n");
}

function buildChapterPrompt({ facts, chapterSpec, previousSummary = "" }) {
  const reportName = displayReportName(facts.profile.name);
  const palaceLines = facts.chart.palaces.map((palace) => (
    `${palace.name || "궁"} ${palace.branch || ""}: 주성 ${palace.mainStars || "확인 제한"} / 보좌성 ${palace.auxStars || "확인 제한"} / 살성 ${palace.maleficStars || "확인 제한"}`
  )).join("\n");
  const sections = chapterSpec.sections.map((title) => `<section><h2>${escapeHtml(title)}</h2><p>...</p><p>...</p></section>`).join("\n");
  const guidanceLines = asArray(ZIWEI_CHAPTER_EXPERT_GUIDANCE[chapterSpec.id])
    .map((line) => `- ${line}`)
    .join("\n");
  const evidenceFocusLines = asArray(ZIWEI_CHAPTER_EVIDENCE_FOCUS[chapterSpec.id])
    .map((line) => `- ${line}`)
    .join("\n");
  const sectionEvidenceLines = buildSectionEvidenceHints(chapterSpec);
  const categoryQualityLines = buildCategoryQualityHints(chapterSpec);
  return [
    "아래 자미두수 명반 요약을 바탕으로 현재 챕터만 작성하세요.",
    "각 section은 PDF의 독립 카테고리 하나입니다. 모든 카테고리는 최소 3문단 이상 작성하고, 같은 문장·같은 예시·같은 조언을 반복하지 마세요.",
    "각 section은 h2 하나와 p 세 개 이상으로 구성하고, section당 공백 제외 320자 이상의 충분한 상담 문장으로 작성하세요.",
    "각 카테고리는 명반 근거, 자미두수적 의미, 현실 장면, 조심할 부분, 실행 방향이 한 흐름으로 이어져야 합니다.",
    "각 section마다 명궁, 신궁, 궁 이름, 주성, 보좌성, 살성, 사화, 대한, 유년 중 제공된 근거를 하나 이상 자연스럽게 연결하세요.",
    "마지막 section도 명궁·신궁·궁·주성·사화·대한·유년 중 하나를 자연스럽게 포함해 챕터 전체가 자미두수 리포트처럼 읽히게 하세요.",
    "근거가 부족한 항목은 지어내지 말고 제공된 명반 데이터 기준에서는 확인이 제한된다고 신중하게 표현하세요.",
    "소제목을 본문 첫 문장에 그대로 반복하지 마세요.",
    "현실 장면, 생활 리듬, 돈, 일, 관계, 건강 관리, 이동, 가족 문제 중 챕터 목적에 맞는 구체적인 장면을 포함하세요.",
    "HTML fragment 외에는 아무것도 출력하지 마세요.",
    previousSummary ? `이전 장 흐름 참고만 하기: ${previousSummary}` : "",
    "",
    "본문에서는 이름을 과도하게 반복하지 말고, 필요하면 본인이라는 표현을 자연스럽게 사용하세요.",
    `이름 표기: ${reportName}`,
    `생년월일과 시간: ${facts.profile.birthDate || "확인 제한"} ${facts.profile.birthTime || ""}`,
    `성별: ${facts.profile.gender || "미상"}`,
    `명궁: ${facts.chart.mingGong || "명반 기준 확인"}`,
    `신궁: ${facts.chart.shenGong || "명반 기준 확인"}`,
    `오행국: ${facts.chart.fiveElementBureau || "명반 기준 확인"}`,
    `강하게 보이는 주성: ${facts.chart.strongStars || "제공 명반의 주성 흐름"}`,
    `주의 깊게 볼 성曜: ${facts.chart.cautionStars || "궁과 성曜의 균형"}`,
    facts.inputWarnings.length ? `명반 입력 경고: ${facts.inputWarnings.join(", ")}` : "",
    facts.inputWarnings.length ? "입력 경고가 있는 항목은 단정하지 말고 제공된 명반 데이터 기준에서는 확인이 제한된다고 자연스럽게 표현하세요." : "",
    facts.chart.transformations.length ? `사화 흐름: ${facts.chart.transformations.join(", ")}` : "",
    facts.chart.decadeLuck.length ? `대한 단서: ${facts.chart.decadeLuck.join(", ")}` : "",
    facts.chart.annualLuck.length ? `유년 단서: ${facts.chart.annualLuck.join(", ")}` : "",
    "",
    "12궁 요약:",
    palaceLines,
    "",
    `현재 챕터: ${chapterSpec.title}`,
    `챕터 목적: ${chapterSpec.purpose}`,
    `최소 본문 길이: 공백 제외 ${chapterSpec.minLength}자 이상`,
    guidanceLines ? `챕터별 전문 지침:\n${guidanceLines}` : "",
    evidenceFocusLines ? `이 장에서 우선 사용할 명반 근거:\n${evidenceFocusLines}` : "",
    sectionEvidenceLines ? `section별 우선 근거:\n${sectionEvidenceLines}` : "",
    categoryQualityLines ? `카테고리별 완성 기준:\n${categoryQualityLines}` : "",
    "",
    "반드시 아래 구조와 소제목을 정확히 한 번씩만 사용하세요.",
    `<article data-chapter-id="${chapterSpec.id}">`,
    `<h1>${escapeHtml(chapterSpec.title)}</h1>`,
    sections,
    "</article>",
  ].filter(Boolean).join("\n");
}

function buildRepairPrompt({ facts, chapterSpec, issues, previousSummary }) {
  return [
    "이전 HTML은 나쁜 예시입니다. 이전 문장을 복사하지 말고 같은 챕터를 처음부터 새로 작성하세요.",
    `검증 실패 항목: ${asArray(issues).join(", ")}`,
    "section.ziwei-term 관련 실패가 있으면 해당 섹션에 명궁, 신궁, 12궁, 주성, 사화, 대한, 유년 중 실제 제공된 근거를 자연스럽게 넣으세요.",
    "chapter.evidence-focus 또는 section.evidence-focus 실패가 있으면 이 장에서 우선 사용할 명반 근거와 section별 우선 근거를 본문 안에 직접 반영하세요.",
    "chapter.actual-chart-evidence 실패가 있으면 제공된 12궁 요약의 실제 주성·보좌성·살성·사화 이름 중 하나 이상을 본문에 자연스럽게 반영하세요.",
    "chapter.practical-focus 또는 section.practical-scene 실패가 있으면 이 장의 주제에 맞는 현실 축, 예를 들어 돈·일·관계·가족·건강·이동·회복 중 해당 장에 맞는 장면을 직접 넣으세요.",
    "chapter.length 또는 section.body 실패가 있으면 각 section의 p를 세 개 이상으로 나누고, 명반 근거·현실 장면·실천 방향을 각각 한 문단씩 보강하세요.",
    "section.paragraphs 실패가 있으면 해당 카테고리를 최소 3문단으로 다시 쓰고, 마지막 문단에는 조심할 점과 실행 방향을 함께 넣으세요.",
    "html.disallowed-tag 실패가 있으면 article, h1, section, h2, p 태그만 사용해 처음부터 다시 작성하세요.",
    "section.heading-echo 실패가 있으면 본문 첫 문장에 소제목을 그대로 반복하지 말고, 명반 근거나 현실 장면으로 바로 시작하세요.",
    "소제목은 chapter plan의 sections를 정확히 한 번씩만 사용하세요.",
    "반복 문장, 외국어 토큰, 별자리 표현, 조언·주의·전환 고정 라벨을 모두 피하세요.",
    buildChapterPrompt({ facts, chapterSpec, previousSummary }),
  ].filter(Boolean).join("\n\n");
}

export function validateZiweiPremiumChapterHtml(html, chapterSpec, facts = {}) {
  const issues = [];
  const source = cleanBlock(html);
  if (!source) issues.push("html.empty");
  if (hasForbiddenPdfToken(source)) issues.push("html.forbidden-token");
  if (hasForbiddenZiweiReportTerm(source)) issues.push("html.forbidden-report-term");
  if (hasMarkdownArtifact(source)) issues.push("html.markdown-artifact");
  if (hasDangerousHtml(source)) issues.push("html.unsafe-tag");
  if (hasDisallowedChapterTag(source)) issues.push("html.disallowed-tag");
  if (!isSingleArticleFragment(source)) issues.push("html.fragment-boundary");
  if ((source.match(/<article\b/gi) || []).length !== 1) issues.push("html.article-count");
  if (!new RegExp(`<article\\b[^>]*data-chapter-id=["']${chapterSpec.id}["']`, "i").test(source)) issues.push("chapter.id");
  const h1 = extractTag(source, "h1");
  if (clean(h1) !== clean(chapterSpec.title)) issues.push("chapter.title");
  const headings = extractHeadings(source, "h2");
  if (hasDuplicateItems(headings)) issues.push("section.duplicate-heading");
  chapterSpec.sections.forEach((title) => {
    const count = headings.filter((heading) => clean(heading) === clean(title)).length;
    if (count !== 1) issues.push(`section.heading-count.${title}`);
  });
  const sections = extractSections(source);
  if (sections.length !== chapterSpec.sections.length) issues.push("section.count");
  const allParagraphs = sections.flatMap((section) => section.paragraphs || []);
  const chapterBodyText = allParagraphs.join("\n");
  const chapterEvidenceTerms = asArray(ZIWEI_CHAPTER_EVIDENCE_FOCUS[chapterSpec.id]).map((item) => clean(item)).filter(Boolean);
  if (chapterEvidenceTerms.length && countEvidenceTerms(chapterBodyText, chapterEvidenceTerms) < requiredChapterEvidenceCount(chapterSpec)) {
    issues.push("chapter.evidence-focus");
  }
  const missingChapterTerms = missingRequiredChapterTerms(chapterBodyText, chapterSpec);
  if (missingChapterTerms.length) issues.push(`chapter.required-terms:${missingChapterTerms.join(",")}`);
  const missingPracticalFocus = missingChapterPracticalFocus(chapterBodyText, chapterSpec);
  if (missingPracticalFocus.length) issues.push(`chapter.practical-focus:${missingPracticalFocus.join(",")}`);
  const actualEvidenceTerms = actualChartEvidenceTerms(facts);
  if (actualEvidenceTerms.length && countEvidenceTerms(chapterBodyText, actualEvidenceTerms) < 1) {
    issues.push("chapter.actual-chart-evidence");
  }
  if (hasRepeatedLongParagraphs(allParagraphs)) issues.push("paragraph.duplicate-long");
  if (hasTooManySimilarParagraphs(allParagraphs)) issues.push("paragraph.too-similar");
  if (hasRepeatedLongSentences(stripTags(source))) issues.push("sentence.duplicate-long");
  if (hasForeignReportToken(stripTags(source))) issues.push("html.foreign-token");
  if (countOccurrences(stripTags(source), "새로운") > 6) issues.push("phrase.too-many-new");
  if (countRegexMatches(stripTags(source), ZIWEI_CORE_TERMS_RE) < 5) issues.push("ziwei.terms.insufficient");
  let sectionsWithCoreTerms = 0;
  let sectionsWithActualEvidence = 0;
  chapterSpec.sections.forEach((title, index) => {
    const section = sections[index] || {};
    if (clean(section.title) !== clean(title)) issues.push(`section.title.${index + 1}`);
    if (!clean(section.body) || clean(section.body).length < MIN_SECTION_BODY_LENGTH) issues.push(`section.body.${index + 1}`);
    if (asArray(section.paragraphs).length < MIN_SECTION_PARAGRAPH_COUNT) issues.push(`section.paragraphs.${index + 1}`);
    if (hasForbiddenPdfToken(section.body)) issues.push(`section.forbidden.${index + 1}`);
    if (hasForbiddenZiweiReportTerm(section.body)) issues.push(`section.report-term.${index + 1}`);
    if (hasForeignReportToken(section.body)) issues.push(`section.foreign.${index + 1}`);
    if (hasAsciiReportToken(section.body)) issues.push(`section.ascii-token.${index + 1}`);
    if (hasSectionHeadingEcho(title, section.body)) issues.push(`section.heading-echo.${index + 1}`);
    if (!containsKorean(section.body)) issues.push(`section.korean.${index + 1}`);
    if (!hasPracticalScene(section.body)) issues.push(`section.practical-scene.${index + 1}`);
    if (sectionEvidenceTerms(chapterSpec, index).length && countEvidenceTerms(section.body, sectionEvidenceTerms(chapterSpec, index)) < 1) {
      issues.push(`section.evidence-focus.${index + 1}`);
    }
    if (actualEvidenceTerms.length && countEvidenceTerms(section.body, actualEvidenceTerms) >= 1) {
      sectionsWithActualEvidence += 1;
    }
    if (countRegexMatches(section.body, ZIWEI_CORE_TERMS_RE) >= 1) sectionsWithCoreTerms += 1;
  });
  if (sectionsWithCoreTerms < Math.min(3, chapterSpec.sections.length)) issues.push("section.ziwei-term.coverage");
  const requiredActualEvidenceSections = Math.min(2, chapterSpec.sections.length || sections.length, actualEvidenceTerms.length);
  if (requiredActualEvidenceSections > 0 && sectionsWithActualEvidence < requiredActualEvidenceSections) {
    issues.push("section.actual-chart-evidence.coverage");
  }
  const minChapterLength = Math.max(1200, Math.floor((Number(chapterSpec.minLength) || 1600) * MIN_CHAPTER_LENGTH_RATIO));
  if (stripTags(source).length < minChapterLength) issues.push("chapter.length");
  return { ok: issues.length === 0, issues, html: source };
}

function parseZiweiPremiumChapterHtml(html, chapterSpec) {
  const source = cleanBlock(html);
  const sections = extractSections(source).map((section, index) => ({
    id: `${chapterSpec.id}-s${index + 1}`,
    heading: chapterSpec.sections[index] || section.title,
    title: chapterSpec.sections[index] || section.title,
    body: section.body,
    paragraphs: section.paragraphs,
  }));
  const categories = sections.map((section) => ({
    title: section.title,
    text: section.body,
    finalText: section.body,
    paragraphs: section.paragraphs,
  }));
  return {
    key: chapterSpec.id,
    id: chapterSpec.id,
    roman: String(chapterSpec.order).padStart(2, "0"),
    order: chapterSpec.order,
    chapterNo: chapterSpec.order,
    title: chapterSpec.title,
    summary: clean(sections[0]?.body || "", 700),
    text: sections.map((section) => section.body).join("\n\n"),
    practicalAdvice: clean(sections.at(-1)?.body || "", 700),
    cautionFlow: clean(sections[Math.max(0, sections.length - 2)]?.body || "", 700),
    transitionLine: clean(sections.at(-1)?.paragraphs?.at(-1) || sections.at(-1)?.body || "", 400),
    sections,
    categories,
    html: source,
    source: ZIWEI_PDF_CONFIG.generationMode,
  };
}

function displayChapterTitle(value = "") {
  return clean(value).replace(/^제\s*\d+\s*장\s*/, "");
}

function withTimeout(promise, timeoutMs) {
  let timer = null;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error("provider_timeout"), { status: 504 })), Math.max(1000, Number(timeoutMs) || PROVIDER_TIMEOUT_MS));
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function callWorkersAi(env, prompt, options = {}) {
  const started = Date.now();
  try {
    const result = await withTimeout(callLLM({
      prompt,
      systemPrompt: buildSystemPrompt(),
      temperature: Number(env.ZIWEI_PREMIUM_LLM_TEMPERATURE || env.SUKYO_PREMIUM_LLM_TEMPERATURE || 0.72),
      maxTokens: Number(options.maxTokens || env.ZIWEI_PREMIUM_CHAPTER_MAX_TOKENS || 10000),
      taskType: "pdf",
    }, env), Number(options.timeoutMs || env.ZIWEI_PREMIUM_LLM_TIMEOUT_MS || env.SUKYO_PREMIUM_LLM_TIMEOUT_MS || PROVIDER_TIMEOUT_MS));
    const rawText = cleanBlock(result?.text || "");
    if (!rawText) return { ok: false, provider: "workers-ai", errorCode: "empty_response", latencyMs: Date.now() - started };
    return {
      ok: true,
      provider: result?.provider === "cloudflare" ? "workers-ai" : clean(result?.provider || "gemini"),
      rawText,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "workers-ai",
      errorCode: "provider_exception",
      errorMessage: clean(error?.message || String(error), 300),
      status: Number(error?.status || 0) || null,
      latencyMs: Date.now() - started,
    };
  }
}

async function callGemini(env, prompt, options = {}) {
  const started = Date.now();
  try {
    const result = await withTimeout(callLLM({
      prompt,
      systemPrompt: buildSystemPrompt(),
      maxTokens: Number(options.maxTokens || env.ZIWEI_PREMIUM_GEMINI_MAX_TOKENS || env.ZIWEI_PREMIUM_CHAPTER_MAX_TOKENS || 10000),
      temperature: Number(env.ZIWEI_PREMIUM_LLM_TEMPERATURE || 0.72),
      taskType: "pdf",
    }, env), Number(options.timeoutMs || env.ZIWEI_PREMIUM_LLM_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || PROVIDER_TIMEOUT_MS));
    const rawText = cleanBlock(result?.text || "");
    if (!rawText) return { ok: false, provider: "gemini", errorCode: "empty_response", latencyMs: Date.now() - started };
    return {
      ok: true,
      provider: result?.provider === "cloudflare" ? "workers-ai" : clean(result?.provider || "gemini"),
      rawText,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "gemini",
      errorCode: "provider_exception",
      errorMessage: clean(error?.message || String(error), 300),
      status: Number(error?.status || 0) || null,
      latencyMs: Date.now() - started,
    };
  }
}

function isRetryableProviderFailure(result = {}) {
  const status = Number(result?.status || 0) || 0;
  const errorCode = clean(result?.errorCode || "").toLowerCase();
  const message = clean(result?.errorMessage || result?.message || "").toLowerCase();
  if (/daily free allocation|quota exceeded|used up your daily/.test(message)) return false;
  if (status === 429) return false;
  if (status >= 500) return true;
  return ["provider_exception", "timeout", "empty_response"].includes(errorCode);
}

async function readCache(env, key) {
  const cached = CHAPTER_CACHE.get(key);
  if (cached) return cached;
  const kv = env?.ZIWEI_PREMIUM_LLM_CACHE || env?.PDF_V2_CACHE || env?.REPORT_CACHE;
  if (!kv?.get) return null;
  try {
    const text = await kv.get(key);
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function writeCache(env, key, value) {
  CHAPTER_CACHE.set(key, value);
  const kv = env?.ZIWEI_PREMIUM_LLM_CACHE || env?.PDF_V2_CACHE || env?.REPORT_CACHE;
  if (kv?.put) {
    try {
      await kv.put(key, JSON.stringify(value), { expirationTtl: 60 * 60 * 24 * 30 });
    } catch (error) {
      logZiweiPdfEvent("CacheWriteSkipped", {
        cacheKey: key,
        errorCode: "cache_write_failed",
        errorMessage: error?.message || String(error),
      });
    }
  }
}

function buildCacheKey(facts, chapterSpec, providerModel = "") {
  return [
    "ziwei-premium",
    ZIWEI_PDF_ENGINE_VERSION,
    ZIWEI_PDF_CHAPTER_PLAN_VERSION,
    ZIWEI_PDF_PROMPT_VERSION,
    ZIWEI_PDF_QUALITY_VERSION,
    clean(providerModel || "workers-ai-gemini"),
    chapterSpec.id,
    "ko",
    hashStable({
      birthDate: facts.profile.birthDate,
      birthTime: facts.profile.birthTime,
      gender: facts.profile.gender,
      mingGong: facts.chart.mingGong,
      shenGong: facts.chart.shenGong,
      fiveElementBureau: facts.chart.fiveElementBureau,
      strongStars: facts.chart.strongStars,
      cautionStars: facts.chart.cautionStars,
      transformations: facts.chart.transformations,
      decadeLuck: facts.chart.decadeLuck,
      annualLuck: facts.chart.annualLuck,
      palaces: facts.chart.palaces.map((palace) => ({
        name: palace.name,
        branch: palace.branch,
        mainStars: palace.mainStars,
        auxStars: palace.auxStars,
        maleficStars: palace.maleficStars,
      })),
      inputWarnings: facts.inputWarnings,
    }),
  ].join(":");
}

function resolveLlmProviders(env = {}) {
  const providers = String(env?.ZIWEI_PREMIUM_LLM_PROVIDERS || "workers-ai,gemini")
    .split(",")
    .map((item) => clean(item))
    .filter((item) => item === "workers-ai" || item === "gemini");
  const unique = [];
  for (const provider of providers) {
    if (!unique.includes(provider)) unique.push(provider);
  }
  if (!unique.includes("workers-ai")) unique.unshift("workers-ai");
  if (clean(env?.ZIWEI_PREMIUM_DISABLE_GEMINI_FALLBACK).toLowerCase() !== "true" && !unique.includes("gemini")) unique.push("gemini");
  return unique;
}

function resolveProviderModelName(env = {}, provider = "") {
  if (provider === "workers-ai") {
    return clean(env?.ZIWEI_PREMIUM_WORKERS_AI_MODEL || env?.WORKERS_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct");
  }
  if (provider === "gemini") {
    return clean(env?.ZIWEI_PREMIUM_GEMINI_MODEL || env?.GEMINI_MODEL || "gemini");
  }
  return clean(provider || "unknown");
}

function logZiweiPdfEvent(event, data = {}) {
  console.info(`[ZiweiPremiumPDF][${event}]`, {
    jobId: clean(data.jobId || data.reportId || ""),
    reportId: clean(data.reportId || ""),
    requestId: clean(data.requestId || ""),
    chapterId: clean(data.chapterId || ""),
    chapterOrder: Number(data.chapterOrder || 0) || undefined,
    source: clean(data.source || ""),
    provider: clean(data.provider || ""),
    modelName: clean(data.modelName || ""),
    promptVersion: clean(data.promptVersion || ""),
    chapterPlanVersion: clean(data.chapterPlanVersion || ""),
    qualityVersion: clean(data.qualityVersion || ""),
    fromCache: typeof data.fromCache === "boolean" ? data.fromCache : undefined,
    cacheKey: clean(data.cacheKey || ""),
    localFallbackUsed: data.localFallbackUsed === true,
    retry: Number.isFinite(Number(data.retry)) ? Number(data.retry) : undefined,
    errorCode: clean(data.errorCode || ""),
    status: Number(data.status || 0) || undefined,
    errorMessage: clean(data.errorMessage || "", 220),
    issues: Array.isArray(data.issues) ? data.issues.slice(0, 12).map((issue) => clean(issue)) : undefined,
    latencyMs: Number(data.latencyMs || 0) || undefined,
  });
}

async function generateChapter(env, facts, chapterSpec, previousSummary) {
  const providers = resolveLlmProviders(env);
  for (const cacheProvider of providers) {
    const cacheModelName = resolveProviderModelName(env, cacheProvider);
    const cacheKey = buildCacheKey(facts, chapterSpec, `${cacheProvider}:${cacheModelName}`);
    const cached = await readCache(env, cacheKey);
    if (cached?.html) {
      const cachedHtml = cleanBlock(cached.html);
      const validation = validateZiweiPremiumChapterHtml(cachedHtml, chapterSpec, facts);
      const cacheQualityOk = clean(cached.qualityVersion) === ZIWEI_PDF_QUALITY_VERSION
        && clean(cached.chapterPlanVersion) === ZIWEI_PDF_CHAPTER_PLAN_VERSION
        && clean(cached.promptVersion) === ZIWEI_PDF_PROMPT_VERSION
        && clean(cached.source) === "llm"
        && clean(cached.provider) === cacheProvider
        && cached.localFallbackUsed !== true;
      if (validation.ok && cacheQualityOk) {
        logZiweiPdfEvent("ZIWEI_CHAPTER_SOURCE_CHECK", {
          reportId: facts.reportId,
          requestId: facts.requestId,
          chapterId: chapterSpec.id,
          chapterOrder: chapterSpec.order,
          source: "llm-cache",
          provider: cacheProvider,
          modelName: cacheModelName,
          promptVersion: ZIWEI_PDF_PROMPT_VERSION,
          chapterPlanVersion: ZIWEI_PDF_CHAPTER_PLAN_VERSION,
          qualityVersion: ZIWEI_PDF_QUALITY_VERSION,
          fromCache: true,
          cacheKey,
          localFallbackUsed: false,
        });
        return { ok: true, html: validation.html, provider: cacheProvider, cached: true, attempts: [] };
      }
    }
  }

  const repairLimit = Math.min(3, Math.max(0, Number(env?.ZIWEI_PREMIUM_LLM_REPAIR_LIMIT ?? 2)));
  const attempts = [];
  logZiweiPdfEvent("ChapterGenerationStarted", {
    reportId: facts.reportId,
    requestId: facts.requestId,
    chapterId: chapterSpec.id,
    chapterOrder: chapterSpec.order,
  });

  for (const provider of providers) {
    const modelName = resolveProviderModelName(env, provider);
    const cacheKey = buildCacheKey(facts, chapterSpec, `${provider}:${modelName}`);
    let prompt = buildChapterPrompt({ facts, chapterSpec, previousSummary });
    let previousHtml = "";
    for (let retry = 0; retry <= repairLimit; retry += 1) {
      const result = provider === "workers-ai"
        ? await callWorkersAi(env, prompt, { requestId: `${facts.requestId}:${chapterSpec.id}` })
        : await callGemini(env, prompt, { requestId: `${facts.requestId}:${chapterSpec.id}` });
      const attempt = {
        provider,
        retry,
        ok: Boolean(result.ok),
        errorCode: result.errorCode || "",
        errorMessage: result.errorMessage || "",
        status: result.status || null,
        latencyMs: result.latencyMs || 0,
      };
      attempts.push(attempt);
      if (!result.ok) {
        logZiweiPdfEvent("ChapterProviderFailed", {
          reportId: facts.reportId,
          requestId: facts.requestId,
          chapterId: chapterSpec.id,
          chapterOrder: chapterSpec.order,
          provider,
          retry,
          errorCode: attempt.errorCode,
          status: attempt.status,
          errorMessage: attempt.errorMessage,
          latencyMs: attempt.latencyMs,
        });
        if (retry >= repairLimit || !isRetryableProviderFailure(result)) break;
        await sleep(retryDelayMs(retry));
        continue;
      }
      previousHtml = cleanBlock(result.rawText);
      const validation = validateZiweiPremiumChapterHtml(previousHtml, chapterSpec, facts);
      if (validation.ok) {
        await writeCache(env, cacheKey, {
          html: validation.html,
          provider,
          source: "llm",
          localFallbackUsed: false,
          engineVersion: ZIWEI_PDF_ENGINE_VERSION,
          chapterPlanVersion: ZIWEI_PDF_CHAPTER_PLAN_VERSION,
          promptVersion: ZIWEI_PDF_PROMPT_VERSION,
          qualityVersion: ZIWEI_PDF_QUALITY_VERSION,
          modelName,
          storedAt: new Date().toISOString(),
        });
        logZiweiPdfEvent("ZIWEI_CHAPTER_SOURCE_CHECK", {
          reportId: facts.reportId,
          requestId: facts.requestId,
          chapterId: chapterSpec.id,
          chapterOrder: chapterSpec.order,
          source: "llm",
          provider,
          modelName,
          promptVersion: ZIWEI_PDF_PROMPT_VERSION,
          chapterPlanVersion: ZIWEI_PDF_CHAPTER_PLAN_VERSION,
          qualityVersion: ZIWEI_PDF_QUALITY_VERSION,
          fromCache: false,
          cacheKey,
          localFallbackUsed: false,
        });
        return { ok: true, html: validation.html, provider, cached: false, attempts };
      }
      attempt.ok = false;
      attempt.errorCode = "validation_failed";
      attempt.issues = validation.issues;
      logZiweiPdfEvent("ChapterValidationFailed", {
        reportId: facts.reportId,
        requestId: facts.requestId,
        chapterId: chapterSpec.id,
        chapterOrder: chapterSpec.order,
        provider,
        retry,
        issues: validation.issues,
      });
      if (retry < repairLimit) {
        prompt = buildRepairPrompt({ facts, chapterSpec, previousHtml, issues: validation.issues, previousSummary });
      }
    }
  }

  return { ok: false, errorCode: "chapter_generation_failed", chapterId: chapterSpec.id, chapterOrder: chapterSpec.order, title: chapterSpec.title, attempts };
}

function renderReportHtml({ facts, chapters }) {
  const reportName = displayReportName(facts.profile.name);
  const categoryCount = chapters.reduce((sum, chapter) => sum + asArray(chapter.sections).length, 0);
  const toc = chapters.map((chapter) => {
    const categoryLine = asArray(chapter.sections).map((section) => escapeHtml(section.title || section.heading || "")).filter(Boolean).join(" · ");
    return `<li><span>제${chapter.order}장</span><strong>${escapeHtml(displayChapterTitle(chapter.title))}</strong>${categoryLine ? `<small>${categoryLine}</small>` : ""}</li>`;
  }).join("");
  const palaceCards = facts.chart.palaces.map((palace) => `
    <div class="palace-card">
      <strong>${escapeHtml(palace.name || "궁")}</strong>
      <span>${escapeHtml(palace.branch || "지지 확인")}</span>
      <p>${escapeHtml(palace.mainStars || "주성 흐름 확인")}</p>
      <div class="palace-lines">
        <em>보좌</em><b>${escapeHtml(palace.auxStars || "잔잔한 보조 흐름")}</b>
        <em>긴장</em><b>${escapeHtml(palace.maleficStars || "강한 압박 제한")}</b>
      </div>
    </div>
  `).join("");
  const chapterHtml = chapters.map((chapter) => chapter.html).join("\n");
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(reportName)} 자미두수 프리미엄 리포트</title>
  <style>
    :root{color-scheme:light;--ink:#211522;--soft:#fffaf4;--mist:#f6efe4;--wine:#4a1727;--jade:#10564a;--gold:#b77a26;--line:#eadbc8}
    *{box-sizing:border-box}
    body{margin:0;background:#211522;color:var(--ink);font-family:"Noto Serif KR","Noto Sans KR","Malgun Gothic",serif;line-height:1.82;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{max-width:1040px;margin:0 auto;background:var(--soft);min-height:100vh}
    .cover{min-height:90vh;padding:72px 64px;background:radial-gradient(circle at 78% 14%,rgba(183,122,38,.26),transparent 24%),radial-gradient(circle at 14% 82%,rgba(16,86,74,.34),transparent 28%),linear-gradient(145deg,#211522 0%,#4a1727 48%,#10564a 100%);color:#fff;display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden}
    .cover:after{content:"";position:absolute;inset:30px;border:1px solid rgba(246,239,228,.38);border-radius:24px;pointer-events:none}
    .kicker{letter-spacing:.16em;color:#f6d48b;font-size:12px;font-weight:800}
    .cover h1{font-size:46px;line-height:1.16;margin:20px 0 16px;color:#fff7df;max-width:760px}
    .cover p{max-width:780px;color:#f2e9dd;font-size:18px}
    .cover-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:34px}
    .cover-grid div{padding:16px;border-radius:12px;background:rgba(255,250,244,.1);border:1px solid rgba(246,212,139,.28)}
    .cover-grid span{display:block;color:#d7c7b5;font-size:12px}
    .cover-grid strong{display:block;color:#fff7df;margin-top:6px}
    .section{padding:46px 64px}
    .section h2{margin:0 0 18px;color:var(--wine);font-size:28px}
    .toc{break-after:page}
    .toc ol{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;margin:0;padding:0;list-style:none}
    .toc li{padding:13px 15px;border-radius:12px;background:#fff;border:1px solid var(--line);border-left:4px solid var(--gold);break-inside:avoid}
    .toc span{display:block;color:var(--gold);font-size:12px;font-weight:800}
    .toc strong{display:block;color:var(--ink)}
    .toc small{display:block;margin-top:6px;color:#735f52;font-size:12px;line-height:1.55}
    .palace-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    .palace-card{padding:15px;border-radius:12px;background:#fff;border:1px solid var(--line);box-shadow:0 8px 18px rgba(33,21,34,.05)}
    .palace-card strong{display:block;color:var(--jade)}
    .palace-card span{display:block;color:#7b6255;font-size:13px}
    .palace-card p{margin:8px 0 10px;color:#3f3150;font-size:14px}
    .palace-lines{display:grid;grid-template-columns:42px 1fr;gap:4px 8px;padding-top:9px;border-top:1px solid #efe1d2}
    .palace-lines em{font-style:normal;color:var(--gold);font-size:12px;font-weight:700}
    .palace-lines b{color:#4d3c35;font-size:12px;font-weight:500}
    article{break-before:page;padding:52px 64px;background:var(--soft);counter-reset:category}
    article h1{margin:0 0 30px;padding:0 0 15px;border-bottom:2px solid var(--gold);color:var(--wine);font-size:30px;line-height:1.35}
    article section{counter-increment:category;margin:22px 0;padding:22px 24px;border-radius:12px;background:#fff;border:1px solid var(--line);box-shadow:0 10px 22px rgba(33,21,34,.05);break-inside:avoid;page-break-inside:avoid}
    article h2{margin:0 0 12px;color:var(--jade);font-size:21px;line-height:1.36;display:flex;gap:10px;align-items:flex-start}
    article h2:before{content:counter(category,decimal-leading-zero);flex:0 0 auto;color:var(--gold);font-size:13px;font-weight:800;padding-top:3px}
    article p{margin:0 0 12px;color:#31243e;font-size:16px}
    article p:last-child{margin-bottom:0}
    .notice{padding:30px 64px 52px;color:#6f6078;font-size:13px;border-top:1px solid var(--line)}
    @page{size:A4;margin:15mm 13mm 17mm}
    @media print{body{background:#fff}.page{max-width:none}.cover{border-radius:0}article{break-before:page}.toc{break-after:page}.section{break-inside:avoid}}
    @media(max-width:760px){.cover,.section,article,.notice{padding:32px 20px}.cover h1{font-size:34px}.cover-grid,.palace-grid,.toc ol{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <main class="page">
    <section class="cover">
      <div class="kicker">코드 데스티니 자미두수 프리미엄</div>
      <h1>${escapeHtml(reportName)} 자미두수 프리미엄 리포트</h1>
      <p>명궁과 신궁, 12궁의 주성 흐름을 따라 성향, 일, 돈, 관계, 시기의 결을 한 권의 상담서처럼 정리했습니다.</p>
      <div class="cover-grid">
        <div><span>생년월일</span><strong>${escapeHtml(facts.profile.birthDate || "확인 범위")}</strong></div>
        <div><span>출생 시간</span><strong>${escapeHtml(facts.profile.birthTime || "확인 범위")}</strong></div>
        <div><span>명궁</span><strong>${escapeHtml(facts.chart.mingGong || "명반 기준")}</strong></div>
        <div><span>신궁</span><strong>${escapeHtml(facts.chart.shenGong || "명반 기준")}</strong></div>
        <div><span>챕터</span><strong>${escapeHtml(String(chapters.length))}장</strong></div>
        <div><span>카테고리</span><strong>${escapeHtml(String(categoryCount))}개</strong></div>
      </div>
    </section>
    <section class="section">
      <h2>명반 핵심 좌표</h2>
      <div class="palace-grid">${palaceCards}</div>
    </section>
    <section class="section toc">
      <h2>목차</h2>
      <ol>${toc}</ol>
    </section>
    ${chapterHtml}
    <section class="notice">자미두수 명반의 상징은 마음과 선택의 결을 비추는 참고가 됩니다. 중요한 선택은 현실 조건과 신뢰할 수 있는 전문가의 조언을 함께 살펴 결정해 주세요.</section>
  </main>
</body>
</html>`;
}

function validateZiweiFinalReportHtml(html = "", chapters = []) {
  const issues = [];
  const source = String(html || "");
  const visibleText = stripTags(source.replace(/<style\b[\s\S]*?<\/style>/gi, " "));
  const allParagraphs = chapters.flatMap((chapter) => (
    asArray(chapter.sections).flatMap((section) => asArray(section.paragraphs))
  ));
  if (hasForbiddenPdfToken(source)) issues.push("final.forbidden-token");
  if (hasForbiddenZiweiReportTerm(source)) issues.push("final.forbidden-report-term");
  if (hasMarkdownArtifact(source)) issues.push("final.markdown-artifact");
  if (hasExecutableHtml(source)) issues.push("final.unsafe-tag");
  if (hasForeignReportToken(visibleText)) issues.push("final.foreign-token");
  if (allParagraphs.some((paragraph) => hasAsciiReportToken(paragraph))) issues.push("final.ascii-token");
  if (hasRepeatedLongSentences(visibleText)) issues.push("final.repeated-sentence");
  if (hasRepeatedLongParagraphs(allParagraphs)) issues.push("final.repeated-paragraph");
  let previousArticleIndex = -1;
  for (const [index, chapter] of chapters.entries()) {
    const id = clean(chapter.id);
    const spec = ZIWEI_PREMIUM_CHAPTERS_V2[index];
    const articleRe = new RegExp(`<article\\b[^>]*data-chapter-id=["']${id}["'][^>]*>[\\s\\S]*?<\\/article>`, "g");
    const articleMatches = Array.from(source.matchAll(articleRe)).map((match) => match[0]);
    const count = articleMatches.length;
    if (count !== 1) issues.push(`final.chapter-once.${id}`);
    if (articleMatches.some((articleHtml) => hasDisallowedChapterTag(articleHtml))) issues.push(`final.chapter-disallowed-tag.${id}`);
    if (articleMatches.length === 1 && spec) {
      const articleIndex = source.indexOf(articleMatches[0]);
      if (articleIndex <= previousArticleIndex) issues.push(`final.chapter-order.${id}`);
      previousArticleIndex = articleIndex;
      const articleHtml = articleMatches[0];
      if (clean(extractTag(articleHtml, "h1")) !== clean(spec.title)) issues.push(`final.chapter-title.${id}`);
      const headings = extractHeadings(articleHtml, "h2");
      if (headings.length !== spec.sections.length) issues.push(`final.section-count.${id}`);
      if (hasDuplicateItems(headings)) issues.push(`final.section-duplicate.${id}`);
      spec.sections.forEach((title) => {
        const headingCount = headings.filter((heading) => clean(heading) === clean(title)).length;
        if (headingCount !== 1) issues.push(`final.section-heading.${id}.${title}`);
      });
      const articleSections = extractSections(articleHtml);
      const chapterEvidenceTerms = asArray(ZIWEI_CHAPTER_EVIDENCE_FOCUS[spec.id]).map((item) => clean(item)).filter(Boolean);
      const articleBodyText = articleSections.map((section) => clean(section.body)).join("\n");
      if (chapterEvidenceTerms.length && countEvidenceTerms(articleBodyText, chapterEvidenceTerms) < requiredChapterEvidenceCount(spec)) {
        issues.push(`final.chapter-evidence.${id}`);
      }
      const missingChapterTerms = missingRequiredChapterTerms(articleBodyText, spec);
      if (missingChapterTerms.length) issues.push(`final.chapter-required-terms.${id}.${missingChapterTerms.join(",")}`);
      const missingPracticalFocus = missingChapterPracticalFocus(articleBodyText, spec);
      if (missingPracticalFocus.length) issues.push(`final.chapter-practical-focus.${id}.${missingPracticalFocus.join(",")}`);
      articleSections.forEach((section, sectionIndex) => {
        const expectedTitle = spec.sections[sectionIndex] || "";
        if (clean(section.title) !== clean(expectedTitle)) issues.push(`final.section-title.${id}.${sectionIndex + 1}`);
        if (!clean(section.body) || clean(section.body).length < MIN_SECTION_BODY_LENGTH) issues.push(`final.section-body.${id}.${sectionIndex + 1}`);
        if (asArray(section.paragraphs).length < MIN_SECTION_PARAGRAPH_COUNT) issues.push(`final.section-paragraphs.${id}.${sectionIndex + 1}`);
        if (hasSectionHeadingEcho(expectedTitle, section.body)) issues.push(`final.section-heading-echo.${id}.${sectionIndex + 1}`);
        if (!hasPracticalScene(section.body)) issues.push(`final.section-practical-scene.${id}.${sectionIndex + 1}`);
        if (sectionEvidenceTerms(spec, sectionIndex).length && countEvidenceTerms(section.body, sectionEvidenceTerms(spec, sectionIndex)) < 1) {
          issues.push(`final.section-evidence.${id}.${sectionIndex + 1}`);
        }
        if (hasAsciiReportToken(section.body)) issues.push(`final.section-ascii.${id}.${sectionIndex + 1}`);
      });
    }
  }
  if ((source.match(/<article\b/g) || []).length !== ZIWEI_PDF_CHAPTER_COUNT) issues.push("final.article-count");
  return { ok: issues.length === 0, issues };
}

function buildChapterQuality(chapters = []) {
  const issues = [];
  if (chapters.length !== ZIWEI_PDF_CHAPTER_COUNT) issues.push("chapter.count");
  const chapterReports = chapters.map((chapter, index) => {
    const spec = ZIWEI_PREMIUM_CHAPTERS_V2[index];
    const chapterIssues = [];
    if (!spec) {
      chapterIssues.push(`chapter.spec.${index + 1}`);
      issues.push(...chapterIssues);
      return {
        id: clean(chapter.id),
        order: Number(chapter.order || index + 1),
        source: clean(chapter.source),
        provider: clean(chapter.provider),
        cached: Boolean(chapter.cached),
        sectionCount: asArray(chapter.sections).length,
        ok: false,
        issues: chapterIssues,
      };
    }
    if (clean(chapter.id) !== spec.id) chapterIssues.push(`chapter.id.${index + 1}`);
    if (clean(chapter.title) !== spec.title) chapterIssues.push(`chapter.title.${index + 1}`);
    if (clean(chapter.source) !== ZIWEI_PDF_CONFIG.generationMode) chapterIssues.push(`chapter.source.${index + 1}`);
    if (!clean(chapter.provider)) chapterIssues.push(`chapter.provider.${index + 1}`);
    const sections = asArray(chapter.sections);
    if (sections.length !== spec.sections.length) chapterIssues.push(`chapter.sections.${index + 1}`);
    const chapterBodyText = sections.map((section) => clean(section.body)).join("\n");
    const chapterEvidenceTerms = asArray(ZIWEI_CHAPTER_EVIDENCE_FOCUS[spec.id]).map((item) => clean(item)).filter(Boolean);
    if (chapterEvidenceTerms.length && countEvidenceTerms(chapterBodyText, chapterEvidenceTerms) < requiredChapterEvidenceCount(spec)) {
      chapterIssues.push(`chapter.evidence-focus.${index + 1}`);
    }
    const missingChapterTerms = missingRequiredChapterTerms(chapterBodyText, spec);
    if (missingChapterTerms.length) chapterIssues.push(`chapter.required-terms.${index + 1}.${missingChapterTerms.join(",")}`);
    const missingPracticalFocus = missingChapterPracticalFocus(chapterBodyText, spec);
    if (missingPracticalFocus.length) chapterIssues.push(`chapter.practical-focus.${index + 1}.${missingPracticalFocus.join(",")}`);
    sections.forEach((section, sectionIndex) => {
      const expectedTitle = spec.sections[sectionIndex] || "";
      if (clean(section.title || section.heading) !== clean(expectedTitle)) chapterIssues.push(`section.title.${index + 1}.${sectionIndex + 1}`);
      if (!clean(section.body) || clean(section.body).length < MIN_SECTION_BODY_LENGTH) chapterIssues.push(`section.body.${index + 1}.${sectionIndex + 1}`);
      if (hasAsciiReportToken(section.body)) chapterIssues.push(`section.ascii-token.${index + 1}.${sectionIndex + 1}`);
      if (hasSectionHeadingEcho(expectedTitle, section.body)) chapterIssues.push(`section.heading-echo.${index + 1}.${sectionIndex + 1}`);
      if (!hasPracticalScene(section.body)) chapterIssues.push(`section.practical-scene.${index + 1}.${sectionIndex + 1}`);
      if (sectionEvidenceTerms(spec, sectionIndex).length && countEvidenceTerms(section.body, sectionEvidenceTerms(spec, sectionIndex)) < 1) {
        chapterIssues.push(`section.evidence-focus.${index + 1}.${sectionIndex + 1}`);
      }
      if (asArray(section.paragraphs).length < MIN_SECTION_PARAGRAPH_COUNT) chapterIssues.push(`section.paragraphs.${index + 1}.${sectionIndex + 1}`);
    });
    issues.push(...chapterIssues);
    return {
      id: chapter.id,
      order: chapter.order,
      source: chapter.source,
      provider: chapter.provider,
      cached: Boolean(chapter.cached),
      sectionCount: sections.length,
      ok: chapterIssues.length === 0,
      issues: chapterIssues,
    };
  });
  return {
    ok: issues.length === 0,
    issues,
    chapters: chapterReports,
  };
}

export function validateZiweiPdfCompletionPayload({ pdfReady = {}, chapters = [], requireDownloadUrl = false } = {}) {
  const issues = [];
  const llmAssembly = pdfReady?.llmAssembly || {};
  const finalHtmlValidation = validateZiweiFinalReportHtml(pdfReady.html || "", chapters);
  if (!clean(pdfReady.html)) issues.push("pdfReady.html");
  if (requireDownloadUrl && !clean(pdfReady.pdfUrl || pdfReady.downloadUrl)) issues.push("pdfReady.url");
  if (hasForbiddenPdfToken(pdfReady.html || "")) issues.push("pdfReady.forbidden-token");
  if (!finalHtmlValidation.ok) {
    finalHtmlValidation.issues.forEach((issue) => issues.push(`pdfReady.${issue}`));
  }
  if (chapters.length !== ZIWEI_PDF_CHAPTER_COUNT) issues.push("chapter.count");
  if (llmAssembly.enabled !== true) issues.push("llmAssembly.enabled");
  if (clean(llmAssembly.source) !== ZIWEI_PDF_CONFIG.generationMode) issues.push("llmAssembly.source");
  if (!clean(llmAssembly.provider)) issues.push("llmAssembly.provider");
  if (llmAssembly.externalGeneration !== true) issues.push("llmAssembly.externalGeneration");
  if (llmAssembly.externalCallsAllowed !== true) issues.push("llmAssembly.externalCallsAllowed");
  if (llmAssembly.fallbackUsed !== false) issues.push("llmAssembly.fallbackUsed");
  if (llmAssembly.localFallbackUsed !== false) issues.push("llmAssembly.localFallbackUsed");
  if (clean(llmAssembly.templateVersion) !== ZIWEI_PDF_CONFIG.templateVersion) issues.push("llmAssembly.templateVersion");
  if (Number(llmAssembly.chapterCount || 0) !== ZIWEI_PDF_CHAPTER_COUNT) issues.push("llmAssembly.chapterCount");
  chapters.forEach((chapter, index) => {
    const spec = ZIWEI_PREMIUM_CHAPTERS_V2[index];
    if (!spec) return;
    if (clean(chapter.title) !== spec.title) issues.push(`chapter.title.${index + 1}`);
    if (clean(chapter.source) !== ZIWEI_PDF_CONFIG.generationMode) issues.push(`chapter.source.${index + 1}`);
    if (!clean(chapter.provider)) issues.push(`chapter.provider.${index + 1}`);
    if (asArray(chapter.sections).length !== spec.sections.length) issues.push(`chapter.sections.${index + 1}`);
    const chapterBodyText = asArray(chapter.sections).map((section) => clean(section.body)).join("\n");
    const chapterEvidenceTerms = asArray(ZIWEI_CHAPTER_EVIDENCE_FOCUS[spec.id]).map((item) => clean(item)).filter(Boolean);
    if (chapterEvidenceTerms.length && countEvidenceTerms(chapterBodyText, chapterEvidenceTerms) < requiredChapterEvidenceCount(spec)) {
      issues.push(`chapter.evidence-focus.${index + 1}`);
    }
    const missingChapterTerms = missingRequiredChapterTerms(chapterBodyText, spec);
    if (missingChapterTerms.length) issues.push(`chapter.required-terms.${index + 1}.${missingChapterTerms.join(",")}`);
    const missingPracticalFocus = missingChapterPracticalFocus(chapterBodyText, spec);
    if (missingPracticalFocus.length) issues.push(`chapter.practical-focus.${index + 1}.${missingPracticalFocus.join(",")}`);
    asArray(chapter.sections).forEach((section, sectionIndex) => {
      if (!clean(section.heading) || !clean(section.body) || clean(section.body).length < MIN_SECTION_BODY_LENGTH) issues.push(`section.body.${index + 1}.${sectionIndex + 1}`);
      if (asArray(section.paragraphs).length < MIN_SECTION_PARAGRAPH_COUNT) issues.push(`section.paragraphs.${index + 1}.${sectionIndex + 1}`);
      if (hasAsciiReportToken(section.body)) issues.push(`section.ascii-token.${index + 1}.${sectionIndex + 1}`);
      if (hasSectionHeadingEcho(spec.sections[sectionIndex], section.body)) issues.push(`section.heading-echo.${index + 1}.${sectionIndex + 1}`);
      if (!hasPracticalScene(section.body)) issues.push(`section.practical-scene.${index + 1}.${sectionIndex + 1}`);
      if (sectionEvidenceTerms(spec, sectionIndex).length && countEvidenceTerms(section.body, sectionEvidenceTerms(spec, sectionIndex)) < 1) {
        issues.push(`section.evidence-focus.${index + 1}.${sectionIndex + 1}`);
      }
    });
  });
  return { ok: issues.length === 0, issues, finalHtmlValidation };
}

export function buildZiweiChapterQualityReport(chapters = []) {
  return buildChapterQuality(chapters);
}

export async function generateZiweiPremiumReport(env = {}, input = {}, options = {}) {
  const facts = normalizeFacts(input);
  if (ZIWEI_PREMIUM_CHAPTERS_V2.length !== ZIWEI_PDF_CHAPTER_COUNT) {
    throw Object.assign(new Error("자미두수 PDF 챕터 구성이 완성되지 않았습니다."), {
      status: 500,
      code: "ZIWEI_CHAPTER_MANIFEST_INVALID",
    });
  }

  const generated = [];
  const failedChapters = [];
  let previousSummary = "";
  const providerSet = new Set();

  for (const chapterSpec of ZIWEI_PREMIUM_CHAPTERS_V2) {
    const result = await generateChapter(env, facts, chapterSpec, previousSummary);
    if (!result.ok) {
      failedChapters.push({
        id: chapterSpec.id,
        order: chapterSpec.order,
        title: chapterSpec.title,
        errorCode: result.errorCode,
        attempts: result.attempts || [],
      });
      break;
    }
    const parsed = parseZiweiPremiumChapterHtml(result.html, chapterSpec);
    parsed.provider = result.provider;
    parsed.cached = Boolean(result.cached);
    generated.push(parsed);
    providerSet.add(result.provider);
    previousSummary = clean(stripTags(result.html).slice(-800), 800);
  }

  if (failedChapters.length > 0 || generated.length !== ZIWEI_PDF_CHAPTER_COUNT) {
    const detail = {
      failedChapters,
      chapterCount: generated.length,
      expectedChapterCount: ZIWEI_PDF_CHAPTER_COUNT,
    };
    throw Object.assign(new Error("자미두수 PDF 원고 생성이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요."), {
      status: 503,
      code: "ZIWEI_PREMIUM_GENERATION_FAILED",
      failedChapters,
      chapterCount: generated.length,
      expectedChapterCount: ZIWEI_PDF_CHAPTER_COUNT,
      detail,
    });
  }

  const html = renderReportHtml({ facts, chapters: generated });
  const finalValidation = validateZiweiFinalReportHtml(html, generated);
  if (!finalValidation.ok) {
    throw Object.assign(new Error("자미두수 PDF 최종 조립 검증에 실패했습니다. 잠시 후 다시 시도해 주세요."), {
      status: 422,
      code: "ZIWEI_PREMIUM_FINAL_HTML_INVALID",
      detail: finalValidation,
    });
  }
  if (hasForbiddenPdfToken(html)) {
    throw Object.assign(new Error("자미두수 PDF 문장 검증에 실패했습니다. 잠시 후 다시 시도해 주세요."), {
      status: 422,
      code: "ZIWEI_PREMIUM_VALIDATION_FAILED",
    });
  }

  const provider = providerSet.has("gemini") && providerSet.size === 1
    ? "gemini"
    : providerSet.has("gemini")
      ? "workers-ai-gemini"
      : "workers-ai";
  const llmAssembly = {
    enabled: true,
    source: ZIWEI_PDF_CONFIG.generationMode,
    provider,
    templateVersion: ZIWEI_PDF_CONFIG.templateVersion,
    chapterCount: generated.length,
    expectedChapterCount: ZIWEI_PDF_CHAPTER_COUNT,
    externalGeneration: true,
    externalCallsAllowed: true,
    fallbackUsed: false,
    localFallbackUsed: false,
  };
  const chapterQuality = buildChapterQuality(generated);
  const pdfReady = {
    html,
    filename: `${clean(facts.reportId || "ziwei-premium-report")}.pdf`,
    title: `${displayReportName(facts.profile.name)} 자미두수 프리미엄 PDF`,
    generatedAt: new Date().toISOString(),
    mimeType: "application/pdf",
    contentType: "application/pdf",
    renderFormat: "pdf-archive",
    manuscriptSource: ZIWEI_PDF_CONFIG.generationMode,
    chapterCount: generated.length,
    expectedChapterCount: ZIWEI_PDF_CHAPTER_COUNT,
    inputWarnings: facts.inputWarnings,
    llmAssembly,
    canDownload: true,
  };
  const pdfCompletionValidation = validateZiweiPdfCompletionPayload({ pdfReady, chapters: generated });
  if (!chapterQuality.ok || !pdfCompletionValidation.ok) {
    throw Object.assign(new Error("자미두수 PDF 완료 검증에 실패했습니다. 잠시 후 다시 시도해 주세요."), {
      status: 422,
      code: "ZIWEI_PREMIUM_COMPLETION_FAILED",
      issues: [...chapterQuality.issues, ...pdfCompletionValidation.issues],
    });
  }

  const payload = {
    ok: true,
    status: "completed",
    serverStatus: "completed",
    qualityStatus: "passed",
    reportId: clean(facts.reportId || input.reportId || ""),
    mode: "single",
    profile: facts.profile,
    chart: facts.chart,
    inputWarnings: facts.inputWarnings,
    chapters: generated,
    chapterCount: generated.length,
    expectedChapterCount: ZIWEI_PDF_CHAPTER_COUNT,
    manuscriptSource: ZIWEI_PDF_CONFIG.generationMode,
    generationMode: ZIWEI_PDF_CONFIG.generationMode,
    provider,
    writingPipeline: "ziwei-calculation-to-llm-authored-pdf",
    llmAssembly,
    llmDraftChapterCount: generated.length,
    llmAssemblyOnly: true,
    externalCallsAllowed: true,
    chapterQuality,
    pdfCompletionValidation,
    pdfReady,
  };

  return {
    ok: true,
    ...payload,
    payload,
    html,
    pdfReady,
  };
}
