import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
const read = path => fs.readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const source = read('js/core/play-display-price.js');
const tick = () => new Promise(resolve => setTimeout(resolve, 10));
async function setup({ app = true, price = '¥1,290', currency = 'JPY', unavailable = false, platform = 'android', delayed = false } = {}) {
  const dom = new JSDOM('<span data-cd-play-price data-cd-play-pass="standard" data-cd-play-policy="flower-20260930" data-price-krw="9900">9,900원</span><span id="budget">KRW 20,000</span>', { url: 'https://local.test/', runScripts: 'outside-only' });
  const win = dom.window, calls = [], observers = [];
  const Observer = win.MutationObserver;
  win.MutationObserver = class extends Observer { constructor(fn) { super(fn); observers.push(this); } };
  win.__cdAppContext = { isApp: () => app };
  win.Capacitor = { getPlatform: () => platform };
  win.cdTranslate = key => ({ 'preview.priceUnknown': 'Check price', 'home.concernPick.price.free': 'Free', 'home.playPrice.from': 'From {price}' })[key];
  let resolveRequest;
  win.fetch = async (url, init) => {
    calls.push({ type: 'read', url, method: init.method });
    if (delayed) await new Promise(resolve => { resolveRequest = resolve; });
    return { ok: !unavailable, json: async () => ({ ok: true, data: { provider: 'GOOGLE_PLAY', product: { productId: 'cd_pass_standard_30d_v4' } } }) };
  };
  win.CodeDestinyNative = {
    queryProducts: async input => { calls.push({ type: 'query', input }); return { ok: true, products: [{ productId: input.productIds[0], formattedPrice: price, priceCurrencyCode: currency, priceAmountMicros: 1290000000 }] }; },
    purchase: () => { throw Error('No purchase is allowed'); }, consume: () => { throw Error('No consume is allowed'); }, restore: () => { throw Error('Display must not restore'); },
  };
  win.eval(source); await tick();
  return { win, calls, release: () => resolveRequest?.(), close: () => { observers.forEach(item => item.disconnect()); win.close(); } };
}
for (const [country, currency, price] of [['KR','KRW','₩9,900'], ['JP','JPY','¥1,290'], ['US','USD','$7.49'], ['GB','GBP','£6.49'], ['CA','CAD','CA$9.99'], ['AU','AUD','A$11.99'], ['NZ','NZD','NZ$14.99'], ['IE','EUR','€7.99']]) {
  test(country + ': preserves Play price across all UI locales without changing KRW budgets', async () => {
    const app = await setup({ currency, price });
    try {
      const el = app.win.document.querySelector('[data-cd-play-price]');
      for (const lang of ['ko','en','ja','zh-CN','zh-TW','vi','hi','es','fr','de','nl','ms']) {
        app.win.document.documentElement.lang = lang;
        el.textContent = '9,900원'; // the language runtime may repaint the original price template
        app.win.dispatchEvent(new app.win.CustomEvent('cd:locale-ready')); await tick();
        assert.equal(el.textContent, price);
        assert.equal(el.dataset.priceKrw, '9900');
        assert.equal(app.win.document.querySelector('#budget').textContent, 'KRW 20,000');
      }
      assert.equal(app.calls.filter(call => call.type === 'read').length, 1);
      assert.equal(app.calls.filter(call => call.type === 'query').length, 1);
      assert.match(app.calls[0].url, /passTier=standard&passPolicyVersion=flower-20260930/);
      assert.equal(app.calls[0].method, 'GET');
    } finally { app.close(); }
  });
}
test('web leaves existing prices untouched and never contacts Play', async () => {
  const app = await setup({ app: false });
  try { assert.equal(app.calls.length, 0); assert.equal(app.win.document.querySelector('[data-cd-play-price]').textContent, '9,900원'); } finally { app.close(); }
});
test('missing SKU and iOS never fall back to the KRW sale price', async () => {
  for (const config of [{ unavailable: true }, { platform: 'ios' }]) {
    const app = await setup(config);
    try { assert.equal(app.win.document.querySelector('[data-cd-play-price]').textContent, 'Check price'); assert.equal(app.calls.filter(call => call.type === 'query').length, 0); } finally { app.close(); }
  }
});
test('pending prices hide web amounts; returning to the app refreshes Play currency', async () => {
  const app = await setup({ delayed: true });
  try {
    const el = app.win.document.querySelector('[data-cd-play-price]');
    assert.equal(el.textContent, 'Check price'); app.release(); await tick();
    assert.equal(el.textContent, '¥1,290');
    app.win.CodeDestinyNative.queryProducts = async input => ({ ok: true, products: [{ productId: input.productIds[0], formattedPrice: '$7.49', priceCurrencyCode: 'USD', priceAmountMicros: 7490000 }] });
    app.win.dispatchEvent(new app.win.Event('focus')); await tick(); app.release(); await tick();
    assert.equal(el.textContent, '$7.49');
  } finally { app.close(); }
});
test('rejects mismatched or incomplete Play details, not converting a numeric web amount', async () => {
  const app = await setup();
  try {
    app.win.CodeDestinyNative.queryProducts = async () => ({ ok: true, products: [{ productId: 'wrong_sku', formattedPrice: '$7.49', priceCurrencyCode: 'USD', priceAmountMicros: 7490000 }] });
    app.win.__cdPlayDisplayPrice.invalidate(); await tick();
    assert.equal(app.win.document.querySelector('[data-cd-play-price]').textContent, 'Check price');
  } finally { app.close(); }
});
test('feature reads deduplicate a shared server SKU and retain from-price wording', async () => {
  const app = await setup();
  try {
    const { win } = app;
    win.document.body.insertAdjacentHTML('beforeend','<span data-cd-play-price data-cd-play-feature="feature-a" data-cd-play-kind="from">30,000원부터</span><span class="tarot-tile__coin-badge" data-cd-price-key="feature-b" data-cd-price-reason="context">30,000원</span>');
    await tick();
    assert.equal(win.document.querySelector('[data-cd-play-feature]').textContent, 'From ¥1,290');
    assert.equal(win.document.querySelector('.tarot-tile__coin-badge').textContent, '¥1,290');
    assert.equal(app.calls.filter(call => call.type === 'query').length, 1);
    assert.ok(app.calls.some(call => call.url?.includes('featureKey=feature-b&reason=context')));
  } finally { app.close(); }
});
