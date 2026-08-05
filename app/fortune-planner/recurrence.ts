export type RepeatScope = "one" | "following" | "all";

export type RecurringEvent = {
  id: string;
  seriesId?: string;
  date: string;
  repeat: "none" | "daily" | "weekdays" | "weekly" | "biweekly" | "monthly" | "yearly";
  repeatUntil?: string;
  excludedDates?: string[];
  overrides?: Record<string, Record<string, unknown>>;
};

/** Pure, timezone-neutral recurrence helpers for the local planner store. */
export function appliesOn(event: RecurringEvent, date: string) {
  if (event.excludedDates?.includes(date)) return false;
  if (event.date === date) return true;
  if (event.repeat === "none" || date < event.date || (event.repeatUntil && date > event.repeatUntil)) return false;
  const start = new Date(`${event.date}T12:00:00`);
  const target = new Date(`${date}T12:00:00`);
  const days = Math.round((target.getTime() - start.getTime()) / 86400000);
  if (event.repeat === "daily") return true;
  if (event.repeat === "weekdays") return target.getDay() > 0 && target.getDay() < 6;
  if (event.repeat === "weekly") return days % 7 === 0;
  if (event.repeat === "biweekly") return days % 14 === 0;
  if (event.repeat === "monthly") return start.getDate() === target.getDate();
  return event.repeat === "yearly" && start.getMonth() === target.getMonth() && start.getDate() === target.getDate();
}

export function applyOccurrencePatch<T extends RecurringEvent>(event: T, date: string, patch: Partial<T>, scope: RepeatScope): T[] {
  if (scope === "all" || event.repeat === "none") return [{ ...event, ...patch }];
  if (scope === "one") {
    const excludedDates = Array.from(new Set([...(event.excludedDates || []), date]));
    return [
      { ...event, excludedDates },
      {
        ...event,
        ...patch,
        id: crypto.randomUUID(),
        date,
        repeat: "none",
        repeatUntil: undefined,
        excludedDates: [],
        overrides: {},
      },
    ] as T[];
  }
  return [
    { ...event, repeatUntil: previousDate(date) },
    { ...event, ...patch, id: crypto.randomUUID(), seriesId: event.seriesId || event.id, date },
  ];
}

export function deleteOccurrence<T extends RecurringEvent>(event: T, date: string, scope: RepeatScope): T[] {
  if (scope === "all") return [];
  if (scope === "following") return [{ ...event, repeatUntil: previousDate(date) }];
  return [{ ...event, excludedDates: [...new Set([...(event.excludedDates || []), date])] }];
}

function previousDate(date: string) {
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() - 1);
  return result.toISOString().slice(0, 10);
}
