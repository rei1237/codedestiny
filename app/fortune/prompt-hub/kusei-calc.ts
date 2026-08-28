import { lunarToSolar } from "@/lib/korean-calendar";
import { nodeTerms } from "@/lib/korean-calendar";

export type NineStarNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type KuseiElement = "수" | "목" | "화" | "토" | "금";
export type KuseiGender = "male" | "female";
export type KuseiCalendarType = "solar" | "lunar";

export type NineStar = {
  number: NineStarNumber;
  koreanName: string;
  kanjiName: string;
  element: KuseiElement;
  keywords: string[];
  strengthText: string;
  cautionText: string;
  relationshipText: string;
  workText: string;
};

export type KuseiPromptInput = {
  gender: KuseiGender;
  birthDate: string;
  calendarType: KuseiCalendarType;
  isLeapMonth?: boolean;
  birthTimeKnown: boolean;
  birthHour?: number;
  birthMinute?: number;
  timezone: string;
  focusTopic?: string;
  userQuestion?: string;
  currentDateTime?: string;
};

export type KuseiCalculationResult = {
  solarBirthDate: string;
  birthTimeLabel: string;
  effectiveYear: number;
  lichunAt: string | null;
  honmeiNumber: NineStarNumber;
  honmeiStar: NineStar;
  kigakuMonthNo: number | null;
  monthBranch: string | null;
  monthStartSolarTerm: string;
  monthEndSolarTerm: string;
  getsumeiNumber: NineStarNumber | null;
  getsumeiStar: NineStar | null;
  dayStar: "미산출";
  hourStar: "미산출";
  currentKigakuYear?: number;
  currentYearStar?: NineStar;
  currentKigakuMonth?: number | null;
  currentMonthStar?: NineStar | null;
  honmeiToCurrentYearRelation?: string;
  honmeiToCurrentMonthRelation?: string;
  honmeiToGetsumeiRelation: string;
  solarTermSource: string;
  dayHourStarPolicy: string;
  warnings: string[];
};

export type KuseiPromptPayload = {
  input: KuseiPromptInput;
  calculation: KuseiCalculationResult;
  prompt: string;
  summaryCards: Array<{ label: string; value: string }>;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

type SolarTerm = {
  name: string;
  label: string;
  at: DateParts;
  isoLocal: string;
  timeMs: number;
};

const KUSEI_CALC_TEXT_TRANSLATIONS = {
  ko: {
    "kuseiCalc.001": "소한",
    "kuseiCalc.002": "입춘",
    "kuseiCalc.003": "경칩",
    "kuseiCalc.004": "청명",
    "kuseiCalc.005": "입하",
    "kuseiCalc.006": "망종",
    "kuseiCalc.007": "소서",
    "kuseiCalc.008": "입추",
    "kuseiCalc.009": "백로",
    "kuseiCalc.010": "한로",
    "kuseiCalc.011": "입동",
    "kuseiCalc.012": "대설",
    "kuseiCalc.013": "본명성",
    "kuseiCalc.014": "월명성",
    "kuseiCalc.015": "기학년",
    "kuseiCalc.016": "기학월",
    "kuseiCalc.017": "현재 연운",
    "kuseiCalc.018": "현재 월운",
  },
} as const;

function kuseiCalcText(key: keyof typeof KUSEI_CALC_TEXT_TRANSLATIONS.ko): string {
  return KUSEI_CALC_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
// 한국 음양력 코어의 절기표는 KST 벽시계다. 순간(instant)으로 되돌린 뒤 요청 시간대로 옮긴다.
// 🔴 예전에는 480(중국 표준시)이 있었다 — lunar-javascript 가 CST 기준이라 필요했던 값이다.
const CORE_SOLAR_TERM_TIMEZONE_OFFSET_MINUTES = 540;
const TIMEZONE_OFFSETS: Record<string, number> = {
  UTC: 0,
  "Asia/Seoul": 540,
  "Asia/Tokyo": 540,
  "Asia/Shanghai": 480,
  "Asia/Taipei": 480,
  "Asia/Hong_Kong": 480,
};

const TERM_META = {
  xiaohan: { name: "小寒", label: kuseiCalcText("kuseiCalc.001") },
  lichun: { name: "立春", label: kuseiCalcText("kuseiCalc.002") },
  jingzhe: { name: "惊蛰", label: kuseiCalcText("kuseiCalc.003") },
  qingming: { name: "清明", label: kuseiCalcText("kuseiCalc.004") },
  lixia: { name: "立夏", label: kuseiCalcText("kuseiCalc.005") },
  mangzhong: { name: "芒种", label: kuseiCalcText("kuseiCalc.006") },
  xiaoshu: { name: "小暑", label: kuseiCalcText("kuseiCalc.007") },
  liqiu: { name: "立秋", label: kuseiCalcText("kuseiCalc.008") },
  bailu: { name: "白露", label: kuseiCalcText("kuseiCalc.009") },
  hanlu: { name: "寒露", label: kuseiCalcText("kuseiCalc.010") },
  lidong: { name: "立冬", label: kuseiCalcText("kuseiCalc.011") },
  daxue: { name: "大雪", label: kuseiCalcText("kuseiCalc.012") },
} as const;

const KIGAKU_MONTH_BRANCH: Record<number, string> = {
  2: "寅",
  3: "卯",
  4: "辰",
  5: "巳",
  6: "午",
  7: "未",
  8: "申",
  9: "酉",
  10: "戌",
  11: "亥",
  12: "子",
  13: "丑",
};

export const NINE_STARS: Record<NineStarNumber, NineStar> = {
  1: {
    number: 1,
    koreanName: "일백수성",
    kanjiName: "一白水星",
    element: "수",
    keywords: ["유연성", "지혜", "감수성", "흐름", "고독"],
    strengthText: "흐름을 읽고 부드럽게 방향을 바꾸는 힘이 강합니다.",
    cautionText: "혼자 감당하려는 마음이 커지면 고립감이 깊어질 수 있습니다.",
    relationshipText: "깊은 대화와 정서적 신뢰가 쌓일 때 마음이 열립니다.",
    workText: "상담, 연구, 기획, 정보 정리처럼 보이지 않는 흐름을 다루는 일에서 강점이 살아납니다.",
  },
  2: {
    number: 2,
    koreanName: "이흑토성",
    kanjiName: "二黒土星",
    element: "토",
    keywords: ["수용", "성실", "돌봄", "기반", "꾸준함"],
    strengthText: "천천히 쌓고 오래 지키는 힘이 안정적으로 드러납니다.",
    cautionText: "참기만 하면 마음의 피로가 몸과 관계에 남을 수 있습니다.",
    relationshipText: "서로의 생활 리듬을 존중할 때 신뢰가 단단해집니다.",
    workText: "운영, 관리, 돌봄, 현장 기반의 역할에서 꾸준한 성과가 납니다.",
  },
  3: {
    number: 3,
    koreanName: "삼벽목성",
    kanjiName: "三碧木星",
    element: "목",
    keywords: ["시작", "성장", "발성", "추진", "젊은 기운"],
    strengthText: "새로운 문을 여는 속도와 말로 흐름을 깨우는 힘이 강합니다.",
    cautionText: "속도가 앞서면 약속과 마무리가 흔들릴 수 있습니다.",
    relationshipText: "솔직한 표현이 장점이지만 말의 온도 조절이 관계를 지킵니다.",
    workText: "시작이 필요한 프로젝트, 발표, 영업, 교육, 미디어에서 활력이 살아납니다.",
  },
  4: {
    number: 4,
    koreanName: "사록목성",
    kanjiName: "四緑木星",
    element: "목",
    keywords: ["신뢰", "조화", "인연", "확장", "바람"],
    strengthText: "사람과 사람 사이의 결을 읽고 조율하는 감각이 좋습니다.",
    cautionText: "모두를 맞추려다 나의 기준이 흐려질 수 있습니다.",
    relationshipText: "부드러운 소통과 약속의 일관성이 좋은 인연을 부릅니다.",
    workText: "협업, 브랜딩, 무역, 연결, 조정 역할에서 흐름이 넓어집니다.",
  },
  5: {
    number: 5,
    koreanName: "오황토성",
    kanjiName: "五黄土星",
    element: "토",
    keywords: ["중심", "장악력", "극단성", "재건", "강한 운"],
    strengthText: "무너진 것을 다시 세우고 중심을 잡는 힘이 강하게 흐릅니다.",
    cautionText: "강한 의지가 고집으로 굳으면 주변과 충돌하기 쉽습니다.",
    relationshipText: "주도권보다 책임의 균형을 잡을 때 신뢰가 오래 갑니다.",
    workText: "위기 관리, 구조 개편, 리더십, 재건이 필요한 자리에서 존재감이 큽니다.",
  },
  6: {
    number: 6,
    koreanName: "육백금성",
    kanjiName: "六白金星",
    element: "금",
    keywords: ["책임", "권위", "완성도", "원칙", "리더십"],
    strengthText: "높은 기준과 책임감으로 결과를 완성하는 힘이 있습니다.",
    cautionText: "완벽함을 요구하면 자신과 주변 모두가 긴장할 수 있습니다.",
    relationshipText: "존중과 책임이 분명한 관계에서 안정감을 느낍니다.",
    workText: "관리, 리더십, 전문직, 제도와 기준이 필요한 일에서 빛이 납니다.",
  },
  7: {
    number: 7,
    koreanName: "칠적금성",
    kanjiName: "七赤金星",
    element: "금",
    keywords: ["말", "즐거움", "매력", "금전감각", "교류"],
    strengthText: "말과 분위기로 사람을 끌어당기고 기회를 여는 힘이 있습니다.",
    cautionText: "즐거움이 과해지면 지출, 말실수, 약속 누락으로 이어질 수 있습니다.",
    relationshipText: "가벼운 즐거움 속에서도 진심을 확인할 때 관계가 깊어집니다.",
    workText: "세일즈, 콘텐츠, 상담, 음식, 미용, 여가 산업처럼 감각과 교류가 있는 일에 맞습니다.",
  },
  8: {
    number: 8,
    koreanName: "팔백토성",
    kanjiName: "八白土星",
    element: "토",
    keywords: ["변화", "축적", "전환", "가족", "산"],
    strengthText: "멈춰서 구조를 바꾸고 오래 갈 기반을 만드는 힘이 있습니다.",
    cautionText: "변화가 필요할 때도 익숙한 틀에 머물면 흐름이 정체됩니다.",
    relationshipText: "가족, 책임, 생활 기반을 함께 다룰 때 관계의 진심이 드러납니다.",
    workText: "부동산, 자산, 교육, 전환기 관리, 장기 프로젝트에서 강점이 살아납니다.",
  },
  9: {
    number: 9,
    koreanName: "구자화성",
    kanjiName: "九紫火星",
    element: "화",
    keywords: ["지성", "명예", "아름다움", "분별", "드러남"],
    strengthText: "보이지 않던 것을 밝히고 아름답게 드러내는 힘이 강합니다.",
    cautionText: "판단이 빨라지면 관계가 차갑게 느껴질 수 있습니다.",
    relationshipText: "존중받고 인정받는 느낌이 있을 때 애정과 집중이 살아납니다.",
    workText: "기획, 예술, 디자인, 교육, 법률, 평가와 분석이 필요한 자리에서 빛이 납니다.",
  },
};

const GENERATES: Record<KuseiElement, KuseiElement> = {
  수: "목",
  목: "화",
  화: "토",
  토: "금",
  금: "수",
};

const CONTROLS: Record<KuseiElement, KuseiElement> = {
  수: "화",
  화: "금",
  금: "목",
  목: "토",
  토: "수",
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function formatDateTime(parts: DateParts) {
  return `${formatDate(parts.year, parts.month, parts.day)} ${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

function datePartsToMs(parts: DateParts, timezone = "Asia/Seoul") {
  const offset = TIMEZONE_OFFSETS[timezone] ?? TIMEZONE_OFFSETS["Asia/Seoul"];
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0) - offset * 60000;
}

function msToDateParts(ms: number, timezone = "Asia/Seoul"): DateParts {
  const offset = TIMEZONE_OFFSETS[timezone] ?? TIMEZONE_OFFSETS["Asia/Seoul"];
  const date = new Date(ms + offset * 60000);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) throw new Error("생년월일을 입력해 주세요.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // 🔴 UTC 축으로 왕복한다. 로컬 Date 로 재면 그 벽시계가 없는 타임존(서머타임 시계 앞당김)에서
  // JS 가 조용히 접어 **유효한 생일을 거부**한다. 2월 30일은 UTC 축에서도 그대로 걸러진다.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error("생년월일을 다시 확인해 주세요.");
  return { year, month, day };
}

function parseInputDateTime(input: KuseiPromptInput) {
  const solar = input.calendarType === "lunar"
    ? convertLunarToSolar(input.birthDate, Boolean(input.isLeapMonth))
    : parseDate(input.birthDate);
  const hour = input.birthTimeKnown ? Number(input.birthHour ?? 12) : 12;
  const minute = input.birthTimeKnown ? Number(input.birthMinute ?? 0) : 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error("출생시간 범위를 다시 확인해 주세요.");
  return {
    ...solar,
    hour,
    minute,
  };
}

function digitRoot(value: number) {
  let current = Math.abs(Math.trunc(value));
  while (current >= 10) {
    current = String(current).split("").reduce((sum, char) => sum + Number(char), 0);
  }
  return current;
}

export function normalizeNineStar(value: number): NineStarNumber {
  const normalized = ((Math.trunc(value) - 1) % 9 + 9) % 9 + 1;
  return normalized as NineStarNumber;
}

export function getNineStarMeta(number: number): NineStar {
  return NINE_STARS[normalizeNineStar(number)];
}

export function convertLunarToSolar(birthDate: string, isLeapMonth = false) {
  const parsed = parseDate(birthDate);
  // 🔴 음력→양력은 한국 음양력 코어가 한다(절기는 이미 코어다 — PR-D 의 nodeTerms).
  //    중국 음력은 3.68% 의 음력 날짜에서 하루 어긋난다(실측 2026-08-27).
  try {
    const solar = lunarToSolar(parsed.year, Math.abs(parsed.month), parsed.day, isLeapMonth);
    if (!solar) throw new Error("OUT_OF_RANGE");
    return { year: solar.year, month: solar.month, day: solar.day };
  } catch {
    throw new Error("음력 변환에 실패했습니다. 날짜와 윤달 여부를 확인해 주세요.");
  }
}

// TERM_META 의 12節 순서 = 코어 nodeTerms 의 인덱스 순서(소한 0 … 대설 11).
const JIE_INDEX_BY_TERM_NAME: Record<string, number> = {
  小寒: 0,
  立春: 1,
  惊蛰: 2,
  清明: 3,
  立夏: 4,
  芒种: 5,
  小暑: 6,
  立秋: 7,
  白露: 8,
  寒露: 9,
  立冬: 10,
  大雪: 11,
};

function makeSolarTerm(year: number, term: { name: string; label: string }, timezone: string): SolarTerm {
  const index = JIE_INDEX_BY_TERM_NAME[term.name];
  const nodes = index == null ? null : nodeTerms(year);
  const node = nodes && nodes[index];
  if (!node) throw new Error("절기 데이터 필요");
  const instantMs = Date.UTC(node.year, node.month - 1, node.day, node.hour, node.minute, 0)
    - CORE_SOLAR_TERM_TIMEZONE_OFFSET_MINUTES * 60000;
  const at = msToDateParts(instantMs, timezone);
  return {
    name: term.name,
    label: term.label,
    at,
    isoLocal: formatDateTime(at),
    timeMs: datePartsToMs(at, timezone),
  };
}

export function getSolarTermsForYear(year: number, timezone = "Asia/Seoul") {
  return {
    xiaohan: makeSolarTerm(year, TERM_META.xiaohan, timezone),
    lichun: makeSolarTerm(year, TERM_META.lichun, timezone),
    jingzhe: makeSolarTerm(year, TERM_META.jingzhe, timezone),
    qingming: makeSolarTerm(year, TERM_META.qingming, timezone),
    lixia: makeSolarTerm(year, TERM_META.lixia, timezone),
    mangzhong: makeSolarTerm(year, TERM_META.mangzhong, timezone),
    xiaoshu: makeSolarTerm(year, TERM_META.xiaoshu, timezone),
    liqiu: makeSolarTerm(year, TERM_META.liqiu, timezone),
    bailu: makeSolarTerm(year, TERM_META.bailu, timezone),
    hanlu: makeSolarTerm(year, TERM_META.hanlu, timezone),
    lidong: makeSolarTerm(year, TERM_META.lidong, timezone),
    daxue: makeSolarTerm(year, TERM_META.daxue, timezone),
  };
}

function isSameDate(parts: DateParts, term: SolarTerm) {
  return parts.year === term.at.year && parts.month === term.at.month && parts.day === term.at.day;
}

export function resolveKigakuYear(parts: DateParts, timezone = "Asia/Seoul", birthTimeKnown = true) {
  const terms = getSolarTermsForYear(parts.year, timezone);
  const birthMs = datePartsToMs(parts, timezone);
  const effectiveYear = birthMs < terms.lichun.timeMs ? parts.year - 1 : parts.year;
  const boundaryWarning = isSameDate(parts, terms.lichun)
    ? birthTimeKnown
      ? "입춘 당일 출생으로 실제 절기 시각 기준으로 판정했습니다."
      : "입춘 경계일입니다. 정확한 출생시간을 입력하면 결과가 더 안정적입니다."
    : "";
  return { effectiveYear, lichunAt: terms.lichun.isoLocal, boundaryWarning };
}

function honmeiNumberFromYear(year: number) {
  const root = digitRoot(year);
  return normalizeNineStar(11 - root);
}

export function calculateHonmeisei(parts: DateParts, timezone = "Asia/Seoul", birthTimeKnown = true) {
  const resolved = resolveKigakuYear(parts, timezone, birthTimeKnown);
  const honmeiNumber = honmeiNumberFromYear(resolved.effectiveYear);
  return {
    ...resolved,
    honmeiNumber,
    honmeiStar: getNineStarMeta(honmeiNumber),
  };
}

function monthKeyForHonmei(honmeiNumber: NineStarNumber) {
  if ([1, 4, 7].includes(honmeiNumber)) return 10;
  if ([2, 5, 8].includes(honmeiNumber)) return 13;
  return 16;
}

function monthBoundariesForYear(year: number, timezone: string) {
  const previous = getSolarTermsForYear(year - 1, timezone);
  const current = getSolarTermsForYear(year, timezone);
  const next = getSolarTermsForYear(year + 1, timezone);
  return [
    { start: previous.daxue, end: current.xiaohan, monthNo: 12 },
    { start: current.xiaohan, end: current.lichun, monthNo: 13 },
    { start: current.lichun, end: current.jingzhe, monthNo: 2 },
    { start: current.jingzhe, end: current.qingming, monthNo: 3 },
    { start: current.qingming, end: current.lixia, monthNo: 4 },
    { start: current.lixia, end: current.mangzhong, monthNo: 5 },
    { start: current.mangzhong, end: current.xiaoshu, monthNo: 6 },
    { start: current.xiaoshu, end: current.liqiu, monthNo: 7 },
    { start: current.liqiu, end: current.bailu, monthNo: 8 },
    { start: current.bailu, end: current.hanlu, monthNo: 9 },
    { start: current.hanlu, end: current.lidong, monthNo: 10 },
    { start: current.lidong, end: current.daxue, monthNo: 11 },
    { start: current.daxue, end: next.xiaohan, monthNo: 12 },
  ];
}

export function resolveKigakuMonth(parts: DateParts, timezone = "Asia/Seoul", birthTimeKnown = true) {
  const birthMs = datePartsToMs(parts, timezone);
  const boundaries = monthBoundariesForYear(parts.year, timezone);
  const segment = boundaries.find((item) => birthMs >= item.start.timeMs && birthMs < item.end.timeMs);
  if (!segment) throw new Error("절기 데이터 필요");
  const boundaryWarning = isSameDate(parts, segment.start) || isSameDate(parts, segment.end)
    ? birthTimeKnown
      ? "절입일 출생으로 실제 절기 시각 기준으로 판정했습니다."
      : "절입 경계일입니다. 정확한 출생시간을 입력하면 결과가 더 안정적입니다."
    : "";
  return {
    kigakuMonthNo: segment.monthNo,
    monthBranch: KIGAKU_MONTH_BRANCH[segment.monthNo] || null,
    monthStartSolarTerm: `${segment.start.label} ${segment.start.isoLocal}`,
    monthEndSolarTerm: `${segment.end.label} ${segment.end.isoLocal}`,
    boundaryWarning,
  };
}

export function calculateGetsumeisei(parts: DateParts, honmeiNumber: NineStarNumber, timezone = "Asia/Seoul", birthTimeKnown = true) {
  const month = resolveKigakuMonth(parts, timezone, birthTimeKnown);
  const getsumeiNumber = normalizeNineStar(monthKeyForHonmei(honmeiNumber) - month.kigakuMonthNo);
  return {
    ...month,
    getsumeiNumber,
    getsumeiStar: getNineStarMeta(getsumeiNumber),
  };
}

export function getElementRelation(fromElement: KuseiElement, toElement: KuseiElement) {
  if (fromElement === toElement) return "같은 오행: 같은 기질이 공명하며 장점과 반복 패턴이 함께 커지는 흐름";
  if (GENERATES[fromElement] === toElement) return `내가 생하는 오행: ${fromElement}가 ${toElement}를 생하므로 내가 에너지를 쓰며 움직이는 흐름`;
  if (GENERATES[toElement] === fromElement) return `나를 생하는 오행: ${toElement}가 ${fromElement}를 생하므로 나를 돕는 기운`;
  if (CONTROLS[fromElement] === toElement) return `내가 극하는 오행: ${fromElement}가 ${toElement}를 극하므로 내가 통제하려는 흐름`;
  return `나를 극하는 오행: ${toElement}가 ${fromElement}를 극하므로 압박과 조정이 필요한 흐름`;
}

export function calculateCurrentKigakuFlow(currentDateTime?: string, timezone = "Asia/Seoul") {
  const now = currentDateTime ? new Date(currentDateTime) : new Date();
  const parts = msToDateParts(now.getTime(), timezone);
  const year = resolveKigakuYear(parts, timezone, true);
  const currentYearStar = getNineStarMeta(honmeiNumberFromYear(year.effectiveYear));
  const month = resolveKigakuMonth(parts, timezone, true);
  const currentMonthNumber = normalizeNineStar(monthKeyForHonmei(currentYearStar.number) - month.kigakuMonthNo);
  return {
    currentKigakuYear: year.effectiveYear,
    currentYearStar,
    currentKigakuMonth: month.kigakuMonthNo,
    currentMonthStar: getNineStarMeta(currentMonthNumber),
  };
}

export function validateKuseiPromptInput(input: KuseiPromptInput) {
  if (!input.gender) throw new Error("성별을 선택해 주세요.");
  if (!input.birthDate) throw new Error("생년월일을 입력해 주세요.");
  if (!input.birthTimeKnown && input.birthHour !== undefined) return;
  if (input.birthTimeKnown) {
    if (input.birthHour === undefined || input.birthMinute === undefined) throw new Error("출생시간을 입력하거나 시간 모름을 선택해 주세요.");
  }
}

export function buildKuseiPromptPayload(input: KuseiPromptInput): KuseiPromptPayload {
  validateKuseiPromptInput(input);
  const timezone = input.timezone || "Asia/Seoul";
  const birthParts = parseInputDateTime({ ...input, timezone });
  const warnings: string[] = [];
  if (!input.birthTimeKnown) warnings.push("출생시간을 모르는 경우 일부 항목은 미산출로 표시됩니다.");

  const honmei = calculateHonmeisei(birthParts, timezone, input.birthTimeKnown);
  if (honmei.boundaryWarning) warnings.push(honmei.boundaryWarning);
  const getsumei = calculateGetsumeisei(birthParts, honmei.honmeiNumber, timezone, input.birthTimeKnown);
  if (getsumei.boundaryWarning) warnings.push(getsumei.boundaryWarning);
  const current = calculateCurrentKigakuFlow(input.currentDateTime, timezone);
  const honmeiToGetsumeiRelation = getElementRelation(honmei.honmeiStar.element, getsumei.getsumeiStar.element);
  const calculation: KuseiCalculationResult = {
    solarBirthDate: formatDate(birthParts.year, birthParts.month, birthParts.day),
    birthTimeLabel: input.birthTimeKnown ? `${pad2(birthParts.hour)}:${pad2(birthParts.minute)}` : "모름",
    effectiveYear: honmei.effectiveYear,
    lichunAt: honmei.lichunAt,
    honmeiNumber: honmei.honmeiNumber,
    honmeiStar: honmei.honmeiStar,
    kigakuMonthNo: getsumei.kigakuMonthNo,
    monthBranch: getsumei.monthBranch,
    monthStartSolarTerm: getsumei.monthStartSolarTerm,
    monthEndSolarTerm: getsumei.monthEndSolarTerm,
    getsumeiNumber: getsumei.getsumeiNumber,
    getsumeiStar: getsumei.getsumeiStar,
    dayStar: "미산출",
    hourStar: "미산출",
    currentKigakuYear: current.currentKigakuYear,
    currentYearStar: current.currentYearStar,
    currentKigakuMonth: current.currentKigakuMonth,
    currentMonthStar: current.currentMonthStar,
    honmeiToCurrentYearRelation: getElementRelation(honmei.honmeiStar.element, current.currentYearStar.element),
    honmeiToCurrentMonthRelation: getElementRelation(honmei.honmeiStar.element, current.currentMonthStar.element),
    honmeiToGetsumeiRelation,
    solarTermSource: "한국 음양력 코어 절기 시각(KST)",
    dayHourStarPolicy: "일명성·시명성은 음둔/양둔 전환과 절기 기준이 필요하므로, 검증된 계산 엔진 연결 후 제공",
    warnings,
  };
  const prompt = buildKuseiPromptText(input, calculation);
  return {
    input,
    calculation,
    prompt,
    summaryCards: [
      { label: kuseiCalcText("kuseiCalc.013"), value: `${calculation.honmeiStar.koreanName} ${calculation.honmeiStar.kanjiName} / ${calculation.honmeiStar.element}` },
      { label: kuseiCalcText("kuseiCalc.014"), value: calculation.getsumeiStar ? `${calculation.getsumeiStar.koreanName} ${calculation.getsumeiStar.kanjiName} / ${calculation.getsumeiStar.element}` : "미산출" },
      { label: kuseiCalcText("kuseiCalc.015"), value: `${calculation.effectiveYear}년` },
      { label: kuseiCalcText("kuseiCalc.016"), value: calculation.kigakuMonthNo ? `${calculation.kigakuMonthNo}월 기운 / 월지 ${calculation.monthBranch || "미산출"}` : "미산출" },
      { label: kuseiCalcText("kuseiCalc.017"), value: calculation.currentYearStar ? `${calculation.currentYearStar.koreanName} / ${calculation.currentYearStar.element}` : "미산출" },
      { label: kuseiCalcText("kuseiCalc.018"), value: calculation.currentMonthStar ? `${calculation.currentMonthStar.koreanName} / ${calculation.currentMonthStar.element}` : "미산출" },
    ],
  };
}

function starKeywords(star: NineStar | null | undefined) {
  return star?.keywords.join(", ") || "미산출";
}

function starLabel(star: NineStar | null | undefined) {
  return star ? `${star.koreanName} ${star.kanjiName}` : "미산출";
}

export function buildKuseiPromptText(input: KuseiPromptInput, result: KuseiCalculationResult) {
  const calendarLabel = input.calendarType === "lunar" ? (input.isLeapMonth ? "음력 윤달" : "음력") : "양력";
  const genderLabel = input.gender === "male" ? "남자" : "여자";
  const focusTopic = input.focusTopic || "전체";
  const question = input.userQuestion?.trim() || "미입력";
  const warnings = result.warnings.length ? result.warnings.join(" / ") : "없음";
  const text = `[무료 구성기학 리딩 프롬프트]

당신은 구성기학, 구궁, 낙서, 9성, 오행 관계 해석에 능숙한 전문 상담가입니다.

아래 자료는 사용자의 생년월일과 입력값을 바탕으로 계산된 구성기학 산출값입니다.
제공된 값만 사용하여 해석해 주세요.

중요 원칙:

* 본명성, 월명성, 연운, 월운 값을 임의로 바꾸지 마세요.
* 미산출 항목은 추측하지 마세요.
* 구성기학을 절대적인 예언처럼 말하지 말고, 기질·흐름·반복 패턴·행동 조언 중심으로 해석하세요.
* 의료, 법률, 재무, 계약 등 중요한 결정은 전문가 검토가 필요하다고 안내하세요.
* 답변은 한국어로 작성하세요.

[입력 정보]

성별:
${genderLabel}

생년월일:
${input.birthDate}

출생시간:
${result.birthTimeLabel}

달력 기준:
${calendarLabel}

양력 변환일:
${result.solarBirthDate}

시간대:
${input.timezone || "Asia/Seoul"}

확인하고 싶은 주제:
${focusTopic}

추가 질문:
${question}

[구성기학 계산 기준]

기학년 기준:
입춘 기준

기학월 기준:
절입 기준

절기 데이터:
${result.solarTermSource}

일명성/시명성 계산:
${result.dayHourStarPolicy}

[본명성]

기학년:
${result.effectiveYear}

입춘 시각:
${result.lichunAt || "절기 데이터 필요"}

본명성:
${starLabel(result.honmeiStar)}

본명성 번호:
${result.honmeiNumber}

본명성 오행:
${result.honmeiStar.element}

본명성 키워드:
${starKeywords(result.honmeiStar)}

경계 여부:
${result.warnings.find((item) => item.includes("입춘")) || "해당 없음"}

[월명성]

기학월 번호:
${result.kigakuMonthNo ?? "미산출"}

월지:
${result.monthBranch || "미산출"}

절입 구간:
${result.monthStartSolarTerm} ~ ${result.monthEndSolarTerm}

월명성:
${starLabel(result.getsumeiStar)}

월명성 번호:
${result.getsumeiNumber ?? "미산출"}

월명성 오행:
${result.getsumeiStar?.element || "미산출"}

월명성 키워드:
${starKeywords(result.getsumeiStar)}

경계 여부:
${result.warnings.find((item) => item.includes("절입")) || "해당 없음"}

[선택 산출값]

일명성:
${result.dayStar}

시명성:
${result.hourStar}

[현재 흐름]

현재 기학년:
${result.currentKigakuYear ?? "미산출"}

현재 연운:
${starLabel(result.currentYearStar)}

현재 기학월:
${result.currentKigakuMonth ?? "미산출"}

현재 월운:
${starLabel(result.currentMonthStar)}

본명성과 현재 연운의 오행 관계:
${result.honmeiToCurrentYearRelation || "미산출"}

본명성과 현재 월운의 오행 관계:
${result.honmeiToCurrentMonthRelation || "미산출"}

본명성과 월명성의 오행 관계:
${result.honmeiToGetsumeiRelation}

주의 사항:
${warnings}

[해석 요청]

다음 순서로 해석해 주세요.

1. 전체 결론을 먼저 5문장 이내로 요약해 주세요.
2. 본명성을 기준으로 이 사람의 중심 기질, 장점, 반복 패턴을 설명해 주세요.
3. 월명성을 기준으로 내면 반응, 감정 처리 방식, 가까운 관계에서 드러나는 모습을 설명해 주세요.
4. 본명성과 월명성의 오행 관계를 기준으로 겉모습과 속마음의 조화 또는 긴장을 설명해 주세요.
5. 현재 연운과 월운이 본명성에 어떤 흐름을 주는지 설명해 주세요.
6. 관계 방향을 잘 맞는 사람의 기질, 부담이 되는 관계 패턴, 줄여야 할 태도, 늘려야 할 태도로 나누어 설명해 주세요.
7. 일과 재능 방향을 강점이 살아나는 환경, 피로가 쌓이는 환경, 지금 시기에 맞는 행동 후보로 나누어 설명해 주세요.
8. 현재 사용자가 줄여야 할 행동 3가지와 늘려야 할 행동 3가지를 제안해 주세요.
9. 마지막 결론을 핵심 기질, 내면 패턴, 현재 흐름, 관계 조언, 일/재능 조언, 지금 줄일 것, 지금 늘릴 것, 현실 체크포인트 3가지, 해석의 한계로 정리해 주세요.

출력 스타일:

* 너무 장황하지 않게 작성하세요.
* 전체 분량은 약 1,500~2,500자 내외로 작성하세요.
* 무섭게 단정하지 마세요.
* 전문용어는 쉬운 말로 풀어 주세요.
* 반복 문장을 피하세요.
* 사용자가 실제로 행동을 정리할 수 있게 조언형으로 작성하세요.`;
  return text.replace(/\{\{[^}]+\}\}/g, "미산출");
}
