import { GUARDIAN_TOPIC_ADAPTER_PRIORITY, text } from "./guardian-fortune-adapter-utils.js";

const TOPIC_GUIDANCE = {
  daily: {
    theme: "오늘은 속도를 높이기보다 해야 할 일을 정리하는 순서가 흐름을 살립니다.",
    concern: "오늘 무엇부터 시작하고 무엇을 미뤄야 할지",
    advice: "확신보다 순서를 먼저 정리하기",
    caution: "할 일을 한꺼번에 벌여놓고 체력이 따라오길 기다리는 것",
    action: "오늘 꼭 필요한 일 세 가지만 적고 첫 번째 일에 20분을 써보세요.",
    bridge: "하루의 큰 흐름을 더 세밀하게 보고 싶다면 오늘의 흐름 심화 상담으로 이어갈 수 있습니다.",
  },
  love: {
    theme: "관계에서는 마음을 증명하기보다 서로의 속도와 간격을 확인하는 흐름이 중요합니다.",
    concern: "상대의 반응과 연락 속도를 어떻게 받아들일지",
    advice: "표현보다 확인하고, 확인보다 여지를 남기기",
    caution: "상대의 작은 반응을 전체 관계의 결론처럼 해석하는 것",
    action: "보내고 싶은 말을 먼저 메모한 뒤, 한 번 짧고 편안하게 정리해보세요.",
    bridge: "관계의 반복 패턴을 더 깊이 살펴보고 싶다면 연애 비책이나 숙요 궁합 상담으로 이어갈 수 있습니다.",
  },
  money_work: {
    theme: "돈과 일에서는 크게 넓히기보다 이미 가진 능력을 반복 가능한 구조로 만드는 흐름입니다.",
    concern: "지금 더 확장할지, 먼저 안정화할지",
    advice: "감정 대응보다 조건과 우선순위를 정리하기",
    caution: "불안한 마음을 빠른 결제나 성급한 확장으로 달래는 것",
    action: "오늘의 업무와 지출을 각각 세 줄로 나누어 가장 회수 가능한 한 가지부터 처리하세요.",
    bridge: "수익과 역할의 구조를 더 자세히 보고 싶다면 사주 재물운이나 자미두수 재백궁·관록궁 분석으로 이어갈 수 있습니다.",
  },
  relationship: {
    theme: "가까운 관계일수록 혼자 더 많이 배려하기보다 서로의 역할과 경계를 다시 맞추는 흐름입니다.",
    concern: "누구에게 어디까지 마음과 시간을 써야 할지",
    advice: "좋은 사람이 되려 하기보다 가능한 범위를 분명히 하기",
    caution: "상대가 말하지 않은 몫까지 먼저 떠안는 것",
    action: "오늘 한 번은 바로 답하지 말고, 내가 할 수 있는 범위를 먼저 확인하세요.",
    bridge: "관계에서 반복되는 거리감과 역할을 더 깊이 보고 싶다면 숙요점 관계 분석으로 이어갈 수 있습니다.",
  },
  mind: {
    theme: "마음은 답을 더 찾기보다 자극과 피로를 줄일 때 회복의 방향이 보이는 흐름입니다.",
    concern: "왜 쉬어도 생각이 멈추지 않는지",
    advice: "감정을 판단하기보다 몸과 하루의 리듬부터 정돈하기",
    caution: "괜찮은 척하며 피로를 뒤로 미루다가 한 번에 소진되는 것",
    action: "알림을 잠시 끄고 물을 마신 뒤, 10분만 걷거나 눈을 쉬게 해보세요.",
    bridge: "반복되는 내면 패턴을 더 차분히 보고 싶다면 마음 상담이나 나크샤트라 기반 해석으로 이어갈 수 있습니다.",
  },
  decision: {
    theme: "결정은 한 번에 정답을 고르는 일보다 되돌릴 수 있는 작은 실험을 설계하는 데 힘이 실립니다.",
    concern: "무엇을 선택해야 후회가 적을지",
    advice: "확신보다 검증 가능한 다음 행동을 고르기",
    caution: "결정의 부담을 줄이려고 아무것도 하지 않는 선택을 반복하는 것",
    action: "두 선택지 중 오늘 확인할 수 있는 조건 하나를 정하고 작은 테스트부터 시작하세요.",
    bridge: "선택의 상징과 현실 조건을 함께 보고 싶다면 타로나 육효 상담으로 확장할 수 있습니다.",
  },
};

const ADAPTER_ROLES = {
  saju: { label: "사주", role: "성향과 행동 패턴" },
  ziwei: { label: "자미두수", role: "삶의 방향과 주제별 구조" },
  vedic: { label: "베다점", role: "무의식적 감정 리듬" },
  sukuyo: { label: "숙요점", role: "관계의 거리감과 반복 반응" },
  astrology: { label: "점성술", role: "내면 감정과 표현 방식" },
  tarot: { label: "타로", role: "오늘의 상징과 행동 조언" },
};

function adapterHook(name, data) {
  if (!data) return "";
  if (name === "saju") return text(data.personalityHook || data.currentFlowSummary || data.currentFlow, 180);
  if (name === "ziwei") return text(data.topicPalaceSummary || data.lifePalaceSummary, 180);
  if (name === "vedic") return text(data.innerRhythm || data.nakshatraSummary, 180);
  if (name === "sukuyo") return text(data.relationshipPattern || data.distancePattern, 180);
  if (name === "astrology") return text(data.currentMoodSummary || data.moonSummary, 180);
  if (name === "tarot") return text(data.symbolicMessage || data.cards?.[0]?.meaningSummary, 180);
  return "";
}

export function buildIntegratedInsight({ topic, results = {}, hasConcern = false } = {}) {
  const guidance = TOPIC_GUIDANCE[topic] || TOPIC_GUIDANCE.daily;
  const priority = GUARDIAN_TOPIC_ADAPTER_PRIORITY[topic] || GUARDIAN_TOPIC_ADAPTER_PRIORITY.daily;
  const successfulSystems = priority.filter((name) => results[name]);
  const hooks = successfulSystems
    .map((name) => {
      const role = ADAPTER_ROLES[name] || { label: name, role: "보조 근거" };
      return { name, ...role, value: adapterHook(name, results[name]) };
    })
    .filter((item) => item.value);
  const primary = hooks[0];
  const secondary = hooks[1];
  const tertiary = hooks[2];
  const openingHook = primary && secondary
    ? `${primary.label}의 ${primary.role}와 ${secondary.label}의 ${secondary.role}가 함께 ${guidance.advice} 쪽을 가리킵니다. ${primary.value} ${secondary.value} 그래서 오늘은 여러 해석을 따로 떼어 보기보다, 반복되는 패턴 하나를 현실 행동으로 옮기는 편이 좋습니다.`
    : primary
      ? `${primary.label}의 ${primary.role}에서는 ${primary.value}라는 신호가 먼저 보입니다. 한 가지 근거만으로 결론 내리기보다 오늘의 선택을 작게 확인해보세요.`
      : "오늘의 흐름은 감정과 현실의 순서를 함께 살피는 데서 방향이 보입니다. 한 가지 신호만으로 결론 내리기보다 오늘의 선택을 작게 확인해보세요.";
  const currentTheme = tertiary
    ? `${guidance.theme} 여기에 ${tertiary.label}의 ${tertiary.role} 근거도 겹치므로, 조언은 추상적인 기분보다 오늘 실제로 바꿀 수 있는 태도에 맞춥니다.`
    : guidance.theme;
  const concernHint = hasConcern
    ? `${guidance.concern}를 이미 마음에 두고 있다면, 그 고민을 서둘러 결론내리기보다 아래의 작은 행동으로 확인해보세요.`
    : `${guidance.concern}를 차분히 살펴보면 오늘의 흐름이 더 선명해집니다.`;
  const evidenceKeys = successfulSystems.flatMap((name) => Array.isArray(results[name]?.evidence) ? results[name].evidence : []).slice(0, 12);

  return {
    openingHook: text(openingHook, 420),
    currentTheme: text(currentTheme, 420),
    likelyConcern: concernHint,
    adviceDirection: guidance.advice,
    cautionPattern: guidance.caution,
    luckyActionHint: guidance.action,
    premiumBridge: guidance.bridge,
    evidenceKeys,
  };
}

export { TOPIC_GUIDANCE };
