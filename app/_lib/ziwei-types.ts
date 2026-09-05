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

const ZIWEI_TYPES_TEXT_TRANSLATIONS = {
  ko: {
    "ziweiTypes.001": "심화 자미두수 요약",
    "ziweiTypes.002": "명궁·신궁",
    "ziweiTypes.003": "형제궁",
    "ziweiTypes.004": "부부궁",
    "ziweiTypes.005": "자녀궁",
    "ziweiTypes.006": "재백궁",
    "ziweiTypes.007": "질액궁",
    "ziweiTypes.008": "천이궁",
    "ziweiTypes.009": "노복궁",
    "ziweiTypes.010": "관록궁",
    "ziweiTypes.011": "전택궁",
    "ziweiTypes.012": "복덕궁",
    "ziweiTypes.013": "부모궁",
    "ziweiTypes.014": "사화·대한·운용 전략",
  },
} as const;

function ziweiTypesText(key: keyof typeof ZIWEI_TYPES_TEXT_TRANSLATIONS.ko): string {
  return ZIWEI_TYPES_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
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
  strengthSymbol?: "◎" | "O" | "▲" | "△" | "X" | "";
  starType?: "main" | "assistant" | "malefic" | "minor" | "transform";
  transformation?: "화록" | "화권" | "화과" | "화기" | null;
}

export interface ZiweiCanonicalStar {
  name: string;
  type: "main" | "assistant" | "malefic" | "minor" | "transform";
  strength?: string;
  strengthSymbol?: "◎" | "O" | "▲" | "△" | "X" | "";
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

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

export interface ZiweiTransformation {
  type: "화록" | "화권" | "화과" | "화기";
  starName: string;
  palaceName?: string;
  influence: string;
}

/** 카드 하단 근거칩 한 칸. 명반에서 계산된 값을 그대로 옮기기만 한다. */
export interface ZiweiEvidenceChip {
  label: string;
  value: string;
}

export interface ZiweiPalaceCategoryReading {
  categoryTitle: string;
  categoryQuestion: string;
  usedSignals: string[];
  interpretation: string;
  /** 카드 맨 위 2인칭 한 줄. */
  headline?: string;
  /** 한 줄 핵심을 여는 상황 도입부. */
  scene?: string;
  strengths?: string[];
  cautions?: string[];
  actions?: string[];
  basisChips?: ZiweiEvidenceChip[];
  /** "왜 이렇게 읽었나" — 더 읽기 영역에만 노출한다. */
  evidenceNotes?: string[];
  /**
   * 🔴 해석 메타데이터 — 화면에 렌더링하지 않는다.
   * 절 제목·질문·상담 렌즈는 문장을 만드는 내부 근거일 뿐 사용자에게 필요한 정보가 아니다.
   */
  meta?: {
    categoryTitle: string;
    categoryQuestion: string;
    lens: string;
  };
  /** 기존 소비자 호환용(요약/실행 목록). 위 배열을 이어 붙인 값이다. */
  opportunity: string;
  caution: string;
  action: string;
}

export interface ZiweiDeepPalaceReading {
  palaceId: string;
  palaceName: string;
  palaceBranch?: string;
  isEmptyPalace: boolean;
  mainStars: ZiweiStarMeta[];
  supportStars: ZiweiStarMeta[];
  minorStars: ZiweiStarMeta[];
  transformations: ZiweiTransformation[];
  brightnessSummary: string;
  oppositePalace?: string;
  sanFangSiZheng?: {
    sourcePalaces: string[];
    keyStars: ZiweiStarMeta[];
    summary: string;
  };
  categories: ZiweiPalaceCategoryReading[];
  summary: string;
  practicalAdvice: string[];
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
  palaceReading?: ZiweiDeepPalaceReading;
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
  friends: "노복궁",
  career: "관록궁",
  property: "전택궁",
  fortune: "복덕궁",
  parents: "부모궁",
};

export const ZIWEI_SECTIONS: Array<{ id: ZiweiSectionId; title: string; palaceId?: ZiweiPalaceId }> = [
  { id: "overview", title: ziweiTypesText("ziweiTypes.001") },
  { id: "ming", title: ziweiTypesText("ziweiTypes.002"), palaceId: "ming" },
  { id: "siblings", title: ziweiTypesText("ziweiTypes.003"), palaceId: "siblings" },
  { id: "spouse", title: ziweiTypesText("ziweiTypes.004"), palaceId: "spouse" },
  { id: "children", title: ziweiTypesText("ziweiTypes.005"), palaceId: "children" },
  { id: "wealth", title: ziweiTypesText("ziweiTypes.006"), palaceId: "wealth" },
  { id: "health", title: ziweiTypesText("ziweiTypes.007"), palaceId: "health" },
  { id: "travel", title: ziweiTypesText("ziweiTypes.008"), palaceId: "travel" },
  { id: "friends", title: ziweiTypesText("ziweiTypes.009"), palaceId: "friends" },
  { id: "career", title: ziweiTypesText("ziweiTypes.010"), palaceId: "career" },
  { id: "property", title: ziweiTypesText("ziweiTypes.011"), palaceId: "property" },
  { id: "fortune", title: ziweiTypesText("ziweiTypes.012"), palaceId: "fortune" },
  { id: "parents", title: ziweiTypesText("ziweiTypes.013"), palaceId: "parents" },
  { id: "master", title: ziweiTypesText("ziweiTypes.014") },
];
