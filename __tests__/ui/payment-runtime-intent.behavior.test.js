const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

// Run the actual provider effect. Its only I/O is mocked, so no payment or
// authentication request can escape this test.
function fixture(profileOnly = false) {
  const source = fs.readFileSync('app/components/PaymentProcessingContext.tsx', 'utf8');
  const helper = source.indexOf('const prewarmPaidRuntimeGate');
  const start = source.lastIndexOf('useEffect(() => {', helper);
  const endMarker = '}, [profileOnly]);';
  const end = source.indexOf(endMarker, helper) + endMarker.length;
  assert.ok(start >= 0 && end > start);
  const code = ts.transpileModule(source.slice(start, end), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const dom = new JSDOM('<p id="copy">Introduction</p><button><span id="action">Continue</span></button><input id="name">');
  let warmed = 0, cleanup;
  vm.runInNewContext(code, {
    profileOnly, window: dom.window, document: dom.window.document,
    Element: dom.window.Element,
    useEffect(callback) { cleanup = callback(); },
    require(name) {
      assert.equal(name, '../_lib/billing-client');
      return { prefetchPaidServiceRuntimeGate() { warmed++; } };
    },
  });
  return { dom, get warmed() { return warmed; }, dispose() { cleanup?.(); dom.window.close(); } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

for (const eventName of ['pointerover', 'pointerdown', 'focusin']) {
  test('payment static prefetch starts once on interactive ' + eventName, async () => {
    const f = fixture();
    try {
      await flush();
      assert.equal(f.warmed, 0, 'mounting cannot compete with the first paint');
      f.dom.window.document.getElementById('copy').dispatchEvent(new f.dom.window.Event(eventName, { bubbles: true }));
      await flush();
      assert.equal(f.warmed, 0, 'reading text is not payment intent');
      const target = f.dom.window.document.getElementById(eventName === 'focusin' ? 'name' : 'action');
      target.dispatchEvent(new f.dom.window.Event(eventName, { bubbles: true }));
      await flush();
      assert.equal(f.warmed, 1);
      for (const next of ['focusin', 'pointerdown', 'pointerover']) target.dispatchEvent(new f.dom.window.Event(next, { bubbles: true }));
      await flush();
      assert.equal(f.warmed, 1, 'listeners must be removed after the first intent');
    } finally { f.dispose(); }
  });
}

test('unmount cancels queued prefetch and the career profile route stays excluded', async () => {
  const f = fixture();
  f.dom.window.document.getElementById('action').dispatchEvent(new f.dom.window.Event('pointerdown', { bubbles: true }));
  f.dispose();
  await flush();
  assert.equal(f.warmed, 0);
  const excluded = fixture(true);
  try {
    excluded.dom.window.document.getElementById('action').dispatchEvent(new excluded.dom.window.Event('pointerover', { bubbles: true }));
    await flush();
    assert.equal(excluded.warmed, 0);
  } finally { excluded.dispose(); }
});
