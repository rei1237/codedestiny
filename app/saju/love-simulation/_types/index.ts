export type SajuElement = "목" | "화" | "토" | "금" | "수";

export interface SajuPillarData {
  gan: string;
  zhi: string;
  element: SajuElement;
}

export interface SajuAnalysis {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  dayMasterName: string;
  dayMasterElement: SajuElement;
  isStrong: boolean;
  yongshin: SajuElement[];
  kishin: SajuElement[];
  elements: Record<SajuElement, number>;
}

export interface Persona {
  name: string;
  emoji: string;
  birth: {
    year: number;
    month: number;
    day: number;
    hour: number;
  };
  gender: "남" | "여";
  desc: string;
  tags: string[];
  mbti?: string;
  traits?: {
    tone: string;
    attractionPoints: string[];
    conflictStyle: string;
    idealType: string;
  };
}

export interface DialogueStep {
  speaker: "system" | "npc" | "user";
  text: string;
  emotion?: "happy" | "neutral" | "surprised" | "blush" | "sad";
  choices?: Choice[];
}

export interface Choice {
  text: string;
  affinityDelta: number;
  nextStepId?: string;
  reactionText?: string;
}

export interface SimulationState {
  currentPersona: Persona | null;
  affinity: number;
  stepIndex: number;
  isCompleted: boolean;
  history: DialogueStep[];
}
