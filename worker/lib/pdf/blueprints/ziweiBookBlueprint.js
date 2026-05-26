import { ZIWEI_PDF_CHAPTERS } from "../../ziwei-pdf-pipeline.js";
import { createChapterBlueprint, mapSimpleChapters } from "./_template.js";

export const ziweiBookBlueprint = createChapterBlueprint({
  featureKey: "jamidusu_premium",
  reportType: "ziweiPremium",
  mode: "personal",
  chapters: mapSimpleChapters((Array.isArray(ZIWEI_PDF_CHAPTERS) ? ZIWEI_PDF_CHAPTERS : []).map((row) => row?.title)),
  rotatingMessages: ["12궁 핵심 신호를 정리하고 있습니다.", "자미두수 전략 문장을 구성하고 있습니다."],
});
