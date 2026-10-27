import test from 'node:test';
import assert from 'node:assert/strict';
import { joinPaidConsultationOrders } from '../../scripts/audit-paid-consultation-delivery.mjs';
test('delivery audit joins the original owner and execution evidence without exposing result prose', () => {
  const result = joinPaidConsultationOrders([{ _id: 'payment', merchantUid: 'order', userId: 'owner', featureKey: 'new-year-ai-consultation', requestId: 'original', status: 'paid' }],
    [{ id: 'right', userId: 'owner', paymentId: 'execution', status: 'completed', bodyParts: 6, assistantChars: 24000, messages: [{ content: 'PRIVATE PROSE' }] },
      { id: 'wrong', userId: 'other', idempotencyKey: 'original', status: 'completed' }],
    [{ _id: 'execution', userId: 'owner', featureId: 'new-year-ai-consultation', orderId: 'order', status: 'completed' }]);
  assert.equal(result[0].results.length, 1); assert.equal(result[0].results[0].resultId, 'right');
  assert.ok(!JSON.stringify(result).includes('PRIVATE PROSE'));
});
