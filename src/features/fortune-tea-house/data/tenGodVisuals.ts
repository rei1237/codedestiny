import type { TenGodId } from "./tenGods";
import { fortuneTeaHouseAssets } from "./assets";

export type TenGodVisualMeta = {
  tenGodId: TenGodId;
  type: "image" | "sprite-crop" | "css-fallback";
  src?: string;
  sheetWidth?: number;
  sheetHeight?: number;
  mobileSrc?: string;
  mobileSheetWidth?: number;
  mobileSheetHeight?: number;
  mobileCrop?: {
    src: string;
    sheetWidth: number;
    sheetHeight: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  glyph: string;
  alt: string;
};

const tenGodSheet = fortuneTeaHouseAssets.saju.tenGodSheetLocal;
const tenGodSheetMobile = fortuneTeaHouseAssets.saju.tenGodSheetMobile;
const tenGodSheetWidth = 1448;
const tenGodSheetHeight = 1086;
const tenGodSheetMobileWidth = 724;
const tenGodSheetMobileHeight = 543;
const tenGodIconWidth = 290;
const tenGodIconHeight = 520;
const topRowY = 0;
const bottomRowY = 543;

/**
 * 아이콘의 대체 텍스트. 🔴 스프라이트 정의(`tenGodSprite(...)`) 안에 인자로 두면 그건 **함수 호출**이라
 * 사전 가드가 문자열 리터럴을 하나도 읽지 못한다 — 배선하는 순간 통과가 아니라 실패한다. 그래서
 * 화면에 나가는 이 문구만 리터럴 맵으로 떼어 두고, 스프라이트는 여기서 조회한다.
 */
export const tenGodVisualAlts: Record<TenGodId, string> = {
  bigeon: "비견 십성 아이콘",
  geopjae: "겁재 십성 아이콘",
  siksin: "식신 십성 아이콘",
  sanggwan: "상관 십성 아이콘",
  pyeonjae: "편재 십성 아이콘",
  jeongjae: "정재 십성 아이콘",
  pyeongwan: "편관 십성 아이콘",
  jeonggwan: "정관 십성 아이콘",
  pyeonin: "편인 십성 아이콘",
  jeongin: "정인 십성 아이콘",
};
const tenGodSprite = (tenGodId: TenGodId, x: number, y: number, glyph: string): TenGodVisualMeta => ({
  tenGodId,
  type: "sprite-crop",
  src: tenGodSheet,
  sheetWidth: tenGodSheetWidth,
  sheetHeight: tenGodSheetHeight,
  mobileSrc: tenGodSheetMobile,
  mobileSheetWidth: tenGodSheetMobileWidth,
  mobileSheetHeight: tenGodSheetMobileHeight,
  mobileCrop: {
    src: tenGodSheetMobile,
    sheetWidth: tenGodSheetMobileWidth,
    sheetHeight: tenGodSheetMobileHeight,
    x: x * (tenGodSheetMobileWidth / tenGodSheetWidth),
    y: y * (tenGodSheetMobileHeight / tenGodSheetHeight),
    width: tenGodIconWidth * (tenGodSheetMobileWidth / tenGodSheetWidth),
    height: tenGodIconHeight * (tenGodSheetMobileHeight / tenGodSheetHeight),
  },
  x,
  y,
  width: tenGodIconWidth,
  height: tenGodIconHeight,
  glyph,
  alt: tenGodVisualAlts[tenGodId],
});

export const tenGodVisualMap: Record<TenGodId, TenGodVisualMeta> = {
  bigeon: tenGodSprite("bigeon", 0, topRowY, "鏡"),
  geopjae: tenGodSprite("geopjae", 290, topRowY, "雷"),
  siksin: tenGodSprite("siksin", 580, topRowY, "蜜"),
  sanggwan: tenGodSprite("sanggwan", 870, topRowY, "唱"),
  pyeonjae: tenGodSprite("pyeonjae", 1158, topRowY, "商"),
  jeongjae: tenGodSprite("jeongjae", 0, bottomRowY, "帳"),
  pyeongwan: tenGodSprite("pyeongwan", 290, bottomRowY, "傘"),
  jeonggwan: tenGodSprite("jeonggwan", 580, bottomRowY, "律"),
  pyeonin: tenGodSprite("pyeonin", 870, bottomRowY, "謎"),
  jeongin: tenGodSprite("jeongin", 1158, bottomRowY, "燈"),
};
