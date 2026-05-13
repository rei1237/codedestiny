import { Lunar, Solar } from "lunar-javascript";

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;

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

/**
 * 십이운성 동물점 전용 정밀 사주 계산기.
 * - 양력/음력(윤달 포함) 입력 지원
 * - `lunar-javascript` 팔자(EightChar) 기반 연/월/일/시주 계산
 */
export function calculateLocalSaju(input: LocalSajuInput): LocalSajuResult {
  const solarDate = resolveSolarDate(input);

  const hour = input.hasTime && Number.isFinite(input.hour) ? clamp(Number(input.hour), 0, 23) : 12;
  const minute = input.hasTime && Number.isFinite(input.minute) ? clamp(Number(input.minute), 0, 59) : 0;

  const solar = Solar.fromYmdHms(solarDate.year, solarDate.month, solarDate.day, hour, minute, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  const yearPillar = makePillar(eightChar.getYearGan(), eightChar.getYearZhi());
  const monthPillar = makePillar(eightChar.getMonthGan(), eightChar.getMonthZhi());
  const dayPillar = makePillar(eightChar.getDayGan(), eightChar.getDayZhi());
  const hourPillar = input.hasTime
    ? makePillar(eightChar.getTimeGan(), eightChar.getTimeZhi())
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
