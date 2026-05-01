import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";

const SPREAD_CONFIG = {
  one_card: { cardCount: 1, labels: ["today"] },
  three_card_past_present_future: { cardCount: 3, labels: ["past", "present", "future"] },
  three_card_cause_process_outcome: { cardCount: 3, labels: ["cause", "process", "outcome"] },
  relationship_six_card: {
    cardCount: 6,
    labels: ["position_1", "position_2", "position_3", "position_4", "position_5", "position_6"],
  },
  healing_rising_four_card: {
    cardCount: 4,
    labels: ["hidden_truth", "embrace_pain", "silver_lining", "step_forward"],
  },
  reunion_lighthouse_five_card: {
    cardCount: 5,
    labels: ["past_bond", "their_now", "outside_factor", "their_heart", "reunion_outcome"],
  },
  yearly_twelve_card: {
    cardCount: 12,
    labels: [
      "month_1", "month_2", "month_3", "month_4", "month_5", "month_6",
      "month_7", "month_8", "month_9", "month_10", "month_11", "month_12",
    ],
  },
};

const SPREAD_ALIASES = {
  relationshipSixCard: "relationship_six_card",
  healingRisingFourCard: "healing_rising_four_card",
  reunionLighthouseFiveCard: "reunion_lighthouse_five_card",
  yearlyTwelveCard: "yearly_twelve_card",
};

const MAJOR_ARCANA = [
  ["M00", "The Fool", "바보"],
  ["M01", "The Magician", "마법사"],
  ["M02", "The High Priestess", "여사제"],
  ["M03", "The Empress", "여황제"],
  ["M04", "The Emperor", "황제"],
  ["M05", "The Hierophant", "교황"],
  ["M06", "The Lovers", "연인"],
  ["M07", "The Chariot", "전차"],
  ["M08", "Strength", "힘"],
  ["M09", "The Hermit", "은둔자"],
  ["M10", "Wheel of Fortune", "운명의 수레바퀴"],
  ["M11", "Justice", "정의"],
  ["M12", "The Hanged Man", "매달린 사람"],
  ["M13", "Death", "죽음"],
  ["M14", "Temperance", "절제"],
  ["M15", "The Devil", "악마"],
  ["M16", "The Tower", "탑"],
  ["M17", "The Star", "별"],
  ["M18", "The Moon", "달"],
  ["M19", "The Sun", "태양"],
  ["M20", "Judgement", "심판"],
  ["M21", "The World", "세계"],
];

const MINOR_SUITS = [
  ["W", "Wands", "완드"],
  ["C", "Cups", "컵"],
  ["S", "Swords", "소드"],
  ["P", "Pentacles", "펜타클"],
];

const MINOR_RANKS = [
  [1, "Ace", "에이스"],
  [2, "Two", "투"],
  [3, "Three", "쓰리"],
  [4, "Four", "포"],
  [5, "Five", "파이브"],
  [6, "Six", "식스"],
  [7, "Seven", "세븐"],
  [8, "Eight", "에잇"],
  [9, "Nine", "나인"],
  [10, "Ten", "텐"],
  [11, "Page", "페이지"],
  [12, "Knight", "나이트"],
  [13, "Queen", "퀸"],
  [14, "King", "킹"],
];

let DECK_CACHE = null;

function normalizeSpreadType(input) {
  const raw = String(input || "one_card").trim();
  if (!raw) return "one_card";
  if (SPREAD_CONFIG[raw]) return raw;
  return SPREAD_ALIASES[raw] || raw;
}

function getDeck() {
  if (DECK_CACHE) return DECK_CACHE;

  const majors = MAJOR_ARCANA.map(([cardId, name, nameKr]) => ({
    cardId,
    name,
    nameKr,
    arcanaType: "Major",
    keywords: ["변화", "흐름", "선택"],
  }));

  const minors = [];
  for (const [prefix, suitEn, suitKr] of MINOR_SUITS) {
    for (const [rankNo, rankEn, rankKr] of MINOR_RANKS) {
      minors.push({
        cardId: `${prefix}${String(rankNo).padStart(2, "0")}`,
        name: `${rankEn} of ${suitEn}`,
        nameKr: `${suitKr} ${rankKr}`,
        arcanaType: "Minor",
        keywords: ["균형", "실행", "정리"],
      });
    }
  }

  DECK_CACHE = [...majors, ...minors];
  return DECK_CACHE;
}

function buildImageCandidates(cardId) {
  return [
    `/fuctionassets/tarot/${cardId}.webp`,
    `/fuctionassets/tarot/${cardId}.png`,
    `/fuctionassets/cardback.webp`,
  ];
}

function pickCards(spreadType) {
  const spread = SPREAD_CONFIG[spreadType];
  if (!spread) throw createHttpError(400, `Unsupported spreadType: ${spreadType}`);

  const deck = [...getDeck()];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck.slice(0, spread.cardCount).map((base, idx) => {
    const orientation = Math.random() < 0.5 ? "upright" : "reversed";
    const imageCandidates = buildImageCandidates(base.cardId);
    return {
      cardId: base.cardId,
      name: base.name,
      nameKr: base.nameKr,
      position: spread.labels[idx],
      orientation,
      imageKey: String(base.cardId || "").toLowerCase(),
      imageUrl: imageCandidates[0],
      imageCandidates,
      proxyImageUrl: "",
      localImageUrl: imageCandidates[0],
      keywords: base.keywords,
      interpretation: `${base.nameKr} ${orientation === "reversed" ? "역방향" : "정방향"}은 지금 필요한 선택의 기준을 명확히 하라는 신호입니다.`,
    };
  });
}

function assertCardCount(spreadType, cards) {
  const spread = SPREAD_CONFIG[spreadType];
  const expected = spread?.cardCount || 0;
  if (!expected) throw createHttpError(400, `Unsupported spreadType: ${spreadType}`);
  if (!Array.isArray(cards) || cards.length !== expected) {
    throw createHttpError(400, `${spreadType}은(는) ${expected}장의 카드가 필요합니다.`, {
      expectedCardCount: expected,
      receivedCardCount: Array.isArray(cards) ? cards.length : 0,
    });
  }
}

function cardNameLine(card) {
  const name = String(card?.nameKr || card?.name || "카드");
  const orientation = card?.orientation === "reversed" ? "역방향" : "정방향";
  return `${name}(${orientation})`;
}

function buildRelationshipReading(cards) {
  const names = cards.map(cardNameLine).join(" → ");
  return {
    overallVibe: `관계의 현재 온도는 ${names}의 흐름처럼 감정의 결을 다시 맞춰야 하는 시기입니다. 섣부른 결론보다 사실 확인 대화가 우선입니다.`,
    deepReading: "서로의 애정 강도보다 표현 방식의 차이가 병목입니다. 질문의 톤을 낮추고 확인형 대화를 늘리면 오해 비용이 빠르게 줄어듭니다.",
    realityAndFuture: "단기적으로는 반응 속도보다 일관된 약속이 중요합니다. 7일 단위로 소통 루틴을 고정하면 관계의 예측 가능성이 올라갑니다.",
    positionBreakdown: cards.map((card, idx) => ({
      title: `포지션 ${idx + 1}`,
      card: cardNameLine(card),
      summary: `${cardNameLine(card)}는 감정 단정 대신 사실-감정-요청 순서로 말해야 관계 에너지가 회복된다는 메시지를 보냅니다.`,
    })),
    advice: [
      "감정이 올라온 직후 결론을 내리지 말고 10분 텀 후 대화하세요.",
      "추궁형 질문 대신 확인형 질문으로 바꾸세요.",
      "이번 주 15분 진심 대화 1회를 미리 예약하세요.",
    ],
  };
}

function buildHealingReading(cards) {
  return {
    opening: "당신의 마음은 이미 회복의 방향으로 움직이고 있습니다. 지금 필요한 것은 완벽한 해답이 아니라 하루를 버티는 작은 루틴입니다.",
    hiddenTruth: `${cardNameLine(cards[0])}는 반복되는 소진 패턴을 멈추기 위해 경계 문장을 세워야 한다고 말합니다.`,
    embracePain: `${cardNameLine(cards[1])}는 감정을 밀어내기보다 이름 붙여 인정할 때 회복이 시작된다는 신호입니다.`,
    silverLining: `${cardNameLine(cards[2])}는 이번 경험이 자기 이해를 깊게 만들 기회임을 보여줍니다.`,
    stepForward: `${cardNameLine(cards[3])}는 오늘 가능한 가장 작은 행동 하나를 실행하라고 안내합니다.`,
    integrationMessage: "치유는 속도가 아니라 방향입니다. 작은 실천을 반복하면 정서적 안정이 다시 자라납니다.",
    actionPlan: [
      "하루 10분 산책 또는 호흡 루틴을 고정하세요.",
      "감정 기록 3문장(사실/감정/요청)을 매일 작성하세요.",
      "과부하가 오면 즉시 휴식 신호를 선언하세요.",
    ],
  };
}

function buildReunionReading(cards) {
  return {
    opening: "재회운은 가능성의 문제이기 전에 정렬의 문제입니다. 마음과 현실의 간격을 줄이는 방식이 결과를 바꿉니다.",
    pastBond: `${cardNameLine(cards[0])}는 두 사람 사이에 남아 있는 정서적 연결이 여전히 작동하고 있음을 보여줍니다.`,
    theirNow: `${cardNameLine(cards[1])}는 상대가 현재 자신의 리듬을 정리하는 과정에 있음을 시사합니다.`,
    outsideFactor: `${cardNameLine(cards[2])}는 외부 일정/주변 시선이 재접촉 타이밍을 늦추는 요소임을 말합니다.`,
    theirHeart: `${cardNameLine(cards[3])}는 미련과 경계가 동시에 존재하는 복합 감정을 나타냅니다.`,
    reunionOutcome: `${cardNameLine(cards[4])} 기준으로 볼 때, 속도를 조절한 접근이면 재회 가능성을 현실로 바꿀 여지가 있습니다.`,
    lighthouseGuidance: "결론을 서두르지 말고 신뢰를 다시 쌓는 구조를 먼저 만드세요. 짧고 정확한 대화가 가장 큰 전환점이 됩니다.",
    actionPlan: [
      "첫 연락은 감정 토로보다 안부 중심 3문장으로 시작하세요.",
      "응답 속도 집착을 줄이고 48시간 단위로 리듬을 보세요.",
      "재회 목표보다 신뢰 복구 목표를 먼저 세우세요.",
    ],
  };
}

function buildYearlyReading(cards) {
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  const monthlyReadings = cards.slice(0, 12).map((card, idx) => ({
    month: idx + 1,
    flow: `${monthNames[idx]}의 핵심 카드는 ${cardNameLine(card)}입니다. 조급함보다 루틴을 지키는 선택이 운의 상승폭을 키웁니다.`,
    money: "수익 확대보다 현금흐름 안정이 우선입니다. 검증된 선택을 반복하세요.",
    love: "감정 추측보다 사실 확인 대화를 늘리면 관계 안정도가 올라갑니다.",
    relationship: "관계는 짧고 정확한 소통에서 회복됩니다. 경계와 배려를 함께 유지하세요.",
    exam: "짧은 집중 루틴의 반복이 성과를 만듭니다.",
  }));

  return {
    summary: "올해 리딩은 월별 흐름의 진폭을 조절하는 전략이 핵심입니다. 상승 구간은 확장하고, 주의 구간은 손실을 줄이는 운영이 필요합니다.",
    finalAdvice: "운은 기다리는 것이 아니라 운영하는 것입니다. 월별 카드 메시지를 실천 루틴으로 연결하면 연말 체감이 확실히 달라집니다.",
    monthlyReadings,
  };
}

function buildGenericReading(cards) {
  return {
    story: `${cards.map(cardNameLine).join(" → ")}의 흐름은 현재 상황을 구조적으로 정리할 때 운이 안정된다는 메시지입니다.`,
    advice: "오늘은 실행 가능한 행동 1개를 시간-장소-행동 단위로 정해 바로 시작하세요.",
    cardNarratives: cards.map((card) => ({
      cardId: card.cardId,
      position: card.position,
      interpretation: card.interpretation,
    })),
  };
}

function pickReading(spreadType, cards) {
  if (spreadType === "relationship_six_card") return buildRelationshipReading(cards);
  if (spreadType === "healing_rising_four_card") return buildHealingReading(cards);
  if (spreadType === "reunion_lighthouse_five_card") return buildReunionReading(cards);
  if (spreadType === "yearly_twelve_card") return buildYearlyReading(cards);
  return buildGenericReading(cards);
}

export async function handleTarotRoutes(request) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/tarot");

    if (method === "GET" && path === "/meta") {
      return json({
        ok: true,
        engine: {
          spreads: Object.keys(SPREAD_CONFIG),
          cardCount: getDeck().length,
        },
      });
    }

    if (method !== "POST") {
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    const body = await readJson(request);

    if (path === "/draw") {
      const spreadType = normalizeSpreadType(body?.spreadType || "one_card");
      const cards = pickCards(spreadType);
      return json({ ok: true, spreadType, cards });
    }

    if (path === "/reading") {
      const spreadType = normalizeSpreadType(body?.spreadType || "one_card");
      const category = String(body?.category || "general");
      const cards = Array.isArray(body?.cards) ? body.cards : [];
      assertCardCount(spreadType, cards);
      const reading = pickReading(spreadType, cards);
      return json({ ok: true, category, spreadType, cards, reading });
    }

    if (path === "/love-reading") {
      const spreadType = "relationship_six_card";
      const cards = Array.isArray(body?.cards) ? body.cards : [];
      assertCardCount(spreadType, cards);
      const reading = buildRelationshipReading(cards);
      return json({
        ok: true,
        category: "love",
        spreadType,
        cards,
        reading,
        isRelationshipReading: true,
        api: "love-reading",
      });
    }

    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}
