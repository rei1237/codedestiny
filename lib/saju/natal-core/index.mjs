// NatalCore: 원국만으로 계산하는 순수 함수. 설문·과거 사건·LLM 출력·전역 상태에 의존하지 않는다.
// 규칙 명세: docs/design/saju-natal-core-rule-profile.md
import { STEM_EL, STEM_YANG, EL_KO, GENERATES, CONTROLS, ELEMENTS, POSITIONS, controllerOf, parentOf, relationOf } from './tables.mjs';
import { normalizeChart, possibleHourPillars, hiddenStemsOf, stemCombinations, branchRelations, visibleCounts, rootSummary, pillarText } from './relations.mjs';
import { evaluateSpecialFull, mergeHourVariants, decideSpecial } from './special.mjs';
import { monthStructure, finalGyeokguk, FAMILY_KO, gyeokgukView } from './gyeokguk.mjs';
import { analyzeClimate, JOHU_NEED, climateV2 } from './climate.mjs';
import { strengthOf } from './strength.mjs';
import { NATAL_CORE_VERSION } from './version.mjs';
import { analyzeTombFrame, tombOverall, SAJU_TOMB_VERSION } from './tomb.mjs';
import { sajuLuckPeriods } from '../luck-periods.mjs';

export { NATAL_CORE_VERSION };
export { surfaceElementCounts } from './relations.mjs';
export { SAJU_TOMB_VERSION, TOMB_BRANCH, TOMB_STATUS_KO, TOMB_VERDICT_KO, TOMB_READING_RULE, tombReadingRows, tombPromptFacts } from './tomb.mjs';
export { computeShinsal, serializeShinsalForPrompt, SHINSAL_VERSION, DEFAULT_SHINSAL_OPTIONS, normalizeShinsalChart } from './shinsal/index.mjs';
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

// ── 용신법별 후보(yongsin-methods-v1, 2026-11-18 사용자 요청) ─────────────────
// 억부·조후·통관·병약·종격을 각각 후보와 이유로 남기고, 최종은 종격 > 조후(급할 때) > 억부 순으로 고른다.
// 통관·병약은 최종을 바꾸지 않는 보조다. 기존 yongshin(yongshinBreakdown)과 strength는 바꾸지 않는다.
export const YONGSIN_METHODS_VERSION = 'yongsin-methods-v1';
const elList = (els) => els.map((el) => `${EL_KO[el]}(${{ wood: '木', fire: '火', earth: '土', metal: '金', water: '水' }[el]})`).join('·');
const uniq = (list) => [...new Set(list.filter(Boolean))];

function byeongyak(counts, avoid) {
  const sick = avoid.filter((el) => counts.byEl[el] >= 4).sort((a, b) => counts.byEl[b] - counts.byEl[a])[0];
  if (!sick) return { status: 'none', useful: [], reason: '한쪽으로 지나치게 몰린 꺼리는 기운이 없어요.' };
  const medicine = [controllerOf(sick), GENERATES[sick]].find((el) => el && !avoid.includes(el));
  if (!medicine) return { status: 'none', disease: sick, useful: [], reason: `${elList([sick])} 기운이 많지만 눌러 줄 기운도 꺼리는 쪽이라 병약으로 고르지 않아요.` };
  const how = medicine === controllerOf(sick) ? '눌러 주는' : '흘려보내는';
  return { status: 'candidate', disease: sick, useful: [medicine], reason: `${elList([sick])} 기운이 지나치게 많아(${counts.byEl[sick]}칸) 병이 되니, 그것을 ${how} ${elList([medicine])} 기운이 약이에요.` };
}

// 억부 용신의 순서. 후보 집합은 strength.yongshin 그대로 두고, 무엇 때문에 약한지·강한지에 따라 첫 자리만 정한다.
// 신약: 관살·식상에 눌리면 인성 먼저(살인상생·인성제식), 재성에 눌리면 비겁 먼저. 신강: 인성이 많아 강하면 재성 먼저(재극인).
function eokbuOrder(strength, counts) {
  const byRel = counts.byRel || {};
  const order = [...strength.yongshin];
  const relOf = (el) => relationOf(strength.dayEl, el);
  const pickFirst = (rel) => { const i = order.findIndex((el) => relOf(el) === rel); if (i > 0) order.unshift(order.splice(i, 1)[0]); };
  let why;
  if (!strength.isStrong) {
    const heaviest = ['officer', 'output', 'wealth'].sort((a, b) => (byRel[b] || 0) - (byRel[a] || 0))[0];
    if (heaviest === 'wealth') { pickFirst('self'); why = '재성(재물·현실 부담)에 눌려 약하니, 같은 편이 되어 주는'; }
    else { pickFirst('parent'); why = heaviest === 'officer' ? '관살(책임·압박)에 눌려 약하니, 압박을 받아 힘으로 바꿔 주는' : '식상(표현·소모)으로 힘이 새어 약하니, 다시 채워 주는'; }
  } else if ((byRel.parent || 0) > (byRel.self || 0) - 1) { pickFirst('wealth'); why = '인성(도움·생각)이 많아 강하니, 넘치는 생각을 현실로 묶어 주는'; }
  else why = '같은 편 기운이 많아 강하니, 힘을 밖으로 흘려 주는';
  return { order, why };
}

function yongsinMethods({ chart, strength, special, counts, candidates }) {
  const adopted = special.decision === 'special' ? special.adopted : null;
  const eo = strength && eokbuOrder(strength, counts);
  const eokbu = strength
    ? { status: 'ok', useful: eo.order, avoid: [...strength.kijishin], isStrong: strength.isStrong, score: strength.score, applies: !adopted,
      reason: `일간 기운이 ${strength.isStrong ? '강한' : '약한'} 편(${strength.score}점)이에요. ${eo.why} ${elList(eo.order.slice(0, 1))} 기운이 먼저 필요해요.` }
    : { status: 'insufficient', useful: [], avoid: [], applies: false, reason: '일간 강약을 판단할 수 없어요.' };
  const climate = climateV2(chart);
  const johu = climate.status === 'ok'
    ? { status: 'ok', type: climate.classification.type, severity: climate.classification.severity, urgent: climate.urgent, useful: [...climate.needs.elements], avoid: [...climate.needs.avoid], chars: [...climate.needs.chars], reason: climate.reasons[climate.reasons.length - 1], climate }
    : { status: 'insufficient', urgent: false, useful: [], avoid: [], reason: climate.reasons[0], climate };
  const tg = tonggwan(counts);
  const tong = tg.status === 'candidate'
    ? { status: 'candidate', useful: [...tg.elements], reason: `${elList([parentOf(tg.elements[0]), CONTROLS[parentOf(tg.elements[0])]])} 기운이 서로 맞서 있어, 그 사이를 ${elList(tg.elements)} 기운이 이어 줘요.` }
    : { status: 'none', useful: [], reason: tg.note };
  const sick = byeongyak(counts, eokbu.avoid);
  const pick = adopted && candidates.find((c) => c.id === adopted.id) || adopted;
  const jong = special.decision === 'special' && pick
    ? { status: 'adopted', name: pick.name, useful: uniq([pick.dominant, pick.second]), avoid: [controllerOf(pick.dominant)],
      reason: `기운이 ${elList([pick.dominant])} 쪽으로 크게 쏠린 ${pick.name}이라, 억지로 균형을 맞추기보다 그 흐름을 따르는 편이 좋아요.` }
    : { status: special.decision === 'pending' ? 'pending' : 'none', useful: [], avoid: [], reason: special.decision === 'pending' ? '특수격인지 판단이 갈려 보류해요.' : '한 기운을 따라가야 할 만큼 쏠린 사주는 아니에요.' };

  let method, useful, avoid, reason;
  if (jong.status === 'adopted') {
    method = 'jong'; useful = jong.useful; avoid = jong.avoid;
    reason = `기운이 한쪽으로 크게 쏠린 사주라, 그 흐름을 따르는 ${elList(jong.useful)} 기운이 가장 힘이 돼요.`;
  } else if (johu.status === 'ok' && johu.urgent && johu.useful.length) {
    method = 'johu';
    useful = uniq([...johu.useful, ...eokbu.useful.filter((el) => !johu.avoid.includes(el))]);
    avoid = uniq([...johu.avoid, ...eokbu.avoid]).filter((el) => !useful.includes(el));
    reason = `${{ 한습: '차고 축축한', 조열: '뜨겁고 메마른', 한조: '차고 메마른', 습열: '덥고 눅눅한', 한: '차가운', 열: '뜨거운', 습: '습기가 많은', 조: '건조한' }[johu.type] || '한쪽으로 치우친'} 사주라 온도·습도를 먼저 맞춰 주는 ${elList(johu.useful)} 기운이 가장 급해요.`;
  } else if (eokbu.status === 'ok') {
    method = 'eokbu'; useful = eokbu.useful; avoid = eokbu.avoid;
    reason = `${eo.why} ${elList(useful.slice(0, 1))} 기운이 균형을 잡아 줘요.`;
  } else {
    method = 'insufficient'; useful = []; avoid = [];
    reason = '태어난 정보가 부족해 용신을 정하지 않아요.';
  }
  const supplements = [];
  for (const [name, m] of [['tonggwan', tong], ['byeongyak', sick]]) {
    if (m.status !== 'candidate') continue;
    const conflict = m.useful.some((el) => avoid.includes(el));
    supplements.push({ method: name, elements: m.useful, conflict, reason: conflict ? `${m.reason} 다만 최종 판단에서는 꺼리는 기운이라 참고만 해요.` : m.reason });
  }
  if (method !== 'johu' && johu.status === 'ok' && johu.useful.length && johu.severity !== 'balanced') {
    const conflict = johu.useful.some((el) => avoid.includes(el));
    supplements.push({ method: 'johu', elements: johu.useful, conflict, reason: johu.reason });
  }
  return {
    version: YONGSIN_METHODS_VERSION,
    eokbu, johu, tonggwan: tong, byeongyak: sick, jong,
    final: { method, yongsin: useful[0] || null, heesin: useful[1] || null, useful, avoid, supplements, reason },
    order: ['jong', 'johu(urgent)', 'eokbu'],
  };
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
    yongsinMethods: yongsinMethods({ chart, strength, special, counts, candidates }),
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

// Additive interpretation version: natal-core identity and saved judgments remain unchanged.
export function analyzeSajuTombs(pillars, { luckRows = [], simultaneous = false } = {}) {
  const chart = normalizeChart(pillars), core = analyzeNatalCore(chart);
  const periods = sajuLuckPeriods(luckRows.filter(row => ['daewoon', 'sewoon'].includes(row.scope)), { simultaneous });
  const variants = !chart.hourKnown && chart.dayKnown ? possibleHourPillars(chart.d.g).map(h => {
    const p = normalizeChart({ ...chart, h });
    return { chart: p, core: analyzeNatalCore(p) };
  }) : [];
  const analyses = periods.map(period => {
    const frame = analyzeTombFrame(chart, core, period.rows, { id: period.id, label: period.label });
    if (variants.length) {
      const alternatives = variants.map(v => analyzeTombFrame(v.chart, v.core, period.rows, frame.period));
      for (const event of frame.events) {
        const matches = alternatives.map(a => a.events.find(row => row.id === event.id));
        const judgments = new Set(matches.map(row => row && [row.status, row.role, row.verdict].join(':')));
        if (judgments.size === 1 && matches.every(Boolean)) {
          const row = matches[0];
          event.status = row.status; event.role = row.role; event.verdict = row.verdict;
          event.hourStable = true;
          // Keep only evidence present in the known chart; never expose an invented hour.
          event.mitigations.push('가능한 12개 시주에서 같은 방향으로 판단됨');
        } else {
          event.status = 'pending'; event.role = 'undetermined'; event.verdict = 'undetermined'; event.hourStable = false;
          event.mitigations.push('시주에 따라 성립·완화 또는 희기 판단이 달라짐');
        }
      }
      frame.verdict = tombOverall(frame.events);
    }
    return frame;
  });
  const events = analyses.flatMap(frame => frame.events);
  return deepFreeze({ version: SAJU_TOMB_VERSION, natalAnalysisId: core.analysisId,
    analysisId: `${core.analysisId}:${SAJU_TOMB_VERSION}:${stableHash(JSON.stringify(periods))}`,
    periods: analyses.map(frame => ({ period: frame.period, verdict: frame.verdict, eventIds: frame.events.map(row => row.id) })),
    events, verdict: analyses.length === 1 ? analyses[0].verdict : 'undetermined', hourKnown: chart.hourKnown,
    limitations: chart.hourKnown ? [] : ['시주 미상: 알려진 글자만 표시하며, 가능한 12개 시주에서 달라지는 판정은 보류합니다.'],
    rule: analyses[0]?.rule || '' });
}
