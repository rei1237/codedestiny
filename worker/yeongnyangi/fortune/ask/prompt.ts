import type { Consultation } from '../consultation';
import type { AskAnalysis } from './analysis';
import { ASK_ANALYSIS_VERSION } from './analysis';
import { ASK_EVIDENCE_VERSION, type EvidencePacket } from './contracts';
import { sliceEvidencePacket } from './packet';
import { FortuneError } from '../shared/contracts';

// This is data for the first chapter, never an instruction supplied by the classifier.
// Preserve the packet's F/T IDs so a later answer validator can check citations.
export function buildAskFirstChapterPrompt(consultation: Consultation, analysis: AskAnalysis, packet: EvidencePacket) {
  if (analysis?.version !== ASK_ANALYSIS_VERSION || packet?.packet_version !== ASK_EVIDENCE_VERSION ||
      analysis.questions.length !== consultation.questions.length ||
      analysis.questions.some((item, index) => item.questionId !== consultation.questions[index].id))
    throw new FortuneError('INVALID_ASK_ANALYSIS', 500);
  const facts = new Map<string, EvidencePacket['facts'][number]>();
  const timing = new Map<string, EvidencePacket['timing'][number]>();
  const questions = analysis.questions.map(item => {
    const selected = sliceEvidencePacket(packet, item.category);
    for (const fact of selected.facts) facts.set(fact.id, fact);
    if (item.needsTiming) for (const period of selected.timing) timing.set(period.id, period);
    return {
      questionId: item.questionId, category: item.category, needsTiming: item.needsTiming,
      factIds: selected.facts.map(fact => fact.id),
      timingIds: item.needsTiming ? selected.timing.map(period => period.id) : [],
    };
  });
  return {
    version: 'ask-first-chapter-v1', asOf: consultation.asOf, timezone: consultation.timezone,
    requestedPeriod: consultation.period, evidenceWindow: packet.window, schools: packet.schools,
    reliability: packet.reliability, partner: packet.partner, questions,
    evidence: {
      facts: [...facts.values()].map(({id,label,value,source,subject}) => ({id,label,value,source,subject})),
      timing: [...timing.values()].map(({id,label,value,source,subject,from,to,resolution}) =>
        ({id,label,value,source,subject,from,to,resolution})),
    },
  };
}
