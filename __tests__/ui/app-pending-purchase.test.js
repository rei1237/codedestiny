const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '../..');
const guardSource = fs.readFileSync(path.join(root, 'scripts/app-payment-guard.js'), 'utf8');
const bridgeSource = fs.readFileSync(path.join(root, 'scripts/app-native-bridge.js'), 'utf8');

test('iOS는 Google Play 의도·결제·검증을 요청하지 않는다', async () => {
  const dom = new JSDOM('<!doctype html><html lang="ja"><body></body></html>', { url: 'capacitor://localhost/', runScripts: 'outside-only' });
  try {
    let requests = 0;
    dom.window.fetch = async () => { requests++; throw new Error('network forbidden'); };
    dom.window.Capacitor = { getPlatform: () => 'ios' };
    dom.window.CodeDestinyNative = { purchase: async () => { throw new Error('Play must not open on iOS'); } };
    dom.window.eval(guardSource);
    await assert.rejects(dom.window.__cdAppPaymentGuard.runPlayBillingCheckout({ featureKey: 'test' }), { code: 'IOS_BILLING_NOT_CONFIGURED' });
    assert.equal(requests, 0);
  } finally { dom.window.close(); }
});

for (const state of [2, 0, undefined]) {
  test(`구매 상태 ${state}: 입금/완료 전 서버 검증과 소비를 보내지 않는다`, async () => {
    const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://localhost/', runScripts: 'outside-only' });
    const calls = [];
    dom.window.fetch = async (url) => {
      calls.push(String(url));
      return { ok: true, json: async () => ({ ok: true, data: { product: { productId: 'test-sku' }, obfuscatedAccountId: 'account', obfuscatedProfileId: 'original-intent' } }) };
    };
    dom.window.CodeDestinyNative = {
      purchase: async (input) => {
        assert.equal(input.obfuscatedProfileId, 'original-intent');
        return { ok: true, purchaseToken: 'test-token', purchaseState: state };
      },
      consume: async () => { throw new Error('미완료 구매를 소비하면 안 됨'); },
    };
    dom.window.eval(guardSource);
    await assert.rejects(dom.window.__cdAppPaymentGuard.runPlayBillingCheckout({ featureKey: 'test-feature' }), {
      code: state === 2 ? 'APP_STORE_PURCHASE_PENDING' : 'APP_STORE_PURCHASE_NOT_COMPLETED',
    });
    assert.equal(calls.length, 1);
    assert.match(calls[0], /google\/intent$/);
    dom.window.close();
  });
}

test('복귀 시 PURCHASED만 서버 검증하고 PENDING 상태를 화면에 전달한다', async () => {
  const start = bridgeSource.indexOf('  var recoveryRunning = false;');
  const end = bridgeSource.indexOf('  // --- 3-b)', start);
  assert.ok(start > 0 && end > start);
  const posts = [], consumed = [], events = [];
  const context = vm.createContext({
    PURCHASE_STATE_PURCHASED: 1, PURCHASE_STATE_PENDING: 2,
    readLocal: () => 'logged-in',
    billingPlugin: () => ({
      restore: async () => ({ ok: true, purchases: [
        { purchaseState: 2, purchaseToken: 'pending' },
        { purchaseState: 0, purchaseToken: 'unknown' },
        { purchaseState: 1, purchaseToken: 'paid' },
      ] }),
      consume: async ({ purchaseToken }) => consumed.push(purchaseToken),
    }),
    postJson: async (_url, body) => {
      posts.push(body);
      return { ok: true, payload: { data: { purchases: [{ shouldConsume: true, purchaseToken: 'paid' }] } } };
    },
    window: { dispatchEvent: (event) => events.push(event) },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
  });
  vm.runInContext(bridgeSource.slice(start, end), context);
  await vm.runInContext('runPurchaseRecovery()', context);
  assert.equal(posts.length, 1);
  assert.deepEqual(Array.from(posts[0].purchases, (p) => p.purchaseToken), ['paid']);
  assert.deepEqual(consumed, ['paid']);
  assert.equal(events[0].detail.pendingCount, 1);
});
