import { buildLifeBookChapterPlan } from "../../saju/life-book/chapterConfig.js";
import { createChapterBlueprint, mapSimpleChapters } from "./_template.js";

const chapters = mapSimpleChapters(buildLifeBookChapterPlan().map((row) => row?.title));

export const sajuLifeBookBlueprint = createChapterBlueprint({
  featureKey: "saju_life_book",
  reportType: "lifeBook",
  mode: "personal",
  chapters,
  rotatingMessages: [
    "원국의 뼈대를 정리하고 있습니다.",
    "대운 흐름을 실행 전략으로 연결하고 있습니다.",
    "챕터별 핵심 조언을 구성하고 있습니다.",
  ],
});
