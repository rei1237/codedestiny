import { createHash } from 'node:crypto';
import { buildApprovedNatalAnalysis, GYEOKGUK_AUTHORITY_VERSION } from '../../lib/saju/gyeokguk-authority.mjs';
import { authorityText } from '../../lib/saju/gyeokguk-authority-copy.mjs';

const positions = ['year', 'month', 'day', 'hour'];
const schema = 'saju-consumer-authority-v1';
const copy = value => JSON.parse(JSON.stringify(value));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
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
    dayMaster: raw.dayMaster, personalityHook: r.summary, currentFlow: r.action,
    tenGodsSummary: r.career, fiveElementsSummary: a.yongshinAnalysis.requiredExplanation.whyThisElement,
    cautions: [a.yongshinAnalysis.requiredExplanation.whyThisElement],
    expertEvidence: { gyeokguk: a.gyeokgukAnalysis, yongshin: a.yongshinAnalysis, calculationVersion: pinned.calculationVersion,
      natalAnalysisId: a.evidence.natalAnalysisId },
    evidence: ['saju.authority', 'saju.gyeokguk', 'saju.yongshinCandidates'], source: pinned.calculationVersion };
}
