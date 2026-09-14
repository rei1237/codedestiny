const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('app/astrology-ai/AstrologyAiClient.tsx', 'utf8');
const ast = ts.createSourceFile('client.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let fn;
function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'pollAstrologyResult') fn = node; ts.forEachChild(node, visit); }
visit(ast);
function fixture() {
  const calls = []; let current = true; let waves = 0;
  const ctx = vm.createContext({
    RESULT_POLL_MAX_ATTEMPTS: 12, RESULT_POLL_BACKOFF_MS: [0], sleep: async () => {},
    API_ENDPOINTS: { start: '/api/astrology-ai/start' }, document: { visibilityState: 'visible' },
    authFetch: async (url, init) => {
      calls.push({ url, init });
      if (init.method === 'GET') return { status: 202 };
      waves++;
      return { status: waves < 3 ? 202 : 200, ok: true, json: async () => ({ ok: true, status: waves < 3 ? 'partial' : 'completed', sessionId: 'original-session' }) };
    },
  });
  vm.runInContext(ts.transpileModule(fn.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  return { ctx, calls, scope: { isCurrent: () => current }, changeOwner: () => { current = false; } };
}
test('점성술 실제 재개 함수는 결제 게이트 없이 같은 서버 결과 ID로 완료한다', async () => {
  const f = fixture(); const result = await f.ctx.pollAstrologyResult('original-session', f.scope);
  assert.equal(result.status, 'completed');
  const posts = f.calls.filter(row => row.init.method === 'POST'); assert.equal(posts.length, 3);
  posts.forEach(row => assert.deepEqual(JSON.parse(row.init.body), { resumeSessionId: 'original-session' }));
});
test('모바일 숨김에서는 새 묶음을 시작하거나 완료로 표시하지 않는다', async () => {
  const f = fixture(); f.ctx.document.visibilityState = 'hidden';
  assert.equal(await f.ctx.pollAstrologyResult('original-session', f.scope), null);
  assert.equal(f.calls.filter(row => row.init.method === 'POST').length, 0);
});
test('계정 변경 뒤의 생성 응답은 버린다', async () => {
  const f = fixture(); f.ctx.authFetch = async () => { f.changeOwner(); return { status: 200, json: async () => ({ sessionId: 'old' }) }; };
  assert.equal(await f.ctx.pollAstrologyResult('original-session', f.scope), null);
});
test('저장 장애 뒤에도 같은 결과 ID로 재개한다', async () => {
  const f = fixture(); let count = 0;
  f.ctx.authFetch = async (url, init) => {
    if (init.method === 'GET') return { status: 202 };
    assert.equal(JSON.parse(init.body).resumeSessionId, 'original-session'); count++;
    return { status: count === 1 ? 503 : 200, ok: count > 1, json: async () => count === 1 ? ({ ok: false, retryable: true, reason: 'RESULT_STORAGE_UNAVAILABLE' }) : ({ ok: true, status: 'completed' }) };
  };
  assert.equal((await f.ctx.pollAstrologyResult('original-session', f.scope)).status, 'completed'); assert.equal(count, 2);
});
