// NatalCore: 원국만으로 계산하는 순수 함수. 설문·과거 사건·LLM 출력·전역 상태에 의존하지 않는다.
// 규칙 명세: docs/design/saju-natal-core-rule-profile.md
import { STEM_EL, STEM_YANG, EL_KO, GENERATES, CONTROLS, ELEMENTS, POSITIONS } from './tables.mjs';
import { normalizeChart, possibleHourPillars, hiddenStemsOf, stemCombinations, branchRelations, visibleCounts, rootSummary, pillarText } from './relations.mjs';
import { evaluateSpecialFull, mergeHourVariants, decideSpecial } from './special.mjs';
import { monthStructure, finalGyeokguk, FAMILY_KO, gyeokgukView } from './gyeokguk.mjs';
import { analyzeClimate, JOHU_NEED } from './climate.mjs';
import { strengthOf } from './strength.mjs';
import { NATAL_CORE_VERSION } from './version.mjs';

export { NATAL_CORE_VERSION };
export const NATAL_RULE_PROFILE = Object.freeze({
  id: 'rok-yangin-strictjong-v1',
  // 개발 정책 보조값. 고전 원문의 수치가 아니다.
  followShare: 0.7,
  outputMin: 3,
  chungRootFactor: 0.5,
});
export { analyzeClimate, FAMILY_KO, gyeokgukView };

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

// 32비트 FNV-1a 두 번(시드 다름). 암호용이 아니라 캐시·분석 ID용이다.
function fnv(text, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
export const stableHash = (text) => fnv(String(text), 2166136261) + fnv(String(text), 3735928559);

export function natalAnalysisKeyMaterial({ pillars, ruleProfileId = NATAL_RULE_PROFILE.id, birthKey = '', engineVersion = '' } = {}) {
  const chart = normalizeChart(pillars);
  const text = POSITIONS.map((pos) => pillarText(chart, pos) || '-').join('');
  return [NATAL_CORE_VERSION, ruleProfileId, engineVersion, birthKey, text, chart.hourKnown ? 'hour' : 'no-hour'].join('|');
}
export const natalAnalysisId = (opts) => `nc1-${stableHash(natalAnalysisKeyMaterial(opts))}`;

function tonggwan(counts) {
  const top = [...ELEMENTS].sort((a, b) => counts.byEl[b] - counts.byEl[a]).slice(0, 2);
  const [a, b] = top;
  if (counts.byEl[a] < 3 || counts.byEl[b] < 3) return { status: 'none', note: '맞서는 두 세력이 뚜렷하지 않음' };
  const controller = CONTROLS[a] === b ? a : CONTROLS[b] === a ? b : '';
  if (!controller) return { status: 'none', note: '상위 두 오행이 극 관계가 아님' };
  const controlled = controller === a ? b : a;
  return { status: 'candidate', elements: [GENERATES[controller]], note: `${EL_KO[controller]}·${EL_KO[controlled]}이 맞서 ${EL_KO[GENERATES[controller]]}이 잇는다` };
}

function yongshinBreakdown({ strength, climate, month, special, counts, profile }) {
  const adopted = special.decision === 'special' ? special.adopted : null;
  const johu = {
    hanNan: { type: climate.hanNan.type, elements: JOHU_NEED[climate.hanNan.type] || [] },
    joSeup: { type: climate.joSeup.type, elements: JOHU_NEED[climate.joSeup.type] || [] },
  };
  const gyeok = month.status !== 'pass'
    ? { status: 'unknown' }
    : month.kind === 'regular'
      ? { status: 'not-evaluated', structure: month.name, note: '상신 선택은 이 버전에서 자동화하지 않음' }
      : { status: 'candidates', structure: month.name, subUses: month.subUses, wealthOfficerRole: 'not-kishin-by-rok' };
  const conflicts = [];
  const avoid = new Set(strength?.kijishin || []);
  for (const axis of ['hanNan', 'joSeup']) for (const el of johu[axis].elements) {
    if (avoid.has(el)) conflicts.push({ between: ['eokbu', `johu.${axis}`], element: el, note: `${EL_KO[el]}: 억부에서는 꺼리고 조후에서는 필요` });
  }
  return {
    eokbu: strength ? { useful: strength.yongshin, avoid: strength.kijishin, isStrong: strength.isStrong, applies: !adopted } : null,
    johu,
    gyeokguk: gyeok,
    tonggwan: tonggwan(counts),
    byeongyak: { status: 'not-evaluated' },
    special: adopted ? { name: adopted.name, follow: [adopted.dominant, adopted.second] } : null,
    conflicts,
    // 충돌은 평균 내지 않고 함께 표시한다. 우선순위는 프로필이 정한다.
    priority: adopted ? ['special', 'johu'] : ['gyeokguk', 'eokbu', 'johu', 'tonggwan'],
    profile: profile.id,
  };
}

export function analyzeNatalCore(pillars, { ruleProfile = NATAL_RULE_PROFILE } = {}) {
  const chart = normalizeChart(pillars);
  const profile = ruleProfile;
  const head = {
    version: NATAL_CORE_VERSION, ruleProfile: profile.id,
    input: { pillars: Object.fromEntries(POSITIONS.map((pos) => [pos, pillarText(chart, pos)])), hourKnown: chart.hourKnown, monthKnown: chart.monthKnown },
    analysisId: natalAnalysisId({ pillars: chart, ruleProfileId: profile.id }),
  };
  if (!chart.dayKnown) return deepFreeze({ ...head, status: 'invalid', limitations: ['일주 미상'] });
  const hidden = hiddenStemsOf(chart);
  const counts = visibleCounts(chart);
  const variants = chart.hourKnown ? [chart] : possibleHourPillars(chart.d.g).map((h) => ({ ...chart, h, hourKnown: true }));
  const candidates = variants.length === 1 ? evaluateSpecialFull(chart, profile) : mergeHourVariants(variants.map((v) => evaluateSpecialFull(v, profile)));
  const special = decideSpecial(candidates);
  const month = monthStructure(chart);
  const monthByHour = new Set(variants.map((v) => monthStructure(v).name));
  if (!chart.hourKnown && monthByHour.size > 1) { month.hourSensitive = true; month.alternatives = [...monthByHour]; }
  const gyeokguk = finalGyeokguk(month, special);
  const strength = strengthOf(chart, hidden);
  const climate = analyzeClimate(chart);
  const dayEl = STEM_EL[chart.d.g];
  const limitations = [];
  if (!chart.hourKnown) limitations.push('시주 미상: 시주에 따라 갈리는 판정은 보류합니다.');
  if (!chart.monthKnown) limitations.push('월주 미상: 월령 판정을 하지 않습니다.');
  if (special.decision === 'pending') limitations.push(`특수격 판정 보류: ${special.pending.join(', ')}`);
  return deepFreeze({
    ...head,
    status: 'ok',
    dayMaster: { stem: chart.d.g, el: dayEl, yang: STEM_YANG[chart.d.g] },
    hidden,
    counts,
    roots: { day: rootSummary(hidden, dayEl) },
    relations: { stems: stemCombinations(chart, hidden), branches: branchRelations(chart) },
    monthStructure: month,
    special: { decision: special.decision, adopted: special.adopted ? special.adopted.id : null, candidates },
    gyeokguk: { ...gyeokguk, familyKo: FAMILY_KO[gyeokguk.family] },
    strength,
    climate,
    yongshin: yongshinBreakdown({ strength, climate, month, special, counts, profile }),
    limitations,
  });
}

// 기존 detectJong 반환 모양. natalCore는 열거되지 않게 붙여 기존 JSON 직렬화가 바뀌지 않는다.
export function legacyJongShape(core) {
  let out;
  const adopted = core?.special?.adopted && core.special.candidates.find((c) => c.id === core.special.adopted);
  if (!adopted || core.gyeokguk.family === 'general') out = { isJong: false };
  else {
    const { byEl, total } = core.counts;
    const share = ((byEl[adopted.dominant] || 0) + (adopted.second && adopted.second !== adopted.dominant ? byEl[adopted.second] || 0 : 0)) / (total || 1) * 100;
    const merged = adopted.family === 'transform' ? { [core.dayMaster.stem]: true, [adopted.partner]: true } : {};
    out = {
      isJong: true, isGaJong: adopted.isGa === true, dominant: adopted.dominant, parEl: adopted.second, pct: share.toFixed(0),
      name: adopted.name, dayEl: core.dayMaster.el, heHaPriority: adopted.family === 'transform', ganHeMerged: merged, jiHeMerged: {},
    };
  }
  Object.defineProperty(out, 'natalCore', { value: core, enumerable: false });
  return out;
}
