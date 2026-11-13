import type {CompassInput,DirectionField} from "../_engine/types";
import {collectDeepEvidence} from "../_engine/evidence/collectDeepEvidence";

export function compassReportPayload(input:CompassInput, field:DirectionField, question:string, idempotencyKey:string) {
  return {
    idempotencyKey,
    question,
    emotion: input.emotion,
    field: {
      seed: field.seed,
      confidence: field.confidence,
      sources: field.sources,
      directions: field.directions.map((d) => ({ key: d.key, score: d.score, band: d.band })),
      primary: { key: field.primary.key, score: field.primary.score, band: field.primary.band },
      strongArea: { key: field.strongArea.key },
      blockedArea: { key: field.blockedArea.key },
      timeline: field.timeline,
    },
    evidencePack: collectDeepEvidence(input, field),
  };
}
