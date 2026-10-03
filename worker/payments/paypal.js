import { getPortOneConfig } from '../lib/portone.js';
import { paymentError } from './errors.js';

// The product remains priced in KRW. Only the PG charge is USD cents.
export function paypalConfigured(env) {
  const config = getPortOneConfig(env);
  return String(env?.PAYPAL_ENABLED || '') === '1' && Boolean(config.portonePaypalChannelKey
    && config.portoneStoreId && config.portoneApiSecret && config.portoneWebhookSecret);
}

export async function preparePaypalCharge(env, method, priceKRW, { fetchImpl = fetch, now = Date.now() } = {}) {
  if (String(method || '').toLowerCase() !== 'paypal') return null;
  if (!paypalConfigured(env)) throw paymentError('PAYPAL_NOT_CONFIGURED', 'PayPal 결제가 아직 준비되지 않았습니다. 다른 결제수단을 선택해 주세요.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetchImpl('https://api.frankfurter.dev/v2/providers/ecb/rate/krw/usd', { signal: controller.signal });
    if (!response.ok) throw new Error('FX unavailable');
    const quote = await response.json();
    const age = now - Date.parse(quote.date);
    if (quote.base !== 'KRW' || quote.quote !== 'USD' || !Number.isFinite(quote.rate) || quote.rate <= 0
      || !Number.isFinite(age) || age < -86400000 || age > 7 * 86400000) throw new Error('FX invalid');
    const totalAmount = Math.round(Number(priceKRW) * quote.rate * 100);
    if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0) throw new Error('Amount invalid');
    return { currency: 'USD', totalAmount, priceKRW: Number(priceKRW), rate: quote.rate,
      rateDate: quote.date, quotedAt: new Date(now).toISOString(), source: 'Frankfurter/ECB' };
  } catch {
    throw paymentError('PAYPAL_FX_UNAVAILABLE', '달러 결제 금액을 확인하지 못했어요. 잠시 후 다시 시도하거나 다른 결제수단을 선택해 주세요.');
  } finally { clearTimeout(timer); }
}

// A pending charge can still complete in its original PG window. Never change its rail or quote.
export function assertPaypalOrderMatches(order, { paymentMethod, priceKRW }) {
  if (String(order?.status || '') !== 'pending') return;
  const charge = order?.metadata?.paypalCharge;
  const requested = String(paymentMethod || '').toLowerCase() === 'paypal';
  if (!requested && !charge) return;
  if (requested !== Boolean(charge) || (charge && Number(charge.priceKRW) !== Number(priceKRW))) {
    throw paymentError('PAYPAL_ORDER_CONFLICT', '진행 중인 주문의 결제 상태를 먼저 확인해 주세요. 다른 수단으로 다시 결제하지 마세요.');
  }
}

export function paypalChargeForOrder(order) {
  const charge = order?.metadata?.paypalCharge;
  if (!charge) {
    if (String(order?.paymentMethod || '').toLowerCase() === 'paypal') throw paymentError('PAYPAL_ORDER_CONFLICT', 'PayPal 주문의 통화 정보가 없습니다.');
    return null;
  }
  if (charge.currency !== 'USD' || !Number.isSafeInteger(charge.totalAmount) || charge.totalAmount <= 0
    || Number(charge.priceKRW) !== Number(order.paymentAmount)) {
    throw paymentError('PAYPAL_ORDER_CONFLICT', '저장된 PayPal 주문 금액을 확인할 수 없습니다. 결제 내역을 확인해 주세요.');
  }
  return charge;
}

// Operator amounts remain KRW; the provider API always receives the frozen USD minor units.
export function paypalCancellationAmounts(order, amounts = {}) {
  const charge = paypalChargeForOrder(order);
  if (!charge) return amounts;
  const result = { ...amounts };
  for (const key of ['amount', 'checksum', 'currentCancellableAmount']) {
    if (amounts[key] == null) continue;
    const value = Number(amounts[key]);
    if (!Number.isSafeInteger(value) || value <= 0 || value > charge.priceKRW) throw paymentError('INVALID_REQUEST', '환불 금액을 확인해 주세요.');
    const cents = Math.round(value * charge.totalAmount / charge.priceKRW);
    if (!Number.isSafeInteger(cents) || cents <= 0) throw paymentError('INVALID_REQUEST', 'USD 최소 환불 단위보다 작은 금액입니다.');
    result[key] = cents;
  }
  return result;
}
