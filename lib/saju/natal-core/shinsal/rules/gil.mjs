// 길신: 건록·암록·금여(일간 기준), 협록(원국에 건록 양옆 지지가 둘 다 있을 때), 천의성(월지 바로 앞 지지).
import { GEONROK_BY_STEM, AMROK_BY_STEM, GEUMYEO_BY_STEM, shiftBranch, cheonuiBranch } from '../tables.mjs';
import { makeHit, targetsOf, pairNode } from './common.mjs';

export function evaluateGil(chart) {
  const hits = [];
  const targets = targetsOf(chart);
  const dayStem = chart.natal.day?.stem;
  if (dayStem) {
    for (const [ruleId, table] of [['geonrok', GEONROK_BY_STEM], ['amrok', AMROK_BY_STEM], ['geumyeo', GEUMYEO_BY_STEM]]) {
      const branch = table[dayStem];
      for (const target of targets) {
        if (target.branch !== branch) continue;
        hits.push(makeHit(ruleId, { pillar: target.pillar, position: 'branch', char: branch, basisKey: 'dayStem', basisChar: dayStem, luckIndex: target.luckIndex }));
      }
    }
    // 협록: 원국 한정. 시주 미상이면 시지는 이미 빠져 있다.
    const rok = GEONROK_BY_STEM[dayStem];
    const before = shiftBranch(rok, -1);
    const after = shiftBranch(rok, 1);
    const natal = targetsOf(chart, { luck: false });
    const left = natal.find((target) => target.branch === before);
    const right = natal.find((target) => target.branch === after);
    if (left && right) {
      hits.push(makeHit('hyeoprok', {
        pillar: left.pillar, position: 'branch', char: before, basisKey: 'dayStem', basisChar: dayStem,
        pair: [pairNode(left, before), pairNode(right, after)],
      }));
    }
  }
  const month = chart.natal.month?.branch;
  if (month) {
    const branch = cheonuiBranch(month);
    for (const target of targets) {
      if (target.branch !== branch) continue;
      hits.push(makeHit('cheonui', { pillar: target.pillar, position: 'branch', char: branch, basisKey: 'monthBranch', basisChar: month, luckIndex: target.luckIndex }));
    }
  }
  return hits;
}
