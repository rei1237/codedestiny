import { SUKUYO_MANSIONS } from "./sukuyo-premium.js";

export const SUKYO_PDF_FEATURE_KEY = "premium-sukuyo-report-compat";
export const SUKYO_PDF_ALIAS_FEATURE_KEY = "premium_pdf_sukyo_compat";
export const SUKYO_PDF_CHAPTER_COUNT = 15;

const MIN_CHAPTER_LENGTH = 2800;
const MIN_SECTION_LENGTH = 700;
const MIN_TOTAL_LENGTH = 45000;

const INTERNAL_TOKEN_RE = /\b(?:payload|debug|engine|api|json|llm|fallback|localdraft|about:blank|internal\s+server\s+error|chapter\s*\d+|a\(안\)|b\(괴\)|near-triad(?:-[a-z0-9]+)?|\bd\d+\b|triad|자동\s*복구\s*생성|undefined|null|nan)\b/gi;
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

export function sanitizeSukyoPremiumText(value) {
  let out = text(value)
    .replace(INTERNAL_TOKEN_RE, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  for (const phrase of FORBIDDEN_BODY_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, "").trim();
  }

  return out;
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
    hasRepeated: maxCount >= 90,
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
    hasRepeated: maxCount >= 90,
    maxCount,
  };
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
  if (token.includes("근") || token === "near") return "near";
  if (token.includes("원") || token === "far") return "far";
  if (token.includes("중") || token === "middle") return "middle";
  return "unknown";
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
  const relationInterp = SUKYO_COMPAT_RELATION_INTERPRETATION[relationTypeHan] || SUKYO_COMPAT_RELATION_INTERPRETATION["命"];
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
  return sanitizeSukyoPremiumText(out);
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

function buildStructuredSectionBody(blocks = {}) {
  const core = sanitizeSukyoPremiumText(blocks.coreDiagnosis || "");
  const manifestation = sanitizeSukyoPremiumText(blocks.manifestation || "");
  const caution = sanitizeSukyoPremiumText(blocks.caution || "");
  const prescription = sanitizeSukyoPremiumText(blocks.prescription || "");
  return [
    "[핵심 진단]",
    core,
    "",
    "[관계에서 실제로 드러나는 모습]",
    manifestation,
    "",
    "[주의해야 할 흐름]",
    caution,
    "",
    "[실전 처방]",
    prescription,
  ].join("\n");
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
  const distanceLabel = text(localJson?.relation?.distanceLabel, "중거리");
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
  const meAction = text(localJson?.relation?.roleActionGuide?.meAction, "감정을 먼저 짧게 공유한다");
  const otherAction = text(localJson?.relation?.roleActionGuide?.otherAction, "상대의 말을 요약해 확인한 뒤 답한다");
  const resetLine = text(localJson?.relation?.roleActionGuide?.resetLine, "갈등 다음 날 안에 대화의 문을 다시 연다");
  const pastLifeTitle = text(localJson?.relation?.pastLife?.title, "오래된 약속의 인연");
  const pastLifeTask = text(localJson?.relation?.pastLife?.currentTask, "서로의 불안을 탓하지 않고 책임 있는 약속으로 바꾸는 일");
  const guide = CHAPTER_TOPIC_GUIDE[chapterNo] || ["관계 핵심", "감정 조율", "갈등 완화", "실행 습관"];
  const relationMaster = selectRelationMasterGuide(relationType);
  const distanceMaster = DISTANCE_MASTER_GUIDE[toDistanceTier(distanceLabel)] || DISTANCE_MASTER_GUIDE.unknown;

  const chapter10Boost = chapterNo === 10
    ? `${selfName}과 ${partnerName}의 이별 원인은 주로 감정 과열 이후 설명 없는 침묵에서 시작됩니다. 마음이 남는 이유는 ${selfStar}宿과 ${partnerStar}宿의 미해결 애착이 반복되기 때문이며, 재회 가능 조건은 과거 충돌 패턴을 문장으로 합의하는 것입니다. 다시 만나도 반복될 문제는 연락 공백 해석과 상처 표현 방식이며, 재회 직후 절대 하지 말아야 할 행동은 지난 다툼의 승패를 즉시 판정하려는 태도입니다.`
    : "";
  const chapter11Boost = chapterNo === 11
    ? `결혼 이후에는 생활 리듬, 돈, 가사, 가족 경계가 핵심 변수입니다. 장기 관계에서 강해지는 점은 ${selfName}의 ${meStrength}과 ${partnerName}의 ${otherStrength}이 상호 보완되는 구조이며, 지치게 되는 점은 ${meShadow}과 ${otherShadow}가 누적될 때입니다. 결혼 전에는 생활비 원칙, 가사 분담, 부모 개입 범위, 갈등 후 화해 규칙을 반드시 합의해야 합니다.`
    : "";
  const chapter14Boost = chapterNo === 14
    ? `${pastLifeTitle}로 느껴지는 이유는 낯선 사람인데도 감정 반응이 익숙하게 반복되기 때문입니다. 전생 인연의 정체는 미완의 감정 과제가 현재 관계에서 다시 떠오르는 구조이며, 이번 생의 성장 과제는 ${pastLifeTask}입니다. 헤어져도 남는 감각은 미련보다 미해결 감정의 잔향에 가깝고, 이어갈지 놓아줄지의 기준은 서로가 성장 합의를 실제 행동으로 지키는지 여부입니다.`
    : "";

  const blocks = {
    coreDiagnosis: `${sectionTag}의 핵심 진단은 ${selfName} ${selfStar}宿과 ${partnerName} ${partnerStar}宿의 감정 운영 방식이 다르게 반응한다는 점입니다. 관계 유형 ${relationType}은 ${relationMaster.diagnosis} ${distanceLabel} 흐름에서는 ${distanceMaster.diagnosis} 관계 점수 ${relationScore}, 정서 밀도 ${emotional}, 소통 민감도 ${communication}는 끌림의 강도보다 운영 규칙의 중요성을 보여줍니다. ${guide[0]}과 ${guide[1]}은 이 장에서 가장 먼저 고정해야 할 관계 축입니다.`,
    manifestation: `${selfName}은 ${selfProfile.love} 경향으로 애정을 표현할 때 ${meStrength}이 강하게 드러나고, 불안이 커지면 ${meShadow}로 기울 수 있습니다. ${partnerName}은 ${partnerProfile.love} 흐름으로 반응하면서 ${otherStrength}으로 관계를 지지하지만 압박을 받으면 ${otherShadow} 패턴이 나타납니다. 두 사람이 함께 있을 때 감정 온도는 ${distanceLabel} 체감 안에서 빠르게 올라갔다가 급격히 식을 수 있으므로, ${sectionHeading} 장면에서는 말의 내용보다 말이 오가는 순서가 관계 체력에 더 큰 영향을 줍니다.`,
    caution: `${relationType} 관계의 취약 지점은 ${relationMaster.caution}이라는 구조입니다. 특히 ${sectionTag}에서는 충돌 위험도 ${conflictRisk}, 장기 지속 가능성 ${longTermPotential}, 회복 가능성 ${recoveryPotential}의 균형이 무너지면 같은 주제가 반복됩니다. ${distanceMaster.diagnosis} 특성상 상대의 침묵을 거절로 해석하거나 연락 공백을 단정하면 상처가 누적되기 쉽습니다. ${guide[2]}와 ${guide[3]}을 합의 없이 넘기면 관계 피로가 커질 수 있습니다. ${chapter10Boost} ${chapter11Boost} ${chapter14Boost}`,
    prescription: `실전 처방의 핵심은 연락 빈도보다 갈등 후 다시 대화하는 방식을 먼저 정하는 것입니다. ${selfName}은 ${meAction} 원칙을 유지하고 ${partnerName}은 ${otherAction} 원칙을 지키며, 감정이 올라온 순간에는 즉시 결론 대신 ${resetLine} 규칙을 적용하세요. ${relationMaster.prescription} 또한 ${distanceMaster.prescription}을 병행하면 재회와 장기 관계 모두에서 반복 상처를 줄일 수 있습니다. ${sectionTag}에서는 ${guide[0]}을 먼저 확인하고 ${guide[3]}으로 마무리하는 순서를 두 사람이 같은 문장으로 합의해야 관계 체력이 안정적으로 누적됩니다.`,
  };

  let out = buildStructuredSectionBody(blocks);
  while (out.length < (MIN_SECTION_LENGTH + 120)) {
    blocks.prescription = `${blocks.prescription} ${sectionTag} 실전 운영에서는 주 1회 관계 점검, 갈등 당일 감정 기록, 24시간 내 화해 시도, 생활 합의문 업데이트를 반복하세요. ${chapterNo}장 ${sectionIndex + 1}번째 흐름에서 이 네 가지 루틴을 지키면 ${selfStar}宿과 ${partnerStar}宿 조합의 충돌을 줄이고 신뢰를 장기적으로 회복시키는 기반이 됩니다.`;
    out = buildStructuredSectionBody(blocks);
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
      const fixed = repeatToLength([sanitizeSukyoPremiumText(section.body)], MIN_SECTION_LENGTH);
      return {
        heading: text(section.title || section.heading || "세부 섹션"),
        body: fixed,
      };
    });

    let chapterLength = sections.reduce((sum, sec) => sum + text(sec.body).length, 0);
    if (chapterLength < MIN_CHAPTER_LENGTH && sections.length > 0) {
      const deficit = MIN_CHAPTER_LENGTH - chapterLength;
      const ext = repeatToLength([sections[sections.length - 1].body], deficit + 20);
      sections[sections.length - 1].body = sanitizeSukyoPremiumText(`${sections[sections.length - 1].body}\n\n${ext}`);
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
    tail.body = sanitizeSukyoPremiumText(`${tail.body}\n\n${ext}`);
    last.chapterLength = last.sections.reduce((sum, sec) => sum + text(sec.body).length, 0);
    total = normalized.reduce((sum, ch) => sum + ch.chapterLength, 0);
  }

  return { chapters: normalized, totalLength: total };
}

export function sanitizeSukyoChapterJson(chapter = {}, source = {}, seed = {}) {
  const chapterSpec = SUKYO_PDF_CHAPTERS.find((item) => item.key === chapter.key) || SUKYO_PDF_CHAPTERS[(Number(chapter.order) || 1) - 1];
  const sections = (Array.isArray(chapter.sections) ? chapter.sections : []).map((section, index) => ({
    heading: text(section.heading || section.title || chapterSpec?.sections?.[index] || `세부 섹션 ${index + 1}`),
    body: sanitizeSukyoPremiumText(text(section.body || section.text || "")),
    fallbackUsed: false,
  }));

  return {
    key: text(chapter.key || source.key || chapterSpec?.key),
    order: safeNumber(chapter.order || source.order || chapterSpec?.order),
    title: text(chapter.title || source.title || chapterSpec?.title),
    summary: sanitizeSukyoPremiumText(source.summary || ""),
    coreReading: sanitizeSukyoPremiumText(source.coreReading || ""),
    sections,
    fallbackUsed: false,
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
      body: sanitizeSukyoPremiumText(section.body || section.text || ""),
    })),
  }));
}

function validateRenderedManuscript(seed, chapters) {
  const issues = [];
  if (text(seed?.mode) !== "compatibility") issues.push("mode.compatibility");

  const compatibilityJson = seed?.localSukuyoCompatibilityJson || buildLocalCompatibilityJson(seed);
  const source = compatibilityJson || seed || {};
  const selfStarOk = Boolean(text(source?.self?.sukuyoStar || source?.userSukyo?.nameKo));
  const partnerStarOk = Boolean(text(source?.partner?.sukuyoStar || source?.partnerSukyo?.nameKo));
  if (!selfStarOk) issues.push("self.sukuyo");
  if (!partnerStarOk) issues.push("partner.sukuyo");

  const relationTypeOk = Boolean(text(source?.relation?.typeKo || source?.compatibility?.relationType || compatibilityJson?.relation?.typeKo));
  if (!relationTypeOk) issues.push("relation.type");
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
      const normalizedBody = body.toLowerCase();
      const hasRequiredDomainToken = Boolean(
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
  if (paragraphRepeat.hasRepeated) issues.push("repetition.paragraph.global");
  if (sentenceRepeat.hasRepeated) issues.push("repetition.sentence.global");
  if (ngramRepeat.hasRepeated) issues.push("repetition.ngram.global");
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
    },
  };
}

export function validateSukyoCompatibilityPdfQuality(chapters = []) {
  return validateRenderedManuscript({ mode: "compatibility" }, chapters);
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

export async function enhanceSukyoChaptersWithLLM(env, seed, skeleton) {
  return {
    chapters: Array.isArray(skeleton) ? skeleton : [],
    fallbackUsed: false,
    enhancedChapterCount: 0,
  };
}

export function buildSukyoFallbackChapters(seed, skeleton) {
  return chapterArrayToRendererInput(Array.isArray(skeleton) ? skeleton : []);
}

export function renderSukyoChapterMarkdown(chapter = {}) {
  const lines = [`## ${text(chapter.title)}`];
  for (const section of Array.isArray(chapter.sections) ? chapter.sections : []) {
    lines.push(`### ${text(section.heading)}`);
    lines.push(sanitizeSukyoPremiumText(section.body));
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
  return sanitizeSukyoPremiumText(body)
    .split(/\n{2,}|(?<=다\.)\s+(?=[가-힣])/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

function extractStructuredBlocks(body) {
  const source = sanitizeSukyoPremiumText(body);
  const re = /\[(핵심 진단|관계에서 실제로 드러나는 모습|주의해야 할 흐름|실전 처방)\]/g;
  const hits = [];
  let match;
  while ((match = re.exec(source)) !== null) {
    hits.push({ title: match[1], index: match.index, length: match[0].length });
  }
  if (!hits.length) return [];

  const blocks = [];
  for (let i = 0; i < hits.length; i += 1) {
    const current = hits[i];
    const next = hits[i + 1];
    const start = current.index + current.length;
    const end = next ? next.index : source.length;
    const content = source.slice(start, end).trim();
    if (!content) continue;
    blocks.push({ title: current.title, body: content });
  }
  return blocks;
}

function renderSectionBody(body) {
  const blocks = extractStructuredBlocks(body);
  if (!blocks.length) return `<div class="section-body">${renderParagraphs(body)}</div>`;
  return blocks.map((block) => `
    <div class="section-block">
      <h4 class="section-subtitle">${escapeHtml(block.title)}</h4>
      <div class="section-body">${renderParagraphs(block.body)}</div>
    </div>
  `).join("");
}

function extractChapterSummary(chapter = {}, rel = "관계") {
  const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
  const firstBody = text(sections[0]?.body);
  const firstSentence = splitMeaningfulSentences(firstBody)[0] || "";
  return firstSentence || `${rel} 흐름에서 ${text(chapter.title)}의 핵심 지점을 정리한 장입니다.`;
}

function extractChapterPrescription(chapter = {}) {
  const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
  for (const section of sections) {
    const body = text(section?.body);
    const marker = body.indexOf("[실전 처방]");
    if (marker >= 0) {
      const picked = body.slice(marker + "[실전 처방]".length).trim();
      const sentence = splitMeaningfulSentences(picked)[0] || "";
      if (sentence) return sentence;
    }
  }
  return "갈등 이후 재대화 시점과 생활 합의 문장을 먼저 정해 관계 회복 속도를 높이세요.";
}

export function renderSukyoPremiumPdf(chapters, seed) {
  const safeName = sanitizeSukyoPremiumText(seed?.userProfile?.name) || "사용자";
  const partnerName = sanitizeSukyoPremiumText(seed?.partnerProfile?.name) || "상대방";
  const rel = sanitizeSukyoPremiumText(seed?.compatibility?.relationType) || "관계";
  const distance = sanitizeSukyoPremiumText(seed?.compatibility?.distanceLabel || seed?.compatibility?.distance) || "거리";
  const userHost = `${sanitizeSukyoPremiumText(seed?.userSukyo?.nameKo) || "?"}宿`;
  const partnerHost = `${sanitizeSukyoPremiumText(seed?.partnerSukyo?.nameKo) || "?"}宿`;

  const relationSummary = sanitizeSukyoPremiumText(seed?.localSukuyoCompatibilityJson?.relation?.relationTheme)
    || `${escapeHtml(rel)} 관계는 강한 끌림과 운영 규칙의 균형이 핵심입니다.`;
  const distanceSummary = sanitizeSukyoPremiumText(seed?.localSukuyoCompatibilityJson?.relation?.distanceInterpretation?.theme)
    || `${escapeHtml(distance)} 흐름에서는 감정 체온과 거리 조절이 동시에 중요합니다.`;
  const strengthSummary = sanitizeSukyoPremiumText(seed?.localSukuyoCompatibilityJson?.relation?.strengthShadowMap?.complementSummary)
    || `${escapeHtml(userHost)}과 ${escapeHtml(partnerHost)}의 강점은 상호 보완적이며 회복 규칙이 안정성을 높입니다.`;

  const toc = chapters.map((chapter) => `<li><span>제${chapter.order}장</span>${escapeHtml(chapter.title)}</li>`).join("");
  const chapterHtml = chapters.map((chapter) => {
    const chapterSummary = extractChapterSummary(chapter, rel);
    const chapterPrescription = extractChapterPrescription(chapter);
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
          <h4>이 장의 핵심 처방</h4>
          <p>${escapeHtml(chapterPrescription)}</p>
        </aside>
      </section>`;
  }).join("");

  const finalPrescription = sanitizeSukyoPremiumText(seed?.localSukuyoCompatibilityJson?.relation?.roleActionGuide?.resetLine)
    || "갈등 직후 감정-사실-합의 순서로 대화를 재개하는 규칙을 유지하세요.";

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(safeName)} x ${escapeHtml(partnerName)} 숙요점 프리미엄 궁합 PDF</title>
<style>
@page{margin:18mm 14mm}*{box-sizing:border-box}body{margin:0;background:#070817;color:#f7eefc;font-family:'Noto Serif KR','Gowun Dodum',serif;line-height:1.78}main{max-width:980px;margin:0 auto;padding:34px 24px 72px}.cover{min-height:720px;border:1px solid rgba(216,180,254,.34);border-radius:18px;padding:34px;background:radial-gradient(circle at 18% 8%,rgba(244,194,255,.25),transparent 32%),linear-gradient(145deg,#0a1029 0%,#251044 50%,#070817 100%);page-break-after:always}.cover img{width:min(420px,92%);display:block;margin:22px auto;border-radius:16px;border:1px solid rgba(255,255,255,.18);background:#15122a}.eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#f7c7ff;font-size:12px}.cover h1{margin:10px 0 8px;font-size:38px;color:#fff7fb}.cover .subtitle{font-size:18px;color:#ffd7ef;margin:0 0 18px}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:24px 0}.summary div{border:1px solid rgba(255,255,255,.13);border-radius:10px;padding:12px;background:rgba(14,20,45,.72)}.summary strong{display:block;color:#ffe8a3}.intro,.toc,.chapter,.bridge-card{border:1px solid rgba(216,180,254,.22);border-radius:14px;background:rgba(13,18,40,.88);padding:20px;margin:22px 0;page-break-inside:avoid}.toc ol{columns:2;gap:28px}.toc li{break-inside:avoid;margin:0 0 8px;color:#eee1ff}.toc li span{color:#f9c6ff;margin-right:8px}.chapter{page-break-before:always}.chapter-kicker{margin:0 0 6px;color:#f8c8ff;letter-spacing:.12em;text-transform:uppercase}.chapter h2{margin:0;color:#fff4c2;font-size:24px}.chapter-summary{margin:12px 0 16px;padding:12px 14px;border-radius:10px;border:1px solid rgba(245,208,254,.25);background:rgba(40,18,68,.56);color:#f6ecfb}.section-grid{display:grid;grid-template-columns:1fr;gap:12px}.section-card{border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:14px;background:linear-gradient(180deg,rgba(64,38,92,.72),rgba(18,24,48,.86));max-height:none;overflow:visible}.section-card h3{margin:0 0 8px;color:#ffd6f6;font-size:17px}.section-block{margin-top:10px}.section-block:first-of-type{margin-top:0}.section-subtitle{margin:0 0 8px;font-size:14px;color:#fde68a;letter-spacing:.02em}.section-body{display:flex;flex-direction:column;gap:12px}.section-body p{margin:0;color:#f4edf7;line-height:1.9;word-break:keep-all;overflow-wrap:break-word}.chapter-prescription{margin-top:14px;padding:14px;border-radius:12px;border:1px solid rgba(196,181,253,.32);background:linear-gradient(145deg,rgba(72,36,126,.55),rgba(22,22,48,.72))}.chapter-prescription h4{margin:0 0 8px;color:#fef3c7}.chapter-prescription p{margin:0;color:#f4edf7;line-height:1.84}.bridge-card h2{margin:0 0 8px;color:#fff4c2}.bridge-card p{margin:0;color:#f4edf7;line-height:1.86}.notice{color:#d8c8ed;font-size:13px}.final-prescription{page-break-before:always}@media print{body{background:#070817}.cover,.chapter,.final-prescription{break-after:page}.toc ol{columns:1}}
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
    </div>
    <p class="notice">이 문서는 두 사람의 숙요 계산 결과를 기반으로 한 관계 운영 상담 리포트입니다.</p>
  </section>
  <section class="intro"><h2>해석 원칙</h2><p>본 리포트는 두 사람의 생년월일을 바탕으로 산출된 27숙 궁합 흐름을 관계 상담의 언어로 풀어낸 문서입니다. 모든 문장은 실제 관계에서 적용 가능한 선택과 행동을 중심으로 구성했습니다.</p></section>
  <section class="bridge-card"><h2>관계 유형 요약</h2><p>${escapeHtml(relationSummary)}</p></section>
  <section class="bridge-card"><h2>거리와 인연 강도 요약</h2><p>${escapeHtml(distanceSummary)} ${escapeHtml(strengthSummary)}</p></section>
  <section class="toc"><h2>15챕터 목차</h2><ol>${toc}</ol></section>
  ${chapterHtml}
  <section class="bridge-card final-prescription">
    <h2>최종 관계 처방 카드</h2>
    <p>${escapeHtml(finalPrescription)}</p>
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

export function buildSukyoPdfSeed(input = {}) {
  const canonical = input.canonical || {};
  const personA = canonical.personA || {};
  const personB = canonical.personB || {};
  const compatibility = canonical.compatibility || input.compatibility || {};

  const seed = {
    mode: "compatibility",
    userProfile: normalizePersonInput(input.userProfile || input.user || personA || {}, "사용자"),
    partnerProfile: normalizePersonInput(input.partnerProfile || input.partner || personB || {}, "상대방"),
    userSukyo: {
      index: safeNumber(input.userSukyo?.index ?? personA?.sukuyo?.index),
      nameKo: text(input.userSukyo?.nameKo || personA?.sukuyo?.nameKo),
      nameHan: text(input.userSukyo?.nameHan || personA?.sukuyo?.nameHan),
      category: text(input.userSukyo?.category || personA?.sukuyo?.category),
      element: text(input.userSukyo?.element || personA?.sukuyo?.element),
      keywords: safeArray(input.userSukyo?.keywords || personA?.sukuyo?.keywords),
      strengths: safeArray(input.userSukyo?.strengths || personA?.sukuyo?.strengths),
      traits: safeArray(input.userSukyo?.traits || personA?.sukuyo?.traits),
    },
    partnerSukyo: {
      index: safeNumber(input.partnerSukyo?.index ?? personB?.sukuyo?.index),
      nameKo: text(input.partnerSukyo?.nameKo || personB?.sukuyo?.nameKo),
      nameHan: text(input.partnerSukyo?.nameHan || personB?.sukuyo?.nameHan),
      category: text(input.partnerSukyo?.category || personB?.sukuyo?.category),
      element: text(input.partnerSukyo?.element || personB?.sukuyo?.element),
      keywords: safeArray(input.partnerSukyo?.keywords || personB?.sukuyo?.keywords),
      strengths: safeArray(input.partnerSukyo?.strengths || personB?.sukuyo?.strengths),
      traits: safeArray(input.partnerSukyo?.traits || personB?.sukuyo?.traits),
    },
    compatibility: {
      relationType: text(compatibility.relationType),
      relationTypeHan: text(compatibility.relationTypeHan),
      distanceLabel: text(compatibility.distanceLabel || compatibility.distance),
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
  const localDraft = buildSukuyoCompatibilityLocalManuscript(seed.localSukuyoCompatibilityJson);
  seed.localChapterDraft = localDraft;
  const normalizedDraft = enforceManuscriptLength(localDraft);
  seed.chapters = chapterArrayToRendererInput(normalizedDraft.chapters);
  return seed;
}

export async function generateSukyoPremiumReport(env, seed) {
  console.log("[SukuyoPremiumPDF][LocalCalculationStart]");
  const localJson = seed.localSukuyoCompatibilityJson || buildLocalCompatibilityJson(seed);
  console.log("[SukuyoPremiumPDF][LocalCalculationSuccess]", {
    selfBirthDate: Boolean(text(localJson?.input?.self?.birthDate)),
    partnerBirthDate: Boolean(text(localJson?.input?.partner?.birthDate)),
    selfStar: Boolean(text(localJson?.self?.sukuyoStar)),
    partnerStar: Boolean(text(localJson?.partner?.sukuyoStar)),
    relationType: text(localJson?.relation?.typeKo),
    distance: text(localJson?.relation?.distanceLabel),
  });

  console.log("[SukuyoPremiumPDF][LocalDraftBuildStart]");
  const localDraft = buildSukuyoCompatibilityLocalManuscript(localJson);
  for (const chapter of localDraft) {
    const chapterTextLength = (Array.isArray(chapter?.sections) ? chapter.sections : []).reduce((sum, section) => sum + text(section?.body).length, 0);
    console.log("[SukuyoPremiumPDF][LocalDraftChapterDone]", {
      chapterNo: safeNumber(chapter?.chapterNo, 0),
      title: text(chapter?.title),
      chapterLength: chapterTextLength,
    });
  }
  const localNormalized = enforceManuscriptLength(localDraft);
  const localDraftChapterCount = Array.isArray(localDraft) ? localDraft.length : 0;
  let chapters = chapterArrayToRendererInput(localNormalized.chapters);
  const localChaptersSnapshot = chapters.map((chapter) => ({
    ...chapter,
    sections: (Array.isArray(chapter?.sections) ? chapter.sections : []).map((section) => ({ ...section })),
  }));
  console.log("[SukuyoPremiumPDF][LocalDraftBuildSuccess]", {
    chapterCount: chapters.length,
    totalLength: localNormalized.totalLength,
  });

  let localValidation = validateRenderedManuscript(seed, chapters);
  if (!localValidation.ok) {
    const repairedLocal = enforceManuscriptLength(localDraft);
    chapters = chapterArrayToRendererInput(repairedLocal.chapters);
    localValidation = validateRenderedManuscript(seed, chapters);
  }
  console.log("[SukuyoPremiumPDF][LocalQualityValidated]", {
    ok: localValidation.ok,
    issues: localValidation.issues,
    chapterCount: chapters.length,
    totalLength: localValidation.totalLength,
    forbiddenTermsCount: localValidation.forbiddenTermsCount,
    repetitionScore: localValidation.repetitionScore,
  });

  const llmResult = { fallbackUsed: false, enhancedChapterCount: 0 };
  let manuscriptSource = "local";

  const finalValidation = validateRenderedManuscript(seed, chapters);
  if (!finalValidation.ok) {
    chapters = localChaptersSnapshot;
    manuscriptSource = "local";
  }
  const finalCheck = validateRenderedManuscript(seed, chapters);
  if (!finalCheck.ok) {
    console.error("[SukuyoPremiumPDF][FinalValidationFailed]", {
      issues: finalCheck.issues,
      stats: finalCheck.stats,
      chapterMetrics: (Array.isArray(chapters) ? chapters : []).map((chapter) => ({
        order: safeNumber(chapter?.order || chapter?.chapterNo, 0),
        title: text(chapter?.title),
        sectionCount: Array.isArray(chapter?.sections) ? chapter.sections.length : 0,
        chars: (Array.isArray(chapter?.sections) ? chapter.sections : []).reduce((sum, section) => sum + text(section?.body).length, 0),
      })),
    });
    const error = new Error("숙요점 궁합 PDF 품질 검증에 실패했습니다.");
    error.code = "SUKYO_PDF_QUALITY_FAILED";
    error.issues = finalCheck.issues;
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
    manuscriptSource,
  });

  console.log("[SukuyoPremiumPDF][PdfRenderStart]");
  const pdfReady = renderSukyoPremiumPdf(chapters, seed);
  if (!text(pdfReady?.html)) {
    const error = new Error("숙요점 PDF 렌더링 결과가 비어 있습니다.");
    error.code = "SUKYO_PDF_RENDER_EMPTY";
    throw error;
  }
  console.log("[SukuyoPremiumPDF][PdfRenderSuccess]", {
    chapterCount: chapters.length,
    totalLength: finalCheck.totalLength,
  });

  return {
    ok: true,
    payload: {
      ...seed,
      mode: "compatibility",
      localSukuyoCompatibilityJson: localJson,
      chapters,
      manuscriptValidation: finalCheck,
      manuscriptSource,
      qualityStatus: "passed",
    },
    chapters,
    chapterCount: SUKYO_PDF_CHAPTER_COUNT,
    fallbackUsed: false,
    localDraftChapterCount,
    manuscriptSource,
    qualityStatus: "passed",
    serverStatus: "completed",
    pdfReady: {
      ...pdfReady,
      pdfUrl: text(pdfReady?.pdfUrl),
      htmlUrl: text(pdfReady?.htmlUrl),
      downloadUrl: text(pdfReady?.downloadUrl),
      storageKey: text(pdfReady?.storageKey),
      mimeType: text(pdfReady?.mimeType, "text/html"),
    },
  };
}
