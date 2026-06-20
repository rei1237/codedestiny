import {
  buildVedicAstrologyFacts,
  buildVedicLocalChartJson,
  validateVedicBirthInput,
  validateVedicPremiumChartSignals,
} from "../../vedic-premium-generator.js";
import {
  VEDIC_PREMIUM_ENGINE_VERSION,
  VEDIC_PREMIUM_QUALITY_VERSION,
  clean,
  hashStable,
  logVedicPdfEvent,
  safeObject,
  stableStringify,
} from "./vedic-premium.types.js";
import { normalizeVedicPremiumInput } from "./vedic-premium.normalizer.js";
import { assertVedicPremiumChapterPlan, vedicPremiumChapterPlanV2 } from "./vedic-premium.chapter-plan.js";
import {
  VEDIC_PREMIUM_PROMPT_VERSION,
  buildVedicChapterPrompt,
  buildVedicRepairPrompt,
  vedicSystemPrompt,
} from "./vedic-premium.prompt-pack.js";
import { generateVedicTextWithLlm, resolveVedicLlmProviders, resolveVedicModelName } from "./llm-client.js";
import { parseVedicPremiumChapterHtml, validateVedicPremiumChapterHtml } from "./vedic-premium.validator.js";

const CHAPTER_CACHE = new Map();

function readCacheStore(env = {}) {
  return env?.VEDIC_PREMIUM_LLM_CACHE || env?.PDF_V2_CACHE || env?.REPORT_CACHE || null;
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

export function buildVedicPremiumChapterCacheKey({ normalizedInputHash, chapterId, modelName }) {
  return `vedic-premium:${hashStable({
    serviceType: "vedic-premium",
    engineVersion: VEDIC_PREMIUM_ENGINE_VERSION,
    qualityVersion: VEDIC_PREMIUM_QUALITY_VERSION,
    chapterPlanVersion: vedicPremiumChapterPlanV2.version,
    promptVersion: VEDIC_PREMIUM_PROMPT_VERSION,
    modelName,
    normalizedInputHash,
    chapterId,
    language: "ko",
  })}`;
}

function isRetryableProviderFailure(result = {}) {
  const status = Number(result?.status || 0) || 0;
  const code = clean(result?.errorCode).toLowerCase();
  return status === 429 || status >= 500 || ["provider_exception", "timeout", "empty_response", "vedic_llm_timeout"].includes(code);
}

function buildChapterPlanSummary() {
  return vedicPremiumChapterPlanV2.chapters
    .map((chapter) => `${chapter.order}. ${chapter.title}: ${chapter.sections.join(" / ")}`)
    .join("\n");
}

async function generateChapter({ env, input, chapter, normalizedInputHash, modelName, jobId, userId, previousSummary, onProgress }) {
  const cacheKey = buildVedicPremiumChapterCacheKey({ normalizedInputHash, chapterId: chapter.id, modelName });
  const cached = await readChapterCache(env, cacheKey);
  if (cached?.html) {
    const validation = validateVedicPremiumChapterHtml(cached.html, chapter);
    const cacheValid = validation.ok
      && clean(cached.promptVersion) === VEDIC_PREMIUM_PROMPT_VERSION
      && clean(cached.chapterPlanVersion) === vedicPremiumChapterPlanV2.version
      && clean(cached.qualityVersion) === VEDIC_PREMIUM_QUALITY_VERSION;
    logVedicPdfEvent("VEDIC_CHAPTER_SOURCE_CHECK", {
      jobId,
      userId,
      chapterId: chapter.id,
      status: cacheValid ? "cached" : "cache_invalid",
      source: "llm-cache",
      modelName,
      promptVersion: VEDIC_PREMIUM_PROMPT_VERSION,
      chapterPlanVersion: vedicPremiumChapterPlanV2.version,
    });
    if (cacheValid) {
      const parsed = parseVedicPremiumChapterHtml(validation.html, chapter);
      parsed.provider = cached.provider || "cache";
      parsed.cached = true;
      return { ok: true, parsed, provider: parsed.provider, status: "cached", source: "llm-cache", attempts: [] };
    }
  }

  const providers = resolveVedicLlmProviders(env);
  const repairLimit = Math.max(0, Number(env?.VEDIC_PREMIUM_LLM_REPAIR_LIMIT ?? 3));
  const attempts = [];
  let previousHtml = "";
  let prompt = buildVedicChapterPrompt({
    input,
    chapter,
    chapterPlanSummary: buildChapterPlanSummary(),
    expertPersona: "베다 점성술(Jyotish), Vimshottari Dasha, 하우스별 카르마 해석에 능한 실전 상담 전문가",
  });

  logVedicPdfEvent("VEDIC_LLM_GENERATION_STARTED", {
    jobId,
    userId,
    chapterId: chapter.id,
    status: "started",
    modelName,
    promptVersion: VEDIC_PREMIUM_PROMPT_VERSION,
    chapterPlanVersion: vedicPremiumChapterPlanV2.version,
  });
  if (typeof onProgress === "function") onProgress({ stage: "llm", chapter });

  for (const provider of providers) {
    prompt = buildVedicChapterPrompt({
      input,
      chapter,
      chapterPlanSummary: buildChapterPlanSummary(),
      expertPersona: "베다 점성술(Jyotish), Vimshottari Dasha, 하우스별 카르마 해석에 능한 실전 상담 전문가",
    });
    for (let retry = 0; retry <= repairLimit; retry += 1) {
      const started = Date.now();
      const result = await generateVedicTextWithLlm({
        provider,
        systemPrompt: vedicSystemPrompt,
        userPrompt: prompt,
        temperature: 0.68,
        maxTokens: Number(env?.VEDIC_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
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
        logVedicPdfEvent("VEDIC_CHAPTER_VALIDATION_FAILED", {
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
      const validation = validateVedicPremiumChapterHtml(previousHtml, chapter);
      if (validation.ok) {
        await writeChapterCache(env, cacheKey, {
          html: validation.html,
          provider,
          modelName: result.model || modelName,
          promptVersion: VEDIC_PREMIUM_PROMPT_VERSION,
          chapterPlanVersion: vedicPremiumChapterPlanV2.version,
          qualityVersion: VEDIC_PREMIUM_QUALITY_VERSION,
          storedAt: new Date().toISOString(),
        });
        const parsed = parseVedicPremiumChapterHtml(validation.html, chapter);
        parsed.provider = provider;
        parsed.cached = false;
        logVedicPdfEvent("VEDIC_LLM_GENERATION_COMPLETED", {
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
      logVedicPdfEvent("VEDIC_CHAPTER_VALIDATION_FAILED", {
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
        logVedicPdfEvent("VEDIC_CHAPTER_REPAIR_STARTED", {
          jobId,
          userId,
          chapterId: chapter.id,
          provider,
          modelName: result.model || modelName,
          status: "repair",
        });
        prompt = buildVedicRepairPrompt({
          input,
          chapter,
          previousHtml,
          validationErrors: validation.issues,
          expertPersona: "베다 점성술(Jyotish), Vimshottari Dasha, 하우스별 카르마 해석에 능한 실전 상담 전문가",
        });
      }
    }
  }

  return { ok: false, chapterId: chapter.id, title: chapter.title, errorCode: "VEDIC_CHAPTER_GENERATION_FAILED", attempts };
}

export async function generateVedicPremiumReport(params = {}) {
  const env = params.env || {};
  const rawInput = params.input || {};
  const userId = clean(params.userId);
  const jobId = clean(params.jobId || rawInput.reportId || rawInput.sessionId || `vedic-${Date.now().toString(36)}`);

  const workingInput = {
    ...safeObject(rawInput),
    birthInput: safeObject(rawInput.birthInput || rawInput.userProfile || rawInput.birthInput),
  };
  const localVedicChartJson = rawInput.localVedicChartJson && typeof rawInput.localVedicChartJson === "object"
    ? rawInput.localVedicChartJson
    : buildVedicLocalChartJson(workingInput, { strictPremium: true });
  const birthValidation = validateVedicBirthInput(localVedicChartJson.birthInput || {});
  if (!birthValidation.ok) {
    throw Object.assign(new Error(birthValidation.message || "BIRTH_INPUT_INVALID"), { code: "BIRTH_INPUT_INVALID", status: 422 });
  }
  const signalValidation = validateVedicPremiumChartSignals(localVedicChartJson);
  if (!signalValidation.ok) {
    throw Object.assign(new Error("VEDIC_CHART_SOURCE_INVALID"), {
      code: "VEDIC_CHART_SOURCE_INVALID",
      status: 422,
      details: signalValidation,
    });
  }
  localVedicChartJson.chartSourceQuality = signalValidation.sourceQuality || localVedicChartJson.chartSourceQuality;

  const facts = buildVedicAstrologyFacts(localVedicChartJson, workingInput);
  const input = normalizeVedicPremiumInput(workingInput, localVedicChartJson, facts);
  const normalizedInputHash = hashStable(input);
  const modelName = resolveVedicModelName(env);

  assertVedicPremiumChapterPlan(vedicPremiumChapterPlanV2);
  logVedicPdfEvent("VEDIC_INPUT_NORMALIZED", { jobId, userId, status: "ok" });
  logVedicPdfEvent("VEDIC_CHAPTER_PLAN_LOADED", {
    jobId,
    userId,
    status: "ok",
    chapterPlanVersion: vedicPremiumChapterPlanV2.version,
  });

  const chapters = [];
  const failedChapters = [];
  const providerSet = new Set();
  let previousSummary = "";

  for (const chapter of vedicPremiumChapterPlanV2.chapters) {
    const result = await generateChapter({
      env,
      input,
      chapter,
      normalizedInputHash,
      modelName,
      jobId,
      userId,
      previousSummary,
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
    previousSummary = result.parsed.sections.map((section) => section.body).join(" ").slice(-900);
  }

  if (failedChapters.length || chapters.length !== vedicPremiumChapterPlanV2.chapters.length) {
    throw Object.assign(new Error("VEDIC_PREMIUM_CHAPTER_GENERATION_FAILED"), {
      code: "VEDIC_PREMIUM_CHAPTER_GENERATION_FAILED",
      status: 503,
      failedChapters,
      chapterCount: chapters.length,
      expectedChapterCount: vedicPremiumChapterPlanV2.chapters.length,
    });
  }

  const provider = providerSet.has("gemini") && providerSet.size === 1
    ? "gemini"
    : providerSet.has("gemini")
      ? "workers-ai-gemini"
      : "workers-ai";
  const llmAssembly = {
    enabled: true,
    source: "vedic-premium-llm-only",
    provider,
    modelName,
    engineVersion: VEDIC_PREMIUM_ENGINE_VERSION,
    qualityVersion: VEDIC_PREMIUM_QUALITY_VERSION,
    promptVersion: VEDIC_PREMIUM_PROMPT_VERSION,
    chapterPlanVersion: vedicPremiumChapterPlanV2.version,
    chapterCount: chapters.length,
    expectedChapterCount: vedicPremiumChapterPlanV2.chapters.length,
    externalGeneration: true,
    externalCallsAllowed: true,
    fallbackUsed: false,
  };

  logVedicPdfEvent("VEDIC_ALL_CHAPTERS_COMPLETED", {
    jobId,
    userId,
    status: "completed",
    provider,
    modelName,
  });

  return {
    chapters,
    chapterCount: chapters.length,
    expectedChapterCount: vedicPremiumChapterPlanV2.chapters.length,
    localVedicChartJson,
    normalizedInput: input,
    normalizedInputHash,
    facts,
    provider,
    modelName,
    llmAssembly,
    llmAssemblyOnly: true,
    externalCallsAllowed: true,
    manuscriptSource: "vedic-premium-llm-only",
    generationMode: "pdf-v3-llm-only",
    promptVersion: VEDIC_PREMIUM_PROMPT_VERSION,
    chapterPlanVersion: vedicPremiumChapterPlanV2.version,
    cacheDigest: hashStable({ normalizedInputHash, modelName, chapterPlanVersion: vedicPremiumChapterPlanV2.version }),
    rawInputDigest: hashStable(stableStringify(rawInput)),
  };
}
