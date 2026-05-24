export type VedicChapterNo =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

export type VedicChapterKey =
  | "ch01_total" | "ch02_lagna" | "ch03_moon" | "ch04_sun"
  | "ch05_planets" | "ch06_houses" | "ch07_nakshatra" | "ch08_yoga"
  | "ch09_dosha" | "ch10_career" | "ch11_love" | "ch12_health"
  | "ch13_dasha" | "ch14_divisional" | "ch15_transit" | "ch16_final";

export interface VedicInterpretationItem {
  key: string;
  label: string;
  content: string;
  sourcePaths: string[];
  fallbackUsed: boolean;
}

export interface VedicPremiumChapterData {
  no: VedicChapterNo;
  key: VedicChapterKey;
  roman: string;
  title: string;
  summary: string;
  items: VedicInterpretationItem[];
  missingFields: string[];
  warnings: string[];
}
