/** @jest-environment node */
import { readFileSync } from "node:fs";
import { jest } from "@jest/globals";

// 운명 구조도 문장 다듬기 — 플래그 꺼짐이면 DB·LLM 에 닿지 않고, 켜져도 mock 만으로 검증한다(실호출 없음).
let route;
let provider;
let rateLimit;
const ON = { ENABLE_DESTINY_ANATOMY_REAL_LLM: "true" };

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
  jest.unstable_mockModule("../../worker/lib/llm-cache-store.js", () => ({ createLlmCacheStore: () => null }));
  route = await import("../../worker/routes/destiny-anatomy.js");
});

const BASE = {
  mindLine: "현실 엔진과 성찰 엔진이 함께 도는 머릿속이에요. 움직이기 전에 한 번 더 따져 보고, 정한 뒤에는 손에 잡히는 결과를 챙겨요.",
  insights: [{ title: "결정의 박자", body: "현실 엔진은 빨리 손에 쥐고 싶어 하지만, 감정 권위는 마음이 가라앉을 때까지 기다리라고 해요. 하루 묵힌 뒤 정하면 덜 흔들려요." }],
};
const GOOD = JSON.stringify({
  mindLine: "현실 엔진과 성찰 엔진이 나란히 도는 머릿속이에요. 한 번 더 따져 본 뒤 움직이고, 정하고 나면 손에 잡히는 결과를 차곡차곡 챙겨요.",
  insights: ["현실 엔진은 얼른 손에 쥐고 싶어 해도, 감정 권위는 마음이 잔잔해질 때까지 기다려 보라고 해요. 하루쯤 묵혀 두고 정하면 훨씬 덜 흔들려요."],
});

function request(body = {}) {
  return new Request("https://mock.test/api/destiny-anatomy/narrate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fingerprint: "da1-0123456789abcdef", axes: ["reality", "reflection"], names: ["현실 엔진", "성찰 엔진"], base: BASE, ...body }),
  });
}

beforeEach(() => {
  rateLimit = jest.fn(async () => ({ count: 1 }));
  provider = jest.fn(async () => ({ ok: true, provider: "gemini", text: GOOD }));
});

it("플래그가 꺼져 있으면 한도·LLM 에 닿지 않고 결정론을 유지하라고 답한다", async () => {
  for (const env of [{}, { ENABLE_DESTINY_ANATOMY_REAL_LLM: "false" }]) {
    const res = await route.handleDestinyAnatomyRoutes(request(), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, source: "deterministic", error: "DISABLED" });
  }
  expect(rateLimit).not.toHaveBeenCalled();
  expect(provider).not.toHaveBeenCalled();
});

it("서버 예산은 클라이언트 중단보다 짧고, 캐시 키는 지문·로케일·시도를 담는다", async () => {
  const p = route.DESTINY_ANATOMY_NARRATION_POLICY;
  const client = readFileSync("js/core/saju/destiny-anatomy/boot.js", "utf8");
  const clientMs = Number(client.match(/NARRATE_TIMEOUT_MS\s*=\s*(\d+)/)?.[1]);
  expect(p.providerChainTimeoutMs * p.maxFaithfulnessAttempts).toBeLessThanOrEqual(p.serverBudgetMs);
  expect(p.serverBudgetMs).toBeLessThan(clientMs);

  const res = await route.handleDestinyAnatomyRoutes(request(), ON);
  const body = await res.json();
  expect(body).toMatchObject({ ok: true, source: "llm" });
  expect(body.insights).toHaveLength(1);
  const opts = provider.mock.calls[0][2];
  expect(opts).toMatchObject({ attempts: 1, timeoutMs: p.providerChainTimeoutMs });
  expect(opts.cache.keyExtra).toBe("da-v1:da1-0123456789abcdef:ko:a0");
  expect(rateLimit).toHaveBeenCalledTimes(2);
});

it("입력은 지문 형식·길이·개수를 엄격히 본다", async () => {
  for (const bad of [{ fingerprint: "1990-03-07" }, { base: { mindLine: "" } }, { base: { ...BASE, insights: [1, 2, 3, 4].map(() => BASE.insights[0]) } }, { base: { mindLine: "가".repeat(400) } }]) {
    const res = await route.handleDestinyAnatomyRoutes(request(bad), ON);
    expect(res.status).toBe(400);
  }
  expect(provider).not.toHaveBeenCalled();
  // 알 수 없는 키(출생 정보)는 프롬프트에 닿지 않는다.
  await route.handleDestinyAnatomyRoutes(request({ birth: { date: "1990-03-07", place: "Seoul" } }), ON);
  expect(provider.mock.calls[0][1]).not.toMatch(/1990|Seoul/);
});

it("이름을 잃거나 금지어·개수 불일치면 교정 1회 뒤 결정론으로 돌아간다", async () => {
  provider.mockResolvedValue({ ok: true, provider: "gemini", text: JSON.stringify({ mindLine: "머릿속이 두 갈래로 돌아요. 한 번 더 따져 보고 움직이는 편이에요, 그래서 결과를 챙겨요.", insights: [] }) });
  let res = await route.handleDestinyAnatomyRoutes(request(), ON);
  expect(await res.json()).toEqual({ ok: false, source: "deterministic", error: "NARRATION_UNFAITHFUL" });
  expect(provider).toHaveBeenCalledTimes(2);
  expect(provider.mock.calls[1][1]).toMatch(/previous attempt broke the rules/);

  const n = route.normalizeNarration({ fingerprint: "da1-0123456789abcdef", names: ["현실 엔진", "성찰 엔진"], base: BASE });
  const parsed = JSON.parse(GOOD);
  expect(route.checkFaithful(parsed, n, "ko")).toBe("");
  expect(route.checkFaithful({ ...parsed, mindLine: parsed.mindLine.replace("현실 엔진", "현실감") }, n, "ko")).toBe("name");
  expect(route.checkFaithful({ ...parsed, insights: [parsed.insights[0] + " 우울증 진단이 필요해요."] }, n, "ko")).toBe("forbidden");
  expect(route.checkFaithful({ ...parsed, mindLine: "짧아요" }, n, "ko")).toBe("short");
});

it("상한을 넘는 문장은 거부하지 않고 문장 경계에서 자른다", async () => {
  const long = "현실 엔진과 성찰 엔진이 함께 도는 머릿속이에요. " + "차분히 따져 보고 움직여요. ".repeat(20);
  provider.mockResolvedValue({ ok: true, provider: "gemini", text: JSON.stringify({ mindLine: long, insights: JSON.parse(GOOD).insights }) });
  const body = await (await route.handleDestinyAnatomyRoutes(request(), ON)).json();
  expect(body.ok).toBe(true);
  expect(body.mindLine.length).toBeLessThanOrEqual(220);
  expect(body.mindLine).toMatch(/\.$/);
  expect(provider).toHaveBeenCalledTimes(1);
});

it("스테이징 mock 공급자 응답은 문장으로 쓰지 않는다", async () => {
  provider.mockResolvedValue({ ok: true, provider: "mock", text: GOOD });
  expect(await (await route.handleDestinyAnatomyRoutes(request(), ON)).json()).toEqual({ ok: false, source: "deterministic", error: "MOCK_PROVIDER" });
});
