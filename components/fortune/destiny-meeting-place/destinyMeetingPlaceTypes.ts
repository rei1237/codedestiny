export type DestinyElement = "wood" | "fire" | "earth" | "metal" | "water";

export type DestinyPlaceType =
  | "city"
  | "nature"
  | "cafe"
  | "culture"
  | "travel"
  | "spiritual"
  | "water"
  | "mountain"
  | "night"
  | "daily";

export type DestinyMeetingPlaceResult = {
  summary: {
    title: string;
    oneLine: string;
    mainEnergy: string;
    romanceKeyword: string;
    placeTheme: string;
  };
  energyProfile: {
    dayMaster: string;
    usefulElements: DestinyElement[];
    avoidElements: DestinyElement[];
    strongestElement?: DestinyElement;
    weakestElement?: DestinyElement;
    relationshipPattern: string;
    meetingStyle: string;
  };
  recommendedPlaces: Array<{
    rank: number;
    name: string;
    type: DestinyPlaceType;
    element: DestinyElement;
    sceneDescription?: string;
    emotionalHook?: string;
    conversationOpener?: string;
    reason: string;
    actionTip: string;
    romancePotential: number;
  }>;
  recommendedCountries: Array<{
    rank: number;
    country: string;
    cities: string[];
    element: DestinyElement;
    reason: string;
    bestFor: string;
    travelMood: string;
  }>;
  meetingPlaceTypes: Array<{
    title: string;
    description: string;
    whyItFits: string;
    examplePlaces: string[];
    caution: string;
  }>;
  luckyTiming: {
    bestSeasons: string[];
    bestMonths: string[];
    bestDays?: string[];
    bestTimeOfDay: string[];
    explanation: string;
  };
  destinyItems: Array<{
    item: string;
    element: DestinyElement;
    usage: string;
    reason: string;
  }>;
  stylingGuide: {
    colors: string[];
    mood: string;
    outfit: string;
    fragrance?: string;
    accessory?: string;
  };
  avoidGuide: {
    avoidPlaces: string[];
    avoidTiming: string[];
    avoidPatterns: string[];
    reason: string;
  };
  practicalPlan: {
    todayAction: string;
    thisWeekAction: string;
    thisMonthAction: string;
    travelAction: string;
    toneReminder?: string;
    microActions?: string[];
  };
};

export type MeetingEnergyProfile = {
  seed: number;
  dayMasterLabel: string;
  dayMasterStem: string;
  usefulElements: DestinyElement[];
  avoidElements: DestinyElement[];
  strongestElement?: DestinyElement;
  weakestElement?: DestinyElement;
  primaryElement: DestinyElement;
  secondaryElement: DestinyElement;
  relationshipPattern: string;
  meetingStyle: string;
  dominantTenStarGroup: "expression" | "wealth" | "officer" | "resource" | "peer";
  sinsalSignals: {
    dohwa: boolean;
    hongyeom: boolean;
    hwagae: boolean;
    yeokma: boolean;
  };
};
