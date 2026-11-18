// CLIMATE-01: 한난과 조습은 별개의 축이다 [R6]. 점수 규칙은 js/saju-engine.js analyzeJohu와 같다.
// 월 누락·계산 실패는 균형이 아니라 insufficient다. 시주 미상은 가능한 12개 시주가 모두 같은 판정일 때만 확정한다.
import { STEM_EL, BRANCH_EL } from './tables.mjs';
import { normalizeChart, possibleHourPillars, visibleCounts } from './relations.mjs';

const BRANCH_TEMP = { 子: -4, 丑: -4, 寅: -1, 卯: 1, 辰: 2, 巳: 3, 午: 4, 未: 4, 申: 1, 酉: -1, 戌: -2, 亥: -3 };
const SEASON = { 寅: '봄', 卯: '봄', 辰: '봄', 巳: '여름', 午: '여름', 未: '여름', 申: '가을', 酉: '가을', 戌: '가을', 亥: '겨울', 子: '겨울', 丑: '겨울' };
export const JOHU_NEED = {
  hot: ['water', 'metal'], warm: ['water', 'metal'], cold: ['fire', 'wood'], cool: ['fire', 'wood'],
  dry: ['water', 'wood'], wet: ['fire', 'earth'],
};

function score(chart) {
  let temp = BRANCH_TEMP[chart.m.j];
  let moist = 0, dry = 0;
  const counts = { fc: 0, wc: 0, wdc: 0, mc: 0 };
  for (const pos of ['y', 'm', 'd', 'h']) for (const c of [chart[pos].g, chart[pos].j]) {
    if (!c) continue;
    const e = STEM_EL[c] || BRANCH_EL[c];
    if (e === 'fire') { temp += 1.5; counts.fc++; dry++; } else if (e === 'water') { temp -= 1.5; counts.wc++; moist++; } else if (e === 'wood') { temp += 0.5; counts.wdc++; moist++; } else if (e === 'metal') { temp -= 0.5; counts.mc++; dry++; }
    if (BRANCH_EL[c]) { if (c === '辰' || c === '丑') moist++; if (c === '戌' || c === '未') dry++; }
  }
  return { temp, moist, dry, diff: moist - dry, counts };
}
export const tempType = (s) => (s >= 5 ? 'hot' : s >= 2 ? 'warm' : s >= -2 ? 'neutral' : s >= -5 ? 'cool' : 'cold');
export const moistType = (d) => (d >= 3 ? 'wet' : d <= -3 ? 'dry' : 'balanced');
const NEED = { hot: 'high', cold: 'high', warm: 'some', cool: 'some', neutral: 'low' };
const moistNeed = (d) => (Math.abs(d) >= 5 ? 'high' : Math.abs(d) >= 3 ? 'some' : 'low');

export function analyzeClimate(p) {
  const chart = normalizeChart(p);
  const insufficient = (reason) => ({ type: 'insufficient', reason });
  if (!chart.monthKnown || !chart.dayKnown || !(chart.m.j in BRANCH_TEMP)) {
    return { complete: false, hourKnown: chart.hourKnown, season: '', hanNan: insufficient('월지 미상'), joSeup: insufficient('월지 미상'), needLevel: { hanNan: 'unknown', joSeup: 'unknown' }, supplements: {} };
  }
  const variants = chart.hourKnown ? [chart] : possibleHourPillars(chart.d.g).map((h) => ({ ...chart, h }));
  const rows = variants.map(score);
  if (rows.some((r) => !Number.isFinite(r.temp) || !Number.isFinite(r.diff))) {
    return { complete: false, hourKnown: chart.hourKnown, season: SEASON[chart.m.j], hanNan: insufficient('계산 실패'), joSeup: insufficient('계산 실패'), needLevel: { hanNan: 'unknown', joSeup: 'unknown' }, supplements: {} };
  }
  const temps = [...new Set(rows.map((r) => tempType(r.temp)))];
  const moists = [...new Set(rows.map((r) => moistType(r.diff)))];
  const base = chart.hourKnown ? rows[0] : score(chart);
  const hourNote = chart.hourKnown ? '' : '시주 미상';
  const hanNan = temps.length === 1
    ? { type: temps[0], score: rows[0].temp, basis: [`월지 ${chart.m.j}(${SEASON[chart.m.j]}) ${BRANCH_TEMP[chart.m.j]}`, `화 ${base.counts.fc} · 수 ${base.counts.wc} · 목 ${base.counts.wdc} · 금 ${base.counts.mc}`], ...(hourNote ? { note: `${hourNote}: 가능한 12개 시주 모두 같은 판정` } : {}) }
    : { type: 'insufficient', reason: `${hourNote}: 시주에 따라 ${temps.join('/')}로 갈림`, possible: temps };
  const joSeup = moists.length === 1
    ? { type: moists[0], diff: rows[0].diff, moistCnt: rows[0].moist, dryCnt: rows[0].dry, basis: [`습 ${base.moist} · 조 ${base.dry} (辰丑 습, 戌未 조 포함)`], ...(hourNote ? { note: `${hourNote}: 가능한 12개 시주 모두 같은 판정` } : {}) }
    : { type: 'insufficient', reason: `${hourNote}: 시주에 따라 ${moists.join('/')}로 갈림`, possible: moists };
  const counts = visibleCounts(chart).byEl;
  const present = (type) => Object.fromEntries((JOHU_NEED[type] || []).map((e) => [e, counts[e]]));
  return {
    complete: chart.hourKnown, hourKnown: chart.hourKnown, season: SEASON[chart.m.j],
    hanNan, joSeup,
    needLevel: { hanNan: NEED[hanNan.type] || 'unknown', joSeup: joSeup.type === 'insufficient' ? 'unknown' : moistNeed(joSeup.diff) },
    supplements: { hanNan: { needed: JOHU_NEED[hanNan.type] || [], presentInChart: present(hanNan.type) }, joSeup: { needed: JOHU_NEED[joSeup.type] || [], presentInChart: present(joSeup.type) } },
    legacyScore: { score: base.temp, diff: base.diff, moistCnt: base.moist, dryCnt: base.dry, ...base.counts },
  };
}

// ── CLIMATE-02 (climate-v2) ──────────────────────────────────────────────────
// 위 analyzeClimate(CLIMATE-01)는 글자 수만 센다. v2는 두 축(moist 조↔습, temp 한↔열)의 벡터를 쓰고,
// 지지는 지장간 일수 가중 평균 + 계절 기후로 계산한다. 2026-11-18 사용자 결정(원문은 docs/CONTEXT_AUDIT.md).
// 수치는 서비스 정책값이며 고전 원문의 수치가 아니다. 순서 관계(乙>甲, 午>巳, 己>戊, 丑이 辰보다 참)는 테스트로 고정한다.
export const CLIMATE_V2_VERSION = 'climate-v2';
const r2 = (n) => Math.round(n * 100) / 100;
const STEM_VECTORS = {
  甲: { moist: 2, temp: 0.5, note: '목은 습하다. 양목이라 乙보다 덜 습하고, 화가 있으면 더 줄인다' },
  乙: { moist: 3, temp: 0, note: '음목·화초. 매우 습하다. 화가 있어도 줄이지 않는다' },
  丙: { moist: -2.5, temp: 3, note: '태양. 건조하고 뜨겁다' },
  丁: { moist: -2, temp: 2.5, note: '등불. 건조하고 뜨겁다' },
  戊: { moist: -1, temp: 0.5, note: '양토·마른 흙. 조토 쪽' },
  己: { moist: 1.5, temp: 0, note: '음토·젖은 논밭흙. 습토' },
  庚: { moist: 0, temp: -1.5, note: '금은 차다. 습도는 중립' },
  辛: { moist: 0, temp: -1.5, note: '금은 차다. 습도는 중립' },
  壬: { moist: 2.5, temp: -2, note: '큰물. 습하고 차다' },
  癸: { moist: 3, temp: -2, note: '비·이슬. 가장 적시고 차다' },
};
// 지장간 월률 일수(여기→중기→정기, tables.mjs HIDDEN과 같은 순서). 합 30일.
const HIDDEN_DAYS = {
  子: [['壬', 10], ['癸', 20]], 丑: [['癸', 9], ['辛', 3], ['己', 18]], 寅: [['戊', 7], ['丙', 7], ['甲', 16]],
  卯: [['甲', 10], ['乙', 20]], 辰: [['乙', 9], ['癸', 3], ['戊', 18]], 巳: [['戊', 7], ['庚', 7], ['丙', 16]],
  午: [['丙', 10], ['己', 9], ['丁', 11]], 未: [['丁', 9], ['乙', 3], ['己', 18]], 申: [['戊', 7], ['壬', 7], ['庚', 16]],
  酉: [['庚', 10], ['辛', 20]], 戌: [['辛', 9], ['丁', 3], ['戊', 18]], 亥: [['戊', 7], ['甲', 7], ['壬', 16]],
};
// 지지가 가진 계절 기후. 지장간만 더하면 未가 습하고 丑이 차지 않게 나와서 계절 항을 더한다.
const SEASON_TERMS = {
  子: { moist: 0.5, temp: -2, note: '한겨울, 얼어 있는 물기' },
  丑: { moist: 0.5, temp: -2, note: '늦겨울, 언 땅의 물기' },
  寅: { moist: 0.5, temp: -0.5, note: '이른 봄, 남은 추위와 녹는 물기' },
  卯: { moist: 1, temp: 0.5, note: '봄비' },
  辰: { moist: 1, temp: 1, note: '늦봄, 물을 머금은 땅(水庫)' },
  巳: { moist: -1, temp: 1.5, note: '초여름, 마르기 시작하는' },
  午: { moist: -1, temp: 2, note: '한여름 열기' },
  未: { moist: -2, temp: 2, note: '늦여름, 열에 마른 흙' },
  申: { moist: -0.5, temp: 0.5, note: '초가을, 남은 더위' },
  酉: { moist: -0.5, temp: -0.5, note: '가을의 건조함' },
  戌: { moist: -1, temp: -1, note: '늦가을, 마른 흙' },
  亥: { moist: 0.5, temp: -1.5, note: '초겨울 물기' },
};
function branchVector(branch) {
  const rows = HIDDEN_DAYS[branch];
  const total = rows.reduce((sum, [, days]) => sum + days, 0);
  const season = SEASON_TERMS[branch];
  const moist = rows.reduce((sum, [stem, days]) => sum + STEM_VECTORS[stem].moist * days, 0) / total + season.moist;
  const temp = rows.reduce((sum, [stem, days]) => sum + STEM_VECTORS[stem].temp * days, 0) / total + season.temp;
  return { moist: r2(moist), temp: r2(temp), note: `지장간 ${rows.map(([s, d]) => s + d).join('·')}일 가중 평균 + 계절(${season.note})` };
}
const FIRE_CHARS = ['丙', '丁', '巳', '午'];
const BRANCH_VECTORS = Object.fromEntries(Object.keys(HIDDEN_DAYS).map((b) => [b, branchVector(b)]));
// 기준점: 여덟 글자가 고르게 나올 때의 기대 가중 평균. 목·수·己가 모두 습해서 기대값 자체가 습 쪽(약 +0.5)이므로
// 평균이 이 기준점에서 얼마나 벗어났는지로 등급을 매긴다. 표에서 계산하므로 벡터를 고치면 함께 바뀐다.
function expected(axis) {
  const mean = (rows) => rows.reduce((s, v) => s + v[axis], 0) / rows.length;
  const stemW = 1 + 1.5 + 1 + 1.5, branchW = 1 + 2 + 1.5 + 1;
  return r2((mean(Object.values(STEM_VECTORS)) * stemW + mean(Object.values(BRANCH_VECTORS)) * branchW) / (stemW + branchW));
}
export const CLIMATE_VECTORS = Object.freeze({
  version: CLIMATE_V2_VERSION,
  stems: STEM_VECTORS,
  hiddenDays: HIDDEN_DAYS,
  seasonTerms: SEASON_TERMS,
  branches: BRANCH_VECTORS,
  baseline: { moist: expected('moist'), temp: expected('temp'), note: '여덟 글자가 고르게 나올 때의 기대 가중 평균. 등급은 (평균 - 기준점)으로 매긴다' },
  weights: { monthBranch: 2, adjacentToDayStem: 1.5, other: 1, luck: 1, note: '월지 2배. 일간에 붙은 월간·시간·일지 1.5배. 운의 글자는 1배' },
  fireDampening: { chars: ['甲', '寅'], fireChars: FIRE_CHARS, factor: 0.5, note: '원국(또는 원국+운)에 丙丁巳午가 있으면 甲·寅의 습기만 절반으로 본다. 乙·卯는 줄이지 않는다' },
  // (축별 가중 평균 - 기준점)의 절댓값 기준.
  levels: { mild: 0.5, strong: 1.0, extreme: 1.6 },
});

const LEVELS = ['balanced', 'mild', 'strong', 'extreme'];
const levelOf = (avg) => {
  const a = Math.abs(avg), t = CLIMATE_VECTORS.levels;
  return a >= t.extreme ? 'extreme' : a >= t.strong ? 'strong' : a >= t.mild ? 'mild' : 'balanced';
};
const rank = (level) => LEVELS.indexOf(level);
const CHAR_KO = { 甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계', 子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해' };
const ko = (c) => `${c}(${CHAR_KO[c]})`;
const NEED_CHARS = { fire: ['丙', '丁', '巳', '午'], water: ['壬', '癸', '亥', '子'], wood: ['甲', '乙', '寅', '卯'], dryEarth: ['戊', '未', '戌'], wetEarth: ['己', '辰', '丑'] };

function positionWeight(pos, kind) {
  const w = CLIMATE_VECTORS.weights;
  if (pos === 'm' && kind === 'j') return w.monthBranch;
  if ((pos === 'm' && kind === 'g') || (pos === 'h' && kind === 'g') || (pos === 'd' && kind === 'j')) return w.adjacentToDayStem;
  return w.other;
}

function rawClimate(chart, luck) {
  const items = [];
  for (const pos of ['y', 'm', 'd', 'h']) for (const kind of ['g', 'j']) {
    const char = chart[pos][kind];
    if (char) items.push({ pos, kind, char, weight: positionWeight(pos, kind) });
  }
  for (const row of luck) {
    if (STEM_VECTORS[row.stem]) items.push({ pos: row.scope || 'luck', kind: 'g', char: row.stem, weight: CLIMATE_VECTORS.weights.luck });
    if (HIDDEN_DAYS[row.branch]) items.push({ pos: row.scope || 'luck', kind: 'j', char: row.branch, weight: CLIMATE_VECTORS.weights.luck });
  }
  const fireContext = items.some((i) => FIRE_CHARS.includes(i.char));
  const contributions = items.map((i) => {
    const v = STEM_VECTORS[i.char] || CLIMATE_VECTORS.branches[i.char];
    const dampened = fireContext && CLIMATE_VECTORS.fireDampening.chars.includes(i.char) && v.moist > 0;
    const moist = (dampened ? v.moist * CLIMATE_VECTORS.fireDampening.factor : v.moist) * i.weight;
    return { ...i, moist: r2(moist), temp: r2(v.temp * i.weight), dampened };
  });
  const weight = items.reduce((s, i) => s + i.weight, 0);
  const totals = { moist: r2(contributions.reduce((s, c) => s + c.moist, 0)), temp: r2(contributions.reduce((s, c) => s + c.temp, 0)), weight };
  const average = { moist: r2(totals.moist / (weight || 1)), temp: r2(totals.temp / (weight || 1)) };
  const deviation = { moist: r2(average.moist - CLIMATE_VECTORS.baseline.moist), temp: r2(average.temp - CLIMATE_VECTORS.baseline.temp) };
  const temp = { dir: deviation.temp < 0 ? 'cold' : 'hot', level: levelOf(deviation.temp) };
  const moist = { dir: deviation.moist < 0 ? 'dry' : 'wet', level: levelOf(deviation.moist) };
  const t = temp.level === 'balanced' ? '' : temp.dir === 'cold' ? '한' : '열';
  const m = moist.level === 'balanced' ? '' : moist.dir === 'wet' ? '습' : '조';
  const type = !t && !m ? '균형' : t === '열' && m === '조' ? '조열' : t === '열' && m === '습' ? '습열' : t + m;
  const severity = LEVELS[Math.max(rank(temp.level), rank(moist.level))];
  // 조후가 급한 경우: 한난이 strong 이상이거나 조습이 extreme.
  const urgent = rank(temp.level) >= rank('strong') || moist.level === 'extreme';
  return { fireContext, contributions, totals, average, deviation, classification: { type, severity, temp, moist }, urgent };
}

function needsOf({ temp, moist }) {
  const elements = [], avoid = [], chars = [];
  const add = (list, v) => { if (!list.includes(v)) list.push(v); };
  const axes = [
    { ...temp, r: rank(temp.level) },
    { ...moist, r: rank(moist.level) },
  ].filter((a) => a.level !== 'balanced').sort((a, b) => b.r - a.r);
  const wetToo = moist.level !== 'balanced' && moist.dir === 'wet';
  for (const a of axes) {
    // 한습이면 목(습)은 필요에서 뺀다. 더 강한 축이 먼저 정한 방향을 약한 축이 뒤집지 않는다.
    const want = a.dir === 'cold' ? (wetToo ? ['fire'] : ['fire', 'wood'])
      : a.dir === 'hot' ? ['water', 'metal'] : a.dir === 'wet' ? ['fire', 'earth'] : ['water', 'wood'];
    const not = a.dir === 'cold' ? ['water', 'metal'] : a.dir === 'hot' ? ['fire'] : a.dir === 'wet' ? ['water'] : ['fire'];
    for (const el of want) if (!avoid.includes(el)) add(elements, el);
    for (const el of not) if (!elements.includes(el)) add(avoid, el);
    const c = a.dir === 'cold' ? NEED_CHARS.fire : a.dir === 'hot' ? [...NEED_CHARS.water, ...NEED_CHARS.wetEarth]
      : a.dir === 'wet' ? [...NEED_CHARS.fire, ...NEED_CHARS.dryEarth] : [...NEED_CHARS.water, ...NEED_CHARS.wetEarth];
    for (const ch of c) add(chars, ch);
  }
  return { elements, avoid, chars };
}

const TYPE_TEXT = {
  한습: '전체적으로 차고 축축한 사주라, 따뜻하고 보송하게 해 주는 불(火) 기운이 먼저 필요해요.',
  조열: '전체적으로 뜨겁고 메마른 사주라, 열을 식히고 적셔 주는 물(水) 기운이 먼저 필요해요.',
  한조: '차고 메마른 편이라, 따뜻한 기운과 적당한 물기를 함께 채워 주면 좋아요.',
  습열: '덥고 눅눅한 편이라, 열과 습기를 함께 덜어 주는 쪽이 편해요.',
  한: '차가운 편이라, 따뜻한 불(火) 기운이 힘이 돼요.',
  열: '뜨거운 편이라, 식혀 주는 물(水)·금(金) 기운이 힘이 돼요.',
  습: '습기가 많은 편이라, 말려 주는 불(火)·마른 흙 기운이 힘이 돼요.',
  조: '건조한 편이라, 적셔 주는 물(水)·나무(木) 기운이 힘이 돼요.',
  균형: '온도와 습도가 크게 치우치지 않아, 조후보다 다른 균형을 먼저 봐요.',
};
function reasonsOf(chart, raw) {
  const out = [];
  const mj = chart.m.j;
  out.push(`태어난 달 ${ko(mj)}은 ${SEASON_TERMS[mj].note} 기운이 바탕이에요.`);
  const c = raw.classification;
  const dominant = c.moist.level !== 'balanced' && rank(c.moist.level) >= rank(c.temp.level) ? 'moist' : c.temp.level !== 'balanced' ? 'temp' : '';
  if (dominant) {
    const sign = dominant === 'moist' ? (c.moist.dir === 'wet' ? 1 : -1) : (c.temp.dir === 'hot' ? 1 : -1);
    const top = [...new Set(raw.contributions.filter((r) => !(r.pos === 'm' && r.kind === 'j') && r[dominant] * sign > 0)
      .sort((a, b) => b[dominant] * sign - a[dominant] * sign).map((r) => r.char))].slice(0, 2);
    const word = dominant === 'moist' ? (sign > 0 ? '습기를 더해요' : '메마르게 해요') : (sign > 0 ? '열기를 더해요' : '차가움을 더해요');
    if (top.length) out.push(`${top.map(ko).join('·')} 같은 글자가 ${word}.`);
  }
  if (raw.contributions.some((r) => r.dampened)) out.push('불 기운(丙·丁·巳·午)이 있어 甲·寅의 습기는 덜하게 봤어요. 乙·卯는 그래도 많이 습해요.');
  if (raw.contributions.some((r) => r.char === '午')) out.push('午(오)는 불이지만 안에 己土를 품고 있어 약간의 물기가 있어요.');
  out.push(TYPE_TEXT[c.type]);
  return out;
}

// p: {y,m,d,h:{g,j}}. context.luck: [{stem, branch, scope}] 함께 볼 운의 글자(선택).
export function climateV2(p, context = {}) {
  const chart = normalizeChart(p);
  const luck = Array.isArray(context.luck) ? context.luck : [];
  const base = { version: CLIMATE_V2_VERSION, hourKnown: chart.hourKnown };
  if (!chart.monthKnown || !chart.dayKnown || !(chart.m.j in HIDDEN_DAYS)) {
    return {
      ...base, complete: false, status: 'insufficient', fireContext: false, totals: null, average: null, deviation: null,
      classification: { type: 'insufficient', severity: 'unknown' }, urgent: false, needs: { elements: [], avoid: [], chars: [] },
      reasons: ['태어난 달이나 날을 몰라 온도·습도를 판단하지 않아요.'], contributions: [],
    };
  }
  const raw = rawClimate(chart, luck);
  let classification = raw.classification, urgent = raw.urgent, status = 'ok', note = '';
  if (!chart.hourKnown) {
    // CLIMATE-01과 같은 원칙: 가능한 12개 시주가 모두 같은 판정일 때만 확정한다.
    const variants = possibleHourPillars(chart.d.g).map((h) => rawClimate({ ...chart, h }, luck));
    const types = [...new Set(variants.map((v) => v.classification.type))];
    if (types.length > 1) { status = 'insufficient'; classification = { type: 'insufficient', severity: 'unknown', possible: types }; urgent = false; }
    else { classification = variants[0].classification; urgent = variants.every((v) => v.urgent); note = '시주 미상: 가능한 12개 시주 모두 같은 판정'; }
  }
  const ok = status === 'ok';
  return {
    ...base, complete: chart.hourKnown, status, ...(note ? { note } : {}),
    fireContext: raw.fireContext, totals: raw.totals, average: raw.average, deviation: raw.deviation,
    classification, urgent,
    needs: ok ? needsOf(classification) : { elements: [], avoid: [], chars: [] },
    reasons: ok ? reasonsOf(chart, { ...raw, classification }) : ['태어난 시를 몰라 시주에 따라 온도·습도 판정이 갈려서 단정하지 않아요.'],
    contributions: raw.contributions,
  };
}
