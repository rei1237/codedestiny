/** @jest-environment node */
// 나크샤트라 회당 상품(무후르타·VVIP 코덱스)은 결제 증빙이 없으면 본문을 주지 않는다.
import { withSettle } from "../fixtures/per-use-settle-mock.mjs";
import { jest } from "@jest/globals";

const verifyPerUsePayment = jest.fn();
let route;
beforeAll(async () => {
  const db = await import("../../worker/lib/db.js");
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    getOptionalUserFromRequest: jest.fn(), requireAuth: jest.fn(async () => ({ userId: "507f1f77bcf86cd799439011" })),
    isAuthDbInfraError: () => false,
  }));
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...db, connectDb: jest.fn(), withMongoRetry: async (_env, callback) => callback() }));
  jest.unstable_mockModule("../../worker/lib/swiss-ephemeris.js", () => ({
    getSwissVedicPlanets: jest.fn(async () => null), getSwissMoonLongitudes: jest.fn(async (_env, moments) => moments.map(() => 100)),
  }));
  jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => withSettle({ verifyPerUsePayment, logPerUsePaymentProof: () => {} }));
  ({ handleNakshatraPremiumRoutes: route } = await import("../../worker/routes/nakshatra-premium.js"));
});
beforeEach(() => {
  verifyPerUsePayment.mockReset();
  jest.spyOn(console, "info").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const BIRTH = { year: 1990, month: 5, day: 17, hour: 9, minute: 30, timezone: 9, lat: 37.5, lon: 127, gender: "female" };
const call = (kind, body) => route(new Request(`https://example.test/api/nakshatra-premium/${kind}`, {
  method: "POST", body: JSON.stringify({ ...BIRTH, purpose: "contract", requestId: "nakshatra-muhurta:1-abc", ...body }),
  headers: { "content-type": "application/json" },
}));

test.each(["muhurta", "vvip-codex"])("%s: 결제 증빙이 없으면 402", async (kind) => {
  verifyPerUsePayment.mockResolvedValue({ proven: false, reason: "NO_RECORD" });
  const response = await call(kind);
  expect(response.status).toBe(402);
  expect((await response.json()).reason).toBe("PAYMENT_REQUIRED");
});

test.each(["muhurta", "vvip-codex"])("%s: 증빙 확인이 터지면 본문 없이 503", async (kind) => {
  verifyPerUsePayment.mockRejectedValue(new Error("db down"));
  expect((await call(kind)).status).toBe(503);
});

test("결제 증빙이 있으면 요청의 requestId 로 확인하고 402 를 내지 않는다", async () => {
  verifyPerUsePayment.mockResolvedValue({ proven: true, source: "payment" });
  const response = await call("muhurta");
  expect(response.status).not.toBe(402);
  expect(verifyPerUsePayment).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    featureKey: "nakshatra-muhurta", requestId: "nakshatra-muhurta:1-abc",
  }));
});
