// 인생 보정 입력(life_events) 정본 검증. 설계: docs/context/life-calibration.md
// 사주 경험 보정 v1(lib/saju/experience-calibration.mjs)의 분류·강도·확신을 그대로 쓰고,
// 분야만 forward-add 한다. v1 의 EXPERIENCE_DOMAINS 는 영냥이 주문 키 검증에도 쓰이므로 건드리지 않는다.
// 건강 분야는 만들지 않는다.
import {
  EXPERIENCE_CERTAINTY,
  EXPERIENCE_DOMAINS,
  EXPERIENCE_OUTCOMES,
  EXPERIENCE_SOURCES,
} from '../saju/experience-calibration.mjs';

export const LIFE_EVENT_SCHEMA_VERSION = 1;
export const LIFE_EVENT_DOMAINS = Object.freeze([...EXPERIENCE_DOMAINS, 'family', 'relocation', 'social', 'other']);
// 입력 경로. v1 의 source(volunteered·prompted)는 "자발 입력/질문 응답" 구분이라 별도 필드로 유지한다.
export const LIFE_EVENT_CHANNELS = Object.freeze(['profile_form', 'diary', 'monthly_checkin', 'legacy_local']);
export const LIFE_EVENT_POLICY = Object.freeze({ maxEntries: 12, noteMax: 80 });
// 선택 동의 문구 버전. 문구 원문은 docs/security/life-calibration-legal-draft-2026-11-28.md (게시 전 검토).
export const LIFE_CALIBRATION_CONSENT_VERSION = 'life-calibration-consent-2026-11-28';

export class LifeEventInputError extends Error {
  constructor(message) { super(message); this.name = 'LifeEventInputError'; this.code = 'INVALID_LIFE_EVENT'; }
}

const isInt = (v) => Number.isInteger(v);
const cleanNote = (v, max) => String(v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * 엄격 파서. 형식이 틀리면 LifeEventInputError 를 던진다(오류 메시지에 메모 원문을 넣지 않는다).
 * 모르는 키는 버린다. 같은 (연, 월, 분야)는 한 건만 허용한다 — 화면이 병합해서 보낸다.
 */
export function normalizeLifeEvents(raw, { minYear = 1900, maxYear = new Date().getFullYear(), policy = LIFE_EVENT_POLICY } = {}) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new LifeEventInputError('events must be an array');
  if (raw.length > policy.maxEntries) throw new LifeEventInputError(`at most ${policy.maxEntries} events`);
  const seen = new Set();
  const events = raw.map((e, i) => {
    if (!e || typeof e !== 'object' || Array.isArray(e)) throw new LifeEventInputError(`event ${i} must be an object`);
    const { year, month = null, domain = null, outcome, intensity = 2, certainty = 'sure', source = 'volunteered', channel = 'profile_form', note = '' } = e;
    if (!isInt(year) || year < minYear || year > maxYear) throw new LifeEventInputError(`event ${i}: year out of range`);
    if (month !== null && (!isInt(month) || month < 1 || month > 12)) throw new LifeEventInputError(`event ${i}: month`);
    if (!EXPERIENCE_OUTCOMES.includes(outcome) || outcome === 'skip') throw new LifeEventInputError(`event ${i}: outcome`);
    if (domain !== null && !LIFE_EVENT_DOMAINS.includes(domain)) throw new LifeEventInputError(`event ${i}: domain`);
    if (domain === null && ['good', 'bad', 'mixed'].includes(outcome)) throw new LifeEventInputError(`event ${i}: domain required`);
    if (!isInt(intensity) || intensity < 1 || intensity > 3) throw new LifeEventInputError(`event ${i}: intensity`);
    if (!EXPERIENCE_CERTAINTY.includes(certainty)) throw new LifeEventInputError(`event ${i}: certainty`);
    if (!EXPERIENCE_SOURCES.includes(source)) throw new LifeEventInputError(`event ${i}: source`);
    if (!LIFE_EVENT_CHANNELS.includes(channel)) throw new LifeEventInputError(`event ${i}: channel`);
    if (typeof note !== 'string') throw new LifeEventInputError(`event ${i}: note`);
    const key = `${year}:${month ?? ''}:${domain ?? ''}`;
    if (seen.has(key)) throw new LifeEventInputError(`event ${i}: duplicate year/month/domain`);
    seen.add(key);
    return { year, month, domain, outcome, intensity, certainty, source, channel, note: cleanNote(note, policy.noteMax) };
  });
  return events.sort((a, b) => a.year - b.year || (a.month || 0) - (b.month || 0) || String(a.domain).localeCompare(String(b.domain)));
}
