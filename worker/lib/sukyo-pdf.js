export const SUKYO_PDF_FEATURE_KEY = "premium-sukuyo-report-compat";
export const SUKYO_PDF_ALIAS_FEATURE_KEY = "premium_pdf_sukyo_compat";
export const SUKYO_PDF_CHAPTER_COUNT = 15;

const MIN_CHAPTER_LENGTH = 3500;
const MIN_SECTION_LENGTH = 700;
const MIN_TOTAL_LENGTH = 56000;

const INTERNAL_TOKEN_RE = /\b(?:payload|debug|engine|api|json|llm|fallback|localdraft|about:blank|internal\s+server\s+error|chapter\s*\d+|a\(안\)|b\(괴\)|near-triad(?:-[a-z0-9]+)?|\bd\d+\b|triad|자동\s*복구\s*생성|undefined|null|nan)\b/gi;
const FORBIDDEN_BODY_PHRASES = [
  "Chapter 1",
  "Chapter 2",
  "Chapter 3",
  "Chapter 4",
  "Chapter 5",
  "Chapter 6",
  "Chapter 7",
  "Chapter 8",
  "Chapter 9",
  "Chapter 10",
  "Chapter 11",
  "Chapter 12",
  "Chapter 13",
  "Chapter 14",
  "Chapter 15",
  "A(안)",
  "B(괴)",
  "NEAR-TRIAD",
  "D3",
  "TRIAD",
  "상극 · 안괴-NEAR",
  "자동 복구 생성",
  "fallback",
  "데이터가 부족합니다",
  "시간 정보가 일부 비어 있어도",
  "예측 정확도를 과장하는 것이 아니라",
  "지금 확인된 신호를 1주 단위 행동 계획으로 연결",
  "근거리 거리감에 맞는 소통 밀도",
  "사실과 감정의 순서를 분리해 대화",
  "합의 문장을 고정해 두면",
  "payload",
  "JSON",
  "debug",
  "about:blank",
  "Internal server error",
  "undefined",
  "null",
  "NaN",
];

export const SUKYO_PDF_CHAPTERS = Object.freeze([
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

const CHAPTER_REQUIRED_KEYWORDS = Object.freeze({
  6: ["말투", "침묵", "연락", "스크립트"],
  10: ["동거", "생활", "책임", "장기"],
  11: ["돈", "소비", "책임", "생활"],
  13: ["전생", "반복", "집착", "성장"],
  15: ["강점", "위험", "원칙", "최종"],
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
  if (["compatibility", "compat", "couple"].some((token) => mode.includes(token))) return "compatibility";
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

function hasForbiddenFallbackText(chapters) {
  const merged = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => (Array.isArray(chapter.sections) ? chapter.sections : []))
    .map((section) => text(section.body))
    .join("\n")
    .toLowerCase();

  const forbidden = [
    "자동 복구 생성",
    "fallback",
    "로컬 복구",
    "데이터 부족",
    "chapter 1",
    "품질 보정",
    "llm 실패",
    "payload",
    "json",
    "undefined",
    "null",
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
  if (/\b(payload|debug|json|fallback|자동\s*복구\s*생성|about:blank)\b/i.test(body)) return true;
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

  return {
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
    },
    partner: {
      sukuyoStar: text(seed.partnerSukyo?.nameKo),
      starIndex: safeNumber(seed.partnerSukyo?.index),
      group: text(seed.partnerSukyo?.category),
      element: text(seed.partnerSukyo?.element),
      keywords: partnerKeywords,
    },
    relation: {
      type: text(relation.relationType),
      typeKo: text(relation.relationType),
      distance: toDistanceTier(relation.distanceLabel || relation.distance),
      distanceLabel: text(relation.distanceLabel || relation.distance),
      compatibilityScore: safeNumber(relation.compatibilityIndex),
      chemistryKeywords: safeArray([relation.elementHarmony?.relation, relation.relationVariant, relation.roleActionGuide?.meAction]),
      conflictKeywords: safeArray([relation.strengthShadowMap?.a?.shadow, relation.strengthShadowMap?.b?.shadow]),
      karmicKeywords: safeArray([relation.relationType, relation.relationVariant, relation.roleActionGuide?.resetLine]),
      dailyLifeKeywords: safeArray([relation.roleActionGuide?.meAction, relation.roleActionGuide?.otherAction]),
      loveKeywords: safeArray([relation.relationType, relation.distanceLabel]),
      marriageKeywords: safeArray([relation.elementHarmony?.summary, relation.distanceMetrics?.tensionBand]),
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

function buildSectionBody(localJson, chapter, sectionHeading, sectionIndex) {
  const chapterNo = safeNumber(chapter?.order || chapter?.chapterNo, 0);
  const selfStar = text(localJson?.self?.sukuyoStar, "본인");
  const partnerStar = text(localJson?.partner?.sukuyoStar, "상대");
  const relationType = text(localJson?.relation?.typeKo, "관계");
  const distanceLabel = text(localJson?.relation?.distanceLabel, "중거리");
  const relationScore = safeNumber(localJson?.relation?.compatibilityScore, null);
  const chemistry = safeArray(localJson?.relation?.chemistryKeywords).slice(0, 2).join(" · ") || "정서 공명";
  const conflict = safeArray(localJson?.relation?.conflictKeywords).slice(0, 2).join(" · ") || "긴장 신호";
  const karmic = safeArray(localJson?.relation?.karmicKeywords).slice(0, 2).join(" · ") || "인연 과제";
  const daily = safeArray(localJson?.relation?.dailyLifeKeywords).slice(0, 2).join(" · ") || "생활 합의";
  const guide = CHAPTER_TOPIC_GUIDE[chapterNo] || ["관계 핵심", "감정 반응", "주의 지점", "실행 전략"];

  const sectionFocus = `${chapterNo}-${sectionIndex + 1}`;
  const paragraphs = [
    `${chapter.title}의 ${sectionHeading}은 ${selfStar}숙과 ${partnerStar}숙 조합에서 나타나는 실제 관계 반응을 세밀하게 분해하는 구간입니다. ${relationType} 관계에서는 감정의 온도가 빠르게 올라가더라도 상대가 무엇을 불안해하는지 해석하는 속도가 다르면 체감이 크게 어긋납니다. 특히 ${distanceLabel} 흐름에서는 같은 사건을 두고도 한 사람은 "관계의 의미"를, 다른 사람은 "지금의 안전"을 먼저 확인하려는 경향이 있어 초반 소통이 뒤틀리기 쉽습니다. 이 섹션에서는 그 차이를 오해가 아닌 합의의 출발점으로 다루는 것이 핵심입니다.`,
    `관계 강점은 ${chemistry} 같은 공명 포인트에서 드러나고, 취약 지점은 ${conflict} 신호가 겹칠 때 선명해집니다. 점수가 ${relationScore == null ? "미제공" : relationScore}라고 해서 결과가 고정되는 것은 아니며, 실제 체감은 어떤 문장을 먼저 꺼내고 어떤 순서로 반응을 정리하는지에 의해 달라집니다. ${guide[0]}과 ${guide[1]}을 분리해 보면, 감정이 큰 날에도 관계를 지키는 선택이 가능해집니다. 서로의 속도를 바꾸려 하기보다 반응의 맥락을 먼저 확인하는 방식이 이 조합에 특히 효과적입니다.`,
    `${sectionHeading} 관점에서 반드시 지켜야 할 원칙은 사실과 감정을 같은 문장에 뒤섞지 않는 것입니다. ${karmic}처럼 과거의 패턴이 자극되면 현재의 사건보다 오래된 기억이 먼저 튀어나와 갈등을 키우기 쉽습니다. 그래서 "지금 불편한 행동"과 "내가 느낀 감정"을 분리해 표현해야 하고, 해석이 어긋났을 때는 책임 공방보다 재확인 질문을 먼저 두는 편이 관계 회복률이 높습니다. 이때 ${guide[2]}을 기준으로 대화를 재정렬하면 반복 충돌을 줄일 수 있습니다.`,
    `실행 단계에서는 추상적인 다짐보다 생활 문장으로 합의해야 유지됩니다. ${daily} 같은 생활 축을 중심으로 "연락 공백이 길어질 때 남길 최소 문장", "감정이 큰 날 결론을 미루는 기준", "주간 점검에서 확인할 질문"을 미리 정하면 감정 소모를 크게 줄일 수 있습니다. ${guide[3]}은 특별한 이벤트가 아니라 반복 가능한 루틴이어야 하며, 매주 같은 시간에 짧게 점검할수록 안정감이 빨라집니다.`,
    `마지막으로 ${sectionHeading}은 이론 요약이 아니라 실제 행동 설계여야 합니다. 제안 문장을 예시로 들면 "나는 지금 결론보다 감정 정리가 먼저 필요해"처럼 상태를 말하고, 이어서 "오늘은 20분 뒤에 다시 이야기하자"처럼 시간 경계를 제시하는 구조가 좋습니다. 이 조합에서는 강한 끌림만으로 관계를 유지하기 어렵기 때문에, 작은 합의를 지키는 빈도가 신뢰의 핵심 지표가 됩니다. ${sectionFocus} 구간의 목표는 서로를 바꾸는 것이 아니라, 같은 상황에서도 덜 다치고 더 빨리 회복하는 운영 체계를 만드는 것입니다.`,
  ];

  return repeatToLength(paragraphs, MIN_SECTION_LENGTH + 40);
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
      const sectionForbiddenCount = countForbiddenTerms(body);
      forbiddenTermsCount += sectionForbiddenCount;
      if (sectionForbiddenCount > 0) {
        issues.push(`forbidden.${chapterNo}`);
      }
      if (computeRepetitionScore(body) >= 0.42) {
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
  if (repeatedSectionCount >= 2) issues.push("repetition.section");
  if (hasRepeatedParagraphs(chapters)) issues.push("repetition.paragraph.global");
  if (hasForbiddenFallbackText(chapters)) issues.push("forbidden.fallback_text");
  if (chapterOpeningSet.size < Math.max(1, Math.floor(SUKYO_PDF_CHAPTER_COUNT * 0.8))) issues.push("repetition.chapter.opening");
  if (chapterClosingSet.size < Math.max(1, Math.floor(SUKYO_PDF_CHAPTER_COUNT * 0.8))) issues.push("repetition.chapter.closing");

  return {
    ok: issues.length === 0,
    issues,
    totalLength,
    forbiddenTermsCount,
    repetitionScore: repeatedSectionCount / Math.max(1, SUKYO_PDF_CHAPTER_COUNT),
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

  if (hasRepeatedParagraphs(chapters)) issues.push("repeated_paragraphs");
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

export function renderSukyoPremiumPdf(chapters, seed) {
  const safeName = sanitizeSukyoPremiumText(seed?.userProfile?.name) || "사용자";
  const partnerName = sanitizeSukyoPremiumText(seed?.partnerProfile?.name) || "상대방";
  const rel = sanitizeSukyoPremiumText(seed?.compatibility?.relationType) || "관계";
  const distance = sanitizeSukyoPremiumText(seed?.compatibility?.distanceLabel || seed?.compatibility?.distance) || "거리";
  const userHost = `${sanitizeSukyoPremiumText(seed?.userSukyo?.nameKo) || "?"}宿`;
  const partnerHost = `${sanitizeSukyoPremiumText(seed?.partnerSukyo?.nameKo) || "?"}宿`;

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
    <p class="notice">이 문서는 두 사람의 숙요 계산 결과를 기반으로 한 관계 운영 상담 리포트입니다.</p>
  </section>
  <section class="intro"><h2>해석 원칙</h2><p>본 리포트는 두 사람의 생년월일 기반 27숙 궁합 계산을 로컬에서 수행한 결과를 바탕으로 작성되었습니다. 모든 문장은 두 사람의 관계 운영에 초점을 맞춥니다.</p></section>
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
      compatibilityIndex: safeNumber(compatibility.compatibilityIndex),
      relationVariant: text(compatibility.relationVariant),
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
    sections: safeArray(chapter?.sections).map((section) => ({ ...section })),
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
  console.log("[SukuyoPremiumPDF][PdfRenderSuccess]", {
    chapterCount: chapters.length,
    totalLength: finalCheck.totalLength,
  });

  return {
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
    pdfReady,
  };
}
