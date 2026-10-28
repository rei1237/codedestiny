// The model reads the computed chart, not the birth clock or place. Raw vedic, ziwei and
// partner payloads carried the date, time and coordinates into the prompt JSON (B7 2026-10-11).
// Mirrors stripSajuPromptBirth: drop birth keys at any depth, keep only non-clock calculationMeta.
const PROMPT_CALCULATION_META_KEYS = Object.freeze(["engineVersion", "policyVersion", "timeUnknown", "termTimeAssumed", "nightZiPolicy", "dayBoundaryRule"]);
const PROMPT_BIRTH_KEYS = new Set([
  "birth", "birthCivilYear", "birthDate", "birthTime", "birthPlace", "_astroBirth",
  // ziwei chartResult.user and the vedic partner copy
  "birthYear", "birthMonth", "birthDay", "birthHour", "birthMinute", "partnerBirth",
]);

export function stripPromptBirth(value) {
  if (Array.isArray(value)) return value.map(stripPromptBirth);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !PROMPT_BIRTH_KEYS.has(key))
    .map(([key, item]) => [key, key === "calculationMeta" && item && typeof item === "object"
      ? Object.fromEntries(PROMPT_CALCULATION_META_KEYS.filter((field) => field in item).map((field) => [field, item[field]]))
      : stripPromptBirth(item)]));
}
