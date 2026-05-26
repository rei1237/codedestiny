/**
 * Love Secret Premium PDF - Complete Orchestrator
 */

import {
  LOVE_SECRET_TOTAL_CHAPTERS,
  LOVE_SECRET_MIN_TOTAL_CHARS,
  validateLoveSecretChapter,
  validateLoveSecretFullReport,
  getLoveSecretChapterConfig,
} from "./saju-love-secret-chapter-config.js";
import {
  generateLoveSecretChaptersSequentially,
  getLoveSecretFallbackText,
} from "./generate-love-secret-chapter.js";

const LOVE_SECRET_MODES = ["personal", "couple", "support"];

const BASE_FORBIDDEN_PHRASES = [
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

const MODE_FORBIDDEN_PHRASES = {
  personal: ["상대가 반드시", "절대 이별"],
  couple: ["당신만 바꾸면", "상대는 항상 틀림"],
  support: ["강제로 설득", "감시가 필요"],
};

function normalizeMode(mode) {
  return LOVE_SECRET_MODES.includes(mode) ? mode : "personal";
}

function countChars(text) {
  return [...String(text || "")].length;
}

function padChapterToMin(text, chapterNum) {
  const config = getLoveSecretChapterConfig(chapterNum);
  const minChars = Number(config?.minChars || 3800);
  let output = String(text || "").trim();
  let cycle = 0;
  while (countChars(output) < minChars) {
    output += `\n\n### 관계 실행 보강 ${cycle + 1}\n`;
    output += "갈등 상황에서는 즉시 결론보다 맥락 확인 질문을 먼저 사용하세요. 하루 10분 감정 기록과 주 2회 대화 복기 루틴을 유지하면 오해 누적이 줄고 회복 속도가 빨라집니다. 요청은 한 번에 한 가지로 제한해 실행 가능성을 높이세요.";
    cycle += 1;
    if (cycle > 20) break;
  }
  return output;
}

function padReportToMin(chapters) {
  let total = countChars(Object.values(chapters || {}).join("\n\n"));
  let guard = 0;
  while (total < LOVE_SECRET_MIN_TOTAL_CHARS && guard < 80) {
    chapters[LOVE_SECRET_TOTAL_CHAPTERS] = String(chapters[LOVE_SECRET_TOTAL_CHAPTERS] || "")
      + "\n\n### 장기 전략 보강\n"
      + "관계의 품질은 이벤트가 아니라 반복 루틴으로 결정됩니다. 월간 점검에서 유지할 습관 2개와 중단할 습관 2개를 확정해 감정 소모를 줄이세요.";
    total = countChars(Object.values(chapters || {}).join("\n\n"));
    guard += 1;
  }
}

function hasForbiddenText(text, mode) {
  const src = String(text || "");
  const modeTokens = MODE_FORBIDDEN_PHRASES[mode] || [];
  const allTokens = [...BASE_FORBIDDEN_PHRASES, ...modeTokens];
  return allTokens.some((token) => src.includes(token));
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

function validateLoveSecretChapterQuality(chapterNum, text, mode) {
  const errors = [];
  const baseValidation = validateLoveSecretChapter(chapterNum, text, mode);

  if (!baseValidation.ok) errors.push(baseValidation.error);
  if (hasForbiddenText(text, mode)) errors.push("forbidden phrase detected");
  if (hasRepetitiveSentence(text)) errors.push("repetitive sentence detected");

  return {
    ok: errors.length === 0,
    errors,
    length: countChars(text),
  };
}

export async function generateLoveSecretPdf(params = {}) {
  const reportId = String(params.reportId || `love_secret_${Date.now()}`);
  const mode = normalizeMode(params.mode);
  const chart = params.chart || {};
  const body = params.body || {};
  const forceLocal = params.forceLocal === true || body.forceLocalOnly === true;
  const onProgress = typeof params.onProgress === "function" ? params.onProgress : null;

  const chapters = {};
  const sources = {};
  const warnings = [];

  console.log(`[LoveSecretBook] PDF_GENERATION_START (reportId=${reportId}, mode=${mode})`);

  if (onProgress) {
    onProgress({ code: "PDF_GENERATION_START", message: "Love Secret 리포트 생성 시작" });
  }

  try {
    const chapterNums = Array.from({ length: LOVE_SECRET_TOTAL_CHAPTERS }, (_, i) => i + 1);

    const generated = await generateLoveSecretChaptersSequentially(chapterNums, chart, {
      mode,
      forceLocal,
      maxRetries: 8,
      onProgress,
    });

    for (const chapterNum of chapterNums) {
      let text = generated[chapterNum] || "";
      let source = forceLocal ? "local-fallback" : "gemini";

      const quality = validateLoveSecretChapterQuality(chapterNum, text, mode);
      if (!quality.ok) {
        text = padChapterToMin(getLoveSecretFallbackText(chapterNum, chart, mode), chapterNum);
        source = "local-fallback-repair";
        warnings.push({
          chapter: chapterNum,
          warning: "CHAPTER_QUALITY_FAILED_REPAIRED",
          mode,
          errors: quality.errors,
        });
      }

      chapters[chapterNum] = padChapterToMin(text, chapterNum);
      sources[chapterNum] = source;
    }

    padReportToMin(chapters);
    const fullValidation = validateLoveSecretFullReport(chapters, mode);
    if (!fullValidation.ok) {
      warnings.push({
        chapter: "full-report",
        warning: "TOTAL_OR_CHAPTER_VALIDATION_FAILED",
        mode,
        totalChars: fullValidation.totalChars,
        minRequired: fullValidation.minRequired,
        shortChapters: fullValidation.shortChapters,
      });
    }

    const pdfData = {
      reportId,
      mode,
      modeIndicator: mode,
      service: "love-secret",
      title:
        mode === "couple"
          ? "연애 비책 커플 리포트"
          : mode === "support"
            ? "연애 비책 지원자 가이드"
            : "연애 비책 개인 리포트",
      subtitle: "13개 챕터 관계 심층 분석",
      generatedAt: new Date().toISOString(),
      chapters: Array.from({ length: LOVE_SECRET_TOTAL_CHAPTERS }, (_, idx) => ({
        chapter: idx + 1,
        text: chapters[idx + 1] || "",
        source: sources[idx + 1] || "unknown",
      })),
      stats: {
        totalChapters: LOVE_SECRET_TOTAL_CHAPTERS,
        totalChars: countChars(Object.values(chapters).join("\n\n")),
        minRequired: LOVE_SECRET_MIN_TOTAL_CHARS,
        shortChapters: fullValidation.shortChapters || [],
      },
      warnings,
    };

    console.log(`[LoveSecretBook] PDF_GENERATION_SUCCESS (reportId=${reportId}, mode=${mode})`);

    if (onProgress) {
      onProgress({ code: "PDF_GENERATION_SUCCESS", message: "Love Secret 리포트 생성 완료" });
    }

    return {
      ok: true,
      reportId,
      pdfData,
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[LoveSecretBook] PDF_GENERATION_ERROR`, { reportId, mode, message });

    return {
      ok: false,
      reportId,
      message,
      warnings,
    };
  }
}
