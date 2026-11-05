import { createEngineFactSnapshot, readEngineFactSnapshot, engineFactDigest } from './engine-fact-snapshot.js';

// Captures provider output only. This does not select or authorize a new Swiss engine.
export async function resolveExpertCalculation(system, stored, calculate, { env = {}, snapshot = null, existing = false, input = {} } = {}) {
  if (!['astrology', 'vedic', 'sukuyo'].includes(system)) throw new Error('EXPERT_SYSTEM_INVALID');
  if (snapshot) {
    const saved = readEngineFactSnapshot(snapshot, { system });
    if (!stored || engineFactDigest(stored) !== engineFactDigest(saved.facts)) throw Object.assign(new Error('EXPERT_CALCULATION_MISMATCH'), { code: 'EXPERT_CALCULATION_MISMATCH' });
    return { value: stored, engineFacts: saved };
  }
  const value = stored || await calculate();
  if (existing || stored || env[`${system.toUpperCase()}_CONSUMER_FACTS_V1`] !== 'true') return { value };
  return { value, engineFacts: createEngineFactSnapshot(system, value, input, { support: 'pending' }) };
}
