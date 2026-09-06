/**
 * 달력 42칸 조립. 42칸 고정·앞뒤 이웃 달 채움은 `app/sukuyo/calendar/SukuyoCalendarClient.tsx:650`
 * 의 `calendarCells` 와 같은 형태다(원칙 15 짝 구현).
 *
 * 🔴 날짜 계산은 `./kst-date` 만 쓴다 — 새 날짜 유틸을 만들지 않는다. 셸 모달의
 * `_buildMonthCells` 가 로컬 TZ 로 칸을 만들어 KST 날짜 키와 어긋나는 것이 알려진 결함이고,
 * 여기서 같은 실수를 되풀이하지 않으려고 UTC 고정 헬퍼만 쓴다.
 */

import { daysInMonth, shiftMonth, toYmd, weekdayIndex, type DiaryYearMonth } from "./kst-date";

export interface DiaryMonthCell {
  key: string;
  /** 이 달의 칸이면 `YYYY-MM-DD`, 앞뒤 이웃 달 칸이면 `null`(선택 불가). */
  ymd: string | null;
  day: number;
  isSunday: boolean;
  isToday: boolean;
}

export const DIARY_MONTH_CELL_COUNT = 42;

/**
 * 그 달의 42칸. 앞은 1일의 요일만큼 이웃 달로 채우고, 뒤는 42칸이 될 때까지 채운다.
 * `todayYmd` 는 하이드레이션 전이면 빈 문자열이라 아무 칸도 오늘이 되지 않는다.
 */
export function buildDiaryMonthCells(cursor: DiaryYearMonth, todayYmd: string): DiaryMonthCell[] {
  const { year, month } = cursor;
  const total = daysInMonth(year, month);
  const firstWeekday = weekdayIndex(toYmd(year, month, 1));

  const previous = shiftMonth(cursor, -1);
  const previousTotal = daysInMonth(previous.year, previous.month);
  const cells: DiaryMonthCell[] = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    const day = previousTotal - firstWeekday + i + 1;
    cells.push({ key: `prev-${day}`, ymd: null, day, isSunday: i % 7 === 0, isToday: false });
  }

  for (let day = 1; day <= total; day += 1) {
    const ymd = toYmd(year, month, day);
    cells.push({
      key: ymd,
      ymd,
      day,
      isSunday: cells.length % 7 === 0,
      isToday: ymd === todayYmd,
    });
  }

  for (let day = 1; cells.length < DIARY_MONTH_CELL_COUNT; day += 1) {
    cells.push({ key: `next-${day}`, ymd: null, day, isSunday: cells.length % 7 === 0, isToday: false });
  }

  return cells;
}

/** 그 달에 실제로 존재하는 날짜 키만. 운기 판정과 마크 집계가 이 목록을 쓴다. */
export function monthYmds(cursor: DiaryYearMonth): string[] {
  const total = daysInMonth(cursor.year, cursor.month);
  return Array.from({ length: total }, (_, index) => toYmd(cursor.year, cursor.month, index + 1));
}
