import {
  GUARDIAN_FORTUNE_MODE_SHARE_HINTS,
  GUARDIAN_FORTUNE_SAFE_RESULT_DEFAULTS,
  getDefaultCta,
  getTopicContract,
} from "./guardian-fortune-runtime-contract.js";
import { GUARDIAN_TOPIC_ADAPTER_PRIORITY, text } from "./guardian-fortune-adapter-utils.js";
import { buildFortuneQuestionFocus } from "./fortune-question-focus.js";

const TOPIC_GUIDANCE = Object.freeze({
  daily: {
    focus: "오늘 가장 먼저 정리할 한 가지",
    action: "해야 할 일을 세 가지 안으로 좁히고, 그중 가장 되돌리기 쉬운 일부터 10분만 시작해보세요.",
    caution: "아직 확인하지 않은 내일의 변수까지 오늘 결론처럼 키우는 것",
  },
  love: {
    focus: "표현과 기다림 사이의 속도",
    action: "연락이나 답장을 보내기 전에 하고 싶은 말을 한 문장으로 줄이고, 상대에게 남겨둘 여백을 확인해보세요.",
    caution: "상대의 반응이 오기 전에 혼자 관계의 결론을 완성하는 것",
  },
  money_work: {
    focus: "성과보다 먼저 정리할 조건",
    action: "오늘의 지출·업무·기회를 각각 한 줄로 적고, 지금 회수 가능한 일 하나에 먼저 시간을 배정해보세요.",
    caution: "불안한 마음을 빠른 결제나 과한 확장으로 달래려는 것",
  },
  relationship: {
    focus: "가까워짐과 거리 두기의 균형",
    action: "불편했던 대화에서 사실과 해석을 나눠 적고, 다음 대화에서 확인할 질문 하나만 남겨보세요.",
    caution: "상대의 말투 하나를 나에 대한 전체 평가처럼 받아들이는 것",
  },
  mind: {
    focus: "생각을 줄이는 것이 아니라 순서를 세우는 일",
    action: "머릿속 걱정을 지금 할 일·나중에 볼 일·내가 조절할 수 없는 일로 나누어 적어보세요.",
    caution: "피로한 상태에서 감정의 크기를 상황의 사실로 오해하는 것",
  },
  decision: {
    focus: "확신보다 확인 가능한 기준",
    action: "선택지마다 얻는 것과 감당할 것을 한 줄씩 비교하고, 오늘 확인할 조건 하나를 먼저 검증해보세요.",
    caution: "결정을 미루는 동안 정보가 저절로 더 좋아질 것이라고 기대하는 것",
  },
});

const ADAPTER_EVIDENCE_LABELS = Object.freeze({
  saju: Object.freeze({ label: "사주", role: "성향과 행동 패턴" }),
  ziwei: Object.freeze({ label: "자미두수", role: "삶의 방향과 주제별 구조" }),
  vedic: Object.freeze({ label: "베다점", role: "무의식적 감정 리듬" }),
  sukuyo: Object.freeze({ label: "숙요점", role: "관계의 거리감" }),
  astrology: Object.freeze({ label: "점성술", role: "감정과 표현 방식" }),
  tarot: Object.freeze({ label: "타로", role: "오늘의 상징 조언" }),
});

const ADAPTER_QUESTION_PERSPECTIVES = Object.freeze({
  saju: "타고난 추진 방식과 지금의 흐름",
  ziwei: "역할과 책임이 반복되는 자리",
  vedic: "감정의 리듬과 회복의 순서",
  sukuyo: "관계의 거리와 대화의 속도",
  astrology: "정서와 행동이 만나는 지점",
  tarot: "지금 선택에서 확인할 상징과 행동",
});

const ADAPTER_QUESTION_FIELDS = Object.freeze({
  saju: ["dayMaster", "currentFlowSummary", "fiveElementsSummary", "tenGodsSummary", "seasonSummary", "relationSummary"],
  ziwei: ["topicPalaceSummary", "lifePalaceSummary", "keyStarsSummary", "strengths", "cautions"],
  vedic: ["innerRhythm", "moonSignSummary", "nakshatraSummary", "dashaSummary", "lagnaSummary"],
  sukuyo: ["relationshipPattern", "distancePattern", "emotionalPattern", "birthMansion", "todayMansion"],
  astrology: ["currentMoodSummary", "moonSummary", "sunSummary", "venusSummary", "marsSummary", "saturnSummary"],
  tarot: ["symbolicMessage", "cards"],
});

const ADAPTER_QUESTION_SPECIALIST_MOVES = Object.freeze({
  saju: "사주는 이 근거를 좋고 나쁜 운의 판정이 아니라, 힘을 쓰는 방식과 멈춰야 할 타이밍을 읽는 기준으로 봅니다.",
  ziwei: "자미두수는 이 근거를 역할과 책임이 반복되는 자리로 읽어, 내가 맡을 몫과 협의할 몫을 나누게 합니다.",
  vedic: "베다점은 이 근거를 감정의 리듬으로 읽어, 마음이 급해질 때 무엇을 먼저 회복해야 하는지 살핍니다.",
  sukuyo: "숙요는 이 근거를 관계의 속도로 읽으며, 상대의 속마음이 아니라 실제 대화와 거리의 변화를 봅니다.",
  astrology: "점성술은 이 근거를 정서와 행동이 만나는 지점으로 읽어, 원하는 것과 바로 행동할 수 있는 것을 구분합니다.",
  tarot: "타로는 이 근거를 현재 선택을 비추는 상징으로 읽으며, 카드가 결정을 대신한다고 말하지 않습니다.",
});

function safeText(value, max = 420) {
  return text(value, max).replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

function topicAndMode(input = {}, context = {}) {
  const topic = context?.inputSummary?.topic || input.topic;
  const safeTopic = Object.prototype.hasOwnProperty.call(TOPIC_GUIDANCE, topic) ? topic : "daily";
  const mode = (context?.inputSummary?.mode || input.mode) === "neo" ? "neo" : "yeoni";
  return { topic: safeTopic, mode };
}

function insightOf(context) {
  return context?.integratedInsight && typeof context.integratedInsight === "object"
    ? context.integratedInsight
    : {};
}

function evidenceFromAdapter(name, data) {
  if (!data || typeof data !== "object") return "";
  const meta = ADAPTER_EVIDENCE_LABELS[name] || { label: name, role: "보조 근거" };
  const candidates = [
    data.personalityHook,
    data.currentFlowSummary,
    data.seasonSummary,
    data.relationSummary,
    data.topicPalaceSummary,
    data.innerRhythm,
    data.relationshipPattern,
    data.emotionalPattern,
    data.currentMoodSummary,
    data.symbolicMessage,
    data.nakshatraSummary,
    data.padaSummary,
    data.moonSignSummary,
    data.venusSummary,
    data.marsSummary,
    data.saturnSummary,
    data.todayMansion,
    data.dayMaster,
  ];
  const value = candidates.map((item) => safeText(item, 240)).find(Boolean);
  return value ? `${meta.label}의 ${meta.role} 근거는 ${value}` : "";
}

function collectEvidence(context, topic) {
  const priority = GUARDIAN_TOPIC_ADAPTER_PRIORITY[topic] || GUARDIAN_TOPIC_ADAPTER_PRIORITY.daily;
  const available = new Set(Array.isArray(context?.availableSystems) ? context.availableSystems : []);
  return priority
    .filter((name) => available.has(name))
    .map((name) => evidenceFromAdapter(name, context?.[name]))
    .filter(Boolean)
    .slice(0, 3);
}

function adapterQuestionAnchors(name, data) {
  if (!data || typeof data !== "object") return [];
  const fields = ADAPTER_QUESTION_FIELDS[name] || [];
  const values = [];
  for (const field of fields) {
    if (field === "cards") {
      for (const card of Array.isArray(data.cards) ? data.cards : []) {
        const cardValue = safeText(card?.meaningSummary || card?.name, 150);
        if (cardValue) values.push(cardValue);
      }
      continue;
    }
    if (Array.isArray(data[field])) {
      values.push(...data[field].map((item) => safeText(item, 150)).filter(Boolean));
      continue;
    }
    const value = safeText(data[field], 180);
    if (value) values.push(value);
  }
  return [...new Set(values)].slice(0, 2);
}

function buildQuestionSpecificEvidence(context, questionFocus) {
  const requested = context?.inputSummary?.category;
  const available = Array.isArray(context?.availableSystems) ? context.availableSystems : [];
  const category = available.includes(requested) ? requested : available[0];
  const meta = ADAPTER_EVIDENCE_LABELS[category];
  if (!category || !meta) {
    return `질문의 핵심은 ${questionFocus.label}입니다. 계산 가능한 근거가 충분하지 않은 부분은 단정하지 않고, 지금 확인할 수 있는 행동을 기준으로 답하겠습니다.`;
  }
  const anchors = adapterQuestionAnchors(category, context?.[category]);
  const perspective = ADAPTER_QUESTION_PERSPECTIVES[category] || meta.role;
  const specialistMove = ADAPTER_QUESTION_SPECIALIST_MOVES[category] || "계산 근거를 현재의 선택 기준으로 번역합니다.";
  if (anchors.length >= 2) {
    return `“${questionFocus.label}”에 관한 질문에 ${meta.label}은 ${perspective}의 관점에서 “${anchors[0]}”, “${anchors[1]}”라는 계산 근거를 함께 보여줍니다. ${specialistMove} 그래서 답은 서두른 결론보다 이 두 흐름이 실제 상황에서 어떻게 반복되는지 확인하는 데 있습니다.`;
  }
  if (anchors.length === 1) {
    return `“${questionFocus.label}”에 관한 질문에 ${meta.label}은 ${perspective}의 관점에서 “${anchors[0]}”라는 계산 근거를 보여줍니다. ${specialistMove} 이 근거 하나로 결론을 정하지 않고, 지금의 선택에서 확인할 기준으로 쓰겠습니다.`;
  }
  return `“${questionFocus.label}”에 관한 질문을 ${meta.label}의 ${perspective} 관점에서 읽되, 계산 결과에 없는 정보는 덧붙이지 않겠습니다.`;
}

function unavailableNote(context) {
  const claims = Array.isArray(context?.unavailableClaims) ? context.unavailableClaims : [];
  if (!claims.length) return "계산되지 않은 영역은 억지로 단정하지 않고, 확인 가능한 흐름만 바탕으로 읽었습니다.";
  return "생시나 출생지처럼 조건이 필요한 영역은 제외하고, 이번 결과에서 계산된 흐름만 바탕으로 읽었습니다.";
}

function buildModeVoice(mode, topic, hook) {
  if (mode === "neo") {
    return `네오식으로 정리하면, ${hook || `${getTopicContract(topic).label}의 핵심은 속도보다 순서야.`} 감으로 밀어붙일 판은 아니고, 확인할 조건을 줄이면 움직일 타이밍이 보인다.`;
  }
  return `연이가 조용히 찻잔을 건네듯 보면, ${hook || `${getTopicContract(topic).label}의 흐름은 서두르기보다 마음과 현실의 순서를 맞추는 데 있어요.`} 오늘은 작은 확인 하나가 다음 장면을 부드럽게 열어줄 수 있어요.`;
}

function buildPremiumReason(insight, topic) {
  return safeText(insight.premiumBridge, 360)
    || `${getTopicContract(topic).label}의 흐름을 더 깊게 살펴보고 싶다면, 다음 상담에서 반복되는 패턴과 선택의 조건을 이어서 확인할 수 있어요.`;
}

/**
 * Creates a complete result from already-calculated context, without using
 * raw birth input or pretending that unavailable calculations exist.
 */
export function buildContextDrivenGuardianFallback({ input = {}, context = {}, reason = "" } = {}) {
  const { topic, mode } = topicAndMode(input, context);
  const questionFocus = buildFortuneQuestionFocus({ concern: input.concern, topic });
  const insight = insightOf(context);
  const guidance = TOPIC_GUIDANCE[topic];
  const contract = getTopicContract(topic);
  const cta = getDefaultCta(topic);
  const hook = safeText(insight.openingHook, 360);
  const theme = safeText(insight.currentTheme, 360) || `${contract.label}은 ${guidance.focus}를 정리할수록 방향이 선명해지는 흐름입니다.`;
  const concern = safeText(insight.likelyConcern, 300) || `${contract.label}에서 무엇부터 확인해야 마음이 놓일지 고민하는 흐름`;
  const advice = safeText(insight.adviceDirection, 240) || "결정보다 확인 가능한 다음 행동";
  const caution = safeText(insight.cautionPattern, 300) || guidance.caution;
  const action = safeText(insight.luckyActionHint, 320) || guidance.action;
  const evidence = collectEvidence(context, topic);
  const questionEvidence = buildQuestionSpecificEvidence(context, questionFocus);
  const evidenceSentence = evidence.length >= 2
    ? evidence.length >= 3
      ? `${evidence[0]}라는 단서, ${evidence[1]}라는 흐름, 그리고 ${evidence[2]}라는 상징이 같은 방향을 겹쳐 가리킵니다. 서로 다른 체계가 반복해서 찍어주는 지점은 오늘의 핵심 패턴으로 우선 봅니다.`
      : `${evidence[0]}라는 단서와 ${evidence[1]}라는 흐름이 같은 방향을 가리킵니다. 서로 다른 체계가 반복해서 가리키는 지점은 오늘의 핵심 패턴으로 우선 봅니다.`
    : evidence.length === 1
      ? `${evidence[0]}라는 단서가 이번 해석의 중심에 놓입니다. 다만 한 체계의 근거만으로 모든 결론을 확정하지는 않고, 낮은 확신의 조언으로 정리합니다.`
      : "계산된 흐름은 감정과 현실의 순서를 함께 살필 때 더 선명해집니다.";

  const baseResult = {
    title: GUARDIAN_FORTUNE_SAFE_RESULT_DEFAULTS.title,
    openingLine: buildModeVoice(mode, topic, hook),
    innerState: `지금 마음에는 ${concern}이(가) 함께 놓여 있어 보여요. ${hook || "겉으로는 괜찮아 보여도 속에서는 이미 여러 가능성을 비교하고 있는 모습"}이(가) 있어, 감정을 억지로 밀어내기보다 내가 확인할 수 있는 부분과 조금 더 기다려야 하는 부분을 나누는 것이 좋아요. ${unavailableNote(context)}`,
    coreReading: `${theme} ${evidenceSentence} 이 근거는 미래를 정해두는 선언이 아니라, 오늘 부담을 줄이는 순서를 찾기 위한 재료에 가깝습니다. ${buildModeVoice(mode, topic, "지금은 한 번에 모든 답을 얻으려 하기보다, 가장 영향이 큰 변수부터 확인해")} 그 과정을 거치면 마음이 앞서 만든 결론과 실제 상황 사이의 간격도 조금씩 좁혀질 수 있어요.`,
    topicAdvice: `${contract.label}에서 오늘의 기준은 ${advice}입니다. ${guidance.focus}를 먼저 적고, 상대나 환경의 반응을 기다리는 일과 내가 바로 조절할 수 있는 일을 구분해보세요. ${action} 작은 확인을 거친 뒤에도 같은 선택이 남는다면 그때 한 단계 더 나아가면 됩니다.`,
    cautionPattern: `오늘 조심할 반복 패턴은 ${caution}입니다. 마음이 급해질수록 한 번 멈추고 지금 가진 정보가 충분한지 확인해보세요. 불안한 상태에서 내린 결론은 실제 상황보다 더 크게 느껴질 수 있으니, 되돌릴 수 있는 행동부터 고르는 편이 안전합니다.`,
    luckyAction: action,
    premiumCta: {
      ctaKey: cta.ctaKey,
      label: cta.label,
      targetPath: cta.targetPath,
      reason: buildPremiumReason(insight, topic),
    },
    shareText: `${GUARDIAN_FORTUNE_MODE_SHARE_HINTS[mode]} ${contract.shareHint}`,
    _reason: reason,
  };
  return {
    ...baseResult,
    openingLine: `${baseResult.openingLine} 지금 답할 질문은 ${questionFocus.answerFrame}입니다.`,
    innerState: `지금 질문은 ${questionFocus.answerFrame}에 대한 답을 찾고 있어요. ${baseResult.innerState}`,
    coreReading: `${questionEvidence} ${baseResult.coreReading}`,
    topicAdvice: `질문에 바로 답하면, ${questionFocus.answerFrame}에서는 ${advice}가 먼저입니다. ${questionFocus.actionFrame} ${baseResult.topicAdvice}`,
    evidenceLines: buildEvidenceLines(evidence, contract),
    followUpQuestions: buildFollowUpQuestions(topic, contract),
  };
}

/**
 * 결과 카드에 "무엇을 근거로 이렇게 읽었는가"를 3~5줄로 드러낸다.
 * 서버가 실제로 가진 근거만 쓰고, 모자라면 체계 역할 설명으로 채운다.
 */
function buildEvidenceLines(evidence, contract) {
  const lines = evidence.map((entry) => safeText(entry, 120)).filter(Boolean);
  const filler = [
    `${contract.label}의 흐름은 한 장면이 아니라 반복되는 선택 습관에서 읽습니다.`,
    "생시나 출생지가 없는 부분은 확정하지 않고 낮은 확신으로 남겨 둡니다.",
    "같은 방향을 두 번 이상 가리키는 신호를 우선 근거로 삼습니다.",
  ];
  for (const line of filler) {
    if (lines.length >= 3) break;
    if (!lines.includes(line)) lines.push(line);
  }
  return lines.slice(0, 5);
}

/** 대화를 잇는 동력. 주제마다 다음에 물어볼 만한 질문을 3개 제안한다. */
const FOLLOW_UP_QUESTIONS = Object.freeze({
  daily: ["오늘 중 가장 미루고 있는 일은 뭘까요?", "지금 몸과 마음 중 어디가 더 지쳐 있나요?", "내일로 넘겨도 괜찮은 일은 무엇인가요?"],
  love: ["상대에게 먼저 연락해도 될까요?", "지금 이 관계에서 제가 바라는 건 뭘까요?", "기다리는 게 나을 시기인가요?"],
  money_work: ["지금 이직을 고민해도 될 시기인가요?", "이번 달 지출에서 먼저 줄일 곳은 어디인가요?", "제가 잘하는 일로 돈을 벌 방법이 있을까요?"],
  relationship: ["그 사람과 거리를 둬야 할까요?", "제가 반복하는 관계 패턴은 뭘까요?", "먼저 사과하는 게 맞을까요?"],
  mind: ["요즘 마음이 무거운 이유가 뭘까요?", "지금 내려놓아도 되는 걱정은 무엇인가요?", "회복에 도움이 되는 하루 리듬은요?"],
  decision: ["두 선택지 중 어느 쪽이 저다울까요?", "지금 결정해야 할 만큼 급한 일인가요?", "결정 전에 확인해야 할 조건은 뭔가요?"],
});

function buildFollowUpQuestions(topic, contract) {
  const questions = FOLLOW_UP_QUESTIONS[topic] || FOLLOW_UP_QUESTIONS.daily;
  return questions.map((question) => safeText(question, 60)).filter(Boolean).slice(0, 3)
    .concat(`${contract.label}에서 더 궁금한 점이 있나요?`)
    .slice(0, 3);
}

export { TOPIC_GUIDANCE };
