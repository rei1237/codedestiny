import { Lunar, Solar } from "lunar-javascript";

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
  巳: { element: "fire", hiddenStems: ["丙", "戊", "庚"], ko: "사" },
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
    premium: true,
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
    premium: true,
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
    premium: true,
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
  if (text === "M" || text === "F") return text;
  return "OTHER";
}

function normalizeCalendarType(value) {
  const text = String(value || "solar").trim().toLowerCase();
  if (text === "lunar" || text === "lunar_leap") return text;
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

export function normalizeBirthPayload(rawBirth = {}) {
  const dateParts = parseBirthDateParts(rawBirth.birthDate || rawBirth.date || rawBirth.solarDate || rawBirth.birthday || "");
  const timeParts = parseBirthTimeParts(rawBirth.birthTime || rawBirth.time || "");
  const calendarType = normalizeCalendarType(rawBirth.calendarType || rawBirth.calendar || rawBirth.type);
  const normalized = {
    calendarType,
    year: clampInt(rawBirth.year ?? dateParts?.year, 1900, 2100),
    month: clampInt(rawBirth.month ?? dateParts?.month, 1, 12),
    day: clampInt(rawBirth.day ?? dateParts?.day, 1, 31),
    hour: clampInt(rawBirth.hour ?? timeParts?.hour, 0, 23),
    minute: clampInt(rawBirth.minute ?? timeParts?.minute, 0, 59),
    unknownTime: Boolean(rawBirth.unknownTime),
  };

  if (normalized.unknownTime) {
    normalized.hour = 12;
    normalized.minute = 0;
  }
  return normalized;
}

function createSolarFromBirth(birth) {
  const safeBirth = normalizeBirthPayload(birth);
  if (safeBirth.calendarType === "solar") {
    return Solar.fromYmdHms(safeBirth.year, safeBirth.month, safeBirth.day, safeBirth.hour, safeBirth.minute, 0);
  }

  const lunarMonth = safeBirth.calendarType === "lunar_leap" ? -safeBirth.month : safeBirth.month;
  const lunar = Lunar.fromYmd(safeBirth.year, lunarMonth, safeBirth.day);
  const solar = lunar.getSolar();
  return Solar.fromYmdHms(
    solar.getYear(),
    solar.getMonth(),
    solar.getDay(),
    safeBirth.hour,
    safeBirth.minute,
    0,
  );
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
  const monthRaw = typeof lunar.getMonth === "function" ? lunar.getMonth() : lunar.month;
  const month = Number(monthRaw);
  if (!Number.isFinite(month)) return 1;
  return Math.max(1, Math.abs(Math.trunc(month)));
}

function resolveIsLeapMonth(lunar) {
  if (!lunar || typeof lunar !== "object") return false;
  if (typeof lunar.isLeap === "function") {
    return Boolean(lunar.isLeap());
  }
  const monthRaw = typeof lunar.getMonth === "function" ? lunar.getMonth() : lunar.month;
  const month = Number(monthRaw);
  return Number.isFinite(month) ? month < 0 : false;
}

export function buildSajuProfile(rawPerson) {
  const name = normalizeName(rawPerson?.name, "사용자");
  const gender = normalizeGender(rawPerson?.gender);
  const birth = normalizeBirthPayload(rawPerson?.birth || {});
  const solar = createSolarFromBirth(birth);
  const lunar = solar.getLunar();
  const lunarMonth = resolveLunarMonthValue(lunar);
  const eightChar = lunar.getEightChar();

  const includeHour = !birth.unknownTime;
  const pillars = {
    year: normalizePillar(eightChar.getYearGan(), eightChar.getYearZhi()),
    month: normalizePillar(eightChar.getMonthGan(), eightChar.getMonthZhi()),
    day: normalizePillar(eightChar.getDayGan(), eightChar.getDayZhi()),
    hour: normalizePillar(eightChar.getTimeGan(), eightChar.getTimeZhi()),
  };

  const dayMasterStem = pillars.day.stem;
  const dayMasterElement = stemElement(dayMasterStem);

  const elementProfile = buildElementScores(pillars, includeHour);
  const tenGodProfile = buildTenGodProfile(dayMasterStem, pillars, includeHour);
  const usefulGods = buildUsefulGods(dayMasterElement, elementProfile);

  return {
    name,
    gender,
    birth,
    calendar: {
      solarDate: formatDateLabel(solar.getYear(), solar.getMonth(), solar.getDay()),
      lunarDate: formatDateLabel(lunar.getYear(), lunarMonth, lunar.getDay()),
      isLeapMonth: resolveIsLeapMonth(lunar),
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

function todayDayPillar() {
  const now = new Date();
  const solar = Solar.fromYmdHms(now.getFullYear(), now.getMonth() + 1, now.getDate(), 12, 0, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  return {
    stem: String(ec.getDayGan() || ""),
    branch: String(ec.getDayZhi() || ""),
  };
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
