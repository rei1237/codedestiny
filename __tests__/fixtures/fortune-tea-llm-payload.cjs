const DETAIL_FIELDS = ["coreMeaning", "currentSituation", "questionLink", "advice", "caution"];
const SPREAD_POSITIONS = {
  three: [
    { positionId: "present", positionLabel: "현재", positionMeaning: "지금 질문이 놓인 자리입니다." },
    { positionId: "flow", positionLabel: "흐름", positionMeaning: "곧 이어질 마음과 상황의 결입니다." },
    { positionId: "advice", positionLabel: "조언", positionMeaning: "오늘 붙잡을 가장 현실적인 기준입니다." },
  ],
  five: [
    { positionId: "present", positionLabel: "현재", positionMeaning: "지금 질문이 놓인 자리입니다." },
    { positionId: "other", positionLabel: "상대/상황", positionMeaning: "상대 또는 상황이 보여주는 결입니다." },
    { positionId: "obstacle", positionLabel: "장애", positionMeaning: "흐름을 거칠게 만드는 반복 지점입니다." },
    { positionId: "possibility", positionLabel: "가능성", positionMeaning: "열릴 수 있는 문과 조건입니다." },
    { positionId: "advice", positionLabel: "조언", positionMeaning: "오늘 붙잡을 가장 현실적인 기준입니다." },
  ],
};

const CARD_POOL = [
  { cardId: "minor_pentacles_10", number: 10, nameKo: "펜타클 10", nameEn: "Ten of Pentacles", keywords: ["가족 재산", "장기 자산"], meaning: "쌓아 온 것이 형태를 갖추는 카드입니다." },
  { cardId: "minor_cups_05", number: 5, nameKo: "컵 5", nameEn: "Five of Cups", keywords: ["후회", "놓친 기회"], meaning: "잃은 것에 시선이 머무는 카드입니다." },
  { cardId: "major_04_emperor", number: 4, nameKo: "황제", nameEn: "The Emperor", keywords: ["안정", "리더십"], meaning: "구조와 원칙을 세우는 카드입니다." },
  { cardId: "major_09_hermit", number: 9, nameKo: "은둔자", nameEn: "The Hermit", keywords: ["성찰", "기다림"], meaning: "안으로 등불을 돌리는 카드입니다." },
  { cardId: "major_17_star", number: 17, nameKo: "별", nameEn: "The Star", keywords: ["희망", "회복"], meaning: "메마른 자리에 물이 다시 흐르는 카드입니다." },
];

function buildDraftSpreadCards(spread) {
  return SPREAD_POSITIONS[spread].map((position, index) => ({
    ...CARD_POOL[index],
    orientation: index % 2 === 0 ? "upright" : "reversed",
    source: "existing-card-data",
    ...position,
    reading: `${position.positionLabel} 자리에는 ${CARD_POOL[index].nameKo}이 떠올랐습니다.`,
  }));
}

function consultBody({ spread = "three", featureKey, attemptId = "cardwise-1" } = {}) {
  return {
    consultationMode: "tarot",
    tarotSpread: spread,
    attemptId,
    selectedTeaCupId: "gold-cinnamon",
    selectedTeaCupName: "황금 계피차",
    selectedTeaCupTopic: "금전운",
    question: "올해 돈의 흐름을 어떻게 잡아야 할까요?",
    ...(featureKey ? { featureKey } : {}),
    draftResult: {
      consultationMode: "tarot",
      tarotSpread: spread,
      tarot: { ...CARD_POOL[0], orientation: "upright", reading: "펜타클 10이 재물의 결을 비춥니다." },
      tarotSpreadCards: buildDraftSpreadCards(spread),
    },
  };
}

// 길이 게이트를 넘기기 위한 채움 문장. 카드명을 인자로 받아 카드별 detail에 이름이 남게 한다.
// 찻잔 이름·정역방향·질문 용어는 assertTarotAnchorCoverage가 요구하는 앵커라 함께 넣고,
// hasRepeatedLongBlock에 걸리지 않도록 (카드명, 라벨) 조합마다 문장이 달라지게 만든다.
let padSeq = 0;
function pad(cardName, label) {
  padSeq += 1;
  label = `${cardName} ${label} ${padSeq}`;
  return [
    `황금 계피차 위에서 ${cardName}은 정방향으로 ${label}의 결을 비춥니다.`,
    `이 자리에서 재성의 흐름은 ${label}을 기준으로 갈리며, 돈이 들어오고 나가는 지점을 감정이 아니라 숫자로 보게 합니다.`,
    `역방향으로 기울 때는 소비의 속도를 30일 단위로 조정하고, 확인 가능한 항목 ${padSeq}개를 먼저 붙잡는 편이 안전합니다.`,
    // 2026-08-15 섹션 병렬 전환으로 타로 하한이 3,200 → 6,000(5카드 7,200)이 됐다. 문장을 더 얹지
    // 않으면 이 픽스처가 하한에 걸려 모든 케이스가 gemini_degraded 로 떨어진다(품질 회귀가 아니다).
    `${cardName}이 ${label}의 자리에서 말하는 것은 결과가 아니라 순서라, ${padSeq}번째 확인 항목부터 손에 잡히는 숫자로 바꿔 두면 흔들릴 때 돌아올 기준이 남습니다.`,
    `황금 계피차의 온기가 식기 전에 ${label} 쪽 지출을 한 번 더 훑어보면, ${cardName}이 정방향으로 가리키던 여유가 어디서 새는지 ${padSeq}주 안에 드러납니다.`,
  ].join(" ");
}

function buildLlmPayload(spread) {
  const cards = buildDraftSpreadCards(spread);
  const pairs = spread === "five"
    ? [[0, 1], [1, 2], [2, 3], [3, 4], [0, 4]]
    : [[0, 1], [1, 2], [0, 2]];
  const payload = {
    sessionTitle: "황금 계피차에 비친 오늘의 타로 상담",
    questionSummary: "올해 돈의 흐름을 어떻게 잡아야 할까요?",
    tarot: { reading: `${cards.map((card) => card.nameKo).join(", ")}가 함께 재성의 결을 비춥니다. ${pad("펜타클 10", "재물")}` },
    tarotCardReadings: cards.map((card) => ({
      positionId: card.positionId,
      coreMeaning: pad(card.nameKo, "핵심 의미"),
      currentSituation: pad(card.nameKo, card.positionLabel),
      questionLink: pad(card.nameKo, "질문 연결"),
      advice: pad(card.nameKo, "조언"),
      caution: pad(card.nameKo, "주의"),
    })),
    cardInteractions: pairs.map(([a, b]) => ({
      pair: `${cards[a].nameKo} + ${cards[b].nameKo}`,
      insight: `${cards[a].nameKo}의 결이 ${cards[b].nameKo}으로 이어지며 돈의 흐름과 소비 습관을 함께 보게 합니다. 30일 안에 확인할 재성 신호를 나눠 잡아 주세요.`,
    })),
    heartScent: {
      name: "시나몬",
      category: "재물",
      reason: `지금 손님에게 필요한 것은 돈의 흐름을 감정이 아니라 기준으로 보는 눈이에요. 오늘의 ${cards[0].nameKo}과 ${cards[1].nameKo}은 이미 쌓아 온 것과 아쉽게 놓친 것을 함께 보라고 말하고 있고, 어느 한쪽만 붙들면 판단이 기울어진다고 짚어 줍니다. 특히 30일 안에 결정을 몰아서 내리지 말고, 확인 가능한 숫자부터 붙잡으라는 신호가 반복해서 나타나고 있어요. 시나몬은 흩어진 기운을 데워 현실의 결실로 이어주는 향이라, 지금 손님의 재성 흐름을 가장 잘 보완해 줍니다.`,
    },
    // 라벨은 황금 계피차(gold-cinnamon)의 정본 게이지 목록과 일치해야 한다.
    emotionAnalysis: ["안정감", "소비 충동", "회복력", "기회감", "현실감"].map((label) => ({
      label,
      value: 60,
      description: `${label}은 ${pad("펜타클 10", label)}`,
      tone: "gold",
    })),
    yeoniReading: {
      intro: pad("펜타클 10", "첫 인사"),
      main: pad("황제", "카드 배치 서사"),
      advice: pad("컵 5", "방향 제시"),
      caution: pad("컵 5", "위험 신호"),
    },
    synthesis: {
      title: "연이가 읽은 타로의 장면",
      summary: pad("황제", "종합"),
      sajuTarotBridge: pad("펜타클 10", "앞으로의 변화"),
    },
    choiceSimulation: ["줄이기", "지키기", "늘리기", "정리하기"].map((title, index) => ({
      id: `choice-${index + 1}`,
      title,
      subtitle: `${title} 단계`,
      result: pad("펜타클 10", title),
      caution: pad("컵 5", `${title} 리스크`),
    })),
    // requiredTerms(금전·소비·30일·투자)는 결과 어딘가에 반드시 등장해야 한다.
    actionPrescription: `${pad("황제", "행동 처방")} 오늘 30일 지출표를 열어 금전이 새는 항목 하나를 표시하고, 투자 결정은 한 주 미뤄 두세요.`,
    luckyKeywords: ["재성", "30일", "소비 기준", "금전", "투자"],
    closingLine: "돈은 서두르는 손보다 기준을 지키는 손에 오래 머뭅니다.",
  };
  const long = (label, minimum, cardName = '펜타클 10') => {
    let text = '';
    while (text.replace(/\s/g, '').length < minimum) text += pad(cardName, label) + '\n';
    return text;
  };
  for (const key of Object.keys(payload.yeoniReading)) payload.yeoniReading[key] = long(key, 2100);
  payload.actionPrescription = long('실천 처방', 2900) + ' 금전 소비 30일 투자';
  payload.synthesis.summary = long('종합 근거', 2300);
  payload.tarot.reading = long('카드 전체 흐름', 1300);
  payload.emotionAnalysis.forEach(item => { item.description = long(item.label, 450); });
  payload.tarotCardReadings.forEach((item, index) => {
    DETAIL_FIELDS.forEach(key => { item[key] = long(key, 500, cards[index].nameKo); });
  });
  return payload;
}


module.exports = { buildLlmPayload, consultBody };
