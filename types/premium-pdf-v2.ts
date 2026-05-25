export type PremiumPdfElementKey = "wood" | "fire" | "earth" | "metal" | "water";

export type PillarData = {
  stem: string;
  branch: string;
  ganji: string;
  stemElement?: string;
  branchElement?: string;
  tenGod?: string;
};

export type LuckCycle = {
  ganji?: string;
  stem?: string;
  branch?: string;
  ageRange?: string;
  startAge?: number;
  endAge?: number;
  [key: string]: unknown;
};

export type YearlyLuck = {
  year: number;
  ganji?: string;
  stem?: string;
  branch?: string;
  tenGod?: string;
  monthlyLuck?: unknown[];
  [key: string]: unknown;
};

export type ZiweiLuckCycle = {
  label?: string;
  range?: string;
  palaceKey?: string;
  palaceName?: string;
  [key: string]: unknown;
};

export type ZiweiAnnualLuck = {
  year?: number;
  ganji?: string;
  summary?: string;
  monthly?: unknown[];
  [key: string]: unknown;
};

export type ZiweiStarData = {
  name: string;
  strengthRaw?: string;
  strengthSymbol: "◎" | "○" | "△" | "×";
  meaning: string;
};

export type ZiweiPalaceData = {
  palaceName: string;
  branch: string;
  mainStars: ZiweiStarData[];
  minorStars: ZiweiStarData[];
  auxiliaryStars?: ZiweiStarData[];
  transformations?: string[];
  strengthSummary: string;
};

export type ZiweiPremiumPdfData = {
  profile: {
    name?: string;
    gender?: string;
    birthDate: string;
    birthTime?: string;
    lunarDate?: string;
  };

  chart: {
    mingGong: string;
    shenGong: string;
    bodyMaster?: string;
    lifeMaster?: string;
    fiveElementClass?: string;
  };

  palaces: ZiweiPalaceData[];

  fourTransformations: {
    huaLu?: string;
    huaQuan?: string;
    huaKe?: string;
    huaJi?: string;
    byStem?: string;
  };

  starStrengthLegend: {
    "◎": "묘/왕 수준의 강한 힘";
    "○": "평/득 수준의 안정된 힘";
    "△": "약하거나 조건부로 작동하는 힘";
    "×": "함/불리한 배치";
  };

  luckCycles: {
    decadeLuck?: ZiweiLuckCycle[];
    annualLuck?: ZiweiAnnualLuck[];
  };
};

export type SukyoDailyLuck = {
  date?: string;
  score?: number;
  summary?: string;
  [key: string]: unknown;
};

export type SukyoMonthlyLuck = {
  month?: number;
  score?: number;
  summary?: string;
  [key: string]: unknown;
};

export type SukyoYearlyLuck = {
  year?: number;
  score?: number;
  summary?: string;
  [key: string]: unknown;
};

export type SukyoPremiumPdfData = {
  profile: {
    name?: string;
    birthDate: string;
    birthTime?: string;
    lunarDate?: string;
  };

  "宿曜": {
    birthMansion: string;
    birthMansionIndex: number;
    mansionGroup: string;
    guardianDeity?: string;
    coreNature: string;
  };

  mansionAnalysis: {
    personality: string;
    relationshipStyle: string;
    workStyle: string;
    wealthStyle: string;
    weakness: string;
    growthAdvice: string;
  };

  compatibility?: {
    targetName?: string;
    targetMansion?: string;
    relationType?: string;
    distance?: number;
    summary?: string;
  };

  fortuneCycles: {
    daily?: SukyoDailyLuck[];
    monthly?: SukyoMonthlyLuck[];
    yearly?: SukyoYearlyLuck[];
  };
};

export type VedicPlanetData = {
  name: string;
  sign?: string;
  degree?: number;
  house?: number;
  retrograde?: boolean;
  nakshatra?: string;
  dignity?: string;
  [key: string]: unknown;
};

export type VedicHouseData = {
  house?: number;
  sign?: string;
  cuspDegree?: number;
  planets?: unknown[];
  [key: string]: unknown;
};

export type VedicDashaPeriod = {
  mahadasha?: string;
  antardasha?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
};

export type VedicPremiumPdfData = {
  profile: {
    name?: string;
    gender?: string;
    birthDate: string;
    birthTime: string;
    location?: string;
  };

  chart: {
    lagna: string;
    moonSign: string;
    sunSign: string;
    nakshatra?: string;
    atmakaraka?: string;
    planets: VedicPlanetData[];
    houses: VedicHouseData[];
  };

  dasha: {
    currentDasha?: string;
    currentAntardasha?: string;
    timeline: VedicDashaPeriod[];
  };

  analysis: {
    personality: string;
    karmaTheme: string;
    relationship: string;
    career: string;
    wealth: string;
    spiritualGrowth: string;
  };
};

export type AstrologyPlanetData = {
  name: string;
  sign?: string;
  degree?: number;
  house?: number;
  retrograde?: boolean;
  [key: string]: unknown;
};

export type AstrologyHouseData = {
  house?: number;
  sign?: string;
  cuspDegree?: number;
  planets?: unknown[];
  [key: string]: unknown;
};

export type AstrologyAspectData = {
  planetA?: string;
  planetB?: string;
  type?: string;
  orb?: number;
  [key: string]: unknown;
};

export type AstrologyTransitData = {
  planet?: string;
  sign?: string;
  house?: number;
  aspect?: string;
  [key: string]: unknown;
};

export type AstrologyPremiumPdfData = {
  profile: {
    name?: string;
    birthDate: string;
    birthTime: string;
    location?: string;
  };

  natalChart: {
    sunSign: string;
    moonSign: string;
    ascendant: string;
    planets: AstrologyPlanetData[];
    houses: AstrologyHouseData[];
    aspects: AstrologyAspectData[];
  };

  analysis: {
    personality: string;
    emotionPattern: string;
    lovePattern: string;
    careerPattern: string;
    lifeTheme: string;
  };

  transits?: {
    currentTransits: AstrologyTransitData[];
    yearlyTheme?: string;
  };
};

export type SajuLifeBookPdfData = {
  profile: {
    name?: string;
    gender?: string;
    birthDate: string;
    birthTime?: string;
    calendarType: "solar" | "lunar";
  };

  chart: {
    yearPillar: PillarData;
    monthPillar: PillarData;
    dayPillar: PillarData;
    hourPillar?: PillarData;
    dayMaster: string;
    tenGods: Record<string, string>;
    twelveStages: Record<string, string>;
    hiddenStems: Record<string, string[]>;
  };

  elements: {
    scores: Record<PremiumPdfElementKey, number>;
    dominantElements: string[];
    weakElements: string[];
    balanceSummary: string;
  };

  usefulGods: {
    yongshin?: string;
    heeshin?: string;
    gishin?: string;
    analysisBasis: string;
  };

  personality: {
    coreTemperament: string[];
    strengths: string[];
    weaknesses: string[];
    relationshipPattern: string;
    workPattern: string;
  };

  luckCycles: {
    daewoon: LuckCycle[];
    yearlyLuck: YearlyLuck[];
  };

  lifeThemes: {
    career: string;
    wealth: string;
    relationship: string;
    family: string;
    health: string;
    growth: string;
  };
};

export type SajuLoveSecretPdfData = {
  profile: {
    name?: string;
    gender?: string;
    birthDate: string;
    birthTime?: string;
    calendarType: "solar" | "lunar";
  };

  chart: {
    dayMaster: string;
    spousePalace: string;
    tenGods: Record<string, string>;
    relationshipStars: string[];
    peachBlossom?: string[];
    hongyeom?: string[];
    hwagae?: string[];
  };

  lovePattern: {
    attractionStyle: string;
    attachmentStyle: string;
    conflictPattern: string;
    expressionStyle: string;
    idealPartnerType: string;
  };

  datingAdvice: {
    strengthsInLove: string[];
    risksInLove: string[];
    communicationAdvice: string[];
    longTermRelationshipAdvice: string[];
  };

  luckCycles: {
    loveDaewoon: LuckCycle[];
    loveYearlyLuck: YearlyLuck[];
  };
};

export type PremiumPdfReportType =
  | "ziweiPremium"
  | "sookyoPremium"
  | "westernAstrologyPremium"
  | "vedicPremium"
  | "lifeBook"
  | "loveSecret"
  | "sajuNewYear";

export interface SubChapterData {
  chapterId: number;
  chapterKey: string;
  chapterTitle: string;
  requiredPaths: string[];
  requiredData: Record<string, unknown>;
  chapterContract: {
    purpose: string;
    requiredEvidence: string[];
    recommendedEvidence: string[];
    fallbackAngle: string;
    forbiddenTopics: string[];
    outputStyle: string;
  };
  signals: Record<string, unknown>;
  timing: Record<string, unknown>;
  actions: Record<string, unknown>;
}

export interface ReportPDFData<TCalculated = Record<string, unknown>> {
  reportId: string;
  reportType: PremiumPdfReportType | string;
  userId: string;
  inputHash: string;
  calculationVersion: string;
  createdAt: string;
  input: Record<string, unknown>;
  calculatedData: TCalculated;
  reportPayload: TCalculated;
  interpretationSeed: Record<string, unknown>;
  chapterData: Record<string, unknown>;
  chapterJsonById?: Record<string, SubChapterData>;
  diagnostics?: Record<string, unknown>;
  missingData?: string[];
  warnings?: string[];
  isCompleteForPdf?: boolean;
  completenessScore?: number;
  blockingReasons?: string[];
}

export type { AstroPremiumReportData } from "./astro-premium-report";
