const TRUE = "true";

const DEFAULTS = Object.freeze({
  provider: "mock",
  model: "gemini-2.5-flash",
  temperature: 0.7,
  // 본문 1,500~2,500자 + 근거 5줄 + 후속 질문 3개 + JSON 구조를 담아야 한다.
  // 한국어는 대략 글자당 1토큰이라 상한을 이보다 낮추면 결과가 잘려 폴백으로 떨어진다.
  maxOutputTokens: 3600,
  timeoutMs: 32000,
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
  const maxOutputTokens = Math.min(4600, Math.max(2400, Number.parseInt(valueOf(env, "GUARDIAN_FORTUNE_LLM_MAX_TOKENS"), 10) || DEFAULTS.maxOutputTokens));
  const timeoutMs = Math.min(45000, Math.max(5000, Number.parseInt(valueOf(env, "GUARDIAN_FORTUNE_LLM_TIMEOUT_MS"), 10) || DEFAULTS.timeoutMs));
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
