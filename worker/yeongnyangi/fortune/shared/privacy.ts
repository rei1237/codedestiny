// Metadata and raw dates/coordinates never cross the explanation-provider boundary.
const forbidden =
  /^(birth.*|solarDate.*|solarYear|solarMonth|solarDay|inputDate|correctedTime|latitude|lat|lon|location|place|timezone.*|lunar.*|calculatedAt|utc.*|julianDate|userId|profileId|summaryForPrompt|promptConfig|byName)$/i;
export function explanationFacts(value: unknown): unknown {
  if (Array.isArray(value))
    return value
      .filter(
        (v) =>
          !v ||
          typeof v !== "object" ||
          !("label" in v) ||
          !forbidden.test(String(v.label)),
      )
      .map(explanationFacts);
  if (!value || typeof value !== "object") return value;
  const rawMoment = "solarYear" in value || "birthTimeContext" in value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          !forbidden.test(key) && !['residence','originalCalendar'].includes(key) &&
          !(rawMoment && ["hour", "minute", "longitude"].includes(key)),
      )
      .map(([key, v]) => [key, explanationFacts(v)]),
  );
}
