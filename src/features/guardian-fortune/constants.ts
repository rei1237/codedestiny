import type {
  GuardianFortuneFeatureFlags,
  GuardianFortuneMode,
  GuardianFortuneTopic,
} from "./types";

export const GUARDIAN_FORTUNE_FEATURE_KEY = "guardian_fortune" as const;
export const GUARDIAN_FORTUNE_VERSION = "guardian-fortune.v1" as const;

export const GUARDIAN_FORTUNE_FLAGS = {
  UI: "ENABLE_GUARDIAN_FORTUNE_UI",
  MAIN_UI: "ENABLE_MAIN_GUARDIAN_FORTUNE",
  MOCK_FLOW: "ENABLE_GUARDIAN_FORTUNE_MOCK_FLOW",
  API: "ENABLE_GUARDIAN_FORTUNE_API",
  SHARE: "ENABLE_GUARDIAN_FORTUNE_SHARE",
} as const;

export const GUARDIAN_FORTUNE_DEFAULT_FLAGS: GuardianFortuneFeatureFlags = {
  enableUi: false,
  enableMockFlow: false,
  enableApi: false,
  enableShare: false,
};

export const GUARDIAN_FORTUNE_LIMITS = {
  guestFree: 1,
  dailyFree: 3,
  nicknameMaxLength: 20,
  concernMaxLength: 120,
  resultHandleMinutes: 10,
  shareDraftTokenMinutes: 10,
  shareSnapshotDays: 90,
} as const;

export const GUARDIAN_FORTUNE_MODES: Record<GuardianFortuneMode, {
  id: GuardianFortuneMode;
  label: string;
  characterName: string;
  headline: string;
  description: string;
  tone: string;
  image: string;
  imageAlt: string;
  loadingMessages: readonly string[];
}> = {
  yeoni: {
    id: "yeoni",
    label: "연이",
    characterName: "꽃돼지 연이",
    headline: "다정하게 안아주는 연이",
    description: "마음을 먼저 어루만지고, 오늘의 흐름을 부드럽게 알려줘요.",
    tone: "따뜻하고 포근한 상담자",
    image: "/images/fortune-tea-house/flower-pig-honey-hug.webp",
    imageAlt: "연이 모드의 꽃돼지 캐릭터",
    loadingMessages: [
      "연이가 달빛 조각을 모으는 중이에요…",
      "꽃돼지가 오늘의 마음결을 살펴보고 있어요…",
      "연이가 당신에게 맞는 말을 고르는 중이에요…",
    ],
  },
  neo: {
    id: "neo",
    label: "네오",
    characterName: "팩폭 전략실 네오",
    headline: "시크하게 짚어주는 네오",
    description: "괜히 돌려 말하지 않고, 지금 필요한 포인트를 차분하게 알려줘요.",
    tone: "차분하고 현실적인 전략가",
    image: "/neo-operation-room/sprites/transparent/neo-transparent-s1-f01.webp",
    imageAlt: "네오 모드의 팩폭 전략실 인간형 캐릭터",
    loadingMessages: [
      "네오가 별의 흐름을 정리하는 중…",
      "네오가 오늘의 핵심만 골라내는 중…",
      "조금만 기다려. 흐름은 이미 보이고 있어.",
    ],
  },
};

export const GUARDIAN_FORTUNE_TOPICS: Record<GuardianFortuneTopic, {
  id: GuardianFortuneTopic;
  label: string;
  description: string;
  priorityLogics: readonly string[];
  shareHint: string;
}> = {
  daily: {
    id: "daily",
    label: "오늘의 흐름",
    description: "오늘 나에게 들어오는 분위기와 조심할 흐름을 살펴봐요.",
    priorityLogics: ["saju_day_flow", "vedic_weekday", "sukuyo_today", "astrology_transit"],
    shareHint: "오늘의 귀인 운세가 내 하루의 속도를 꽤 정확하게 짚어줬어.",
  },
  love: {
    id: "love",
    label: "연애/인연",
    description: "상대와의 거리감, 마음의 흐름, 오늘의 인연운을 살펴봐요.",
    priorityLogics: ["sukuyo_relationship", "saju_ten_gods", "ziwei_spouse_palace", "tarot"],
    shareHint: "연이가 오늘 내 인연 흐름을 읽어줬어. 묘하게 내 상황 같아.",
  },
  money_work: {
    id: "money_work",
    label: "금전/일",
    description: "돈, 일, 결과, 선택의 흐름을 현실적으로 살펴봐요.",
    priorityLogics: ["saju_wealth_career", "ziwei_wealth_career", "vedic_dasha", "astrology_career"],
    shareHint: "오늘 내 일과 돈의 흐름을 현실적인 행동으로 풀어봤어.",
  },
  relationship: {
    id: "relationship",
    label: "인간관계",
    description: "사람 사이에서 반복되는 패턴과 오늘의 거리감을 살펴봐요.",
    priorityLogics: ["saju_ten_gods", "ziwei_social_palace", "sukuyo_relationship", "astrology_moon_venus"],
    shareHint: "내가 왜 어떤 사람 앞에서 자꾸 같은 방식으로 지치는지 보였어.",
  },
  mind: {
    id: "mind",
    label: "마음/심리",
    description: "요즘 마음이 어디에 묶여 있는지 부드럽게 살펴봐요.",
    priorityLogics: ["saju_elements", "vedic_moon", "astrology_moon", "tarot"],
    shareHint: "오늘 내 마음의 피로가 어디서 시작됐는지 조금 알 것 같아.",
  },
  decision: {
    id: "decision",
    label: "결정/선택",
    description: "지금 고민하는 선택에서 무엇을 먼저 봐야 할지 살펴봐요.",
    priorityLogics: ["saju_day_flow", "ziwei_life_career", "vedic_dasha", "astrology_transit", "tarot"],
    shareHint: "결정 앞에서 망설이는 이유를 운세보다 현실적인 언어로 정리해줬어.",
  },
};

export const GUARDIAN_FORTUNE_PREMIUM_CTA_BY_TOPIC = {
  daily: [
    { ctaKey: "life_compass", label: "운명의 지도에서 더 보기", targetPath: "/destiny-compass" },
  ],
  love: [
    { ctaKey: "love_strategy_ai", label: "연애 비책 전문가 상담", targetPath: "/love-secret-ai" },
    { ctaKey: "master_love_codex", label: "마스터 인연의 서", targetPath: "/master-love-codex" },
    { ctaKey: "sukuyo_compatibility", label: "숙요 궁합 전문가 상담", targetPath: "/sukuyo-compatibility-ai" },
  ],
  money_work: [
    { ctaKey: "life_book_consultation", label: "인생의 책 전문가 상담", targetPath: "/life-book-ai" },
    { ctaKey: "neo_strategy_room", label: "네오 전략실", targetPath: "/neo-operation-room" },
  ],
  relationship: [
    { ctaKey: "sukuyo_relationship", label: "숙요 궁합 전문가 상담", targetPath: "/sukuyo-compatibility-ai" },
    { ctaKey: "relationship_analysis", label: "관계 흐름 더 보기", targetPath: "/master-love-codex" },
  ],
  mind: [
    { ctaKey: "destiny_cafe", label: "운명의 찻집에서 이어보기", targetPath: "/fortune-tea-house" },
    { ctaKey: "tarot_healing", label: "따뜻한 회복 타로", targetPath: "/tarot/healing" },
    { ctaKey: "life_book_consultation", label: "인생의 책 전문가 상담", targetPath: "/life-book-ai" },
  ],
  decision: [
    { ctaKey: "tarot", label: "타로로 선택의 결 보기", targetPath: "/tarot/mingri" },
    { ctaKey: "neo_strategy_room", label: "네오 전략실", targetPath: "/neo-operation-room" },
  ],
} as const;

export const GUARDIAN_FORTUNE_COPY = {
  title: "오늘, 당신에게 필요한 귀인이 찾아왔어요",
  subtitle: "사주·자미두수·베다점·숙요점·점성술·타로의 흐름을 엮어, 오늘 당신에게 필요한 메시지를 전해드려요.",
  guestFree: "첫 1회는 로그인 없이 무료, 로그인하면 하루 3회까지 볼 수 있어요.",
  creditHint: "무료 상담을 모두 사용했다면, 1회 5,000원으로 연이와 네오에게 더 물어볼 수 있어요.",
} as const;

/** Adapter execution order used when the same topic has evidence from several systems. */
export const GUARDIAN_FORTUNE_ADAPTER_PRIORITY = {
  daily: ["saju", "tarot", "astrology", "ziwei", "vedic", "sukuyo"],
  love: ["sukuyo", "saju", "tarot", "ziwei", "astrology", "vedic"],
  money_work: ["saju", "ziwei", "tarot", "vedic", "astrology", "sukuyo"],
  relationship: ["sukuyo", "saju", "ziwei", "tarot", "astrology", "vedic"],
  mind: ["vedic", "astrology", "saju", "sukuyo", "tarot", "ziwei"],
  decision: ["tarot", "saju", "ziwei", "astrology", "vedic", "sukuyo"],
} as const;
