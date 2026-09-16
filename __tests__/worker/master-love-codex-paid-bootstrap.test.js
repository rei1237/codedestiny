/** @jest-environment node */
import { jest } from '@jest/globals';
import { bootstrapPaidCodexSessions } from '../../worker/lib/master-love-codex-paid-bootstrap.js';
import { prepareResumeContext } from '../../worker/payments/resume-context.js';

const env = { PII_ENC_KEY: Buffer.alloc(32, 7).toString('base64') };
function fixture(order, existing = null) {
  let session = existing;
  const query = value => ({ lean: async () => value });
  const orders = { find: jest.fn(() => ({ sort() { return this; }, limit() { return this; }, lean: async () => [order] })), updateOne: jest.fn(async () => ({ matchedCount: 1 })) };
  const options = { Payment: orders, MasterLoveCodexSession: { findOne: jest.fn(() => query(session)) },
    startCodexSession: jest.fn(async (_request, _env, auth, body) => {
      session = { id: 'original-book', userId: auth.userId, paymentId: body.paymentId, status: 'generating' };
      return Response.json({ ok: true, sessionId: session.id });
    }), ensureExecution: jest.fn(async () => {}), syncCodexExecution: jest.fn(async () => true),
  };
  return { orders, options };
}
for (const mode of ['solo', 'compat']) test(`${mode}: approved purchase creates a session after the document closes before /start`, async () => {
  const birthInfo = { birthDate: '1990-05-12', birthTime: '09:30', gender: 'female', calendarType: 'solar' };
  const input = { birthInfo, locale: 'ja', ...(mode === 'compat' ? { partnerInfo: { ...birthInfo, birthDate: '1991-02-03' } } : {}) };
  const order = { merchantUid: 'owned-payment', userId: 'owned-user', requestId: 'original-key', featureKey: mode === 'solo' ? 'master-love-codex' : 'master-love-codex-compat', status: 'paid' };
  order.metadata = { paidResume: await prepareResumeContext({ originPath: '/master-love-codex', resume: { kind: 'master-love-codex', args: { idempotencyKey: 'original-key', payload: JSON.stringify(input) } } }, { ...order, env }) };
  const { options, orders } = fixture(order);
  expect(await bootstrapPaidCodexSessions(env, options)).toEqual([{ orderId: 'owned-payment', sessionId: 'original-book', outcome: 'session_created' }]);
  expect(options.startCodexSession.mock.calls[0][2]).toEqual({ userId: 'owned-user' });
  expect(options.startCodexSession.mock.calls[0][3]).toMatchObject({ ...input, paymentId: 'owned-payment', idempotencyKey: 'original-key' });
  expect(options.ensureExecution).toHaveBeenCalledTimes(1);
  expect(orders.updateOne.mock.calls[0][1].$set['metadata.codexRecovery'].status).toBe('session_created');
});
test('missing historical input retains purchase rights and requests re-entry', async () => {
  const { options, orders } = fixture({ merchantUid: 'old-payment', userId: 'u', featureKey: 'master-love-codex', status: 'paid' });
  expect(await bootstrapPaidCodexSessions(env, options)).toEqual([{ orderId: 'old-payment', outcome: 'input_required' }]);
  expect(options.startCodexSession).not.toHaveBeenCalled();
  expect(orders.updateOne.mock.calls[0][1].$set).toEqual({ 'metadata.codexRecovery': expect.objectContaining({ status: 'input_required' }) });
});
test.each(['cancelled', 'refunded', 'pending'])('%s purchase does not bootstrap or register an execution', async status => {
  const { options } = fixture({ merchantUid: 'payment', userId: 'u', featureKey: 'master-love-codex', status });
  expect(await bootstrapPaidCodexSessions(env, options)).toEqual([]);
  expect(options.startCodexSession).not.toHaveBeenCalled(); expect(options.ensureExecution).not.toHaveBeenCalled();
});
test('existing completed purchase only synchronizes its execution', async () => {
  const { options } = fixture({ merchantUid: 'payment', userId: 'u', featureKey: 'master-love-codex', status: 'paid' }, { id: 'saved', status: 'completed' });
  await bootstrapPaidCodexSessions(env, options);
  expect(options.startCodexSession).not.toHaveBeenCalled(); expect(options.syncCodexExecution).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
});
