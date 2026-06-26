import {
  LIFE_BOOK_PREMIUM_ENGINE_VERSION,
  LIFE_BOOK_PREMIUM_MANUSCRIPT_SOURCE,
  LIFE_BOOK_PREMIUM_QUALITY_VERSION,
  LIFE_BOOK_PREMIUM_WRITING_PIPELINE,
  asArray,
  buildLifeBookLlmAssembly,
  clean,
  hashStable,
  logLifeBookPdfEvent,
  safeObject,
} from "./life-book-premium.types.js";
import { generateLifeBookTextWithLlm, resolveLifeBookLlmProviders, resolveLifeBookModelName } from "./llm-client.js";
import {
  LIFE_BOOK_LLM_VERSION,
  assertLifeBookChapterPlan,
  loadLifeBookChapterConfig,
} from "./life-book-chapters.js";
import {
  LIFE_BOOK_PROMPT_VERSION,
  buildLifeBookChapterPrompt,
  buildLifeBookRepairPrompt,
  lifeBookSystemPrompt,
} from "./life-book-prompts.js";
import { parseLifeBookChapterHtml, validateChapterHtml } from "./life-book-validator.js";

const CHAPTER_CACHE = new Map();

function readCacheStore(env = {}) {
  return env?.LIFE_BOOK_LLM_CACHE || env?.LIFE_BOOK_PREMIUM_LLM_CACHE || env?.PDF_V2_CACHE || env?.REPORT_CACHE || null;
}

async function readChapterCache(env, key) {
  const local = CHAPTER_CACHE.get(key);
  if (local) return local;
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

async function deleteChapterCache(env, key) {
  CHAPTER_CACHE.delete(key);
  const store = readCacheStore(env);
  if (store?.delete) {
    try {
      await store.delete(key);
    } catch (_) {}
  }
}

function pickFirstObject(...values) {
  for (const value of values) {
    const item = safeObject(value);
    if (Object.keys(item).length) return item;
  }
  return {};
}

function normalizePillar(value) {
  if (typeof value === "string") return { ganji: clean(value, 80) };
  const item = safeObject(value);
  const stem = clean(item.stem || item.gan || item.heavenlyStem || item.stemKo, 40);
  const branch = clean(item.branch || item.zhi || item.earthlyBranch || item.branchKo, 40);
  const ganji = clean(item.ganji || item.label || `${stem}${branch}`, 80);
  return {
    ...item,
    stem,
    branch,
    ganji,
  };
}

function normalizePillars(chart = {}, local = {}, body = {}) {
  const source = pickFirstObject(chart.pillars, local.pillars, local.saju?.pillars, body.quantumMyeongriJson?.pillars, body.engineData?.quantumMyeongriJson?.pillars);
  return {
    yearPillar: normalizePillar(chart.yearPillar || source.year || source.y || local.yearPillar),
    monthPillar: normalizePillar(chart.monthPillar || source.month || source.m || local.monthPillar),
    dayPillar: normalizePillar(chart.dayPillar || source.day || source.d || local.dayPillar),
    hourPillar: normalizePillar(chart.hourPillar || source.hour || source.h || local.hourPillar),
  };
}

export function normalizeLifeBookInput(raw = {}) {
  const body = safeObject(raw.body || raw);
  const profile = safeObject(raw.profile || body.profile);
  const birthInput = safeObject(raw.birthInput || body.birthInput);
  const chart = safeObject(body.sajuChart || raw.sajuChart);
  const local = safeObject(raw.localSajuJson || body.localSajuJson || body.quantumMyeongriJson || body.engineData?.quantumMyeongriJson);
  const signals = safeObject(raw.signals || body.analysisSignals || body.signals);
  const pillars = normalizePillars(chart, local, body);
  const birthTimeKnown = body.birthTimeKnown !== false && birthInput.birthTimeKnown !== false;
  const birthTime = birthTimeKnown
    ? clean(birthInput.birthTime || body.birthTime || profile.birthTime, 20)
    : "";

  const sajuChart = {
    ...pillars,
    tenGods: chart.tenGods || local.tenGods || local.tenGodDistribution || local.sibseong || signals.tenGods || signals.tenGodCounts || {},
    hiddenStems: chart.hiddenStems || local.hiddenStems || local.jijanggan || signals.hiddenStems || {},
    twelveStages: chart.twelveStages || local.twelveStages || local.twelveGrowthStages || signals.twelveGrowthStages || [],
    fiveElements: chart.fiveElements || local.fiveElements || local.elementBalance || local.elements || signals.elementBalance || signals.elementWeights || {},
    combinations: chart.combinations || local.combinations || local.hap || signals.combinations || {},
    clashes: chart.clashes || local.clashes || local.chung || local.hyeongchunghaphae || signals.clashes || {},
    usefulGod: chart.usefulGod || local.usefulGod || local.usefulGods || local.yongshin || signals.usefulGod || signals.yongshinElements || {},
    structure: chart.structure || local.structure || local.geokguk || signals.structure || signals.geokguk || {},
  };

  const input = {
    service: "life-book",
    userName: clean(body.userName || body.name || profile.name || birthInput.name || "고객", 80),
    gender: clean(body.gender || profile.gender || birthInput.gender || "미상", 40),
    birthDate: clean(birthInput.birthDate || body.birthDate || profile.birthDate, 40),
    birthTime,
    calendarType: clean(body.calendarType || profile.calendarType || birthInput.calendarType || "solar", 20),
    birthPlace: clean(body.birthPlace || body.birthplace || profile.birthPlace || profile.birthplace || birthInput.birthPlace || birthInput.birthplace || "미상", 120),
    question: clean(body.question || body.userQuestion || body.topic || "인생 전반의 흐름", 800),
    sajuChart,
    luckCycles: body.luckCycles || local.luckCycles || local.daewoon || local.cycles?.daewoon || signals.daewoon || signals.daewunCycles || {},
    annualLuck: body.annualLuck || local.annualLuck || local.yearly || local.sewoon || signals.sewoon || signals.annualLuck || {},
    categories: body.categories || raw.categories || null,
    calculationEvidence: {
      localSajuValidation: raw.localSajuValidation || body.localSajuValidation || null,
      jsonContractValidation: raw.jsonContractValidation || body.jsonContractValidation || null,
      analysisSignals: signals,
      engineData: body.engineData || null,
      calculationSource: body.calculationSource || raw.calculationSource || "worker-local-saju-engine",
    },
  };

  return {
    ...input,
    birthDataHash: hashStable({
      userName: input.userName,
      gender: input.gender,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      calendarType: input.calendarType,
      birthPlace: input.birthPlace,
    }),
    sajuChartHash: hashStable(input.sajuChart),
    luckCyclesHash: hashStable(input.luckCycles),
    annualLuckHash: hashStable(input.annualLuck),
    questionHash: hashStable(input.question),
  };
}

export function validateInput(input = {}) {
  if (clean(input.service) !== "life-book") {
    throw Object.assign(new Error("LIFE_BOOK_SERVICE_INVALID"), { code: "LIFE_BOOK_SERVICE_INVALID", status: 422 });
  }
  if (!clean(input.birthDate)) {
    throw Object.assign(new Error("LIFE_BOOK_BIRTH_DATE_REQUIRED"), { code: "LIFE_BOOK_BIRTH_DATE_REQUIRED", status: 422 });
  }
  const chart = safeObject(input.sajuChart);
  const hasChart = [
    chart.yearPillar,
    chart.monthPillar,
    chart.dayPillar,
    chart.hourPillar,
    chart.tenGods,
    chart.fiveElements,
    chart.luckCycles,
  ].some((value) => {
    if (!value) return false;
    if (typeof value === "string") return Boolean(clean(value));
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  });
  if (!hasChart) {
    throw Object.assign(new Error("LIFE_BOOK_SAJU_CHART_REQUIRED"), { code: "LIFE_BOOK_SAJU_CHART_REQUIRED", status: 422 });
  }
  return true;
}

export function buildLifeBookChapterCacheKey({
  input,
  chapter,
  chapterConfigVersion,
  modelName,
} = {}) {
  return `life-book-llm:${hashStable({
    service: "life-book",
    version: LIFE_BOOK_LLM_VERSION,
    promptVersion: LIFE_BOOK_PROMPT_VERSION,
    qualityVersion: LIFE_BOOK_PREMIUM_QUALITY_VERSION,
    chapterConfigVersion,
    chapterId: clean(chapter.id),
    birthDataHash: input.birthDataHash,
    sajuChartHash: input.sajuChartHash,
    luckCyclesHash: input.luckCyclesHash,
    annualLuckHash: input.annualLuckHash,
    questionHash: input.questionHash,
    modelName: clean(modelName),
  })}`;
}

function isRetryableProviderFailure(result = {}) {
  const status = Number(result?.status || 0) || 0;
  const code = clean(result?.errorCode).toLowerCase();
  return status === 429 || status >= 500 || ["provider_exception", "timeout", "empty_response", "life_book_llm_timeout"].includes(code);
}

async function generateChapterWithLlm({
  env,
  input,
  chapter,
  chapterPlan,
  chapterConfigVersion,
  modelName,
  jobId,
  userId,
} = {}) {
  const cacheKey = buildLifeBookChapterCacheKey({ input, chapter, chapterConfigVersion, modelName });
  const cached = await readChapterCache(env, cacheKey);
  if (cached?.html) {
    const validation = validateChapterHtml(cached.html, chapter);
    if (
      validation.ok
      && clean(cached.version) === LIFE_BOOK_LLM_VERSION
      && clean(cached.promptVersion) === LIFE_BOOK_PROMPT_VERSION
      && clean(cached.chapterConfigVersion) === clean(chapterConfigVersion)
    ) {
      const parsed = parseLifeBookChapterHtml(validation.html, chapter);
      parsed.cached = true;
      parsed.provider = cached.provider || "cache";
      parsed.modelName = cached.modelName || modelName;
      return { ok: true, parsed, provider: parsed.provider, modelName: parsed.modelName, source: "cache", attempts: [] };
    }
    await deleteChapterCache(env, cacheKey);
  }

  const providers = resolveLifeBookLlmProviders(env);
  const repairLimit = Math.min(2, Math.max(0, Number(env?.LIFE_BOOK_LLM_REPAIR_LIMIT ?? env?.LIFE_BOOK_PREMIUM_LLM_REPAIR_LIMIT ?? 2)));
  const attempts = [];

  for (const provider of providers) {
    const activeModel = resolveLifeBookModelName(env, provider) || modelName;
    let previousHtml = "";
    let validationErrors = [];
    for (let retry = 0; retry <= repairLimit; retry += 1) {
      const prompt = retry === 0
        ? buildLifeBookChapterPrompt({ input, chapter, chapterPlan })
        : buildLifeBookRepairPrompt({ input, chapter, chapterPlan, previousHtml, validationErrors });
      const started = Date.now();
      logLifeBookPdfEvent("LIFE_BOOK_LLM_CHAPTER_STARTED", {
        jobId,
        userId,
        chapterId: chapter.id,
        provider,
        modelName: activeModel,
        status: retry === 0 ? "generating" : "repairing",
        promptVersion: LIFE_BOOK_PROMPT_VERSION,
      });
      const result = await generateLifeBookTextWithLlm({
        provider,
        systemPrompt: lifeBookSystemPrompt,
        userPrompt: prompt,
        model: activeModel,
        temperature: Number(env?.LIFE_BOOK_LLM_TEMPERATURE ?? 0.64),
        maxTokens: Number(env?.LIFE_BOOK_CHAPTER_MAX_TOKENS || env?.LIFE_BOOK_PREMIUM_CHAPTER_MAX_TOKENS || 14000),
        requestId: `${jobId}:${chapter.id}:${provider}:${retry}`,
      }, env);
      const attempt = {
        provider: clean(result.provider || provider),
        retry,
        ok: Boolean(result.ok),
        modelName: clean(result.model || activeModel),
        errorCode: clean(result.errorCode),
        status: result.status || null,
        durationMs: Number(result.latencyMs || Date.now() - started),
      };
      attempts.push(attempt);

      if (!result.ok) {
        validationErrors = [clean(result.errorCode || "llm.failed")];
        previousHtml = "";
        if (retry < repairLimit && isRetryableProviderFailure(result)) continue;
        break;
      }

      previousHtml = String(result.text || "").trim();
      const validation = validateChapterHtml(previousHtml, chapter);
      if (validation.ok) {
        const parsed = parseLifeBookChapterHtml(validation.html, chapter);
        parsed.cached = false;
        parsed.provider = clean(result.provider || provider);
        parsed.modelName = clean(result.model || activeModel);
        await writeChapterCache(env, cacheKey, {
          html: validation.html,
          version: LIFE_BOOK_LLM_VERSION,
          promptVersion: LIFE_BOOK_PROMPT_VERSION,
          chapterConfigVersion,
          provider: parsed.provider,
          modelName: parsed.modelName,
          storedAt: new Date().toISOString(),
        });
        logLifeBookPdfEvent("LIFE_BOOK_LLM_CHAPTER_COMPLETED", {
          jobId,
          userId,
          chapterId: chapter.id,
          provider: parsed.provider,
          modelName: parsed.modelName,
          status: "completed",
          durationMs: attempt.durationMs,
        });
        return { ok: true, parsed, provider: parsed.provider, modelName: parsed.modelName, source: "llm", attempts };
      }

      attempt.ok = false;
      attempt.errorCode = "validation_failed";
      attempt.issues = validation.issues;
      validationErrors = validation.issues;
      if (retry < repairLimit) continue;
    }
  }

  return {
    ok: false,
    chapterId: clean(chapter.id),
    title: clean(chapter.title),
    errorCode: "LIFE_BOOK_CHAPTER_GENERATION_FAILED",
    attempts,
  };
}

function progressPercent(done, total) {
  const safeTotal = Math.max(1, Number(total || 1));
  return Math.min(80, Math.max(10, 10 + Math.round((Number(done || 0) / safeTotal) * 70)));
}

export async function generateLifeBookPremiumReport(params = {}) {
  const env = params.env || {};
  const userId = clean(params.userId);
  const jobId = clean(params.jobId || params.reportId || `life-book-${Date.now().toString(36)}`);
  const input = normalizeLifeBookInput(params.input || {});
  validateInput(input);
  if (typeof params.onProgress === "function") {
    params.onProgress({ status: "validating", progress: 5, currentChapterNo: 0, totalChapters: 0 });
  }

  const chapterConfig = loadLifeBookChapterConfig({ env, input: params.input || {} });
  const chapterPlan = asArray(chapterConfig.chapters);
  assertLifeBookChapterPlan(chapterPlan, { requireDefaultIds: chapterConfig.source === "default-13" });
  const chapterConfigVersion = clean(chapterConfig.chapterConfigVersion || chapterConfig.version || LIFE_BOOK_LLM_VERSION);
  const chapters = [];
  const chapterAttempts = [];
  let provider = "";
  let modelName = resolveLifeBookModelName(env, "gemini");

  if (typeof params.onProgress === "function") {
    params.onProgress({ status: "generating", progress: 10, currentChapterNo: 0, totalChapters: chapterPlan.length });
  }

  for (let index = 0; index < chapterPlan.length; index += 1) {
    const chapter = chapterPlan[index];
    if (typeof params.onProgress === "function") {
      params.onProgress({
        status: "generating",
        progress: progressPercent(index, chapterPlan.length),
        chapter,
        currentChapterNo: index,
        totalChapters: chapterPlan.length,
      });
    }
    const generated = await generateChapterWithLlm({
      env,
      input,
      chapter,
      chapterPlan,
      chapterConfigVersion,
      modelName,
      jobId,
      userId,
    });
    chapterAttempts.push({ chapterId: chapter.id, status: generated.status || (generated.ok ? "completed" : "failed"), attempts: generated.attempts });
    if (!generated.ok) {
      throw Object.assign(new Error("LIFE_BOOK_CHAPTER_GENERATION_FAILED"), {
        code: "LIFE_BOOK_CHAPTER_GENERATION_FAILED",
        status: 502,
        details: generated,
      });
    }
    modelName = clean(generated.modelName || modelName);
    provider = provider || clean(generated.provider);
    chapters.push(generated.parsed);
    if (typeof params.onProgress === "function") {
      params.onProgress({
        status: "generating",
        progress: progressPercent(index + 1, chapterPlan.length),
        chapter,
        currentChapterNo: index + 1,
        totalChapters: chapterPlan.length,
      });
    }
  }

  return {
    ok: true,
    normalizedInput: input,
    chapterPlan,
    chapterConfigSource: chapterConfig.source,
    chapterConfigVersion,
    chapters,
    chapterCount: chapters.length,
    expectedChapterCount: chapterPlan.length,
    manuscriptSource: LIFE_BOOK_PREMIUM_MANUSCRIPT_SOURCE,
    generationMode: "llm-only",
    provider: provider || "llm",
    modelName,
    writingPipeline: LIFE_BOOK_PREMIUM_WRITING_PIPELINE,
    llmAssembly: buildLifeBookLlmAssembly(chapters.length, chapterPlan.length),
    llmAssemblyOnly: true,
    externalCallsAllowed: true,
    chapterAttempts,
    pdfV2: {
      engineVersion: LIFE_BOOK_PREMIUM_ENGINE_VERSION,
      qualityVersion: LIFE_BOOK_PREMIUM_QUALITY_VERSION,
      promptVersion: LIFE_BOOK_PROMPT_VERSION,
      chapterPlanVersion: chapterConfigVersion,
      llmVersion: LIFE_BOOK_LLM_VERSION,
    },
  };
}
