const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const source = fs.readFileSync('app/palm-reading/paid-result-recovery.ts', 'utf8');
function fixture(status, body) {
  const calls = [], exports = {};
  const context = vm.createContext({ exports, AbortSignal, fetch: async (url, options) => { calls.push({ url, options }); return { status, ok: status < 300, json: async () => body }; } });
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return { read: exports.readPaidPalmResult, calls };
}
test('paid return reads original request with authentication and no generation POST', async () => {
  const f = fixture(200, { saved: true, analysisSaved: true, interpretation: { consultText: '끝 문장.' } });
  assert.equal((await f.read('original:id', 'token')).interpretation.consultText, '끝 문장.');
  assert.equal(f.calls[0].url, '/api/palm/result?requestId=original%3Aid'); assert.equal(f.calls[0].options.headers.Authorization, 'Bearer token');
  assert.equal(f.calls[0].options.method, undefined);
});
for (const status of [401, 403, 404]) test('unavailable ownership/payment ' + status + ' cannot display a local substitute', async () => { assert.equal(await fixture(status, {}).read('id', ''), null); });
for (const status of [200, 202, 503]) test('unconfirmed response ' + status + ' stays retryable', async () => { await assert.rejects(fixture(status, {}).read('id', ''), /RESULT_STORAGE_UNAVAILABLE/); });
