// 특수격 후보. 계열마다 독립된 필수조건을 pass/fail/unknown으로 기록한다.
// 진종 탈락·낮은 점수·설문 적합도로 가종이 되지 않는다. 점수(share)는 필수조건의 한 항목일 뿐이다.
import { STEM_EL, BRANCH_EL, STEM_HAP, STEM_CHUNG, EL_KO, EL_HAN, parentOf, mainHidden, relationOf, ELEMENT_OF_RELATION } from './tables.mjs';
import { hiddenStemsOf, rootSummary, rootsOf, stemCombinations, branchRelations, visibleCounts, visibleByRelation, knownStems, isEffectiveRoot } from './relations.mjs';

const ck = (id, ok, note) => ({ id, ok, note });
export function statusOf(checks) {
  if (checks.some((c) => c.ok === false)) return 'fail';
  if (checks.some((c) => c.ok === null)) return 'unknown';
  return 'pass';
}
const pct = (n) => `${Math.round(n * 100)}%`;

function context(chart) {
  const hidden = hiddenStemsOf(chart);
  const dayEl = STEM_EL[chart.d.g];
  return {
    chart, hidden, dayEl,
    counts: visibleCounts(chart),
    combos: stemCombinations(chart, hidden),
    branches: branchRelations(chart),
    monthRel: chart.m.j ? relationOf(dayEl, STEM_EL[mainHidden(chart.m.j)]) : '',
    el: (rel) => ELEMENT_OF_RELATION(dayEl, rel),
  };
}
const fullGroup = (ctx, el) => ctx.branches.samhap.some((g) => g.el === el && g.state === 'full') || ctx.branches.banghap.some((g) => g.el === el && g.state === 'full');
const share = (ctx, rels) => rels.reduce((n, r) => n + ctx.counts.byRel[r], 0) / (ctx.counts.total || 1);

// JONG-TRUE / JONG-FALSE: 종재·종살 [R4, R5]
const FOLLOW = {
  wealth: { support: 'output', other: 'officer', trueName: '종재격(從財格)', falseName: '가종재격(假從財格)' },
  officer: { support: 'wealth', other: 'wealth', trueName: '종살격(從殺格)', falseName: '가종살격(假從殺格)' },
};
function followChecks(ctx, target, profile) {
  const f = FOLLOW[target], { byRel } = ctx.counts;
  const dominance = target === 'wealth' ? byRel.wealth > 0 && byRel.wealth >= byRel.officer : byRel.officer > 0 && byRel.officer > byRel.wealth;
  const monthOk = !ctx.chart.m.j ? null : ctx.monthRel === target || fullGroup(ctx, ctx.el(target));
  const s = share(ctx, [target, f.support]);
  return [
    ck('J0-DOMINANT', dominance, `${target === 'wealth' ? '재성' : '관살'}이 따를 세력의 중심인지(재 ${byRel.wealth} / 관 ${byRel.officer})`),
    ck('J1-MONTH', monthOk, monthOk === null ? '월지 미상' : `월령 본기 관계: ${ctx.monthRel || '없음'}`),
    ck('J2-SHARE', s >= profile.followShare, `따를 세력 비중 ${pct(s)} (개발 정책 기준 ${pct(profile.followShare)})`),
  ];
}
function evaluateFollow(ctx, target, profile) {
  const f = FOLLOW[target];
  const base = followChecks(ctx, target, profile);
  const dayRoots = rootSummary(ctx.hidden, ctx.dayEl);
  const parentEl = parentOf(ctx.dayEl);
  const helperStems = knownStems(ctx.chart).filter((s) => s.pos !== 'd' && (s.el === ctx.dayEl || s.el === parentEl));
  const parentRoots = rootsOf(ctx.hidden, parentEl);
  const trueChecks = [...base,
    ck('J3-NO-DAY-ROOT', dayRoots.any === 0, `일간 오행의 지장간 뿌리 ${dayRoots.any}개`),
    ck('J4-NO-HELPER-STEM', helperStems.length === 0, helperStems.length ? `인비 천간 ${helperStems.map((s) => s.char).join('')}` : '인비 천간 없음'),
    ck('J5-NO-PARENT-ROOT', parentRoots.length === 0, `인성 오행의 지장간 ${parentRoots.length}개`),
  ];
  const trueStatus = statusOf(trueChecks);
  const ineffectiveStem = (s) => rootsOf(ctx.hidden, s.el).length === 0 || ctx.combos.some((c) => c.state === '합거' && c.removed === s.pos);
  const helperMains = ['y', 'm', 'd', 'h'].filter((pos) => {
    const j = ctx.chart[pos].j;
    return j && (BRANCH_EL[j] === ctx.dayEl || BRANCH_EL[j] === parentEl);
  });
  const liveHelperMain = helperMains.filter((pos) => !(ctx.hidden[pos].slice(-1)[0]?.weakenedBy.length));
  const effectiveParent = parentRoots.filter(isEffectiveRoot);
  const falseChecks = [...base,
    ck('F3-NO-EFFECTIVE-DAY-ROOT', dayRoots.effective === 0, `일간 실효 뿌리(충 없는 정기·중기) ${dayRoots.effective}개, 약한 뿌리 ${dayRoots.weak}개`),
    ck('F4-HELPER-STEMS-INEFFECTIVE', helperStems.every(ineffectiveStem), helperStems.length ? `인비 천간 ${helperStems.map((s) => s.char + (ineffectiveStem(s) ? '(무근·합거)' : '(유근)')).join(' ')}` : '인비 천간 없음'),
    ck('F5-HELPER-BRANCHES-WEAKENED', liveHelperMain.length === 0 && effectiveParent.length === 0, liveHelperMain.length || effectiveParent.length ? '충을 받지 않은 인비 본기·인성 실효 뿌리가 남음' : '인비 지지 본기는 없거나 충으로 약화됨'),
    ck('F6-RESIDUAL-HELP', trueStatus !== 'pass', trueStatus === 'pass' ? '남은 도움이 없어 진종으로 판정' : '약한 도움이 남아 있음'),
  ];
  return [
    { id: `JONG-TRUE-${target}`, ruleId: 'JONG-TRUE', family: 'follow', name: f.trueName, dominant: ctx.el(target), second: ctx.el(f.support), isGa: false, status: trueStatus, checks: trueChecks },
    { id: `JONG-FALSE-${target}`, ruleId: 'JONG-FALSE', family: 'follow', name: f.falseName, dominant: ctx.el(target), second: ctx.el(f.support), isGa: true, status: statusOf(falseChecks), checks: falseChecks },
  ];
}

// JONG-ER 종아 [R7]: 신강약과 무관한 별도 규칙. 비겁은 허용한다.
function evaluateOutput(ctx, profile) {
  const { byRel } = ctx.counts;
  const wealth = visibleByRelation(ctx.chart, 'wealth'), officer = visibleByRelation(ctx.chart, 'officer'), parent = visibleByRelation(ctx.chart, 'parent');
  const largest = byRel.output >= profile.outputMin && byRel.output > byRel.parent && byRel.output > byRel.wealth && byRel.output > byRel.officer;
  const checks = [
    ck('E1-MONTH-OUTPUT', !ctx.chart.m.j ? null : ctx.monthRel === 'output', '식상이 월령(提綱)에 있는지'),
    ck('E2-OUTPUT-DOMINANT', largest, `식상 ${byRel.output}칸 (개발 정책: ${profile.outputMin}칸 이상이며 인·재·관보다 많음)`),
    ck('E3-WEALTH-PRESENT', wealth.count > 0, `재성 ${wealth.count}위`),
    ck('E4-NO-OFFICER', officer.count === 0, `관살 ${officer.count}위`),
    ck('E5-NO-PARENT', parent.count === 0, `인성 ${parent.count}위`),
  ];
  return { id: 'JONG-ER', ruleId: 'JONG-ER', family: 'follow-output', name: '종아격(從兒格)', dominant: ctx.el('output'), second: ctx.el('wealth'), isGa: false, status: statusOf(checks), checks };
}

// ZW-* 전왕 [R3]: 일간과 동류 기운이 국을 이룬다. 문헌 조목마다 조건이 다르므로 합치지 않는다.
const ZW = {
  wood: { ruleId: 'ZW-QUZHI', name: '곡직격(曲直格)', samhap: '亥卯未' },
  fire: { ruleId: 'ZW-YANSHANG', name: '염상격(炎上格)', samhap: '寅午戌' },
  earth: { ruleId: 'ZW-JIASE', name: '가색격(稼穡格)' },
  metal: { ruleId: 'ZW-CONGGE', name: '종혁격(從革格)', samhap: '巳酉丑' },
  water: { ruleId: 'ZW-RUNXIA', name: '윤하격(潤下格)', samhap: '申子辰' },
};
// 국을 이루는 지지(예: 윤하 申子辰의 辰)는 반대 세력으로 세지 않는다.
const outsideJu = (row, ju) => ({ ...row, branches: row.branches.filter((b) => !(ju || '').includes(b.char)), get count() { return this.stems.length + this.branches.length; } });
function officerLimit(ctx, ju) {
  const off = outsideJu(visibleByRelation(ctx.chart, 'officer'), ju);
  if (off.count === 0) return ck('ZW-OFFICER', true, '관살 없음');
  if (off.count >= 2) return ck('ZW-OFFICER', false, `관살 ${off.count}위가 독립적으로 작용`);
  const rooted = off.branches.length > 0 || rootsOf(ctx.hidden, off.stems[0].el).length > 0;
  return ck('ZW-OFFICER', !rooted, rooted ? '뿌리 있는 관살 1위가 작용' : '무근 관살 1위(개발 정책상 허용)');
}
function evaluateVigorous(ctx, profile) {
  const z = ZW[ctx.dayEl];
  const s = share(ctx, ['self', 'parent']);
  const checks = [ck('ZW-SHARE', s >= profile.followShare, `비겁·인성 비중 ${pct(s)} (개발 정책 기준 ${pct(profile.followShare)})`)];
  const mj = ctx.chart.m.j;
  if (ctx.dayEl === 'earth') {
    // 「戊己忻逢四季乃為稼穡之名」, 「秋土不成器」「冬土不成器」, 「喜見木為官止得一木為妙」「木多則土虛」
    checks.unshift(ck('ZW-JIASE-MONTH', !mj ? null : '辰未'.includes(mj) ? true : '戌丑'.includes(mj) ? null : false,
      !mj ? '월지 미상' : '戌丑'.includes(mj) ? `${mj}월: 사계월이지만 秋土·冬土 不成器 조목과 충돌하는 이설` : `${mj}월이 사계월(辰戌丑未)인지`));
    const wood = visibleByRelation(ctx.chart, 'officer');
    checks.push(ck('ZW-JIASE-WOOD', wood.count <= 1, wood.count <= 1 ? `목 ${wood.count}위(一木 허용)` : `목 ${wood.count}위: 木多則土虛`));
  } else {
    const full = ctx.branches.samhap.some((g) => g.members === z.samhap && g.state === 'full');
    checks.unshift(ck(`${z.ruleId}-JU`, full, `${z.samhap} 국이 온전한지`));
    if (ctx.dayEl === 'metal') {
      // 「須帶丙丁巳午一二位」「但不可火多」「不喜五月生」
      const fire = visibleByRelation(ctx.chart, 'officer');
      checks.push(ck('ZW-CONGGE-FIRE', fire.count >= 1 && fire.count <= 2, `화 ${fire.count}위 (丙丁巳午 一二位)`));
      checks.push(ck('ZW-CONGGE-MONTH', !mj ? null : mj !== '午', mj === '午' ? '五月(午月) 생' : '午월 아님'));
    } else checks.push(officerLimit(ctx, z.samhap));
  }
  const wealth = outsideJu(visibleByRelation(ctx.chart, 'wealth'), z.samhap);
  checks.push(ck('ZW-WEALTH', wealth.count <= 1, `재성 ${wealth.count}위 (개발 정책: 2위 이상이면 독립 작용)`));
  return { id: z.ruleId, ruleId: z.ruleId, family: 'vigorous', name: z.name, dominant: ctx.dayEl, second: ctx.el('parent'), isGa: false, status: statusOf(checks), checks };
}

// JONG-QIANG/WANG: 인비뿐이고 재관이 없으며 득령(엄격판, 평주 층위).
function evaluateWang(ctx, profile, zw) {
  const s = share(ctx, ['self', 'parent']);
  const wealth = visibleByRelation(ctx.chart, 'wealth'), officer = visibleByRelation(ctx.chart, 'officer');
  const selfMore = ctx.counts.byRel.self >= ctx.counts.byRel.parent;
  const checks = [
    ck('W1-MONTH', !ctx.chart.m.j ? null : ctx.monthRel === 'self' || ctx.monthRel === 'parent', `월령 본기 관계: ${ctx.monthRel || '미상'}`),
    ck('W2-NO-WEALTH-OFFICER', wealth.count === 0 && officer.count === 0, `재성 ${wealth.count}위 / 관살 ${officer.count}위`),
    ck('W3-SHARE', s >= profile.followShare, `비겁·인성 비중 ${pct(s)}`),
  ];
  // 같은 오행의 전왕 조목이 이설로 보류되면 종왕으로 우회해 확정하지 않는다.
  if (selfMore && zw.status === 'unknown') checks.push(ck('W4-ZW-UNRESOLVED', null, `${zw.name} 이설 보류와 같은 근거`));
  return { id: 'JONG-WANG', ruleId: 'JONG-QIANG-WANG', family: 'vigorous', name: selfMore ? '종왕격(從旺格)' : '종강격(從强格)', dominant: selfMore ? ctx.dayEl : ctx.el('parent'), second: selfMore ? ctx.el('parent') : ctx.dayEl, isGa: false, status: statusOf(checks), checks };
}

// HUA-01 화기 [R4]: 「單遇一位…在月時上作合」「不遇 印·劫·官」「化神要通月令」
function evaluateHua(ctx) {
  const d = ctx.chart.d.g, [partner, el] = STEM_HAP[d] || [];
  const others = knownStems(ctx.chart).filter((s) => s.pos !== 'd');
  const partners = others.filter((s) => s.char === partner);
  const adjacentPartner = partners.length === 1 && (partners[0].pos === 'm' || partners[0].pos === 'h');
  const rest = others.filter((s) => s !== partners[0]);
  const blockers = rest.filter((s) => s.el !== el && ['parent', 'self', 'officer'].includes(relationOf(ctx.dayEl, s.el)));
  const clashed = rest.some((s) => STEM_CHUNG[d] === s.char || STEM_CHUNG[partner] === s.char);
  const dayRoots = rootSummary(ctx.hidden, ctx.dayEl);
  const checks = [
    ck('HUA-ADJACENT-SINGLE', adjacentPartner, partners.length === 0 ? `${partner} 없음` : partners.length > 1 ? `${partner} ${partners.length}위` : `${partner}이 ${partners[0].pos === 'y' ? '년간(인접 아님)' : '인접 천간'}`),
    ck('HUA-MONTH', !ctx.chart.m.j ? null : BRANCH_EL[ctx.chart.m.j] === el, `화신 ${EL_KO[el]}이 월령에 통하는지`),
    ck('HUA-NO-BLOCKER', blockers.length === 0, blockers.length ? `인·비겁·관 천간 ${blockers.map((s) => s.char).join('')}` : '방해 천간 없음'),
    ck('HUA-NO-CLASH', !clashed, clashed ? '합하는 천간이 충을 받음' : '천간충 없음'),
    ck('HUA-DAY-ROOTLESS', dayRoots.any === 0, `일간 오행 뿌리 ${dayRoots.any}개 (개발 정책: 뿌리가 없어야 함)`),
  ];
  return { id: 'HUA-01', ruleId: 'HUA-01', family: 'transform', name: `화${EL_KO[el]}격(化${EL_HAN[el]}格)`, dominant: el, second: parentOf(el), isGa: false, status: statusOf(checks), checks, partner };
}

export const SPECIAL_PRIORITY = ['HUA-01', 'ZW', 'JONG-WANG', 'JONG-TRUE', 'JONG-ER', 'JONG-FALSE'];
const priorityOf = (c) => SPECIAL_PRIORITY.indexOf(c.ruleId.startsWith('ZW-') ? 'ZW' : c.ruleId === 'JONG-QIANG-WANG' ? 'JONG-WANG' : c.ruleId);

export function evaluateSpecialFull(chart, profile) {
  const ctx = context(chart);
  if (!ctx.dayEl) return [];
  const zw = evaluateVigorous(ctx, profile);
  return [
    evaluateHua(ctx), zw, evaluateWang(ctx, profile, zw),
    ...evaluateFollow(ctx, 'wealth', profile), ...evaluateFollow(ctx, 'officer', profile), evaluateOutput(ctx, profile),
  ].sort((a, b) => priorityOf(a) - priorityOf(b));
}

// 시주 미상: 가능한 12개 시주 모두에서 같은 결과일 때만 pass/fail, 갈리면 unknown.
export function mergeHourVariants(variants) {
  const [first] = variants;
  return first.map((cand, i) => {
    const rows = variants.map((v) => v[i]);
    const statuses = new Set(rows.map((r) => r.status));
    const checks = cand.checks.map((c, k) => {
      const oks = new Set(rows.map((r) => r.checks[k].ok));
      return oks.size === 1 ? { ...c, note: `${c.note} (시주와 무관)` } : { id: c.id, ok: null, note: '시주에 따라 달라짐' };
    });
    const status = statuses.size === 1 ? [...statuses][0] : 'unknown';
    const names = [...new Set(rows.filter((r) => r.status !== 'fail').map((r) => r.name))];
    return { ...cand, name: names.length === 1 ? names[0] : cand.name, status, checks, hourDependent: statuses.size > 1 };
  });
}

export function decideSpecial(candidates) {
  const passed = candidates.filter((c) => c.status === 'pass');
  if (passed.length) return { decision: 'special', adopted: passed[0] };
  const unknown = candidates.filter((c) => c.status === 'unknown');
  if (unknown.length) return { decision: 'pending', adopted: null, pending: unknown.map((c) => c.name) };
  return { decision: 'general', adopted: null };
}
