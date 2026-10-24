export type BirthTimeParts = { hour: string; minute: string; period: "am" | "pm" };
export function splitBirthTime(value: string): BirthTimeParts {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return { hour: "", minute: "00", period: "am" };
  const hour = Number(match[1]);
  return { hour: String(hour % 12 || 12), minute: match[2], period: hour >= 12 ? "pm" : "am" };
}
export function joinBirthTime({ hour, minute, period }: BirthTimeParts): string {
  if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute)) return "";
  const h = Number(hour), m = Number(minute);
  if (h < 1 || h > 12 || m < 0 || m > 59) return "";
  return String(h % 12 + (period === "pm" ? 12 : 0)).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}
