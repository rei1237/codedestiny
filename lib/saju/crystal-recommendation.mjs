// 사주 원석 추천 엔진. 순수 함수이며 같은 입력이면 같은 결과를 낸다(LLM·전역 상태·저장소를 쓰지 않는다).
// 흐름: analyzeNatalCore → analyzePeriods → recommendCrystals.
// 원국(natal-core)과 기간 분석(periods)은 읽기만 한다. 답변은 구조 후보들 사이의 순서만 정하고,
// 격국·종격·강약·조후·구조 용신을 바꾸거나 구조 후보 밖의 오행을 더하지 않는다.
// 오행 개수(counts)는 입력으로 쓰지 않는다. "사주에 없는 오행이라서" 추천되는 경로가 없다.
import { analyzeNatalCore, stableHash } from './natal-core/index.mjs';
import { EL_KO } from './natal-core/tables.mjs';
import {
  analyzePeriods, buildLuckTimeline, resolveTones, CALIBRATION_POLICY,
} from './experience-calibration.mjs';
import { CATALOG_VERSION, CRYSTAL_CATALOG, CRYSTAL_ELEMENT_KO, crystalsForElement } from './crystal-catalog.mjs';
import { buildSajuNatalAnalysis } from '../../worker/lib/saju-natal-analysis.js';
import { calculateNatalSaju } from '../korean-calendar/natal.js';
import { daeun } from '../korean-calendar/daeun.js';
import { STEM_ORDER, BRANCH_ORDER } from './natal-core/tables.mjs';

export const CRYSTAL_ENGINE_VERSION = 'crystal-engine-v1';
export const CRYSTAL_ANSWERS_VERSION = 'crystal-answers-v1';
export { CATALOG_VERSION };
export const CRYSTAL_DOMAINS = Object.freeze(['work', 'money', 'relationship', 'life']);
export const CRYSTAL_DOMAIN_KO = Object.freeze({ work: '일·사업·학업', money: '돈·생활 여건', relationship: '연애·대인관계', life: '생활 전반' });
export const CRYSTAL_AREA_VALUES = Object.freeze(['good', 'hard', 'mixed']);
export const CRYSTAL_ANSWER_FLAGS = Object.freeze(['listed', 'none', 'unsure', 'skip']);
export const CRYSTAL_LIMITS = Object.freeze({ perKind: 3, followups: 2, minLead: 2, crystalsMax: 3, crystalsMin: 2 });
export const CRYSTAL_DISCLAIMER = '원석의 오행과 의미는 전통적 해석과 문화적 상징을 바탕으로 하며, 건강이나 운세의 변화를 보장하지 않습니다';

// 화면에 보이는 관점 이름. 명리 용어 대신 쉬운 말로 쓴다.
export const CRYSTAL_HYPOTHESIS_KO = Object.freeze({
  reading: '사주 결과에서 함께 본 도움이 되는 기운',
  eokbu: '일간의 힘을 고르게 맞추는 관점',
  'johu.hanNan': '사주의 차갑고 더운 정도를 맞추는 관점',
  'johu.joSeup': '사주의 건조하고 습한 정도를 맞추는 관점',
  tonggwan: '맞서는 두 기운을 이어 주는 관점',
  special: '한쪽으로 크게 기운 사주의 흐름을 따르는 관점',
});
// natal.yongshin.priority 항목 → 기간 분석의 가설 id. 격국 상신은 자동화하지 않아 가설이 없다.
const PRIORITY_TO_HYPOTHESES = { gyeokguk: [], eokbu: ['eokbu'], johu: ['johu.hanNan', 'johu.joSeup'], tonggwan: ['tonggwan'], special: ['special'] };

export class CrystalAnswerError extends Error {
  constructor(message) { super(message); this.name = 'CrystalAnswerError'; this.code = 'INVALID_CRYSTAL_ANSWERS'; }
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}
const isInt = (v) => Number.isInteger(v);
const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
const elKo = (el) => CRYSTAL_ELEMENT_KO[el] || EL_KO[el] || el;
const joinEls = (els) => els.map(elKo).join('·');

/** 한국 시각 기준 올해. */
export const currentKstYear = (now = new Date()) => new Date(now.getTime() + 9 * 3600000).getUTCFullYear();

/**
 * crystal-answers-v1 엄격 파서. 모르는 키는 버리고, 형식이 틀리면 CrystalAnswerError를 던진다.
 * 입력: { version?, good?, hard?, entries: [{year, month|null, kind:'good'|'hard', areas:{work?,money?,relationship?,life?}, source?}], asked?: number[] }
 * good/hard는 질문별 응답 상태다('listed'|'none'|'unsure'|'skip'). 없으면 그 종류의 항목 유무로 정한다.
 * 연도는 출생연도~올해만 받는다. 올해 항목은 partial(지금까지)로 표시한다.
 */
export function normalizeCrystalAnswers(raw, { birthYear, currentYear } = {}) {
  if (!isInt(birthYear) || !isInt(currentYear) || birthYear > currentYear) throw new Error('normalizeCrystalAnswers needs birthYear and currentYear');
  if (raw == null) raw = {};
  if (!isPlainObject(raw)) throw new CrystalAnswerError('answers must be an object');
  if (raw.version !== undefined && raw.version !== CRYSTAL_ANSWERS_VERSION) throw new CrystalAnswerError('unknown answers version');
  const rawEntries = raw.entries == null ? [] : raw.entries;
  if (!Array.isArray(rawEntries)) throw new CrystalAnswerError('entries must be an array');
  const entries = rawEntries.map((e, i) => {
    if (!isPlainObject(e)) throw new CrystalAnswerError(`entry ${i} must be an object`);
    const { year, month = null, kind, areas = {}, source = 'volunteered' } = e;
    if (!isInt(year)) throw new CrystalAnswerError(`entry ${i}: year`);
    if (year < birthYear) throw new CrystalAnswerError(`entry ${i}: year before birth`);
    if (year > currentYear) throw new CrystalAnswerError(`entry ${i}: future year`);
    if (month !== null && (!isInt(month) || month < 1 || month > 12)) throw new CrystalAnswerError(`entry ${i}: month`);
    if (kind !== 'good' && kind !== 'hard') throw new CrystalAnswerError(`entry ${i}: kind`);
    if (source !== 'volunteered' && source !== 'followup') throw new CrystalAnswerError(`entry ${i}: source`);
    if (!isPlainObject(areas)) throw new CrystalAnswerError(`entry ${i}: areas`);
    const clean = {};
    for (const [k, v] of Object.entries(areas)) {
      if (!CRYSTAL_DOMAINS.includes(k)) throw new CrystalAnswerError(`entry ${i}: area ${k}`);
      if (v == null) continue;
      if (!CRYSTAL_AREA_VALUES.includes(v)) throw new CrystalAnswerError(`entry ${i}: area value`);
      clean[k] = v;
    }
    const sortedAreas = Object.fromEntries(CRYSTAL_DOMAINS.filter((d) => d in clean).map((d) => [d, clean[d]]));
    return { year, month, kind, areas: sortedAreas, source, partial: year === currentYear };
  }).sort((a, b) => a.year - b.year || (a.month || 0) - (b.month || 0) || a.kind.localeCompare(b.kind) || a.source.localeCompare(b.source));
  const seen = new Set();
  for (const e of entries) {
    const key = `${e.year}|${e.kind}`;
    if (seen.has(key)) throw new CrystalAnswerError(`duplicate ${e.kind} year ${e.year}`);
    seen.add(key);
  }
  for (const kind of ['good', 'hard']) {
    if (entries.filter((e) => e.kind === kind && e.source === 'volunteered').length > CRYSTAL_LIMITS.perKind) throw new CrystalAnswerError(`at most ${CRYSTAL_LIMITS.perKind} ${kind} years`);
  }
  if (entries.filter((e) => e.source === 'followup').length > CRYSTAL_LIMITS.followups) throw new CrystalAnswerError('too many follow-up answers');
  const flags = {};
  for (const kind of ['good', 'hard']) {
    const has = entries.some((e) => e.kind === kind && e.source === 'volunteered');
    const flag = raw[kind] === undefined ? (has ? 'listed' : 'skip') : raw[kind];
    if (!CRYSTAL_ANSWER_FLAGS.includes(flag)) throw new CrystalAnswerError(`${kind}: flag`);
    if (flag === 'listed' && !has) throw new CrystalAnswerError(`${kind}: listed without years`);
    if (flag !== 'listed' && has) throw new CrystalAnswerError(`${kind}: years with ${flag}`);
    flags[kind] = flag;
  }
  const rawAsked = raw.asked == null ? [] : raw.asked;
  if (!Array.isArray(rawAsked)) throw new CrystalAnswerError('asked must be an array');
  const asked = [...new Set(rawAsked)].sort((a, b) => a - b);
  if (asked.length > CRYSTAL_LIMITS.followups || asked.some((y) => !isInt(y) || y < birthYear || y > currentYear)) throw new CrystalAnswerError('asked');
  return { version: CRYSTAL_ANSWERS_VERSION, good: flags.good, hard: flags.hard, entries, asked };
}

export const crystalAnswersKey = (normalized) => `ca1-${stableHash(JSON.stringify([normalized.good, normalized.hard,
  normalized.entries.map((e) => [e.year, e.month, e.kind, CRYSTAL_DOMAINS.map((d) => e.areas[d] || ''), e.source]), normalized.asked]))}`;

/**
 * 셸(js/saju-engine.js applyRuntimeYongshinPolicy)과 같은 규칙의 화면 용신·기신.
 * worker/yeongnyangi/fortune/saju-runtime.mjs는 셸 원문을 그대로 뽑아 낸 생성물이고,
 * worker/lib/saju-natal-analysis.js가 그 calcPower → detectJong → analyzeJohu → applyRuntimeYongshinPolicy를 같은 순서로 부른다.
 * gyeokguk-authority는 승인 프로필의 후보 축만 투영하고 셸 정책(억부+조후 통합)을 내지 않아 쓰지 않는다.
 * @param {{year:string, month:string, day:string, hour?:string|null}} pillars 한자 간지 문자열
 */
export function deriveAppliedYongshin(pillars, { timeUnknown = !pillars?.hour } = {}) {
  const analysis = buildSajuNatalAnalysis(pillars, { timeUnknown });
  return { useful: [...(analysis.power?.yongshin || [])], avoid: [...(analysis.power?.kijishin || [])] };
}

const toCorePillars = (pillars) => Object.fromEntries(['year', 'month', 'day', 'hour'].map((key, i) => {
  const text = String(pillars?.[key] || '');
  return [['y', 'm', 'd', 'h'][i], { g: text[0] || '', j: text[1] || '' }];
}));

/**
 * 사이트 출생정보 하나로 natal·periods를 만든다. 화면은 이 함수와 recommendCrystals만 부르면 된다.
 * birth는 calculateNatalSaju 입력({birthDate, birthTime?, birthTimeUnknown?, calendarType?, isLeapMonth?, birthPlace?})과 같다.
 * 출생시간을 모르거나 성별이 없으면 대운을 비우고 세운만으로 대조한다.
 * @returns {{natal, applied, periods, pillars, birthYear, currentYear, hourKnown, daewunIncluded}}
 */
export function buildCrystalInputs({ birth, gender = null, currentYear, now, calendarOptions = {} } = {}) {
  const chart = calculateNatalSaju(birth || {}, calendarOptions);
  const meta = chart.calculationMeta;
  const hourKnown = meta.timeUnknown !== true && Boolean(chart.pillars.hour);
  const natal = analyzeNatalCore(toCorePillars(chart.pillars));
  const applied = deriveAppliedYongshin(chart.pillars, { timeUnknown: !hourKnown });
  const birthYear = meta.civil.year;
  const year = isInt(currentYear) ? currentYear : currentKstYear(now);
  const g = String(gender || '').toLowerCase();
  const genderCode = ['m', 'male', '남', '남성'].includes(g) ? 'M' : ['f', 'female', '여', '여성'].includes(g) ? 'F' : null;
  let cycles = [];
  if (hourKnown && genderCode) {
    // 셸과 같이 절기 시계(termClock)와 민용 출생연도로 대운을 낸다.
    const result = daeun({ ...meta.termClock }, { gender: genderCode, birthCivilYear: birthYear });
    if (result) {
      cycles = result.cycles.filter((c) => c.index >= 1).map((c) => ({
        pillar: STEM_ORDER[c.stemIndex] + BRANCH_ORDER[c.branchIndex],
        start: { year: c.startYear, month: result.startSolar.month },
      }));
    }
  }
  const timeline = buildLuckTimeline({ cycles, fromYear: birthYear, toYear: Math.max(birthYear, year) });
  const periods = analyzePeriods({ natal, applied, timeline });
  return { natal, applied, periods, pillars: { ...chart.pillars }, birthYear, currentYear: year, hourKnown, daewunIncluded: cycles.length > 0 };
}

const sortedKey = (list) => JSON.stringify([...list].sort());

/** 구조 순서: natal.yongshin.priority를 가설로 펴고, 화면 해석(reading)은 그 뒤에 둔다. */
function structuralOrder(natal, periods) {
  const evaluable = periods.hypotheses.filter((h) => h.evaluable);
  const ids = [];
  for (const p of natal.yongshin?.priority || []) for (const id of PRIORITY_TO_HYPOTHESES[p] || []) if (!ids.includes(id)) ids.push(id);
  ids.push('reading');
  for (const h of evaluable) if (!ids.includes(h.id)) ids.push(h.id);
  return ids.map((id) => evaluable.find((h) => h.id === id)).filter(Boolean);
}

/** 쓰는 오행이 같은 가설은 같은 선택지다. 대표는 구조 순서에서 먼저 오는 가설이다. */
function optionsOf(ordered) {
  const options = [];
  for (const h of ordered) {
    const key = sortedKey(h.useful);
    const found = options.find((o) => o.key === key);
    if (found) found.members.push(h.id);
    else options.push({ key, id: h.id, members: [h.id], useful: [...h.useful], avoid: [...h.avoid] });
  }
  return options;
}

const matchOf = (kind, tone) => (tone === 'ambiguous' ? 'ambiguous' : tone === 'neutral' ? 'neutral' : (kind === 'good') === (tone === 'favorable') ? 'agree' : 'disagree');

function signalsOf(entries) {
  const signals = [], unused = [];
  for (const e of entries) {
    const areaKeys = Object.keys(e.areas);
    if (!areaKeys.length) {
      // 영역을 고르지 않은 해는 "생활 전반"의 한 신호로 본다.
      signals.push({ year: e.year, month: e.month, domain: 'life', kind: e.kind, partial: e.partial, source: e.source, areaAssumed: true });
      continue;
    }
    for (const d of areaKeys) {
      const v = e.areas[d];
      if (v === 'mixed') { unused.push({ year: e.year, month: e.month, domain: d, reason: 'mixed' }); continue; }
      signals.push({ year: e.year, month: e.month, domain: d, kind: v, partial: e.partial, source: e.source, areaAssumed: false });
    }
  }
  return { signals, unused };
}

function crystalCard(c, role, catalogEl) {
  return {
    id: c.id, nameKo: c.nameKo, nameEn: c.nameEn, element: c.element, elementKo: elKo(c.element), role, color: c.color,
    symbolicMeanings: [...c.symbolicMeanings], image: c.image,
    reason: `${elKo(catalogEl)} 기운에 어울리는 원석으로 알려져 있어요. 예로부터 ${c.symbolicMeanings.join('·')}의 의미를 담아 전해져요.`,
  };
}

function pickCrystals(primary, support, catalog) {
  const out = [];
  const taken = new Set();
  const add = (el, role, idx = 0) => {
    const c = crystalsForElement(el, catalog).filter((x) => !taken.has(x.id))[idx];
    if (!c || out.length >= CRYSTAL_LIMITS.crystalsMax) return;
    taken.add(c.id); out.push(crystalCard(c, role, el));
  };
  for (const el of primary) add(el, 'primary');
  for (const el of support) add(el, 'support');
  // 후보 오행이 하나뿐이면 같은 오행의 다음 원석으로 2개를 채운다. 후보 밖의 오행은 더하지 않는다.
  if (out.length < CRYSTAL_LIMITS.crystalsMin && primary.length) add(primary[0], 'primary');
  return out;
}

/**
 * 원석 추천.
 * @param {{natal: object, periods: object, answers?: object, catalog?: object[]}} input
 * natal은 analyzeNatalCore의 동결 결과, periods는 같은 natal로 만든 analyzePeriods 결과.
 * 연도 범위는 periods.window(출생연도~올해)를 쓴다.
 */
export function recommendCrystals({ natal, periods, answers, catalog = CRYSTAL_CATALOG }) {
  if (!natal || !Object.isFrozen(natal)) throw new Error('recommendCrystals needs a frozen natal analysis');
  if (!periods || periods.natalAnalysisId !== natal.analysisId) throw new Error('periods were built from another natal analysis');
  const { fromYear: birthYear, toYear: currentYear } = periods.window;
  const normalized = normalizeCrystalAnswers(answers, { birthYear, currentYear });
  const answersKey = crystalAnswersKey(normalized);
  const resultKey = `cr1-${stableHash([natal.analysisId, periods.periodsKey, answersKey, CRYSTAL_ENGINE_VERSION, CATALOG_VERSION].join('|'))}`;
  const limitations = [];
  if (!natal.input?.hourKnown) limitations.push('출생시간을 몰라 10년 단위의 큰 흐름(대운)은 빼고, 해마다의 흐름(세운)으로만 살펴봤어요.');
  else if (!periods.cycles.length) limitations.push('10년 단위의 큰 흐름(대운) 정보가 없어 해마다의 흐름(세운)으로만 살펴봤어요.');
  if (natal.special?.decision === 'pending') limitations.push('출생시간에 따라 사주의 큰 틀이 달라질 수 있어, 그 부분은 판단을 미뤘어요.');
  if (normalized.entries.some((e) => e.partial)) limitations.push('올해는 아직 지나는 중이라 지금까지 있었던 일로만 참고했어요.');

  const ordered = natal.status === 'ok' ? structuralOrder(natal, periods) : [];
  const options = optionsOf(ordered);
  const hypotheses = ordered.map((h) => ({ id: h.id, label: CRYSTAL_HYPOTHESIS_KO[h.id] || h.label, useful: [...h.useful], avoid: [...h.avoid] }));

  // 경험 대조: 신호(연도×영역)마다 가설별로 따로 센다. 한 해의 영역을 합치지 않는다.
  const { signals, unused } = signalsOf(normalized.entries);
  const used = [], ambiguous = [];
  const perHypothesis = Object.fromEntries(ordered.map((h) => [h.id, { label: CRYSTAL_HYPOTHESIS_KO[h.id] || h.label, agree: 0, disagree: 0, years: [] }]));
  const perDomain = {};
  for (const s of signals) {
    const { tones, boundary } = resolveTones(periods, { year: s.year, month: s.month });
    const byHypothesis = Object.fromEntries(ordered.map((h) => [h.id, matchOf(s.kind, tones[h.id])]));
    const decisive = Object.values(byHypothesis).some((m) => m === 'agree' || m === 'disagree');
    const row = { year: s.year, month: s.month, domain: s.domain, domainKo: CRYSTAL_DOMAIN_KO[s.domain], kind: s.kind, partial: s.partial, source: s.source, areaAssumed: s.areaAssumed, byHypothesis };
    if (!decisive) {
      if (Object.values(byHypothesis).some((m) => m === 'ambiguous')) ambiguous.push({ ...row, reason: boundary });
      else unused.push({ year: s.year, month: s.month, domain: s.domain, reason: 'no-prediction' });
      continue;
    }
    used.push(row);
    for (const [id, m] of Object.entries(byHypothesis)) {
      if (m !== 'agree' && m !== 'disagree') continue;
      const ph = perHypothesis[id];
      ph[m] += 1;
      if (!ph.years.includes(s.year)) ph.years.push(s.year);
      perDomain[s.domain] ||= {};
      perDomain[s.domain][id] ||= { agree: 0, disagree: 0 };
      perDomain[s.domain][id][m] += 1;
    }
  }
  for (const ph of Object.values(perHypothesis)) { ph.net = ph.agree - ph.disagree; ph.years.sort((a, b) => a - b); }

  // 순위: 근거가 기준(신호 3건·서로 다른 해 2개)을 넘고 다른 모든 선택지보다 2건 이상 더 맞을 때만 우선 후보로 올린다.
  let status, leaderId = null;
  if (!options.length) status = 'insufficient';
  else if (options.length === 1 || !used.length) status = 'base';
  else {
    const scored = options.map((o) => ({ o, ph: perHypothesis[o.id] }));
    const best = [...scored].sort((a, b) => b.ph.net - a.ph.net)[0];
    const enough = best.ph.agree + best.ph.disagree >= CALIBRATION_POLICY.minSignals && best.ph.years.length >= CALIBRATION_POLICY.minYears;
    const leads = scored.every((x) => x === best || best.ph.net - x.ph.net >= CRYSTAL_LIMITS.minLead);
    if (enough && leads && best.ph.agree > best.ph.disagree) { status = 'refined'; leaderId = best.o.id; }
    else status = 'multiple';
  }
  const finalOptions = leaderId ? [options.find((o) => o.id === leaderId), ...options.filter((o) => o.id !== leaderId)] : options;

  const top = finalOptions[0];
  const primaryElements = top ? top.useful.slice(0, 2) : [];
  const supportElements = [];
  if (top) {
    for (const el of [...top.useful.slice(2), ...finalOptions.slice(1).flatMap((o) => o.useful)]) {
      if (supportElements.length >= 2) break;
      if (!primaryElements.includes(el) && !supportElements.includes(el) && !top.avoid.includes(el)) supportElements.push(el);
    }
  }

  // 추가 질문: 선택지끼리 운 판단이 갈리는 지난해 중 아직 답하지 않은 해. 예상 길흉은 내보내지 않는다.
  const followups = [];
  const remaining = CRYSTAL_LIMITS.followups - normalized.asked.length - normalized.entries.filter((e) => e.source === 'followup').length;
  if (status !== 'refined' && status !== 'insufficient' && finalOptions.length >= 2 && remaining > 0) {
    const answered = new Set([...normalized.entries.map((e) => e.year), ...normalized.asked]);
    const [a, b] = finalOptions;
    const strong = [], weak = [];
    for (let y = currentYear - 1; y >= birthYear; y -= 1) {
      if (answered.has(y)) continue;
      const { tones } = resolveTones(periods, { year: y, month: null });
      const ta = tones[a.id], tb = tones[b.id];
      if (ta === 'ambiguous' || tb === 'ambiguous' || ta === tb) continue;
      if (ta !== 'neutral' && tb !== 'neutral') strong.push(y); else weak.push(y);
    }
    for (const y of [...strong, ...weak].slice(0, remaining)) followups.push({ year: y, prompt: `${y}년은 어떤 해로 기억되나요? 좋았던 일, 힘들었던 일, 잘 기억나지 않음 중에서 골라 주세요.` });
  }

  // 설명문(템플릿). "사주 전체에서 본 이유"와 "알려주신 시기를 참고한 이유"를 나눈다.
  const structureReasons = [];
  if (top) {
    const label = CRYSTAL_HYPOTHESIS_KO[top.id] || top.id;
    structureReasons.push(`사주 전체의 흐름을 ${label}에서 보면, ${joinEls(primaryElements)} 기운이 나에게 도움이 되는 기운으로 꼽혀요.`);
    if (supportElements.length) structureReasons.push(`${joinEls(supportElements)} 기운도 다른 관점에서 함께 도움이 되는 기운으로 보여서 보조로 담았어요.`);
    for (const c of natal.yongshin?.conflicts || []) {
      if (primaryElements.includes(c.element) || supportElements.includes(c.element)) structureReasons.push(`${elKo(c.element)} 기운은 힘을 맞추는 관점에서는 조심할 기운이지만, 계절의 온도·습도를 맞추는 데는 필요해서 함께 살펴봐요.`);
    }
    structureReasons.push('사주에 없는 오행이라고 해서 반드시 필요한 오행은 아니에요. 오행의 개수가 아니라 사주 전체의 흐름으로 골랐어요.');
  } else {
    structureReasons.push('사주 정보가 부족해 도움이 되는 기운을 정하지 못했어요. 출생 정보를 확인해 주세요.');
  }
  const experienceReasons = [];
  if (!normalized.entries.length) experienceReasons.push('알려주신 시기가 없어서 사주 전체의 흐름만으로 골랐어요.');
  else if (!used.length) experienceReasons.push('알려주신 시기가 운의 흐름과 비교하기 어려운 때(여러 일이 섞인 해, 운이 바뀌는 경계 등)여서 사주 전체의 흐름을 그대로 따랐어요.');
  else if (status === 'refined') {
    const ph = perHypothesis[leaderId];
    experienceReasons.push(`알려주신 ${ph.years.length}개 해의 일이 ${CRYSTAL_HYPOTHESIS_KO[leaderId] || leaderId}의 흐름과 잘 맞아서, 이 관점을 먼저 두었어요.`);
  } else if (status === 'multiple') {
    experienceReasons.push('알려주신 시기만으로는 어느 관점이 더 잘 맞는지 가르기 어려워, 사주 전체에서 본 순서를 그대로 따랐어요.');
    if (followups.length) experienceReasons.push('몇 해를 더 알려주시면 순서를 더 분명하게 정리할 수 있어요.');
  } else {
    experienceReasons.push('알려주신 시기도 함께 살펴봤어요. 이 사주는 여러 관점이 같은 기운을 가리켜서, 그 기운을 그대로 담았어요.');
  }
  if (ambiguous.length) limitations.push('입춘(2월 초)이나 10년 흐름이 바뀌는 무렵에 걸친 시기는 어느 운인지 갈려서 참고하지 않았어요.');
  if (used.length) experienceReasons.push('한 해가 좋았다고 그 기운을 평생의 기운으로 정하지는 않아요. 참고로만 썼어요.');
  limitations.push(`${CRYSTAL_DISCLAIMER}.`);

  const crystals = top ? pickCrystals(primaryElements, supportElements, catalog) : [];
  return deepFreeze({
    version: CRYSTAL_ENGINE_VERSION, catalogVersion: CATALOG_VERSION, natalAnalysisId: natal.analysisId, periodsKey: periods.periodsKey,
    answersKey, resultKey, status,
    structure: {
      hypotheses, basePriority: options.map((o) => o.id), priority: finalOptions.map((o) => o.id),
      options: finalOptions.map((o) => ({ id: o.id, members: [...o.members], useful: [...o.useful] })),
      primaryElements, supportElements,
      primaryElementsKo: primaryElements.map(elKo), supportElementsKo: supportElements.map(elKo),
      reasons: structureReasons,
    },
    experience: { perHypothesis, perDomain, used, unused, ambiguous, reasons: experienceReasons },
    followups, crystals, limitations,
  });
}
