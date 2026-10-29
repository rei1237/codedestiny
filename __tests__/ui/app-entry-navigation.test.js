const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const source = ts.createSourceFile('bridge.js', fs.readFileSync(path.resolve(__dirname, '../../scripts/app-native-bridge.js'), 'utf8'), ts.ScriptTarget.Latest, true);
const names = ['nativeAppCopy', 'nativeAppText', 'isRootScreen', 'installBackButton', 'resetExitIntent', 'dispatchAppBack', 'showExitHint', 'closeTopOverlay', 'closeOverlayNode', 'isOverlayVisible', 'dispatchEscapeKey'];
const functions = new Map();
function visit(node) {
  if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) functions.set(node.name.text, node.getText(source));
  if (ts.isVariableDeclaration(node) && names.includes(node.name?.text)) functions.set(node.name.text, 'var ' + node.getText(source) + ';');
  ts.forEachChild(node, visit);
}
visit(source);
assert.equal(functions.size, names.length);

function setup(pathname, { overlay = false, exitSupported = true } = {}) {
  const dom = new JSDOM('<body><main class="ynOriginal"></main></body>', { url: 'https://localhost' + pathname });
  const { window } = dom;
  const calls = [], listeners = {}, timers = new Map();
  let time = 10000, timerId = 0;
  window.history.back = () => calls.push('back');
  window.setTimeout = fn => { timers.set(++timerId, fn); return timerId; };
  window.clearTimeout = id => timers.delete(id);
  // jsdom does not calculate layout; visibility still follows real display/hidden state.
  Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', { get() { return this.hidden || (this.tagName === 'DIALOG' && !this.open) ? 0 : 100; } });
  const context = vm.createContext({
    window, document: window.document, Event: window.Event, CustomEvent: window.CustomEvent, KeyboardEvent: window.KeyboardEvent,
    Date: { now: () => time }, Promise,
    appPlugin: () => ({ addListener: (name, fn) => { (listeners[name] ||= []).push(fn); }, ...(exitSupported ? { exitApp: () => calls.push('exit') } : {}) }),
    BACK_CLOSE_OVERLAY_IDS: [], exitArmedAt: 0, exitHintTimer: null, backButtonInstalled: false,
  });
  vm.runInContext([...functions.values()].join('\n') + ';installBackButton()', context);
  if (overlay) window.addEventListener('cd:app-back', e => { if(e.detail.scope === 'overlay') e.preventDefault(); });
  return {
    calls, window, context, listeners,
    back: (event = { canGoBack: true }) => listeners.backButton.forEach(fn => fn(event)),
    hint: () => window.document.getElementById('cdAppExitHint'),
    expire: () => { time += 2100; [...timers.values()].forEach(fn => fn()); },
    close: () => window.close(),
  };
}

for (const pathname of ['/ggulggul/', '/ggulggul/index.html', '/yeongnyangi/', '/yeongnyangi/index.html', '/app/', '/en/ggulggul/']) {
  test(`${pathname}: first back announces, second back exits exactly once`, () => {
    const app = setup(pathname);
    app.back();
    assert.equal(app.hint().textContent, '뒤로가기를 한 번 더 누르면 종료돼요');
    assert.equal(app.hint().getAttribute('role'), 'status');
    assert.deepEqual(app.calls, []);
    app.back();
    assert.deepEqual(app.calls, ['exit']);
    assert.equal(app.hint(), null);
    app.close();
  });
}
test('hint expires and another press starts a new exit window', () => {
  const app = setup('/yeongnyangi/');
  app.back(); app.expire(); assert.equal(app.hint(), null);
  app.back(); assert.ok(app.hint()); assert.deepEqual(app.calls, []); app.close();
});
for (const eventName of ['pagehide', 'pageshow', 'popstate', 'visibilitychange', 'pointerdown', 'keydown', 'appStateChange']) {
  test(`${eventName}: re-entry or another action clears the exit intent`, () => {
    const app = setup('/ggulggul/'); app.back();
    if(eventName === 'appStateChange') app.listeners.appStateChange.forEach(fn => fn({isActive:true}));
    else if (['visibilitychange','pointerdown','keydown'].includes(eventName)) app.window.document.dispatchEvent(new app.window.Event(eventName));
    else app.window.dispatchEvent(new app.window.Event(eventName));
    assert.equal(app.hint(), null); app.back(); assert.deepEqual(app.calls, []); app.close();
  });
}
test('registered popup, locked payment and wizard consume back before navigation or exit', () => {
  for (const scope of ['overlay', 'screen']) {
    const app = setup('/yeongnyangi/');
    app.window.addEventListener('cd:app-back', e => { if(e.detail.scope === scope) e.preventDefault(); });
    app.back(); app.back(); assert.deepEqual(app.calls, []); assert.equal(app.hint(), null); app.close();
  }
});
test('native HTML guide dialog closes through cancel before root exit', () => {
  const app = setup('/yeongnyangi/');
  const dialog=app.window.document.createElement('dialog'); dialog.open=true;
  app.window.document.body.appendChild(dialog);
  let cancelled=0;
  dialog.addEventListener('cancel', e=>{e.preventDefault(); dialog.open=false; cancelled++;});
  app.back(); assert.equal(cancelled,1); assert.equal(app.hint(),null); assert.deepEqual(app.calls,[]); app.close();
});
test('an existing previous page takes priority on a detail page', () => {
  const app = setup('/yeongnyangi/library/'); app.back(); assert.deepEqual(app.calls,['back']); assert.equal(app.hint(),null); app.close();
});
test('installation is idempotent and unsupported exit never displays a promise', () => {
  const app = setup('/ggulggul/', {exitSupported:false});
  vm.runInContext('installBackButton()', app.context);
  assert.equal(app.listeners.backButton.length,1);
  app.back(); assert.deepEqual(app.calls,['back']); assert.equal(app.hint(),null); app.close();
});
