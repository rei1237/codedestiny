// 인생 보정 P2 입력 화면의 클라이언트 상태·검증(순수 함수). 서버 정본 검증은 life-events.mjs 이고,
// 여기서는 같은 규칙을 저장 전에 미리 보여 준다. 메모 원문은 어떤 함수도 기록하거나 오류 문자열에 넣지 않는다.
import { LIFE_EVENT_DOMAINS, LIFE_EVENT_POLICY } from './life-events.mjs';
import { NOTE_SENSITIVE_KEYWORDS } from './note-sensitive-keywords.mjs';

/** 화면에서 고르는 결과. 평범·불확실·건너뜀은 그래프에 찍지 않는다. */
export const INPUT_OUTCOMES = Object.freeze(['good', 'bad', 'mixed']);
export const INPUT_DOMAINS = LIFE_EVENT_DOMAINS;
export const INPUT_POLICY = LIFE_EVENT_POLICY;
export const LEGACY_CALIBRATION_PREFIX = 'codeDestiny:sajuCalibration:';
export const LEGACY_OFFER_PREFIX = 'codeDestiny:lifeCalibration:legacyOffered:';
export const SELF_HINT_PREFIX = 'codeDestiny:lifeCalibration:self:';

/** @typedef {{ birthYear?: number, nowYear?: number, others?: any[] }} LifeInputOptions */

let seq = 0;
const nextId = () => `e${Date.now().toString(36)}${(seq += 1).toString(36)}`;
const isInt = (v) => Number.isInteger(v);

/** KST 기준 올해. 서버 kstYear() 와 같은 기준이다. */
export function kstYearNow(now = Date.now()) {
  return new Date(now + 9 * 3600 * 1000).getUTCFullYear();
}

/** 그래프 가로축 연도(태어난 해부터 올해까지). 출생 연도를 모르면 최근 30년. */
export function yearRange(birthYear, nowYear = kstYearNow()) {
  const end = isInt(nowYear) ? nowYear : kstYearNow();
  const start = isInt(birthYear) && birthYear >= 1900 && birthYear <= end ? birthYear : end - 29;
  const out = [];
  for (let y = start; y <= end; y += 1) out.push(y);
  return out;
}

export function createEntry(year, patch = {}) {
  return { id: nextId(), year, month: null, domain: null, outcome: 'good', intensity: 2, certainty: 'sure', note: '', channel: 'profile_form', ...patch };
}

export function fromApiEvents(events) {
  if (!Array.isArray(events)) return [];
  return events.filter((e) => e && isInt(e.year) && INPUT_OUTCOMES.includes(e.outcome)).map((e) => createEntry(e.year, {
    month: isInt(e.month) ? e.month : null,
    domain: INPUT_DOMAINS.includes(e.domain) ? e.domain : null,
    outcome: e.outcome,
    intensity: [1, 2, 3].includes(e.intensity) ? e.intensity : 2,
    certainty: e.certainty === 'unsure' ? 'unsure' : 'sure',
    note: typeof e.note === 'string' ? e.note : '',
    noteUnavailable: e.noteUnavailable === true,
    channel: typeof e.channel === 'string' ? e.channel : 'profile_form',
  }));
}

/** PUT /api/life-calibration/events 본문. 서버 normalizeLifeEvents 가 받는 키만 보낸다. */
export function toApiEvents(entries) {
  return sortEntries(entries).map((e) => ({
    year: e.year,
    month: isInt(e.month) ? e.month : null,
    domain: e.domain || null,
    outcome: e.outcome,
    intensity: e.intensity,
    certainty: e.certainty === 'unsure' ? 'unsure' : 'sure',
    source: 'volunteered',
    channel: e.channel === 'legacy_local' ? 'legacy_local' : 'profile_form',
    note: String(e.note || '').trim(),
  }));
}

/** @param {any[]} entries @returns {any[]} */
export function sortEntries(entries) {
  return [...(entries || [])].sort((a, b) => a.year - b.year || (a.month || 0) - (b.month || 0) || String(a.domain || '').localeCompare(String(b.domain || '')));
}

/** @param {any[]} entries @param {any} entry @returns {any[]} */
export function upsertEntry(entries, entry) {
  const list = entries || [];
  return list.some((e) => e.id === entry.id) ? list.map((e) => (e.id === entry.id ? { ...entry } : e)) : [...list, { ...entry }];
}

/** @param {any[]} entries @param {string} id @returns {any[]} */
export function removeEntry(entries, id) {
  return (entries || []).filter((e) => e.id !== id);
}

export function canAddEntry(entries) {
  return (entries || []).length < INPUT_POLICY.maxEntries;
}

/**
 * 한 건 검증. 오류 코드만 돌려준다(메모 원문은 넣지 않는다).
 * @param {any} entry
 * @param {LifeInputOptions} [options]
 * @returns {string[]}
 */
export function validateEntry(entry, { birthYear, nowYear = kstYearNow(), others = [] } = {}) {
  const errors = [];
  const min = isInt(birthYear) && birthYear >= 1900 ? birthYear : 1900;
  if (!isInt(entry?.year) || entry.year < min || entry.year > nowYear) errors.push('year_range');
  if (entry?.month != null && (!isInt(entry.month) || entry.month < 1 || entry.month > 12)) errors.push('month_range');
  if (!INPUT_OUTCOMES.includes(entry?.outcome)) errors.push('outcome_required');
  if (!entry?.domain) errors.push('domain_required');
  else if (!INPUT_DOMAINS.includes(entry.domain)) errors.push('domain_invalid');
  if (![1, 2, 3].includes(entry?.intensity)) errors.push('intensity_range');
  if (String(entry?.note || '').length > INPUT_POLICY.noteMax) errors.push('note_long');
  const key = `${entry?.year}:${entry?.month ?? ''}:${entry?.domain ?? ''}`;
  if (others.some((o) => o.id !== entry?.id && `${o.year}:${o.month ?? ''}:${o.domain ?? ''}` === key)) errors.push('duplicate');
  return errors;
}

/**
 * 전체 검증. 저장 단추는 ok 일 때만 서버로 보낸다.
 * @param {any[]} entries
 * @param {LifeInputOptions} [options]
 * @returns {{ ok: boolean, tooMany: boolean, byId: Record<string, string[]> }}
 */
export function validateEntries(entries, { birthYear, nowYear = kstYearNow() } = {}) {
  const list = entries || [];
  const byId = {};
  for (const e of list) {
    const errs = validateEntry(e, { birthYear, nowYear, others: list });
    if (errs.length) byId[e.id] = errs;
  }
  const tooMany = list.length > INPUT_POLICY.maxEntries;
  return { ok: !tooMany && Object.keys(byId).length === 0, tooMany, byId };
}

/** 메모에 민감할 수 있는 낱말이 있는지(대소문자 무시). 경고 창에만 쓴다. */
export function noteNeedsCaution(note, keywords = NOTE_SENSITIVE_KEYWORDS) {
  const text = String(note || '').toLowerCase();
  if (!text.trim()) return false;
  return keywords.some((k) => text.includes(String(k).toLowerCase()));
}

/**
 * 정적 셸 사주 보정 v2(localStorage `codeDestiny:sajuCalibration:<profileId>`, {v:2, periods}) 를 입력 초안으로 바꾼다.
 * 자동 업로드하지 않는다 — 화면이 초안으로 보여 주고 사용자가 확인한 뒤에만 저장한다.
 * 분야를 알 수 없으면 비워 두어(domain:null) 사용자가 고르게 한다. 건강 분야는 옮기지 않는다.
 * @param {any} payload
 * @param {LifeInputOptions} [options]
 */
export function legacyToEntries(payload, { birthYear, nowYear = kstYearNow() } = {}) {
  if (!payload || payload.v !== 2 || !Array.isArray(payload.periods)) return [];
  const out = [];
  const seen = new Set();
  for (const p of payload.periods) {
    if (!p || typeof p !== 'object') continue;
    let outcome = p.outcome;
    if (!outcome && (p.polarity === 'good' || p.polarity === 'bad')) outcome = p.polarity;
    if (!INPUT_OUTCOMES.includes(outcome)) continue;
    let year = Number.parseInt(p.year, 10);
    const age = Number.parseInt(p.age, 10);
    if (!isInt(year) && isInt(age) && isInt(birthYear)) year = birthYear + age - 1;
    if (!isInt(year) || year > nowYear || (isInt(birthYear) && year < birthYear) || year < 1900) continue;
    const area = p.domain || (p.area === 'love' ? 'relationship' : p.area);
    const domain = INPUT_DOMAINS.includes(area) ? area : null;
    const rawIntensity = Number.parseInt(p.intensity, 10);
    const intensity = [1, 2, 3].includes(rawIntensity) ? rawIntensity : 2;
    const key = `${year}::${domain ?? ''}`;
    if (domain && seen.has(key)) continue;
    seen.add(key);
    out.push(createEntry(year, { domain, outcome, intensity, note: String(p.note || '').replace(/\s+/g, ' ').trim().slice(0, INPUT_POLICY.noteMax), channel: 'legacy_local' }));
    if (out.length >= INPUT_POLICY.maxEntries) break;
  }
  return sortEntries(out);
}

function safeGet(storage, key) {
  try { return storage ? storage.getItem(key) : null; } catch { return null; }
}
function safeSet(storage, key, value) {
  try { if (storage) storage.setItem(key, value); } catch { /* 저장 공간이 막혀도 화면은 계속 동작한다 */ }
}

export function readLegacyCalibration(storage, profileId) {
  if (!profileId) return null;
  const raw = safeGet(storage, LEGACY_CALIBRATION_PREFIX + profileId);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && parsed.v === 2 && Array.isArray(parsed.periods) && parsed.periods.length ? parsed : null;
  } catch { return null; }
}

/** 옛 입력 불러오기 제안은 프로필마다 한 번만 띄운다(불러오든 넘기든). */
export function legacyOfferDone(storage, profileId) {
  return safeGet(storage, LEGACY_OFFER_PREFIX + profileId) === '1';
}
export function markLegacyOfferDone(storage, profileId) {
  safeSet(storage, LEGACY_OFFER_PREFIX + profileId, '1');
}

export function readSelfHint(storage, accountId) {
  const v = accountId ? safeGet(storage, SELF_HINT_PREFIX + accountId) : null;
  return v && v.length <= 80 ? v : '';
}
export function writeSelfHint(storage, accountId, profileId) {
  if (accountId && profileId) safeSet(storage, SELF_HINT_PREFIX + accountId, String(profileId));
}

/**
 * "당신의 패턴" 한 줄(템플릿, LLM 없음). 좋았던/힘들었던 해에 가장 자주 나온 분야를 고른다.
 * 돌려주는 값은 문구 키와 분야뿐이다.
 */
export function patternSummary(entries) {
  const list = (entries || []).filter((e) => e.domain);
  if (list.length < 2) return { kind: 'none' };
  const top = (outcome) => {
    const counts = {};
    for (const e of list) if (e.outcome === outcome || e.outcome === 'mixed') counts[e.domain] = (counts[e.domain] || 0) + 1;
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return ranked.length && ranked[0][1] >= 2 ? ranked[0][0] : null;
  };
  const good = top('good');
  const bad = top('bad');
  if (good && bad && good === bad) return { kind: 'both', domain: good };
  if (good) return { kind: 'good', domain: good };
  if (bad) return { kind: 'bad', domain: bad };
  return { kind: 'spread' };
}
