// Gemini API paid tier (Standard), USD per 1M tokens, in the reviewed-tariff
// shape lib/payment/llm-cost-report.mjs accepts. A model missing here is not
// priced: its calls are counted as unpriced instead of guessed.
// Pro's >200k-token prompt rates are omitted: the per-attempt input cap
// (lib/gemini-input-token-limit.mjs) keeps every prompt far below 200k.
const SOURCE_REFS = Object.freeze(["https://ai.google.dev/gemini-api/docs/pricing (Last updated 2026-10-16 UTC)"]);
const REVIEWED_AT = "2026-10-17";

function tariff(inputUsdPerMillion, cachedInputUsdPerMillion, outputUsdPerMillion) {
  // usageMetadata.candidatesTokenCount excludes thoughtsTokenCount, and thinking
  // is billed at the output rate, so thinking is added on top of output.
  return Object.freeze({ inputUsdPerMillion, cachedInputUsdPerMillion, outputUsdPerMillion,
    thinkingIncludedInOutput: false, sourceRefs: SOURCE_REFS, reviewedAt: REVIEWED_AT });
}

export const GEMINI_TARIFFS = Object.freeze({
  "gemini/gemini-2.5-flash": tariff(0.30, 0.03, 2.50),
  "gemini/gemini-2.5-flash-lite": tariff(0.10, 0.01, 0.40),
  "gemini/gemini-2.5-pro": tariff(1.25, 0.125, 10.00),
});

export function normalizeGeminiModel(model) {
  return String(model || "").trim().toLowerCase().replace(/^models\//, "");
}

/** Estimated USD for one Gemini call, or null when the model has no reviewed tariff. */
export function geminiCallCostUsd(model, usage = {}) {
  const rate = GEMINI_TARIFFS[`gemini/${normalizeGeminiModel(model)}`];
  if (!rate) return null;
  const count = value => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0);
  const input = count(usage.inputTokens);
  const cached = Math.min(input, count(usage.cachedInputTokens));
  const output = count(usage.outputTokens) + count(usage.thinkingTokens);
  return ((input - cached) * rate.inputUsdPerMillion + cached * rate.cachedInputUsdPerMillion
    + output * rate.outputUsdPerMillion) / 1_000_000;
}
