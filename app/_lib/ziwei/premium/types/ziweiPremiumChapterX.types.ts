import type { ZiweiPremiumChapterBase } from "./ziweiPremiumCommon.types";

export type ZiweiChapterXSections = {
  innerPeaceAxis?: string;
  parentKarma?: string;
  emotionalRecovery?: string;
  inheritancePattern?: string;
  mindsetPractice?: string;
};

export type ZiweiChapterX = ZiweiPremiumChapterBase<"X", ZiweiChapterXSections>;
