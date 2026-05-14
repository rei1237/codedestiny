import { PREMIUM_PDF_V2_SYSTEM_PROMPT } from "./system-prompt.js";
import { getPremiumPdfV2ChapterPlan } from "../chapter-plans.js";

function stringifyPayload(data) {
  try {
    return JSON.stringify(data || {}, null, 2);
  } catch {
    return "{}";
  }
}

export function buildPromptTemplatesForReportType(reportType, mode = "") {
  const chapterPlans = getPremiumPdfV2ChapterPlan(reportType, mode);

  return chapterPlans.map((chapterPlan) => ({
    promptTemplateId: chapterPlan.promptTemplateId,
    title: chapterPlan.title,
    purpose: `${chapterPlan.title}의 목적에 맞춰 제공 데이터 기반 해석문을 작성한다.`,
    systemPrompt: PREMIUM_PDF_V2_SYSTEM_PROMPT,
    userPromptBuilder: (data) => {
      const payload = {
        pdfType: reportType,
        chapter: {
          chapterId: chapterPlan.chapterId,
          title: chapterPlan.title,
          purpose: `${chapterPlan.title}의 핵심 데이터 신호를 해석한다.`,
        },
        normalizedData: data,
        writingRules: {
          minChars: chapterPlan.minChars,
          maxChars: chapterPlan.maxChars,
          tone: "전문적이지만 이해하기 쉬운 프리미엄 상담 문체",
          avoid: [
            "데이터가 없어 기본 해석만 제공합니다",
            "일반적으로",
            "추측됩니다만",
          ],
        },
      };
      return stringifyPayload(payload);
    },
  }));
}
