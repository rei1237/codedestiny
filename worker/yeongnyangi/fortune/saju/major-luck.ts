import { toKoreanGanji } from "../../../lib/saju-ai-prompt.js";
import { kstWall } from "./sexagenary-year";

// The engine (lib/korean-calendar/daeun.js) groups each 대운 by calendar year and counts age the Korean way, so
// "32세 乙亥" and a 1 January switch read as a different 대운 from apps that show the 교운일, 만 나이 and 대운수.
// The engine fields stay as they are; this adds the dated ones and picks the current cycle by the 교운일.
export const MAJOR_LUCK_AGE_RULE =
  "대운을 말할 때는 각 주기의 label을 그대로 쓴다. startDate는 실제 교운일(무렵), startAgeMan·endAgeMan은 그날의 만 나이, daeunNumber는 대운수(출생부터 첫 교운까지를 반올림한 햇수)다. startYear·endYear는 세운을 묶는 연도 구간이고 startAge·endAge는 연도로 센 세는 나이라 'N세 대운'으로 쓰지 않는다. 현재 대운은 isCurrent(교운일 기준)다.";

type Row = Record<string, any>;
const pad = (n: number) => String(n).padStart(2, "0");
const leap = (y: number) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
const dateIn = (year: number, monthDay: string) => (monthDay === "02-29" && !leap(year) ? `${year}-02-28` : `${year}-${monthDay}`);
const dayBefore = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
const yearMonth = (date: string) => `${date.slice(0, 4)}년 ${Number(date.slice(5, 7))}월`;

/** Short tag for luck rows that already say "대운" (advancedFactors, cycle evidence). */
export const cycleTag = (c: Row) => `${c.pillar}(${yearMonth(c.startDate)}~, 만 ${c.startAgeMan}세)`;

export function withDatedMajorLuck<T>(input: T, now: Date): T {
  const major = input as Row | null | undefined;
  const start = major?.startSolarDate, after = major?.startAfterBirth;
  if (!major?.available || !Array.isArray(major.cycles) || typeof start !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !after) return input;
  const monthDay = start.slice(5, 10), wall = kstWall(now), today = `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`;
  const daeunNumber = Number(after.years) + (Number(after.months) >= 6 ? 1 : 0);
  const startOf = (c: Row) => dateIn(Number(c.startYear), monthDay);
  const cycles: Row[] = major.cycles.map((c: Row) => {
    const next = major.cycles.find((x: Row) => x.index === c.index + 1);
    const endDate = dayBefore(next ? startOf(next) : dateIn(Number(c.startYear) + 10, monthDay));
    // Index 0 is the span before the first 교운; its start would be the raw birth date, so it is left out.
    if (!(c.index >= 1)) return { ...c, endDate };
    const startDate = startOf(c), startAgeMan = Number(after.years) + 10 * (c.index - 1);
    return { ...c, startDate, endDate, startAgeMan, endAgeMan: startAgeMan + 9, ageRange: `만 ${startAgeMan}~${startAgeMan + 9}세`,
      label: `${toKoreanGanji(c.pillar)} 대운 · ${yearMonth(startDate)} 무렵부터 (만 ${startAgeMan}세, 대운수 ${daeunNumber})` };
  });
  const current = cycles.find((c) => (c.startDate || "") <= today && today <= c.endDate) || null;
  const turning = cycles.find((c) => c.startDate?.startsWith(`${wall.year}-`));
  const before = turning && cycles.find((c) => c.index === turning.index - 1);
  return {
    ...major, daeunNumber, ageRule: MAJOR_LUCK_AGE_RULE, asOfDate: today,
    cycles: cycles.map((c) => ({ ...c, isCurrent: c === current })),
    currentCycle: current && { ...current, isCurrent: true },
    ...(turning ? { transition: { date: turning.startDate, from: before?.label || "대운 시작 전", to: turning.label, status: turning.startDate <= today ? "passed" : "upcoming" } } : {}),
  } as T;
}
