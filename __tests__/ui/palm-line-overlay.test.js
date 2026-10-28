const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const source = fs.readFileSync('app/palm-reading/PalmLineOverlay.tsx', 'utf8');
function loadOverlay() {
  const mod = { exports: {} };
  const stubs = { '@/constants/loadingMessages': { getCurrentLoadingLocale: () => 'ko' } };
  const context = vm.createContext({ module: mod, exports: mod.exports, require: id => stubs[id] || require(id) });
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  return mod.exports.default;
}
const render = undetectedLines => renderToStaticMarkup(React.createElement(loadOverlay(), { imageUrl: '/palm.webp', imageAlt: 'palm', pathMap: {}, undetectedLines, activeLine: null, onSelectLine() {} }));
test('a line the reading did not detect is drawn dashed and explained', () => {
  const html = render(['fateLine']);
  assert.equal((html.match(/<path[^>]*stroke-dasharray/g) || []).length, 1);
  assert.match(html, /점선은 이번 사진에서 판독되지 않은 선이에요/);
  assert.doesNotMatch(render([]), /stroke-dasharray|점선은/);
});
