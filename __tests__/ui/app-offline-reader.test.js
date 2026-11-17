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
const templePaths = ['/moonlit-lotus', '/moonlit-lotus/', '/moonlit-lotus/index.html', '/moonlit-lotus/story/', '/moonlit-lotus/story/index.html', '/moonlit-lotus/model-review/', '/moonlit-lotus/model-review/index.html'];
const guardedPaths = ['/', '/index.html', '/checkout/', '/login/', '/yeongnyangi/index.html', '/app/store/', '/moonlit-lotus-extra/', '/moonlit-lotus/private/', '/moonlit-lotus/story-extra/', '/moonlit-lotus/story/checkout/', '/moonlit-lotus/index.html/checkout/'];
test('bundled temple pages keep activity controls clear of the native offline banner', () => {
  for (const path of templePaths) assert.deepEqual(run(path, false), { posted: 0, removed: 1 }, path);
});
test('other routes keep the native offline notice and clear it when online', () => {
  for (const path of [...guardedPaths, '/lock-screen-fortune-extra/']) assert.deepEqual(run(path, false), { posted: 1, removed: 0 }, path);
  assert.deepEqual(run('/app/store/', true), { posted: 0, removed: 1 });
});

const overlaySource = fs.readFileSync(require('node:path').resolve(__dirname, '../../app/components/OfflineOverlay.tsx'), 'utf8');
const overlayCode = ts.transpileModule(overlaySource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function renderOverlay(pathname, appBuild, offline = true, locale = 'ko') {
  const exports = {};
  vm.runInNewContext(overlayCode, {
    exports,
    require(name) {
      if (name === 'react') return { useEffect() {}, useState: () => [offline, () => {}] };
      if (name === 'next/navigation') return { usePathname: () => pathname };
      if (name === '@/lib/app-build-target') return { IS_APP_BUILD: appBuild };
      if (name === '@/constants/loadingMessages') return { getCurrentLoadingLocale: () => locale };
      if (name === 'react/jsx-runtime') return require(name);
      throw new Error('Unexpected dependency: ' + name);
    },
  });
  return exports.default();
}
function links(node) {
  if (!node || typeof node !== 'object') return [];
  const children = node.props?.children;
  return [...(node.type === 'a' ? [node.props] : []), ...(Array.isArray(children) ? children : [children]).flatMap(links)];
}
test('only packaged temple pages bypass the full-screen offline overlay', () => {
  for (const path of templePaths) {
    assert.equal(renderOverlay(path, true), null, path);
    assert.ok(renderOverlay(path, false), 'Web keeps its connection notice: ' + path);
  }
  for (const path of guardedPaths) assert.ok(renderOverlay(path, true), path);
  assert.equal(renderOverlay('/checkout/', true, false), null);
  assert.equal(renderOverlay('/lock-screen-fortune/index.html', false), null);
});
test('offline app offers a real local temple link without unlocking the current page', () => {
  for (const locale of ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'vi', 'hi', 'es', 'fr', 'de', 'nl', 'ms']) {
    const tree = renderOverlay('/checkout/', true, true, locale);
    assert.ok(tree);
    const targets = links(tree);
    assert.equal(targets.length, 1, locale);
    assert.equal(targets[0].href, '/moonlit-lotus/', locale);
    assert.ok(targets[0].children.trim(), locale);
  }
  assert.equal(links(renderOverlay('/', false)).length, 0);
});
