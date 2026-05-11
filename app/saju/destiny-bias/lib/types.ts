export type PersonInputState = {
  name: string;
  gender: "F" | "M" | "OTHER";
  calendarType: "solar" | "lunar" | "lunar_leap";
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  unknownTime: boolean;
};

export type ThemePreset = {
  key: string;
  name: string;
  premium: boolean;
  palette?: {
    bg?: string;
    card?: string;
    accent?: string;
    accentSoft?: string;
    text?: string;
  };
};

export type DestinyBiasApiResult = {
  relation?: string;
  relationLabel?: string;
  totalScore?: number;
  grade?: string;
  card?: {
    title?: string;
    headline?: string;
    summary?: string;
    themeKey?: string;
  };
  role?: {
    dominantTenGod?: string;
    title?: string;
    userTopElements?: string[];
  };
  reportText?: string;
  canonical?: Record<string, any>;
  sharePayload?: {
    title?: string;
    subtitle?: string;
    hashtags?: string[];
  };
  themes?: ThemePreset[];
  gates?: {
    isLoggedIn?: boolean;
    canUsePremiumTheme?: boolean;
    canSaveCollection?: boolean;
    profileTier?: string;
    freeCollectionLimit?: number;
    points?: number;
  };
  pricing?: {
    featureKey?: string;
    perUseCoins?: number;
    chargedCoins?: number;
  };
  warnings?: string[];
};

export type DestinyBiasResultViewModel = {
  score: number;
  grade: string;
  gradeLabel: string;
  mainCatchphrase: string;
  userEnergy: {
    dayMaster: string;
    mainElement: string;
    fandomPosition: string;
    description: string;
  };
  biasEnergy: {
    name: string;
    dayMaster?: string;
    dominantElement?: string;
    missingElements: string[];
    description: string;
  };
  synergy: {
    relationType: "상생" | "상극" | "동일오행" | "중립";
    title: string;
    description: string;
  };
  yongshinMatch: {
    title: string;
    matchedElements: string[];
    description: string;
  };
  todayAction: {
    keyword: string;
    actions: string[];
    warning: string;
  };
  sats: {
    title: string;
    script: string;
  };
  card: {
    theme: string;
    title: string;
    subtitle: string;
    hashtags: string[];
  };
  rawReport: string;
};

export type SavedCard = {
  id: string;
  title: string;
  headline: string;
  summary: string;
  themeKey: string;
  score: number;
  grade: string;
  reportText: string;
  createdAt?: string;
};
