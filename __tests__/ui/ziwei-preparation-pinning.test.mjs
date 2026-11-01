import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const pins = JSON.parse(fs.readFileSync('tools/oracle/expansion/service-source-pins.json'));
for (const [file, digest] of Object.entries(pins.domains.ziwei)) {
  assert.equal(createHash('sha256').update(fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex'), digest, file);
}
const { resolveZiweiPreparation: resolve, ZIWEI_PREPARATION_PROTOCOL: protocol } = await import('../../worker/lib/ziwei-calculation-preparation.js');
const input = { birthInfo: { birthDate: '2023-02-04', birthTime: '11:42', calendarType: 'solar', gender: 'male' } };
const base = { userId: 'mock-owner', requestId: 'mock-preparation-1', inputHash: 'mock-input-hash', input, rawBody: { calculationProtocol: protocol }, year: 2026, action: 'prepare' };
const clone = value => structuredClone(value);
function ledger() {
  const rows = new Map();
  const model = {
    findById: id => ({ lean: async () => clone(rows.get(id) || null) }),
    create: async row => {
      if (rows.has(row._id)) throw Object.assign(new Error('duplicate'), { code: 11000 });
      rows.set(row._id, clone(row));
    },
  };
  return { rows, model };
}
function find(text, predicate) {
  const ast = ts.createSourceFile('source.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let result;
  function visit(node) { if (predicate(node)) result = node; else ts.forEachChild(node, visit); }
  visit(ast); assert.ok(result); return result.getText(ast);
}
const fn = (text, name) => find(text, n => ts.isFunctionDeclaration(n) && n.name?.text === name);
const transpile = text => ts.transpileModule(text.replace(/^export /, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;

test('real approved calculator: competing isolates pin one version/year, OFF return and restart preserve every chart field', async () => {
  const { rows, model } = ledger();
  const [first, second] = await Promise.all([
    resolve({ ...base, model, calendarAuthorityV2: true }),
    resolve({ ...base, model: { ...model }, calendarAuthorityV2: false, year: 2027 }),
  ]);
  assert.deepEqual(first, second); assert.equal(rows.size, 1);
  assert.equal(first.chart.lunar.source, 'kasi-jpl-expanded-20261101');
  for (const action of ['basis', 'generate', 'prepare']) {
    const loaded = await resolve({ ...base, model: { ...model }, action, year: 2099, calendarAuthorityV2: false });
    assert.deepEqual(loaded, first);
  }
  const existing = { status: 'partial', llmMeta: { chartSnapshot: clone(first.chart), calculationPreparationId: first.preparationId, resumeBody: base.rawBody } };
  const original = JSON.stringify(existing);
  const resumed = await resolve({ ...base, model, action: 'generate', existing, year: 2027 });
  resumed.chart.palaces[0].mainStars.push('mock mutation');
  assert.equal(JSON.stringify(existing), original);
  assert.deepEqual(rows.get(first.preparationId).chartSnapshot, first.chart);
});

test('real calculator raw geography guard and invalid lunar inputs fail before persistence; legacy stays OFF', async () => {
  for (const rawBody of [{ ...base.rawBody, longitude: 140 }, { ...base.rawBody, birthInfo: { timezone: 'Asia/Tokyo' } }]) {
    const { rows, model } = ledger();
    await assert.rejects(resolve({ ...base, model, rawBody, calendarAuthorityV2: true }), /PREPARATION_INVALID/);
    assert.equal(rows.size, 0);
  }
  const { model, rows } = ledger();
  await assert.rejects(resolve({ ...base, model, input: { birthInfo: { ...input.birthInfo, birthDate: '2023-01-30', calendarType: 'lunar', isLeapMonth: true } }, calendarAuthorityV2: true }), /PREPARATION_INVALID/);
  assert.equal(rows.size, 0);
  const off = await resolve({ ...base, model, rawBody: { ...base.rawBody, calendarAuthorityV2: true } });
  assert.equal(rows.get(off.preparationId).authorityVersion, 'legacy');
});

test('new schema is additive, no TTL/index job, and round-trips the complete real snapshot offline', async () => {
  const file = 'worker/lib/models.js', text = fs.readFileSync(file, 'utf8');
  const statement = find(text, n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText() === 'ziweiCalculationPreparationSchema'));
  const context = vm.createContext({ mongoose });
  const schema = vm.runInContext(`${statement}\nziweiCalculationPreparationSchema`, context);
  assert.equal(schema.path('_id').instance, 'String');
  assert.equal(schema.options.collection, 'ziweiCalculationPreparations');
  assert.equal(schema.options.minimize, false);
  assert.deepEqual(schema.indexes(), []);
  const { model, rows } = ledger(); const selection = await resolve({ ...base, model, calendarAuthorityV2: true });
  const Model = mongoose.model('CR006OfflinePreparation', schema);
  try {
    const doc = new Model(rows.get(selection.preparationId));
    assert.equal(doc.validateSync(), undefined);
    rows.set(selection.preparationId, doc.toObject());
    assert.deepEqual(await resolve({ ...base, model, action: 'generate' }), selection);
    for (const field of ['userId', 'requestId', 'inputHash', 'bindingHash', 'targetYear', 'authorityVersion', 'chartSnapshot', 'selectionDigest']) assert.equal(schema.path(field).options.immutable, true);
  } finally { mongoose.deleteModel('CR006OfflinePreparation'); }
  const consultationStatement = find(text, n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText() === 'ziweiAiConsultationSchema'));
  // Real unchanged consultation schema; unrelated nested result/message schemas are unused.
  const consultationSchema = vm.runInNewContext(`${consultationStatement}\nziweiAiConsultationSchema`, {
    mongoose, ziweiAiChartSchema: new mongoose.Schema({}), ziweiAiMessageSchema: new mongoose.Schema({}),
  });
  const Consultation = mongoose.model('CR006OfflineConsultation', consultationSchema);
  try {
    const doc = new Consultation({ llmMeta: { chartSnapshot: clone(selection.chart), calculationPreparationId: selection.preparationId, resumeBody: base.rawBody } }).toObject();
    assert.notDeepEqual(doc.llmMeta.chartSnapshot, selection.chart, 'existing schema really omits empty objects');
    assert.deepEqual(await resolve({ ...base, model, existing: doc, action: 'generate' }), selection);
    doc.llmMeta.chartSnapshot.palaces[0].mainStars.push('changed factual value');
    await assert.rejects(resolve({ ...base, model, existing: doc, action: 'generate' }), /PREPARATION_UNAVAILABLE/);
  } finally { mongoose.deleteModel('CR006OfflineConsultation'); }
  const baseline = execFileSync('git', ['show', 'b69790198a9c94988a2f7c0c93604ef603bdc376:' + file], { encoding: 'utf8', maxBuffer: 2e6 });
  const addition = /\/\/ CR-006: insert-only preparation\.[\s\S]*?mongoose\.model\("ZiweiCalculationPreparation", ziweiCalculationPreparationSchema\)\);\r?\n/;
  assert.ok(addition.test(text));
  assert.equal(text.replace(addition, '').replaceAll('\r\n', '\n'), baseline.replaceAll('\r\n', '\n'));
});

const client = fs.readFileSync('app/ziwei-ai/ZiweiAiClient.tsx', 'utf8');
const resume = fs.readFileSync('app/hooks/usePaidResume.ts', 'utf8');
function clientSetup(response) {
  const calls = [], state = { calls, errors: [], descriptor: null };
  const context = vm.createContext({
    Error, TypeError, consultation: null, busyRef: { current: false }, idempotencyRef: { current: 'mock-preparation-1' },
    FEATURE_KEY: 'ziwei-ai-consultation', FOCUS_TOPIC: { overall: 'overall' },
    form: { ...input.birthInfo, focusArea: 'overall', name: '', question: '', birthTimeUnknown: false },
    ERROR_TEXT: { SERVER_ERROR: 'server', NETWORK_ERROR: 'network', TEMPORARY_UNAVAILABLE: 'temporary', PAYMENT_VERIFY_FAILED: 'payment-verify' },
    setError: value => state.errors.push(value), setNotice() {}, setPhase() {}, setBasis() {},
    readDevPreviewState: () => null, beginPaidFeatureGateCheck() {}, holdPaidFeatureGateOpen() {},
    completePaidFeatureGateCheck() {}, failPaidFeatureGateCheck() {},
    buildBillingGateInput: () => ({}), primePaymentEligibility: async () => {},
    postJson: async (_url, payload) => { calls.push(['prepare', clone(payload)]); return response; },
    runAccessCheckWithTransientRetry: fn => fn(),
    fetchAnalysisBasis: async (_url, payload) => { calls.push(['basis', clone(payload)]); return null; },
    runBillingCoinGate: async options => { calls.push(['payment']); state.descriptor = options.resume; return { ok: true }; },
    buildResume: args => ({ args }), isPaymentGranted: () => true, extractPayment: () => ({ paymentId: 'original-order' }),
    isRetriableResultPollFailure: status => status === 503,
    generateConsultation: async (id, payload, payment) => { calls.push(['generate', id, clone(payload), clone(payment)]); return true; },
  });
  for (const name of ['packPaidResumeArg', 'unpackPaidResumeArg']) vm.runInContext(transpile(fn(resume, name)), context);
  for (const name of ['asRecord', 'buildConsultationPayload', 'validateForm', 'mapError', 'handleSubmit']) vm.runInContext(transpile(fn(client, name)), context);
  state.submit = () => context.handleSubmit({ preventDefault() {} });
  state.restore = async () => {
    const callback = find(client, n => ts.isCallExpression(n) && n.expression.getText() === 'usePaidResume');
    // Evaluate the real resume callback without mounting React or importing payment code.
    const ast = ts.createSourceFile('call.ts', callback, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const arrow = ast.statements[0].expression.arguments[1].getText(ast);
    const runner = vm.runInContext(transpile(`const run = ${arrow};\nrun;`), context);
    return runner(state.descriptor.args, { payload: { paymentId: 'original-order' } });
  };
  return state;
}

test('actual client never opens payment or generation before confirmed prepare, including degraded/old-worker responses', async () => {
  for (const response of [
    { status: 503, data: { reason: 'CALCULATION_PREPARATION_UNAVAILABLE' } },
    { status: 402, data: { reason: 'PAYMENT_REQUIRED' } },
    { status: 200, data: { ok: true } },
    { status: 409, data: { reason: 'CALCULATION_PREPARATION_CONFLICT' } },
  ]) {
    const s = clientSetup(response); await s.submit();
    assert.deepEqual(s.calls.map(c => c[0]), ['prepare']); assert.ok(s.errors.at(-1));
  }
});

test('actual client basis follows prepare; paid-resume serialization preserves protocol, key and input without another payment', async () => {
  const s = clientSetup({ status: 402, data: { calculationReady: true, reason: 'PAYMENT_REQUIRED', paymentPayload: {} } });
  await s.submit();
  assert.deepEqual(s.calls.map(c => c[0]), ['prepare', 'basis', 'payment', 'generate']);
  const original = JSON.parse(JSON.stringify(s.calls[3]));
  assert.equal(original[2].calculationProtocol, protocol);
  await s.restore();
  assert.deepEqual(s.calls.at(-1), original);
  assert.equal(s.calls.filter(c => c[0] === 'payment').length, 1);
  const pass = clientSetup({ status: 200, data: { calculationReady: true, ok: true, accessToken: 'same-token', accessType: 'pass' } });
  await pass.submit(); assert.deepEqual(pass.calls.map(c => c[0]), ['prepare', 'basis', 'generate']);
});
