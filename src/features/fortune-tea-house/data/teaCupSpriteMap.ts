import { fortuneTeaHouseAssets } from "./assets";

export type TeaCupSpriteState = "normal" | "selected";

type TeaCupSpriteSlice = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TeaCupSpriteSheet = {
  src: string;
  sheetWidth: number;
  sheetHeight: number;
};

type TeaCupSpriteEntry = {
  normalSheet: TeaCupSpriteSheet;
  selectedSheet: TeaCupSpriteSheet;
  normal: TeaCupSpriteSlice;
  selected: TeaCupSpriteSlice;
};

const normalSheet = {
  src: fortuneTeaHouseAssets.teaCups.correctedPhotoroom,
  sheetWidth: 1448,
  sheetHeight: 1086,
} as const;

const selectedSheet = {
  src: fortuneTeaHouseAssets.teaCups.labeledPhotoroom,
  sheetWidth: 1448,
  sheetHeight: 1086,
} as const;

const sheets = {
  normalSheet,
  selectedSheet,
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
    ...sheets,
    normal: slice(18, 52, 256, 324),
    selected: slice(61, 47, 424, 502),
  },
  "honey-peach": {
    ...sheets,
    normal: slice(268, 53, 244, 324),
    selected: slice(508, 48, 463, 501),
  },
  "star-black-tea": {
    ...sheets,
    normal: slice(505, 54, 230, 324),
    selected: slice(959, 48, 416, 501),
  },
  "gold-cinnamon": {
    ...sheets,
    normal: slice(723, 53, 230, 325),
    selected: slice(55, 537, 420, 479),
  },
  "white-lotus-healing": {
    ...sheets,
    normal: slice(942, 53, 234, 324),
    selected: slice(506, 537, 412, 481),
  },
  "black-moon-brown-rice": {
    ...sheets,
    normal: slice(1187, 52, 242, 325),
    selected: slice(959, 537, 410, 481),
  },
};

export function getTeaCupSprite(cupId: string, state: TeaCupSpriteState = "normal") {
  const entry = teaCupSpriteMap[cupId] || teaCupSpriteMap["lotus-moon"];
  const crop = entry[state];
  const sheet = state === "selected" ? entry.selectedSheet : entry.normalSheet;
  return {
    src: sheet.src,
    sheetWidth: sheet.sheetWidth,
    sheetHeight: sheet.sheetHeight,
    ...crop,
  };
}
