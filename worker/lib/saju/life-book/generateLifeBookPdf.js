import {
  LIFE_BOOK_CHAPTERS,
  LIFE_BOOK_MIN_TOTAL_CHARS,
  LIFE_BOOK_TOTAL_CHAPTERS,
  getLifeBookChapterByNumber,
} from "./chapterConfig.js";
import { buildLifeBookInputData } from "./buildLifeBookInputData.js";
import { generateLifeBookChapter } from "./generateLifeBookChapter.js";
import { renderLifeBookPdf } from "./renderLifeBookPdf.js";

const LIFEBOOK_FORBIDDEN_TEXTS = [
  "자동 복구 생성",
  "Chapter 1",
  "데이터가 부족합니다",
  "품질 검증 실패",
  "API 실패",
];

function logLifeBookStage(stage, detail = {}) {
  try {
    console.info(`[LifeBook] ${stage}`, detail);
  } catch {
    // no-op
  }
}

function isStrictMissingCore(lifeBookInputData) {
  const missingCore = Array.isArray(lifeBookInputData?.dataQuality?.missingCore)
    ? lifeBookInputData.dataQuality.missingCore
    : [];
  return {
    ok: missingCore.length === 0,
    missingCore,
  };
}

function countChars(text) {
  return [...String(text || "")].length;
}

function validateChapterLength(chapterText, targetChars) {
  const length = countChars(chapterText);
  const target = Number(targetChars || 0);
  return {
    length,
    ok: target > 0 ? length >= Math.floor(target * 0.85) : length > 0,
  };
}

function validateFullReport(fullText) {
  const length = countChars(fullText);
  return {
    length,
    ok: length >= LIFE_BOOK_MIN_TOTAL_CHARS,
  };
}

function getLifeBookTargetTotalChars(chapters) {
  return (Array.isArray(chapters) ? chapters : []).reduce(
    (sum, chapter) => sum + Number(chapter?.targetChars || 0),
    0,
  );
}

function validateLifeBookPdfPayload(payload = {}) {
  const missing = [];
  if (!payload || typeof payload !== "object") missing.push("payload");
  const userProfile = payload?.userProfile || {};
  const sajuChart = payload?.sajuChart || {};
  const fiveElements = payload?.fiveElements || {};
  const tenGods = payload?.tenGods || {};
  if (!String(userProfile?.name || "").trim()) missing.push("userProfile.name");
  if (!String(userProfile?.birthDate || "").trim()) missing.push("userProfile.birthDate");
  if (!String(userProfile?.gender || "").trim()) missing.push("userProfile.gender");
  if (!String(userProfile?.calendarType || "").trim()) missing.push("userProfile.calendarType");
  if (!String(sajuChart?.yearPillar || "").trim()) missing.push("sajuChart.yearPillar");
  if (!String(sajuChart?.monthPillar || "").trim()) missing.push("sajuChart.monthPillar");
  if (!String(sajuChart?.dayPillar || "").trim()) missing.push("sajuChart.dayPillar");
  if (!String(sajuChart?.dayMaster || "").trim()) missing.push("sajuChart.dayMaster");
  if (!String(sajuChart?.monthBranch || "").trim()) missing.push("sajuChart.monthBranch");
  const hasFiveElements = Object.values(fiveElements || {}).some((v) => Number(v) > 0);
  const hasTenGods = Object.keys(tenGods?.distribution || {}).length > 0;
  if (!hasFiveElements && !hasTenGods) missing.push("fiveElements|tenGods");
  if (!Array.isArray(LIFE_BOOK_CHAPTERS) || LIFE_BOOK_CHAPTERS.length === 0) missing.push("chapterSchema");
  return {
    ok: missing.length === 0,
    missing,
  };
}

function hasForbiddenLifeBookText(text) {
  const source = String(text || "");
  return LIFEBOOK_FORBIDDEN_TEXTS.some((token) => source.includes(token));
}

function validateLifeBookGeneratedReport({ chapters = [], chapterSchema = LIFE_BOOK_CHAPTERS } = {}) {
  const reasons = [];
  const invalidChapters = [];
  const normalizedChapters = Array.isArray(chapters) ? chapters : [];
  const schema = Array.isArray(chapterSchema) ? chapterSchema : [];

  if (!normalizedChapters.length) reasons.push("EMPTY_CHAPTERS");
  if (schema.length !== normalizedChapters.length) reasons.push("CHAPTER_COUNT_MISMATCH");

  const seenBodies = new Set();
  for (let i = 0; i < normalizedChapters.length; i += 1) {
    const chapter = normalizedChapters[i] || {};
    const config = schema[i] || {};
    const chapterId = String(chapter.id || config.id || `chapter-${String(i + 1).padStart(2, "0")}`);
    const title = String(chapter.title || "").trim();
    const body = String(chapter.contentMarkdown || "").trim();
    const minLength = Number(config?.minLength || 2500);
    const chapterReasons = [];

    if (!title) chapterReasons.push("MISSING_TITLE");
    if (!body) chapterReasons.push("MISSING_BODY");
    if (body.length < minLength) chapterReasons.push("BODY_TOO_SHORT");
    if (hasForbiddenLifeBookText(`${title}\n${body}`)) chapterReasons.push("FORBIDDEN_TEXT");

    const chapterJson = chapter.chapterJson && typeof chapter.chapterJson === "object" ? chapter.chapterJson : {};
    const sections = Array.isArray(chapterJson.sections) ? chapterJson.sections : [];
    if (!sections.length) chapterReasons.push("MISSING_SECTIONS");
    sections.forEach((section) => {
      const st = String(section?.title || "").trim();
      const sb = String(section?.body || "").trim();
      if (!st || !sb || sb.length < 500) chapterReasons.push("SECTION_TOO_SHORT");
    });

    const bodyFp = body.replace(/\s+/g, " ").trim().toLowerCase();
    if (bodyFp && seenBodies.has(bodyFp)) chapterReasons.push("DUPLICATED_CHAPTER_BODY");
    if (bodyFp) seenBodies.add(bodyFp);

    if (chapterReasons.length) {
      invalidChapters.push(chapterId);
      reasons.push(`${chapterId}:${chapterReasons.join(",")}`);
    }
  }

  return {
    ok: reasons.length === 0,
    invalidChapters,
    reasons,
  };
}

async function repairInvalidLifeBookChaptersWithApiOrLocal({
  env,
  lifeBookInputData,
  chapters,
  chapterMemories,
  previousTexts,
  chapterSchema,
  invalidChapterIds,
  warnings,
}) {
  const repaired = Array.isArray(chapters) ? [...chapters] : [];
  const schema = Array.isArray(chapterSchema) ? chapterSchema : [];
  const invalidSet = new Set(Array.isArray(invalidChapterIds) ? invalidChapterIds : []);

  for (let i = 0; i < schema.length; i += 1) {
    const config = schema[i];
    const chapterId = String(config?.id || `chapter-${String(i + 1).padStart(2, "0")}`);
    if (!invalidSet.has(chapterId)) continue;

    logLifeBookStage("CHAPTER_REPAIR_API_RETRY_START", { chapterId });
    const retryGenerated = await generateLifeBookChapter({
      env,
      chapterConfig: config,
      lifeBookInputData,
      strictMode: false,
      maxRetries: 1,
      previousTexts: [
        ...(Array.isArray(previousTexts) ? previousTexts : []),
        ...repaired.filter((_, idx) => idx !== i).map((entry) => entry?.contentMarkdown || ""),
      ],
      chapterMemories: Array.isArray(chapterMemories) ? chapterMemories.filter((_, idx) => idx !== i) : [],
    });

    if (retryGenerated?.ok && retryGenerated?.chapterResult) {
      repaired[i] = retryGenerated.chapterResult;
      if (Array.isArray(chapterMemories)) chapterMemories[i] = buildChapterMemory(config, retryGenerated.chapterResult);
      logLifeBookStage("CHAPTER_REPAIR_API_RETRY_SUCCESS", { chapterId });
      continue;
    }

    logLifeBookStage("CHAPTER_REPAIR_LOCAL_FALLBACK_START", { chapterId });
    const localGenerated = await generateLifeBookChapter({
      env,
      chapterConfig: config,
      lifeBookInputData,
      strictMode: false,
      forceLocal: true,
      previousTexts: [
        ...(Array.isArray(previousTexts) ? previousTexts : []),
        ...repaired.filter((_, idx) => idx !== i).map((entry) => entry?.contentMarkdown || ""),
      ],
      chapterMemories: Array.isArray(chapterMemories) ? chapterMemories.filter((_, idx) => idx !== i) : [],
    });
    if (localGenerated?.ok && localGenerated?.chapterResult) {
      repaired[i] = localGenerated.chapterResult;
      if (Array.isArray(chapterMemories)) chapterMemories[i] = buildChapterMemory(config, localGenerated.chapterResult);
      if (Array.isArray(warnings)) {
        warnings.push({ chapterId, warning: "CHAPTER_REPAIRED_BY_LOCAL_FALLBACK" });
      }
      logLifeBookStage("CHAPTER_REPAIR_LOCAL_FALLBACK_SUCCESS", { chapterId });
    }
  }

  return repaired;
}

function normalizeUsedThemes(chapterConfig, chapterResult) {
  const source = String(chapterResult?.contentMarkdown || "");
  const sections = Array.isArray(chapterConfig?.sections) ? chapterConfig.sections : [];
  return sections.filter((section) => source.includes(String(section || "").trim()));
}

function buildChapterMemory(chapterConfig, chapterResult) {
  const practicalAdvice = Array.isArray(chapterResult?.practicalAdvice) ? chapterResult.practicalAdvice : [];
  return {
    chapterId: String(chapterConfig?.id || chapterResult?.id || ""),
    title: String(chapterResult?.title || chapterConfig?.title || "").trim(),
    summary: String(chapterResult?.summary || "").trim(),
    usedThemes: normalizeUsedThemes(chapterConfig, chapterResult),
    usedAdvice: practicalAdvice.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 5),
  };
}

function normalizeLifeBookPdfChapterJson(chapterResult = {}, chapterConfig = {}) {
  const chapterJson = chapterResult?.chapterJson && typeof chapterResult.chapterJson === "object"
    ? chapterResult.chapterJson
    : {};

  const summary = String(chapterJson.summary || chapterResult.summary || "").trim();
  const practicalAdvice = Array.isArray(chapterJson.practicalAdvice)
    ? chapterJson.practicalAdvice.map((item) => String(item || "").trim()).filter(Boolean)
    : (Array.isArray(chapterResult.practicalAdvice)
      ? chapterResult.practicalAdvice.map((item) => String(item || "").trim()).filter(Boolean)
      : []);
  const cautions = Array.isArray(chapterJson.cautions)
    ? chapterJson.cautions.map((item) => String(item || "").trim()).filter(Boolean)
    : (Array.isArray(chapterResult.warnings)
      ? chapterResult.warnings.map((item) => String(item || "").trim()).filter(Boolean)
      : []);
  const sections = Array.isArray(chapterJson.sections)
    ? chapterJson.sections.map((item) => ({
      title: String(item?.title || "").trim(),
      body: String(item?.body || "").trim(),
    })).filter((item) => item.title || item.body)
    : [];
  const keyInsights = Array.isArray(chapterJson.keyInsights)
    ? chapterJson.keyInsights.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  return {
    id: String(chapterResult.id || chapterConfig.id || "").trim(),
    roman: String(chapterResult.roman || chapterConfig.roman || "").trim(),
    title: String(chapterResult.title || chapterConfig.title || "").trim(),
    subtitle: String(chapterResult.subtitle || chapterConfig.subtitle || "").trim(),
    summary,
    sections,
    keyInsights,
    practicalAdvice,
    cautions,
    contentMarkdown: String(chapterResult.contentMarkdown || "").trim(),
  };
}

function buildLifeBookPdfData({ reportId, lifeBookInputData, chapters, generatedAt }) {
  const chapterRows = (Array.isArray(chapters) ? chapters : []).map((chapterResult, index) => {
    const chapterConfig = LIFE_BOOK_CHAPTERS[index] || {};
    const chapterJson = normalizeLifeBookPdfChapterJson(chapterResult, chapterConfig);
    return {
      chapter: index + 1,
      chapterId: chapterJson.id || `chapter-${String(index + 1).padStart(2, "0")}`,
      chapterJson,
      text: chapterJson.contentMarkdown,
    };
  });

  return {
    reportId,
    generatedAt,
    totalChapters: chapterRows.length,
    minTotalChars: LIFE_BOOK_MIN_TOTAL_CHARS,
    userProfile: lifeBookInputData?.userProfile || {},
    dataQuality: lifeBookInputData?.dataQuality || {},
    chapters: chapterRows,
  };
}

export async function generateLifeBookPdf(params = {}) {
  const env = params.env || {};
  const body = params.body || {};
  const normalizedInput = params.normalizedInput || {};
  const strictMode = params.strictMode === true;
  const requestedChapter = Number(params.requestedChapter || 0);
  const reportId = String(params.reportId || "").trim();
  const onProgress = typeof params.onProgress === "function" ? params.onProgress : null;
  const previousTexts = Array.isArray(params.previousTexts) ? params.previousTexts : [];
  const warnings = [];

  logLifeBookStage("REQUEST_START", { reportId });

  if (onProgress) onProgress({ code: "CALCULATING_SAJU", message: "사주 명식 계산 중" });

  logLifeBookStage("INPUT_NORMALIZE_START", { reportId });
  const lifeBookInputData = buildLifeBookInputData(body, normalizedInput);
  logLifeBookStage("INPUT_NORMALIZE_SUCCESS", { reportId });

  logLifeBookStage("PAYLOAD_NORMALIZE_START", { reportId });
  const payloadValidation = validateLifeBookPdfPayload(lifeBookInputData);
  if (!payloadValidation.ok) {
    return {
      ok: false,
      code: "LIFEBOOK_PAYLOAD_INVALID",
      message: "인생의 책 생성에 필요한 데이터가 부족합니다.",
      detail: { missingFields: payloadValidation.missing },
    };
  }
  logLifeBookStage("PAYLOAD_NORMALIZE_SUCCESS", { reportId });
  const strictCheck = isStrictMissingCore(lifeBookInputData);
  const missingRequired = Array.isArray(lifeBookInputData?.dataQuality?.missingRequired)
    ? lifeBookInputData.dataQuality.missingRequired
    : [];

  if (missingRequired.length > 0) {
    return {
      ok: false,
      code: "LIFEBOOK_REQUIRED_PROFILE_MISSING",
      message: "인생의 책 생성을 위해 필수 프로필 정보가 필요합니다.",
      detail: {
        missingFields: missingRequired,
      },
    };
  }

  if (strictMode && !strictCheck.ok) {
    warnings.push({
      chapterId: "input",
      warning: "STRICT_MISSING_CORE",
      validation: { missingCore: strictCheck.missingCore },
    });
  }

  if (onProgress) onProgress({ code: "NORMALIZING_INPUT", message: "인생의 책 데이터 정리 중" });

  const targetChapters = requestedChapter >= 1
    ? [getLifeBookChapterByNumber(requestedChapter)]
    : [...LIFE_BOOK_CHAPTERS];

  const chapters = [];
  const chapterMemories = [];

  for (let index = 0; index < targetChapters.length; index += 1) {
    const chapterConfig = targetChapters[index];
    if (onProgress) {
      onProgress({
        code: "GENERATING_CHAPTER",
        chapter: chapterConfig,
        message: `${chapterConfig.roman} 챕터 생성 중`,
      });
    }

    logLifeBookStage("API_GENERATION_START", { chapterId: chapterConfig.id });
    const generated = await generateLifeBookChapter({
      env,
      chapterConfig,
      lifeBookInputData,
      strictMode,
      maxRetries: 2,
      previousTexts: [
        ...previousTexts,
        ...chapters.map((c) => c.contentMarkdown || ""),
      ],
      chapterMemories,
    });

    if (!generated?.ok) {
      logLifeBookStage("API_GENERATION_FAILED_USE_LOCAL_FALLBACK", {
        chapterId: chapterConfig.id,
        code: generated?.code,
      });
      const localOnly = await generateLifeBookChapter({
        env,
        chapterConfig,
        lifeBookInputData,
        strictMode: false,
        forceLocal: true,
        previousTexts: [
          ...previousTexts,
          ...chapters.map((c) => c.contentMarkdown || ""),
        ],
        chapterMemories,
      });
      if (!localOnly?.ok) {
        return {
          ok: false,
          code: localOnly?.code || generated?.code || "LIFEBOOK_CHAPTER_GENERATION_FAILED",
          message: localOnly?.message || generated?.message || `챕터 생성 실패: ${chapterConfig.id}`,
          detail: localOnly?.validation || generated?.validation || null,
        };
      }
      chapters.push(localOnly.chapterResult);
      chapterMemories.push(buildChapterMemory(chapterConfig, localOnly.chapterResult));
      warnings.push({ chapterId: chapterConfig.id, warning: "CHAPTER_LOCAL_FALLBACK_USED" });
      continue;
    }

    logLifeBookStage("API_GENERATION_SUCCESS", { chapterId: chapterConfig.id });

    chapters.push(generated.chapterResult);
    chapterMemories.push(buildChapterMemory(chapterConfig, generated.chapterResult));

    const chapterLength = validateChapterLength(generated.chapterResult?.contentMarkdown || "", chapterConfig?.targetChars);
    if (!chapterLength.ok) {
      warnings.push({
        chapterId: chapterConfig.id,
        warning: "CHAPTER_LENGTH_BELOW_85_PERCENT",
        validation: {
          length: chapterLength.length,
          targetChars: Number(chapterConfig?.targetChars || 0),
          minRecommendedChars: Math.floor(Number(chapterConfig?.targetChars || 0) * 0.85),
        },
      });
    }

  }

  if (requestedChapter >= 1) {
    const singleSource = warnings.some((w) => String(w?.warning || "").includes("LOCAL")) ? "local" : "api";
    return {
      ok: true,
      source: singleSource,
      mode: "life-book",
      reportId,
      totalChapters: LIFE_BOOK_TOTAL_CHAPTERS,
      lifeBookInputData,
      chapters,
      chapterMemories,
      warnings,
    };
  }

  let fullText = chapters.map((chapter) => String(chapter?.contentMarkdown || "").trim()).filter(Boolean).join("\n\n");
  let fullValidation = validateFullReport(fullText);

  logLifeBookStage("CHAPTER_QUALITY_CHECK_START", { reportId });
  let reportValidation = validateLifeBookGeneratedReport({
    chapters,
    chapterSchema: targetChapters,
  });
  if (!reportValidation.ok) {
    logLifeBookStage("CHAPTER_QUALITY_CHECK_FAILED", {
      reportId,
      invalidChapters: reportValidation.invalidChapters,
    });
    const repaired = await repairInvalidLifeBookChaptersWithApiOrLocal({
      env,
      lifeBookInputData,
      chapters,
      chapterMemories,
      previousTexts,
      chapterSchema: targetChapters,
      invalidChapterIds: reportValidation.invalidChapters,
      warnings,
    });
    chapters.length = 0;
    chapters.push(...repaired);
    reportValidation = validateLifeBookGeneratedReport({
      chapters,
      chapterSchema: targetChapters,
    });
    if (!reportValidation.ok) {
      return {
        ok: false,
        code: "LIFEBOOK_REPORT_VALIDATION_FAILED",
        message: "리포트 품질 검증을 통과하지 못했습니다.",
        detail: reportValidation,
      };
    }
  }

  if (!fullValidation.ok && chapters.length > 0) {
    const byNeed = chapters
      .map((chapter, index) => {
        const config = targetChapters[index] || {};
        const target = Number(config?.targetChars || 0);
        const length = countChars(chapter?.contentMarkdown || "");
        return {
          index,
          score: target > 0 ? target - length : 0,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    for (const row of byNeed) {
      if (fullValidation.ok) break;
      const chapterConfig = targetChapters[row.index];
      if (!chapterConfig) continue;

      const regenerated = await generateLifeBookChapter({
        env,
        chapterConfig,
        lifeBookInputData,
        strictMode: false,
        maxRetries: 1,
        previousTexts: [
          ...previousTexts,
          ...chapters
            .filter((_, index) => index !== row.index)
            .map((entry) => entry?.contentMarkdown || ""),
        ],
        chapterMemories: chapterMemories.filter((_, index) => index !== row.index),
      });

      if (regenerated?.ok && regenerated?.chapterResult) {
        chapters[row.index] = regenerated.chapterResult;
        chapterMemories[row.index] = buildChapterMemory(chapterConfig, regenerated.chapterResult);
      }

      fullText = chapters.map((chapter) => String(chapter?.contentMarkdown || "").trim()).filter(Boolean).join("\n\n");
      fullValidation = validateFullReport(fullText);
    }
  }

  warnings.push({
    chapterId: "full-report",
    warning: fullValidation.ok ? "FULL_REPORT_LENGTH_OK" : "FULL_REPORT_LENGTH_BELOW_MIN",
    validation: {
      length: fullValidation.length,
      minTotalChars: LIFE_BOOK_MIN_TOTAL_CHARS,
      targetTotalChars: getLifeBookTargetTotalChars(LIFE_BOOK_CHAPTERS),
    },
  });

  if (onProgress) onProgress({ code: "RENDERING_PDF", message: "PDF 편집 중" });
  logLifeBookStage("PDF_RENDER_START", { reportId });

  const rendered = renderLifeBookPdf({
    reportId,
    lifeBookInputData,
    chapters,
    generatedAt: new Date().toISOString(),
  });

  const pdfData = buildLifeBookPdfData({
    reportId,
    lifeBookInputData,
    chapters,
    generatedAt: rendered?.generatedAt || new Date().toISOString(),
  });

  if (onProgress) onProgress({ code: "PDF_READY", message: "다운로드 준비 완료" });
  logLifeBookStage("PDF_RENDER_SUCCESS", { reportId });

  const hasLocal = warnings.some((w) => {
    const marker = String(w?.warning || "");
    return marker.includes("LOCAL") || marker.includes("FALLBACK");
  });
  const hasApi = chapters.length > 0;
  const source = hasLocal && hasApi ? "mixed" : (hasLocal ? "local" : "api");

  return {
    ok: true,
    source,
    mode: "life-book",
    reportId,
    totalChapters: LIFE_BOOK_TOTAL_CHAPTERS,
    lifeBookInputData,
    chapters,
    chapterMemories,
    warnings,
    fullValidation,
    pdfData,
    rendered,
  };
}
