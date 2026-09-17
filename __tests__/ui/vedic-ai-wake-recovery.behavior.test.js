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

test('actual vedic-ai start-screen resume effect resumes an abandoned session on every foreground event, respects guards, and cleans up', async () => {
  const effect = extractEffect('app/vedic-ai/VedicAiClient.tsx', 'resumeSavedConsultation(cid)');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  const calls = [];
  let currentOwner = true;
  const context = {
    window: surface('window:'),
    document: { ...surface('document:'), visibilityState: 'visible' },
    captureOwner: () => () => currentOwner,
    submitBusyRef: { current: false },
    authFetch: async () => ({ ok: true, json: async () => ({ pendingSessionId: 'abandoned-vedic-session' }) }),
    resumeSavedConsultation: async (cid) => { calls.push(cid); },
  };
  const transpiled = ts.transpileModule('(' + effect + ')()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const cleanup = vm.runInNewContext(transpiled, context);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, 1, 'mount should resume the abandoned session once');
  assert.equal(calls[0], 'abandoned-vedic-session');

  for (const key of ['window:pageshow', 'window:focus', 'window:online', 'document:visibilitychange']) {
    assert.equal(typeof handlers.get(key), 'function', `${key} handler must be registered`);
    context.submitBusyRef.current = false;
    await handlers.get(key)();
  }
  assert.equal(calls.length, 5, 'every foreground event should re-trigger resume once unlocked');

  context.submitBusyRef.current = false;
  context.document.visibilityState = 'hidden';
  await handlers.get('window:pageshow')();
  assert.equal(calls.length, 5, 'a hidden document must not resume');

  context.document.visibilityState = 'visible';
  context.submitBusyRef.current = true;
  await handlers.get('window:focus')();
  assert.equal(calls.length, 5, 'an in-flight submit must not overlap');

  context.submitBusyRef.current = false;
  currentOwner = false;
  await handlers.get('window:online')();
  assert.equal(calls.length, 5, 'a stale owner must discard the late response instead of resuming it');

  cleanup();
  assert.equal(handlers.size, 0, 'cleanup must remove every listener');
});

test('actual vedic-ai result-screen resume effect bumps resumeEpoch on every foreground event, respects the hidden guard, and cleans up', () => {
  const effect = extractEffect('app/vedic-ai/result/VedicAiResultClient.tsx', 'setResumeEpoch(value => value + 1)');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  const epochCalls = [];
  const context = {
    window: surface('window:'),
    document: { ...surface('document:'), visibilityState: 'visible' },
    setResumeEpoch: (updater) => epochCalls.push(updater),
  };
  const transpiled = ts.transpileModule('(' + effect + ')()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const cleanup = vm.runInNewContext(transpiled, context);

  const foregroundEvents = ['window:pageshow', 'window:focus', 'window:online', 'document:visibilitychange'];
  for (const key of foregroundEvents) assert.equal(typeof handlers.get(key), 'function', `${key} handler must be registered`);

  foregroundEvents.forEach((key, index) => {
    handlers.get(key)();
    assert.equal(epochCalls.length, index + 1, `${key} should bump resumeEpoch`);
  });

  context.document.visibilityState = 'hidden';
  handlers.get('window:pageshow')();
  assert.equal(epochCalls.length, foregroundEvents.length, 'a hidden document must not bump resumeEpoch');

  cleanup();
  assert.equal(handlers.size, 0, 'cleanup must remove every listener');
});
