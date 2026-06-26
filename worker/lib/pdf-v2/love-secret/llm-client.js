import { generatePdfChapterTextResult } from "../pdf-llm-gateway.js";
import { clean } from "./love-secret-premium.types.js";

function resolveConfiguredProvider(env = {}) {
  const provider = clean(env?.PDF_LLM_PROVIDER || "mock").toLowerCase();
  return provider === "gemini" || provider === "workers-ai" || provider === "mock" ? provider : "mock";
}

export function resolveLoveSecretLlmProviders(env = {}) {
  return [resolveConfiguredProvider(env)];
}

export function resolveLoveSecretModelName(env = {}, provider = "") {
  const resolvedProvider = clean(provider || resolveConfiguredProvider(env)).toLowerCase();
  if (resolvedProvider === "workers-ai") return clean(env?.LOVE_SECRET_PREMIUM_WORKERS_AI_MODEL || env?.WORKERS_AI_MODEL || "mock");
  if (resolvedProvider === "gemini") return clean(env?.LOVE_SECRET_PREMIUM_GEMINI_MODEL || env?.PREMIUM_GEMINI_MODEL || env?.GEMINI_MODEL || "mock");
  return "mock";
}

export async function generateLoveSecretTextWithLlm(params = {}, env = {}) {
  const context = params?.context && typeof params.context === "object" ? params.context : {};
  const chapter = context.chapter && typeof context.chapter === "object" ? context.chapter : {};
  return generatePdfChapterTextResult({
    jobId: clean(params.jobId || params.requestId || "love-secret"),
    serviceType: "love-secret",
    chapterId: clean(chapter.id || params.chapterId || params.requestId || "love-secret-chapter"),
    chapterTitle: clean(chapter.title || params.chapterTitle || "연애비책"),
    chapterOrder: Number(chapter.order || chapter.no || params.chapterOrder || 1),
    totalChapters: Number(context.totalChapters || params.totalChapters || 1),
    prompt: params.userPrompt || "",
    context: {
      ...context,
      format: "love-secret-html",
      chapter,
    },
  }, env);
}
