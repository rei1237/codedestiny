import type { ZiweiChapterI } from "./ziweiPremiumChapterI.types";
import type { ZiweiChapterII } from "./ziweiPremiumChapterII.types";
import type { ZiweiChapterIII } from "./ziweiPremiumChapterIII.types";
import type { ZiweiChapterIV } from "./ziweiPremiumChapterIV.types";
import type { ZiweiChapterV } from "./ziweiPremiumChapterV.types";
import type { ZiweiChapterVI } from "./ziweiPremiumChapterVI.types";
import type { ZiweiChapterVII } from "./ziweiPremiumChapterVII.types";
import type { ZiweiChapterVIII } from "./ziweiPremiumChapterVIII.types";
import type { ZiweiChapterIX } from "./ziweiPremiumChapterIX.types";
import type { ZiweiChapterX } from "./ziweiPremiumChapterX.types";
import type { ZiweiChapterXI } from "./ziweiPremiumChapterXI.types";
import type { ZiweiChapterXII } from "./ziweiPremiumChapterXII.types";
import type { ZiweiChapterXIII } from "./ziweiPremiumChapterXIII.types";
import type { ZiweiChapterXIV } from "./ziweiPremiumChapterXIV.types";
import type { ZiweiChapterXV } from "./ziweiPremiumChapterXV.types";

export type ZiweiPremiumReportData = {
  reportId?: string;
  generatedAt?: string;
  locale?: string;
  chapters: {
    I?: ZiweiChapterI;
    II?: ZiweiChapterII;
    III?: ZiweiChapterIII;
    IV?: ZiweiChapterIV;
    V?: ZiweiChapterV;
    VI?: ZiweiChapterVI;
    VII?: ZiweiChapterVII;
    VIII?: ZiweiChapterVIII;
    IX?: ZiweiChapterIX;
    X?: ZiweiChapterX;
    XI?: ZiweiChapterXI;
    XII?: ZiweiChapterXII;
    XIII?: ZiweiChapterXIII;
    XIV?: ZiweiChapterXIV;
    XV?: ZiweiChapterXV;
  };
};
