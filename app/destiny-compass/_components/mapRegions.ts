/** 운명의 지도 지역 정의 + 방향→지역(목적지) 매핑. DestinyMap·MapResult 공용. */
import type { DirectionKey } from "../_engine/types";

export interface RegionDef {
  key: string;
  label: string;
  icon: string;
  x: number; // % (mapField 기준)
  y: number;
  glow: string;
}

export const REGIONS: RegionDef[] = [
  { key: "castle", label: "운명의 성", icon: "🏰", x: 50, y: 15, glow: "rgba(232,213,163,.75)" },
  { key: "forest", label: "성장의 숲", icon: "🌲", x: 19, y: 40, glow: "rgba(122,222,140,.6)" },
  { key: "city", label: "재물의 도시", icon: "🏙️", x: 82, y: 42, glow: "rgba(96,200,255,.6)" },
  { key: "lake", label: "관계의 호수", icon: "💧", x: 28, y: 76, glow: "rgba(120,160,255,.62)" },
  { key: "fog", label: "안개의 계곡", icon: "🌫️", x: 72, y: 78, glow: "rgba(190,180,225,.55)" },
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
  label: string;
  /** 대응 지도 노드(spotlight 대상) */
  region: string;
  /** 칩 클릭 시 고민 입력값으로 제출되는 문구 */
  seed: string;
}

export const CHIP_AXES: ChipAxis[] = [
  { key: "career", label: "이직·커리어", region: "castle", seed: "이직" },
  { key: "wealth", label: "재물", region: "city", seed: "재물" },
  { key: "relationship", label: "관계", region: "lake", seed: "인간관계" },
  { key: "study", label: "배움", region: "forest", seed: "배움" },
  { key: "health", label: "건강", region: "fog", seed: "건강" },
  { key: "rest", label: "쉼", region: "fog", seed: "쉼" },
];
