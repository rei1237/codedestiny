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
  userBirthDate: string;
  biasBirthDate: string;
  totalScore: number;
  emotionalScore: number;
  fandomScore: number;
  longTermScore: number;
  supportStyleScore: number;
  userEnergyType: string;
  biasEnergyType: string;
  connectionKeyword: string[];
  biasPersonalityReport: string;
  compatibilityReport: string;
  energyConnectionReport: string;
  oneLineDestinyMessage: string;
  todayMission: string;
  destinyId: string;
  issuedAt: string;
  cardSvg: string;
  themeLabel: string;
  biasMood: string;
  relationMood: string;
};
