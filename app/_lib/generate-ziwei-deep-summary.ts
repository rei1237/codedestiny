import { palaceVoice } from "./ziwei-consultation-narrative";
import { ZIWEI_PALACE_NAME, ZIWEI_PALACE_ORDER } from "./ziwei-types";
import { ZiweiDeepChart, ZiweiDeepSummary, ZiweiPalace } from "./ziwei-types";

function palaceScore(palace: ZiweiPalace): number {
  let score = 50;
  score += palace.mainStars.length * 8;
  score += palace.auxiliaryStars.length * 3;
  score -= palace.maleficStars.length * 5;
  if (palace.sihua.includes("화록")) score += 5;
  if (palace.sihua.includes("화권")) score += 4;
  if (palace.sihua.includes("화과")) score += 3;
  if (palace.sihua.includes("화기")) score -= 6;
  return Math.max(10, Math.min(95, score));
}

function keywordsOf(palace: ZiweiPalace): string[] {
  const base = [...palace.keywords];
  if (!base.length) {
    base.push("균형", "관리", "타이밍");
  }
  if (palace.sihua.includes("화록")) base.push("확장");
  if (palace.sihua.includes("화권")) base.push("주도권");
  if (palace.sihua.includes("화기")) base.push("점검");
  return Array.from(new Set(base)).slice(0, 5);
}

export function generateZiweiDeepSummary(chart: Omit<ZiweiDeepChart, "summary">): ZiweiDeepSummary {
  const scored = chart.palaces.map((p) => ({ palace: p, score: palaceScore(p) }));
  const strongest = scored.reduce((acc, cur) => (cur.score > acc.score ? cur : acc), scored[0]);
  const weakest = scored.reduce((acc, cur) => (cur.score < acc.score ? cur : acc), scored[0]);
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const lifePalace = chart.palaces.find((p) => p.id === "ming") || strongest.palace;
  const bodyPalace = chart.palaces.find((p) => p.earthlyBranch === chart.shenGong) || chart.palaces.find((p) => p.id === "travel") || strongest.palace;
  const huajiPalace = chart.palaces.find((palace) =>
    palace.fourTransformations.some((item) => item.type === "기") ||
    palace.incomingFourTransformations.some((item) => item.type === "기"),
  ) || weakest.palace;

  const globalKeywords = new Set<string>();
  sorted
    .slice(0, 4)
    .forEach(({ palace }) => {
      keywordsOf(palace).forEach((k) => globalKeywords.add(k));
    });

  const strengthHints = [lifePalace, bodyPalace, strongest.palace].map(palace => palaceVoice(palace).gift + '이 당신의 장점입니다.');
  const weaknessHints = [weakest.palace, huajiPalace].map(palace => palaceVoice(palace).burden + '이 반복될 때에는 잠시 쉬어가도 괜찮습니다.');

  const matrix = ZIWEI_PALACE_ORDER.map((id) => {
    const palace = chart.palaces.find((p) => p.id === id) || chart.palaces[0];
    return {
      palaceId: palace.id,
      palaceName: ZIWEI_PALACE_NAME[palace.id],
      mainStars: palace.mainStars.map((s) => s.name),
      keywords: keywordsOf(palace),
      score: palaceScore(palace),
    };
  });

  return {
    keywords: Array.from(globalKeywords).slice(0, 5),
    strongestPalaceId: strongest.palace.id,
    weakestPalaceId: weakest.palace.id,
    direction: palaceVoice(lifePalace).headline,
    strengths: strengthHints,
    weaknesses: weaknessHints,
    openingCondition: palaceVoice(lifePalace).scene,
    decisionRule: palaceVoice(huajiPalace).action,
    palaceMatrix: matrix,
  };
}
