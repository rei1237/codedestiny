export type TarotSpreadCategory =
  | "love"
  | "reunion"
  | "third_party"
  | "daily"
  | "choice"
  | "career"
  | "money"
  | "relationship"
  | "self"
  | "crisis"
  | "future"
  | "spiritual"
  | "family"
  | "power"
  | "legal"
  | "special";

export type TarotDifficulty = "easy" | "normal" | "deep" | "premium";

export type TarotSpreadPosition = {
  index: number;
  label: string;
  description: string;
  x: number;
  y: number;
  rotate: number;
  emphasis?: boolean;
};

export type TarotSpread = {
  id: string;
  title: string;
  category: TarotSpreadCategory;
  cardCount: number;
  difficulty: TarotDifficulty;
  purpose: string;
  positions: TarotSpreadPosition[];
  interpretationGuide: string[];
  tags: string[];
  mood: string;
  ritual: string;
};

export type QuestionChip = {
  icon: string;
  label: string;
  text: string;
};

export type TarotCardOrientation = "upright" | "reversed";

export type DrawnTarotCard = {
  slotIndex: number;
  positionLabel: string;
  positionDescription: string;
  cardCode: string;
  cardNameKo: string;
  cardNameEn: string;
  keywords: string[];
  orientation: TarotCardOrientation;
  orientationLabel: "정방향" | "역방향";
  image: string;
  focus: string;
};