import {
  GUARDIAN_FORTUNE_LIST_LIMITS,
  GUARDIAN_FORTUNE_RESULT_FIELDS,
  GUARDIAN_FORTUNE_RESULT_LENGTH,
  GUARDIAN_FORTUNE_TOPICS,
  getTopicContract,
} from "./guardian-fortune-runtime-contract.js";
import { GUARDIAN_CATEGORY_ADAPTER_PRIORITY, text } from "./guardian-fortune-adapter-utils.js";
import { buildFortuneQuestionFocus } from "./fortune-question-focus.js";

const MODE_SYSTEM_PROMPTS = Object.freeze({
  yeoni: [
    "너는 연이야. 따뜻하고 다정한 상담자처럼 말하되, 현실적인 행동을 꼭 연결해.",
    "사용자를 안심시키되 과장하거나 운명을 확정하지 말고, 부드러운 존댓말을 사용해.",
    "과도한 애교와 이모지는 쓰지 말고 사용자를 돼지라고 부르지 마.",
    "연이는 꽃돼지 캐릭터와 같은 존재다. 별도 상담자인 것처럼 나누지 말고, 다정한 편지형 존댓말로 마음의 결을 먼저 살핀 뒤 확인 가능한 행동을 한 가지 제안해.",
    "연이 톤은 찻잔, 꽃잎, 달빛 같은 부드러운 이미지를 절제해서 쓰며, 상대 마음·미래·결과를 단정하지 않는다.",
    "구성 순서: 지금의 마음을 먼저 알아주고 → 계산 근거로 흐름을 설명하고 → 오늘 해볼 수 있는 한 가지로 닫는다. 결론을 첫 문장에 못 박지 않는다.",
    "문장은 고르게 이어지는 편지체로 쓰고, 명령형 대신 권유형(~해보세요, ~어때요)을 쓴다. 사용자를 평가하거나 진단하듯 말하지 않는다.",
  ].join(" "),
  neo: [
    "너는 네오야. 짧고 정돈된 문장으로 현재 판세와 사용자가 움직일 수 있는 지점을 짚어.",
    "직설적이되 모욕하지 말고, 전략·작전·판세 같은 표현은 꼭 필요할 때만 사용해.",
    "중2병식 과장, 공포, 운명 확정, 결제 압박은 금지해.",
    "네오는 연이와 확실히 구분되는 전략가다. 짧고 선명한 문장으로 판세, 기준, 다음 작전을 정리하되 사용자를 깎아내리지 않는다.",
    "네오 톤은 전략, 판세, 기준, 정리 같은 어휘를 쓰고 감성적 이미지보다 실행 순서를 우선한다.",
    "구성 순서: 결론을 첫 문장에 먼저 박고 → 그렇게 본 근거를 대고 → 다음에 확인할 순서를 정리한다. 위로로 시작하지 않는다.",
    "문장은 짧게 끊고 수식어를 줄인다. 듣기 좋은 말로 감싸지 말고 사용자가 놓치고 있는 지점을 정확히 짚되, 인신공격이나 단정은 하지 않는다.",
  ].join(" "),
});

/**
 * 이전 대화 맥락. 이 화면은 채팅인데 매 턴이 단발이라 "이어서 묻는" 경험이 성립하지 않았다.
 * 원문을 그대로 넣지 않고 발화자 라벨 + 길이 제한으로 눌러 담는다.
 */
function formatRecentTurns(recentTurns) {
  if (!Array.isArray(recentTurns) || !recentTurns.length) return "";
  return recentTurns
    .slice(-6)
    .map((turn) => {
      const speaker = turn?.speaker === "assistant" ? "상담자" : "사용자";
      const line = safeText(turn?.text, 160);
      return line ? `- ${speaker}: ${line}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

const PROMPT_ADAPTER_FIELDS = Object.freeze({
  saju: ["dayMaster", "tenGodsSummary", "fiveElementsSummary", "seasonSummary", "relationSummary", "currentFlowSummary", "personalityHook", "cautions", "evidence"],
  ziwei: ["lifePalaceSummary", "topicPalaceSummary", "keyStarsSummary", "strengths", "cautions", "evidence"],
  vedic: ["lagnaSummary", "moonSignSummary", "nakshatraSummary", "padaSummary", "dashaSummary", "innerRhythm", "evidence"],
  sukuyo: ["birthMansion", "todayMansion", "emotionalPattern", "relationshipPattern", "distancePattern", "evidence"],
  astrology: ["sunSummary", "moonSummary", "ascendantSummary", "venusSummary", "marsSummary", "saturnSummary", "currentMoodSummary", "evidence"],
  tarot: ["spreadType", "spreadId", "questionType", "cards", "symbolicMessage", "evidence"],
});

const PROMPT_INSIGHT_FIELDS = Object.freeze([
  "openingHook",
  "currentTheme",
  "likelyConcern",
  "adviceDirection",
  "cautionPattern",
  "luckyActionHint",
  "premiumBridge",
  "evidenceKeys",
]);

function safeText(value, max = 360) {
  return text(value, max).replace(/[\u0000-\u001f\u007f]/g, "");
}

function safeArray(value, maxItems = 4, maxText = 180) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => safeText(item, maxText)).filter(Boolean).slice(0, maxItems);
}

function projectTarot(data) {
  return {
    spreadType: data.spreadType === "three_card" ? "three_card" : "one_card",
    spreadId: safeText(data.spreadId, 80),
    questionType: safeText(data.questionType, 80),
    cards: Array.isArray(data.cards)
      ? data.cards.map((card) => ({
        name: safeText(card?.name, 80),
        orientation: card?.orientation === "reversed" ? "reversed" : "upright",
        positionKey: safeText(card?.positionKey, 80),
        meaningSummary: safeText(card?.meaningSummary, 220),
      })).filter((card) => card.name || card.meaningSummary).slice(0, 3)
      : [],
    symbolicMessage: safeText(data.symbolicMessage, 260),
    evidence: safeArray(data.evidence, 8, 80),
  };
}

function projectAdapter(name, data) {
  if (!data || typeof data !== "object") return undefined;
  if (name === "tarot") return projectTarot(data);

  const fields = PROMPT_ADAPTER_FIELDS[name] || [];
  const projected = {};
  for (const field of fields) {
    if (Array.isArray(data[field])) {
      const values = safeArray(data[field]);
      if (values.length) projected[field] = values;
      continue;
    }
    const value = safeText(data[field]);
    if (value) projected[field] = value;
  }
  return Object.keys(projected).length ? projected : undefined;
}

function projectInsight(insight = {}) {
  const projected = {};
  for (const field of PROMPT_INSIGHT_FIELDS) {
    if (field === "evidenceKeys") {
      const keys = safeArray(insight[field], 12, 80);
      if (keys.length) projected[field] = keys;
      continue;
    }
    const value = safeText(insight[field], 420);
    if (value) projected[field] = value;
  }
  return projected;
}

/**
 * Formats only the public, allowlisted projection of a context. Never stringify
 * the complete context: future calculator fields must not silently reach a
 * provider through this boundary.
 */
export function formatGuardianFortuneContextForPrompt(context = {}) {
  const inputSummary = context?.inputSummary || {};
  const topic = GUARDIAN_FORTUNE_TOPICS[inputSummary.topic] ? inputSummary.topic : "daily";
  const category = Object.prototype.hasOwnProperty.call(GUARDIAN_CATEGORY_ADAPTER_PRIORITY, inputSummary.category)
    ? inputSummary.category
    : "";
  const priority = GUARDIAN_CATEGORY_ADAPTER_PRIORITY[category] || [];
  const systems = Array.isArray(context?.availableSystems) ? context.availableSystems : [];
  const adapters = {};

  for (const name of priority) {
    if (!systems.includes(name)) continue;
    const projected = projectAdapter(name, context[name]);
    if (projected) adapters[name] = projected;
  }

  const safeContext = {
    inputSummary: {
      mode: inputSummary.mode === "neo" ? "neo" : "yeoni",
      topic,
      category,
      locale: safeText(inputSummary.locale, 20) || "ko-KR",
      targetDate: safeText(inputSummary.targetDate, 20),
      hasBirthTime: Boolean(inputSummary.hasBirthTime),
      hasBirthPlace: Boolean(inputSummary.hasBirthPlace),
      hasConcern: Boolean(inputSummary.hasConcern),
    },
    availableSystems: priority.filter((name) => systems.includes(name)),
    unavailableClaims: safeArray(context?.unavailableClaims, 12, 100),
    adapters,
    integratedInsight: projectInsight(context?.integratedInsight),
  };

  // 들여쓰기는 모델이 읽는 데 필요 없고 입력 토큰만 20~30% 늘린다.
  return JSON.stringify(safeContext);
}

function buildSchemaHint() {
  const listFields = new Set(Object.keys(GUARDIAN_FORTUNE_LIST_LIMITS));
  const fields = GUARDIAN_FORTUNE_RESULT_FIELDS.filter((field) => field !== "premiumCta")
    .map((field) => (listFields.has(field) ? `"${field}": ["string"]` : `"${field}": "string"`))
    .join(", ");
  return `{ ${fields}, "premiumCta": { "ctaKey": "allowlisted key", "label": "string", "reason": "string" } }`;
}

const EXPERT_SYSTEM_GUIDANCE = [
  "너는 사용자가 고른 운세 체계를 직접 계산하는 존재가 아니다.",
  "너는 서버에서 계산된 GuardianFortuneContext를 바탕으로 상담 문장을 작성한다.",
  "Context에 없는 일간, 궁, 라그나, 상승궁, 하우스, 신궁, 행성, 카드, 상대 마음을 확정적으로 지어내지 않는다.",
  "생시나 출생지가 없어 정밀도가 제한되는 영역은 단정하지 않고, 사용 가능한 근거만 낮은 확신으로 통합한다.",
  "사용자가 선택한 운세 체계 하나만 해석하고, 선택하지 않은 체계의 계산 근거와 전문용어를 섞지 않는다.",
  "전문용어는 사용자의 행동, 감정, 관계 거리감, 선택 습관으로 바로 번역한다.",
].join(" ");

const DOMAIN_EXPERT_QUALITY_GATES = Object.freeze([
  "사주는 일간·오행·십성을 심리와 행동으로 번역해. 식상=표현과 감정 배출, 재성=현실감과 손익 감각, 관성=책임과 압박, 인성=생각과 확인 욕구, 비겁=자존심과 내 방식 고수로 풀어.",
  "자미두수는 명궁·재백궁·관록궁·부처궁·복덕궁 등 context에 있는 궁만 사용하고, 별 이름 나열 대신 역할·반복 선택 방식·주의 태도로 번역해.",
  "베다점은 라그나·문사인·나크샤트라·파다·다샤가 context에 있을 때만 사용하고, 무의식적 리듬과 감정 습관을 쉬운 한국어로 설명해.",
  "숙요점은 본명숙과 오늘 숙을 관계의 거리감, 기다림, 선 긋기, 혼자 삭이는 방식으로 번역하되 상대 마음을 확정하지 마.",
  "점성술은 태양=의식적 방향, 달=감정 안정, 상승궁=첫 대응, 금성=관계 취향, 화성=행동력, 토성=책임과 부담으로 풀고 생시 없으면 상승궁/하우스 단정을 금지해.",
  "타로는 서버가 뽑은 카드명·정역방향·spread·position만 해석하고 임의 카드 창작을 금지해. 카드는 오늘의 상징과 행동 기준으로 연결해.",
]);

const TOPIC_EXPERT_INSTRUCTIONS = Object.freeze({
  daily: "오늘 가장 강한 기운, 감정과 행동의 균형, 하루 안에서 조심할 패턴을 우선한다.",
  love: "표현 방식, 연락/기다림/거리감, 상대 마음 단정이 아닌 관계의 속도와 내가 취할 태도를 우선한다.",
  money_work: "돈과 일의 구조, 결과 압박, 현실 선택을 다루되 투자 수익이나 법적 결과를 단정하지 않는다.",
  relationship: "자존심, 말투, 선 긋기, 가까워지는 속도처럼 반복되는 인간관계 패턴을 우선한다.",
  mind: "생각 과다, 감정 소모, 회복 리듬, 오늘 바로 낮출 수 있는 부담을 우선한다.",
  decision: "관성·인성·비겁적 판단 기준, 망설임의 원인, 되돌릴 수 있는 작은 선택을 우선한다.",
});

const CATEGORY_EXPERT_INSTRUCTIONS = Object.freeze({
  saju: "사주의 일간·오행·십성 근거만 사용해 생활 패턴을 풀어.",
  ziwei: "자미두수의 궁위와 별의 역할을 중심으로, 생시 기반 명반의 범위를 벗어나 단정하지 마.",
  vedic: "베다점의 달·나크샤트라·리듬을 중심으로, 서양 점성술과 체계를 섞지 말고 보조 근거로만 연결해.",
  sukuyo: "숙요점의 관계 거리감과 감정 반응을 중심으로, 상대의 속마음을 확정하지 마.",
  astrology: "점성술의 태양·달·상승·행성 상징을 중심으로, 출생지와 생시가 필요한 해석 범위를 구분해.",
  tarot: "서버가 선택한 카드와 스프레드만 사용하고, 카드 이름이나 상징을 새로 만들지 마.",
});

const CATEGORY_QUALITY_INDEX = Object.freeze({
  saju: 0,
  ziwei: 1,
  vedic: 2,
  sukuyo: 3,
  astrology: 4,
  tarot: 5,
});

// 카테고리 선택은 '더 깊게 보기'가 아니라 상담의 해석 중심을 정하는 입력이다.
// 기존 파일의 레거시 다국어 문자열과 분리해, 신규 프롬프트 문구는 UTF-8 한국어로 유지한다.
const GUARDIAN_CATEGORY_INSTRUCTIONS_KO = Object.freeze({
  saju: "사주의 일간·오행·십성과 선택 습관만 읽고, 다른 운세 체계의 근거는 사용하지 않습니다.",
  ziwei: "자미두수의 궁위와 주요 별의 역할을 중심으로 읽되, 생시 기반 명반의 범위를 넘어서 단정하지 않습니다.",
  vedic: "베다점의 라그나·문사인·나크샤트라·리듬을 중심으로 읽고 서양 점성술과 체계를 혼동하지 않습니다.",
  sukuyo: "숙요점의 관계 거리감과 감정 반응을 중심으로 읽고, 상대의 마음을 확정하지 않습니다.",
  astrology: "서양 점성술의 태양·달·상승궁·행성 패턴을 중심으로 읽되, 출생지 또는 생시가 필요한 범위를 구분합니다.",
  tarot: "서버가 선택한 카드와 스프레드만 사용하고 카드 이름이나 의미를 임의로 만들지 않습니다.",
});

/* 시스템 프롬프트 조립. 예전에는 buildGuardianFortunePrompt 안 인라인이라 관리자 화면이 읽을 수 없었다.
   문자열 구성은 그대로이고 함수로 빼기만 했다(동작 불변). */
function buildGuardianSystemPrompt(mode) {
  return [
    MODE_SYSTEM_PROMPTS[mode],
    EXPERT_SYSTEM_GUIDANCE,
    "서버가 계산한 구조화된 근거만 사용하고, 운세를 새로 계산하거나 생년월일을 추론하지 마.",
    "의료·법률·투자에 대한 확정 조언, 상대의 속마음 확정, 재회·성공 보장, 공포와 결제 압박을 쓰지 마.",
    "연이와 네오는 같은 답을 다른 말투로 바꾸는 수준이 아니다. 연이는 감정의 안전감과 선택지를, 네오는 판단 기준과 실행 순서를 우선한다.",
    "반드시 JSON 하나만 반환하고 Markdown, 코드펜스, 설명 문장은 반환하지 마.",
  ].join(" ");
}

/* 관리자 프롬프트 랩 전용(lib/admin/prompt-lab-registry.mjs 참고).
   사용자 프롬프트는 서버가 계산한 체계별 구조화 근거를 입력으로 받으므로 생년 정보만으로는 조립되지 않는다. */
export function buildAdminLabPrompt(body = {}, options = {}) {
  const modes = Object.keys(MODE_SYSTEM_PROMPTS);
  const mode = modes.includes(options.variant) ? options.variant : modes[0];

  // 질문은 프로덕션에서 concern 으로 들어가 buildFortuneQuestionFocus 가 답변 프레임을 만든다.
  // 체계는 하나만 고를 수 있으므로(어댑터 우선순위 계약) 미리보기는 사주로 고정한다.
  const previewCategory = "saju";
  let prompt = "";
  try {
    const built = buildGuardianFortunePrompt({
      input: { mode, concern: body?.question || "", topic: "daily" },
      context: { inputSummary: { mode, topic: "daily", category: previewCategory } },
    });
    prompt = String(built?.userPrompt || "");
  } catch (error) {
    prompt = "";
  }

  return {
    systemPrompt: buildGuardianSystemPrompt(mode),
    prompt,
    partial: true,
    partialReason: `계산 근거 칸은 비어 있습니다 — 실제 상담에서는 서버가 계산한 체계별 구조화 근거가 들어갑니다. 미리보기 체계는 ${previewCategory} 고정입니다.`,
    variantKey: mode,
    variants: modes.map((key) => ({ key, label: key === "yeoni" ? "연이" : "네오" })),
  };
}

export function buildGuardianFortunePrompt({ input = {}, context = {} } = {}) {
  const inputSummary = context?.inputSummary || {};
  const mode = inputSummary.mode === "neo" || input?.mode === "neo" ? "neo" : "yeoni";
  const topic = GUARDIAN_FORTUNE_TOPICS[inputSummary.topic]
    ? inputSummary.topic
    : (GUARDIAN_FORTUNE_TOPICS[input?.topic] ? input.topic : "daily");
  const topicContract = getTopicContract(topic);
  const questionFocus = buildFortuneQuestionFocus({ concern: input?.concern, topic });
  const category = Object.prototype.hasOwnProperty.call(GUARDIAN_CATEGORY_INSTRUCTIONS_KO, inputSummary.category)
    ? inputSummary.category
    : "";
  const priority = GUARDIAN_CATEGORY_ADAPTER_PRIORITY[category] || [];
  if (!category || priority.length !== 1) {
    const error = new Error("상담 체계를 하나 선택해 주세요.");
    error.code = "GUARDIAN_PROMPT_INVALID_CATEGORY";
    throw error;
  }
  const systemPrompt = buildGuardianSystemPrompt(mode);

  // 🔴 context 에서만 읽는다. input 은 정규화 전 원본이라 개수·길이·민감정보 필터를 안 거쳤다.
  const recentTurns = formatRecentTurns(context?.recentTurns);

  const userPrompt = [
    `질문 중심 답변: ${questionFocus.answerFrame}. 고민 원문을 인용하지 말고, 이 질문에 바로 답한 뒤 계산 근거와 실행 기준을 제시한다.`,
    ...(recentTurns ? [`이전 대화 맥락(최근 순):\n${recentTurns}\n앞서 이미 말한 조언을 그대로 반복하지 말고, 이어지는 다음 이야기를 한다. 맥락이 지금 질문과 무관하면 무시한다.`] : []),
    `상담 체계: ${category}. ${GUARDIAN_CATEGORY_INSTRUCTIONS_KO[category]}`,
    `관심 분야: ${topicContract.label} (${topic})`,
    `상담 지침: ${topicContract.instruction}`,
    `선택 체계 전문가 지침: ${CATEGORY_EXPERT_INSTRUCTIONS[category]}`,
    `선택 체계 품질 기준: ${DOMAIN_EXPERT_QUALITY_GATES[CATEGORY_QUALITY_INDEX[category]]}`,
    `주제별 우선 근거: ${priority.join(" > ")}`,
    `전문가 해석 지침: ${TOPIC_EXPERT_INSTRUCTIONS[topic] || TOPIC_EXPERT_INSTRUCTIONS.daily}`,
    `사용자 입력 요약과 계산 근거:\n${formatGuardianFortuneContextForPrompt(context)}`,
    "첫 문장은 integratedInsight.openingHook을 자연스럽게 반영하고, 선택한 단일 체계의 실제 계산 근거를 핵심 해석으로 삼아.",
    "타로는 서버 projection의 카드명, 정/역방향, positionKey, spreadType만 사용하고 새 카드를 만들지 마.",
    "생시가 없으면 시주·라그나·상승궁·하우스·신궁을 확정하지 말고, 출생지가 없으면 하우스/상승궁 기반 단정을 피해서 말해.",
    `결과 본문(openingLine·innerState·coreReading·topicAdvice·cautionPattern·luckyAction 합계)은 ${GUARDIAN_FORTUNE_RESULT_LENGTH.min}자 이상 ${GUARDIAN_FORTUNE_RESULT_LENGTH.max}자 이하의 읽기 쉬운 한국어로 작성해. 같은 문장을 늘려 분량을 채우지 말고, 근거와 장면을 더해서 채워.`,
    `evidenceLines: 선택한 체계의 실제 계산 근거를 ${GUARDIAN_FORTUNE_LIST_LIMITS.evidenceLines.min}~${GUARDIAN_FORTUNE_LIST_LIMITS.evidenceLines.max}줄로 적어. 각 줄 ${GUARDIAN_FORTUNE_LIST_LIMITS.evidenceLines.maxLength}자 이내이며, context 에 없는 값은 쓰지 않는다.`,
    `followUpQuestions: 사용자가 다음에 이어서 물어볼 만한 질문을 ${GUARDIAN_FORTUNE_LIST_LIMITS.followUpQuestions.min}개, 각 ${GUARDIAN_FORTUNE_LIST_LIMITS.followUpQuestions.maxLength}자 이내로 사용자 말투(반말 아님)로 적어. 상품 홍보 문구가 아니라 진짜 궁금해할 질문이어야 한다.`,
    "필수 필드: title, openingLine, innerState, coreReading, topicAdvice, cautionPattern, luckyAction, evidenceLines, followUpQuestions, premiumCta, shareText.",
    "premiumCta는 서버가 제공한 topic allowlist의 ctaKey만 사용하고 targetPath는 만들지 마.",
    "shareText에는 생년월일, 생시, 출생지, 성별, 닉네임, 고민 원문을 넣지 마.",
    `JSON schema hint: ${buildSchemaHint()}`,
  ].join("\n\n");

  return {
    systemPrompt,
    userPrompt,
    responseSchemaHint: buildSchemaHint(),
    mode,
    topic,
    category,
  };
}

export { MODE_SYSTEM_PROMPTS, PROMPT_ADAPTER_FIELDS };
