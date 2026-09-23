/** @jest-environment node */
import { readFileSync } from "node:fs";
import { jest } from "@jest/globals";
import {
  PAID_COMPLETED_RESULT_ACCESS_FIXTURES,
  PAID_COMPLETED_RESULT_PRODUCT_KEYS,
} from "../fixtures/paid-completed-result-access-fixtures.mjs";
import { matches } from "../fixtures/fake-payment-db.mjs";

let revokedStore = -1;
let observed = [];
const query = (value, name, filter) => ({
  lean: async () => {
    observed.push({ name, filter });
    return value;
  },
});

jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  PaidExecutionRecord: { findOne: (filter) => query(revokedStore === 0 ? { id: "revoked" } : null, "execution", filter) },
  Payment: { findOne: (filter) => query(revokedStore === 1 ? { id: "revoked" } : null, "payment", filter) },
  PointHistory: { findOne: (filter) => query(revokedStore === 2 ? { id: "revoked" } : null, "points", filter) },
  MonthlyCreditLedger: { findOne: (filter) => query(revokedStore === 3 ? { id: "revoked" } : null, "monthly", filter) },
}));

let isStoredPaidResultRevoked;

beforeAll(async () => {
  ({ isStoredPaidResultRevoked } = await import("../../worker/lib/paid-result-revocation.js"));
});

beforeEach(() => {
  revokedStore = -1;
  observed = [];
});

test("유료 completed 결과 GET 표가 중복 없이 실제 취소 판정 경로에 연결된다", () => {
  expect(new Set(PAID_COMPLETED_RESULT_PRODUCT_KEYS).size).toBe(PAID_COMPLETED_RESULT_PRODUCT_KEYS.length);
  for (const fixture of PAID_COMPLETED_RESULT_ACCESS_FIXTURES) {
    const source = readFileSync(fixture.file, "utf8");
    expect(source.split(fixture.marker).length - 1).toBeGreaterThanOrEqual(2);
  }
  expect(readFileSync("worker/lib/paid-narrative-delivery.js", "utf8")).toContain("isPaidResultRevoked");
});

test.each(PAID_COMPLETED_RESULT_PRODUCT_KEYS)("%s 정상 과거 구매본은 현재 이용권 재검사 없이 재열람한다", async (featureKey) => {
  const record = { status: "completed", id: `saved:${featureKey}`, idempotencyKey: `paid:${featureKey}` };
  await expect(isStoredPaidResultRevoked("owner", featureKey, record)).resolves.toBe(false);
  expect(observed).toHaveLength(4);
  expect(observed.every(({ filter }) => JSON.stringify(filter).includes(featureKey))).toBe(true);
});

test.each(PAID_COMPLETED_RESULT_PRODUCT_KEYS)("%s 취소·환불된 원래 구매본은 completed여도 차단한다", async (featureKey) => {
  for (revokedStore = 0; revokedStore < 4; revokedStore += 1) {
    observed = [];
    const record = { status: "completed", id: `saved:${featureKey}`, paymentId: `payment:${featureKey}` };
    await expect(isStoredPaidResultRevoked("owner", featureKey, record)).resolves.toBe(true);
    expect(observed).toHaveLength(4);
  }
});

test("저장본 자체의 취소 상태는 외부 원장을 조회하지 않고 차단한다", async () => {
  await expect(isStoredPaidResultRevoked("owner", "fortune-chat-consultation", { status: "refunded" })).resolves.toBe(true);
  expect(observed).toHaveLength(0);
});

test("부분 취소는 권한 자동 회수 전까지 과거 결과를 오차단하지 않는다", async () => {
  await expect(isStoredPaidResultRevoked("owner", "fortune-chat-consultation", {
    status: "completed",
    id: "saved:partial",
    paymentId: "payment:partial",
  })).resolves.toBe(false);
  const paymentFilter = observed.find(({ name }) => name === "payment")?.filter;
  expect(paymentFilter).toEqual(expect.objectContaining({
    $and: expect.arrayContaining([
      expect.objectContaining({
        $or: expect.arrayContaining([
          expect.objectContaining({ status: { $in: ["refunded", "REFUNDED"] }, orderState: { $nin: ["PARTIAL_CANCELLED", "partial_cancelled"] } }),
        ]),
      }),
    ]),
  }));
});

test("결제 없이 만료된 주문은 옵트인한 호출에서만 회수 판정에서 빠진다", async () => {
  const featureKey = "ziwei-ai-consultation";
  const record = { status: "completed", id: "saved:expired", idempotencyKey: "k" };
  const expired = { userId: "owner", featureKey, idempotencyKey: "k", status: "cancelled", orderState: "CANCELLED", failureCode: "ORDER_EXPIRED" };
  const paidAt = new Date("2026-09-24T00:00:00Z");
  const stillRevoked = [
    { ...expired, failureCode: "PG_CANCELLED" },
    { ...expired, paidAt },
    { ...expired, status: "refunded", orderState: "REFUNDED", failureCode: "", paidAt },
  ];
  const paymentFilter = async (options) => {
    observed = [];
    await isStoredPaidResultRevoked("owner", featureKey, record, options);
    return observed.find(({ name }) => name === "payment").filter;
  };
  const strict = await paymentFilter();
  const lenient = await paymentFilter({ ignoreNeverPaidExpiry: true });
  expect(matches(expired, strict)).toBe(true);
  expect(matches(expired, lenient)).toBe(false);
  for (const doc of stillRevoked) {
    expect(matches(doc, strict)).toBe(true);
    expect(matches(doc, lenient)).toBe(true);
  }
});

test("식별자가 없던 구버전 completed 저장본에는 새 증빙 문턱을 소급하지 않는다", async () => {
  await expect(isStoredPaidResultRevoked("owner", "fortune-chat-consultation", { status: "completed" })).resolves.toBe(false);
  expect(observed).toHaveLength(0);
});
