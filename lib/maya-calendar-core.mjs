import { HAAB_MONTHS, TZOLKIN_SIGNS } from "./maya-calendar-symbols.mjs";
export const GMT_CORRELATION = 584283;
const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
function positiveMod(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
}
function pad2(value) {
    return String(value).padStart(2, "0");
}
export function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
export function getDaysInMonth(year, month) {
    if (month === 2)
        return isLeapYear(year) ? 29 : 28;
    return [4, 6, 9, 11].includes(month) ? 30 : 31;
}
export function isValidGregorianDate(year, month, day) {
    return (Number.isInteger(year)
        && Number.isInteger(month)
        && Number.isInteger(day)
        && year >= 1
        && month >= 1
        && month <= 12
        && day >= 1
        && day <= getDaysInMonth(year, month));
}
export function formatIsoDate({ year, month, day }) {
    return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}
export function formatKoreanDate(parts, weekdayKo) {
    const suffix = weekdayKo ? ` ${weekdayKo}` : "";
    return `${parts.year}년 ${parts.month}월 ${parts.day}일${suffix}`;
}
export function getTodayParts(now = new Date()) {
    return {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
    };
}
export function gregorianToJdn(year, month, day) {
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    return (day
        + Math.floor((153 * m + 2) / 5)
        + 365 * y
        + Math.floor(y / 4)
        - Math.floor(y / 100)
        + Math.floor(y / 400)
        - 32045);
}
export function jdnToGregorian(jdn) {
    const a = jdn + 32044;
    const b = Math.floor((4 * a + 3) / 146097);
    const c = a - Math.floor((146097 * b) / 4);
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor((1461 * d) / 4);
    const m = Math.floor((5 * e + 2) / 153);
    const day = e - Math.floor((153 * m + 2) / 5) + 1;
    const month = m + 3 - 12 * Math.floor(m / 10);
    const year = 100 * b + d - 4800 + Math.floor(m / 10);
    return { year, month, day };
}
export function getWeekdayIndex(year, month, day) {
    return positiveMod(gregorianToJdn(year, month, day) + 1, 7);
}
export function getWeekdayKo(year, month, day) {
    return WEEKDAYS_KO[getWeekdayIndex(year, month, day)];
}
export function calculateLongCount(mayaDays) {
    const baktun = Math.floor(mayaDays / 144000);
    let rest = mayaDays % 144000;
    if (rest < 0)
        rest += 144000;
    const katun = Math.floor(rest / 7200);
    rest %= 7200;
    const tun = Math.floor(rest / 360);
    rest %= 360;
    const uinal = Math.floor(rest / 20);
    const kin = rest % 20;
    return {
        baktun,
        katun,
        tun,
        uinal,
        kin,
        label: `${baktun}.${katun}.${tun}.${uinal}.${kin}`,
    };
}
export function calculateTzolkin(mayaDays) {
    const number = positiveMod(mayaDays + 3, 13) + 1;
    const signIndex = positiveMod(mayaDays + 19, 20);
    const sign = TZOLKIN_SIGNS[signIndex];
    return {
        number,
        signIndex,
        sign: sign.key,
        ko: sign.ko,
        keywords: sign.keywords,
        label: `${number} ${sign.key}`,
    };
}
export function calculateHaab(mayaDays) {
    const haabIndex = positiveMod(mayaDays + 348, 365);
    const monthIndex = haabIndex < 360 ? Math.floor(haabIndex / 20) : 18;
    const day = haabIndex < 360 ? haabIndex % 20 : haabIndex - 360;
    const month = HAAB_MONTHS[monthIndex];
    return {
        day,
        monthIndex,
        month: month.key,
        ko: month.ko,
        keywords: month.keywords,
        label: `${day} ${month.key}`,
    };
}
export function calculateMayaCalendar(year, month, day) {
    if (!isValidGregorianDate(year, month, day)) {
        throw new Error("날짜 형식이 올바르지 않습니다.");
    }
    const julianDayNumber = gregorianToJdn(year, month, day);
    const mayaDays = julianDayNumber - GMT_CORRELATION;
    const weekdayIndex = positiveMod(julianDayNumber + 1, 7);
    const weekdayKo = WEEKDAYS_KO[weekdayIndex];
    const gregorian = {
        year,
        month,
        day,
        iso: formatIsoDate({ year, month, day }),
        labelKo: formatKoreanDate({ year, month, day }, weekdayKo),
        weekdayIndex,
        weekdayKo,
    };
    return {
        gregorian,
        julianDayNumber,
        mayaDays,
        correlation: GMT_CORRELATION,
        longCount: calculateLongCount(mayaDays),
        tzolkin: calculateTzolkin(mayaDays),
        haab: calculateHaab(mayaDays),
    };
}
export function buildMayaMonthGrid(year, month, selected, today) {
    const firstJdn = gregorianToJdn(year, month, 1);
    const firstWeekday = positiveMod(firstJdn + 1, 7);
    const startJdn = firstJdn - firstWeekday;
    const selectedIso = formatIsoDate(selected);
    const todayIso = formatIsoDate(today);
    return Array.from({ length: 42 }, (_, index) => {
        const date = jdnToGregorian(startJdn + index);
        const calendar = calculateMayaCalendar(date.year, date.month, date.day);
        const iso = formatIsoDate(date);
        return {
            date,
            calendar,
            inCurrentMonth: date.month === month,
            isToday: iso === todayIso,
            isSelected: iso === selectedIso,
        };
    });
}
