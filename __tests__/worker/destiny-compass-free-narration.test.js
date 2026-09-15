/** @jest-environment node */
import { readFileSync } from "node:fs";
import { jest } from "@jest/globals";

let handleDestinyCompassRoutes;
let policy;
let provider;
let rateLimit;

beforeAll(async () => {
  const structured = await import("../../worker/lib/structured-consultation.js");
  const rateLimitModule = await import("../../worker/lib/rate-limit.js");

  jest.unstable_mockModule("../../worker/lib/structured-consultation.js", () => ({
    ...structured,
    callGeminiJsonWithRetry: (...args) => provider(...args),
  }));
  jest.unstable_mockModule("../../worker/lib/rate-limit.js", () => ({
    ...rateLimitModule,
    incrementRateLimit: (...args) => rateLimit(...args),
  }));
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({
    createLlmCacheStore: () => null,
  }));
  jest.unstable_mockModule("../../worker/lib/cms-prompts.js", () => ({
    cmsPromptText: (_env, _key, fallback) => fallback,
  }));

  const route = await import("../../worker/routes/destiny-compass.js");
  handleDestinyCompassRoutes = route.handleDestinyCompassRoutes;
  policy = route.DESTINY_COMPASS_NARRATION_POLICY;
});

beforeEach(() => {
  rateLimit = jest.fn(async () => ({ count: 1 }));
  provider = jest.fn(async () => ({
    ok: true,
    provider: "mock",
    text: "마음이 무거우셨죠. 지금 '재물'의 길을 따라 오늘 할 수 있는 작은 정리부터 시작해 보세요.",
  }));
});

function request(baseText = "'재물' 쪽 길이 은은하게 빛나고 있어요.") {
  return new Request("https://mock.test/api/destiny-compass/narrate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      narration: {
        question: "돈 문제가 풀릴까요?",
        primaryLabel: "재물",
        evidence: [{ term: "정재" }],
      },
      baseText,
    }),
  });
}

it("keeps the server budget below the client fallback deadline", () => {
  const client = readFileSync("app/destiny-compass/_components/CompassReport.tsx", "utf8");
  const clientTimeout = Number(client.match(/setTimeout\(\(\) => ctrl\.abort\(\),\s*(\d+)\)/)?.[1]);

  expect(policy).toEqual({
    maxFaithfulnessAttempts: 2,
    providerChainTimeoutMs: 10_000,
    serverBudgetMs: 24_000,
  });
  expect(policy.providerChainTimeoutMs * policy.maxFaithfulnessAttempts).toBeLessThanOrEqual(policy.serverBudgetMs);
  expect(policy.serverBudgetMs).toBeLessThan(clientTimeout);
});

it("uses one bounded helper attempt for a successful optional rewrite", async () => {
  const response = await handleDestinyCompassRoutes(request(), {});

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ ok: true, provider: "mock" });
  expect(provider).toHaveBeenCalledTimes(1);
  expect(provider.mock.calls[0][2]).toMatchObject({
    attempts: 1,
    timeoutMs: policy.providerChainTimeoutMs,
  });
});

it("bounds the correction pass without nesting helper retries", async () => {
  provider
    .mockResolvedValueOnce({ ok: true, provider: "mock", text: "기본 판정과 무관한 짧은 답" })
    .mockResolvedValueOnce({
      ok: true,
      provider: "mock",
      text: "걱정이 많으셨죠. 지금 '재물'의 흐름을 보며 오늘 한 가지 지출부터 정리해 보세요.",
    });

  const response = await handleDestinyCompassRoutes(request(), {});

  expect((await response.json()).ok).toBe(true);
  expect(provider).toHaveBeenCalledTimes(2);
  for (const call of provider.mock.calls) {
    expect(call[2].attempts).toBe(1);
    expect(call[2].timeoutMs).toBeGreaterThan(0);
    expect(call[2].timeoutMs).toBeLessThanOrEqual(policy.providerChainTimeoutMs);
  }
});

it("returns the deterministic fallback contract when optional narration fails", async () => {
  provider.mockResolvedValue({ ok: false, error: "mock_timeout" });

  const response = await handleDestinyCompassRoutes(request(), {});

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: false, error: "NARRATION_UNFAITHFUL" });
  expect(provider).toHaveBeenCalledTimes(policy.maxFaithfulnessAttempts);
});

it("does not call an LLM when there is no deterministic base text", async () => {
  const response = await handleDestinyCompassRoutes(request(""), {});

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: false, error: "NO_BASE_TEXT" });
  expect(provider).not.toHaveBeenCalled();
});
