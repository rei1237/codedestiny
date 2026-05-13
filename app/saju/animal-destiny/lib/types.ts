export type StemKo = "갑" | "을" | "병" | "정" | "무" | "기" | "경" | "신" | "임" | "계";

export type BranchKo = "자" | "축" | "인" | "묘" | "진" | "사" | "오" | "미" | "신" | "유" | "술" | "해";

export type TwelveStage =
  | "장생"
  | "목욕"
  | "관대"
  | "건록"
  | "제왕"
  | "쇠"
  | "병"
  | "사"
  | "묘"
  | "절"
  | "태"
  | "양";

export type AnimalId =
  | "cheetah"
  | "monkey"
  | "black-panther"
  | "koala"
  | "tiger"
  | "raccoon"
  | "rhino"
  | "elephant"
  | "sheep"
  | "pegasus"
  | "wolf"
  | "fawn";

export interface AnimalDestinyData {
  id: AnimalId;
  saju_stage: TwelveStage;
  stage_hanja: string;
  animal_ko: string;
  animal_en: string;
  title: string;
  short_copy: string;
  description: string[];
  personality: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    hidden_side: string;
  };
  love: {
    style: string;
    attraction_point: string;
    weakness_in_love: string;
    best_date_mood: string;
    advice: string;
  };
  career: {
    talent: string;
    recommended_fields: string[];
    work_style: string;
    money_style: string;
    advice: string;
  };
  luck_essentials: {
    food: string;
    item: string;
    color: string;
    place: string;
  };
  compatibility: {
    best: {
      animal_id: AnimalId;
      reason: string;
    };
    good: {
      animal_id: AnimalId;
      reason: string;
    };
    challenging: {
      animal_id: AnimalId;
      reason: string;
    };
    worst: {
      animal_id: AnimalId;
      reason: string;
    };
  };
  game_stats: {
    power: number;
    charm: number;
    logic: number;
    luck: number;
    social: number;
  };
  tamagotchi: {
    favorite_food: string;
    growth_message: string;
    care_tip: string;
    mood_when_happy: string;
    mood_when_tired: string;
  };
  share_card: {
    badge: string;
    headline: string;
    quote: string;
    hashtags: string[];
  };
}

export interface AnimalDestinyInput {
  name?: string;
  birthDate: string;
  birthTime?: string;
  gender: "male" | "female" | "unknown";
  calendarType?: "solar" | "lunar";
  lunarLeap?: boolean;
}

export interface TwelveStagePillars {
  primary?: TwelveStage;
  year?: TwelveStage;
  month?: TwelveStage;
  day?: TwelveStage;
  hour?: TwelveStage;
}

export interface AnimalCompatibilityResult {
  score: number;
  relationType: "환상" | "좋음" | "긴장" | "주의";
  summary: string;
  goodPoints: string[];
  clashPoints: string[];
  tips: string[];
}

export interface AnimalNarrativeInsights {
  heroLine: string;
  stageEvidence: string;
  statsLine: string;
  personalityLine: string;
  loveLine: string;
  careerLine: string;
  luckLine: string;
}

export interface PartnerResult {
  input: AnimalDestinyInput | null;
  animalId: AnimalId | null;
  animalData: AnimalDestinyData | null;
  primaryStage: TwelveStage | null;
  score: number | null;
  relationType: string | null;
  summary: string | null;
  goodPoints: string[];
  clashPoints: string[];
  tips: string[];
  stageEvidence: string | null;
}

export type SajuEngineResult = Record<string, unknown>;
