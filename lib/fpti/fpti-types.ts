export type FiveElementKey = "wood" | "fire" | "earth" | "metal" | "water";

export type FptiFormInput = {
  name: string;
  gender?: "M" | "F" | "OTHER";
  birthDate: string;
  calendarType: "solar" | "lunar";
  birthTime: string;
  timeUnknown: boolean;
  birthRegion?: string;
};

export type FptiSourceData = {
  pillars: {
    year: string;
    month: string;
    day: string;
    hour?: string;
  };
  dayMaster: string;
  dayMasterElement: FiveElementKey;
  fiveElements: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  tenGods: {
    biGyeon: number;
    geopJae: number;
    sikSin: number;
    sangGwan: number;
    jeongJae: number;
    pyeonJae: number;
    jeongGwan: number;
    pyeonGwan: number;
    jeongIn: number;
    pyeonIn: number;
  };
  season: string;
  monthBranch: string;
  usefulGods?: string[];
  favorableElements?: string[];
  unfavorableElements?: string[];
  strengthScore?: number;
  structureType?: string;
};

export type FptiAxisCodes = {
  temperament: "W" | "F" | "E" | "M" | "A";
  behavior: "C" | "R" | "W" | "S" | "I";
  relation: "O" | "D" | "L" | "F";
  strategy: "B" | "G" | "P" | "H" | "S";
};

export type FptiAnalysisResult = {
  code: string;
  typeName: string;
  oneLiner: string;
  summary: string;
  confidence: number;
  reliabilityMessage: string;
  fallbackUsed: boolean;
  axis: FptiAxisCodes;
  axisMeanings: {
    temperament: string;
    behavior: string;
    relation: string;
    strategy: string;
  };
  source: FptiSourceData;
  percentageElements: Record<FiveElementKey, number>;
  tenGodGroupScores: {
    expression: number;
    officer: number;
    wealth: number;
    resource: number;
    peer: number;
  };
  strengths: string[];
  weaknesses: string[];
  relationStyle: {
    key: "Open" | "Deep" | "Loyal" | "Free";
    description: string;
  };
  growthTips: string[];
  careerTips: string[];
  loveTips: string[];
  goodMatch: string[];
  cautionMatch: string[];
  evidence: {
    dayMaster: string;
    monthBranch: string;
    strongElements: string[];
    strongTenGods: string[];
    recommendedDirection: string;
  };
};
