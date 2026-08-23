/** 운명의 나침반 지역 정의 + 방향→지역(목적지) 매핑. DestinyMap·CompassReport 공용. */
import type { DirectionKey } from "../_engine/types";

export interface RegionDef {
  key: string;
  icon: string;
  x: number; // % (mapField 기준)
  y: number;
  glow: string;
}

export const REGIONS: RegionDef[] = [
  { key: "castle", icon: "🏰", x: 50, y: 20, glow: "rgba(232,213,163,.75)" },
  { key: "forest", icon: "🌲", x: 18, y: 43, glow: "rgba(122,222,140,.6)" },
  { key: "city", icon: "🏙️", x: 82, y: 43, glow: "rgba(96,200,255,.6)" },
  { key: "lake", icon: "💧", x: 27, y: 74, glow: "rgba(120,160,255,.62)" },
  { key: "fog", icon: "🌫️", x: 73, y: 74, glow: "rgba(190,180,225,.55)" },
];

export const HERE = { x: 50, y: 56 };

// DirectionKey → 목적지 지역 key
export const DIRECTION_TO_REGION: Record<DirectionKey, string> = {
  career: "castle",
  venture: "castle",
  study: "forest",
  wealth: "city",
  relationship: "lake",
  love: "lake",
  health: "fog",
  rest: "fog",
};

export function regionByKey(key: string): RegionDef | undefined {
  return REGIONS.find((r) => r.key === key);
}

/** 빠른 질문 칩 — 나침반 6축과 정렬. 각 칩은 대응 지역 노드를 밝힌다(칩→노드 발광). */
export interface ChipAxis {
  key: string;
  /** 대응 지도 노드(spotlight 대상) */
  region: string;
  /** 칩 클릭 시 고민 입력값으로 제출되는 문구 — 해시 채점용, 화면에 노출되지 않는다 */
  seed: string;
}

export const CHIP_AXES: ChipAxis[] = [
  { key: "career", region: "castle", seed: "이직" },
  { key: "wealth", region: "city", seed: "재물" },
  { key: "relationship", region: "lake", seed: "인간관계" },
  { key: "study", region: "forest", seed: "배움" },
  { key: "health", region: "fog", seed: "건강" },
  { key: "rest", region: "fog", seed: "쉼" },
];
