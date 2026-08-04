const SECTION_SCHEMA = {
  title: "string",
  content: "string (900자 이상)",
  keyPoints: ["string", "string", "string"],
};

export const FUSION_FORTUNE_RESPONSE_SCHEMA = Object.freeze({
  title: "string",
  openingMessage: "string",
  executiveSummary: "string (600자 이상)",
  sajuSection: SECTION_SCHEMA,
  ziweiSection: SECTION_SCHEMA,
  vedicSection: SECTION_SCHEMA,
  sukuyoSection: SECTION_SCHEMA,
  astrologySection: SECTION_SCHEMA,
  tarotSection: SECTION_SCHEMA,
  integratedReading: SECTION_SCHEMA,
  timingAndAction: {
    title: "string",
    content: "string (800자 이상)",
    luckyActions: ["string", "string", "string"],
    cautionPatterns: ["string", "string", "string"],
  },
  closingMessage: "string",
  shareText: "string (개인정보가 없는 220자 이내 요약)",
});

const EXPERT_CONTRACTS = Object.freeze([
  "사주: 일간과 월지의 계절감, 오행의 분포, 십성의 작동을 성격·돈·일·관계·결정 습관으로 번역한다. 강점과 과잉의 그림자를 함께 설명한다.",
  "자미두수: 명궁·관록궁·재백궁·부처궁·복덕궁과 서버가 제공한 주요 별만 사용해 역할, 재능, 관계 책임, 회복 방식을 읽는다.",
  "베다점: 라그나·문사인·나크샤트라·다샤가 컨텍스트에 있을 때만 사용하고, 무의식 리듬과 카르마 패턴을 현실의 반복 습관으로 번역한다.",
  "숙요점: 본명숙과 관계 거리, 감정 반응, 연애 및 사회적 관계의 리듬을 읽되 타인의 마음을 확정하지 않는다.",
  "서양 점성술: 태양·달·상승궁·금성·화성·토성을 서로 다른 심리 기능으로 구분하고, 생시나 출생지가 없으면 정밀 하우스 해석을 유보한다.",
  "타로: 서버가 고른 카드 ID와 포지션만 해석한다. 카드나 배열을 새로 만들지 않고, 상징을 현재 선택과 행동 기준으로 연결한다.",
]);

export const FUSION_SYSTEM_QUALITY_GATES = Object.freeze({
  saju: Object.freeze({
    fields: ["dayMaster", "fiveElementsSummary", "tenGodsSummary", "currentFlowSummary", "seasonSummary", "relationSummary"],
    readingRule: "사주 근거를 기질, 반복 선택, 현재 흐름으로 번역하고 과한 점과 부족한 점이 일상에서 어떻게 함께 드러나는지 설명한다.",
  }),
  ziwei: Object.freeze({
    fields: ["lifePalaceSummary", "topicPalaceSummary", "keyStarsSummary", "strengths", "cautions"],
    readingRule: "자미두수의 궁위와 별은 이름을 나열하지 말고 역할, 책임, 관계에서 반복되는 선택 방식으로 번역한다.",
  }),
  sukuyo: Object.freeze({
    fields: ["birthMansion", "todayMansion", "emotionalPattern", "relationshipPattern", "distancePattern"],
    readingRule: "숙요는 관계의 거리, 감정 반응, 대화 속도를 다루며 상대의 마음을 단정하지 않는다.",
  }),
  vedic: Object.freeze({
    fields: ["lagnaSummary", "moonSignSummary", "nakshatraSummary", "dashaSummary", "innerRhythm"],
    readingRule: "베다점은 라그나·달·나크샤트라·다샤가 실제로 제공된 경우에만 쓰고, 감정의 리듬과 회복 방식으로 풀어쓴다.",
  }),
  astrology: Object.freeze({
    fields: ["sunSummary", "moonSummary", "ascendantSummary", "venusSummary", "marsSummary", "saturnSummary", "currentMoodSummary"],
    readingRule: "서양 점성술은 태양의 방향, 달의 정서, 금성·화성의 관계와 행동, 토성의 책임을 섞지 않고 현재 선택으로 번역한다.",
  }),
  tarot: Object.freeze({
    fields: ["spreadType", "cards", "symbolicMessage"],
    readingRule: "타로는 서버가 뽑은 카드와 자리만 인용하며, 카드가 정답을 대신한다고 말하지 않고 현재 선택의 기준으로 연결한다.",
  }),
});

function safeText(value, max = 240) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

function safeArray(value, maxItems = 3, maxText = 140) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => safeText(item, maxText)).filter(Boolean).slice(0, maxItems);
}

function projectTarot(cards) {
  if (!Array.isArray(cards)) return [];
  return cards.map((card) => ({
    name: safeText(card?.name, 80),
    orientation: card?.orientation === "reversed" ? "reversed" : "upright",
    positionKey: safeText(card?.positionKey || card?.position, 60),
    meaningSummary: safeText(card?.meaningSummary, 170),
  })).filter((card) => card.name || card.meaningSummary).slice(0, 6);
}

function projectSystem(name, source) {
  if (!source || typeof source !== "object") return undefined;
  const gate = FUSION_SYSTEM_QUALITY_GATES[name];
  if (!gate) return undefined;
  const projected = {};
  for (const field of gate.fields) {
    if (field === "cards") {
      const cards = projectTarot(source.cards);
      if (cards.length) projected.cards = cards;
      continue;
    }
    if (Array.isArray(source[field])) {
      const values = safeArray(source[field]);
      if (values.length) projected[field] = values;
      continue;
    }
    const value = safeText(source[field]);
    if (value) projected[field] = value;
  }
  const evidence = safeArray(source.evidence, 6, 80);
  if (evidence.length) projected.evidence = evidence;
  return Object.keys(projected).length ? projected : undefined;
}

/**
 * The only Fusion context allowed to reach a provider. It omits raw birth
 * input, the free-form concern, payment state, and unknown calculator fields.
 */
export function projectFusionFortuneContextForPrompt(context = {}) {
  const systems = {};
  for (const name of ["saju", "ziwei", "sukuyo", "vedic", "astrology", "tarot"]) {
    const projected = projectSystem(name, context?.systems?.[name]);
    if (projected) systems[name] = projected;
  }
  const insightSource = context?.integratedInsight || {};
  const integratedInsight = {};
  for (const field of ["openingHook", "currentTheme", "likelyConcern", "adviceDirection", "cautionPattern", "luckyActionHint", "premiumBridge"]) {
    const value = safeText(insightSource[field], 260);
    if (value) integratedInsight[field] = value;
  }
  const evidenceKeys = safeArray(insightSource.evidenceKeys, 10, 80);
  if (evidenceKeys.length) integratedInsight.evidenceKeys = evidenceKeys;

  return {
    version: String(context.version || "fusion-fortune.v1"),
    birthTimeKnown: context.birthTimeKnown === true,
    birthPlaceKnown: context.birthPlaceKnown === true,
    systems,
    tarotSpread: {
      spreadType: safeText(context?.tarotSpread?.spreadType, 80),
      cards: projectTarot(context?.tarotSpread?.cards),
    },
    integratedInsight,
    questionFocus: {
      intentKey: safeText(context?.questionFocus?.intentKey, 60),
      label: safeText(context?.questionFocus?.label, 120),
      answerFrame: safeText(context?.questionFocus?.answerFrame, 260),
      actionFrame: safeText(context?.questionFocus?.actionFrame, 260),
    },
    limitations: safeArray(context.limitations, 8, 100),
    topic: safeText(context.topic, 80),
    inputSummary: {
      calendarType: safeText(context.inputSummary?.calendarType || "solar", 10),
      gender: safeText(context.inputSummary?.gender || "unspecified", 20),
      topic: safeText(context.inputSummary?.topic, 80),
    },
  };
}

function projectContext(context = {}) {
  return {
    version: String(context.version || "fusion-fortune.v1"),
    birthTimeKnown: context.birthTimeKnown === true,
    birthPlaceKnown: context.birthPlaceKnown === true,
    systems: context.systems && typeof context.systems === "object" ? context.systems : {},
    tarotSpread: context.tarotSpread && typeof context.tarotSpread === "object" ? context.tarotSpread : {},
    integratedInsight: context.integratedInsight && typeof context.integratedInsight === "object" ? context.integratedInsight : {},
    limitations: Array.isArray(context.limitations) ? context.limitations.map((item) => String(item).slice(0, 100)).slice(0, 12) : [],
    topic: String(context.topic || "삶의 전반적인 흐름").slice(0, 80),
    inputSummary: {
      calendarType: String(context.inputSummary?.calendarType || "solar").slice(0, 10),
      gender: String(context.inputSummary?.gender || "unspecified").slice(0, 20),
      topic: String(context.inputSummary?.topic || "삶의 전반적인 흐름").slice(0, 80),
    },
  };
}

export function buildFusionFortunePrompt({ context = {} } = {}) {
  const safeContext = projectFusionFortuneContextForPrompt(context);
  const precisionRule = safeContext.birthTimeKnown
    ? "생시 기반 정보도 서버 컨텍스트에 존재하는 값만 해석한다."
    : "생시가 없으므로 시주, 정밀 자미 명반, 라그나, 상승궁, 하우스와 시간 기반 시기를 확정하지 않는다.";
  const locationRule = safeContext.birthPlaceKnown
    ? "출생지 기반 정보도 서버 컨텍스트에 존재하는 값만 해석한다."
    : "출생지가 없으므로 라그나, 상승궁, 하우스, 위치 기반 세부값을 추정하거나 확정하지 않는다.";
  const systemPrompt = [
    "너는 CODE DESTINY의 초융합 운세 상담자이며 여섯 전통을 구분해 이해하는 시니어 상담가다.",
    "각 체계를 별도 백과사전처럼 나열하지 말고, 공통 신호와 차이를 교차 검증해 하나의 상담 흐름으로 연결한다.",
    "서버가 계산한 FusionFortuneContext에 없는 별, 궁, 오행, 행성, 카드, 시기를 만들지 않는다.",
    precisionRule,
    locationRule,
    "무료 운세와 구분되는 깊이를 위해 근거, 체감 가능한 패턴, 강점과 그림자, 가까운 흐름, 실행 조언을 모두 제시한다.",
    "의료·법률·투자 결과, 타인의 마음, 재회나 성공을 확정하지 않는다. 공포나 결제 압박을 쓰지 않는다.",
    "한국어 가시 텍스트 10,000자 이상 15,000자 이하로 작성하고 JSON 객체 하나만 반환한다. Markdown과 코드펜스는 쓰지 않는다.",
  ].join(" ");

  const userPrompt = [
    `질문 중심 답변: ${safeContext.questionFocus.answerFrame || "질문에서 사용자가 확인하려는 선택의 기준"}. 첫 문단과 실행 조언은 이 질문에 바로 답해야 하며, 원문 질문을 그대로 인용하지 않는다.`,
    `관심 주제: ${safeContext.topic}`,
    "체계별 전문가 계약:\n" + EXPERT_CONTRACTS.map((item, index) => `${index + 1}. ${item}`).join("\n"),
    "통합 원칙: 두 체계 이상이 같은 행동 패턴을 가리킬 때 핵심 주제로 승격하고, 서로 다른 신호는 모순으로 숨기지 말고 상황별 선택지로 설명한다.",
    "품질 기준: 각 섹션은 최소 900자, executiveSummary는 최소 600자, timingAndAction.content는 최소 800자로 쓴다. keyPoints, luckyActions, cautionPatterns는 각각 3개 이상 제공한다.",
    "타로 기준: tarotSpread.cards의 카드 이름과 포지션 여섯 개를 모두 tarotSection에서 정확히 언급하고, 목록 밖의 카드는 절대 추가하지 않는다.",
    "개인정보 안전: 생년월일, 생시, 고민 원문, raw prompt/response/context, 결제 및 이용권 정보를 결과에 노출하지 않는다.",
    `서버 계산 컨텍스트:\n${JSON.stringify(safeContext)}`,
    `응답 JSON 스키마:\n${JSON.stringify(FUSION_FORTUNE_RESPONSE_SCHEMA)}`,
  ].join("\n\n");

  return { systemPrompt, userPrompt, responseSchema: FUSION_FORTUNE_RESPONSE_SCHEMA };
}

export { EXPERT_CONTRACTS };
