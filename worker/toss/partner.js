import {TossError, validateLoginInput, validateOrderId, verifiedUserKey} from './policy.js';

const BASE = 'https://apps-in-toss-api.toss.im';
const PATH = '/api-partner/v1/apps-in-toss/';
const operations = Object.freeze({
  token: ['POST', 'user/oauth2/generate-token'],
  me: ['GET', 'user/oauth2/login-me'],
  order: ['POST', 'order/get-order-status'],
  unlink: ['POST', 'user/oauth2/access/remove-by-user-key'],
});

// Cloudflare mTLS binding, never https.Agent or a global fetch fallback.
export async function partnerRequest(env, operation, {body, accessToken, userKey} = {}) {
  const spec = operations[operation];
  if (!spec) throw new TossError('PARTNER_OPERATION_INVALID', 500);
  if (!env.TOSS_MTLS?.fetch) throw new TossError('TOSS_MTLS_NOT_CONFIGURED', 503);
  const expiry = Date.parse(env.TOSS_MTLS_EXPIRES_AT || '');
  if (!Number.isFinite(expiry) || expiry <= Date.now()) throw new TossError('TOSS_MTLS_EXPIRED', 503);
  const headers = {'Content-Type': 'application/json', Accept: 'application/json'};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (operation === 'order') {
    if (!/^[1-9]\d*$/.test(userKey || '')) throw new TossError('TOSS_IDENTITY_REQUIRED', 401);
    headers['x-toss-user-key'] = userKey;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await env.TOSS_MTLS.fetch(BASE + PATH + spec[1], {
      method: spec[0], headers, ...(body ? {body: JSON.stringify(body)} : {}),
      signal: controller.signal, redirect: 'error',
    });
    if (!response.ok) throw new TossError('TOSS_PARTNER_UNAVAILABLE', 502);
    const result = await response.json();
    if (result.resultType !== 'SUCCESS' || !result.success) throw new TossError('TOSS_PARTNER_REJECTED', 502);
    return result.success;
  } catch (error) {
    if (error instanceof TossError) throw error;
    // Never propagate provider bodies, tokens, authorization codes or TLS details to logs/UI.
    throw new TossError('TOSS_PARTNER_UNAVAILABLE', 502);
  } finally { clearTimeout(timer); }
}
export async function loginIdentity(env, input) {
  const grant = validateLoginInput(input);
  const token = await partnerRequest(env, 'token', {body: grant});
  if (typeof token.accessToken !== 'string' || !token.accessToken) throw new TossError('TOSS_TOKEN_INVALID', 502);
  const profile = await partnerRequest(env, 'me', {accessToken: token.accessToken});
  // Email, birthday and other optional encrypted profile fields are neither required nor retained.
  return {userKey: verifiedUserKey(profile.userKey), referrer: grant.referrer};
}
export function lookupOrder(env, userKey, orderId) {
  return partnerRequest(env, 'order', {userKey, body: {orderId: validateOrderId(orderId)}});
}
export function unlinkIdentity(env, userKey) {
  if (!/^[1-9]\d*$/.test(userKey || '')) throw new TossError('TOSS_IDENTITY_REQUIRED', 401);
  return partnerRequest(env, 'unlink', {body: {userKey: Number(userKey)}});
}
