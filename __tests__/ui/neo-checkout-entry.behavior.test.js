const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('src/features/neo-war-room/NeoOperationRoomPage.tsx', 'utf8');
const handler = source.slice(source.indexOf('  async function handleSubmit('), source.indexOf('\n  function resetPendingFlow'));
function fixture({ status = 401, gateOk = true, errorCode = 'PAYMENT_CANCELLED', invalid = false } = {}) {
  const calls = [], states = {};
  const ctx = {
    Error, Boolean, Object, String, Number,
    busy: false, submitLockRef: { current: false }, pendingAccess: null,
    idempotencyKeyRef: { current: '' }, idempotencyFingerprintRef: { current: '' },
    validationInput: {}, dialogueLocale: 'ko', FEATURE_KEY: 'neo-operation-room-consultation', FEATURE_TITLE: '네오',
    NEO_WAR_ROOM_ACCESS_ENDPOINT: '/ensure-access', API_ENDPOINTS: { ensureAccess: '/ensure-access' },
    registryConsultPrice: { amountKRW: 20000, label: '20,000원' },
    paidGateCopy: new Proxy({}, { get: (_, key) => key }),
    captureOwner: () => () => true,
    validateNeoWarRoomInput: () => invalid ? ['missing'] : [],
    createNeoWarRoomInputFingerprint: () => 'fingerprint', resolveNeoWarRoomIdempotencyKey: () => 'same-request-12345',
    buildNeoWarRoomAccessPayload: (_, idempotencyKey) => ({ idempotencyKey }),
    beginPaidFeatureGateCheck: () => {}, completePaidFeatureGateCheck: () => {}, failPaidFeatureGateCheck: () => {},
    runAccessCheckWithTransientRetry: fn => fn(),
    postJson: async () => { calls.push('preflight'); return { response: { status }, data: { ok: false, reason: status === 401 ? 'LOGIN_REQUIRED' : 'DB_DEGRADED' } }; },
    isRetriableResultPollFailure: code => code === 503,
    runBillingCoinGate: async input => { calls.push({ gate: input }); return gateOk ? { ok: true, data: { paymentId: 'verified' } } : { ok: false, error: { code: errorCode } }; },
    buildResume: x => x, packPaidResumeArg: x => x,
    asRecord: x => x || {}, toText: x => String(x || ''),
    extractPaymentContext: result => result.data,
    startBriefing: async (id, payload, access) => calls.push({ start: id, payload, access }),
    getNeoErrorCopy: x => x,
  };
  for (const name of handler.match(/\bset[A-Z]\w+/g) || []) ctx[name] = value => { states[name] = value; };
  vm.runInNewContext(ts.transpileModule(`${handler}\nglobalThis.submit = handleSubmit;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  return { calls, states, ctx, run: () => ctx.submit({ preventDefault() {} }) };
}
test('first consultation enters shared checkout even when old access preflight would reject a guest', async () => {
  const f = fixture(); await f.run();
  assert.equal(f.calls.some(c => c === 'preflight'), false);
  assert.equal(f.calls[0]?.gate.featureKey, 'neo-operation-room-consultation');
  assert.equal(f.calls[1]?.start, 'same-request-12345');
});
test('an unavailable preflight cannot prevent checkout, and verified evidence reaches start', async () => {
  const f = fixture({ status: 503 }); await f.run();
  assert.equal(f.calls.length, 2); assert.equal(f.calls[1].access.paymentId, 'verified');
});
test('cancelled or denied checkout never starts generation', async () => {
  for (const errorCode of ['PAYMENT_CANCELLED', 'AUTH_REQUIRED', 'PAYMENT_VERIFY_FAILED']) {
    const f = fixture({ gateOk: false, errorCode }); await f.run();
    assert.equal(f.calls.filter(c => c.gate).length, 1); assert.equal(f.calls.some(c => c.start), false);
  }
});
test('invalid input and duplicate submit cannot enter checkout', async () => {
  const invalid = fixture({ invalid: true }); await invalid.run(); assert.equal(invalid.calls.length, 0);
  const f = fixture(); await Promise.all([f.run(), f.run()]); assert.equal(f.calls.filter(c => c.gate).length, 1);
});
test('retries keep the same payment request and mobile resume payload', async () => {
  const f = fixture({ gateOk: false }); await f.run(); await f.run();
  const inputs = f.calls.filter(c => c.gate).map(c => c.gate);
  assert.equal(inputs[0].idempotencyKey, inputs[1].idempotencyKey);
  assert.equal(inputs[0].resume.payload.idempotencyKey, inputs[0].idempotencyKey);
});
