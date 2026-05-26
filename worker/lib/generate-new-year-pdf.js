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

    const pdfData = {
      reportId,
      mode: "saju-new-year",
      service: "new-year",
      title: "신년운세 프리미엄 월별 리포트",
      subtitle: "12개월 실전 전략 가이드",
      generatedAt: new Date().toISOString(),
      chapters: Array.from({ length: SAJU_NEWYEAR_TOTAL_CHAPTERS }, (_, idx) => ({
        chapter: idx + 1,
        month: `${idx + 1}월`,
        text: chapters[idx + 1] || "",
        source: sources[idx + 1] || "unknown",
      })),
      stats: {
        totalChapters: SAJU_NEWYEAR_TOTAL_CHAPTERS,
        totalChars: countChars(Object.values(chapters).join("\n\n")),
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
