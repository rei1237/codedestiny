import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {JSDOM} from 'jsdom';
import {createAssetCacheKeys} from '../../scripts/lib/asset-cache-keys.mjs';

test('Next home and static shell load the same content-versioned PWA runtime', () => {
  const key = createAssetCacheKeys(process.cwd()).resolve('/js/pwa-lifecycle.js', 'app/layout.js').key;
  for (const file of ['app/layout.js', 'index.html']) {
    assert.ok(readFileSync(file, 'utf8').includes('/js/pwa-lifecycle.js?v=' + key), file);
  }
  assert.doesNotMatch(readFileSync('app/components/HomeInstallEntry.tsx', 'utf8'), /next\/script|<script/i);
});

test('home survives an older runtime, refreshes on readiness and remount, and cleans up', () => {
  const dom = new JSDOM('');
  const effects = [];
  const componentModule = {exports: {}};
  const source = ts.transpileModule(readFileSync('app/components/HomeInstallEntry.tsx', 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX},
  }).outputText;
  const require = name => {
    if (name === 'react') return {useEffect: effect => effects.push(effect)};
    if (name === 'react/jsx-runtime') return {jsx: () => null, jsxs: () => null};
    return {default: {}};
  };
  vm.runInNewContext(source, {module: componentModule, exports: componentModule.exports, require, window: dom.window});
  componentModule.exports.default();
  dom.window.__cdPwaLifecycle = {install() {}};
  const cleanup = effects[0]();
  let calls = 0;
  dom.window.__cdPwaLifecycle.refreshInstallControls = () => {calls += 1;};
  dom.window.dispatchEvent(new dom.window.Event('cd:pwa-ready'));
  assert.equal(calls, 1);
  cleanup();
  dom.window.dispatchEvent(new dom.window.Event('cd:pwa-ready'));
  assert.equal(calls, 1);
  const unmount = effects[0]();
  assert.equal(calls, 2);
  unmount();
  dom.window.close();
});
