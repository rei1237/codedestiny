import {
  GUARDIAN_FORTUNE_MODES,
  GUARDIAN_FORTUNE_PREMIUM_CTA_BY_TOPIC,
  GUARDIAN_FORTUNE_TOPICS,
} from "./constants";
import type {
  GuardianFortuneMode,
  GuardianFortuneResult,
  GuardianFortuneTopic,
  GuardianFortuneUsageStatus,
} from "./types";

const ctaFor = (topic: GuardianFortuneTopic) => ({
  ...GUARDIAN_FORTUNE_PREMIUM_CTA_BY_TOPIC[topic][0],
  reason: "오늘의 흐름을 더 긴 패턴과 연결해 보고 싶다면 다음 상담에서 천천히 이어갈 수 있어요.",
});

function buildMockResult(mode: GuardianFortuneMode, topic: GuardianFortuneTopic, overrides: Partial<GuardianFortuneResult> = {}): GuardianFortuneResult {
  const modeName = GUARDIAN_FORTUNE_MODES[mode].label;
  const topicName = GUARDIAN_FORTUNE_TOPICS[topic].label;
  return {
    title: `오늘의 ${topicName}`,
    openingLine: mode === "yeoni"
      ? "연이가 보기엔, 겉으로는 괜찮은 척해도 마음속에서는 이미 중요한 기준을 고르고 있는 모습에 가까워 보여요."
      : "네오가 보기엔, 지금 필요한 건 운을 기다리는 일이 아니라 이미 보이는 선택지를 정리하는 일이야.",
    innerState: "지금의 마음은 결정을 못 내린 상태라기보다, 선택한 뒤의 변화를 감당할 준비가 되었는지 확인하려는 상태에 가까워요. 그래서 작은 신호에도 의미를 크게 붙이고, 시작하기 전에 한 번 더 안전한 답을 찾으려는 흐름이 생길 수 있어요.",
    coreReading: "오늘의 흐름은 한 번에 많은 일을 벌이기보다 이미 시작한 일을 눈에 보이는 단계로 정돈할 때 힘이 살아나는 쪽에 가까워요. 여러 운세 체계가 공통으로 보여주는 핵심은 속도를 늦추라는 뜻이 아니라, 에너지가 새는 지점을 먼저 줄이라는 점이에요.",
    topicAdvice: `${topicName}에서는 상대나 결과를 대신 결론 내리기보다, 오늘 확인할 수 있는 사실과 내가 선택할 수 있는 행동을 나눠보세요. ${modeName}의 조언은 거창한 결심보다 15분 안에 끝낼 수 있는 작은 확인 하나에서 시작해요.`,
    cautionPattern: "확인할 수 없는 반응을 결론처럼 받아들이며 지금 할 수 있는 행동까지 미루지 않도록 해요. 불안을 없애려 하기보다, 확인 가능한 정보 하나를 정하는 편이 흐름을 안정시켜요.",
    luckyAction: "오늘 안에 미뤄둔 일 하나를 15분만 시작하고, 끝난 뒤 달라진 기분을 짧게 기록해보세요.",
    premiumCta: ctaFor(topic),
    shareText: GUARDIAN_FORTUNE_TOPICS[topic].shareHint,
    ...overrides,
  };
}

export const GUARDIAN_FORTUNE_MOCK_RESULTS = {
  yeoniDaily: buildMockResult("yeoni", "daily"),
  yeoniLove: buildMockResult("yeoni", "love", { title: "연이가 읽어본 오늘의 인연" }),
  yeoniMoneyWork: buildMockResult("yeoni", "money_work", { title: "연이가 읽어본 오늘의 일과 돈" }),
  neoDaily: buildMockResult("neo", "daily", { title: "네오의 오늘 판세" }),
  neoDecision: buildMockResult("neo", "decision", { title: "네오가 정리한 오늘의 선택" }),
  shortResult: buildMockResult("yeoni", "daily", {
    coreReading: "오늘은 하나를 정리하면 다음 움직임이 보이는 날이에요.",
    topicAdvice: "확인할 수 있는 작은 행동부터 시작해보세요.",
  }),
  forbiddenExpressionResult: buildMockResult("neo", "decision", {
    coreReading: "무조건 이 선택을 해야 하고 반드시 성공합니다. 이 결과를 안 보면 큰일 난다는 식의 표현은 품질 검증에서 거부되어야 합니다.",
  }),
} satisfies Record<string, GuardianFortuneResult>;

const usage = (overrides: Partial<GuardianFortuneUsageStatus>): GuardianFortuneUsageStatus => ({
  isLoggedIn: false,
  guestFreeLimit: 1,
  guestFreeUsed: 0,
  guestFreeRemaining: 1,
  dailyFreeLimit: 0,
  dailyFreeUsed: 0,
  dailyFreeRemaining: 0,
  canGenerate: true,
  generationSource: "guest_free",
  nextAction: "generate",
  message: "첫 1회는 로그인 없이 무료로 볼 수 있어요.",
  ...overrides,
});

export const GUARDIAN_FORTUNE_MOCK_USAGE = {
  guestAvailable: usage({}),
  guestUsed: usage({ guestFreeUsed: 1, guestFreeRemaining: 0, canGenerate: false, generationSource: "blocked", nextAction: "login", message: "첫 무료 상담을 이미 사용했어요. 로그인하면 하루 3번까지 연이와 네오에게 물어볼 수 있어요." }),
  authDaily3: usage({ isLoggedIn: true, guestFreeLimit: 0, guestFreeUsed: 0, guestFreeRemaining: 0, dailyFreeLimit: 3, dailyFreeRemaining: 3, canGenerate: true, generationSource: "daily_free", nextAction: "generate", message: "오늘 남은 무료 상담 3회" }),
  authDaily2: usage({ isLoggedIn: true, guestFreeLimit: 0, guestFreeUsed: 0, guestFreeRemaining: 0, dailyFreeLimit: 3, dailyFreeUsed: 1, dailyFreeRemaining: 2, canGenerate: true, generationSource: "daily_free", nextAction: "generate", message: "오늘 남은 무료 상담 2회" }),
  authDaily1: usage({ isLoggedIn: true, guestFreeLimit: 0, guestFreeUsed: 0, guestFreeRemaining: 0, dailyFreeLimit: 3, dailyFreeUsed: 2, dailyFreeRemaining: 1, canGenerate: true, generationSource: "daily_free", nextAction: "generate", message: "오늘 남은 무료 상담 1회" }),
  authExhausted: usage({ isLoggedIn: true, guestFreeLimit: 0, guestFreeUsed: 0, guestFreeRemaining: 0, dailyFreeLimit: 3, dailyFreeUsed: 3, dailyFreeRemaining: 0, canGenerate: false, generationSource: "blocked", nextAction: "pay_per_use", message: "오늘의 무료 상담 3회를 모두 사용했어요. 1회 5,000원으로 이어서 물어볼 수 있어요." }),
} satisfies Record<string, GuardianFortuneUsageStatus>;


export const GUARDIAN_FORTUNE_MOCK_FIXTURES = {
  modes: GUARDIAN_FORTUNE_MODES,
  topics: GUARDIAN_FORTUNE_TOPICS,
  results: GUARDIAN_FORTUNE_MOCK_RESULTS,
  usage: GUARDIAN_FORTUNE_MOCK_USAGE,
} as const;
