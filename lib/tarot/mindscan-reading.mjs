import { getTarotCardByAnyId, legacyNumericIdToCardCode } from "./tarot-cards.mjs";
import { interpretTarotReading } from "./tarot-interpretation-engine.mjs";

const SECTION_BLUEPRINTS = [
  { slot: 1, icon: "🎭", title: "겉으로 보이는 태도", subtitle: "상대가 겉으로 드러내는 말투와 행동" },
  { slot: 2, icon: "💓", title: "실제 속마음", subtitle: "직접 말하지 못한 진짜 감정" },
  { slot: 3, icon: "🧱", title: "다가오지 않는 이유", subtitle: "연락을 막는 심리적 장벽" },
  { slot: 4, icon: "🫧", title: "숨겨진 욕구", subtitle: "겉으로 말하지 않는 기대" },
  { slot: 5, icon: "⚖️", title: "관계에 대한 판단", subtitle: "관계를 닫았는지 유보 중인지" },
  { slot: 6, icon: "🛰️", title: "앞으로의 흐름", subtitle: "가까운 시일 내 변동 가능성" },
  { slot: 7, icon: "📝", title: "지금 당신에게 필요한 행동", subtitle: "방어를 자극하지 않는 접근 방식" },
];

const POSITION_KEYS = ["surface", "hidden", "fear", "desire", "judgement"];

function asText(value) {
  return String(value || "").trim();
}

function normalizeCardCode(value, fallbackIndex = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return legacyNumericIdToCardCode(value);
  }

  const raw = asText(value);
  if (!raw) {
    return legacyNumericIdToCardCode(fallbackIndex % 78);
  }

  const resolved = getTarotCardByAnyId(raw);
  if (resolved) return resolved.code;

  const n = Number(raw);
  if (Number.isFinite(n)) return legacyNumericIdToCardCode(n);

  return legacyNumericIdToCardCode(fallbackIndex % 78);
}

function normalizePair(pair, idx) {
  const mainCode = normalizeCardCode(pair?.mainCardId ?? pair?.mainCardCode ?? pair?.mainCardName, idx);
  const subCode = normalizeCardCode(pair?.subCardId ?? pair?.subCardCode ?? pair?.subCardName, idx + 9);
  const mainCard = getTarotCardByAnyId(mainCode);
  const subCard = getTarotCardByAnyId(subCode);

  return {
    slot: Number(pair?.slot || idx + 1),
    positionLabel: asText(pair?.positionLabel) || SECTION_BLUEPRINTS[idx]?.title || `포지션 ${idx + 1}`,
    positionMeaning: asText(pair?.positionMeaning) || SECTION_BLUEPRINTS[idx]?.subtitle || "감정 흐름을 읽는 자리",
    mainCard,
    subCard,
  };
}

function loveSignalFromText(text) {
  const source = asText(text);
  if (/가능|열림|회복|반응|연결/.test(source)) return "재접근 가능";
  if (/경계|거리|방어|지연|멈춤/.test(source)) return "방어";
  if (/미련|추억|그리움/.test(source)) return "미련";
  if (/혼란|불안|의심/.test(source)) return "혼란";
  return "긍정";
}

function temperatureFromSignal(signal) {
  if (signal === "재접근 가능") return 5;
  if (signal === "긍정") return 4;
  if (signal === "미련") return 3;
  if (signal === "혼란") return 2;
  return 1;
}

function buildSectionFromCard(blueprint, interpreted, pair) {
  const mainName = interpreted?.cardNameKo || pair?.mainCard?.nameKo || "카드";
  const subName = pair?.subCard?.nameKo || "보조 카드";
  const summary = `${mainName}와 ${subName} 조합은 ${interpreted?.questionSpecificMeaning || "현재 감정 흐름"}을 보여주며, 겉반응과 진심 사이의 간격을 읽게 해 줍니다.`;
  const detail = `${interpreted?.positionMeaning || "이 위치는 핵심 감정 포인트"} ${interpreted?.emotionalMessage || "행동보다 감정의 결을 먼저 확인해 보세요."} 지금은 결론보다 반응 패턴을 차분히 관찰하는 편이 유리합니다.`;
  const signal = loveSignalFromText(`${summary} ${detail}`);

  return {
    slot: blueprint.slot,
    icon: blueprint.icon,
    title: blueprint.title,
    subtitle: blueprint.subtitle,
    content: `${summary} ${detail}`,
    summary,
    detail: [detail],
    mainCardName: mainName,
    subCardName: subName,
    mainCardKeywords: interpreted?.keywords?.slice(0, 3) || [],
    subCardKeywords: pair?.subCard?.keywords?.slice(0, 3) || [],
    loveSignal: signal,
    emotionalTemperature: temperatureFromSignal(signal),
  };
}

function buildSynthesisSection(blueprint, sectionA, sectionB, mode) {
  const mainName = sectionA?.mainCardName || "메인 카드";
  const subName = sectionB?.subCardName || sectionA?.subCardName || "보조 카드";

  const summary = mode === "future"
    ? `${mainName}와 ${subName}의 연결을 보면 감정은 남아 있지만 행동은 신중하게 움직일 가능성이 큽니다.`
    : `${mainName}와 ${subName} 조합은 밀어붙이기보다 부담 없는 접점이 더 효과적이라는 신호입니다.`;

  const detail = mode === "future"
    ? "단기 흐름은 대화 방식에 따라 크게 달라집니다. 짧고 가벼운 안부가 흐름을 여는 열쇠가 되며, 압박 없는 톤이 안정감을 만듭니다."
    : "긴 감정 고백보다 짧은 확인 메시지가 유리합니다. 반응 속도보다 반응의 일관성을 기준으로 판단하고, 질문은 한 번에 하나만 던지세요.";

  const signal = loveSignalFromText(summary + detail);

  return {
    slot: blueprint.slot,
    icon: blueprint.icon,
    title: blueprint.title,
    subtitle: blueprint.subtitle,
    content: `${summary} ${detail}`,
    summary: `${mainName}와 ${subName} 조합은 ${mode === "future" ? "관계 흐름의 변곡점" : "실행 전략"}을 보여줍니다.`,
    detail: [detail],
    mainCardName: mainName,
    subCardName: subName,
    mainCardKeywords: sectionA?.mainCardKeywords || [],
    subCardKeywords: sectionB?.subCardKeywords || [],
    loveSignal: signal,
    emotionalTemperature: temperatureFromSignal(signal),
  };
}

function normalizeTempLabel(score) {
  if (score >= 5) return "재접근 가능";
  if (score >= 4) return "호감";
  if (score >= 3) return "미련";
  if (score >= 2) return "혼란";
  return "거리감";
}

function buildMindscanReadingPayload(pairs) {
  const safePairs = Array.isArray(pairs) ? pairs.slice(0, 5) : [];
  if (!safePairs.length) {
    return {
      ok: false,
      message: "카드 페어 데이터가 필요합니다.",
    };
  }

  const normalizedPairs = safePairs.map(normalizePair);
  const drawnCards = normalizedPairs.map((pair, idx) => ({
    cardId: pair.mainCard?.code,
    orientation: "upright",
    positionKey: POSITION_KEYS[idx] || `slot_${idx + 1}`,
  }));

  const interpreted = interpretTarotReading({
    serviceKey: "mindscan-tarot",
    questionType: "exMind",
    spreadId: "mindscan_five_card",
    drawnCards,
  });

  const baseSections = SECTION_BLUEPRINTS.slice(0, 5).map((blueprint, idx) =>
    buildSectionFromCard(blueprint, interpreted.cards[idx], normalizedPairs[idx]),
  );

  const section6 = buildSynthesisSection(
    SECTION_BLUEPRINTS[5],
    baseSections[1],
    baseSections[4],
    "future",
  );
  const section7 = buildSynthesisSection(
    SECTION_BLUEPRINTS[6],
    baseSections[2],
    baseSections[3],
    "action",
  );

  const sections = [...baseSections, section6, section7];
  const avgTemp = Math.round(
    sections.reduce((sum, item) => sum + Number(item.emotionalTemperature || 3), 0) / sections.length,
  );

  const supportive = interpreted.combinations.filter((item) => item.type === "supportivePair").length;
  const conflict = interpreted.combinations.filter((item) => item.type === "conflictPair").length;

  const summaryCard = {
    emotionalTemperature: Math.max(1, Math.min(5, avgTemp)),
    emotionalTemperatureText: normalizeTempLabel(avgTemp),
    corePsychology: interpreted.summary,
    contactChance: supportive >= conflict ? "부담 없는 안부는 반응 가능성이 있습니다. 먼저 가볍게 시작해도 됩니다." : "지금은 반응보다 경계가 먼저 보이는 흐름입니다. 텀을 두고 접근하세요.",
    relationFlow: section6.summary,
    reApproachChance: supportive > 0 ? "기회가 열려 있습니다." : "시간과 방식 조정이 필요합니다.",
    recommendedAction: section7.summary,
    relationshipStage: conflict > supportive ? "방어 구간" : "조정 구간",
    silenceDriver: baseSections[2]?.summary || "망설임이 크게 작동합니다.",
    situationPressure: baseSections[4]?.summary || "관계 판단이 유보된 상태입니다.",
    emotionalNeed: baseSections[3]?.summary || "정서적 확인 욕구가 남아 있습니다.",
  };

  const insightDeck = interpreted.combinations.slice(0, 6).map((item, idx) => ({
    id: `insight-${idx + 1}`,
    icon: idx % 2 ? "🌙" : "✨",
    category: item.type,
    title: item.title,
    headline: item.description,
    summary: item.description,
    bullets: [item.description],
    riskLevel: item.type === "conflictPair" ? "high" : "medium",
  }));

  const suggestedMessages = [
    { tone: "gentle", text: "요즘 문득 생각나서 안부 남겨. 부담 없이 편할 때 답해줘도 괜찮아." },
    { tone: "warm", text: "갑자기 길게 말하고 싶진 않고, 그냥 네가 잘 지내는지 궁금했어. 답장은 편한 때에 해줘." },
    { tone: "calm", text: "서로 편한 방식으로 천천히 대화해 보면 좋겠어. 급하게 결론 내리진 않을게, 나는 대화의 리듬을 맞추고 싶어." },
  ];

  return {
    ok: true,
    source: "rule-engine",
    persona: "관계 상담 특화 타로 리더",
    intro: "상대의 감정은 단순한 호감/무관심이 아니라, 미련과 경계가 동시에 움직이는 패턴으로 보입니다. 따라서 해석은 감정의 크기보다 반응의 일관성을 중심으로 읽는 것이 좋습니다.",
    sections,
    summaryCard,
    insightDeck,
    masterAdvice: interpreted.advice,
    suggestedMessages,
    oneLineConclusion: section6.summary,
    closing: "지금은 확답을 받아내기보다, 부담을 줄인 접점을 꾸준히 만드는 것이 가장 현실적인 해법입니다. 짧고 따뜻한 대화 한 번이 긴 설득보다 훨씬 강합니다.",
  };
}

export { buildMindscanReadingPayload };
