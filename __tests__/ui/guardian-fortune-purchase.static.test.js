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
  assert.match(routes, /\/guardian-fortune\/prepare/);
  assert.match(routes, /\/guardian-fortune\/confirm/);
});

test('guardian fortune shop reads server catalog and does not send client price or pass payment', () => {
  const client = read('app/points/PointsClient.tsx');
  assert.match(client, /GuardianFortuneCreditShop/);
  assert.match(client, /api\/payments\/guardian-fortune\/catalog/);
  assert.match(client, /api\/payments\/guardian-fortune\/balance/);
  assert.match(client, /api\/payments\/guardian-fortune\/prepare/);
  assert.match(client, /api\/payments\/guardian-fortune\/confirm/);
  assert.match(client, /product\.priceKrw/);
  assert.match(client, /product\.creditAmount/);
  assert.match(client, /paymentMethod: "pg"/);
  assert.match(client, /단건 결제로 구매하기/);
  assert.match(client, /보유 이용권이나 family 이용권으로는 구매할 수 없고, 초융합 운세에는 사용할 수 없습니다/);
  assert.doesNotMatch(client, /membershipCreditCost: product\.priceKrw/);
});

test('guardian fortune payment cancel paths defer refund to review instead of generic entitlement revocation', () => {
  const routes = read('worker/routes/payments.js');
  assert.match(routes, /GUARDIAN_FORTUNE_REFUND_REVIEW_REQUIRED/);
  assert.match(routes, /guardian_fortune_refund_review_required/);
  assert.match(routes, /guardianFortuneRefundReviewRequired/);
});
