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
};

const SPREAD_ALIASES = {
  relationshipSixCard: "relationship_six_card",
  healingRisingFourCard: "healing_rising_four_card",
  reunionLighthouseFiveCard: "reunion_lighthouse_five_card",
  selfEsteemLevelupFiveCard: "self_esteem_levelup_five_card",
  yearlyTwelveCard: "yearly_twelve_card",
  yearlyThreeCard: "yearly_three_card",
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

  // If the DB text is noisy/empty (scraped glossary/ad blocks), prefer a keyword-based meaning
  // instead of a generic placeholder. This prevents different cards from collapsing into the
  // same repeated sentence in multi-card readings.
  const kw = card.keywords || {};
  const keywordList = Array.isArray(kw)
    ? kw
    : (orientation === "upright" ? kw.upright : kw.reversed) || [];
  const keywordMeaning = buildKeywordMeaning(keywordList, orientation, "");
  if (keywordMeaning) return keywordMeaning;

  if (category === "general") {
    const structuredGeneral = buildStructuredGeneralMeaning(card, orientation);
    if (structuredGeneral) return structuredGeneral;
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

  // Keep interpretation concise and readable.
  const firstSentence = text.split(/(?<=[.!?。]|다\.)\s+/)[0] || text;
  return firstSentence.slice(0, 140).trim();
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
  const tail =
    orientation === "reversed"
      ? "속도를 늦추고 감정의 오해를 정리하는 것이 중요합니다."
      : "서로의 리듬을 맞추면 관계가 한 단계 진전될 수 있습니다.";
  return `${list.join(", ")} 키워드가 핵심입니다. ${tail}`;
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
      ? "다만 지금은 속도를 늦추고 오해가 생길 지점을 먼저 점검하는 편이 안전합니다."
      : "지금은 방향을 정하고 한 걸음씩 실행하면 흐름이 자연스럽게 풀릴 수 있습니다.";

  // Prefer built-in major meanings when available (clean, non-scraped).
  if (card.id && MAJOR_ARCANA_YEARLY[card.id] && MAJOR_ARCANA_YEARLY[card.id][orientation]?.general) {
    return `${MAJOR_ARCANA_YEARLY[card.id][orientation].general} ${tail}`;
  }

  if (card.suit || card.rank) {
    const suitText = SUIT_GENERAL_MEANING[card.suit] || "핵심 테마";
    const rankText = RANK_GENERAL_MEANING[card.rank] || "현재 단계의 과제";
    return `${suitText} 영역에서 '${rankText}'가 중심입니다. ${tail}`;
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

function toSentence(text, limit = 150) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const firstSentence = cleaned.split(/(?<=[.!?。]|다\.)\s+/)[0] || cleaned;
  return firstSentence.slice(0, limit).trim();
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
    .map((item) => `${buildTransition(item.position, spreadType)} ${item.interpretation}`)
    .join(" ");

  const advice = `질문 카테고리(${normalizedCategory}) 기준으로 보면, 지금은 ${cardReadings
    .map((item) => item.nameKr)
    .join(" -> ")}의 흐름을 순서대로 받아들이는 것이 핵심입니다.`;

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

  /* 상담의 열기: 타로는 미래 예측이 아닌 자아 발견·회복의 도구임을 명시, 따뜻한 경청·공감 */
  const opening = `그동안 많이 힘드셨을 수 있어요. 하지만 괜찮습니다. 
  이 타로 리딩은 미래를 점치는 것이 아니라, 지금 당신 마음속에 있는 이야기를 따뜻하게 비춰보는 자리입니다. ${
    majorCount >= 2 ? "오늘 뽑은 카드들은 깊은 전환의 시기에 있는 당신을 담담하게 지지해 줍니다." : "일상 속에서도 충분히 회복할 수 있는 흐름을 보여줍니다."
  }
  감정은 적이 아니라, 무엇을 돌봐야 하는지 알려주는 안내자예요. 아래 네 장의 카드는 원인 이해 → 감정 수용 → 교훈 → 실천의 순서로, 당신을 다음 단계로 부드럽게 이끕니다.`;

  /* 심리적 통찰: 카드 의미를 심리학적 관점에서 해석, 부정 카드도 성장·회복 계기로 재해석 */
  const hiddenTruth = c1
    ? `이 카드는 지금 당신에게 '상황이 어긋난 진짜 이유'를 전하고 싶어 해요. ${c1.nameKr}${c1.orientation === "reversed" ? "(역)" : ""}의 메시지: ${
        c1.interpretation || "표면 아래 원인을 정확히 바라볼수록 회복 속도가 빨라집니다."
      }
      '누가 틀렸는가'보다 '무엇이 반복되고 있는가'에 초점을 맞추세요. 같은 패턴에 이름을 붙이는 순간, 막연한 혼란은 구체적인 문제로 바뀌고 해결 가능해집니다.`
    : "";

  const embracePain = c2
    ? `그동안 많이 힘드셨군요. ${c2.nameKr}${c2.orientation === "reversed" ? "(역)" : ""}는 당신이 아팠던 지점을 보여줍니다. ${
        c2.interpretation || "지금의 감정은 약함이 아니라, 마음이 회복을 요청하는 신호입니다."
      }
      상처를 지우려 하기보다, '내가 무엇 때문에 아팠는지'를 한 문장으로 말해보세요. 감정이 언어가 되는 순간, 다룰 수 있는 정보가 됩니다.`
    : "";

  const silverLining = c3
    ? `이 카드는 이번 경험이 남긴 빛을 말해 줍니다. ${c3.nameKr}${c3.orientation === "reversed" ? "(역)" : ""}: ${
        c3.interpretation || "아픔을 통과하며 생기는 통찰이 다음 선택을 더 단단하게 만듭니다."
      }
      '왜 이런 일이 있었는가'에서 멈추지 말고, '그래서 나는 무엇을 배우는가'로 시선을 옮기세요. 반응 방식이 달라지면 인생의 질이 달라집니다.`
    : "";

  const stepForward = c4
    ? `당신 안에 잠든 밝은 빛을 찾을 수 있는 실천이에요. ${c4.nameKr}${c4.orientation === "reversed" ? "(역)" : ""}가 전하는 방향: ${
        c4.interpretation || "작지만 구체적인 행동이 에너지 회복의 스위치를 켭니다."
      }
      거대한 결심보다 오늘 바로 할 수 있는 아주 작은 행동이 중요합니다. 스스로를 다시 신뢰하게 되는 순간은 '작은 실행이 누적되는 때'예요.`
    : "";

  /* 행동 코칭: 1~3가지 구체적·실현 가능한 미션 (예: 매일 아침 햇살 5분 명상, 칭찬 일기) */
  const actionPlan = [
    groundingNeeded
      ? "오늘은 큰 결정은 미루고, 호흡 1분·물 한 잔·15분 산책으로 신경계를 먼저 안정시키세요."
      : "지금 떠오르는 가장 작은 실행 1가지를 20분 안에 완료해 보세요. 에너지의 흐름이 열립니다.",
    "매일 아침 햇살 받으며 5분만 눈을 감고 숨 쉬기, 또는 자신을 칭찬하는 문장을 한 줄 적어 보세요.",
    "오늘 밤 자기 전, 내일의 첫 행동을 '시간·장소'까지 정해 캘린더에 적어 두세요.",
    "이번 리딩에서 가장 마음에 남는 카드 한 장의 문장을 메모해 두고, 하루에 세 번 읽어 보세요.",
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

  /* 따뜻한 마무리: 잠재된 긍정 에너지를 믿고 격려하는 임파워링 메시지 */
  const integrationMessage = `네 장의 카드를 함께 보면, 지금의 당신은 '감정 회피'가 아니라 '감정 통합'의 단계에 들어와 있어요. 
  원인을 직시하고 감정을 인정한 순간, 이미 절반은 회복한 상태입니다. 
  오늘의 작은 실천 하나가 내일의 자존감을 되돌리고, 그 자존감이 다시 선택의 품질을 높여줍니다. 
  당신 안에는 이미 다시 일어설 빛이 있어요. 이 리딩은 그 출발점을 확인해 준 신호입니다. 믿어 주세요.`;

  const promptEngineering = {
    system:
      "You are an expert psychologist and coach (like Dr. Oh Eun-young): warm, clear, and empowering. Interpret tarot in a CBT/positive psychology frame. Even 'negative' cards are reframed as growth and recovery. Provide 1-3 concrete, doable missions. Tone: '그동안 많이 힘드셨군요. 하지만 괜찮습니다.' style—authoritative yet kind.",
    userTemplate:
      "Spread: Sun & Light Healing (4 cards)\n1) Hidden Truth 2) Embrace the Pain 3) Silver Lining 4) Step Forward\nCards: {{cards}}\nWrite in Korean: emotional validation, psychological insight, then specific action steps. No jargon; empowering close.",
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
    const src = interpSources[idx % 3];
    const srcNext = interpSources[(idx + 1) % 3];

    const flowText = `${zodiac.name}의 달입니다. ${zodiac.traits}의 기운이 당신을 감쌉니다. ${src.g || baseInterp} 이 달에는 ${zodiac.name}의 특성이 더해져 새로운 국면이 열립니다.`;

    const moneyText = src.m || src.g || "꾸준한 관리와 현명한 선택이 재물 흐름을 안정시킵니다.";
    const loveText = src.l || src.g || "진심 어린 표현이 관계를 따뜻하게 만듭니다.";
    const relationText = `${zodiac.traits}의 기운으로 주변과의 조화가 중요합니다. ${srcNext.g || "솔직한 소통이 관계를 풍요롭게 합니다."}`;

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

// ─── 12카드 월별 스프레드: 메이저 아르카나 내장 해석 (DB 품질 보완) ───
const MAJOR_ARCANA_YEARLY = {
  M00: { upright: { general: "새로운 출발이 열리는 시점입니다. 계산보다 신뢰가 더 큰 기회를 만듭니다.", love: "관계에서 솔직함과 가벼운 용기가 흐름을 바꿉니다.", money: "새로운 수입 경로를 실험할 수 있지만 기본 안전장치는 먼저 확보하세요.", career: "익숙한 틀을 벗어난 제안이 성장 기회로 연결됩니다." }, reversed: { general: "성급한 판단이 손실로 이어질 수 있으니 속도를 낮추세요.", love: "감정의 즉흥성이 오해를 만들 수 있어 의도 확인이 필요합니다.", money: "검증되지 않은 투자는 피하고 지출 통제를 먼저 하세요.", career: "준비 없는 도전보다 역량 보강 후 실행이 유리합니다." } },
  M01: { upright: { general: "주도권을 쥐고 실행력이 발휘되는 시기입니다. 능력이 인정받습니다.", love: "관계에서 솔직한 표현이 호감을 더합니다.", money: "계획과 실행이 맞물면 수익이 나옵니다.", career: "역량 발휘와 새로운 도전이 성과로 이어집니다." }, reversed: { general: "준비가 덜 된 상태에서 무리하지 마세요.", love: "오해를 피하려면 의도를 분명히 전달하세요.", money: "검증되지 않은 투자는 보류하세요.", career: "역량 보강 후 실행이 유리합니다." } },
  M02: { upright: { general: "직관과 내면의 목소리에 귀 기울이세요. 비밀스러운 기회가 있을 수 있습니다.", love: "겉보다 속마음이 더 중요한 국면입니다.", money: "숨김 없는 정보 수집이 판단에 도움이 됩니다.", career: "침묵과 관찰이 다음 행동을 이끕니다." }, reversed: { general: "이중적인 상황을 피하려면 솔직함이 필요합니다.", love: "비밀이 오해를 키울 수 있어 소통이 중요합니다.", money: "불확실한 정보에 의존하지 마세요.", career: "숨겨진 의도를 파악하는 것이 우선입니다." } },
  M03: { upright: { general: "자연스럽게 성과가 자라나는 국면입니다. 돌봄과 지속성이 핵심입니다.", love: "관계가 따뜻하게 성장하기 좋은 시기이며 안정감이 강화됩니다.", money: "씨앗형 투자와 장기 플랜이 수익으로 연결될 가능성이 높습니다.", career: "팀 케어와 크리에이티브 역량이 성과를 크게 끌어올립니다." }, reversed: { general: "에너지 고갈이나 과몰입을 점검해야 합니다. 균형 회복이 먼저입니다.", love: "지나친 간섭이 친밀감을 약화시킬 수 있어 경계가 필요합니다.", money: "과소비를 줄이고 현금흐름을 안정화해야 합니다.", career: "성과 압박보다 업무 구조를 재정비하는 것이 우선입니다." } },
  M04: { upright: { general: "규칙과 권위가 안정을 가져옵니다. 경계를 분명히 하세요.", love: "책임과 역할 분담이 관계를 안정시킵니다.", money: "계획적 소비와 저축이 재정을 튼튼하게 합니다.", career: "리더십과 원칙이 성과를 이끕니다." }, reversed: { general: "경직된 태도보다 유연한 조정이 필요합니다.", love: "지나친 통제가 관계를 멀게 할 수 있습니다.", money: "과한 절약보다 적정선 유지가 중요합니다.", career: "권위적 태도보다 협동이 성과를 높입니다." } },
  M05: { upright: { general: "전통과 가르침이 길을 밝혀줍니다. 멘토가 도움이 됩니다.", love: "약속과 원칙이 관계를 지키는 기둥이 됩니다.", money: "검증된 방식으로 꾸준히 관리하세요.", career: "선배나 멘토의 조언이 귀합니다." }, reversed: { general: "틀에 갇히지 말고 새로운 관점을 찾아보세요.", love: "원칙보다 서로의 감정이 먼저입니다.", money: "과한 보수는 기회를 놓칠 수 있습니다.", career: "규칙보다 상황에 맞는 판단이 필요합니다." } },
  M06: { upright: { general: "선택과 조화의 시기입니다. 서로를 인정하는 선택이 중요합니다.", love: "서로를 선택하고 맞춰가는 핵심 순간입니다.", money: "협업이 더 큰 수익을 만듭니다.", career: "동반자 의식이 프로젝트를 성공시킵니다." }, reversed: { general: "갈등보다 대화로 해결을 찾으세요.", love: "오해를 풀기 위해 먼저 다가가세요.", money: "혼자보다 함께가 더 유리합니다.", career: "파트너십 재정비가 필요할 수 있습니다." } },
  M07: { upright: { general: "추진력과 목표 지향이 승리로 이어집니다.", love: "관계에서 방향을 정하면 진전이 빨라집니다.", money: "실행력이 수익을 만듭니다.", career: "끝까지 밀어붙이면 성과가 나옵니다." }, reversed: { general: "속도보다 방향 점검이 먼저입니다.", love: "감정보다 방향성 합의가 필요합니다.", money: "과한 추진은 리스크를 키울 수 있습니다.", career: "일단 멈추고 전략을 재검토하세요." } },
  M08: { upright: { general: "인내와 부드러운 힘이 상황을 극복합니다.", love: "통제보다 이해가 관계를 이끕니다.", money: "꾸준함이 장기 수익을 만듭니다.", career: "부드러운 리더십이 팀을 이끕니다." }, reversed: { general: "자신감 부족을 점검하고 스스로를 믿으세요.", love: "지나친 양보가 관계를 흐릴 수 있습니다.", money: "과한 소극은 기회를 놓칩니다.", career: "주도권을 갖고 나서세요." } },
  M09: { upright: { general: "고독과 내면 성찰이 다음 단계를 준비합니다.", love: "거리와 공간이 관계를 성숙시킵니다.", money: "신중한 검토 후 결정하세요.", career: "숙고와 준비가 성과의 기반이 됩니다." }, reversed: { general: "고립보다 적절한 소통이 필요합니다.", love: "멀어짐 보다 먼저 대화를 시도하세요.", money: "지나친 신중은 기회를 놓칠 수 있습니다.", career: "혼자보다 함께 논의가 도움이 됩니다." } },
  M10: { upright: { general: "운명의 수레바퀴가 돌아갑니다. 변화를 받아들이세요.", love: "관계에서 새로운 국면이 열립니다.", money: "흐름이 바뀌는 시기입니다. 유연하게 대응하세요.", career: "상황 변화에 맞춰 전략을 조정하세요." }, reversed: { general: "변화를 피하더라도 흐름은 옵니다. 준비하세요.", love: "역경이 관계를 더 단단하게 할 수 있습니다.", money: "하락 국면은 일시적일 수 있습니다.", career: "변화를 기회로 삼으세요." } },
  M11: { upright: { general: "공정과 균형이 결과를 가져옵니다. 객관적으로 판단하세요.", love: "정의와 솔직함이 관계를 지킵니다.", money: "계약과 조건을 명확히 하세요.", career: "공정한 평가가 성과를 인정합니다." }, reversed: { general: "편견을 내려놓고 다시 보세요.", love: "한쪽만 희생하면 관계가 기울어집니다.", money: "불공정한 조건은 피하세요.", career: "객관적 자료로 판단하세요." } },
  M12: { upright: { general: "잠시 멈추고 뒤돌아보는 시기입니다. 시련이 성장을 줍니다.", love: "기다림이 관계를 더 깊게 할 수 있습니다.", money: "지출을 줄이고 현금을 유지하세요.", career: "인내가 결국 승리로 이어집니다." }, reversed: { general: "희생이 과하면 본인을 돌보세요.", love: "한쪽만 희생하면 관계가 무너집니다.", money: "무리한 지출을 멈추세요.", career: "방향 전환이 필요할 수 있습니다." } },
  M13: { upright: { general: "끝과 새 시작이 맞닿아 있습니다. 변화를 받아들이세요.", love: "관계의 전환점이 올 수 있습니다.", money: "구조 조정이 새로운 흐름을 만듭니다.", career: "마무리와 재시작이 동시에 옵니다." }, reversed: { general: "변화를 피하려 해도 흐름은 옵니다.", love: "과거를 끊고 새로 시작할 용기가 필요합니다.", money: "고착된 구조를 바꿀 시기입니다.", career: "전환을 기회로 삼으세요." } },
  M14: { upright: { general: "균형과 조화가 핵심입니다. 인내와 절제가 결과를 만듭니다.", love: "서로의 리듬을 맞추면 관계가 진전됩니다.", money: "수입과 지출의 균형을 맞추세요.", career: "협업과 조율이 성과를 높입니다." }, reversed: { general: "균형이 깨졌다면 원인을 찾아 복구하세요.", love: "한쪽만 맞추면 관계가 기울어집니다.", money: "과소비나 과절약을 점검하세요.", career: "업무 분배를 재조정하세요." } },
  M15: { upright: { general: "유혹과 집착을 의식하고 자유를 선택하세요.", love: "관계에서 의존보다 독립이 필요합니다.", money: "충동적 소비와 투자를 경계하세요.", career: "구속된 패턴에서 벗어나세요." }, reversed: { general: "집착에서 해방되는 시기가 올 수 있습니다.", love: "의존 관계를 끊고 스스로를 세우세요.", money: "불필요한 지출을 줄이세요.", career: "틀에 갇힌 생각을 버리세요." } },
  M16: { upright: { general: "갑작스러운 변화가 올 수 있습니다. 받아들이면 새 시작이 됩니다.", love: "충격적 사건이 관계를 시험할 수 있습니다.", money: "예상치 못한 지출에 대비하세요.", career: "구조 변화가 올 수 있지만 기회가 됩니다." }, reversed: { general: "변화를 피하더라도 준비는 하세요.", love: "위기에서 관계가 더 단단해질 수 있습니다.", money: "비상 자금을 확보하세요.", career: "변화를 기회로 전환하세요." } },
  M17: { upright: { general: "희망과 잠재력이 빛납니다. 어둠이 지나가고 있습니다.", love: "관계에서 희망을 품고 다가가세요.", money: "새로운 수입 경로가 열릴 수 있습니다.", career: "잠재력이 발휘되는 시기입니다." }, reversed: { general: "희망을 놓지 말고 작은 것부터 시작하세요.", love: "거리가 멀어져도 마음은 이어지세요.", money: "일시적 어려움은 지나갑니다.", career: "포기하지 말고 꾸준히 하세요." } },
  M18: { upright: { general: "불확실한 그림자가 있지만 직관을 믿으세요.", love: "속마음이 숨겨져 있을 수 있어 소통이 중요합니다.", money: "정보가 불명확하면 결정을 미루세요.", career: "숨겨진 의도를 파악하는 것이 중요합니다." }, reversed: { general: "공포가 현실보다 클 수 있습니다. 사실을 확인하세요.", love: "오해를 풀기 위해 먼저 대화하세요.", money: "불확실한 투자는 보류하세요.", career: "의심을 풀고 협력하세요." } },
  M19: { upright: { general: "활력과 성공이 빛납니다. 어둠이 지나가고 있습니다.", love: "관계가 따뜻하고 밝게 유지됩니다.", money: "수익과 성과가 좋은 시기입니다.", career: "성과가 인정받고 승진 가능성이 있습니다." }, reversed: { general: "일시적 어둠이 있어도 곧 밝아집니다.", love: "작은 소통이 관계를 밝게 합니다.", money: "일시적 저조는 회복됩니다.", career: "잠시 멈춰도 다시 빛날 것입니다." } },
  M20: { upright: { general: "용서와 재기회가 옵니다. 과거를 정리하고 새로 시작하세요.", love: "화해와 재회의 가능성이 있습니다.", money: "과거의 실수가 정리되면 새 흐름이 열립니다.", career: "재평가와 재기회가 올 수 있습니다." }, reversed: { general: "자기 용서가 먼저입니다.", love: "과거를 끊고 새로 시작할 용기가 필요합니다.", money: "미뤄둔 정리를 하세요.", career: "자기 평가를 다시 하세요." } },
  M21: { upright: { general: "완성과 성취의 시기입니다. 한 해의 결실을 맺습니다.", love: "관계가 안정되고 깊어집니다.", money: "장기 노력이 수익으로 연결됩니다.", career: "목표 달성과 인정을 받는 시기입니다." }, reversed: { general: "완성이 아직이라면 마무리 단계입니다.", love: "관계가 성숙해가는 중입니다.", money: "마지막 단계까지 꾸준히 하세요.", career: "마무리와 마무리가 중요합니다." } },
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

    const flowText = interpGeneral || `${card.nameKr || card.name}${picked.orientation === "reversed" ? "(역)" : ""}의 기운이 ${zodiac.name}의 달을 이끕니다. ${zodiac.traits}의 특성이 더해져 새로운 국면이 열립니다.`;
    const moneyText = interpMoney || interpGeneral || "꾸준한 관리와 현명한 선택이 재물 흐름을 안정시킵니다.";
    const loveText = interpLove || interpGeneral || "진심 어린 표현이 관계를 따뜻하게 만듭니다.";
    const relationText = interpGeneral || "솔직한 소통이 관계를 풍요롭게 합니다. 주변과의 조화를 유지하세요.";
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

module.exports = {
  drawCards,
  createReading,
  createRelationshipReading,
  createHealingRisingReading,
  createReunionLighthouseReading,
  createSelfEsteemLevelupReading,
  createYearlyFromThreeCardReading,
  createYearlyTwelveCardReading,
  getCardImageSourcesById,
  getEngineMeta,
  normalizeCategory,
  normalizeSpreadType,
  initFromPreloadedData,
};
