export type RomanChapterKey =
  | "I"
  | "II"
  | "III"
  | "IV"
  | "V"
  | "VI"
  | "VII"
  | "VIII"
  | "IX"
  | "X"
  | "XI"
  | "XII"
  | "XIII";

export interface SajuEvidenceRef {
  source: "canonical" | "engine" | "derived";
  fieldPath: string;
  confidence?: "high" | "medium" | "low";
}

export interface SajuSectionItem<TSectionKey extends string> {
  key: TSectionKey;
  title: string;
  body: string;
  order: number;
  evidence?: SajuEvidenceRef[];
}

export interface SajuChapterBase<TSectionKey extends string> {
  chapter: RomanChapterKey;
  title: string;
  subtitle: string;
  summary: string;
  sections: Array<SajuSectionItem<TSectionKey>>;
  practicalAdvice: string[];
  warnings: string[];
}

export interface SajuReportIntegrity {
  missingChapters: RomanChapterKey[];
  missingSectionsByChapter: Partial<Record<RomanChapterKey, string[]>>;
  duplicateSectionKeys: Array<{ chapter: RomanChapterKey; key: string }>;
  fallbackUsed: boolean;
}
