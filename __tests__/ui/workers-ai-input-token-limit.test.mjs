import test from "node:test";
import assert from "node:assert/strict";
import {
  assertWorkersAiInputTokenLimit,
  WORKERS_AI_CHAT_TEMPLATE_TOKEN_RESERVE,
  WORKERS_AI_INPUT_TOKEN_HARD_LIMIT,
  workersAiInputTokenLimitForModel,
  workersAiInputTokenUpperBound,
} from "../../lib/workers-ai-input-token-limit.mjs";

test("Workers AI uses a conservative UTF-8 upper bound with chat template reserve", () => {
  const messages = [
    { role: "system", content: "상담" },
    { role: "user", content: "abc" },
  ];
  assert.equal(
    workersAiInputTokenUpperBound(messages),
    Buffer.byteLength("상담abc", "utf8") + WORKERS_AI_CHAT_TEMPLATE_TOKEN_RESERVE,
  );
});

test("Workers AI rejects input above the immutable 50,000-token upper bound", () => {
  const messages = [{ role: "user", content: "a".repeat(WORKERS_AI_INPUT_TOKEN_HARD_LIMIT) }];
  assert.throws(
    () => assertWorkersAiInputTokenLimit({ model: "@cf/zai-org/glm-4.7-flash", messages, maxOutputTokens: 4096 }),
    (error) => error?.code === "WORKERS_AI_INPUT_TOKEN_LIMIT_EXCEEDED"
      && error?.inputTokenUpperBound > WORKERS_AI_INPUT_TOKEN_HARD_LIMIT,
  );
});

test("Llama fallback reserves requested output inside its 24k context window", () => {
  const limit = workersAiInputTokenLimitForModel(
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    8_000,
  );
  assert.equal(limit, 24_000 - 8_000 - WORKERS_AI_CHAT_TEMPLATE_TOKEN_RESERVE);
  assert.throws(
    () => assertWorkersAiInputTokenLimit({
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      messages: [{ role: "user", content: "a".repeat(limit) }],
      maxOutputTokens: 8_000,
    }),
    (error) => error?.code === "WORKERS_AI_INPUT_TOKEN_LIMIT_EXCEEDED",
  );
});

test("unknown override models still receive the shared cost cap", () => {
  const messages = [{ role: "user", content: "small prompt" }];
  assert.equal(
    assertWorkersAiInputTokenLimit({ model: "@cf/future/model", messages, maxOutputTokens: 4096 }),
    workersAiInputTokenUpperBound(messages),
  );
  assert.equal(
    workersAiInputTokenLimitForModel("@cf/future/model", 4096),
    WORKERS_AI_INPUT_TOKEN_HARD_LIMIT,
  );
});
