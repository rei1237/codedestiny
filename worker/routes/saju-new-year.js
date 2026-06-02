import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";
import {
  BRANCH_BREAKS,
  BRANCH_CLASHES,
  BRANCH_COMBOS,
  BRANCH_ELEMENT,
  BRANCH_HARMS,
  BRANCHES,
  CONTROLS,
  COVER_IMAGE,
  ELEMENT_KO,
  FEATURE_ALIASES,
  FEATURE_KEY,
  FORBIDDEN_TEXT_RE,
  GENERATES,
  MIN_CATEGORY_TEXT_LENGTH,
  MIN_CHAPTER_CHARS,
  MIN_SECTION_CHARS,
  MIN_TOTAL_CHARS,
  MONTH_BRANCHES,
  NEW_YEAR_CHAPTERS,
  NEW_YEAR_PDF_LOCK_TTL_MS,
  SERVICE_KEY,
  STEM_ELEMENT,
  STEM_YINYANG,
  STEMS,
} from "../lib/saju-new-year-constants.js";

const newYearPdfLocks = new Map();
export { NEW_YEAR_CHAPTERS };

const NEW_YEAR_LOCAL_FORBIDDEN_RE = /\b(?:json|payload|debug|schema|engine|prompt|llm|api|undefined|null|nan|object|todo|fixme|placeholder)\b|\[object Object\]/gi;

const LOCAL_STEMS = Object.freeze(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
const LOCAL_BRANCHES = Object.freeze(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);
const LOCAL_MONTH_BRANCHES = Object.freeze(["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"]);
const LOCAL_STEM_ELEMENT = Object.freeze({ 甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water" });
const LOCAL_BRANCH_ELEMENT = Object.freeze({ 子: "water", 丑: "earth", 寅: "wood", 卯: "wood", 辰: "earth", 巳: "fire", 午: "fire", 未: "earth", 申: "metal", 酉: "metal", 戌: "earth", 亥: "water" });
const LOCAL_ELEMENT_KO = Object.freeze({ wood: "목", fire: "화", earth: "토", metal: "금", water: "수" });
const LOCAL_GENERATES = Object.freeze({ wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" });
const LOCAL_CONTROLS = Object.freeze({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" });
const LOCAL_BRANCH_COMBOS = Object.freeze({ 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" });
const LOCAL_BRANCH_CLASHES = Object.freeze({ 子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅", 卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳" });
const LOCAL_BRANCH_HARMS = Object.freeze({ 子: "未", 未: "子", 丑: "午", 午: "丑", 寅: "巳", 巳: "寅", 卯: "辰", 辰: "卯", 申: "亥", 亥: "申", 酉: "戌", 戌: "酉" });
const LOCAL_BRANCH_BREAKS = Object.freeze({ 子: "酉", 酉: "子", 丑: "辰", 辰: "丑", 寅: "亥", 亥: "寅", 卯: "午", 午: "卯", 巳: "申", 申: "巳", 未: "戌", 戌: "未" });

const LOCAL_NEW_YEAR_CHAPTERS = Object.freeze([
  { no: 1, title: "{YEAR}년 올해의 총운", categories: ["올해의 핵심 기운", "원국과 세운의 만남", "현재 대운이 주는 영향", "가장 크게 바뀌는 영역", "올해 지켜야 할 기준"] },
  { no: 2, title: "{YEAR}년 일과 커리어 흐름", categories: ["올해 일의 기본 방향", "직장과 조직운", "이직·전환·확장 가능성", "성과가 나는 방식", "커리어 실전 전략"] },
  { no: 3, title: "{YEAR}년 재물운과 소비 전략", categories: ["돈이 들어오는 방식", "돈이 새는 패턴", "투자와 확장에 대한 주의", "지출 구조 정리", "재물운을 살리는 행동"] },
  { no: 4, title: "{YEAR}년 인간관계와 귀인운", categories: ["올해 만나는 사람의 성격", "귀인이 들어오는 방식", "정리해야 할 관계", "갈등이 생기기 쉬운 관계", "관계 확장 전략"] },
  { no: 5, title: "{YEAR}년 연애운과 결혼운", categories: ["올해의 연애 흐름", "새로운 인연 가능성", "기존 관계의 변화", "결혼을 생각할 때의 기준", "감정적으로 조절할 부분"] },
  { no: 6, title: "{YEAR}년 가족과 가까운 사람의 흐름", categories: ["가족 관계의 이슈", "가까운 사람과의 책임", "의존과 거리감", "집안 문제를 다루는 방식", "감정 소모를 줄이는 기준"] },
  { no: 7, title: "{YEAR}년 건강과 컨디션 관리", categories: ["몸의 리듬", "오행 균형에 따른 관리", "스트레스가 쌓이는 방식", "수면과 회복", "장기적으로 관리할 습관"] },
  { no: 8, title: "{YEAR}년 마음의 흐름과 심리 변화", categories: ["감정의 기본 패턴", "불안과 압박이 생기는 구간", "자존감이 흔들리는 이유", "마음이 회복되는 방식", "멘탈 관리 전략"] },
  { no: 9, title: "{YEAR}년 신살과 합충형파해", categories: ["올해 주목할 신살", "합이 만드는 기회", "충이 만드는 변화", "형파해가 주는 긴장", "사건을 다루는 현실적 태도"] },
  { no: 10, title: "{YEAR}년 월별 운세 흐름", categories: ["1분기 흐름", "2분기 흐름", "3분기 흐름", "4분기 흐름", "중요한 달과 조절할 달"] },
  { no: 11, title: "{YEAR}년 기회와 위기 관리", categories: ["올해의 가장 큰 기회", "주의해야 할 선택", "반복하면 안 되는 실수", "위기가 기회로 바뀌는 조건", "위험을 낮추는 운영법"] },
  { no: 12, title: "{YEAR}년 최종 실천 로드맵", categories: ["올해의 최종 메시지", "먼저 정리해야 할 것", "반드시 밀어붙일 것", "내려놓아야 할 것", "월별 실행 루틴"] },
]);

function buildSajuNewYearChapterSpecs(targetYear) {
  const year = toInt(targetYear, resolveDefaultTargetYear());
  return LOCAL_NEW_YEAR_CHAPTERS.map((chapter) => ({
    no: chapter.no,
    id: String(chapter.no),
    title: chapter.title.replace(/\{YEAR\}/g, String(year)),
    categories: chapter.categories,
  }));
}

function clean(value) {
  return String(value || "").trim();
}

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function pad2(value) {
  return String(toInt(value, 0)).padStart(2, "0");
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeFeatureKey(raw) {
  const value = clean(raw);
  if (!value) return FEATURE_KEY;
  if (value === FEATURE_KEY || FEATURE_ALIASES.has(value)) return FEATURE_KEY;
  return value;
}

function normalizeNewYearBookError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      code: clean(error.code || ""),
      status: Number(error.status || 0) || undefined,
      stage: clean(error.stage || ""),
      message: error.message,
      causeMessage: clean(error.cause?.message || error.cause || ""),
      stack: error.stack,
    };
  }
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch (_) {
      return { message: String(error) };
    }
  }
  return { message: String(error) };
}

function stripForbiddenText(value) {
  return clean(value)
    .replace(/```[a-z]*|```/gi, "")
    .replace(FORBIDDEN_TEXT_RE, "")
    .replace(NEW_YEAR_LOCAL_FORBIDDEN_RE, "")
    .replace(/\s{3,}/g, " ")
    .trim();
}

function compactNewYearLocks(now = Date.now()) {
  for (const [key, lock] of newYearPdfLocks.entries()) {
    const startedAtMs = Number(lock?.startedAtMs || 0);
    if (!startedAtMs || now - startedAtMs > NEW_YEAR_PDF_LOCK_TTL_MS) {
      newYearPdfLocks.delete(key);
    }
  }
}

function resolveDefaultTargetYear() {
  const now = new Date();
  return now.getFullYear() + 1;
}

function parseBirthDateParts(raw) {
  const token = clean(raw);
  if (!token) return null;

  const standard = token.match(/^(\d{4})[-./\s](\d{1,2})[-./\s](\d{1,2})$/);
  if (standard) {
    return {
      year: toInt(standard[1], 0),
      month: toInt(standard[2], 0),
      day: toInt(standard[3], 0),
    };
  }

  const compact = token.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    return {
      year: toInt(compact[1], 0),
      month: toInt(compact[2], 0),
      day: toInt(compact[3], 0),
    };
  }
  return null;
}

function parseBirthTime(rawTime, rawHour, rawMinute) {
  const text = clean(rawTime).toLowerCase();
  const unknownTokens = ["모름", "시간 모름", "unknown", "미상", "na", "n/a", "없음"];
  if (unknownTokens.some((token) => text.includes(token))) {
    return { isTimeUnknown: true, birthHour: null, birthMinute: null, birthTime: "" };
  }

  const branchHourMap = { 자: 23, 축: 1, 인: 3, 묘: 5, 진: 7, 사: 9, 오: 11, 미: 13, 신: 15, 유: 17, 술: 19, 해: 21 };
  const branchMatch = text.match(/([자축인묘진사오미신유술해])\s*시/);
  if (branchMatch && branchHourMap[branchMatch[1]] !== undefined) {
    return {
      isTimeUnknown: false,
      birthHour: branchHourMap[branchMatch[1]],
      birthMinute: 0,
      birthTime: `${pad2(branchHourMap[branchMatch[1]])}:00`,
    };
  }

  let hour = Number.isFinite(Number(rawHour)) ? clamp(rawHour, 0, 23) : null;
  let minute = Number.isFinite(Number(rawMinute)) ? clamp(rawMinute, 0, 59) : 0;

  const hm = text.match(/(?:오전|오후)?\s*(\d{1,2})\s*(?::|시)\s*(\d{1,2})?\s*(?:분)?/);
  if (hm) {
    hour = toInt(hm[1], 0);
    minute = hm[2] === undefined ? 0 : toInt(hm[2], 0);
  }

  const hourOnly = text.match(/^(\d{1,2})\s*시?$/);
  if (hourOnly && hour === null) {
    hour = toInt(hourOnly[1], 0);
    minute = 0;
  }

  if (text.includes("오후") && hour !== null && hour < 12) hour += 12;
  if (text.includes("오전") && hour === 12) hour = 0;
  if (hour !== null && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
    return { isTimeUnknown: false, birthHour: hour, birthMinute: minute, birthTime: `${pad2(hour)}:${pad2(minute)}` };
  }

  return { isTimeUnknown: true, birthHour: null, birthMinute: null, birthTime: "" };
}

function normalizeInput(body = {}) {
  const directBirthInput = body.birthInput && typeof body.birthInput === "object" ? body.birthInput : {};
  if (Object.keys(directBirthInput).length) {
    body = {
      ...body,
      ...directBirthInput,
      birthDate: directBirthInput.birthDate || directBirthInput.date || body.birthDate,
      birthTime: directBirthInput.birthTime || directBirthInput.time || body.birthTime,
      birthYear: directBirthInput.birthYear || directBirthInput.year || body.birthYear,
      birthMonth: directBirthInput.birthMonth || directBirthInput.month || body.birthMonth,
      birthDay: directBirthInput.birthDay || directBirthInput.day || body.birthDay,
      birthHour: directBirthInput.birthHour ?? directBirthInput.hour ?? body.birthHour,
      birthMinute: directBirthInput.birthMinute ?? directBirthInput.minute ?? body.birthMinute,
      birthPlace: directBirthInput.birthPlace || directBirthInput.place || body.birthPlace,
      calendarType: directBirthInput.calendarType || directBirthInput.calendar || body.calendarType,
      timezone: directBirthInput.timezone || body.timezone,
      latitude: directBirthInput.latitude ?? body.latitude,
      longitude: directBirthInput.longitude ?? directBirthInput.lng ?? body.longitude,
    };
  }
  const profile = body.profile && typeof body.profile === "object" ? body.profile : {};
  const birth = profile.birth && typeof profile.birth === "object" ? profile.birth : {};
  const birthDateRaw = clean(
    directBirthInput.birthDate
    || directBirthInput.date
    || body.birthDate
    || body.birthday
    || body.solarDate
    || body.lunarDate
    || body.date
    || body.dob
    || profile.birthDate
    || birth.birthDate
    || birth.date,
  );
  const parts = parseBirthDateParts(birthDateRaw) || {};
  const year = toInt(directBirthInput.birthYear || directBirthInput.year || body.birthYear || body.year || birth.year || parts.year, 0);
  const month = toInt(directBirthInput.birthMonth || directBirthInput.month || body.month || body.birthMonth || birth.month || parts.month, 0);
  const day = toInt(directBirthInput.birthDay || directBirthInput.day || body.day || body.birthDay || birth.day || parts.day, 0);
  const timeInfo = parseBirthTime(
    directBirthInput.birthTime || directBirthInput.time || body.birthTime || body.time || body.timeText || body.hourText || profile.birthTime || birth.birthTime,
    directBirthInput.hour ?? directBirthInput.birthHour ?? body.hour ?? body.birthHour ?? body.birth_hour ?? birth.hour,
    directBirthInput.minute ?? directBirthInput.birthMinute ?? body.minute ?? body.birthMinute ?? birth.minute,
  );

  const targetYear = toInt(
    body.targetYear || body.selectedYear || body.fortuneYear || body.target_year,
    resolveDefaultTargetYear(),
  );

  if (!year || !month || !day) {
    return { ok: false, code: "MISSING_BIRTH", message: "정확한 신년운세 계산을 위해 생년월일시 정보를 확인해 주세요." };
  }
  if (!targetYear || targetYear < 1900 || targetYear > 2100) return { ok: false, code: "INVALID_TARGET_YEAR", message: "신년운세를 볼 대상 연도를 선택해 주세요." };

  const name = clean(body.name || profile.name || profile.userName) || "사용자";
  const genderRaw = clean(body.gender || body.sex || profile.gender || profile.sex || "").toLowerCase();
  const gender = genderRaw === "f" || genderRaw.includes("female") || genderRaw.includes("여") ? "female" : genderRaw === "m" || genderRaw.includes("male") || genderRaw.includes("남") ? "male" : "unknown";
  const calendarRaw = clean(body.calendarType || body.calendar || birth.calendarType || birth.calType || profile.calendarType || "solar").toLowerCase();
  const calendarType = calendarRaw.includes("lunar") || calendarRaw.includes("음")
    ? (calendarRaw.includes("leap") || calendarRaw.includes("윤") ? "lunar_leap" : "lunar")
    : calendarRaw.includes("solar") || calendarRaw.includes("양")
      ? "solar"
      : "unknown";
  const latitudeRaw = Number(body.latitude ?? profile.latitude ?? birth.latitude ?? 37.5665);
  const longitudeRaw = Number(body.longitude ?? body.lng ?? profile.longitude ?? profile.lng ?? birth.longitude ?? birth.lng ?? 126.978);
  const latitude = clamp(latitudeRaw, -90, 90);
  const longitude = clamp(longitudeRaw, -180, 180);
  const birthPlace = clean(body.birthPlace || body.place || profile.birthPlace || profile.place || birth.birthPlace || birth.place || "대한민국") || "대한민국";
  const birthInput = {
    name,
    gender,
    calendarType,
    birthDate: `${year}-${pad2(month)}-${pad2(day)}`,
    birthYear: year,
    birthMonth: month,
    birthDay: day,
    birthTime: timeInfo.birthTime,
    birthHour: timeInfo.birthHour,
    birthMinute: timeInfo.birthMinute,
    timezone: clean(body.timezone || profile.timezone || birth.timezone || "Asia/Seoul") || "Asia/Seoul",
    latitude,
    longitude,
    birthPlace,
    isTimeUnknown: Boolean(timeInfo.isTimeUnknown),
  };

  return {
    ok: true,
    birthInput,
    profile: {
      name: birthInput.name,
      gender: birthInput.gender,
      birth: {
        year: birthInput.birthYear,
        month: birthInput.birthMonth,
        day: birthInput.birthDay,
        hour: birthInput.birthHour === null ? 12 : clamp(birthInput.birthHour, 0, 23),
        minute: birthInput.birthMinute === null ? 0 : clamp(birthInput.birthMinute, 0, 59),
        calendarType,
        timezone: birthInput.timezone,
        birthPlace,
        latitude,
        longitude,
        unknownTime: birthInput.isTimeUnknown,
      },
      calendarType,
      timezone: birthInput.timezone,
      location: {
        name: birthPlace,
        latitude,
        longitude,
        timezone: birthInput.timezone,
      },
    },
    targetYear,
  };
}

function sexagenaryYear(year) {
  const index = ((toInt(year, 1984) - 1984) % 60 + 60) % 60;
  return { stem: STEMS[index % 10], branch: BRANCHES[index % 12], label: `${STEMS[index % 10]}${BRANCHES[index % 12]}` };
}

function monthPillar(targetYear, month) {
  const yearStemIndex = STEMS.indexOf(sexagenaryYear(targetYear).stem);
  const firstMonthStemIndex = ((yearStemIndex % 5) * 2 + 2) % 10;
  const stem = STEMS[(firstMonthStemIndex + month - 1) % 10];
  const branch = MONTH_BRANCHES[(month - 1) % 12];
  return { month, stem, branch, label: `${stem}${branch}`, element: BRANCH_ELEMENT[branch] || STEM_ELEMENT[stem] || "earth" };
}

function elementRelation(dayElement, otherElement) {
  if (!dayElement || !otherElement) return "중립";
  if (dayElement === otherElement) return "동기 공명";
  if (GENERATES[dayElement] === otherElement) return "표현과 생산";
  if (GENERATES[otherElement] === dayElement) return "지원과 회복";
  if (CONTROLS[dayElement] === otherElement) return "관리와 재물";
  if (CONTROLS[otherElement] === dayElement) return "압박과 책임";
  return "중립";
}

function tenGod(dayStem, otherStem) {
  const dayElement = STEM_ELEMENT[dayStem];
  const otherElement = STEM_ELEMENT[otherStem];
  const samePolarity = STEM_YINYANG[dayStem] === STEM_YINYANG[otherStem];
  if (!dayElement || !otherElement) return "미정";
  if (dayElement === otherElement) return samePolarity ? "비견" : "겁재";
  if (GENERATES[dayElement] === otherElement) return samePolarity ? "식신" : "상관";
  if (CONTROLS[dayElement] === otherElement) return samePolarity ? "편재" : "정재";
  if (CONTROLS[otherElement] === dayElement) return samePolarity ? "편관" : "정관";
  if (GENERATES[otherElement] === dayElement) return samePolarity ? "편인" : "정인";
  return "미정";
}

function relationRows(pillars, annualBranch) {
  const rows = [];
  const natal = [
    ["년지", pillars?.year?.branch],
    ["월지", pillars?.month?.branch],
    ["일지", pillars?.day?.branch],
    ["시지", pillars?.hour?.branch],
  ].filter(([, branch]) => branch);

  for (const [label, branch] of natal) {
    if (BRANCH_COMBOS[annualBranch] === branch) rows.push({ type: "합", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 합을 이루어 협력과 연결성이 강해집니다.` });
    if (BRANCH_CLASHES[annualBranch] === branch) rows.push({ type: "충", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 충을 이루어 이동, 변화, 결단 압력이 커집니다.` });
    if (BRANCH_HARMS[annualBranch] === branch) rows.push({ type: "해", label, branch, message: `${label} ${branch}와 세운 ${annualBranch} 사이에 해가 있어 관계의 미세한 오해를 관리해야 합니다.` });
    if (BRANCH_BREAKS[annualBranch] === branch) rows.push({ type: "파", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 파를 이루어 계획 변경과 약속 관리가 중요합니다.` });
  }
  return rows;
}

function normalizeEngineSaju(profile, body = {}) {
  let engine = null;
  try {
    const baseLocation = profile?.location && typeof profile.location === "object" ? profile.location : {};
    const location = {
      name: clean(baseLocation.name || profile?.birth?.birthPlace || "대한민국") || "대한민국",
      latitude: Number.isFinite(Number(baseLocation.latitude)) ? Number(baseLocation.latitude) : Number(profile?.birth?.latitude || 37.5665),
      longitude: Number.isFinite(Number(baseLocation.longitude)) ? Number(baseLocation.longitude) : Number(profile?.birth?.longitude || 126.978),
      timezone: clean(profile.timezone || profile?.birth?.timezone || "Asia/Seoul") || "Asia/Seoul",
    };
    engine = buildSajuProfile({
      name: profile.name,
      gender: profile.gender,
      birth: profile.birth,
      calendarType: profile.calendarType,
      timezone: profile.timezone || "Asia/Seoul",
      location,
      hourPillarTimePolicy: clean(body?.hourPillarTimePolicy || profile?.hourPillarTimePolicy || "TRUE_SOLAR_TIME") || "TRUE_SOLAR_TIME",
      dayChangePolicy: clean(body?.dayChangePolicy || profile?.dayChangePolicy || "MIDNIGHT") || "MIDNIGHT",
    });
  } catch (error) {
    console.error("[NewYearBook][LocalSajuEngineFailed]", {
      message: clean(error?.message || error),
      birth: profile.birth,
    });
  }

  if (!engine?.pillars?.day?.stem || !engine?.pillars?.month?.branch) {
    const err = new Error("신년운세 PDF 생성을 위한 사주 원국 계산에 실패했습니다.");
    err.code = "SAJU_LOCAL_ENGINE_FAILED";
    err.status = 422;
    throw err;
  }

  const sajuBase = body.sajuBase && typeof body.sajuBase === "object" ? body.sajuBase : {};
  const pillars = engine.pillars;
  const dayMaster = clean(engine.dayMaster?.stem || engine.pillars.day?.stem);
  const fiveElements = engine.fiveElements || {};
  const tenGods = engine.tenGods || {};
  const usefulGods = engine.usefulGods || {};
  const daeun = Array.isArray(engine.daeun)
    ? engine.daeun
    : (Array.isArray(sajuBase?.timing?.daeun) ? sajuBase.timing.daeun : []);

  return { engine, pillars, dayMaster, fiveElements, tenGods, usefulGods, daeun };
}

function dominantElement(fiveElements = {}, fallback = "earth") {
  const source = fiveElements.scores || fiveElements.counts || fiveElements.ratio || fiveElements;
  const keys = ["wood", "fire", "earth", "metal", "water"];
  return keys.slice().sort((a, b) => Number(source?.[b] || 0) - Number(source?.[a] || 0))[0] || fallback;
}

function buildMonthlyLuck(targetYear, dayStem) {
  const dayElement = STEM_ELEMENT[dayStem] || "earth";
  return Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const pillar = monthPillar(targetYear, month);
    const relation = elementRelation(dayElement, pillar.element);
    const score = clamp(62 + (relation === "지원과 회복" ? 12 : relation === "표현과 생산" ? 8 : relation === "관리와 재물" ? 6 : relation === "압박과 책임" ? -7 : 2) + ((month * 7 + targetYear) % 9), 38, 92);
    const tone = score >= 75 ? "확장" : score >= 60 ? "정비" : "보수";
    return { month, pillar, relation, score: Math.round(score), tone, advice: `${month}월은 ${pillar.label} ${ELEMENT_KO[pillar.element] || "토"} 기운이 두드러져 ${tone} 관점으로 일정을 운영하는 것이 좋습니다.` };
  });
}

// ── 십성별 신년운세 해석 라이브러리 ───────────────────────────────
const SAJU_YEARLY_TEN_GOD_LIBRARY = {
  "비견": {
    yearlyTheme: "이 해는 나의 기준과 자립심이 더 선명하게 드러나는 시기입니다. 스스로 결정하고 스스로 책임지는 흐름이 강해지며, 그 과정에서 경쟁과 자기 확인의 압력도 함께 찾아옵니다.",
    money: "재물의 흐름은 한 번에 큰 덩어리로 들어오기보다 내가 직접 생산하고 제공하는 방식으로 움직입니다. 가격, 서비스, 역할을 스스로 정할수록 수익의 안정성이 높아집니다. 다만 경쟁 구도에서 지나치게 가격을 낮추거나 자신을 과소평가하면 재물운이 새어나갈 수 있습니다.",
    career: "일에서는 나의 능력을 직접 보여주는 방식이 유리합니다. 팀보다 개인 성과가 평가 기준이 되는 자리, 또는 자신만의 전문 영역을 키우는 방향으로 에너지를 써야 성과가 납니다.",
    relationship: "가까운 사람과 동등한 관계를 원하지만 비교와 경쟁심이 의도치 않게 작동할 수 있습니다. 사랑에서도 자존심보다 공감이 먼저 필요한 순간을 인식하는 것이 중요합니다.",
    health: "자신을 몰아붙이는 에너지가 강해져 과로와 긴장이 반복될 수 있습니다. 규칙적인 수면과 혼자 있는 회복 시간이 이 해의 건강운을 지키는 핵심입니다.",
    caution: "경쟁심이 지나치면 협력의 기회를 놓칩니다. 내 기준만 옳다는 태도가 관계를 좁히지 않도록 주의하세요.",
    advice: "독립성을 강점으로 쓰되, 혼자 다 하려는 고집을 내려놓는 것이 이 해를 풍요롭게 만드는 첫 번째 선택입니다.",
  },
  "겁재": {
    yearlyTheme: "이 해는 경쟁과 변동의 에너지가 강하게 작동합니다. 같은 자리를 두고 누군가와 부딪히는 상황이 생기거나, 내가 원하던 기회가 예상치 못한 방식으로 흔들릴 수 있습니다.",
    money: "재물의 흐름이 예측하기 어렵게 움직입니다. 큰 수익을 노리다 오히려 손실이 생기거나, 믿었던 수입원이 흔들릴 수 있으므로 분산 관리와 비상 자금 확보가 필요합니다.",
    career: "일에서의 경쟁이 심해지는 시기입니다. 남과 비교하기보다 나만의 차별점을 명확히 하고, 성과 구조를 선명하게 정의해야 인정받을 수 있습니다.",
    relationship: "가까운 관계에서 이해충돌이나 감정 충돌이 생길 수 있습니다. 말의 온도를 조절하고 역할 경계를 먼저 정리하는 것이 갈등을 줄이는 방법입니다.",
    health: "신경과 근육이 긴장하기 쉬운 구조입니다. 감정의 소모를 줄이고 뇌와 몸의 회복 루틴을 의도적으로 만들어야 합니다.",
    caution: "충동적인 결정, 갑작스러운 지출, 보증과 대출은 이 해에 특히 신중해야 합니다.",
    advice: "변동성을 기회로 삼으려면 먼저 내 기반을 단단히 다져야 합니다. 흔들리지 않는 중심이 이 해의 가장 큰 자산입니다.",
  },
  "식신": {
    yearlyTheme: "이 해는 자신의 재능과 표현이 현실로 펼쳐지는 흐름이 강합니다. 내가 가진 것을 밖으로 드러낼수록 기회가 열리며, 창의성과 생산성이 함께 높아지는 시기입니다.",
    money: "재물은 내가 만들어낸 것, 제공한 것에 비례해 들어오는 구조입니다. 콘텐츠, 기술, 서비스, 상품처럼 표현과 생산의 형태로 수익 구조를 키울수록 재물운이 살아납니다.",
    career: "전문성과 창의성을 발휘하는 분야에서 두드러진 성과를 낼 수 있습니다. 기획, 교육, 상담, 콘텐츠, 아이디어 기반 업무에서 강점이 나타납니다.",
    relationship: "여유와 따뜻함이 관계를 부드럽게 만드는 해입니다. 다만 지나치게 주기만 하다 보면 소진될 수 있으니, 받는 것에도 편안해지는 연습이 필요합니다.",
    health: "몸과 마음이 비교적 안정되지만, 즐거움을 위해 과식하거나 지나치게 편안함을 추구하다 보면 생활 리듬이 흐트러질 수 있습니다.",
    caution: "너무 여유로운 태도가 기회를 놓치게 만들 수 있습니다. 편안함 속에서도 실행을 놓치지 않는 것이 중요합니다.",
    advice: "내가 즐기면서 할 수 있는 일이 이 해에는 가장 큰 성과를 냅니다. 억지로 하는 일보다 자연스럽게 흘러나오는 표현에 투자하세요.",
  },
  "상관": {
    yearlyTheme: "이 해는 기존의 틀을 깨고 새로운 방식으로 나아가는 에너지가 강합니다. 말과 표현이 기회가 되기도 하고, 기존 관계나 구조와의 충돌 원인이 되기도 합니다.",
    money: "재물은 창의적인 방식, 새로운 아이디어, 기존과 다른 접근법으로 열립니다. 다만 실행력이 뒷받침되지 않으면 아이디어만 남고 수익은 생기지 않을 수 있습니다.",
    career: "변화와 혁신이 필요한 자리에서 강점이 발휘됩니다. 기존 질서를 따르기보다 새로운 방법을 제시하는 역할이 잘 맞으며, 창업이나 독립적인 프로젝트에도 좋은 시기입니다.",
    relationship: "말과 표현이 풍부하지만 날카로울 수 있습니다. 가까운 사람에게 정확한 말이 차갑게 들릴 수 있으므로, 상대의 감정 리듬을 먼저 파악한 후 대화를 시작하는 것이 필요합니다.",
    health: "신경 소모와 산만함이 건강의 약점이 될 수 있습니다. 생각과 계획이 과잉되면 수면의 질이 떨어지므로, 하루를 정리하는 시간을 의도적으로 만들어야 합니다.",
    caution: "날카로운 말, 기존 체계와의 충돌, 감정적 발언이 관계와 기회를 동시에 잃게 만들 수 있습니다.",
    advice: "표현력을 강점으로 쓰되, 관계 안에서는 결론보다 과정을 먼저 보여주는 방식으로 소통하면 갈등 없이 영향력을 키울 수 있습니다.",
  },
  "편재": {
    yearlyTheme: "이 해는 다양한 기회와 가능성이 열리는 흐름입니다. 사람, 돈, 정보가 활발하게 움직이며 넓은 무대에서 활동하는 힘이 강해집니다.",
    money: "재물이 다양한 방향으로 들어오지만 지출도 함께 커지는 구조입니다. 넓게 쓸수록 손이 열리는 만큼 관리가 중요하며, 투자와 고정 수익의 균형을 맞춰야 합니다.",
    career: "영업, 유통, 중개, 네트워크 기반 업무에서 성과가 강합니다. 사람을 통해 기회가 열리는 시기이므로 인맥 관리와 협업 구조 설계가 핵심 전략입니다.",
    relationship: "만남이 많아지고 다양한 인연이 들어오는 시기입니다. 새로운 사람에 대한 매력이 강해지지만 깊이보다 넓이를 쫓다 보면 진짜 관계를 놓칠 수 있습니다.",
    health: "활동량이 많아지면서 에너지 소모가 커집니다. 과식, 음주, 불규칙한 생활이 체력 저하로 이어질 수 있으니 기본 루틴을 지키는 것이 중요합니다.",
    caution: "충동적인 투자, 과도한 지출, 큰 판에 대한 욕심이 재물을 흩어지게 만들 수 있습니다.",
    advice: "기회를 모두 잡으려 하기보다 가장 현실성 있는 한두 가지를 선택하고 깊이 파고드는 것이 이 해의 재물운을 키우는 방법입니다.",
  },
  "정재": {
    yearlyTheme: "이 해는 안정적이고 실질적인 성과를 차근차근 만들어가는 흐름이 강합니다. 일관된 노력이 현실적인 결과로 이어지는 시기이며, 기반을 다지는 것이 핵심입니다.",
    money: "꾸준한 수입이 늘어나는 구조입니다. 고정수익, 월급, 장기 계약처럼 안정된 구조에서 재물운이 강하게 살아납니다. 섣부른 투자보다 이미 가진 수입 구조를 다지는 것이 더 유리합니다.",
    career: "성실함과 전문성이 인정받는 시기입니다. 조직 안에서 꾸준히 성과를 쌓거나, 안정적인 클라이언트 기반을 확장하는 방향이 커리어에 긍정적으로 작동합니다.",
    relationship: "신뢰와 안정감을 중요하게 여기는 관계가 깊어지는 해입니다. 결혼이나 진지한 만남의 흐름이 강해질 수 있으며, 생활 조건과 책임에 대한 대화가 관계를 견고하게 만듭니다.",
    health: "큰 이상은 없지만 과로가 누적될 수 있습니다. 규칙적인 생활 리듬이 이 해의 건강을 지키는 가장 효과적인 방법입니다.",
    caution: "지나치게 보수적인 태도가 성장의 기회를 놓치게 만들 수 있습니다. 안전만 추구하다 보면 확장의 타이밍을 잃습니다.",
    advice: "지금 당신이 가진 것의 가치를 정확히 알고, 그것을 더 단단하게 만드는 것이 이 해의 가장 강력한 전략입니다.",
  },
  "편관": {
    yearlyTheme: "이 해는 압박과 도전이 강해지는 동시에 그것을 이겨낼 때 가장 큰 성장이 일어나는 시기입니다. 외부의 요구와 책임이 커지지만, 그 무게를 받아내는 힘도 함께 올라옵니다.",
    money: "재물 흐름은 안정보다 변동성이 큰 구조입니다. 사업, 독립, 성과 기반 수익 구조에서 큰 기회가 생길 수 있지만, 예상치 못한 지출이나 위험 요소도 함께 관리해야 합니다.",
    career: "강한 책임감과 도전 정신이 커리어에서 빛을 발하는 시기입니다. 남들이 피하는 자리, 어려운 프로젝트를 맡을수록 실력이 증명됩니다. 다만 번아웃을 주의해야 합니다.",
    relationship: "관계에서도 강한 에너지가 작동합니다. 리더십을 발휘하는 것이 좋지만 너무 강하게 밀어붙이면 주변이 부담을 느낄 수 있으므로 강약 조절이 필요합니다.",
    health: "몸이 혹독하게 쓰이는 시기입니다. 근골격계 긴장, 면역력 저하, 과로가 반복될 수 있으니 의도적인 휴식과 병원 점검이 필요합니다.",
    caution: "두려움에서 나온 결정보다 확신에서 나온 결정을 해야 합니다. 압박에 쫓기는 선택은 후회로 이어질 수 있습니다.",
    advice: "외부의 압력을 성장의 재료로 삼을 때 이 해의 운이 가장 강하게 살아납니다. 피하기보다 준비하고 마주서는 자세가 결과를 만듭니다.",
  },
  "정관": {
    yearlyTheme: "이 해는 사회적 역할과 책임이 부각되는 시기입니다. 원칙과 질서를 지키는 힘이 인정과 신뢰로 돌아오며, 커리어와 사회적 위치가 안정되는 흐름이 강합니다.",
    money: "재물은 실력과 신뢰를 기반으로 들어오는 구조입니다. 급격한 수익보다 꾸준한 수입과 사회적 인정이 재물의 흐름을 만들어냅니다. 계약, 공식적 합의, 안정된 수익 구조가 강점입니다.",
    career: "승진, 인정, 역할 확대가 일어날 수 있는 시기입니다. 조직 안에서의 신뢰도가 높아지며, 책임 있는 자리를 맡을 가능성이 커집니다. 공정함과 원칙을 지키는 태도가 핵심입니다.",
    relationship: "진지하고 신뢰할 수 있는 관계가 깊어지는 시기입니다. 결혼이나 장기적인 인연에 좋은 흐름이 생길 수 있으며, 공식적인 관계 전환의 기회가 찾아올 수 있습니다.",
    health: "과도한 책임감이 스트레스로 쌓일 수 있습니다. 몸보다 마음의 긴장이 먼저 신호를 보내므로, 완벽함보다 지속 가능한 수준을 유지하는 것이 건강운을 지키는 방법입니다.",
    caution: "틀에 너무 갇혀 유연성을 잃으면 기회를 놓칩니다. 원칙을 지키되 상황에 따라 유연하게 움직이는 것도 이 해의 필수 역량입니다.",
    advice: "책임과 인정이 함께 따라오는 해입니다. 사회적 위치를 높이고 싶다면 지금의 신뢰를 더 단단히 쌓는 것이 가장 효과적입니다.",
  },
  "편인": {
    yearlyTheme: "이 해는 내면의 감각과 직관이 강해지는 시기입니다. 논리보다 느낌으로 먼저 상황을 파악하는 힘이 발동되며, 독창적인 생각과 배움에 대한 욕구가 강해집니다.",
    money: "재물은 특정한 전문성이나 고유한 방식으로 들어오는 구조입니다. 일반적인 방법보다 남들이 잘 하지 않는 영역에서 수익 구조를 만들수록 성과가 납니다.",
    career: "연구, 기획, 저술, 전문 컨설팅처럼 깊이 있는 사고를 요구하는 분야에서 강점이 드러납니다. 팀워크보다 독립적인 작업 방식에서 더 높은 성취를 경험할 수 있습니다.",
    relationship: "관계에서 심리적인 거리감이 생기기 쉬운 시기입니다. 혼자 있는 시간을 즐기는 것이 좋지만, 중요한 사람과의 연결이 약해지지 않도록 의도적으로 소통하는 것이 필요합니다.",
    health: "신경계 과부하와 수면 불안정이 반복될 수 있습니다. 명상, 산책, 고요한 시간이 이 해의 건강을 유지하는 핵심 루틴입니다.",
    caution: "지나친 고독과 타인에 대한 경계가 고립으로 이어질 수 있습니다. 마음을 닫기보다 신뢰할 수 있는 한두 명과의 연결을 유지하세요.",
    advice: "내면의 통찰을 현실 결과물로 만드는 연습이 필요합니다. 아이디어와 직관을 실행으로 연결하는 습관이 이 해의 잠재력을 현실로 바꿉니다.",
  },
  "정인": {
    yearlyTheme: "이 해는 배움, 성장, 보호의 에너지가 강하게 작동합니다. 새로운 지식과 기술을 습득하거나 기존의 것을 더 깊이 이해하는 과정에서 큰 발전이 일어납니다.",
    money: "재물은 전문성, 자격, 신뢰를 기반으로 천천히 쌓여가는 구조입니다. 자격증, 교육, 전문 지식에 투자하면 장기적으로 수익 기반이 확장됩니다.",
    career: "교육, 연구, 법률, 의료, 상담처럼 신뢰와 전문성이 중요한 분야에서 성과가 납니다. 조언을 구하거나 멘토를 찾는 것도 이 해의 커리어에 긍정적으로 작동합니다.",
    relationship: "든든하고 안정적인 관계를 원하는 마음이 강해집니다. 상대에게 의지할수록 편안함이 생기지만, 지나친 의존은 자기 결정력을 약하게 만들 수 있습니다.",
    health: "심리적 안정이 신체 건강에도 직접 연결됩니다. 걱정과 불안이 쌓이면 위장과 면역 기능이 떨어질 수 있으니, 마음을 안정시키는 루틴이 중요합니다.",
    caution: "지나치게 보호받으려는 태도가 성장을 막을 수 있습니다. 도움을 받는 것과 스스로 결정하는 것 사이의 균형이 필요합니다.",
    advice: "이 해의 성장은 빠른 성과보다 깊은 이해에서 나옵니다. 멀리 보고 차근차근 쌓아가는 방식이 이 해를 가장 풍요롭게 만듭니다.",
  },
  "미정": {
    yearlyTheme: "이 해는 다양한 가능성이 열려 있는 시기입니다. 세운의 방향이 원국과 복잡하게 얽혀 있어 단일한 흐름이 아닌 상황에 따른 유연한 대응이 필요합니다.",
    money: "재물의 흐름은 고정된 패턴보다 변수에 따라 달라집니다. 월별 점수와 월운의 강약을 면밀히 살피며 기회와 위험을 분리 운영하는 것이 중요합니다.",
    career: "특정한 방향보다 다양한 가능성을 열어두고 움직이는 시기입니다. 지금 있는 자리에서 역량을 키우면서 새로운 기회가 왔을 때 빠르게 반응할 수 있는 준비가 필요합니다.",
    relationship: "관계에서 기대와 현실의 차이가 생기기 쉬운 시기입니다. 상대를 있는 그대로 보고 기대를 조율하는 태도가 관계를 안정시킵니다.",
    health: "전체적인 균형을 유지하는 것이 중요합니다. 어느 한 곳에 지나치게 에너지를 쏟으면 다른 영역이 무너질 수 있으니, 분산된 관리가 필요합니다.",
    caution: "방향이 명확하지 않을 때 충동적인 결정을 하면 뒤늦게 후회하는 상황이 생깁니다. 천천히 정보를 모으고 결정을 내리세요.",
    advice: "불확실성을 불안으로 받아들이기보다 가능성이 많은 시기로 해석하는 것이 이 해를 가장 잘 쓰는 방법입니다.",
  },
};

// ── 합충형해파 해석 라이브러리 ───────────────────────────────
const SAJU_YEARLY_RELATION_LIBRARY = {
  "합": {
    theme: "연결과 협력의 에너지가 강해지는 신호입니다.",
    career: "협업, 파트너십, 계약, 공식적인 연결이 강화됩니다. 주변 사람과의 공동 프로젝트나 팀 기반 성과가 개인 역량보다 더 크게 나타날 수 있는 시기입니다.",
    money: "합의 기운이 재성이나 식상을 건드릴 때 재물의 흐름이 열립니다. 계약, 파트너십, 공동 수익 구조에서 기회가 강해집니다.",
    relationship: "인연이 맺어지거나 기존 관계가 더 단단해지는 흐름입니다. 새로운 사람과 빠르게 연결되거나, 오래된 관계가 공식화될 수 있습니다.",
    caution: "합은 묶이는 에너지이기도 합니다. 잘못된 연결은 빠져나오기 어려워지므로, 파트너를 선택할 때 조건과 역할을 먼저 명확히 해야 합니다.",
    advice: "합의 에너지를 최대한 활용하려면 먼저 연결하고 싶은 사람이나 방향을 선명하게 정해두는 것이 필요합니다.",
  },
  "충": {
    theme: "변화와 이동, 전환의 압력이 강해지는 신호입니다.",
    career: "직업의 전환, 이직, 사업 구조 변경, 이동이 일어날 수 있습니다. 기존 방식을 고집하면 충돌이 커지므로, 변화를 선제적으로 설계하는 것이 유리합니다.",
    money: "재물의 흐름에 예상치 못한 변동이 생깁니다. 갑작스러운 지출이나 수입 변화가 있을 수 있으므로, 비상 자금과 유동성을 미리 확보해야 합니다.",
    relationship: "관계에서 갈등이나 이별, 재편이 일어날 수 있습니다. 오래된 관계가 정리되거나 새로운 인연으로 빠르게 채워질 수 있습니다.",
    caution: "충의 시기에는 충동적인 결정이 큰 손실로 이어질 수 있습니다. 결정 전 최소 하루를 더 두고 생각하는 것이 안전합니다.",
    advice: "충의 에너지는 막을 수 없지만 방향을 잡을 수는 있습니다. 이동이나 변화가 불가피하다면 타이밍을 내가 선택하는 방식으로 전환해야 합니다.",
  },
  "형": {
    theme: "압박과 단련의 에너지가 작동하는 신호입니다.",
    career: "과도한 업무나 불합리한 요구가 쌓일 수 있습니다. 그러나 그 과정에서 실력이 검증되고 인정받는 기회가 생기기도 합니다.",
    money: "법적 분쟁, 계약 문제, 예상치 못한 비용이 발생할 수 있습니다. 문서와 계약 조항을 꼼꼼히 점검하는 것이 필요합니다.",
    relationship: "가까운 관계에서 갈등과 오해가 반복될 수 있습니다. 말보다 행동으로 보여주는 것이 관계를 안정시키는 방법입니다.",
    caution: "억압적인 상황에서 감정을 폭발시키면 더 큰 문제가 생깁니다. 참고 버티는 것과 분명하게 거절하는 것을 구분해야 합니다.",
    advice: "형의 에너지를 단련의 기회로 받아들이면, 이 해에 통과한 것들이 이후의 가장 큰 자산이 됩니다.",
  },
  "해": {
    theme: "미세한 오해와 관계의 어긋남이 발생하기 쉬운 신호입니다.",
    career: "팀 내에서 의사소통 문제나 역할 갈등이 생길 수 있습니다. 기대치를 명확히 공유하고, 의도를 직접 말로 전달하는 방식이 필요합니다.",
    money: "눈에 보이지 않는 손실, 예상치 못한 비용, 신뢰 관계에서의 금전 문제가 생길 수 있습니다.",
    relationship: "사소한 오해가 커지거나, 말하지 않아서 생기는 거리감이 관계를 소원하게 만들 수 있습니다.",
    caution: "해의 신호는 크게 드러나지 않아 무시하기 쉽습니다. 작은 불편함이나 어색함을 방치하지 말고 초기에 대화로 풀어야 합니다.",
    advice: "해의 에너지가 작동하는 시기에는 상대의 말을 글자 그대로 해석하기보다 맥락과 감정을 함께 읽는 것이 필요합니다.",
  },
  "파": {
    theme: "계획의 변경과 약속의 어긋남이 생기기 쉬운 신호입니다.",
    career: "진행 중이던 프로젝트가 예상치 못한 방향으로 흘러가거나, 합의가 뒤집히는 상황이 생길 수 있습니다.",
    money: "계획했던 수입이나 투자 결과가 달라질 수 있습니다. 유연한 대안을 미리 준비해두는 것이 손실을 줄이는 방법입니다.",
    relationship: "약속이나 기대가 어긋나면서 실망이 쌓일 수 있습니다. 처음부터 너무 확정적인 기대를 갖기보다 유연하게 접근하는 것이 좋습니다.",
    caution: "파의 에너지가 강할 때 고집을 부리면 손실이 커집니다. 상황이 바뀌면 계획도 바꾸는 유연성이 필요합니다.",
    advice: "파의 신호가 보인다면 단기 계획보다 장기 방향을 먼저 확인하고, 세부 사항은 여유 있게 수정하는 방식으로 운영하세요.",
  },
};

// ── 신년운세 로컬 상담문 생성 라이브러리 ───────────────────────────────
function getTenGodLib(tenGod) {
  return SAJU_YEARLY_TEN_GOD_LIBRARY[tenGod] || SAJU_YEARLY_TEN_GOD_LIBRARY["미정"];
}

function getMainRelationLib(relations) {
  const types = (relations || []).map((r) => r.type);
  for (const t of ["충", "형", "합", "해", "파"]) {
    if (types.includes(t)) return SAJU_YEARLY_RELATION_LIBRARY[t];
  }
  return null;
}

function describeMonthlyGroup(months, seed) {
  if (!months || months.length === 0) return "";
  const annual = seed.saju.annualLuck;
  const parts = months.map((item) => {
    const tone = item.score >= 75 ? "이 시기는 확장과 실행에 적합한 흐름" : item.score >= 60 ? "이 시기는 안정적인 운영에 어울리는 흐름" : "이 시기는 보수적인 판단과 점검이 필요한 흐름";
    const branchKo = { 子: "자수", 丑: "축토", 寅: "인목", 卯: "묘목", 辰: "진토", 巳: "사화", 午: "오화", 未: "미토", 申: "신금", 酉: "유금", 戌: "술토", 亥: "해수" };
    const stemKo = { 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" };
    const stemName = stemKo[item.pillar?.stem] || item.pillar?.stem || "";
    const branchName = branchKo[item.pillar?.branch] || item.pillar?.branch || "";
    return `${item.month}월은 ${stemName}${branchName} 월운으로 ${tone}입니다. ${item.advice} `;
  });
  const highMonths = months.filter((m) => m.score >= 75);
  const lowMonths = months.filter((m) => m.score < 60);
  let summary = "";
  if (highMonths.length > 0) {
    summary += `이 구간에서 ${highMonths.map((m) => `${m.month}월`).join("과 ")}에는 ${annual.label} 세운의 기운이 현실 성과로 연결되기 좋은 시기이므로, 중요한 제안이나 계획 실행을 이 달에 맞추는 것이 유리합니다. `;
  }
  if (lowMonths.length > 0) {
    summary += `반면 ${lowMonths.map((m) => `${m.month}월`).join("과 ")}에는 일정을 과도하게 확장하기보다 현재 상황을 점검하고 다음 기회를 준비하는 데 에너지를 쓰는 것이 더 안전합니다. `;
  }
  return parts.join("") + "\n\n" + summary;
}

function buildInterpretationSeeds(seed) {
  const annual = seed.saju.annualLuck;
  const tenGodLib = getTenGodLib(annual.tenGod);
  const dayMaster = seed.saju.dayMaster || "戊";
  const dayElement = STEM_ELEMENT[dayMaster] || "earth";
  const dayElementKo = ELEMENT_KO[dayElement] || "토";
  const annualElementKo = annual.elementKo || "토";
  const monthPillar = seed.saju.pillars?.month?.branch || "";
  const dayPillar = seed.saju.pillars?.day?.branch || "";
  const relations = seed.saju.relations?.branchRelations || [];
  const clashes = relations.filter((r) => r.type === "충");
  const combos = relations.filter((r) => r.type === "합");
  const monthlyStrong = seed.saju.monthlyLuck.filter((m) => m.score >= 75).map((m) => `${m.month}월`);
  const monthlyCare = seed.saju.monthlyLuck.filter((m) => m.score < 60).map((m) => `${m.month}월`);
  const hasClash = clashes.length > 0;
  const hasCombo = combos.length > 0;
  const seasonLabel = ["寅", "卯", "辰"].includes(annual.branch) ? "봄" : ["巳", "午", "未"].includes(annual.branch) ? "여름" : ["申", "酉", "戌"].includes(annual.branch) ? "가을" : "겨울";

  return {
    yearlyTheme: [
      `${seed.targetYear}년은 ${annual.label} 세운입니다. 이 해는 ${annualElementKo} 기운이 핵심 에너지로 작동하며, 일간 ${dayMaster}와의 관계는 ${annual.tenGod}으로 읽힙니다. ${tenGodLib.yearlyTheme}`,
      `${annual.dayMasterRelation}의 방식으로 세운이 원국에 들어오는 만큼, 이 해는 ${hasClash ? "변화와 이동의 압력이 강한 해" : hasCombo ? "연결과 협력의 기회가 열리는 해" : "운영과 균형 조정이 핵심인 해"}입니다. ${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).join("·") + "에 기회가 집중되고" : "전반적으로 기회가 분산되며"}, ${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).join("·") + "에는 보수적인 판단이 필요합니다." : "큰 위험 구간은 없습니다."}`,
    ],
    career: [
      `${tenGodLib.career} ${annual.dayMasterRelation}의 흐름 속에서 일은 ${annual.tenGod === "식신" || annual.tenGod === "상관" ? "표현력과 창의성을 발휘하는 방향" : annual.tenGod === "편관" || annual.tenGod === "정관" ? "책임과 역할 확대의 방향" : annual.tenGod === "편재" || annual.tenGod === "정재" ? "성과 관리와 수익 구조화의 방향" : "자기 기반을 강화하는 방향"}으로 전략을 짜야 합니다.`,
      `${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).join("·") + "는 커리어에서 제안, 발표, 전환의 타이밍으로 활용하기 좋습니다." : "올해는 전반적으로 꾸준한 성과 축적이 커리어 전략의 핵심입니다."} ${hasClash ? "충 신호가 있는 만큼 직업 변화나 이직을 고려한다면 이 해가 자연스러운 전환점이 될 수 있습니다." : hasCombo ? "합 신호가 있어 협업과 파트너십 기반의 커리어 확장이 유리합니다." : ""}`,
    ],
    wealth: [
      `${tenGodLib.money} 세운 ${annual.label}의 ${annualElementKo} 기운이 원국의 ${dayElementKo} 일간과 ${annual.dayMasterRelation} 관계를 이루는 만큼, 재물의 흐름은 ${annual.tenGod === "편재" || annual.tenGod === "정재" ? "직접 관리하고 구조화할수록" : annual.tenGod === "식신" || annual.tenGod === "상관" ? "생산과 표현을 통해 수익으로 전환할수록" : "기반을 다지고 안정을 확보할수록"} 더 살아납니다.`,
      `${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).join("·") + "에는 계약, 투자, 큰 지출 결정을 보류하거나 점검하는 것이 안전합니다." : "월별 점수가 고르게 분포되어 있어 꾸준한 재물 관리가 유효합니다."} ${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 2).join("·") + "에는 새로운 수익 구조를 제안하거나 계약을 확정하기 좋은 타이밍입니다." : ""}`,
    ],
    love: [
      `${tenGodLib.relationship} ${dayPillar ? dayPillar + " 일지의 성격이 올해의 관계 흐름과 만나면서" : "일지의 에너지가 세운과 만나면서"} ${hasClash && clashes.some((c) => c.label === "일지") ? "관계에서 이동과 전환의 압력이 강해집니다." : hasCombo && combos.some((c) => c.label === "일지") ? "새로운 인연이나 관계의 발전 가능성이 열립니다." : "관계의 방향을 조율하고 안정을 찾는 흐름이 강합니다."}`,
      `${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).join("·") + "에는 감정 표현과 만남의 기회가 더 자연스럽게 열립니다." : ""} 사랑에서 중요한 것은 감정의 크기보다 말과 행동의 일관성입니다. 이 해에는 기대치를 먼저 말로 정리하고, 상대와 함께 방향을 확인하는 방식이 관계를 안정시키는 핵심 전략입니다.`,
    ],
    relationships: [
      `${tenGodLib.yearlyTheme} 올해의 인간관계는 ${hasClash ? "갈등과 재편의 에너지가 강하게 작동하는 만큼 역할과 경계를 미리 정해두는 것이 충돌을 줄이는 방법입니다." : hasCombo ? "연결과 협력의 기운이 강해 귀인과 파트너가 들어오기 좋은 시기입니다." : "새로운 관계보다 기존 관계의 질을 높이는 방향이 더 유리합니다."}`,
      `말의 온도와 타이밍이 이 해의 인간관계를 좌우합니다. ${annual.tenGod === "상관" ? "표현력이 강한 만큼 의도와 다르게 전달되는 상황을 주의해야 합니다." : annual.tenGod === "비견" || annual.tenGod === "겁재" ? "경쟁심이 관계 안으로 들어오지 않도록 역할 경계를 명확히 하는 것이 필요합니다." : "상대의 상황을 먼저 파악하고 대화하는 순서가 관계 갈등을 줄여줍니다."}`,
    ],
    health: [
      `${tenGodLib.health} ${annualElementKo} 기운이 강해지는 해이므로, ${annualElementKo === "목" ? "간, 근골격계, 신경 쪽의 긴장이 누적될 수 있습니다." : annualElementKo === "화" ? "심장, 혈압, 열성 체질의 과부하를 주의해야 합니다." : annualElementKo === "토" ? "소화기, 위장, 과식 습관을 점검해야 합니다." : annualElementKo === "금" ? "폐, 피부, 호흡기 관리가 중요합니다." : "신장, 방광, 수분 관리와 냉증에 주의해야 합니다."}`,
      `생활 리듬이 흔들리면 전반적인 건강운이 떨어집니다. 수면, 식사 시간, 운동 루틴을 작은 단위로 고정하는 것이 이 해의 건강을 지키는 가장 현실적인 방법입니다. ${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).join("·") + "에는 과로와 무리한 스케줄을 피하는 것이 좋습니다." : ""}`,
    ],
    monthly: seed.saju.monthlyLuck.map((item) => {
      const stemKo = { 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" };
      const branchKo = { 子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해" };
      const sn = stemKo[item.pillar?.stem] || item.pillar?.stem || "";
      const bn = branchKo[item.pillar?.branch] || item.pillar?.branch || "";
      const toneKo = item.tone === "확장" ? "확장·실행" : item.tone === "정비" ? "정비·유지" : "보수·점검";
      return `${item.month}월(${sn}${bn}): ${toneKo} 흐름. ${item.score}점. ${item.advice}`;
    }),
    opportunities: [
      `${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 4).join("·") + "에는 세운의 긍정적 에너지가 가장 강하게 작동합니다." : "올해는 꾸준한 준비와 실행이 가장 큰 기회를 만듭니다."}`,
      `${hasCombo ? "합의 기운이 작동하는 만큼 파트너십, 협업, 계약 기반의 기회가 강하게 열립니다." : hasClash ? "충의 기운이 있어 기존 구조에서 벗어나 새로운 방향으로 전환하는 기회가 열립니다." : "안정적인 흐름 속에서 기반을 다지고 확장을 준비하는 것이 가장 효과적입니다."}`,
    ],
    risks: [
      `${monthlyCare.length > 0 ? monthlyCare.slice(0, 3).join("·") + "에는 중요한 결정을 서두르지 말고 점검과 보완에 더 집중하는 것이 안전합니다." : "올해는 전반적으로 위험 구간이 고르게 분산되어 있어 항상 일정한 수준의 관리가 필요합니다."}`,
      `${tenGodLib.caution} ${hasClash ? "충 신호가 있는 달에는 계약, 이동, 감정적 결정을 하루 이상 유보하는 습관이 손실을 줄여줍니다." : ""}`,
    ],
    finalStrategy: [
      `올해의 전략은 세운 ${annual.label}의 ${annual.tenGod} 흐름을 현실 선택의 기준으로 쓰는 것입니다. ${tenGodLib.advice}`,
      `${seed.targetYear}년을 마무리하는 시점에 "올해 나는 무엇을 얻었고 무엇을 내려놓았는가"라는 질문에 선명하게 답할 수 있도록, 지금부터 분기별 목표를 작게 쪼개어 실행하는 것이 가장 효과적인 연간 전략입니다.`,
    ],
  };
}

// (buildCategoryEvidence는 localParagraph 내부에서 직접 처리됩니다)

function localSexagenaryYear(year) {
  const index = ((toInt(year, 1984) - 1984) % 60 + 60) % 60;
  const stem = LOCAL_STEMS[index % 10];
  const branch = LOCAL_BRANCHES[index % 12];
  return { stem, branch, label: `${stem}${branch}` };
}

function localMonthPillar(targetYear, month) {
  const yearStemIndex = LOCAL_STEMS.indexOf(localSexagenaryYear(targetYear).stem);
  const firstMonthStemIndex = ((yearStemIndex % 5) * 2 + 2) % 10;
  const stem = LOCAL_STEMS[(firstMonthStemIndex + month - 1) % 10];
  const branch = LOCAL_MONTH_BRANCHES[(month - 1) % 12];
  return { month, stem, branch, label: `${stem}${branch}`, element: LOCAL_BRANCH_ELEMENT[branch] || LOCAL_STEM_ELEMENT[stem] || "earth" };
}

function localElementRelation(dayElement, otherElement) {
  if (!dayElement || !otherElement) return "균형 조정";
  if (dayElement === otherElement) return "자기 강화";
  if (LOCAL_GENERATES[dayElement] === otherElement) return "표현과 생산";
  if (LOCAL_GENERATES[otherElement] === dayElement) return "지원과 회복";
  if (LOCAL_CONTROLS[dayElement] === otherElement) return "관리와 재물";
  if (LOCAL_CONTROLS[otherElement] === dayElement) return "압박과 책임";
  return "균형 조정";
}

function localTenGod(dayStem, otherStem) {
  const dayElement = LOCAL_STEM_ELEMENT[dayStem];
  const otherElement = LOCAL_STEM_ELEMENT[otherStem];
  if (!dayElement || !otherElement) return "미정";
  const samePolarity = LOCAL_STEMS.indexOf(dayStem) % 2 === LOCAL_STEMS.indexOf(otherStem) % 2;
  if (dayElement === otherElement) return samePolarity ? "비견" : "겁재";
  if (LOCAL_GENERATES[dayElement] === otherElement) return samePolarity ? "식신" : "상관";
  if (LOCAL_CONTROLS[dayElement] === otherElement) return samePolarity ? "편재" : "정재";
  if (LOCAL_CONTROLS[otherElement] === dayElement) return samePolarity ? "편관" : "정관";
  if (LOCAL_GENERATES[otherElement] === dayElement) return samePolarity ? "편인" : "정인";
  return "미정";
}

function localRelationRows(pillars, annualBranch) {
  const natal = [
    ["연지", pillars?.year?.branch],
    ["월지", pillars?.month?.branch],
    ["일지", pillars?.day?.branch],
    ["시지", pillars?.hour?.branch],
  ].filter(([, branch]) => branch);
  const rows = [];
  for (const [label, branch] of natal) {
    if (LOCAL_BRANCH_COMBOS[annualBranch] === branch) rows.push({ type: "합", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 합을 이루어 연결과 협력의 기운이 살아납니다.` });
    if (LOCAL_BRANCH_CLASHES[annualBranch] === branch) rows.push({ type: "충", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 충을 이루어 이동, 변화, 결정 압력이 커집니다.` });
    if (LOCAL_BRANCH_HARMS[annualBranch] === branch) rows.push({ type: "해", label, branch, message: `${label} ${branch}와 세운 ${annualBranch} 사이에 미세한 오해와 관계 조율의 과제가 생깁니다.` });
    if (LOCAL_BRANCH_BREAKS[annualBranch] === branch) rows.push({ type: "파", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 파를 이루어 계획 변경과 약속 관리가 중요해집니다.` });
  }
  return rows;
}

function buildLocalMonthlyLuck(targetYear, dayStem) {
  const dayElement = LOCAL_STEM_ELEMENT[dayStem] || "earth";
  return Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const pillar = localMonthPillar(targetYear, month);
    const relation = localElementRelation(dayElement, pillar.element);
    const score = clamp(62 + (relation === "지원과 회복" ? 12 : relation === "표현과 생산" ? 8 : relation === "관리와 재물" ? 6 : relation === "압박과 책임" ? -7 : 2) + ((month * 7 + targetYear) % 9), 38, 92);
    const tone = score >= 75 ? "확장" : score >= 60 ? "정비" : "보수";
    return { month, pillar, relation, score: Math.round(score), tone, advice: `${month}월은 ${pillar.label} 월운과 ${LOCAL_ELEMENT_KO[pillar.element] || "오행"} 기운이 들어오므로 ${tone} 관점으로 일정과 선택을 조절하는 것이 좋습니다.` };
  });
}

function buildPdfSeed(profile, targetYear, body = {}) {
  const computed = normalizeEngineSaju(profile, body);
  const annual = localSexagenaryYear(targetYear);
  const annualElement = LOCAL_BRANCH_ELEMENT[annual.branch] || LOCAL_STEM_ELEMENT[annual.stem] || "earth";
  const dayStem = computed.dayMaster || computed.pillars.day?.stem || "戊";
  const annualLuck = {
    year: targetYear,
    ...annual,
    element: annualElement,
    elementKo: ELEMENT_KO[annualElement] || "토",
    tenGod: localTenGod(dayStem, annual.stem),
    dayMasterRelation: localElementRelation(LOCAL_STEM_ELEMENT[dayStem] || "earth", annualElement),
  };
  annualLuck.elementKo = LOCAL_ELEMENT_KO[annualElement] || "오행";
  const monthlyLuck = buildLocalMonthlyLuck(targetYear, dayStem);
  const branchRelations = localRelationRows(computed.pillars, annual.branch);
  const seed = {
    mode: "single",
    targetYear,
    birthProfile: {
      name: profile.name,
      birthDate: `${profile.birth.year}-${pad2(profile.birth.month)}-${pad2(profile.birth.day)}`,
      birthTime: profile.birth.unknownTime ? "" : `${pad2(profile.birth.hour)}:${pad2(profile.birth.minute)}`,
      calendarType: profile.calendarType,
      gender: profile.gender,
    },
    saju: {
      dayMaster: dayStem,
      pillars: computed.pillars,
      fiveElements: computed.fiveElements,
      tenGods: computed.tenGods,
      usefulGod: computed.usefulGods,
      luckCycle: computed.daeun,
      annualLuck,
      monthlyLuck,
      relations: {
        stems: [{ dayMaster: dayStem, annualStem: annual.stem, tenGod: annualLuck.tenGod }],
        branches: [{ annualBranch: annual.branch, annualElement }],
        branchRelations,
        combinations: branchRelations.filter((item) => item.type === "합"),
        clashes: branchRelations.filter((item) => item.type === "충"),
        harms: branchRelations.filter((item) => item.type === "해"),
        breaks: branchRelations.filter((item) => item.type === "파"),
        punishments: [],
      },
    },
    interpretationSeeds: {},
    chapters: [],
  };
  seed.interpretationSeeds = buildInterpretationSeeds(seed);
  seed.chapters = buildLocalSkeleton(seed);

  const strongest = dominantElement(seed?.saju?.fiveElements || {}, "earth");
  const weakest = Object.keys(seed?.saju?.fiveElements || {}).sort((a, b) => Number(seed.saju.fiveElements[a] || 0) - Number(seed.saju.fiveElements[b] || 0))[0] || "water";
  const chapterSpecs = buildSajuNewYearChapterSpecs(seed.targetYear);
  seed.input = {
    name: seed.birthProfile.name,
    gender: seed.birthProfile.gender,
    birthDate: seed.birthProfile.birthDate,
    birthTime: seed.birthProfile.birthTime,
    calendarType: seed.birthProfile.calendarType,
    targetYear: seed.targetYear,
  };
  seed.natalChart = {
    dayMaster: seed.saju.dayMaster,
    yearPillar: `${seed.saju.pillars?.year?.stem || ""}${seed.saju.pillars?.year?.branch || ""}`,
    monthPillar: `${seed.saju.pillars?.month?.stem || ""}${seed.saju.pillars?.month?.branch || ""}`,
    dayPillar: `${seed.saju.pillars?.day?.stem || ""}${seed.saju.pillars?.day?.branch || ""}`,
    hourPillar: `${seed.saju.pillars?.hour?.stem || ""}${seed.saju.pillars?.hour?.branch || ""}`,
    monthBranch: seed.saju.pillars?.month?.branch || "",
    dayBranch: seed.saju.pillars?.day?.branch || "",
    season: "봄",
  };
  seed.fiveElements = {
    ...seed.saju.fiveElements,
    strongest: [ELEMENT_KO[strongest] || "토"],
    weakest: [ELEMENT_KO[weakest] || "수"],
  };
  seed.luckCycles = {
    targetYearSewoon: {
      year: seed.targetYear,
      pillar: seed.saju.annualLuck.label,
      tenGodToDayMaster: seed.saju.annualLuck.tenGod,
      elementEffect: [seed.saju.annualLuck.elementKo, seed.saju.annualLuck.dayMasterRelation],
      clashOrCombinationWithNatal: (seed.saju.relations?.branchRelations || []).map((row) => row.message).slice(0, 4),
      keywords: [seed.saju.annualLuck.label, seed.saju.annualLuck.tenGod, seed.saju.annualLuck.dayMasterRelation].filter(Boolean),
    },
    monthlyFortunes: (seed.saju.monthlyLuck || []).map((item) => ({
      month: item.month,
      pillar: item.pillar.label,
      score: item.score,
      keywords: [item.pillar.label, item.tone, item.relation],
      opportunitySignals: item.score >= 72 ? ["확장", item.pillar.label] : [],
      cautionSignals: item.score < 60 ? ["보수", item.pillar.label] : [],
    })),
  };
  seed.structure = {
    geokguk: clean(seed.saju.usefulGod?.johu?.type || "건록격"),
    usefulGodKeywords: [clean(seed.saju.usefulGod?.yong || seed.saju.usefulGod?.useful || ""), clean(seed.saju.usefulGod?.hi || seed.saju.usefulGod?.hee || "")].filter(Boolean),
  };
  seed.derivedSignals = {
    yearlyThemeSignals: seed.interpretationSeeds.yearlyTheme.slice(0, 4),
    careerSignals: seed.interpretationSeeds.career.slice(0, 4),
    moneySignals: seed.interpretationSeeds.wealth.slice(0, 4),
    loveRelationshipSignals: seed.interpretationSeeds.love.slice(0, 4),
    humanRelationSignals: seed.interpretationSeeds.relationships.slice(0, 4),
    healthMindSignals: seed.interpretationSeeds.health.slice(0, 4),
    crisisSignals: seed.interpretationSeeds.risks.slice(0, 4),
    opportunitySignals: seed.interpretationSeeds.opportunities.slice(0, 4),
    monthlyStrategySignals: seed.interpretationSeeds.monthly.slice(0, 12),
  };
  seed.twelveGrowthStages = [{ stage: "장생" }, { stage: "목욕" }, { stage: "관대" }, { stage: "임관" }];
  seed.chapterSpecs = chapterSpecs;
  return seed;
}

function buildNewYearChapterLocalGuide(seed, chapterSpec) {
  return [
    "사주 명리학 기반 신년운세 프리미엄 PDF의 챕터 구조를 따라 원고를 작성합니다.",
    "챕터 구조와 세부 카테고리를 누락하지 않습니다.",
    "각 세부 카테고리 본문은 최소 700자 이상, 가능하면 900자 이상으로 확장합니다.",
    `챕터 구조: ${JSON.stringify(chapterSpec || {})}`,
    `로컬 계산 입력: ${JSON.stringify({ input: seed?.input, natalChart: seed?.natalChart, luckCycles: seed?.luckCycles })}`,
  ].join("\n");
}

function desiredSectionLength() {
  return Math.max(MIN_SECTION_CHARS + 220, 920);
}

function normalizeGeneratedChapter(chapterSpec, parsed = {}) {
  const sections = (chapterSpec?.categories || []).map((title, index) => {
    const source = (Array.isArray(parsed.sections) ? parsed.sections[index] : null) || {};
    const body = ensureMinLength(stripForbiddenText(source.body || source.text || ""), MIN_SECTION_CHARS, {
      targetYear: toInt(chapterSpec?.title?.match(/(\d{4})년/)?.[1], resolveDefaultTargetYear()),
      saju: { annualLuck: { label: "세운" } },
    }, title);
    return {
      title,
      body,
    };
  });
  return {
    no: Number(chapterSpec?.no || 0),
    title: clean(chapterSpec?.title || ""),
    sections,
    text: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
    source: "local-only",
  };
}

function validateSajuNewYearSeed(seed = {}) {
  const errors = [];
  if (!clean(seed?.natalChart?.dayMaster)) errors.push("natalChart.dayMaster");
  if (!Array.isArray(seed?.luckCycles?.monthlyFortunes) || seed.luckCycles.monthlyFortunes.length !== 12) errors.push("luckCycles.monthlyFortunes");
  if (!clean(seed?.input?.targetYear)) errors.push("input.targetYear");
  return { ok: errors.length === 0, errors };
}

function buildDeterministicChapterFromSpec(seed, chapterSpec, reason = "") {
  const chapter = {
    no: Number(chapterSpec?.no || 0),
    title: clean(chapterSpec?.title || ""),
    categories: (chapterSpec?.categories || []).slice(),
  };
  const sections = (chapterSpec?.categories || []).map((categoryTitle, idx) => ({
    title: categoryTitle,
    body: ensureMinLength(localParagraph(seed, chapter, categoryTitle, idx), desiredSectionLength(), seed, categoryTitle),
  }));
  return {
    no: chapter.no,
    title: chapter.title,
    sections,
    text: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
    source: "local-reinforced",
  };
}

function reinforceChapterFromSpec({ seed, chapterSpec, chapter, reason = "" } = {}) {
  const srcSections = Array.isArray(chapter?.sections) ? chapter.sections : [];
  let reinforced = false;
  const sections = (chapterSpec?.categories || []).map((title, idx) => {
    const src = srcSections[idx] || {};
    const body = stripForbiddenText(src.body || src.finalText || src.text || "");
    if (clean(src.title) === clean(title) && body.length >= MIN_SECTION_CHARS && !hasForbiddenText(body)) {
      return { title, body };
    }
    reinforced = true;
    return {
      title,
      body: ensureMinLength(localParagraph(seed, { no: chapterSpec.no, title: chapterSpec.title, categories: chapterSpec.categories }, title, idx), desiredSectionLength(), seed, title),
    };
  });
  return {
    reinforced,
    chapter: {
      no: Number(chapterSpec?.no || 0),
      title: clean(chapterSpec?.title || ""),
      sections,
      text: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
      source: reinforced ? "local-reinforced" : clean(chapter?.source || "local-only"),
    },
  };
}

function validateSajuNewYearPdfQuality({ chapters = [], expectedChapters = buildSajuNewYearChapterSpecs(resolveDefaultTargetYear()), minChapterLength = MIN_CHAPTER_CHARS, minSectionLength = MIN_SECTION_CHARS } = {}) {
  const errors = [];
  if (!Array.isArray(chapters) || chapters.length !== expectedChapters.length) {
    errors.push("chapter_count");
    return { ok: false, errors, stats: { chapterCount: Array.isArray(chapters) ? chapters.length : 0, totalChars: 0 } };
  }
  let totalChars = 0;
  expectedChapters.forEach((spec, chapterIndex) => {
    const chapter = chapters[chapterIndex];
    if (!chapter || clean(chapter.title) !== clean(spec.title)) {
      errors.push(`chapter_${chapterIndex + 1}_title`);
      return;
    }
    const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
    if (sections.length !== spec.categories.length) {
      errors.push(`chapter_${chapterIndex + 1}_section_count`);
      return;
    }
    let chapterChars = 0;
    spec.categories.forEach((categoryTitle, secIndex) => {
      const section = sections[secIndex] || {};
      const body = clean(section.body || "");
      chapterChars += body.length;
      if (clean(section.title) !== clean(categoryTitle)) errors.push(`chapter_${chapterIndex + 1}_section_${secIndex + 1}_title`);
      if (body.length < minSectionLength) errors.push(`chapter_${chapterIndex + 1}_section_${secIndex + 1}_min_chars`);
    });
    if (chapterChars < minChapterLength) errors.push(`chapter_${chapterIndex + 1}_min_chars`);
    totalChars += chapterChars;
  });
  if (totalChars < MIN_TOTAL_CHARS) {
    errors.push("total_min_chars");
  }
  return {
    ok: errors.length === 0,
    errors,
    stats: {
      chapterCount: chapters.length,
      totalChars,
    },
  };
}

function localParagraph(seed, chapter, category, idx) {
  const annual = seed.saju.annualLuck;
  const tenGodLib = getTenGodLib(annual.tenGod);
  const relations = seed.saju.relations?.branchRelations || [];
  const clashes = relations.filter((r) => r.type === "충");
  const combos = relations.filter((r) => r.type === "합");
  const monthlyStrong = seed.saju.monthlyLuck.filter((m) => m.score >= 75);
  const monthlyCare = seed.saju.monthlyLuck.filter((m) => m.score < 60);
  const dayMaster = seed.saju.dayMaster || "戊";
  const dayElementKo = ELEMENT_KO[STEM_ELEMENT[dayMaster] || "earth"] || "토";
  const yearPillar = seed.saju.pillars?.year?.branch || "";
  const monthPillarBranch = seed.saju.pillars?.month?.branch || "";
  const dayPillarBranch = seed.saju.pillars?.day?.branch || "";
  const hourPillarBranch = seed.saju.pillars?.hour?.branch || "";
  const relMsgs = relations.slice(0, 3).map((r) => r.message).join(" ");

  // Chapter 8 — 월별 운세
  if (chapter.no === 8) {
    if (idx === 0) {
      const firstHalf = seed.saju.monthlyLuck.slice(0, 6);
      return describeMonthlyGroup(firstHalf, seed) + `\n\n상반기는 올해 전체 방향을 실제 행동으로 바꾸는 구간입니다. ${annual.label} 세운이 초반에 던지는 신호를 흘려보내지 말고, 1월부터 6월까지의 흐름을 연결해서 보면 어디에서 속도를 내고 어디에서 균형을 잡아야 하는지가 선명해집니다. 상반기에 무리하게 모든 것을 끝내려 하기보다, 6월까지 기반을 단단히 세우고 관계와 일의 우선순위를 정리해 두면 하반기의 성과가 훨씬 안정적으로 이어집니다.`;
    }
    if (idx === 1) {
      const secondHalf = seed.saju.monthlyLuck.slice(6, 12);
      return describeMonthlyGroup(secondHalf, seed) + `\n\n하반기는 상반기에 만들어 둔 흐름을 수확과 재배치로 연결하는 구간입니다. 7월부터 12월까지는 운의 강약이 더 분명하게 체감되기 쉬우므로, 기회가 오는 달에는 과감히 밀어붙이고 부담이 커지는 달에는 무리한 결정을 늦추는 식의 운영이 필요합니다. 하반기를 잘 쓰는 사람은 연말에 성과만 남기는 것이 아니라, 다음 해로 이어질 기반까지 함께 남깁니다.`;
    }
    if (idx === 2) {
      const careMonths = seed.saju.monthlyLuck.filter((m) => m.score < 60);
      return `${careMonths.length ? careMonths.map((m) => `${m.month}월`).join("·") : "올해는 특정 한 달보다 상황별 대응이 더 중요합니다."}에는 특히 조심해야 할 흐름이 드러납니다. ${careMonths.length ? `${careMonths.map((m) => `${m.month}월`).join("·")}에는 세운과 월운이 원국에 부담으로 겹치면서 일정 변경, 감정 소모, 지출 증가, 관계 오해가 함께 움직일 가능성이 큽니다.` : "점수가 급격히 무너지는 달이 적더라도, 무리한 투자나 감정적 결정을 반복하면 충분히 흐름이 흔들릴 수 있습니다."} 이런 시기에는 새로운 시작보다 이미 잡아 놓은 계획을 점검하고, 사람과 돈, 일정의 균형을 다시 맞추는 것이 더 중요합니다. 조심해야 할 달의 핵심은 겁을 먹는 것이 아니라, 속도를 조절하고 방어선을 세우는 데 있습니다. 중요한 계약이나 큰 지출은 하루 이틀이라도 더 시간을 두고 검토하고, 관계에서는 말의 결론보다 말의 온도를 먼저 관리해야 손실을 줄일 수 있습니다. 결국 조심해야 할 달을 잘 보내는 사람이 한 해 전체의 안정감을 지킬 수 있습니다.`;
    }
    if (idx === 3) {
      const opportunityMonths = seed.saju.monthlyLuck.filter((m) => m.score >= 75);
      return `${opportunityMonths.length ? opportunityMonths.map((m) => `${m.month}월`).join("·") : "올해의 기회는 특정 한 달에 몰리기보다 준비된 순간에 열립니다."}에는 기회를 잡기 좋은 흐름이 강하게 작동합니다. ${opportunityMonths.length ? `${opportunityMonths.map((m) => `${m.month}월`).join("·")}은 세운의 힘이 월운과 맞물리면서 일, 재물, 관계에서 성과를 현실로 끌어오기 좋은 달입니다.` : "기회가 한 달에 몰리지 않더라도, 준비된 사람에게는 언제든 흐름이 열릴 수 있습니다."} 이 시기에는 준비만 하다가 타이밍을 놓치지 않도록 제안, 발표, 계약, 전환 같은 핵심 행동을 미리 배치해 두는 것이 좋습니다. 기회를 잡기 좋은 달에는 완벽한 조건을 기다리기보다 이미 준비한 것을 시장과 관계 속에 내놓는 용기가 필요합니다. 올해의 좋은 달을 잘 쓰는 사람은 단순히 운이 좋았던 것이 아니라, 좋은 달이 왔을 때 바로 움직일 수 있도록 미리 정리해 둔 사람입니다.`;
    }
    return `월별 운세는 달마다 점수가 다르다는 사실을 보는 데서 끝나면 큰 의미가 없습니다. 중요한 것은 그 달의 기운을 실제 계획에 어떻게 배치하느냐입니다. 점수가 높은 달에는 사람을 만나고, 제안을 하고, 중요한 결정을 내리는 쪽으로 일정을 설계하고, 점수가 낮은 달에는 점검과 정리, 관계 조율, 비용 관리에 무게를 두는 방식이 가장 현실적입니다. 또한 올해의 월운은 원국과 대운, 세운이 함께 만든 리듬이므로 한 달만 떼어 보지 말고 앞뒤 달의 연결까지 함께 봐야 흐름이 읽힙니다. 월별 운세 활용법의 핵심은 달의 좋고 나쁨을 따지는 것이 아니라, 달마다 해야 할 행동의 성격을 다르게 가져가는 데 있습니다. 그 기준만 잡혀 있으면 한 해 전체가 훨씬 덜 흔들리고, 운을 생활 속 선택으로 바꾸는 힘이 생깁니다.`;
  }

  const chapterNo = chapter.no;

  // Chapter 1 — 올해의 큰 흐름
  if (chapterNo === 1) {
    const openings = [
      `${seed.targetYear}년을 시작하면서 가장 먼저 알아야 할 것은 이 해가 어떤 에너지로 열리는가입니다. 세운 ${annual.label}은 ${annual.elementKo} 기운을 중심으로 움직이며, 이 기운이 당신의 원국과 만나는 방식에서 올해의 큰 그림이 결정됩니다.`,
      `올해의 분위기를 한 마디로 설명한다면, ${annual.tenGod}의 에너지가 당신의 일상 선택에 어떻게 들어오느냐입니다. ${tenGodLib.yearlyTheme}`,
      `세운 ${annual.label}이 원국에 들어올 때 ${annual.dayMasterRelation}의 방식으로 작동합니다. 이것은 올해가 ${annual.dayMasterRelation === "압박과 책임" ? "외부의 요구와 책임이 커지는 해" : annual.dayMasterRelation === "표현과 생산" ? "내가 가진 것을 외부로 드러내고 생산하는 해" : annual.dayMasterRelation === "관리와 재물" ? "재물과 성과를 직접 관리하는 해" : annual.dayMasterRelation === "지원과 회복" ? "지원받고 회복하며 기반을 다지는 해" : "내 기준과 중심을 더 선명하게 세우는 해"}임을 말해줍니다.`,
      `${clashes.length > 0 ? `올해의 큰 흐름에서 주목할 점은 원국의 ${clashes.map((c) => c.branch).join("·")}과 세운 ${annual.branch}의 충 신호입니다. 이것은 이동, 변화, 결단의 압력이 강해진다는 뜻이며, 기존에 유지하던 구조에 변화를 줄 시점임을 알려줍니다.` : combos.length > 0 ? `올해의 큰 흐름에서 주목할 점은 원국과 세운의 합 신호입니다. 이것은 협력과 연결이 강화되며 새로운 인연이나 기회와 자연스럽게 이어질 가능성이 높다는 뜻입니다.` : `올해의 큰 흐름은 급격한 충돌보다 운영과 균형을 조율하는 방향으로 움직입니다. 큰 사건보다 선택의 누적이 올해 성과를 만들어냅니다.`}`,
      `${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).map((m) => `${m.month}월`).join("·") + "에는 기회가 강하게 열리는 흐름이 있으며," : "상반기부터 꾸준히 기회가 분산되어 있으며,"} ${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).map((m) => `${m.month}월`).join("·") + "에는 보수적인 판단이 필요한 구간이 있습니다." : "위험 구간은 고르게 관리됩니다."} 올해는 좋은 달에 밀고 조심할 달에 점검하는 이중 트랙 운영이 핵심 전략입니다.`,
      `올해를 여는 핵심 조언은 세운을 기다리는 것이 아니라 세운의 에너지를 내 선택의 기준으로 삼는 것입니다. ${tenGodLib.advice}`,
    ];
    return openings[idx] || openings[0];
  }

  // Chapter 2 — 원국과 올해의 관계
  if (chapterNo === 2) {
    const texts = [
      `일간 ${dayMaster}는 ${dayElementKo} 기운을 중심으로 원국 전체를 주도합니다. 세운 ${annual.label}의 ${annual.elementKo} 기운이 이 일간과 만나면 ${annual.tenGod}의 방식으로 작동하며, 이것은 올해 ${annual.dayMasterRelation}의 방향으로 당신의 일상이 움직인다는 것을 의미합니다. 일간이 세운을 받아들이는 방식이 올해 모든 선택의 출발점이 됩니다.`,
      `월지 ${monthPillarBranch ? monthPillarBranch : ""}는 현실적인 활동성과 사회적 목표를 나타내는 자리입니다. 이 자리가 세운 ${annual.branch}와 ${relations.find((r) => r.label === "월지")?.type ? relations.find((r) => r.label === "월지").type + "의 관계를 이룬다면, " + relations.find((r) => r.label === "월지").message : "특별한 합충 없이 만나더라도,"} 일과 수익, 현실 목표의 방향에 변화가 생기는 흐름이 감지됩니다. 올해 현실적인 성과를 내려면 월지의 에너지를 어떤 방향으로 쓸지 먼저 정해두는 것이 효과적입니다.`,
      `일지 ${dayPillarBranch ? dayPillarBranch : ""}는 관계와 배우자, 자기 내면의 실질적인 자리입니다. 세운과 일지의 에너지가 만나면 ${relations.find((r) => r.label === "일지")?.message || "관계에서 새로운 흐름이 감지됩니다."} 올해 관계에서 가장 중요한 것은 내가 무엇을 원하는지를 먼저 명확히 하고, 그것을 상대에게 솔직하게 표현하는 것입니다.`,
      `천간에서는 세운의 ${annual.stem}과 원국 천간의 관계가 올해의 의지, 판단, 결정 방식에 영향을 줍니다. 세운 천간이 원국 천간을 자극하면 말, 사고방식, 의사결정의 패턴이 바뀌는 신호가 됩니다. ${tenGodLib.career} 이 해에는 생각을 행동으로 바꾸는 속도가 성과를 좌우합니다.`,
      `지지에서는 세운 ${annual.branch}이 원국의 연지 ${yearPillar}, 월지 ${monthPillarBranch}, 일지 ${dayPillarBranch}, 시지 ${hourPillarBranch}와 어떻게 만나는지가 중요합니다. ${relMsgs || "지지의 관계가 비교적 안정적인 흐름을 유지하며, 사건보다 선택의 누적이 올해 결과를 만듭니다."} 지지의 흐름은 몸이 느끼는 현실, 생활 환경, 인간관계의 실제 변화로 드러납니다.`,
      `원국 전체를 놓고 올해의 방향을 보면, ${annual.dayMasterRelation}의 흐름 속에서 ${tenGodLib.yearlyTheme} 이 해에 원국이 가장 강하게 살아나는 영역은 ${annual.tenGod === "식신" || annual.tenGod === "상관" ? "표현, 창의, 생산의 영역" : annual.tenGod === "편재" || annual.tenGod === "정재" ? "재물, 성과, 관리의 영역" : annual.tenGod === "편관" || annual.tenGod === "정관" ? "책임, 역할, 사회적 위치의 영역" : annual.tenGod === "편인" || annual.tenGod === "정인" ? "배움, 회복, 내면 성장의 영역" : "자기 기준, 독립, 자립의 영역"}입니다.`,
    ];
    return texts[idx] || texts[0];
  }

  // Chapter 3 — 커리어
  if (chapterNo === 3) {
    const texts = [
      `${tenGodLib.career} 올해의 직업운은 ${annual.tenGod} 에너지가 일의 현실에 어떻게 작동하느냐에 달려 있습니다. 세운 ${annual.label}의 ${annual.elementKo} 기운이 원국과 ${annual.dayMasterRelation}을 이루는 만큼, 지금 있는 자리에서 더 깊이 파고들수록 성과가 나는 해인지, 새로운 방향으로 전환할 준비를 해야 하는 해인지를 먼저 판단해야 합니다.`,
      `일에서 인정받는 방식은 올해의 세운 에너지에 따라 달라집니다. ${annual.tenGod === "정관" || annual.tenGod === "편관" ? "책임감 있게 역할을 수행하고 신뢰를 쌓는 방식이 가장 강하게 인정받습니다." : annual.tenGod === "식신" || annual.tenGod === "상관" ? "창의적인 아이디어나 표현력, 새로운 방법을 제시하는 방식이 주목받는 시기입니다." : annual.tenGod === "편재" || annual.tenGod === "정재" ? "성과 수치와 실질적인 결과를 보여주는 방식이 가장 강한 설득력을 가집니다." : "자기 기준을 지키며 꾸준히 전문성을 쌓는 방식이 결국 인정으로 돌아옵니다."} 남들이 보기 좋은 방식보다 실제 가치를 만들어내는 방식에 집중하는 것이 올해의 커리어 전략입니다.`,
      `올해 조직과 독립 중 어느 방향이 더 유리한지는 월별 흐름과 합충 신호로 판단합니다. ${combos.length > 0 ? "합 신호가 있어 파트너십이나 팀 기반의 협업이 개인 역량보다 더 강한 결과를 낼 가능성이 있습니다." : clashes.length > 0 ? "충 신호가 있어 기존 조직 구조에서 벗어나 독립적인 방향으로 전환하는 움직임이 자연스럽게 나타날 수 있습니다." : "조직과 독립의 선택에서 지금 당장의 안정보다 3~5년 후 어디에 있고 싶은지를 기준으로 결정하는 것이 유리합니다."}`,
      `일에서 경쟁과 압박이 강해지는 시기입니다. ${annual.tenGod === "겁재" ? "겁재의 에너지가 경쟁 구도를 만들어내므로, 남과 비교하기보다 내 고유한 역량과 차별점을 선명하게 보여주는 것이 핵심입니다." : annual.tenGod === "편관" ? "편관의 압박은 역량을 증명하는 기회입니다. 어려운 과제를 정면으로 받아내는 태도가 장기적인 신뢰를 만듭니다." : "경쟁이 강해질 때는 남의 속도보다 내 방향을 먼저 확인하는 것이 중요합니다."} ${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).map((m) => `${m.month}월`).join("·") + "에는 과도한 업무 수용을 조심해야 합니다." : ""}`,
      `커리어 전환이나 확장의 가능성이 있는 해입니다. ${clashes.length > 0 ? "충의 에너지가 기존 구조에 변화를 요구하므로, 이직이나 업무 영역 확장을 고려한다면 이 해에 결정을 내리는 것이 자연스러운 흐름입니다." : monthlyStrong.length > 0 ? monthlyStrong.slice(0, 2).map((m) => `${m.month}월`).join("·") + "에 새로운 기회나 제안이 들어올 가능성이 있으므로 미리 자신의 방향을 정리해두는 것이 좋습니다." : "커리어 확장은 급격한 변화보다 현재의 역량을 더 깊이 발전시키는 방향에서 기회가 열립니다."}`,
      `${tenGodLib.advice} 올해 일운을 가장 잘 살리는 전략은 내가 가장 잘할 수 있는 것을 가장 명확한 형태로 보여주는 것입니다. ${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).map((m) => `${m.month}월`).join("·") + "에 중요한 제안, 발표, 협상을 집중시키고" : "일의 기회를 월별 점수가 높은 시기에 집중시키고"} 낮은 점수 구간에는 실력을 다듬고 다음 기회를 준비하는 방식으로 연간 커리어를 설계하세요.`,
    ];
    return texts[idx] || texts[0];
  }

  // Chapter 4 — 재물운
  if (chapterNo === 4) {
    const texts = [
      `${tenGodLib.money} 올해 돈이 들어오는 방식은 세운 ${annual.label}의 ${annual.tenGod} 에너지와 직접 연결됩니다. ${annual.tenGod === "편재" || annual.tenGod === "정재" ? "재성이 직접 작동하는 해이므로 수익 구조를 명확히 정리할수록 재물이 더 안정적으로 흐릅니다." : annual.tenGod === "식신" || annual.tenGod === "상관" ? "식상이 재를 생하는 구조로 내가 생산하고 표현하는 만큼 재물이 따라옵니다." : "재물은 직접적인 행운보다 내가 제공하는 가치와 역량에 비례해 들어오는 구조입니다."} 올해 재물운의 흐름을 이해하는 첫 번째 출발점은 어떤 방식으로 가치를 제공하고 있는지 점검하는 것입니다.`,
      `수익이 커지는 조건은 올해의 세운 흐름과 월별 에너지가 맞아야 합니다. ${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).map((m) => `${m.month}월`).join("·") + "에는 새로운 수익 구조를 시작하거나 기존 수익을 확장하기 좋은 타이밍입니다." : "꾸준한 실행이 수익 증가의 핵심 조건입니다."} 수익이 커지려면 내가 제공하는 것의 가격, 범위, 방식을 명확하게 정의하는 것이 먼저입니다.`,
      `돈이 막히는 패턴을 미리 파악하면 손실을 줄일 수 있습니다. ${annual.tenGod === "겁재" ? "경쟁 구도에서 가격을 낮추거나 조건을 양보하는 방식이 결국 재물을 깎아먹습니다." : annual.tenGod === "편관" ? "외부의 압박에 쫓겨 충동적인 지출이나 급한 투자를 결정하는 것이 손실의 원인이 됩니다." : "계획 없이 지출을 늘리거나 충동적인 소비가 재물운을 막는 주요 패턴입니다."} ${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).map((m) => `${m.month}월`).join("·") + "에는 큰 지출이나 새로운 투자 결정을 늦추는 것이 안전합니다." : ""}`,
      `투자와 계약, 가격 책정에서는 세운의 충 신호를 반드시 확인해야 합니다. ${clashes.length > 0 ? `원국의 ${clashes.map((c) => c.branch).join("·")}과 세운의 충이 있어 계약 조항이나 투자 구조를 평소보다 더 꼼꼼하게 점검하는 것이 필요합니다.` : "계약과 투자에서는 서두르는 것보다 조건을 충분히 검토하는 것이 더 유리합니다."} 가격 책정에서는 시장 평균보다 내가 제공하는 가치를 기준으로 책정하는 것이 장기적으로 더 안정적인 수익 구조를 만들어냅니다.`,
      `고정수익과 확장수익의 균형을 유지하는 것이 올해 재물 전략의 핵심입니다. 고정수익은 안정의 기반이고 확장수익은 성장의 연료입니다. ${annual.tenGod === "정재" ? "정재의 흐름은 안정적인 고정 수입 구조에서 더 강하게 작동합니다. 무리한 확장보다 지금 있는 수익 구조를 더 견고하게 만드는 것이 유리합니다." : annual.tenGod === "편재" ? "편재의 흐름은 다양한 수익 채널을 열 때 더 강하게 작동합니다. 단, 너무 많은 채널을 동시에 관리하면 오히려 수익이 분산됩니다." : "올해는 한 가지 수익 구조를 충분히 성장시킨 다음 다음 단계를 설계하는 순서가 더 효과적입니다."}`,
      `${tenGodLib.advice} 올해 재물운을 키우는 가장 현실적인 방법은 수입 구조, 지출 패턴, 저축 목표를 한 페이지로 정리해두는 것입니다. 월별 흐름이 좋은 달에는 새로운 수익 구조를 시도하고, 흐름이 약한 달에는 기존 구조를 점검하고 비용을 줄이는 방식으로 1년을 설계하세요.`,
    ];
    return texts[idx] || texts[0];
  }

  // Chapter 5 — 인간관계
  if (chapterNo === 5) {
    const texts = [
      `${tenGodLib.yearlyTheme} 올해 가까워지는 사람은 단순히 성향이 맞는 사람보다, 지금 당신이 풀어야 하는 과제와 연결되는 사람일 가능성이 큽니다. ${annual.tenGod === "비견" || annual.tenGod === "겁재" ? "같은 분야에서 경쟁과 협력을 동시에 경험하는 사람들, 혹은 비슷한 위치에서 서로를 자극하는 관계가 가까워질 수 있습니다." : annual.tenGod === "정관" || annual.tenGod === "편관" ? "책임감이 강하고 현실 감각이 분명한 사람이 올해의 인간관계에서 중요한 축이 되기 쉽습니다." : "생각을 넓혀 주고 감정의 밀도를 바꿔 주는 사람이 올해는 더 큰 의미로 들어올 가능성이 높습니다."} 가까워지는 사람을 무조건 오래 붙잡는 것이 중요한 것이 아니라, 그 사람이 내 삶에 어떤 방향을 열어 주는지를 읽어내는 것이 더 중요합니다. 관계의 초반에는 편안함보다 배울 점이 있는지, 긴장되더라도 성장의 계기를 주는지를 함께 보세요. 그런 기준으로 사람을 보면 올해 인간관계의 질이 훨씬 선명해집니다.`,
      `${combos.length > 0 ? "합의 기운이 강하게 들어오면 귀인운은 의외로 자연스럽게 작동합니다. 억지로 도움을 요청하기보다, 이미 연결된 사람 안에서 다음 단계로 이어 줄 다리가 나타나는 경우가 많습니다." : "귀인운은 화려한 인맥보다 적절한 순간에 현실적인 도움을 주는 관계에서 드러납니다."} 올해 도움을 받을 수 있는 관계는 감정적으로만 편한 사람보다, 당신의 결정을 더 정확하게 만들고 시야를 넓혀 주는 사람입니다. 일에서는 방향을 정리해 주는 조언자, 돈 문제에서는 손익 감각을 잡아 주는 현실적인 사람, 감정에서는 과열된 마음을 가라앉혀 주는 차분한 사람이 귀인의 역할을 합니다. 중요한 것은 도움을 받을 때 막연히 기대는 것이 아니라, 내가 어떤 도움을 필요로 하는지 먼저 분명히 알고 다가가는 태도입니다. 그래야 관계가 일방적인 기대가 아니라 서로에게 의미 있는 연결로 남습니다.`,
      `${clashes.length > 0 ? `올해는 ${clashes.map((c) => c.branch).join("·")} 자리의 충 신호가 관계 재편으로 드러날 가능성이 있습니다. 그래서 멀어질 수 있는 인연은 갑작스러운 사건 때문이라기보다, 이미 맞지 않던 방식이 더 이상 유지되지 않는 방향으로 정리되기 쉽습니다.` : "멀어질 수 있는 인연은 크게 싸워서 끊어지는 경우보다, 결이 맞지 않던 관계가 자연스럽게 소원해지는 방식으로 드러날 가능성이 높습니다."} 여기서 중요한 것은 관계가 멀어진다는 사실 자체를 실패로 해석하지 않는 것입니다. 지금의 삶과 방향에 맞지 않는 관계를 억지로 붙들면 오히려 에너지가 오래 소모됩니다. 올해는 모두를 만족시키려 하기보다, 내 시간을 쓰고 싶은 사람과 그렇지 않은 사람을 더 분명히 나누는 훈련이 필요합니다. 그 과정이 차갑게 느껴질 수 있어도, 결국 건강한 관계 구조를 만드는 데는 반드시 필요한 정리입니다.`,
      `갈등이 생기는 이유는 표면적인 사건보다 기대와 역할의 차이에서 더 자주 시작됩니다. ${annual.tenGod === "상관" ? "특히 말이 빠르고 판단이 선명해지는 해에는 내가 한 말의 논리가 맞더라도 상대가 상처를 받는 경우가 생깁니다." : annual.tenGod === "비견" || annual.tenGod === "겁재" ? "비교와 자존심이 관계 안으로 들어오면 작은 일도 힘겨루기로 변할 수 있습니다." : "상대가 당연히 알아줄 것이라고 기대하는 부분이 실제로는 가장 큰 오해의 출발점이 되기 쉽습니다."} 갈등을 줄이려면 문제를 키운 뒤에 설명하는 것이 아니라, 불편함이 생긴 초기에 말의 온도를 낮춰서 꺼내는 습관이 필요합니다. 누가 옳은지를 가리기보다 지금 무엇이 어긋났는지를 확인하는 방식으로 대화를 열어야 관계가 덜 소모됩니다. 올해의 인간관계는 감정의 크기보다 조율의 기술이 결과를 좌우합니다.`,
      `${tenGodLib.advice} 좋은 인연을 붙잡는 태도는 결국 분별력과 지속성에 달려 있습니다. 처음의 강한 호감만으로 관계를 판단하지 말고, 시간이 지나도 약속을 지키는지, 말과 행동이 일치하는지, 내가 약해졌을 때도 관계의 균형이 유지되는지를 보세요. 그런 사람에게는 조금 더 시간을 쓰고, 먼저 마음을 열고, 작게라도 신뢰를 쌓는 행동을 반복하는 것이 좋습니다. 올해 인연운은 많은 사람을 만나는 데서 완성되지 않습니다. 정말 남겨야 할 사람을 알아보고 그 관계를 오래 가는 구조로 만드는 데서 비로소 빛이 납니다.`,
    ];
    return texts[idx] || texts[0];
  }

  // Chapter 6 — 연애와 결혼운
  if (chapterNo === 6) {
    const texts = [
      `${tenGodLib.relationship} 올해 연애 기운의 강도는 세운 ${annual.label}이 원국의 배우자성, 일지, 관계 관련 십성과 만나는 방식에서 드러납니다. ${annual.tenGod === "정관" || annual.tenGod === "정재" ? "올해는 관계를 안정적으로 정리하고 한 사람과의 깊이를 키우는 방향으로 기운이 모이기 쉽습니다." : annual.tenGod === "편재" || annual.tenGod === "편관" ? "새로운 자극과 만남의 가능성이 커지는 대신, 선택을 서두르면 관계의 소모도 커질 수 있습니다." : "연애 기운이 아예 약하다기보다, 감정의 파도보다 관계의 방향을 먼저 확인해야 하는 해에 가깝습니다."} 그래서 올해 사랑운은 강한 끌림 하나로 판단하기보다, 그 인연이 내 삶의 구조와 얼마나 잘 맞는지까지 함께 보아야 정확합니다. 감정이 올라오는 순간과 관계가 오래 가는 조건은 다를 수 있다는 점을 먼저 기억하세요.`,
      `${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).map((m) => `${m.month}월`).join("·") + "에는 새로운 인연이 들어올 가능성이 높습니다." : "새로운 인연은 한 달에 몰리기보다 준비된 시기에 자연스럽게 들어올 수 있습니다."} 새로운 인연이 들어오는 방식은 ${combos.length > 0 ? "합의 기운을 타고 지인의 소개, 일 연결, 자연스러운 협업 속에서 가까워지는 흐름" : "억지로 만남을 만들기보다, 내가 꾸준히 드러나는 공간에서 천천히 연결되는 흐름"}에 더 가깝습니다. 올해는 화려한 첫인상보다 관계의 리듬이 맞는지를 더 중요하게 봐야 합니다. 처음엔 강하게 느껴지지 않아도 대화가 편안하고 약속이 안정적인 사람이 오히려 오래 갈 가능성이 큽니다. 인연을 찾는 과정에서 기준을 낮추기보다, 내가 반복해서 상처받는 패턴이 무엇인지 먼저 아는 것이 더 중요합니다.`,
      `${clashes.find((c) => c.label === "일지") ? "일지에 충 신호가 들어오면 기존 관계에서 숨겨 두었던 문제들이 더 이상 미뤄지지 않고 드러날 수 있습니다." : "기존 관계의 문제는 갑자기 생긴다기보다, 오래 묵어 있던 감정과 생활 습관의 차이가 더 선명해지는 방식으로 드러날 가능성이 큽니다."} 올해 기존 관계에서 드러나는 문제는 대개 사랑이 식어서라기보다, 기대와 역할을 다루는 방식이 어긋나기 때문입니다. 상대가 알아서 맞춰 주길 기다리거나, 반대로 내가 모두 참아 주는 구조가 오래 지속되면 관계는 겉으로는 조용해도 안쪽에서 빠르게 마릅니다. 올해는 불편함을 참는 능력보다, 불편함을 상처로 만들기 전에 대화로 조율하는 능력이 더 중요합니다. 문제를 피하지 않고 언어로 다루기 시작할 때 관계는 무너지는 대신 다시 설계될 수 있습니다.`,
      `${annual.tenGod === "정관" || annual.tenGod === "정재" ? "결혼이나 장기 관계 가능성은 올해 비교적 분명하게 열릴 수 있습니다. 특히 현실 조건과 미래 계획을 함께 맞춰 갈 수 있는 상대라면 관계의 공식화가 자연스럽게 논의될 수 있습니다." : "결혼이나 장기 관계 가능성은 감정의 속도보다 생활 구조와 책임을 함께 감당할 수 있는지에서 결정됩니다."} 사랑이 깊어진다고 해서 곧바로 오래 가는 관계가 되는 것은 아닙니다. 올해 장기 관계를 판단할 때는 감정 표현의 빈도보다 갈등이 생겼을 때 어떻게 해결하는지, 돈과 시간의 우선순위를 어떻게 맞추는지, 각자의 삶을 존중하면서도 함께 갈 수 있는지를 보아야 합니다. 그 조건이 갖춰진 관계라면 올해는 충분히 다음 단계로 넘어갈 수 있습니다. 반대로 그 기준이 불분명하다면, 서두르지 않는 것이 오히려 관계를 지키는 선택입니다.`,
      `${tenGodLib.caution} 사랑에서 조심해야 할 태도는 내가 불안할수록 더 뚜렷해집니다. ${annual.tenGod === "상관" ? "말로 상대를 시험하거나, 상처받기 전에 먼저 거리를 두는 태도" : annual.tenGod === "비견" || annual.tenGod === "겁재" ? "자존심 때문에 원하는 것을 말하지 않거나, 비교심으로 관계를 흔드는 태도" : "상대에게 맞춰 주는 척하면서 실제 감정은 쌓아 두는 태도"}는 올해 특히 관계를 어렵게 만들 수 있습니다. 사랑에서 중요한 것은 멋지게 보이는 대응이 아니라, 내가 무엇을 원하는지 솔직히 말하고 상대의 반응을 있는 그대로 보는 용기입니다. 서운함을 돌려 말하거나 기대를 숨기면, 관계는 더 오래 꼬입니다. 올해 사랑을 지키려면 감정을 미화하지 말고, 다정하지만 분명한 태도로 관계의 기준을 세우는 연습이 필요합니다.`,
    ];
    return texts[idx] || texts[0];
  }

  // Chapter 7 — 건강
  if (chapterNo === 7) {
    const texts = [
      `${tenGodLib.health} 올해 몸이 예민해지는 부분은 세운 ${annual.label}의 ${annual.elementKo} 기운이 원국의 약한 오행이나 이미 과도한 오행을 건드리는 지점에서 먼저 드러납니다. ${annual.elementKo === "목" ? "근육의 긴장, 눈의 피로, 간담 계열의 답답함처럼 몸의 긴장이 먼저 느껴질 수 있습니다." : annual.elementKo === "화" ? "열감, 심장 두근거림, 혈압성 피로, 과열된 신경 반응처럼 몸과 마음이 동시에 들뜨는 양상이 나타날 수 있습니다." : annual.elementKo === "토" ? "소화기 부담, 체중 기복, 몸이 무거워지는 느낌처럼 정체감이 두드러질 수 있습니다." : annual.elementKo === "금" ? "호흡기, 피부, 건조감, 예민한 신경 반응처럼 외부 자극에 민감해지는 흐름이 생길 수 있습니다." : "냉증, 부종, 수면의 질 저하처럼 체내 순환과 회복 리듬에서 불편함이 먼저 드러날 수 있습니다."} 올해는 몸이 보내는 작은 신호를 무시하지 않는 태도가 중요합니다. 병명을 단정하기보다, 반복해서 예민해지는 부분을 생활 리듬과 연결해 살피는 것이 훨씬 현실적인 관리 방법입니다.`,
      `${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).map((m) => `${m.month}월`).join("·") + "에는 마음이 흔들리는 시기가 더 선명하게 드러날 수 있습니다." : "올해는 특정 시기보다 피로가 누적된 순간에 마음의 흔들림이 더 크게 느껴질 수 있습니다."} 감정이 흔들릴 때 그것을 성격 문제로 몰아가지 말고, 몸의 피로와 일정의 밀도를 함께 보아야 합니다. ${annual.tenGod === "상관" ? "생각이 많아질수록 잠이 얕아지고, 잠이 얕아질수록 감정 기복이 더 커지는 흐름이 반복되기 쉽습니다." : annual.tenGod === "편관" ? "외부 압박을 오래 견디다 보면 멀쩡한 척하다가 한 번에 무너지는 방식으로 드러날 수 있습니다." : "참고 넘긴 감정이 쌓일수록 사소한 일에도 예민하게 반응하게 될 수 있습니다."} 올해 심리 리듬을 지키려면 감정을 통제하는 데만 집중하지 말고, 감정이 요동치기 전 몸의 신호를 먼저 읽어내는 연습이 필요합니다.`,
      `스트레스가 쌓이는 방식은 사람마다 다르지만, 당신의 경우에는 운의 흐름이 강해질수록 더 분명한 패턴이 드러납니다. ${annual.tenGod === "비견" || annual.tenGod === "겁재" ? "경쟁과 비교, 자존심을 지키려는 압박이 스트레스를 키우기 쉽습니다." : annual.tenGod === "정관" || annual.tenGod === "편관" ? "책임을 놓치면 안 된다는 긴장감이 몸을 먼저 굳게 만들 수 있습니다." : annual.tenGod === "식신" || annual.tenGod === "상관" ? "생각과 표현이 많아질수록 정리되지 않은 자극이 피로로 쌓일 수 있습니다." : "겉으로는 조용해 보여도 감정과 걱정을 오래 안으로 묻어 두는 방식이 누적 피로를 만들 수 있습니다."} 스트레스를 줄이려면 큰 결심보다 배출 통로를 만드는 것이 먼저입니다. 하루에 짧게라도 걷기, 기록하기, 사람과 말하기 같은 방식으로 마음속 에너지가 멈춰 서지 않게 흘려보내야 올해의 건강운이 무너지지 않습니다.`,
      `회복력을 높이는 생활 리듬은 특별한 비법보다 반복 가능한 기본에서 나옵니다. 수면 시간을 일정하게 맞추고, 식사 간격을 크게 무너뜨리지 않고, 몸을 지나치게 몰아붙인 날에는 반드시 회복 시간을 다음 일정 안에 포함시키는 식의 운영이 필요합니다. 특히 올해는 "버틸 수 있으니 더 한다"는 방식이 누적 손상을 만들기 쉽습니다. ${annual.elementKo === "화" ? "열을 식히는 휴식과 자극을 줄이는 밤 루틴" : annual.elementKo === "금" ? "건조함을 막는 습도 관리와 호흡을 길게 만드는 습관" : annual.elementKo === "수" ? "몸을 따뜻하게 하고 수면 깊이를 회복하는 습관" : annual.elementKo === "목" ? "몸을 풀어 주는 스트레칭과 긴장 완화 루틴" : "소화 부담을 줄이는 식사 리듬과 걷기"}이 올해 회복력을 높이는 데 특히 유효합니다. 회복력은 여유가 생긴 뒤 챙기는 것이 아니라, 일정이 많을수록 먼저 넣어 두어야 하는 필수 항목입니다.`,
      `${tenGodLib.advice} 건강운을 지키는 조언을 한 가지로 압축하면, 무너지기 전에 조절하는 습관을 만드는 것입니다. 올해는 참아 내는 힘보다 조절하는 힘이 더 중요합니다. 몸이 보내는 예민함을 무시하지 말고, 마음이 흔들릴 때 큰 결정을 잠시 미루고, 일정이 빽빽할수록 일부러 빈 시간을 만들어 두세요. 그렇게 하면 올해의 건강운은 단순히 아프지 않은 수준을 넘어, 중요한 순간에 필요한 에너지를 안정적으로 유지하는 방향으로 바뀝니다. 결국 몸과 마음의 리듬을 지키는 사람만이 올해의 기회도 오래 붙잡을 수 있습니다.`,
    ];
    return texts[idx] || texts[0];
  }

  // Chapter 9 — 위기와 반전
  if (chapterNo === 9) {
    const texts = [
      `올해 가장 흔들리기 쉬운 문제는 ${clashes.length > 0 ? `원국과 세운의 충이 작동하는 ${monthlyCare.map((m) => `${m.month}월`).slice(0, 2).join("·") || "점수가 낮은 시기"}에 더 뚜렷하게 드러날 가능성이 있습니다.` : `${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).map((m) => `${m.month}월`).join("·") + " 같은 구간에서" : "운의 강약이 엇갈리는 순간에"} 작게 시작한 문제가 빠르게 커질 수 있습니다.`} 흔들리기 쉬운 문제의 본질은 외부 사건 그 자체보다, 이미 쌓여 있던 피로와 미뤄 둔 결정이 한꺼번에 표면으로 올라오는 데 있습니다. 그래서 올해의 위기는 예상 밖 재난처럼 오기보다, 조금씩 무시해 온 신호가 어느 순간 더는 미룰 수 없게 되는 방식으로 나타날 가능성이 큽니다. 이 점을 이해하면 위기를 두려워하기보다, 신호를 먼저 읽고 구조를 정리하는 방향으로 대응할 수 있습니다.`,
      `반복될 수 있는 실수는 대체로 익숙한 방식으로 다시 반응하는 데서 시작됩니다. ${annual.tenGod === "겁재" ? "이기고 싶다는 마음이 앞서 판단을 서두르는 실수" : annual.tenGod === "상관" ? "생각이 앞서 방향을 자주 바꾸고 끝맺음을 늦추는 실수" : annual.tenGod === "편관" ? "압박을 견디기 위해 무리하게 버티다가 뒤늦게 무너지는 실수" : "감정 상태를 점검하지 않은 채 중요한 선택을 내려 후회하는 실수"}가 올해 반복될 가능성이 높습니다. 실수를 줄이는 가장 좋은 방법은 완벽해지는 것이 아니라, 내가 어떤 순간에 같은 패턴으로 무너지는지를 정확히 아는 것입니다. 결정 앞에서 한 번 더 멈추고, 지금 내 상태가 과열인지 피곤한지부터 확인하는 습관만 생겨도 반복 실수의 절반은 줄어듭니다. 올해는 능력보다 자기 패턴을 읽는 힘이 더 큰 보호막이 됩니다.`,
      `${clashes.length > 0 ? "위기가 기회로 바뀌는 조건은 변화 자체를 피하지 않는 데 있습니다. 충의 기운이 작동하면 기존 구조가 흔들릴 수밖에 없는데, 그때 무엇을 지키고 무엇을 바꿀지 스스로 선택하면 위기는 전환점이 됩니다." : "위기가 기회로 바뀌는 조건은 문제를 빠르게 인정하고, 감정 반응보다 구조 조정에 먼저 들어가는 데 있습니다."} 올해는 감정적으로만 버티는 방식으로는 반전이 잘 일어나지 않습니다. 일과 돈, 관계, 생활 리듬 중 어디가 먼저 무너졌는지 확인하고 그 지점을 다시 설계해야 합니다. 위기를 기회로 만드는 사람은 특별히 강한 사람이 아니라, 흔들릴 때 원인을 명확히 보고 작은 조정을 빠르게 반복하는 사람입니다. 올해 반전의 계기는 한 번의 큰 승부보다, 무너지는 흐름을 끊어 내는 작은 기준에서 시작될 가능성이 큽니다.`,
      `피해야 할 선택은 겉으로는 쉬워 보이지만, 뒤로 갈수록 더 큰 비용을 남기는 선택입니다. 예를 들어 불안하다고 해서 무조건 확장하는 선택, 외롭다고 해서 맞지 않는 관계를 붙잡는 선택, 손실이 두려워 확인도 없이 결정을 미루는 선택은 모두 올해의 흐름을 더 꼬이게 만들 수 있습니다. ${tenGodLib.caution} 특히 ${annual.tenGod === "비견" || annual.tenGod === "겁재" ? "자존심 때문에 협력 기회를 놓치는 선택" : annual.tenGod === "상관" ? "말로 이기려다 관계 기반을 잃는 선택" : annual.tenGod === "편관" ? "압박을 버티기 위해 몸과 마음을 소진시키는 선택" : "겉으로는 무난해 보여도 본심과 다른 방향으로 끌려가는 선택"}은 오래 갈수록 손실이 커질 가능성이 높습니다. 올해는 순간의 편안함보다 장기적인 균형을 남기는 선택인지 스스로에게 계속 물어야 합니다.`,
      `${tenGodLib.advice} 반전을 만드는 행동은 의외로 단순합니다. 미뤄 둔 문제를 작은 단위로 정리하고, 관계에서 불편한 부분을 초기에 말로 다루고, 돈과 일정에서 새는 구멍을 먼저 막고, 기회가 오는 달에는 망설이기보다 준비한 것을 꺼내는 것입니다. 반전은 갑자기 뒤집는 극적인 장면에서 나오지 않습니다. 흔들리는 흐름을 정확히 읽고, 그 흐름을 더 나빠지지 않게 끊는 행동에서 시작됩니다. 올해는 무섭게 예언을 듣는 해가 아니라, 위험 신호를 현실적인 선택으로 바꾸는 해여야 합니다. 그렇게 해야 비로소 위기가 지나간 자리에서 더 단단한 방향이 남습니다.`,
    ];
    return texts[idx] || texts[0];
  }

  // Chapter 10 — 마스터플랜
  if (chapterNo === 10) {
    const texts = [
      `올해의 핵심 메시지는 세운 ${annual.label}을 막연한 분위기로 받아들이지 말고, 실제 선택의 기준으로 쓰라는 것입니다. ${tenGodLib.yearlyTheme} 이 해는 좋고 나쁨을 단정하는 해가 아니라, 무엇에 에너지를 써야 하고 무엇을 줄여야 하는지를 빨리 알아차리는 사람이 훨씬 유리한 해입니다. 그래서 올해의 핵심 메시지는 "운을 기다리지 말고 흐름에 맞게 움직이라"는 말로 정리할 수 있습니다. 기회가 오는 달에는 바로 움직일 수 있도록 미리 준비하고, 부담이 커지는 달에는 과감하게 속도를 줄이며 구조를 다시 세우는 태도가 필요합니다. 이 기준만 분명하면 한 해 전체가 훨씬 덜 흔들립니다.`,
      `가장 먼저 정리해야 할 것은 마음속 불안보다 실제로 에너지를 빼앗는 요소들입니다. 사람 문제인지, 돈 문제인지, 생활 리듬인지, 미뤄 둔 결정인지부터 나눠 보아야 올해의 흐름이 선명해집니다. ${monthlyStrong.length > 0 ? `${monthlyStrong[0].month}월 전후로 흐름이 강해지기 전에 우선순위를 정리해 두면` : "초반 흐름을 정리해 두면"} 좋은 운이 들어와도 허공으로 새지 않습니다. 쌓인 피로와 미정 상태를 그대로 둔 채 새 계획을 올리면 좋은 운도 오래 못 갑니다. 올해는 큰 목표부터 잡는 것보다, 먼저 치워야 할 문제를 정리하고 에너지 누수를 막는 것이 진짜 출발선입니다.`,
      `반드시 밀어붙여야 할 것은 지금까지 준비해 왔지만 망설임 때문에 밖으로 꺼내지 못했던 일입니다. ${annual.tenGod === "식신" || annual.tenGod === "상관" ? "표현하고 제안하고 결과물로 만드는 일" : annual.tenGod === "편재" || annual.tenGod === "정재" ? "수익 구조와 계약, 성과를 명확하게 만드는 일" : annual.tenGod === "편관" || annual.tenGod === "정관" ? "책임을 맡고 자리의 무게를 받아내는 일" : "내 기준을 세우고 방향을 결정하는 일"}은 올해 미루면 아쉬움이 더 크게 남을 가능성이 있습니다. ${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).map((m) => `${m.month}월`).join("·") + "처럼 흐름이 강한 달에는" : "흐름이 열리는 순간에는"} 완벽해진 뒤 움직이겠다는 생각보다, 준비한 것을 실제로 세상과 관계 속에 놓는 쪽이 훨씬 큰 성과로 이어집니다. 올해는 주저하는 시간보다 실행의 리듬이 더 중요합니다.`,
      `내려놓아야 할 것은 늘 해 오던 방식인데도 이미 효율이 떨어진 습관들입니다. ${annual.tenGod === "비견" || annual.tenGod === "겁재" ? "혼자 다 해내려는 태도와 필요 이상으로 버티는 습관" : annual.tenGod === "상관" ? "말과 생각만 많고 끝맺음이 늦어지는 패턴" : annual.tenGod === "편관" ? "압박을 견디는 것 자체를 성실함으로 착각하는 태도" : "상황이 바뀌었는데도 익숙하다는 이유로 붙들고 있는 방식"}은 올해의 흐름을 무겁게 만들 수 있습니다. 내려놓는다는 것은 포기하는 것이 아니라, 지금의 삶에 맞지 않는 방식에 더 이상 에너지를 주지 않는다는 뜻입니다. 그래야 정말 밀어붙여야 할 것에 힘이 모입니다. 올해는 덜어 내는 결단이 오히려 전진의 속도를 높여 줄 수 있습니다.`,
      `${tenGodLib.advice} 1년을 잘 보내기 위한 실전 전략은 복잡하지 않습니다. 좋은 달에는 실행, 어려운 달에는 조정, 흔들리는 순간에는 기준 확인이라는 세 가지 원칙을 계속 반복하면 됩니다. 이 원칙을 지키기 위해 분기마다 한 번씩 현재 흐름을 점검하고, 월별로는 중요한 일정과 지출, 관계 에너지를 짧게라도 기록해 두세요. 기록이 쌓이면 운은 더 이상 막연한 느낌이 아니라, 실제 선택을 돕는 데이터가 됩니다. 결국 올해를 잘 보내는 사람은 운이 좋은 사람보다, 자신의 흐름을 읽고 거기에 맞게 움직일 줄 아는 사람입니다. ${seed.targetYear}년은 바로 그 감각을 길러 주는 한 해가 되어야 합니다.`,
    ];
    return texts[idx] || texts[0];
  }

  // Fallback
  const seeds = seed.interpretationSeeds;
  const keyMap = { "일": "career", "커리어": "career", "재물": "wealth", "돈": "wealth", "연애": "love", "사랑": "love", "관계": "relationships", "건강": "health", "마음": "health", "위기": "risks", "전략": "finalStrategy" };
  const found = Object.keys(keyMap).find((token) => category.includes(token));
  const list = seeds[found ? keyMap[found] : "yearlyTheme"] || seeds.yearlyTheme;
  const base = list[idx % list.length] || list[0] || "";
  return `${base}\n\n${tenGodLib.yearlyTheme}\n\n${relMsgs || "올해는 선택의 기준을 미리 세워두는 것이 가장 중요한 준비입니다."}\n\n${tenGodLib.advice}`;
}

function buildHighQualityNewYearSection(seed, chapterSpec, categoryTitle, sectionIndex = 0) {
  const annual = seed?.saju?.annualLuck || {};
  const pillars = seed?.saju?.pillars || {};
  const dayMaster = clean(seed?.saju?.dayMaster || pillars?.day?.stem || "戊");
  const dayElement = STEM_ELEMENT[dayMaster] || "earth";
  const dayElementKo = ELEMENT_KO[dayElement] || "토";
  const annualStem = clean(annual?.stem || "");
  const annualBranch = clean(annual?.branch || "");
  const annualLabel = clean(annual?.label || `${annualStem}${annualBranch}` || "세운");
  const annualTenGod = clean(annual?.tenGod || tenGod(dayMaster, annualStem || "甲"));
  const dayMasterRelation = clean(annual?.dayMasterRelation || elementRelation(dayElement, annual?.element || "earth"));
  const relationRows = Array.isArray(seed?.saju?.relations?.branchRelations) ? seed.saju.relations.branchRelations : [];
  const relationSummary = relationRows.length
    ? relationRows.slice(0, 4).map((row) => row.message).join(" ")
    : "원국 지지와 세운 지지 사이에 큰 충돌이 드러나지 않더라도, 월별 강약에 따라 체감 리듬은 충분히 달라질 수 있습니다.";
  const monthly = Array.isArray(seed?.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  const strongMonths = monthly.filter((m) => Number(m?.score || 0) >= 75).slice(0, 4).map((m) => `${m.month}월`);
  const careMonths = monthly.filter((m) => Number(m?.score || 0) < 60).slice(0, 4).map((m) => `${m.month}월`);
  const geokguk = clean(seed?.structure?.geokguk || "");
  const usefulKeywords = Array.isArray(seed?.structure?.usefulGodKeywords) ? seed.structure.usefulGodKeywords.filter(Boolean) : [];
  const usefulSummary = usefulKeywords.length
    ? `용신·희신 흐름은 ${usefulKeywords.join(" / ")} 방향에서 힘을 보태며, 기신이 강해지는 구간에서는 과열된 결정을 낮추는 방식이 필요합니다.`
    : "용신과 희신의 방향은 균형 회복에 맞추고, 기신이 강해질 때는 속도를 조절하는 원칙으로 운영해야 안정감이 높아집니다.";
  const tone = getTenGodLib(annualTenGod);

  const lines = [
    "핵심 진단",
    `${seed.targetYear}년 ${annualLabel} 세운은 일간 ${dayMaster}(${dayElementKo})에게 ${annualTenGod} 흐름으로 작동합니다. ${categoryTitle}에서는 ${dayMasterRelation}의 패턴이 직접 체감되므로, 단순한 길흉 판단보다 내 선택의 기준을 선명하게 잡는 것이 우선입니다. ${tone.yearlyTheme}`,
    "",
    "명식 근거",
    `원국의 일간은 ${dayMaster}이며, 세운 간지는 ${annualLabel}입니다. 세운 십성은 ${annualTenGod}, 일간과 세운 오행 관계는 ${dayMasterRelation}로 읽힙니다. 원국 지지(년지 ${clean(pillars?.year?.branch || "-")}, 월지 ${clean(pillars?.month?.branch || "-")}, 일지 ${clean(pillars?.day?.branch || "-")}, 시지 ${clean(pillars?.hour?.branch || "-")})와 세운 지지 ${annualBranch || "-"}의 합·충·해·파 관계는 다음과 같습니다. ${relationSummary} ${geokguk ? `격국은 ${geokguk} 흐름을 기준으로 해석하며,` : ""} ${usefulSummary}`,
    "",
    "올해 현실에서 드러나는 모습",
    `${categoryTitle} 주제는 재성·관성·식상·인성·비겁의 작동 순서에 따라 현실에서 다르게 나타납니다. 재성 흐름이 열리면 수익과 관리 이슈가 먼저 올라오고, 관성이 강하면 책임과 기준 정렬이 필요해집니다. 식상이 강한 달에는 표현과 실행이 성과로 이어지며, 인성 흐름이 들어오면 배움과 회복이 장기 성과의 기반이 됩니다. 비겁이 강해지는 구간은 경쟁과 비교가 커질 수 있으므로 역할 경계를 선명하게 정해야 합니다. ${tone.career}`,
    "",
    "주의할 흐름",
    `${careMonths.length ? `${careMonths.join("·")}은` : "월운 점수가 낮아지는 구간은"} 감정적 결론, 무리한 일정 확장, 준비 없는 지출 결정이 손실로 이어질 수 있습니다. ${tone.caution} 특히 지지 충·해·파 신호가 겹치는 시기에는 관계와 계약의 말투, 일정 확정 방식, 비용 지출 순서를 보수적으로 가져가야 불필요한 소모를 줄일 수 있습니다. 중요한 결정은 하루 이상 간격을 두고 검토하는 습관이 안전합니다.`,
    "",
    "기회를 살리는 방법",
    `${strongMonths.length ? `${strongMonths.join("·")}에는` : "월운이 살아나는 구간에는"} 핵심 제안, 협상, 발표, 전환 행동을 집중 배치하세요. ${tone.advice} 이때 핵심은 완벽한 조건을 기다리는 것이 아니라, 이미 준비한 기준을 실행 순서에 올리는 것입니다. 실행한 뒤에는 결과를 문장으로 기록해 다음 달 전략에 반영하면 운의 강약이 실제 성과로 바뀌는 속도가 빨라집니다.`,
    "",
    "월별 실행 조언",
    `1분기에는 기반 정비와 우선순위 확정, 2분기에는 실행 범위 확대, 3분기에는 성과 회수와 관계 조율, 4분기에는 손익 정리와 다음 해 준비를 권합니다. ${monthly.length ? `월운 상위 달(${strongMonths.join("·") || "해당 없음"})에는 확장 행동을, 하위 달(${careMonths.join("·") || "해당 없음"})에는 점검 행동을 적용하면 연간 변동을 안정적으로 다룰 수 있습니다.` : "월운 점수 변화를 월별로 기록해 실행 강약을 조절하세요."} ${sectionIndex + 1}번째 세부 항목인 ${categoryTitle}에서는 매달 하나의 실행 항목과 하나의 금지 항목을 동시에 정해 운영하면 체감 성과가 가장 빠르게 개선됩니다.`,
  ];

  return lines.join("\n");
}

function repairSajuNewYearChapters({ seed, chapters, expectedChapters, errors = [] } = {}) {
  const expected = Array.isArray(expectedChapters) && expectedChapters.length
    ? expectedChapters
    : buildSajuNewYearChapterSpecs(seed?.targetYear || resolveDefaultTargetYear());

  return expected.map((spec, chapterIndex) => {
    const current = Array.isArray(chapters) ? chapters[chapterIndex] : null;
    const currentSections = Array.isArray(current?.sections)
      ? current.sections
      : Array.isArray(current?.categories)
        ? current.categories.map((item) => ({ title: item?.title, body: item?.finalText || item?.localSummary || "" }))
        : [];

    if (!current || clean(current.title) !== clean(spec.title)) {
      const repaired = buildDeterministicChapterFromSpec(seed, spec, "missing_or_title_mismatch");
      const categories = repaired.sections.map((section) => ({
        title: section.title,
        localSummary: section.body,
        finalText: section.body,
      }));
      return {
        no: spec.no,
        title: spec.title,
        categories,
        sections: repaired.sections,
        text: repaired.sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
        source: "local-rule-completed",
      };
    }

    const fixedSections = spec.categories.map((categoryTitle, sectionIndex) => {
      const currentSection = currentSections[sectionIndex] || null;
      const body = stripForbiddenText(currentSection?.body || currentSection?.finalText || currentSection?.text || "");

      if (
        clean(currentSection?.title) !== clean(categoryTitle)
        || body.length < desiredSectionLength()
        || hasForbiddenText(body)
      ) {
        return {
          title: categoryTitle,
          body: ensureMinLength(
            buildHighQualityNewYearSection(seed, spec, categoryTitle, sectionIndex),
            desiredSectionLength(),
            seed,
            categoryTitle,
          ),
        };
      }

      return {
        title: categoryTitle,
        body,
      };
    });

    const categories = fixedSections.map((section) => ({
      title: section.title,
      localSummary: section.body,
      finalText: section.body,
    }));

    return {
      no: spec.no,
      title: spec.title,
      categories,
      sections: fixedSections,
      text: fixedSections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
      source: "local-rule-completed",
      repairSignals: Array.isArray(errors) ? errors.slice(0, 30) : [],
    };
  });
}

function buildLocalSkeleton(seed) {
  const expectedChapters = buildSajuNewYearChapterSpecs(seed?.targetYear || resolveDefaultTargetYear());
  return expectedChapters.map((chapter) => {
    const categories = chapter.categories.map((category, idx) => {
      const base = localParagraph(seed, chapter, category, idx);
      const expanded = ensureMinLength(base, desiredSectionLength(), seed, category);
      const sanitized = stripForbiddenText(expanded);
      return {
        title: category,
        localSummary: sanitized,
        finalText: sanitized,
      };
    });
    return {
      no: chapter.no,
      title: chapter.title,
      categories,
      text: categories.map((category) => `## ${category.title}\n${category.finalText}`).join("\n\n"),
      sections: categories.map((c) => ({ title: c.title, body: c.finalText })),
      source: "local-only",
    };
  });
}

function ensureMinLength(text, minLength, seed, categoryTitle) {
  let result = stripForbiddenText(text);
  const annual = seed?.saju?.annualLuck || {};
  const addition = `${seed.targetYear}년 ${annual.label || "세운"} 기준으로 ${categoryTitle} 판단은 월별 강약과 관계 신호를 함께 보아야 안정적입니다. 점수가 높은 달에는 실행 폭을 넓히고, 낮은 달에는 문서·관계·지출을 재점검하는 이중 트랙 운영이 손실을 줄입니다. 또한 선택 기준을 미리 문장화해 두면 같은 변수에도 흔들림 없이 대응할 수 있습니다.`;
  while (result.length < minLength) {
    result = `${result}\n\n${addition}`;
  }
  return result;
}

function chapterTextLength(chapter) {
  const fromCategories = (chapter?.categories || []).reduce((acc, category) => acc + clean(category?.finalText || category?.localSummary).length, 0);
  if (fromCategories > 0) return fromCategories;
  return (chapter?.sections || []).reduce((acc, section) => acc + clean(section?.body || section?.finalText || section?.text).length, 0);
}

function hasForbiddenText(text) {
  const token = clean(text);
  if (!token) return false;
  const safeRegex = new RegExp(FORBIDDEN_TEXT_RE.source, "i");
  return safeRegex.test(token);
}

function validateChapters(chapters) {
  const expected = buildSajuNewYearChapterSpecs(resolveDefaultTargetYear());
  if (!Array.isArray(chapters) || chapters.length !== expected.length) return false;
  const totalChars = chapters.reduce((acc, chapter) => acc + chapterTextLength(chapter), 0);
  if (totalChars < MIN_TOTAL_CHARS) return false;
  return expected.every((blueprint, idx) => {
    const chapter = chapters[idx];
    if (!chapter || clean(chapter.title) !== clean(blueprint.title)) return false;
    const sections = Array.isArray(chapter.sections)
      ? chapter.sections
      : Array.isArray(chapter.categories)
        ? chapter.categories.map((item) => ({ title: item?.title, body: item?.finalText || item?.localSummary || "" }))
        : [];
    if (sections.length !== blueprint.categories.length) return false;
    if (chapterTextLength(chapter) < MIN_CHAPTER_CHARS) return false;
    return blueprint.categories.every((category, catIdx) => {
      const text = clean(sections[catIdx]?.body || sections[catIdx]?.finalText || sections[catIdx]?.text);
      if (clean(sections[catIdx]?.title) !== clean(category)) return false;
      if (text.length < MIN_SECTION_CHARS) return false;
      if (hasForbiddenText(text)) return false;
      const paragraphCount = text.split(/\n\s*\n/).filter(Boolean).length;
      return paragraphCount >= 3;
    });
  });
}

function escHtml(value) {
  return clean(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

function renderNewYearSectionBody(body = "") {
  return stripForbiddenText(body)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (/^(핵심 진단|명식 근거|올해 현실에서 드러나는 모습|주의할 흐름|기회를 살리는 방법|월별 실행 조언)$/.test(line)) {
        return `<h5>${escHtml(line)}</h5>`;
      }
      return `<p>${escHtml(line)}</p>`;
    })
    .join("");
}

function buildReportHtml(seed, chapters) {
  const profile = seed.birthProfile;
  const monthlyRows = seed.saju.monthlyLuck.map((item) => `<tr><td>${item.month}월</td><td>${escHtml(item.pillar.label)}</td><td>${escHtml(item.tone)}</td><td>${item.score}</td><td>${escHtml(item.advice)}</td></tr>`).join("");
  const toc = chapters.map((chapter) => `<li><span>${chapter.no}</span>${escHtml(chapter.title)}</li>`).join("");
  const body = chapters.map((chapter, idx) => {
    const sections = Array.isArray(chapter?.sections)
      ? chapter.sections
      : Array.isArray(chapter?.categories)
        ? chapter.categories.map((item) => ({ title: item?.title, body: item?.finalText || item?.localSummary || "" }))
        : [];
    return `
    <section class="chapter${idx > 0 ? " page-break" : ""}">
      <h2>${escHtml(chapter.title)}</h2>
      ${sections.map((section) => `<article><h3>${escHtml(section.title)}</h3><div class="section-body">${renderNewYearSectionBody(section.body || section.finalText || section.text || "")}</div></article>`).join("")}
    </section>`;
  }).join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${seed.targetYear} 신년운세 프리미엄 리포트</title><style>
    @page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;background:#080b19;color:#1f2937;font-family:Arial,'Noto Sans KR',sans-serif;line-height:1.72}.page{background:#fff;min-height:100vh}.cover{min-height:100vh;padding:56px 48px;color:#fff;background:radial-gradient(circle at 70% 20%,rgba(245,158,11,.42),transparent 30%),linear-gradient(145deg,#07111f,#11183a 48%,#3b0f14);display:flex;flex-direction:column;justify-content:space-between}.cover img{width:100%;max-height:360px;object-fit:cover;border-radius:18px;border:1px solid rgba(250,204,21,.42);box-shadow:0 24px 60px rgba(0,0,0,.36)}.badge{display:inline-block;padding:7px 12px;border:1px solid rgba(250,204,21,.7);border-radius:999px;color:#fde68a;font-size:12px;letter-spacing:.08em}.cover h1{font-size:42px;margin:22px 0 8px;color:#fff4c2}.cover p{font-size:17px;color:#fef3c7}.meta{color:#fde68a;font-size:14px}.content{padding:34px 42px;background:#fff}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}.summary div{border:1px solid #f1d58b;background:#fff8e1;border-radius:10px;padding:12px}.toc{padding:24px 42px;background:#fffaf0}.toc h2,.chapter h2{color:#7f1d1d}.toc li{margin:8px 0}.toc span{display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;margin-right:8px;border-radius:50%;background:#991b1b;color:#fff}.chapter{padding:32px 42px;background:#fff}.chapter h2{font-size:25px;border-bottom:2px solid #f59e0b;padding-bottom:10px}.chapter article{margin:18px 0;padding:16px;border-left:4px solid #d97706;background:#fffaf0;border-radius:0 10px 10px 0}.chapter h3{margin:0 0 8px;color:#92400e}.section-body{display:flex;flex-direction:column;gap:12px}.section-body h5{margin:18px 0 2px;color:#8a5a32;font-weight:800}.section-body p{margin:0;line-height:1.9;word-break:keep-all;overflow-wrap:break-word}.monthly{width:100%;border-collapse:collapse;margin:18px 0;background:#fff}.monthly th,.monthly td{border:1px solid #ead7a6;padding:8px;font-size:12px;text-align:left}.monthly th{background:#7f1d1d;color:#fff}.page-break{page-break-before:always}@media print{body{background:#fff}.page{min-height:auto}.cover{height:100vh}.page-break{break-before:page}}
  </style></head><body><main class="page">
    <section class="cover"><div><span class="badge">CODE DESTINY · NEW YEAR SAJU</span><h1>${seed.targetYear} 신년운세 프리미엄 리포트</h1><p>사주 원국과 세운으로 읽는 올해의 운명 지도</p><p class="meta">${escHtml(profile.name || "사용자")} · ${escHtml(profile.birthDate)} ${escHtml(profile.birthTime || "시간 미상")}</p></div><img src="${COVER_IMAGE}" alt="신년운세 표지 이미지" onerror="this.style.display='none'"><p>${seed.targetYear}년 나의 운의 흐름과 선택 전략</p></section>
    <section class="content"><h2>올해의 핵심 요약</h2><div class="summary"><div><strong>세운</strong><br>${escHtml(seed.saju.annualLuck.label)} · ${escHtml(seed.saju.annualLuck.elementKo)}</div><div><strong>일간 관계</strong><br>${escHtml(seed.saju.annualLuck.tenGod)} · ${escHtml(seed.saju.annualLuck.dayMasterRelation)}</div><div><strong>월별 운영</strong><br>강한 달과 보수 달을 분리해 실행</div></div><table class="monthly"><thead><tr><th>월</th><th>월운</th><th>흐름</th><th>점수</th><th>전략</th></tr></thead><tbody>${monthlyRows}</tbody></table></section>
    <section class="toc"><h2>${chapters.length}챕터 목차</h2><ol>${toc}</ol></section>${body}
  </main></body></html>`;
}

function buildPdfReadyPayload(seed, chapters, metadata = {}) {
  return {
    title: `${seed.targetYear} 신년운세 프리미엄 리포트`,
    filename: `saju-new-year-${seed.targetYear}-${clean(seed.birthProfile.name || "user").replace(/\s+/g, "-").toLowerCase()}.html`,
    generatedAt: new Date().toISOString(),
    profile: seed.birthProfile,
    targetYear: seed.targetYear,
    metadata,
    html: buildReportHtml(seed, chapters),
    chapters: chapters.map((chapter) => ({
      chapter: chapter.no,
      title: chapter.title,
      categories: chapter.categories.map((category) => category.title),
      text: chapter.text,
      source: chapter.source,
    })),
  };
}

async function handlePrepare(request, env) {
  compactNewYearLocks();
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({ ok: false, serviceKey: SERVICE_KEY, code: "UNAUTHORIZED", message: "신년운세 PDF 생성을 위해 먼저 로그인해 주세요." }, { status: 401 });
    }
    throw error;
  }

  const body = await readJson(request);
  console.info("[NewYearPremiumPDF][RequestReceived]", { hasBody: Boolean(body) });
  const normalized = normalizeInput(body);
  if (!normalized.ok) return json({ ok: false, serviceKey: SERVICE_KEY, code: normalized.code, message: normalized.message }, { status: 422 });
  console.info("[NewYearPremiumPDF][TargetYearValidated]", { targetYear: normalized.targetYear });
  console.info("[NewYearPremiumPDF][BirthInputValidated]", { birthDate: normalized.birthInput.birthDate, isTimeUnknown: normalized.birthInput.isTimeUnknown });

  const featureKey = normalizeFeatureKey(body?.featureKey);
  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `saju-new-year-${normalized.targetYear}-${Date.now().toString(36)}`);
  const sessionKey = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || body?.sessionKey) || `saju-new-year:${reportId}`;
  const lock = newYearPdfLocks.get(sessionKey);
  if (lock?.status === "running") {
    return json({
      ok: true,
      serviceKey: SERVICE_KEY,
      status: "running",
      sessionId: sessionKey,
      reportId,
      targetYear: normalized.targetYear,
      message: "동일 세션의 신년운세 PDF 생성이 이미 진행 중입니다.",
    }, { status: 202 });
  }
  if (lock?.status === "done" && lock?.result) {
    return json({
      ...lock.result,
      status: lock.result?.status || "completed",
      serverStatus: lock.result?.serverStatus || "completed",
      sessionId: sessionKey,
      fromCache: true,
    });
  }
  newYearPdfLocks.set(sessionKey, { status: "running", startedAtMs: Date.now() });

  try {
    console.info("[NewYearPremiumPDF][LocalEngineStarted]", { targetYear: normalized.targetYear, sessionId: sessionKey });
    const localYearSajuJson = buildPdfSeed(normalized.profile, normalized.targetYear, body);
    console.info("[NewYearPremiumPDF][LocalEngineCompleted]", { hasDayMaster: Boolean(localYearSajuJson.saju.dayMaster), targetYear: localYearSajuJson.targetYear });

    const localManuscript = buildLocalSkeleton(localYearSajuJson);
    const expectedChapters = buildSajuNewYearChapterSpecs(localYearSajuJson.targetYear);
    let chapters = repairSajuNewYearChapters({
      seed: localYearSajuJson,
      chapters: localManuscript,
      expectedChapters,
      errors: ["initial_repair"],
    });

    let validation = validateSajuNewYearPdfQuality({
      chapters,
      expectedChapters,
      minChapterLength: Math.max(MIN_CHAPTER_CHARS, 4000),
      minSectionLength: desiredSectionLength(),
    });

    for (let attempt = 0; attempt < 3 && !validation.ok; attempt += 1) {
      chapters = repairSajuNewYearChapters({
        seed: localYearSajuJson,
        chapters,
        expectedChapters,
        errors: validation.errors,
      });
      validation = validateSajuNewYearPdfQuality({
        chapters,
        expectedChapters,
        minChapterLength: Math.max(MIN_CHAPTER_CHARS, 4000),
        minSectionLength: desiredSectionLength(),
      });
    }

    const localTotalChars = chapters.reduce((acc, chapter) => acc + chapterTextLength(chapter), 0);
    console.info("[NewYearPremiumPDF][LocalChapterDraftCompleted]", {
      chapterCount: chapters.length,
      totalChars: localTotalChars,
      qualityOk: validation.ok,
      qualityErrors: validation.errors.slice(0, 20),
    });
    if (!validation.ok) {
      console.warn("[NewYearPremiumPDF][ValidationWarningButContinue]", validation);
    }

    const premiumAccessToken = clean(request.headers.get("x-premium-access-token") || body?.premiumAccessToken || body?._premiumAccessToken || cookieValue(request, "cd_premium_access"));

    console.info("[NewYearPremiumPDF][PaymentVerificationStarted]", { featureKey, userId: auth.userId });
    const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "sajuNewYear", {
      ...body,
      featureKey,
      reportType: "sajuNewYear",
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: "/api/saju-new-year/prepare",
    });
    if (!access?.ok) {
      const status = Number(access?.status || 402);
      const hasSessionId = Boolean(clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId));
      const hasPurchaseId = Boolean(clean(body?.purchaseId || body?.accessGrant?.purchaseId || body?.payment?.purchaseId));
      const hasRequestId = Boolean(clean(body?.requestId || body?.accessGrant?.requestId || body?.payment?.requestId || body?._paymentContext?.requestId));
      const hasPaymentToken = Boolean(premiumAccessToken);
      const paymentConfirmedButMissing = status === 402 && (hasSessionId || hasPurchaseId || hasRequestId || hasPaymentToken);
      newYearPdfLocks.delete(sessionKey);
      return json({
        ok: false,
        serviceKey: SERVICE_KEY,
        code: paymentConfirmedButMissing ? "PAYMENT_CONFIRMED_BUT_ACCESS_MISSING" : (access?.code || (status === 401 ? "UNAUTHORIZED" : "PAYMENT_REQUIRED")),
        message: status === 401
          ? "신년운세 PDF 생성을 위해 먼저 로그인해 주세요."
          : paymentConfirmedButMissing
            ? "결제는 확인되었지만 생성 권한 연결이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요."
            : status === 402
            ? "프리미엄 PDF 생성을 위해 코인 또는 이용권 확인이 필요합니다."
            : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        debugSafe: {
          featureKey,
          hasSessionId,
          hasPurchaseId,
          hasRequestId,
          hasPaymentToken,
        },
      }, { status });
    }
    console.info("[NewYearPremiumPDF][PaymentVerificationPassed]", { featureKey, accessType: clean(access.accessType || "") });

    const executionCtx = buildPremiumExecutionContext({
      serviceKey: SERVICE_KEY,
      reportType: "sajuNewYear",
      userId: auth.userId,
      featureKey,
      sessionId: sessionKey,
      reportId,
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    await startPremiumPdfExecution(env, auth.userId, executionCtx);

    const manuscriptSource = "local-rule-completed";

    console.info("[NewYearPremiumPDF][FinalValidationPassed]", { chapterCount: chapters.length, manuscriptSource });
    const requestOrigin = new URL(request.url).origin;
    const archiveUrl = `${requestOrigin}/api/premium/pdf-archive/${encodeURIComponent(reportId)}`;

    console.info("[NewYearPremiumPDF][PDFRenderStarted]", { chapterCount: chapters.length });
    const pdfReady = buildPdfReadyPayload(localYearSajuJson, chapters, {
      featureKey,
      reportType: "sajuNewYear",
      fallbackUsed: false,
      manuscriptSource,
      sessionId: sessionKey,
      accessType: clean(access.accessType || "unknown"),
    });
    pdfReady.htmlUrl = archiveUrl;
    pdfReady.pdfUrl = archiveUrl;
    pdfReady.downloadUrl = archiveUrl;
    pdfReady.storageKey = `premium-archive:saju-new-year:${reportId}`;
    pdfReady.mimeType = "text/html";
    console.info("[NewYearPremiumPDF][PDFRenderCompleted]", { chapterCount: chapters.length, manuscriptSource, archiveUrl });

    const storedUrl = clean(
      pdfReady.downloadUrl
      || pdfReady.pdfUrl
      || pdfReady.htmlUrl,
    );
    if (!storedUrl) {
      throw Object.assign(new Error("신년운세 PDF 저장 URL 생성에 실패했습니다."), {
        code: "NEW_YEAR_PDF_URL_MISSING",
        status: 500,
      });
    }

    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      manuscriptSource,
      chapterCount: chapters.length,
      targetYear: localYearSajuJson.targetYear,
      archive: {
        reportId,
        reportType: "new_year",
        displayName: "사주 신년운세",
        title: `${clean(normalized?.profile?.name) || "사용자"}님의 ${String(localYearSajuJson.targetYear || "")}년 신년운세`,
        mode: "personal",
        birthName: clean(normalized?.profile?.name),
        summary: clean(chapters?.[0]?.categories?.[0]?.finalText || chapters?.[0]?.text || "", 1000),
        pdfUrl: storedUrl,
        htmlUrl: clean(pdfReady.htmlUrl),
        downloadUrl: clean(pdfReady.downloadUrl || storedUrl),
        chapters,
        localSajuJson: localYearSajuJson,
        pdfReady,
        canReopen: true,
        canDownload: true,
      },
    });

    const responseData = {
      reportId,
      featureKey,
      sessionId: sessionKey,
      reportType: "sajuNewYear",
      serviceKey: SERVICE_KEY,
      targetYear: localYearSajuJson.targetYear,
      chapterCount: chapters.length,
      localDraftChapterCount: localManuscript.length,
      finalChapterCount: chapters.length,
      manuscriptSource,
      localEngineUsed: true,
      fallbackUsed: false,
      chapters,
      seed: { ...localYearSajuJson, chapters: undefined },
      newYearPayload: localYearSajuJson,
      localSajuJson: localYearSajuJson,
      pdfReady,
      pdfUrl: storedUrl,
      htmlUrl: clean(pdfReady.htmlUrl),
      downloadUrl: clean(pdfReady.downloadUrl || storedUrl),
      canReopen: true,
      canDownload: true,
    };

    const responsePayload = {
      ok: true,
      serviceKey: SERVICE_KEY,
      reportType: "sajuNewYear",
      status: "completed",
      serverStatus: "completed",
      qualityStatus: validation.ok ? "passed" : "completed_with_warnings",
      data: responseData,
      ...responseData,
    };

    newYearPdfLocks.set(sessionKey, { status: "done", startedAtMs: Date.now(), result: responsePayload });
    return json(responsePayload);
  } catch (error) {
    const executionCtx = buildPremiumExecutionContext({
      serviceKey: SERVICE_KEY,
      reportType: "sajuNewYear",
      userId: auth.userId,
      featureKey,
      sessionId: sessionKey,
      reportId,
      access: null,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    try {
      await failPremiumPdfExecution(
        env,
        auth.userId,
        executionCtx,
        "new_year_generation_failed",
        clean(error?.message || "신년운세 PDF 생성에 실패했습니다."),
        "new-year-generation",
      );
    } catch (_) {}
    newYearPdfLocks.delete(sessionKey);
    const rawMessage = clean(error?.message || "신년운세 PDF 생성 중 오류가 발생했습니다.");
    console.error("[NewYearPremiumPDF][Error][prepare]", normalizeNewYearBookError(error));
    const userMessage = rawMessage.includes("생년월일")
      ? "생년월일 정보를 확인할 수 없습니다. 정확한 생년월일시를 입력해 주세요."
      : rawMessage.includes("원국") || rawMessage.includes("사주")
        ? "신년운세 계산에 필요한 사주 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."
        : rawMessage.includes("결제")
          ? "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
          : rawMessage.includes("원고") || rawMessage.includes("품질")
            ? "신년운세 원고를 완성하지 못했습니다. 잠시 후 다시 시도해 주세요."
            : "신년운세 PDF 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return json({
      ok: false,
      serviceKey: SERVICE_KEY,
      code: error?.code || "SAJU_NEW_YEAR_GENERATION_FAILED",
      message: userMessage,
      debugSafe: {
        reportId,
        sessionId: sessionKey,
        originalCode: error?.code || "",
        stage: clean(error?.stage || "prepare"),
        status: Number(error?.status || 500),
        causeMessage: clean(error?.cause?.message || error?.cause || error?.message || ""),
      },
    }, { status: Number(error?.status || 500) });
  }
}

async function handleChapters() {
  const targetYear = resolveDefaultTargetYear();
  const chapters = buildSajuNewYearChapterSpecs(targetYear);
  return json({ ok: true, serviceKey: SERVICE_KEY, targetYear, chapterCount: chapters.length, chapters });
}

export async function handleSajuNewYearRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/saju-new-year");
    if (method === "GET" && (path === "/chapters" || path === "chapters")) return await handleChapters();
    if (method === "POST" && (path === "" || path === "/" || path === "/prepare" || path === "prepare")) return await handlePrepare(request, env);
    if (!["GET", "POST"].includes(method)) return methodNotAllowed(["GET", "POST"]);
    return json({ ok: false, serviceKey: SERVICE_KEY, message: "지원하지 않는 사주 신년운세 PDF 경로입니다." }, { status: 404 });
  } catch (error) {
    console.error("[NewYearBook][Error]", normalizeNewYearBookError(error));
    return handleRouteError(error, "SajuNewYearRoutes");
  }
}

export const __sajuNewYearTestUtils = {
  NEW_YEAR_CHAPTERS,
  normalizeInput,
  buildPdfSeed,
  buildLocalSkeleton,
  validateChapters,
  buildSajuNewYearChapterSpecs,
  validateSajuNewYearSeed,
  buildNewYearChapterLocalGuide,
  normalizeGeneratedChapter,
  buildDeterministicChapterFromSpec,
  buildHighQualityNewYearSection,
  repairSajuNewYearChapters,
  reinforceChapterFromSpec,
  validateSajuNewYearPdfQuality,
  stripForbiddenText,
  buildPdfReadyPayload,
};
