// Standalone Gemini readers bypass llm-client.ts; include every response, even
// invalid/short output, because those attempts may still incur provider charges.
export function logTarotTokenUsage(payload, { env = {}, model, serviceId, maxTokens }) {
  if (["0", "false", "off"].includes(String(env.LLM_PROVIDER_CALL_LOG || "").toLowerCase())) return;
  const usage = payload?.usageMetadata;
  console.info("[llm token_usage]", {
    action: "token_usage", provider: "gemini", model, serviceId, taskType: "tarot",
    inputTokens: Number(usage?.promptTokenCount) || 0,
    outputTokens: Number(usage?.candidatesTokenCount) || 0,
    cachedInputTokens: Number(usage?.cachedContentTokenCount) || 0,
    thinkingTokens: Number(usage?.thoughtsTokenCount) || 0,
    maxTokens: Number(maxTokens) || 0,
    estimated: !Number.isFinite(usage?.promptTokenCount) || !Number.isFinite(usage?.candidatesTokenCount),
  });
}
