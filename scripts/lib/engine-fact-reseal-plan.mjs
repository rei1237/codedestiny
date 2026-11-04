import { engineFactContains, readEngineFactSnapshot, resealEngineFactSnapshot } from '../../worker/lib/engine-fact-snapshot.js';

// The only facts prepare changed after pinning before the seal existed.
const ENRICHED_LABELS = new Set(['advancedFactors', 'monthlyLuck']);
const JUDGMENT = ['finalGyeokguk', 'finalType'];

/** Pure. Returns replacement snapshots for an order, or the reason it must stay untouched. */
export function engineFactResealPlan(row, now = Date.now()) {
  if (['REFUNDED', 'COMPLETED'].includes(row.state)) return { blocked: 'CLOSED_ORDER' };
  if (row.errorCode === 'GENERATION_REVIEW_REQUIRED' || row.generationCheckpoint?.deliveryRefund) return { blocked: 'HELD_ORDER' };
  if (row.chapters?.length || row.completedChapters) return { blocked: 'CHAPTERS_SAVED' };
  if (new Date(row.leaseUntil || 0).getTime() > now) return { blocked: 'ACTIVE_LEASE' };
  // Re-applied timing replaces facts at read time; this plan does not model that.
  if (row.snapshot?.v7Timing) return { blocked: 'V7_TIMING' };
  const replacements = {}, labels = new Set();
  for (const [system, context] of Object.entries(row.snapshot?.analysis?.contexts || {})) {
    if (!context?.engineFacts) continue;
    let pinned;
    try { pinned = readEngineFactSnapshot(context.engineFacts, { system: context.domain }); } catch { return { blocked: 'SNAPSHOT_INVALID' }; }
    let changed = false;
    for (const fact of pinned.facts.facts) {
      const current = context.facts.find(item => item.id === fact.id);
      if (current && engineFactContains(current, fact)) continue;
      if (!current || !ENRICHED_LABELS.has(fact.label)) return { blocked: 'UNEXPECTED_FACT_CHANGE' };
      if (fact.label === 'advancedFactors' && JUDGMENT.some(key => current.value?.gyeokguk?.[key] !== fact.value?.gyeokguk?.[key])) return { blocked: 'JUDGMENT_CHANGED' };
      labels.add(fact.label);
      changed = true;
    }
    if (changed) replacements[system] = resealEngineFactSnapshot(context.engineFacts, { facts: context.facts, limitations: context.limitations, engineVersion: context.engineVersion });
  }
  return Object.keys(replacements).length ? { replacements, labels: [...labels].sort() } : { blocked: 'NOTHING_TO_SEAL' };
}
