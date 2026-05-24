import type { ZiweiPremiumChapterBase } from "./ziweiPremiumCommon.types";

export type ZiweiChapterIIISections = {
  hwaLok?: string;
  hwaKwon?: string;
  hwaKwa?: string;
  hwaGi?: string;
  balancingStrategy?: string;
};

export type ZiweiChapterIII = ZiweiPremiumChapterBase<"III", ZiweiChapterIIISections>;
