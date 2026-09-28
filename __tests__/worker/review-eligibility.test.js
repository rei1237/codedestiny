/** @jest-environment node */
import { jest } from "@jest/globals";

const USER = "507f1f77bcf86cd799439011";
const OTHER = "507f1f77bcf86cd799439012";
const rows = { execution: [], payment: [], points: [], entitlement: [] };
const read = (row, key) => key.split(".").reduce((value, part) => value?.[part], row);
const matches = (row, match) => Object.entries(match).every(([key, expected]) => {
  const value = read(row, key);
  if (expected?.$in) return expected.$in.some((item) => String(item) === String(value));
  if (expected?.$nin) return !expected.$nin.includes(value);
  return String(value) === String(expected);
});
// Small in-memory executor for the emitted match/sort/group pipeline. No DB connection.
function aggregate(source) {
  return jest.fn(async (pipeline) => {
    const match = pipeline[0].$match;
    expect(match.userId).toBeDefined();
    expect(pipeline.some((stage) => stage.$limit)).toBe(false);
    const sort = pipeline.find((stage) => stage.$sort).$sort;
    const key = pipeline.find((stage) => stage.$group).$group._id;
    const selected = rows[source].filter((row) => matches(row, match)).sort((a, b) => {
      for (const field of Object.keys(sort)) {
        if (a[field] < b[field]) return 1;
        if (a[field] > b[field]) return -1;
      }
      return 0;
    });
    const grouped = new Map();
    for (const row of selected) {
      const resolve = (field) => read(row, field.slice(1));
      const id = JSON.stringify(typeof key === "string" ? resolve(key) : Object.values(key).map(resolve));
      if (!grouped.has(id)) grouped.set(id, row);
    }
    return [...grouped.values()];
  });
}
const executionAggregate = aggregate("execution");
const paymentAggregate = aggregate("payment");
const pointAggregate = aggregate("points");
const entitlementAggregate = aggregate("entitlement");
const reviewLean = jest.fn(async () => []);
const reviewFind = jest.fn(() => ({ select: () => ({ lean: reviewLean }) }));
let listUsedReviewProducts, listReviewableProducts, findUsedReviewProduct;

beforeAll(async () => {
  await jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    mongoose: { Types: { ObjectId: class {
      constructor(value) { this.value = value; }
      toString() { return this.value; }
      static isValid(value) { return /^[a-f0-9]{24}$/i.test(value); }
    } } },
    withMongoRetry: async (_env, operation) => operation(),
  }));
  await jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    PaidExecutionRecord: { aggregate: executionAggregate },
    Payment: { aggregate: paymentAggregate },
    PointHistory: { aggregate: pointAggregate },
    ContentEntitlement: { aggregate: entitlementAggregate },
  }));
  await jest.unstable_mockModule("../../worker/lib/review-models.js", () => ({ Review: { find: reviewFind } }));
  ({ listUsedReviewProducts, listReviewableProducts, findUsedReviewProduct } = await import("../../worker/lib/review-eligibility.js"));
});

beforeEach(() => {
  for (const source of Object.keys(rows)) rows[source] = [];
  globalThis.__codeDestinyReviewEligibilityCache.entries.clear();
  jest.clearAllMocks();
  reviewLean.mockResolvedValue([]);
});

test("300건보다 오래된 상품과 단건 결제·이용권·월정석 기록을 모두 찾는다", async () => {
  rows.payment = Array.from({ length: 320 }, (_, index) => ({
    userId: USER, featureKey: "saju_ai_question_prompt", status: "paid", createdAt: 1000 + index,
  }));
  rows.payment.push({ userId: USER, featureKey: "tarot-year-fortune", status: "fulfilled", createdAt: 1 });
  rows.points = [
    { userId: USER, featureKey: "saju_ai_question_prompt", kind: "deduct", metadata: { accessMethod: "PASS" }, createdAt: 20 },
    { userId: USER, featureKey: "tarot-year-fortune", kind: "deduct", metadata: { accessMethod: "MONTHLY" }, createdAt: 30 },
  ];
  const result = await listUsedReviewProducts({ userId: USER });
  expect(result.map((item) => item.productId).sort()).toEqual(["saju-ai", "tarot"]);
  expect(result.find((item) => item.productId === "tarot").sources).toEqual(expect.arrayContaining(["payment", "pass"]));
});

test("만료된 ACTIVE 권한도 인정하고 환불·취소 및 다른 사용자는 제외한다", async () => {
  rows.entitlement = [
    { userId: USER, contentKey: "saju.daeunAnalysis", serviceKey: "saju", status: "ACTIVE", expiresAt: new Date(0), unlockedAt: new Date(1) },
    { userId: USER, contentKey: "tarot.old", serviceKey: "tarot", status: "REFUNDED" },
    { userId: USER, contentKey: "ziwei.old", serviceKey: "ziwei", status: "CANCELLED" },
    { userId: OTHER, contentKey: "tarot.other", serviceKey: "tarot", status: "ACTIVE" },
  ];
  expect((await listUsedReviewProducts({ userId: USER })).map((item) => item.productId)).toEqual(["saju-ai"]);
  expect(entitlementAggregate.mock.calls[0][0][0].$match).not.toHaveProperty("$or");
});

test("완료된 실행만 인정하고 이용 기록이 없으면 비어 있다", async () => {
  expect(await listUsedReviewProducts({ userId: USER })).toEqual([]);
  globalThis.__codeDestinyReviewEligibilityCache.entries.clear();
  rows.execution = [
    { userId: USER, featureId: "tarot-year-fortune", status: "completed", completedAt: new Date(10) },
    { userId: USER, featureId: "saju_ai_question_prompt", status: "failed" },
  ];
  expect((await listUsedReviewProducts({ userId: USER })).map((item) => item.productId)).toEqual(["tarot"]);
});

test("일부 조회 실패는 캐시하지 않고 다음 요청에서 다시 조회한다", async () => {
  paymentAggregate.mockRejectedValueOnce(new Error("DB unavailable"));
  await expect(listUsedReviewProducts({ userId: USER })).rejects.toMatchObject({ status: 503 });
  expect(globalThis.__codeDestinyReviewEligibilityCache.entries.has(USER)).toBe(false);
  expect(await listUsedReviewProducts({ userId: USER })).toEqual([]);
  expect(paymentAggregate).toHaveBeenCalledTimes(2);
});

test("기존 후기 상태를 전달하고 기존 후기 조회 실패도 숨기지 않는다", async () => {
  rows.execution = [{ userId: USER, featureId: "tarot-year-fortune", status: "completed" }];
  reviewLean.mockResolvedValueOnce([{ productId: "tarot", status: "pending" }]);
  expect(await listReviewableProducts({ userId: USER })).toEqual([
    expect.objectContaining({ productId: "tarot", alreadyReviewed: true, existingReviewStatus: "pending" }),
  ]);
  reviewLean.mockRejectedValueOnce(new Error("review lookup failed"));
  await expect(listReviewableProducts({ userId: USER })).rejects.toThrow("review lookup failed");
  expect(await findUsedReviewProduct({ userId: USER, productId: "saju-ai" })).toBeNull();
});
