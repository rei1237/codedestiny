import { natalCoreFromPillarRows, buildGyeokgukAnalysis } from '../../worker/lib/saju-gyeokguk.js';
import { authorityText } from './gyeokguk-authority-copy.mjs';

export const GYEOKGUK_AUTHORITY_VERSION = 'saju-gyeokguk-authority-v1';
export const APPROVED_GYEOKGUK_PROFILE = 'rok-yangin-strictjong-v1';
export const GYEOKGUK_AUTHORITY_DEFAULT = false;
const positions = ['year', 'month', 'day', 'hour'];
const stems = Object.fromEntries([...'갑을병정무기경신임계'].map((s, i) => [s, [...'甲乙丙丁戊己庚辛壬癸'][i]]));
const branches = Object.fromEntries([...'자축인묘진사오미신유술해'].map((s, i) => [s, [...'子丑寅卯辰巳午未申酉戌亥'][i]]));
const elementKo = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
const elements = values => [...new Set((values || []).filter(el => Object.hasOwn(elementKo, el)))];

// Projection only: no rules, calendar recalculation, environment reads or I/O.
export function projectApprovedGyeokguk(pillars) {
  const pillarRows = positions.filter(pos => pillars[pos]).map(position => {
    const p = pillars[position];
    const stem = stems[p.stem] || p.stem, branch = branches[p.branch] || p.branch;
    if (![...'甲乙丙丁戊己庚辛壬癸'].includes(stem) || ![...'子丑寅卯辰巳午未申酉戌亥'].includes(branch)) {
      throw new Error('INVALID_AUTHORITY_PILLAR');
    }
    if ([...'甲乙丙丁戊己庚辛壬癸'].indexOf(stem) % 2 !== [...'子丑寅卯辰巳午未申酉戌亥'].indexOf(branch) % 2) {
      throw new Error('INVALID_AUTHORITY_PILLAR_PAIR');
    }
    return { position, stem, branch };
  });
  if (!['year', 'month', 'day'].every(pos => pillarRows.some(p => p.position === pos))) throw new Error('INCOMPLETE_AUTHORITY_CHART');
  const dayStem = pillarRows.find(p => p.position === 'day').stem;
  const core = natalCoreFromPillarRows(pillarRows, dayStem);
  if (core.status !== 'ok' || core.ruleProfile !== APPROVED_GYEOKGUK_PROFILE) throw new Error('UNSUPPORTED_AUTHORITY_PROFILE');
  const view = buildGyeokgukAnalysis({ pillarRows, dayStem });
  const authority = { calculationVersion: GYEOKGUK_AUTHORITY_VERSION, natalAnalysisId: core.analysisId,
    natalCoreVersion: core.version, ruleProfile: core.ruleProfile };
  const pending = !core.input.hourKnown || core.special.decision === 'pending' || core.monthStructure.hourSensitive === true;
  const status = pending ? 'pending' : 'candidates';
  // No single-element arbiter exists in this approved profile. Do not pick the
  // first item or silently mix special-following and ordinary eokbu candidates.
  const primaryAxis = core.yongshin.special ? 'special' : 'eokbu';
  const useful = pending ? [] : elements(core.yongshin.special?.follow || core.yongshin.eokbu?.useful);
  const axisCandidates = { ...core.yongshin, complete: core.strength.complete };
  const specialCandidates = core.special.candidates.map(candidate => ({ ...candidate }));
  const family = pending ? 'pending' : core.special.decision === 'special' ? 'special'
    : ({ 정인: 'resource', 편인: 'resource', 식신: 'output', 상관: 'output', 정재: 'wealth', 편재: 'wealth',
      정관: 'officer', 편관: 'officer' }[core.monthStructure.tenGod] || 'peer');
  const reading = { ...authority, status: pending ? 'pending' : 'profile-reading',
    summary: authorityText(pending ? 'pending' : family), career: authorityText(`${family}Career`),
    wealth: authorityText(`${family}Wealth`), action: authorityText('action') };
  const gyeokgukAnalysis = { ...view, ...authority,
    status: pending ? 'pending' : 'evaluated',
    // Month candidates and special candidates are different namespaces.
    candidates: [], specialCandidates, adoptedSpecialId: core.special.adopted,
    specialDecision: core.special.decision, monthStructureDetail: core.monthStructure,
    unassessedSpecials: ['양신성상', '가화', '종세'],
    requiredOutput: { ...authority, finalGyeokguk: view.finalGyeokguk, reason: view.judgmentReason,
      personality: reading.summary, career: reading.career, wealth: reading.wealth },
  };
  const yongshinAnalysis = { ...authority, status, primaryAxis, axisCandidates,
    coreYongshin: null, coreYongshinKo: authorityText('singleUnresolved'),
    usefulCandidates: useful, usefulCandidateNames: useful.map(el => elementKo[el]),
    // Do not manufacture domain-specific useful elements or label every other
    // element harmful. The approved core only supplies these axes, not a verdict.
    jobYongshin: [], wealthYongshin: [], loveYongshin: [], gisin: [], heesin: [],
    requiredExplanation: { ...authority, whyThisElement: authorityText(pending ? 'pending' : 'candidates') },
  };
  return { authority, core, gyeokgukAnalysis, yongshinAnalysis, reading, useful };
}

// ON paths cannot inherit statements/scores produced by the legacy verdict.
// Areas outside this profile remain explicitly unevaluated, not zero-scored.
export function buildApprovedNatalAnalysis(pillars) {
  const { authority, core, gyeokgukAnalysis, yongshinAnalysis, reading, useful } = projectApprovedGyeokguk(pillars);
  const unassessed = () => ({ ...authority, status: 'not-evaluated' });
  return {
    dayMaster: { ...authority, ...core.dayMaster, strength: authorityText(!core.strength.complete ? 'unknown' : core.strength.isStrong ? 'strong' : 'weak'),
      strengthScore: core.strength.score, strengthEvidence: core.strength, status: core.strength.complete ? 'evaluated' : 'pending' },
    monthCommand: { ...authority, ...core.monthStructure },
    fiveElements: { ...authority, visibleCounts: core.counts },
    tenGods: { ...authority, month: core.monthStructure.tenGod, activatedByLuck: { status: 'not-evaluated', rows: [] } },
    hiddenStemActivation: { ...authority, hidden: core.hidden },
    earthStorageAnalysis: unassessed(), doChungAnalysis: unassessed(),
    combinationClashAnalysis: { ...unassessed(), natalRelations: core.relations },
    gyeokgukAnalysis, yongshinAnalysis,
    daewoonAnalysis: unassessed(), luckInteractionDetailAnalysis: unassessed(), transformationTimingAnalysis: unassessed(),
    personalityAnalysis: { ...reading, outwardDisposition: reading.summary },
    careerAnalysis: { ...reading, basis: { ...authority, finalGyeokguk: gyeokgukAnalysis.finalGyeokguk,
      usefulCandidates: useful, yongshinStatus: yongshinAnalysis.status },
      immediateCareerStrategy: [reading.career, reading.action], investmentWealthManagementStyle: reading.wealth },
    loveMarriageAnalysis: unassessed(), shinsalAnalysis: unassessed(), scoringAnalysis: { ...unassessed(), items: [] },
    rooting: { ...authority, ...core.roots }, johu: { ...authority, climate: core.climate, axes: core.yongshin.johu },
    structuralIssues: [],
    usefulElements: { ...authority, status: yongshinAnalysis.status, primaryAxis: yongshinAnalysis.primaryAxis,
      candidates: useful, finalPriority: [], conflicts: core.yongshin.conflicts },
    evidence: { ...authority, limitations: core.limitations, reading,
      coverage: 'gyeokguk-and-yongshin-axes-only', unsupportedSpecials: gyeokgukAnalysis.unassessedSpecials },
  };
}

export function buildApprovedFinalReport(natalAnalysis) {
  const { reading, ...metadata } = natalAnalysis.evidence;
  const sections = [
    ['conclusionTitle', reading.summary], ['careerTitle', reading.career],
    ['wealthTitle', reading.wealth], ['actionTitle', reading.action],
  ].map(([key, value], index) => ({ index: index + 1, title: authorityText(key), entries: [{ value }], ...metadata }));
  return { title: authorityText('reportTitle'), ...metadata, sections,
    markdown: sections.map(s => `## ${s.title}\n\n${s.entries[0].value}`).join('\n\n'),
    reference: { title: authorityText('referenceTitle'), defaultCollapsed: true,
      gyeokguk: natalAnalysis.gyeokgukAnalysis, yongshin: natalAnalysis.yongshinAnalysis },
  };
}

export function buildApprovedStructuredReport({ input, pillars, natalAnalysis, finalAdvancedReport, daewoonStart, daewoonDirection, timezone, trueSolarTimeUsed }) {
  const { reading, ...metadata } = natalAnalysis.evidence;
  const birthInput = { year: input.year, month: input.month, day: input.day,
    hour: input.hasTime ? input.hour : null, minute: input.hasTime ? input.minute : null,
    calendarType: input.calendarType || 'solar', lunarLeap: Boolean(input.lunarLeap), hasTime: Boolean(input.hasTime) };
  return { metadata, input: birthInput, fourPillars: pillars, timezone, trueSolarTimeUsed,
    strengthAnalysis: natalAnalysis.dayMaster, climateAnalysis: natalAnalysis.johu,
    gyeokguk: { ...natalAnalysis.gyeokgukAnalysis, primary: natalAnalysis.gyeokgukAnalysis.finalGyeokguk },
    yongshin: { ...natalAnalysis.yongshinAnalysis, primary: null },
    // Calendar start values are retained; period interpretation is not recomputed.
    daewoon: { ...natalAnalysis.daewoonAnalysis, direction: daewoonDirection, startAge: daewoonStart.age, start: daewoonStart },
    lifeDomains: { ...metadata, personality: reading.summary, career: reading.career, wealth: reading.wealth },
    userReport: finalAdvancedReport,
  };
}
