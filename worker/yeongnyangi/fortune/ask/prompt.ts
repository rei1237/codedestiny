import type { Consultation } from '../consultation';
import type { AskAnalysis } from './analysis';
import { ASK_ANALYSIS_VERSION } from './analysis';
import { ASK_EVIDENCE_VERSION, type EvidencePacket } from './contracts';
import { sliceEvidencePacket } from './packet';
import { FortuneError } from '../shared/contracts';
import { yearGanji } from '../consultation';
import { periodOverlaps } from './window';
import { ASK_PERIOD_RESOLVER } from './period';

// Where a period sits against the consultation date, so '올해' is never read off the first listed year.
const relation = (from: string, to: string, asOf: string) =>
  periodOverlaps(from, to, { from: asOf, to: asOf }) ? 'current' : periodOverlaps(from, to, { from: '0001-01-01', to: asOf }) ? 'past' : 'future';

// This is data for the first chapter, never an instruction supplied by the classifier.
// Preserve the packet's F/T IDs so a later answer validator can check citations.
export function buildAskFirstChapterPrompt(consultation: Consultation, analysis: AskAnalysis, packet: EvidencePacket) {
  if (analysis?.version !== ASK_ANALYSIS_VERSION || packet?.packet_version !== ASK_EVIDENCE_VERSION ||
      analysis.questions.length !== consultation.questions.length ||
      analysis.questions.some((item, index) => item.questionId !== consultation.questions[index].id))
    throw new FortuneError('INVALID_ASK_ANALYSIS', 500);
  const facts = new Map<string, EvidencePacket['facts'][number]>();
  const timing = new Map<string, EvidencePacket['timing'][number]>();
  // A dated request (a named year, or the default window) only offers periods inside it. The validator already
  // rejects a citation outside the request, so this removes wrong choices, e.g. last year's 세운 for '올해'.
  const { start, end } = consultation.period;
  const inRequest = (period: EvidencePacket['timing'][number]) => !start || !end || periodOverlaps(period.from, period.to, { from: start, to: end });
  // ask-period-v1 consultations (new ones only) get the period contract; stored older purchases keep v2 unchanged.
  const periodContract = consultation.period.resolver === ASK_PERIOD_RESOLVER;
  const inEffect = new Set<string>();
  const questions = analysis.questions.map(item => {
    const selected = sliceEvidencePacket(packet, item.category);
    // A 월운 starts at its 절입 instant and runs to the next one, so the pillar already running when the request
    // starts is evidence for it (e.g. '이번 주' between two terms, or 1~7 October under 酉월).
    const running = periodContract && start ? selected.timing
      .filter(period => period.source.system === 'saju' && period.label.startsWith('monthlyLuck') && period.resolution === 'instant' && period.from.slice(0, 10) < start)
      .sort((a, b) => a.from.localeCompare(b.from)).at(-1) : undefined;
    if (running) inEffect.add(running.id);
    selected.timing = selected.timing.filter(period => inRequest(period) || period.id === running?.id);
    for (const fact of selected.facts) facts.set(fact.id, fact);
    // A resolved period is the whole consultation's subject, so any in-period evidence is offered to every question.
    const needsTiming = item.needsTiming || (periodContract && consultation.period.kind === 'requested' && selected.timing.length > 0);
    if (needsTiming) for (const period of selected.timing) timing.set(period.id, period);
    return {
      questionId: item.questionId, category: item.category, needsTiming,
      factIds: selected.facts.map(fact => fact.id),
      timingIds: needsTiming ? selected.timing.map(period => period.id) : [],
    };
  });
  return {
    version: periodContract ? 'ask-first-chapter-v3' : 'ask-first-chapter-v2', asOf: consultation.asOf, timezone: consultation.timezone,
    referenceYear: { year: Number(consultation.asOf.slice(0, 4)), ganji: yearGanji(Number(consultation.asOf.slice(0, 4))), label: '올해' },
    requestedPeriod: consultation.period, evidenceWindow: packet.window, schools: packet.schools,
    reliability: packet.reliability, partner: packet.partner, questions,
    evidence: {
      facts: [...facts.values()].map(({id,label,value,source,subject}) => ({id,label,value,source,subject})),
      timing: [...timing.values()].map(({id,label,value,source,subject,from,to,resolution}) =>
        ({id,label,value,source,subject,from,to,resolution,relation:inEffect.has(id) ? 'in-effect' : relation(from,to,consultation.asOf)})),
    },
  };
}
