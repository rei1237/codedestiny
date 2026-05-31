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
    "당신은 마음이 흔들려도 결국 기준을 다시 세우는 힘이 있습니다.",
    "사람과 일 사이에서 균형을 잡으며 분위기를 정리하는 감각이 살아 있습니다.",
    "복잡한 상황을 한 번에 다루기보다, 핵심부터 차근차근 풀어내는 힘이 좋습니다.",
  ];
  const weaknessHints = [
    "급한 마음으로 답을 정하면 나중에 같은 문제를 다시 마주하기 쉽습니다.",
    "남의 기대를 오래 떠안으면 몸보다 먼저 마음이 지칩니다.",
    "잘 되는 시기일수록 쉬는 법을 함께 붙잡아야 흐름이 오래 갑니다.",
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
      "이 명반은 급하게 밀어붙일수록 흔들리고, 마음의 기준을 세워 천천히 쌓을수록 빛이 커집니다. 사람, 일, 돈, 회복을 한 줄로 묶어 바라볼 때 당신의 길이 가장 선명해집니다.",
    strengths: strengthHints,
    weaknesses: weaknessHints,
    openingCondition:
      "지금은 모든 것을 바꾸려 하기보다 정말 중요한 것 셋만 남기고, 그 셋을 조용히 지키는 쪽이 맞습니다.",
    decisionRule:
      "마음이 흔들리는 날에는 결론을 미루고, 하루 뒤의 기분과 몸 상태를 함께 본 뒤 움직이세요.",
    palaceMatrix: matrix,
  };
}
