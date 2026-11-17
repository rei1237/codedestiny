const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function actualFunction(file, name) {
  const text = fs.readFileSync(file, 'utf8');
  const input = file.endsWith('.html') ? [...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]).join('\n') : text;
  const ast = ts.createSourceFile(file, input, ts.ScriptTarget.Latest, true), found = [];
  function visit(node) {if (ts.isFunctionDeclaration(node) && node.name?.text === name) found.push(node.getText(ast)); ts.forEachChild(node, visit);}
  visit(ast); assert.equal(found.length, 1, name); return found[0];
}
for (const [file, name] of [['index.html', '_cdWaitForPaymentOverlayPaint'], ['js/destiny-profile.js', '_dpWaitForPaymentOverlayPaint']]) {
  test(name + ' does not block delivery when a payment app suspends animation frames', async () => {
    const cancelled = [], scope = {Promise, window: {setTimeout, clearTimeout, requestAnimationFrame: () => 9, cancelAnimationFrame: id => cancelled.push(id)}};
    vm.runInNewContext(actualFunction(file, name), scope);
    await scope[name](); assert.deepEqual(cancelled, [9]);
  });
}
test('shared fetch trackers never announce success before confirm resolves', () => {
  const runtime = {_indexRuntimeText: x => x};
  vm.runInNewContext(actualFunction('js/core/index-inline-runtime.js', '__cdShouldTrackPaymentRequest'), runtime);
  for (const path of ['/api/billing/confirm', '/api/payments/confirm', '/api/payments/subscription/confirm']) assert.equal(runtime.__cdShouldTrackPaymentRequest(path, 'POST'), false);
  const shell = {_cdPaymentI18n: (_key, fallback) => fallback};
  vm.runInNewContext(actualFunction('index.html', '_cdReadPaymentBodyMeta'), shell);
  vm.runInNewContext(actualFunction('index.html', '_cdResolvePaymentUiMeta'), shell);
  for (const path of ['/api/billing/confirm', '/api/payments/confirm']) assert.equal(shell._cdResolvePaymentUiMeta(path, 'POST', {}), null);
});
