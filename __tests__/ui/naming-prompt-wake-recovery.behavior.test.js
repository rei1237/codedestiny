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

test('실제 작명 결과 화면의 재개 이펙트는 포그라운드 전환 4종 모두에서 retryKey를 올리고 정리한다', () => {
  const effect = extractEffect('app/naming-ai/result/NamingAiResultClient.tsx', 'setRetryKey(key => key + 1)');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  const retryCalls = [];
  const context = {
    window: surface('window:'),
    document: { ...surface('document:'), visibilityState: 'visible' },
    navigator: { onLine: true },
    setRetryKey: (updater) => retryCalls.push(updater),
  };
  const transpiled = ts.transpileModule('(' + effect + ')()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const cleanup = vm.runInNewContext(transpiled, context);

  const foregroundEvents = ['window:pageshow', 'window:focus', 'window:online', 'document:visibilitychange'];
  for (const key of foregroundEvents) assert.equal(typeof handlers.get(key), 'function', `${key} handler must be registered`);

  foregroundEvents.forEach((key, index) => {
    handlers.get(key)();
    assert.equal(retryCalls.length, index + 1, `${key} should bump retryKey`);
  });

  context.document.visibilityState = 'hidden';
  handlers.get('window:pageshow')();
  assert.equal(retryCalls.length, foregroundEvents.length, 'a hidden document must not bump retryKey');

  context.document.visibilityState = 'visible';
  context.navigator.onLine = false;
  handlers.get('window:focus')();
  assert.equal(retryCalls.length, foregroundEvents.length, 'offline navigator must not bump retryKey');

  cleanup();
  assert.equal(handlers.size, 0, 'cleanup must remove every listener');
});
