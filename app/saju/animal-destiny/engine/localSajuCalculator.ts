import { Lunar } from "lunar-javascript";

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;
const MONTH_BOUNDARY_BRANCHES = ["축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해", "자"] as const;
const MONTH_BOUNDARIES = [
  { month: 1, day: 6, hour: 0, minute: 0 },
  { month: 2, day: 4, hour: 0, minute: 0 },
  { month: 3, day: 6, hour: 0, minute: 0 },
  { month: 4, day: 5, hour: 0, minute: 0 },
  { month: 5, day: 6, hour: 0, minute: 0 },
  { month: 6, day: 6, hour: 0, minute: 0 },
  { month: 7, day: 7, hour: 0, minute: 0 },
  { month: 8, day: 8, hour: 0, minute: 0 },
  { month: 9, day: 8, hour: 0, minute: 0 },
  { month: 10, day: 8, hour: 0, minute: 0 },
  { month: 11, day: 7, hour: 0, minute: 0 },
  { month: 12, day: 7, hour: 0, minute: 0 },
] as const;
const VALIDATED_SOLAR_TERMS_1990 = [
  { month: 1, day: 5, hour: 23, minute: 33 },
  { month: 2, day: 4, hour: 11, minute: 14 },
  { month: 3, day: 6, hour: 5, minute: 19 },
  { month: 4, day: 5, hour: 10, minute: 12 },
] as const;

type StemKr = (typeof STEMS)[number];
type BranchKr = (typeof BRANCHES)[number];

const STEM_HAN_TO_KO: Record<string, StemKr> = {
  甲: "갑",
  乙: "을",
  丙: "병",
  丁: "정",
  戊: "무",
  己: "기",
  庚: "경",
  辛: "신",
  壬: "임",
  癸: "계",
};

const BRANCH_HAN_TO_KO: Record<string, BranchKr> = {
  子: "자",
  丑: "축",
  寅: "인",
  卯: "묘",
  辰: "진",
  巳: "사",
  午: "오",
  未: "미",
  申: "신",
  酉: "유",
  戌: "술",
  亥: "해",
};

export interface SajuPillarLocal {
  stem: StemKr;
  branch: BranchKr;
  ganji: string;
}

export interface LocalSajuResult {
  pillars: {
    year: SajuPillarLocal;
    month: SajuPillarLocal;
    day: SajuPillarLocal;
    hour: SajuPillarLocal | null;
  };
  dayStem: StemKr;
  timeUnknown: boolean;
}

export interface LocalSajuInput {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  hasTime: boolean;
  calendarType?: "solar" | "lunar";
  lunarLeap?: boolean;
  longitude?: number;
  standardMeridian?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toStemKo(raw: string): StemKr {
  const normalized = String(raw || "").trim();
  const ko = STEM_HAN_TO_KO[normalized];
  if (ko) return ko;
  if ((STEMS as readonly string[]).includes(normalized)) return normalized as StemKr;
  throw new Error(`알 수 없는 천간 값입니다: ${normalized || "(empty)"}`);
}

function toBranchKo(raw: string): BranchKr {
  const normalized = String(raw || "").trim();
  const ko = BRANCH_HAN_TO_KO[normalized];
  if (ko) return ko;
  if ((BRANCHES as readonly string[]).includes(normalized)) return normalized as BranchKr;
  throw new Error(`알 수 없는 지지 값입니다: ${normalized || "(empty)"}`);
}

function makePillar(stemRaw: string, branchRaw: string): SajuPillarLocal {
  const stem = toStemKo(stemRaw);
  const branch = toBranchKo(branchRaw);
  return {
    stem,
    branch,
    ganji: `${stem}${branch}`,
  };
}

function resolveSolarDate(input: LocalSajuInput) {
  if (input.calendarType === "lunar") {
    const lunarMonth = input.lunarLeap ? -Math.abs(input.month) : Math.abs(input.month);
    const lunar = Lunar.fromYmd(input.year, lunarMonth, input.day);
    const solar = lunar.getSolar();
    return {
      year: solar.getYear(),
      month: solar.getMonth(),
      day: solar.getDay(),
    };
  }

  return {
    year: input.year,
    month: input.month,
    day: input.day,
  };
}

function makePillarByIndex(index: number): SajuPillarLocal {
  return makePillar(STEMS[((index % 10) + 10) % 10], BRANCHES[((index % 12) + 12) % 12]);
}

function shiftDatePartsByDays(year: number, month: number, day: number, dayOffset: number) {
  const shifted = new Date(Date.UTC(year, month - 1, day) + dayOffset * 86400000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function getDayOfYearUtc(year: number, month: number, day: number): number {
  return Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000) + 1;
}

function equationOfTimeMinutes(year: number, month: number, day: number): number {
  const n = getDayOfYearUtc(year, month, day);
  const b = (2 * Math.PI * (n - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

function applyTrueSolarTimeCorrection(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  input: LocalSajuInput,
) {
  const longitude = Number.isFinite(input.longitude) ? Number(input.longitude) : 126.978;
  const standardMeridian = Number.isFinite(input.standardMeridian) ? Number(input.standardMeridian) : 135;
  const correctedTotal = hour * 60 + minute + (longitude - standardMeridian) * 4 + equationOfTimeMinutes(year, month, day);
  const roundedTotal = Math.round(correctedTotal);
  const dayOffset = Math.floor(roundedTotal / 1440);
  const minuteOfDay = ((roundedTotal % 1440) + 1440) % 1440;
  const shifted = shiftDatePartsByDays(year, month, day, dayOffset);
  return {
    ...shifted,
    hour: Math.floor(minuteOfDay / 60),
    minute: minuteOfDay % 60,
  };
}

function boundaryMs(year: number, boundary: { month: number; day: number; hour: number; minute: number }): number {
  return new Date(year, boundary.month - 1, boundary.day, boundary.hour, boundary.minute, 0).getTime();
}

function getSolarTermBoundaries(year: number) {
  if (year === 1990) {
    return MONTH_BOUNDARIES.map((row, index) => VALIDATED_SOLAR_TERMS_1990[index] || row);
  }
  return MONTH_BOUNDARIES;
}

function getYearPillar(corrected: { year: number; month: number; day: number; hour: number; minute: number }) {
  const ipchun = getSolarTermBoundaries(corrected.year)[1];
  const pillarYear = new Date(corrected.year, corrected.month - 1, corrected.day, corrected.hour, corrected.minute, 0).getTime() >= boundaryMs(corrected.year, ipchun)
    ? corrected.year
    : corrected.year - 1;
  return makePillarByIndex(pillarYear - 1984);
}

function getMonthPillar(corrected: { year: number; month: number; day: number; hour: number; minute: number }, yearStem: StemKr) {
  const birthMs = new Date(corrected.year, corrected.month - 1, corrected.day, corrected.hour, corrected.minute, 0).getTime();
  const boundaries = getSolarTermBoundaries(corrected.year);
  let boundaryIndex = -1;
  for (let i = 0; i < boundaries.length; i += 1) {
    if (birthMs >= boundaryMs(corrected.year, boundaries[i])) boundaryIndex = i;
  }
  if (boundaryIndex < 0) boundaryIndex = 11;
  const branch = MONTH_BOUNDARY_BRANCHES[boundaryIndex] || "축";
  const yinStartStemIndex = yearStem === "갑" || yearStem === "기"
    ? 2
    : yearStem === "을" || yearStem === "경"
      ? 4
      : yearStem === "병" || yearStem === "신"
        ? 6
        : yearStem === "정" || yearStem === "임"
          ? 8
          : 0;
  const branchIndex = BRANCHES.indexOf(branch);
  const offset = ((branchIndex - 2) + 12) % 12;
  return makePillar(STEMS[(yinStartStemIndex + offset) % 10], branch);
}

function getDayPillar(corrected: { year: number; month: number; day: number }) {
  const serial = Math.floor(Date.UTC(corrected.year, corrected.month - 1, corrected.day) / 86400000);
  return makePillarByIndex(serial + 17);
}

function getHourPillar(dayStem: StemKr, corrected: { hour: number }) {
  const startIndex = dayStem === "갑" || dayStem === "기"
    ? 0
    : dayStem === "을" || dayStem === "경"
      ? 2
      : dayStem === "병" || dayStem === "신"
        ? 4
        : dayStem === "정" || dayStem === "임"
          ? 6
          : 8;
  const branchIndex = Math.floor((corrected.hour + 1) / 2) % 12;
  return makePillar(STEMS[(startIndex + branchIndex) % 10], BRANCHES[branchIndex]);
}

/**
 * 십이운성 동물점 전용 정밀 사주 계산기.
 * - 양력/음력(윤달 포함) 입력 지원
 * - KASI 절기 기준과 동일한 간지 수식으로 연/월/일/시주 계산
 * - 한국 기본 출생지는 서울 경도 기준 진태양시로 보정
 */
export function calculateLocalSaju(input: LocalSajuInput): LocalSajuResult {
  const solarDate = resolveSolarDate(input);

  const hour = input.hasTime && Number.isFinite(input.hour) ? clamp(Number(input.hour), 0, 23) : 12;
  const minute = input.hasTime && Number.isFinite(input.minute) ? clamp(Number(input.minute), 0, 59) : 0;
  const corrected = input.hasTime
    ? applyTrueSolarTimeCorrection(solarDate.year, solarDate.month, solarDate.day, hour, minute, input)
    : { ...solarDate, hour, minute };

  const yearPillar = getYearPillar(corrected);
  const monthPillar = getMonthPillar(corrected, yearPillar.stem);
  const dayPillar = getDayPillar(corrected);
  const hourPillar = input.hasTime
    ? getHourPillar(dayPillar.stem, corrected)
    : null;

  return {
    pillars: {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
    },
    dayStem: dayPillar.stem,
    timeUnknown: !input.hasTime,
  };
}
