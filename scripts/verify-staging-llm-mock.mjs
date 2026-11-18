import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { callLLM, isStagingLlmMockEnabled } from "../lib/llm-client.ts";
import { enhanceLoveReadingWithLlm } from "../lib/tarot/love-reading-llm.mjs";
import { buildMindscanReadingPayload } from "../lib/tarot/mindscan-reading.mjs";
import { parseToml } from "./verify-worker-config-parity.mjs";
import {
  PRODUCTION_LLM_FLAGS,
  STAGING_MASKED_LLM_KEY_NAMES,
  STAGING_REAL_LLM_ALLOWLIST_KEY,
  maskStagingLlmEnv,
  withProductionLlmEnv,
  withStagingLlmRouting,
} from "../worker/lib/staging-real-llm.js";

const stagingEnv = {
  APP_ENV: "staging",
  STAGING_LLM_MOCK_ENABLED: "true",
  WORKERS_AI_ENABLED: "false",
  // 키가 실수로 있어도 mock이 우선되어야 한다.
  GEMINIF_API_KEY: "intentionally-unused-test-value",
  AI: { run: async () => { throw new Error("Workers AI must not be called in staging mock mode."); } },
};

assert.equal(isStagingLlmMockEnabled(stagingEnv), true, "staging mock gate must be enabled");
assert.equal(isStagingLlmMockEnabled({ ...stagingEnv, APP_ENV: "production" }), false, "production must never enable staging mock");
assert.equal(isStagingLlmMockEnabled({ ...stagingEnv, WORKERS_AI_ENABLED: "true" }), false, "Workers AI must be off for staging mock");
assert.equal(isStagingLlmMockEnabled({ ...stagingEnv, STAGING_LLM_MOCK_ENABLED: "false" }), false, "explicitly disabled mock must stay off");

// 🔴 게이트 판정의 정본은 worker/lib/staging-llm-mock.js 하나다. 딱 하나 수렴할 수 없는 사본이
//    jest 목(__tests__/__mocks__/llm-client.js)인데 CJS 라 ESM 정본을 require 할 수 없다.
//    그 사본이 갈라지면 테스트가 실제와 다른 판정 위에서 통과한다 — 진리표로 묶어 둔다.
const jestLlmMock = createRequire(import.meta.url)("../__tests__/__mocks__/llm-client.js");
for (const appEnv of ["staging", "production", "", " Staging "]) {
  for (const flag of ["1", "true", "on", "yes", "0", "false", "", "maybe"]) {
    for (const workersAi of ["0", "false", "off", "no", "1", "true", ""]) {
      const env = { APP_ENV: appEnv, STAGING_LLM_MOCK_ENABLED: flag, WORKERS_AI_ENABLED: workersAi };
      assert.equal(jestLlmMock.isStagingLlmMockEnabled(env), isStagingLlmMockEnabled(env),
        `jest 목의 staging mock 게이트가 정본과 다르다: ${JSON.stringify(env)}`);
    }
  }
}

const originalFetch = globalThis.fetch;
let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("Gemini network call is forbidden in staging mock verification.");
};

try {
  const text = await callLLM({ prompt: "결제 이후 결과 본문을 작성하세요.", maxTokens: 1200 }, stagingEnv);
  assert.equal(text.provider, "staging-mock");
  assert.equal(text.isMock, true);
  assert.ok(text.text.length >= 1800, "text fixture must be renderable");

  const structured = await callLLM({
    prompt: '출력 형식은 JSON 하나입니다. {"title":"제목","summary":"요약","items":[{"id":1,"content":"내용"}]}',
    responseMimeType: "application/json",
  }, stagingEnv);
  assert.equal(structured.provider, "staging-mock");
  assert.equal(structured.isMock, true);
  const parsed = JSON.parse(structured.text);
  assert.equal(parsed.items[0].id, 1);
  assert.ok(parsed.items[0].content.length > 20);

  const loveFallback = await enhanceLoveReadingWithLlm({ positionBreakdown: [{ positionOrder: 1, headline: "기본" }] }, {
    env: stagingEnv,
    fetchImpl: async () => { throw new Error("direct tarot fetch must not run in staging mock mode"); },
  });
  assert.equal(loveFallback.source, "local_fallback");
  assert.equal(loveFallback.llmFailReason, "staging_mock");

  // 🔴 love 와 등가. mindscan 은 어댑터를 안 거치고 Gemini 를 직접 치는 **두 번째** 경로라,
  //    게이트가 여기서도 무는지 따로 단언해야 한다 — love 만 묶여 있던 동안 이쪽 신호는 0 이었다.
  const mindscanFallback = await buildMindscanReadingPayload(
    [
      { slot: 1, mainCardId: 0, subCardId: 22 },
      { slot: 2, mainCardId: 6, subCardId: 30 },
      { slot: 3, mainCardId: 13, subCardId: 45 },
      { slot: 4, mainCardId: 17, subCardId: 51 },
      { slot: 5, mainCardId: 20, subCardId: 63 },
    ],
    {
      question: "헤어진 상대에게서 다시 연락이 올까요?",
      env: stagingEnv,
      fetchImpl: async () => { throw new Error("direct tarot fetch must not run in staging mock mode"); },
    },
  );
  assert.equal(mindscanFallback.source, "staging_mock_local_fallback");
  assert.equal(mindscanFallback.llmFailReason, "staging_mock");
} finally {
  globalThis.fetch = originalFetch;
}

assert.equal(fetchCalls, 0, "staging mock must make zero provider network calls");

// ── 2026-11-18 사용자 결정: 스테이징 허용 계정만 운영과 같은 LLM 경로 ──────────────────────
// 키는 스테이징 워커에 있어도 된다. 허용목록(STAGING_REAL_LLM_USER_IDS 시크릿) 밖 요청·게스트·
// queue·scheduled 는 키가 빠진 view 를 받아 mock 으로 남고, 허용 계정만 운영 플래그 + 키 view 를 받는다.
const ALLOWED_USER = "a1b2c3d4e5f6a1b2c3d4e5f6";
const realLlmBaseEnv = {
  ...stagingEnv,
  GUARDIAN_FORTUNE_LLM_PROVIDER: "mock",
  ENABLE_FUSION_FORTUNE_MOCK_FLOW: "true",
  [STAGING_REAL_LLM_ALLOWLIST_KEY]: ALLOWED_USER,
};
const routed = [];
const routedHandlers = withStagingLlmRouting(
  { fetch: (_r, env) => routed.push(env), queue: (_b, env) => routed.push(env), scheduled: (_e, env) => routed.push(env) },
  { peekUserId: async request => request.headers.get("x-test-user") || "" },
);
const routedRequest = user => new Request("https://staging-api.example/api/x", { method: "POST", headers: user ? { "x-test-user": user } : {} });
await routedHandlers.fetch(routedRequest("ffffffffffffffffffffffff"), realLlmBaseEnv, {});
await routedHandlers.fetch(routedRequest(""), realLlmBaseEnv, {});
await routedHandlers.queue({ messages: [] }, realLlmBaseEnv, {});
await routedHandlers.scheduled({}, realLlmBaseEnv, {});
await routedHandlers.fetch(routedRequest(ALLOWED_USER), realLlmBaseEnv, {});
const [otherView, guestView, queueView, cronView, allowedView] = routed;
for (const view of [otherView, guestView, queueView, cronView]) {
  assert.equal(view, maskStagingLlmEnv(realLlmBaseEnv), "non-allowlisted staging entry must get the masked view");
  assert.equal(isStagingLlmMockEnabled(view), true, "masked view must stay mock");
  for (const name of [...STAGING_MASKED_LLM_KEY_NAMES, STAGING_REAL_LLM_ALLOWLIST_KEY]) assert.equal(name in view, false, `${name} must be masked`);
}
assert.equal(allowedView, withProductionLlmEnv(realLlmBaseEnv), "allowlisted user must get the production LLM view");
assert.equal(isStagingLlmMockEnabled(allowedView), false, "allowlisted view must leave mock");
for (const [name, value] of Object.entries(PRODUCTION_LLM_FLAGS)) assert.equal(allowedView[name], value, `${name} must match production`);
assert.equal(allowedView.APP_ENV, "staging", "allowlisted view keeps staging identity (test payment amount, staging DB)");
assert.equal(STAGING_REAL_LLM_ALLOWLIST_KEY in allowedView, false, "allowlist must not reach route code");
const productionLikeEnv = { WORKERS_AI_ENABLED: "true", GEMINIF_API_KEY: "intentionally-unused-test-value", [STAGING_REAL_LLM_ALLOWLIST_KEY]: ALLOWED_USER };
assert.equal(withProductionLlmEnv(productionLikeEnv), productionLikeEnv, "production must be a no-op");
assert.equal(maskStagingLlmEnv(productionLikeEnv), productionLikeEnv, "production must be a no-op");

// 허용 view 는 실제 공급자 경로(provider gemini)를 탄다 — 네트워크는 stub, 사용량 계량은 DB 없이 건너뛴다.
const mongoKeys = ["MONGO_URI", "MONGODB_URI", "MONGO_URL", "DATABASE_URL"];
const savedMongo = Object.fromEntries(mongoKeys.map(key => [key, process.env[key]]));
for (const key of mongoKeys) delete process.env[key];
let geminiCalls = 0;
globalThis.fetch = async url => {
  const target = new URL(String(url));
  assert.equal(target.hostname, "generativelanguage.googleapis.com", "allowlisted call must hit Gemini first");
  // 운영과 같은 입력 토큰 사전 확인(countTokens)도 실제 경로의 일부다.
  if (target.pathname.endsWith(":countTokens")) return new Response(JSON.stringify({ totalTokens: 12 }), { status: 200 });
  geminiCalls += 1;
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: "허용 계정 실경로 stub 응답" }] }, finishReason: "STOP" }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 8, totalTokenCount: 18 },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
};
try {
  const masked = await callLLM({ prompt: "허용목록 밖 계정의 결과", maxTokens: 400 }, otherView);
  assert.equal(masked.provider, "staging-mock");
  assert.equal(geminiCalls, 0, "masked view must make zero provider calls even with the key on the worker");
  const real = await callLLM({ prompt: "허용 계정의 결과", maxTokens: 400 }, allowedView);
  assert.equal(real.provider, "gemini");
  assert.equal(real.isMock, undefined);
  assert.equal(geminiCalls, 1, "allowlisted view must make exactly one Gemini call");
} finally {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(savedMongo)) if (value !== undefined) process.env[key] = value;
}

const stagingConfig = fs.readFileSync("worker/wrangler.staging.toml", "utf8");
const productionConfig = fs.readFileSync("worker/wrangler.toml", "utf8");
assert.match(stagingConfig, /STAGING_LLM_MOCK_ENABLED\s*=\s*"true"/);
assert.doesNotMatch(productionConfig, /STAGING_LLM_MOCK_ENABLED\s*=/);
assert.match(stagingConfig, /WORKERS_AI_ENABLED\s*=\s*"false"/);

// 🔴 허용 view 가 "운영과 같다"는 주장의 근거. 두 toml 의 [vars] 중 LLM 관련 이름이 다르면 반드시
//    PRODUCTION_LLM_FLAGS(허용 view 가 운영 값으로 덮는 것) 또는 양쪽 다 꺼진 동치 목록에 분류돼야 한다.
//    새 LLM 변수가 스테이징에만 다르게 생기면 여기서 실패한다(fail-closed).
const LLM_VAR_NAME = /LLM|GEMINI|WORKERS_AI|OPENAI|ANTHROPIC|MOCK|_PROVIDER|MODEL/i;
const OFF_ON_BOTH = new Set(["ENABLE_DESTINY_ANATOMY_REAL_LLM"]);
const isOffValue = value => value === undefined || ["", "0", "false", "off", "no"].includes(String(value).trim().toLowerCase());
const productionVars = parseToml(productionConfig).root.vars || {};
const stagingVars = parseToml(stagingConfig).root.vars || {};
for (const name of new Set([...Object.keys(productionVars), ...Object.keys(stagingVars)])) {
  if (!LLM_VAR_NAME.test(name) || productionVars[name] === stagingVars[name]) continue;
  if (OFF_ON_BOTH.has(name)) {
    assert.ok(isOffValue(productionVars[name]) && isOffValue(stagingVars[name]), `${name} must stay off on both workers`);
    continue;
  }
  assert.ok(Object.hasOwn(PRODUCTION_LLM_FLAGS, name), `스테이징과 운영이 다른 LLM 변수 ${name} 이 PRODUCTION_LLM_FLAGS 에 분류되지 않았다`);
}
for (const [name, value] of Object.entries(PRODUCTION_LLM_FLAGS)) {
  if (Object.hasOwn(productionVars, name)) assert.equal(value, String(productionVars[name]), `PRODUCTION_LLM_FLAGS.${name} must equal the production toml`);
  else assert.ok(isOffValue(value), `PRODUCTION_LLM_FLAGS.${name} is absent in production, so it must be an off value`);
}
// 허용목록은 시크릿이다 — [vars] 에 두면 대시보드·저장소에 회원 ID 가 남는다.
assert.doesNotMatch(stagingConfig, /STAGING_REAL_LLM_USER_IDS\s*=/);
assert.doesNotMatch(productionConfig, /STAGING_REAL_LLM_USER_IDS\s*=/);

console.log("[verify-staging-llm-mock] PASS — staging mock gate, text/JSON fixtures, direct tarot fallbacks (love·mindscan), zero provider calls, allowlist routing (masked mock / production view → gemini), and toml LLM var classification verified.");
