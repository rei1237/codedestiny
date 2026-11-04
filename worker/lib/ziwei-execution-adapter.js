import { calculateZiweiAiChart } from "./ziwei-ai-chart.js";

// CR-005: trusted per-execution option only; no env/body/storage toggle.
export const DEFAULT_ZIWEI_EXECUTION_OPTIONS = Object.freeze({ calendarAuthorityV2: false });
const EXPANDED_VERSION = "kasi-jpl-expanded-20261101";

function snapshotError() {
  const error = new Error("CALCULATION_SNAPSHOT_REQUIRED");
  error.code = "CALCULATION_SNAPSHOT_REQUIRED";
  return error;
}

/** Saved snapshots are authoritative, even after rollout is switched OFF. */
export function readZiweiExecutionSnapshot(record) {
  const snapshot = record?.llmMeta?.chartSnapshot;
  if (snapshot != null) {
    if (typeof snapshot !== "object" || Array.isArray(snapshot) || !Array.isArray(snapshot.palaces)) throw snapshotError();
    return structuredClone(snapshot);
  }
  // Do not manufacture a new basis for already written chapters or a lost snapshot.
  if (record && (["partial", "delivery_pending", "completed"].includes(record.status)
    || Object.keys(record.llmMeta?.groups || {}).length
    || record.messages?.some(message => message.role === "assistant" && message.content)
    || record.ziweiChart?.palaces?.length)) throw snapshotError();
  return null;
}

/**
 * Full chart adapter for a new execution. Existing empty legacy executions may
 * finish their original legacy calculation; they never opt into the new version.
 * Caller must atomically persist the returned chart with the new execution.
 */
export function prepareZiweiExecutionChart(input, { existing = null, year, calendarAuthorityV2 = DEFAULT_ZIWEI_EXECUTION_OPTIONS.calendarAuthorityV2 } = {}) {
  const saved = readZiweiExecutionSnapshot(existing);
  if (saved) return saved;
  if (typeof calendarAuthorityV2 !== "boolean") throw new TypeError("INVALID_CALCULATION_SELECTION");
  const enabled = !existing && calendarAuthorityV2;
  if (enabled) {
    const birth = input?.birthInfo || input;
    const places = [birth?.birthPlace, input?.birthPlace].filter(value => value != null);
    const birthYear = Number(String(birth?.birthDate || "").slice(0, 4));
    if (birthYear < 2000 || birthYear > 2028 || !Number.isInteger(birthYear)
      || !["solar", "lunar"].includes(birth?.calendarType)
      || !["male", "female"].includes(birth?.gender)
      || birth.birthTimeUnknown || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birth?.birthTime || "")
      || places.some(place => typeof place !== "object" || place.timezone !== "Asia/Seoul" || place.longitude !== 126.978 || place.latitude !== 37.5665)
      || [birth, input, ...places].some(value => value && (value.timezoneOffset != null || value.timezoneOffsetMinutes != null
        || value.utcOffsetMinutes != null || value.standardMeridian != null
        || (value.longitude != null && value.longitude !== 126.978) || (value.latitude != null && value.latitude !== 37.5665)
        || (value.timezone != null && value.timezone !== "Asia/Seoul")))) {
      throw new RangeError("ZIWEI_EXECUTION_OUTSIDE_PILOT");
    }
  }
  // No catch/fallback: invalid dates and corrected-day coverage are checked by the public calculator.
  return calculateZiweiAiChart(input, {
    year,
    ...(enabled ? { authorityFlags: { koreanCalendarAuthorityV2: true, authorityVersion: EXPANDED_VERSION } } : {}),
  });
}
