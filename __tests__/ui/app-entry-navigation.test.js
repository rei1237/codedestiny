const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.createSourceFile('bridge.js', fs.readFileSync(path.resolve(__dirname, '../../scripts/app-native-bridge.js'), 'utf8'), ts.ScriptTarget.Latest, true);
const functions = new Map();
function visit(node) {
  if (ts.isFunctionDeclaration(node) && ['isRootScreen', 'installBackButton'].includes(node.name?.text)) functions.set(node.name.text, node.getText(source));
  ts.forEachChild(node, visit);
}
visit(source);
assert.equal(functions.size, 2);

function setup(pathname, { overlay = false } = {}) {
  const calls = [];
  let back;
  vm.runInNewContext([...functions.values()].join('\n') + ';installBackButton()', {
    window: { location: { pathname, assign: target => calls.push(target) }, history: { back: () => calls.push('back') } },
    appPlugin: () => ({ addListener: (_name, fn) => { back = fn; }, exitApp: () => calls.push('exit') }),
    closeTopOverlay: () => overlay,
    showExitHint: () => calls.push('hint'),
    exitArmedAt: 0,
  });
  return { calls, back };
}

test('Ggulggul packaged entry exits only after the second back press', () => {
  for (const pathname of ['/ggulggul/', '/ggulggul/index.html']) {
    const app = setup(pathname);
    app.back({ canGoBack: true });
    app.back({ canGoBack: true });
    assert.deepEqual(app.calls, ['hint', 'exit']);
  }
});

test('a detail or Yeongnyangi with no history returns to Ggulggul', () => {
  for (const pathname of ['/records/index.html', '/yeongnyangi/index.html']) {
    const app = setup(pathname);
    app.back({ canGoBack: false });
    assert.deepEqual(app.calls, ['/ggulggul/index.html']);
  }
});

test('existing history and open overlays take precedence over the home fallback', () => {
  const history = setup('/records/index.html');
  history.back({ canGoBack: true });
  assert.deepEqual(history.calls, ['back']);
  const overlay = setup('/ggulggul/index.html', { overlay: true });
  overlay.back({ canGoBack: true });
  assert.deepEqual(overlay.calls, []);
});
