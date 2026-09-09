import assert from "node:assert/strict";
import fs from "node:fs";
import { callLLM, isStagingLlmMockEnabled } from "../lib/llm-client.ts";
import { enhanceLoveReadingWithLlm } from "../lib/tarot/love-reading-llm.mjs";

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
} finally {
  globalThis.fetch = originalFetch;
}

assert.equal(fetchCalls, 0, "staging mock must make zero provider network calls");

const stagingConfig = fs.readFileSync("worker/wrangler.staging.toml", "utf8");
const productionConfig = fs.readFileSync("worker/wrangler.toml", "utf8");
assert.match(stagingConfig, /STAGING_LLM_MOCK_ENABLED\s*=\s*"true"/);
assert.doesNotMatch(productionConfig, /STAGING_LLM_MOCK_ENABLED\s*=/);
assert.match(stagingConfig, /WORKERS_AI_ENABLED\s*=\s*"false"/);

console.log("[verify-staging-llm-mock] PASS — staging mock gate, text/JSON fixtures, direct tarot fallback, and zero provider calls verified.");
