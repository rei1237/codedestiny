import type { YeonAstroSignal } from "./astroSignal";

export type YeonSpriteEmotion = "happy" | "calm" | "tired" | "worried" | "flutter" | "blue";

type SpriteInput = {
  signIndex: number;
  emotion: YeonSpriteEmotion;
  categoryIndex: number;
  domainIndex: number;
  astroSignal?: YeonAstroSignal | null;
};

export const YEON_IMAGE_ASSETS = {
  hero: "/fuctionassets/%EC%97%B0%EC%9D%B4%EC%9D%98%20%EB%A7%88%EC%9D%8C%20%EB%B3%84%EC%9E%90%EB%A6%AC.webp",
  spriteSheet: "/fuctionassets/%EC%97%B0%EC%9D%B4%20%EC%BA%90%EB%A6%AD%ED%84%B0%20%EC%8A%A4%ED%94%84%EB%9D%BC%EC%9D%B4%ED%8A%B8%20%EC%8B%9C%ED%8A%B8.webp",
  sleepy: "/fuctionassets/%EC%9E%90%EB%8A%94%20%EC%97%B0%EC%9D%B4.png",
  default: "/fuctionassets/%EC%97%B0%EC%9D%B4.webp",
  fortune: "/fuctionassets/%EC%82%AC%EC%A3%BC%EB%B3%B4%EB%8A%94%20%EC%97%B0%EC%9D%B4.webp",
  moneySpark: "/fuctionassets/%EB%8F%88%EB%8F%85%EC%98%A4%EB%A5%B8%20%EC%97%B0%EC%9D%B4.webp",
  moneySmile: "/fuctionassets/%EB%8F%88%EB%B0%9D%ED%9E%88%EB%8A%94%20%EC%97%B0%EC%9D%B4.webp",
} as const;

const BASE_POOL: Record<YeonSpriteEmotion, number[]> = {
  happy: [0, 3, 9, 10],
  calm: [1, 4, 10, 11],
  tired: [7, 1, 4],
  worried: [5, 4, 8],
  flutter: [2, 6, 9, 11],
  blue: [7, 1, 5],
};

const ELEMENT_FRAME_BIAS = {
  fire: 9,
  earth: 4,
  air: 11,
  water: 1,
  unknown: 0,
} as const;

const MODE_FRAME_BIAS = {
  cardinal: 3,
  fixed: 6,
  mutable: 10,
  unknown: 0,
} as const;

function positiveModulo(value: number, mod: number) {
  return ((value % mod) + mod) % mod;
}

export function getYeonSpriteFrame(input: SpriteInput): number {
  const pool = [...(BASE_POOL[input.emotion] || BASE_POOL.calm)];
  const signal = input.astroSignal;
  if (signal?.dominantElement) pool.push(ELEMENT_FRAME_BIAS[signal.dominantElement]);
  if (signal?.dominantMode) pool.push(MODE_FRAME_BIAS[signal.dominantMode]);
  if (signal?.majorAspects.some((aspect) => aspect.tone === "tension")) pool.push(5);
  if (signal?.majorAspects.some((aspect) => aspect.tone === "soft")) pool.push(10);
  if (signal?.venusSign) pool.push(6);
  if (signal?.moonSign && (input.emotion === "tired" || input.emotion === "blue")) pool.push(7);

  const seed =
    input.signIndex * 31 +
    input.categoryIndex * 13 +
    input.domainIndex * 7 +
    (signal?.sunSign ? signal.sunSign.charCodeAt(0) : 0) +
    (signal?.moonSign ? signal.moonSign.charCodeAt(0) : 0);

  return pool[positiveModulo(seed, pool.length)] ?? 0;
}
