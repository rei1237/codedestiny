import type { ZiweiPremiumChapterBase } from "./ziweiPremiumCommon.types";

export type ZiweiChapterXIISections = {
  decadeTheme?: string;
  decadeOpportunity?: string;
  decadeRisk?: string;
  decadePriority?: string;
  decadeExecution?: string;
};

export type ZiweiChapterXII = ZiweiPremiumChapterBase<"XII", ZiweiChapterXIISections>;
