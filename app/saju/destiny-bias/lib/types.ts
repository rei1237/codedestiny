import type { FandomProfile } from "../engine/fandomProfileEngine";

export type PersonInputState = {
  name: string;
  birthDateInput: string;
  birthTimeInput: string;
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

export type DestinyBiasResultViewModel = {
  userName: string;
  biasName: string;
  linkedArtist: string;
  userBirthDate: string;
  biasBirthDate: string;
  totalScore: number;
  emotionalScore: number;
  fandomScore: number;
  longTermScore: number;
  supportStyleScore: number;
  userEnergyType: string;
  biasEnergyType: string;
  auraType: string;
  auraMaterial: string;
  destinyGrade: string;
  gradeTitle: string;
  pairingAlias: string;
  energyColor: string;
  editionLabel: string;
  moodKeywords: string[];
  matchingTags: string[];
  connectionKeyword: string[];
  chemistrySummary: string;
  compatibilityDetail: string;
  energyConnectionDetail: string;
  biasPersonalityReport: string;
  compatibilityReport: string;
  energyConnectionReport: string;
  oneLineDestinyMessage: string;
  cardCaption: string;
  stageAuraComment: string;
  destinySignal: string;
  fansignMessage: string;
  stageChemistryKeywords: string[];
  todayMission: string;
  cheerPoint: string;
  biasEnergySvg: string;
  biasEnergySummary: string;
  destinyId: string;
  issuedAt: string;
  cardSvg: string;
  themeLabel: string;
  biasMood: string;
  relationMood: string;
  chemistryType: string;
  birthDataStatus: {
    user: "complete" | "dateOnly" | "unknownTime";
    favorite: "complete" | "dateOnly" | "unknownTime";
  };
  sajuSignals: {
    dayMasterRelation?: string;
    dayBranchRelation?: string;
    fiveElementBalance?: string;
    tenGodRelation?: string;
    harmonySignals: string[];
    conflictSignals: string[];
    charmSignals: string[];
    longTermSignals: string[];
  };
  bottomNotice: string;
  elementDistribution: {
    user: Record<"wood" | "fire" | "earth" | "metal" | "water", number>;
    favorite: Record<"wood" | "fire" | "earth" | "metal" | "water", number>;
  };
  fandomProfile: FandomProfile;
  mzLayer: {
    relationMbti: { type: string; desc: string };
    pastLife: { title: string; story: string };
    gradeMeme: string;
    hashtags: string[];
  };
  detailedTabs: Array<{
    id: "chemi" | "element" | "dayMaster" | "branch" | "booster";
    label: string;
    shortLabel: string;
    title: string;
    keywords: string[];
    sections: Array<{
      title: string;
      usedSignals: string[];
      text: string;
      action?: string;
    }>;
  }>;
};
