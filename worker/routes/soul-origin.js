import { Solar } from "lunar-javascript";
import { buildAstroLocalChartJson as buildAstroChartJson } from "../lib/astro-premium-generator.js";
import { buildVedicLocalChartJson as buildVedicChartJson } from "../lib/vedic-premium-generator.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { buildSukuyoFromLunar } from "../lib/sukuyo-premium.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { verifyPremiumAccessToken } from "../lib/premium-access-token.js";
import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";
import { callGeminiText } from "../lib/gemini.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";
import {
  completeServiceExecution,
  failServiceExecution,
  getServiceExecution,
  startServiceExecution,
} from "../lib/service-execution-task.js";
import { soulOriginChapterPlanV1 } from "../lib/pdf-v2/soul-origin/soul-origin-premium.chapter-plan.js";
import { normalizeSoulOriginCalculationInput } from "../lib/pdf-v2/soul-origin/soul-origin-premium.normalizer.js";
import { buildKarmaIntegratedData } from "../lib/pdf-v2/soul-origin/karma-data-orchestrator.js";
import {
  SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
  SOUL_ORIGIN_LLM_PROVIDER,
  SOUL_ORIGIN_LLM_WRITING_PIPELINE,
  hashStable as hashSoulOriginStable,
} from "../lib/pdf-v2/soul-origin/soul-origin-premium.types.js";
import { createSoulOriginPremiumPdfJob } from "../lib/pdf-v2/soul-origin/create-soul-origin-premium-pdf-job.js";

const SOUL_ORIGIN_FEATURE_KEY = "premium_pdf_soul_origin";
const SOUL_ORIGIN_SERVICE_KEY = "soul-origin";
const SOUL_ORIGIN_DISPLAY_NAME = "운명의 업";
const SOUL_ORIGIN_TITLE = "운명의 업 프리미엄 상담서";
const SOUL_ORIGIN_REPORT_TYPE = "soulOriginKarma";
const SOUL_ORIGIN_ARCHIVE_REPORT_TYPE = "soul_origin_karma";
const SOUL_ORIGIN_AI_CONSULTATION_SERVICE_TYPE = "soul_origin_ai_consultation";
const SOUL_ORIGIN_AI_CONSULTATION_SERVICE_KEY = "soul-origin-ai-consultation";
const SOUL_ORIGIN_AI_DEFAULT_AMOUNT_COINS = 690;
const KARMA_AI_CONSULTATION_MARKER = "[Karma AI Consultation]";
const SOUL_ORIGIN_MANUSCRIPT_SOURCE = SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE;
const SOUL_ORIGIN_PROVIDER = SOUL_ORIGIN_LLM_PROVIDER;
const SOUL_ORIGIN_WRITING_PIPELINE = SOUL_ORIGIN_LLM_WRITING_PIPELINE;
const SOUL_ORIGIN_REPORT_TYPE_ALIASES = [
  "premium_pdf_soul_origin",
  SOUL_ORIGIN_REPORT_TYPE,
  "soul_origin_karma",
  "soul-origin",
  "premium-soul-origin-report",
];
const SOUL_ORIGIN_FEATURE_ALIASES = [
  SOUL_ORIGIN_REPORT_TYPE,
  "soul_origin_karma",
  "soul-origin",
  "premium-soul-origin-report",
];

const KARMA_AI_CONSULTATION_CATEGORIES = Object.freeze({
  general: "종합 업 리딩",
  repeat_crisis: "반복되는 인생 고비",
  relationship: "관계와 인연의 업",
  family: "가족/부모와의 과제",
  money: "돈과 성공의 막힘",
  career: "직업과 사명의 방향",
  love_attachment: "사랑과 집착의 패턴",
  self_sabotage: "두려움과 자기방해",
  liberation_timing: "전환점과 해방의 시기",
  nodes: "라후/케투와 노드의 흐름",
  timing_flow: "대운/다샤/트랜짓 통합 흐름",
  choice: "지금의 선택",
});

const BIRTH_TIME_REQUIRED_MESSAGE = "운명의 업 PDF는 시주와 운의 흐름을 정밀하게 읽기 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해 주세요.";

const REPORT_CACHE = globalThis.__SOUL_ORIGIN_REPORT_CACHE || new Map();
if (!globalThis.__SOUL_ORIGIN_REPORT_CACHE) {
  globalThis.__SOUL_ORIGIN_REPORT_CACHE = REPORT_CACHE;
}

const SESSION_LOCKS = globalThis.__SOUL_ORIGIN_SESSION_LOCKS || new Map();
if (!globalThis.__SOUL_ORIGIN_SESSION_LOCKS) {
  globalThis.__SOUL_ORIGIN_SESSION_LOCKS = SESSION_LOCKS;
}

const ACCESS_VERIFICATIONS = globalThis.__SOUL_ORIGIN_ACCESS_VERIFICATIONS || new Map();
if (!globalThis.__SOUL_ORIGIN_ACCESS_VERIFICATIONS) {
  globalThis.__SOUL_ORIGIN_ACCESS_VERIFICATIONS = ACCESS_VERIFICATIONS;
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

const ELEMENT_LABELS = Object.freeze({
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
});

const BRANCH_RELATION = Object.freeze({
  합: [["자", "축"], ["인", "해"], ["묘", "술"], ["진", "유"], ["사", "신"], ["오", "미"]],
  충: [["자", "오"], ["축", "미"], ["인", "신"], ["묘", "유"], ["진", "술"], ["사", "해"]],
  형: [["인", "사"], ["사", "신"], ["신", "인"], ["축", "술"], ["술", "미"], ["미", "축"], ["자", "묘"], ["묘", "자"], ["진", "진"], ["오", "오"], ["유", "유"], ["해", "해"]],
  파: [["자", "유"], ["묘", "오"], ["진", "축"], ["미", "술"], ["인", "해"], ["사", "신"]],
  해: [["자", "미"], ["축", "오"], ["인", "사"], ["묘", "진"], ["신", "해"], ["유", "술"]],
});

const PALACE_LABELS = ["명궁", "형제궁", "부부궁", "자녀궁", "재백궁", "질액궁", "천이궁", "교우궁", "관록궁", "전택궁", "복덕궁", "부모궁"];
const STAR_POOL = ["자미", "천기", "태양", "무곡", "천동", "염정", "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"];
const ZHI_LIST = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value) {
  return Math.round(safeNumber(value, 0));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, safeNumber(value, 0)));
}

function toInt(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function isValidBirthDateParts(year, month, day, calendarType = "solar") {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  if (String(calendarType || "").startsWith("lunar")) return day <= 30;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function toIso(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function normalizeStemLabel(value) {
  const raw = clean(value);
  return STEM_KO_MAP[raw] || raw;
}

function normalizeBranchLabel(value) {
  const raw = clean(value);
  return BRANCH_KO_MAP[raw] || raw;
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

function normalizeError(error) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
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

function logFlow(stage, payload = {}) {
  const safe = {
    stage: clean(stage || "Unknown"),
    requestId: clean(payload.requestId || ""),
    sessionId: clean(payload.sessionId || ""),
    reportId: clean(payload.reportId || ""),
    errorCode: clean(payload.errorCode || ""),
  };
  const tag = `[SoulOrigin][${safe.stage}]`;
  if (safe.errorCode) {
    console.error(tag, safe);
    return;
  }
  console.info(tag, safe);
}

function normalizeBirthInput(raw = {}) {
  const src = raw && typeof raw === "object" ? raw : {};
  const location = src.location && typeof src.location === "object" ? src.location : {};

  const birthDateRaw = clean(src.birthDate || src.date || src.birthday || "");
  const dateMatch = birthDateRaw.match(/(\d{4})[-./\s년](\d{1,2})[-./\s월](\d{1,2})/);
  const year = dateMatch ? toInt(dateMatch[1], NaN) : toInt(src.year ?? src.birthYear, NaN);
  const month = dateMatch ? toInt(dateMatch[2], NaN) : toInt(src.month ?? src.birthMonth, NaN);
  const day = dateMatch ? toInt(dateMatch[3], NaN) : toInt(src.day ?? src.birthDay, NaN);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return { ok: false, code: "BIRTH_DATE_REQUIRED", message: "운명의 업 리포트 생성을 위해 생년월일 정보가 필요합니다." };
  }

  const birthTimeRaw = clean(src.birthTime || src.time || "");
  let hour = toInt(src.birthHour ?? src.hour, NaN);
  let minute = toInt(src.birthMinute ?? src.minute, 0);
  const timeMatch = birthTimeRaw.match(/(\d{1,2})\s*[:시]\s*(\d{1,2})?/);
  if (timeMatch) {
    hour = toInt(timeMatch[1], NaN);
    minute = toInt(timeMatch[2], 0);
  }

  if (!Number.isFinite(hour)) {
    return { ok: false, code: "BIRTH_TIME_REQUIRED", message: BIRTH_TIME_REQUIRED_MESSAGE };
  }

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { ok: false, code: "BIRTH_INPUT_INVALID", message: "생년월일시 형식을 확인해 주세요." };
  }

  const birthDate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const birthTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const latitude = safeNumber(src.latitude ?? location.lat ?? location.latitude, 37.5665);
  const longitude = safeNumber(src.longitude ?? src.lng ?? src.lon ?? location.lng ?? location.lon ?? location.longitude, 126.978);
  const calendarRaw = clean(src.calendarType || src.calendar || src.calType || "solar").toLowerCase();
  const calendarType = calendarRaw.includes("lunar")
    ? (calendarRaw.includes("leap") || calendarRaw.includes("윤") ? "lunar_leap" : "lunar")
    : "solar";

  if (!isValidBirthDateParts(year, month, day, calendarType)) {
    return { ok: false, code: "BIRTH_INPUT_INVALID", message: "생년월일시 형식을 확인해 주세요." };
  }

  const birthPlace = clean(
    src.birthPlace
    || src.birthplace
    || src.place
    || src.locationName
    || location.label
    || location.name
    || location.city
    || "대한민국"
  ) || "대한민국";

  return {
    ok: true,
    input: {
      name: clean(src.name || "사용자") || "사용자",
      gender: clean(src.gender || src.sex || "unknown") || "unknown",
      birthDate,
      birthTime,
      birthPlace,
      calendarType,
      timezone: clean(src.timezone || location.tz || "Asia/Seoul") || "Asia/Seoul",
      timezoneOffset: safeNumber(src.timezoneOffset ?? location.tzOffset, 9),
      latitude,
      longitude,
      year,
      month,
      day,
      hour,
      minute,
    },
  };
}

function branchKoToHan(value = "") {
  return BRANCH_HAN_MAP[clean(value)] || clean(value);
}

function detectBranchRelations(branches = []) {
  const list = Array.isArray(branches) ? branches.filter(Boolean) : [];
  const hits = [];
  const used = new Set();

  Object.keys(BRANCH_RELATION).forEach((type) => {
    const pairs = BRANCH_RELATION[type] || [];
    pairs.forEach(([a, b]) => {
      const hasA = list.includes(a);
      const hasB = list.includes(b);
      if (!hasA || !hasB) return;
      const key = `${type}:${a}-${b}`;
      if (used.has(key)) return;
      used.add(key);
      hits.push(`${a}${b}${type}`);
    });
  });

  return hits;
}

function buildTwelveGrowthStages(pillars = {}) {
  const stageByBranch = {
    자: "태", 축: "양", 인: "장생", 묘: "목욕", 진: "관대", 사: "건록", 오: "제왕", 미: "쇠", 신: "병", 유: "사", 술: "묘", 해: "절",
  };

  const ordered = ["year", "month", "day", "hour"];
  return ordered.map((key) => {
    const branch = clean(pillars?.[key]?.branch);
    return {
      pillar: key,
      branch,
      stage: stageByBranch[branch] || "평",
    };
  });
}

function calcSpecialStarsFromPillars(pillars = {}) {
  const dayBranch = clean(pillars?.day?.branch);
  const monthBranch = clean(pillars?.month?.branch);
  const hourBranch = clean(pillars?.hour?.branch);
  const branches = [dayBranch, monthBranch, hourBranch].filter(Boolean).map((v) => branchKoToHan(v));
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

  const stars = [];
  if ((taoByDay[dayHan] || []).some((v) => branches.includes(v))) stars.push("도화");
  if ((yeokmaByDay[dayHan] || []).some((v) => branches.includes(v))) stars.push("역마");
  if ((hwaByDay[dayHan] || []).some((v) => branches.includes(v))) stars.push("화개");
  return stars;
}

function getPillar(profile, key) {
  const p = profile?.pillars?.[key] || {};
  const stem = normalizeStemLabel(p.stemKo || p.stem || "");
  const branch = normalizeBranchLabel(p.branchKo || p.branch || "");
  return {
    stem,
    branch,
    ganji: `${stem}${branch}`.trim(),
  };
}

function calculateSajuSnapshot(birthInput) {
  const profile = buildSajuProfile({
    name: birthInput.name,
    gender: birthInput.gender,
    timezone: birthInput.timezone || "Asia/Seoul",
    location: {
      name: birthInput.birthPlace || "대한민국",
      latitude: birthInput.latitude,
      longitude: birthInput.longitude,
      timezone: birthInput.timezone || "Asia/Seoul",
    },
    hourPillarTimePolicy: "TRUE_SOLAR_TIME",
    dayChangePolicy: "MIDNIGHT",
    birth: {
      year: birthInput.year,
      month: birthInput.month,
      day: birthInput.day,
      hour: birthInput.hour,
      minute: birthInput.minute,
      calendarType: birthInput.calendarType || "solar",
      timezone: birthInput.timezone || "Asia/Seoul",
      birthPlace: birthInput.birthPlace || "대한민국",
      latitude: birthInput.latitude,
      longitude: birthInput.longitude,
      unknownTime: false,
    },
  });

  const yearPillar = getPillar(profile, "year");
  const monthPillar = getPillar(profile, "month");
  const dayPillar = getPillar(profile, "day");
  const hourPillar = getPillar(profile, "hour");

  const five = profile?.fiveElements?.percentages || {};
  const tenGodCounts = profile?.tenGods?.counts && typeof profile.tenGods.counts === "object"
    ? profile.tenGods.counts
    : {};

  const usefulGods = profile?.usefulGods || {};
  const useful = clean(usefulGods.yong || "");
  const support = Array.isArray(usefulGods.hee) ? usefulGods.hee.map((v) => clean(v)).filter(Boolean) : [];
  const caution = Array.isArray(usefulGods.gi) ? usefulGods.gi.map((v) => clean(v)).filter(Boolean) : [];

  const elementWeights = {
    wood: round(safeNumber(five.wood, 0)),
    fire: round(safeNumber(five.fire, 0)),
    earth: round(safeNumber(five.earth, 0)),
    metal: round(safeNumber(five.metal, 0)),
    water: round(safeNumber(five.water, 0)),
  };

  const sortedElements = Object.entries(elementWeights).sort((a, b) => Number(b[1]) - Number(a[1]));
  const dominantElement = clean(sortedElements[0]?.[0] || "earth");
  const deficientElement = clean(sortedElements[sortedElements.length - 1]?.[0] || "water");

  const topTenGod = Object.keys(tenGodCounts)
    .sort((a, b) => safeNumber(tenGodCounts[b], 0) - safeNumber(tenGodCounts[a], 0))
    .slice(0, 3);

  const daewoonRaw = Array.isArray(profile?.daewoon) ? profile.daewoon.slice(0, 10) : [];
  const daewoonCycles = daewoonRaw
    .map((item, idx) => ({
      order: idx + 1,
      label: clean(item?.ganji || item?.label || ""),
      startAge: safeNumber(item?.startAge, 0),
    }))
    .filter((item) => item.label);

  const age = new Date().getFullYear() - birthInput.year + 1;
  let currentDaewun = "";
  let nextDaewun = "";
  for (let i = 0; i < daewoonCycles.length; i += 1) {
    const node = daewoonCycles[i];
    const next = daewoonCycles[i + 1] || null;
    const start = safeNumber(node.startAge, 0);
    const end = next ? safeNumber(next.startAge, 120) - 1 : 120;
    if (age >= start && age <= end) {
      currentDaewun = node.label;
      nextDaewun = next?.label || "";
      break;
    }
  }

  if (!currentDaewun && daewoonCycles.length) {
    currentDaewun = daewoonCycles[0].label;
    nextDaewun = daewoonCycles[1]?.label || "";
  }

  const nowSolar = Solar.fromDate(new Date());
  const nowEight = nowSolar.getLunar().getEightChar();
  const currentYearPillar = `${normalizeStemLabel(nowEight.getYearGan())}${normalizeBranchLabel(nowEight.getYearZhi())}`.trim();

  const pillars = {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
  };

  const pillarBranches = [yearPillar.branch, monthPillar.branch, dayPillar.branch, hourPillar.branch].filter(Boolean);
  const branchRelations = detectBranchRelations(pillarBranches);
  const specialStars = calcSpecialStarsFromPillars(pillars);
  const twelveGrowthStages = buildTwelveGrowthStages(pillars);

  return {
    dayMaster: dayPillar.stem,
    monthBranch: monthPillar.branch,
    yearPillar: yearPillar.ganji,
    monthPillar: monthPillar.ganji,
    dayPillar: dayPillar.ganji,
    hourPillar: hourPillar.ganji,
    pillars,
    elementWeights,
    dominantElement,
    deficientElement,
    tenGodCounts,
    topTenGod,
    yongshin: useful,
    heesin: support,
    gisin: caution,
    strength: clean(usefulGods.strength || "중화") || "중화",
    daewoonCycles,
    currentDaewun,
    nextDaewun,
    currentYear: new Date().getFullYear(),
    currentYearPillar,
    specialStars,
    twelveGrowthStages,
    branchRelations,
  };
}

function calculateZiweiSnapshot(birthInput) {
  const solar = Solar.fromYmdHms(birthInput.year, birthInput.month, birthInput.day, birthInput.hour, birthInput.minute, 0);
  const lunar = solar.getLunar();

  const lMonth = Math.abs(Number(lunar.getMonth()));
  const hIdx = (birthInput.hour === 23 || birthInput.hour === 0) ? 0 : Math.floor((birthInput.hour + 1) / 2);
  const baseIdx = (2 + lMonth - 1) % 12;
  const mingIdx = (baseIdx - hIdx + 12) % 12;
  const shenIdx = (baseIdx + hIdx) % 12;

  const palaces = Array.from({ length: 12 }).map((_, i) => {
    const branchIndex = (mingIdx - i + 12) % 12;
    const palaceName = PALACE_LABELS[i];
    const starA = STAR_POOL[(birthInput.day + i) % STAR_POOL.length];
    const starB = STAR_POOL[(birthInput.month + i + 5) % STAR_POOL.length];
    return {
      index: i,
      palace: palaceName,
      branch: ZHI_LIST[branchIndex],
      mainStars: [starA, starB],
    };
  });

  return {
    chartMeta: {
      mingGong: ZHI_LIST[mingIdx],
      shenGong: ZHI_LIST[shenIdx],
      yearGan: clean(lunar.getYearGan() || ""),
      yearZhi: clean(lunar.getYearZhi() || ""),
    },
    palaces,
  };
}

function calculateAstrologySnapshot(birthInput) {
  const chartJson = buildAstroChartJson({
    birthDate: birthInput.birthDate,
    birthTime: birthInput.birthTime,
    birthYear: birthInput.year,
    birthMonth: birthInput.month,
    birthDay: birthInput.day,
    birthHour: birthInput.hour,
    birthMinute: birthInput.minute,
    timezone: birthInput.timezone,
    latitude: birthInput.latitude,
    longitude: birthInput.longitude,
    gender: birthInput.gender,
    name: birthInput.name,
  }, {}, null);

  const chart = chartJson?.chart || {};
  return {
    sun: clean(chart?.sunSign || ""),
    moon: clean(chart?.moonSign || ""),
    ascendant: clean(chart?.ascendantSign || ""),
    majorPlanets: Array.isArray(chart?.planets) ? chart.planets.slice(0, 10) : [],
    houses: Array.isArray(chart?.houses) ? chart.houses : [],
  };
}

function calculateVedicSnapshot(birthInput) {
  const chartJson = buildVedicChartJson({
    birthDate: birthInput.birthDate,
    birthTime: birthInput.birthTime,
    birthYear: birthInput.year,
    birthMonth: birthInput.month,
    birthDay: birthInput.day,
    birthHour: birthInput.hour,
    birthMinute: birthInput.minute,
    timezone: birthInput.timezone,
    latitude: birthInput.latitude,
    longitude: birthInput.longitude,
    gender: birthInput.gender,
    name: birthInput.name,
  });

  const chart = chartJson?.chart || {};
  return {
    lagna: clean(chart?.lagnaSign || chart?.ascendantSign || ""),
    moonNakshatra: clean(chart?.moonNakshatra || ""),
    dasha: {
      current: clean(chart?.dashas?.currentMahaDasha || ""),
      next: clean(chart?.dashas?.nextMahaDasha || ""),
    },
    rahu: clean(chart?.rahuSign || ""),
    ketu: clean(chart?.ketuSign || ""),
    planets: Array.isArray(chart?.planets) ? chart.planets.slice(0, 9) : [],
    houses: Array.isArray(chart?.houses) ? chart.houses : [],
  };
}

function calculateSukyoSnapshot(birthInput) {
  const solar = Solar.fromYmdHms(birthInput.year, birthInput.month, birthInput.day, birthInput.hour, birthInput.minute, 0);
  const lunar = solar.getLunar();
  const lunarMonth = Number(lunar.getMonth());
  const lunarDay = Number(lunar.getDay());
  const basic = buildSukuyoFromLunar(Math.abs(lunarMonth), lunarDay, {
    isLeapMonth: lunarMonth < 0,
    source: "lunar-javascript",
  });

  return {
    natalStar: clean(basic?.nameKo || basic?.name || ""),
    element: clean(basic?.elementKo || ""),
    nature: clean(basic?.natureKo || ""),
  };
}

function deriveCrossSignals(calculationSeed) {
  const saju = calculationSeed?.saju || {};
  const tenGod = Array.isArray(saju.topTenGod) && saju.topTenGod.length ? saju.topTenGod.join(", ") : "핵심 십성";
  const stars = Array.isArray(saju.specialStars) && saju.specialStars.length ? saju.specialStars.join(", ") : "주요 신살";
  const growth = Array.isArray(saju.twelveGrowthStages) && saju.twelveGrowthStages.length
    ? saju.twelveGrowthStages.slice(0, 3).map((item) => `${item.pillar} ${item.stage}`).join(", ")
    : "십이운성 흐름";
  const relation = Array.isArray(saju.branchRelations) && saju.branchRelations.length
    ? saju.branchRelations.slice(0, 4).join(", ")
    : "합충형파해 신호";

  return {
    dayMaster: clean(saju.dayMaster || ""),
    monthBranch: clean(saju.monthBranch || ""),
    pillars: [saju.yearPillar, saju.monthPillar, saju.dayPillar, saju.hourPillar].filter(Boolean),
    tenGod,
    stars,
    growth,
    relation,
    yongshin: clean(saju.yongshin || ""),
    heesin: Array.isArray(saju.heesin) ? saju.heesin.join(", ") : "",
    gisin: Array.isArray(saju.gisin) ? saju.gisin.join(", ") : "",
    daewun: clean(saju.currentDaewun || ""),
    nextDaewun: clean(saju.nextDaewun || ""),
    sewoon: clean(saju.currentYearPillar || ""),
    dominantElement: clean(saju.dominantElement || ""),
    deficientElement: clean(saju.deficientElement || ""),
    elementWeights: saju.elementWeights && typeof saju.elementWeights === "object" ? saju.elementWeights : {},
    mingGong: clean(calculationSeed?.ziwei?.chartMeta?.mingGong || ""),
    shenGong: clean(calculationSeed?.ziwei?.chartMeta?.shenGong || ""),
    astro: [clean(calculationSeed?.astrology?.sun), clean(calculationSeed?.astrology?.moon), clean(calculationSeed?.astrology?.ascendant)].filter(Boolean).join(" · "),
    vedic: [clean(calculationSeed?.vedic?.lagna), clean(calculationSeed?.vedic?.moonNakshatra), clean(calculationSeed?.vedic?.dasha?.current)].filter(Boolean).join(" · "),
    sukyo: clean(calculationSeed?.sukyo?.natalStar || ""),
  };
}

async function buildSoulOriginCalculationSeed(_env, birthInput) {
  const engineErrors = [];
  const seed = {
    birthInput,
    saju: null,
    ziwei: null,
    astrology: null,
    vedic: null,
    sukyo: null,
    generatedAt: new Date().toISOString(),
  };

  try {
    seed.saju = calculateSajuSnapshot(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "saju", error: normalizeError(error) });
  }

  try {
    seed.ziwei = calculateZiweiSnapshot(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "ziwei", error: normalizeError(error) });
  }

  try {
    seed.astrology = calculateAstrologySnapshot(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "astrology", error: normalizeError(error) });
  }

  try {
    seed.vedic = calculateVedicSnapshot(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "vedic", error: normalizeError(error) });
  }

  try {
    seed.sukyo = calculateSukyoSnapshot(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "sukyo", error: normalizeError(error) });
  }

  if (engineErrors.length) {
    console.error("[SoulOrigin][CalculationFailed]", { engineErrors });
    const err = new Error("운명의 업 리포트 생성에 필요한 출생 정보 계산을 완료하지 못했습니다. 프로필 정보를 확인해 주세요.");
    err.code = "SOUL_ORIGIN_CALCULATION_FAILED";
    err.status = 422;
    err.failedStep = "calculating";
    err.engineErrors = engineErrors;
    throw err;
  }

  seed.signals = deriveCrossSignals(seed);
  seed.engineErrors = engineErrors;
  return seed;
}

function makeReportId() {
  return `soul-origin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function updateSoulOriginSessionLock(sessionId, patch = {}) {
  const previous = SESSION_LOCKS.get(sessionId) || {};
  SESSION_LOCKS.set(sessionId, {
    ...previous,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

function soulOriginProgressFields(lock = {}) {
  const publicStatus = publicSoulOriginJobStatus(lock);
  return {
    generationStatus: clean(lock.generationStatus || lock.currentStep || ""),
    progress: Number.isFinite(Number(lock.progress)) ? Number(lock.progress) : publicStatus.progressPercent,
    progressPercent: publicStatus.progressPercent,
    currentStep: clean(lock.currentStep || ""),
    currentChapterId: clean(lock.currentChapterId || ""),
    currentChapterTitle: clean(lock.currentChapterTitle || ""),
    totalChapters: publicStatus.totalChapters,
    completedChapters: publicStatus.completedChapters,
    chapters: publicStatus.chapters,
    systemStatus: lock.systemStatus && typeof lock.systemStatus === "object" ? lock.systemStatus : undefined,
    failedStep: clean(lock.failedStep || ""),
    failedChapterId: clean(lock.failedChapterId || ""),
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
  };
}

function buildCalculationSystemStatus(seed = {}) {
  return {
    saju: Boolean(seed.saju),
    vedic: Boolean(seed.vedic),
    astrology: Boolean(seed.astrology),
    ziwei: Boolean(seed.ziwei),
    sukuyo: Boolean(seed.sukyo),
  };
}

function isKarmaAIConsultationDryRun(env = {}) {
  return truthyFlag(env?.SOUL_ORIGIN_AI_CONSULTATION_DRY_RUN || env?.KARMA_AI_CONSULTATION_DRY_RUN || env?.LLM_DRY_RUN || "");
}

function hasKarmaAIGeminiApiKey(env = {}) {
  const keys = [
    "GEMINIF_API_KEY",
    "GEMINIF_API_KEY1",
    "GEMINIF_API_KEY2",
    "GEMINIF_API_KEY3",
    "GEMINIF_API_KEY4",
    "GEMINI_API_KEY",
    "GOOGLE_GEMINI_API_KEY",
  ];
  if (keys.some((key) => clean(env?.[key]))) return true;
  try {
    return keys.some((key) => clean(process?.env?.[key]));
  } catch (_) {
    return false;
  }
}

function logKarmaAIConsultation(marker, details = {}) {
  const payload = {
    hasEnvAI: details.hasEnvAI === true,
    providerName: clean(details.providerName || ""),
    isMock: details.isMock === true,
    dryRun: details.dryRun === true,
    category: clean(details.category || ""),
    questionLength: Number(details.questionLength || 0),
    hasBirthTime: details.hasBirthTime === true,
    hasBirthPlace: details.hasBirthPlace === true,
    timezoneResolved: details.timezoneResolved === true,
    sajuCalculated: details.sajuCalculated === true,
    vedicCalculated: details.vedicCalculated === true,
    astrologyCalculated: details.astrologyCalculated === true,
    hasDaeun: details.hasDaeun === true,
    hasDasha: details.hasDasha === true,
    hasTransit: details.hasTransit === true,
    hasNodes: details.hasNodes === true,
    integrationContextBuilt: details.integrationContextBuilt === true,
    dataLimitations: asArray(details.dataLimitations).map((item) => clean(item)).filter(Boolean).slice(0, 8),
    llmLatencyMs: Number.isFinite(Number(details.llmLatencyMs)) ? Number(details.llmLatencyMs) : undefined,
    errorCode: clean(details.errorCode || ""),
    authSource: clean(details.authSource || ""),
    tokenVerified: details.tokenVerified === true,
  };
  try {
    console.info(`${KARMA_AI_CONSULTATION_MARKER} ${marker}`, payload);
  } catch (_) {
    console.info(`${KARMA_AI_CONSULTATION_MARKER} ${marker}`);
  }
}

function buildKarmaAIError(code, message, status = 400, extra = {}) {
  return json({
    ok: false,
    serviceType: SOUL_ORIGIN_AI_CONSULTATION_SERVICE_TYPE,
    featureKey: SOUL_ORIGIN_FEATURE_KEY,
    reportType: SOUL_ORIGIN_REPORT_TYPE,
    code,
    message,
    ...extra,
  }, { status });
}

function buildKarmaAIAuthFromPremiumToken(tokenPayload = {}) {
  const userId = clean(tokenPayload.userId || tokenPayload.sub);
  if (!userId) return null;
  return {
    userId,
    email: clean(tokenPayload.email),
    role: clean(tokenPayload.role) || "user",
    name: clean(tokenPayload.name),
    image: "",
    birthDate: "",
    birthTime: "",
    gender: "OTHER",
    points: 0,
    joinedAt: null,
  };
}

async function resolveKarmaAIConsultationAuth(request, env, body = {}) {
  try {
    const auth = await requireAuth(request, env);
    return { ok: true, auth, authSource: "login", tokenVerified: false };
  } catch (error) {
    if (Number(error?.status) !== 401) throw error;
  }

  const premiumAccessToken = getPremiumAccessToken(request, body);
  if (!premiumAccessToken) {
    return {
      ok: false,
      status: 401,
      code: "AUTH_REQUIRED",
      message: "운명의 업 AI 상담을 위해 먼저 로그인해 주세요.",
    };
  }

  const verified = await verifyPremiumAccessToken(premiumAccessToken, env, { reportType: SOUL_ORIGIN_REPORT_TYPE });
  if (!verified?.ok) {
    const expired = clean(verified?.code) === "PREMIUM_ACCESS_TOKEN_EXPIRED";
    return {
      ok: false,
      status: 402,
      code: expired ? "KARMA_AI_SESSION_TOKEN_EXPIRED" : "KARMA_AI_SESSION_TOKEN_INVALID",
      message: expired
        ? "결제된 운명의 업 AI 상담 세션이 만료되었습니다. 결제 후 다시 이어가 주세요."
        : "결제된 운명의 업 AI 상담 세션을 확인하지 못했습니다. 결제 후 다시 이어가 주세요.",
    };
  }

  const auth = buildKarmaAIAuthFromPremiumToken(verified.payload);
  if (!auth) {
    return {
      ok: false,
      status: 402,
      code: "KARMA_AI_SESSION_TOKEN_INVALID",
      message: "결제된 운명의 업 AI 상담 세션을 확인하지 못했습니다. 결제 후 다시 이어가 주세요.",
    };
  }

  return {
    ok: true,
    auth,
    authSource: "premiumAccessToken",
    tokenVerified: true,
    tokenPayload: verified.payload || {},
  };
}

function parseKarmaAITimezoneOffsetToken(value) {
  const raw = clean(value);
  if (!raw) return null;
  const direct = Number(raw);
  if (Number.isFinite(direct) && direct >= -14 && direct <= 14) return direct;
  const token = raw.toLowerCase();
  if (token === "utc" || token === "etc/utc" || token === "gmt") return 0;
  if (token === "asia/seoul" || token === "asia/tokyo") return 9;
  const match = raw.match(/^(?:utc|gmt)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const hour = Number(match[2]);
  const minute = Number(match[3] || 0);
  const offset = sign * (hour + (minute / 60));
  return offset >= -14 && offset <= 14 ? offset : null;
}

function resolveKarmaAITimezoneOffset(timezoneValue, birthInput = {}) {
  const direct = parseKarmaAITimezoneOffsetToken(timezoneValue);
  if (Number.isFinite(direct)) return { ok: true, offset: direct };
  const timezone = clean(timezoneValue);
  if (!timezone) return { ok: false, offset: null };
  try {
    const hour = Number.isFinite(Number(birthInput.hour)) ? Number(birthInput.hour) : 12;
    const minute = Number.isFinite(Number(birthInput.minute)) ? Number(birthInput.minute) : 0;
    const referenceUtc = new Date(Date.UTC(Number(birthInput.year), Number(birthInput.month) - 1, Number(birthInput.day), hour, minute, 0));
    const offsetParts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(referenceUtc);
    const offsetName = clean(offsetParts.find((part) => part.type === "timeZoneName")?.value);
    const parsedOffset = parseKarmaAITimezoneOffsetToken(offsetName);
    if (Number.isFinite(parsedOffset)) return { ok: true, offset: parsedOffset };
  } catch (_) {}
  return { ok: false, offset: null };
}

function normalizeKarmaAIConsultationBirthInput(raw = {}) {
  const src = raw && typeof raw === "object" ? raw : {};
  const location = src.location && typeof src.location === "object" ? src.location : {};
  const birthDateRaw = clean(src.birthDate || src.date || src.birthday || "");
  const dateMatch = birthDateRaw.match(/(\d{4})[-./\s년](\d{1,2})[-./\s월](\d{1,2})/);
  const year = dateMatch ? toInt(dateMatch[1], NaN) : toInt(src.year ?? src.birthYear, NaN);
  const month = dateMatch ? toInt(dateMatch[2], NaN) : toInt(src.month ?? src.birthMonth, NaN);
  const day = dateMatch ? toInt(dateMatch[3], NaN) : toInt(src.day ?? src.birthDay, NaN);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return { ok: false, code: "BIRTH_DATE_REQUIRED", message: "운명의 업 AI 상담을 위해 생년월일 정보가 필요합니다." };
  }

  const birthTimeUnknown = src.birthTimeUnknown === true
    || src.isTimeUnknown === true
    || src.unknownTime === true
    || truthyFlag(src.birthTimeUnknown)
    || truthyFlag(src.isTimeUnknown)
    || truthyFlag(src.unknownTime);
  const birthTimeRaw = clean(src.birthTime || src.time || "");
  let hour = toInt(src.birthHour ?? src.hour, NaN);
  let minute = toInt(src.birthMinute ?? src.minute, 0);
  const timeMatch = birthTimeRaw.match(/(\d{1,2})\s*[:시]\s*(\d{1,2})?/);
  if (timeMatch) {
    hour = toInt(timeMatch[1], NaN);
    minute = toInt(timeMatch[2], 0);
  }

  const hasBirthTime = !birthTimeUnknown && Number.isFinite(hour);
  if (!hasBirthTime && !birthTimeUnknown) {
    return { ok: false, code: "BIRTH_TIME_OR_UNKNOWN_REQUIRED", message: "출생시간을 입력하거나 출생시간 모름을 선택해 주세요." };
  }
  if (hasBirthTime && (hour < 0 || hour > 23 || minute < 0 || minute > 59)) {
    return { ok: false, code: "BIRTH_INPUT_INVALID", message: "출생시간 형식을 확인해 주세요." };
  }

  const calendarRaw = clean(src.calendarType || src.calendar || src.calType || "solar").toLowerCase();
  const calendarType = calendarRaw.includes("lunar") || calendarRaw.includes("음")
    ? (calendarRaw.includes("leap") || calendarRaw.includes("윤") || src.isLeapMonth === true ? "lunar_leap" : "lunar")
    : "solar";
  if (!isValidBirthDateParts(year, month, day, calendarType)) {
    return { ok: false, code: "BIRTH_INPUT_INVALID", message: "생년월일 형식을 확인해 주세요." };
  }

  const latitudeRaw = src.latitude ?? src.lat ?? location.lat ?? location.latitude;
  const longitudeRaw = src.longitude ?? src.lng ?? src.lon ?? location.lng ?? location.lon ?? location.longitude;
  const latitude = Number(latitudeRaw);
  const longitude = Number(longitudeRaw);
  const hasLocationCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const birthPlace = clean(
    src.birthPlace
    || src.birthplace
    || src.place
    || src.locationName
    || location.label
    || location.name
    || location.city
    || "",
  );
  const timezone = clean(src.timezone || location.tz || "Asia/Seoul") || "Asia/Seoul";
  const timezoneResolution = resolveKarmaAITimezoneOffset(timezone, {
    year,
    month,
    day,
    hour: hasBirthTime ? hour : 12,
    minute: hasBirthTime ? minute : 0,
  });

  return {
    ok: true,
    input: {
      name: clean(src.name || "사용자") || "사용자",
      gender: clean(src.gender || src.sex || "unknown") || "unknown",
      birthDate: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      birthTime: hasBirthTime ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` : "",
      birthPlace,
      calendarType,
      timezone,
      timezoneOffset: Number.isFinite(timezoneResolution.offset) ? timezoneResolution.offset : safeNumber(src.timezoneOffset ?? location.tzOffset, 9),
      latitude: hasLocationCoordinates ? latitude : undefined,
      longitude: hasLocationCoordinates ? longitude : undefined,
      year,
      month,
      day,
      hour: hasBirthTime ? hour : null,
      minute: hasBirthTime ? minute : 0,
      birthHour: hasBirthTime ? hour : null,
      birthMinute: hasBirthTime ? minute : 0,
      birthTimeUnknown: !hasBirthTime,
      isTimeUnknown: !hasBirthTime,
      hasBirthTime,
      hasBirthPlace: Boolean(birthPlace),
      hasLocationCoordinates,
      timezoneResolved: timezoneResolution.ok,
    },
  };
}

function cloneJsonSafe(value) {
  try {
    return JSON.parse(JSON.stringify(value || {}));
  } catch (_) {
    return {};
  }
}

function toKarmaAICalculationBirthInput(birthInput = {}) {
  const hasBirthTime = birthInput.hasBirthTime === true && Number.isFinite(Number(birthInput.hour));
  const hour = hasBirthTime ? Number(birthInput.hour) : 12;
  const minute = hasBirthTime && Number.isFinite(Number(birthInput.minute)) ? Number(birthInput.minute) : 0;
  return {
    ...birthInput,
    hour,
    minute,
    birthHour: hour,
    birthMinute: minute,
    birthTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    _calculationTimePlaceholder: !hasBirthTime,
  };
}

function maskKarmaAISajuUnknownBirthTime(saju = {}) {
  const next = cloneJsonSafe(saju);
  next.hourPillar = "";
  if (next.pillars && typeof next.pillars === "object") {
    next.pillars.hour = { stem: "", branch: "", ganji: "" };
  }
  const branches = [next?.pillars?.year?.branch, next?.pillars?.month?.branch, next?.pillars?.day?.branch].filter(Boolean);
  next.branchRelations = detectBranchRelations(branches);
  next.specialStars = calcSpecialStarsFromPillars(next.pillars || {});
  next.twelveGrowthStages = asArray(next.twelveGrowthStages).filter((item) => clean(item?.pillar) !== "hour");
  next.timeAccuracyNote = "출생시간이 없어 시주와 시주 기반 신호는 확정하지 않습니다.";
  return next;
}

function maskKarmaAIVedicUnknownBirthTime(vedic = {}) {
  const next = cloneJsonSafe(vedic);
  next.lagna = "";
  next.houses = [];
  next.planets = asArray(next.planets).map((planet) => {
    const item = { ...(planet || {}) };
    delete item.house;
    delete item.houseNumber;
    return item;
  });
  next.dasha = {
    ...(next.dasha || {}),
    accuracyNote: "출생시간이 없어 라그나, 하우스, 다샤 경계는 제한적으로만 참고합니다.",
  };
  next.timeAccuracyNote = "출생시간이 없어 라그나와 하우스 해석은 확정하지 않습니다.";
  return next;
}

function maskKarmaAIAstrologyUnknownBirthTime(astrology = {}) {
  const next = cloneJsonSafe(astrology);
  next.ascendant = "";
  next.houses = [];
  next.majorPlanets = asArray(next.majorPlanets).map((planet) => {
    const item = { ...(planet || {}) };
    delete item.house;
    delete item.houseNumber;
    return item;
  });
  next.timeAccuracyNote = "출생시간이 없어 상승궁, MC, 하우스 해석은 확정하지 않습니다.";
  return next;
}

async function buildKarmaAIConsultationCalculationSeed(_env, birthInput) {
  const dataLimitations = [];
  const engineErrors = [];
  const calculationBirthInput = toKarmaAICalculationBirthInput(birthInput);
  const seed = {
    birthInput,
    saju: null,
    ziwei: null,
    astrology: null,
    vedic: null,
    sukyo: null,
    generatedAt: new Date().toISOString(),
  };

  if (!birthInput.hasBirthTime) {
    dataLimitations.push("출생시간이 없어 시주, 라그나, 상승궁, 하우스, 다샤 경계는 제한적으로만 볼 수 있습니다.");
  }
  if (!birthInput.hasBirthPlace) {
    dataLimitations.push("출생지 이름이 없어 장소 해석의 맥락은 제한적으로만 반영됩니다.");
  }
  if (!birthInput.hasLocationCoordinates) {
    dataLimitations.push("출생지 좌표가 없어 베다점과 서양 점성술의 위치 의존 차트는 생성하지 않았습니다.");
  }
  if (!birthInput.timezoneResolved) {
    dataLimitations.push("시간대가 완전히 검증되지 않아 입력된 timezone 기준으로만 계산했습니다.");
  }

  try {
    const saju = calculateSajuSnapshot(calculationBirthInput);
    seed.saju = birthInput.hasBirthTime ? saju : maskKarmaAISajuUnknownBirthTime(saju);
  } catch (error) {
    engineErrors.push({ engine: "saju", error: normalizeError(error) });
  }

  if (birthInput.hasLocationCoordinates) {
    try {
      const astrology = calculateAstrologySnapshot(calculationBirthInput);
      seed.astrology = birthInput.hasBirthTime ? astrology : maskKarmaAIAstrologyUnknownBirthTime(astrology);
    } catch (error) {
      engineErrors.push({ engine: "astrology", error: normalizeError(error) });
    }

    try {
      const vedic = calculateVedicSnapshot(calculationBirthInput);
      seed.vedic = birthInput.hasBirthTime ? vedic : maskKarmaAIVedicUnknownBirthTime(vedic);
    } catch (error) {
      engineErrors.push({ engine: "vedic", error: normalizeError(error) });
    }
  }

  if (engineErrors.length || !seed.saju) {
    console.error(`${KARMA_AI_CONSULTATION_MARKER} calculation error`, { engineErrors: engineErrors.map((item) => item.engine) });
    const err = new Error("운명의 업 AI 상담에 필요한 계산을 완료하지 못했습니다. 출생 정보를 확인해 주세요.");
    err.code = "KARMA_AI_CALCULATION_FAILED";
    err.status = 422;
    err.engineErrors = engineErrors;
    err.dataLimitations = dataLimitations;
    throw err;
  }

  seed.signals = deriveCrossSignals(seed);
  seed.engineErrors = engineErrors;
  return { seed, dataLimitations };
}

function buildKarmaAISystemStatus(seed = {}) {
  const majorPlanets = asArray(seed?.astrology?.majorPlanets);
  const hasAstroNodes = majorPlanets.some((planet) => /node|north|south|노드/i.test(clean(planet?.name || planet?.key || planet?.id || "")));
  const hasVedicNodes = Boolean(clean(seed?.vedic?.rahu) || clean(seed?.vedic?.ketu));
  return {
    saju: Boolean(seed.saju),
    vedic: Boolean(seed.vedic),
    astrology: Boolean(seed.astrology),
    sajuCalculated: Boolean(seed.saju),
    vedicCalculated: Boolean(seed.vedic),
    astrologyCalculated: Boolean(seed.astrology),
    hasDaeun: asArray(seed?.saju?.daewoonCycles).length > 0 || Boolean(clean(seed?.saju?.currentDaewun)),
    hasDasha: Boolean(clean(seed?.vedic?.dasha?.current) || clean(seed?.vedic?.dasha?.next)),
    hasTransit: Boolean(seed?.astrology?.transits || seed?.vedic?.transits),
    hasNodes: hasAstroNodes || hasVedicNodes,
  };
}

function buildKarmaAICommonPatternHints(seed = {}) {
  const hints = [];
  const saju = seed.saju || {};
  const vedic = seed.vedic || {};
  const astrology = seed.astrology || {};
  if (saju.dayMaster || saju.dominantElement || saju.deficientElement) {
    hints.push(`사주: 일간 ${clean(saju.dayMaster) || "미상"}, 강한 오행 ${clean(saju.dominantElement) || "미상"}, 보완 오행 ${clean(saju.deficientElement) || "미상"}`);
  }
  if (Array.isArray(saju.branchRelations) && saju.branchRelations.length) {
    hints.push(`사주 합충형파해: ${saju.branchRelations.slice(0, 5).join(", ")}`);
  }
  if (vedic.rahu || vedic.ketu || vedic.moonNakshatra || vedic.dasha?.current) {
    hints.push(`베다점: 라후 ${clean(vedic.rahu) || "미제공"}, 케투 ${clean(vedic.ketu) || "미제공"}, 나크샤트라 ${clean(vedic.moonNakshatra) || "미제공"}, 현재 다샤 ${clean(vedic.dasha?.current) || "미제공"}`);
  }
  if (astrology.sun || astrology.moon || astrology.ascendant) {
    hints.push(`서양 점성술: 태양 ${clean(astrology.sun) || "미제공"}, 달 ${clean(astrology.moon) || "미제공"}, 상승궁 ${clean(astrology.ascendant) || "미제공"}`);
  }
  return hints;
}

function compactKarmaAIJsonForPrompt(value, maxLength = 32000) {
  const text = JSON.stringify(value || {}, null, 2);
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...truncated` : text;
}

function buildKarmaAIConsultationSystemPrompt() {
  return [
    "너는 사주 명리학, 베다 점성술, 서양 점성술을 통합해 삶의 반복 패턴을 상담하는 전문가다.",
    "사용자의 사주 원국, 대운/세운, 베다 차트, 라후/케투, 나크샤트라, 다샤, 서양 점성술 네이탈 차트, 노드, 토성, 명왕성, 트랜짓 데이터에 근거해서 답한다.",
    "모든 운세 데이터는 반드시 제공된 계산 결과만 사용하고 임의로 지어내지 않는다.",
    "출생시간 또는 출생지가 부족하면 정확도 제한을 명확히 설명한다.",
    "업/카르마는 벌이나 저주가 아니라 반복되는 삶의 패턴과 성장 과제로 설명한다.",
    "사용자의 질문에 직접 답하되, 공포를 조장하거나 운명론적으로 단정하지 않는다.",
    "결과는 한국어로 작성한다.",
    "전문 용어는 사용하되 일반 사용자도 이해할 수 있게 풀어쓴다.",
    "사용자가 실제로 선택하고 행동할 수 있는 전략을 제안한다.",
    "건강, 법률, 재정 문제는 운세만으로 확정 진단하지 않는다.",
  ].join("\n");
}

function buildKarmaAIConsultationPrompt({ question, category, categoryLabel, birthInput, integratedData, calculationSeed, commonPatternHints, dataLimitations }) {
  return [
    "아래 계산 결과만 근거로 운명의 업 AI 상담 결과를 작성하라.",
    "사주, 베다점, 서양 점성술 데이터를 새로 추정하지 말라.",
    "제공되지 않은 데이터는 제공되지 않았다고 말하고, 일반적인 심리 조언으로 덮어쓰지 말라.",
    "전생, 업보, 카르마 표현은 상징적 언어로만 쓰고 사용자를 겁주거나 죄책감에 빠뜨리지 말라.",
    "",
    "[사용자 정보]",
    `이름: ${clean(birthInput.name) || "사용자"}`,
    `성별: ${clean(birthInput.gender) || "미입력"}`,
    `생년월일: ${clean(birthInput.birthDate)}`,
    `출생시간: ${birthInput.hasBirthTime ? clean(birthInput.birthTime) : "모름"}`,
    `출생지: ${clean(birthInput.birthPlace) || "미입력"}`,
    `시간대: ${clean(birthInput.timezone)}`,
    `양력/음력: ${clean(birthInput.calendarType)}`,
    `상담 카테고리: ${categoryLabel} (${category})`,
    `사용자 질문: ${question}`,
    "",
    "[데이터 제한]",
    dataLimitations.length ? dataLimitations.map((item) => `- ${item}`).join("\n") : "- 없음",
    "",
    "[세 체계의 공통 패턴 힌트]",
    commonPatternHints.length ? commonPatternHints.map((item) => `- ${item}`).join("\n") : "- 공통 패턴은 계산 데이터 안에서만 제한적으로 판단한다.",
    "",
    "[통합 운세 데이터]",
    compactKarmaAIJsonForPrompt(integratedData, 28000),
    "",
    "[원본 계산 seed]",
    compactKarmaAIJsonForPrompt({
      saju: calculationSeed.saju,
      vedic: calculationSeed.vedic,
      astrology: calculationSeed.astrology,
      signals: calculationSeed.signals,
    }, 28000),
    "",
    "아래 JSON 구조만 반환하라. markdown 코드블록은 쓰지 말라.",
    JSON.stringify({
      summary: "상담 요약 — 지금 질문의 핵심 답변",
      coreKnot: {
        title: "운명의 핵심 매듭",
        interpretation: "반복되는 삶의 패턴",
      },
      sajuKarma: {
        keyPatterns: ["사주 핵심 패턴 1", "사주 핵심 패턴 2"],
        interpretation: "명식과 대운의 과제",
      },
      vedicKarma: {
        keyPatterns: ["베다점 핵심 패턴 1", "베다점 핵심 패턴 2"],
        interpretation: "라후/케투, 나크샤트라, 다샤의 카르마",
      },
      astrologyShadow: {
        keyPatterns: ["점성술 핵심 패턴 1", "점성술 핵심 패턴 2"],
        interpretation: "노드, 토성, 명왕성, 8/12하우스의 그림자",
      },
      commonMessages: ["세 체계가 함께 강조하는 메시지"],
      liberationTiming: {
        opportunities: ["가능한 전환 흐름"],
        cautions: ["주의할 흐름"],
        note: "시기 조언의 정확도 제한",
      },
      actionGuide: ["현실적인 행동 전략 1", "현실적인 행동 전략 2", "현실적인 행동 전략 3"],
      releaseAndHold: {
        release: ["내려놓아야 할 것"],
        hold: ["붙잡아야 할 것"],
      },
      closingMessage: "운명의 매듭을 푸는 한 문장",
      followUpQuestions: ["후속 질문 1", "후속 질문 2", "후속 질문 3"],
      dataLimitations: ["데이터 제한 사항"],
    }, null, 2),
  ].join("\n");
}

function extractKarmaAIJsonText(text) {
  const raw = clean(text);
  if (!raw) return "";
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) return raw.slice(first, last + 1).trim();
  return "";
}

function toKarmaAIList(value) {
  if (Array.isArray(value)) return value.map((item) => clean(item)).filter(Boolean).slice(0, 10);
  return clean(value)
    .split(/\n+|(?:^|\s)[-*]\s+/)
    .map((item) => clean(item.replace(/^\d+[.)]\s*/, "")))
    .filter(Boolean)
    .slice(0, 10);
}

function safeKarmaAIObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function extractKarmaAISection(rawText, title, nextTitles = []) {
  const raw = String(rawText || "");
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const start = raw.search(new RegExp(escaped, "i"));
  if (start < 0) return "";
  let end = raw.length;
  nextTitles.forEach((nextTitle) => {
    const nextEscaped = nextTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const index = raw.slice(start + title.length).search(new RegExp(nextEscaped, "i"));
    if (index >= 0) end = Math.min(end, start + title.length + index);
  });
  return clean(raw.slice(start, end).replace(new RegExp(`^\\s*\\d*[.)]?\\s*${escaped}\\s*[-—:：]?`, "i"), ""));
}

function normalizeKarmaAIResult(aiText, dataLimitations = []) {
  const rawText = clean(aiText);
  let parsed = null;
  const jsonText = extractKarmaAIJsonText(rawText);
  if (jsonText) {
    try {
      parsed = JSON.parse(jsonText);
    } catch (_) {
      parsed = null;
    }
  }
  const source = safeKarmaAIObject(parsed);
  const titles = [
    "상담 요약",
    "운명의 핵심 매듭",
    "사주가 말하는 업",
    "베다점이 말하는 카르마",
    "점성술이 말하는 그림자",
    "세 체계의 공통 메시지",
    "해방의 시기와 전환점",
    "현실적인 행동 전략",
    "내려놓아야 할 것과 붙잡아야 할 것",
    "마지막 조언",
    "후속 질문 추천",
  ];
  const coreKnot = safeKarmaAIObject(source.coreKnot);
  const sajuKarma = safeKarmaAIObject(source.sajuKarma);
  const vedicKarma = safeKarmaAIObject(source.vedicKarma);
  const astrologyShadow = safeKarmaAIObject(source.astrologyShadow);
  const liberationTiming = safeKarmaAIObject(source.liberationTiming);
  const releaseAndHold = safeKarmaAIObject(source.releaseAndHold);
  const result = {
    summary: clean(source.summary) || extractKarmaAISection(rawText, titles[0], titles.slice(1)),
    coreKnot: {
      title: clean(coreKnot.title) || "운명의 핵심 매듭",
      interpretation: clean(coreKnot.interpretation) || extractKarmaAISection(rawText, titles[1], titles.slice(2)),
    },
    sajuKarma: {
      keyPatterns: toKarmaAIList(sajuKarma.keyPatterns),
      interpretation: clean(sajuKarma.interpretation) || extractKarmaAISection(rawText, titles[2], titles.slice(3)),
    },
    vedicKarma: {
      keyPatterns: toKarmaAIList(vedicKarma.keyPatterns),
      interpretation: clean(vedicKarma.interpretation) || extractKarmaAISection(rawText, titles[3], titles.slice(4)),
    },
    astrologyShadow: {
      keyPatterns: toKarmaAIList(astrologyShadow.keyPatterns),
      interpretation: clean(astrologyShadow.interpretation) || extractKarmaAISection(rawText, titles[4], titles.slice(5)),
    },
    commonMessages: toKarmaAIList(source.commonMessages || extractKarmaAISection(rawText, titles[5], titles.slice(6))),
    liberationTiming: {
      opportunities: toKarmaAIList(liberationTiming.opportunities),
      cautions: toKarmaAIList(liberationTiming.cautions),
      note: clean(liberationTiming.note) || extractKarmaAISection(rawText, titles[6], titles.slice(7)),
    },
    actionGuide: toKarmaAIList(source.actionGuide || extractKarmaAISection(rawText, titles[7], titles.slice(8))),
    releaseAndHold: {
      release: toKarmaAIList(releaseAndHold.release || extractKarmaAISection(rawText, "내려놓아야 할 것", ["붙잡아야 할 것"])),
      hold: toKarmaAIList(releaseAndHold.hold || extractKarmaAISection(rawText, "붙잡아야 할 것", titles.slice(10))),
    },
    closingMessage: clean(source.closingMessage) || extractKarmaAISection(rawText, titles[9], titles.slice(10)),
    followUpQuestions: toKarmaAIList(source.followUpQuestions || extractKarmaAISection(rawText, titles[10], [])),
    dataLimitations: toKarmaAIList(source.dataLimitations).concat(asArray(dataLimitations).map((item) => clean(item)).filter(Boolean)).filter((item, index, arr) => item && arr.indexOf(item) === index).slice(0, 10),
    rawText,
  };
  if (!result.summary && rawText) result.summary = rawText.slice(0, 700);
  if (!result.coreKnot.interpretation && rawText) result.coreKnot.interpretation = rawText;
  return result;
}

async function handleKarmaAIConsultation(request, env) {
  const startedAt = Date.now();
  const body = await readJson(request);
  const authCheck = await resolveKarmaAIConsultationAuth(request, env, body);
  if (!authCheck.ok) {
    return buildKarmaAIError(authCheck.code, authCheck.message, authCheck.status, {
      authSource: authCheck.authSource || "",
      tokenVerified: false,
    });
  }
  const auth = authCheck.auth;
  const dryRun = isKarmaAIConsultationDryRun(env);
  const hasEnvAI = hasKarmaAIGeminiApiKey(env);
  const question = clean(body?.question);
  const rawCategory = clean(body?.category || "general").toLowerCase();
  const category = KARMA_AI_CONSULTATION_CATEGORIES[rawCategory] ? rawCategory : "general";
  const categoryLabel = KARMA_AI_CONSULTATION_CATEGORIES[category];
  const baseLog = {
    hasEnvAI,
    providerName: hasEnvAI ? "gemini-api" : "",
    isMock: false,
    dryRun,
    category,
    questionLength: question.length,
  };
  logKarmaAIConsultation("request received", baseLog);

  if (dryRun) {
    return buildKarmaAIError("DRY_RUN_DISABLED", "운명의 업 AI 상담은 dry_run 상태에서 mock 결과를 반환하지 않습니다.", 409, {
      dryRun: true,
      isMock: false,
    });
  }
  if (!hasEnvAI) {
    return buildKarmaAIError("GEMINI_API_KEY_NOT_CONFIGURED", "운명의 업 AI 상담을 생성할 Gemini API key가 설정되지 않았습니다.", 503, {
      dryRun: false,
      isMock: false,
      retryable: true,
    });
  }
  if (!question || question.length < 5 || question.length > 1000) {
    return buildKarmaAIError("QUESTION_INVALID", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 422);
  }

  const normalizedBirth = normalizeKarmaAIConsultationBirthInput(body?.birthInput || body?.input || {});
  if (!normalizedBirth.ok) {
    return buildKarmaAIError(normalizedBirth.code, normalizedBirth.message, 422);
  }
  const birthInput = normalizedBirth.input;
  logKarmaAIConsultation("birth profile normalized", {
    ...baseLog,
    hasBirthTime: birthInput.hasBirthTime,
    hasBirthPlace: birthInput.hasBirthPlace,
    timezoneResolved: birthInput.timezoneResolved,
  });

  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `soul-origin-ai:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`);
  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || `soul-origin-ai:${auth.userId}:${reportId}`);
  const requestId = clean(body?.requestId || body?._paymentContext?.requestId || body?.payment?.requestId || makeReportId());
  const featureKey = clean(body?.featureKey || SOUL_ORIGIN_FEATURE_KEY) || SOUL_ORIGIN_FEATURE_KEY;
  const premiumAccessToken = getPremiumAccessToken(request, body);
  const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, SOUL_ORIGIN_REPORT_TYPE, {
    ...body,
    reportType: SOUL_ORIGIN_REPORT_TYPE,
    canonicalReportType: SOUL_ORIGIN_REPORT_TYPE,
    archiveReportType: SOUL_ORIGIN_ARCHIVE_REPORT_TYPE,
    reportTypeAliases: SOUL_ORIGIN_REPORT_TYPE_ALIASES,
    featureKey,
    featureAliases: SOUL_ORIGIN_FEATURE_ALIASES,
    premiumAccessToken: premiumAccessToken || undefined,
    _accessRoute: "/api/soul-origin/ai-consultation",
  });
  if (!access?.ok) {
    const status = Number(access?.status || 402);
    return buildKarmaAIError(access?.code || "PAYMENT_REQUIRED", status === 401 ? "로그인이 필요합니다." : "운명의 업 AI 상담 이용 권한이 필요합니다.", status, {
      reportId,
      sessionId,
      amountCoins: SOUL_ORIGIN_AI_DEFAULT_AMOUNT_COINS,
      allowedPaymentModes: ["direct", "monthly", "membership_pass"],
    });
  }
  logKarmaAIConsultation("payment verified", {
    ...baseLog,
    hasBirthTime: birthInput.hasBirthTime,
    hasBirthPlace: birthInput.hasBirthPlace,
    timezoneResolved: birthInput.timezoneResolved,
    authSource: authCheck.authSource,
    tokenVerified: authCheck.tokenVerified === true,
  });

  const executionCtx = buildPremiumExecutionContext({
    serviceKey: SOUL_ORIGIN_AI_CONSULTATION_SERVICE_KEY,
    reportType: SOUL_ORIGIN_REPORT_TYPE,
    userId: auth.userId,
    featureKey,
    sessionId,
    reportId,
    access,
    body: { ...body, requestId, sessionId, reportId },
    timeoutSeconds: Number(env?.SOUL_ORIGIN_AI_TIMEOUT_SECONDS || 900),
  });
  const startedExecution = await startServiceExecution(env, auth.userId, executionCtx);
  if (!startedExecution?.ok) {
    return buildKarmaAIError("SERVICE_EXECUTION_START_FAILED", "운명의 업 AI 상담 실행 상태를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.", Number(startedExecution?.status || 503), {
      reportId,
      sessionId,
      requestId,
    });
  }

  let calculationSeed = null;
  let dataLimitations = [];
  let systemStatus = {};
  try {
    const calculated = await buildKarmaAIConsultationCalculationSeed(env, birthInput);
    calculationSeed = calculated.seed;
    dataLimitations = calculated.dataLimitations;
    systemStatus = buildKarmaAISystemStatus(calculationSeed);
    logKarmaAIConsultation("saju calculated", { ...baseLog, ...systemStatus, hasBirthTime: birthInput.hasBirthTime, hasBirthPlace: birthInput.hasBirthPlace, timezoneResolved: birthInput.timezoneResolved, dataLimitations });
    logKarmaAIConsultation("vedic chart calculated", { ...baseLog, ...systemStatus, hasBirthTime: birthInput.hasBirthTime, hasBirthPlace: birthInput.hasBirthPlace, timezoneResolved: birthInput.timezoneResolved, dataLimitations });
    logKarmaAIConsultation("astrology chart calculated", { ...baseLog, ...systemStatus, hasBirthTime: birthInput.hasBirthTime, hasBirthPlace: birthInput.hasBirthPlace, timezoneResolved: birthInput.timezoneResolved, dataLimitations });

    const commonPatternHints = buildKarmaAICommonPatternHints(calculationSeed);
    const integratedData = buildKarmaIntegratedData({
      input: {
        question,
        person: {
          displayName: birthInput.name,
          gender: birthInput.gender,
          question,
          birthSummary: birthInput,
        },
        calculation: calculationSeed,
        calculationDigest: hashSoulOriginStable({
          birthDate: birthInput.birthDate,
          birthTime: birthInput.hasBirthTime ? birthInput.birthTime : "unknown",
          birthPlace: birthInput.birthPlace,
          timezone: birthInput.timezone,
          category,
          question,
        }),
      },
      calculationSeed,
    });
    logKarmaAIConsultation("integration context built", {
      ...baseLog,
      ...systemStatus,
      hasBirthTime: birthInput.hasBirthTime,
      hasBirthPlace: birthInput.hasBirthPlace,
      timezoneResolved: birthInput.timezoneResolved,
      integrationContextBuilt: true,
      dataLimitations,
    });

    const prompt = buildKarmaAIConsultationPrompt({
      question,
      category,
      categoryLabel,
      birthInput,
      integratedData,
      calculationSeed,
      commonPatternHints,
      dataLimitations,
    });
    logKarmaAIConsultation("prompt built", {
      ...baseLog,
      ...systemStatus,
      hasBirthTime: birthInput.hasBirthTime,
      hasBirthPlace: birthInput.hasBirthPlace,
      timezoneResolved: birthInput.timezoneResolved,
      integrationContextBuilt: true,
      dataLimitations,
    });

    logKarmaAIConsultation("LLM provider start", {
      ...baseLog,
      ...systemStatus,
      hasBirthTime: birthInput.hasBirthTime,
      hasBirthPlace: birthInput.hasBirthPlace,
      timezoneResolved: birthInput.timezoneResolved,
      integrationContextBuilt: true,
      dataLimitations,
    });
    const llmStart = Date.now();
    const ai = await callGeminiText(env, prompt, {
      systemPrompt: buildKarmaAIConsultationSystemPrompt(),
      taskType: "fortune",
      model: clean(env?.SOUL_ORIGIN_AI_GEMINI_MODEL || env?.PREMIUM_GEMINI_MODEL || env?.GEMINI_MODEL || "gemini-2.5-flash"),
      temperature: 0.68,
      maxOutputTokens: 6144,
      timeoutMs: safeNumber(env?.SOUL_ORIGIN_AI_GEMINI_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS, 45000),
      fallbackToWorkersAI: false,
    });
    const llmLatencyMs = Date.now() - llmStart;
    if (!ai?.ok || !clean(ai?.text)) {
      logKarmaAIConsultation("LLM provider error", {
        ...baseLog,
        ...systemStatus,
        providerName: clean(ai?.provider || "gemini-api"),
        hasBirthTime: birthInput.hasBirthTime,
        hasBirthPlace: birthInput.hasBirthPlace,
        timezoneResolved: birthInput.timezoneResolved,
        integrationContextBuilt: true,
        dataLimitations,
        llmLatencyMs,
        errorCode: clean(ai?.error || "LLM_PROVIDER_FAILED"),
      });
      const error = new Error("운명의 업 AI 상담 생성 중 LLM 호출에 실패했습니다. 결제 복구 정책에 따라 처리됩니다.");
      error.code = "LLM_PROVIDER_FAILED";
      error.status = 503;
      error.retryable = true;
      throw error;
    }

    const result = normalizeKarmaAIResult(ai.text, dataLimitations);
    if (clean(result.rawText).length < 240) {
      logKarmaAIConsultation("LLM provider error", {
        ...baseLog,
        ...systemStatus,
        providerName: clean(ai?.provider),
        hasBirthTime: birthInput.hasBirthTime,
        hasBirthPlace: birthInput.hasBirthPlace,
        timezoneResolved: birthInput.timezoneResolved,
        integrationContextBuilt: true,
        dataLimitations,
        llmLatencyMs,
        errorCode: "LLM_RESULT_TOO_SHORT",
      });
      const error = new Error("운명의 업 AI 상담 결과가 충분히 생성되지 않았습니다. 잠시 후 다시 시도해 주세요.");
      error.code = "LLM_RESULT_TOO_SHORT";
      error.status = 503;
      error.retryable = true;
      throw error;
    }

    logKarmaAIConsultation("LLM provider success", {
      ...baseLog,
      ...systemStatus,
      providerName: clean(ai?.provider),
      hasBirthTime: birthInput.hasBirthTime,
      hasBirthPlace: birthInput.hasBirthPlace,
      timezoneResolved: birthInput.timezoneResolved,
      integrationContextBuilt: true,
      dataLimitations,
      llmLatencyMs,
    });

    const consultationId = requestId || `karma-ai:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
    await completeServiceExecution(env, auth.userId, {
      ...executionCtx,
      requestId: executionCtx.executionKey,
      reportId,
      sessionId,
      metadata: {
        ...(executionCtx.metadata || {}),
        consultationId,
        provider: clean(ai.provider || "unknown"),
        model: clean(ai.model || ""),
        serviceType: SOUL_ORIGIN_AI_CONSULTATION_SERVICE_TYPE,
        category,
        isMock: false,
        dryRun: false,
        systemStatus,
        dataLimitations,
      },
    });

    const responseBody = {
      ok: true,
      serviceType: SOUL_ORIGIN_AI_CONSULTATION_SERVICE_TYPE,
      featureKey,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      provider: clean(ai.provider || "unknown"),
      model: clean(ai.model) || undefined,
      isMock: false,
      dryRun: false,
      consultationId,
      reportId,
      sessionId,
      category,
      categoryLabel,
      dataLimitations,
      systemStatus,
      calculationSummary: {
        commonPatternHints,
        saju: {
          dayMaster: clean(calculationSeed?.saju?.dayMaster),
          currentDaewun: clean(calculationSeed?.saju?.currentDaewun),
          currentYearPillar: clean(calculationSeed?.saju?.currentYearPillar),
        },
        vedic: {
          lagna: clean(calculationSeed?.vedic?.lagna),
          moonNakshatra: clean(calculationSeed?.vedic?.moonNakshatra),
          currentDasha: clean(calculationSeed?.vedic?.dasha?.current),
        },
        astrology: {
          sun: clean(calculationSeed?.astrology?.sun),
          moon: clean(calculationSeed?.astrology?.moon),
          ascendant: clean(calculationSeed?.astrology?.ascendant),
        },
      },
      result,
      billing: {
        reportType: SOUL_ORIGIN_REPORT_TYPE,
        amountCoins: safeNumber(access?.chargedCoins || SOUL_ORIGIN_AI_DEFAULT_AMOUNT_COINS, SOUL_ORIGIN_AI_DEFAULT_AMOUNT_COINS),
        accessVerified: true,
      },
      elapsedMs: Date.now() - startedAt,
    };
    logKarmaAIConsultation("response returned", {
      ...baseLog,
      ...systemStatus,
      providerName: responseBody.provider,
      hasBirthTime: birthInput.hasBirthTime,
      hasBirthPlace: birthInput.hasBirthPlace,
      timezoneResolved: birthInput.timezoneResolved,
      integrationContextBuilt: true,
      dataLimitations,
      llmLatencyMs,
    });
    return json(responseBody);
  } catch (error) {
    try {
      await failServiceExecution(env, auth.userId, {
        ...executionCtx,
        requestId: executionCtx.executionKey,
        reportId,
        sessionId,
        reasonCode: clean(error?.code || "KARMA_AI_CONSULTATION_FAILED"),
        reasonMessage: clean(error?.message || "운명의 업 AI 상담 생성에 실패했습니다."),
        failureStage: clean(error?.failedStep || error?.code || "ai_consultation"),
        failureReason: clean(error?.message || "운명의 업 AI 상담 생성에 실패했습니다."),
        forceRefundOnClose: true,
      });
    } catch (failError) {
      console.error(`${KARMA_AI_CONSULTATION_MARKER} fail execution error`, { errorCode: clean(failError?.code || "SERVICE_EXECUTION_FAIL_FAILED") });
    }
    if (clean(error?.code).indexOf("LLM") >= 0) {
      logKarmaAIConsultation("LLM provider error", {
        ...baseLog,
        ...systemStatus,
        hasBirthTime: birthInput.hasBirthTime,
        hasBirthPlace: birthInput.hasBirthPlace,
        timezoneResolved: birthInput.timezoneResolved,
        integrationContextBuilt: Boolean(calculationSeed),
        dataLimitations: asArray(error?.dataLimitations).length ? error.dataLimitations : dataLimitations,
        errorCode: clean(error?.code || "LLM_PROVIDER_FAILED"),
      });
    }
    return buildKarmaAIError(
      clean(error?.code || "KARMA_AI_CONSULTATION_FAILED"),
      clean(error?.message || "운명의 업 AI 상담 생성 중 문제가 발생했습니다. 입력 정보를 확인한 뒤 다시 시도해 주세요."),
      Number(error?.status || 500),
      {
        reportId,
        sessionId,
        retryable: error?.retryable === true || Number(error?.status || 0) >= 500,
        paymentRecoveryApplied: true,
        isMock: false,
        dryRun: false,
        dataLimitations: asArray(error?.dataLimitations).length ? error.dataLimitations : dataLimitations,
      },
    );
  }
}

async function handleVerifyAccess(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const requestId = clean(body?.requestId || body?._paymentContext?.requestId || body?.payment?.requestId || makeReportId());
  const normalizedBirth = normalizeBirthInput(body?.birthInput || body?.input || {});
  if (!normalizedBirth.ok) {
    return json({ ok: false, code: normalizedBirth.code, message: normalizedBirth.message }, { status: normalizedBirth.code === "BIRTH_TIME_REQUIRED" ? 422 : 400 });
  }

  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || makeReportId());
  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || `soul-origin:${auth.userId}:${reportId}`);
  const featureKey = clean(body?.featureKey || SOUL_ORIGIN_FEATURE_KEY) || SOUL_ORIGIN_FEATURE_KEY;
  const premiumAccessToken = getPremiumAccessToken(request, body);
  const access = isDebugMockAccessAllowed(env)
    ? {
        ok: true,
        accessType: "debug_mock",
        reportType: SOUL_ORIGIN_REPORT_TYPE,
        featureKey,
        chargedCoins: 0,
      }
    : await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, SOUL_ORIGIN_REPORT_TYPE, {
        ...body,
        reportType: SOUL_ORIGIN_REPORT_TYPE,
        canonicalReportType: SOUL_ORIGIN_REPORT_TYPE,
        archiveReportType: SOUL_ORIGIN_ARCHIVE_REPORT_TYPE,
        reportTypeAliases: SOUL_ORIGIN_REPORT_TYPE_ALIASES,
        featureKey,
        featureAliases: SOUL_ORIGIN_FEATURE_ALIASES,
        premiumAccessToken: premiumAccessToken || undefined,
        _accessRoute: "/api/soul-origin/verify-access",
      });

  if (!access?.ok) {
    return json({
      ok: false,
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      code: access?.code || "PAYMENT_REQUIRED",
      message: access?.message || "운명의 업 PDF 생성 권한이 필요합니다.",
      reportId,
      sessionId,
    }, { status: Number(access?.status || 402) });
  }

  const verification = storeAccessVerification({
    userId: auth.userId,
    sessionId,
    reportId,
    requestId,
    access,
    body,
    birthInput: normalizedBirth.input,
  });

  return json({
    ok: true,
    serviceKey: SOUL_ORIGIN_SERVICE_KEY,
    status: "access_verified",
    reportId,
    sessionId,
    requestId,
    access: {
      verified: true,
      method: verification.method,
      paymentId: clean(access.matchedTransactionId || access.transactionId || "") || undefined,
      passId: clean(access.passTier || access.entitlementId || "") || undefined,
      verifiedAt: verification.verifiedAt,
    },
  });
}

async function handleCreateJob(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const normalizedBirth = normalizeBirthInput(body?.birthInput || body?.input || {});
  if (!normalizedBirth.ok) {
    return json({ ok: false, code: normalizedBirth.code, message: normalizedBirth.message }, { status: normalizedBirth.code === "BIRTH_TIME_REQUIRED" ? 422 : 400 });
  }

  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || "");
  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || "");
  const requestId = clean(body?.requestId || body?._paymentContext?.requestId || body?.payment?.requestId || "");
  if (!reportId || !sessionId) {
    return json({ ok: false, code: "MISSING_JOB_BINDING", message: "reportId와 sessionId가 필요합니다." }, { status: 400 });
  }

  const verification = findAccessVerification({ userId: auth.userId, sessionId, reportId });
  if (!verification?.verified) {
    return json({
      ok: false,
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      code: "ACCESS_NOT_VERIFIED",
      message: "결제 검증이 완료된 뒤에만 운명의 업 PDF Job을 만들 수 있습니다.",
      reportId,
      sessionId,
    }, { status: 403 });
  }

  const existing = SESSION_LOCKS.get(sessionId);
  if (existing && clean(existing.userId) === clean(auth.userId) && clean(existing.reportId) === reportId) {
    return json({
      ok: true,
      ...publicSoulOriginJobStatus(existing),
    });
  }

  const featureKey = clean(body?.featureKey || SOUL_ORIGIN_FEATURE_KEY) || SOUL_ORIGIN_FEATURE_KEY;
  const executionCtx = buildPremiumExecutionContext({
    serviceKey: SOUL_ORIGIN_SERVICE_KEY,
    reportType: SOUL_ORIGIN_REPORT_TYPE,
    userId: auth.userId,
    featureKey,
    sessionId,
    reportId,
    access: verification.access,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  await startPremiumPdfExecution(env, auth.userId, executionCtx);

  const now = new Date().toISOString();
  const lock = {
    sessionId,
    reportId,
    requestId,
    userId: auth.userId,
    status: "created",
    generationStatus: "created",
    currentStep: "created",
    progress: 10,
    progressPercent: 10,
    totalChapters: soulOriginChapterPlanV1.chapters.length,
    completedChapters: 0,
    chapters: initialSoulOriginChapters(),
    inputHash: buildSoulOriginInputHash(normalizedBirth.input),
    inputSnapshot: normalizedBirth.input,
    bodySnapshot: body,
    access: {
      verified: true,
      method: verification.method,
      paymentId: clean(verification.access?.matchedTransactionId || verification.access?.transactionId || "") || undefined,
      passId: clean(verification.access?.passTier || verification.access?.entitlementId || "") || undefined,
      verifiedAt: verification.verifiedAt,
    },
    accessResult: verification.access,
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    executionStarted: true,
    createdAt: now,
    startedAt: now,
    updatedAt: now,
  };
  SESSION_LOCKS.set(sessionId, lock);

  return json({
    ok: true,
    ...publicSoulOriginJobStatus(lock),
  });
}

async function runSoulOriginMockGeneration({ request, env, auth, sessionId, reportId, requestId, body, lock } = {}) {
  const featureKey = clean(body?.featureKey || SOUL_ORIGIN_FEATURE_KEY) || SOUL_ORIGIN_FEATURE_KEY;
  const executionCtx = buildPremiumExecutionContext({
    serviceKey: SOUL_ORIGIN_SERVICE_KEY,
    reportType: SOUL_ORIGIN_REPORT_TYPE,
    userId: auth.userId,
    featureKey,
    sessionId,
    reportId,
    access: lock.accessResult || lock.access,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  if (lock.executionStarted !== true) {
    await startPremiumPdfExecution(env, auth.userId, executionCtx);
  }

  updateSoulOriginSessionLock(sessionId, {
    status: "running",
    generationStatus: "queued",
    currentStep: "queued",
    progress: 10,
    progressPercent: 10,
    totalChapters: soulOriginChapterPlanV1.chapters.length,
    completedChapters: 0,
    chapters: lock.chapters?.length ? lock.chapters : initialSoulOriginChapters(),
    updatedAt: new Date().toISOString(),
  });

  const birthInput = lock.inputSnapshot || normalizeBirthInput(body?.birthInput || body?.input || {}).input;
  let calculationSeed = {};
  try {
    updateSoulOriginSessionLock(sessionId, {
      generationStatus: "generating",
      currentStep: "generating",
      progress: 10,
      progressPercent: 10,
    });
    calculationSeed = await buildSoulOriginCalculationSeed(env, birthInput);
    const normalizedLlmInput = normalizeSoulOriginCalculationInput({
      birthInput,
      calculationSeed,
      locale: "ko-KR",
    });

    const generatedReport = await createSoulOriginPremiumPdfJob({
      env: buildSoulOriginMockEnv(env),
      input: normalizedLlmInput,
      calculationSeed,
      userId: auth.userId,
      reportId,
      sessionId,
      requestUrl: request.url,
      onStatus: (state = {}) => {
        updateSoulOriginSessionLock(sessionId, {
          status: "running",
          generationStatus: clean(state.status || state.currentStep || "generating"),
          currentStep: clean(state.currentStep || state.status || "generating"),
          progress: Number.isFinite(Number(state.progress)) ? Number(state.progress) : 0,
          progressPercent: Number.isFinite(Number(state.progressPercent ?? state.progress)) ? Number(state.progressPercent ?? state.progress) : 0,
          currentChapterId: clean(state.currentChapterId || ""),
          currentChapterTitle: clean(state.currentChapterTitle || ""),
          totalChapters: Number(state.totalChapters || soulOriginChapterPlanV1.chapters.length),
          completedChapters: Number(state.completedChapters || 0),
          chapters: Array.isArray(state.chapters) ? state.chapters : SESSION_LOCKS.get(sessionId)?.chapters,
          systemStatus: state.systemStatus && typeof state.systemStatus === "object" ? state.systemStatus : buildCalculationSystemStatus(calculationSeed),
          updatedAt: new Date().toISOString(),
        });
      },
    });

    const chapters = Array.isArray(generatedReport.chapters) ? generatedReport.chapters : [];
    const qualityReport = generatedReport.qualityReport || { status: "passed", score: 100 };
    const pdfReady = generatedReport.pdfReady || {};
    const pdfCompletionValidation = generatedReport.pdfCompletionValidation || null;
    const llmAssembly = generatedReport.llmAssembly || {
      enabled: true,
      externalGeneration: true,
      externalCallsAllowed: false,
      fallbackUsed: false,
      provider: "mock",
      modelName: "mock",
      tokensUsed: 0,
      cost: 0,
      isMock: true,
      chapterCount: chapters.length,
      expectedChapterCount: soulOriginChapterPlanV1.chapters.length,
    };
    const generatedAt = generatedReport.generatedAt || new Date().toISOString();
    const responseBody = {
      ok: true,
      status: "completed",
      serverStatus: "completed",
      generationStatus: "completed",
      qualityStatus: clean(qualityReport.status) || "passed",
      qualityReport,
      manuscriptSource: SOUL_ORIGIN_MANUSCRIPT_SOURCE,
      chapterAuthoringSource: SOUL_ORIGIN_MANUSCRIPT_SOURCE,
      summarySource: SOUL_ORIGIN_MANUSCRIPT_SOURCE,
      generationMode: generatedReport.generationMode || SOUL_ORIGIN_MANUSCRIPT_SOURCE,
      provider: "mock",
      modelName: "mock",
      writingPipeline: generatedReport.writingPipeline || SOUL_ORIGIN_WRITING_PIPELINE,
      tokensUsed: 0,
      cost: 0,
      isMock: true,
      fallbackUsed: false,
      llmAssemblyOnly: true,
      externalCallsAllowed: false,
      llmAssembly,
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      featureKey,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      canonicalReportType: SOUL_ORIGIN_REPORT_TYPE,
      archiveReportType: SOUL_ORIGIN_ARCHIVE_REPORT_TYPE,
      chapterCount: chapters.length,
      expectedChapterCount: soulOriginChapterPlanV1.chapters.length,
      totalChapters: soulOriginChapterPlanV1.chapters.length,
      completedChapters: chapters.length,
      progressPercent: 100,
      reportId,
      jobId: reportId,
      sessionId,
      title: clean(generatedReport.reportTitle || SOUL_ORIGIN_TITLE) || SOUL_ORIGIN_TITLE,
      summary: clean(generatedReport.summary || ""),
      finalMessage: clean(generatedReport.finalMessage || ""),
      disclaimer: clean(generatedReport.disclaimer || ""),
      birthInput,
      calculationDigest: clean(normalizedLlmInput.calculationDigest || ""),
      chapters,
      pdfV2: generatedReport.pdfV2 || null,
      pdfReady,
      pdfCompletionValidation,
      downloadUrl: clean(pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl),
      pdfUrl: clean(pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl),
      htmlUrl: clean(pdfReady.htmlUrl || pdfReady.pdfUrl || pdfReady.downloadUrl),
      canReopen: true,
      canDownload: true,
      createdAt: generatedAt,
      completedAt: new Date().toISOString(),
    };

    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      manuscriptSource: responseBody.manuscriptSource,
      chapterAuthoringSource: responseBody.chapterAuthoringSource,
      summarySource: responseBody.summarySource,
      generationMode: responseBody.generationMode,
      provider: responseBody.provider,
      modelName: responseBody.modelName,
      writingPipeline: responseBody.writingPipeline,
      tokensUsed: responseBody.tokensUsed,
      cost: responseBody.cost,
      isMock: responseBody.isMock,
      fallbackUsed: false,
      llmAssemblyOnly: true,
      externalCallsAllowed: false,
      llmAssembly,
      chapterCount: chapters.length,
      pdfCompletionValidation,
      archive: {
        reportId,
        reportType: SOUL_ORIGIN_REPORT_TYPE,
        canonicalReportType: SOUL_ORIGIN_REPORT_TYPE,
        archiveReportType: SOUL_ORIGIN_ARCHIVE_REPORT_TYPE,
        qualityStatus: responseBody.qualityStatus,
        manuscriptSource: responseBody.manuscriptSource,
        chapterAuthoringSource: responseBody.chapterAuthoringSource,
        summarySource: responseBody.summarySource,
        generationMode: responseBody.generationMode,
        provider: responseBody.provider,
        modelName: responseBody.modelName,
        writingPipeline: responseBody.writingPipeline,
        tokensUsed: responseBody.tokensUsed,
        cost: responseBody.cost,
        isMock: responseBody.isMock,
        fallbackUsed: false,
        llmAssemblyOnly: true,
        externalCallsAllowed: false,
        llmAssembly,
        displayName: SOUL_ORIGIN_DISPLAY_NAME,
        title: responseBody.title,
        qualityReport,
        summary: responseBody.summary,
        finalMessage: responseBody.finalMessage,
        disclaimer: responseBody.disclaimer,
        mode: "personal",
        birthName: clean(birthInput.name),
        chapterCount: chapters.length,
        expectedChapterCount: soulOriginChapterPlanV1.chapters.length,
        chapters,
        calculationInput: normalizedLlmInput,
        calculationDigest: responseBody.calculationDigest,
        pdfV2: responseBody.pdfV2,
        cacheKey: clean(generatedReport.cacheKey || ""),
        pdfReady,
        pdfCompletionValidation,
        downloadUrl: responseBody.downloadUrl,
        pdfUrl: responseBody.pdfUrl,
        htmlUrl: responseBody.htmlUrl,
        canReopen: true,
        canDownload: true,
      },
    });

    REPORT_CACHE.set(reportId, {
      reportId,
      userId: auth.userId,
      payload: responseBody,
    });

    SESSION_LOCKS.set(sessionId, {
      ...SESSION_LOCKS.get(sessionId),
      sessionId,
      reportId,
      requestId,
      userId: auth.userId,
      status: "done",
      generationStatus: "completed",
      currentStep: "completed",
      progress: 100,
      progressPercent: 100,
      totalChapters: soulOriginChapterPlanV1.chapters.length,
      completedChapters: chapters.length,
      chapters: slimSoulOriginChapters(chapters),
      systemStatus: buildCalculationSystemStatus(calculationSeed),
      pdfUrl: responseBody.pdfUrl,
      downloadUrl: responseBody.downloadUrl,
      completedAt: responseBody.completedAt,
      updatedAt: responseBody.completedAt,
      result: responseBody,
    });

    return responseBody;
  } catch (error) {
    try {
      await failPremiumPdfExecution(
        env,
        auth.userId,
        executionCtx,
        clean(error?.code || "soul_origin_generation_failed"),
        clean(error?.message || "운명의 업 리포트 생성 중 오류가 발생했습니다."),
        clean(error?.failedStep || error?.step || "soul-origin-generation"),
      );
    } catch (failError) {
      logFlow("FailExecutionError", {
        requestId,
        sessionId,
        reportId,
        errorCode: clean(failError?.code || "SOUL_ORIGIN_FAIL_EXECUTION_ERROR"),
      });
    }
    const previous = SESSION_LOCKS.get(sessionId) || lock || {};
    const failedChapters = slimSoulOriginChapters(previous.chapters?.length ? previous.chapters : initialSoulOriginChapters())
      .map((chapter) => chapter.id === clean(error?.failedChapterId || error?.chapterId || previous.currentChapterId)
        ? { ...chapter, status: "failed", errorMessage: clean(error?.message || "챕터 생성 실패") }
        : chapter);
    SESSION_LOCKS.set(sessionId, {
      ...previous,
      sessionId,
      reportId,
      requestId,
      userId: auth.userId,
      status: "failed",
      generationStatus: "failed",
      currentStep: clean(error?.failedStep || error?.step || "failed"),
      progress: Number(previous.progress || 0),
      progressPercent: Number(previous.progressPercent ?? previous.progress ?? 0),
      chapters: failedChapters,
      code: clean(error?.code || "SOUL_ORIGIN_GENERATION_FAILED"),
      message: clean(error?.message || "운명의 업 PDF 생성 중 문제가 발생했습니다."),
      failedStep: clean(error?.failedStep || error?.step || "soul-origin-generation"),
      failedChapterId: clean(error?.failedChapterId || error?.chapterId || previous.currentChapterId || ""),
      httpStatus: Number(error?.status || 500),
      updatedAt: new Date().toISOString(),
      error: normalizeError(error),
    });
    throw error;
  }
}

async function handleGenerateMock(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const reportId = clean(body?.jobId || body?.reportId || body?.accessGrant?.reportId || "");
  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || "");
  const requestId = clean(body?.requestId || body?._paymentContext?.requestId || body?.payment?.requestId || "");
  const found = findSoulOriginJobLock({ userId: auth.userId, sessionId, reportId });
  if (!found?.lock) {
    return json({
      ok: false,
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      code: "JOB_NOT_FOUND",
      message: "운명의 업 PDF Job을 찾지 못했습니다.",
      reportId,
      sessionId,
    }, { status: 404 });
  }

  const lock = found.lock;
  const effectiveSessionId = found.sessionId;
  if (lock.access?.verified !== true) {
    return json({
      ok: false,
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      code: "ACCESS_NOT_VERIFIED",
      message: "결제 검증이 완료된 Job만 생성할 수 있습니다.",
      reportId: clean(lock.reportId || reportId),
      sessionId: effectiveSessionId,
    }, { status: 403 });
  }

  const currentStatus = clean(lock.generationStatus || lock.status).toLowerCase();
  if (currentStatus === "completed" || lock.status === "done") {
    return json(lock.result || { ok: true, ...publicSoulOriginJobStatus(lock) });
  }
  if (isSoulOriginJobActive(currentStatus)) {
    return json({ ok: true, ...publicSoulOriginJobStatus(lock) });
  }

  try {
    const responseBody = await runSoulOriginMockGeneration({
      request,
      env,
      auth,
      sessionId: effectiveSessionId,
      reportId: clean(lock.reportId || reportId),
      requestId: clean(lock.requestId || requestId),
      body: lock.bodySnapshot || body,
      lock,
    });
    return json(responseBody);
  } catch (error) {
    return json({
      ok: false,
      ...publicSoulOriginJobStatus(SESSION_LOCKS.get(effectiveSessionId) || lock),
      code: clean(error?.code || "SOUL_ORIGIN_GENERATION_FAILED"),
      message: "운명의 업 PDF 생성 중 문제가 발생했습니다. 결제 내역은 보존됩니다. 다시 시도하거나 고객센터에 문의해주세요.",
    }, { status: Number(error?.status || 500) });
  }
}

function getPremiumAccessToken(request, body = {}) {
  return clean(
    request.headers.get("x-premium-access-token")
    || body?.premiumAccessToken
    || body?._premiumAccessToken
    || body?.accessToken
    || body?.token
    || body?.accessGrant?.premiumAccessToken
    || body?.accessGrant?.accessToken
    || body?.payment?.premiumAccessToken
    || body?._paymentContext?.premiumAccessToken
    || cookieValue(request, "cd_premium_access")
    || cookieValue(request, "cd_premium_access_token")
    || "",
  );
}

function truthyFlag(value) {
  const text = clean(value).toLowerCase();
  return text === "true" || text === "1" || text === "yes" || text === "on";
}

function isProductionRuntime(env = {}) {
  return clean(env?.NODE_ENV || env?.ENV).toLowerCase() === "production";
}

function isDebugMockAccessAllowed(env = {}) {
  return !isProductionRuntime(env) && truthyFlag(env?.PDF_DEBUG_MODE);
}

function buildSoulOriginMockEnv(env = {}) {
  return {
    ...env,
    PDF_LLM_PROVIDER: "mock",
    PDF_DEBUG_MODE: "true",
    LLM_DRY_RUN: "true",
    GEMINI_CALL_ENABLED: "false",
    WORKERS_AI_ENABLED: "false",
    PDF_LLM_MAX_CALLS_PER_JOB: "0",
    PDF_LLM_MAX_RETRIES: "0",
  };
}

function buildAccessVerificationKey(userId = "", sessionId = "", reportId = "") {
  return [clean(userId), clean(sessionId), clean(reportId)].join("::");
}

function accessMethodFromResult(access = {}) {
  const type = clean(access.accessType || access.method).toLowerCase();
  if (type.includes("debug")) return "debug_mock";
  if (type.includes("pass")) return "pass";
  return "payment";
}

function storeAccessVerification({ userId = "", sessionId = "", reportId = "", requestId = "", access = {}, body = {}, birthInput = {} } = {}) {
  const verifiedAt = new Date().toISOString();
  const record = {
    userId: clean(userId),
    sessionId: clean(sessionId),
    reportId: clean(reportId),
    requestId: clean(requestId),
    verified: true,
    method: accessMethodFromResult(access),
    access,
    bodySnapshot: body,
    inputSnapshot: birthInput,
    verifiedAt,
  };
  ACCESS_VERIFICATIONS.set(buildAccessVerificationKey(userId, sessionId, reportId), record);
  return record;
}

function findAccessVerification({ userId = "", sessionId = "", reportId = "" } = {}) {
  const direct = ACCESS_VERIFICATIONS.get(buildAccessVerificationKey(userId, sessionId, reportId));
  if (direct?.verified) return direct;
  for (const record of ACCESS_VERIFICATIONS.values()) {
    if (clean(record.userId) !== clean(userId)) continue;
    if (sessionId && clean(record.sessionId) !== clean(sessionId)) continue;
    if (reportId && clean(record.reportId) !== clean(reportId)) continue;
    if (record.verified) return record;
  }
  return null;
}

function initialSoulOriginChapters() {
  return asArray(soulOriginChapterPlanV1.chapters).map((chapter, index) => ({
    id: clean(chapter.id),
    title: clean(chapter.title),
    order: Number(chapter.order || chapter.chapterNumber || index + 1),
    category: clean(chapter.category || "운명의 업"),
    status: "pending",
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
  }));
}

function slimSoulOriginChapters(chapters = []) {
  return asArray(chapters).map((chapter, index) => ({
    id: clean(chapter.id),
    title: clean(chapter.title),
    order: Number(chapter.order || chapter.chapterNumber || index + 1),
    category: clean(chapter.category || ""),
    status: clean(chapter.status || (chapter.html || chapter.content ? "completed" : "pending")),
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    startedAt: clean(chapter.startedAt || "") || undefined,
    completedAt: clean(chapter.completedAt || "") || undefined,
    errorMessage: clean(chapter.errorMessage || "") || undefined,
  }));
}

function findSoulOriginJobLock({ userId = "", sessionId = "", reportId = "" } = {}) {
  if (sessionId) {
    const lock = SESSION_LOCKS.get(sessionId);
    if (lock && clean(lock.userId) === clean(userId)) return { sessionId, lock };
  }
  for (const [key, lock] of SESSION_LOCKS.entries()) {
    if (clean(lock.userId) !== clean(userId)) continue;
    if (reportId && clean(lock.reportId) !== clean(reportId)) continue;
    return { sessionId: key, lock };
  }
  return null;
}

function isSoulOriginJobActive(status = "") {
  return ["queued", "generating", "chapter_generating", "rendering", "saving", "running", "processing"].includes(clean(status).toLowerCase());
}

function buildSoulOriginInputHash(input = {}) {
  return hashSoulOriginStable({
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    birthPlace: input.birthPlace,
    timezone: input.timezone,
    latitude: input.latitude,
    longitude: input.longitude,
    calendarType: input.calendarType,
  });
}

function publicSoulOriginJobStatus(lock = {}) {
  const chapters = slimSoulOriginChapters(lock.chapters?.length ? lock.chapters : initialSoulOriginChapters());
  const completedChapters = Number.isFinite(Number(lock.completedChapters))
    ? Number(lock.completedChapters)
    : chapters.filter((chapter) => chapter.status === "completed").length;
  const totalChapters = Number(lock.totalChapters || chapters.length || soulOriginChapterPlanV1.chapters.length);
  const progressPercent = Number.isFinite(Number(lock.progressPercent ?? lock.progress))
    ? Number(lock.progressPercent ?? lock.progress)
    : 0;
  return {
    jobId: clean(lock.reportId || ""),
    reportId: clean(lock.reportId || ""),
    sessionId: clean(lock.sessionId || ""),
    serviceType: "destiny_karma_pdf",
    status: clean(lock.generationStatus || lock.currentStep || lock.status || "created"),
    serverStatus: clean(lock.status || ""),
    progressPercent,
    progress: progressPercent,
    totalChapters,
    completedChapters,
    currentChapterId: clean(lock.currentChapterId || ""),
    currentChapterTitle: clean(lock.currentChapterTitle || ""),
    chapters,
    pdfUrl: clean(lock.pdfUrl || lock.result?.pdfUrl || lock.result?.downloadUrl || ""),
    downloadUrl: clean(lock.downloadUrl || lock.result?.downloadUrl || lock.result?.pdfUrl || ""),
    errorMessage: clean(lock.message || ""),
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    access: lock.access?.verified ? lock.access : undefined,
    createdAt: clean(lock.createdAt || lock.startedAt || ""),
    updatedAt: clean(lock.updatedAt || ""),
    completedAt: clean(lock.completedAt || ""),
  };
}

async function handlePrepare(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({
        ok: false,
        serviceKey: SOUL_ORIGIN_SERVICE_KEY,
        code: "UNAUTHORIZED",
        message: "로그인 후 운명의 업 PDF를 생성할 수 있습니다.",
      }, { status: 401 });
    }
    throw error;
  }

  const body = await readJson(request);
  const requestId = clean(body?.requestId || body?._paymentContext?.requestId || body?.payment?.requestId || "");
  const normalizedBirth = normalizeBirthInput(body?.birthInput || body?.input || {});

  if (!normalizedBirth.ok) {
    return json({ ok: false, code: normalizedBirth.code, message: normalizedBirth.message }, { status: normalizedBirth.code === "BIRTH_TIME_REQUIRED" ? 422 : 400 });
  }

  const birthInput = normalizedBirth.input;
  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || makeReportId());
  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || `soul-origin:${auth.userId}:${reportId}`);

  const existingLock = SESSION_LOCKS.get(sessionId);
  const lockBelongsToUser = existingLock && clean(existingLock.userId) === clean(auth.userId);
  const lockMatchesReport = existingLock && (!clean(reportId) || clean(existingLock.reportId) === clean(reportId));
  if (existingLock && !lockBelongsToUser) {
    SESSION_LOCKS.delete(sessionId);
  } else if (existingLock?.status === "running" && lockMatchesReport) {
    return json({
      ok: true,
      status: "running",
      serverStatus: "running",
      ...soulOriginProgressFields(existingLock),
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      reportId: clean(existingLock.reportId || reportId),
      sessionId,
      chapterCount: soulOriginChapterPlanV1.chapters.length,
      startedAt: existingLock.startedAt,
      data: {
        reportId: clean(existingLock.reportId || reportId),
        sessionId,
        status: "running",
        ...soulOriginProgressFields(existingLock),
        startedAt: existingLock.startedAt,
      },
    });
  }
  if (existingLock?.status === "done" && existingLock.result && lockMatchesReport) {
    return json(existingLock.result);
  }

  SESSION_LOCKS.set(sessionId, {
    sessionId,
    reportId,
    requestId,
    userId: auth.userId,
    status: "running",
    generationStatus: "pending",
    currentStep: "pending",
    progress: 0,
    startedAt: new Date().toISOString(),
  });

  const premiumAccessToken = getPremiumAccessToken(request, body);

  try {
    logFlow("ProductLookupStart", { requestId, sessionId, reportId });

    const featureKey = clean(body?.featureKey || SOUL_ORIGIN_FEATURE_KEY) || SOUL_ORIGIN_FEATURE_KEY;
    const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, SOUL_ORIGIN_REPORT_TYPE, {
      ...body,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      canonicalReportType: SOUL_ORIGIN_REPORT_TYPE,
      archiveReportType: SOUL_ORIGIN_ARCHIVE_REPORT_TYPE,
      reportTypeAliases: SOUL_ORIGIN_REPORT_TYPE_ALIASES,
      featureKey,
      featureAliases: SOUL_ORIGIN_FEATURE_ALIASES,
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: "/api/soul-origin",
    });

    if (!access?.ok) {
      SESSION_LOCKS.delete(sessionId);
      const status = Number(access?.status || 402);
      const hasSessionId = Boolean(clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId));
      const hasPurchaseId = Boolean(clean(body?.purchaseId || body?.accessGrant?.purchaseId || body?.payment?.purchaseId));
      const hasRequestId = Boolean(clean(body?.requestId || body?.accessGrant?.requestId || body?.payment?.requestId || body?._paymentContext?.requestId));
      const hasPaymentToken = Boolean(premiumAccessToken);
      const paymentConfirmedButMissing = status === 402 && (hasSessionId || hasPurchaseId || hasRequestId || hasPaymentToken);
      const accessCode = clean(access?.code || "PAYMENT_REQUIRED").toUpperCase();
      const isCoinShortage = status === 402 && /(INSUFFICIENT|SHORTAGE|POINT|COIN)/.test(accessCode);

      const message = status === 401
        ? "로그인 후 운명의 업 PDF를 생성할 수 있습니다."
        : paymentConfirmedButMissing
          ? "결제는 확인되었지만 생성 권한 연결이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요."
          : isCoinShortage
            ? "운명의 업 PDF 생성을 위해 결제가 필요합니다."
            : status === 402
              ? "프리미엄 PDF 생성 권한이 필요합니다."
            : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

      return json({
        ok: false,
        serviceKey: SOUL_ORIGIN_SERVICE_KEY,
        code: paymentConfirmedButMissing ? "PAYMENT_CONFIRMED_BUT_ACCESS_MISSING" : (access?.code || "PAYMENT_REQUIRED"),
        message,
        debugSafe: {
          featureKey,
          hasSessionId,
          hasPurchaseId,
          hasRequestId,
          hasPaymentToken,
        },
      }, { status });
    }

    logFlow("CoinGateSuccess", { requestId, sessionId, reportId });

    const executionCtx = buildPremiumExecutionContext({
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      userId: auth.userId,
      featureKey,
      sessionId,
      reportId,
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });

    await startPremiumPdfExecution(env, auth.userId, executionCtx);
    updateSoulOriginSessionLock(sessionId, {
      generationStatus: "validating",
      currentStep: "validating",
      progress: 5,
    });
    logFlow("SessionCreateStart", { requestId, sessionId, reportId });

    logFlow("CalculationStart", { requestId, sessionId, reportId });
    updateSoulOriginSessionLock(sessionId, {
      generationStatus: "calculating",
      currentStep: "calculating",
      progress: 10,
    });
    const calculationSeed = await buildSoulOriginCalculationSeed(env, birthInput);
    updateSoulOriginSessionLock(sessionId, {
      generationStatus: "calculating",
      currentStep: "calculating",
      progress: 25,
      systemStatus: buildCalculationSystemStatus(calculationSeed),
    });
    logFlow("CalculationSuccess", { requestId, sessionId, reportId });

    const normalizedLlmInput = normalizeSoulOriginCalculationInput({
      birthInput,
      calculationSeed,
      locale: "ko-KR",
    });

    logFlow("LLMReportStart", { requestId, sessionId, reportId });
    updateSoulOriginSessionLock(sessionId, {
      generationStatus: "generating",
      currentStep: "generating",
      progress: 30,
    });
    const generatedReport = await createSoulOriginPremiumPdfJob({
      env,
      input: normalizedLlmInput,
      calculationSeed,
      userId: auth.userId,
      reportId,
      sessionId,
      requestUrl: request.url,
      onStatus: (state = {}) => {
        updateSoulOriginSessionLock(sessionId, {
          generationStatus: clean(state.status || state.currentStep || "generating"),
          currentStep: clean(state.currentStep || state.status || "generating"),
          progress: Number.isFinite(Number(state.progress)) ? Number(state.progress) : 0,
          progressPercent: Number.isFinite(Number(state.progressPercent ?? state.progress)) ? Number(state.progressPercent ?? state.progress) : 0,
          currentChapterId: clean(state.currentChapterId || ""),
          currentChapterTitle: clean(state.currentChapterTitle || ""),
          totalChapters: Number(state.totalChapters || soulOriginChapterPlanV1.chapters.length),
          completedChapters: Number(state.completedChapters || 0),
          chapters: Array.isArray(state.chapters) ? state.chapters : SESSION_LOCKS.get(sessionId)?.chapters,
          systemStatus: state.systemStatus && typeof state.systemStatus === "object" ? state.systemStatus : buildCalculationSystemStatus(calculationSeed),
        });
      },
    });
    logFlow("LLMReportSuccess", {
      requestId,
      sessionId,
      reportId,
      chapterCount: Number(generatedReport.chapterCount || 0),
    });

    const chapters = Array.isArray(generatedReport.chapters) ? generatedReport.chapters : [];
    const qualityReport = generatedReport.qualityReport || { status: "passed", score: 100 };
    const pdfReady = generatedReport.pdfReady || {};
    const pdfCompletionValidation = generatedReport.pdfCompletionValidation || null;
    const llmAssembly = generatedReport.llmAssembly || {
      enabled: true,
      externalGeneration: true,
      fallbackUsed: false,
      chapterCount: chapters.length,
      expectedChapterCount: soulOriginChapterPlanV1.chapters.length,
    };
    const manuscriptSource = SOUL_ORIGIN_MANUSCRIPT_SOURCE;
    const chapterAuthoringSource = SOUL_ORIGIN_MANUSCRIPT_SOURCE;
    const summarySource = SOUL_ORIGIN_MANUSCRIPT_SOURCE;
    const generatedAt = generatedReport.generatedAt || new Date().toISOString();

    const responseBody = {
      ok: true,
      status: "completed",
      serverStatus: "completed",
      qualityStatus: clean(qualityReport.status) || "passed",
      qualityReport,
      manuscriptSource,
      chapterAuthoringSource,
      summarySource,
      generationMode: generatedReport.generationMode || SOUL_ORIGIN_MANUSCRIPT_SOURCE,
      provider: generatedReport.provider || SOUL_ORIGIN_PROVIDER,
      modelName: generatedReport.modelName || "",
      writingPipeline: generatedReport.writingPipeline || SOUL_ORIGIN_WRITING_PIPELINE,
      tokensUsed: Number(generatedReport.tokensUsed || 0),
      cost: Number(generatedReport.cost || 0),
      isMock: generatedReport.isMock === true || clean(generatedReport.provider) === "mock",
      fallbackUsed: false,
      llmAssemblyOnly: true,
      externalCallsAllowed: generatedReport.externalCallsAllowed !== false ? true : false,
      llmAssembly,
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      featureKey,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      canonicalReportType: SOUL_ORIGIN_REPORT_TYPE,
      archiveReportType: SOUL_ORIGIN_ARCHIVE_REPORT_TYPE,
      chapterCount: chapters.length,
      expectedChapterCount: soulOriginChapterPlanV1.chapters.length,
      totalChapters: soulOriginChapterPlanV1.chapters.length,
      completedChapters: chapters.length,
      progressPercent: 100,
      reportId,
      sessionId,
      title: clean(generatedReport.reportTitle || SOUL_ORIGIN_TITLE) || SOUL_ORIGIN_TITLE,
      summary: clean(generatedReport.summary || ""),
      finalMessage: clean(generatedReport.finalMessage || ""),
      disclaimer: clean(generatedReport.disclaimer || ""),
      birthInput,
      calculationDigest: clean(normalizedLlmInput.calculationDigest || ""),
      chapters,
      pdfV2: generatedReport.pdfV2 || null,
      pdfReady,
      pdfCompletionValidation,
      downloadUrl: clean(pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl),
      pdfUrl: clean(pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl),
      htmlUrl: clean(pdfReady.htmlUrl || pdfReady.pdfUrl || pdfReady.downloadUrl),
      canReopen: true,
      canDownload: true,
      createdAt: generatedAt,
    };

    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      manuscriptSource,
      chapterAuthoringSource,
      summarySource,
      generationMode: responseBody.generationMode,
      provider: responseBody.provider,
      modelName: responseBody.modelName,
      writingPipeline: responseBody.writingPipeline,
      fallbackUsed: false,
      llmAssemblyOnly: true,
      externalCallsAllowed: true,
      llmAssembly,
      chapterCount: chapters.length,
      pdfCompletionValidation,
      archive: {
        reportId,
        reportType: SOUL_ORIGIN_REPORT_TYPE,
        canonicalReportType: SOUL_ORIGIN_REPORT_TYPE,
        archiveReportType: SOUL_ORIGIN_ARCHIVE_REPORT_TYPE,
        qualityStatus: responseBody.qualityStatus,
        manuscriptSource,
        chapterAuthoringSource,
        summarySource,
        generationMode: responseBody.generationMode,
        provider: responseBody.provider,
        modelName: responseBody.modelName,
        writingPipeline: responseBody.writingPipeline,
        tokensUsed: responseBody.tokensUsed,
        cost: responseBody.cost,
        isMock: responseBody.isMock,
        fallbackUsed: false,
        llmAssemblyOnly: true,
        externalCallsAllowed: responseBody.externalCallsAllowed,
        llmAssembly,
        displayName: SOUL_ORIGIN_DISPLAY_NAME,
        title: responseBody.title,
        qualityReport,
        summary: responseBody.summary,
        finalMessage: responseBody.finalMessage,
        disclaimer: responseBody.disclaimer,
        mode: "personal",
        birthName: clean(birthInput.name),
        chapterCount: chapters.length,
        expectedChapterCount: soulOriginChapterPlanV1.chapters.length,
        chapters,
        calculationInput: normalizedLlmInput,
        calculationDigest: responseBody.calculationDigest,
        pdfV2: responseBody.pdfV2,
        cacheKey: clean(generatedReport.cacheKey || ""),
        pdfReady,
        pdfCompletionValidation,
        downloadUrl: responseBody.downloadUrl,
        pdfUrl: responseBody.pdfUrl,
        htmlUrl: responseBody.htmlUrl,
        canReopen: true,
        canDownload: true,
      },
    });

    REPORT_CACHE.set(reportId, {
      reportId,
      userId: auth.userId,
      payload: responseBody,
    });

    SESSION_LOCKS.set(sessionId, {
      sessionId,
      reportId,
      requestId,
      userId: auth.userId,
      status: "done",
      generationStatus: "completed",
      currentStep: "completed",
      progress: 100,
      progressPercent: 100,
      totalChapters: soulOriginChapterPlanV1.chapters.length,
      completedChapters: chapters.length,
      chapters: slimSoulOriginChapters(chapters),
      systemStatus: buildCalculationSystemStatus(calculationSeed),
      startedAt: existingLock?.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      result: responseBody,
    });

    logFlow("PDFCreateSuccess", { requestId, sessionId, reportId });
    return json(responseBody);
  } catch (error) {
    const executionCtx = buildPremiumExecutionContext({
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      userId: auth.userId,
      featureKey: clean(body?.featureKey || SOUL_ORIGIN_FEATURE_KEY) || SOUL_ORIGIN_FEATURE_KEY,
      sessionId,
      reportId,
      access: null,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });

    logFlow("Failed", {
      requestId,
      sessionId,
      reportId,
      errorCode: clean(error?.code || "SOUL_ORIGIN_GENERATION_FAILED"),
    });

    try {
      await failPremiumPdfExecution(
        env,
        auth.userId,
        executionCtx,
        clean(error?.code || "soul_origin_generation_failed"),
        clean(error?.message || "운명의 업 리포트 생성 중 오류가 발생했습니다."),
        "soul-origin-generation",
      );
    } catch (failError) {
      logFlow("FailExecutionError", {
        requestId,
        sessionId,
        reportId,
        errorCode: clean(failError?.code || "SOUL_ORIGIN_FAIL_EXECUTION_ERROR"),
      });
    }

    SESSION_LOCKS.set(sessionId, {
      sessionId,
      reportId,
      requestId,
      userId: auth.userId,
      status: "failed",
      generationStatus: "failed",
      currentStep: clean(error?.failedStep || error?.step || "failed"),
      progress: Number(SESSION_LOCKS.get(sessionId)?.progress || 0),
      code: clean(error?.code || "SOUL_ORIGIN_GENERATION_FAILED"),
      message: clean(error?.message || "운명의 업 PDF 생성 중 문제가 발생했습니다."),
      failedStep: clean(error?.failedStep || error?.step || "soul-origin-generation"),
      failedChapterId: clean(error?.failedChapterId || error?.chapterId || ""),
      httpStatus: Number(error?.status || 500),
      startedAt: new Date().toISOString(),
      error: normalizeError(error),
    });

    const rawMessage = clean(error?.message || "운명의 업 리포트 생성 중 오류가 발생했습니다.");
    const userMessage = rawMessage.includes("생년월일") || rawMessage.includes("출생")
      ? "생년월일시 정보를 확인할 수 없습니다. 정확한 생년월일시를 입력해 주세요."
      : rawMessage.includes("품질") || rawMessage.includes("원고")
        ? "생성된 상담서가 품질 기준에 맞지 않아 완료하지 못했습니다. 입력 정보를 확인한 뒤 다시 시도해 주세요."
        : "운명의 업 상담서 생성 중 문제가 발생했습니다. 입력 정보를 확인한 뒤 다시 시도해 주세요.";

    return json({
      ok: false,
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      code: clean(error?.code || "SOUL_ORIGIN_GENERATION_FAILED"),
      message: userMessage,
      debugSafe: {
        reportId,
        sessionId,
        stage: "soul-origin-generation",
        failedStep: clean(error?.failedStep || error?.step || ""),
        failedChapterId: clean(error?.failedChapterId || error?.chapterId || ""),
        manuscriptSource: SOUL_ORIGIN_MANUSCRIPT_SOURCE,
      },
    }, { status: Number(error?.status || 500) });
  }
}

async function loadSoulOriginReportPayload(env, auth, reportId) {
  const cached = REPORT_CACHE.get(reportId);
  if (cached && cached.userId === auth.userId) {
    return { ok: true, payload: cached.payload };
  }

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
    return { ok: false, status: 404, code: "REPORT_NOT_FOUND", message: "요청한 운명의 업 리포트를 찾을 수 없습니다." };
  }
  const pdfReady = archive?.pdfReady && typeof archive.pdfReady === "object" ? archive.pdfReady : {};
  const archivedQualityReport = archive?.qualityReport && typeof archive.qualityReport === "object" ? archive.qualityReport : undefined;
  const payload = {
    ok: true,
    status: "completed",
    serverStatus: "completed",
    qualityStatus: clean(archive.qualityStatus || archivedQualityReport?.status || "passed") || "passed",
    manuscriptSource: clean(archive.manuscriptSource || SOUL_ORIGIN_MANUSCRIPT_SOURCE) || SOUL_ORIGIN_MANUSCRIPT_SOURCE,
    chapterAuthoringSource: clean(archive.chapterAuthoringSource || SOUL_ORIGIN_MANUSCRIPT_SOURCE) || SOUL_ORIGIN_MANUSCRIPT_SOURCE,
    summarySource: clean(archive.summarySource || SOUL_ORIGIN_MANUSCRIPT_SOURCE) || SOUL_ORIGIN_MANUSCRIPT_SOURCE,
    generationMode: clean(archive.generationMode || SOUL_ORIGIN_MANUSCRIPT_SOURCE) || SOUL_ORIGIN_MANUSCRIPT_SOURCE,
    provider: clean(archive.provider || SOUL_ORIGIN_PROVIDER) || SOUL_ORIGIN_PROVIDER,
    modelName: clean(archive.modelName || pdfReady.modelName || ""),
    writingPipeline: clean(archive.writingPipeline || SOUL_ORIGIN_WRITING_PIPELINE) || SOUL_ORIGIN_WRITING_PIPELINE,
    fallbackUsed: false,
    llmAssemblyOnly: archive.llmAssemblyOnly === true || pdfReady.llmAssemblyOnly === true,
    externalCallsAllowed: archive.externalCallsAllowed !== false,
    llmAssembly: archive.llmAssembly || pdfReady.llmAssembly || undefined,
    serviceKey: SOUL_ORIGIN_SERVICE_KEY,
    featureKey: clean(archive.featureKey || SOUL_ORIGIN_FEATURE_KEY) || SOUL_ORIGIN_FEATURE_KEY,
    reportType: SOUL_ORIGIN_REPORT_TYPE,
    canonicalReportType: SOUL_ORIGIN_REPORT_TYPE,
    archiveReportType: clean(archive.archiveReportType || SOUL_ORIGIN_ARCHIVE_REPORT_TYPE) || SOUL_ORIGIN_ARCHIVE_REPORT_TYPE,
    chapterCount: Number(archive.chapterCount || (Array.isArray(archive.chapters) ? archive.chapters.length : 0)),
    expectedChapterCount: Number(archive.expectedChapterCount || pdfReady.expectedChapterCount || soulOriginChapterPlanV1.chapters.length),
    reportId: clean(archive.reportId || reportId),
    sessionId: clean(archived?.sessionId || "") || undefined,
    title: clean(archive.title || SOUL_ORIGIN_TITLE) || SOUL_ORIGIN_TITLE,
    summary: clean(archive.summary || ""),
    finalMessage: clean(archive.finalMessage || ""),
    disclaimer: clean(archive.disclaimer || ""),
    chapters: Array.isArray(archive.chapters) ? archive.chapters : [],
    qualityReport: archivedQualityReport,
    pdfV2: archive?.pdfV2 && typeof archive.pdfV2 === "object" ? archive.pdfV2 : undefined,
    calculationDigest: clean(archive.calculationDigest || archive?.calculationInput?.calculationDigest || ""),
    pdfReady,
    pdfCompletionValidation: archive.pdfCompletionValidation || pdfReady.pdfCompletionValidation || null,
    downloadUrl: clean(archive.downloadUrl || pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl),
    pdfUrl: clean(archive.pdfUrl || pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl),
    htmlUrl: clean(archive.htmlUrl || pdfReady.htmlUrl || pdfReady.pdfUrl || pdfReady.downloadUrl),
    canReopen: true,
    canDownload: Boolean(clean(archive.pdfUrl || pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl)),
    createdAt: toIso(archived?.createdAt) || new Date().toISOString(),
  };

  REPORT_CACHE.set(reportId, {
    reportId,
    userId: auth.userId,
    payload,
  });

  return { ok: true, payload };
}

async function handleReadReport(request, env, pathReportId = "") {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const reportId = clean(pathReportId || url.searchParams.get("reportId"));

  if (!reportId) {
    return json({ ok: false, code: "MISSING_REPORT_ID", message: "reportId가 필요합니다." }, { status: 400 });
  }

  const loaded = await loadSoulOriginReportPayload(env, auth, reportId);
  if (!loaded.ok) {
    return json({ ok: false, code: loaded.code, message: loaded.message }, { status: Number(loaded.status || 404) });
  }
  return json(loaded.payload);
}

async function handleStatus(request, env, pathReportId = "") {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({
        ok: false,
        serviceKey: SOUL_ORIGIN_SERVICE_KEY,
        code: "UNAUTHORIZED",
        message: "로그인 후 운명의 업 PDF 생성 상태를 확인할 수 있습니다.",
      }, { status: 401 });
    }
    throw error;
  }

  const url = new URL(request.url);
  const reportId = clean(pathReportId || url.searchParams.get("reportId"));
  const sessionId = clean(url.searchParams.get("sessionId") || url.searchParams.get("reportSessionId"));
  const executionKey = clean(url.searchParams.get("executionKey") || url.searchParams.get("requestId"));

  if (!reportId && !sessionId && !executionKey) {
    return json({
      ok: false,
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      code: "MISSING_STATUS_LOOKUP_KEY",
      message: "reportId, sessionId 또는 executionKey가 필요합니다.",
    }, { status: 400 });
  }

  if (sessionId) {
    const lock = SESSION_LOCKS.get(sessionId);
    if (lock && clean(lock.userId) !== clean(auth.userId)) {
      SESSION_LOCKS.delete(sessionId);
    } else if (lock?.status === "done" && lock.result) {
      return json(lock.result);
    }
    if (lock?.status === "running") {
      return json({
        ok: true,
        status: "running",
        serverStatus: "running",
        ...soulOriginProgressFields(lock),
        serviceKey: SOUL_ORIGIN_SERVICE_KEY,
        reportType: SOUL_ORIGIN_REPORT_TYPE,
        reportId: clean(lock.reportId || reportId),
        sessionId,
        chapterCount: soulOriginChapterPlanV1.chapters.length,
        startedAt: lock.startedAt,
      });
    }
    if (lock?.status === "failed") {
      return json({
        ok: false,
        status: "failed",
        serverStatus: "failed",
        serviceKey: SOUL_ORIGIN_SERVICE_KEY,
        reportType: SOUL_ORIGIN_REPORT_TYPE,
        reportId: clean(lock.reportId || reportId),
        sessionId,
        ...soulOriginProgressFields(lock),
        code: clean(lock.code || "SOUL_ORIGIN_GENERATION_FAILED"),
        message: clean(lock.message || "운명의 업 PDF 생성 중 문제가 발생했습니다."),
      }, { status: Number(lock.httpStatus || 500) });
    }
  }

  if (reportId) {
    const loaded = await loadSoulOriginReportPayload(env, auth, reportId);
    if (loaded.ok) return json(loaded.payload);
  }

  const executionResult = await getServiceExecution(env, auth.userId, {
    executionKey,
    sessionId,
    reportId,
  });

  if (!executionResult?.ok) {
    return json({
      ok: false,
      status: "not_found",
      serverStatus: "not_found",
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      reportId,
      sessionId,
      code: "SOUL_ORIGIN_EXECUTION_NOT_FOUND",
      message: "운명의 업 PDF 생성 상태를 찾지 못했습니다.",
    }, { status: Number(executionResult?.status || 404) });
  }

  const execution = executionResult.execution || {};
  const finalReportId = clean(execution.reportId || reportId);
  const finalSessionId = clean(execution.sessionId || sessionId);
  const executionStatus = clean(execution.status).toLowerCase();
  const premiumStatus = clean(execution.premiumStatus).toLowerCase();

  if ((executionStatus === "success" || premiumStatus === "completed") && finalReportId) {
    const loaded = await loadSoulOriginReportPayload(env, auth, finalReportId);
    if (loaded.ok) return json(loaded.payload);
    return json({
      ok: true,
      status: "completed",
      serverStatus: "completed",
      generationStatus: "completed",
      progress: 100,
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      reportId: finalReportId,
      sessionId: finalSessionId,
      chapterCount: soulOriginChapterPlanV1.chapters.length,
      code: loaded.code || "SOUL_ORIGIN_REPORT_ARCHIVE_PENDING",
      message: loaded.message || "PDF 결과 저장을 확인하는 중입니다.",
    });
  }

  if (executionStatus === "failed" || premiumStatus === "failed" || premiumStatus === "abandoned" || premiumStatus === "refunded" || premiumStatus === "refund_failed") {
    return json({
      ok: false,
      status: "failed",
      serverStatus: "failed",
      generationStatus: "failed",
      progress: 0,
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      reportId: finalReportId,
      sessionId: finalSessionId,
      execution,
      code: clean(execution.reasonCode || "SOUL_ORIGIN_GENERATION_FAILED"),
      message: clean(execution.reasonMessage || "운명의 업 PDF 생성 중 문제가 발생했습니다."),
    }, { status: 500 });
  }

  return json({
    ok: true,
    status: "running",
    serverStatus: "running",
    generationStatus: "generating",
    progress: 30,
    serviceKey: SOUL_ORIGIN_SERVICE_KEY,
    reportType: SOUL_ORIGIN_REPORT_TYPE,
    reportId: finalReportId,
    sessionId: finalSessionId,
    chapterCount: soulOriginChapterPlanV1.chapters.length,
    execution,
  });
}

export async function handleSoulOriginRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/soul-origin");

    if (path === "" || path === "/") {
      if (method !== "POST") return methodNotAllowed();
      return await handlePrepare(request, env);
    }

    if (path === "/ai-consultation") {
      if (method !== "POST") return methodNotAllowed();
      return await handleKarmaAIConsultation(request, env);
    }

    if (path === "/verify-access") {
      if (method !== "POST") return methodNotAllowed();
      return await handleVerifyAccess(request, env);
    }

    if (path === "/create-job") {
      if (method !== "POST") return methodNotAllowed();
      return await handleCreateJob(request, env);
    }

    if (path === "/generate-mock") {
      if (method !== "POST") return methodNotAllowed();
      return await handleGenerateMock(request, env);
    }

    if (path === "/report") {
      if (method !== "GET") return methodNotAllowed();
      return await handleReadReport(request, env);
    }

    if (path.startsWith("/result/")) {
      if (method !== "GET") return methodNotAllowed();
      return await handleReadReport(request, env, decodeURIComponent(path.slice("/result/".length)));
    }

    if (path === "/status") {
      if (method !== "GET") return methodNotAllowed();
      return await handleStatus(request, env);
    }

    if (path.startsWith("/status/")) {
      if (method !== "GET") return methodNotAllowed();
      return await handleStatus(request, env, decodeURIComponent(path.slice("/status/".length)));
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[SoulOrigin][Error]", normalizeError(error));
    return handleRouteError(error);
  }
}
