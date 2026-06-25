import {
  LOVE_SECRET_PREMIUM_ENGINE_VERSION,
  LOVE_SECRET_PREMIUM_QUALITY_VERSION,
  clean,
  hashStable,
  logLoveSecretPdfEvent,
  stableStringify,
} from "./love-secret-premium.types.js";
import { normalizeLoveSecretPremiumInput } from "./love-secret-premium.normalizer.js";
import { assertLoveSecretPremiumChapterPlan, resolveLoveSecretPremiumChapterPlan } from "./love-secret-premium.chapter-plan.js";
import {
  LOVE_SECRET_PREMIUM_PROMPT_VERSION,
  buildLoveSecretChapterPrompt,
  buildLoveSecretRepairPrompt,
  loveSecretSystemPrompt,
} from "./love-secret-premium.prompt-pack.js";
import { generateLoveSecretTextWithLlm, resolveLoveSecretLlmProviders, resolveLoveSecretModelName } from "./llm-client.js";
import { parseLoveSecretPremiumChapterHtml, validateLoveSecretPremiumChapterHtml } from "./love-secret-premium.validator.js";

const CHAPTER_CACHE = new Map();

function readCacheStore(env = {}) {
  return env?.LOVE_SECRET_PREMIUM_LLM_CACHE || env?.PDF_V2_CACHE || env?.REPORT_CACHE || null;
}

async function readChapterCache(env, key) {
  const cached = CHAPTER_CACHE.get(key);
  if (cached) return cached;
  const store = readCacheStore(env);
  if (!store?.get) return null;
  const text = await store.get(key);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

async function writeChapterCache(env, key, value) {
  CHAPTER_CACHE.set(key, value);
  const store = readCacheStore(env);
  if (store?.put) {
    await store.put(key, JSON.stringify(value), { expirationTtl: 60 * 60 * 24 * 30 });
  }
}

export function buildLoveSecretPremiumChapterCacheKey({ normalizedInputHash, chapterId, modelName, chapterPlanVersion }) {
  return `love-secret-premium:${hashStable({
    serviceType: "love-secret-premium",
    engineVersion: LOVE_SECRET_PREMIUM_ENGINE_VERSION,
    qualityVersion: LOVE_SECRET_PREMIUM_QUALITY_VERSION,
    chapterPlanVersion,
    promptVersion: LOVE_SECRET_PREMIUM_PROMPT_VERSION,
    modelName,
    normalizedInputHash,
    chapterId,
    language: "ko",
  })}`;
}

function isRetryableProviderFailure(result = {}) {
  const status = Number(result?.status || 0) || 0;
  const code = clean(result?.errorCode).toLowerCase();
  return status === 429 || status >= 500 || ["provider_exception", "timeout", "empty_response", "love_secret_llm_timeout"].includes(code);
}

function buildChapterPlanSummary(plan) {
  return plan.chapters
    .map((chapter) => `${chapter.order}. ${chapter.title}: ${chapter.sections.join(" / ")}`)
    .join("\n");
}

function normalizeGeneratedChapter({ chapter, html, status, source, provider, modelName, validation }) {
  const parsed = parseLoveSecretPremiumChapterHtml(html, chapter);
  return {
    id: chapter.id,
    order: chapter.order,
    title: chapter.title,
    html,
    status,
    source,
    provider,
    modelName,
    sections: parsed.h2.map((title) => ({ title })),
    textLength: validation?.textLength || parsed.text.replace(/\s/g, "").length,
  };
}

async function generateChapter({ env, input, chapter, plan, normalizedInputHash, modelName, jobId, userId, previousSummary, onProgress }) {
  const cacheKey = buildLoveSecretPremiumChapterCacheKey({
    normalizedInputHash,
    chapterId: chapter.id,
    modelName,
    chapterPlanVersion: plan.version,
  });
  const cached = await readChapterCache(env, cacheKey);
  if (cached?.html) {
    const validation = validateLoveSecretPremiumChapterHtml(cached.html, chapter);
    if (validation.ok) {
      logLoveSecretPdfEvent("ChapterCacheHit", { jobId, userId, chapterId: chapter.id, source: "llm-cache", modelName });
      const completed = normalizeGeneratedChapter({
        chapter,
        html: cached.html,
        status: "cached",
        source: "llm-cache",
        provider: cached.provider || "cache",
        modelName: cached.modelName || modelName,
        validation,
      });
      if (typeof onProgress === "function") await onProgress({ chapter, completedChapter: completed });
      return completed;
    }
  }

  const providers = resolveLoveSecretLlmProviders(env);
  const chapterPlanSummary = buildChapterPlanSummary(plan);
  const maxRepairAttempts = Math.max(1, Number(env?.LOVE_SECRET_PREMIUM_REPAIR_ATTEMPTS || 3));
  const expertPersona = "명리학자로서 사주 신호를 연애 상담 언어로 풀어내되, 결론을 확정하지 않고 선택의 방향을 선명하게 제시한다.";
  let lastErrors = [];
  let lastHtml = "";
  let lastProviderFailure = null;

  for (const provider of providers) {
    for (let attempt = 0; attempt <= maxRepairAttempts; attempt += 1) {
      const userPrompt = attempt === 0
        ? buildLoveSecretChapterPrompt({ input, chapter, chapterPlanSummary, expertPersona, previousSummary })
        : buildLoveSecretRepairPrompt({ input, chapter, previousHtml: lastHtml, validationErrors: lastErrors, expertPersona });
      const started = Date.now();
      const result = await generateLoveSecretTextWithLlm({
        provider,
        model: modelName,
        systemPrompt: loveSecretSystemPrompt,
        userPrompt,
        temperature: Number(env?.LOVE_SECRET_PREMIUM_LLM_TEMPERATURE || 0.7),
        maxTokens: Number(env?.LOVE_SECRET_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
        timeoutMs: Number(env?.LOVE_SECRET_PREMIUM_LLM_TIMEOUT_MS || 120000),
        requestId: `${jobId || "love-secret"}:${chapter.id}:${attempt}`,
      }, env);

      if (!result?.ok) {
        lastProviderFailure = result;
        logLoveSecretPdfEvent("ChapterProviderFailed", {
          jobId,
          userId,
          chapterId: chapter.id,
          provider,
          modelName,
          durationMs: Date.now() - started,
          errorCode: result?.errorCode,
          errorMessage: result?.errorMessage,
        });
        if (isRetryableProviderFailure(result)) continue;
        break;
      }

      lastHtml = String(result.text || "").trim();
      const validation = validateLoveSecretPremiumChapterHtml(lastHtml, chapter);
      if (!validation.ok) {
        lastErrors = validation.errors;
        logLoveSecretPdfEvent("ChapterValidationFailed", {
          jobId,
          userId,
          chapterId: chapter.id,
          provider,
          modelName: result.model || modelName,
          durationMs: Date.now() - started,
          errorCode: validation.errors.join("|").slice(0, 120),
        });
        continue;
      }

      const completed = normalizeGeneratedChapter({
        chapter,
        html: lastHtml,
        status: "completed",
        source: "llm",
        provider: result.provider || provider,
        modelName: result.model || modelName,
        validation,
      });
      await writeChapterCache(env, cacheKey, {
        html: lastHtml,
        provider: completed.provider,
        modelName: completed.modelName,
        promptVersion: LOVE_SECRET_PREMIUM_PROMPT_VERSION,
        chapterPlanVersion: plan.version,
        createdAt: new Date().toISOString(),
      });
      logLoveSecretPdfEvent("ChapterCompleted", {
        jobId,
        userId,
        chapterId: chapter.id,
        source: "llm",
        provider: completed.provider,
        modelName: completed.modelName,
        durationMs: Date.now() - started,
      });
      if (typeof onProgress === "function") await onProgress({ chapter, completedChapter: completed });
      return completed;
    }
  }

  const error = new Error(`LOVE_SECRET_CHAPTER_GENERATION_FAILED:${chapter.id}:${lastErrors.join(",") || clean(lastProviderFailure?.errorCode) || "llm_failed"}`);
  error.code = "LOVE_SECRET_CHAPTER_GENERATION_FAILED";
  error.status = 502;
  error.chapterId = chapter.id;
  error.validationErrors = lastErrors;
  error.providerFailure = lastProviderFailure;
  throw error;
}

export async function generateLoveSecretPremiumReport({
  env = {},
  base = {},
  body = {},
  mode = "solo",
  config = null,
  userId = "",
  jobId = "",
  onProgress = null,
} = {}) {
  const started = Date.now();
  const normalizedInput = normalizeLoveSecretPremiumInput({ base, body, mode, config });
  const plan = resolveLoveSecretPremiumChapterPlan({ mode: normalizedInput.mode, config });
  assertLoveSecretPremiumChapterPlan(plan);
  const normalizedInputHash = hashStable(normalizedInput);
  const modelName = resolveLoveSecretModelName(env);
  const chapters = [];

  logLoveSecretPdfEvent("ReportGenerationStart", {
    jobId,
    userId,
    modelName,
    promptVersion: LOVE_SECRET_PREMIUM_PROMPT_VERSION,
    chapterPlanVersion: plan.version,
  });

  for (const chapter of plan.chapters) {
    const previousSummary = chapters
      .slice(-2)
      .map((item) => `${item.title}: ${clean(item.sections?.map((section) => section.title).join(", "), 220)}`)
      .join("\n");
    const completed = await generateChapter({
      env,
      input: normalizedInput,
      chapter,
      plan,
      normalizedInputHash,
      modelName,
      jobId,
      userId,
      previousSummary,
      onProgress,
    });
    chapters.push(completed);
  }

  const completedCount = chapters.filter((chapter) => ["completed", "cached"].includes(chapter.status)).length;
  if (completedCount !== plan.chapters.length) {
    const error = new Error(`LOVE_SECRET_CHAPTER_COUNT_MISMATCH:${completedCount}/${plan.chapters.length}`);
    error.code = "LOVE_SECRET_CHAPTER_COUNT_MISMATCH";
    error.status = 422;
    throw error;
  }

  const providerChapter = chapters.find((chapter) => chapter.provider && chapter.provider !== "cache") || chapters[0] || {};
  const provider = clean(providerChapter.provider || "llm");
  const completedModelName = clean(providerChapter.modelName || modelName);
  const generated = {
    normalizedInput,
    normalizedInputHash,
    chapters,
    chapterCount: chapters.length,
    expectedChapterCount: plan.chapters.length,
    manuscriptSource: "love-secret-premium-llm-only",
    generationMode: "llm-only",
    provider,
    modelName: completedModelName,
    promptVersion: LOVE_SECRET_PREMIUM_PROMPT_VERSION,
    chapterPlanVersion: plan.version,
    writingPipeline: "saju-love-calculation-to-llm-authored-pdf",
    llmAssembly: {
      enabled: true,
      externalGeneration: true,
      externalCallsAllowed: true,
      fallbackUsed: false,
      localFallback: false,
      provider,
      modelName: completedModelName,
      promptVersion: LOVE_SECRET_PREMIUM_PROMPT_VERSION,
      chapterPlanVersion: plan.version,
      chapterCount: chapters.length,
      expectedChapterCount: plan.chapters.length,
      cacheHits: chapters.filter((chapter) => chapter.source === "llm-cache").length,
      inputHash: normalizedInputHash,
    },
    generationStats: {
      durationMs: Date.now() - started,
      inputHash: normalizedInputHash,
      inputBytes: stableStringify(normalizedInput).length,
    },
  };

  logLoveSecretPdfEvent("ReportGenerationCompleted", {
    jobId,
    userId,
    status: "completed",
    source: generated.manuscriptSource,
    provider,
    modelName,
    durationMs: generated.generationStats.durationMs,
  });
  return generated;
}
