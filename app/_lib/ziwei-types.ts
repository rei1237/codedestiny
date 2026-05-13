import type {
  FourTransformation,
  FourTransformationSummary,
  TransformationType,
} from "./ziwei-advanced-normalization";

export type ZiweiGender = "M" | "F";
export type ZiweiCalendarType = "solar" | "lunar";

export type ZiweiTransformationType = TransformationType;
export type ZiweiFourTransformation = FourTransformation;
export type ZiweiFourTransformationSummary = FourTransformationSummary;

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
  strength?: string;
  strengthSymbol?: "◎" | "○" | "△" | "×" | "";
  starType?: "main" | "assistant" | "malefic" | "minor" | "transform";
  transformation?: "화록" | "화권" | "화과" | "화기" | null;
}

export interface ZiweiCanonicalStar {
  name: string;
  type: "main" | "assistant" | "malefic" | "minor" | "transform";
  strength?: string;
  strengthSymbol?: "◎" | "○" | "△" | "×" | "";
  transformation?: "화록" | "화권" | "화과" | "화기" | null;
  description?: string;
}

export interface ZiweiCanonicalPalace {
  key:
    | "life"
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
  name: string;
  meaning: string;
  mainStars: ZiweiCanonicalStar[];
  assistantStars: ZiweiCanonicalStar[];
  maleficStars: ZiweiCanonicalStar[];
  transformations: ZiweiCanonicalStar[];
  oppositePalace?: string;
  triadPalaces?: string[];
}

export interface ZiweiDeepAnalysisInput {
  palaces: ZiweiCanonicalPalace[];
  lifePalace: ZiweiCanonicalPalace;
  bodyPalace?: ZiweiCanonicalPalace;
  fourTransformations: {
    hualu?: ZiweiCanonicalStar;
    huaquan?: ZiweiCanonicalStar;
    huake?: ZiweiCanonicalStar;
    huaji?: ZiweiCanonicalStar;
  };
  majorLuck?: unknown;
  yearlyLuck?: unknown;
}

export interface ZiweiPalace {
  index: number;
  id: ZiweiPalaceId;
  name: string;
  normalizedName: string;
  branch: string;
  earthlyBranch: string;
  mainStars: ZiweiStarMeta[];
  subStars: ZiweiStarMeta[];
  minorStars: ZiweiStarMeta[];
  allStars: ZiweiStarMeta[];
  auxiliaryStars: ZiweiStarMeta[];
  maleficStars: ZiweiStarMeta[];
  luckyStars: ZiweiStarMeta[];
  isEmptyMainStarPalace: boolean;
  strengthSummary: {
    strongestStars: ZiweiStarMeta[];
    weakStars: ZiweiStarMeta[];
    hasMiaoWang: boolean;
    hasXianRuo: boolean;
  };
  fourTransformations: ZiweiFourTransformation[];
  incomingFourTransformations: ZiweiFourTransformation[];
  sihua: string[];
  oppositePalace: {
    name: string;
    index: number;
    mainStars: ZiweiStarMeta[];
    fourTransformations: ZiweiFourTransformation[];
  } | null;
  sanFangSiZheng: {
    self: string;
    wealthOrCareerRelated: string;
    relationshipRelated: string;
    opposite: string;
    palaceNames: string[];
    mainStars: ZiweiStarMeta[];
    fourTransformations: ZiweiFourTransformation[];
  };
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
  version: string;
  user: ZiweiUserInput;
  warnings: ZiweiInputWarning[];
  debugWarnings?: string[];
  mingGong: string;
  shenGong: string;
  birthYearStem: string;
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
  fourTransformations: ZiweiFourTransformationSummary;
  majorPeriods: ZiweiPeriod[];
  annualFlow?: ZiweiAnnualFlow;
  summary: ZiweiDeepSummary;
  canonicalInput?: ZiweiDeepAnalysisInput;
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
  spouse: "부부궁",
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
  { id: "overview", title: "CH.01~03 핵심 구조 요약" },
  { id: "ming", title: "CH.01 명궁·CH.02 신궁" , palaceId: "ming" },
  { id: "career", title: "CH.04 관록궁" , palaceId: "career" },
  { id: "wealth", title: "CH.05 재백궁" , palaceId: "wealth" },
  { id: "travel", title: "CH.06 천이궁" , palaceId: "travel" },
  { id: "spouse", title: "CH.07 부부궁" , palaceId: "spouse" },
  { id: "fortune", title: "CH.08 복덕궁" , palaceId: "fortune" },
  { id: "health", title: "CH.09 질액궁" , palaceId: "health" },
  { id: "property", title: "CH.10 전택궁" , palaceId: "property" },
  { id: "parents", title: "CH.11 부모궁" , palaceId: "parents" },
  { id: "siblings", title: "CH.11 형제궁" , palaceId: "siblings" },
  { id: "children", title: "CH.11 자녀궁" , palaceId: "children" },
  { id: "friends", title: "CH.11 교우궁" , palaceId: "friends" },
  { id: "master", title: "CH.12~14 사화·대운세운·마스터플랜" },
];
