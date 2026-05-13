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
};
