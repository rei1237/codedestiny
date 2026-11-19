/**
 * @jest-environment node
 *
 * S16 운명 찻집 정체 확정: 완성 판정·정체 감시 기록·정체 확정(rescued / generation_failed + 1회 환불)과 완화 길이 하한.
 * 결과 컬렉션은 메모리 스텁이고 결제·LLM 은 모두 mock 이다.
 */
import { jest } from "@jest/globals";
import createResultStore from "../fixtures/fortune-tea-result-store.cjs";

const USER_ID = "64f0a1b2c3d4e5f678901277";
const NOW = Date.parse("2026-11-19T03:00:00.000Z");
let tea;
let results;
let refundPassCoverage;
let handleBillingRoutes;

function chainStub(result) {
  const chain = { select: () => chain, sort: () => chain, limit: () => chain, lean: async () => result, exec: async () => result };
  return chain;
}
function modelStub() {
  return { findOne: () => chainStub(null), findById: () => chainStub(null), find: () => chainStub([]), exists: async () => null,
    create: async (doc) => doc, updateOne: async () => ({ matchedCount: 0 }) };
}
const fakeDb = { collection: () => results };

beforeAll(async () => {
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    getCurrentUser: jest.fn(async () => ({ userId: USER_ID })), getOptionalUserFromRequest: jest.fn(async () => ({ userId: USER_ID })),
  }));
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    connectDb: jest.fn(async () => undefined), mongoose: { connection: { db: fakeDb } }, resetMongooseConnection: jest.fn(async () => undefined),
    requestPoolRecovery: jest.fn(async () => undefined), resolveMongoDbName: jest.fn(() => "test"), withMongoRetry: jest.fn(async (env, fn) => fn()),
    isTransientMongoError: jest.fn(() => false),
  }));
  jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({
    PAID_FEATURE_ACCESS_USER_PROJECTION: {}, canAccessPaidFeature: jest.fn(async () => ({ allowed: true })),
  }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    PaidExecutionRecord: modelStub(), PointHistory: modelStub(), MonthlyCreditLedger: modelStub(), Payment: modelStub(), User: modelStub(), LlmResponseCache: {},
  }));
  handleBillingRoutes = jest.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }));
  jest.unstable_mockModule("../../worker/routes/billing.js", () => ({ handleBillingRoutes, BILLING_SNAPSHOT_USER_PROJECTION: {} }));
  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({ callGeminiText: jest.fn(async () => { throw new Error("no real LLM in this suite"); }) }));
  refundPassCoverage = jest.fn(async () => ({ refunded: true }));
  const stub = () => jest.fn(async () => ({}));
  jest.unstable_mockModule("../../worker/lib/pass-consumption.js", () => ({
    consultationRefundDb: stub(), findYeongnyangiServicePackEvidence: stub(), refundYeongnyangiServicePack: stub(), refundYeongnyangiMoonstone: stub(),
    passDenialCode: jest.fn(() => ""), hasConsumedPassFeature: stub(), consumePassForFeature: stub(), refundPassUseEvidence: stub(), refundPassCoverage,
  }));
  tea = await import("../../worker/routes/fortune-tea-house.js");
});

beforeEach(() => {
  results = createResultStore();
  refundPassCoverage.mockClear();
  handleBillingRoutes.mockClear();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const GROUPS = [{ key: "a", label: "첫 장", paths: ["summary"] }, { key: "b", label: "둘째 장", paths: ["advice"] }];
async function seed({ status = "partial", parts = { a: { summary: "저장된 유료 본문 첫 장" } }, lock, passSettlement = { cycleKey: "2026-11", cost: 1, featureKey: "fortune-tea-house-saju-consultation" }, extra = {} } = {}) {
  const doc = { _id: "fortune-tea-house-result:stuck", userId: USER_ID, resultId: "tea-stuck", serviceScope: "FORTUNE_TEA_HOUSE", status,
    createdAt: new Date(NOW - 3 * 3600000), updatedAt: new Date(NOW - 600000),
    generationCheckpoint: { groups: GROUPS, parts, attempts: { a: 1, b: 3 }, repairs: [] },
    ...(lock ? { generationLock: lock } : {}), ...(passSettlement ? { passSettlement } : {}), ...extra };
  await results.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
  return { _id: doc._id, userId: USER_ID, resultId: doc.resultId, status, createdAt: doc.createdAt, updatedAt: doc.updatedAt };
}
const read = () => results.findOne({ _id: "fortune-tea-house-result:stuck" });

describe("isFortuneTeaHouseComplete", () => {
  test("passes only when every group has its required fields, without a length check", () => {
    expect(tea.isFortuneTeaHouseComplete({ groups: GROUPS, parts: { a: { summary: "짧" }, b: { advice: "짧" } } })).toBe(true);
    expect(tea.isFortuneTeaHouseComplete({ groups: GROUPS, parts: { a: { summary: "본문" } } })).toBe(false);
    expect(tea.isFortuneTeaHouseComplete({ groups: GROUPS, parts: { a: { summary: "본문" }, b: { advice: "  " } } })).toBe(false);
    expect(tea.isFortuneTeaHouseComplete({ generationCheckpoint: { groups: GROUPS, parts: { a: { summary: "x" }, b: { advice: "y" } } } })).toBe(true);
  });
});

describe("relaxed length floor", () => {
  test("the 2nd attempt accepts 0.6x of the minimum and a round's final attempt accepts 0.3x", () => {
    const floor = tea.__fortuneTeaHouseTestUtils.teaLengthFloor;
    const group = { minChars: 1000 };
    expect(floor(group, 1)).toBe(1250);
    expect(floor(group, 2)).toBe(600);
    expect(floor(group, 3)).toBe(300);
    expect(floor(group, 5)).toBe(600);
    expect(floor(group, 6)).toBe(300);
  });
});

describe("recordDeliveryWatch", () => {
  test("counts a stall without bumping updatedAt", async () => {
    const doc = await seed();
    const first = await tea.recordDeliveryWatch({}, doc, NOW);
    const second = await tea.recordDeliveryWatch({}, doc, NOW + 1000);
    expect(first.stalls).toBe(1);
    expect(second.stalls).toBe(2);
    const row = await read();
    expect(row.deliveryWatch.stalls).toBe(2);
    expect(new Date(row.updatedAt).getTime()).toBe(doc.updatedAt.getTime());
  });
  test("ignores terminal records", async () => {
    const doc = await seed({ status: "completed" });
    expect(await tea.recordDeliveryWatch({}, doc, NOW)).toBeNull();
    expect((await read()).deliveryWatch).toBeUndefined();
  });
});

describe("settleStuckDelivery", () => {
  test("an incomplete stuck record ends as generation_failed with exactly one pass refund and no body", async () => {
    const doc = await seed({ extra: { deliveryRequestId: "req-1", featureKey: "fortune-tea-house-saju-consultation", pricing: { coinPrice: 10 } } });
    const settled = await tea.settleStuckDelivery({}, { doc, now: NOW, model: null });
    expect(settled).toEqual({ outcome: "generation_failed", refundStatus: "refunded" });
    expect(JSON.stringify(settled)).not.toContain("저장된 유료 본문");
    const row = await read();
    expect(row.status).toBe("generation_failed");
    expect(row.generationError).toMatchObject({ code: "DELIVERY_STUCK", retryable: false });
    expect(row.result).toBeUndefined();
    expect(row.passRefund.refundedAt).toBeTruthy();
    expect(refundPassCoverage).toHaveBeenCalledTimes(1);
    expect(refundPassCoverage.mock.calls[0][0]).toMatchObject({ userId: USER_ID, cycleKey: "2026-11", cost: 1, refundId: "tea-stuck" });
    expect(handleBillingRoutes).toHaveBeenCalledTimes(1);
    expect(handleBillingRoutes.mock.calls[0][0].url).toContain("/coin-gate/deferred/cancel");

    // 두 번째 확정 시도는 이미 종결이라 다시 환불하지 않는다.
    expect(await tea.settleStuckDelivery({}, { doc, now: NOW + 1000, model: null })).toEqual({ outcome: "progressed" });
    expect(refundPassCoverage).toHaveBeenCalledTimes(1);
  });

  test("a live lease is left to its worker", async () => {
    const doc = await seed({ status: "generating", lock: { token: "live", startedAt: new Date(NOW - 10000) } });
    expect(await tea.settleStuckDelivery({}, { doc, now: NOW, model: null })).toEqual({ outcome: "leased" });
    expect((await read()).status).toBe("generating");
    expect(refundPassCoverage).not.toHaveBeenCalled();
  });

  test("a stale lease does not block the settle", async () => {
    const doc = await seed({ status: "generating", lock: { token: "dead", startedAt: new Date(NOW - 600000) } });
    expect((await tea.settleStuckDelivery({}, { doc, now: NOW, model: null })).outcome).toBe("generation_failed");
    expect((await read()).generationLock).toBeUndefined();
    expect(refundPassCoverage).toHaveBeenCalledTimes(1);
  });

  test("a complete delivery_pending record is rescued as completed without a refund", async () => {
    const doc = await seed({ status: "delivery_pending", parts: { a: { summary: "첫 장" }, b: { advice: "둘째 장" } } });
    expect(await tea.settleStuckDelivery({}, { doc, now: NOW, model: null })).toEqual({ outcome: "rescued" });
    const row = await read();
    expect(row.status).toBe("completed");
    expect(row.llmMeta).toMatchObject({ usageSettlement: "failed", usageSettlementReason: "DELIVERY_STUCK" });
    expect(refundPassCoverage).not.toHaveBeenCalled();
  });

  test("an incomplete delivery_pending record is failed and refunded, never delivered", async () => {
    const doc = await seed({ status: "delivery_pending" });
    expect((await tea.settleStuckDelivery({}, { doc, now: NOW, model: null })).outcome).toBe("generation_failed");
    expect((await read()).status).toBe("generation_failed");
    expect(refundPassCoverage).toHaveBeenCalledTimes(1);
  });

  test("progress saved meanwhile wins the CAS", async () => {
    const doc = await seed();
    const realFindOne = results.findOne;
    results.findOne = async (query) => {
      const row = await realFindOne(query);
      await results.updateOne({ _id: row._id }, { $set: { updatedAt: new Date(NOW - 1000) } });
      return row;
    };
    expect(await tea.settleStuckDelivery({}, { doc, now: NOW, model: null })).toEqual({ outcome: "progressed" });
    results.findOne = realFindOne;
    expect((await read()).status).toBe("partial");
    expect(refundPassCoverage).not.toHaveBeenCalled();
  });

  test("a refund outage leaves the pending marker for the refund cron", async () => {
    refundPassCoverage.mockRejectedValueOnce(Object.assign(new Error("down"), { code: "PASS_REFUND_UNAVAILABLE" }));
    const doc = await seed();
    expect(await tea.settleStuckDelivery({}, { doc, now: NOW, model: null })).toEqual({ outcome: "generation_failed", refundStatus: "pending" });
    const row = await read();
    expect(row.status).toBe("generation_failed");
    expect(row.passRefund.pendingAt).toBeTruthy();
    expect(row.passRefund.refundedAt).toBeUndefined();
  });
});
