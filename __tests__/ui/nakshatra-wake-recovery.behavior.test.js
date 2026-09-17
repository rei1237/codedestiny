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

test('actual nakshatra recover effect resumes an abandoned session on every foreground event, respects guards, and cleans up', async () => {
  const effect = extractEffect('app/nakshatra/ai/NakshatraAiClient.tsx', 'pollResult(toText(data.sessionId), "")');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  const calls = [];
  let currentOwner = true;
  const context = {
    window: surface('window:'),
    document: { ...surface('document:'), hidden: false },
    navigator: { onLine: true },
    captureOwner: () => () => currentOwner,
    busyRef: { current: false },
    authFetch: async () => ({ status: 202, json: async () => ({ sessionId: 'abandoned-nakshatra-session' }) }),
    pollResult: async (sessionId, arg2) => { calls.push([sessionId, arg2]); },
    toText: value => (value == null ? '' : String(value).trim()),
    API: { result: '/api/nakshatra-ai/result' },
  };
  const transpiled = ts.transpileModule('(' + effect + ')()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const cleanup = vm.runInNewContext(transpiled, context);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, 1, 'mount should recover the abandoned session once');

  for (const key of ['window:pageshow', 'window:focus', 'window:online', 'document:visibilitychange']) {
    assert.equal(typeof handlers.get(key), 'function', key);
    context.busyRef.current = false;
    await handlers.get(key)();
  }
  assert.equal(calls.length, 5, 'every foreground event should re-trigger recovery once busy clears');
  assert.ok(calls.every(([sessionId, arg2]) => sessionId === 'abandoned-nakshatra-session' && arg2 === ''));

  context.busyRef.current = false;
  context.document.hidden = true;
  await handlers.get('window:pageshow')();
  assert.equal(calls.length, 5, 'a hidden document must not recover');

  context.document.hidden = false;
  context.navigator.onLine = false;
  await handlers.get('window:focus')();
  assert.equal(calls.length, 5, 'an offline client must not recover');

  context.navigator.onLine = true;
  context.busyRef.current = true;
  await handlers.get('window:online')();
  assert.equal(calls.length, 5, 'an already-busy recovery must not overlap');

  context.busyRef.current = false;
  currentOwner = false;
  await handlers.get('document:visibilitychange')();
  assert.equal(calls.length, 5, 'a stale owner must discard the late response instead of resuming it');

  cleanup();
  assert.equal(handlers.size, 0);
  assert.equal(context.busyRef.current, false);
});
