const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function fixture() {
  const timers = new Map(); let now = 0, id = 0, resolveFetch;
  const ctx = vm.createContext({ Request, URL, AbortController, AUTH_FETCH_TIMEOUT_MS: 22000,
    setTimeout: (fn, delay) => { timers.set(++id, { fn, at: now + delay }); return id; }, clearTimeout: key => timers.delete(key),
    fetch: async (_request, init = {}) => new Promise((resolve, reject) => { resolveFetch = resolve; init.signal?.addEventListener('abort', () => reject(new Error('TIMEOUT')), { once: true }); }),
  });
  const file = 'app/_lib/auth-client.ts'; const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  for (const name of ['authRequestTimeoutMs', 'fetchAuthRequest']) {
    const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name); assert.ok(fn);
    vm.runInContext(ts.transpileModule(fn.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  }
  return { ctx, advance(ms) { now += ms; for (const [key, timer] of timers) if (timer.at <= now) { timers.delete(key); timer.fn(); } }, resolve: () => resolveFetch({ status: 200 }), timers };
}
const families = ['life-book-ai', 'love-secret-ai', 'new-year-ai', 'karma-destiny-ai', 'astrology-ai', 'vedic-ai', 'ziwei-ai', 'ziwei-island-ai', 'ziwei-deep-report', 'sukuyo-compatibility-ai', 'nakshatra-ai', 'neo-operation-room', 'master-love-codex', 'fusion-fortune'];
for (const family of families) test(`${family}: 생성 중 22초를 넘겨도 끊지 않는다`, async () => {
  const f = fixture(); const pending = f.ctx.fetchAuthRequest(new Request(`https://mock.test/api/${family}/generate`, { method: 'POST' }), false);
  f.advance(60000); f.resolve(); assert.equal((await pending).status, 200); assert.equal(f.timers.size, 0);
});
test('실제 사주·찻집·반려·나침반·타로 생성 경로도 서버 응답을 기다린다', () => {
  const f = fixture();
  for (const path of ['fortune/saju/ai-prompt', 'fortune/saju-ai-consultation/create', 'fortune/vedic/prashna/generate', 'fortune-tea-house/consult', 'fortune-tea-house/results/honey-letter', 'fortune-tea-house/results/result-1/honey-letter', 'pet-saju-ai/report', 'pet-saju-ai/compat', 'destiny-compass-ai/report/continue', 'tarot/oracle-consultation']) assert.equal(f.ctx.authRequestTimeoutMs(new Request(`https://mock.test/api/${path}`, { method: 'POST' })), 95000);
});
test('일반 조회·결제·인증 요청에는 기존 22초 제한을 유지한다', async () => {
  const f = fixture();
  for (const path of ['auth/login', 'payments/confirm', 'billing/coin-gate/deferred/apply', 'new-year-ai/ensure-access', 'unknown/start']) assert.equal(f.ctx.authRequestTimeoutMs(new Request(`https://mock.test/api/${path}`, { method: 'POST' })), 22000);
  const request = new Request('https://mock.test/api/new-year-ai/result'); const pending = f.ctx.fetchAuthRequest(request, false);
  const rejected = assert.rejects(pending, /TIMEOUT/); f.advance(22000); await rejected;
});
test('LLM 요청도 95초 상한과 호출자 취소 제어를 유지한다', async () => {
  const f = fixture(); const request = new Request('https://mock.test/api/new-year-ai/start', { method: 'POST' });
  const pending = f.ctx.fetchAuthRequest(request, false); const rejected = assert.rejects(pending, /TIMEOUT/); f.advance(95000); await rejected;
  const caller = f.ctx.fetchAuthRequest(request, true); assert.equal(f.timers.size, 0); f.resolve(); await caller;
});
