import type { ZiweiPremiumChapterBase } from "./ziweiPremiumCommon.types";

export type ZiweiChapterXVSections = {
  finalDiagnosis?: string;
  strategicRules?: string;
  decisionChecklist?: string;
  failSafe?: string;
  closingMessage?: string;
};

export type ZiweiChapterXV = ZiweiPremiumChapterBase<"XV", ZiweiChapterXVSections>;
