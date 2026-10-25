// 월령의 기본 구조(GK-*)와 최종 격국. 건록·양인·월겁은 이 프로필에서 일반격 계열이다 [R1].
import { ROK, YANGIN, STEM_YANG, STEM_EL, hiddenLayers, tenGod, relationOf } from './tables.mjs';
import { knownStems, knownBranches } from './relations.mjs';

export const GEOK_BY_TEN_GOD = { 정관: '정관격', 편관: '편관격', 정재: '정재격', 편재: '편재격', 식신: '식신격', 상관: '상관격', 정인: '정인격', 편인: '편인격' };
const SUB_USE = { 정관: '用官', 편관: '用煞', 정재: '用財', 편재: '用財', 식신: '用食傷', 상관: '用食傷' };

// 월지 지장간에서 격을 세울 글자. 투간(일간 외 천간에 같은 글자) 우선.
function pickMonthStem(monthBranch, dayStem, exposed) {
  const layers = hiddenLayers(monthBranch);
  const main = layers[layers.length - 1];
  const isExposed = (h) => exposed.has(h.stem);
  if ('子午卯酉'.includes(monthBranch)) return { ...main, exposed: isExposed(main), rule: '왕지는 정기' };
  if ('寅申巳亥'.includes(monthBranch)) {
    if (isExposed(main)) return { ...main, exposed: true, rule: '생지 정기 투간' };
    const other = layers.slice(0, -1).reverse().find(isExposed);
    return other ? { ...other, exposed: true, rule: '생지 정기 미투, 투간한 중기·여기' } : { ...main, exposed: false, rule: '생지 투간 없음, 정기' };
  }
  // 辰戌丑未: 정기 → 중기 → 여기 순으로 투간한 글자, 비겁이 아닌 글자를 먼저 본다.
  const order = [...layers].reverse();
  const nonSelf = order.find((h) => isExposed(h) && relationOf(STEM_EL[dayStem], h.el) !== 'self');
  const any = order.find(isExposed);
  const chosen = nonSelf || any;
  return chosen ? { ...chosen, exposed: true, rule: '고지 투간 글자' } : { ...main, exposed: false, rule: '고지 투간 없음, 정기' };
}

export function monthStructure(chart) {
  const d = chart.d.g, mb = chart.m.j;
  if (!d || !mb) return { status: 'unknown', name: '', kind: '', reason: '월지 또는 일간 미상' };
  const exposedRows = knownStems(chart).filter((s) => s.pos !== 'd');
  const exposed = new Set(exposedRows.map((s) => s.char));
  const base = { status: 'pass', monthBranch: mb, hidden: hiddenLayers(mb).map((h) => ({ ...h, tenGod: tenGod(d, h.stem), exposed: exposed.has(h.stem) })) };
  let row;
  if (ROK[d] === mb) row = { ...base, name: '건록격', kind: 'rok', ruleId: 'GK-ROK', reason: `월지 ${mb}가 일간 ${d}의 녹(ROK-01)` };
  else if (STEM_YANG[d] && YANGIN[d] === mb) row = { ...base, name: '양인격', kind: 'yangin', ruleId: 'GK-YANGIN', reason: `월지 ${mb}가 양간 ${d}의 양인(YANGIN-01)` };
  else {
    const pick = pickMonthStem(mb, d, exposed);
    const god = tenGod(d, pick.stem);
    if (god === '비견' || god === '겁재') row = { ...base, name: '월겁격', kind: 'yuejie', ruleId: 'GK-ROK', chosen: pick, tenGod: god, reason: `월령에서 취한 ${pick.stem}(${pick.layer})이 ${god}` };
    else row = { ...base, name: GEOK_BY_TEN_GOD[god], kind: 'regular', ruleId: 'GK-REGULAR', chosen: pick, tenGod: god, reason: `월령에서 취한 ${pick.stem}(${pick.layer}, ${pick.rule})이 ${god}`, confident: pick.exposed || '子午卯酉'.includes(mb) };
  }
  if (row.kind !== 'regular') row.subUses = rokSubUses(chart);
  return row;
}

// 「皆以透干支，別取財官煞食為用」: 다른 자리의 재·관·살·식상을 함께 기록한다. 하나로 고르지 않는다.
function rokSubUses(chart) {
  const d = chart.d.g, out = [];
  for (const s of knownStems(chart)) {
    if (s.pos === 'd') continue;
    const god = tenGod(d, s.char);
    if (SUB_USE[god]) out.push({ use: SUB_USE[god], tenGod: god, char: s.char, pos: s.pos, source: '천간 투출' });
  }
  for (const b of knownBranches(chart)) {
    if (b.pos === 'm') continue;
    const main = hiddenLayers(b.char).slice(-1)[0];
    const god = tenGod(d, main.stem);
    if (SUB_USE[god]) out.push({ use: SUB_USE[god], tenGod: god, char: b.char, pos: b.pos, source: '지지 본기' });
  }
  return out;
}

export const FAMILY_KO = { general: '일반격', follow: '종격(종재·종살)', 'follow-output': '종아격', vigorous: '전왕 계열', transform: '화기격', pending: '판정 보류' };

export function finalGyeokguk(month, special) {
  const general = month.status === 'pass' ? month.name : '';
  if (special.decision === 'special') {
    const a = special.adopted;
    return { name: a.name, family: a.family, type: '특수격', ruleId: a.ruleId, isGa: a.isGa, monthStructure: general, reason: `${a.name}의 필수조건을 모두 충족` };
  }
  return {
    name: general || '미정', family: 'general', type: general ? '일반격' : '참고', ruleId: month.ruleId || '', isGa: false, monthStructure: general,
    pendingSpecial: special.decision === 'pending' ? special.pending : [],
    reason: general ? month.reason : '월령 정보가 부족해 격을 세우지 않음',
  };
}
