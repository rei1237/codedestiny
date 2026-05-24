import type { ZiweiPremiumChapterBase } from "./ziweiPremiumCommon.types";

export type ZiweiChapterISections = {
  chartSnapshot?: string;
  destinyAxis?: string;
  lifeTheme?: string;
  strengths?: string;
  risks?: string;
  practicalSummary?: string;
};

export type ZiweiChapterI = ZiweiPremiumChapterBase<"I", ZiweiChapterISections>;
