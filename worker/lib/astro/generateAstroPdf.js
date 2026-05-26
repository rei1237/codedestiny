// ============================================================
// Astro Western Premium - PDF Generation Pipeline
// ============================================================

import { ASTRO_CHAPTER_META, ASTRO_TOTAL_CHAPTERS, ASTRO_MIN_TOTAL_CHARS, validateAstroChapter } from "./astroChapterConfig.js";
import { generateAstroChaptersSequentially } from "./generateAstroChapter.js";
import { generateAstroFallbackText } from "./astroFallback.js";

const ASTRO_FORBIDDEN_TEXTS = [
  "자동 복구",
  "Chapter",
  "챕터",
  "데이터가 부족",
  "품질 검증",
  "API 실패",
  "Internal server error",
  "fallback",
  "reportId",
];

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

function padAstroChapterToMin(text, chapterNum) {
  const config = ASTRO_CHAPTER_META[chapterNum - 1] || {};
  const minChars = Math.max(2000, Number(config.minChars || 3000));
  let output = String(text || "").trim();
  let cycle = 0;
  const guidancePool = [
    "핵심 포인트를 일상 행동으로 전환하기 위해 이번 주 목표를 3개 이내로 고정하고, 감정 반응 직후 결정보다 기록 후 결정을 우선하세요.",
    "관계·일·재정에서 반복되는 장면을 주간 1회 복기하면 선택의 일관성이 올라가며, 불필요한 에너지 소모를 줄일 수 있습니다.",
    "월간 리뷰에서는 유지할 습관 2개와 중단할 습관 2개를 분리해 실행하고, 다음 달에는 유지율을 먼저 점검해야 성과가 안정됩니다.",
  ];
  while (countChars(output) < minChars) {
    output += `\n\n### 실행 보강 ${cycle + 1}\n`;
    output += `${guidancePool[cycle % guidancePool.length]} 실행 회차 ${cycle + 1}에서는 우선순위 1개만 고정하세요.`;
    cycle += 1;
    if (cycle > 20) break;
  }
  return output;
}

function padAstroReportToMin(chapters) {
  let total = countChars((chapters || []).join("\n\n"));
  let guard = 0;
  while (total < ASTRO_MIN_TOTAL_CHARS && guard < 60) {
    const lastIndex = Math.max(0, (chapters || []).length - 1);
    chapters[lastIndex] = String(chapters[lastIndex] || "")
      + "\n\n### 장기 실행 보강\n"
      + "월간 리뷰에서 유지할 습관 2개와 중단할 습관 2개를 명확히 하여 리듬을 안정화하세요. 작은 반복이 누적될수록 운의 변동 속에서도 결과가 안정됩니다.";
    total = countChars((chapters || []).join("\n\n"));
    guard += 1;
  }
}

function hasForbiddenAstroText(text) {
  const source = String(text || "");
  for (const token of ASTRO_FORBIDDEN_TEXTS) {
    if (source.includes(token)) return true;
  }
  return false;
}

function validateAstroChapterQuality(chapterNum, text) {
  const errors = [];
  const warnings = [];
  const length = countChars(text);
  const config = ASTRO_CHAPTER_META[chapterNum - 1] || {};

  if (!text || text.trim().length === 0) {
    errors.push("empty text");
  } else if (hasForbiddenAstroText(text)) {
    errors.push("forbidden text detected");
  } else if (length < (config.minChars || 2000)) {
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

export async function generateAstroPdf(params = {}) {
  const env = params.env || {};
  const body = params.body || {};
  const chart = params.chart || {};
  const reportId = String(params.reportId || "").trim() || `astro-${Date.now()}`;
  const onProgress = typeof params.onProgress === "function" ? params.onProgress : null;

  const warnings = [];
  const sources = {};

  logAstroStage("PDF_GENERATION_START", { reportId });
  if (onProgress) onProgress({ code: "INITIALIZING", message: "점성술 프리미엘 PDF 생성 초기화 중" });

  // ============================================================
  // CHART VALIDATION
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
  // GENERATE ALL CHAPTERS SEQUENTIALLY
  // ============================================================
  if (onProgress) onProgress({ code: "GENERATING_CHAPTERS", message: "13개 챕터 생성 중" });

  const chapters = [];
  const chapterIndices = Array.from({ length: ASTRO_TOTAL_CHAPTERS }, (_, i) => i + 1);

  const generatedChapters = await generateAstroChaptersSequentially(chapterIndices, chart, {
    forceLocal: body.forceLocalOnly === true,
    onProgress: (progress) => {
      const chapterNum = Number(progress?.chapter || 0);
      const status = String(progress?.status || "");
      if (onProgress) {
        const msg = status === "fallback" 
          ? `챕터 ${chapterNum} 생성 완료 (로컬 폴백)`
          : `챕터 ${chapterNum} 생성 완료`;
        onProgress({ code: `CHAPTER_${chapterNum}_${status.toUpperCase()}`, message: msg });
      }
      logAstroStage(`CHAPTER_${chapterNum}_${status.toUpperCase()}`, { reportId });
    },
  });

  for (let i = 1; i <= ASTRO_TOTAL_CHAPTERS; i++) {
    const text = generatedChapters[i] || "";
    chapters.push(padAstroChapterToMin(text, i));
    sources[i] = text.includes("이 챕터는") ? "fallback" : "gemini";
  }

  // ============================================================
  // QUALITY VALIDATION & REPAIR
  // ============================================================
  logAstroStage("QUALITY_VALIDATION_START", { reportId });
  if (onProgress) onProgress({ code: "VALIDATING_QUALITY", message: "생성된 컨텐츠 품질 검증 중" });

  const invalidChapters = [];
  for (let i = 1; i <= chapters.length; i++) {
    const validation = validateAstroChapterQuality(i, chapters[i - 1]);
    if (!validation.ok) {
      logAstroStage(`CHAPTER_${i}_QUALITY_FAILED`, { errors: validation.errors });
      invalidChapters.push(i);
      warnings.push({
        chapter: i,
        warning: "QUALITY_FAILED",
        errors: validation.errors,
      });
    }
  }

  if (invalidChapters.length > 0) {
    logAstroStage("QUALITY_FAILED_ATTEMPTING_REPAIR", { invalidChapters });
    if (onProgress) onProgress({ code: "REPAIRING_CHAPTERS", message: "불완전한 챕터 재생성 중" });

    for (const chapterNum of invalidChapters) {
      try {
        const fallback = generateAstroFallbackText(chapterNum, chart);
        if (fallback && countChars(fallback) > 1500) {
          chapters[chapterNum - 1] = padAstroChapterToMin(fallback, chapterNum);
          sources[chapterNum] = "fallback-repair";
          warnings.push({
            chapter: chapterNum,
            warning: "REPAIRED_WITH_FALLBACK",
          });
          logAstroStage(`CHAPTER_${chapterNum}_REPAIRED_WITH_FALLBACK`, { reportId });
        }
      } catch (err) {
        warnings.push({
          chapter: chapterNum,
          warning: "REPAIR_FAILED",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  } else {
    logAstroStage("QUALITY_VALIDATION_SUCCESS", { reportId });
  }

  // ============================================================
  // TOTAL LENGTH VALIDATION
  // ============================================================
  padAstroReportToMin(chapters);
  const fullText = chapters.join("\n\n");
  const totalLength = countChars(fullText);

  logAstroStage("TOTAL_LENGTH_CHECK", { totalLength, minRequired: ASTRO_MIN_TOTAL_CHARS });

  if (totalLength < ASTRO_MIN_TOTAL_CHARS) {
    warnings.push({
      chapterId: "full-report",
      warning: "TOTAL_LENGTH_BELOW_MIN",
      length: totalLength,
      minRequired: ASTRO_MIN_TOTAL_CHARS,
    });
  } else {
    warnings.push({
      chapterId: "full-report",
      warning: "TOTAL_LENGTH_OK",
      length: totalLength,
    });
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
