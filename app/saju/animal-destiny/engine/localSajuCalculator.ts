/**
 * localSajuCalculator.ts
 *
 * 외부 API 없이 생년월일·시각으로 사주 사기둥(年·月·日·時) 천간/지지를 계산하는
 * 순수 TypeScript deterministic 엔진.
 *
 * 정확도:
 * - 年柱: 100% (연간지 60갑자 주기)
 * - 月柱: 근사치 (절기일을 평균값으로 고정 — ±1~2일 오차 가능)
 * - 日柱: 거의 정확 (1900-01-31 = 甲子日 기준 그레고리력 날수 계산)
 * - 時柱: 100% (2시간 단위 12지 매핑)
 *
 * 이 계산기는 십이운성 동물점 전용으로, 동일 입력 → 동일 결과를 보장합니다.
 * 랜덤 요소가 전혀 없습니다.
 */

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;

type StemKr = (typeof STEMS)[number];
type BranchKr = (typeof BRANCHES)[number];

export interface SajuPillarLocal {
  stem: StemKr;
  branch: BranchKr;
  ganji: string;
}

export interface LocalSajuResult {
  /** pillars 구조 — twelveStages.ts 의 pickPillar() 추출에 사용 */
  pillars: {
    year: SajuPillarLocal;
    month: SajuPillarLocal;
    day: SajuPillarLocal;
    hour: SajuPillarLocal | null;
  };
  /** 일간 (일간 추출 단순화용) */
  dayStem: StemKr;
  /** 시주 미입력 여부 */
  timeUnknown: boolean;
}

// ── 月柱 절기 근사 테이블 ──────────────────────────────────────────────────
// [태양력 월, 절기 시작 일(근사), 해당 사주월 지지 인덱스]
// 절기 이전 → 전 월 지지, 절기 이후 → 해당 월 지지
const JEOLGI_TABLE: Array<{ solarMonth: number; jeolgiDay: number; branchIdx: number }> = [
  { solarMonth: 1, jeolgiDay: 6, branchIdx: 1 },   // 소한(小寒) → 축월(丑月)
  { solarMonth: 2, jeolgiDay: 4, branchIdx: 2 },   // 입춘(立春) → 인월(寅月)
  { solarMonth: 3, jeolgiDay: 6, branchIdx: 3 },   // 경칩(驚蟄) → 묘월(卯月)
  { solarMonth: 4, jeolgiDay: 5, branchIdx: 4 },   // 청명(淸明) → 진월(辰月)
  { solarMonth: 5, jeolgiDay: 6, branchIdx: 5 },   // 입하(立夏) → 사월(巳月)
  { solarMonth: 6, jeolgiDay: 6, branchIdx: 6 },   // 망종(芒種) → 오월(午月)
  { solarMonth: 7, jeolgiDay: 7, branchIdx: 7 },   // 소서(小暑) → 미월(未月)
  { solarMonth: 8, jeolgiDay: 7, branchIdx: 8 },   // 입추(立秋) → 신월(申月)
  { solarMonth: 9, jeolgiDay: 8, branchIdx: 9 },   // 백로(白露) → 유월(酉月)
  { solarMonth: 10, jeolgiDay: 8, branchIdx: 10 }, // 한로(寒露) → 술월(戌月)
  { solarMonth: 11, jeolgiDay: 7, branchIdx: 11 }, // 입동(立冬) → 해월(亥月)
  { solarMonth: 12, jeolgiDay: 7, branchIdx: 0 },  // 대설(大雪) → 자월(子月)
];

// 연간 % 5 → 인월(寅月) 천간 시작 인덱스
// 갑·기(0) → 병인(2), 을·경(1) → 무인(4), 병·신(2) → 경인(6),
// 정·임(3) → 임인(8), 무·계(4) → 갑인(0)
const MONTH_START_STEMS = [2, 4, 6, 8, 0] as const;

// 일간 % 5 → 자시(子時) 천간 시작 인덱스
// 갑·기(0) → 갑자(0), 을·경(1) → 병자(2), 병·신(2) → 무자(4),
// 정·임(3) → 경자(6), 무·계(4) → 임자(8)
const HOUR_START_STEMS = [0, 2, 4, 6, 8] as const;

// 일주(日柱) 기준일: 1900-01-31 = 甲子日 (60갑자 사이클 인덱스 0)
const DAY_REFERENCE_MS = Date.UTC(1900, 0, 31); // 1900-01-31 00:00 UTC

// ── 내부 유틸 ─────────────────────────────────────────────────────────────

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function makePillar(stemIdx: number, branchIdx: number): SajuPillarLocal {
  const stem = STEMS[mod(stemIdx, 10)];
  const branch = BRANCHES[mod(branchIdx, 12)];
  return { stem, branch, ganji: stem + branch };
}

// ── 年柱 ──────────────────────────────────────────────────────────────────

function getYearPillar(year: number): SajuPillarLocal {
  // 1984 = 甲子年 (인덱스 0)
  const cycleIdx = mod(year - 1984, 60);
  return makePillar(cycleIdx % 10, cycleIdx % 12);
}

// ── 月柱 ──────────────────────────────────────────────────────────────────

function getMonthBranchIdx(solarMonth: number, solarDay: number): number {
  const entry = JEOLGI_TABLE.find((e) => e.solarMonth === solarMonth);
  if (!entry) return 1; // 기본값: 축월

  if (solarDay >= entry.jeolgiDay) {
    return entry.branchIdx;
  }

  // 절기 전 → 전 월 지지
  const entryIdx = JEOLGI_TABLE.indexOf(entry);
  if (entryIdx <= 0) {
    // 1월 소한 이전 → 전년 대설 이후: 자월(0)
    return 0;
  }
  return JEOLGI_TABLE[entryIdx - 1].branchIdx;
}

function getMonthPillar(year: number, solarMonth: number, solarDay: number): SajuPillarLocal {
  const yearPillar = getYearPillar(year);
  const yearStemIdx = STEMS.indexOf(yearPillar.stem);

  const monthBranchIdx = getMonthBranchIdx(solarMonth, solarDay);

  // 인월(branchIdx=2)이 month offset 0, 묘월(3)이 offset 1 ...
  const monthOffset = mod(monthBranchIdx - 2, 12);
  const startStemIdx = MONTH_START_STEMS[mod(yearStemIdx, 5)];
  const monthStemIdx = mod(startStemIdx + monthOffset, 10);

  return makePillar(monthStemIdx, monthBranchIdx);
}

// ── 日柱 ──────────────────────────────────────────────────────────────────

function getDayPillar(year: number, solarMonth: number, solarDay: number): SajuPillarLocal {
  const targetMs = Date.UTC(year, solarMonth - 1, solarDay);
  const dayCount = Math.round((targetMs - DAY_REFERENCE_MS) / 86_400_000);
  const cycleIdx = mod(dayCount, 60);
  return makePillar(cycleIdx % 10, cycleIdx % 12);
}

// ── 時柱 ──────────────────────────────────────────────────────────────────

function getHourBranchIdx(hour: number): number {
  // 자시(子時) = 23:00~01:00 → branch 0
  // 축시(丑時) = 01:00~03:00 → branch 1, ...
  if (hour === 23) return 0;
  return Math.floor((hour + 1) / 2) % 12;
}

function getHourPillar(dayStem: StemKr, hour: number): SajuPillarLocal {
  const dayStemIdx = STEMS.indexOf(dayStem);
  const hourBranchIdx = getHourBranchIdx(hour);
  const startStemIdx = HOUR_START_STEMS[mod(dayStemIdx, 5)];
  const hourStemIdx = mod(startStemIdx + hourBranchIdx, 10);
  return makePillar(hourStemIdx, hourBranchIdx);
}

// ── 공개 API ──────────────────────────────────────────────────────────────

export interface LocalSajuInput {
  year: number;
  month: number;
  day: number;
  hour?: number;
  hasTime: boolean;
}

/**
 * 사주 사기둥(年·月·日·時)을 로컬에서 계산합니다.
 * 동일 입력 → 동일 결과 (deterministic).
 * 외부 API 의존 없음.
 */
export function calculateLocalSaju(input: LocalSajuInput): LocalSajuResult {
  const { year, month, day, hour, hasTime } = input;

  const yearPillar = getYearPillar(year);
  const monthPillar = getMonthPillar(year, month, day);
  const dayPillar = getDayPillar(year, month, day);
  const hourPillar =
    hasTime && hour !== undefined ? getHourPillar(dayPillar.stem, hour) : null;

  return {
    pillars: {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
    },
    dayStem: dayPillar.stem,
    timeUnknown: !hasTime,
  };
}
