const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const source = fs.readFileSync('src/features/neo-war-room/paid-delivery.ts', 'utf8');
function fixture() {
  const calls = [], progress = []; let current = true;
  const ctx = { exports: {}, document: { visibilityState: 'visible' }, navigator: { onLine: true }, window: { setTimeout: callback => callback() }, require: () => ({ authFetch: async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: init?.method ? 200 : 202, json: async () => ({ ok: true, sessionId: 'original-server-id', status: init?.method ? 'completed' : 'partial' }) };
  } }) };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  return { ctx, calls, progress, changeOwner: () => { current = false; }, run: () => ctx.exports.receiveNeoBriefing('original-server-id', data => progress.push(data), () => current) };
}
test('actual delivery loop reads saved partial and continues with the original server ID', async () => { const f = fixture(); assert.equal((await f.run()).status, 'completed'); assert.equal(f.progress[0].status, 'partial'); assert.equal(JSON.parse(f.calls[1].init.body).sessionId, 'original-server-id'); assert.equal(f.calls.length, 2); });
test('hidden or offline clients do not begin new generation', async () => { for (const hidden of [true, false]) { const f = fixture(); if (hidden) f.ctx.document.visibilityState = 'hidden'; else f.ctx.navigator.onLine = false; await assert.rejects(f.run, /GENERATION_PENDING/); assert.equal(f.calls.length, 0); } });
test('a changed account cannot receive or resume another result', async () => { const f = fixture(); f.changeOwner(); await assert.rejects(f.run, /ACCOUNT_CHANGED/); assert.equal(f.calls.length, 0); });
test('storage failures preserve partial delivery with bounded retries', async () => {
  const f = fixture(); let posts = 0;
  f.ctx.require = () => ({ authFetch: async (_url, init) => { if (init?.method) { posts++; return { ok: false, status: 503, json: async () => ({ ok: false, retryable: true, reason: 'RESULT_STORAGE_UNAVAILABLE' }) }; } return { ok: true, status: 202, json: async () => ({ ok: true, status: 'partial', sessionId: 'original-server-id' }) }; } });
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { ...f.ctx });
  await assert.rejects(f.run, /GENERATION_PENDING/); assert.equal(posts, 6); assert.equal(f.progress.length, 6);
});
