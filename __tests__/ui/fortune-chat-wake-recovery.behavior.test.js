const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function extractEffect(file, match) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes(match)) effect = node.arguments[0].getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(effect, `effect containing "${match}" not found in ${file}`);
  return effect;
}

test('actual fortune-chat recover effect resumes an interrupted paid/free turn on every foreground event, respects guards, and cleans up', async () => {
  const effect = extractEffect('app/fortune-chat/FortuneChatClient.tsx', 'api/fortune/guardian/result');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  const calls = [];
  const presented = [];
  const errors = [];
  const context = {
    window: surface('window:'),
    document: { ...surface('document:'), visibilityState: 'visible' },
    sessionId: 'session-abc',
    apiBase: '',
    fetch: async () => { throw new Error('fetch must not run while a pending turn already exists locally'); },
    readPendingTurn: () => ({ body: { requestId: 'turn-1', concern: '재물운 봐줘' }, completed: false }),
    messagesRef: { current: [] },
    restoredTurnRef: { current: '' },
    activeReadingRef: { current: false },
    setBusy: () => {},
    setError: message => errors.push(message),
    friendlyError: (_reason, fallback) => fallback,
    recoveryCallbacksRef: {
      current: {
        requestReading: async (requestId, concern) => { calls.push([requestId, concern]); return { id: requestId }; },
        presentAttempt: attempt => presented.push(attempt),
      },
    },
  };
  const transpiled = ts.transpileModule('(' + effect + ')()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const cleanup = vm.runInNewContext(transpiled, context);
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, 1, 'mount should recover the interrupted turn once');
  assert.deepEqual(calls[0], ['turn-1', '재물운 봐줘']);
  assert.equal(presented.length, 1, 'a recovered attempt should be presented');
  assert.equal(errors.length, 0);

  for (const key of ['window:pageshow', 'window:focus', 'window:online', 'document:visibilitychange']) {
    assert.equal(typeof handlers.get(key), 'function', `${key} must be registered`);
    context.activeReadingRef.current = false;
    await handlers.get(key)();
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.equal(calls.length, 5, 'every foreground event should re-trigger recovery once busy clears');

  context.activeReadingRef.current = false;
  context.document.visibilityState = 'hidden';
  await handlers.get('window:pageshow')();
  assert.equal(calls.length, 5, 'a hidden document must not recover');

  context.document.visibilityState = 'visible';
  context.activeReadingRef.current = true;
  await handlers.get('window:focus')();
  assert.equal(calls.length, 5, 'an already-busy recovery must not overlap');

  context.activeReadingRef.current = false;
  context.messagesRef.current.push({ id: 'turn-1:1' });
  await handlers.get('window:online')();
  assert.equal(calls.length, 5, 'a turn already present in the transcript must not be re-requested');

  cleanup();
  assert.equal(handlers.size, 0, 'unmount must remove every registered listener');
});
