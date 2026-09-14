const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const get = (value, key) => key.split('.').reduce((at, part) => at?.[part], value);
function set(value, key, data) {
  const parts = key.split('.'); const last = parts.pop();
  for (const part of parts) value = value[part] ||= {};
  value[last] = clone(data);
}
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(row => matches(doc, row));
    if (key === '$and') return value.every(row => matches(doc, row));
    const actual = get(doc, key);
    if (value && typeof value === 'object' && '$in' in value) return value.$in.includes(actual);
    if (value && typeof value === 'object' && '$lt' in value) return actual < value.$lt;
    if (value && typeof value === 'object' && '$exists' in value) return (actual !== undefined) === value.$exists;
    if (value === null) return actual == null;
    return String(actual) === String(value);
  });
}
function load(ctx, file, names) {
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  for (const name of names) {
    const fn = ast.statements.find(row => ts.isFunctionDeclaration(row) && row.name?.text === name);
    assert.ok(fn, name); vm.runInContext(fn.getText(ast).replace(/^export /, ''), ctx);
  }
}


function clientFixture() {
  const file = 'app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx';
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let fn; function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'startConsultation') fn = node; ts.forEachChild(node, visit); } visit(ast); assert.ok(fn);
  const requests = [], states = [], pendingGenerationRef = { current: null }; let current = true;
  const ctx = vm.createContext({ document: { hidden: false }, captureDeliveryScope: () => () => current, payload: {}, pendingGenerationRef,
    setPhase() {}, setNotice() {}, setError() {}, submitKeyRef: { current: 'paid-key' }, setConsultation: data => states.push(data.status), rememberConsultationUrl() {}, sleep: async () => {},
    postJson: async (_path, body, key) => { requests.push({ body, key }); const done = requests.length === 5; return { status: done ? 200 : 202, data: { ok: true, status: done ? 'completed' : 'partial', sessionId: '64b7f2a1c3d4e5f600000001', consultation: { id: '64b7f2a1c3d4e5f600000001', status: done ? 'completed' : 'partial' } } }; },
  });
  vm.runInContext(ts.transpileModule(fn.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  return { ctx, requests, states, pendingGenerationRef, changeOwner: () => { current = false; } };
}
test('실제 숙요 화면은 부분 본문을 보이며 동일 결과 ID로 이어받는다', async () => {
  const f = clientFixture(); assert.equal(await f.ctx.startConsultation('paid-key', { receipt: 'original' }, true), true);
  assert.deepEqual(f.states, ['partial', 'partial', 'partial', 'partial', 'completed']); assert.equal(f.pendingGenerationRef.current, null);
  assert.equal(f.requests[0].body.receipt, 'original'); f.requests.slice(1).forEach(row => { assert.equal(row.body.resumeSessionId, '64b7f2a1c3d4e5f600000001'); assert.equal(row.key, 'paid-key'); });
});
test('모바일 백그라운드에서는 완료로 표시하거나 재개 정보를 지우지 않는다', async () => {
  const f = clientFixture(); f.ctx.document.hidden = true;
  assert.equal(await f.ctx.startConsultation('paid-key', { receipt: 'original' }, true), false); assert.equal(f.requests.length, 0); assert.equal(f.pendingGenerationRef.current.key, 'paid-key');
});
test('계정 전환 뒤 도착한 생성 응답은 표시하지 않는다', async () => {
  const f = clientFixture(); f.ctx.postJson = async () => { f.changeOwner(); return { status: 200, data: { ok: true, consultation: { id: 'old', status: 'completed' } } }; };
  assert.equal(await f.ctx.startConsultation('paid-key', {}, true), false); assert.equal(f.states.length, 0);
});
test('저장 장애 뒤 원래 요청을 보존하고 결제 게이트 없이 다시 요청한다', async () => {
  const f = clientFixture(); let calls = 0;
  f.ctx.postJson = async (_path, body, key) => { calls++; assert.equal(key, 'paid-key'); return { status: 503, data: { ok: false, reason: 'RESULT_STORAGE_UNAVAILABLE', resultId: '64b7f2a1c3d4e5f600000001' } }; };
  await assert.rejects(f.ctx.startConsultation('paid-key', { receipt: 'original' }, true), /RESULT_STORAGE_UNAVAILABLE/);
  assert.equal(calls, 3); assert.equal(f.pendingGenerationRef.current.sessionId, '64b7f2a1c3d4e5f600000001');
});
