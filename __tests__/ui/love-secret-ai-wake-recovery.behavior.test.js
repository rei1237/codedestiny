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

test('actual love-secret-ai start-screen discovery effect re-checks the resumable session on every foreground event, respects the hidden guard, and cleans up', () => {
  const effect = extractEffect('app/love-secret-ai/LoveSecretAiClient.tsx', 'setDiscoveryEpoch(value => value + 1)');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  const epochCalls = [];
  const context = {
    window: surface('window:'),
    document: { ...surface('document:'), hidden: false },
    setDiscoveryEpoch: (updater) => epochCalls.push(updater),
  };
  const transpiled = ts.transpileModule('(' + effect + ')()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const cleanup = vm.runInNewContext(transpiled, context);

  const foregroundEvents = ['window:pageshow', 'window:focus', 'window:online', 'document:visibilitychange'];
  for (const key of foregroundEvents) assert.equal(typeof handlers.get(key), 'function', `${key} handler must be registered`);

  foregroundEvents.forEach((key, index) => {
    handlers.get(key)();
    assert.equal(epochCalls.length, index + 1, `${key} should bump discoveryEpoch`);
  });

  context.document.hidden = true;
  handlers.get('window:pageshow')();
  assert.equal(epochCalls.length, foregroundEvents.length, 'a hidden document must not bump discoveryEpoch');

  cleanup();
  assert.equal(handlers.size, 0, 'cleanup must remove every listener');
});

test('actual love-secret-ai result-screen polling effect re-fetches on every foreground event, respects the hidden/alive/ownership guards, and cleans up', async () => {
  const effect = extractEffect('app/love-secret-ai/result/LoveSecretAiResultClient.tsx', 'setReloadEpoch(value => value + 1)');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  const fetchCalls = [];
  const epochCalls = [];
  let currentOwner = true;
  const context = {
    window: { ...surface('window:'), setTimeout: () => 1, clearTimeout: () => {} },
    document: { ...surface('document:'), hidden: false },
    captureDeliveryScope: () => () => currentOwner,
    authFetch: async (url) => { fetchCalls.push(url); return { ok: true, status: 200, json: async () => ({ status: 'completed', ok: true }) }; },
    readDevPreviewState: () => '',
    buildDevPreviewResponse: () => ({ ok: true, status: 200, json: async () => ({}) }),
    buildLoveSecretPreviewPayload: () => ({}),
    buildResultEndpoint: () => '/api/love-secret-ai/result',
    isRetriableResultPollFailure: () => false,
    toText: (value) => (value == null ? '' : String(value)),
    friendlyErrorMessage: (_err, fallback) => fallback,
    copy: { loadResultFailedError: 'load-failed', genResultTimeoutError: 'timeout' },
    setError: () => {},
    setPending: () => {},
    setLoading: () => {},
    setConsultation: () => {},
    setReloadEpoch: (updater) => epochCalls.push(updater),
  };
  const transpiled = ts.transpileModule('(' + effect + ')()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const cleanup = vm.runInNewContext(transpiled, context);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fetchCalls.length, 1, 'mount should fetch the result once');

  const foregroundEvents = ['window:pageshow', 'window:focus', 'document:visibilitychange'];
  for (const key of foregroundEvents) assert.equal(typeof handlers.get(key), 'function', `${key} handler must be registered`);

  foregroundEvents.forEach((key, index) => {
    handlers.get(key)();
    assert.equal(epochCalls.length, index + 1, `${key} should bump reloadEpoch`);
  });

  context.document.hidden = true;
  handlers.get('window:pageshow')();
  assert.equal(epochCalls.length, foregroundEvents.length, 'a hidden document must not bump reloadEpoch');

  context.document.hidden = false;
  currentOwner = false;
  handlers.get('window:focus')();
  assert.equal(epochCalls.length, foregroundEvents.length, 'a stale owner must not bump reloadEpoch');

  currentOwner = true;
  const focusHandler = handlers.get('window:focus');
  cleanup();
  assert.equal(handlers.size, 0, 'cleanup must remove every listener');
  focusHandler();
  assert.equal(epochCalls.length, foregroundEvents.length, 'a cleaned-up effect must not bump reloadEpoch after unmount');
});
