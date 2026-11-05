import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// Execute actual orchestration functions, never import the payment/Swiss route graph.
const routeFile = 'worker/routes/ziwei-ai.js';
const source = fs.readFileSync(routeFile, 'utf8');
const baseline = execFileSync('git', ['show', `20904183a1b0276584ed6f74313bf1e6cdeaf442:${routeFile}`], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
const adapterSource = fs.readFileSync('worker/lib/ziwei-execution-adapter.js', 'utf8');
const preparationSource = fs.readFileSync('worker/lib/ziwei-calculation-preparation.js', 'utf8');
function functionText(text, name) {
  const ast = ts.createSourceFile('route.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.ok(node, name); return node.getText(ast);
}
const clone = x => x == null ? x : structuredClone(x);
const birth = { birthDate: '2023-02-04', birthTime: '11:42', calendarType: 'solar', gender: 'male' };
const requestBody = { birthInfo: birth, topic: 'overall', userQuestion: '', idempotencyKey: 'execution-test-key', accessType: 'pass' };
const epoch = Date.parse('2026-11-01T00:00:00Z');
function setup({ old = false, on = false } = {}) {
  const state = { docs: [], preparations: new Map(), calculations: 0, billing: 0, claims: 0, generations: 0, usage: 0, refunds: 0, complete: true, fault: '', created: [], on, uuid: 0, year: 2026, userId: 'owner', admin: true, payments: 0 };
  const matching = (d, q) => ['id', 'userId', 'idempotencyKey', 'generationLease'].every(k => q[k] === undefined || d[k] === q[k]);
  const query = fn => ({ lean: async () => clone(fn()) });
  const storageError = () => Object.assign(new Error('storage unavailable'), { code: 'RESULT_STORAGE_UNAVAILABLE' });
  const update = (q, fields) => { const d = state.docs.find(d => matching(d, q)); if (!d) throw storageError(); Object.assign(d, clone(fields)); return clone(d); };
  const context = {
    structuredClone, createHash, console: { log() {}, warn() {}, error() {} },
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [epoch])); } static now() { return epoch; } getFullYear() { return state.year; } },
    readJson: async request => clone(request.body), clean: x => String(x || ''),
    getOptionalUserFromRequest: async () => ({ userId: state.userId }), connectDb: async () => {},
    peekAccessTokenUserId: async () => state.userId, safeLogPayload: x => x,
    isAdmin: () => state.admin, createAccessToken: async () => 'mock-access-token',
    withMongoRetry: async (_env, fn) => fn(), loadBillingUser: async () => ({}),
    resolveServerAccess: async () => ({ ok: false }),
    createOrReusePaymentPayload: async () => { state.payments++; return { ok: true, paymentPayload: { merchantUid: 'original-order' } }; },
    buildZiweiAnalysisBasis: chart => ({ chart: clone(chart) }),
    readIdempotencyKey: (_r, b) => b.idempotencyKey || '',
    normalizeConsultationInput: b => ({ ok: true, input: { birthInfo: b.birthInfo, topic: b.topic, userQuestion: b.userQuestion }, inputHash: JSON.stringify(b.birthInfo) }),
    getPricing: () => ({}), json: (body, options = {}) => ({ status: options.status || 200, body: clone(body) }),
    publicConsultation: doc => ({ ok: true, consultation: clone(doc) }),
    invalidInput: (_m, status = 400) => ({ status }), notFound: () => ({ status: 404 }), loginRequired: () => ({ status: 401 }),
    calculationFailed: () => ({ status: 422, body: { reason: 'CALCULATION_FAILED' } }), paymentVerifyFailed: () => ({ status: 402 }),
    MESSAGES: { llmFailed: 'mock' }, SERVICE_KEY: 'ziwei-ai', FEATURE_KEY: 'ziwei-ai-consultation', GENERATING_FRESHNESS_MS: 120000,
    resolveStartAccess: async () => { state.billing++; return { ok: true, accessType: 'pass', claimEvidenceIds: ['same-evidence'] }; },
    logZiweiAi() {}, randomUUID: () => `uuid-${++state.uuid}`,
    claimRequestBillingEvidence: async () => { state.claims++; return { ok: true }; }, evidenceClaimErrorBody: () => ({}),
    ZiweiCalculationPreparation: {
      findById: id => query(() => { if (state.fault === 'preparation-read') throw storageError(); return state.preparations.get(id) || null; }),
      create: async record => {
        if (state.fault === 'preparation-before') throw storageError();
        if (state.preparations.has(record._id)) throw Object.assign(new Error('duplicate'), { code: 11000 });
        state.preparations.set(record._id, clone(record));
        if (state.fault === 'preparation-after') throw storageError();
      },
    },
    ZiweiAiConsultation: {
      findOne: q => query(() => { if (state.fault === 'read') throw storageError(); return state.docs.find(d => matching(d, q)) || null; }),
      create: async doc => {
        if (state.fault === 'create-before') throw storageError();
        if (state.docs.some(d => d.userId === doc.userId && d.idempotencyKey === doc.idempotencyKey)) throw Object.assign(new Error('duplicate'), { code: 11000 });
        const created = { ...clone(doc), updatedAt: new Date(epoch) }; state.docs.push(created); state.created.push(clone(created));
        if (state.fault === 'create-after') throw storageError();
        return clone(created);
      },
      findOneAndUpdate: (q, change) => query(() => {
        const d = state.docs.find(d => matching(d, q) && !['completed', 'generation_failed'].includes(d.status));
        if (!d || (d.generationLease && new Date(d.updatedAt).getTime() >= epoch - 120000)) return null;
        if (state.onLock) state.onLock(d);
        Object.assign(d, clone(change.$set)); return d;
      }),
      updateOne: async (q, change) => { const d = state.docs.find(d => matching(d, q)); if (d) Object.assign(d, clone(change.$set)); },
    },
    calculateZiweiAiChart: (input, options) => {
      state.calculations++; if (state.fault === 'calculate') throw new Error('bad chart');
      return { palaces: [], lunar: { source: options.authorityFlags?.authorityVersion || 'legacy' }, yearlyLuck: { year: options.year }, chartSummary: input.birthInfo.birthDate };
    },
    resultStorageUnavailable: storageError, resultStorageFailurePayload: () => ({ reason: 'RESULT_STORAGE_UNAVAILABLE' }),
    saveZiweiDelivery: async (q, fields) => { if (state.fault === 'save') throw storageError(); return update(q, fields); },
    runWithAiLocale: (_locale, fn) => fn(), storedAiLocale: () => 'ko',
    generateInitialConsultation: async (_env, options) => {
      state.generations++; if (state.waitForGeneration) await state.waitForGeneration;
      assert.ok(options.chart); return { complete: state.complete, text: 'stored mock chapters', meta: {} };
    },
    enforceZiweiChartFacts: text => ({ text }), applyUsageOnce: async () => { state.usage++; },
    Payment: { updateOne: async () => { throw new Error('real payment forbidden'); } },
    restorePrepaidAccessOnFailure: async () => { state.refunds++; }, releaseRequestBillingEvidence: async () => {},
    refundCardPaymentOnFailure: async () => { state.refunds++; return {}; },
    fetch: () => { throw new Error('network forbidden'); },
  };
  vm.createContext(context, { codeGeneration: { strings: false, wasm: false } });
  const adapterAst = ts.createSourceFile('adapter.js', adapterSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  vm.runInContext(adapterAst.statements.filter(n => !ts.isImportDeclaration(n)).map(n => n.getText(adapterAst).replace(/^export /, '')).join('\n'), context);
  const preparationAst = ts.createSourceFile('preparation.js', preparationSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  vm.runInContext(preparationAst.statements.filter(n => !ts.isImportDeclaration(n)).map(n => n.getText(preparationAst).replace(/^export /, '')).join('\n'), context);
  // Exercise the actual route selector with trusted server environment only.
  vm.runInContext('const preparedChartYears = new WeakMap();', context);
  for (const name of ['preparedZiweiChart', 'preparationFailed', 'handleEnsureAccess', 'handleBasis']) vm.runInContext(functionText(source, name), context);
  vm.runInContext(functionText(old ? baseline : source, 'handleStart'), context);
  state.start = (body = requestBody) => context.handleStart({ body }, { ZIWEI_CALENDAR_AUTHORITY_V2: String(state.on) });
  state.prepare = (body = requestBody) => context.handleEnsureAccess({ body }, { ZIWEI_CALENDAR_AUTHORITY_V2: String(state.on) });
  state.basis = (body = requestBody) => context.handleBasis({ body }, { ZIWEI_CALENDAR_AUTHORITY_V2: String(state.on) });
  state.resume = () => state.start({ resumeSessionId: state.docs[0].id });
  state.seed = (patch = {}) => state.docs.push({ id: 'saved', userId: 'owner', idempotencyKey: requestBody.idempotencyKey, inputHash: JSON.stringify(birth), serviceType: 'ziwei-ai', status: 'partial', generationLease: '', updatedAt: new Date(epoch), messages: [], llmMeta: { resumeBody: clone(requestBody), groups: {}, attempts: {}, chartSnapshot: { palaces: [], lunar: { source: 'fixed-v2' } } }, ...clone(patch) });
  return state;
}

test('OFF final result matches baseline; new row contains its snapshot at the first atomic create', async () => {
  const before = setup({ old: true }), after = setup();
  assert.deepEqual(await after.start(), await before.start());
  assert.equal(before.created[0].llmMeta.chartSnapshot, undefined);
  assert.equal(after.created[0].llmMeta.chartSnapshot.lunar.source, 'legacy');
  assert.equal(after.calculations, 1); assert.equal(after.usage, 1);
});

test('atomic create response loss then rollback resumes the persisted v2 chart without recalculation', async () => {
  const s = setup({ on: true }); await s.prepare(); s.fault = 'create-after';
  assert.equal((await s.start()).status, 503); assert.equal(s.generations, 0); assert.equal(s.usage, 0);
  const snapshot = clone(s.docs[0].llmMeta.chartSnapshot);
  s.fault = ''; s.on = false; s.docs[0].updatedAt = new Date(epoch - 120001);
  assert.equal((await s.resume()).status, 200);
  assert.deepEqual(s.docs[0].llmMeta.chartSnapshot, snapshot); assert.equal(s.calculations, 1); assert.equal(s.usage, 1); assert.equal(s.refunds, 0);
});

test('concurrent identical requests keep one winning snapshot and one generation/charge', async () => {
  const s = setup({ on: true });
  await s.prepare();
  let release; s.waitForGeneration = new Promise(resolve => { release = resolve; });
  const first = s.start();
  while (!s.generations) await new Promise(resolve => setImmediate(resolve));
  s.on = false;
  const second = await s.start(); assert.equal(second.status, 202);
  release(); assert.equal((await first).status, 200);
  assert.equal(s.docs.length, 1); assert.equal(s.generations, 1); assert.equal(s.usage, 1);
  assert.equal(s.docs[0].llmMeta.chartSnapshot.lunar.source, 'kasi-jpl-expanded-20261101');
  const race = setup({ on: true }); await race.prepare(); await Promise.all([race.start(), race.start()]);
  assert.equal(race.docs.length, 1); assert.equal(race.generations, 1); assert.equal(race.usage, 1);
});

test('partial rollback, completed retry and delivery-only retry never select a new version', async () => {
  const s = setup({ on: true }); await s.prepare(); s.complete = false;
  assert.equal((await s.start()).status, 202); const snapshot = clone(s.docs[0].llmMeta.chartSnapshot);
  s.on = false; s.complete = true; assert.equal((await s.resume()).status, 200);
  assert.equal(s.calculations, 1); assert.deepEqual(s.docs[0].llmMeta.chartSnapshot, snapshot);
  const completed = clone(s.docs[0]), calls = [s.calculations, s.billing, s.claims, s.generations, s.usage];
  await s.resume(); await s.start(); assert.deepEqual(s.docs[0], completed);
  assert.deepEqual([s.calculations, s.billing, s.claims, s.generations, s.usage], calls);
  const delivery = setup({ on: true }); delivery.seed({ status: 'delivery_pending' });
  await delivery.resume(); assert.equal(delivery.calculations, 0); assert.equal(delivery.generations, 0); assert.equal(delivery.usage, 1);
});

test('leased record wins over an earlier read and failed checkpoint retries use the original snapshot', async () => {
  const s = setup(); s.seed();
  s.onLock = doc => { doc.llmMeta.chartSnapshot = { palaces: [], lunar: { source: 'winning-snapshot' } }; };
  await s.resume(); assert.equal(s.docs[0].llmMeta.chartSnapshot.lunar.source, 'winning-snapshot'); assert.equal(s.calculations, 0);
  const failed = setup({ on: true }); await failed.prepare(); failed.fault = 'save';
  assert.equal((await failed.start()).status, 503); const chart = clone(failed.docs[0].llmMeta.chartSnapshot);
  failed.fault = ''; failed.on = false; await failed.resume();
  assert.equal(failed.calculations, 1); assert.deepEqual(failed.docs[0].llmMeta.chartSnapshot, chart); assert.equal(failed.usage, 1); assert.equal(failed.refunds, 0);
  const corrupt = setup(); corrupt.seed(); corrupt.onLock = doc => { doc.llmMeta.chartSnapshot = {}; };
  assert.equal((await corrupt.resume()).status, 422); assert.equal(corrupt.refunds, 0); assert.equal(corrupt.generations, 0);
});

test('old blank execution stays legacy; missing snapshot with written results is held without billing/refund', async () => {
  const blank = setup({ on: true }); blank.seed({ status: 'generating', llmMeta: { resumeBody: clone(requestBody), groups: {} } });
  await blank.resume(); assert.equal(blank.docs[0].llmMeta.chartSnapshot.lunar.source, 'legacy');
  for (const patch of [{ llmMeta: { resumeBody: clone(requestBody), groups: { first: 'kept' } } }, { llmMeta: { resumeBody: clone(requestBody), chartSnapshot: {} } }]) {
    const s = setup({ on: true }); s.seed(patch); const original = clone(s.docs);
    assert.equal((await s.resume()).status, 422); assert.deepEqual(s.docs, original);
    assert.deepEqual([s.calculations, s.billing, s.claims, s.generations, s.usage, s.refunds], [0, 0, 0, 0, 0, 0]);
  }
});

test('lookup/input/ownership/preflight/storage failures do not become another new paid execution', async () => {
  const read = setup(); read.fault = 'read'; await assert.rejects(read.start()); assert.equal(read.calculations, 0); assert.equal(read.billing, 0);
  const calc = setup(); calc.fault = 'calculate'; assert.equal((await calc.start()).status, 422); assert.equal(calc.billing, 0); assert.equal(calc.docs.length, 0);
  for (const fault of ['create-before', 'save']) { const s = setup(); s.fault = fault; assert.equal((await s.start()).status, 503); assert.equal(s.generations, 0); assert.equal(s.usage, 0); assert.equal(s.refunds, 0); }
  const s = setup(); s.seed(); const original = clone(s.docs);
  assert.equal((await s.start({ ...requestBody, birthInfo: { ...birth, birthTime: '12:42' } })).status, 409);
  s.docs[0].userId = 'other'; assert.equal((await s.resume()).status, 404);
  s.docs[0].userId = 'owner'; assert.deepEqual(s.docs, original); assert.equal(s.calculations, 0); assert.equal(s.usage, 0);
});

test('payment/access/read helpers remain identical to the task baseline', () => {
  for (const name of ['resolveStartAccess', 'handleResult', 'applyUsageOnce', 'verifyPaymentForStart', 'saveZiweiDelivery']) {
    assert.equal(functionText(source, name).replaceAll('\r\n', '\n'), functionText(baseline, name).replaceAll('\r\n', '\n'), name);
  }
  const taskBaseline = execFileSync('git', ['show', 'c7f46acf26fc1e7881635a9bce7d2f905d17ee1e:worker/routes/ziwei-ai.js'], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
  assert.equal(functionText(source, 'createOrReusePaymentPayload').replaceAll('\r\n', '\n'), functionText(taskBaseline, 'createOrReusePaymentPayload').replaceAll('\r\n', '\n'));
  assert.ok(!functionText(source, 'handleStart').includes('calendarAuthorityV2: true'));
});

const preparedBody = { ...requestBody, calculationProtocol: 'ziwei-prepared-v1' };
test('CR-006 payment prepare, basis, return after OFF/year change and partial resume share one snapshot', async () => {
  const s = setup({ on: true }); s.admin = false;
  const access = await s.prepare(preparedBody);
  assert.equal(access.status, 402); assert.equal(access.body.calculationReady, true);
  assert.deepEqual(access.body.paymentPayload, { merchantUid: 'original-order' });
  const original = clone([...s.preparations.values()][0]);
  assert.equal(s.payments, 1); assert.equal(s.docs.length, 0); assert.equal(s.usage, 0);
  s.on = false; s.year = 2027; s.complete = false;
  assert.deepEqual((await s.basis(preparedBody)).body.chart, original.chartSnapshot);
  assert.equal((await s.start({ ...preparedBody, paymentId: 'original-order' })).status, 202);
  assert.equal(s.docs[0].llmMeta.calculationPreparationId, original._id);
  assert.deepEqual(s.docs[0].llmMeta.chartSnapshot, original.chartSnapshot);
  s.complete = true; assert.equal((await s.resume()).status, 200);
  assert.equal(s.calculations, 1); assert.equal(s.generations, 2); assert.equal(s.usage, 1);
  assert.deepEqual([...s.preparations.values()], [original]);
});

test('CR-006 two prepare calls and generation races preserve the durable winner', async () => {
  const s = setup({ on: true });
  const first = s.prepare(preparedBody); s.on = false; s.year = 2027;
  const responses = await Promise.all([first, s.prepare(preparedBody)]);
  assert.ok(responses.every(response => response.body.calculationReady));
  assert.equal(s.preparations.size, 1);
  const winner = clone([...s.preparations.values()][0]);
  await Promise.all([s.start(preparedBody), s.start(preparedBody)]);
  assert.equal(s.docs.length, 1); assert.equal(s.generations, 1); assert.equal(s.usage, 1);
  assert.deepEqual(s.docs[0].llmMeta.chartSnapshot, winner.chartSnapshot);
});

test('CR-006 lost prepare response retries the stored version; unreadable or missing preparation holds before billing', async () => {
  const s = setup({ on: true }); s.fault = 'preparation-after';
  assert.equal((await s.prepare(preparedBody)).status, 503); assert.equal(s.preparations.size, 1);
  assert.equal(s.payments, 0); s.fault = ''; s.on = false; s.year++;
  assert.equal((await s.prepare(preparedBody)).body.calculationReady, true); assert.equal(s.calculations, 1);
  for (const fault of ['preparation-before', 'preparation-read']) {
    const failed = setup(); failed.fault = fault; failed.admin = false;
    assert.equal((await failed.prepare(preparedBody)).status, 503);
    assert.equal(failed.payments, 0); assert.equal(failed.docs.length, 0);
  }
  for (const action of ['start', 'basis']) {
    const missing = setup(); assert.equal((await missing[action](preparedBody)).status, 503);
    assert.equal(missing.calculations, 0); assert.equal(missing.billing, 0); assert.equal(missing.usage, 0);
  }
  s.preparations.clear();
  assert.equal((await s.start({ ...preparedBody, paymentId: 'original-order' })).status, 503);
  assert.equal(s.billing, 0); assert.equal(s.docs.length, 0); assert.equal(s.refunds, 0);
});

test('CR-006 conflicting input/geography and different owners cannot reuse another preparation', async () => {
  const s = setup(); await s.prepare(preparedBody);
  for (const patch of [{ birthInfo: { ...birth, birthTime: '13:00' } }, { longitude: 140 }]) {
    for (const action of ['prepare', 'basis', 'start']) assert.equal((await s[action]({ ...preparedBody, ...patch })).status, 409);
  }
  s.userId = 'other'; assert.equal((await s.start(preparedBody)).status, 503);
  assert.equal((await s.prepare(preparedBody)).status, 200); assert.equal(s.preparations.size, 2);
  assert.equal(s.billing, 0); assert.equal(s.docs.length, 0);
});

test('CR-006 corrupted selection or lost metadata never regenerates/refunds; completed results remain readable', async () => {
  for (const damage of [
    s => s.preparations.clear(),
    s => { [...s.preparations.values()][0].chartSnapshot.yearlyLuck.year++; },
    s => { [...s.preparations.values()][0].authorityVersion = 'future-unknown'; },
    s => { delete s.docs[0].llmMeta.calculationPreparationId; },
    s => { delete s.docs[0].llmMeta.chartSnapshot; s.docs[0].status = 'generating'; },
  ]) {
    const s = setup(); await s.prepare(preparedBody); s.complete = false; await s.start(preparedBody);
    damage(s); const before = clone(s.docs), count = [s.billing, s.calculations, s.generations, s.usage, s.refunds];
    assert.ok([422, 503].includes((await s.resume()).status));
    assert.deepEqual(s.docs, before); assert.deepEqual([s.billing, s.calculations, s.generations, s.usage, s.refunds], count);
  }
  const done = setup(); await done.prepare(preparedBody); await done.start(preparedBody);
  done.preparations.clear(); done.fault = 'preparation-read'; const original = clone(done.docs);
  assert.equal((await done.resume()).status, 200); assert.deepEqual(done.docs, original);
  assert.equal(done.usage, 1); assert.equal(done.generations, 1);
});

test('CR-006 new default-OFF requests pin legacy and body flags cannot enable v2', async () => {
  const s = setup();
  await s.prepare({ ...preparedBody, calendarAuthorityV2: true, authorityFlags: { koreanCalendarAuthorityV2: true } });
  assert.equal([...s.preparations.values()][0].authorityVersion, 'legacy');
  s.on = true; s.year++;
  assert.equal((await s.start(preparedBody)).status, 200);
  assert.equal(s.docs[0].llmMeta.chartSnapshot.lunar.source, 'legacy'); assert.equal(s.calculations, 1);
  const place = setup({ on: true });
  assert.equal((await place.prepare({ ...preparedBody, birthInfo: { ...birth, longitude: 140 } })).status, 200);
  assert.equal(place.preparations.size, 1); assert.equal(place.calculations, 1);
  const legacy = setup(); legacy.fault = 'calculate';
  assert.equal((await legacy.basis({ birthInfo: birth })).status, 422);
});
