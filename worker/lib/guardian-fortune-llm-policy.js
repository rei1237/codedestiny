const TRUE = "true";

const DEFAULTS = Object.freeze({
  provider: "mock",
  model: "gemini-2.5-flash",
  temperature: 0.7,
  maxOutputTokens: 1800,
  timeoutMs: 25000,
  maxRetries: 0,
  responseMimeType: "application/json",
});

function valueOf(env, key) {
  return String(env?.[key] ?? "").trim();
}

function isTrue(env, key) {
  return valueOf(env, key).toLowerCase() === TRUE;
}

export function getGuardianFortuneLLMConfig(env = {}) {
  const maxRetries = Math.min(1, Math.max(0, Number.parseInt(valueOf(env, "GUARDIAN_FORTUNE_LLM_MAX_RETRIES"), 10) || DEFAULTS.maxRetries));
  const maxOutputTokens = Math.min(2200, Math.max(900, Number.parseInt(valueOf(env, "GUARDIAN_FORTUNE_LLM_MAX_TOKENS"), 10) || DEFAULTS.maxOutputTokens));
  const timeoutMs = Math.min(30000, Math.max(5000, Number.parseInt(valueOf(env, "GUARDIAN_FORTUNE_LLM_TIMEOUT_MS"), 10) || DEFAULTS.timeoutMs));
  const temperature = Math.min(1, Math.max(0, Number.parseFloat(valueOf(env, "GUARDIAN_FORTUNE_LLM_TEMPERATURE")) || DEFAULTS.temperature));
  const provider = valueOf(env, "GUARDIAN_FORTUNE_LLM_PROVIDER").toLowerCase() || DEFAULTS.provider;
  const model = valueOf(env, "GUARDIAN_FORTUNE_LLM_MODEL") || DEFAULTS.model;

  return Object.freeze({
    provider,
    model,
    temperature,
    maxOutputTokens,
    timeoutMs,
    maxRetries,
    responseMimeType: DEFAULTS.responseMimeType,
  });
}

export function getGuardianFortuneRealLlmBlockReason({ env = {}, userId = "" } = {}) {
  if (!isTrue(env, "ENABLE_GUARDIAN_FORTUNE_REAL_LLM")) return "REAL_LLM_FLAG_OFF";
  if (!isTrue(env, "ALLOW_REAL_GUARDIAN_FORTUNE_LLM")) return "REAL_LLM_ALLOW_FLAG_OFF";
  if (!isTrue(env, "ENABLE_GUARDIAN_FORTUNE_API")) return "GUARDIAN_API_FLAG_OFF";
  if (valueOf(env, "NODE_ENV").toLowerCase() === "test") return "TEST_ENVIRONMENT";
  const config = getGuardianFortuneLLMConfig(env);
  if (config.provider !== "gemini") return "PROVIDER_NOT_ALLOWED";
  return "";
}

export function shouldUseRealGuardianFortuneLLM(args = {}) {
  return !getGuardianFortuneRealLlmBlockReason(args);
}

export function assertGuardianFortuneRealLLMAllowed(args = {}) {
  const reason = getGuardianFortuneRealLlmBlockReason(args);
  if (reason) {
    const error = new Error("Real Guardian Fortune LLM calls are disabled unless the guarded staging policy is satisfied.");
    error.code = `GUARDIAN_REAL_LLM_${reason}`;
    throw error;
  }
  return true;
}

export { DEFAULTS as GUARDIAN_FORTUNE_LLM_DEFAULTS };
