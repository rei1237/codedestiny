import { createEngineFactSnapshot, readEngineFactSnapshot } from '../../../lib/engine-fact-snapshot.js';
import type { DomainContext, FortuneInput, CalculationOptions } from './contracts';

export function pinDomainFacts(c: DomainContext, input: FortuneInput, options: CalculationOptions = {}): DomainContext {
  if (!['ziwei', 'tarot'].includes(c.domain) || (options.runtimeEnv?.[c.domain.toUpperCase() + '_CONSUMER_FACTS_V1'] !== 'true' && !(c.domain === 'ziwei' && options.runtimeEnv?.ZIWEI_CALENDAR_AUTHORITY_V2 === 'true'))) return c;
  const engineFacts = createEngineFactSnapshot(c.domain, { facts: c.facts, limitations: c.limitations, engineVersion: c.engineVersion }, input,
    { support: 'candidate', options: { asOf: options.asOf || null, relationshipReading: options.relationshipReading === true } });
  return { ...c, engineFactProtocol: 'engine-facts-v1', engineFacts };
}

export function validateDomainFacts(c: DomainContext): DomainContext {
  if (c.engineFactProtocol === 'engine-facts-v1' && !c.engineFacts) throw new Error('ENGINE_FACT_SNAPSHOT_REQUIRED');
  if (c.engineFacts) {
    const pinned = readEngineFactSnapshot(c.engineFacts, { system: c.domain });
    for (const fact of pinned.facts.facts) {
      const current = c.facts.find(row => row.id === fact.id);
      if (!current || !containsFacts(current, fact)) throw new Error('ENGINE_FACT_CONTEXT_MISMATCH');
    }
  }
  return c;
}

// Reading-only enrichment may add explanations; it may not replace the pinned facts.
function containsFacts(current: unknown, original: unknown): boolean {
  if (!original || typeof original !== 'object') return current === original;
  if (!current || typeof current !== 'object' || Array.isArray(current) !== Array.isArray(original)) return false;
  if (Array.isArray(original) && (current as unknown[]).length !== original.length) return false;
  return Object.entries(original).every(([key, value]) => containsFacts((current as Record<string, unknown>)[key], value));
}
