import {
  LIFE_BOOK_PREMIUM_ENGINE_VERSION,
  LIFE_BOOK_PREMIUM_MANUSCRIPT_SOURCE,
  LIFE_BOOK_PREMIUM_QUALITY_VERSION,
  LIFE_BOOK_PREMIUM_WRITING_PIPELINE,
  buildLifeBookLlmAssembly,
  clean,
  hashStable,
  logLifeBookPdfEvent,
  safeObject,
} from "./life-book-premium.types.js";
import { normalizeLifeBookPremiumInput } from "./life-book-premium.normalizer.js";
import { assertLifeBookPremiumChapterPlan, lifeBookPremiumChapterPlanV1 } from "./life-book-premium.chapter-plan.js";
import {
  LIFE_BOOK_PREMIUM_PROMPT_VERSION,
  buildLifeBookChapterPrompt,
  buildLifeBookRepairPrompt,
  lifeBookSystemPrompt,
} from "./life-book-premium.prompt-pack.js";
import { generateLifeBookTextWithLlm, resolveLifeBookLlmProviders, resolveLifeBookModelName } from "./llm-client.js";
import { parseLifeBookPremiumChapterHtml, validateLifeBookPremiumChapterHtml } from "./life-book-premium.validator.js";

const CHAPTER_CACHE = new Map();

function readCacheStore(env = {}) {
  return env?.LIFE_BOOK_PREMIUM_LLM_CACHE || env?.PDF_V2_CACHE || env?.REPORT_CACHE || null;
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

export function buildLifeBookPremiumChapterCacheKey({ normalizedInputHash, chapterId, modelName }) {
  return `life-book-premium:${hashStable({
    serviceType: "life-book-premium",
    engineVersion: LIFE_BOOK_PREMIUM_ENGINE_VERSION,
    qualityVersion: LIFE_BOOK_PREMIUM_QUALITY_VERSION,
    chapterPlanVersion: lifeBookPremiumChapterPlanV1.version,
    promptVersion: LIFE_BOOK_PREMIUM_PROMPT_VERSION,
    modelName,
    normalizedInputHash,
    chapterId,
    language: "ko",
  })}`;
}

function isRetryableProviderFailure(result = {}) {
  const status = Number(result?.status || 0) || 0;
  const code = clean(result?.errorCode).toLowerCase();
  return status === 429 || status >= 500 || ["provider_exception", "timeout", "empty_response", "life_book_llm_timeout"].includes(code);
}

function buildChapterPlanSummary() {
  return lifeBookPremiumChapterPlanV1.chapters
    .map((chapter) => `${chapter.order}. ${chapter.title}: ${chapter.sections.join(" / ")}`)
    .join("\n");
}

async function generateChapter({ env, input, chapter, normalizedInputHash, modelName, jobId, userId, onProgress }) {
  const cacheKey = buildLifeBookPremiumChapterCacheKey({ normalizedInputHash, chapterId: chapter.id, modelName });
  const cached = await readChapterCache(env, cacheKey);
  if (cached?.html) {
    const validation = validateLifeBookPremiumChapterHtml(cached.html, chapter);
    const cacheValid = validation.ok
      && clean(cached.promptVersion) === LIFE_BOOK_PREMIUM_PROMPT_VERSION
      && clean(cached.chapterPlanVersion) === lifeBookPremiumChapterPlanV1.version
      && clean(cached.qualityVersion) === LIFE_BOOK_PREMIUM_QUALITY_VERSION;
    logLifeBookPdfEvent("LIFE_BOOK_CHAPTER_SOURCE_CHECK", {
      jobId,
      userId,
      chapterId: chapter.id,
      status: cacheValid ? "cached" : "cache_invalid",
      source: "llm-cache",
      modelName,
      promptVersion: LIFE_BOOK_PREMIUM_PROMPT_VERSION,
      chapterPlanVersion: lifeBookPremiumChapterPlanV1.version,
    });
    if (cacheValid) {
      const parsed = parseLifeBookPremiumChapterHtml(validation.html, chapter);
      parsed.provider = cached.provider || "cache";
      parsed.cached = true;
      return { ok: true, parsed, provider: parsed.provider, status: "cached", source: "llm-cache", attempts: [] };
    }
  }

  const providers = resolveLifeBookLlmProviders(env);
  const repairLimit = Math.max(0, Number(env?.LIFE_BOOK_PREMIUM_LLM_REPAIR_LIMIT ?? 3));
  const attempts = [];
  let previousHtml = "";
  let prompt = buildLifeBookChapterPrompt({
    input,
    chapter,
    chapterPlanSummary: buildChapterPlanSummary(),
  });

  logLifeBookPdfEvent("LIFE_BOOK_LLM_GENERATION_STARTED", {
    jobId,
    userId,
    chapterId: chapter.id,
    status: "started",
    modelName,
    promptVersion: LIFE_BOOK_PREMIUM_PROMPT_VERSION,
    chapterPlanVersion: lifeBookPremiumChapterPlanV1.version,
  });
  if (typeof onProgress === "function") onProgress({ stage: "llm", chapter });

  for (const provider of providers) {
    prompt = buildLifeBookChapterPrompt({
      input,
      chapter,
      chapterPlanSummary: buildChapterPlanSummary(),
    });
    for (let retry = 0; retry <= repairLimit; retry += 1) {
      const started = Date.now();
      const result = await generateLifeBookTextWithLlm({
        provider,
        systemPrompt: lifeBookSystemPrompt,
        userPrompt: prompt,
        temperature: 0.68,
        maxTokens: Number(env?.LIFE_BOOK_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
        requestId: `${jobId}:${chapter.id}:${retry}`,
      }, env);
      const attempt = {
        provider,
        retry,
        ok: Boolean(result.ok),
        errorCode: clean(result.errorCode),
        status: result.status || null,
        durationMs: Number(result.latencyMs || Date.now() - started),
      };
      attempts.push(attempt);
      if (!result.ok) {
        logLifeBookPdfEvent("LIFE_BOOK_VALIDATION_FAILED", {
          jobId,
          userId,
          chapterId: chapter.id,
          provider,
          modelName: result.model || modelName,
          status: "provider_failed",
          durationMs: attempt.durationMs,
          errorCode: attempt.errorCode,
          errorMessage: result.errorMessage,
        });
        if (retry >= repairLimit || !isRetryableProviderFailure(result)) break;
        continue;
      }

      previousHtml = String(result.text || "").trim();
      const validation = validateLifeBookPremiumChapterHtml(previousHtml, chapter);
      if (validation.ok) {
        await writeChapterCache(env, cacheKey, {
          html: validation.html,
          provider,
          modelName: result.model || modelName,
          promptVersion: LIFE_BOOK_PREMIUM_PROMPT_VERSION,
          chapterPlanVersion: lifeBookPremiumChapterPlanV1.version,
          qualityVersion: LIFE_BOOK_PREMIUM_QUALITY_VERSION,
          storedAt: new Date().toISOString(),
        });
        const parsed = parseLifeBookPremiumChapterHtml(validation.html, chapter);
        parsed.provider = provider;
        parsed.cached = false;
        logLifeBookPdfEvent("LIFE_BOOK_LLM_GENERATION_COMPLETED", {
          jobId,
          userId,
          chapterId: chapter.id,
          status: "completed",
          provider,
          modelName: result.model || modelName,
          durationMs: attempt.durationMs,
        });
        return { ok: true, parsed, provider, status: "completed", source: "llm", attempts };
      }

      attempt.ok = false;
      attempt.errorCode = "validation_failed";
      attempt.issues = validation.issues;
      logLifeBookPdfEvent("LIFE_BOOK_VALIDATION_FAILED", {
        jobId,
        userId,
        chapterId: chapter.id,
        provider,
        modelName: result.model || modelName,
        status: "validation_failed",
        durationMs: attempt.durationMs,
        errorCode: "validation_failed",
        errorMessage: validation.issues.join(","),
      });
      if (retry < repairLimit) {
        logLifeBookPdfEvent("LIFE_BOOK_REPAIR_STARTED", {
          jobId,
          userId,
          chapterId: chapter.id,
          provider,
          modelName: result.model || modelName,
          status: "repair",
        });
        prompt = buildLifeBookRepairPrompt({
          input,
          chapter,
          previousHtml,
          validationErrors: validation.issues,
        });
      }
    }
  }

  return { ok: false, chapterId: chapter.id, title: chapter.title, errorCode: "LIFE_BOOK_CHAPTER_GENERATION_FAILED", attempts };
}

export async function generateLifeBookPremiumReport(params = {}) {
  const env = params.env || {};
  const rawInput = safeObject(params.input);
  const userId = clean(params.userId);
  const jobId = clean(params.jobId || rawInput.reportId || rawInput.sessionId || `life-book-${Date.now().toString(36)}`);
  assertLifeBookPremiumChapterPlan(lifeBookPremiumChapterPlanV1);
  logLifeBookPdfEvent("LIFE_BOOK_INPUT_NORMALIZED", { jobId, userId, status: "started" });
  const normalizedInput = normalizeLifeBookPremiumInput(rawInput);
  if (!clean(normalizedInput.userProfile?.birthDate)) {
    throw Object.assign(new Error("출생일 정보가 필요합니다."), { code: "BIRTH_INPUT_INVALID", status: 422 });
  }
  logLifeBookPdfEvent("LIFE_BOOK_CHAPTER_PLAN_LOADED", {
    jobId,
    userId,
    status: "completed",
    chapterPlanVersion: lifeBookPremiumChapterPlanV1.version,
  });

  const modelName = resolveLifeBookModelName(env);
  const normalizedInputHash = normalizedInput.normalizedInputHash;
  const chapters = [];
  const chapterAttempts = [];
  let provider = "";

  for (const chapter of lifeBookPremiumChapterPlanV1.chapters) {
    const generated = await generateChapter({
      env,
      input: normalizedInput,
      chapter,
      normalizedInputHash,
      modelName,
      jobId,
      userId,
      onProgress: params.onProgress,
    });
    chapterAttempts.push({ chapterId: chapter.id, status: generated.status || "failed", attempts: generated.attempts });
    if (!generated.ok) {
      throw Object.assign(new Error("LIFE_BOOK_CHAPTER_GENERATION_FAILED"), {
        code: "LIFE_BOOK_CHAPTER_GENERATION_FAILED",
        status: 502,
        details: generated,
      });
    }
    provider = provider || generated.provider;
    chapters.push(generated.parsed);
  }

  return {
    ok: true,
    normalizedInput,
    chapters,
    chapterCount: chapters.length,
    expectedChapterCount: lifeBookPremiumChapterPlanV1.chapters.length,
    manuscriptSource: LIFE_BOOK_PREMIUM_MANUSCRIPT_SOURCE,
    generationMode: "llm-only",
    provider: provider || "llm",
    modelName,
    writingPipeline: LIFE_BOOK_PREMIUM_WRITING_PIPELINE,
    llmAssembly: buildLifeBookLlmAssembly(lifeBookPremiumChapterPlanV1.chapters.length),
    llmAssemblyOnly: true,
    externalCallsAllowed: true,
    chapterAttempts,
    pdfV2: {
      engineVersion: LIFE_BOOK_PREMIUM_ENGINE_VERSION,
      qualityVersion: LIFE_BOOK_PREMIUM_QUALITY_VERSION,
      promptVersion: LIFE_BOOK_PREMIUM_PROMPT_VERSION,
      chapterPlanVersion: lifeBookPremiumChapterPlanV1.version,
    },
  };
}
