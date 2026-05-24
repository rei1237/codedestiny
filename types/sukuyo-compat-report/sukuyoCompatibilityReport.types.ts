export type SukuyoChapterId =
  | "I"
  | "II"
  | "III"
  | "IV"
  | "V"
  | "VI"
  | "VII"
  | "VIII"
  | "IX"
  | "X"
  | "XI"
  | "XII"
  | "XIII"
  | "XIV"
  | "XV"
  | "XVI";

export type SukuyoReportMode = "compatibility";

export interface SukuyoPersonInput {
  name: string;
  gender?: "F" | "M" | "";
  birthDate: string;
  birthTime?: string;
  calendarType: "solar" | "lunar" | "lunar_leap";
  timezone?: string;
}

export interface SukuyoPersonCore {
  mansionNameKo: string;
  mansionIndex: number;
  direction?: string;
  element?: string;
  coreKeyword?: string;
}

export interface SukuyoCompatibilityRawData {
  relationType: string;
  relationRoleA?: string;
  relationRoleB?: string;
  distanceType: "near" | "middle" | "far" | "same" | "unknown";
  distanceForward?: number;
  distanceReverse?: number;
  distanceShortest?: number;
  baseScore?: number;
  attractionScore?: number;
  stabilityScore?: number;
  conflictScore?: number;
  longTermScore?: number;
}

export interface SukuyoChapterCommon {
  chapterId: SukuyoChapterId;
  headline: string;
  warnings: string[];
}

export interface SukuyoCh01SummaryData extends SukuyoChapterCommon {
  chapterId: "I";
  categories: {
    profileA: string;
    profileB: string;
    relationTypeSummary: string;
    distanceSummary: string;
    totalStrength: string;
    oneLineReview: string;
  };
}

export interface SukuyoCh02NatureData extends SukuyoChapterCommon {
  chapterId: "II";
  categories: {
    personAEssence: string;
    personBEssence: string;
    temperamentGap: string;
    unfamiliarPoints: string;
    attractionPoints: string;
  };
}

export interface SukuyoCh03RelationTypeData extends SukuyoChapterCommon {
  chapterId: "III";
  categories: {
    relationTypeCore: string;
    roleDynamics: string;
    emotionalPattern: string;
    conflictTrigger: string;
    operationStrategy: string;
  };
}

export interface SukuyoCh04DistanceData extends SukuyoChapterCommon {
  chapterId: "IV";
  categories: {
    distanceType: string;
    attractionEffect: string;
    stabilityEffect: string;
    riskEffect: string;
    distanceControl: string;
  };
}

export interface SukuyoCh05FirstAttractionData extends SukuyoChapterCommon {
  chapterId: "V";
  categories: {
    firstImpression: string;
    instinctivePull: string;
    fateSignal: string;
    misunderstandingRisk: string;
    healthyApproach: string;
  };
}

export interface SukuyoCh06EmotionData extends SukuyoChapterCommon {
  chapterId: "VI";
  categories: {
    emotionalFlowA: string;
    emotionalFlowB: string;
    mismatchPoint: string;
    recoveryDialogue: string;
    stabilizationRule: string;
  };
}

export interface SukuyoCh07LoveData extends SukuyoChapterCommon {
  chapterId: "VII";
  categories: {
    datingFlow: string;
    contactStyle: string;
    affectionLanguage: string;
    jealousyBoundary: string;
    longTermCondition: string;
  };
}

export interface SukuyoCh08MarriageData extends SukuyoChapterCommon {
  chapterId: "VIII";
  categories: {
    marriagePotential: string;
    lifeStyleFit: string;
    financeFit: string;
    familyIssueFit: string;
    preMarriageChecklist: string;
  };
}

export interface SukuyoCh09ConflictData extends SukuyoChapterCommon {
  chapterId: "IX";
  categories: {
    coreConflict: string;
    escalationPattern: string;
    trustBreakPoint: string;
    deescalationDialogue: string;
    repairProtocol: string;
  };
}

export interface SukuyoCh10RiskPairData extends SukuyoChapterCommon {
  chapterId: "X";
  categories: {
    riskRelationFlag: string;
    attractionVsDamage: string;
    weakRole: string;
    stopSignal: string;
    safeDistanceRule: string;
  };
}

export interface SukuyoCh11LongBondData extends SukuyoChapterCommon {
  chapterId: "XI";
  categories: {
    longBondType: string;
    growthCondition: string;
    fatiguePattern: string;
    sustainableRule: string;
    maturityStrategy: string;
  };
}

export interface SukuyoCh12IntimacyData extends SukuyoChapterCommon {
  chapterId: "XII";
  categories: {
    bodyChemistry: string;
    emotionalIntimacy: string;
    paceGap: string;
    boundaryRule: string;
    warmRoutine: string;
  };
}

export interface SukuyoCh13ReunionBreakupData extends SukuyoChapterCommon {
  chapterId: "XIII";
  categories: {
    breakupRisk: string;
    lingeringSide: string;
    reunionChance: string;
    reunionCondition: string;
    closureStrategy: string;
  };
}

export interface SukuyoCh14TimingData extends SukuyoChapterCommon {
  chapterId: "XIV";
  categories: {
    strengthenWindow: string;
    cautionWindow: string;
    commitTiming: string;
    conflictTiming: string;
    timingPlaybook: string;
  };
}

export interface SukuyoCh15RealityData extends SukuyoChapterCommon {
  chapterId: "XV";
  categories: {
    moneyReality: string;
    workReality: string;
    familyReality: string;
    lifePatternReality: string;
    livingRule: string;
  };
}

export interface SukuyoCh16FinalData extends SukuyoChapterCommon {
  chapterId: "XVI";
  categories: {
    totalSummary: string;
    biggestStrength: string;
    biggestRisk: string;
    finalStrategy: string;
    finalKeyword: string;
  };
}

export type SukuyoRecordChapterData = SukuyoChapterCommon & {
  categories: Record<string, string>;
};

export type SukuyoPlaceholderChapterData =
  | SukuyoCh03RelationTypeData
  | SukuyoCh04DistanceData
  | SukuyoCh05FirstAttractionData
  | SukuyoCh06EmotionData
  | SukuyoCh07LoveData
  | SukuyoCh08MarriageData
  | SukuyoCh09ConflictData
  | SukuyoCh10RiskPairData
  | SukuyoCh11LongBondData
  | SukuyoCh12IntimacyData
  | SukuyoCh13ReunionBreakupData
  | SukuyoCh14TimingData
  | SukuyoCh15RealityData
  | SukuyoCh16FinalData;

export type SukuyoCompatibilityChapterMap = {
  I: SukuyoCh01SummaryData;
  II: SukuyoCh02NatureData;
  III: SukuyoCh03RelationTypeData;
  IV: SukuyoCh04DistanceData;
  V: SukuyoCh05FirstAttractionData;
  VI: SukuyoCh06EmotionData;
  VII: SukuyoCh07LoveData;
  VIII: SukuyoCh08MarriageData;
  IX: SukuyoCh09ConflictData;
  X: SukuyoCh10RiskPairData;
  XI: SukuyoCh11LongBondData;
  XII: SukuyoCh12IntimacyData;
  XIII: SukuyoCh13ReunionBreakupData;
  XIV: SukuyoCh14TimingData;
  XV: SukuyoCh15RealityData;
  XVI: SukuyoCh16FinalData;
};

export interface SukuyoCompatibilityReportData {
  mode: SukuyoReportMode;
  chapterOrder: readonly SukuyoChapterId[];
  personA: {
    input: SukuyoPersonInput;
    core: SukuyoPersonCore;
  };
  personB: {
    input: SukuyoPersonInput;
    core: SukuyoPersonCore;
  };
  raw: SukuyoCompatibilityRawData;
  chapters: SukuyoCompatibilityChapterMap;
  integrity: {
    antiLoopHash: string;
    fallbackUsed: boolean;
    missingFields: string[];
    generatedAt: string;
  };
}
