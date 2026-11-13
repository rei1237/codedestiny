import { TAROT_CARDS, buildImageCandidates } from "./tarot-cards.mjs";
import { buildCaretaroCardImageUrl } from "./caretaro-card-images.mjs";

function normalizeDreamText(payload) {
  const text = String(payload?.dreamText || payload?.dreamContent || "").trim();
  if (!text) return { ok: false, message: "꿈의 장면을 입력해 주세요." };
  if (text.length < 8) return { ok: false, message: "꿈의 장면을 조금 더 자세히 적어 주세요. 최소 8자 이상이 필요합니다." };
  if (text.length > 6000) return { ok: false, message: "꿈의 장면이 너무 깁니다. 6000자 이내로 적어 주세요." };
  return { ok: true, text };
}

// 메이저 22장의 꿈 해석 문장은 손으로 쓴 원본을 그대로 보존한다(코드 키로 이관).
// 마이너 56장은 tarot-cards.mjs 의 카드별 psychologicalMeaning 에 슈트 렌즈를 얹어 파생한다.
const DREAM_MEANING_BY_MAJOR_CODE = {
  M00: "익숙한 경계 밖으로 나가려는 마음이 떠오릅니다. 두려움보다 가능성의 문이 먼저 열립니다.",
  M01: "흩어진 재료를 하나의 의식으로 묶으려는 힘이 강하게 떠오릅니다. 마음속 도구가 깨어나는 징조입니다.",
  M02: "겉으로 드러나지 않은 감정과 기억이 물밑에서 움직입니다. 침묵 속의 신호가 선명해지는 때입니다.",
  M03: "몸과 감정이 더 부드러운 안식처를 찾고 있습니다. 관계와 창조성의 온기가 흐릅니다.",
  M04: "흔들리는 상황을 붙들고 싶은 의지가 드러납니다. 경계와 구조를 다시 세우려는 마음입니다.",
  M05: "오래된 믿음과 사회적 약속이 꿈의 배경에 머무릅니다. 배운 것과 진짜 마음 사이의 문턱이 비칩니다.",
  M06: "누군가와의 연결, 혹은 자기 안의 두 갈래 마음이 서로를 부릅니다. 중요한 선택의 온도가 흐릅니다.",
  M07: "움직이고 돌파하려는 힘이 강합니다. 속도와 통제 사이의 균형이 꿈속에서 시험받습니다.",
  M08: "거친 감정과 본능을 부드럽게 다루려는 힘이 떠오릅니다. 억누름보다 다정한 통제가 필요합니다.",
  M09: "혼자만의 길에서 답을 찾으려는 마음이 비칩니다. 외부보다 내면의 등불이 가까워집니다.",
  M10: "반복되던 흐름이 다른 국면으로 돌아서려 합니다. 우연처럼 보이는 변화가 문턱에 머무릅니다.",
  M11: "마음이 어떤 선택의 무게를 재고 있습니다. 공정함과 죄책감의 저울이 꿈속에 놓입니다.",
  M12: "멈춤 속에서 다른 시야가 열립니다. 당장 움직이기보다 거꾸로 바라볼 시간이 다가옵니다.",
  M13: "끝난 것을 놓고 새 껍질로 건너가려는 흐름입니다. 상실보다 변형의 기운이 깊습니다.",
  M14: "서로 다른 감정의 물줄기가 한 그릇 안에서 섞입니다. 치유와 조절의 리듬이 흐릅니다.",
  M15: "끊기 어려운 유혹이나 두려움이 그림자처럼 붙어 있습니다. 묶인 곳을 알아차리는 꿈입니다.",
  M16: "붙들고 있던 구조가 흔들리며 숨은 진실이 드러납니다. 추락과 폭발은 갑작스러운 각성을 가리킵니다.",
  M17: "어두운 장면 속에서도 회복의 빛이 남아 있습니다. 소망과 미래의 감각이 조용히 비칩니다.",
  M18: "모호한 감정과 상징이 깊은 밤의 물결처럼 출렁입니다. 불안은 숨은 직감의 문을 두드립니다.",
  M19: "어둠 뒤에 밝아지는 이해가 떠오릅니다. 몸과 마음이 더 단순한 진실을 향합니다.",
  M20: "과거의 장면이 다시 떠올라 새로운 응답을 요구합니다. 오래 미뤄둔 부름이 선명해집니다.",
  M21: "흩어진 경험이 하나의 원으로 묶이려 합니다. 마침과 시작이 같은 문에서 만납니다.",
};

// 꿈 상징 ↔ 타로 슈트 대응(물→컵, 불→완드, 돈·현실→펜타클, 갈등·생각→소드).
const DREAM_SUIT_LENS = {
  wands: "꿈속의 불·열기·움직임은 아직 쓰이지 않은 의욕이 몸을 두드리는 신호로 읽힙니다.",
  cups: "꿈속의 물·눈물·잔은 말로 옮겨지지 않은 감정이 수위를 올리는 자리로 읽힙니다.",
  swords: "꿈속의 말·칼날·바람은 생각이 감정보다 앞서 달릴 때 나타나는 긴장으로 읽힙니다.",
  pentacles: "꿈속의 땅·돈·몸은 현실의 조건과 안전감이 흔들릴 때 먼저 반응하는 자리로 읽힙니다.",
};

const DREAM_SUIT_LABEL = {
  major: "메이저 아르카나",
  wands: "완드(불)",
  cups: "컵(물)",
  swords: "소드(공기)",
  pentacles: "펜타클(흙)",
};

const DREAM_ELEMENT_LABEL = {
  spirit: "정신",
  fire: "불",
  water: "물",
  air: "공기",
  earth: "흙",
};

// 메이저 22장의 점성술 대응(골든던 표준). 마이너는 슈트 원소가 그 역할을 한다.
const MAJOR_ASTROLOGY_BY_CODE = {
  M00: "천왕성 / 공기",
  M01: "수성",
  M02: "달",
  M03: "금성",
  M04: "양자리",
  M05: "황소자리",
  M06: "쌍둥이자리",
  M07: "게자리",
  M08: "사자자리",
  M09: "처녀자리",
  M10: "목성",
  M11: "천칭자리",
  M12: "해왕성 / 물",
  M13: "전갈자리",
  M14: "사수자리",
  M15: "염소자리",
  M16: "화성",
  M17: "물병자리",
  M18: "물고기자리",
  M19: "태양",
  M20: "명왕성 / 불",
  M21: "토성",
};

function firstText(value, fallback = "") {
  if (Array.isArray(value)) return String(value[0] || "").trim() || fallback;
  return String(value || "").trim() || fallback;
}

function buildDreamMeaning(card) {
  const preserved = DREAM_MEANING_BY_MAJOR_CODE[card.code];
  if (preserved) return preserved;
  const psychological = firstText(card.upright?.psychologicalMeaning) || firstText(card.upright?.coreMeaning);
  const lens = DREAM_SUIT_LENS[card.suit] || "";
  return [psychological, lens].filter(Boolean).join(" ");
}

// 라이더-웨이트 78장 전체를 꿈 상담용 뷰로 변환한다(메이저 22 + 마이너 56).
const DREAM_TAROT_CARDS = TAROT_CARDS.map((card) => ({
  id: card.code,
  code: card.code,
  name: card.nameEn,
  nameKo: card.nameKo,
  arcana: card.arcana,
  suit: card.suit,
  suitLabel: DREAM_SUIT_LABEL[card.suit] || card.suit,
  element: card.element,
  elementLabel: DREAM_ELEMENT_LABEL[card.element] || card.element,
  number: card.number,
  astrology: MAJOR_ASTROLOGY_BY_CODE[card.code] || "",
  keywords: (card.keywords || []).slice(0, 3),
  uprightKeywords: (card.upright?.keywords || card.keywords || []).slice(0, 5),
  reversedKeywords: (card.reversed?.keywords || []).slice(0, 5),
  dreamMeaning: buildDreamMeaning(card),
  uprightMeaning: firstText(card.upright?.coreMeaning),
  reversedMeaning: firstText(card.reversed?.coreMeaning),
}));

const DREAM_TAROT_CARD_BY_CODE = new Map(DREAM_TAROT_CARDS.map((card) => [card.code, card]));

// suitWeight: 그 슈트가 주제 자체인 규칙(물→컵, 돈→펜타클, 갈등→소드)일수록 높게 준다.
// 지목한 메이저 점수(12/10/8)와 겨룰 수 있어야 마이너 56장이 실제로 뽑힌다.
const DREAM_THEME_RULES = [
  { pattern: /(떨어|추락|낙하|무너|붕괴|폭발|지진)/i, cards: ["M16", "M18", "M12"], suits: ["swords"], suitWeight: 8, themes: ["추락", "통제 상실", "각성"] },
  { pattern: /(날|비행|하늘|구름|새|공중)/i, cards: ["M00", "M17", "M19"], suits: ["wands", "swords"], suitWeight: 8, themes: ["자유", "도약", "가능성"] },
  { pattern: /(물|바다|강|호수|비|홍수|파도|잠수)/i, cards: ["M18", "M14", "M02"], suits: ["cups"], suitWeight: 14, themes: ["감정", "무의식", "정화"] },
  { pattern: /(쫓|도망|괴물|귀신|공포|위협|숨)/i, cards: ["M15", "M18", "M07"], suits: ["swords"], suitWeight: 10, themes: ["두려움", "그림자", "회피"] },
  { pattern: /(죽|장례|무덤|끝|헤어|이별|사라)/i, cards: ["M13", "M20", "M10"], suits: ["cups", "swords"], suitWeight: 8, themes: ["종결", "변형", "재탄생"] },
  { pattern: /(집|방|문|계단|학교|회사|사무실|건물)/i, cards: ["M04", "M05", "M09"], suits: ["pentacles"], suitWeight: 10, themes: ["구조", "역할", "내면의 방"] },
  { pattern: /(가족|엄마|아빠|아이|아기|연인|친구|결혼)/i, cards: ["M06", "M03", "M11"], suits: ["cups"], suitWeight: 14, themes: ["관계", "애착", "선택"] },
  { pattern: /(시험|지각|실패|점수|판단|혼남)/i, cards: ["M11", "M05", "M09"], suits: ["swords", "pentacles"], suitWeight: 10, themes: ["평가", "책임", "불안"] },
  { pattern: /(차|기차|버스|길|여행|운전|역|공항)/i, cards: ["M07", "M10", "M00"], suits: ["wands"], suitWeight: 8, themes: ["이동", "전환", "진로"] },
  // '말'은 한국어에서 speech 로 쓰이는 경우가 압도적이라 동물 패턴에서 뺀다(말다툼 오탐).
  { pattern: /(동물|개|고양이|뱀|사자|호랑이|새)/i, cards: ["M08", "M18", "M15"], suits: ["wands"], suitWeight: 8, themes: ["본능", "감각", "그림자"] },
  { pattern: /(거울|얼굴|알몸|몸|피부|머리|눈)/i, cards: ["M02", "M11", "M18"], suits: ["cups", "pentacles"], suitWeight: 8, themes: ["자기상", "비밀", "민감함"] },
  { pattern: /(불|화재|태양|빛|번개|뜨거)/i, cards: ["M19", "M16", "M01"], suits: ["wands"], suitWeight: 14, themes: ["열망", "폭로", "활력"] },
  { pattern: /(돈|월급|빚|집값|계약|투자|가난|부자)/i, cards: ["M10", "M04"], suits: ["pentacles"], suitWeight: 16, themes: ["현실 조건", "안전감", "생계"] },
  { pattern: /(싸우|다투|화가|욕|소리|말다툼|배신|거짓)/i, cards: ["M11", "M16"], suits: ["swords"], suitWeight: 16, themes: ["갈등", "언어", "경계"] },
];

function clampDreamCardCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 3;
  return Math.max(1, Math.min(5, parsed));
}

function compactDreamText(text, limit = 260) {
  const compact = String(text || "").replace(/\s+/g, " ").trim();
  return compact.length > limit ? `${compact.slice(0, limit - 1)}…` : compact;
}

function uniqueList(items, limit = 8) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    const value = String(item || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

function seededIndex(text, offset, modulo) {
  let hash = 17 + offset * 31;
  const source = String(text || "");
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 33 + source.charCodeAt(i) + offset) >>> 0;
  }
  return modulo > 0 ? hash % modulo : 0;
}

function inferDreamThemes(dreamText) {
  const themes = [];
  for (const rule of DREAM_THEME_RULES) {
    if (rule.pattern.test(dreamText)) themes.push(...rule.themes);
  }
  return uniqueList(themes.length ? themes : ["무의식", "감정의 잔향", "내면의 전환"], 5);
}

// 정/역방향은 서버에서 꿈 원문 시드로 확정한다. 클라이언트가 따로 뽑으면
// 화면의 역방향 배지와 서버가 만든 프롬프트 문구가 어긋난다.
function decideOrientation(dreamText, code, position) {
  return seededIndex(`${dreamText}|${code}`, position + 7, 10) < 3;
}

function decorateDreamCard(card, { dreamText, position, env }) {
  const localFallback = (buildImageCandidates(card.code)[0] || "").replace(/\.jpe?g$/iu, ".webp");
  return {
    ...card,
    isReversed: decideOrientation(dreamText, card.code, position),
    imageUrl: buildCaretaroCardImageUrl(card.code, { env, width: 360 }),
    imageOriginalUrl: buildCaretaroCardImageUrl(card.code, { env }),
    imageFallbackUrl: localFallback,
  };
}

function chooseFallbackDreamCards(dreamText, requestedCount = 3, env = null) {
  const cardCount = clampDreamCardCount(requestedCount);
  const scores = new Map(DREAM_TAROT_CARDS.map((card) => [card.code, 0]));
  const suitBoost = new Map();
  const themes = [];

  const bump = (code, amount) => scores.set(code, (scores.get(code) || 0) + amount);

  for (const rule of DREAM_THEME_RULES) {
    if (!rule.pattern.test(dreamText)) continue;
    themes.push(...rule.themes);
    rule.cards.forEach((code, idx) => bump(code, 12 - idx * 2));
    // 꿈 상징 ↔ 슈트 연결: 해당 슈트 마이너 전체를 함께 후보로 올린다.
    // 규칙이 지목한 메이저와 겨룰 수 있는 무게를 줘야 마이너 56장이 실제로 뽑힌다.
    const weight = Number.isFinite(rule.suitWeight) ? rule.suitWeight : 8;
    (rule.suits || []).forEach((suit) => suitBoost.set(suit, (suitBoost.get(suit) || 0) + weight));
  }

  for (const card of DREAM_TAROT_CARDS) {
    const boost = suitBoost.get(card.suit);
    if (boost) bump(card.code, boost);
  }

  if (/(불안|무서|두려|긴장|혼란|이상)/i.test(dreamText)) bump("M18", 8);
  if (/(기쁨|편안|따뜻|행복|웃)/i.test(dreamText)) bump("M19", 8);
  if (/(선택|갈림|고민|결정)/i.test(dreamText)) bump("M06", 8);
  if (/(반복|계속|또|다시)/i.test(dreamText)) bump("M10", 8);

  const ranked = DREAM_TAROT_CARDS
    .map((card, idx) => ({
      code: card.code,
      // 점수가 같은 후보는 꿈 원문 시드로 흔들어 같은 슈트에서 같은 장만 나오지 않게 한다.
      score: (scores.get(card.code) || 0) * 1000 + seededIndex(dreamText, idx, 997),
      raw: scores.get(card.code) || 0,
      order: idx,
    }))
    .sort((a, b) => b.score - a.score || a.order - b.order);

  const selected = [];
  for (const entry of ranked) {
    if (entry.raw <= 0) break;
    selected.push(entry.code);
    if (selected.length >= cardCount) break;
  }

  const fallbackCodes = ["M18", "M02", "M16", "M17", "M10", "M13", "M06", "M07", "M14", "M21", "M00", "M11", "C02", "S03", "P07", "W08"];
  let offset = 0;
  while (selected.length < cardCount && offset < 64) {
    const code = fallbackCodes[seededIndex(dreamText, offset, fallbackCodes.length)];
    if (!selected.includes(code)) selected.push(code);
    offset += 1;
  }

  const selectedCardIds = selected.slice(0, cardCount);
  return {
    cardCount,
    selectedCardIds,
    dreamThemes: uniqueList(themes.length ? themes : inferDreamThemes(dreamText), 5),
    analysisNote: buildDreamAnalysisNote(dreamText, selectedCardIds),
    cards: selectedCardIds
      .map((code, idx) => {
        const card = DREAM_TAROT_CARD_BY_CODE.get(code);
        return card ? decorateDreamCard(card, { dreamText, position: idx, env }) : null;
      })
      .filter(Boolean),
  };
}

function buildDreamAnalysisNote(dreamText, selectedCardIds) {
  const names = selectedCardIds
    .map((code) => DREAM_TAROT_CARD_BY_CODE.get(code)?.nameKo)
    .filter(Boolean)
    .join(", ");
  if (/(떨어|추락|무너)/i.test(dreamText)) return `${names}의 조합은 흔들리는 통제감과 새롭게 열리는 각성의 문을 가리킵니다.`;
  if (/(물|바다|비|강|파도)/i.test(dreamText)) return `${names}의 조합은 깊은 감정의 물결과 무의식의 응답을 비춥니다.`;
  if (/(쫓|도망|공포|괴물)/i.test(dreamText)) return `${names}의 조합은 피하고 싶은 그림자와 마주할 힘을 가리킵니다.`;
  return `${names}의 조합은 꿈속 상징이 남긴 정서와 전환의 흐름을 비춥니다.`;
}

function normalizeDreamPromptCards(cards) {
  if (!Array.isArray(cards)) return [];
  return cards.slice(0, 5).map((entry, idx) => {
    const code = String(entry?.code || entry?.id || "").toUpperCase();
    const base = DREAM_TAROT_CARD_BY_CODE.get(code)
      || DREAM_TAROT_CARDS.find((card) => card.nameKo === entry?.nameKo)
      || DREAM_TAROT_CARDS[idx % DREAM_TAROT_CARDS.length];
    return {
      ...base,
      nameKo: String(entry?.nameKo || base.nameKo).trim(),
      isReversed: Boolean(entry?.isReversed || entry?.reversed || entry?.orientation === "reversed"),
      keywords: uniqueList(Array.isArray(entry?.keywords) && entry.keywords.length ? entry.keywords : base.keywords, 4),
      dreamMeaning: String(entry?.dreamMeaning || base.dreamMeaning).trim(),
    };
  });
}

function buildDreamCardBriefLines(cards) {
  const lines = [];
  cards.forEach((card, idx) => {
    const orientation = card.isReversed ? "역방향" : "정방향";
    const facets = card.arcana === "major"
      ? [`메이저 아르카나 ${card.number}`, `점성술 ${card.astrology || "-"}`, `수비학 ${card.number}`]
      : [`${card.suitLabel || card.suit} ${card.number}`, `원소 ${card.elementLabel || card.element}`, `수비학 ${card.number}`];
    lines.push(`${idx + 1}. ${card.nameKo} (${card.name}) · ${orientation} · ${facets.join(" · ")}`);
    const upright = uniqueList(card.uprightKeywords || card.keywords, 5).join(", ");
    const reversed = uniqueList(card.reversedKeywords, 5).join(", ");
    if (upright) lines.push(`   정방향 키워드: ${upright}`);
    if (reversed) lines.push(`   역방향 키워드: ${reversed}`);
    if (card.dreamMeaning) lines.push(`   꿈에서의 결: ${card.dreamMeaning}`);
  });
  return lines;
}

// 이 기능은 해몽 결과를 만들지 않는다. 사용자가 ChatGPT·Claude·Gemini에 그대로 붙여넣을
// "꿈 + 타로 상담 프롬프트"만 생성한다. 따라서 선(先)해석 문장을 넣지 않는다.
function buildDreamTarotConsultPrompt({ dreamText, dreamThemes, cards }) {
  const compact = compactDreamText(dreamText, 1200);
  const themeLine = uniqueList(dreamThemes, 5).join(", ") || "무의식, 감정의 잔향";
  const cardCount = cards.length;

  return [
    "# 역할",
    "당신은 30년 이상 실전 경험을 가진 세계 최고 수준의 타로 마스터이자 꿈 해몽 전문가입니다.",
    "Rider-Waite 78장을 기준 덱으로 삼되 Marseille·Thoth의 상징 체계를 함께 이해하고 있으며,",
    "Carl Jung의 상징심리학을 해석의 뼈대로 사용합니다.",
    "지금부터 아래 자료를 바탕으로, 실제 전문 타로 상담사가 진행하는 수준의 꿈 상담을 해 주세요.",
    "",
    "# 상담 자료",
    "[꿈 원문]",
    compact,
    "",
    `[감지된 중심 주제] ${themeLine}`,
    `[뽑힌 카드] ${cardCount}장`,
    ...buildDreamCardBriefLines(cards),
    "",
    "# 분석 순서 (반드시 이 순서를 지켜 주세요)",
    "① 꿈의 핵심 상징 분석 — 아래 항목으로 체계적으로 분류하되, 꿈에 실제로 등장한 것만 다룹니다.",
    "   인물 / 장소 / 동물 / 자연물 / 물 / 불 / 하늘 / 색 / 숫자 / 방향 / 날씨 / 건물 / 탈것 /",
    "   문 / 열쇠 / 음식 / 죽음 / 탄생 / 추락 / 비행 / 시험 / 학교 / 직장",
    "② 가장 중요한 감정 분석 — 꿈은 사건보다 감정이 중요합니다.",
    "   두려움 / 기쁨 / 안도 / 분노 / 슬픔 / 후회 / 죄책감 / 기대 / 설렘 중 어떤 감정이",
    "   꿈에서 어떤 역할을 했는지, 깨어난 뒤 어떤 여운으로 남았는지 먼저 짚습니다.",
    "③ 반복되는 상징 확인 — 같은 이미지·장면·감정이 되풀이되는지 살핍니다.",
    "④ 현재 현실과 연결 — 상징의 사전 뜻보다 이 사람의 개인 맥락이 우선입니다.",
    "⑤ 무의식의 메시지 추론",
    "⑥ 가장 적합한 타로 스프레드 선택 — 아래에서 고르고 선택 이유를 반드시 설명합니다.",
    "   불안한 꿈 → 3 Card Shadow Spread / 재회 꿈 → Relationship Spread /",
    "   돈 꿈 → Prosperity Spread / 직장 꿈 → Career Spread /",
    "   반복되는 꿈 → Cross Spread / 인생 전환 → Celtic Cross",
    `   뽑힌 카드가 ${cardCount}장이므로 ${cardCount}장으로 운용 가능한 스프레드를 고르거나,`,
    `   ${cardCount}개의 자리 의미를 직접 정의하고 그 근거를 밝혀 주세요.`,
    "⑦ 카드별 질문 설계 — 카드를 읽기 전에 물어야 할 질문을 먼저 세웁니다.",
    "   이 꿈은 무엇을 알려주려 하는가 / 내가 지금 놓치고 있는 것은 무엇인가 /",
    "   현재 가장 중요한 선택은 무엇인가 / 무의식이 경고하는 부분은 어디인가 /",
    "   앞으로 어떤 행동이 필요한가",
    "⑧ 카드 의미를 꿈과 연결",
    "⑨ 실질적인 조언",
    "⑩ 종합 메시지",
    "",
    "# 카드 해석 원칙",
    "각 카드마다 반드시 이 순서를 따릅니다. 단순한 카드 설명 나열은 금지합니다.",
    "  카드의 기본 상징 → 꿈속 상징과 연결 → 현재 상황과 연결 → 심리적 의미 → 행동 조언 → 주의사항",
    "정방향과 역방향을 정확히 구분합니다. 역방향은 '나쁨'이 아니라 방향·강도·내향화의 차이입니다.",
    "카드 이름만 보고 단편적으로 해석하지 말고, 상징·슈트·원소·수비학·점성술 대응·색채·",
    "인물이 향한 방향·배경 요소를 종합해 읽어 주세요.",
    "꿈속 상징과 슈트를 적극적으로 연결합니다.",
    "  물·감정 → Cups / 불·열정 → Wands / 돈·현실 → Pentacles / 갈등·생각 → Swords",
    "",
    "# 꿈 유형 분류",
    "먼저 이 꿈이 어떤 유형인지 분류하고, 유형에 따라 상담 방향을 달리합니다.",
    "  예지성 / 심리적 / 불안 / 희망 / 소망 / 스트레스 / 무의식 / 트라우마 / 성장 / 관계 / 치유",
    "",
    "# 융 심리학 관점",
    "가능한 경우 그림자, 아니마·아니무스, 개성화, 집단무의식, 원형(archetype)의 관점을 함께 참고합니다.",
    "단, 단정하지 말고 가능성으로 설명해 주세요.",
    "",
    "# 금지 사항",
    "- 카드 의미만 나열하기",
    "- 꿈 의미만 설명하고 카드와 연결하지 않기",
    "- 긍정적인 말만 반복하기",
    "- 모든 꿈을 길몽으로 해석하기",
    "- 모든 역방향을 나쁘게 해석하기",
    "- 근거 없는 예언, 단정적인 미래 예측",
    "",
    "# 출력 형식",
    "1. 꿈 유형 분류와 그 근거",
    "2. 상징 분석 (분류 / 등장한 것 / 상징적 의미 / 개인 맥락을 확인할 질문)",
    "3. 감정 지도 (감정 / 꿈에서의 역할 / 현실에서의 대응)",
    "4. 선택한 스프레드와 선택 이유, 각 자리의 의미",
    "5. 카드별 해석 (위 6단계 순서를 그대로 지킬 것)",
    "6. 카드 조합이 만드는 하나의 서사",
    "7. 융의 관점에서 본 무의식의 메시지 (단정 없이 가능성으로)",
    "8. 지금 붙잡아야 할 한 문장",
    "9. 앞으로 48시간 안에 실행할 수 있는 구체적인 행동 1가지",
    "10. 스스로에게 던질 질문 3가지",
    "",
    "읽는 사람이 \"정말 상담을 받은 것 같다\"고 느끼도록, 실제 프리미엄 타로 상담의 깊이와 일관성으로 작성해 주세요.",
  ].join("\n");
}

export { normalizeDreamText, chooseFallbackDreamCards, normalizeDreamPromptCards, uniqueList, inferDreamThemes, buildDreamTarotConsultPrompt };
