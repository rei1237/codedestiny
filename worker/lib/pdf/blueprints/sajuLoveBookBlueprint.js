import { LOVE_SECRET_MODE_CONFIG } from "../../saju-premium-chapters.js";
import { createChapterBlueprint, mapSimpleChapters } from "./_template.js";

const soloChapters = mapSimpleChapters(LOVE_SECRET_MODE_CONFIG.solo.chapters.map((row) => row?.title));
const compatibilityChapters = mapSimpleChapters(LOVE_SECRET_MODE_CONFIG.couple.chapters.map((row) => row?.title));

export const sajuLoveBookBlueprint = Object.freeze({
  personal: createChapterBlueprint({
    featureKey: "saju_love_secret",
    reportType: "loveSecret",
    mode: "personal",
    chapters: soloChapters,
    rotatingMessages: ["연애 패턴을 분석하고 있습니다.", "관계 운영 전략을 구성하고 있습니다."],
  }),
  compatibility: createChapterBlueprint({
    featureKey: "saju_love_secret",
    reportType: "loveSecret",
    mode: "compatibility",
    chapters: compatibilityChapters,
    rotatingMessages: ["두 사람의 상호작용을 분석하고 있습니다.", "회복 전략을 구성하고 있습니다."],
  }),
});
