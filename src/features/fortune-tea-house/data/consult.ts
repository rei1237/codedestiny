import type { TarotOrientation } from "./tarotCards";
import type { TenGodId } from "./tenGods";

export type TeaHouseEmotionTone = "pink" | "purple" | "blue" | "gold" | "green";

export type FortuneTeaHouseConsultRequest = {
  nickname?: string;
  concernTopic?: string;
  birthInfo?: string;
  birthDate?: string;
  birthTime?: string;
  gender?: string;
  calendarType?: "solar" | "lunar";
  selectedTeaCupId: string;
  selectedTeaCupName: string;
  selectedTeaCupTopic: string;
  question: string;
};

export type FortuneTeaHouseQuestionInput = {
  nickname?: string;
  concernTopic: string;
  birthInfo?: string;
  birthDate?: string;
  birthTime?: string;
  gender?: string;
  calendarType?: "solar" | "lunar";
  question: string;
};

export type FortuneTeaSajuTenGodSnapshot = {
  available: boolean;
  primaryTenGod?: TenGodId;
  secondaryTenGods?: TenGodId[];
  tenGodLabels?: string[];
  reason?: string;
  source: "existing-saju-engine" | "fallback" | "unavailable";
};

export type FortuneTeaSajuSnapshot = {
  available: boolean;
  dayMaster?: string;
  pillars?: {
    year?: string;
    month?: string;
    day?: string;
    hour?: string;
  };
  fiveElements?: Record<string, number>;
  tenGods?: string[];
  tenGodSnapshot?: FortuneTeaSajuTenGodSnapshot;
  strongElements?: string[];
  weakElements?: string[];
  usefulElements?: string[];
  coreSummary?: string;
  caution?: string;
};

export type FortuneTeaSajuPillarKey = "year" | "month" | "day" | "hour";

export type FortuneTeaSajuPillar = {
  key: FortuneTeaSajuPillarKey;
  label: string;
  ganji?: string;
  heavenlyStem?: string;
  earthlyBranch?: string;
  element?: string;
  tenGod?: string;
  available: boolean;
  note?: string;
};

export type FortuneTeaFiveElementKey = "wood" | "fire" | "earth" | "metal" | "water";

export type FortuneTeaFiveElementBalance = {
  key: FortuneTeaFiveElementKey;
  nameKo: string;
  value: number;
  strengthLabel: string;
  reading: string;
  tone: "green" | "rose" | "gold" | "silver" | "blue";
};

export type FortuneTeaSajuBirthSummary = {
  nickname: string;
  birthDate?: string;
  birthTime?: string;
  hasBirthTime: boolean;
  calendarType?: "solar" | "lunar";
  gender?: string;
};

export type FortuneTeaSajuTenGodReading = {
  id: TenGodId;
  nameKo: string;
  roleInTeaHouse: string;
  reading: string;
};

export type FortuneTeaSajuSecondaryTenGod = {
  id: TenGodId;
  nameKo: string;
  roleInTeaHouse: string;
};

export type FortuneTeaTarotSnapshot = {
  cardId: string;
  number: number;
  nameKo: string;
  nameEn: string;
  orientation: TarotOrientation;
  keywords: string[];
  meaning: string;
  topicReadingSeed?: string;
  source: "existing-ai-tarot" | "existing-card-data" | "fallback";
};

export type FortuneTeaHouseConsultResponse = {
  sessionTitle: string;
  questionSummary: string;
  teaCup: {
    id: string;
    name: string;
    topic: string;
    reading: string;
    resultPrelude?: string;
  };
  saju: {
    available: boolean;
    title: string;
    summary: string;
    keyPoints: string[];
    birthSummary?: FortuneTeaSajuBirthSummary;
    dayMaster?: string;
    dominantElements?: string[];
    pillars?: FortuneTeaSajuPillar[];
    fiveElements?: FortuneTeaFiveElementBalance[];
    primaryTenGod?: FortuneTeaSajuTenGodReading;
    secondaryTenGods?: FortuneTeaSajuSecondaryTenGod[];
    caution?: string;
    cautionReading?: string;
    actionPrescription?: string;
    tarotBridgeReady?: string;
    tenGodSnapshot?: FortuneTeaSajuTenGodSnapshot;
  };
  tarot: {
    cardId: string;
    number: number;
    nameEn: string;
    nameKo: string;
    orientation: TarotOrientation;
    keywords: string[];
    meaning: string;
    reading: string;
  };
  emotionAnalysis: Array<{
    label: string;
    value: number;
    description: string;
    tone: TeaHouseEmotionTone;
  }>;
  yeoniReading: {
    intro: string;
    main: string;
    advice: string;
    caution: string;
  };
  synthesis: {
    title: string;
    summary: string;
    sajuTarotBridge: string;
  };
  choiceSimulation: Array<{
    id: string;
    title: string;
    subtitle: string;
    result: string;
    caution: string;
  }>;
  actionPrescription: string;
  luckyKeywords: string[];
  closingLine: string;
};
