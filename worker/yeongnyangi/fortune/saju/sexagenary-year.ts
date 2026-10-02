import { ganji } from "../../../../lib/korean-calendar/index.js";

export type KstWall = { year: number; month: number; day: number; hour: number; minute: number };

/** KST wall clock of an instant (solar terms are tabulated in KST). */
export function kstWall(at: Date): KstWall {
  const k = new Date(at.getTime() + 9 * 3600000);
  return { year: k.getUTCFullYear(), month: k.getUTCMonth() + 1, day: k.getUTCDate(), hour: k.getUTCHours(), minute: k.getUTCMinutes() };
}

/** The 세운 year in force at an instant. It turns at 입춘 (around 4 February), not on 1 January. */
export function sexagenaryYearAt(at: Date): number {
  const wall = kstWall(at);
  return ganji(wall)?.meta.sexagenaryYear ?? wall.year;
}

/** Same, for a consultation date (YYYY-MM-DD) read at KST noon. */
export const sexagenaryYearOfDate = (date: string) => sexagenaryYearAt(new Date(`${date}T12:00:00+09:00`));
