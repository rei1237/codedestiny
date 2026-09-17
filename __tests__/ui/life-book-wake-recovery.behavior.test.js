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

test('actual life-book result resume effect reloads an abandoned session on every foreground event, respects the hidden guard, and cleans up', () => {
  const effect = extractEffect('app/life-book-ai/result/LifeBookAiResultClient.tsx', 'resumeCallsRef.current = 0');
  const handlers = new Map(), surface = name => ({
    addEventListener: (event, run) => handlers.set(name + event, run),
    removeEventListener: event => handlers.delete(name + event),
  });
  const pollAttemptsCalls = [];
  const reloadEpochCalls = [];
  const resumeCallsRef = { current: 5 };
  const context = {
    window: surface('window:'),
    document: { ...surface('document:'), hidden: false },
    setPollAttempts: (value) => pollAttemptsCalls.push(value),
    resumeCallsRef,
    setReloadEpoch: (updater) => reloadEpochCalls.push(updater),
  };
  const transpiled = ts.transpileModule('(' + effect + ')()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const cleanup = vm.runInNewContext(transpiled, context);

  const foregroundEvents = ['window:pageshow', 'window:focus', 'window:online', 'document:visibilitychange'];
  for (const key of foregroundEvents) assert.equal(typeof handlers.get(key), 'function', `${key} handler must be registered`);

  foregroundEvents.forEach((key, index) => {
    resumeCallsRef.current = 9;
    handlers.get(key)();
    assert.equal(pollAttemptsCalls.length, index + 1, `${key} should reset pollAttempts`);
    assert.equal(pollAttemptsCalls[index], 0);
    assert.equal(resumeCallsRef.current, 0, `${key} should clear the resume-call budget`);
    assert.equal(reloadEpochCalls.length, index + 1, `${key} should bump reloadEpoch`);
  });

  context.document.hidden = true;
  handlers.get('window:pageshow')();
  assert.equal(pollAttemptsCalls.length, foregroundEvents.length, 'a hidden document must not resume');
  assert.equal(reloadEpochCalls.length, foregroundEvents.length, 'a hidden document must not resume');

  cleanup();
  assert.equal(handlers.size, 0, 'cleanup must remove every listener');
});
