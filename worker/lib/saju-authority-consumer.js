import { sha256Text } from '../../lib/sha256-text.mjs';
import { buildApprovedNatalAnalysis, projectApprovedGyeokguk, GYEOKGUK_AUTHORITY_VERSION } from '../../lib/saju/gyeokguk-authority.mjs';
import { authorityText } from '../../lib/saju/gyeokguk-authority-copy.mjs';

const positions = ['year', 'month', 'day', 'hour'];
const schema = 'saju-consumer-authority-v1';
const copy = value => JSON.parse(JSON.stringify(value));
const hash = value => sha256Text(JSON.stringify(value));
function freeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); }
  return value;
}

export const SAJU_AUTHORITY_PROMPT_RULES = Object.freeze([
  '고정된 명반과 판정 버전만 사용합니다. 격국·외격·용신을 다시 계산하지 않습니다.',
  '용신 후보는 확정 용신이 아닙니다. pending과 not-evaluated는 보류·미평가로 유지하고 누락된 시각·점수·시기를 채우지 않습니다.',
  '특수격 후보의 fail/unknown을 성립한 외격으로 설명하지 않습니다. 학파별 관점의 충돌을 임의로 중재하지 않습니다.',
  '질문에 대한 결론과 구체적인 해석·실천 조언을 먼저 제공합니다. 계산 방법 설명으로 상담을 대체하지 않습니다.',
]);

export function consumerPillars(rows) {
  const stems = [...'甲乙丙丁戊己庚辛壬癸'], branches = [...'子丑寅卯辰巳午未申酉戌亥'];
  const stemKo = [...'갑을병정무기경신임계'], branchKo = [...'자축인묘진사오미신유술해'];
  return Object.fromEntries(positions.map(position => {
    const row = rows.find(r => r.position === position);
    if (!row) return [position, null];
    const stem = stems.includes(row.stem) ? row.stem : stems[stemKo.indexOf(row.stem)];
    const branch = branches.includes(row.branch) ? row.branch : branches[branchKo.indexOf(row.branch)];
    if (!stem || !branch) throw new Error('INVALID_AUTHORITY_PILLAR');
    return [position, { stem, branch, ganji: stem + branch }];
  }));
}

export function readSajuAuthority(snapshot, expectedPillars) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('SAJU_AUTHORITY_PIN_INVALID');
  const pinned = copy(snapshot);
  const { digest, ...payload } = pinned;
  if (pinned.schema !== schema || pinned.calculationVersion !== GYEOKGUK_AUTHORITY_VERSION
      || digest !== hash(payload)) throw new Error('SAJU_AUTHORITY_PIN_INVALID');
  if (expectedPillars && JSON.stringify(expectedPillars) !== JSON.stringify(pinned.pillars)) throw new Error('SAJU_AUTHORITY_CHART_MISMATCH');
  const id = pinned.analysis?.evidence?.natalAnalysisId;
  if (!id || ['gyeokgukAnalysis', 'yongshinAnalysis', 'careerAnalysis'].some(key => pinned.analysis[key]?.natalAnalysisId !== id)) throw new Error('SAJU_AUTHORITY_ID_MISMATCH');
  return freeze(pinned);
}

export function sajuAuthorityPromptFacts(snapshot) {
  const pinned = readSajuAuthority(snapshot);
  return { calculationVersion: pinned.calculationVersion, natalAnalysisId: pinned.analysis.evidence.natalAnalysisId,
    pillars: pinned.pillars, gyeokguk: pinned.analysis.gyeokgukAnalysis, yongshin: pinned.analysis.yongshinAnalysis,
    interpretationRules: SAJU_AUTHORITY_PROMPT_RULES };
}

/** stored must come from the authenticated server record, never request JSON. */
export function selectSajuAuthority(pillars, { enabled = false, stored = null, hasExistingRecord = false } = {}) {
  if (stored) return readSajuAuthority(stored, pillars);
  if (hasExistingRecord || enabled !== true) return null;
  const payload = { schema, calculationVersion: GYEOKGUK_AUTHORITY_VERSION, pillars: copy(pillars), analysis: buildApprovedNatalAnalysis(pillars) };
  return freeze({ ...payload, digest: hash(payload) });
}

export const sajuAuthorityOn = env => env?.SAJU_GYEOKGUK_AUTHORITY_V2 === 'true';

const elementKo = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
const pillarRow = value => typeof value === 'string' ? (value.length >= 2 ? { stem: value[0], branch: value[1] } : null) : value || null;

/**
 * 고객 라벨·프롬프트 사실에 쓰는 승인 판정 투영. 계산은 하지 않는다.
 * pillars 는 {year:'庚午'} 또는 {year:{stem,branch}}. 시주가 없으면 보류(pending)로 나온다.
 * 호출하는 쪽이 신규 계산에서만 부른다. 저장된 결과에는 쓰지 않는다.
 */
export function approvedSajuLabels(pillars = {}) {
  const rows = Object.fromEntries(positions.flatMap(position => {
    const row = pillarRow(pillars[position]);
    return row ? [[position, row]] : [];
  }));
  const { authority, core, gyeokgukAnalysis: g, yongshinAnalysis: y, reading } = projectApprovedGyeokguk(rows);
  const names = y.usefulCandidateNames;
  const johu = [...new Set([...(core.yongshin.johu?.hanNan?.elements || []), ...(core.yongshin.johu?.joSeup?.elements || [])])];
  return { ...authority, status: y.status, gyeokguk: g.finalGyeokguk, gyeokgukStatus: g.status, gyeokgukReason: g.judgmentReason,
    strength: authorityText(!core.strength.complete ? 'unknown' : core.strength.isStrong ? 'strong' : 'weak'),
    isStrong: core.strength.complete ? core.strength.isStrong : null,
    candidates: [...y.usefulCandidates], candidateNames: [...names],
    johuCandidates: johu, johuCandidateNames: johu.map(el => elementKo[el]),
    yongshinLabel: y.status === 'pending' ? authorityText('unknown') : names.length ? `후보 ${names.join('·')}` : y.coreYongshinKo,
    yongshinExplanation: y.requiredExplanation.whyThisElement, gisinLabel: authorityText('notEvaluated'), reading,
    promptRules: [...SAJU_AUTHORITY_PROMPT_RULES] };
}

/** buildSajuNatalAnalysis 결과 위에 승인 판정을 덮는다. 원본의 강약·용신이 신규 결과로 새지 않게 한다. */
export function overlayApprovedNatalAnalysis(analysis, labels) {
  return { ...analysis,
    power: analysis.power ? { ...analysis.power, isStrong: labels.isStrong, yongshin: labels.candidates, kijishin: [], johuYongshin: labels.johuCandidates } : analysis.power,
    analysisBasis: labels.calculationVersion, strength: labels.strength,
    usefulGod: `${labels.yongshinLabel}. ${labels.yongshinExplanation}`, unfavorableGod: labels.gisinLabel,
    limitation: labels.yongshinExplanation };
}

export function lifeBookPillars(raw) {
  return consumerPillars(positions.flatMap(position => {
    if (position === 'hour' && raw.calculationMeta?.timeUnknown) return [];
    const text = raw[`${position}Pillar`];
    return text ? [{ position, stem: text[0], branch: text[1] }] : [];
  }));
}

/** Wrapper projection; the engine and existing saved snapshots are untouched. */
export function connectLifeBookSajuAuthority(raw, options = {}) {
  if (options.hasExistingRecord) {
    if (raw.sajuAuthority) readSajuAuthority(raw.sajuAuthority, lifeBookPillars(raw));
    return raw;
  }
  if (options.enabled !== true && !options.stored) return raw;
  const pinned = selectSajuAuthority(lifeBookPillars(raw), options);
  if (!pinned) return raw;
  const analysis = pinned.analysis, reading = analysis.evidence.reading;
  return {
    ...raw, sajuAuthority: pinned, natalAnalysis: analysis,
    calculationMeta: { ...raw.calculationMeta, analysisVersion: pinned.calculationVersion, natalAnalysisId: analysis.evidence.natalAnalysisId },
    strength: analysis.dayMaster.strength,
    usefulGod: authorityText('singleUnresolved'), unfavorableGod: authorityText('notEvaluated'),
    elementBalance: { status: 'not-evaluated' },
    seasonalBalance: { monthBranch: raw.seasonalBalance?.monthBranch, season: raw.seasonalBalance?.season,
      climate: analysis.johu.climate, adjustment: analysis.yongshinAnalysis.requiredExplanation.whyThisElement,
      runtimeInterpretation: { ...analysis.evidence, yongshinStatus: analysis.yongshinAnalysis.status,
        yongshinCandidates: analysis.yongshinAnalysis.usefulCandidates, coreYongshin: null } },
    advancedFactors: { gyeokguk: analysis.gyeokgukAnalysis, yongshin: analysis.yongshinAnalysis },
    fortuneFacts: { ...reading, yongshinStatus: analysis.yongshinAnalysis.status },
  };
}

export function authorityGuardianResult(raw) {
  const pinned = readSajuAuthority(raw.sajuAuthority, lifeBookPillars(raw));
  const a = pinned.analysis, r = a.evidence.reading;
  return { pillars: Object.fromEntries(positions.map(p => [p, pinned.pillars[p]?.ganji || null])),
    calculationMeta: raw.calculationMeta, sajuAuthority: pinned,
    ...(raw.majorLuck ? { timingFacts: copy({ schema: 'saju-timing-facts-v1',
      majorLuck: raw.majorLuck, yearlyLuck: raw.yearlyLuck || [],
      rules: ['원국의 바탕, 대운의 배경, 세운의 변화를 함께 읽되 제공된 값만 사용합니다.',
        'available=false이거나 현재 구간·시작일이 없으면 이를 추정하지 않습니다. 과거 사건이나 미래 결과를 확정하지 않습니다.'] }) } : {}),
    dayMaster: raw.dayMaster, personalityHook: r.summary, currentFlow: r.action,
    tenGodsSummary: r.career, fiveElementsSummary: a.yongshinAnalysis.requiredExplanation.whyThisElement,
    cautions: [a.yongshinAnalysis.requiredExplanation.whyThisElement],
    expertEvidence: { gyeokguk: a.gyeokgukAnalysis, yongshin: a.yongshinAnalysis, calculationVersion: pinned.calculationVersion,
      natalAnalysisId: a.evidence.natalAnalysisId },
    evidence: ['saju.authority', 'saju.gyeokguk', 'saju.yongshinCandidates'], source: pinned.calculationVersion };
}
