/** @jest-environment node */
import { handlePaymentsContext } from '../../worker/payments/index.js';
import { signAuthToken } from '../../worker/lib/auth.js';

const env = { NODE_ENV: 'test', JWT_ACCESS_SECRET: 'synthetic-access-key-for-body-boundary-only', JWT_ISSUER: 'code-destiny-api', JWT_AUDIENCE: 'code-destiny-web' };
const owner = '507f1f77bcf86cd799439011';
const huge = JSON.stringify({ text: 'x'.repeat(256 * 1024) });

test.each(['/webhook', '/orders', '/gifts/claim'])('actual payment handler blocks oversized %s before database or PG', async path => {
  let dbCalls = 0;
  const token = await signAuthToken({ _id: owner, role: 'user' }, env);
  const req = new Request('https://code-destiny.com/api/payments' + path, {
    method: 'POST', body: huge,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, origin: 'https://code-destiny.com' },
  });
  const response = await handlePaymentsContext(req, env, { withDb: async () => { dbCalls += 1; throw new Error('unexpected DB call'); } });
  expect(response.status).toBe(413);
  expect((await response.json()).code).toBe('PAYLOAD_TOO_LARGE');
  expect(dbCalls).toBe(0);
});

test('coin-gate compatibility dispatch cannot buffer a large body before the payment handler', async () => {
  const { default: worker } = await import('../../worker/index.js');
  const response = await worker.fetch(new Request('https://code-destiny.com/api/billing/coin-gate', {
    method: 'POST', body: huge, headers: { 'content-type': 'application/json' },
  }), env, { waitUntil() {} });
  expect(response.status).toBe(413);
});
