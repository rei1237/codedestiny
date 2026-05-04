import { ZiweiChartData, ZiweiPalaceData } from "./ziwei-engine";

export interface AdvancedZiweiInput {
  user: {
    name: string;
    birthDate: string;
    birthTime: string;
    gender: "M" | "F";
  };
  chart: ZiweiChartData;
}

export interface AdvancedZiweiSection {
  title: string;
  summary: string;
  detail: string;
}

export interface AdvancedZiweiResult {
  intro: AdvancedZiweiSection;
  destiny: AdvancedZiweiSection;
  personality: AdvancedZiweiSection;
  career: AdvancedZiweiSection;
  wealth: AdvancedZiweiSection;
  love: AdvancedZiweiSection;
  family: AdvancedZiweiSection;
  social: AdvancedZiweiSection;
  health: AdvancedZiweiSection;
  innerMind: AdvancedZiweiSection;
  realEstate: AdvancedZiweiSection;
  environment: AdvancedZiweiSection;
  children: AdvancedZiweiSection;
  majorCycle: AdvancedZiweiSection;
  total: AdvancedZiweiSection;
}

/** 
 * 자미두수 데이터를 심화 분석용으로 정규화 
 */
export function normalizeAdvancedInput(
  name: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  gender: "M" | "F",
  chart: ZiweiChartData
): AdvancedZiweiInput {
  return {
    user: {
      name: name || "당신",
      birthDate: `${year}-${month}-${day}`,
      birthTime: `${hour}시`,
      gender,
    },
    chart,
  };
}

/**
 * 특정 궁의 정보를 안전하게 가져오는 헬퍼
 */
export function getPalaceData(chart: ZiweiChartData, label: string): ZiweiPalaceData | undefined {
  return chart.palaceStarData.find(p =\u003e p.palace === label);
}
