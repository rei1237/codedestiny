import { generatePdfChapterTextResult } from "../pdf-llm-gateway.js";
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

export async function generateSajuNewYearTextWithLlm(params, env = {}) {
  const context = params?.context && typeof params.context === "object" ? params.context : {};
  const chapter = context.chapter && typeof context.chapter === "object" ? context.chapter : {};
  return generatePdfChapterTextResult({
    jobId: clean(params?.jobId || params?.requestId || "saju-new-year"),
    serviceType: "saju-new-year-json",
    chapterId: clean(chapter.id || chapter.no || params?.chapterId || params?.requestId || "chapter"),
    chapterTitle: clean(chapter.title || params?.chapterTitle || "신년운세"),
    chapterOrder: Number(chapter.no || params?.chapterOrder || 1),
    totalChapters: Number(context.totalChapters || 10),
    prompt: params?.userPrompt || "",
    context: {
      ...context,
      format: "saju-new-year-json",
    },
  }, env);
}
