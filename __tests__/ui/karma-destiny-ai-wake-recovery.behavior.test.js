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

test('actual karma-destiny-ai start-screen restore effect resumes on every foreground event, respects guards, and cleans up', async () => {
  const effect = extractEffect('app/karma-destiny-ai/KarmaDestinyAiClient.tsx', '/api/karma-destiny-ai/result');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  const opens = [];
  let currentOwner = true;
  const lockRef = { current: false };
  const context = {
    window: { ...surface('window:'), location: { assign: (url) => opens.push(url) } },
    document: { ...surface('document:'), visibilityState: 'visible' },
    captureOwner: () => () => currentOwner,
    startLockRef: lockRef,
    authFetch: async () => ({ ok: true, json: async () => ({ sessionId: 'abandoned-karma-session', status: 'generating' }) }),
    encodeURIComponent,
  };
  const transpiled = ts.transpileModule('(' + effect + ')()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const cleanup = vm.runInNewContext(transpiled, context);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(opens.length, 1, 'mount should resume the abandoned session once');

  for (const key of ['window:pageshow', 'window:focus', 'window:online', 'document:visibilitychange']) {
    assert.equal(typeof handlers.get(key), 'function', `${key} handler must be registered`);
    lockRef.current = false;
    await handlers.get(key)();
  }
  assert.equal(opens.length, 5, 'every foreground event should re-trigger resume once unlocked');

  lockRef.current = false;
  context.document.visibilityState = 'hidden';
  await handlers.get('window:pageshow')();
  assert.equal(opens.length, 5, 'a hidden document must not resume');

  context.document.visibilityState = 'visible';
  lockRef.current = true;
  await handlers.get('window:focus')();
  assert.equal(opens.length, 5, 'an in-flight start lock must not overlap');

  lockRef.current = false;
  currentOwner = false;
  await handlers.get('window:online')();
  assert.equal(opens.length, 5, 'a stale owner must discard the late response instead of resuming it');

  cleanup();
  assert.equal(handlers.size, 0, 'cleanup must remove every listener');
});

test('actual karma-destiny-ai result-screen resume effect bumps resumeEpoch and resets stall/failure counters on every foreground event, respects the hidden guard, and cleans up', () => {
  const effect = extractEffect('app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx', 'setResumeEpoch(value => value + 1)');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  const epochCalls = [];
  const transientFailuresRef = { current: 3 };
  const generationStallRef = { current: { lastChapters: 2, stalls: 5 } };
  const context = {
    window: surface('window:'),
    document: { ...surface('document:'), visibilityState: 'visible' },
    setResumeEpoch: (updater) => epochCalls.push(updater),
    transientFailuresRef,
    generationStallRef,
  };
  const transpiled = ts.transpileModule('(' + effect + ')()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const cleanup = vm.runInNewContext(transpiled, context);

  const foregroundEvents = ['window:pageshow', 'window:focus', 'window:online', 'document:visibilitychange'];
  for (const key of foregroundEvents) assert.equal(typeof handlers.get(key), 'function', `${key} handler must be registered`);

  foregroundEvents.forEach((key, index) => {
    transientFailuresRef.current = 3;
    generationStallRef.current.stalls = 5;
    handlers.get(key)();
    assert.equal(epochCalls.length, index + 1, `${key} should bump resumeEpoch`);
    assert.equal(transientFailuresRef.current, 0, `${key} should reset the transient failure count`);
    assert.equal(generationStallRef.current.stalls, 0, `${key} should reset the stall count`);
  });

  context.document.visibilityState = 'hidden';
  transientFailuresRef.current = 3;
  generationStallRef.current.stalls = 5;
  handlers.get('window:pageshow')();
  assert.equal(epochCalls.length, foregroundEvents.length, 'a hidden document must not bump resumeEpoch');
  assert.equal(transientFailuresRef.current, 3, 'a hidden document must not reset the transient failure count');
  assert.equal(generationStallRef.current.stalls, 5, 'a hidden document must not reset the stall count');

  cleanup();
  assert.equal(handlers.size, 0, 'cleanup must remove every listener');
});
