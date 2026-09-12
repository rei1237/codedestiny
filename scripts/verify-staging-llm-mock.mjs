import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { callLLM, isStagingLlmMockEnabled } from "../lib/llm-client.ts";
import { enhanceLoveReadingWithLlm } from "../lib/tarot/love-reading-llm.mjs";
import { buildMindscanReadingPayload } from "../lib/tarot/mindscan-reading.mjs";

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

const stagingConfig = fs.readFileSync("worker/wrangler.staging.toml", "utf8");
const productionConfig = fs.readFileSync("worker/wrangler.toml", "utf8");
assert.match(stagingConfig, /STAGING_LLM_MOCK_ENABLED\s*=\s*"true"/);
assert.doesNotMatch(productionConfig, /STAGING_LLM_MOCK_ENABLED\s*=/);
assert.match(stagingConfig, /WORKERS_AI_ENABLED\s*=\s*"false"/);

console.log("[verify-staging-llm-mock] PASS — staging mock gate, text/JSON fixtures, direct tarot fallbacks (love·mindscan), and zero provider calls verified.");
