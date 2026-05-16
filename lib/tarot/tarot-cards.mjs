const QUESTION_TYPES = [
  "love",
  "relationship",
  "reunion",
  "exMind",
  "currentMind",
  "future",
  "career",
  "money",
  "daily",
  "general",
];

const MAJOR_DEFS = [
  { code: "M00", number: 0, slug: "fool", nameKo: "바보", nameEn: "The Fool", keywords: ["시작", "도약", "모험", "순수"], focus: "새로운 시작" },
  { code: "M01", number: 1, slug: "magician", nameKo: "마법사", nameEn: "The Magician", keywords: ["의지", "실행", "집중", "주도권"], focus: "의지의 발현" },
  { code: "M02", number: 2, slug: "high_priestess", nameKo: "여사제", nameEn: "The High Priestess", keywords: ["직관", "침묵", "내면", "통찰"], focus: "숨은 진심" },
  { code: "M03", number: 3, slug: "empress", nameKo: "여황제", nameEn: "The Empress", keywords: ["풍요", "돌봄", "성장", "안정"], focus: "정서적 풍요" },
  { code: "M04", number: 4, slug: "emperor", nameKo: "황제", nameEn: "The Emperor", keywords: ["질서", "책임", "통제", "기준"], focus: "관계의 규칙" },
  { code: "M05", number: 5, slug: "hierophant", nameKo: "교황", nameEn: "The Hierophant", keywords: ["신뢰", "전통", "약속", "규범"], focus: "신뢰의 프레임" },
  { code: "M06", number: 6, slug: "lovers", nameKo: "연인", nameEn: "The Lovers", keywords: ["선택", "호감", "결합", "조화"], focus: "감정의 선택" },
  { code: "M07", number: 7, slug: "chariot", nameKo: "전차", nameEn: "The Chariot", keywords: ["추진", "속도", "통제", "의지"], focus: "속도 조절" },
  { code: "M08", number: 8, slug: "strength", nameKo: "힘", nameEn: "Strength", keywords: ["인내", "절제", "용기", "회복"], focus: "감정의 절제" },
  { code: "M09", number: 9, slug: "hermit", nameKo: "은둔자", nameEn: "The Hermit", keywords: ["성찰", "거리", "정리", "관찰"], focus: "거리 두기" },
  { code: "M10", number: 10, slug: "wheel_of_fortune", nameKo: "운명의 수레바퀴", nameEn: "Wheel of Fortune", keywords: ["전환", "순환", "타이밍", "변수"], focus: "국면 전환" },
  { code: "M11", number: 11, slug: "justice", nameKo: "정의", nameEn: "Justice", keywords: ["균형", "공정", "책임", "판단"], focus: "균형 회복" },
  { code: "M12", number: 12, slug: "hanged_man", nameKo: "매달린 사람", nameEn: "The Hanged Man", keywords: ["유예", "재해석", "멈춤", "통찰"], focus: "결정 유예" },
  { code: "M13", number: 13, slug: "death", nameKo: "죽음", nameEn: "Death", keywords: ["종결", "변화", "전환", "놓아줌"], focus: "패턴 종료" },
  { code: "M14", number: 14, slug: "temperance", nameKo: "절제", nameEn: "Temperance", keywords: ["조율", "균형", "회복", "완화"], focus: "페이스 조절" },
  { code: "M15", number: 15, slug: "devil", nameKo: "악마", nameEn: "The Devil", keywords: ["집착", "유혹", "중독", "소유"], focus: "집착 분리" },
  { code: "M16", number: 16, slug: "tower", nameKo: "탑", nameEn: "The Tower", keywords: ["붕괴", "충격", "각성", "단절"], focus: "급격한 재편" },
  { code: "M17", number: 17, slug: "star", nameKo: "별", nameEn: "The Star", keywords: ["희망", "회복", "신뢰", "가능성"], focus: "회복의 빛" },
  { code: "M18", number: 18, slug: "moon", nameKo: "달", nameEn: "The Moon", keywords: ["불안", "의심", "환상", "무의식"], focus: "불안 해석" },
  { code: "M19", number: 19, slug: "sun", nameKo: "태양", nameEn: "The Sun", keywords: ["개방", "활력", "기쁨", "명료"], focus: "긍정적 개방" },
  { code: "M20", number: 20, slug: "judgement", nameKo: "심판", nameEn: "Judgement", keywords: ["재평가", "재기회", "각성", "호출"], focus: "관계 재판단" },
  { code: "M21", number: 21, slug: "world", nameKo: "세계", nameEn: "The World", keywords: ["완성", "통합", "성숙", "마무리"], focus: "성숙한 결론" },
];

const SUIT_DEFS = [
  { suit: "wands", code: "W", nameKo: "완드", nameEn: "Wands", element: "fire", tone: "행동과 열정" },
  { suit: "cups", code: "C", nameKo: "컵", nameEn: "Cups", element: "water", tone: "감정과 정서" },
  { suit: "swords", code: "S", nameKo: "소드", nameEn: "Swords", element: "air", tone: "생각과 방어" },
  { suit: "pentacles", code: "P", nameKo: "펜타클", nameEn: "Pentacles", element: "earth", tone: "현실과 안정" },
];

const RANK_DEFS = [
  { number: 1, code: "01", nameKo: "에이스", nameEn: "Ace", keywords: ["시작", "씨앗"], rankTone: "시작점" },
  { number: 2, code: "02", nameKo: "투", nameEn: "Two", keywords: ["선택", "균형"], rankTone: "양가감정" },
  { number: 3, code: "03", nameKo: "쓰리", nameEn: "Three", keywords: ["확장", "소통"], rankTone: "확장 단계" },
  { number: 4, code: "04", nameKo: "포", nameEn: "Four", keywords: ["안정", "정체"], rankTone: "고정 구간" },
  { number: 5, code: "05", nameKo: "파이브", nameEn: "Five", keywords: ["갈등", "흔들림"], rankTone: "충돌 구간" },
  { number: 6, code: "06", nameKo: "식스", nameEn: "Six", keywords: ["회복", "추억"], rankTone: "회복 구간" },
  { number: 7, code: "07", nameKo: "세븐", nameEn: "Seven", keywords: ["방어", "계산"], rankTone: "경계 구간" },
  { number: 8, code: "08", nameKo: "에잇", nameEn: "Eight", keywords: ["압박", "이동"], rankTone: "전환 직전" },
  { number: 9, code: "09", nameKo: "나인", nameEn: "Nine", keywords: ["내면", "마무리"], rankTone: "정리 직전" },
  { number: 10, code: "10", nameKo: "텐", nameEn: "Ten", keywords: ["완성", "종결"], rankTone: "종결 단계" },
  { number: 11, code: "11", nameKo: "페이지", nameEn: "Page", keywords: ["소식", "탐색"], rankTone: "새로운 신호" },
  { number: 12, code: "12", nameKo: "나이트", nameEn: "Knight", keywords: ["돌진", "행동"], rankTone: "급한 전개" },
  { number: 13, code: "13", nameKo: "퀸", nameEn: "Queen", keywords: ["통찰", "관리"], rankTone: "정서적 통제" },
  { number: 14, code: "14", nameKo: "킹", nameEn: "King", keywords: ["책임", "결단"], rankTone: "책임 있는 결론" },
];

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

const SWORD_EIGHT_OVERRIDE = {
  upright: {
    love: ["마음이 묶여 있어 표현하고 싶어도 쉽게 말을 꺼내지 못합니다."],
    reunion: ["연락하고 싶지만 두려움과 자존심 때문에 스스로를 막는 흐름입니다."],
    exMind: ["상대는 상황을 크게 두려워하며, 먼저 움직였다가 상처받을까 경계합니다."],
    career: ["선택지가 없다고 느끼지만 실제로는 탈출구가 열려 있는 카드입니다."],
    daily: ["오늘은 스스로 만든 걱정의 틀을 인식하고 한 걸음 벗어나는 것이 핵심입니다."],
  },
  reversed: {
    love: ["묶였던 감정이 조금씩 풀리며 솔직한 대화의 틈이 열립니다."],
    reunion: ["망설임의 고리가 느슨해져 조심스러운 접촉이 가능해집니다."],
    exMind: ["상대가 방어를 내려놓을 계기를 찾고 있습니다."],
    career: ["답답함에서 벗어나 현실적인 선택지를 다시 보기 시작합니다."],
    daily: ["생각의 과부하를 줄이면 오늘의 흐름이 빠르게 가벼워집니다."],
  },
};

function normalizeText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function cloneMeaning(meaning) {
  const out = {};
  Object.keys(meaning).forEach((key) => {
    const value = meaning[key];
    out[key] = Array.isArray(value) ? value.slice() : [normalizeText(value)];
  });
  return out;
}

function ensureMeaningShape(meaning) {
  const out = cloneMeaning(meaning);
  const defaults = {
    core: ["핵심 흐름을 점검할 시점입니다."],
    light: ["긍정적 가능성이 살아 있습니다."],
    shadow: ["감정의 막힘을 관리해야 합니다."],
    love: ["연애에서는 감정과 속도 조절이 필요합니다."],
    relationship: ["관계에서는 소통의 구조가 중요합니다."],
    reunion: ["재회는 감정과 현실 조건을 함께 봐야 합니다."],
    exMind: ["상대 속마음은 말보다 행동 패턴으로 읽어야 합니다."],
    currentMind: ["현재 심리는 기대와 경계가 공존합니다."],
    future: ["가까운 미래 흐름은 선택의 질에 좌우됩니다."],
    career: ["진로에서는 우선순위와 실행력이 핵심입니다."],
    money: ["금전은 리스크 관리와 현실 판단이 중요합니다."],
    daily: ["오늘은 한 가지 행동에 집중하는 것이 좋습니다."],
    general: ["전체 흐름을 넓게 보고 균형을 잡으세요."],
    advice: ["작은 실행을 반복해 흐름을 안정시키세요."],
  };

  Object.keys(defaults).forEach((key) => {
    if (!Array.isArray(out[key]) || !out[key].length) {
      out[key] = defaults[key].slice();
      return;
    }
    out[key] = out[key].map((line) => normalizeText(line)).filter(Boolean);
    if (!out[key].length) out[key] = defaults[key].slice();
  });

  return out;
}

function buildMeaning({ nameKo, coreKeyword, tone, rankTone, orientation }) {
  const isReversed = orientation === "reversed";
  const lead = isReversed
    ? `${nameKo} 카드 역방향은 흐름이 막히거나 지연된 지점을 보여줍니다.`
    : `${nameKo} 카드 정방향은 에너지가 자연스럽게 움직이는 신호입니다.`;
  const love = isReversed
    ? `연애에서는 ${coreKeyword}이(가) 부담으로 작동해 표현이 꼬일 수 있습니다.`
    : `연애에서는 ${coreKeyword}이(가) 살아나며 감정의 연결이 선명해집니다.`;

  return ensureMeaningShape({
    core: [lead, `${tone} 관점에서 ${rankTone}의 의미가 강하게 작동합니다.`],
    light: [isReversed ? "막힘을 인식하면 회복 속도가 빨라집니다." : "흐름을 타면 기대 이상의 결과를 만들 수 있습니다."],
    shadow: [isReversed ? "조급함이 문제를 키우니 속도를 낮추세요." : "확신이 과해지면 상대 리듬을 놓칠 수 있습니다."],
    love: [love],
    relationship: [isReversed ? "관계에서는 말보다 오해 해소 순서를 먼저 세워야 합니다." : "관계에서는 감정 확인과 합의가 동시에 이뤄질 때 안정됩니다."],
    reunion: [isReversed ? "재회는 서두를수록 멀어질 수 있어 타이밍 조절이 필요합니다." : "재회는 짧고 따뜻한 접점부터 시작할 때 가능성이 올라갑니다."],
    exMind: [isReversed ? "상대는 마음보다 경계가 앞서며 반응을 늦추고 있습니다." : "상대는 감정이 남아 있어도 안전한 방식의 접근을 기다립니다."],
    currentMind: [isReversed ? "현재 심리는 불안과 피로가 앞서 결정을 미루는 상태입니다." : "현재 심리는 기대와 경계가 균형을 맞추는 구간입니다."],
    future: [isReversed ? "가까운 미래는 우회 경로를 찾을 때 풀립니다." : "가까운 미래는 작은 합의가 큰 전환으로 이어집니다."],
    career: [isReversed ? "진로에서는 우선순위 재정렬이 먼저입니다." : "진로에서는 실행 우선순위를 잡으면 성과가 붙습니다."],
    money: [isReversed ? "금전은 보수적 운영이 손실을 줄입니다." : "금전은 계획된 분산과 관리가 수익률을 높입니다."],
    daily: [isReversed ? "오늘은 감정 과부하를 줄이는 루틴이 필요합니다." : "오늘은 한 가지 목표를 끝까지 밀어붙이면 좋습니다."],
    general: [isReversed ? "전체적으로 지연 신호가 있으니 점검이 우선입니다." : "전체적으로 순환이 열려 있어 전진하기 좋은 흐름입니다."],
    advice: [isReversed ? "지금은 확인 질문과 짧은 실행으로 리듬을 회복하세요." : "지금은 작게 시작해 반복하는 방식이 가장 강합니다."],
  });
}

function mergeMeaning(baseMeaning, override) {
  if (!override || typeof override !== "object") return baseMeaning;
  const merged = cloneMeaning(baseMeaning);
  Object.keys(override).forEach((key) => {
    const value = override[key];
    if (Array.isArray(value) && value.length) {
      merged[key] = value.map((line) => normalizeText(line)).filter(Boolean);
    }
  });
  return ensureMeaningShape(merged);
}

function majorCardToTarotCard(def) {
  const upright = buildMeaning({
    nameKo: def.nameKo,
    coreKeyword: def.focus,
    tone: "메이저 아르카나",
    rankTone: "인생 단위의 전환",
    orientation: "upright",
  });
  const reversed = buildMeaning({
    nameKo: def.nameKo,
    coreKeyword: def.focus,
    tone: "메이저 아르카나",
    rankTone: "과제의 재점검",
    orientation: "reversed",
  });

  return {
    id: `major_${def.slug}`,
    code: def.code,
    number: def.number,
    nameKo: def.nameKo,
    nameEn: def.nameEn,
    arcana: "major",
    suit: "major",
    element: "spirit",
    keywords: def.keywords.slice(),
    upright,
    reversed,
    imageKey: def.code.toLowerCase(),
  };
}

function minorCardToTarotCard(suit, rank) {
  const nameKo = `${suit.nameKo} ${rank.nameKo}`;
  const nameEn = `${rank.nameEn} of ${suit.nameEn}`;
  const code = `${suit.code}${rank.code}`;

  const upright = buildMeaning({
    nameKo,
    coreKeyword: suit.tone,
    tone: `${suit.nameKo} 슈트`,
    rankTone: rank.rankTone,
    orientation: "upright",
  });
  const reversed = buildMeaning({
    nameKo,
    coreKeyword: suit.tone,
    tone: `${suit.nameKo} 슈트`,
    rankTone: rank.rankTone,
    orientation: "reversed",
  });

  return {
    id: `${suit.suit}_${rank.nameEn.toLowerCase()}`,
    code,
    number: rank.number,
    nameKo,
    nameEn,
    arcana: "minor",
    suit: suit.suit,
    element: suit.element,
    keywords: [...suit.tone.split(" "), ...rank.keywords],
    upright,
    reversed,
    imageKey: code.toLowerCase(),
  };
}

function applyCardOverrides(card) {
  if (card.code !== "S08") return card;
  return {
    ...card,
    upright: mergeMeaning(card.upright, SWORD_EIGHT_OVERRIDE.upright),
    reversed: mergeMeaning(card.reversed, SWORD_EIGHT_OVERRIDE.reversed),
  };
}

const TAROT_CARDS = [
  ...MAJOR_DEFS.map(majorCardToTarotCard),
  ...SUIT_DEFS.flatMap((suit) => RANK_DEFS.map((rank) => minorCardToTarotCard(suit, rank))),
].map(applyCardOverrides);

const TAROT_CARD_MAP_BY_CODE = new Map(TAROT_CARDS.map((card) => [card.code, card]));
const TAROT_CARD_MAP_BY_ID = new Map(TAROT_CARDS.map((card) => [card.id, card]));

function legacyNumericIdToCardCode(numericId) {
  const n = Number(numericId);
  if (!Number.isFinite(n)) return null;
  const value = Math.max(0, Math.min(77, Math.floor(n)));
  if (value < 22) return `M${String(value).padStart(2, "0")}`;
  const m = value - 22;
  const suit = SUIT_DEFS[Math.floor(m / 14)] || SUIT_DEFS[0];
  const rankNo = (m % 14) + 1;
  return `${suit.code}${String(rankNo).padStart(2, "0")}`;
}

function cardCodeToLegacyNumericId(cardCode) {
  const code = normalizeText(cardCode).toUpperCase();
  if (!code) return null;
  if (code.startsWith("M")) {
    const majorNo = Number(code.slice(1));
    if (Number.isFinite(majorNo) && majorNo >= 0 && majorNo <= 21) return majorNo;
    return null;
  }
  const prefix = code.charAt(0);
  const rankNo = Number(code.slice(1));
  const suitIndex = SUIT_DEFS.findIndex((suit) => suit.code === prefix);
  if (suitIndex < 0 || !Number.isFinite(rankNo) || rankNo < 1 || rankNo > 14) return null;
  return 22 + (suitIndex * 14) + (rankNo - 1);
}

function getTarotCardByAnyId(cardId) {
  const raw = normalizeText(cardId);
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (TAROT_CARD_MAP_BY_CODE.has(upper)) return TAROT_CARD_MAP_BY_CODE.get(upper);
  if (TAROT_CARD_MAP_BY_ID.has(raw)) return TAROT_CARD_MAP_BY_ID.get(raw);

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    const legacyCode = legacyNumericIdToCardCode(numeric);
    if (legacyCode && TAROT_CARD_MAP_BY_CODE.has(legacyCode)) {
      return TAROT_CARD_MAP_BY_CODE.get(legacyCode);
    }
  }

  return null;
}

function buildImageCandidates(cardCode) {
  const code = normalizeText(cardCode).toUpperCase();
  const filename = CARD_TO_FILENAME[code] || "thefool.jpeg";
  return [`/tarot-cards/${filename}`];
}

function getQuestionTypes() {
  return QUESTION_TYPES.slice();
}

export {
  QUESTION_TYPES,
  TAROT_CARDS,
  TAROT_CARD_MAP_BY_CODE,
  TAROT_CARD_MAP_BY_ID,
  CARD_TO_FILENAME,
  getQuestionTypes,
  getTarotCardByAnyId,
  legacyNumericIdToCardCode,
  cardCodeToLegacyNumericId,
  buildImageCandidates,
};
