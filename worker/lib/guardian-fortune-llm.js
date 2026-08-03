import { callGeminiText } from "./gemini.js";
import { buildGuardianFortunePrompt } from "./guardian-fortune-prompt.js";
import {
  buildFallbackGuardianFortuneResult,
  parseGuardianFortuneLLMResponse,
  validateAndNormalizeGuardianFortuneResult,
} from "./guardian-fortune-result.js";
import { generateGuardianFortuneWithMockLLM } from "./guardian-fortune-mock.js";
import {
  assertGuardianFortuneRealLLMAllowed,
  getGuardianFortuneLLMConfig,
  shouldUseRealGuardianFortuneLLM,
} from "./guardian-fortune-llm-policy.js";

function safeMetricNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : undefined;
}

function safeMetricText(value, max = 80) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) || undefined;
}

function metricUsage(usage = {}) {
  return {
    inputTokens: safeMetricNumber(usage.inputTokens),
    outputTokens: safeMetricNumber(usage.outputTokens),
    totalTokens: safeMetricNumber(usage.totalTokens),
    estimatedCostKRW: safeMetricNumber(usage.estimatedCostKRW),
  };
}

function estimateCostKRW(usage, env = {}) {
  const inputRate = Number(env.GUARDIAN_FORTUNE_LLM_INPUT_COST_KRW_PER_1K);
  const outputRate = Number(env.GUARDIAN_FORTUNE_LLM_OUTPUT_COST_KRW_PER_1K);
  if (!Number.isFinite(inputRate) || !Number.isFinite(outputRate)) return undefined;
  const inputTokens = Number(usage.inputTokens) || 0;
  const outputTokens = Number(usage.outputTokens) || 0;
  return (inputTokens / 1000) * inputRate + (outputTokens / 1000) * outputRate;
}

function emitMetric(metric, metricSink) {
  if (typeof metricSink === "function") {
    metricSink(metric);
    return;
  }
  // Only allowlisted operational fields are emitted. Raw prompts, responses,
  // context and user input never enter this object.
  console.info("[guardian-fortune-llm-metric]", metric);
}

function isRetryable(result) {
  const status = Number(result?.status || 0);
  const error = String(result?.error || "").toLowerCase();
  return status === 429 || status >= 500 || /timeout|network|fetch|temporar|overloaded/.test(error);
}

function resultErrorCode(result, fallback = "GUARDIAN_REAL_LLM_PROVIDER_FAILED") {
  return safeMetricText(result?.error, 80) || fallback;
}

function buildValidatedFallback({ input, context, reason }) {
  const fallback = buildFallbackGuardianFortuneResult({ input, context, reason });
  const validated = validateAndNormalizeGuardianFortuneResult({ parsed: fallback, input, context });
  return validated.ok ? validated.value : undefined;
}

async function callProviderWithLimitedRetry({ providerCall, env, prompt, options, maxRetries }) {
  let lastResult;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      lastResult = await providerCall(env, prompt.userPrompt, options);
    } catch (error) {
      lastResult = {
        ok: false,
        error: safeMetricText(error?.code, 80) || "provider_exception",
        status: Number(error?.status || 0) || null,
      };
    }
    if (lastResult?.ok || attempt >= maxRetries || !isRetryable(lastResult)) break;
  }
  return lastResult;
}

export async function generateGuardianFortuneWithRealLLM({
  input = {},
  context = {},
  requestId = "",
  userId = "",
  generationSource = "",
  env = {},
  providerCall = callGeminiText,
  metricSink,
} = {}) {
  assertGuardianFortuneRealLLMAllowed({ env, userId });
  const config = getGuardianFortuneLLMConfig(env);
  const prompt = buildGuardianFortunePrompt({ input, context });
  const startedAt = Date.now();
  const providerResult = await callProviderWithLimitedRetry({
    providerCall,
    env,
    prompt,
    maxRetries: config.maxRetries,
    options: {
      systemPrompt: prompt.systemPrompt,
      responseMimeType: config.responseMimeType,
      maxOutputTokens: config.maxOutputTokens,
      temperature: config.temperature,
      timeoutMs: config.timeoutMs,
      model: config.model,
      taskType: "fortune",
      fallbackToWorkersAI: false,
      logContext: {
        requestId: safeMetricText(requestId, 120),
        featureKey: "guardian_fortune",
        topic: safeMetricText(prompt.topic, 40),
        mode: safeMetricText(prompt.mode, 20),
      },
    },
  });
  const latencyMs = Date.now() - startedAt;
  const usage = metricUsage(providerResult?.usage);
  if (usage.estimatedCostKRW === undefined) usage.estimatedCostKRW = estimateCostKRW(usage, env);

  const baseMetric = {
    requestId: safeMetricText(requestId, 120),
    provider: safeMetricText(providerResult?.provider, 40) || config.provider,
    model: safeMetricText(providerResult?.model, 100) || config.model,
    latencyMs,
    ...usage,
    topic: prompt.topic,
    mode: prompt.mode,
    generationSource: safeMetricText(generationSource, 40),
  };

  if (!providerResult?.ok || typeof providerResult.text !== "string") {
    const result = buildValidatedFallback({ input, context, reason: resultErrorCode(providerResult) });
    const deliverable = Boolean(result);
    emitMetric({ ...baseMetric, success: deliverable, fallbackUsed: deliverable, errorCode: resultErrorCode(providerResult) }, metricSink);
    return {
      result,
      usedFallback: deliverable,
      deliverable,
      errorCode: resultErrorCode(providerResult),
      usage,
    };
  }

  const parsed = parseGuardianFortuneLLMResponse(providerResult.text);
  if (!parsed.ok) {
    const result = buildValidatedFallback({ input, context, reason: parsed.errorCode });
    const deliverable = Boolean(result);
    emitMetric({ ...baseMetric, success: deliverable, fallbackUsed: deliverable, errorCode: parsed.errorCode }, metricSink);
    return { result, usedFallback: deliverable, deliverable, errorCode: parsed.errorCode, usage };
  }

  const validated = validateAndNormalizeGuardianFortuneResult({ parsed: parsed.value, input, context });
  if (!validated.ok) {
    const result = buildValidatedFallback({ input, context, reason: validated.errorCode });
    const deliverable = Boolean(result);
    emitMetric({ ...baseMetric, success: deliverable, fallbackUsed: deliverable, errorCode: validated.errorCode }, metricSink);
    return { result, usedFallback: deliverable, deliverable, errorCode: validated.errorCode, usage };
  }

  emitMetric({ ...baseMetric, success: true, fallbackUsed: false }, metricSink);
  return { result: validated.value, usedFallback: false, deliverable: true, issues: validated.issues, usage };
}

export async function generateGuardianFortuneWithConfiguredLLM(args = {}) {
  if (!shouldUseRealGuardianFortuneLLM({ env: args.env, userId: args.userId })) {
    return generateGuardianFortuneWithMockLLM(args);
  }
  return generateGuardianFortuneWithRealLLM(args);
}

export { emitMetric as recordGuardianFortuneLLMMetric };
