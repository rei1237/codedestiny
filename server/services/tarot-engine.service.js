const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../data/tarot-cards.db.json");
const SAMPLE_PATH = path.join(__dirname, "../data/tarot-cards.sample.json");

const CATEGORY_MAP = {
  love: "love",
  romance: "love",
  relationship: "love",
  healing: "healing",
  heal: "healing",
  recovery: "healing",
  reunion: "reunion",
  reconnect: "reunion",
  money: "money",
  wealth: "money",
  finance: "money",
  career: "career",
  job: "career",
  work: "career",
  general: "general",
};

const SPREAD_CONFIG = {
  one_card: {
    cardCount: 1,
    labels: ["today"],
  },
  three_card_past_present_future: {
    cardCount: 3,
    labels: ["past", "present", "future"],
  },
  three_card_cause_process_outcome: {
    cardCount: 3,
    labels: ["cause", "process", "outcome"],
  },
  relationship_six_card: {
    cardCount: 6,
    labels: [
      "position_1", // 내담자의 시선
      "position_2", // 상대방의 시선
      "position_3", // 상대방의 관계 정의
      "position_4", // 상대방의 연애 의지
      "position_5", // 관계의 병목
      "position_6", // 단기적 미래의 결말
    ],
  },
  healing_rising_four_card: {
    cardCount: 4,
    labels: [
      "hidden_truth", // 상황이 어긋난 객관적 원인
      "embrace_pain", // 내면의 상처와 감정
      "silver_lining", // 배워야 할 교훈
      "step_forward", // 앞으로 나아가는 실천
    ],
  },
  reunion_lighthouse_five_card: {
    cardCount: 5,
    labels: [
      "past_bond", // 과거의 인연
      "their_now", // 상대방의 현재 근황
      "outside_factor", // 주변 방해물/상황
      "their_heart", // 나를 향한 속마음
      "reunion_outcome", // 재회의 가능성과 결과
    ],
  },
  self_esteem_levelup_five_card: {
    cardCount: 5,
    labels: [
      "past_debuff", // 내가 타인의 시선에 갇혀있던 진짜 이유 (과거의 디버프 확인)
      "inner_monster", // 왜 나는 거절을 두려워했을까? (극복해야 할 내면의 몬스터)
      "current_damage", // 눈치 보는 습관이 깎아먹은 나의 HP와 MP (현재 입고 있는 데미지)
      "mind_shield", // 타인의 실망을 가볍게 튕겨내는 마인드 쉴드 (새로운 방어 스킬 획득!)
      "levelup_mastery", // 내 마음을 1순위로 챙기는 레벨업 마스터리 (최종 보상 및 각성)
    ],
  },
  yearly_twelve_card: {
    cardCount: 12,
    labels: [
      "month_1", "month_2", "month_3", "month_4", "month_5", "month_6",
      "month_7", "month_8", "month_9", "month_10", "month_11", "month_12",
    ],
  },
  yearly_three_card: {
    cardCount: 3,
    labels: ["base_energy", "challenge_opportunity", "outcome_advice"],
  },
  job_change_seven_card: {
    cardCount: 7,
    labels: [
      "calling",          // 나의 천직
      "happy_direction",  // 행복한 직업의 방향
      "inner_vocation",   // 내면의 소명
      "life_after_move",  // 이직 이후의 삶
      "action_steps",     // 현실화를 위한 행동
      "let_go",           // 포기해야 할 것
      "overall_advice",   // 전체적인 조언
    ],
  },
};

const SPREAD_ALIASES = {
  relationshipSixCard: "relationship_six_card",
  healingRisingFourCard: "healing_rising_four_card",
  reunionLighthouseFiveCard: "reunion_lighthouse_five_card",
  selfEsteemLevelupFiveCard: "self_esteem_levelup_five_card",
  yearlyTwelveCard: "yearly_twelve_card",
  yearlyThreeCard: "yearly_three_card",
  jobChangeSevenCard: "job_change_seven_card",
};

let cachedCards = null;

const MAJOR_ARCANA = [
  ["M00", "The Fool", "바보", 0],
  ["M01", "The Magician", "마법사", 1],
  ["M02", "The High Priestess", "여사제", 2],
  ["M03", "The Empress", "여황제", 3],
  ["M04", "The Emperor", "황제", 4],
  ["M05", "The Hierophant", "교황", 5],
  ["M06", "The Lovers", "연인", 6],
  ["M07", "The Chariot", "전차", 7],
  ["M08", "Strength", "힘", 8],
  ["M09", "The Hermit", "은둔자", 9],
  ["M10", "Wheel of Fortune", "운명의 수레바퀴", 10],
  ["M11", "Justice", "정의", 11],
  ["M12", "The Hanged Man", "매달린 사람", 12],
  ["M13", "Death", "죽음", 13],
  ["M14", "Temperance", "절제", 14],
  ["M15", "The Devil", "악마", 15],
  ["M16", "The Tower", "탑", 16],
  ["M17", "The Star", "별", 17],
  ["M18", "The Moon", "달", 18],
  ["M19", "The Sun", "태양", 19],
  ["M20", "Judgement", "심판", 20],
  ["M21", "The World", "세계", 21],
];

const MINOR_SUITS = ["Wands", "Cups", "Swords", "Pentacles"];
const MINOR_RANKS = [
  "Ace",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Page",
  "Knight",
  "Queen",
  "King",
];

function normalizeCategory(input) {
  const key = String(input || "general").trim().toLowerCase();
  return CATEGORY_MAP[key] || "general";
}

function normalizeSpreadType(input) {
  const raw = String(input || "one_card").trim();
  if (!raw) return "one_card";
  if (SPREAD_CONFIG[raw]) return raw;
  return SPREAD_ALIASES[raw] || raw;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function initFromPreloadedData(db, sample) {
  if (!db && !sample) return;
  const sampleMap = sample && Array.isArray(sample.cards) ? new Map(sample.cards.map((c) => [c.id, c])) : new Map();
  if (db && Array.isArray(db.cards) && db.cards.length >= 78) {
    const hasNoisyContent = db.cards[0]?.interpretations?.upright?.general?.includes("메이저 아르카나");
    if (hasNoisyContent && sampleMap.size > 0) {
      cachedCards = db.cards.map((c) => {
        const fromSample = sampleMap.get(c.id);
        if (fromSample?.interpretations) return { ...c, interpretations: fromSample.interpretations, keywords: fromSample.keywords || c.keywords };
        return c;
      });
    } else {
      cachedCards = db.cards;
    }
    return;
  }
  if (sample && Array.isArray(sample.cards) && sample.cards.length >= 78) {
    cachedCards = sample.cards;
    return;
  }
  cachedCards = buildFallbackDeck78();
}

function loadCardDb() {
  if (cachedCards) return cachedCards;

  const db = readJson(DB_PATH);
  const sample = readJson(SAMPLE_PATH);
  const sampleMap = sample && Array.isArray(sample.cards) ? new Map(sample.cards.map((c) => [c.id, c])) : new Map();

  if (db && Array.isArray(db.cards) && db.cards.length >= 78) {
    const hasNoisyContent = db.cards[0]?.interpretations?.upright?.general?.includes("메이저 아르카나");
    if (hasNoisyContent && sampleMap.size > 0) {
      cachedCards = db.cards.map((c) => {
        const fromSample = sampleMap.get(c.id);
        if (fromSample?.interpretations) return { ...c, interpretations: fromSample.interpretations, keywords: fromSample.keywords || c.keywords };
        return c;
      });
    } else {
      cachedCards = db.cards;
    }
    return cachedCards;
  }

  if (sample && Array.isArray(sample.cards) && sample.cards.length >= 78) {
    cachedCards = sample.cards;
    return cachedCards;
  }

  cachedCards = buildFallbackDeck78();
  return cachedCards;
}

function createPlaceholderInterpretations(nameKr) {
  return {
    upright: {
      general: `${nameKr} 정방향은 흐름이 자연스럽게 열리는 시점임을 보여줍니다.`,
      love: `${nameKr} 정방향은 감정 표현과 신뢰 회복이 관계 개선의 열쇠임을 시사합니다.`,
      money: `${nameKr} 정방향은 현실적인 계획과 실행이 재정 흐름을 안정화한다고 말합니다.`,
      career: `${nameKr} 정방향은 역할 집중과 꾸준한 실행이 성과로 이어짐을 나타냅니다.`,
    },
    reversed: {
      general: `${nameKr} 역방향은 지연과 오해를 줄이기 위한 점검이 필요함을 보여줍니다.`,
      love: `${nameKr} 역방향은 서운함 누적을 막기 위해 소통의 방식 조정이 필요함을 시사합니다.`,
      money: `${nameKr} 역방향은 충동적 판단보다 리스크 관리가 우선임을 나타냅니다.`,
      career: `${nameKr} 역방향은 프로세스 재정비와 우선순위 조정이 먼저임을 말합니다.`,
    },
  };
}

function buildFallbackDeck78() {
  const majors = MAJOR_ARCANA.map(([id, name, nameKr, number]) => ({
    id,
    name,
    nameKr,
    arcanaType: "Major",
    suit: null,
    rank: String(number),
    number,
    imageKey: `major-${id.toLowerCase()}`,
    keywords: {
      upright: ["성장", "확장", "기회"],
      reversed: ["지연", "점검", "재정비"],
    },
    interpretations: createPlaceholderInterpretations(nameKr),
    symbols: [],
  }));

  const minors = [];
  MINOR_SUITS.forEach((suit, suitIndex) => {
    MINOR_RANKS.forEach((rank, rankIndex) => {
      const id = `${suit[0]}${String(rankIndex + 1).padStart(2, "0")}`;
      const name = `${rank} of ${suit}`;
      const nameKr = `${suit} ${rank}`;
      minors.push({
        id,
        name,
        nameKr,
        arcanaType: "Minor",
        suit,
        rank,
        number: rankIndex + 1,
        imageKey: `${suit.toLowerCase()}-${rank.toLowerCase()}`,
        keywords: {
          upright: ["실행", "균형", "진행"],
          reversed: ["혼선", "지연", "보완"],
        },
        interpretations: createPlaceholderInterpretations(nameKr),
        symbols: [],
      });
    });
  });

  return majors.concat(minors);
}

function shuffleCards(deck) {
  const copy = deck.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// cardId -> filename (matches public/tarot-cards/ local mirror from krates98/tarotcardapi)
const CARD_TO_FILENAME = {
  M00: "thefool.jpeg", M01: "themagician.jpeg", M02: "thehighpriestess.jpeg", M03: "theempress.jpeg",
  M04: "theemperor.jpeg", M05: "thehierophant.jpeg", M06: "TheLovers.jpg", M07: "thechariot.jpeg",
  M08: "thestrength.jpeg", M09: "thehermit.jpeg", M10: "wheeloffortune.jpeg", M11: "justice.jpeg",
  M12: "thehangedman.jpeg", M13: "death.jpeg", M14: "temperance.jpeg", M15: "thedevil.jpeg",
  M16: "thetower.jpeg", M17: "thestar.jpeg", M18: "themoon.jpeg", M19: "thesun.jpeg",
  M20: "judgement.jpeg", M21: "theworld.jpeg",
  W01: "aceofwands.jpeg", W02: "twoofwands.jpeg", W03: "threeofwands.jpeg", W04: "fourofwands.jpeg",
  W05: "fiveofwands.jpeg", W06: "sixofwands.jpeg", W07: "sevenofwands.jpeg", W08: "eightofwands.jpeg",
  W09: "nineofwands.jpeg", W10: "tenofwands.jpeg", W11: "pageofwands.jpeg", W12: "knightofwands.jpeg",
  W13: "queenofwands.jpeg", W14: "kingofwands.jpeg",
  C01: "aceofcups.jpeg", C02: "twoofcups.jpeg", C03: "threeofcups.jpeg", C04: "fourofcups.jpeg",
  C05: "fiveofcups.jpeg", C06: "sixofcups.jpeg", C07: "sevenofcups.jpeg", C08: "eightofcups.jpeg",
  C09: "nineofcups.jpeg", C10: "tenofcups.jpeg", C11: "pageofcups.jpeg", C12: "knightofcups.jpeg",
  C13: "queenofcups.jpeg", C14: "kingofcups.jpeg",
  S01: "aceofswords.jpeg", S02: "twoofswords.jpeg", S03: "threeofswords.jpeg", S04: "fourofswords.jpeg",
  S05: "fiveofswords.jpeg", S06: "sixofswords.jpeg", S07: "sevenofswords.jpeg", S08: "eightofswords.jpeg",
  S09: "nineofswords.jpeg", S10: "tenofswords.jpeg", S11: "pageofswords.jpeg", S12: "knightofswords.jpeg",
  S13: "queenofswords.jpeg", S14: "kingofswords.jpeg",
  P01: "aceofpentacles.jpeg", P02: "twoofpentacles.jpeg", P03: "threeofpentacles.jpeg", P04: "fourofpentacles.jpeg",
  P05: "fiveofpentacles.jpeg", P06: "sixofpentacles.jpeg", P07: "sevenofpentacles.jpeg", P08: "eightofpentacles.jpeg",
  P09: "nineofpentacles.jpeg", P10: "tenofpentacles.jpeg", P11: "pageofpentacles.jpeg", P12: "knightofpentacles.jpeg",
  P13: "queenofpentacles.jpeg", P14: "kingofpentacles.jpeg",
};

function buildTarotImageSources(cardName, cardId) {
  const raw = String(cardName || "").trim();
  if (!raw) return { imageUrl: "", imageCandidates: [], proxyImageUrl: "", localImageUrl: "" };

  const compactLower = raw.replace(/\s+/g, "").toLowerCase();
  const cdnBase = "https://cdn.jsdelivr.net/gh/krates98/tarotcardapi@main/images/";
  const rawBase = "https://raw.githubusercontent.com/krates98/tarotcardapi/main/images/";
  const canonicalName = compactLower === "thelovers" ? "TheLovers" : compactLower;
  const canonicalExt = compactLower === "thelovers" ? ".jpg" : ".jpeg";
  const canonical = `${canonicalName}${canonicalExt}`;

  const localFilename = cardId ? CARD_TO_FILENAME[cardId] : null;
  const localImageUrl = localFilename ? `/tarot-cards/${localFilename}` : "";

  return {
    imageUrl: `${cdnBase}${canonical}`,
    imageCandidates: [
      `${cdnBase}${canonical}`,
      `${rawBase}${canonical}`,
    ],
    proxyImageUrl: cardId ? `/api/tarot/card-image/${encodeURIComponent(cardId)}` : "",
    localImageUrl,
  };
}

function getCardImageSourcesById(cardId) {
  const id = String(cardId || "").trim();
  if (!id) return { imageUrl: "", imageCandidates: [], proxyImageUrl: "", localImageUrl: "" };
  const lookup = buildCardLookup();
  const card = lookup.get(id);
  if (!card) return { imageUrl: "", imageCandidates: [], proxyImageUrl: "", localImageUrl: "" };
  return buildTarotImageSources(card.name, id);
}

function drawCards(spreadType) {
  const normalizedSpread = normalizeSpreadType(spreadType);
  const spread = SPREAD_CONFIG[normalizedSpread];
  if (!spread) {
    throw new Error("지원하지 않는 스프레드입니다.");
  }

  const db = loadCardDb();
  if (db.length < spread.cardCount) {
    throw new Error("DB 카드 수가 스프레드 요구 수보다 적습니다.");
  }

  const shuffled = shuffleCards(db);
  const selected = shuffled.slice(0, spread.cardCount);

  return selected.map((card, index) => {
    const orientation = Math.random() < 0.5 ? "upright" : "reversed";
    const kw = card.keywords || {};
    const keywords = Array.isArray(kw)
      ? kw
      : (orientation === "upright" ? kw.upright : kw.reversed) || [];
    const { imageUrl, imageCandidates, proxyImageUrl, localImageUrl } = buildTarotImageSources(card.name, card.id);
    return {
    position: spread.labels[index],
      orientation,
    cardId: card.id,
    name: card.name,
    nameKr: card.nameKr,
    type: card.arcanaType,
    suit: card.suit || null,
    rank: card.rank || null,
    imageKey: card.imageKey || card.id,
      imageUrl,
      imageCandidates,
      proxyImageUrl,
      localImageUrl,
      keywords: Array.isArray(keywords) ? keywords : [],
    };
  });
}

function buildCardLookup() {
  const db = loadCardDb();
  const lookup = new Map();
  db.forEach((card) => {
    lookup.set(card.id, card);
  });
  return lookup;
}

function selectInterpretation(card, orientation, category) {
  const byOrientation = card.interpretations?.[orientation];
  const picked = byOrientation
    ? (byOrientation[category] || byOrientation.general || card.interpretations?.upright?.general || "")
    : "";
  const sanitized = sanitizeInterpretation(picked);
  if (sanitized) return sanitized;

  // If the DB text is noisy/empty (scraped glossary/ad blocks), build structured meaning
  // from suit/rank/major arcana tables to provide counselor-quality fallback content.
  const kw = card.keywords || {};
  const keywordList = Array.isArray(kw)
    ? kw
    : (orientation === "upright" ? kw.upright : kw.reversed) || [];
  const keywordMeaning = buildKeywordMeaning(keywordList, orientation, "");
  if (keywordMeaning) return keywordMeaning;

  // Try structured meaning for all categories (not just general)
  const structuredGeneral = buildStructuredGeneralMeaning(card, orientation);
  if (structuredGeneral) return structuredGeneral;

  // For love category, try love-specific meaning using suit/rank
  if (category === "love" && (card.suit || card.rank || card.id)) {
    const syntheticItem = { cardId: card.id, orientation, suit: card.suit, rank: card.rank, arcanaType: card.arcanaType };
    const loveMeaning = buildStructuredLoveMeaning(syntheticItem);
    if (loveMeaning) return loveMeaning;
  }

  const nameKr = card.nameKr || card.name || "해당 카드";
  const placeholders = createPlaceholderInterpretations(nameKr);
  const fallback = placeholders[orientation]?.[category] || placeholders[orientation]?.general || placeholders.upright?.general || "";
  return fallback;
}

function sanitizeInterpretation(input) {
  const text = String(input || "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  // Scraped glossary/ad blocks should never appear in final reading text.
  const noisyPattern =
    /(광고|Advertisement|마이너 아르카나|Suit of|코트 카드|숫자별 의미|완드\s*\(|컵\s*\(|소드\s*\(|펜타클\s*\()/i;
  if (noisyPattern.test(text)) return "";
  if ((text.match(/카드\s*:/g) || []).length >= 2) return "";
  if ((text.match(/,/g) || []).length >= 8) return "";

  // Allow sufficient length for quality, counselor-level readings (up to 600 chars).
  return text.slice(0, 600).trim();
}

function normalizeKeywordList(keywords) {
  if (!Array.isArray(keywords)) return [];
  const cleaned = keywords
    .map((k) => String(k || "").trim())
    .filter(Boolean);
  return [...new Set(cleaned)].slice(0, 3);
}

function buildKeywordMeaning(keywords, orientation, fallback) {
  const list = normalizeKeywordList(keywords);
  if (!list.length) return fallback;
  const tail = orientation === "reversed"
    ? "지금은 속도를 늦추고 내면의 흐름을 점검하면서 다음 단계를 신중하게 준비하는 것이 중요합니다. 역방향은 힘의 부재가 아닌 방향 재조정의 신호임을 기억하세요."
    : "이 에너지를 실행으로 연결하면 흐름이 한 단계 진전될 수 있습니다. 지금의 방향을 믿고 차분하게 나아가세요.";
  return `이 카드의 핵심 에너지는 ${list.join(", ")}입니다. 이 키워드들이 현재 상황과 공명하며 중요한 메시지를 전달하고 있습니다. ${tail}`;
}

const SUIT_GENERAL_MEANING = {
  Wands: "의욕과 실행, 추진력",
  Cups: "감정 흐름과 공감, 관계의 온도",
  Swords: "생각 정리, 소통 방식, 판단과 결단",
  Pentacles: "현실 조건, 돈/자원, 지속 가능성",
  완드: "의욕과 실행, 추진력",
  컵: "감정 흐름과 공감, 관계의 온도",
  소드: "생각 정리, 소통 방식, 판단과 결단",
  펜타클: "현실 조건, 돈/자원, 지속 가능성",
};

const RANK_GENERAL_MEANING = {
  Ace: "새 출발의 씨앗",
  Two: "선택과 균형",
  Three: "확장과 상호작용",
  Four: "안정 혹은 정체",
  Five: "마찰과 조정",
  Six: "회복과 전진",
  Seven: "점검과 재평가",
  Eight: "집중과 실행",
  Nine: "성숙과 마무리 직전",
  Ten: "완성과 부담/책임",
  Page: "탐색과 학습",
  Knight: "추진과 돌파",
  Queen: "내면의 성숙과 보살핌",
  King: "외부의 통솔과 책임",
};

function buildStructuredGeneralMeaning(card, orientation) {
  if (!card) return "";
  const tail =
    orientation === "reversed"
      ? "다만 지금은 속도를 늦추고 오해가 생길 지점을 먼저 점검하는 편이 안전합니다. 역방향의 에너지는 힘이 없는 것이 아니라 방향을 바꾸라는 신호임을 기억하세요."
      : "지금은 방향을 정하고 한 걸음씩 실행하면 흐름이 자연스럽게 풀릴 수 있습니다. 정방향의 에너지는 당신의 행동을 지지하고 있습니다.";

  // Prefer built-in major meanings when available (clean, non-scraped).
  if (card.id && MAJOR_ARCANA_YEARLY[card.id] && MAJOR_ARCANA_YEARLY[card.id][orientation]?.general) {
    return MAJOR_ARCANA_YEARLY[card.id][orientation].general;
  }

  if (card.suit || card.rank) {
    const suitText = SUIT_GENERAL_MEANING[card.suit] || "핵심 테마";
    const rankText = RANK_GENERAL_MEANING[card.rank] || "현재 단계의 과제";
    const suitDetailMap = {
      Wands: "불의 원소를 가진 완드 슈트는 열정, 창의성, 행동 에너지를 상징합니다. 이 카드가 등장하면 삶의 진취적인 측면과 관련이 있습니다.",
      Cups: "물의 원소를 가진 컵 슈트는 감정, 직관, 관계를 상징합니다. 이 카드가 등장하면 내면의 정서적 영역과 인간관계에 집중할 필요가 있습니다.",
      Swords: "공기의 원소를 가진 소드 슈트는 사고, 소통, 갈등과 해결책을 상징합니다. 이 카드가 등장하면 생각의 패턴이나 소통 방식을 점검해야 합니다.",
      Pentacles: "흙의 원소를 가진 펜타클 슈트는 물질, 현실, 자원과 안정을 상징합니다. 이 카드가 등장하면 실질적이고 현실적인 측면에 주목해야 합니다.",
    };
    const suitDetail = suitDetailMap[card.suit] || "";
    return `${suitDetail} ${suitText} 영역에서 '${rankText}'가 이달의 핵심 에너지로 작동합니다. ${tail}`;
  }
  return "";
}

function cardLabel(item) {
  const base = item?.nameKr || item?.name || item?.cardId || "해당 카드";
  return `${base}${item?.orientation === "reversed" ? "(역)" : ""}`;
}

const SUIT_LOVE_MEANING = {
  Cups: "감정 교류와 정서적 친밀감",
  Wands: "열정, 호감 표현, 관계 추진력",
  Swords: "대화 방식, 판단, 오해/갈등 관리",
  Pentacles: "현실 조건, 안정감, 지속 가능성",
  컵: "감정 교류와 정서적 친밀감",
  완드: "열정, 호감 표현, 관계 추진력",
  소드: "대화 방식, 판단, 오해/갈등 관리",
  펜타클: "현실 조건, 안정감, 지속 가능성",
};

const RANK_LOVE_MEANING = {
  Ace: "새로운 시작",
  A: "새로운 시작",
  "1": "새로운 시작",
  Two: "선택과 균형",
  "2": "선택과 균형",
  Three: "확장과 관계 전개",
  "3": "확장과 관계 전개",
  Four: "안정 혹은 정체",
  "4": "안정 혹은 정체",
  Five: "충돌과 조율 필요",
  "5": "충돌과 조율 필요",
  Six: "회복과 화해 가능성",
  "6": "회복과 화해 가능성",
  Seven: "점검과 재평가",
  "7": "점검과 재평가",
  Eight: "집중과 관계 개선 행동",
  "8": "집중과 관계 개선 행동",
  Nine: "감정 성숙과 자존감",
  "9": "감정 성숙과 자존감",
  Ten: "완성과 장기적 방향",
  "10": "완성과 장기적 방향",
  Page: "호기심과 탐색",
  P: "호기심과 탐색",
  Knight: "강한 추진력",
  N: "강한 추진력",
  Queen: "배려와 공감",
  Q: "배려와 공감",
  King: "책임감과 주도성",
  K: "책임감과 주도성",
};

const MAJOR_LOVE_MEANING = {
  M00: "새로운 관계 흐름을 여는 출발점입니다.",
  M01: "주도적으로 관계를 이끌 힘이 강해지는 시기입니다.",
  M02: "겉보다 속마음이 더 중요한 국면입니다.",
  M03: "돌봄과 애정 표현이 관계를 따뜻하게 만듭니다.",
  M04: "경계와 책임을 분명히 해야 안정됩니다.",
  M05: "관계의 원칙과 약속을 재정의할 필요가 있습니다.",
  M06: "서로를 선택하고 맞춰가는 핵심 순간입니다.",
  M07: "감정보다 방향성을 정하면 진전이 빨라집니다.",
  M08: "감정 기복을 다스리는 성숙함이 관건입니다.",
  M09: "잠시 거리 두고 본심을 정리할 필요가 있습니다.",
  M10: "관계의 흐름이 크게 전환되는 타이밍입니다.",
  M11: "공정한 대화와 균형이 문제 해결의 열쇠입니다.",
  M12: "시각을 바꾸면 막힌 관계의 답이 보입니다.",
  M13: "낡은 패턴을 끊고 관계를 재구성해야 합니다.",
  M14: "속도를 조절하면 안정적인 관계로 회복됩니다.",
  M15: "집착·불안 패턴을 끊어야 관계가 건강해집니다.",
  M16: "숨겨진 문제가 드러나며 관계 구조가 흔들릴 수 있습니다.",
  M17: "회복과 희망의 신호가 살아나는 흐름입니다.",
  M18: "오해와 불안이 커지기 쉬워 사실 확인이 우선입니다.",
  M19: "솔직한 표현이 관계 만족도를 크게 높입니다.",
  M20: "관계를 다시 정의하는 결정의 순간입니다.",
  M21: "관계의 완성도와 안정감이 높아지는 흐름입니다.",
};

function buildStructuredLoveMeaning(item) {
  if (!item) return "";
  const orientationTail =
    item.orientation === "reversed"
      ? "다만 지금은 서두르기보다 오해를 정리하고 속도를 맞추는 것이 중요합니다."
      : "서로의 리듬을 맞추면 관계를 한 단계 발전시킬 수 있습니다.";

  if (item.cardId && MAJOR_LOVE_MEANING[item.cardId]) {
    return `${MAJOR_LOVE_MEANING[item.cardId]} ${orientationTail}`;
  }

  if (item.suit || item.rank) {
    const suitText = SUIT_LOVE_MEANING[item.suit] || "관계의 핵심 테마";
    const rankText = RANK_LOVE_MEANING[item.rank] || "현재 단계의 과제";
    return `${suitText} 이슈에서 '${rankText}'가 핵심으로 작동합니다. ${orientationTail}`;
  }
  return "";
}

function relationshipMeaning(item, fallback) {
  if (!item) return fallback;
  const structured = buildStructuredLoveMeaning(item);
  if (structured) return structured;
  if (item.interpretation) return item.interpretation;
  return buildKeywordMeaning(item.keywords, item.orientation, fallback);
}

function toSentence(text, limit = 400) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.slice(0, limit).trim();
}

function buildReunionPositionMeaning(card, position) {
  if (!card) return "";
  const base = toSentence(
    relationshipMeaning(card, `${cardLabel(card)}가 이 포지션의 핵심 메시지를 전합니다.`),
    180,
  );
  const keywords = Array.isArray(card.keywords) ? card.keywords.slice(0, 3).filter(Boolean) : [];
  const keywordLine = keywords.length ? `핵심 키워드는 ${keywords.join(", ")}입니다.` : "";
  const isReversed = card.orientation === "reversed";
  const suit = String(card.suit || "").trim();
  const isMajor = String(card.arcanaType || "").toLowerCase() === "major";

  function positionSuitHint(pos, s, reversed) {
    const map = {
      past_bond: {
        Cups: reversed
          ? "감정의 추억은 남아 있지만 서운함과 미련이 섞여 해석 충돌이 생기기 쉽습니다."
          : "감정적 유대의 기억이 선명하게 남아 있어 관계의 정서적 기반이 살아 있습니다.",
        Wands: reversed
          ? "뜨거웠던 에너지가 소진되어 당시의 열정과 현재 온도 차이가 크게 느껴질 수 있습니다."
          : "빠르고 강한 끌림이 있었던 관계로, 시작 동력이 분명했던 인연입니다.",
        Swords: reversed
          ? "과거 대화의 상처나 오해가 정리되지 않아 기억이 왜곡되기 쉬운 흐름입니다."
          : "관계를 규정하던 생각과 판단이 뚜렷했던 시기로, 말의 무게가 컸던 인연입니다.",
        Pentacles: reversed
          ? "현실 조건 문제(거리/시간/상황)로 안정이 깨졌던 기억이 재회 판단에 남아 있습니다."
          : "신뢰와 일상적 루틴이 쌓였던 관계로, 현실 기반 연결감이 강했습니다.",
      },
      their_now: {
        Cups: reversed
          ? "감정 기복이 커져 표현이 들쭉날쭉할 수 있어 반응 해석에 주의가 필요합니다."
          : "감정을 완전히 닫지는 않았고, 정서적 여유가 생기면 반응이 살아날 가능성이 있습니다.",
        Wands: reversed
          ? "생활 에너지가 분산되어 관계 이슈에 집중할 여력이 떨어진 상태일 수 있습니다."
          : "일·생활 리듬이 빠르게 돌아가며, 타이밍이 맞으면 행동 반응은 비교적 빠른 편입니다.",
        Swords: reversed
          ? "머릿속 정리가 덜 되어 말수가 줄거나 방어적 답변이 늘 수 있습니다."
          : "이성적 판단이 우선인 상태라 감정보다 현실 타당성을 먼저 확인하려는 흐름입니다.",
        Pentacles: reversed
          ? "현실 부담이 커져 감정 표현을 뒤로 미루는 상태일 가능성이 큽니다."
          : "생활 안정과 실질적 조건을 먼저 보며 관계를 신중히 판단하는 시기입니다.",
      },
      outside_factor: {
        Cups: reversed
          ? "주변 감정 소문이나 정서적 간섭이 사실보다 크게 느껴질 수 있습니다."
          : "정서적 영향 요인이 있지만 대화의 온도를 안정시키면 충분히 완화 가능합니다.",
        Wands: reversed
          ? "외부 변수의 속도와 자극이 커서 관계 흐름이 쉽게 흔들릴 수 있습니다."
          : "타이밍 변수는 있지만 실행 순서를 정하면 통제 가능한 범위입니다.",
        Swords: reversed
          ? "오해·추측·불완전 정보가 장애물로 작동할 수 있어 팩트 체크가 핵심입니다."
          : "제3자 의견과 현실 판단이 영향을 주니, 기준을 분명히 하면 혼선을 줄일 수 있습니다.",
        Pentacles: reversed
          ? "거리·돈·시간 같은 현실 조건이 병목으로 크게 작동하는 구간입니다."
          : "현실 제약은 존재하지만 조정 가능한 항목부터 손대면 체감 난이도를 낮출 수 있습니다.",
      },
      their_heart: {
        Cups: reversed
          ? "감정은 남아도 상처 방어가 먼저 올라와 표현이 쉽게 끊길 수 있습니다."
          : "정서적 호감과 그리움의 결이 비교적 선명하게 살아 있는 신호입니다.",
        Wands: reversed
          ? "끌림은 있어도 확신 부족으로 뜨거움이 오래 유지되지 않을 수 있습니다."
          : "호감 에너지가 살아 있어 계기만 맞으면 반응이 분명해질 수 있습니다.",
        Swords: reversed
          ? "마음보다 경계가 먼저 작동해 차갑게 보이는 표현이 나올 수 있습니다."
          : "감정을 판단으로 검증하는 타입이라 표현은 절제돼도 관심 자체가 사라진 것은 아닙니다.",
        Pentacles: reversed
          ? "안정에 대한 불안이 커서 감정을 확인해도 쉽게 실행으로 옮기지 못할 수 있습니다."
          : "가볍게 흔들리기보다 신뢰가 쌓이면 천천히 깊어지는 속마음 패턴입니다.",
      },
      reunion_outcome: {
        Cups: reversed
          ? "감정선은 있으나 감정 정리가 선행되지 않으면 재회 후 반복 갈등 위험이 큽니다."
          : "감정적 재접속 가능성이 높아, 관계 복원 대화가 실제 재회로 이어질 확률이 있습니다.",
        Wands: reversed
          ? "재회 시도는 빠를 수 있지만 지속성이 약해 재결합 후 유지 설계가 필요합니다."
          : "재회 추진력은 충분하며, 타이밍을 맞추면 빠른 전환이 가능한 카드 흐름입니다.",
        Swords: reversed
          ? "결과가 지연되거나 번복될 수 있어 합의 없는 감정 돌진은 피해야 합니다."
          : "조건·기준을 명확히 합의하면 재회 가능성을 현실적으로 끌어올릴 수 있습니다.",
        Pentacles: reversed
          ? "현실 조건 미정리가 재회 성사율을 낮출 수 있어 구조 조정이 우선입니다."
          : "느리지만 안정형 재회 흐름으로, 생활 조건을 맞추면 장기 유지 가능성이 커집니다.",
      },
    };
    return map[pos]?.[s] || "";
  }

  const suitHint = suit ? positionSuitHint(position, suit, isReversed) : "";
  const arcanaHint = isMajor
    ? isReversed
      ? "메이저 아르카나 역방향이라 이 포지션의 과제가 크게 체감될 수 있어, 섣부른 결론보다 패턴 교정이 중요합니다."
      : "메이저 아르카나 정방향이라 이 포지션의 영향력이 크고, 올바른 대응 시 흐름 전환 효과도 큽니다."
    : "";

  function compactParts(parts) {
    return parts
      .map((p) => String(p || "").trim())
      .filter(Boolean)
      .join(" ");
  }

  if (position === "past_bond") {
    return compactParts([
      base,
      isReversed
        ? "과거의 미해결 감정이나 엇갈린 기억이 아직 남아 있을 수 있어, 당시의 오해를 먼저 정리하는 접근이 필요합니다."
        : "과거에 쌓인 정서적 연결 자산이 남아 있어, 좋은 기억을 건강하게 복원하면 관계 회복의 토대가 됩니다.",
      suitHint,
      arcanaHint,
      keywordLine,
    ]);
  }
  if (position === "their_now") {
    return compactParts([
      base,
      isReversed
        ? "상대는 현재 여유가 부족하거나 감정 표현이 닫혀 있을 가능성이 커, 반응 속도만으로 마음을 단정하지 않는 것이 좋습니다."
        : "상대는 현재 자신의 리듬 안에서 감정을 조심스럽게 정리하는 흐름으로 보여, 부담 없는 소통이 효과적입니다.",
      suitHint,
      arcanaHint,
      keywordLine,
    ]);
  }
  if (position === "outside_factor") {
    return compactParts([
      base,
      isReversed
        ? "주변 변수(타이밍, 거리, 일정, 제3자 시선)가 실제보다 크게 작동할 수 있어 감정적 추측보다 사실 확인이 우선입니다."
        : "관계를 둘러싼 현실 조건이 영향을 주지만, 조율 가능한 영역을 분리하면 충분히 완화할 수 있는 흐름입니다.",
      suitHint,
      arcanaHint,
      keywordLine,
    ]);
  }
  if (position === "their_heart") {
    return compactParts([
      base,
      isReversed
        ? "속마음은 있어도 방어적 태도나 두려움 때문에 표현이 늦어질 수 있어, 압박보다 안전한 대화 환경이 필요합니다."
        : "감정의 잔향이 살아 있고 당신을 의식하는 기류가 있어, 차분한 진심 전달이 관계 온도를 올릴 수 있습니다.",
      suitHint,
      arcanaHint,
      keywordLine,
    ]);
  }
  if (position === "reunion_outcome") {
    return compactParts([
      base,
      isReversed
        ? "단기적으로는 재회 속도가 느리거나 보류될 가능성이 있으니, 서두르기보다 관계 패턴을 재정비하는 편이 결과를 개선합니다."
        : "재회 가능성은 열려 있으며, 과거 문제를 같은 방식으로 반복하지 않을 때 실제 성사 확률이 높아집니다.",
      suitHint,
      arcanaHint,
      keywordLine,
    ]);
  }
  return compactParts([base, suitHint, arcanaHint, keywordLine]);
}

function buildTransition(position, spreadType) {
  if (spreadType === "one_card") return "지금의 핵심 메시지는";
  if (spreadType === "yearly_twelve_card") {
    const monthMap = {
      month_1: "1월", month_2: "2월", month_3: "3월", month_4: "4월",
      month_5: "5월", month_6: "6월", month_7: "7월", month_8: "8월",
      month_9: "9월", month_10: "10월", month_11: "11월", month_12: "12월",
    };
    const m = monthMap[position] || position;
    return `${m}의 운세에서는`;
  }
  const map = {
    past: "과거의 흐름에서는",
    present: "현재의 국면에서는",
    future: "다가올 전개에서는",
    cause: "문제의 원인으로는",
    process: "진행 과정에서는",
    outcome: "최종 결과로는",
  };
  return map[position] || "이 위치에서는";
}

function createReading({ category, spreadType, drawnCards }) {
  if (!Array.isArray(drawnCards) || drawnCards.length === 0) {
    throw new Error("리딩할 카드가 없습니다.");
  }

  const normalizedCategory = normalizeCategory(category);
  const lookup = buildCardLookup();

  const cardReadings = drawnCards.map((picked) => {
    const card = lookup.get(picked.cardId);
    if (!card) {
      throw new Error(`카드 ID를 찾을 수 없습니다: ${picked.cardId}`);
    }
    const interpretation = selectInterpretation(
      card,
      picked.orientation,
      normalizedCategory,
    );
    const { imageUrl, imageCandidates, proxyImageUrl, localImageUrl } = buildTarotImageSources(card.name, card.id);
    return {
      ...picked,
      name: card.name,
      nameKr: card.nameKr || card.name,
      interpretation,
      keywords:
        picked.orientation === "upright"
          ? card.keywords?.upright || []
          : card.keywords?.reversed || [],
      imageUrl,
      imageCandidates,
      proxyImageUrl,
      localImageUrl,
    };
  });

  const story = cardReadings
    .map((item) => {
      const transition = buildTransition(item.position, spreadType);
      const orientNote = item.orientation === "reversed"
        ? `${item.nameKr}(역방향) 카드가 이 위치에서 말하는 것은: 지금 흐름이 완전히 막힌 것이 아니라 속도 조절과 점검이 필요하다는 신호입니다.`
        : `${item.nameKr}(정방향) 카드가 이 위치에서 말하는 것은: 흐름이 열려 있으며 적절한 행동이 결과로 이어진다는 신호입니다.`;
      return `[${transition}] ${item.interpretation} ${orientNote}`;
    })
    .join("\n\n");

  const categoryLabel = { general: "전반적인 흐름", love: "연애·관계", money: "재물·재정", career: "직업·커리어", healing: "치유·회복", reunion: "재회·인연" }[normalizedCategory] || normalizedCategory;
  const advice = [
    `베테랑 타로 상담사의 종합 조언 (${categoryLabel} 관점):`,
    `오늘 뽑힌 카드의 흐름은 ${cardReadings.map((item) => `${item.nameKr}(${item.orientation === "reversed" ? "역" : "정"})`).join(" → ")}입니다.`,
    `이 카드들의 연결된 메시지는: 현재 ${normalizedCategory === "love" ? "감정과 관계" : normalizedCategory === "money" ? "재물과 현실 자원" : normalizedCategory === "career" ? "직업과 성장" : "삶의 방향"}에서 중요한 전환점 또는 확인 포인트에 와 있다는 신호입니다.`,
    `핵심 행동 조언: 카드가 전달하는 에너지를 억지로 바꾸려 하지 말고, 먼저 지금 상태를 솔직하게 인정한 뒤 가장 작은 실행부터 시작하세요.`,
    `기억하세요: 타로는 운명을 확정 짓는 것이 아니라, 지금 이 순간 당신이 가장 잘 대응할 수 있는 방향을 비춰주는 안내자입니다.`,
  ].join(" ");

  return {
    category: normalizedCategory,
    spreadType,
    cardReadings,
    story,
    advice,
  };
}

function getEngineMeta() {
  const cards = loadCardDb();
  return {
    deckSize: cards.length,
    spreads: Object.keys(SPREAD_CONFIG),
    categories: ["general", "love", "money", "career", "healing", "reunion"],
  };
}

// ─── "우리 무슨 사이야" 6-Card Relationship Reading ───
const SUIT_TO_ELEMENT = {
  Wands: "fire",
  Cups: "water",
  Swords: "air",
  Pentacles: "earth",
};

function createRelationshipReading({ drawnCards }) {
  if (!Array.isArray(drawnCards) || drawnCards.length !== 6) {
    throw new Error("관계 리딩에는 6장의 카드가 필요합니다.");
  }

  const lookup = buildCardLookup();
  const cardReadings = drawnCards.map((picked) => {
    const card = lookup.get(picked.cardId);
    if (!card) throw new Error(`카드 ID를 찾을 수 없습니다: ${picked.cardId}`);
    const interpretation = selectInterpretation(card, picked.orientation, "love");
    const keywords =
      picked.orientation === "upright"
        ? card.keywords?.upright || []
        : card.keywords?.reversed || [];
    const { imageUrl, imageCandidates, proxyImageUrl, localImageUrl } = buildTarotImageSources(card.name, card.id);
    return {
      ...picked,
      name: card.name,
      nameKr: card.nameKr || card.name,
      interpretation,
      keywords: Array.isArray(keywords) ? keywords : [],
      suit: card.suit,
      arcanaType: card.arcanaType,
      imageUrl,
      imageCandidates,
      proxyImageUrl,
      localImageUrl,
    };
  });

  const byPos = {};
  cardReadings.forEach((r) => {
    byPos[r.position] = r;
  });
  const p1 = byPos.position_1;
  const p2 = byPos.position_2;
  const p3 = byPos.position_3;
  const p4 = byPos.position_4;
  const p5 = byPos.position_5;
  const p6 = byPos.position_6;
  const positionMeta = {
    position_1: "내가 보는 상대",
    position_2: "상대가 관계를 보는 것",
    position_3: "상대가 나를 보는 것",
    position_4: "연애하고픈 마음",
    position_5: "관계를 막는 것",
    position_6: "예상되는 결과",
  };
  const positionCounselorFrame = {
    position_1:
      "이 포지션은 내 기대와 두려움이 상대를 어떻게 해석하게 만드는지 보여줍니다. 사실 확인 전에 마음이 앞서지 않도록 속도를 조절해 주세요.",
    position_2:
      "상대의 반응은 감정의 부재가 아니라 표현 방식의 차이일 수 있습니다. 말의 내용만큼 말투와 타이밍도 함께 읽어야 정확도가 올라갑니다.",
    position_3:
      "상대가 관계를 어떻게 정의하는지는 행동 패턴에서 더 잘 드러납니다. 반복적으로 나타나는 신호를 기준으로 관계의 현실을 읽어보세요.",
    position_4:
      "관계 의지는 강도보다 지속성이 중요합니다. 뜨거운 한 번보다 안정적인 반복이 신뢰를 만들고 미래를 바꿉니다.",
    position_5:
      "병목은 대개 사랑이 부족해서가 아니라 방식이 맞지 않아서 생깁니다. 감정 문제와 구조 문제를 분리하면 해결의 실마리가 빨리 보입니다.",
    position_6:
      "예상 결과는 운명 확정이 아니라 현재 선택의 누적치입니다. 지금의 대화 방식과 경계 설정을 바꾸면 결말의 결도 달라질 수 있습니다.",
  };

  // Step 1: Macro Analysis
  const majorCount = cardReadings.filter((r) => r.arcanaType === "Major").length;
  const elementCounts = { fire: 0, water: 0, air: 0, earth: 0 };
  cardReadings.forEach((r) => {
    if (r.suit) {
      const el = SUIT_TO_ELEMENT[r.suit];
      if (el) elementCounts[el]++;
    }
  });
  const dominantElement = Object.entries(elementCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const majorRatio = majorCount / 6;
  const isHeavyMajor = majorRatio >= 0.5;
  const elementVibe =
    dominantElement[0] === "fire"
      ? "이성적·충동적"
      : dominantElement[0] === "water"
        ? "감정적·직관적"
        : dominantElement[0] === "air"
          ? "이성적·소통"
          : "현실적·안정";

  // Step 2: Mirror Analysis (p1 vs p2, p3)
  const mirrorTone =
    p1?.orientation === "reversed" && p2?.orientation === "upright"
      ? "내담자의 착각 가능성"
      : p1?.orientation === "upright" && p2?.orientation === "reversed"
        ? "감정 온도 차이"
        : "쌍방향 호감 가능성";

  // Step 3: Desire vs Reality (p4 vs p5)
  const p4Reversed = p4?.orientation === "reversed";
  const p5Harsh =
    p5?.cardId?.startsWith("M15") ||
    p5?.cardId?.startsWith("M16") ||
    p5?.cardId?.startsWith("M13");
  const desireReality =
    p4Reversed && p5Harsh
      ? "마음도 상황도 어려움"
      : p4Reversed && !p5Harsh
        ? "상황은 나으나 마음이 없음"
        : !p4Reversed && p5Harsh
          ? "마음은 있으나 현실의 벽"
          : "마음과 상황 모두 유리";

  // Build narrative sections
  const overallVibe = `지금 두 사람의 관계는 ${isHeavyMajor ? "운명적 전환의 힘이 크게 작동하는 국면" : "일상 속 선택과 소통이 결과를 좌우하는 국면"}에 들어와 있습니다. 6장의 카드에서 ${elementVibe} 성향이 강하게 나타나, 감정의 온도와 표현 방식이 관계 만족도를 크게 바꿀 수 있습니다. 현재 흐름에서는 ${mirrorTone} 패턴이 읽히며, 핵심 현실은 '${desireReality}'에 가깝습니다. 중요한 점은 이 결과가 고정된 예언이 아니라는 사실입니다. 지금부터의 대화 태도, 경계 설정, 확인 방식에 따라 같은 감정도 전혀 다른 결말로 이어질 수 있습니다.`;

  const deepReading = [
    p1
      ? `당신이 보는 상대방은 ${cardLabel(p1)}의 에너지입니다. ${relationshipMeaning(
          p1,
          "당신의 무의식적 기대가 투영된 모습입니다."
        )} 지금 단계에서는 상대를 판단하기보다, 내가 어떤 장면에서 불안이 커지는지 먼저 알아차리는 것이 중요합니다. 불안의 원인을 알면 관계를 대하는 태도도 훨씬 안정적으로 바뀝니다.`
      : "",
    p2
      ? `상대방이 당신에게 느끼는 감정은 ${cardLabel(p2)}로 나타납니다. ${relationshipMeaning(
          p2,
          "호감의 종류와 깊이를 시사합니다."
        )} 상대의 감정은 '있다/없다'의 이분법보다 '표현 가능한 상태인가'로 읽는 편이 정확합니다. 표현이 서툴거나 여유가 부족한 시기라면, 진심이 있어도 반응이 느리게 나타날 수 있습니다.`
      : "",
    p3
      ? `상대방이 이 관계에 붙인 타이틀은 ${cardLabel(p3)}의 분위기입니다. ${relationshipMeaning(
          p3,
          "관계의 정의와 책임의 무게를 보여줍니다."
        )} 이 카드는 관계의 이름보다 관계의 운영 방식이 더 중요하다는 메시지도 줍니다. 서로 기대하는 빈도, 연락 리듬, 감정 표현의 언어를 맞추면 오해가 크게 줄어듭니다.`
      : "",
    p4
      ? `겉으로 드러나지 않은 연애 의지는 ${cardLabel(p4)}로 읽힙니다. ${relationshipMeaning(
          p4,
          "관계를 진전시키려는 마음의 온도를 암시합니다."
        )} 마음이 있다면 결국 행동의 일관성으로 드러나고, 마음이 흔들리면 간헐적 반응으로 나타납니다. 지금은 강한 확답을 요구하기보다 작은 약속의 이행 여부를 차분히 관찰하는 접근이 효과적입니다.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const realityAndFuture = [
    p5
      ? `관계를 가로막는 병목은 ${cardLabel(p5)}입니다. ${relationshipMeaning(
          p5,
          "현실적 장애물, 타이밍, 성향 충돌이 핵심 이슈입니다."
        )} 병목을 정확히 이해하면 감정 소모가 줄고, '풀 수 있는 문제'와 '기다려야 하는 문제'가 분리됩니다. 이 구분이 되는 순간 관계는 훨씬 건강한 방향으로 움직이기 시작합니다.`
      : "",
    p6
      ? `이 흐름이 유지될 때, 향후 3개월의 종착지는 ${cardLabel(p6)}에 가깝습니다. ${relationshipMeaning(
          p6,
          "단기적 미래의 결말을 시사합니다."
        )} 다만 이 결과는 현재의 선택이 계속될 때의 예상치입니다. 지금부터 대화의 방식, 감정 조절, 관계 경계를 한 단계 성숙하게 조정하면 미래 카드는 더 부드럽고 안정적인 결말로 이동할 수 있습니다.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const advice = [
    "감정이 올라온 순간 즉시 결론을 내리지 말고, 10분만 텀을 둔 뒤 '사실-해석-감정'을 분리해서 정리해 보세요.",
    "질문은 추궁형보다 확인형으로 바꾸세요. 예: '왜 그래?' 대신 '내가 이렇게 이해했는데 맞아?'",
    "관계의 속도를 맞추기 위해 이번 주에 '짧지만 진심이 담긴 대화' 1회를 목표로 잡아보세요.",
    "상대의 일관성은 말보다 반복 행동에서 확인하세요. 연락 빈도, 약속 이행, 감정 표현의 지속성을 체크하세요.",
    "불안할수록 관계의 결과를 붙잡기보다 내 일상 루틴(수면, 식사, 일정)을 먼저 지키세요. 정서적 안정이 관계 판단의 정확도를 높입니다.",
    "이번 리딩의 핵심은 '확답을 빨리 받는 것'이 아니라 '건강한 방식으로 관계를 설계하는 것'입니다. 천천히 그러나 분명하게 기준을 세우세요.",
  ];
  const positionBreakdown = cardReadings.map((item) => {
    const title = positionMeta[item.position] || item.position;
    const orientationNote =
      item.orientation === "reversed"
        ? "역방향 신호이므로 지금은 속도보다 정리, 확신보다 확인이 우선입니다."
        : "정방향 신호이므로 작은 실행을 이어가면 관계의 안정감이 분명히 높아집니다.";
    return {
      position: item.position,
      title,
      card: cardLabel(item),
      summary: `${relationshipMeaning(item, `${title} 포지션의 핵심 흐름입니다.`)} ${positionCounselorFrame[item.position] || ""} ${orientationNote}`,
    };
  });

  return {
    spreadType: "relationship_six_card",
    category: "love",
    cardReadings,
    reading: {
      overallVibe,
      deepReading,
      realityAndFuture,
      positionBreakdown,
      advice,
    },
  };
}

function createHealingRisingReading({ drawnCards }) {
  if (!Array.isArray(drawnCards) || drawnCards.length !== 4) {
    throw new Error("힐링 리딩에는 4장의 카드가 필요합니다.");
  }

  const lookup = buildCardLookup();
  const cardReadings = drawnCards.map((picked) => {
    const card = lookup.get(picked.cardId);
    if (!card) throw new Error(`카드 ID를 찾을 수 없습니다: ${picked.cardId}`);
    const interpretation = selectInterpretation(card, picked.orientation, "general");
    const keywords =
      picked.orientation === "upright"
        ? card.keywords?.upright || []
        : card.keywords?.reversed || [];
    const { imageUrl, imageCandidates, proxyImageUrl, localImageUrl } = buildTarotImageSources(card.name, card.id);
    return {
      ...picked,
      name: card.name,
      nameKr: card.nameKr || card.name,
      interpretation,
      keywords: Array.isArray(keywords) ? keywords : [],
      suit: card.suit,
      arcanaType: card.arcanaType,
      imageUrl,
      imageCandidates,
      proxyImageUrl,
      localImageUrl,
    };
  });

  const byPos = {};
  cardReadings.forEach((r) => {
    byPos[r.position] = r;
  });

  const c1 = byPos.hidden_truth;
  const c2 = byPos.embrace_pain;
  const c3 = byPos.silver_lining;
  const c4 = byPos.step_forward;

  const majorCount = cardReadings.filter((r) => r.arcanaType === "Major").length;
  const reversedCount = cardReadings.filter((r) => r.orientation === "reversed").length;
  const groundingNeeded = reversedCount >= 2;

  const coachIntro = majorCount >= 2
    ? "오늘 카드는 단순한 위로를 넘어, 삶의 방향을 재정렬해야 하는 전환 구간임을 보여줍니다."
    : "오늘 카드는 일상 루틴을 조정하는 것만으로도 회복 탄력을 만들 수 있음을 보여줍니다.";

  function coachLabel(card) {
    if (!card) return "해당 카드";
    return `${card.nameKr}${card.orientation === "reversed" ? "(역방향)" : "(정방향)"}`;
  }

  function safeMeaning(card, fallback) {
    if (!card) return fallback;
    const cleaned = String(card.interpretation || "").trim();
    return cleaned || fallback;
  }

  const opening = `카드를 펼치기 전에, 먼저 한 가지를 말씀드립니다. 지금 이 자리에 오신 것만으로도 이미 충분히 용기 있는 선택을 하신 겁니다. 자신의 마음을 들여다보려는 의지 자체가 치유의 첫 번째 문을 여는 행위이기 때문입니다. 저는 20년 이상 타로와 심리상담을 병행하며 수천 명의 내담자와 함께 앉아왔습니다. 그 긴 시간 동안 한 가지 사실이 반복적으로 확인됐습니다. 상처받은 사람들의 마음속에는 반드시 회복할 수 있는 힘이 이미 존재한다는 것, 그리고 그 힘은 종종 억누르거나 외면당한 감정들 바로 그 아래에 숨어있다는 것입니다. ${coachIntro} 타로는 운명을 선고하는 도구가 절대 아닙니다. 카드는 지금 당신의 무의식이 스스로에게 보내는 편지이며, 숨겨진 패턴과 다음 걸음을 이미 알고 있는 내면의 지혜를 가시화하는 언어입니다. 감정이 복잡하고 혼란스러울수록 자신을 탓하기 쉽습니다. 하지만 복잡한 감정 반응의 뒤에는 반드시 그럴 만한 이유가 있습니다. 오늘 네 장의 카드는 "숨겨진 진실 인식 → 고통의 정직한 수용 → 새로운 의미 재창출 → 실천 가능한 다음 걸음"이라는 깊은 회복 여정의 네 단계를 따라, 당신의 내면 이야기를 함께 읽어드리겠습니다. 준비가 되셨다면, 카드가 전하는 빛의 언어에 조용히 귀를 기울여보세요.`;

  const hiddenTruth = c1
    ? `첫 번째 카드 ${coachLabel(c1)}가 당신의 "숨겨진 진실" 자리에 놓였습니다. 이 자리는 표면에 드러난 사건이 아니라, 그 사건을 만들어낸 내면의 핵심 감정 패턴을 보여주는 위치입니다. ${safeMeaning(c1, "겉으로 보이는 사건보다 반복적으로 촉발되는 정서 반응이 진짜 원인일 수 있습니다.")} 경험 많은 타로 마스터의 관점에서 이 카드를 읽을 때, 저는 항상 이렇게 묻습니다. "지금 일어난 사건 자체가 당신을 이렇게까지 힘들게 만드는 것인가, 아니면 이 사건이 과거에 치유되지 않은 오래된 감정 상처를 건드리고 있는 것인가?" 많은 경우 현재의 고통은 과거 경험에서 형성된 믿음 체계 — "나는 사랑받기 어렵다", "나는 결국 혼자다", "해도 어차피 안 된다"와 같은 핵심 도식 — 이 다시 활성화될 때 훨씬 더 강하게 느껴집니다. 심리치료에서는 이것을 '핵심 믿음의 촉발'이라고 부릅니다. 지금 경험하는 고통의 강도가 사건의 크기에 비해 지나치게 크게 느껴진다면, 그것은 당신이 나약하기 때문이 아닙니다. 이 카드가 가리키는 진짜 원인이 표면 아래에 있다는 신호입니다. 오늘 이 자리에서 작은 실험을 해보세요. 지금 느끼는 감정을 한 단어로 적고, 그 감정을 처음 느꼈던 가장 오래된 기억이 무엇인지 떠올려보세요. 그 연결이 보이는 순간, 치유는 이미 시작됩니다.`
    : "";

  const embracePain = c2
    ? `두 번째 카드 ${coachLabel(c2)}가 "고통을 품어안는" 자리에 자리잡았습니다. 이 위치는 지금 경험하는 아픔 앞에서 취해야 할 내면의 태도를 보여줍니다. ${safeMeaning(c2, "불편한 감정은 나의 약함이 아니라 내 경계가 손상됐다는 중요한 신호입니다.")} 저는 상담실에서 수없이 이 말을 들었습니다. "힘들다는 걸 인정하면 더 무너질 것 같아서요." 그런데 실제 치유의 현장에서 관찰한 사실은 정반대입니다. 고통을 인정한 날부터 사람들은 더 빠르게 회복하기 시작합니다. 감정을 억누르는 데는 엄청난 심리적 에너지가 소비됩니다. 그 에너지가 감정을 처리하는 쪽으로 전환되는 순간, 치유에 쓸 수 있는 내면의 자원이 비로소 열립니다. 이 카드는 지금 당신이 아픔 앞에서 너무 이른 괜찮음을 연기하고 있지는 않은지를 묻습니다. "충분히 힘들었다"고 인정하는 것은 포기가 아닙니다. 그것은 자기 자신에게 가장 솔직하고 용감한 선물입니다. 오늘 5분만 시간을 내어 지금 가장 힘든 감정을 짧은 문장으로 적어보세요. "나는 지금 ___이 너무 힘들다. 왜냐하면 ___." 이 두 문장을 완성하는 것만으로도 감정의 무게가 가벼워지는 것을 느낄 수 있습니다.`
    : "";

  const silverLining = c3
    ? `세 번째 카드 ${coachLabel(c3)}가 "숨겨진 빛" 자리에서 말을 건넵니다. 이 카드는 고통스러운 경험이 단순한 상처로만 끝나지 않는다는 가능성을 보여줍니다. ${safeMeaning(c3, "지금의 경험은 당신의 약점을 증명하는 사건이 아니라, 더 건강한 선택 기준을 만드는 훈련입니다.")} 심리치료에서 포스트트라우마 성장(Post-Traumatic Growth)이라는 개념이 있습니다. 고통스러운 경험을 통과한 사람 중 일부는 오히려 이전보다 더 깊은 자기 이해, 더 강한 경계, 더 진실한 관계를 만들어낸다는 연구 결과입니다. 이 카드가 이 자리에 나온 것은 당신에게 그 가능성이 있음을 상징적으로 보여주는 것입니다. 중요한 것은 "이 경험에서 억지로 긍정적 의미를 찾으라"는 것이 아닙니다. 그것은 오히려 감정을 억압합니다. 대신 충분히 아파한 다음, "이 경험이 나에게 앞으로 무엇을 더 소중히 여기게 만들었는가"를 천천히 물어보는 것이 포인트입니다. 타로 마스터는 이 카드를 볼 때 반드시 묻습니다. "이 경험을 통해 당신이 앞으로 절대 타협하지 않겠다고 결심한 경계는 무엇입니까?" 그 답, 즉 당신만의 새로운 삶의 기준이 이 상처 속에서 태어나고 있습니다.`
    : "";

  const stepForward = c4
    ? `네 번째 카드 ${coachLabel(c4)}가 "앞으로 나아가기" 자리에서 당신에게 구체적인 방향을 제시합니다. ${safeMeaning(c4, "큰 결심보다 작은 실행의 반복이 정서 안정과 자존감 회복에 훨씬 더 효과적입니다.")} 타로 상담에서 가장 자주 받는 질문이 있습니다. "언제쯤 괜찮아질 수 있을까요?" 저는 항상 이렇게 답합니다. "완전히 회복된 다음 행동하려 기다리면 그 순간은 오지 않습니다. 작은 행동 하나가 감정을 바꾸고, 그 변화가 다음 행동을 가능하게 하는 겁니다." 신경과학적으로도 이것은 사실입니다. 행동은 뇌의 보상 회로를 활성화시켜 도파민을 분비시키고, 그 작은 성공의 경험이 자기효능감과 다음 도전의 동기를 만들어냅니다. 이 카드가 제시하는 방향으로 오늘 딱 한 걸음만 내딛으세요. 걸음의 크기는 중요하지 않습니다. 실제로 움직이는 것이 중요합니다. 그리고 이 걸음을 내딛을 때 스스로에게 이렇게 말해주세요. "나는 지금 어려운 상황 속에서도 나를 위한 선택을 하고 있다." 이 말이 처음엔 어색하게 느껴져도 괜찮습니다. 반복하다 보면 당신 내면의 언어가 달라지기 시작할 것입니다.`
    : "";

  const actionPlan = [
    groundingNeeded
      ? "지금 당장 중요한 결정을 내리지 마세요. 먼저 신경계를 안정화하는 것이 우선입니다. 4초 들숨 — 7초 참기 — 8초 날숨 패턴을 3회 반복하세요. 이 호흡법은 부교감신경을 즉시 자극해 5~10분 내에 심박수와 코르티솔 수치를 낮춥니다. 그다음 찬물 한 잔을 천천히 마시며 발바닥이 바닥에 닿는 감각에 집중하세요. 몸이 안정되어야 생각도 맑아집니다."
      : "오늘 가장 부담이 적고 15분 안에 실행 가능한 행동 한 가지를 지금 바로 정하세요. 단, '좋은 일을 하겠다'가 아니라 '오전 10시에 책상 앞에 앉아 일기 한 단락을 쓴다'처럼 시간·장소·행동이 구체적이어야 합니다. 실행 의도가 구체적일수록 실제로 행동할 확률이 2~3배 높아진다는 연구가 있습니다.",
    "오늘 밤 잠들기 30분 전, 3줄 감정 일기를 써보세요. ① 오늘 가장 강하게 느낀 감정 한 단어. ② 그 감정을 만들어낸 사건 한 문장. ③ 그 사건 앞에서 내 몸이 어떻게 반응했는지(예: 가슴이 답답해졌다, 눈물이 났다). 이 3줄 루틴을 2주만 지속하면 자신의 감정 트리거 패턴이 선명하게 보이기 시작합니다. 자기 패턴이 보이는 순간, 더 이상 감정에 휩쓸리지 않고 한 박자 늦게 선택할 수 있게 됩니다.",
    "내일 할 회복 행동 하나를 오늘 밤 자기 전에 적어두되, 반드시 '언제 + 어디서 + 무엇을' 형식으로 쓰세요. 예: '내일 오전 7시 30분, 현관 앞에서 운동화 신고 10분 걷기.' 이것을 심리학에서는 실행 의도(Implementation Intention)라고 부릅니다. 막연한 결심보다 실행 확률이 최대 300% 높아집니다. 메모 앱이나 포스트잇에 붙여두세요.",
    "오늘 하루 자기비난의 순간을 포착하는 연습을 해보세요. '나는 왜 이럴까', '나만 이렇게 못났어' 같은 생각이 올라오면 즉시 멈추고 같은 문장을 친한 친구에게 하듯 바꿔 말하세요. '나는 지금 정말 어려운 시간을 지나고 있고, 그럼에도 계속 시도하고 있다.' 이 언어 전환을 하루 3회만 실천해도 2주 후에는 자기비난 빈도가 줄어들고 내면의 안정감이 달라집니다. 자기 자신에게도 친구에게 하는 말의 언어를 사용할 자격이 있습니다.",
  ];

  const positionInsights = cardReadings.map((card) => {
    const posTitleMap = {
      hidden_truth: "The Hidden Truth",
      embrace_pain: "Embrace the Pain",
      silver_lining: "The Silver Lining",
      step_forward: "Step Forward",
    };
    return {
      position: card.position,
      title: posTitleMap[card.position] || card.position,
      cardLabel: `${card.nameKr}${card.orientation === "reversed" ? "(역)" : ""}`,
      message: card.interpretation || "이 위치의 메시지를 천천히 곱씹어 보세요.",
      keywords: Array.isArray(card.keywords) ? card.keywords.slice(0, 4) : [],
    };
  });

  const integrationMessage = `오늘 네 장의 카드가 함께 전하는 통합 메시지를 들어드리겠습니다. 당신은 무너진 것이 아닙니다. 더 깊고 진실한 자신으로 재정렬되고 있는 과정 중에 있습니다. 경험 많은 타로 마스터는 이런 배열을 마주할 때 이렇게 읽습니다. "이 사람은 자신의 내면을 외면하지 않는 용기가 있다. 감정을 느끼고 그 감정 앞에 머무를 수 있는 능력이 있다. 이것이 이미 치유 능력이 살아있다는 가장 강력한 증거다." 회복은 직선이 아닙니다. 어떤 날은 나아간 것 같다가 어떤 날은 원점으로 돌아온 것처럼 느껴집니다. 그것은 실패가 아닙니다. 나선형으로 성장하는 감정 치유의 정상적인 궤적입니다. 한 가지 만 기억해주세요. 오늘 이 리딩을 선택하고, 자신의 마음을 들여다보기 위해 이 시간을 낸 것 자체가 이미 당신이 자신을 포기하지 않았다는 뜻입니다. 그 작은 선택이 쌓여, 6개월 후 당신은 지금보다 훨씬 더 자신을 이해하고 사랑하는 사람이 되어 있을 것입니다. 카드는 언제나 당신 편입니다. 천천히 가도 괜찮습니다.`;

  const promptEngineering = {
    system:
      "You are a professional psychological counselor persona. Use a warm, validating, non-judgmental tone. Frame each tarot message with emotional validation, pattern awareness, and practical behavior coaching. Avoid fatalism and avoid diagnosing. Focus on agency and small actionable steps.",
    userTemplate:
      "Spread: Healing Rising 4 cards. 1) Hidden Truth 2) Embrace Pain 3) Silver Lining 4) Step Forward. Provide Korean counseling-style guidance with realistic, concrete next actions.",
  };

  return {
    spreadType: "healing_rising_four_card",
    category: "healing",
    cardReadings,
    reading: {
      opening,
      hiddenTruth,
      embracePain,
      silverLining,
      stepForward,
      integrationMessage,
      positionInsights,
      actionPlan,
      promptEngineering,
    },
  };
}

function createReunionLighthouseReading({ drawnCards }) {
  if (!Array.isArray(drawnCards) || drawnCards.length !== 5) {
    throw new Error("재회운 리딩에는 5장의 카드가 필요합니다.");
  }

  const lookup = buildCardLookup();
  const cardReadings = drawnCards.map((picked) => {
    const card = lookup.get(picked.cardId);
    if (!card) throw new Error(`카드 ID를 찾을 수 없습니다: ${picked.cardId}`);
    const interpretation = selectInterpretation(card, picked.orientation, "love");
    const keywords =
      picked.orientation === "upright"
        ? card.keywords?.upright || []
        : card.keywords?.reversed || [];
    const { imageUrl, imageCandidates, proxyImageUrl, localImageUrl } = buildTarotImageSources(card.name, card.id);
    return {
      ...picked,
      name: card.name,
      nameKr: card.nameKr || card.name,
      interpretation,
      keywords: Array.isArray(keywords) ? keywords : [],
      suit: card.suit,
      arcanaType: card.arcanaType,
      imageUrl,
      imageCandidates,
      proxyImageUrl,
      localImageUrl,
    };
  });

  const byPos = {};
  cardReadings.forEach((r) => {
    byPos[r.position] = r;
  });

  const c1 = byPos.past_bond;
  const c2 = byPos.their_now;
  const c3 = byPos.outside_factor;
  const c4 = byPos.their_heart;
  const c5 = byPos.reunion_outcome;

  const majorCount = cardReadings.filter((r) => r.arcanaType === "Major").length;
  const reversedCount = cardReadings.filter((r) => r.orientation === "reversed").length;
  const hopefulSignal = c4?.orientation === "upright" || c5?.orientation === "upright";

  const opening = `깊은 밤바다 위를 비추는 등대처럼, 이번 5카드 리딩은 당신의 그리움을 부정하지 않으면서도 길을 잃지 않게 돕는 안내서입니다. ${
    majorCount >= 2
      ? "운명적 전환의 에너지가 강하게 감지되어 감정의 결이 깊습니다."
      : "일상적 선택과 소통의 변화로도 흐름을 충분히 바꿀 수 있는 구간입니다."
  } 지금 필요한 것은 조급한 확답이 아니라, 마음의 진실과 현실의 간격을 동시에 보는 시선입니다.`;

  const pastBond = c1 ? `${cardLabel(c1)} 카드가 과거 인연 자리에서 말하는 메시지는, ${buildReunionPositionMeaning(c1, "past_bond")}` : "";

  const theirNow = c2 ? `${cardLabel(c2)} 카드가 현재 근황 자리에서 말하는 메시지는, ${buildReunionPositionMeaning(c2, "their_now")}` : "";

  const outsideFactor = c3 ? `${cardLabel(c3)} 카드가 방해물/상황 자리에서 말하는 메시지는, ${buildReunionPositionMeaning(c3, "outside_factor")}` : "";

  const theirHeart = c4 ? `${cardLabel(c4)} 카드가 속마음 자리에서 말하는 메시지는, ${buildReunionPositionMeaning(c4, "their_heart")}` : "";

  const reunionOutcome = c5 ? `${cardLabel(c5)} 카드가 재회 결과 자리에서 말하는 메시지는, ${buildReunionPositionMeaning(c5, "reunion_outcome")}` : "";

  const lighthouseGuidance = hopefulSignal
    ? `등대의 빛은 아직 유효합니다. 특히 결과 카드(${cardLabel(c5)})가 보여준 흐름상, 감정 확인보다 신뢰 회복 순서(사실 확인 → 짧은 소통 → 일관성 점검)로 접근할 때 재회 가능성이 현실화되기 쉽습니다.`
    : `지금은 파도가 높은 구간입니다. 결과 카드(${cardLabel(c5)}) 기준으로는 속도를 늦추고 자기 회복을 우선할수록 향후 선택의 질이 높아집니다. 재회 여부를 서두르기보다 관계 패턴을 먼저 바로잡아 주세요.`;

  const actionPlan = [
    "메시지를 보내기 전, 내가 전하고 싶은 핵심을 2문장으로 정리하세요. 감정 폭발이 아닌 명료한 진심이 중요합니다.",
    "상대의 반응 속도를 존중하며, 확인되지 않은 추측으로 후속 메시지를 연달아 보내지 마세요.",
    "재회를 원한다면 과거의 문제를 한 문장으로 정의하고, 같은 패턴을 바꾸기 위한 내 실천 1가지를 먼저 시작하세요.",
    "오늘 밤에는 관계의 결과보다 내 마음의 안정을 우선하세요. 안정된 마음이 가장 정확한 선택을 만듭니다.",
  ];

  const positionInsights = [
    {
      key: "past_bond",
      title: "1) 과거의 인연",
      card: c1,
    },
    {
      key: "their_now",
      title: "2) 상대방의 현재 근황",
      card: c2,
    },
    {
      key: "outside_factor",
      title: "3) 주변의 방해물 또는 상황",
      card: c3,
    },
    {
      key: "their_heart",
      title: "4) 나를 향한 속마음",
      card: c4,
    },
    {
      key: "reunion_outcome",
      title: "5) 재회의 가능성과 결과",
      card: c5,
    },
  ].map((item) => ({
    position: item.key,
    title: item.title,
    cardLabel: item.card ? cardLabel(item.card) : "",
    message: item.card
      ? relationshipMeaning(item.card, "이 포지션은 감정과 현실을 함께 보라는 신호를 담고 있습니다.")
      : "",
    keywords: Array.isArray(item.card?.keywords) ? item.card.keywords.slice(0, 4) : [],
  }));

  const promptEngineering = {
    system:
      "You are a compassionate reunion tarot master and emotional guide. Validate longing without giving false hope. Build one connected narrative from 5 cards: past bond, their current life, outside factors, their hidden feelings, reunion potential/outcome. Tone: warm, poetic, and grounded like a lighthouse in a dark sea. Offer practical, non-manipulative next steps. Avoid fatalism.",
    userTemplate:
      "Spread: Is our connection over? Reunion 5-card lighthouse spread.\n1) Past Bond\n2) Their Current Life\n3) Outside Factors / Interference\n4) Their Feelings Toward Me\n5) Reunion Potential & Outcome\nCards: {{cards}}\nOutput in Korean with empathy, realistic guidance, and a healing closure.",
  };

  return {
    spreadType: "reunion_lighthouse_five_card",
    category: "reunion",
    cardReadings,
    reading: {
      opening,
      pastBond,
      theirNow,
      outsideFactor,
      theirHeart,
      reunionOutcome,
      lighthouseGuidance,
      positionInsights,
      actionPlan,
      promptEngineering,
      meta: {
        majorCount,
        reversedCount,
        hopefulSignal,
      },
    },
  };
}

function createSelfEsteemLevelupReading({ drawnCards }) {
  if (!Array.isArray(drawnCards) || drawnCards.length !== 5) {
    throw new Error("자존감 레벨업 리딩에는 5장의 카드가 필요합니다.");
  }

  const lookup = buildCardLookup();
  const cardReadings = drawnCards.map((picked) => {
    const card = lookup.get(picked.cardId);
    if (!card) throw new Error(`카드 ID를 찾을 수 없습니다: ${picked.cardId}`);
    const interpretation = selectInterpretation(card, picked.orientation, "general");
    const keywords =
      picked.orientation === "upright"
        ? card.keywords?.upright || []
        : card.keywords?.reversed || [];
    const { imageUrl, imageCandidates, proxyImageUrl, localImageUrl } = buildTarotImageSources(card.name, card.id);
    return {
      ...picked,
      name: card.name,
      nameKr: card.nameKr || card.name,
      interpretation,
      keywords: Array.isArray(keywords) ? keywords : [],
      suit: card.suit,
      arcanaType: card.arcanaType,
      imageUrl,
      imageCandidates,
      proxyImageUrl,
      localImageUrl,
    };
  });

  const byPos = {};
  cardReadings.forEach((r) => {
    byPos[r.position] = r;
  });

  const c1 = byPos.past_debuff;
  const c2 = byPos.inner_monster;
  const c3 = byPos.current_damage;
  const c4 = byPos.mind_shield;
  const c5 = byPos.levelup_mastery;

  const majorCount = cardReadings.filter((r) => r.arcanaType === "Major").length;
  const reversedCount = cardReadings.filter((r) => r.orientation === "reversed").length;
  const hopefulSignal = c4?.orientation === "upright" || c5?.orientation === "upright";

  const opening = `타로로 성장하는 자존감! 이번 리딩은 단순 운세가 아니라, 상담 장면처럼 감정 패턴을 구조적으로 해석하는 5단계 코칭 리딩입니다. ${
    majorCount >= 2
      ? "메이저 아르카나가 다수 등장해 현재가 인생의 전환 구간임을 강하게 시사합니다."
      : "현실에서 바로 적용할 수 있는 행동 단위의 조언이 핵심으로 제시됩니다."
  } 어두운 터널을 지나 빛을 만나는 여정처럼, 이번 5장은 '원인 진단 → 감정 정리 → 경계 회복 → 자기존중 정착'의 로드맵을 제공합니다.`;

  const counselorToneByPos = {
    past_debuff:
      "과거의 그 반응은 당신의 결함이 아니라 당시의 생존 전략이었어요. 이제는 그 전략을 존중하되, 현재의 나에게 맞는 방식으로 바꿀 수 있는 시점입니다.",
    inner_monster:
      "거절 불안은 대개 관계가 끊어질까 봐의 공포와 연결돼요. 이 감정을 부정하지 않고 이름 붙이는 순간, 통제 가능한 정보로 바뀝니다.",
    current_damage:
      "먼저 회복할 권리를 인정하는 것이 중요해요. 에너지가 돌아와야 경계 설정도 오래 유지됩니다.",
    mind_shield:
      "타인의 감정과 내 책임을 분리하는 연습이 필요해요. 설명은 하되, 나를 소진시키는 과잉 설득은 멈추는 것이 좋습니다.",
    levelup_mastery:
      "자존감은 한 번에 완성되는 게 아니라, 작은 선택을 반복하는 습관으로 안정됩니다.",
  };
  const orientationToneByPos = (item) =>
    item.orientation === "reversed"
      ? "지금은 속도를 늦추고 경계를 재정비하는 편이 좋습니다."
      : "지금 흐름을 일상 루틴에 연결하면 회복 속도가 빨라집니다.";
  const professionalPositionMessage = (item, key) => {
    if (!item) return "";
    const base = item.interpretation || "이 카드가 전하는 핵심 신호를 천천히 받아들이세요.";
    const tone = counselorToneByPos[key] || "작은 실천을 통해 변화는 충분히 가능합니다.";
    const orientationTone = orientationToneByPos(item);
    if (key === "past_debuff")
      return `당신이 남의 눈치를 살피게 된 이유는 ${base} ${tone} ${orientationTone}`;
    if (key === "inner_monster")
      return `거절을 어려워하게 된 이유는 ${base} ${tone} ${orientationTone}`;
    if (key === "current_damage")
      return `눈치 보는 습관이 지금 당신에게 주는 피해는 ${base} ${tone} ${orientationTone}`;
    if (key === "mind_shield")
      return `타인의 실망을 견뎌내는 방법은 ${base} ${tone} ${orientationTone}`;
    if (key === "levelup_mastery")
      return `내 마음을 1순위로 챙기는 방법은 ${base} ${tone} ${orientationTone}`;
    return `${cardLabel(item)}는 ${base} ${tone} ${orientationTone}`;
  };

  const pastDebuff = c1 ? professionalPositionMessage(c1, "past_debuff") : "";
  const innerMonster = c2 ? professionalPositionMessage(c2, "inner_monster") : "";
  const currentDamage = c3 ? professionalPositionMessage(c3, "current_damage") : "";
  const mindShield = c4 ? professionalPositionMessage(c4, "mind_shield") : "";
  const levelupMastery = c5 ? professionalPositionMessage(c5, "levelup_mastery") : "";

  const levelupGuidance = hopefulSignal
    ? "✨ Level Up! 5장의 카드를 모두 열었습니다. 당신의 자존감은 이미 한 단계 올라갔어요. 이제 이 통찰을 실천으로 옮겨, 매일 작은 레벨업을 누적해 보세요."
    : "5장의 카드가 당신의 성장 지도를 그려냈습니다. 지금은 휴식과 회복이 우선이에요. 천천히, 한 걸음씩 나아가면 반드시 빛을 만날 수 있습니다.";

  const actionPlan = [
    "오늘 단 한 번, 설명은 하되 과잉 해명은 멈추는 경계 문장을 사용해 보세요. 예: '지금은 어렵습니다. 내일 다시 답드릴게요.'",
    "잠들기 전 3분 동안 '오늘 내가 나를 지킨 장면'을 1가지 기록하세요. 자존감은 기록된 증거를 먹고 자랍니다.",
    "불편한 부탁을 받았을 때 즉답 대신 '생각해 보고 답할게요'를 먼저 말해 결정권을 회복하세요.",
    "감정이 흔들리는 날에는 해결보다 안정이 우선입니다. 호흡 10회 + 물 한 잔 + 자리 이동을 루틴으로 고정하세요.",
    "이번 리딩의 핵심 카드 1장을 휴대폰 메모 첫 줄에 저장하고, 하루 2회 읽으며 행동 기준을 리마인드하세요.",
  ];

  const positionInsights = [
    { key: "past_debuff", title: "1. 과거의 디버프 확인", subtitle: "내가 타인의 시선에 갇혀있던 진짜 이유", card: c1 },
    { key: "inner_monster", title: "2. 극복해야 할 내면의 몬스터", subtitle: "왜 나는 거절을 두려워했을까?", card: c2 },
    { key: "current_damage", title: "3. 현재 입고 있는 데미지", subtitle: "눈치 보는 습관이 깎아먹은 HP와 MP", card: c3 },
    { key: "mind_shield", title: "4. 마인드 쉴드 획득!", subtitle: "타인의 실망을 가볍게 튕겨내는 방어 스킬", card: c4 },
    { key: "levelup_mastery", title: "5. 레벨업 마스터리", subtitle: "내 마음을 1순위로 챙기는 최종 보상 및 각성", card: c5 },
  ].map((item) => ({
    position: item.key,
    title: item.title,
    subtitle: item.subtitle,
    cardLabel: item.card ? cardLabel(item.card) : "",
    message: item.card ? professionalPositionMessage(item.card, item.key) : "",
    keywords: Array.isArray(item.card?.keywords) ? item.card.keywords.slice(0, 4) : [],
  }));

  return {
    spreadType: "self_esteem_levelup_five_card",
    category: "general",
    cardReadings,
    reading: {
      opening,
      pastDebuff,
      innerMonster,
      currentDamage,
      mindShield,
      levelupMastery,
      levelupGuidance,
      positionInsights,
      actionPlan,
      meta: {
        majorCount,
        reversedCount,
        hopefulSignal,
      },
    },
  };
}

// ─── 12지신 월별 고유 운세 콘텐츠 (각 달마다 독립적 내용 보장) ───
const ZODIAC_FORTUNE_DETAIL = {
  1: {
    flow_base: "쥐의 영리함과 빠른 판단력이 새해의 문을 여는 달입니다. 연초의 에너지를 활용해 올 한 해의 핵심 방향을 설정하는 것이 중요합니다. 이달에 내린 결정이 나머지 11개월의 흐름을 좌우할 수 있으니, 큰 그림을 먼저 그리되 작은 실행부터 시작하세요. 새해의 설렘과 기대감을 현실적 계획으로 연결하는 지혜가 필요합니다.",
    money_base: "쥐띠의 풍요 기운이 새해 첫 달의 재물 흐름을 돕습니다. 연초 예산 계획을 꼼꼼히 세우고, 충동적 소비보다 목적 있는 지출에 집중하면 연간 재정 목표를 달성하기 좋습니다. 새해 다짐을 재정 루틴으로 구체화하세요.",
    love_base: "새해의 설렘과 쥐의 사교성이 만나는 달입니다. 오래 유지된 관계라면 새로운 활력을 불어넣을 소소한 이벤트가 좋고, 솔로라면 새해 첫 달의 신선한 에너지가 새 인연의 씨앗이 될 수 있습니다. 표현을 아끼지 말고 먼저 다가가세요.",
    relationship_base: "새해 인맥을 정리하고 진짜 소중한 사람에게 시간을 투자하세요. 쥐의 사교 에너지로 오랜 인연에게 연락하면 뜻밖의 연대와 기회가 생길 수 있습니다. 먼저 안부를 물어보는 작은 행동이 큰 관계를 만들어줍니다.",
  },
  2: {
    flow_base: "소의 묵묵한 인내와 우직함이 이달의 기반을 이룹니다. 눈에 띄는 성과가 없더라도 꾸준히 쌓아온 것들이 곧 자라납니다. 조급해하지 말고 정갈하게 기초를 다지는 것이 이달의 핵심 전략입니다. 겨울과 봄이 교차하는 이 시기, 안에서 단단해지는 준비가 필요합니다.",
    money_base: "소의 근면 기운으로 이달은 '벌기'보다 '지키기'에 강점이 있습니다. 단기 수익을 쫓기보다 장기 자산을 다지는 리밸런싱이 더 유리합니다. 재무 점검과 불필요한 구독·지출 정리를 권장하는 달입니다.",
    love_base: "소처럼 천천히, 하지만 깊고 신뢰 있게 관계를 쌓아가는 달입니다. 화려한 이벤트보다 약속을 구체적으로 지키는 성실함이 마음의 온도를 높입니다. 작은 약속을 꾸준히 지키는 것이 가장 강력한 사랑의 언어입니다.",
    relationship_base: "주변 사람들과의 관계에서 입보다 귀를 먼저 열어보세요. 소의 우직함으로 불필요한 말을 줄이고 경청하면, 신뢰를 쌓는 속도가 눈에 띄게 빨라집니다.",
  },
  3: {
    flow_base: "호랑이의 기운이 정점에 오르는 봄의 시작 달입니다. 용감한 첫 걸음을 내딛기에 가장 좋은 타이밍이며, 겨울 동안 미뤄온 계획을 실행으로 옮길 때입니다. 다소 무모해 보여도 시작 자체가 에너지와 흐름을 만들어냅니다. 봄의 문을 여는 용감한 행동이 이달을 지배합니다.",
    money_base: "호랑이의 추진력이 새로운 수입원을 열 수 있습니다. 준비된 투자 혹은 부업 시작에 좋은 타이밍이지만, 과감함과 무모함을 구분하는 것이 중요합니다. 리스크 허용 한도를 정한 뒤 실행으로 옮기세요.",
    love_base: "호랑이처럼 먼저 다가가는 용기가 이달의 연애 키워드입니다. 마음이 있다면 기다리지 말고 표현하세요. 타이밍을 놓친 감정은 회복하는 데 더 많은 에너지가 드는 법입니다.",
    relationship_base: "리더십을 발휘할 기회가 생기는 달입니다. 집단 내에서 먼저 의견을 내고 주도하면 주변의 신뢰를 쌓을 수 있습니다. 다만 독단적 결정은 반발을 낳을 수 있으니 소통을 병행하는 것이 중요합니다.",
  },
  4: {
    flow_base: "토끼의 직관과 예민한 감수성이 이달을 감쌉니다. 꽃이 피듯 조금씩, 그러나 분명하게 성장하는 시기입니다. 억지로 서두르기보다 자연스러운 흐름을 따르면 기회가 저절로 찾아옵니다. 봄꽃이 만개하는 이 달은 부드럽고 섬세한 에너지가 강점입니다.",
    money_base: "토끼의 섬세함이 재물 관리에 도움이 됩니다. 꼼꼼한 지출 기록과 소소한 절약이 모여 큰 차이를 만드는 달입니다. 충동구매 전 24시간 숙고 룰을 적용해 보세요.",
    love_base: "봄의 에너지와 토끼의 감수성이 만나 설렘이 충만한 달입니다. 감정을 솔직하게 표현하는 능력이 이달 연애의 최강 무기입니다. 말 한마디가 관계를 크게 바꿀 수 있는 시기입니다.",
    relationship_base: "평화를 중요시하는 토끼의 기운으로 갈등을 부드럽게 해결하는 능력이 빛나는 달입니다. 직접 충돌보다 우회적 대화로 오해를 풀면 관계가 더 단단해집니다.",
  },
  5: {
    flow_base: "용의 강력한 비상 에너지가 가득한 달입니다. 큰 도전과 야망을 품기에 최고의 타이밍이며, 올해 가장 강한 흐름이 이 달을 통과합니다. 두려워하지 말고 자신이 원하는 것을 크게 선언하고 움직이세요. 봄의 절정에 용의 에너지가 더해져 하늘 높이 비상하는 달입니다.",
    money_base: "용의 기운이 큰 재물 흐름을 만들 수 있는 달입니다. 고수익 기회가 올 수 있지만 검증 없이 뛰어드는 것은 금물입니다. 확인된 정보 기반으로 결단하면 좋은 결과가 기대됩니다.",
    love_base: "용의 화려함과 열정이 연애에 투영되는 달입니다. 표현을 아끼지 마세요. 솔로라면 적극적인 움직임이 새 인연을 데려오고, 연인이 있다면 함께 해보고 싶은 것들의 목록을 만들어보세요.",
    relationship_base: "용의 카리스마로 주변에 강한 인상을 남기는 달입니다. 중요한 프레젠테이션, 면접, 협상이 있다면 이달의 에너지를 십분 활용하세요. 두드림이 곧 결과로 이어집니다.",
  },
  6: {
    flow_base: "뱀의 신중하고 전략적인 지성이 지배하는 달입니다. 섣불리 드러내기보다 조용히 관찰하며 정보를 모으는 것이 현명합니다. 내면의 직관을 믿고 겉으로 보이는 것에만 반응하지 마세요. 여름으로 넘어가는 이 달, 깊어지는 지혜가 가장 강력한 힘입니다.",
    money_base: "뱀의 지혜로운 관찰력이 재테크에 도움이 됩니다. 숨겨진 수익 구조나 정보를 파악하는 날카로운 시선이 빛나는 달이지만, 음지의 거래나 불분명한 계약은 피하세요.",
    love_base: "뱀의 매력과 신비로움이 연애에서 발휘되는 달입니다. 모든 것을 드러내지 않는 적당한 신비로움이 상대의 호기심을 자극합니다. 깊이 있는 대화가 감정의 온도를 높이는 시기입니다.",
    relationship_base: "뱀의 침묵이 때로는 강렬한 메시지가 되는 달입니다. 직접적 표현보다 행동으로 신뢰를 쌓는 것이 효과적입니다. 정보와 소문에 휘둘리지 말고 직접 확인을 원칙으로 하세요.",
  },
  7: {
    flow_base: "말의 활력과 자유로운 추진력이 넘치는 한여름입니다. 멈춰있던 일들이 드디어 움직이기 시작하고, 에너지가 최고조에 이르는 시기입니다. 방향만 잡히면 빠른 실행이 가장 강력한 전략입니다. 자유를 향해 달리는 말처럼 이달은 주저 없이 나아가세요.",
    money_base: "말의 빠른 움직임으로 단기 현금흐름이 활발해질 수 있습니다. 재화의 순환이 빨라지는 시기라 수입과 지출이 함께 늘어날 수 있으니 균형 관리가 핵심입니다.",
    love_base: "말의 자유롭고 뜨거운 에너지가 연애에 생기를 줍니다. 여름의 열기처럼 감정 표현이 풍부해지는 달이라, 이 에너지를 잘 활용하면 관계의 밀도가 높아집니다.",
    relationship_base: "여름의 활기와 말의 사교성이 만나 모임·이벤트·네트워크 확장에 최고인 달입니다. 낯선 사람과의 대화도 두려워하지 말고, 다양한 자리에 몸을 던져보세요.",
  },
  8: {
    flow_base: "양의 온화하고 예술적인 기운이 이달을 지배합니다. 효율보다 질감, 속도보다 깊이가 더 중요한 시기입니다. 자신이 진짜로 좋아하는 것에 시간을 투자하면 마음도 에너지도 충전됩니다. 여름이 무르익는 이 달, 아름다움과 조화를 추구하세요.",
    money_base: "양의 기운으로 창의적 수익이나 취미 기반 부수입이 가능한 달입니다. 자신의 감수성과 예술적 재능을 콘텐츠 혹은 서비스로 연결해 보세요. 소비는 '경험' 중심으로 선택하면 만족도가 높아집니다.",
    love_base: "양의 온화하고 배려 깊은 에너지가 관계를 따뜻하게 만드는 달입니다. 화려한 표현보다 섬세한 배려가 감동을 줍니다. 상대가 좋아하는 것을 기억하고 실천하는 것이 이달의 최고 연애 전략입니다.",
    relationship_base: "양의 조화 에너지로 갈등이 줄어들고 팀워크가 높아지는 달입니다. 창의적 협업이나 공동 프로젝트에 참여하면 뜻밖의 연대가 만들어집니다.",
  },
  9: {
    flow_base: "원숭이의 재치와 임기응변 능력이 빛나는 가을 첫 달입니다. 상황이 복잡해도 유연하게 돌파구를 찾는 능력이 이달의 최강 무기입니다. 계획보다 현장 판단이 더 중요한 시기일 수 있습니다. 가을이 시작되는 이 달, 영리하게 환경 변화에 적응하세요.",
    money_base: "원숭이의 다재다능함으로 여러 수입원을 동시에 시도해 볼 수 있습니다. 단, 너무 분산되면 집중력이 흐려지니 핵심 2~3가지에 에너지를 몰아주세요.",
    love_base: "원숭이의 재치와 유머가 연애의 활력소가 되는 달입니다. 상대를 웃게 만드는 능력이 관계의 온도를 높입니다. 진지함만큼 가벼운 장난기도 사랑의 언어가 되는 달입니다.",
    relationship_base: "원숭이의 유연성으로 다양한 성격의 사람들과 잘 어울리는 달입니다. 사교의 폭을 넓히되 진심 없이 다가가면 역효과가 나니, 진정성 있는 관계에 집중하세요.",
  },
  10: {
    flow_base: "닭의 결단력과 통찰력이 이달 흐름의 핵심입니다. 수확의 계절처럼, 그동안 쌓아온 것들을 점검하고 결실을 확인하는 시기입니다. 완성되지 않은 것들을 정리하고 핵심에 집중하세요. 가을이 깊어지는 이 달, 수확의 기쁨을 확인하는 시간입니다.",
    money_base: "수확의 달답게 그동안의 노력이 재물로 연결될 수 있는 시기입니다. 연말을 앞두고 재정 목표 달성률을 점검하고, 세금·정산·구독 서비스 정리 등 연말 준비를 시작하세요.",
    love_base: "닭의 화려함과 결단력이 연애에서도 발휘됩니다. 애매한 관계는 명확히 정리하고, 진심이 있다면 더 이상 망설이지 말고 솔직히 표현하세요. 흐릿한 관계를 정리하면 진짜 인연이 들어올 공간이 생깁니다.",
    relationship_base: "닭의 통찰력으로 주변 관계를 냉철하게 점검하는 달입니다. 진심으로 내 편인 사람과 그렇지 않은 사람을 구별하고, 두터운 신뢰를 쌓을 관계에 에너지를 집중하세요.",
  },
  11: {
    flow_base: "개의 충직함과 책임감이 이달의 에너지를 이끕니다. 시작했던 일들을 성실하게 마무리하는 것이 최우선이며, 약속과 의무를 소홀히 하지 않는 태도가 신뢰를 만듭니다. 가을이 마무리되는 이 달, 충직함으로 주변을 지키세요.",
    money_base: "연말을 앞두고 지출 마무리와 내년 예산 기초 설계가 필요한 달입니다. 개의 꼼꼼한 책임감으로 미처리 비용, 미청구 수입을 정리하면 연말 재정이 훨씬 깔끔해집니다.",
    love_base: "개의 충성스러운 에너지가 장기 관계의 신뢰를 더욱 굳건히 만듭니다. 파트너에 대한 감사함을 표현하는 것을 미루지 마세요. 솔로라면 진지하고 안정적인 사람에게 끌리는 시기입니다.",
    relationship_base: "개의 보호 본능과 책임감이 소중한 사람들 곁을 지키게 합니다. 힘든 사람 옆에 조용히 있어 주는 것만으로도 큰 위로가 되는 달입니다.",
  },
  12: {
    flow_base: "돼지의 여유롭고 풍요로운 기운으로 한 해를 마무리하는 달입니다. 이루지 못한 것에 집착하기보다, 이뤄낸 것들을 되새기며 감사하는 마음을 갖는 것이 내년의 복을 부릅니다. 한 해의 마지막을 풍요롭게 마무리하세요.",
    money_base: "연말 보너스, 정산, 선물비 등이 집중되는 달입니다. 돼지의 행운이 도와주지만 무분별한 소비는 금물. 올해 재정 목표를 최종 점검하고 내년 예산의 큰 그림을 그려두세요.",
    love_base: "돼지의 따뜻하고 여유로운 에너지가 연말 연애에 행복감을 더해줍니다. 연인이 있다면 한 해를 마무리하는 특별한 시간을 계획하고, 솔로라면 연말 모임이 새 인연의 문을 열어줄 수 있습니다.",
    relationship_base: "한 해 동안 함께한 사람들에게 감사함을 전하는 달입니다. 돼지의 넉넉한 기운으로 한 해 동안의 오해나 서운함을 털어내고 새해를 깨끗하게 시작할 준비를 하세요.",
  },
};

// ─── 12지신 3카드 1년 운세 (Cross-over Tarot Master) ───
const ZODIAC_MONTHLY = [
  { emoji: "🐭", name: "쥐", traits: "지혜, 시작, 풍요" },
  { emoji: "🐮", name: "소", traits: "근면, 우직함, 안정" },
  { emoji: "🐅", name: "호랑이", traits: "용기, 변화, 리더십" },
  { emoji: "🐇", name: "토끼", traits: "성장, 평화, 직관" },
  { emoji: "🐉", name: "용", traits: "비상, 큰 성취, 열정" },
  { emoji: "🐍", name: "뱀", traits: "지성, 매력, 비밀" },
  { emoji: "🐴", name: "말", traits: "활동력, 자유, 추진력" },
  { emoji: "🐐", name: "양", traits: "예술성, 온화함, 조화" },
  { emoji: "🐒", name: "원숭이", traits: "재치, 임기응변, 다재다능" },
  { emoji: "🐓", name: "닭", traits: "결단력, 통찰, 화려함" },
  { emoji: "🐕", name: "개", traits: "충직함, 책임감, 보호" },
  { emoji: "🐷", name: "돼지", traits: "여유, 행운, 마무리" },
];

function createYearlyFromThreeCardReading({ drawnCards }) {
  if (!Array.isArray(drawnCards) || drawnCards.length !== 3) {
    throw new Error("12지신 1년 운세에는 3장의 카드가 필요합니다.");
  }

  const lookup = buildCardLookup();
  const cardReadings = drawnCards.map((picked) => {
    const card = lookup.get(picked.cardId);
    if (!card) throw new Error(`카드 ID를 찾을 수 없습니다: ${picked.cardId}`);
    const interpGeneral = selectInterpretation(card, picked.orientation, "general");
    const interpLove = selectInterpretation(card, picked.orientation, "love");
    const interpMoney = selectInterpretation(card, picked.orientation, "money");
    const keywords = picked.orientation === "upright" ? (card.keywords?.upright || []) : (card.keywords?.reversed || []);
    const { imageUrl, imageCandidates, proxyImageUrl, localImageUrl } = buildTarotImageSources(card.name, card.id);
    return {
      ...picked,
      name: card.name,
      nameKr: card.nameKr || card.name,
      interpretation: interpGeneral,
      interpretationLove: interpLove,
      interpretationMoney: interpMoney,
      imageKey: card.imageKey || card.id,
      imageUrl,
      imageCandidates,
      proxyImageUrl,
      localImageUrl,
      keywords: Array.isArray(keywords) ? keywords : [],
    };
  });

  const [c1, c2, c3] = cardReadings;
  const baseInterp = c1.interpretation || `${c1.nameKr}의 기운이 올해의 기반을 이룹니다.`;
  const challengeInterp = c2.interpretation || `${c2.nameKr}가 기회와 도전을 상징합니다.`;
  const outcomeInterp = c3.interpretation || `${c3.nameKr}가 최종 결과와 조언을 담고 있습니다.`;

  const summary = `${baseInterp} ${challengeInterp} ${outcomeInterp} 세 장의 카드가 하나의 흐름으로 이어져, 12지신이 지키는 12개월 동안 당신의 운명의 수레바퀴가 돌아갑니다.`;

  const interpSources = [
    { g: c1.interpretation, m: c1.interpretationMoney, l: c1.interpretationLove },
    { g: c2.interpretation, m: c2.interpretationMoney, l: c2.interpretationLove },
    { g: c3.interpretation, m: c3.interpretationMoney, l: c3.interpretationLove },
  ];

  const monthlyReadings = ZODIAC_MONTHLY.map((zodiac, idx) => {
    const monthNum = idx + 1;
    const cardIdx = idx % 3;
    const src = interpSources[cardIdx];
    const cardBase = cardReadings[cardIdx];
    const zodiacFortune = ZODIAC_FORTUNE_DETAIL[monthNum] || {};
    const orientLabel = cardBase.orientation === "reversed" ? "(역방향)" : "(정방향)";

    // 각 달마다 고유한 내용: 지신별 운세 + 카드 에너지 조합
    const flowText = [
      zodiacFortune.flow_base || `${zodiac.name}의 달입니다. ${zodiac.traits}의 기운이 당신을 감쌉니다.`,
      `이달의 타로 에너지 [${cardBase.nameKr} ${orientLabel}]: ${src.g || baseInterp}`,
      cardBase.orientation === "reversed"
        ? "역방향의 에너지이므로 속도를 낮추고 내면의 흐름을 점검하면서 진행하는 것이 중요합니다."
        : "정방향의 에너지로 자연스러운 흐름을 따라 실행하면 좋은 결과가 기대됩니다.",
    ].filter(Boolean).join(" ");

    const moneyText = [
      zodiacFortune.money_base || `${zodiac.traits}의 기운이 재물 흐름에 영향을 줍니다.`,
      `카드 메시지: ${src.m || src.g || "꾸준한 관리와 현명한 선택이 재물 흐름을 안정시킵니다."}`,
    ].filter(Boolean).join(" ");

    const loveText = [
      zodiacFortune.love_base || `${zodiac.traits}의 기운이 사랑에 담깁니다.`,
      `카드 메시지: ${src.l || src.g || "진심 어린 표현이 관계를 따뜻하게 만듭니다."}`,
    ].filter(Boolean).join(" ");

    const relationText = [
      zodiacFortune.relationship_base || `${zodiac.traits}의 기운으로 주변과의 조화가 중요합니다.`,
      `카드 에너지: ${src.g || "솔직한 소통이 관계를 풍요롭게 합니다."}`,
    ].filter(Boolean).join(" ");

    return {
      month: monthNum,
      zodiac,
      flow: flowText,
      money: moneyText,
      love: loveText,
      relationship: relationText,
    };
  });

  const finalAdvice = `올해는 ${c1.nameKr} → ${c2.nameKr} → ${c3.nameKr}의 흐름을 따라가세요. ${outcomeInterp} 12지신이 지키는 한 해, 작은 결심 하나하나가 큰 행운으로 이어질 것입니다.`;

  return {
    spreadType: "yearly_three_card",
    category: "general",
    cardReadings,
    reading: {
      summary,
      monthlyReadings,
      finalAdvice,
    },
  };
}

// ─── 12카드 월별 스프레드: 메이저 아르카나 내장 해석 (베테랑 상담사 퀄리티) ───
const MAJOR_ARCANA_YEARLY = {
  M00: {
    upright: {
      general: "바보 카드의 순수한 시작 에너지가 이달을 밝힙니다. 계획보다 직관을 믿고 한 발짝 내딛는 용기가 필요한 시기입니다. 새로운 시작이 어색하더라도 완벽한 준비는 없으며, 출발 자체가 기회를 만들어냅니다. 낯선 상황을 두려워하지 말고 가볍게 뛰어드세요. 오래된 경직된 틀을 벗어나면 예상치 못한 행운이 따라오는 흐름입니다.",
      love: "사랑에 있어 순수하고 열린 마음이 새로운 흐름을 만들어줍니다. 계산 없이 진심으로 다가가는 태도가 이달의 연애 핵심 전략입니다. 기존 연인이 있다면 일상의 틀을 깨는 즉흥적인 데이트나 표현이 관계에 활력을 줍니다. 솔로라면 평소와 다른 공간, 다른 사람들 사이에서 인연이 시작될 수 있습니다. 마음이 가는 대로 가볍게 표현해 보세요.",
      money: "새로운 수입 기회를 탐색하기 좋은 달입니다. 리스크 없이 시도해볼 수 있는 사이드 프로젝트나 작은 투자부터 시작하는 것이 현명합니다. 단, 충동적인 큰 베팅보다는 테스트 단위로 시작해 검증하는 전략이 중요합니다. 안전망 없이 전부를 쏟아붓는 것은 이달에 적합하지 않습니다. 소액으로 가능성을 열어두는 것이 핵심입니다.",
      career: "익숙한 영역 밖으로 나가는 새로운 도전이 성장의 씨앗이 됩니다. 완전히 새로운 프로젝트나 역할에 자원하면 뜻밖의 기회가 열릴 수 있는 달입니다. 실수를 두려워하지 말고 배우는 자세로 임하면 주변의 신뢰도 자연스럽게 쌓입니다. 준비가 완벽하지 않아도 일단 시작하는 것이 지금 단계에서 가장 중요한 행동입니다.",
    },
    reversed: {
      general: "무모한 결정이나 준비 없는 출발이 문제를 만들 수 있는 시기입니다. 새로움을 원하지만 아직 방향이 잡히지 않아 에너지가 분산될 위험이 있습니다. 중요한 결정은 일주일만 더 생각하는 여유를 가져보세요. 충동적 선택이 가져오는 대가가 이달에 크게 체감될 수 있으니, 감정이 올라온 순간 바로 결정하지 말고 텀을 두는 것이 안전합니다.",
      love: "감정의 즉흥성 때문에 오해가 생기거나 갑작스러운 행동으로 상대가 당황할 수 있습니다. 의도를 분명히 전달하고 상대의 반응을 확인하며 진전하는 속도 조절이 필요합니다. 새로운 만남을 서두르기보다 지금 관계에서 미완성된 부분을 먼저 정리하는 것이 이달의 현명한 접근입니다.",
      money: "검증되지 않은 투자나 충동구매를 경계해야 합니다. '이번 한 번만'식 소비가 반복되면 연간 재정 계획이 흔들립니다. 지출 결정 전 24시간 숙고 규칙을 이달에 특히 엄격히 적용하세요. 높은 수익을 약속하는 제안에는 반드시 리스크 점검이 선행되어야 합니다.",
      career: "준비 없이 뛰어든 도전이 역효과를 낼 수 있는 달입니다. 새로운 역할에 욕심이 생겼다면 역량 보강 계획을 먼저 세우세요. 무리한 확장보다 현재 맡은 일을 안정적으로 마무리하는 것이 장기적으로 유리합니다.",
    },
  },
  M01: {
    upright: {
      general: "마법사 카드의 실행력과 의지가 이달 흐름의 중심입니다. 필요한 자원과 능력이 이미 손안에 있으니 망설이지 말고 움직이세요. 아이디어를 현실로 전환하는 힘이 극대화되는 시기로, 계획을 행동으로 옮기면 빠른 결과가 나옵니다. 자신감 있는 태도가 주변의 신뢰를 끌어오고 기회의 문이 열립니다.",
      love: "주도적으로 관계를 이끄는 힘이 강해지는 달입니다. 마음이 있다면 먼저 표현하는 용기가 관계를 진전시킵니다. 연인이 있다면 함께하고 싶은 계획을 구체적으로 제안하면 관계 만족도가 높아집니다. 매력이 최고조에 이르는 시기라 새로운 만남의 기회도 증가하므로 표현을 아끼지 마세요.",
      money: "계획과 실행이 맞물리면 수익이 나오는 달입니다. 오래 구상해온 사업 아이디어나 투자 계획을 실행으로 옮기기 좋은 타이밍입니다. 여러 가능성을 열어두되 가장 강점이 있는 분야에 핵심 에너지를 집중하면 효율이 높아지고 구체적인 결과물이 나옵니다.",
      career: "역량을 최대한 발휘할 수 있는 달입니다. 새로운 업무나 클라이언트를 맡을 기회가 오면 적극적으로 수락하세요. 프레젠테이션, 협상, 제안서 작성 등 전문 스킬이 빛나는 장면이 이달에 많이 생깁니다. 성과를 내고 싶다면 계획과 실행의 간격을 최소화하는 것이 핵심 전략입니다.",
    },
    reversed: {
      general: "재능과 자원이 있지만 방향이 흐트러져 결과가 분산되는 시기입니다. 멀티태스킹보다 한 가지에 집중하는 전략이 훨씬 효율적입니다. 자신을 과시하거나 과대평가하면 신뢰를 잃을 수 있으니 겸손과 성실함을 유지하세요. 준비된 것으로 당장 실행하되 무리한 확장은 보류하는 것이 안전합니다.",
      love: "상대방에게 자신의 의도가 명확히 전달되지 않아 오해가 생길 수 있습니다. 말의 내용보다 말하는 방식이 더 중요한 달이라, 어조와 타이밍을 조절하는 연습이 필요합니다. 대화하기 전에 하고 싶은 말을 정리하는 습관이 관계의 오해를 크게 줄여줍니다.",
      money: "능력이 있어도 타이밍이나 방향이 어긋나면 수익으로 연결되지 않는 시기입니다. 검증되지 않은 투자나 '빠른 성공' 공식은 철저히 걸러내세요. 현금흐름을 먼저 안정화하고 그 다음 단계를 계획하는 것이 안전한 재정 운용법입니다.",
      career: "역량 대비 결과가 안 나오는 것 같아 답답할 수 있습니다. 문제는 능력이 아니라 실행 방식일 수 있으니 프로세스를 재점검해보세요. 혼자 해결하려 하기보다 도움을 요청하거나 팀원과 협력하면 돌파가 빨라집니다.",
    },
  },
  M02: {
    upright: {
      general: "여사제의 깊은 직관과 내면의 지혜가 이달의 안내자입니다. 표면보다 이면을 읽는 능력이 살아나는 시기로, 조용히 관찰하면 숨겨진 기회를 포착할 수 있습니다. 말보다 직관을 믿고 성급한 결론을 내리기보다 정보를 더 수집하는 유보의 지혜가 필요합니다. 잠재의식의 경고 신호에도 귀를 기울이는 달입니다.",
      love: "겉으로 드러난 것보다 속마음을 읽는 것이 이달 연애의 핵심입니다. 말하지 않아도 느껴지는 감정의 온도를 이달에는 특히 예민하게 감지할 수 있습니다. 상대의 말보다 행동 패턴을 관찰하세요. 솔로라면 첫인상보다 두 번째 만남에서 그 사람의 진심이 보이는 달입니다.",
      money: "공개되지 않은 정보나 숨겨진 기회를 찾아내는 직관이 강해지는 달입니다. 섣불리 결정하기보다 더 많은 정보를 수집하고 검토하는 것이 유리합니다. 장기 투자나 조용한 자산 축적에 좋은 에너지이며, 화려한 단기 수익보다 안정성과 지속성에 집중하는 것이 이달의 전략입니다.",
      career: "뒤에서 조용히 준비하는 것이 나중에 빛나는 큰 성과로 이어지는 달입니다. 지금 당장 성과가 보이지 않더라도 깊이 공부하고 역량을 쌓는 단계가 필요합니다. 팀에서 발언보다 경청의 자세가 더 많은 것을 알게 해주는 시기입니다.",
    },
    reversed: {
      general: "이중적인 상황이나 숨겨진 진실이 표면으로 드러날 수 있는 달입니다. 직관이 흐려져 판단이 어려울 때는 결정을 미루는 것도 현명한 선택입니다. 비밀을 유지하면 오해가 커질 수 있으니, 필요한 정보를 적절히 공유하는 것이 관계를 지키는 방법입니다.",
      love: "비밀이나 모호한 태도가 상대의 불안을 키울 수 있는 달입니다. '알아서 이해하겠지'라는 생각보다 명확한 표현이 오해를 차단합니다. 감정을 눈치로만 전달하면 엇갈릴 수 있으니 직접적인 소통이 더 효과적입니다.",
      money: "불완전한 정보에 기반한 재정 결정이 손해를 낳을 수 있습니다. 이달은 확인되지 않은 정보나 소문을 기반으로 투자하거나 큰 지출을 하는 것을 자제하세요. 보이지 않는 부분의 리스크를 꼼꼼히 점검하는 것이 핵심입니다.",
      career: "숨겨진 경쟁이나 음지의 정치가 업무에 영향을 줄 수 있는 달입니다. 중요한 결정에서 불분명한 의도를 가진 사람의 조언에 과도하게 의존하지 마세요. 사실과 소문을 분리하고 직접 확인하는 것을 원칙으로 하세요.",
    },
  },
  M03: {
    upright: {
      general: "여황제 카드의 풍요롭고 생산적인 에너지가 이달을 감쌉니다. 씨앗이 싹트고 보살핌을 받은 것들이 성장하는 시기로, 지속적인 노력이 자연스럽게 결실로 이어지는 흐름입니다. 자신을 충분히 돌보면서 주변도 돌보는 균형감이 이달의 핵심입니다. 억지로 서두르지 않아도 흐름이 우호적으로 작동합니다.",
      love: "관계가 자연스럽게 깊어지기 좋은 환경이 만들어지는 달입니다. 돌봄과 애정 표현을 아끼지 않으면 관계가 따뜻하게 성장합니다. 연인이 있다면 일상 속 소소한 배려가 감동이 되는 달이고, 솔로라면 자연스러운 만남 속에서 인연이 싹틀 수 있습니다. 상대를 압박하지 말고 풍요롭게 나눠주는 에너지가 자석처럼 인연을 당깁니다.",
      money: "씨앗형 투자나 지속적 저축 습관이 장기 수익으로 연결되는 흐름입니다. 부동산, 장기 투자, 저축 계획의 기반을 다지기에 좋은 달입니다. 단기 수익보다 장기 성장에 에너지를 쏟으면 더 큰 결실을 얻을 수 있으며, 창의적 수입 경로도 이달에 탐색해볼 만합니다.",
      career: "창의성과 생산성이 높아지는 달입니다. 글쓰기, 크리에이티브 작업, 교육·코칭 관련 업무라면 특히 성과가 돋보입니다. 팀원을 배려하고 키우는 자세가 결국 전체 성과를 끌어올리는 달이기도 합니다. 장기 프로젝트를 시작하기에 가장 좋은 타이밍입니다.",
    },
    reversed: {
      general: "자신을 지나치게 혹사하거나 타인의 기대에 맞추다 번아웃이 오는 신호일 수 있습니다. 생산성 압박보다 충전이 먼저입니다. 이달만큼은 '해야 한다'는 의무감을 내려놓고 진짜 하고 싶은 것을 해보세요. 균형 회복이 다음 성장의 토대가 됩니다.",
      love: "지나치게 헌신하거나 관계에 집착하는 경향이 오히려 상대를 부담스럽게 만들 수 있습니다. 관계에도 숨 쉴 공간이 필요합니다. 경계를 설정하고 자신의 필요도 중요하게 여기는 연습이 관계를 더 건강하게 만들어줍니다.",
      money: "과소비, 충동구매, 또는 타인을 위한 지나친 지출로 재정 균형이 흔들릴 수 있습니다. 소비 결정 전 '이것이 나의 진짜 필요인가'를 자문하세요. 재산 보호와 현금흐름 점검이 이달의 핵심 과제입니다.",
      career: "업무 과부하나 팀 내 역할 혼란으로 지쳐가는 신호일 수 있습니다. 성과 압박보다 업무 구조를 재정비하는 것이 선행되어야 합니다. 모든 것을 혼자 해결하려 하지 말고, 위임과 분담의 균형을 찾으세요.",
    },
  },
  M04: {
    upright: {
      general: "황제 카드의 강인한 의지와 체계적 질서가 이달의 흐름을 이끕니다. 명확한 계획과 원칙을 세우면 안정감이 높아지고 목표 달성에 유리한 환경이 만들어집니다. 권위 있는 사람과의 협력이나 구조화된 환경이 도움이 됩니다. 경계를 분명히 하면 에너지가 새지 않고 성과로 집중됩니다.",
      love: "관계에서 책임감 있는 행동과 명확한 역할 분담이 신뢰를 만드는 달입니다. 안정적인 파트너십을 원한다면 '우리가 어디로 가고 있는지' 이야기를 나눠보세요. 작은 약속을 일관되게 지키는 행동이 큰 신뢰로 쌓이고 관계를 단단하게 만들어줍니다.",
      money: "계획적 소비와 저축 원칙이 재정을 튼튼하게 만드는 달입니다. 예산 설정과 지출 한도를 명확히 하고 그 안에서 움직이면 재정이 안정됩니다. 장기 부채 정리나 자산 구조 재편에도 좋은 타이밍이며, 원칙 있는 재정 운용이 큰 효과를 발휘합니다.",
      career: "리더십과 원칙을 발휘하는 자리에서 빛나는 달입니다. 팀을 이끌거나 중요한 결정을 내려야 하는 상황에서 신뢰를 받습니다. 체계적인 프로세스를 만들어내는 능력이 성과로 직결되는 시기입니다.",
    },
    reversed: {
      general: "원칙이나 권위에 너무 집착해 유연성이 떨어지는 시기입니다. 틀에 박힌 방식이 오히려 성장을 막을 수 있으니 새로운 접근을 허용해 보세요. 고집보다 현실 피드백에 귀 기울이는 유연성이 이달의 핵심 과제입니다.",
      love: "지나친 통제나 일방적 결정이 상대를 멀어지게 할 수 있습니다. 관계는 지시나 관리가 아니라 함께 만들어가는 것임을 기억하세요. 상대의 의견을 먼저 듣고 공동 결정을 내리는 방식으로 전환이 필요합니다.",
      money: "과도한 절약이나 지나친 리스크 회피가 오히려 기회를 놓치게 할 수 있습니다. 경직된 재정 사고보다 약간의 유연성을 허용하는 것이 장기 성장에 더 유리할 수 있습니다. 재정 계획은 있되 너무 경직되지 않게 운영하세요.",
      career: "권위적 태도나 독단적 결정이 팀 불화와 비효율을 만드는 달입니다. 결과보다 과정을 함께 만들어가는 참여형 리더십이 더 큰 성과를 낳는 시기입니다. '내가 옳다'는 생각을 내려놓고 팀의 의견을 통합하는 자세가 필요합니다.",
    },
  },
  M05: {
    upright: {
      general: "교황 카드의 지혜와 전통이 이달의 길을 밝혀줍니다. 경험 있는 멘토나 검증된 방법이 가장 믿음직한 길잡이입니다. 관습과 원칙을 존중하는 태도가 신뢰를 만들고, 이미 검증된 방식을 따르면 안전하고 안정적인 성과를 기대할 수 있습니다. 전통 안에 숨어 있는 지혜를 발견하세요.",
      love: "약속과 원칙이 관계의 기둥이 되는 달입니다. 관계에서 가치관과 삶의 방식을 나누는 깊이 있는 대화가 중요해집니다. 결혼이나 장기 헌신을 고민하고 있다면 이달에 중요한 이야기를 나눠보세요. 진지한 관계를 원한다면 솔직하게 의도를 밝히는 것이 가장 빠른 길입니다.",
      money: "검증된 방식과 전문가 조언을 따르는 것이 이달 재무 관리의 핵심입니다. 유행하는 투자보다 검증된 자산 구조를 유지하고, 재무 전문가나 경험 많은 조언자의 의견을 귀담아 들어보세요. 안정적이고 꾸준한 접근이 장기적으로 훨씬 유리합니다.",
      career: "선배나 상위 조직의 지원을 받을 수 있는 달입니다. 기관이나 조직의 원칙과 프로세스를 따르면서 신뢰를 쌓는 것이 장기 성장에 유리합니다. 공식적 교육이나 자격 취득에 투자하는 것도 이달에 좋은 선택입니다.",
    },
    reversed: {
      general: "규칙과 틀에 갇혀 새로운 가능성을 닫고 있지 않은지 점검해 보세요. 기존 방식이 최선이 아닐 수 있음을 인정하는 용기가 필요한 달입니다. 권위에 맹목적으로 따르기보다 스스로 판단하는 주체성을 회복하는 것이 중요합니다.",
      love: "관계에서 도덕적 기준이나 사회적 기대를 지나치게 따르는 것이 진심을 억누를 수 있습니다. '해야 한다'는 의무감보다 '하고 싶다'는 진심을 기반으로 관계를 재정의해 보세요. 상대와의 진정한 연결이 규범보다 먼저입니다.",
      money: "지나치게 보수적인 재정 태도가 기회를 놓치게 할 수 있습니다. 새로운 투자 방식이나 수입 경로를 탐색하는 것도 성장의 일부임을 기억하세요. 단, 검증 없이 유행을 따르는 것과는 반드시 구분해야 합니다.",
      career: "조직의 규칙이나 상위 권위에 대한 과도한 의존을 점검해보세요. 시스템이 항상 옳지 않을 수 있으며, 상황에 맞는 판단력을 기르는 것이 장기 성장에 더 중요합니다. 변화하는 환경에 맞춰 사고의 유연성을 넓혀가세요.",
    },
  },
  M06: {
    upright: {
      general: "연인 카드의 선택과 조화의 에너지가 이달을 이끕니다. 중요한 결정을 내려야 하는 시점이며, 외적 기대보다 내면의 가치관에 맞는 선택이 더 올바른 방향입니다. 두 가지 중 하나를 선택해야 한다면 더 오랫동안 행복할 수 있는 쪽을 선택하세요. 이달의 선택이 향후 흐름을 크게 바꾸게 됩니다.",
      love: "서로를 충분히 이해하고 선택하는 깊이 있는 단계에 접어드는 달입니다. 두 사람이 원하는 것을 솔직하게 공유하고 함께 방향을 맞춰가는 노력이 관계를 다음 단계로 끌어올립니다. 갈림길에 서 있다면 이달이 진지한 대화를 나누기 가장 좋은 타이밍입니다.",
      money: "협업이나 파트너십이 더 큰 수익을 만들 수 있는 달입니다. 단독 판단보다 신뢰할 수 있는 파트너와 함께 재무 결정을 내리면 더 좋은 결과가 기대됩니다. 단, 이해관계가 얽힌 투자 결정은 감정과 분리해서 판단하는 것이 중요합니다.",
      career: "협업 프로젝트나 파트너십이 강한 성과를 낼 수 있는 달입니다. 팀 안에서 시너지를 만들 수 있는 사람을 찾고 함께 일하세요. 혼자 모든 것을 하려는 욕심보다 각자의 강점을 모으는 전략이 더 빠른 성과를 냅니다.",
    },
    reversed: {
      general: "내면의 갈등이나 가치관 충돌로 인해 결정이 어려운 시기입니다. 외부 압력보다 자신의 진심에 귀를 기울이는 시간이 필요합니다. 어떤 선택을 하든 타인의 기준보다 자신이 감당할 수 있는지가 핵심입니다.",
      love: "관계에서 방향성을 놓고 두 사람 간 충돌이 있을 수 있습니다. 문제를 회피하기보다 직접 대화로 풀어가는 용기가 필요합니다. 소통이 단절되면 불필요한 오해가 커지므로, 감정적 공격이 아닌 사실 기반 대화를 시도하세요.",
      money: "공동 재정 관리에서 의견 충돌이 발생할 수 있는 달입니다. 이해관계가 복잡한 투자나 재정 파트너십은 이달에 신중하게 접근하고, 조건을 명확히 문서화하는 습관이 중요합니다.",
      career: "팀 내 역할 갈등이나 파트너십 문제가 업무 효율을 낮출 수 있습니다. 감정적 충돌보다 역할과 책임을 명확히 재정의하는 것이 해결의 시작입니다. 불편한 관계도 비즈니스적 관점에서 분리해서 다루는 냉정함이 필요합니다.",
    },
  },
  M07: {
    upright: {
      general: "전차 카드의 강한 추진력과 의지가 이달 흐름의 엔진입니다. 목표를 명확히 정하고 속도 있게 전진하면 방해 요소를 돌파할 수 있는 시기입니다. 감정에 흔들리지 말고 방향을 유지하는 의지력이 성공의 열쇠이며, 경쟁이 있다면 자신감 있게 나서야 합니다.",
      love: "관계의 방향성을 분명히 정하는 것이 이달의 연애 핵심입니다. 막연한 기대보다 구체적인 계획과 실행이 관계를 진전시킵니다. 감정보다 의지로 접근하는 달이라 어렵더라도 먼저 대화를 시작하는 사람이 관계의 흐름을 바꿉니다.",
      money: "실행력이 수익을 만드는 달입니다. 오래 미뤄온 재정 행동을 이달에 실행하면 기대 이상의 결과가 나올 수 있습니다. 목표 금액과 기간을 명확히 설정하고 한 방향으로 에너지를 집중하는 것이 핵심 전략입니다.",
      career: "목표를 향해 끝까지 밀어붙이면 성과가 나오는 달입니다. 장애물이 있더라도 우회하거나 극복하며 전진하는 능력이 빛납니다. 경쟁 상황이라면 속도와 집중력에서 우위를 점하는 것이 중요합니다.",
    },
    reversed: {
      general: "빠른 속도가 오히려 실수를 낳을 수 있는 달입니다. 방향 점검 없이 달리는 것이 나중에 더 큰 우회로를 만들 수 있으니, 지금 잠깐 멈추고 전략을 재확인하세요. 에너지를 낭비하는 불필요한 싸움은 이달에 피하는 것이 현명합니다.",
      love: "관계를 너무 강하게 통제하려 하거나 빠른 결과를 요구하면 오히려 상대가 멀어질 수 있습니다. 감정의 싸움보다 방향성 합의가 먼저입니다. 속도를 낮추고 상대의 리듬을 존중하는 것이 이달의 현명한 접근입니다.",
      money: "무리한 투자나 과도한 추진이 오히려 손실을 키울 수 있는 달입니다. 리스크가 너무 높은 거래는 이달에 특히 신중하게 접근하세요. '올인'보다는 단계적 실행이 안전하며 지속 가능합니다.",
      career: "과도한 경쟁의식이나 성과 집착이 팀 관계를 해치거나 스스로를 소진시킬 수 있습니다. 가속보다 방향 재점검이 필요한 달입니다. 전략 수정 후 실행으로 돌아오면 더 좋은 결과가 기다립니다.",
    },
  },
  M08: {
    upright: {
      general: "힘 카드의 부드럽지만 강인한 에너지가 이달을 지배합니다. 외부 상황이 어렵더라도 내면의 평정심을 유지하는 사람이 결국 이기는 달입니다. 강제와 억압보다 이해와 공감을 통한 설득이 더 큰 힘을 발휘합니다. 자기 통제와 인내가 성공의 비결이며 감정 조절 능력이 빛납니다.",
      love: "감정의 질풍노도를 다스리는 내면의 힘이 관계를 안정시킵니다. 상대가 힘들어할 때 함께 버텨주는 인내심이 신뢰를 쌓는 달입니다. 통제 대신 이해를, 요구 대신 지지를 선택하면 관계가 더 깊고 단단해집니다.",
      money: "꾸준함과 인내가 장기 수익의 기반이 됩니다. 단기 유혹보다 장기 전략을 유지하는 자제력이 이달 재정의 핵심입니다. 투자 손실이 있더라도 감정적으로 결정하지 말고 전략적으로 유지하거나 조정하는 냉정함이 필요합니다.",
      career: "부드러운 리더십과 꾸준한 노력이 팀을 움직이는 달입니다. 성질을 부리거나 권위로 강요하기보다 인내심 있는 설득이 훨씬 효과적입니다. 어려운 동료나 클라이언트와의 관계도 이달에는 부드럽게 풀어갈 수 있는 에너지가 있습니다.",
    },
    reversed: {
      general: "자신감 부족이나 내면의 불안이 행동을 막는 시기일 수 있습니다. 두려움을 인정하되 그것이 결정을 지배하지 않도록 의식적으로 관리하세요. 작은 성공 경험을 쌓으면서 자신을 다시 믿어가는 과정이 필요합니다.",
      love: "두려움이나 자존감 문제가 관계 표현을 막고 있을 수 있습니다. 상대에게 지나치게 의존하거나 반대로 지나치게 양보하는 패턴이 있다면 이달에 균형을 찾는 연습이 중요합니다. 자신도 관계에서 보살핌을 받을 자격이 있음을 기억하세요.",
      money: "재정 문제에 대한 두려움이나 회피가 상황을 키울 수 있습니다. 회피보다는 직시하는 것이 첫 번째 해결책입니다. 통제 가능한 것부터 하나씩 정리하면 재정 불안이 감소합니다.",
      career: "자신감 부족이 기회를 놓치게 하는 달입니다. 나설 준비가 되어 있음에도 뒤로 물러서는 습관을 점검하세요. 작은 성공 경험을 만들어 가는 것부터 시작하면 자신감 회복 속도가 빨라집니다.",
    },
  },
  M09: {
    upright: {
      general: "은둔자 카드의 내면 성찰과 깊은 탐구가 이달 흐름의 핵심입니다. 외부 활동을 줄이고 자신의 내면에 집중할수록 중요한 통찰이 찾아옵니다. 답은 밖이 아니라 안에 있는 시기로, 혼자만의 시간이 다음 도약의 토대를 다져줍니다. 조용한 성찰이 가장 큰 생산성을 만드는 달입니다.",
      love: "관계에서 잠시 거리와 공간을 두는 것이 오히려 감정을 성숙시킵니다. 연인이 있다면 각자의 시간을 충분히 인정하고 각자 성장하는 것이 관계를 더욱 풍요롭게 합니다. 솔로라면 자기 자신을 더 깊이 이해하는 이 시간이 나중의 좋은 관계의 초석이 됩니다.",
      money: "섣불리 움직이기보다 더 많은 정보를 수집하고 신중하게 계획하는 것이 유리한 달입니다. 조용히 자산을 쌓거나 지출을 줄이는 보수적 전략이 이달에 더 안전합니다. 중요한 재정 결정은 충분히 숙고한 후에 내리세요.",
      career: "깊이 있는 연구, 공부, 준비가 나중에 큰 성과로 이어지는 달입니다. 지금 당장 드러나는 성과가 없더라도 이 기간의 깊은 탐구가 누적되면 어느 순간 폭발적 성장이 찾아옵니다. 전략가나 분석가, 연구자로서의 역량을 키우는 데 최적인 달입니다.",
    },
    reversed: {
      general: "너무 오랜 고립이나 지나친 내향적 회피가 오히려 문제를 키울 수 있는 달입니다. 혼자 해결하려는 집착보다 적절히 도움을 구하는 용기가 더 현명한 선택입니다. 외부 세계와의 소통이 충전에도 도움이 됩니다.",
      love: "관계에서 지나치게 거리를 두거나 감정을 혼자 삼키는 것이 상대를 혼란스럽게 만들 수 있습니다. 닫힌 마음보다 소통의 문을 조금만 열어두세요. 상대도 당신의 상태를 알고 싶어 한다는 것을 기억하세요.",
      money: "지나친 신중함이나 과도한 보수주의로 분명한 기회를 놓칠 수 있습니다. 완벽한 타이밍을 기다리다 아무것도 시작하지 못하는 함정에 빠지지 않도록 주의하세요.",
      career: "혼자 모든 것을 완벽히 하려다 팀워크가 약화될 수 있는 달입니다. 동료와 아이디어를 공유하면 오히려 더 나은 결과가 나오는 시기니 팀 내 적극적인 소통이 필요합니다.",
    },
  },
  M10: {
    upright: {
      general: "운명의 수레바퀴가 새로운 사이클을 시작하는 달입니다. 예상치 못한 변화나 전환점이 찾아올 수 있지만, 이는 더 나은 흐름으로 가는 관문입니다. 변화를 저항하지 말고 수용하면 운의 흐름을 타게 됩니다. 우연처럼 보이는 일들이 사실은 더 큰 흐름의 일부임을 믿으세요.",
      love: "관계에 새로운 국면이 열리는 전환점이 올 수 있는 달입니다. 오래 정체됐던 관계가 움직이거나, 예상치 못한 만남이 새 시작을 알릴 수 있습니다. 변화를 두려워하지 말고 흐름을 따르면 더 좋은 결과를 만날 수 있습니다.",
      money: "재물 흐름이 크게 변하는 전환점이 올 수 있는 달입니다. 기회가 오면 준비된 만큼 잡을 수 있으니 미리 대비해 두세요. 우연히 들어오는 기회를 놓치지 않도록 주변 정보에 촉각을 세우는 것이 중요합니다.",
      career: "업무 환경이나 역할에 큰 변화가 올 수 있는 달입니다. 예상치 못한 기회나 새로운 프로젝트가 배정될 수 있습니다. 변화를 기회로 전환하는 유연성이 이달 최대 무기입니다.",
    },
    reversed: {
      general: "운의 하락이나 예상치 못한 어려움이 찾아올 수 있습니다. 하지만 이것도 수레바퀴의 일부라 영원히 아래에 있지 않습니다. 지금 상황을 과대해석하지 말고, 일시적 조건의 변화로 받아들이는 마음의 유연성이 필요합니다.",
      love: "관계의 외부 조건이 불리하게 돌아서는 시기일 수 있습니다. 운의 흐름이 복잡할 때일수록 두 사람이 하나의 팀으로 함께 버티는 것이 관계를 더욱 단단하게 만듭니다.",
      money: "재정 흐름의 일시적 불안정을 경험할 수 있습니다. 하락도 수레바퀴의 일부이므로 패닉 셀이나 감정적 결정보다 절제된 전략 유지가 중요합니다. 비상 자금을 확보해 두는 것이 안전합니다.",
      career: "예상치 못한 조직 변화나 불안정한 상황이 직업 환경에 영향을 줄 수 있습니다. 통제 불가능한 외부 변수에 반응하기보다 통제 가능한 내 역량 개발에 집중하는 것이 가장 현명한 대처입니다.",
    },
  },
  M11: {
    upright: {
      general: "정의 카드의 균형과 공정함이 이달 흐름의 기준입니다. 사실에 근거한 냉정한 판단이 요구되는 시기로, 감정보다 원칙을 앞세울 때 올바른 결과가 나옵니다. 중요한 계약이나 합의, 분쟁 해결에 좋은 타이밍이며, 노력한 만큼 정당한 결과를 받게 되는 달입니다.",
      love: "솔직함과 공정한 대화가 관계의 균형을 유지하는 달입니다. 한쪽만 희생하거나 참는 구조가 있다면 이달에 재정의하는 것이 중요합니다. 관계에서 공정하고 동등한 교환이 이루어질 때 신뢰가 쌓이고 장기적으로 지속됩니다.",
      money: "계약, 조건, 수입·지출의 명확한 정리가 필요한 달입니다. 새로운 계약이나 협의 사항이 있다면 꼼꼼히 검토하세요. 불공정한 조건에 묶인 거래가 있다면 이달에 재협상하거나 정리하는 것이 좋습니다.",
      career: "공정한 평가와 보상이 이루어지는 달입니다. 성과를 문서화하고 상위 관리자에게 가시화하는 작업이 미뤄졌다면 이달에 진행하세요. 부당한 대우가 있다면 적절한 채널을 통해 이의를 제기하는 데 좋은 타이밍입니다.",
    },
    reversed: {
      general: "불공정한 상황이나 편향된 판단으로 억울함을 느낄 수 있는 달입니다. 옳고 그름을 따지기 전에 내 입장도 객관적으로 돌아보는 성찰이 필요합니다. 결과가 원하는 방향이 아니라면 과정에서 놓친 부분을 먼저 점검하세요.",
      love: "한쪽이 지나치게 희생하거나 불평등한 구조가 관계를 기울게 만들 수 있습니다. 이달에 진지하게 관계의 균형을 논의하세요. 억압된 감정이나 묵은 불만이 터지기 전에 소통의 기회를 만드는 것이 현명합니다.",
      money: "불공정한 계약이나 불명확한 재정 조건이 문제를 만들 수 있는 달입니다. 중요한 금전 계약서는 반드시 꼼꼼히 검토하고 전문가의 도움을 구하는 것을 권장합니다.",
      career: "공정하지 못한 업무 평가나 불투명한 보상 문제가 발생할 수 있습니다. 감정적으로 대응하기보다 객관적 근거를 준비해 대화하는 것이 훨씬 효과적입니다.",
    },
  },
  M12: {
    upright: {
      general: "매달린 사람 카드의 관점 전환과 기다림의 지혜가 이달의 메시지입니다. 상황이 정체되거나 기다려야만 하는 순간도 성장의 일부입니다. 익숙한 시각을 잠시 내려놓고 전혀 다른 각도에서 보면 보이지 않던 해결책이 드러납니다. 내려놓음이 오히려 새 흐름을 만들어줍니다.",
      love: "관계에서 강하게 붙잡으려 할수록 더 멀어지는 흐름이 있습니다. 결과를 기다리면서도 집착하지 않는 내려놓음이 관계에 공간을 만들어 줍니다. 솔로라면 '언제 나타날까'보다 지금 내 삶을 풍요롭게 만드는 데 집중할 필요가 있습니다.",
      money: "재정 투자의 결과가 당장 나오지 않는 기다림의 시기입니다. 성급하게 손절하거나 반대로 과도하게 추가 투자하기보다, 원칙에 따라 포지션을 유지하면서 관찰하는 단계를 거치세요.",
      career: "단기 성과보다 장기적 씨앗을 심는 달입니다. 지금의 준비가 나중에 '그때 잘 했다'는 생각이 드는 시기가 올 것입니다. 답답하더라도 지금의 배움과 준비를 멈추지 마세요.",
    },
    reversed: {
      general: "희생이 지나쳐 자신을 잃어가고 있는 신호일 수 있습니다. 이달은 자신을 돌보는 것이 최우선 과제입니다. 타인의 기대보다 내 건강과 안정을 먼저 챙기는 용기가 필요합니다.",
      love: "한쪽만 희생하는 구조가 지속되면 관계가 결국 무너집니다. 지금의 불균형을 솔직하게 대화로 꺼내는 것이 중요합니다. 상대에 대한 기대를 잠시 내려놓고 나 자신의 감정 상태를 먼저 살피세요.",
      money: "무리한 지출이나 타인을 위한 과도한 재정 희생을 멈춰야 합니다. 이달은 내 재정 안전을 지키는 것이 우선입니다. 빌려준 돈이나 미처리된 정산 사항을 정리하는 것도 중요합니다.",
      career: "번아웃 신호를 무시하지 말고 적절한 휴식을 취하세요. 방향이 잘못됐다고 느껴진다면 지금이 전환을 검토할 적기입니다. 소진된 상태로 계속하면 성과도 건강도 함께 퇴보할 수 있습니다.",
    },
  },
  M13: {
    upright: {
      general: "죽음 카드는 끝이 아니라 전환의 카드입니다. 이달은 낡고 쓸모없어진 패턴, 관계, 상황에서 해방되는 변화가 찾아옵니다. 변화가 두려울 수 있지만 새로운 시작을 위해 반드시 통과해야 할 문입니다. 불필요한 것을 내려놓을수록 새로운 에너지가 들어올 공간이 생겨납니다.",
      love: "관계의 전환점이 찾아오는 달입니다. 더 이상 성장하지 않는 관계를 마무리하거나, 기존 관계를 완전히 다른 방식으로 재구성하는 용기가 필요할 수 있습니다. 끝이 있어야 새 시작이 가능하다는 것을 기억하세요. 관계를 있는 그대로 솔직하게 바라보는 용기가 필요합니다.",
      money: "재정 구조 재편이나 투자 포트폴리오 정리가 필요한 달입니다. 손실이 있더라도 지속 어려운 자산은 정리하고 새 방향을 잡으면 결과적으로 더 건강한 재정 구조가 만들어집니다. 오래된 재정 습관을 버리는 것이 새 흐름의 시작입니다.",
      career: "직업적 큰 전환이 올 수 있는 달입니다. 퇴사, 이직, 역할 변경 등 변화가 두렵더라도 이미 성장을 막는 환경이라면 새 시작이 더 현명한 선택입니다. 새로운 단계는 반드시 무언가의 마무리 이후에 찾아옵니다.",
    },
    reversed: {
      general: "변화가 필요한 것을 알면서도 저항하고 있는 달입니다. 과거에 집착해서 새로운 것을 받아들이지 못하면 흐름이 더 막힙니다. 두려움을 인정하되, 변화를 수용할 준비를 서서히 시작하는 것이 현명합니다.",
      love: "관계를 끝내야 하는데 망설이거나, 끝난 관계를 붙잡고 있는 흐름일 수 있습니다. 솔직하게 현재 관계의 상태를 직면하는 용기가 필요합니다. 두 사람 모두를 위한 가장 정직한 결정이 무엇인지 깊이 생각해 보세요.",
      money: "손실을 인정하기 싫어 잘못된 투자를 계속 유지하는 것이 손해를 키울 수 있습니다. 객관적인 손익 판단으로 정리할 것은 과감히 정리하고 새 전략을 세우세요.",
      career: "불만족스럽지만 변화가 두려워 현 상황을 유지하는 경향이 있습니다. 새로운 기회를 탐색하는 것과 지금 자리를 지키는 것 중 무엇이 장기적으로 더 나은지 솔직하게 평가해 보세요.",
    },
  },
  M14: {
    upright: {
      general: "절제 카드의 균형과 통합의 에너지가 이달을 이끕니다. 서로 다른 요소들을 조화롭게 결합하면 더 강한 결과물이 탄생하는 시기입니다. 극단적인 선택보다 중용의 지혜가 빛나는 달이며, 조급하지 않고 꾸준히 나아가면 이달 끝에 안정적인 성과가 기다립니다.",
      love: "서로의 리듬을 맞추고 감정의 균형을 유지하는 것이 이달 연애의 핵심입니다. 지나치게 몰아치거나 지나치게 냉정한 것 모두 관계에 도움이 되지 않습니다. 적절한 거리와 온도를 유지하면서 자연스럽게 깊어지는 흐름을 만들어가세요.",
      money: "수입과 지출의 균형을 맞추는 것이 이달 재정의 핵심입니다. 한쪽에 치우치지 않는 균형 잡힌 포트폴리오 관리가 좋은 결과를 만들어냅니다. 중장기 관점으로 꾸준히 쌓아가는 전략이 이달에 가장 효과적입니다.",
      career: "여러 업무나 프로젝트의 균형을 유지하면서 모두를 끌어가는 능력이 필요한 달입니다. 협업과 조율을 통해 팀 전체 성과가 높아지는 시기로, 중재자이자 연결자 역할이 빛납니다.",
    },
    reversed: {
      general: "균형이 깨지면서 한쪽으로 과도하게 기울어진 상태입니다. 지금 과잉 소비하는 에너지(시간, 감정, 자원)가 어디에 쏠려 있는지 점검하세요. 조급함 또는 지나친 느긋함 둘 중 하나가 문제의 원인일 수 있습니다.",
      love: "관계에서 한쪽만 노력하거나 감정 표현이 극단적으로 쏠리는 경향이 있을 수 있습니다. 상대와 속도와 온도를 맞추는 의식적 노력이 필요합니다. 대화로 두 사람이 원하는 것을 재확인하는 것이 도움이 됩니다.",
      money: "지나친 소비 또는 지나친 절약 중 하나가 재정 불균형을 만들고 있습니다. 극단적으로 치우친 재정 패턴을 중간 지점으로 조정하는 것이 이달의 과제입니다.",
      career: "업무의 우선순위가 흐트러지거나 과부하가 누적되어 있을 수 있습니다. 중요한 것과 긴급한 것의 구분을 명확히 하고, 불필요한 업무를 줄이는 구조 재편이 필요합니다.",
    },
  },
  M15: {
    upright: {
      general: "악마 카드는 집착, 중독, 의존의 패턴을 의식적으로 인식하라는 메시지입니다. 이달에 무언가에 지나치게 얽매여 있다면 그것이 정말 나를 행복하게 하는지 직면해보세요. 의식하는 순간 이미 절반의 해방이 시작됩니다. 두려움이 만든 사슬인지 확인하는 것이 시작입니다.",
      love: "집착이나 지나친 의존이 관계를 건강하지 못하게 만드는 신호입니다. 상대가 없으면 불안하다는 느낌이 든다면, 그것은 사랑이 아니라 두려움일 수 있습니다. 개인으로서의 독립성과 관계의 친밀감 사이의 균형을 이달에 점검하세요.",
      money: "물질적 탐욕이나 충동구매, 도박적 투자 욕구가 강해지는 달일 수 있습니다. '더 많이'를 향한 욕구를 의식적으로 제어하는 것이 이달의 재정 과제입니다. 현재 가진 것에 감사하는 연습이 무분별한 지출을 막아줍니다.",
      career: "업무에 지나치게 중독되어 번아웃이 다가오고 있거나, 평가나 인정욕에 집착해 불건전한 경쟁을 하고 있는 신호일 수 있습니다. 일과 삶의 경계를 다시 설정하는 노력이 필요합니다.",
    },
    reversed: {
      general: "집착이나 부정적 패턴에서 점차 벗어나는 흐름이 시작되는 달입니다. 아직 완전히 자유롭지 않더라도 그 방향이 맞습니다. 계속 의식하고 작은 선택마다 자유를 선택하면 서서히 해방됩니다.",
      love: "의존적 관계에서 건강한 독립성을 회복하려는 흐름이 생깁니다. 이는 관계를 파괴하는 것이 아니라 더 건강하게 만들기 위한 과정입니다. 자신을 먼저 세우는 것이 관계에도 좋다는 것을 기억하세요.",
      money: "돈에 대한 과도한 집착이나 두려움에서 서서히 벗어날 수 있는 달입니다. 재정 불안을 인정하고 한 가지씩 해결하는 접근이 효과적입니다. 풍요를 향한 긍정적 관점 전환을 시도해 보세요.",
      career: "번아웃에서 회복하거나 과도한 성과욕에서 벗어나는 전환이 시작됩니다. 이달에 적절한 쉬어가기나 업무 우선순위 재조정이 장기 성과를 위해 반드시 필요합니다.",
    },
  },
  M16: {
    upright: {
      general: "탑 카드는 갑작스러운 변화와 해체를 상징하지만, 그 안에 불필요한 구조를 제거하는 정화의 힘이 있습니다. 예상치 못한 사건이 일어날 수 있지만, 안일하게 쌓아온 취약한 구조물을 무너뜨려 더 단단한 토대를 세울 기회가 됩니다. 충격을 받아들이면 새로운 가능성이 열립니다.",
      love: "관계에 갑작스러운 충돌이나 균열이 생길 수 있는 달입니다. 드러나지 않던 문제가 표면으로 올라오는 시기라, 단기적으로 어렵지만 장기적으로는 관계를 더 솔직하고 건강하게 만드는 계기가 됩니다.",
      money: "예상치 못한 지출이나 시장 충격이 재정을 흔들 수 있습니다. 비상금을 미리 확보하고, 변동성 높은 자산에 대한 노출을 줄이는 것이 방어적으로 유리합니다.",
      career: "직업적으로 갑작스러운 변화나 조직 개편이 있을 수 있습니다. 이러한 변화가 기회로 이어지게 하려면 빠른 적응력과 유연한 대처가 핵심입니다. 위기에서 발 빠르게 움직이면 뜻밖의 기회가 됩니다.",
    },
    reversed: {
      general: "변화가 필요한 것을 알지만 아직 타격이 충분히 오지 않아 변화를 외면하는 상태일 수 있습니다. 이미 균열이 시작된 구조를 인정하고 조금씩 재건하는 것이 나중에 허무하게 무너지는 것보다 훨씬 낫습니다.",
      love: "관계의 균열을 표면 봉합으로만 막으려 하고 있지 않은지 점검하세요. 근본적인 문제를 직면하지 않으면 더 큰 충돌로 이어집니다. 불편하더라도 솔직한 대화가 최선의 예방책입니다.",
      money: "피하고 있는 재정 문제가 더 이상 방치할 수 없는 수준까지 왔을 수 있습니다. 직시하고 전문가 도움을 구하는 것이 가장 빠른 회복 경로입니다.",
      career: "심각하게 문제가 있는 직장 환경이나 조직 구조인데 버티고만 있는 상황을 직면해야 할 달입니다. 환경을 바꾸거나 내가 변화를 주도하는 것 중 더 현실적인 선택을 고민하세요.",
    },
  },
  M17: {
    upright: {
      general: "별 카드의 희망과 회복의 빛이 어두운 터널을 비추는 달입니다. 힘든 시기를 통과해 온 사람이라면 이달에 서서히 밝아지는 흐름을 경험할 것입니다. 자신의 잠재력과 가능성에 대한 신뢰를 되찾는 시기이며, 치유와 회복이 자연스럽게 이루어집니다.",
      love: "관계가 상처에서 치유되는 흐름이 시작되는 달입니다. 오래된 상처를 내려놓고 다시 마음을 여는 용기가 이달에 힘을 발휘합니다. 솔로라면 더 이상 과거의 상처 때문에 새 사람을 두려워하지 않아도 된다는 신호입니다.",
      money: "경제적 어려움 이후 서서히 안정을 되찾는 흐름입니다. 새로운 수입 가능성이 열리기 시작하는 달이며, 절망적인 상황에서도 희망의 실마리를 찾아 하나씩 실행하면 됩니다.",
      career: "직업적 꿈이나 이상을 향해 다시 나아갈 용기가 생기는 달입니다. 잠재력이 서서히 발휘되어 주변의 인정을 받게 되는 시기로, 포기하지 않고 꾸준히 온 것이 빛을 발하기 시작합니다.",
    },
    reversed: {
      general: "희망을 놓지 않는 것이 이달에 가장 중요합니다. 아직도 어둠 속에 있는 것 같더라도 별빛은 반드시 존재합니다. 작은 성공이나 기쁨에 주의를 기울이고 그것을 기반으로 다음 걸음을 내딛으세요.",
      love: "희망을 잃고 관계에 대한 기대를 내려놓은 상태일 수 있습니다. 이달에는 관계에 대한 기대를 낮추되 완전히 포기하지는 마세요. 회복의 속도는 느리더라도 방향이 맞다면 계속 나아가는 것이 중요합니다.",
      money: "재정적 희망을 잃지 마세요. 현재 어렵더라도 한 가지 작은 개선을 실천하면 서서히 흐름이 바뀌기 시작합니다. 전문가 도움과 장기 계획이 위기를 넘기는 데 필수입니다.",
      career: "직업적 꿈이 너무 멀게 느껴지는 달일 수 있습니다. 큰 목표를 작게 쪼개어 오늘 할 수 있는 것에 집중하면 포기하지 않을 수 있습니다. 한 걸음씩 나아가는 것이 결국 목적지에 도달하는 방법입니다.",
    },
  },
  M18: {
    upright: {
      general: "달 카드의 불확실함과 직관이 충돌하는 달입니다. 보이는 것만으로는 진실을 알기 어려운 시기이므로, 섣부른 판단을 내리기보다 직관과 사실 확인을 병행하세요. 숨겨진 진실이 서서히 드러나는 과정이 시작될 수 있습니다. 불안이 사실인지 상상인지 구분하는 것이 핵심입니다.",
      love: "감정이 불명확하거나 상대의 속마음을 알기 어려워 불안을 느끼는 달입니다. 오해와 불안을 키우기보다 사실에 근거한 질문과 확인으로 접근하세요. 상상력이 과도하게 작동해 실제보다 나쁘게 보이는 경우가 이달에 특히 많으므로 주의가 필요합니다.",
      money: "불명확한 재정 정보나 예상치 못한 숨겨진 비용이 생길 수 있는 달입니다. 모든 거래와 계약 내용을 꼼꼼히 확인하고 숨은 조항이 없는지 체크하세요.",
      career: "조직 내 불투명한 정보나 숨겨진 의도가 업무 환경에 불안감을 만들 수 있습니다. 소문과 사실을 분리하고 직접 확인하는 습관이 이달에 특히 중요합니다.",
    },
    reversed: {
      general: "강박적 두려움이나 공포감이 실제보다 크게 느껴질 수 있습니다. 감정이 사실인지 상상인지 구분하는 연습이 필요합니다. 신뢰할 수 있는 사람과 대화하며 현실 감각을 되찾으세요.",
      love: "의심이나 불신이 근거없이 커지는 달입니다. 상대방에 대한 오해를 직접 확인하지 않고 혼자 결론 내리는 것을 자제하세요. 솔직한 대화 하나가 쌓인 의심을 한 번에 정리할 수 있습니다.",
      money: "재정에 대한 불필요한 불안이나 공황이 좋은 기회를 놓치게 할 수 있습니다. 실제 수치를 확인하고 사실에 근거한 판단을 하세요.",
      career: "직장 내 소문이나 불확실한 정보에 과도하게 반응해 중요한 결정을 미뤄선 안 됩니다. 팩트를 직접 확인하고 나서 움직이는 것이 원칙입니다.",
    },
  },
  M19: {
    upright: {
      general: "태양 카드의 밝은 빛과 성공 에너지가 이달을 환하게 비춥니다. 자신감과 활력이 넘치고 모든 일이 자연스럽게 풀리는 흐름입니다. 좋은 기회가 오면 망설이지 말고 당당하게 나서세요. 솔직하고 긍정적인 에너지가 주변 사람들을 끌어당기는 달입니다.",
      love: "관계가 따뜻하고 밝게 빛나는 달입니다. 솔직하고 개방적인 표현이 상대의 마음을 더 따뜻하게 합니다. 연인이 있다면 서로에게 감사함을 표현하기 좋은 달이고, 솔로라면 자신감 넘치는 매력이 인연을 자연스럽게 끌어당깁니다.",
      money: "수익이 좋아지고 재정적 성과가 빛나는 달입니다. 그동안 노력했던 투자나 사업이 결실로 나타날 수 있습니다. 새로운 수입 기회를 찾기도 좋은 시기라 적극적으로 탐색하고 실행하세요.",
      career: "성과가 인정받고 승진이나 보상의 기회가 올 수 있습니다. 주목받는 상황에서 당당하게 능력을 발휘하세요. 발표나 프레젠테이션이 있다면 이달에 특히 빛납니다. 자신감이 이달의 가장 강력한 무기입니다.",
    },
    reversed: {
      general: "잠시 어둠을 통과하는 중이지만 태양은 다시 뜨게 되어 있습니다. 현재의 어려움이 영원히 계속되지 않는다는 것을 기억하세요. 자신을 너무 혹독하게 비난하지 말고 따뜻한 시선으로 바라보세요.",
      love: "관계에서 소통이 단절되거나 활기가 떨어지는 시기일 수 있습니다. 작은 소통 하나가 관계에 생기를 불어넣을 수 있으니 먼저 연락하거나 표현하는 용기를 내보세요.",
      money: "일시적인 재정 어려움이 있을 수 있지만 기본을 지키면 회복됩니다. 지출을 줄이고 현금흐름을 안정화하는 것이 우선이며, 불필요한 지출을 정리하면 여유가 생깁니다.",
      career: "성과가 보이지 않는다고 자신감을 잃지 마세요. 잠시 빛이 가려진 것일 뿐, 꾸준히 열심히 한 것은 결국 인정받는 날이 옵니다. 기본기를 다지는 데 집중하세요.",
    },
  },
  M20: {
    upright: {
      general: "심판 카드는 각성, 재평가, 그리고 새로운 단계로의 부름을 의미합니다. 자신의 삶을 솔직하게 돌아보고 변화가 필요한 부분을 인정하는 것이 이달의 핵심입니다. 과거의 실수로부터 배워 새로운 기회를 향해 나아가는 용기를 내세요. 재기와 재평가의 완벽한 타이밍입니다.",
      love: "과거의 관계나 상처를 용서하고 새롭게 시작하는 에너지가 강한 달입니다. 오래된 상처를 내려놓고 다시 마음을 여는 것이 이달에 더 큰 사랑을 불러들이는 방법입니다. 용서와 화해가 새로운 시작을 만들어줍니다.",
      money: "과거의 재정 실수를 분석하고 다시 새로운 전략으로 시작하기 좋은 달입니다. 실패한 투자나 손실에 대한 객관적 분석을 통해 더 현명한 재정 결정을 내릴 수 있는 통찰을 얻게 됩니다.",
      career: "직업적 새로운 기회나 이전에 놓친 신호들이 다시 찾아올 수 있는 달입니다. 재평가와 재출발을 두려워하지 말고 적극적으로 기회를 잡으세요. 이전의 경험이 오히려 강점이 되는 시기입니다.",
    },
    reversed: {
      general: "자기 성찰이 지나쳐 자책이 되거나, 과거에 지나치게 집착하는 경향이 있을 수 있습니다. 후회하는 것보다 앞으로 어떻게 다르게 할 것인지 초점을 맞추세요. 자기 용서가 이달의 가장 중요한 과제입니다.",
      love: "과거의 상처를 완전히 정리하지 못해 현재 관계에 영향을 주고 있을 수 있습니다. 전 연인이나 과거 관계에 감정이 묶여 있다면 스스로 해방시켜 주는 작업이 필요합니다.",
      money: "과거의 재정 실수를 반복하거나, 지나친 자책으로 아무 행동도 못하는 패턴이 있을 수 있습니다. 이달에는 과거는 학습 자료로만 보고 앞을 향한 작은 행동을 취하세요.",
      career: "이전 직장이나 프로젝트의 아쉬움에 묶여 새로운 기회를 놓칠 수 있습니다. 완벽하게 준비되지 않아도 좋으니 일단 나아가려는 용기가 필요합니다.",
    },
  },
  M21: {
    upright: {
      general: "세계 카드의 완성과 성취 에너지가 이달을 채웁니다. 한 사이클이 마무리되고 더 높은 단계로의 전환이 이루어지는 달입니다. 그동안의 노력과 성장이 결실로 나타나며, 자신이 이룬 것들을 충분히 자랑스러워해도 되는 시기입니다. 마무리와 완성이 새 시작의 토대가 됩니다.",
      love: "관계가 안정되고 깊어지는 성숙의 단계에 들어서는 달입니다. 헌신과 신뢰가 쌓인 관계라면 다음 단계를 논의하기 좋은 타이밍입니다. 솔로라면 자신을 완성된 존재로 느끼며 인연을 자연스럽게 끌어당기는 흐름입니다.",
      money: "장기적인 재정 노력이 마침내 수익으로 연결되는 달입니다. 투자의 수익 실현이나 사업 안정화가 이루어지며, 재정적 완성도가 높아지는 시기입니다. 이제 다음 단계의 더 큰 재정 목표를 세워도 좋습니다.",
      career: "목표를 달성하고 그에 맞는 인정을 받는 시기입니다. 중요한 프로젝트의 성공적 완수나 원하던 역할로의 이동이 이루어질 수 있습니다. 이 성취를 발판 삼아 새로운 목표를 더 크게 설정하는 것이 이달의 다음 과제입니다.",
    },
    reversed: {
      general: "완성 직전에 마무리를 못하고 있거나, 성취감에도 허전함을 느끼는 시기일 수 있습니다. 90%에서 멈추지 말고 끝까지 마무리하는 것이 이달의 가장 중요한 과제입니다. 완성에 대한 두려움이 있는지 돌아보세요.",
      love: "관계가 성숙해가는 중이지만 아직 완성된 것은 아닙니다. 조금 더 인내심을 갖고 서로에 대한 이해를 쌓아가는 과정을 즐기세요. 서두르면 오히려 완성도가 낮아질 수 있습니다.",
      money: "마지막 단계의 노력이 부족해 결실을 온전히 거두지 못할 수 있습니다. 포기하지 말고 꾸준히 마무리까지 집중하면 이달 이후 좋은 결과가 옵니다.",
      career: "미완성 프로젝트들을 정리하고 완수하는 것이 다음 기회를 열어줍니다. 여러 일을 벌이기보다 기존 것을 완성하는 데 에너지를 집중하세요.",
    },
  },
};

function selectInterpretationForYearly(card, orientation, category) {
  const builtIn = MAJOR_ARCANA_YEARLY[card.id];
  if (builtIn && builtIn[orientation] && builtIn[orientation][category]) {
    return builtIn[orientation][category];
  }
  const fromDb = selectInterpretation(card, orientation, category);
  if (fromDb && fromDb.length > 50 && !fromDb.includes("메이저 아르카나")) return fromDb;
  const placeholders = createPlaceholderInterpretations(card.nameKr || card.name);
  return placeholders[orientation]?.[category] || placeholders[orientation]?.general || placeholders.upright?.general || "";
}

function createYearlyTwelveCardReading({ drawnCards }) {
  if (!Array.isArray(drawnCards) || drawnCards.length !== 12) {
    throw new Error("12개월 운세에는 12장의 카드가 필요합니다.");
  }

  const lookup = buildCardLookup();
  const monthlyReadings = drawnCards.map((picked, idx) => {
    const card = lookup.get(picked.cardId);
    if (!card) throw new Error(`카드 ID를 찾을 수 없습니다: ${picked.cardId}`);
    const monthNum = idx + 1;
    const zodiac = ZODIAC_MONTHLY[idx];
    const interpGeneral = selectInterpretationForYearly(card, picked.orientation, "general");
    const interpLove = selectInterpretationForYearly(card, picked.orientation, "love");
    const interpMoney = selectInterpretationForYearly(card, picked.orientation, "money");
    const interpCareer = selectInterpretationForYearly(card, picked.orientation, "career");
    const keywords = picked.orientation === "upright" ? (card.keywords?.upright || []) : (card.keywords?.reversed || []);
    const { imageUrl, imageCandidates, proxyImageUrl, localImageUrl } = buildTarotImageSources(card.name, card.id);

    const zodiacFortune = ZODIAC_FORTUNE_DETAIL[monthNum] || {};
    const flowText = [
      zodiacFortune.flow_base || `${zodiac.name}의 달입니다. ${zodiac.traits}의 특성이 더해져 새로운 국면이 열립니다.`,
      `이달의 카드 [${card.nameKr || card.name}${picked.orientation === "reversed" ? "(역)" : ""}] 에너지: ${interpGeneral}`,
    ].filter(Boolean).join(" ");

    const moneyText = [
      zodiacFortune.money_base || "",
      `카드 메시지: ${interpMoney || interpGeneral || "꾸준한 관리와 현명한 선택이 재물 흐름을 안정시킵니다."}`,
    ].filter(Boolean).join(" ");

    const loveText = [
      zodiacFortune.love_base || "",
      `카드 메시지: ${interpLove || interpGeneral || "진심 어린 표현이 관계를 따뜻하게 만듭니다."}`,
    ].filter(Boolean).join(" ");

    const relationText = [
      zodiacFortune.relationship_base || "",
      `카드 에너지: ${interpGeneral || "솔직한 소통이 관계를 풍요롭게 합니다. 주변과의 조화를 유지하세요."}`,
    ].filter(Boolean).join(" ");

    const examText = interpCareer || interpGeneral || "집중력과 꾸준한 노력이 좋은 결과로 이어집니다.";

    return {
      month: monthNum,
      zodiac,
      cardId: picked.cardId,
      name: card.name,
      nameKr: card.nameKr || card.name,
      orientation: picked.orientation,
      flow: flowText,
      money: moneyText,
      love: loveText,
      relationship: relationText,
      exam: examText,
      imageUrl,
      imageCandidates,
      proxyImageUrl,
      localImageUrl,
      keywords: Array.isArray(keywords) ? keywords : [],
    };
  });

  const summary = `12개월의 운명의 수레바퀴가 열렸습니다. 각 월의 카드를 눌러 재물·연애·인간관계·합격운을 확인하세요.`;
  const finalAdvice = `올해는 12지신이 지키는 한 해입니다. 매월의 카드 메시지를 따라 작은 결심 하나하나가 큰 행운으로 이어질 것입니다.`;

  const cardReadings = monthlyReadings.map((m) => ({
    cardId: m.cardId,
    name: m.name,
    nameKr: m.nameKr,
    position: `month_${m.month}`,
    orientation: m.orientation,
    imageUrl: m.imageUrl,
    imageCandidates: m.imageCandidates,
    proxyImageUrl: m.proxyImageUrl,
    localImageUrl: m.localImageUrl,
    keywords: m.keywords,
  }));

  return {
    spreadType: "yearly_twelve_card",
    category: "general",
    cardReadings,
    reading: {
      summary,
      monthlyReadings: monthlyReadings.map((m) => ({
        month: m.month,
        zodiac: m.zodiac,
        flow: m.flow,
        money: m.money,
        love: m.love,
        relationship: m.relationship,
        exam: m.exam,
        cardId: m.cardId,
        nameKr: m.nameKr,
        orientation: m.orientation,
      })),
      finalAdvice,
    },
  };
}

function createJobChangeTarotReading({ drawnCards }) {
  if (!Array.isArray(drawnCards) || drawnCards.length !== 7) {
    throw new Error("이직 타로 리딩에는 7장의 카드가 필요합니다.");
  }

  const lookup = buildCardLookup();
  const cardReadings = drawnCards.map((picked) => {
    const card = lookup.get(picked.cardId);
    if (!card) throw new Error(`카드 ID를 찾을 수 없습니다: ${picked.cardId}`);
    const interpretation = selectInterpretation(card, picked.orientation, "career");
    const keywords =
      picked.orientation === "upright"
        ? card.keywords?.upright || []
        : card.keywords?.reversed || [];
    const { imageUrl, imageCandidates, proxyImageUrl, localImageUrl } = buildTarotImageSources(card.name, card.id);
    return {
      ...picked,
      name: card.name,
      nameKr: card.nameKr || card.name,
      interpretation,
      keywords: Array.isArray(keywords) ? keywords : [],
      suit: card.suit,
      arcanaType: card.arcanaType,
      imageUrl,
      imageCandidates,
      proxyImageUrl,
      localImageUrl,
    };
  });

  const byPos = {};
  cardReadings.forEach((r) => { byPos[r.position] = r; });

  const c1 = byPos.calling;
  const c2 = byPos.happy_direction;
  const c3 = byPos.inner_vocation;
  const c4 = byPos.life_after_move;
  const c5 = byPos.action_steps;
  const c6 = byPos.let_go;
  const c7 = byPos.overall_advice;

  const majorCount = cardReadings.filter((r) => r.arcanaType === "Major").length;
  const positiveSignal = cardReadings.filter((r) => r.orientation === "upright").length;

  const opening = majorCount >= 3
    ? "메이저 아르카나가 다수 등장해 이 이직 고민이 단순한 직업 변경이 아닌 인생 전환의 핵심 갈림길임을 강조합니다."
    : "이번 7카드는 이직을 둘러싼 현실적 흐름과 내면의 나침반을 함께 읽어냅니다.";

  const positiveNote = positiveSignal >= 5
    ? "전반적으로 긍정 에너지가 강해, 솔직한 실행 의지만 더하면 이직이 실제 변화로 연결될 가능성이 높습니다."
    : positiveSignal >= 3
    ? "긍정과 점검이 균형을 이루는 흐름이에요. 신중하게 준비하되 결정을 무기한 미루지 마세요."
    : "여러 카드가 재정비 신호를 보내고 있어요. 지금은 계획을 세우고 내부를 안정화한 뒤 이직을 추진하는 것이 유리합니다.";

  const MIN_SECTION_CHARS = 500;

  function getPositionMeaning(card, posLabel) {
    if (!card) return "";
    const interp = card.interpretation || `${card.nameKr || card.name}가 이 자리에서 중요한 메시지를 전달합니다.`;
    const orientTail = card.orientation === "reversed"
      ? "지금은 방향을 재점검하는 시간이 필요합니다."
      : "이 흐름을 믿고 한 걸음 실행으로 옮겨보세요.";
    return `${interp} ${orientTail}`;
  }

  function keywordsSummary(card) {
    if (!card || !Array.isArray(card.keywords) || !card.keywords.length) {
      return "핵심 키워드: 흐름 파악, 우선순위 정렬, 실행 루틴 고정";
    }
    return `핵심 키워드: ${card.keywords.slice(0, 5).join(", ")}`;
  }

  function ensureMinSectionLength(baseText, relatedCards, sectionName) {
    let text = String(baseText || "").trim();
    const cards = Array.isArray(relatedCards) ? relatedCards.filter(Boolean) : [];

    const cardExpansions = cards.map((card) => {
      return `${cardLabel(card)} 카드의 확장 해석: ${card.interpretation || "현재 단계에서 자신의 패턴을 객관적으로 점검해야 합니다."} ${keywordsSummary(card)}. 이 신호는 단순한 기분 문제가 아니라, 실제 업무환경과 역할 적합도를 다시 측정하라는 의미입니다.`;
    });

    const commonExpansions = [
      "실행 전략: 이번 리딩은 감정적 결론보다 데이터 기반 판단을 권합니다. 채용 공고 10건을 비교해 공통 요구 역량을 추출하고, 본인의 강점과 간극을 3가지 항목으로 명확히 적어 보세요.",
      "리스크 관리: 연봉, 업무 범위, 조직 문화, 성장 경로를 각각 분리해 점검해야 합니다. 하나의 조건만 보고 이동하면 초기 만족감은 높아도 중장기 적합도가 떨어질 수 있습니다.",
      "행동 지침: 이번 주 안에 이력서 1차 업데이트, 포트폴리오 보완, 네트워킹 연락 2건까지 완료해 보세요. 작은 실행이 쌓이면 불안은 줄고 의사결정 정확도는 높아집니다.",
      "정서 관리: 이직 고민에서 가장 흔한 함정은 자기비난과 조급함입니다. 카드는 속도를 늦추라는 뜻이 아니라, 순서를 정밀하게 맞추라는 신호입니다."
    ];

    let i = 0;
    while (text.length < MIN_SECTION_CHARS) {
      const fromCards = cardExpansions.length ? cardExpansions[i % cardExpansions.length] : "";
      const fromCommon = commonExpansions[i % commonExpansions.length];
      const line = fromCards
        ? `${sectionName} 보강 해석: ${fromCards} ${fromCommon}`
        : `${sectionName} 보강 해석: ${fromCommon}`;
      text += `\n\n${line}`;
      i += 1;
      if (i > 16) break;
    }

    return text;
  }

  const stage1Base = `[나의 천직과 진로]\n${opening}\n\n카드 1 '${cardLabel(c1)}'의 메시지: ${getPositionMeaning(c1, "calling")}\n${keywordsSummary(c1)}\n\n카드 2 '${cardLabel(c2)}'의 메시지: ${getPositionMeaning(c2, "happy_direction")}\n${keywordsSummary(c2)}\n\n카드 3 '${cardLabel(c3)}'의 메시지: ${getPositionMeaning(c3, "inner_vocation")}\n${keywordsSummary(c3)}\n\n이 세 카드는 직업 선택의 기준을 '즉시 보상'이 아니라 '지속 가능한 몰입'으로 재정렬하라고 말합니다. 지금 단계에서는 내가 잘하는 일, 오래 해도 소모되지 않는 일, 시장에서 가치로 환산되는 일을 분리해서 정리하는 과정이 핵심입니다.`;

  const stage2Base = `[이직 이후 삶과 실천]\n카드 4 '${cardLabel(c4)}'는 이직 이후의 라이프스타일과 정서적 변화를 보여줍니다: ${getPositionMeaning(c4, "life_after_move")}\n${keywordsSummary(c4)}\n\n카드 5 '${cardLabel(c5)}'는 결심을 현실로 바꾸는 행동 계획을 제시합니다: ${getPositionMeaning(c5, "action_steps")}\n${keywordsSummary(c5)}\n\n핵심은 막연한 기대가 아니라 실행 가능한 루틴입니다. 지원 일정, 역량 보완 일정, 면접 준비 일정을 분리하고, 최소 2주 단위로 체크포인트를 만드는 방식이 실제 전환 확률을 높입니다. 이 파트는 '언젠가'가 아니라 '이번 주 무엇을 할지'를 확정하라는 신호입니다.`;

  const stage3Base = `[포기와 조언]\n카드 6 '${cardLabel(c6)}'는 성공적인 이직을 위해 내려놓아야 할 습관과 집착을 지적합니다: ${getPositionMeaning(c6, "let_go")}\n${keywordsSummary(c6)}\n\n카드 7 '${cardLabel(c7)}'는 전체 방향성에 대한 최종 조언입니다: ${getPositionMeaning(c7, "overall_advice")}\n${keywordsSummary(c7)}\n\n이 조합은 '무엇을 더할지'만큼 '무엇을 버릴지'가 중요하다고 강조합니다. 과거의 실패 기억, 비교 습관, 완벽주의 지연을 줄여야 다음 기회를 실제 성과로 연결할 수 있습니다. 선택의 질은 정보량이 아니라 결단 이후의 실행 일관성에서 결정됩니다.`;

  const finalAdviceBase = `✦ 종합 메시지\n${positiveNote}\n\n이직을 결심할 때 가장 중요한 것은 경제적 조건 하나가 아니라, 성장 가능성·역할 적합도·생활 리듬의 균형을 동시에 맞추는 일입니다. 7장의 카드는 당신이 지금 감정적으로 흔들리는 단계가 아니라 전략을 세울 수 있는 단계에 들어섰음을 보여줍니다. 오늘 리딩 내용을 기록해 30일 실행 계획으로 전환하고, 매주 점검 지표를 통해 보완해 나가세요. 행동 하나가 흐름을 만들고, 그 흐름이 결국 커리어의 방향을 바꿉니다.`;

  const stage1Summary = ensureMinSectionLength(stage1Base, [c1, c2, c3], "1단계");
  const stage2Summary = ensureMinSectionLength(stage2Base, [c4, c5], "2단계");
  const stage3Summary = ensureMinSectionLength(stage3Base, [c6, c7], "3단계");
  const finalAdvice = ensureMinSectionLength(finalAdviceBase, cardReadings, "종합 조언");

  return {
    spreadType: "job_change_seven_card",
    category: "career",
    cardReadings,
    reading: {
      stage1: stage1Summary,
      stage2: stage2Summary,
      stage3: stage3Summary,
      finalAdvice,
      fullText: `${stage1Summary}\n\n${stage2Summary}\n\n${stage3Summary}\n\n${finalAdvice}`,
    },
  };
}

function enhanceTarotReadingPayload({ spreadType, reading, cardReadings }) {
  const normalizedSpread = normalizeSpreadType(spreadType || "one_card");
  const baseReading = reading && typeof reading === "object" ? { ...reading } : reading;
  const safeCards = Array.isArray(cardReadings) ? cardReadings : [];

  function asText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function cardSummaryLine(idx) {
    const card = safeCards[idx];
    if (!card) return "";
    const name = card.nameKr || card.name || `카드 ${idx + 1}`;
    const orientation = card.orientation === "reversed" ? "역방향" : "정방향";
    const pos = card.position || `position_${idx + 1}`;
    return `${pos}의 ${name}(${orientation}) 신호를 실전 행동으로 옮기면 체감 변화가 빨라집니다.`;
  }

  function ensureMinText(value, minChars, fallbackParts) {
    let out = asText(value);
    const seed = (Array.isArray(fallbackParts) ? fallbackParts : [])
      .map(asText)
      .filter(Boolean)
      .join(" ");
    if (!out && seed) out = seed;
    while (out.length < minChars && seed) {
      out += `\n\n${seed}`;
    }
    return out;
  }

  if (!baseReading || typeof baseReading !== "object") {
    return baseReading;
  }

  if (normalizedSpread === "relationship_six_card") {
    const adviceSeed = [
      "상대의 의도를 추측하기보다 확인 질문 1개를 먼저 던져 오해 비용을 줄이세요.",
      "감정이 올라온 순간 메시지를 보내지 말고 10분 텀 이후 핵심만 전달하세요.",
      "이번 주 15분 진심 대화 1회를 고정 일정으로 예약해 관계 리듬을 만드세요.",
      "반복 갈등 주제를 한 문장으로 정의하고, 재발 방지 합의 1개를 만드세요.",
      "상대 반응의 속도보다 일관성을 기준으로 관계 안정도를 판단하세요.",
      "내 경계를 지키는 문장을 미리 준비해 과잉 해명을 줄이세요.",
      "결과 집착이 강한 날엔 관계 판단보다 내 루틴 회복을 우선하세요.",
      "관계 기준 3가지를 글로 고정해 감정 기복 때 의사결정 기준으로 쓰세요.",
    ];

    const positionBreakdown = (Array.isArray(baseReading.positionBreakdown) ? baseReading.positionBreakdown : [])
      .slice(0, 6)
      .map((item, idx) => {
        const coachTail = "핵심은 상대를 통제하는 것이 아니라 대화의 안전지대와 반복 가능한 약속 구조를 만드는 것입니다.";
        return {
          ...item,
          summary: ensureMinText(item?.summary, 260, [cardSummaryLine(idx), coachTail]),
        };
      });

    while (positionBreakdown.length < 6) {
      const idx = positionBreakdown.length;
      positionBreakdown.push({
        title: `포지션 ${idx + 1}`,
        card: safeCards[idx]?.nameKr || safeCards[idx]?.name || `카드 ${idx + 1}`,
        summary: ensureMinText("", 260, [cardSummaryLine(idx), "관계를 건강하게 설계하려면 감정 확인과 현실 조율을 같은 비중으로 다뤄야 합니다."]),
      });
    }

    const advice = Array.isArray(baseReading.advice)
      ? baseReading.advice.map(asText).filter(Boolean)
      : [];
    while (advice.length < 8) {
      advice.push(adviceSeed[advice.length % adviceSeed.length]);
    }

    return {
      ...baseReading,
      overallVibe: ensureMinText(baseReading.overallVibe, 900, ["관계의 결과는 고정값이 아니라 소통 방식과 경계 조율에 따라 달라집니다."]),
      deepReading: ensureMinText(baseReading.deepReading, 900, ["감정 강도보다 전달 방식의 정렬이 관계 안정도와 신뢰를 결정합니다."]),
      realityAndFuture: ensureMinText(baseReading.realityAndFuture, 900, ["단기 결론보다 반복 가능한 약속과 행동 일관성이 미래 결말을 바꿉니다."]),
      positionBreakdown,
      advice: advice.slice(0, 12),
    };
  }

  if (normalizedSpread === "healing_rising_four_card") {
    const plan = Array.isArray(baseReading.actionPlan) ? baseReading.actionPlan.map(asText).filter(Boolean) : [];
    const healingSeed = [
      "감정이 격해질 때는 문제 해결보다 신경계 안정 루틴(호흡, 물 한 잔, 자리 이동)을 먼저 실행하세요.",
      "하루 3줄 감정 기록을 2주 유지해 트리거 패턴을 시각화하세요.",
      "내일의 회복 행동 1개를 시간·장소·행동 형태로 구체화해 실행 확률을 높이세요.",
      "자기비난 문장을 자기돌봄 문장으로 치환하는 연습을 하루 3회 반복하세요.",
      "회복 속도를 타인과 비교하지 말고 어제의 나와 오늘의 나를 비교하세요.",
      "무리한 결단은 뒤로 미루고 몸과 수면의 안정부터 회복하세요.",
    ];
    while (plan.length < 6) plan.push(healingSeed[plan.length % healingSeed.length]);

    return {
      ...baseReading,
      opening: ensureMinText(baseReading.opening, 700, ["치유는 고통을 부정하는 과정이 아니라 감정을 안전하게 다루는 기술을 회복하는 과정입니다."]),
      hiddenTruth: ensureMinText(baseReading.hiddenTruth, 500, [cardSummaryLine(0)]),
      embracePain: ensureMinText(baseReading.embracePain, 500, [cardSummaryLine(1)]),
      silverLining: ensureMinText(baseReading.silverLining, 500, [cardSummaryLine(2)]),
      stepForward: ensureMinText(baseReading.stepForward, 500, [cardSummaryLine(3)]),
      integrationMessage: ensureMinText(baseReading.integrationMessage, 700, ["작은 회복 행동의 반복이 자기신뢰를 재구축하고 장기적 정서 안정으로 이어집니다."]),
      actionPlan: plan,
    };
  }

  if (normalizedSpread === "reunion_lighthouse_five_card") {
    const plan = Array.isArray(baseReading.actionPlan) ? baseReading.actionPlan.map(asText).filter(Boolean) : [];
    const reunionSeed = [
      "메시지 전송 전 핵심 2문장을 먼저 써서 감정 폭주를 막으세요.",
      "상대 반응 지연을 거절로 단정하지 말고 관찰 기간을 두세요.",
      "재회를 원한다면 과거 패턴 중 바꿀 행동 1개를 선행 실행하세요.",
      "추측 대화를 줄이고 사실 확인 질문 중심으로 대화 구조를 전환하세요.",
      "결과 집착이 강한 날에는 내 수면·식사 루틴부터 회복하세요.",
      "재회 여부와 별개로 자기존중 기준을 먼저 문장화해 경계를 지키세요.",
    ];
    while (plan.length < 6) plan.push(reunionSeed[plan.length % reunionSeed.length]);

    return {
      ...baseReading,
      opening: ensureMinText(baseReading.opening, 550, ["재회 리딩의 핵심은 희망 과장도 단정도 아닌, 감정과 현실을 함께 보는 균형입니다."]),
      pastBond: ensureMinText(baseReading.pastBond, 380, [cardSummaryLine(0)]),
      theirNow: ensureMinText(baseReading.theirNow, 380, [cardSummaryLine(1)]),
      outsideFactor: ensureMinText(baseReading.outsideFactor, 380, [cardSummaryLine(2)]),
      theirHeart: ensureMinText(baseReading.theirHeart, 380, [cardSummaryLine(3)]),
      reunionOutcome: ensureMinText(baseReading.reunionOutcome, 420, [cardSummaryLine(4)]),
      lighthouseGuidance: ensureMinText(baseReading.lighthouseGuidance, 480, ["속도를 늦추고 대화의 구조를 정비할수록 재회 가능성 판단의 정확도가 올라갑니다."]),
      actionPlan: plan,
    };
  }

  if (normalizedSpread === "self_esteem_levelup_five_card") {
    const plan = Array.isArray(baseReading.actionPlan) ? baseReading.actionPlan.map(asText).filter(Boolean) : [];
    const selfSeed = [
      "오늘 한 번은 경계 문장을 사용해 과잉 해명을 멈추세요.",
      "하루 끝에 '오늘 나를 지킨 장면' 1개를 기록하세요.",
      "즉답 압박이 올 때 '생각해 보고 답할게요'로 결정권을 회복하세요.",
      "감정이 흔들리는 날은 해결보다 안정 루틴을 먼저 실행하세요.",
      "핵심 카드 1장을 메모 첫 줄에 저장해 행동 기준으로 반복 확인하세요.",
      "자기비난 문장을 자기지지 문장으로 하루 3회 바꿔 말하세요.",
    ];
    while (plan.length < 6) plan.push(selfSeed[plan.length % selfSeed.length]);

    return {
      ...baseReading,
      opening: ensureMinText(baseReading.opening, 650, ["자존감은 단번에 완성되는 상태가 아니라, 경계를 지키는 선택의 반복으로 강화됩니다."]),
      pastDebuff: ensureMinText(baseReading.pastDebuff, 360, [cardSummaryLine(0)]),
      innerMonster: ensureMinText(baseReading.innerMonster, 360, [cardSummaryLine(1)]),
      currentDamage: ensureMinText(baseReading.currentDamage, 360, [cardSummaryLine(2)]),
      mindShield: ensureMinText(baseReading.mindShield, 360, [cardSummaryLine(3)]),
      levelupMastery: ensureMinText(baseReading.levelupMastery, 420, [cardSummaryLine(4)]),
      levelupGuidance: ensureMinText(baseReading.levelupGuidance, 480, ["작은 자기존중 행동의 누적이 내면 기준을 안정적으로 재구축합니다."]),
      actionPlan: plan,
    };
  }

  if (normalizedSpread === "yearly_twelve_card") {
    const monthlyReadings = (Array.isArray(baseReading.monthlyReadings) ? baseReading.monthlyReadings : [])
      .slice(0, 12)
      .map((item, idx) => ({
        ...item,
        flow: ensureMinText(item?.flow, 220, [cardSummaryLine(idx)]),
        money: ensureMinText(item?.money, 160, ["이달의 재정 전략은 현금흐름을 지키고 검증된 선택을 반복하는 것입니다."]),
        love: ensureMinText(item?.love, 160, ["이달의 연애 핵심은 표현 강도보다 일관성과 진심의 누적입니다."]),
        relationship: ensureMinText(item?.relationship, 160, ["이달의 인간관계는 경청과 확인 대화가 갈등 비용을 줄여줍니다."]),
        exam: ensureMinText(item?.exam, 120, ["학습/자기계발은 짧은 루틴을 매일 반복할 때 성과가 누적됩니다."]),
      }));

    while (monthlyReadings.length < 12) {
      const month = monthlyReadings.length + 1;
      monthlyReadings.push({
        month,
        flow: ensureMinText("", 220, ["기본 흐름은 조급함보다 점진적 실행이 유리합니다."]),
        money: "수입과 지출의 균형을 먼저 점검하세요.",
        love: "감정 추측보다 사실 확인 대화를 우선하세요.",
        relationship: "관계는 짧고 정확한 소통에서 회복됩니다.",
        exam: "짧은 집중 루틴을 반복하세요.",
      });
    }

    return {
      ...baseReading,
      summary: ensureMinText(baseReading.summary, 700, ["12개월 리딩은 월별 행동 포인트를 누적할 때 실제 체감 변화가 커집니다."]),
      finalAdvice: ensureMinText(baseReading.finalAdvice, 700, ["월별 메시지를 실행 루틴으로 연결하면 연말에 구조적 성장을 확인할 수 있습니다."]),
      monthlyReadings,
    };
  }

  if (normalizedSpread === "yearly_three_card") {
    const monthlyReadings = (Array.isArray(baseReading.monthlyReadings) ? baseReading.monthlyReadings : []).map((item, idx) => ({
      ...item,
      flow: ensureMinText(item?.flow, 180, [cardSummaryLine(idx % 3)]),
      money: ensureMinText(item?.money, 140, ["재정은 공격보다 유지 전략이 먼저입니다."]),
      love: ensureMinText(item?.love, 140, ["연애는 확답 압박보다 정서적 안전지대 형성이 우선입니다."]),
      relationship: ensureMinText(item?.relationship, 140, ["관계는 반복되는 작은 배려에서 신뢰가 형성됩니다."]),
    }));

    return {
      ...baseReading,
      summary: ensureMinText(baseReading.summary, 700, ["3카드 연간 리딩은 기준-도전-결과의 구조를 월별 행동으로 번역할 때 효과가 큽니다."]),
      finalAdvice: ensureMinText(baseReading.finalAdvice, 700, ["월별 행동 기준을 미리 적어두면 감정 기복에도 방향을 유지할 수 있습니다."]),
      monthlyReadings,
    };
  }

  if (normalizedSpread === "job_change_seven_card") {
    return {
      ...baseReading,
      stage1: ensureMinText(baseReading.stage1, 850, ["천직 판단은 선호·강점·시장가치의 교집합을 문장화할 때 정확도가 올라갑니다."]),
      stage2: ensureMinText(baseReading.stage2, 850, ["이직 성공률은 결심 강도보다 주간 실행 루틴과 점검 지표에서 결정됩니다."]),
      stage3: ensureMinText(baseReading.stage3, 850, ["포기할 습관을 명확히 규정해야 새로운 커리어 패턴이 정착됩니다."]),
      finalAdvice: ensureMinText(baseReading.finalAdvice, 900, ["30일 행동 계획과 주간 점검 루틴을 연결하면 현실 전환 속도가 빨라집니다."]),
      fullText: [
        ensureMinText(baseReading.stage1, 850, ["천직 판단은 선호·강점·시장가치의 교집합을 문장화할 때 정확도가 올라갑니다."]),
        ensureMinText(baseReading.stage2, 850, ["이직 성공률은 결심 강도보다 주간 실행 루틴과 점검 지표에서 결정됩니다."]),
        ensureMinText(baseReading.stage3, 850, ["포기할 습관을 명확히 규정해야 새로운 커리어 패턴이 정착됩니다."]),
        ensureMinText(baseReading.finalAdvice, 900, ["30일 행동 계획과 주간 점검 루틴을 연결하면 현실 전환 속도가 빨라집니다."]),
      ].join("\n\n"),
    };
  }

  if (typeof baseReading.story === "string" || typeof baseReading.advice === "string") {
    return {
      ...baseReading,
      story: ensureMinText(baseReading.story, 1200, ["카드 메시지는 운명 확정이 아니라 현재 선택을 정교화하는 안내 지도입니다.", safeCards.map((_, idx) => cardSummaryLine(idx)).filter(Boolean).join(" ")]),
      advice: ensureMinText(baseReading.advice, 700, ["오늘은 실행 가능한 행동 1개를 시간·장소·행동 단위로 확정해 즉시 시작하세요."]),
    };
  }

  return baseReading;
}

module.exports = {
  drawCards,
  createReading,
  createRelationshipReading,
  createHealingRisingReading,
  createReunionLighthouseReading,
  createSelfEsteemLevelupReading,
  createYearlyFromThreeCardReading,
  createYearlyTwelveCardReading,
  createJobChangeTarotReading,
  getCardImageSourcesById,
  getEngineMeta,
  normalizeCategory,
  normalizeSpreadType,
  enhanceTarotReadingPayload,
  initFromPreloadedData,
};
