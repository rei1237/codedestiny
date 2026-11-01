/** Approved CR-001/002 lookup only. No runtime network, astronomy library, or persisted-result mutation. */
import { VERIFIED_AUTHORITY_VERSION, VERIFIED_AUTHORITY_FINGERPRINT, VERIFIED_TERM_YEARS, VERIFIED_NODE_TERMS, VERIFIED_LUNAR_MONTHS } from './authority-data.generated.js';
import { EXPANDED_AUTHORITY_VERSION, EXPANDED_AUTHORITY_FINGERPRINT, EXPANDED_TERM_YEARS, EXPANDED_NODE_TERMS, EXPANDED_LUNAR_MONTHS } from './authority-expanded.generated.js';

function authorityError(code) { const error = new RangeError(code); error.code = code; throw error; }

function selectVerifiedAuthority(flags) {
  if (flags.authorityVersion === EXPANDED_AUTHORITY_VERSION) return { version: EXPANDED_AUTHORITY_VERSION, fingerprint: EXPANDED_AUTHORITY_FINGERPRINT, years: EXPANDED_TERM_YEARS, terms: EXPANDED_NODE_TERMS, months: EXPANDED_LUNAR_MONTHS };
  if (flags.authorityVersion !== undefined && flags.authorityVersion !== VERIFIED_AUTHORITY_VERSION) authorityError('INVALID_AUTHORITY_VERSION');
  return { version: VERIFIED_AUTHORITY_VERSION, fingerprint: VERIFIED_AUTHORITY_FINGERPRINT, years: VERIFIED_TERM_YEARS, terms: VERIFIED_NODE_TERMS, months: VERIFIED_LUNAR_MONTHS };
}

export function authorityMetadata(flags = {}) {
  const data = selectVerifiedAuthority(flags);
  return { version: data.version, fingerprint: data.fingerprint };
}

export function verifiedLunarMonthForSolar(year, month, day, flags = {}) {
  const timestamp = Date.UTC(year, month - 1, day), date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) authorityError('INVALID_BIRTH_DATE');
  const serial = timestamp / 86400000;
  const entry = selectVerifiedAuthority(flags).months.find(m => m.startDay <= serial && serial < m.startDay + m.length);
  if (!entry) authorityError('CALENDAR_AUTHORITY_OUT_OF_RANGE');
  return { ...entry };
}

export function verifiedLunarMonth(year, month, leap, flags = {}) {
  const entry = selectVerifiedAuthority(flags).months.find(m => m.lunarYear === year && m.monthNumber === month && m.isLeap === Boolean(leap));
  if (!entry) authorityError('CALENDAR_AUTHORITY_OUT_OF_RANGE');
  return { ...entry };
}

/**
 * Direct JPL sign brackets have finite precision. Never decide an instant within the unresolved 40 ms.
 * @returns {{previous:{year:number,index:number,utcMs:number,lowerUtcMs:number,upperUtcMs:number},next:{year:number,index:number,utcMs:number,lowerUtcMs:number,upperUtcMs:number},ipchun:{year:number,index:number,utcMs:number,lowerUtcMs:number,upperUtcMs:number}}}
 */
export function verifiedNodeTermWindow(instantUtcMs, flags = {}) {
  if (!Number.isFinite(instantUtcMs)) authorityError('INVALID_TERM_INSTANT');
  const data = selectVerifiedAuthority(flags);
  const year = new Date(instantUtcMs + 9 * 3600000).getUTCFullYear();
  if (!data.years.includes(year)) authorityError('TERM_AUTHORITY_OUT_OF_RANGE');
  if (data.terms.some(t => instantUtcMs > t.lowerUtcMs && instantUtcMs < t.upperUtcMs)) authorityError('TERM_INSTANT_UNCERTAIN');
  const previous = data.terms.findLast(t => t.upperUtcMs <= instantUtcMs);
  const next = data.terms.find(t => t.lowerUtcMs >= instantUtcMs);
  const ipchun = data.terms.find(t => t.year === year && t.index === 2);
  if (!previous || !next || !ipchun) authorityError('TERM_AUTHORITY_OUT_OF_RANGE');
  return { previous: { ...previous }, next: { ...next }, ipchun: { ...ipchun } };
}

export { VERIFIED_AUTHORITY_VERSION, VERIFIED_AUTHORITY_FINGERPRINT };
