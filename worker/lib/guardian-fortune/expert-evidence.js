import { lunarToSolar } from "../../../lib/korean-calendar/index.js";

// Explicit fields only: raw charts include private birth inputs and must not reach prompts.
export function pickExpertFields(source, fields) {
  return Object.fromEntries(fields.filter((key) => source?.[key] !== undefined && source[key] !== null)
    .map((key) => [key, source[key]]));
}

export function westernTransitAspects(natal, transit, date) {
  const angles = [[0, "conjunction"], [60, "sextile"], [90, "square"], [120, "trine"], [180, "opposition"]];
  const aspects = [];
  for (const [moving, point] of Object.entries(transit.planets || {})) {
    for (const [birth, target] of Object.entries(natal.planets || {})) {
      if (!Number.isFinite(point.longitude) || !Number.isFinite(target.longitude)) continue;
      const difference = Math.abs(((point.longitude - target.longitude) % 360 + 360) % 360);
      const distance = Math.min(difference, 360 - difference);
      for (const [angle, type] of angles) {
        const orb = Math.abs(distance - angle);
        if (orb <= 3) aspects.push({ moving, natal: birth, type, orb: Math.round(orb * 100) / 100 });
      }
    }
  }
  return { date, aspects: aspects.sort((a, b) => a.orb - b.orb).slice(0, 24) };
}

export function expertSolarBirthDate(input) {
  if (input.calendarType !== "lunar") return input.birthDate;
  const [year, month, day] = input.birthDate.split("-").map(Number);
  const solar = lunarToSolar(year, month, day, false);
  if (!solar) throw new Error("EXPERT_LUNAR_DATE_INVALID");
  return `${solar.year}-${String(solar.month).padStart(2, "0")}-${String(solar.day).padStart(2, "0")}`;
}
