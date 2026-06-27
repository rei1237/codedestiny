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
  };
  saju: {
    available: boolean;
    title: string;
    summary: string;
    keyPoints: string[];
    caution?: string;
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
