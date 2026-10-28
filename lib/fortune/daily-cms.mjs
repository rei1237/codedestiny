import { DAILY_PROSE_POOLS } from "./daily-prose.mjs";

export function dailyProseDefaults() {
  return Object.fromEntries(Object.entries(DAILY_PROSE_POOLS).map(([key, pool]) => [key,
    Object.fromEntries(pool.map((row, index) => [String(index), { text: row.kr }]))]));
}

// Replace known Korean prose only, after date/sign selection. Numbers, calendar,
// lucky values, ordering and other languages remain byte-for-byte equivalent.
export function applyDailyProse(payload, entries) {
  const replacements = new Map();
  for (const [key, pool] of Object.entries(DAILY_PROSE_POOLS)) {
    pool.forEach((row, index) => {
      const text = entries?.[key]?.record?.[String(index)]?.text;
      if (typeof text === "string" && text.trim()) replacements.set(row.kr, text);
    });
  }
  function visit(value) {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).map(([key, child]) =>
      [key, key === "kr" && typeof child === "string" && replacements.has(child) ? replacements.get(child) : visit(child)]));
  }
  return replacements.size ? visit(payload) : payload;
}
