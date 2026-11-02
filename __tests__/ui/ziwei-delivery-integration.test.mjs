import test from 'node:test';
import assert from 'node:assert/strict';
import { server, client, digest, wire, matches } from '../../tools/oracle/delivery-integration/harness.mjs';

const chartOf = s => s.preparations[0].chartSnapshot;
function delivered(s, c) {
  assert.equal(s.preparations.length, 1);
  assert.equal(s.consultations.length, 1);
  assert.ok(['legacy', 'kasi-jpl-expanded-20261101'].includes(s.preparations[0].authorityVersion));
  assert.equal(c.consultation?.status, 'completed', JSON.stringify({ errors: c.errors, serverErrors: s.errors }));
  const chart = chartOf(s), stored = s.consultations[0];
  assert.equal(digest(stored.llmMeta.chartSnapshot), digest(chart));
  assert.equal(digest(c.consultation.ziweiChart), digest(chart));
  for (const call of s.llmInputs) assert.equal(digest(call.chart), digest(chart));
  assert.equal(stored.llmMeta.calculationPreparationId, s.preparations[0]._id);
  assert.equal(c.consultation.id, stored.id);
  assert.equal(c.urlId, stored.id);
  assert.equal(s.payments[0].sessionId, stored.id);
  assert.equal(s.payments[0].orderState, 'UNLOCKED');
  assert.equal(s.usageApplications, 1);
  assert.equal(s.externalCalls, 0);
  assert.equal(s.refunds, 0);
  assert.equal(s.payments.length, 1);
  assert.equal(s.pgCalls.length, 1);
  assert.equal(c.consultation.messages.at(-1).content, stored.messages.at(-1).content);
}

test('mock predicates enforce owner, lease CAS, null/missing, dates and revocation exclusions', () => {
  const row = { userId: 'a', status: 'partial', generationLease: 'taken', updatedAt: new Date('2026-11-02'), metadata: { refunded: true } };
  assert.equal(matches(row, { userId: 'b' }), false);
  assert.equal(matches(row, { $or: [{ generationLease: '' }, { generationLease: { $exists: false } }, { updatedAt: { $lt: new Date('2026-11-01') } }] }), false);
  assert.equal(matches(row, { usageAppliedAt: null, status: { $nin: ['completed'] }, $and: [{ 'metadata.refunded': true }], $nor: [{ status: 'cancelled' }] }), true);
  assert.throws(() => matches(row, { status: { $unknown: true } }), /Unsupported/);
});

test('new paid calculation connects actual client prepare, mock PG, real generation orchestration and delivery', async () => {
  const s = server(), c = client(s);
  await c.submit();
  delivered(s, c);
  assert.equal(s.preparations[0].authorityVersion, 'legacy', 'Production selection remains OFF');
  assert.equal(s.llmInputs.length, 1);
  assert.equal(c.gateCalls, 1);
  assert.ok(c.basis?.groups.length);
  assert.deepEqual(c.basis.groups, c.consultation.analysisBasis.groups);
  assert.deepEqual(c.basis.stages, c.consultation.analysisBasis.stages);
  assert.deepEqual(s.requests.map(r => r.path), ['/api/ziwei-ai/prepare', '/api/ziwei-ai/basis', '/api/ziwei-ai/generate']);
});

test('payment redirect to a new document in a different year restores original input, chart and version without another gate', async () => {
  const s = server(), before = client(s, { redirect: true });
  await before.submit();
  assert.equal(s.llmInputs.length, 0);
  const original = digest(chartOf(s));
  const descriptor = wire(before.descriptor), grant = wire(before.grant);
  s.year = 2027;
  const returned = client(s, { key: 'different-form-key', form: { birthDate: '1990-12-30', gender: 'female' } });
  assert.equal(await returned.restore(descriptor.args, { payload: grant }), true);
  delivered(s, returned);
  assert.equal(returned.gateCalls, 0);
  assert.equal(digest(chartOf(s)), original);
  assert.deepEqual(before.basis.groups, returned.consultation.analysisBasis.groups);
  assert.equal(s.llmInputs[0].input.birthInfo.birthDate, '2023-02-04');
  assert.equal(s.consultations[0].idempotencyKey, descriptor.args.idempotencyKey);
});

test('partial generation uses actual client result polling/resume and preserves pinned chart across year change', async () => {
  const s = server(), c = client(s); s.partialOnce = true;
  c.onSleep = () => { s.year = 2027; };
  await c.submit(); delivered(s, c);
  assert.equal(s.llmInputs.length, 2);
  assert.ok(Object.keys(s.llmInputs[1].groups).length);
  assert.ok(s.requests.some(r => r.path === '/api/ziwei-ai/result'));
  assert.ok(s.requests.some(r => r.body.resumeSessionId));
  assert.equal(c.gateCalls, 1);
});

test('completion storage failure retries delivery only, with no second generation or usage', async () => {
  const s = server(), c = client(s); s.failCompletion = true;
  await c.submit(); delivered(s, c);
  assert.equal(s.llmInputs.length, 1);
  assert.ok(s.requests.some(r => r.body.resumeSessionId));
  assert.equal(c.gateCalls, 1);
});

test('completed paid reread and duplicate generation preserve every stored field and do not call PG or LLM', async () => {
  const s = server(), c = client(s); await c.submit(); delivered(s, c);
  const before = digest(wire({ preparations: s.preparations, consultations: s.consultations, payments: s.payments }));
  const writes = s.writes.length;
  s.year = 2099;
  const reread = await s.request(`/api/ziwei-ai/result?id=${c.urlId}`, {}, 'GET');
  assert.equal(reread.status, 200);
  assert.equal(digest(reread.data.consultation.ziweiChart), digest(chartOf(s)));
  const resumed = await s.request('/api/ziwei-ai/generate', { resumeSessionId: c.urlId });
  assert.equal(resumed.status, 200);
  const duplicate = await s.request('/api/ziwei-ai/generate', s.consultations[0].llmMeta.resumeBody);
  assert.equal(duplicate.status, 200);
  assert.equal(digest(wire({ preparations: s.preparations, consultations: s.consultations, payments: s.payments })), before);
  assert.equal(s.writes.length, writes);
  assert.equal(s.pgCalls.length, 1); assert.equal(s.llmInputs.length, 1);
});

test('two payment-return documents race: one stored result, one generation, one usage application', async () => {
  const s = server(), first = client(s, { redirect: true }); await first.submit();
  // This receipt has already been confirmed by the mock payment-return boundary.
  // Verification lookups may be concurrent; they are not new charges.
  const args = first.descriptor.args, grant = { payload: first.grant };
  let release, entered, reachedPoll, releasePoll;
  const enteredGeneration = new Promise(resolve => { entered = resolve; });
  s.holdGeneration = new Promise(resolve => { release = resolve; });
  const generator = s.context.generateInitialConsultation;
  s.context.generateInitialConsultation = (...params) => { entered(); return generator(...params); };
  const a = client(s), b = client(s);
  const polling = new Promise(resolve => { reachedPoll = resolve; });
  const waitForFirst = new Promise(resolve => { releasePoll = resolve; });
  b.onSleep = async () => { reachedPoll(); await waitForFirst; };
  const running = a.restore(args, grant);
  await enteredGeneration;
  const duplicate = b.restore(args, grant);
  await polling;
  assert.equal(b.consultation.status, 'generating');
  assert.equal(s.llmInputs.length, 1);
  release(); assert.equal(await running, true);
  releasePoll(); assert.equal(await duplicate, true);
  delivered(s, a); delivered(s, b);
  assert.equal(a.gateCalls + b.gateCalls, 0);
  assert.equal(s.llmInputs.length, 1);
});

test('approved v2 preparation survives actual OFF routes and payment return in a later year', async () => {
  const s = server(), c = client(s, { redirect: true });
  const body = wire(c.context.buildConsultationPayload(c.context.form, c.context.idempotencyRef.current));
  const normalized = s.context.normalizeConsultationInput(body);
  // Only this isolated fixture uses the already approved explicit ON option.
  // All actual prepare/basis/generate handlers still omit it and remain default OFF.
  await s.context.resolveZiweiPreparation({ model: s.context.ZiweiCalculationPreparation,
    userId: s.userId, requestId: body.idempotencyKey, inputHash: normalized.inputHash,
    input: normalized.input, rawBody: body, action: 'prepare', year: 2026, calendarAuthorityV2: true });
  const original = digest(chartOf(s));
  await c.submit(); s.year = 2027;
  const returned = client(s);
  assert.equal(await returned.restore(c.descriptor.args, { payload: c.grant }), true);
  delivered(s, returned);
  assert.equal(s.preparations[0].authorityVersion, 'kasi-jpl-expanded-20261101');
  assert.equal(digest(chartOf(s)), original);
  assert.deepEqual(c.basis.groups, returned.consultation.analysisBasis.groups);
  assert.equal(returned.gateCalls, 0);
});

test('tampered input, missing preparation and corrupt preparation stop before PG and generation', async () => {
  for (const fault of ['input', 'missing', 'corrupt', 'payment']) {
    const s = server(), c = client(s, { redirect: true }); await c.submit();
    const args = wire(c.descriptor.args), grant = wire(c.grant), body = JSON.parse(args.payload);
    if (fault === 'input') { body.birthInfo.birthDate = body.birthDate = '1990-12-30'; args.payload = JSON.stringify(body); }
    if (fault === 'missing') s.preparations.length = 0;
    if (fault === 'corrupt') s.preparations[0].chartSnapshot.lifePalace = 'tampered';
    if (fault === 'payment') grant.paymentId = 'another-owner-order';
    const returned = client(s);
    assert.equal(await returned.restore(args, { payload: grant }), false, fault);
    assert.equal(returned.consultation, null, fault);
    assert.equal(s.consultations.length, 0, fault);
    assert.equal(s.llmInputs.length, 0, fault);
    assert.equal(s.pgCalls.length, 0, fault);
    assert.equal(returned.gateCalls, 0, fault);
    assert.equal(s.payments[0].status, 'pending', fault);
    assert.equal(s.refunds, 0, fault);
  }
});

test('untrusted body flags cannot enable v2; preparation retry reuses original order and chart', async () => {
  const s = server(), c = client(s, { redirect: true }); await c.submit();
  const body = JSON.parse(c.descriptor.args.payload);
  const before = digest(wire(s.preparations));
  const retried = await s.request('/api/ziwei-ai/prepare', { ...body, calendarAuthorityV2: true, authorityVersion: 'kasi-jpl-expanded-20261101' });
  assert.equal(retried.status, 402);
  assert.equal(retried.data.paymentPayload.paymentId, c.grant.paymentId);
  assert.equal(s.preparations[0].authorityVersion, 'legacy');
  assert.equal(digest(wire(s.preparations)), before);
  assert.equal(s.payments.length, 1);
  assert.equal(s.llmInputs.length + s.pgCalls.length, 0);
});

test('historic paid result without a preparation stays byte-identical and is not recalculated', async () => {
  const s = server(), c = client(s); await c.submit(); delivered(s, c);
  const saved = s.consultations[0];
  delete saved.llmMeta.calculationPreparationId;
  delete saved.llmMeta.resumeBody.calculationProtocol;
  saved.ziweiChart = saved.llmMeta.chartSnapshot;
  delete saved.llmMeta.chartSnapshot;
  saved.messages.at(-1).content = '기존 구매자의 합성 저장 결과';
  s.preparations.length = 0;
  const before = digest(wire({ saved, payments: s.payments })), writes = s.writes.length;
  s.year = 2099;
  for (const result of [await s.request(`/api/ziwei-ai/result?id=${saved.id}`, {}, 'GET'),
    await s.request('/api/ziwei-ai/generate', { resumeSessionId: saved.id })]) {
    assert.equal(result.status, 200);
    assert.equal(result.data.consultation.messages.at(-1).content, saved.messages.at(-1).content);
    assert.equal(digest(result.data.consultation.ziweiChart), digest(saved.ziweiChart));
  }
  assert.equal(digest(wire({ saved, payments: s.payments })), before);
  assert.equal(s.writes.length, writes); assert.equal(s.preparations.length, 0);
  assert.equal(s.pgCalls.length, 1); assert.equal(s.llmInputs.length, 1);
});

test('different owner cannot read or resume the paid result and creates no writes', async () => {
  const s = server(), c = client(s); await c.submit(); delivered(s, c);
  const before = digest(wire(s.consultations)), writes = s.writes.length;
  s.userId = 'another-mock-owner';
  assert.equal((await s.request(`/api/ziwei-ai/result?id=${c.urlId}`, {}, 'GET')).status, 404);
  assert.equal((await s.request('/api/ziwei-ai/generate', { resumeSessionId: c.urlId })).status, 404);
  assert.equal(digest(wire(s.consultations)), before);
  assert.equal(s.writes.length, writes); assert.equal(s.llmInputs.length, 1);
});

test('prepared reference year controls canonical facts and metadata at a major-luck boundary; legacy stays unchanged', async () => {
  const s = server(), c = client(s, { redirect: true });
  s.year = 2034; // 2023 lunar birth: age 12, final year of the first major luck.
  await c.submit();
  const chart = chartOf(s), before = digest(chart);
  const prepared = s.context.preparedZiweiChart({ chart: wire(chart), preparationId: s.preparations[0]._id });
  const original = wire(s.context.resolveCurrentMajorLuckByChartAge(prepared));
  const facts = wire(s.context.buildCanonicalZiweiFacts(prepared));
  const mockText = JSON.stringify({ meta: {}, sections: {} });
  const originalMeta = JSON.parse(s.context.enforceZiweiChartFacts(mockText, prepared).text).meta.dayun;
  s.year = 2035;
  assert.deepEqual(wire(s.context.resolveCurrentMajorLuckByChartAge(prepared)), original);
  assert.deepEqual(wire(s.context.buildCanonicalZiweiFacts(prepared)), facts);
  assert.deepEqual(JSON.parse(s.context.enforceZiweiChartFacts(mockText, prepared).text).meta.dayun, originalMeta);
  assert.notDeepEqual(JSON.parse(s.context.enforceZiweiChartFacts(mockText, wire(chart)).text).meta.dayun, originalMeta);
  const legacy = s.context.resolveCurrentMajorLuckByChartAge(wire(chart));
  assert.equal(original.age, 12); assert.equal(legacy.age, 13);
  assert.notEqual(original.palaceName, legacy.palaceName);
  const returned = client(s);
  assert.equal(await returned.restore(c.descriptor.args, { payload: c.grant }), true);
  delivered(s, returned);
  assert.deepEqual(c.basis.groups, returned.consultation.analysisBasis.groups);
  assert.equal(digest(chartOf(s)), before);
});
