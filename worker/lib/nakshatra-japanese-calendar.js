// Nakshatra-only Japanese modern lunisolar convention. Not the Korean calendar.
// Sources and explicit intercalation convention: docs/design/nakshatra-renewal.md.
import { SearchMoonPhase, SearchSunLongitude, Seasons } from "astronomy-engine";
import { SUKUYO_MANSIONS } from "./sukuyo-premium.js";

const DAY = 86400000;
const JST = 9 * 3600000;
export const JAPANESE_SUKUYO_VERSION = "jp-lunisolar-jst-v1";
export const MONTH_START_MANSIONS = Object.freeze([11, 13, 15, 17, 19, 21, 24, 0, 2, 4, 7, 9]);
const cycles = new Map();
const civilDay = date => Math.floor((date.getTime() + JST) / DAY);
const dayStart = day => new Date(day * DAY - JST);

function winterMonth(year) {
  const solstice = Seasons(year).dec_solstice.date;
  const target = civilDay(solstice);
  let moon = SearchMoonPhase(0, new Date(solstice.getTime() - 40 * DAY), 40);
  if (!moon) throw new RangeError("New moon unavailable");
  let previous = civilDay(moon.date);
  for (let i = 0; i < 3; i++) {
    moon = SearchMoonPhase(0, new Date(moon.date.getTime() + DAY), 35);
    if (!moon) throw new RangeError("New moon unavailable");
    const next = civilDay(moon.date);
    if (next > target) return previous;
    previous = next;
  }
  throw new RangeError("Winter month unavailable");
}

function winterCycle(year) {
  if (cycles.has(year)) return cycles.get(year);
  const start = winterMonth(year);
  const end = winterMonth(year + 1);
  const starts = [start];
  let cursor = dayStart(start + 1);
  for (let i = 0; i < 14; i++) {
    const moon = SearchMoonPhase(0, cursor, 35);
    if (!moon) throw new RangeError("New moon unavailable");
    const next = civilDay(moon.date);
    if (next >= end) break;
    starts.push(next);
    cursor = new Date(moon.date.getTime() + DAY);
  }
  starts.push(end);
  const count = starts.length - 1;
  if (count !== 12 && count !== 13) throw new RangeError("Invalid lunisolar cycle");
  // Principal terms belong to their JST civil day, including a term on a new-moon day.
  const terms = [];
  for (let longitude = 0; longitude < 360; longitude += 30) {
    const term = SearchSunLongitude(longitude, dayStart(start), end - start + 2);
    if (term) {
      terms.push(civilDay(term.date));
      const next = SearchSunLongitude(longitude, new Date(term.date.getTime() + DAY), end - civilDay(term.date));
      if (next && civilDay(next.date) < end) terms.push(civilDay(next.date));
    }
  }
  let leapAt = -1;
  if (count === 13) {
    leapAt = starts.findIndex((value, i) => i > 0 && i < count
      && !terms.some(term => term >= value && term < starts[i + 1]));
    if (leapAt < 0) throw new RangeError("Intercalary month unavailable");
  }
  let month = 11;
  const rows = starts.slice(0, -1).map((value, i) => {
    if (i > 0 && i !== leapAt) month = month % 12 + 1;
    return { start: value, end: starts[i + 1], month, isLeap: i === leapAt };
  });
  if (cycles.size >= 16) cycles.delete(cycles.keys().next().value);
  cycles.set(year, rows);
  return rows;
}

export function japaneseLunarFromDate(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new RangeError("Invalid birth date");
  const jst = new Date(date.getTime() + JST);
  const year = jst.getUTCFullYear();
  if (year < 1899 || year > 2101) throw new RangeError("Supported birth years: 1900–2100");
  const day = civilDay(date);
  const cycleYear = day < winterMonth(year) ? year - 1 : year;
  const row = winterCycle(cycleYear).find(item => day >= item.start && day < item.end);
  if (!row) throw new RangeError("Lunisolar date unavailable");
  return { month: row.month, day: day - row.start + 1, isLeap: row.isLeap,
    calendar: JAPANESE_SUKUYO_VERSION, timezone: "Asia/Tokyo",
    convention: "JST 삭일·동지월 11월·13개월이면 첫 무중기월을 윤달로, 윤달은 본월과 같은 숙 기점" };
}

export function japaneseSukuyoFromLunar(lunar) {
  if (!Number.isInteger(lunar?.month) || lunar.month < 1 || lunar.month > 12
    || !Number.isInteger(lunar?.day) || lunar.day < 1 || lunar.day > 30) throw new RangeError("Invalid lunar date");
  const index = (MONTH_START_MANSIONS[lunar.month - 1] + lunar.day - 1) % 27;
  const item = SUKUYO_MANSIONS[index];
  return { ...item, index, mansionIdx: index, name: item.nameKo, mansionCh: item.nameHan,
    mansion: item.nameKo + "(" + item.nameHan + ")", lunarMonth: lunar.month, lunarDay: lunar.day,
    isLeapMonth: Boolean(lunar.isLeap), calculationBasis: JAPANESE_SUKUYO_VERSION, lunar };
}

export function japaneseSukuyoFromDate(date) {
  return japaneseSukuyoFromLunar(japaneseLunarFromDate(date));
}
