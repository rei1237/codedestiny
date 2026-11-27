/** @jest-environment node */

import { describe, expect, it } from "@jest/globals";
import { jest } from "@jest/globals";
import { handleFortuneRoutes, __guardianFortunePaidAccessResolverForTest as guardianResolver } from "../../worker/routes/fortune.js";
import { paidNarrativeRefundEvidence } from "../../worker/lib/paid-narrative-delivery.js";

describe("Guardian Fortune Worker routes", () => {
  it("returns a safe disabled usage response when the API flag is off", async () => {
    const response = await handleFortuneRoutes(
      new Request("https://example.test/api/fortune/guardian/usage"),
      {},
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      canGenerate: false,
      generationSource: "blocked",
    });
  });

  it("does not read a request body or call a provider while generation is disabled", async () => {
    const response = await handleFortuneRoutes(
      new Request("https://example.test/api/fortune/guardian/generate", { method: "POST" }),
      {},
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "GUARDIAN_FORTUNE_FEATURE_DISABLED",
    });
  });

  it("keeps the SSE chat route behind the existing Guardian feature flag", async () => {
    const response = await handleFortuneRoutes(
      new Request("https://example.test/api/fortune/guardian/chat", { method: "POST" }),
      {},
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "GUARDIAN_FORTUNE_FEATURE_DISABLED",
    });
  });
});

// 2026-11-27: 결제 확인기가 { ok: true } 만 돌려주면 최종 실패가 환불 대신 근거 없음 보류로 끝났다.
it("the paid-access resolver forwards the proof's refund evidence to the execution record", async () => {
  const verify = jest.fn(async () => ({ proven: true, source: "point", transactionId: "deduct-row-3", passRefund: { cycleKey: "2026-11", cost: 20 } }));
  const proof = await guardianResolver({}, 20, verify)({ userId: "user-1", requestId: "g-req-1" });
  expect(proof).toEqual({ ok: true, transactionId: "deduct-row-3", passRefund: { cycleKey: "2026-11", cost: 20 } });
  expect(paidNarrativeRefundEvidence(proof)).toEqual({ transactionId: "deduct-row-3", passRefund: { cycleKey: "2026-11", cost: 20 } });
});
