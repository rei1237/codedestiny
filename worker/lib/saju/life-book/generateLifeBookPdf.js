import {
  LIFE_BOOK_CHAPTERS,
  LIFE_BOOK_TOTAL_CHAPTERS,
  getLifeBookChapterByNumber,
} from "./chapterConfig.js";
import { buildLifeBookInputData } from "./buildLifeBookInputData.js";
import { generateLifeBookChapter } from "./generateLifeBookChapter.js";
import { renderLifeBookPdf } from "./renderLifeBookPdf.js";

function isStrictMissingCore(lifeBookInputData) {
  const missingCore = Array.isArray(lifeBookInputData?.dataQuality?.missingCore)
    ? lifeBookInputData.dataQuality.missingCore
    : [];
  return {
    ok: missingCore.length === 0,
    missingCore,
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

  if (onProgress) onProgress({ code: "CALCULATING_SAJU", message: "사주 명식 계산 중" });

  const lifeBookInputData = buildLifeBookInputData(body, normalizedInput);
  const strictCheck = isStrictMissingCore(lifeBookInputData);

  if (strictMode && !strictCheck.ok) {
    warnings.push({
      chapterId: "input",
      warning: "STRICT_MISSING_CORE_DEGRADED_TO_FALLBACK",
      validation: { missingCore: strictCheck.missingCore },
    });
  }

  if (onProgress) onProgress({ code: "NORMALIZING_INPUT", message: "인생의 책 데이터 정리 중" });

  const targetChapters = requestedChapter >= 1
    ? [getLifeBookChapterByNumber(requestedChapter)]
    : [...LIFE_BOOK_CHAPTERS];

  const chapters = [];

  for (let index = 0; index < targetChapters.length; index += 1) {
    const chapterConfig = targetChapters[index];
    if (onProgress) {
      onProgress({
        code: "GENERATING_CHAPTER",
        chapter: chapterConfig,
        message: `${chapterConfig.roman} 챕터 생성 중`,
      });
    }

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
    });

    if (!generated?.ok) {
      const fallbackGenerated = await generateLifeBookChapter({
        env,
        chapterConfig,
        lifeBookInputData,
        strictMode: false,
        maxRetries: 0,
        previousTexts: [
          ...previousTexts,
          ...chapters.map((c) => c.contentMarkdown || ""),
        ],
      });

      if (!fallbackGenerated?.ok || !fallbackGenerated?.chapterResult) {
        return {
          ok: false,
          code: generated?.code || "LIFEBOOK_CHAPTER_GENERATION_FAILED",
          message: generated?.message || `챕터 생성 실패: ${chapterConfig.id}`,
          detail: generated?.validation || null,
        };
      }

      chapters.push(fallbackGenerated.chapterResult);
      warnings.push({
        chapterId: chapterConfig.id,
        warning: "STRICT_FAILURE_DEGRADED_TO_FALLBACK",
        validation: generated?.validation || null,
      });
      continue;
    }

    chapters.push(generated.chapterResult);

    if (generated.usedFallback) {
      warnings.push({
        chapterId: chapterConfig.id,
        warning: "FALLBACK_CHAPTER_APPLIED",
        validation: generated.validation || null,
      });
    }
  }

  if (requestedChapter >= 1) {
    return {
      ok: true,
      reportId,
      totalChapters: LIFE_BOOK_TOTAL_CHAPTERS,
      lifeBookInputData,
      chapters,
      warnings,
    };
  }

  if (onProgress) onProgress({ code: "RENDERING_PDF", message: "PDF 편집 중" });

  const rendered = renderLifeBookPdf({
    reportId,
    lifeBookInputData,
    chapters,
    generatedAt: new Date().toISOString(),
  });

  if (onProgress) onProgress({ code: "PDF_READY", message: "다운로드 준비 완료" });

  return {
    ok: true,
    reportId,
    totalChapters: LIFE_BOOK_TOTAL_CHAPTERS,
    lifeBookInputData,
    chapters,
    warnings,
    rendered,
  };
}
