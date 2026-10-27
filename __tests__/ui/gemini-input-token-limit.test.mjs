import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertGeminiInputTokenLimit,
  GEMINI_INPUT_TOKEN_HARD_LIMIT,
} from "../../lib/gemini-input-token-limit.mjs";

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const request = {
  contents: [{ role: "user", parts: [{ text: "질문" }] }],
  systemInstruction: { parts: [{ text: "상담 지시" }] },
};

test("Gemini countTokens request carries the complete generation input before allowing inference", async () => {
  const calls = [];
  const total = await assertGeminiInputTokenLimit({
    apiKey: "fixture-key",
    model: "gemini-2.5-flash",
    generateContentRequest: request,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return response({ totalTokens: GEMINI_INPUT_TOKEN_HARD_LIMIT });
    },
  });
  assert.equal(total, GEMINI_INPUT_TOKEN_HARD_LIMIT);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /gemini-2\.5-flash:countTokens/);
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.generateContentRequest.model, "models/gemini-2.5-flash");
  assert.deepEqual(body.generateContentRequest.contents, request.contents);
  assert.deepEqual(body.generateContentRequest.systemInstruction, request.systemInstruction);
});

test("Gemini input over 50,000 tokens is rejected before generation", async () => {
  await assert.rejects(
    assertGeminiInputTokenLimit({
      apiKey: "fixture-key",
      model: "gemini-2.5-flash",
      generateContentRequest: request,
      fetchImpl: async () => response({ totalTokens: GEMINI_INPUT_TOKEN_HARD_LIMIT + 1 }),
    }),
    (error) => error?.code === "LLM_INPUT_TOKEN_LIMIT_EXCEEDED"
      && error?.inputTokens === GEMINI_INPUT_TOKEN_HARD_LIMIT + 1,
  );
});

test("token count failure is fail-closed instead of falling through to inference", async () => {
  await assert.rejects(
    assertGeminiInputTokenLimit({
      apiKey: "fixture-key",
      model: "gemini-2.5-flash",
      generateContentRequest: request,
      fetchImpl: async () => response({}, 503),
    }),
    (error) => error?.code === "LLM_INPUT_TOKEN_COUNT_UNAVAILABLE" && error?.status === 503,
  );
});

test("token count failures preserve safe provider labels without echoed secrets or prompts", async () => {
  const secret = 'fixture-private-key-and-birth-input';
  await assert.rejects(assertGeminiInputTokenLimit({
    apiKey: secret, model: "gemini-2.5-flash", generateContentRequest: request,
    fetchImpl: async () => response({ error: { code: 400, status: "INVALID_ARGUMENT", message: secret,
      details: [{ reason: "API_KEY_INVALID", metadata: { echoedPrompt: secret } }] } }, 400),
  }), error => {
    assert.equal(error.code, "LLM_INPUT_TOKEN_COUNT_UNAVAILABLE");
    assert.equal(error.providerReason, "API_KEY_INVALID");
    assert.equal(error.providerStatus, "INVALID_ARGUMENT");
    assert.equal(error.providerCode, "GEMINI_API_KEY_INVALID");
    assert.equal(error.retryable, false);
    assert.ok(!JSON.stringify(error).includes(secret));
    assert.ok(!error.message.includes(secret));
    return true;
  });
});

test("temporary token count rejection keeps its retryable classification", async () => {
  await assert.rejects(assertGeminiInputTokenLimit({ apiKey: "fixture", model: "gemini-2.5-flash", generateContentRequest: request,
    fetchImpl: async () => response({ error: { code: 503, status: "UNAVAILABLE", message: "private input" } }, 503),
  }), error => error.retryable === true && error.providerStatus === "UNAVAILABLE" && !error.message.includes("private input"));
});

test("all Gemini generation gateways are wired to the shared hard cap", () => {
  const paths = [
    "../../lib/llm-client.ts",
    "../../lib/tarot/love-reading-llm.mjs",
    "../../lib/tarot/mindscan-reading.mjs",
    "../../lib/tarot/oracle-consultation.mjs",
  ];
  for (const path of paths) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /assertGeminiInputTokenLimit\s*\(/, path);
  }
});
