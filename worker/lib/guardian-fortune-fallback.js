import {
  GUARDIAN_FORTUNE_MODE_SHARE_HINTS,
  GUARDIAN_FORTUNE_SAFE_RESULT_DEFAULTS,
  getDefaultCta,
  getTopicContract,
} from "./guardian-fortune-runtime-contract.js";
import { GUARDIAN_TOPIC_ADAPTER_PRIORITY, text } from "./guardian-fortune-adapter-utils.js";

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
  const evidenceSentence = evidence.length >= 2
    ? evidence.length >= 3
      ? `${evidence[0]}라는 단서, ${evidence[1]}라는 흐름, 그리고 ${evidence[2]}라는 상징이 같은 방향을 겹쳐 가리킵니다. 서로 다른 체계가 반복해서 찍어주는 지점은 오늘의 핵심 패턴으로 우선 봅니다.`
      : `${evidence[0]}라는 단서와 ${evidence[1]}라는 흐름이 같은 방향을 가리킵니다. 서로 다른 체계가 반복해서 가리키는 지점은 오늘의 핵심 패턴으로 우선 봅니다.`
    : evidence.length === 1
      ? `${evidence[0]}라는 단서가 이번 해석의 중심에 놓입니다. 다만 한 체계의 근거만으로 모든 결론을 확정하지는 않고, 낮은 확신의 조언으로 정리합니다.`
      : "계산된 흐름은 감정과 현실의 순서를 함께 살필 때 더 선명해집니다.";

  return {
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
}

export { TOPIC_GUIDANCE };
