import { SajuAnalysis } from "../_types";

export interface SajuPillarRequest {
  name: string;
  gender: "남" | "여";
  year: number;
  month: number;
  day: number;
  hour: number;
}

export async function fetchSajuPillar(params: SajuPillarRequest): Promise<SajuAnalysis> {
  const res = await fetch("/api/love-saju-pillar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error(`Saju API error: ${res.status}`);
  }

  const data = await res.json();

  // Mapping the API response to our unified type
  return {
    yearPillar: data.yearPillar,
    monthPillar: data.monthPillar,
    dayPillar: data.dayPillar,
    hourPillar: data.hourPillar,
    dayMasterName: data.dayMasterName,
    dayMasterElement: data.dayMasterElement,
    isStrong: data.isStrong,
    yongshin: data.yongshin || [],
    kishin: data.kishin || [],
    elements: data.elements || { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 },
  };
}

export const ELEMENT_HARMONY: Record<string, Record<string, number>> = {
  목: { 목: 4, 화: 6, 토: 1, 금: 2, 수: 5 },
  화: { 목: 5, 화: 4, 토: 6, 금: 1, 수: 2 },
  토: { 목: 2, 화: 5, 토: 4, 금: 6, 수: 1 },
  금: { 목: 1, 화: 2, 토: 5, 금: 4, 수: 6 },
  수: { 목: 6, 화: 1, 토: 2, 금: 5, 수: 4 },
};

export function computeMatchScore(userElement: string, npcElement: string): number {
  if (!userElement || !npcElement) return 60; // Default 60%
  const score = (ELEMENT_HARMONY[userElement]?.[npcElement] || 3) + (ELEMENT_HARMONY[npcElement]?.[userElement] || 3);
  return Math.min(99, Math.round((score / 12) * 100));
}
