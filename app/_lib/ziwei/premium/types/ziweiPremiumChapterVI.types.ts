import type { ZiweiPremiumChapterBase } from "./ziweiPremiumCommon.types";

export type ZiweiChapterVISections = {
  wealthContainer?: string;
  careerVelocity?: string;
  leadershipStyle?: string;
  moneyLeakRisk?: string;
  growthExecution?: string;
};

export type ZiweiChapterVI = ZiweiPremiumChapterBase<"VI", ZiweiChapterVISections>;
