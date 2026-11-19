/**
 * @jest-environment node
 *
 * R7 운명 찻집 다시 시도 먼저: 정체 보류, /retry(추가 결제·차감 없음), /refund-request, 창(생성 + 7일) 만료 정산.
 * 결과 컬렉션은 메모리 스텁이고 결제·LLM 은 모두 mock 이다.
 */
import { jest } from "@jest/globals";
import createResultStore from "../fixtures/fortune-tea-result-store.cjs";

const USER_ID = "64f0a1b2c3d4e5f678901277";
const DAY = 86400000;
const NOW = Date.now();
const ID = "fortune-tea-house-result:held";
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
const BILLING = { deliveryRequestId: "req-1", featureKey: "fortune-tea-house-saju-consultation", pricing: { coinPrice: 10 },
  passSettlement: { cycleKey: "2026-11", cost: 1, featureKey: "fortune-tea-house-saju-consultation" } };
async function seed({ _id = ID, resultId = "tea-held", userId = USER_ID, status = "partial", createdAt = new Date(NOW - 3 * 3600000), marker, lock, extra = {} } = {}) {
  const doc = { _id, userId, resultId, serviceScope: "FORTUNE_TEA_HOUSE", status, createdAt, updatedAt: new Date(NOW - 600000),
    generationCheckpoint: { requestBody: { requestId: "req-1" }, groups: GROUPS, parts: { a: { summary: "저장된 유료 본문 첫 장" } }, attempts: { a: 1, b: 9 }, round: 3, repairs: [] },
    deliveryWatch: { baseline: 10, stalls: 6 }, ...BILLING,
    ...(marker ? { llmMeta: { retryable: marker } } : {}), ...(lock ? { generationLock: lock } : {}), ...extra };
  await results.updateOne({ _id }, { $set: doc }, { upsert: true });
  return { _id, userId, resultId, status, createdAt, updatedAt: doc.updatedAt };
}
const held = (over = {}) => ({ since: new Date(NOW - 3600000), refundAt: new Date(NOW + 6 * DAY), code: "FORTUNE_TEA_HOUSE_GENERATION_EXHAUSTED", evidenceIds: ["pay-1"], reopens: 0, ...over });
const read = (id = ID) => results.findOne({ _id: id });
const post = (path, body) => tea.handleFortuneTeaHouseRoutes(new Request(`https://example.com/api/fortune-tea-house${path}`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { NODE_ENV: "test" });

describe("settleStuckDelivery inside the retry window", () => {
  test("holds an incomplete stuck record for a free retry instead of refunding", async () => {
    const doc = await seed();
    const settled = await tea.settleStuckDelivery({}, { doc, now: NOW });
    expect(settled.outcome).toBe("retryable");
    expect(new Date(settled.refundAt).getTime()).toBe(doc.createdAt.getTime() + 7 * DAY);
    const row = await read();
    expect(row.status).toBe("generation_failed");
    expect(row.generationError).toMatchObject({ code: "DELIVERY_STUCK", retryable: false });
    expect(row.llmMeta.retryable).toMatchObject({ code: "DELIVERY_STUCK", reopens: 0 });
    expect(row.deliveryWatch).toBeNull();
    expect(row.passRefund).toBeUndefined();
    expect(refundPassCoverage).not.toHaveBeenCalled();
    expect(handleBillingRoutes).not.toHaveBeenCalled();
    expect(tea.teaRetryState(row, NOW)).toEqual({ available: true, refundAt: settled.refundAt, resultId: "tea-held" });
  });

  test("Toss native records keep the immediate refund", async () => {
    const doc = await seed({ extra: { tossNative: true } });
    expect((await tea.settleStuckDelivery({}, { doc, now: NOW })).outcome).toBe("generation_failed");
    expect((await read()).llmMeta).toBeUndefined();
    expect(refundPassCoverage).toHaveBeenCalledTimes(1);
  });

  test("a reopened record stuck after the deadline refunds once and closes the marker", async () => {
    const doc = await seed({ createdAt: new Date(NOW - 8 * DAY), marker: held({ refundAt: new Date(NOW - DAY), reopens: 1 }) });
    expect(await tea.settleStuckDelivery({}, { doc, now: NOW })).toEqual({ outcome: "generation_failed", refundStatus: "refunded" });
    const row = await read();
    expect(row.llmMeta.retryable.settledAt).toBeTruthy();
    expect(refundPassCoverage).toHaveBeenCalledTimes(1);
    expect(tea.teaRetryState(row, NOW)).toBeNull();
  });
});

describe("POST /retry", () => {
  test("reopens a held record with a fresh round and no payment call, keeping the deadline", async () => {
    const marker = held();
    await seed({ status: "generation_failed", marker });
    const response = await post("/retry", { resultId: "tea-held" });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, status: "partial", resultId: "tea-held" });
    const row = await read();
    expect(row.status).toBe("partial");
    expect(row.generationError).toBeNull();
    expect(row.deliveryWatch).toBeNull();
    expect(row.generationCheckpoint.round).toBe(1);
    expect(row.generationCheckpoint.attempts).toEqual({ a: 1, b: 0 });
    expect(row.generationCheckpoint.parts.a.summary).toBe("저장된 유료 본문 첫 장");
    expect(row.llmMeta.retryable.reopens).toBe(1);
    expect(new Date(row.llmMeta.retryable.refundAt).getTime()).toBe(marker.refundAt.getTime());
    expect(refundPassCoverage).not.toHaveBeenCalled();
    expect(handleBillingRoutes).not.toHaveBeenCalled();
    // 이미 다시 열린 건은 또 열 수 없다.
    expect((await post("/retry", { resultId: "tea-held" })).status).toBe(409);
  });

  test("an expired hold is settled once instead of reopened", async () => {
    await seed({ status: "generation_failed", createdAt: new Date(NOW - 8 * DAY), marker: held({ refundAt: new Date(NOW - 1000) }) });
    const response = await post("/retry", { resultId: "tea-held" });
    expect(response.status).toBe(409);
    expect((await response.json()).reason).toBe("RETRY_WINDOW_EXPIRED");
    const row = await read();
    expect(row.status).toBe("generation_failed");
    expect(row.llmMeta.retryable).toMatchObject({ refundReason: "RETRY_WINDOW_EXPIRED" });
    expect(row.llmMeta.retryable.settledAt).toBeTruthy();
    expect(refundPassCoverage).toHaveBeenCalledTimes(1);
    expect(handleBillingRoutes.mock.calls.map(([request]) => new URL(request.url).pathname)).toEqual(["/api/billing/coin-gate/deferred/cancel"]);
  });

  test("another account's record is not found", async () => {
    await seed({ status: "generation_failed", userId: "64f0a1b2c3d4e5f678909999", marker: held() });
    expect((await post("/retry", { resultId: "tea-held" })).status).toBe(404);
    expect((await read()).status).toBe("generation_failed");
  });
});

describe("POST /refund-request", () => {
  test("refunds a held record once and closes the retry offer", async () => {
    await seed({ status: "generation_failed", marker: held() });
    const response = await post("/refund-request", { resultId: "tea-held" });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, resultId: "tea-held", refundStatus: "refunded" });
    const row = await read();
    expect(row.llmMeta.retryable.refundRequestedAt).toBeTruthy();
    expect(row.llmMeta.retryable).toMatchObject({ refundReason: "CUSTOMER_REQUEST" });
    expect(row.passRefund.refundedAt).toBeTruthy();
    expect(refundPassCoverage).toHaveBeenCalledTimes(1);
    expect(handleBillingRoutes).toHaveBeenCalledTimes(1);
    expect(tea.teaRetryState(row, NOW)).toBeNull();
    // 두 번째 요청은 다시 환불하지 않는다.
    expect((await post("/refund-request", { resultId: "tea-held" })).status).toBe(200);
    expect(refundPassCoverage).toHaveBeenCalledTimes(1);
    expect((await post("/retry", { resultId: "tea-held" })).status).toBe(409);
  });

  test("a record that was never held cannot be refunded through this route", async () => {
    await seed({ status: "partial" });
    expect((await post("/refund-request", { resultId: "tea-held" })).status).toBe(409);
    expect(refundPassCoverage).not.toHaveBeenCalled();
  });
});

describe("settleDueTeaHouseRetryRefunds", () => {
  test("settles only expired holds, skipping open windows, Toss and live leases", async () => {
    await seed({ _id: "fortune-tea-house-result:due", resultId: "due", status: "generation_failed", marker: held({ refundAt: new Date(NOW - 1000) }) });
    await seed({ _id: "fortune-tea-house-result:open", resultId: "open", status: "generation_failed", marker: held() });
    await seed({ _id: "fortune-tea-house-result:toss", resultId: "toss", status: "generation_failed", marker: held({ refundAt: new Date(NOW - 1000) }), extra: { tossNative: true } });
    await seed({ _id: "fortune-tea-house-result:live", resultId: "live", status: "generating", marker: held({ refundAt: new Date(NOW - 1000), reopens: 1 }),
      lock: { token: "live", startedAt: new Date(NOW - 10000) } });
    await seed({ _id: "fortune-tea-house-result:reopened", resultId: "reopened", status: "partial", marker: held({ refundAt: new Date(NOW - 1000), reopens: 1 }) });
    const outcomes = await tea.settleDueTeaHouseRetryRefunds({}, { now: NOW });
    expect(outcomes).toEqual([{ service: "fortune-tea-house", refundStatus: "refunded" }, { service: "fortune-tea-house", refundStatus: "refunded" }]);
    expect(refundPassCoverage.mock.calls.map(([call]) => call.refundId).sort()).toEqual(["due", "reopened"]);
    expect((await read("fortune-tea-house-result:reopened")).status).toBe("generation_failed");
    expect((await read("fortune-tea-house-result:reopened")).generationError.code).toBe("RETRY_WINDOW_EXPIRED");
    expect((await read("fortune-tea-house-result:open")).llmMeta.retryable.settledAt).toBeUndefined();
    expect((await read("fortune-tea-house-result:live")).status).toBe("generating");
    // 다음 주기는 이미 정산한 건을 다시 환불하지 않는다.
    expect(await tea.settleDueTeaHouseRetryRefunds({}, { now: NOW + 1000 })).toEqual([]);
    expect(refundPassCoverage).toHaveBeenCalledTimes(2);
  });
});
