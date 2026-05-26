/**
 * 자미두수 프리미엄 12챕터 PDF 생성 (세부 카테고리별 LLM 호출)
 *
 * 흐름:
 * 1. 입력 검증 및 접근 권한 확인
 * 2. 자미두수 명반 계산 및 canonical 구성
 * 3. 모든 12챕터 × 5섹션 순차 생성
 * 4. 하나라도 실패하면 전체 중단 (재시도 가능 상태로 반환)
 * 5. 모두 성공 시 PDF 렌더링 및 반환
 */

import { json } from "../lib/http.js";
import { generateZiweiSectionWithLLM, generateZiweiChapterFromSections } from "../lib/ziwei-premium-section-generator.js";
import { ZIWEI_PREMIUM_12_CHAPTERS, getZiweiPremiumChapterByNo } from "../lib/ziwei-premium-book-structure.js";

/**
 * 12챕터 모두를 순차적으로 생성
 * - 각 챕터의 5개 섹션을 모두 LLM으로 생성
 * - 하나라도 실패하면 전체 실패 (재시도 가능)
 */
export async function generateZiweiPremium12ChaptersSequential(env, input) {
  const {
    userProfile,
    targetPalaceData,
    starNames,
    canonicalZiweiChart,
    reportPayload,
    ownerUserId,
    requestId,
    reportId,
  } = input;

  const generatedChapters = [];
  const failedChapters = [];

  // 모든 12챕터를 순차 생성
  for (let chapterNo = 1; chapterNo <= 12; chapterNo++) {
    const chapter = getZiweiPremiumChapterByNo(chapterNo);
    if (!chapter) {
      console.error("[ZiweiBook.InvalidChapterNo]", { chapterNo });
      failedChapters.push({
        chapterNo,
        errorCode: "INVALID_CHAPTER_NO",
      });
      continue;
    }

    // 해당 챕터의 모든 섹션 생성
    const chapterInput = {
      chapter,
      sections: chapter.sections,
      userProfile,
      targetPalaceData: {
        name: chapter.targetPalace,
        ...targetPalaceData,
      },
      starNames,
      canonicalZiweiChart,
      reportPayload,
    };

    const chapterResult = await generateZiweiChapterFromSections(env, chapterInput);

    if (!chapterResult.ok) {
      console.warn("[ZiweiBook.ChapterGenerationFailed]", {
        chapterNo,
        code: chapterResult.code,
        failedSections: chapterResult.failedSections,
      });

      failedChapters.push({
        chapterNo,
        code: chapterResult.code,
        message: chapterResult.message,
        failedSections: chapterResult.failedSections,
      });

      // 하나라도 실패하면 전체 중단
      break;
    }

    // 챕터 생성 성공
    console.info("[ZiweiBook.ChapterGenerationSuccess]", {
      chapterNo,
      sectionCount: chapterResult.generatedSections.length,
      totalLength: chapterResult.totalLength,
    });

    generatedChapters.push({
      chapterNo,
      chapterId: chapter.chapterId,
      chapterTitle: chapter.title,
      sections: chapterResult.generatedSections,
      totalLength: chapterResult.totalLength,
    });
  }

  // 하나라도 실패했으면 전체 실패
  if (failedChapters.length > 0) {
    console.warn("[ZiweiBook.PartialGenerationFailed]", {
      totalChapters: 12,
      successCount: generatedChapters.length,
      failedCount: failedChapters.length,
      failedChapters,
    });

    return {
      ok: false,
      code: "ZIWEI_PARTIAL_GENERATION_FAILED",
      message: "자미두수 PDF 본문 생성 중 일부 챕터가 완성되지 않았습니다. 결제는 중복 차감되지 않도록 보호되며, 다시 생성할 수 있습니다.",
      successCount: generatedChapters.length,
      failedCount: failedChapters.length,
      failedChapters,
      retryable: true,
      reportId,
      requestId,
    };
  }

  // 모두 성공
  console.info("[ZiweiBook.All12ChaptersSuccess]", {
    totalChapters: 12,
    totalSections: generatedChapters.reduce((sum, ch) => sum + ch.sections.length, 0),
    totalLength: generatedChapters.reduce((sum, ch) => sum + ch.totalLength, 0),
  });

  return {
    ok: true,
    code: "ZIWEI_ALL_CHAPTERS_GENERATED",
    chapters: generatedChapters,
    totalChapters: 12,
    totalLength: generatedChapters.reduce((sum, ch) => sum + ch.totalLength, 0),
    reportId,
    requestId,
  };
}

/**
 * LLM 생성 실패 시 반환할 사용자 친화적 응답
 */
export function buildZiweiLLMFailureResponse(failureData) {
  return {
    ok: false,
    code: "ZIWEI_LLM_GENERATION_FAILED",
    message: "자미두수 PDF 본문 생성 중 일부 챕터가 완성되지 않았습니다. 결제는 중복 차감되지 않도록 보호되며, 다시 생성할 수 있습니다.",
    failedChapters: failureData.failedChapters,
    successCount: failureData.successCount,
    totalChapters: 12,
    retryable: true,
    reportId: failureData.reportId,
    requestId: failureData.requestId,
  };
}

/**
 * 12챕터 생성 성공 시 반환할 응답
 */
export function buildZiweiGenerationSuccessResponse(generationData) {
  return {
    ok: true,
    code: "ZIWEI_ALL_CHAPTERS_GENERATED",
    chapters: generationData.chapters,
    totalChapters: 12,
    totalLength: generationData.totalLength,
    reportId: generationData.reportId,
    requestId: generationData.requestId,
  };
}
