/**
 * @jest-environment node
 */
// 2026-10-16: 회당 리포트(requirePremiumReportAccess)는 같은 차감 행을 requestId 만 바꿔 몇 번이든 내밀 수
// 있었다(본문 증빙·최근 결제 창). 이제 차감 1건은 처음 쓴 요청 1건에만 묶인다(billing-evidence-claim).
import { jest } from "@jest/globals";

const USER_ID = "64b000000000000000000001";
let rows = [];
const metaValue = (row, path) => path.split(".").reduce((value, key) => (value == null ? undefined : value[key]), row);
function matches(row, query) {
  return Object.entries(query).every(([key, cond]) => {
    if (key === "$or") return cond.some((clause) => matches(row, clause));
    if (key === "$and") return cond.every((clause) => matches(row, clause));
    if (key === "userId" || key === "kind" || key === "createdAt") return true;
    const value = metaValue(row, key);
    if (cond && typeof cond === "object") {
      if (cond.$in) return cond.$in.includes(value);
      if (cond.$nin) return !cond.$nin.includes(value);
      if (cond.$lte !== undefined) return value <= cond.$lte;
    }
    return value === cond;
  });
}
const rowQuery = (query) => {
  const chain = { select: () => chain, sort: () => chain, lean: async () => rows.find((row) => matches(row, query)) || null };
  return chain;
};
const emptyQuery = () => {
  const chain = { select: () => chain, sort: () => chain, lean: async () => null };
  return chain;
};
jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  withMongoRetry: async (_env, callback) => callback(),
}));
jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  CONTENT_ENTITLEMENT_SCOPES: { PROFILE: "PROFILE", USER: "USER", BIRTH: "BIRTH" },
  CONTENT_ENTITLEMENT_SOURCES: { COIN: "COIN", PASS: "PASS", PAYMENT: "PAYMENT" },
  CONTENT_ENTITLEMENT_STATUSES: { ACTIVE: "ACTIVE" },
  SAJU_LOCKED_CONTENT_KEYS: { DAEUN_ANALYSIS: "saju.daeunAnalysis", FULL_READING: "saju.fullReading", COMPATIBILITY: "saju.compatibility" },
  ContentEntitlement: { findOne: () => emptyQuery(), findOneAndUpdate: async () => null, create: async () => null, updateOne: async () => null },
  User: { findById: () => emptyQuery(), exists: async () => null },
  PointHistory: { findOne: (query) => rowQuery(query) },
  ProfileCard: { modelName: "ProfileCard", findOne: async () => null },
}));
jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => ({ settlePerUseAccessDecision: jest.fn(async () => ({ allowed: false })) }));

let requirePremiumReportAccess;
beforeAll(async () => {
  ({ requirePremiumReportAccess } = await import("../../worker/lib/access-control.js"));
});
beforeEach(() => {
  rows = [];
});

const plainUser = { _id: USER_ID, unlockedFeatures: [] };
const access = (body, options = {}) => requirePremiumReportAccess({}, USER_ID, "petSajuReport", body, { preloadedUserDoc: plainUser, ...options });
const deduction = (id, requestId) => ({ _id: id, delta: -50, featureKey: "pet-saju-ai-consultation", metadata: { requestId } });

test("본문 증빙은 처음 쓴 요청만 연다 — 같은 요청 재시도는 통과, requestId 만 바꾸면 402", async () => {
  rows = [deduction("ph-1", "pay-req-1")];
  await expect(access({ requestId: "req-1", transactionId: "ph-1" })).resolves.toMatchObject({ ok: true, matchedTransactionId: "ph-1" });
  await expect(access({ requestId: "req-1", transactionId: "ph-1" })).resolves.toMatchObject({ ok: true });
  await expect(access({ requestId: "req-2", transactionId: "ph-1" })).resolves.toMatchObject({ ok: false, status: 402 });
});

test("최근 결제 창은 아직 안 쓴 차감만 연다 — 차감 2건이면 새 요청 2건까지", async () => {
  rows = [deduction("ph-new", "pay-a"), deduction("ph-old", "pay-b")];
  await expect(access({ requestId: "req-a" })).resolves.toMatchObject({ ok: true, accessType: "recent-payment-window", matchedTransactionId: "ph-new" });
  await expect(access({ requestId: "req-b" })).resolves.toMatchObject({ ok: true, matchedTransactionId: "ph-old" });
  await expect(access({ requestId: "req-c" })).resolves.toMatchObject({ ok: false, status: 402 });
  await expect(access({ requestId: "req-a" })).resolves.toMatchObject({ ok: true, matchedTransactionId: "ph-new" });
});

test("claimBindingKey 가 있으면 같은 requestId 라도 다른 조합은 402 다(숙요 전생 리딩)", async () => {
  rows = [deduction("ph-1", "sukuyo-req")];
  await expect(access({ requestId: "sukuyo-req", transactionId: "ph-1" }, { claimBindingKey: "partner-a" })).resolves.toMatchObject({ ok: true });
  await expect(access({ requestId: "sukuyo-req", transactionId: "ph-1" }, { claimBindingKey: "partner-a" })).resolves.toMatchObject({ ok: true });
  await expect(access({ requestId: "sukuyo-req", transactionId: "ph-1" }, { claimBindingKey: "partner-b" })).resolves.toMatchObject({ ok: false, status: 402 });
});

test("claim 저장소 장애는 402 가 아니라 503 이다", async () => {
  rows = [deduction("ph-1", "pay-req-1")];
  class BrokenStore extends Map {
    has() {
      throw new Error("db down");
    }
  }
  globalThis.__cdBillingEvidenceClaims = new BrokenStore();
  try {
    await expect(access({ requestId: "req-1", transactionId: "ph-1" })).resolves.toMatchObject({ ok: false, status: 503, code: "PAYMENT_VERIFY_UNAVAILABLE" });
  } finally {
    globalThis.__cdBillingEvidenceClaims = new Map();
  }
});
