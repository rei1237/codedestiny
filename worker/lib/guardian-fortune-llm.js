import { callGeminiText } from "./gemini.js";
import { toAiLocale } from "../../lib/i18n/ai-locale.js";
import { buildGuardianFortunePrompt } from "./guardian-fortune-prompt.js";
import { selectAnswerVoice } from "./consultation-answer-contract.js";
import { shinsalFactsPinned } from "./engine-rollout.js";
import { buildShinsalFactsBlock } from "../../lib/saju/shinsal-facts-block.mjs";
import { GEMINI_INPUT_TOKEN_HARD_LIMIT } from "../../lib/gemini-input-token-limit.mjs";
import {
  buildFallbackGuardianFortuneResult,
  parseGuardianFortuneLLMResponse,
  validateAndNormalizeGuardianFortuneResult,
  countGuardianFortuneVisibleTextLength,
  hasUsableGuardianFortuneResult,
} from "./guardian-fortune-result.js";
import { generateGuardianFortuneWithMockLLM } from "./guardian-fortune-mock.js";
import { GUARDIAN_FORTUNE_RESULT_LENGTH } from "./guardian-fortune-runtime-contract.js";
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

const GUARDIAN_SHINSAL_MAX_CHARS = 500;
// 운 줄은 세운이 먼저 차면 현재 대운이 빠진다(유료 사주 AI·인생의 책과 같은 12). 전체 길이는 maxChars 가 막는다.
const GUARDIAN_SHINSAL_MAX_LUCK = 12;
// 시스템 + 사용자 프롬프트가 Gemini 입력 상한(countTokens 50,000)의 95% 안에 들 때만 붙인다.
const GUARDIAN_SHINSAL_PROMPT_BUDGET = Math.floor(GEMINI_INPUT_TOKEN_HARD_LIMIT * 0.95);
const SHINSAL_PILLARS = ["year", "month", "day", "hour"];

// 보수적 토큰 추정(유료 사주 AI 와 같은 규칙): 비ASCII 글자·숫자는 한 글자 한 토큰, 나머지 ASCII 는 두 글자 한 토큰.
function estimateGuardianPromptTokens(text) {
  let tokens = 0;
  let ascii = 0;
  for (const ch of String(text || "")) {
    const code = ch.codePointAt(0);
    if (code >= 0x80 || (code >= 0x30 && code <= 0x39)) tokens += 1;
    else ascii += 1;
  }
  return tokens + Math.ceil(ascii / 2);
}

const ganjiOf = (value) => (typeof value === "string" ? value : value?.ganji || "");

// 던지지 않는다. 사주 단일 체계 컨텍스트의 저장된 원국(격국 권위 핀 또는 엔진 사실 스냅샷)과
// 시기표(현재 대운, 기준 날짜 해의 세운)로 블록을 만든다. 원국이 없으면 '' 이라 블록만 빠진다.
function guardianShinsalBlock(context = {}) {
  try {
    if (context?.inputSummary?.category !== "saju") return "";
    const saju = context.saju || {};
    const authority = saju.sajuAuthority?.pillars;
    const facts = saju.engineFacts?.facts?.pillars;
    const source = authority && typeof authority === "object" ? authority : facts;
    if (!source || typeof source !== "object") return "";
    const pillars = Object.fromEntries(SHINSAL_PILLARS.map((key) => [key, ganjiOf(source[key]) || null]));
    const timeUnknown = !pillars.hour || saju.engineFacts?.facts?.calculationMeta?.timeUnknown === true;
    const timing = saju.timingFacts || saju.engineFacts?.facts?.timingFacts || {};
    const cycle = timing.majorLuck?.available === false ? null : timing.majorLuck?.currentCycle;
    const years = Array.isArray(timing.yearlyLuck) ? timing.yearlyLuck : [];
    const targetYear = Number(String(context.inputSummary.targetDate || "").slice(0, 4));
    const sewoon = years.find((row) => Number(row?.year) === targetYear && row?.pillar) || years.find((row) => row?.pillar);
    const luckRows = [
      cycle?.pillar ? { scope: "daewoon", ganji: cycle.pillar, age: cycle.startAge } : null,
      sewoon ? { scope: "sewoon", ganji: sewoon.pillar, year: sewoon.year } : null,
    ].filter(Boolean);
    return buildShinsalFactsBlock({ pillars: { ...pillars, hour: timeUnknown ? null : pillars.hour }, timeUnknown, luckRows },
      { maxChars: GUARDIAN_SHINSAL_MAX_CHARS, maxLuck: GUARDIAN_SHINSAL_MAX_LUCK });
  } catch {
    return "";
  }
}

// 유료 사주 턴의 프롬프트. 핀(paidNarrative.shinsalFacts)이 있고 플래그에 'guardian' 이 켜진 경우에만
// 신살 블록을 계산 근거 바로 뒤에 붙인다. 핀이 없는 기존 기록·무료 상담은 플래그를 켜도 그대로이고,
// 플래그를 비우면 핀이 있어도 꺼진다(킬 스위치). 상한 95%를 넘거나 어떤 실패가 나도 블록만 뺀다.
// 블록은 저장·해시·핀에 들어가지 않는다 — 호출 때마다 저장된 컨텍스트에서 다시 계산한다.
function buildGuardianFortuneCallPrompt({ input = {}, context = {}, env = {}, singleAttempt = false, acceptShortDraft = false, repairDraft = "", shinsalFacts } = {}) {
  const answerVoice = selectAnswerVoice(env);
  const withRepair = (built) => singleAttempt && acceptShortDraft && typeof repairDraft === "string" && repairDraft ? {
    ...built,
    userPrompt: `${built.userPrompt}\n\n[저장된 초안 보완]\n${repairDraft}\n위 초안의 계산 근거와 답변 방향을 보존하고, 부족한 해석·반대 조건·행동 조언만 보완한 같은 JSON 필드 전체를 다시 반환해. 결과 본문 합계 ${GUARDIAN_FORTUNE_RESULT_LENGTH.min}자 이상 ${GUARDIAN_FORTUNE_RESULT_LENGTH.max}자 이하를 목표로 하고, 같은 문장 반복이나 context 에 없는 새 계산값으로 분량을 채우지 마.`,
  } : built;
  const base = withRepair(buildGuardianFortunePrompt({ input, context, answerVoice }));
  try {
    if (!shinsalFactsPinned({ shinsalFacts }, env, "guardian")) return base;
    const block = guardianShinsalBlock(context);
    if (!block) return base;
    const withBlock = withRepair(buildGuardianFortunePrompt({ input, context, answerVoice, shinsalFacts: block }));
    return estimateGuardianPromptTokens(withBlock.systemPrompt) + estimateGuardianPromptTokens(withBlock.userPrompt) <= GUARDIAN_SHINSAL_PROMPT_BUDGET ? withBlock : base;
  } catch {
    return base;
  }
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
  singleAttempt = false,
  // Paid delivery only: keep a structurally complete short answer as a draft, and
  // on the one repair call send that saved draft back to be completed.
  acceptShortDraft = false,
  repairDraft = "",
  // Paid delivery only: the record's shinsal pin (guardian-paid-delivery.js). Free turns never pass it.
  shinsalFacts,
} = {}) {
  assertGuardianFortuneRealLLMAllowed({ env, userId });
  const config = getGuardianFortuneLLMConfig(env);
  const prompt = buildGuardianFortuneCallPrompt({ input, context, env, singleAttempt, acceptShortDraft, repairDraft, shinsalFacts });
  const startedAt = Date.now();
  const providerResult = await callProviderWithLimitedRetry({
    providerCall,
    env,
    prompt,
    maxRetries: singleAttempt ? 0 : config.maxRetries,
    options: {
      locale: toAiLocale(input.locale),
      systemPrompt: prompt.systemPrompt,
      responseMimeType: config.responseMimeType,
      maxOutputTokens: config.maxOutputTokens,
      temperature: config.temperature,
      timeoutMs: config.timeoutMs,
      model: config.model,
      taskType: "fortune",
      // Gemini 가 죽어도 상담이 실패로 끝나지 않게 Workers AI 체인을 안전망으로 둔다
      // (기본 체인은 lib/llm-client.ts 의 glm-4.7-flash → llama-3.3-70b).
      // 예전에는 꺼져 있어서 Gemini 실패 = 곧바로 결정론 템플릿이었다 — 유료 상담(1회 5,000원)이
      // 조용히 같은 골격의 문구로 나가는 셈이라, 실제 리딩 한 겹을 사이에 넣는다.
      //
      // 🔴 유료 라우트에 폴백을 켜면 fallbackMinChars 를 반드시 함께 준다(CLAUDE.md). 없으면
      // 8% 분량짜리 응답도 결제 성공으로 전달된다. 관례대로 최소 분량 상수 × 0.3 을 쓴다.
      // 문턱 미달이면 호출이 실패로 돌아 아래 결정론 폴백이 그대로 이어받는다.
      fallbackMinChars: Math.round(GUARDIAN_FORTUNE_RESULT_LENGTH.min * 0.3),
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

  // Paid turns never reach deterministic enrichment. A short answer is either a
  // structurally complete draft (acceptShortDraft) or rejected as incomplete.
  const short = countGuardianFortuneVisibleTextLength(parsed.value) < GUARDIAN_FORTUNE_RESULT_LENGTH.min;
  const usablePaid = singleAttempt && hasUsableGuardianFortuneResult(parsed.value);
  const lengthDraft = usablePaid && short;
  if (singleAttempt && !usablePaid) {
    return { usedFallback: false, deliverable: false, errorCode: 'PAID_RESULT_INCOMPLETE', usage };
  }
  const validated = validateAndNormalizeGuardianFortuneResult({ parsed: parsed.value, input, context, preserveShort: usablePaid });
  if (!validated.ok) {
    const result = buildValidatedFallback({ input, context, reason: validated.errorCode });
    const deliverable = Boolean(result);
    emitMetric({ ...baseMetric, success: deliverable, fallbackUsed: deliverable, errorCode: validated.errorCode }, metricSink);
    return { result, usedFallback: deliverable, deliverable, errorCode: validated.errorCode, usage };
  }

  emitMetric({ ...baseMetric, success: true, fallbackUsed: false, ...(lengthDraft ? { lengthDraft: true } : {}) }, metricSink);
  return { result: validated.value, usedFallback: false, deliverable: true, ...(lengthDraft ? { lengthDraft: true } : {}), isMock: Boolean(providerResult.isMock || /mock/i.test(`${providerResult.provider || ''} ${providerResult.model || ''}`)), issues: validated.issues, usage };
}

export async function generateGuardianFortuneWithConfiguredLLM(args = {}) {
  if (!shouldUseRealGuardianFortuneLLM({ env: args.env, userId: args.userId })) {
    return generateGuardianFortuneWithMockLLM(args);
  }
  return generateGuardianFortuneWithRealLLM(args);
}

export { emitMetric as recordGuardianFortuneLLMMetric };
export const __guardianShinsalTestUtils = Object.freeze({ buildGuardianFortuneCallPrompt, guardianShinsalBlock, estimateGuardianPromptTokens, GUARDIAN_SHINSAL_PROMPT_BUDGET });
