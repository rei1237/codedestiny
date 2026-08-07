export type GuardianFortuneMode = "yeoni" | "neo";

export type GuardianFortuneTopic =
  | "daily"
  | "love"
  | "money_work"
  | "relationship"
  | "mind"
  | "decision";

export type GuardianFortuneCalendarType = "solar" | "lunar";

export type GuardianFortuneGender = "female" | "male" | "unknown";

export type GuardianFortuneAdapterName =
  | "saju"
  | "ziwei"
  | "vedic"
  | "sukuyo"
  | "astrology"
  | "tarot"
  | "integrated";

export type GuardianFortuneContextWarning = {
  adapter: GuardianFortuneAdapterName;
  code: string;
  message: string;
};

export type GuardianAdapterResult<T> =
  | {
      ok: true;
      data: T;
      warnings?: GuardianFortuneContextWarning[];
    }
  | {
      ok: false;
      errorCode: string;
      message: string;
      warnings?: GuardianFortuneContextWarning[];
    };

export type GuardianFortuneBirthPlace = {
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type NormalizedGuardianFortuneInput = {
  birthDate: string;
  birthTime?: string;
  hasBirthTime: boolean;
  calendarType: GuardianFortuneCalendarType;
  gender: GuardianFortuneGender;
  birthPlace?: GuardianFortuneBirthPlace;
  hasBirthPlace: boolean;
  topic: GuardianFortuneTopic;
  mode: GuardianFortuneMode;
  locale: string;
  targetDate: string;
  timezone: "Asia/Seoul";
  hasConcern: boolean;
  concernForLLM?: string;
};

export type GuardianFortuneGenerationSource =
  | "guest_free"
  | "daily_free"
  | "blocked";

export type GuardianFortuneNextAction =
  | "generate"
  | "login"
  | "pay_per_use"
  | "wait_tomorrow";

export type GuardianFortuneInput = {
  birthDate: string;
  birthTime?: string;
  birthPlace?: GuardianFortuneBirthPlace;
  calendarType: GuardianFortuneCalendarType;
  gender?: GuardianFortuneGender;
  nickname?: string;
  concern?: string;
  topic: GuardianFortuneTopic;
  mode: GuardianFortuneMode;
  locale: string;
  targetDate?: string;
};

export type GuardianFortunePremiumCta = {
  ctaKey: string;
  label: string;
  targetPath: string;
  reason: string;
};

export type GuardianFortuneResult = {
  title: string;
  openingLine: string;
  innerState: string;
  coreReading: string;
  topicAdvice: string;
  cautionPattern: string;
  luckyAction: string;
  premiumCta: GuardianFortunePremiumCta;
  shareText: string;
};

export type SharedGuardianFortuneSnapshot = {
  shareId: string;
  mode: GuardianFortuneMode;
  topic: GuardianFortuneTopic;
  title: string;
  openingLine: string;
  innerState: string;
  coreReading: string;
  topicAdvice: string;
  cautionPattern: string;
  luckyAction: string;
  premiumCta?: GuardianFortunePremiumCta;
  shareText: string;
  createdAt: string;
  expiresAt?: string;
  locale: string;
  /**
   * Deliberately absent from this contract:
   * birthDate, birthTime, gender, nickname, concern, public userId, IP,
   * raw prompt/response/fortuneContext, payment data, and credit balances.
   */
};

export type GuardianFortuneContext = {
  version: "guardian-fortune.v1";
  inputSummary: {
    hasBirthTime: boolean;
    hasBirthPlace: boolean;
    calendarType: GuardianFortuneCalendarType;
    topic: GuardianFortuneTopic;
    mode: GuardianFortuneMode;
    targetDate: string;
    locale: string;
    hasConcern: boolean;
  };
  availableSystems: string[];
  unavailableClaims: string[];
  saju?: {
    dayMaster?: string;
    tenGodsSummary?: string;
    fiveElementsSummary?: string;
    currentFlowSummary?: string;
    personalityHook?: string;
    cautions?: string[];
  };
  ziwei?: {
    lifePalaceSummary?: string;
    topicPalaceSummary?: string;
    keyStarsSummary?: string;
    strengths?: string[];
    cautions?: string[];
  };
  vedic?: {
    lagnaSummary?: string;
    moonSignSummary?: string;
    nakshatraSummary?: string;
    dashaSummary?: string;
    innerRhythm?: string;
  };
  sukuyo?: {
    birthMansion?: string;
    emotionalPattern?: string;
    relationshipPattern?: string;
    distancePattern?: string;
  };
  astrology?: {
    sunSummary?: string;
    moonSummary?: string;
    ascendantSummary?: string;
    currentMoodSummary?: string;
  };
  tarot?: {
    spreadType: "one_card" | "three_card";
    cards: Array<{
      name: string;
      orientation?: "upright" | "reversed";
      meaningSummary: string;
    }>;
    symbolicMessage: string;
  };
  integratedInsight: {
    openingHook: string;
    currentTheme: string;
    likelyConcern: string;
    adviceDirection: string;
    cautionPattern: string;
    luckyActionHint: string;
    premiumBridge: string;
    evidenceKeys: string[];
  };
  safetyConstraints: string[];
  /** Raw birth inputs and full calculator payloads must never be added here. */
};

export type GuardianFortuneContextBuildResult =
  | {
      ok: true;
      context: GuardianFortuneContext;
      warnings: GuardianFortuneContextWarning[];
    }
  | {
      ok: false;
      errorCode:
        | "GUARDIAN_CONTEXT_INVALID_INPUT"
        | "GUARDIAN_CONTEXT_ALL_ADAPTERS_FAILED"
        | "GUARDIAN_CONTEXT_INTERNAL_ERROR";
      message: string;
      warnings: GuardianFortuneContextWarning[];
    };

export type GuardianFortuneUsageStatus = {
  isLoggedIn: boolean;
  guestFreeLimit: number;
  guestFreeUsed: number;
  guestFreeRemaining: number;
  dailyFreeLimit: number;
  dailyFreeUsed: number;
  dailyFreeRemaining: number;
  canGenerate: boolean;
  generationSource: GuardianFortuneGenerationSource;
  nextAction: GuardianFortuneNextAction;
  message: string;
};

export type GuardianFortuneGenerateResponse = {
  result: GuardianFortuneResult;
  usage: GuardianFortuneUsageStatus;
  generationSource: Exclude<GuardianFortuneGenerationSource, "blocked">;
  requestId: string;
  shareDraftToken?: string;
};

export type GuardianFortuneFeatureFlags = {
  enableUi: boolean;
  enableMockFlow: boolean;
  enableApi: boolean;
  enableShare: boolean;
};

export type GuardianFortuneShareState = {
  status: "idle" | "creating" | "ready" | "sharing" | "failed";
  shareId?: string;
  shareUrl?: string;
  error?: string;
};

export type GuardianFortuneCreateShareResponse = {
  shareId: string;
  shareUrl: string;
  shareText: string;
  title: string;
};
