const baseInput = {
  birthDate: "1988-08-08",
  birthTime: "09:30",
  calendarType: "solar",
  gender: "unknown",
  topic: "daily",
  category: "saju",
  mode: "yeoni",
  locale: "ko-KR",
  targetDate: "2026-08-02",
};

const birthTimeUnknownInput = {
  ...baseInput,
  birthTime: undefined,
};

const birthPlace = {
  city: "Seoul",
  country: "KR",
  latitude: 37.5665,
  longitude: 126.978,
  timezone: "Asia/Seoul",
};

const concernInput = {
  ...baseInput,
  concern: "어떤 선택을 먼저 정리할지 살펴보고 있어요.",
};

const mockContext = {
  version: "guardian-fortune.v1",
  inputSummary: {
    hasBirthTime: true,
    hasBirthPlace: false,
    calendarType: "solar",
    topic: "daily",
    category: "saju",
    mode: "yeoni",
    targetDate: "2026-08-02",
    locale: "ko-KR",
    hasConcern: false,
  },
  availableSystems: ["saju"],
  unavailableClaims: ["ziwei.birth_time_required"],
  saju: {
    dayMaster: "synthetic-day-master",
    currentFlowSummary: "synthetic current flow",
  },
  tarot: {
    spreadType: "one_card",
    cards: [{ name: "synthetic card", orientation: "upright", meaningSummary: "synthetic meaning" }],
    symbolicMessage: "synthetic symbolic message",
  },
  integratedInsight: {
    openingHook: "synthetic opening hook",
    currentTheme: "synthetic theme",
    likelyConcern: "synthetic concern pattern",
    adviceDirection: "synthetic advice",
    cautionPattern: "synthetic caution",
    luckyActionHint: "synthetic action",
    premiumBridge: "synthetic bridge",
    evidenceKeys: ["saju.dayMaster", "tarot.cards"],
  },
  safetyConstraints: ["synthetic constraint"],
};

module.exports = {
  baseInput,
  birthPlace,
  birthTimeUnknownInput,
  concernInput,
  mockContext,
};
