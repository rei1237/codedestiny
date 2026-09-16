const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the production request object's AST and its actual SDK call with a fake SDK.
// This is request-contract evidence, not a real PG or physical-device test.
async function verifySdkReturn(featureKey, pathname) {
  const { FEATURE_KEY_PRICE_TABLE } = await import('../../worker/lib/paid-feature-registry.js');
  const { calculateKrwAmountFromCoins } = await import('../../worker/lib/billing-policy.js');
  const source = readFileSync(resolve(__dirname, '../../js/destiny-profile.js'), 'utf8');
  const ast = ts.createSourceFile('profile.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let request, redirect, sdk;
  function walk(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'requestData') request = node.initializer.getText(ast);
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'redirectUrl' && node.initializer?.getText(ast).includes('window.location.href')) redirect = node.initializer.getText(ast);
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'window.PortOne.requestPayment') sdk = node.getText(ast);
    ts.forEachChild(node, walk);
  }
  walk(ast); assert.ok(request && redirect && sdk);
  let sent;
  const context = vm.createContext({ URL, config: { storeId: 'mock-store', currency: 'CURRENCY_KRW' }, channelKey: 'mock-channel',
    merchantUid: 'owned-order', orderAmount: calculateKrwAmountFromCoins(FEATURE_KEY_PRICE_TABLE[featureKey].cost), order: { featureKey },
    checkoutPayload: { requestId: 'original-idempotency-key', featureKey }, customer: {},
    directPayFields: { payMethod: 'EASY_PAY' }, _dpPgWindowLocale: () => 'KO_KR', _dpResolvePortOneOrderName: () => 'mock-book',
    window: { location: { href: 'https://code-destiny.com' + pathname + '?keep=original' },
      PortOne: { requestPayment: async data => { sent = data; return { paymentId: data.paymentId }; } } },
  });
  const setReturnMarker = "redirectUrl.searchParams.set('portone_redirect', '1');";
  assert.ok(source.includes(setReturnMarker));
  await vm.runInContext(`(async () => { const redirectUrl = ${redirect}; ${setReturnMarker} const requestData = ${request}; return await ${sdk}; })()`, context);
  const returned = new URL(sent.redirectUrl);
  assert.equal(returned.pathname, pathname); assert.equal(returned.searchParams.get('portone_redirect'), '1');
  assert.equal(returned.searchParams.get('keep'), 'original'); assert.equal(sent.paymentId, 'owned-order');
  assert.equal(sent.customData.requestId, 'original-idempotency-key');
  assert.equal(sent.customData.featureKey, featureKey);
}

test('mobile checkout sends the original page return URL and order identity to the SDK', () => verifySdkReturn('master-love-codex', '/master-love-codex'));
test('초융합 SDK 요청은 원래 복귀 URL·상품·주문·회차를 유지한다', () => verifySdkReturn('fusion-fortune-consultation', '/fusion-fortune/'));
test('자미두수 심층 SDK 요청은 실제 고객 페이지·상품·주문·회차를 유지한다', () => verifySdkReturn('ziwei-deep-pdf', '/ziwei/chart/'));
