import { generatePdfChapterTextResult, resolvePdfLlmGatewaySettings } from "../pdf-llm-gateway.js";
import { clean } from "./saju-new-year-premium.types.js";

function resolveConfiguredProvider(env = {}) {
  const provider = clean(env?.PDF_LLM_PROVIDER || "mock").toLowerCase();
  return provider === "gemini" || provider === "workers-ai" || provider === "mock" ? provider : "mock";
}

export function resolveSajuNewYearLlmProviders(env = {}) {
  return [resolveConfiguredProvider(env)];
}

export function resolveSajuNewYearModelName(env = {}) {
  const provider = resolveConfiguredProvider(env);
  if (provider === "workers-ai") {
    return clean(env?.SAJU_NEW_YEAR_WORKERS_AI_MODEL || env?.WORKERS_AI_MODEL || "mock");
  }
  if (provider === "gemini") {
    return clean(
      env?.PREMIUM_SAJU_NEW_YEAR_GEMINI_MODEL
      || env?.SAJU_NEW_YEAR_GEMINI_MODEL
      || env?.PREMIUM_GEMINI_MODEL
      || env?.GEMINI_MODEL
      || "mock",
    );
  }
  return "mock";
}

export function resolveSajuNewYearProviderModelKey(env = {}) {
  const provider = resolveConfiguredProvider(env);
  return `${provider}:${resolveSajuNewYearModelName(env)}`;
}

function configuredRealChapterIds(env = {}) {
  return new Set(
    clean(env?.PDF_REAL_LLM_CHAPTER_IDS || "")
      .split(",")
      .map((item) => clean(item).toLowerCase())
      .filter(Boolean),
  );
}

function chapterAliases(chapterId, chapterOrder) {
  const order = Number(chapterOrder || 0) || 0;
  const id = clean(chapterId).toLowerCase();
  const aliases = new Set([id, String(order), `chapter-${order}`, `newyear-${String(order).padStart(2, "0")}`]);
  if (order === 1 || id === "intro" || id === "newyear-01") aliases.add("intro");
  return aliases;
}

export function resolveSajuNewYearChapterProviderPlan(params = {}, env = {}) {
  const settings = resolvePdfLlmGatewaySettings(env);
  const ids = configuredRealChapterIds(env);
  const aliases = chapterAliases(params.chapterId, params.chapterOrder);
  const allowedById = ids.has("*") || ids.has("all") || Array.from(aliases).some((alias) => ids.has(alias));
  const maxCalls = Math.max(0, Number(settings.maxCallsPerJob || env?.PDF_LLM_MAX_CALLS_PER_JOB || 0) || 0);
  const callsUsed = Math.max(0, Number(params.realLlmCallsUsed || 0) || 0);
  const hasWorkersAiBinding = Boolean(env?.AI && typeof env.AI.run === "function");
  const allowActual = Boolean(
    allowedById
    && settings.dryRun !== true
    && settings.provider === "workers-ai"
    && settings.workersAiEnabled === true
    && hasWorkersAiBinding
    && maxCalls > 0
    && callsUsed < maxCalls
  );
  let reason = "chapter_not_allowlisted";
  if (allowedById && settings.dryRun === true) reason = "dry_run";
  else if (allowedById && settings.provider !== "workers-ai") reason = "provider_not_workers_ai";
  else if (allowedById && settings.workersAiEnabled !== true) reason = "workers_ai_disabled";
  else if (allowedById && !hasWorkersAiBinding) reason = "missing_ai_binding";
  else if (allowedById && maxCalls <= 0) reason = "max_calls_zero";
  else if (allowedById && callsUsed >= maxCalls) reason = "max_calls_exceeded";
  else if (allowActual) reason = "real_llm_allowed";
  return {
    allowActual,
    provider: allowActual ? "workers-ai" : "mock",
    isMock: !allowActual,
    reason,
    allowedById,
    maxCalls,
    callsUsed,
  };
}

export async function generateSajuNewYearTextWithLlm(params, env = {}) {
  const context = params?.context && typeof params.context === "object" ? params.context : {};
  const chapter = context.chapter && typeof context.chapter === "object" ? context.chapter : {};
  return generatePdfChapterTextResult({
    serviceKey: "saju-new-year",
    jobId: clean(params?.jobId || params?.requestId || "saju-new-year"),
    serviceType: "saju-new-year-json",
    chapterId: clean(chapter.id || chapter.no || params?.chapterId || params?.requestId || "chapter"),
    chapterTitle: clean(chapter.title || params?.chapterTitle || "신년운세"),
    chapterOrder: Number(chapter.no || params?.chapterOrder || 1),
    totalChapters: Number(context.totalChapters || 10),
    prompt: params?.userPrompt || "",
    systemPrompt: params?.systemPrompt || "",
    context: {
      ...context,
      serviceKey: "saju-new-year",
      provider: clean(context.provider || params?.provider || resolveConfiguredProvider(env)),
      allowActual: context.allowActual === true,
      format: "saju-new-year-json",
    },
  }, env);
}
