import { astrologyPremiumChapterPlanV2 } from "./astrology-premium.chapter-plan.js";
import { assembleFinalHtml } from "./astrology-html-renderer.js";

export function assembleAstrologyPremiumHtml({ input = {}, chapters = [], reportId = "", chapterPlan = astrologyPremiumChapterPlanV2 } = {}) {
  return assembleFinalHtml({ input, chapters, reportId, chapterPlan });
}
