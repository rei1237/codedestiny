import { createChapterBlueprint, mapSimpleChapters } from "./_template.js";

const titles = [
  "차트 핵심 총론",
  "태양과 삶의 방향",
  "달과 감정 구조",
  "상승궁과 1하우스",
  "수성·금성·화성",
  "커리어와 사회적 역할",
  "사랑과 관계",
  "돈과 재능",
  "위기와 변형",
  "최종 인생 전략",
];

export const westernAstroBookBlueprint = createChapterBlueprint({
  featureKey: "astrology_premium",
  reportType: "westernAstrologyPremium",
  mode: "personal",
  chapters: mapSimpleChapters(titles),
  rotatingMessages: ["태양/달/상승궁을 분석하고 있습니다.", "점성술 전략 문장을 구성하고 있습니다."],
});
