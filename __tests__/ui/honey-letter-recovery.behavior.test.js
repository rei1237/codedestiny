const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const file = 'src/features/fortune-tea-house/components/TeaHouseResultSheet.tsx';
const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate) {
  let found;
  function visit(node) { if (predicate(node)) found = node; ts.forEachChild(node, visit); }
  visit(ast); assert.ok(found); return found;
}
const requestNode = find(n => ts.isVariableDeclaration(n) && n.name.getText(ast) === 'requestHoneyLetter');
const canRequest = find(n => ts.isVariableDeclaration(n) && n.name.getText(ast) === 'canRequestHoneyLetter');
const recoveryEffect = find(n => ts.isCallExpression(n) && n.expression.getText(ast) === 'useEffect' && n.arguments[0].getText(ast).includes('honeyResumeRef.current'));
function harness(fetcher) {
  const posts = [];
  const state = {
    result: { resultId: 'original-result', honeyLetterPending: true }, honeyOwner: 'owner',
    honeyScopeRef: { current: { owner: 'owner', resultId: 'original-result' } },
    honeyRequestRef: { current: false }, honeyMountedRef: { current: true },
    owner: 'owner', copy: new Proxy({}, { get: (_, key) => key }),
    useCallback: fn => fn, getAuthState: () => ({ user: { id: state.owner } }),
    setHoneyLetterLoading(value) { state.loading = value; },
    setHoneyLetterMessage(value) { state.message = value; },
    onResultUpdate(value) { state.updated = value; }, onHoneyDropsChange(value) { state.wallet = value; },
    authFetch: async (url, init) => { posts.push({ url, body: JSON.parse(init.body) }); return fetcher(); },
  };
  const ctx = vm.createContext(state);
  vm.runInContext(ts.transpileModule(`const ${requestNode.getText(ast)}; globalThis.send = requestHoneyLetter;`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  return { state, posts, send: state.send };
}
const reply = (status, body) => ({ ok: status === 200, json: async () => body });
test('lost response keeps the same result pending; retry delivers without another gate', async () => {
  let attempt = 0;
  const h = harness(() => {
    if (!attempt++) throw new Error('OFFLINE');
    return reply(200, { success: true, honeyLetter: { body: 'saved ending' }, honeyDrops: { balance: 0 } });
  });
  await h.send();
  assert.equal(h.state.updated.honeyLetterPending, true);
  await h.send();
  assert.equal(h.state.updated.honeyLetter.body, 'saved ending');
  assert.equal(h.state.updated.honeyLetterPending, false);
  assert.deepEqual(h.posts[0], h.posts[1]);
  assert.equal(h.posts[0].body.idempotencyKey, 'yeoni-honey-letter:original-result');
});
test('503 is pending, confirmed save failure ends automatic retries', async () => {
  for (const [status, errorCode, pending] of [[503, 'RESULT_STORAGE_UNAVAILABLE', true], [500, 'YEONI_HONEY_LETTER_SAVE_FAILED', false]]) {
    const h = harness(() => reply(status, { errorCode }));
    await h.send(); assert.equal(h.state.updated.honeyLetterPending, pending);
  }
});
test('pending letter stays actionable at zero balance', () => {
  const expression = canRequest.initializer.getText(ast);
  const state = { result: { resultId: 'saved', honeyLetterPending: true }, honeyDrops: { authenticated: true }, honeyBalance: 0, honeyLetter: null, honeyLetterLoading: false };
  assert.equal(vm.runInNewContext(expression, state), true);
  state.result.honeyLetterPending = false;
  assert.equal(vm.runInNewContext(expression, state), false);
});
for (const change of ['account', 'result', 'unmount']) test(`${change} discards a late response`, async () => {
  let finish;
  const h = harness(() => new Promise(resolve => { finish = resolve; }));
  const pending = h.send();
  if (change === 'account') h.state.owner = 'other';
  if (change === 'result') h.state.honeyScopeRef.current = { owner: 'owner', resultId: 'other-result' };
  if (change === 'unmount') h.state.honeyMountedRef.current = false;
  finish(reply(200, { success: true, honeyLetter: { body: 'private letter' } }));
  await pending;
  assert.equal(h.state.updated, undefined); assert.equal(h.state.wallet, undefined);
});
test('repeated taps do not submit another request while delivery is pending', async () => {
  let finish;
  const h = harness(() => new Promise(resolve => { finish = resolve; }));
  const first = h.send(); await h.send(); assert.equal(h.posts.length, 1);
  finish(reply(200, { success: true, honeyLetter: { body: 'letter' } })); await first;
});
test('server pending result resumes on mobile return and online with bounded timers', () => {
  const listeners = new Map(); const timers = new Map(); let calls = 0;
  const events = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  const state = {
    result: { resultId: 'saved', honeyLetterPending: true }, honeyOwner: 'owner',
    honeyResumeRef: { current: () => { calls++; } },
    document: { ...events, visibilityState: 'visible' }, navigator: { onLine: true },
    window: { ...events, setTimeout: (fn, delay) => { timers.set(delay, fn); return delay; }, clearTimeout: id => timers.delete(id) },
  };
  const cleanup = vm.runInNewContext(`(${recoveryEffect.arguments[0].getText(ast)})()`, state);
  assert.deepEqual([...timers.keys()], [1000, 45000, 125000]);
  listeners.get('online')(); listeners.get('visibilitychange')();
  assert.equal(calls, 2);
  state.document.visibilityState = 'hidden'; listeners.get('visibilitychange')(); assert.equal(calls, 2);
  cleanup(); assert.equal(timers.size, 0); assert.equal(listeners.size, 0);
});
