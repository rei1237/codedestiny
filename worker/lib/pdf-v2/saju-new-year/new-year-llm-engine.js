import { clean, hashStable } from "./saju-new-year-premium.types.js";
import {
  generateSajuNewYearTextWithLlm,
  resolveSajuNewYearLlmProviders,
  resolveSajuNewYearModelName,
  resolveSajuNewYearProviderModelKey,
} from "./llm-client.js";
import { NEW_YEAR_LLM_VERSION } from "./new-year-chapters.js";
import { buildNewYearChapterPrompt, buildNewYearRepairPrompt, newYearSystemPrompt } from "./new-year-prompts.js";
import { NewYearPdfGenerationError, validateNewYearChapterHtml } from "./new-year-validator.js";

const CHAPTER_CACHE = new Map();

function cacheStore(env = {}) {
  return env?.SAJU_NEW_YEAR_LLM_CACHE || env?.PDF_V2_CACHE || env?.REPORT_CACHE || null;
}

async function getCachedChapter(env, key) {
  const memory = CHAPTER_CACHE.get(key);
  if (memory) return memory;
  const store = cacheStore(env);
  if (!store?.get) return null;
  const text = await store.get(key);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

async function saveChapterCache(env, key, value) {
  CHAPTER_CACHE.set(key, value);
  const store = cacheStore(env);
  if (store?.put) await store.put(key, JSON.stringify(value), { expirationTtl: 60 * 60 * 24 * 30 });
}

export function buildNewYearChapterCacheKey(input = {}, chapter = {}, options = {}) {
  return `new-year-llm-chapter:${hashStable({
    service: "new-year",
    version: NEW_YEAR_LLM_VERSION,
    chapterConfigVersion: clean(options.chapterConfigVersion),
    chapterId: clean(chapter.id),
    targetYear: Number(input.targetYear || 0),
    birthDataHash: hashStable({
      userName: input.userName,
      gender: input.gender,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      calendarType: input.calendarType,
    }),
    sajuChartHash: hashStable(input.sajuChart || {}),
    luckCyclesHash: hashStable(input.luckCycles || {}),
    annualLuckHash: hashStable(input.annualLuck || {}),
    monthlyLuckHash: hashStable(input.monthlyLuck || []),
    questionHash: hashStable(clean(input.question || "")),
    modelName: clean(options.modelName),
  })}`;
}

function stripOuterNoise(value = "") {
  return clean(value, 300000)
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function textFromHtml(html = "") {
  return clean(String(html || "").replace(/<[^>]+>/g, " "), 300000);
}

function blockText(html = "", className = "") {
  const re = new RegExp(`<div\\b[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>`, "i");
  return textFromHtml(String(html || "").match(re)?.[1] || "");
}

export function chapterHtmlToClientChapter(html = "", chapter = {}, index = 0) {
  const summary = blockText(html, "chapter-summary");
  const body = blockText(html, "chapter-body");
  const advice = blockText(html, "chapter-advice");
  const text = [summary, body, advice].filter(Boolean).join("\n\n");
  return {
    no: Number(chapter.no || index + 1),
    id: clean(chapter.id),
    category: clean(chapter.category),
    title: clean(chapter.title),
    focus: clean(chapter.purpose),
    purpose: clean(chapter.purpose),
    html,
    sections: [
      { title: "핵심 요약", body: summary },
      { title: "상담 본문", body },
      { title: "올해의 실천 처방", body: advice },
    ].filter((section) => section.body),
    categories: [
      { title: "핵심 요약", finalText: summary, text: summary },
      { title: "상담 본문", finalText: body, text: body },
      { title: "올해의 실천 처방", finalText: advice, text: advice },
    ].filter((section) => section.text),
    text,
    source: "saju-new-year-llm-only",
  };
}

async function callChapterProvider({ env, provider, prompt, chapter, jobId, retry }) {
  return generateSajuNewYearTextWithLlm({
    provider,
    systemPrompt: newYearSystemPrompt,
    userPrompt: prompt,
    temperature: Number(env?.SAJU_NEW_YEAR_LLM_TEMPERATURE ?? 0.62),
    maxTokens: Number(env?.SAJU_NEW_YEAR_CHAPTER_MAX_TOKENS || 12000),
    requestId: `${jobId}:new-year:${chapter.id}:${retry}`,
  }, env);
}

export async function generateNewYearChapterWithLLM({ env, input, chapter, chapterPlan, cacheKey, jobId }) {
  const cached = await getCachedChapter(env, cacheKey);
  if (cached?.html) {
    const cachedValidation = validateNewYearChapterHtml(cached.html, chapter, { targetYear: input.targetYear });
    if (cachedValidation.ok && cached.version === NEW_YEAR_LLM_VERSION) {
      return { ok: true, html: cached.html, provider: cached.provider || "cache", modelName: cached.modelName || "", cacheHit: true, attempts: [] };
    }
  }

  const providers = resolveSajuNewYearLlmProviders(env);
  const repairLimit = Math.max(0, Number(env?.SAJU_NEW_YEAR_LLM_REPAIR_LIMIT ?? 2));
  const attempts = [];

  for (const provider of providers) {
    let prompt = buildNewYearChapterPrompt({ input, chapter, chapterPlan });
    let invalidHtml = "";
    let validationErrors = [];
    for (let retry = 0; retry <= repairLimit; retry += 1) {
      if (retry > 0) {
        prompt = buildNewYearRepairPrompt({ input, chapter, invalidHtml, errors: validationErrors });
      }
      const result = await callChapterProvider({ env, provider, prompt, chapter, jobId, retry });
      const attempt = {
        provider,
        retry,
        ok: Boolean(result.ok),
        errorCode: clean(result.errorCode),
        status: Number(result.status || 0) || null,
        modelName: clean(result.model),
      };
      attempts.push(attempt);
      if (!result.ok) continue;
      const html = stripOuterNoise(result.text || "");
      const validation = validateNewYearChapterHtml(html, chapter, { targetYear: input.targetYear });
      if (validation.ok) {
        const payload = {
          version: NEW_YEAR_LLM_VERSION,
          html,
          provider: clean(result.provider || provider),
          modelName: clean(result.model),
          storedAt: new Date().toISOString(),
        };
        await saveChapterCache(env, cacheKey, payload);
        return { ok: true, html, provider: payload.provider, modelName: payload.modelName, cacheHit: false, attempts };
      }
      attempt.ok = false;
      attempt.errorCode = "validation_failed";
      attempt.errors = validation.errors;
      invalidHtml = html;
      validationErrors = validation.errors;
    }
  }

  return { ok: false, errorCode: "GENERATION_FAILED", attempts };
}

export async function generateChaptersWithLLM({ env, input, chapterPlan, chapterConfigVersion, jobId, onProgress }) {
  const chapters = [];
  const chapterHtmlFragments = [];
  const attempts = [];
  const providerSet = new Set();
  const modelSet = new Set();
  const modelName = resolveSajuNewYearProviderModelKey(env) || resolveSajuNewYearModelName(env);
  const total = chapterPlan.length;

  for (const chapter of chapterPlan) {
    const index = chapters.length;
    const progress = Math.round(10 + (index / Math.max(1, total)) * 70);
    if (typeof onProgress === "function") {
      await onProgress({
        status: "generating",
        progress,
        chapterId: chapter.id,
        chapterIndex: index + 1,
        chapterCount: total,
        currentChapterNumber: index + 1,
        currentChapterTitle: clean(chapter.title),
        completedChapters: index,
        totalChapters: total,
        currentStep: `챕터 ${index + 1}: ${clean(chapter.title)} 생성 중입니다.`,
      });
    }
    const cacheKey = buildNewYearChapterCacheKey(input, chapter, { chapterConfigVersion, modelName });
    const result = await generateNewYearChapterWithLLM({ env, input, chapter, chapterPlan, cacheKey, jobId });
    attempts.push(...(result.attempts || []));
    if (!result.ok) {
      const error = new NewYearPdfGenerationError(`New year chapter generation failed: ${chapter.id}`, {
        code: "GENERATION_FAILED",
        status: 503,
        stage: "generating",
        errors: [`chapter:${chapter.id}`],
      });
      error.chapterNumber = index + 1;
      error.chapterTitle = clean(chapter.title);
      error.details = {
        chapterNumber: index + 1,
        chapterTitle: clean(chapter.title),
        chapterId: clean(chapter.id),
        attempts: result.attempts || [],
        errorCode: clean(result.errorCode || "GENERATION_FAILED"),
      };
      error.rawLlmError = JSON.stringify(result.attempts || []).slice(0, 2000);
      throw error;
    }
    providerSet.add(result.provider);
    if (result.modelName) modelSet.add(result.modelName);
    chapterHtmlFragments.push(result.html);
    chapters.push(chapterHtmlToClientChapter(result.html, chapter, index));
    const doneProgress = Math.round(10 + ((index + 1) / Math.max(1, total)) * 70);
    if (typeof onProgress === "function") {
      await onProgress({
        status: "generating",
        progress: doneProgress,
        chapterId: chapter.id,
        chapterIndex: index + 1,
        chapterCount: total,
        currentChapterNumber: Math.min(total, index + 2),
        currentChapterTitle: clean(chapterPlan[Math.min(total - 1, index + 1)]?.title || chapter.title),
        completedChapters: index + 1,
        totalChapters: total,
        currentStep: index + 1 >= total ? "전체 리포트 검수 중입니다." : `챕터 ${index + 1}: ${clean(chapter.title)} 생성이 완료되었습니다.`,
      });
    }
  }

  return {
    chapters,
    chapterHtmlFragments,
    attempts,
    provider: providerSet.has("gemini") ? "gemini" : ([...providerSet][0] || "workers-ai"),
    modelName: [...modelSet].filter(Boolean).join(",") || resolveSajuNewYearModelName(env),
  };
}
