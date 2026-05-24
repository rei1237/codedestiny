import type { ZiweiPremiumChapterBase } from "./ziweiPremiumCommon.types";

export type ZiweiChapterXISections = {
  bodyWarningMap?: string;
  stressSignals?: string;
  energyManagement?: string;
  lifestyleCorrection?: string;
  preventiveChecklist?: string;
};

export type ZiweiChapterXI = ZiweiPremiumChapterBase<"XI", ZiweiChapterXISections>;
