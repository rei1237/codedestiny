import { lifeBookPremiumChapterPlanV1 } from "./life-book-chapters.js";
import { assembleFinalHtml } from "./life-book-html-renderer.js";

export function assembleLifeBookPremiumHtml({ input = {}, chapters = [], reportId = "", chapterPlan = null } = {}) {
  return assembleFinalHtml({
    input,
    chapters,
    reportId,
    chapterPlan: chapterPlan || lifeBookPremiumChapterPlanV1.chapters,
  });
}
