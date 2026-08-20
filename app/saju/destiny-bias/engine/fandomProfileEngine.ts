// 사주 구조 신호 → 「빠순사주」 덕질 성향 9차원 매핑 엔트리.
// 사주 계산은 하지 않는다 — favoriteDestinyReading.ts 에서 이미 계산된 신호만 받는다.

import {
  tenGodGroup,
  buildBiasCharacter,
  buildEntryType,
  buildTasteFirstAttraction,
  buildTasteLongTermReason,
  buildDeepDivePattern,
  buildRelationshipLens,
  buildObsessionPoint,
  buildPersistence,
  buildDetachmentReason,
  buildDetachmentStyle,
  buildFinalPhilosophy,
} from "./fandomPersonaContent";

export type FandomProfileSignals = {
  favName: string;
  dayMasterRelation: string;
  tenGodRelation: string;
  branchKinds: string[];
  harmonySignals: string[];
  conflictSignals: string[];
  charmSignals: string[];
  longTermSignals: string[];
  elementGap: number;
  scores: {
    emotion: number;
    excitement: number;
    stability: number;
    fanBias: number;
    longTerm: number;
    communication: number;
  };
};

export type FandomProfile = {
  biasCharacterTitle: string;
  biasCharacterOneLiner: string;
  entryType: string;
  entryText: string;
  tasteFirstAttraction: string;
  tasteLongTermReason: string;
  deepDivePattern: string;
  deepDiveText: string;
  relationshipLens: string;
  relationshipText: string;
  obsessionPoint: string;
  obsessionText: string;
  persistenceIntensity: string;
  persistenceDuration: string;
  persistenceText: string;
  detachmentReason: string;
  detachmentReasonText: string;
  detachmentStyle: string;
  detachmentStyleText: string;
  finalPhilosophy: string;
};

export function buildFandomProfile(signals: FandomProfileSignals): FandomProfile {
  const group = tenGodGroup(signals.tenGodRelation);

  const character = buildBiasCharacter({ group, scores: signals.scores, favName: signals.favName });

  const entry = buildEntryType({
    dayMasterRelation: signals.dayMasterRelation,
    charmSignals: signals.charmSignals,
    conflictSignals: signals.conflictSignals,
    longTermSignals: signals.longTermSignals,
    excitement: signals.scores.excitement,
    favName: signals.favName,
  });

  const tasteFirstAttraction = buildTasteFirstAttraction({
    charmSignals: signals.charmSignals,
    scores: signals.scores,
    favName: signals.favName,
  });
  const tasteLongTermReason = buildTasteLongTermReason({ group, favName: signals.favName });

  const deepDive = buildDeepDivePattern({ scores: signals.scores, harmonySignals: signals.harmonySignals });

  const relationship = buildRelationshipLens({
    group,
    branchKinds: signals.branchKinds,
    charmSignals: signals.charmSignals,
  });

  const obsession = buildObsessionPoint({ group, charmSignals: signals.charmSignals });

  const persistence = buildPersistence({ scores: signals.scores });

  const detachmentReason = buildDetachmentReason({
    group,
    conflictSignals: signals.conflictSignals,
    harmonySignals: signals.harmonySignals,
    elementGap: signals.elementGap,
    scores: signals.scores,
  });
  const detachmentStyle = buildDetachmentStyle({ scores: signals.scores });

  const finalPhilosophy = buildFinalPhilosophy({
    group,
    intensity: persistence.intensity,
    duration: persistence.duration,
    favName: signals.favName,
  });

  return {
    biasCharacterTitle: character.title,
    biasCharacterOneLiner: character.oneLiner,
    entryType: entry.type,
    entryText: entry.text,
    tasteFirstAttraction,
    tasteLongTermReason,
    deepDivePattern: deepDive.type,
    deepDiveText: deepDive.text,
    relationshipLens: relationship.type,
    relationshipText: relationship.text,
    obsessionPoint: obsession.type,
    obsessionText: obsession.text,
    persistenceIntensity: persistence.intensity,
    persistenceDuration: persistence.duration,
    persistenceText: persistence.text,
    detachmentReason: detachmentReason.type,
    detachmentReasonText: detachmentReason.text,
    detachmentStyle: detachmentStyle.type,
    detachmentStyleText: detachmentStyle.text,
    finalPhilosophy,
  };
}
