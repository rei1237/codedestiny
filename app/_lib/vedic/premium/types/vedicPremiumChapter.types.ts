export type VedicChapterNo =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  | 9 | 10 | 11 | 12;

export type VedicChapterKey =
  | "V1" | "V2" | "V3" | "V4"
  | "V5" | "V6" | "V7" | "V8"
  | "V9" | "V10" | "V11" | "V12";

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
