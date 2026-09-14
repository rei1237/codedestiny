const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('app/vedic-ai/VedicAiClient.tsx', 'utf8');
const ast = ts.createSourceFile('client.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let fn;
function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'pollVedicResult') fn = node; ts.forEachChild(node, visit); }
visit(ast);
function fixture() {
  const posts = [], partials = []; let current = true, wave = 0;
  const ctx = vm.createContext({ exports: {}, RESULT_POLL_MAX_ATTEMPTS: 12, RESULT_POLL_BACKOFF_MS: [0], sleep: async () => {}, toText: value => String(value || ''), document: { visibilityState: 'visible' },
    authFetch: async (url, init) => {
      if (init.method === 'GET') return { status: 202, json: async () => ({ consultation: { id: 'saved', status: 'partial' } }) };
      posts.push(JSON.parse(init.body)); wave++;
      return { status: wave < 4 ? 202 : 200, ok: true, json: async () => ({ ok: true, consultation: { id: 'saved', status: wave < 4 ? 'partial' : 'completed' } }) };
    },
  });
  vm.runInContext(ts.transpileModule(fn.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, ctx);
  return { ctx, posts, partials, isCurrent: () => current, changeOwner: () => { current = false; }, onPartial: value => partials.push(value.status) };
}
test('베다 실제 화면 재개 함수는 정상 묶음을 표시하며 같은 결과를 완성한다', async () => {
  const f = fixture(); const result = await f.ctx.pollVedicResult('saved', f.isCurrent, f.onPartial);
  assert.equal(result.consultation.status, 'completed'); assert.equal(f.posts.length, 4);
  f.posts.forEach(row => assert.deepEqual(row, { resumeSessionId: 'saved' })); assert.equal(f.partials.at(-1), 'completed');
});
test('숨김 상태에서는 부분 본문을 유지하고 다음 묶음을 시작하지 않는다', async () => {
  const f = fixture(); f.ctx.document.visibilityState = 'hidden';
  const result = await f.ctx.pollVedicResult('saved', f.isCurrent, f.onPartial);
  assert.equal(result.reason, 'GENERATION_PAUSED'); assert.equal(f.posts.length, 0); assert.deepEqual(f.partials, ['partial']);
});
test('계정 변경 뒤 도착한 응답을 표시하지 않는다', async () => {
  const f = fixture(); f.ctx.authFetch = async () => { f.changeOwner(); return { status: 202, json: async () => ({}) }; };
  const result = await f.ctx.pollVedicResult('saved', f.isCurrent, f.onPartial);
  assert.equal(result.ok, false); assert.equal(f.partials.length, 0);
});
test('저장 및 조회 장애는 원래 서버 ID로 다시 요청한다', async () => {
  const f = fixture(); let calls = 0;
  f.ctx.authFetch = async (url, init) => {
    calls++;
    if (calls === 1) return { status: 503, ok: false, json: async () => ({ retryable: true }) };
    if (init.method === 'GET') return { status: 202, json: async () => ({ consultation: { id: 'saved', status: 'partial' } }) };
    assert.equal(JSON.parse(init.body).resumeSessionId, 'saved');
    return { status: calls === 3 ? 503 : 200, ok: calls !== 3, json: async () => calls === 3 ? ({ ok: false, retryable: true }) : ({ ok: true, consultation: { status: 'completed' } }) };
  };
  assert.equal((await f.ctx.pollVedicResult('saved', f.isCurrent, f.onPartial)).consultation.status, 'completed'); assert.equal(calls, 5);
});
