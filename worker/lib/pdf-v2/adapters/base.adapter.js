import { getPremiumPdfV2ChapterPlan } from "../chapter-plans.js";
import { validateNormalizedDataByChapterPlan } from "../validation.js";

export function createPremiumPdfAdapter({ pdfType, runEngine, normalize }) {
  return {
    pdfType,
    async runEngine(input) {
      if (typeof runEngine !== "function") {
        throw new Error(`Adapter(${pdfType}) runEngine is not configured.`);
      }
      return runEngine(input);
    },
    async normalize(engineResult, input) {
      if (typeof normalize !== "function") {
        throw new Error(`Adapter(${pdfType}) normalize is not configured.`);
      }
      return normalize(engineResult, input);
    },
    getChapterPlan(mode = "") {
      return getPremiumPdfV2ChapterPlan(pdfType, mode);
    },
    validate(normalizedData, mode = "") {
      const chapterPlan = getPremiumPdfV2ChapterPlan(pdfType, mode);
      return validateNormalizedDataByChapterPlan(normalizedData, chapterPlan);
    },
  };
}
