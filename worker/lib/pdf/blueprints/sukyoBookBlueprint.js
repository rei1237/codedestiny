import { getSukyoPdfChapters } from "../../sukyo-pdf.js";
import { createChapterBlueprint, mapSimpleChapters } from "./_template.js";

export const sukyoBookBlueprint = Object.freeze({
  personal: createChapterBlueprint({
    featureKey: "sookyo_premium",
    reportType: "sookyoPremium",
    mode: "personal",
    chapters: mapSimpleChapters(getSukyoPdfChapters("solo").map((row) => row?.title)),
    rotatingMessages: ["숙요 성향을 분석하고 있습니다.", "관계 운영 전략을 구성하고 있습니다."],
  }),
  compatibility: createChapterBlueprint({
    featureKey: "sookyo_premium",
    reportType: "sookyoPremium",
    mode: "compatibility",
    chapters: mapSimpleChapters(getSukyoPdfChapters("compatibility").map((row) => row?.title)),
    rotatingMessages: ["두 사람의 관계 역학을 분석하고 있습니다.", "갈등 회복 전략을 구성하고 있습니다."],
  }),
});
