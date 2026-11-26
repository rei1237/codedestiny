// 귀인: 일간 기준(옵션 gwiinYearStem 이면 년간도), 천덕·월덕은 월지 기준.
// 문곡귀인·관귀학관은 TODO(자문확정) — 표가 비어 있어 적중이 나오지 않는다(catalog hidden).
import {
  CHEONEUL_BY_STEM, CHEONEUL_GENG_IN_O, TAEGEUK_BY_STEM, MUNCHANG_BY_STEM, HAKDANG_BY_STEM, HAKDANG_MU_SHIN,
  CHEONJU_BY_STEM, CHEONDEOK_BY_MONTH, WOLDEOK_BY_SAMHAP, STEM_ORDER, samhapGroup,
} from '../tables.mjs';
import { makeHit, targetsOf } from './common.mjs';

// TODO(자문확정): 문곡귀인·관귀학관 조견표. 확정 전까지 빈 표.
export const MUNKOK_BY_STEM = Object.freeze({});
export const GWANGWI_BY_STEM = Object.freeze({});

function stemTables(stem, opts) {
  const cheoneul = stem === '庚' && opts.cheoneulGengInO ? CHEONEUL_GENG_IN_O : CHEONEUL_BY_STEM[stem] || [];
  const hakdang = stem === '戊' && opts.hakdangMuShin ? HAKDANG_MU_SHIN : HAKDANG_BY_STEM[stem];
  return [
    ['cheoneul', cheoneul],
    ['taegeuk', TAEGEUK_BY_STEM[stem] || []],
    ['munchang', [MUNCHANG_BY_STEM[stem]].filter(Boolean)],
    ['hakdang', [hakdang].filter(Boolean)],
    ['cheonju', [CHEONJU_BY_STEM[stem]].filter(Boolean)],
    ['munkok', [MUNKOK_BY_STEM[stem]].filter(Boolean)],
    ['gwangwi', [GWANGWI_BY_STEM[stem]].filter(Boolean)],
  ];
}

export function evaluateGwiin(chart, opts) {
  const hits = [];
  const targets = targetsOf(chart);
  const bases = [['dayStem', chart.natal.day?.stem]];
  if (opts.gwiinYearStem) bases.push(['yearStem', chart.natal.year?.stem]);
  for (const [basisKey, basisChar] of bases) {
    if (!basisChar) continue;
    for (const [ruleId, branches] of stemTables(basisChar, opts)) {
      for (const target of targets) {
        if (!branches.includes(target.branch)) continue;
        hits.push(makeHit(ruleId, { pillar: target.pillar, position: 'branch', char: target.branch, basisKey, basisChar, luckIndex: target.luckIndex }));
      }
    }
  }
  const month = chart.natal.month?.branch;
  if (month) {
    // 천덕: 월지별 글자가 천간이면 천간에서, 지지면 지지에서 찾는다.
    const deok = CHEONDEOK_BY_MONTH[month];
    const deokIsStem = STEM_ORDER.includes(deok);
    for (const target of targets) {
      const char = deokIsStem ? target.stem : target.branch;
      if (char !== deok) continue;
      hits.push(makeHit('cheondeok', { pillar: target.pillar, position: deokIsStem ? 'stem' : 'branch', char, basisKey: 'monthBranch', basisChar: month, luckIndex: target.luckIndex }));
    }
    // 월덕: 월지 삼합 그룹의 천간.
    const woldeok = WOLDEOK_BY_SAMHAP[samhapGroup(month)?.key];
    for (const target of targets) {
      if (!woldeok || target.stem !== woldeok) continue;
      hits.push(makeHit('woldeok', { pillar: target.pillar, position: 'stem', char: target.stem, basisKey: 'monthBranch', basisChar: month, luckIndex: target.luckIndex }));
    }
  }
  return hits;
}
