import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { callGeminiText } from "../lib/gemini.js";

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
  const d = (i) => getDetailedCardReading(c(i));

  return {
    opening: `🌅 태양 회복 리딩이 시작됩니다.\n\n지금 이 순간, 당신의 마음은 이미 회복의 방향으로 움직이고 있습니다. 타로 전문가로서 20년 이상의 경험을 통해 확인한 바에 따르면, 진정한 치유는 외부의 조언이 아닌 내면의 통찰에서 시작됩니다.\n\n${n(0)}, ${n(1)}, ${n(2)}, ${n(3)} — 이 네 장의 카드는 단순한 운세가 아닌, 당신의 무의식이 선택한 심리적 거울입니다. 각 카드는 내면을 밝히는 황금빛 빛줄기처럼 정확한 지점을 비추고 있으며, 이 리딩을 통해 당신은 단순한 위로를 넘어 구체적이고 실행 가능한 회복의 길을 발견하게 될 것입니다.`,
    hiddenTruth: `🔍 1. 마음 깊은 원인: ${n(0)}\n\n${d(0)}\n\n이 카드가 위치한 '숨겨진 진실' 자리는 당신이 반복적으로 경험하는 소진 패턴의 뿌리를 보여줍니다. ${n(0)}의 에너지가 이 위치에서 작동할 때, 우리는 표면적인 문제 이면에 있는 심리적 원인에 주목해야 합니다.\n\n${m(0)}\n\n이 카드가 전하는 핵심 메시지는 단순합니다: 회복의 첫 걸음은 문제의 근원을 정확히 보는 것입니다. ${n(0)}이(가) 지적하는 바를 인정할 때, 당신은 더 이상 같은 패턴에 갇히지 않게 됩니다.`,
    embracePain: `💝 2. 감정 수용: ${n(1)}\n\n${d(1)}\n\n두 번째 카드는 당신이 지금 안고 있는 감정의 결을 명확히 드러냅니다. ${n(1)}이(가) '감정 수용' 자리에 나타났다는 것은, 당신의 감정이 지금 필요로 하는 것이 치유가 아닌 '인정'임을 의미합니다.\n\n${m(1)}\n\n타로 상담 현장에서 가장 흔한 실수는 감정을 빨리 해결하려는 조급함입니다. 그러나 ${n(1)}은(는) 말합니다: "이 감정은 밀어낼 대상이 아니라 통과해야 할 문이다." 이 감정을 이름 짓고, 펜으로 적고, 혹은 눈물로 흘려보낼 때 비로소 다음 단계로 나아갈 수 있습니다.`,
    silverLining: `✨ 3. 회복의 단서: ${n(2)}\n\n${d(2)}\n\n세 번째 카드는 이번 경험이 당신에게 숨기고 있는 선물, 즉 '은혜로운 선물(Silver Lining)'을 보여줍니다. ${n(2)}이(가) 이 자리에 나타난 것은 우연이 아닙니다. 당신의 영혼이 이 어려움을 통해 얻어야 할 더 깊은 자기 이해가 바로 여기에 있습니다.\n\n${m(2)}\n\n전문 타로 리더로서, 이 카드 조합은 종종 "성장통"이라고 부르는 패턴을 보여줍니다. 지금의 고통이 없었다면 당신은 결코 발견하지 못했을 자신의 깊은 층면을 ${n(2)}이(가) 비추고 있습니다. 이 통찰을 일기에 남기고, 한 달 후 다시 읽어보세요. 그때 당신은 이 카드가 얼마나 정확했는지 깨닫게 될 것입니다.`,
    stepForward: `👣 4. 다음 행동: ${n(3)}\n\n${d(3)}\n\n마지막 카드는 오늘, 지금 당장 실행할 수 있는 가장 작고 구체적인 한 걸음을 안내합니다. ${n(3)}의 에너지는 거창한 계획이 아닌, 실행 가능한 행동을 요구합니다.\n\n${m(3)}\n\n치유의 전문가들은 '작은 승리의 연쇄'를 강조합니다. ${n(3)}이(가) 제시하는 행동은 당신에게 즉각적이고 실질적인 안정감을 줄 것입니다. 거대한 변화가 아니라 작은 루틴의 반복이 정서적 안정을 다시 세워줍니다. 오늘 밤, 이 카드가 제안하는 행동을 실천하세요.`,
    integrationMessage: `🌟 통합 메시지: 네 카드의 지혜\n\n${n(0)}의 원인 인정 → ${n(1)}의 감정 수용 → ${n(2)}의 통찰 발견 → ${n(3)}의 실행\n\n이 네 단계는 단순한 순서가 아닌, 회복의 자연스러운 순환입니다. 태양은 매일 떠오르듯, 당신의 내면에도 회복의 빛은 이미 존재합니다.\n\n전문 타로 해석의 핵심 원리: 카드는 미래를 예언하지 않습니다. 그것은 당신이 가진 잠재력과 현재 흐름의 가능성을 보여줍니다. ${n(0)}, ${n(1)}, ${n(2)}, ${n(3)} — 이 네 장의 카드가 함께 작동할 때, 당신은 더 이상 과거의 패턴에 갇히지 않고, 황금빛 회복의 길을 걷게 될 것입니다.`,
    actionPlan: [
      `📅 오늘: ${n(3)}의 에너지를 살려 10분 산책 또는 호흡 루틴으로 몸과 마음의 긴장을 풀어보세요.`,
      "📝 이번 주: 감정 기록 3문장을 매일 작성하세요. (1)지금 무슨 일이 일어났는가 (2)나는 무슨 감정을 느끼는가 (3)내가 정말 원하는 것은 무엇인가",
      "⏸️ 과부하 신호가 오면 즉시 '지금 나는 쉬어야 한다'고 소리 내어 선언하고, 모든 활동을 5분간 멈추세요.",
      `🎴 한 달 후: 이 리딩을 다시 읽고 ${n(2)}이(가) 암시했던 '은혜로운 선물'을 발견했는지 확인하세요.`,
    ],
  };
}

// ─── 카드별 상세 해석 테이블 (힐링 스프레드 전용) ──────────────────────────────
const CARD_DETAILED_READINGS = {
  M00: { upright: "🃏 바보(The Fool) - 정방향\n\n당신의 마음속에는 새로운 시작을 향한 순수한 열망이 살아있습니다. 이 카드는 마치 아침의 첫 햇살처럼, 모든 가능성이 열려 있는 순간을 상징합니다. 타로 전문가의 시각에서, 이 카드는 '회복의 씨앗'이 이미 심어졌음을 알립니다.\n\n심리적 해석: 현재 당신은 과거의 짐을 내려놓고 새로운 정체성을 찾아가는 과정에 있습니다. 이것은 위태로워 보일 수 있지만, 실제로는 가장 자연스러운 치유의 흐름입니다. 무의식적으로 당신은 이미 다음 단계를 준비하고 있으며, 이 카드는 그 준비가 충분하다고 말합니다.", reversed: "🃏 바보(The Fool) - 역방향\n\n지금 당신은 '무모한 도전'과 '준비 없는 출발' 사이에서 갈등하고 있습니다. 마음은 앞으로 나아가고 싶지만, 과거의 경험이 발목을 잡고 있습니다.\n\n심리적 해석: 이 카드가 역방향으로 나타났을 때, 우리는 종종 '도피하고 싶은 마음'과 '현실을 직면해야 하는 마음'의 충돌을 봩니다. 당신이 피하고 있는 것은 문제 자체가 아니라, 문제를 바라보는 방식일 수 있습니다. 작은 단계부터 시작하세요. 완벽한 준비보다는 의도적인 작은 행동이 더 중요합니다." },
  M01: { upright: "🎩 마법사(The Magician) - 정방향\n\n당신에게는 현재 상황을 변화시킬 모든 도구가 이미 갖춰져 있습니다. 이 카드는 의지와 능력의 완벽한 조화를 상징하며, '당신은 할 수 있다'는 강력한 메시지를 전달합니다.\n\n심리적 해석: 무의식적으로 당신은 자신의 자원을 과소평가하고 있었을 수 있습니다. 이 카드는 당신이 생각하는 것보다 훨씬 많은 내적 힘을 가지고 있음을 상징합니다. 회복의 열쇠는 외부에서 찾는 것이 아니라, 당신 안에 있는 의지와 능력을 깨닫는 것입니다.", reversed: "🎩 마법사(The Magician) - 역방향\n\n현재 당신의 에너지가 분산되거나, 자신의 능력을 과시하는 데 집중되어 있습니다. 이 카드는 '진짜 힘은 과시하지 않는다'는 진리를 일깨웁니다.\n\n심리적 해석: 외부의 인정이나 성과에 너무 집중하다 보니 내면의 소리를 놓치고 있을 수 있습니다. 이 카드는 당신에게 에너지를 재집중하고, 정말 중요한 것에 의도를 모으라고 말합니다." },
  M02: { upright: "🌙 여사제(The High Priestess) - 정방향\n\n당신의 직관이 가장 정확한 시기입니다. 이 카드는 이성적인 분석을 넘어선, 깊은 내면의 지혜를 상징합니다. 답은 이미 당신 안에 있습니다.\n\n심리적 해석: 과도한 정보 검색이나 타인의 조언이 오히려 당신을 혼란스럽게 하고 있을 수 있습니다. 이 카드는 '잠시 모든 외부 소리를 끄고 내면으로 들어가라'고 말합니다. 당혹스러운 문제에 대한 답은 조용한 명상 속에서 찾아질 것입니다.", reversed: "🌙 여사제(The High Priestess) - 역방향\n\n감추어진 진실이 밖으로 나오려고 하고 있습니다. 무의식적으로 알고 있던 것들이 의식으로 떠오르는 중입니다.\n\n심리적 해석: 당신이 외면했던 감정이나 무시했던 신호들이 이제는 무시할 수 없는 형태로 나타나고 있습니다. 이것은 위협이 아닌 치유의 기회입니다. '놓아야 할 것'을 정확히 보는 것만큼 중요한 것은 없습니다." },
  M03: { upright: "👑 여황제(The Empress) - 정방향\n\n자기 돌봄(self-care)의 최고 카드입니다. 이 카드는 당신에게 풍요와 창조적 번영, 따뜻한 돌봄이 필요함을 상징합니다.\n\n심리적 해석: 타로 전문가로서, 이 카드는 '어머니의 에너지'가 필요하다고 말합니다. 자기 자신을 마치 소중한 아이처럼 돌보세요. 충분한 휴식, 영양가 있는 음식, 자연과의 교감 - 이런 단순한 것들이 지금 가장 큰 치유가 될 것입니다.", reversed: "👑 여황제(The Empress) - 역방향\n\n자기 방치와 의존성의 패턴이 뿌리 깊게 자리 잡고 있을 수 있습니다. 타인에게 너무 많은 에너지를 주고 자신은 텅 비워 있습니다.\n\n심리적 해석: 이 카드는 당신에게 '경계'의 중요성을 일깨웁니다. 타인을 돌보는 것은 아름다운 일이지만, 그것이 자기 소모가 된다면 재고해야 합니다. 당신의 창의성과 생명력을 회복하기 위해 '아니오'라고 말하는 연습을 시작하세요." },
  M04: { upright: "🏛️ 황제(The Emperor) - 정방향\n\n구조와 질서가 회복에 필요합니다. 이 카드는 안정적인 루틴과 체계적인 접근이 지금 당신에게 필요함을 상징합니다.\n\n심리적 해석: 감정의 소용돌이 속에서 '구조'는 생명줄과 같습니다. 매일 같은 시간에 일어나기, 정해진 시간에 식사하기, 짧은 운동 루틴 - 이런 단순한 구조들이 당신에게 안정감을 되찾아줄 것입니다. 자신에게 엄격해지기보다는 규칙적인 패턴을 만들어보세요.", reversed: "🏛️ 황제(The Emperor) - 역방향\n\n과도한 통제와 경직된 태도가 오히려 문제를 키우고 있습니다. 모든 것을 관리하려는 시도가 역효과를 내고 있습니다.\n\n심리적 해석: 이 카드가 역방향일 때, 우리는 종종 '감정을 억누르려는 과도한 노력'을 봅니다. 지금 당신에게 필요한 것은 더 많은 규칙이 아니라, 흘러가게 두는 능력입니다. 완벽한 통제를 포기할 때 진정한 평화가 찾아옵니다." },
  M05: { upright: "⛪ 교황(The Hierophant) - 정방향\n\n전통적인 지혜와 체계적인 지식이 당신에게 도움이 될 것입니다. 이 카드는 검증된 방법과 신뢰할 수 있는 가이드를 상징합니다.\n\n심리적 해석: 혼자서 모든 것을 해결하려 하지 마세요. 20년 경력 타로 리더로서, 이 카드는 '전문가의 도움'을 받을 때임을 알립니다. 상담사, 치료사, 혹은 믿을 수 있는 멘토의 지혜가 지금 당신에게 필요합니다.", reversed: "⛪ 교황(The Hierophant) - 역방향\n\n기존의 규칙이나 타인의 기대에서 벗어나 자신만의 길을 찾을 때입니다.\n\n심리적 해석: 주변의 조언이 오히려 당신의 직관을 흐리게 하고 있을 수 있습니다. 이 카드는 '다른 사람의 기준'에서 벗어나, 당신만의 회복 방식을 개발하라고 말합니다." },
  M06: { upright: "💑 연인(The Lovers) - 정방향\n\n자기 자신과의 조화가 우선입니다. 이 카드는 내면의 갈등을 해결하고, 진정한 자기 수용으로 나아가라는 메시지를 전달합니다.\n\n심리적 해석: 타로에서 이 카드는 단순히 남녀 관계를 넘어 '내면의 남성성과 여성성의 통합'을 상징합니다. 당신 안의 논리와 감정, 행동과 직관이 조화를 이루는 것이 진정한 회복입니다.", reversed: "💑 연인(The Lovers) - 역방향\n\n가치관의 혼란과 선택의 어려움이 있습니다. 무엇이 진정으로 중요한지 다시 물어보세요.\n\n심리적 해석: 다른 사람의 기대와 자신의 욕구 사이에서 갈등하고 있을 수 있습니다. 이 카드는 '타인을 위한 선택'과 '자신을 위한 선택'을 분명히 구분하라고 말합니다." },
  M07: { upright: "🏆 전차(The Chariot) - 정방향\n\n강한 의지로 장애물을 극복할 수 있는 힘이 있습니다. 이 카드는 승리와 성취의 에너지를 상징합니다.\n\n심리적 해석: 지금 당신에게는 목표를 향해 힘차게 나아갈 수 있는 내적 동력이 충만합니다. 그러나 주의할 점은 '무모한 돌진'이 아닌 '의도적인 전진'이어야 한다는 것입니다. 하나의 목표에 집중하세요.", reversed: "🏆 전차(The Chariot) - 역방향\n\n방향 상실과 자기 통제력의 부족이 문제입니다. 에너지는 있지만 제대로 집중되지 않고 있습니다.\n\n심리적 해석: 너무 많은 방향으로 동시에 가려고 하다 보니 어디에도 도달하지 못하고 있습니다. 이 카드는 '모든 것을 동시에 고치려 하지 말고, 한 가지에 집중하라'고 말합니다." },
  M08: { upright: "🦁 힘(Strength) - 정방향\n\n내면의 힘과 감정 통제 능력이 당신의 가장 큰 강점입니다. 부드럽지만 강한 인내로 어려움을 극복할 수 있습니다.\n\n심리적 해석: 이 카드는 '강함'을 보여주되, 그것이 공격적인 힘이 아닌 내면의 인내와 자기 통제에서 나온다고 말합니다. 당신은 생각보다 훨씬 강한 사람입니다. 그 힘을 믿으세요.", reversed: "🦁 힘(Strength) - 역방향\n\n자기 의심과 감정 폭발의 위험이 있습니다. 두려움에 의한 회피 패턴이 작동하고 있습니다.\n\n심리적 해석: 지금 당신은 자신의 힘을 과소평가하고 있습니다. 이 카드는 '당신은 할 수 있다'는 메시지를 다시 전달합니다. 작은 성공을 쌓아가며 자신감을 회복하세요." },
  M09: { upright: "🕯️ 은둔자(The Hermit) - 정방향\n\n내면의 지혜를 찾는 홀로의 시간이 필요합니다. 이 카드는 외부의 소음을 끄고 깊은 성찰로 들어가라는 메시지를 전달합니다.\n\n심리적 해석: 타로 전문가로서, 이 카드는 '사회적 리더'가 아닌 '내면의 현자'가 답을 가지고 있음을 알립니다. 혼자 있는 시간을 두려워하지 마세요. 그 시간이 오히려 당신을 치유할 것입니다.", reversed: "🕯️ 은둔자(The Hermit) - 역방향\n\n고립과 자기 비하, 성찰 거부가 문제입니다. 혼자 있는 것과 외로움은 다릅니다.\n\n심리적 해석: 너무 오래 혼자 있었거나, 혹은 혼자 있는 것에 대한 거부감이 문제일 수 있습니다. 이 카드는 '건강한 연결'의 중요성을 일깨웁니다. 혼자 고민하지 말고 믿을 수 있는 사람과 나누세요." },
  M10: { upright: "☸️ 운명의 수레바퀴(Wheel of Fortune) - 정방향\n\n운명의 전환점이 왔습니다. 새로운 기회의 문이 열리는 긍정적 변화의 신호입니다.\n\n심리적 해석: 이 카드는 '변화는 불가피하다'는 진리를 상징합니다. 지금 어려운 상황도 결국 지나갈 것이며, 새로운 사이클이 시작되고 있습니다. 이 변화에 저항하지 말고 흐름에 몸을 맡기세요.", reversed: "☸️ 운명의 수레바퀴(Wheel of Fortune) - 역방향\n\n불운의 사이클이지만, 그것은 영원하지 않습니다. 변화를 저항하면 더 고통스러워집니다.\n\n심리적 해석: 이 카드가 역방향일 때, 우리는 종종 '내 잘못이 아닌 것 같은 고통'을 경험합니다. 그러나 이 카드는 말합니다: '모든 것은 지나간다.' 이 어려움도 결국 변화할 것입니다." },
  M11: { upright: "⚖️ 정의(Justice) - 정방향\n\n공정한 균형과 진실, 올바른 판단이 필요합니다. 인과의 법칙이 작동하고 있습니다.\n\n심리적 해석: 이 카드는 '진실을 마주하는 용기'를 요구합니다. 당신이 마주해야 할 것을 피하지 마세요. 진실은 처음엔 아프지만, 결국 당신을 자유롭게 합니다.", reversed: "⚖️ 정의(Justice) - 역방향\n\n불공정한 상황과 편향된 판단, 책임 회피가 문제입니다.\n\n심리적 해석: 자신에게 거짓말을 하고 있을 수 있습니다. 이 카드는 '정직함'의 중요성을 강조합니다. 타인에게 정직해지기 전에, 자신에게 먼저 정직하세요." },
  M12: { upright: "🙃 매달린 사람(The Hanged Man) - 정방향\n\n새로운 시각으로 상황을 바라보는 능력이 필요합니다. 희생을 통한 깊은 통찰의 시간입니다.\n\n심리적 해석: 이 카드는 '잠시 멈추는 것'의 가치를 상징합니다. 계속 앞으로만 가려 하지 말고, 매달려 위아래가 뒤집힌 시선으로 세상을 보세요. 그러면 전혀 다른 해결책이 보일 것입니다.", reversed: "🙃 매달린 사람(The Hanged Man) - 역방향\n\n희생의 거부와 고집, 정체된 시간 낭비가 문제입니다.\n\n심리적 해석: 변화를 거부하고 같은 자리에서 버티고 있을 수 있습니다. 그러나 이 카드는 말합니다: '고집은 고통을 연장할 뿐입니다.' 놓아야 할 것을 놓아야 합니다." },
  M13: { upright: "💀 죽음(Death) - 정방향\n\n낡은 것의 끝과 새로운 시작, 근본적인 변화와 재탄생의 에너지입니다.\n\n심리적 해석: 타로에서 가장 오해받는 카드입니다. 이 카드는 '물리적 죽음'이 아닌 '변환'을 상징합니다. 끝나야 할 것이 끝나고, 새로운 것이 시작됩니다. 이 변화를 두려워하지 마세요.", reversed: "💀 죽음(Death) - 역방향\n\n변화 저항과 집착, 불필요한 연장이 문제입니다.\n\n심리적 해석: 끝내야 할 것을 끝내지 못하고 있습니다. 이 카드는 '놓아주는 것'의 중요성을 상징합니다. 끝내지 않으면 새로운 것은 시작할 수 없습니다." },
  M14: { upright: "🏺 절제(Temperance) - 정방향\n\n절제와 균형, 인내를 가지고 조화를 만들어가는 치유와 통합의 힘입니다.\n\n심리적 해석: 이 카드는 '중용'의 미덕을 상징합니다. 너무 많은 것도, 너무 적은 것도 문제입니다. 균형 잡힌 접근이 지금 가장 필요합니다. 서두르지 마세요.", reversed: "🏺 절제(Temperance) - 역방향\n\n불균형과 과잉, 인내심 부족이 문제입니다.\n\n심리적 해석: 한쪽으로 치우친 생활 패턴이 회복을 방해하고 있습니다. 이 카드는 '조절'의 필요성을 알립니다. 극단적인 변화보다는 점진적인 조정이 필요합니다." },
  M15: { upright: "😈 악마(The Devil) - 정방향\n\n집착과 두려움을 인식하고 그것에서 자유로워질 기회입니다.\n\n심리적 해석: 이 카드는 '속박'을 상징하지만, 그 속박은 실제로는 환상입니다. 당신은 생각보다 훨씬 자유로운 존재입니다. 무엇에 집착하고 있는지 정확히 보는 것이 해방의 첫 걸음입니다.", reversed: "😈 악마(The Devil) - 역방향\n\n집착 심화와 독성 관계 지속, 자기 파괴적 패턴이 깊어지고 있습니다.\n\n심리적 해석: 이 카드가 역방향일 때, 우리는 종종 '인식하지 못하는 중독'을 봅니다. 당신을 속박하는 것이 무엇인지 정직하게 질문하세요. 그것이 해방의 시작입니다." },
  M16: { upright: "🗼 탑(The Tower) - 정방향\n\n갑작스러운 변화와 기존 구조의 붕괴, 고통이지만 진실을 드러내는 정화입니다.\n\n심리적 해석: 타로에서 가장 강력한 변화의 카드입니다. 그러나 이 변화는 파괴가 아닌 '필요한 붕괴'입니다. 거짓된 기반이 무너지고, 진실만 남습니다. 이 과정은 고통스럽지만 필요합니다.", reversed: "🗼 탑(The Tower) - 역방향\n\n재앙 회피와 변화 지연, 숨겨진 위험이 여전히 존재합니다.\n\n심리적 해석: 붕괴를 피하려 하고 있지만, 그것은 불가능합니다. 이 카드는 '얼마나 오래 피할 수 있을까?'라고 묻습니다. 빨리 직면할수록 회복도 빨라집니다." },
  M17: { upright: "⭐ 별(The Star) - 정방향\n\n희망과 영감, 어둠 속에서도 빛나는 가이드의 별이 새 방향을 제시합니다.\n\n심리적 해석: 이 카드는 '치유'의 가장 강력한 상징입니다. 어둠 속에서도 희망이 살아있으며, 당신은 보호받고 있습니다. 이 카드가 나타났을 때, 회복은 단순한 가능성이 아닌 '예정된 결과'입니다.", reversed: "⭐ 별(The Star) - 역방향\n\n희망 상실과 방향 감각 혼란, 영감 고갈이 문제입니다.\n\n심리적 해석: 이 카드가 역방향일 때, 우리는 종종 '영적 고독'을 느낍니다. 그러나 이것은 영원한 상태가 아닙니다. 작은 것부터 시작하세요. 매일 감사할 한 가지를 찾는 것만으로도 변화가 시작됩니다." },
  M18: { upright: "🌙 달(The Moon) - 정방향\n\n무의식과 직관의 세계, 환상과 현실의 경계에서 진실을 탐색하는 과정입니다.\n\n심리적 해석: 이 카드는 '보이지 않는 것'의 중요성을 상징합니다. 지금 당신이 겪는 혼란은 실제로는 직관이 깨어나는 과정입니다. 꿈, 직감, 감정의 흐름에 주목하세요.", reversed: "🌙 달(The Moon) - 역방향\n\n혼란과 자기기만, 두려움에 의한 왜곡이 문제입니다.\n\n심리적 해석: 두려움이 진실을 가리고 있습니다. 이 카드는 '환상에서 깨어나라'고 말합니다. 상상의 문제와 실제 문제를 구분하세요. 대부분의 두려움은 실현되지 않습니다." },
  M19: { upright: "☀️ 태양(The Sun) - 정방향\n\n기쁨과 활력, 명확한 에너지로 성공과 행복이 빛나는 황금빛 시기입니다.\n\n심리적 해석: 타로에서 가장 긍정적인 카드입니다. 어떤 어둠도 태양 앞에서는 사라집니다. 이 카드는 당신의 회복이 성공적이며, 빛의 에너지가 당신을 채울 것임을 약속합니다. 기쁨을 허락하세요.", reversed: "☀️ 태양(The Sun) - 역방향\n\n일시적 침체와 과신, 에너지 낭비가 문제입니다.\n\n심리적 해석: 태양도 가끔 구름에 가려집니다. 그러나 그것은 영원하지 않습니다. 이 카드는 '일시적'임을 강조합니다. 곧 구름이 걷히고 다시 빛이 찾아올 것입니다." },
  M20: { upright: "🎺 심판(Judgement) - 정방향\n\n과거를 통합하고 새로운 부름에 응답하는 각성, 진정한 자기 발견입니다.\n\n심리적 해석: 이 카드는 '두 번째 기회'를 상징합니다. 과거를 심판하는 것이 아니라, 과거로부터 배우고 새로운 삶을 시작하는 것입니다. 당신은 이미 새로운 존재로 거듭나고 있습니다.", reversed: "🎺 심판(Judgement) - 역방향\n\n자기 판단 혹독과 과거 집착, 각성 거부가 문제입니다.\n\n심리적 해석: 자신에게 너무 엄격할 수 있습니다. 이 카드는 '용서'의 중요성을 강조합니다. 타인을 용서하기 전에, 자신을 먼저 용서하세요." },
  M21: { upright: "🌍 세계(The World) - 정방향\n\n사이클의 완성과 통합, 모든 경험을 통해 이룬 성취와 풍요로운 결실입니다.\n\n심리적 해석: 이 카드는 '완성'을 상징합니다. 당신이 겪어온 모든 것이 의미 있었으며, 이제 그것이 완성됩니다. 통합의 에너지가 당신을 채울 것입니다.", reversed: "🌍 세계(The World) - 역방향\n\n미완성과 마무리 거부, 완성 직전의 좌절이 문제입니다.\n\n심리적 해석: 거의 다 왔지만 마지막 한 걸음이 부족합니다. 이 카드는 '마무리'의 중요성을 상징합니다. 끝내지 않으면 새로운 시작도 없습니다." },
};

function getDetailedCardReading(card) {
  const id = String(card?.cardId || "").toUpperCase();
  const orientation = card?.orientation === "reversed" ? "reversed" : "upright";
  if (id && CARD_DETAILED_READINGS[id]) {
    return CARD_DETAILED_READINGS[id][orientation];
  }
  // Minor Arcana 기본 해석
  const prefix = id.charAt(0);
  const rankNum = id.slice(1);
  const suitName = { W: "완드", C: "컵", S: "소드", P: "펜타클" }[prefix] || "카드";
  const rankName = {
    "01": "에이스", "02": "투", "03": "쓰리", "04": "포", "05": "파이브",
    "06": "식스", "07": "세븐", "08": "에잇", "09": "나인", "10": "텐",
    "11": "페이지", "12": "나이트", "13": "퀸", "14": "킹"
  }[rankNum] || rankNum;
  
  const baseMeaning = getCardMeaning(card);
  
  if (orientation === "reversed") {
    return `🎴 ${suitName} ${rankName} - 역방향\n\n${baseMeaning}\n\n이 카드가 역방향으로 나타났을 때, 그것은 단순한 긍정/부정이 아닌 에너지의 흐름이 막혀 있음을 의미합니다. 타로 전문가로서, 이 카드는 '내면에서 저항하는 무언가'가 있음을 알립니다. 이 저항을 인정하고, 작은 단계로 에너지를 다시 흐르게 하는 것이 중요합니다.`;
  }
  
  return `🎴 ${suitName} ${rankName} - 정방향\n\n${baseMeaning}\n\n이 카드가 정방향으로 나타난 것은 그 에너지가 명확하고 순수하게 작동하고 있음을 의미합니다. 타로 전문가의 시각에서, 이 카드는 당신의 현재 상황에 정확한 메시지를 전달하고 있으며, 그 지혜를 따른다면 긍정적인 흐름을 만들 수 있습니다.`;
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

const MINDSCAN_POSITION_TITLES = [
  "표면 감정",
  "과거의 잔상",
  "핵심 진심",
  "미래 기대",
  "무의식 욕구",
];

function normalizeMindscanPair(pair, idx) {
  const slot = Number(pair?.slot || idx + 1);
  const positionLabel = asText(pair?.positionLabel) || MINDSCAN_POSITION_TITLES[idx] || `포지션 ${slot}`;
  const positionMeaning = asText(pair?.positionMeaning) || "이 위치의 감정 흐름을 읽어냅니다.";
  const mainCardName = asText(pair?.mainCardName) || `Card ${Number(pair?.mainCardId ?? idx)}`;
  const subCardName = asText(pair?.subCardName) || `Card ${Number(pair?.subCardId ?? (idx + 5))}`;

  return {
    slot,
    positionLabel,
    positionMeaning,
    mainCardName,
    subCardName,
  };
}

function parseJsonCandidate(text) {
  const source = asText(text);
  if (!source) return null;

  const candidates = [source];
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(asText(fenced[1]));

  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(source.slice(firstBrace, lastBrace + 1));
  }

  for (const raw of candidates) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // try next candidate
    }
  }

  return null;
}

function buildMindscanFallback(pairs) {
  const sections = pairs.map((pair, idx) => ({
    slot: idx + 1,
    title: pair.positionLabel,
    content:
      `${pair.mainCardName}와 ${pair.subCardName} 조합은 이 위치에서 감정을 숨기기보다 안전하게 표현할 때 관계의 신뢰가 회복된다는 신호입니다. `
      + "당장 결론을 내리기보다 상대의 반응 패턴을 관찰하고, 질문형 대화를 늘리는 것이 좋습니다.",
    mainCardName: pair.mainCardName,
    subCardName: pair.subCardName,
  }));

  return {
    source: "fallback",
    persona: "공감형 심층 분석가",
    intro: "현재 에너지는 감정의 명료화 단계에 있습니다. 서로의 의도를 확인하는 대화가 핵심입니다.",
    sections,
    masterAdvice:
      "핵심은 속도보다 방향입니다. 하루에 한 번 솔직한 감정 문장을 나누고, 상대의 답을 판단 없이 끝까지 듣는 루틴을 유지하세요.",
    closing:
      "상대의 마음을 읽는 가장 강한 방법은 추측이 아니라 일관된 관심입니다. 지금의 진심은 충분히 전달될 수 있습니다.",
  };
}

async function buildMindscanReading(env, pairs) {
  const normalizedPairs = pairs.slice(0, 5).map(normalizeMindscanPair);
  const pairLines = normalizedPairs
    .map((pair, idx) => `${idx + 1}. slot=${pair.slot}, position=${pair.positionLabel}, meaning=${pair.positionMeaning}, main=${pair.mainCardName}, sub=${pair.subCardName}`)
    .join("\n");

  const prompt = [
    "당신은 마인드 스캔 타로 마스터입니다.",
    "아래 카드 페어를 바탕으로 상대방 속마음을 분석하세요.",
    "반드시 JSON만 출력하세요. 마크다운 금지.",
    "JSON 스키마:",
    '{"persona":"","intro":"","sections":[{"slot":1,"title":"","content":"","mainCardName":"","subCardName":""}],"masterAdvice":"","closing":""}',
    "sections는 5개를 반환하고, 각 content는 2~4문장으로 작성하세요.",
    "카드 페어:",
    pairLines,
  ].join("\n\n");

  const ai = await callGeminiText(env, prompt, {
    modelEnvKeys: ["MINDSCAN_GEMINI_MODEL"],
    temperature: 0.8,
    maxOutputTokens: 4096,
    timeoutMs: Number(env.MINDSCAN_PROVIDER_TIMEOUT_MS || 45000),
  });

  const fallback = buildMindscanFallback(normalizedPairs);
  if (!ai.ok) {
    return {
      ok: true,
      ...fallback,
      message: ai.message || "Gemini 호출 실패로 기본 리딩을 반환했습니다.",
    };
  }

  const parsed = parseJsonCandidate(ai.text);
  const rawSections = Array.isArray(parsed?.sections) ? parsed.sections : [];

  const sections = normalizedPairs.map((pair, idx) => {
    const item = rawSections[idx] || {};
    return {
      slot: Number(item.slot || idx + 1),
      title: asText(item.title) || pair.positionLabel,
      content:
        asText(item.content)
        || `${pair.mainCardName}와 ${pair.subCardName}의 조합은 상대가 관계의 안정성과 진정성을 동시에 확인하고 싶어 한다는 신호입니다.`,
      mainCardName: asText(item.mainCardName) || pair.mainCardName,
      subCardName: asText(item.subCardName) || pair.subCardName,
    };
  });

  return {
    ok: true,
    source: parsed ? "gemini" : "fallback",
    persona: asText(parsed?.persona) || fallback.persona,
    intro: asText(parsed?.intro) || fallback.intro,
    sections,
    masterAdvice: asText(parsed?.masterAdvice) || fallback.masterAdvice,
    closing: asText(parsed?.closing) || fallback.closing,
  };
}

export async function handleTarotRoutes(request, env = {}) {
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

    if (path === "/mindscan") {
      const pairs = Array.isArray(body?.pairs) ? body.pairs : [];
      if (!pairs.length) {
        return json({ ok: false, message: "카드 페어 데이터가 필요합니다." }, { status: 400 });
      }
      const reading = await buildMindscanReading(env, pairs);
      return json(reading);
    }

    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}
