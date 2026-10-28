import test from 'node:test';
import assert from 'node:assert/strict';
import { planPaidConsultationRecovery, partHash, assertSupportPaymentApproval, supportRecoveryEnvironment } from '../../scripts/lib/paid-consultation-support.mjs';
import { isStagingLlmMockEnabled } from '../../worker/lib/staging-llm-mock.js';

const fixture = () => ({ order: { userId: 'owner', featureKey: 'life-book-ai-consultation', merchantUid: 'paid-order', requestId: 'original', status: 'paid' },
  doc: { id: 'stored', userId: 'owner', idempotencyKey: 'original', status: 'generation_failed', generationError: { code: 'ORIGINAL' },
    llmMeta: { waveCount: 21, sections: { 'chapter-1': { attempts: 2 }, 'chapter-4': { attempts: 2 } } } },
  parts: [{ key: 'chapter-1', valid: false, body: null }, { key: 'chapter-4', valid: true, body: { content: 'preserved original' } }] });

test('support recovery cannot inherit a mock success or a different database from the developer environment', () => {
  const inherited={APP_ENV:'staging',STAGING_LLM_MOCK_ENABLED:'true',LLM_DRY_RUN:'true',WORKERS_AI_ENABLED:'false',MONGO_DB_NAME:'other'};
  for (const database of ['code_destiny','code_destiny_staging']) {
    const env=supportRecoveryEnvironment(database,inherited);
    assert.equal(isStagingLlmMockEnabled(env),false);
    assert.equal(env.LLM_DRY_RUN,'false');
    assert.equal(env.MONGO_DB_NAME,database);
    assert.equal(env.MONGODB_DB_NAME,database);
  }
  assert.equal(supportRecoveryEnvironment('code_destiny',inherited).APP_ENV,'production');
  assert.equal(inherited.STAGING_LLM_MOCK_ENABLED,'true');
  assert.throws(()=>supportRecoveryEnvironment('other',inherited),{code:'SUPPORT_DATABASE_REQUIRED'});
});

test('support requires fresh PG approval for the original amount, currency and order before arming', () => {
  const order={merchantUid:'original',paymentAmount:30000}, pg={status:'paid',amount:30000,currency:'KRW',paymentId:'original'};
  assert.doesNotThrow(()=>assertSupportPaymentApproval(order,pg));
  for (const change of [{status:'cancelled'},{status:'ready'},{amount:10000},{currency:'USD'},{paymentId:'other'}]) {
    assert.throws(()=>assertSupportPaymentApproval(order,{...pg,...change}),/SUPPORT_PROVIDER_/);
  }
});
test('support resets only missing parts and preserves the original failure and valid prose hash', () => {
  const f = fixture();
  f.doc.llmMeta.sections['chapter-1'].failure={code:'LLM_PROVIDER_UNAVAILABLE',retryable:false};
  const original = structuredClone(f), p = planPaidConsultationRecovery(f);
  assert.deepEqual(f, original);
  assert.deepEqual(p.missing, ['chapter-1']);
  assert.equal(p.maxProviderCalls, 2);
  assert.equal(p.set['llmMeta.sections.chapter-1.attempts'], 0);
  assert.equal(p.set['llmMeta.sections.chapter-1.failure'], null);
  assert.deepEqual(p.original.sectionFailures['chapter-1'],original.doc.llmMeta.sections['chapter-1'].failure);
  assert.equal(p.set['llmMeta.sections.chapter-4.attempts'], undefined);
  assert.equal(p.preserved['chapter-4'], partHash(f.parts[1].body));
  assert.equal(p.original.generationError.code, 'ORIGINAL');
});
test('a support job can resume but cannot renew its budget after final failure', () => {
  const f = fixture(), p = planPaidConsultationRecovery(f);
  f.doc.llmMeta.supportRecovery = p.set['llmMeta.supportRecovery'];
  assert.throws(() => planPaidConsultationRecovery(f), /SUPPORT_ALREADY_ATTEMPTED/);
  f.doc.status = 'partial';
  assert.equal(planPaidConsultationRecovery(f).action, 'resume');
  assert.equal(f.doc.llmMeta.supportRecovery.callsReserved, 0);
});
test('completed, refunded, wrong owner, wrong request and active generation cannot be rearmed', () => {
  const done = fixture(); done.doc.status = 'completed'; assert.equal(planPaidConsultationRecovery(done).action, 'already_completed');
  for (const mutate of [f => { f.order.status = 'refunded'; }, f => { f.doc.userId = 'other'; },
    f => { f.order.requestId = 'different'; }, f => { f.doc.llmMeta.deliveryRefund = { status: 'pending' }; },
    f => { f.doc.llmMeta.lockedAt = new Date().toISOString(); }]) {
    const f = fixture(); mutate(f); assert.throws(() => planPaidConsultationRecovery(f), /SUPPORT_/);
  }
});
