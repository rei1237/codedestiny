import { sha256Text } from '../../lib/sha256-text.mjs';

// Delivery contract versions, not claims of independently verified astronomy.
export const ENGINE_FACT_VERSIONS = Object.freeze({
  ziwei: 'ziwei-public-chart-v1', tarot: 'tarot-public-deck-v1',
  saju: 'saju-guardian-facts-v1', astrology: 'western-provider-fixture-v1',
  vedic: 'vedic-provider-fixture-v1', sukuyo: 'sukuyo-provider-fixture-v1',
});
export const SWISS_BLOCKED_SYSTEMS = Object.freeze(['astrology', 'vedic', 'sukuyo']);
// Existing Mixed storage may minimize empty object properties. They carry no
// calculated facts; null, arrays, numbers and candidate states remain distinct.
function storageShape(value) {
  if (Array.isArray(value)) return value.map(storageShape);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, storageShape(value[key])])
    .filter(([, item]) => !item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).length));
}
export const engineFactDigest = value => sha256Text(JSON.stringify(storageShape(value)));
const digest = engineFactDigest;
const copy = value => JSON.parse(JSON.stringify(value));
const fail = () => { throw Object.assign(new Error('ENGINE_FACT_SNAPSHOT_INVALID'), { code: 'ENGINE_FACT_SNAPSHOT_INVALID' }); };

// Only server-owned adapter output enters this function. A digest is corruption
// detection, never authorization; callers retain their owner/access checks.
export function createEngineFactSnapshot(system, facts, input, { support = 'candidate', options = {} } = {}) {
  if (!Object.hasOwn(ENGINE_FACT_VERSIONS, system) || !facts || typeof facts !== 'object' || Array.isArray(facts)
    || !['candidate', 'pending', 'unsupported', 'not-evaluated'].includes(support)) fail();
  const payload = copy({ schema: 'engine-facts-v1', system, engineVersion: ENGINE_FACT_VERSIONS[system],
    interpretationVersion: 'engine-consumer-projection-v1', inputDigest: digest(input), support, options, facts });
  return { ...payload, digest: digest(payload) };
}

export function readEngineFactSnapshot(snapshot, { system, input } = {}) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) fail();
  const { digest: stored, ...payload } = snapshot;
  if (payload.schema !== 'engine-facts-v1' || !Object.hasOwn(ENGINE_FACT_VERSIONS, payload.system)
    || payload.engineVersion !== ENGINE_FACT_VERSIONS[payload.system]
    || payload.interpretationVersion !== 'engine-consumer-projection-v1'
    || !['candidate', 'pending', 'unsupported', 'not-evaluated'].includes(payload.support)
    || !payload.facts || typeof payload.facts !== 'object' || Array.isArray(payload.facts)
    || digest(payload) !== stored || (system && system !== payload.system)
    || (input !== undefined && digest(input) !== payload.inputDigest)) fail();
  return copy(snapshot);
}

export function engineFactPrompt(snapshot, system) {
  const saved = readEngineFactSnapshot(snapshot, { system });
  return { ...saved, rules: [
    'Use only these stored facts; do not calculate or draw again.',
    'Keep candidate, pending, unsupported and not-evaluated states unchanged.',
    'Do not infer missing birth time, location, houses, partner feelings or a final useful element.',
    'Keep each system separate; fixture delivery does not establish calculation accuracy.',
  ] };
}
