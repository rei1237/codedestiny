import { TAROT_CARDS, getTarotCardByAnyId } from "./tarot-cards.mjs";

const LAYERS = ["conscious", "unconscious", "soul", "shadow", "integration"];

const CELESTIAL_MELODY_TEXT_TRANSLATIONS = {
  ko: {
    "celestialMelody.spreadTitle01": "태양 · 드러나는 자아",
    "celestialMelody.spreadTitle02": "달 · 마음의 기억",
    "celestialMelody.spreadTitle03": "수성 · 생각과 언어",
    "celestialMelody.spreadTitle04": "금성 · 사랑과 가치",
    "celestialMelody.spreadTitle05": "화성 · 욕망과 추진력",
    "celestialMelody.spreadTitle06": "목성 · 확장과 믿음",
    "celestialMelody.spreadTitle07": "토성 · 책임과 시험",
    "celestialMelody.spreadTitle08": "천왕성 · 변화의 각성",
    "celestialMelody.spreadTitle09": "해왕성 · 꿈과 직관",
    "celestialMelody.spreadTitle10": "명왕성 · 깊은 변용",
    "celestialMelody.spreadTitle11": "카이론 · 상처의 지혜",
    "celestialMelody.closingTitle": "오늘의 천체 선율 요약",
  },
  en: {
    "celestialMelody.spreadTitle01": "Sun · Revealed Self",
    "celestialMelody.spreadTitle02": "Moon · Emotional Memory",
    "celestialMelody.spreadTitle03": "Mercury · Thought and Speech",
    "celestialMelody.spreadTitle04": "Venus · Love and Value",
    "celestialMelody.spreadTitle05": "Mars · Desire and Drive",
    "celestialMelody.spreadTitle06": "Jupiter · Expansion and Faith",
    "celestialMelody.spreadTitle07": "Saturn · Responsibility and Trial",
    "celestialMelody.spreadTitle08": "Uranus · Awakening Change",
    "celestialMelody.spreadTitle09": "Neptune · Dream and Intuition",
    "celestialMelody.spreadTitle10": "Pluto · Deep Transformation",
    "celestialMelody.spreadTitle11": "Chiron · Wisdom of the Wound",
    "celestialMelody.closingTitle": "Today's Celestial Melody Summary",
  },
  ja: {
    "celestialMelody.spreadTitle01": "太陽 · 現れる自我",
    "celestialMelody.spreadTitle02": "月 · 心の記憶",
    "celestialMelody.spreadTitle03": "水星 · 思考と言葉",
    "celestialMelody.spreadTitle04": "金星 · 愛と価値",
    "celestialMelody.spreadTitle05": "火星 · 欲望と推進力",
    "celestialMelody.spreadTitle06": "木星 · 拡大と信念",
    "celestialMelody.spreadTitle07": "土星 · 責任と試練",
    "celestialMelody.spreadTitle08": "天王星 · 変化の目覚め",
    "celestialMelody.spreadTitle09": "海王星 · 夢と直感",
    "celestialMelody.spreadTitle10": "冥王星 · 深い変容",
    "celestialMelody.spreadTitle11": "カイロン · 傷の知恵",
    "celestialMelody.closingTitle": "今日の天体の旋律まとめ",
  },
};

function celestialMelodyText(key) {
  return CELESTIAL_MELODY_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

const CELESTIAL_MELODY_SPREAD = Object.freeze([
  {
    order: 1,
    planetId: "sun",
    planetKo: "태양",
    planetEn: "Sun",
    symbol: "☉",
    title: celestialMelodyText("celestialMelody.spreadTitle01"),
    question: "나는 지금 어떤 자아와 생명력을 통해 세상에 드러나는가?",
    archetype: "자아, 생명력, 목적, 존재감, 중심의 방향",
    layer: "conscious",
  },
  {
    order: 2,
    planetId: "moon",
    planetKo: "달",
    planetEn: "Moon",
    symbol: "☽",
    title: celestialMelodyText("celestialMelody.spreadTitle02"),
    question: "마음 깊은 곳에서 반복되는 감정 기억과 본능은 무엇인가?",
    archetype: "감정, 기억, 본능적 반응, 안정 욕구, 무의식 패턴",
    layer: "unconscious",
  },
  {
    order: 3,
    planetId: "mercury",
    planetKo: "수성",
    planetEn: "Mercury",
    symbol: "☿",
    title: celestialMelodyText("celestialMelody.spreadTitle03"),
    question: "나는 어떤 생각과 말의 패턴으로 현실을 해석하는가?",
    archetype: "사고, 언어, 판단, 정보 처리, 소통 방식",
    layer: "conscious",
  },
  {
    order: 4,
    planetId: "venus",
    planetKo: "금성",
    planetEn: "Venus",
    symbol: "♀",
    title: celestialMelodyText("celestialMelody.spreadTitle04"),
    question: "나는 무엇을 사랑하고, 어디에서 아름다움과 가치를 느끼는가?",
    archetype: "사랑, 매력, 관계 욕구, 취향, 가치감",
    layer: "soul",
  },
  {
    order: 5,
    planetId: "mars",
    planetKo: "화성",
    planetEn: "Mars",
    symbol: "♂",
    title: celestialMelodyText("celestialMelody.spreadTitle05"),
    question: "내 안의 욕망, 분노, 추진력은 어디로 향하는가?",
    archetype: "행동력, 분노, 성취 욕구, 충동, 용기",
    layer: "shadow",
  },
  {
    order: 6,
    planetId: "jupiter",
    planetKo: "목성",
    planetEn: "Jupiter",
    symbol: "♃",
    title: celestialMelodyText("celestialMelody.spreadTitle06"),
    question: "내 삶은 어디에서 확장되고 어떤 믿음이 나를 성장시키는가?",
    archetype: "성장, 행운, 신념, 철학, 기회, 보호",
    layer: "soul",
  },
  {
    order: 7,
    planetId: "saturn",
    planetKo: "토성",
    planetEn: "Saturn",
    symbol: "♄",
    title: celestialMelodyText("celestialMelody.spreadTitle07"),
    question: "내가 통과해야 할 현실의 시험과 책임은 무엇인가?",
    archetype: "한계, 책임, 시간, 구조, 인내, 성숙",
    layer: "shadow",
  },
  {
    order: 8,
    planetId: "uranus",
    planetKo: "천왕성",
    planetEn: "Uranus",
    symbol: "♅",
    title: celestialMelodyText("celestialMelody.spreadTitle08"),
    question: "내 삶에서 깨어나고 있는 자유와 변화의 충동은 무엇인가?",
    archetype: "해방, 혁신, 돌파 변화, 각성, 반항, 갱신",
    layer: "integration",
  },
  {
    order: 9,
    planetId: "neptune",
    planetKo: "해왕성",
    planetEn: "Neptune",
    symbol: "♆",
    title: celestialMelodyText("celestialMelody.spreadTitle09"),
    question: "내 영혼은 무엇을 꿈꾸며 어디에서 환상과 직관을 만나는가?",
    archetype: "꿈, 영성, 환상, 직관, 예술성, 경계 흐림",
    layer: "unconscious",
  },
  {
    order: 10,
    planetId: "pluto",
    planetKo: "명왕성",
    planetEn: "Pluto",
    symbol: "♇",
    title: celestialMelodyText("celestialMelody.spreadTitle10"),
    question: "내가 직면해야 할 가장 깊은 그림자와 변화의 통로는 무엇인가?",
    archetype: "죽음과 재생, 집착, 권력, 트라우마, 심층 변화",
    layer: "shadow",
  },
  {
    order: 11,
    planetId: "chiron",
    planetKo: "카이론",
    planetEn: "Chiron",
    symbol: "⚷",
    title: celestialMelodyText("celestialMelody.spreadTitle11"),
    question: "내 상처는 어떤 방식으로 치유와 지혜가 되는가?",
    archetype: "핵심 상처, 치유, 내면의 스승, 약점의 지혜화",
    layer: "integration",
  },
]);

const PLANET_ARCHETYPES = Object.freeze({
  sun: {
    keywords: ["자아", "생명력", "목적", "존재감", "중심"],
    conscious: "스스로를 드러내는 방식과 삶의 중심을 세우는 힘",
    unconscious: "인정받고 싶은 갈망과 존재를 증명하려는 긴장",
    shadow: "과시, 자기중심성, 빛을 잃는 것에 대한 두려움",
    soulLesson: "타인의 시선이 아니라 내 중심에서 빛나는 법",
    integration: "오늘의 핵심 목표 하나를 행동으로 증명하기",
  },
  moon: {
    keywords: ["감정", "기억", "안정", "무의식", "본능"],
    conscious: "표면 감정의 파동과 정서적 체감",
    unconscious: "과거 경험이 현재 반응을 반복시키는 방식",
    shadow: "불안, 의존, 감정 과잉, 기분의 지배",
    soulLesson: "감정을 억누르지 않고 해석하는 연습",
    integration: "감정과 사실을 분리해 기록하기",
  },
  mercury: {
    keywords: ["생각", "언어", "판단", "소통", "정보"],
    conscious: "현실을 해석하는 사고 체계와 말의 구조",
    unconscious: "반복되는 자기 대화와 신념 문장",
    shadow: "과잉 분석, 말실수, 생각의 감옥",
    soulLesson: "생각을 도구로 쓰되 생각에 갇히지 않기",
    integration: "사실, 추측, 감정을 각각 한 줄로 나누기",
  },
  venus: {
    keywords: ["사랑", "가치", "아름다움", "관계", "매력"],
    conscious: "끌림과 애정의 표현 방식",
    unconscious: "사랑받기 위해 맞추는 패턴",
    shadow: "의존, 쾌락 집착, 가치의 외부 위임",
    soulLesson: "사랑받기 전에 자기 가치를 인정하기",
    integration: "좋아하는 것과 인정 욕구를 분리하기",
  },
  mars: {
    keywords: ["행동", "욕망", "분노", "용기", "추진"],
    conscious: "원하는 것을 향해 움직이는 방식",
    unconscious: "억압된 분노와 충동의 축적",
    shadow: "공격성, 성급함, 파괴적 반응",
    soulLesson: "분노를 경계 설정과 실행력으로 전환하기",
    integration: "욕구를 한 문장으로 적고 작은 행동으로 연결하기",
  },
  jupiter: {
    keywords: ["성장", "확장", "신념", "기회", "보호"],
    conscious: "성장 가능성을 읽는 세계관",
    unconscious: "과도한 낙관 또는 큰 그림에 숨는 습관",
    shadow: "확장 중독, 과신, 근거 없는 약속",
    soulLesson: "큰 꿈을 현실 구조와 함께 세우기",
    integration: "확장 계획에 검증 지표를 붙이기",
  },
  saturn: {
    keywords: ["한계", "책임", "시간", "구조", "성숙"],
    conscious: "현실의 규칙과 책임 감각",
    unconscious: "실패 공포와 자기 검열",
    shadow: "경직, 자기 처벌, 지연, 통제 강박",
    soulLesson: "인내를 회피가 아닌 훈련으로 바꾸기",
    integration: "미루던 책임 하나를 작은 단위로 실행하기",
  },
  uranus: {
    keywords: ["해방", "혁신", "변화", "각성", "갱신"],
    conscious: "자유를 향한 급진적 통찰",
    unconscious: "예측 불가를 통해 탈출하려는 충동",
    shadow: "관계 단절, 반항 과열, 불연속적 선택",
    soulLesson: "자유와 책임을 동시에 설계하기",
    integration: "바꾸고 싶은 규칙 하나와 안전장치를 함께 적기",
  },
  neptune: {
    keywords: ["꿈", "영성", "환상", "직관", "예술"],
    conscious: "상징과 감수성으로 현실을 느끼는 능력",
    unconscious: "경계가 흐려지며 사실과 이상이 섞이는 지점",
    shadow: "회피, 착각, 이상화, 경계 붕괴",
    soulLesson: "영감과 현실 검증의 균형",
    integration: "직관 기록 뒤 사실 검증 질문을 붙이기",
  },
  pluto: {
    keywords: ["죽음", "재생", "집착", "권력", "변형"],
    conscious: "근본 전환을 요구하는 신호",
    unconscious: "통제 욕구와 생존 본능의 접점",
    shadow: "파괴 충동, 집착, 극단화, 숨은 권력 싸움",
    soulLesson: "해체를 재생의 문으로 받아들이기",
    integration: "붙잡고 있는 집착을 명명하고 대체 행동 정하기",
  },
  chiron: {
    keywords: ["상처", "치유", "스승", "민감성", "지혜"],
    conscious: "아픔을 인식하고 다루는 능력",
    unconscious: "반복되는 취약감과 방어 반응",
    shadow: "자기동정, 치유 회피, 과거 고착",
    soulLesson: "상처를 결함이 아닌 공감 자원으로 전환하기",
    integration: "취약함을 인정하고 안전한 연결을 시도하기",
  },
});

const ROMAN_TO_MAJOR = Object.freeze({
  "0": "M00",
  I: "M01",
  II: "M02",
  III: "M03",
  IV: "M04",
  V: "M05",
  VI: "M06",
  VII: "M07",
  VIII: "M08",
  IX: "M09",
  X: "M10",
  XI: "M11",
  XII: "M12",
  XIII: "M13",
  XIV: "M14",
  XV: "M15",
  XVI: "M16",
  XVII: "M17",
  XVIII: "M18",
  XIX: "M19",
  XX: "M20",
  XXI: "M21",
});

const STORAGE_PREFIX = "cd:celestial-melody:";

function text(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function pick(arr, fallback = "") {
  if (!Array.isArray(arr) || !arr.length) return fallback;
  return text(arr[0] || fallback);
}

function normalizeLookup(value) {
  return text(value).toLowerCase().replace(/[\s_\-–—:()[\].]/g, "");
}

function normalizeCardCode(value) {
  const raw = text(value);
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (ROMAN_TO_MAJOR[upper]) return ROMAN_TO_MAJOR[upper];
  if (/^M\d{1,2}$/.test(upper)) return `M${upper.slice(1).padStart(2, "0")}`;
  return upper;
}

function resolveCardModel(raw = {}, idx = 0) {
  const candidates = [
    raw?.code,
    raw?.cardId,
    raw?.id,
    raw?.tarot?.code,
    raw?.tarot?.r,
    raw?.r,
    raw?.legacyId,
    raw?.number,
  ].map(normalizeCardCode).filter(Boolean);

  for (const candidate of candidates) {
    const direct = getTarotCardByAnyId(candidate);
    if (direct) return direct;
  }

  const names = [
    raw?.name,
    raw?.cardName,
    raw?.cardNameKo,
    raw?.cardNameEn,
    raw?.tarot?.n,
    raw?.tarot?.name,
    raw?.tarot?.nameKo,
    raw?.tarot?.nameEn,
  ].map(normalizeLookup).filter(Boolean);

  if (names.length) {
    const found = TAROT_CARDS.find((card) => {
      const aliases = [card.nameKo, card.nameEn, card.slug, card.code, card.id].map(normalizeLookup);
      return names.some((name) => aliases.includes(name));
    });
    if (found) return found;
  }

  const major = TAROT_CARDS.filter((card) => String(card.code || "").startsWith("M"));
  return major[idx % major.length] || TAROT_CARDS[idx % TAROT_CARDS.length] || TAROT_CARDS[0];
}

function resolveOrientation(raw, idx = 0) {
  const candidate = text(raw?.orientation || raw?.dir || raw?.direction || "").toLowerCase();
  if (candidate === "upright" || candidate === "reversed") return candidate;
  if (candidate === "정방향") return "upright";
  if (candidate === "역방향") return "reversed";
  return idx % 2 === 0 ? "upright" : "reversed";
}

function summarizeCardMeaning(card, orientation) {
  const meaning = card?.[orientation] || card?.upright || {};
  return {
    keywords: (Array.isArray(meaning.keywords) && meaning.keywords.length ? meaning.keywords : card?.keywords || []).slice(0, 8),
    cardMeaning: text(meaning.coreMeaning || pick(meaning.core) || `${card.nameKo} 카드는 현재 흐름의 핵심 상징을 강하게 드러냅니다.`),
    psych: text(meaning.psychologicalMeaning || pick(meaning.shadow) || "감정과 해석의 간격을 관찰해야 하는 상태입니다."),
    shadow: text(meaning.shadowText || pick(meaning.caution) || "반복되는 반응을 알아차리는 것이 우선입니다."),
    lesson: text(meaning.selfEsteemMeaning || pick(meaning.selfEsteem) || pick(meaning.general) || "자기 기준을 회복하는 연습이 필요합니다."),
    integration: text(meaning.adviceText || pick(meaning.recoveryAdvice) || pick(meaning.advice) || "오늘 지킬 작은 조율 하나를 선택하세요."),
  };
}

function layerTone(layer) {
  switch (layer) {
    case "conscious": return "의식의 표면에서 선택과 방향을 분명히 드러냅니다.";
    case "unconscious": return "무의식의 물결에서 반복 감정과 기억의 신호를 끌어올립니다.";
    case "soul": return "영혼의 결에서 가치와 사랑의 기준을 재정렬합니다.";
    case "shadow": return "그림자의 지대에서 억압된 욕망과 두려움을 직면하게 합니다.";
    default: return "통합의 층위에서 해석을 현실 행동으로 번역하도록 돕습니다.";
  }
}

function ensureMinLength(input, minLength = 500, fillers = []) {
  let output = text(input);
  const normalizedFillers = (Array.isArray(fillers) ? fillers : []).map(text).filter(Boolean);
  const fallbackFillers = normalizedFillers.length
    ? normalizedFillers
    : ["이 문장은 상징 해석을 현실 행동으로 연결하기 위한 보강 문장입니다."];
  let guard = 0;
  while (output.length < minLength && guard < 24) {
    output = text(`${output} ${fallbackFillers[guard % fallbackFillers.length]}`);
    guard += 1;
  }
  return output;
}

function sanitizeCelestialMelodyText(input) {
  const compact = text(input).replace(/\s+([,.!?])/g, "$1");
  return compact.replace(/\.{2,}/g, ".").trim();
}

function removeRepeatedCelestialPhrases(input) {
  const source = sanitizeCelestialMelodyText(input);
  if (!source) return "";
  const sentences = source.split(/(?<=[.!?])\s+/).map(text).filter(Boolean);
  const seen = new Set();
  const deduped = [];
  for (const sentence of sentences) {
    const key = sentence.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(sentence);
  }
  return deduped.join(" ");
}

function buildCelestialMelodySection(cardInput, planet, orientationInput) {
  const card = resolveCardModel(cardInput, Number(planet.order || 1) - 1);
  const orientation = orientationInput === "reversed" ? "reversed" : "upright";
  const planetMeaning = PLANET_ARCHETYPES[planet.planetId] || PLANET_ARCHETYPES.sun;
  const cardMeaning = summarizeCardMeaning(card, orientation);
  const orientationLabel = orientation === "reversed" ? "역방향" : "정방향";
  const keywordLine = (cardMeaning.keywords.length ? cardMeaning.keywords : card.keywords || []).slice(0, 3).join(", ");
  let cardSignal = text(cardMeaning.cardMeaning).replace(/[.。]\s*$/, "").replace(/(입니다|합니다|됩니다)\s*$/, "");
  const cardLead = `${card.nameKo} ${orientationLabel}은`;
  if (cardSignal.startsWith(cardLead)) cardSignal = cardSignal.slice(cardLead.length).trim();

  const archetypeReading = ensureMinLength(
    `${planet.planetKo}(${planet.symbol}) 자리에서 ${card.nameKo} ${orientationLabel}이 열린다는 것은 ${planet.title}의 영역에 ${cardSignal}의 기운이 켜졌다는 뜻입니다. ${layerTone(planet.layer)} 이 카드는 단순한 사건 예측보다 "내가 어떤 선택을 반복하고 있는가"를 조용히 비춥니다. 특히 ${planet.question}라는 질문 앞에서 ${planetMeaning.conscious}와 ${cardMeaning.psych}가 만나는 지점이 오늘 선율의 기준음으로 떠오릅니다.`,
    560,
    [
      `${planet.planetKo}의 원형은 ${planet.archetype}이며, ${card.nameKo}의 키워드인 ${keywordLine || "핵심 상징"}를 통해 지금 삶의 리듬을 섬세하게 드러냅니다.`,
      `이 별빛은 불안을 크게 만들기보다, 이미 마음속에서 알고 있던 진실을 더 부드럽고 정확한 언어로 꺼내 줍니다.`,
      `카드가 말하는 변화는 거창한 결심보다 오늘 반복 가능한 작은 기준을 세울 때 현실로 내려옵니다.`,
    ],
  );

  const consciousMessage = ensureMinLength(
    `${planetMeaning.conscious}의 자리에서 지금 가장 먼저 들어야 할 말은 분명합니다. ${card.nameKo} ${orientationLabel}은 마음이 흔들리기 전에 기준 문장을 먼저 세우라고 말합니다. 지금의 과제는 감정을 부정하는 것이 아니라 감정을 존중하되 결정은 기준 위에서 내리는 것입니다. ${planet.planetKo}의 축은 ${planet.question}라는 질문을 통해 오늘의 선택을 더 선명하게 정돈하라고 요청합니다.`,
    520,
    [
      `오늘 하루에 적용한다면 우선순위 하나를 정하고 그 선택의 이유를 짧게 언어화하세요.`,
      `의식의 영역은 거대한 깨달음보다 반복 가능한 미세 선택에서 빠르게 안정됩니다.`,
      `기준이 선명해질수록 관계와 일, 감정 반응의 소모가 동시에 줄어듭니다.`,
    ],
  );

  const unconsciousPattern = ensureMinLength(
    `${planetMeaning.unconscious}의 물결은 조용하지만 깊게 움직입니다. ${cardMeaning.psych}라는 카드 신호는 지금의 갈등이 현재 사건만의 문제가 아니라 누적된 정서 기억과 연결되어 있음을 드러냅니다. 무의식은 종종 익숙한 고통을 안전으로 오해하기 때문에 낯선 평온보다 익숙한 긴장을 선택하게 만들 수 있습니다.`,
    520,
    [
      `이 반복을 줄이려면 감정과 사실을 분리해 기록하는 루틴이 효과적입니다.`,
      `비슷한 상황에서 몸이 먼저 반응하는 순간을 관찰하면 패턴의 방아쇠를 더 빨리 찾을 수 있습니다.`,
      `무의식을 바꾸는 핵심은 통제보다 인식의 빈도를 높이는 데 있습니다.`,
    ],
  );

  const shadowWarning = ensureMinLength(
    `${planetMeaning.shadow}이 그림자의 경고로 떠오릅니다. ${cardMeaning.shadow} 이 조합에서 조심할 점은 문제 자체보다 반응이 먼저 달아오르는 순간입니다. 마음이 불안정한 시간일수록 결론을 서두르거나, 상대와 상황을 단정하거나, 자신을 심판하려는 경향이 강해질 수 있습니다.`,
    520,
    [
      `그림자 작업의 첫 단계는 "지금 내가 지키려는 것은 무엇인가"를 확인하는 것입니다.`,
      `방어의 목적을 알면 파괴적 선택 대신 보호적 선택으로 전환할 수 있습니다.`,
      `이 경고는 두려운 예언이 아니라 당신을 더 안전한 선택으로 이끄는 조율 신호입니다.`,
    ],
  );

  const soulLesson = ensureMinLength(
    `${planetMeaning.soulLesson}이라는 과제가 오늘의 중심에 놓입니다. ${cardMeaning.lesson} 카드가 비추는 성장은 한 번의 극적 변화보다 작지만 일관된 자기 신뢰 행동에서 시작됩니다. 영혼의 성장은 상처를 지우는 과정이 아니라 상처를 해석 가능한 언어로 바꾸는 과정입니다.`,
    520,
    [
      `지금 배우는 것은 완벽함이 아니라 지속 가능한 회복 능력입니다.`,
      `감정이 요동치는 날에도 가능한 최소 기준을 지키면 영혼의 근육이 만들어집니다.`,
      `스스로를 다정하게 다루는 태도는 회피가 아니라 고도의 자기 책임입니다.`,
    ],
  );

  const integrationPractice = ensureMinLength(
    `${planetMeaning.integration}이 오늘의 통합 조율로 떠오릅니다. ${cardMeaning.integration}처럼 행동 단위를 작게 쪼개면 별빛의 메시지가 실제 변화로 내려오기 시작합니다. 통합은 모든 답을 한 번에 아는 상태가 아니라, 아는 것과 하는 것 사이의 간격을 줄이는 과정입니다.`,
    520,
    [
      `실천 전에는 결과를 평가하기보다 실행 여부 자체를 먼저 체크하세요.`,
      `성공 기준을 낮추고 반복 횟수를 올리면 변화의 누적 속도가 빨라집니다.`,
      `이 실천은 미래를 강요하기 위한 장치가 아니라 현재를 회복하기 위한 리듬입니다.`,
    ],
  );

  return {
    order: planet.order,
    planetId: planet.planetId,
    planetKo: planet.planetKo,
    planetEn: planet.planetEn,
    planetSymbol: planet.symbol,
    planetTitle: planet.title,
    archetype: planet.archetype,
    layer: planet.layer,
    cardNameKo: card.nameKo,
    cardNameEn: card.nameEn,
    orientation,
    tarotKeywords: (cardMeaning.keywords.length ? cardMeaning.keywords : card.keywords || []).slice(0, 8),
    planetKeywords: (planetMeaning.keywords || []).slice(0, 8),
    cardMeaning: sanitizeCelestialMelodyText(cardMeaning.cardMeaning),
    planetMeaning: sanitizeCelestialMelodyText(`${planetMeaning.conscious}. 더 깊은 물결에서는 ${planetMeaning.unconscious}이 함께 흐르고, 조심해야 할 그림자로는 ${planetMeaning.shadow}이 드러납니다.`),
    archetypeReading: ensureMinLength(removeRepeatedCelestialPhrases(archetypeReading), 520, [
      `${planet.planetKo}의 질문은 ${planet.question}`,
      `${card.nameKo} ${orientationLabel}은 이 행성 자리에서 반복되는 선택의 리듬을 비춥니다.`,
    ]),
    consciousMessage: ensureMinLength(removeRepeatedCelestialPhrases(consciousMessage), 520, [
      `${planet.planetKo}의 의식 메시지는 기준을 먼저 세우고 감정을 그 기준 안에서 다루라는 요청입니다.`,
      `${card.nameKo}의 상징은 오늘 한 가지 행동으로 번역될 때 가장 선명해집니다.`,
    ]),
    unconsciousPattern: ensureMinLength(removeRepeatedCelestialPhrases(unconsciousPattern), 520, [
      `${planet.planetKo}의 무의식 물결은 감정 기록을 통해 더 빨리 드러납니다.`,
      `반복 반응을 비난하지 않고 이름 붙이면 선택지가 다시 열립니다.`,
    ]),
    shadowWarning: ensureMinLength(removeRepeatedCelestialPhrases(shadowWarning), 520, [
      `${planet.planetKo}의 그림자 경고는 두려움을 억누르기보다 조율 신호로 읽으라는 뜻입니다.`,
      `경고를 행동 기준으로 바꾸면 과열 반응이 줄고 회복 속도가 빨라집니다.`,
    ]),
    soulLesson: ensureMinLength(removeRepeatedCelestialPhrases(soulLesson), 520, [
      `${planet.planetKo}의 영혼 과제는 작은 자기 신뢰 행동을 반복할 때 현실감 있게 자랍니다.`,
      `상징은 믿음으로 끝나지 않고 몸으로 실행될 때 삶의 방향이 됩니다.`,
    ]),
    integrationPractice: ensureMinLength(removeRepeatedCelestialPhrases(integrationPractice), 520, [
      `${planet.planetKo}의 통합 실천은 오늘 가능한 행동 하나를 끝까지 완료하는 데서 시작됩니다.`,
      `작은 실행은 카드의 메시지를 현실에 고정하는 가장 안정적인 의식입니다.`,
    ]),
  };
}

function resolveDominantSuit(sections) {
  const counts = { major: 0, wands: 0, cups: 0, swords: 0, pentacles: 0 };
  sections.forEach((section) => {
    const model = TAROT_CARDS.find((card) => card.nameKo === section.cardNameKo && card.nameEn === section.cardNameEn);
    const suit = text(model?.suit || "major").toLowerCase();
    counts[suit] = (counts[suit] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "major";
}

function resolveDominantLayer(sections) {
  const counts = { conscious: 0, unconscious: 0, soul: 0, shadow: 0, integration: 0 };
  sections.forEach((section) => { counts[section.layer] = (counts[section.layer] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "integration";
}

function buildSummary(sections) {
  const dominantLayer = resolveDominantLayer(sections);
  const dominantSuit = resolveDominantSuit(sections);
  const majorCount = sections.filter((section) => {
    const model = TAROT_CARDS.find((card) => card.nameKo === section.cardNameKo && card.nameEn === section.cardNameEn);
    return String(model?.arcana || "").toLowerCase() === "major" || String(model?.code || "").startsWith("M");
  }).length;
  const ratio = `${majorCount}/11`;
  const strongestSection = sections[0] || null;
  const shadowSection = sections.find((section) => section.layer === "shadow") || sections[4] || strongestSection;
  const soulSection = sections.find((section) => section.layer === "soul") || sections[3] || strongestSection;
  const loveSection = sections.find((section) => section.planetId === "venus") || soulSection || strongestSection;
  const workSection = sections.find((section) => section.planetId === "saturn") || shadowSection || strongestSection;
  const moneySection = sections.find((section) => section.planetId === "jupiter") || soulSection || strongestSection;
  const healthSection = sections.find((section) => section.planetId === "moon") || strongestSection;
  const planetaryPriority = sections.map((section) => `${section.planetKo}: ${sanitizeCelestialMelodyText(section.integrationPractice).slice(0, 110)}`);

  const overallTheme = ensureMinLength(
    `열한 장의 선율은 의식과 무의식, 그림자와 통합의 축이 동시에 울리는 전환기를 가리킵니다. 카드 배열은 단순한 사건 예측보다 내면의 자동 반응을 드러내며, 특히 ${strongestSection?.planetKo || "태양"} 축에서 시작된 신호가 오늘 운의 기준음을 형성합니다. 당신의 영혼은 빠른 결론보다 섬세한 자기 이해를 요구하고 있으며, 그 이해는 현실의 작은 조율로 옮겨질 때 비로소 하루의 선율로 정착합니다.`,
    1100,
    [
      `의식 층위에서는 생각과 말, 선택 구조를 정리하는 작업이 필요하고, 무의식 층위에서는 반복 감정의 방아쇠를 인식하는 기록 훈련이 중요합니다.`,
      `그림자 층위는 인내와 통제 욕구를 자각하게 만들지만 동시에 더 성숙한 경계를 세울 기회를 제공합니다.`,
      `영혼 층위는 사랑과 가치, 신념의 재정렬을 요청하며 통합 층위는 모든 통찰을 오늘의 행동으로 연결하라고 말합니다.`,
      `결국 지금 중요한 것은 미래를 단정하는 일이 아니라, 흔들리는 순간에도 스스로를 다시 맞추는 힘을 회복하는 데 있습니다.`,
      `현재 경험하는 흔들림은 실패의 증거가 아니라 재배치의 징후입니다. 중심을 세우는 과정은 느릴 수 있지만 방향이 맞으면 반드시 현실의 결이 달라집니다.`,
    ],
  );

  const closingFortune = buildClosingFortune({
    strongestSection,
    shadowSection,
    soulSection,
    loveSection,
    workSection,
    moneySection,
    healthSection,
  });

  return {
    overallTheme: ensureMinLength(removeRepeatedCelestialPhrases(overallTheme), 1100, [
      "별빛은 사건을 단정하지 않고, 현재의 선택 리듬을 더 섬세하게 비추며 현실의 방향을 회복하도록 이끕니다.",
      "각 행성 자리는 서로 다른 목소리처럼 울리지만 마지막에는 하나의 문장으로 합쳐집니다.",
      "오늘 필요한 것은 모든 답을 한 번에 얻는 것이 아니라, 지금 가장 선명한 한 가지 기준을 세우고 반복하는 일입니다.",
      "카드가 비추는 상징은 운명을 고정하지 않고, 삶을 다시 조율할 수 있는 작은 손잡이를 건넵니다.",
    ]),
    dominantLayer,
    dominantSuit,
    majorArcanaRatio: ratio,
    strongestPlanetSignal: `${strongestSection?.planetKo || "태양"} 축의 ${strongestSection?.cardNameKo || "핵심 카드"} 신호가 전체 흐름에서 가장 크게 울립니다.`,
    deepestShadow: `${shadowSection?.planetKo || "그림자"} 자리의 경고는 ${shadowSection?.shadowWarning || "반복되는 방어 패턴을 재정렬하라"}는 메시지로 압축됩니다.`,
    soulLesson: `${soulSection?.planetKo || "영혼"} 축의 과제는 ${soulSection?.soulLesson || "자기 가치를 스스로 인정하는 연습"}로 정리됩니다.`,
    integrationPath: `의식, 무의식, 그림자의 신호를 하루 한 가지 조율로 연결할 때 통합이 시작됩니다. ${strongestSection?.integrationPractice || "작은 실천을 끝까지 완료하세요."}`,
    insightMatrix: {
      love: `${loveSection?.planetKo || "금성"} 축에서는 ${sanitizeCelestialMelodyText(loveSection?.consciousMessage || "감정 표현의 기준을 다시 세우는 과정")}이 핵심입니다. 관계에서는 반응보다 기준 문장을 먼저 세우면 소모가 크게 줄어듭니다.`,
      work: `${workSection?.planetKo || "토성"} 축은 ${sanitizeCelestialMelodyText(workSection?.shadowWarning || "책임과 구조를 다시 정렬")}을 요구합니다. 업무에서는 속도보다 재현 가능한 루틴 설계가 성과를 만듭니다.`,
      money: `${moneySection?.planetKo || "목성"} 축은 ${sanitizeCelestialMelodyText(moneySection?.soulLesson || "확장과 검증의 균형")}을 강조합니다. 재정 의사결정은 기대수익보다 리스크 문장화가 먼저입니다.`,
      health: `${healthSection?.planetKo || "달"} 축에서는 ${sanitizeCelestialMelodyText(healthSection?.unconsciousPattern || "감정 누적이 몸의 피로로 번지는 패턴")}이 보입니다. 수면, 호흡, 기록의 기본 루틴을 회복의 앵커로 두는 것이 효과적입니다.`,
    },
    planetHighlights: planetaryPriority,
    ritualPlan: [
      `1일차: ${strongestSection?.planetKo || "태양"} 자리의 핵심 문장을 한 줄로 적고 오늘 결정 1건에 적용합니다.`,
      `2일차: ${loveSection?.planetKo || "금성"} 관련 감정 반응 1개를 사실, 해석, 욕구로 분리해 기록합니다.`,
      `3일차: ${workSection?.planetKo || "토성"} 영역의 미룬 과제 1개를 20분 단위로 착수합니다.`,
      `4일차: ${moneySection?.planetKo || "목성"} 관련 지출 또는 투자 판단에 검증 질문 2개를 추가합니다.`,
      `5일차: ${healthSection?.planetKo || "달"} 축 회복을 위해 잠들기 전 10분 감정 정리 루틴을 실행합니다.`,
      `6일차: ${shadowSection?.planetKo || "명왕성"} 그림자 패턴이 올라오는 상황에서 대체 행동 1개를 실험합니다.`,
      `7일차: ${soulSection?.planetKo || "금성"} 영혼 과제를 다음 주 계획표에 행동 항목으로 확정합니다.`,
    ],
    practices: [
      "오늘의 감정, 사실, 해석을 3줄로 기록",
      "반복되는 감정 방아쇠를 한 가지 명명",
      "관계 또는 업무에서 지키고 싶은 경계 2개 작성",
      "미룬 책임 1개를 20분 단위로 실행",
      "직관 메모 뒤 사실 검증 질문 1개 추가",
      "그림자 패턴의 이름을 붙이고 대체 행동 설계",
      "다음 7일의 새로운 선택 선언문 작성",
    ],
    finalOracle: `별빛의 선율은 ${strongestSection?.planetKo || "당신의 중심"}에서 시작해 ${shadowSection?.planetKo || "그림자"}를 통과하고, ${soulSection?.planetKo || "영혼"}에서 치유의 음색으로 완성됩니다. 오늘의 당신은 이미 변화를 시작했고, 그 변화는 작은 조율의 반복 속에서 현실에 고요히 새겨질 것입니다.`,
    closingFortune,
  };
}

function buildClosingFortune({
  strongestSection,
  shadowSection,
  soulSection,
  loveSection,
  workSection,
  moneySection,
  healthSection,
} = {}) {
  const strongestPlanet = strongestSection?.planetKo || "태양";
  const strongestCard = strongestSection?.cardNameKo || "핵심 카드";
  const shadowPlanet = shadowSection?.planetKo || "명왕성";
  const soulPlanet = soulSection?.planetKo || "금성";
  const lovePlanet = loveSection?.planetKo || "금성";
  const workPlanet = workSection?.planetKo || "토성";
  const moneyPlanet = moneySection?.planetKo || "목성";
  const healthPlanet = healthSection?.planetKo || "달";
  const loveMessage = sanitizeCelestialMelodyText(loveSection?.consciousMessage || "마음의 온도를 천천히 맞추는 흐름이 열립니다.");
  const workMessage = sanitizeCelestialMelodyText(workSection?.integrationPractice || "작은 책임을 끝까지 마무리하는 힘이 중요합니다.");
  const moneyMessage = sanitizeCelestialMelodyText(moneySection?.soulLesson || "확장보다 검증을 먼저 세울 때 자원의 흐름이 안정됩니다.");
  const healthMessage = sanitizeCelestialMelodyText(healthSection?.unconsciousPattern || "감정의 파동을 쉬게 하는 시간이 필요합니다.");

  return {
    title: celestialMelodyText("celestialMelody.closingTitle"),
    overall: `${strongestPlanet}의 자리에서 ${strongestCard}의 빛이 가장 먼저 떠오릅니다. 오늘의 운은 빠르게 밀어붙이는 흐름보다 흩어진 마음을 한곳으로 모을 때 강해집니다. ${shadowPlanet}의 그림자는 오래 미뤄 둔 감정 반응을 조용히 비추지만, 그것은 막힘이 아니라 방향을 다시 맞추라는 신호에 가깝습니다. ${soulPlanet}의 선율은 당신이 이미 알고 있던 답을 현실의 작은 행동으로 옮기라고 속삭입니다. 오늘은 큰 결론보다 한 가지 약속을 끝까지 지킬 때 별빛의 흐름이 편안하게 열립니다.`,
    love: `${lovePlanet}의 기운은 관계에서 말보다 분위기를 먼저 읽으라고 가리킵니다. ${loveMessage} 오늘은 마음을 시험하기보다 필요한 감정을 한 문장으로 부드럽게 전할수록 인연의 결이 안정됩니다.`,
    work: `${workPlanet}의 리듬은 일과 성과에서 속도보다 구조를 중시합니다. ${workMessage} 오늘은 가장 부담스러운 일 하나를 작게 나누어 시작하면 막혀 있던 흐름이 다시 움직입니다.`,
    money: `${moneyPlanet}의 빛은 재물과 자원의 운을 넓히되, 기준 없는 확장은 잠시 늦추라고 말합니다. ${moneyMessage} 오늘의 금전운은 큰 선택보다 작은 지출 패턴을 알아차릴 때 더 단단해집니다.`,
    health: `${healthPlanet}의 물결은 몸과 마음의 회복을 섬세하게 비춥니다. ${healthMessage} 오늘은 수면, 호흡, 물 한 잔처럼 단순한 회복 의식이 전체 운의 균형을 다시 세웁니다.`,
  };
}

function validateCelestialMelodyReading(reading) {
  const errors = [];
  const sections = Array.isArray(reading?.cards) ? reading.cards : [];
  if (sections.length !== 11) errors.push("11개 행성 카드가 필요합니다.");

  const planetSet = new Set();
  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i] || {};
    if (!text(section.planetId)) errors.push(`${i + 1}번 카드: planetId 누락`);
    if (planetSet.has(section.planetId)) errors.push(`${section.planetId}: 행성 중복 매핑`);
    planetSet.add(section.planetId);
    if (!text(section.cardNameKo)) errors.push(`${section.planetKo || i + 1}: 카드명 누락`);
    if (!["upright", "reversed"].includes(text(section.orientation))) errors.push(`${section.planetKo || i + 1}: 방향 누락`);

    [
      "cardMeaning",
      "planetMeaning",
      "archetypeReading",
      "consciousMessage",
      "unconsciousPattern",
      "shadowWarning",
      "soulLesson",
      "integrationPractice",
    ].forEach((key) => {
      if (text(section[key]).length < 20) errors.push(`${section.planetKo || i + 1}: ${key} 문장 부족`);
    });
  }

  const allText = sections
    .map((section) => [
      section.archetypeReading,
      section.consciousMessage,
      section.unconsciousPattern,
      section.shadowWarning,
      section.soulLesson,
      section.integrationPractice,
    ].join(" "))
    .join(" ");

  const totalLength = allText.length + text(reading?.summary?.overallTheme).length;
  if (totalLength < 6000) errors.push("전체 결과 분량이 부족합니다.");
  if (text(reading?.summary?.overallTheme).length < 1000) errors.push("종합 리딩 분량이 부족합니다.");
  const closingFortune = reading?.summary?.closingFortune || {};
  if (!text(closingFortune.title)) errors.push("closingFortune.title 누락");
  ["overall", "love", "work", "money", "health"].forEach((key) => {
    if (text(closingFortune[key]).length < 10) errors.push(`closingFortune.${key} 문장 부족`);
  });

  return { ok: errors.length === 0, errors };
}

function drawFromInputCards(cards) {
  const prepared = Array.isArray(cards) ? cards.slice(0, 11) : [];
  while (prepared.length < 11) prepared.push({});
  return CELESTIAL_MELODY_SPREAD.map((planet, idx) => ({
    planet,
    card: resolveCardModel(prepared[idx], idx),
    orientation: resolveOrientation(prepared[idx], idx),
  }));
}

function buildCelestialMelodyReading({ cards, payment = {}, version = "20260605-celestial-llm-v1" } = {}) {
  const drawn = drawFromInputCards(cards);
  const sections = drawn.map((entry) => buildCelestialMelodySection(entry.card, entry.planet, entry.orientation));
  const summary = buildSummary(sections);
  const reading = {
    spreadName: "천체의 선율 타로",
    mode: "local-first",
    generatedAt: new Date().toISOString(),
    payment: {
      coinCharged: Boolean(payment.coinCharged),
      transactionId: text(payment.transactionId) || undefined,
      reportId: text(payment.reportId) || undefined,
      requestId: text(payment.requestId) || undefined,
      sessionId: text(payment.sessionId || payment.reportSessionId) || undefined,
      reportSessionId: text(payment.reportSessionId || payment.sessionId) || undefined,
      purchaseId: text(payment.purchaseId) || undefined,
      featureKey: text(payment.featureKey) || undefined,
      reportType: text(payment.reportType) || undefined,
      cost: Number(payment.cost || 0) || undefined,
      accessType: text(payment.accessType) || undefined,
      restoredFromPaidSession: Boolean(payment.restoredFromPaidSession),
    },
    cards: sections,
    summary,
    meta: {
      cardCount: 11,
      apiUsed: Boolean(payment.apiUsed),
      localSkeletonUsed: true,
      version,
    },
  };

  const quality = validateCelestialMelodyReading(reading);
  return {
    reading,
    quality,
  };
}

function getStorage(storage) {
  if (storage && typeof storage.getItem === "function") return storage;
  if (typeof globalThis !== "undefined" && globalThis.localStorage && typeof globalThis.localStorage.getItem === "function") {
    return globalThis.localStorage;
  }
  return null;
}

function restorePaidCelestialSession(transactionIdOrReportId, storage) {
  const token = text(transactionIdOrReportId);
  if (!token) return null;
  const store = getStorage(storage);
  if (!store) return null;

  const directKey = `${STORAGE_PREFIX}${token}`;
  const directRaw = text(store.getItem(directKey));
  if (directRaw) {
    try {
      const parsed = JSON.parse(directRaw);
      if (parsed && parsed.reading) return parsed.reading;
    } catch (_) {
      return null;
    }
  }

  const indexRaw = text(store.getItem(`${STORAGE_PREFIX}index`));
  if (!indexRaw) return null;
  try {
    const index = JSON.parse(indexRaw);
    const keys = Array.isArray(index?.keys) ? index.keys : [];
    for (const key of keys) {
      const raw = text(store.getItem(key));
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const reading = parsed?.reading;
      const payment = reading?.payment || {};
      if (
        payment.reportId === token
        || payment.transactionId === token
        || payment.requestId === token
        || payment.sessionId === token
        || payment.reportSessionId === token
      ) {
        return reading;
      }
    }
  } catch (_) {
    return null;
  }
  return null;
}

function persistCelestialSession(reading, storage) {
  if (!reading || typeof reading !== "object") return;
  const store = getStorage(storage);
  if (!store) return;
  const payment = reading.payment || {};
  const id = text(payment.reportId || payment.transactionId || payment.requestId || payment.sessionId || reading.generatedAt);
  if (!id) return;

  const key = `${STORAGE_PREFIX}${id}`;
  store.setItem(key, JSON.stringify({ reading, savedAt: new Date().toISOString() }));

  const keys = [key];
  const existingRaw = text(store.getItem(`${STORAGE_PREFIX}index`));
  if (existingRaw) {
    try {
      const existing = JSON.parse(existingRaw);
      if (Array.isArray(existing?.keys)) keys.push(...existing.keys.filter((item) => item !== key));
    } catch (_) {
      return;
    }
  }
  store.setItem(`${STORAGE_PREFIX}index`, JSON.stringify({ keys: keys.slice(0, 20) }));
}

export {
  CELESTIAL_MELODY_SPREAD,
  PLANET_ARCHETYPES,
  sanitizeCelestialMelodyText,
  removeRepeatedCelestialPhrases,
  validateCelestialMelodyReading,
  buildCelestialMelodySection,
  buildCelestialMelodyReading,
  restorePaidCelestialSession,
  persistCelestialSession,
  LAYERS,
};
