import type { ZiweiPremiumChapterBase } from "./ziweiPremiumCommon.types";

export type ZiweiChapterIXSections = {
  socialNetwork?: string;
  collaboratorQuality?: string;
  trustSignals?: string;
  conflictSignals?: string;
  networkActionPlan?: string;
};

export type ZiweiChapterIX = ZiweiPremiumChapterBase<"IX", ZiweiChapterIXSections>;
