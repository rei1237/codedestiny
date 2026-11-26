// 12신살: 기준 지지(년지·일지)의 삼합 그룹에서 겁살 자리부터 12지를 돈다(sinsal-rules twelveSinsalName).
// twelveBasis: 'yearBranch' | 'dayBranch' | 'both'(기본). 원국 4주와 대운·세운·월운 지지에 모두 적용한다.
import { TWELVE_IDS, TWELVE_SINSAL_NAMES, twelveSinsalName } from '../tables.mjs';
import { makeHit, targetsOf } from './common.mjs';

const BASES = Object.freeze({ yearBranch: ['year'], dayBranch: ['day'], both: ['year', 'day'] });

export function evaluateTwelve(chart, opts) {
  const basisPillars = BASES[opts.twelveBasis] || BASES.both;
  const hits = [];
  for (const basisPillar of basisPillars) {
    const basisChar = chart.natal[basisPillar]?.branch;
    if (!basisChar) continue;
    const basisKey = basisPillar === 'year' ? 'yearBranch' : 'dayBranch';
    for (const target of targetsOf(chart)) {
      const name = twelveSinsalName(basisChar, target.branch);
      const index = TWELVE_SINSAL_NAMES.indexOf(name);
      if (index < 0) continue;
      hits.push(makeHit(TWELVE_IDS[index], {
        pillar: target.pillar, position: 'branch', char: target.branch, basisKey, basisChar, luckIndex: target.luckIndex,
      }));
    }
  }
  return hits;
}
