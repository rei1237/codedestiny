// 자미두수 LLM 해석이 궁·별을 만나자마자 개별 결론부터 내지 않고, 먼저 명반 전체를 종합해
// "이 사람은 기본적으로 어떤 사람인가"를 판단한 뒤 그 성향을 전제로 나머지 분석(재물·연애·
// 직업·인간관계·건강·대운/세운 등)을 이어가도록 만드는 공유 지침 블록이다.
// LLM 실호출은 하지 않는다 — 계산은 "같은 성향 태그가 몇 곳에서 반복되는가"까지만 하고,
// 실제 심리 해석·서술은 이 지침을 받는 각 프롬프트의 LLM이 한다.

// 반복 신호 탐지용 최소 태그 표. 자미두수 정통 해석을 대신하지 않는다 — "이 별이 곧 이 성격"이라는
// 사전식 단정을 코드가 만들지 않도록 태그는 5~8개 수준의 느슨한 방향성만 준다. 최종 통합 해석은
// 항상 LLM이 궁·강약·사화·삼방사정을 함께 봐서 판단한다.
const TRAIT_TAGS = Object.freeze({
  천기: ["분석적"], 문창: ["분석적"], 문곡: ["분석적"], 태음: ["분석적", "섬세함"],
  천동: ["온화함"], 천량: ["온화함", "책임감"],
  자미: ["자기주장"], 무곡: ["자기주장", "책임감"], 칠살: ["자기주장"], 파군: ["자기주장"],
  경양: ["강한 기질"], 화성: ["강한 기질", "실행력"], 타라: ["예민함"], 영성: ["예민함", "실행력"],
  지공: ["경계심"], 지겁: ["경계심"],
  태양: ["사교성"], 우필: ["사교성"], 좌보: ["사교성"],
  천부: ["책임감"], 거문: ["예민함"], 탐랑: ["실행력"], 천요: ["섬세함"],
});

function palaceStars(palace) {
  if (!palace) return [];
  return [...(palace.mainStars || []), ...(palace.assistantStars || []), ...(palace.maleficStars || [])];
}

// 명궁·신궁·삼방사정·사화가 앉은 궁, 이 네 자리 중 둘 이상에서 같은 태그가 나오면 "반복 신호"로 본다.
// chart 는 calculateZiweiAiChart() 원본 형태(bodyPalace, sanFangSiZheng.byPalace)뿐 아니라
// worker/routes/neo-operation-room.js 의 summarizeZiwei() 가 재구성한 형태(shenGong,
// sanFangSiZheng.lifePalace)도 들어올 수 있어 두 키 이름을 모두 받는다.
function collectRepeatedTraitSignals(chart) {
  const palaces = Array.isArray(chart?.palaces) ? chart.palaces : [];
  if (!palaces.length) return [];
  const byName = new Map(palaces.map((palace) => [palace.name, palace]));
  const lifePalace = byName.get("명궁") || null;
  const bodyPalaceName = chart?.bodyPalace || chart?.shenGong;
  const bodyPalace = byName.get(bodyPalaceName) || null;
  const triadNames = chart?.sanFangSiZheng?.byPalace?.["명궁"]?.palaceNames
    || chart?.sanFangSiZheng?.lifePalace?.palaceNames
    || [];
  const sihuaPalaces = palaces.filter((palace) => Array.isArray(palace.transformations) && palace.transformations.length);

  const loci = [
    { label: "명궁", palace: lifePalace },
    { label: "신궁", palace: bodyPalace },
    ...triadNames.filter((name) => name !== "명궁").map((name) => ({ label: `삼방사정(${name})`, palace: byName.get(name) })),
    ...sihuaPalaces.map((palace) => ({ label: `사화궁(${palace.name})`, palace })),
  ].filter((item) => item.palace);

  const tagLoci = new Map();
  for (const { label, palace } of loci) {
    for (const star of palaceStars(palace)) {
      for (const tag of TRAIT_TAGS[star] || []) {
        if (!tagLoci.has(tag)) tagLoci.set(tag, new Set());
        tagLoci.get(tag).add(label);
      }
    }
  }

  return [...tagLoci.entries()]
    .filter(([, labels]) => labels.size >= 2)
    .map(([tag, labels]) => `- ${tag}: ${[...labels].join(", ")}에서 반복 확인됨`);
}

export function buildZiweiPersonalityContextLines(chart) {
  const repeatedSignals = collectRepeatedTraitSignals(chart);

  return [
    "[핵심 성향 Context — 다른 어떤 해석보다 먼저 종합할 것]",
    "이 명반을 해석하기 전에, 먼저 이 사람이 기본적으로 어떤 사람인지를 아래 원칙으로 종합하라. 이후 재물·연애·직업·인간관계·건강·대운/세운 등 어떤 주제를 다루든 이 종합을 전제로 이어가라.",
    "- 별 하나의 사전적 의미를 그대로 나열하지 마라(예: '천동은 온화합니다' 금지). 주성·보조성·살성·사화·궁·삼방사정의 조합을 실제 인간의 심리와 행동 패턴으로 통합해 서술하라.",
    "- 겉으로 드러나는 인상과 실제 내면이 다를 수 있으면 두 층을 함께 짚어라(예: '겉으로는 ~하게 보이지만 실제로는 ~한 기준이 강하다').",
    "- 어떤 성향이든 장점과 그림자를 함께 제시하라. 하나의 별·기질을 무조건 좋다 또는 나쁘다로 단정하지 마라.",
    "- 명반에서 근거가 확인되는 범위 안에서만, 인간관계를 맺는 방식·화났을 때의 행동 패턴·상처받는 지점과 그때의 반응·사고방식(직관형/분석형, 결정 속도)·일하는 방식·돈을 대하는 심리·연애에서 중요하게 여기는 것까지 자연스럽게 통합하라. 근거가 부족하면 억지로 만들지 마라.",
    "- 특정 궁 하나만으로 성향을 결론짓지 마라. 명궁·신궁·삼방사정·사화·전체 명반에서 반복되는 패턴을 우선하라.",
    repeatedSignals.length ? "- 아래는 이 명반에서 실제로 반복 확인된 성향 신호다(둘 이상의 자리에서 겹치므로 해석의 우선순위를 높여 반영하라):" : "",
    ...repeatedSignals,
    "- 단정적 표현('반드시', '무조건', '100%')과 실제 범죄·정신질환·법적 책임에 대한 판정은 쓰지 말고, '~한 성향이 나타날 수 있습니다' 식으로 서술하라.",
  ].filter(Boolean);
}
