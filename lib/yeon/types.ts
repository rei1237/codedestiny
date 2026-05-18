export type YeonMood =
  | "happy"
  | "tired"
  | "anxious"
  | "lonely"
  | "angry"
  | "blank"
  | "hopeful";

export type TimeThemeKey = "dawn" | "morning" | "afternoon" | "sunset" | "night";

export type ZodiacSign =
  | "양자리"
  | "황소자리"
  | "쌍둥이자리"
  | "게자리"
  | "사자자리"
  | "처녀자리"
  | "천칭자리"
  | "전갈자리"
  | "사수자리"
  | "염소자리"
  | "물병자리"
  | "물고기자리";

export type AstrologyEngineInput = {
  userName?: string;
  birthDate?: string;
  zodiacSign: ZodiacSign;
  currentPeriod?: "daily" | "weekly" | "monthly";
  astrologyData?: {
    sunSign?: string;
    moonSign?: string;
    ascendant?: string;
    dominantElement?: "fire" | "earth" | "air" | "water";
    currentTransits?: string[];
    luckyPlanet?: string;
    tensionPlanet?: string;
    majorTheme?: string;
    loveTheme?: string;
    moneyTheme?: string;
    workTheme?: string;
    relationshipTheme?: string;
  };
  userEmotion?: {
    selectedMood: YeonMood;
    moodLabel: string;
  };
};

export type NormalizedFortuneSignal = {
  mainEnergy: string;
  emotionalTheme: string;
  cautionTheme: string;
  recoveryTheme: string;
  relationshipHint: string;
  workHint: string;
  moneyHint: string;
  smallJoySeed: string;
};

export type YeonMessageOutput = {
  zodiac_sign: string;
  weekly_vibe: {
    keyword: string;
    sub_keyword: string;
    emotional_color: string;
    summary: string;
  };
  emotion_adaptive_opening: {
    selected_mood: string;
    first_sentence: string;
  };
  yeon_is_hug: {
    title: string;
    message: string[];
  };
  small_joy: {
    item: string;
    action: string;
    reason: string;
  };
  gentle_advice: {
    love: string;
    work: string;
    money: string;
    relationship: string;
  };
  yeon_illustration_prompt: {
    pose: string;
    expression: string;
    background: string;
    image_prompt: string;
  };
  share_card: {
    card_title: string;
    short_message: string;
    hashtags: string[];
  };
};
