/**
 * 초융합 운세 프롬프트.
 *
 * 🔴 초융합은 단일 호출이 아니라 **4그룹 병렬 생성**이다(2026-08-08, 30,000원 인상분 반영).
 * 목표 분량 20,000자를 한 번에 뽑으려면 Gemini 출력 상한(16,384토큰)과 요청 시간 예산이
 * 먼저 바닥나 매번 잘리거나 Workers AI 폴백(목표의 60~77%만 쓰고 멈춤)으로 떨어진다.
 * 그룹당 3,400~6,600자면 한 호출이 시간 안에 완주하므로 실제 분량이 나온다.
 * 선행 사례: worker/routes/ziwei-ai.js 의 SECTION_GROUP_SPECS.
 */

/** 분량 계약 정본. 검증(worker/lib/fusion-fortune.js)과 프롬프트가 같은 값을 본다. */
export const FUSION_FORTUNE_LENGTH = Object.freeze({
  // 하한은 "30,000원어치"의 기준선, 상한은 폭주 방지용 완충이다.
  // 🔴 상한을 목표(약 21,000자) 가까이 조이면, 그룹들이 조금씩 더 쓴 정상 결과가 반려돼
  //    결정론 폴백(약 20,000자)이 유료 결과로 나간다. 완충은 넉넉해야 한다.
  total: Object.freeze({ min: 20000, max: 30000 }),
  section: 1600,
  executiveSummary: 900,
  integratedReading: 2600,
  timingAndAction: 1600,
  closingMessage: 600,
  finalVerdictRationale: 700,
});

function sectionSchema(minChars) {
  return {
    title: "string",
    content: `string (${minChars.toLocaleString("en-US")}자 이상)`,
    keyPoints: ["string", "string", "string"],
  };
}

export const FUSION_VISUALIZATION_SCHEMA = Object.freeze({
  systemScores: [{ key: "saju|ziwei|vedic|sukuyo|astrology|tarot", score: "number (0-100)", note: "string (40자 이내)" }],
  monthlyTimeline: [{ label: "string (예: 8월)", intensity: "number (0-100)", note: "string (한 줄 지침, 90자 이내)" }],
  crossChecks: {
    aligned: [{ theme: "string (60자 이내)", systems: ["string", "string"], meaning: "string (200자 이내)" }],
    divergent: [{ theme: "string (60자 이내)", systems: ["string", "string"], meaning: "string (200자 이내)" }],
  },
});

/**
 * 마지막 결론 블록. 여섯 체계를 각각 판정한 뒤 하나의 조언으로 수렴시킨다.
 * 🔴 여기가 이 상품이 파는 것이다 — 여섯 개의 해석이 아니라, 그 여섯이 만나 남긴 답 하나.
 */
export const FUSION_FINAL_VERDICT_SCHEMA = Object.freeze({
  headline: "string (최종 결론 한 문장, 60자 이내)",
  confidence: "number (0-100, 여섯 체계가 이 결론에 합의한 정도)",
  systemVerdicts: [{ key: "saju|ziwei|vedic|sukuyo|astrology|tarot", stance: "agree|conditional|caution", note: "string (그 체계가 이 결론에 대해 말하는 바, 80자 이내)" }],
  rationale: `string (${FUSION_FORTUNE_LENGTH.finalVerdictRationale}자 이상, 왜 이 결론이 남는지)`,
  doNow: ["string", "string", "string"],
  avoid: ["string", "string"],
});

export const FUSION_FORTUNE_RESPONSE_SCHEMA = Object.freeze({
  title: "string",
  openingMessage: "string",
  executiveSummary: `string (${FUSION_FORTUNE_LENGTH.executiveSummary}자 이상)`,
  sajuSection: sectionSchema(FUSION_FORTUNE_LENGTH.section),
  ziweiSection: sectionSchema(FUSION_FORTUNE_LENGTH.section),
  vedicSection: sectionSchema(FUSION_FORTUNE_LENGTH.section),
  sukuyoSection: sectionSchema(FUSION_FORTUNE_LENGTH.section),
  astrologySection: sectionSchema(FUSION_FORTUNE_LENGTH.section),
  tarotSection: sectionSchema(FUSION_FORTUNE_LENGTH.section),
  integratedReading: sectionSchema(FUSION_FORTUNE_LENGTH.integratedReading),
  timingAndAction: {
    title: "string",
    content: `string (${FUSION_FORTUNE_LENGTH.timingAndAction.toLocaleString("en-US")}자 이상)`,
    luckyActions: ["string", "string", "string"],
    cautionPatterns: ["string", "string", "string"],
  },
  visualization: FUSION_VISUALIZATION_SCHEMA,
  finalVerdict: FUSION_FINAL_VERDICT_SCHEMA,
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

/**
 * 섹션 본문 작성 규칙.
 * worker/lib/fortune-reasoning-contract.js 가 다섯 유료 상담에 강제하는 "근거를 먼저 밝히는
 * 상담문" 규율을 초융합 스키마에 맞게 옮긴 것이다. 초융합은 그쪽의 섹션 키 구조를 쓰지
 * 않으므로, 키를 늘리는 대신 각 섹션 **안에서** 같은 순서(근거 → 판단 → 장면 → 행동)를 요구한다.
 */
const SECTION_WRITING_RULES = Object.freeze([
  "각 섹션은 ①서버 확정값에서 끌어온 근거 → ②그 근거가 말하는 경향 → ③생활에서 그것이 드러나는 구체적 장면 → ④지금 해볼 행동 순서로 쓴다. 결론만 먼저 던지지 않는다.",
  "전문용어(오행·십성·궁·별·나크샤트라·숙·행성)를 쓰면 그 자리에서 한 번은 쉬운 말로 풀어 준다.",
  "'힘을 실어 주는 요소'와 '주의가 필요한 요소'를 뭉뚱그리지 말고 나누어 각각 짚는다.",
  "판단은 단정이 아니라 경향으로 쓴다. 같은 문장을 다른 섹션에서 반복하지 않는다.",
  "keyPoints 3개는 본문 요약이 아니라 그 섹션에서 실제로 남길 판단·행동이어야 한다.",
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

/**
 * 병렬 생성 단위. keys 합집합은 FUSION_FORTUNE_RESPONSE_SCHEMA 전체와 정확히 일치해야 한다
 * (아래 assert 로 강제). targetChars 합계는 total.min(20,000)보다 넉넉히 위여야 한다 —
 * 딱 맞추면 그룹이 목표의 90%만 써도 곧바로 미달로 떨어진다.
 */
export const FUSION_SECTION_GROUP_SPECS = Object.freeze([
  Object.freeze({
    id: "foundation",
    label: "결론 요약과 동양 명리",
    stageLabel: "핵심 요약 · 사주 · 자미두수",
    keys: Object.freeze(["executiveSummary", "sajuSection", "ziweiSection"]),
    minChars: Object.freeze({ executiveSummary: 1200, sajuSection: 2200, ziweiSection: 2200 }),
    targetChars: 5600,
    systems: Object.freeze(["saju", "ziwei"]),
    focus: "이번 상담의 결론 요약과, 사주·자미두수가 말하는 타고난 기질과 삶의 무대",
  }),
  Object.freeze({
    id: "traditions",
    label: "인도·동아시아·서양 천문",
    stageLabel: "베다점 · 숙요점 · 점성술",
    keys: Object.freeze(["vedicSection", "sukuyoSection", "astrologySection"]),
    minChars: Object.freeze({ vedicSection: 2200, sukuyoSection: 2200, astrologySection: 2200 }),
    targetChars: 6600,
    systems: Object.freeze(["vedic", "sukuyo", "astrology"]),
    focus: "베다점의 무의식 리듬, 숙요점의 관계 거리, 서양 점성술의 표현과 선택 패턴",
  }),
  Object.freeze({
    id: "synthesis",
    label: "타로와 통합 리딩",
    stageLabel: "타로 · 교차 검증 통합",
    keys: Object.freeze(["tarotSection", "integratedReading"]),
    minChars: Object.freeze({ tarotSection: 2200, integratedReading: 3000 }),
    targetChars: 5200,
    systems: Object.freeze(["tarot"]),
    focus: "서버가 뽑은 여섯 장의 카드와, 여섯 체계를 교차 검증해 하나로 엮는 통합 리딩",
  }),
  Object.freeze({
    id: "action",
    label: "시기·행동과 마무리",
    stageLabel: "12개월 시기 라인 · 행동",
    keys: Object.freeze(["title", "openingMessage", "timingAndAction", "visualization", "finalVerdict", "closingMessage", "shareText"]),
    minChars: Object.freeze({ timingAndAction: 2000, finalVerdict: 900, closingMessage: 800, openingMessage: 260 }),
    targetChars: 4300,
    systems: Object.freeze([]),
    focus: "앞으로 12개월의 시기 라인과 현실 행동, 시각화가 쓸 정규화 점수, 그리고 여섯 체계를 수렴시킨 최종 결론",
  }),
]);

const GROUP_EXTRA_RULES = Object.freeze({
  foundation: [
    "executiveSummary 는 이번 상담 전체의 결론이다. 여섯 체계가 공통으로 가리키는 주제 한 가지를 먼저 못박고, 그것이 관계·일·마음에서 각각 어떻게 나타나는지까지 담는다.",
  ],
  traditions: [
    "세 체계를 같은 말로 반복하지 않는다. 베다점은 리듬과 회복, 숙요점은 거리와 속도, 점성술은 표현과 책임으로 서로 다른 축을 맡는다.",
  ],
  synthesis: [
    "integratedReading 에는 **교차 검증 표**를 문단 안에 명시적으로 넣는다. (가) 두 체계 이상이 같은 신호를 가리키는 항목을 최소 2가지 — 어떤 체계들이 무엇을 함께 말하는지와 그래서 무엇을 우선할지. (나) 서로 엇갈리는 항목을 최소 1가지 — 어느 체계가 무엇을 다르게 말하는지와 어떤 상황에서 어느 쪽을 따를지. 엇갈림을 모순으로 숨기지 않는다.",
    "통합 리딩은 앞 그룹의 문장을 요약해 붙이는 자리가 아니다. 체계 사이의 관계에서만 나오는 판단을 새로 쓴다.",
  ],
  action: [
    "timingAndAction.content 안에 **앞으로 12개월의 시기 라인**을 담는다. 이번 달부터 12개월을 순서대로 다루되, 사건을 예고하지 말고 각 달에 무엇을 준비·시험·정리하면 좋은지를 쓴다.",
    "visualization.monthlyTimeline 은 그 12개월 라인과 같은 순서·같은 내용을 숫자로 옮긴 것이다(정확히 12개, label 은 '8월'처럼 이번 달부터). intensity 는 좋고 나쁨이 아니라 '그 달에 힘을 쓸 만한 정도'다.",
    "visualization.systemScores 는 여섯 체계 각각이 이번 질문에 얼마나 뚜렷한 신호를 주는지(0-100)이며, 사람의 우열 점수가 아니다. 여섯 개를 모두 채우고 값이 전부 같지 않게 한다.",
    "visualization.crossChecks 의 systems 에는 체계 키(saju/ziwei/vedic/sukuyo/astrology/tarot)를 두 개 이상 넣는다.",
    "title 은 25자 이내, openingMessage 는 상담을 여는 두세 문장, shareText 는 개인정보 없는 220자 이내 요약이다.",
    "🔴 finalVerdict 는 이 상담의 마지막 답이다. 여섯 체계를 다시 나열해 요약하지 말고 **하나의 결론으로 수렴시킨다.** ①headline 은 사용자가 지금 무엇을 하면 되는지 한 문장으로 못박는다. ②systemVerdicts 는 여섯 체계 각각이 그 결론에 대해 어떤 입장인지 판정한다 — agree(같은 방향), conditional(조건이 맞으면 같은 방향), caution(다른 방향이거나 속도를 늦추라고 함) 중 하나와 그 이유를 함께 적는다. 여섯 개를 모두 채우고, 근거 없이 전부 agree 로 몰지 않는다. ③confidence 는 그 입장 분포에서 나오는 합의 정도다(전부 agree 면 높고 caution 이 섞이면 낮다). ④rationale 은 왜 이 결론이 남는지를 근거로 설명한다. ⑤doNow 는 지금 할 일 3가지, avoid 는 피할 일 2가지를 구체적인 동사로 쓴다.",
  ],
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

/** 모든 그룹이 공유하는 안전·근거 규칙. 그룹마다 분량 문장만 달라진다. */
function buildSharedSystemPrompt(safeContext, lengthLine) {
  const precisionRule = safeContext.birthTimeKnown
    ? "생시 기반 정보도 서버 컨텍스트에 존재하는 값만 해석한다."
    : "생시가 없으므로 시주, 정밀 자미 명반, 라그나, 상승궁, 하우스와 시간 기반 시기를 확정하지 않는다.";
  const locationRule = safeContext.birthPlaceKnown
    ? "출생지 기반 정보도 서버 컨텍스트에 존재하는 값만 해석한다."
    : "출생지가 없으므로 라그나, 상승궁, 하우스, 위치 기반 세부값을 추정하거나 확정하지 않는다.";
  return [
    "너는 CODE DESTINY의 초융합 운세 상담자이며 여섯 전통을 구분해 이해하는 시니어 상담가다.",
    "각 체계를 별도 백과사전처럼 나열하지 말고, 공통 신호와 차이를 교차 검증해 하나의 상담 흐름으로 연결한다.",
    "서버가 계산한 FusionFortuneContext에 없는 별, 궁, 오행, 행성, 카드, 시기를 만들지 않는다.",
    precisionRule,
    locationRule,
    "무료 운세와 구분되는 깊이를 위해 근거, 체감 가능한 패턴, 강점과 그림자, 가까운 흐름, 실행 조언을 모두 제시한다.",
    "의료·법률·투자 결과, 타인의 마음, 재회나 성공을 확정하지 않는다. 공포나 결제 압박을 쓰지 않는다.",
    lengthLine,
  ].join(" ");
}

function buildSharedUserPromptLines(safeContext) {
  return [
    `질문 중심 답변: ${safeContext.questionFocus.answerFrame || "질문에서 사용자가 확인하려는 선택의 기준"}. 첫 문단과 실행 조언은 이 질문에 바로 답해야 하며, 원문 질문을 그대로 인용하지 않는다.`,
    `관심 주제: ${safeContext.topic}`,
    "체계별 전문가 계약:\n" + EXPERT_CONTRACTS.map((item, index) => `${index + 1}. ${item}`).join("\n"),
    "작성 규칙:\n" + SECTION_WRITING_RULES.map((item, index) => `${index + 1}. ${item}`).join("\n"),
    "통합 원칙: 두 체계 이상이 같은 행동 패턴을 가리킬 때 핵심 주제로 승격하고, 서로 다른 신호는 모순으로 숨기지 말고 상황별 선택지로 설명한다.",
    "개인정보 안전: 생년월일, 생시, 고민 원문, raw prompt/response/context, 결제 및 이용권 정보를 결과에 노출하지 않는다.",
  ];
}

function pickSchema(keys) {
  return keys.reduce((schema, key) => ({ ...schema, [key]: FUSION_FORTUNE_RESPONSE_SCHEMA[key] }), {});
}

/**
 * 그룹 하나의 프롬프트. 자기가 맡은 키만 담긴 JSON 객체를 요구한다.
 * @param {{ context?: object, group: object, extraInstruction?: string }} args
 */
export function buildFusionSectionGroupPrompt({ context = {}, group, extraInstruction = "" } = {}) {
  const safeContext = projectFusionFortuneContextForPrompt(context);
  const responseSchema = pickSchema(group.keys);
  const minCharLines = group.keys
    .filter((key) => group.minChars?.[key])
    .map((key) => `  · ${key}: 최소 ${Number(group.minChars[key]).toLocaleString("ko-KR")}자`);
  const systemPrompt = buildSharedSystemPrompt(
    safeContext,
    `이번 요청은 전체 상담 중 “${group.label}” 부분만 담당한다. 아래 키만 담긴 JSON 객체 하나만 반환하고, 다른 키는 절대 추가하지 않는다. Markdown과 코드펜스는 쓰지 않는다.`,
  );

  const userPrompt = [
    `이 요청의 범위: ${group.focus}`,
    ...buildSharedUserPromptLines(safeContext),
    ...(group.systems.length
      ? [`이 그룹이 사용하는 체계와 읽기 규칙:\n${group.systems.map((name) => `· ${name}: ${FUSION_SYSTEM_QUALITY_GATES[name]?.readingRule || ""}`).join("\n")}`]
      : []),
    ...(GROUP_EXTRA_RULES[group.id] || []),
    ...(group.keys.includes("tarotSection")
      ? ["타로 기준: tarotSpread.cards의 카드 이름과 포지션 여섯 개를 모두 tarotSection에서 정확히 언급하고, 목록 밖의 카드는 절대 추가하지 않는다."]
      : []),
    `분량 기준(이 그룹 합계 약 ${Number(group.targetChars).toLocaleString("ko-KR")}자):\n${minCharLines.join("\n")}`,
    "keyPoints, luckyActions, cautionPatterns는 각각 3개 이상 제공한다.",
    `서버 계산 컨텍스트:\n${JSON.stringify(safeContext)}`,
    `응답 JSON 스키마(이 키만):\n${JSON.stringify(responseSchema)}`,
    ...(extraInstruction ? [extraInstruction] : []),
  ].join("\n\n");

  return { systemPrompt, userPrompt, responseSchema };
}

/**
 * 전체 스키마 기준 프롬프트. 그룹 생성으로 옮긴 뒤에도 남겨 둔다 —
 * 라우트가 넘겨주는 prompt.responseSchema(그룹 보정 시 참조)와 mock 경로가 같은 계약을 본다.
 */
export function buildFusionFortunePrompt({ context = {} } = {}) {
  const safeContext = projectFusionFortuneContextForPrompt(context);
  const systemPrompt = buildSharedSystemPrompt(
    safeContext,
    `한국어 가시 텍스트 ${FUSION_FORTUNE_LENGTH.total.min.toLocaleString("en-US")}자 이상으로 작성하고 JSON 객체 하나만 반환한다. Markdown과 코드펜스는 쓰지 않는다.`,
  );
  const userPrompt = [
    ...buildSharedUserPromptLines(safeContext),
    `품질 기준: 각 섹션은 최소 ${FUSION_FORTUNE_LENGTH.section.toLocaleString("en-US")}자, executiveSummary는 최소 ${FUSION_FORTUNE_LENGTH.executiveSummary}자, integratedReading은 최소 ${FUSION_FORTUNE_LENGTH.integratedReading.toLocaleString("en-US")}자, timingAndAction.content는 최소 ${FUSION_FORTUNE_LENGTH.timingAndAction.toLocaleString("en-US")}자로 쓴다.`,
    "타로 기준: tarotSpread.cards의 카드 이름과 포지션 여섯 개를 모두 tarotSection에서 정확히 언급하고, 목록 밖의 카드는 절대 추가하지 않는다.",
    `서버 계산 컨텍스트:\n${JSON.stringify(safeContext)}`,
    `응답 JSON 스키마:\n${JSON.stringify(FUSION_FORTUNE_RESPONSE_SCHEMA)}`,
  ].join("\n\n");

  return { systemPrompt, userPrompt, responseSchema: FUSION_FORTUNE_RESPONSE_SCHEMA };
}

// 그룹 키의 합집합이 스키마 전체를 덮는지 모듈 로드 시점에 확인한다.
// 키를 추가하고 그룹에 못 넣으면 그 필드는 영영 생성되지 않는다 — 조용히 비는 대신 즉시 깨진다.
{
  const covered = FUSION_SECTION_GROUP_SPECS.flatMap((group) => group.keys);
  const expected = Object.keys(FUSION_FORTUNE_RESPONSE_SCHEMA);
  const missing = expected.filter((key) => !covered.includes(key));
  const duplicated = covered.filter((key, index) => covered.indexOf(key) !== index);
  if (missing.length || duplicated.length) {
    throw new Error(`FUSION_SECTION_GROUP_SPECS mismatch — missing: ${missing.join(",")} duplicated: ${duplicated.join(",")}`);
  }
}

export { EXPERT_CONTRACTS, SECTION_WRITING_RULES };
