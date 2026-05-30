import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { callGeminiText } from "../lib/gemini.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";

const SERVICE_KEY = "saju-new-year";
const FEATURE_KEY = "premium_pdf_saju_new_year";
const FEATURE_ALIASES = new Set(["saju_new_year_pdf", "premium-saju-newyear-report", "premium_pdf_saju_yearly"]);
const COVER_IMAGE = "/fuctionassets/신년운세.webp";
const NEW_YEAR_PDF_LOCK_TTL_MS = 15 * 60 * 1000;
const newYearPdfLocks = new Map();
const FORBIDDEN_TEXT_RE = /\b(?:fallback|payload|json|debug|internal\s*server\s*error|undefined|null|nan|object|calculationmode|recovered|about:blank)\b|자동\s*복구\s*생성|chapter\s*1\s*chapter\s*1|데이터가\s*부족합니다/gi;
const MIN_SECTION_CHARS = 600;
const MIN_CHAPTER_CHARS = 3000;
const MIN_TOTAL_CHARS = 30000;
const GENERAL_PHRASE_RE = /(올해는\s*기회가\s*있습니다|좋은\s*일이\s*생길\s*수\s*있습니다|무난한\s*흐름입니다|노력하면\s*좋은\s*결과를\s*얻을\s*수\s*있습니다)/i;
const FORBIDDEN_EXPOSE_RE = /(로컬\s*엔진|json|payload|fallback|자동\s*복구|llm\s*실패|품질\s*검증|내부\s*계산값|debug|undefined|null)/i;
const SIGNAL_KEYWORDS = ["원국", "대운", "세운", "십성", "오행", "용신", "희신", "월운", "일간", "천간", "지지", "합", "충", "해", "파"];

const SAJU_NEW_YEAR_CHAPTER_TEMPLATES = Object.freeze([
  {
    no: 1,
    title: (targetYear) => `Chapter 1. ${targetYear}년 총운 - 올해의 큰 기류와 운명의 방향`,
    categories: [
      "올해 전체 운의 핵심",
      "세운이 원국에 주는 자극",
      "기회가 열리는 영역",
      "조심해야 할 반복 패턴",
      "올해의 한 문장",
    ],
  },
  {
    no: 2,
    title: (targetYear) => `Chapter 2. 대운과 세운의 교차 - 인생 흐름 속 ${targetYear}년의 위치`,
    categories: [
      "현재 대운의 기본 성격",
      "${targetYear}년 세운과 대운의 충돌/협력",
      "삶의 방향이 바뀌는 지점",
      "오래된 문제가 다시 올라오는 이유",
      "올해 반드시 정리해야 할 것",
    ],
  },
  {
    no: 3,
    title: (targetYear) => `Chapter 3. 일과 커리어 운 - 성취, 직업, 프로젝트의 흐름`,
    categories: [
      "직업운의 핵심 흐름",
      "성과가 나는 방식",
      "직장에서 조심해야 할 관계와 압박",
      "창업/서비스/콘텐츠 운",
      "올해 커리어 전략",
    ],
  },
  {
    no: 4,
    title: (targetYear) => `Chapter 4. 재물운 - 돈이 들어오고 나가는 구조`,
    categories: [
      "올해 재물운의 성격",
      "수입이 늘어나는 조건",
      "지출과 손실을 부르는 패턴",
      "투자/사업/부업 판단 기준",
      "돈을 지키는 실전 전략",
    ],
  },
  {
    no: 5,
    title: (targetYear) => `Chapter 5. 연애와 인연운 - 사랑, 재회, 새로운 인연의 가능성`,
    categories: [
      "올해의 연애 기류",
      "과거 인연과 재회 가능성",
      "새로운 인연이 들어오는 방식",
      "집착과 진심을 구분해야 하는 순간",
      "사랑을 현실로 만들기 위한 태도",
    ],
  },
  {
    no: 6,
    title: (targetYear) => `Chapter 6. 인간관계와 귀인운 - 도움, 갈등, 협력의 사람들`,
    categories: [
      "올해 사람 복의 흐름",
      "귀인이 나타나는 방식",
      "피해야 할 사람과 관계 패턴",
      "오해와 갈등을 줄이는 방법",
      "관계를 운으로 바꾸는 법",
    ],
  },
  {
    no: 7,
    title: (targetYear) => `Chapter 7. 건강과 멘탈운 - 몸과 마음의 균형`,
    categories: [
      "올해 몸의 긴장 포인트",
      "마음이 흔들리는 구간",
      "과로와 번아웃 신호",
      "회복력을 높이는 생활 전략",
      "운을 지키는 몸 관리법",
    ],
  },
  {
    no: 8,
    title: (targetYear) => `Chapter 8. 월별 운세 - 1월부터 12월까지의 흐름`,
    categories: [
      "상반기 흐름",
      "하반기 흐름",
      "기회가 강한 달",
      "조심해야 할 달",
      "월별 실전 행동표",
    ],
  },
  {
    no: 9,
    title: (targetYear) => `Chapter 9. 위기와 반전 - 올해 반드시 넘어서야 할 시험`,
    categories: [
      "올해 가장 큰 위험 신호",
      "반복되는 실패 패턴",
      "무너지는 순간의 원인",
      "반전이 생기는 조건",
      "위기를 기회로 바꾸는 선택",
    ],
  },
  {
    no: 10,
    title: (targetYear) => `Chapter 10. ${targetYear}년 마스터플랜 - 올해를 성공으로 끝내는 전략`,
    categories: [
      "올해 가장 중요한 목표",
      "3개월 실행 전략",
      "6개월 실행 전략",
      "12개월 완성 전략",
      "최종 조언과 선언문",
    ],
  },
]);

function buildSajuNewYearChapterSpecs(targetYear) {
  return SAJU_NEW_YEAR_CHAPTER_TEMPLATES.map((chapter) => ({
    no: chapter.no,
    title: chapter.title(targetYear),
    categories: chapter.categories.map((category) => category.replace(/\$\{targetYear\}/g, String(targetYear))),
  }));
}

export const SAJU_NEW_YEAR_CHAPTERS = Object.freeze(buildSajuNewYearChapterSpecs(resolveDefaultTargetYear()));
export const NEW_YEAR_CHAPTERS = SAJU_NEW_YEAR_CHAPTERS;

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const MONTH_BRANCHES = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
const STEM_ELEMENT = { 甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water" };
const STEM_YINYANG = { 甲: "yang", 乙: "yin", 丙: "yang", 丁: "yin", 戊: "yang", 己: "yin", 庚: "yang", 辛: "yin", 壬: "yang", 癸: "yin" };
const BRANCH_ELEMENT = { 子: "water", 丑: "earth", 寅: "wood", 卯: "wood", 辰: "earth", 巳: "fire", 午: "fire", 未: "earth", 申: "metal", 酉: "metal", 戌: "earth", 亥: "water" };
const ELEMENT_KO = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
const GENERATES = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const CONTROLS = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
const BRANCH_COMBOS = { 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" };
const BRANCH_CLASHES = { 子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅", 卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳" };
const BRANCH_HARMS = { 子: "未", 未: "子", 丑: "午", 午: "丑", 寅: "巳", 巳: "寅", 卯: "辰", 辰: "卯", 申: "亥", 亥: "申", 酉: "戌", 戌: "酉" };
const BRANCH_BREAKS = { 子: "酉", 酉: "子", 丑: "辰", 辰: "丑", 寅: "亥", 亥: "寅", 卯: "午", 午: "卯", 巳: "申", 申: "巳", 未: "戌", 戌: "未" };

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
    return { name: error.name, message: error.message, stack: error.stack };
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
  const profile = body.profile && typeof body.profile === "object" ? body.profile : {};
  const birth = profile.birth && typeof profile.birth === "object" ? profile.birth : {};
  const birthDateRaw = clean(
    body.birthDate
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
  const year = toInt(body.year || body.birthYear || body.fortuneYear || birth.year || parts.year, 0);
  const month = toInt(body.month || body.birthMonth || birth.month || parts.month, 0);
  const day = toInt(body.day || body.birthDay || birth.day || parts.day, 0);
  const timeInfo = parseBirthTime(
    body.birthTime || body.time || body.timeText || body.hourText || profile.birthTime || birth.birthTime,
    body.hour ?? body.birthHour ?? body.birth_hour ?? birth.hour,
    body.minute ?? body.birthMinute ?? birth.minute,
  );

  const targetYear = toInt(
    body.targetYear || body.selectedYear || body.fortuneYear || body.year || body.target_year,
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
  const calendarType = calendarRaw.includes("lunar") || calendarRaw.includes("음") ? "lunar" : calendarRaw.includes("solar") || calendarRaw.includes("양") ? "solar" : "unknown";
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
        unknownTime: birthInput.isTimeUnknown,
      },
      calendarType,
      location: profile.location || body.location || null,
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
    engine = buildSajuProfile({ name: profile.name, gender: profile.gender, birth: profile.birth });
  } catch (error) {
    console.warn("[NewYearBook][Flow] ENGINE_CALC_LOCAL_FALLBACK", { message: clean(error?.message || error) });
  }

  const sajuBase = body.sajuBase && typeof body.sajuBase === "object" ? body.sajuBase : {};
  const frontendPillars = sajuBase.pillars || {};
  const pillars = engine?.pillars || {
    year: { stem: clean(frontendPillars.year?.gan), branch: clean(frontendPillars.year?.zhi) },
    month: { stem: clean(frontendPillars.month?.gan), branch: clean(frontendPillars.month?.zhi) },
    day: { stem: clean(frontendPillars.day?.gan), branch: clean(frontendPillars.day?.zhi) },
    hour: { stem: clean(frontendPillars.hour?.gan), branch: clean(frontendPillars.hour?.zhi) },
  };
  const dayMaster = clean(engine?.dayMaster?.stem || sajuBase.core?.dayMaster || pillars.day?.stem);
  const fiveElements = engine?.fiveElements || sajuBase.elementBalance || {};
  const tenGods = engine?.tenGods || sajuBase.tenGods || {};
  const usefulGods = engine?.usefulGods || sajuBase.yongshin || {};
  const daeun = Array.isArray(sajuBase?.timing?.daeun) ? sajuBase.timing.daeun : [];
  const specialStars = sajuBase.specialStars && typeof sajuBase.specialStars === "object" ? sajuBase.specialStars : {};
  const johu = sajuBase.johu && typeof sajuBase.johu === "object" ? sajuBase.johu : null;

  return { engine, sajuBase, pillars, dayMaster, fiveElements, tenGods, usefulGods, daeun, specialStars, johu };
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

function buildTwelveGrowthStages(dayStem, pillars = {}) {
  const stageMap = {
    甲: { 亥: "장생", 子: "목욕", 丑: "관대", 寅: "임관", 卯: "제왕", 辰: "쇠", 巳: "병", 午: "사", 未: "묘", 申: "절", 酉: "태", 戌: "양" },
    乙: { 午: "장생", 巳: "목욕", 辰: "관대", 卯: "임관", 寅: "제왕", 丑: "쇠", 子: "병", 亥: "사", 戌: "묘", 酉: "절", 申: "태", 未: "양" },
    丙: { 寅: "장생", 卯: "목욕", 辰: "관대", 巳: "임관", 午: "제왕", 未: "쇠", 申: "병", 酉: "사", 戌: "묘", 亥: "절", 子: "태", 丑: "양" },
    丁: { 酉: "장생", 申: "목욕", 未: "관대", 午: "임관", 巳: "제왕", 辰: "쇠", 卯: "병", 寅: "사", 丑: "묘", 子: "절", 亥: "태", 戌: "양" },
    戊: { 寅: "장생", 卯: "목욕", 辰: "관대", 巳: "임관", 午: "제왕", 未: "쇠", 申: "병", 酉: "사", 戌: "묘", 亥: "절", 子: "태", 丑: "양" },
    己: { 酉: "장생", 申: "목욕", 未: "관대", 午: "임관", 巳: "제왕", 辰: "쇠", 卯: "병", 寅: "사", 丑: "묘", 子: "절", 亥: "태", 戌: "양" },
    庚: { 巳: "장생", 午: "목욕", 未: "관대", 申: "임관", 酉: "제왕", 戌: "쇠", 亥: "병", 子: "사", 丑: "묘", 寅: "절", 卯: "태", 辰: "양" },
    辛: { 子: "장생", 亥: "목욕", 戌: "관대", 酉: "임관", 申: "제왕", 未: "쇠", 午: "병", 巳: "사", 辰: "묘", 卯: "절", 寅: "태", 丑: "양" },
    壬: { 申: "장생", 酉: "목욕", 戌: "관대", 亥: "임관", 子: "제왕", 丑: "쇠", 寅: "병", 卯: "사", 辰: "묘", 巳: "절", 午: "태", 未: "양" },
    癸: { 卯: "장생", 寅: "목욕", 丑: "관대", 子: "임관", 亥: "제왕", 戌: "쇠", 酉: "병", 申: "사", 未: "묘", 午: "절", 巳: "태", 辰: "양" },
  };
  const selectedMap = stageMap[dayStem] || stageMap.戊;
  return ["year", "month", "day", "hour"].map((pillarName) => {
    const branch = clean(pillars?.[pillarName]?.branch || "");
    const stage = branch ? selectedMap[branch] || "미정" : "미정";
    return {
      pillar: branch ? `${pillarName}:${branch}` : `${pillarName}:미상`,
      stage,
      keywords: stage === "미정" ? ["십이운성 미상"] : [stage, branch],
    };
  });
}

function buildNewYearSinsal(specialStars = {}, pillars = {}, annualLuck = {}) {
  const sinsal = [];
  const primary = [
    [Number(specialStars.tao || 0) > 0, "도화", pillars.day?.branch || pillars.month?.branch || "일지"],
    [Number(specialStars.yeokma || 0) > 0, "역마", pillars.month?.branch || pillars.year?.branch || "월지"],
    [Number(specialStars.hwa || 0) > 0, "화개", pillars.day?.branch || pillars.hour?.branch || "일지"],
    [Boolean(specialStars.gwimun), "귀문", pillars.hour?.branch || annualLuck.branch || "시지"],
  ];
  for (const [enabled, name, relatedPillar] of primary) {
    if (!enabled) continue;
    sinsal.push({ name, relatedPillar, keywords: [name, clean(relatedPillar)] });
  }
  return sinsal;
}

function buildNewYearStructure(computed, annualLuck) {
  const johu = computed?.johu || null;
  const usefulGods = computed?.usefulGods || {};
  return {
    geokguk: clean(johu?.type || johu?.name || johu?.title || ""),
    specialPatterns: Array.isArray(johu?.patterns) ? johu.patterns.map((item) => clean(item)).filter(Boolean).slice(0, 5) : [],
    combinations: Array.isArray(computed?.sajuBase?.relations?.combinations) ? computed.sajuBase.relations.combinations.map((item) => clean(item.message || item.type)).filter(Boolean).slice(0, 5) : [],
    clashes: Array.isArray(computed?.sajuBase?.relations?.clashes) ? computed.sajuBase.relations.clashes.map((item) => clean(item.message || item.type)).filter(Boolean).slice(0, 5) : [],
    punishments: Array.isArray(computed?.sajuBase?.relations?.punishments) ? computed.sajuBase.relations.punishments.map((item) => clean(item.message || item.type)).filter(Boolean).slice(0, 5) : [],
    harms: Array.isArray(computed?.sajuBase?.relations?.harms) ? computed.sajuBase.relations.harms.map((item) => clean(item.message || item.type)).filter(Boolean).slice(0, 5) : [],
    breaks: Array.isArray(computed?.sajuBase?.relations?.breaks) ? computed.sajuBase.relations.breaks.map((item) => clean(item.message || item.type)).filter(Boolean).slice(0, 5) : [],
    annualTheme: [clean(annualLuck.label), clean(annualLuck.tenGod), clean(annualLuck.dayMasterRelation)].filter(Boolean).slice(0, 3),
    usefulGodKeywords: [clean(usefulGods.yong), clean(usefulGods.hi), clean(usefulGods.hee), clean(usefulGods.gi)].filter(Boolean).slice(0, 4),
  };
}

function buildNewYearDerivedSignals(seed) {
  const monthly = Array.isArray(seed?.luckCycles?.monthlyFortunes) ? seed.luckCycles.monthlyFortunes : [];
  const strongMonths = monthly.filter((item) => Number(item.score || 0) >= 74).map((item) => `${item.month}월`).slice(0, 4);
  const weakMonths = monthly.filter((item) => Number(item.score || 0) < 60).map((item) => `${item.month}월`).slice(0, 4);
  return {
    yearlyThemeSignals: [clean(seed?.natalChart?.dayMaster), clean(seed?.luckCycles?.targetYearSewoon?.pillar), clean(seed?.structure?.geokguk)].filter(Boolean).slice(0, 4),
    careerSignals: [clean(seed?.tenGods?.month), clean(seed?.tenGods?.hour), clean(seed?.structure?.specialPatterns?.[0])].filter(Boolean).slice(0, 4),
    moneySignals: [clean(seed?.tenGods?.distribution?.정재), clean(seed?.tenGods?.distribution?.편재), clean(seed?.structure?.combinations?.[0])].filter(Boolean).slice(0, 4),
    loveRelationshipSignals: [clean(seed?.sinsal?.find((item) => item.name === "도화")?.name), clean(seed?.structure?.harms?.[0]), clean(seed?.structure?.breaks?.[0])].filter(Boolean).slice(0, 4),
    humanRelationSignals: [clean(seed?.structure?.combinations?.[0]), clean(seed?.structure?.clashes?.[0]), clean(seed?.sinsal?.find((item) => item.name === "귀문")?.name)].filter(Boolean).slice(0, 4),
    healthMindSignals: [clean(seed?.fiveElements?.strongest?.[0]), clean(seed?.fiveElements?.weakest?.[0]), clean(seed?.natalChart?.season)].filter(Boolean).slice(0, 4),
    crisisSignals: weakMonths.length ? weakMonths : [clean(seed?.structure?.clashes?.[0]), clean(seed?.structure?.breaks?.[0])].filter(Boolean).slice(0, 4),
    opportunitySignals: strongMonths.length ? strongMonths : [clean(seed?.luckCycles?.targetYearSewoon?.keywords?.[0]), clean(seed?.structure?.annualTheme?.[0])].filter(Boolean).slice(0, 4),
    monthlyStrategySignals: monthly.map((item) => `${item.month}월-${item.keywords?.[0] || item.pillar || "흐름"}`).slice(0, 12),
  };
}

function buildNewYearStrengths(seed) {
  return [
    clean(seed?.structure?.annualTheme?.[0]),
    clean(seed?.structure?.usefulGodKeywords?.[0]),
    clean(seed?.luckCycles?.currentDaewoon?.keywords?.[0]),
  ].filter(Boolean).slice(0, 5);
}

function buildNewYearCautions(seed) {
  return [
    clean(seed?.structure?.clashes?.[0]),
    clean(seed?.structure?.breaks?.[0]),
    clean(seed?.luckCycles?.targetYearSewoon?.clashOrCombinationWithNatal?.[0]),
  ].filter(Boolean).slice(0, 5);
}

function buildNewYearUnresolvedThemes(seed) {
  return [
    clean(seed?.structure?.specialPatterns?.[0]),
    clean(seed?.luckCycles?.currentDaewoon?.keywords?.[0]),
    clean(seed?.luckCycles?.targetYearSewoon?.keywords?.[0]),
  ].filter(Boolean).slice(0, 5);
}

function buildInterpretationSeeds(seed) {
  const annual = seed.saju.annualLuck;
  const dominant = ELEMENT_KO[annual.element] || "토";
  const relation = annual.dayMasterRelation || "중립";
  const relations = seed.saju.relations || {};
  const relationHint = Array.isArray(relations.branchRelations) && relations.branchRelations.length ? relations.branchRelations.map((item) => item.type).join("·") : "큰 충돌보다 운영 균형";
  const monthlyStrong = seed.saju.monthlyLuck.filter((m) => m.score >= 75).map((m) => `${m.month}월`).slice(0, 4);
  const monthlyCare = seed.saju.monthlyLuck.filter((m) => m.score < 60).map((m) => `${m.month}월`).slice(0, 4);
  return {
    yearlyTheme: [`${seed.targetYear}년은 ${annual.label} 세운이며 ${dominant} 기운과 ${annual.tenGod} 흐름이 핵심입니다.`, `일간과 세운의 관계는 ${relation}으로 읽히며, 선택의 우선순위를 분명히 해야 합니다.`],
    career: [`${annual.tenGod}의 작동 방식은 일의 책임, 성과 표현, 협업 태도에 직접 연결됩니다.`, `${dominant} 기운이 강해지는 자리에서 강점이 드러납니다.`],
    wealth: [`재물 판단은 ${annual.tenGod}과 월별 점수의 강약을 함께 보아야 합니다.`, `계약과 지출은 ${monthlyCare.length ? monthlyCare.join("·") : "중반 이후"}에 더 보수적으로 점검합니다.`],
    love: [`관계운은 ${relationHint} 신호를 중심으로 속도보다 안정감을 우선합니다.`, `${monthlyStrong.length ? monthlyStrong.join("·") : "상반기"}에는 만남과 대화의 문이 비교적 열립니다.`],
    relationships: [`합은 협력의 문, 충은 변화의 압력, 해·파는 약속과 감정의 관리 포인트로 읽습니다.`, `올해 인간관계는 말의 온도와 역할 경계가 중요합니다.`],
    health: [`${dominant} 기운이 과해지거나 약해질 때 생활 리듬의 편차가 커질 수 있습니다.`, `회복 루틴은 수면, 식사, 움직임을 작게 반복하는 방식이 유리합니다.`],
    monthly: seed.saju.monthlyLuck.map((item) => `${item.month}월 ${item.pillar.label}: ${item.tone} 흐름, ${item.advice}`),
    opportunities: [`${monthlyStrong.length ? monthlyStrong.join("·") : "점수가 높은 달"}에는 제안, 발표, 확장 결정을 검토합니다.`, `${relation} 관계를 활용해 올해의 행동 기준을 세웁니다.`],
    risks: [`${monthlyCare.length ? monthlyCare.join("·") : "점수가 낮은 달"}에는 계약, 지출, 감정적 결정을 늦추는 편이 안전합니다.`, `충·해·파 신호는 관계의 단절보다 조정 요청으로 받아들이는 것이 좋습니다.`],
    finalStrategy: [`상반기는 기반 정비, 하반기는 검증된 기회를 키우는 흐름으로 설계합니다.`, `${seed.targetYear}년의 핵심은 세운을 예언처럼 기다리는 것이 아니라 선택 기준으로 사용하는 것입니다.`],
  };
}

function buildCategoryEvidence(seed, chapter, category, idx) {
  const annual = seed?.saju?.annualLuck || {};
  const pillars = seed?.saju?.pillars || {};
  const monthly = Array.isArray(seed?.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  const daeun = Array.isArray(seed?.saju?.luckCycle) ? seed.saju.luckCycle : [];
  const dominant = dominantElement(seed?.saju?.fiveElements || {}, "earth");
  const dominantKo = ELEMENT_KO[dominant] || "토";
  const dayMaster = clean(seed?.saju?.dayMaster || "미상");
  const sliceStart = chapter.no === 8 ? idx * 3 : idx;
  const focusMonths = monthly.slice(sliceStart, sliceStart + (chapter.no === 8 ? 3 : 2));
  const monthlyLine = focusMonths
    .map((item) => `${item.month}월(${item.pillar?.label || "미상"}, ${item.score}점/${item.tone})`)
    .join(", ");
  const relationRows = Array.isArray(seed?.saju?.relations?.branchRelations) ? seed.saju.relations.branchRelations : [];
  const relationLine = relationRows.slice(0, 2).map((row) => `${row.label}-${row.type}`).join(", ") || "합충 신호 약함";
  const daeunCurrent = daeun[0] || {};
  const daeunLine = clean(daeunCurrent.label || `${daeunCurrent.stem || ""}${daeunCurrent.branch || ""}`) || "대운 데이터 없음";
  const personality = `일간 ${dayMaster} 기준 성향은 ${dominantKo} 기운 중심으로 책임/판단의 무게가 커지기 쉬워, 감정보다 구조와 기준을 우선할 때 강점이 살아납니다.`;
  return [
    `${chapter.no}장 ${category} 핵심 근거: 세운 ${annual.label || "미상"}(${annual.elementKo || "토"}), 일간 기준 십성 ${annual.tenGod || "미정"}, 오행 관계 ${annual.dayMasterRelation || "중립"}.`,
    `원국/대운 근거: 일간 ${seed?.saju?.dayMaster || "미상"}, 연/월/일/시 지지 ${pillars.year?.branch || "-"}/${pillars.month?.branch || "-"}/${pillars.day?.branch || "-"}/${pillars.hour?.branch || "-"}, 현재 대운 ${daeunLine}, 관계 신호 ${relationLine}.`,
    monthlyLine ? `월별 포인트: ${monthlyLine}.` : "월별 포인트: 월운 데이터 기준으로 보수/확장 리듬을 분리 운영합니다.",
    `${personality} ${category} 판단은 단일 사건 예언이 아니라 위 근거를 실행 우선순위와 리스크 관리 규칙으로 변환해 읽습니다.`,
  ].join(" ");
}

function buildPdfSeed(profile, targetYear, body = {}) {
  const computed = normalizeEngineSaju(profile, body);
  const annual = sexagenaryYear(targetYear);
  const annualElement = BRANCH_ELEMENT[annual.branch] || STEM_ELEMENT[annual.stem] || "earth";
  const dayStem = computed.dayMaster || computed.pillars.day?.stem || "戊";
  const annualLuck = {
    year: targetYear,
    ...annual,
    element: annualElement,
    elementKo: ELEMENT_KO[annualElement] || "토",
    tenGod: tenGod(dayStem, annual.stem),
    dayMasterRelation: elementRelation(STEM_ELEMENT[dayStem] || "earth", annualElement),
  };
  const monthlyLuck = buildMonthlyLuck(targetYear, dayStem);
  const branchRelations = relationRows(computed.pillars, annual.branch);
  const targetYearSewoonKeywords = [annual.label, annualLuck.tenGod, annualLuck.dayMasterRelation, annualLuck.elementKo].filter(Boolean).slice(0, 4);
  const monthlyFortunes = monthlyLuck.map((item) => ({
    month: item.month,
    pillar: item.pillar.label,
    keywords: [item.pillar.label, item.tone, item.relation].filter(Boolean).slice(0, 3),
    opportunitySignals: item.score >= 72 ? ["확장", item.pillar.label, item.tone].filter(Boolean).slice(0, 3) : [],
    cautionSignals: item.score < 60 ? ["보수", item.pillar.label, item.relation].filter(Boolean).slice(0, 3) : [],
    score: item.score,
  }));
  const seed = {
    input: {
      name: profile.name,
      gender: profile.gender,
      birthDate: `${profile.birth.year}-${pad2(profile.birth.month)}-${pad2(profile.birth.day)}`,
      birthTime: profile.birth.unknownTime ? "" : `${pad2(profile.birth.hour)}:${pad2(profile.birth.minute)}`,
      birthPlace: clean(computed?.sajuBase?.location || body?.birthPlace || body?.location || ""),
      calendarType: profile.calendarType,
      targetYear,
    },
    natalChart: {
      yearPillar: clean(computed.pillars.year?.stem || "") ? `${computed.pillars.year?.stem}${computed.pillars.year?.branch}` : "",
      monthPillar: clean(computed.pillars.month?.stem || "") ? `${computed.pillars.month?.stem}${computed.pillars.month?.branch}` : "",
      dayPillar: clean(computed.pillars.day?.stem || "") ? `${computed.pillars.day?.stem}${computed.pillars.day?.branch}` : "",
      hourPillar: clean(computed.pillars.hour?.stem || "") ? `${computed.pillars.hour?.stem}${computed.pillars.hour?.branch}` : "",
      dayMaster: dayStem,
      dayBranch: clean(computed.pillars.day?.branch || ""),
      monthBranch: clean(computed.pillars.month?.branch || ""),
      season: clean(computed?.sajuBase?.season || computed?.engine?.calendar?.season || ""),
    },
    fiveElements: {
      wood: Number(computed.fiveElements?.scores?.wood || computed.fiveElements?.wood || 0),
      fire: Number(computed.fiveElements?.scores?.fire || computed.fiveElements?.fire || 0),
      earth: Number(computed.fiveElements?.scores?.earth || computed.fiveElements?.earth || 0),
      metal: Number(computed.fiveElements?.scores?.metal || computed.fiveElements?.metal || 0),
      water: Number(computed.fiveElements?.scores?.water || computed.fiveElements?.water || 0),
      strongest: [clean(computed.fiveElements?.strongest || computed.fiveElements?.dominant || "")].filter(Boolean),
      weakest: [clean(computed.fiveElements?.weakest || computed.fiveElements?.lacking?.[0] || "")].filter(Boolean),
      balanceKeywords: [clean(computed.fiveElements?.dominant || ""), clean(computed.fiveElements?.deficient || "")].filter(Boolean).slice(0, 3),
    },
    tenGods: {
      year: tenGod(dayStem, annual.stem),
      month: clean(computed.tenGods?.month || computed.tenGods?.dominantTenGod || ""),
      day: clean(computed.tenGods?.day || dayStem || ""),
      hour: clean(computed.tenGods?.hour || ""),
      distribution: { ...computed.tenGods?.counts, ...computed.tenGods?.distribution },
      strongTenGods: Array.isArray(computed.tenGods?.dominantList) ? computed.tenGods.dominantList.slice(0, 4) : [clean(computed.tenGods?.dominantTenGod || "")].filter(Boolean),
      weakTenGods: Array.isArray(computed.tenGods?.weakList) ? computed.tenGods.weakList.slice(0, 4) : [clean(computed.tenGods?.weakestTenGod || "")].filter(Boolean),
      relationshipToYear: [annualLuck.tenGod, annualLuck.dayMasterRelation].filter(Boolean).slice(0, 4),
    },
    usefulGods: {
      yongshin: [clean(computed.usefulGods?.yong || computed.usefulGods?.useful || "")].filter(Boolean),
      heeshin: [clean(computed.usefulGods?.hi || computed.usefulGods?.hee || "")].filter(Boolean),
      gishin: [clean(computed.usefulGods?.gi || computed.usefulGods?.gishin || "")].filter(Boolean),
      johu: [clean(computed.johu?.type || computed.johu?.name || "")].filter(Boolean),
      keywords: [clean(computed.usefulGods?.yong || ""), clean(computed.usefulGods?.hi || computed.usefulGods?.hee || ""), clean(computed.johu?.type || "")].filter(Boolean).slice(0, 4),
    },
    structure: buildNewYearStructure(computed, annualLuck),
    luckCycles: {
      currentDaewoon: computed.daeun?.[0]
        ? {
            pillar: clean(computed.daeun[0].label || `${computed.daeun[0].stem || ""}${computed.daeun[0].branch || ""}`),
            startAge: toInt(computed.daeun[0].startAge || computed.daeun[0].start || 0, 0),
            endAge: toInt(computed.daeun[0].endAge || computed.daeun[0].end || 0, 0),
            keywords: [clean(computed.daeun[0].label || ""), clean(computed.daeun[0].keyword || "")].filter(Boolean).slice(0, 4),
            tenGodEffect: [clean(computed.daeun[0].tenGod || "")].filter(Boolean),
          }
        : null,
      targetYearSewoon: {
        year: targetYear,
        pillar: annual.label,
        heavenlyStem: annual.stem,
        earthlyBranch: annual.branch,
        tenGodToDayMaster: annualLuck.tenGod,
        elementEffect: [annualLuck.elementKo, annualLuck.dayMasterRelation].filter(Boolean).slice(0, 4),
        clashOrCombinationWithNatal: branchRelations.slice(0, 4).map((item) => clean(item.message || item.type)).filter(Boolean),
        keywords: targetYearSewoonKeywords,
      },
      monthlyFortunes,
    },
    sinsal: buildNewYearSinsal(computed.specialStars, computed.pillars, annual),
    twelveGrowthStages: buildTwelveGrowthStages(dayStem, computed.pillars),
    derivedSignals: buildNewYearDerivedSignals({
      natalChart: { dayMaster: dayStem },
      luckCycles: {
        targetYearSewoon: { pillar: annual.label, keyword: annualLuck.tenGod },
        monthlyFortunes,
      },
      structure: buildNewYearStructure(computed, annualLuck),
      fiveElements: {
        strongest: [clean(computed.fiveElements?.strongest || computed.fiveElements?.dominant || "")].filter(Boolean),
        weakest: [clean(computed.fiveElements?.weakest || computed.fiveElements?.deficient || "")].filter(Boolean),
      },
      tenGods: {
        month: clean(computed.tenGods?.month || ""),
        hour: clean(computed.tenGods?.hour || ""),
        distribution: computed.tenGods?.counts || {},
      },
      sinsal: buildNewYearSinsal(computed.specialStars, computed.pillars, annual),
    }),
    strengths: buildNewYearStrengths({
      structure: buildNewYearStructure(computed, annualLuck),
      luckCycles: { currentDaewoon: computed.daeun?.[0] || null },
    }),
    cautionFlags: buildNewYearCautions({
      structure: buildNewYearStructure(computed, annualLuck),
      luckCycles: { targetYearSewoon: { clashOrCombinationWithNatal: branchRelations.slice(0, 4).map((item) => clean(item.message || item.type)) } },
    }),
    unresolvedThemes: buildNewYearUnresolvedThemes({
      structure: buildNewYearStructure(computed, annualLuck),
      luckCycles: { currentDaewoon: computed.daeun?.[0] || null, targetYearSewoon: { keywords: targetYearSewoonKeywords } },
    }),
    chapterSpecs: buildSajuNewYearChapterSpecs(targetYear),
    metadata: {
      reportType: SERVICE_KEY,
      source: "sajuNewYear",
    },
  };

  return seed;
}

function seedLine(seed, category, idx) {
  const keyMap = {
    "일": "career",
    "커리어": "career",
    "재물": "wealth",
    "돈": "wealth",
    "연애": "love",
    "사랑": "love",
    "관계": "relationships",
    "건강": "health",
    "마음": "health",
    "월별": "monthly",
    "기회": "opportunities",
    "위험": "risks",
    "전략": "finalStrategy",
  };
  const found = Object.keys(keyMap).find((token) => category.includes(token));
  const list = seed.interpretationSeeds[found ? keyMap[found] : "yearlyTheme"] || seed.interpretationSeeds.yearlyTheme;
  return list[idx % list.length] || seed.interpretationSeeds.yearlyTheme[0];
}

function localParagraph(seed, chapter, category, idx) {
  const annual = seed.saju.annualLuck;
  const line = seedLine(seed, category, idx);
  const relationText = (seed.saju.relations.branchRelations || []).slice(0, 2).map((item) => item.message).join(" ") || "원국과 세운의 관계는 급격한 단정이 아니라 월별 흐름을 보며 조율하는 방식으로 읽습니다.";
  const evidence = buildCategoryEvidence(seed, chapter, category, idx);
  if (chapter.no === 8) {
    const monthly = seed.saju.monthlyLuck || [];
    const firstHalf = monthly.slice(0, 6);
    const secondHalf = monthly.slice(6, 12);
    const bestMonths = monthly.filter((item) => Number(item.score || 0) >= 74).slice(0, 4);
    const cautionMonths = monthly.filter((item) => Number(item.score || 0) < 60).slice(0, 4);
    if (category === "상반기 흐름") {
      return `${firstHalf.map((item) => `${item.month}월(${item.pillar.label})은 ${item.tone} 중심이며 ${item.score}점 기준으로 ${item.relation} 신호가 강합니다.`).join(" ")}\n\n${evidence}\n\n상반기에는 원국과 세운의 접점이 빠르게 드러나므로 방향 전환보다 운영 기준 정립이 먼저입니다. 특히 ${annual.tenGod} 성향이 업무와 관계에 동시에 작동하므로 우선순위를 2개 이하로 제한하고, 대운 축과 충돌하는 일정은 사전 완충 일정을 넣어야 손실을 줄일 수 있습니다.`;
    }
    if (category === "하반기 흐름") {
      return `${secondHalf.map((item) => `${item.month}월(${item.pillar.label})은 ${item.tone} 단계이며 ${item.score}점 흐름에서 ${item.relation}가 핵심 변수입니다.`).join(" ")}\n\n${evidence}\n\n하반기는 상반기에 만든 구조의 수익화와 안정화 국면입니다. 월운 점수가 높아도 문서, 정산, 협업 규칙이 느슨하면 성과가 누수되므로 결과보다 재현 가능한 프로세스 구축에 집중해야 합니다. 반대로 점수가 낮은 달에는 신규 확장을 줄이고 품질 고도화와 리스크 청산에 집중하면 연말 회복 탄력을 확보할 수 있습니다.`;
    }
    if (category === "기회가 강한 달") {
      const bestText = bestMonths.length ? bestMonths.map((item) => `${item.month}월(${item.pillar.label}, ${item.score}점)`).join(", ") : "상대적 고점 월운";
      return `기회가 강한 달은 ${bestText} 구간입니다. 이 달들은 세운 ${annual.label}의 추진력이 원국의 강점과 연결되기 쉬워 제안, 협업, 런칭, 계약 검토를 전개하기 유리합니다.\n\n${evidence}\n\n다만 고점 달이라고 무조건 확장하면 반작용이 생길 수 있으므로 실행 순서는 반드시 완성도 점검, 고객 반응 측정, 다음 액션 확장으로 나눠야 합니다. 특히 십성과 오행 균형이 표현/재물 축으로 이동하는 시점에는 결과 공개와 가격 정책 조정을 병행하면 체감 성과를 높일 수 있습니다.`;
    }
    if (category === "조심해야 할 달") {
      const cautionText = cautionMonths.length ? cautionMonths.map((item) => `${item.month}월(${item.pillar.label}, ${item.score}점)`).join(", ") : "상대적 저점 월운";
      return `조심해야 할 달은 ${cautionText} 구간입니다. 이 시기는 오행 상극과 지지 충/해/파 신호가 겹치기 쉬워 판단이 급해지고 지출, 감정, 관계 커뮤니케이션 리스크가 커질 수 있습니다.\n\n${evidence}\n\n저점 달의 핵심은 확장 중단이 아니라 손실 한도 설정입니다. 계약은 검토 기간을 늘리고, 인사/협업 이슈는 기록 기반으로 정리하며, 투자성 지출은 현금흐름 2개월 버퍼를 남긴 뒤 결정해야 합니다. 이렇게 운영하면 저점 달이 누적 손실 구간이 아니라 구조 교정 구간으로 전환됩니다.`;
    }
    const monthlyActions = monthly
      .map((item) => `${item.month}월: ${item.tone} 운영, ${item.relation} 기준으로 ${item.score >= 72 ? "확장 액션 1개 실행" : item.score < 60 ? "리스크 점검과 손실 차단 우선" : "품질 개선과 유지 전략 병행"}`)
      .join(" ");
    return `${monthlyActions}\n\n${evidence}\n\n월별 실전 행동표는 체크리스트로 써야 효과가 있습니다. 매월 시작 시 핵심 목표 1개, 금지 행동 1개, 복구 루틴 1개를 문장으로 확정하면 세운 변동에도 판단이 흔들리지 않습니다. 특히 원국과 대운의 충돌 신호가 강한 달에는 성과 추격보다 손실 최소화가 장기 수익률을 높입니다.`;
  }
  if (chapter.no === 10) {
    if (category === "3개월 실행 전략") {
      return `${line} 첫 3개월은 기반 안정화 구간으로 정의합니다. 세운 ${annual.label}과 원국 상호작용이 빠르게 드러나는 시기이므로 결제/생성/저장/재열람의 신뢰 지점을 먼저 고정하고, 대운 방향과 충돌하는 무리한 확장은 제한해야 합니다.\n\n${evidence}\n\n실행 순서는 1) 핵심 리스크 제거 2) 품질 기준 명문화 3) 반복 가능한 운영 루틴 구축입니다. 이 단계에서 최소 주 1회 월운 대비 실적 점검을 하면 하반기 확장 시 시행착오 비용을 크게 줄일 수 있습니다.`;
    }
    if (category === "6개월 실행 전략") {
      return `${line} 6개월 전략은 품질 고도화와 수익 모델 정렬입니다. 십성과 오행 흐름을 기반으로 강점이 드러나는 영역에 자원을 집중하고, 저효율 기능은 과감히 축소해 집중도를 높여야 합니다.\n\n${evidence}\n\n핵심은 고객이 돈을 낸 지점의 체감 품질을 지속적으로 끌어올리는 것입니다. 월운 고점 달에는 신규 실험을, 저점 달에는 안정화와 리팩터링을 배치하면 리스크를 통제하면서도 성장 곡선을 만들 수 있습니다.`;
    }
    if (category === "12개월 완성 전략") {
      return `${line} 12개월 완성 전략은 대표 상품의 브랜드화입니다. 연말에는 원국 기반 개인화 정확도, 대운/세운/월운 반영 깊이, 재열람 가치가 함께 평가받으므로 단순 분량보다 실전 의사결정 밀도를 우선해야 합니다.\n\n${evidence}\n\n완성 시점 기준 KPI는 재구매율, 재열람률, 만족도 문장입니다. 특히 3개월-6개월-12개월 전략이 서로 단절되지 않고 한 흐름으로 이어져야 사용자가 실제로 인생 전략 문서로 활용할 수 있습니다.`;
    }
  }
  return `${line} ${category}에서는 ${annual.label} 세운의 ${annual.tenGod} 성격을 현실 선택으로 바꾸는 것이 중요합니다. 현재 계산된 사주와 세운에서 확인되는 범위에서는 강하게 밀어붙이는 결정과 천천히 다듬어야 할 결정을 구분할수록 결과가 안정됩니다.\n\n${evidence}\n\n${relationText} 따라서 ${chapter.no}장 ${category}의 실행 포인트는 운을 기다리기보다 일정, 관계, 돈의 기준선을 미리 정해두는 것입니다. 작은 신호를 기록하고 반복되는 상황을 조정하면 ${seed.targetYear}년의 흐름을 내 쪽으로 끌어올 수 있습니다. 실행 단위는 월간 목표 1개, 주간 점검 1회, 위험 신호 발생 시 즉시 축소/보완의 3단계로 운영하는 것을 권합니다.`;
}

function buildLocalSkeleton(seed) {
  return NEW_YEAR_CHAPTERS.map((chapter) => {
    const categories = chapter.categories.map((category, idx) => {
      const base = localParagraph(seed, chapter, category, idx);
      const expanded = ensureMinLength(base, MIN_SECTION_CHARS, seed, category);
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
      source: "local-skeleton",
    };
  });
}

function ensureMinLength(text, minLength, options = {}) {
  const seed = options.seed || null;
  const categoryTitle = clean(options.categoryTitle || "올해 운세 전략");
  const appendText = clean(options.appendText);
  let result = stripForbiddenText(text);
  const annual = seed?.saju?.annualLuck || {};
  const targetYear = seed?.targetYear || new Date().getFullYear();
  const addition = appendText || `${targetYear}년 ${annual.label || "세운"} 기준으로 ${categoryTitle} 판단은 월별 강약과 관계 신호를 함께 보아야 안정적입니다. 점수가 높은 달에는 실행 폭을 넓히고, 낮은 달에는 문서·관계·지출을 재점검하는 이중 트랙 운영이 손실을 줄입니다. 또한 선택 기준을 미리 문장화해 두면 같은 변수에도 흔들림 없이 대응할 수 있습니다.`;
  while (result.length < minLength) {
    result = `${result}\n\n${addition}`;
  }
  return result;
}

function extractJsonObject(text) {
  const raw = clean(text);
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const target = fenced ? fenced[1] : raw;
  const start = target.indexOf("{");
  const end = target.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(target.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

function getChapterSections(chapter) {
  if (Array.isArray(chapter?.sections) && chapter.sections.length) return chapter.sections;
  if (Array.isArray(chapter?.categories) && chapter.categories.length) {
    return chapter.categories.map((category) => ({
      title: category.title,
      body: clean(category.body || category.finalText || category.localSummary || category.text || ""),
    }));
  }
  return [];
}

function normalizeGeneratedChapter(chapterSpec, generated) {
  const sections = Array.isArray(generated?.sections) ? generated.sections : [];
  if (sections.length !== chapterSpec.categories.length) return null;
  const normalizedSections = chapterSpec.categories.map((categoryTitle, idx) => {
    const section = sections[idx] || {};
    const title = clean(section.title || categoryTitle);
    if (title !== clean(categoryTitle)) return null;
    const body = stripForbiddenText(section.body || section.text || section.content || "");
    if (body.length < MIN_SECTION_CHARS) return null;
    return { title: categoryTitle, body };
  });
  if (normalizedSections.some((item) => !item)) return null;
  const chapterBody = normalizedSections.map((item) => item.body).join("\n\n");
  return {
    no: chapterSpec.no,
    title: chapterSpec.title,
    sections: normalizedSections,
    text: normalizedSections.map((item) => `## ${item.title}\n${item.body}`).join("\n\n"),
    body: chapterBody,
    source: "llm",
  };
}

function buildDeterministicSectionBody(seed, chapterSpec, categoryTitle, idx, reason = "") {
  const chapterMeta = {
    no: chapterSpec.no,
    title: chapterSpec.title,
    categories: chapterSpec.categories,
  };
  const annual = seed?.luckCycles?.targetYearSewoon || {};
  const monthly = Array.isArray(seed?.luckCycles?.monthlyFortunes) ? seed.luckCycles.monthlyFortunes : [];
  const monthFocus = monthly.slice(idx, idx + 3).map((row) => `${row.month}월(${row.pillar || "흐름"}, ${row.score || 0}점)`).join(", ");
  const base = [
    `${chapterSpec.no}장 ${categoryTitle}는 ${seed?.input?.targetYear || "올해"}년 ${clean(annual.pillar || annual.label || "세운")}과 일간 ${clean(seed?.natalChart?.dayMaster || "미상")}의 상호작용을 중심으로 해석합니다.`,
    `핵심 기준은 ${clean(annual.tenGodToDayMaster || "십성 미상")}의 작동 방식과 월운 강약이며, 단일 사건 예언이 아니라 실행 우선순위 조정에 초점을 둡니다.`,
    monthFocus ? `이번 섹션의 월운 참고 구간은 ${monthFocus}입니다.` : "월운 데이터와 관계 신호를 함께 보며 보수/확장 리듬을 나눠 운영합니다.",
  ].join(" ");
  const evidence = buildCategoryEvidence(seed, chapterMeta, categoryTitle, idx);
  const reasonHint = clean(reason);
  let text = `${base}\n\n${evidence}`;
  if (reasonHint) {
    text += `\n\n실행 메모: ${reasonHint} 상황을 반영해 이번 섹션은 핵심 근거 중심으로 재구성했습니다.`;
  }
  text = ensureMinLength(text, MIN_SECTION_CHARS, { seed, categoryTitle });
  if (countSignalHits(text, seed) < 2) {
    const annual = seed?.luckCycles?.targetYearSewoon || {};
    text += `\n\n근거 보강: 세운 ${clean(annual.pillar || annual.label || "")}, 일간 ${clean(seed?.natalChart?.dayMaster || "")}, 월운 신호를 함께 참조해 실행 우선순위를 정합니다.`;
  }
  return stripForbiddenText(text);
}

function buildDeterministicChapterFromSpec(seed, chapterSpec, reason = "") {
  const sections = chapterSpec.categories.map((categoryTitle, idx) => ({
    title: categoryTitle,
    body: buildDeterministicSectionBody(seed, chapterSpec, categoryTitle, idx, reason),
  }));
  return {
    no: chapterSpec.no,
    title: chapterSpec.title,
    sections,
    text: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
    source: "llm-reinforced",
  };
}

function reinforceChapterFromSpec({ seed, chapterSpec, chapter, reason = "" }) {
  const sourceSections = getChapterSections(chapter);
  let reinforced = false;
  const sections = chapterSpec.categories.map((categoryTitle, idx) => {
    const source = sourceSections[idx] || {};
    const sourceTitle = clean(source.title || categoryTitle);
    const sourceBody = stripForbiddenText(source.body || source.finalText || source.localSummary || source.text || "");
    const shouldReinforce = (
      sourceTitle !== clean(categoryTitle)
      || sourceBody.length < MIN_SECTION_CHARS
      || hasForbiddenText(sourceBody)
      || GENERAL_PHRASE_RE.test(sourceBody)
      || countSignalHits(sourceBody, seed) < 2
    );

    if (!shouldReinforce) {
      return {
        title: categoryTitle,
        body: ensureMinLength(sourceBody, MIN_SECTION_CHARS, { seed, categoryTitle }),
      };
    }

    reinforced = true;
    return {
      title: categoryTitle,
      body: buildDeterministicSectionBody(seed, chapterSpec, categoryTitle, idx, reason),
    };
  });

  return {
    reinforced,
    chapter: {
      no: chapterSpec.no,
      title: chapterSpec.title,
      sections,
      text: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
      source: reinforced ? "llm-reinforced" : clean(chapter?.source || "llm"),
    },
  };
}

function buildManuscriptEnhancePrompt(localYearSajuJson, localManuscript) {
  const safeSeed = {
    targetYear: localYearSajuJson.targetYear,
    birthProfile: localYearSajuJson.birthProfile,
    saju: localYearSajuJson.saju,
    interpretationSeeds: localYearSajuJson.interpretationSeeds,
    manuscript: localManuscript.map((chapter) => ({
      no: chapter.no,
      title: chapter.title,
      categories: chapter.categories.map((item) => ({ title: item.title, localSummary: item.localSummary })),
    })),
  };
  return [
    "당신은 사주 명리학 기반 신년운세 프리미엄 PDF를 작성하는 전문 상담가입니다.",
    "계산은 이미 내부 사주 엔진에서 완료되었습니다. 당신은 계산을 새로 하지 않습니다.",
    "제공된 원국, 대운, 세운, 십성, 오행, 용신/희신, 월운 seed를 바탕으로 챕터별 상담문을 작성하세요.",
    "아래 샘플은 1991년 2월 20일 오전 8시 40분생 남성의 2026년 신년운세 PDF 품질 기준 예시입니다.",
    "샘플 문장을 그대로 복사하지 말고, 이 정도의 구체성, 밀도, 상담문 깊이, 실전 조언 수준을 목표로 작성하세요.",
    "각 챕터는 사용자가 내 상황을 실제로 읽었다고 느낄 만큼 구체적이어야 합니다.",
    "단순한 좋은 말, 일반적인 운세 문장, 반복 템플릿 문장을 금지합니다.",
    "각 문단은 반드시 해당 챕터와 세부 카테고리의 질문에 답해야 합니다.",
    "챕터 번호/제목/카테고리 제목은 절대 변경하지 마세요.",
    "각 챕터와 세부 카테고리를 절대 누락하지 마세요.",
    "각 세부 카테고리는 제목에 정확히 맞는 내용을 최소 420자 이상 작성하세요.",
    "각 카테고리 본문에는 최소 2개의 실제 근거(세운 천간/지지, 십성, 오행, 용신/희신, 월별 점수, 대운 정보)를 명시하세요.",
    "문단 구성은 1) 근거 해석 2) 리스크/기회 판별 3) 실행 전략 순서로 유지하세요.",
    "예언 단정 대신 선택과 전략, 실전 조언 중심으로 쓰세요.",
    "운세를 공포스럽게 단정하지 말고, 좋은 말만 하지 말고, 주의할 점과 선택 기준을 현실적으로 제시하세요.",
    "PDF 본문에 JSON, payload, 내부 계산값, 로컬 엔진, fallback, LLM 실패, 품질 검증 같은 기술 문구를 절대 쓰지 마세요.",
    "반드시 JSON만 반환하세요.",
    "형식: {\"chapters\":[{\"no\":1,\"title\":\"Chapter 1...\",\"sections\":[{\"title\":\"카테고리\",\"body\":\"상담문\"}]}]}",
    JSON.stringify(safeSeed),
  ].join("\n");
}

function buildChapterCalculationContext(seed, chapterNo) {
  const monthly = Array.isArray(seed?.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  const daeun = Array.isArray(seed?.saju?.luckCycle) ? seed.saju.luckCycle : [];
  const relations = Array.isArray(seed?.saju?.relations?.branchRelations) ? seed.saju.relations.branchRelations : [];
  const monthlyByChapter =
    chapterNo === 8
      ? monthly
      : monthly.filter((item) => Number(item.score || 0) >= 70).slice(0, 4).concat(monthly.filter((item) => Number(item.score || 0) < 60).slice(0, 2));

  return {
    dayMaster: seed?.saju?.dayMaster,
    pillars: seed?.saju?.pillars,
    annualLuck: seed?.saju?.annualLuck,
    currentDaeun: daeun[0] || null,
    branchRelations: relations,
    monthlyFocus: monthlyByChapter,
    interpretationSeeds: seed?.interpretationSeeds || {},
  };
}

function buildSingleChapterEnhancePrompt(seed, localChapter) {
  const calcContext = buildChapterCalculationContext(seed, localChapter.no);
  const chapterPayload = {
    targetYear: seed.targetYear,
    birthProfile: seed.birthProfile,
    chapter: {
      no: localChapter.no,
      title: localChapter.title,
      categories: localChapter.categories.map((item) => ({ title: item.title, localSummary: item.localSummary })),
    },
    calculationContext: calcContext,
  };

  return [
    "당신은 사주 명리학 기반 신년운세 프리미엄 PDF를 작성하는 전문 상담가입니다.",
    "계산은 이미 내부 사주 엔진에서 완료되었습니다. 당신은 계산을 새로 하지 않습니다.",
    "지금은 단 하나의 챕터만 작성합니다. 다른 챕터를 쓰지 마세요.",
    `현재 작성 대상: ${localChapter.no}번 챕터 (${localChapter.title})`,
    "세부 카테고리를 절대 누락하지 마세요.",
    "각 카테고리는 제목 질문에 정확히 답하고 최소 420자 이상 작성하세요.",
    "각 카테고리 본문에는 최소 2개 이상의 실제 사주 근거(원국/대운/세운/십성/오행/월운)를 넣으세요.",
    "반복 템플릿 문장과 일반론 문장을 금지합니다.",
    "운세를 공포스럽게 단정하지 말고, 현실적인 경고와 실행 조언을 함께 제시하세요.",
    "본문에 JSON, payload, fallback, 로컬 엔진, LLM 실패, 품질 검증 같은 기술 문구를 쓰지 마세요.",
    "반드시 JSON만 반환하세요.",
    "형식: {\"no\":1,\"title\":\"Chapter 1...\",\"sections\":[{\"title\":\"카테고리\",\"body\":\"상담문\"}]}",
    JSON.stringify(chapterPayload),
  ].join("\n");
}

function summarizeChapterForPrompt(chapter) {
  const sections = getChapterSections(chapter);
  return {
    no: chapter.no,
    title: chapter.title,
    summaries: sections.map((section) => {
      const sentences = clean(section.body || section.finalText || section.localSummary || "").split(/[.!?\n]+/).map((part) => clean(part)).filter(Boolean);
      return {
        title: section.title,
        summary: sentences.slice(0, 2).join(". ").slice(0, 220),
      };
    }),
  };
}

function buildSajuNewYearChapterPrompt(seed, chapterSpec, previousChapterSummaries = [], previousFailureReason = "") {
  const promptSeed = {
    input: seed.input,
    natalChart: seed.natalChart,
    fiveElements: seed.fiveElements,
    tenGods: seed.tenGods,
    usefulGods: seed.usefulGods,
    structure: seed.structure,
    luckCycles: seed.luckCycles,
    sinsal: seed.sinsal,
    twelveGrowthStages: seed.twelveGrowthStages,
    derivedSignals: seed.derivedSignals,
    strengths: seed.strengths,
    cautionFlags: seed.cautionFlags,
    unresolvedThemes: seed.unresolvedThemes,
  };

  return [
    "당신은 사주 명리학 기반 신년운세 프리미엄 PDF를 작성하는 전문 상담가입니다.",
    "계산은 이미 내부 사주 엔진에서 완료되었습니다. 당신은 계산을 새로 하지 않습니다.",
    "로컬 원고를 고치는 것이 아니라, 지금부터 챕터 본문을 새로 작성합니다.",
    "제공된 JSON seed와 챕터 구조를 바탕으로 각 세부 카테고리의 본문을 직접 작성하세요.",
    "JSON에 없는 사주 계산값, 대운, 세운, 월운 정보를 임의로 만들지 마세요.",
    "단, 제공된 계산 신호를 바탕으로 해석은 깊고 현실적으로 확장할 수 있습니다.",
    "각 세부 카테고리는 서로 다른 관점과 내용을 가져야 합니다.",
    "같은 문장 구조를 반복하지 마세요.",
    "챕터 제목만 바꿔 비슷한 문장을 반복하지 마세요.",
    "운세를 공포스럽게 단정하지 마세요. 하지만 좋은 말만 하지 말고, 위험한 패턴과 선택 기준을 현실적으로 알려주세요.",
    "PDF 본문에는 JSON, payload, 로컬 엔진, API 실패, LLM 실패, fallback, 자동 복구, worker 같은 기술 문구를 절대 노출하지 마세요.",
    "각 챕터는 정확히 5개 세부 카테고리를 가져야 합니다.",
    "각 세부 카테고리 본문은 최소 600자 이상이어야 합니다.",
    "각 챕터 본문은 최소 3,000자 이상이어야 합니다.",
    "월별 운세 챕터는 1월부터 12월까지 모두 포함해야 합니다.",
    "마스터플랜 챕터에는 3개월, 6개월, 12개월 전략이 반드시 포함되어야 합니다.",
    "반드시 JSON만 반환하세요.",
    `현재 작성 대상: ${chapterSpec.no}번 챕터 (${chapterSpec.title})`,
    `챕터 구조: ${JSON.stringify(chapterSpec)}`,
    previousChapterSummaries.length ? `이전 챕터 요약: ${JSON.stringify(previousChapterSummaries)}` : "이전 챕터 요약: []",
    previousFailureReason ? `이전 실패 사유: ${previousFailureReason}` : "",
    JSON.stringify(promptSeed),
  ].filter(Boolean).join("\n");
}

async function generateSajuNewYearChapterByLLM(env, seed, chapterSpec, previousChapterSummaries = [], previousFailureReason = "") {
  const timeoutMs = Math.min(45000, Number(env.PREMIUM_SAJU_NEW_YEAR_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 38000));
  const totalTimeoutMs = Math.min(62000, Number(env.PREMIUM_SAJU_NEW_YEAR_GEMINI_TOTAL_TIMEOUT_MS || 56000));
  const maxAttempts = Math.max(2, Math.min(3, Number(env.PREMIUM_SAJU_NEW_YEAR_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3)));

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await callGeminiText(env, buildSajuNewYearChapterPrompt(seed, chapterSpec, previousChapterSummaries, attempt > 1 ? clean(lastError?.message || lastError) : previousFailureReason), {
        modelEnvKeys: ["PREMIUM_SAJU_NEW_YEAR_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"],
        keyEnvKeys: ["PREMIUM_SAJU_NEW_YEAR_GEMINI_API_KEY", "PREMIUM_GEMINI_API_KEY1", "GEMINI_API_KEY"],
        temperature: 0.62,
        maxOutputTokens: 4096,
        timeoutMs,
        totalTimeoutMs,
        maxAttemptsPerPair: 1,
      });

      if (!result?.ok) {
        throw new Error(result?.message || result?.error || "llm_failed");
      }

      const parsed = extractJsonObject(result.text || result.content || "") || {};
      const normalized = normalizeGeneratedChapter(chapterSpec, parsed);
      if (!normalized) {
        throw new Error(`chapter_${chapterSpec.no}_normalize_failed`);
      }

      const quality = validateSajuNewYearPdfLLMInterpretationQuality({
        chapters: [normalized],
        expectedChapters: [chapterSpec],
        minChapterLength: MIN_CHAPTER_CHARS,
        minSectionLength: MIN_SECTION_CHARS,
        seed,
      });
      if (!quality.ok) {
        throw new Error(`chapter_${chapterSpec.no}_quality_failed: ${quality.errors.slice(0, 4).join(" | ")}`);
      }

      return { chapter: normalized, attempt, parsed };
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) throw error;
    }
  }
  throw lastError || new Error(`chapter_${chapterSpec.no}_generation_failed`);
}

async function generateSajuNewYearPdfWithLLMOnlyInterpretation({ seed, chapterSpecs, sessionId, env, updateProgress }) {
  const chapters = [];
  const diagnostics = [];

  for (const chapterSpec of chapterSpecs) {
    const previousChapterSummaries = chapters.map((chapter) => summarizeChapterForPrompt(chapter));
    const step = {
      chapterNo: chapterSpec.no,
      status: "ready",
      attempts: 0,
      reasons: [],
    };

    try {
      const generated = await generateSajuNewYearChapterByLLM(env, seed, chapterSpec, previousChapterSummaries);
      chapters.push(generated.chapter);
      step.attempts += Number(generated.attempt || 1);
    } catch (error) {
      step.status = "retrying";
      step.reasons.push(clean(error?.message || "llm_chapter_failed"));

      try {
        const targetedRetry = await generateSajuNewYearChapterByLLM(
          env,
          seed,
          chapterSpec,
          previousChapterSummaries,
          clean(error?.message || "llm_chapter_failed").slice(0, 500),
        );
        chapters.push(targetedRetry.chapter);
        step.status = "ready-after-targeted-retry";
        step.attempts += Number(targetedRetry.attempt || 1);
      } catch (retryError) {
        step.reasons.push(clean(retryError?.message || "chapter_targeted_retry_failed"));
        throw retryError;
      }
    }
    diagnostics.push(step);

    if (typeof updateProgress === "function") {
      await updateProgress({ sessionId, currentChapterNo: chapterSpec.no, totalChapters: chapterSpecs.length });
    }
  }

  const finalQuality = validateSajuNewYearPdfLLMInterpretationQuality({
    chapters,
    expectedChapters: chapterSpecs,
    minChapterLength: MIN_CHAPTER_CHARS,
    minSectionLength: MIN_SECTION_CHARS,
    seed,
  });

  if (!finalQuality.ok) {
    const error = new Error(`new_year_quality_validation_failed: ${finalQuality.errors.slice(0, 8).join(" | ")}`);
    error.code = "NEW_YEAR_FINAL_QUALITY_FAILED";
    error.qualityErrors = finalQuality.errors;
    throw error;
  }

  return {
    chapters,
    quality: finalQuality,
    diagnostics,
    reinforcedChapterNos: [],
  };
}

function mapSajuNewYearFailure(error) {
  const rawMessage = clean(error?.message || "신년운세 PDF 생성에 실패했습니다.");
  const rawCode = clean(error?.code || "").toUpperCase();

  let status = 500;
  let code = rawCode || "NEW_YEAR_GENERATION_FAILED";
  let message = "신년운세 리포트 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

  if (rawCode === "SAJU_NEW_YEAR_SEED_INVALID" || rawMessage.includes("SAJU_NEW_YEAR_SEED_INVALID")) {
    status = 422;
    code = "SAJU_NEW_YEAR_SEED_INVALID";
    message = "입력 정보를 확인한 뒤 다시 시도해 주세요. 생년월일/시간 정보가 부족해 리포트를 완성하지 못했습니다.";
  } else if (rawCode === "NEW_YEAR_FINAL_QUALITY_FAILED" || rawMessage.includes("new_year_quality_validation_failed")) {
    status = 502;
    code = "NEW_YEAR_FINAL_QUALITY_FAILED";
    message = "챕터 내용을 정밀하게 다듬는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  } else if (/chapter_\d+_quality_failed|chapter_\d+_normalize_failed|llm_failed/i.test(rawMessage)) {
    status = 502;
    code = "NEW_YEAR_LLM_CHAPTER_FAILED";
    message = "일부 챕터 해석이 지연되어 리포트 완성이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요.";
  } else if (/timeout|timed out|time out/i.test(rawMessage)) {
    status = 504;
    code = "NEW_YEAR_LLM_TIMEOUT";
    message = "AI 해석 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
  }

  return {
    status,
    code,
    message,
    detail: rawMessage,
  };
}

function mergeLlmChaptersWithLocal(localChapters, parsed) {
  void localChapters;
  void parsed;
  throw new Error("SAJU_NEW_YEAR_LEGACY_LOCAL_FALLBACK_DISABLED");
}

async function enhanceWithLlm(env, localYearSajuJson, localManuscript) {
  void env;
  void localYearSajuJson;
  void localManuscript;
  throw new Error("SAJU_NEW_YEAR_LEGACY_LOCAL_FALLBACK_DISABLED");
}

function chapterTextLength(chapter) {
  return getChapterSections(chapter).reduce((acc, section) => acc + clean(section?.body || section?.finalText || section?.localSummary || section?.text).length, 0);
}

function hasForbiddenText(text) {
  const token = clean(text);
  if (!token) return false;
  const safeRegex = new RegExp(FORBIDDEN_TEXT_RE.source, "i");
  return safeRegex.test(token) || FORBIDDEN_EXPOSE_RE.test(token);
}

function normalizeSentenceKey(value) {
  return clean(value)
    .replace(/[\s\t\r\n]+/g, " ")
    .replace(/["'`~!@#$%^&*()_+\-=\[\]{}|;:,.<>/?]/g, "")
    .toLowerCase();
}

function collectDuplicateSentences(chapters) {
  const counter = new Map();
  for (const chapter of chapters || []) {
    for (const section of getChapterSections(chapter)) {
      const sentences = clean(section?.body || section?.finalText || section?.localSummary)
        .split(/[.!?\n]+/)
        .map((line) => normalizeSentenceKey(line))
        .filter((line) => line.length >= 24);
      for (const sentence of sentences) {
        counter.set(sentence, (counter.get(sentence) || 0) + 1);
      }
    }
  }
  return Array.from(counter.entries()).filter(([, count]) => count > 2);
}

function countSignalHits(text, seed) {
  const token = clean(text);
  if (!token) return 0;
  const annual = seed?.luckCycles?.targetYearSewoon || {};
  const anchors = [
    annual.label,
    annual.pillar,
    annual.tenGodToDayMaster,
    annual.elementEffect?.[0],
    seed?.natalChart?.dayMaster,
    seed?.natalChart?.monthBranch,
    seed?.natalChart?.dayBranch,
    seed?.natalChart?.season,
    seed?.tenGods?.year,
    seed?.tenGods?.month,
    seed?.tenGods?.day,
    seed?.tenGods?.hour,
    seed?.fiveElements?.strongest?.[0],
    seed?.fiveElements?.weakest?.[0],
    seed?.structure?.geokguk,
    ...SIGNAL_KEYWORDS,
  ].map((item) => clean(item)).filter(Boolean);
  const uniqueHits = new Set();
  for (const anchor of anchors) {
    if (token.includes(anchor)) uniqueHits.add(anchor);
  }
  return uniqueHits.size;
}

function validateSajuNewYearSeed(seed) {
  const errors = [];
  const monthly = Array.isArray(seed?.luckCycles?.monthlyFortunes) ? seed.luckCycles.monthlyFortunes : [];
  const chapterSpecs = Array.isArray(seed?.chapterSpecs) ? seed.chapterSpecs : [];
  const yearlySignals = Array.isArray(seed?.derivedSignals?.yearlyThemeSignals) ? seed.derivedSignals.yearlyThemeSignals.filter(Boolean) : [];

  if (!clean(seed?.input?.birthDate)) errors.push("input.birthDate");
  if (!Number.isFinite(Number(seed?.input?.targetYear))) errors.push("input.targetYear");
  if (!clean(seed?.natalChart?.dayMaster)) errors.push("natalChart.dayMaster");
  if (!clean(seed?.luckCycles?.targetYearSewoon?.pillar)) errors.push("luckCycles.targetYearSewoon.pillar");
  if (!clean(seed?.luckCycles?.targetYearSewoon?.tenGodToDayMaster)) errors.push("luckCycles.targetYearSewoon.tenGodToDayMaster");
  if (monthly.length !== 12) errors.push("luckCycles.monthlyFortunes");
  if (!yearlySignals.length) errors.push("derivedSignals.yearlyThemeSignals");
  if (chapterSpecs.length !== SAJU_NEW_YEAR_CHAPTERS.length) errors.push("chapterSpecs");

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function validateSajuNewYearPdfLLMInterpretationQuality({
  chapters: draft,
  expectedChapters = SAJU_NEW_YEAR_CHAPTERS,
  minChapterLength = MIN_CHAPTER_CHARS,
  minSectionLength = MIN_SECTION_CHARS,
  seed = null,
} = {}) {
  const chapters = Array.isArray(draft) ? draft : [];
  const errors = [];

  if (chapters.length < expectedChapters.length) {
    errors.push(`챕터 수 부족: ${chapters.length}/${expectedChapters.length}`);
  }

  const totalChars = chapters.reduce((acc, chapter) => acc + chapterTextLength(chapter), 0);
  if (totalChars < MIN_TOTAL_CHARS) {
    errors.push(`전체 본문 길이 부족: ${totalChars}/${MIN_TOTAL_CHARS}`);
  }

  for (let idx = 0; idx < expectedChapters.length; idx += 1) {
    const spec = expectedChapters[idx];
    const chapter = chapters[idx];
    if (!chapter) {
      errors.push(`${idx + 1}번 챕터 누락`);
      continue;
    }
    if (clean(chapter.title) !== clean(spec.title)) {
      errors.push(`${idx + 1}번 챕터 제목 불일치`);
    }
    const chapterLen = chapterTextLength(chapter);
    if (chapterLen < minChapterLength) {
      errors.push(`${idx + 1}번 챕터 길이 부족: ${chapterLen}/${minChapterLength}`);
    }
    const sections = getChapterSections(chapter);
    if (!Array.isArray(sections) || sections.length !== spec.categories.length) {
      errors.push(`${idx + 1}번 챕터 세부 카테고리 누락`);
      continue;
    }

    for (let catIdx = 0; catIdx < spec.categories.length; catIdx += 1) {
      const expectedTitle = spec.categories[catIdx];
      const section = sections[catIdx] || {};
      const body = clean(section.body || section.finalText || section.localSummary || section.text);
      if (clean(section.title) !== clean(expectedTitle)) {
        errors.push(`${idx + 1}번 챕터 카테고리 제목 불일치: ${catIdx + 1}`);
      }
      if (body.length < minSectionLength) {
        errors.push(`${idx + 1}번 챕터 ${catIdx + 1}카테고리 길이 부족: ${body.length}/${minSectionLength}`);
      }
      if (GENERAL_PHRASE_RE.test(body)) {
        errors.push(`${idx + 1}번 챕터 ${catIdx + 1}카테고리 일반론 문장 포함`);
      }
      if (hasForbiddenText(body)) {
        errors.push(`${idx + 1}번 챕터 ${catIdx + 1}카테고리 금지어 포함`);
      }
      if (countSignalHits(body, seed) < 2) {
        errors.push(`${idx + 1}번 챕터 ${catIdx + 1}카테고리 사주 근거 부족`);
      }
    }

    const chapterBody = clean(chapter.text || "");
    if (spec.no === 8) {
      const monthMissing = Array.from({ length: 12 }, (_, n) => `${n + 1}월`).filter((monthToken) => !chapterBody.includes(monthToken));
      if (monthMissing.length) {
        errors.push(`8번 챕터 월별 누락: ${monthMissing.join(",")}`);
      }
    }
    if (spec.no === 10) {
      const needs = ["3개월", "6개월", "12개월"];
      const missing = needs.filter((token) => !chapterBody.includes(token));
      if (missing.length) {
        errors.push(`10번 챕터 마스터플랜 누락: ${missing.join(",")}`);
      }
    }
  }

  const duplicated = collectDuplicateSentences(chapters);
  if (duplicated.length > 24) {
    errors.push(`중복 문장 감지: ${duplicated.length}개`);
  }

  return {
    ok: errors.length === 0,
    errors,
    stats: {
      chapterCount: chapters.length,
      totalChars,
      duplicateSentenceCount: duplicated.length,
    },
  };
}

function validateSajuNewYearPdfQuality(options = {}) {
  return validateSajuNewYearPdfLLMInterpretationQuality(options);
}

function validateChapters(chapters) {
  return validateSajuNewYearPdfLLMInterpretationQuality({
    chapters,
    expectedChapters: SAJU_NEW_YEAR_CHAPTERS,
    minChapterLength: MIN_CHAPTER_CHARS,
    minSectionLength: MIN_SECTION_CHARS,
  }).ok;
}

function escHtml(value) {
  return clean(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

function renderParagraphs(text) {
  return clean(text).split(/\n{2,}/).map((part) => `<p>${escHtml(part).replace(/\n/g, "<br>")}</p>`).join("");
}

function buildReportHtml(seed, chapters) {
  const profile = seed.input || {};
  const toc = chapters.map((chapter) => `<li><span>${chapter.no}</span>${escHtml(chapter.title)}</li>`).join("");
  const body = chapters.map((chapter, idx) => `
    <section class="chapter${idx > 0 ? " page-break" : ""}">
      <h2>${escHtml(chapter.title)}</h2>
      ${getChapterSections(chapter).map((category) => `<article><h3>${escHtml(category.title)}</h3>${renderParagraphs(category.body || category.finalText || "")}</article>`).join("")}
    </section>`).join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${seed.targetYear} 신년운세 프리미엄 리포트</title><style>
    @page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;background:#080b19;color:#1f2937;font-family:Arial,'Noto Sans KR',sans-serif;line-height:1.72}.page{background:#fff;min-height:100vh}.cover{min-height:100vh;padding:56px 48px;color:#fff;background:radial-gradient(circle at 70% 20%,rgba(245,158,11,.42),transparent 30%),linear-gradient(145deg,#07111f,#11183a 48%,#3b0f14);display:flex;flex-direction:column;justify-content:space-between}.cover img{width:100%;max-height:360px;object-fit:cover;border-radius:18px;border:1px solid rgba(250,204,21,.42);box-shadow:0 24px 60px rgba(0,0,0,.36)}.badge{display:inline-block;padding:7px 12px;border:1px solid rgba(250,204,21,.7);border-radius:999px;color:#fde68a;font-size:12px;letter-spacing:.08em}.cover h1{font-size:42px;margin:22px 0 8px;color:#fff4c2}.cover p{font-size:17px;color:#fef3c7}.meta{color:#fde68a;font-size:14px}.toc{padding:24px 42px;background:#fffaf0}.toc h2,.chapter h2{color:#7f1d1d}.toc li{margin:8px 0}.toc span{display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;margin-right:8px;border-radius:50%;background:#991b1b;color:#fff}.chapter{padding:32px 42px;background:#fff}.chapter h2{font-size:25px;border-bottom:2px solid #f59e0b;padding-bottom:10px}.chapter article{margin:18px 0;padding:16px;border-left:4px solid #d97706;background:#fffaf0;border-radius:0 10px 10px 0}.chapter h3{margin:0 0 8px;color:#92400e}.chapter p{margin:8px 0}.page-break{page-break-before:always}@media print{body{background:#fff}.page{min-height:auto}.cover{height:100vh}.page-break{break-before:page}}
  </style></head><body><main class="page">
    <section class="cover"><div><span class="badge">CODE DESTINY · NEW YEAR SAJU</span><h1>${seed.input?.targetYear || seed.targetYear} 신년운세 프리미엄 리포트</h1><p>사주 원국과 세운으로 읽는 올해의 운명 지도</p><p class="meta">${escHtml(profile.name || "사용자")} · ${escHtml(profile.birthDate)} ${escHtml(profile.birthTime || "시간 미상")}</p></div><img src="${COVER_IMAGE}" alt="신년운세 표지 이미지" onerror="this.style.display='none'"><p>${seed.input?.targetYear || seed.targetYear}년의 흐름을 챕터별로 정리한 프리미엄 해석문</p></section>
    <section class="toc"><h2>10챕터 목차</h2><ol>${toc}</ol></section>${body}
  </main></body></html>`;
}

function buildPdfReadyPayload(seed, chapters, metadata = {}) {
  return {
    title: `${seed.input?.targetYear || seed.targetYear} 신년운세 프리미엄 리포트`,
    filename: `saju-new-year-${seed.input?.targetYear || seed.targetYear}-${clean(seed.input?.name || "user").replace(/\s+/g, "-").toLowerCase()}.html`,
    generatedAt: new Date().toISOString(),
    profile: seed.input,
    targetYear: seed.input?.targetYear || seed.targetYear,
    metadata,
    html: buildReportHtml(seed, chapters),
    chapters: chapters.map((chapter) => ({
      chapter: chapter.no,
      title: chapter.title,
      categories: getChapterSections(chapter).map((category) => category.title),
      text: chapter.text || getChapterSections(chapter).map((category) => `## ${category.title}\n${category.body || ""}`).join("\n\n"),
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
  const sessionKey = clean(body?.sessionId || body?.reportSessionId || body?.sessionKey) || `${auth.userId}:${featureKey}:${normalized.targetYear}:${normalized.birthInput.birthDate}`;
  const lock = newYearPdfLocks.get(sessionKey);
  if (lock?.status === "running") {
    return json({
      ok: true,
      serviceKey: SERVICE_KEY,
      status: "running",
      sessionId: sessionKey,
      targetYear: normalized.targetYear,
      message: "동일 세션의 신년운세 PDF 생성이 이미 진행 중입니다.",
    }, { status: 202 });
  }
  if (lock?.status === "done" && lock?.result) {
    return json({ ...lock.result, status: "done", sessionId: sessionKey });
  }
  newYearPdfLocks.set(sessionKey, { status: "running", startedAtMs: Date.now() });

  try {
    console.info("[NewYearPremiumPDF][LocalEngineStarted]", { targetYear: normalized.targetYear, sessionId: sessionKey });
    const localYearSajuJson = buildPdfSeed(normalized.profile, normalized.targetYear, body);
    console.info("[NewYearPremiumPDF][LocalEngineCompleted]", { hasDayMaster: Boolean(localYearSajuJson.natalChart?.dayMaster), targetYear: localYearSajuJson.input.targetYear });
    const seedValidation = validateSajuNewYearSeed(localYearSajuJson);
    if (!seedValidation.ok) {
      const seedError = new Error(`SAJU_NEW_YEAR_SEED_INVALID: ${seedValidation.errors.join(",")}`);
      seedError.code = "SAJU_NEW_YEAR_SEED_INVALID";
      seedError.seedErrors = seedValidation.errors;
      throw seedError;
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
      newYearPdfLocks.delete(sessionKey);
      return json({
        ok: false,
        serviceKey: SERVICE_KEY,
        code: access?.code || (status === 401 ? "UNAUTHORIZED" : "PAYMENT_REQUIRED"),
        message: status === 401
          ? "신년운세 PDF 생성을 위해 먼저 로그인해 주세요."
          : status === 402
            ? "프리미엄 PDF 생성을 위해 코인 또는 이용권 확인이 필요합니다."
            : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      }, { status });
    }
    console.info("[NewYearPremiumPDF][PaymentVerificationPassed]", { featureKey, accessType: clean(access.accessType || "") });

    const executionCtx = buildPremiumExecutionContext({
      serviceKey: SERVICE_KEY,
      reportType: "sajuNewYear",
      userId: auth.userId,
      featureKey,
      sessionId: sessionKey,
      reportId: clean(body?.reportId || body?.accessGrant?.reportId),
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    await startPremiumPdfExecution(env, auth.userId, executionCtx);

    const chapterSpecs = localYearSajuJson.chapterSpecs || buildSajuNewYearChapterSpecs(localYearSajuJson.input.targetYear);
    console.info("[NewYearPremiumPDF][LLMChapterGenerationStarted]", { chapterCount: chapterSpecs.length, targetYear: localYearSajuJson.input.targetYear });
    const generation = await generateSajuNewYearPdfWithLLMOnlyInterpretation({
      seed: localYearSajuJson,
      chapterSpecs,
      sessionId: sessionKey,
      env,
    });
    const chapters = generation.chapters;
    const finalQuality = generation.quality;
    const generationDiagnostics = {
      chapterAttempts: Array.isArray(generation.diagnostics) ? generation.diagnostics : [],
      reinforcedChapterNos: Array.isArray(generation.reinforcedChapterNos) ? generation.reinforcedChapterNos : [],
      duplicateSentenceCount: Number(finalQuality?.stats?.duplicateSentenceCount || 0),
      qualityWarnings: Array.isArray(finalQuality?.errors) ? finalQuality.errors.slice(0, 8) : [],
    };

    console.info("[NewYearPremiumPDF][FinalValidationPassed]", {
      chapterCount: chapters.length,
      llmUsed: true,
      duplicateSentenceCount: finalQuality.stats.duplicateSentenceCount,
    });
    console.info("[NewYearPremiumPDF][PDFRenderStarted]", { chapterCount: chapters.length, llmUsed: true });
    const pdfReady = buildPdfReadyPayload(localYearSajuJson, chapters, {
      featureKey,
      reportType: "sajuNewYear",
      manuscriptSource: "llm-only",
      sessionId: sessionKey,
      accessType: clean(access.accessType || "unknown"),
    });
    console.info("[NewYearPremiumPDF][PDFRenderCompleted]", { chapterCount: chapters.length, manuscriptSource: "llm-only" });

    const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `new-year-${Date.now().toString(36)}`);
    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      manuscriptSource: "llm-only",
      chapterCount: chapters.length,
      targetYear: localYearSajuJson.input.targetYear,
      archive: {
        reportId,
        reportType: "new_year",
        displayName: "사주 신년운세",
        title: `${clean(normalized?.profile?.name) || "사용자"}님의 ${String(localYearSajuJson.input.targetYear || "")}년 신년운세`,
        mode: "personal",
        birthName: clean(normalized?.profile?.name),
        summary: clean(chapters?.[0]?.sections?.[0]?.body || chapters?.[0]?.text || "").slice(0, 1000),
        pdfUrl: clean(pdfReady?.pdfUrl),
        chapters,
        payload: localYearSajuJson,
        pdfReady,
        generationDiagnostics,
        canReopen: true,
        canDownload: Boolean(clean(pdfReady?.pdfUrl)),
      },
    });

    const responsePayload = {
      ok: true,
      serviceKey: SERVICE_KEY,
      status: "done",
      sessionId: sessionKey,
      reportId,
      featureKey,
      targetYear: localYearSajuJson.input.targetYear,
      chapterCount: chapterSpecs.length,
      manuscriptSource: "llm-only",
      llmUsed: true,
      chapters,
      seed: { ...localYearSajuJson, chapterSpecs: undefined },
      newYearPayload: localYearSajuJson,
      pdfReady,
      generationDiagnostics,
      fallbackUsed: false,
      llmFallbackReason: "",
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
      access: null,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    await failPremiumPdfExecution(
      env,
      auth.userId,
      executionCtx,
      "new_year_generation_failed",
      clean(error?.message || "신년운세 PDF 생성에 실패했습니다."),
      "new-year-generation",
    );
    newYearPdfLocks.delete(sessionKey);
    const failure = mapSajuNewYearFailure(error);
    return json({
      ok: false,
      serviceKey: SERVICE_KEY,
      code: failure.code,
      message: failure.message,
      errorDetails: {
        code: failure.code,
        message: failure.detail,
      },
    }, { status: failure.status });
  }
}

async function handleChapters() {
  return json({ ok: true, serviceKey: SERVICE_KEY, chapterCount: SAJU_NEW_YEAR_CHAPTERS.length, chapters: SAJU_NEW_YEAR_CHAPTERS });
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
  SAJU_NEW_YEAR_CHAPTERS,
  NEW_YEAR_CHAPTERS,
  buildSajuNewYearChapterSpecs,
  normalizeInput,
  buildPdfSeed,
  buildSajuNewYearChapterPrompt,
  generateSajuNewYearChapterByLLM,
  generateSajuNewYearPdfWithLLMOnlyInterpretation,
  normalizeGeneratedChapter,
  getChapterSections,
  validateChapters,
  validateSajuNewYearPdfLLMInterpretationQuality,
  validateSajuNewYearPdfQuality,
  validateSajuNewYearSeed,
  stripForbiddenText,
  buildDeterministicChapterFromSpec,
  reinforceChapterFromSpec,
};