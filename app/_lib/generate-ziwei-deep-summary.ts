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

  const globalKeywords = new Set<string>();
  scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .forEach(({ palace }) => {
      keywordsOf(palace).forEach((k) => globalKeywords.add(k));
    });

  const strengthHints = [
    "기준을 세워 꾸준히 실행할 때 성과가 복리로 누적됩니다.",
    "관계와 성과를 동시에 챙기는 조정 능력이 강점입니다.",
    "복잡한 문제를 구조화해 해결하는 집중력이 좋습니다.",
  ];
  const weaknessHints = [
    "중요 결정을 급하게 내리면 반복 손실이 생길 수 있습니다.",
    "과책임 패턴이 누적되면 건강과 관계 피로가 함께 올라갑니다.",
    "확장 속도 대비 회복 루틴이 부족하면 리듬이 무너질 수 있습니다.",
  ];

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
    direction:
      "이 명반은 단기 승부보다 기준 중심의 장기 설계에서 운이 열립니다. 속도보다 구조를 먼저 세울수록 인생 전반의 변동성이 줄어듭니다.",
    strengths: strengthHints,
    weaknesses: weaknessHints,
    openingCondition:
      "핵심 목표를 3개 이하로 유지하고, 주간 점검 루틴을 지키면 막혔던 흐름이 다시 열립니다.",
    decisionRule:
      "감정이 고조된 날에는 결정하지 않고, 하루 뒤 기록을 근거로 최종 판단하세요.",
    palaceMatrix: matrix,
  };
}
