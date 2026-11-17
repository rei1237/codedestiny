const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('app/hooks/usePaidResume.ts', 'utf8');
function mount({ready = false, user = null} = {}) {
  let state = {authReady: ready, user}, release, refreshes = 0;
  const handlers = new Map(), cleanups = [], calls = [];
  const pending = new Promise(resolve => { release = resolve; });
  const mocks = {
    react: {useRef: current => ({current}), useCallback: fn => fn, useEffect: fn => {const cleanup = fn(); if (cleanup) cleanups.push(cleanup);}},
    '@/app/_lib/auth-store': {getAuthState: () => state, refreshAuth: async () => {refreshes++; await pending;}},
    '@/lib/i18n/dictionary': {detectLocale: () => 'ko'},
    '@/js/core/checkout-entry.js': {__esModule: true, default: {
      registerPaidResumeHandler: (kind, handler) => handlers.set(kind, handler),
      unregisterPaidResumeHandler: (kind, handler) => {if (handlers.get(kind) === handler) handlers.delete(kind);},
    }},
  };
  const output = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}}).outputText;
  const fixtureModule = {exports: {}};
  vm.runInNewContext(output, {module: fixtureModule, exports: fixtureModule.exports, require: name => {assert.ok(mocks[name], name); return mocks[name];}});
  fixtureModule.exports.usePaidResume('neo-operation-room-consultation', async (args, grant) => {calls.push({owner: state.user.id, args, grant}); return true;});
  return {calls, refreshes: () => refreshes, run: (args, grant) => handlers.get('neo-operation-room-consultation')({args}, grant),
    settle(next) {state = next; release();}, unmount() {cleanups.forEach(fn => fn());}};
}
test('payment return waits for account hydration before the feature captures its owner and original request', async () => {
  const f = mount(), grant = {requestId: 'original-request', payload: {consume: {ok: true}}};
  const result = f.run({idempotencyKey: 'original-request'}, grant);
  assert.equal(f.calls.length, 0); assert.equal(f.refreshes(), 1);
  f.settle({authReady: true, user: {id: 'original-buyer'}});
  assert.equal(await result, true); assert.equal(f.calls[0].owner, 'original-buyer');
  assert.equal(f.calls[0].args.idempotencyKey, 'original-request'); assert.equal(f.calls[0].grant, grant);
});
test('an already authenticated return starts immediately without another auth request', async () => {
  const f = mount({ready: true, user: {id: 'buyer'}});
  assert.equal(await f.run({}, null), true); assert.equal(f.refreshes(), 0);
});
test('unmount or a confirmed guest cannot start paid generation after restore', async () => {
  const f = mount(); const pending = f.run({}, null); f.unmount();
  f.settle({authReady: true, user: {id: 'buyer'}}); assert.equal(await pending, false); assert.equal(f.calls.length, 0);
  const guest = mount({ready: true}); assert.equal(await guest.run({}, null), false); assert.equal(guest.calls.length, 0);
});
