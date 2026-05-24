import type { ZiweiPremiumChapterBase } from "./ziweiPremiumCommon.types";

export type ZiweiChapterVIISections = {
  partnerPattern?: string;
  marriageFlow?: string;
  familyDynamics?: string;
  emotionalRisks?: string;
  harmonyGuide?: string;
};

export type ZiweiChapterVII = ZiweiPremiumChapterBase<"VII", ZiweiChapterVIISections>;
