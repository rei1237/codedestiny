export type TenGodId =
  | "bigeon"
  | "geopjae"
  | "siksin"
  | "sanggwan"
  | "pyeonjae"
  | "jeongjae"
  | "pyeongwan"
  | "jeonggwan"
  | "pyeonin"
  | "jeongin";

export type TenGodColorTone = "pink" | "purple" | "gold" | "blue" | "green" | "red" | "gray";

export type TenGodMeta = {
  id: TenGodId;
  nameKo: string;
  hanja?: string;
  roleInTeaHouse: string;
  coreMeaning: string[];
  lightSide: string;
  shadowSide: string;
  yeoniDescription: string;
  visualHint: string;
  colorTone: TenGodColorTone;
};

import * as shared from "@/lib/fortune-tea-house/ten-gods.mjs";
export const tenGodMetaMap = shared.tenGodMetaMap as Record<TenGodId, TenGodMeta>;
export const tenGods = shared.tenGods as TenGodMeta[];
export const tenGodLabelToIdMap = shared.tenGodLabelToIdMap as Record<string, TenGodId>;
export const normalizeTenGodId = shared.normalizeTenGodId as (value: string) => TenGodId | undefined;
export const getTenGodMeta = shared.getTenGodMeta as (id: TenGodId) => TenGodMeta;
