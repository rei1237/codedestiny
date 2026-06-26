import {
  SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
  SOUL_ORIGIN_LLM_PROVIDER,
  SOUL_ORIGIN_LLM_WRITING_PIPELINE,
  clean,
  hashStable,
  logSoulOriginPdfEvent,
} from "./soul-origin-premium.types.js";
import { generateSoulOriginTextWithLlm, resolveSoulOriginModelName } from "./llm-client.js";
import { assertValidExistingChapterPlan, loadExistingKarmaChapterConfig } from "./karma-chapter-loader.js";
import { buildKarmaDataHashes, buildKarmaIntegratedData, selectKarmaDataForChapter } from "./karma-data-orchestrator.js";
import { KARMA_INTEGRATED_PROMPT_VERSION, buildKarmaChapterPrompt, buildKarmaChapterRepairPrompt, karmaIntegratedSystemPrompt } from "./karma-prompts.js";
import { assembleKarmaIntegratedFinalHtml, KARMA_INTEGRATED_DISCLAIMER } from "./karma-html-renderer.js";
import { validateKarmaIntegratedChapterHtml } from "./karma-validator.js";

export const KARMA_INTEGRATED_LLM_VERSION = "2026-06-karma-integrated-llm-v1";
export const KARMA_INTEGRATED_GENERATION_MODE = "karma-integrated-chapter-llm-html";

const MEMORY_CHAPTER_CACHE = globalThis.__KARMA_INTEGRATED_CHAPTER_CACHE || new Map();
if (!globalThis.__KARMA_INTEGRATED_CHAPTER_CACHE) {
  globalThis.__KARMA_INTEGRATED_CHAPTER_CACHE = MEMORY_CHAPTER_CACHE;
}

function cacheStore(env = {}) {
  return env?.KARMA_INTEGRATED_LLM_CACHE || env?.SOUL_ORIGIN_LLM_CACHE || env?.PDF_V2_CACHE || env?.REPORT_CACHE || null;
}

async function getCachedChapter(env, key) {
  const cached = MEMORY_CHAPTER_CACHE.get(key);
  if (cached) return cached;
  const store = cacheStore(env);
  if (!store?.get) return null;
  const text = await store.get(key);
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    MEMORY_CHAPTER_CACHE.set(key, parsed);
    return parsed;
  } catch (_) {
    return null;
  }
}

async function saveChapterCache(env, key, value) {
  MEMORY_CHAPTER_CACHE.set(key, value);
  const store = cacheStore(env);
  if (store?.put) {
    await store.put(key, JSON.stringify(value), { expirationTtl: 60 * 60 * 24 * 30 });
  }
}

export function buildKarmaIntegratedChapterCacheKey({ integratedData = {}, chapter = {}, chapterData = {}, chapterPlan = {}, modelName = "" } = {}) {
  const dataHashes = buildKarmaDataHashes(integratedData, chapterData);
  return `karma-integrated-llm:${hashStable({
    service: "karma-integrated",
    version: KARMA_INTEGRATED_LLM_VERSION,
    promptVersion: KARMA_INTEGRATED_PROMPT_VERSION,
    chapterConfigVersion: chapterPlan.chapterConfigVersion,
    chapterConfigHash: chapterPlan.chapterConfigHash,
    chapterId: chapter.id,
    requiredSystemsHash: hashStable(chapter.requiredSystems || []),
    modelName,
    birthDataHash: dataHashes.birthDataHash,
    sajuChartHash: dataHashes.sajuChartHash,
    vedicChartHash: dataHashes.vedicChartHash,
    astrologyChartHash: dataHashes.astrologyChartHash,
    extraFortuneDataHash: dataHashes.extraFortuneDataHash,
    questionHash: dataHashes.questionHash,
  })}`;
}

async function notifyStatus(callback, payload = {}) {
  if (typeof callback !== "function") return;
  try {
    await callback({
      status: payload.status || "generating",
      progress: Number(payload.progress || 0),
      currentStep: clean(payload.currentStep || payload.status || ""),
      currentChapterId: clean(payload.currentChapterId || ""),
      currentChapterTitle: clean(payload.currentChapterTitle || ""),
      systemStatus: payload.systemStatus || undefined,
    });
  } catch (_) {}
}

async function callChapterLlm({ env, input, chapter, chapterData, jobId, retry = 0, invalidHtml = "", errors = [] }) {
  const prompt = retry > 0
    ? buildKarmaChapterRepairPrompt({ input, chapter, chapterData, invalidHtml, errors })
    : buildKarmaChapterPrompt({ input, chapter, chapterData });
  const generated = await generateSoulOriginTextWithLlm({
    systemPrompt: karmaIntegratedSystemPrompt,
    userPrompt: prompt,
    requestId: `${jobId}:karma:${chapter.id}:${retry}`,
    maxTokens: Number(env?.KARMA_INTEGRATED_CHAPTER_MAX_TOKENS || env?.SOUL_ORIGIN_LLM_MAX_TOKENS || 9000),
    temperature: Number(env?.KARMA_INTEGRATED_LLM_TEMPERATURE ?? env?.SOUL_ORIGIN_LLM_TEMPERATURE ?? 0.72),
  }, env);
  if (!generated.ok) {
    throw Object.assign(new Error(generated.errorCode || "LLM_REQUEST_FAILED"), {
      code: generated.errorCode || "LLM_REQUEST_FAILED",
      status: generated.errorCode === "LLM_NOT_CONFIGURED" ? 503 : 502,
      failedStep: "generating",
      failedChapterId: chapter.id,
      details: generated,
    });
  }
  return generated;
}

async function generateValidatedChapter({ env, input, integratedData, chapterPlan, chapter, jobId, userId }) {
  const modelName = resolveSoulOriginModelName(env);
  const chapterData = selectKarmaDataForChapter(chapter, integratedData);
  const cacheKey = buildKarmaIntegratedChapterCacheKey({ integratedData, chapter, chapterData, chapterPlan, modelName });
  const cached = await getCachedChapter(env, cacheKey);
  if (cached?.html) {
    const validation = validateKarmaIntegratedChapterHtml(cached.html, chapter, chapterData);
    if (validation.ok
      && clean(cached.version) === KARMA_INTEGRATED_LLM_VERSION
      && clean(cached.promptVersion) === KARMA_INTEGRATED_PROMPT_VERSION) {
      return {
        id: chapter.id,
        order: chapter.order,
        title: chapter.title,
        category: chapter.category,
        requiredSystems: chapter.requiredSystems,
        html: validation.html,
        cacheKey,
        cached: true,
        provider: cached.provider || "cache",
        modelName: cached.modelName || modelName,
      };
    }
  }

  let invalidHtml = "";
  let errors = [];
  const repairLimit = Math.max(0, Number(env?.KARMA_INTEGRATED_REPAIR_LIMIT ?? 2));
  for (let retry = 0; retry <= repairLimit; retry += 1) {
    logSoulOriginPdfEvent(retry === 0 ? "KARMA_CHAPTER_LLM_STARTED" : "KARMA_CHAPTER_REPAIR_STARTED", {
      jobId,
      userId,
      chapterId: chapter.id,
      status: "started",
      provider: "gemini",
      modelName,
    });
    const generated = await callChapterLlm({ env, input, chapter, chapterData, jobId, retry, invalidHtml, errors });
    const validation = validateKarmaIntegratedChapterHtml(generated.text, chapter, chapterData);
    if (validation.ok) {
      const record = {
        id: chapter.id,
        order: chapter.order,
        title: chapter.title,
        category: chapter.category,
        requiredSystems: chapter.requiredSystems,
        html: validation.html,
        cacheKey,
        cached: false,
        provider: generated.provider || SOUL_ORIGIN_LLM_PROVIDER,
        modelName: generated.model || modelName,
      };
      await saveChapterCache(env, cacheKey, {
        html: validation.html,
        version: KARMA_INTEGRATED_LLM_VERSION,
        promptVersion: KARMA_INTEGRATED_PROMPT_VERSION,
        provider: record.provider,
        modelName: record.modelName,
        storedAt: new Date().toISOString(),
      });
      return record;
    }
    invalidHtml = generated.text;
    errors = validation.errors;
  }

  throw Object.assign(new Error(`Karma integrated chapter generation failed: ${chapter.id}`), {
    code: "KARMA_CHAPTER_VALIDATION_FAILED",
    status: 502,
    failedStep: "generating",
    failedChapterId: chapter.id,
    issues: errors,
  });
}

export async function generateKarmaIntegratedReport({ env = {}, input = {}, calculationSeed = {}, userId = "", jobId = "", onStatus } = {}) {
  await notifyStatus(onStatus, { status: "validating", progress: 5, currentStep: "validating" });
  const chapterPlan = loadExistingKarmaChapterConfig({ logger: console });
  assertValidExistingChapterPlan(chapterPlan);

  await notifyStatus(onStatus, { status: "calculating", progress: 25, currentStep: "calculating" });
  const integratedData = buildKarmaIntegratedData({ input, calculationSeed });

  await notifyStatus(onStatus, {
    status: "generating",
    progress: 30,
    currentStep: "generating",
    systemStatus: integratedData.systemStatus,
  });

  const chapterRecords = [];
  const total = chapterPlan.chapters.length;
  for (let index = 0; index < total; index += 1) {
    const chapter = chapterPlan.chapters[index];
    await notifyStatus(onStatus, {
      status: "generating",
      progress: Math.round(30 + (index / Math.max(1, total)) * 50),
      currentStep: "generating",
      currentChapterId: chapter.id,
      currentChapterTitle: chapter.title,
      systemStatus: integratedData.systemStatus,
    });
    const record = await generateValidatedChapter({
      env,
      input: integratedData,
      integratedData,
      chapterPlan,
      chapter,
      jobId,
      userId,
    });
    chapterRecords.push(record);
    await notifyStatus(onStatus, {
      status: "generating",
      progress: Math.round(30 + ((index + 1) / Math.max(1, total)) * 50),
      currentStep: "generating",
      currentChapterId: chapter.id,
      currentChapterTitle: chapter.title,
      systemStatus: integratedData.systemStatus,
    });
  }

  if (chapterRecords.length !== chapterPlan.chapters.length) {
    throw Object.assign(new Error("KARMA_CHAPTER_COUNT_MISMATCH"), {
      code: "KARMA_CHAPTER_COUNT_MISMATCH",
      status: 502,
      failedStep: "generating",
    });
  }

  await notifyStatus(onStatus, { status: "rendering", progress: 90, currentStep: "rendering", systemStatus: integratedData.systemStatus });
  const html = assembleKarmaIntegratedFinalHtml({
    integratedData,
    chapterPlan,
    chapterRecords,
    reportId: jobId,
    generatedAt: new Date().toISOString(),
  });
  await notifyStatus(onStatus, { status: "rendering", progress: 95, currentStep: "rendering", systemStatus: integratedData.systemStatus });

  const summary = chapterRecords
    .map((record) => clean(stripHtml(record.html).slice(0, 260)))
    .filter(Boolean)
    .slice(0, 2)
    .join("\n\n");

  return {
    ok: true,
    html,
    integratedData,
    chapterPlan,
    chapters: chapterRecords,
    chapterCount: chapterRecords.length,
    expectedChapterCount: chapterPlan.chapters.length,
    reportTitle: "운명의 업 프리미엄 상담서",
    summary,
    finalMessage: "",
    disclaimer: KARMA_INTEGRATED_DISCLAIMER,
    qualityReport: {
      status: "passed",
      score: 100,
      engine: KARMA_INTEGRATED_LLM_VERSION,
      expectedChapterCount: chapterPlan.chapters.length,
      actualChapterCount: chapterRecords.length,
      inferredSystems: chapterPlan.inferredSystems,
      systemStatus: integratedData.systemStatus,
      warnings: integratedData.warnings,
    },
    provider: SOUL_ORIGIN_LLM_PROVIDER,
    modelName: resolveSoulOriginModelName(env),
    generationMode: KARMA_INTEGRATED_GENERATION_MODE,
    writingPipeline: SOUL_ORIGIN_LLM_WRITING_PIPELINE,
    manuscriptSource: SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
    llmAssembly: {
      enabled: true,
      externalGeneration: true,
      fallbackUsed: false,
      chapterCount: chapterRecords.length,
      expectedChapterCount: chapterPlan.chapters.length,
      engineVersion: KARMA_INTEGRATED_LLM_VERSION,
    },
    pdfV2: {
      engineVersion: KARMA_INTEGRATED_LLM_VERSION,
      promptVersion: KARMA_INTEGRATED_PROMPT_VERSION,
      chapterPlanVersion: chapterPlan.chapterConfigVersion,
      chapterConfigHash: chapterPlan.chapterConfigHash,
    },
  };
}

function stripHtml(value = "") {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
