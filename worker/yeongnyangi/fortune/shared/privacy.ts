import { SAJU_TEMPERAMENT_VERSION, sajuTemperamentPromptLines } from '../../../lib/saju-temperament.js';

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
  // Keep the full profile in calculated facts, but send the same compact reading lens
  // used by other consultations. Both ask evidence and chapter facts pass here, so
  // matching values can still be referenced once instead of being sent twice.
  if ('version' in value && value.version === SAJU_TEMPERAMENT_VERSION &&
      'tenGods' in value && Array.isArray(value.tenGods) && 'families' in value && Array.isArray(value.families))
    return { version: value.version, lines: sajuTemperamentPromptLines(value) };
  if ('schema' in value && value.schema === 'engine-facts-v1') {
    const pin = value as Record<string, unknown>;
    return { schema: pin.schema, system: pin.system, engineVersion: pin.engineVersion,
      interpretationVersion: pin.interpretationVersion, support: pin.support, digest: pin.digest };
  }
  const rawMoment = "solarYear" in value || "birthTimeContext" in value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          !forbidden.test(key) && !['residence','originalCalendar','original','civil','instant','termClock','corrected','dayPillarCivilDate'].includes(key) &&
          !(rawMoment && ["hour", "minute", "longitude"].includes(key)),
      )
      .map(([key, v]) => [key, explanationFacts(v)]),
  );
}
