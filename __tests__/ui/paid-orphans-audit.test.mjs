import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPaidOrphans } from '../../scripts/audit-paid-orphans.mjs';

const now = new Date('2026-11-22T00:00:00Z'), old = new Date('2026-11-20T00:00:00Z'), fresh = new Date('2026-11-21T23:00:00Z');
const pay = (over = {}) => ({ _id: 'p1', userId: 'owner', status: 'paid', featureKey: 'life-book-ai-consultation',
  merchantUid: 'order-1', requestId: 'req-1', paidAt: old, ...over });

test('a paid order is delivered only through evidence owned by the same account', () => {
  const report = classifyPaidOrphans({ now, payments: [pay(), pay({ _id: 'p2', merchantUid: 'order-2', requestId: 'req-2' })],
    results: [{ _id: 'r1', userId: 'owner', idempotencyKey: 'req-1', status: 'completed', body: 'PRIVATE PROSE' },
      { _id: 'r2', userId: 'other', idempotencyKey: 'req-2', status: 'completed' }] });
  assert.deepEqual(report.byFeature['life-book-ai-consultation'], { delivered: 1, undelivered: 0, evidenceNotFound: 1 });
  assert.equal(report.leads.length, 1);
  assert.ok(!JSON.stringify(report).includes('PRIVATE PROSE'));
  assert.ok(!JSON.stringify(report).includes('owner'));
});

test('refunded and fresh orders are excluded; stuck ledgers and palm orders are listed', () => {
  const report = classifyPaidOrphans({ now, payments: [pay({ metadata: { refundStatus: 'done' } }), pay({ _id: 'p3', paidAt: fresh }),
    pay({ _id: 'p4', featureKey: 'palm-reading-general', merchantUid: 'order-4', requestId: '' })],
    executions: [{ _id: 'e1', userId: 'owner', status: 'paid_pending_generation', createdAt: old, featureId: 'x' }],
    transactions: [{ _id: 't1', userId: 'owner', status: 'pending', deliveryStatus: 'generating', createdAt: old, featureKey: 'y' },
      { _id: 't2', userId: 'owner', status: 'pending', deliveryStatus: 'delivered', createdAt: old }] });
  assert.equal(report.leads.length, 1);
  assert.deepEqual(report.palmOrders.map(row => row.state), ['evidenceNotFound']);
  assert.equal(report.stuckExecutions.length, 1);
  assert.equal(report.stuckTransactions.length, 1);
});

test('a toss purchase without a saved native result is an orphan lead', () => {
  const report = classifyPaidOrphans({ now,
    tossPurchases: [{ _id: 'tp1', ownerId: 'o', status: 'PURCHASED', verifiedAt: old },
      { _id: 'tp2', ownerId: 'o', status: 'PURCHASED', verifiedAt: old }],
    tossConsultations: [{ ownerId: 'o', orderId: 'tp2', savedResult: true }] });
  assert.equal(report.tossOrphans.length, 1);
});
