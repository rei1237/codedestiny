// 원국 글자·지장간·뿌리·합충 관계. 합과 충은 관계 기록일 뿐 글자 수나 오행을 바꾸지 않는다(HAP-01, CHUNG-01).
import {
  STEM_ORDER, BRANCH_ORDER, STEM_EL, BRANCH_EL, STEM_HAP, STEM_CHUNG, BRANCH_LIUHE, BRANCH_CHUNG,
  SAMHAP, BANGHAP, POSITIONS, hiddenLayers, mainHidden, relationOf, tenGod, ELEMENTS,
} from './tables.mjs';

const STEM_SET = new Set(STEM_ORDER);
const BRANCH_SET = new Set(BRANCH_ORDER);
export const CHUNG_ROOT_FACTOR = 0.5;

// 입력: {y,m,d,h:{g,j}}. 시주가 비었으면 hourKnown=false다. 시주 미상은 "시주 없음"이 아니다.
export function normalizeChart(p = {}) {
  const chart = {};
  for (const pos of POSITIONS) {
    const g = String(p?.[pos]?.g || '').trim();
    const j = String(p?.[pos]?.j || '').trim();
    chart[pos] = { g: STEM_SET.has(g) ? g : '', j: BRANCH_SET.has(j) ? j : '' };
  }
  chart.hourKnown = Boolean(chart.h.g && chart.h.j);
  if (!chart.hourKnown) chart.h = { g: '', j: '' };
  chart.monthKnown = Boolean(chart.m.g && chart.m.j);
  chart.dayKnown = Boolean(chart.d.g && chart.d.j);
  return chart;
}

// 시주를 모를 때 그 날 가능한 12개 시주(五鼠遁).
export function possibleHourPillars(dayStem) {
  const dayIndex = STEM_ORDER.indexOf(dayStem);
  if (dayIndex < 0) return [];
  return BRANCH_ORDER.map((j, bi) => ({ g: STEM_ORDER[(dayIndex * 2 + bi) % 10], j }));
}

export const pillarText = (chart, pos) => (chart[pos].g && chart[pos].j ? chart[pos].g + chart[pos].j : null);

export function knownStems(chart) {
  return POSITIONS.filter((pos) => chart[pos].g).map((pos) => ({ pos, char: chart[pos].g, el: STEM_EL[chart[pos].g] }));
}
export function knownBranches(chart) {
  return POSITIONS.filter((pos) => chart[pos].j).map((pos) => ({ pos, char: chart[pos].j, el: BRANCH_EL[chart[pos].j] }));
}
const adjacent = (a, b) => Math.abs(POSITIONS.indexOf(a) - POSITIONS.indexOf(b)) === 1;

export function branchChungPairs(chart) {
  const rows = knownBranches(chart), out = [];
  for (let i = 0; i < rows.length; i++) for (let k = i + 1; k < rows.length; k++) {
    if (BRANCH_CHUNG[rows[i].char] === rows[k].char) out.push({ a: rows[i].pos, b: rows[k].pos, chars: rows[i].char + rows[k].char, adjacent: adjacent(rows[i].pos, rows[k].pos) });
  }
  return out;
}

// 지장간 + 뿌리. 충은 뿌리를 약하게 할 뿐 지우지 않는다.
export function hiddenStemsOf(chart) {
  const dayStem = chart.d.g;
  const chung = branchChungPairs(chart);
  const out = {};
  for (const pos of POSITIONS) {
    const j = chart[pos].j;
    const hitBy = chung.filter((c) => c.a === pos || c.b === pos).map((c) => c.chars);
    out[pos] = j ? hiddenLayers(j).map((h) => ({
      ...h, tenGod: tenGod(dayStem, h.stem), weakenedBy: hitBy.length ? ['충'] : [], chung: hitBy,
      factor: hitBy.length ? CHUNG_ROOT_FACTOR : 1,
    })) : [];
  }
  return out;
}

export function rootsOf(hidden, el) {
  const rows = [];
  for (const pos of POSITIONS) for (const h of hidden[pos] || []) if (h.el === el) rows.push({ pos, stem: h.stem, layer: h.layer, weakenedBy: h.weakenedBy, factor: h.factor });
  return rows;
}
// 실효 뿌리: 충으로 약해지지 않은 정기·중기. 약한 뿌리: 여기이거나 충을 받은 뿌리.
export const isEffectiveRoot = (r) => (r.layer === '정기' || r.layer === '중기') && !r.weakenedBy.length;
export function rootSummary(hidden, el) {
  const list = rootsOf(hidden, el);
  return { list, effective: list.filter(isEffectiveRoot).length, weak: list.filter((r) => !isEffectiveRoot(r)).length, any: list.length };
}

// 천간합. 일간이 낀 합은 화기격 규칙(HUA-01)에서만 판단한다.
export function stemCombinations(chart, hidden) {
  const stems = knownStems(chart), out = [];
  const monthMainEl = chart.m.j ? STEM_EL[mainHidden(chart.m.j)] : '';
  for (let i = 0; i < stems.length; i++) for (let k = i + 1; k < stems.length; k++) {
    const a = stems[i], b = stems[k];
    if (!STEM_HAP[a.char] || STEM_HAP[a.char][0] !== b.char) continue;
    const el = STEM_HAP[a.char][1];
    const others = stems.filter((s) => s !== a && s !== b);
    const competing = others.some((s) => s.char === a.char || s.char === b.char);
    const clashed = others.some((s) => STEM_CHUNG[a.char] === s.char || STEM_CHUNG[b.char] === s.char);
    const seasonal = monthMainEl === el;
    const rootedA = rootsOf(hidden, a.el).length > 0, rootedB = rootsOf(hidden, b.el).length > 0;
    const row = {
      pair: a.char + b.char, positions: [a.pos, b.pos], el, adjacent: adjacent(a.pos, b.pos), involvesDay: a.pos === 'd' || b.pos === 'd',
      checks: { seasonal, competing, clashed, rootedA, rootedB }, removed: null,
    };
    if (row.involvesDay) row.state = '일간합';
    else if (!row.adjacent) row.state = '합(원격)';
    else if (seasonal && !competing && !clashed && !rootedA && !rootedB) row.state = '합화';
    else if (rootedA !== rootedB) { row.state = '합거'; row.removed = rootedA ? b.pos : a.pos; }
    else row.state = '합반';
    out.push(row);
  }
  return out;
}

export function branchRelations(chart) {
  const rows = knownBranches(chart), chars = rows.map((r) => r.char);
  const liuhe = [];
  for (let i = 0; i < rows.length; i++) for (let k = i + 1; k < rows.length; k++) {
    if (BRANCH_LIUHE[rows[i].char]?.[0] === rows[k].char) liuhe.push({ pair: rows[i].char + rows[k].char, positions: [rows[i].pos, rows[k].pos], el: BRANCH_LIUHE[rows[i].char][1], adjacent: adjacent(rows[i].pos, rows[k].pos), state: '합(기록)' });
  }
  const samhap = SAMHAP.map((g) => {
    const present = g.members.filter((c) => chars.includes(c));
    const state = present.length === 3 ? 'full' : present.length === 2 && present.includes(g.members[1]) ? 'half' : present.length ? 'partial' : 'none';
    return { members: g.members.join(''), el: g.el, present: present.join(''), state };
  }).filter((r) => r.state !== 'none');
  const banghap = BANGHAP.map((g) => {
    const present = g.members.filter((c) => chars.includes(c));
    return { members: g.members.join(''), el: g.el, present: present.join(''), state: present.length === 3 ? 'full' : present.length ? 'partial' : 'none' };
  }).filter((r) => r.state !== 'none');
  return { liuhe, samhap, banghap, chung: branchChungPairs(chart) };
}

// 눈에 보이는 글자 수(천간 + 지지 본기 오행, 월지 2배). 합화로 바꾸지 않는다.
export function visibleCounts(chart) {
  const byEl = Object.fromEntries(ELEMENTS.map((e) => [e, 0]));
  let total = 0;
  for (const s of knownStems(chart)) { byEl[s.el]++; total++; }
  for (const b of knownBranches(chart)) { const w = b.pos === 'm' ? 2 : 1; byEl[b.el] += w; total += w; }
  const dayEl = STEM_EL[chart.d.g];
  const byRel = { self: 0, parent: 0, output: 0, wealth: 0, officer: 0 };
  for (const e of ELEMENTS) { const rel = relationOf(dayEl, e); if (rel) byRel[rel] += byEl[e]; }
  return { byEl, byRel, total, basis: '천간 4 + 지지 본기 4, 월지 2배(9칸)' };
}

// 관계별 "눈에 보이는" 글자: 일간 외 천간과 지지 본기.
export function visibleByRelation(chart, rel) {
  const dayEl = STEM_EL[chart.d.g];
  const stems = knownStems(chart).filter((s) => s.pos !== 'd' && relationOf(dayEl, s.el) === rel);
  const branches = knownBranches(chart).filter((b) => relationOf(dayEl, b.el) === rel);
  return { stems, branches, count: stems.length + branches.length };
}
