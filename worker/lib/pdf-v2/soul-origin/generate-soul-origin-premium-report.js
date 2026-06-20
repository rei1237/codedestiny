import {
  SOUL_ORIGIN_LLM_ENGINE_VERSION,
  SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
  SOUL_ORIGIN_LLM_QUALITY_VERSION,
  SOUL_ORIGIN_LLM_SCHEMA_VERSION,
  SOUL_ORIGIN_LLM_WRITING_PIPELINE,
  buildSoulOriginLlmAssembly,
  clean,
  hashStable,
  logSoulOriginPdfEvent,
  safeObject,
} from "./soul-origin-premium.types.js";
import { assertSoulOriginChapterPlan, soulOriginChapterPlanV1 } from "./soul-origin-premium.chapter-plan.js";
import {
  SOUL_ORIGIN_LLM_PROMPT_VERSION,
  buildSoulOriginRepairPrompt,
  buildSoulOriginReportPrompt,
  soulOriginSystemPrompt,
} from "./soul-origin-premium.prompt-pack.js";
import { generateSoulOriginTextWithLlm, resolveSoulOriginModelName } from "./llm-client.js";
import { parseSoulOriginLlmJson, validateSoulOriginPdfResult } from "./soul-origin-premium.validator.js";

const REPORT_CACHE = new Map();

function readCacheStore(env = {}) {
  return env?.SOUL_ORIGIN_LLM_CACHE || env?.PDF_V2_CACHE || env?.REPORT_CACHE || null;
}

async function readReportCache(env, key) {
  const cached = REPORT_CACHE.get(key);
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

async function writeReportCache(env, key, value) {
  REPORT_CACHE.set(key, value);
  const store = readCacheStore(env);
  if (store?.put) {
    await store.put(key, JSON.stringify(value), { expirationTtl: 60 * 60 * 24 * 30 });
  }
}

export function buildSoulOriginLlmCacheKey({ calculationDigest, chapterId = "full-report", modelName, locale = "ko-KR" } = {}) {
  return `soul-origin-llm:${hashStable({
    serviceType: "destiny-karma",
    calculationDigest,
    promptVersion: SOUL_ORIGIN_LLM_PROMPT_VERSION,
    schemaVersion: SOUL_ORIGIN_LLM_SCHEMA_VERSION,
    chapterPlanVersion: soulOriginChapterPlanV1.version,
    qualityVersion: SOUL_ORIGIN_LLM_QUALITY_VERSION,
    locale,
    chapterId,
    modelName,
  })}`;
}

function mapValidationCode(error) {
  const code = clean(error?.code || error?.errorCode || "");
  if (code === "INVALID_LLM_RESPONSE") return "INVALID_LLM_RESPONSE";
  if (code === "LLM_TIMEOUT") return "LLM_TIMEOUT";
  if (code === "LLM_NOT_CONFIGURED") return "LLM_NOT_CONFIGURED";
  return "QUALITY_VALIDATION_FAILED";
}

async function callAndValidate({ env, input, prompt, jobId, userId, retry, previousText = "" }) {
  const started = Date.now();
  const modelName = resolveSoulOriginModelName(env);
  const generated = await generateSoulOriginTextWithLlm({
    systemPrompt: soulOriginSystemPrompt,
    userPrompt: prompt,
    requestId: `${jobId}:soul-origin:${retry}`,
    maxTokens: Number(env?.SOUL_ORIGIN_LLM_MAX_TOKENS || 24000),
  }, env);
  if (!generated.ok) {
    throw Object.assign(new Error(generated.errorCode || "LLM_REQUEST_FAILED"), {
      code: generated.errorCode || "LLM_REQUEST_FAILED",
      status: generated.errorCode === "LLM_NOT_CONFIGURED" ? 503 : 502,
      details: generated,
    });
  }
  let parsed;
  try {
    parsed = parseSoulOriginLlmJson(generated.text);
  } catch (error) {
    error.previousText = generated.text || previousText;
    throw error;
  }
  const validation = validateSoulOriginPdfResult(parsed);
  logSoulOriginPdfEvent("SOUL_ORIGIN_LLM_VALIDATED", {
    jobId,
    userId,
    status: validation.ok ? "passed" : "failed",
    provider: generated.provider,
    modelName: generated.model || modelName,
    durationMs: Date.now() - started,
    errorCode: validation.ok ? "" : "QUALITY_VALIDATION_FAILED",
    errorMessage: validation.issues.join(","),
  });
  if (!validation.ok) {
    throw Object.assign(new Error("QUALITY_VALIDATION_FAILED"), {
      code: "QUALITY_VALIDATION_FAILED",
      status: 502,
      issues: validation.issues,
      previousText: generated.text,
      validation,
    });
  }
  return {
    ok: true,
    result: validation.result,
    qualityReport: validation.qualityReport,
    provider: generated.provider,
    modelName: generated.model || modelName,
    latencyMs: generated.latencyMs,
  };
}

export async function generateSoulOriginLlmReport(params = {}) {
  const env = params.env || {};
  const input = safeObject(params.input);
  const userId = clean(params.userId);
  const jobId = clean(params.jobId || `soul-origin-${Date.now().toString(36)}`);
  assertSoulOriginChapterPlan(soulOriginChapterPlanV1);
  const modelName = resolveSoulOriginModelName(env);
  const cacheKey = buildSoulOriginLlmCacheKey({
    calculationDigest: clean(input.calculationDigest || input.normalizedInputHash),
    chapterId: "full-report",
    modelName,
    locale: clean(input.locale || "ko-KR"),
  });
  const cached = await readReportCache(env, cacheKey);
  if (cached?.result) {
    const cacheValidation = validateSoulOriginPdfResult(cached.result);
    if (cacheValidation.ok
      && clean(cached.promptVersion) === SOUL_ORIGIN_LLM_PROMPT_VERSION
      && clean(cached.schemaVersion) === SOUL_ORIGIN_LLM_SCHEMA_VERSION
      && clean(cached.chapterPlanVersion) === soulOriginChapterPlanV1.version) {
      return {
        ok: true,
        normalizedInput: input,
        result: cacheValidation.result,
        chapters: cacheValidation.result.chapters,
        chapterCount: cacheValidation.result.chapters.length,
        expectedChapterCount: soulOriginChapterPlanV1.chapters.length,
        qualityReport: cacheValidation.qualityReport,
        manuscriptSource: SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
        generationMode: SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
        provider: cached.provider || "cache",
        modelName: cached.modelName || modelName,
        writingPipeline: SOUL_ORIGIN_LLM_WRITING_PIPELINE,
        llmAssembly: buildSoulOriginLlmAssembly(soulOriginChapterPlanV1.chapters.length),
        llmAssemblyOnly: true,
        externalCallsAllowed: true,
        cacheKey,
        cached: true,
        pdfV2: {
          engineVersion: SOUL_ORIGIN_LLM_ENGINE_VERSION,
          qualityVersion: SOUL_ORIGIN_LLM_QUALITY_VERSION,
          promptVersion: SOUL_ORIGIN_LLM_PROMPT_VERSION,
          schemaVersion: SOUL_ORIGIN_LLM_SCHEMA_VERSION,
          chapterPlanVersion: soulOriginChapterPlanV1.version,
        },
      };
    }
  }

  const repairLimit = Math.max(0, Number(env?.SOUL_ORIGIN_LLM_REPAIR_LIMIT ?? 2));
  const attempts = [];
  let prompt = buildSoulOriginReportPrompt({ input });
  let previousText = "";
  let finalFailure = null;
  for (let retry = 0; retry <= repairLimit; retry += 1) {
    try {
      logSoulOriginPdfEvent(retry === 0 ? "SOUL_ORIGIN_LLM_STARTED" : "SOUL_ORIGIN_LLM_REPAIR_STARTED", {
        jobId,
        userId,
        status: "started",
        provider: "gemini",
        modelName,
        promptVersion: SOUL_ORIGIN_LLM_PROMPT_VERSION,
        schemaVersion: SOUL_ORIGIN_LLM_SCHEMA_VERSION,
      });
      const generated = await callAndValidate({ env, input, prompt, jobId, userId, retry, previousText });
      attempts.push({ retry, ok: true, provider: generated.provider, modelName: generated.modelName });
      await writeReportCache(env, cacheKey, {
        result: generated.result,
        provider: generated.provider,
        modelName: generated.modelName,
        promptVersion: SOUL_ORIGIN_LLM_PROMPT_VERSION,
        schemaVersion: SOUL_ORIGIN_LLM_SCHEMA_VERSION,
        chapterPlanVersion: soulOriginChapterPlanV1.version,
        qualityVersion: SOUL_ORIGIN_LLM_QUALITY_VERSION,
        storedAt: new Date().toISOString(),
      });
      return {
        ok: true,
        normalizedInput: input,
        result: generated.result,
        chapters: generated.result.chapters,
        chapterCount: generated.result.chapters.length,
        expectedChapterCount: soulOriginChapterPlanV1.chapters.length,
        qualityReport: generated.qualityReport,
        manuscriptSource: SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
        generationMode: SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
        provider: generated.provider,
        modelName: generated.modelName,
        writingPipeline: SOUL_ORIGIN_LLM_WRITING_PIPELINE,
        llmAssembly: buildSoulOriginLlmAssembly(soulOriginChapterPlanV1.chapters.length),
        llmAssemblyOnly: true,
        externalCallsAllowed: true,
        cacheKey,
        cached: false,
        attempts,
        pdfV2: {
          engineVersion: SOUL_ORIGIN_LLM_ENGINE_VERSION,
          qualityVersion: SOUL_ORIGIN_LLM_QUALITY_VERSION,
          promptVersion: SOUL_ORIGIN_LLM_PROMPT_VERSION,
          schemaVersion: SOUL_ORIGIN_LLM_SCHEMA_VERSION,
          chapterPlanVersion: soulOriginChapterPlanV1.version,
        },
      };
    } catch (error) {
      finalFailure = error;
      previousText = String(error?.previousText || previousText || "");
      attempts.push({
        retry,
        ok: false,
        errorCode: clean(error?.code || "QUALITY_VALIDATION_FAILED"),
        issues: error?.issues || error?.validation?.issues || null,
      });
      if (retry >= repairLimit || ["LLM_NOT_CONFIGURED", "LLM_TIMEOUT", "LLM_REQUEST_FAILED"].includes(clean(error?.code))) {
        break;
      }
      prompt = buildSoulOriginRepairPrompt({
        input,
        previousText,
        validationIssues: error?.issues || error?.validation?.issues || [clean(error?.code || "INVALID_LLM_RESPONSE")],
      });
    }
  }

  const code = mapValidationCode(finalFailure);
  throw Object.assign(new Error(code), {
    code,
    status: code === "LLM_NOT_CONFIGURED" ? 503 : 502,
    attempts,
    issues: finalFailure?.issues || finalFailure?.validation?.issues || null,
  });
}
