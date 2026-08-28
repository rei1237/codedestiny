
import { daeun } from "../../lib/korean-calendar/index.js";

// 🔴 절기 축은 전부 여기서 나온다. lunar-javascript 의 절기 시각은 **중국 표준시(CST) 벽시계**라,
// 생시를 KST 벽시계로 넘기면 월건 경계가 정확히 60분 이르다(실측 2026-08-27, 1960~2030
// 節 경계 ±150분 창 13,632건 중 월주 5,553건 · 년주 459건 불일치, 전부 -60~-1분 구간).
// 🔴 일주도 이제 코어에서 나온다(PR-F2). 야자시 축은 이 엔진의 dayChangePolicy 가 정하고,
// nightZiPolicyForDayChange 가 코어 정책으로 옮긴다 — 1:1 이라 값이 안 움직인다.
import {
  BRANCH_HANJA,
  NIGHT_ZI_POLICY,
  STEM_HANJA,
  ganji,
  lunarToSolar,
  nodeTerms,
  solarToLunar,
} from "../../lib/korean-calendar/index.js";

const STEM_META = Object.freeze({
  甲: { element: "wood", yinYang: "yang", ko: "갑" },
  乙: { element: "wood", yinYang: "yin", ko: "을" },
  丙: { element: "fire", yinYang: "yang", ko: "병" },
  丁: { element: "fire", yinYang: "yin", ko: "정" },
  戊: { element: "earth", yinYang: "yang", ko: "무" },
  己: { element: "earth", yinYang: "yin", ko: "기" },
  庚: { element: "metal", yinYang: "yang", ko: "경" },
  辛: { element: "metal", yinYang: "yin", ko: "신" },
  壬: { element: "water", yinYang: "yang", ko: "임" },
  癸: { element: "water", yinYang: "yin", ko: "계" },
});

const BRANCH_META = Object.freeze({
  子: { element: "water", hiddenStems: ["癸"], ko: "자" },
  丑: { element: "earth", hiddenStems: ["己", "癸", "辛"], ko: "축" },
  寅: { element: "wood", hiddenStems: ["甲", "丙", "戊"], ko: "인" },
  卯: { element: "wood", hiddenStems: ["乙"], ko: "묘" },
  辰: { element: "earth", hiddenStems: ["戊", "乙", "癸"], ko: "진" },
  // 🔴 巳 는 본기 丙 → 중기 庚 → 여기 戊 다(2026-08-28 정정). 정본 lib/saju/myeongri-tables.js 의
  // ZHI_HIDE_GAN 과 같은 순서이며, 여기서는 지장간마다 가중치가 같아 순서만 바뀌고 값은 안 움직인다.
  巳: { element: "fire", hiddenStems: ["丙", "庚", "戊"], ko: "사" },
  午: { element: "fire", hiddenStems: ["丁", "己"], ko: "오" },
  未: { element: "earth", hiddenStems: ["己", "丁", "乙"], ko: "미" },
  申: { element: "metal", hiddenStems: ["庚", "壬", "戊"], ko: "신" },
  酉: { element: "metal", hiddenStems: ["辛"], ko: "유" },
  戌: { element: "earth", hiddenStems: ["戊", "辛", "丁"], ko: "술" },
  亥: { element: "water", hiddenStems: ["壬", "甲"], ko: "해" },
});

const ELEMENT_ORDER = Object.freeze(["wood", "fire", "earth", "metal", "water"]);

const ELEMENT_LABELS = Object.freeze({
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
});

const GENERATE_TO = Object.freeze({
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
});

const CONTROL_TO = Object.freeze({
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire",
});

const TEN_GOD_LABELS = Object.freeze({
  비견: "비견",
  겁재: "겁재",
  식신: "식신",
  상관: "상관",
  편재: "편재",
  정재: "정재",
  편관: "편관",
  정관: "정관",
  편인: "편인",
  정인: "정인",
});

const STEMS = Object.freeze(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
const BRANCHES = Object.freeze(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);
const SEXAGENARY_CYCLE = Object.freeze(Array.from({ length: 60 }, (_, i) => `${STEMS[i % 10]}${BRANCHES[i % 12]}`));
const YANG_STEMS = Object.freeze(new Set(["甲", "丙", "戊", "庚", "壬"]));

const DAY_STEM_TO_ZI_HOUR_STEM_INDEX = Object.freeze({
  甲: 0,
  己: 0,
  乙: 2,
  庚: 2,
  丙: 4,
  辛: 4,
  丁: 6,
  壬: 6,
  戊: 8,
  癸: 8,
});

// 시주 시각 보정·일자 변경 정책은 이 엔진이 정본이다. love-secret-ai 처럼 다른 명식 코어를
// 쓰면서도 같은 시주 보정을 써야 하는 라우트가 재사용할 수 있게 export 만 열어 둔다
// (동작·기본값은 그대로다 — 여기서 정책이 갈리면 기능마다 시주가 달라진다).
export const HOUR_PILLAR_TIME_POLICIES = Object.freeze({
  KST_CLOCK_TIME: "KST_CLOCK_TIME",
  LOCAL_MEAN_TIME: "LOCAL_MEAN_TIME",
  TRUE_SOLAR_TIME: "TRUE_SOLAR_TIME",
});

export const DAY_CHANGE_POLICIES = Object.freeze({
  MIDNIGHT: "MIDNIGHT",
  LATE_ZI_NEXT_DAY: "LATE_ZI_NEXT_DAY",
  TRUE_SOLAR_ZI_NEXT_DAY: "TRUE_SOLAR_ZI_NEXT_DAY",
});

const MAJOR_SOLAR_TERMS = Object.freeze([
  "立春",
  "惊蛰",
  "清明",
  "立夏",
  "芒种",
  "小暑",
  "立秋",
  "白露",
  "寒露",
  "立冬",
  "大雪",
  "小寒",
]);

const SOLAR_TERM_NAME_MAP = Object.freeze({
  LI_CHUN: "立春",
  JING_ZHE: "惊蛰",
  QING_MING: "清明",
  LI_XIA: "立夏",
  MANG_ZHONG: "芒种",
  XIAO_SHU: "小暑",
  LI_QIU: "立秋",
  BAI_LU: "白露",
  HAN_LU: "寒露",
  LI_DONG: "立冬",
  DA_XUE: "大雪",
  XIAO_HAN: "小寒",
});

export const DEFAULT_LOCATION = Object.freeze({
  name: "서울",
  latitude: 37.5665,
  longitude: 126.978,
  standardMeridian: 135,
  timezone: "Asia/Seoul",
});

export const DESTINY_BIAS_THEME_PRESETS = Object.freeze({
  moonlight_neon: {
    key: "moonlight_neon",
    name: "Moonlight Neon",
    premium: false,
    palette: {
      bg: "linear-gradient(145deg, #091431 0%, #13213f 48%, #221248 100%)",
      card: "rgba(17, 27, 58, 0.84)",
      accent: "#8be9fd",
      accentSoft: "rgba(139, 233, 253, 0.28)",
      text: "#e6f3ff",
    },
  },
  coral_haze: {
    key: "coral_haze",
    name: "Coral Haze",
    premium: false,
    palette: {
      bg: "linear-gradient(155deg, #2b0f18 0%, #542127 45%, #8f4f36 100%)",
      card: "rgba(63, 20, 27, 0.82)",
      accent: "#ffd2a8",
      accentSoft: "rgba(255, 210, 168, 0.3)",
      text: "#fff5e7",
    },
  },
  jade_orbit: {
    key: "jade_orbit",
    name: "Jade Orbit",
    premium: false,
    palette: {
      bg: "linear-gradient(150deg, #062b2a 0%, #0c4e4d 44%, #195d47 100%)",
      card: "rgba(7, 43, 41, 0.82)",
      accent: "#7fffd4",
      accentSoft: "rgba(127, 255, 212, 0.28)",
      text: "#e9fff7",
    },
  },
  gold_nocturne: {
    key: "gold_nocturne",
    name: "Gold Nocturne",
    premium: false,
    palette: {
      bg: "linear-gradient(140deg, #1f1622 0%, #3c2a24 45%, #7c4f1f 100%)",
      card: "rgba(31, 22, 34, 0.82)",
      accent: "#ffd980",
      accentSoft: "rgba(255, 217, 128, 0.28)",
      text: "#fff8de",
    },
  },
  skywave_mint: {
    key: "skywave_mint",
    name: "Skywave Mint",
    premium: false,
    palette: {
      bg: "linear-gradient(145deg, #0a2746 0%, #0e4465 40%, #176f73 100%)",
      card: "rgba(10, 39, 70, 0.8)",
      accent: "#b8fff0",
      accentSoft: "rgba(184, 255, 240, 0.28)",
      text: "#ebfbff",
    },
  },
});

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampInt(value, min, max) {
  const parsed = Math.floor(num(value, min));
  return Math.max(min, Math.min(max, parsed));
}

function normalizeName(value, fallback) {
  const text = String(value || "").trim().slice(0, 24);
  return text || fallback;
}

function normalizeGender(value) {
  const text = String(value || "OTHER").trim().toUpperCase();
  if (["M", "MALE", "MAN", "남", "남자", "남성"].includes(text)) return "M";
  if (["F", "FEMALE", "WOMAN", "여", "여자", "여성"].includes(text)) return "F";
  return "OTHER";
}

function normalizeHourPillarTimePolicy(value) {
  const text = String(value || "").trim().toUpperCase();
  if (text === HOUR_PILLAR_TIME_POLICIES.KST_CLOCK_TIME) return HOUR_PILLAR_TIME_POLICIES.KST_CLOCK_TIME;
  if (text === HOUR_PILLAR_TIME_POLICIES.TRUE_SOLAR_TIME) return HOUR_PILLAR_TIME_POLICIES.TRUE_SOLAR_TIME;
  // 기본값은 평균태양시(경도 보정만). 균시차(±16분)까지 더하면 시지 경계가 밀려
  // 정적 셸(js/saju-engine.js)·모던 엔진(localSajuCalculator.ts)과 시주가 갈린다.
  return HOUR_PILLAR_TIME_POLICIES.LOCAL_MEAN_TIME;
}

function normalizeDayChangePolicy(value) {
  const text = String(value || "").trim().toUpperCase();
  if (text === DAY_CHANGE_POLICIES.LATE_ZI_NEXT_DAY) return DAY_CHANGE_POLICIES.LATE_ZI_NEXT_DAY;
  if (text === DAY_CHANGE_POLICIES.TRUE_SOLAR_ZI_NEXT_DAY) return DAY_CHANGE_POLICIES.TRUE_SOLAR_ZI_NEXT_DAY;
  return DAY_CHANGE_POLICIES.MIDNIGHT;
}

function normalizeCalendarType(value) {
  const textRaw = String(value || "solar").trim();
  const text = textRaw.toLowerCase();
  if (
    text === "lunar_leap"
    || text === "leap"
    || text === "leap_lunar"
    || text === "leaplunar"
    || textRaw === "윤달"
    || textRaw === "음력윤달"
  ) {
    return "lunar_leap";
  }
  if (text === "lunar" || textRaw === "음력") return "lunar";
  return "solar";
}

function parseBirthDateParts(rawDate) {
  const text = String(rawDate || "").trim();
  if (!text) return null;

  const m = text.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:\D|$)/);
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  return { year, month, day };
}

function parseBirthTimeParts(rawTime) {
  const text = String(rawTime || "").trim();
  if (!text) return null;

  const m = text.match(/^(\d{1,2}):(\d{1,2})/);
  if (!m) return null;

  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  return { hour, minute };
}

function parseTimezoneOffsetHours(timezone) {
  const text = String(timezone || "").trim();
  const m = text.match(/(?:GMT|UTC)\s*([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!m) return null;
  const sign = m[1] === "-" ? -1 : 1;
  const hour = Number(m[2] || 0);
  const minute = Number(m[3] || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return sign * (hour + minute / 60);
}

export function resolveBirthLocation(rawBirth = {}, rawPerson = {}) {
  const rawLocation = rawPerson?.location && typeof rawPerson.location === "object"
    ? rawPerson.location
    : (rawBirth?.location && typeof rawBirth.location === "object" ? rawBirth.location : {});

  const longitude = num(
    rawBirth?.longitude
    ?? rawBirth?.lon
    ?? rawLocation?.longitude
    ?? rawLocation?.lon
    ?? rawPerson?.longitude
    ?? rawPerson?.lon,
    DEFAULT_LOCATION.longitude,
  );
  const latitude = num(
    rawBirth?.latitude
    ?? rawBirth?.lat
    ?? rawLocation?.latitude
    ?? rawLocation?.lat
    ?? rawPerson?.latitude
    ?? rawPerson?.lat,
    DEFAULT_LOCATION.latitude,
  );

  const timezone = String(
    rawBirth?.timezone
    || rawLocation?.timezone
    || rawPerson?.timezone
    || DEFAULT_LOCATION.timezone,
  ).trim() || DEFAULT_LOCATION.timezone;

  const timezoneOffsetHours = parseTimezoneOffsetHours(timezone);
  const standardMeridian = Number.isFinite(timezoneOffsetHours)
    ? timezoneOffsetHours * 15
    : DEFAULT_LOCATION.standardMeridian;

  const name = normalizeName(
    rawBirth?.birthPlace
    || rawBirth?.place
    || rawLocation?.name
    || rawPerson?.birthPlace
    || rawPerson?.place
    || DEFAULT_LOCATION.name,
    DEFAULT_LOCATION.name,
  );

  return {
    name,
    latitude,
    longitude,
    timezone,
    standardMeridian,
  };
}

/**
 * 입력을 양력 KST 벽시계 한 덩어리로 정규화한다.
 *
 * 🔴 음력 입력의 양력 환산도 코어가 한다. lunar-javascript 는 **중국 표준시 기준 중국 음력**이라
 * 표본 4,860건 중 180건(3.70%)에서 하루 어긋나고(실측 2026-08-27), 그 하루가 네 기둥을 통째로 옮긴다.
 */
function resolveSolarBirth(birth) {
  if (birth.calendarType === "solar") {
    return { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, minute: birth.minute, second: 0 };
  }
  const converted = lunarToSolar(birth.year, birth.month, birth.day, birth.calendarType === "lunar_leap");
  if (!converted) {
    // normalizeBirthPayload 가 1900~2100 으로 자르므로, 여기 오는 것은 그 해에 없는 음력 날짜다.
    // 조용히 중국 음력으로 떨어지지 않는다.
    const error = new Error(`korean-calendar core cannot convert lunar ${birth.year}-${birth.month}-${birth.day}`);
    error.code = "INVALID_BIRTH_DATE";
    throw error;
  }
  return { year: converted.year, month: converted.month, day: converted.day, hour: birth.hour, minute: birth.minute, second: 0 };
}

/**
 * 율리우스일(UT). 벽시계를 그대로 넣는다 — 예전에 실려 나가던 `Solar.getJulianDay()` 와 같은 관례다
 * (그 값도 타임존을 안 봤다). 1900~2100 은 전부 그레고리력이라 분기가 없다.
 */
function julianDayFromWallClock(at) {
  const millis = Date.UTC(at.year, at.month - 1, at.day, at.hour, at.minute, at.second || 0);
  return millis / 86400000 + 2440587.5;
}

export function normalizeBirthPayload(rawBirth = {}, rawPerson = {}) {
  const dateParts = parseBirthDateParts(rawBirth.birthDate || rawBirth.date || rawBirth.solarDate || rawBirth.birthday || "");
  const timeParts = parseBirthTimeParts(rawBirth.birthTime || rawBirth.time || "");
  let calendarType = normalizeCalendarType(rawBirth.calendarType || rawBirth.calendar || rawBirth.type || rawPerson.calendarType);
  const isLeapMonthInput = rawBirth.isLeapMonth ?? rawBirth.leapMonth ?? rawBirth.isLeap;
  const isLeapMonth = isLeapMonthInput === true
    || String(isLeapMonthInput || "").trim().toLowerCase() === "true"
    || String(isLeapMonthInput || "").trim() === "1";
  if (calendarType === "lunar" && isLeapMonth) {
    calendarType = "lunar_leap";
  }

  const hasNumericHour = Number.isFinite(Number(rawBirth.hour));
  const hasNumericMinute = Number.isFinite(Number(rawBirth.minute));
  const hasTimeInput = Boolean(timeParts) || hasNumericHour || hasNumericMinute;
  const birthTimeKnown = rawBirth.birthTimeKnown !== false;
  const unknownTime = Boolean(rawBirth.unknownTime) || !birthTimeKnown || !hasTimeInput;

  const normalized = {
    calendarType,
    year: clampInt(rawBirth.year ?? dateParts?.year, 1900, 2100),
    month: clampInt(rawBirth.month ?? dateParts?.month, 1, 12),
    day: clampInt(rawBirth.day ?? dateParts?.day, 1, 31),
    hour: clampInt(rawBirth.hour ?? timeParts?.hour, 0, 23),
    minute: clampInt(rawBirth.minute ?? timeParts?.minute, 0, 59),
    unknownTime,
    birthTimeKnown: !unknownTime,
    gender: normalizeGender(rawPerson?.gender ?? rawBirth?.gender),
    birthPlace: normalizeName(rawBirth?.birthPlace || rawBirth?.place || rawPerson?.birthPlace || DEFAULT_LOCATION.name, DEFAULT_LOCATION.name),
    timezone: String(rawBirth?.timezone || rawPerson?.timezone || DEFAULT_LOCATION.timezone).trim() || DEFAULT_LOCATION.timezone,
    isLeapMonth: calendarType === "lunar_leap",
  };

  if (normalized.unknownTime) {
    normalized.hour = 12;
    normalized.minute = 0;
  }
  return normalized;
}

function stemElement(stem) {
  return STEM_META[stem]?.element || "earth";
}

function stemYinYang(stem) {
  return STEM_META[stem]?.yinYang || "yang";
}

function branchElement(branch) {
  return BRANCH_META[branch]?.element || "earth";
}

function branchHiddenStems(branch) {
  return Array.isArray(BRANCH_META[branch]?.hiddenStems) ? BRANCH_META[branch].hiddenStems : [];
}

function safePercent(value, total) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function buildElementScores(pillars, includeHour) {
  const scores = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

  const keys = includeHour ? ["year", "month", "day", "hour"] : ["year", "month", "day"];
  for (const key of keys) {
    const pillar = pillars[key];
    if (!pillar) continue;

    const stemEl = stemElement(pillar.stem);
    scores[stemEl] += 1;

    const branchEl = branchElement(pillar.branch);
    scores[branchEl] += 0.85;

    const hidden = branchHiddenStems(pillar.branch);
    for (const hiddenStem of hidden) {
      scores[stemElement(hiddenStem)] += 0.45;
    }
  }

  const total = ELEMENT_ORDER.reduce((acc, key) => acc + scores[key], 0);
  const percentages = ELEMENT_ORDER.reduce((acc, key) => {
    acc[key] = safePercent(scores[key], total);
    return acc;
  }, {});

  const sorted = ELEMENT_ORDER
    .map((key) => ({ key, score: scores[key] }))
    .sort((a, b) => b.score - a.score);

  const strongest = sorted[0]?.key || "earth";
  const weakest = sorted[sorted.length - 1]?.key || "earth";
  const lacking = sorted.filter((item) => item.score <= 1.35).map((item) => item.key);

  return {
    scores,
    percentages,
    strongest,
    weakest,
    lacking,
  };
}

function elementRelation(fromElement, toElement) {
  if (fromElement === toElement) return "same";
  if (GENERATE_TO[fromElement] === toElement) return "generates";
  if (GENERATE_TO[toElement] === fromElement) return "generated_by";
  if (CONTROL_TO[fromElement] === toElement) return "controls";
  if (CONTROL_TO[toElement] === fromElement) return "controlled_by";
  return "neutral";
}

function tenGodByStem(dayStem, targetStem) {
  const dayEl = stemElement(dayStem);
  const targetEl = stemElement(targetStem);
  const dayPolarity = stemYinYang(dayStem);
  const targetPolarity = stemYinYang(targetStem);
  const samePolarity = dayPolarity === targetPolarity;
  const relation = elementRelation(dayEl, targetEl);

  if (relation === "same") return samePolarity ? "비견" : "겁재";
  if (relation === "generates") return samePolarity ? "식신" : "상관";
  if (relation === "controls") return samePolarity ? "편재" : "정재";
  if (relation === "controlled_by") return samePolarity ? "편관" : "정관";
  if (relation === "generated_by") return samePolarity ? "편인" : "정인";
  return "비견";
}

function buildTenGodProfile(dayStem, pillars, includeHour) {
  const counters = Object.keys(TEN_GOD_LABELS).reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  const keys = includeHour ? ["year", "month", "day", "hour"] : ["year", "month", "day"];
  for (const key of keys) {
    const pillar = pillars[key];
    if (!pillar) continue;

    const stemGod = tenGodByStem(dayStem, pillar.stem);
    counters[stemGod] += 1;

    const hiddenStems = branchHiddenStems(pillar.branch);
    for (const hiddenStem of hiddenStems) {
      const hiddenGod = tenGodByStem(dayStem, hiddenStem);
      counters[hiddenGod] += 0.4;
    }
  }

  const dominant = Object.entries(counters)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .map(([name, value]) => ({ name, score: Math.round(Number(value) * 10) / 10 }));

  return {
    counts: counters,
    dominant: dominant[0]?.name || "비견",
    ranked: dominant,
  };
}

function elementProducedBy(element) {
  for (const [from, to] of Object.entries(GENERATE_TO)) {
    if (to === element) return from;
  }
  return "earth";
}

function elementControlledBy(element) {
  for (const [from, to] of Object.entries(CONTROL_TO)) {
    if (to === element) return from;
  }
  return "earth";
}

function buildUsefulGods(dayMasterElement, elementScores) {
  const dmScore = Number(elementScores.scores[dayMasterElement] || 0);
  const total = ELEMENT_ORDER.reduce((acc, key) => acc + Number(elementScores.scores[key] || 0), 0);
  const average = total / ELEMENT_ORDER.length;

  let strength = "balanced";
  if (dmScore >= average * 1.25) strength = "strong";
  else if (dmScore <= average * 0.85) strength = "weak";

  if (strength === "strong") {
    const yong = CONTROL_TO[dayMasterElement];
    const hee = [GENERATE_TO[dayMasterElement], yong];
    const gi = [dayMasterElement, elementProducedBy(dayMasterElement)];
    return { yong, hee, gi, strength };
  }

  if (strength === "weak") {
    const yong = elementProducedBy(dayMasterElement);
    const hee = [dayMasterElement, yong];
    const gi = [CONTROL_TO[dayMasterElement], GENERATE_TO[dayMasterElement]];
    return { yong, hee, gi, strength };
  }

  const yong = CONTROL_TO[dayMasterElement];
  return {
    yong,
    hee: [GENERATE_TO[dayMasterElement], elementProducedBy(dayMasterElement)],
    gi: [dayMasterElement],
    strength,
  };
}

function normalizePillar(stem, branch) {
  return {
    stem: String(stem || ""),
    branch: String(branch || ""),
    stemElement: stemElement(stem),
    branchElement: branchElement(branch),
    hiddenStems: branchHiddenStems(branch),
    ganji: `${String(stem || "")}${String(branch || "")}`,
  };
}

function formatDateLabel(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function resolveLunarMonthValue(lunar) {
  if (!lunar || typeof lunar !== "object") return 1;
  const month = Number(lunar.lunarMonth);
  if (!Number.isFinite(month)) return 1;
  return Math.max(1, Math.abs(Math.trunc(month)));
}

function resolveIsLeapMonth(lunar) {
  if (!lunar || typeof lunar !== "object") return false;
  return Boolean(lunar.isLeapMonth);
}

function solarToDateTimeKstString(solar) {
  if (!solar || typeof solar !== "object") return "";
  const y = Number(solar.getYear?.() ?? solar.year ?? 0);
  const m = Number(solar.getMonth?.() ?? solar.month ?? 1);
  const d = Number(solar.getDay?.() ?? solar.day ?? 1);
  const h = Number(solar.getHour?.() ?? solar.hour ?? 0);
  const min = Number(solar.getMinute?.() ?? solar.minute ?? 0);
  const sec = Number(solar.getSecond?.() ?? solar.second ?? 0);
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")} ${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function shiftYmdByDays(year, month, day, dayOffset) {
  const base = Date.UTC(year, month - 1, day, 0, 0, 0);
  const shifted = new Date(base + dayOffset * 86400000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function getDayOfYear(year, month, day) {
  const current = Date.UTC(year, month - 1, day, 0, 0, 0);
  const start = Date.UTC(year, 0, 1, 0, 0, 0);
  return Math.floor((current - start) / 86400000) + 1;
}

function calculateEquationOfTimeMinutes(year, month, day) {
  const n = getDayOfYear(year, month, day);
  const b = (2 * Math.PI * (n - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

export function applyHourPillarTimeCorrection(birth, location, policy) {
  const clockTotalMinutes = birth.hour * 60 + birth.minute;
  const longitudeCorrectionMinutes = (location.longitude - location.standardMeridian) * 4;
  const equationOfTimeMinutes = calculateEquationOfTimeMinutes(birth.year, birth.month, birth.day);

  let correctedTotal = clockTotalMinutes;
  if (policy === HOUR_PILLAR_TIME_POLICIES.LOCAL_MEAN_TIME) {
    correctedTotal = clockTotalMinutes + longitudeCorrectionMinutes;
  } else if (policy === HOUR_PILLAR_TIME_POLICIES.TRUE_SOLAR_TIME) {
    correctedTotal = clockTotalMinutes + longitudeCorrectionMinutes + equationOfTimeMinutes;
  }

  const roundedTotal = Math.round(correctedTotal);
  const dayOffset = Math.floor(roundedTotal / 1440);
  const minuteOfDay = ((roundedTotal % 1440) + 1440) % 1440;
  const correctedHour = Math.floor(minuteOfDay / 60);
  const correctedMinute = minuteOfDay % 60;
  const shiftedDate = shiftYmdByDays(birth.year, birth.month, birth.day, dayOffset);

  return {
    clockTotalMinutes,
    correctedTotal,
    longitudeCorrectionMinutes,
    equationOfTimeMinutes,
    dayOffset,
    correctedYear: shiftedDate.year,
    correctedMonth: shiftedDate.month,
    correctedDay: shiftedDate.day,
    correctedHour,
    correctedMinute,
  };
}

/**
 * 이 엔진의 일변경 정책 → 코어의 야자시 정책.
 *
 * 🔴 예전에는 lunar-javascript 의 sect 로 갈랐다(sect 1 = 23시대 익일 일진, sect 2 = 당일).
 * 코어의 두 정책과 **1:1** 로 대응하고, 실측 2026-08-28(표본 18,090건, 1900~2100)에서
 * sect2↔keep-day · sect1↔shift-day 가 23시대 포함 **전건 일치**했다. 그래서 이 이관은
 * 이 파일의 값을 하나도 움직이지 않는다.
 * 🔴 시주는 여기서 안 나온다 — getHourBranchByClock + getHourStemByDayStem 이 일간에서 파생한다.
 */
function nightZiPolicyForDayChange(dayPolicy) {
  return dayPolicy === DAY_CHANGE_POLICIES.LATE_ZI_NEXT_DAY || dayPolicy === DAY_CHANGE_POLICIES.TRUE_SOLAR_ZI_NEXT_DAY
    ? NIGHT_ZI_POLICY.SHIFT_DAY
    : NIGHT_ZI_POLICY.KEEP_DAY;
}

/** 코어 일주(한자). 지원 범위 밖이면 던진다 — 조용히 CST 달력으로 떨어지지 않는다. */
function coreDayPillar(at, dayPolicy) {
  const core = ganji(at, { nightZiPolicy: nightZiPolicyForDayChange(dayPolicy) });
  if (!core) {
    throw new Error(`korean-calendar core returned no ganji for ${at.year}-${at.month}-${at.day}`);
  }
  return { stem: STEM_HANJA[core.day.stemIndex], branch: BRANCH_HANJA[core.day.branchIndex] };
}

export function getHourBranchByClock(hour) {
  const idx = Math.floor((hour + 1) / 2) % 12;
  return BRANCHES[idx < 0 ? idx + 12 : idx];
}

export function getHourStemByDayStem(dayStem, hourBranch) {
  const baseStemIndex = DAY_STEM_TO_ZI_HOUR_STEM_INDEX[dayStem];
  if (!Number.isFinite(baseStemIndex)) return "";
  const hourBranchIndex = BRANCHES.indexOf(hourBranch);
  if (hourBranchIndex < 0) return "";
  return STEMS[(baseStemIndex + hourBranchIndex) % 10];
}

/**
 * 節 12개의 이 파일 정본 표기. 코어 nodeTerms 의 순서(소한 0 … 대설 11)와 같은 자리다.
 * 🔴 코어의 TERM_NAME_HANJA 는 번체(驚蟄·淸明·芒種)인데 이 파일의 정본은 SOLAR_TERM_NAME_MAP 의
 * 간체(惊蛰·清明·芒种)다. 표기를 코어 쪽으로 바꾸면 응답을 이름으로 찾는 쪽이 조용히 못 찾는다.
 */
const CORE_NODE_TERM_ALIASES = Object.freeze([
  "XIAO_HAN", "LI_CHUN", "JING_ZHE", "QING_MING", "LI_XIA", "MANG_ZHONG",
  "XIAO_SHU", "LI_QIU", "BAI_LU", "HAN_LU", "LI_DONG", "DA_XUE",
]);
const CORE_NODE_TERM_NAMES = Object.freeze(CORE_NODE_TERM_ALIASES.map((alias) => SOLAR_TERM_NAME_MAP[alias]));

const KST_OFFSET_MS = 9 * 3600 * 1000;

/** KST 벽시계 → 순간(ms). 코어의 절기표도 출생 시각도 전부 KST 벽시계다. */
function kstWallToMs(year, month, day, hour, minute) {
  return Date.UTC(year, month - 1, day, hour, minute, 0) - KST_OFFSET_MS;
}

function coreNodeTermSummary(node) {
  if (!node) return null;
  return {
    name: CORE_NODE_TERM_NAMES[node.index / 2],
    dateTimeKst: formatDateLabel(node.year, node.month, node.day)
      + ` ${String(node.hour).padStart(2, "0")}:${String(node.minute).padStart(2, "0")}:00`,
    ms: kstWallToMs(node.year, node.month, node.day, node.hour, node.minute),
  };
}

/**
 * 그 시각을 감싸는 節 두 개. 앞뒤 해를 함께 펼치는 이유는 소한(1월 초)과 대설(12월 초) 바깥의
 * 구간이 각각 전년 대설·익년 소한에 걸리기 때문이다.
 */
function coreNodeTermWindow(birthParts) {
  const birthMs = kstWallToMs(birthParts.year, birthParts.month, birthParts.day, birthParts.hour, birthParts.minute);
  let previous = null;
  let next = null;
  for (const year of [birthParts.year - 1, birthParts.year, birthParts.year + 1]) {
    for (const node of nodeTerms(year) || []) {
      const ms = kstWallToMs(node.year, node.month, node.day, node.hour, node.minute);
      if (ms <= birthMs) previous = node;
      else if (!next) next = node;
    }
  }
  return { previous: coreNodeTermSummary(previous), next: coreNodeTermSummary(next), birthMs };
}

/**
 * 코어 daeun() 이 못 도는 경우(성별 미상 등)의 대운 목록.
 * 🔴 나이는 코어와 **같은 축(세는 나이, 1부터)** 이어야 한다 — 예전에는 여기만 0부터의
 * 소수 나이라 성별을 아는 응답과 모르는 응답이 서로 다른 축을 냈다.
 */
function fallbackDaewoonList(monthGanji, direction, startAge, startYear) {
  const monthIndex = SEXAGENARY_CYCLE.indexOf(monthGanji);
  if (monthIndex < 0) return [];
  const step = direction === "BACKWARD" ? -1 : 1;
  return Array.from({ length: 10 }, (_, idx) => {
    const cycleIndex = (monthIndex + step * (idx + 1) + 6000) % 60;
    const rowStartAge = startAge + idx * 10;
    const rowStartYear = Number.isFinite(startYear) ? startYear + idx * 10 : undefined;
    return {
      index: idx + 1,
      pillar: SEXAGENARY_CYCLE[cycleIndex],
      startAgeDecimal: rowStartAge,
      endAgeDecimal: rowStartAge + 9.999,
      startAgeDisplay: `${rowStartAge}세`,
      endAgeDisplay: `${rowStartAge + 9}세`,
      estimatedStartYear: rowStartYear,
      estimatedEndYear: rowStartYear === undefined ? undefined : rowStartYear + 9,
    };
  });
}

/**
 * 입운까지의 경과 시간(년·월)으로 **세는 나이**와 입운 연도를 낸다.
 * 코어 daeun() 이 돌면 그쪽 `cycles[1]` 이 정본이고, 이 함수는 그것이 없을 때만 쓴다.
 * 코어와 같은 관례다 — 입운 연도 − 출생 연도 + 1.
 */
function countingStartAgeFrom(birthMoment, birthYear, elapsedYears, elapsedMonths) {
  const baseYear = Number(birthMoment?.year) || Number(birthYear) || 0;
  const baseMonth = Number(birthMoment?.month) || 1;
  const monthIndex = (baseMonth - 1) + elapsedYears * 12 + elapsedMonths;
  const entryYear = baseYear + Math.floor(monthIndex / 12);
  return { startAge: entryYear - baseYear + 1, startYear: entryYear };
}

/**
 * 대운. 🔴 **간지는 코어 월주에서 파생하고, 순역·나이 관례는 코어 daeun() 이 낸다.**
 *
 * 코어의 daeun() 은 lunar-javascript `getYun()` 의 sect 1 계산을 **그대로 재현**한 것이고
 * (가드가 잔차 0 으로 매번 다시 증명한다 — verify:daeun-korean-calendar 검사 ①),
 * 바뀌는 것은 節을 어느 나라 시간으로 잡느냐 하나다. 예전에는 생시는 KST 벽시계인데
 * 절기는 CST 벽시계라 두 축이 60분 어긋난 채로 시진을 셌다.
 *
 * 🔴 **나이 축은 하나다 — 세는 나이(1부터).** 코어 daeun() 이 내는 축이고,
 * `list[].startAgeDisplay` · legacy `daewoon[].startAge` · AI 프롬프트(saju-ai-prompt.js
 * buildLuckRow) · 어드민이 전부 이 축을 읽는다. 예전에는 이 함수가 diffMinutes 로 0부터의
 * 소수 나이를 따로 계산해 `displayText` 에 실어서 한 응답 안에 두 축이 섞여 나갔다
 * (실측 2026-08-28, 1960~2020 13,176표본 전건 1년 47.9% · 2년 52.1% 차).
 *
 * 🔴 입운까지의 **경과 시간**(3일=1년 관례)은 나이가 아니라서 `entryElapsed` 로 따로 둔다.
 * 그 값도 코어의 daeun().start 에서 온다 — 여기서 다시 계산하지 않는다.
 */
function buildDaewoonFromCore(birthMoment, yearStem, gender, termWindow, birthYear, monthPillarGanji, startAgeYearsDecimal) {
  const isMale = gender === "M";
  const isFemale = gender === "F";
  const yearIsYang = YANG_STEMS.has(yearStem);

  let direction = "FORWARD";
  if (isMale || isFemale) {
    const forward = (isMale && yearIsYang) || (isFemale && !yearIsYang);
    direction = forward ? "FORWARD" : "BACKWARD";
  }

  const referenceTerm = direction === "FORWARD" ? termWindow.next : termWindow.previous;

  // 🔴 두 값 모두 KST 순간이다. 예전에는 CST 벽시계인 절기와 KST 벽시계인 생시를 그대로 빼서
  // 기운 나이가 최대 60분(≈5일)만큼 어긋났다.
  const diffMinutes = referenceTerm
    ? Math.abs(Math.round((referenceTerm.ms - termWindow.birthMs) / 60000))
    : Math.max(0, Math.round(startAgeYearsDecimal * 365 * 24 * 60 / 3));

  let coreDaeun = null;
  if ((isMale || isFemale) && birthMoment) {
    try {
      coreDaeun = daeun(birthMoment, { gender: isMale ? "M" : "F" });
    } catch (_error) {
      coreDaeun = null;
    }
  }

  let list = [];
  if (coreDaeun) {
    try {
      const cycles = coreDaeun.cycles || [];
      const monthCycleIndex = SEXAGENARY_CYCLE.indexOf(monthPillarGanji);
      const step = direction === "BACKWARD" ? -1 : 1;
      list = cycles
        .map((row) => {
          // 🔴 간지는 코어 월주에서 파생한다 — 그러지 않으면 節 직전 60분 창에서 월주는 코어를
          // 따르는데 대운만 다른 프레임을 따라 갈린다. 0번 칸(미입운)은 간지가 없으므로 뺀다.
          const cycleStep = Number(row?.index);
          if (!Number.isFinite(cycleStep) || cycleStep < 1 || monthCycleIndex < 0) return null;
          const pillar = SEXAGENARY_CYCLE[(monthCycleIndex + step * cycleStep + 6000) % 60];
          if (!pillar) return null;
          const startAge = Number(row.startAge);
          const endAge = Number(row.endAge);
          return {
            index: cycleStep + 1,
            pillar,
            startAgeDecimal: Number.isFinite(startAge) ? startAge : 0,
            endAgeDecimal: Number.isFinite(endAge) ? endAge + 0.999 : 9.999,
            startAgeDisplay: Number.isFinite(startAge) ? `${Math.floor(startAge)}세` : "0세",
            endAgeDisplay: Number.isFinite(endAge) ? `${Math.floor(endAge)}세` : "9세",
            estimatedStartYear: Number(row.startYear),
            estimatedEndYear: Number(row.endYear),
          };
        })
        .filter(Boolean)
        .slice(0, 10);
    } catch (_error) {
      list = [];
    }
  }

  // 🔴 입운까지의 **경과 시간**. 코어가 돌면 그 값이 정본이고(3일=1년 관례로 시진 단위까지
  // 센다), 안 돌면 절기까지의 분 거리로 근사한다. 나이가 아니므로 entryElapsed 로만 나간다.
  let entryElapsed = coreDaeun?.start
    ? { years: coreDaeun.start.years, months: coreDaeun.start.months, days: coreDaeun.start.days }
    : null;
  if (!entryElapsed) {
    const decimal = diffMinutes / (60 * 24 * 3);
    const years = Math.floor(decimal);
    const monthsFloat = (decimal - years) * 12;
    const months = Math.floor(monthsFloat);
    entryElapsed = { years, months, days: Math.max(0, Math.round((monthsFloat - months) * 30)) };
  }

  // 세는 나이. 코어가 돌면 1번 칸(첫 대운)이 정본이다.
  const entryCycle = (coreDaeun?.cycles || []).find((row) => Number(row?.index) === 1) || null;
  const entry = entryCycle && Number.isFinite(Number(entryCycle.startAge))
    ? { startAge: Number(entryCycle.startAge), startYear: Number(entryCycle.startYear) }
    : countingStartAgeFrom(birthMoment, birthYear, entryElapsed.years, entryElapsed.months);

  if (!list.length) {
    list = fallbackDaewoonList(monthPillarGanji, direction, entry.startAge, entry.startYear);
  }

  return {
    direction,
    directionLabel: direction === "FORWARD" ? "순행" : "역행",
    basis: {
      yearStem,
      yearStemYinYang: yearIsYang ? "YANG" : "YIN",
      gender: isMale ? "male" : (isFemale ? "female" : "unknown"),
      rule: "연간 음양 + 성별",
    },
    referenceTerm: {
      type: direction === "FORWARD" ? "NEXT_MAJOR_TERM" : "PREVIOUS_MAJOR_TERM",
      name: referenceTerm?.name || "",
      dateTimeKst: referenceTerm?.dateTimeKst || "",
    },
    diffMinutes,
    // 🔴 나이는 이 둘뿐이고 축은 세는 나이 하나다. list[].startAgeDisplay 와 같은 축이다.
    startAge: entry.startAge,
    startYear: entry.startYear,
    displayText: `${entry.startAge}세(${entry.startYear}년)부터`,
    // 🔴 나이가 아니라 입운까지의 경과 시간이다. 나이로 읽지 말 것.
    entryElapsed,
    list,
  };
}

export function buildSajuProfile(rawPerson) {
  const name = normalizeName(rawPerson?.name, "사용자");
  const gender = normalizeGender(rawPerson?.gender);
  const birth = normalizeBirthPayload(rawPerson?.birth || {}, rawPerson || {});
  const location = resolveBirthLocation(rawPerson?.birth || {}, rawPerson || {});
  const hourPillarTimePolicy = normalizeHourPillarTimePolicy(
    rawPerson?.hourPillarTimePolicy
    || rawPerson?.timeCorrectionPolicy
    || rawPerson?.birth?.hourPillarTimePolicy,
  );
  const dayChangePolicy = normalizeDayChangePolicy(rawPerson?.dayChangePolicy || rawPerson?.birth?.dayChangePolicy);

  const solarClock = resolveSolarBirth(birth);
  // 🔴 표기용 음력도 코어가 낸다. 예전에는 lunar-javascript 의 **중국 음력**을 그대로 실어 보냈다.
  const lunarClock = solarToLunar(solarClock.year, solarClock.month, solarClock.day);
  const lunarMonth = resolveLunarMonthValue(lunarClock);

  const correctedClock = applyHourPillarTimeCorrection(birth, location, hourPillarTimePolicy);
  const correctedSolar = {
    year: correctedClock.correctedYear,
    month: correctedClock.correctedMonth,
    day: correctedClock.correctedDay,
    hour: correctedClock.correctedHour,
    minute: correctedClock.correctedMinute,
    second: 0,
  };

  // 🔴 진태양시 정책만 보정된 시각으로 일진을 잡는다(기존 동작 그대로).
  const dayPillarAt = dayChangePolicy === DAY_CHANGE_POLICIES.TRUE_SOLAR_ZI_NEXT_DAY ? correctedSolar : solarClock;
  const corePillarDay = coreDayPillar(dayPillarAt, dayChangePolicy);

  const includeHour = !birth.unknownTime;
  const dayStem = corePillarDay.stem;
  const dayBranch = corePillarDay.branch;

  let hourStem = "";
  let hourBranch = "";
  if (includeHour) {
    hourBranch = getHourBranchByClock(correctedClock.correctedHour);
    hourStem = getHourStemByDayStem(dayStem, hourBranch);
  }

  // 🔴 년주·월주는 **절기 프레임**이고 그 경계는 코어의 KST 절기표에서만 나온다.
  // 야자시 정책은 일진에만 걸리므로 여기서는 인자를 넘기지 않는다.
  const clockGanji = ganji(solarClock);
  if (!clockGanji) {
    // 생년은 normalizeBirthPayload 가 1900~2100 으로 자르므로 코어 지원 범위 안이다.
    // 여기 오면 표가 깨진 것이지 입력이 이상한 것이 아니다 — 조용히 CST 달력으로 떨어지지 않는다.
    throw new Error(`korean-calendar core returned no ganji for ${solarClock.year}-${solarClock.month}-${solarClock.day}`);
  }

  const pillars = {
    year: normalizePillar(STEM_HANJA[clockGanji.year.stemIndex], BRANCH_HANJA[clockGanji.year.branchIndex]),
    month: normalizePillar(STEM_HANJA[clockGanji.month.stemIndex], BRANCH_HANJA[clockGanji.month.branchIndex]),
    day: normalizePillar(dayStem, dayBranch),
    hour: normalizePillar(hourStem, hourBranch),
  };

  const dayMasterStem = pillars.day.stem;
  const dayMasterElement = stemElement(dayMasterStem);

  const elementProfile = buildElementScores(pillars, includeHour);
  const tenGodProfile = buildTenGodProfile(dayMasterStem, pillars, includeHour);
  const usefulGods = buildUsefulGods(dayMasterElement, elementProfile);

  // 🔴 예전에는 lunar-javascript 의 절기를 그대로 `dateTimeKst` 라는 이름으로 실어 보냈다.
  // 그 값은 CST 벽시계라 이름과 내용이 어긋나 있었다.
  const termWindow = coreNodeTermWindow(solarClock);
  const prevMajorTerm = termWindow.previous;
  const nextMajorTerm = termWindow.next;
  const monthBoundaryTerm = prevMajorTerm;
  // 세차를 연 그 입춘. 코어가 이미 그 해를 판정해 두었으므로 다시 찾지 않는다
  // (節 인덱스 1 = 입춘).
  const ipchunTerm = coreNodeTermSummary((nodeTerms(clockGanji.meta.sexagenaryYear) || [])[1]);

  const daewoon = buildDaewoonFromCore(
    // 🔴 대운은 **보정 전 원본 생시**로 잰다 — 진태양시 보정본을 넣으면 節까지의 거리가
    // 경도 보정만큼 움직여 기운 나이가 달라진다. 셸의 attachKasiDaewunBridge 도 같은 축이다.
    {
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: birth.unknownTime ? 12 : birth.hour,
      minute: birth.unknownTime ? 0 : birth.minute,
    },
    pillars.year.stem,
    gender,
    termWindow,
    solarClock.year,
    pillars.month.ganji,
    0,
  );

  const verificationSource = "LOCAL_FALLBACK";
  const coreResult = {
    input: {
      calendarType: birth.calendarType === "lunar_leap" ? "lunar" : birth.calendarType,
      birthDate: formatDateLabel(birth.year, birth.month, birth.day),
      birthTime: birth.unknownTime ? undefined : `${String(birth.hour).padStart(2, "0")}:${String(birth.minute).padStart(2, "0")}`,
      birthTimeKnown: !birth.unknownTime,
      gender: gender === "M" ? "male" : (gender === "F" ? "female" : "unknown"),
      birthPlace: location.name,
      timezone: birth.timezone || location.timezone || DEFAULT_LOCATION.timezone,
      isLeapMonth: birth.isLeapMonth,
    },
    normalized: {
      solarDateTimeKst: solarToDateTimeKstString(solarClock),
      lunarDate: formatDateLabel(lunarClock?.lunarYear, lunarMonth, lunarClock?.lunarDay),
      isLeapMonth: resolveIsLeapMonth(lunarClock),
      julianDay: julianDayFromWallClock(solarClock),
    },
    location: {
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      standardMeridian: location.standardMeridian,
    },
    timeCorrection: {
      policy: hourPillarTimePolicy,
      clockTimeKst: solarToDateTimeKstString(solarClock),
      longitudeCorrectionMinutes: Math.round(correctedClock.longitudeCorrectionMinutes * 1000) / 1000,
      // 균시차는 TRUE_SOLAR_TIME 일 때만 실제로 더해진다. 안 쓴 값을 그대로 실어 보내면
      // 보정 내역을 읽는 쪽이 적용된 것으로 오해한다(이 착시가 시주 불일치 신고의 원인이었다).
      equationOfTimeMinutes: hourPillarTimePolicy === HOUR_PILLAR_TIME_POLICIES.TRUE_SOLAR_TIME
        ? Math.round(correctedClock.equationOfTimeMinutes * 1000) / 1000
        : 0,
      correctedDateTime: solarToDateTimeKstString(correctedSolar),
    },
    policies: {
      dayChangePolicy,
    },
    pillars: {
      year: pillars.year.ganji,
      month: pillars.month.ganji,
      day: pillars.day.ganji,
      hour: includeHour ? pillars.hour.ganji : undefined,
    },
    solarTerms: {
      previousMajorTerm: {
        name: prevMajorTerm?.name || "",
        dateTimeKst: prevMajorTerm?.dateTimeKst || "",
      },
      nextMajorTerm: {
        name: nextMajorTerm?.name || "",
        dateTimeKst: nextMajorTerm?.dateTimeKst || "",
      },
      monthBoundaryTerm: {
        name: monthBoundaryTerm?.name || "",
        dateTimeKst: monthBoundaryTerm?.dateTimeKst || "",
      },
      ipchun: {
        dateTimeKst: ipchunTerm?.dateTimeKst || "",
      },
    },
    daewoon,
    verification: {
      source: verificationSource,
      kasiCalendarStatus: "SKIPPED",
      kasiIljinStatus: "SKIPPED",
      solarTermStatus: "LOCAL_ONLY",
      calculationPolicyVersion: "saju-core-v2.0.0",
    },
  };

  const legacyDaewoon = Array.isArray(daewoon.list)
    ? daewoon.list.map((item) => ({
      index: item.index,
      ganji: item.pillar,
      startAge: Math.floor(item.startAgeDecimal),
      endAge: Math.floor(item.endAgeDecimal),
      startYear: item.estimatedStartYear,
      endYear: item.estimatedEndYear,
    }))
    : [];

  return {
    name,
    gender,
    birth,
    location,
    hourPillarTimePolicy,
    dayChangePolicy,
    timeCorrection: coreResult.timeCorrection,
    calendar: {
      solarDate: formatDateLabel(solarClock.year, solarClock.month, solarClock.day),
      lunarDate: formatDateLabel(lunarClock?.lunarYear, lunarMonth, lunarClock?.lunarDay),
      isLeapMonth: resolveIsLeapMonth(lunarClock),
      includeHour,
    },
    pillars,
    dayMaster: {
      stem: dayMasterStem,
      stemKo: STEM_META[dayMasterStem]?.ko || dayMasterStem,
      element: dayMasterElement,
      elementKo: ELEMENT_LABELS[dayMasterElement] || "토",
      yinYang: stemYinYang(dayMasterStem),
    },
    fiveElements: elementProfile,
    tenGods: tenGodProfile,
    usefulGods,
    solarTerms: coreResult.solarTerms,
    daewoon: legacyDaewoon,
    daeun: legacyDaewoon,
    sajuCoreResult: coreResult,
    verification: coreResult.verification,
  };
}

function relationLabel(relation) {
  if (relation === "same") return "동기 공명";
  if (relation === "generates") return "상생 추진";
  if (relation === "generated_by") return "상생 수용";
  if (relation === "controls") return "주도 압박";
  if (relation === "controlled_by") return "견인 성장";
  return "중립 파동";
}

function relationScore(relation) {
  if (relation === "same") return 12;
  if (relation === "generates") return 18;
  if (relation === "generated_by") return 14;
  if (relation === "controls") return 8;
  if (relation === "controlled_by") return 6;
  return 10;
}

function roleFromTenGod(tenGodName) {
  if (tenGodName === "비견" || tenGodName === "겁재") return "함께 몰입하는 공동 창작자";
  if (tenGodName === "식신" || tenGodName === "상관") return "분위기를 여는 아이디어 연출가";
  if (tenGodName === "편재" || tenGodName === "정재") return "취향을 실전으로 바꾸는 프로듀서";
  if (tenGodName === "편관" || tenGodName === "정관") return "리듬을 잡아주는 전략 매니저";
  return "감정의 미세 신호를 읽는 공감 큐레이터";
}

function titleByElement(element) {
  if (element === "wood") return "푸른 불씨의 메이커";
  if (element === "fire") return "무대를 밝히는 스파클 엔진";
  if (element === "earth") return "감정을 받쳐주는 안정 궤도";
  if (element === "metal") return "취향 레이저를 맞추는 디렉터";
  return "무드 파도를 읽는 공명 파수꾼";
}

function normalizeThemeKey(rawTheme) {
  const key = String(rawTheme || "moonlight_neon").trim().toLowerCase();
  return DESTINY_BIAS_THEME_PRESETS[key] ? key : "moonlight_neon";
}

/** 오늘의 일진. 정오를 대표 시각으로 쓰므로 야자시 정책과 무관하다(23시대가 아니다). */
function todayDayPillar() {
  const now = new Date();
  const core = ganji({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(), hour: 12, minute: 0 });
  if (!core) return { stem: "", branch: "" };
  return { stem: STEM_HANJA[core.day.stemIndex], branch: BRANCH_HANJA[core.day.branchIndex] };
}

function todayActionGuide(userDayMasterStem, biasDayMasterElement) {
  const today = todayDayPillar();
  const todayStemElement = stemElement(today.stem);
  const flow = elementRelation(todayStemElement, biasDayMasterElement);
  const userTodayTenGod = tenGodByStem(userDayMasterStem, today.stem);

  let action = "오늘은 작은 관찰을 먼저 남기고 대화를 시작해 보세요.";
  if (userTodayTenGod === "식신" || userTodayTenGod === "상관") {
    action = "오늘은 취향을 말로 길게 설명하기보다, 같이 볼 수 있는 짧은 콘텐츠 링크를 보내 보세요.";
  } else if (userTodayTenGod === "편재" || userTodayTenGod === "정재") {
    action = "오늘은 상대가 좋아하는 디테일을 하나 실물로 준비하면 운의 체감이 빨라집니다.";
  } else if (userTodayTenGod === "편관" || userTodayTenGod === "정관") {
    action = "오늘은 일정과 약속의 경계를 분명히 하면 감정 소모를 줄일 수 있습니다.";
  } else if (userTodayTenGod === "편인" || userTodayTenGod === "정인") {
    action = "오늘은 감정 설명보다 한 줄 공감 메모를 먼저 보내는 방식이 유리합니다.";
  }

  return {
    dayGanji: `${today.stem}${today.branch}`,
    dayStemElement: todayStemElement,
    userTodayTenGod,
    flow,
    flowLabel: relationLabel(flow),
    action,
    score: flow === "generates" || flow === "generated_by" ? 10 : (flow === "same" ? 7 : 4),
  };
}

function determineGrade(score) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  return "C";
}

export function buildDestinyBiasAnalysis(userProfile, biasProfile, options = {}) {
  const relation = elementRelation(userProfile.dayMaster.element, biasProfile.dayMaster.element);
  const relationBase = relationScore(relation);

  const userTopElements = [...ELEMENT_ORDER]
    .map((key) => ({ key, score: Number(userProfile.fiveElements.scores[key] || 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.key);

  const biasLacking = Array.isArray(biasProfile.fiveElements.lacking) ? biasProfile.fiveElements.lacking : [];
  const supplyMatches = biasLacking.filter((element) => userTopElements.includes(element));
  const supplyScore = Math.min(20, supplyMatches.length * 9);

  const yongshinMatched = userTopElements.includes(biasProfile.usefulGods.yong);
  const yongshinScore = yongshinMatched ? 14 : 4;

  const todayGuide = todayActionGuide(userProfile.dayMaster.stem, biasProfile.dayMaster.element);
  const totalScore = Math.max(0, Math.min(100, 42 + relationBase + supplyScore + yongshinScore + todayGuide.score));
  const grade = determineGrade(totalScore);

  const dominantTenGod = userProfile.tenGods?.dominant || "비견";
  const roleTitle = roleFromTenGod(dominantTenGod);
  const titleElement = supplyMatches[0] || userTopElements[0] || userProfile.dayMaster.element;
  const cardTitle = `${titleByElement(titleElement)} · ${roleTitle}`;

  const requestedTheme = normalizeThemeKey(options.themeKey);
  const themePreset = DESTINY_BIAS_THEME_PRESETS[requestedTheme] || DESTINY_BIAS_THEME_PRESETS.moonlight_neon;

  const analysis = {
    relation,
    relationLabel: relationLabel(relation),
    relationScore: relationBase,
    supplyMatches,
    supplyScore,
    yongshinMatched,
    yongshinScore,
    todayGuide,
    totalScore,
    grade,
    card: {
      title: cardTitle,
      headline: `${userProfile.name} → ${biasProfile.name} 운명 공명 ${grade}`,
      summary: `${relationLabel(relation)} 흐름에서 ${ELEMENT_LABELS[titleElement]} 에너지 보완이 핵심입니다. 오늘은 ${todayGuide.userTodayTenGod} 리듬으로 접근해 보세요.`,
      themeKey: themePreset.key,
    },
    role: {
      dominantTenGod,
      title: roleTitle,
      userTopElements,
    },
    sharePayload: {
      title: `${userProfile.name}의 최애운명 카드`,
      subtitle: `${biasProfile.name}와의 공명 등급 ${grade} (${totalScore}점)`,
      hashtags: ["#코드데스티니", "#최애운명", `#${relationLabel(relation).replace(/\s+/g, "")}`],
    },
  };

  return analysis;
}

export function buildDestinyBiasCanonical(userProfile, biasProfile, analysis) {
  return {
    version: "destiny-bias-v1",
    generatedAt: new Date().toISOString(),
    calculationPolicy: {
      mode: "internal_saju_engine",
      aiRole: "interpretation_only",
      includeHourWhenUnknown: false,
    },
    user: userProfile,
    bias: biasProfile,
    analysis,
  };
}

export function buildRuleBasedDestinyReport(canonical) {
  const user = canonical?.user || {};
  const bias = canonical?.bias || {};
  const analysis = canonical?.analysis || {};
  const role = analysis?.role || {};
  const today = analysis?.todayGuide || {};

  const lines = [
    `## 1) 핵심 결론`,
    `${String(user.name || "사용자")}님과 ${String(bias.name || "상대")}님의 최애운명 공명 점수는 ${Number(analysis.totalScore || 0)}점(${String(analysis.grade || "C")})입니다.`,
    `관계 핵심은 ${String(analysis.relationLabel || "중립 파동")}이며, 카드 축은 "${String(analysis.card?.title || "운명 공명")}"으로 잡힙니다.`,
    "",
    `## 2) 사주 근거 요약`,
    `- 나의 일간: ${String(user?.dayMaster?.stemKo || "-")}(${String(user?.dayMaster?.elementKo || "-")})`,
    `- 최애의 일간: ${String(bias?.dayMaster?.stemKo || "-")}(${String(bias?.dayMaster?.elementKo || "-")})`,
    `- 최애 결핍 오행 보완: ${(Array.isArray(analysis.supplyMatches) && analysis.supplyMatches.length)
      ? analysis.supplyMatches.map((item) => ELEMENT_LABELS[item] || item).join(", ")
      : "직접 일치 없음"}`,
    `- 역할 포지션: ${String(role.title || "공감 큐레이터")}`,
    "",
    `## 3) 오늘의 운명 액션`,
    `오늘 일진은 ${String(today.dayGanji || "-")}이며, ${String(today.userTodayTenGod || "비견")} 관점에서 접근하면 좋습니다.`,
    String(today.action || "관찰을 먼저 남기고 대화를 시작해 보세요."),
    "",
    "## 4) 실전 가이드",
    "1. 취향 신호를 하나로 좁혀서 전달하세요. 많은 정보보다 정확한 하나가 공명을 만듭니다.",
    "2. 감정 표현은 길이보다 타이밍이 중요합니다. 오늘은 반응을 먼저 확인한 뒤 깊이를 조절하세요.",
    "3. 관계를 점수로 고정하지 말고, 2주 단위로 대화 리듬을 다시 맞추는 루틴을 유지하세요.",
  ];

  return lines.join("\n");
}

export function resolveThemeGate(themeKey, canUsePremiumTheme) {
  const normalized = normalizeThemeKey(themeKey);
  const preset = DESTINY_BIAS_THEME_PRESETS[normalized] || DESTINY_BIAS_THEME_PRESETS.moonlight_neon;
  if (!preset.premium || canUsePremiumTheme) {
    return {
      resolvedThemeKey: normalized,
      downgraded: false,
      warning: "",
    };
  }

  return {
    resolvedThemeKey: "moonlight_neon",
    downgraded: true,
    warning: "프리미엄 테마는 해금 후 사용 가능합니다. 기본 테마로 자동 전환됩니다.",
  };
}

export function listDestinyBiasThemes() {
  return Object.values(DESTINY_BIAS_THEME_PRESETS).map((theme) => ({
    key: theme.key,
    name: theme.name,
    premium: Boolean(theme.premium),
    palette: theme.palette,
  }));
}
