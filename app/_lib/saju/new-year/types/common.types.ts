export type NewYearChapterKey =
  | "I"
  | "II"
  | "III"
  | "IV"
  | "V"
  | "VI"
  | "VII"
  | "VIII"
  | "IX"
  | "X";

export type NewYearFieldStatus = "ready" | "missing" | "fallback";

export type NewYearFieldSource = "engine" | "llm" | "fallback";

export type NewYearSectionRecord = Record<string, string | undefined>;

export type SajuNewYearSectionItem = {
  key: string;
  label: string;
  content: string;
  status?: NewYearFieldStatus;
  source?: NewYearFieldSource;
};

export type SajuNewYearChapterBase<
  K extends NewYearChapterKey,
  S extends NewYearSectionRecord,
> = {
  chapterKey: K;
  title: string;
  summary?: string;
  sections: S;
  sectionOrder: Array<keyof S>;
};

export type SajuNewYearMonthlyGoStopRow = {
  month: number;
  goStop: "Go" | "Stop" | "Wait";
  monthlyFortuneAndPoint: string;
  career: string;
  wealth: string;
  relationship: string;
  health: string;
  shouldDo: string;
  shouldAvoid: string;
};
