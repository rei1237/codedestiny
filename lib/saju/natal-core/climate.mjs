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
