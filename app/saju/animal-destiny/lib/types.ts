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

export type TwelveStageKey =
  | "jangsaeng"
  | "mogyok"
  | "gwandae"
  | "geonrok"
  | "jewang"
  | "soe"
  | "byeong"
  | "sa"
  | "myo"
  | "jeol"
  | "tae"
  | "yang";

export type StageSource = "saju-engine" | "local-fallback";

export interface TwelveStageResult {
  key: TwelveStageKey;
  labelKo: TwelveStage;
  hanja: string;
  pillar: "year" | "month" | "day" | "hour";
  source: StageSource;
}

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

export type AnimalTwelveProfile = {
  stageKey: TwelveStageKey;
  stageLabel: TwelveStage;
  animalName: string;
  title: string;
  subtitle: string;
  keywords: string[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  symbolItems: string[];
  energyScores: {
    charm: number;
    drive: number;
    recovery: number;
    money: number;
    love: number;
    intuition: number;
  };
  personality: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    hiddenPattern: string;
    advice: string;
    paragraphs: string[];
  };
  love: {
    style: string;
    attractionPoint: string;
    weakPoint: string;
    advice: string;
    paragraphs: string[];
  };
  relationship: {
    friends: string;
    work: string;
    family: string;
    caution: string;
    bestFit: string;
  };
  career: {
    workStyle: string;
    goodFields: string[];
    avoidFields: string[];
    growthAdvice: string;
    moneyBoostCondition: string;
  };
  money: {
    moneyFlow: string;
    spendingPattern: string;
    savingAdvice: string;
    habitTip: string;
  };
  daily: {
    message: string;
    luckyAction: string;
    caution: string;
    luckyColor: string;
    luckyItem: string;
  };
};

export type StageCompatibility = {
  relationTemp: number;
  chemistryType: "환상" | "좋음" | "긴장" | "주의";
  summary: string;
  strengths: string[];
  clashes: string[];
  loveScore: number;
  friendScore: number;
  businessScore: number;
  advice: string;
};

export type AnimalTwelveResolvedResult = {
  ok: boolean;
  source: StageSource;
  sajuResult: SajuEngineResult | null;
  representativeStage: TwelveStageResult | null;
  allStages: TwelveStageResult[];
  profile: AnimalDestinyData | null;
  warning?: string;
  error?: string;
};

export interface AnimalDestinyData {
  stageKey: TwelveStageKey;
  stageLabel: TwelveStage;
  animalName: string;
  titleLine: string;
  subtitleLine: string;
  keywords: string[];
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  symbolItems: string[];
  energyScores: {
    charm: number;
    drive: number;
    recovery: number;
    money: number;
    love: number;
    intuition: number;
  };
  profile: AnimalTwelveProfile;
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
    stress_behavior: string;
    growth_direction: string;
  };
  love: {
    style: string;
    attraction_point: string;
    weakness_in_love: string;
    best_date_mood: string;
    advice: string;
    approach_style: string;
    attractive_type: string;
    recurring_pattern: string;
    breakup_recovery: string;
    long_term_tip: string;
  };
  career: {
    talent: string;
    recommended_fields: string[];
    work_style: string;
    money_style: string;
    advice: string;
    good_work_method: string;
    bad_work_environment: string;
    earning_method: string;
    aptitude_check: string;
  };
  wealth: {
    spending_style: string;
    saving_style: string;
    impulse_buy_risk: string;
    investment_sense: string;
    monetization_strategy: string;
  };
  human_relations: {
    friend_relations: string;
    family_relations: string;
    social_relations: string;
    first_impression: string;
    connection_traits: string;
  };
  today: {
    caution: string;
    action: string;
    lucky_behavior: string;
    emotion_management: string;
    support_message: string;
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
      compatibility_score: number;
      clash_point: string;
      conversation_style: string;
      romance_score: number;
      friend_score: number;
      work_score: number;
      maintenance_tip: string;
    };
    good: {
      animal_id: AnimalId;
      reason: string;
      compatibility_score: number;
      clash_point: string;
      conversation_style: string;
      romance_score: number;
      friend_score: number;
      work_score: number;
      maintenance_tip: string;
    };
    challenging: {
      animal_id: AnimalId;
      reason: string;
      compatibility_score: number;
      clash_point: string;
      conversation_style: string;
      romance_score: number;
      friend_score: number;
      work_score: number;
      maintenance_tip: string;
    };
    worst: {
      animal_id: AnimalId;
      reason: string;
      compatibility_score: number;
      clash_point: string;
      conversation_style: string;
      romance_score: number;
      friend_score: number;
      work_score: number;
      maintenance_tip: string;
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
  compatibilityStory: {
    bestMatchStage: TwelveStage;
    cautionMatchStage: TwelveStage;
    narrative: string;
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
  stageResults?: TwelveStageResult[];
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
