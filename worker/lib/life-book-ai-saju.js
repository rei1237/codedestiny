import { LunarUtil, Solar } from "lunar-javascript";

// 🔴 년주·월주의 절기 경계는 전부 코어에서 나온다. lunar-javascript 의 절기 시각은 **중국 표준시(CST)
// 벽시계**라, 생시를 KST 벽시계로 넘기면 월건 경계가 정확히 60분 이르다.
// 실측 2026-08-27: 節 경계 오프셋별 월주 불일치 −61분 0/72 · **−30분 72/72 · −1분 72/72** ·
// +1/+30/+61분 0/72 (1970·1985·1997·2004·2013·2024 × 12節).
// 🔴 일주·시주는 여기서 바꾸지 않는다 — 코어의 야자시 기본값(shift-day)과 lunar-javascript 가
// 23시대에서 정면으로 갈린다(실측 540/540 불일치). 그 축을 정하는 것은 PR-F 의 몫이다.
import {
  BRANCH_HANJA,
  STEM_HANJA,
  ganji,
  lunarToSolar,
  sexagenaryYearIndexes,
} from "../../lib/korean-calendar/index.js";

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const ELEMENTS = ["목", "화", "토", "금", "수"];
export const STEM_ELEMENT = {
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
export const BRANCH_ELEMENT = {
  子: "수", 丑: "토", 寅: "목", 卯: "목", 辰: "토", 巳: "화",
  午: "화", 未: "토", 申: "금", 酉: "금", 戌: "토", 亥: "수",
};
export const HIDDEN_STEMS = {
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
const CHINESE_TEN_GOD_TO_KO = {
  比肩: "비견",
  劫财: "겁재",
  食神: "식신",
  伤官: "상관",
  偏财: "편재",
  正财: "정재",
  七杀: "편관",
  偏官: "편관",
  正官: "정관",
  偏印: "편인",
  正印: "정인",
  日主: "일간",
};
const PILLAR_LABELS = {
  year: "년주",
  month: "월주",
  day: "일주",
  hour: "시주",
};
const BRANCH_SEASON = {
  寅: { season: "봄", element: "목", climate: "생기가 열리는 초봄", adjustment: "화 기운으로 드러내고 토 기운으로 안정시킵니다." },
  卯: { season: "봄", element: "목", climate: "목기가 왕한 한봄", adjustment: "화 기운으로 표현하고 금 기운으로 다듬습니다." },
  辰: { season: "봄의 끝", element: "토", climate: "습토가 목기를 갈무리하는 때", adjustment: "화 기운으로 온기를 더하고 토의 방향을 정리합니다." },
  巳: { season: "여름", element: "화", climate: "열기가 오르는 초여름", adjustment: "수 기운으로 열을 식히고 금 기운으로 결을 세웁니다." },
  午: { season: "여름", element: "화", climate: "화기가 왕한 한여름", adjustment: "수 기운으로 조후를 맞추고 토 기운으로 열을 받아 냅니다." },
  未: { season: "여름의 끝", element: "토", climate: "건토가 열기를 머금는 때", adjustment: "수 기운으로 건조함을 풀고 목 기운으로 순환을 엽니다." },
  申: { season: "가을", element: "금", climate: "금기가 열리는 초가을", adjustment: "화 기운으로 금을 단련하고 수 기운으로 흐름을 냅니다." },
  酉: { season: "가을", element: "금", climate: "금기가 왕한 한가을", adjustment: "화 기운으로 차가움을 덜고 목 기운으로 생기를 더합니다." },
  戌: { season: "가을의 끝", element: "토", climate: "건토가 금기를 갈무리하는 때", adjustment: "수 기운으로 마른 기운을 적시고 목 기운으로 풀어 줍니다." },
  亥: { season: "겨울", element: "수", climate: "수기가 열리는 초겨울", adjustment: "화 기운으로 온기를 세우고 목 기운으로 생장을 잇습니다." },
  子: { season: "겨울", element: "수", climate: "수기가 왕한 한겨울", adjustment: "화 기운으로 온도를 맞추고 토 기운으로 흐름을 잡습니다." },
  丑: { season: "겨울의 끝", element: "토", climate: "습토가 수기를 품은 때", adjustment: "화 기운으로 얼어 있는 기운을 풀고 목 기운으로 움직임을 엽니다." },
};
const STEM_COMBINATION_PAIRS = [
  ["甲", "己", "갑기합", "토"],
  ["乙", "庚", "을경합", "금"],
  ["丙", "辛", "병신합", "수"],
  ["丁", "壬", "정임합", "목"],
  ["戊", "癸", "무계합", "화"],
];
const STEM_CLASH_PAIRS = [
  ["甲", "庚", "갑경충"],
  ["乙", "辛", "을신충"],
  ["丙", "壬", "병임충"],
  ["丁", "癸", "정계충"],
];
export const BRANCH_COMBINATION_PAIRS = [
  ["子", "丑", "자축합", "토"],
  ["寅", "亥", "인해합", "목"],
  ["卯", "戌", "묘술합", "화"],
  ["辰", "酉", "진유합", "금"],
  ["巳", "申", "사신합", "수"],
  ["午", "未", "오미합", "토"],
];
export const BRANCH_CLASH_PAIRS = [
  ["子", "午", "자오충"],
  ["丑", "未", "축미충"],
  ["寅", "申", "인신충"],
  ["卯", "酉", "묘유충"],
  ["辰", "戌", "진술충"],
  ["巳", "亥", "사해충"],
];
const BRANCH_HARM_PAIRS = [
  ["子", "未", "자미해"],
  ["丑", "午", "축오해"],
  ["寅", "巳", "인사해"],
  ["卯", "辰", "묘진해"],
  ["申", "亥", "신해해"],
  ["酉", "戌", "유술해"],
];
const BRANCH_BREAK_PAIRS = [
  ["子", "酉", "자유파"],
  ["丑", "辰", "축진파"],
  ["寅", "亥", "인해파"],
  ["卯", "午", "묘오파"],
  ["巳", "申", "사신파"],
  ["未", "戌", "미술파"],
];
const BRANCH_PUNISHMENT_GROUPS = [
  { branches: ["寅", "巳", "申"], label: "인사신형" },
  { branches: ["丑", "戌", "未"], label: "축술미형" },
  { branches: ["子", "卯"], label: "자묘형" },
  { branches: ["辰"], label: "진진형" },
  { branches: ["午"], label: "오오형" },
  { branches: ["酉"], label: "유유형" },
  { branches: ["亥"], label: "해해형" },
];
const THREE_HARMONY_GROUPS = [
  { branches: ["申", "子", "辰"], label: "신자진 삼합", element: "수" },
  { branches: ["亥", "卯", "未"], label: "해묘미 삼합", element: "목" },
  { branches: ["寅", "午", "戌"], label: "인오술 삼합", element: "화" },
  { branches: ["巳", "酉", "丑"], label: "사유축 삼합", element: "금" },
];
const DIRECTIONAL_GROUPS = [
  { branches: ["寅", "卯", "辰"], label: "인묘진 방합", element: "목" },
  { branches: ["巳", "午", "未"], label: "사오미 방합", element: "화" },
  { branches: ["申", "酉", "戌"], label: "신유술 방합", element: "금" },
  { branches: ["亥", "子", "丑"], label: "해자축 방합", element: "수" },
];
const LIFE_FORTUNE_CHAPTER_EVIDENCE = [
  { title: "타고난 명식의 중심", refs: ["dayMaster", "monthPillar", "pillarDetails.month", "seasonalBalance", "strength"] },
  { title: "성격과 마음의 결", refs: ["dayMaster", "tenGodsByPillar.day", "tenGods", "fiveElements", "pillarDetails.day"] },
  { title: "재능과 일의 방향", refs: ["tenGods", "tenGodsByPillar.month", "tenGodsByPillar.hour", "fiveElements", "fortuneFacts.strongestTenGods"] },
  { title: "재물과 생활 기반", refs: ["tenGods", "fiveElements", "usefulGod", "unfavorableGod", "natalInteractions"] },
  { title: "사랑과 인연의 흐름", refs: ["pillarDetails.day", "natalInteractions.branchCombinations", "natalInteractions.branchClashes", "tenGodsByPillar"] },
  { title: "관계와 가족의 장", refs: ["pillarDetails.year", "pillarDetails.month", "natalInteractions", "relationSummary"] },
  { title: "건강과 생활 리듬", refs: ["seasonalBalance", "fiveElements", "strength", "calculationMeta.timeUnknown"] },
  { title: "대운으로 보는 큰 전환", refs: ["majorLuck.direction", "majorLuck.startSolarDate", "majorLuck.currentCycle", "majorLuck.cycles"] },
  { title: "가까운 세운의 흐름", refs: ["yearlyLuck", "majorLuck.currentCycle", "yearlyLuck.natalInteractions"] },
  { title: "앞으로 열릴 선택", refs: ["fortuneFacts", "interpretationPlan", "usefulGod", "majorLuck.currentCycle", "yearlyLuck"] },
];

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

// 일간 대비 다른 천간의 십성. 오늘의 일진 판정(worker/lib/saju-day-fortune.js)이
// 같은 규칙을 다시 쓰지 않도록 이 정본 하나만 내보낸다.
export function tenGodFor(dayStem, targetStem) {
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

function normalizeTenGodName(value) {
  const text = clean(value, 20);
  return CHINESE_TEN_GOD_TO_KO[text] || text;
}

function buildHiddenStemDetails(dayStem, branch) {
  return (HIDDEN_STEMS[branch] || []).map((stem) => ({
    stem,
    element: STEM_ELEMENT[stem] || "",
    tenGod: tenGodFor(dayStem, stem),
  }));
}

/**
 * @param {object} [options]
 * @param {boolean} [options.detached]
 *   기둥이 eightChar 와 다른 시각에서 나온 경우(예: 진태양시 보정된 시주).
 *   naYin·십이운성·순공 같은 eightChar 파생 필드는 보정 전 시각 기준이라 틀리므로 비운다.
 */
/**
 * 기둥 문자열 + 일간만으로 파생 필드를 내는 어댑터. `buildPillarDetail` 이 eightChar 에서 찾는
 * 메서드 이름을 그대로 갖는다.
 *
 * 🔴 왜 필요한가: 년·월주는 코어(KST 절기)가 정본인데 eightChar 의 파생 필드(納音·旬空·十二運星·
 * 지지 십신·오행쌍)는 lunar-javascript 가 **CST 절기로 잡은 기둥**에 붙어 있다. 기둥이 갈리는
 * 節 직전 60분 창에서 그대로 두면 한 응답 안에 두 축이 섞인다.
 * 여기서 쓰는 `LunarUtil` 표는 전부 **문자열 조회**라 시간대와 무관하다 — 절기를 다시 재지 않는다.
 */
function pillarFacts(key, pillar, dayStem) {
  const prefix = key.charAt(0).toUpperCase() + key.slice(1);
  const stem = pillarStem(pillar);
  const branch = pillarBranch(pillar);
  const dayStemIndex = STEMS.indexOf(dayStem);
  const branchIndex = BRANCHES.indexOf(branch);
  const changShengOffset = LunarUtil.CHANG_SHENG_OFFSET[dayStem];
  let diShi = "";
  if (dayStemIndex >= 0 && branchIndex >= 0 && Number.isFinite(changShengOffset)) {
    const raw = changShengOffset + (dayStemIndex % 2 === 0 ? branchIndex : -branchIndex);
    diShi = LunarUtil.CHANG_SHENG[((raw % 12) + 12) % 12];
  }
  const hiddenGans = LunarUtil.ZHI_HIDE_GAN[branch] || [];
  return {
    [`get${prefix}ShiShenZhi`]: () => hiddenGans.map((gan) => LunarUtil.SHI_SHEN[`${dayStem}${gan}`]).filter(Boolean),
    [`get${prefix}WuXing`]: () => `${LunarUtil.WU_XING_GAN[stem] || ""}${LunarUtil.WU_XING_ZHI[branch] || ""}`,
    [`get${prefix}NaYin`]: () => LunarUtil.NAYIN[pillar] || "",
    [`get${prefix}DiShi`]: () => diShi,
    [`get${prefix}Xun`]: () => LunarUtil.getXun(pillar),
    [`get${prefix}XunKong`]: () => LunarUtil.getXunKong(pillar),
  };
}

/** 코어의 절기 프레임 년주·월주(한자). 지원 범위(1900~2100) 밖이면 던진다. */
function coreYearMonthPillars(date, hour, minute) {
  const core = ganji({ year: date.year, month: date.month, day: date.day, hour, minute });
  if (!core) {
    // parseDate 가 1900~2100 으로 자르므로 여기 오면 표가 깨진 것이다.
    // 조용히 CST 달력으로 떨어지지 않는다.
    const error = new Error(`korean-calendar core returned no ganji for ${date.year}-${date.month}-${date.day}`);
    error.code = "CALENDAR_OUT_OF_RANGE";
    throw error;
  }
  return {
    year: `${STEM_HANJA[core.year.stemIndex]}${BRANCH_HANJA[core.year.branchIndex]}`,
    month: `${STEM_HANJA[core.month.stemIndex]}${BRANCH_HANJA[core.month.branchIndex]}`,
  };
}

/** 서기 연도의 세차(한자). 세운은 입춘이 지난 뒤를 보므로 연도만으로 닫힌다. */
function coreSexagenaryYear(year) {
  const indexes = sexagenaryYearIndexes(year);
  return `${STEM_HANJA[indexes.stemIndex]}${BRANCH_HANJA[indexes.branchIndex]}`;
}

function buildPillarDetail(key, pillar, eightChar, dayStem, options = {}) {
  if (!pillar) return null;
  const detached = options.detached === true;
  const methodPrefix = key.charAt(0).toUpperCase() + key.slice(1);
  const stem = pillarStem(pillar);
  const branch = pillarBranch(pillar);
  const rawBranchTenGods = typeof eightChar?.[`get${methodPrefix}ShiShenZhi`] === "function"
    ? eightChar[`get${methodPrefix}ShiShenZhi`]()
    : [];
  return {
    key,
    label: PILLAR_LABELS[key] || key,
    pillar,
    heavenlyStem: stem,
    earthlyBranch: branch,
    stemElement: STEM_ELEMENT[stem] || "",
    branchElement: BRANCH_ELEMENT[branch] || "",
    hiddenStems: buildHiddenStemDetails(dayStem, branch),
    stemTenGod: key === "day" ? "일간" : tenGodFor(dayStem, stem),
    branchTenGods: !detached && Array.isArray(rawBranchTenGods)
      ? rawBranchTenGods.map(normalizeTenGodName).filter(Boolean)
      : [],
    elementPair: !detached && typeof eightChar?.[`get${methodPrefix}WuXing`] === "function" ? clean(eightChar[`get${methodPrefix}WuXing`](), 20) : "",
    naYin: !detached && typeof eightChar?.[`get${methodPrefix}NaYin`] === "function" ? clean(eightChar[`get${methodPrefix}NaYin`](), 40) : "",
    twelveStage: !detached && typeof eightChar?.[`get${methodPrefix}DiShi`] === "function" ? clean(eightChar[`get${methodPrefix}DiShi`](), 20) : "",
    xun: !detached && typeof eightChar?.[`get${methodPrefix}Xun`] === "function" ? clean(eightChar[`get${methodPrefix}Xun`](), 20) : "",
    xunKong: !detached && typeof eightChar?.[`get${methodPrefix}XunKong`] === "function" ? clean(eightChar[`get${methodPrefix}XunKong`](), 20) : "",
  };
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

function sortedCountEntries(counts = {}) {
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value: Number(value || 0) }))
    .filter((entry) => entry.name && Number.isFinite(entry.value))
    .sort((a, b) => b.value - a.value);
}

function buildSeasonalBalance(monthBranch, fiveElements, dayStem) {
  const month = BRANCH_SEASON[monthBranch] || {};
  const dayElement = STEM_ELEMENT[dayStem] || "";
  const sortedElements = sortedCountEntries(fiveElements);
  const dominant = sortedElements[0] || null;
  const deficient = [...sortedElements].reverse()[0] || null;
  let dayMasterSeasonalState = "월령과 일간의 관계를 계산할 수 없습니다.";
  if (month.element && dayElement) {
    if (month.element === dayElement) dayMasterSeasonalState = "월령이 일간과 같은 기운을 품어 뿌리가 있는 편입니다.";
    else if (PRODUCES[month.element] === dayElement) dayMasterSeasonalState = "월령이 일간을 생하여 회복의 바탕을 줍니다.";
    else if (PRODUCES[dayElement] === month.element) dayMasterSeasonalState = "일간이 월령으로 기운을 흘려 표현과 소모가 함께 생깁니다.";
    else if (CONTROLS[month.element] === dayElement) dayMasterSeasonalState = "월령이 일간을 제어하여 책임과 압박의 결이 생깁니다.";
    else if (CONTROLS[dayElement] === month.element) dayMasterSeasonalState = "일간이 월령을 다루려 하여 현실 장악의 욕구가 생깁니다.";
  }
  return {
    monthBranch,
    season: month.season || "",
    seasonElement: month.element || "",
    climate: month.climate || "",
    adjustment: month.adjustment || "",
    dayElement,
    dayMasterSeasonalState,
    dominantElement: dominant?.name || "",
    dominantElementScore: dominant?.value || 0,
    deficientElement: deficient?.name || "",
    deficientElementScore: deficient?.value || 0,
  };
}

function buildTenGodByPillar(pillarDetails = {}) {
  return Object.fromEntries(Object.entries(pillarDetails).map(([key, detail]) => {
    if (!detail) return [key, null];
    return [key, {
      label: detail.label,
      pillar: detail.pillar,
      stemTenGod: detail.stemTenGod,
      branchTenGods: detail.branchTenGods,
      hiddenStemTenGods: (detail.hiddenStems || []).map((hidden) => ({
        stem: hidden.stem,
        tenGod: hidden.tenGod,
        element: hidden.element,
      })),
      primaryHiddenTenGod: detail.hiddenStems?.[0]?.tenGod || "",
    }];
  }));
}

function pillarEntries(pillarDetails = {}) {
  return Object.entries(pillarDetails)
    .filter(([, detail]) => detail?.pillar)
    .map(([key, detail]) => ({
      key,
      label: detail.label || PILLAR_LABELS[key] || key,
      pillar: detail.pillar,
      stem: detail.heavenlyStem,
      branch: detail.earthlyBranch,
    }));
}

function pairMatches(pair, first, second) {
  return (pair[0] === first && pair[1] === second) || (pair[0] === second && pair[1] === first);
}

function buildPairInteractions(entries, pairs, field, type) {
  const found = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const first = entries[i]?.[field];
      const second = entries[j]?.[field];
      const pair = pairs.find((candidate) => pairMatches(candidate, first, second));
      if (!pair) continue;
      found.push({
        type,
        label: pair[2],
        element: pair[3] || "",
        pillars: [entries[i].key, entries[j].key],
        pillarLabels: [entries[i].label, entries[j].label],
        values: [first, second],
      });
    }
  }
  return found;
}

function collectGroupInteractions(entries, groups, type) {
  const branchToEntries = new Map();
  for (const entry of entries) {
    if (!entry.branch) continue;
    if (!branchToEntries.has(entry.branch)) branchToEntries.set(entry.branch, []);
    branchToEntries.get(entry.branch).push(entry);
  }
  return groups.flatMap((group) => {
    const matched = group.branches.flatMap((branch) => branchToEntries.get(branch) || []);
    const uniqueKeys = new Set(matched.map((entry) => entry.key));
    if (group.branches.length === 1 ? matched.length < 2 : !group.branches.every((branch) => branchToEntries.has(branch))) return [];
    return [{
      type,
      label: group.label,
      element: group.element || "",
      branches: group.branches,
      pillars: [...uniqueKeys],
      pillarLabels: matched.map((entry) => entry.label),
    }];
  });
}

// 명리 관계성은 결과 문장 생성 전에 JSON 근거로만 고정해 LLM이 임의로 합충을 만들지 못하게 합니다.
function buildNatalInteractions(pillarDetails = {}) {
  const entries = pillarEntries(pillarDetails);
  return {
    stemCombinations: buildPairInteractions(entries, STEM_COMBINATION_PAIRS, "stem", "천간합"),
    stemClashes: buildPairInteractions(entries, STEM_CLASH_PAIRS, "stem", "천간충"),
    branchCombinations: buildPairInteractions(entries, BRANCH_COMBINATION_PAIRS, "branch", "지지육합"),
    branchClashes: buildPairInteractions(entries, BRANCH_CLASH_PAIRS, "branch", "지지충"),
    branchHarms: buildPairInteractions(entries, BRANCH_HARM_PAIRS, "branch", "지지해"),
    branchBreaks: buildPairInteractions(entries, BRANCH_BREAK_PAIRS, "branch", "지지파"),
    branchPunishments: collectGroupInteractions(entries, BRANCH_PUNISHMENT_GROUPS, "지지형"),
    threeHarmony: collectGroupInteractions(entries, THREE_HARMONY_GROUPS, "삼합"),
    directionalGroups: collectGroupInteractions(entries, DIRECTIONAL_GROUPS, "방합"),
  };
}

function buildLuckNatalInteractions(luckPillar, pillarDetails = {}) {
  const luckStem = pillarStem(luckPillar);
  const luckBranch = pillarBranch(luckPillar);
  const entries = pillarEntries(pillarDetails);
  const luckEntry = { key: "luck", label: "운", pillar: luckPillar, stem: luckStem, branch: luckBranch };
  const combinedEntries = [luckEntry, ...entries];
  return {
    stemCombinations: buildPairInteractions(combinedEntries, STEM_COMBINATION_PAIRS, "stem", "천간합").filter((item) => item.pillars.includes("luck")),
    stemClashes: buildPairInteractions(combinedEntries, STEM_CLASH_PAIRS, "stem", "천간충").filter((item) => item.pillars.includes("luck")),
    branchCombinations: buildPairInteractions(combinedEntries, BRANCH_COMBINATION_PAIRS, "branch", "지지육합").filter((item) => item.pillars.includes("luck")),
    branchClashes: buildPairInteractions(combinedEntries, BRANCH_CLASH_PAIRS, "branch", "지지충").filter((item) => item.pillars.includes("luck")),
    branchHarms: buildPairInteractions(combinedEntries, BRANCH_HARM_PAIRS, "branch", "지지해").filter((item) => item.pillars.includes("luck")),
    branchBreaks: buildPairInteractions(combinedEntries, BRANCH_BREAK_PAIRS, "branch", "지지파").filter((item) => item.pillars.includes("luck")),
  };
}

function summarizeRelations(interactions = {}) {
  const support = [
    ...(interactions.stemCombinations || []),
    ...(interactions.branchCombinations || []),
    ...(interactions.threeHarmony || []),
    ...(interactions.directionalGroups || []),
  ];
  const tension = [
    ...(interactions.stemClashes || []),
    ...(interactions.branchClashes || []),
    ...(interactions.branchHarms || []),
    ...(interactions.branchBreaks || []),
    ...(interactions.branchPunishments || []),
  ];
  return {
    supportCount: support.length,
    tensionCount: tension.length,
    supportLabels: support.map((item) => item.label).slice(0, 8),
    tensionLabels: tension.map((item) => item.label).slice(0, 8),
    mainPattern: support[0]?.label || tension[0]?.label || "두드러진 합충형파해가 강하지 않은 편",
  };
}

function buildInterpretationPlan() {
  return LIFE_FORTUNE_CHAPTER_EVIDENCE.map((chapter, index) => ({
    chapterNumber: index + 1,
    title: chapter.title,
    evidenceRefs: chapter.refs,
  }));
}

function buildFortuneFacts({ dayMaster, monthPillar, fiveElements, tenGods, seasonalBalance, strength, usefulGod, unfavorableGod, majorLuck, yearlyLuck, relationSummary }) {
  return {
    readingBase: {
      dayMaster,
      monthBranch: pillarBranch(monthPillar),
      monthPillar,
      strength,
      usefulGod,
      unfavorableGod,
    },
    elementBalance: {
      dominantElement: seasonalBalance.dominantElement,
      deficientElement: seasonalBalance.deficientElement,
      seasonalAdjustment: seasonalBalance.adjustment,
    },
    strongestTenGods: sortedCountEntries(tenGods).slice(0, 5),
    currentLuck: {
      majorLuck: majorLuck?.currentCycle || null,
      nextYears: Array.isArray(yearlyLuck) ? yearlyLuck.slice(0, 5) : [],
    },
    relationSummary,
  };
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

function normalizeGenderCode(gender) {
  const value = clean(gender).toLowerCase();
  if (value === "male" || value === "m" || value === "남성") return 1;
  if (value === "female" || value === "f" || value === "여성") return 0;
  return null;
}

const SEXAGENARY_CYCLE = Array.from({ length: 60 }, (_, index) => `${STEMS[index % 10]}${BRANCHES[index % 12]}`);

function buildMajorLuck({ eightChar, birthYear, currentYear, gender, dayMaster, pillarDetails, monthPillar }) {
  const genderCode = normalizeGenderCode(gender);
  if (!eightChar || typeof eightChar.getYun !== "function") {
    return { available: false, reason: "대운 계산용 EightChar 데이터가 없습니다." };
  }
  if (genderCode === null) {
    return {
      available: false,
      reason: "성별 비공개 입력이어서 대운 순행·역행을 단정하지 않습니다.",
    };
  }

  const yun = eightChar.getYun(genderCode);
  // 🔴 대운 간지는 cycle.getGanZhi() 가 아니라 **코어 월주**에서 파생한다(PR-D2 와 같은 이유).
  // 그러지 않으면 節 직전 60분 창에서 월주는 코어를 따르는데 대운만 lunar-javascript 를 따라 갈린다.
  // 나이·연도는 손대지 않는다 — 세는 나이/소수 나이가 섞인 축 정리는 PR-F 의 몫이다.
  const monthCycleIndex = SEXAGENARY_CYCLE.indexOf(clean(monthPillar, 10));
  const cycleStep = yun.isForward?.() ? 1 : -1;
  const cycles = (yun.getDaYun?.() || []).slice(0, 10).map((cycle, index) => {
    const rowIndex = Number(cycle.getIndex?.());
    const pillar = Number.isFinite(rowIndex) && rowIndex >= 1 && monthCycleIndex >= 0
      ? SEXAGENARY_CYCLE[(monthCycleIndex + cycleStep * rowIndex + 6000) % 60]
      : clean(cycle.getGanZhi?.(), 10);
    const branch = pillarBranch(pillar);
    const startYear = Number(cycle.getStartYear?.() || 0);
    const endYear = Number(cycle.getEndYear?.() || 0);
    return {
      index,
      startAge: Number(cycle.getStartAge?.() || 0),
      endAge: Number(cycle.getEndAge?.() || 0),
      startYear,
      endYear,
      pillar,
      heavenlyStem: pillarStem(pillar),
      earthlyBranch: branch,
      stemTenGod: pillar ? tenGodFor(dayMaster, pillarStem(pillar)) : "",
      hiddenStems: pillar ? buildHiddenStemDetails(dayMaster, branch) : [],
      natalInteractions: pillar ? buildLuckNatalInteractions(pillar, pillarDetails) : {},
      xun: pillar ? clean(LunarUtil.getXun(pillar), 20) : "",
      xunKong: pillar ? clean(LunarUtil.getXunKong(pillar), 20) : "",
      isCurrent: startYear > 0 && endYear > 0 && Number(currentYear) >= startYear && Number(currentYear) <= endYear,
    };
  });

  const startSolar = yun.getStartSolar?.();
  return {
    available: true,
    direction: yun.isForward?.() ? "순행" : "역행",
    genderCode,
    startAfterBirth: {
      years: Number(yun.getStartYear?.() || 0),
      months: Number(yun.getStartMonth?.() || 0),
      days: Number(yun.getStartDay?.() || 0),
      hours: Number(yun.getStartHour?.() || 0),
    },
    startSolarDate: startSolar?.toYmd?.() || "",
    startSolarDateTime: startSolar?.toYmdHms?.() || "",
    currentYear: Number(currentYear),
    currentAgeKoreanStyle: Number(currentYear) - Number(birthYear) + 1,
    currentCycle: cycles.find((cycle) => cycle.isCurrent) || null,
    cycles,
    calculationBasis: "대운 순·역행과 나이는 lunar-javascript EightChar.getYun(gender), 간지는 한국 음양력 코어 월주에서 파생",
  };
}

function findMajorLuckCycle(majorLuck, year) {
  return (majorLuck?.cycles || []).find((cycle) => Number(year) >= Number(cycle.startYear) && Number(year) <= Number(cycle.endYear)) || null;
}

function buildYearlyLuck({ startYear = new Date().getFullYear(), dayMaster, birthYear, majorLuck, pillarDetails } = {}) {
  return Array.from({ length: 5 }, (_, index) => {
    const year = Number(startYear) + index;
    const pillar = coreSexagenaryYear(year);
    const branch = pillarBranch(pillar);
    const majorLuckCycle = findMajorLuckCycle(majorLuck, year);
    return {
      year,
      ageKoreanStyle: Number(year) - Number(birthYear) + 1,
      pillar,
      heavenlyStem: pillarStem(pillar),
      earthlyBranch: branch,
      stemTenGod: tenGodFor(dayMaster, pillarStem(pillar)),
      hiddenStems: buildHiddenStemDetails(dayMaster, branch),
      natalInteractions: buildLuckNatalInteractions(pillar, pillarDetails),
      majorLuckPillar: majorLuckCycle?.pillar || "",
      majorLuckAgeRange: majorLuckCycle ? `${majorLuckCycle.startAge}-${majorLuckCycle.endAge}` : "",
    };
  });
}

function buildLunar(inputDate, birthTime, calendarType) {
  if (calendarType === "lunar") {
    // 🔴 음력 입력의 양력 환산도 코어가 한다. lunar-javascript 는 중국 음력이라 표본 4,860건 중
    // 180건(3.70%)에서 하루 어긋나고(실측 2026-08-27), 그 하루가 네 기둥을 통째로 옮긴다.
    const converted = lunarToSolar(inputDate.year, inputDate.month, inputDate.day, false);
    if (!converted) {
      const error = new Error("Invalid lunar birth date");
      error.code = "INVALID_BIRTH_DATE";
      throw error;
    }
    return Solar.fromYmdHms(converted.year, converted.month, converted.day, birthTime.hour, birthTime.minute, 0).getLunar();
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
  const eightChar = lunar.getEightChar?.();
  const corePillars = coreYearMonthPillars(
    { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() },
    solar.getHour(),
    solar.getMinute(),
  );
  const yearPillar = corePillars.year;
  const monthPillar = corePillars.month;
  const dayPillar = clean(eightChar?.getDay?.(), 10) || lunar.getDayInGanZhiExact?.() || lunar.getDayInGanZhi();
  // hourPillarOverride: 호출부가 자체 시각 보정(진태양시 등)으로 계산한 시주를 넘길 수 있다.
  // 넘기지 않으면 기존 동작(시계 시각 기준) 그대로다 — 나머지 5개 라우트는 영향받지 않는다.
  const hourPillarOverride = clean(birthInfo.hourPillarOverride, 10);
  const hourPillar = timeUnknown
    ? ""
    : (hourPillarOverride || clean(eightChar?.getTime?.(), 10) || lunar.getTimeInGanZhi());
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar].filter(Boolean);
  const dayMaster = clean(eightChar?.getDayGan?.(), 4) || pillarStem(dayPillar);
  const fiveElements = buildElementDistribution(pillars);
  const tenGods = buildTenGodDistribution(dayMaster, pillars);
  const usefulElement = pickBalancingElement(fiveElements);
  const dominantElement = pickDominantElement(fiveElements);
  const currentYear = new Date().getFullYear();
  const pillarDetails = {
    // 🔴 년·월주의 파생 필드는 코어 기둥에서 다시 뽑는다 — eightChar 의 것은 CST 기둥에 붙어 있다.
    year: buildPillarDetail("year", yearPillar, pillarFacts("year", yearPillar, dayMaster), dayMaster),
    month: buildPillarDetail("month", monthPillar, pillarFacts("month", monthPillar, dayMaster), dayMaster),
    day: buildPillarDetail("day", dayPillar, eightChar, dayMaster),
    hour: timeUnknown ? null : buildPillarDetail("hour", hourPillar, eightChar, dayMaster, { detached: Boolean(hourPillarOverride) }),
  };
  const tenGodsByPillar = buildTenGodByPillar(pillarDetails);
  const seasonalBalance = buildSeasonalBalance(pillarBranch(monthPillar), fiveElements, dayMaster);
  const natalInteractions = buildNatalInteractions(pillarDetails);
  const relationSummary = summarizeRelations(natalInteractions);
  const majorLuck = buildMajorLuck({ eightChar, birthYear: solar?.getYear?.() || birthDate.year, currentYear, gender: birthInfo.gender, dayMaster, pillarDetails, monthPillar });
  const yearlyLuck = buildYearlyLuck({ startYear: currentYear, dayMaster, birthYear: solar?.getYear?.() || birthDate.year, majorLuck, pillarDetails });
  const strength = judgeStrength(dayMaster, fiveElements);
  const usefulGod = usefulElement ? `${usefulElement} 기운을 보완 축으로 봅니다.` : "";
  const unfavorableGod = dominantElement ? `${dominantElement} 기운이 과해질 때 균형을 살핍니다.` : "";
  const interpretationPlan = buildInterpretationPlan();
  const fortuneFacts = buildFortuneFacts({
    dayMaster,
    monthPillar,
    fiveElements,
    tenGods,
    seasonalBalance,
    strength,
    usefulGod,
    unfavorableGod,
    majorLuck,
    yearlyLuck,
    relationSummary,
  });

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar: hourPillar || undefined,
    dayMaster,
    pillarDetails,
    fiveElements,
    tenGods,
    tenGodsByPillar,
    allowedTenGods: ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"],
    strength,
    usefulGod,
    unfavorableGod,
    seasonalBalance,
    natalInteractions,
    relationSummary,
    majorLuck,
    yearlyLuck,
    fortuneFacts,
    interpretationPlan,
    calculationMeta: {
      method: "lunar-javascript-eightchar-core-pillars",
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
