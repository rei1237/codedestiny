import type { YeonMood, ZodiacSign } from "./types";

export const YEON_SPRITE_URL =
  "/fuctionassets/%EC%97%B0%EC%9D%B4%20%EC%BA%90%EB%A6%AD%ED%84%B0%20%EC%8A%A4%ED%94%84%EB%9D%BC%EC%9D%B4%ED%8A%B8%20%EC%8B%9C%ED%8A%B8.webp";

export const YEON_SPRITE_COLS = 4;
export const YEON_SPRITE_ROWS = 3;
export const YEON_SPRITE_TOTAL = YEON_SPRITE_COLS * YEON_SPRITE_ROWS;

const zodiacAnchorFrameMap: Record<ZodiacSign, number> = {
  양자리: 1,
  황소자리: 2,
  쌍둥이자리: 3,
  게자리: 4,
  사자자리: 5,
  처녀자리: 6,
  천칭자리: 7,
  전갈자리: 8,
  사수자리: 9,
  염소자리: 10,
  물병자리: 11,
  물고기자리: 12,
};

const moodOffsetMap: Record<YeonMood, number[]> = {
  happy: [0, 1, 0, -1],
  tired: [0, -1, 0],
  anxious: [0, 1, 0],
  lonely: [0, -1],
  angry: [0, 1],
  blank: [0, -1, 0],
  hopeful: [0, 1, 2, 1],
};

function wrapFrame(frame: number) {
  const normalized = ((frame - 1) % YEON_SPRITE_TOTAL + YEON_SPRITE_TOTAL) % YEON_SPRITE_TOTAL;
  return normalized + 1;
}

export function getYeonSpriteSequence(sign: ZodiacSign, mood: YeonMood): number[] {
  const anchor = zodiacAnchorFrameMap[sign] || 1;
  const offsets = moodOffsetMap[mood] || [0];
  return offsets.map((offset) => wrapFrame(anchor + offset));
}

export function frameToSpriteGrid(frame: number) {
  const index = wrapFrame(frame) - 1;
  const col = index % YEON_SPRITE_COLS;
  const row = Math.floor(index / YEON_SPRITE_COLS);
  return { col, row, index };
}
