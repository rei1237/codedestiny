import { generatePdfChapterTextResult } from "../pdf-llm-gateway.js";
import { clean } from "./soul-origin-premium.types.js";

function resolveConfiguredProvider(env = {}) {
  const provider = clean(env?.PDF_LLM_PROVIDER || "mock").toLowerCase();
  return provider === "gemini" || provider === "workers-ai" || provider === "mock" ? provider : "mock";
}

export function resolveSoulOriginModelName(env = {}) {
  const provider = resolveConfiguredProvider(env);
  if (provider === "workers-ai") return clean(env?.SOUL_ORIGIN_WORKERS_AI_MODEL || env?.WORKERS_AI_MODEL || "mock");
  if (provider === "gemini") return clean(env?.SOUL_ORIGIN_GEMINI_MODEL || env?.SOUL_ORIGIN_LLM_MODEL || env?.PREMIUM_GEMINI_MODEL || env?.GEMINI_MODEL || "mock");
  return "mock";
}

export async function generateSoulOriginTextWithLlm(params = {}, env = {}) {
  const context = params?.context && typeof params.context === "object" ? params.context : {};
  const chapter = context.chapter && typeof context.chapter === "object" ? context.chapter : {};
  const isKarmaChapter = clean(context.format).includes("karma")
    || clean(params.requestId).includes(":karma:");
  return generatePdfChapterTextResult({
    jobId: clean(params.jobId || params.requestId || "soul-origin"),
    serviceType: isKarmaChapter ? "karma-integrated" : "soul-origin",
    chapterId: clean(chapter.id || params.chapterId || (isKarmaChapter ? "karma-chapter" : "full-report")),
    chapterTitle: clean(chapter.title || params.chapterTitle || (isKarmaChapter ? "운명의 업" : "운명의 업 전체 리포트")),
    chapterOrder: Number(chapter.order || chapter.no || params.chapterOrder || 1),
    totalChapters: Number(context.totalChapters || params.totalChapters || 1),
    prompt: params.userPrompt || "",
    context: {
      ...context,
      format: isKarmaChapter ? "karma-integrated-html" : "soul-origin-json",
      chapter,
    },
  }, env);
}
