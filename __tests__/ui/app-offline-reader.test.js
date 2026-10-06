const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.createSourceFile('bridge.js', fs.readFileSync(require('node:path').resolve(__dirname, '../../scripts/app-native-bridge.js'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
let handler;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'syncOfflineNotice') handler = node.getText(source);
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(handler, 'real bridge handler must exist');
function run(pathname, online) {
  const result = { posted: 0, removed: 0 };
  vm.runInNewContext(handler + ';syncOfflineNotice()', {
    window: { location: { pathname }, navigator: { onLine: online } },
    document: { body: {}, getElementById: () => ({ remove: () => result.removed++ }) },
    offlineNoticeNode: () => result.posted++,
  });
  return result;
}
test('local companion owns offline presentation in web and packaged paths', () => {
  for (const path of ['/lock-screen-fortune', '/lock-screen-fortune/', '/lock-screen-fortune/index.html']) assert.deepEqual(run(path, false), { posted: 0, removed: 1 });
});
test('other routes keep the native offline notice and clear it when online', () => {
  for (const path of ['/yeongnyangi/index.html', '/app/store/', '/lock-screen-fortune-extra/']) assert.deepEqual(run(path, false), { posted: 1, removed: 0 });
  assert.deepEqual(run('/app/store/', true), { posted: 0, removed: 1 });
});
