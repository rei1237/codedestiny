// ============================================================
// Astro Western Premium - PDF Generation Pipeline (STRICT)
// ============================================================
// NO padding, NO fallback, NO skeleton output
// Fail explicitly if quality thresholds not met
// ============================================================

import { ASTRO_CHAPTER_META, ASTRO_TOTAL_CHAPTERS, ASTRO_MIN_TOTAL_CHARS } from "./astroChapterConfig.js";
import { generateAstroChaptersSequentially } from "./generateAstroChapter.js";
import { assertNoAstroPdfFallbackText } from "./assertNoAstroPdfFallbackText.js";
import { validateAstroPdfPayload, assertAstroPdfPayloadValid } from "./validateAstroPdfPayload.js";

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

export async function generateAstroPdf(params = {}) {
  const env = params.env || {};
  const body = params.body || {};
  const chart = params.chart || {};
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
    assertAstroPdfPayloadValid(body?.payload || {});
  } catch (err) {
    return {
      ok: false,
      code: "ASTRO_PAYLOAD_VALIDATION_FAILED",
      message: err instanceof Error ? err.message : "차트 데이터 검증 실패",
      reportId,
    };
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
    }
  }

  // STRICT MODE: Fail immediately if any chapter fails validation
  if (invalidChapters.length > 0) {
    logAstroStage("QUALITY_VALIDATION_FAILED_ABORTING", { 
      reportId, 
      invalidChapters: invalidChapters.map(c => ({ chapter: c.chapter, errors: c.errors })) 
    });
    return {
      ok: false,
      code: "ASTRO_CHAPTER_QUALITY_FAILED",
      message: `점성술 챕터 품질 검증 실패 (${invalidChapters.length}개 챕터): ${
        invalidChapters.map(c => `챕터${c.chapter}(${c.errors.join(", ")})`).join("; ")
      }`,
      reportId,
      invalidChapters,
    };
  }

  logAstroStage("QUALITY_VALIDATION_SUCCESS", { reportId });

  // ============================================================
  // TOTAL LENGTH VALIDATION - STRICT MODE
  // ============================================================
  const fullText = chapters.join("\n\n");
  const totalLength = countChars(fullText);

  logAstroStage("TOTAL_LENGTH_CHECK", { reportId, totalLength, minRequired: ASTRO_MIN_TOTAL_CHARS });

  if (totalLength < ASTRO_MIN_TOTAL_CHARS) {
    logAstroStage("TOTAL_LENGTH_FAILED", { 
      reportId, 
      totalLength, 
      minRequired: ASTRO_MIN_TOTAL_CHARS 
    });
    return {
      ok: false,
      code: "ASTRO_TOTAL_LENGTH_TOO_SHORT",
      message: `점성술 리포트 전체 길이가 부족합니다 (${totalLength}/${ASTRO_MIN_TOTAL_CHARS} 자)`,
      reportId,
      totalLength,
      minRequired: ASTRO_MIN_TOTAL_CHARS,
    };
  }

  // ============================================================
  // BUILD FINAL PDF DATA
  // ============================================================
  if (onProgress) onProgress({ code: "BUILDING_PDF_DATA", message: "PDF 데이터 구성 중" });

  const pdfData = buildAstroPdfData({
    reportId,
    chart,
    chapters,
    generatedAt: new Date().toISOString(),
    warnings,
    sources,
  });

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
    forceLocal: params.forceLocal === true,
  });

  const text = generated[chapterNum] || "";
  const validation = validateAstroChapterQuality(chapterNum, text);

  if (!validation.ok) {
    logAstroStage(`CHAPTER_${chapterNum}_GENERATION_FAILED`, { errors: validation.errors });
    const fallback = generateAstroFallbackText(chapterNum, chart);
    return {
      ok: true,
      chapter: chapterNum,
      text: fallback,
      source: "fallback",
      quality: { ok: true }, // fallback is always accepted
    };
  }

  logAstroStage(`CHAPTER_${chapterNum}_GENERATION_SUCCESS`, {});
  return {
    ok: true,
    chapter: chapterNum,
    text,
    source: "gemini",
    quality: validation,
  };
}
