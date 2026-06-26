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
export const KARMA_INTEGRATED_GENERATION_MODE = "karma-integrated-chapter-mock-html";

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
      progressPercent: Number(payload.progressPercent ?? payload.progress ?? 0),
      currentStep: clean(payload.currentStep || payload.status || ""),
      currentChapterId: clean(payload.currentChapterId || ""),
      currentChapterTitle: clean(payload.currentChapterTitle || ""),
      totalChapters: Number(payload.totalChapters || 0),
      completedChapters: Number(payload.completedChapters || 0),
      chapters: Array.isArray(payload.chapters) ? payload.chapters : undefined,
      systemStatus: payload.systemStatus || undefined,
    });
  } catch (_) {}
}

function buildKarmaMockEnv(env = {}) {
  return {
    ...env,
    PDF_LLM_PROVIDER: "mock",
    PDF_DEBUG_MODE: "true",
    LLM_DRY_RUN: "true",
    GEMINI_CALL_ENABLED: "false",
    WORKERS_AI_ENABLED: "false",
    PDF_LLM_MAX_CALLS_PER_JOB: "0",
    PDF_LLM_MAX_RETRIES: "0",
  };
}

function buildChapterProgress(chapters = [], states = {}) {
  return chapters.map((chapter) => {
    const state = states[chapter.id] || {};
    return {
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      category: chapter.category,
      status: clean(state.status || "pending"),
      provider: "mock",
      tokensUsed: 0,
      cost: 0,
      isMock: true,
      startedAt: clean(state.startedAt || "") || undefined,
      completedAt: clean(state.completedAt || "") || undefined,
      errorMessage: clean(state.errorMessage || "") || undefined,
    };
  });
}

export async function generateKarmaPdfChapterContent({
  env = {},
  jobId = "",
  chapterId = "",
  chapterTitle = "",
  chapterOrder = 1,
  totalChapters = 1,
  chapterCategory = "",
  input = {},
  context = {},
  prompt = "",
} = {}) {
  const chapter = {
    ...(context.chapter && typeof context.chapter === "object" ? context.chapter : {}),
    id: clean(chapterId),
    title: clean(chapterTitle),
    order: Number(chapterOrder || 1),
    category: clean(chapterCategory),
  };
  return generateSoulOriginTextWithLlm({
    jobId,
    userPrompt: prompt,
    requestId: `${jobId}:karma:${chapter.id}:mock`,
    maxTokens: 0,
    temperature: 0,
    context: {
      ...context,
      format: "karma-integrated-html",
      chapter,
      totalChapters,
      input,
    },
  }, buildKarmaMockEnv(env));
}

async function callChapterLlm({ env, input, chapter, chapterData, jobId, retry = 0, invalidHtml = "", errors = [] }) {
  const prompt = retry > 0
    ? buildKarmaChapterRepairPrompt({ input, chapter, chapterData, invalidHtml, errors })
    : buildKarmaChapterPrompt({ input, chapter, chapterData });
  const generated = await generateSoulOriginTextWithLlm({
    jobId,
    systemPrompt: karmaIntegratedSystemPrompt,
    userPrompt: prompt,
    requestId: `${jobId}:karma:${chapter.id}:${retry}`,
    maxTokens: Number(env?.KARMA_INTEGRATED_CHAPTER_MAX_TOKENS || env?.SOUL_ORIGIN_LLM_MAX_TOKENS || 9000),
    temperature: Number(env?.KARMA_INTEGRATED_LLM_TEMPERATURE ?? env?.SOUL_ORIGIN_LLM_TEMPERATURE ?? 0.72),
    context: {
      format: "karma-integrated-html",
      chapter,
      chapterData,
    },
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
  if (cached?.html && (cached.isMock === true || clean(cached.provider) === "mock")) {
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
        tokensUsed: Number(cached.tokensUsed || 0),
        cost: Number(cached.cost || 0),
        isMock: cached.isMock === true || clean(cached.provider) === "mock",
      };
    }
  }

  let errors = [];
  const prompt = buildKarmaChapterPrompt({ input, chapter, chapterData });
  logSoulOriginPdfEvent("KARMA_CHAPTER_MOCK_STARTED", {
    jobId,
    userId,
    chapterId: chapter.id,
    status: "started",
    provider: "mock",
    modelName: "mock",
  });
  const generated = await generateKarmaPdfChapterContent({
    env,
    jobId,
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    chapterOrder: chapter.order,
    totalChapters: chapterPlan.chapters.length,
    chapterCategory: chapter.category,
    input: integratedData,
    context: {
      chapter,
      chapterData,
    },
    prompt,
  });
  if (!generated.ok) {
    throw Object.assign(new Error(generated.errorCode || "MOCK_CHAPTER_GENERATION_FAILED"), {
      code: generated.errorCode || "MOCK_CHAPTER_GENERATION_FAILED",
      status: Number(generated.status || 503),
      failedStep: "chapter_generating",
      failedChapterId: chapter.id,
      details: generated,
    });
  }
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
      provider: "mock",
      modelName: "mock",
      tokensUsed: 0,
      cost: 0,
      isMock: true,
    };
    await saveChapterCache(env, cacheKey, {
      html: validation.html,
      version: KARMA_INTEGRATED_LLM_VERSION,
      promptVersion: KARMA_INTEGRATED_PROMPT_VERSION,
      provider: record.provider,
      modelName: record.modelName,
      tokensUsed: record.tokensUsed,
      cost: record.cost,
      isMock: record.isMock,
      storedAt: new Date().toISOString(),
    });
    return record;
  }
  errors = validation.errors;
  logSoulOriginPdfEvent("KARMA_CHAPTER_MOCK_FAILED", {
      jobId,
      userId,
      chapterId: chapter.id,
      status: "failed",
      provider: "mock",
      modelName: "mock",
      errorCode: "KARMA_CHAPTER_VALIDATION_FAILED",
      errorMessage: errors.join(","),
  });

  throw Object.assign(new Error(`Karma integrated chapter generation failed: ${chapter.id}`), {
    code: "KARMA_CHAPTER_VALIDATION_FAILED",
    status: 502,
    failedStep: "generating",
    failedChapterId: chapter.id,
    issues: errors,
  });
}

export async function generateKarmaIntegratedReport({ env = {}, input = {}, calculationSeed = {}, userId = "", jobId = "", onStatus } = {}) {
  await notifyStatus(onStatus, { status: "queued", progress: 10, currentStep: "queued" });
  const chapterPlan = loadExistingKarmaChapterConfig({ logger: console });
  assertValidExistingChapterPlan(chapterPlan);

  await notifyStatus(onStatus, { status: "generating", progress: 10, currentStep: "generating", totalChapters: chapterPlan.chapters.length });
  const integratedData = buildKarmaIntegratedData({ input, calculationSeed });

  await notifyStatus(onStatus, {
    status: "generating",
    progress: 10,
    currentStep: "generating",
    totalChapters: chapterPlan.chapters.length,
    completedChapters: 0,
    chapters: buildChapterProgress(chapterPlan.chapters),
    systemStatus: integratedData.systemStatus,
  });

  const chapterRecords = [];
  const total = chapterPlan.chapters.length;
  const chapterStates = {};
  for (let index = 0; index < total; index += 1) {
    const chapter = chapterPlan.chapters[index];
    chapterStates[chapter.id] = { status: "generating", startedAt: new Date().toISOString() };
    await notifyStatus(onStatus, {
      status: "chapter_generating",
      progress: 10 + Math.floor((index / Math.max(1, total)) * 70),
      currentStep: "chapter_generating",
      currentChapterId: chapter.id,
      currentChapterTitle: chapter.title,
      totalChapters: total,
      completedChapters: index,
      chapters: buildChapterProgress(chapterPlan.chapters, chapterStates),
      systemStatus: integratedData.systemStatus,
    });
    try {
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
      chapterStates[chapter.id] = {
        status: "completed",
        startedAt: chapterStates[chapter.id].startedAt,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      chapterStates[chapter.id] = {
        status: "failed",
        startedAt: chapterStates[chapter.id]?.startedAt,
        completedAt: new Date().toISOString(),
        errorMessage: clean(error?.message || error),
      };
      await notifyStatus(onStatus, {
        status: "failed",
        progress: 10 + Math.floor((index / Math.max(1, total)) * 70),
        currentStep: "chapter_generating",
        currentChapterId: chapter.id,
        currentChapterTitle: chapter.title,
        totalChapters: total,
        completedChapters: chapterRecords.length,
        chapters: buildChapterProgress(chapterPlan.chapters, chapterStates),
        systemStatus: integratedData.systemStatus,
      });
      throw error;
    }
    await notifyStatus(onStatus, {
      status: "chapter_generating",
      progress: 10 + Math.floor(((index + 1) / Math.max(1, total)) * 70),
      currentStep: "chapter_generating",
      currentChapterId: chapter.id,
      currentChapterTitle: chapter.title,
      totalChapters: total,
      completedChapters: index + 1,
      chapters: buildChapterProgress(chapterPlan.chapters, chapterStates),
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

  await notifyStatus(onStatus, {
    status: "rendering",
    progress: 85,
    currentStep: "rendering",
    totalChapters: total,
    completedChapters: total,
    chapters: buildChapterProgress(chapterPlan.chapters, chapterStates),
    systemStatus: integratedData.systemStatus,
  });
  const html = assembleKarmaIntegratedFinalHtml({
    integratedData,
    chapterPlan,
    chapterRecords,
    reportId: jobId,
    generatedAt: new Date().toISOString(),
  });
  await notifyStatus(onStatus, {
    status: "saving",
    progress: 95,
    currentStep: "saving",
    totalChapters: total,
    completedChapters: total,
    chapters: buildChapterProgress(chapterPlan.chapters, chapterStates),
    systemStatus: integratedData.systemStatus,
  });

  const summary = chapterRecords
    .map((record) => clean(stripHtml(record.html).slice(0, 260)))
    .filter(Boolean)
    .slice(0, 2)
    .join("\n\n");
  const providerSet = new Set(chapterRecords.map((record) => clean(record.provider)).filter(Boolean));
  const provider = providerSet.has("mock") ? "mock" : (providerSet.has("cache") && providerSet.size === 1 ? "cache" : SOUL_ORIGIN_LLM_PROVIDER);
  const modelName = [...new Set(chapterRecords.map((record) => clean(record.modelName)).filter(Boolean))].join(",") || resolveSoulOriginModelName(env);
  const tokensUsed = chapterRecords.reduce((sum, record) => sum + Number(record.tokensUsed || 0), 0);
  const cost = chapterRecords.reduce((sum, record) => sum + Number(record.cost || 0), 0);
  const isMock = chapterRecords.some((record) => record.isMock === true || clean(record.provider) === "mock") || provider === "mock";

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
    provider,
    modelName,
    tokensUsed,
    cost,
    isMock,
    generationMode: KARMA_INTEGRATED_GENERATION_MODE,
    writingPipeline: SOUL_ORIGIN_LLM_WRITING_PIPELINE,
    manuscriptSource: SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
    llmAssemblyOnly: true,
    externalCallsAllowed: isMock ? false : true,
    llmAssembly: {
      enabled: true,
      externalGeneration: true,
      externalCallsAllowed: isMock ? false : true,
      fallbackUsed: false,
      provider,
      modelName,
      tokensUsed,
      cost,
      isMock,
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
