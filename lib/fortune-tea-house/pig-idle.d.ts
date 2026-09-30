export type PigIdleState = { index: number; turn: number; recent: number[]; rareCount: number; lastRare: number };
export function nextPigSpeech(state: PigIdleState, count: number, random?: number): PigIdleState;
