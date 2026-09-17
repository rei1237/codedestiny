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

test('actual neo result recover effect resumes polling on every foreground event and cleans up', () => {
  const effect = extractEffect('src/features/neo-war-room/NeoOperationRoomResultPage.tsx', 'setRecoveryEpoch(value => value + 1)');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  let epoch = 0;
  const context = {
    window: surface('window:'), document: { ...surface('document:'), visibilityState: 'visible' }, navigator: { onLine: true },
    setRecoveryEpoch: update => { epoch = update(epoch); },
  };
  const cleanup = vm.runInNewContext('(' + effect + ')()', context);
  for (const key of ['window:pageshow', 'window:focus', 'window:online', 'document:visibilitychange']) {
    assert.equal(typeof handlers.get(key), 'function', key);
    handlers.get(key)();
  }
  assert.equal(epoch, 4);
  context.document.visibilityState = 'hidden'; epoch = 0; handlers.get('window:pageshow')(); assert.equal(epoch, 0);
  context.navigator.onLine = false; context.document.visibilityState = 'visible'; handlers.get('window:online')(); assert.equal(epoch, 0);
  cleanup(); assert.equal(handlers.size, 0);
});

test('actual neo input-page recover effect redirects an abandoned pending session to the result page on every foreground event and cleans up', async () => {
  const effect = extractEffect('src/features/neo-war-room/NeoOperationRoomPage.tsx', '/api/neo-operation-room/result").catch');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  const assigned = [];
  const context = {
    window: { ...surface('window:'), location: { assign: url => assigned.push(url) } },
    document: { ...surface('document:'), visibilityState: 'visible' },
    navigator: { onLine: true },
    captureOwner: () => () => true,
    authFetch: async () => ({ status: 202, json: async () => ({ sessionId: 'abandoned-neo-session' }) }),
    encodeURIComponent,
  };
  const cleanup = vm.runInNewContext('(' + effect + ')()', context);
  await new Promise(resolve => setImmediate(resolve));
  for (const key of ['window:pageshow', 'window:focus', 'window:online', 'document:visibilitychange']) {
    assert.equal(typeof handlers.get(key), 'function', key);
    await handlers.get(key)();
  }
  assert.equal(assigned.length, 5);
  assert.ok(assigned.every(url => url === '/neo-operation-room/result?attemptId=abandoned-neo-session'));
  cleanup(); assert.equal(handlers.size, 0);
});
