const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../../app/app/_lib/native-billing.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const valid = { productId: 'pass', productType: 'inapp', formattedPrice: '¥1,280', priceCurrencyCode: 'JPY', priceAmountMicros: 1280000000 };
function setup(queryProducts) {
  const billingModule = { exports: {} };
  vm.runInNewContext(compiled, { module: billingModule, exports: billingModule.exports, window: { CodeDestinyNative: { queryProducts } } });
  return billingModule.exports;
}

test('native product lookup accepts the store price without converting it', async () => {
  const api = setup(async input => {
    assert.equal(input.productType, 'inapp');
    return { ok: true, products: [valid] };
  });
  const products = await api.queryAppProducts(['pass']);
  assert.equal(products.length, 1);
  assert.equal(products[0].formattedPrice, '¥1,280');
  assert.equal(products[0].priceCurrencyCode, 'JPY');
});

test('unrequested, unpriced, zero, invalid currency and subscription rows cannot enable purchase', async () => {
  const products = [null, { ...valid, productId: 'other' }, { ...valid, formattedPrice: ' ' },
    { ...valid, priceAmountMicros: 0 }, { ...valid, priceAmountMicros: Infinity },
    { ...valid, priceCurrencyCode: '' }, { ...valid, productType: 'subs' }, valid];
  const result = await setup(async () => ({ ok: true, products })).queryAppProducts(['pass']);
  assert.equal(result.length, 1);
  assert.equal(result[0].productId, 'pass');
});

test('failed lookup stays closed and a later successful lookup can recover', async () => {
  let fail = true;
  const api = setup(async () => { if (fail) throw new Error('offline'); return { ok: true, products: [valid] }; });
  assert.equal((await api.queryAppProducts(['pass'])).length, 0);
  fail = false;
  assert.equal((await api.queryAppProducts(['pass'])).length, 1);
});
