import type { RomanChapterKey, SajuReportIntegrity } from "./common.types";
import type {
  SajuCh01WongukData,
  SajuCh02DesignData,
  SajuCh03YongshinData,
  SajuCh04DaeunData,
  SajuCh05GeokgukData,
  SajuCh06RelationData,
  SajuCh07LoveData,
  SajuCh08WealthCareerData,
  SajuCh09HealthData,
  SajuCh10HiddenCodeData,
  SajuCh11Roadmap2026Data,
  SajuCh12MasterplanData,
  SajuCh13FinalData,
} from "./chapters/sajuChapter.types";

export interface SajuPremiumReportData {
  reportId: string;
  generatedAt: string;
  profile: {
    name: string;
    gender?: string;
    birthDate: string;
    birthTime?: string;
    calendarType?: "solar" | "lunar" | "lunar_leap";
  };
  chapterOrder: RomanChapterKey[];
  chapters: {
    I: SajuCh01WongukData;
    II: SajuCh02DesignData;
    III: SajuCh03YongshinData;
    IV: SajuCh04DaeunData;
    V: SajuCh05GeokgukData;
    VI: SajuCh06RelationData;
    VII: SajuCh07LoveData;
    VIII: SajuCh08WealthCareerData;
    IX: SajuCh09HealthData;
    X: SajuCh10HiddenCodeData;
    XI: SajuCh11Roadmap2026Data;
    XII: SajuCh12MasterplanData;
    XIII: SajuCh13FinalData;
  };
  integrity: SajuReportIntegrity;
}
