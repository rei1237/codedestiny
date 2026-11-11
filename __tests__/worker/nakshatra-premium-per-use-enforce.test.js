/** @jest-environment node */
// 나크샤트라 회당 상품(무후르타·VVIP 코덱스)은 결제 증빙이 없으면 본문을 주지 않는다.
import { withSettle } from "../fixtures/per-use-settle-mock.mjs";
import { jest } from "@jest/globals";

import { HttpError } from '../../worker/lib/http.js';
const requireAuth=jest.fn();const swiss=jest.fn();
const verifyPerUsePayment = jest.fn();
let route;
beforeAll(async () => {
  const db = await import("../../worker/lib/db.js");
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    getOptionalUserFromRequest: jest.fn(), requireAuth,
    isAuthDbInfraError: () => false,
  }));
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...db, connectDb: jest.fn(), withMongoRetry: async (_env, callback) => callback() }));
  jest.unstable_mockModule("../../worker/lib/swiss-ephemeris.js", () => ({
    getSwissVedicPlanets: swiss, getSwissMoonLongitudes: jest.fn(async (_env, moments) => moments.map(() => 100)),
  }));
  jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => withSettle({ verifyPerUsePayment, logPerUsePaymentProof: () => {} }));
  ({ handleNakshatraPremiumRoutes: route } = await import("../../worker/routes/nakshatra-premium.js"));
});
beforeEach(() => {
  verifyPerUsePayment.mockReset().mockRejectedValue(new Error('must never verify or consume payment'));
  requireAuth.mockReset().mockResolvedValue({userId:'507f1f77bcf86cd799439011'});swiss.mockReset().mockResolvedValue({planets:{Moon:123.4}});
  jest.spyOn(console, "info").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const BIRTH = { year: 1990, month: 5, day: 17, hour: 9, minute: 30, timezone: 9, lat: 37.5, lon: 127, gender: "female" };
const call = (kind, body) => route(new Request(`https://example.test/api/nakshatra-premium/${kind}`, {
  method: "POST", body: JSON.stringify({ ...BIRTH, purpose: "contract", requestId: "nakshatra-muhurta:1-abc", ...body }),
  headers: { "content-type": "application/json" },
}));


test.each(['muhurta','vvip-codex'])('%s builds a deterministic report without payment calls',async kind=>{const response=await call(kind);expect(response.status).toBe(200);expect((await response.json()).report).toBeTruthy();expect(requireAuth).toHaveBeenCalledTimes(1);expect(verifyPerUsePayment).not.toHaveBeenCalled();});
test.each(['muhurta','vvip-codex'])('%s keeps login and input validation',async kind=>{requireAuth.mockRejectedValueOnce(new HttpError(401,'login required'));expect((await call(kind)).status).toBe(401);expect(swiss).not.toHaveBeenCalled();expect((await call(kind,{year:0})).status).toBe(400);expect(verifyPerUsePayment).not.toHaveBeenCalled();});
test.each(['muhurta','vvip-codex'])('%s calculation failure does not trigger payment',async kind=>{swiss.mockResolvedValue(null);const response=await call(kind);expect(response.status).toBe(502);expect((await response.json()).reason).toBe('SWISS_MOON_UNAVAILABLE');expect(verifyPerUsePayment).not.toHaveBeenCalled();});
