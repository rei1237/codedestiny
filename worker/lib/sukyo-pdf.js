import { callGeminiText } from "./gemini.js";

export const SUKYO_PDF_FEATURE_KEY = "premium-sukuyo-report-compat";
export const SUKYO_PDF_ALIAS_FEATURE_KEY = "premium_pdf_sukyo_compat";
export const SUKYO_PDF_CHAPTER_COUNT = 15;

const MIN_SECTION_LENGTH = 600;
const MIN_CHAPTER_LENGTH = 3000;
const CHAPTER_RETRY_LIMIT = 3;

const FORBIDDEN_BODY_TOKENS = [
  "json",
  "payload",
  "seed",
  "rawdata",
  "engine",
  "local",
  "debug",
  "fallback",
  "api",
  "llm 실패",
  "자동 복구",
  "undefined",
  "null",
  "chapter 1",
  "chapter 2",
  "chapter 3",
  "chapter 4",
  "chapter 5",
  "chapter 6",
  "chapter 7",
  "chapter 8",
  "chapter 9",
  "chapter 10",
  "chapter 11",
  "chapter 12",
  "chapter 13",
  "chapter 14",
  "chapter 15",
];

const INTERNAL_TOKEN_RE = /\b(?:payload|debug|engine|api|json|llm|fallback|localdraft|about:blank|internal\s+server\s+error|undefined|null|nan)\b/gi;

const SUKYO_COMPATIBILITY_PDF_CHAPTERS = Object.freeze([
  { key: "chapter-01-core-map", order: 1, title: "두 사람의 숙요 기본 지도 — 본명숙과 상대 숙의 첫 해석", sections: ["본인 숙의 관계 기질", "상대 숙의 관계 기질", "두 숙이 만났을 때 생기는 첫 반응", "관계의 기본 강점", "초반부터 주의해야 할 위험 신호"] },
  { key: "chapter-02-relation-type", order: 2, title: "인연 유형 판정 — 이 관계가 끌리는 방식", sections: ["관계 유형의 본질", "안괴/영친/업태/성위/위성/명의 의미", "이 인연이 강하게 느껴지는 이유", "관계가 빠르게 가까워지는 조건", "관계가 불안정해지는 조건"] },
  { key: "chapter-03-distance", order: 3, title: "거리와 온도 — 근거리·중거리·원거리의 관계 체감", sections: ["거리 판정의 의미", "가까울 때 강해지는 감정", "멀어질 때 생기는 오해", "적정 거리 조절법", "연락과 만남의 현실적 리듬"] },
  { key: "chapter-04-first-impression", order: 4, title: "첫인상과 끌림 — 왜 서로에게 반응하는가", sections: ["첫인상에서 작동하는 숙요 신호", "서로에게 매력을 느끼는 지점", "환상과 현실의 차이", "끌림이 집착으로 변하는 순간", "건강한 설렘을 유지하는 방법"] },
  { key: "chapter-05-emotion", order: 5, title: "감정 리듬 — 사랑이 깊어지는 방식과 불안의 패턴", sections: ["감정이 올라가는 속도", "불안이 생기는 타이밍", "애정 확인 방식의 차이", "정서적 안전감을 회복하는 법", "사랑을 안정시키는 루틴"] },
  { key: "chapter-06-communication", order: 6, title: "대화와 오해 — 말투, 침묵, 연락의 궁합", sections: ["대화 속도와 표현 방식", "침묵이 오해가 되는 순간", "연락 빈도와 기대치", "다툼 중 피해야 할 말투", "갈등 대화 복구 스크립트"] },
  { key: "chapter-07-love", order: 7, title: "연애 궁합 — 설렘, 애착, 질투, 안정감", sections: ["설렘과 애착의 균형", "질투와 소유욕의 작동 방식", "안정감을 느끼는 조건", "사랑이 불안으로 바뀌는 지점", "오래 가는 연애를 위한 합의"] },
  { key: "chapter-08-conflict", order: 8, title: "갈등 구조 — 반복되는 충돌과 감정 폭발 지점", sections: ["반복 충돌의 핵심 원인", "감정 폭발 전조", "서로의 약점을 건드리는 방식", "싸움이 커지는 패턴", "소모적 갈등을 끊는 방법"] },
  { key: "chapter-09-recovery", order: 9, title: "화해와 회복 — 다시 가까워지는 방법", sections: ["화해가 가능한 타이밍", "먼저 풀어야 하는 감정", "사과와 설명의 적절한 순서", "다시 가까워질 때 필요한 조건", "관계 회복을 위한 실전 문장"] },
  { key: "chapter-10-marriage", order: 10, title: "결혼·동거 궁합 — 현실 생활에서 맞춰야 할 부분", sections: ["함께 살 때 드러나는 차이", "생활 리듬과 책임 분담", "감정과 현실의 균형", "장기 관계에서 생기는 피로", "결혼·동거를 안정시키는 원칙"] },
  { key: "chapter-11-money", order: 11, title: "돈과 생활 습관 — 소비, 책임감, 생활 리듬", sections: ["돈을 대하는 태도 차이", "소비와 절약의 충돌", "책임감과 부담의 균형", "생활 습관에서 생기는 작은 갈등", "현실 문제를 감정 싸움으로 키우지 않는 법"] },
  { key: "chapter-12-family", order: 12, title: "가족·주변 인연 — 관계를 흔드는 외부 변수", sections: ["가족 개입에 대한 민감도", "친구와 주변 사람의 영향", "외부 시선에 흔들리는 지점", "둘만의 기준을 세우는 법", "관계를 보호하기 위한 경계선"] },
  { key: "chapter-13-karma", order: 13, title: "전생적 인연과 카르마 — 왜 이 인연이 강하게 느껴지는가", sections: ["숙요점에서 보는 전생적 끌림", "반복되는 인연의 과제", "업처럼 느껴지는 감정의 이유", "이 관계가 가르치는 것", "집착이 아닌 성장으로 바꾸는 법"] },
  { key: "chapter-14-long-term", order: 14, title: "장기 관계 전략 — 오래 가기 위한 선택과 거리 조절", sections: ["장기 관계의 가능성", "오래 갈수록 강해지는 장점", "시간이 지나며 커지는 위험", "관계를 유지하는 거리 조절법", "3개월·1년·3년 관계 운영 전략"] },
  { key: "chapter-15-final", order: 15, title: "최종 궁합 판정 — 이 인연을 어떻게 살릴 것인가", sections: ["두 사람의 최종 궁합 요약", "이 관계의 가장 큰 강점", "이 관계의 가장 큰 위험", "반드시 지켜야 할 관계 원칙", "이 인연을 살리기 위한 최종 조언"] },
]);

const SUKYO_PERSONAL_PDF_CHAPTERS = Object.freeze([
  { key: "chapter-01-natal", order: 1, title: "나의 본명숙 — 타고난 관계 본능", sections: ["본명숙의 핵심 기질", "내가 관계에서 먼저 보이는 모습", "마음을 여는 방식", "마음을 닫는 조건", "본명숙이 주는 첫 조언"] },
  { key: "chapter-02-emotion", order: 2, title: "감정 리듬 — 사랑과 불안의 패턴", sections: ["감정이 깊어지는 속도", "불안이 올라오는 순간", "애정 확인 방식", "혼자 있을 때 커지는 생각", "감정을 안정시키는 법"] },
  { key: "chapter-03-attraction", order: 3, title: "끌림의 구조 — 어떤 사람에게 약한가", sections: ["강하게 끌리는 사람의 유형", "설렘이 커지는 조건", "환상이 생기는 지점", "집착으로 바뀌는 순간", "건강한 끌림을 유지하는 법"] },
  { key: "chapter-04-conflict", order: 4, title: "관계 갈등 — 반복되는 오해와 상처", sections: ["자주 반복되는 갈등", "내가 예민해지는 말과 행동", "상대를 오해하는 패턴", "관계를 밀어내는 순간", "갈등을 줄이는 방법"] },
  { key: "chapter-05-love-marriage", order: 5, title: "연애와 결혼 — 오래 가는 사랑의 조건", sections: ["연애에서 중요한 기준", "결혼에서 필요한 안정감", "상대에게 기대하는 역할", "오래 가기 어려운 관계", "오래 가는 관계를 만드는 법"] },
  { key: "chapter-06-people", order: 6, title: "인간관계와 귀인 — 나를 살리는 인연", sections: ["나를 도와주는 사람", "나를 소모시키는 사람", "친구와 동료 관계의 패턴", "귀인이 나타나는 방식", "관계를 운으로 바꾸는 법"] },
  { key: "chapter-07-karma", order: 7, title: "전생적 인연과 카르마 — 반복되는 인연의 이유", sections: ["숙요점에서 보는 인연의 반복성", "강하게 남는 사람의 의미", "미련과 집착의 구조", "내가 풀어야 할 관계 과제", "카르마를 성장으로 바꾸는 법"] },
  { key: "chapter-08-weakness", order: 8, title: "나의 약점과 반전 포인트", sections: ["본명숙이 만드는 약점", "감정적으로 무너지는 조건", "피해야 할 관계 선택", "반전이 생기는 순간", "약점을 재능으로 바꾸는 법"] },
  { key: "chapter-09-strategy", order: 9, title: "앞으로의 관계 전략", sections: ["지금 필요한 거리 조절", "사랑에서 지켜야 할 기준", "인간관계에서 버려야 할 습관", "앞으로 1년 관계 전략", "인연을 잘 만나기 위한 태도"] },
  { key: "chapter-10-final", order: 10, title: "최종 숙요 조언 — 나의 인연을 살아내는 법", sections: ["본명숙 전체 요약", "가장 큰 관계 강점", "가장 조심해야 할 관계 약점", "반드시 지켜야 할 원칙", "최종 조언과 인연 선언문"] },
]);

export const SUKYO_PDF_CHAPTERS = SUKYO_COMPATIBILITY_PDF_CHAPTERS;

const CHAPTER_REQUIRED_KEYWORDS = Object.freeze({
  compatibility: {
    6: ["말투", "침묵", "연락", "복구"],
    10: ["생활", "책임", "장기", "동거"],
    11: ["돈", "소비", "책임", "생활"],
    13: ["전생", "반복", "업", "성장"],
    15: ["강점", "위험", "원칙", "조언"],
  },
  personal: {
    10: ["강점", "약점", "원칙", "선언"],
  },
});

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
  if (["personal", "single", "solo", "natal"].some((token) => mode.includes(token))) return "personal";
  return "compatibility";
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

  for (const token of FORBIDDEN_BODY_TOKENS) {
    const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, "").trim();
  }
  return out;
}

function normalizeKoreanText(value) {
  return text(value)
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function splitMeaningfulSentences(value) {
  return text(value)
    .split(/[.!?。？！\n]+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 24);
}

function hasRepeatedParagraphs(chapters) {
  const paragraphs = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => (Array.isArray(chapter.sections) ? chapter.sections : []))
    .flatMap((section) => text(section.body).split(/\n{2,}/))
    .map((p) => p.trim())
    .filter((p) => p.length >= 80);

  const seen = new Set();
  for (const p of paragraphs) {
    const key = normalizeKoreanText(p);
    if (!key) continue;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function containsForbiddenText(value) {
  const body = text(value).toLowerCase();
  return FORBIDDEN_BODY_TOKENS.some((token) => body.includes(token.toLowerCase()));
}

function computeRepetitionScore(value) {
  const lines = splitMeaningfulSentences(value);
  if (!lines.length) return 1;
  const seen = new Map();
  for (const line of lines) seen.set(line, (seen.get(line) || 0) + 1);
  let repeatedCount = 0;
  for (const count of seen.values()) {
    if (count >= 2) repeatedCount += count;
  }
  return repeatedCount / Math.max(1, lines.length);
}

export function isLowQualityShukuyoSection(value) {
  const body = text(value);
  if (!body || body.length < MIN_SECTION_LENGTH) return true;
  if (containsForbiddenText(body)) return true;
  if (computeRepetitionScore(body) >= 0.4) return true;
  return false;
}

function getChapterSpecs(mode = "compatibility") {
  return mode === "personal" ? SUKYO_PERSONAL_PDF_CHAPTERS : SUKYO_COMPATIBILITY_PDF_CHAPTERS;
}

export function getSukyoPdfChapters(mode = "compatibility") {
  return getChapterSpecs(mode).map((chapter) => ({
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

  const selfDate = parseDateParts(normalized.self.birthDate);
  const partnerDate = parseDateParts(normalized.partner.birthDate);

  if (!selfDate) hardMissingFields.push("self.birthDate");
  if (normalized.mode === "compatibility" && !partnerDate) hardMissingFields.push("partner.birthDate");
  if (normalized.mode === "compatibility" && !text(normalized.sukuyoResult.relationshipType)) {
    hardMissingFields.push("compatibility.relationType");
  }

  if (normalized.self.isTimeUnknown) softMissingFields.push("self.birthTime");
  if (normalized.mode === "compatibility" && normalized.partner.isTimeUnknown) softMissingFields.push("partner.birthTime");

  return {
    canGenerate: hardMissingFields.length === 0,
    reportMode: normalized.mode,
    hardMissingFields,
    softMissingFields,
    payloadValidation: { missingFields: hardMissingFields.slice() },
    normalized,
  };
}

function dedupeSignals(items, limit = 8) {
  return Array.from(new Set(safeArray(items).map((v) => text(v)).filter(Boolean))).slice(0, limit);
}

function mapDistance(raw) {
  const token = text(raw).toLowerCase();
  if (token.includes("근") || token === "near") return "near";
  if (token.includes("중") || token === "middle") return "middle";
  if (token.includes("원") || token === "far") return "far";
  return token || "unknown";
}

function extractSukyoSignals(star = {}, prefix = "") {
  return {
    宿: text(star.nameHan || star.nameKo),
    宿Label: text(star.nameKo || star.nameHan),
    宿Index: safeNumber(star.index),
    moonMansionGroup: text(star.category),
    personalityKeywords: dedupeSignals([...(safeArray(star.traits)), ...(safeArray(star.keywords))]),
    loveStyleKeywords: dedupeSignals([...(safeArray(star.strengths)), ...(safeArray(star.keywords)).slice(0, 3)]),
    conflictStyleKeywords: dedupeSignals([`${prefix}관계속도`, `${prefix}감정경계`, ...(safeArray(star.keywords)).slice(0, 2)]),
    emotionalPatternKeywords: dedupeSignals([`${prefix}정서리듬`, `${prefix}애착반응`, ...(safeArray(star.traits)).slice(0, 2)]),
  };
}

export function buildSukyoPdfSeed(input = {}) {
  const mode = normalizeMode(input.mode || input.reportMode || "compatibility");
  const canonical = input.canonical || {};
  const personA = canonical.personA || {};
  const personB = canonical.personB || {};
  const compatibility = canonical.compatibility || input.compatibility || {};

  const personASeed = extractSukyoSignals(input.userSukyo || personA?.sukuyo || {}, "A");
  const personBSeed = mode === "compatibility" ? extractSukyoSignals(input.partnerSukyo || personB?.sukuyo || {}, "B") : null;

  const relationType = text(compatibility.relationType);
  const distanceLabel = text(compatibility.distanceLabel || compatibility.distance);

  const seed = {
    mode,
    input: {
      personA: normalizePersonInput(input.userProfile || input.user || personA || {}, "사용자"),
      ...(mode === "compatibility" ? { personB: normalizePersonInput(input.partnerProfile || input.partner || personB || {}, "상대방") } : {}),
    },
    personA: personASeed,
    ...(mode === "compatibility" ? { personB: personBSeed } : {}),
    ...(mode === "compatibility" ? {
      compatibility: {
        relationType,
        relationTypeLabel: relationType,
        relationTypeKeywords: dedupeSignals([relationType, text(compatibility.relationVariant)]),
        distance: mapDistance(distanceLabel),
        distanceLabel,
        distanceKeywords: dedupeSignals([distanceLabel, text(compatibility?.distanceMetrics?.tensionBand)]),
        score: safeNumber(compatibility.compatibilityIndex),
        attractionSignals: dedupeSignals([text(compatibility.relationVariant), text(compatibility?.elementHarmony?.summary)]),
        conflictSignals: dedupeSignals([text(compatibility?.strengthShadowMap?.a?.shadow), text(compatibility?.strengthShadowMap?.b?.shadow)]),
        communicationSignals: dedupeSignals([text(compatibility?.roleActionGuide?.meAction), text(compatibility?.roleActionGuide?.otherAction)]),
        loveSignals: dedupeSignals([relationType, distanceLabel]),
        marriageSignals: dedupeSignals([text(compatibility?.elementHarmony?.summary), text(compatibility?.distanceMetrics?.tensionBand)]),
        recoverySignals: dedupeSignals([text(compatibility?.roleActionGuide?.resetLine), text(compatibility?.roleActionGuide?.meAction)]),
        karmicSignals: dedupeSignals([relationType, text(compatibility.relationVariant)]),
        longTermStrategySignals: dedupeSignals([distanceLabel, text(compatibility?.roleActionGuide?.resetLine)]),
      },
    } : {}),
    derivedSignals: {
      coreThemeSignals: dedupeSignals([text(personASeed.宿Label), text(personBSeed?.宿Label), relationType]),
      relationshipSignals: dedupeSignals([relationType, distanceLabel, text(compatibility.relationVariant)]),
      emotionalSignals: dedupeSignals([...(personASeed.emotionalPatternKeywords || []), ...(personBSeed?.emotionalPatternKeywords || [])]),
      communicationSignals: dedupeSignals([text(compatibility?.roleActionGuide?.meAction), text(compatibility?.roleActionGuide?.otherAction)]),
      conflictSignals: dedupeSignals([text(compatibility?.strengthShadowMap?.a?.shadow), text(compatibility?.strengthShadowMap?.b?.shadow)]),
      recoverySignals: dedupeSignals([text(compatibility?.roleActionGuide?.resetLine)]),
      karmaSignals: dedupeSignals([relationType, text(compatibility.relationVariant)]),
      practicalAdviceSignals: dedupeSignals([distanceLabel, text(compatibility?.roleActionGuide?.meAction)]),
    },
    strengths: dedupeSignals([...(personASeed.personalityKeywords || []).slice(0, 3), text(compatibility?.elementHarmony?.summary)]),
    cautionFlags: dedupeSignals([text(compatibility?.strengthShadowMap?.a?.shadow), text(compatibility?.strengthShadowMap?.b?.shadow), text(compatibility?.distanceMetrics?.tensionBand)]),
    unresolvedThemes: dedupeSignals([text(compatibility.relationVariant), text(compatibility?.roleActionGuide?.resetLine)]),
  };

  return seed;
}

export function validateSukyoPdfSeed(seed = {}) {
  const issues = [];
  const mode = normalizeMode(seed?.mode || seed?.reportMode || "compatibility");
  const personAName = text(seed?.input?.personA?.name || seed?.userProfile?.name || seed?.user?.name || seed?.personA?.name || seed?.personA?.宿Label || seed?.personA?.宿);
  const personBName = text(seed?.input?.personB?.name || seed?.partnerProfile?.name || seed?.partner?.name || seed?.personB?.name || seed?.personB?.宿Label || seed?.personB?.宿);
  const personAHost = text(seed?.personA?.宿Label || seed?.personA?.宿 || seed?.input?.personA?.宿Label || seed?.input?.personA?.宿);
  const personBHost = text(seed?.personB?.宿Label || seed?.personB?.宿 || seed?.input?.personB?.宿Label || seed?.input?.personB?.宿);
  const relationType = text(seed?.compatibility?.relationTypeLabel || seed?.compatibility?.relationType);
  const distance = text(seed?.compatibility?.distanceLabel || seed?.compatibility?.distance);

  if (!text(mode)) issues.push("mode");
  if (!personAName && !personAHost) issues.push("personA");
  if (mode === "compatibility" && !personBName && !personBHost) issues.push("personB");
  if (mode === "compatibility" && !relationType) issues.push("compatibility.relationType");
  if (mode === "compatibility" && !distance) issues.push("compatibility.distance");

  const coreSignals = Array.isArray(seed?.derivedSignals?.coreThemeSignals) ? seed.derivedSignals.coreThemeSignals.filter(Boolean) : [];
  if (!coreSignals.length) issues.push("derivedSignals.coreThemeSignals");

  return {
    ok: issues.length === 0,
    issues,
    mode,
  };
}

function chapterSpecByOrder(mode, chapterNo) {
  return getChapterSpecs(mode).find((spec) => Number(spec.order) === Number(chapterNo));
}

function summarizeChapter(chapter) {
  const parts = (Array.isArray(chapter?.sections) ? chapter.sections : []).slice(0, 2).map((s) => text(s.body).slice(0, 110));
  return { order: chapter?.order, title: chapter?.title, highlights: parts };
}

export function buildSukyoGeminiPrompt(seed, chapterSpec, previousChapterSummaries = [], retryHints = []) {
  return JSON.stringify({
    role: "숙요점 27숙 프리미엄 리포트 전문 상담가",
    instruction: [
      "계산은 이미 완료되었으며 새 계산을 하지 않는다.",
      "로컬 원고를 고치지 말고 챕터 본문을 처음부터 새로 작성한다.",
      "제공된 chapterSpec의 제목과 section 제목을 절대 변경하지 않는다.",
      `모든 section body는 최소 ${MIN_SECTION_LENGTH}자 이상으로 작성한다.`,
      "같은 문장 구조를 반복하지 않는다.",
      "JSON/seed/payload/local/fallback/API/LLM 실패 같은 기술 문구를 출력하지 않는다.",
      "compatibility 모드에서는 두 사람의 관계 운영에 집중한다.",
      "personal 모드에서는 개인의 관계 본능과 반복 패턴에 집중한다.",
      "제공되지 않은 숙/관계유형/거리/점수를 임의 생성하지 않는다.",
      "반드시 JSON만 반환한다.",
    ],
    outputSchema: {
      chapter: {
        key: "string",
        order: "number",
        title: "string",
        sections: [{ heading: "string", body: "string" }],
      },
    },
    mode: seed?.mode,
    seed,
    chapterSpec,
    previousChapterSummaries,
    retryHints,
    styleGuide: {
      tone: "따뜻하고 단정한 상담체",
      focus: "행동 가능한 관계 운영 가이드",
      avoid: ["판결형 단정", "운명 과장", "기술 용어 노출"],
    },
  });
}

function parseJsonMaybe(value) {
  try {
    return JSON.parse(text(value));
  } catch {
    return null;
  }
}

export function parseSukyoGeminiChapterResponse(value) {
  const parsed = parseJsonMaybe(value);
  if (parsed && parsed.chapter) return parsed.chapter;
  return parsed;
}

function normalizeChapterFromLLM(rawChapter, chapterSpec) {
  const sections = (Array.isArray(rawChapter?.sections) ? rawChapter.sections : []).map((section, index) => ({
    heading: text(section?.heading || section?.title || chapterSpec.sections[index]),
    body: sanitizeSukyoPremiumText(section?.body || section?.text || ""),
  }));

  return {
    key: text(rawChapter?.key || chapterSpec.key),
    order: Number(rawChapter?.order || chapterSpec.order),
    title: text(rawChapter?.title || chapterSpec.title),
    sections,
  };
}

function validateSukyoChapterOrThrow(chapter, chapterSpec) {
  const issues = [];
  if (text(chapter?.key) !== text(chapterSpec.key)) issues.push("key");
  if (Number(chapter?.order) !== Number(chapterSpec.order)) issues.push("order");
  if (text(chapter?.title) !== text(chapterSpec.title)) issues.push("title");

  const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
  if (sections.length !== chapterSpec.sections.length) issues.push("section_count");

  let chapterLength = 0;
  sections.forEach((section, idx) => {
    const heading = text(section?.heading);
    const body = text(section?.body);
    if (heading !== chapterSpec.sections[idx]) issues.push(`section_heading_${idx + 1}`);
    if (body.length < MIN_SECTION_LENGTH) issues.push(`section_length_${idx + 1}`);
    if (containsForbiddenText(body)) issues.push(`section_forbidden_${idx + 1}`);
    if (computeRepetitionScore(body) >= 0.4) issues.push(`section_repetition_${idx + 1}`);
    chapterLength += body.length;
  });

  if (chapterLength < MIN_CHAPTER_LENGTH) issues.push("chapter_length");

  if (issues.length) {
    const error = new Error(`SUKYO_CHAPTER_INVALID:${chapterSpec.order}:${issues.join(",")}`);
    error.code = "SUKYO_CHAPTER_INVALID";
    error.issues = issues;
    throw error;
  }
}

function chapterIncludesKeywords(chapter, keywords) {
  const body = (Array.isArray(chapter?.sections) ? chapter.sections : [])
    .map((section) => text(section.body))
    .join("\n")
    .toLowerCase();

  return (Array.isArray(keywords) ? keywords : []).every((keyword) => body.includes(String(keyword).toLowerCase()));
}

export function validateSukyoPdfLLMInterpretationQuality({ mode = "compatibility", chapters = [], expectedChapters = [], seed = {} } = {}) {
  const issues = [];
  if (!Array.isArray(chapters) || chapters.length !== expectedChapters.length) {
    issues.push("chapter_count_mismatch");
  }

  expectedChapters.forEach((spec) => {
    const chapter = (Array.isArray(chapters) ? chapters : []).find((c) => Number(c.order) === Number(spec.order));
    if (!chapter) {
      issues.push(`chapter_missing_${spec.order}`);
      return;
    }

    if (text(chapter.title) !== text(spec.title)) issues.push(`chapter_title_${spec.order}`);
    const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
    if (sections.length !== spec.sections.length) issues.push(`section_count_${spec.order}`);

    let chapterLength = 0;
    sections.forEach((section, idx) => {
      const body = text(section.body);
      chapterLength += body.length;
      if (text(section.heading) !== text(spec.sections[idx])) issues.push(`section_heading_${spec.order}_${idx + 1}`);
      if (body.length < MIN_SECTION_LENGTH) issues.push(`section_short_${spec.order}_${idx + 1}`);
      if (containsForbiddenText(body)) issues.push(`section_forbidden_${spec.order}_${idx + 1}`);
      if (computeRepetitionScore(body) >= 0.4) issues.push(`section_repeat_${spec.order}_${idx + 1}`);
    });

    if (chapterLength < MIN_CHAPTER_LENGTH) issues.push(`chapter_short_${spec.order}`);

    const required = CHAPTER_REQUIRED_KEYWORDS[mode]?.[spec.order];
    if (required && !chapterIncludesKeywords(chapter, required)) {
      issues.push(`chapter_keywords_${spec.order}`);
    }
  });

  const fullText = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => (Array.isArray(chapter.sections) ? chapter.sections : []))
    .map((section) => text(section.body))
    .join("\n")
    .toLowerCase();

  if (hasRepeatedParagraphs(chapters)) issues.push("paragraph_repeat_global");
  if (containsForbiddenText(fullText)) issues.push("forbidden_global");

  if (mode === "compatibility") {
    const personA = text(seed?.personA?.宿Label || seed?.personA?.宿);
    const personB = text(seed?.personB?.宿Label || seed?.personB?.宿);
    const relation = text(seed?.compatibility?.relationTypeLabel || seed?.compatibility?.relationType);
    const distance = text(seed?.compatibility?.distanceLabel || seed?.compatibility?.distance);

    if (personA && !fullText.includes(personA.toLowerCase())) issues.push("compat_personA_missing");
    if (personB && !fullText.includes(personB.toLowerCase())) issues.push("compat_personB_missing");
    if (relation && !fullText.includes(relation.toLowerCase())) issues.push("compat_relation_missing");
    if (distance && !fullText.includes(distance.toLowerCase())) issues.push("compat_distance_missing");
  }

  if (mode === "personal") {
    const personA = text(seed?.personA?.宿Label || seed?.personA?.宿);
    if (personA && !fullText.includes(personA.toLowerCase())) issues.push("personal_personA_missing");
  }

  return { ok: issues.length === 0, issues };
}

export function validateSukyoCompatibilityPdfQuality(chapters = []) {
  return validateSukyoPdfLLMInterpretationQuality({
    mode: "compatibility",
    chapters,
    expectedChapters: SUKYO_COMPATIBILITY_PDF_CHAPTERS,
    seed: {},
  });
}

export function assertSukyoCompatibilityPdfComplete({ chapters = [], expectedChapterCount = SUKYO_PDF_CHAPTER_COUNT, expectedSectionsByChapter = SUKYO_PDF_CHAPTERS } = {}) {
  const issues = [];
  if (!Array.isArray(chapters) || chapters.length !== expectedChapterCount) issues.push("chapter_count_mismatch");

  for (let idx = 0; idx < expectedSectionsByChapter.length; idx += 1) {
    const spec = expectedSectionsByChapter[idx];
    const chapterNo = idx + 1;
    const chapter = (Array.isArray(chapters) ? chapters : []).find((item) => Number(item.order || item.chapterNo) === chapterNo);
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

  if (hasRepeatedParagraphs(chapters)) issues.push("repeated_paragraphs");
  if (issues.length) {
    const error = new Error(`SUKYO_PDF_INCOMPLETE:${issues.join(",")}`);
    error.code = "SUKYO_PDF_INCOMPLETE";
    error.issues = issues;
    throw error;
  }

  return { ok: true };
}

export function sanitizeSukyoChapterJson(chapter = {}, source = {}, seed = {}) {
  const chapterSpec = SUKYO_PDF_CHAPTERS.find((item) => item.key === chapter.key) || SUKYO_PDF_CHAPTERS[(Number(chapter.order) || 1) - 1];
  const inputSections = Array.isArray(chapter.sections) ? chapter.sections : [];
  const sections = inputSections.map((section, index) => ({
    heading: text((section && typeof section === "object" ? (section.heading || section.title) : "") || chapterSpec?.sections?.[index] || `세부 섹션 ${index + 1}`),
    body: sanitizeSukyoPremiumText(text(section.body || section.text || "")),
    fallbackUsed: false,
  }));

  return {
    key: text(chapter.key || source.key || chapterSpec?.key),
    order: safeNumber(chapter.order || source.order || chapterSpec?.order),
    title: text(chapter.title || source.title || chapterSpec?.title),
    summary: "",
    coreReading: "",
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

async function generateSukyoChapterByLLM({ env, mode, seed, chapterSpec, previousChapterSummaries, options = {} }) {
  const failures = [];
  const llmChapterGenerator = typeof options.llmChapterGenerator === "function" ? options.llmChapterGenerator : null;

  for (let attempt = 1; attempt <= CHAPTER_RETRY_LIMIT; attempt += 1) {
    try {
      const result = llmChapterGenerator
        ? await llmChapterGenerator({ seed, chapterSpec, previousChapterSummaries, attempt, failures })
        : await callGeminiText(env, buildSukyoGeminiPrompt(seed, chapterSpec, previousChapterSummaries, failures), {
          modelEnvKeys: ["SUKYO_PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"],
          temperature: 0.45,
          maxOutputTokens: Number(env.SUKYO_PREMIUM_GEMINI_MAX_TOKENS || 9000),
          timeoutMs: Number(env.SUKYO_PREMIUM_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 60000),
          totalTimeoutMs: Number(env.SUKYO_PREMIUM_GEMINI_TOTAL_TIMEOUT_MS || 90000),
          maxAttemptsPerPair: Number(env.SUKYO_PREMIUM_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 2),
        });

      if (!result?.ok) {
        throw new Error(`LLM_REQUEST_NOT_OK:${attempt}`);
      }

      const parsed = parseSukyoGeminiChapterResponse(result.text);
      const chapter = normalizeChapterFromLLM(parsed, chapterSpec);
      validateSukyoChapterOrThrow(chapter, chapterSpec);
      return chapter;
    } catch (error) {
      failures.push({ attempt, reason: text(error?.message || "unknown") });
      if (attempt >= CHAPTER_RETRY_LIMIT) {
        const fail = new Error(`SUKYO_CHAPTER_RETRY_EXHAUSTED:${chapterSpec.order}`);
        fail.code = "SUKYO_CHAPTER_RETRY_EXHAUSTED";
        fail.chapterNo = chapterSpec.order;
        fail.failures = failures;
        throw fail;
      }
    }
  }

  throw new Error("SUKYO_CHAPTER_UNREACHABLE");
}

export async function enhanceSukyoChaptersWithLLM(env, seed, skeleton, options = {}) {
  const mode = normalizeMode(seed?.mode || "compatibility");
  const specs = getChapterSpecs(mode);
  const completed = [];
  for (const spec of specs) {
    const chapter = await generateSukyoChapterByLLM({
      env,
      mode,
      seed,
      chapterSpec: spec,
      previousChapterSummaries: completed.map(summarizeChapter),
      options,
    });
    completed.push(chapter);
  }
  return { chapters: completed, fallbackUsed: completed.some((chapter) => Boolean(chapter?.fallbackUsed)), enhancedChapterCount: completed.length };
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
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderSukyoPremiumPdf(chapters, seed) {
  const safeName = sanitizeSukyoPremiumText(seed?.input?.personA?.name) || "사용자";
  const partnerName = sanitizeSukyoPremiumText(seed?.input?.personB?.name) || "상대방";
  const rel = sanitizeSukyoPremiumText(seed?.compatibility?.relationTypeLabel || seed?.compatibility?.relationType) || "관계";
  const distance = sanitizeSukyoPremiumText(seed?.compatibility?.distanceLabel || seed?.compatibility?.distance) || "거리";
  const userHost = `${sanitizeSukyoPremiumText(seed?.personA?.宿Label || seed?.personA?.宿) || "?"}宿`;
  const partnerHost = `${sanitizeSukyoPremiumText(seed?.personB?.宿Label || seed?.personB?.宿) || "?"}宿`;

  const toc = chapters.map((chapter) => `<li><span>제${chapter.order}장</span>${escapeHtml(chapter.title)}</li>`).join("");
  const chapterHtml = chapters.map((chapter) => {
    const sections = chapter.sections.map((section) => `
      <article class="section-card">
        <h3>${escapeHtml(section.heading)}</h3>
        <p>${escapeHtml(sanitizeSukyoPremiumText(section.body)).replace(/\n/g, "<br>")}</p>
      </article>`).join("");

    return `
      <section class="chapter">
        <p class="chapter-kicker">제${chapter.order}장</p>
        <h2>${escapeHtml(chapter.title)}</h2>
        <div class="section-grid">${sections}</div>
      </section>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(safeName)} x ${escapeHtml(partnerName)} 숙요점 프리미엄 궁합 PDF</title>
<style>
@page{margin:18mm 14mm}*{box-sizing:border-box}body{margin:0;background:#070817;color:#f7eefc;font-family:'Noto Serif KR','Gowun Dodum',serif;line-height:1.78}main{max-width:980px;margin:0 auto;padding:34px 24px 72px}.cover{min-height:720px;border:1px solid rgba(216,180,254,.34);border-radius:18px;padding:34px;background:radial-gradient(circle at 18% 8%,rgba(244,194,255,.25),transparent 32%),linear-gradient(145deg,#0a1029 0%,#251044 50%,#070817 100%);page-break-after:always}.cover img{width:min(420px,92%);display:block;margin:22px auto;border-radius:16px;border:1px solid rgba(255,255,255,.18);background:#15122a}.eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#f7c7ff;font-size:12px}.cover h1{margin:10px 0 8px;font-size:38px;color:#fff7fb}.cover .subtitle{font-size:18px;color:#ffd7ef;margin:0 0 18px}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:24px 0}.summary div{border:1px solid rgba(255,255,255,.13);border-radius:10px;padding:12px;background:rgba(14,20,45,.72)}.summary strong{display:block;color:#ffe8a3}.intro,.toc,.chapter{border:1px solid rgba(216,180,254,.22);border-radius:14px;background:rgba(13,18,40,.88);padding:20px;margin:22px 0;page-break-inside:avoid}.toc ol{columns:2;gap:28px}.toc li{break-inside:avoid;margin:0 0 8px;color:#eee1ff}.toc li span{color:#f9c6ff;margin-right:8px}.chapter{page-break-before:always}.chapter-kicker{margin:0 0 6px;color:#f8c8ff;letter-spacing:.12em;text-transform:uppercase}.chapter h2{margin:0 0 16px;color:#fff4c2;font-size:24px}.section-grid{display:grid;grid-template-columns:1fr;gap:12px}.section-card{border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:14px;background:linear-gradient(180deg,rgba(64,38,92,.72),rgba(18,24,48,.86))}.section-card h3{margin:0 0 8px;color:#ffd6f6;font-size:17px}.section-card p{margin:0;color:#f4edf7;white-space:normal}.notice{color:#d8c8ed;font-size:13px}@media print{body{background:#070817}.cover,.chapter{break-after:page}.toc ol{columns:1}}
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
    <p class="notice">이 문서는 두 사람의 생년월일 기반 숙요 해석 리포트입니다.</p>
  </section>
  <section class="intro"><h2>해석 원칙</h2><p>각 장은 주제별로 분리된 상담 관점으로 구성되며, 반복 문장 없이 관계 운영 전략을 제시합니다.</p></section>
  <section class="toc"><h2>15챕터 목차</h2><ol>${toc}</ol></section>
  ${chapterHtml}
</main>
</body>
</html>`;

  return {
    title: `${safeName} x ${partnerName} 숙요점 프리미엄 궁합 PDF`,
    filename: `sukyo-premium-compat-${safeName}-${partnerName}.html`.replace(/\s+/g, "-"),
    html,
  };
}

function buildFailureWithRefundMessage(reason, code = "SUKYO_PDF_GENERATION_FAILED") {
  const error = new Error("숙요점 PDF 생성이 완료되지 않아 사용된 코인이 자동으로 환불되었습니다. 다시 시도해 주세요.");
  error.code = code;
  error.reason = reason;
  error.status = 502;
  return error;
}

export async function generateSukyoPremiumReport(env, seed, options = {}) {
  const mode = normalizeMode(seed?.mode || "compatibility");
  const chapterSpecs = getChapterSpecs(mode);
  const seedValidation = validateSukyoPdfSeed(seed);

  if (!seedValidation.ok) {
    const error = new Error(`SUKYO_PDF_SEED_INVALID:${seedValidation.issues.join(",")}`);
    error.code = "SUKYO_PDF_SEED_INVALID";
    error.status = 422;
    error.details = seedValidation;
    throw error;
  }

  console.log("[SukuyoPremiumPDF][SeedReady]", {
    mode,
    chapterCount: chapterSpecs.length,
    personA: text(seed?.personA?.宿Label || seed?.personA?.宿),
    personB: text(seed?.personB?.宿Label || seed?.personB?.宿),
    relationType: text(seed?.compatibility?.relationType),
    distance: text(seed?.compatibility?.distanceLabel),
  });

  const chapters = [];

  try {
    for (const chapterSpec of chapterSpecs) {
      const chapter = await generateSukyoChapterByLLM({
        env,
        mode,
        seed,
        chapterSpec,
        previousChapterSummaries: chapters.map(summarizeChapter),
        options,
      });

      chapters.push(chapter);
      console.log("[SukuyoPremiumPDF][ChapterCompleted]", {
        chapterNo: chapterSpec.order,
        chapterTitle: chapterSpec.title,
        completed: chapters.length,
        total: chapterSpecs.length,
      });
    }
  } catch (error) {
    console.error("[SukuyoPremiumPDF][ChapterGenerationFailed]", {
      code: text(error?.code),
      chapterNo: safeNumber(error?.chapterNo),
      message: text(error?.message),
    });
    throw buildFailureWithRefundMessage("chapter_generation_failed", "SUKYO_LLM_CHAPTER_FAILED");
  }

  const normalizedChapters = chapterArrayToRendererInput(chapters);
  const quality = validateSukyoPdfLLMInterpretationQuality({
    mode,
    chapters: normalizedChapters,
    expectedChapters: chapterSpecs,
    seed,
  });

  if (!quality.ok) {
    console.error("[SukuyoPremiumPDF][QualityFailed]", { issues: quality.issues });
    throw buildFailureWithRefundMessage("quality_failed", "SUKYO_PDF_QUALITY_FAILED");
  }

  assertSukyoCompatibilityPdfComplete({
    chapters: mode === "compatibility" ? normalizedChapters : [],
    expectedChapterCount: mode === "compatibility" ? SUKYO_PDF_CHAPTER_COUNT : 0,
    expectedSectionsByChapter: mode === "compatibility" ? SUKYO_PDF_CHAPTERS : [],
  });

  const pdfReady = renderSukyoPremiumPdf(normalizedChapters, seed);
  console.log("[SukuyoPremiumPDF][PdfRenderSuccess]", {
    chapterCount: normalizedChapters.length,
    mode,
    fallbackUsed: false,
  });

  const reportJson = {
    mode,
    seed,
    chapters: normalizedChapters,
    chapterCount: normalizedChapters.length,
    qualityStatus: "passed",
    fallbackUsed: false,
  };

  return {
    payload: {
      mode,
      seed,
      chapters: normalizedChapters,
      reportJson,
      manuscriptSource: "llm-only",
      qualityStatus: "passed",
    },
    chapters: normalizedChapters,
    chapterCount: normalizedChapters.length,
    fallbackUsed: false,
    localDraftChapterCount: 0,
    manuscriptSource: "llm-only",
    qualityStatus: "passed",
    serverStatus: "completed",
    pdfReady,
    reportJson,
  };
}
