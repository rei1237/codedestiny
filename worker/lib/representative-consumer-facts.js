import { calculateLifeBookAiSaju } from './life-book-ai-saju.js';
import { lifeBookPillars } from './saju-authority-consumer.js';
import { engineFactDigest } from './engine-fact-snapshot.js';
import { buildLuckJudgement } from './saju-luck-judgement.js';

// Integrity metadata, not a new calculation rule. Raw stored reports remain unchanged.
export function pinRepresentativeFacts(value, env, kind) {
  if (env?.SAJU_CONSUMER_FACTS_V1 !== 'true') return value;
  return { ...value, consumerFactIdentity: { version: 'representative-facts-v1', kind, digest: engineFactDigest(value) } };
}
export function readRepresentativeFacts(value, kind) {
  if (!value?.consumerFactIdentity) return value;
  const { consumerFactIdentity: pin, ...facts } = value;
  if (pin.version !== 'representative-facts-v1' || pin.kind !== kind || pin.digest !== engineFactDigest(facts)) throw new Error('REPRESENTATIVE_FACTS_MISMATCH');
  return value;
}
export function connectNewYearTiming(value, birth, env) {
  if (env?.SAJU_CONSUMER_FACTS_V1 !== 'true') return value;
  const calculated = calculateLifeBookAiSaju(birth, { year: value.targetYear.year });
  const original = lifeBookPillars({ ...value.saju, calculationMeta: value.calculationMeta });
  if (engineFactDigest(original) !== engineFactDigest(lifeBookPillars(calculated))) throw new Error('REPRESENTATIVE_NATAL_MISMATCH');
  const majorLuck = calculated.majorLuck;
  const current = majorLuck?.currentCycle;
  const background = current ? `대운 배경: ${current.pillar}, ${current.startAge}~${current.endAge}세. 제공된 원국·세운과 함께 조건부로 해석합니다.`
    : majorLuck?.reason || '현재 대운 구간이 없어 대운의 영향을 추정하지 않습니다.';
  // 대운이 확인되면 올해 판정을 대운 바탕 위에서 다시 내리고, 현재 대운 판정도 함께 싣는다(S15-6).
  const judgement = value.advancedSajuSummary?.luckJudgement;
  const pillars = { year: value.saju?.yearPillar, month: value.saju?.monthPillar, day: value.saju?.dayPillar, hour: value.saju?.hourPillar };
  const timeUnknown = value.calculationMeta?.timeUnknown === true;
  const luckJudgement = judgement && current?.pillar ? {
    ...judgement,
    daeun: buildLuckJudgement(pillars, { daeun: current.pillar, label: `대운 ${current.startAge}~${current.endAge}세`, timeUnknown }),
    year: buildLuckJudgement(pillars, { daeun: current.pillar, seun: value.targetYear.pillar, label: `${value.targetYear.year}년`, timeUnknown }) || judgement.year,
  } : judgement;
  return pinRepresentativeFacts({ ...value, majorLuck,
    advancedSajuSummary: { ...value.advancedSajuSummary, daewoonSewoon: {
      ...value.advancedSajuSummary.daewoonSewoon, majorLuck, integratedReading: background,
    }, ...(luckJudgement ? { luckJudgement } : {}) } }, env, 'new-year');
}
