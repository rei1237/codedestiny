import type { ZiweiPremiumChapterBase } from "./ziweiPremiumCommon.types";

export type ZiweiChapterXIIISections = {
  yearlySummary?: string;
  monthlyPlan?: string;
  timingWindows?: string;
  warningWindows?: string;
  yearlyActionGuide?: string;
};

export type ZiweiChapterXIII = ZiweiPremiumChapterBase<"XIII", ZiweiChapterXIIISections>;
