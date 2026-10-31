/** @jest-environment node */
import { jest } from "@jest/globals";

let handleDestinyCompassRoutes;
let GLOBAL_DAILY_MAX;
let provider;
let rateLimit;
let counters;
let failGlobal;

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
  GLOBAL_DAILY_MAX = route.GLOBAL_DAILY_MAX;
});

beforeEach(() => {
  counters = new Map();
  failGlobal = false;
  // 실제 abuse_scores 처럼 endpoint+subject 별로 센다.
  rateLimit = jest.fn(async ({ subjectHash, endpoint }) => {
    if (failGlobal && endpoint.endsWith(":global-day")) throw new Error("db down");
    const key = `${endpoint}|${subjectHash}`;
    counters.set(key, (counters.get(key) || 0) + 1);
    return { count: counters.get(key) };
  });
  provider = jest.fn(async () => ({
    ok: true,
    provider: "mock",
    text: "마음이 무거우셨죠. 지금 '재물'의 길을 따라 오늘 할 수 있는 작은 정리부터 시작해 보세요.",
  }));
});

function request(ip) {
  return new Request("https://mock.test/api/destiny-compass/narrate", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify({
      narration: { question: "돈 문제가 풀릴까요?", primaryLabel: "재물", evidence: [{ term: "정재" }] },
      baseText: "'재물' 쪽 길이 은은하게 빛나고 있어요.",
    }),
  });
}

// 서로 다른 IP 로 n 번 호출한다(IP 한도는 IP 마다 따로라 걸리지 않는다).
async function callFromDistinctIps(from, to) {
  const statuses = [];
  for (let i = from; i <= to; i += 1) {
    statuses.push((await handleDestinyCompassRoutes(request(`198.51.${Math.floor(i / 250)}.${i % 250}`), {})).status);
  }
  return statuses;
}

it("uses the measured daily cap", () => {
  expect(GLOBAL_DAILY_MAX).toBe(300);
});

it("returns 429 without calling the LLM once distinct IPs pass the global daily cap", async () => {
  const statuses = await callFromDistinctIps(1, GLOBAL_DAILY_MAX);
  expect(statuses.every((status) => status === 200)).toBe(true);
  provider.mockClear();

  const blocked = await handleDestinyCompassRoutes(request("203.0.113.250"), {});

  expect(blocked.status).toBe(429);
  expect(blocked.headers.get("retry-after")).toBeTruthy();
  expect(await blocked.json()).toMatchObject({ ok: false, error: "RATE_LIMITED" });
  expect(provider).not.toHaveBeenCalled();
});

it("keeps serving ordinary customers at or below the cap", async () => {
  const response = await handleDestinyCompassRoutes(request("203.0.113.1"), {});
  expect(response.status).toBe(200);
  expect(provider).toHaveBeenCalledTimes(1);
  expect(rateLimit).toHaveBeenCalledWith(expect.objectContaining({
    subjectHash: "global",
    endpoint: "destiny-compass:narrate:global-day",
    windowMs: 86_400_000,
  }));
});

it("skips the global cap and applies only the per-IP cap when the global counter throws", async () => {
  failGlobal = true;
  const statuses = await callFromDistinctIps(1, GLOBAL_DAILY_MAX + 5);
  expect(statuses.every((status) => status === 200)).toBe(true);

  // IP 한도(분당 30)는 그대로 작동한다.
  const sameIp = [];
  for (let i = 0; i < 31; i += 1) sameIp.push((await handleDestinyCompassRoutes(request("203.0.113.99"), {})).status);
  expect(sameIp.slice(0, 30).every((status) => status === 200)).toBe(true);
  expect(sameIp[30]).toBe(429);
});
