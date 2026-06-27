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

const tenGodSheet = fortuneTeaHouseAssets.tenGods.sheet;
const tenGodSheetWidth = 1448;
const tenGodSheetHeight = 1086;
const tenGodIconSize = 290;
const topRowY = 130;
const bottomRowY = 560;

const tenGodSprite = (tenGodId: TenGodId, x: number, y: number, glyph: string, alt: string): TenGodVisualMeta => ({
  tenGodId,
  type: "sprite-crop",
  src: tenGodSheet,
  sheetWidth: tenGodSheetWidth,
  sheetHeight: tenGodSheetHeight,
  x,
  y,
  width: tenGodIconSize,
  height: tenGodIconSize,
  glyph,
  alt,
});

export const tenGodVisualMap: Record<TenGodId, TenGodVisualMeta> = {
  bigeon: tenGodSprite("bigeon", 0, topRowY, "鏡", "비견을 상징하는 나와 닮은 손님 이미지"),
  geopjae: tenGodSprite("geopjae", 290, topRowY, "雷", "겁재를 상징하는 옆자리 경쟁자 이미지"),
  siksin: tenGodSprite("siksin", 580, topRowY, "蜜", "식신을 상징하는 디저트 요리사 이미지"),
  sanggwan: tenGodSprite("sanggwan", 870, topRowY, "唱", "상관을 상징하는 창가의 예술가 이미지"),
  pyeonjae: tenGodSprite("pyeonjae", 1158, topRowY, "商", "편재를 상징하는 떠돌이 상인 이미지"),
  jeongjae: tenGodSprite("jeongjae", 0, bottomRowY, "帳", "정재를 상징하는 장부 쓰는 총무 이미지"),
  pyeongwan: tenGodSprite("pyeongwan", 290, bottomRowY, "傘", "편관을 상징하는 검은 우산의 기사 이미지"),
  jeonggwan: tenGodSprite("jeonggwan", 580, bottomRowY, "律", "정관을 상징하는 찻집 규칙 관리자 이미지"),
  pyeonin: tenGodSprite("pyeonin", 870, bottomRowY, "謎", "편인을 상징하는 이상한 책을 읽는 점술가 이미지"),
  jeongin: tenGodSprite("jeongin", 1158, bottomRowY, "燈", "정인을 상징하는 따뜻한 차를 내주는 선생 이미지"),
};
