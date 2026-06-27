import { Lunar, Solar } from "lunar-javascript";

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const ELEMENTS = ["목", "화", "토", "금", "수"];
const STEM_ELEMENT = {
  甲: "목", 乙: "목",
  丙: "화", 丁: "화",
  戊: "토", 己: "토",
  庚: "금", 辛: "금",
  壬: "수", 癸: "수",
};
const STEM_POLARITY = {
  甲: "yang", 丙: "yang", 戊: "yang", 庚: "yang", 壬: "yang",
  乙: "yin", 丁: "yin", 己: "yin", 辛: "yin", 癸: "yin",
};
const BRANCH_ELEMENT = {
  子: "수", 丑: "토", 寅: "목", 卯: "목", 辰: "토", 巳: "화",
  午: "화", 未: "토", 申: "금", 酉: "금", 戌: "토", 亥: "수",
};
const HIDDEN_STEMS = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "戊", "庚"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};
const PRODUCES = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const CONTROLS = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function parseDate(value) {
  const raw = clean(value, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (year < 1900 || year > 2100) return null;
  return { year, month, day };
}

function parseTime(value, fallbackHour = 12) {
  const raw = clean(value, 5);
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return { hour: fallbackHour, minute: 0, valid: false };
  return { hour: Number(match[1]), minute: Number(match[2]), valid: true };
}

function pillarStem(pillar = "") {
  return clean(pillar).slice(0, 1);
}

function pillarBranch(pillar = "") {
  return clean(pillar).slice(1, 2);
}

function emptyElementCounts() {
  return ELEMENTS.reduce((acc, element) => ({ ...acc, [element]: 0 }), {});
}

function addElement(counts, element, weight = 1) {
  if (!element || !Object.prototype.hasOwnProperty.call(counts, element)) return;
  counts[element] = Number((counts[element] + weight).toFixed(2));
}

function tenGodFor(dayStem, targetStem) {
  const dayElement = STEM_ELEMENT[dayStem];
  const targetElement = STEM_ELEMENT[targetStem];
  const samePolarity = STEM_POLARITY[dayStem] === STEM_POLARITY[targetStem];
  if (!dayElement || !targetElement) return "";
  if (targetElement === dayElement) return samePolarity ? "비견" : "겁재";
  if (PRODUCES[dayElement] === targetElement) return samePolarity ? "식신" : "상관";
  if (CONTROLS[dayElement] === targetElement) return samePolarity ? "편재" : "정재";
  if (CONTROLS[targetElement] === dayElement) return samePolarity ? "편관" : "정관";
  if (PRODUCES[targetElement] === dayElement) return samePolarity ? "편인" : "정인";
  return "";
}

function buildTenGodDistribution(dayStem, pillars) {
  const counts = {};
  for (const pillar of pillars.filter(Boolean)) {
    const stem = pillarStem(pillar);
    const branch = pillarBranch(pillar);
    const main = tenGodFor(dayStem, stem);
    if (main) counts[main] = (counts[main] || 0) + 1;
    for (const hidden of HIDDEN_STEMS[branch] || []) {
      const hiddenGod = tenGodFor(dayStem, hidden);
      if (hiddenGod) counts[hiddenGod] = Number(((counts[hiddenGod] || 0) + 0.35).toFixed(2));
    }
  }
  return counts;
}

function buildElementDistribution(pillars) {
  const counts = emptyElementCounts();
  for (const pillar of pillars.filter(Boolean)) {
    addElement(counts, STEM_ELEMENT[pillarStem(pillar)], 1);
    addElement(counts, BRANCH_ELEMENT[pillarBranch(pillar)], 1);
  }
  return counts;
}

function judgeStrength(dayStem, fiveElements) {
  const dayElement = STEM_ELEMENT[dayStem] || "";
  const total = Object.values(fiveElements || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const own = Number(fiveElements?.[dayElement] || 0);
  const ratio = total > 0 ? own / total : 0;
  if (ratio >= 0.34) return "일간의 기운이 강한 편";
  if (ratio <= 0.18) return "일간의 기운이 약한 편";
  return "일간의 기운이 비교적 균형을 이룬 편";
}

function pickBalancingElement(fiveElements) {
  const entries = Object.entries(fiveElements || {}).sort((a, b) => Number(a[1]) - Number(b[1]));
  return entries[0]?.[0] || "";
}

function pickDominantElement(fiveElements) {
  const entries = Object.entries(fiveElements || {}).sort((a, b) => Number(b[1]) - Number(a[1]));
  return entries[0]?.[0] || "";
}

function sexagenaryIndex(pillar) {
  const stem = pillarStem(pillar);
  const branch = pillarBranch(pillar);
  for (let i = 0; i < 60; i += 1) {
    if (STEMS[i % 10] === stem && BRANCHES[i % 12] === branch) return i;
  }
  return -1;
}

function nextPillar(index, offset) {
  const next = (index + offset + 600) % 60;
  return `${STEMS[next % 10]}${BRANCHES[next % 12]}`;
}

function buildMajorLuck({ monthPillar, yearPillar, gender }) {
  const monthIndex = sexagenaryIndex(monthPillar);
  const yearStem = pillarStem(yearPillar);
  if (monthIndex < 0 || !yearStem) return { available: false, reason: "월주 기준 대운 배열을 만들 수 없습니다." };
  const isYangYear = STEM_POLARITY[yearStem] === "yang";
  const normalizedGender = clean(gender).toLowerCase();
  const forward = (normalizedGender === "male" && isYangYear) || (normalizedGender === "female" && !isYangYear);
  const direction = forward ? 1 : -1;
  return {
    available: true,
    direction: forward ? "순행" : "역행",
    startAge: 7,
    note: "절입 시각 정밀 보정 전의 기본 배열입니다.",
    cycles: Array.from({ length: 8 }, (_, index) => ({
      age: 7 + index * 10,
      pillar: nextPillar(monthIndex, direction * (index + 1)),
    })),
  };
}

function buildYearlyLuck(startYear = new Date().getFullYear()) {
  return Array.from({ length: 5 }, (_, index) => {
    const year = Number(startYear) + index;
    const lunar = Solar.fromYmdHms(year, 7, 1, 12, 0, 0).getLunar();
    return {
      year,
      pillar: lunar.getYearInGanZhi(),
    };
  });
}

function buildLunar(inputDate, birthTime, calendarType) {
  if (calendarType === "lunar") {
    return Lunar.fromYmdHms(inputDate.year, inputDate.month, inputDate.day, birthTime.hour, birthTime.minute, 0);
  }
  return Solar.fromYmdHms(inputDate.year, inputDate.month, inputDate.day, birthTime.hour, birthTime.minute, 0).getLunar();
}

export function calculateLifeBookAiSaju(birthInfo = {}) {
  const birthDate = parseDate(birthInfo.birthDate);
  if (!birthDate) {
    const error = new Error("Invalid birth date");
    error.code = "INVALID_BIRTH_DATE";
    throw error;
  }
  const calendarType = clean(birthInfo.calendarType).toLowerCase() === "lunar" ? "lunar" : "solar";
  const timeUnknown = birthInfo.birthTimeUnknown === true || !clean(birthInfo.birthTime);
  const birthTime = parseTime(birthInfo.birthTime, 12);
  if (!timeUnknown && !birthTime.valid) {
    const error = new Error("Invalid birth time");
    error.code = "INVALID_BIRTH_TIME";
    throw error;
  }

  const lunar = buildLunar(birthDate, birthTime, calendarType);
  const solar = lunar.getSolar();
  const yearPillar = lunar.getYearInGanZhi();
  const monthPillar = lunar.getMonthInGanZhi();
  const dayPillar = lunar.getDayInGanZhi();
  const hourPillar = timeUnknown ? "" : lunar.getTimeInGanZhi();
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar].filter(Boolean);
  const dayMaster = pillarStem(dayPillar);
  const fiveElements = buildElementDistribution(pillars);
  const tenGods = buildTenGodDistribution(dayMaster, pillars);
  const usefulElement = pickBalancingElement(fiveElements);
  const dominantElement = pickDominantElement(fiveElements);

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar: hourPillar || undefined,
    dayMaster,
    fiveElements,
    tenGods,
    strength: judgeStrength(dayMaster, fiveElements),
    usefulGod: usefulElement ? `${usefulElement} 기운을 보완 축으로 봅니다.` : "",
    unfavorableGod: dominantElement ? `${dominantElement} 기운이 과해질 때 균형을 살핍니다.` : "",
    majorLuck: buildMajorLuck({ monthPillar, yearPillar, gender: birthInfo.gender }),
    yearlyLuck: buildYearlyLuck(),
    calculationMeta: {
      method: "lunar-javascript-core-pillars",
      sourceCalendarType: calendarType,
      solarDate: solar?.toYmd?.() || "",
      solarDateTime: solar?.toYmdHms?.() || "",
      timeUnknown,
      uncertainty: timeUnknown
        ? "출생시간을 모르는 입력이어서 시주는 제외하고 입력된 정보 기준의 흐름으로 해석합니다."
        : "",
    },
  };
}
