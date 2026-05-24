export type AstroChapterId = "I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII" | "IX" | "X" | "XI" | "XII";

export type ChapterSectionMap<K extends string> = {
  [P in K]: string;
};

export type ChapterData<K extends string> = {
  id: AstroChapterId;
  title: string;
  sections: ChapterSectionMap<K>;
  sectionOrder: K[];
  summary?: string;
};

export type Chapter1IntroKey =
  | "birthChartBasics"
  | "sunMoonAscSummary"
  | "planetDistributionSummary"
  | "houseDistributionSummary"
  | "elementDistribution"
  | "modalityDistribution"
  | "majorAspectSummary"
  | "overallTemperament"
  | "coreLifeTheme"
  | "strengthWeaknessSummary";

export type Chapter2BigThreeKey =
  | "sunSign"
  | "sunHouse"
  | "moonSign"
  | "moonHouse"
  | "ascendant"
  | "ascRuler"
  | "sunMoonRelation"
  | "moonAscRelation"
  | "outerInnerGap"
  | "bigThreeDiagnosis";

export type Chapter3TenPlanetsKey =
  | "sunPurpose"
  | "moonUnconscious"
  | "mercuryThinking"
  | "venusAttraction"
  | "marsDrive"
  | "jupiterExpansion"
  | "saturnLimits"
  | "uranusChange"
  | "neptuneSpirituality"
  | "plutoTransformation"
  | "planetBySign"
  | "planetByHouse"
  | "personalPlanetSynthesis"
  | "socialPlanetSynthesis"
  | "generationalPlanetSynthesis";

export type Chapter4HousesKey =
  | "house1"
  | "house2"
  | "house3"
  | "house4"
  | "house5"
  | "house6"
  | "house7"
  | "house8"
  | "house9"
  | "house10"
  | "house11"
  | "house12"
  | "emptyHouses"
  | "concentratedHouses"
  | "dominantLifeAreas";

export type Chapter5ElementsModesKey =
  | "fire"
  | "earth"
  | "air"
  | "water"
  | "missingElements"
  | "excessElements"
  | "cardinal"
  | "fixed"
  | "mutable"
  | "elementModeCombinations"
  | "personalityBalance"
  | "realityResponse"
  | "emotionProcessing"
  | "relationshipReaction"
  | "lifeEnergyFlow";

export type Chapter6AspectsKey =
  | "conjunction"
  | "opposition"
  | "square"
  | "trine"
  | "sextile"
  | "personalAspects"
  | "socialAspects"
  | "generationalAspects"
  | "strongestTalent"
  | "deepestConflict"
  | "repeatingPattern"
  | "relationshipAspect"
  | "careerAspect"
  | "emotionalTrigger"
  | "aspectDiagnosis";

export type Chapter7LoveKey =
  | "venusSign"
  | "venusHouse"
  | "marsSign"
  | "marsHouse"
  | "house5Love"
  | "house7Marriage"
  | "house8Intimacy"
  | "datingStyle"
  | "attractedPartnerType"
  | "charmPoint"
  | "repeatingRelationshipIssue"
  | "marriageAptitude"
  | "longTermStability"
  | "avoidPattern"
  | "stabilizingStrategy";

export type Chapter8CareerKey =
  | "house2Finance"
  | "house6Work"
  | "house10Career"
  | "mc"
  | "mcRuler"
  | "sunCareer"
  | "saturnCareer"
  | "jupiterGrowth"
  | "moneyMakingStyle"
  | "careerAptitude"
  | "orgVsIndependent"
  | "businessLuck"
  | "honorLuck"
  | "careerShiftPoint"
  | "successStrategy";

export type Chapter9PsychologyKey =
  | "moonPsychology"
  | "house4Root"
  | "house8Wound"
  | "house12Unconscious"
  | "saturnFear"
  | "plutoObsessive"
  | "neptuneConfusion"
  | "repeatingEmotionPattern"
  | "anxietyAvoidance"
  | "innerDeficit"
  | "defenseMechanism"
  | "healingNeededArea"
  | "recoveryEnvironment"
  | "selfAcceptancePoint"
  | "innerGrowthStrategy";

export type Chapter10HealthKey =
  | "house1Constitution"
  | "house6Habit"
  | "moonBodyRhythm"
  | "marsEnergy"
  | "saturnFatigue"
  | "stressResponse"
  | "burnoutPattern"
  | "sleepRecovery"
  | "dailyRoutineAptitude"
  | "avoidLifestyle"
  | "healthPoint"
  | "emotionBodyLink"
  | "energyRecovery"
  | "longTermHealth"
  | "lifeBalanceDesign";

export type Chapter11TimingKey =
  | "currentTransitCore"
  | "majorTransit"
  | "jupiterTransit"
  | "saturnTransit"
  | "uranusTransit"
  | "neptuneTransit"
  | "plutoTransit"
  | "progressedMoon"
  | "solarReturnSummary"
  | "yearCoreTheme"
  | "yearOpportunity"
  | "yearCaution"
  | "relationshipFlow"
  | "careerFlow"
  | "healthFlow";

export type Chapter12FinalKey =
  | "coreSummary"
  | "strongestTalent"
  | "mostImportantTask"
  | "repeatingDestinyPattern"
  | "relationshipCoreStrategy"
  | "careerCoreStrategy"
  | "wealthUsage"
  | "psychologicalWeaknessManagement"
  | "luckyEnvironment"
  | "avoidChoice"
  | "longTermGrowthDirection"
  | "yearExecutionStrategy"
  | "lifeRoadmap"
  | "finalAdvice"
  | "oneLineDestinyKeyword";

export type AstroPremiumReportData = {
  reportType: "westernAstrologyPremium";
  mode: "personal";
  generatedAt: string;
  profile: {
    name?: string;
    birthDate: string;
    birthTime?: string;
    location?: string;
    timeUnknown?: boolean;
  };
  chapters: {
    I: ChapterData<Chapter1IntroKey>;
    II: ChapterData<Chapter2BigThreeKey>;
    III: ChapterData<Chapter3TenPlanetsKey>;
    IV: ChapterData<Chapter4HousesKey>;
    V: ChapterData<Chapter5ElementsModesKey>;
    VI: ChapterData<Chapter6AspectsKey>;
    VII: ChapterData<Chapter7LoveKey>;
    VIII: ChapterData<Chapter8CareerKey>;
    IX: ChapterData<Chapter9PsychologyKey>;
    X: ChapterData<Chapter10HealthKey>;
    XI: ChapterData<Chapter11TimingKey>;
    XII: ChapterData<Chapter12FinalKey>;
  };
};
