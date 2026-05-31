import { Solar } from "lunar-javascript";
import { buildAstroLocalChartJson } from "../lib/astro-premium-generator.js";
import { buildVedicLocalChartJson } from "../lib/vedic-premium-generator.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { buildSukuyoFromLunar } from "../lib/sukuyo-premium.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";

const SOUL_ORIGIN_FEATURE_KEY = "premium_pdf_soul_origin";
const SOUL_ORIGIN_SERVICE_KEY = "soul-origin";
const CORE_INPUT_ERROR_MESSAGE = "태어난 시간과 장소 정보를 다시 확인해야 운명의 업 리포트를 열 수 있습니다. 입력값을 확인한 뒤 다시 시도해주세요.";
const MIN_LOCAL_TOTAL_CHARS = 50000;
const TARGET_TOTAL_CHARS_AFTER_ENHANCEMENT = 56000;
const MIN_SECTION_CHARS = 500;

const FORBIDDEN_TERMS = [
  "payload",
  "json",
  "debug",
  "engine",
  "fallback",
  "llm",
  "api",
  "schema",
  "raw",
  "gemini",
  "openai",
  "claude",
  "preflightfailed",
  "chart seed failed",
  "swiss required",
  "데이터가 부족합니다",
  "계산 실패",
  "엔진 호출 실패",
  "내부 데이터",
  "로컬 엔진",
  "계산 시그니처",
  "데이터 정규화",
  "품질 검증",
  "재생성",
  "internal server error",
  "undefined",
  "null",
  "sourceavailability",
];

const CHAPTER_BLUEPRINTS = [
  {
    chapterNo: 1,
    title: "Chapter I. 운명의 업 총론 — 이번 생이 반복해서 묻는 질문",
    subtitle: "통합 주제와 반복 패턴",
    sections: [
      "다섯 흐름이 공통으로 가리키는 핵심 주제",
      "이번 생의 반복 패턴",
      "타고난 재능과 업의 방향",
      "가장 먼저 풀어야 할 인생 과제",
      "운명의 업이 강하게 드러나는 영역",
      "전체 리포트 핵심 한 줄 조언",
    ],
  },
  {
    chapterNo: 2,
    title: "Chapter II. 사주로 보는 업의 뿌리 — 원국에 새겨진 반복 구조",
    subtitle: "일간·월지·십성·오행",
    sections: [
      "일간과 월지가 말하는 본질적 과제",
      "십성이 보여주는 반복되는 선택",
      "오행 과다·부족이 만드는 인생 습관",
      "용신·희신이 열어주는 회복 방향",
      "신살과 십이운성의 숨은 패턴",
      "사주가 말하는 업의 사용법",
    ],
  },
  {
    chapterNo: 3,
    title: "Chapter III. 자미두수로 보는 영혼의 설계 — 명궁·신궁·12궁의 압력",
    subtitle: "명궁·신궁·삼방사정·사화",
    sections: [
      "명궁이 말하는 타고난 운명 기질",
      "신궁이 보여주는 현실 행동 패턴",
      "삼방사정으로 보는 인생의 핵심 축",
      "사화가 드러내는 업의 사건화 방식",
      "약한 궁과 강한 궁의 균형",
      "자미두수가 말하는 업의 돌파구",
    ],
  },
  {
    chapterNo: 4,
    title: "Chapter IV. 점성술로 보는 무의식 — 태양·달·상승궁의 심리 카르마",
    subtitle: "태양·달·상승궁·MC·어스펙트",
    sections: [
      "태양이 말하는 삶의 목적",
      "달이 말하는 감정의 반복 패턴",
      "상승궁이 만드는 세상과의 접점",
      "MC가 보여주는 사회적 방향",
      "주요 어스펙트가 만드는 내면 긴장",
      "점성술이 말하는 심리적 업의 해소법",
    ],
  },
  {
    chapterNo: 5,
    title: "Chapter V. 베다점으로 보는 카르마 — 라그나·다샤·요가의 시간표",
    subtitle: "라그나·나크샤트라·카라카·다샤",
    sections: [
      "라그나가 말하는 이번 생의 출발점",
      "달과 나크샤트라가 보여주는 마음의 본능",
      "카라카가 말하는 영혼·직업·관계 과제",
      "현재 다샤가 열어주는 시기적 숙제",
      "요가와 라후·케투가 만드는 카르마 패턴",
      "베다점이 말하는 업의 수행법",
    ],
  },
  {
    chapterNo: 6,
    title: "Chapter VI. 숙요점으로 보는 인연 카르마 — 별이 맺어주는 관계의 숙제",
    subtitle: "본명숙·관계 역할·인연 흐름",
    sections: [
      "본명숙이 말하는 관계 기질",
      "숙요점이 보여주는 감정적 역할",
      "사람들에게 반복해서 맡게 되는 관계 위치",
      "끌리는 인연과 소모되는 인연의 차이",
      "관계 속에서 풀어야 할 카르마",
      "인연 카르마를 성숙하게 쓰는 법",
    ],
  },
  {
    chapterNo: 7,
    title: "Chapter VII. 관계와 사랑의 업 — 반복되는 애착·거리감·재회 패턴",
    subtitle: "사랑·애착·회복 전략",
    sections: [
      "사랑에서 반복되는 핵심 패턴",
      "가까워질수록 드러나는 그림자",
      "끌리는 사람의 공통 구조",
      "관계가 무너지는 순간의 신호",
      "다시 이어질 수 있는 조건",
      "사랑의 업을 풀기 위한 현실 전략",
    ],
  },
  {
    chapterNo: 8,
    title: "Chapter VIII. 돈과 생존의 업 — 재물·가치감·생활 구조",
    subtitle: "재물·가치감·수익 구조",
    sections: [
      "돈을 대하는 기본 감각",
      "재물운이 열리는 방식",
      "돈이 막히는 반복 패턴",
      "자존감과 재물의 연결",
      "수익 구조로 바꿔야 할 재능",
      "돈의 업을 풀기 위한 생활 전략",
    ],
  },
  {
    chapterNo: 9,
    title: "Chapter IX. 직업과 사명의 업 — 무엇을 세상에 남길 것인가",
    subtitle: "직업·브랜드·사회적 사명",
    sections: [
      "다섯 흐름이 공통으로 지목하는 직업 방향",
      "사회적으로 인정받는 방식",
      "반복해서 실패하는 직업 패턴",
      "사명이 살아나는 일의 형태",
      "독립형·조직형·브랜드형 가능성",
      "직업의 업을 성공 구조로 바꾸는 법",
    ],
  },
  {
    chapterNo: 10,
    title: "Chapter X. 가족·뿌리·무의식의 업 — 오래된 감정의 저장소",
    subtitle: "가족·뿌리·무의식",
    sections: [
      "가족과 뿌리에서 시작된 감정 패턴",
      "무의식적으로 반복되는 방어기제",
      "집·기반·안정감에 대한 욕구",
      "혼자 있을 때 드러나는 진짜 과제",
      "오래된 감정을 정리하는 방법",
      "뿌리의 업을 회복력으로 바꾸는 법",
    ],
  },
  {
    chapterNo: 11,
    title: "Chapter XI. 위기와 전환의 업 — 무너질 때 드러나는 진짜 숙제",
    subtitle: "위기·전환·반전",
    sections: [
      "인생이 흔들리는 반복 시점",
      "위기 때 나오는 자동 반응",
      "피해야 할 선택 패턴",
      "위기가 기회로 바뀌는 조건",
      "다시 일어서는 데 필요한 힘",
      "전환기의 업을 성장으로 바꾸는 법",
    ],
  },
  {
    chapterNo: 12,
    title: "Chapter XII. 현재 시기와 업의 타이밍 — 대운·다샤·타임로드·트랜싯",
    subtitle: "대운·세운·다샤·트랜싯·90일",
    sections: [
      "사주의 현재 대운·세운 흐름",
      "베다점의 현재 다샤 흐름",
      "점성술 타임로드와 트랜싯 흐름",
      "자미두수 운세 흐름이 주는 압력",
      "지금 잡아야 할 선택과 버려야 할 선택",
      "앞으로 90일 실행 우선순위",
    ],
  },
  {
    chapterNo: 13,
    title: "Chapter XIII. 업을 푸는 실전 루틴 — 몸·마음·관계·돈의 정렬",
    subtitle: "몸·마음·관계·돈 루틴",
    sections: [
      "매일 해야 할 마음 정리 루틴",
      "관계에서 반복을 끊는 말의 습관",
      "돈과 일의 구조를 세우는 루틴",
      "몸과 생활 리듬을 안정시키는 방법",
      "운을 흐트러뜨리는 행동 줄이기",
      "2주·6주·90일 실천 플랜",
    ],
  },
  {
    chapterNo: 14,
    title: "Chapter XIV. 운명의 업 통합 판정 — 반복을 사명으로 바꾸는 법",
    subtitle: "강점·그림자·원칙",
    sections: [
      "가장 강한 업의 축",
      "가장 큰 재능의 축",
      "가장 조심해야 할 그림자",
      "관계·돈·일에서 반복되는 공통 패턴",
      "반드시 지켜야 할 인생 원칙",
      "통합 운명 판정",
    ],
  },
  {
    chapterNo: 15,
    title: "Chapter XV. 최종 마스터플랜 — 1년·3년·10년 운명 전략",
    subtitle: "1년·3년·10년 전략",
    sections: [
      "지금 가장 먼저 해야 할 선택",
      "1년 전략",
      "3년 전략",
      "10년 전략",
      "사랑·돈·일·마음의 통합 전략",
      "최종 운명 조언",
    ],
  },
];

const REPORT_CACHE = globalThis.__SOUL_ORIGIN_REPORT_CACHE || new Map();
if (!globalThis.__SOUL_ORIGIN_REPORT_CACHE) {
  globalThis.__SOUL_ORIGIN_REPORT_CACHE = REPORT_CACHE;
}

function logFlow(stage, payload = {}) {
  const safe = {
    stage: clean(stage || "Unknown"),
    reportType: clean(payload.reportType || "soulOriginKarma"),
    productKey: clean(payload.productKey || SOUL_ORIGIN_FEATURE_KEY),
    sessionId: clean(payload.sessionId || ""),
    requestId: clean(payload.requestId || ""),
    errorCode: clean(payload.errorCode || ""),
  };
  const tag = `[DestinyPrayerBook] ${safe.stage}`;
  if (safe.errorCode) {
    console.error(tag, safe);
    return;
  }
  console.info(tag, safe);
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
  const partnerBirthDate = clean(input.partnerBirthDate || input.partnerDate || "");
  const partnerBirthTime = clean(input.partnerBirthTime || input.partnerTime || "");
  const dateMatch = birthDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const timeMatch = birthTime.match(/^(\d{1,2}):(\d{1,2})$/);
  const partnerDateMatch = partnerBirthDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const partnerTimeMatch = partnerBirthTime.match(/^(\d{1,2}):(\d{1,2})$/);
  const year = dateMatch ? toNumber(dateMatch[1]) : NaN;
  const month = dateMatch ? toNumber(dateMatch[2]) : NaN;
  const day = dateMatch ? toNumber(dateMatch[3]) : NaN;
  const hour = timeMatch ? toNumber(timeMatch[1], 12) : 12;
  const minute = timeMatch ? toNumber(timeMatch[2], 0) : 0;
  const partnerYear = partnerDateMatch ? toNumber(partnerDateMatch[1]) : NaN;
  const partnerMonth = partnerDateMatch ? toNumber(partnerDateMatch[2]) : NaN;
  const partnerDay = partnerDateMatch ? toNumber(partnerDateMatch[3]) : NaN;
  const partnerHour = partnerTimeMatch ? toNumber(partnerTimeMatch[1]) : NaN;
  const partnerMinute = partnerTimeMatch ? toNumber(partnerTimeMatch[2]) : 0;
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
    prayerTopic: clean(input.prayerTopic || input.wishTopic || ""),
    currentConcern: clean(input.currentConcern || ""),
    desiredOutcome: clean(input.desiredOutcome || ""),
    partnerInfo: clean(input.partnerInfo || ""),
    partnerBirthDate,
    partnerBirthTime,
    partner: {
      birthDate: partnerBirthDate,
      birthTime: partnerBirthTime,
      year: partnerYear,
      month: partnerMonth,
      day: partnerDay,
      hour: Number.isFinite(partnerHour) ? partnerHour : null,
      minute: Number.isFinite(partnerMinute) ? partnerMinute : 0,
    },
  };
}

function hasPartnerBirthData(input) {
  return Number.isFinite(input?.partner?.year)
    && Number.isFinite(input?.partner?.month)
    && Number.isFinite(input?.partner?.day);
}

function buildPartnerRelationInsight(input) {
  if (!hasPartnerBirthData(input)) return { enabled: false };

  const selfDate = Date.UTC(input.year, input.month - 1, input.day);
  const partnerDate = Date.UTC(input.partner.year, input.partner.month - 1, input.partner.day);
  const dayGap = Math.abs(Math.round((selfDate - partnerDate) / 86400000));
  const hasPartnerTime = Number.isFinite(input.partner.hour);
  const selfMinutes = Number(input.hour) * 60 + Number(input.minute || 0);
  const partnerMinutes = hasPartnerTime ? Number(input.partner.hour) * 60 + Number(input.partner.minute || 0) : null;
  const minuteGap = hasPartnerTime ? Math.abs(selfMinutes - partnerMinutes) : null;

  let tone = "리듬 조율형";
  if (dayGap % 9 <= 2) tone = "높은 공명형";
  else if (dayGap % 9 >= 6) tone = "성장 자극형";

  let action = "감정 해석보다 사실 확인 질문을 먼저 두면 관계 소모가 줄어듭니다.";
  if (hasPartnerTime && Number.isFinite(minuteGap)) {
    action = minuteGap <= 180
      ? "서로의 일상 리듬이 유사하니 대화 시간을 고정하면 관계 만족도가 빠르게 올라갑니다."
      : "생활 리듬 차이가 큰 편이므로 대화 기대치를 먼저 합의하면 오해를 크게 줄일 수 있습니다.";
  }

  return {
    enabled: true,
    dayGap,
    minuteGap,
    tone,
    summary: `상대 생년월일${hasPartnerTime ? "시" : ""}를 반영한 관계 축은 ${tone}으로 나타납니다.`,
    action,
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

function buildSajuSnapshotFromInput(input) {
  try {
    const profile = buildSajuProfile({
      name: clean(input?.name || "사용자"),
      gender: clean(input?.gender || "OTHER"),
      birth: {
        year: Number(input?.year || 0),
        month: Number(input?.month || 0),
        day: Number(input?.day || 0),
        hour: Number.isFinite(Number(input?.hour)) ? Number(input.hour) : 12,
        minute: Number.isFinite(Number(input?.minute)) ? Number(input.minute) : 0,
        calendarType: "solar",
        unknownTime: false,
      },
    });

    const dayMaster = clean(profile?.dayMaster?.stemKo || profile?.dayMaster?.stem || "");
    const powerLabel = clean(profile?.usefulGods?.strength || "");
    const yongshin = [
      clean(profile?.usefulGods?.yong || ""),
      clean(profile?.usefulGods?.hee?.[0] || profile?.usefulGods?.hee || ""),
    ].filter(Boolean);
    const percentages = profile?.fiveElements?.percentages || {};
    const daewoonLabel = clean(profile?.pillars?.month?.ganji || "");

    return normalizeSajuSnapshot({
      dayMaster,
      analysis: {
        power_label: powerLabel,
        yongshin_elements: yongshin,
        elementWeights: {
          wood: Number(percentages.wood || 0),
          fire: Number(percentages.fire || 0),
          earth: Number(percentages.earth || 0),
          metal: Number(percentages.metal || 0),
          water: Number(percentages.water || 0),
        },
      },
      daewoon: daewoonLabel ? [{ label: daewoonLabel, period: "현재 흐름" }] : [],
    });
  } catch (error) {
    console.warn("[SoulOrigin][LocalSajuFallbackFailed]", normalizeError(error));
    return { ok: false, highlights: [], timing: [] };
  }
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

function calculateWestern(input) {
  const birthInput = {
    birthDate: input.birthDate,
    birthYear: input.year,
    birthMonth: input.month,
    birthDay: input.day,
    birthTime: input.birthTime,
    birthHour: input.hour,
    birthMinute: input.minute,
    timezone: input.timezone,
    latitude: input.latitude,
    longitude: input.longitude,
    gender: input.gender,
    name: input.name,
  };
  const local = buildAstroLocalChartJson(birthInput, {}, null);
  const chart = local?.chart || {};
  const placements = Array.isArray(chart.planets) ? chart.planets : [];
  const highlights = placements
    .slice(0, 10)
    .map((planet) => {
      const name = clean(planet?.name || "").toUpperCase();
      const sign = clean(planet?.sign || "");
      return name && sign ? `${name} ${sign}` : "";
    })
    .filter(Boolean)
    .slice(0, 8);

  return {
    ok: highlights.length >= 3,
    highlights,
    timing: {
      ascendant: clean(chart?.ascendantSign || ""),
      midheaven: clean(chart?.midheavenSign || ""),
      transit: clean(chart?.currentTransitFocus || ""),
    },
    raw: local,
  };
}

function calculateVedic(input) {
  const birthInput = {
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    birthYear: input.year,
    birthMonth: input.month,
    birthDay: input.day,
    birthHour: input.hour,
    birthMinute: input.minute,
    timezone: input.timezone,
    latitude: input.latitude,
    longitude: input.longitude,
    gender: input.gender,
    name: input.name,
  };
  const local = buildVedicLocalChartJson(birthInput);
  const chart = local?.chart || {};
  const planets = Array.isArray(chart.planets) ? chart.planets : [];
  const highlights = planets
    .slice(0, 10)
    .map((planet) => {
      const name = clean(planet?.name || "");
      const sign = clean(planet?.sign || "");
      return name && sign ? `${name} ${sign}` : "";
    })
    .filter(Boolean)
    .slice(0, 8);

  return {
    ok: highlights.length >= 3,
    highlights,
    timing: {
      dasha: clean(chart?.dashas?.currentMahaDasha || ""),
      nextDasha: clean(chart?.dashas?.nextMahaDasha || ""),
    },
    raw: local,
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
  const relationInsight = buildPartnerRelationInsight(input);
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
      prayerTopic: input.prayerTopic,
      currentConcern: input.currentConcern,
      desiredOutcome: input.desiredOutcome,
      partnerInfo: input.partnerInfo,
      partnerBirthDate: input.partnerBirthDate,
      partnerBirthTime: input.partnerBirthTime,
    },
    sourceAvailability: {
      saju: saju.ok,
      westernAstro: western.ok,
      sukyo: sukuyo.ok,
      ziwei: ziwei.ok,
      vedic: vedic.ok,
    },
    originSignature: {
      title: "운명의 업 프리미엄 리포트",
      summary: "다섯 운세 흐름이 반복 패턴·사명·회복 전략으로 수렴되는 장면",
      archetypeKeywords,
    },
    karmicThemes: {
      loneliness: "고독은 단절이 아니라 내면의 구조를 정렬하기 위한 시간으로 나타납니다.",
      love: relationInsight.enabled
        ? `${relationInsight.summary} ${relationInsight.action}`
        : "사랑은 구원보다 동행의 기술을 배우는 장면으로 반복됩니다.",
      family: "가족의 기대와 자신의 속도 사이에서 경계 설정이 핵심 과제로 드러납니다.",
      career: "성과보다 방향의 정합성을 맞출 때 기회가 커집니다.",
      money: "불안 기반의 선택을 줄이고 주기 기반 전략이 필요합니다.",
      body: "과부하 신호를 늦게 인지하는 경향이 있어 리듬 관리가 중요합니다.",
      spirituality: "통제에서 신뢰로 이동할 때 직관이 선명해집니다.",
      transformation: "반복의 해석이 바뀌는 순간 고통이 재능으로 전환됩니다.",
    },
    repeatedPatterns,
    shadowPatterns: relationInsight.enabled
      ? [...shadowPatterns, "관계 속도 차이를 감정 거절로 오해하는 패턴"]
      : shadowPatterns,
    liberationKeys: relationInsight.enabled
      ? [...liberationKeys, relationInsight.action]
      : liberationKeys,
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

  let body = paragraphs.join("\n\n");
  while (sanitizeText(body).length < MIN_SECTION_CHARS) {
    body = sanitizeText(`${body}\n\n이 항목의 실행 원칙은 감정·관계·시간·돈의 우선순위를 동시에 정렬하는 데 있습니다. 반복되는 신호를 조기에 인식하고 주간 점검표에 반영하면 같은 실수를 줄이고 재능이 성과로 연결되는 속도를 높일 수 있습니다.`);
  }
  return body;
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

function buildSummary(chapters) {
  const first = chapters?.[0]?.sections?.[0]?.body || "";
  return sanitizeText(first).slice(0, 300) || "운명의 업은 반복을 인식하고 실행 구조를 바꿀 때 사명으로 전환됩니다.";
}

const CHAPTER_TOPIC_KEYWORDS = {
  1: ["통합", "반복", "업", "사명", "핵심"],
  2: ["일간", "월지", "십성", "오행", "용신", "대운"],
  3: ["명궁", "신궁", "삼방사정", "사화", "궁"],
  4: ["태양", "달", "상승궁", "MC", "어스펙트"],
  5: ["라그나", "달", "나크샤트라", "카라카", "다샤"],
  6: ["본명숙", "인연", "카르마", "관계", "역할"],
  7: ["사랑", "애착", "거리", "반복", "회복"],
  8: ["재물", "수익", "가치", "가격", "생활"],
  9: ["사명", "직업", "브랜드", "사회", "성공"],
  10: ["가족", "뿌리", "감정", "무의식", "회복"],
  11: ["위기", "전환", "선택", "반전", "회복"],
  12: ["대운", "세운", "다샤", "트랜싯", "90일"],
  13: ["몸", "마음", "관계", "돈", "실천"],
  14: ["강점", "그림자", "반복", "원칙", "통합"],
  15: ["1년", "3년", "10년", "전략", "최종"],
};

function collectReportText(chapters = []) {
  return chapters
    .flatMap((chapter) => {
      const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
      return [sanitizeText(chapter?.title || ""), sanitizeText(chapter?.subtitle || ""), ...sections.map((section) => sanitizeText(section?.body || ""))];
    })
    .filter(Boolean)
    .join("\n\n");
}

function validateNoRepetition(chapters = []) {
  const text = collectReportText(chapters);
  const sentences = text
    .split(/[.!?\n]/)
    .map((line) => sanitizeText(line).replace(/\s+/g, " "))
    .filter((line) => line.length >= 30);
  const sentenceMap = new Map();
  for (const sentence of sentences) {
    sentenceMap.set(sentence, (sentenceMap.get(sentence) || 0) + 1);
    if ((sentenceMap.get(sentence) || 0) >= 2) return { ok: false, reason: "duplicate_sentence" };
  }

  const openingMap = new Map();
  for (const chapter of chapters) {
    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    for (const section of sections) {
      const firstLine = sanitizeText((section?.body || "").split(/\n+/)[0] || "").slice(0, 45);
      if (!firstLine) continue;
      openingMap.set(firstLine, (openingMap.get(firstLine) || 0) + 1);
      if ((openingMap.get(firstLine) || 0) >= 3) return { ok: false, reason: "repeated_opening" };
    }
  }
  return { ok: true };
}

function validateChapterTopics(chapters = []) {
  for (const chapter of chapters) {
    const chapterNo = Number(chapter?.chapterNo || 0);
    const required = CHAPTER_TOPIC_KEYWORDS[chapterNo] || [];
    if (!required.length) continue;
    const text = sanitizeText(`${chapter?.title || ""} ${chapter?.subtitle || ""} ${(Array.isArray(chapter?.sections) ? chapter.sections.map((s) => s?.body || "").join(" ") : "")}`).toLowerCase();
    const hits = required.filter((keyword) => text.includes(String(keyword).toLowerCase())).length;
    if (hits < 2) return { ok: false, reason: `chapter_${chapterNo}_topic_weak` };
  }
  return { ok: true };
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
  const requestId = clean(body?.requestId || body?._paymentContext?.requestId || body?.payment?.requestId, 120);
  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId, 160);
  const productKey = clean(body?.productKey || body?.featureKey || SOUL_ORIGIN_FEATURE_KEY, 80);
  logFlow("ProductLookupStart", { reportType: "soulOriginKarma", productKey, requestId, sessionId });

  if (!productKey) {
    logFlow("ProductLookupFailed", {
      reportType: "soulOriginKarma",
      productKey,
      requestId,
      sessionId,
      errorCode: "MISSING_PRODUCT_KEY",
    });
    return json({ ok: false, code: "MISSING_PRODUCT_KEY", message: "결제 상품 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요." }, { status: 422 });
  }
  logFlow("ProductLookupSuccess", { reportType: "soulOriginKarma", productKey, requestId, sessionId });

  const input = normalizeInput(body?.input || {});

  if (!hasCoreBirthData(input)) {
    return json({ ok: false, code: "SOUL_ORIGIN_INVALID_INPUT", message: CORE_INPUT_ERROR_MESSAGE }, { status: 422 });
  }

  const premiumAccessToken = getPremiumAccessToken(request, body);
  logFlow("CoinGateStart", { reportType: "soulOriginKarma", productKey, requestId, sessionId });
  const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "soulOriginKarma", {
    reportType: "soulOriginKarma",
    featureKey: clean(body?.featureKey) || SOUL_ORIGIN_FEATURE_KEY,
    premiumAccessToken: premiumAccessToken || undefined,
    _accessRoute: "/api/soul-origin",
  });

  if (!access?.ok) {
    logFlow("Failed", {
      reportType: "soulOriginKarma",
      productKey,
      requestId,
      sessionId,
      errorCode: clean(access?.code || "ACCESS_DENIED", 80),
    });
    return json({
      ok: false,
      code: access?.code || "UNAUTHORIZED",
      message: access?.message || "운명의 업 리포트 생성 권한을 확인할 수 없습니다.",
    }, { status: Number(access?.status) || 403 });
  }
  logFlow("CoinGateSuccess", {
    reportType: "soulOriginKarma",
    productKey,
    requestId,
    sessionId: clean(access?.sessionId || sessionId, 160),
  });

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
  logFlow("SessionCreateStart", {
    reportType: "soulOriginKarma",
    productKey,
    requestId,
    sessionId: clean(executionCtx?.sessionId || sessionId, 160),
  });

  const snapshots = body?.engineSnapshots && typeof body.engineSnapshots === "object" ? body.engineSnapshots : {};

  let western = { ok: false, highlights: [], timing: null };
  let vedic = { ok: false, highlights: [], timing: null };
  let sukuyo = { ok: false, highlights: [] };

  try {
    western = calculateWestern(input);
  } catch (error) {
    console.warn("[SoulOrigin][WesternFailed]", normalizeError(error));
  }

  try {
    vedic = calculateVedic(input);
  } catch (error) {
    console.warn("[SoulOrigin][VedicFailed]", normalizeError(error));
  }

  try {
    sukuyo = calculateSukuyo(input);
  } catch (error) {
    console.warn("[SoulOrigin][SukuyoFailed]", normalizeError(error));
  }

  let saju = normalizeSajuSnapshot(snapshots.saju || {});
  if (!saju.ok) {
    saju = buildSajuSnapshotFromInput(input);
  }
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
    logFlow("LocalCalcStart", {
      reportType: "soulOriginKarma",
      productKey,
      requestId,
      sessionId: clean(executionCtx?.sessionId || sessionId, 160),
    });
    const seed = buildSoulOriginSeed({ input, saju, western, sukuyo, ziwei, vedic });
    let localChapters = buildLocalChapters(seed);
    localChapters = enrichSectionsUntilLength(localChapters, seed, MIN_LOCAL_TOTAL_CHARS, 1);
    localChapters = appendUniquenessTag(localChapters);
    logFlow("LocalCalcSuccess", {
      reportType: "soulOriginKarma",
      productKey,
      requestId,
      sessionId: clean(executionCtx?.sessionId || sessionId, 160),
    });

    let chapters = localChapters;
    const fallbackNotice = "";

    const finalLength = reportCharLength(chapters);
    if (finalLength < TARGET_TOTAL_CHARS_AFTER_ENHANCEMENT) {
      chapters = enrichSectionsUntilLength(chapters, seed, TARGET_TOTAL_CHARS_AFTER_ENHANCEMENT, 3);
      chapters = appendUniquenessTag(chapters);
    }

    const repetition = validateNoRepetition(chapters);
    if (!repetition.ok) {
      chapters = enrichSectionsUntilLength(chapters, seed, TARGET_TOTAL_CHARS_AFTER_ENHANCEMENT + 3000, 5);
      chapters = appendUniquenessTag(chapters);
    }

    const topicValidation = validateChapterTopics(chapters);
    if (!topicValidation.ok) {
      chapters = enrichSectionsUntilLength(chapters, seed, TARGET_TOTAL_CHARS_AFTER_ENHANCEMENT + 2000, 6);
      chapters = appendUniquenessTag(chapters);
    }

    const createdAt = new Date().toISOString();

    const responseBody = {
      ok: true,
      reportId,
      title: "운명의 업 프리미엄 리포트",
      chapters,
      summary: buildSummary(chapters),
      createdAt,
      sourceAvailability,
      notice: fallbackNotice || undefined,
      sessionId: clean(executionCtx?.sessionId || sessionId, 160) || undefined,
    };

    REPORT_CACHE.set(reportId, {
      reportId,
      userId: auth.userId,
      createdAt,
      payload: responseBody,
    });

    logFlow("PDFCreateStart", {
      reportType: "soulOriginKarma",
      productKey,
      requestId,
      sessionId: clean(executionCtx?.sessionId || sessionId, 160),
    });
    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      manuscriptSource: "local-only",
      chapterCount: Array.isArray(chapters) ? chapters.length : 0,
      archive: {
        reportId,
        reportType: "soul_origin_book",
        displayName: "운명의 업",
        title: "운명의 업 프리미엄 리포트",
        mode: "personal",
        birthName: clean(input?.name),
        summary: clean(responseBody?.summary, 1000),
        pdfUrl: "",
        chapters,
        payload: {
          sourceAvailability,
          title: responseBody.title,
          notice: fallbackNotice || "",
        },
        canReopen: true,
        canDownload: false,
      },
    });

    logFlow("PDFCreateSuccess", {
      reportType: "soulOriginKarma",
      productKey,
      requestId,
      sessionId: clean(executionCtx?.sessionId || sessionId, 160),
    });

    return json(responseBody);
  } catch (error) {
    logFlow("Failed", {
      reportType: "soulOriginKarma",
      productKey,
      requestId,
      sessionId: clean(executionCtx?.sessionId || sessionId, 160),
      errorCode: clean(error?.code || "SOUL_ORIGIN_GENERATION_FAILED", 80),
    });
    await failPremiumPdfExecution(
      env,
      auth.userId,
      executionCtx,
      "soul_origin_generation_failed",
      clean(error?.message || "운명의 업 리포트 생성에 실패했습니다."),
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
    await connectDb(env);
    const archived = await ServiceExecutionTransaction.findOne({
      userId: auth.userId,
      reportId,
      status: "success",
      premiumStatus: "completed",
    })
      .sort({ completedAt: -1, updatedAt: -1 })
      .lean();

    const archive = archived?.metadata?.archive && typeof archived.metadata.archive === "object"
      ? archived.metadata.archive
      : null;

    if (!archive) {
      return json({ ok: false, code: "REPORT_NOT_FOUND", message: "요청한 운명의 업 리포트를 찾을 수 없습니다." }, { status: 404 });
    }

    const payload = {
      ok: true,
      reportId: clean(archive.reportId || reportId),
      title: clean(archive.title || "운명의 업 프리미엄 리포트") || "운명의 업 프리미엄 리포트",
      chapters: Array.isArray(archive.chapters) ? archive.chapters : [],
      summary: clean(archive.summary || ""),
      createdAt: archived?.createdAt instanceof Date ? archived.createdAt.toISOString() : new Date().toISOString(),
      sourceAvailability: archive?.payload?.sourceAvailability || {},
      notice: clean(archive?.payload?.notice || "") || undefined,
      sessionId: clean(archived?.sessionId || "") || undefined,
    };

    REPORT_CACHE.set(reportId, {
      reportId,
      userId: auth.userId,
      createdAt: payload.createdAt,
      payload,
    });

    return json(payload);
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
