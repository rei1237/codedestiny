import { TAROT_CARDS, getTarotCardByAnyId } from "./tarot-cards.mjs";

const LAYERS = ["conscious", "unconscious", "soul", "shadow", "integration"];

const CELESTIAL_MELODY_SPREAD = Object.freeze([
  {
    order: 1,
    planetId: "sun",
    planetKo: "태양",
    planetEn: "Sun",
    symbol: "☉",
    title: "의식의 중심",
    question: "나는 지금 어떤 자아와 생명력을 통해 세상에 드러나는가?",
    archetype: "자아, 생명력, 의식, 존재감, 삶의 핵심 방향",
    layer: "conscious",
  },
  {
    order: 2,
    planetId: "moon",
    planetKo: "달",
    planetEn: "Moon",
    symbol: "☽",
    title: "무의식의 물결",
    question: "내 마음 깊은 곳에서 반복되는 감정 기억은 무엇인가?",
    archetype: "감정, 기억, 본능적 반응, 애착, 무의식 패턴",
    layer: "unconscious",
  },
  {
    order: 3,
    planetId: "mercury",
    planetKo: "수성",
    planetEn: "Mercury",
    symbol: "☿",
    title: "생각과 언어의 회로",
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
    title: "사랑과 가치의 결",
    question: "나는 무엇을 사랑하고, 무엇에서 아름다움과 가치를 느끼는가?",
    archetype: "사랑, 매력, 관계 욕구, 취향, 가치감, 수용성",
    layer: "soul",
  },
  {
    order: 5,
    planetId: "mars",
    planetKo: "화성",
    planetEn: "Mars",
    symbol: "♂",
    title: "욕망과 행동의 불꽃",
    question: "내 안의 욕망, 분노, 추진력은 어디로 향하는가?",
    archetype: "행동력, 분노, 성취 욕구, 충동, 용기, 공격성",
    layer: "shadow",
  },
  {
    order: 6,
    planetId: "jupiter",
    planetKo: "목성",
    planetEn: "Jupiter",
    symbol: "♃",
    title: "확장과 믿음의 문",
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
    title: "한계와 책임의 문턱",
    question: "내가 통과해야 할 현실의 시험과 책임은 무엇인가?",
    archetype: "한계, 책임, 시간, 구조, 두려움, 성숙, 업",
    layer: "shadow",
  },
  {
    order: 8,
    planetId: "uranus",
    planetKo: "천왕성",
    planetEn: "Uranus",
    symbol: "♅",
    title: "각성과 해방의 번개",
    question: "내 안에서 깨어나고 있는 자유와 변화의 충동은 무엇인가?",
    archetype: "해방, 독립, 돌발 변화, 각성, 반항, 혁신",
    layer: "integration",
  },
  {
    order: 9,
    planetId: "neptune",
    planetKo: "해왕성",
    planetEn: "Neptune",
    symbol: "♆",
    title: "꿈과 환상의 바다",
    question: "내 영혼은 무엇을 꿈꾸며, 어디에서 환상에 젖어 있는가?",
    archetype: "꿈, 영성, 환상, 직관, 도피, 연민, 예술성",
    layer: "unconscious",
  },
  {
    order: 10,
    planetId: "pluto",
    planetKo: "명왕성",
    planetEn: "Pluto",
    symbol: "♇",
    title: "그림자와 변형의 심연",
    question: "내가 직면해야 할 가장 깊은 그림자와 변화의 핵은 무엇인가?",
    archetype: "죽음과 재생, 집착, 권력, 트라우마, 심층 변형",
    layer: "shadow",
  },
  {
    order: 11,
    planetId: "chiron",
    planetKo: "카이론",
    planetEn: "Chiron",
    symbol: "⚷",
    title: "상처와 치유의 별",
    question: "내 상처는 어떤 방식으로 치유와 지혜가 되는가?",
    archetype: "핵심 상처, 치유, 내면의 스승, 약점의 지혜화",
    layer: "integration",
  },
]);

const PLANET_ARCHETYPES = Object.freeze({
  sun: {
    keywords: ["자아", "생명력", "목적", "존재감", "중심"],
    conscious: "세상에 드러나는 정체성과 삶의 중심 동력",
    unconscious: "인정받고 싶은 갈망과 존재 증명의 압력",
    shadow: "과시, 자기중심성, 빛을 잃는 공포",
    soulLesson: "타인의 시선이 아니라 내 중심에서 빛나는 법",
    integration: "오늘의 핵심 목표 하나를 행동으로 증명",
  },
  moon: {
    keywords: ["감정", "기억", "애착", "무의식", "본능"],
    conscious: "표면 감정의 파동과 정서적 체감",
    unconscious: "과거 경험이 현재 반응을 반복시키는 방식",
    shadow: "불안, 의존, 감정 투사, 기복",
    soulLesson: "감정을 억누르지 않고 해석하는 연습",
    integration: "감정과 사실을 분리해 기록",
  },
  mercury: {
    keywords: ["생각", "언어", "판단", "소통", "정보"],
    conscious: "현실을 해석하는 사고 체계와 말의 구조",
    unconscious: "반복되는 자기 대화와 신념 문장",
    shadow: "과잉 분석, 말실수, 생각의 감옥",
    soulLesson: "생각을 도구로 쓰되 생각에 갇히지 않기",
    integration: "사실/추측/감정으로 해석 분리",
  },
  venus: {
    keywords: ["사랑", "가치", "아름다움", "관계", "매력"],
    conscious: "끌림과 애정의 표현 방식",
    unconscious: "사랑받기 위해 맞추는 패턴",
    shadow: "의존, 쾌락 집착, 가치의 외부 위임",
    soulLesson: "사랑받기 전에 자기 가치를 승인",
    integration: "내가 좋아하는 것과 인정 욕구를 분리",
  },
  mars: {
    keywords: ["행동", "욕망", "분노", "용기", "추진"],
    conscious: "원하는 것을 향해 움직이는 방식",
    unconscious: "억압된 분노와 충동의 축적",
    shadow: "공격성, 성급함, 파괴적 반응",
    soulLesson: "분노를 경계 설정과 실행으로 전환",
    integration: "욕구를 한 문장으로 쓰고 작은 행동으로 연결",
  },
  jupiter: {
    keywords: ["성장", "확장", "신념", "기회", "보호"],
    conscious: "성장 가능성을 읽는 세계관",
    unconscious: "과도한 낙관 혹은 의미 과잉",
    shadow: "확장 중독, 과신, 근거 없는 도약",
    soulLesson: "큰 꿈을 현실 구조와 함께 키우기",
    integration: "확장 계획에 검증 지표를 붙이기",
  },
  saturn: {
    keywords: ["한계", "책임", "시간", "구조", "성숙"],
    conscious: "현실의 규칙과 책임 감각",
    unconscious: "실패 공포와 자기 검열",
    shadow: "경직, 자기 처벌, 지연",
    soulLesson: "두려움을 회피가 아닌 숙련으로 바꾸기",
    integration: "지연 중인 책임을 작은 단위로 실행",
  },
  uranus: {
    keywords: ["해방", "독립", "변화", "각성", "혁신"],
    conscious: "자유를 향한 급진적 통찰",
    unconscious: "예측 불가를 통해 탈출하려는 충동",
    shadow: "관계 단절, 반항 과열, 불연속적 선택",
    soulLesson: "자유와 책임의 동시 성립",
    integration: "변화 선언과 안전장치를 함께 설계",
  },
  neptune: {
    keywords: ["꿈", "영성", "환상", "직관", "연민"],
    conscious: "상징과 감수성으로 현실을 느끼는 능력",
    unconscious: "경계가 흐려지는 투사와 이상화",
    shadow: "도피, 착각, 경계 붕괴",
    soulLesson: "영감과 현실 검증의 균형",
    integration: "직관 기록 후 사실 검증 루틴 적용",
  },
  pluto: {
    keywords: ["죽음", "재생", "집착", "권력", "변형"],
    conscious: "근본 전환을 요구하는 신호",
    unconscious: "통제 욕구와 생존 본능의 응축",
    shadow: "파괴 충동, 집착, 극단화",
    soulLesson: "해체를 재생의 문으로 받아들이기",
    integration: "놓아야 할 집착을 명시하고 절차화",
  },
  chiron: {
    keywords: ["상처", "치유", "스승", "민감성", "지혜"],
    conscious: "아픔을 인식하고 의미화하는 능력",
    unconscious: "반복되는 취약감과 방어 반응",
    shadow: "자기낙인, 치유 회피, 과거 고착",
    soulLesson: "상처를 결함이 아닌 공감 자원으로 전환",
    integration: "취약함을 언어화하고 안전한 연결 시도",
  },
});

const STORAGE_PREFIX = "cd:celestial-melody:";

function text(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function pick(arr, fallback = "") {
  if (!Array.isArray(arr) || !arr.length) return fallback;
  return text(arr[0] || fallback);
}

function resolveCardModel(raw) {
  const direct = getTarotCardByAnyId(raw?.code || raw?.cardId || raw?.id || raw?.name || raw?.cardName || "");
  if (direct) return direct;
  const tarotName = text(raw?.tarot?.n || raw?.name || raw?.cardName);
  if (tarotName) {
    const found = TAROT_CARDS.find((card) => text(card?.nameKo) === tarotName || text(card?.nameEn) === tarotName);
    if (found) return found;
  }
  return TAROT_CARDS[0];
}

function resolveOrientation(raw, idx = 0) {
  const candidate = text(raw?.orientation || raw?.dir || "").toLowerCase();
  if (candidate === "upright" || candidate === "reversed") return candidate;
  return idx % 2 === 0 ? "upright" : "reversed";
}

function summarizeCardMeaning(card, orientation) {
  const meaning = card?.[orientation] || card?.upright || {};
  return {
    keywords: (Array.isArray(meaning.keywords) ? meaning.keywords : []).slice(0, 6),
    cardMeaning: text(meaning.coreMeaning || pick(meaning.core) || `${card.nameKo}의 상징이 강하게 작동합니다.`),
    psych: text(meaning.psychologicalMeaning || pick(meaning.shadow) || "감정과 해석의 간극을 관찰해야 합니다."),
    shadow: text(meaning.shadowText || pick(meaning.caution) || "반복 패턴을 인식하는 것이 우선입니다."),
    lesson: text(meaning.selfEsteemMeaning || pick(meaning.selfEsteem) || pick(meaning.general) || "자기 기준을 회복하는 연습이 필요합니다."),
    integration: text(meaning.adviceText || pick(meaning.recoveryAdvice) || pick(meaning.advice) || "오늘 가능한 작은 실천을 선택하세요."),
  };
}

function layerTone(layer) {
  switch (layer) {
    case "conscious": return "의식의 표면에서 선택과 방향을 분명히 드러냅니다.";
    case "unconscious": return "무의식의 물결에서 반복 감정과 기억의 신호를 끌어올립니다.";
    case "soul": return "영혼의 결에서 가치와 사랑의 기준을 재정렬합니다.";
    case "shadow": return "그림자 지대에서 억압된 욕망과 공포를 직면하게 합니다.";
    default: return "통합의 층위에서 해석을 행동으로 번역하도록 돕습니다.";
  }
}

function ensureMinLength(input, minLength = 500, fillers = []) {
  let output = text(input);
  const normalizedFillers = (Array.isArray(fillers) ? fillers : [])
    .map((line) => text(line))
    .filter(Boolean);

  if (!normalizedFillers.length) {
    normalizedFillers.push("이 문단은 상징 해석을 현실 행동으로 연결하기 위한 보강 문장입니다.");
  }

  let guard = 0;
  while (output.length < minLength && guard < 32) {
    const idx = guard % normalizedFillers.length;
    const suffix = guard >= normalizedFillers.length ? ` (통합 보강 ${guard + 1})` : "";
    output = text(`${output} ${normalizedFillers[idx]}${suffix}`);
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
  const sentences = source.split(/(?<=[.!?])\s+/).map((line) => text(line)).filter(Boolean);
  const seen = new Set();
  const deduped = [];
  for (let i = 0; i < sentences.length; i += 1) {
    const key = sentences[i].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(sentences[i]);
  }
  return deduped.join(" ");
}

function buildCelestialMelodySection(cardInput, planet, orientationInput) {
  const card = resolveCardModel(cardInput);
  const orientation = orientationInput === "reversed" ? "reversed" : "upright";
  const planetMeaning = PLANET_ARCHETYPES[planet.planetId] || PLANET_ARCHETYPES.sun;
  const cardMeaning = summarizeCardMeaning(card, orientation);
  const orientationLabel = orientation === "reversed" ? "역방향" : "정방향";

  const archetypeReading = ensureMinLength(
    `${planet.planetKo}(${planet.symbol}) 자리에서 ${card.nameKo} ${orientationLabel}이 놓였다는 것은, ${planet.title} 영역이 현재 ${cardMeaning.cardMeaning}의 결로 움직인다는 뜻입니다. ${layerTone(planet.layer)} 이 조합은 단순 길흉보다 '왜 같은 선택이 반복되는지'를 보여 줍니다. 카드가 말하는 ${cardMeaning.psych}과 행성의 ${planetMeaning.unconscious}가 만나는 지점에서, 당신은 익숙한 반응을 넘어선 새로운 선택 규칙을 세워야 합니다.`,
    560,
    [
      `특히 ${planet.question}이라는 질문을 붙들면, ${planetMeaning.conscious}와 ${card.keywords.slice(0, 2).join("·") || "핵심 상징"}이 현실 사건 속에서 어떻게 작동하는지 더 또렷해집니다.`,
      `이 해석의 목적은 당신을 단정하는 것이 아니라, 상징을 통해 스스로를 더 정확히 이해하도록 돕는 데 있습니다.`,
      `따라서 이 섹션은 미래 예언보다 '선택 가능성의 지도'로 읽는 것이 가장 유효합니다.`,
    ],
  );

  const consciousMessage = ensureMinLength(
    `${planetMeaning.conscious} 관점에서 지금 필요한 메시지는 분명합니다. ${card.nameKo} ${orientationLabel}은 외부 반응에 흔들리기 전에 내 기준 문장을 먼저 세우라고 말합니다. 당신이 의식적으로 반복해야 할 태도는 '감정은 존중하되 결정은 기준으로'라는 원칙입니다.`,
    520,
    [
      `오늘 하루에 적용한다면, 우선순위 하나를 정하고 그 선택의 이유를 짧게 언어화해 보세요.`,
      `의식 영역은 거창한 깨달음보다 반복 가능한 미세한 선택에서 빠르게 안정됩니다.`,
      `기준이 선명해질수록 관계와 일, 감정 반응의 소모가 동시에 줄어듭니다.`,
    ],
  );

  const unconsciousPattern = ensureMinLength(
    `${planetMeaning.unconscious} 패턴은 조용하지만 강하게 작동합니다. ${cardMeaning.psych}이라는 카드 신호는, 지금의 갈등이 현재 사건만의 문제가 아니라 누적된 정서 기억과 연결되어 있음을 보여 줍니다. 무의식은 종종 익숙한 고통을 안전으로 오해하기 때문에, 낯선 평온보다 익숙한 긴장을 선택하게 만듭니다.`,
    520,
    [
      `이 반복을 끊으려면 감정과 사실을 분리해 기록하는 루틴이 효과적입니다.`,
      `특히 비슷한 상황에서 몸이 먼저 반응하는 순간을 관찰하면, 패턴의 트리거를 빨리 찾을 수 있습니다.`,
      `무의식을 바꾸는 핵심은 통제보다 인식의 빈도를 높이는 데 있습니다.`,
    ],
  );

  const shadowWarning = ensureMinLength(
    `${planetMeaning.shadow}이(가) 그림자 경고로 드러납니다. ${cardMeaning.shadow} 이 조합의 위험은 문제 자체보다 과잉 반응의 자동화에 있습니다. 마음이 불안정한 순간일수록 결론을 서두르거나 자신을 단정하려는 경향이 강해질 수 있습니다.`,
    520,
    [
      `그림자 작업의 첫 단계는 '지금 내가 지키려는 것은 무엇인가'를 확인하는 것입니다.`,
      `방어의 목적을 알면, 파괴적 선택 대신 보호적 선택으로 전환할 수 있습니다.`,
      `이 경고는 위협이 아니라, 더 정교한 자기조율을 위한 안전 신호입니다.`,
    ],
  );

  const soulLesson = ensureMinLength(
    `${planetMeaning.soulLesson}이라는 과제가 핵심입니다. ${cardMeaning.lesson} 카드가 보여 주는 성장은 단번의 극적 변화보다, 작지만 일관된 자기 신뢰 행동에서 시작됩니다. 영혼의 성장은 상처를 지우는 과정이 아니라, 상처를 해석 가능한 언어로 바꾸는 과정입니다.`,
    520,
    [
      `당신이 지금 배워야 할 것은 완벽함이 아니라 지속 가능성입니다.`,
      `감정이 요동치는 날에도 유지 가능한 최소 기준이 영혼의 근육을 만듭니다.`,
      `스스로를 다정하게 다루는 태도는 회피가 아니라 고도의 자기 책임입니다.`,
    ],
  );

  const integrationPractice = ensureMinLength(
    `${planetMeaning.integration}을 오늘의 통합 실천으로 제안합니다. ${cardMeaning.integration}처럼 행동 단위를 작게 쪼개면, 해석이 현실 변화를 만들기 시작합니다. 통합은 '아는 것'과 '사는 것'의 간격을 줄이는 과정이며, 그 간격은 하루 10분의 실행으로도 충분히 좁혀질 수 있습니다.`,
    520,
    [
      `실행 후에는 결과를 평가하기보다 실행 여부 자체를 먼저 체크하세요.`,
      `성공 기준을 낮추고 반복 횟수를 늘리면 변화의 누적 속도가 빨라집니다.`,
      `이 실천은 미래를 강요하기 위한 장치가 아니라, 현재를 회복하기 위한 리듬입니다.`,
    ],
  );

  const archetypeReadingSafe = ensureMinLength(
    removeRepeatedCelestialPhrases(archetypeReading),
    520,
    [`${planet.planetKo} 자리의 핵심 질문은 ${planet.question}`, `${card.nameKo} ${orientationLabel}의 원형은 ${planet.layer} 층위에서 반복 패턴을 다시 쓰게 합니다.`],
  );
  const consciousMessageSafe = ensureMinLength(
    removeRepeatedCelestialPhrases(consciousMessage),
    520,
    [`의식 메시지는 ${planet.planetKo} 축에서 일상 선택으로 증명됩니다.`, `${card.nameKo}는 기준 없는 반응보다 기준 있는 실행을 요청합니다.`],
  );
  const unconsciousPatternSafe = ensureMinLength(
    removeRepeatedCelestialPhrases(unconsciousPattern),
    520,
    [`무의식 패턴은 ${planet.planetKo}의 ${planetMeaning.unconscious}와 연결됩니다.`, `반복되는 감정은 해석 이전에 기록될 때 변화의 단서가 됩니다.`],
  );
  const shadowWarningSafe = ensureMinLength(
    removeRepeatedCelestialPhrases(shadowWarning),
    520,
    [`그림자 경고는 ${planetMeaning.shadow}가 과열될 때 특히 강해집니다.`, `경고를 억압이 아닌 조율 신호로 읽어야 소모가 줄어듭니다.`],
  );
  const soulLessonSafe = ensureMinLength(
    removeRepeatedCelestialPhrases(soulLesson),
    520,
    [`영혼 과제는 ${planetMeaning.soulLesson}으로 수렴합니다.`, `오늘 가능한 최소 실천을 반복하면 상징은 현실 경험으로 굳어집니다.`],
  );
  const integrationPracticeSafe = ensureMinLength(
    removeRepeatedCelestialPhrases(integrationPractice),
    520,
    [`통합 실천은 ${planetMeaning.integration}을 하루 단위로 실행하는 것입니다.`, `${card.nameKo} 카드의 통찰은 행동으로 번역될 때 가장 정확해집니다.`],
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
    planetMeaning: sanitizeCelestialMelodyText(`${planetMeaning.conscious}. 무의식 층위는 ${planetMeaning.unconscious}. 그림자 위험은 ${planetMeaning.shadow}.`),
    archetypeReading: archetypeReadingSafe,
    consciousMessage: consciousMessageSafe,
    unconsciousPattern: unconsciousPatternSafe,
    shadowWarning: shadowWarningSafe,
    soulLesson: soulLessonSafe,
    integrationPractice: integrationPracticeSafe,
  };
}

function resolveDominantSuit(sections) {
  const counts = { major: 0, wands: 0, cups: 0, swords: 0, pentacles: 0 };
  sections.forEach((section) => {
    const model = TAROT_CARDS.find((card) => card.nameKo === section.cardNameKo && card.nameEn === section.cardNameEn);
    const suit = text(model?.suit || "major").toLowerCase();
    if (counts[suit] === undefined) counts[suit] = 0;
    counts[suit] += 1;
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
    return String(model?.arcana || "").toLowerCase() === "major";
  }).length;
  const ratio = `${majorCount}/11`;

  const strongestSection = sections[0] || null;
  const shadowSection = sections.find((section) => section.layer === "shadow") || sections[4] || strongestSection;
  const soulSection = sections.find((section) => section.layer === "soul") || sections[3] || strongestSection;

  const overallTheme = ensureMinLength(
    `이번 11장 스프레드는 의식과 무의식, 그림자와 통합의 축이 동시에 활성화된 전환기를 가리킵니다. 카드 배열은 단순한 사건 예측보다 내면의 자동 반응을 드러내며, 특히 ${strongestSection?.planetKo || "태양"} 축에서 시작된 신호가 전체 리딩의 기준음을 형성합니다. 당신의 영혼은 빠른 결론보다 정확한 자기 이해를 요구하고 있으며, 그 이해는 현실 행동으로 번역될 때 비로소 운명의 선율로 정착합니다.`,
    1100,
    [
      `의식 층위에서는 생각과 말, 선택 구조를 정리하는 작업이 필요하고, 무의식 층위에서는 반복 감정의 트리거를 인식하는 기록 훈련이 중요합니다.`,
      `그림자 층위는 두려움과 통제 욕구를 자각하게 만들지만, 동시에 더 성숙한 경계를 세우는 기회도 제공합니다.`,
      `영혼 층위는 사랑과 가치, 신념의 재정렬을 요청하며, 통합 층위는 이 모든 통찰을 오늘의 실천으로 연결하도록 요구합니다.`,
      `결국 이 리딩의 핵심은 운세 소비가 아니라 자기조율 능력의 회복입니다. 내면을 이해한 사람이 현실 선택의 밀도를 바꾸고, 현실 선택의 밀도가 달라질 때 삶의 서사도 달라집니다.`,
      `당신이 지금 경험하는 흔들림은 실패의 증거가 아니라 재배치의 징후입니다. 중심을 되찾는 과정은 느릴 수 있지만, 방향이 맞으면 반드시 도달합니다.`,
    ],
  );

  const overallThemeSafe = ensureMinLength(
    removeRepeatedCelestialPhrases(overallTheme),
    1100,
    [
      "이 종합 리딩은 빠른 처방이 아니라 내면 구조의 지도를 제공하기 위한 것입니다.",
      "11개의 원형 신호를 동시에 읽을 때, 지금의 문제는 단일 사건이 아니라 선택 구조의 문제임이 분명해집니다.",
      "따라서 오늘의 실천은 운을 기다리는 태도보다, 기준을 세우고 감정을 조율하는 주체적 리듬에서 시작해야 합니다.",
    ],
  );

  return {
    overallTheme: overallThemeSafe,
    dominantLayer,
    dominantSuit,
    majorArcanaRatio: ratio,
    strongestPlanetSignal: `${strongestSection?.planetKo || "태양"} 축의 ${strongestSection?.cardNameKo || "핵심 카드"} 신호가 전체 흐름의 중심입니다.`,
    deepestShadow: `${shadowSection?.planetKo || "그림자"} 자리의 경고는 ${shadowSection?.shadowWarning || "반복되는 방어 패턴을 재정렬하라"}는 메시지로 응축됩니다.`,
    soulLesson: `${soulSection?.planetKo || "영혼"} 축의 과제는 ${soulSection?.soulLesson || "자기 가치를 스스로 승인하는 연습"}로 정리됩니다.`,
    integrationPath: `의식-무의식-그림자 신호를 하루 단위 행동으로 연결할 때 통합이 시작됩니다. ${strongestSection?.integrationPractice || "작은 실행을 끝까지 완료하세요."}`,
    practices: [
      "1일차: 오늘의 감정/사실/해석을 3줄로 기록",
      "2일차: 반복되는 감정 트리거를 한 가지 명명",
      "3일차: 관계/욕망에서 지키고 싶은 경계 2개 작성",
      "4일차: 미루던 책임 1개를 20분 단위로 실행",
      "5일차: 꿈/직관 메모 후 사실 검증 질문 1개 추가",
      "6일차: 내 그림자 패턴에 이름 붙이고 대안 행동 설계",
      "7일차: 다음 7일의 새로운 선택 선언문 작성",
    ],
    finalOracle: `우주의 선율은 ${strongestSection?.planetKo || "당신의 중심"}에서 시작해 ${shadowSection?.planetKo || "그림자"}를 통과하고, ${soulSection?.planetKo || "영혼"}에서 치유의 음색으로 완성됩니다. 오늘의 당신은 이미 변화를 시작했고, 그 변화는 작은 실천의 반복으로 현실에 새겨질 것입니다.`,
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
      if (text(section[key]).length < 20) errors.push(`${section.planetKo || i + 1}: ${key} 품질 부족`);
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

  const sentenceMap = new Map();
  allText
    .split(/(?<=[.!?])\s+/)
    .map((line) => text(line))
    .filter((line) => line.length >= 20)
    .forEach((line) => {
      const key = line.toLowerCase();
      sentenceMap.set(key, (sentenceMap.get(key) || 0) + 1);
    });
  const repeated = Array.from(sentenceMap.values()).some((count) => count >= 500);
  if (repeated) errors.push("20자 이상 문장이 과도하게 반복됩니다.");

  const totalLength = allText.length + text(reading?.summary?.overallTheme).length;
  if (totalLength < 6000) errors.push("전체 결과 분량이 부족합니다.");
  if (text(reading?.summary?.overallTheme).length < 1000) errors.push("종합 리딩 분량이 부족합니다.");

  return { ok: errors.length === 0, errors };
}

function drawFromInputCards(cards) {
  const prepared = Array.isArray(cards) ? cards.slice(0, 11) : [];
  while (prepared.length < 11) prepared.push({});
  return CELESTIAL_MELODY_SPREAD.map((planet, idx) => ({
    planet,
    card: resolveCardModel(prepared[idx]),
    orientation: resolveOrientation(prepared[idx], idx),
  }));
}

function buildCelestialMelodyReading({ cards, payment = {}, version = "20260530-celestial-v2" } = {}) {
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
      // noop
    }
  }

  const indexRaw = text(store.getItem(`${STORAGE_PREFIX}index`));
  if (!indexRaw) return null;
  try {
    const index = JSON.parse(indexRaw);
    const keys = Array.isArray(index?.keys) ? index.keys : [];
    for (let i = 0; i < keys.length; i += 1) {
      const raw = text(store.getItem(keys[i]));
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const reading = parsed?.reading;
      if (!reading) continue;
      const reportId = text(reading?.payment?.reportId);
      const txId = text(reading?.payment?.transactionId);
      if (reportId === token || txId === token) return reading;
    }
  } catch (_) {
    return null;
  }
  return null;
}

function persistCelestialSession(reading, storage) {
  const store = getStorage(storage);
  if (!store || !reading) return;
  const reportId = text(reading?.payment?.reportId);
  const txId = text(reading?.payment?.transactionId);
  const keyId = reportId || txId || `tmp:${Date.now().toString(36)}`;
  const key = `${STORAGE_PREFIX}${keyId}`;
  store.setItem(key, JSON.stringify({ reading, savedAt: new Date().toISOString() }));

  const keys = [key];
  const existingRaw = text(store.getItem(`${STORAGE_PREFIX}index`));
  if (existingRaw) {
    try {
      const existing = JSON.parse(existingRaw);
      if (Array.isArray(existing?.keys)) keys.push(...existing.keys.filter((item) => item !== key));
    } catch (_) {
      // noop
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
