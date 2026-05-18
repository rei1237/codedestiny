import type { AstrologyEngineInput, NormalizedFortuneSignal } from "./types";

const elementToneMap: Record<string, string> = {
  fire: "작은 열정의 불씨",
  earth: "차분한 중심감",
  air: "생각의 환기",
  water: "감정의 물결",
};

export function normalizeFortuneSignal(input: AstrologyEngineInput): NormalizedFortuneSignal {
  const astro = input.astrologyData || {};
  const majorTheme = astro.majorTheme || "속도를 조절하며 내 리듬을 되찾는 흐름";
  const dominantElement = astro.dominantElement || "water";
  const elementTone = elementToneMap[dominantElement] || "부드러운 회복";

  const mainEnergy = astro.currentTransits?.[0] || `${input.zodiacSign}의 오늘은 ${elementTone}이 핵심입니다.`;
  const emotionalTheme =
    astro.moonSign ||
    "오늘의 별 흐름은 아주 선명하진 않지만, 지금 네 마음에는 잠깐 속도를 늦추라는 신호가 머무는 것 같아.";
  const cautionTheme =
    astro.tensionPlanet ||
    "정답을 빨리 내리려는 마음이 올라오면, 한 템포만 천천히 호흡해도 충분해.";
  const recoveryTheme =
    astro.luckyPlanet ||
    "작은 따뜻함을 먼저 챙길수록 오늘의 컨디션이 더 안정적으로 올라올 거야.";

  return {
    mainEnergy,
    emotionalTheme,
    cautionTheme,
    recoveryTheme,
    relationshipHint:
      astro.relationshipTheme ||
      "관계에서 답을 서두르기보다, 먼저 내 감정의 이름을 붙여보면 대화가 훨씬 부드러워져.",
    workHint:
      astro.workTheme ||
      "일은 크게 벌리기보다 가장 작은 한 칸부터 채우는 방식이 오늘의 집중을 지켜줘.",
    moneyHint:
      astro.moneyTheme ||
      "큰 소비 결정보다, 지금 결제하려는 이유를 한 번 적어보는 게 도움이 될 거야.",
    smallJoySeed: majorTheme,
  };
}
