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
import {
  VEDIC_LLM_VERSION,
  assertVedicChapterPlan,
  loadVedicChapterConfig,
} from "./vedic-chapters.js";
import {
  VEDIC_PREMIUM_PROMPT_VERSION,
  buildVedicChapterPlanSummary,
  buildVedicChapterPrompt,
  buildVedicRepairPrompt,
  vedicSystemPrompt,
} from "./vedic-prompts.js";
import { generateVedicTextWithLlm, resolveVedicLlmProviders, resolveVedicModelName } from "./llm-client.js";
import { parseVedicChapterHtml, validateVedicChapterHtml, validateVedicInput } from "./vedic-validator.js";

const CHAPTER_CACHE = new Map();

function readCacheStore(env = {}) {
  return env?.VEDIC_LLM_CHAPTER_CACHE || env?.VEDIC_PREMIUM_LLM_CACHE || env?.PDF_V2_CACHE || env?.REPORT_CACHE || null;
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

function hashPart(value) {
  return hashStable(value ?? "");
}

export function buildVedicChapterCacheKey({ input = {}, chapter = {}, chapterConfigVersion = "", modelName = "" } = {}) {
  const profile = safeObject(input.userProfile);
  const chart = safeObject(input.chart);
  return `vedic:${hashStable({
    service: "vedic",
    version: VEDIC_LLM_VERSION,
    chapterConfigVersion,
    chapterId: clean(chapter.id),
    birthDataHash: hashPart({
      name: profile.name,
      gender: profile.gender,
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
    }),
    locationHash: hashPart({
      birthPlace: profile.birthPlace,
      latitude: profile.latitude,
      longitude: profile.longitude,
    }),
    timezoneHash: hashPart(profile.timezone || input.calculationBasis?.timezone),
    ayanamsaHash: hashPart(input.calculationBasis?.ayanamsa || chart.ayanamsa),
    vedicChartHash: hashPart(chart),
    dashaHash: hashPart(chart.dashas || chart.currentDasha),
    transitHash: hashPart(chart.transits),
    questionHash: hashPart(input.question),
    modelName,
  })}`;
}

export const buildVedicPremiumChapterCacheKey = buildVedicChapterCacheKey;

function hasPlanetMap(candidate = {}) {
  return candidate?.planets && typeof candidate.planets === "object" && Object.keys(candidate.planets).length > 0;
}

function hasUsableChartSource(candidate = {}) {
  if (!candidate || typeof candidate !== "object") return false;
  if (hasPlanetMap(candidate) && Number.isFinite(Number(candidate.ascendantSidereal ?? candidate.ascendant ?? candidate.lagnaLongitude))) return true;
  if (candidate.chartSource && hasUsableChartSource(candidate.chartSource)) return true;
  if (candidate.chart && (asChartArray(candidate.chart.planets).length || asChartArray(candidate.chart.houses).length)) return true;
  return false;
}

function asChartArray(value) {
  return Array.isArray(value) ? value : [];
}

function pickCalculatedChartSource(rawInput = {}) {
  const candidates = [
    rawInput?.chartSource,
    rawInput?.vedicChartSource,
    rawInput?.vedicBase?.chart,
    rawInput?.vedicBase,
    rawInput?.chart,
    rawInput?.vedicChart,
  ];
  return candidates.find(hasUsableChartSource) || null;
}

function calculateOrLoadVedicChart(rawInput = {}) {
  if (rawInput.localVedicChartJson && typeof rawInput.localVedicChartJson === "object") {
    const signalValidation = validateVedicPremiumChartSignals(rawInput.localVedicChartJson);
    if (signalValidation.ok) return rawInput.localVedicChartJson;
  }

  const birthInput = safeObject(rawInput.birthInput || rawInput.userProfile || rawInput);
  const chartSource = pickCalculatedChartSource(rawInput);
  const workingInput = {
    ...safeObject(rawInput),
    birthInput,
    chart: chartSource || rawInput.chart,
    vedicBase: {
      ...(rawInput?.vedicBase && typeof rawInput.vedicBase === "object" ? rawInput.vedicBase : {}),
      birthInput,
      chart: chartSource || rawInput?.vedicBase?.chart || rawInput.chart,
    },
  };
  return buildVedicLocalChartJson(workingInput, { strictPremium: true });
}

function isRetryableProviderFailure(result = {}) {
  const status = Number(result?.status || 0) || 0;
  const code = clean(result?.errorCode).toLowerCase();
  return status === 429 || status >= 500 || ["provider_exception", "timeout", "empty_response", "vedic_llm_timeout", "vedic_llm_timeout"].includes(code);
}

async function callChapterLlm({ env, provider, prompt, jobId, chapter, retry, modelName }) {
  const started = Date.now();
  const result = await generateVedicTextWithLlm({
    provider,
    systemPrompt: vedicSystemPrompt,
    userPrompt: prompt,
    temperature: Number(env?.VEDIC_LLM_TEMPERATURE ?? env?.VEDIC_PREMIUM_LLM_TEMPERATURE ?? 0.68),
    maxTokens: Number(env?.VEDIC_LLM_CHAPTER_MAX_TOKENS || env?.VEDIC_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
    requestId: `${jobId}:${chapter.id}:${retry}`,
    model: modelName,
  }, env);
  return {
    ...result,
    durationMs: Number(result.latencyMs || Date.now() - started),
  };
}

async function generateVedicChapterWithLLM({ env, input, chapter, chapterPlan, jobId, userId, modelName }) {
  const providers = resolveVedicLlmProviders(env);
  const repairLimit = Math.min(2, Math.max(0, Number(env?.VEDIC_LLM_REPAIR_LIMIT ?? env?.VEDIC_PREMIUM_LLM_REPAIR_LIMIT ?? 2)));
  const chapterPlanSummary = buildVedicChapterPlanSummary(chapterPlan);
  const attempts = [];

  for (const provider of providers) {
    let prompt = buildVedicChapterPrompt({ input, chapter, chapterPlanSummary });
    let invalidHtml = "";
    let errors = [];
    for (let retry = 0; retry <= repairLimit; retry += 1) {
      const result = await callChapterLlm({ env, provider, prompt, jobId, chapter, retry, modelName });
      const attempt = {
        provider,
        retry,
        ok: Boolean(result.ok),
        status: result.status || null,
        errorCode: clean(result.errorCode),
        durationMs: result.durationMs,
      };
      attempts.push(attempt);
      if (!result.ok) {
        logVedicPdfEvent("VEDIC_CHAPTER_PROVIDER_FAILED", {
          jobId,
          userId,
          chapterId: chapter.id,
          provider,
          modelName: result.model || modelName,
          status: "failed",
          errorCode: attempt.errorCode,
          errorMessage: result.errorMessage,
          durationMs: attempt.durationMs,
        });
        if (retry >= repairLimit || !isRetryableProviderFailure(result)) break;
        continue;
      }

      invalidHtml = String(result.text || "").trim();
      const validation = validateVedicChapterHtml(invalidHtml, chapter, input);
      if (validation.ok) {
        const parsed = parseVedicChapterHtml(validation.html, chapter, input);
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
        return { ok: true, parsed, provider, modelName: result.model || modelName, status: "completed", source: "llm", attempts };
      }

      errors = validation.issues;
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
        errorCode: "validation_failed",
        errorMessage: validation.issues.join(","),
        durationMs: attempt.durationMs,
      });
      if (retry < repairLimit) {
        prompt = buildVedicRepairPrompt({
          input,
          chapter,
          invalidHtml,
          errors,
          chapterPlanSummary,
        });
      }
    }
  }

  return { ok: false, chapterId: chapter.id, title: chapter.title, errorCode: "VEDIC_CHAPTER_GENERATION_FAILED", attempts, errors };
}

async function generateChapter({ env, input, chapter, chapterPlan, modelName, jobId, userId }) {
  const cacheKey = buildVedicChapterCacheKey({
    input,
    chapter,
    chapterConfigVersion: chapterPlan.version,
    modelName,
  });
  const cached = await readChapterCache(env, cacheKey);
  if (cached?.html) {
    const validation = validateVedicChapterHtml(cached.html, chapter, input);
    const cacheValid = validation.ok
      && clean(cached.version) === VEDIC_LLM_VERSION
      && clean(cached.chapterConfigVersion) === chapterPlan.version
      && clean(cached.chapterId) === clean(chapter.id);
    logVedicPdfEvent("VEDIC_CHAPTER_SOURCE_CHECK", {
      jobId,
      userId,
      chapterId: chapter.id,
      status: cacheValid ? "cached" : "cache_invalid",
      source: "llm-cache",
      modelName,
      promptVersion: VEDIC_PREMIUM_PROMPT_VERSION,
      chapterPlanVersion: chapterPlan.version,
    });
    if (cacheValid) {
      const parsed = parseVedicChapterHtml(validation.html, chapter, input);
      parsed.provider = cached.provider || "cache";
      parsed.cached = true;
      return { ok: true, parsed, provider: parsed.provider, status: "cached", source: "llm-cache", attempts: [] };
    }
  }

  const generated = await generateVedicChapterWithLLM({ env, input, chapter, chapterPlan, jobId, userId, modelName });
  if (!generated.ok) return generated;
  await writeChapterCache(env, cacheKey, {
    html: generated.parsed.html,
    version: VEDIC_LLM_VERSION,
    chapterConfigVersion: chapterPlan.version,
    chapterId: chapter.id,
    provider: generated.provider,
    modelName: generated.modelName || modelName,
    storedAt: new Date().toISOString(),
  });
  return generated;
}

function buildNormalizedInput(rawInput, localVedicChartJson, facts) {
  const normalized = normalizeVedicPremiumInput(rawInput, localVedicChartJson, facts);
  const chart = {
    ...safeObject(normalized.chart),
    currentDasha: asChartArray(normalized.chart?.dashas)[0] || undefined,
    nakshatras: normalized.chart?.nakshatra ? [normalized.chart.nakshatra] : [],
  };
  return {
    service: "vedic",
    ...normalized,
    chart,
    vedicChart: localVedicChartJson.chart,
    calculationBasis: facts.calculationBasis || normalized.rawResultSummary?.calculationBasis || {},
    birthTimeConfidence: facts.calculationBasis?.birthTimeConfidence,
    question: clean(rawInput.question),
    categories: rawInput.categories,
  };
}

export async function generateVedicPremiumReport(params = {}) {
  const env = params.env || {};
  const rawInput = params.input || {};
  const userId = clean(params.userId);
  const jobId = clean(params.jobId || rawInput.reportId || rawInput.sessionId || `vedic-${Date.now().toString(36)}`);

  const inputValidation = validateVedicInput({
    ...rawInput,
    service: "vedic",
    vedicChart: rawInput.vedicChart || rawInput.chartSource || rawInput.vedicBase?.chart || rawInput.chart || rawInput.localVedicChartJson?.chart,
  });
  if (!inputValidation.ok && inputValidation.issues.includes("birthDate.missing")) {
    throw Object.assign(new Error("BIRTH_INPUT_INVALID"), { code: "BIRTH_INPUT_INVALID", status: 422, details: inputValidation });
  }

  if (typeof params.onProgress === "function") {
    params.onProgress({ stage: "validating", status: "validating", progress: 5 });
  }

  const chapterPlan = loadVedicChapterConfig(rawInput, env);
  assertVedicChapterPlan(chapterPlan);
  const workingInput = {
    ...safeObject(rawInput),
    birthInput: safeObject(rawInput.birthInput || rawInput.userProfile || rawInput),
  };
  const localVedicChartJson = calculateOrLoadVedicChart(workingInput);
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
  const input = buildNormalizedInput(workingInput, localVedicChartJson, facts);
  const normalizedInputHash = hashStable(input);
  const modelName = resolveVedicModelName(env);

  logVedicPdfEvent("VEDIC_INPUT_NORMALIZED", { jobId, userId, status: "ok" });
  logVedicPdfEvent("VEDIC_CHAPTER_PLAN_LOADED", {
    jobId,
    userId,
    status: "ok",
    chapterPlanVersion: chapterPlan.version,
  });

  const chapters = [];
  const failedChapters = [];
  const providerSet = new Set();
  const totalChapters = chapterPlan.chapters.length;

  for (const chapter of chapterPlan.chapters) {
    if (typeof params.onProgress === "function") {
      const progress = 10 + Math.round((chapters.length / Math.max(1, totalChapters)) * 70);
      params.onProgress({ stage: "generating", status: "generating", progress, chapter, completedChapters: chapters.length, totalChapters });
    }
    const result = await generateChapter({
      env,
      input,
      chapter,
      chapterPlan,
      modelName,
      jobId,
      userId,
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
    if (typeof params.onProgress === "function") {
      const progress = 10 + Math.round((chapters.length / Math.max(1, totalChapters)) * 70);
      params.onProgress({ stage: "generating", status: "generating", progress, chapter, completedChapters: chapters.length, totalChapters });
    }
  }

  if (failedChapters.length || chapters.length !== totalChapters || chapters.some((chapter) => !clean(chapter.html))) {
    throw Object.assign(new Error("VEDIC_PREMIUM_CHAPTER_GENERATION_FAILED"), {
      code: "VEDIC_PREMIUM_CHAPTER_GENERATION_FAILED",
      status: 503,
      failedChapters,
      details: {
        failedChapters: failedChapters.map((chapter) => ({
          chapterId: clean(chapter.chapterId),
          title: clean(chapter.title),
          errorCode: clean(chapter.errorCode),
          errors: Array.isArray(chapter.errors) ? chapter.errors.slice(0, 8).map((item) => clean(item)).filter(Boolean) : [],
          attempts: Array.isArray(chapter.attempts)
            ? chapter.attempts.slice(0, 8).map((attempt) => ({
                provider: clean(attempt.provider),
                modelName: clean(attempt.modelName),
                retry: Number(attempt.retry || 0),
                ok: attempt.ok === true,
                status: attempt.status || null,
                errorCode: clean(attempt.errorCode),
                issues: Array.isArray(attempt.issues) ? attempt.issues.slice(0, 8).map((item) => clean(item)).filter(Boolean) : [],
                durationMs: Number.isFinite(Number(attempt.durationMs)) ? Number(attempt.durationMs) : null,
              }))
            : [],
        })),
        chapterCount: chapters.length,
        expectedChapterCount: totalChapters,
      },
      chapterCount: chapters.length,
      expectedChapterCount: totalChapters,
    });
  }

  const provider = providerSet.has("gemini") && providerSet.size === 1
    ? "gemini"
    : providerSet.has("gemini")
      ? "workers-ai-gemini"
      : "workers-ai";
  const llmAssembly = {
    enabled: true,
    source: "vedic-llm-only",
    provider,
    modelName,
    version: VEDIC_LLM_VERSION,
    engineVersion: VEDIC_PREMIUM_ENGINE_VERSION,
    qualityVersion: VEDIC_PREMIUM_QUALITY_VERSION,
    promptVersion: VEDIC_PREMIUM_PROMPT_VERSION,
    chapterPlanVersion: chapterPlan.version,
    chapterConfigVersion: chapterPlan.version,
    chapterCount: chapters.length,
    expectedChapterCount: totalChapters,
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
    expectedChapterCount: totalChapters,
    chapterPlan,
    chapterPlanVersion: chapterPlan.version,
    localVedicChartJson,
    normalizedInput: input,
    normalizedInputHash,
    facts,
    provider,
    modelName,
    llmAssembly,
    llmAssemblyOnly: true,
    externalCallsAllowed: true,
    manuscriptSource: "vedic-llm-only",
    generationMode: "vedic-premium-llm-only",
    promptVersion: VEDIC_PREMIUM_PROMPT_VERSION,
    cacheDigest: hashStable({
      service: "vedic",
      version: VEDIC_LLM_VERSION,
      normalizedInputHash,
      modelName,
      chapterPlanVersion: chapterPlan.version,
    }),
    rawInputDigest: hashStable(stableStringify(rawInput)),
  };
}
