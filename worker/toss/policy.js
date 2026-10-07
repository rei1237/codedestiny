// Platform contracts are deliberately independent of web authentication and PG billing.
export const TOSS_APP_NAME = 'ai-saju-studio';
export const TOSS_ORIGINS = Object.freeze([
  `https://${TOSS_APP_NAME}.apps.tossmini.com`,
  `https://${TOSS_APP_NAME}.private-apps.tossmini.com`,
]);
export class TossError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export function requireTossOrigin(origin) {
  if (!TOSS_ORIGINS.includes(origin)) throw new TossError('ORIGIN_NOT_ALLOWED', 403);
  return origin;
}
export function verifiedUserKey(value) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new TossError('TOSS_IDENTITY_INVALID', 502);
  return String(value);
}
export function validateLoginInput(body) {
  if (!body || typeof body.authorizationCode !== 'string' || !body.authorizationCode.trim()
    || body.authorizationCode.length > 4096 || !['DEFAULT', 'SANDBOX'].includes(body.referrer)) {
    throw new TossError('LOGIN_INPUT_INVALID');
  }
  return { authorizationCode: body.authorizationCode, referrer: body.referrer };
}
export function validateOrderId(orderId) {
  if (typeof orderId !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(orderId)) {
    throw new TossError('ORDER_ID_INVALID');
  }
  return orderId;
}
export function checkOrder(order, {orderId, sku}) {
  if (!order || order.orderId !== orderId || order.sku !== sku) throw new TossError('ORDER_MISMATCH', 403);
  if (order.status === 'REFUNDED') throw new TossError('ORDER_REFUNDED', 409);
  if (!['PAYMENT_COMPLETED', 'PURCHASED'].includes(order.status)) throw new TossError('ORDER_NOT_PAID', 409);
  // The official status API has no amount field. Never call a client amount verified.
  return {orderId, sku, status: order.status, statusDeterminedAt: order.statusDeterminedAt};
}
export function assertGrantReceipt(receipt, orderId) {
  return receipt?.orderId === orderId && receipt?.entitlement === 'granted' && receipt?.durable === true;
}
const events = new Set(['home_view','product_view','example_view','birth_completed','login_start','login_completed',
  'login_cancelled','purchase_started','purchase_failed','purchase_cancelled','purchase_pending','purchase_verified',
  'entitlement_granted','generation_started','generation_completed','generation_failed','generation_recovered',
  'result_first_view','result_engaged','library_reread','share_attempt','share_inbound','revisit','support_open','refund_open']);
const serverEvents = new Set(['purchase_verified','entitlement_granted','generation_started','generation_completed','generation_failed','generation_recovered']);
export function analyticsEvent(name, fields = {}, source = 'client') {
  if (!events.has(name) || (serverEvents.has(name) && source !== 'server')) throw new TossError('EVENT_NOT_ALLOWED');
  const clean = {event: name, source};
  if (['toss', 'sandbox', 'mock'].includes(fields.environment)) clean.environment = fields.environment;
  if (['home','catalog','product','birth','login','purchase','result','library','recovery','settings','support','terms'].includes(fields.screen)) clean.screen = fields.screen;
  if (/^saju_(mackerel|salmon|flounder|tuna)$/.test(fields.productId || '')) clean.productId = fields.productId;
  if (Number.isInteger(fields.completedSections) && fields.completedSections >= 0 && fields.completedSections <= 15) clean.completedSections = fields.completedSections;
  return clean;
}
