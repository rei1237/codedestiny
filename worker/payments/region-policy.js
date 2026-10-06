import { paymentError } from './errors.js';

// Only Cloudflare request metadata is authoritative. Body, language, cookies and
// client-supplied country headers must not unlock domestic payment methods.
export function paymentRegion(request) {
  const country = String(request?.cf?.country || '').trim().toUpperCase();
  return { country: country || null, paypalOnly: Boolean(country) && country !== 'KR' };
}

export function assertRegionalPaymentMethod(request, method) {
  if (paymentRegion(request).paypalOnly && String(method || '').trim().toLowerCase() !== 'paypal') {
    throw paymentError('PAYPAL_REQUIRED_FOR_REGION', 'Please use PayPal for payments from outside Korea.');
  }
}
