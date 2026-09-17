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

test('actual sukuyo-compatibility-ai resume effect bumps resumeEpoch on every foreground event, respects the hidden guard, and cleans up', () => {
  const effect = extractEffect('app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx', 'setResumeEpoch(value => value + 1)');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  const epochCalls = [];
  const context = {
    window: surface('window:'),
    document: { ...surface('document:'), hidden: false },
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

  context.document.hidden = true;
  handlers.get('window:pageshow')();
  assert.equal(epochCalls.length, foregroundEvents.length, 'a hidden document must not bump resumeEpoch');

  cleanup();
  assert.equal(handlers.size, 0, 'cleanup must remove every listener');
});
