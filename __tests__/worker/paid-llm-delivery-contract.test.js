/** @jest-environment node */
// 유료 LLM 전달 계약 (S5, 2026-11-18) — docs/context/ai-and-db.md "유료 LLM 전달 계약".
// 결제된 생성의 최종 상태는 둘 중 하나여야 한다: completed(본문 있음) 또는 generation_failed + 환불 영수증.
// partial·generating·delivery_pending 에 영구히 머무르면 안 된다.
//
// 두 층:
//  (a) 실동작 — 공용 종결 경로(복구 크론 정체 확정·공용 환불·늦은 차감 분류)를 메모리 DB 위에서 실제로 돌린다.
//      이용권은 "항상 성공" 스텁이 아니라 실제 consumePassForFeature 로 차감하고 실제 refundPassCoverage 로 복원한다.
//      대표 서비스는 상태 기반 공용 환불을 쓰는 new-year-ai(같은 경로: life-book-ai).
//  (b) 커버리지 — 계약 목록의 서비스마다 그 서비스의 전달·환불 테스트가 PAID_LLM_DELIVERY_TESTS 에 있고 실재해야 한다.
//      36개 핸들러의 4시나리오는 각 서비스 테스트가 자기 픽스처로 고정한다(여기서 복제하지 않는다).
import fs from 'node:fs';
import path from 'node:path';
import { Types } from 'mongoose';
import { jest } from '@jest/globals';
import { makeFakePaymentDb } from '../fixtures/fake-payment-db.mjs';
import { consumePassForFeature, passDenialCode } from '../../worker/lib/pass-consumption.js';
import { settleFailedConsultationRefund, runPendingConsultationRefunds } from '../../worker/lib/consultation-delivery-refund.js';
import { lateUsageSettlementFailure, usageSettlementSetFields } from '../../worker/lib/late-usage-settlement.js';
import { STUCK_SETTLERS, GENERIC_STUCK_SETTLERS } from '../../worker/lib/paid-delivery-stuck.js';
import { PAID_LLM_DELIVERY_CONTRACT, PAID_LLM_DELIVERY_TESTS, CONSULTATION_RECOVERY_ADAPTERS } from '../../worker/lib/consultation-recovery-registry.js';
import { NewYearAiConsultation, PointHistory, User } from '../../worker/lib/models.js';
import { MONTHLY_PASS_LIMITS } from '../../worker/lib/profile-limits.js';

// 크론의 withMongoRetry 는 실제 연결을 요구한다 — 연결만 걷어 내고 나머지 경로는 실제 코드를 쓴다.
let runConsultationRecovery;
beforeAll(async () => {
  const db = await import('../../worker/lib/db.js');
  jest.unstable_mockModule('../../worker/lib/db.js', () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, work) => work() }));
  ({ runConsultationRecovery } = await import('../../worker/lib/consultation-recovery-task.js'));
});

const ROOT = process.cwd();
const USER = '64b000000000000000000071';
const FEATURE = 'new-year-ai-consultation';
const SERVICE = 'new-year-ai';
const TIER = 'family'; // 신년운세 300코인은 가족 이용권만 덮는다(premium 건당 상한 100)
const COST = 300;   // 신년운세 3만 원
const BODY = '새해의 흐름을 정리한 본문 '.repeat(200);
const START = Math.floor(Date.now() / 1000) * 1000; // 크론 deadline 이 실제 시계를 본다

// 모델별 테이블. 한 풀에 섞으면 환불 증빙 조회($or requestId/idempotencyKey)가 상담 문서 자신을 결제로 오인한다.
function memoryDb() {
  const tables = new Map();
  const at = Model => { const key = Model?.modelName || 'unknown'; if (!tables.has(key)) tables.set(key, makeFakePaymentDb()); return tables.get(key); };
  const router = {
    rows: Model => at(Model).rows,
    find: (Model, ...args) => at(Model).find(Model, ...args),
    findOne: (Model, ...args) => at(Model).findOne(Model, ...args),
    findOneAndUpdate: (Model, ...args) => at(Model).findOneAndUpdate(Model, ...args),
    updateOne: (Model, ...args) => at(Model).updateOne(Model, ...args),
    insertOne: (Model, ...args) => at(Model).insertOne(Model, ...args),
    deleteOne: (Model, ...args) => at(Model).deleteOne(Model, ...args),
    countDocuments: (Model, ...args) => at(Model).countDocuments(Model, ...args),
    transaction: work => work(router),
  };
  return router;
}

// 복구 크론·정체 확정이 쓰는 mongoose 모델 표면을 같은 테이블 위에 얹는다.
function cronModel(db) {
  const rows = () => db.rows(NewYearAiConsultation);
  const lean = value => ({ lean: async () => value, sort() { return this; }, limit() { return this; }, select() { return this; } });
  return {
    find: filter => lean(rows().filter(row => (filter?.status?.$in || ['generating', 'partial', 'delivery_pending']).includes(row.status)).map(row => structuredCloneKeepId(row))),
    findOne: filter => lean(db.findOne(NewYearAiConsultation, filter)),
    updateOne: async (filter, update) => {
      const out = await db.updateOne(NewYearAiConsultation, filter, update);
      if (out?.modifiedCount || out?.matchedCount) { const row = rows().find(r => r.id === filter.id || String(r._id) === String(filter._id)); if (row) row.updatedAt = new Date(row.updatedAt.getTime() + 1); }
      return out;
    },
    collection: {
      findOne: filter => db.findOne(NewYearAiConsultation, filter),
      updateOne: (filter, update) => db.updateOne(NewYearAiConsultation, filter, update),
    },
  };
}
const structuredCloneKeepId = row => ({ ...JSON.parse(JSON.stringify(row)), _id: row._id, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) });

const expiresAt = () => new Date(START + 10 * 86400000);
function seedUser(db, spent = 0) {
  const at = expiresAt();
  const user = { _id: new Types.ObjectId(USER), points: 0, recentConsumeRequestIds: [],
    profileSubscription: { tier: TIER, passTier: TIER, isActive: true, expiresAt: at, premiumUseCycleKey: at.toISOString(), monthlySpendCoin: spent, monthlyLimitCoin: 0 } };
  db.rows(User).push(user);
  return user;
}
const userRow = db => db.rows(User)[0];
const spend = db => userRow(db).profileSubscription.monthlySpendCoin;
const payWithPass = (db, requestId) => consumePassForFeature({ db, user: userRow(db), entitlement: { tier: TIER, passTier: TIER, isActive: true, expiresAt: expiresAt() },
  userId: USER, featureKey: FEATURE, requestId, coinCost: COST });

function seedConsultation(db, status, extra = {}) {
  const doc = { _id: Types.ObjectId.createFromTime(Math.floor(START / 1000)), id: `session-${status}`, userId: USER, idempotencyKey: `req-${status}`,
    status, accessType: 'pass', featureKey: FEATURE, createdAt: new Date(START), updatedAt: new Date(START),
    llmMeta: { lockedAt: null, lockToken: '', resumeBody: { featureKey: FEATURE }, savedSections: [], ...extra.llmMeta }, ...extra.doc };
  db.rows(NewYearAiConsultation).push(doc);
  return doc;
}
const consultation = db => db.rows(NewYearAiConsultation)[0];
const refundDeps = db => ({ now: START + 7200000, withDb: async (_env, _ctx, work) => work(db),
  fetchPayment: async () => { throw new Error('PG 호출 금지: 이용권 경로'); }, cancelPayment: async () => { throw new Error('PG 호출 금지: 이용권 경로'); } });

// 계약 단언: 종결 상태만 허용한다.
function expectDelivered(db) {
  const doc = consultation(db);
  expect(['partial', 'generating', 'delivery_pending', 'pending']).not.toContain(doc.status);
  if (doc.status === 'completed') {
    expect(JSON.stringify(doc.llmMeta.savedSections || doc.result || '').length).toBeGreaterThan(1000);
    return 'completed';
  }
  expect(doc.status).toBe('generation_failed');
  expect(doc.llmMeta.deliveryRefund).toMatchObject({ status: 'refunded' });
  return 'refunded';
}

async function runCron(db, now, resume) {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    return await runConsultationRecovery({}, { now, connectDb: async () => {}, refundRecovery: async () => ({ outcomes: [] }),
      adapters: [[SERVICE, 'NewYearAiConsultation', {}]], models: { NewYearAiConsultation: cronModel(db) },
      loadAdapter: async () => ({ resumeConsultationOnServer: resume }),
      settleRefund: (env, input) => settleFailedConsultationRefund(env, input, refundDeps(db)) });
  } finally { warn.mockRestore(); log.mockRestore(); }
}

describe('(a) 실동작: 결제된 new-year-ai 생성의 종결', () => {
  test('① 정상: 이용권 실차감 → 본문 completed, 차감 유지', async () => {
    const db = memoryDb(); seedUser(db);
    expect((await payWithPass(db, 'req-generating')).covered).toBe(true);
    expect(spend(db)).toBe(COST);
    const doc = seedConsultation(db, 'generating');
    Object.assign(doc, { status: 'completed' }); doc.llmMeta.savedSections = [{ key: 'opening', text: BODY }];
    expect(expectDelivered(db)).toBe('completed');
    expect(spend(db)).toBe(COST);
  });

  test('② 모든 시도 실패: 정체 감시가 다시 시도 가능 실패로 두고(차감 유지), 7일 안에 못 받으면 이용권을 실복원한다', async () => {
    const db = memoryDb(); seedUser(db);
    await payWithPass(db, 'req-partial');
    seedConsultation(db, 'partial', { llmMeta: { savedSections: [{ key: 'opening', text: '초안' }] } });
    const resume = jest.fn(async () => new Response('{}', { status: 503 }));
    for (let i = 0; i < 7; i += 1) await runCron(db, START + i * 600000, resume);
    expect(resume).toHaveBeenCalledTimes(6);
    // 다시 시도 창: 결과는 숨긴 채 무료 다시 시도를 열어 두고 환불하지 않는다.
    const failed = consultation(db);
    expect(failed.status).toBe('generation_failed');
    expect(failed.llmMeta.retryable).toBeTruthy();
    expect(failed.llmMeta.deliveryRefund).toBeUndefined();
    expect((await runPendingConsultationRefunds({}, refundDeps(db))).outcomes).not.toEqual(expect.arrayContaining([expect.objectContaining({ service: SERVICE })]));
    expect(spend(db)).toBe(COST);
    // 창이 지나면 복구 크론이 환불 대상으로 넘기고, 기존 환불 크론이 실제 복원한다.
    const due = new Date(failed.llmMeta.retryable.refundAt).getTime();
    await runCron(db, due, resume);
    expect(consultation(db).llmMeta.refundEligibleAt).toBe(new Date(due).toISOString());
    await runPendingConsultationRefunds({}, { ...refundDeps(db), now: due + 60000 });
    expect(expectDelivered(db)).toBe('refunded');
    expect(spend(db)).toBe(0);
    expect(consultation(db).llmMeta.savedSections[0].text).toBe('초안'); // 초안은 보존
    const receipts = db.rows(PointHistory).filter(row => row.reason === 'pass_quota_refund');
    expect(receipts).toHaveLength(1);
  });

  test('③ 생성 뒤 늦은 차감 거절: 결과를 버리지 않고 completed + 미차감 표시로 전달한다', async () => {
    const db = memoryDb(); seedUser(db, MONTHLY_PASS_LIMITS[TIER]); // 한도 소진 → 실제 차감이 거절된다
    const denied = await payWithPass(db, 'req-delivery_pending');
    expect(denied.covered).toBe(false);
    const doc = seedConsultation(db, 'delivery_pending', { llmMeta: { savedSections: [{ key: 'opening', text: BODY }] } });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const settlement = lateUsageSettlementFailure({ code: passDenialCode(denied.reason) }, { service: SERVICE, sessionId: doc.id, accessType: 'pass' });
    warn.mockRestore();
    expect(settlement).toMatchObject({ usageSettlement: 'failed' });
    await db.updateOne(NewYearAiConsultation, { id: doc.id }, { $set: { status: 'completed', ...usageSettlementSetFields(settlement) } });
    expect(expectDelivered(db)).toBe('completed');
    expect(spend(db)).toBe(MONTHLY_PASS_LIMITS[TIER]);
  });

  test('③-b 본문 완성 뒤 차감 단계에서 멈춘 delivery_pending 은 정체 감시가 구제 전달한다', async () => {
    const db = memoryDb(); seedUser(db);
    await payWithPass(db, 'req-delivery_pending');
    seedConsultation(db, 'delivery_pending', { llmMeta: { savedSections: [{ key: 'opening', text: BODY }] }, doc: { deliveryWatch: { baseline: 1, stalls: 6 } } });
    const resume = jest.fn();
    await runCron(db, START + 3600000, resume);
    expect(resume).not.toHaveBeenCalled();
    expect(expectDelivered(db)).toBe('completed');
    expect(consultation(db).llmMeta.usageSettlementReason).toBe('DELIVERY_STUCK');
  });

  test('④ 이용권 선차감 뒤 핸들러 종결 실패: 환불 크론이 refundEligibleAt 을 보고 실제 복원한다', async () => {
    const db = memoryDb(); seedUser(db);
    await payWithPass(db, 'req-generation_failed');
    expect(spend(db)).toBe(COST);
    seedConsultation(db, 'generation_failed', { llmMeta: { refundEligibleAt: new Date(START).toISOString() } });
    const out = await runPendingConsultationRefunds({}, refundDeps(db));
    expect(out.outcomes).toEqual(expect.arrayContaining([{ service: SERVICE, refundStatus: 'refunded' }]));
    expect(expectDelivered(db)).toBe('refunded');
    expect(spend(db)).toBe(0);
    // 재실행은 두 번 복원하지 않는다.
    await runPendingConsultationRefunds({}, refundDeps(db));
    await settleFailedConsultationRefund({}, { service: SERVICE, id: consultation(db).id, userId: USER }, refundDeps(db));
    expect(spend(db)).toBe(0);
    expect(db.rows(PointHistory).filter(row => row.reason === 'pass_quota_refund')).toHaveLength(1);
  });
});

describe('(b) 커버리지: 계약의 모든 서비스가 자기 전달 테스트를 가진다', () => {
  const services = PAID_LLM_DELIVERY_CONTRACT.map(entry => entry.service);
  test('계약 목록과 테스트 표가 정확히 같다', () => {
    expect(Object.keys(PAID_LLM_DELIVERY_TESTS).sort()).toEqual([...services].sort());
  });
  test.each(PAID_LLM_DELIVERY_CONTRACT.map(entry => [entry.service, entry]))('%s', (service, entry) => {
    const file = PAID_LLM_DELIVERY_TESTS[service];
    expect(file).toMatch(/^__tests__\/(worker|ui)\/.+\.test\.m?js$/);
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    // 그 테스트가 실제로 이 서비스의 모듈이나 판매 키를 다룬다(엉뚱한 파일로 표만 채우는 것을 막는다).
    const needles = [...entry.files.map(f => f.replace(/^worker\//, '').replace(/\.(js|ts)$/, '')), ...entry.featureKeys.map(k => k.replace('*', ''))];
    expect(needles.some(needle => text.includes(needle))).toBe(true);
  });
  test('정체 확정 서비스는 복구 어댑터이고, 상태 기반 공용 환불 또는 자기 settleStuckDelivery 로 확정한다', () => {
    const recovery = CONSULTATION_RECOVERY_ADAPTERS.map(([route]) => route);
    for (const service of STUCK_SETTLERS) {
      expect(recovery).toContain(service);
      const entry = PAID_LLM_DELIVERY_CONTRACT.find(row => row.service === service);
      if (GENERIC_STUCK_SETTLERS.includes(service)) expect(entry.refunds).toContain('settleFailedConsultationRefund');
      else expect(entry.files.some(f => /export\s+(?:async\s+)?function\s+settleStuckDelivery\b/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')))).toBe(true);
    }
  });
});
