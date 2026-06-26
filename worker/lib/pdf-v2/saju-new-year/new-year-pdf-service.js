import {
  SAJU_NEW_YEAR_LLM_GENERATION_MODE,
  SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
  clean,
  hashStable,
} from "./saju-new-year-premium.types.js";
import { NEW_YEAR_HTML_SCHEMA_VERSION, NEW_YEAR_LLM_VERSION, normalizeChapterPlan } from "./new-year-chapters.js";
import { assembleFinalNewYearHtml } from "./new-year-html-renderer.js";
import { generateChaptersWithLLM } from "./new-year-llm-engine.js";
import {
  NewYearPdfGenerationError,
  validateFinalNewYearPdfPayload,
  validateNewYearChapterPlan,
  validateNewYearInput,
} from "./new-year-validator.js";

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function buildSajuChart(seed = {}, normalizedData = {}) {
  const saju = safeObject(seed.saju);
  const natal = safeObject(normalizedData.natal);
  return {
    yearPillar: saju.pillars?.year || natal.pillars?.year,
    monthPillar: saju.pillars?.month || natal.pillars?.month,
    dayPillar: saju.pillars?.day || natal.pillars?.day,
    hourPillar: saju.pillars?.hour || natal.pillars?.hour,
    tenGods: saju.tenGods || natal.tenGods,
    hiddenStems: saju.hiddenStems || natal.hiddenStems,
    twelveStages: saju.twelveStages || seed.twelveGrowthStages,
    fiveElements: saju.fiveElements || natal.fiveElements,
    combinations: saju.relations?.combinations || natal.combinations,
    clashes: saju.relations?.clashes || natal.clashes,
    usefulGod: saju.usefulGod || natal.usefulGods,
    structure: seed.structure || natal.structure,
  };
}

export function buildNewYearPdfInputFromNormalized(normalized = {}, metadata = {}) {
  const seed = safeObject(normalized.seed);
  const profile = safeObject(seed.birthProfile || normalized.profile);
  const normalizedData = safeObject(normalized.normalizedData);
  const birthTime = clean(profile.birthTime || normalized.profile?.birth?.birthTime || seed.input?.birthTime);
  return {
    service: "new-year",
    userName: clean(profile.name || seed.input?.name || metadata.userName),
    gender: clean(profile.gender || seed.input?.gender),
    birthDate: clean(profile.birthDate || seed.input?.birthDate),
    birthTime,
    calendarType: clean(profile.calendarType || seed.input?.calendarType || "solar"),
    targetYear: Number(normalized.targetYear || seed.targetYear || metadata.targetYear || 0),
    question: clean(metadata.question || ""),
    sajuChart: buildSajuChart(seed, normalizedData),
    luckCycles: seed.saju?.luckCycle || normalized.yearlyCalculation || normalizedData.annual?.currentDaewoon || null,
    annualLuck: seed.saju?.annualLuck || normalized.yearlyCalculation || normalizedData.annual || null,
    monthlyLuck: Array.isArray(seed.saju?.monthlyLuck) ? seed.saju.monthlyLuck : (Array.isArray(normalized.monthlyCalculation) ? normalized.monthlyCalculation : []),
    categories: normalized.expectedChapters || seed.chapterSpecs || null,
    calculationContext: {
      masterJson: normalized.masterJson,
      normalizedData,
      monthlyFortuneSections: normalized.monthlyFortuneSections,
    },
  };
}

function filename(targetYear, rawName = "user") {
  const safeName = clean(rawName || "user").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "-").toLowerCase() || "user";
  return `saju-new-year-${Number(targetYear || 0) || "report"}-${safeName}.pdf`;
}

function buildClientSummary({ input, chapters, monthlyLuck }) {
  const months = Array.isArray(monthlyLuck) ? monthlyLuck : [];
  const score = (item) => Number(item.finalScore ?? item.score ?? 0);
  const opportunities = months.slice().sort((a, b) => score(b) - score(a)).slice(0, 3);
  const cautions = months.slice().sort((a, b) => score(a) - score(b)).slice(0, 3);
  return {
    cards: [
      { label: "대상 연도", value: `${input.targetYear}년` },
      { label: "챕터", value: `${chapters.length}챕터 상담문` },
      { label: "세운", value: clean(input.annualLuck?.label || input.annualLuck?.yearGanji || "계산값 기준") },
      { label: "월운", value: `${months.length}개월 흐름` },
    ],
    opportunities,
    cautions,
    consultation: chapters.slice(0, 3).map((chapter) => clean(chapter.categories?.[0]?.text || chapter.text, 240)).filter(Boolean),
    quality: { status: "passed", pdfReady: true },
  };
}

function resolveChapterConfig(normalized = {}, input = {}) {
  const preservedVersion = clean(normalized.chapterConfigVersion);
  const preservedSource = clean(normalized.chapterConfigSource);
  if (preservedVersion && Array.isArray(normalized.expectedChapters) && normalized.expectedChapters.length) {
    return {
      source: preservedSource || "existing-config",
      chapterConfigVersion: preservedVersion,
      chapters: normalized.expectedChapters,
      expectedChapterCount: normalized.expectedChapters.length,
    };
  }
  return normalizeChapterPlan(normalized.expectedChapters || input.categories || [], { targetYear: input.targetYear });
}

export async function generateNewYearPdfWithLlm(params = {}) {
  const env = params.env || {};
  const normalized = params.normalized || {};
  const input = buildNewYearPdfInputFromNormalized(normalized, params.metadata || {});
  const inputValidation = validateNewYearInput(input);
  if (!inputValidation.ok) {
    throw new NewYearPdfGenerationError("신년운세 PDF 입력값을 확인해 주세요.", {
      code: "INVALID_INPUT",
      status: 422,
      stage: "validating",
      errors: inputValidation.errors,
    });
  }
  if (typeof params.onProgress === "function") await params.onProgress({ status: "validating", progress: 5 });

  const chapterConfig = resolveChapterConfig(normalized, input);
  const planValidation = validateNewYearChapterPlan(chapterConfig);
  if (!planValidation.ok) {
    throw new NewYearPdfGenerationError("신년운세 챕터 구성을 확인하지 못했습니다.", {
      code: "GENERATION_FAILED",
      status: 422,
      stage: "validating",
      errors: planValidation.errors,
    });
  }

  const generated = await generateChaptersWithLLM({
    env,
    input,
    chapterPlan: chapterConfig.chapters,
    chapterConfigVersion: chapterConfig.chapterConfigVersion,
    jobId: clean(params.jobId || params.reportId || `new-year-${Date.now().toString(36)}`),
    onProgress: params.onProgress,
  });

  if (typeof params.onProgress === "function") await params.onProgress({ status: "rendering", progress: 88 });
  const html = assembleFinalNewYearHtml({
    input,
    chapterPlan: chapterConfig.chapters,
    chapterHtmlFragments: generated.chapterHtmlFragments,
  });
  const pdfReady = {
    title: `${input.targetYear}년 신년운세`,
    filename: filename(input.targetYear, input.userName),
    htmlFilename: filename(input.targetYear, input.userName).replace(/\.pdf$/i, ".html"),
    generatedAt: new Date().toISOString(),
    targetYear: input.targetYear,
    html,
    chapters: generated.chapters,
    metadata: {
      ...(params.metadata || {}),
      version: NEW_YEAR_LLM_VERSION,
      engineVersion: NEW_YEAR_LLM_VERSION,
      manuscriptSource: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
      generationMode: SAJU_NEW_YEAR_LLM_GENERATION_MODE,
      promptVersion: NEW_YEAR_LLM_VERSION,
      schemaVersion: NEW_YEAR_HTML_SCHEMA_VERSION,
      qualityVersion: NEW_YEAR_LLM_VERSION,
      qualityStatus: "passed",
      llmAssemblyOnly: true,
      chapterPlan: chapterConfig.chapters,
      chapterConfigVersion: chapterConfig.chapterConfigVersion,
    },
  };
  const completionValidation = validateFinalNewYearPdfPayload({
    html,
    chapters: generated.chapters,
    chapterPlan: chapterConfig.chapters,
    targetYear: input.targetYear,
  });
  if (!completionValidation.ok) {
    throw new NewYearPdfGenerationError("신년운세 PDF 렌더링 검증에 실패했습니다.", {
      code: "PDF_RENDER_FAILED",
      status: 422,
      stage: "rendering",
      errors: completionValidation.errors,
    });
  }
  if (typeof params.onProgress === "function") await params.onProgress({ status: "rendering", progress: 95 });

  const llmAssembly = {
    enabled: true,
    source: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
    version: NEW_YEAR_LLM_VERSION,
    provider: generated.provider,
    modelName: generated.modelName,
    engineVersion: NEW_YEAR_LLM_VERSION,
    qualityVersion: NEW_YEAR_LLM_VERSION,
    promptVersion: NEW_YEAR_LLM_VERSION,
    schemaVersion: NEW_YEAR_HTML_SCHEMA_VERSION,
    chapterCount: generated.chapters.length,
    expectedChapterCount: chapterConfig.expectedChapterCount,
    externalGeneration: true,
    externalCallsAllowed: true,
    fallbackUsed: false,
  };

  return {
    status: "completed",
    chapters: generated.chapters,
    chapterHtmlFragments: generated.chapterHtmlFragments,
    chapterPlan: chapterConfig.chapters,
    chapterConfigVersion: chapterConfig.chapterConfigVersion,
    chapterConfigSource: chapterConfig.source,
    chapterCount: generated.chapters.length,
    expectedChapterCount: chapterConfig.expectedChapterCount,
    localYearSajuJson: normalized.seed,
    newYearMasterJson: normalized.masterJson,
    masterJson: normalized.masterJson,
    masterJsonValidation: normalized.masterJsonValidation,
    normalizedData: normalized.normalizedData,
    monthlyFortuneSections: normalized.monthlyFortuneSections,
    monthlyFortunes: input.monthlyLuck,
    finalAdvice: {
      title: "올해의 종합 실천 처방",
      body: "세운이 여는 큰 방향을 월운의 속도로 나누어 쓰면 올해의 선택이 한결 선명해집니다.",
    },
    clientSummary: buildClientSummary({ input, chapters: generated.chapters, monthlyLuck: input.monthlyLuck }),
    validation: completionValidation,
    normalizedInput: input,
    normalizedInputHash: hashStable(input),
    provider: generated.provider,
    modelName: generated.modelName,
    llmAssembly,
    llmAssemblyOnly: true,
    externalCallsAllowed: true,
    fallbackUsed: false,
    manuscriptSource: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
    generationMode: SAJU_NEW_YEAR_LLM_GENERATION_MODE,
    promptVersion: NEW_YEAR_LLM_VERSION,
    schemaVersion: NEW_YEAR_HTML_SCHEMA_VERSION,
    qualityVersion: NEW_YEAR_LLM_VERSION,
    engineVersion: NEW_YEAR_LLM_VERSION,
    pdfReady,
    pdfCompletionValidation: completionValidation,
  };
}
