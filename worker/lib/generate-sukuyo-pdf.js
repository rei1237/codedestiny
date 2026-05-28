/**
 * Sukuyo Premium PDF - Complete Orchestrator
 */

import {
  SUKUYO_TOTAL_CHAPTERS,
  SUKUYO_MIN_TOTAL_CHARS_PERSONAL,
  SUKUYO_MIN_TOTAL_CHARS_COMPAT,
  validateSukuyoChapter,
  validateSukuyoFullReport,
} from "./sukuyo-chapter-config.js";
import { generateSukuyoChaptersSequentially } from "./generate-sukuyo-chapter.js";
import { getSukuyoFallbackText } from "./sukuyo-fallback.js";
import { getSukuyoChapterConfig } from "./sukuyo-chapter-config.js";
import {
  buildCategoryRecordsFromChapter,
  repairCategoriesForRender,
  validatePdfChaptersBeforeRender,
} from "./pdf-category-policy.js";

const SUKUYO_FORBIDDEN_PHRASES = [
  "reportId",
  "fallback",
  "generated",
  "[Generated",
  "[Fallback",
  "테스트",
  "샘플",
  "임시",
  "오류",
  "실패",
];

function normalizeMode(mode) {
  return mode === "compat" ? "compat" : "personal";
}

function countChars(text) {
  return [...String(text || "")].length;
}

function hasForbiddenPhrases(text) {
  const src = String(text || "");
  return SUKUYO_FORBIDDEN_PHRASES.some((phrase) => src.includes(phrase));
}

function hasRepetitiveSentence(text) {
  const sentences = String(text || "")
    .split(/[.!?\n。！？]/)
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s.length > 22);

  const seen = new Map();
  for (const sentence of sentences) {
    const count = (seen.get(sentence) || 0) + 1;
    seen.set(sentence, count);
    if (count >= 3) return true;
  }
  return false;
}

function validateSukuyoChapterQuality(chapterNum, text, mode) {
  const errors = [];
  const baseValidation = validateSukuyoChapter(chapterNum, text, mode);

  if (!baseValidation.ok) {
    errors.push(baseValidation.error);
  }
  if (hasForbiddenPhrases(text)) {
    errors.push("forbidden phrase detected");
  }
  if (hasRepetitiveSentence(text)) {
    errors.push("repetitive sentence detected");
  }

  return {
    ok: errors.length === 0,
    errors,
    length: countChars(text),
  };
}

function buildSukuyoChapterCategories(chapterNum, chapterText, mode, chart = {}) {
  const chapterConfig = getSukuyoChapterConfig(chapterNum) || {};
  const sectionTitles = Array.isArray(chapterConfig?.sections) && chapterConfig.sections.length
    ? chapterConfig.sections
    : ["핵심 진단", "실전 전략"];
  return buildCategoryRecordsFromChapter({
    serviceKey: "sookyo_premium",
    serviceLabel: "숙요점 PDF",
    chapterNo: chapterNum,
    chapterKey: `sukuyo-${String(chapterNum).padStart(2, "0")}`,
    chapterTitle: String(chapterConfig?.title || `Chapter ${chapterNum}`).trim(),
    chapterPurpose: mode === "compat" ? "관계 궁합 카테고리 상담문 작성" : "개인 숙요 카테고리 상담문 작성",
    chapterText,
    categoryTitles: sectionTitles,
    minChars: 700,
    availableData: {
      mode,
      natal: chart?.natal || chart?.sukuyo || null,
      relationType: chart?.relationType || null,
    },
    missingData: [],
    birthSummary: mode === "compat" ? "본인/상대 생년월일시 입력 반영" : "생년월일시 입력 반영",
  });
}

export async function generateSukuyoPdf(params = {}) {
  const reportId = String(params.reportId || `sukuyo_${Date.now()}`);
  const mode = normalizeMode(params.mode);
  const chart = params.chart || {};
  const body = params.body || {};
  const forceLocal = params.forceLocal === true || body.forceLocalOnly === true;
  const onProgress = typeof params.onProgress === "function" ? params.onProgress : null;

  const chapters = {};
  const sources = {};
  const warnings = [];

  console.log(`[SukuyoBook] PDF_GENERATION_START (reportId=${reportId}, mode=${mode})`);

  if (onProgress) {
    onProgress({ code: "PDF_GENERATION_START", message: "숙요 리포트 생성 시작" });
  }

  try {
    const chapterNums = Array.from({ length: SUKUYO_TOTAL_CHAPTERS }, (_, i) => i + 1);

    const generated = await generateSukuyoChaptersSequentially(chapterNums, chart, {
      mode,
      forceLocal,
      maxRetries: 8,
      onProgress,
    });

    for (const chapterNum of chapterNums) {
      let text = generated[chapterNum] || "";
      let source = forceLocal ? "local-fallback" : "gemini";

      const quality = validateSukuyoChapterQuality(chapterNum, text, mode);
      if (!quality.ok) {
        text = getSukuyoFallbackText(chapterNum, chart, mode);
        source = "local-fallback-repair";
        warnings.push({
          chapter: chapterNum,
          warning: "CHAPTER_QUALITY_FAILED_REPAIRED",
          errors: quality.errors,
        });
      }

      chapters[chapterNum] = text;
      sources[chapterNum] = source;
    }

    const fullValidation = validateSukuyoFullReport(chapters, mode);
    if (!fullValidation.ok) {
      warnings.push({
        chapter: "full-report",
        warning: "TOTAL_OR_CHAPTER_VALIDATION_FAILED",
        totalChars: fullValidation.totalChars,
        minRequired: fullValidation.minRequired,
        shortChapters: fullValidation.shortChapters,
      });
    }

    const minRequired = mode === "compat" ? SUKUYO_MIN_TOTAL_CHARS_COMPAT : SUKUYO_MIN_TOTAL_CHARS_PERSONAL;

    let chapterRows = Array.from({ length: SUKUYO_TOTAL_CHAPTERS }, (_, idx) => {
      const chapterNo = idx + 1;
      const chapterConfig = getSukuyoChapterConfig(chapterNo) || {};
      const categories = buildSukuyoChapterCategories(chapterNo, chapters[chapterNo] || "", mode, chart);
      return {
        chapter: chapterNo,
        chapterNo,
        chapterId: `sukuyo-${String(chapterNo).padStart(2, "0")}`,
        title: String(chapterConfig?.title || `Chapter ${chapterNo}`).trim(),
        text: categories.map((cat) => `## ${cat.title}\n\n${cat.finalText}`).join("\n\n"),
        source: sources[chapterNo] || "unknown",
        categories,
      };
    });
    chapterRows = repairCategoriesForRender(chapterRows, {
      serviceKey: "sookyo_premium",
      serviceLabel: "숙요점 PDF",
      minChars: 700,
      birthSummary: mode === "compat" ? "본인/상대 생년월일시 기반 입력 반영" : "생년월일시 기반 핵심 입력 반영",
    });
    validatePdfChaptersBeforeRender(chapterRows, { minChars: 700 });

    const pdfData = {
      reportId,
      mode,
      service: "sukuyo",
      title: mode === "compat" ? "숙요 궁합 프리미엄 리포트" : "숙요 프리미엄 리포트",
      subtitle: mode === "compat" ? "두 사람의 숙요 거리와 관계 전략" : "달의 리듬과 영혼 패턴 분석",
      generatedAt: new Date().toISOString(),
      chapters: chapterRows,
      generationState: "completed",
      stats: {
        totalChapters: SUKUYO_TOTAL_CHAPTERS,
        totalChars: countChars(chapterRows.map((row) => row.text).join("\n\n")),
        minRequired,
        shortChapters: fullValidation.shortChapters || [],
      },
      warnings,
    };

    console.log(`[SukuyoBook] PDF_GENERATION_SUCCESS (reportId=${reportId})`);

    if (onProgress) {
      onProgress({ code: "PDF_GENERATION_SUCCESS", message: "숙요 리포트 생성 완료" });
    }

    return {
      ok: true,
      reportId,
      pdfData,
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[SukuyoBook] PDF_GENERATION_ERROR`, { reportId, message });

    return {
      ok: false,
      reportId,
      message,
      warnings,
    };
  }
}
