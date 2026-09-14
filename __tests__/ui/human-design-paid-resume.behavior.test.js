const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('app/human-design/report/_lib/useReportGeneration.ts', 'utf8');
const ast = ts.createSourceFile('hook.ts', source, ts.ScriptTarget.Latest, true);
function callback(name, context) {
  let found;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) found = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(found, name);
  vm.runInContext(ts.transpileModule('var run = ' + found.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return (...args) => context.run(...args);
}
function fixture() {
  let owner = true;
  const calls = [], shown = [], phases = [];
  const context = vm.createContext({ Date, String, Set, encodeURIComponent,
    captureOwner: () => () => owner, setPhase: value => phases.push(value), setError() {},
    startedAtRef: { current: 0 }, completedRef: { current: false },
    MAX_WAVES: 24, MAX_NO_PROGRESS: 3, LOCK_WAIT_BUDGET_MS: 90000,
    WAVE_REQUEST_TIMEOUT_MS: 105000, WAVE_REQUEST_BUDGET_MS: 110000, WAVE_REQUEST_MAX_ATTEMPTS: 2,
    document: { hidden: false }, navigator: { onLine: true }, uiLocale: 'ko', say: key => key,
    REFUNDED_REASONS: new Set(['REPORT_UNDELIVERABLE']), releaseAfterRefund: () => { throw Error('unexpected refund reset'); },
    applyDoc: value => shown.push(value), fail: value => { throw Error(value); },
    postPaidBody: async (_path, body) => { calls.push(body); return { status: 200, data: { ok: true, status: 'completed', progress: { completed: 18 } } }; },
  });
  return { context, calls, shown, phases, changeOwner: () => { owner = false; } };
}
test('delivery pending continues the same report until verified completion', async () => {
  const f = fixture(); let count = 0;
  f.context.postPaidBody = async (_path, body) => { f.calls.push(body); return { status: ++count === 1 ? 202 : 200, data: { ok: true, status: count === 1 ? 'delivery_pending' : 'completed', progress: { completed: 18 } } }; };
  await callback('runWaves', f.context)('owned');
  assert.deepEqual(f.calls.map(row => row.reportId), ['owned', 'owned']);
  assert.equal(f.phases.at(-1), 'reading');
});
test('storage failure and unconfirmed refund retain paid recovery state', async () => {
  for (const reason of ['RESULT_STORAGE_UNAVAILABLE', 'REPORT_UNDELIVERABLE']) {
    const f = fixture();
    f.context.postPaidBody = async () => ({ status: 503, data: { ok: false, reason, refunded: false }, transient: true });
    await assert.rejects(callback('runWaves', f.context)('owned'), /networkError/);
    assert.ok(!f.phases.includes('reading'));
  }
});
test('hidden or offline screens start no new wave', async () => {
  for (const hidden of [true, false]) {
    const f = fixture(); f.context.document.hidden = hidden; f.context.navigator.onLine = hidden;
    await callback('runWaves', f.context)('owned'); assert.equal(f.calls.length, 0);
  }
});
test('account switch discards a late completed response', async () => {
  const f = fixture(); f.context.postPaidBody = async () => { f.changeOwner(); return { status: 200, data: { ok: true, status: 'completed' } }; };
  await callback('runWaves', f.context)('owned'); assert.equal(f.shown.length, 0); assert.ok(!f.phases.includes('reading'));
});
test('server discovery recovers a pending report without local birth data or a payment gate', async () => {
  const f = fixture(); const urls = [], resumed = [];
  Object.assign(f.context, { inputHash: '', locale: 'ko', load: null,
    runWaves: async id => resumed.push(id),
    authFetch: async url => { urls.push(url); return { status: 202, json: async () => urls.length === 1 ? { ok: true, reports: [{ id: 'owned', status: 'delivery_pending' }] } : { ok: true, reportId: 'owned', status: 'delivery_pending' } }; },
  });
  f.context.load = callback('load', f.context);
  await f.context.load(''); assert.deepEqual(resumed, ['owned']); assert.equal(urls.length, 2);
});

