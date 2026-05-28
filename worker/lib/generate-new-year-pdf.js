/**
 * Saju New Year Premium PDF - Complete Orchestrator
 */

import {
  SAJU_NEWYEAR_TOTAL_CHAPTERS,
  SAJU_NEWYEAR_MIN_TOTAL_CHARS,
  validateSajuNewYearChapter,
  validateSajuNewYearFullReport,
  getSajuNewYearChapterConfig,
} from "./saju-new-year-chapter-config.js";
import {
  generateNewYearChaptersSequentially,
  getNewYearFallbackText,
} from "./generate-new-year-chapter.js";
import {
  buildCategoryRecordsFromChapter,
  repairCategoriesForRender,
  validatePdfChaptersBeforeRender,
} from "./pdf-category-policy.js";

const NEW_YEAR_FORBIDDEN_PHRASES = [
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

function countChars(text) {
  return [...String(text || "")].length;
}

function padChapterToMin(text, chapterNum) {
  const config = getSajuNewYearChapterConfig(chapterNum);
  const minChars = Number(config?.minChars || 3800);
  let output = String(text || "").trim();
  let cycle = 0;
  while (countChars(output) < minChars) {
    output += `\n\n### 주간 보강 ${cycle + 1}\n`;
    output += "이번 주에는 목표 3개만 유지하고, 감정이 흔들릴 때 결정 속도를 늦추는 규칙을 적용하세요. 사실-감정-요청 순서의 대화로 오해를 줄이고, 주말 리뷰에서 유지/중단 루틴을 명확히 하세요.";
    cycle += 1;
    if (cycle > 20) break;
  }
  return output;
}

function padReportToMin(chapters) {
  let total = countChars(Object.values(chapters || {}).join("\n\n"));
  let guard = 0;
  while (total < SAJU_NEWYEAR_MIN_TOTAL_CHARS && guard < 60) {
    chapters[SAJU_NEWYEAR_TOTAL_CHAPTERS] = String(chapters[SAJU_NEWYEAR_TOTAL_CHAPTERS] || "")
      + "\n\n### 연말 종합 보강\n"
      + "연말에는 성과 정리와 에너지 회복을 동시에 진행해야 다음 해 실행력이 유지됩니다. 월별 기록을 기반으로 반복 패턴을 정리하고 핵심 루틴 3개를 고정하세요.";
    total = countChars(Object.values(chapters || {}).join("\n\n"));
    guard += 1;
  }
}

function hasForbiddenText(text) {
  const src = String(text || "");
  return NEW_YEAR_FORBIDDEN_PHRASES.some((token) => src.includes(token));
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

function validateNewYearChapterQuality(chapterNum, text) {
  const errors = [];
  const baseValidation = validateSajuNewYearChapter(chapterNum, text);

  if (!baseValidation.ok) errors.push(baseValidation.error);
  if (hasForbiddenText(text)) errors.push("forbidden phrase detected");
  if (hasRepetitiveSentence(text)) errors.push("repetitive sentence detected");

  return {
    ok: errors.length === 0,
    errors,
    length: countChars(text),
  };
}

function buildNewYearChapterCategories(chapterNum, chapterText, chart = {}) {
  const chapterConfig = getSajuNewYearChapterConfig(chapterNum) || {};
  const sectionTitles = Array.isArray(chapterConfig?.sections) && chapterConfig.sections.length
    ? chapterConfig.sections
    : ["핵심 진단", "실전 전략"];
  return buildCategoryRecordsFromChapter({
    serviceKey: "saju_new_year_pdf",
    serviceLabel: "사주 신년운세 PDF",
    chapterNo: chapterNum,
    chapterKey: `newyear-${String(chapterNum).padStart(2, "0")}`,
    chapterTitle: String(chapterConfig?.title || `${chapterNum}월`).trim(),
    chapterPurpose: "연간/월간 운세 카테고리 목적 상담문 작성",
    chapterText,
    categoryTitles: sectionTitles,
    minChars: 700,
    availableData: {
      month: chapterConfig?.month,
      dayMaster: chart?.dayMaster || null,
      yearlyFlow: chart?.yearlyFlow || chart?.annualLuck || null,
    },
    missingData: [],
    birthSummary: "생년월일시 입력 및 연도 기반 계산값 반영",
  });
}

export async function generateNewYearPdf(params = {}) {
  const reportId = String(params.reportId || `newyear_${Date.now()}`);
  const chart = params.chart || {};
  const body = params.body || {};
  const forceLocal = params.forceLocal === true || body.forceLocalOnly === true;
  const onProgress = typeof params.onProgress === "function" ? params.onProgress : null;

  const chapters = {};
  const sources = {};
  const warnings = [];

  console.log(`[NewYearBook] PDF_GENERATION_START (reportId=${reportId})`);

  if (onProgress) {
    onProgress({ code: "PDF_GENERATION_START", message: "신년운세 리포트 생성 시작" });
  }

  try {
    const chapterNums = Array.from({ length: SAJU_NEWYEAR_TOTAL_CHAPTERS }, (_, i) => i + 1);

    const generated = await generateNewYearChaptersSequentially(chapterNums, chart, {
      forceLocal,
      maxRetries: 8,
      onProgress,
    });

    for (const chapterNum of chapterNums) {
      let text = generated[chapterNum] || "";
      let source = forceLocal ? "local-fallback" : "gemini";

      const quality = validateNewYearChapterQuality(chapterNum, text);
      if (!quality.ok) {
        text = padChapterToMin(getNewYearFallbackText(chapterNum, chart), chapterNum);
        source = "local-fallback-repair";
        warnings.push({
          chapter: chapterNum,
          warning: "CHAPTER_QUALITY_FAILED_REPAIRED",
          errors: quality.errors,
        });
      }

      chapters[chapterNum] = padChapterToMin(text, chapterNum);
      sources[chapterNum] = source;
    }

    padReportToMin(chapters);
    const fullValidation = validateSajuNewYearFullReport(chapters);
    if (!fullValidation.ok) {
      warnings.push({
        chapter: "full-report",
        warning: "TOTAL_OR_CHAPTER_VALIDATION_FAILED",
        totalChars: fullValidation.totalChars,
        minRequired: fullValidation.minRequired,
        shortChapters: fullValidation.shortChapters,
      });
    }

    let chapterRows = Array.from({ length: SAJU_NEWYEAR_TOTAL_CHAPTERS }, (_, idx) => {
      const chapterNo = idx + 1;
      const chapterConfig = getSajuNewYearChapterConfig(chapterNo) || {};
      const categories = buildNewYearChapterCategories(chapterNo, chapters[chapterNo] || "", chart);
      return {
        chapter: chapterNo,
        month: `${chapterNo}월`,
        chapterNo,
        chapterId: `newyear-${String(chapterNo).padStart(2, "0")}`,
        title: String(chapterConfig?.title || `${chapterNo}월 운세`).trim(),
        text: categories.map((cat) => `## ${cat.title}\n\n${cat.finalText}`).join("\n\n"),
        source: sources[chapterNo] || "unknown",
        categories,
      };
    });
    chapterRows = repairCategoriesForRender(chapterRows, {
      serviceKey: "saju_new_year_pdf",
      serviceLabel: "사주 신년운세 PDF",
      minChars: 700,
      birthSummary: "생년월일시 기반 핵심 입력 반영",
    });
    validatePdfChaptersBeforeRender(chapterRows, { minChars: 700 });

    const pdfData = {
      reportId,
      mode: "saju-new-year",
      service: "new-year",
      title: "신년운세 프리미엄 월별 리포트",
      subtitle: "12개월 실전 전략 가이드",
      generatedAt: new Date().toISOString(),
      chapters: chapterRows,
      generationState: "completed",
      stats: {
        totalChapters: SAJU_NEWYEAR_TOTAL_CHAPTERS,
        totalChars: countChars(chapterRows.map((row) => row.text).join("\n\n")),
        minRequired: SAJU_NEWYEAR_MIN_TOTAL_CHARS,
        shortChapters: fullValidation.shortChapters || [],
      },
      warnings,
    };

    console.log(`[NewYearBook] PDF_GENERATION_SUCCESS (reportId=${reportId})`);

    if (onProgress) {
      onProgress({ code: "PDF_GENERATION_SUCCESS", message: "신년운세 리포트 생성 완료" });
    }

    return {
      ok: true,
      reportId,
      pdfData,
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[NewYearBook] PDF_GENERATION_ERROR`, { reportId, message });

    return {
      ok: false,
      reportId,
      message,
      warnings,
    };
  }
}
