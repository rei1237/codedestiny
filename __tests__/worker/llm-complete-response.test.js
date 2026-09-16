/** @jest-environment node */
import { isCompleteLlmResponse, hasRenderableLlmText } from "../../worker/lib/llm-result-delivery.js";
import { extractGeminiText } from "../../worker/lib/gemini.js";

test.each([{ truncated: true }, { finishReason: "MAX_TOKENS" }, { finishReason: "length" }, { finishReason: " LENGTH " }])("readable but truncated response stays incomplete: %o", flags => {
  const response = { ok: true, text: "이미 생성된 부분은 읽을 수 있도록 보존합니다. ".repeat(30), ...flags };
  expect(hasRenderableLlmText(response.text)).toBe(true);
  expect(isCompleteLlmResponse(response)).toBe(false);
});
test("finished text remains eligible for each product's quality validation", () => {
  expect(isCompleteLlmResponse({ ok: true, finishReason: "STOP", truncated: false })).toBe(true);
  expect(isCompleteLlmResponse({ ok: false })).toBe(false);
});
test("Gemini thought parts never become reader text or invalid JSON prefixes", () => {
  expect(extractGeminiText({ candidates: [{ content: { parts: [{ thought: true, text: "내부 해석 계획" }, { text: '{"body":"완성된 원고"}' }] } }] }))
    .toBe('{"body":"완성된 원고"}');
});
