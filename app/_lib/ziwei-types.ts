export type ZiweiGender = "M" | "F";
export type ZiweiCalendarType = "solar" | "lunar";

export type ZiweiPalaceId =
  | "ming"
  | "siblings"
  | "spouse"
  | "children"
  | "wealth"
  | "health"
  | "travel"
  | "friends"
  | "career"
  | "property"
  | "fortune"
  | "parents";

export type ZiweiSectionId = ZiweiPalaceId | "overview" | "master";

export interface ZiweiUserInput {
  name: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute: number;
  unknownHour: boolean;
  gender: ZiweiGender;
  calendarType: ZiweiCalendarType;
  isLeapMonth: boolean;
  birthPlace?: string;
  timezone: string;
}

export interface ZiweiInputWarning {
  code:
    | "MISSING_BIRTH_TIME"
    | "INVALID_DATE"
    | "LUNAR_CONVERSION_FAILED"
    | "LEAP_MONTH_UNSUPPORTED"
    | "MISSING_GENDER";
  message: string;
}

export interface ZiweiInputError {
  code:
    | "MISSING_BIRTH_DATE"
    | "INVALID_BIRTH_DATE"
    | "INVALID_BIRTH_TIME"
    | "MISSING_GENDER"
    | "NORMALIZATION_FAILED";
  message: string;
}

export interface ZiweiStarMeta {
  name: string;
  symbol: string;
}

export interface ZiweiPalace {
  id: ZiweiPalaceId;
  name: string;
  earthlyBranch: string;
  mainStars: ZiweiStarMeta[];
  auxiliaryStars: ZiweiStarMeta[];
  maleficStars: ZiweiStarMeta[];
  luckyStars: ZiweiStarMeta[];
  sihua: string[];
  oppositePalaceId: ZiweiPalaceId;
  triadPalaceIds: ZiweiPalaceId[];
  keywords: string[];
  score: number;
  isEmpty: boolean;
  dahan: string;
}

export interface ZiweiPeriod {
  palaceId: ZiweiPalaceId;
  range: string;
}

export interface ZiweiAnnualFlow {
  yearLabel: string;
  keyPalaces: ZiweiPalaceId[];
  notes: string[];
}

export interface ZiweiDeepSummary {
  keywords: string[];
  strongestPalaceId: ZiweiPalaceId;
  weakestPalaceId: ZiweiPalaceId;
  direction: string;
  strengths: string[];
  weaknesses: string[];
  openingCondition: string;
  decisionRule: string;
  palaceMatrix: Array<{
    palaceId: ZiweiPalaceId;
    palaceName: string;
    mainStars: string[];
    keywords: string[];
    score: number;
  }>;
}

export interface ZiweiDeepChart {
  user: ZiweiUserInput;
  warnings: ZiweiInputWarning[];
  mingGong: string;
  shenGong: string;
  yearGan: string;
  yearZhi: string;
  juInfo: string;
  sihua: {
    hualu: string;
    huaquan: string;
    huake: string;
    huaji: string;
  };
  palaces: ZiweiPalace[];
  majorPeriods: ZiweiPeriod[];
  annualFlow?: ZiweiAnnualFlow;
  summary: ZiweiDeepSummary;
}

export interface ZiweiDeepChapter {
  sectionId: ZiweiSectionId;
  palaceId?: ZiweiPalaceId;
  title: string;
  subtitle?: string;
  summary: string[];
  fullText: string;
  highlights: string[];
  strengths: string[];
  cautions: string[];
  remedies: string[];
  actionItems: string[];
  routine7Days: string[];
  routine30Days: string[];
}

export interface ZiweiChapterValidation {
  isValid: boolean;
  issues: string[];
}

export interface ZiweiDeepRuntimeCache {
  chartKey: string;
  generatedAt: number;
  chapters: Partial<Record<ZiweiSectionId, ZiweiDeepChapter>>;
}

export const ZIWEI_PALACE_ORDER: ZiweiPalaceId[] = [
  "ming",
  "siblings",
  "spouse",
  "children",
  "wealth",
  "health",
  "travel",
  "friends",
  "career",
  "property",
  "fortune",
  "parents",
];

export const ZIWEI_PALACE_NAME: Record<ZiweiPalaceId, string> = {
  ming: "명궁",
  siblings: "형제궁",
  spouse: "부처궁",
  children: "자녀궁",
  wealth: "재백궁",
  health: "질액궁",
  travel: "천이궁",
  friends: "교우궁",
  career: "관록궁",
  property: "전택궁",
  fortune: "복덕궁",
  parents: "부모궁",
};

export const ZIWEI_SECTIONS: Array<{ id: ZiweiSectionId; title: string; palaceId?: ZiweiPalaceId }> = [
  { id: "overview", title: "0. 전체 명반 요약" },
  { id: "ming", title: "1. 명궁", palaceId: "ming" },
  { id: "siblings", title: "2. 형제궁", palaceId: "siblings" },
  { id: "spouse", title: "3. 부처궁", palaceId: "spouse" },
  { id: "children", title: "4. 자녀궁", palaceId: "children" },
  { id: "wealth", title: "5. 재백궁", palaceId: "wealth" },
  { id: "health", title: "6. 질액궁", palaceId: "health" },
  { id: "travel", title: "7. 천이궁", palaceId: "travel" },
  { id: "friends", title: "8. 교우궁", palaceId: "friends" },
  { id: "career", title: "9. 관록궁", palaceId: "career" },
  { id: "property", title: "10. 전택궁", palaceId: "property" },
  { id: "fortune", title: "11. 복덕궁", palaceId: "fortune" },
  { id: "parents", title: "12. 부모궁", palaceId: "parents" },
  { id: "master", title: "13. 종합 총운" },
];
