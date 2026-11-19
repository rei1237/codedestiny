import { calculateLifeBookAiSaju } from './life-book-ai-saju.js';
import { lifeBookPillars } from './saju-authority-consumer.js';
import { engineFactDigest } from './engine-fact-snapshot.js';

// Integrity metadata, not a new calculation rule. Raw stored reports remain unchanged.
// Mongo stores an undefined field as null while JSON drops it, so v2 treats null, undefined and missing object fields alike.
const storedShape = (value) => JSON.parse(JSON.stringify(value, (key, item) => (key && item === null ? undefined : item)));
const factDigest = (version, facts) => engineFactDigest(version === 'representative-facts-v2' ? storedShape(facts) : facts);
export function pinRepresentativeFacts(value, env, kind) {
  if (env?.SAJU_CONSUMER_FACTS_V1 !== 'true') return value;
  return { ...value, consumerFactIdentity: { version: 'representative-facts-v2', kind, digest: factDigest('representative-facts-v2', value) } };
}
// A v1 pin hashed the pre-storage value and can never match after a Mongo round trip.
// It is accepted only when the same input recomputes to the pinned digest; anything else stays fail-closed.
export function readRepresentativeFacts(value, kind, { recompute } = {}) {
  if (!value?.consumerFactIdentity) return value;
  const { consumerFactIdentity: pin, ...facts } = value;
  if (!['representative-facts-v1', 'representative-facts-v2'].includes(pin.version) || pin.kind !== kind) throw new Error('REPRESENTATIVE_FACTS_MISMATCH');
  if (pin.digest === factDigest(pin.version, facts)) return value;
  if (pin.version === 'representative-facts-v1' && typeof recompute === 'function') {
    const fresh = recompute();
    const { consumerFactIdentity: _freshPin, ...freshFacts } = fresh || {};
    if (fresh && engineFactDigest(freshFacts) === pin.digest) return { ...freshFacts, consumerFactIdentity: pin };
  }
  throw new Error('REPRESENTATIVE_FACTS_MISMATCH');
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
  return pinRepresentativeFacts({ ...value, majorLuck,
    advancedSajuSummary: { ...value.advancedSajuSummary, daewoonSewoon: {
      ...value.advancedSajuSummary.daewoonSewoon, majorLuck, integratedReading: background,
    } } }, env, 'new-year');
}
