// Service rule profile, not a claim of consensus among schools. See saju-tomb-policy.md.
import { STEM_EL, BRANCH_EL, GENERATES, STEM_HAP, BRANCH_LIUHE, BRANCH_CHUNG, SAMHAP, BANGHAP, POSITIONS, POS_KO, EL_KO, hiddenLayers, tenGod } from './tables.mjs';

export const SAJU_TOMB_VERSION = 'saju-tomb-conditional-v1';
export const TOMB_BRANCH = Object.freeze({ 甲: '未', 乙: '戌', 丙: '戌', 丁: '丑', 戊: '戌', 己: '丑', 庚: '丑', 辛: '辰', 壬: '辰', 癸: '未' });
export const TOMB_STATUS_KO = Object.freeze({ candidate: '입묘 후보', activated: '입묘 작용', mitigated: '완화 조건 있음', pending: '판단 보류' });
export const TOMB_VERDICT_KO = Object.freeze({ beneficial: '부담을 덜 수 있는 흐름', adverse: '도움이 약해질 수 있는 흐름', mixed: '도움과 주의가 함께 있는 흐름', undetermined: '길흉 판단 보류' });
export const TOMB_READING_RULE = '입묘는 기운의 작용이 제한되는 조건부 해석이며 죽음·사고를 뜻하지 않는다. 묘처·오행의 창고·개고는 구별한다. 판정된 대상과 기간만 사용하고, 원국 글자·오행 개수·점수를 바꾸지 않는다. 기신 억제는 유리한 방향, 용희신 손상은 주의할 방향이나 미평가·혼재·완화 조건을 함께 설명한다.';

function roleOf(element, core) {
  const y = core.yongshin;
  if (!y || core.special?.decision === 'pending') return { role: 'undetermined', basis: '구조 용신 미평가' };
  if (y.conflicts?.some(row => row.element === element)) return { role: 'conflicted', basis: '억부·조후 판단이 엇갈림' };
  if (y.special) return { role: y.special.follow?.includes(element) ? 'useful' : 'undetermined', basis: '성립한 특수격의 순세 후보' };
  if (y.eokbu?.applies === false) return { role: 'undetermined', basis: '억부 적용 제외' };
  const useful = y.eokbu?.useful?.includes(element), harmful = y.eokbu?.avoid?.includes(element);
  if (useful && harmful) return { role: 'conflicted', basis: '희기 후보가 겹침' };
  if (harmful && ['hanNan', 'joSeup'].some(axis => core.climate?.[axis]?.type === 'insufficient')) return { role: 'undetermined', basis: '조후 근거 부족' };
  return { role: useful ? 'useful' : harmful ? 'harmful' : 'undetermined', basis: '억부 후보와 조후 충돌 여부' };
}

export function tombOverall(events) {
  const active = events.filter(row => row.status === 'activated');
  const directions = new Set(active.map(row => row.verdict));
  if (directions.has('beneficial') && directions.has('adverse')) return 'mixed';
  if (!active.length || directions.has('undetermined')) return 'undetermined';
  return active[0].verdict;
}

export function analyzeTombFrame(chart, core, luckRows = [], period = { id: 'natal', label: '원국' }) {
  const rows = POSITIONS.filter(pos => chart[pos]?.j).map(pos => ({
    id: pos, label: `${POS_KO[pos]}주`, stem: chart[pos].g, branch: chart[pos].j, scope: 'natal',
  })).concat(luckRows.map((row, i) => ({ ...row, id: `${row.scope}:${row.year || row.startDate || row.startYear || row.age || i}:${row.stem}${row.branch}`, label: row.label || `${row.stem}${row.branch}` })));
  const targets = rows.flatMap(row => [
    ...(STEM_EL[row.stem] ? [{ stem: row.stem, origin: 'stem', position: row.id, label: row.label, layer: null }] : []),
    ...hiddenLayers(row.branch).map(h => ({ stem: h.stem, origin: 'hidden', position: row.id, label: row.label, layer: h.layer })),
  ]);
  const isClashed = row => rows.some(other => other.id !== row.id && BRANCH_CHUNG[row.branch] === other.branch);
  const rootRows = element => rows.flatMap(row => hiddenLayers(row.branch)
    .filter(h => h.el === element).map(h => ({ position: row.id, branch: row.branch, stem: h.stem, layer: h.layer, weakened: isClashed(row) })));
  const events = [];
  for (const storage of rows) for (const target of targets) {
    if (TOMB_BRANCH[target.stem] !== storage.branch) continue;
    const element = STEM_EL[target.stem];
    const triggers = rows.filter(row => row.id !== storage.id && BRANCH_CHUNG[storage.branch] === row.branch);
    const roots = rootRows(element).filter(root => root.position !== storage.id);
    const effectiveRoots = roots.filter(root => root.layer !== '여기' && !root.weakened);
    const monthElement = BRANCH_EL[chart.m?.j];
    const seasonalSupport = Boolean(monthElement && (monthElement === element || GENERATES[monthElement] === element));
    const exposed = rows.filter(row => row.stem === target.stem).map(row => row.id);
    const rootedSupport = rows.filter(row => row.id !== target.position && (STEM_EL[row.stem] === element || GENERATES[STEM_EL[row.stem]] === element)
      && rootRows(STEM_EL[row.stem]).some(root => root.layer !== '여기' && !root.weakened && root.position !== storage.id)).map(row => row.id);
    const combinationConflict = rows.some(row => row.id !== storage.id && BRANCH_LIUHE[storage.branch]?.[0] === row.branch)
      || (exposed.length > 0 && rows.some(row => STEM_HAP[target.stem]?.[0] === row.stem))
      || [...SAMHAP, ...BANGHAP].some(group => group.members.includes(storage.branch) && group.members.every(branch => rows.some(row => row.branch === branch)));
    const { role, basis } = roleOf(element, core);
    let status = !triggers.length ? 'candidate' : !chart.monthKnown || !chart.dayKnown || combinationConflict ? 'pending'
      : effectiveRoots.length || seasonalSupport || rootedSupport.length ? 'mitigated' : 'activated';
    if (core.status !== 'ok') status = 'pending';
    const verdict = status === 'activated' ? role === 'harmful' ? 'beneficial' : role === 'useful' ? 'adverse' : 'undetermined' : 'undetermined';
    const reasons = [`${target.stem}의 묘처는 ${storage.branch}`, triggers.length ? `${storage.branch}${triggers[0].branch}충이 같은 시기에 작용` : '묘처는 있으나 충에 의한 작용 조건 없음'];
    const mitigations = [];
    if (effectiveRoots.length) mitigations.push('묘처 밖에 살아 있는 정기·중기 뿌리가 있음');
    if (seasonalSupport) mitigations.push('월령이 대상 기운을 돕고 있음');
    if (rootedSupport.length) mitigations.push('뿌리 있는 천간의 생조가 남아 있음');
    if (combinationConflict) mitigations.push('합과 충의 작용이 겹쳐 우선순위 판단 보류');
    if (role === 'conflicted' || role === 'undetermined') mitigations.push(basis);
    events.push({ id: [period.id, target.position, target.origin, target.stem, storage.id].join('/'), target: { ...target, element, tenGod: tenGod(chart.d?.g, target.stem) },
      tomb: { branch: storage.branch, position: storage.id, label: storage.label }, triggers: triggers.map(row => ({ branch: row.branch, position: row.id, label: row.label })),
      period, status, role, roleBasis: basis, verdict, evidence: { roots, seasonalSupport, exposed, rootedSupport, combinationConflict }, reasons, mitigations });
  }
  return { version: SAJU_TOMB_VERSION, period, events, verdict: tombOverall(events), rule: TOMB_READING_RULE };
}

export function tombReadingRows(analysis) {
  return (analysis?.events || []).map(row => ({
    id: row.id, status: row.status, verdict: row.verdict,
    title: `${row.target.label} ${row.target.origin === 'hidden' ? '지장간 ' : ''}${row.target.stem}(${EL_KO[row.target.element]}) · ${TOMB_STATUS_KO[row.status]}`,
    period: row.period.label,
    description: `${row.reasons.join('. ')}. ${row.status === 'activated' ? (row.role === 'useful' ? '도움이 되는 용희신 후보의 작용이 제한됩니다. ' : row.role === 'harmful' ? '부담이 되는 기신 후보의 작용이 제한됩니다. ' : '') + row.roleBasis + '. ' + TOMB_VERDICT_KO[row.verdict] + '.' : '입묘로 길흉을 단정하지 않습니다.'}`,
    conditions: row.mitigations,
  }));
}

// Lossless provider table: identical judgments share their target list. Raw stored
// events retain every occurrence and root. A named column keeps each direction
// explicit even in consumers that omit generic numeric 'verdict' fields.
export function tombPromptFacts(analysis) {
  if (!analysis) return null;
  const groups = new Map();
  for (const row of analysis.events || []) {
    const target = row.target.label + ' ' + (row.target.origin === 'hidden' ? '지장간 ' : '') + row.target.stem;
    const conditions = row.mitigations.map(text => ({
      '묘처 밖에 살아 있는 정기·중기 뿌리가 있음': '묘처 밖 실효 정기·중기 통근',
      '월령이 대상 기운을 돕고 있음': '월령의 생조',
      '뿌리 있는 천간의 생조가 남아 있음': '뿌리 있는 천간의 생조',
      '합과 충의 작용이 겹쳐 우선순위 판단 보류': '합충 경합으로 우선순위 보류',
    })[text] || text);
    // The first reason restates the target stem and tomb already in the table.
    const values = [row.tomb.label + ' ' + row.tomb.branch, row.status, row.role, row.roleBasis, row.verdict, row.reasons.slice(1), conditions];
    const key = JSON.stringify([row.period.label, values]);
    const group = groups.get(key);
    if (group) group.targets.push(target);
    else groups.set(key, { period: row.period.label, targets: [target], values });
  }
  return { version: analysis.version, rule: analysis.rule, limitations: analysis.limitations || [],
    eventColumns: ['대상(각 출처)', '묘처', '상태', '희기 역할', '희기 근거', '작용 방향', '작용 근거', '완화·보류 조건'],
    events: [...groups.values()].map(({period, targets, values}) => ({ period, values: [targets, ...values] })),
  };
}
