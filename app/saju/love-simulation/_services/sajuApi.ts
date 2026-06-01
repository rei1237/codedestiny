import { SajuAnalysis } from "../_types";

export interface SajuPillarRequest {
  name: string;
  gender: "남" | "여";
  year: number;
  month: number;
  day: number;
  hour: number;
}

const GAN = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
const ZHI = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;

const GAN_ELEMENT: Record<string, "목" | "화" | "토" | "금" | "수"> = {
  갑: "목",
  을: "목",
  병: "화",
  정: "화",
  무: "토",
  기: "토",
  경: "금",
  신: "금",
  임: "수",
  계: "수",
};

const ZHI_ELEMENT: Record<string, "목" | "화" | "토" | "금" | "수"> = {
  자: "수",
  축: "토",
  인: "목",
  묘: "목",
  진: "토",
  사: "화",
  오: "화",
  미: "토",
  신: "금",
  유: "금",
  술: "토",
  해: "수",
};

function floorMod(value: number, base: number): number {
  return ((value % base) + base) % base;
}

function normalizeHour(rawHour: number): number {
  if (!Number.isFinite(rawHour) || rawHour < 0) return 12;
  return Math.max(0, Math.min(23, Math.floor(rawHour)));
}

function safeDateSerial(year: number, month: number, day: number): number {
  const d = new Date(Date.UTC(year, month - 1, day));
  return Math.floor(d.getTime() / 86400000);
}

function buildPillarFromIndex(index: number): string {
  const gan = GAN[floorMod(index, 10)];
  const zhi = ZHI[floorMod(index, 12)];
  return `${gan}${zhi}`;
}

function fallbackSajuAnalysis(params: SajuPillarRequest): SajuAnalysis {
  const year = Number(params.year) || 1990;
  const month = Number(params.month) || 1;
  const day = Number(params.day) || 1;
  const hour = normalizeHour(Number(params.hour));

  // 1984년을 갑자년 기준점으로 사용
  const yearIndex = floorMod(year - 1984, 60);
  const monthIndex = floorMod((yearIndex * 12) + (month - 1) + 14, 60);
  const dayIndex = floorMod(safeDateSerial(year, month, day) + 40, 60);
  const hourBranchIndex = floorMod(Math.floor((hour + 1) / 2), 12);
  const hourIndex = floorMod((dayIndex * 12) + hourBranchIndex, 60);

  const yearPillar = buildPillarFromIndex(yearIndex);
  const monthPillar = buildPillarFromIndex(monthIndex);
  const dayPillar = buildPillarFromIndex(dayIndex);
  const hourPillar = buildPillarFromIndex(hourIndex);

  const dayMasterGan = dayPillar.charAt(0) || "갑";
  const dayMasterElement = GAN_ELEMENT[dayMasterGan] || "목";

  const count = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar];
  pillars.forEach((pillar) => {
    const gan = pillar.charAt(0);
    const zhi = pillar.charAt(1);
    const ganElement = GAN_ELEMENT[gan];
    const zhiElement = ZHI_ELEMENT[zhi];
    if (ganElement) count[ganElement] += 1;
    if (zhiElement) count[zhiElement] += 1;
  });

  const ordered = Object.entries(count).sort((a, b) => Number(b[1]) - Number(a[1]));
  const strongest = ordered.slice(0, 2).map((row) => row[0]) as Array<"목" | "화" | "토" | "금" | "수">;
  const weakest = [...ordered].reverse().slice(0, 2).map((row) => row[0]) as Array<"목" | "화" | "토" | "금" | "수">;

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    dayMasterName: `${dayMasterGan}${dayMasterElement}`,
    dayMasterElement,
    isStrong: (count[dayMasterElement] || 0) >= 2,
    yongshin: weakest,
    kishin: strongest,
    elements: count,
  };
}

function normalizeApiSajuPayload(data: any): SajuAnalysis {
  return {
    yearPillar: String(data?.yearPillar || ""),
    monthPillar: String(data?.monthPillar || ""),
    dayPillar: String(data?.dayPillar || ""),
    hourPillar: String(data?.hourPillar || ""),
    dayMasterName: String(data?.dayMasterName || ""),
    dayMasterElement: data?.dayMasterElement || "목",
    isStrong: Boolean(data?.isStrong),
    yongshin: Array.isArray(data?.yongshin) ? data.yongshin : [],
    kishin: Array.isArray(data?.kishin) ? data.kishin : [],
    elements: data?.elements || { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 },
  };
}

export async function fetchSajuPillar(params: SajuPillarRequest): Promise<SajuAnalysis> {
  try {
    const res = await fetch("/api/love-saju-pillar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      if (res.status >= 500 || res.status === 404) {
        console.warn(`[love-simulation] /api/love-saju-pillar unavailable (${res.status}), using local fallback.`);
        return fallbackSajuAnalysis(params);
      }
      throw new Error(`Saju API error: ${res.status}`);
    }

    const data = await res.json();
    return normalizeApiSajuPayload(data);
  } catch (error) {
    console.warn("[love-simulation] saju API fetch failed, using local fallback.", error);
    return fallbackSajuAnalysis(params);
  }
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
