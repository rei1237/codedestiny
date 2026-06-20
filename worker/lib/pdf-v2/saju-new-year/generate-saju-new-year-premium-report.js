import {
  SAJU_NEW_YEAR_LLM_ENGINE_VERSION,
  SAJU_NEW_YEAR_LLM_GENERATION_MODE,
  SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
  SAJU_NEW_YEAR_LLM_PROMPT_VERSION,
  SAJU_NEW_YEAR_LLM_QUALITY_VERSION,
  SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
  SajuNewYearLlmGenerationError,
  clean,
  hashStable,
  logSajuNewYearLlmEvent,
  safeObject,
} from "./saju-new-year-premium.types.js";
import {
  buildSajuNewYearChapterPrompt,
  buildSajuNewYearRepairPrompt,
  sajuNewYearSystemPrompt,
} from "./saju-new-year-premium.prompt-pack.js";
import {
  generateSajuNewYearTextWithLlm,
  resolveSajuNewYearLlmProviders,
  resolveSajuNewYearModelName,
} from "./llm-client.js";
import {
  parseAndValidateSajuNewYearChapterJson,
  validateSajuNewYearLlmReport,
} from "./saju-new-year-premium.validator.js";

const CHAPTER_CACHE = new Map();

function readCacheStore(env = {}) {
  return env?.SAJU_NEW_YEAR_LLM_CACHE || env?.PDF_V2_CACHE || env?.REPORT_CACHE || null;
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

function isRetryableProviderFailure(result = {}) {
  const status = Number(result?.status || 0) || 0;
  const code = clean(result?.errorCode).toLowerCase();
  return status === 429 || status >= 500 || ["provider_exception", "timeout", "empty_response", "saju_new_year_llm_timeout"].includes(code);
}

function chapterPlanSummary(chapters = []) {
  return chapters.map((chapter) => `${chapter.no}. ${chapter.title}: ${(chapter.categories || []).join(" / ")}`).join("\n");
}

export function normalizeSajuNewYearLlmInput(normalized = {}) {
  const seed = safeObject(normalized.seed);
  const masterJson = safeObject(normalized.masterJson);
  const normalizedData = safeObject(normalized.normalizedData);
  return {
    service: "saju-new-year",
    targetYear: Number(normalized.targetYear || seed.targetYear || masterJson.targetYear),
    profile: {
      displayName: clean(seed?.birthProfile?.name || normalizedData?.profile?.name || "고객", 80),
      gender: clean(seed?.birthProfile?.gender || normalizedData?.profile?.gender || "", 40),
    },
    calculationSource: {
      masterJson,
      normalizedData,
      monthlyFortuneSections: Array.isArray(normalized.monthlyFortuneSections) ? normalized.monthlyFortuneSections : [],
    },
    strictRules: {
      keepCalculationValues: true,
      doNotRecalculate: true,
      outputLanguage: "ko",
      voice: "전문적이고 신비로운 명리 상담가의 존댓말",
    },
  };
}

export function buildSajuNewYearLlmChapterCacheKey({ normalizedInputHash, chapterNo, modelName }) {
  return `saju-new-year-llm-chapter:${hashStable({
    serviceType: "saju-new-year",
    source: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
    engineVersion: SAJU_NEW_YEAR_LLM_ENGINE_VERSION,
    qualityVersion: SAJU_NEW_YEAR_LLM_QUALITY_VERSION,
    promptVersion: SAJU_NEW_YEAR_LLM_PROMPT_VERSION,
    schemaVersion: SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
    modelName,
    normalizedInputHash,
    chapterNo,
    language: "ko",
  })}`;
}

async function generateChapter({ env, input, chapter, expectedChapters, normalizedInputHash, modelName, jobId, userId, onProgress }) {
  const cacheKey = buildSajuNewYearLlmChapterCacheKey({ normalizedInputHash, chapterNo: chapter.no, modelName });
  const cached = await readChapterCache(env, cacheKey);
  if (cached?.chapter) {
    const cachedValidation = parseAndValidateSajuNewYearChapterJson(cached.rawJson || cached.chapter, {
      chapter,
      targetYear: input.targetYear,
    });
    const cacheValid = cachedValidation.ok
      && clean(cached.promptVersion) === SAJU_NEW_YEAR_LLM_PROMPT_VERSION
      && clean(cached.schemaVersion) === SAJU_NEW_YEAR_LLM_SCHEMA_VERSION
      && clean(cached.qualityVersion) === SAJU_NEW_YEAR_LLM_QUALITY_VERSION;
    if (cacheValid) {
      return {
        ok: true,
        chapter: cachedValidation.chapter,
        monthlyFortunes: cachedValidation.monthlyFortunes,
        finalAdvice: cachedValidation.finalAdvice,
        provider: cached.provider || "cache",
        source: "llm-cache",
        attempts: [],
      };
    }
  }

  const providers = resolveSajuNewYearLlmProviders(env);
  const repairLimit = Math.max(0, Number(env?.SAJU_NEW_YEAR_LLM_REPAIR_LIMIT ?? 2));
  const attempts = [];
  const summary = chapterPlanSummary(expectedChapters);

  if (typeof onProgress === "function") onProgress({ stage: "saju-new-year-llm", chapter });

  for (const provider of providers) {
    let prompt = buildSajuNewYearChapterPrompt({ input, chapter, chapterPlanSummary: summary });
    let previousJsonText = "";
    for (let retry = 0; retry <= repairLimit; retry += 1) {
      const started = Date.now();
      logSajuNewYearLlmEvent("CHAPTER_GENERATION_STARTED", {
        jobId,
        userId,
        chapterNo: chapter.no,
        provider,
        retry,
        promptVersion: SAJU_NEW_YEAR_LLM_PROMPT_VERSION,
      });
      const result = await generateSajuNewYearTextWithLlm({
        provider,
        systemPrompt: sajuNewYearSystemPrompt,
        userPrompt: prompt,
        temperature: 0.62,
        maxTokens: Number(env?.SAJU_NEW_YEAR_CHAPTER_MAX_TOKENS || 24000),
        requestId: `${jobId}:saju-new-year:${chapter.no}:${retry}`,
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
        if (retry >= repairLimit || !isRetryableProviderFailure(result)) break;
        continue;
      }

      previousJsonText = String(result.text || "").trim();
      const validation = parseAndValidateSajuNewYearChapterJson(previousJsonText, {
        chapter,
        targetYear: input.targetYear,
      });
      if (validation.ok) {
        await writeChapterCache(env, cacheKey, {
          rawJson: validation.parsed,
          chapter: validation.chapter,
          monthlyFortunes: validation.monthlyFortunes,
          finalAdvice: validation.finalAdvice,
          provider,
          modelName: result.model || modelName,
          promptVersion: SAJU_NEW_YEAR_LLM_PROMPT_VERSION,
          schemaVersion: SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
          qualityVersion: SAJU_NEW_YEAR_LLM_QUALITY_VERSION,
          storedAt: new Date().toISOString(),
        });
        logSajuNewYearLlmEvent("CHAPTER_GENERATION_COMPLETED", {
          jobId,
          userId,
          chapterNo: chapter.no,
          provider,
          modelName: result.model || modelName,
        });
        return {
          ok: true,
          chapter: validation.chapter,
          monthlyFortunes: validation.monthlyFortunes,
          finalAdvice: validation.finalAdvice,
          provider,
          source: "llm",
          attempts,
        };
      }

      attempt.ok = false;
      attempt.errorCode = "validation_failed";
      attempt.issues = validation.issues;
      logSajuNewYearLlmEvent("CHAPTER_VALIDATION_FAILED", {
        jobId,
        userId,
        chapterNo: chapter.no,
        provider,
        issues: validation.issues.slice(0, 12),
      });
      if (retry < repairLimit) {
        prompt = buildSajuNewYearRepairPrompt({
          input,
          chapter,
          previousJsonText,
          validationErrors: validation.issues,
        });
      }
    }
  }

  return {
    ok: false,
    chapterNo: chapter.no,
    title: chapter.title,
    errorCode: "SAJU_NEW_YEAR_LLM_CHAPTER_GENERATION_FAILED",
    attempts,
  };
}

function buildClientSummaryFromLlm({ input, chapters, monthlyFortunes, finalAdvice, validation }) {
  const firstSections = Array.isArray(chapters?.[0]?.sections) ? chapters[0].sections : [];
  const chapterTenSections = Array.isArray(chapters?.[9]?.sections) ? chapters[9].sections : [];
  const pickValue = (sectionIndex, fallback = "") => clean(firstSections[sectionIndex]?.keyPoints?.[0] || firstSections[sectionIndex]?.body?.split(/\n\s*\n/)[0] || fallback, 260);
  return {
    title: `${input.targetYear}년 핵심 상담 요약`,
    cards: [
      { label: "총운", value: pickValue(0) },
      { label: "세운", value: pickValue(1) },
      { label: "오행", value: pickValue(2) },
      { label: "삶의 영역", value: pickValue(3) },
      { label: "올해 기준", value: pickValue(4) },
      { label: "상담서 상태", value: `${chapters.length}챕터 · 준비 완료` },
    ],
    consultation: firstSections.slice(0, 3).map((section) => clean(section.body.split(/\n\s*\n/)[0], 360)).filter(Boolean),
    opportunities: monthlyFortunes.filter((item) => /기회|확장|실행|열/.test(`${item.flow} ${item.advice}`)).slice(0, 3),
    cautions: monthlyFortunes.filter((item) => /주의|점검|정비|조심/.test(`${item.caution} ${item.flow}`)).slice(0, 3),
    monthlyCards: monthlyFortunes,
    masterPlan: chapterTenSections.map((section) => ({
      period: clean(section.title, 80),
      focus: clean(section.keyPoints?.[0] || section.title, 160),
      action: clean(section.actionGuide?.[0] || section.body.split(/\n\s*\n/).at(-1), 260),
    })).filter((item) => item.period),
    finalAdvice,
    quality: {
      status: validation?.ok ? "passed" : "failed",
      totalChars: validation?.stats?.totalChars,
      monthCoverage: monthlyFortunes.length,
      pdfReady: validation?.ok === true,
    },
  };
}

export async function generateSajuNewYearPremiumReport(params = {}) {
  const env = params.env || {};
  const normalized = params.normalized || {};
  const userId = clean(params.userId);
  const jobId = clean(params.jobId || params.reportId || normalized.reportId || `saju-new-year-${Date.now().toString(36)}`);
  const expectedChapters = Array.isArray(normalized.expectedChapters) ? normalized.expectedChapters : [];
  if (!expectedChapters.length) {
    throw new SajuNewYearLlmGenerationError("신년운세 챕터 구조를 확인하지 못했습니다.", {
      code: "SAJU_NEW_YEAR_LLM_CHAPTER_PLAN_MISSING",
      status: 422,
    });
  }

  const input = normalizeSajuNewYearLlmInput(normalized);
  const normalizedInputHash = hashStable(input);
  const modelName = resolveSajuNewYearModelName(env);
  const chapters = [];
  const attempts = [];
  const providerSet = new Set();
  let monthlyFortunes = [];
  let finalAdvice = null;

  logSajuNewYearLlmEvent("INPUT_NORMALIZED", { jobId, userId, status: "ok", targetYear: input.targetYear });

  for (const chapter of expectedChapters) {
    const result = await generateChapter({
      env,
      input,
      chapter,
      expectedChapters,
      normalizedInputHash,
      modelName,
      jobId,
      userId,
      onProgress: params.onProgress,
    });
    attempts.push(...(result.attempts || []));
    if (!result.ok) {
      throw new SajuNewYearLlmGenerationError("신년운세 원고를 완성하지 못했습니다.", {
        code: result.errorCode || "SAJU_NEW_YEAR_LLM_CHAPTER_GENERATION_FAILED",
        status: 503,
        attempts,
        issues: [`chapter_${result.chapterNo}`],
      });
    }
    chapters.push(result.chapter);
    if (Array.isArray(result.monthlyFortunes) && result.monthlyFortunes.length) monthlyFortunes = result.monthlyFortunes;
    if (result.finalAdvice?.body) finalAdvice = result.finalAdvice;
    providerSet.add(result.provider);
  }

  const validation = validateSajuNewYearLlmReport({
    chapters,
    monthlyFortunes,
    finalAdvice,
    targetYear: input.targetYear,
    expectedChapters,
  });
  if (!validation.ok) {
    throw new SajuNewYearLlmGenerationError("신년운세 원고 품질 검증을 통과하지 못했습니다.", {
      code: "SAJU_NEW_YEAR_LLM_REPORT_VALIDATION_FAILED",
      status: 422,
      issues: validation.issues,
      attempts,
    });
  }

  const provider = providerSet.has("gemini") && providerSet.size === 1
    ? "gemini"
    : providerSet.has("gemini")
      ? "gemini-workers-ai"
      : "workers-ai";
  const llmAssembly = {
    enabled: true,
    source: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
    provider,
    modelName,
    engineVersion: SAJU_NEW_YEAR_LLM_ENGINE_VERSION,
    qualityVersion: SAJU_NEW_YEAR_LLM_QUALITY_VERSION,
    promptVersion: SAJU_NEW_YEAR_LLM_PROMPT_VERSION,
    schemaVersion: SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
    chapterCount: chapters.length,
    expectedChapterCount: expectedChapters.length,
    externalGeneration: true,
    externalCallsAllowed: true,
    fallbackUsed: false,
  };
  const clientSummary = buildClientSummaryFromLlm({ input, chapters, monthlyFortunes, finalAdvice, validation });

  logSajuNewYearLlmEvent("ALL_CHAPTERS_COMPLETED", {
    jobId,
    userId,
    status: "completed",
    provider,
    modelName,
    totalChars: validation.stats.totalChars,
  });

  return {
    chapters,
    chapterCount: chapters.length,
    expectedChapterCount: expectedChapters.length,
    localYearSajuJson: normalized.seed,
    newYearMasterJson: normalized.masterJson,
    masterJson: normalized.masterJson,
    masterJsonValidation: normalized.masterJsonValidation,
    normalizedData: normalized.normalizedData,
    monthlyFortuneSections: normalized.monthlyFortuneSections,
    monthlyFortunes,
    finalAdvice,
    clientSummary,
    validation,
    normalizedInput: input,
    normalizedInputHash,
    provider,
    modelName,
    llmAssembly,
    llmAssemblyOnly: true,
    externalCallsAllowed: true,
    fallbackUsed: false,
    manuscriptSource: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
    generationMode: SAJU_NEW_YEAR_LLM_GENERATION_MODE,
    promptVersion: SAJU_NEW_YEAR_LLM_PROMPT_VERSION,
    schemaVersion: SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
    qualityVersion: SAJU_NEW_YEAR_LLM_QUALITY_VERSION,
    engineVersion: SAJU_NEW_YEAR_LLM_ENGINE_VERSION,
    cacheDigest: hashStable({ normalizedInputHash, modelName, promptVersion: SAJU_NEW_YEAR_LLM_PROMPT_VERSION, schemaVersion: SAJU_NEW_YEAR_LLM_SCHEMA_VERSION }),
  };
}
