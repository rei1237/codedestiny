// LLM 서비스가 공유하는 사주 판정 사실(S15-6). 계산은 lib/saju 의 정본(natal-core·luck-dynamics)이 하고,
// 여기서는 프롬프트에 실을 만큼만 짧게 투영한다. "용신 오행이 오면 좋은 해"라는 옛 신호 대신
// 합거·합화·충·형·입묘·대운 바탕까지 따진 판정과 그 이유를 넘긴다.
// 🔴 기간은 호출하는 쪽이 고른다(장·섹션·질문이 실제로 다루는 시기만). 평생 표를 통째로 싣지 않는다.
import { analyzeNatalCore } from '../../lib/saju/natal-core/index.mjs';
import { stemPairRelation } from '../../lib/saju/natal-core/stem-pairs.mjs';
import { evaluateLuckDynamics, LUCK_VERDICT_KO } from '../../lib/saju/luck-dynamics.mjs';

export const SAJU_LUCK_JUDGEMENT_VERSION = 'saju-luck-judgement-20261118-v1';

const STEM_CN = '甲乙丙丁戊己庚辛壬癸', STEM_KO = '갑을병정무기경신임계';
const BRANCH_CN = '子丑寅卯辰巳午未申酉戌亥', BRANCH_KO = '자축인묘진사오미신유술해';
const EL_KO = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
const METHOD_KO = { jong: '종격(한 기운을 따름)', johu: '조후(온도·습도부터 맞춤)', eokbu: '억부(강약 균형)', tonggwan: '통관(맞선 기운을 이어 줌)', byeongyak: '병약(지나친 기운을 덜어 냄)', insufficient: '판단 보류' };
const SEVERITY_KO = { balanced: '균형', mild: '약간', moderate: '뚜렷', strong: '강함', severe: '매우 강함', unknown: '판단 보류' };
const POSITIONS = [['year', 'y', '년'], ['month', 'm', '월'], ['day', 'd', '일'], ['hour', 'h', '시']];
const MAX_MODIFIER_REASONS = 2;

/** '庚午'·'경오'·{stem,branch}·{heavenlyStem,earthlyBranch}·{ganji} 어느 꼴이든 한자 두 글자로 맞춘다. 아니면 ''. */
export function judgementPillar(value) {
  const raw = typeof value === 'string' ? value
    : value && typeof value === 'object'
      ? (value.ganji || value.pillar || `${value.stem || value.heavenlyStem || value.g || ''}${value.branch || value.earthlyBranch || value.j || ''}`)
      : '';
  const s = String(raw || '').trim();
  const stem = STEM_CN.includes(s[0]) ? s[0] : STEM_CN[STEM_KO.indexOf(s[0])];
  const branch = BRANCH_CN.includes(s[1]) ? s[1] : BRANCH_CN[BRANCH_KO.indexOf(s[1])];
  return stem && branch && s[0] && s[1] ? stem + branch : '';
}

/** {year,month,day,hour} → natal-core 차트. 일주가 없으면 null. 시각 미상이면 시주를 비운다. */
export function judgementChart(pillars = {}, { timeUnknown = false } = {}) {
  const chart = {};
  for (const [key, short] of POSITIONS) {
    const p = key === 'hour' && timeUnknown ? '' : judgementPillar(pillars[key] ?? pillars[short]);
    chart[short] = p ? { g: p[0], j: p[1] } : { g: '', j: '' };
  }
  return chart.d.g ? chart : null;
}

const elList = (els = []) => els.map((el) => EL_KO[el]).filter(Boolean);

/** 원국 판정: 최종 용신(방법·이유), 조후 요약, 원국 천간 사이의 십간 짝 규칙. */
export function buildNatalJudgementFacts(pillars, { timeUnknown = false } = {}) {
  const chart = judgementChart(pillars, { timeUnknown });
  if (!chart) return null;
  const core = analyzeNatalCore(chart);
  const methods = core.yongsinMethods;
  const final = methods?.final;
  if (!final) return null;
  const climate = methods.johu?.climate;
  const stems = POSITIONS.filter(([, s]) => chart[s].g).map(([, s, ko]) => ({ ko, char: chart[s].g }));
  const stemPairs = [];
  for (const a of stems) for (const b of stems) {
    if (a === b) continue;
    const rel = stemPairRelation(a.char, b.char);
    if (rel?.rule && rel.direction !== 'reverse') stemPairs.push(`${a.ko}간 ${a.char} → ${b.ko}간 ${b.char}: ${rel.note}`);
  }
  return {
    version: SAJU_LUCK_JUDGEMENT_VERSION,
    yongsin: {
      method: METHOD_KO[final.method] || final.method,
      yongsin: EL_KO[final.yongsin] || '',
      useful: elList(final.useful),
      avoid: elList(final.avoid),
      reason: final.reason,
      ...(final.supplements?.length
        ? { supplements: final.supplements.slice(0, 2).map((s) => `${METHOD_KO[s.method] || s.method}: ${s.reason}`) }
        : {}),
    },
    climate: climate?.status === 'ok'
      ? { type: climate.classification.type, severity: SEVERITY_KO[climate.classification.severity] || climate.classification.severity,
        urgent: climate.urgent === true, summary: climate.reasons.at(-1) }
      : { type: '판단 보류', summary: climate?.reasons?.[0] || '태어난 정보가 부족해 온도·습도를 단정하지 않아요.' },
    ...(stemPairs.length ? { stemPairs: stemPairs.slice(0, 3) } : {}),
  };
}

/**
 * 한 시기의 판정. daeun 만 주면 대운, seun 을 주면 그 해(대운이 바탕), wolun 을 주면 그 달(그 해가 바탕).
 * reasons 는 바탕 문장 + 판정을 가장 크게 움직인 작용 두 개까지.
 */
export function buildLuckJudgement(pillars, { daeun = null, seun = null, wolun = null, label = '', timeUnknown = false } = {}) {
  return compactLuckJudgement(luckDynamicsFor(pillars, { daeun, seun, wolun, timeUnknown }), label);
}

/** luckDynamicsFor 결과를 프롬프트용으로 줄인다(이미 계산한 결과를 다시 계산하지 않을 때). */
export function compactLuckJudgement(r, label = '') {
  if (!r?.target) return null;
  const top = [...(r.modifiers || [])].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, MAX_MODIFIER_REASONS).map((m) => m.text);
  return {
    ...(label ? { label } : {}),
    pillar: r.target,
    verdict: r.status === 'ok' ? LUCK_VERDICT_KO[r.verdict] : '판단 보류',
    headline: r.headline,
    reasons: r.status === 'ok' ? [r.reasons[0], ...top] : r.reasons.slice(0, 1),
  };
}

/** 여러 시기를 한 번에. periods: [{label, daeun?, seun?, wolun?}] — 판정이 안 되는 행은 뺀다. */
export function buildLuckJudgementRows(pillars, periods = [], { timeUnknown = false } = {}) {
  return (Array.isArray(periods) ? periods : [])
    .map((p) => buildLuckJudgement(pillars, { ...p, timeUnknown }))
    .filter(Boolean);
}

/** luck-dynamics 원본 결과(코드값 verdict·modifiers). 신년운세 월별 신호처럼 판정을 점수로 옮길 때 쓴다. 차트가 없으면 null. */
export function luckDynamicsFor(pillars, { daeun = null, seun = null, wolun = null, timeUnknown = false } = {}) {
  const chart = judgementChart(pillars, { timeUnknown });
  if (!chart) return null;
  return evaluateLuckDynamics({ natal: chart, daeun: judgementPillar(daeun) || null, seun: judgementPillar(seun) || null, wolun: judgementPillar(wolun) || null });
}
