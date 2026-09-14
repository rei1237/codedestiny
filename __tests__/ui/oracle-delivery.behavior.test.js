const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname, '../../app/_lib/oracle-delivery.ts'), 'utf8');
const exportsMock = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsMock, setTimeout });
const { continueOracleDelivery } = exportsMock;
const original = { requestId: 'original-paid-request', cards: [{ cardId: 'M00' }], transactionId: 'original-evidence' };
const pending = { ok: true, status: 'partial', saved: false, resultId: 'saved-result', sections: [{ key: 'first', body: 'saved part' }] };
const complete = { ...pending, status: 'completed', saved: true, consultation: { coreQuestion: 'complete' } };
function harness(responses, active = () => true) {
  const calls = [], progress = [], waits = [];
  const run = () => continueOracleDelivery({ body: original, active, pause: async ms => waits.push(ms), progress: data => progress.push(data),
    fetcher: async (_url, init) => { calls.push(JSON.parse(init.body)); const response = responses.shift(); if (response instanceof Error) throw response;
      return new Response(JSON.stringify(response[1]), { status: response[0] }); } });
  return { run, calls, progress, waits };
}
test('202 partial remains visible and automatically continues original saved result', async () => {
  const h = harness([[202, pending], [200, complete]]);
  assert.equal((await h.run()).saved, true); assert.deepEqual(h.calls, [original, { resumeResultId: 'saved-result' }]);
  assert.equal(h.progress[0].saved, false); assert.deepEqual(h.waits, [1000]);
});
test('lost first response retries identical evidence without payment callback', async () => {
  const h = harness([Error('lost'), [200, complete]]); await h.run(); assert.deepEqual(h.calls, [original, original]);
});
test('storage failure retains result identity and retries saving', async () => {
  const h = harness([[503, { ok: false, reason: 'RESULT_STORAGE_UNAVAILABLE', resultId: 'saved-result', retryable: true }], [200, complete]]);
  await h.run(); assert.deepEqual(h.calls[1], { resumeResultId: 'saved-result' });
});
test('three lost responses preserve resumability instead of retrying forever', async () => {
  const h = harness([Error('lost'), Error('lost'), Error('lost')]); assert.equal((await h.run()).retryable, true); assert.equal(h.calls.length, 3);
});
test('generation limit stops, while a concurrent lease waits five seconds', async () => {
  const h = harness([[202, { ...pending, busy: true }], [202, { ...pending, retryable: false }]]);
  assert.equal((await h.run()).retryable, false); assert.deepEqual(h.waits, [5000]);
});
test('account changes discard a late result and stop continuation', async () => {
  let sameOwner = true;
  const h = harness([[202, pending]], () => { const current = sameOwner; sameOwner = false; return current; });
  assert.equal(await h.run(), null); assert.equal(h.progress.length, 0); assert.equal(h.calls.length, 1);
});
test('HTTP 200 without final saved confirmation is not accepted as completed', async () => {
  const h = harness([[200, { ...complete, saved: false }]]); assert.equal((await h.run()).saved, false);
});
