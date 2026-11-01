const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../../apps/mobile/android/app/src/main/java/com/codedestiny/app/MainActivity.java'), 'utf8');
const expression = source.match(/getWebView\(\)\.evaluateJavascript\(\s*([\s\S]*?),\s*value\s*->/)[1]
  .match(/"(?:\\.|[^"\\])*"/g).map(value => JSON.parse(value)).join('');
const ready = (url, state, gate = false) => vm.runInNewContext(expression, {
  window: { location: { href: url } },
  document: { readyState: state, documentElement: { classList: { contains: () => gate } } },
});

test('initial complete about:blank cannot dismiss the native splash before the home document loads', () => {
  assert.equal(ready('about:blank', 'complete'), false);
  assert.equal(ready('https://localhost/index.html', 'loading'), false);
  assert.equal(ready('https://localhost/index.html', 'interactive'), true);
});

test('real pages still wait for the existing web gate, including non-home entries', () => {
  assert.equal(ready('https://localhost/ggulggul/index.html', 'complete', true), false);
  assert.equal(ready('https://localhost/ggulggul/index.html', 'complete', false), true);
});

test('unknown document state waits for the native timeout instead of falsely reporting readiness', () => {
  const document = { get readyState() { throw new Error('document not available'); } };
  assert.equal(vm.runInNewContext(expression, { window: { location: { href: 'https://localhost/index.html' } }, document }), false);
  assert.match(source, /postDelayed\(\(\) -> webViewDrawn\[0\] = true, SPLASH_HANDOFF_CAP_MS\)/);
});
