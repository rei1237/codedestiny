/**
 * @jest-environment node
 */
// 2026-10-16: requirePremiumReportAccess 의 이용권 분기는 차감 없이 열어, 이용권만 있으면 8개 리포트가
// 결제 게이트를 건너뛴 직접 호출로 몇 번이든 무료였다. 이제 해금·결제 증빙이 없을 때만 실제 차감(또는
// 게이트 차감 재생)과 함께 연다.
import { jest } from "@jest/globals";

const emptyQuery = () => {
  const query = { select: () => query, sort: () => query, lean: async () => null };
  return query;
};
const settle = jest.fn();
jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  withMongoRetry: async (_env, callback) => callback(),
}));
jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  CONTENT_ENTITLEMENT_SCOPES: { PROFILE: "PROFILE", USER: "USER", BIRTH: "BIRTH" },
  CONTENT_ENTITLEMENT_SOURCES: { COIN: "COIN", PASS: "PASS", PAYMENT: "PAYMENT" },
  CONTENT_ENTITLEMENT_STATUSES: { ACTIVE: "ACTIVE" },
  SAJU_LOCKED_CONTENT_KEYS: { DAEUN_ANALYSIS: "saju.daeunAnalysis", FULL_READING: "saju.fullReading", COMPATIBILITY: "saju.compatibility" },
  ContentEntitlement: { findOne: () => emptyQuery() },
  User: { findById: () => emptyQuery(), exists: async () => null },
  PointHistory: { findOne: () => emptyQuery() },
  ProfileCard: { modelName: "ProfileCard", findOne: async () => null },
}));
jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => ({ settlePerUseAccessDecision: settle }));

const USER_ID = "64b000000000000000000001";
const passUser = { _id: USER_ID, profileSubscription: { tier: "premium", status: "active", expiresAt: new Date(Date.now() + 864e6) } };
let requirePremiumReportAccess;

beforeAll(async () => {
  ({ requirePremiumReportAccess } = await import("../../worker/lib/access-control.js"));
});
beforeEach(() => settle.mockReset());

const access = (reportType, body) => requirePremiumReportAccess({}, USER_ID, reportType, body, { preloadedUserDoc: passUser });

test("이용권 허용은 서버 기능 키·가격·이번 requestId 로 차감한 뒤에만 열린다", async () => {
  settle.mockImplementation(async (_env, args) => (args.decision.allowed ? { allowed: true, source: "pass" } : { allowed: false, reason: "NO_RECORD" }));
  const result = await access("petSajuReport", { requestId: "pet-req-1", featureKey: "cheap-feature", coinCost: 1 });
  expect(result).toMatchObject({ ok: true, accessType: "membership_pass", featureKey: "pet-saju-ai-consultation", chargedCoins: 50 });
  expect(settle).toHaveBeenCalledWith({}, expect.objectContaining({
    userId: USER_ID, featureKey: "pet-saju-ai-consultation", coinPrice: 50, requestId: "pet-req-1",
    decision: expect.objectContaining({ allowed: true }),
  }));
});

test("차감이 거부되면 402 다(한도 초과·예산 소진)", async () => {
  settle.mockResolvedValue({ allowed: false, reason: "PASS_BUDGET_EXHAUSTED" });
  const result = await access("petSajuReport", { requestId: "pet-req-2" });
  expect(result).toMatchObject({ ok: false, status: 402 });
});

test("requestId 가 없으면 차감을 시도하지 않고 거부한다", async () => {
  const result = await access("petSajuReport", {});
  expect(result).toMatchObject({ ok: false, status: 402 });
  expect(settle).not.toHaveBeenCalled();
});

test("DB 일시 장애는 402 가 아니라 503 이다", async () => {
  settle.mockResolvedValue({ allowed: null, reason: "DB_DEGRADED" });
  const result = await access("petSajuReport", { requestId: "pet-req-3" });
  expect(result).toMatchObject({ ok: false, status: 503 });
});

test("지오맨시는 게이트 키(openGeomancyOracle)로 정산해 게이트 차감을 재생한다", async () => {
  settle.mockResolvedValue({ allowed: false, reason: "NO_RECORD" });
  settle.mockResolvedValueOnce({ allowed: false, reason: "NO_RECORD" }) // geomancy 재생 확인
    .mockResolvedValueOnce({ allowed: false, reason: "NO_RECORD" }) // coin-gate-per-use 재생 확인
    .mockResolvedValueOnce({ allowed: true, source: "pass" }); // 게이트 키로 정산
  const result = await access("geomancyOracle", { requestId: "geomancy:1" });
  expect(result.ok).toBe(true);
  const calls = settle.mock.calls.map(([, args]) => [args.featureKey, args.decision.allowed]);
  expect(calls).toEqual([["geomancy", false], ["coin-gate-per-use", false], ["openGeomancyOracle", true]]);
});

test("영구 해금형(FPTI)은 여기서 차감하지 않는다 — 게이트가 남긴 해금 행으로만 열린다", async () => {
  const result = await access("fptiPremium", { reportId: "sig-1", requestId: "x" });
  expect(result).toMatchObject({ ok: false, status: 402 });
  expect(settle).not.toHaveBeenCalled();
});
