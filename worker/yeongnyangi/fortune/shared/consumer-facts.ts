import { createEngineFactSnapshot, engineFactContains, readEngineFactSnapshot, resealEngineFactSnapshot } from '../../../lib/engine-fact-snapshot.js';
import { FortuneError } from './contracts';
import type { DomainContext, FortuneInput, CalculationOptions } from './contracts';

export function pinDomainFacts(c: DomainContext, input: FortuneInput, options: CalculationOptions = {}): DomainContext {
  const natalEnabled = options.runtimeEnv?.YEONGNYANGI_NATAL_PROFILE_V1 === 'true' && c.facts.some(f => f.label === 'natalProfile');
  const verifiedSukuyo = c.domain === 'sukuyo' && options.verifiedSukuyo === true && options.runtimeEnv?.SUKUYO_IMD_NEW_ORDERS_V1 === 'true';
  if (!natalEnabled && !verifiedSukuyo && (!['ziwei', 'tarot'].includes(c.domain) || (options.runtimeEnv?.[c.domain.toUpperCase() + '_CONSUMER_FACTS_V1'] !== 'true' && !(c.domain === 'ziwei' && options.runtimeEnv?.ZIWEI_CALENDAR_AUTHORITY_V2 === 'true')))) return c;
  const engineFacts = createEngineFactSnapshot(c.domain, { facts: c.facts, limitations: c.limitations, engineVersion: c.engineVersion }, input,
    { support: !verifiedSukuyo && ['vedic','sukuyo','astrology'].includes(c.domain) ? 'pending' : 'candidate', options: { asOf: options.asOf || null, relationshipReading: options.relationshipReading === true, ...(verifiedSukuyo ? {providerVersion:c.engineVersion} : {}) } });
  return { ...c, engineFactProtocol: 'engine-facts-v1', engineFacts };
}

// Preparation enriches facts after calculate() pinned them, so the purchase seals its finished facts.
// Facts take their JSON form here so the stored row and the sealed copy compare equal after any round-trip.
export function sealDomainFacts(c: DomainContext): DomainContext {
  if (!c.engineFacts) return c;
  const engineFacts = resealEngineFactSnapshot(c.engineFacts, { facts: c.facts, limitations: c.limitations, engineVersion: c.engineVersion });
  return { ...c, facts: JSON.parse(JSON.stringify(c.facts)), engineFacts };
}

// Status 500: a stored snapshot cannot be repaired by the buyer. Detail carries IDs only, never fact values.
export function validateDomainFacts(c: DomainContext): DomainContext {
  if (c.engineFactProtocol === 'engine-facts-v1' && !c.engineFacts) throw new FortuneError('ENGINE_FACT_SNAPSHOT_REQUIRED', 500, c.domain);
  if (c.engineFacts) {
    let pinned;
    try { pinned = readEngineFactSnapshot(c.engineFacts, { system: c.domain }); }
    catch { throw new FortuneError('ENGINE_FACT_SNAPSHOT_INVALID', 500, c.domain); }
    for (const fact of pinned.facts.facts) {
      const current = c.facts.find(row => row.id === fact.id);
      if (!current || !engineFactContains(current, fact)) throw new FortuneError('ENGINE_FACT_CONTEXT_MISMATCH', 500, String(fact.id));
    }
  }
  return c;
}
