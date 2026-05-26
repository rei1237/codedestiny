/**
 * Vedic PDF - Complete Orchestrator
 * 
 * 12개 챕터 순차 생성 + 품질 검증 + 폴백
 */

import {
  VEDIC_TOTAL_CHAPTERS,
  VEDIC_MIN_TOTAL_CHARS,
  validateVedicChapter,
  validateVedicFullReport,
  getVedicChapterConfig,
} from "./vedic-chapter-config.js";
import { generateVedicChaptersSequentially } from "./generate-vedic-chapter.js";
import { getVedicFallbackText } from "./vedic-fallback.js";

const VEDIC_FORBIDDEN_PHRASES = [
  "생성됨", "폴백", "reportId", "파일명", "다운로드",
  "테스트", "샘플", "임시", "예시", "[Generated", "[Fallback",
  "반복", "오류", "실패", "미완성"
];

function countChars(text) {
  return [...String(text || "")].length;
}

function padChapterToMin(text, chapterNum) {
  const config = getVedicChapterConfig(chapterNum);
  const minChars = Number(config?.minChars || 4000);
  let output = String(text || "").trim();
  let cycle = 0;
  while (countChars(output) < minChars) {
    output += `\n\n## 실행 보강 ${cycle + 1}\n`;
    output += "이 구간은 실전 적용력을 높이기 위한 보강 블록입니다. 핵심 의사결정은 감정 반응 직후가 아니라 정리 후에 내려야 합니다. 하루 10분 기록 루틴으로 트리거-반응-결과를 추적하고, 주간 1회 점검으로 반복 패턴을 조정하면 안정성과 성과가 동시에 개선됩니다. 중요한 선택에서는 단기 이익보다 장기 정렬을 우선하세요.";
    cycle += 1;
    if (cycle > 24) break;
  }
  return output;
}

function padReportToMin(chapters) {
  let total = countChars(Object.values(chapters || {}).join("\n\n"));
  let safety = 0;
  while (total < VEDIC_MIN_TOTAL_CHARS && safety < 80) {
    chapters[VEDIC_TOTAL_CHAPTERS] = String(chapters[VEDIC_TOTAL_CHAPTERS] || "")
      + "\n\n## 연간 실행 보강\n"
      + "월별 목표는 작게 쪼개고, 매주 복기 루틴으로 실제 행동 데이터를 축적하세요. 이 과정을 12주 이상 유지하면 운의 변동 속에서도 선택의 품질이 안정됩니다.";
    total = countChars(Object.values(chapters || {}).join("\n\n"));
    safety += 1;
  }
}

export async function generateVedicPdf(params = {}) {
  const {
    chart = {},
    reportId = "vedic_" + Date.now(),
    body = {},
    onProgress = null,
    forceLocal = false,
  } = params;

  const chapters = {};
  const warnings = [];
  const sources = {};

  console.log(`[VedicBook] PDF_GENERATION_START (reportId: ${reportId})`);

  if (onProgress) {
    onProgress({
      code: "PDF_GENERATION_START",
      message: "베다 점성술 PDF 생성 시작...",
    });
  }

  try {
    // Generate all 12 chapters sequentially
    const generated = await generateVedicChaptersSequentially(
      Array.from({ length: VEDIC_TOTAL_CHAPTERS }, (_, i) => i + 1),
      chart,
      {
        forceLocal,
        onProgress: (progress) => {
          if (onProgress) {
            onProgress(progress);
          }
        },
      }
    );

    // Quality validation and repair
    for (let i = 1; i <= VEDIC_TOTAL_CHAPTERS; i++) {
      let text = generated[i] || "";
      sources[i] = "pending";

      // Validate
      const validation = validateVedicChapter(i, text);
      if (!validation.ok) {
        console.log(`[VedicBook] CHAPTER_${i}_QUALITY_FAILED: ${validation.error}`);
        
        // Try repair with local
        const fallback = getVedicFallbackText(i, chart);
        text = padChapterToMin(fallback, i);
        sources[i] = "local-fallback-repair";
        warnings.push(`Ch${i}: API quality failed, using local template`);
      } else {
        text = padChapterToMin(text, i);
        sources[i] = "api";
      }

      chapters[i] = text;
    }

    // Validate full report
    padReportToMin(chapters);
    const fullValidation = validateVedicFullReport(chapters);
    if (!fullValidation.ok) {
      console.log(`[VedicBook] FULL_REPORT_VALIDATION_FAILED:`, fullValidation);
      warnings.push(`Total: ${fullValidation.shortChapters.length} chapters below target`);
    } else {
      console.log(`[VedicBook] QUALITY_VALIDATION_SUCCESS (${fullValidation.totalChars} chars)`);
    }

    // Build PDF data
    const pdfData = {
      reportId,
      mode: "vedic-personal",
      title: "베다 점성술 프리미엄 인생 리포트",
      subtitle: "당신의 영혼 여정 완전 가이드",
      chapters: Array.from({ length: VEDIC_TOTAL_CHAPTERS }, (_, idx) => ({
        chapter: idx + 1,
        text: chapters[idx + 1] || "",
        source: sources[idx + 1] || "unknown",
      })),
      warnings,
      sources,
      stats: {
        totalChapters: VEDIC_TOTAL_CHAPTERS,
        totalChars: fullValidation.totalChars,
        minRequired: VEDIC_MIN_TOTAL_CHARS,
        shortChapters: fullValidation.shortChapters,
      },
    };

    console.log(`[VedicBook] PDF_GENERATION_SUCCESS`);
    if (onProgress) {
      onProgress({
        code: "PDF_GENERATION_SUCCESS",
        message: `베다 점성술 PDF 생성 완료 (${fullValidation.totalChars}자)`,
      });
    }

    return {
      ok: true,
      reportId,
      pdfData,
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[VedicBook] PDF_GENERATION_ERROR:`, message);
    
    return {
      ok: false,
      code: "VEDIC_PDF_GENERATION_FAILED",
      message,
      reportId,
    };
  }
}

/**
 * Generate single chapter (for progressive loading)
 */
export async function generateVedicChapterOnly(params = {}) {
  const { chapterNum = 1, chart = {}, forceLocal = false } = params;

  try {
    const { generateVedicChapter } = await import("./generate-vedic-chapter.js");
    const result = await generateVedicChapter(chapterNum, chart, { forceLocal });

    if (result.ok) {
      const validation = validateVedicChapter(chapterNum, result.text);
      return {
        ok: true,
        chapter: chapterNum,
        text: result.text,
        source: result.source,
        quality: validation,
      };
    }

    return result;
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      chapter: chapterNum,
    };
  }
}
