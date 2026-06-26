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
  resolveSajuNewYearChapterProviderPlan,
  resolveSajuNewYearLlmProviders,
  resolveSajuNewYearModelName,
  resolveSajuNewYearProviderModelKey,
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

function stripTechnicalLlmFallbackText(value) {
  return clean(value, 6000)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#+\s*/gm, "")
    .replace(/\b(?:fallback|payload|json|debug|internal\s*server\s*error|undefined|null|nan|object|calculationmode|recovered|about:blank|llm|api|engine|validation|retry|seed|skeleton|local|schema|prompt)\b/gi, " ")
    .replace(/자동\s*복구\s*생성|데이터가\s*부족합니다|자동\s*생성|템플릿|계산\s*시그니처|내부\s*데이터|로컬\s*기반|생성\s*로직|챕터\s*생성기|카테고리\s*렌더러/g, " ")
    .replace(/[{}[\]<>]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function measuredTextLength(value) {
  return clean(value).replace(/\s+/g, "").length;
}

function joinFallbackParagraphs(paragraphs = [], minLength = 1100) {
  const source = paragraphs.map((paragraph) => clean(paragraph, 4000)).filter(Boolean);
  let body = source.join("\n\n");
  let guard = 0;
  while (measuredTextLength(body) < minLength && guard < 3) {
    guard += 1;
    body = `${body}\n\n${source.slice(1).join("\n\n")}`.trim();
  }
  return clean(body, 20000);
}

function buildTextFallbackSectionBody({ rawText, chapterTitle, sectionTitle, targetYear, sectionIndex }) {
  const safeRaw = stripTechnicalLlmFallbackText(rawText);
  const intro = safeRaw
    ? `먼저 떠오른 흐름은 이렇습니다. ${safeRaw}`
    : `${sectionTitle}의 문이 조용히 열리며 ${targetYear}년의 기운이 원국 위에 내려앉습니다.`;
  const monthA = ((Number(sectionIndex || 0) + 1) % 12) + 1;
  const monthB = ((Number(sectionIndex || 0) + 5) % 12) + 1;
  return joinFallbackParagraphs([
    `${intro} 이 흐름은 ${chapterTitle} 안에서도 특히 ${sectionTitle}의 결을 선명하게 비춥니다. 총운과 대운의 바탕 위에 세운이 얹히며, 오행의 균형은 급한 결정보다 차분한 정리와 선택을 먼저 권합니다.`,
    `${targetYear}년에는 원국이 품은 익숙한 기질과 바깥에서 들어오는 월운의 자극이 번갈아 강해집니다. 십성의 움직임은 사람, 일, 돈, 마음의 자리가 따로 움직이지 않고 서로를 밀어 올리는 모양입니다. 그래서 ${sectionTitle}에서는 한 번의 큰 변화보다 여러 번의 작은 조정이 더 깊은 힘을 냅니다.`,
    `${monthA}월 무렵에는 이미 알고 있던 문제를 다른 시선으로 보게 되고, ${monthB}월 무렵에는 미뤄 둔 선택을 현실의 언어로 꺼내야 할 수 있습니다. 이때 중요한 것은 운이 좋고 나쁨을 단정하는 일이 아니라, 어느 자리에서 힘을 아끼고 어느 자리에서 마음을 열어야 하는지 알아차리는 일입니다.`,
    `${sectionTitle}의 운은 겉으로 드러나는 성취보다 내면의 방향 전환을 먼저 가리킵니다. 말과 행동의 속도를 조금 늦추면 관계의 균열이 작아지고, 몸의 리듬을 살피면 기회가 들어오는 때를 더 분명히 느낄 수 있습니다. 재물과 일의 흐름도 결국 생활의 질서가 받쳐 줄 때 안정됩니다.`,
    `조언을 드리자면, ${targetYear}년에는 새로운 길을 억지로 밀어붙이기보다 이미 손에 들어온 단서를 정갈하게 다듬는 편이 좋습니다. ${sectionTitle}의 자리에서는 기록, 약속, 건강한 거리감, 반복 가능한 루틴이 복을 담는 그릇이 됩니다. 마음이 흔들릴수록 기준을 낮추지 말고, 작은 약속을 지키는 쪽으로 운을 세우십시오.`,
  ]);
}

function buildSajuNewYearLlmTextFallbackChapter({ rawText, chapter, targetYear, provider, modelName, tokensUsed, cost }) {
  const title = clean(chapter?.title, 300).replace(/\{YEAR\}/g, String(targetYear));
  const categories = (Array.isArray(chapter?.categories) ? chapter.categories : [])
    .map((category) => clean(category, 300).replace(/\{YEAR\}/g, String(targetYear)))
    .filter(Boolean);
  const sections = categories.map((sectionTitle, sectionIndex) => {
    const body = buildTextFallbackSectionBody({
      rawText,
      chapterTitle: title,
      sectionTitle,
      targetYear,
      sectionIndex,
    });
    return {
      title: sectionTitle,
      body,
      finalText: body,
      text: body,
      sajuEvidence: ["원국과 세운의 흐름", "월운과 오행의 균형"],
      keyPoints: [`${sectionTitle}의 기준을 차분히 세웁니다.`],
      actionGuide: ["작은 약속과 생활 리듬을 먼저 정돈합니다."],
      checklist: ["말, 돈, 몸의 속도를 한 번 더 살핍니다."],
      caution: ["급한 단정과 과한 확장은 피합니다."],
    };
  });
  return {
    no: Number(chapter?.no || 0),
    id: String(chapter?.no || chapter?.id || ""),
    title,
    focus: `${title}의 첫 흐름`,
    sections,
    categories: sections.map((section) => ({
      title: section.title,
      finalText: section.body,
      text: section.body,
    })),
    text: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
    source: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
    metadata: {
      source: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
      schemaVersion: SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
      provider: clean(provider || "workers-ai"),
      modelName: clean(modelName),
      tokensUsed: Number(tokensUsed || 0),
      cost: Number(cost || 0),
      isMock: false,
      providerReason: "real_llm_text_fallback",
    },
  };
}

async function generateChapter({ env, input, chapter, expectedChapters, normalizedInputHash, modelName, providerModelKey, jobId, userId, realLlmCallsUsed, onProgress }) {
  const providerPlan = resolveSajuNewYearChapterProviderPlan({
    chapterId: chapter.id,
    chapterOrder: chapter.no,
    realLlmCallsUsed,
  }, env);
  const cacheKey = buildSajuNewYearLlmChapterCacheKey({ normalizedInputHash, chapterNo: chapter.no, modelName: providerModelKey || modelName });
  const cached = await readChapterCache(env, cacheKey);
  if (cached?.chapter) {
    const cachedValidation = parseAndValidateSajuNewYearChapterJson(cached.rawJson || cached.chapter, {
      chapter,
      targetYear: input.targetYear,
      allowMock: cached.isMock === true,
    });
    const cacheValid = cachedValidation.ok
      && clean(cached.promptVersion) === SAJU_NEW_YEAR_LLM_PROMPT_VERSION
      && clean(cached.schemaVersion) === SAJU_NEW_YEAR_LLM_SCHEMA_VERSION
      && clean(cached.qualityVersion) === SAJU_NEW_YEAR_LLM_QUALITY_VERSION;
    if (cacheValid && !(providerPlan.allowActual === true && cached.isMock === true)) {
      return {
        ok: true,
        chapter: cachedValidation.chapter,
        monthlyFortunes: cachedValidation.monthlyFortunes,
        finalAdvice: cachedValidation.finalAdvice,
        provider: cached.provider || "cache",
        modelName: clean(cached.modelName || providerModelKey || modelName),
        tokensUsed: Number(cached.tokensUsed || 0),
        cost: Number(cached.cost || 0),
        isMock: cached.isMock === true,
        providerReason: clean(cached.providerReason || "llm-cache"),
        source: "llm-cache",
        attempts: [],
      };
    }
  }

  const providers = resolveSajuNewYearLlmProviders(env);
  const repairLimit = Math.max(0, Number(env?.SAJU_NEW_YEAR_LLM_REPAIR_LIMIT ?? 2));
  const attempts = [];
  const summary = chapterPlanSummary(expectedChapters);
  let actualCallAttempted = false;

  if (typeof onProgress === "function") onProgress({ stage: "saju-new-year-llm", chapter });

  for (const provider of providers) {
    let prompt = buildSajuNewYearChapterPrompt({ input, chapter, chapterPlanSummary: summary });
    let previousJsonText = "";
    for (let retry = 0; retry <= repairLimit; retry += 1) {
      const attemptPlan = providerPlan.allowActual === true && actualCallAttempted === true
        ? { ...providerPlan, allowActual: false, provider: "mock", isMock: true, reason: "max_calls_exceeded" }
        : providerPlan;
      const effectiveProvider = attemptPlan.allowActual === true ? provider : "mock";
      const started = Date.now();
      logSajuNewYearLlmEvent("CHAPTER_GENERATION_STARTED", {
        jobId,
        userId,
        chapterNo: chapter.no,
        provider: effectiveProvider,
        retry,
        providerReason: attemptPlan.reason,
        promptVersion: SAJU_NEW_YEAR_LLM_PROMPT_VERSION,
      });
      if (attemptPlan.allowActual === true) actualCallAttempted = true;
      const result = await generateSajuNewYearTextWithLlm({
        provider: effectiveProvider,
        jobId,
        systemPrompt: sajuNewYearSystemPrompt,
        userPrompt: prompt,
        temperature: 0.62,
        maxTokens: Number(env?.SAJU_NEW_YEAR_CHAPTER_MAX_TOKENS || 24000),
        requestId: `${jobId}:saju-new-year:${chapter.no}:${retry}`,
        context: {
          chapter,
          targetYear: input.targetYear,
          schemaVersion: SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
          totalChapters: expectedChapters.length,
          provider: effectiveProvider,
          allowActual: attemptPlan.allowActual,
          providerReason: attemptPlan.reason,
        },
      }, env);
      const attempt = {
        provider: effectiveProvider,
        retry,
        ok: Boolean(result.ok),
        modelName: clean(result.model),
        tokensUsed: Number(result.tokensUsed || 0),
        cost: Number(result.cost || 0),
        isMock: result.isMock === true,
        allowActual: attemptPlan.allowActual === true,
        providerReason: attemptPlan.reason,
        errorCode: clean(result.errorCode),
        status: result.status || null,
        durationMs: Number(result.latencyMs || Date.now() - started),
      };
      attempts.push(attempt);
      if (!result.ok) {
        attempt.providerReason = clean(result.providerReason || result.errorCode || attemptPlan.reason);
        if (retry >= repairLimit || !isRetryableProviderFailure(result)) break;
        continue;
      }

      previousJsonText = String(result.text || "").trim();
      const validation = parseAndValidateSajuNewYearChapterJson(previousJsonText, {
        chapter,
        targetYear: input.targetYear,
        allowMock: result.isMock === true,
      });
      if (validation.ok) {
        const actualProvider = clean(result.provider || provider);
        const actualModelName = clean(result.model || modelName);
        const providerReason = result.isMock === true
          ? attemptPlan.reason
          : clean(result.providerReason || "real_llm_success");
        await writeChapterCache(env, cacheKey, {
          rawJson: validation.parsed,
          chapter: validation.chapter,
          monthlyFortunes: validation.monthlyFortunes,
          finalAdvice: validation.finalAdvice,
          provider: actualProvider,
          modelName: actualModelName,
          tokensUsed: Number(result.tokensUsed || 0),
          cost: Number(result.cost || 0),
          isMock: result.isMock === true,
          providerReason,
          promptVersion: SAJU_NEW_YEAR_LLM_PROMPT_VERSION,
          schemaVersion: SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
          qualityVersion: SAJU_NEW_YEAR_LLM_QUALITY_VERSION,
          storedAt: new Date().toISOString(),
        });
        logSajuNewYearLlmEvent("CHAPTER_GENERATION_COMPLETED", {
          jobId,
          userId,
          chapterNo: chapter.no,
          provider: actualProvider,
          modelName: actualModelName,
        });
        return {
          ok: true,
          chapter: validation.chapter,
          monthlyFortunes: validation.monthlyFortunes,
          finalAdvice: validation.finalAdvice,
          provider: actualProvider,
          modelName: actualModelName,
          tokensUsed: Number(result.tokensUsed || 0),
          cost: Number(result.cost || 0),
          isMock: result.isMock === true,
          providerReason,
          actualCallAttempted,
          source: "llm",
          attempts,
        };
      }

      if (attemptPlan.allowActual === true && result.isMock !== true && previousJsonText) {
        const actualProvider = clean(result.provider || provider || "workers-ai");
        const actualModelName = clean(result.model || modelName);
        const textFallbackChapter = buildSajuNewYearLlmTextFallbackChapter({
          rawText: previousJsonText,
          chapter,
          targetYear: input.targetYear,
          provider: actualProvider,
          modelName: actualModelName,
          tokensUsed: Number(result.tokensUsed || 0),
          cost: Number(result.cost || 0),
        });
        attempt.ok = true;
        attempt.providerReason = "real_llm_text_fallback";
        attempt.validationIssues = validation.issues.slice(0, 12);
        logSajuNewYearLlmEvent("CHAPTER_TEXT_FALLBACK_USED", {
          jobId,
          userId,
          chapterNo: chapter.no,
          provider: actualProvider,
          modelName: actualModelName,
          providerReason: "real_llm_text_fallback",
          issues: validation.issues.slice(0, 12),
        });
        return {
          ok: true,
          chapter: textFallbackChapter,
          monthlyFortunes: [],
          finalAdvice: null,
          provider: actualProvider,
          modelName: actualModelName,
          tokensUsed: Number(result.tokensUsed || 0),
          cost: Number(result.cost || 0),
          isMock: false,
          providerReason: "real_llm_text_fallback",
          actualCallAttempted,
          source: "llm-text-fallback",
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
        provider: effectiveProvider,
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
    actualCallAttempted,
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
  const providerModelKey = resolveSajuNewYearProviderModelKey(env);
  const chapters = [];
  const attempts = [];
  const providerSet = new Set();
  const modelSet = new Set();
  let tokensUsed = 0;
  let cost = 0;
  let mockChapterCount = 0;
  let actualChapterCount = 0;
  let actualCallAttemptCount = 0;
  let realLlmCallsUsed = 0;
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
      providerModelKey,
      jobId,
      userId,
      realLlmCallsUsed,
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
    if (clean(result.modelName)) modelSet.add(clean(result.modelName));
    tokensUsed += Number(result.tokensUsed || 0);
    cost += Number(result.cost || 0);
    if (result.actualCallAttempted === true) actualCallAttemptCount += 1;
    if (result.isMock === true) mockChapterCount += 1;
    else {
      actualChapterCount += 1;
    }
    if (result.actualCallAttempted === true || result.isMock !== true) realLlmCallsUsed += 1;
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

  const isMock = actualChapterCount === 0;
  const provider = providerSet.size === 1
    ? [...providerSet][0]
    : providerSet.has("workers-ai") && providerSet.has("mock")
      ? "workers-ai-mock"
      : providerSet.has("gemini") && providerSet.has("mock")
        ? "gemini-mock"
        : providerSet.has("gemini") && providerSet.has("workers-ai")
          ? "gemini-workers-ai"
          : [...providerSet].filter(Boolean).join("-") || "mock";
  const actualModelName = modelSet.size === 1
    ? [...modelSet][0]
    : [...modelSet].filter(Boolean).join(",") || modelName;
  const llmAssembly = {
    enabled: true,
    source: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
    provider,
    modelName: actualModelName,
    tokensUsed,
    cost,
    isMock,
    engineVersion: SAJU_NEW_YEAR_LLM_ENGINE_VERSION,
    qualityVersion: SAJU_NEW_YEAR_LLM_QUALITY_VERSION,
    promptVersion: SAJU_NEW_YEAR_LLM_PROMPT_VERSION,
    schemaVersion: SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
    chapterCount: chapters.length,
    expectedChapterCount: expectedChapters.length,
    actualChapterCount,
    mockChapterCount,
    actualCallAttemptCount,
    externalGeneration: true,
    externalCallsAllowed: actualCallAttemptCount > 0,
    fallbackUsed: false,
  };
  const clientSummary = buildClientSummaryFromLlm({ input, chapters, monthlyFortunes, finalAdvice, validation });

  logSajuNewYearLlmEvent("ALL_CHAPTERS_COMPLETED", {
    jobId,
    userId,
    status: "completed",
    provider,
    modelName: actualModelName,
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
    modelName: actualModelName,
    tokensUsed,
    cost,
    isMock,
    actualChapterCount,
    mockChapterCount,
    actualCallAttemptCount,
    llmAssembly,
    llmAssemblyOnly: true,
    externalCallsAllowed: actualCallAttemptCount > 0,
    fallbackUsed: false,
    manuscriptSource: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
    generationMode: SAJU_NEW_YEAR_LLM_GENERATION_MODE,
    promptVersion: SAJU_NEW_YEAR_LLM_PROMPT_VERSION,
    schemaVersion: SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
    qualityVersion: SAJU_NEW_YEAR_LLM_QUALITY_VERSION,
    engineVersion: SAJU_NEW_YEAR_LLM_ENGINE_VERSION,
    cacheDigest: hashStable({ normalizedInputHash, providerModelKey, promptVersion: SAJU_NEW_YEAR_LLM_PROMPT_VERSION, schemaVersion: SAJU_NEW_YEAR_LLM_SCHEMA_VERSION }),
  };
}
