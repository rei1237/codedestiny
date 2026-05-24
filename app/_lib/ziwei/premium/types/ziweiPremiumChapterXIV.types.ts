import type { ZiweiPremiumChapterBase } from "./ziweiPremiumCommon.types";

export type ZiweiChapterXIVSections = {
  lifeTimeline?: string;
  turningPoints?: string;
  peakCycles?: string;
  resilienceCycles?: string;
  longTermPlan?: string;
};

export type ZiweiChapterXIV = ZiweiPremiumChapterBase<"XIV", ZiweiChapterXIVSections>;
