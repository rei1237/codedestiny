import type { VedicPremiumChapterData, VedicChapterKey } from "./vedicPremiumChapter.types";
import type { VedicPremiumRawData } from "./vedicPremiumRaw.types";

export interface VedicPremiumIntegrity {
  hasBlankText: boolean;
  hasJsonLeak: boolean;
  duplicatedPhraseHits: string[];
}

export interface VedicPremiumReportData {
  reportId: string;
  mode: "personal";
  generatedAt: string;
  user: {
    name?: string;
    birth?: string;
    place?: string;
  };
  raw: VedicPremiumRawData;
  chapters: Record<VedicChapterKey, VedicPremiumChapterData>;
  chapterOrder: VedicChapterKey[];
  integrity: VedicPremiumIntegrity;
}
