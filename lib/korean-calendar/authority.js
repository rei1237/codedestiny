/** Approved CR-001/002 lookup only. No runtime network, astronomy library, or persisted-result mutation. */
import { VERIFIED_AUTHORITY_VERSION, VERIFIED_AUTHORITY_FINGERPRINT, VERIFIED_TERM_YEARS, VERIFIED_NODE_TERMS, VERIFIED_LUNAR_MONTHS } from './authority-data.generated.js';

function authorityError(code) { const error = new RangeError(code); error.code = code; throw error; }

export function verifiedLunarMonthForSolar(year, month, day) {
  const timestamp = Date.UTC(year, month - 1, day), date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) authorityError('INVALID_BIRTH_DATE');
  const serial = timestamp / 86400000;
  const entry = VERIFIED_LUNAR_MONTHS.find(m => m.startDay <= serial && serial < m.startDay + m.length);
  if (!entry) authorityError('CALENDAR_AUTHORITY_OUT_OF_RANGE');
  return { ...entry };
}

export function verifiedLunarMonth(year, month, leap) {
  const entry = VERIFIED_LUNAR_MONTHS.find(m => m.lunarYear === year && m.monthNumber === month && m.isLeap === Boolean(leap));
  if (!entry) authorityError('CALENDAR_AUTHORITY_OUT_OF_RANGE');
  return { ...entry };
}

/**
 * Direct JPL sign brackets have finite precision. Never decide an instant within the unresolved 40 ms.
 * @returns {{previous:{year:number,index:number,utcMs:number,lowerUtcMs:number,upperUtcMs:number},next:{year:number,index:number,utcMs:number,lowerUtcMs:number,upperUtcMs:number},ipchun:{year:number,index:number,utcMs:number,lowerUtcMs:number,upperUtcMs:number}}}
 */
export function verifiedNodeTermWindow(instantUtcMs) {
  if (!Number.isFinite(instantUtcMs)) authorityError('INVALID_TERM_INSTANT');
  const year = new Date(instantUtcMs + 9 * 3600000).getUTCFullYear();
  if (!VERIFIED_TERM_YEARS.includes(year)) authorityError('TERM_AUTHORITY_OUT_OF_RANGE');
  if (VERIFIED_NODE_TERMS.some(t => instantUtcMs > t.lowerUtcMs && instantUtcMs < t.upperUtcMs)) authorityError('TERM_INSTANT_UNCERTAIN');
  const previous = VERIFIED_NODE_TERMS.findLast(t => t.upperUtcMs <= instantUtcMs);
  const next = VERIFIED_NODE_TERMS.find(t => t.lowerUtcMs >= instantUtcMs);
  const ipchun = VERIFIED_NODE_TERMS.find(t => t.year === year && t.index === 2);
  if (!previous || !next || !ipchun) authorityError('TERM_AUTHORITY_OUT_OF_RANGE');
  return { previous: { ...previous }, next: { ...next }, ipchun: { ...ipchun } };
}

export { VERIFIED_AUTHORITY_VERSION, VERIFIED_AUTHORITY_FINGERPRINT };
