import { ZIWEI_PALACE_NAME, ZIWEI_PALACE_ORDER } from "./ziwei-types";
import { ZiweiDeepChart, ZiweiDeepSummary, ZiweiPalace } from "./ziwei-types";
import { transformationTypeToLabel } from "./ziwei-advanced-normalization";

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

function starNames(stars: ZiweiPalace["mainStars"], fallback = "연결궁 별"): string {
  const names = stars.map((star) => star.name).filter(Boolean);
  return names.length ? names.join("·") : fallback;
}

function sihuaText(palace: ZiweiPalace): string {
  const direct = palace.fourTransformations.map((item) => `${item.starName} ${transformationTypeToLabel(item.type)}`);
  const incoming = palace.incomingFourTransformations.map((item) => `${item.starName} ${transformationTypeToLabel(item.type)} 유입`);
  const rows = [...direct, ...incoming];
  return rows.length ? rows.slice(0, 3).join(", ") : "직접 사화보다 삼방사정 흐름";
}

function oppositeText(palace: ZiweiPalace): string {
  const oppositeName = palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId];
  const oppositeStars = starNames(palace.oppositePalace?.mainStars || [], "대궁 보정");
  const triad = palace.sanFangSiZheng?.palaceNames?.length
    ? palace.sanFangSiZheng.palaceNames.slice(0, 3).join("·")
    : palace.triadPalaceIds.map((id) => ZIWEI_PALACE_NAME[id]).join("·");
  return `${oppositeName}(${oppositeStars})과 삼방 ${triad}`;
}

function palaceEvidence(palace: ZiweiPalace): string {
  const empty = palace.isEmptyMainStarPalace ? "무주성궁이라 " : "";
  return `${palace.name}은 ${empty}${starNames(palace.mainStars)} 축에 ${sihuaText(palace)}가 겹치고, ${oppositeText(palace)}에서 실제 사건성이 보정됩니다.`;
}

export function generateZiweiDeepSummary(chart: Omit<ZiweiDeepChart, "summary">): ZiweiDeepSummary {
  const scored = chart.palaces.map((p) => ({ palace: p, score: palaceScore(p) }));
  const strongest = scored.reduce((acc, cur) => (cur.score > acc.score ? cur : acc), scored[0]);
  const weakest = scored.reduce((acc, cur) => (cur.score < acc.score ? cur : acc), scored[0]);
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const topThree = sorted.slice(0, 3).map(({ palace, score }) => `${palace.name} ${Math.round(score)}점(${starNames(palace.mainStars)})`);
  const careThree = [...scored]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(({ palace, score }) => `${palace.name} ${Math.round(score)}점(${palace.isEmptyMainStarPalace ? "차성" : sihuaText(palace)})`);
  const lifePalace = chart.palaces.find((p) => p.id === "ming") || strongest.palace;
  const bodyPalace = chart.palaces.find((p) => p.earthlyBranch === chart.shenGong) || chart.palaces.find((p) => p.id === "travel") || strongest.palace;
  const annualPalaces = (chart.annualFlow?.keyPalaces || [])
    .map((id) => chart.palaces.find((p) => p.id === id))
    .filter(Boolean) as ZiweiPalace[];
  const annualText = annualPalaces.length
    ? annualPalaces.map((palace) => `${palace.name}(${starNames(palace.mainStars)})`).join(", ")
    : `${strongest.palace.name} 중심`;
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

  const strengthHints = [
    `${palaceEvidence(strongest.palace)} 이 영역은 결과를 먼저 만들 수 있는 확장축입니다.`,
    `${palaceEvidence(lifePalace)} 명궁 판단은 성격 설명이 아니라 선택 습관과 자기방어 방식을 같이 봐야 정확합니다.`,
    `${palaceEvidence(bodyPalace)} 신궁 흐름은 후천적 행동 패턴으로 읽어 실제 생활에서 반복되는 선택을 드러냅니다.`,
  ];
  const weaknessHints = [
    `${palaceEvidence(weakest.palace)} 이 영역은 점수가 낮다는 뜻보다 먼저 계약·말·일정·경계선을 정리해야 하는 관리축입니다.`,
    `${palaceEvidence(huajiPalace)} 화기 신호는 막힘이 아니라 반복 과제가 모이는 자리이므로 문서화와 보류 규칙이 필요합니다.`,
    `올해 유년은 ${annualText}에서 체감됩니다. 해당 궁의 사건을 기본 명반처럼 고정값으로 보지 말고, 올해 움직이는 압력으로 분리해 읽어야 합니다.`,
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
      `읽는 순서는 이렇게 잡으세요. 먼저 명궁(命宮)으로 타고난 성향을, 신궁(身宮)으로 후천에 길러지는 힘을 보고, 그다음 질문과 가까운 핵심 궁과 삼방사정(三方四正)으로 관계의 흐름을 읽으면 명반이 한 장의 지도처럼 이어집니다. 이 심화 명반은 ${topThree.join(" / ")}를 확장축으로 쓰고, ${careThree.join(" / ")}를 관리축으로 분리할 때 가장 정확해집니다. 기본 자미두수처럼 12궁 배치만 보는 단계가 아니라, 주성·사화·삼방사정·차성을 한 판단으로 묶어 읽어야 합니다.`,
    strengths: strengthHints,
    weaknesses: weaknessHints,
    openingCondition:
      `${strongest.palace.name}의 강점을 먼저 결과물로 만들고, ${weakest.palace.name}의 약점은 감정으로 버티지 말고 체크리스트와 역할 경계로 관리하세요.`,
    decisionRule:
      `${huajiPalace.name}에서 화기·약세 신호가 올라오는 날에는 즉시 결론을 내리지 말고, ${oppositeText(huajiPalace)}의 보정 근거를 확인한 뒤 24시간 뒤에 결정하세요.`,
    palaceMatrix: matrix,
  };
}
