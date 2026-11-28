import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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

test('S7: refund failures, held narratives and manual-review consultations are listed without owner data', () => {
  const report = classifyPaidOrphans({ now: new Date('2026-11-30T00:00:00Z'),
    payments: [pay({ _id: 'rf-old', paymentAmount: 9900, metadata: { refundStatus: 'refund_failed', refundFailedAt: new Date('2026-11-20T00:00:00Z') } }),
      pay({ _id: 'rf-new', metadata: { refundStatus: 'refund_failed', refundFailedAt: new Date('2026-11-29T00:00:00Z'), refundRetry: { count: 2 } } }),
      pay({ _id: 'rf-manual', metadata: { refundStatus: 'refund_failed', refundFailedAt: new Date('2026-11-29T00:00:00Z'), refundRetry: { count: 5, manualReview: true } } })],
    transactions: [{ _id: 'n1', userId: 'owner', status: 'pending', featureKey: 'geomancy', createdAt: old,
      metadata: { tossPaidNarrative: true, paidNarrativeRetry: { heldAt: old, holdCode: 'PAID_NARRATIVE_REFUND_EVIDENCE_MISSING' } } },
      { _id: 'n2', userId: 'owner', status: 'refunded', metadata: { paidNarrativeRetry: { heldAt: old } } }],
    results: [{ _id: 'c1', userId: 'owner', collection: 'newYearAiConsultations', status: 'generation_failed', accessSource: 'toss', llmMeta: { refundEligibleAt: old } },
      { _id: 'c2', userId: 'owner', status: 'generation_failed', llmMeta: { deliveryRefund: { status: 'manual_review', code: 'X_REVIEW' } } },
      { _id: 'c3', userId: 'owner', status: 'generation_failed', llmMeta: { refundEligibleAt: old } }] });
  assert.deepEqual(report.refundFailures.map(row => [row.autoRetry, row.manualReview, row.retryCount]), [[false, false, 0], [true, false, 2], [false, true, 5]]);
  assert.equal(report.refundFailures[0].amount, 9900);
  assert.deepEqual(report.heldNarratives.map(row => [row.code, row.toss]), [['PAID_NARRATIVE_REFUND_EVIDENCE_MISSING', true]]);
  assert.deepEqual(report.consultationReviews.map(row => row.code), ['TOSS_ORDER_REVIEW_REQUIRED', 'X_REVIEW']);
  assert.ok(!JSON.stringify(report).includes('owner'));
});

test('yeongnyangi_requests: same-owner rows prove delivery, and each payment prefix only matches its own service', () => {
  const yn = (over = {}) => pay({ featureKey: 'yeongnyangi-saju-mackerel', merchantUid: `m-${over._id}`, ...over });
  const report = classifyPaidOrphans({ now,
    payments: [yn({ _id: 'y1', requestId: 'yn-r1' }), yn({ _id: 'y2', requestId: 'yn-r2' }), yn({ _id: 'y3', requestId: 'yn-r3' }),
      yn({ _id: 'y4', requestId: 'yn-r4' }), yn({ _id: 'y5', requestId: 'fc-r5' }), yn({ _id: 'y6', requestId: '' })],
    yeongnyangiRequests: [{ _id: 'r1', userId: 'owner', state: 'COMPLETED', paymentId: 'y1' },
      { _id: 'r2', userId: 'owner', state: 'FORTUNE_FAILED', paymentId: null },
      { _id: 'r3', userId: 'other', state: 'COMPLETED', paymentId: 'y3' },
      { _id: 'r4', userId: 'owner', state: 'COMPLETED', persona: 'yeoni' },
      { _id: 'r5', userId: 'owner', state: 'COMPLETED', persona: 'neo' },
      { _id: 'r6', userId: 'owner', state: 'COMPLETED', perUseSource: 'payment', perUseEvidenceId: 'y6' }] });
  const ref = value => createHash('sha256').update(value).digest('hex').slice(0, 12);
  const states = Object.fromEntries(report.leads.map(row => [row.ref, row.state]));
  assert.deepEqual(report.byFeature['yeongnyangi-saju-mackerel'], { delivered: 3, undelivered: 1, evidenceNotFound: 2 });
  assert.deepEqual(states, { [ref('y2')]: 'undelivered', [ref('y3')]: 'evidenceNotFound', [ref('y4')]: 'evidenceNotFound' });
  assert.ok(!JSON.stringify(report).includes('owner'));
});
