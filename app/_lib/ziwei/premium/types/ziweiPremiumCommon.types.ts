export type ZiweiChapterKey =
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
  | "XIII"
  | "XIV"
  | "XV";

export type ZiweiSectionRecord = Record<string, string | undefined>;

export type ZiweiPremiumChapterBase<K extends ZiweiChapterKey = ZiweiChapterKey, S extends ZiweiSectionRecord = ZiweiSectionRecord> = {
  chapterKey: K;
  title: string;
  summary?: string;
  sections: S;
};
