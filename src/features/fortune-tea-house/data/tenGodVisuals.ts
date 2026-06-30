import type { TenGodId } from "./tenGods";
import { fortuneTeaHouseAssets } from "./assets";

export type TenGodVisualMeta = {
  tenGodId: TenGodId;
  type: "image" | "sprite-crop" | "css-fallback";
  src?: string;
  sheetWidth?: number;
  sheetHeight?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  glyph: string;
  alt: string;
};

const tenGodSheet = fortuneTeaHouseAssets.saju.tenGodSheetLocal;
const tenGodSheetWidth = 1448;
const tenGodSheetHeight = 1086;
const tenGodIconWidth = 290;
const tenGodIconHeight = 520;
const topRowY = 0;
const bottomRowY = 543;

const tenGodSprite = (tenGodId: TenGodId, x: number, y: number, glyph: string, alt: string): TenGodVisualMeta => ({
  tenGodId,
  type: "sprite-crop",
  src: tenGodSheet,
  sheetWidth: tenGodSheetWidth,
  sheetHeight: tenGodSheetHeight,
  x,
  y,
  width: tenGodIconWidth,
  height: tenGodIconHeight,
  glyph,
  alt,
});

export const tenGodVisualMap: Record<TenGodId, TenGodVisualMeta> = {
  bigeon: tenGodSprite("bigeon", 0, topRowY, "鏡", "비견 십성 아이콘"),
  geopjae: tenGodSprite("geopjae", 290, topRowY, "雷", "겁재 십성 아이콘"),
  siksin: tenGodSprite("siksin", 580, topRowY, "蜜", "식신 십성 아이콘"),
  sanggwan: tenGodSprite("sanggwan", 870, topRowY, "唱", "상관 십성 아이콘"),
  pyeonjae: tenGodSprite("pyeonjae", 1158, topRowY, "商", "편재 십성 아이콘"),
  jeongjae: tenGodSprite("jeongjae", 0, bottomRowY, "帳", "정재 십성 아이콘"),
  pyeongwan: tenGodSprite("pyeongwan", 290, bottomRowY, "傘", "편관 십성 아이콘"),
  jeonggwan: tenGodSprite("jeonggwan", 580, bottomRowY, "律", "정관 십성 아이콘"),
  pyeonin: tenGodSprite("pyeonin", 870, bottomRowY, "謎", "편인 십성 아이콘"),
  jeongin: tenGodSprite("jeongin", 1158, bottomRowY, "燈", "정인 십성 아이콘"),
};
