// 인생 보정(Life Calibration) P3 집계 엔진. 설계: docs/context/life-calibration.md
// 순수·결정적 함수다. 시간·랜덤·DB·네트워크·LLM 을 쓰지 않는다. 엔진 계산은 바꾸지 않고,
// 엔진 래퍼(lib/life-calibration/*-signals.*, worker/lib/life-calibration-signals.js)가 낸 연도 신호와
// 사용자가 알려 준 과거 경험(life_events)의 일치·불일치만 센다. 사용자 문구는 만들지 않는다(P4·P5).
//
// 정책값은 사주 경험 보정 v1(CALIBRATION_POLICY)을 그대로 가져온다 — shrinkK 4, cap 0.15, minSignals 3, minYears 2.
// 마스터 프롬프트의 k=2·valence ±3 은 채택하지 않는다(2026-11-28 결정). 강도(intensity)로 가중하지 않는 것도 v1 과 같다.
import { CALIBRATION_POLICY } from '../saju/experience-calibration.mjs';
import { stableHash } from '../saju/natal-core/index.mjs';
import { LIFE_EVENT_DOMAINS } from './life-events.mjs';

export const LIFE_CALIBRATION_VERSION = 'life-calibration-v1';
export const LIFE_CALIBRATION_ENGINES = Object.freeze(['saju', 'ziwei', 'western', 'vedic', 'sukuyo']);
export const SIGNAL_TONES = Object.freeze(['favorable', 'unfavorable', 'neutral', 'ambiguous', 'unavailable']);

// 🔶 충돌 임계값 기본값(미확정): 같은 방향 3회 이상 + confidence 0.7. 조정은 이 상수에서만 한다.
export const LIFE_CALIBRATION_POLICY = Object.freeze({
  id: 'life-calibration-policy-v1',
  shrinkK: CALIBRATION_POLICY.shrinkK,
  cap: CALIBRATION_POLICY.cap,
  minSignals: CALIBRATION_POLICY.minSignals,
  minYears: CALIBRATION_POLICY.minYears,
  conflictMinSignals: 3,
  conflictConfidence: 0.7,
});

const SIGNAL = { good: 1, bad: -1 };
const round = (v) => Math.round(v * 10000) / 10000;

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

/** 래퍼가 쓸 수 없는 엔진을 알릴 때 쓰는 모양. reason 은 개발자용 코드 문자열이다(사용자 문구 아님). */
export function unavailableEngine(engine, version, reason) {
  return { engine, version, status: 'unavailable', reason, years: {}, months: {} };
}

// 정렬 키가 고정된 직렬화 — 객체 키 순서가 달라도 같은 해시가 나온다.
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value ?? null);
}

// 메모(noteCipher)·입력 경로(channel)는 보정에 쓰지 않으므로 해시에도 넣지 않는다.
const eventKeyMaterial = (events) => events.map((e) => [e.year, e.month ?? null, e.domain ?? null, e.outcome, e.intensity ?? 2, e.certainty ?? 'sure', e.source ?? 'volunteered']);

/**
 * LifeCalibration 캐시(worker/lib/life-calibration-models.js)의 inputHash. events + 엔진 래퍼 버전·신호 + 집계 버전·정책.
 * 이벤트 순서·객체 키 순서와 무관하다.
 */
export function lifeCalibrationInputHash(events, signals, policy = LIFE_CALIBRATION_POLICY) {
  const evs = eventKeyMaterial(events || []).map((row) => canonical(row)).sort();
  const sig = (signals || []).map((s) => canonical({ engine: s.engine, version: s.version, status: s.status, reason: s.reason ?? null, years: s.years || {}, months: s.months || {} })).sort();
  return `lc1-${stableHash([LIFE_CALIBRATION_VERSION, canonical(policy), evs.join('|'), sig.join('|')].join('#'))}`;
}

/** 이벤트 한 건이 이 엔진에서 받는 운 판단. 월이 있으면 월 신호를 먼저 본다. */
function lookupTone(signal, e) {
  const monthly = e.month != null ? signal.months?.[`${e.year}-${e.month}`] : undefined;
  const entry = monthly || signal.years?.[e.year];
  if (!entry || !SIGNAL_TONES.includes(entry.tone)) return { tone: 'unavailable', periodYear: e.year };
  return { tone: entry.tone, periodYear: Number.isInteger(entry.periodYear) ? entry.periodYear : e.year };
}

function factorOf(rows, policy) {
  const n = rows.length;
  const agree = rows.filter((r) => r.match === 'agree').length;
  const disagree = n - agree;
  const years = new Set(rows.map((r) => r.periodYear)).size;
  const direction = n === 0 ? 'none' : agree === disagree ? 'mixed' : agree > disagree ? 'agree' : 'disagree';
  // confidence = 같은 방향 신호의 비율(일관성). 정확도가 아니다.
  const confidence = n ? round(Math.max(agree, disagree) / n) : 0;
  const base = { n, agree, disagree, years, direction, confidence };
  const conflict = direction === 'disagree' && disagree >= policy.conflictMinSignals && confidence >= policy.conflictConfidence && years >= policy.minYears;
  if (n < policy.minSignals || years < policy.minYears) return { ...base, status: 'insufficient', factor: 0, conflictFlag: false };
  // v1 factorOf 와 같은 식: raw × n/(n+k), [-1,1] 로 자른 뒤 cap 을 곱한다.
  const raw = (agree - disagree) / n;
  const shrink = n / (n + policy.shrinkK);
  return { ...base, status: 'applied', raw: round(raw), shrink: round(shrink), factor: round(Math.max(-1, Math.min(1, raw * shrink)) * policy.cap), conflictFlag: conflict };
}

/**
 * 엔진별·분야별 일치/불일치 요약.
 * @param {{events: Array<object>, signals: Array<{engine:string, version:string, status:'available'|'unavailable', reason?:string,
 *   years?: Record<string,{tone:string, periodYear?:number}>, months?: Record<string,{tone:string, periodYear?:number}>}>, policy?: object}} input
 *   events 는 normalizeLifeEvents 를 거친 값이다. signals 는 엔진마다 한 개, 없는 엔진은 unavailable 로 채운다.
 */
export function computeLifeCalibration({ events = [], signals = [], policy = LIFE_CALIBRATION_POLICY } = {}) {
  const byEngine = new Map(signals.map((s) => [s.engine, s]));
  const list = [...events].sort((a, b) => a.year - b.year || (a.month || 0) - (b.month || 0) || String(a.domain).localeCompare(String(b.domain)));
  const engines = {};
  const engineVersions = {};
  for (const engine of LIFE_CALIBRATION_ENGINES) {
    const signal = byEngine.get(engine) || unavailableEngine(engine, 'none', 'no-adapter-input');
    engineVersions[engine] = signal.version;
    if (signal.status !== 'available') {
      engines[engine] = { status: 'unavailable', reason: signal.reason || 'unavailable', counts: { used: 0, unused: list.length }, overall: null, byDomain: {} };
      continue;
    }
    const used = [], unused = [];
    for (const e of list) {
      const base = { year: e.year, month: e.month ?? null, domain: e.domain ?? null, outcome: e.outcome };
      if (!SIGNAL[e.outcome]) { unused.push({ ...base, reason: e.outcome === 'mixed' ? 'mixed-signal' : `not-a-signal:${e.outcome}` }); continue; }
      if (e.certainty === 'unsure') { unused.push({ ...base, reason: 'uncertain-memory' }); continue; }
      const { tone, periodYear } = lookupTone(signal, e);
      if (tone === 'unavailable') { unused.push({ ...base, reason: 'year-unavailable' }); continue; }
      if (tone === 'ambiguous') { unused.push({ ...base, reason: 'boundary-ambiguous' }); continue; }
      if (tone === 'neutral') { unused.push({ ...base, reason: 'neutral-period' }); continue; }
      const match = (SIGNAL[e.outcome] > 0) === (tone === 'favorable') ? 'agree' : 'disagree';
      used.push({ ...base, periodYear, tone, match });
    }
    const byDomain = Object.fromEntries(LIFE_EVENT_DOMAINS.filter((d) => used.some((u) => u.domain === d)).map((d) => [d, factorOf(used.filter((u) => u.domain === d), policy)]));
    engines[engine] = {
      status: 'available',
      counts: { used: used.length, unused: unused.length },
      overall: factorOf(used, policy),
      byDomain,
      used,
      unused,
    };
  }
  // 분야별로 엔진 판정을 모아 본다(엔진끼리의 합의는 판정하지 않고 나열만 한다).
  const domains = {};
  for (const d of LIFE_EVENT_DOMAINS) {
    const row = {};
    for (const engine of LIFE_CALIBRATION_ENGINES) {
      const f = engines[engine].byDomain?.[d];
      if (f) row[engine] = { status: f.status, direction: f.direction, factor: f.factor, confidence: f.confidence, conflictFlag: f.conflictFlag };
    }
    if (Object.keys(row).length) domains[d] = row;
  }
  return deepFreeze({
    version: LIFE_CALIBRATION_VERSION,
    policy: policy.id,
    inputHash: lifeCalibrationInputHash(list, signals, policy),
    engineVersions,
    counts: { events: list.length, enginesAvailable: Object.values(engines).filter((x) => x.status === 'available').length },
    engines,
    domains,
  });
}

/** LifeCalibration 문서에 넣을 필드. computedAt 은 호출자가 넘긴다(이 모듈은 시계를 읽지 않는다). */
export function lifeCalibrationCacheFields(calibration) {
  return { inputHash: calibration.inputHash, engineVersions: { ...calibration.engineVersions, aggregate: calibration.version }, result: calibration };
}

/** 저장된 캐시가 지금 입력으로 다시 계산할 필요가 없는지. */
export const isLifeCalibrationCacheFresh = (doc, inputHash) => Boolean(doc && typeof doc.inputHash === 'string' && doc.inputHash === inputHash);
