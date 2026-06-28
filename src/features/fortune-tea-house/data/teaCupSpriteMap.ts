import { fortuneTeaHouseAssets } from "./assets";

export type TeaCupSpriteState = "normal" | "selected";

type TeaCupSpriteSlice = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TeaCupSpriteEntry = {
  src: string;
  sheetWidth: number;
  sheetHeight: number;
  normal: TeaCupSpriteSlice;
  selected: TeaCupSpriteSlice;
};

const sheet = {
  src: fortuneTeaHouseAssets.teaCups.correctedPhotoroom,
  sheetWidth: 1448,
  sheetHeight: 1086,
} as const;

function slice(x: number, y: number, width: number, height: number): TeaCupSpriteSlice {
  return {
    x,
    y,
    width,
    height,
  };
}

export const teaCupSpriteMap: Record<string, TeaCupSpriteEntry> = {
  "lotus-moon": {
    ...sheet,
    normal: slice(18, 52, 256, 324),
    selected: slice(18, 52, 256, 324),
  },
  "honey-peach": {
    ...sheet,
    normal: slice(268, 53, 244, 324),
    selected: slice(268, 53, 244, 324),
  },
  "star-black-tea": {
    ...sheet,
    normal: slice(505, 54, 230, 324),
    selected: slice(505, 54, 230, 324),
  },
  "gold-cinnamon": {
    ...sheet,
    normal: slice(723, 53, 230, 325),
    selected: slice(723, 53, 230, 325),
  },
  "white-lotus-healing": {
    ...sheet,
    normal: slice(942, 53, 234, 324),
    selected: slice(942, 53, 234, 324),
  },
  "black-moon-brown-rice": {
    ...sheet,
    normal: slice(1187, 52, 242, 325),
    selected: slice(1187, 52, 242, 325),
  },
};

export function getTeaCupSprite(cupId: string, state: TeaCupSpriteState = "normal") {
  const entry = teaCupSpriteMap[cupId] || teaCupSpriteMap["lotus-moon"];
  const crop = entry[state];
  return {
    src: entry.src,
    sheetWidth: entry.sheetWidth,
    sheetHeight: entry.sheetHeight,
    ...crop,
  };
}
