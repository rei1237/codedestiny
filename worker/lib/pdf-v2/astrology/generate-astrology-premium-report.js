import { prepareAstroPremiumCalculation } from "../../astro-premium-generator.js";
import {
  ASTROLOGY_PREMIUM_ENGINE_VERSION,
  ASTROLOGY_PREMIUM_QUALITY_VERSION,
  clean,
  hashStable,
  logAstrologyPdfEvent,
  safeObject,
  stableStringify,
} from "./astrology-premium.types.js";
import { normalizeAstrologyPremiumInput } from "./astrology-premium.normalizer.js";
import { assertAstrologyPremiumChapterPlan, astrologyPremiumChapterPlanV2 } from "./astrology-premium.chapter-plan.js";
import {
  ASTROLOGY_PREMIUM_PROMPT_VERSION,
  astrologySystemPrompt,
  buildAstrologyChapterPrompt,
  buildAstrologyRepairPrompt,
} from "./astrology-premium.prompt-pack.js";
import { generateAstrologyTextWithLlm, resolveAstrologyLlmProviders, resolveAstrologyModelName } from "./llm-client.js";
import { parseAstrologyPremiumChapterHtml, validateAstrologyPremiumChapterHtml } from "./astrology-premium.validator.js";

const CHAPTER_CACHE = new Map();

function readCacheStore(env = {}) {
  return env?.ASTROLOGY_PREMIUM_LLM_CACHE || env?.PDF_V2_CACHE || env?.REPORT_CACHE || null;
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

export function buildAstrologyPremiumChapterCacheKey({ normalizedInputHash, chapterId, modelName }) {
  return `astrology-premium:${hashStable({
    serviceType: "astrology-premium",
    engineVersion: ASTROLOGY_PREMIUM_ENGINE_VERSION,
    qualityVersion: ASTROLOGY_PREMIUM_QUALITY_VERSION,
    chapterPlanVersion: astrologyPremiumChapterPlanV2.version,
    promptVersion: ASTROLOGY_PREMIUM_PROMPT_VERSION,
    modelName,
    normalizedInputHash,
    chapterId,
    language: "ko",
  })}`;
}

function isRetryableProviderFailure(result = {}) {
  const status = Number(result?.status || 0) || 0;
  const code = clean(result?.errorCode).toLowerCase();
  return status === 429 || status >= 500 || ["provider_exception", "timeout", "empty_response", "astrology_llm_timeout"].includes(code);
}

function buildChapterPlanSummary() {
  return astrologyPremiumChapterPlanV2.chapters
    .map((chapter) => `${chapter.order}. ${chapter.title}: ${chapter.sections.join(" / ")}`)
    .join("\n");
}

async function generateChapter({ env, input, chapter, normalizedInputHash, modelName, jobId, userId, onProgress }) {
  const cacheKey = buildAstrologyPremiumChapterCacheKey({ normalizedInputHash, chapterId: chapter.id, modelName });
  const cached = await readChapterCache(env, cacheKey);
  if (cached?.html) {
    const validation = validateAstrologyPremiumChapterHtml(cached.html, chapter);
    const cacheValid = validation.ok
      && clean(cached.promptVersion) === ASTROLOGY_PREMIUM_PROMPT_VERSION
      && clean(cached.chapterPlanVersion) === astrologyPremiumChapterPlanV2.version
      && clean(cached.qualityVersion) === ASTROLOGY_PREMIUM_QUALITY_VERSION;
    logAstrologyPdfEvent("ASTROLOGY_CHAPTER_SOURCE_CHECK", {
      jobId,
      userId,
      chapterId: chapter.id,
      status: cacheValid ? "cached" : "cache_invalid",
      source: "llm-cache",
      modelName,
      promptVersion: ASTROLOGY_PREMIUM_PROMPT_VERSION,
      chapterPlanVersion: astrologyPremiumChapterPlanV2.version,
    });
    if (cacheValid) {
      const parsed = parseAstrologyPremiumChapterHtml(validation.html, chapter);
      parsed.provider = cached.provider || "cache";
      parsed.cached = true;
      return { ok: true, parsed, provider: parsed.provider, status: "cached", source: "llm-cache", attempts: [] };
    }
  }

  logAstrologyPdfEvent("ASTROLOGY_CHAPTER_SOURCE_CHECK", {
    jobId,
    userId,
    chapterId: chapter.id,
    status: "cache_miss",
    source: "llm",
    modelName,
    promptVersion: ASTROLOGY_PREMIUM_PROMPT_VERSION,
    chapterPlanVersion: astrologyPremiumChapterPlanV2.version,
  });

  const providers = resolveAstrologyLlmProviders(env);
  const repairLimit = Math.max(0, Number(env?.ASTROLOGY_PREMIUM_LLM_REPAIR_LIMIT ?? 3));
  const attempts = [];
  let previousHtml = "";
  let prompt = buildAstrologyChapterPrompt({
    input,
    chapter,
    chapterPlanSummary: buildChapterPlanSummary(),
    expertPersona: "서양 점성술, 출생 차트, 하우스, 애스펙트, 트랜짓 리딩에 능숙한 프리미엄 상담가",
  });

  if (typeof onProgress === "function") onProgress({ stage: "llm", chapter });

  for (const provider of providers) {
    prompt = buildAstrologyChapterPrompt({
      input,
      chapter,
      chapterPlanSummary: buildChapterPlanSummary(),
      expertPersona: "서양 점성술, 출생 차트, 하우스, 애스펙트, 트랜짓 리딩에 능숙한 프리미엄 상담가",
    });
    for (let retry = 0; retry <= repairLimit; retry += 1) {
      const started = Date.now();
      logAstrologyPdfEvent("ASTROLOGY_LLM_GENERATION_STARTED", {
        jobId,
        userId,
        chapterId: chapter.id,
        status: retry > 0 ? "repair" : "started",
        provider,
        modelName,
        promptVersion: ASTROLOGY_PREMIUM_PROMPT_VERSION,
        chapterPlanVersion: astrologyPremiumChapterPlanV2.version,
      });
      const result = await generateAstrologyTextWithLlm({
        provider,
        systemPrompt: astrologySystemPrompt,
        userPrompt: prompt,
        temperature: 0.68,
        maxTokens: Number(env?.ASTROLOGY_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
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
        logAstrologyPdfEvent("ASTROLOGY_CHAPTER_VALIDATION_FAILED", {
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
      const validation = validateAstrologyPremiumChapterHtml(previousHtml, chapter);
      if (validation.ok) {
        await writeChapterCache(env, cacheKey, {
          html: validation.html,
          provider,
          modelName: result.model || modelName,
          promptVersion: ASTROLOGY_PREMIUM_PROMPT_VERSION,
          chapterPlanVersion: astrologyPremiumChapterPlanV2.version,
          qualityVersion: ASTROLOGY_PREMIUM_QUALITY_VERSION,
          storedAt: new Date().toISOString(),
        });
        const parsed = parseAstrologyPremiumChapterHtml(validation.html, chapter);
        parsed.provider = provider;
        parsed.cached = false;
        logAstrologyPdfEvent("ASTROLOGY_LLM_GENERATION_COMPLETED", {
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
      logAstrologyPdfEvent("ASTROLOGY_CHAPTER_VALIDATION_FAILED", {
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
        logAstrologyPdfEvent("ASTROLOGY_CHAPTER_REPAIR_STARTED", {
          jobId,
          userId,
          chapterId: chapter.id,
          provider,
          modelName: result.model || modelName,
          status: "repair",
        });
        prompt = buildAstrologyRepairPrompt({
          input,
          chapter,
          previousHtml,
          validationErrors: validation.issues,
          expertPersona: "서양 점성술, 출생 차트, 하우스, 애스펙트, 트랜짓 리딩에 능숙한 프리미엄 상담가",
        });
      }
    }
  }

  return { ok: false, chapterId: chapter.id, title: chapter.title, errorCode: "ASTROLOGY_CHAPTER_GENERATION_FAILED", attempts };
}

export async function generateAstrologyPremiumReport(params = {}) {
  const env = params.env || {};
  const rawInput = params.input || {};
  const userId = clean(params.userId);
  const jobId = clean(params.jobId || rawInput.reportId || rawInput.sessionId || `astrology-${Date.now().toString(36)}`);
  const workingInput = {
    ...safeObject(rawInput),
    birthInput: safeObject(rawInput.birthInput || rawInput.userProfile || rawInput.profile || rawInput),
  };

  const prepared = rawInput.localAstroChartJson && typeof rawInput.localAstroChartJson === "object"
    ? {
      localAstroChartJson: rawInput.localAstroChartJson,
      birthInput: rawInput.localAstroChartJson.birthInput || workingInput.birthInput,
      chartValidation: { ok: true },
      transitValidation: { ok: true },
    }
    : await prepareAstroPremiumCalculation(env, workingInput, {
      requestUrl: params.requestUrl,
      timingBaseDate: rawInput?.timingBaseDate || rawInput?.targetDate || rawInput?.baseDate,
      log: (stage, payload) => logAstrologyPdfEvent(`ASTROLOGY_${stage}`, {
        jobId,
        userId,
        status: payload?.ok === false ? "failed" : "ok",
      }),
    });

  const localAstroChartJson = prepared.localAstroChartJson;
  const input = normalizeAstrologyPremiumInput(workingInput, localAstroChartJson);
  const normalizedInputHash = hashStable(input);
  const modelName = resolveAstrologyModelName(env);

  assertAstrologyPremiumChapterPlan(astrologyPremiumChapterPlanV2);
  logAstrologyPdfEvent("ASTROLOGY_INPUT_NORMALIZED", { jobId, userId, status: "ok" });
  logAstrologyPdfEvent("ASTROLOGY_CHAPTER_PLAN_LOADED", {
    jobId,
    userId,
    status: "ok",
    chapterPlanVersion: astrologyPremiumChapterPlanV2.version,
  });

  const chapters = [];
  const failedChapters = [];
  const providerSet = new Set();

  for (const chapter of astrologyPremiumChapterPlanV2.chapters) {
    const result = await generateChapter({
      env,
      input,
      chapter,
      normalizedInputHash,
      modelName,
      jobId,
      userId,
      onProgress: params.onProgress,
    });
    if (!result.ok) {
      failedChapters.push(result);
      break;
    }
    chapters.push({
      ...result.parsed,
      status: result.status,
      source: result.source,
    });
    providerSet.add(result.provider);
  }

  if (failedChapters.length || chapters.length !== astrologyPremiumChapterPlanV2.chapters.length) {
    throw Object.assign(new Error("ASTROLOGY_PREMIUM_CHAPTER_GENERATION_FAILED"), {
      code: "ASTROLOGY_PREMIUM_CHAPTER_GENERATION_FAILED",
      status: 503,
      failedChapters,
      chapterCount: chapters.length,
      expectedChapterCount: astrologyPremiumChapterPlanV2.chapters.length,
    });
  }

  const provider = providerSet.has("gemini") && providerSet.size === 1
    ? "gemini"
    : providerSet.has("gemini")
      ? "workers-ai-gemini"
      : "workers-ai";
  const llmAssembly = {
    enabled: true,
    source: "astrology-premium-llm-only",
    provider,
    modelName,
    engineVersion: ASTROLOGY_PREMIUM_ENGINE_VERSION,
    qualityVersion: ASTROLOGY_PREMIUM_QUALITY_VERSION,
    promptVersion: ASTROLOGY_PREMIUM_PROMPT_VERSION,
    chapterPlanVersion: astrologyPremiumChapterPlanV2.version,
    chapterCount: chapters.length,
    expectedChapterCount: astrologyPremiumChapterPlanV2.chapters.length,
    externalGeneration: true,
    externalCallsAllowed: true,
    fallbackUsed: false,
  };

  logAstrologyPdfEvent("ASTROLOGY_ALL_CHAPTERS_COMPLETED", {
    jobId,
    userId,
    status: "completed",
    provider,
    modelName,
  });

  return {
    chapters,
    chapterCount: chapters.length,
    expectedChapterCount: astrologyPremiumChapterPlanV2.chapters.length,
    localAstroChartJson,
    normalizedInput: input,
    normalizedInputHash,
    provider,
    modelName,
    llmAssembly,
    llmAssemblyOnly: true,
    externalCallsAllowed: true,
    manuscriptSource: "astrology-premium-llm-only",
    generationMode: "pdf-v3-llm-only",
    promptVersion: ASTROLOGY_PREMIUM_PROMPT_VERSION,
    chapterPlanVersion: astrologyPremiumChapterPlanV2.version,
    cacheDigest: hashStable({ normalizedInputHash, modelName, chapterPlanVersion: astrologyPremiumChapterPlanV2.version }),
    rawInputDigest: hashStable(stableStringify(rawInput)),
    calculationValidation: {
      chart: prepared.chartValidation || null,
      transit: prepared.transitValidation || null,
    },
  };
}
