// 운의 실제 작용(LUCK-DYN-01). "용신 오행이 들어오면 좋은 해"로 끝내지 않고
// 합거·합화·충·형·삼합·입묘·대운×세운·십간 짝 강약으로 얼마나 좋아지고 나빠지는지 본다.
// 순수 함수다. 원국 판정(natal-core)과 evalDaewun 점수식은 바꾸지 않고, legacyScore 로 그대로 넘긴다.
import {
  STEM_EL, BRANCH_EL, STEM_HAP, STEM_CHUNG, BRANCH_LIUHE, BRANCH_CHUNG, SAMHAP, POSITIONS, POS_KO, EL_KO, EL_HAN,
  STEM_KO, BRANCH_KO, hiddenLayers, relationOf,
} from './natal-core/tables.mjs';
import { normalizeChart } from './natal-core/relations.mjs';
import { analyzeNatalCore } from './natal-core/index.mjs';
import { analyzeTombFrame } from './natal-core/tomb.mjs';
import { stemPairRelation } from './natal-core/stem-pairs.mjs';

export const LUCK_DYNAMICS_VERSION = 'luck-dynamics-v1';
export const LUCK_VERDICT_KO = Object.freeze({ good: '좋은 흐름', mixed: '좋고 조심할 면이 섞인 흐름', caution: '조심할 흐름' });

const VERDICT_GOOD = 1.5, VERDICT_CAUTION = -1, DECISIVE = 1.2, CLEAR = 3.5;
const HYEONG = new Set(['寅巳', '巳申', '申寅', '丑戌', '戌未', '未丑', '子卯', '卯子']);
const THEME_ORDER = ['성향', '관계', '일', '재물'];
const THEMES_BY_RELATION = { self: ['관계', '성향'], output: ['일', '성향'], wealth: ['재물', '관계'], officer: ['일'], parent: ['성향'] };
const r2 = (n) => Math.round(n * 100) / 100 || 0;
const elName = (el) => `${EL_KO[el]}(${EL_HAN[el]})`;
// 한자·한글 끝 글자의 받침으로 조사를 고른다. j('丙','이','가') → '丙이'(병), j('戊','이','가') → '戊가'(무).
const READING = { ...STEM_KO, ...BRANCH_KO };
const hasBatchim = (ch) => { const k = READING[ch] || ch; const code = k.charCodeAt(k.length - 1) - 0xac00; return code >= 0 && code <= 11171 && code % 28 !== 0; };
const j = (word, withB, withoutB) => `${word}${hasBatchim(String(word).at(-1)) ? withB : withoutB}`;
// '丙(화)는'처럼 괄호 뒤 조사는 오행 한글 이름에 맞춘다.
const tagged = (char, el, withB, withoutB) => `${char}(${EL_KO[el]})${hasBatchim(EL_KO[el]) ? withB : withoutB}`;

function parseLuck(value) {
  if (!value) return null;
  const text = typeof value === 'string' ? value.trim() : `${value.stem || value.g || ''}${value.branch || value.j || ''}`;
  const stem = text[0], branch = text[1];
  return STEM_EL[stem] && BRANCH_EL[branch] ? { stem, branch } : null;
}

function roleTable(yongsin) {
  const useful = [...(yongsin?.useful || [])], avoid = [...(yongsin?.avoid || [])];
  const main = yongsin?.yongsin || useful[0] || '';
  const value = (el) => (!el ? 0 : el === main ? 2 : useful.includes(el) ? 1.5 : el === avoid[0] ? -2 : avoid.includes(el) ? -1.5 : 0);
  const label = (el) => (el === main ? '가장 필요한 기운(용신)' : useful.includes(el) ? '도움이 되는 기운' : avoid.includes(el) ? '부담이 되는 기운' : '크게 치우치지 않은 기운');
  return { main, useful, avoid, value, label };
}

// 정기·중기 뿌리가 있는지(충 맞은 지지는 뿌리로 치지 않는다).
function rootedIn(el, branches) {
  return branches.some(({ char, clashed }) => !clashed && hiddenLayers(char).some((h) => h.el === el && h.layer !== '여기'));
}

/**
 * wolun(월운)을 주면 그 달을 판정하고 올해 세운(없으면 대운)을 바탕으로 깐다.
 * @param {{natal: object, daeun?: string|{stem,branch}, seun?: string|{stem,branch}, wolun?: string|{stem,branch}, yongsin?: object, legacyScore?: number|null}} input
 */
export function evaluateLuckDynamics({ natal, daeun = null, seun = null, wolun = null, yongsin = null, legacyScore = null } = {}) {
  const chart = normalizeChart(natal);
  const core = analyzeNatalCore(chart);
  const dLuck = parseLuck(daeun), sLuck = parseLuck(seun), wLuck = parseLuck(wolun);
  const target = wLuck || sLuck || dLuck;
  const scope = wLuck ? 'wolun' : sLuck ? 'seun' : 'daeun';
  const pick = yongsin || core.yongsinMethods?.final || null;
  const roles = roleTable(pick);
  const base = { version: LUCK_DYNAMICS_VERSION, scope, legacyScore: legacyScore ?? null };
  if (!target || core.status !== 'ok' || !roles.main) {
    return {
      ...base, status: 'insufficient', verdict: 'mixed', score: 0, base: 0, target: target ? target.stem + target.branch : null,
      headline: '태어난 정보나 운 정보가 부족해 이 시기의 좋고 나쁨을 단정하지 않아요.',
      reasons: ['정보가 채워지면 용신과 합·충을 함께 따져 다시 알려 드려요.'], themes: [], modifiers: [], yongsin: pick,
    };
  }
  const P = { wolun: '이 달은', seun: '이 해는', daeun: '이 대운 10년은' }[scope];
  const backdrop = scope === 'wolun' ? sLuck || dLuck : scope === 'seun' ? dLuck : null;
  // 월운의 바탕은 올해 세운이다(세운이 없을 때만 대운).
  const backdropName = scope === 'wolun' && sLuck ? '올해' : '대운';
  const { value, label } = roles;
  const stemEl = STEM_EL[target.stem], branchEl = BRANCH_EL[target.branch];
  const stemVal = value(stemEl), branchVal = value(branchEl);
  const w = { stem: 1, branch: 1 };
  const modifiers = [];
  // 점수에 영향이 없는 작용은 이유 목록에 올리지 않는다(쉬운 설명 우선).
  const add = (kind, delta, text) => { if (Math.abs(delta) >= 0.01) modifiers.push({ kind, delta: r2(delta), text }); };
  const scaleStem = (factor) => { const d = stemVal * w.stem * (factor - 1); w.stem *= factor; return d; };
  const scaleBranch = (factor) => { const d = branchVal * w.branch * (factor - 1); w.branch *= factor; return d; };
  const reasons = [
    `들어오는 ${tagged(target.stem, stemEl, '은', '는')} ${label(stemEl)}이고, ${tagged(target.branch, branchEl, '은', '는')} ${label(branchEl)}이에요.`,
  ];

  const natalStems = POSITIONS.filter((pos) => chart[pos].g).map((pos) => ({ pos, char: chart[pos].g, weight: 1, name: `${POS_KO[pos]}간` }));
  const natalBranchesRaw = POSITIONS.filter((pos) => chart[pos].j).map((pos) => ({ pos, char: chart[pos].j, weight: 1, name: `${POS_KO[pos]}지` }));
  const contextStems = backdrop ? [...natalStems, { pos: 'daeun', char: backdrop.stem, weight: 0.5, name: `${backdropName} 천간` }] : natalStems;
  const contextBranches = backdrop ? [...natalBranchesRaw, { pos: 'daeun', char: backdrop.branch, weight: 0.5, name: `${backdropName} 지지` }] : natalBranchesRaw;
  const branchPool = [...contextBranches, { pos: 'luck', char: target.branch }]
    .map((row) => ({ ...row, clashed: [...contextBranches, { char: target.branch }].some((o) => o !== row && BRANCH_CHUNG[row.char] === o.char) }));
  const themes = new Set();

  // (a)(b) 천간합: 합거(묶임) 또는 합화(오행 변화). 일간과의 합은 묶지 않고 관계 주제로만 본다.
  const partners = contextStems.filter((row) => STEM_HAP[target.stem]?.[0] === row.char);
  const dayPartner = partners.find((row) => row.pos === 'd');
  if (dayPartner) themes.add('관계');
  const others = partners.filter((row) => row.pos !== 'd');
  if (others.length > 1 && stemVal) {
    add('hap', scaleStem(0.7), `${j(target.stem, '이', '가')} 원국의 ${others.map((r) => r.char).join('·')} 여럿과 합하려 다퉈(쟁합) 힘이 조금 흩어져요.`);
  } else if (others.length === 1) {
    const partner = others[0], partnerEl = STEM_EL[partner.char], huaEl = STEM_HAP[target.stem][1];
    const luckRooted = rootedIn(stemEl, branchPool), partnerRooted = rootedIn(partnerEl, branchPool);
    const clashedPartner = [...contextStems, { char: target.stem }].some((row) => STEM_CHUNG[partner.char] === row.char);
    const transforms = BRANCH_EL[chart.m.j] === huaEl && !clashedPartner && !luckRooted && !partnerRooted;
    if (transforms) {
      const before = stemVal * w.stem;
      w.stem = 0;
      const delta = value(huaEl) - before + 0.5 * partner.weight * (value(huaEl) - value(partnerEl));
      add('hua', delta, `${j(target.stem, '과', '와')} ${partner.name} ${j(partner.char, '이', '가')} 합해 ${elName(huaEl)} 기운으로 바뀌어요(합화). 바뀐 ${EL_KO[huaEl]} 기운은 ${label(huaEl)}이에요.`);
    } else if (luckRooted && !partnerRooted) {
      const delta = scaleStem(0.7) - 0.7 * partner.weight * value(partnerEl);
      add('hap', delta, `${j(target.stem, '이', '가')} ${partner.name} ${j(partner.char, '을', '를')} 합으로 묶어 ${label(partnerEl)}인 ${EL_KO[partnerEl]} 기운의 작용을 줄여요.`);
    } else if (partnerRooted && !luckRooted) {
      add('hap', scaleStem(0.2), stemVal < 0
        ? `부담이던 ${tagged(target.stem, stemEl, '이', '가')} 뿌리 있는 ${partner.name} ${partner.char}에 묶여(합거) 힘을 덜 써요.`
        : `들어온 ${j(target.stem, '이', '가')} 뿌리 있는 ${partner.name} ${partner.char}에 묶여(합거) ${EL_KO[stemEl]} 기운이 제대로 힘을 쓰지 못해요.`);
    } else {
      const delta = scaleStem(0.5) - 0.5 * partner.weight * value(partnerEl);
      add('hap', delta, `${j(target.stem, '과', '와')} ${partner.name} ${j(partner.char, '이', '가')} 서로 묶여(합반) 둘 다 힘이 절반쯤 줄어요.`);
    }
  }

  // 지지 육합·삼합.
  const liuhe = contextBranches.find((row) => BRANCH_LIUHE[target.branch]?.[0] === row.char);
  if (liuhe && branchVal) add('liuhe', scaleBranch(0.7), `${j(target.branch, '이', '가')} ${liuhe.name} ${j(liuhe.char, '과', '와')} 육합으로 묶여 ${EL_KO[branchEl]} 기운이 조금 덜 드러나요.`);
  for (const group of SAMHAP) {
    if (!group.members.includes(target.branch)) continue;
    const present = new Set([target.branch, ...contextBranches.map((row) => row.char)]);
    const have = group.members.filter((b) => present.has(b));
    const full = have.length === 3;
    const half = !full && have.length === 2 && have.includes(group.members[1]);
    if (!(full || half) || !value(group.el)) continue;
    add('samhap', (full ? 0.75 : 0.35) * value(group.el),
      `${j(have.join(''), '이', '가')} ${full ? '삼합' : '반합'}으로 모여 ${elName(group.el)} 기운이 커져요. ${EL_KO[group.el]} 기운은 ${label(group.el)}이에요.`);
  }

  // (c) 충: 들어온 글자가 원국을 치는지(용신 뿌리 손상 vs 기신 제거), 거꾸로 꺾이는지.
  let chungTotal = 0;
  for (const row of contextBranches) {
    if (BRANCH_CHUNG[target.branch] !== row.char) continue;
    const rowEl = BRANCH_EL[row.char], rowVal = value(rowEl);
    const monthBoost = row.pos === 'm' ? 1.5 : 1;
    if (rowEl === 'earth' && branchEl === 'earth') {
      const d = -0.4 * row.weight * monthBoost * rowVal + scaleBranch(0.7);
      chungTotal += d;
      add('chung', d, `${j(target.branch, '과', '와')} ${row.name} ${j(row.char, '이', '가')} 토끼리 부딪혀(충) 창고가 열리듯 양쪽이 흔들려요.`);
    } else if ({ wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire' }[branchEl] === rowEl) {
      const d = -0.6 * row.weight * monthBoost * rowVal;
      chungTotal += d;
      add('chung', d, rowVal < 0
        ? `${j(target.branch, '이', '가')} ${row.name} ${j(row.char, '을', '를')} 쳐서(충) 부담이던 ${EL_KO[rowEl]} 기운을 덜어 줘요.`
        : rowVal > 0
          ? `${j(target.branch, '이', '가')} ${row.name} ${j(row.char, '을', '를')} 쳐서(충) 기대던 ${EL_KO[rowEl]} 기운의 뿌리가 흔들려요.`
          : `${j(target.branch, '이', '가')} ${row.name} ${j(row.char, '과', '와')} 부딪혀(충) 주변 환경이 바뀌기 쉬워요.`);
    } else {
      const d = scaleBranch(0.5);
      chungTotal += d;
      add('chung', d, `${j(target.branch, '이', '가')} ${row.name} ${row.char}에 오히려 꺾여(충) ${EL_KO[branchEl]} 기운이 약해져요.`);
    }
  }
  if (Math.abs(chungTotal) > 2) {
    const fix = Math.sign(chungTotal) * 2 - chungTotal;
    add('chung', fix, '충이 여러 번 겹치지만 한 번에 바뀌는 폭은 제한해서 봐요.');
  }

  // 형: 도움 되는 원국 지지와 형이면 마찰.
  const hyeong = contextBranches.filter((row) => HYEONG.has(target.branch + row.char) && BRANCH_CHUNG[target.branch] !== row.char && value(BRANCH_EL[row.char]) > 0);
  if (hyeong.length) add('hyeong', -0.3, `${j(target.branch, '과', '와')} ${hyeong[0].name} ${j(hyeong[0].char, '이', '가')} 형(刑)을 이뤄 일이 매끄럽지 않고 마찰이 생기기 쉬워요.`);

  // (f) 십간 짝 강약: 같은 생극이라도 짝에 따라 세기가 다르다(표에 있는 규칙만).
  const dayRule = stemPairRelation(target.stem, chart.d.g);
  if (dayRule?.rule && dayRule.direction !== 'reverse' && stemVal) {
    const current = stemVal;
    const factor = { weak: current < 0 ? 0.5 : 0.7, strong: 1.3, 'harmful-reverse': current < 0 ? 1.3 : 0.5 }[dayRule.strength]
      ?? (dayRule.effect === 'helps' ? (current < 0 ? 0.5 : 1.2) : 1);
    if (factor !== 1) add('stem-pair', scaleStem(factor), `일간 ${chart.d.g}에 대해: ${dayRule.note}.`);
  }
  for (const row of contextStems) {
    if (row.pos === 'd') continue;
    const rel = stemPairRelation(target.stem, row.char);
    if (!rel?.rule || rel.direction === 'reverse') continue;
    const rowVal = value(STEM_EL[row.char]);
    let d = 0;
    if (rel.effect === 'hurts' && rowVal < 0) d = 0.5 * row.weight * { strong: 1.5, normal: 1, weak: 0.4, 'harmful-reverse': 0 }[rel.strength];
    else if (rel.effect === 'hurts' && rowVal > 0) d = -0.5 * row.weight * { strong: 1.5, normal: 1, weak: 0.4, 'harmful-reverse': 1.2 }[rel.strength];
    else if (rel.effect === 'helps' && rowVal > 0) d = 0.3 * row.weight;
    if (d) add('stem-pair', d, `${row.name} ${row.char}에 대해: ${rel.note}.`);
  }

  // (d) 입묘: 들어온 운이 묘처를 열거나 충으로 작용하게 만든 사건만 본다.
  const luckRows = [
    ...(backdrop ? [{ scope: backdropName === '올해' ? 'sewoon' : 'daewoon', stem: backdrop.stem, branch: backdrop.branch, year: 'backdrop', label: backdropName }] : []),
    { scope: { wolun: 'wolwoon', seun: 'sewoon', daeun: 'daewoon' }[scope], stem: target.stem, branch: target.branch, year: 'target', label: { wolun: '이 달', seun: '이 해', daeun: '이 대운' }[scope] },
  ];
  const targetId = `${luckRows.at(-1).scope}:target:${target.stem}${target.branch}`;
  const roleCore = {
    status: core.status, climate: core.climate, special: { decision: 'general' },
    yongshin: { eokbu: { useful: roles.useful, avoid: roles.avoid, applies: true }, conflicts: [] },
  };
  const tomb = analyzeTombFrame(chart, roleCore, luckRows, { id: 'luck', label: luckRows.at(-1).label });
  const touched = tomb.events.filter((e) => e.tomb.position === targetId || e.triggers.some((t) => t.position === targetId) || e.target.position === targetId);
  const byElement = new Map();
  for (const e of touched) {
    const key = `${e.target.element}:${e.status}:${e.verdict}`;
    if (!byElement.has(key)) byElement.set(key, e);
  }
  let tombBad = 0, tombGood = 0;
  for (const e of byElement.values()) {
    const el = e.target.element;
    if (e.status === 'activated' && e.verdict === 'adverse') {
      const d = Math.max(-1.5, -2 - tombBad); tombBad += d;
      if (d) add('tomb', d, `도움이 되는 ${EL_KO[el]} 기운이 ${e.tomb.branch} 창고에 갇히는(입묘) 조건이 맞아 잠시 힘을 쓰기 어려워요.`);
    } else if (e.status === 'activated' && e.verdict === 'beneficial') {
      const d = Math.min(1, 1.5 - tombGood); tombGood += d;
      if (d) add('tomb', d, `부담이던 ${EL_KO[el]} 기운이 ${e.tomb.branch} 창고에 갇히는(입묘) 조건이 맞아 한결 가벼워져요.`);
    }
  }

  // (e) 대운 × 세운: 대운이 바탕을 깐다. 대운과 세운이 서로 충하면 변동이 크다.
  if (backdrop) {
    const bVal = value(STEM_EL[backdrop.stem]) + value(BRANCH_EL[backdrop.branch]);
    const d = 0.35 * bVal;
    const who = backdropName === '올해' ? `올해 흐름(${backdrop.stem}${backdrop.branch})이` : `지금 대운(${backdrop.stem}${backdrop.branch})이`;
    if (d) add('daeun', d, d > 0
      ? `${who} 도움 되는 쪽이라 바탕이 받쳐 줘요.`
      : `${who} 부담 쪽이라 바탕이 조금 무거워요.`);
  }

  // 주제: 들어온 글자가 일간에게 어떤 관계인지.
  const dayEl = STEM_EL[chart.d.g];
  for (const el of [stemEl, branchEl]) for (const t of THEMES_BY_RELATION[relationOf(dayEl, el)] || []) themes.add(t);

  const baseScore = stemVal + branchVal;
  const score = r2(baseScore + modifiers.reduce((sum, m) => sum + m.delta, 0));
  const byKind = kindTotals(modifiers);
  const verdict = luckVerdictOf(score, modifiers);
  const dominant = Object.entries(byKind).filter(([, d]) => Math.abs(d) >= 0.01)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
  const dominantMod = dominant ? { kind: dominant[0], delta: dominant[1] } : null;
  const headline = headlineOf(P, verdict, dominantMod, roles, stemEl, branchEl);
  return {
    ...base, status: 'ok', target: target.stem + target.branch, daeun: dLuck ? dLuck.stem + dLuck.branch : null,
    ...(scope === 'wolun' ? { seun: sLuck ? sLuck.stem + sLuck.branch : null } : {}),
    verdict, headline, reasons: [...reasons, ...modifiers.map((m) => m.text)],
    themes: THEME_ORDER.filter((t) => themes.has(t)), score, base: r2(baseScore), modifiers,
    yongsin: { yongsin: roles.main, useful: roles.useful, avoid: roles.avoid, method: pick?.method || null },
  };
}

// 결정적 작용은 종류별 합으로 본다(같은 충이 여러 번 겹치면 하나의 큰 흔들림이다).
function kindTotals(modifiers) {
  const byKind = {};
  for (const m of modifiers) byKind[m.kind] = (byKind[m.kind] || 0) + m.delta;
  return byKind;
}

// 반대 방향의 큰 작용(종류별 합 ±1.2 이상)이 있으면 경계선 총점은 mixed 로 둔다. 총점이 아주 크면 그대로 따른다.
export function luckVerdictOf(score, modifiers = []) {
  const totals = Object.values(kindTotals(modifiers));
  const worst = Math.min(0, ...totals), best = Math.max(0, ...totals);
  return score >= VERDICT_GOOD && (worst > -DECISIVE || score >= CLEAR) ? 'good'
    : score <= VERDICT_CAUTION && (best < DECISIVE || score <= -CLEAR) ? 'caution' : 'mixed';
}

function headlineOf(P, verdict, dominant, roles, stemEl, branchEl) {
  const kind = dominant?.kind, up = (dominant?.delta || 0) > 0;
  const helpEl = [stemEl, branchEl].find((el) => roles.useful.includes(el));
  if (verdict === 'good') {
    if (kind === 'chung' && up) return `${P} 오래 짐이 되던 기운이 부딪혀 풀리면서(충) 숨통이 트이는 흐름이에요.`;
    if (kind === 'samhap' && up) return `${P} 도움 되는 기운이 한데 모여(삼합) 하려던 일에 힘이 실리는 흐름이에요.`;
    if (kind === 'tomb' && up) return `${P} 부담이던 기운이 창고에 갇히듯 잦아들어(입묘) 마음이 한결 가벼워지는 흐름이에요.`;
    return helpEl
      ? `${P} 꼭 필요했던 ${EL_KO[helpEl]} 기운이 들어와 마음먹은 일이 한결 수월하게 풀리는 때예요.`
      : `${P} 걸리던 부담이 줄어 마음먹은 일이 한결 수월하게 풀리는 때예요.`;
  }
  if (verdict === 'caution') {
    if (kind === 'chung' && !up) return `${P} 기대던 자리가 흔들리는(충) 때라 큰 결정은 한 박자 늦추는 게 좋아요.`;
    if (kind === 'tomb' && !up) return `${P} 도움이 되던 기운이 잠시 갇히는(입묘) 때라 넓히기보다 쉬어 가며 지키는 게 좋아요.`;
    if ((kind === 'hap' || kind === 'hua') && !up) return `${P} 도움이 묶이고(합) 부담은 커지는 때라 욕심을 줄이고 지킬 것부터 챙기면 좋아요.`;
    return `${P} 버거운 기운이 커지는 때라 무리하지 말고 나를 지키는 데 힘을 두면 좋아요.`;
  }
  if ((kind === 'hap' || kind === 'hua') && !up) return `${P} 반가운 기운이 오지만 다른 글자와 묶여서(합) 기대만큼 바로 힘을 쓰지는 못해요.`;
  if (kind === 'chung' && !up) return `${P} 좋은 기운과 흔들림이 함께 와서(충) 속도보다 균형을 챙기면 좋아요.`;
  if (kind === 'chung' && up) return `${P} 부담이던 기운이 부딪혀 덜어지지만(충) 아직 바탕이 무거워 차분히 가는 게 좋아요.`;
  if (kind === 'tomb' && !up) return `${P} 기대한 도움이 잠시 묶이는(입묘) 때라 서두르기보다 준비를 다지는 편이 좋아요.`;
  return `${P} 좋은 면과 조심할 면이 섞여 있어, 상황을 보며 차분히 고르면 되는 흐름이에요.`;
}
