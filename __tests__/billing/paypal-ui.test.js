/** @jest-environment node */
const { JSDOM } = require('jsdom');
const entry = require('../../js/core/checkout-entry.js');
const quote = { currency: 'USD', totalAmount: 733, priceKRW: 9900, rateDate: '2026-10-02' };
const request = { paymentId: 'order-test', orderName: '<script>unsafe</script>', totalAmount: 9900, storeId: 'test-store', channelKey: 'test-channel', payMethod: 'EASY_PAY', bypass: { inicis_v2: {} } };
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
  expect(sent.payMethod).toBeUndefined(); expect(sent.bypass).toBeUndefined();
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
