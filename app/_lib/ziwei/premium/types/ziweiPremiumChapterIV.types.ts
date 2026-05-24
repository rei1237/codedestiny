import type { ZiweiPremiumChapterBase } from "./ziweiPremiumCommon.types";

export type ZiweiChapterIVSections = {
  dominantStars?: string;
  supportStars?: string;
  starBalance?: string;
  starConflicts?: string;
  practicalAdvice?: string;
};

export type ZiweiChapterIV = ZiweiPremiumChapterBase<"IV", ZiweiChapterIVSections>;
