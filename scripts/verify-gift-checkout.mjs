import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const origin = process.env.GIFT_UI_ORIGIN || 'http://127.0.0.1:18290';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname));
const browser = await chromium.launch();
try {
  for (const width of [360, 390, 430, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    let prepared, sdkRequest, confirms = 0;
    const user = { id: '64b000000000000000000001', _id: '64b000000000000000000001', name: '테스트 계정', email: 'test@example.invalid', phoneNumber: '01012345678' };
    const gift = { giftId: 'gift_mock-checkout', orderId: 'mock-checkout', status: 'PENDING_PAYMENT', tokenVersion: 0, product: { name: '스탠다드 30일', tier: 'standard', durationDays: 30, wonPrice: 9900 } };
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
      const send = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, ...data }) });
      if (url.pathname === '/api/auth/me') return send({ user });
      if (url.pathname === '/api/payments/me') return send({ user, subscription: { tier: 'free', isActive: false }, payments: [], transactions: [] });
      if (url.pathname === '/api/payments/config') return send({ storeId: 'store-mock', channelKey: 'channel-card-mock', kakaopayChannelKey: 'channel-kakao-mock', configured: true, currency: 'CURRENCY_KRW' });
      if (url.pathname === '/api/payments/subscription/prepare') {
        prepared = route.request().postDataJSON();
        return send({ order: { merchantUid: 'mock-checkout', customerUid: 'mock-customer', amount: prepared.amount, currency: 'KRW', status: 'pending', purchaseType: 'GIFT', customer: { phoneNumber: '01012345678' } } });
      }
      if (url.pathname === '/api/payments/subscription/confirm') { confirms++; gift.status = 'PAID'; return send({ purchaseType: 'GIFT' }); }
      if (url.pathname === '/api/payments/gifts/gift_mock-checkout') return send({ gift });
      return route.continue();
    });
    const page = await context.newPage();
    await page.exposeFunction('recordGiftSdk', data => { sdkRequest = data; });
    await page.addInitScript(user => {
      localStorage.setItem('fortune_auth_user', JSON.stringify(user));
      window.PortOne = { requestPayment: async data => {
        await window.recordGiftSdk(data);
        location.assign(data.redirectUrl);
        return new Promise(() => {});
      } };
    }, user);
    await page.goto(origin + '/points/');
    await page.getByRole('button', { name: '선물하기', exact: true }).first().click({ timeout: 90000 });
    await page.getByLabel('선물 메시지 (선택)').fill('응원해요');
    await page.getByRole('dialog').getByRole('checkbox').check();
    const methods = await page.locator('[data-pass-pay-method]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-pass-pay-method')));
    const method = width === 390 ? methods.find(x => /kakao/i.test(x)) : methods[0];
    assert.ok(method, 'Requested payment method must be present');
    await page.locator(`[data-pass-pay-method="${method}"]`).click();
    await page.getByRole('heading', { name: '선물이 준비되었습니다' }).waitFor({ timeout: 90000 });
    assert.equal(prepared.purchaseType, 'GIFT');
    assert.equal(prepared.gift.giftMessage, '응원해요');
    assert.equal(new URL(sdkRequest.redirectUrl).pathname, '/gift/complete');
    assert.equal(new URL(sdkRequest.redirectUrl).searchParams.get('orderId'), 'mock-checkout');
    assert.equal(confirms, 1);
    assert.ok(!Object.keys(await page.evaluate(() => ({ ...localStorage }))).some(key => /pending.*subscription|subscription.*pending/i.test(key)));
    console.log({ width, method, purchaseType: prepared.purchaseType, confirms, redirect: '/gift/complete' });
    await context.close();
  }
} finally { await browser.close(); }
