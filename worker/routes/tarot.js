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

const CARD_TO_FILENAME = {
  M00:"thefool.jpeg",M01:"themagician.jpeg",M02:"thehighpriestess.jpeg",M03:"theempress.jpeg",
  M04:"theemperor.jpeg",M05:"thehierophant.jpeg",M06:"TheLovers.jpg",M07:"thechariot.jpeg",
  M08:"thestrength.jpeg",M09:"thehermit.jpeg",M10:"wheeloffortune.jpeg",M11:"justice.jpeg",
  M12:"thehangedman.jpeg",M13:"death.jpeg",M14:"temperance.jpeg",M15:"thedevil.jpeg",
  M16:"thetower.jpeg",M17:"thestar.jpeg",M18:"themoon.jpeg",M19:"thesun.jpeg",
  M20:"judgement.jpeg",M21:"theworld.jpeg",
  W01:"aceofwands.jpeg",W02:"twoofwands.jpeg",W03:"threeofwands.jpeg",W04:"fourofwands.jpeg",
  W05:"fiveofwands.jpeg",W06:"sixofwands.jpeg",W07:"sevenofwands.jpeg",W08:"eightofwands.jpeg",
  W09:"nineofwands.jpeg",W10:"tenofwands.jpeg",W11:"pageofwands.jpeg",W12:"knightofwands.jpeg",
  W13:"queenofwands.jpeg",W14:"kingofwands.jpeg",
  C01:"aceofcups.jpeg",C02:"twoofcups.jpeg",C03:"threeofcups.jpeg",C04:"fourofcups.jpeg",
  C05:"fiveofcups.jpeg",C06:"sixofcups.jpeg",C07:"sevenofcups.jpeg",C08:"eightofcups.jpeg",
  C09:"nineofcups.jpeg",C10:"tenofcups.jpeg",C11:"pageofcups.jpeg",C12:"knightofcups.jpeg",
  C13:"queenofcups.jpeg",C14:"kingofcups.jpeg",
  S01:"aceofswords.jpeg",S02:"twoofswords.jpeg",S03:"threeofswords.jpeg",S04:"fourofswords.jpeg",
  S05:"fiveofswords.jpeg",S06:"sixofswords.jpeg",S07:"sevenofswords.jpeg",S08:"eightofswords.jpeg",
  S09:"nineofswords.jpeg",S10:"tenofswords.jpeg",S11:"pageofswords.jpeg",S12:"knightofswords.jpeg",
  S13:"queenofswords.jpeg",S14:"kingofswords.jpeg",
  P01:"aceofpentacles.jpeg",P02:"twoofpentacles.jpeg",P03:"threeofpentacles.jpeg",P04:"fourofpentacles.jpeg",
  P05:"fiveofpentacles.jpeg",P06:"sixofpentacles.jpeg",P07:"sevenofpentacles.jpeg",P08:"eightofpentacles.jpeg",
  P09:"nineofpentacles.jpeg",P10:"tenofpentacles.jpeg",P11:"pageofpentacles.jpeg",P12:"knightofpentacles.jpeg",
  P13:"queenofpentacles.jpeg",P14:"kingofpentacles.jpeg",
};

function buildImageCandidates(cardId) {
  const id = String(cardId || "").toUpperCase();
  const filename = CARD_TO_FILENAME[id];
  const localUrl = filename ? `/tarot-cards/${filename}` : `/tarot-cards/thefool.jpeg`;
  return [localUrl];
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

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function ensureTextLength(text, minChars, blocks) {
  let out = asText(text);
  const safeBlocks = Array.isArray(blocks) ? blocks.map(asText).filter(Boolean) : [];
  if (!out && safeBlocks.length) out = safeBlocks[0];
  let i = 0;
  while (out.length < minChars && safeBlocks.length) {
    out += `\n\n${safeBlocks[i % safeBlocks.length]}`;
    i += 1;
    if (i > 120) break;
  }
  return out;
}

function buildConsultingHighlights(reading) {
  const keys = [
    "overallVibe",
    "deepReading",
    "realityAndFuture",
    "opening",
    "theirHeart",
    "reunionOutcome",
    "lighthouseGuidance",
  ];
  const highlights = [];
  for (const key of keys) {
    const text = asText(reading?.[key]);
    if (!text) continue;
    highlights.push(text.replace(/\s+/g, " ").slice(0, 260));
    if (highlights.length >= 3) break;
  }
  return highlights;
}

function enhanceRelationshipReading(reading, cards) {
  const c = (i) => cards[i] || cards[0] || {};
  const n = (i) => cardNameLine(c(i));
  const m = (i) => getCardMeaning(c(i));

  const overallBlocks = [
    `${n(0)}와 ${n(1)} 조합은 관계의 '체감 온도'와 '관계 운영 방식'이 분리되어 있다는 신호를 줍니다. 즉, 감정은 분명 존재하지만 전달 방식과 해석 방식에서 오해 비용이 누적될 수 있습니다. 20년 경력 타로 상담에서는 이런 배열을 볼 때 먼저 감정의 진위를 의심하지 않고, 감정 전달의 구조를 재설계하도록 안내합니다.`,
    `현재 흐름에서는 누가 더 사랑하느냐보다 '누가 더 정확하게 표현하느냐'가 관계 안정도를 좌우합니다. ${m(0)}의 메시지는 개인 감정의 결을, ${m(1)}의 메시지는 관계 시스템의 상태를 가리키므로 둘을 동시에 읽어야 정확도가 높아집니다.`,
    "특히 연락 빈도, 반응 지연 해석, 갈등 후 복귀 방식이 관계의 실제 체력을 결정합니다. 카드가 좋더라도 운영이 불안정하면 소모가 커지고, 카드가 거칠어도 운영이 정교하면 회복이 가능합니다. 그래서 이번 리딩의 1순위는 감정 확인이 아니라 구조 확인입니다.",
  ];

  const deepBlocks = [
    `${n(2)}와 ${n(3)}는 '상대의 인식'과 '상대의 의지'를 분리해서 보라는 핵심 신호입니다. 상대가 당신을 좋게 인식해도 현재 연애 의지가 낮을 수 있고, 반대로 표현이 서툴러 차갑게 보이지만 실제 의지는 살아 있을 수 있습니다.`,
    "전문가 관점에서 이 파트의 정확도는 한 문장으로 요약됩니다. '말의 강도'보다 '행동의 일관성'을 우선 데이터로 보세요. 약속 이행률, 대화 지속성, 책임 회피 패턴은 감정의 진짜 깊이를 매우 정확하게 보여줍니다.",
    "또한 방어기제의 종류를 구분해야 합니다. 회피형 침묵, 불안형 확인 요구, 통제형 대화는 모두 다른 처방이 필요합니다. 이 구분을 하지 않으면 같은 문제를 반복 해석하게 되고, 반복 해석은 관계 피로를 크게 증가시킵니다.",
  ];

  const futureBlocks = [
    `${n(4)}는 현재 병목을, ${n(5)}는 단기 결말의 방향을 가리킵니다. 타로의 정확도를 높이는 방법은 예언을 소비하는 것이 아니라 병목을 해소하는 실행을 붙이는 것입니다. 장애요인을 방치한 채 결말만 확인하면 해석 체감이 급격히 떨어집니다.`,
    "앞으로 2~6주 구간의 핵심은 '관계 운영 리듬 재정렬'입니다. 감정이 올라온 순간 바로 결론을 묻기보다, 사실 확인 질문 → 감정 명료화 → 기대치 합의 순서를 지키면 관계가 불필요한 급락을 피할 가능성이 높습니다.",
    "미래는 단일 이벤트가 아니라 반복 선택의 누적입니다. 따라서 관계 개선은 대화의 질, 경계 존중, 응답 일관성이라는 세 지표를 기준으로 점검해야 하며, 이 세 지표가 회복되면 카드가 말한 결말도 더 좋은 쪽으로 구체화됩니다.",
  ];

  const positionCoach = [
    "이 포지션의 메시지는 감정의 진위를 가리는 구간입니다. 추측을 줄이고 사실 확인 질문을 늘릴수록 오해 비용이 감소합니다.",
    "이 포지션은 관계 운영 패턴을 보여줍니다. 말의 내용보다 말이 오가는 구조(타이밍, 톤, 반복성)를 점검해야 정확한 해석이 됩니다.",
    "이 포지션은 상대의 인지·정서 반응을 분리해서 보라는 신호입니다. 반응 속도 하나만으로 마음을 단정하지 마세요.",
    "이 포지션은 현재 의지의 지속 가능성을 점검합니다. 일관된 행동이 있는지, 약속 이행률이 유지되는지 확인해 보세요.",
    "이 포지션은 병목 원인을 압축해 보여줍니다. 문제를 한 문장으로 정의한 뒤 해결 행동 1개를 먼저 실행해야 흐름이 움직입니다.",
    "이 포지션은 단기 결말을 보여주지만 고정 운명을 뜻하지 않습니다. 운영 방식이 바뀌면 결말도 함께 이동합니다.",
  ];

  const positionBreakdown = (Array.isArray(reading.positionBreakdown) ? reading.positionBreakdown : cards.map((card, idx) => ({
    title: REL_POSITION_LABELS[idx] || `포지션 ${idx + 1}`,
    card: cardNameLine(card),
    summary: getCardMeaning(card),
  }))).slice(0, 6).map((item, idx) => {
    const baseSummary = asText(item?.summary);
    const cardLine = `${n(idx)}의 포지션 핵심 의미는 ${m(idx)} 입니다.`;
    return {
      ...item,
      title: asText(item?.title) || REL_POSITION_LABELS[idx] || `포지션 ${idx + 1}`,
      card: asText(item?.card) || n(idx),
      summary: ensureTextLength(baseSummary, 560, [cardLine, positionCoach[idx % positionCoach.length]]),
    };
  });

  while (positionBreakdown.length < 6) {
    const idx = positionBreakdown.length;
    positionBreakdown.push({
      title: REL_POSITION_LABELS[idx] || `포지션 ${idx + 1}`,
      card: n(idx),
      summary: ensureTextLength("", 560, [
        `${n(idx)} 포지션의 핵심은 관계 신호를 감정 해석과 행동 해석으로 분리하는 것입니다.`,
        positionCoach[idx % positionCoach.length],
      ]),
    });
  }

  const advice = Array.isArray(reading.advice) ? reading.advice.map(asText).filter(Boolean) : [];
  const adviceSeed = [
    "상대의 의도를 추측하기 전에 확인 질문 1개를 먼저 던져 오해 비용을 낮추세요.",
    "감정이 크게 올라올 때는 즉시 전송 대신 10분 정리 후 핵심만 전달하세요.",
    "이번 주에 15분 진심 대화 1회를 고정 일정으로 잡아 관계 리듬을 회복하세요.",
    "반복 갈등 주제를 한 문장으로 정의하고 재발 방지 합의 1개를 만드세요.",
    "관계 안정도를 '반응 속도'가 아니라 '반응의 일관성'으로 판단하세요.",
    "상대를 바꾸려 하기보다 내가 지킬 대화 경계 2개를 먼저 고정하세요.",
    "하루 1회, 관계 평가보다 자기 루틴(수면/식사/운동) 회복을 우선하세요.",
    "결론 압박형 대화 대신 사실-감정-요청 3단 구조로 전달해 보세요.",
  ];
  while (advice.length < 8) advice.push(adviceSeed[advice.length % adviceSeed.length]);

  return {
    ...reading,
    overallVibe: ensureTextLength(reading.overallVibe, 1800, overallBlocks),
    deepReading: ensureTextLength(reading.deepReading, 1800, deepBlocks),
    realityAndFuture: ensureTextLength(reading.realityAndFuture, 1800, futureBlocks),
    positionBreakdown,
    advice: advice.slice(0, 12),
  };
}

function enhanceReunionReading(reading, cards) {
  const c = (i) => cards[i] || cards[0] || {};
  const n = (i) => cardNameLine(c(i));
  const m = (i) => getCardMeaning(c(i));

  const openingBlocks = [
    `이번 리딩의 핵심은 재회 가능성 자체보다 '재회가 성립되는 조건'을 분리해서 보는 것입니다. ${n(0)}부터 ${n(4)}까지의 배열은 감정선, 현실 변수, 타이밍 변수를 각각 분해해 보여주므로 단순히 긍정/부정을 단정하는 접근보다 훨씬 정확한 해석이 가능합니다.`,
    "20년 이상 관계 타로를 읽어온 관점에서, 재회 리딩의 정확도는 희망의 강도보다 패턴의 반복성에서 결정됩니다. 같은 갈등 구조가 반복되는지, 대화 회복 루틴이 있었는지, 상호 책임성이 살아 있는지를 함께 봐야 실제 결론과의 오차가 줄어듭니다.",
    "따라서 이번 결과는 감정적 위로나 단호한 단절 중 하나를 강요하지 않습니다. 대신 감정의 진실과 현실의 제약을 동시에 인정하고, 재접촉의 질을 높이는 실행 조건을 제시하는 방식으로 읽어야 실전 정확도가 높아집니다.",
  ];

  const pastBlocks = [
    `${n(0)}는 과거 인연의 결을 보여줍니다. ${m(0)} 이 카드는 과거의 강점만이 아니라 과거의 취약 패턴도 함께 환기합니다. 재회를 원한다면 좋은 기억의 복원만이 아니라 실패 패턴의 수정 가능성까지 함께 점검해야 합니다.`,
    "과거 인연 자리는 두 사람이 '어떻게 사랑했는가'보다 '어떻게 충돌했는가'를 복기할수록 해석 정확도가 올라갑니다. 갈등의 촉발 문장, 침묵의 길이, 화해 방식의 반복 여부를 구체적으로 보는 것이 중요합니다.",
  ];

  const nowBlocks = [
    `${n(1)}는 상대의 현재 리듬을 보여줍니다. ${m(1)} 여기서 중요한 것은 상대의 감정 유무보다 현재의 여유 자원(시간, 정신 에너지, 관계 우선순위)입니다. 감정이 있어도 여유 자원이 없으면 반응은 지연될 수 있습니다.`,
    "현재 근황 파트는 해석 오차가 가장 크게 나는 구간입니다. 단답, 읽씹, 지연 반응을 마음의 부정으로만 읽지 말고 상대의 생활 구조 변화와 스트레스 구간까지 함께 고려해야 정확도가 올라갑니다.",
  ];

  const outsideBlocks = [
    `${n(2)}는 외부 변수의 실제 압력을 가리킵니다. ${m(2)} 재회는 감정만으로 성립되지 않고 상황 조정 능력에 크게 좌우됩니다. 관계 외적 변수(거리, 일정, 주변 시선, 기존 갈등 기록)를 먼저 정리해야 감정 대화가 의미를 가집니다.`,
    "이 포지션을 무시하면 재접촉 이후에도 같은 파열이 재발하기 쉽습니다. 문제를 감정 문제와 구조 문제로 분리하고, 구조 문제는 일정·룰·경계로 해결하는 접근이 필요합니다.",
  ];

  const heartBlocks = [
    `${n(3)}는 상대의 속마음을 비춥니다. ${m(3)} 속마음은 단일 감정이 아니라 미련·경계·두려움·호기심이 동시에 공존할 수 있습니다. 따라서 반응의 일관성과 복귀 의지 데이터를 함께 읽어야 실제 감정선과의 오차가 줄어듭니다.`,
    "상대의 마음을 읽을 때는 낭만적 확신보다 행동의 증거를 중시해야 합니다. 먼저 안부를 유지하려는지, 갈등 주제를 회피만 하는지, 작은 약속을 지키는지에 따라 재회 가능성의 결이 분명히 갈립니다.",
  ];

  const outcomeBlocks = [
    `${n(4)}는 단기 결말의 방향을 보여줍니다. ${m(4)} 이 결과는 고정 운명이 아니라 현재 패턴의 추세선입니다. 연락 방식, 속도, 경계 합의가 바뀌면 결말 역시 유의미하게 조정될 수 있습니다.`,
    "재회 성공률을 높이려면 감정 확인보다 신뢰 복구 단계를 먼저 통과해야 합니다. 사실 확인 대화 → 책임 분담 합의 → 재발 방지 문장 합의의 3단계를 거치면 결과 카드가 가진 잠재력이 현실화될 가능성이 커집니다.",
  ];

  const guideBlocks = [
    "등대의 조언 파트는 감정의 진폭을 줄이고 판단 정확도를 높이는 실전 프로토콜입니다. 첫째, 즉시 결론 요구를 멈추고 짧고 명료한 소통을 유지하세요. 둘째, 상대 반응을 속도로 평가하지 말고 일관성으로 평가하세요. 셋째, 과거와 다른 행동 증거 1개를 확인한 뒤 다음 단계를 밟으세요.",
    "재회는 사랑의 크기만으로 완성되지 않습니다. 관계를 운영하는 기술, 갈등을 복구하는 태도, 경계를 지키는 성숙함이 함께 필요합니다. 이번 리딩이 말하는 핵심은 '붙잡기'가 아니라 '건강한 방식으로 다시 연결될 자격을 갖추는 과정'입니다.",
    "따라서 지금의 최적 전략은 조급함을 줄이고, 대화 품질을 높이며, 자기 안정 루틴을 유지하는 것입니다. 자기 안정이 확보될수록 상대를 해석하는 정확도와 선택의 질이 함께 상승합니다.",
  ];

  const plan = Array.isArray(reading.actionPlan) ? reading.actionPlan.map(asText).filter(Boolean) : [];
  const planSeed = [
    "첫 연락 전, 전달할 핵심을 2문장으로 압축해 감정 폭주를 방지하세요.",
    "상대의 반응 지연을 거절로 단정하지 말고 최소 48시간 관찰 간격을 유지하세요.",
    "재회 대화의 첫 목적을 '결론'이 아닌 '신뢰 회복'으로 설정하세요.",
    "과거 갈등의 재발 방지 문장을 미리 준비하고, 책임 분담 표현을 포함하세요.",
    "안부 메시지는 짧고 분명하게, 질문은 한 번에 하나만 던지세요.",
    "상대가 응답했을 때 즉시 과거 평가전으로 가지 말고 현재 상태 확인부터 시작하세요.",
    "재회 여부와 무관하게 내 수면·식사·업무 루틴을 먼저 안정화하세요.",
    "관계 기준 3가지를 글로 고정해 감정 기복 시 판단 기준으로 사용하세요.",
  ];
  while (plan.length < 8) plan.push(planSeed[plan.length % planSeed.length]);

  return {
    ...reading,
    opening: ensureTextLength(reading.opening, 1200, openingBlocks),
    pastBond: ensureTextLength(reading.pastBond, 680, pastBlocks),
    theirNow: ensureTextLength(reading.theirNow, 680, nowBlocks),
    outsideFactor: ensureTextLength(reading.outsideFactor, 680, outsideBlocks),
    theirHeart: ensureTextLength(reading.theirHeart, 680, heartBlocks),
    reunionOutcome: ensureTextLength(reading.reunionOutcome, 760, outcomeBlocks),
    lighthouseGuidance: ensureTextLength(reading.lighthouseGuidance, 1200, guideBlocks),
    actionPlan: plan.slice(0, 10),
  };
}

function applyQualityEnhancement(spreadType, reading, cards) {
  const normalized = normalizeSpreadType(spreadType || "one_card");
  if (!reading || typeof reading !== "object") return reading;
  if (normalized === "relationship_six_card") return enhanceRelationshipReading(reading, cards);
  if (normalized === "reunion_lighthouse_five_card") return enhanceReunionReading(reading, cards);
  return reading;
}

// ─── 카드별 핵심 의미 테이블 ───────────────────────────────────────────────────
const CARD_MEANINGS = {
  M00: { upright: "새로운 시작과 자유로운 도약, 두려움 없이 미지의 세계로 나아가는 용기", reversed: "무모한 도전, 준비 없는 출발, 충동적 선택으로 인한 위험" },
  M01: { upright: "의지와 능력으로 현실을 변화시키는 주도적 힘, 목표를 향한 집중", reversed: "의지 분산, 능력 과시, 속임수 주의" },
  M02: { upright: "직관과 내면의 지혜, 겉으로 드러나지 않은 진실을 통찰하는 능력", reversed: "비밀 노출, 과잉 분석, 감추어진 진실 외면" },
  M03: { upright: "풍요와 창조적 번성, 따뜻한 돌봄과 사랑의 에너지가 충만한 시기", reversed: "의존성, 창의성 막힘, 자기 방치" },
  M04: { upright: "안정과 질서, 목표를 향한 체계적 실행과 든든한 리더십", reversed: "권위주의, 경직된 통제, 감정 억압" },
  M05: { upright: "전통과 신념의 힘, 신뢰할 수 있는 가이드를 통한 성장", reversed: "관습 거부, 외부 의존, 도덕적 갈등" },
  M06: { upright: "서로를 선택하는 진실한 사랑, 조화로운 관계와 가치의 일치", reversed: "선택 혼란, 관계 불균형, 가치관 충돌" },
  M07: { upright: "강한 의지로 장애물을 극복하며 목표를 향해 힘차게 나아가는 승리", reversed: "방향 상실, 자기 통제력 부족, 공격성" },
  M08: { upright: "내면의 힘과 감정 통제, 부드럽지만 강한 인내로 어려움을 극복", reversed: "자기 의심, 감정 폭발, 두려움에 의한 회피" },
  M09: { upright: "내면의 지혜를 찾아 홀로 성찰하는 시간, 진리를 향한 깊은 탐구", reversed: "고립, 자기 비하, 성찰 거부" },
  M10: { upright: "운명의 전환점, 새로운 기회의 문이 열리는 긍정적 변화", reversed: "불운의 사이클, 통제 불가한 상황, 변화 저항" },
  M11: { upright: "공정한 균형과 진실, 올바른 판단과 인과의 법칙이 작동하는 시기", reversed: "불공정, 편향된 판단, 책임 회피" },
  M12: { upright: "새로운 시각으로 상황을 바라보는 능력, 희생을 통한 깊은 통찰", reversed: "희생의 거부, 고집, 정체된 시간 낭비" },
  M13: { upright: "낡은 것의 끝과 새로운 시작, 근본적인 변화와 재탄생의 에너지", reversed: "변화 저항, 집착, 불필요한 연장" },
  M14: { upright: "절제와 균형, 인내를 가지고 조화를 만들어가는 치유와 통합의 힘", reversed: "불균형, 과잉, 인내심 부족" },
  M15: { upright: "집착과 두려움을 인식하고 그것에서 자유로워질 기회", reversed: "집착 심화, 독성 관계 지속, 자기 파괴적 패턴" },
  M16: { upright: "갑작스러운 변화와 기존 구조의 붕괴, 고통이지만 진실을 드러내는 정화", reversed: "재앙 회피, 변화 지연, 숨겨진 위험" },
  M17: { upright: "희망과 영감, 어둠 속에서도 빛나는 가이드의 별이 새 방향을 제시", reversed: "희망 상실, 방향 감각 혼란, 영감 고갈" },
  M18: { upright: "무의식과 직관의 세계, 환상과 현실의 경계에서 진실을 탐색하는 과정", reversed: "혼란, 자기기만, 두려움에 의한 왜곡" },
  M19: { upright: "기쁨과 활력, 명확한 에너지로 성공과 행복이 빛나는 황금빛 시기", reversed: "일시적 침체, 과신, 에너지 낭비" },
  M20: { upright: "과거를 통합하고 새로운 부름에 응답하는 각성, 진정한 자기 발견", reversed: "자기 판단 혹독, 과거 집착, 각성 거부" },
  M21: { upright: "사이클의 완성과 통합, 모든 경험을 통해 이룬 성취와 풍요로운 결실", reversed: "미완성, 마무리 거부, 완성 직전의 좌절" },
};

const SUIT_UPRIGHT_MEANINGS = {
  W: "의지·열정·창의·행동 에너지가 강하게 발현되는 시기로, 목표를 향해 실행하면 흐름이 빠르게 전진합니다.",
  C: "감정·직관·관계의 에너지가 살아나며, 마음 깊은 곳에서 진실된 응답을 끌어올릴 수 있습니다.",
  S: "생각·소통·결단의 힘이 작동하며, 명확한 언어와 논리로 상황을 정리할 타이밍입니다.",
  P: "현실·자원·안정·실용의 에너지로, 구체적인 계획과 꾸준한 실행이 결실을 만드는 흐름입니다.",
};
const SUIT_REVERSED_MEANINGS = {
  W: "에너지가 분산되거나 과잉 상태입니다. 방향을 재점검하고 충동적 행동을 자제하면 흐름을 되찾습니다.",
  C: "감정 기복이나 오해가 생기기 쉬운 구간입니다. 감정을 억누르지 않고 표현하되 사실을 먼저 확인하세요.",
  S: "소통 단절이나 오해가 쌓인 상태입니다. 단정 짓지 말고 질문 방식을 바꿔 대화를 재열기하세요.",
  P: "현실적 불안정이나 자원 낭비 신호입니다. 지출·시간·에너지의 우선순위를 재정비할 타이밍입니다.",
};

const RANK_MEANINGS = {
  "01": "씨앗의 에너지: 새 출발과 순수한 가능성",
  "02": "선택과 균형: 두 방향 사이에서 최선을 고르는 순간",
  "03": "확장과 성장: 협력·표현·결과가 점점 구체화",
  "04": "안정과 점검: 정체 또는 의도적 휴식으로 다음을 준비",
  "05": "마찰과 조율: 갈등 뒤에 배움이 있는 전환점",
  "06": "회복과 전진: 베풂·화해·상호 이익이 흐름을 바꿈",
  "07": "재평가와 전략: 현실을 다시 보고 자신만의 길을 선택",
  "08": "집중과 실행: 한 방향으로 에너지를 모으면 돌파구가 열림",
  "09": "성숙과 자립: 내면의 충만함에서 나오는 지속 가능한 힘",
  "10": "완성과 부담: 사이클 마무리, 다음 단계로의 전환 준비",
  "11": "탐색과 학습: 호기심·개방성·신선한 시도가 열쇠",
  "12": "추진과 돌파: 강한 추진력이지만 과속 주의",
  "13": "성숙한 배려: 공감·지지·내면 통찰이 강점",
  "14": "책임과 통솔: 안정적 리더십으로 결과를 이끔",
};

function getCardMeaning(card) {
  const id = String(card?.cardId || "").toUpperCase();
  const orientation = card?.orientation === "reversed" ? "reversed" : "upright";
  if (id && CARD_MEANINGS[id]) {
    return CARD_MEANINGS[id][orientation];
  }
  const prefix = id.charAt(0);
  const rankNum = id.slice(1);
  const suitMeanings = orientation === "reversed" ? SUIT_REVERSED_MEANINGS : SUIT_UPRIGHT_MEANINGS;
  const suitMeaning = suitMeanings[prefix] || "";
  const rankMeaning = RANK_MEANINGS[rankNum] || "";
  if (suitMeaning && rankMeaning) {
    return `${rankMeaning}. ${suitMeaning}`;
  }
  return suitMeaning || rankMeaning || `${cardNameLine(card)}의 에너지가 이 영역에서 작동하고 있습니다.`;
}

// ─── 관계 6카드 스프레드 ────────────────────────────────────────────────────────
const REL_POSITION_LABELS = [
  "내가 바라보는 상대",
  "상대가 관계 전체를 보는 시각",
  "상대가 나를 바라보는 마음",
  "상대의 연애 의지와 열망",
  "관계를 가로막는 핵심 요인",
  "앞으로 펼쳐질 단기적 결말",
];

function buildRelationshipReading(cards) {
  const c = (i) => cards[i] || cards[0];
  const m = (i) => getCardMeaning(c(i));
  const n = (i) => cardNameLine(c(i));

  return {
    overallVibe: `${n(0)}과 ${n(1)}의 흐름이 교차하며 관계의 온도를 보여줍니다. ${m(0)} 지금 당신의 시선과 상대의 시선 사이의 간격을 이해하는 것이 핵심입니다. 섣부른 결론보다 관찰과 사실 확인이 먼저입니다.`,
    deepReading: `${n(2)}는 상대가 당신을 어떻게 바라보는지 알려줍니다. ${m(2)} 반면 ${n(3)}는 상대의 연애 의지를 보여줍니다. ${m(3)} 두 카드가 가리키는 방향을 비교하면 관계의 실제 온도가 드러납니다.`,
    realityAndFuture: `${n(4)}는 관계를 가로막는 핵심 요인입니다. ${m(4)} 이 요인을 의식적으로 다루면 ${n(5)}가 가리키는 방향으로 흐름이 바뀝니다. ${m(5)} 지금 당장 필요한 것은 실행보다 이해입니다.`,
    positionBreakdown: cards.map((card, idx) => ({
      title: REL_POSITION_LABELS[idx] || `포지션 ${idx + 1}`,
      card: cardNameLine(card),
      summary: getCardMeaning(card),
    })),
    advice: [
      `${n(4)}가 가리키는 장애물을 인정하고, 한 번에 한 가지씩 해결하세요.`,
      "추궁형 대화 대신 '나 전달법'으로 감정을 표현하면 오해 비용이 줄어듭니다.",
      "이번 주 15분 이상의 진심 대화 1회를 먼저 예약해 보세요.",
    ],
  };
}

// ─── 태양 회복 힐링 4카드 스프레드 ──────────────────────────────────────────────
function buildHealingReading(cards) {
  const c = (i) => cards[i] || cards[0];
  const m = (i) => getCardMeaning(c(i));
  const n = (i) => cardNameLine(c(i));

  return {
    opening: `태양 회복 리딩이 시작됩니다. 지금 당신의 마음은 이미 회복의 방향으로 움직이고 있습니다. ${n(0)}, ${n(1)}, ${n(2)}, ${n(3)} — 네 장의 카드가 내면을 밝히는 황금빛 빛줄기처럼 길을 안내합니다.`,
    hiddenTruth: `${n(0)}가 마음 깊은 원인을 비춥니다. ${m(0)} 반복되는 소진 패턴의 뿌리가 여기 있습니다. 이 카드의 에너지를 직면할 때 회복의 첫 문이 열립니다.`,
    embracePain: `${n(1)}는 지금 당신이 안고 있는 감정의 결을 보여줍니다. ${m(1)} 이 감정을 밀어내거나 이름 붙이지 않으면 회복이 지연됩니다. 오늘 감정을 인정하는 짧은 글 한 줄이 큰 변화의 시작이 될 수 있습니다.`,
    silverLining: `${n(2)}는 이번 경험이 숨기고 있는 선물을 보여줍니다. ${m(2)} 지금의 어려움은 더 깊은 자기 이해를 위한 기회입니다. 이 통찰을 놓치지 마세요.`,
    stepForward: `${n(3)}는 오늘 당신이 취할 수 있는 가장 작고 실행 가능한 한 걸음을 안내합니다. ${m(3)} 거대한 변화가 아니라 작은 루틴의 반복이 정서적 안정을 다시 세워줍니다.`,
    integrationMessage: `네 카드가 전하는 통합 메시지: 치유는 속도가 아니라 방향입니다. ${n(0)}의 원인을 인정하고, ${n(1)}의 감정을 수용하며, ${n(2)}의 통찰을 곱씹고, ${n(3)}의 행동을 반복하면 — 황금빛 회복의 빛이 서서히 되돌아옵니다.`,
    actionPlan: [
      `${n(3)} 에너지를 살려 오늘 10분 산책 또는 호흡 루틴을 시작하세요.`,
      "감정 기록 3문장(사실 / 감정 / 내가 원하는 것)을 매일 작성하세요.",
      "과부하 신호가 오면 즉시 '지금 나는 쉬어야 한다'고 선언하고 멈추세요.",
    ],
  };
}

// ─── 재회운 등대 5카드 스프레드 ──────────────────────────────────────────────
function buildReunionReading(cards) {
  const c = (i) => cards[i] || cards[0];
  const m = (i) => getCardMeaning(c(i));
  const n = (i) => cardNameLine(c(i));

  const isOutcomePositive = !String(c(4)?.orientation || "").includes("reversed") &&
    ["M06","M10","M17","M19","M21","C10","C09","W06","P10","P09"].includes(
      String(c(4)?.cardId || "").toUpperCase()
    );

  return {
    opening: `별 헤는 밤바다의 등대가 두 사람의 인연을 조명합니다. ${n(0)}, ${n(1)}, ${n(2)}, ${n(3)}, ${n(4)} — 다섯 장의 카드가 재회의 실마리를 하나씩 펼쳐 보입니다. 결론을 서두르지 말고 각 카드의 이야기를 천천히 따라가 보세요.`,
    pastBond: `${n(0)}가 두 사람의 과거 인연을 보여줍니다. ${m(0)} 이 에너지는 아직 완전히 사라지지 않았습니다. 과거의 감정적 기반이 얼마나 단단했는지를 이 카드가 증언합니다.`,
    theirNow: `${n(1)}는 그 사람의 지금 이 순간을 담고 있습니다. ${m(1)} 상대의 현재 리듬이 어느 방향으로 흐르고 있는지를 파악하면 재접촉 타이밍을 더 정확히 잡을 수 있습니다.`,
    outsideFactor: `${n(2)}는 두 사람 사이에 작용하는 외부 변수를 가리킵니다. ${m(2)} 이 요소를 무시하면 노력이 헛되기 쉽습니다. 현실 조건을 먼저 정리해야 재회의 에너지가 제대로 흐를 수 있습니다.`,
    theirHeart: `${n(3)}가 그 사람의 속마음을 비춥니다. ${m(3)} 표면적 반응만 보지 말고 이 카드가 전하는 깊은 감정의 층을 읽으세요. 미련과 경계가 공존할 수 있으며, 그것이 인간의 감정이 작동하는 방식입니다.`,
    reunionOutcome: `${n(4)}가 재회의 가능성을 알려줍니다. ${m(4)} ${isOutcomePositive ? "긍정적인 흐름이 열려 있습니다. 무리한 접근이 아닌 신뢰 회복 중심의 전략을 유지하면 가능성이 현실이 될 수 있습니다." : "현재 타이밍은 즉각적 재회보다 내면 정비와 준비의 시간입니다. 억지로 밀어붙이는 것보다 자신을 채우는 시간이 오히려 재회 가능성을 높입니다."}`,
    lighthouseGuidance: `등대의 빛처럼, 재회의 가능성은 어둠 속에서도 꺼지지 않는 신호입니다. ${n(3)}가 담은 상대의 마음과 ${n(4)}가 보여주는 흐름을 결합하면 — 지금 당신에게 필요한 것은 결과를 통제하려는 시도가 아니라, 신뢰를 다시 쌓는 작은 행동들입니다.`,
    actionPlan: [
      `${n(2)}가 가리키는 외부 장애물을 먼저 현실적으로 정리하세요.`,
      "첫 연락은 감정 토로보다 가볍고 진심 어린 안부 중심 3문장으로 시작하세요.",
      "응답 속도에 집착하지 말고 48시간 단위로 상대의 리듬을 관찰하세요.",
      "재회 목표보다 '신뢰 회복'을 단기 목표로 설정하면 조급함이 줄어듭니다.",
    ],
  };
}

function buildYearlyReading(cards) {
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  const monthlyReadings = cards.slice(0, 12).map((card, idx) => {
    const meaning = getCardMeaning(card);
    return {
      month: idx + 1,
      flow: `${monthNames[idx]}의 핵심 카드는 ${cardNameLine(card)}입니다. ${meaning}`,
      money: "수익 확대보다 현금흐름 안정이 우선입니다. 검증된 선택을 반복하세요.",
      love: "감정 추측보다 사실 확인 대화를 늘리면 관계 안정도가 올라갑니다.",
      relationship: "관계는 짧고 정확한 소통에서 회복됩니다. 경계와 배려를 함께 유지하세요.",
      exam: "짧은 집중 루틴의 반복이 성과를 만듭니다.",
    };
  });

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
      interpretation: getCardMeaning(card) || card.interpretation,
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
      const rawReading = pickReading(spreadType, cards);
      const reading = applyQualityEnhancement(spreadType, rawReading, cards);
      return json({
        ok: true,
        category,
        spreadType,
        cards,
        reading,
        consultingHighlights: buildConsultingHighlights(reading),
        engineMeta: {
          source: "worker/routes/tarot.js",
          qualityEnhanced: reading !== rawReading,
          spreadType,
          cardCount: cards.length,
        },
      });
    }

    if (path === "/love-reading") {
      const spreadType = "relationship_six_card";
      const cards = Array.isArray(body?.cards) ? body.cards : [];
      assertCardCount(spreadType, cards);
      const rawReading = buildRelationshipReading(cards);
      const reading = applyQualityEnhancement(spreadType, rawReading, cards);
      return json({
        ok: true,
        category: "love",
        spreadType,
        cards,
        reading,
        consultingHighlights: buildConsultingHighlights(reading),
        engineMeta: {
          source: "worker/routes/tarot.js",
          qualityEnhanced: reading !== rawReading,
          spreadType,
          cardCount: cards.length,
        },
        isRelationshipReading: true,
        api: "love-reading",
      });
    }

    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}
