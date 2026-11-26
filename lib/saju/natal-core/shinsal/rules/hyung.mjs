// 흉살·특수살. 이름만 전통 용어이고, 출력 문구는 copy.ko.mjs 가 경향으로만 풀어 쓴다.
//   일간 기준: 양인(옵션 음간 포함)·비인(양인의 충)·홍염
//   글자 자체: 현침(원국) / 간지 자체: 백호(원국+운)·괴강(원국, 일주면 emphasis)·고란(일주만)
//   지지 짝: 원진·귀문(겹치면 둘 다)·천라지망(원국 짝 + 운×원국)
//   세운 한정: 상문(년지+2)·조객(년지-2) / 공망: 일주 순중공망(옵션 년주)
import {
  YANGIN_BY_STEM, YANGIN_YIN_BY_STEM, HONGYEOM_BY_STEM, biinBranch, HYEONCHIM_STEMS, HYEONCHIM_BRANCHES, HYEONCHIM_MI,
  BAEKHO_GANJI, GOEGANG_BASE_GANJI, GOEGANG_MU_SUL, GORAN_DAY_GANJI, WONJIN_PAIRS, GWIMUN_PAIRS, CHEONRA_JIMANG_PAIRS,
  sangmunBranch, jogaekBranch, gongmangBranches,
} from '../tables.mjs';
import { makeHit, targetsOf, pairsOf, pairNode, inPairs } from './common.mjs';

function yanginOf(stem, opts) {
  if (YANGIN_BY_STEM[stem]) return YANGIN_BY_STEM[stem];
  return opts.yanginYinStems ? YANGIN_YIN_BY_STEM[stem] || '' : '';
}

function pairHits(chart, ruleId, matcher) {
  const hits = [];
  for (const [a, b] of pairsOf(chart)) {
    const detail = matcher(a.branch, b.branch);
    if (!detail) continue;
    hits.push(makeHit(ruleId, {
      pillar: a.pillar, position: 'branch', char: a.branch, basisKey: 'pair', luckIndex: a.luckIndex,
      pair: [pairNode(a, a.branch), pairNode(b, b.branch)], detail: detail === true ? undefined : detail,
    }));
  }
  return hits;
}

export function evaluateHyung(chart, opts) {
  const hits = [];
  const all = targetsOf(chart);
  const natal = targetsOf(chart, { luck: false });
  const dayStem = chart.natal.day?.stem;
  if (dayStem) {
    const yangin = yanginOf(dayStem, opts);
    const biin = yangin ? biinBranch(yangin) : '';
    const hongyeom = HONGYEOM_BY_STEM[dayStem];
    for (const [ruleId, branch] of [['yangin', yangin], ['biin', biin], ['hongyeom', hongyeom]]) {
      if (!branch) continue;
      for (const target of all) {
        if (target.branch !== branch) continue;
        hits.push(makeHit(ruleId, { pillar: target.pillar, position: 'branch', char: branch, basisKey: 'dayStem', basisChar: dayStem, luckIndex: target.luckIndex }));
      }
    }
  }
  const hyeonchimBranches = opts.hyeonchimIncludeMi ? [...HYEONCHIM_BRANCHES, HYEONCHIM_MI] : HYEONCHIM_BRANCHES;
  for (const target of natal) {
    if (HYEONCHIM_STEMS.includes(target.stem)) hits.push(makeHit('hyeonchim', { pillar: target.pillar, position: 'stem', char: target.stem, basisKey: 'char' }));
    if (hyeonchimBranches.includes(target.branch)) hits.push(makeHit('hyeonchim', { pillar: target.pillar, position: 'branch', char: target.branch, basisKey: 'char' }));
  }
  for (const target of all) {
    if (BAEKHO_GANJI.includes(target.ganji)) hits.push(makeHit('baekho', { pillar: target.pillar, position: 'pillar', char: target.ganji, basisKey: 'pillar', luckIndex: target.luckIndex }));
  }
  const goegang = opts.goegangIncludeMuSul ? [...GOEGANG_BASE_GANJI, GOEGANG_MU_SUL] : GOEGANG_BASE_GANJI;
  for (const target of natal) {
    if (!goegang.includes(target.ganji)) continue;
    hits.push(makeHit('goegang', { pillar: target.pillar, position: 'pillar', char: target.ganji, basisKey: 'pillar', emphasis: target.pillar === 'day' }));
  }
  const day = chart.natal.day;
  if (day && GORAN_DAY_GANJI.includes(day.ganji)) {
    hits.push(makeHit('goran', { pillar: 'day', position: 'pillar', char: day.ganji, basisKey: 'dayPillar' }));
  }
  hits.push(...pairHits(chart, 'wonjin', (a, b) => inPairs(WONJIN_PAIRS, a, b)));
  hits.push(...pairHits(chart, 'gwimun', (a, b) => inPairs(GWIMUN_PAIRS, a, b)));
  hits.push(...pairHits(chart, 'cheonrajimang', (a, b) => CHEONRA_JIMANG_PAIRS[a + b] || CHEONRA_JIMANG_PAIRS[b + a] || ''));
  const yearBranch = chart.natal.year?.branch;
  if (yearBranch) {
    const sangmun = sangmunBranch(yearBranch);
    const jogaek = jogaekBranch(yearBranch);
    for (const row of all.filter((target) => target.pillar === 'sewoon')) {
      if (row.branch === sangmun) hits.push(makeHit('sangmun', { pillar: 'sewoon', position: 'branch', char: row.branch, basisKey: 'yearBranch', basisChar: yearBranch, luckIndex: row.luckIndex }));
      if (row.branch === jogaek) hits.push(makeHit('jogaek', { pillar: 'sewoon', position: 'branch', char: row.branch, basisKey: 'yearBranch', basisChar: yearBranch, luckIndex: row.luckIndex }));
    }
  }
  const gongmangBases = [['dayPillar', 'day']];
  if (opts.gongmangYearBasis) gongmangBases.push(['yearPillar', 'year']);
  for (const [basisKey, basisPillar] of gongmangBases) {
    const base = chart.natal[basisPillar];
    if (!base) continue;
    const empty = gongmangBranches(base.stem, base.branch);
    for (const target of all) {
      if (target.pillar === basisPillar || !empty.includes(target.branch)) continue;
      hits.push(makeHit('gongmang', { pillar: target.pillar, position: 'branch', char: target.branch, basisKey, basisChar: base.ganji, luckIndex: target.luckIndex }));
    }
  }
  return hits;
}
