import { ZiweiChapterValidation, ZiweiDeepChart, ZiweiDeepChapter, ZiweiSectionId } from "./ziwei-types";
import { validateNoZiweiDebugPhrases, validateZiweiDeepReading } from "./ziwei-deep-reading";

export interface ZiweiChartValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  debugWarnings: string[];
}

export function validateZiweiChart(chart: ZiweiDeepChart): ZiweiChartValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const debugWarnings: string[] = [];

  if (!chart.user.birthYear || !chart.user.birthMonth || !chart.user.birthDay) {
    errors.push("생년월일 누락으로 명반 계산이 완료되지 않았습니다.");
  }
  if (!chart.user.gender) {
    errors.push("성별 누락으로 분석을 진행할 수 없습니다.");
  }
  if (!chart.mingGong) {
    errors.push("명궁 계산에 실패했습니다.");
  }
  if (!chart.shenGong) {
    warnings.push("신궁 계산이 제한되어 명궁 중심 해석으로 대체됩니다.");
  }
  if (!Array.isArray(chart.palaces) || chart.palaces.length !== 12) {
    errors.push("12궁 데이터가 완전하지 않습니다.");
  }

  (chart.palaces || []).forEach((p, index) => {
    if (!p) {
      debugWarnings.push(`palaces[${index}] 객체 누락`);
      return;
    }
    if (!p.name) {
      debugWarnings.push(`palaces[${index}].name 누락`);
    }
    if (!p.branch && !p.earthlyBranch) {
      debugWarnings.push(`palaces[${index}].branch 누락`);
    }
    if (p.mainStars === undefined || p.mainStars === null) {
      debugWarnings.push(`palaces[${index}].mainStars 누락`);
    }
    if (p.fourTransformations === undefined || p.fourTransformations === null) {
      debugWarnings.push(`palaces[${index}].fourTransformations 누락`);
    }
    // 무주성궁(mainStars.length === 0)과 직접 사화 없음(fourTransformations.length === 0)은 정상 구조다.
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    debugWarnings,
  };
}

export function validateZiweiChapter(sectionId: ZiweiSectionId, chapter: ZiweiDeepChapter): ZiweiChapterValidation {
  const issues: string[] = [];
  if (!chapter.title?.trim()) issues.push(`${sectionId} 제목 누락`);
  if (!chapter.fullText?.trim()) issues.push(`${sectionId} 본문 누락`);
  if (!chapter.actionItems.length) issues.push(`${sectionId} 실천 항목 누락`);

  const debugValidation = validateNoZiweiDebugPhrases(`${chapter.title}\n${chapter.summary.join(" ")}\n${chapter.fullText}`);
  issues.push(...debugValidation.issues);

  const deepValidation = validateZiweiDeepReading(chapter);
  issues.push(...deepValidation.issues);

  if (chapter.palaceReading && chapter.palaceReading.categories.length < 8) {
    issues.push(`${sectionId} 카테고리 수 부족`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
