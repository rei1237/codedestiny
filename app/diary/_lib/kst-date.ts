/**
 * 다이어리의 날짜축은 언제나 Asia/Seoul 이다. `new Date().getFullYear()` 처럼 로컬 TZ 에
 * 기대는 계산을 쓰지 않는다 — 셸 모달과 하루가 어긋나면 같은 날의 기록이 두 날짜로 갈린다.
 *
 * 규칙은 lib/fortune/daily-data.ts:92-104 의 kstYmd() 와 같다(원칙 15 짝 구현).
 * 🔴 PR-B 에서 운기 엔진을 옮길 때 js/luck-sync-diary.js 의 `_getSeoulDateParts`(:302)와
 *    같은 값을 내는지 확인하고, 새 날짜 유틸을 또 만들지 말고 이 파일을 쓴다.
 */

const KST_TIME_ZONE = "Asia/Seoul";

/** `YYYY-MM-DD` (KST). 다이어리의 날짜 키 형식이자 `?d=` 쿼리 형식이다. */
export function kstTodayYmd(base: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** `YYYY-MM-DD` 를 쪼갠다. 형식이 아니면 `null` — 호출자가 `?d=` 쿼리도 이걸로 거른다. */
export function parseYmd(ymd: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** 숫자 → `YYYY-MM-DD`. 날짜 키를 문자열로 조립하는 곳은 여기 하나다. */
export function toYmd(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export interface DiaryYearMonth {
  year: number;
  month: number;
}

/** `YYYY-MM` — 월 샤드·월 마크의 접두사다. */
export function toMonthKey({ year, month }: DiaryYearMonth): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

/**
 * 그 달의 날 수. 🔴 `Date.UTC` 로만 센다 — 로컬 TZ 를 타면 셸 모달과 달력 칸이 하루 어긋난다
 * (`_buildMonthCells` 가 로컬 TZ 를 쓰는 것이 이 파일이 생긴 이유다).
 */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 달 이동. 12월을 넘으면 해가 함께 넘어간다. */
export function shiftMonth({ year, month }: DiaryYearMonth, delta: number): DiaryYearMonth {
  const zeroBased = year * 12 + (month - 1) + delta;
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 };
}

/** 요일 인덱스(0=일). UTC 자정으로 고정해 로컬 TZ 를 타지 않는다. */
export function weekdayIndex(ymd: string): number {
  return new Date(`${ymd}T00:00:00Z`).getUTCDay();
}

export function weekdayLabel(index: number): string {
  return WEEKDAY_KO[index] || "";
}

/** `2026년 9월` — 달력 머리말. */
export function formatKoreanMonth({ year, month }: DiaryYearMonth): string {
  return `${year}년 ${month}월`;
}

/** `2026년 9월 6일 (일)` — 사람이 읽는 표기. 로케일은 ko 전용 + en 폴백 방침을 따른다. */
export function formatKoreanDate(ymd: string): string {
  const parts = parseYmd(ymd);
  if (!parts) return ymd;
  return `${parts.year}년 ${parts.month}월 ${parts.day}일 (${weekdayLabel(weekdayIndex(ymd))})`;
}
