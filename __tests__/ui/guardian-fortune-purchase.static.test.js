const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('guardian fortune purchase policy exposes a PG-only catalog and dedicated endpoints', () => {
  const purchase = read('worker/lib/guardian-fortune-purchase.js');
  const routes = read('worker/routes/payments.js');
  assert.match(purchase, /guardian_fortune_chat_3/);
  assert.match(purchase, /guardian_fortune_chat_10/);
  assert.match(purchase, /priceKrw: 10000/);
  assert.match(purchase, /priceKrw: 30000/);
  assert.match(purchase, /creditAmount: 3/);
  assert.match(purchase, /creditAmount: 10/);
  assert.match(purchase, /allowedPurchaseChannels: \["pg"\]/);
  assert.match(purchase, /price_coverage/);
  assert.match(routes, /\/guardian-fortune\/catalog/);
  assert.match(routes, /\/guardian-fortune\/shop-preview/);
  assert.match(routes, /\/guardian-fortune\/prepare/);
  assert.match(routes, /\/guardian-fortune\/confirm/);
});

test('guardian fortune shop defers its single server preview until the user asks for it', () => {
  const client = read('app/points/PointsClient.tsx');
  assert.match(client, /GuardianFortuneCreditShop/);
  const shop = client.slice(client.indexOf('function GuardianFortuneCreditShop'), client.indexOf('function FusionFortuneTicketShop'));
  assert.match(shop, /api\/payments\/guardian-fortune\/shop-preview/);
  assert.doesNotMatch(shop, /api\/payments\/guardian-fortune\/(?:catalog|balance)/);
  assert.match(shop, /대화권 조회하기/);
  assert.doesNotMatch(shop, /useEffect\(\(\) => \{\s*void loadCatalogAndBalance\(\);/);
  assert.match(shop, /isGuardianFortuneCreditProduct/);
  assert.match(shop, /isGuardianFortuneCreditBalance/);
  assert.match(shop, /tryAcquireShopTicketPreview\("guardian"\)/);
  assert.match(shop, /activeScopeRef\.current = authScope/);
  assert.match(shop, /activeScopeRef\.current !== requestScope/);
  assert.match(shop, /AbortController/);
  assert.match(shop, /signal: requestController\.signal/);
  assert.match(shop, /error\.name === "AbortError"/);
  assert.match(shop, /setIsEnabled\(null\);[\s\S]*setHasLoaded\(false\);[\s\S]*setBalance\(null\);/);
  assert.match(client, /api\/payments\/guardian-fortune\/prepare/);
  assert.match(client, /api\/payments\/guardian-fortune\/confirm/);
  assert.match(client, /product\.priceKrw/);
  assert.match(client, /product\.creditAmount/);
  assert.match(client, /paymentMethod: "pg"/);
  assert.match(shop, /isGuardianFortuneCreditProduct\(payload\.product\)[\s\S]*setProducts\([\s\S]*confirmedProduct[\s\S]*setBalance\(confirmedBalance\)/);
  assert.match(client, /단건 결제로 구매하기/);
  assert.match(client, /보유 이용권이나 family 이용권으로는 구매할 수 없고, 초융합 운세에는 사용할 수 없습니다/);
  assert.doesNotMatch(client, /membershipCreditCost: product\.priceKrw/);
});

test('ticket shop preview handlers keep catalog and balance in one authenticated response', () => {
  const routes = read('worker/routes/payments.js');
  assert.match(routes, /async function handleGuardianFortuneCreditShopPreview[\s\S]*products: listGuardianFortuneCreditProducts\(\)[\s\S]*balance/);
  assert.match(routes, /async function handleFusionFortuneTicketShopPreview[\s\S]*products: getFusionFortuneTicketCatalog\(\)[\s\S]*balance:/);
  assert.match(routes, /async function handleFusionFortuneTicketBalance[\s\S]*ok: true, enabled: true, balance/);
  assert.match(routes, /GET" && path === "\/guardian-fortune\/shop-preview"/);
  assert.match(routes, /GET" && path === "\/fusion-fortune\/shop-preview"/);
});

test('guardian fortune payment cancel paths defer refund to review instead of generic entitlement revocation', () => {
  const routes = read('worker/routes/payments.js');
  assert.match(routes, /GUARDIAN_FORTUNE_REFUND_REVIEW_REQUIRED/);
  assert.match(routes, /guardian_fortune_refund_review_required/);
  assert.match(routes, /guardianFortuneRefundReviewRequired/);
});
