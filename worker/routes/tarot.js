import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { callGeminiText } from "../lib/gemini.js";
import { requireAuth } from "../lib/auth.js";

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
    const meta = parseCardMeta(base.cardId);
    return {
      id: base.cardId,
      cardId: base.cardId,
      name: base.name,
      nameEn: base.name,
      nameKr: base.nameKr,
      nameKo: base.nameKr,
      position: spread.labels[idx],
      orientation,
      arcana: meta.arcana,
      suit: meta.suit,
      number: meta.number,
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
  const name = String(card?.nameKo || card?.nameKr || card?.nameEn || card?.name || "").trim() || "이름이 확인되지 않은 카드";
  const orientation = card?.orientation === "reversed" ? "역방향" : "정방향";
  return `${name}(${orientation})`;
}

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function removeRepeatedSentences(text) {
  const sentences = String(text || "")
    .split(/(?<=[.!?。！？]|입니다\.|세요\.|합니다\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set();
  const result = [];

  for (const sentence of sentences) {
    const normalized = sentence
      .replace(/\s+/g, " ")
      .replace(/[“”"']/g, "")
      .trim();

    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(sentence);
    }
  }

  return result.join(" ");
}

const CONTENT_BANNED_PHRASES = [
  /카드\(정방향\)의\s*포지션\s*핵심\s*의미는/gi,
  /카드\(역방향\)의\s*포지션\s*핵심\s*의미는/gi,
  /입니다\.\s*이\s*포지션의\s*메시지는/gi,
  /카드\(정방향\)/gi,
  /카드\(역방향\)/gi,
  /카드가\s*담은/gi,
  /카드가\s*보여주는/gi,
  /포지션\s*핵심\s*의미/gi,
  /카드가\s*가리키는\s*장애물/gi,
  /관계\s*상담\s*관점에서[,.]?/gi,
  /다섯\s*장의\s*카드가\s*재회의\s*실마리를[,.]?/gi,
  /이번\s*리딩의\s*핵심은\s*재회\s*가능성\s*자체보다[^.。!?]*[.。!?]?/gi,
  /실전\s*읽는\s*정확함/gi,
  /읽는\s*정확함/gi,
  /한\s*번에\s*한\s*가지씩\s*해결하세요/gi,
];

function cleanRelationshipBannedPhrases(text) {
  let out = String(text || "");
  CONTENT_BANNED_PHRASES.forEach((pattern) => {
    out = out.replace(pattern, "");
  });
  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}

const FORBIDDEN_TONE_PATTERNS = [
  /20\s*년[^\n.]{0,40}(경력|이상|타로|상담|리더|전문가)/gi,
  /타로\s*경력\s*20\s*년[^\n.]*/gi,
  /20\s*년\s*경력\s*타로\s*상담가[^\n.]*/gi,
  /베테랑\s*타로\s*상담사/gi,
];

const NATURAL_WORD_REPLACEMENTS = [
  [/병목/g, "막히는 지점"],
  [/프로토콜/g, "진행 순서"],
  [/데이터/g, "근거"],
  [/오차/g, "차이"],
  [/실전\s*읽는\s*정확함/g, "실전 해석 정확도"],
  [/읽는\s*정확함/g, "해석 정확도"],
  [/정밀도/g, "해석 정확도"],
  [/정확도/g, "해석 정확도"],
];

function cleanForbiddenTone(text) {
  let out = String(text || "");
  FORBIDDEN_TONE_PATTERNS.forEach((pattern) => {
    out = out.replace(pattern, "");
  });
  return out;
}

function replaceWithNaturalWords(text) {
  let out = String(text || "");
  NATURAL_WORD_REPLACEMENTS.forEach(([pattern, replacement]) => {
    out = out.replace(pattern, replacement);
  });
  return out;
}

function dedupeBlocks(text) {
  const source = String(text || "").trim();
  if (!source) return "";
  const blocks = source
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const seen = new Set();
  const unique = [];
  blocks.forEach((part) => {
    const key = part.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(part);
  });
  return unique.join("\n\n").trim();
}

function smoothCounselorTone(text) {
  if (!text) return "";
  let out = String(text);
  out = cleanForbiddenTone(out);
  out = cleanRelationshipBannedPhrases(out);
  out = replaceWithNaturalWords(out);
  out = out.replace(/\s{2,}/g, " ");
  out = out.replace(/\n{3,}/g, "\n\n");
  out = out.replace(/([가-힣A-Za-z]{2,})(\s+\1){1,}/g, "$1");
  out = removeRepeatedSentences(out);
  out = dedupeBlocks(out);
  return out.trim();
}

function deepPolishReading(value) {
  if (typeof value === "string") return smoothCounselorTone(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => deepPolishReading(item))
      .filter((item) => {
        if (typeof item === "string") return item.trim().length > 0;
        return item !== undefined && item !== null;
      });
  }
  if (value && typeof value === "object") {
    const next = {};
    Object.entries(value).forEach(([key, item]) => {
      next[key] = deepPolishReading(item);
    });
    return next;
  }
  return value;
}

function buildCardMeaningGuide(cards) {
  const safeCards = Array.isArray(cards) ? cards : [];
  return safeCards
    .map((card, idx) => {
      const name = asText(card?.nameKo || card?.nameKr || card?.nameEn || card?.name) || "이름이 확인되지 않은 카드";
      const orientation = card?.orientation === "reversed" ? "역방향" : "정방향";
      const meaning = asText(card?.interpretation) || getCardMeaning(card);
      return smoothCounselorTone(`${idx + 1}번 카드 ${name}(${orientation}): ${meaning}`);
    })
    .filter(Boolean);
}

function finalizeReadingPayload(reading, cards) {
  const polished = deepPolishReading(reading);
  if (!polished || typeof polished !== "object") return polished;
  const cardMeaningGuide = buildCardMeaningGuide(cards);
  if (cardMeaningGuide.length) {
    polished.cardMeaningGuide = cardMeaningGuide;
  }
  return polished;
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
  const normalizedCards = normalizeRelationshipCards(cards);
  const structured = buildRelationshipReading(normalizedCards);
  if (!reading || typeof reading !== "object") {
    return structured;
  }
  return {
    ...reading,
    ...structured,
    positionBreakdown: structured.positionBreakdown,
    finalAdvice: structured.finalAdvice,
    advice: structured.advice,
  };
}

function enhanceReunionReading(reading, cards) {
  const normalizedCards = normalizeReunionCards(cards);
  const structured = buildReunionReading(normalizedCards);
  if (!reading || typeof reading !== "object") {
    return structured;
  }
  return {
    ...reading,
    ...structured,
    positions: structured.positions,
    summary: structured.summary,
    finalGuide: structured.finalGuide,
    actionPlan: structured.actionPlan,
  };
}

function applyQualityEnhancement(spreadType, reading, cards) {
  const normalized = normalizeSpreadType(spreadType || "one_card");
  if (!reading || typeof reading !== "object") return reading;
  let next = reading;
  if (normalized === "relationship_six_card") next = enhanceRelationshipReading(reading, cards);
  else if (normalized === "reunion_lighthouse_five_card") next = enhanceReunionReading(reading, cards);
  return finalizeReadingPayload(next, cards);
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

const REL_POSITION_KEYS = ["position_1", "position_2", "position_3", "position_4", "position_5", "position_6"];

const MAJOR_LOVE_MEANINGS = {
  M00: {
    upright: { attraction: "새로운 느낌에 강하게 끌리는 구간입니다.", emotionalState: "가볍지만 진심 어린 호기심이 살아 있습니다.", relationshipPattern: "연락과 만남이 빠르게 시작될 수 있습니다.", hiddenConcern: "속도가 앞서면 약속의 밀도가 약해질 수 있습니다.", advice: "설렘을 살리되 다음 만남의 기준을 먼저 정하세요." },
    reversed: { attraction: "끌림은 있지만 불안이 먼저 올라오는 상태입니다.", emotionalState: "확신이 없어 감정이 오락가락하기 쉽습니다.", relationshipPattern: "연락 텀이 들쭉날쭉해 오해가 생기기 쉽습니다.", hiddenConcern: "충동적 확인 요구가 상대의 부담을 키울 수 있습니다.", advice: "결론을 재촉하지 말고 행동 패턴을 1주일만 관찰하세요." },
  },
  M01: {
    upright: { attraction: "상대의 추진력과 표현력에 호감이 커집니다.", emotionalState: "주도권을 잡고 싶은 의지가 분명합니다.", relationshipPattern: "연락, 대화, 만남 제안이 비교적 또렷하게 이어집니다.", hiddenConcern: "한쪽 주도만 강하면 거리감이 생길 수 있습니다.", advice: "의견 제시 후 상대의 속도도 함께 확인하세요." },
    reversed: { attraction: "매력은 있으나 말과 행동의 온도 차이가 보입니다.", emotionalState: "확신 부족으로 표현이 과장되거나 축소되기 쉽습니다.", relationshipPattern: "약속을 잡아도 실행이 늦어질 수 있습니다.", hiddenConcern: "확인 없는 기대가 오해를 만듭니다.", advice: "화려한 말보다 실제 이행률을 기준으로 판단하세요." },
  },
  M02: {
    upright: { attraction: "말보다 분위기와 눈치를 통해 호감을 느끼는 흐름입니다.", emotionalState: "서로 조심스럽지만 감정의 결은 깊습니다.", relationshipPattern: "연락은 잦지 않아도 대화의 밀도가 높은 편입니다.", hiddenConcern: "해석을 숨긴 채 참으면 거리감이 커질 수 있습니다.", advice: "애매한 부분은 부드럽게 질문해 확인하세요." },
    reversed: { attraction: "신비로움에 끌리지만 불안도 함께 커집니다.", emotionalState: "상대의 의도를 과도하게 추측하기 쉽습니다.", relationshipPattern: "읽씹, 단답 같은 신호에 의미를 과하게 부여하기 쉽습니다.", hiddenConcern: "오해가 누적되면 대화가 닫힐 수 있습니다.", advice: "추측 대신 사실 3가지를 적고 대화하세요." },
  },
  M03: {
    upright: { attraction: "따뜻한 배려와 안정감에 호감이 커집니다.", emotionalState: "관계를 키우고 싶은 정서가 살아 있습니다.", relationshipPattern: "만남의 만족도가 높고 연락도 부드럽게 이어집니다.", hiddenConcern: "기대가 커지면 작은 지연도 부담으로 느껴질 수 있습니다.", advice: "고마움과 요청을 함께 말해 관계 균형을 맞추세요." },
    reversed: { attraction: "끌림은 있으나 감정 소모가 쉽게 생깁니다.", emotionalState: "받고 싶은 마음이 커져 예민해질 수 있습니다.", relationshipPattern: "대화가 돌봄 요구 중심으로 치우치기 쉽습니다.", hiddenConcern: "상대의 여유를 무시하면 거리감이 생깁니다.", advice: "요구 전에 내 컨디션과 기대치를 먼저 정리하세요." },
  },
  M04: {
    upright: { attraction: "신뢰감 있고 책임감 있는 태도에 호감이 생깁니다.", emotionalState: "관계를 명확히 정의하고 싶은 마음이 있습니다.", relationshipPattern: "약속과 일정이 비교적 체계적으로 맞춰집니다.", hiddenConcern: "기준이 너무 단단하면 상대가 부담을 느낄 수 있습니다.", advice: "원칙은 지키되 대화 톤은 부드럽게 유지하세요." },
    reversed: { attraction: "강한 존재감에 끌리지만 통제감도 함께 느껴집니다.", emotionalState: "상대가 경직되거나 방어적으로 보일 수 있습니다.", relationshipPattern: "대화가 맞다/틀리다 구도로 흐르기 쉽습니다.", hiddenConcern: "자존심 경쟁이 관계 속도를 늦출 수 있습니다.", advice: "정답 싸움보다 감정 확인 질문을 먼저 두세요." },
  },
  M05: {
    upright: { attraction: "진지한 태도와 관계에 대한 성실함이 보입니다.", emotionalState: "관계를 가볍게 보지 않으려는 마음이 있습니다.", relationshipPattern: "약속, 기준, 예의를 중요하게 보는 흐름입니다.", hiddenConcern: "형식이 강하면 감정 표현이 답답해질 수 있습니다.", advice: "기준을 말할 때 감정도 같이 표현하세요." },
    reversed: { attraction: "끌림은 있으나 가치관 차이가 도드라질 수 있습니다.", emotionalState: "관계 정의를 미루거나 애매하게 둘 수 있습니다.", relationshipPattern: "연락은 이어져도 확정 대화는 늦어질 수 있습니다.", hiddenConcern: "기준 충돌을 방치하면 오해가 반복됩니다.", advice: "서로의 기대치 3가지를 먼저 합의해 보세요." },
  },
  M06: {
    upright: { attraction: "상호 호감과 정서적 연결이 강한 카드입니다.", emotionalState: "끌림과 관계 의지가 함께 올라옵니다.", relationshipPattern: "연락과 만남 모두에서 따뜻한 반응이 나타나기 쉽습니다.", hiddenConcern: "좋은 흐름일수록 속도 차이 관리가 필요합니다.", advice: "호감을 확인하되 약속 이행으로 신뢰를 쌓으세요." },
    reversed: { attraction: "호감은 있지만 선택과 확신이 흔들릴 수 있습니다.", emotionalState: "마음이 갈려 거리감이 생길 수 있습니다.", relationshipPattern: "가까워졌다가 멀어지는 패턴이 반복될 수 있습니다.", hiddenConcern: "결정 회피가 상대의 부담을 키웁니다.", advice: "관계 목표를 모호하게 두지 말고 대화로 정리하세요." },
  },
  M07: {
    upright: { attraction: "강하게 끌리지만 주도권과 속도감이 중요한 관계입니다.", emotionalState: "한쪽이 관계를 밀어붙이고 싶어 하는 마음이 있습니다.", relationshipPattern: "연락이나 만남이 빠르게 진행될 수 있지만 감정 확인보다 행동이 앞설 수 있습니다.", hiddenConcern: "속도가 다르면 한쪽은 부담을 느낄 수 있습니다.", advice: "명확한 제안은 좋지만 상대 반응 속도를 존중하세요." },
    reversed: { attraction: "끌림은 있지만 방향이 엇갈리거나 감정이 급하게 흔들립니다.", emotionalState: "마음이 없는 것보다 어떻게 움직일지 몰라 우왕좌왕할 가능성이 큽니다.", relationshipPattern: "연락이 갑자기 빨라졌다가 느려지는 기복이 생길 수 있습니다.", hiddenConcern: "자존심과 불안, 확인 욕구가 관계를 흔듭니다.", advice: "지금은 결론 압박보다 차분한 속도 합의가 먼저입니다." },
  },
  M08: {
    upright: { attraction: "따뜻한 단단함과 배려에 매력을 느낍니다.", emotionalState: "감정을 안정적으로 다루려는 성숙함이 있습니다.", relationshipPattern: "갈등이 와도 대화로 회복할 가능성이 높습니다.", hiddenConcern: "참기만 하면 오히려 거리감이 커질 수 있습니다.", advice: "부드럽게 경계를 말해 감정 소모를 줄이세요." },
    reversed: { attraction: "끌림은 있으나 자신감 저하가 관계를 흔들 수 있습니다.", emotionalState: "작은 신호에도 불안이 커지기 쉽습니다.", relationshipPattern: "확인 요구가 늘며 대화 톤이 날카로워질 수 있습니다.", hiddenConcern: "자기비난이 약속 이행 의지를 약하게 만듭니다.", advice: "감정 폭주 전 쉬는 텀을 만들고 대화를 재개하세요." },
  },
  M09: {
    upright: { attraction: "상대의 깊이와 진중함에 끌리는 흐름입니다.", emotionalState: "조용히 관계를 관찰하며 확신을 모으는 단계입니다.", relationshipPattern: "연락 빈도는 적어도 의미 있는 대화가 중요해집니다.", hiddenConcern: "침묵이 길어지면 오해가 커질 수 있습니다.", advice: "짧아도 솔직한 안부 대화를 주기적으로 이어가세요." },
    reversed: { attraction: "관심은 있으나 고립감이 관계를 가로막을 수 있습니다.", emotionalState: "거리감이 커지고 혼자 결론 내리기 쉽습니다.", relationshipPattern: "연락을 미루다 만남 타이밍도 놓치기 쉽습니다.", hiddenConcern: "침묵을 무관심으로 오해할 가능성이 큽니다.", advice: "확신이 없어도 현재 상태를 짧게 공유해 보세요." },
  },
  M10: {
    upright: { attraction: "관계의 전환점에서 서로를 다시 보게 됩니다.", emotionalState: "예상 밖의 호감 신호가 들어올 수 있습니다.", relationshipPattern: "연락 흐름이 바뀌며 만남 기회가 새롭게 생길 수 있습니다.", hiddenConcern: "좋은 변화도 준비 없이 받으면 부담이 됩니다.", advice: "변화가 왔을 때 약속의 기준을 분명히 하세요." },
    reversed: { attraction: "끌림은 있으나 타이밍이 자주 어긋납니다.", emotionalState: "기대와 실망의 반복으로 피로가 생길 수 있습니다.", relationshipPattern: "연락 텀과 만남 계획이 자주 미뤄질 수 있습니다.", hiddenConcern: "운에 맡기면 같은 오해가 반복됩니다.", advice: "작은 약속 하나부터 현실적으로 맞추세요." },
  },
  M11: {
    upright: { attraction: "성숙한 대화와 균형감 있는 태도에 끌립니다.", emotionalState: "감정보다 공정함과 신뢰를 중시하는 흐름입니다.", relationshipPattern: "기준을 맞추면 관계 속도가 안정됩니다.", hiddenConcern: "지나친 계산은 친밀감을 늦출 수 있습니다.", advice: "사실 확인과 감정 표현을 같은 비중으로 두세요." },
    reversed: { attraction: "호감은 있지만 불공정하다는 느낌이 생길 수 있습니다.", emotionalState: "한쪽만 노력한다는 부담이 커질 수 있습니다.", relationshipPattern: "대화가 판정 모드로 흘러 갈등이 길어질 수 있습니다.", hiddenConcern: "서운함을 쌓아두면 거리감이 고착됩니다.", advice: "문제 정의보다 책임 분담 합의를 먼저 시도하세요." },
  },
  M12: {
    upright: { attraction: "다른 관점으로 상대를 보게 되는 카드입니다.", emotionalState: "지금은 속도를 늦추고 의미를 재해석하는 단계입니다.", relationshipPattern: "연락 빈도보다 대화의 질이 더 중요해집니다.", hiddenConcern: "기다림의 목적이 없으면 불안이 커집니다.", advice: "멈춤의 시간을 관계 점검 시간으로 쓰세요." },
    reversed: { attraction: "끌림은 있지만 답답함이 먼저 느껴질 수 있습니다.", emotionalState: "정체감과 피로가 커져 거리감이 생깁니다.", relationshipPattern: "같은 대화를 반복하며 결론이 밀릴 수 있습니다.", hiddenConcern: "고집이 오해를 키우고 약속 이행을 늦춥니다.", advice: "한 번의 차분한 재정의 대화로 방향을 바꾸세요." },
  },
  M13: {
    upright: { attraction: "관계를 새 단계로 바꾸는 결단의 에너지입니다.", emotionalState: "과거 패턴을 끝내고 싶다는 마음이 큽니다.", relationshipPattern: "오래된 오해를 정리하면 흐름이 급격히 개선됩니다.", hiddenConcern: "정리 없이 버티면 부담만 커집니다.", advice: "버릴 패턴과 지킬 약속을 분리해 선언하세요." },
    reversed: { attraction: "미련과 익숙함 사이에서 흔들리는 상태입니다.", emotionalState: "끝내야 할 문제를 미루며 피로가 누적됩니다.", relationshipPattern: "연락은 이어지지만 본질 대화가 지연될 수 있습니다.", hiddenConcern: "변화 회피가 더 큰 거리감을 부릅니다.", advice: "지금 필요한 결정을 작은 단위로 실행하세요." },
  },
  M14: {
    upright: { attraction: "안정적이고 균형 잡힌 관계 운영에 끌립니다.", emotionalState: "서로 맞춰가려는 의지가 살아 있습니다.", relationshipPattern: "연락 속도와 만남 주기를 조율하면 관계가 좋아집니다.", hiddenConcern: "좋은 흐름에서도 방심하면 약속이 느슨해질 수 있습니다.", advice: "서로 편한 속도를 명확히 합의하세요." },
    reversed: { attraction: "호감은 있으나 균형이 자주 깨질 수 있습니다.", emotionalState: "기대치가 엇갈려 부담이 커집니다.", relationshipPattern: "과잉 연락과 침묵이 번갈아 나오기 쉽습니다.", hiddenConcern: "감정 기복이 대화 신뢰를 해칠 수 있습니다.", advice: "대화 빈도와 경계를 먼저 맞추는 것이 우선입니다." },
  },
  M15: {
    upright: { attraction: "강한 끌림과 집착이 동시에 작동할 수 있습니다.", emotionalState: "놓치기 싫은 마음이 크게 올라옵니다.", relationshipPattern: "연락 확인 욕구가 커져 속도 집착이 생기기 쉽습니다.", hiddenConcern: "불안 기반 행동이 상대 부담을 키울 수 있습니다.", advice: "감정 강도를 낮추고 사실 중심 대화를 유지하세요." },
    reversed: { attraction: "강한 자석 같은 끌림에서 벗어나려는 흐름입니다.", emotionalState: "관계 중독 패턴을 자각하기 시작합니다.", relationshipPattern: "불필요한 확인 연락을 줄이면 관계가 안정됩니다.", hiddenConcern: "미련이 남아 재발 패턴이 올 수 있습니다.", advice: "지킬 선을 문장으로 정해 반복 실천하세요." },
  },
  M16: {
    upright: { attraction: "관계의 진실이 드러나는 전환 카드입니다.", emotionalState: "숨겨둔 감정이 급하게 터질 수 있습니다.", relationshipPattern: "갈등 후 대화 구조를 바꾸면 오히려 가까워질 수 있습니다.", hiddenConcern: "충동적 단절 선언은 장기 부담을 남깁니다.", advice: "감정 폭발보다 복구 대화 규칙을 먼저 정하세요." },
    reversed: { attraction: "무너질 것 같은 불안을 억지로 버티는 흐름입니다.", emotionalState: "문제를 알지만 미루며 피로가 쌓입니다.", relationshipPattern: "같은 갈등이 형태만 바꿔 반복될 수 있습니다.", hiddenConcern: "회피가 누적되면 거리감이 고착됩니다.", advice: "작은 사실 확인부터 시작해 관계를 재정비하세요." },
  },
  M17: {
    upright: { attraction: "따뜻한 희망과 신뢰 회복의 기운이 있습니다.", emotionalState: "상대에게 다시 기대를 걸고 싶어지는 흐름입니다.", relationshipPattern: "대화 톤이 부드러워지면 연락 흐름도 안정됩니다.", hiddenConcern: "기대가 커질수록 실망 관리가 필요합니다.", advice: "희망은 유지하되 행동 증거로 확인하세요." },
    reversed: { attraction: "호감은 남아도 실망 경험이 크게 남아 있습니다.", emotionalState: "좋아도 믿기 어렵다는 마음이 생길 수 있습니다.", relationshipPattern: "연락이 이어져도 확신 대화가 늦어질 수 있습니다.", hiddenConcern: "부정적 예측이 오해를 확대합니다.", advice: "작은 약속 이행부터 신뢰를 다시 쌓으세요." },
  },
  M18: {
    upright: { attraction: "감정의 미묘한 결을 강하게 느끼는 시기입니다.", emotionalState: "호감과 불안이 함께 움직일 수 있습니다.", relationshipPattern: "야간 연락, 애매한 말, 느린 답장에 흔들리기 쉽습니다.", hiddenConcern: "추측이 사실을 덮으면 거리감이 커집니다.", advice: "감정 해석 전에 대화로 사실을 확인하세요." },
    reversed: { attraction: "혼란이 걷히며 본질이 보이기 시작합니다.", emotionalState: "과한 불안에서 벗어나 현실적으로 보게 됩니다.", relationshipPattern: "오해를 정리하면 연락과 만남 흐름이 개선됩니다.", hiddenConcern: "해소되지 않은 의심이 재발할 수 있습니다.", advice: "결론보다 확인 질문을 습관화하세요." },
  },
  M19: {
    upright: { attraction: "호감 표현이 자연스럽고 밝게 이어지는 카드입니다.", emotionalState: "상대와 함께 있을 때 안정감이 큽니다.", relationshipPattern: "만남과 대화에서 긍정 반응이 분명히 나타납니다.", hiddenConcern: "좋은 분위기만 믿고 기준을 놓치면 흔들릴 수 있습니다.", advice: "기분 좋은 흐름일 때 약속 기준을 명확히 하세요." },
    reversed: { attraction: "따뜻함은 있으나 확신이 약해질 수 있습니다.", emotionalState: "표면은 밝아도 속으로는 부담을 느낄 수 있습니다.", relationshipPattern: "연락은 오가지만 깊은 대화가 얕아질 수 있습니다.", hiddenConcern: "과장된 낙관이 오해를 키울 수 있습니다.", advice: "좋은 분위기 속에서도 핵심 질문을 피하지 마세요." },
  },
  M20: {
    upright: { attraction: "관계를 다시 정의하고 싶어지는 카드입니다.", emotionalState: "과거를 정리하고 진지한 선택을 하려는 마음이 큽니다.", relationshipPattern: "확정 대화와 약속 재설계가 필요한 시기입니다.", hiddenConcern: "정리 없이 재시작하면 같은 패턴이 반복됩니다.", advice: "관계 기준과 기대치를 문장으로 합의하세요." },
    reversed: { attraction: "마음은 남아도 결정을 미루기 쉽습니다.", emotionalState: "과거의 상처가 현재 선택을 붙잡을 수 있습니다.", relationshipPattern: "대화가 과거 회상에 머물고 행동 전환이 늦어집니다.", hiddenConcern: "미해결 감정이 부담으로 누적됩니다.", advice: "과거 평가보다 지금의 행동 기준을 먼저 세우세요." },
  },
  M21: {
    upright: { attraction: "관계 완성도를 높일 수 있는 안정 카드입니다.", emotionalState: "호감과 신뢰가 균형 있게 자랍니다.", relationshipPattern: "연락, 만남, 약속이 일관되면 빠르게 안정됩니다.", hiddenConcern: "완성 직전의 방심이 오해를 만들 수 있습니다.", advice: "좋은 흐름일수록 작은 약속을 꾸준히 지키세요." },
    reversed: { attraction: "연결은 있으나 마무리되지 않은 과제가 남아 있습니다.", emotionalState: "애매한 상태가 길어져 거리감이 생길 수 있습니다.", relationshipPattern: "관계는 이어지지만 확정이 늦어질 수 있습니다.", hiddenConcern: "미완성 상태가 서로의 부담을 키웁니다.", advice: "남은 쟁점 1가지를 정해 이번 주에 대화하세요." },
  },
};

let REL_CARD_LOOKUP = null;

function getRelationshipCardLookup() {
  if (REL_CARD_LOOKUP) return REL_CARD_LOOKUP;
  REL_CARD_LOOKUP = new Map();
  getDeck().forEach((card) => {
    REL_CARD_LOOKUP.set(String(card.cardId || "").toUpperCase(), card);
  });
  return REL_CARD_LOOKUP;
}

function parseCardMeta(cardId) {
  const id = String(cardId || "").toUpperCase();
  if (/^M\d{2}$/.test(id)) {
    return { arcana: "major", suit: undefined, number: Number(id.slice(1)) };
  }
  const suitMap = { W: "wands", C: "cups", S: "swords", P: "pentacles" };
  const prefix = id.charAt(0);
  const suit = suitMap[prefix];
  const rawNum = id.slice(1);
  const parsedNum = Number(rawNum);
  return {
    arcana: suit ? "minor" : "major",
    suit,
    number: Number.isFinite(parsedNum) && parsedNum > 0 ? parsedNum : rawNum || undefined,
  };
}

function buildMinorLoveMeaning(card) {
  const suit = String(card?.suit || "").toLowerCase();
  const rank = Number(card?.number || 0);
  const suitTheme = {
    cups: "감정과 공감",
    wands: "열정과 추진",
    swords: "대화와 판단",
    pentacles: "현실과 안정",
  };
  const rankTone = rank >= 11 ? "성숙한 역할 의식" : rank >= 7 ? "점검과 조율" : "관계의 기초 형성";
  const theme = suitTheme[suit] || "관계 운영";
  return {
    upright: {
      attraction: `${theme} 영역에서 호감이 선명하게 작동합니다.`,
      emotionalState: `${rankTone}이 올라오며 관계 속도와 약속을 맞추려는 마음이 보입니다.`,
      relationshipPattern: "연락과 만남의 행동 패턴을 맞추면 관계가 빠르게 안정됩니다.",
      hiddenConcern: "기대치 합의가 없으면 작은 오해도 부담으로 커질 수 있습니다.",
      advice: "대화를 통해 속도와 약속 기준을 먼저 정하세요.",
    },
    reversed: {
      attraction: `${theme}의 끌림은 있으나 거리감이 번갈아 나타날 수 있습니다.`,
      emotionalState: `${rankTone}이 흔들리며 확신보다 불안이 앞서기 쉽습니다.`,
      relationshipPattern: "연락 텀과 만남 리듬이 불규칙하면 오해가 반복될 수 있습니다.",
      hiddenConcern: "추측이 늘면 대화가 닫히고 관계 부담이 커질 수 있습니다.",
      advice: "결론 압박 대신 사실 확인 대화를 짧게 이어가세요.",
    },
  };
}

function getLoveMeaningProfile(card) {
  const id = String(card?.cardId || "").toUpperCase();
  if (id && MAJOR_LOVE_MEANINGS[id]) return MAJOR_LOVE_MEANINGS[id];
  return buildMinorLoveMeaning(card);
}

function normalizeRelationshipCard(raw, idx) {
  const source = raw && typeof raw === "object" ? raw : {};
  const lookup = getRelationshipCardLookup();
  const cardId = String(source.cardId || source.id || "").toUpperCase();
  const fromDeck = lookup.get(cardId) || null;
  const meta = parseCardMeta(cardId);
  const nameKo = asText(source.nameKo || source.nameKr || fromDeck?.nameKr);
  const nameEn = asText(source.nameEn || source.name || fromDeck?.name);
  const orientation = source.orientation === "reversed" ? "reversed" : "upright";
  const keywords = Array.isArray(source.keywords)
    ? source.keywords.filter(Boolean)
    : (Array.isArray(fromDeck?.keywords) ? fromDeck.keywords.filter(Boolean) : []);
  const profile = getLoveMeaningProfile({ cardId, suit: meta.suit, number: meta.number });
  if (!nameKo && !nameEn) {
    console.error("[tarot/love-reading] card name missing for", cardId || `index_${idx}`);
  }
  return {
    ...source,
    id: cardId || `unknown_${idx + 1}`,
    cardId: cardId || `unknown_${idx + 1}`,
    nameKo,
    nameKr: nameKo || nameEn || "",
    nameEn,
    name: nameEn || nameKo || "",
    arcana: meta.arcana,
    arcanaType: meta.arcana === "major" ? "Major" : "Minor",
    suit: meta.suit,
    number: meta.number,
    orientation,
    position: REL_POSITION_KEYS[idx] || source.position || `position_${idx + 1}`,
    keywords,
    loveUpright: profile.upright.relationshipPattern,
    loveReversed: profile.reversed.relationshipPattern,
  };
}

function normalizeRelationshipCards(cards) {
  const arr = Array.isArray(cards) ? cards : [];
  return arr.slice(0, 6).map((card, idx) => normalizeRelationshipCard(card, idx));
}

function relationshipText(text) {
  return smoothCounselorTone(removeRepeatedSentences(String(text || "")));
}

function buildPositionReading(card, idx) {
  const positionTitle = REL_POSITION_LABELS[idx] || `포지션 ${idx + 1}`;
  const cardName = String(card?.nameKo || card?.nameKr || card?.nameEn || card?.name || "").trim() || "이름이 확인되지 않은 카드";
  const orientationLabel = card?.orientation === "reversed" ? "역방향" : "정방향";
  const profile = getLoveMeaningProfile(card);
  const orientKey = card?.orientation === "reversed" ? "reversed" : "upright";
  const meaning = profile[orientKey];

  if (idx === 0) {
    const headline = orientationLabel === "정방향"
      ? "당신의 시선은 호감의 이유를 또렷하게 보고 있습니다."
      : "당신의 기대가 상대의 실제 행동 패턴보다 앞서갈 수 있습니다.";
    const summary = `${meaning.attraction} ${meaning.emotionalState}`;
    const detail = orientationLabel === "정방향"
      ? `당신은 상대의 매력을 분명히 느끼고 있고, 연락 속도와 만남의 분위기에서 확신을 얻고 싶어합니다. 다만 호감이 클수록 오해도 빨라질 수 있으니, 단일 장면보다 반복되는 행동 패턴을 보는 것이 현실적입니다.`
      : `상대가 애매하게 반응할수록 당신은 빈칸을 상상으로 채우기 쉽습니다. 연락이 빨랐던 날과 느렸던 날의 행동 패턴을 비교하지 않으면 오해와 부담이 함께 커질 수 있습니다.`;
    return {
      positionTitle,
      cardName,
      orientationLabel,
      headline: relationshipText(headline),
      summary: relationshipText(summary),
      detail: relationshipText(detail),
      relationshipInsight: relationshipText(`${meaning.relationshipPattern} 지금 시선이 현실적인지 확인하려면 대화 내용보다 반복 행동을 기준으로 판단하세요.`),
      advice: relationshipText(`${meaning.advice} 지금은 결론을 서두르기보다 연락과 만남의 속도를 맞추는 데 집중하세요.`),
      caution: relationshipText(`${meaning.hiddenConcern} 상대를 이상화하거나 단정하는 표현은 잠시 줄이세요.`),
    };
  }

  if (idx === 1) {
    const headline = orientationLabel === "정방향"
      ? "상대는 이 관계를 가능성 있는 흐름으로 보고 있습니다."
      : "상대는 관계의 속도와 부담 사이에서 관망하는 중입니다.";
    const summary = `${meaning.attraction} 상대는 현재 관계 속도를 민감하게 체감하고 있습니다.`;
    const detail = orientationLabel === "정방향"
      ? "상대는 관계를 가볍게 넘기기보다 현실적으로 이어갈 수 있는지 살피는 편입니다. 연락과 만남의 템포가 맞으면 약속 이행 의지도 따라올 가능성이 큽니다."
      : "상대는 마음이 없어서가 아니라 관계의 부담을 줄일 방법을 찾지 못해 속도를 늦출 수 있습니다. 확정 대화를 미룬다고 해도 완전한 거절로 단정하기는 이릅니다.";
    return {
      positionTitle,
      cardName,
      orientationLabel,
      headline: relationshipText(headline),
      summary: relationshipText(summary),
      detail: relationshipText(detail),
      relationshipInsight: relationshipText(`${meaning.relationshipPattern} 상대는 대화 톤, 약속 부담, 관계 속도 균형을 가장 신경 쓰고 있습니다.`),
      advice: relationshipText(`${meaning.advice} 확답 요구 대신 관계를 어떻게 운영할지 질문해 보세요.`),
      caution: relationshipText(`${meaning.hiddenConcern} 반응 지연을 무관심으로 단정하면 거리감이 커질 수 있습니다.`),
    };
  }

  if (idx === 2) {
    const headline = orientationLabel === "정방향"
      ? "상대는 당신에게 호감과 신뢰 가능성을 동시에 느낍니다."
      : "상대는 호감이 있어도 조심스러움과 거리감을 함께 느낄 수 있습니다.";
    const summary = `${meaning.emotionalState} 말보다 행동 패턴에서 진심을 확인해야 합니다.`;
    const detail = orientationLabel === "정방향"
      ? "상대는 당신을 매력적인 사람으로 보되, 관계가 빨라질 때 부담이 생기지 않는지 함께 확인하려 합니다. 말이 다정해도 행동 패턴이 일관적인지 보는 것이 중요합니다."
      : "상대는 끌림이 있어도 상처 회피나 현실 부담 때문에 한 발 물러서는 반응을 보일 수 있습니다. 말과 행동의 간격은 거절보다는 확신 부족 신호일 수 있습니다.";
    return {
      positionTitle,
      cardName,
      orientationLabel,
      headline: relationshipText(headline),
      summary: relationshipText(summary),
      detail: relationshipText(detail),
      relationshipInsight: relationshipText(`${meaning.relationshipPattern} 호감과 거리감이 동시에 있을 수 있으니, 대화의 질과 약속 이행을 함께 보세요.`),
      advice: relationshipText(`${meaning.advice} 추측 질문보다 "나는 이렇게 느꼈어" 방식의 대화를 추천합니다.`),
      caution: relationshipText(`${meaning.hiddenConcern} 확신을 강요하면 상대 방어가 더 커질 수 있습니다.`),
    };
  }

  if (idx === 3) {
    const headline = orientationLabel === "정방향"
      ? "상대의 연애 의지는 행동으로 이어질 가능성이 있습니다."
      : "감정은 있어도 움직일 여유가 부족할 수 있습니다.";
    const summary = `${meaning.emotionalState} 연락, 만남, 약속 이행에서 의지를 확인하세요.`;
    const detail = orientationLabel === "정방향"
      ? "상대는 관계를 유지하거나 진전시키려는 힘이 있고, 제안을 받았을 때 응답하려는 태도가 비교적 분명합니다. 짧은 연락보다 실제 만남과 약속 이행률이 핵심 지표입니다."
      : "상대는 호감이 있어도 현실 문제나 심리 부담 때문에 행동 전환이 늦을 수 있습니다. 감정 유무를 묻기보다 언제, 어떤 방식의 만남이 가능한지 구체적으로 확인해야 합니다.";
    return {
      positionTitle,
      cardName,
      orientationLabel,
      headline: relationshipText(headline),
      summary: relationshipText(summary),
      detail: relationshipText(detail),
      relationshipInsight: relationshipText(`${meaning.relationshipPattern} 지금은 감정 선언보다 행동 패턴의 지속성이 더 정확한 근거입니다.`),
      advice: relationshipText(`${meaning.advice} 작은 약속부터 맞춰 단기 신뢰를 먼저 확보하세요.`),
      caution: relationshipText(`${meaning.hiddenConcern} 빈번한 확인 연락은 의지 확인에 오히려 역효과가 날 수 있습니다.`),
    };
  }

  if (idx === 4) {
    const headline = orientationLabel === "정방향"
      ? "지금 막히는 핵심은 감정보다 소통 방식의 불일치입니다."
      : "오해와 방어 반응이 관계 흐름을 직접 막고 있습니다.";
    const summary = `${meaning.hiddenConcern} 대화 구조를 바꾸지 않으면 같은 갈등이 반복됩니다.`;
    const detail = orientationLabel === "정방향"
      ? "문제의 본질은 사랑 부족이 아니라 속도, 약속, 기대치 조율 부족일 가능성이 큽니다. 지금 당장 줄여야 할 행동은 상대 반응을 추측해 결론 내리는 습관입니다."
      : "감정이 올라올 때 즉시 단정하는 패턴이 오해와 거리감을 키우고 있습니다. 상대에게 기대하기 전에 먼저 확인해야 할 사실은 최근 2주간의 연락/만남/약속 이행 패턴입니다.";
    return {
      positionTitle,
      cardName,
      orientationLabel,
      headline: relationshipText(headline),
      summary: relationshipText(summary),
      detail: relationshipText(detail),
      relationshipInsight: relationshipText(`${meaning.relationshipPattern} 핵심 장애물은 소통 타이밍, 자존심, 불안 관리 방식일 수 있습니다.`),
      advice: relationshipText(`${meaning.advice} 상대를 설득하기 전, 내가 지킬 대화 규칙 1개를 먼저 정하세요.`),
      caution: relationshipText("해석만 반복하고 행동 기준을 만들지 않으면 같은 문제가 다시 나타납니다."),
    };
  }

  const headline = orientationLabel === "정방향"
    ? "앞으로 2~6주, 관계를 가까워지게 만들 여지가 충분합니다."
    : "앞으로 2~6주, 흐름은 열려 있지만 속도 조절이 필수입니다.";
  const summary = `${meaning.relationshipPattern} 단기 결말은 고정 운명이 아니라 현재 패턴의 예상입니다.`;
  const detail = orientationLabel === "정방향"
    ? "연락과 만남의 템포를 맞추고 약속 이행을 꾸준히 만들면 관계는 안정적으로 가까워질 수 있습니다. 결론을 압박하기보다 편안한 대화 1회를 만드는 태도가 가장 효과적입니다."
    : "관계가 완전히 끝난 신호라기보다, 오해와 부담을 먼저 정리해야 하는 구간입니다. 속도를 늦추고 대화의 질을 높이면 다시 가까워질 여지는 충분합니다.";
  return {
    positionTitle,
    cardName,
    orientationLabel,
    headline: relationshipText(headline),
    summary: relationshipText(summary),
    detail: relationshipText(detail),
    relationshipInsight: relationshipText(`${meaning.emotionalState} 이번 단기 흐름에서 중요한 키워드는 연락, 대화, 약속, 행동 패턴입니다.`),
    advice: relationshipText(`${meaning.advice} 7일 안에 무리한 확답 요구 대신 짧고 솔직한 만남 대화를 1회 시도하세요.`),
    caution: relationshipText(`${meaning.hiddenConcern} 미래 카드를 운명으로 단정하면 선택의 여지를 놓칠 수 있습니다.`),
  };
}

function buildFinalAdvice(cards, positionBreakdown) {
  const reversedCount = cards.filter((card) => card.orientation === "reversed").length;
  const blocker = positionBreakdown[4];
  const future = positionBreakdown[5];
  const calmMode = reversedCount >= 3;
  return {
    instantMission: relationshipText(
      calmMode
        ? "상대 반응을 추측해 결론 내리지 말고, 최근 7일의 연락·만남·약속 이행 기록을 3줄로 정리하세요."
        : "관계를 앞당기려 하기보다 이번 주 대화 1회 일정을 먼저 확정하세요."
    ),
    conversationTip: relationshipText(
      calmMode
        ? "" + "\"왜 그랬어?\" 대신 \"나는 그때 혼란스러웠어. 네 생각을 듣고 싶어\"처럼 말하세요."
        : "" + "\"우리 지금 뭐야?\"보다 \"나는 너와의 연락 속도를 이렇게 느껴. 너는 어때?\"처럼 질문하세요."
    ),
    relationshipBoundary: relationshipText(
      blocker?.caution || "답장이 늦다는 이유만으로 관계 전체를 단정하지 않되, 반복적으로 약속을 피하는 행동은 분명히 기록하세요."
    ),
    nextSevenDays: relationshipText(
      future?.advice || "결론 압박보다 편안한 대화 1회를 만드는 것이 7일 흐름을 가장 크게 바꿉니다."
    ),
  };
}

function buildRelationshipReading(cards) {
  const normalizedCards = normalizeRelationshipCards(cards);
  const positionBreakdown = normalizedCards.map((card, idx) => {
    const reading = buildPositionReading(card, idx);
    return {
      ...reading,
      title: reading.positionTitle,
      card: `${reading.cardName} · ${reading.orientationLabel}`,
    };
  });
  const finalAdvice = buildFinalAdvice(normalizedCards, positionBreakdown);

  const overallVibe = relationshipText(
    `지금 관계는 ${positionBreakdown[0]?.cardName || "상대"}를 바라보는 당신의 기대와, ${positionBreakdown[1]?.cardName || "상대의 시선"}이 보여주는 현실 속도 사이를 조율하는 구간입니다. `
    + "호감은 분명하지만 관계의 만족도는 감정 크기보다 연락, 대화, 약속 이행 같은 행동 패턴에서 결정됩니다."
  );
  const deepReading = relationshipText(
    `상대가 당신을 보는 마음(${positionBreakdown[2]?.orientationLabel || "정방향"})과 실제 연애 의지(${positionBreakdown[3]?.orientationLabel || "정방향"})는 같을 수도, 다를 수도 있습니다. `
    + "그래서 말의 강도보다 반복 행동의 일관성을 확인해야 오해와 거리감을 줄일 수 있습니다."
  );
  const realityAndFuture = relationshipText(
    `핵심 장애물은 ${positionBreakdown[4]?.headline || "소통 방식의 불일치"}에 가깝고, 단기 결말은 ${positionBreakdown[5]?.headline || "현재 패턴의 연장선"}입니다. `
    + "단기 결말은 고정 운명이 아니라 현재 대화 방식과 속도 조절에 따라 충분히 바뀔 수 있습니다."
  );

  return {
    counselorTone: "따뜻하지만 현실적인 상담 톤으로, 감정 추측보다 행동 근거를 중심으로 읽어드립니다.",
    overallVibe,
    deepReading,
    realityAndFuture,
    positionBreakdown,
    finalAdvice,
    advice: [
      finalAdvice.instantMission,
      finalAdvice.conversationTip,
      finalAdvice.relationshipBoundary,
      finalAdvice.nextSevenDays,
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
const REUNION_POSITION_LABELS = [
  "과거의 인연",
  "상대의 현재 근황",
  "주변의 방해물 또는 상황",
  "나를 향한 속마음",
  "재회의 가능성과 결과",
];

const REUNION_POSITION_KEYS = ["past_bond", "their_now", "outside_factor", "their_heart", "reunion_outcome"];

function getCardDisplayName(card) {
  return String(card?.nameKo || card?.nameKr || card?.nameEn || card?.name || "").trim() || "이름이 확인되지 않은 카드";
}

function getOrientationLabel(orientation) {
  return orientation === "upright" ? "정방향" : "역방향";
}

const MAJOR_REUNION_MEANINGS = {
  M00: { upright: { emotionalTrace: "미련은 남아 있지만 관계를 가볍게 다시 시작하고 싶은 기류가 있습니다.", partnerMind: "상대는 아직 결론보다 가능성을 열어두고 있습니다.", contactPossibility: "부담 없는 안부에는 반응할 여지가 있습니다.", obstacle: "감정 확인을 서두르면 오히려 거리를 만들 수 있습니다.", reunionAdvice: "긴 고백 대신 짧고 가벼운 근황 메시지로 시작하세요." }, reversed: { emotionalTrace: "끌림은 있으나 불안과 경계가 함께 남아 있습니다.", partnerMind: "상대는 같은 패턴이 반복될까 걱정합니다.", contactPossibility: "즉시 재회 대화는 부담으로 느껴질 수 있습니다.", obstacle: "충동적 연락과 감정 압박이 관계를 더 닫게 만듭니다.", reunionAdvice: "최소 1주일 텀을 두고 차분한 안부만 시도하세요." } },
  M01: { upright: { emotionalTrace: "미련과 관심이 현실 행동으로 옮겨질 가능성이 보입니다.", partnerMind: "상대는 대화의 주도권과 명확함을 원합니다.", contactPossibility: "목적이 분명한 연락에 반응하기 쉽습니다.", obstacle: "과장된 표현이나 감정 과잉은 신뢰를 떨어뜨립니다.", reunionAdvice: "핵심만 짧게 말하고 상대의 답변 공간을 남기세요." }, reversed: { emotionalTrace: "감정은 남아도 신뢰는 흔들린 상태입니다.", partnerMind: "상대는 말보다 행동을 먼저 보려 합니다.", contactPossibility: "빈말이나 애매한 연락에는 반응이 낮습니다.", obstacle: "약속 불이행 기억이 강하면 재접점이 늦어집니다.", reunionAdvice: "사과와 변화 계획을 분리해 전달하세요." } },
  M02: { upright: { emotionalTrace: "표현되지 않은 감정이 아직 남아 있습니다.", partnerMind: "상대는 속마음을 쉽게 드러내지 않는 상태입니다.", contactPossibility: "서두르지 않는 메시지에 점진적으로 반응할 수 있습니다.", obstacle: "추측과 오해가 대화 진입을 막습니다.", reunionAdvice: "질문 하나만 던지고 답을 기다리는 방식이 유리합니다." }, reversed: { emotionalTrace: "감정 피로와 불신이 남아 있어 마음을 닫기 쉽습니다.", partnerMind: "상대는 해석 싸움을 피하고 싶어 합니다.", contactPossibility: "즉시 응답보다 시간이 필요한 흐름입니다.", obstacle: "의도 추궁이 반복되면 관계가 더 멀어집니다.", reunionAdvice: "추측 문장을 줄이고 사실 기반 대화만 남기세요." } },
  M03: { upright: { emotionalTrace: "좋았던 기억과 따뜻한 정서가 남아 있습니다.", partnerMind: "상대는 안정적인 배려를 원합니다.", contactPossibility: "다정하지만 부담 없는 연락은 호의적으로 받아들여질 수 있습니다.", obstacle: "기대치를 한 번에 높이면 부담이 생깁니다.", reunionAdvice: "짧은 고마움 표현과 안부를 함께 전달하세요." }, reversed: { emotionalTrace: "정은 있으나 감정 소모를 다시 겪을까 걱정합니다.", partnerMind: "상대는 에너지 관리가 먼저인 상태입니다.", contactPossibility: "감정 요구가 큰 연락은 피하려는 경향이 큽니다.", obstacle: "돌봄을 당연시하는 패턴이 재회를 막습니다.", reunionAdvice: "요구보다 배려와 경계 존중을 먼저 보여주세요." } },
  M04: { upright: { emotionalTrace: "책임감 기반의 유대가 남아 있습니다.", partnerMind: "상대는 관계 기준을 명확히 하고 싶어 합니다.", contactPossibility: "진지하고 단정한 메시지에 반응하기 쉽습니다.", obstacle: "통제형 대화가 반복되면 경계가 커집니다.", reunionAdvice: "기준을 말하되 압박 없는 톤을 유지하세요." }, reversed: { emotionalTrace: "과거의 통제감과 부담이 상처로 남아 있습니다.", partnerMind: "상대는 다시 갇힐까 봐 조심합니다.", contactPossibility: "관계 정의를 강요하는 연락은 역효과가 큽니다.", obstacle: "자존심 대결과 책임 전가가 핵심 장애물입니다.", reunionAdvice: "정답 싸움을 멈추고 감정 확인 질문부터 시작하세요." } },
  M05: { upright: { emotionalTrace: "신뢰와 원칙을 중요하게 여긴 기억이 남아 있습니다.", partnerMind: "상대는 관계를 가볍게 다시 시작하고 싶지 않습니다.", contactPossibility: "성의 있고 예의 있는 연락엔 반응 가능성이 있습니다.", obstacle: "가치관 충돌을 방치하면 다시 멀어집니다.", reunionAdvice: "재회를 원한다면 관계 기준 2가지를 먼저 합의하세요." }, reversed: { emotionalTrace: "기준 충돌의 피로가 크게 남아 있습니다.", partnerMind: "상대는 정의하기 어려운 관계를 부담스러워합니다.", contactPossibility: "애매한 연락은 오래 이어지기 어렵습니다.", obstacle: "서로 기대치가 다르면 갈등이 재발합니다.", reunionAdvice: "핵심 기대치를 명확히 적고 대화를 제안하세요." } },
  M06: { upright: { emotionalTrace: "호감과 미련이 동시에 살아 있는 카드입니다.", partnerMind: "상대는 관계를 다시 열 가능성을 검토하고 있습니다.", contactPossibility: "적절한 타이밍의 안부 메시지에는 반응 여지가 큽니다.", obstacle: "속도 차이를 무시하면 다시 흔들릴 수 있습니다.", reunionAdvice: "결론 요구보다 감정 확인과 작은 약속부터 맞추세요." }, reversed: { emotionalTrace: "좋은 기억은 남아도 확신은 흔들립니다.", partnerMind: "상대는 다시 선택해야 하는 부담을 느낍니다.", contactPossibility: "가벼운 접촉은 가능하지만 확정 대화는 늦어질 수 있습니다.", obstacle: "결정 회피와 모호한 태도가 반복될 수 있습니다.", reunionAdvice: "관계 목표를 모호하게 두지 말고 단계적으로 합의하세요." } },
  M07: { upright: { emotionalTrace: "강한 끌림과 빠른 재접촉 욕구가 남아 있습니다.", partnerMind: "상대는 속도와 주도권의 균형을 보고 있습니다.", contactPossibility: "명확하지만 짧은 연락에 반응할 수 있습니다.", obstacle: "서두른 결론 요구가 부담을 키웁니다.", reunionAdvice: "연락 속도 합의부터 만들고 감정 확인을 이어가세요." }, reversed: { emotionalTrace: "미련은 있지만 감정 기복이 큰 상태입니다.", partnerMind: "상대는 다시 휘말릴까 봐 경계합니다.", contactPossibility: "반응이 들쭉날쭉할 가능성이 큽니다.", obstacle: "급한 확인 요구와 단정적 해석이 재회를 막습니다.", reunionAdvice: "짧은 안부 후 반응 간격을 두고 관찰하세요." } },
  M08: { upright: { emotionalTrace: "상대는 아직 정서적 신뢰를 완전히 버리지 않았습니다.", partnerMind: "감정 조절이 되는 대화를 원합니다.", contactPossibility: "차분한 메시지라면 대화가 이어질 수 있습니다.", obstacle: "감정 폭발형 접근은 즉시 방어를 부릅니다.", reunionAdvice: "부드러운 문장과 짧은 요청으로 시작하세요." }, reversed: { emotionalTrace: "좋은 감정은 남아도 자신감이 떨어져 있습니다.", partnerMind: "상대는 상처 재발을 특히 경계합니다.", contactPossibility: "즉각적 재회 제안은 부담이 큽니다.", obstacle: "불안 기반 집착이 관계를 더 멀어지게 합니다.", reunionAdvice: "자기 안정 루틴을 먼저 회복한 뒤 연락하세요." } },
  M09: { upright: { emotionalTrace: "미련이 잔존하나 거리 두며 정리하는 흐름입니다.", partnerMind: "상대는 시간을 두고 상황을 보려 합니다.", contactPossibility: "느리지만 성의 있는 메시지엔 반응 가능성이 있습니다.", obstacle: "침묵을 단절로 오해하면 타이밍을 놓칩니다.", reunionAdvice: "짧은 안부 후 답변을 재촉하지 마세요." }, reversed: { emotionalTrace: "고립감과 피로가 크게 남아 있습니다.", partnerMind: "상대는 관계 대화 자체를 미루고 싶어 할 수 있습니다.", contactPossibility: "지금은 먼저 연락 비추천 신호가 강합니다.", obstacle: "과도한 접촉이 회피 반응을 강화합니다.", reunionAdvice: "최소 1~2주 기다리며 접촉 명분을 준비하세요." } },
  M10: { upright: { emotionalTrace: "관계 전환 가능성이 살아 있는 카드입니다.", partnerMind: "상대는 기회가 오면 다시 대화해 볼 여지를 둡니다.", contactPossibility: "자연스러운 계기가 생기면 응답 가능성이 높습니다.", obstacle: "타이밍을 놓치면 기회가 빠르게 닫힐 수 있습니다.", reunionAdvice: "명분 있는 짧은 연락을 기회 창에서 시도하세요." }, reversed: { emotionalTrace: "미련은 남아도 타이밍이 자주 어긋납니다.", partnerMind: "상대는 아직 정리되지 않은 변수에 묶여 있습니다.", contactPossibility: "지금은 즉시 연락보다 기다림이 유리합니다.", obstacle: "조급한 재접촉이 반복되면 피로가 누적됩니다.", reunionAdvice: "1~2주 뒤에 부담 없는 안부로 다시 시도하세요." } },
  M11: { upright: { emotionalTrace: "감정보다 신뢰 회복 가능성이 핵심으로 남아 있습니다.", partnerMind: "상대는 공정한 책임 분담을 확인하고 싶어 합니다.", contactPossibility: "사과와 책임 인식이 담긴 연락엔 반응 가능성이 있습니다.", obstacle: "일방적 피해자 프레임이 남아 있으면 재회가 어렵습니다.", reunionAdvice: "잘못 인정과 재발 방지 문장을 함께 전달하세요." }, reversed: { emotionalTrace: "불공정하다는 감정이 아직 크게 남아 있습니다.", partnerMind: "상대는 다시 같은 상황을 겪을까 두려워합니다.", contactPossibility: "해명 위주의 긴 메시지는 효과가 낮습니다.", obstacle: "책임 회피로 보이는 표현이 가장 큰 리스크입니다.", reunionAdvice: "짧고 명확한 책임 표현 후 반응을 기다리세요." } },
  M12: { upright: { emotionalTrace: "감정은 남아도 멈춤과 관찰이 필요한 상태입니다.", partnerMind: "상대는 시간을 두고 관계를 다시 보려 합니다.", contactPossibility: "자연스러운 계기 필요 신호가 강합니다.", obstacle: "지금 결론을 요구하면 역효과가 큽니다.", reunionAdvice: "지금은 관찰 기간으로 두고 대화 명분을 준비하세요." }, reversed: { emotionalTrace: "정체 피로와 답답함이 남아 있습니다.", partnerMind: "상대는 반복 패턴을 특히 경계합니다.", contactPossibility: "섣부른 연락은 읽고 넘길 가능성이 큽니다.", obstacle: "고집과 단정형 문장이 재회를 막습니다.", reunionAdvice: "한 번의 짧은 안부 후 추가 압박은 피하세요." } },
  M13: { upright: { emotionalTrace: "관계는 끝났어도 감정 흔적은 남아 있는 형태입니다.", partnerMind: "상대는 과거를 정리해야 새 대화를 고려할 수 있습니다.", contactPossibility: "변화가 확인될 때만 접촉이 의미를 가집니다.", obstacle: "과거 방식 반복이 가장 큰 장애물입니다.", reunionAdvice: "예전과 달라진 행동 증거를 먼저 준비하세요." }, reversed: { emotionalTrace: "끝내지 못한 감정이 잔존해 혼란이 큽니다.", partnerMind: "상대는 정리와 미련 사이를 오가고 있습니다.", contactPossibility: "사과나 정리 메시지에는 반응 여지가 있습니다.", obstacle: "미완결 감정 방치가 관계를 계속 흔듭니다.", reunionAdvice: "재회를 말하기 전 상처 포인트를 인정하세요." } },
  M14: { upright: { emotionalTrace: "감정 회복 여지가 안정적으로 남아 있습니다.", partnerMind: "상대는 균형 잡힌 소통을 원합니다.", contactPossibility: "1~2주 내 짧은 안부가 적합합니다.", obstacle: "과잉 연락 또는 침묵 극단이 흐름을 깨뜨립니다.", reunionAdvice: "연락 주기와 대화 경계를 함께 맞추세요." }, reversed: { emotionalTrace: "정이 남아도 균형 붕괴 경험이 크게 남아 있습니다.", partnerMind: "상대는 감정 기복을 특히 경계합니다.", contactPossibility: "지금 가능보다는 조율 후 접촉이 유리합니다.", obstacle: "속도 차이와 감정 과열이 재발 리스크입니다.", reunionAdvice: "짧은 메시지와 느린 템포를 유지하세요." } },
  M15: { upright: { emotionalTrace: "강한 집착과 미련이 함께 남아 있습니다.", partnerMind: "상대는 감정 압박을 가장 부담스러워합니다.", contactPossibility: "즉시 재회 요구는 거절 반응을 키울 수 있습니다.", obstacle: "질문 공세와 통제 욕구가 핵심 장애물입니다.", reunionAdvice: "감정 강도를 낮추고 사실 기반 대화로 전환하세요." }, reversed: { emotionalTrace: "집착에서 벗어나려는 흐름이 보입니다.", partnerMind: "상대는 관계를 더 건강하게 재정의하려 합니다.", contactPossibility: "부담 없는 안부는 긍정 반응 가능성이 있습니다.", obstacle: "과거 감정 습관이 재발하면 다시 멀어집니다.", reunionAdvice: "내가 지킬 경계를 먼저 정하고 연락하세요." } },
  M16: { upright: { emotionalTrace: "상처 기억과 충격이 강하게 남아 있습니다.", partnerMind: "상대는 지금 방어적이며 재회 대화 여유가 낮습니다.", contactPossibility: "먼저 연락 비추천 신호가 큽니다.", obstacle: "신뢰 붕괴와 감정 소진이 핵심입니다.", reunionAdvice: "지금은 시간 확보와 자기 정리가 우선입니다." }, reversed: { emotionalTrace: "무너진 감정 속에서도 회복의 여지가 조금 남아 있습니다.", partnerMind: "상대는 다시 다가가고 싶어도 재발을 두려워합니다.", contactPossibility: "시간을 둔 사과 메시지에는 반응 가능성이 있습니다.", obstacle: "상처를 덮고 넘어가면 같은 문제가 반복됩니다.", reunionAdvice: "상처를 인정하는 문장부터 대화에 넣으세요." } },
  M17: { upright: { emotionalTrace: "좋은 기억과 기대가 아직 살아 있습니다.", partnerMind: "상대는 천천히 회복되는 관계를 상상할 수 있습니다.", contactPossibility: "지금 가능 또는 1~2주 내 접촉이 유리합니다.", obstacle: "기대만 높이고 행동이 없으면 신뢰가 떨어집니다.", reunionAdvice: "작은 약속 하나를 제안해 실행하세요." }, reversed: { emotionalTrace: "실망감이 남아 기대를 쉽게 열지 못합니다.", partnerMind: "상대는 신뢰 재건 증거를 기다립니다.", contactPossibility: "긴 감정문보다 간결한 안부가 낫습니다.", obstacle: "부정적 예측과 단정이 회복을 막습니다.", reunionAdvice: "연락 빈도보다 행동 일관성을 보여주세요." } },
  M18: { upright: { emotionalTrace: "미련과 불안이 동시에 남아 혼란이 큽니다.", partnerMind: "상대는 당신의 의도를 완전히 신뢰하지 못할 수 있습니다.", contactPossibility: "자연스러운 계기 필요 신호가 강합니다.", obstacle: "추측과 오해가 접촉 타이밍을 망칩니다.", reunionAdvice: "사실 확인 질문 중심으로 접근하세요." }, reversed: { emotionalTrace: "혼란이 조금 걷히며 현실 판단이 가능해집니다.", partnerMind: "상대는 조심스럽게 대화를 열 수 있습니다.", contactPossibility: "1~2주 뒤 짧은 안부가 적합합니다.", obstacle: "남은 의심을 방치하면 재회 후 재갈등이 큽니다.", reunionAdvice: "핵심 오해 한 가지를 먼저 정리하세요." } },
  M19: { upright: { emotionalTrace: "좋았던 기억과 호감이 선명히 남아 있습니다.", partnerMind: "상대는 다시 편안한 연결을 시도할 여지가 있습니다.", contactPossibility: "지금 가능 신호가 비교적 강합니다.", obstacle: "좋은 분위기에 기대어 핵심 문제를 미루면 재발합니다.", reunionAdvice: "밝은 톤으로 시작하되 경계 합의를 잊지 마세요." }, reversed: { emotionalTrace: "호감은 있으나 확신은 약해진 상태입니다.", partnerMind: "상대는 가벼운 연결은 가능해도 깊은 대화는 조심합니다.", contactPossibility: "짧은 안부만 추천되는 구간입니다.", obstacle: "낙관 과잉과 결론 압박이 리스크입니다.", reunionAdvice: "분위기보다 신뢰 회복 문장을 먼저 두세요." } },
  M20: { upright: { emotionalTrace: "과거를 다시 돌아보는 마음이 살아 있습니다.", partnerMind: "상대는 관계 재평가 의지가 있습니다.", contactPossibility: "정리된 메시지에는 반응 가능성이 큽니다.", obstacle: "과거 핵심 갈등을 회피하면 다시 멈춥니다.", reunionAdvice: "재회보다 문제 인식과 변화 의지를 먼저 전달하세요." }, reversed: { emotionalTrace: "미련은 있어도 결정을 미루는 흐름입니다.", partnerMind: "상대는 과거 피로를 아직 정리하지 못했습니다.", contactPossibility: "지금은 먼저 연락 비추천에 가깝습니다.", obstacle: "과거 상처 회피가 재회 진입을 지연시킵니다.", reunionAdvice: "시간을 두고 사과/정리 메시지를 준비하세요." } },
  M21: { upright: { emotionalTrace: "관계를 성숙하게 다시 맞출 가능성이 있습니다.", partnerMind: "상대는 마무리보다 완성형 재시작을 검토할 수 있습니다.", contactPossibility: "적절한 타이밍의 접촉은 긍정 반응 확률이 높습니다.", obstacle: "마지막 쟁점을 덮으면 완성 직전 다시 멀어집니다.", reunionAdvice: "남은 갈등 한 가지를 정확히 정리해 제안하세요." }, reversed: { emotionalTrace: "연결은 남아도 미완결 과제가 큰 상태입니다.", partnerMind: "상대는 확답보다 관망을 택할 수 있습니다.", contactPossibility: "자연스러운 계기 후 접촉이 유리합니다.", obstacle: "미완결 이슈가 반복되면 재회 후 재이별 위험이 큽니다.", reunionAdvice: "재시작 전 핵심 이슈 해결 약속을 먼저 합의하세요." } },
};

function reunionText(text) {
  const cleaned = String(text || "").replace(/읽는\s*정확함/g, "해석 정확도");
  return smoothCounselorTone(cleaned);
}

function buildMinorReunionMeaning(card) {
  const suit = String(card?.suit || "").toLowerCase();
  const rank = Number(card?.number || 0);
  const suitLabel = {
    cups: "감정선",
    wands: "행동 의지",
    swords: "대화와 판단",
    pentacles: "현실 조건",
  }[suit] || "관계 흐름";
  const rankTone = rank >= 11 ? "성숙한 책임" : rank >= 7 ? "점검과 조율" : "관계 초반 에너지";
  return {
    upright: {
      emotionalTrace: `${suitLabel}에서 미련과 연결 욕구가 남아 있습니다.`,
      partnerMind: `상대는 ${rankTone}을 기준으로 재접점을 판단합니다.`,
      contactPossibility: "부담 없는 안부에는 반응할 가능성이 있습니다.",
      obstacle: "속도와 기대치가 맞지 않으면 오해가 커질 수 있습니다.",
      reunionAdvice: "짧은 안부 후 반응을 관찰하며 다음 대화를 준비하세요.",
    },
    reversed: {
      emotionalTrace: `${suitLabel}에서 상처와 경계가 더 크게 작동합니다.`,
      partnerMind: `상대는 ${rankTone}이 흔들려 조심스러운 태도를 보일 수 있습니다.`,
      contactPossibility: "지금은 즉시 재회 대화보다 느린 접촉이 유리합니다.",
      obstacle: "과거 패턴 반복과 감정 압박이 핵심 리스크입니다.",
      reunionAdvice: "먼저 연락 비추천 구간이면 1~2주 관찰 후 접근하세요.",
    },
  };
}

function toReunionMeaningShape(raw) {
  return {
    emotionalTrace: reunionText(raw?.emotionalTrace || ""),
    currentState: reunionText(raw?.partnerMind || raw?.currentState || ""),
    obstacle: reunionText(raw?.obstacle || ""),
    reconnectionChance: reunionText(raw?.contactPossibility || raw?.reconnectionChance || ""),
    actionAdvice: reunionText(raw?.reunionAdvice || raw?.actionAdvice || ""),
  };
}

function getReunionMeaningProfile(card) {
  const id = String(card?.cardId || "").toUpperCase();
  const profile = MAJOR_REUNION_MEANINGS[id] || buildMinorReunionMeaning(card);
  return {
    upright: toReunionMeaningShape(profile.upright),
    reversed: toReunionMeaningShape(profile.reversed),
  };
}

function normalizeReunionCard(raw, idx) {
  const source = raw && typeof raw === "object" ? raw : {};
  const lookup = getRelationshipCardLookup();
  const cardId = String(source.cardId || source.id || "").toUpperCase();
  const deckCard = lookup.get(cardId) || {};
  const meta = parseCardMeta(cardId);
  const nameKo = asText(source.nameKo || source.nameKr || deckCard.nameKr);
  const nameEn = asText(source.nameEn || source.name || deckCard.name);
  const orientation = source.orientation === "reversed" ? "reversed" : "upright";
  const keywords = Array.isArray(source.keywords)
    ? source.keywords.filter(Boolean)
    : (Array.isArray(deckCard.keywords) ? deckCard.keywords.filter(Boolean) : []);
  const reunionMeaning = getReunionMeaningProfile({ cardId, suit: meta.suit, number: meta.number });

  if (!nameKo && !nameEn) {
    console.error("[tarot/reunion-reading] card name missing", cardId || `index_${idx}`);
  }

  return {
    ...source,
    id: cardId || `unknown_${idx + 1}`,
    cardId: cardId || `unknown_${idx + 1}`,
    nameKo,
    nameKr: nameKo || nameEn || "",
    nameEn,
    name: nameEn || nameKo || "",
    arcana: meta.arcana,
    arcanaType: meta.arcana === "major" ? "Major" : "Minor",
    suit: meta.suit,
    number: meta.number,
    orientation,
    position: REUNION_POSITION_KEYS[idx] || source.position || `position_${idx + 1}`,
    keywords,
    reunionMeaning,
  };
}

function normalizeReunionCards(cards) {
  const arr = Array.isArray(cards) ? cards : [];
  return arr.slice(0, 5).map((card, idx) => normalizeReunionCard(card, idx));
}

function calculateReunionChance(cards) {
  let score = 50;
  const scoreRules = [
    { ids: ["M06", "C02", "C06", "M20", "M17"], upright: 12, reversed: 4 },
    { ids: ["S10", "S03", "C05", "M16", "C08"], upright: -14, reversed: -6 },
    { ids: ["W11", "C11", "C12"], upright: 8, reversed: -2 },
    { ids: ["S02", "S04", "M12"], upright: -2, reversed: -5 },
    { ids: ["P13", "P14", "M14"], upright: 7, reversed: -4 },
  ];

  cards.forEach((card) => {
    const id = String(card?.cardId || "").toUpperCase();
    const reversed = card?.orientation === "reversed";
    scoreRules.forEach((rule) => {
      if (!rule.ids.includes(id)) return;
      score += reversed ? rule.reversed : rule.upright;
    });
  });

  return Math.max(0, Math.min(100, score));
}

function getReunionChanceLabel(score) {
  if (score >= 75) return "높음";
  if (score >= 58) return "조건부 높음";
  if (score >= 40) return "보통";
  return "낮음";
}

function inferPartnerState(card) {
  const id = String(card?.cardId || "").toUpperCase();
  const reversed = card?.orientation === "reversed";
  if (["M16", "S10", "S09", "C08"].includes(id) && !reversed) return "정리 중";
  if (["M18", "S02", "S07"].includes(id)) return "혼란";
  if (reversed && ["M04", "M11", "M07", "P14", "S13"].includes(id)) return "방어적";
  if (["M06", "C06", "M20", "M17", "C02"].includes(id)) return "미련 있음";
  return reversed ? "관망 중" : "조심스러운 관망";
}

function inferContactTiming(score, cards) {
  const blocker = cards[2];
  const blockerId = String(blocker?.cardId || "").toUpperCase();
  if (["M16", "S10", "S03"].includes(blockerId) && blocker?.orientation !== "reversed") return "먼저 연락 비추천";
  if (score >= 75 && cards[1]?.orientation === "upright") return "지금 가능";
  if (score >= 58) return "1~2주 뒤";
  if (score < 40) return "자연스러운 계기 필요";
  return "짧은 안부만 추천";
}

function inferMainObstacle(card) {
  const id = String(card?.cardId || "").toUpperCase();
  if (["M16", "S10", "S03"].includes(id)) return "신뢰 붕괴";
  if (["M15", "M04", "P14"].includes(id)) return "자존심";
  if (["M18", "S02", "S07"].includes(id)) return "오해";
  if (["P04", "P05", "P10", "P14"].includes(id)) return "현실 문제";
  return "감정 소진";
}

function inferOneLineAdvice(timing, score) {
  if (timing === "지금 가능") return "짧은 안부로 문을 열고, 바로 재회 결론은 묻지 마세요.";
  if (timing === "1~2주 뒤") return "지금은 준비 기간으로 두고 1~2주 뒤 부담 없는 연락을 시도하세요.";
  if (timing === "먼저 연락 비추천") return "당장은 거리두기가 유리하며, 상처 정리 후에 다시 시도하세요.";
  if (score < 40) return "감정 호소보다 사과 정리와 신뢰 회복 근거를 먼저 준비하세요.";
  return "긴 고백보다 짧고 진심 있는 안부가 더 효과적입니다.";
}

function buildReunionPositionReading(card, idx, score, label, contactTiming) {
  const positionTitle = REUNION_POSITION_LABELS[idx] || `포지션 ${idx + 1}`;
  const cardName = getCardDisplayName(card);
  const orientationLabel = getOrientationLabel(card?.orientation);
  const meaning = card?.reunionMeaning?.[card?.orientation === "reversed" ? "reversed" : "upright"] || {
    emotionalTrace: "감정 흔적은 남아 있지만 해석은 신중해야 합니다.",
    currentState: "상대 상태를 행동 패턴으로 확인해야 합니다.",
    obstacle: "오해와 속도 차이가 핵심 변수입니다.",
    reconnectionChance: "부담 없는 접촉에서 가능성을 확인할 수 있습니다.",
    actionAdvice: "짧고 정중한 안부로 시작하세요.",
  };

  if (idx === 0) {
    return {
      positionTitle,
      cardName,
      orientationLabel,
      headline: reunionText(`${cardName} ${orientationLabel}은 과거의 정은 남아 있지만 같은 갈등 패턴을 경계해야 한다는 신호입니다.`),
      directAnswer: reunionText(`두 사람 사이에 정은 있었고, 좋았던 기억도 분명했습니다. 다만 ${meaning.obstacle} 패턴이 누적되며 거리감이 커졌을 가능성이 큽니다.`),
      detailedReading: reunionText(`${meaning.emotionalTrace} 관계가 좋았던 시기의 강점은 정서적 연결이었고, 약점은 갈등 후 복구 방식이었습니다. 재회를 원하면 예전처럼 누가 맞는지 따지기보다 무엇이 부담이었는지 먼저 정리해야 합니다.`),
      reunionPoint: reunionText("과거를 미화하지 말고 반복된 갈등 문장 1개를 정확히 바꾸는 것이 핵심입니다."),
      advice: reunionText(meaning.actionAdvice),
    };
  }

  if (idx === 1) {
    return {
      positionTitle,
      cardName,
      orientationLabel,
      headline: reunionText(`${cardName} ${orientationLabel}은 상대가 지금 여유보다 방어를 먼저 두는 상태를 보여줍니다.`),
      directAnswer: reunionText(`상대의 현재 상태는 "${meaning.currentState}"에 가깝습니다. 감정이 남아 있어도 현실 피로가 크면 반응이 느릴 수 있습니다.`),
      detailedReading: reunionText(`${meaning.emotionalTrace} 지금 연락하면 즉답보다는 관망 반응이 나올 수 있으니, 답장 속도만으로 마음을 단정하지 않는 것이 중요합니다.`),
      reunionPoint: reunionText("상대가 연락을 받을 공간이 있는지부터 확인해야 재접촉 실패를 줄일 수 있습니다."),
      advice: reunionText(`현재 타이밍은 ${contactTiming} 신호이며, ${meaning.actionAdvice}`),
    };
  }

  if (idx === 2) {
    return {
      positionTitle,
      cardName,
      orientationLabel,
      headline: reunionText(`${cardName} ${orientationLabel}은 재회를 막는 구조적 요인이 아직 남아 있음을 보여줍니다.`),
      directAnswer: reunionText(`핵심 장애물은 ${meaning.obstacle}입니다. 감정 문제와 현실 문제를 분리해 풀지 않으면 같은 갈등이 반복됩니다.`),
      detailedReading: reunionText("거리, 일정, 주변 시선, 과거 오해 중 무엇이 가장 큰지 우선순위를 정해야 합니다. 무리한 접근은 상대의 방어심을 더 키울 수 있습니다."),
      reunionPoint: reunionText("재회 시도 전에 먼저 정리할 조건을 1개라도 해결하면 반응 질이 달라집니다."),
      advice: reunionText(meaning.actionAdvice),
    };
  }

  if (idx === 3) {
    return {
      positionTitle,
      cardName,
      orientationLabel,
      headline: reunionText(`${cardName} ${orientationLabel}은 미련과 경계가 동시에 존재하는 속마음 신호입니다.`),
      directAnswer: reunionText(`상대의 속마음은 "${meaning.emotionalTrace}"에 가깝습니다. 좋아하는 감정이 남아도 상처 재발을 두려워할 수 있습니다.`),
      detailedReading: reunionText("상대를 단정하기보다, 다시 연락하고 싶은 마음과 멈추고 싶은 마음이 함께 있다는 전제를 두고 접근해야 합니다."),
      reunionPoint: reunionText("속마음 확인의 핵심은 말보다 행동 일관성입니다."),
      advice: reunionText(`질문 공세보다 짧은 안부 + 상대 반응 존중이 효과적입니다. ${meaning.actionAdvice}`),
    };
  }

  const labelText = label === "높음" ? "높은 편" : label === "조건부 높음" ? "조건부 높음" : label === "보통" ? "보통" : "낮은 편";
  const outcomeLine = label === "낮음"
    ? "현재 흐름은 재회 즉시 성사보다는 상처 회복이 먼저인 구간입니다."
    : label === "보통"
      ? "재회 가능성은 열려 있지만 조건 정리가 선행되어야 합니다."
      : "재회 가능성은 열려 있으나 같은 문제를 반복하지 않을 조건이 필요합니다.";

  return {
    positionTitle,
    cardName,
    orientationLabel,
    headline: reunionText(`${cardName} ${orientationLabel} 기준 현재 재회 가능성은 ${labelText}입니다.`),
    directAnswer: reunionText(`재회 가능성 등급은 ${label} (${score}%)입니다. 연락 가능성은 "${contactTiming}"에 가깝습니다.`),
    detailedReading: reunionText(`${meaning.reconnectionChance} ${outcomeLine} 재회를 말할 때는 감정보다 구체적 변화와 재발 방지 약속이 필요합니다.`),
    reunionPoint: reunionText("재회 성공은 사랑의 크기보다 신뢰 복구 실행력에서 갈립니다."),
    advice: reunionText(meaning.actionAdvice),
  };
}

function buildReunionFinalGuide(summary, positions) {
  const timing = summary?.bestContactTiming || "자연스러운 계기 필요";
  const shouldContactNow = timing === "지금 가능"
    ? "지금 연락은 가능하지만, 재회 결론을 바로 묻기보다 짧은 안부로 문을 여는 방식이 적합합니다."
    : timing === "1~2주 뒤"
      ? "지금은 감정 정리 기간으로 두고 1~2주 안에 짧은 안부를 보내는 것이 좋습니다."
      : timing === "먼저 연락 비추천"
        ? "지금 먼저 연락하면 상대의 방어심이 커질 가능성이 높습니다. 시간을 두고 접촉 명분을 만드는 편이 유리합니다."
        : "자연스러운 계기를 만들기 전에는 긴 대화보다 짧은 근황 공유만 추천됩니다.";

  const messageExample = timing === "먼저 연락 비추천"
    ? "요즘 생각이 나서 인사만 남겨. 답장은 편할 때 해도 괜찮아."
    : "요즘 문득 생각나서 짧게 안부 전하고 싶었어. 부담 갖지 않아도 괜찮아.";

  const avoidThis = "\"우리 다시 만날 수 있어?\", \"왜 답이 없어?\", \"아직 나 좋아하지?\"처럼 답을 강요하는 질문은 피하세요.";
  const nextSevenDays = reunionText(
    `앞으로 7일은 ${summary?.mainObstacle || "핵심 장애물"}을 줄이는 준비 기간으로 두세요. `
    + "과거 갈등을 한 문장으로 정리하고, 재회 대화가 열리면 감정보다 구체적 변화부터 말하는 것이 효과적입니다."
  );

  return {
    shouldContactNow: reunionText(shouldContactNow),
    messageExample: reunionText(messageExample),
    avoidThis: reunionText(avoidThis),
    nextSevenDays,
  };
}

function buildReunionReading(cards) {
  const normalizedCards = normalizeReunionCards(cards);
  const score = calculateReunionChance(normalizedCards);
  const reunionChanceLabel = getReunionChanceLabel(score);
  const partnerState = inferPartnerState(normalizedCards[1] || {});
  const bestContactTiming = inferContactTiming(score, normalizedCards);
  const mainObstacle = inferMainObstacle(normalizedCards[2] || {});
  const oneLineAdvice = inferOneLineAdvice(bestContactTiming, score);

  const positions = normalizedCards.map((card, idx) =>
    buildReunionPositionReading(card, idx, score, reunionChanceLabel, bestContactTiming)
  );

  const summary = {
    reunionChanceLabel,
    reunionChanceScore: score,
    partnerState,
    bestContactTiming,
    mainObstacle,
    oneLineAdvice,
  };

  const finalGuide = buildReunionFinalGuide(summary, positions);

  return {
    counselorTone: "감정 위로보다 판단 가능한 구조를 우선해 재회 흐름을 정리했습니다.",
    opening: reunionText("이번 배열은 상대의 현재 상태, 재회 조건, 연락 타이밍을 함께 보여줍니다. 핵심 요약부터 확인하고 각 포지션을 순서대로 읽어보세요."),
    summary,
    positions,
    finalGuide,
    pastBond: positions[0]?.detailedReading || "",
    theirNow: positions[1]?.detailedReading || "",
    outsideFactor: positions[2]?.detailedReading || "",
    theirHeart: positions[3]?.detailedReading || "",
    reunionOutcome: positions[4]?.detailedReading || "",
    lighthouseGuidance: finalGuide.nextSevenDays,
    positionBreakdown: positions,
    actionPlan: [
      oneLineAdvice,
      finalGuide.shouldContactNow,
      finalGuide.avoidThis,
      finalGuide.nextSevenDays,
      positions[2]?.advice || "핵심 장애물을 먼저 줄이세요.",
    ].map(reunionText).filter(Boolean),
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

function buildCrystalSoulReading(body = {}) {
  const topicName = asText(body?.topic?.name) || "원석 소울 타로";
  const topicHint = asText(body?.topic?.hint);
  const gemName = asText(body?.gem?.name) || "선택한 원석";
  const gemTheme = asText(body?.gem?.theme);
  const cards = Array.isArray(body?.cards) ? body.cards : [];
  const positions = Array.isArray(body?.positions) ? body.positions : [];
  const assignments = Array.isArray(body?.assignments) ? body.assignments : [];
  const gemstonesMap = body?.gemstonesMap && typeof body.gemstonesMap === "object" ? body.gemstonesMap : {};

  const lines = [];
  lines.push(`🔮 ${topicName} 리딩`);
  lines.push("");
  lines.push(`${gemName}의 기운이 현재 흐름을 비추고 있습니다.${gemTheme ? ` 핵심 테마는 ${gemTheme}입니다.` : ""}`);
  if (topicHint) {
    lines.push(`${topicHint}`);
  }
  lines.push("");

  cards.slice(0, 6).forEach((card, idx) => {
    const position = asText(positions[idx]) || `포지션 ${idx + 1}`;
    const cardName = asText(card) || `카드 ${idx + 1}`;
    const gemId = asText(assignments[idx]);
    const gemInfo = gemId && gemstonesMap[gemId] && typeof gemstonesMap[gemId] === "object"
      ? gemstonesMap[gemId]
      : null;
    const slotGemName = asText(gemInfo?.name) || gemName;
    const slotGemTheme = asText(gemInfo?.theme);

    lines.push(`• ${position}: ${cardName}`);
    lines.push(
      `  ${slotGemName} 에너지는 이 자리에서 ${slotGemTheme || "감정과 판단의 균형"}을 강조합니다. `
      + "서두르기보다 사실 확인과 작은 실행을 이어가면 흐름이 빠르게 안정됩니다."
    );
  });

  lines.push("");
  lines.push("✨ 마스터 조언");
  lines.push(
    "이번 리딩의 핵심은 결과를 단번에 확인하려는 조급함을 줄이고, "
    + "지금 가능한 행동 1가지를 반복해 에너지를 고정하는 것입니다."
  );
  lines.push(
    "오늘 안에 하나의 결정을 문장으로 적고 실행 시간을 확정하세요. "
    + "행동이 시작되는 순간 운의 밀도가 달라집니다."
  );

  return lines.join("\n");
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

    await requireAuth(request, env);

    const body = await readJson(request);

    if (path === "/draw") {
      const spreadType = normalizeSpreadType(body?.spreadType || "one_card");
      const cards = pickCards(spreadType);
      return json({ ok: true, spreadType, cards });
    }

    if (path === "/reading") {
      const spreadType = normalizeSpreadType(body?.spreadType || "one_card");
      const category = String(body?.category || "general");
      const requestCards = Array.isArray(body?.cards) ? body.cards : [];
      assertCardCount(spreadType, requestCards);
      const cards = spreadType === "reunion_lighthouse_five_card"
        ? normalizeReunionCards(requestCards)
        : requestCards;
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
      const normalizedCards = normalizeRelationshipCards(cards);
      const rawReading = buildRelationshipReading(normalizedCards);
      const reading = applyQualityEnhancement(spreadType, rawReading, normalizedCards);
      return json({
        ok: true,
        category: "love",
        spreadType,
        cards: normalizedCards,
        reading,
        consultingHighlights: buildConsultingHighlights(reading),
        engineMeta: {
          source: "worker/routes/tarot.js",
          qualityEnhanced: reading !== rawReading,
          spreadType,
          cardCount: normalizedCards.length,
        },
        isRelationshipReading: true,
        api: "love-reading",
      });
    }

    if (path === "/crystal-soul") {
      const cards = Array.isArray(body?.cards) ? body.cards : [];
      if (!cards.length) {
        return json({ ok: false, message: "카드 데이터가 필요합니다." }, { status: 400 });
      }
      return json({
        ok: true,
        source: "worker/routes/tarot.js",
        reading: buildCrystalSoulReading(body),
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
