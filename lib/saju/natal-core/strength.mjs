// 억부 강약. 점수와 신강/신약 판정은 js/saju-engine.js calcPower와 같다(패리티 테스트로 고정).
// 과거 경험으로 뒤집지 않는다. 근거 필드(득령·통근·생조)만 더한다.
import { STEM_EL, BRANCH_EL, GENERATES, CONTROLS, parentOf, controllerOf, relationOf } from './tables.mjs';
import { rootSummary } from './relations.mjs';

const elOf = (c) => STEM_EL[c] || BRANCH_EL[c] || '';

export function strengthOf(chart, hidden) {
  const dayEl = STEM_EL[chart.d.g];
  if (!dayEl) return null;
  const parEl = parentOf(dayEl);
  let score = 0;
  const mjEl = BRANCH_EL[chart.m.j];
  if (mjEl) {
    if (mjEl === dayEl) score += 40;
    else if (mjEl === parEl) score += 27;
    else if (CONTROLS[mjEl] === dayEl) score -= 27;
    else if (GENERATES[dayEl] === mjEl) score -= 10;
  }
  const djEl = BRANCH_EL[chart.d.j];
  if (djEl) {
    if (djEl === dayEl || djEl === parEl) score += 13;
    else if (CONTROLS[djEl] === dayEl) score -= 9;
  }
  for (const c of [chart.y.g, chart.y.j, chart.m.g, chart.h.g, chart.h.j]) {
    const ce = elOf(c);
    if (!ce) continue;
    if (ce === dayEl || ce === parEl) score += 7;
    else if (CONTROLS[ce] === dayEl) score -= 7;
  }
  const isStrong = score >= 30;
  const drain = GENERATES[dayEl];
  const yongshin = isStrong ? [drain, GENERATES[drain], controllerOf(dayEl)] : [dayEl, parEl];
  const kijishin = isStrong ? [dayEl, parEl] : [GENERATES[dayEl], controllerOf(dayEl), CONTROLS[dayEl]];
  const roots = rootSummary(hidden, dayEl);
  return {
    isStrong, score, yongshin, kijishin, dayEl, parEl,
    complete: chart.hourKnown && Boolean(mjEl),
    evidence: {
      deukryeong: mjEl ? relationOf(dayEl, mjEl) : 'unknown',
      dayRoots: { effective: roots.effective, weak: roots.weak },
      parentRoots: rootSummary(hidden, parEl).any,
      threshold: 30,
      basis: 'calcPower: 월지 ±40/27/10, 일지 ±13/9, 나머지 ±7',
    },
  };
}
