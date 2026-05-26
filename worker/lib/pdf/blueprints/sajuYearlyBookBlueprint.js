import { SAJU_NEW_YEAR_CHAPTERS } from "../../saju-premium-chapters.js";
import { createChapterBlueprint, mapSimpleChapters } from "./_template.js";

export const sajuYearlyBookBlueprint = createChapterBlueprint({
  featureKey: "saju_new_year_pdf",
  reportType: "sajuNewYear",
  mode: "personal",
  chapters: mapSimpleChapters(SAJU_NEW_YEAR_CHAPTERS.map((row) => row?.title)),
  rotatingMessages: ["연간 기조를 분석하고 있습니다.", "월별 전략을 구성하고 있습니다."],
});
