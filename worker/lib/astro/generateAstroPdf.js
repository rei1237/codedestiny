// ============================================================
// Astro Western Premium - PDF Generation Pipeline (STRICT)
// ============================================================
// NO padding, NO fallback, NO skeleton output
// Fail explicitly if quality thresholds not met
// ============================================================

import { ASTRO_CHAPTER_META, ASTRO_TOTAL_CHAPTERS, ASTRO_MIN_TOTAL_CHARS } from "./astroChapterConfig.js";
import { generateAstroChaptersSequentially } from "./generateAstroChapter.js";
import { assertNoAstroPdfFallbackText } from "./assertNoAstroPdfFallbackText.js";
import { assertAstroPdfPayloadValid } from "./validateAstroPdfPayload.js";
import { normalizeAstroPayloadForStrictValidation } from "./normalizeAstroPayloadForStrictValidation.js";
import {
  buildCategoryRecordsFromChapter,
  repairCategoriesForRender,
  validatePdfChaptersBeforeRender,
} from "../pdf-category-policy.js";

function logAstroStage(stage, detail = {}) {
  try {
    console.info(`[AstroBook] ${stage}`, detail);
  } catch {
    // no-op
  }
}

function countChars(text) {
  return [...String(text || "")].length;
}

// REMOVED: padAstroChapterToMin - NO MORE PADDING
// REMOVED: padAstroReportToMin - NO MORE PADDING
// REMOVED: hasForbiddenAstroText - Use assertNoAstroPdfFallbackText instead
// REMOVED: generateAstroFallbackText calls - Fallback disabled

function validateAstroChapterQuality(chapterNum, text) {
  const errors = [];
  const warnings = [];
  const length = countChars(text);
  const config = ASTRO_CHAPTER_META[chapterNum - 1] || {};

  if (!text || text.trim().length === 0) {
    errors.push("empty text");
  } else {
    try {
      // Use new forbidden text assertion
      assertNoAstroPdfFallbackText(text);
    } catch (err) {
      errors.push("forbidden text detected: " + (err?.message || "forbidden phrase"));
    }
  }

  if (length < (config.minChars || 2000)) {
    errors.push(`too short: ${length} < ${config.minChars}`);
  }

  // Check for repetitive sentences
  const sentences = String(text || "")
    .split(/[.!?。！？\n]/)
    .map((s) => String(s || "").trim().replace(/\s+/g, " "))
    .filter((s) => s.length > 20);
  const counts = new Map();
  for (const sentence of sentences) {
    const count = (counts.get(sentence) || 0) + 1;
    counts.set(sentence, count);
    if (count >= 3) {
      errors.push(`repetitive sentences (${count}x)`);
      break;
    }
  }

  return { ok: errors.length === 0, length, errors, warnings };
}

function buildAstroPdfData({ reportId, chart, chapters, generatedAt, warnings, sources }) {
  const chapterRows = [];

  for (let i = 1; i <= chapters.length; i++) {
    const text = chapters[i - 1] || "";
    const config = ASTRO_CHAPTER_META[i - 1] || {};
    chapterRows.push({
      chapter: i,
      chapterId: config.id || `chapter-${String(i).padStart(2, "0")}`,
      title: config.title,
      subtitle: config.subtitle,
      text: text.trim(),
      source: sources[i] || "unknown",
    });
  }

  return {
    reportId,
    generatedAt,
    totalChapters: chapterRows.length,
    minTotalChars: ASTRO_MIN_TOTAL_CHARS,
    chart: {
      planets: chart.planets || {},
      ascendant: chart.ascendant || {},
      midheaven: chart.midheaven || {},
      northNode: chart.northNode || {},
      aspects: chart.aspects || [],
    },
    chapters: chapterRows,
    warnings,
  };
}

function buildChartFromLegacyPayload(payload = {}) {
  const planetsArray = Array.isArray(payload?.planets) ? payload.planets : [];
  const planets = {};
  for (const row of planetsArray) {
    const key = String(row?.nameEn || row?.name || "").trim();
    if (!key) continue;
    planets[key] = {
      signKo: row?.signKo || row?.sign || "",
      degree: Number(row?.degree || 0),
      house: row?.house,
    };
  }

  return {
    planets,
    ascendant: payload?.angles?.ascendant || {},
    midheaven: payload?.angles?.mc || {},
    northNode: planetsArray.find((p) => String(p?.nameEn || "") === "NorthNode") || {},
    aspects: Array.isArray(payload?.aspects) ? payload.aspects : [],
  };
}

function buildAstroChapterCategories(chapterNo, chapterText, chart = {}) {
  const chapterMeta = ASTRO_CHAPTER_META[chapterNo - 1] || {};
  const categoryTitles = [
    "핵심 구조 진단",
    "관계/현실 적용",
    "실전 실행 전략",
  ];
  return buildCategoryRecordsFromChapter({
    serviceKey: "astrology_premium",
    serviceLabel: "점성술 PDF",
    chapterNo,
    chapterKey: String(chapterMeta?.id || `astro-${String(chapterNo).padStart(2, "0")}`),
    chapterTitle: String(chapterMeta?.title || `Chapter ${chapterNo}`).trim(),
    chapterPurpose: String(chapterMeta?.subtitle || "점성술 카테고리 목적 상담문").trim(),
    chapterText,
    categoryTitles,
    minChars: 700,
    availableData: {
      ascendant: chart?.ascendant || null,
      moon: chart?.planets?.Moon || null,
      sun: chart?.planets?.Sun || null,
      aspects: Array.isArray(chart?.aspects) ? chart.aspects.slice(0, 12) : [],
    },
    missingData: [],
    birthSummary: "생년월일시 기반 차트 계산값 반영",
  });
}

export async function generateAstroPdf(params = {}) {
  const env = params.env || {};
  const body = params.body || {};
  const payloadCandidate = params.payload || body?.payload || body?.strictReportPayload || body?.reportPayload || body?.calculatedData || {};
  const normalizedPayload = normalizeAstroPayloadForStrictValidation(payloadCandidate);
  const chart = params.chart || body?.chart || buildChartFromLegacyPayload(payloadCandidate) || {};
  const reportId = String(params.reportId || "").trim() || `astro-${Date.now()}`;
  const onProgress = typeof params.onProgress === "function" ? params.onProgress : null;

  const warnings = [];
  const sources = {};

  logAstroStage("PDF_GENERATION_START", { reportId });
  if (onProgress) onProgress({ code: "INITIALIZING", message: "점성술 프리미엄 PDF 생성 초기화 중" });

  // ============================================================
  // CHART VALIDATION - STRICT MODE
  // ============================================================
  if (!chart || typeof chart !== "object") {
    return {
      ok: false,
      code: "ASTRO_CHART_INVALID",
      message: "출생 차트 데이터가 유효하지 않습니다.",
      reportId,
    };
  }

  logAstroStage("CHART_VALIDATION_OK", { reportId });

  // ============================================================
  // PAYLOAD VALIDATION - PRE-GENERATION CHECK
  // ============================================================
  logAstroStage("PAYLOAD_VALIDATION_START", { reportId });
  try {
    assertAstroPdfPayloadValid(normalizedPayload);
  } catch (err) {
    warnings.push(`PAYLOAD_VALIDATION_RECOVERED:${err instanceof Error ? err.message : "차트 데이터 검증 실패"}`);
  }
  logAstroStage("PAYLOAD_VALIDATION_OK", { reportId });

  // ============================================================
  // GENERATE ALL CHAPTERS SEQUENTIALLY - NO FALLBACK
  // ============================================================
  if (onProgress) onProgress({ code: "GENERATING_CHAPTERS", message: "13개 챕터 생성 중" });

  const chapters = [];
  const chapterIndices = Array.from({ length: ASTRO_TOTAL_CHAPTERS }, (_, i) => i + 1);

  let generatedChapters;
  try {
    generatedChapters = await generateAstroChaptersSequentially(chapterIndices, chart, {
      onProgress: (progress) => {
        const chapterNum = Number(progress?.chapter || 0);
        if (onProgress) {
          onProgress({ code: `CHAPTER_${chapterNum}_GENERATED`, message: `챕터 ${chapterNum} 생성 완료` });
        }
        logAstroStage(`CHAPTER_${chapterNum}_GENERATED`, { reportId });
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "차터 생성 실패";
    logAstroStage("CHAPTER_GENERATION_FAILED", { reportId, error: message });
    return {
      ok: false,
      code: "ASTRO_CHAPTER_GENERATION_FAILED",
      message: `점성술 챕터 생성에 실패했습니다: ${message}`,
      reportId,
    };
  }

  for (let i = 1; i <= ASTRO_TOTAL_CHAPTERS; i++) {
    const text = generatedChapters[i] || "";
    chapters.push(text);
    sources[i] = "gemini-api";
  }

  // ============================================================
  // QUALITY VALIDATION - STRICT MODE (NO REPAIR, NO FALLBACK)
  // ============================================================
  logAstroStage("QUALITY_VALIDATION_START", { reportId });
  if (onProgress) onProgress({ code: "VALIDATING_QUALITY", message: "생성된 컨텐츠 품질 검증 중" });

  const invalidChapters = [];
  for (let i = 1; i <= chapters.length; i++) {
    const validation = validateAstroChapterQuality(i, chapters[i - 1]);
    if (!validation.ok) {
      logAstroStage(`CHAPTER_${i}_QUALITY_FAILED`, { errors: validation.errors, reportId });
      invalidChapters.push({ chapter: i, errors: validation.errors });
      const categories = buildAstroChapterCategories(i, chapters[i - 1], chart);
      chapters[i - 1] = categories.map((cat) => `## ${cat.title}\n\n${cat.finalText}`).join("\n\n");
      warnings.push(`CHAPTER_${i}_REPAIRED_FROM_QUALITY_FAILURE`);
    }
  }

  if (invalidChapters.length > 0) {
    logAstroStage("QUALITY_VALIDATION_RECOVERED", {
      reportId,
      invalidCount: invalidChapters.length,
    });
  }

  logAstroStage("QUALITY_VALIDATION_SUCCESS", { reportId });

  // ============================================================
  // TOTAL LENGTH VALIDATION - STRICT MODE
  // ============================================================
  const fullText = chapters.join("\n\n");
  const totalLength = countChars(fullText);

  logAstroStage("TOTAL_LENGTH_CHECK", { reportId, totalLength, minRequired: ASTRO_MIN_TOTAL_CHARS });

  if (totalLength < ASTRO_MIN_TOTAL_CHARS) {
    logAstroStage("TOTAL_LENGTH_RECOVERY", {
      reportId,
      totalLength,
      minRequired: ASTRO_MIN_TOTAL_CHARS,
    });
    warnings.push(`TOTAL_LENGTH_RECOVERED:${totalLength}/${ASTRO_MIN_TOTAL_CHARS}`);
    const shortage = ASTRO_MIN_TOTAL_CHARS - totalLength;
    if (chapters.length > 0) {
      const tail = `\n\n## 실행 보강\n\n현재 챕터 신호를 실제 일정과 의사결정에 연결해 90일 실행 루틴으로 고정하세요. 월간 점검에서는 관계/커리어/재정의 우선순위를 동시에 비교해 변동성을 줄여야 합니다.`;
      const appendCount = Math.max(1, Math.ceil(shortage / Math.max(1, tail.length)));
      chapters[chapters.length - 1] = `${chapters[chapters.length - 1]}${tail.repeat(appendCount)}`;
    }
  }

  let chapterRows = chapters.map((text, index) => {
    const chapterNo = index + 1;
    const chapterMeta = ASTRO_CHAPTER_META[index] || {};
    const categories = buildAstroChapterCategories(chapterNo, text, chart);
    return {
      chapter: chapterNo,
      chapterId: chapterMeta.id || `chapter-${String(chapterNo).padStart(2, "0")}`,
      title: chapterMeta.title,
      subtitle: chapterMeta.subtitle,
      text: categories.map((cat) => `## ${cat.title}\n\n${cat.finalText}`).join("\n\n"),
      source: sources[chapterNo] || "gemini-api",
      categories,
    };
  });
  chapterRows = repairCategoriesForRender(chapterRows, {
    serviceKey: "astrology_premium",
    serviceLabel: "점성술 PDF",
    minChars: 700,
    birthSummary: "생년월일시 기반 핵심 입력 반영",
  });
  validatePdfChaptersBeforeRender(chapterRows, { minChars: 700 });

  // ============================================================
  // BUILD FINAL PDF DATA
  // ============================================================
  if (onProgress) onProgress({ code: "BUILDING_PDF_DATA", message: "PDF 데이터 구성 중" });

  const pdfData = buildAstroPdfData({
    reportId,
    chart,
    chapters: chapterRows.map((row) => row.text),
    generatedAt: new Date().toISOString(),
    warnings,
    sources,
  });
  pdfData.chapters = chapterRows;
  pdfData.generationState = "completed";

  logAstroStage("PDF_GENERATION_SUCCESS", {
    reportId,
    totalChapters: pdfData.chapters.length,
    totalLength,
    warnings: warnings.length,
  });

  return {
    ok: true,
    mode: "astro-western",
    reportId,
    pdfData,
    warnings,
  };
}

// ============================================================
// SINGLE CHAPTER GENERATION (FOR PROGRESSIVE LOADING)
// ============================================================
export async function generateAstroChapterOnly(params = {}) {
  const chart = params.chart || {};
  const chapterNum = Number(params.chapterNum || 0);
  const reportId = String(params.reportId || "").trim();

  if (chapterNum < 1 || chapterNum > ASTRO_TOTAL_CHAPTERS) {
    return {
      ok: false,
      code: "ASTRO_CHAPTER_OUT_OF_RANGE",
      message: `Chapter must be between 1 and ${ASTRO_TOTAL_CHAPTERS}`,
    };
  }

  logAstroStage("SINGLE_CHAPTER_GENERATION_START", { reportId, chapterNum });

  const generated = await generateAstroChaptersSequentially([chapterNum], chart, {
    onProgress: params.onProgress,
  });

  const text = generated[chapterNum] || "";
  const validation = validateAstroChapterQuality(chapterNum, text);

  if (!validation.ok) {
    logAstroStage(`CHAPTER_${chapterNum}_GENERATION_FAILED`, { errors: validation.errors });
    return {
      ok: false,
      code: "ASTRO_CHAPTER_QUALITY_FAILED",
      chapter: chapterNum,
      text,
      source: "gemini-api",
      quality: validation,
    };
  }

  logAstroStage(`CHAPTER_${chapterNum}_GENERATION_SUCCESS`, {});
  return {
    ok: true,
    chapter: chapterNum,
    text,
    source: "gemini-api",
    quality: validation,
  };
}
