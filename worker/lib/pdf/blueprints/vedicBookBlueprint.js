import { VEDIC_PDF_CHAPTERS } from "../../vedic-premium-chapters.js";
import { createChapterBlueprint, mapSimpleChapters } from "./_template.js";

export const vedicBookBlueprint = createChapterBlueprint({
  featureKey: "vedic_premium",
  reportType: "vedicPremium",
  mode: "personal",
  chapters: mapSimpleChapters((Array.isArray(VEDIC_PDF_CHAPTERS) ? VEDIC_PDF_CHAPTERS : []).map((row) => row?.title)),
  rotatingMessages: ["라그나와 나크샤트라를 정리하고 있습니다.", "다샤 기반 전략을 구성하고 있습니다."],
});
