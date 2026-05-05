import { ZiweiChapterValidation, ZiweiDeepChart, ZiweiDeepChapter, ZiweiSectionId } from "./ziwei-types";

export interface ZiweiChartValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateZiweiChart(chart: ZiweiDeepChart): ZiweiChartValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

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

  chart.palaces.forEach((p) => {
    if (!p.mainStars.length) {
      warnings.push(`${p.name}의 주성이 비어 있어 보수적으로 해석합니다.`);
    }
    if (!p.sihua.length) {
      warnings.push(`${p.name}의 사화 정보가 없어 기본 해석만 제공합니다.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateZiweiChapter(sectionId: ZiweiSectionId, chapter: ZiweiDeepChapter): ZiweiChapterValidation {
  const issues: string[] = [];
  if (!chapter.title?.trim()) issues.push(`${sectionId} 제목 누락`);
  if (!chapter.fullText?.trim()) issues.push(`${sectionId} 본문 누락`);
  if (chapter.fullText.length < 3200) issues.push(`${sectionId} 본문이 너무 짧습니다`);
  if (!chapter.actionItems.length) issues.push(`${sectionId} 실천 항목 누락`);

  return {
    isValid: issues.length === 0,
    issues,
  };
}
