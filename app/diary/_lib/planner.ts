import type { DiaryExtDay, DiaryExtStore, DiaryScheduleItem, DiaryScheduleOverride, DiaryTodoItem } from "./ext-snapshot";
import { parseYmd, shiftYmd, weekdayIndex } from "./kst-date";

export interface ScheduleOccurrence extends DiaryScheduleItem {
  key: string;
  sourceYmd: string;
  occurrenceDate: string;
  date: string;
}
export interface PlannedTodo extends DiaryTodoItem { sourceYmd: string; date: string }

export function isScheduleDate(item: DiaryScheduleItem, start: string, date: string): boolean {
  if (!parseYmd(start) || !parseYmd(date) || date < start) return false;
  const repeat = item.repeat;
  if (!repeat) return date === start;
  if (repeat.until && date > repeat.until) return false;
  if (repeat.frequency === "daily") return true;
  if (repeat.frequency === "weekly") return (repeat.weekdays?.length ? repeat.weekdays : [weekdayIndex(start)]).includes(weekdayIndex(date));
  return repeat.frequency === "monthly" && date.slice(8) === start.slice(8);
}

/** Expand only the requested range. Moved exceptions are also found outside their original range. */
export function resolveSchedules(ext: DiaryExtStore, from: string, to = from): ScheduleOccurrence[] {
  if (!parseYmd(from) || !parseYmd(to) || to < from) return [];
  const result: ScheduleOccurrence[] = [];
  for (const [sourceYmd, day] of Object.entries(ext)) {
    for (const [index, item] of (Array.isArray(day?.schedules) ? day.schedules : []).entries()) {
      if (!item?.text) continue;
      const start = item.date || sourceYmd;
      if (!parseYmd(start)) continue;
      const dates = new Set<string>();
      if (item.repeat) {
        for (let date = from > start ? from : start; parseYmd(date) && date <= to && (!item.repeat.until || date <= item.repeat.until); date = shiftYmd(date, 1)) {
          if (isScheduleDate(item, start, date)) dates.add(date);
        }
        for (const date of Object.keys(item.exceptions || {})) {
          if (isScheduleDate(item, start, date)) dates.add(date);
        }
      } else dates.add(start);
      for (const occurrenceDate of dates) {
        const exception = item.repeat ? item.exceptions?.[occurrenceDate] : undefined;
        if (exception === null) continue;
        const occurrence = { ...item, ...exception };
        const date = exception?.date || occurrenceDate;
        if (!parseYmd(date) || date < from || date > to) continue;
        result.push({ ...occurrence, date, sourceYmd, occurrenceDate, key: `${sourceYmd}:${item.id || index}:${occurrenceDate}` });
      }
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) || Number(!!b.allDay) - Number(!!a.allDay)
    || (a.at || "99:99").localeCompare(b.at || "99:99") || (a.createdAt || 0) - (b.createdAt || 0));
}

export function resolveTodos(ext: DiaryExtStore, date: string): PlannedTodo[] {
  return Object.entries(ext).flatMap(([sourceYmd, day]) => (Array.isArray(day?.todos) ? day.todos : [])
    .filter(item => item?.text && (item.date || sourceYmd) === date)
    .map(item => ({ ...item, sourceYmd, date })))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

/** An effective day for achievement counts and day-level readers; storage stays at its original anchor. */
export function plannedDay(ext: DiaryExtStore, date: string): DiaryExtDay {
  return { ...ext[date], schedules: resolveSchedules(ext, date), todos: resolveTodos(ext, date) };
}

/** Search indexes stored series and edited occurrences, never infinitely materializes recurring days. */
export function plannerRecordDays(ext: DiaryExtStore): DiaryExtStore {
  const days: DiaryExtStore = Object.fromEntries(Object.entries(ext).map(([date, day]) => [date, { ...day, schedules:[], todos:[] }]));
  const dayAt = (date: string) => days[date] || (days[date] = { schedules:[], todos:[] });
  for (const [sourceYmd, day] of Object.entries(ext)) {
    for (const item of day?.schedules || []) {
      const start = item.date || sourceYmd;
      if (!item.text || !parseYmd(start)) continue;
      let representative = start;
      if (item.repeat) {
        // A finite exception list can skip at most this many monthly occurrences.
        const limit = 62 * (Object.keys(item.exceptions || {}).length + 1);
        let found = false;
        for (let index = 0, date = start; index < limit && parseYmd(date) && (!item.repeat.until || date <= item.repeat.until); index++, date = shiftYmd(date, 1)) {
          if (isScheduleDate(item, start, date) && item.exceptions?.[date] !== null) { representative = date; found = true; break; }
        }
        if (!found) continue;
      }
      const override = item.repeat ? item.exceptions?.[representative] : undefined;
      const displayed = override?.date || representative;
      if (parseYmd(displayed)) dayAt(displayed).schedules!.push({ ...item, ...override, date:displayed });
      for (const [date, edited] of Object.entries(item.exceptions || {})) {
        if (!item.repeat || !edited || date === representative || !isScheduleDate(item, start, date)) continue;
        const changedDate = edited.date || date;
        if (parseYmd(changedDate)) dayAt(changedDate).schedules!.push({ ...item, ...edited, date:changedDate });
      }
    }
    for (const item of day?.todos || []) {
      const date = item.date || sourceYmd;
      if (item.text && parseYmd(date)) dayAt(date).todos!.push(item);
    }
  }
  return days;
}

export function scheduleTimeLabel(item: DiaryScheduleItem): string {
  return item.allDay ? "종일" : item.at ? item.at + (item.endAt ? `–${item.endAt}` : "") : "시간 미정";
}

export function scheduleError(item: DiaryScheduleItem, date: string): string {
  if (!item.text?.trim()) return "일정 제목을 입력해 주세요.";
  if (!parseYmd(date)) return "일정 날짜를 확인해 주세요.";
  const validTime = (at: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(at);
  if (!item.allDay && ((item.at && !validTime(item.at)) || (item.endAt && !validTime(item.endAt)))) return "시간을 확인해 주세요.";
  if (!item.allDay && item.endAt && (!item.at || item.endAt <= item.at)) return "종료 시각은 시작 시각보다 뒤로 정해 주세요.";
  if (item.repeat?.until && (!parseYmd(item.repeat.until) || item.repeat.until < date)) return "반복 종료일은 시작 날짜 이후로 정해 주세요.";
  if (item.repeat?.frequency === "weekly" && !item.repeat.weekdays?.length) return "반복할 요일을 하나 이상 골라 주세요.";
  return "";
}

export function editSchedule(day: DiaryExtDay, id: string, patch: DiaryScheduleOverride & Pick<DiaryScheduleItem, "repeat">, occurrenceDate?: string): void {
  day.schedules = (day.schedules || []).map(item => {
    if (item.id !== id) return item;
    if (occurrenceDate && item.repeat) {
      const override = { ...patch };
      delete override.repeat;
      return { ...item, exceptions: { ...item.exceptions, [occurrenceDate]: override } };
    }
    return { ...item, ...patch, exceptions: patch.repeat ? item.exceptions : undefined };
  });
}

export function deleteSchedule(day: DiaryExtDay, id: string, occurrenceDate?: string): void {
  day.schedules = (day.schedules || []).flatMap(item => item.id !== id ? [item]
    : occurrenceDate && item.repeat ? [{ ...item, exceptions: { ...item.exceptions, [occurrenceDate]: null } }] : []);
}
