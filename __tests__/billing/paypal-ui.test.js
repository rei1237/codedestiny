/** @jest-environment node */
const { JSDOM } = require('jsdom');
const entry = require('../../js/core/checkout-entry.js');
const quote = { currency: 'USD', totalAmount: 733, priceKRW: 9900, rateDate: '2026-10-02' };
const request = { paymentId: 'order-test', orderName: '<script>unsafe</script>', totalAmount: 9900, storeId: 'test-store', channelKey: 'test-channel', customer: { customerId: 'buyer-test', email: 'buyer@example.test' }, payMethod: 'EASY_PAY', bypass: { inicis_v2: {} } };
let dom;
beforeEach(() => { dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://example.test' }); global.window = dom.window; global.document = dom.window.document; });
afterEach(() => { dom.window.close(); delete global.window; delete global.document; });
test('PayPal stays closed until configured and uses USD SPB rather than requestPayment', async () => {
  expect(entry.isDirectPayMethodEnabled('PAYPAL')).toBe(false);
  entry.setDirectPayMethodAvailability({ paypalChannelKey: 'test-channel' });
  expect(entry.setSelectedDirectPayMethod('PAYPAL')).toBe('PAYPAL');
  expect(entry.resolveDirectPayFields()).toMatchObject({ channelKeyName: 'paypalChannelKey', orderMethod: 'paypal' });
  let sent, callbacks;
  window.PortOne = { requestPayment: jest.fn(), loadPaymentUI: jest.fn((data, options) => { sent = data; callbacks = options; }) };
  const payment = entry.requestPaypalPayment(request, quote);
  await Promise.resolve(); await Promise.resolve();
  expect(document.getElementById('cdPaypalAmount').textContent).toContain('7.33');
  expect(document.getElementById('cdPaypalCheckout').querySelector('script')).toBeNull();
  expect(sent).toMatchObject({ uiType: 'PAYPAL_SPB', totalAmount: 733, currency: 'USD', products: [{ type: 'DIGITAL', amount: 733 }] });
  expect(sent.payMethod).toBeUndefined();
  expect(sent.bypass).toEqual({ paypal_v2: { additional_data: [{ key: 'sender_account_id', value: 'buyer-test' }, { key: 'sender_email', value: 'buyer@example.test' }] } });
  expect(window.PortOne.requestPayment).not.toHaveBeenCalled();
  callbacks.onPaymentSuccess({ paymentId: 'order-test' });
  await expect(payment).resolves.toEqual({ paymentId: 'order-test' });
  expect(document.getElementById('cdPaypalCheckout')).toBeNull();
});
test('closing checks the existing order instead of declaring a payment cancelled', async () => {
  window.PortOne = { loadPaymentUI: jest.fn() };
  const payment = entry.requestPaypalPayment(request, quote);
  document.querySelector('#cdPaypalCheckout button').click();
  await expect(payment).resolves.toEqual({ paymentId: 'order-test' });
});
test('invalid USD quote is rejected before rendering buttons', async () => {
  window.PortOne = { loadPaymentUI: jest.fn() };
  await expect(entry.requestPaypalPayment(request, { ...quote, priceKRW: 1 })).rejects.toThrow();
  expect(window.PortOne.loadPaymentUI).not.toHaveBeenCalled();
});

test('overseas IP enables only PayPal regardless of Korean UI; domestic users retain existing methods', () => {
  document.cookie = 'cd_geo_country=JP; path=/';
  window.cdGetCurrentLanguage = () => 'ko';
  expect(entry.isDirectPayMethodEnabled('CARD')).toBe(false);
  entry.setDirectPayMethodAvailability({ paypalChannelKey: 'test-channel', kakaopayChannelKey: 'test-kakao', paymentRegion: { country: 'JP', paypalOnly: true } });
  for (const id of entry.DIRECT_PAY_METHOD_ORDER) expect(entry.isDirectPayMethodEnabled(id)).toBe(id === 'PAYPAL');
  expect(entry.setSelectedDirectPayMethod('CARD')).toBe('');
  expect(entry.setSelectedDirectPayMethod('PAYPAL')).toBe('PAYPAL');
  entry.setDirectPayMethodAvailability({ paypalChannelKey: 'test-channel', kakaopayChannelKey: 'test-kakao', paymentRegion: { country: 'KR', paypalOnly: false } });
  expect(entry.isDirectPayMethodEnabled('CARD')).toBe(true);
});

test('regional config closes already rendered domestic buttons and clears an earlier selection', () => {
  entry.setSelectedDirectPayMethod('CARD');
  document.body.innerHTML = '<button data-pay-method="CARD">Card</button><button data-pay-method="PAYPAL" class="is-disabled">PayPal</button>';
  entry.setDirectPayMethodAvailability({ paypalChannelKey: 'test-channel', paymentRegion: { country: 'CN', paypalOnly: true } });
  expect(document.querySelector('[data-pay-method="CARD"]').disabled).toBe(true);
  expect(document.querySelector('[data-pay-method="PAYPAL"]').getAttribute('aria-disabled')).toBeNull();
  expect(entry.peekSelectedDirectPayMethod()).toBe('');
});

test('PayPal resources are permitted by both shipping CSP files without widening default access', () => {
  const fs = require('node:fs'), path = require('node:path');
  for (const file of ['_headers', 'public/_headers']) {
    const policies = fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8').split('\n').filter((line) => line.includes('Content-Security-Policy:'));
    expect(policies).toHaveLength(2);
    for (const policy of policies) {
      // Pages CSP lines must fit its 2,000-character per-line limit.
      expect(policy.length).toBeLessThanOrEqual(2000);
      const directives = policy.slice(policy.indexOf(':') + 1).trim().split(';').map((rule) => rule.trim().split(/\s+/));
      for (const name of ['script-src', 'script-src-elem', 'connect-src', 'frame-src', 'style-src', 'style-src-elem']) {
        const fallback = name === 'script-src-elem' ? 'script-src' : name === 'style-src-elem' ? 'style-src' : name;
        expect(directives.find((rule) => rule[0] === name) || directives.find((rule) => rule[0] === fallback)).toEqual(expect.arrayContaining(['https://*.paypal.com', 'https://*.paypalobjects.com']));
      }
      expect(directives.find((rule) => rule[0] === 'default-src')).toEqual(['default-src', "'self'"]);
      expect(directives.find((rule) => rule[0] === 'object-src')).toEqual(['object-src', "'none'"]);
    }
  }
});
