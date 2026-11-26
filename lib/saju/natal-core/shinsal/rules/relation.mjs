// 관계: 천간 합·충, 지지 육합·반합(왕지 포함)·충·형(삼형/상형/자형)·파·해는 짝 단위, 삼합·방합·삼형 완성은 세 지지 단위.
// 원국 짝 + 운×원국 짝. 화면용이며 직렬화 블록에는 넣지 않는다(기존 프롬프트가 합충을 따로 싣는다).
// 반합은 왕지(子午卯酉)를 낀 두 지지만 인정한다. worker/lib/saju-shinsal.js 는 같은 삼합 그룹이면 모두 "삼합"이라 부른다(의도한 차이).
import {
  STEM_HAP, STEM_CHUNG, BRANCH_LIUHE, BRANCH_CHUNG, SAMHAP, BANGHAP,
  HYEONG_TRIADS, SANGHYEONG_PAIR, JAHYEONG_BRANCHES, PA_PAIRS, HAE_PAIRS,
} from '../tables.mjs';
import { makeHit, pairsOf, pairNode, inPairs, targetsOf } from './common.mjs';

function stemRelations(a, b) {
  const out = [];
  if (STEM_HAP[a.stem]?.[0] === b.stem) out.push(['stemHap', STEM_HAP[a.stem][1]]);
  if (STEM_CHUNG[a.stem] === b.stem) out.push(['stemChung', '']);
  return out;
}

function branchRelations(x, y) {
  const out = [];
  if (BRANCH_LIUHE[x]?.[0] === y) out.push(['yukhap', BRANCH_LIUHE[x][1]]);
  const group = SAMHAP.find((entry) => entry.members.includes(x) && entry.members.includes(y));
  if (group && x !== y && (group.members[1] === x || group.members[1] === y)) out.push(['banhap', group.el]);
  if (BRANCH_CHUNG[x] === y) out.push(['chung', '']);
  if (x !== y && HYEONG_TRIADS.some((triad) => triad.includes(x) && triad.includes(y))) out.push(['hyeong', '삼형']);
  if (inPairs([SANGHYEONG_PAIR], x, y)) out.push(['hyeong', '상형']);
  if (x === y && JAHYEONG_BRANCHES.includes(x)) out.push(['hyeong', '자형']);
  if (inPairs(PA_PAIRS, x, y)) out.push(['pa', '']);
  if (inPairs(HAE_PAIRS, x, y)) out.push(['hae', '']);
  return out;
}

export function evaluateRelations(chart) {
  const hits = [];
  for (const [a, b] of pairsOf(chart)) {
    for (const [ruleId, detail] of stemRelations(a, b)) {
      hits.push(makeHit(ruleId, {
        pillar: a.pillar, position: 'stem', char: a.stem, basisKey: 'stemPair', luckIndex: a.luckIndex,
        pair: [pairNode(a, a.stem), pairNode(b, b.stem)], detail,
      }));
    }
    for (const [ruleId, detail] of branchRelations(a.branch, b.branch)) {
      hits.push(makeHit(ruleId, {
        pillar: a.pillar, position: 'branch', char: a.branch, basisKey: 'pair', luckIndex: a.luckIndex,
        pair: [pairNode(a, a.branch), pairNode(b, b.branch)], detail,
      }));
    }
  }
  // 원국 안에서 세 지지가 모두 있을 때만 삼합·방합·삼형 완성.
  const natal = targetsOf(chart, { luck: false });
  const triads = [
    ...SAMHAP.map((entry) => ['samhap', entry.members, entry.el]),
    ...BANGHAP.map((entry) => ['banghap', entry.members, entry.el]),
    ...HYEONG_TRIADS.map((members) => ['hyeong', members, '삼형 완성']),
  ];
  for (const [ruleId, members, detail] of triads) {
    const nodes = members.map((branch) => natal.find((target) => target.branch === branch));
    if (nodes.some((node) => !node)) continue;
    hits.push(makeHit(ruleId, {
      pillar: nodes[0].pillar, position: 'branch', char: members.join(''), basisKey: 'triad',
      pair: nodes.map((node) => pairNode(node, node.branch)), detail,
    }));
  }
  return hits;
}
