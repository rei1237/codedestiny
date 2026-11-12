// 브라우저와 Worker가 같은 계산·상징 데이터를 사용한다.
import * as core from "../../lib/maya-calendar-core.mjs";

export const GMT_CORRELATION = core.GMT_CORRELATION;
export type MayaDateParts = {
  year: number;
  month: number;
  day: number;
};

export type MayaCalendarResult = {
  gregorian: MayaDateParts & {
    iso: string;
    labelKo: string;
    weekdayIndex: number;
    weekdayKo: string;
  };
  julianDayNumber: number;
  mayaDays: number;
  correlation: number;
  longCount: {
    baktun: number;
    katun: number;
    tun: number;
    uinal: number;
    kin: number;
    label: string;
  };
  tzolkin: {
    number: number;
    signIndex: number;
    sign: string;
    ko: string;
    keywords: string[];
    label: string;
  };
  haab: {
    day: number;
    monthIndex: number;
    month: string;
    ko: string;
    keywords: string[];
    label: string;
  };
};

export type MayaMonthCell = {
  date: MayaDateParts;
  calendar: MayaCalendarResult;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
};

export function isLeapYear(year: number) { return core.isLeapYear(year); }

export function getDaysInMonth(year: number, month: number) { return core.getDaysInMonth(year, month); }

export function isValidGregorianDate(year: number, month: number, day: number) { return core.isValidGregorianDate(year, month, day); }

export function formatIsoDate({ year, month, day }: MayaDateParts) { return core.formatIsoDate({ year, month, day }); }

export function formatKoreanDate(parts: MayaDateParts, weekdayKo?: string) { return core.formatKoreanDate(parts, weekdayKo); }

export function getTodayParts(now = new Date()): MayaDateParts { return core.getTodayParts(now); }

export function gregorianToJdn(year: number, month: number, day: number): number { return core.gregorianToJdn(year, month, day); }

export function jdnToGregorian(jdn: number): MayaDateParts { return core.jdnToGregorian(jdn); }

export function getWeekdayIndex(year: number, month: number, day: number) { return core.getWeekdayIndex(year, month, day); }

export function getWeekdayKo(year: number, month: number, day: number) { return core.getWeekdayKo(year, month, day); }

export function calculateLongCount(mayaDays: number) { return core.calculateLongCount(mayaDays); }

export function calculateTzolkin(mayaDays: number) { return core.calculateTzolkin(mayaDays); }

export function calculateHaab(mayaDays: number) { return core.calculateHaab(mayaDays); }

export function calculateMayaCalendar(year: number, month: number, day: number): MayaCalendarResult { return core.calculateMayaCalendar(year, month, day); }

export function buildMayaMonthGrid(year: number, month: number, selected: MayaDateParts, today: MayaDateParts): MayaMonthCell[] { return core.buildMayaMonthGrid(year, month, selected, today); }
