import { calculateZiweiAiChart } from "./ziwei-ai-chart.js";

// CR-005: trusted per-execution option only; no env/body/storage toggle.
export const DEFAULT_ZIWEI_EXECUTION_OPTIONS = Object.freeze({ calendarAuthorityV2: false });
const EXPANDED_VERSION = "kasi-jpl-expanded-20261101";
const CALENDAR_GAP = "CALENDAR_AUTHORITY_OUT_OF_RANGE";

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
  if (!existing && calendarAuthorityV2) {
    try {
      return calculateZiweiAiChart(input, { year, authorityFlags: { koreanCalendarAuthorityV2: true, authorityVersion: EXPANDED_VERSION } });
    } catch (error) {
      // 승인 음력 표는 1899-12~1913-03, 1999-12~2029-03 만 담는다. 그 밖의 날짜는 현재 표로 계산하고
      // chart.lunar.source 로 구분한다. 잘못된 입력 등 다른 오류는 그대로 올린다.
      if (error?.code !== CALENDAR_GAP && error?.message !== CALENDAR_GAP) throw error;
    }
  }
  return calculateZiweiAiChart(input, { year });
}
