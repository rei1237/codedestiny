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
  src: fortuneTeaHouseAssets.teaCups.labeledPhotoroom,
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
    normal: slice(50, 40, 445, 500),
    selected: slice(50, 40, 445, 500),
  },
  "honey-peach": {
    ...sheet,
    normal: slice(495, 40, 445, 500),
    selected: slice(495, 40, 445, 500),
  },
  "star-black-tea": {
    ...sheet,
    normal: slice(945, 40, 440, 500),
    selected: slice(945, 40, 440, 500),
  },
  "gold-cinnamon": {
    ...sheet,
    normal: slice(45, 525, 440, 505),
    selected: slice(45, 525, 440, 505),
  },
  "white-lotus-healing": {
    ...sheet,
    normal: slice(495, 525, 440, 505),
    selected: slice(495, 525, 440, 505),
  },
  "black-moon-brown-rice": {
    ...sheet,
    normal: slice(945, 525, 435, 505),
    selected: slice(945, 525, 435, 505),
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
