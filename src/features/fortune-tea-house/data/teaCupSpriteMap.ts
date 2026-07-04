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
  mobileSrc?: string;
  mobileSheetWidth?: number;
  mobileSheetHeight?: number;
};

type TeaCupSpriteMobileCrop = {
  src: string;
  sheetWidth: number;
  sheetHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
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
  mobileSrc: fortuneTeaHouseAssets.teaCups.correctedMobile,
  mobileSheetWidth: 724,
  mobileSheetHeight: 543,
} as const;

const selectedSheet = {
  src: fortuneTeaHouseAssets.teaCups.labeledPhotoroom,
  sheetWidth: 1448,
  sheetHeight: 1086,
  mobileSrc: fortuneTeaHouseAssets.teaCups.labeledMobile,
  mobileSheetWidth: 724,
  mobileSheetHeight: 543,
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

function mobileCropFor(sheet: TeaCupSpriteSheet, crop: TeaCupSpriteSlice): TeaCupSpriteMobileCrop | undefined {
  if (!sheet.mobileSrc || !sheet.mobileSheetWidth || !sheet.mobileSheetHeight) return undefined;
  const scaleX = sheet.mobileSheetWidth / sheet.sheetWidth;
  const scaleY = sheet.mobileSheetHeight / sheet.sheetHeight;
  return {
    src: sheet.mobileSrc,
    sheetWidth: sheet.mobileSheetWidth,
    sheetHeight: sheet.mobileSheetHeight,
    x: crop.x * scaleX,
    y: crop.y * scaleY,
    width: crop.width * scaleX,
    height: crop.height * scaleY,
  };
}

// Crop rects are measured from the sheets' alpha channel (tight bounding box of
// each tile + 6px uniform padding) so no neighbouring tile bleeds into a crop
// and no tile edge (tassels, frame tips, label banners) gets clipped.
export const teaCupSpriteMap: Record<string, TeaCupSpriteEntry> = {
  "lotus-moon": {
    ...sheets,
    normal: slice(25, 61, 242, 304),
    selected: slice(61, 47, 424, 482),
  },
  "honey-peach": {
    ...sheets,
    normal: slice(274, 62, 233, 304),
    selected: slice(508, 49, 424, 482),
  },
  "star-black-tea": {
    ...sheets,
    normal: slice(511, 63, 217, 304),
    selected: slice(954, 48, 421, 481),
  },
  "gold-cinnamon": {
    ...sheets,
    normal: slice(729, 62, 216, 305),
    selected: slice(55, 535, 420, 481),
  },
  "white-lotus-healing": {
    ...sheets,
    normal: slice(948, 62, 221, 304),
    selected: slice(500, 536, 424, 482),
  },
  "black-moon-brown-rice": {
    ...sheets,
    normal: slice(1193, 61, 229, 305),
    selected: slice(948, 536, 421, 482),
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
    mobileSrc: sheet.mobileSrc,
    mobileSheetWidth: sheet.mobileSheetWidth,
    mobileSheetHeight: sheet.mobileSheetHeight,
    mobileCrop: mobileCropFor(sheet, crop),
    ...crop,
  };
}
