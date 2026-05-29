import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { callGeminiText } from "../lib/gemini.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";

const SERVICE_KEY = "saju-new-year";
const FEATURE_KEY = "premium_pdf_saju_new_year";
const FEATURE_ALIASES = new Set(["saju_new_year_pdf", "premium-saju-newyear-report", "premium_pdf_saju_yearly"]);
const COVER_IMAGE = "/fuctionassets/신년운세.webp";
const NEW_YEAR_PDF_LOCK_TTL_MS = 15 * 60 * 1000;
const newYearPdfLocks = new Map();
const FORBIDDEN_TEXT_RE = /\b(?:fallback|payload|json|debug|internal\s*server\s*error|undefined|null|nan|object|calculationmode|recovered|about:blank)\b|자동\s*복구\s*생성|chapter\s*1\s*chapter\s*1|데이터가\s*부족합니다/gi;
const MIN_SECTION_CHARS = 650;
const MIN_CHAPTER_CHARS = 2000;
const MIN_TOTAL_CHARS = 25000;

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

export const NEW_YEAR_CHAPTERS = Object.freeze([
  { no: 1, title: "제1장 올해의 운세 총론", categories: ["한 해를 관통하는 핵심 기운", "원국과 세운의 기준축", "올해 선택의 우선순위", "총론 실행 포인트"] },
  { no: 2, title: "제2장 대운과 세운의 충돌·조화", categories: ["대운-세운 결합 신호", "합·충·해·파 리스크", "원국에서 깨어나는 기회", "올해 조정해야 할 습관"] },
  { no: 3, title: "제3장 직업·사업운", categories: ["일의 방향과 성과 흐름", "직장·사업 운영 포인트", "확장 타이밍과 보수 타이밍", "커리어 의사결정 기준"] },
  { no: 4, title: "제4장 재물운", categories: ["수입 증가 포인트", "지출·손실 관리", "계약·투자 점검", "현금흐름 운영 전략"] },
  { no: 5, title: "제5장 연애·결혼운", categories: ["만남과 인연의 창", "관계 깊이 조절", "갈등 신호 관리", "사랑의 실행 조언"] },
  { no: 6, title: "제6장 인간관계·가족운", categories: ["가족과 가까운 관계 흐름", "귀인과 협력 신호", "거리 조절이 필요한 관계", "관계운 실전 가이드"] },
  { no: 7, title: "제7장 건강·심신운", categories: ["생활 리듬과 에너지", "스트레스 누적 지점", "회복이 필요한 시기", "몸과 마음 관리 루틴"] },
  { no: 8, title: "제8장 월별 운세 지도", categories: ["1월~3월 흐름", "4월~6월 흐름", "7월~9월 흐름", "10월~12월 흐름"] },
  { no: 9, title: "제9장 위기와 기회", categories: ["밀어붙일 타이밍", "주의해야 할 달", "변화·이동·계약 판단", "리스크 최소화 체크리스트"] },
  { no: 10, title: "제10장 올해의 실행 전략", categories: ["사랑 전략", "일 전략", "돈 전략", "건강 전략"] },
]);

const MIN_CATEGORY_TEXT_LENGTH = 180;

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

  return { engine, sajuBase, pillars, dayMaster, fiveElements, tenGods, usefulGods, daeun };
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
  const sliceStart = chapter.no === 8 ? idx * 3 : idx;
  const focusMonths = monthly.slice(sliceStart, sliceStart + (chapter.no === 8 ? 3 : 2));
  const monthlyLine = focusMonths
    .map((item) => `${item.month}월(${item.pillar?.label || "미상"}, ${item.score}점/${item.tone})`)
    .join(", ");
  const relationRows = Array.isArray(seed?.saju?.relations?.branchRelations) ? seed.saju.relations.branchRelations : [];
  const relationLine = relationRows.slice(0, 2).map((row) => `${row.label}-${row.type}`).join(", ") || "합충 신호 약함";
  return [
    `핵심 근거: 세운 ${annual.label || "미상"}(${annual.elementKo || "토"}), 일간 기준 십성 ${annual.tenGod || "미정"}, 오행 관계 ${annual.dayMasterRelation || "중립"}.`,
    `원국 기준: 일간 ${seed?.saju?.dayMaster || "미상"}, 연/월/일/시 지지 ${pillars.year?.branch || "-"}/${pillars.month?.branch || "-"}/${pillars.day?.branch || "-"}/${pillars.hour?.branch || "-"}, 관계 신호 ${relationLine}.`,
    monthlyLine ? `월별 포인트: ${monthlyLine}.` : "월별 포인트: 월운 데이터 기준으로 보수/확장 리듬을 분리 운영합니다.",
    `${category} 판단은 단일 사건 예언이 아니라 위 근거를 실행 우선순위와 리스크 관리 규칙으로 변환해 읽습니다.`,
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
    const start = idx * 3;
    const months = seed.saju.monthlyLuck.slice(start, start + 3);
    const monthly = months.map((item) => `${item.month}월은 ${item.pillar.label} 흐름으로 ${item.tone} 운영이 알맞고, 점수 ${item.score} 기준에서는 ${item.advice}`).join(" ");
    return `${monthly}\n\n${evidence}\n\n이 구간은 ${annual.label} 세운의 ${annual.elementKo} 기운이 실제 일정 속에서 드러나는 시기입니다. 높은 점수의 달에는 약속과 제안을 넓히고, 낮은 점수의 달에는 문서와 지출, 감정적 결정을 한 번 더 확인하는 방식이 안전합니다. 특히 점수 하락 구간에서는 계약 조항, 현금흐름, 관계 메시지의 오해 가능성을 체크리스트로 선제 관리하면 손실을 줄일 수 있습니다.`;
  }
  return `${line} ${category}에서는 ${annual.label} 세운의 ${annual.tenGod} 성격을 현실 선택으로 바꾸는 것이 중요합니다. 현재 계산된 사주와 세운에서 확인되는 범위에서는 강하게 밀어붙이는 결정과 천천히 다듬어야 할 결정을 구분할수록 결과가 안정됩니다.\n\n${evidence}\n\n${relationText} 따라서 올해는 운을 기다리기보다 일정, 관계, 돈의 기준선을 미리 정해두는 편이 좋습니다. 작은 신호를 기록하고 반복되는 상황을 조정하면 ${seed.targetYear}년의 흐름을 내 쪽으로 끌어올 수 있습니다. 실행 단위는 월간 목표 1개, 주간 점검 1회, 위험 신호 발생 시 즉시 축소/보완의 3단계로 운영하는 것을 권합니다.`;
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

function ensureMinLength(text, minLength, seed, categoryTitle) {
  let result = stripForbiddenText(text);
  const annual = seed?.saju?.annualLuck || {};
  const addition = `${seed.targetYear}년 ${annual.label || "세운"} 기준으로 ${categoryTitle} 판단은 월별 강약과 관계 신호를 함께 보아야 안정적입니다. 점수가 높은 달에는 실행 폭을 넓히고, 낮은 달에는 문서·관계·지출을 재점검하는 이중 트랙 운영이 손실을 줄입니다. 또한 선택 기준을 미리 문장화해 두면 같은 변수에도 흔들림 없이 대응할 수 있습니다.`;
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

function normalizeGeneratedChapter(chapter, generated) {
  const sections = Array.isArray(generated?.sections) ? generated.sections : [];
  if (sections.length !== chapter.categories.length) return null;
  const categories = chapter.categories.map((category, idx) => {
    const section = sections[idx] || {};
    const body = ensureMinLength(section.body || section.text || section.content, 420, { targetYear: new Date().getFullYear(), saju: {} }, category.title);
    if (body.length < 300) return null;
    return { title: category.title, localSummary: category.localSummary, finalText: stripForbiddenText(body) };
  });
  if (categories.some((item) => !item)) return null;
  return {
    ...chapter,
    categories,
    text: categories.map((item) => `## ${item.title}\n${item.finalText}`).join("\n\n"),
    source: "llm",
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
    "당신은 사주명리학과 신년운세 상담에 능한 최고 수준의 전문 상담가입니다.",
    "제공된 사주 원국, 대운, 세운, 월별 흐름 데이터와 로컬 원고만 근거로 사용하세요.",
    "사주 계산을 새로 하거나 JSON에 없는 신살, 격국, 용신, 월운을 임의로 만들지 마세요.",
    "챕터 번호/제목/카테고리 제목은 절대 변경하지 마세요.",
    "각 세부 카테고리는 사용자가 읽는 완성형 상담문으로 최소 4문단, 450자 이상 작성하세요.",
    "각 카테고리 본문에는 최소 2개의 실제 근거(세운 천간/지지, 십성, 오행 관계, 월별 점수)를 명시하세요.",
    "문단 구성은 1) 근거 해석 2) 리스크/기회 판별 3) 실행 전략 순서로 유지하세요.",
    "예언 단정 대신 선택과 전략, 실전 조언 중심으로 쓰세요.",
    "본문에 payload, engine, debug, raw JSON, fallback 같은 내부 표현을 쓰지 마세요.",
    "반드시 JSON만 반환하세요.",
    "형식: {\"chapters\":[{\"no\":1,\"title\":\"제1장 ...\",\"sections\":[{\"title\":\"카테고리\",\"body\":\"상담문\"}]}]}",
    JSON.stringify(safeSeed),
  ].join("\n");
}

function mergeLlmChaptersWithLocal(localChapters, parsed) {
  const incoming = Array.isArray(parsed?.chapters) ? parsed.chapters : [];
  if (!incoming.length) {
    return { chapters: localChapters.map((chapter) => ({ ...chapter, source: "local-fallback" })), fallbackUsed: true, llmMergedCount: 0 };
  }

  let fallbackUsed = false;
  let llmMergedCount = 0;
  const chapters = localChapters.map((localChapter) => {
    const generated = incoming.find((item) => toInt(item?.no, 0) === localChapter.no && clean(item?.title) === localChapter.title);
    if (!generated) {
      fallbackUsed = true;
      return { ...localChapter, source: "local-fallback" };
    }
    const normalized = normalizeGeneratedChapter(localChapter, generated);
    if (!normalized) {
      fallbackUsed = true;
      return { ...localChapter, source: "local-fallback" };
    }
    llmMergedCount += 1;
    return { ...normalized, source: "llm-enhanced" };
  });
  return { chapters, fallbackUsed, llmMergedCount };
}

async function enhanceWithLlm(env, localYearSajuJson, localManuscript) {
  const timeoutMs = Math.min(45000, Number(env.PREMIUM_SAJU_NEW_YEAR_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 38000));
  const totalTimeoutMs = Math.min(52000, Number(env.PREMIUM_SAJU_NEW_YEAR_GEMINI_TOTAL_TIMEOUT_MS || 50000));
  const maxAttempts = Math.min(2, Number(env.PREMIUM_SAJU_NEW_YEAR_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 2));
  console.info("[NewYearPremiumPDF][LLMEnhancementStarted]", { chapterCount: localManuscript.length, timeoutMs, totalTimeoutMs, maxAttempts });

  const result = await callGeminiText(env, buildManuscriptEnhancePrompt(localYearSajuJson, localManuscript), {
    modelEnvKeys: ["PREMIUM_SAJU_NEW_YEAR_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"],
    keyEnvKeys: ["PREMIUM_SAJU_NEW_YEAR_GEMINI_API_KEY", "PREMIUM_GEMINI_API_KEY1", "GEMINI_API_KEY"],
    temperature: 0.68,
    maxOutputTokens: 8192,
    timeoutMs,
    totalTimeoutMs,
    maxAttemptsPerPair: maxAttempts,
  });

  if (!result?.ok) {
    throw new Error(result?.message || result?.error || "llm_failed");
  }
  const parsed = extractJsonObject(result.text || result.content || "");
  const merged = mergeLlmChaptersWithLocal(localManuscript, parsed);
  console.info("[NewYearPremiumPDF][LLMEnhancementCompleted]", { llmMergedCount: merged.llmMergedCount, fallbackUsed: merged.fallbackUsed });
  return merged;
}

function chapterTextLength(chapter) {
  return (chapter?.categories || []).reduce((acc, category) => acc + clean(category?.finalText).length, 0);
}

function hasForbiddenText(text) {
  const token = clean(text);
  if (!token) return false;
  const safeRegex = new RegExp(FORBIDDEN_TEXT_RE.source, "i");
  return safeRegex.test(token);
}

function validateChapters(chapters) {
  if (!Array.isArray(chapters) || chapters.length !== NEW_YEAR_CHAPTERS.length) return false;
  const totalChars = chapters.reduce((acc, chapter) => acc + chapterTextLength(chapter), 0);
  if (totalChars < MIN_TOTAL_CHARS) return false;
  return NEW_YEAR_CHAPTERS.every((blueprint, idx) => {
    const chapter = chapters[idx];
    if (!chapter || chapter.title !== blueprint.title) return false;
    if (!Array.isArray(chapter.categories) || chapter.categories.length !== blueprint.categories.length) return false;
    if (chapterTextLength(chapter) < MIN_CHAPTER_CHARS) return false;
    return blueprint.categories.every((category, catIdx) => {
      const text = clean(chapter.categories[catIdx]?.finalText || chapter.categories[catIdx]?.localSummary);
      if (chapter.categories[catIdx]?.title !== category) return false;
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

function renderParagraphs(text) {
  return clean(text).split(/\n{2,}/).map((part) => `<p>${escHtml(part).replace(/\n/g, "<br>")}</p>`).join("");
}

function buildReportHtml(seed, chapters) {
  const profile = seed.birthProfile;
  const monthlyRows = seed.saju.monthlyLuck.map((item) => `<tr><td>${item.month}월</td><td>${escHtml(item.pillar.label)}</td><td>${escHtml(item.tone)}</td><td>${item.score}</td><td>${escHtml(item.advice)}</td></tr>`).join("");
  const toc = chapters.map((chapter) => `<li><span>${chapter.no}</span>${escHtml(chapter.title)}</li>`).join("");
  const body = chapters.map((chapter, idx) => `
    <section class="chapter${idx > 0 ? " page-break" : ""}">
      <h2>${escHtml(chapter.title)}</h2>
      ${chapter.categories.map((category) => `<article><h3>${escHtml(category.title)}</h3>${renderParagraphs(category.finalText)}</article>`).join("")}
    </section>`).join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${seed.targetYear} 신년운세 프리미엄 리포트</title><style>
    @page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;background:#080b19;color:#1f2937;font-family:Arial,'Noto Sans KR',sans-serif;line-height:1.72}.page{background:#fff;min-height:100vh}.cover{min-height:100vh;padding:56px 48px;color:#fff;background:radial-gradient(circle at 70% 20%,rgba(245,158,11,.42),transparent 30%),linear-gradient(145deg,#07111f,#11183a 48%,#3b0f14);display:flex;flex-direction:column;justify-content:space-between}.cover img{width:100%;max-height:360px;object-fit:cover;border-radius:18px;border:1px solid rgba(250,204,21,.42);box-shadow:0 24px 60px rgba(0,0,0,.36)}.badge{display:inline-block;padding:7px 12px;border:1px solid rgba(250,204,21,.7);border-radius:999px;color:#fde68a;font-size:12px;letter-spacing:.08em}.cover h1{font-size:42px;margin:22px 0 8px;color:#fff4c2}.cover p{font-size:17px;color:#fef3c7}.meta{color:#fde68a;font-size:14px}.content{padding:34px 42px;background:#fff}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}.summary div{border:1px solid #f1d58b;background:#fff8e1;border-radius:10px;padding:12px}.toc{padding:24px 42px;background:#fffaf0}.toc h2,.chapter h2{color:#7f1d1d}.toc li{margin:8px 0}.toc span{display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;margin-right:8px;border-radius:50%;background:#991b1b;color:#fff}.chapter{padding:32px 42px;background:#fff}.chapter h2{font-size:25px;border-bottom:2px solid #f59e0b;padding-bottom:10px}.chapter article{margin:18px 0;padding:16px;border-left:4px solid #d97706;background:#fffaf0;border-radius:0 10px 10px 0}.chapter h3{margin:0 0 8px;color:#92400e}.chapter p{margin:8px 0}.monthly{width:100%;border-collapse:collapse;margin:18px 0;background:#fff}.monthly th,.monthly td{border:1px solid #ead7a6;padding:8px;font-size:12px;text-align:left}.monthly th{background:#7f1d1d;color:#fff}.page-break{page-break-before:always}@media print{body{background:#fff}.page{min-height:auto}.cover{height:100vh}.page-break{break-before:page}}
  </style></head><body><main class="page">
    <section class="cover"><div><span class="badge">CODE DESTINY · NEW YEAR SAJU</span><h1>${seed.targetYear} 신년운세 프리미엄 리포트</h1><p>사주 원국과 세운으로 읽는 올해의 운명 지도</p><p class="meta">${escHtml(profile.name || "사용자")} · ${escHtml(profile.birthDate)} ${escHtml(profile.birthTime || "시간 미상")}</p></div><img src="${COVER_IMAGE}" alt="신년운세 표지 이미지" onerror="this.style.display='none'"><p>${seed.targetYear}년 나의 운의 흐름과 선택 전략</p></section>
    <section class="content"><h2>올해의 핵심 요약</h2><div class="summary"><div><strong>세운</strong><br>${escHtml(seed.saju.annualLuck.label)} · ${escHtml(seed.saju.annualLuck.elementKo)}</div><div><strong>일간 관계</strong><br>${escHtml(seed.saju.annualLuck.tenGod)} · ${escHtml(seed.saju.annualLuck.dayMasterRelation)}</div><div><strong>월별 운영</strong><br>강한 달과 보수 달을 분리해 실행</div></div><table class="monthly"><thead><tr><th>월</th><th>월운</th><th>흐름</th><th>점수</th><th>전략</th></tr></thead><tbody>${monthlyRows}</tbody></table></section>
    <section class="toc"><h2>10챕터 목차</h2><ol>${toc}</ol></section>${body}
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
    console.info("[NewYearPremiumPDF][LocalEngineCompleted]", { hasDayMaster: Boolean(localYearSajuJson.saju.dayMaster), targetYear: localYearSajuJson.targetYear });

    const localManuscript = buildLocalSkeleton(localYearSajuJson);
    const localTotalChars = localManuscript.reduce((acc, chapter) => acc + chapterTextLength(chapter), 0);
    console.info("[NewYearPremiumPDF][LocalChapterDraftCompleted]", { chapterCount: localManuscript.length, totalChars: localTotalChars });
    if (!validateChapters(localManuscript)) {
      newYearPdfLocks.delete(sessionKey);
      return json({
        ok: false,
        serviceKey: SERVICE_KEY,
        code: "LOCAL_DRAFT_INVALID",
        message: "신년운세 로컬 원고 생성 품질 검증에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      }, { status: 500 });
    }
    console.info("[NewYearPremiumPDF][LocalQualityValidationPassed]", { chapterCount: localManuscript.length, totalChars: localTotalChars });

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

    let chapters = localManuscript;
    let fallbackUsed = false;
    let manuscriptSource = "local-only";
    try {
      const enhanced = await enhanceWithLlm(env, localYearSajuJson, localManuscript);
      chapters = enhanced.chapters;
      fallbackUsed = Boolean(enhanced.fallbackUsed);
      manuscriptSource = enhanced.llmMergedCount > 0 ? (fallbackUsed ? "mixed" : "llm-enhanced") : "local-only";
    } catch (error) {
      fallbackUsed = true;
      manuscriptSource = "local-only";
      chapters = localManuscript.map((chapter) => ({ ...chapter, source: "local-fallback" }));
      console.warn("[NewYearPremiumPDF][LLMEnhancementFailed]", normalizeNewYearBookError(error));
    }

    if (!validateChapters(chapters)) {
      fallbackUsed = true;
      manuscriptSource = "local-only";
      chapters = localManuscript.map((chapter) => ({ ...chapter, source: "local-fallback" }));
    }

    console.info("[NewYearPremiumPDF][FinalValidationPassed]", { chapterCount: chapters.length, fallbackUsed, manuscriptSource });
    console.info("[NewYearPremiumPDF][PDFRenderStarted]", { chapterCount: chapters.length, fallbackUsed });
    const pdfReady = buildPdfReadyPayload(localYearSajuJson, chapters, {
      featureKey,
      reportType: "sajuNewYear",
      fallbackUsed,
      manuscriptSource,
      sessionId: sessionKey,
      accessType: clean(access.accessType || "unknown"),
    });
    console.info("[NewYearPremiumPDF][PDFRenderCompleted]", { chapterCount: chapters.length, manuscriptSource });

    const responsePayload = {
      ok: true,
      serviceKey: SERVICE_KEY,
      status: "done",
      sessionId: sessionKey,
      featureKey,
      targetYear: localYearSajuJson.targetYear,
      chapterCount: NEW_YEAR_CHAPTERS.length,
      localDraftChapterCount: localManuscript.length,
      manuscriptSource,
      llmUsed: manuscriptSource !== "local-only",
      chapters,
      seed: { ...localYearSajuJson, chapters: undefined },
      newYearPayload: localYearSajuJson,
      pdfReady,
      fallbackUsed,
      llmFallbackReason: fallbackUsed ? "LLM 보강이 불안정하여 로컬 원고로 안전하게 완료되었습니다." : "",
    };

    newYearPdfLocks.set(sessionKey, { status: "done", startedAtMs: Date.now(), result: responsePayload });
    return json(responsePayload);
  } catch (error) {
    newYearPdfLocks.delete(sessionKey);
    throw error;
  }
}

async function handleChapters() {
  return json({ ok: true, serviceKey: SERVICE_KEY, chapterCount: NEW_YEAR_CHAPTERS.length, chapters: NEW_YEAR_CHAPTERS });
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
  mergeLlmChaptersWithLocal,
  validateChapters,
  stripForbiddenText,
};