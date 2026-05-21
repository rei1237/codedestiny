import {
  LIFE_BOOK_CHAPTERS,
  LIFE_BOOK_MIN_TOTAL_CHARS,
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
      return {
        ok: false,
        code: generated?.code || "LIFEBOOK_CHAPTER_GENERATION_FAILED",
        message: generated?.message || `챕터 생성 실패: ${chapterConfig.id}`,
        detail: generated?.validation || null,
      };
    }

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
    return {
      ok: true,
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
    chapterMemories,
    warnings,
    fullValidation,
    rendered,
  };
}
