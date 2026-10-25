// 월령의 기본 구조(GK-*)와 최종 격국. 건록·양인·월겁은 이 프로필에서 일반격 계열이다 [R1].
import { ROK, YANGIN, STEM_YANG, STEM_EL, STEM_KO, BRANCH_KO, hiddenLayers, tenGod, relationOf } from './tables.mjs';
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
    // 「月令祿劫，不能為用」: 투간한 중기·여기라도 비겁이면 취하지 않는다(고지와 같은 기준).
    const other = layers.slice(0, -1).reverse().find((h) => isExposed(h) && relationOf(STEM_EL[dayStem], h.el) !== 'self');
    return other ? { ...other, exposed: true, rule: '생지 정기 미투, 투간한 중기·여기' } : { ...main, exposed: false, rule: '생지 비겁 외 투간 없음, 정기' };
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
    else row = { ...base, name: GEOK_BY_TEN_GOD[god], kind: 'regular', ruleId: 'GK-REGULAR', chosen: pick, tenGod: god, reason: `월령에서 취한 ${pick.stem}(${pick.layer}, ${pick.rule})이 ${god}`, confident: pick.exposed };
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

// 받침 유무로 조사를 고른다. 괄호 속 한자는 건너뛴다.
function josa(word, withBatchim, withoutBatchim) {
  const text = String(word || '').replace(/\([^)]*\)$/, '');
  const code = text.charCodeAt(text.length - 1) - 0xac00;
  const batchim = code >= 0 && code <= 11171 ? code % 28 : 0;
  // ㄹ 받침 뒤 '으로'는 '로'다.
  return String(word || '') + (batchim && !(batchim === 8 && withBatchim === '으로') ? withBatchim : withoutBatchim);
}
const SUB_USE_KO = { 用官: '용관(用官)', 用煞: '용살(用煞)', 用財: '용재(用財)', 用食傷: '용식상(用食傷)' };

// 화면·프롬프트가 함께 쓰는 격국 서술(존댓말 reason, 반말 reasonNeo). 정격과 특수격 사이에 위아래를 두지 않는다.
export function gyeokgukView(core) {
  if (!core || core.status !== 'ok' || core.monthStructure?.status !== 'pass') {
    return {
      name: '미정', type: '참고', family: '', familyKo: '', ruleId: '', isGa: false, monthStructure: '', subUses: [], pendingSpecial: [], confident: false,
      reason: '월지 정보가 부족해 격을 세우지 않고, 억부·조후 흐름으로 보완해 읽습니다.',
      reasonNeo: '월지 정보가 부족해서 격을 세우지 않고, 억부·조후 흐름으로 보완해 읽어.',
    };
  }
  const g = core.gyeokguk, m = core.monthStructure, d = core.dayMaster.stem;
  const mbKo = BRANCH_KO[m.monthBranch] || m.monthBranch, dKo = STEM_KO[d] || d;
  const uses = [...new Set((m.subUses || []).map((u) => SUB_USE_KO[u.use]).filter(Boolean))];
  const useText = uses.length ? `다른 자리의 재·관·식상 쓰임인 ${josa(uses.join('·'), '을', '를')} 함께 봅니다.` : '다른 자리에 재·관·식상이 드러나지 않아 억부·조후로 쓰임을 정합니다.';
  const useTextNeo = uses.length ? `다른 자리의 재·관·식상 쓰임인 ${josa(uses.join('·'), '을', '를')} 같이 봐.` : '다른 자리에 재·관·식상이 드러나지 않아서 억부·조후로 쓰임을 정해.';
  let reason = '', reasonNeo = '', confident = true;
  if (g.type === '특수격') {
    const adopted = core.special.candidates.find((c) => c.id === core.special.adopted) || {};
    reason = `원국이 ${g.name}의 필수 조건을 모두 충족해 ${josa(g.familyKo, '으로', '로')} 봅니다.`;
    reasonNeo = `원국이 ${g.name}의 필수 조건을 모두 채워서 ${josa(g.familyKo, '으로', '로')} 봐.`;
    if (adopted.isGa) {
      reason += ' 일간을 돕는 글자가 있어도 실제 뿌리로 작용하지 못하는 가종(假從)의 조건입니다.';
      reasonNeo += ' 일간을 돕는 글자가 있어도 실제 뿌리로 작용하지 못하는 가종(假從)의 조건이야.';
    }
  } else if (m.kind === 'rok') {
    reason = `월지 ${josa(mbKo, '이', '가')} 일간 ${dKo}의 건록 자리라 건록격으로 봅니다. 건록격은 일반격이며, ${useText}`;
    reasonNeo = `월지 ${josa(mbKo, '이', '가')} 일간 ${dKo}의 건록 자리라 건록격으로 봐. 건록격은 일반격이고, ${useTextNeo}`;
  } else if (m.kind === 'yangin') {
    reason = `월지 ${josa(mbKo, '이', '가')} 양간 일간 ${dKo}의 양인 자리라 양인격으로 봅니다. 양인격은 일반격이며, ${useText}`;
    reasonNeo = `월지 ${josa(mbKo, '이', '가')} 양간 일간 ${dKo}의 양인 자리라 양인격으로 봐. 양인격은 일반격이고, ${useTextNeo}`;
  } else if (m.kind === 'yuejie') {
    const picked = josa(`${STEM_KO[m.chosen.stem] || m.chosen.stem}(${m.chosen.layer})`, '이', '가'), god = josa(m.tenGod, '이라', '라');
    reason = `월령에서 취한 ${picked} ${god} 월겁격으로 봅니다. 월겁격은 일반격이며, ${useText}`;
    reasonNeo = `월령에서 취한 ${picked} ${god} 월겁격으로 봐. 월겁격은 일반격이고, ${useTextNeo}`;
  } else {
    const god = m.tenGod;
    if (m.chosen.exposed) {
      reason = `월지 ${mbKo} 지장간의 ${josa(god, '이', '가')} 천간에 투출되어 ${josa(m.name, '이', '가')} 뚜렷합니다.`;
      reasonNeo = `월지 ${mbKo} 지장간의 ${josa(god, '이', '가')} 천간에 투출돼서 ${josa(m.name, '이', '가')} 뚜렷해.`;
    } else {
      reason = `월지 ${mbKo} 지장간의 ${josa(god, '을', '를')} 기준으로 ${josa(m.name, '으로', '로')} 보되, 투출이 약해 확정도는 낮습니다.`;
      reasonNeo = `월지 ${mbKo} 지장간의 ${josa(god, '을', '를')} 기준으로 ${josa(m.name, '으로', '로')} 보되, 투출이 약해서 확정도는 낮아.`;
      confident = false;
    }
  }
  if (m.hourSensitive && g.type !== '특수격') {
    reason += ` 시주에 따라 월령 구조가 ${josa(m.alternatives.join('·'), '으로', '로')} 갈려 확정하지 않습니다.`;
    reasonNeo += ` 시주에 따라 월령 구조가 ${josa(m.alternatives.join('·'), '으로', '로')} 갈려서 확정하지 않아.`;
    confident = false;
  }
  const pending = g.pendingSpecial || [];
  if (pending.length) {
    reason += ` 특수격 후보(${pending.join('·')})는 시주나 문헌 이설 때문에 판정을 보류하고 일반격 기준으로 읽습니다.`;
    reasonNeo += ` 특수격 후보(${pending.join('·')})는 시주나 문헌 이설 때문에 판정을 보류하고 일반격 기준으로 읽어.`;
  }
  return {
    name: g.name, type: g.type, family: g.family, familyKo: g.familyKo, ruleId: g.ruleId, isGa: g.isGa === true,
    monthStructure: g.monthStructure, subUses: m.subUses || [], pendingSpecial: pending, confident, reason, reasonNeo,
  };
}
