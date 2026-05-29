import { Solar } from "lunar-javascript";
import { getSwissVedicPlanets, getSwissWesternChart } from "../lib/swiss-ephemeris.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { callGeminiText } from "../lib/gemini.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { buildSukuyoFromLunar } from "../lib/sukuyo-premium.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";

const SOUL_ORIGIN_FEATURE_KEY = "premium_pdf_soul_origin";
const SOUL_ORIGIN_SERVICE_KEY = "soul-origin";
const CORE_INPUT_ERROR_MESSAGE = "태어난 시간과 장소 정보를 다시 확인해야 기원서를 열 수 있습니다. 입력값을 확인한 뒤 다시 시도해주세요.";
const MIN_LOCAL_TOTAL_CHARS = 35000;
const TARGET_TOTAL_CHARS_AFTER_ENHANCEMENT = 60000;

const FORBIDDEN_TERMS = [
  "payload",
  "json",
  "debug",
  "engine",
  "fallback",
  "internal server error",
  "undefined",
  "null",
  "local",
  "sourceavailability",
];

const CHAPTER_BLUEPRINTS = [
  {
    chapterNo: 1,
    title: "Chapter 1. 태어난 순간의 문 — 영혼이 들어온 시간과 장소",
    subtitle: "당신의 첫 장면",
    sections: [
      "출생 순간이 여는 상징적 문",
      "시간과 장소가 만든 첫 번째 운명 코드",
      "동양과 서양 운명 체계에서 공통으로 드러나는 첫 인상",
      "이번 생의 기원에 대한 서문",
    ],
  },
  {
    chapterNo: 2,
    title: "Chapter 2. 나의 기원 코드 — 다섯 운명 체계의 공통 신호",
    subtitle: "영혼 원형의 윤곽",
    sections: [
      "사주가 말하는 현실적 기원",
      "점성술이 말하는 심리적 기원",
      "숙요점이 말하는 관계적 기원",
      "자미두수가 말하는 숙명적 무대",
      "베다점이 말하는 카르마적 출발점",
      "다섯 체계가 겹쳐서 만든 하나의 영혼 원형",
    ],
  },
  {
    chapterNo: 3,
    title: "Chapter 3. 반복되는 업의 패턴 — 왜 같은 상처가 되풀이되는가",
    subtitle: "반복의 메커니즘",
    sections: [
      "반복되는 감정의 구조",
      "인간관계에서 되풀이되는 장면",
      "스스로를 증명하려는 압박",
      "운명이 같은 방식으로 시험을 거는 이유",
      "반복을 멈추기 위해 알아야 할 핵심",
    ],
  },
  {
    chapterNo: 4,
    title: "Chapter 4. 오래된 감정의 기억 — 무의식과 고독의 근원",
    subtitle: "내면의 저장소",
    sections: [
      "달과 마음의 기억",
      "복덕궁과 내면의 안식처",
      "케투와 과거로부터 이어진 감각",
      "혼자 있을 때 강해지는 생각의 패턴",
      "고독을 자기파괴가 아니라 집중력으로 바꾸는 법",
    ],
  },
  {
    chapterNo: 5,
    title: "Chapter 5. 관계의 업 — 사랑, 집착, 이별, 끌림의 이유",
    subtitle: "관계의 인력",
    sections: [
      "왜 특정한 사람에게 강하게 끌리는가",
      "사랑에서 반복되는 기대와 실망",
      "상처받기 전에 먼저 방어하는 패턴",
      "인연이 업이 되는 순간",
      "사랑을 해방으로 바꾸기 위한 조건",
    ],
  },
  {
    chapterNo: 6,
    title: "Chapter 6. 가족과 혈통의 과제 — 내가 물려받은 운명의 구조",
    subtitle: "뿌리의 압력",
    sections: [
      "가족 안에서 만들어진 생존 방식",
      "인정받고 싶었던 마음의 근원",
      "부모·가문·환경으로부터 이어진 압력",
      "나에게서 끊어야 할 반복",
      "내가 새롭게 세워야 할 삶의 질서",
    ],
  },
  {
    chapterNo: 7,
    title: "Chapter 7. 고통이 재능으로 바뀌는 지점",
    subtitle: "변환의 기술",
    sections: [
      "결핍이 만든 감각",
      "상처가 예민함으로 변한 과정",
      "예민함이 통찰력으로 바뀌는 방식",
      "운명이 숨겨둔 무기",
      "나만의 재능을 현실에서 사용하는 법",
    ],
  },
  {
    chapterNo: 8,
    title: "Chapter 8. 이번 생의 시험 — 토성, 기신, 사화, 대운의 압력",
    subtitle: "압력의 해석",
    sections: [
      "피할 수 없는 인생의 시험",
      "나를 반복해서 압박하는 주제",
      "무너지는 시기에 드러나는 진짜 과제",
      "견뎌야 하는 것과 버려야 하는 것",
      "시험을 통과한 뒤 열리는 운명의 문",
    ],
  },
  {
    chapterNo: 9,
    title: "Chapter 9. 운명의 반복 주기 — 대운, 다샤, 별의 흐름",
    subtitle: "시간의 파동",
    sections: [
      "인생이 크게 바뀌는 주기",
      "대운이 여는 현실적 변화",
      "다샤가 드러내는 카르마의 시간표",
      "별의 흐름이 건드리는 심리적 전환점",
      "앞으로 주의 깊게 봐야 할 시기",
    ],
  },
  {
    chapterNo: 10,
    title: "Chapter 10. 풀어야 할 업보 — 멈춰야 할 습관과 선택",
    subtitle: "선택의 정화",
    sections: [
      "업보를 벌이 아니라 반복 패턴으로 해석하기",
      "내가 계속 붙잡는 감정",
      "내려놓아야 할 오래된 역할",
      "같은 선택을 반복하지 않기 위한 기준",
      "이번 생에서 반드시 풀어야 할 핵심 과제",
    ],
  },
  {
    chapterNo: 11,
    title: "Chapter 11. 해방의 방향 — 용신, 노드, 라후와 케투, 명궁의 통합 조언",
    subtitle: "회복의 축",
    sections: [
      "사주가 말하는 회복의 방향",
      "점성술이 말하는 성장의 방향",
      "자미두수가 말하는 삶의 무대",
      "베다점이 말하는 욕망과 해방의 균형",
      "내가 앞으로 선택해야 할 삶의 태도",
    ],
  },
  {
    chapterNo: 12,
    title: "Chapter 12. 나의 신화 — 이번 생을 완성하는 철학적 선언문",
    subtitle: "마지막 선언",
    sections: [
      "내 삶을 하나의 신화로 읽기",
      "과거의 상처가 남긴 의미",
      "미래의 나는 어떤 사람으로 완성되는가",
      "나의 운명을 여는 문장",
      "마지막 선언문",
    ],
  },
];

const REPORT_CACHE = globalThis.__SOUL_ORIGIN_REPORT_CACHE || new Map();
if (!globalThis.__SOUL_ORIGIN_REPORT_CACHE) {
  globalThis.__SOUL_ORIGIN_REPORT_CACHE = REPORT_CACHE;
}

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function toNumber(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeText(value) {
  let text = clean(value)
    .replace(/\b(undefined|null|nan)\b/gi, "")
    .replace(/\s{2,}/g, " ");
  for (const term of FORBIDDEN_TERMS) {
    text = text.replace(new RegExp(term, "gi"), "");
  }
  return text.trim();
}

function normalizeError(error) {
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack };
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return { message: String(error) };
    }
  }
  return { message: String(error) };
}

function normalizeInput(input = {}) {
  const birthDate = clean(input.birthDate || input.date);
  const birthTime = clean(input.birthTime || input.time);
  const dateMatch = birthDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const timeMatch = birthTime.match(/^(\d{1,2}):(\d{1,2})$/);
  const year = dateMatch ? toNumber(dateMatch[1]) : NaN;
  const month = dateMatch ? toNumber(dateMatch[2]) : NaN;
  const day = dateMatch ? toNumber(dateMatch[3]) : NaN;
  const hour = timeMatch ? toNumber(timeMatch[1]) : NaN;
  const minute = timeMatch ? toNumber(timeMatch[2]) : 0;
  const latitude = toNumber(input.latitude, NaN);
  const longitude = toNumber(input.longitude ?? input.lng, NaN);
  const timezoneOffset = toNumber(input.timezoneOffset, 9);

  return {
    name: clean(input.name || "사용자") || "사용자",
    gender: clean(input.gender || "unknown") || "unknown",
    birthDate,
    birthTime,
    birthPlace: clean(input.birthPlace || input.place || "출생지 미상") || "출생지 미상",
    timezone: clean(input.timezone || "Asia/Seoul") || "Asia/Seoul",
    timezoneOffset: Number.isFinite(timezoneOffset) ? timezoneOffset : 9,
    year,
    month,
    day,
    hour,
    minute: Number.isFinite(minute) ? minute : 0,
    latitude: Number.isFinite(latitude) ? latitude : 37.5665,
    longitude: Number.isFinite(longitude) ? longitude : 126.978,
  };
}

function hasCoreBirthData(input) {
  return Number.isFinite(input.year)
    && Number.isFinite(input.month)
    && Number.isFinite(input.day)
    && Number.isFinite(input.hour)
    && Number.isFinite(input.minute)
    && Number.isFinite(input.latitude)
    && Number.isFinite(input.longitude);
}

function normalizeSajuSnapshot(raw = {}) {
  const src = raw && typeof raw === "object" ? raw : {};
  const analysis = src.analysis && typeof src.analysis === "object" ? src.analysis : {};
  const weights = analysis.elementWeights && typeof analysis.elementWeights === "object" ? analysis.elementWeights : {};
  const yongshin = Array.isArray(analysis.yongshin_elements) ? analysis.yongshin_elements : [];
  const daewoon = Array.isArray(src.daewoon) ? src.daewoon : [];

  const highlights = [
    clean(src.dayMaster ? `일간 ${src.dayMaster}` : ""),
    clean(analysis.power_label ? `신강/신약 ${analysis.power_label}` : ""),
    yongshin.length ? `용신 ${yongshin.join(" · ")}` : "",
    Number.isFinite(Number(weights.wood)) || Number.isFinite(Number(weights.fire))
      ? `오행 분포 목${Number(weights.wood || 0)} 화${Number(weights.fire || 0)} 토${Number(weights.earth || 0)} 금${Number(weights.metal || 0)} 수${Number(weights.water || 0)}`
      : "",
    daewoon.length ? `대운 흐름 ${daewoon.slice(0, 3).map((row) => clean(row.label || row.name || row.period)).filter(Boolean).join(" → ")}` : "",
  ].filter(Boolean);

  return {
    ok: highlights.length >= 2,
    highlights,
    timing: daewoon.slice(0, 8),
  };
}

function normalizeZiweiSnapshot(raw = {}) {
  const src = raw && typeof raw === "object" ? raw : {};
  const palaces = Array.isArray(src.palaces) ? src.palaces : [];
  const topPalaces = palaces.slice(0, 6).map((row) => clean(row.nameKo || row.name || row.key)).filter(Boolean);
  const stars = palaces
    .slice(0, 4)
    .flatMap((row) => Array.isArray(row.mainStars) ? row.mainStars.slice(0, 2) : [])
    .map((star) => clean(star?.name?.ko || star?.name || star?.strengthName))
    .filter(Boolean)
    .slice(0, 8);

  const highlights = [
    clean(src.chartMeta?.mingGong ? `명궁 ${src.chartMeta.mingGong}` : ""),
    clean(src.chartMeta?.shenGong ? `신궁 ${src.chartMeta.shenGong}` : ""),
    topPalaces.length ? `핵심 궁 ${topPalaces.join(" · ")}` : "",
    stars.length ? `주요 주성 ${stars.join(" · ")}` : "",
  ].filter(Boolean);

  return {
    ok: highlights.length >= 2,
    highlights,
  };
}

async function calculateWestern(input, env, requestUrl) {
  const chart = await getSwissWesternChart(env, {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute,
    timezone: input.timezoneOffset,
    lat: input.latitude,
    lon: input.longitude,
  }, { requestUrl });

  const planets = chart?.planets && typeof chart.planets === "object" ? chart.planets : {};
  const keys = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  const highlights = keys
    .map((key) => {
      const item = planets[key] || planets[key.toUpperCase()] || null;
      if (!item) return "";
      const sign = clean(item.sign || item.signName || item.zodiacSign || "");
      return sign ? `${key.toUpperCase()} ${sign}` : "";
    })
    .filter(Boolean)
    .slice(0, 8);

  return {
    ok: highlights.length >= 3,
    highlights,
    timing: {
      ascendant: clean(chart?.ascendant || ""),
      midheaven: clean(chart?.midheaven || ""),
    },
  };
}

async function calculateVedic(input, env, requestUrl) {
  const chart = await getSwissVedicPlanets(env, {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute,
    timezone: input.timezoneOffset,
    lat: input.latitude,
    lon: input.longitude,
  }, { requestUrl });

  const planets = chart?.planets && typeof chart.planets === "object" ? chart.planets : {};
  const ordered = ["lagna", "moon", "rahu", "ketu", "saturn", "jupiter", "venus", "mars"];
  const highlights = ordered
    .map((key) => {
      const value = planets[key] || chart?.[key] || null;
      const sign = clean(value?.sign || value?.rasi || value?.zodiac || value?.name || "");
      return sign ? `${key.toUpperCase()} ${sign}` : "";
    })
    .filter(Boolean)
    .slice(0, 8);

  return {
    ok: highlights.length >= 3,
    highlights,
    timing: {
      dasha: clean(chart?.dasha?.current || chart?.currentDasha || ""),
    },
  };
}

function calculateSukuyo(input) {
  const solar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0);
  const lunar = solar.getLunar();
  const lunarMonth = Number(lunar.getMonth());
  const lunarDay = Number(lunar.getDay());
  const built = buildSukuyoFromLunar(Math.abs(lunarMonth), lunarDay, {
    isLeapMonth: lunarMonth < 0,
    source: "lunar-javascript",
  });

  if (!built) return { ok: false, highlights: [] };

  return {
    ok: true,
    highlights: [
      `본명숙 ${clean(built.nameKo || built.name || "")}`,
      clean(built.elementKo ? `성향 코드 ${built.elementKo}` : ""),
      clean(built.natureKo ? `관계 본능 ${built.natureKo}` : ""),
    ].filter(Boolean),
  };
}

function buildSoulOriginSeed({ input, saju, western, sukuyo, ziwei, vedic }) {
  const archetypeKeywords = [
    ...saju.highlights.slice(0, 2),
    ...western.highlights.slice(0, 2),
    ...ziwei.highlights.slice(0, 1),
    ...vedic.highlights.slice(0, 2),
    ...sukuyo.highlights.slice(0, 1),
  ].map((item) => sanitizeText(item)).filter(Boolean).slice(0, 8);

  const repeatedPatterns = [
    "관계에서 상처를 피하려다 먼저 거리 두기를 선택하는 흐름",
    "결핍을 증명 욕구로 바꾸며 스스로를 과하게 몰아붙이는 흐름",
    "안전과 도전을 동시에 원해 갈등이 반복되는 흐름",
  ];

  const shadowPatterns = [
    "인정받지 못할까 두려워 감정을 늦게 표현하는 패턴",
    "중요한 순간에 완벽한 답을 찾느라 타이밍을 놓치는 패턴",
    "지친 뒤에야 도움을 요청하는 고립 패턴",
  ];

  const liberationKeys = [
    "감정을 늦추지 말고 사실과 마음을 동시에 말하기",
    "관계의 속도를 통제하려 하기보다 리듬을 함께 조율하기",
    "두려움을 숨기지 않고 작은 실행으로 방향을 증명하기",
  ];

  return {
    profile: {
      name: input.name,
      gender: input.gender,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      birthPlace: input.birthPlace,
    },
    sourceAvailability: {
      saju: saju.ok,
      westernAstro: western.ok,
      sukyo: sukuyo.ok,
      ziwei: ziwei.ok,
      vedic: vedic.ok,
    },
    originSignature: {
      title: "운명의 기원서",
      summary: "다섯 운명 체계의 상징이 한 사람의 반복과 해방의 흐름으로 수렴되는 장면",
      archetypeKeywords,
    },
    karmicThemes: {
      loneliness: "고독은 단절이 아니라 내면의 구조를 정렬하기 위한 시간으로 나타납니다.",
      love: "사랑은 구원보다 동행의 기술을 배우는 장면으로 반복됩니다.",
      family: "가족의 기대와 자신의 속도 사이에서 경계 설정이 핵심 과제로 드러납니다.",
      career: "성과보다 방향의 정합성을 맞출 때 기회가 커집니다.",
      money: "불안 기반의 선택을 줄이고 주기 기반 전략이 필요합니다.",
      body: "과부하 신호를 늦게 인지하는 경향이 있어 리듬 관리가 중요합니다.",
      spirituality: "통제에서 신뢰로 이동할 때 직관이 선명해집니다.",
      transformation: "반복의 해석이 바뀌는 순간 고통이 재능으로 전환됩니다.",
    },
    repeatedPatterns,
    shadowPatterns,
    liberationKeys,
    timingSignals: {
      sajuDaewoon: saju.timing,
      westernTransits: western.timing,
      vedicDasha: vedic.timing,
      ziweiLuck: null,
    },
    engineHighlights: {
      saju: saju.highlights,
      westernAstro: western.highlights,
      sukyo: sukuyo.highlights,
      ziwei: ziwei.highlights,
      vedic: vedic.highlights,
    },
  };
}

function summarizeHighlights(seed) {
  return [
    ...(seed.engineHighlights?.saju || []).slice(0, 3),
    ...(seed.engineHighlights?.westernAstro || []).slice(0, 3),
    ...(seed.engineHighlights?.ziwei || []).slice(0, 3),
    ...(seed.engineHighlights?.vedic || []).slice(0, 3),
    ...(seed.engineHighlights?.sukyo || []).slice(0, 2),
  ].map((item) => sanitizeText(item)).filter(Boolean);
}

function dedupeItems(items = []) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const normalized = sanitizeText(item).replace(/\s+/g, " ").toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(item);
  }
  return out;
}

function reportCharLength(chapters = []) {
  return chapters.reduce((sum, chapter) => {
    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    const chapterTextLen = sanitizeText(chapter?.title || "").length + sanitizeText(chapter?.subtitle || "").length;
    const sectionLen = sections.reduce((acc, section) => {
      return acc + sanitizeText(section?.title || "").length + sanitizeText(section?.body || "").length;
    }, 0);
    return sum + chapterTextLen + sectionLen;
  }, 0);
}

function buildSectionBody(seed, chapter, sectionTitle, chapterIndex, sectionIndex, depthLevel = 0) {
  const name = sanitizeText(seed?.profile?.name || "사용자");
  const highlightPool = summarizeHighlights(seed);
  const patternPool = dedupeItems(seed?.repeatedPatterns || []);
  const shadowPool = dedupeItems(seed?.shadowPatterns || []);
  const liberationPool = dedupeItems(seed?.liberationKeys || []);
  const lifeThemes = dedupeItems(Object.values(seed?.karmicThemes || {}));

  const h1 = highlightPool[(chapterIndex * 3 + sectionIndex + depthLevel) % Math.max(highlightPool.length, 1)] || "운명의 핵심 신호";
  const h2 = highlightPool[(chapterIndex * 3 + sectionIndex + depthLevel + 5) % Math.max(highlightPool.length, 1)] || "반복의 결";
  const p1 = patternPool[(chapterIndex + sectionIndex + depthLevel) % Math.max(patternPool.length, 1)] || "익숙한 관계 패턴";
  const p2 = patternPool[(chapterIndex + sectionIndex + depthLevel + 2) % Math.max(patternPool.length, 1)] || "증명 욕구의 반복";
  const s1 = shadowPool[(chapterIndex + sectionIndex + depthLevel) % Math.max(shadowPool.length, 1)] || "표현의 지연";
  const l1 = liberationPool[(chapterIndex + sectionIndex + depthLevel) % Math.max(liberationPool.length, 1)] || "작은 실행의 축적";
  const l2 = liberationPool[(chapterIndex + sectionIndex + depthLevel + 1) % Math.max(liberationPool.length, 1)] || "관계 리듬의 조율";
  const t1 = lifeThemes[(chapterIndex + sectionIndex + depthLevel) % Math.max(lifeThemes.length, 1)] || "내면 정렬";

  const nowActionHorizon = ["오늘", "이번 주", "이번 달", "90일"][Math.min(depthLevel, 3)] || "이번 달";

  const paragraphs = [
    `${name}님의 ${sanitizeText(chapter.title)}에서 ${sanitizeText(sectionTitle)}는 단순한 설명 항목이 아니라, 삶의 장면이 어떻게 반복되고 어디서 전환이 시작되는지를 읽는 핵심 문장입니다. 현재 흐름에서 가장 먼저 확인되는 신호는 ${h1}이며, 이는 감정·관계·결정의 순서가 엇갈릴 때 체감 강도가 커집니다.`,
    `구체적으로 보면 ${p1}과 ${p2}가 번갈아 나타나며, 같은 유형의 부담을 다른 사람·다른 환경에서 다시 경험하게 만드는 경향이 있습니다. 이때 핵심은 원인을 외부에서만 찾지 않는 것입니다. ${h2}가 함께 등장할 때, 동일한 사건이라도 해석의 각도를 바꾸는 순간 손실이 줄고 회복 속도는 빨라집니다.`,
    `${sanitizeText(sectionTitle)} 관점에서 가장 주의할 지점은 ${s1}입니다. 감정을 늦게 정리하거나, 상대의 반응을 예측해 먼저 접는 습관이 이어지면 선택의 폭이 좁아지고 결국 스스로 만든 제한을 현실로 오해하기 쉽습니다. 반대로 작은 단위로 사실을 확인하고, 관계의 온도를 조절하면 불필요한 소모를 크게 줄일 수 있습니다.`,
    `실천 전략은 단순해야 오래 지속됩니다. ${nowActionHorizon} 기준으로는 ${l1}를 1순위로 두고, 동시에 ${l2}를 보조 전략으로 두는 구성이 가장 안정적입니다. 즉, 정답을 한 번에 찾으려는 방식보다 우선순위를 명확히 한 뒤 반복 가능한 행동으로 변환하는 방식이 훨씬 현실적인 결과를 만듭니다.`,
    `정리하면 ${sanitizeText(chapter.subtitle)}의 축에서 ${sanitizeText(sectionTitle)}는 ${t1}으로 연결됩니다. 이 흐름은 벌이나 운명 고정이 아니라, 패턴을 인식하고 관계·시간·에너지 배분을 재설계할 때 분명히 완화됩니다. 따라서 ${name}님에게 필요한 것은 완벽한 예측이 아니라, 반복 신호를 빠르게 포착해 선택의 방향을 조정하는 실행력입니다.`,
  ].map((line) => sanitizeText(line)).filter(Boolean);

  return paragraphs.join("\n\n");
}

function buildLocalChapters(seed) {
  return CHAPTER_BLUEPRINTS.map((chapter, chapterIndex) => ({
    chapterNo: chapter.chapterNo,
    title: chapter.title,
    subtitle: chapter.subtitle,
    sections: chapter.sections.map((sectionTitle, sectionIndex) => ({
      title: sectionTitle,
      body: buildSectionBody(seed, chapter, sectionTitle, chapterIndex, sectionIndex, 0),
    })),
  }));
}

function enrichSectionsUntilLength(chapters, seed, targetChars, startDepth = 1) {
  if (!Array.isArray(chapters) || !chapters.length) return chapters;
  let total = reportCharLength(chapters);
  let depth = startDepth;
  let chapterCursor = 0;
  let sectionCursor = 0;
  let guard = 0;

  while (total < targetChars && guard < 2000) {
    const chapter = chapters[chapterCursor % chapters.length];
    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    if (sections.length) {
      const section = sections[sectionCursor % sections.length];
      const appendix = buildSectionBody(seed, chapter, section.title, chapterCursor, sectionCursor, depth);
      const current = sanitizeText(section.body || "");
      section.body = sanitizeText(`${current}\n\n${appendix}`);
      total = reportCharLength(chapters);
    }

    sectionCursor += 1;
    if (sectionCursor % Math.max(sections.length || 1, 1) === 0) {
      chapterCursor += 1;
      if (chapterCursor % chapters.length === 0) depth += 1;
    }
    guard += 1;
  }

  return chapters;
}

function appendUniquenessTag(chapters) {
  if (!Array.isArray(chapters)) return chapters;
  for (let c = 0; c < chapters.length; c += 1) {
    const chapter = chapters[c];
    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    for (let s = 0; s < sections.length; s += 1) {
      const section = sections[s];
      const body = sanitizeText(section?.body || "");
      const tail = `핵심 정렬 포인트 ${c + 1}-${s + 1}: 반복 신호를 인식하고 관계·시간·에너지 우선순위를 다시 설계합니다.`;
      section.body = body.includes(`핵심 정렬 포인트 ${c + 1}-${s + 1}`) ? body : sanitizeText(`${body}\n\n${tail}`);
    }
  }
  return chapters;
}

function extractJsonObject(text) {
  const raw = clean(text);
  if (!raw) return null;
  const direct = raw.match(/\{[\s\S]*\}$/);
  const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced && fenced[1]) || (direct && direct[0]) || raw;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function coerceAiChapters(parsed, fallbackChapters) {
  const chapters = Array.isArray(parsed?.chapters) ? parsed.chapters : [];
  if (!chapters.length) return fallbackChapters;

  return fallbackChapters.map((fallback, index) => {
    const src = chapters[index] || {};
    const srcSections = Array.isArray(src.sections) ? src.sections : [];
    return {
      chapterNo: fallback.chapterNo,
      title: fallback.title,
      subtitle: fallback.subtitle,
      sections: fallback.sections.map((section, secIndex) => {
        const aiSection = srcSections[secIndex] || {};
        const body = sanitizeText(aiSection.body || section.body || "");
        return {
          title: section.title,
          body: body || section.body,
        };
      }),
    };
  });
}

function mergeAiWithLocal(fallbackChapters, aiChapters, seed) {
  const merged = coerceAiChapters({ chapters: aiChapters }, fallbackChapters);
  return appendUniquenessTag(enrichSectionsUntilLength(merged, seed, TARGET_TOTAL_CHARS_AFTER_ENHANCEMENT, 2));
}

function buildAiPrompt(seed) {
  return [
    "당신은 사주, 서양 점성술, 숙요점, 자미두수, 베다점의 상징을 통합하는 운명 서사 상담가입니다.",
    "계산은 이미 완료되었습니다. 계산을 새로 하지 말고 아래 seed와 chapter skeleton만 사용하세요.",
    "공포, 저주, 질병, 죽음, 사고, 파멸을 단정하지 마세요.",
    "업보는 벌이 아니라 반복되는 패턴이며 해방 가능한 과제로 서술하세요.",
    "각 챕터의 모든 섹션을 누락 없이 작성하세요.",
    "같은 문장을 반복하지 말고, 섹션마다 관찰·원인·실천·검증의 흐름을 분명히 구분하세요.",
    "각 섹션은 최소 700자 이상으로 작성해 전체 분량을 충분히 확보하세요.",
    "본문에 payload, json, fallback, debug, engine 같은 기술 단어를 쓰지 마세요.",
    "출력은 JSON 객체 하나만 반환하세요.",
    "출력 형식:",
    "{\"chapters\":[{\"chapterNo\":1,\"sections\":[{\"title\":\"...\",\"body\":\"...\"}]}]}",
    "seed:",
    JSON.stringify(seed),
    "chapterSkeleton:",
    JSON.stringify(CHAPTER_BLUEPRINTS),
  ].join("\n");
}

function buildSummary(chapters) {
  const first = chapters?.[0]?.sections?.[0]?.body || "";
  return sanitizeText(first).slice(0, 300) || "당신의 기원은 반복을 해석하는 순간 해방의 방향으로 열립니다.";
}

function makeReportId() {
  return `soul-origin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getPremiumAccessToken(request, body = {}) {
  const header = clean(request.headers.get("x-premium-access-token"));
  if (header) return header;
  return clean(body?.premiumAccessToken || body?._premiumAccessToken || body?.accessToken);
}

async function handlePrepare(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const input = normalizeInput(body?.input || {});

  if (!hasCoreBirthData(input)) {
    return json({ ok: false, code: "SOUL_ORIGIN_INVALID_INPUT", message: CORE_INPUT_ERROR_MESSAGE }, { status: 422 });
  }

  const premiumAccessToken = getPremiumAccessToken(request, body);
  const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "soulOriginKarma", {
    reportType: "soulOriginKarma",
    featureKey: clean(body?.featureKey) || "coin-gate-per-use",
    premiumAccessToken: premiumAccessToken || undefined,
    _accessRoute: "/api/soul-origin",
  });

  if (!access?.ok) {
    return json({
      ok: false,
      code: access?.code || "UNAUTHORIZED",
      message: access?.message || "운명의 기원서 생성 권한을 확인할 수 없습니다.",
    }, { status: Number(access?.status) || 403 });
  }

  const reportId = clean(body?.reportId) || makeReportId();
  const executionCtx = buildPremiumExecutionContext({
    serviceKey: SOUL_ORIGIN_SERVICE_KEY,
    reportType: "soulOriginKarma",
    userId: auth.userId,
    featureKey: clean(body?.featureKey) || SOUL_ORIGIN_FEATURE_KEY,
    sessionId: clean(body?.sessionId || body?.reportSessionId || `soul-origin:${reportId}`),
    reportId,
    access,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });

  await startPremiumPdfExecution(env, auth.userId, executionCtx);

  const snapshots = body?.engineSnapshots && typeof body.engineSnapshots === "object" ? body.engineSnapshots : {};

  let western = { ok: false, highlights: [], timing: null };
  let vedic = { ok: false, highlights: [], timing: null };
  let sukuyo = { ok: false, highlights: [] };

  try {
    western = await calculateWestern(input, env, request.url);
  } catch (error) {
    console.warn("[SoulOrigin][WesternFailed]", normalizeError(error));
  }

  try {
    vedic = await calculateVedic(input, env, request.url);
  } catch (error) {
    console.warn("[SoulOrigin][VedicFailed]", normalizeError(error));
  }

  try {
    sukuyo = calculateSukuyo(input);
  } catch (error) {
    console.warn("[SoulOrigin][SukuyoFailed]", normalizeError(error));
  }

  const saju = normalizeSajuSnapshot(snapshots.saju || {});
  const ziwei = normalizeZiweiSnapshot(snapshots.ziwei || {});

  const sourceAvailability = {
    saju: saju.ok,
    westernAstro: western.ok,
    sukyo: sukuyo.ok,
    ziwei: ziwei.ok,
    vedic: vedic.ok,
  };

  const availableCount = Object.values(sourceAvailability).filter(Boolean).length;
  const hasRequiredPair = (saju.ok && western.ok) || (saju.ok && ziwei.ok) || availableCount >= 2;

  if (!hasRequiredPair) {
    await failPremiumPdfExecution(
      env,
      auth.userId,
      executionCtx,
      "soul_origin_engine_not_enough",
      CORE_INPUT_ERROR_MESSAGE,
      "soul-origin-validate",
    );
    return json({ ok: false, code: "SOUL_ORIGIN_ENGINE_NOT_ENOUGH", message: CORE_INPUT_ERROR_MESSAGE }, { status: 422 });
  }
  try {
    const seed = buildSoulOriginSeed({ input, saju, western, sukuyo, ziwei, vedic });
    let localChapters = buildLocalChapters(seed);
    localChapters = enrichSectionsUntilLength(localChapters, seed, MIN_LOCAL_TOTAL_CHARS, 1);
    localChapters = appendUniquenessTag(localChapters);

    let chapters = localChapters;
    try {
      const ai = await callGeminiText(env, buildAiPrompt(seed), {
        maxOutputTokens: 12288,
        temperature: 0.8,
        timeoutMs: 35000,
        totalTimeoutMs: 55000,
      });
      if (ai?.ok && clean(ai.text)) {
        const parsed = extractJsonObject(ai.text);
        chapters = mergeAiWithLocal(localChapters, Array.isArray(parsed?.chapters) ? parsed.chapters : [], seed);
      }
    } catch (error) {
      console.warn("[SoulOrigin][LLMFailedUseLocal]", normalizeError(error));
    }

    const finalLength = reportCharLength(chapters);
    if (finalLength < TARGET_TOTAL_CHARS_AFTER_ENHANCEMENT) {
      chapters = enrichSectionsUntilLength(chapters, seed, TARGET_TOTAL_CHARS_AFTER_ENHANCEMENT, 3);
      chapters = appendUniquenessTag(chapters);
    }

    const createdAt = new Date().toISOString();

    const responseBody = {
      ok: true,
      reportId,
      title: "운명의 기원서",
      chapters,
      summary: buildSummary(chapters),
      createdAt,
      sourceAvailability,
    };

    REPORT_CACHE.set(reportId, {
      reportId,
      userId: auth.userId,
      createdAt,
      payload: responseBody,
    });

    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      manuscriptSource: "mixed",
      chapterCount: Array.isArray(chapters) ? chapters.length : 0,
      archive: {
        reportId,
        reportType: "soul_origin_book",
        displayName: "운명의 기원서",
        title: "운명의 기원서",
        mode: "personal",
        birthName: clean(input?.name),
        summary: clean(responseBody?.summary, 1000),
        pdfUrl: "",
        chapters,
        payload: {
          sourceAvailability,
          title: responseBody.title,
        },
        canReopen: true,
        canDownload: false,
      },
    });

    return json(responseBody);
  } catch (error) {
    await failPremiumPdfExecution(
      env,
      auth.userId,
      executionCtx,
      "soul_origin_generation_failed",
      clean(error?.message || "운명의 기원서 생성에 실패했습니다."),
      "soul-origin-generation",
    );
    throw error;
  }
}

async function handleReadReport(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const reportId = clean(url.searchParams.get("reportId"));
  if (!reportId) {
    return json({ ok: false, code: "MISSING_REPORT_ID", message: "reportId가 필요합니다." }, { status: 400 });
  }

  const found = REPORT_CACHE.get(reportId);
  if (!found || found.userId !== auth.userId) {
    return json({ ok: false, code: "REPORT_NOT_FOUND", message: "요청한 기원서를 찾을 수 없습니다." }, { status: 404 });
  }

  return json(found.payload);
}

export async function handleSoulOriginRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/soul-origin");

    if (path === "" || path === "/") {
      if (method !== "POST") return methodNotAllowed();
      return await handlePrepare(request, env);
    }

    if (path === "/report") {
      if (method !== "GET") return methodNotAllowed();
      return await handleReadReport(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[SoulOrigin][Error]", normalizeError(error));
    return handleRouteError(error);
  }
}
