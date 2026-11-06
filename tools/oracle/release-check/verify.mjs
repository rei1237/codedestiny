// Node 24; run with --experimental-transform-types. No package installation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fs.realpathSync(fileURLToPath(new URL('../../../', import.meta.url)));
const loaded = new Set();
const knownTs = new Set(['../shared/time', '../shared/contracts', './contracts']);
// These regressions need only local sources, crypto and assertions. Deny a
// new bare dependency or network-capable builtin before its code can execute.
registerHooks({ resolve(specifier, context, next) {
  if (['node:crypto', 'node:assert/strict'].includes(specifier)) return next(specifier, context);
  if (!specifier.startsWith('.') || /swiss|swisseph|sweph|jyotish|\.wasm/i.test(specifier))
    throw Error('AUDIT_IMPORT_DENIED: ' + specifier);
  const url = new URL(knownTs.has(specifier) ? specifier + '.ts' : specifier, context.parentURL);
  const filename = fs.realpathSync(fileURLToPath(url));
  const relative = path.relative(root, filename).replaceAll('\\', '/');
  if (relative.startsWith('../') || path.isAbsolute(relative) || /node_modules|\/vendor\/|swisseph|sweph|\.wasm/i.test(relative))
    throw Error('AUDIT_PATH_DENIED: ' + relative);
  loaded.add(relative);
  return { url: pathToFileURL(filename).href, shortCircuit: true };
} });
globalThis.fetch = () => { throw Error('AUDIT_NETWORK_DENIED'); };

await assert.rejects(import('sweph-wasm'), /AUDIT_IMPORT_DENIED/);
await assert.rejects(import('node:net'), /AUDIT_IMPORT_DENIED/);
const { verifyGreenwichSolarClock } = await import('../../../__tests__/fixtures/jpl-greenwich-solar-clock.mjs');
const { ziweiRelationshipClock } = await import('../../../worker/yeongnyangi/fortune/ziwei/relationship-clock.ts');
const errors = verifyGreenwichSolarClock(ziweiRelationshipClock);
const { resolveZiweiPreparation } = await import('../../../worker/lib/ziwei-calculation-preparation.js');
const rows = new Map();
const model = { findById: id => ({ lean: async () => structuredClone(rows.get(id)) }),
  create: async row => { assert.ok(!rows.has(row._id)); rows.set(row._id, structuredClone(row)); } };
for (const [birthDate, expected] of [['2000-05-15', 'kasi-jpl-expanded-20261101'], ['1990-07-01', 'legacy']]) {
  const args = { model, userId: 'mock-owner', requestId: 'test-' + birthDate, inputHash: birthDate,
    input: { birthDate, birthTime: '08:30', calendarType: 'solar', gender: 'female' },
    rawBody: { calculationProtocol: 'ziwei-prepared-v1' } };
  const prepared = await resolveZiweiPreparation({ ...args, year: 2026, calendarAuthorityV2: true, action: 'prepare' });
  assert.equal(rows.get(prepared.preparationId).authorityVersion, expected);
  const resumed = await resolveZiweiPreparation({ ...args, year: 2027, calendarAuthorityV2: false, action: 'generate' });
  assert.deepEqual(resumed, prepared);
}
const { pinDrawPresentation, PREPARED_DRAW_VERSION } = await import('../../../worker/lib/paid-tarot-presentation.js');
const { pinTarotNarrativeSeed, assertTarotNarrativeSnapshot } = await import('../../../worker/lib/tarot-fact-consumer.js');
const cards = [{ cardId: 'M00', position: 'self', orientation: 'reversed', interpretation: 'fixture' }];
const draw = { featureKey: 'tarot-love-relationship', drawId: 'mock-original', version: PREPARED_DRAW_VERSION,
  deckVersion: 'mock-deck', cards };
draw.presentationFacts = pinDrawPresentation(draw, { cards });
const tarot = pinTarotNarrativeSeed({ base: { cards }, prompt: 'mock' }, {}, {}, draw);
assert.equal(tarot.engineFacts.options.preparedPresentation.digest, draw.presentationFacts.digest);
assertTarotNarrativeSnapshot(structuredClone(tarot));
const changed = structuredClone(tarot);
changed.base.cards[0].orientation = 'upright';
assert.throws(() => assertTarotNarrativeSnapshot(changed), /TAROT_FACTS_CONFLICT/);
console.log(JSON.stringify({ verified: ['greenwich-clock', 'ziwei-OFF-resume', 'tarot-prepared-draw'],
  maxClockErrorMinutes: Math.max(...errors), localModules: loaded.size,
  ...(process.argv.includes('--list-inputs') ? { inputs: [...loaded].sort() } : {}) }));

