import { check, digest, PROTOCOL } from './config.mjs';
import { boundedStore, memoryBackend } from './storage.mjs';

async function rejects(action, code) {
  let caught; try { await action(); } catch (error) { caught = error; }
  check(caught?.code === code, 'AUDIT_EXPECTED_REJECTION_MISSING');
}
export async function runScenario(backend, cases, fixture, resolve) {
  const store = boundedStore(backend, cases), [first, second] = store.models, completed = [];
  // The only calculator flag passed by this runner is false, including retries.
  const call = (entry, model = first, extra = {}) => resolve({ ...entry, ...extra, model, calendarAuthorityV2: false });
  const selected = await Promise.all(Array.from({ length: fixture.concurrency }, (_, i) => call(cases.entries.main, i % 2 ? second : first)));
  check(selected.every(value => digest(value) === digest(selected[0])));
  const main = selected[0]; completed.push('two-connection-concurrency-20');
  for (const action of ['basis', 'generate']) check(digest(await call(cases.entries.main, second, { action, year: 2099 })) === digest(main));
  completed.push('basis-generate-off-year-change');
  await rejects(() => call(cases.entries.main, second, { inputHash: 'changed' }), 'CALCULATION_PREPARATION_CONFLICT');
  await rejects(() => call(cases.entries.main, second, { rawBody: { calculationProtocol: PROTOCOL, longitude: 140 } }), 'CALCULATION_PREPARATION_CONFLICT');
  await rejects(() => call(cases.entries.other, second, { action: 'generate' }), 'CALCULATION_PREPARATION_REQUIRED');
  const other = await call(cases.entries.other, second); check(other.preparationId !== main.preparationId);
  completed.push('input-geography-owner-isolation');
  const loss = { ...first, async create(record) { await first.create(record); throw new Error('synthetic response loss'); } };
  await rejects(() => call(cases.entries.lost, loss), 'CALCULATION_PREPARATION_UNAVAILABLE');
  const savedLoss = await first.findById(cases.ids.lost).lean();
  const recovered = await call(cases.entries.lost, second, { action: 'generate', year: 2099 });
  check(digest(savedLoss.chartSnapshot) === digest(recovered.chart)); completed.push('insert-response-loss-recovery');
  await rejects(() => call(cases.entries.missing, second, { action: 'generate' }), 'CALCULATION_PREPARATION_REQUIRED');
  const brokenRead = { ...second, findById() { return { lean() { throw new Error('synthetic read failure'); } }; } };
  await rejects(() => call(cases.entries.main, brokenRead, { action: 'generate' }), 'CALCULATION_PREPARATION_UNAVAILABLE');
  completed.push('missing-or-unreadable-preparation-holds');
  // A corrupted synthetic insert, never an update to an existing result.
  const local = memoryBackend();
  const capturing = { findById: () => ({ lean: async () => null }), async create(record) { local.record = structuredClone(record); } };
  await rejects(() => call(cases.entries.corrupt, capturing), 'CALCULATION_PREPARATION_UNAVAILABLE');
  const corrupted = { ...local.record, selectionDigest: 'synthetic-corruption' };
  await first.create(corrupted);
  await rejects(() => call(cases.entries.corrupt, second, { action: 'generate' }), 'CALCULATION_PREPARATION_UNAVAILABLE');
  completed.push('corrupted-synthetic-preparation-holds');
  const savedPaid = { _id: cases.consultationIds[0], userId: cases.owner, status: 'completed', accessType: 'paid', paymentId: 'synthetic-no-real-payment',
    messages: [{ role: 'assistant', content: fixture.savedPaidText }], llmMeta: { chartSnapshot: main.chart } };
  const partial = { _id: cases.consultationIds[1], userId: cases.owner, status: 'partial',
    messages: [{ role: 'assistant', content: 'SYNTHETIC PARTIAL RESULT' }], llmMeta: { chartSnapshot: main.chart, calculationPreparationId: main.preparationId, resumeBody: cases.entries.main.rawBody } };
  for (const record of [savedPaid, partial]) await store.saveConsultation(record);
  const originals = await Promise.all(cases.consultationIds.map(id => store.readConsultation(id)));
  const saved = await call(cases.entries.main, brokenRead, { existing: originals[0], action: 'generate', year: 2099 });
  check(digest(saved.chart) === digest(main.chart));
  check(digest((await call(cases.entries.main, second, { existing: originals[1], action: 'generate', year: 2099 })).chart) === digest(main.chart));
  const after = await Promise.all(cases.consultationIds.map(id => store.readConsultation(id)));
  check(digest(originals) === digest(after));
  completed.push('stored-paid-and-partial-fixtures-unchanged');
  check(store.count.preparationRows === 4 && store.count.consultationRows === 2);
  return { completed, counts: store.count, chartDigest: digest(main.chart), savedResultsDigest: digest(after), calendarAuthorityV2: false, paymentCalls: 0, llmCalls: 0 };
}
