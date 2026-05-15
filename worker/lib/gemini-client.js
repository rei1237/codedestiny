import { callGeminiText } from "./gemini.js";

export async function generateWithGemini(env, prompt, options = {}) {
  const temperature = Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : 0.86;
  const topP = Number.isFinite(Number(options.topP)) ? Number(options.topP) : 0.95;
  const maxOutputTokens = Number.isFinite(Number(options.maxOutputTokens)) ? Number(options.maxOutputTokens) : 8192;
  const timeoutMs = Number.isFinite(Number(options.timeoutMs))
    ? Number(options.timeoutMs)
    : Number(env.PREMIUM_GEMINI_TIMEOUT_MS || 45000);
  const maxAttemptsPerPair = Number.isFinite(Number(options.maxAttemptsPerPair))
    ? Number(options.maxAttemptsPerPair)
    : Number(env.PREMIUM_GEMINI_RETRIES || 2);
  const requestId = String(options.requestId || "").trim();

  return callGeminiText(env, prompt, {
    keyEnvKeys: [
      "PREMIUM_GEMINI_API_KEY1",
      "PREMIUM_GEMINI_API_KEY2",
      "PREMIUM_GEMINI_API_KEY3",
      "PREMIUM_GEMINI_API_KEY4",
      "GEMINI_API_KEY",
      "GOOGLE_GEMINI_API_KEY",
      "GOOGLE_GENERATIVE_AI_API_KEY",
      "GOOGLE_API_KEY",
    ],
    modelEnvKeys: ["PREMIUM_GEMINI_MODEL", ...(Array.isArray(options.modelEnvKeys) ? options.modelEnvKeys : [])],
    temperature,
    topP,
    maxOutputTokens,
    timeoutMs,
    maxAttemptsPerPair,
    metadata: requestId ? { requestId } : undefined,
  });
}
