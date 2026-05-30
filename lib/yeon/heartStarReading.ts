export type YeonHeartStarCategory =
  | "todayAura"
  | "heartWeather"
  | "loveRelation"
  | "moneyReality"
  | "selfCare"
  | "luckyRitual"
  | "yeonMessage";

export type YeonCheerCard = {
  title: string;
  subtitle: string;
  zodiacLabel: string;
  dateLabel: string;
  oneLineMessage: string;
  luckySymbol: {
    name: string;
    emoji: string;
    meaning: string;
  };
  auraItem: {
    name: string;
    colorName: string;
    keywords: string[];
  };
  keywords: string[];
  yeonSprite?: string;
};

export type YeonHeartStarCategoryResult = {
  id: YeonHeartStarCategory;
  label: string;
  icon: string;
  keywords: string[];
  shortMessage: string;
  healingReading: string;
  tinyAction: string;
};

export type YeonHeartStarSummary = {
  title: string;
  description: string;
  focusAxis: "emotion" | "relation" | "reality";
  oneLine: string;
};

export type YeonHeartStarReading = {
  reportType: "YEON_HEART_STAR";
  mode: "local-astrology";
  generatedAt: string;
  userInput: {
    zodiacSign: string;
    emotion?: string;
    concernCategory?: string;
  };
  astrologySignals: {
    sunSign: string;
    moonPhase: string;
    weekdayPlanet: string;
    zodiacAspect: string;
    elementResonance: string;
    modalityTone: string;
  };
  displayCard: YeonCheerCard;
  categories: YeonHeartStarCategoryResult[];
  summary: YeonHeartStarSummary;
  meta: {
    engineVersion: string;
    apiUsed: false;
    debugVisible: false;
  };
};

export type ValidationResult = {
  ok: boolean;
  errors: string[];
};

type BuildReadingInput = {
  generatedAt: string;
  zodiacSign: string;
  emotion: string;
  concernCategory: string;
  oneLineMessage: string;
  warmLetter: string;
  luckyItem: string;
  luckySymbolName: string;
  luckySymbolEmoji: string;
  luckySymbolMeaning: string;
  auraColorName: string;
  auraKeywords: string[];
  keywords: string[];
  yeonSprite?: string;
  tinyActions: {
    heartWeather: string;
    loveRelation: string;
    moneyReality: string;
    selfCare: string;
    luckyRitual: string;
  };
};

const CATEGORY_META: Record<YeonHeartStarCategory, { label: string; icon: string }> = {
  todayAura: { label: "오늘의 별빛 요약", icon: "✨" },
  heartWeather: { label: "마음 날씨", icon: "🌙" },
  loveRelation: { label: "사랑과 관계", icon: "💗" },
  moneyReality: { label: "현실과 돈", icon: "🌿" },
  selfCare: { label: "나를 돌보는 방법", icon: "🫶" },
  luckyRitual: { label: "오늘의 행운 리추얼", icon: "🍑" },
  yeonMessage: { label: "연이의 한마디", icon: "🐷" },
};

const BANNED_PATTERNS = [
  /점성술 계산 근거/gi,
  /계산 기반 상세 상담/gi,
  /입력 기준/gi,
  /태양 기준값/gi,
  /사용자 기준값/gi,
  /별자리 각도 계산/gi,
  /달 위상 계산/gi,
  /요일 행성 계산/gi,
  /원소 상성 계산/gi,
  /점수식/gi,
  /bias/gi,
  /\bO\/L\/M\b/g,
  /달\s*나이/gi,
  /조도/gi,
  /선택된 스프라이트 프레임/gi,
  /디버그/gi,
  /payload/gi,
  /raw\s*data/gi,
  /engine\s*result/gi,
  /계산\s*JSON/gi,
];

const STIFF_TONE_PATTERNS = [/확정 수익/gi, /투자 추천/gi, /반드시 매수/gi, /진단 결과/gi];

function limitChars(text: string, limit: number) {
  const value = sanitizeYeonHeartStarText(text);
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trim()}...`;
}

function trimKeywords(words: string[], max = 3) {
  const uniq: string[] = [];
  for (const raw of words) {
    const w = sanitizeYeonHeartStarText(raw).replace(/^#/, "");
    if (!w) continue;
    const normalized = w.toLowerCase();
    if (uniq.some((existing) => existing.toLowerCase() === normalized)) continue;
    uniq.push(`#${w}`);
    if (uniq.length >= max) break;
  }
  return uniq;
}

function mapMoonToHealing(phase: string) {
  const text = String(phase || "").toLowerCase();
  if (text.includes("new") || text.includes("신월")) return "오늘은 마음의 새 페이지를 여는 날이에요.";
  if (text.includes("first") || text.includes("상현")) return "아직 완벽하지 않아도, 오늘은 작게 밀어붙이는 힘이 필요해요.";
  if (text.includes("full") || text.includes("보름") || text.includes("망")) {
    return "오늘의 달은 마음속에 쌓인 감정을 더 선명하게 비춰줘요.";
  }
  if (text.includes("last") || text.includes("하현") || text.includes("waning")) {
    return "오늘은 더 채우기보다, 마음에 무거운 것을 조금 덜어내는 날이에요.";
  }
  return "오늘은 마음의 속도를 천천히 맞출수록 편안해져요.";
}

function mapWeekdayToHealing(planetLabel: string) {
  const text = String(planetLabel || "");
  if (text.includes("달")) return "오늘은 감정을 잘 돌봐줄수록 하루 전체가 부드러워져요.";
  if (text.includes("화성")) return "오늘은 용기 있게 시작하되, 말의 온도를 부드럽게 지켜봐요.";
  if (text.includes("수성")) return "오늘은 대화와 메모가 마음을 정리해주는 열쇠가 돼요.";
  if (text.includes("목성")) return "오늘은 작게 넓히는 선택이 내일의 가능성을 키워줘요.";
  if (text.includes("금성")) return "오늘은 사랑과 다정함을 표현할수록 관계가 편안해져요.";
  if (text.includes("토성")) return "오늘은 마음을 다잡고 현실을 차분히 정리할수록 편안해지는 날이에요.";
  if (text.includes("태양")) return "오늘은 나를 밝히는 작은 자신감이 큰 회복으로 이어져요.";
  return "오늘은 내 페이스를 지키는 선택이 가장 큰 힘이 돼요.";
}

function mapFocusAxis(aspect: string, resonance: string): "emotion" | "relation" | "reality" {
  const key = `${aspect} ${resonance}`;
  if (/대립|직각|긴장/.test(key)) return "emotion";
  if (/삼분|육분|공명|상보/.test(key)) return "relation";
  return "reality";
}

export function removeAstrologyDebugText(text: string): string {
  let result = String(text || "");
  for (const pattern of BANNED_PATTERNS) {
    result = result.replace(pattern, "");
  }
  return result;
}

export function sanitizeYeonHeartStarText(text: string): string {
  const cleaned = removeAstrologyDebugText(text)
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001F]+/g, " ")
    .trim();
  return cleaned;
}

export function buildYeonCheerCard(reading: YeonHeartStarReading): YeonCheerCard {
  return {
    ...reading.displayCard,
    oneLineMessage: limitChars(reading.displayCard.oneLineMessage, 70),
    luckySymbol: {
      ...reading.displayCard.luckySymbol,
      meaning: limitChars(reading.displayCard.luckySymbol.meaning, 45),
    },
    auraItem: {
      ...reading.displayCard.auraItem,
      keywords: trimKeywords(reading.displayCard.auraItem.keywords, 3),
    },
    keywords: trimKeywords(reading.displayCard.keywords, 3),
  };
}

export function buildYeonHeartStarReading(
  input: BuildReadingInput,
  astrologySignals: YeonHeartStarReading["astrologySignals"]
): YeonHeartStarReading {
  const moodLine = mapMoonToHealing(astrologySignals.moonPhase);
  const weekdayLine = mapWeekdayToHealing(astrologySignals.weekdayPlanet);
  const focusAxis = mapFocusAxis(astrologySignals.zodiacAspect, astrologySignals.elementResonance);

  const categories: YeonHeartStarCategoryResult[] = [
    {
      id: "todayAura",
      ...CATEGORY_META.todayAura,
      keywords: trimKeywords(["오늘의별빛", "마음리듬", input.emotion]),
      shortMessage: limitChars(`${astrologySignals.sunSign}의 결이 오늘 너의 마음에 잔잔한 방향을 만들어줘요.`, 90),
      healingReading: sanitizeYeonHeartStarText(`${weekdayLine} ${moodLine}`),
      tinyAction: "오늘 꼭 해야 할 일 1개만 정하고, 나머지는 가볍게 미뤄도 괜찮아요.",
    },
    {
      id: "heartWeather",
      ...CATEGORY_META.heartWeather,
      keywords: trimKeywords(["마음날씨", "숨고르기", "조용한회복"]),
      shortMessage: moodLine,
      healingReading: sanitizeYeonHeartStarText(
        `지금의 감정은 지나가는 파도처럼 움직이고 있어요. ${astrologySignals.modalityTone}의 흐름이라 마음을 짧게 메모하면 한결 가벼워져요.`
      ),
      tinyAction: input.tinyActions.heartWeather,
    },
    {
      id: "loveRelation",
      ...CATEGORY_META.loveRelation,
      keywords: trimKeywords(["말의온도", "부드러운거리", "다정한표현"]),
      shortMessage: "관계에서는 정답보다 말의 온도를 먼저 맞추는 것이 좋아요.",
      healingReading: sanitizeYeonHeartStarText(
        `오늘은 ${astrologySignals.zodiacAspect}의 결이 있어서 말 한마디의 질감이 크게 느껴질 수 있어요. 결론보다 공감 문장 하나를 먼저 건네보세요.`
      ),
      tinyAction: input.tinyActions.loveRelation,
    },
    {
      id: "moneyReality",
      ...CATEGORY_META.moneyReality,
      keywords: trimKeywords(["필요한것만", "가벼운정리", "다정한현실감각"]),
      shortMessage: "현실은 무겁게 끌어안기보다 작게 정리할수록 마음이 편해져요.",
      healingReading: sanitizeYeonHeartStarText(
        `${astrologySignals.elementResonance}의 흐름이라 오늘은 큰 결정보다 생활 리듬 정리가 더 효과적이에요.`
      ),
      tinyAction: input.tinyActions.moneyReality,
    },
    {
      id: "selfCare",
      ...CATEGORY_META.selfCare,
      keywords: trimKeywords(["쉬어도괜찮아", "몸의신호", "나를먼저"]),
      shortMessage: "오늘의 회복은 속도를 늦추는 순간부터 시작돼요.",
      healingReading: sanitizeYeonHeartStarText(
        `지금은 억지로 밝아지기보다 몸의 신호를 들어주는 게 더 중요해요. 작은 휴식이 내일의 힘을 지켜줘요.`
      ),
      tinyAction: input.tinyActions.selfCare,
    },
    {
      id: "luckyRitual",
      ...CATEGORY_META.luckyRitual,
      keywords: trimKeywords(["복숭아빛하루", "행운메모", "연이응원"]),
      shortMessage: "작은 리추얼 하나가 오늘의 마음 결을 부드럽게 바꿔줘요.",
      healingReading: sanitizeYeonHeartStarText(
        `행운 상징 ${input.luckySymbolEmoji} ${input.luckySymbolName}의 의미를 기억해요. ${input.luckySymbolMeaning}`
      ),
      tinyAction: input.tinyActions.luckyRitual,
    },
    {
      id: "yeonMessage",
      ...CATEGORY_META.yeonMessage,
      keywords: trimKeywords(["연이의편지", "다정한응원", "오늘도괜찮아"]),
      shortMessage: limitChars(input.oneLineMessage, 70),
      healingReading: limitChars(input.warmLetter, 160),
      tinyAction: "오늘의 너를 덜 괴롭히는 선택 하나만 하고, 그걸 스스로 칭찬해줘요.",
    },
  ];

  const reading: YeonHeartStarReading = {
    reportType: "YEON_HEART_STAR",
    mode: "local-astrology",
    generatedAt: input.generatedAt,
    userInput: {
      zodiacSign: input.zodiacSign,
      emotion: input.emotion,
      concernCategory: input.concernCategory,
    },
    astrologySignals,
    displayCard: {
      title: "YEON HEART STAR",
      subtitle: "연이의 마음 별자리",
      zodiacLabel: input.zodiacSign,
      dateLabel: input.generatedAt.slice(0, 10),
      oneLineMessage: limitChars(input.oneLineMessage, 70),
      luckySymbol: {
        name: input.luckySymbolName,
        emoji: input.luckySymbolEmoji,
        meaning: limitChars(input.luckySymbolMeaning, 45),
      },
      auraItem: {
        name: input.luckyItem,
        colorName: input.auraColorName,
        keywords: trimKeywords(input.auraKeywords, 3),
      },
      keywords: trimKeywords(input.keywords, 3),
      yeonSprite: input.yeonSprite,
    },
    categories,
    summary: {
      title: "오늘의 별빛 요약",
      description: sanitizeYeonHeartStarText(`${weekdayLine} ${moodLine}`),
      focusAxis,
      oneLine: limitChars(input.oneLineMessage, 70),
    },
    meta: {
      engineVersion: "yeon-heart-star-v2",
      apiUsed: false,
      debugVisible: false,
    },
  };

  reading.displayCard = buildYeonCheerCard(reading);
  return reading;
}

export function validateYeonHeartStarReading(reading: YeonHeartStarReading): ValidationResult {
  const errors: string[] = [];

  const textBucket = [
    reading.displayCard.title,
    reading.displayCard.subtitle,
    reading.displayCard.oneLineMessage,
    reading.displayCard.luckySymbol.meaning,
    ...reading.displayCard.keywords,
    ...reading.categories.flatMap((category) => [
      category.label,
      category.shortMessage,
      category.healingReading,
      category.tinyAction,
      ...category.keywords,
    ]),
  ].join(" ");

  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(textBucket)) {
      errors.push(`forbidden text visible: ${pattern.source}`);
      break;
    }
  }

  if (reading.displayCard.oneLineMessage.length > 70) {
    errors.push("displayCard.oneLineMessage exceeds 70 chars");
  }

  if (reading.displayCard.luckySymbol.meaning.length > 45) {
    errors.push("displayCard.luckySymbol.meaning exceeds 45 chars");
  }

  if (reading.displayCard.auraItem.keywords.length > 3) {
    errors.push("displayCard.auraItem.keywords exceeds 3 items");
  }

  if (reading.categories.length < 5) {
    errors.push("at least 5 sections are required");
  }

  const messageSet = new Set<string>();
  for (const category of reading.categories) {
    if (!category.keywords.length || !category.healingReading || !category.tinyAction) {
      errors.push(`category incomplete: ${category.id}`);
    }
    const normalizedMessage = sanitizeYeonHeartStarText(category.shortMessage);
    if (normalizedMessage) {
      if (messageSet.has(normalizedMessage)) {
        errors.push(`duplicate encouragement text: ${category.id}`);
      }
      messageSet.add(normalizedMessage);
    }
  }

  const signalJoined = Object.values(reading.astrologySignals).join(" ").trim();
  if (!signalJoined) {
    errors.push("astrology signals are missing");
  }

  for (const pattern of STIFF_TONE_PATTERNS) {
    if (pattern.test(textBucket)) {
      errors.push(`stiff or deterministic tone detected: ${pattern.source}`);
      break;
    }
  }

  return { ok: errors.length === 0, errors };
}
