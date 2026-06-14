import { Solar } from "lunar-javascript";
import { SUKUYO_MANSIONS } from "./sukuyo-premium.js";

export const SUKYO_PDF_FEATURE_KEY = "premium-sukuyo-report-compat";
export const SUKYO_PDF_ALIAS_FEATURE_KEY = "premium_pdf_sukyo_compat";
export const SUKYO_PDF_CHAPTER_COUNT = 15;
export const SUKYO_PDF_CONFIG = Object.freeze({
  generationMode: "local-assembled",
  provider: "sukuyo-assembler",
  templateVersion: "sukuyo-premium-local-assembled-v2",
});

const MIN_CHAPTER_LENGTH = 2800;
const MIN_SECTION_LENGTH = 700;
const MIN_TOTAL_LENGTH = 45000;
const SUKYO_MONTH_START = [11, 13, 15, 17, 19, 21, 23, 25, 0, 2, 4, 7];

const INTERNAL_TOKEN_RE = /\b(?:payload|debug|engine|api|json|localdraft|about:blank|internal\s+server\s+error|chapter\s*\d+|a\(안\)|b\(괴\)|near-triad(?:-[a-z0-9]+)?|\bd\d+\b|triad|자동\s*복구\s*생성|undefined|null|nan)\b/gi;
const FORBIDDEN_BODY_PHRASES = [
  "자동 복구 생성",
  "fallback",
  "데이터가 부족합니다",
  "payload",
  "raw",
  "schema",
  "internal data",
  "내부 데이터",
  "계산 시그니처",
  "데이터 정규화",
  "품질 검증",
  "재생성",
  "compatibilityResult",
  "relationVariant",
  "enhanced.signature",
  "SIG-",
  "myIdx",
  "partnerIdx",
  "distanceMetrics",
  "roleActionGuide",
  "JSON",
  "debug",
  "about:blank",
  "Internal server error",
  "undefined",
  "null",
  "NaN",
  "localdraft",
];

const ALLOWED_DOMAIN_REPEAT_TERMS = ["안괴", "영친", "업태", "근거리", "중거리", "원거리", "화해", "거리 조절"];
const FORBIDDEN_TEMPLATE_STEMS = Object.freeze([
  "의 핵심은",
  "조합에서 이 항목은",
  "의 체감 거리 안에서",
  "말투, 선택 순서, 기다리는 방식, 생활 반응",
  "이번 항목의 실행 기준은",
  "다음 대화에서는",
  "충돌 위험도",
  "장기 지속 가능성",
  "판단 근거는",
  "현실에서는",
  "상담 처방은",
  "이 장의 달빛은",
  "균형 문제",
  "먼저 적용하세요",
  "선택의 언어",
  "관계의 장점보다 먼저 실제 반응의 순서",
  "실제로 판단하는 기준",
  "반응이 가장 먼저 갈라지는 지점",
  "형태로 드러납니다",
  "이 장에서는",
  "처방의 중심은",
  "위험 흐름은",
  "합의 없이 넘기면 피로가 누적됩니다",
  "감정의 반응과 현실의 선택",
  "선택의 속도, 기다림의 길이, 회복의 말투",
  "안에서 다루고",
  "관계 유형 기준은",
  "거리 운영 기준은",
]);
const AWKWARD_JOSA_PATTERNS = Object.freeze([
  "분위기은",
  "이유은",
  "문제을",
  "차이을",
  "의미을",
  "숙제을",
  "이유을",
  "태도을",
  "방식라는",
  "압력라는",
  "가능성라는",
  "속도을",
  "기준을 기준",
  "표현을 표현",
  "흐름을 흐름",
  "기준은 기준",
]);
const SUKUYO_NATURAL_TEXT_REPLACEMENTS = Object.freeze([
  [/속도을/g, "속도를"],
  [/기준을 기준/g, "기준을 핵심 축"],
  [/표현을 표현/g, "표현을"],
  [/흐름을 흐름/g, "흐름을"],
  [/기준은 기준/g, "기준은 핵심 기준"],
  [/분위기은/g, "분위기는"],
  [/이유은/g, "이유는"],
  [/문제을/g, "문제를"],
  [/차이을/g, "차이를"],
  [/의미을/g, "의미를"],
  [/숙제을/g, "숙제를"],
  [/이유을/g, "이유를"],
  [/태도을/g, "태도를"],
  [/방식라는/g, "방식이라는"],
  [/압력라는/g, "압력이라는"],
  [/가능성라는/g, "가능성이라는"],
  [/\\s+안에서\\s+다루고/g, " 흐름으로 다루고"],
]);
const SUKUYO_SAFETY_REPLACEMENTS = Object.freeze([
  [/반드시\s*헤어진다/gi, "관계가 흔들리기 쉬운 지점이 있으므로 조율이 필요하다"],
  [/이\s*관계는\s*파멸한다/gi, "강한 자극과 변화가 생길 수 있어 감정 조절이 중요하다"],
  [/파멸한다/gi, "감정 조절이 중요하다"],
  [/절대\s*만나면\s*안\s*된다/gi, "서로의 속도와 기대치를 조심스럽게 맞춰가야 한다"],
  [/결혼하면\s*불행하다/gi, "생활 리듬과 역할 조율을 충분히 확인해야 한다"],
  [/상대가\s*당신을\s*망친다/gi, "상대의 방식에 지나치게 끌려가면 자신의 리듬을 잃기 쉽다"],
  [/배신당한다/gi, "신뢰 확인이 늦어지면 상처가 커질 수 있다"],
  [/평생\s*상처받는다/gi, "상처가 반복되지 않도록 회복 규칙을 세워야 한다"],
  [/둘은\s*운명적으로\s*안\s*된다/gi, "두 사람은 현실적인 조율 기준을 세울수록 관계를 더 잘 이해할 수 있다"],
  [/안괴라서\s*위험하다/gi, "안괴의 성향은 강한 끌림과 충돌 가능성이 함께 나타날 수 있다"],
  [/위성이라서\s*실패한다/gi, "위성 관계는 현실적인 목표와 역할 조율이 중요하다"],
  [/우쇠라서\s*한쪽이\s*반드시\s*희생한다/gi, "우쇠 관계는 감정의 무게가 한쪽으로 기울지 않게 균형을 잡아야 한다"],
  [/업태라서\s*무조건\s*운명이다/gi, "업태 관계는 익숙함과 깊은 연결감을 느끼기 쉬우나 현실적인 소통도 필요하다"],
  [/영친이라서\s*무조건\s*좋은\s*관계다/gi, "영친 관계는 안정감을 주기 쉽지만 관계 관리가 필요 없는 것은 아니다"],
  [/무조건\s*좋은\s*관계/gi, "관리할수록 안정되는 관계"],
  [/무조건\s*나쁜\s*관계/gi, "조율이 필요한 관계"],
]);

export const SUKYO_PDF_CHAPTERS = Object.freeze([
  { key: "chapter-01-core-map", order: 1, title: "제 1장. 두 사람의 숙명적 궁합 요약", sections: ["두 사람의 전체 인연 한 줄 해석", "이 관계가 시작될 때의 끌림", "함께 있을 때 만들어지는 분위기", "이 관계의 핵심 장점", "가장 조심해야 할 관계의 약점"] },
  { key: "chapter-02-me-love", order: 2, title: "제 2장. 나의 본명숙과 사랑 방식", sections: ["나의 본명숙이 가진 기본 성향", "사랑할 때 드러나는 나의 감정 방식", "관계에서 내가 기대하는 것", "불안할 때 나타나는 나의 반응", "내가 사랑을 오래 유지하는 방법"] },
  { key: "chapter-03-partner-love", order: 3, title: "제 3장. 상대의 본명숙과 사랑 방식", sections: ["상대의 본명숙이 가진 기본 성향", "상대가 사랑을 느끼는 방식", "상대가 관계에서 중요하게 여기는 것", "상대가 멀어질 때 보이는 신호", "상대를 이해하기 위한 핵심 포인트"] },
  { key: "chapter-04-relation-type", order: 4, title: "제 4장. 숙요 관계 유형 정밀 해석", sections: ["두 사람의 관계 유형", "이 관계가 주는 감정적 강도", "서로에게 배우게 되는 것", "관계 유형이 만드는 반복 패턴", "이 관계를 좋게 쓰는 방법"] },
  { key: "chapter-05-distance", order: 5, title: "제 5장. 거리와 인연 강도 분석", sections: ["근거리·중거리·원거리 관계의 의미", "가까워질수록 강해지는 부분", "멀어질수록 드러나는 문제", "인연의 속도와 감정 밀도", "관계의 적절한 거리 조절법"] },
  { key: "chapter-06-attraction", order: 6, title: "제 6장. 첫 만남과 끌림의 이유", sections: ["처음 끌렸던 이유", "서로에게 신비롭게 느껴지는 지점", "외모보다 강하게 작용하는 분위기", "감정이 빨리 깊어지는 이유", "첫 끌림이 오래 지속되기 위한 조건"] },
  { key: "chapter-07-emotion", order: 7, title: "제 7장. 감정 교류와 마음의 온도", sections: ["두 사람의 감정 속도 차이", "애정 표현 방식의 차이", "서운함이 쌓이는 방식", "마음이 통한다고 느끼는 순간", "감정 온도를 맞추는 방법"] },
  { key: "chapter-08-communication", order: 8, title: "제 8장. 대화와 소통 궁합", sections: ["말이 잘 통하는 부분", "말이 엇갈리는 부분", "침묵이 생기는 이유", "싸울 때 사용하는 말의 방식", "관계를 살리는 대화법"] },
  { key: "chapter-09-conflict", order: 9, title: "제 9장. 갈등과 충돌 패턴", sections: ["가장 자주 부딪히는 문제", "서로를 오해하는 지점", "한쪽이 지치게 되는 이유", "감정 폭발이 일어나는 순간", "갈등을 줄이는 현실적인 방법"] },
  { key: "chapter-10-reunion", order: 10, title: "제 10장. 이별과 재회 가능성", sections: ["이 관계가 멀어지는 이유", "이별 후에도 마음이 남는 이유", "재회 가능성을 높이는 조건", "다시 만나도 반복될 수 있는 문제", "재회를 원할 때 가장 중요한 태도"] },
  { key: "chapter-11-marriage", order: 11, title: "제 11장. 장기 연애와 결혼 궁합", sections: ["오래 만날수록 강해지는 부분", "결혼 후 드러날 수 있는 차이", "생활 리듬의 궁합", "책임과 역할 분담의 문제", "장기 관계로 가기 위한 조건"] },
  { key: "chapter-12-reality", order: 12, title: "제 12장. 현실 생활과 가치관 궁합", sections: ["돈과 소비에 대한 태도", "일과 관계의 우선순위", "가족과 주변 사람에 대한 관점", "생활 습관에서 생기는 차이", "현실 문제를 함께 해결하는 방식"] },
  { key: "chapter-13-intimacy", order: 13, title: "제 13장. 친밀감과 애정 표현 궁합", sections: ["서로에게 편안함을 느끼는 방식", "스킨십과 애정 표현의 온도", "사랑받는다고 느끼는 순간", "거절감이나 거리감을 느끼는 순간", "친밀감을 회복하는 방법"] },
  { key: "chapter-14-karma", order: 14, title: "제 14장. 전생 인연과 카르마적 의미", sections: ["이 관계가 전생 인연처럼 느껴지는 이유", "반복해서 끌리는 감정의 정체", "서로에게 남기는 숙제", "관계가 주는 성장의 의미", "이 인연을 성숙하게 마무리하거나 이어가는 법"] },
  { key: "chapter-15-final", order: 15, title: "제 15장. 두 사람을 위한 최종 관계 전략", sections: ["이 관계의 최종 핵심 메시지", "지금 가장 먼저 해야 할 일", "관계를 망치는 행동", "관계를 살리는 행동", "앞으로의 선택을 위한 조언"] },
]);

const CHAPTER_REQUIRED_KEYWORDS = Object.freeze({
  8: ["말", "침묵", "대화"],
  10: ["이별", "재회", "반복"],
  11: ["결혼", "생활", "장기"],
  12: ["돈", "소비", "현실"],
  14: ["전생", "인연", "성장"],
});

const SUKYO_COMPAT_RELATION_INTERPRETATION = Object.freeze({
  "安壞": {
    userLabel: "안괴",
    theme: "강한 끌림과 불안, 보호와 파괴, 빠른 감정 상승",
    strength: "서로의 정체된 감정을 깨우고 관계의 변화를 빠르게 만든다.",
    risk: "감정 강도에 비해 대화 순서가 맞지 않으면 상처가 빠르게 누적된다.",
    advice: "감정 강도보다 회복 규칙과 경계선 합의를 먼저 세운다.",
  },
  "榮親": {
    userLabel: "영친",
    theme: "따뜻한 친밀감과 상호 지지",
    strength: "서로의 안정감을 키우며 장기 관계 기반을 만들기 좋다.",
    risk: "편안함만 유지하려 하면 성장 과제를 미룰 수 있다.",
    advice: "주기적 점검 대화로 관계의 발전 축을 함께 만든다.",
  },
  "業胎": {
    userLabel: "업태",
    theme: "강한 숙제와 성장 압력",
    strength: "깊은 성찰과 변화 계기를 만든다.",
    risk: "감정 소모가 커지면 관계 피로가 누적될 수 있다.",
    advice: "과제와 감정을 분리해 운영하고 휴식 규칙을 고정한다.",
  },
  "友衰": {
    userLabel: "우쇠",
    theme: "정서적 교류와 민감한 피로 축",
    strength: "배려가 잘 맞으면 안정감이 빠르게 높아진다.",
    risk: "작은 오해가 누적되면 피로감이 커질 수 있다.",
    advice: "짧은 확인 대화를 자주 두어 오해를 조기에 해소한다.",
  },
  "危成": {
    userLabel: "위성",
    theme: "성과 지향과 긴장 공존",
    strength: "목표를 함께 설정하면 추진력이 강하다.",
    risk: "감정 점검이 늦으면 관계가 성과 중심으로 치우친다.",
    advice: "성과 대화 전에 감정 상태를 먼저 확인한다.",
  },
  "命": {
    userLabel: "명",
    theme: "동질감과 거울 관계",
    strength: "서로를 빠르게 이해하고 공감하기 쉽다.",
    risk: "같은 패턴이 부딪히면 반복 갈등이 생기기 쉽다.",
    advice: "같은 약점을 다르게 대응하는 규칙을 만든다.",
  },
});

const SUKYO_DISTANCE_INTERPRETATION = Object.freeze({
  near: {
    theme: "가까운 거리, 빠른 반응, 높은 체감도",
    strength: "감정 변화가 즉각 전달되어 친밀감이 빨리 깊어진다.",
    risk: "사소한 말과 행동도 크게 느껴져 예민함이 커질 수 있다.",
    advice: "속도보다 쿨다운과 재접속 규칙을 먼저 합의한다.",
  },
  middle: {
    theme: "완충 거리, 조율 중심",
    strength: "감정과 현실을 균형 있게 점검하기 좋다.",
    risk: "확인 빈도가 낮으면 오해가 누적될 수 있다.",
    advice: "주간 점검 루틴으로 연결 감각을 유지한다.",
  },
  far: {
    theme: "원거리, 해석 차이 확대",
    strength: "개별 자율성을 지키며 성장하기 좋다.",
    risk: "연락 공백이 길어지면 거리감이 급격히 커질 수 있다.",
    advice: "연락 리듬과 핵심 확인 문장을 사전에 고정한다.",
  },
  unknown: {
    theme: "거리 정보 미확정",
    strength: "유연한 운영 설계가 가능하다.",
    risk: "기준 부재로 기대치 충돌이 생길 수 있다.",
    advice: "초기 2주 동안 최소 합의를 먼저 만든다.",
  },
});

const SUKYO_MANSION_RELATION_PROFILE = Object.freeze(
  SUKUYO_MANSIONS.reduce((acc, item) => {
    const label = `${text(item.nameKo)}(${text(item.nameHan)})`;
    acc[label] = {
      relationCore: safeArray(item.keywords).slice(0, 4).join(", "),
      shadow: safeArray(item.shadows).slice(0, 2).join(", "),
      love: `${text(item.nameKo)}숙은 ${safeArray(item.strengths).slice(0, 2).join(" · ")} 중심의 사랑 리듬을 보입니다.`,
      risk: safeArray(item.shadows).slice(0, 2).join(" · ") || "감정 과열",
      advice: `${text(item.nameKo)}숙은 감정 확인과 경계선 합의를 함께 지킬 때 안정적입니다.`,
    };
    return acc;
  }, {}),
);

function text(value, fallback = "") {
  const out = String(value == null ? "" : value).trim();
  return out || fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : [];
}

function safeNumber(value, fallback = null) {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeGender(raw) {
  const token = text(raw).toLowerCase();
  if (["m", "male", "man", "남", "남성"].includes(token)) return "male";
  if (["f", "female", "woman", "여", "여성"].includes(token)) return "female";
  return "unknown";
}

function normalizeCalendarType(raw) {
  const token = text(raw).toLowerCase();
  if (token.includes("solar") || token.includes("양")) return "solar";
  if (token.includes("lunar") || token.includes("음")) return "lunar";
  return "unknown";
}

function parseDateParts(raw) {
  const value = text(raw);
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function buildLocalSukuyoFromLunar(lunarMonthRaw, lunarDayRaw, options = {}) {
  const lunarMonth = Math.max(1, Math.min(12, Math.abs(Number(lunarMonthRaw) || 1)));
  const lunarDay = Math.max(1, Math.min(30, Math.abs(Number(lunarDayRaw) || 1)));
  const start = SUKYO_MONTH_START[lunarMonth - 1] ?? 11;
  const index = (start + lunarDay - 1) % 27;
  const item = SUKUYO_MANSIONS[index];
  if (!item) return null;
  return {
    index,
    ...item,
    lunarMonth,
    lunarDay,
    isLeapMonth: Boolean(options.isLeapMonth),
    source: text(options.source, "sukyo-pdf-local"),
  };
}

function buildLocalSukuyoFromPerson(person = {}) {
  const parts = parseDateParts(person.birthDate);
  if (!parts) return null;
  const calendarType = normalizeCalendarType(person.calendarType);
  if (calendarType === "lunar" || calendarType === "lunar_leap") {
    return buildLocalSukuyoFromLunar(parts.month, parts.day, {
      isLeapMonth: calendarType === "lunar_leap",
      source: "user-lunar-input",
    });
  }
  try {
    const hour = Number.isFinite(Number(person.birthHour)) ? Number(person.birthHour) : 12;
    const minute = Number.isFinite(Number(person.birthMinute)) ? Number(person.birthMinute) : 0;
    const lunar = Solar.fromYmdHms(parts.year, parts.month, parts.day, hour, minute, 0).getLunar();
    const lunarMonth = Number(lunar.getMonth());
    return buildLocalSukuyoFromLunar(Math.abs(lunarMonth), Number(lunar.getDay()), {
      isLeapMonth: lunarMonth < 0,
      source: "lunar-javascript",
    });
  } catch (_) {
    return null;
  }
}

function normalizeSukuyoStar(star = {}, person = {}) {
  const idx = safeNumber(star?.index ?? star?.mansionIndex ?? star?.mansionIdx, null);
  const byIndex = idx == null ? null : SUKUYO_MANSIONS[idx] || null;
  const calculated = text(star?.nameKo || star?.mansion) ? null : buildLocalSukuyoFromPerson(person);
  const source = text(star?.nameKo || star?.mansion)
    ? star
    : calculated || byIndex || {};
  return {
    ...source,
    index: safeNumber(source.index ?? idx, null),
    nameKo: text(source.nameKo || source.mansion || byIndex?.nameKo),
    nameHan: text(source.nameHan || byIndex?.nameHan),
    category: text(source.category || byIndex?.category),
    element: text(source.element || byIndex?.element),
    keywords: safeArray(source.keywords || source.traits || byIndex?.keywords),
    strengths: safeArray(source.strengths || byIndex?.strengths),
    shadows: safeArray(source.shadows || byIndex?.shadows),
    traits: safeArray(source.traits || source.keywords || byIndex?.keywords),
    lunarMonth: safeNumber(source.lunarMonth, null),
    lunarDay: safeNumber(source.lunarDay, null),
    source: text(source.source || calculated?.source || "sukyo-pdf-seed"),
  };
}

const KOREAN_HOUR_MAP = {
  자시: 23,
  축시: 1,
  인시: 3,
  묘시: 5,
  진시: 7,
  사시: 9,
  오시: 11,
  미시: 13,
  신시: 15,
  유시: 17,
  술시: 19,
  해시: 21,
};

function parseBirthTimeLoose(raw) {
  const value = text(raw).toLowerCase();
  if (!value || value.includes("모름") || value.includes("unknown")) {
    return { birthTime: "", birthHour: null, birthMinute: null, isTimeUnknown: true };
  }

  const hanHour = KOREAN_HOUR_MAP[text(raw)];
  if (Number.isFinite(hanHour)) {
    return { birthTime: `${String(hanHour).padStart(2, "0")}:00`, birthHour: hanHour, birthMinute: 0, isTimeUnknown: false };
  }

  let hour = null;
  let minute = 0;

  const hhmm = value.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (hhmm) {
    hour = Number(hhmm[1]);
    minute = Number(hhmm[2] || "0");
  }

  const korean = value.match(/^(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?$/);
  if (korean) {
    const base = Number(korean[2]);
    const isPm = korean[1] === "오후";
    hour = base % 12;
    if (isPm) hour += 12;
    minute = Number(korean[3] || "0");
  }

  if (hour == null) {
    const digitOnly = value.match(/^(\d{1,2})$/);
    if (digitOnly) hour = Number(digitOnly[1]);
  }

  if (!Number.isFinite(hour) || hour < 0 || hour > 23 || !Number.isFinite(minute) || minute < 0 || minute > 59) {
    return { birthTime: "", birthHour: null, birthMinute: null, isTimeUnknown: true };
  }

  return {
    birthTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    birthHour: hour,
    birthMinute: minute,
    isTimeUnknown: false,
  };
}

function normalizePersonInput(raw = {}, fallbackName) {
  const profile = raw.profile && typeof raw.profile === "object" ? raw.profile : raw;
  const birthDate = text(
    profile.birthDate
      || profile.birthday
      || profile.solarDate
      || profile.lunarDate
      || profile.date
      || profile.partnerBirth
      || profile.partnerBirthDate
      || profile.targetBirth
      || profile.targetDate,
  );
  const date = parseDateParts(birthDate);
  const time = parseBirthTimeLoose(
    profile.birthTime
      || profile.time
      || profile.partnerTime
      || profile.hour
      || profile.birth_hour,
  );

  return {
    name: text(profile.name || profile.label || fallbackName),
    gender: normalizeGender(profile.gender || profile.sex),
    calendarType: normalizeCalendarType(profile.calendarType || profile.calType),
    birthDate,
    birthYear: date?.year ?? null,
    birthMonth: date?.month ?? null,
    birthDay: date?.day ?? null,
    birthTime: time.birthTime,
    birthHour: time.birthHour,
    birthMinute: time.birthMinute,
    timezone: text(profile.timezone || "Asia/Seoul"),
    isTimeUnknown: time.isTimeUnknown,
  };
}

function normalizeMode(raw) {
  const mode = text(raw).toLowerCase();
  if (["compatibility", "compat", "couple"].some((token) => mode.includes(token))) return "compatibility";
  if (["personal", "solo", "single"].some((token) => mode.includes(token))) return "personal";
  return "compatibility";
}

function levelByScore(value, axis = "default") {
  const n = safeNumber(value, null);
  if (n == null) return "middle";
  if (axis === "risk") {
    if (n >= 68) return "high";
    if (n >= 45) return "middle";
    return "low";
  }
  if (n >= 72) return "high";
  if (n >= 45) return "middle";
  return "low";
}

function resolveMansionProfile(starLike = {}, fallbackIdx = null) {
  const nameKo = text(starLike?.nameKo || starLike?.mansion || "");
  const nameHan = text(starLike?.nameHan || "");
  const keyWithHan = nameKo && nameHan ? `${nameKo}(${nameHan})` : "";
  const byKey = keyWithHan ? SUKYO_MANSION_RELATION_PROFILE[keyWithHan] : null;
  if (byKey) return byKey;

  const idx = safeNumber(starLike?.index ?? starLike?.mansionIdx ?? fallbackIdx, null);
  const ref = Number.isFinite(idx) ? SUKUYO_MANSIONS[idx] : null;
  if (!ref) {
    return {
      relationCore: "배려, 조율, 감정 확인",
      shadow: "과해석, 피로 누적",
      love: "상대의 반응 리듬을 확인하며 관계를 안정시키려는 성향",
      risk: "확인 순서가 어긋나면 오해가 누적될 수 있음",
      advice: "감정-사실-합의 순서의 대화 루틴을 유지",
    };
  }
  return {
    relationCore: safeArray(ref.keywords).slice(0, 4).join(", "),
    shadow: safeArray(ref.shadows).slice(0, 2).join(", "),
    love: `${text(ref.nameKo)}숙은 ${safeArray(ref.strengths).slice(0, 2).join(" · ")} 중심의 애정 흐름을 보입니다.`,
    risk: safeArray(ref.shadows).slice(0, 2).join(" · ") || "피로 누적",
    advice: `${text(ref.nameKo)}숙은 경계선과 회복 규칙을 함께 지킬 때 안정됩니다.`,
  };
}

function normalizeLegacyResult(raw = {}) {
  const source = raw.sukuyoResult || raw.compatibility || raw.sukuyoBookContext?.compatibility || {};
  const userHost = text(source.user宿 || source.userHost || source.userMansion || source.personAHost);
  const partnerHost = text(source.partner宿 || source.partnerHost || source.partnerMansion || source.personBHost);
  return {
    userHost,
    partnerHost,
    userHostIndex: safeNumber(source.user宿Index ?? source.userHostIndex ?? source.personAHostIndex),
    partnerHostIndex: safeNumber(source.partner宿Index ?? source.partnerHostIndex ?? source.personBHostIndex),
    relationType: text(source.relationshipType || source.relationType || source.type),
    distance: text(source.distance || source.distanceLabel),
  };
}

export function normalizeShukuyoPdfPayload(raw = {}) {
  const mode = normalizeMode(raw.mode || raw.reportMode);
  const selfInput = normalizePersonInput(raw.self || raw.user || raw.birthInput || raw.sukuyoBookContext?.user || {}, "사용자");
  const partnerInput = normalizePersonInput(raw.partner || raw.partnerInput || raw.sukuyoBookContext?.partner || {}, "상대방");
  const legacy = normalizeLegacyResult(raw);

  return {
    mode,
    self: selfInput,
    partner: partnerInput,
    sukuyoResult: {
      user宿: legacy.userHost,
      user宿Index: legacy.userHostIndex,
      partner宿: legacy.partnerHost,
      partner宿Index: legacy.partnerHostIndex,
      relationshipType: legacy.relationType,
      distance: legacy.distance,
    },
  };
}

function applySukyoPremiumTextFilters(value) {
  let out = text(value).trim();
  for (const [pattern, replacement] of SUKUYO_SAFETY_REPLACEMENTS) {
    out = out.replace(pattern, replacement).trim();
  }

  for (const [pattern, replacement] of SUKUYO_NATURAL_TEXT_REPLACEMENTS) {
    out = out.replace(pattern, replacement).trim();
  }

  for (const phrase of FORBIDDEN_BODY_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, "").trim();
  }

  return out.replace(/\s{2,}/g, " ").trim();
}

export function sanitizeSukyoPremiumText(value) {
  const out = text(value)
    .replace(INTERNAL_TOKEN_RE, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return applySukyoPremiumTextFilters(out);
}

function sanitizeSukyoPremiumBody(value) {
  const raw = text(value)
    .replace(INTERNAL_TOKEN_RE, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  return raw
    .split(/\n{2,}/)
    .map((block) => applySukyoPremiumTextFilters(block.replace(/[ \t]*\n[ \t]*/g, " ").replace(/[ \t]{2,}/g, " ")))
    .filter(Boolean)
    .join("\n\n");
}

function hasSukyoBrokenText(value) {
  const body = text(value);
  return /[\uFFFD\uF900-\uFAFF]/.test(body)
    || /\?{2,}/.test(body)
    || /\?[가-힣]/.test(body)
    || /(?:Ã.|Â.|â[€€™€œ]|[ìíîïðñòóôõöøùúûüýþÿ][\u0080-\uFFFF]){2,}/.test(body)
    || /[ÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ][\u0080-\uFFFF]{1,2}/.test(body)
    || /[ㄱ-ㅎㅏ-ㅣ]{2,}/.test(body);
}

function safeSukyoDisplayText(value, fallback = "") {
  const out = sanitizeSukyoPremiumText(value);
  if (!out || /^\?+$/.test(out) || hasSukyoBrokenText(out)) return fallback;
  INTERNAL_TOKEN_RE.lastIndex = 0;
  return INTERNAL_TOKEN_RE.test(out) ? fallback : out;
}

function splitMeaningfulSentences(value) {
  return text(value)
    .split(/[.!?。？！\n]+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 24);
}

function countForbiddenTerms(value) {
  const body = text(value);
  let hit = 0;
  for (const phrase of FORBIDDEN_BODY_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (re.test(body)) hit += 1;
  }
  return hit;
}

function countLiteralPhraseHits(value, phrases = []) {
  const body = text(value);
  return safeArray(phrases).reduce((sum, phrase) => {
    const token = text(phrase);
    if (!token) return sum;
    return sum + body.split(token).length - 1;
  }, 0);
}

function computeRepetitionScore(value) {
  const lines = splitMeaningfulSentences(value);
  if (!lines.length) return 1;
  const seen = new Map();
  for (const line of lines) {
    seen.set(line, (seen.get(line) || 0) + 1);
  }
  let repeatedCount = 0;
  for (const count of seen.values()) {
    if (count >= 2) repeatedCount += count;
  }
  return repeatedCount / Math.max(1, lines.length);
}

function hasChapterToneStructure(value, chapter = {}, section = {}, seedTokens = {}) {
  const body = text(value);
  const heading = text(section?.heading || section?.title);
  const chapterTitle = text(chapter?.title);
  const relationToken = text(seedTokens.relationToken);
  const selfStarToken = text(seedTokens.selfStarToken);
  const partnerStarToken = text(seedTokens.partnerStarToken);
  const chapterNo = resolveSukyoChapterNo(chapter);
  const sectionIndex = resolveSukyoSectionIndex(chapterNo, section);
  const sectionTheme = resolveSukyoSectionTheme(chapterNo, sectionIndex, heading);
  const requiredTerms = safeArray(sectionTheme.requiredTerms).filter(Boolean);
  const matchedTerms = requiredTerms.filter((term) => body.includes(term)).length;
  const hasChapterContext = Boolean(
    (heading && body.includes(heading))
    || (chapterTitle && body.includes(chapterTitle.replace(/^제\s*\d+장\.\s*/, ""))),
  );
  const hasSukuyoSignal = Boolean(
    (relationToken && body.includes(relationToken))
    || (selfStarToken && body.includes(selfStarToken))
    || (partnerStarToken && body.includes(partnerStarToken)),
  );
  const hasActionTone = /하세요|정하세요|확인하세요|기록하세요|합의|대화|문장|선택|조율|회복|거리|감정/.test(body);
  const hasSectionSignal = !requiredTerms.length || matchedTerms >= Math.min(2, requiredTerms.length);
  return hasChapterContext && hasSukuyoSignal && hasActionTone && hasSectionSignal;
}

function normalizeKoreanText(value) {
  return text(value)
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function hasRepeatedParagraphs(chapters) {
  const paragraphs = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => (Array.isArray(chapter.sections) ? chapter.sections : []))
    .flatMap((section) => text(section.body).split(/\n{2,}/))
    .map((p) => p.trim())
    .filter((p) => p.length >= 100);

  const counts = new Map();
  for (const p of paragraphs) {
    const key = normalizeKoreanText(p);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const maxCount = Math.max(0, ...Array.from(counts.values()));
  return {
    hasRepeated: maxCount >= 3,
    maxCount,
  };
}

function hasRepeatedSentences(chapters) {
  const sentences = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => (Array.isArray(chapter.sections) ? chapter.sections : []))
    .flatMap((section) => splitMeaningfulSentences(section.body))
    .map((line) => normalizeKoreanText(line))
    .filter((line) => line.length >= 30);

  const counts = new Map();
  for (const sentence of sentences) {
    counts.set(sentence, (counts.get(sentence) || 0) + 1);
  }
  const maxCount = Math.max(0, ...Array.from(counts.values()));
  return {
    hasRepeated: maxCount >= 12,
    maxCount,
  };
}

function hasRepeatedNgrams(chapters) {
  const source = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => (Array.isArray(chapter.sections) ? chapter.sections : []))
    .map((section) => text(section.body))
    .join("\n")
    .toLowerCase();
  if (!source) return { hasRepeated: false, maxCount: 0 };

  const fragments = source
    .split(/[.!?。？！\n]+/)
    .map((line) => normalizeKoreanText(line))
    .filter((line) => line.length >= 30);
  const counts = new Map();

  for (const fragment of fragments) {
    if (ALLOWED_DOMAIN_REPEAT_TERMS.some((token) => fragment.includes(token))) continue;
    counts.set(fragment, (counts.get(fragment) || 0) + 1);
  }

  const maxCount = Math.max(0, ...Array.from(counts.values()));
  return {
    hasRepeated: maxCount >= 12,
    maxCount,
  };
}

function countSevenDayRoutinePatterns(chapters) {
  const source = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => (Array.isArray(chapter.sections) ? chapter.sections : []))
    .map((section) => text(section.body))
    .join("\n");
  return (source.match(/1일차에는[\s\S]{0,260}3일차에는[\s\S]{0,260}5일차에는[\s\S]{0,260}7일차에는/g) || []).length;
}

function hasForbiddenFallbackText(chapters) {
  const merged = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => (Array.isArray(chapter.sections) ? chapter.sections : []))
    .map((section) => text(section.body))
    .join("\n")
    .toLowerCase();

  const forbidden = [
    "자동 복구 생성",
    "fallback",
    "payload",
    "json",
    "debug",
    "localdraft",
    "internal server error",
    "about:blank",
    "계산 시그니처",
    "내부 데이터",
    "품질 검증",
    "재생성",
    "undefined",
    "null",
    "nan",
  ];
  return forbidden.some((token) => merged.includes(token.toLowerCase()));
}

function chapterIncludesKeywords(chapter, keywords) {
  const body = (Array.isArray(chapter?.sections) ? chapter.sections : [])
    .map((section) => text(section.body))
    .join("\n")
    .toLowerCase();

  return (Array.isArray(keywords) ? keywords : []).every((keyword) => body.includes(String(keyword).toLowerCase()));
}

export function isLowQualityShukuyoSection(value) {
  const body = text(value).toLowerCase();
  if (!body) return true;
  if (FORBIDDEN_BODY_PHRASES.some((phrase) => body.includes(String(phrase).toLowerCase()))) return true;
  if (/\b(payload|debug|json|fallback|localdraft|자동\s*복구\s*생성|about:blank)\b/i.test(body)) return true;
  const chunks = body.split(/[.!?。？！\n]+/).map((s) => s.trim()).filter((s) => s.length > 20);
  if (chunks.length < 3) return true;
  const unique = new Set(chunks);
  if (unique.size <= Math.max(1, Math.floor(chunks.length * 0.45))) return true;
  return computeRepetitionScore(body) >= 0.42;
}

export function getSukyoPdfChapters() {
  return SUKYO_PDF_CHAPTERS.map((chapter) => ({
    key: chapter.key,
    order: chapter.order,
    title: chapter.title,
    sections: chapter.sections.slice(),
  }));
}

export function validateSukyoPdfInput(raw = {}) {
  const normalized = normalizeShukuyoPdfPayload(raw);
  const hardMissingFields = [];
  const softMissingFields = [];

  if (normalized.mode !== "compatibility") hardMissingFields.push("mode.compatibility");

  const selfDate = parseDateParts(normalized.self.birthDate);
  const partnerDate = parseDateParts(normalized.partner.birthDate);

  if (!selfDate) hardMissingFields.push("self.birthDate");
  if (!partnerDate) hardMissingFields.push("partner.birthDate");
  if (!text(normalized.sukuyoResult.relationshipType)) hardMissingFields.push("compatibility.relationType");

  if (normalized.self.isTimeUnknown) softMissingFields.push("self.birthTime");
  if (normalized.partner.isTimeUnknown) softMissingFields.push("partner.birthTime");

  return {
    canGenerate: hardMissingFields.length === 0,
    reportMode: "compatibility",
    hardMissingFields,
    softMissingFields,
    payloadValidation: { missingFields: hardMissingFields.slice() },
    normalized,
  };
}

// Backward-compat alias used by legacy tests/callers.
export function validateSukyoPdfSeed(raw = {}) {
  if (text(raw?.mode) === "compatibility") {
    return {
      ok: true,
      issues: [],
      hardMissingFields: [],
      canGenerate: true,
      payloadValidation: { missingFields: [] },
    };
  }

  const fallback = raw || {};
  const hasCanonicalStars = Boolean(text(fallback?.userSukyo?.nameKo)) && Boolean(text(fallback?.partnerSukyo?.nameKo));
  const hasCanonicalRelation = Boolean(text(fallback?.compatibility?.relationType || fallback?.compatibility?.relationTypeHan));
  if (hasCanonicalStars && hasCanonicalRelation) {
    return {
      ok: true,
      issues: [],
      hardMissingFields: [],
      canGenerate: true,
      payloadValidation: { missingFields: [] },
    };
  }

  const result = validateSukyoPdfInput(raw);
  const relaxedHardMissing = safeArray(result?.hardMissingFields).filter((field) => {
    if (field !== "self.birthDate" && field !== "partner.birthDate") return true;
    return !(hasCanonicalStars && hasCanonicalRelation);
  });

  const issues = [];
  issues.push(...relaxedHardMissing);
  issues.push(...safeArray(result?.softMissingFields));
  return {
    ...result,
    ok: relaxedHardMissing.length === 0 || (hasCanonicalStars && hasCanonicalRelation),
    issues,
    canGenerate: relaxedHardMissing.length === 0 || (hasCanonicalStars && hasCanonicalRelation),
    hardMissingFields: relaxedHardMissing,
    payloadValidation: { missingFields: relaxedHardMissing.slice() },
  };
}

function pickKeywordList(star = {}) {
  const k = [
    ...safeArray(star.keywords),
    ...safeArray(star.traits),
    ...safeArray(star.strengths),
  ];
  return Array.from(new Set(k)).slice(0, 8);
}

function toDistanceTier(distanceLabel) {
  const token = text(distanceLabel).toLowerCase();
  if (token.includes("동숙") || token === "same") return "same";
  if (token.includes("특수") || token === "special") return "special";
  if (token.includes("근") || token === "near") return "near";
  if (token.includes("원") || token === "far") return "far";
  if (token.includes("중") || token === "middle") return "middle";
  return "unknown";
}

function displayDistanceLabel(distanceLabel) {
  const tier = toDistanceTier(distanceLabel);
  if (tier === "same") return "동숙";
  if (tier === "special") return "특수관계";
  if (tier === "near") return "근거리";
  if (tier === "middle") return "중거리";
  if (tier === "far") return "원거리";
  const label = text(distanceLabel);
  if (!label || label.toLowerCase() === "unknown") return "중거리";
  return label;
}

function resolveSukuyoRelationInterpretation(relationType) {
  const token = text(relationType);
  if (SUKYO_COMPAT_RELATION_INTERPRETATION[token]) return SUKYO_COMPAT_RELATION_INTERPRETATION[token];
  const matched = Object.values(SUKYO_COMPAT_RELATION_INTERPRETATION)
    .find((item) => token && text(item?.userLabel) === token);
  if (matched) return matched;
  if (token.includes("안괴")) return SUKYO_COMPAT_RELATION_INTERPRETATION["安壞"];
  if (token.includes("영친")) return SUKYO_COMPAT_RELATION_INTERPRETATION["榮親"];
  if (token.includes("업태")) return SUKYO_COMPAT_RELATION_INTERPRETATION["業胎"];
  if (token.includes("우쇠")) return SUKYO_COMPAT_RELATION_INTERPRETATION["友衰"];
  if (token.includes("위성")) return SUKYO_COMPAT_RELATION_INTERPRETATION["危成"];
  if (token.includes("명")) return SUKYO_COMPAT_RELATION_INTERPRETATION["命"];
  return SUKYO_COMPAT_RELATION_INTERPRETATION["命"];
}

function createInterpretationSeeds(seed = {}) {
  const relation = seed.compatibility || {};
  const userHost = text(seed.userSukyo?.nameKo, "A");
  const partnerHost = text(seed.partnerSukyo?.nameKo, "B");
  const relationType = text(relation.relationType, "관계");

  return {
    firstImpression: [
      `${userHost}宿과 ${partnerHost}宿 조합은 첫 만남에서 감정의 방향을 빠르게 정하는 경향이 있습니다.`,
      `${relationType} 구조에서는 첫 반응이 강할수록 경계와 속도 조절이 중요합니다.`,
    ],
    emotionalPattern: [
      `감정 리듬은 반응 속도의 차이에서 흔들리며, 확인 질문이 안정감을 만듭니다.`,
      `불안 신호를 늦게 말할수록 해석 오차가 커지므로 짧은 체크인이 필요합니다.`,
    ],
    communicationPattern: [
      `대화는 사실-감정-요청 순서가 맞을 때 마찰이 줄어듭니다.`,
      `침묵이 길어지면 의미를 추측하기 쉬워 합의된 연락 규칙이 필요합니다.`,
    ],
    lovePattern: [
      `사랑의 밀도는 애정 표현 빈도보다 회복 속도에 크게 좌우됩니다.`,
      `두 사람의 애착 차이를 인정하면 설렘과 안정감을 동시에 만들 수 있습니다.`,
    ],
    conflictPattern: [
      `갈등은 대체로 같은 주제가 반복되며, 촉발 문장을 바꾸면 소모가 줄어듭니다.`,
      `지적보다 요청 중심의 문장이 충돌 강도를 낮춥니다.`,
    ],
    reconciliationPattern: [
      `화해는 원인 분석보다 재접속 타이밍 합의가 먼저입니다.`,
      `사과는 의도보다 영향 확인이 포함될 때 신뢰 회복이 빨라집니다.`,
    ],
    marriagePattern: [
      `장기 관계는 감정 궁합보다 생활 운영 합의에서 안정성이 결정됩니다.`,
      `역할 책임을 선명하게 나누면 갈등 빈도가 줄어듭니다.`,
    ],
    moneyPattern: [
      `돈 문제는 가치관 차이의 요약판이며 사용 원칙 문서화가 유효합니다.`,
      `예산·비상금·책임 구간을 사전에 나누면 감정 소모를 예방합니다.`,
    ],
    intimacyPattern: [
      `친밀감은 속도 차이를 인정할 때 더 오래 유지됩니다.`,
      `안전감의 언어와 설렘의 언어를 구분해 사용하는 것이 좋습니다.`,
    ],
    longTermStrategy: [
      `장기 전략은 거리 조절 규칙과 재합의 주기를 정하는 것에서 시작합니다.`,
      `관계 점검일을 월 1회 고정하면 작은 균열을 빠르게 복구할 수 있습니다.`,
    ],
  };
}

function buildLocalCompatibilityJson(seed = {}) {
  const relation = seed.compatibility || {};
  const selfKeywords = pickKeywordList(seed.userSukyo || {});
  const partnerKeywords = pickKeywordList(seed.partnerSukyo || {});
  const selfProfile = resolveMansionProfile(seed.userSukyo || {}, seed.userSukyo?.index);
  const partnerProfile = resolveMansionProfile(seed.partnerSukyo || {}, seed.partnerSukyo?.index);

  const relationTypeHan = text(relation.relationTypeHan || relation.relationType);
  const relationInterp = resolveSukuyoRelationInterpretation(relationTypeHan);
  const distanceTier = toDistanceTier(relation.distanceLabel || relation.distance);
  const distanceInterp = SUKYO_DISTANCE_INTERPRETATION[distanceTier] || SUKYO_DISTANCE_INTERPRETATION.unknown;

  const chemistryRaw = relation?.enhanced?.chemistry || relation?.chemistry || {};
  const chemistry = {
    emotional: safeNumber(chemistryRaw.emotional, safeNumber(relation.chemistryScore, 58)),
    communication: safeNumber(chemistryRaw.communication, safeNumber(relation.communicationScore, 55)),
    dailyLife: safeNumber(chemistryRaw.dailyLife, safeNumber(relation.stabilityScore, 53)),
    physical: safeNumber(chemistryRaw.physical, 56),
    conflictRisk: safeNumber(chemistryRaw.conflictRisk, safeNumber(relation.conflictScore, 52)),
    recoveryPotential: safeNumber(chemistryRaw.recoveryPotential, safeNumber(relation.growthScore, 51)),
    longTermPotential: safeNumber(chemistryRaw.longTermPotential, safeNumber(relation.compatibilityIndex, 50)),
  };

  const roleActionGuide = {
    meAction: text(relation?.roleActionGuide?.meAction, "핵심 감정을 먼저 문장으로 공유합니다."),
    otherAction: text(relation?.roleActionGuide?.otherAction, "상대 반응을 요약 확인한 뒤 결론을 정합니다."),
    resetLine: text(relation?.roleActionGuide?.resetLine, "갈등 직후 24시간 내 감정-사실-합의 순서로 재접속합니다."),
  };

  const elementHarmony = {
    meElement: text(relation?.elementHarmony?.aElement || relation?.elementHarmony?.meElement || seed?.userSukyo?.element, "토"),
    otherElement: text(relation?.elementHarmony?.bElement || relation?.elementHarmony?.otherElement || seed?.partnerSukyo?.element, "토"),
    relation: text(relation?.elementHarmony?.relation, "보완"),
    harmonyScore: safeNumber(relation?.elementHarmony?.harmonyScore, 64),
    summary: text(relation?.elementHarmony?.summary, "두 사람의 기질은 다르지만 조율 규칙을 세울수록 상호 보완성이 커집니다."),
  };

  const strengthShadowMap = {
    me: {
      strength: text(relation?.strengthShadowMap?.me?.strength || relation?.strengthShadowMap?.a?.strength, safeArray(seed?.userSukyo?.strengths)[0] || "보호력"),
      shadow: text(relation?.strengthShadowMap?.me?.shadow || relation?.strengthShadowMap?.a?.shadow, safeArray(seed?.userSukyo?.shadows)[0] || "과보호"),
    },
    other: {
      strength: text(relation?.strengthShadowMap?.other?.strength || relation?.strengthShadowMap?.b?.strength, safeArray(seed?.partnerSukyo?.strengths)[0] || "혁신력"),
      shadow: text(relation?.strengthShadowMap?.other?.shadow || relation?.strengthShadowMap?.b?.shadow, safeArray(seed?.partnerSukyo?.shadows)[0] || "소진"),
    },
    complementSummary: text(
      relation?.strengthShadowMap?.complementSummary,
      "서로의 강점이 상대의 그림자를 완충할 수 있어 대화 순서를 정하면 관계 회복력이 높아집니다.",
    ),
  };

  const pastLife = {
    type: text(relation?.enhanced?.pastLife?.type, relationTypeHan === "安壞" ? "monk_and_princess" : "soul_companions"),
    title: text(relation?.enhanced?.pastLife?.title, relationTypeHan === "安壞" ? "승려와 공주의 약속" : "달빛 아래의 동행"),
    subtitle: text(relation?.enhanced?.pastLife?.subtitle, "강한 끌림과 조율 과제"),
    presentLifePattern: text(
      relation?.enhanced?.pastLife?.presentLifePattern,
      `${text(relation.relationType)} 관계는 감정 온도가 빠르게 올라가지만 합의 규칙이 없으면 오해가 반복되기 쉽습니다.`,
    ),
    currentTask: text(
      relation?.enhanced?.pastLife?.currentTask,
      "연락 빈도, 갈등 직후 쿨다운 시간, 화해 시작 문장을 미리 합의합니다.",
    ),
    healingKey: text(
      relation?.enhanced?.pastLife?.healingKey,
      "파괴 대신 창조를 선택하는 작은 합의를 반복해 신뢰를 복원합니다.",
    ),
  };

  const score = safeNumber(relation.score, safeNumber(relation.compatibilityIndex, 52));
  const temperature = safeNumber(relation.temperature, safeNumber(relation.chemistryScore, 68));
  const magnetism = safeNumber(relation.magnetism, safeNumber(relation.growthScore, 49));
  const shortestDistance = safeNumber(relation?.distanceMetrics?.shortestDistance, null);
  const requiredAgreements = [
    "연락 빈도 합의",
    "갈등 직후 쿨다운 시간",
    "화해 시작 문장",
  ];
  const recoveryRoutine = [
    "감정 확인",
    "사실 정리",
    "합의 문장 확정",
  ];

  return {
    fortuneType: "sukyo",
    mode: "compatibility",
    input: {
      mode: "compatibility",
      self: normalizePersonInput(seed.userProfile || {}, "사용자"),
      partner: normalizePersonInput(seed.partnerProfile || {}, "상대방"),
    },
    self: {
      sukuyoStar: text(seed.userSukyo?.nameKo),
      starIndex: safeNumber(seed.userSukyo?.index),
      group: text(seed.userSukyo?.category),
      element: text(seed.userSukyo?.element),
      keywords: selfKeywords,
      profile: selfProfile,
    },
    partner: {
      sukuyoStar: text(seed.partnerSukyo?.nameKo),
      starIndex: safeNumber(seed.partnerSukyo?.index),
      group: text(seed.partnerSukyo?.category),
      element: text(seed.partnerSukyo?.element),
      keywords: partnerKeywords,
      profile: partnerProfile,
      gender: text(seed.partnerProfile?.gender, "unknown"),
    },
    relation: {
      type: text(relation.relationType),
      typeHan: relationTypeHan,
      typeKo: text(relationInterp.userLabel || relation.relationType),
      relationTheme: relationInterp.theme,
      directionFromAToB: text(relation.directionFromAToB),
      directionFromBToA: text(relation.directionFromBToA),
      distance: distanceTier,
      distanceLabel: text(relation.distanceLabel || relation.distance),
      score,
      compatibilityScore: safeNumber(relation.compatibilityIndex, score),
      temperature,
      magnetism,
      stamp: text(relation.stamp || relation.relationVariant || ""),
      shortestDistance,
      chemistry,
      chemistryKeywords: safeArray([relation.elementHarmony?.relation, relation.relationType, distanceInterp.theme]),
      conflictKeywords: safeArray([strengthShadowMap.me.shadow, strengthShadowMap.other.shadow, relationInterp.risk]),
      karmicKeywords: safeArray([pastLife.title, pastLife.subtitle, relationInterp.theme]),
      dailyLifeKeywords: safeArray([roleActionGuide.meAction, roleActionGuide.otherAction]),
      loveKeywords: safeArray([selfProfile.love, partnerProfile.love]),
      marriageKeywords: safeArray([elementHarmony.summary, relationInterp.advice]),
      roleActionGuide,
      elementHarmony,
      strengthShadowMap,
      pastLife,
      distanceInterpretation: distanceInterp,
      relationInterpretation: relationInterp,
    },
    derived: {
      isCompatibility: true,
      relationFamily: text(relationInterp.userLabel || relation.relationType),
      distanceTier,
      emotionalBand: temperature >= 85 ? "veryHigh" : (temperature >= 70 ? "high" : (temperature >= 45 ? "middle" : "low")),
      conflictBand: levelByScore(chemistry.conflictRisk, "risk"),
      longTermBand: levelByScore(chemistry.longTermPotential),
      recoveryBand: levelByScore(chemistry.recoveryPotential),
      mainStrengths: [strengthShadowMap.me.strength, strengthShadowMap.other.strength].filter(Boolean),
      mainRisks: [strengthShadowMap.me.shadow, strengthShadowMap.other.shadow].filter(Boolean),
      requiredAgreements,
      recoveryRoutine,
    },
    interpretationSeeds: createInterpretationSeeds(seed),
  };
}

function repeatToLength(base, minLength) {
  const segments = safeArray(base);
  if (!segments.length) return "";
  let i = 0;
  let out = "";
  while (out.length < minLength) {
    const line = segments[i % segments.length];
    out = `${out}${out ? "\n\n" : ""}${line}`;
    i += 1;
    if (i > 64) break;
  }
  return sanitizeSukyoPremiumBody(out);
}

const CHAPTER_TOPIC_GUIDE = Object.freeze({
  1: ["본명숙의 기질", "상대 숙의 반응", "두 사람의 기본 리듬", "관계 운영 출발점"],
  2: ["관계 유형의 본질", "끌림의 작동 방식", "심리적 안전장치", "지속 가능한 규칙"],
  3: ["거리감 체감", "가까울 때의 강점", "멀어질 때의 위험", "거리 조절 합의"],
  4: ["첫인상 코드", "초기 끌림의 이유", "기대와 현실의 간극", "호감 유지 전략"],
  5: ["감정 상승 구간", "불안 촉발 지점", "정서 회복 조건", "사랑의 안정화"],
  6: ["대화 템포", "침묵의 해석", "연락 기대치", "오해 복구 대화"],
  7: ["애착과 설렘", "질투와 경계", "안정감 형성", "연애 지속 장치"],
  8: ["충돌 반복 구조", "감정 폭발 전조", "소모 차단 방법", "갈등 후 회복 순서"],
  9: ["화해의 조건", "사과의 구조", "신뢰 재건 루틴", "재접속 습관"],
  10: ["생활 운영", "역할 분담", "현실 갈등 예방", "동거/결혼 설계"],
  11: ["소비 성향", "책임감 분배", "생활 리듬 충돌", "돈 대화 합의"],
  12: ["외부 관계 개입", "경계선 유지", "주변 변수 관리", "두 사람 우선순위"],
  13: ["강한 인연의 감각", "반복 숙제", "성장 전환 포인트", "성숙의 방향"],
  14: ["장기 운영 축", "피로 관리", "거리 조절 원칙", "장기 동행 설계"],
  15: ["최종 진단", "핵심 강점", "즉시 실행 전략", "관계 유지 결론"],
});

const CHAPTER_COUNSELING_FRAME = Object.freeze({
  1: {
    entry: "숙명적 궁합의 첫 장은 결론을 서두르기보다 두 사람이 어떤 이름의 인연으로 만났는지 짚는 자리입니다.",
    evidence: "판단 근거는 첫 끌림, 안정감, 약점이 동시에 켜지는 장면에서 가장 선명하게 드러납니다.",
    reality: "현실에서는 호감의 크기보다 서로가 불안을 다루는 순서가 관계의 첫 인상을 오래 좌우합니다.",
    caution: "운명감이 강하다고 세부 신호를 건너뛰면 좋은 흐름도 쉽게 기대와 실망의 반복으로 바뀝니다.",
    prescription: "상담 처방은 호감, 불안, 현실 가능성을 분리해 적고 두 사람이 같은 언어로 확인하는 것입니다.",
    moon: "이 장의 달빛은 큰 인연을 크게 말하기보다, 두 사람이 실제로 지킬 첫 기준을 조용히 비춥니다.",
  },
  2: {
    entry: "나의 본명숙을 보는 장에서는 내가 사랑할 때 먼저 켜는 신호와 방어선을 정직하게 읽어야 합니다.",
    evidence: "판단 근거는 내가 기대하는 안정감, 불안할 때의 반응, 오래 사랑하기 위해 필요한 규칙입니다.",
    reality: "현실에서는 상대의 태도보다 내가 어떤 방식으로 확인을 요구하는지가 관계 온도를 크게 흔듭니다.",
    caution: "내 감정을 상대가 알아서 맞히길 기다리면 사랑은 확인이 아니라 시험처럼 느껴질 수 있습니다.",
    prescription: "상담 처방은 내가 원하는 신호를 작은 행동 단위로 말하고, 기다릴 수 있는 시간을 함께 정하는 것입니다.",
    moon: "이 장의 달빛은 사랑받고 싶은 마음을 부끄러워하지 말고, 다만 알아들을 수 있는 말로 바꾸라고 합니다.",
  },
  3: {
    entry: "상대의 본명숙을 읽는 장에서는 상대가 마음을 여는 순서와 닫히는 신호를 함께 보아야 합니다.",
    evidence: "판단 근거는 상대의 반복 행동, 느려지는 순간, 중요하게 여기는 가치가 어디에서 나타나는지입니다.",
    reality: "현실에서는 내가 듣고 싶은 표현보다 상대가 실제로 보여주는 애정 언어를 알아차리는 힘이 중요합니다.",
    caution: "상대의 속도를 애정 부족으로 단정하면 아직 열릴 수 있는 문까지 스스로 닫게 됩니다.",
    prescription: "상담 처방은 상대의 표현 방식, 부담 신호, 회복 신호를 구분해 확인하는 것입니다.",
    moon: "이 장의 달빛은 상대를 바꾸라는 뜻이 아니라, 상대의 별빛이 어떤 모양으로 도착하는지 보라는 뜻입니다.",
  },
  4: {
    entry: "관계 유형을 해석하는 장에서는 두 사람의 끌림이 어떤 배움과 긴장을 만들고 있는지 정밀하게 봅니다.",
    evidence: "판단 근거는 감정 강도, 반복 패턴, 서로에게 배우는 과제가 같은 방향을 가리키는지입니다.",
    reality: "현실에서는 관계 유형의 이름보다 그 이름이 실제 대화와 화해 방식에 어떤 압력을 주는지가 중요합니다.",
    caution: "좋은 관계와 나쁜 관계로만 나누면 숙요가 알려주는 조율의 핵심을 놓치게 됩니다.",
    prescription: "상담 처방은 관계 유형의 장점과 그림자를 같은 무게로 적고, 강한 장면에 적용할 안전 규칙을 만드는 것입니다.",
    moon: "이 장의 달빛은 관계 유형을 판결문이 아니라 두 사람이 함께 읽어야 할 별의 지도처럼 보여줍니다.",
  },
  5: {
    entry: "거리와 인연 강도를 보는 장에서는 가까움의 양이 아니라 감정이 닿는 속도를 읽어야 합니다.",
    evidence: "판단 근거는 연락 간격, 만남 뒤 회복 시간, 가까워질수록 강해지는 기대의 방향입니다.",
    reality: "현실에서는 사랑의 크기보다 각자 편안하게 숨 쉬는 거리 기준이 관계를 오래 지켜줍니다.",
    caution: "거리의 뜻을 모르면 상대의 느림을 차가움으로, 빠른 반응을 집착으로 오해하기 쉽습니다.",
    prescription: "상담 처방은 연락, 만남, 혼자 있는 시간을 나누어 두 사람만의 적정 간격을 정하는 것입니다.",
    moon: "이 장의 달빛은 가까이 있어도 멀리 있어도 같은 하늘 아래 이어지는 인연의 리듬을 비춥니다.",
  },
  6: {
    entry: "첫 만남과 끌림의 장에서는 왜 이 사람이 신비롭게 느껴졌는지, 그 감각의 뿌리를 살핍니다.",
    evidence: "판단 근거는 첫인상, 분위기, 감정이 빨리 깊어진 이유가 현실 기대와 어떻게 맞물리는지입니다.",
    reality: "현실에서는 처음의 설렘을 오래 보존하려면 속도보다 확인 질문의 타이밍이 더 중요합니다.",
    caution: "첫 끌림을 전부 운명으로만 해석하면 아직 확인해야 할 생활 리듬과 경계가 흐려집니다.",
    prescription: "상담 처방은 끌렸던 이유와 지금 확인해야 할 조건을 따로 말해 기대가 앞서가지 않게 하는 것입니다.",
    moon: "이 장의 달빛은 처음 열린 문을 아름답게 비추되, 그 문을 지나는 속도는 둘이 함께 정하라고 말합니다.",
  },
  7: {
    entry: "감정 교류의 장에서는 두 사람이 사랑을 느끼고 표현하는 속도의 차이를 섬세하게 읽습니다.",
    evidence: "판단 근거는 애정 표현, 서운함의 누적 방식, 마음이 통한다고 느끼는 순간의 반복성입니다.",
    reality: "현실에서는 감정의 크기보다 상대가 받아들일 수 있는 온도로 표현하는 능력이 친밀감을 지킵니다.",
    caution: "서운함을 쌓아두다 한 번에 꺼내면 상대는 내용보다 압력에 먼저 반응합니다.",
    prescription: "상담 처방은 감정 이름, 원하는 행동, 기다릴 시간을 나누어 말하는 것입니다.",
    moon: "이 장의 달빛은 마음을 크게 흔들기보다, 서로의 온도가 맞는 지점을 찾아 천천히 내려앉습니다.",
  },
  8: {
    entry: "대화와 소통의 장에서는 말이 통하는 부분보다 말이 엇갈리는 순간의 구조를 먼저 읽어야 합니다.",
    evidence: "판단 근거는 침묵의 이유, 싸울 때의 말투, 대화 끝에 남는 행동 합의의 유무입니다.",
    reality: "현실에서는 말의 양보다 감정 확인, 사실 정리, 다음 행동 합의의 순서가 소통 품질을 결정합니다.",
    caution: "사과만 하고 행동 합의가 없으면 같은 상처가 이름만 바뀌어 돌아옵니다.",
    prescription: "상담 처방은 대화 끝마다 다음 행동 하나와 확인 시점을 반드시 남기는 것입니다.",
    moon: "이 장의 달빛은 어두운 감정을 없애지 않고, 그 감정이 지나갈 수 있는 말을 찾아줍니다.",
  },
  9: {
    entry: "갈등과 충돌의 장에서는 누가 옳은가보다 어떤 장면에서 같은 상처가 반복되는지 보는 것이 먼저입니다.",
    evidence: "판단 근거는 오해 지점, 지치는 이유, 감정 폭발 직전의 전조가 일정하게 반복되는지입니다.",
    reality: "현실에서는 갈등을 줄이는 힘이 성격을 고치는 데서가 아니라 멈춤 신호를 합의하는 데서 나옵니다.",
    caution: "상대의 말을 공격으로 단정하면 해명할 수 있는 틈이 사라지고 방어만 남습니다.",
    prescription: "상담 처방은 반복 장면, 촉발 문장, 멈춤 신호, 재대화 시간을 한 세트로 정하는 것입니다.",
    moon: "이 장의 달빛은 싸움을 피하라는 뜻보다, 같은 어둠에 다른 발걸음을 놓으라는 뜻에 가깝습니다.",
  },
  10: {
    entry: "이별과 재회의 장에서는 마음이 남는 이유와 다시 만나도 반복될 문제를 함께 놓고 봅니다.",
    evidence: "판단 근거는 멀어지는 원인, 이별 뒤 남은 감정, 재회를 가능하게 하는 조건의 현실성입니다.",
    reality: "현실에서는 그리움만으로 재회가 유지되지 않으며, 과거의 충돌 문장을 새 규칙으로 바꾸어야 합니다.",
    caution: "재회를 서두르면 다시 만난 기쁨이 지나간 뒤 같은 침묵과 같은 상처가 돌아올 수 있습니다.",
    prescription: "상담 처방은 다시 만나기 전 사과, 재발 방지, 연락 기준을 각각 한 문장으로 합의하는 것입니다.",
    moon: "이 장의 달빛은 돌아갈 길을 비추지만, 같은 자리로 돌아가라는 뜻은 아닙니다.",
  },
  11: {
    entry: "장기 연애와 결혼의 장에서는 설렘보다 생활 리듬, 책임, 역할 분담의 현실성을 깊게 봅니다.",
    evidence: "판단 근거는 오래 만날수록 강해지는 점과 결혼 뒤 드러날 차이가 같은 방향인지입니다.",
    reality: "현실에서는 사랑의 확신보다 돈, 시간, 가족 경계, 집안일을 말할 수 있는 능력이 오래 갑니다.",
    caution: "미래 약속만 크게 말하고 현재 생활 규칙을 정하지 않으면 신뢰가 얇아집니다.",
    prescription: "상담 처방은 생활 리듬, 돈, 책임, 가족 경계를 월 1회 점검하는 구조를 만드는 것입니다.",
    moon: "이 장의 달빛은 먼 미래의 장면보다 오늘 지킨 작은 약속 위에 더 오래 머뭅니다.",
  },
  12: {
    entry: "현실 생활과 가치관의 장에서는 돈, 일, 가족, 습관이 사랑의 언어와 어떻게 부딪히는지 봅니다.",
    evidence: "판단 근거는 소비 태도, 우선순위, 주변 사람을 대하는 방식, 생활 습관의 차이입니다.",
    reality: "현실에서는 감정이 좋아도 가치관을 말하지 않으면 작은 생활 문제가 관계 전체의 피로로 번집니다.",
    caution: "현실 문제를 사랑으로만 덮으면 나중에는 사랑을 증명하라는 부담으로 되돌아옵니다.",
    prescription: "상담 처방은 돈, 시간, 주변 경계, 생활 습관을 구체적인 기준으로 나누어 합의하는 것입니다.",
    moon: "이 장의 달빛은 낭만을 지우지 않고, 낭만이 현실에서 무너지지 않을 자리를 마련합니다.",
  },
  13: {
    entry: "친밀감과 애정 표현의 장에서는 편안함, 스킨십, 사랑받는 느낌이 어디에서 살아나는지 읽습니다.",
    evidence: "판단 근거는 서로가 편안해지는 방식, 거절감을 느끼는 순간, 친밀감을 회복하는 행동입니다.",
    reality: "현실에서는 애정의 양보다 상대가 부담 없이 받을 수 있는 표현 방식이 더 오래 남습니다.",
    caution: "친밀감을 요구로만 꺼내면 상대는 사랑보다 압박을 먼저 느낄 수 있습니다.",
    prescription: "상담 처방은 편한 표현과 부담스러운 표현을 나누고, 회복 신호를 작게 반복하는 것입니다.",
    moon: "이 장의 달빛은 닿고 싶은 마음을 부드럽게 낮추어, 상대가 받아들일 수 있는 온도로 만들어줍니다.",
  },
  14: {
    entry: "전생 인연과 카르마의 장에서는 익숙한 끌림과 반복되는 숙제가 왜 함께 오는지 살핍니다.",
    evidence: "판단 근거는 설명하기 어려운 친숙함, 반복해서 끌리는 감정, 서로에게 남기는 성장 과제입니다.",
    reality: "현실에서는 오래된 인연처럼 느껴지는 감각도 결국 현재의 말과 선택으로만 성숙해집니다.",
    caution: "전생적 느낌을 이유로 현재의 상처를 정당화하면 인연은 깊어지지 않고 무거워집니다.",
    prescription: "상담 처방은 미완의 감정 과제를 책임 있는 약속과 회복 행동으로 바꾸는 것입니다.",
    moon: "이 장의 달빛은 과거를 말하지만, 그 빛이 닿는 곳은 언제나 오늘의 선택입니다.",
  },
  15: {
    entry: "최종 관계 전략의 장에서는 지금까지의 신호를 하나의 실행 판단으로 묶어야 합니다.",
    evidence: "판단 근거는 관계를 살리는 행동, 망치는 행동, 가장 먼저 해야 할 일이 같은 결론으로 모이는지입니다.",
    reality: "현실에서는 좋은 말보다 오늘부터 줄일 행동과 반복할 행동이 관계의 방향을 바꿉니다.",
    caution: "최종 조언을 감정적인 결심으로만 끝내면 며칠 뒤 원래 패턴이 다시 고개를 듭니다.",
    prescription: "상담 처방은 두 사람이 지킬 문장 하나, 멈출 행동 하나, 확인 날짜 하나를 확정하는 것입니다.",
    moon: "이 장의 달빛은 예언처럼 끝나지 않고, 두 사람이 실제로 걸어갈 다음 걸음을 비춥니다.",
  },
});

const CHAPTER_CONTEXT_LENS = Object.freeze({
  1: { relation: "인연의 첫 윤곽", distance: "처음 가까워지는 속도", practice: "첫 기준을 정하는 대화", score: true },
  2: { relation: "내가 사랑에서 반응하는 방식", distance: "내 감정이 상대에게 닿는 속도", practice: "내가 원하는 신호를 설명하는 말", score: false },
  3: { relation: "상대가 마음을 여는 순서", distance: "상대의 방어선에 닿는 간격", practice: "상대의 반복 행동을 읽는 태도", score: false },
  4: { relation: "관계 유형이 만드는 배움과 긴장", distance: "관계 유형의 힘이 체감되는 속도", practice: "강한 흐름을 다루는 안전 규칙", score: true },
  5: { relation: "가까움과 멀어짐의 압력", distance: "감정이 닿고 물러나는 간격", practice: "연락, 만남, 혼자 있는 시간의 기준", score: true },
  6: { relation: "첫 끌림이 생긴 이유", distance: "설렘이 깊어지는 속도", practice: "호감과 확인 질문의 균형", score: false },
  7: { relation: "감정 온도가 오르내리는 방식", distance: "애정 표현이 체감되는 간격", practice: "감정 이름과 기다릴 시간을 나누는 말", score: false },
  8: { relation: "말이 통하거나 엇갈리는 구조", distance: "한마디가 상대에게 도착하는 속도", practice: "감정 확인, 사실 정리, 다음 행동 합의", score: true },
  9: { relation: "반복 갈등이 켜지는 장면", distance: "상처가 커지기 전 멈출 수 있는 거리", practice: "멈춤 신호와 재대화 시간", score: true },
  10: { relation: "멀어짐과 재접속의 가능성", distance: "그리움이 다시 켜지는 속도", practice: "재회 전 사과와 재발 방지 문장", score: true },
  11: { relation: "장기 관계에서 견디는 힘", distance: "생활 리듬이 부딪히는 밀도", practice: "돈, 시간, 역할 분담의 월간 점검", score: true },
  12: { relation: "현실 가치관이 사랑을 시험하는 방식", distance: "일상 기준이 서로에게 닿는 간격", practice: "돈, 시간, 주변 경계의 구체적 합의", score: false },
  13: { relation: "친밀감이 살아나는 조건", distance: "애정 표현을 받아들이는 온도", practice: "편한 표현과 부담스러운 표현의 구분", score: false },
  14: { relation: "카르마적 반복과 성장 과제", distance: "오래된 감정이 현재에 되살아나는 속도", practice: "미완의 감정을 책임 있는 약속으로 바꾸는 일", score: true },
  15: { relation: "최종 선택으로 모이는 관계 신호", distance: "오늘부터 바꿀 행동이 닿는 속도", practice: "멈출 행동, 반복할 행동, 확인 날짜", score: true },
});

const RELATION_CONTEXT_TONE = Object.freeze({
  안괴: { force: "강한 끌림과 불안", risk: "보호하려는 마음과 상처 주는 반응이 빠르게 바뀌는 점", medicine: "감정 과열 전에 멈춤 신호를 두는 것" },
  영친: { force: "따뜻한 친밀감과 지지", risk: "편안함 때문에 핵심 갈등을 미루는 점", medicine: "안정감 위에 성장 질문을 더하는 것" },
  업태: { force: "익숙한 끌림과 카르마적 숙제", risk: "같은 과제를 감정으로만 반복하는 점", medicine: "감정과 과제를 분리해 기록하는 것" },
  우쇠: { force: "섬세한 배려와 정서 교류", risk: "작은 서운함이 누적되어 거리감으로 굳는 점", medicine: "짧은 확인 대화를 자주 두는 것" },
  위성: { force: "목표와 현실을 밀어주는 추진력", risk: "관계가 성과나 역할 중심으로 기우는 점", medicine: "목표 대화 전에 감정 상태를 묻는 것" },
  명: { force: "닮은 기질과 거울 같은 공명", risk: "같은 약점이 동시에 켜져 반복 충돌이 생기는 점", medicine: "닮은 반응을 다른 역할로 나누는 것" },
  기본: { force: "끌림과 조율 과제", risk: "서로의 속도를 단정해 오해하는 점", medicine: "감정과 행동 기준을 분리하는 것" },
});

const DISTANCE_CONTEXT_TONE = Object.freeze({
  near: { force: "반응이 빠르게 전달되는 밀착감", risk: "작은 말도 크게 닿아 상처가 빨리 커지는 점", medicine: "쿨다운과 재접속 시간을 짧게 합의하는 것" },
  middle: { force: "감정과 현실을 번갈아 점검할 수 있는 완충감", risk: "확인 빈도가 낮으면 오해가 서서히 쌓이는 점", medicine: "주간 점검 리듬을 고정하는 것" },
  far: { force: "각자의 자율성을 지키며 이어지는 여백", risk: "연락 공백이 감정의 단절로 해석되는 점", medicine: "연락 기준과 핵심 확인 문장을 미리 정하는 것" },
  same: { force: "닮은 감정 패턴이 서로를 비추는 공명", risk: "같은 반응을 동시에 반복해 멈춤이 늦어지는 점", medicine: "역할과 멈춤 신호를 의식적으로 나누는 것" },
  special: { force: "설명하기 어려운 과제와 역할 전환의 압력", risk: "인연감에 기대어 현실 합의를 미루는 점", medicine: "반복 과제를 먼저 이름 붙이는 것" },
  unknown: { force: "중간 거리처럼 조율이 필요한 흐름", risk: "확인 없는 추측이 관계 피로를 키우는 점", medicine: "서로 편안한 거리 기준을 정하는 것" },
});

const SECTION_RELATION_INSIGHT_KEYS = new Set([
  "1:0", "1:1", "1:3", "1:4",
  "2:0", "2:1", "2:3",
  "3:0", "3:1", "3:4",
  "4:0", "4:1", "4:2", "4:3",
  "6:0", "6:1",
  "7:0", "7:1", "7:3",
  "8:0", "8:1", "8:3",
  "9:0", "9:1", "9:3",
  "10:0", "10:1", "10:3",
  "11:0", "11:1", "11:4",
  "12:0", "12:1", "12:2",
  "13:0", "13:1", "13:4",
  "14:0", "14:1", "14:3",
  "15:0", "15:1", "15:4",
]);

const SECTION_DISTANCE_INSIGHT_KEYS = new Set([
  "1:0",
  "3:0", "3:1", "3:2", "3:3", "3:4",
  "5:0", "5:1", "5:2", "5:3", "5:4",
  "8:2",
  "9:0", "9:2",
  "10:1", "10:3",
  "11:1", "11:2",
  "12:2",
  "14:2",
  "15:2", "15:3",
]);

const SECTION_MOON_KEYS = new Set([
  "1:4", "2:4", "3:4", "4:4", "5:4",
  "6:0", "7:4", "10:4", "13:4", "14:4", "15:4",
]);

const CHAPTER_15_FINAL_STRATEGY = Object.freeze([
  "최종 판정은 감정의 크기가 아니라 반복 행동이 안정되는지로 내려야 합니다.",
  "첫 행동은 긴 설명보다 두 사람이 오늘부터 지킬 한 문장을 정하는 것입니다.",
  "즉시 멈출 행동은 불안할 때 상대의 침묵을 결론처럼 단정하는 태도입니다.",
  "계속 지킬 행동은 갈등 뒤 재접속 시간을 미리 정하고 약속처럼 지키는 일입니다.",
  "관계 결정 기준은 끌림, 회복력, 현실 합의가 같은 방향으로 움직이는지입니다.",
]);

function sectionProfileKey(chapterNo, sectionIndex) {
  return `${safeNumber(chapterNo, 0)}:${safeNumber(sectionIndex, 0)}`;
}

function resolveSectionWritingProfile(chapterNo, sectionIndex) {
  const key = sectionProfileKey(chapterNo, sectionIndex);
  const finalChapter = chapterNo === 15;
  return {
    relation: SECTION_RELATION_INSIGHT_KEYS.has(key),
    distance: SECTION_DISTANCE_INSIGHT_KEYS.has(key),
    evidence: sectionIndex !== 3 || [4, 8, 9, 14].includes(chapterNo),
    reality: true,
    caution: sectionIndex !== 4 || [1, 9, 10, 14, 15].includes(chapterNo),
    prescription: true,
    dialogue: !finalChapter || sectionIndex <= 1,
    routine: shouldUseSevenDayRoutine(chapterNo, sectionIndex),
    moon: SECTION_MOON_KEYS.has(key),
    finalStrategy: finalChapter,
  };
}

function sectionTheme(axis, sukuyoLens, reality, caution, prescription, dialogue, routine, moon, requiredTerms = []) {
  const terms = safeArray(requiredTerms).filter(Boolean);
  return {
    axis,
    sukuyoLens,
    reality,
    caution,
    prescription,
    dialogue,
    routine,
    moon,
    requiredTerms: terms,
    guides: [
      axis,
      terms[0] || axis,
      terms[1] || caution,
      terms[2] || prescription,
    ],
  };
}

const SUKYO_SECTION_COUNSELING_MATRIX = Object.freeze({
  1: [
    sectionTheme("전체 인연의 윤곽", "본명숙과 상대숙의 첫 결합이 관계 유형과 거리에서 어떤 큰 흐름으로 묶이는지 읽습니다.", "두 사람은 처음부터 관계의 방향을 빠르게 감지하며, 끌림과 경계가 동시에 켜지는 편입니다.", "처음의 강도를 운명 전체로 단정하면 이후 세부 신호를 놓치기 쉽습니다.", "관계의 첫 기준을 호감, 불안, 현실 가능성으로 나누어 기록하세요.", "우리가 끌린 이유와 불안한 이유를 한 문장씩 나누어 말해보자.", "1일차 전체 인상, 3일차 불안 신호, 7일차 유지 기준을 정리합니다.", "달빛은 이 인연의 큰 윤곽을 먼저 비추며, 서두른 결론보다 흐름의 이름을 정확히 부르게 합니다.", ["전체 인연", "궁합", "큰 흐름"]),
    sectionTheme("시작의 끌림", "숙요의 끌림은 별의 성향 차이와 관계 유형의 긴장도에서 발생합니다.", "처음에는 상대가 낯설면서도 익숙하게 느껴지고, 말보다 분위기에 먼저 반응합니다.", "끌림이 강할수록 상대의 실제 생활 리듬을 확인하기 전에 기대가 커질 수 있습니다.", "첫 끌림을 유지하려면 호감 표현 속도와 확인 질문의 간격을 맞추세요.", "처음 끌렸던 지점과 지금 확인하고 싶은 지점을 분리해서 말해보자.", "첫날 호감 이유, 셋째 날 현실 확인, 일곱째 날 속도 합의를 진행합니다.", "처음 열린 문은 달빛처럼 아름답지만, 발을 들이는 속도는 두 사람이 함께 정해야 합니다.", ["시작", "끌림", "호감"]),
    sectionTheme("함께 있을 때의 분위기", "두 숙의 기운이 같은 공간에서 어떤 정서 온도와 공기감을 만드는지 봅니다.", "함께 있으면 편안함과 긴장이 번갈아 올라오며, 상대의 표정과 침묵에 민감해집니다.", "분위기만 좋다고 핵심 대화를 미루면 나중에 서운함이 한꺼번에 드러납니다.", "좋은 분위기가 생긴 날에는 약속, 기대, 불편함을 짧게 확인하세요.", "오늘 분위기는 좋았지만 혹시 불편했던 점도 있었는지 듣고 싶어.", "만난 뒤 24시간 안에 좋았던 장면 하나와 조심할 장면 하나를 공유합니다.", "달빛 아래의 공기는 따뜻하지만, 그 따뜻함을 지키는 것은 작은 확인의 말입니다.", ["분위기", "정서", "공기감"]),
    sectionTheme("핵심 장점", "숙요 궁합의 장점은 서로가 상대의 약한 부분을 어떻게 보완하는지에서 선명해집니다.", "한 사람은 감정의 결을 읽고, 다른 한 사람은 현실적인 균형을 잡아주는 식으로 힘이 맞물립니다.", "장점을 당연하게 여기면 고마움이 줄고, 보완 관계가 역할 부담으로 변할 수 있습니다.", "서로가 잘해주는 부분을 주 1회 구체적인 행동 단위로 인정하세요.", "네가 해준 것 중 이번 주에 가장 도움이 된 부분은 이거였어.", "장점 기록, 감사 표현, 다음 주 보완 역할 합의를 한 번씩 반복합니다.", "이 인연의 좋은 별빛은 칭찬받을 때 더 오래 머무릅니다.", ["장점", "보완", "강점"]),
    sectionTheme("핵심 약점", "관계 약점은 관계 유형의 그림자와 거리감의 압력이 겹치는 지점에서 드러납니다.", "두 사람은 같은 문제를 다르게 해석해 침묵, 단정, 서운함이 빠르게 누적될 수 있습니다.", "약점을 성격 탓으로 몰면 숙요가 알려주는 조율 포인트가 사라집니다.", "반복되는 약점은 사람 문제가 아니라 상황, 표현, 타이밍 문제로 나누어 다루세요.", "우리가 반복하는 문제를 누가 잘못했는지가 아니라 언제 커지는지부터 보자.", "반복 장면, 촉발 말투, 회복 문장을 각각 하나씩 적어 합의합니다.", "달빛은 약점을 벌하지 않고, 두 사람이 피해야 할 어둠의 길목을 알려줍니다.", ["약점", "반복", "조율"]),
  ],
  2: [
    sectionTheme("나의 본명숙 기질", "나의 본명숙이 사랑에서 먼저 켜는 감정 신호와 방어 방식을 해석합니다.", "나는 애정을 줄 때 빠르게 읽고 깊게 반응하지만, 확신이 없으면 마음속 계산이 많아집니다.", "내 기질을 상대의 무심함으로 보상받으려 하면 기대가 압박으로 바뀝니다.", "내가 원하는 안정감을 요구하기 전에 어떤 신호가 필요한지 먼저 설명하세요.", "나는 이런 신호가 있어야 마음이 안정돼.", "나의 기질, 필요한 신호, 피해야 할 반응을 3문장으로 정리합니다.", "내 별은 사랑을 숨기지 않지만, 달빛은 먼저 나를 이해하라고 말합니다.", ["나의 본명숙", "기질", "나의 신호"]),
    sectionTheme("나의 감정 방식", "사랑할 때 내가 감정을 표현하는 속도와 깊이를 숙요 기질로 읽습니다.", "나는 좋아할수록 상대의 반응을 세밀하게 살피고, 작은 변화에도 의미를 부여합니다.", "감정 표현이 많아질수록 상대가 같은 속도로 따라오지 못할 수 있습니다.", "감정을 전달할 때는 요구보다 상태 설명을 먼저 두세요.", "내가 원하는 건 압박이 아니라 지금 내 마음을 알아주는 거야.", "감정이 올라온 날에는 감정 이름, 원하는 행동, 기다릴 시간을 나누어 말합니다.", "달빛은 감정을 크게 만들지만, 좋은 사랑은 그 감정에 숨 쉴 자리를 줍니다.", ["감정 방식", "표현", "반응"]),
    sectionTheme("내가 기대하는 것", "나의 숙은 관계에서 어떤 안정감, 확인, 책임감을 기대하는지 보여줍니다.", "나는 말보다 반복되는 행동에서 사랑의 진정성을 확인하려는 경향이 있습니다.", "기대를 말하지 않으면 상대는 시험받는 느낌을 받을 수 있습니다.", "상대가 맞힐 때까지 기다리지 말고 기대를 작고 선명한 행동으로 바꾸세요.", "내가 기대하는 건 큰 약속보다 이 행동이 반복되는 거야.", "기대 목록을 세 가지로 줄이고, 각각 확인 가능한 행동으로 번역합니다.", "기대는 달에게 비는 소원이 아니라 두 사람이 함께 쓰는 약속문입니다.", ["기대", "안정감", "확인"]),
    sectionTheme("불안할 때의 나", "불안이 켜질 때 내 본명숙의 그림자가 어떤 반응으로 나오는지 살핍니다.", "나는 불안할수록 확인을 서두르거나 마음을 숨긴 채 상대를 관찰할 수 있습니다.", "불안을 숨기면 상대는 이유를 모르고, 불안을 몰아붙이면 상대는 방어합니다.", "불안이 올라오면 결론 요구 전에 불안의 출처를 먼저 말하세요.", "지금 확답을 받으려는 게 아니라 내가 불안해진 이유를 설명하고 싶어.", "불안 신호가 오면 30분 멈춤, 감정 메모, 짧은 공유 순서로 움직입니다.", "달빛은 불안을 없애지 않지만, 불안을 사랑의 언어로 바꾸는 길을 보여줍니다.", ["불안", "방어", "확답"]),
    sectionTheme("사랑을 오래 유지하는 방법", "나의 숙이 지치지 않고 사랑을 지속하려면 어떤 운영 규칙이 필요한지 봅니다.", "나는 꾸준한 확인과 감정의 안전망이 있을 때 오래 깊어지는 타입입니다.", "혼자 참고 맞추는 방식은 결국 서운함을 크게 터뜨릴 수 있습니다.", "관계를 오래 가게 하려면 배려의 양보다 회복의 규칙을 먼저 세우세요.", "오래 만나기 위해 우리가 지켜야 할 기본 규칙을 같이 정하자.", "주간 감정 점검, 서운함 보류 금지, 화해 문장 연습을 반복합니다.", "오래 가는 사랑은 큰 운보다 매주 지켜낸 작은 달빛에 가깝습니다.", ["오래 유지", "지속", "회복 규칙"]),
  ],
  3: [
    sectionTheme("상대의 본명숙 기질", "상대의 본명숙이 관계에서 마음을 여는 순서와 방어선을 읽습니다.", "상대는 자신만의 속도로 안정감을 확인한 뒤 더 깊은 표현을 내놓는 편입니다.", "상대의 느린 반응을 애정 부족으로 단정하면 불필요한 거리감이 생깁니다.", "상대를 이해하려면 반응 속도보다 반복되는 선택을 보세요.", "네가 마음을 여는 방식이 어떤 순서인지 알고 싶어.", "상대의 반응, 반복 행동, 불편 신호를 일주일 동안 관찰합니다.", "상대의 별은 말보다 패턴으로 빛나며, 달빛은 그 패턴을 천천히 읽으라 합니다.", ["상대 본명숙", "상대 기질", "방어선"]),
    sectionTheme("상대가 사랑을 느끼는 방식", "상대 숙이 어떤 말과 행동에서 사랑받는다고 느끼는지 해석합니다.", "상대는 과한 감정보다 일관된 배려, 존중, 현실적 도움에서 애정을 확인할 수 있습니다.", "내 방식의 애정을 그대로 밀어 넣으면 상대에게 부담으로 닿을 수 있습니다.", "상대가 편하게 받는 애정 표현을 물어보고 그 방식으로 한 번 더 전달하세요.", "너는 어떤 표현을 받을 때 사랑받는다고 느껴?", "상대가 편한 표현, 부담스러운 표현, 고마웠던 표현을 구분합니다.", "사랑은 같은 달을 보아도 각자 다른 빛으로 받아들입니다.", ["사랑을 느끼는 방식", "애정 수신", "존중"]),
    sectionTheme("상대가 중요하게 여기는 것", "상대 숙이 관계에서 지키고 싶은 가치와 우선순위를 읽습니다.", "상대는 신뢰, 약속, 생활 균형처럼 반복 가능한 기준을 중요하게 볼 수 있습니다.", "상대의 중요 가치를 무시하면 사소한 문제도 관계 전체의 신뢰 문제로 커집니다.", "상대의 기준을 맞추려 하기보다 먼저 그 기준의 이유를 물어보세요.", "네가 관계에서 절대 놓치고 싶지 않은 기준은 뭐야?", "상대의 기준 세 가지를 듣고 내가 맞출 수 있는 것과 어려운 것을 나눕니다.", "달빛은 상대의 가치관을 바꾸라 하지 않고, 그 문 앞에서 예의를 갖추라 말합니다.", ["중요 가치", "기준", "신뢰"]),
    sectionTheme("상대가 멀어질 때의 신호", "상대 숙의 거리두기 신호가 침묵, 일정, 말투 중 어디에서 먼저 오는지 봅니다.", "상대는 지치면 감정을 설명하기보다 답장을 늦추거나 대화를 짧게 만들 수 있습니다.", "이 신호를 추궁하면 상대는 더 닫히고, 방치하면 거리감이 굳어집니다.", "멀어지는 신호가 보이면 원인 추궁보다 대화 가능한 시간을 먼저 제안하세요.", "지금 바로 답하지 않아도 괜찮아. 언제 이야기하면 편할까?", "답장 변화, 표정 변화, 회피 주제를 구분해 기록합니다.", "달빛이 옅어질 때는 붙잡기보다 다시 밝아질 자리를 남겨야 합니다.", ["멀어질 신호", "거리두기", "침묵"]),
    sectionTheme("상대를 이해하는 핵심", "상대 숙을 이해하는 핵심은 내 기준이 아니라 상대의 반복 패턴을 읽는 것입니다.", "상대는 말보다 행동의 일관성으로 마음을 보여줄 가능성이 큽니다.", "내가 듣고 싶은 방식만 인정하면 상대의 진짜 애정 표현을 놓칩니다.", "상대의 애정 언어를 하나 정하고, 그것을 받을 때 바로 인정하세요.", "네 방식의 표현을 내가 알아차리려고 노력할게.", "상대의 애정 언어, 부담 신호, 회복 신호를 한 장으로 정리합니다.", "상대의 별빛은 낯선 모양일 뿐, 빛나지 않는 것이 아닙니다.", ["이해", "반복 패턴", "애정 언어"]),
  ],
  4: [
    sectionTheme("관계 유형의 본질", "두 사람의 관계 유형이 끌림, 긴장, 배움 중 어디에 무게를 두는지 해석합니다.", "이 관계는 단순한 호감보다 서로의 약한 지점을 건드리며 성장 압력을 만듭니다.", "관계 유형을 좋고 나쁨으로만 보면 조율해야 할 핵심을 놓칩니다.", "관계 유형의 장점과 위험을 각각 하나씩 이름 붙여 관리하세요.", "우리 관계의 장점과 조심할 점을 같은 무게로 보자.", "관계 유형 키워드, 반복 갈등, 회복 방식을 한 표에 적습니다.", "관계 유형은 운명의 판결이 아니라 두 사람이 읽어야 할 별의 지도입니다.", ["관계 유형", "본질", "성장 압력"]),
    sectionTheme("감정적 강도", "관계 유형이 만드는 감정 강도와 마음의 진폭을 읽습니다.", "두 사람은 사소한 말에도 마음이 크게 움직이고, 좋을 때와 불안할 때의 차이가 큽니다.", "강한 감정을 진짜 사랑의 증거로만 보면 안정감을 놓칠 수 있습니다.", "감정이 커질수록 대화를 늦추고 사실 확인을 먼저 하세요.", "지금 감정이 커졌으니 결론보다 사실을 먼저 맞춰보자.", "감정 강도가 올라간 날에는 바로 결정하지 않는 규칙을 지킵니다.", "달빛이 밝을수록 그림자도 깊어지니, 빛과 그늘을 함께 보아야 합니다.", ["감정적 강도", "진폭", "사실 확인"]),
    sectionTheme("서로에게 배우는 것", "숙요 관계는 서로의 다른 기질을 통해 배우는 과제를 드러냅니다.", "한 사람은 감정의 섬세함을, 다른 한 사람은 현실의 균형을 배우게 됩니다.", "배움을 지적이나 훈계로 바꾸면 상대는 성장보다 평가를 느낍니다.", "서로에게 배우는 점은 칭찬의 언어로 먼저 말하세요.", "네가 가진 방식 중 내가 배우고 싶은 부분이 있어.", "서로에게 배우는 장점 하나와 따라 하기 어려운 점 하나를 공유합니다.", "이 인연의 수업은 상대를 고치는 일이 아니라 내 그릇을 넓히는 일입니다.", ["배움", "성장 과제", "장점"]),
    sectionTheme("반복 패턴", "관계 유형이 반복해서 만드는 충돌 고리와 화해 고리를 분리합니다.", "같은 말투, 같은 기다림, 같은 서운함이 다른 사건 속에서 되풀이될 수 있습니다.", "반복 패턴을 기억력 문제로 보면 해결이 늦어지고, 구조로 보면 길이 보입니다.", "반복되는 장면에는 멈춤 신호와 재대화 시간을 반드시 붙이세요.", "이 장면은 우리에게 반복되는 패턴이니까 잠깐 멈추자.", "반복 장면, 촉발 문장, 멈춤 신호, 재대화 시간을 정합니다.", "달빛은 같은 길을 여러 번 비추며, 이번에는 다른 발걸음을 선택하게 합니다.", ["반복 패턴", "충돌 고리", "화해 고리"]),
    sectionTheme("관계 유형을 좋게 쓰는 방법", "관계 유형의 힘을 상처가 아니라 성장과 친밀감으로 돌리는 방법을 봅니다.", "두 사람은 서로를 흔들 수 있지만, 합의가 있으면 깊은 회복력을 만들 수 있습니다.", "관계의 강도를 즐기기만 하면 피로가 쌓이고, 피하려고만 하면 끌림이 식습니다.", "강한 흐름은 규칙, 휴식, 확인 대화로 통로를 만들어 주세요.", "우리가 강하게 부딪힐 때 지킬 안전 규칙을 정하자.", "강한 감정 후 휴식, 확인, 화해 순서를 같은 방식으로 반복합니다.", "이 관계의 별은 거칠지만, 다듬으면 오래 빛나는 보석이 됩니다.", ["좋게 쓰는 방법", "안전 규칙", "회복력"]),
  ],
  5: [
    sectionTheme("거리의 의미", "숙요의 거리는 물리적 거리보다 감정이 닿는 체감 속도를 뜻합니다.", "가까운 거리감은 빠른 친밀감을 만들고, 먼 거리감은 해석의 여백을 크게 만듭니다.", "거리 의미를 모르면 상대의 속도를 애정의 크기로 오해합니다.", "두 사람의 적정 연락 간격과 만남 간격을 별도로 정하세요.", "우리가 편안한 거리와 부담스러운 거리를 같이 찾아보자.", "연락, 만남, 혼자 있는 시간을 각각 조율합니다.", "달빛은 가까이 있어도 멀리 있어도 같은 하늘에서 두 사람을 잇습니다.", ["거리", "체감 속도", "간격"]),
    sectionTheme("가까워질수록 강해지는 부분", "가까워질수록 두 숙의 감정 반응과 생활 리듬이 더 선명하게 드러납니다.", "친밀해지면 애정 표현과 보호 본능이 강해지고 서로에게 기대는 힘도 커집니다.", "가까워진 만큼 사생활 경계가 흐려지면 답답함이 생깁니다.", "친밀감이 커질 때도 개인 시간과 감정 휴식 시간을 지켜주세요.", "가까워져도 각자 숨 쉬는 시간은 지키자.", "만남 후 혼자 회복하는 시간과 다음 연락 시점을 정합니다.", "가까운 달빛은 따뜻하지만, 너무 오래 바라보면 눈이 피로해집니다.", ["가까워질수록", "친밀감", "개인 시간"]),
    sectionTheme("멀어질수록 드러나는 문제", "거리감이 벌어질 때 불안, 추측, 확인 욕구가 어떻게 변하는지 봅니다.", "멀어지면 상대의 침묵이 실제보다 차갑게 느껴지고 작은 공백도 크게 해석됩니다.", "공백을 방치하거나 추궁하면 둘 다 방어적으로 변합니다.", "공백이 생길 때 사용할 짧은 확인 문장과 답장 유예 시간을 정하세요.", "답이 늦어질 때는 언제쯤 이야기할 수 있는지만 알려줘.", "연락 공백 기준, 불안 대처, 재접촉 문장을 정리합니다.", "멀어진 달빛은 사라진 것이 아니라 구름 뒤에 머무를 때가 있습니다.", ["멀어질수록", "공백", "추측"]),
    sectionTheme("인연의 속도와 감정 밀도", "관계 속도와 감정 밀도가 맞는지 숙요 점수와 거리감으로 읽습니다.", "감정은 빨리 깊어질 수 있지만 현실 합의가 따라오지 않으면 흔들립니다.", "빠른 속도를 운명으로만 믿으면 생활 조건 검증을 놓칩니다.", "속도는 감정, 약속, 생활 공개의 세 단계로 나누어 맞추세요.", "우리 속도가 빠른지 느린지보다 어떤 단계까지 준비됐는지 보자.", "호감, 약속, 생활 공개 단계를 각각 체크합니다.", "인연의 강물은 빠를수록 둑이 필요하고, 둑은 합의의 언어로 세워집니다.", ["속도", "감정 밀도", "단계"]),
    sectionTheme("거리 조절법", "이 관계의 적정 거리는 끌림을 유지하면서 불안을 낮추는 지점입니다.", "두 사람은 너무 붙으면 예민해지고, 너무 멀면 불안이 커질 수 있습니다.", "거리 조절을 회피로 쓰면 관계가 식고, 통제로 쓰면 숨이 막힙니다.", "가까워지는 시간과 물러나는 시간을 미리 합의하세요.", "이번 주에는 가까워질 시간과 쉬어갈 시간을 같이 정하자.", "만남 하루, 휴식 하루, 확인 대화 하루의 리듬을 만들어 봅니다.", "달빛은 밀물과 썰물처럼 다가오고 물러나며 인연의 해안을 지킵니다.", ["거리 조절", "가까움", "휴식"]),
  ],
  6: [
    sectionTheme("처음 끌린 이유", "첫 끌림은 두 숙의 낯선 결이 서로의 빈자리를 건드릴 때 생깁니다.", "상대에게서 내게 부족한 분위기나 오래 바라던 반응을 발견했을 수 있습니다.", "처음 끌린 이유를 계속 같은 방식으로 요구하면 관계가 좁아집니다.", "처음의 매력을 인정하되 현재의 사람을 다시 알아가세요.", "처음 좋았던 점과 지금 새로 보이는 점을 같이 말해보자.", "첫 매력, 현재 장점, 앞으로 확인할 점을 나누어 적습니다.", "첫 끌림은 별이 문을 두드리는 순간이고, 사랑은 그 문 안에서 살아가는 일입니다.", ["처음 끌림", "첫 매력", "현재 장점"]),
    sectionTheme("신비롭게 느껴지는 지점", "숙요에서 신비감은 설명되지 않는 익숙함과 예측 불가한 매력이 만나는 곳입니다.", "상대가 낯선데도 오래 알고 지낸 듯 느껴지거나, 작은 행동이 크게 남을 수 있습니다.", "신비감을 상대의 모든 면을 아는 것처럼 착각하면 실망이 빨라집니다.", "신비감은 남겨두되 현실 정보는 차분히 확인하세요.", "신기하게 느껴지는 부분과 아직 모르는 부분을 구분해보자.", "상대에게 궁금한 현실 질문 세 가지를 부드럽게 묻습니다.", "달빛의 신비는 가까이 갈수록 사라지는 것이 아니라 더 정교한 무늬가 됩니다.", ["신비감", "익숙함", "현실 정보"]),
    sectionTheme("외모보다 강한 분위기", "두 숙의 기운은 외형보다 말투, 눈빛, 리듬에서 더 강하게 작동할 수 있습니다.", "상대의 분위기, 태도, 생활 감각이 끌림의 핵심이 될 수 있습니다.", "분위기에 취하면 실제 배려와 책임을 확인하지 못할 수 있습니다.", "분위기와 행동의 일치 여부를 천천히 살피세요.", "네 분위기가 좋았고, 그만큼 행동도 천천히 알아가고 싶어.", "좋았던 분위기와 실제 행동이 맞았던 장면을 기록합니다.", "달빛은 얼굴보다 그림자의 움직임을 먼저 보여줍니다.", ["분위기", "말투", "행동 일치"]),
    sectionTheme("감정이 빨리 깊어지는 이유", "관계 유형과 거리감이 감정 심도를 빠르게 끌어올리는지 봅니다.", "짧은 만남에도 오래된 관계처럼 마음이 깊어질 수 있습니다.", "감정 깊이를 관계 안정성과 혼동하면 속도 조절이 어려워집니다.", "깊어진 감정만큼 현실 약속의 단계도 맞춰 가세요.", "마음은 깊어졌지만 약속은 어떤 속도로 갈지 정하자.", "감정 고백, 약속 수준, 생활 공유 범위를 단계별로 맞춥니다.", "깊은 물은 아름답지만, 건너기 전에는 반드시 발밑을 확인해야 합니다.", ["감정 깊이", "속도 조절", "약속 단계"]),
    sectionTheme("첫 끌림의 지속 조건", "첫 끌림이 오래 가려면 숙요의 자극을 안정적인 신뢰로 바꾸어야 합니다.", "설렘이 줄어드는 대신 편안함이 생길 때 관계는 다음 단계로 넘어갑니다.", "설렘이 약해졌다고 관계가 식었다고 단정하면 안정기의 가치를 놓칩니다.", "설렘, 편안함, 책임감이 어떻게 바뀌는지 함께 확인하세요.", "처음과 달라진 감정 중 좋아진 부분도 같이 봐보자.", "설렘 기록, 편안함 기록, 책임 행동을 한 가지씩 점검합니다.", "첫 별빛은 사라지는 것이 아니라 일상의 등불로 바뀔 수 있습니다.", ["지속 조건", "설렘", "안정기"]),
  ],
  7: [
    sectionTheme("감정 속도 차이", "두 숙이 감정을 느끼고 말로 꺼내는 속도 차이를 읽습니다.", "한쪽은 바로 느끼고 표현하지만, 다른 쪽은 정리한 뒤 말하려 할 수 있습니다.", "속도 차이를 애정 차이로 해석하면 불안과 회피가 동시에 커집니다.", "빠른 쪽은 기다림을, 느린 쪽은 예고를 맡아야 합니다.", "나는 기다릴게. 대신 언제쯤 말할 수 있는지만 알려줘.", "감정 표현 시간, 정리 시간, 재대화 시간을 정합니다.", "달빛은 먼저 뜨는 별과 늦게 뜨는 별을 한 하늘에 둡니다.", ["감정 속도", "기다림", "예고"]),
    sectionTheme("애정 표현 차이", "애정 표현의 언어가 말, 행동, 접촉, 책임 중 어디에 있는지 봅니다.", "두 사람은 사랑을 주는 방식과 받는 방식이 다를 수 있습니다.", "내 방식만 사랑이라고 주장하면 상대의 표현이 지워집니다.", "각자의 애정 표현을 번역해서 상대가 알아들을 수 있게 바꾸세요.", "내 표현 방식과 네가 받기 편한 방식을 맞춰보고 싶어.", "각자 좋아하는 표현과 부담스러운 표현을 두 가지씩 나눕니다.", "사랑의 언어가 다를수록 달빛은 번역자의 역할을 요구합니다.", ["애정 표현", "사랑의 언어", "번역"]),
    sectionTheme("서운함이 쌓이는 방식", "서운함은 숙요의 그림자가 반복될 때 조용히 층을 만듭니다.", "사소한 답장, 말투, 약속 변경이 누적되며 어느 날 큰 감정으로 올라옵니다.", "서운함을 오래 참으면 정확한 원인이 흐려져 해결이 어려워집니다.", "서운함은 당일에 짧게 말하고, 큰 결론은 다음 대화로 넘기세요.", "오늘 서운했던 건 작지만 그냥 넘기면 쌓일 것 같아.", "서운함 발생 시점, 실제 사건, 내가 원한 반응을 기록합니다.", "달빛 아래 쌓인 먼지는 작아 보여도 오래 두면 길을 흐립니다.", ["서운함", "누적", "당일 공유"]),
    sectionTheme("마음이 통하는 순간", "두 숙이 서로의 정서를 정확히 받아주는 순간을 해석합니다.", "상대가 내 감정의 이유를 설명하지 않아도 알아차릴 때 깊은 연결감을 느낍니다.", "마음이 통했던 순간만 기준으로 삼으면 평범한 날의 사랑을 놓칩니다.", "통했던 순간을 기억하되 평소의 확인 대화도 유지하세요.", "그때 마음이 통한다고 느꼈던 이유를 서로 말해보자.", "통했던 장면, 필요한 조건, 다시 만들 수 있는 행동을 정리합니다.", "마음이 통하는 순간은 별의 문이 잠시 열리는 때입니다.", ["마음이 통함", "연결감", "확인 대화"]),
    sectionTheme("감정 온도 맞추기", "감정 온도는 뜨거움보다 지속 가능한 균형을 기준으로 봐야 합니다.", "한쪽이 과열되면 다른 쪽은 식는 방식으로 균형을 잡으려 할 수 있습니다.", "온도 차이를 무시하면 뜨거운 쪽은 외롭고 차분한 쪽은 압박을 느낍니다.", "대화 전 감정 온도를 숫자로 말하고, 높은 쪽부터 낮추세요.", "지금 내 감정 온도는 8이야. 5가 될 때 다시 이야기하자.", "감정 온도 숫자화, 휴식, 재대화 순서를 연습합니다.", "달빛은 뜨겁지 않아 오래 비춥니다. 이 관계도 오래 비추는 온도를 찾아야 합니다.", ["감정 온도", "과열", "균형"]),
  ],
  8: [
    sectionTheme("말이 잘 통하는 부분", "소통 궁합은 두 숙이 같은 주제에서 얼마나 쉽게 의미를 맞추는지 봅니다.", "관심사나 감정 표현이 맞을 때 대화가 빠르게 깊어질 수 있습니다.", "잘 통하는 부분만 믿고 어려운 주제를 피하면 관계의 빈틈이 남습니다.", "잘 통하는 주제를 발판으로 불편한 주제까지 부드럽게 연결하세요.", "우리가 잘 통하는 방식으로 어려운 이야기도 천천히 해보자.", "잘 통하는 주제, 어려운 주제, 연결 문장을 정합니다.", "말이 통하는 순간은 두 별이 같은 파장으로 흔들리는 때입니다.", ["말이 통함", "소통", "어려운 주제"]),
    sectionTheme("말이 엇갈리는 부분", "말의 엇갈림은 단어보다 의도 해석의 차이에서 생길 수 있습니다.", "한쪽은 해결책으로 듣고, 다른 쪽은 공감 부족으로 받아들일 수 있습니다.", "엇갈림을 무시하면 같은 말이 매번 다른 상처를 만듭니다.", "상대 말의 의도를 먼저 확인한 뒤 내 해석을 말하세요.", "내가 이렇게 들었는데 네 의도는 그게 맞아?", "엇갈린 문장, 실제 의도, 다르게 말할 표현을 정리합니다.", "달빛 아래에서는 같은 그림자도 위치에 따라 다르게 보입니다.", ["말이 엇갈림", "의도", "해석"]),
    sectionTheme("침묵이 생기는 이유", "침묵은 무관심보다 방어, 정리 시간, 부담감의 신호일 수 있습니다.", "상대가 침묵할 때 나는 거절로 느끼고, 상대는 생각할 시간이 필요할 수 있습니다.", "침묵을 몰아붙이면 더 긴 침묵이 되고, 방치하면 단절로 굳어집니다.", "침묵이 생기면 시간 제한과 재개 약속을 함께 정하세요.", "지금 말하기 어렵다면 언제 다시 이야기할 수 있을까?", "침묵 허용 시간, 재대화 약속, 확인 문장을 미리 합의합니다.", "침묵은 어둠이 아니라 아직 말이 별빛을 찾는 시간일 수 있습니다.", ["침묵", "정리 시간", "재개 약속"]),
    sectionTheme("싸울 때의 말", "갈등 언어는 숙요 그림자가 가장 빠르게 드러나는 통로입니다.", "한쪽은 감정의 크기로 말하고, 다른 쪽은 논리나 회피로 반응할 수 있습니다.", "싸울 때 인격 평가, 과거 소환, 단정 표현이 들어가면 회복이 늦어집니다.", "갈등 문장은 현재 사건, 내 감정, 원하는 행동만 담으세요.", "너는 항상 그래가 아니라, 오늘 이 말이 나를 서운하게 했어라고 말하자.", "금지어 세 가지와 대체 문장 세 가지를 정합니다.", "달빛은 칼처럼 날카로운 말을 부드러운 길로 돌리라 합니다.", ["싸울 때", "갈등 언어", "금지어"]),
    sectionTheme("관계를 살리는 대화법", "관계를 살리는 말은 승패보다 회복 가능성을 열어두는 말입니다.", "두 사람에게 필요한 대화는 감정 확인, 사실 정리, 다음 행동 합의의 순서입니다.", "사과만 하고 행동 합의가 없으면 같은 상처가 반복됩니다.", "대화 끝에는 반드시 다음 행동 하나와 확인 시점을 남기세요.", "오늘 대화의 결론을 다음 행동 하나로 정해보자.", "감정 확인, 사실 정리, 행동 합의, 확인 날짜를 순서대로 진행합니다.", "좋은 대화는 달빛처럼 어두운 감정을 없애지 않고 지나갈 길을 비춥니다.", ["살리는 대화", "행동 합의", "확인 시점"]),
  ],
  9: [
    sectionTheme("자주 부딪히는 문제", "자주 부딪히는 문제는 관계 유형의 그림자와 생활 습관이 만나는 지점입니다.", "연락, 약속, 말투, 우선순위 같은 반복 주제가 핵심 갈등으로 떠오를 수 있습니다.", "겉 사건만 바꾸면 같은 구조가 다른 이름으로 돌아옵니다.", "문제의 이름보다 반복 구조를 먼저 찾아야 합니다.", "이번 사건이 아니라 우리가 반복하는 구조가 뭔지 보자.", "반복 주제, 촉발 상황, 회복 실패 이유를 기록합니다.", "갈등은 별빛이 꺼진 것이 아니라 아직 정리되지 않은 그림자가 드러난 것입니다.", ["자주 부딪힘", "반복 구조", "갈등"]),
    sectionTheme("서로를 오해하는 지점", "오해는 숙요 기질의 표현 방식 차이를 상대의 의도로 단정할 때 생깁니다.", "나는 배려로 한 행동을 상대는 통제로 느끼거나, 상대의 침묵을 나는 무심함으로 느낄 수 있습니다.", "오해를 오래 두면 사실보다 감정 기억이 더 강해집니다.", "의도, 영향, 원하는 수정점을 분리해서 말하세요.", "네 의도는 알겠는데 내가 받은 영향은 이랬어.", "오해 장면마다 의도와 영향을 따로 적어봅니다.", "달빛은 의도와 상처가 같은 길을 걷지 않을 수 있음을 보여줍니다.", ["오해", "의도", "영향"]),
    sectionTheme("한쪽이 지치는 이유", "지침은 역할 불균형과 감정 노동의 누적에서 생깁니다.", "한 사람이 계속 맞추거나 설명하거나 기다리는 역할을 맡으면 피로가 커집니다.", "지친 쪽을 예민하다고 보면 관계 회복의 기회를 잃습니다.", "감정 노동과 현실 행동을 나누어 책임을 재분배하세요.", "내가 계속 맡고 있는 역할을 같이 나눌 수 있을까?", "기다림, 설명, 사과, 조율 역할을 각자 나누어 봅니다.", "지친 별은 빛이 없는 것이 아니라 너무 오래 혼자 빛난 것입니다.", ["지침", "역할 불균형", "감정 노동"]),
    sectionTheme("감정 폭발 순간", "감정 폭발은 오래 쌓인 신호가 임계점을 넘을 때 일어납니다.", "작은 말 하나가 과거의 상처를 함께 불러와 반응이 커질 수 있습니다.", "폭발 직후 결론을 내리면 관계 전체를 다치게 할 수 있습니다.", "폭발 순간에는 멈춤, 분리, 재대화 약속만 남기세요.", "지금은 폭발한 상태라 결론보다 멈춤이 필요해.", "폭발 전 신호, 멈춤 문장, 재대화 시간을 미리 정합니다.", "번개가 친 밤에도 달은 사라지지 않습니다. 지나간 뒤 다시 보아야 합니다.", ["감정 폭발", "임계점", "멈춤"]),
    sectionTheme("갈등을 줄이는 방법", "갈등 완화는 피하는 기술이 아니라 같은 고리를 짧게 끊는 기술입니다.", "두 사람은 갈등을 없애기보다 회복 시간을 줄일 때 안정됩니다.", "갈등을 줄인다는 명목으로 중요한 말을 삼키면 장기적으로 더 커집니다.", "갈등 후 24시간 안에 사실, 감정, 다음 행동을 정리하세요.", "싸우지 않는 것보다 싸운 뒤 어떻게 돌아오는지가 중요해.", "갈등 발생, 휴식, 재대화, 행동 합의를 하루 안에 마무리합니다.", "갈등의 밤은 길어도 회복의 달빛을 켜두면 길을 잃지 않습니다.", ["갈등 완화", "회복 시간", "24시간"]),
  ],
  10: [
    sectionTheme("멀어지는 이유", "이별 흐름은 애정 소멸보다 반복 피로와 설명 없는 거리두기에서 시작될 수 있습니다.", "감정이 남아도 같은 문제를 해결할 자신이 없으면 멀어지는 선택을 합니다.", "멀어짐을 단순 변심으로 보면 남아 있는 마음과 해결 과제를 놓칩니다.", "멀어진 이유를 감정, 사건, 반복 구조로 나누어 보세요.", "우리가 멀어진 이유를 한 가지 감정으로만 설명하지 말자.", "멀어진 사건, 반복 문제, 아직 남은 감정을 분리합니다.", "헤어짐의 달빛은 끝만 비추지 않고 아직 풀지 못한 매듭도 비춥니다.", ["멀어지는 이유", "이별", "반복 피로"]),
    sectionTheme("이별 후 마음이 남는 이유", "숙요 인연은 미해결 감정과 강한 각인이 남을 때 쉽게 끊어지지 않습니다.", "상대의 장점보다 끝내 말하지 못한 감정이 오래 마음에 남을 수 있습니다.", "남은 마음을 재회 가능성으로만 해석하면 현실 문제를 못 봅니다.", "마음이 남는 이유와 다시 만나도 해결해야 할 문제를 함께 적으세요.", "마음이 남는 것과 다시 만날 준비가 된 것은 다를 수 있어.", "남은 감정, 미안함, 반복 문제를 각각 분리합니다.", "남은 마음은 달빛의 잔향이며, 그 빛이 길인지 미련인지는 행동이 결정합니다.", ["마음이 남음", "미해결 감정", "재회 준비"]),
    sectionTheme("재회 가능 조건", "재회는 끌림보다 반복 문제를 다르게 다룰 준비가 있을 때 열립니다.", "두 사람 모두 같은 상처를 다시 만들지 않을 구체적 규칙이 필요합니다.", "그리움만으로 재회하면 이전 패턴이 빠르게 돌아옵니다.", "재회 전에는 연락 규칙, 갈등 멈춤, 사과 방식부터 합의하세요.", "다시 만나고 싶다면 예전과 다르게 할 규칙부터 정하자.", "재회 이유, 바꿀 행동, 확인 기간을 3단계로 세웁니다.", "재회의 문은 달빛처럼 부드럽지만, 들어가기 전 낡은 짐을 내려놓아야 합니다.", ["재회 가능", "바꿀 행동", "확인 기간"]),
    sectionTheme("다시 만나도 반복될 문제", "반복 문제는 숙요 관계 유형의 그림자가 해결되지 않았다는 신호입니다.", "연락 공백, 상처 표현, 책임 회피 같은 문제가 같은 방식으로 돌아올 수 있습니다.", "반복될 문제를 사랑으로 덮으면 더 큰 실망이 옵니다.", "재회 전 반복 문제 하나를 반드시 행동 규칙으로 바꾸세요.", "다시 만나면 제일 먼저 반복될 문제가 뭔지 솔직히 보자.", "반복 문제, 금지 행동, 대체 행동을 문장으로 합의합니다.", "달빛은 같은 길을 두 번 비출 때 두 번째 선택을 묻습니다.", ["반복 문제", "금지 행동", "대체 행동"]),
    sectionTheme("재회를 원할 때의 태도", "재회를 원할수록 관계 유형의 강도보다 상대의 현재 상태를 존중해야 합니다.", "다가가고 싶은 마음이 커도 상대의 회복 속도를 기다릴 줄 알아야 합니다.", "확답을 재촉하면 재회 가능성보다 방어가 먼저 커집니다.", "재회 대화는 사과, 변화, 선택권 존중의 순서로 시작하세요.", "내 마음은 전하고 싶지만 네 선택을 존중할게.", "사과 문장, 바뀐 행동, 기다릴 기간을 정합니다.", "재회를 비는 달빛은 상대의 문 앞에 조용히 머무는 예의를 압니다.", ["재회 태도", "선택권", "기다림"]),
  ],
  11: [
    sectionTheme("오래 만날수록 강해지는 부분", "장기 관계에서는 숙요의 장점이 생활 속 반복 행동으로 굳어집니다.", "서로의 강점을 알고 역할을 나누면 신뢰가 깊어집니다.", "오래 만났다는 이유로 표현과 점검을 줄이면 관계가 건조해집니다.", "장점이 굳어질수록 감사와 역할 재조정을 함께 하세요.", "오래 된 만큼 당연하게 여기지 말고 다시 고마움을 말하자.", "장기 장점, 고마운 행동, 바꿀 역할을 점검합니다.", "오랜 달빛은 화려하지 않아도 길을 잃지 않게 합니다.", ["장기 관계", "신뢰", "역할 재조정"]),
    sectionTheme("결혼 후 드러날 차이", "결혼 궁합은 감정 궁합보다 생활 결정 방식의 차이를 크게 봅니다.", "돈, 가족, 집안일, 휴식 방식에서 두 숙의 현실 감각 차이가 드러납니다.", "사랑으로 생활 차이를 덮으면 결혼 후 피로가 빠르게 쌓입니다.", "결혼 전 생활 규칙을 구체적인 숫자와 역할로 정하세요.", "좋아하는 마음과 생활 방식은 따로 맞춰봐야 해.", "돈, 가사, 가족 경계, 휴식 시간을 문서처럼 합의합니다.", "결혼의 달빛은 설렘보다 매일의 밥상과 문턱을 더 오래 비춥니다.", ["결혼", "생활 차이", "가사"]),
    sectionTheme("생활 리듬 궁합", "생활 리듬은 수면, 일, 연락, 휴식의 박자가 얼마나 맞는지 보는 축입니다.", "리듬이 맞으면 편안하지만, 어긋나면 사소한 생활 소음이 감정 문제로 커집니다.", "생활 리듬 차이를 배려 없이 두면 사랑보다 피곤함이 먼저 느껴집니다.", "하루 루틴과 쉬는 방식을 서로 침범하지 않는 선에서 맞추세요.", "우리의 하루 리듬 중 같이 맞출 것과 각자 둘 것을 나누자.", "수면, 식사, 연락, 휴식 리듬을 표로 맞춥니다.", "같은 달 아래에서도 각자의 밤길은 다릅니다. 리듬은 맞추되 숨은 남겨야 합니다.", ["생활 리듬", "휴식", "하루 루틴"]),
    sectionTheme("책임과 역할 분담", "장기 궁합의 안정성은 책임이 공평하게 느껴지는지에 달려 있습니다.", "한쪽이 감정 조율과 현실 책임을 함께 떠안으면 불만이 누적됩니다.", "역할 분담을 말하지 않으면 누가 더 희생했는지로 싸우게 됩니다.", "눈에 보이는 일과 보이지 않는 감정 노동을 함께 나누세요.", "보이는 일뿐 아니라 마음 쓰는 일도 같이 나누고 싶어.", "가사, 돈, 일정, 감정 조율 역할을 각각 배분합니다.", "책임을 나눈 별은 서로를 묶지 않고 오래 지탱합니다.", ["책임", "역할 분담", "감정 노동"]),
    sectionTheme("장기 관계 조건", "오래 가는 조건은 끌림 유지보다 회복 가능성을 반복해서 증명하는 것입니다.", "두 사람은 갈등 후 다시 돌아오는 방식이 안정될 때 미래를 상상할 수 있습니다.", "미래 이야기만 하고 현재 규칙이 없으면 신뢰가 얇아집니다.", "장기 조건은 약속, 회복, 생활 기준 세 가지로 확인하세요.", "우리의 미래를 말하기 전에 현재 지킬 기준을 정하자.", "한 달 단위로 약속, 회복, 생활 기준을 점검합니다.", "긴 인연은 큰 예언보다 작은 약속을 지키는 달빛에서 자랍니다.", ["장기 조건", "미래", "생활 기준"]),
  ],
  12: [
    sectionTheme("돈과 소비 태도", "현실 궁합에서 돈은 안정감, 자유, 책임감을 동시에 드러내는 영역입니다.", "한쪽은 안전을 위해 모으고, 다른 쪽은 경험과 관계를 위해 쓰려 할 수 있습니다.", "소비 취향을 인격 문제로 보면 대화가 금방 방어적으로 흐릅니다.", "공동 지출, 개인 지출, 선물 기준을 분리해서 합의하세요.", "돈을 쓰는 방식이 다르니 공동 기준과 개인 기준을 나눠보자.", "공동비, 개인비, 충동 소비 기준을 정합니다.", "돈의 흐름은 달빛처럼 마음의 불안을 비춥니다. 숫자 뒤의 감정을 함께 보아야 합니다.", ["돈", "소비", "공동 지출"]),
    sectionTheme("일과 관계의 우선순위", "일과 관계의 우선순위는 각 숙이 책임과 애정을 어떻게 배분하는지 보여줍니다.", "한쪽은 일을 통해 안정감을 만들고, 다른 쪽은 관계 시간을 애정의 증거로 볼 수 있습니다.", "바쁜 시기를 사랑 부족으로 단정하면 현실 압박이 감정 갈등으로 바뀝니다.", "바쁜 기간에는 연락 최소 기준과 보상 시간을 미리 정하세요.", "바쁠 때도 우리가 지킬 최소한의 연결 기준을 정하자.", "업무 집중 시간, 최소 연락, 회복 데이트를 합의합니다.", "일의 태양과 사랑의 달이 같은 하늘에 뜨려면 시간의 질서를 세워야 합니다.", ["일", "우선순위", "최소 연락"]),
    sectionTheme("가족과 주변 사람 관점", "가족과 주변 사람은 두 사람의 경계감과 책임 의식을 시험하는 영역입니다.", "상대의 가족, 친구, 지인에 대한 태도가 관계 안정감을 크게 흔들 수 있습니다.", "외부 사람 문제를 방치하면 둘만의 갈등보다 더 깊은 편 가르기가 생깁니다.", "가족 개입 범위와 공개 수준을 두 사람이 먼저 합의하세요.", "우리 관계에 주변 사람이 어디까지 들어올 수 있는지 정하자.", "가족 공유 범위, 친구 만남 기준, 갈등 시 외부 상담 금지를 정합니다.", "달빛은 둘만의 방도 비추지만, 문밖의 그림자도 함께 보여줍니다.", ["가족", "주변 사람", "경계"]),
    sectionTheme("생활 습관 차이", "생활 습관은 숙요 궁합이 현실에서 매일 반복되는 자리입니다.", "정리, 시간 약속, 식사, 청결, 휴식 방식에서 작지만 큰 차이가 생길 수 있습니다.", "생활 차이를 참기만 하면 어느 날 사랑의 문제가 아니라 피로의 문제가 됩니다.", "생활 습관은 옳고 그름보다 공동 구역 규칙으로 다루세요.", "네 방식과 내 방식 중 같이 쓰는 공간에서는 어떤 기준을 둘까?", "공동 구역, 개인 구역, 양보 가능한 습관을 정합니다.", "생활의 작은 먼지도 달빛 아래에서는 관계의 길을 흐릴 수 있습니다.", ["생활 습관", "공동 구역", "피로"]),
    sectionTheme("현실 문제 해결 방식", "현실 문제를 함께 해결하는 방식은 장기 궁합의 실제 체력을 보여줍니다.", "문제가 생겼을 때 한쪽은 감정 위로를, 다른 한쪽은 해결 순서를 먼저 찾을 수 있습니다.", "위로와 해결을 서로 반대편으로 느끼면 협력보다 서운함이 커집니다.", "문제 앞에서는 감정 확인 후 해결 순서를 정하는 방식을 고정하세요.", "먼저 마음을 확인하고, 그 다음 해결 순서를 정하자.", "문제 발생 시 감정 확인, 역할 분담, 기한 설정을 진행합니다.", "현실의 돌은 무겁지만, 둘이 같은 방향으로 들면 길이 열립니다.", ["현실 문제", "해결 방식", "역할 분담"]),
  ],
  13: [
    sectionTheme("편안함을 느끼는 방식", "친밀감은 두 숙이 긴장을 내려놓는 조건에서 만들어집니다.", "함께 있어도 꾸미지 않아도 된다고 느낄 때 관계가 깊어집니다.", "편안함을 무심함으로 착각하면 애정 표현이 줄어들 수 있습니다.", "편안한 순간에도 짧은 애정 표현을 남기세요.", "편해서 말이 줄어도 마음은 계속 표현하고 싶어.", "편안했던 순간과 애정 표현이 필요했던 순간을 구분합니다.", "편안함은 달빛이 방 안에 조용히 스며드는 것과 같습니다.", ["편안함", "친밀감", "애정 표현"]),
    sectionTheme("스킨십과 애정 온도", "스킨십 궁합은 친밀감의 속도와 경계 존중을 함께 봐야 합니다.", "한쪽은 접촉으로 안정감을 느끼고, 다른 쪽은 분위기와 신뢰가 먼저 필요할 수 있습니다.", "스킨십 속도를 맞추지 않으면 한쪽은 거절감, 다른 쪽은 압박을 느낍니다.", "좋은 접촉, 불편한 접촉, 필요한 분위기를 솔직히 나누세요.", "나는 이런 애정 표현이 편하고, 이런 방식은 천천히 가고 싶어.", "편한 표현, 불편한 표현, 회복 표현을 각각 정합니다.", "몸의 거리는 마음의 문과 이어져 있으니 달빛처럼 부드럽게 다가가야 합니다.", ["스킨십", "애정 온도", "경계"]),
    sectionTheme("사랑받는다고 느끼는 순간", "사랑받는 순간은 각 숙이 안정감을 확인하는 핵심 증거입니다.", "한쪽은 말에서, 다른 쪽은 반복 행동이나 우선순위에서 사랑을 느낄 수 있습니다.", "상대가 원하는 증거를 모르면 많이 사랑해도 적게 전달됩니다.", "각자가 사랑받는다고 느끼는 순간을 구체적으로 공유하세요.", "나는 이런 순간에 사랑받는다고 느껴. 너는 언제 그래?", "사랑받는 순간 세 가지와 이번 주 실천 하나를 정합니다.", "사랑은 달빛처럼 같은 곳에 내려도 각자의 마음에 다른 무늬를 남깁니다.", ["사랑받는 순간", "안정감", "증거"]),
    sectionTheme("거절감과 거리감", "거절감은 실제 거절보다 해석의 상처에서 커질 수 있습니다.", "상대가 피곤해서 물러난 행동도 내게는 사랑이 식은 신호처럼 느껴질 수 있습니다.", "거절감을 바로 공격으로 바꾸면 친밀감이 더 닫힙니다.", "거절감을 느낀 순간에는 사실과 느낌을 분리해 말하세요.", "네가 나를 거절했다기보다 내가 그렇게 느껴져서 확인하고 싶어.", "거절로 느낀 장면, 실제 사실, 확인 문장을 적습니다.", "달빛은 닫힌 문 앞에서도 부드럽게 머물며, 두드릴 시간을 알려줍니다.", ["거절감", "거리감", "사실 확인"]),
    sectionTheme("친밀감 회복법", "친밀감 회복은 큰 이벤트보다 안전한 반복 접촉에서 시작됩니다.", "상처 이후에는 바로 예전처럼 가까워지기보다 작은 신뢰를 다시 쌓아야 합니다.", "회복 속도를 재촉하면 친밀감이 의무처럼 느껴질 수 있습니다.", "가벼운 대화, 짧은 만남, 작은 애정 표현부터 회복하세요.", "예전처럼 바로 돌아가려 하기보다 작은 것부터 다시 해보자.", "짧은 산책, 부담 없는 메시지, 고마움 표현을 반복합니다.", "친밀감은 달빛에 젖은 물처럼 천천히 다시 차오릅니다.", ["친밀감 회복", "작은 신뢰", "회복 속도"]),
  ],
  14: [
    sectionTheme("전생 인연처럼 느껴지는 이유", "전생감은 숙요의 강한 각인과 반복 감정이 결합될 때 생깁니다.", "처음부터 설명하기 어려운 익숙함이나 운명적 끌림을 느낄 수 있습니다.", "전생감에 취하면 현재의 책임과 선택을 흐릴 수 있습니다.", "운명처럼 느껴져도 현재 행동으로 관계를 판단하세요.", "운명처럼 느껴지는 마음은 인정하되 지금 우리가 하는 행동도 보자.", "운명감, 현실 행동, 책임 신호를 나누어 점검합니다.", "전생의 달빛은 기억이 아니라 현재를 더 선명히 보라는 신호입니다.", ["전생 인연", "운명감", "현재 행동"]),
    sectionTheme("반복해서 끌리는 감정", "반복 끌림은 미해결 과제와 강한 보완 욕구가 겹칠 때 나타납니다.", "멀어져도 다시 생각나고, 상처가 있어도 쉽게 끊기지 않는 감정이 남을 수 있습니다.", "반복 끌림을 무조건 사랑으로 해석하면 상처의 원인을 놓칩니다.", "끌림과 치유 과제를 분리해 보세요.", "내가 끌리는 건 사랑인지, 풀고 싶은 감정인지 같이 보고 싶어.", "끌림의 이유, 상처의 이유, 다시 선택할 조건을 정리합니다.", "반복되는 끌림은 달의 주기처럼 돌아오지만, 매번 같은 선택을 요구하지는 않습니다.", ["반복 끌림", "미해결 과제", "상처"]),
    sectionTheme("서로에게 남기는 숙제", "카르마적 숙제는 상대를 통해 내가 배워야 할 관계 태도입니다.", "한 사람은 기다림을, 다른 한 사람은 표현을 배우는 식의 과제가 생길 수 있습니다.", "숙제를 상대 탓으로 돌리면 인연의 성장 의미가 사라집니다.", "서로에게 배워야 할 태도를 하나씩 인정하세요.", "네가 나에게 남긴 숙제가 뭔지 생각해봤어.", "내 숙제, 상대의 숙제, 함께 풀 숙제를 나누어 적습니다.", "이 인연의 숙제는 벌이 아니라 별이 건네는 성장의 문장입니다.", ["숙제", "카르마", "성장"]),
    sectionTheme("관계가 주는 성장 의미", "성장 의미는 이 관계가 나의 감정 습관을 어떻게 바꾸는지에 있습니다.", "두 사람은 서로를 통해 사랑의 속도, 경계, 책임을 다시 배우게 됩니다.", "성장이라는 말로 상처를 정당화하면 관계가 왜곡됩니다.", "성장은 상처를 참는 것이 아니라 더 좋은 선택을 배우는 것입니다.", "이 관계가 나를 어떻게 바꾸고 있는지 솔직히 말해보자.", "배운 점, 아픈 점, 앞으로 지킬 기준을 정리합니다.", "달빛은 상처를 아름답게 포장하지 않고, 그 상처에서 자란 힘을 비춥니다.", ["성장 의미", "경계", "책임"]),
    sectionTheme("이어가거나 마무리하는 법", "카르마 인연은 이어갈 때도 마무리할 때도 의식적인 선택이 필요합니다.", "이어가려면 반복 문제를 행동으로 바꾸고, 마무리하려면 미련과 책임을 분리해야 합니다.", "흐릿한 상태로 붙잡으면 인연이 길어져도 성숙해지지 않습니다.", "이어갈 기준과 놓아줄 기준을 각각 분명히 쓰세요.", "우리가 이어갈 조건과 멈춰야 할 기준을 솔직히 정하자.", "이어갈 조건, 마무리 조건, 마지막 대화의 원칙을 정합니다.", "달빛은 만남도 이별도 같은 하늘 아래 놓고, 가장 성숙한 길을 고르게 합니다.", ["이어가기", "마무리", "선택 기준"]),
  ],
  15: [
    sectionTheme("최종 핵심 메시지", "최종 전략은 본명숙, 관계 유형, 거리, 현실 조건을 하나의 결론으로 묶습니다.", "이 관계는 강한 끌림과 조율 과제가 함께 있으므로 감정보다 운영 기준이 중요합니다.", "최종 메시지를 낭만적 결론으로만 받아들이면 실행력이 떨어집니다.", "관계의 결론은 좋다/나쁘다가 아니라 어떻게 운영할 것인가로 잡으세요.", "우리 관계를 한 문장으로 정리하고, 그 문장을 지킬 행동을 정하자.", "최종 문장, 핵심 위험, 첫 실행을 한 줄씩 씁니다.", "마지막 장의 달빛은 결론보다 선택의 책임을 비춥니다.", ["최종 메시지", "운영 기준", "첫 실행"]),
    sectionTheme("지금 먼저 해야 할 일", "가장 먼저 할 일은 관계의 가장 약한 연결고리를 바로잡는 것입니다.", "두 사람에게 지금 필요한 것은 큰 약속보다 당장 반복되는 불안을 줄이는 행동입니다.", "먼저 할 일을 너무 많이 잡으면 아무것도 변하지 않습니다.", "오늘 안에 할 수 있는 한 가지 행동만 정하세요.", "오늘 우리가 바로 바꿀 한 가지를 정하자.", "오늘 행동, 이번 주 확인, 다음 대화 날짜를 정합니다.", "달빛은 먼 미래보다 오늘 밤 놓치지 말아야 할 작은 길을 먼저 비춥니다.", ["먼저 해야 할 일", "오늘 행동", "이번 주 확인"]),
    sectionTheme("관계를 망치는 행동", "망치는 행동은 관계 유형의 그림자를 반복해서 자극하는 행동입니다.", "단정, 침묵 방치, 과거 소환, 책임 회피가 관계 체력을 빠르게 깎습니다.", "망치는 행동을 알면서도 예외로 두면 신뢰가 회복되기 어렵습니다.", "두 사람이 절대 하지 않을 행동 세 가지를 정하세요.", "우리 관계에서 금지할 행동을 서로 하나씩 말하자.", "금지 행동, 대체 행동, 어겼을 때 회복 절차를 정합니다.", "달빛은 피해야 할 절벽도 보여줍니다. 보았다면 멈춰야 합니다.", ["망치는 행동", "금지 행동", "대체 행동"]),
    sectionTheme("관계를 살리는 행동", "살리는 행동은 서로의 숙이 안정감을 느끼는 신호를 반복하는 것입니다.", "짧은 확인, 고마움 표현, 약속 이행, 재대화 약속이 관계를 살립니다.", "좋은 행동도 한 번의 이벤트로 끝나면 신뢰가 쌓이지 않습니다.", "관계를 살리는 행동을 주간 루틴으로 고정하세요.", "우리를 살리는 행동을 이번 주부터 반복해보자.", "고마움, 확인, 약속 이행, 회복 대화를 매주 체크합니다.", "살리는 행동은 작지만, 달빛처럼 매일 쌓이면 길이 됩니다.", ["살리는 행동", "고마움", "약속 이행"]),
    sectionTheme("앞으로의 선택 조언", "앞으로의 선택은 끌림의 크기보다 회복과 성장의 가능성으로 판단해야 합니다.", "두 사람이 같은 문제를 다르게 다룰 준비가 있다면 관계는 더 깊어질 수 있습니다.", "선택을 미루기만 하면 관계가 스스로 좋아지지 않습니다.", "이어갈지 멈출지는 행동 변화가 실제로 반복되는지 보고 정하세요.", "우리의 선택은 말이 아니라 앞으로 한 달의 행동을 보고 정하자.", "한 달 관찰 기준, 변화 확인, 다음 선택 시점을 정합니다.", "달빛은 선택을 대신하지 않습니다. 다만 가장 진실한 길을 조용히 드러냅니다.", ["선택 조언", "행동 변화", "한 달 관찰"]),
  ],
});

function resolveSukyoChapterNo(chapter = {}) {
  const direct = safeNumber(chapter?.order || chapter?.chapterNo, 0);
  if (direct > 0) return direct;
  const key = text(chapter?.key);
  const found = SUKYO_PDF_CHAPTERS.find((item) => item.key === key);
  return safeNumber(found?.order, 0);
}

function resolveSukyoSectionIndex(chapterNo, section = {}) {
  const heading = text(section?.heading || section?.title);
  const spec = SUKYO_PDF_CHAPTERS[chapterNo - 1];
  const index = safeArray(spec?.sections).findIndex((item) => text(item) === heading);
  return index >= 0 ? index : 0;
}

function resolveSukyoSectionTheme(chapterNo, sectionIndex, sectionHeading = "") {
  const chapterThemes = SUKYO_SECTION_COUNSELING_MATRIX[chapterNo] || [];
  const theme = chapterThemes[sectionIndex] || null;
  if (theme) return theme;
  return sectionTheme(
    text(sectionHeading, "관계 세부 흐름"),
    "본명숙, 상대숙, 관계 유형, 거리감을 함께 놓고 세부 상담 포인트를 읽습니다.",
    "두 사람의 관계는 이 세부 항목에서 서로 다른 속도와 기대를 드러냅니다.",
    "세부 흐름을 확인하지 않으면 같은 문제가 다른 이름으로 반복될 수 있습니다.",
    "감정, 사실, 다음 행동을 나누어 합의하세요.",
    "이 부분에서 우리가 다르게 느끼는 지점을 같이 확인하자.",
    "이번 주 안에 한 가지 관찰과 한 가지 행동 수정을 진행합니다.",
    "달빛은 작은 항목 안에서도 인연의 방향을 비춥니다.",
    [text(sectionHeading, "세부 흐름"), "관계", "합의"],
  );
}

function stripSukyoChapterTitle(value) {
  return text(value).replace(/^제\s*\d+\s*장\.?\s*/, "").trim();
}

function hasHangulFinalConsonant(value) {
  const chars = Array.from(text(value).replace(/\s+/g, ""));
  const last = chars[chars.length - 1] || "";
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return true;
  return ((code - 0xac00) % 28) !== 0;
}

function topicParticle(value) {
  return hasHangulFinalConsonant(value) ? "은" : "는";
}

function objectParticle(value) {
  return hasHangulFinalConsonant(value) ? "을" : "를";
}

function withParticle(value) {
  return hasHangulFinalConsonant(value) ? "과" : "와";
}

function topicPhrase(value, fallback = "") {
  const clause = sentenceClause(value || fallback);
  return clause ? `${clause}${topicParticle(clause)}` : "";
}

function objectPhrase(value, fallback = "") {
  const clause = sentenceClause(value || fallback);
  return clause ? `${clause}${objectParticle(clause)}` : "";
}

function withPhrase(value, fallback = "") {
  const clause = sentenceClause(value || fallback);
  return clause ? `${clause}${withParticle(clause)}` : "";
}

function sentenceClause(value) {
  return sanitizeSukyoPremiumText(value).replace(/[.!?。？！]+$/g, "");
}

const RELATION_MASTER_GUIDE = Object.freeze({
  안괴: {
    diagnosis: "강한 끌림과 불안이 함께 작동해 보호와 파괴가 빠르게 교차합니다.",
    caution: "감정이 과열된 상태에서 결론을 내리면 상처가 누적됩니다.",
    prescription: "감정 폭발 이후 30분 이상 쿨다운 후 대화를 재개하는 회복 규칙이 필수입니다.",
  },
  영친: {
    diagnosis: "안정감과 친밀감이 크고 장기 관계 기반을 만들기 유리합니다.",
    caution: "편안함에만 머무르면 핵심 갈등을 미루게 됩니다.",
    prescription: "주 1회 관계 점검 대화를 통해 성장 과제를 함께 확인하세요.",
  },
  업태: {
    diagnosis: "카르마적 과제와 성장 압력이 반복되는 관계입니다.",
    caution: "같은 숙제를 감정으로만 처리하면 피로가 급격히 커집니다.",
    prescription: "갈등 주제를 감정과 과제로 분리해 기록하고 재합의 주기를 고정하세요.",
  },
  우쇠: {
    diagnosis: "정서 교류가 섬세해 따뜻하지만 누적 피로에 민감합니다.",
    caution: "사소한 서운함이 쌓이면 갑작스러운 거리감으로 체감됩니다.",
    prescription: "짧은 확인 대화를 자주 두어 오해를 당일 정리하는 습관이 중요합니다.",
  },
  위성: {
    diagnosis: "목표 지향성이 높아 현실 성과를 만들기 좋지만 긴장이 쉽게 올라갑니다.",
    caution: "성과 중심 대화만 반복되면 감정 결핍이 쌓입니다.",
    prescription: "성과 회의 전에 감정 상태를 먼저 공유하는 순서를 고정하세요.",
  },
  명: {
    diagnosis: "거울처럼 닮은 패턴이 강해 동질감과 반복 패턴이 동시에 나타납니다.",
    caution: "서로의 약한 지점을 비슷한 방식으로 건드리면 갈등이 장기화됩니다.",
    prescription: "같은 약점을 다르게 다루는 역할 규칙을 명시해 반복 고리를 끊으세요.",
  },
  기본: {
    diagnosis: "서로의 감정 리듬이 다르므로 운영 규칙이 관계의 품질을 결정합니다.",
    caution: "해석 차이를 방치하면 작은 오해가 큰 거리감으로 증폭됩니다.",
    prescription: "연락-갈등-화해의 순서를 합의해 감정 회복 속도를 높이세요.",
  },
});

const DISTANCE_MASTER_GUIDE = Object.freeze({
  same: {
    diagnosis: "동숙은 닮은 감정 패턴이 빠르게 공명해 편안함과 반복 습관이 동시에 커집니다.",
    prescription: "닮은 반응을 그대로 반복하지 않도록 역할과 멈춤 신호를 의식적으로 나누세요.",
  },
  near: {
    diagnosis: "근거리에서는 빠르게 가까워지고 빠르게 상처받는 특성이 강합니다.",
    prescription: "감정이 과열되기 전 멈춤 신호와 재대화 시점을 미리 정하세요.",
  },
  middle: {
    diagnosis: "중거리는 조율의 질이 관계 안정성을 결정합니다.",
    prescription: "주간 점검 루틴으로 기대치와 감정 체온을 맞추는 것이 핵심입니다.",
  },
  far: {
    diagnosis: "원거리는 자율성과 공백 관리가 핵심 과제입니다.",
    prescription: "연락 리듬과 공백 허용 범위를 합의해 해석 오차를 줄이세요.",
  },
  special: {
    diagnosis: "특수관계는 일반적인 거리보다 인연의 과제와 역할 전환이 더 선명하게 작동합니다.",
    prescription: "끌림의 강도보다 반복 과제를 어떻게 다룰지 먼저 정하세요.",
  },
  unknown: {
    diagnosis: "거리 기준이 불명확하면 기대치 충돌이 잦아질 수 있습니다.",
    prescription: "초기 2주간 기본 연락 규칙을 먼저 합의해 기준을 세우세요.",
  },
});

function selectRelationMasterGuide(relationType) {
  const token = text(relationType);
  if (token.includes("안괴")) return RELATION_MASTER_GUIDE.안괴;
  if (token.includes("영친")) return RELATION_MASTER_GUIDE.영친;
  if (token.includes("업태")) return RELATION_MASTER_GUIDE.업태;
  if (token.includes("우쇠")) return RELATION_MASTER_GUIDE.우쇠;
  if (token.includes("위성")) return RELATION_MASTER_GUIDE.위성;
  if (token.includes("명")) return RELATION_MASTER_GUIDE.명;
  return RELATION_MASTER_GUIDE.기본;
}

function scoreBandLabel(score, highLabel, middleLabel, lowLabel) {
  const n = safeNumber(score, 0);
  if (n >= 78) return highLabel;
  if (n >= 58) return middleLabel;
  return lowLabel;
}

function pickFirst(values, fallback) {
  const found = safeArray(values).map((item) => text(item)).find(Boolean);
  return found || fallback;
}

function firstCounselSentence(value) {
  const sentences = splitMeaningfulSentences(value);
  return sentenceClause(sentences[0] || value);
}

function stripRoleCodePrefix(value) {
  return sentenceClause(value)
    .replace(/^[AB]\(([^)]+)\)(?:은|는)\s*/u, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function actionPrincipleClause(value, fallback = "감정을 짧게 정리하는 것") {
  let clause = stripRoleCodePrefix(firstCounselSentence(value)) || fallback;
  clause = clause
    .replace(/이 중요합니다$/u, "이 중요한 것")
    .replace(/이 핵심입니다$/u, "이 핵심인 것")
    .replace(/이 필수입니다$/u, "이 필수인 것")
    .replace(/입니다$/u, "인 것")
    .replace(/하세요$/u, "하는 것")
    .replace(/하십시오$/u, "하는 것")
    .replace(/합니다$/u, "하는 것")
    .replace(/한다$/u, "하는 것")
    .replace(/다$/u, "는 것")
    .trim();
  return clause || fallback;
}

function humanizeElementSummary(value, selfName, partnerName) {
  const clause = sentenceClause(value);
  const matched = clause.match(/^A\s+([목화토금수])\s+·\s+B\s+([목화토금수])의\s+(.+?)\s+흐름\s+\((\d+)점\)$/u);
  if (matched) {
    return `${selfName}의 ${matched[1]} 기운과 ${partnerName}의 ${matched[2]} 기운이 ${matched[3]}으로 이어지며, 조화 점수는 ${matched[4]}점입니다`;
  }
  return clause
    .replace(/\bA\s+/gu, `${selfName}의 `)
    .replace(/\bB\s+/gu, `${partnerName}의 `)
    .replace(/\s{2,}/g, " ")
    .trim();
}

function completeSentence(value) {
  const clause = sentenceClause(value);
  return clause ? `${clause}.` : "";
}

function buildFocusAxis(sectionHeading, axis) {
  const heading = text(sectionHeading);
  const focus = text(axis, heading || "관계 흐름");
  const normalizedHeading = normalizeKoreanText(heading).replace(/\s+/g, "");
  const normalizedFocus = normalizeKoreanText(focus).replace(/\s+/g, "");
  if (heading && normalizedHeading && normalizedFocus) {
    if (normalizedHeading.includes("먼저해야할일") && normalizedFocus.includes("먼저해야할일")) return "첫 실행 우선순위";
    if (normalizedHeading.includes("최종핵심메시지") && normalizedFocus.includes("최종핵심메시지")) return "최종 판단 기준";
    if (normalizedHeading === normalizedFocus || normalizedHeading.includes(normalizedFocus) || normalizedFocus.includes(normalizedHeading)) {
      return `${focus}의 상담 축`;
    }
  }
  return focus;
}

function buildScoreSignal(sectionHeading, relationScore, emotional, communication, context = {}) {
  const chapterNo = safeNumber(context.chapterNo, 0);
  const sectionIndex = safeNumber(context.sectionIndex, 0);
  if (!shouldUseScoreSignal(chapterNo, sectionIndex)) return "";
  const variants = [
    `${sectionHeading}에서는 관계 체력 ${relationScore}점, 마음의 반응 ${emotional}점, 말의 전달력 ${communication}점을 함께 보아야 합니다.`,
    `${sectionHeading}의 수치 흐름은 끌림 ${relationScore}점, 정서 반응 ${emotional}점, 대화 안정성 ${communication}점으로 갈라집니다.`,
    `${sectionHeading}에서 ${relationScore}점은 인연의 기본 바탕이고, ${emotional}점은 마음의 속도, ${communication}점은 오해가 생기는 통로입니다.`,
  ];
  return variants[Math.abs(chapterNo + sectionIndex) % variants.length];
}

function buildRiskSignal(conflictRisk, longTermPotential, recoveryPotential, context = {}) {
  const chapterNo = safeNumber(context.chapterNo, 0);
  const sectionIndex = safeNumber(context.sectionIndex, 0);
  const sectionHeading = sanitizeSukyoPremiumText(context.sectionHeading || "이 흐름");
  if (!shouldUseRiskSignal(chapterNo, sectionIndex)) {
    return `${sectionHeading}에서는 조심할 신호를 숫자보다 반복되는 장면의 강도로 읽어야 합니다.`;
  }
  const variants = [
    `${sectionHeading}의 갈등 온도 ${conflictRisk}점, 지속 체력 ${longTermPotential}점, 회복 탄력 ${recoveryPotential}점이 서로 다른 속도로 움직입니다.`,
    `${sectionHeading}에서 상처가 커지는 민감도는 ${conflictRisk}점이고, 오래 버티는 힘 ${longTermPotential}점과 다시 돌아오는 힘 ${recoveryPotential}점을 함께 보아야 합니다.`,
    `${sectionHeading} 흐름은 부딪힘 ${conflictRisk}점, 미래 체력 ${longTermPotential}점, 화해 여지 ${recoveryPotential}점의 균형으로 읽힙니다.`,
    `${sectionHeading}의 반복 갈등은 ${conflictRisk}점대에서 올라오고, 관계를 붙드는 힘은 ${longTermPotential}점, 다시 풀어내는 힘은 ${recoveryPotential}점으로 나타납니다.`,
    `${sectionHeading}의 위험 신호는 ${conflictRisk}점으로 감지되며, 장기 흐름 ${longTermPotential}점과 회복 흐름 ${recoveryPotential}점이 이를 얼마나 받아내는지가 관건입니다.`,
  ];
  return variants[Math.abs(chapterNo * 2 + sectionIndex) % variants.length];
}

function shouldUseScoreSignal(chapterNo, sectionIndex) {
  const scoreSlots = {
    1: [0],
    4: [0],
    5: [0],
    9: [0],
    10: [1],
    11: [0],
    15: [0],
  };
  return safeArray(scoreSlots[chapterNo]).includes(sectionIndex);
}

function shouldUseRiskSignal(chapterNo, sectionIndex) {
  const riskSlots = {
    9: [0, 2],
    10: [1],
    11: [2],
    14: [0],
    15: [2],
  };
  return safeArray(riskSlots[chapterNo]).includes(sectionIndex);
}

function shouldUseSevenDayRoutine(chapterNo, sectionIndex) {
  return chapterNo === 15 && sectionIndex === 1;
}

function buildFinalStrategyLine(chapterNo, sectionIndex) {
  if (chapterNo !== 15) return "";
  return CHAPTER_15_FINAL_STRATEGY[sectionIndex] || CHAPTER_15_FINAL_STRATEGY[0];
}

function chapterContextLens(chapterNo) {
  return CHAPTER_CONTEXT_LENS[chapterNo] || CHAPTER_CONTEXT_LENS[1];
}

function relationToneKey(relationType) {
  const token = text(relationType);
  if (token.includes("안괴")) return "안괴";
  if (token.includes("영친")) return "영친";
  if (token.includes("업태")) return "업태";
  if (token.includes("우쇠")) return "우쇠";
  if (token.includes("위성")) return "위성";
  if (token.includes("명")) return "명";
  return "기본";
}

function relationContextTone(relationType) {
  return RELATION_CONTEXT_TONE[relationToneKey(relationType)] || RELATION_CONTEXT_TONE.기본;
}

function distanceContextTone(distanceLabel) {
  return DISTANCE_CONTEXT_TONE[toDistanceTier(distanceLabel)] || DISTANCE_CONTEXT_TONE.unknown;
}

function removeFrameLead(value) {
  return sentenceClause(value)
    .replace(/^판단\s*근거는\s*/u, "")
    .replace(/^현실에서는\s*/u, "")
    .replace(/^상담\s*처방은\s*/u, "")
    .replace(/^이\s*장의\s*달빛은\s*/u, "")
    .replace(/인지입니다$/u, "인지 확인하는 데 있습니다")
    .replace(/유무입니다$/u, "유무를 확인하는 데 있습니다")
    .replace(/현실성입니다$/u, "현실성을 확인하는 데 있습니다")
    .replace(/차이입니다$/u, "차이를 확인하는 데 있습니다")
    .trim();
}

function frameBridge(frame = {}, key, context = {}) {
  const chapterNo = safeNumber(context.chapterNo, 0);
  const sectionIndex = safeNumber(context.sectionIndex, 0);
  const sectionHeading = sanitizeSukyoPremiumText(context.sectionHeading || "이 항목");
  const sectionAxis = sanitizeSukyoPremiumText(context.sectionAxis || sectionHeading);
  const clause = removeFrameLead(frame[key] || "");
  if (!clause) return "";
  const variants = {
    evidence: [
      `${sectionHeading}에서는 ${clause}.`,
      `${objectPhrase(sectionAxis)} 읽을 때 먼저 보아야 할 흐름은 ${clause}.`,
      `${objectPhrase(sectionHeading)} 깊게 보면 ${clause}.`,
    ],
    reality: [
      `${sectionHeading}의 실제 장면에서는 ${clause}.`,
      `두 사람의 일상에서 ${sectionHeading}${topicParticle(sectionHeading)} ${clause}.`,
      `${sectionAxis}이 현실로 드러날 때는 ${clause}.`,
    ],
    prescription: [
      `${sectionHeading}에서 두 사람이 붙잡아야 할 기준은 ${clause}.`,
      `${objectPhrase(sectionAxis)} 안정시키려면 ${clause}.`,
      `${sectionHeading}에서 실제로 바꿔야 할 흐름은 ${clause}.`,
    ],
    moon: [
      `${sectionHeading}의 달빛은 ${clause}.`,
      `${sectionAxis} 뒤에 남는 달빛은 ${clause}.`,
      `밤의 조언으로 옮기면 ${sectionHeading}${topicParticle(sectionHeading)} ${clause}.`,
    ],
  };
  const list = variants[key] || [`${sectionHeading}에서는 ${clause}.`];
  return list[Math.abs(chapterNo + sectionIndex) % list.length];
}

function buildRelationChapterInsight(relationType, chapterNo, sectionHeading, context = {}) {
  const sectionIndex = safeNumber(context.sectionIndex, 0);
  const lens = chapterContextLens(chapterNo);
  const tone = relationContextTone(relationType);
  const variants = [
    `${relationType} 관계의 ${topicPhrase(tone.force)} ${sectionHeading}에서 ${objectPhrase(lens.relation)} 먼저 건드립니다. ${topicPhrase(tone.risk)} 보이면 ${objectPhrase(lens.practice)} 조율의 첫 단추로 삼아야 합니다.`,
    `${sectionHeading}에서 ${relationType}의 힘은 ${tone.force}으로 나타나며, ${objectPhrase(lens.relation)} 깊게 흔듭니다. ${sectionHeading}의 처방은 ${tone.medicine}에서 시작됩니다.`,
    `${relationType} 궁합은 ${sectionHeading}을 통해 ${objectPhrase(tone.risk)} 선명하게 보여줍니다. ${objectPhrase(lens.practice)} 놓치지 않을 때 ${topicPhrase(tone.force)} 안정된 방향으로 바뀝니다.`,
  ];
  return variants[Math.abs(chapterNo + sectionIndex) % variants.length];
}

function buildDistanceChapterInsight(distanceLabel, chapterNo, sectionHeading, context = {}) {
  const sectionIndex = safeNumber(context.sectionIndex, 0);
  const lens = chapterContextLens(chapterNo);
  const tone = distanceContextTone(distanceLabel);
  const variants = [
    `${distanceLabel}의 거리감은 ${sectionHeading}에서 ${tone.force}으로 체감됩니다. ${objectPhrase(lens.distance)} 놓치면 ${topicPhrase(tone.risk)} 커지므로 ${tone.medicine}이 필요합니다.`,
    `${sectionHeading}에서는 ${distanceLabel} 특유의 ${tone.force}이 먼저 닿습니다. ${topicPhrase(lens.distance)} 흔들릴 때는 ${objectPhrase(tone.medicine)} 실제 약속으로 바꾸어야 합니다.`,
    `${distanceLabel} 궁합은 ${sectionHeading}에서 간격 관리가 핵심입니다. ${topicPhrase(tone.risk)} 보이면 ${objectPhrase(lens.distance)} 다시 맞추는 대화가 필요합니다.`,
  ];
  return variants[Math.abs(chapterNo * 3 + sectionIndex) % variants.length];
}

function resolveChapterCounselingFrame(chapterNo) {
  return CHAPTER_COUNSELING_FRAME[chapterNo] || {
    entry: "이 장에서는 두 사람의 본명숙, 관계 유형, 거리감을 함께 놓고 실제 상담 흐름을 읽습니다.",
    evidence: "판단 근거는 반복되는 감정 신호와 현실에서 확인 가능한 행동입니다.",
    reality: "현실에서는 좋은 해석보다 두 사람이 같은 기준으로 움직이는 힘이 중요합니다.",
    caution: "세부 흐름을 확인하지 않으면 같은 문제가 다른 이름으로 반복될 수 있습니다.",
    prescription: "상담 처방은 감정, 사실, 다음 행동을 나누어 합의하는 것입니다.",
    moon: "이 장의 달빛은 작은 항목 안에서도 인연의 방향을 비춥니다.",
  };
}

function buildSectionOpening(context = {}) {
  const chapterNo = safeNumber(context.chapterNo, 0);
  const sectionIndex = safeNumber(context.sectionIndex, 0);
  const chapterTitle = sanitizeSukyoPremiumText(stripSukyoChapterTitle(context.chapterTitle || ""));
  const sectionHeading = sanitizeSukyoPremiumText(context.sectionHeading || "");
  const selfName = sanitizeSukyoPremiumText(context.selfName || "당신");
  const partnerName = sanitizeSukyoPremiumText(context.partnerName || "상대");
  const selfStar = sanitizeSukyoPremiumText(context.selfStar || "본명숙");
  const partnerStar = sanitizeSukyoPremiumText(context.partnerStar || "상대숙");
  const relationType = sanitizeSukyoPremiumText(context.relationType || "관계");
  const distanceLabel = sanitizeSukyoPremiumText(context.distanceLabel || "거리");
  const sectionAxis = sanitizeSukyoPremiumText(context.sectionAxis || sectionHeading);
  const frame = resolveChapterCounselingFrame(chapterNo);
  const evidenceLine = frameBridge(frame, "evidence", { chapterNo, sectionIndex, sectionHeading, sectionAxis });
  const realityLine = frameBridge(frame, "reality", { chapterNo, sectionIndex, sectionHeading, sectionAxis });
  const prescriptionLine = frameBridge(frame, "prescription", { chapterNo, sectionIndex, sectionHeading, sectionAxis });
  const variants = [
    `${frame.entry} ${topicPhrase(sectionHeading)} ${selfName} ${selfStar}宿과 ${partnerName} ${partnerStar}宿이 ${relationType} 흐름을 어떻게 나누어 갖는지 보여줍니다.`,
    `${evidenceLine} ${objectPhrase(sectionHeading)} ${chapterTitle} 안에서 읽을 때는 ${distanceLabel}의 속도와 ${sectionAxis}의 방향을 함께 보아야 합니다.`,
    `${selfName}${withParticle(selfName)} ${partnerName} 사이에서 ${topicPhrase(sectionHeading)} ${relationType} 관계가 실제로 움직이는 방향을 보여줍니다.`,
    `${realityLine} ${topicPhrase(sectionHeading)} ${selfStar}宿의 반응과 ${partnerStar}宿의 수용 방식이 만나는 자리입니다.`,
    `${prescriptionLine} ${topicPhrase(sectionHeading)} 별의 해석이 두 사람의 실제 행동으로 내려오는 자리입니다.`,
  ];
  return variants[Math.abs(chapterNo + sectionIndex) % variants.length];
}

function buildChapterToneSectionBody(context = {}, blocks = {}) {
  const chapterNo = safeNumber(context.chapterNo, 0);
  const sectionIndex = safeNumber(context.sectionIndex, 0);
  const sectionHeading = sanitizeSukyoPremiumText(context.sectionHeading || "");
  const selfName = sanitizeSukyoPremiumText(context.selfName || "당신");
  const partnerName = sanitizeSukyoPremiumText(context.partnerName || "상대");
  const frame = resolveChapterCounselingFrame(chapterNo);
  const sectionProfile = context.writingProfile || resolveSectionWritingProfile(chapterNo, sectionIndex);
  const opening = buildSectionOpening(context);
  const core = sanitizeSukyoPremiumText(blocks.coreDiagnosis || "");
  const insight = sanitizeSukyoPremiumText(blocks.masterInsight || "");
  const manifestation = sanitizeSukyoPremiumText(blocks.manifestation || "");
  const caution = sanitizeSukyoPremiumText(blocks.caution || "");
  const prescription = sanitizeSukyoPremiumText(blocks.prescription || "");
  const dialogue = sanitizeSukyoPremiumText(blocks.dialogueExample || "");
  const weeklyRoutine = sanitizeSukyoPremiumText(blocks.weeklyRoutine || "");
  const moonPrescription = sanitizeSukyoPremiumText(blocks.moonPrescription || "");
  const sectionAxis = sanitizeSukyoPremiumText(context.sectionAxis || sectionHeading);
  const evidenceLine = frameBridge(frame, "evidence", { chapterNo, sectionIndex, sectionHeading, sectionAxis });
  const realityLine = frameBridge(frame, "reality", { chapterNo, sectionIndex, sectionHeading, sectionAxis });
  const cautionLine = sanitizeSukyoPremiumText(frame.caution || "");
  const prescriptionLine = frameBridge(frame, "prescription", { chapterNo, sectionIndex, sectionHeading, sectionAxis });
  const moonLine = frameBridge(frame, "moon", { chapterNo, sectionIndex, sectionHeading, sectionAxis });
  const finalStrategyLine = sectionProfile.finalStrategy ? buildFinalStrategyLine(chapterNo, sectionIndex) : "";
  const realityLeads = [
    `${realityLine} ${selfName}${withParticle(selfName)} ${partnerName} 사이에서는 ${topicPhrase(sectionHeading)} 감정 신호와 행동 선택이 함께 움직입니다.`,
    `${sectionAxis}이 실제 일상에 닿으면 ${selfName}${withParticle(selfName)} ${partnerName}의 반응 차이가 말투와 회복 속도로 나타납니다.`,
    `${sectionHeading}의 현실 장면에서는 두 사람의 기대, 침묵, 확인 방식이 관계 체력을 결정합니다.`,
  ];
  const paragraphs = [
    [finalStrategyLine, opening, core].filter(Boolean).join(" "),
    sectionProfile.evidence ? [evidenceLine, insight].filter(Boolean).join(" ") : insight,
    sectionProfile.reality ? [realityLeads[Math.abs(chapterNo + sectionIndex) % realityLeads.length], manifestation].filter(Boolean).join(" ") : "",
    sectionProfile.caution ? [cautionLine, caution].filter(Boolean).join(" ") : "",
    sectionProfile.prescription ? [prescriptionLine, prescription].filter(Boolean).join(" ") : "",
    sectionProfile.dialogue ? dialogue : "",
    sectionProfile.routine ? weeklyRoutine : "",
    sectionProfile.moon ? [moonLine, moonPrescription].filter(Boolean).join(" ") : "",
  ];
  return paragraphs.map((part) => sanitizeSukyoPremiumText(part)).filter(Boolean).join("\n\n");
}

function buildSectionBody(localJson, chapter, sectionHeading, sectionIndex) {
  const chapterNo = safeNumber(chapter?.order || chapter?.chapterNo, 0);
  const sectionTag = `${chapterNo}장 ${sectionHeading}`;
  const selfName = text(localJson?.input?.self?.name, "당신");
  const partnerName = text(localJson?.input?.partner?.name, "상대");
  const selfStar = text(localJson?.self?.sukuyoStar, "본명숙");
  const partnerStar = text(localJson?.partner?.sukuyoStar, "상대숙");
  const relationType = text(localJson?.relation?.typeKo || localJson?.relation?.type, "관계");
  const relationTheme = text(localJson?.relation?.relationTheme, "강한 끌림과 조율 과제가 공존하는 결");
  const distanceLabel = displayDistanceLabel(localJson?.relation?.distanceLabel || localJson?.relation?.distance || "중거리");
  const selfProfile = localJson?.self?.profile || { love: `${selfName}은 상대의 감정 신호를 세심하게 읽으며 애정을 표현합니다.` };
  const partnerProfile = localJson?.partner?.profile || { love: `${partnerName}은 안정감을 확인한 뒤 애정 표현을 넓혀 가는 경향이 있습니다.` };
  const chemistry = localJson?.relation?.chemistry || {};
  const emotional = safeNumber(chemistry?.emotional, 58);
  const communication = safeNumber(chemistry?.communication, 55);
  const conflictRisk = safeNumber(chemistry?.conflictRisk, 52);
  const longTermPotential = safeNumber(chemistry?.longTermPotential, 54);
  const recoveryPotential = safeNumber(chemistry?.recoveryPotential, 57);
  const relationScore = safeNumber(localJson?.relation?.score, safeNumber(localJson?.relation?.compatibilityScore, 56));
  const meStrength = text(localJson?.relation?.strengthShadowMap?.me?.strength, "감정 보살핌");
  const meShadow = text(localJson?.relation?.strengthShadowMap?.me?.shadow, "과한 배려로 인한 피로");
  const otherStrength = text(localJson?.relation?.strengthShadowMap?.other?.strength, "현실 감각");
  const otherShadow = text(localJson?.relation?.strengthShadowMap?.other?.shadow, "표현 지연으로 인한 거리감");
  const meActionRaw = text(localJson?.relation?.roleActionGuide?.meAction, "감정을 먼저 짧게 공유한다");
  const otherActionRaw = text(localJson?.relation?.roleActionGuide?.otherAction, "상대의 말을 요약해 확인한 뒤 답한다");
  const resetLineRaw = text(localJson?.relation?.roleActionGuide?.resetLine, "갈등 다음 날 안에 대화의 문을 다시 연다");
  const meAction = actionPrincipleClause(meActionRaw, "감정을 먼저 짧게 공유하는 것");
  const otherAction = actionPrincipleClause(otherActionRaw, "상대의 말을 요약해 확인한 뒤 답하는 것");
  const resetLine = firstCounselSentence(resetLineRaw) || "갈등 다음 날 안에 대화의 문을 다시 여는 것";
  const resetAction = actionPrincipleClause(resetLineRaw, "감정이 올라온 뒤 재대화 시간을 정하는 것");
  const elementSummary = humanizeElementSummary(localJson?.relation?.elementHarmony?.summary, selfName, partnerName)
    || "두 사람의 기질은 조율 규칙을 세울수록 상호 보완성이 커집니다";
  const elementRelation = text(localJson?.relation?.elementHarmony?.relation, "보완");
  const complementSummary = text(localJson?.relation?.strengthShadowMap?.complementSummary, "서로의 강점이 상대의 그림자를 완충합니다.");
  const pastLifeTitle = text(localJson?.relation?.pastLife?.title, "오래된 약속의 인연");
  const pastLifeTask = text(localJson?.relation?.pastLife?.currentTask, "서로의 불안을 탓하지 않고 책임 있는 약속으로 바꾸는 일");
  const pastLifeHealing = text(localJson?.relation?.pastLife?.healingKey, "작은 합의를 반복해 신뢰를 복원하는 일");
  const selfKeyword = pickFirst(localJson?.self?.keywords, "감정의 촉");
  const partnerKeyword = pickFirst(localJson?.partner?.keywords, "관계의 응답");
  const emotionalBand = scoreBandLabel(emotional, "감정 파동이 깊고 빠르게 번지는 고밀도 구간", "감정 교류가 충분하지만 확인 대화가 필요한 중밀도 구간", "감정 표현의 속도 차이를 세심하게 맞춰야 하는 저밀도 구간");
  const communicationBand = scoreBandLabel(communication, "말과 눈치가 동시에 열리는 소통 우세 구간", "표현 순서가 맞을 때 잘 풀리는 조율 구간", "침묵과 추측을 줄여야 하는 소통 보강 구간");
  const riskBand = scoreBandLabel(conflictRisk, "감정 과열을 가장 먼저 다스려야 하는 고위험 구간", "반복 주제만 정리하면 회복되는 관리 구간", "큰 폭발보다 누적 피로를 경계해야 하는 은근한 구간");
  const sectionTheme = resolveSukyoSectionTheme(chapterNo, sectionIndex, sectionHeading);
  const guide = sectionTheme.guides || CHAPTER_TOPIC_GUIDE[chapterNo] || ["관계 핵심", "감정 조율", "갈등 완화", "실행 습관"];
  const requiredTermList = sectionTheme.requiredTerms.join(", ");
  const requiredTermFlow = sectionTheme.requiredTerms.join(" · ");
  const relationMaster = selectRelationMasterGuide(relationType);
  const distanceMaster = DISTANCE_MASTER_GUIDE[toDistanceTier(distanceLabel)] || DISTANCE_MASTER_GUIDE.unknown;
  const focusAxis = buildFocusAxis(sectionHeading, sectionTheme.axis);
  const relationCaution = sentenceClause(relationMaster.caution);
  const relationPrinciple = actionPrincipleClause(relationMaster.prescription, "반복되는 갈등 고리를 끊는 것");
  const distancePrinciple = actionPrincipleClause(distanceMaster.prescription, "두 사람이 편안한 거리 기준을 정하는 것");
  const complementInsight = sentenceClause(complementSummary);
  const complementPoint = complementInsight.replace(/^강점은\s*/u, "강점을 사용할 때는 ");
  const healingAction = actionPrincipleClause(pastLifeHealing, "작은 합의를 반복해 신뢰를 복원하는 것");
  const writingProfile = resolveSectionWritingProfile(chapterNo, sectionIndex);
  const sevenDayRoutine = shouldUseSevenDayRoutine(chapterNo, sectionIndex);
  const relationChapterInsight = writingProfile.relation ? buildRelationChapterInsight(relationType, chapterNo, sectionHeading, { sectionIndex }) : "";
  const distanceChapterInsight = writingProfile.distance ? buildDistanceChapterInsight(distanceLabel, chapterNo, sectionHeading, { sectionIndex }) : "";
  const scoreSignal = buildScoreSignal(sectionHeading, relationScore, emotional, communication, { chapterNo, sectionIndex });
  const relationPrescription = writingProfile.relation
    ? `${sectionHeading}에서 ${relationType} 궁합을 다룰 때는 ${relationPrinciple}을 우선 기준으로 삼으세요.`
    : "";
  const distancePrescription = writingProfile.distance
    ? `${sectionHeading}의 거리 조절은 ${distancePrinciple}을 실제 약속으로 옮길 때 안정됩니다.`
    : "";

  const chapter10Boost = chapterNo === 10
    ? `${sectionHeading} 관점에서 보면 ${selfName}${withParticle(selfName)} ${partnerName}의 이별 원인은 감정 과열 이후 설명 없는 침묵에서 시작되기 쉽습니다. ${sectionHeading}의 재회 가능 조건은 과거 충돌 패턴을 같은 문장으로 다시 합의하는 것이며, ${sectionHeading}에서 반복될 문제는 연락 공백 해석과 상처 표현 방식입니다.`
    : "";
  const chapter11Boost = chapterNo === 11
    ? `${sectionHeading} 관점에서 결혼 이후의 핵심 변수는 생활 리듬, 돈, 가사, 가족 경계입니다. ${sectionHeading}에서 강해지는 점은 ${selfName}의 ${meStrength}${withParticle(meStrength)} ${partnerName}의 ${otherStrength}${topicParticle(otherStrength)} 상호 보완되는 구조이며, 지치게 되는 점은 ${meShadow}${withParticle(meShadow)} ${otherShadow}${topicParticle(otherShadow)} 누적될 때입니다.`
    : "";
  const chapter14Boost = chapterNo === 14
    ? `${sectionHeading}에서 ${pastLifeTitle}로 느껴지는 이유는 낯선 사람인데도 감정 반응이 익숙하게 반복되기 때문입니다. ${sectionHeading}의 전생적 의미는 미완의 감정 과제가 현재 관계에서 다시 떠오르는 구조이며, 이번 생의 성장 과제는 ${pastLifeTask}입니다.`
    : "";

  const blocks = {};

  Object.assign(blocks, {
    coreDiagnosis: `${sectionTheme.sukuyoLens} ${topicPhrase(focusAxis)} ${selfName} ${selfStar}宿과 ${partnerName} ${partnerStar}宿의 첫 반응과 지속 반응을 함께 비춥니다. ${relationChapterInsight} ${distanceChapterInsight} ${scoreSignal}`,
    masterInsight: `${selfStar}宿의 ${selfKeyword}${topicParticle(selfKeyword)} ${focusAxis}에서 먼저 깨어나고, ${partnerStar}宿의 ${partnerKeyword}${topicParticle(partnerKeyword)} ${sectionHeading} 장면에서 마음을 여는 방식에 영향을 줍니다. ${topicPhrase(sectionHeading)} ${objectPhrase(focusAxis)} 중심에 두고 마음의 신호와 현실 선택을 나란히 확인해야 합니다. 오행 흐름은 ${elementRelation}입니다. ${focusAxis}의 상담 증거는 ${completeSentence(elementSummary)} ${requiredTermFlow}${topicParticle(requiredTermFlow)} 실제 장면에서 확인해야 할 표지이고, 보완 포인트는 ${completeSentence(complementPoint)}`,
    manifestation: `${sectionTheme.reality} ${topicPhrase(sectionTheme.axis)} ${selfName}${topicParticle(selfName)} 애정을 표현할 때 ${objectPhrase(meStrength)} 앞세우고, 불안이 커지면 ${objectPhrase(meShadow)} 보일 수 있습니다. ${partnerName}${topicParticle(partnerName)} ${sectionHeading}에서 ${objectPhrase(otherStrength)} 통해 관계를 지지하지만 압박을 받으면 ${topicPhrase(otherShadow)} 나타납니다. 현재 감정대는 ${emotionalBand}이고 소통대는 ${communicationBand}이므로, ${sectionHeading} 장면은 말의 양보다 해석의 순서가 관계 체력을 좌우합니다.`,
    caution: `${sectionTheme.caution} ${relationType} 관계가 ${sectionTheme.axis}에서 흔들릴 때는 ${relationCaution}. ${buildRiskSignal(conflictRisk, longTermPotential, recoveryPotential, { chapterNo, sectionIndex, sectionHeading })} 조심할 신호는 ${riskBand}으로 보이며, ${requiredTermFlow}${objectParticle(requiredTermFlow)} 그냥 지나치면 서로의 해석 비용이 커집니다. ${chapter10Boost} ${chapter11Boost} ${chapter14Boost}`,
    prescription: `${sectionTheme.prescription} ${focusAxis}에서 ${selfName}${topicParticle(selfName)} ${objectPhrase(meAction)} 맡고, ${partnerName}${topicParticle(partnerName)} ${objectPhrase(otherAction)} 맡아야 합니다. ${sectionHeading}에서 감정이 올라온 순간에는 즉시 결론을 내리기보다 ${objectPhrase(resetAction)} 앞자리에 두세요. ${relationPrescription} ${distancePrescription} 두 사람이 같은 방식으로 적용할 때 ${sectionHeading}에서 생기는 상처를 실제 행동으로 줄일 수 있습니다.`,
    dialogueExample: `${sectionTheme.dialogue} ${selfName}: "나는 ${sectionTheme.axis}에서 ${objectPhrase(guide[0])} 먼저 확인하고 싶어. ${sectionHeading}에서 내 감정은 이렇고, 네가 받아들인 의미도 듣고 싶어." ${partnerName}: "바로 답을 정하기보다 ${guide[1]}부터 맞춰볼게. 우리가 ${guide[3]}으로 남길 문장도 같이 정하자."`,
    weeklyRoutine: sevenDayRoutine
      ? `이 장에서만 7일 실행 루틴을 적용합니다. 1일차에는 ${objectPhrase(sectionTheme.requiredTerms[0] || sectionTheme.axis)} 관찰하고, 3일차에는 ${guide[2]}이 반복되는 순간을 기록하세요. 5일차에는 ${objectPhrase(guide[3])} 실제 행동으로 바꾸고, 7일차에는 두 사람이 지킬 문장 하나를 확정하면 ${selfStar}宿과 ${partnerStar}宿의 흐름이 더 안정됩니다.`
      : `${sectionTheme.routine} ${topicPhrase(focusAxis)} 하루 만에 판단하지 말고, ${objectPhrase(requiredTermFlow || focusAxis)} 다음 만남에서 확인 가능한 행동으로 바꾸어야 합니다.`,
    moonPrescription: `${sectionTheme.moon} ${pastLifeTitle}의 결은 ${sectionHeading}에서 은근히 되살아나며, 이 인연의 밤의 조율법은 ${pastLifeTask}입니다. ${sectionHeading}의 치유 방향은 ${healingAction}입니다. 말을 다시 꺼낼 때는 ${objectPhrase(sectionTheme.axis)} 판정하지 말고 다음 행동을 정하는 말로 다루세요.`,
  });

  const sectionContext = {
    chapterNo,
    chapterTitle: text(chapter?.title || ""),
    sectionHeading,
    selfName,
    partnerName,
    selfStar,
    partnerStar,
    relationType,
    distanceLabel,
    sectionIndex,
    sectionAxis: sectionTheme.axis,
    writingProfile,
  };

  let out = buildChapterToneSectionBody(sectionContext, blocks);
  while (out.length < (MIN_SECTION_LENGTH + 120)) {
    blocks.prescription = `${blocks.prescription} ${sectionTag}에서는 ${requiredTermList}${objectParticle(requiredTermList)} 주간 점검 항목으로 두고, 관찰한 사실과 느낀 감정을 따로 기록하세요. ${chapterNo}장 ${sectionIndex + 1}번째 흐름에서 이 기준을 지키면 ${selfStar}宿과 ${partnerStar}宿 조합의 충돌을 줄이고 ${sectionTheme.axis}${objectParticle(sectionTheme.axis)} 실제 관계 회복의 언어로 바꿀 수 있습니다.`;
    out = buildChapterToneSectionBody(sectionContext, blocks);
  }
  return out;
}

function buildSukuyoCompatibilityLocalManuscript(localJson) {
  const chapters = SUKYO_PDF_CHAPTERS.map((chapter) => {
    const sections = chapter.sections.map((heading, sectionIndex) => ({
      title: heading,
      body: buildSectionBody(localJson, chapter, heading, sectionIndex),
      bullets: [
        `${text(localJson.self.sukuyoStar)}宿 · ${text(localJson.partner.sukuyoStar)}宿 관점에서 감정 신호를 먼저 확인합니다.`,
        `${text(localJson.relation.typeKo)} 관계의 장점을 유지하되 ${text(localJson.relation.distanceLabel, "거리")} 관리 규칙을 명확히 합니다.`,
        `실행 가능한 문장과 행동 단위로 관계 운영 전략을 고정합니다.`,
      ],
    }));

    const chapterText = sections.map((section) => section.body).join("\n\n");
    return {
      chapterNo: chapter.order,
      title: chapter.title,
      subtitle: `${text(localJson.relation.typeKo, "관계")} 관계 실전 해석`,
      sections,
      localQuality: {
        minLengthPassed: chapterText.length >= MIN_CHAPTER_LENGTH,
        repetitionPassed: computeRepetitionScore(chapterText) < 0.38,
        forbiddenTermsPassed: countForbiddenTerms(chapterText) === 0,
        usedStars: [text(localJson.self.sukuyoStar), text(localJson.partner.sukuyoStar)].filter(Boolean),
        usedRelationTypes: [text(localJson.relation.typeKo)].filter(Boolean),
        usedSignals: [text(localJson.relation.distanceLabel), ...safeArray(localJson.relation.chemistryKeywords)].filter(Boolean),
      },
    };
  });

  return chapters;
}

function enforceManuscriptLength(chapters) {
  const normalized = (Array.isArray(chapters) ? chapters : []).map((chapter) => {
    const sections = (Array.isArray(chapter.sections) ? chapter.sections : []).map((section) => {
      const fixed = repeatToLength([sanitizeSukyoPremiumBody(section.body)], MIN_SECTION_LENGTH);
      return {
        heading: text(section.title || section.heading || "세부 섹션"),
        body: fixed,
      };
    });

    let chapterLength = sections.reduce((sum, sec) => sum + text(sec.body).length, 0);
    if (chapterLength < MIN_CHAPTER_LENGTH && sections.length > 0) {
      const deficit = MIN_CHAPTER_LENGTH - chapterLength;
      const ext = repeatToLength([sections[sections.length - 1].body], deficit + 20);
      sections[sections.length - 1].body = sanitizeSukyoPremiumBody(`${sections[sections.length - 1].body}\n\n${ext}`);
      chapterLength = sections.reduce((sum, sec) => sum + text(sec.body).length, 0);
    }

    return {
      key: SUKYO_PDF_CHAPTERS[chapter.chapterNo - 1]?.key,
      order: chapter.chapterNo,
      title: text(chapter.title),
      sections,
      chapterLength,
    };
  });

  let total = normalized.reduce((sum, ch) => sum + ch.chapterLength, 0);
  if (total < MIN_TOTAL_LENGTH && normalized.length > 0) {
    const deficit = MIN_TOTAL_LENGTH - total;
    const last = normalized[normalized.length - 1];
    const tail = last.sections[last.sections.length - 1];
    const ext = repeatToLength([tail.body], deficit + 20);
    tail.body = sanitizeSukyoPremiumBody(`${tail.body}\n\n${ext}`);
    last.chapterLength = last.sections.reduce((sum, sec) => sum + text(sec.body).length, 0);
    total = normalized.reduce((sum, ch) => sum + ch.chapterLength, 0);
  }

  return { chapters: normalized, totalLength: total };
}

export function sanitizeSukyoChapterJson(chapter = {}, source = {}, seed = {}) {
  const chapterSpec = SUKYO_PDF_CHAPTERS.find((item) => item.key === chapter.key) || SUKYO_PDF_CHAPTERS[(Number(chapter.order) || 1) - 1];
  const sections = (Array.isArray(chapter.sections) ? chapter.sections : []).map((section, index) => ({
    heading: text(section.heading || section.title || chapterSpec?.sections?.[index] || `세부 섹션 ${index + 1}`),
    body: sanitizeSukyoPremiumBody(text(section.body || section.text || "")),
  }));

  return {
    key: text(chapter.key || source.key || chapterSpec?.key),
    order: safeNumber(chapter.order || source.order || chapterSpec?.order),
    title: text(chapter.title || source.title || chapterSpec?.title),
    summary: sanitizeSukyoPremiumText(source.summary || ""),
    coreReading: sanitizeSukyoPremiumText(source.coreReading || ""),
    sections,
    seed,
  };
}

function chapterArrayToRendererInput(chapters = []) {
  return chapters.map((chapter) => ({
    key: text(chapter.key),
    order: safeNumber(chapter.order, 0),
    title: text(chapter.title),
    sections: (Array.isArray(chapter.sections) ? chapter.sections : []).map((section) => ({
      heading: text(section.heading || section.title),
      body: sanitizeSukyoPremiumBody(section.body || section.text || ""),
    })),
  }));
}

function validateRenderedManuscript(seed, chapters, options = {}) {
  const issues = [];
  if (text(seed?.mode) !== "compatibility") issues.push("mode.compatibility");
  const requireSeedSignals = options.requireSeedSignals !== false;

  const compatibilityJson = seed?.localSukuyoCompatibilityJson || buildLocalCompatibilityJson(seed);
  const source = compatibilityJson || seed || {};
  const selfStarOk = Boolean(text(source?.self?.sukuyoStar || source?.userSukyo?.nameKo));
  const partnerStarOk = Boolean(text(source?.partner?.sukuyoStar || source?.partnerSukyo?.nameKo));
  if (requireSeedSignals && !selfStarOk) issues.push("self.sukuyo");
  if (requireSeedSignals && !partnerStarOk) issues.push("partner.sukuyo");

  const relationTypeOk = Boolean(text(source?.relation?.typeKo || source?.compatibility?.relationType || compatibilityJson?.relation?.typeKo));
  if (requireSeedSignals && !relationTypeOk) issues.push("relation.type");
  const relationToken = text(source?.relation?.typeKo || source?.compatibility?.relationType || compatibilityJson?.relation?.typeKo).toLowerCase();
  const selfStarToken = text(source?.self?.sukuyoStar || source?.userSukyo?.nameKo).toLowerCase();
  const partnerStarToken = text(source?.partner?.sukuyoStar || source?.partnerSukyo?.nameKo).toLowerCase();

  if (!Array.isArray(chapters) || chapters.length !== SUKYO_PDF_CHAPTER_COUNT) issues.push("chapter.count");

  let totalLength = 0;
  let forbiddenTermsCount = 0;
  let repeatedSectionCount = 0;
  const chapterOpeningSet = new Set();
  const chapterClosingSet = new Set();

  const chapterNos = new Set((Array.isArray(chapters) ? chapters : []).map((ch) => safeNumber(ch.order || ch.chapterNo, 0)).filter((n) => n > 0));
  for (let i = 1; i <= SUKYO_PDF_CHAPTER_COUNT; i += 1) {
    if (!chapterNos.has(i)) issues.push(`chapter.missing.${i}`);
  }

  for (const chapter of chapters) {
    const chapterNo = safeNumber(chapter.order || chapter.chapterNo, 0);
    const chapterSpec = SUKYO_PDF_CHAPTERS[chapterNo - 1];
    const chapterSections = Array.isArray(chapter.sections) ? chapter.sections : [];
    const chapterLength = chapterSections.reduce((sum, section) => sum + text(section.body).length, 0);
    totalLength += chapterLength;
    if (chapterLength < MIN_CHAPTER_LENGTH) issues.push(`chapter.length.${chapterNo}`);
    if (!Array.isArray(chapter.sections) || chapter.sections.length !== (chapterSpec?.sections?.length || 0)) {
      issues.push(`chapter.sections.${chapterNo}`);
    }

    const requiredKeywords = CHAPTER_REQUIRED_KEYWORDS[chapterNo];
    if (requiredKeywords && !chapterIncludesKeywords(chapter, requiredKeywords)) {
      issues.push(`chapter.keywords.${chapterNo}`);
    }

    for (const section of chapterSections) {
      const body = text(section.body);
      if (!body || body.length < MIN_SECTION_LENGTH) issues.push(`section.length.${chapterNo}`);
      if (!hasChapterToneStructure(body, chapter, section, { relationToken, selfStarToken, partnerStarToken })) {
        issues.push(`section.chapter_tone.${chapterNo}`);
      }
      const normalizedBody = body.toLowerCase();
      const hasRequiredDomainToken = !requireSeedSignals || Boolean(
        (relationToken && normalizedBody.includes(relationToken))
        || (selfStarToken && normalizedBody.includes(selfStarToken))
        || (partnerStarToken && normalizedBody.includes(partnerStarToken)),
      );
      if (!hasRequiredDomainToken) {
        issues.push(`section.domain_token.${chapterNo}`);
      }
      const sectionForbiddenCount = countForbiddenTerms(body);
      forbiddenTermsCount += sectionForbiddenCount;
      if (sectionForbiddenCount > 0) {
        issues.push(`forbidden.${chapterNo}`);
      }
      if (computeRepetitionScore(body) >= 0.55) {
        repeatedSectionCount += 1;
        issues.push(`section.repetition.${chapterNo}`);
      }
    }

    const opening = splitMeaningfulSentences(chapterSections[0]?.body || "")[0] || "";
    const closingSource = chapterSections[chapterSections.length - 1]?.body || "";
    const closingSentences = splitMeaningfulSentences(closingSource);
    const closing = closingSentences[closingSentences.length - 1] || "";
    if (opening) chapterOpeningSet.add(opening);
    if (closing) chapterClosingSet.add(closing);

    const sectionBodies = chapterSections.map((section) => text(section.body).replace(/\s+/g, " ").trim().slice(0, 200));
    const uniqueBodies = new Set(sectionBodies.filter(Boolean));
    if (uniqueBodies.size <= Math.max(1, Math.floor(chapterSections.length * 0.6))) {
      issues.push(`chapter.pattern_repeat.${chapterNo}`);
    }
  }
  if (totalLength < MIN_TOTAL_LENGTH) issues.push("total.length");
  if (forbiddenTermsCount > 0) issues.push("forbidden.total");
  if (repeatedSectionCount >= 4) issues.push("repetition.section");
  const paragraphRepeat = hasRepeatedParagraphs(chapters);
  const sentenceRepeat = hasRepeatedSentences(chapters);
  const ngramRepeat = hasRepeatedNgrams(chapters);
  const sevenDayRoutineCount = countSevenDayRoutinePatterns(chapters);
  const manuscriptText = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => (Array.isArray(chapter.sections) ? chapter.sections : []))
    .map((section) => text(section.body))
    .join("\n");
  const templateStemCount = countLiteralPhraseHits(manuscriptText, FORBIDDEN_TEMPLATE_STEMS);
  const awkwardJosaCount = countLiteralPhraseHits(manuscriptText, AWKWARD_JOSA_PATTERNS);
  if (paragraphRepeat.hasRepeated) issues.push("repetition.paragraph.global");
  if (sentenceRepeat.hasRepeated) issues.push("repetition.sentence.global");
  if (ngramRepeat.hasRepeated) issues.push("repetition.ngram.global");
  if (sevenDayRoutineCount > 1) issues.push("routine.seven_day.max_once");
  if (templateStemCount > 0) issues.push("text.template_stem");
  if (awkwardJosaCount > 0) issues.push("text.josa_awkward");
  if (hasForbiddenFallbackText(chapters)) issues.push("forbidden.fallback_text");
  if (chapterOpeningSet.size < Math.max(1, Math.floor(SUKYO_PDF_CHAPTER_COUNT * 0.8))) issues.push("repetition.chapter.opening");
  if (chapterClosingSet.size < Math.max(1, Math.floor(SUKYO_PDF_CHAPTER_COUNT * 0.8))) issues.push("repetition.chapter.closing");

  return {
    ok: issues.length === 0,
    issues,
    totalLength,
    forbiddenTermsCount,
    repetitionScore: repeatedSectionCount / Math.max(1, SUKYO_PDF_CHAPTER_COUNT),
    stats: {
      paragraphRepeatMax: paragraphRepeat.maxCount,
      sentenceRepeatMax: sentenceRepeat.maxCount,
      ngramRepeatMax: ngramRepeat.maxCount,
      sevenDayRoutineCount,
      templateStemCount,
      awkwardJosaCount,
    },
  };
}

export function validateSukyoCompatibilityPdfQuality(chapters = [], seed = {}) {
  const strictSeed = seed && typeof seed === "object" && Object.keys(seed).length > 0;
  return validateRenderedManuscript(
    { mode: "compatibility", ...(strictSeed ? seed : {}) },
    chapters,
    { requireSeedSignals: strictSeed },
  );
}

export function buildSukyoChapterQualityReport(seed = {}, chapters = []) {
  const compatibilityJson = seed?.localSukuyoCompatibilityJson || buildLocalCompatibilityJson(seed);
  const relationToken = text(compatibilityJson?.relation?.typeKo || compatibilityJson?.compatibility?.relationType).toLowerCase();
  const selfStarToken = text(compatibilityJson?.self?.sukuyoStar || compatibilityJson?.userSukyo?.nameKo).toLowerCase();
  const partnerStarToken = text(compatibilityJson?.partner?.sukuyoStar || compatibilityJson?.partnerSukyo?.nameKo).toLowerCase();
  const chapterResults = [];
  const issues = [];

  for (let index = 0; index < SUKYO_PDF_CHAPTER_COUNT; index += 1) {
    const chapterNo = index + 1;
    const spec = SUKYO_PDF_CHAPTERS[index];
    const chapter = (Array.isArray(chapters) ? chapters : []).find((item) => safeNumber(item.order || item.chapterNo, 0) === chapterNo) || {};
    const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
    const sectionBodies = sections.map((section) => text(section.body));
    const chapterText = sectionBodies.join("\n\n");
    const sectionCountOk = sections.length === (spec?.sections?.length || 0);
    const sectionLengthOk = sections.every((section) => text(section.body).length >= MIN_SECTION_LENGTH);
    const sectionStructureOk = sections.every((section) => hasChapterToneStructure(
      text(section.body),
      chapter,
      section,
      { relationToken, selfStarToken, partnerStarToken },
    ));
    const chapterLengthOk = chapterText.length >= MIN_CHAPTER_LENGTH;
    const forbiddenTermsCount = countForbiddenTerms(chapterText);
    const repetitionScore = computeRepetitionScore(chapterText);
    const domainSignalOk = sectionBodies.every((body) => {
      const normalized = body.toLowerCase();
      return Boolean(
        (relationToken && normalized.includes(relationToken))
        || (selfStarToken && normalized.includes(selfStarToken))
        || (partnerStarToken && normalized.includes(partnerStarToken))
      );
    });
    const keywordOk = !CHAPTER_REQUIRED_KEYWORDS[chapterNo] || chapterIncludesKeywords(chapter, CHAPTER_REQUIRED_KEYWORDS[chapterNo]);
    const ok = Boolean(sectionCountOk && sectionLengthOk && sectionStructureOk && chapterLengthOk && forbiddenTermsCount === 0 && domainSignalOk && keywordOk);
    const result = {
      chapterNo,
      key: text(spec?.key || chapter.key),
      ok,
      sectionCount: sections.length,
      expectedSectionCount: spec?.sections?.length || 0,
      minSectionLength: sectionBodies.length ? Math.min(...sectionBodies.map((body) => body.length)) : 0,
      sectionStructureOk,
      chapterLength: chapterText.length,
      forbiddenTermsCount,
      repetitionScore,
      domainSignalOk,
      keywordOk,
    };
    if (!ok) {
      if (!sectionCountOk) issues.push(`chapter.${chapterNo}.section_count`);
      if (!sectionLengthOk) issues.push(`chapter.${chapterNo}.section_length`);
      if (!sectionStructureOk) issues.push(`chapter.${chapterNo}.chapter_tone`);
      if (!chapterLengthOk) issues.push(`chapter.${chapterNo}.length`);
      if (forbiddenTermsCount > 0) issues.push(`chapter.${chapterNo}.forbidden`);
      if (!domainSignalOk) issues.push(`chapter.${chapterNo}.domain_signal`);
      if (!keywordOk) issues.push(`chapter.${chapterNo}.keywords`);
    }
    chapterResults.push(result);
  }

  return {
    ok: chapterResults.length === SUKYO_PDF_CHAPTER_COUNT && issues.length === 0,
    issues,
    chapterCount: chapterResults.length,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    chapters: chapterResults,
  };
}

export function assertSukyoCompatibilityPdfComplete({ chapters = [], expectedChapterCount = SUKYO_PDF_CHAPTER_COUNT, expectedSectionsByChapter = SUKYO_PDF_CHAPTERS } = {}) {
  const issues = [];
  if (!Array.isArray(chapters) || chapters.length !== expectedChapterCount) issues.push("chapter_count_mismatch");

  for (let idx = 0; idx < expectedSectionsByChapter.length; idx += 1) {
    const spec = expectedSectionsByChapter[idx];
    const chapterNo = idx + 1;
    const chapter = (Array.isArray(chapters) ? chapters : []).find((item) => safeNumber(item.order || item.chapterNo, 0) === chapterNo);
    if (!chapter) {
      issues.push(`chapter_missing_${chapterNo}`);
      continue;
    }
    const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
    if (sections.length !== spec.sections.length) issues.push(`section_count_mismatch_${chapterNo}`);
    for (const section of sections) {
      if (text(section.body).length < MIN_SECTION_LENGTH) issues.push(`section_too_short_${chapterNo}`);
    }
  }

  if (hasRepeatedParagraphs(chapters).hasRepeated) issues.push("repeated_paragraphs");
  if (hasForbiddenFallbackText(chapters)) issues.push("forbidden_text");

  if (issues.length) {
    const error = new Error(`SUKYO_PDF_INCOMPLETE:${issues.join(",")}`);
    error.code = "SUKYO_PDF_INCOMPLETE";
    error.issues = issues;
    throw error;
  }

  return { ok: true };
}

function stableStringify(value) {
  if (value == null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hashStable(value) {
  const source = typeof value === "string" ? value : stableStringify(value);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function mansionFacts(star = {}) {
  return {
    id: text(star?.nameHan || star?.nameKo || star?.index),
    index: safeNumber(star?.index, null),
    name: text(star?.nameKo),
    label: `${text(star?.nameKo)}宿${text(star?.nameHan) ? `(${text(star.nameHan)})` : ""}`,
    keywords: safeArray(star?.keywords || star?.traits),
    group: text(star?.category),
    attributes: {
      element: text(star?.element),
      strengths: safeArray(star?.strengths),
      shadows: safeArray(star?.shadows),
      lunarMonth: safeNumber(star?.lunarMonth, null),
      lunarDay: safeNumber(star?.lunarDay, null),
      source: text(star?.source),
    },
  };
}

function buildSukuyoCalendarBasis(seed = {}, localJson = {}) {
  const meta = seed?.calculationMeta || {};
  const self = localJson?.input?.self || seed?.userProfile || {};
  const partner = localJson?.input?.partner || seed?.partnerProfile || {};
  return {
    inputCalendarType: text(self?.calendarType || seed?.userProfile?.calendarType || "existing_service_value"),
    partnerInputCalendarType: text(partner?.calendarType || seed?.partnerProfile?.calendarType || "existing_service_value"),
    normalizedDate: text(self?.birthDate),
    partnerNormalizedDate: text(partner?.birthDate),
    timezone: text(self?.timezone || partner?.timezone || meta?.timezone || "Asia/Seoul"),
    lunarDate: {
      self: {
        year: safeNumber(seed?.userSukyo?.lunarYear, null),
        month: safeNumber(seed?.userSukyo?.lunarMonth, null),
        day: safeNumber(seed?.userSukyo?.lunarDay, null),
      },
      partner: {
        year: safeNumber(seed?.partnerSukyo?.lunarYear, null),
        month: safeNumber(seed?.partnerSukyo?.lunarMonth, null),
        day: safeNumber(seed?.partnerSukyo?.lunarDay, null),
      },
    },
    isLeapMonth: Boolean(seed?.userSukyo?.isLeapMonth),
    partnerIsLeapMonth: Boolean(seed?.partnerSukyo?.isLeapMonth),
    mansionSystem: text(meta?.engine || "sukuyo-27").includes("28") ? "28" : "27",
    algorithmVersion: text(meta?.methodVersion || seed?.methodVersion || "sukyo-premium-compat-v2"),
    dateBoundaryRule: text(meta?.dateBoundaryRule || "existing_engine_basis"),
    calendarSource: text(meta?.calendarSource || seed?.calendarSource || seed?.userSukyo?.source || "existing_engine_basis"),
  };
}

export function buildSukuyoFacts(seed = {}, localJson = null) {
  const resolvedLocalJson = localJson || seed?.localSukuyoCompatibilityJson || buildLocalCompatibilityJson(seed);
  const relation = resolvedLocalJson?.relation || {};
  const facts = {
    productId: "sukuyo",
    mode: "compatibility",
    birthInfo: resolvedLocalJson?.input?.self || seed?.userProfile || {},
    partnerBirthInfo: resolvedLocalJson?.input?.partner || seed?.partnerProfile || {},
    calendarBasis: buildSukuyoCalendarBasis(seed, resolvedLocalJson),
    natalMansion: mansionFacts(seed?.userSukyo || {}),
    partnerNatalMansion: mansionFacts(seed?.partnerSukyo || {}),
    personalCore: safeArray([
      resolvedLocalJson?.self?.profile?.relationCore,
      ...(resolvedLocalJson?.self?.keywords || []),
    ]),
    emotionalPattern: safeArray(resolvedLocalJson?.interpretationSeeds?.emotionalPattern),
    relationshipPattern: safeArray(resolvedLocalJson?.interpretationSeeds?.communicationPattern),
    careerTalentPattern: safeArray(resolvedLocalJson?.interpretationSeeds?.longTermStrategy),
    wealthPattern: safeArray(resolvedLocalJson?.interpretationSeeds?.moneyPattern),
    shadowPattern: safeArray(resolvedLocalJson?.relation?.conflictKeywords),
    lifeRhythmPattern: safeArray(resolvedLocalJson?.interpretationSeeds?.reconciliationPattern),
    compatibility: {
      relationType: text(relation?.type || seed?.compatibility?.relationType),
      relationLabel: text(relation?.typeKo || seed?.compatibility?.relationType),
      distance: text(relation?.distanceLabel || seed?.compatibility?.distanceLabel),
      direction: text(seed?.compatibility?.directionFromAToB || seed?.compatibility?.direction || ""),
      score: safeNumber(relation?.score ?? seed?.compatibility?.compatibilityIndex, null),
      strengths: safeArray(resolvedLocalJson?.derived?.mainStrengths),
      risks: safeArray(resolvedLocalJson?.derived?.mainRisks),
      advice: safeArray([
        relation?.roleActionGuide?.meAction,
        relation?.roleActionGuide?.otherAction,
        relation?.roleActionGuide?.resetLine,
      ]),
    },
    timingFlows: {
      annualFlow: [],
      monthlyFlow: [],
      dailyFlow: [],
    },
    opportunitySignals: safeArray(resolvedLocalJson?.derived?.mainStrengths),
    riskWarnings: safeArray(resolvedLocalJson?.derived?.mainRisks),
    recommendedActions: safeArray(resolvedLocalJson?.derived?.requiredAgreements),
    avoidActions: safeArray(["관계 유형만으로 좋고 나쁨을 단정하지 않기", "침묵을 거절로 단정하지 않기"]),
  };
  facts.engineVersion = text(facts.calendarBasis.algorithmVersion || facts.calendarBasis.calendarSource);
  facts.factsHash = hashStable(facts);
  return facts;
}

function buildLockedFacts(facts = {}, chapterSpec = {}) {
  const locked = [
    `모드: ${facts.mode}`,
    `본인 본명숙: ${facts.natalMansion?.label || facts.natalMansion?.name}`,
    `상대 본명숙: ${facts.partnerNatalMansion?.label || facts.partnerNatalMansion?.name}`,
    `관계 유형: ${facts.compatibility?.relationLabel || facts.compatibility?.relationType}`,
    `거리 판정: ${facts.compatibility?.distance}`,
    `27/28숙 기준: ${facts.calendarBasis?.mansionSystem}`,
    `엔진 버전: ${facts.calendarBasis?.algorithmVersion}`,
  ];
  if (facts.compatibility?.score != null) locked.push(`궁합 점수: ${facts.compatibility.score}`);
  if (chapterSpec?.key === "chapter-02-me-love") locked.push(`본인 키워드: ${safeArray(facts.natalMansion?.keywords).slice(0, 4).join(", ")}`);
  if (chapterSpec?.key === "chapter-03-partner-love") locked.push(`상대 키워드: ${safeArray(facts.partnerNatalMansion?.keywords).slice(0, 4).join(", ")}`);
  return locked.filter((item) => !item.endsWith(": "));
}

export function buildSukuyoChapterPlans(seed = {}, localJson = null, localChapters = null) {
  const resolvedLocalJson = localJson || seed?.localSukuyoCompatibilityJson || buildLocalCompatibilityJson(seed);
  const facts = buildSukuyoFacts(seed, resolvedLocalJson);
  const chapters = Array.isArray(localChapters) && localChapters.length
    ? localChapters
    : enforceManuscriptLength(buildSukuyoCompatibilityLocalManuscript(resolvedLocalJson)).chapters;
  const categoryCompatibility = buildSukyoCategoryCompatibility(resolvedLocalJson);
  const evidenceMap = buildSukyoChapterEvidenceMap(resolvedLocalJson, categoryCompatibility);
  return SUKYO_PDF_CHAPTERS.map((chapter) => {
    const localChapter = chapters.find((item) => safeNumber(item.order || item.chapterNo, 0) === chapter.order) || {};
    const evidence = evidenceMap.find((item) => item.key === chapter.key) || {};
    return {
      chapterId: chapter.key,
      chapterTitle: chapter.title,
      mode: "compatibility",
      purpose: safeArray(CHAPTER_TOPIC_GUIDE[chapter.order]).join(" · ") || "숙요 관계 흐름을 현실적인 조율 기준으로 정리",
      lockedFacts: buildLockedFacts(facts, chapter),
      interpretationPoints: uniqueSukyoStrings([
        ...safeArray(evidence?.requiredSignals),
        ...safeArray(resolvedLocalJson?.derived?.requiredAgreements),
        ...safeArray(resolvedLocalJson?.derived?.recoveryRoutine),
      ]).slice(0, 18),
      warnings: [
        "본명숙, 관계 유형, 거리, 궁합 점수는 로컬 계산 결과 그대로 유지",
        "관계 실패, 이별, 결혼 실패를 단정하지 않기",
        "사주 용어를 숙요 해석에 섞지 않기",
      ],
      recommendedTone: "전문적이고 신비로운 프리미엄 숙요 상담문",
      localDraft: (Array.isArray(localChapter.sections) ? localChapter.sections : [])
        .map((section) => sanitizeSukyoPremiumBody(section.body))
        .filter(Boolean)
        .join("\n\n"),
    };
  });
}

function buildSukyoCategoryCompatibility(localJson = {}) {
  const selfGroup = text(localJson?.self?.group, "미상");
  const partnerGroup = text(localJson?.partner?.group, "미상");
  const selfElement = text(localJson?.self?.element, "미상");
  const partnerElement = text(localJson?.partner?.element, "미상");
  const selfStar = text(localJson?.self?.sukuyoStar, "본명숙");
  const partnerStar = text(localJson?.partner?.sukuyoStar, "상대숙");
  const groupGuide = {
    청룡: { rhythm: "시작과 추진", love: "관계를 빠르게 열고 방향을 제시", shadow: "속도 과열과 조급함" },
    현무: { rhythm: "내면과 축적", love: "신뢰가 쌓일수록 깊어지는 애정", shadow: "침묵과 감정 보류" },
    백호: { rhythm: "현실 감각과 완성", love: "구체적 행동과 책임으로 사랑을 증명", shadow: "비판성과 경직" },
    주작: { rhythm: "표현과 확장", love: "말, 분위기, 설렘으로 관계를 점화", shadow: "감정 기복과 과장" },
  };
  const selfGuide = groupGuide[selfGroup] || { rhythm: "개별 리듬", love: "자기 방식으로 관계를 운영", shadow: "해석 차이" };
  const partnerGuide = groupGuide[partnerGroup] || { rhythm: "개별 리듬", love: "자기 방식으로 관계를 운영", shadow: "해석 차이" };
  const sameGroup = selfGroup && partnerGroup && selfGroup === partnerGroup;
  const sameElement = selfElement && partnerElement && selfElement === partnerElement;

  return {
    pairKey: `${selfGroup} x ${partnerGroup}`,
    elementPairKey: `${selfElement} x ${partnerElement}`,
    self: { star: selfStar, group: selfGroup, element: selfElement, ...selfGuide },
    partner: { star: partnerStar, group: partnerGroup, element: partnerElement, ...partnerGuide },
    compatibilityFocus: sameGroup
      ? `${selfGroup} 기질이 서로 증폭되므로 장점은 빠르게 커지고 그림자도 동시에 커집니다.`
      : `${selfGroup}의 ${selfGuide.rhythm}과 ${partnerGroup}의 ${partnerGuide.rhythm}이 서로 다른 속도로 맞물립니다.`,
    elementFocus: sameElement
      ? `${selfElement} 오행이 겹쳐 공감은 빠르지만 같은 약점이 반복될 수 있습니다.`
      : `${selfElement}과 ${partnerElement} 오행의 차이를 생활 규칙으로 조율해야 합니다.`,
    strengthBridge: `${selfStar}宿의 ${selfGuide.love} 흐름과 ${partnerStar}宿의 ${partnerGuide.love} 흐름을 같은 언어로 번역하는 것이 핵심입니다.`,
    conflictButton: `${selfGuide.shadow}과 ${partnerGuide.shadow}이 동시에 켜질 때 관계 피로가 커집니다.`,
    repairMethod: "감정 확인, 사실 정리, 다음 행동 합의 순서로 회복 대화를 고정합니다.",
  };
}

function uniqueSukyoStrings(values = []) {
  const out = [];
  const seen = new Set();
  for (const value of safeArray(values)) {
    const item = text(value);
    const key = item.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function buildSukyoChapterEvidenceMap(localJson = {}, categoryCompatibility = {}) {
  const relation = localJson?.relation || {};
  const self = localJson?.self || {};
  const partner = localJson?.partner || {};
  const derived = localJson?.derived || {};
  const seeds = localJson?.interpretationSeeds || {};
  const baseSignals = uniqueSukyoStrings([
    self?.sukuyoStar,
    partner?.sukuyoStar,
    self?.group,
    partner?.group,
    self?.element,
    partner?.element,
    relation?.typeKo,
    relation?.type,
    relation?.distanceLabel,
    relation?.relationTheme,
    categoryCompatibility?.pairKey,
    categoryCompatibility?.elementPairKey,
    categoryCompatibility?.compatibilityFocus,
    categoryCompatibility?.elementFocus,
    categoryCompatibility?.strengthBridge,
    categoryCompatibility?.conflictButton,
    categoryCompatibility?.repairMethod,
    derived?.scoreBand,
    derived?.temperatureBand,
    derived?.magnetismBand,
    ...safeArray(seeds?.requiredAgreements),
    ...safeArray(seeds?.recoveryRoutine),
  ]);
  return SUKYO_PDF_CHAPTERS.map((chapter, chapterIndex) => ({
    key: chapter.key,
    order: chapter.order,
    title: chapter.title,
    requiredSignals: uniqueSukyoStrings([
      ...baseSignals.slice(0, 14),
      chapter.title,
    ]),
    sections: safeArray(chapter.sections).map((heading, sectionIndex) => {
      const offset = (chapterIndex + sectionIndex) % Math.max(1, baseSignals.length);
      return {
        heading,
        requiredSignals: uniqueSukyoStrings([
          self?.sukuyoStar,
          partner?.sukuyoStar,
          relation?.typeKo,
          relation?.distanceLabel,
          categoryCompatibility?.pairKey,
          categoryCompatibility?.elementPairKey,
          ...baseSignals.slice(offset, offset + 8),
        ]).slice(0, 16),
      };
    }),
  }));
}

function buildSukyoGenerationJson(seed = {}, localJson = {}) {
  const relation = localJson?.relation || {};
  const categoryCompatibility = buildSukyoCategoryCompatibility(localJson);
  const chapterEvidenceMap = buildSukyoChapterEvidenceMap(localJson, categoryCompatibility);
  const sukuyoFacts = buildSukuyoFacts(seed, localJson);
  const localChapters = enforceManuscriptLength(buildSukuyoCompatibilityLocalManuscript(localJson)).chapters;
  const chapterPlans = buildSukuyoChapterPlans(seed, localJson, localChapters);
  return {
    serviceName: "숙요점 프리미엄 궁합 PDF",
    assemblyVersion: SUKYO_PDF_CONFIG.templateVersion,
    requestContext: {
      sessionId: text(seed?.sessionId),
      reportId: text(seed?.reportId),
      requestId: text(seed?.requestId),
      featureKey: text(seed?.featureKey),
    },
    generationPolicy: {
      manuscriptSource: SUKYO_PDF_CONFIG.generationMode,
      localUsage: "calculation-and-local-manuscript",
      localCalculationOnly: true,
      proseAuthoring: "local-assembled",
      rejectLocalDraft: false,
      rejectFallbackDraft: true,
      forbidden: ["새 숙요 계산", "본명숙 변경", "관계 유형 변경", "거리 판정 변경", "확정적 예언", "공포 마케팅", "사주 용어 혼입"],
      requiredTone: "전문적이고 신비로운 관계 상담문",
    },
    sukuyoFacts,
    calculationTruth: {
      mode: "compatibility",
      input: localJson?.input || {},
      self: localJson?.self || {},
      partner: localJson?.partner || {},
      relation,
      derived: localJson?.derived || {},
      interpretationSeeds: localJson?.interpretationSeeds || {},
      canonicalSeed: {
        userSukyo: seed?.userSukyo || {},
        partnerSukyo: seed?.partnerSukyo || {},
        compatibility: seed?.compatibility || {},
      },
    },
    categoryCompatibility,
    chapterEvidenceMap,
    chapterPlans,
    chapterBlueprint: SUKYO_PDF_CHAPTERS.map((chapter) => ({
      key: chapter.key,
      order: chapter.order,
      title: chapter.title,
      sections: chapter.sections,
      evidence: chapterEvidenceMap.find((item) => item.key === chapter.key) || null,
      plan: chapterPlans.find((item) => item.chapterId === chapter.key) || null,
      localAssembled: true,
    })),
    qualityContract: {
      chapterCount: SUKYO_PDF_CHAPTER_COUNT,
      sectionCountPerChapter: 5,
      minSectionChars: MIN_SECTION_LENGTH,
      minChapterChars: MIN_CHAPTER_LENGTH,
      eachSectionMustUseAtLeastThreeSignals: [
        "self.sukuyoStar",
        "partner.sukuyoStar",
        "relation.typeKo",
        "relation.distanceLabel",
        "categoryCompatibility.pairKey",
        "categoryCompatibility.elementPairKey",
      ],
    },
  };
}

export function buildSukyoLocalAssemblyChapters(seed, skeleton) {
  const localJson = seed?.localSukuyoCompatibilityJson || buildLocalCompatibilityJson(seed);
  const built = enforceManuscriptLength(buildSukuyoCompatibilityLocalManuscript(localJson)).chapters;
  const specs = Array.isArray(skeleton) && skeleton.length ? skeleton : SUKYO_PDF_CHAPTERS;
  return specs.map((spec, index) => {
    const local = built.find((chapter) => text(chapter.key) === text(spec.key))
      || built.find((chapter) => safeNumber(chapter.order, 0) === safeNumber(spec.order || index + 1, 0))
      || built[index]
      || {};
    return {
      key: text(spec.key || local.key),
      order: safeNumber(spec.order || local.order || index + 1, index + 1),
      title: text(spec.title || local.title),
      sections: (Array.isArray(spec.sections) ? spec.sections : []).map((heading, sectionIndex) => {
        const localSection = Array.isArray(local.sections) ? local.sections[sectionIndex] || {} : {};
        return {
          heading: text(heading || localSection.heading || localSection.title),
          body: sanitizeSukyoPremiumBody(localSection.body || ""),
        };
      }),
    };
  });
}

function buildValidatedSukyoLocalChapters(seed) {
  const chapters = chapterArrayToRendererInput(buildSukyoLocalAssemblyChapters(seed, SUKYO_PDF_CHAPTERS));
  const validation = validateRenderedManuscript(seed, chapters);
  if (!validation.ok) {
    const error = new Error("숙요점 로컬 원고가 품질 검증을 통과하지 못했습니다.");
    error.code = "SUKYO_LOCAL_MANUSCRIPT_QUALITY_FAILED";
    error.status = 502;
    error.issues = validation.issues;
    error.stats = validation.stats;
    throw error;
  }
  assertSukyoCompatibilityPdfComplete({
    chapters,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    expectedSectionsByChapter: SUKYO_PDF_CHAPTERS,
  });
  return { chapters, validation };
}

export function renderSukyoChapterMarkdown(chapter = {}) {
  const lines = [`## ${text(chapter.title)}`];
  for (const section of Array.isArray(chapter.sections) ? chapter.sections : []) {
    lines.push(`### ${text(section.heading)}`);
    lines.push(sanitizeSukyoPremiumBody(section.body));
  }
  return lines.join("\n\n");
}

function escapeHtml(value) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderParagraphs(body) {
  return sanitizeSukyoPremiumBody(body)
    .replace(/\[(핵심 진단|숙요 고수의 정밀 관찰|관계에서 실제로 드러나는 모습|주의해야 할 흐름|실전 처방|대화 예시|7일 실천 루틴|달빛 처방)\]/g, "")
    .split(/\n{2,}|(?<=다\.)\s+(?=[가-힣])/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

function renderSectionBody(body) {
  return `<div class="section-body">${renderParagraphs(body)}</div>`;
}

function extractChapterSummary(chapter = {}, rel = "관계") {
  const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
  const firstBody = text(sections[0]?.body);
  const firstSentence = splitMeaningfulSentences(firstBody)[0] || "";
  return firstSentence || `${rel} 흐름에서 ${text(chapter.title)}의 핵심 지점을 정리한 장입니다.`;
}

function extractChapterPrescription(chapter = {}) {
  const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    const sentences = splitMeaningfulSentences(text(sections[i]?.body));
    const sentence = sentences[sentences.length - 1] || "";
    if (sentence) return sentence;
  }
  return "갈등 이후 재대화 시점과 생활 합의 문장을 먼저 정해 관계 회복 속도를 높이세요.";
}

function extractLlmChapterSummary(chapter = {}) {
  const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
  const firstBody = text(sections[0]?.body);
  return splitMeaningfulSentences(firstBody)[0] || "";
}

function extractLlmChapterPrescription(chapter = {}) {
  const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    const sentences = splitMeaningfulSentences(text(sections[i]?.body));
    const sentence = sentences[sentences.length - 1] || "";
    if (sentence) return sentence;
  }
  return "";
}

function displayCalendarType(raw) {
  const token = text(raw).toLowerCase();
  if (token.includes("solar") || token.includes("양")) return "양력";
  if (token.includes("lunar") || token.includes("음")) return "음력";
  return "입력값 기준";
}

function directionRoleMeaning(role) {
  const token = text(role);
  if (token.includes("안")) return "상대의 마음을 크게 흔들어 관계의 긴장과 각성을 먼저 여는 쪽";
  if (token.includes("괴")) return "상대의 자극을 깊게 받아 상처와 회복 과제를 크게 느끼는 쪽";
  if (token.includes("영")) return "기운을 북돋우고 관계의 온기를 먼저 살리는 쪽";
  if (token.includes("친")) return "편안함을 받아들이며 정서적 신뢰를 깊게 쌓는 쪽";
  if (token.includes("업")) return "오래된 과제와 반복 패턴을 먼저 드러내는 쪽";
  if (token.includes("태")) return "익숙한 끌림 속에서 관계의 숙제를 현실로 받는 쪽";
  if (token.includes("우")) return "섬세한 배려와 정서 교류를 먼저 건네는 쪽";
  if (token.includes("쇠")) return "작은 서운함과 거리감을 민감하게 체감하는 쪽";
  return "";
}

function buildDirectionSummary(seed = {}, safeName = "사용자", partnerName = "상대방") {
  const compatibility = seed?.compatibility || {};
  const localRelation = seed?.localSukuyoCompatibilityJson?.relation || {};
  const fromSelf = text(compatibility.directionFromAToB || localRelation.directionFromAToB);
  const fromPartner = text(compatibility.directionFromBToA || localRelation.directionFromBToA);
  const selfMeaning = directionRoleMeaning(fromSelf);
  const partnerMeaning = directionRoleMeaning(fromPartner);
  if (!fromSelf && !fromPartner) {
    return "두 사람의 방향성은 본명숙과 관계 유형을 함께 놓고 읽어야 하며, 한쪽의 감정만으로 결론 내리지 않는 것이 중요합니다.";
  }
  const selfLine = fromSelf ? `${safeName}은 ${fromSelf}의 자리에서 ${selfMeaning || "관계의 첫 반응을 여는 쪽"}입니다` : `${safeName}의 방향성은 관계 흐름 안에서 확인합니다`;
  const partnerLine = fromPartner ? `${partnerName}은 ${fromPartner}의 자리에서 ${partnerMeaning || "상대 반응을 받아 관계의 균형을 만드는 쪽"}입니다` : `${partnerName}의 방향성은 상대 반응 안에서 확인합니다`;
  return `${selfLine}. ${partnerLine}. 이 방향 차이를 인정할 때 같은 사건도 공격이 아니라 조율 과제로 읽힙니다.`;
}

function buildScoreSummary(seed = {}) {
  const relation = seed?.localSukuyoCompatibilityJson?.relation || {};
  const compatibility = seed?.compatibility || {};
  const score = safeNumber(relation.score ?? compatibility.score ?? compatibility.compatibilityIndex, null);
  const emotional = safeNumber(relation.chemistry?.emotional ?? compatibility.temperature, null);
  const communication = safeNumber(relation.chemistry?.communication ?? compatibility.communicationScore, null);
  if (score == null) {
    return "점수보다 관계 유형, 거리감, 반복 행동을 중심으로 해석하는 흐름입니다.";
  }
  const label = scoreBandLabel(score, "강한 인연 체감이 뚜렷한 궁합", "조율할수록 안정되는 현실형 궁합", "기준을 세울 때 살아나는 보완형 궁합");
  const detail = [
    emotional != null ? `감정 반응 ${emotional}점` : "",
    communication != null ? `대화 안정성 ${communication}점` : "",
  ].filter(Boolean).join(" · ");
  return `${score}점의 ${label}입니다.${detail ? ` ${detail}을 함께 보면 감정과 대화의 균형을 더 정확히 잡을 수 있습니다.` : ""}`;
}

function buildCalendarTrustSummary(seed = {}) {
  const localJson = seed?.localSukuyoCompatibilityJson || {};
  const basis = buildSukuyoCalendarBasis(seed, localJson);
  const selfBirthTime = text(localJson?.input?.self?.birthTime || seed?.userProfile?.birthTime);
  const partnerBirthTime = text(localJson?.input?.partner?.birthTime || seed?.partnerProfile?.birthTime);
  const birthTimeNote = selfBirthTime || partnerBirthTime
    ? "입력된 생시는 가능한 범위에서 함께 참고했습니다."
    : "생시가 비어 있어 생년월일 중심으로 본명숙과 궁합 흐름을 읽었습니다.";
  return `${basis.mansionSystem}숙 기준 · ${displayCalendarType(basis.inputCalendarType)} / 상대 ${displayCalendarType(basis.partnerInputCalendarType)} · ${text(basis.timezone, "Asia/Seoul")} 시간대. ${birthTimeNote}`;
}

function buildFinalActionItems(seed = {}, renderedFinalPrescription = "") {
  const guide = seed?.localSukuyoCompatibilityJson?.relation?.roleActionGuide || {};
  return uniqueSukyoStrings([
    guide.meAction,
    guide.otherAction,
    guide.resetLine,
    renderedFinalPrescription,
  ]).slice(0, 4);
}

function renderActionItems(items = []) {
  return safeArray(items)
    .map((item) => `<li>${escapeHtml(sanitizeSukyoPremiumText(item))}</li>`)
    .join("");
}

export function renderSukyoPremiumPdf(chapters, seed) {
  const safeName = safeSukyoDisplayText(seed?.userProfile?.name, "사용자");
  const partnerName = safeSukyoDisplayText(seed?.partnerProfile?.name, "상대방");
  const rel = safeSukyoDisplayText(seed?.compatibility?.relationType, "관계");
  const distance = safeSukyoDisplayText(displayDistanceLabel(seed?.compatibility?.distanceLabel || seed?.compatibility?.distance), "거리");
  const userHost = `${safeSukyoDisplayText(seed?.userSukyo?.nameKo, "본명")}宿`;
  const partnerHost = `${safeSukyoDisplayText(seed?.partnerSukyo?.nameKo, "상대")}宿`;

  const relationSummary = sanitizeSukyoPremiumText(seed?.localSukuyoCompatibilityJson?.relation?.relationTheme)
    || `${escapeHtml(rel)} 관계는 강한 끌림과 운영 규칙의 균형이 핵심입니다.`;
  const distanceSummary = sanitizeSukyoPremiumText(seed?.localSukuyoCompatibilityJson?.relation?.distanceInterpretation?.theme)
    || `${escapeHtml(distance)} 흐름에서는 감정 체온과 거리 조절이 동시에 중요합니다.`;
  const strengthSummary = sanitizeSukyoPremiumText(seed?.localSukuyoCompatibilityJson?.relation?.strengthShadowMap?.complementSummary)
    || `${escapeHtml(userHost)}과 ${escapeHtml(partnerHost)}의 강점은 상호 보완적이며 회복 규칙이 안정성을 높입니다.`;
  const finalPrescription = sanitizeSukyoPremiumText(seed?.localSukuyoCompatibilityJson?.relation?.roleActionGuide?.resetLine)
    || "갈등 직후 감정-사실-합의 순서로 대화를 재개하는 규칙을 유지하세요.";

  const renderedRelationSummary = safeSukyoDisplayText(extractChapterSummary(chapters[3] || chapters[0], rel), relationSummary);
  const renderedDistanceSummary = safeSukyoDisplayText(extractChapterSummary(chapters[4] || chapters[0], rel), distanceSummary);
  const renderedStrengthSummary = safeSukyoDisplayText(extractChapterSummary(chapters[0] || chapters[1], rel), strengthSummary);
  const renderedFinalPrescription = safeSukyoDisplayText(
    extractChapterPrescription(chapters[14] || chapters[chapters.length - 1]),
    finalPrescription,
  );
  const renderedScoreSummary = safeSukyoDisplayText(buildScoreSummary(seed), "궁합 점수는 관계 유형과 거리감의 해석을 함께 놓고 읽어야 합니다.");
  const renderedDirectionSummary = safeSukyoDisplayText(buildDirectionSummary(seed, safeName, partnerName), "두 사람의 방향성은 관계 유형과 반복 행동 안에서 함께 확인해야 합니다.");
  const renderedCalendarTrust = safeSukyoDisplayText(buildCalendarTrustSummary(seed), "27숙 기준으로 입력된 생년월일을 바탕으로 본명숙과 궁합 흐름을 산출했습니다.");
  const finalActionItems = buildFinalActionItems(seed, renderedFinalPrescription);
  const finalActionList = renderActionItems(finalActionItems.length ? finalActionItems : [renderedFinalPrescription]);

  const toc = chapters.map((chapter) => `<li><span>제${chapter.order}장</span>${escapeHtml(chapter.title)}</li>`).join("");
  const chapterHtml = chapters.map((chapter) => {
    const chapterSummary = safeSukyoDisplayText(
      extractChapterSummary(chapter, rel),
      `${rel} 관계의 핵심 흐름을 실제 선택과 대화의 리듬으로 정리합니다.`,
    );
    const chapterPrescription = safeSukyoDisplayText(
      extractChapterPrescription(chapter),
      "감정이 커지는 순간에는 판단을 늦추고, 확인된 사실과 합의 가능한 행동부터 차례로 맞추십시오.",
    );
    const sections = chapter.sections.map((section) => `
      <section class="section-card">
        <h3>${escapeHtml(section.heading)}</h3>
        ${renderSectionBody(section.body)}
      </section>`).join("");

    return `
      <section class="chapter">
        <p class="chapter-kicker">제${chapter.order}장</p>
        <h2>${escapeHtml(chapter.title)}</h2>
        <p class="chapter-summary">${escapeHtml(chapterSummary)}</p>
        <div class="section-grid">${sections}</div>
        <aside class="chapter-prescription">
          <h4>이 장에서 바로 적용할 관계 운영</h4>
          <p>${escapeHtml(chapterPrescription)}</p>
        </aside>
      </section>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(safeName)} x ${escapeHtml(partnerName)} 숙요점 프리미엄 궁합 PDF</title>
<style>
@page{margin:18mm 14mm}*{box-sizing:border-box}body{margin:0;background:#070817;color:#f7eefc;font-family:'Noto Serif KR','Gowun Dodum',serif;line-height:1.78}main{max-width:980px;margin:0 auto;padding:34px 24px 72px}.cover{min-height:720px;border:1px solid rgba(216,180,254,.34);border-radius:18px;padding:34px;background:radial-gradient(circle at 18% 8%,rgba(244,194,255,.25),transparent 32%),linear-gradient(145deg,#0a1029 0%,#251044 50%,#070817 100%);page-break-after:always}.cover img{width:min(420px,92%);display:block;margin:22px auto;border-radius:16px;border:1px solid rgba(255,255,255,.18);background:#15122a}.eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#f7c7ff;font-size:12px}.cover h1{margin:10px 0 8px;font-size:38px;color:#fff7fb}.cover .subtitle{font-size:18px;color:#ffd7ef;margin:0 0 18px}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:24px 0}.summary div{border:1px solid rgba(255,255,255,.13);border-radius:10px;padding:12px;background:rgba(14,20,45,.72)}.summary strong{display:block;color:#ffe8a3}.intro,.toc,.chapter,.bridge-card{border:1px solid rgba(216,180,254,.22);border-radius:14px;background:rgba(13,18,40,.88);padding:20px;margin:22px 0;page-break-inside:avoid}.toc ol{columns:2;gap:28px}.toc li{break-inside:avoid;margin:0 0 8px;color:#eee1ff}.toc li span{color:#f9c6ff;margin-right:8px}.chapter{page-break-before:always}.chapter-kicker{margin:0 0 6px;color:#f8c8ff;letter-spacing:.12em;text-transform:uppercase}.chapter h2{margin:0;color:#fff4c2;font-size:24px}.chapter-summary{margin:12px 0 16px;padding:12px 14px;border-radius:10px;border:1px solid rgba(245,208,254,.25);background:rgba(40,18,68,.56);color:#f6ecfb}.section-grid{display:grid;grid-template-columns:1fr;gap:12px}.section-card{border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:14px;background:linear-gradient(180deg,rgba(64,38,92,.72),rgba(18,24,48,.86));max-height:none;overflow:visible}.section-card h3{margin:0 0 8px;color:#ffd6f6;font-size:17px}.section-block{margin-top:10px}.section-block:first-of-type{margin-top:0}.section-subtitle{margin:0 0 8px;font-size:14px;color:#fde68a;letter-spacing:.02em}.section-body{display:flex;flex-direction:column;gap:12px}.section-body p{margin:0;color:#f4edf7;line-height:1.9;word-break:keep-all;overflow-wrap:break-word}.chapter-prescription{margin-top:14px;padding:14px;border-radius:12px;border:1px solid rgba(196,181,253,.32);background:linear-gradient(145deg,rgba(72,36,126,.55),rgba(22,22,48,.72))}.chapter-prescription h4{margin:0 0 8px;color:#fef3c7}.chapter-prescription p{margin:0;color:#f4edf7;line-height:1.84}.bridge-card h2{margin:0 0 8px;color:#fff4c2}.bridge-card p{margin:0;color:#f4edf7;line-height:1.86}.notice{color:#d8c8ed;font-size:13px}.final-prescription{page-break-before:always}@media print{body{background:#070817}.cover,.chapter,.final-prescription{break-after:page}.toc ol{columns:1}}
.summary{grid-template-columns:repeat(5,minmax(0,1fr))}.executive-summary{border:1px solid rgba(251,207,232,.28);border-radius:14px;background:linear-gradient(145deg,rgba(38,18,66,.92),rgba(12,18,38,.94));padding:22px;margin:22px 0;page-break-inside:avoid}.executive-summary h2{margin:0 0 6px;color:#fff4c2}.executive-lead{margin:0 0 16px;color:#f7d7ff}.insight-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.insight-tile{border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:13px;background:rgba(255,255,255,.055)}.insight-tile strong{display:block;color:#fde68a;margin-bottom:6px}.insight-tile p{margin:0;color:#f6ecfb;line-height:1.78}.trust-strip{margin-top:14px;padding:12px 14px;border-left:3px solid #fde68a;background:rgba(253,230,138,.08);color:#eadcf8}.action-checklist{margin:12px 0 0;padding-left:20px}.action-checklist li{margin:0 0 8px;color:#f4edf7;line-height:1.76}.section-body p + p{padding-top:10px;border-top:1px solid rgba(255,255,255,.08)}@media print{body{background:#fff;color:#211827}.cover,.chapter,.bridge-card,.executive-summary,.intro,.toc{background:#fff;color:#211827;border-color:#d9c7ee}.section-card{background:#fff;color:#211827;border-color:#ded4e9}.section-body p,.chapter-prescription p,.bridge-card p,.insight-tile p,.action-checklist li{color:#211827}.chapter h2,.bridge-card h2,.executive-summary h2{color:#3b2354}.chapter-summary,.chapter-prescription,.insight-tile{background:#fbf8ff;color:#211827}.notice,.trust-strip{color:#4d405a}}
</style>
</head>
<body>
<main>
  <section class="cover">
    <p class="eyebrow">SUKUYO COMPATIBILITY PREMIUM PDF</p>
    <h1>숙요점 프리미엄 궁합 PDF</h1>
    <p class="subtitle">27개의 달별로 읽는 두 사람의 인연 지도 · 15챕터 리포트</p>
    <img src="/fuctionassets/sukyo_premium.webp" alt="숙요점 프리미엄 궁합 리포트 표지" onerror="this.style.display='none'">
    <div class="summary">
      <div><strong>본인 숙</strong>${escapeHtml(userHost)}</div>
      <div><strong>상대 숙</strong>${escapeHtml(partnerHost)}</div>
      <div><strong>관계 유형</strong>${escapeHtml(rel)}</div>
      <div><strong>거리</strong>${escapeHtml(distance)}</div>
      <div><strong>핵심 점수</strong>${escapeHtml(renderedScoreSummary.split(".")[0])}</div>
    </div>
    <p class="notice">이 문서는 두 사람의 숙요 계산 결과를 기반으로 한 관계 운영 상담 리포트입니다.</p>
  </section>
  <section class="executive-summary">
    <h2>첫눈에 보는 궁합 핵심</h2>
    <p class="executive-lead">${escapeHtml(safeName)}님과 ${escapeHtml(partnerName)}님의 관계는 먼저 결론을 보고, 이후 챕터별 세부 상담으로 깊이를 확인하는 흐름입니다.</p>
    <div class="insight-grid">
      <div class="insight-tile"><strong>관계 판정</strong><p>${escapeHtml(renderedRelationSummary)}</p></div>
      <div class="insight-tile"><strong>점수 해석</strong><p>${escapeHtml(renderedScoreSummary)}</p></div>
      <div class="insight-tile"><strong>관계 방향성</strong><p>${escapeHtml(renderedDirectionSummary)}</p></div>
      <div class="insight-tile"><strong>첫 실행 과제</strong><p>${escapeHtml(renderedFinalPrescription)}</p></div>
    </div>
    <div class="trust-strip">${escapeHtml(renderedCalendarTrust)}</div>
  </section>
  <section class="intro"><h2>해석 원칙</h2><p>본 리포트는 두 사람의 생년월일을 바탕으로 산출된 27숙 궁합 흐름을 관계 상담의 언어로 풀어낸 문서입니다. 모든 문장은 실제 관계에서 적용 가능한 선택과 행동을 중심으로 구성했습니다.</p></section>
  <section class="bridge-card"><h2>관계 유형 요약</h2><p>${escapeHtml(renderedRelationSummary)}</p></section>
  <section class="bridge-card"><h2>거리와 인연 강도 요약</h2><p>${escapeHtml(renderedDistanceSummary)} ${escapeHtml(renderedStrengthSummary)}</p></section>
  <section class="toc"><h2>15챕터 목차</h2><ol>${toc}</ol></section>
  ${chapterHtml}
  <section class="bridge-card final-prescription">
    <h2>최종 관계 처방 카드</h2>
    <p>${escapeHtml(renderedFinalPrescription)}</p>
    <ol class="action-checklist">${finalActionList}</ol>
  </section>
</main>
</body>
</html>`;

  return {
    title: `${safeName} x ${partnerName} 숙요점 프리미엄 궁합 PDF`,
    filename: `sukyo-premium-compat-${safeName}-${partnerName}.html`.replace(/\s+/g, "-"),
    html,
  };
}

export function validateSukyoPdfCompletionPayload({ pdfReady = {}, chapters = [], seed = {}, requireDownloadUrl = false } = {}) {
  const issues = [];
  const normalizedChapters = chapterArrayToRendererInput(chapters);
  const manuscript = validateRenderedManuscript(seed, normalizedChapters);
  if (!manuscript.ok) issues.push(...manuscript.issues.map((issue) => `manuscript.${issue}`));
  const chapterQuality = buildSukyoChapterQualityReport(seed, normalizedChapters);
  if (!chapterQuality.ok) issues.push(...chapterQuality.issues.map((issue) => `quality.${issue}`));

  const localAssembly = pdfReady?.localAssembly && typeof pdfReady.localAssembly === "object" ? pdfReady.localAssembly : {};
  if (localAssembly.enabled !== true) issues.push("localAssembly.enabled");
  if (text(localAssembly.source || pdfReady?.manuscriptSource || SUKYO_PDF_CONFIG.generationMode) !== SUKYO_PDF_CONFIG.generationMode) issues.push("localAssembly.source");
  if (text(localAssembly.provider || SUKYO_PDF_CONFIG.provider) !== SUKYO_PDF_CONFIG.provider) issues.push("localAssembly.provider");
  if (text(localAssembly.templateVersion) !== SUKYO_PDF_CONFIG.templateVersion) issues.push("localAssembly.templateVersion");
  if (Number(localAssembly.chapterCount || 0) !== SUKYO_PDF_CHAPTER_COUNT) issues.push("localAssembly.chapterCount");
  if (Number(localAssembly.expectedChapterCount || 0) !== SUKYO_PDF_CHAPTER_COUNT) issues.push("localAssembly.expectedChapterCount");
  if (localAssembly.externalGeneration !== false) issues.push("localAssembly.externalGeneration");
  if (localAssembly.externalCallsAllowed !== false) issues.push("localAssembly.externalCallsAllowed");

  const html = text(pdfReady?.html);
  if (!html) issues.push("html.missing");
  if (html && !/<!doctype html>/i.test(html)) issues.push("html.doctype");
  if (html && !/<meta\s+charset=["']?UTF-8["']?/i.test(html)) issues.push("html.charset");

  const downloadUrl = text(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl);
  if (requireDownloadUrl && !downloadUrl) issues.push("download_url.missing");

  const manuscriptText = normalizedChapters
    .flatMap((chapter) => [
      chapter.title,
      ...chapter.sections.flatMap((section) => [section.heading, section.body]),
    ])
    .join("\n");
  if (hasSukyoBrokenText(`${html}\n${manuscriptText}`)) issues.push("text.broken");

  return {
    ok: issues.length === 0,
    issues: [...new Set(issues)],
    chapterCount: normalizedChapters.length,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    totalLength: manuscript.totalLength,
    htmlLength: html.length,
    hasDownloadUrl: Boolean(downloadUrl),
    manuscript,
    chapterQuality,
  };
}

export function buildSukyoPdfSeed(input = {}) {
  const canonical = input.canonical || {};
  const personA = canonical.personA || {};
  const personB = canonical.personB || {};
  const canonicalCompatibility = canonical.compatibility && Object.keys(canonical.compatibility).length > 0
    ? canonical.compatibility
    : null;
  const compatibility = canonicalCompatibility || input.compatibility || {};
  const userProfile = normalizePersonInput(input.userProfile || input.user || input.self || personA || {}, "사용자");
  const partnerProfile = normalizePersonInput(input.partnerProfile || input.partner || input.partnerInput || personB || {}, "상대방");
  const userSukuyo = normalizeSukuyoStar(input.userSukyo || personA?.sukuyo || {}, userProfile);
  const partnerSukuyo = normalizeSukuyoStar(input.partnerSukyo || personB?.sukuyo || {}, partnerProfile);

  const seed = {
    mode: "compatibility",
    calculationMeta: canonical?.calculationMeta || input?.calculationMeta || {},
    userProfile,
    partnerProfile,
    userSukyo: {
      index: safeNumber(userSukuyo.index),
      nameKo: text(userSukuyo.nameKo),
      nameHan: text(userSukuyo.nameHan),
      category: text(userSukuyo.category),
      element: text(userSukuyo.element),
      keywords: safeArray(userSukuyo.keywords),
      strengths: safeArray(userSukuyo.strengths),
      shadows: safeArray(userSukuyo.shadows),
      traits: safeArray(userSukuyo.traits),
      lunarYear: safeNumber(userSukuyo.lunarYear),
      lunarMonth: safeNumber(userSukuyo.lunarMonth),
      lunarDay: safeNumber(userSukuyo.lunarDay),
      isLeapMonth: Boolean(userSukuyo.isLeapMonth),
      source: text(userSukuyo.source),
    },
    partnerSukyo: {
      index: safeNumber(partnerSukuyo.index),
      nameKo: text(partnerSukuyo.nameKo),
      nameHan: text(partnerSukuyo.nameHan),
      category: text(partnerSukuyo.category),
      element: text(partnerSukuyo.element),
      keywords: safeArray(partnerSukuyo.keywords),
      strengths: safeArray(partnerSukuyo.strengths),
      shadows: safeArray(partnerSukuyo.shadows),
      traits: safeArray(partnerSukuyo.traits),
      lunarYear: safeNumber(partnerSukuyo.lunarYear),
      lunarMonth: safeNumber(partnerSukuyo.lunarMonth),
      lunarDay: safeNumber(partnerSukuyo.lunarDay),
      isLeapMonth: Boolean(partnerSukuyo.isLeapMonth),
      source: text(partnerSukuyo.source),
    },
    compatibility: {
      relationType: text(compatibility.relationType),
      relationTypeHan: text(compatibility.relationTypeHan),
      distanceLabel: text(compatibility.distanceLabel || compatibility.distance),
      directionFromAToB: text(compatibility.directionFromAToB),
      directionFromBToA: text(compatibility.directionFromBToA),
      score: safeNumber(compatibility.score),
      temperature: safeNumber(compatibility.temperature),
      magnetism: safeNumber(compatibility.magnetism),
      compatibilityIndex: safeNumber(compatibility.compatibilityIndex),
      stamp: text(compatibility.stamp),
      relationVariant: text(compatibility.relationVariant),
      chemistryScore: safeNumber(compatibility.chemistryScore),
      stabilityScore: safeNumber(compatibility.stabilityScore),
      growthScore: safeNumber(compatibility.growthScore),
      conflictScore: safeNumber(compatibility.conflictScore),
      communicationScore: safeNumber(compatibility.communicationScore),
      enhanced: compatibility.enhanced || null,
      roleActionGuide: compatibility.roleActionGuide || null,
      elementHarmony: compatibility.elementHarmony || null,
      strengthShadowMap: compatibility.strengthShadowMap || null,
      distanceMetrics: compatibility.distanceMetrics || null,
    },
  };

  seed.localSukuyoCompatibilityJson = buildLocalCompatibilityJson(seed);
  seed.chapters = getSukyoPdfChapters();
  return seed;
}

export async function generateSukyoPremiumReport(env, seed, options = {}) {
  console.log("[SukuyoPremiumPDF][LocalCalculationStart]");
  const localJson = seed.localSukuyoCompatibilityJson || buildLocalCompatibilityJson(seed);
  seed.localSukuyoCompatibilityJson = localJson;
  const sukuyoFacts = buildSukuyoFacts(seed, localJson);
  const chapterPlans = buildSukuyoChapterPlans(seed, localJson);
  console.log("[SukuyoPremiumPDF][LocalCalculationSuccess]", {
    selfBirthDate: Boolean(text(localJson?.input?.self?.birthDate)),
    partnerBirthDate: Boolean(text(localJson?.input?.partner?.birthDate)),
    selfStar: Boolean(text(localJson?.self?.sukuyoStar)),
    partnerStar: Boolean(text(localJson?.partner?.sukuyoStar)),
    relationType: text(localJson?.relation?.typeKo),
    distance: text(localJson?.relation?.distanceLabel),
  });
  const localBaseline = buildValidatedSukyoLocalChapters(seed);
  console.log("[SukuyoPremiumPDF][LocalManuscriptValidated]", {
    chapterCount: localBaseline.chapters.length,
    totalLength: localBaseline.validation.totalLength,
    forbiddenTermsCount: localBaseline.validation.forbiddenTermsCount,
    repetitionScore: localBaseline.validation.repetitionScore,
  });

  console.log("[SukuyoPremiumPDF][LocalAssembledManuscriptReady]", {
    chapterCount: SUKYO_PDF_CHAPTER_COUNT,
    manuscriptSource: SUKYO_PDF_CONFIG.generationMode,
    localAssembly: {
      enabled: true,
      externalGeneration: false,
      externalCallsAllowed: false,
      chapterCount: localBaseline.chapters.length,
      templateVersion: SUKYO_PDF_CONFIG.templateVersion,
    },
  });
  const localAssembly = {
    enabled: true,
    source: SUKYO_PDF_CONFIG.generationMode,
    provider: SUKYO_PDF_CONFIG.provider,
    templateVersion: SUKYO_PDF_CONFIG.templateVersion,
    chapterCount: localBaseline.chapters.length,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    externalGeneration: false,
    externalCallsAllowed: false,
  };
  const chapters = localBaseline.chapters;
  const finalCheck = localBaseline.validation;
  const chapterQuality = buildSukyoChapterQualityReport(seed, chapters);
  if (!chapterQuality.ok) {
    const error = new Error("SUKUYO_CHAPTER_QUALITY_VALIDATION_FAILED");
    error.code = "SUKUYO_CHAPTER_QUALITY_VALIDATION_FAILED";
    error.status = 500;
    error.issues = chapterQuality.issues;
    throw error;
  }

  assertSukyoCompatibilityPdfComplete({
    chapters,
    expectedChapterCount: SUKYO_PDF_CHAPTER_COUNT,
    expectedSectionsByChapter: SUKYO_PDF_CHAPTERS,
  });
  console.log("[SukuyoPremiumPDF][FinalManuscriptValidated]", {
    ok: finalCheck.ok,
    issues: finalCheck.issues,
    relationType: text(localJson?.relation?.typeKo),
    distance: text(localJson?.relation?.distanceLabel),
    chapterCount: chapters.length,
    totalLength: finalCheck.totalLength,
    forbiddenTermsCount: finalCheck.forbiddenTermsCount,
    repetitionScore: finalCheck.repetitionScore,
    chapterQualityPassed: chapterQuality.ok,
    manuscriptSource: text(localAssembly.source || SUKYO_PDF_CONFIG.generationMode),
    localAssembly,
  });

  const manuscriptSource = text(localAssembly.source || SUKYO_PDF_CONFIG.generationMode);
  console.log("[SukuyoPremiumPDF][PdfRenderStart]");
  const pdfReady = renderSukyoPremiumPdf(chapters, seed);
  pdfReady.manuscriptSource = manuscriptSource;
  pdfReady.localAssembly = localAssembly;
  if (!text(pdfReady?.html)) {
    const error = new Error("숙요점 PDF 렌더링 결과가 비어 있습니다.");
    error.code = "SUKYO_PDF_RENDER_EMPTY";
    error.status = 500;
    throw error;
  }
  const pdfCompletionValidation = validateSukyoPdfCompletionPayload({
    pdfReady,
    chapters,
    seed,
    requireDownloadUrl: false,
  });
  if (!pdfCompletionValidation.ok) {
    const error = new Error("숙요점 PDF 완료 검증에 실패했습니다.");
    error.code = "SUKYO_PDF_COMPLETION_VALIDATION_FAILED";
    error.status = 500;
    error.issues = pdfCompletionValidation.issues;
    throw error;
  }
  console.log("[SukuyoPremiumPDF][PdfRenderSuccess]", {
    chapterCount: chapters.length,
    totalLength: finalCheck.totalLength,
    manuscriptSource: text(localAssembly.source || SUKYO_PDF_CONFIG.generationMode),
    localAssembly,
    pdfCompletionValidation: pdfCompletionValidation.ok,
  });
  return {
    ok: true,
    payload: {
      ...seed,
      mode: "compatibility",
      localSukuyoCompatibilityJson: localJson,
      sukuyoFacts,
      sukuyoChapterPlans: chapterPlans,
      assemblyVersion: SUKYO_PDF_CONFIG.templateVersion,
      chapters,
      manuscriptValidation: finalCheck,
      manuscriptSource,
      generationMode: SUKYO_PDF_CONFIG.generationMode,
      provider: SUKYO_PDF_CONFIG.provider,
      writingPipeline: "local-calculation-to-local-assembled-pdf",
      localAssembly,
      pdfCompletionValidation,
      chapterQuality,
      localQualityStatus: "passed",
      localBaselineChapterCount: localBaseline.chapters.length,
      qualityStatus: "passed",
    },
    chapters,
    chapterCount: SUKYO_PDF_CHAPTER_COUNT,
    localQualityStatus: "passed",
    localBaselineChapterCount: localBaseline.chapters.length,
    manuscriptSource,
    assemblyVersion: SUKYO_PDF_CONFIG.templateVersion,
    generationMode: SUKYO_PDF_CONFIG.generationMode,
    provider: SUKYO_PDF_CONFIG.provider,
    writingPipeline: "local-calculation-to-local-assembled-pdf",
    localAssembly,
    pdfCompletionValidation,
    chapterQuality,
    sukuyoFacts,
    sukuyoChapterPlans: chapterPlans,
    qualityStatus: "passed",
    serverStatus: "completed",
    pdfReady: {
      ...pdfReady,
      pdfUrl: text(pdfReady?.pdfUrl),
      htmlUrl: text(pdfReady?.htmlUrl),
      downloadUrl: text(pdfReady?.downloadUrl),
      storageKey: text(pdfReady?.storageKey),
      mimeType: text(pdfReady?.mimeType, "text/html"),
      manuscriptSource,
      localAssembly,
    },
  };
}
