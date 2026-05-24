import type { ZiweiPremiumChapterBase } from "./ziweiPremiumCommon.types";

export type ZiweiChapterIISections = {
  myungGungCore?: string;
  shinGungDrive?: string;
  egoVersusAction?: string;
  growthArc?: string;
  executionAdvice?: string;
};

export type ZiweiChapterII = ZiweiPremiumChapterBase<"II", ZiweiChapterIISections>;
