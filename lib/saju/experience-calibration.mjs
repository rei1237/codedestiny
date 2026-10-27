// 과거 경험 보정(ExperienceCalibration). 원국 판정(natal-core)을 읽기만 하고 바꾸지 않는다.
// 설문 응답은 대운·세운 해석의 강조 정도에만 쓰이며, 격국·진가종·강약·조후·구조 용신을 덮어쓰는 필드는 없다.
import { STEM_ORDER, BRANCH_ORDER, STEM_EL, BRANCH_EL } from './natal-core/tables.mjs';
import { stableHash } from './natal-core/index.mjs';

export const PERIODS_VERSION = 'periods-v1';
export const CALIBRATION_VERSION = 'experience-calibration-v1';
export const EXPERIENCE_OUTCOMES = ['good', 'bad', 'mixed', 'ordinary', 'unsure', 'skip'];
export const EXPERIENCE_OUTCOME_KO = {
  good: '특별히 좋았음', bad: '특별히 나빴음', mixed: '좋고 나쁜 일이 함께 있었음',
  ordinary: '대체로 평범했음', unsure: '기억이 불확실함', skip: '해당 없음·응답 건너뜀',
};
export const EXPERIENCE_DOMAINS = ['career', 'business', 'money', 'relationship', 'study'];
export const EXPERIENCE_DOMAIN_KO = { career: '직업', business: '사업', money: '재정', relationship: '관계', study: '학업' };
export const EXPERIENCE_CERTAINTY = ['sure', 'unsure'];
export const EXPERIENCE_SOURCES = ['volunteered', 'prompted'];
// 개발 정책 보조값이다. 문헌 근거가 있는 수치가 아니며, 보정 크기를 작게 묶어 두는 용도다.
export const CALIBRATION_POLICY = Object.freeze({ id: 'shrink-cap-v1', maxEntries: 40, minSignals: 3, minYears: 2, shrinkK: 4, cap: 0.15, noteMax: 80 });

const SIGNAL = { good: 1, bad: -1 };
const HYPOTHESIS_KO = { reading: '현재 해석의 용신·기신', eokbu: '억부', 'johu.hanNan': '조후(한난)', 'johu.joSeup': '조후(조습)', tonggwan: '통관', special: '특수격 순세' };

export class ExperienceInputError extends Error {
  constructor(message) { super(message); this.name = 'ExperienceInputError'; this.code = 'INVALID_EXPERIENCE'; }
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

const isInt = (v) => Number.isInteger(v);
const cleanNote = (v, max) => String(v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const order = (a, b) => a.year - b.year || (a.month || 0) - (b.month || 0) || String(a.domain).localeCompare(String(b.domain))
  || a.outcome.localeCompare(b.outcome) || a.note.localeCompare(b.note) || a.source.localeCompare(b.source);

/** 엄격 파서. 입력이 없으면 []이고, 형식이 틀리면 ExperienceInputError를 던진다. 모르는 키는 버린다. */
export function normalizeExperienceAnswers(raw, { minYear = 1900, maxYear = 2200, policy = CALIBRATION_POLICY } = {}) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new ExperienceInputError('experience must be an array');
  if (raw.length > policy.maxEntries) throw new ExperienceInputError(`at most ${policy.maxEntries} entries`);
  return raw.map((e, i) => {
    if (!e || typeof e !== 'object' || Array.isArray(e)) throw new ExperienceInputError(`entry ${i} must be an object`);
    const { year, month = null, domain = null, outcome, intensity = 2, certainty = 'sure', source = 'volunteered', note = '' } = e;
    if (!isInt(year) || year < minYear || year > maxYear) throw new ExperienceInputError(`entry ${i}: year out of range`);
    if (month !== null && (!isInt(month) || month < 1 || month > 12)) throw new ExperienceInputError(`entry ${i}: month`);
    if (!EXPERIENCE_OUTCOMES.includes(outcome)) throw new ExperienceInputError(`entry ${i}: outcome`);
    if (domain !== null && !EXPERIENCE_DOMAINS.includes(domain)) throw new ExperienceInputError(`entry ${i}: domain`);
    if (domain === null && ['good', 'bad', 'mixed'].includes(outcome)) throw new ExperienceInputError(`entry ${i}: domain required`);
    if (!isInt(intensity) || intensity < 1 || intensity > 3) throw new ExperienceInputError(`entry ${i}: intensity`);
    if (!EXPERIENCE_CERTAINTY.includes(certainty)) throw new ExperienceInputError(`entry ${i}: certainty`);
    if (!EXPERIENCE_SOURCES.includes(source)) throw new ExperienceInputError(`entry ${i}: source`);
    if (typeof note !== 'string') throw new ExperienceInputError(`entry ${i}: note`);
    return { year, month, domain, outcome, intensity, certainty, source, note: cleanNote(note, policy.noteMax) };
  }).sort(order);
}

export const experienceKeyMaterial = (answers) => JSON.stringify(answers.map((e) => [e.year, e.month, e.domain, e.outcome, e.intensity, e.certainty, e.source, e.note]));
export const experienceKey = (answers) => `ex1-${stableHash(experienceKeyMaterial(answers))}`;

export function sexagenaryPillar(year) {
  return STEM_ORDER[(((year - 4) % 10) + 10) % 10] + BRANCH_ORDER[(((year - 4) % 12) + 12) % 12];
}

/**
 * 대운 목록을 기간 분석 입력으로 바꾼다. cycles: [{pillar, start:{year, month}}] (교운 연월).
 * 세운은 입춘 연 기준이다. 목표 연도의 대운은 그해 7월에 걸린 대운으로 표시한다.
 * @param {{cycles?: Array<{pillar?: string, start: {year: number, month?: number|null}}>, fromYear: number, toYear: number, targetYears?: number[]}} input
 */
export function buildLuckTimeline({ cycles = [], fromYear, toYear, targetYears = [] }) {
  const list = cycles.filter((c) => c && c.start && isInt(c.start.year)).map((c) => ({ pillar: c.pillar || '', start: { year: c.start.year, month: isInt(c.start.month) ? c.start.month : null } }))
    .sort((a, b) => a.start.year - b.start.year || (a.start.month || 0) - (b.start.month || 0));
  const years = [];
  if (!isInt(fromYear) || !isInt(toYear)) throw new Error('buildLuckTimeline needs fromYear and toYear');
  const span = new Set([...Array.from({ length: Math.max(0, toYear - fromYear + 1) }, (_, i) => fromYear + i), ...targetYears]);
  for (const year of [...span].sort((a, b) => a - b)) years.push({ year, sewoon: sexagenaryPillar(year), target: targetYears.includes(year) });
  return { cycles: list, window: { fromYear, toYear }, years };
}

function hypothesesOf(natal, applied) {
  const y = natal.yongshin || {};
  const list = [{ id: 'reading', useful: applied?.useful || [], avoid: applied?.avoid || [] }];
  if (y.eokbu?.applies) list.push({ id: 'eokbu', useful: y.eokbu.useful || [], avoid: y.eokbu.avoid || [] });
  for (const axis of ['hanNan', 'joSeup']) if (y.johu?.[axis]?.elements?.length) list.push({ id: `johu.${axis}`, useful: y.johu[axis].elements, avoid: [] });
  if (y.tonggwan?.status === 'candidate') list.push({ id: 'tonggwan', useful: y.tonggwan.elements || [], avoid: [] });
  if (y.special?.follow) list.push({ id: 'special', useful: y.special.follow.filter(Boolean), avoid: [] });
  return list.map((h) => ({ ...h, label: HYPOTHESIS_KO[h.id], evaluable: h.useful.length + h.avoid.length > 0 }));
}

const charsOf = (...pillars) => pillars.flatMap((p) => (p ? [STEM_EL[p[0]], BRANCH_EL[p[1]]] : [])).filter(Boolean);
/** 운의 네 글자(대운 간지 + 세운 간지)가 가설의 쓰는 오행이면 +1, 꺼리는 오행이면 −1. 개발 정책 보조값이다. */
function toneOf(h, daewun, sewoon) {
  let sum = 0;
  for (const el of charsOf(daewun, sewoon)) sum += (h.useful.includes(el) ? 1 : 0) - (h.avoid.includes(el) ? 1 : 0);
  const n = charsOf(daewun, sewoon).length || 1;
  return { value: sum > 0 ? 'favorable' : sum < 0 ? 'unfavorable' : 'neutral', strength: Math.round((sum / n) * 1000) / 1000 };
}

/** 그 연월에 걸린 대운(교운 달 자체는 새 대운으로 본다). */
function cycleAt(cycles, year, month) {
  let found = null;
  for (const c of cycles) if (c.start.year < year || (c.start.year === year && c.start.month !== null && c.start.month <= month)) found = c;
  return found;
}
/** 그 연월에 걸릴 수 있는 대운들. 교운한 해인데 달을 모르거나 교운 달이면 앞뒤 대운이 모두 후보다. */
function cycleCandidates(cycles, year, month) {
  const i = cycles.findIndex((c) => c.start.year === year);
  if (i < 0) return [cycleAt(cycles, year, 12)];
  const changing = cycles[i], prev = cycles[i - 1] || null;
  if (month === null || changing.start.month === null || changing.start.month === month) return [prev, changing];
  return [month < changing.start.month ? prev : changing];
}
/** 세운은 입춘(2월 초)에 바뀐다. 1월은 전년 세운, 2월은 양쪽 모두 후보다. */
const sewoonCandidates = (year, month) => (month === 1 ? [year - 1] : month === 2 ? [year - 1, year] : [year]);

/** 기간 분석(BasePeriodAnalysis). natal은 analyzeNatalCore의 동결 결과, applied는 화면이 쓰는 용신·기신이다. */
export function analyzePeriods({ natal, applied, timeline }) {
  if (!natal || natal.status !== 'ok') throw new Error('analyzePeriods needs a natal-core analysis');
  const hypotheses = hypothesesOf(natal, applied);
  const reading = hypotheses[0];
  const rows = timeline.years.map(({ year, sewoon, target }) => {
    const daewun = cycleAt(timeline.cycles, year, 7)?.pillar || '';
    const tone = toneOf(reading, daewun, sewoon);
    return { year, sewoon, daewun, target: !!target, tone: tone.value, strength: tone.strength };
  });
  const periodsKey = `pa1-${stableHash([natal.analysisId, PERIODS_VERSION, JSON.stringify(hypotheses.map((h) => [h.id, h.useful, h.avoid])), JSON.stringify(timeline)].join('|'))}`;
  return deepFreeze({
    version: PERIODS_VERSION, natalAnalysisId: natal.analysisId, periodsKey,
    hypotheses, allowedHypotheses: hypotheses.filter((h) => h.evaluable).map((h) => h.id),
    cycles: timeline.cycles, window: timeline.window, rows,
    rule: '운의 네 글자(대운·세운 간지)가 쓰는 오행에 들면 +1, 꺼리는 오행에 들면 −1로 센 개발 정책 보조값이다. 원국 판정이 아니다.',
  });
}

function resolveTones(periods, e) {
  const options = [];
  for (const y of sewoonCandidates(e.year, e.month)) for (const cycle of cycleCandidates(periods.cycles, e.year, e.month)) options.push({ sewoon: sexagenaryPillar(y), daewun: cycle?.pillar || '' });
  const out = {};
  for (const h of periods.hypotheses.filter((x) => x.evaluable)) {
    const tones = new Set(options.map((o) => toneOf(h, o.daewun, o.sewoon).value));
    out[h.id] = tones.size === 1 ? [...tones][0] : 'ambiguous';
  }
  const sewoonSplit = new Set(options.map((o) => o.sewoon)).size > 1;
  return { tones: out, options, boundary: sewoonSplit ? 'ipchun-boundary' : 'daewun-boundary' };
}

const matchOf = (outcome, tone) => (tone === 'neutral' ? 'no-prediction' : (SIGNAL[outcome] > 0) === (tone === 'favorable') ? 'agree' : 'disagree');
const round = (v) => Math.round(v * 10000) / 10000;

function factorOf(events, policy) {
  const n = events.length, agree = events.filter((e) => e.match === 'agree').length, disagree = n - agree;
  const years = new Set(events.map((e) => e.periodYear)).size;
  if (n < policy.minSignals || years < policy.minYears) return { status: 'insufficient', n, agree, disagree, years, factor: 0 };
  const raw = (agree - disagree) / n, shrink = n / (n + policy.shrinkK);
  return { status: 'applied', n, agree, disagree, years, raw: round(raw), shrink: round(shrink), factor: round(Math.max(-1, Math.min(1, raw * shrink)) * policy.cap) };
}

/** 강조 정도만 조정한다. (1+factor)는 0.85~1.15라 부호가 뒤집히지 않는다. */
export const adjustStrength = (before, factor) => { const after = round(before * (1 + factor)); return { before, delta: round(after - before), after }; };
/** 0~100 점수(기준 50)용. */
export const adjustScore = (before, factor) => { const after = Math.round((50 + (before - 50) * (1 + factor)) * 10) / 10; return { before, delta: Math.round((after - before) * 10) / 10, after }; };

/**
 * ExperienceCalibration. natal·periods는 읽기만 한다. 보정은 periods.allowedHypotheses 안에서만 기록하고,
 * 강조 정도는 'reading' 가설(현재 해석)의 운 판단에만 곱한다. 가설을 새로 채택하거나 원국을 덮어쓰는 필드는 없다.
 */
export function calibrateExperience({ natal, periods, answers, policy = CALIBRATION_POLICY }) {
  if (!natal || !Object.isFrozen(natal)) throw new Error('calibrateExperience needs a frozen natal analysis');
  if (!periods || periods.natalAnalysisId !== natal.analysisId) throw new Error('periods were built from another natal analysis');
  const list = normalizeExperienceAnswers(answers, { policy });
  const exKey = experienceKey(list);
  const seen = new Map();
  const used = [], unused = [];
  for (const e of list) {
    const base = { year: e.year, month: e.month, domain: e.domain, outcome: e.outcome, outcomeKo: EXPERIENCE_OUTCOME_KO[e.outcome], intensity: e.intensity, certainty: e.certainty, source: e.source };
    const noteKey = e.note.toLowerCase().replace(/\s+/g, '');
    const key = noteKey ? `${e.domain}|note|${noteKey}` : `${e.year}|${e.month}|${e.domain}|${e.outcome}`;
    if (seen.has(key)) { unused.push({ ...base, reason: noteKey && seen.get(key) !== e.year ? 'same-event' : 'duplicate' }); continue; }
    seen.set(key, e.year);
    if (e.outcome === 'ordinary' || e.outcome === 'unsure' || e.outcome === 'skip') { unused.push({ ...base, reason: `not-a-signal:${e.outcome}` }); continue; }
    if (e.outcome === 'mixed') { unused.push({ ...base, reason: 'mixed-signal' }); continue; }
    if (e.certainty === 'unsure') { unused.push({ ...base, reason: 'uncertain-memory' }); continue; }
    if (e.year < periods.window.fromYear || e.year > periods.window.toYear) { unused.push({ ...base, reason: 'outside-window' }); continue; }
    const { tones, options, boundary } = resolveTones(periods, e);
    const tone = tones.reading;
    if (tone === undefined) { unused.push({ ...base, reason: 'no-reading-hypothesis' }); continue; }
    if (tone === 'ambiguous') { unused.push({ ...base, reason: boundary, candidates: options }); continue; }
    // 경계에 걸려도 후보 운의 판단이 모두 같으면 센다. 어느 운인지는 후보로만 남긴다.
    const periodYear = e.month === 1 ? e.year - 1 : e.year;
    const byHypothesis = Object.fromEntries(Object.entries(tones).map(([id, t]) => [id, t === 'ambiguous' ? 'ambiguous' : matchOf(e.outcome, t)]));
    const luck = options.length === 1 ? { sewoon: options[0].sewoon, daewun: options[0].daewun } : { candidates: options };
    const row = { ...base, periodYear, ...luck, tone, match: matchOf(e.outcome, tone), byHypothesis };
    (row.match === 'no-prediction' ? unused : used).push(row.match === 'no-prediction' ? { ...row, reason: 'neutral-period' } : row);
  }
  const support = Object.fromEntries(periods.allowedHypotheses.map((id) => {
    const rows = used.filter((u) => u.byHypothesis[id] === 'agree' || u.byHypothesis[id] === 'disagree');
    return [id, { agree: rows.filter((u) => u.byHypothesis[id] === 'agree').length, disagree: rows.filter((u) => u.byHypothesis[id] === 'disagree').length }];
  }));
  const overall = factorOf(used, policy);
  const byDomain = Object.fromEntries(EXPERIENCE_DOMAINS.filter((d) => used.some((u) => u.domain === d)).map((d) => [d, factorOf(used.filter((u) => u.domain === d), policy)]));
  const adjustments = periods.rows.filter((r) => r.target).map((r) => ({
    year: r.year, sewoon: r.sewoon, daewun: r.daewun, tone: r.tone,
    overall: adjustStrength(r.strength, overall.factor),
    byDomain: Object.fromEntries(Object.entries(byDomain).filter(([, f]) => f.status === 'applied').map(([d, f]) => [d, adjustStrength(r.strength, f.factor)])),
  }));
  const notes = ['과거 경험과의 일치 여부만 기록합니다. 이 결과로 해석의 정확도를 평가하지 않습니다.',
    '원국의 격국·종격·신강/신약·조후·구조 용신은 경험 응답으로 바뀌지 않습니다.'];
  if (overall.status === 'insufficient') notes.push(`확실한 '좋았음/나빴음' 신호가 ${policy.minSignals}건 이상, 서로 다른 해 ${policy.minYears}개 이상일 때만 강조 정도를 조정합니다. 지금은 일치·불일치만 보여 줍니다.`);
  if (list.some((e) => e.source === 'volunteered' && SIGNAL[e.outcome])) notes.push('직접 떠올린 해는 기억에 남는 사건 위주로 골라지기 쉬워, 일치 수를 그대로 비율로 읽지 않습니다.');
  if (Object.values(support).some((s) => s.agree + s.disagree > 0)) notes.push('가설별 일치 수는 참고용입니다. 한 해가 좋았다고 그 오행을 평생 용신으로 정하지 않습니다.');
  return deepFreeze({
    version: CALIBRATION_VERSION, policy: policy.id, natalAnalysisId: natal.analysisId, periodsKey: periods.periodsKey,
    experienceKey: exKey, calibrationKey: `ec1-${stableHash([periods.periodsKey, exKey, CALIBRATION_VERSION, policy.id].join('|'))}`,
    status: list.length ? overall.status : 'none',
    counts: { entries: list.length, used: used.length, unused: unused.length, agree: overall.agree, disagree: overall.disagree },
    overall, byDomain, support,
    agreements: used.filter((u) => u.match === 'agree'), mismatches: used.filter((u) => u.match === 'disagree'), unused,
    adjustments, notes,
  });
}

/** 사람이 읽는 요약. 프롬프트·화면 문구에 쓴다. 메모 원문은 넣지 않는다. */
export function describeCalibration(c) {
  const line = (u) => `${u.periodYear}년 ${EXPERIENCE_DOMAIN_KO[u.domain]}: ${u.outcomeKo} / 운 판단 ${u.tone === 'favorable' ? '유리' : '불리'}`;
  return { status: c.status, agreements: c.agreements.map(line), mismatches: c.mismatches.map(line), factor: c.overall.factor };
}
