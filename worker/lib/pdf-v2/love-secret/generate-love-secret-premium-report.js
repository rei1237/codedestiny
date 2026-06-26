import {
  LOVE_SECRET_LLM_VERSION,
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

function inputHash(value) {
  return hashStable(value || {});
}

function questionHash(input = {}) {
  return hashStable({
    question: input.love?.currentConcern,
    relationshipStatus: input.love?.relationshipStatus,
    relationshipType: input.love?.relationshipType,
    desiredOutcome: input.love?.desiredOutcome,
  });
}

function isChapterCacheEnabled(env = {}) {
  return clean(env?.LOVE_SECRET_PREMIUM_ENABLE_CHAPTER_CACHE).toLowerCase() === "true";
}

export function buildLoveSecretPremiumChapterCacheKey({ normalizedInput = {}, chapterId, modelName, chapterPlanVersion }) {
  const common = {
    service: "love-secret",
    version: LOVE_SECRET_LLM_VERSION,
    engineVersion: LOVE_SECRET_PREMIUM_ENGINE_VERSION,
    qualityVersion: LOVE_SECRET_PREMIUM_QUALITY_VERSION,
    chapterPlanVersion,
    promptVersion: LOVE_SECRET_PREMIUM_PROMPT_VERSION,
    modelName,
    mode: normalizedInput.mode,
    questionHash: questionHash(normalizedInput),
    chapterId,
    language: "ko",
  };
  const descriptor = normalizedInput.mode === "compatibility"
    ? {
        ...common,
        personABirthDataHash: inputHash(normalizedInput.userProfile),
        personBBirthDataHash: inputHash(normalizedInput.partnerProfile),
        personAChartHash: inputHash(normalizedInput.saju),
        personBChartHash: inputHash(normalizedInput.compatibility?.partnerSaju),
        relationshipStatusHash: inputHash({
          relationshipStatus: normalizedInput.love?.relationshipStatus,
          relationshipType: normalizedInput.love?.relationshipType,
        }),
      }
    : {
        ...common,
        userBirthDataHash: inputHash(normalizedInput.userProfile),
        sajuChartHash: inputHash(normalizedInput.saju),
      };
  return `love-secret:${LOVE_SECRET_LLM_VERSION}:chapter:${hashStable(descriptor)}`;
}

function isRetryableProviderFailure(result = {}) {
  const status = Number(result?.status || 0) || 0;
  const code = clean(result?.errorCode).toLowerCase();
  return status === 429 || status >= 500 || ["provider_exception", "timeout", "empty_response", "love_secret_llm_timeout"].includes(code);
}

function buildChapterPlanSummary(plan) {
  return plan.chapters
    .map((chapter) => `${chapter.order}. ${chapter.id} ${chapter.title}: ${chapter.purpose}`)
    .join("\n");
}

function normalizeGeneratedChapter({ chapter, html, status, source, provider, modelName, tokensUsed = 0, cost = 0, isMock = false, validation }) {
  const parsed = parseLoveSecretPremiumChapterHtml(html, chapter);
  return {
    id: chapter.id,
    order: chapter.order,
    title: chapter.title,
    html,
    text: parsed.text,
    status,
    source,
    provider,
    modelName,
    tokensUsed: Number(tokensUsed || 0),
    cost: Number(cost || 0),
    isMock: isMock === true || clean(provider) === "mock",
    sections: [{ title: parsed.h2 || chapter.title }],
    textLength: validation?.textLength || parsed.text.replace(/\s/g, "").length,
  };
}

async function generateChapter({ env, input, chapter, plan, modelName, jobId, userId, previousSummary, onProgress }) {
  const totalChapters = Array.isArray(plan?.chapters) ? plan.chapters.length : 0;
  const notify = async (event = {}) => {
    if (typeof onProgress !== "function") return;
    await onProgress({
      status: "generating",
      chapter,
      currentChapter: chapter,
      currentChapterNumber: chapter.order,
      currentChapterTitle: chapter.title,
      completedChapters: Math.max(0, Number(chapter.order || 1) - 1),
      totalChapters,
      ...event,
    });
  };

  await notify({
    phase: "chapter_started",
    currentStep: `챕터 ${chapter.order}의 상담문을 생성하고 있습니다.`,
  });

  const cacheKey = buildLoveSecretPremiumChapterCacheKey({
    normalizedInput: input,
    chapterId: chapter.id,
    modelName,
    chapterPlanVersion: plan.version,
  });
  const cached = isChapterCacheEnabled(env) ? await readChapterCache(env, cacheKey) : null;
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
        tokensUsed: 0,
        cost: 0,
        isMock: clean(cached.provider) === "mock",
        validation,
      });
      await notify({
        phase: "chapter_completed",
        completedChapter: completed,
        completedChapters: chapter.order,
        provider: completed.provider,
        tokensUsed: completed.tokensUsed,
        cost: completed.cost,
        isMock: completed.isMock,
        currentStep: `챕터 ${chapter.order} 검수와 저장이 완료되었습니다.`,
      });
      return completed;
    }
  }

  const providers = resolveLoveSecretLlmProviders(env);
  const chapterPlanSummary = buildChapterPlanSummary(plan);
  const maxRepairAttempts = env && Object.prototype.hasOwnProperty.call(env, "PDF_LLM_MAX_RETRIES")
    ? Math.max(0, Number(env.PDF_LLM_MAX_RETRIES || 0))
    : Math.max(1, Number(env?.LOVE_SECRET_PREMIUM_REPAIR_ATTEMPTS || 3));
  const expertPersona = "30년 경력의 사주 명리학자이자 현실적인 연애 상담사로서, 사주 신호를 고객이 이해할 수 있는 관계 언어로 풀어낸다.";
  let lastErrors = [];
  let lastHtml = "";
  let lastProviderFailure = null;

  for (const provider of providers) {
    for (let attempt = 0; attempt <= maxRepairAttempts; attempt += 1) {
      await notify({
        phase: attempt === 0 ? "chapter_llm_call" : "chapter_repair_call",
        provider,
        attempt: attempt + 1,
        currentStep: attempt === 0
          ? `챕터 ${chapter.order}의 상담문을 생성하고 있습니다.`
          : `챕터 ${chapter.order}의 상담문을 더 자연스럽게 다듬고 있습니다.`,
      });
      const userPrompt = attempt === 0
        ? buildLoveSecretChapterPrompt({ input, chapter, chapterPlanSummary, expertPersona, previousSummary })
        : buildLoveSecretRepairPrompt({ input, chapter, previousHtml: lastHtml, validationErrors: lastErrors, expertPersona });
      const started = Date.now();
      const result = await generateLoveSecretTextWithLlm({
        provider,
        jobId,
        model: modelName,
        systemPrompt: loveSecretSystemPrompt,
        userPrompt,
        temperature: Number(env?.LOVE_SECRET_PREMIUM_LLM_TEMPERATURE || 0.7),
        maxTokens: Number(env?.LOVE_SECRET_PREMIUM_CHAPTER_MAX_TOKENS || 12000),
        timeoutMs: Number(env?.LOVE_SECRET_PREMIUM_LLM_TIMEOUT_MS || 120000),
        requestId: `${jobId || "love-secret"}:${chapter.id}:${attempt}`,
        context: {
          mode: input.mode,
          chapter,
          totalChapters: plan.chapters.length,
        },
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
        await notify({
          phase: "chapter_validation_failed",
          provider,
          attempt: attempt + 1,
          validationErrors: lastErrors,
          currentStep: `챕터 ${chapter.order}의 상담문을 보강하고 있습니다.`,
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
        tokensUsed: Number(result.tokensUsed || 0),
        cost: Number(result.cost || 0),
        isMock: result.isMock === true || clean(result.provider || provider) === "mock",
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
      await notify({
        phase: "chapter_completed",
        completedChapter: completed,
        completedChapters: chapter.order,
        provider: completed.provider,
        tokensUsed: completed.tokensUsed,
        cost: completed.cost,
        isMock: completed.isMock,
        currentStep: `챕터 ${chapter.order} 검수와 저장이 완료되었습니다.`,
      });
      return completed;
    }
  }

  const error = new Error(`LOVE_SECRET_CHAPTER_GENERATION_FAILED:${chapter.id}:${lastErrors.join(",") || clean(lastProviderFailure?.errorCode) || "llm_failed"}`);
  error.code = "LOVE_SECRET_CHAPTER_GENERATION_FAILED";
  error.status = 502;
  error.chapterId = chapter.id;
  error.chapterOrder = chapter.order;
  error.chapterTitle = chapter.title;
  error.validationErrors = lastErrors;
  error.providerFailure = lastProviderFailure;
  error.retryable = true;
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
  const plan = resolveLoveSecretPremiumChapterPlan({ mode: normalizedInput.mode });
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
      .map((item) => `${item.title}: ${clean(item.text, 220)}`)
      .join("\n");
    const completed = await generateChapter({
      env,
      input: normalizedInput,
      chapter,
      plan,
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
  const tokensUsed = chapters.reduce((sum, chapter) => sum + Number(chapter.tokensUsed || 0), 0);
  const cost = chapters.reduce((sum, chapter) => sum + Number(chapter.cost || 0), 0);
  const isMock = chapters.some((chapter) => chapter.isMock === true || clean(chapter.provider) === "mock") || provider === "mock";
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
    tokensUsed,
    cost,
    isMock,
    promptVersion: LOVE_SECRET_PREMIUM_PROMPT_VERSION,
    chapterPlanVersion: plan.version,
    writingPipeline: "saju-love-calculation-to-llm-authored-pdf",
    llmAssembly: {
      enabled: true,
      externalGeneration: true,
      externalCallsAllowed: isMock ? false : true,
      fallbackUsed: false,
      localFallback: false,
      provider,
      modelName: completedModelName,
      tokensUsed,
      cost,
      isMock,
      promptVersion: LOVE_SECRET_PREMIUM_PROMPT_VERSION,
      chapterPlanVersion: plan.version,
      chapterCount: chapters.length,
      expectedChapterCount: plan.chapters.length,
      cacheHits: chapters.filter((chapter) => chapter.source === "llm-cache").length,
      inputHash: normalizedInputHash,
    },
    llmAssemblyOnly: true,
    externalCallsAllowed: isMock ? false : true,
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
