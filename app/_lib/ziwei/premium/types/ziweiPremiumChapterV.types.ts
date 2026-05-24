import type { ZiweiPremiumChapterBase } from "./ziweiPremiumCommon.types";

export type ZiweiChapterVSections = {
  guardStars?: string;
  cautionStars?: string;
  triggerPatterns?: string;
  relationshipImpact?: string;
  mitigationPlan?: string;
};

export type ZiweiChapterV = ZiweiPremiumChapterBase<"V", ZiweiChapterVSections>;
