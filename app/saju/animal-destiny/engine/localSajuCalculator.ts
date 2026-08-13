import { Lunar } from "lunar-javascript";
import { cmsRecord } from "@/lib/cms/build-text";

const LOCAL_SAJU_CALCULATOR_TEXT_TRANSLATIONS = {
  ko: {
    "lsc_4823_attr_title": "QUANTUM MYEONGRI Engine v.2 고급 분석 리포트",
    "lsc_4827_prop_label": "양력/음력 변환 여부",
    "lsc_4828_prop_label": "절기 기준 사용 여부",
    "lsc_4829_prop_label": "출생지 시간대",
    "lsc_4830_prop_label": "진태양시 사용 여부",
    "lsc_4831_prop_label": "대운 시작 나이",
    "lsc_4832_prop_label": "대운 순행/역행",
    "lsc_4833_prop_label": "계산 신뢰도",
    "lsc_4840_prop_label": "일간",
    "lsc_4841_prop_label": "월령",
    "lsc_4842_prop_label": "지장간",
    "lsc_4843_prop_label": "십성 배치",
    "lsc_4844_prop_label": "오행 분포",
    "lsc_4845_prop_label": "조후 상태",
    "lsc_4848_prop_label": "신강/신약",
    "lsc_4849_prop_label": "조후",
    "lsc_4850_prop_label": "격국",
    "lsc_4851_prop_label": "용신",
    "lsc_4852_prop_label": "희신",
    "lsc_4853_prop_label": "기신",
    "lsc_4854_prop_label": "구신",
    "lsc_4855_prop_label": "사주의 병",
    "lsc_4856_prop_label": "사주의 약",
    "lsc_4857_prop_label": "가장 중요한 구조",
    "lsc_4860_prop_label": "월지 지장간",
    "lsc_4861_prop_label": "천간 투출 여부",
    "lsc_4862_prop_label": "숨은 재능",
    "lsc_4863_prop_label": "억눌린 욕구",
    "lsc_4864_prop_label": "대운·세운에서 열리는 시기",
    "lsc_4867_prop_label": "토오행 과다 여부",
    "lsc_4868_prop_label": "정신적 압박",
    "lsc_4869_prop_label": "숨은 잠재력",
    "lsc_4870_prop_label": "창고가 열리는 시기",
    "lsc_4871_prop_label": "불리하게 터지는 시기",
    "lsc_4874_prop_label": "중첩 지지",
    "lsc_4875_prop_label": "불러오는 반대 지지",
    "lsc_4876_prop_label": "용신/기신 변화",
    "lsc_4877_prop_label": "흉에서 길 전환",
    "lsc_4878_prop_label": "길에서 흉 전환",
    "lsc_4879_prop_label": "실제 사건 가능성",
    "lsc_4882_prop_label": "천간합",
    "lsc_4883_prop_label": "지지합",
    "lsc_4884_prop_label": "삼합",
    "lsc_4885_prop_label": "방합",
    "lsc_4886_prop_label": "충·형·파·해",
    "lsc_4887_prop_label": "합화/합거/용신파손/기신용신화",
    "lsc_4890_prop_label": "대운 간지",
    "lsc_4891_prop_label": "대운의 기반",
    "lsc_4892_prop_label": "대운 천간 합화·합거",
    "lsc_4893_prop_label": "대운 지지 지장간",
    "lsc_4894_prop_label": "대운 지지 합충형파해",
    "lsc_4895_prop_label": "대운 삼합·도충 발동",
    "lsc_4896_prop_label": "대운의 오행",
    "lsc_4897_prop_label": "대운의 십성",
    "lsc_4898_prop_label": "원국과의 작용",
    "lsc_4899_prop_label": "격국 영향",
    "lsc_4900_prop_label": "용신/기신 변화",
    "lsc_4901_prop_label": "전반 5년",
    "lsc_4902_prop_label": "후반 5년",
    "lsc_4903_prop_label": "대운 총평",
    "lsc_4904_prop_label": "대운 활용법",
    "lsc_4907_prop_label": "세운 간지",
    "lsc_4908_prop_label": "세운 사건성",
    "lsc_4909_prop_label": "세운 천간합",
    "lsc_4910_prop_label": "세운 천간충·조후 손상",
    "lsc_4911_prop_label": "세운 지지 중첩·도충",
    "lsc_4912_prop_label": "세운 최종 분류",
    "lsc_4913_prop_label": "대운과의 관계",
    "lsc_4914_prop_label": "원국과의 관계",
    "lsc_4915_prop_label": "올해 핵심 사건성",
    "lsc_4916_prop_label": "직업운",
    "lsc_4917_prop_label": "재물운",
    "lsc_4918_prop_label": "연애운",
    "lsc_4919_prop_label": "건강·심리",
    "lsc_4920_prop_label": "조심할 달",
    "lsc_4921_prop_label": "기회가 오는 달",
    "lsc_4924_prop_label": "겉모습",
    "lsc_4925_prop_label": "내면",
    "lsc_4926_prop_label": "강점",
    "lsc_4927_prop_label": "약점",
    "lsc_4928_prop_label": "스트레스 반응",
    "lsc_4929_prop_label": "인간관계 패턴",
    "lsc_4930_prop_label": "성장 처방",
    "lsc_4933_prop_label": "적합한 직업군",
    "lsc_4934_prop_label": "돈 버는 방식",
    "lsc_4935_prop_label": "조직/사업/프리랜서 적성",
    "lsc_4936_prop_label": "커리어 상승 시기",
    "lsc_4937_prop_label": "피해야 할 선택",
    "lsc_4938_prop_label": "지금 해야 할 행동",
    "lsc_4941_prop_label": "연애 스타일",
    "lsc_4942_prop_label": "끌리는 인연",
    "lsc_4943_prop_label": "반복되는 문제",
    "lsc_4944_prop_label": "결혼운",
    "lsc_4945_prop_label": "인연이 강한 시기",
    "lsc_4946_prop_label": "이별·갈등 주의 시기",
    "lsc_4947_prop_label": "관계 처방",
    "lsc_4950_prop_label": "주요 신살",
    "lsc_4951_prop_label": "위치",
    "lsc_4952_prop_label": "작용 방식",
    "lsc_4953_prop_label": "대운·세운 발동",
    "lsc_4956_prop_label": "흉에서 길로 바뀌는 요소",
    "lsc_4957_prop_label": "길에서 흉으로 바뀌는 요소",
    "lsc_4958_prop_label": "합화로 바뀌는 지점",
    "lsc_4959_prop_label": "도충 가능성",
    "lsc_4960_prop_label": "지금 가장 중요한 선택",
    "lsc_4961_prop_label": "놓치면 안 되는 기회",
    "lsc_4962_prop_label": "피해야 할 위험",
    "lsc_4963_prop_label": "실제 행동 처방",
    "lsc_4966_prop_label": "직업",
    "lsc_4968_prop_label": "연애",
    "lsc_4969_prop_label": "건강",
    "lsc_4970_prop_label": "인간관계",
    "lsc_4971_prop_label": "공간·방향·색상·습관",
    "lsc_4972_prop_label": "이번 대운에서 반드시 해야 할 것",
    "lsc_4973_prop_label": "올해 반드시 피해야 할 것",
  },
} as const;

function localSajuCalculatorText(key: keyof typeof LOCAL_SAJU_CALCULATOR_TEXT_TRANSLATIONS.ko) {
  return LOCAL_SAJU_CALCULATOR_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;
const MONTH_BOUNDARY_BRANCHES = ["축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해", "자"] as const;
const MONTH_BOUNDARIES = [
  { month: 1, day: 6, hour: 0, minute: 0 },
  { month: 2, day: 4, hour: 0, minute: 0 },
  { month: 3, day: 6, hour: 0, minute: 0 },
  { month: 4, day: 5, hour: 0, minute: 0 },
  { month: 5, day: 6, hour: 0, minute: 0 },
  { month: 6, day: 6, hour: 0, minute: 0 },
  { month: 7, day: 7, hour: 0, minute: 0 },
  { month: 8, day: 8, hour: 0, minute: 0 },
  { month: 9, day: 8, hour: 0, minute: 0 },
  { month: 10, day: 8, hour: 0, minute: 0 },
  { month: 11, day: 7, hour: 0, minute: 0 },
  { month: 12, day: 7, hour: 0, minute: 0 },
] as const;
const VALIDATED_SOLAR_TERMS_1990 = [
  { month: 1, day: 5, hour: 23, minute: 33 },
  { month: 2, day: 4, hour: 11, minute: 14 },
  { month: 3, day: 6, hour: 5, minute: 19 },
  { month: 4, day: 5, hour: 10, minute: 12 },
  { month: 5, day: 6, hour: 3, minute: 35 },
  { month: 6, day: 6, hour: 7, minute: 46 },
  { month: 7, day: 7, hour: 18, minute: 0 },
  { month: 8, day: 8, hour: 3, minute: 46 },
  { month: 9, day: 8, hour: 6, minute: 38 },
  { month: 10, day: 8, hour: 22, minute: 14 },
  { month: 11, day: 8, hour: 1, minute: 23 },
  { month: 12, day: 7, hour: 18, minute: 14 },
] as const;
const VALIDATED_SOLAR_TERMS_BY_YEAR: Record<number, readonly { month: number; day: number; hour: number; minute: number }[]> = {
  1990: VALIDATED_SOLAR_TERMS_1990,
};

type StemKr = (typeof STEMS)[number];
type BranchKr = (typeof BRANCHES)[number];

const STEM_HAN_TO_KO: Record<string, StemKr> = {
  甲: "갑",
  乙: "을",
  丙: "병",
  丁: "정",
  戊: "무",
  己: "기",
  庚: "경",
  辛: "신",
  壬: "임",
  癸: "계",
};

const BRANCH_HAN_TO_KO: Record<string, BranchKr> = {
  子: "자",
  丑: "축",
  寅: "인",
  卯: "묘",
  辰: "진",
  巳: "사",
  午: "오",
  未: "미",
  申: "신",
  酉: "유",
  戌: "술",
  亥: "해",
};

export interface SajuPillarLocal {
  stem: StemKr;
  branch: BranchKr;
  ganji: string;
}

export interface SolarTermBoundaryLocal {
  index: number;
  name: string;
  solarLongitude: number;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  isoLocal: string;
  source: "kasi" | "lunar-javascript" | "validated-table" | "fixed-fallback";
}

export interface DaewoonStartLocal {
  age: number | null;
  years: number;
  months: number;
  days: number;
  baseTerm: SolarTermBoundaryLocal | null;
}

export interface NatalAnalysisLocal {
  dayMaster: Record<string, unknown>;
  monthCommand: Record<string, unknown>;
  fiveElements: Record<string, unknown>;
  tenGods: Record<string, unknown>;
  hiddenStemActivation: Record<string, unknown>;
  earthStorageAnalysis: Record<string, unknown>;
  doChungAnalysis: Record<string, unknown>;
  combinationClashAnalysis: Record<string, unknown>;
  gyeokgukAnalysis: Record<string, unknown>;
  yongshinAnalysis: Record<string, unknown>;
  daewoonAnalysis: Record<string, unknown>;
  luckInteractionDetailAnalysis: Record<string, unknown>;
  transformationTimingAnalysis: Record<string, unknown>;
  personalityAnalysis: Record<string, unknown>;
  careerAnalysis: Record<string, unknown>;
  loveMarriageAnalysis: Record<string, unknown>;
  shinsalAnalysis: Record<string, unknown>;
  scoringAnalysis: Record<string, unknown>;
  rooting: Record<string, unknown>;
  johu: Record<string, unknown>;
  structuralIssues: Array<Record<string, unknown>>;
  usefulElements: Record<string, unknown>;
  evidence: Record<string, unknown>;
}

export interface LocalSajuResult {
  pillars: {
    year: SajuPillarLocal;
    month: SajuPillarLocal;
    day: SajuPillarLocal;
    hour: SajuPillarLocal | null;
  };
  fourPillars: {
    year: SajuPillarLocal;
    month: SajuPillarLocal;
    day: SajuPillarLocal;
    hour: SajuPillarLocal | null;
  };
  dayStem: StemKr;
  timeUnknown: boolean;
  solarTermBoundary: {
    active: SolarTermBoundaryLocal;
    previous: SolarTermBoundaryLocal | null;
    next: SolarTermBoundaryLocal | null;
    ipchun: SolarTermBoundaryLocal;
  };
  daewoonStartAge: number | null;
  daewoonStart: DaewoonStartLocal;
  daewoonDirection: "forward" | "reverse" | "unknown";
  timezone: string;
  /** 시주 시각 보정이 실제로 적용됐는지. 어떤 정책이었는지는 hourPillarTimePolicy 로 구분한다. */
  trueSolarTimeUsed: boolean;
  hourPillarTimePolicy: HourPillarTimePolicy;
  natalAnalysis: NatalAnalysisLocal;
  structuredAdvancedReport: Record<string, unknown>;
  finalAdvancedReport: Record<string, unknown>;
  calculationEvidence: Record<string, unknown>;
}

/**
 * 시주(時柱) 시각 보정 정책. 문자열 값은 worker/lib/destiny-bias-engine.js 의
 * HOUR_PILLAR_TIME_POLICIES 와 동일해야 한다(정적 셸 포함 3개 엔진이 같은 정책을 쓴다).
 */
export type HourPillarTimePolicy = "KST_CLOCK_TIME" | "LOCAL_MEAN_TIME" | "TRUE_SOLAR_TIME";

export interface LocalSajuInput {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  hasTime: boolean;
  calendarType?: "solar" | "lunar";
  lunarLeap?: boolean;
  longitude?: number;
  latitude?: number;
  birthLongitude?: number;
  birthLatitude?: number;
  standardMeridian?: number;
  timezone?: string;
  timezoneOffset?: number;
  timezoneOffsetMinutes?: number;
  daylightSavingTime?: boolean;
  hourPillarTimePolicy?: HourPillarTimePolicy;
  useTrueSolarTime?: boolean;
  trueSolarTime?: boolean;
  trueSolarTimeCorrection?: boolean;
  gender?: "male" | "female" | "unknown" | "M" | "F" | "남" | "여" | "";
  sex?: "male" | "female" | "unknown" | "M" | "F" | "남" | "여" | "";
  zashiMode?: "early" | "late" | "jo" | "ya" | "standard";
  locationType?: "birthplace" | "current";
  usingCurrentLocation?: boolean;
  birthplace?: string;
  luckPillars?: Array<{ scope?: "daewoon" | "annual" | "monthly" | "daily" | string; stem?: StemKr; branch?: BranchKr; ganji?: string; label?: string }>;
  // KASI(한국천문연구원) 권위 데이터 주입(어댑터가 /api/kasi/calendar로 프리페치해 채운다).
  // 음력 입력의 KASI 양력 변환 결과. 있으면 resolveSolarDate가 이를 우선한다.
  kasiSolarDate?: { year: number; month: number; day: number };
  // KASI 24절기 원본(한글 절기명 + KST isoLocal). 여러 해가 섞여 있어도 되며, 연·節 기준으로 버킷팅한다.
  kasiSolarTerms?: Array<{ name?: string; isoLocal?: string }>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toStemKo(raw: string): StemKr {
  const normalized = String(raw || "").trim();
  const ko = STEM_HAN_TO_KO[normalized];
  if (ko) return ko;
  if ((STEMS as readonly string[]).includes(normalized)) return normalized as StemKr;
  throw new Error(`알 수 없는 천간 값입니다: ${normalized || "(empty)"}`);
}

function toBranchKo(raw: string): BranchKr {
  const normalized = String(raw || "").trim();
  const ko = BRANCH_HAN_TO_KO[normalized];
  if (ko) return ko;
  if ((BRANCHES as readonly string[]).includes(normalized)) return normalized as BranchKr;
  throw new Error(`알 수 없는 지지 값입니다: ${normalized || "(empty)"}`);
}

function makePillar(stemRaw: string, branchRaw: string): SajuPillarLocal {
  const stem = toStemKo(stemRaw);
  const branch = toBranchKo(branchRaw);
  return {
    stem,
    branch,
    ganji: `${stem}${branch}`,
  };
}

function resolveSolarDate(input: LocalSajuInput) {
  // KASI 음양력 변환 결과가 있으면 권위 값으로 우선한다(로컬 lunar-javascript 변환보다 우선).
  const kasiSolar = input.kasiSolarDate;
  if (
    kasiSolar
    && Number.isFinite(kasiSolar.year)
    && Number.isFinite(kasiSolar.month)
    && Number.isFinite(kasiSolar.day)
  ) {
    return {
      year: Number(kasiSolar.year),
      month: Number(kasiSolar.month),
      day: Number(kasiSolar.day),
    };
  }

  if (input.calendarType === "lunar") {
    const lunarMonth = input.lunarLeap ? -Math.abs(input.month) : Math.abs(input.month);
    const lunar = Lunar.fromYmd(input.year, lunarMonth, input.day);
    const solar = lunar.getSolar();
    return {
      year: solar.getYear(),
      month: solar.getMonth(),
      day: solar.getDay(),
    };
  }

  return {
    year: input.year,
    month: input.month,
    day: input.day,
  };
}

function makePillarByIndex(index: number): SajuPillarLocal {
  return makePillar(STEMS[((index % 10) + 10) % 10], BRANCHES[((index % 12) + 12) % 12]);
}

function shiftDatePartsByDays(year: number, month: number, day: number, dayOffset: number) {
  const shifted = new Date(Date.UTC(year, month - 1, day) + dayOffset * 86400000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function getDayOfYearUtc(year: number, month: number, day: number): number {
  return Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000) + 1;
}

function equationOfTimeMinutes(year: number, month: number, day: number): number {
  const n = getDayOfYearUtc(year, month, day);
  const b = (2 * Math.PI * (n - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

const DEFAULT_TIMEZONE = "Asia/Seoul";
const SOLAR_TERM_BASE_OFFSET_MINUTES = 480;
const JIE_BOUNDARY_NAMES = [
  "\u5c0f\u5bd2",
  "\u7acb\u6625",
  "\u60ca\u86f0",
  "\u6e05\u660e",
  "\u7acb\u590f",
  "\u8292\u79cd",
  "\u5c0f\u6691",
  "\u7acb\u79cb",
  "\u767d\u9732",
  "\u5bd2\u9732",
  "\u7acb\u51ac",
  "\u5927\u96ea",
] as const;
const JIE_SOLAR_LONGITUDES = [285, 315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255] as const;
const TIMEZONE_OFFSETS: Record<string, number> = {
  UTC: 0,
  "Asia/Seoul": 540,
  "Asia/Tokyo": 540,
  "Asia/Shanghai": 480,
  "Asia/Taipei": 480,
  "Asia/Hong_Kong": 480,
  "America/New_York": -300,
  "America/Chicago": -360,
  "America/Denver": -420,
  "America/Los_Angeles": -480,
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatIsoLocal(parts: { year: number; month: number; day: number; hour: number; minute: number; second?: number }): string {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second || 0)}`;
}

function shiftWallTimeByMinutes(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  deltaMinutes: number,
) {
  const shifted = new Date(Date.UTC(year, month - 1, day, hour, minute, 0) + deltaMinutes * 60000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function wallTimeToInstantMs(
  parts: { year: number; month: number; day: number; hour: number; minute: number; second?: number },
  timezoneOffsetMinutes: number,
): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second || 0) - timezoneOffsetMinutes * 60000;
}

function instantMsToWallParts(instantMs: number, timezoneOffsetMinutes: number) {
  const local = new Date(instantMs + timezoneOffsetMinutes * 60000);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
    second: local.getUTCSeconds(),
  };
}

function normalizeTimezone(input: LocalSajuInput) {
  const timezone = String(input.timezone || DEFAULT_TIMEZONE).trim() || DEFAULT_TIMEZONE;
  const explicitOffset = Number.isFinite(input.timezoneOffsetMinutes)
    ? Number(input.timezoneOffsetMinutes)
    : Number.isFinite(input.timezoneOffset)
      ? Number(input.timezoneOffset)
      : undefined;
  const offsetMinutes = explicitOffset == null
    ? (TIMEZONE_OFFSETS[timezone] ?? TIMEZONE_OFFSETS[DEFAULT_TIMEZONE])
    : Math.abs(explicitOffset) <= 16
      ? explicitOffset * 60
      : explicitOffset;

  return {
    timezone,
    offsetMinutes,
  };
}

function getInputLongitude(input: LocalSajuInput): number | null {
  const value = Number.isFinite(input.birthLongitude)
    ? Number(input.birthLongitude)
    : Number.isFinite(input.longitude)
      ? Number(input.longitude)
      : NaN;
  return Number.isFinite(value) ? value : null;
}

function getInputLatitude(input: LocalSajuInput): number | null {
  const value = Number.isFinite(input.birthLatitude)
    ? Number(input.birthLatitude)
    : Number.isFinite(input.latitude)
      ? Number(input.latitude)
      : NaN;
  return Number.isFinite(value) ? value : null;
}

/** 경도가 주어지지 않은 한국(UTC+9) 출생에 쓰는 기본 경도. 워커 DEFAULT_LOCATION.longitude 와 같다. */
const DEFAULT_KST_LONGITUDE = 126.978;
const KST_OFFSET_MINUTES = 540;

function resolveHourPillarTimePolicy(input: LocalSajuInput): HourPillarTimePolicy {
  const explicit = String(input.hourPillarTimePolicy || "").trim().toUpperCase();
  if (explicit === "KST_CLOCK_TIME") return "KST_CLOCK_TIME";
  if (explicit === "LOCAL_MEAN_TIME") return "LOCAL_MEAN_TIME";
  if (explicit === "TRUE_SOLAR_TIME") return "TRUE_SOLAR_TIME";
  // 레거시 플래그: 진태양시를 명시로 요구한 호출부는 그대로 둔다.
  if (input.useTrueSolarTime ?? input.trueSolarTime ?? input.trueSolarTimeCorrection) return "TRUE_SOLAR_TIME";
  // 기본값은 평균태양시(경도 보정만) — 정적 셸·워커 엔진과 같은 정책.
  return "LOCAL_MEAN_TIME";
}

function resolveHourPillarLongitude(input: LocalSajuInput, timezoneOffsetMinutes: number): number | null {
  const explicit = getInputLongitude(input);
  if (explicit != null) return explicit;
  // 경도가 없으면 한국 표준시(UTC+9) 출생만 서울 기본 경도로 보정한다.
  // 다른 표준시대에 서울 경도를 먹이면 뉴욕 기준 (126.978 − (−75)) × 4 = +807분이 되어 시주가 통째로 깨진다.
  return timezoneOffsetMinutes === KST_OFFSET_MINUTES ? DEFAULT_KST_LONGITUDE : null;
}

function normalizeGender(input: LocalSajuInput): "male" | "female" | "unknown" {
  const raw = String(input.gender || input.sex || "").trim().toLowerCase();
  if (raw === "male" || raw === "m" || raw === "남") return "male";
  if (raw === "female" || raw === "f" || raw === "여") return "female";
  return "unknown";
}

function normalizeZashiMode(input: LocalSajuInput): "early" | "late" {
  const raw = String(input.zashiMode || "late").trim().toLowerCase();
  return raw === "early" || raw === "jo" ? "early" : "late";
}

function applyHourPillarTimeCorrection(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  input: LocalSajuInput,
  timezoneOffsetMinutes: number,
  policy: HourPillarTimePolicy,
) {
  if (policy === "KST_CLOCK_TIME") return null;
  const longitude = resolveHourPillarLongitude(input, timezoneOffsetMinutes);
  if (longitude == null) return null;
  const standardMeridian = Number.isFinite(input.standardMeridian) ? Number(input.standardMeridian) : (timezoneOffsetMinutes / 60) * 15;
  const equationOfTime = policy === "TRUE_SOLAR_TIME" ? equationOfTimeMinutes(year, month, day) : 0;
  const correctedTotal = hour * 60 + minute + (longitude - standardMeridian) * 4 + equationOfTime;
  const roundedTotal = Math.round(correctedTotal);
  const dayOffset = Math.floor(roundedTotal / 1440);
  const minuteOfDay = ((roundedTotal % 1440) + 1440) % 1440;
  const shifted = shiftDatePartsByDays(year, month, day, dayOffset);
  return {
    ...shifted,
    hour: Math.floor(minuteOfDay / 60),
    minute: minuteOfDay % 60,
  };
}

function boundaryInstantMs(boundary: SolarTermBoundaryLocal, timezoneOffsetMinutes: number): number {
  return wallTimeToInstantMs(boundary, timezoneOffsetMinutes);
}

function buildSolarTermBoundariesFromLunar(year: number, timezoneOffsetMinutes: number): SolarTermBoundaryLocal[] {
  const table = Lunar.fromYmd(year, 1, 1).getJieQiTable() as Record<string, {
    getYear: () => number;
    getMonth: () => number;
    getDay: () => number;
    getHour: () => number;
    getMinute: () => number;
    getSecond: () => number;
  }>;

  return JIE_BOUNDARY_NAMES.map((name, index) => {
    const solar = table[name];
    if (!solar) throw new Error(`missing solar term: ${name}`);
    const instantMs = Date.UTC(
      solar.getYear(),
      solar.getMonth() - 1,
      solar.getDay(),
      solar.getHour(),
      solar.getMinute(),
      solar.getSecond(),
    ) - SOLAR_TERM_BASE_OFFSET_MINUTES * 60000;
    const local = instantMsToWallParts(instantMs, timezoneOffsetMinutes);
    return {
      index,
      name,
      solarLongitude: JIE_SOLAR_LONGITUDES[index],
      ...local,
      isoLocal: formatIsoLocal(local),
      source: "lunar-javascript" as const,
    };
  });
}

function buildTableSolarTermBoundary(
  year: number,
  boundary: { month: number; day: number; hour: number; minute: number },
  index: number,
  source: "validated-table" | "fixed-fallback",
): SolarTermBoundaryLocal {
  const parts = {
    year,
    month: boundary.month,
    day: boundary.day,
    hour: boundary.hour,
    minute: boundary.minute,
    second: 0,
  };
  return {
    index,
    name: JIE_BOUNDARY_NAMES[index],
    solarLongitude: JIE_SOLAR_LONGITUDES[index],
    ...parts,
    isoLocal: formatIsoLocal(parts),
    source,
  };
}

// KASI 24절기 중 월 경계가 되는 12개 節(jie)의 한글명 → JIE_BOUNDARY_NAMES 인덱스.
// 나머지 12개 氣(우수·춘분 등)는 월 경계가 아니므로 무시한다.
const KASI_JIE_NAME_TO_INDEX: Record<string, number> = {
  "소한": 0,
  "입춘": 1,
  "경칩": 2,
  "청명": 3,
  "입하": 4,
  "망종": 5,
  "소서": 6,
  "입추": 7,
  "백로": 8,
  "한로": 9,
  "입동": 10,
  "대설": 11,
};

// KASI 절기(한글명 + KST isoLocal)를 연도별 12節 경계 배열로 변환한다.
// KASI isoLocal은 이미 KST 벽시계 시각이므로 CST 오프셋 보정 없이 그대로 벽시계 파트로 사용한다.
// 12개 節은 모두 같은 양력 연도(1월 소한 ~ 12월 대설) 안에 들어오므로 양력 연도로 버킷팅한다.
function buildKasiSolarTermBoundariesByYear(
  kasiSolarTerms: Array<{ name?: string; isoLocal?: string }> | undefined,
): Map<number, SolarTermBoundaryLocal[]> {
  const byYear = new Map<number, SolarTermBoundaryLocal[]>();
  if (!Array.isArray(kasiSolarTerms) || !kasiSolarTerms.length) return byYear;

  for (const term of kasiSolarTerms) {
    const name = String(term?.name || "").trim();
    const index = KASI_JIE_NAME_TO_INDEX[name];
    if (index == null) continue;
    const iso = String(term?.isoLocal || "").trim();
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!m) continue;

    const parts = {
      year: Number(m[1]),
      month: Number(m[2]),
      day: Number(m[3]),
      hour: Number(m[4]),
      minute: Number(m[5]),
      second: Number(m[6] || 0),
    };
    if (!Number.isFinite(parts.year) || !Number.isFinite(parts.month) || !Number.isFinite(parts.day)) continue;

    const boundary: SolarTermBoundaryLocal = {
      index,
      name: JIE_BOUNDARY_NAMES[index],
      solarLongitude: JIE_SOLAR_LONGITUDES[index],
      ...parts,
      isoLocal: formatIsoLocal(parts),
      source: "kasi",
    };

    const bucket = byYear.get(parts.year) || [];
    if (!bucket.some((b) => b.index === index)) {
      bucket.push(boundary);
      byYear.set(parts.year, bucket);
    }
  }

  byYear.forEach((bucket) => bucket.sort((a, b) => a.index - b.index));
  return byYear;
}

function getSolarTermBoundaries(
  year: number,
  timezoneOffsetMinutes: number,
  kasiByYear?: Map<number, SolarTermBoundaryLocal[]>,
): SolarTermBoundaryLocal[] {
  // KASI가 해당 연도의 12節을 모두 제공하면 권위 데이터로 최우선 사용한다.
  const kasi = kasiByYear?.get(year);
  if (kasi && kasi.length >= 12) return kasi;

  try {
    const boundaries = buildSolarTermBoundariesFromLunar(year, timezoneOffsetMinutes);
    if (boundaries.length >= 12) return boundaries;
  } catch {
    // Fallback is explicit in calculationEvidence; never silently invent API precision.
  }

  const verified = VALIDATED_SOLAR_TERMS_BY_YEAR[year];
  if (verified && verified.length >= 12) {
    return verified.map((boundary, index) => buildTableSolarTermBoundary(year, boundary, index, "validated-table"));
  }
  return MONTH_BOUNDARIES.map((boundary, index) => buildTableSolarTermBoundary(year, boundary, index, "fixed-fallback"));
}

function getSolarTermWindow(
  corrected: { year: number; month: number; day: number; hour: number; minute: number },
  timezoneOffsetMinutes: number,
  kasiByYear?: Map<number, SolarTermBoundaryLocal[]>,
) {
  const birthMs = wallTimeToInstantMs(corrected, timezoneOffsetMinutes);
  const candidates = [
    ...getSolarTermBoundaries(corrected.year - 1, timezoneOffsetMinutes, kasiByYear),
    ...getSolarTermBoundaries(corrected.year, timezoneOffsetMinutes, kasiByYear),
    ...getSolarTermBoundaries(corrected.year + 1, timezoneOffsetMinutes, kasiByYear),
  ].sort((a, b) => boundaryInstantMs(a, timezoneOffsetMinutes) - boundaryInstantMs(b, timezoneOffsetMinutes));
  if (!candidates.length) {
    const fallback = buildTableSolarTermBoundary(corrected.year, MONTH_BOUNDARIES[0], 0, "fixed-fallback");
    return {
      active: fallback,
      previous: null,
      next: null,
    };
  }

  let previous: SolarTermBoundaryLocal | null = null;
  let next: SolarTermBoundaryLocal | null = null;
  for (const boundary of candidates) {
    const boundaryMs = boundaryInstantMs(boundary, timezoneOffsetMinutes);
    if (boundaryMs <= birthMs) previous = boundary;
    if (boundaryMs > birthMs) {
      next = boundary;
      break;
    }
  }

  return {
    active: previous || candidates[0],
    previous,
    next,
  };
}

function getYearPillar(
  corrected: { year: number; month: number; day: number; hour: number; minute: number },
  timezoneOffsetMinutes: number,
  kasiByYear?: Map<number, SolarTermBoundaryLocal[]>,
) {
  const ipchun = getSolarTermBoundaries(corrected.year, timezoneOffsetMinutes, kasiByYear)[1]
    || buildTableSolarTermBoundary(corrected.year, MONTH_BOUNDARIES[1], 1, "fixed-fallback");
  const pillarYear = wallTimeToInstantMs(corrected, timezoneOffsetMinutes) >= boundaryInstantMs(ipchun, timezoneOffsetMinutes)
    ? corrected.year
    : corrected.year - 1;
  return {
    pillar: makePillarByIndex(pillarYear - 1984),
    pillarYear,
    ipchun,
  };
}

function getMonthPillar(yearStem: StemKr, activeBoundary: SolarTermBoundaryLocal) {
  const boundaryIndex = Number.isFinite(activeBoundary?.index) ? activeBoundary.index : 0;
  const branch = MONTH_BOUNDARY_BRANCHES[boundaryIndex] || "축";
  const yinStartStemIndex = yearStem === "갑" || yearStem === "기"
    ? 2
    : yearStem === "을" || yearStem === "경"
      ? 4
      : yearStem === "병" || yearStem === "신"
        ? 6
        : yearStem === "정" || yearStem === "임"
          ? 8
          : 0;
  const branchIndex = BRANCHES.indexOf(branch);
  const offset = ((branchIndex - 2) + 12) % 12;
  return makePillar(STEMS[(yinStartStemIndex + offset) % 10], branch);
}

function getDayPillar(corrected: { year: number; month: number; day: number }) {
  const serial = Math.floor(Date.UTC(corrected.year, corrected.month - 1, corrected.day) / 86400000);
  return makePillarByIndex(serial + 17);
}

function getDayPillarDate(corrected: { year: number; month: number; day: number; hour: number; minute: number }, zashiMode: "early" | "late") {
  if (zashiMode === "early" && corrected.hour >= 23) {
    return shiftDatePartsByDays(corrected.year, corrected.month, corrected.day, 1);
  }
  return {
    year: corrected.year,
    month: corrected.month,
    day: corrected.day,
  };
}

function getHourPillar(dayStem: StemKr, corrected: { hour: number }) {
  const startIndex = dayStem === "갑" || dayStem === "기"
    ? 0
    : dayStem === "을" || dayStem === "경"
      ? 2
      : dayStem === "병" || dayStem === "신"
        ? 4
        : dayStem === "정" || dayStem === "임"
          ? 6
          : 8;
  const branchIndex = Math.floor((corrected.hour + 1) / 2) % 12;
  return makePillar(STEMS[(startIndex + branchIndex) % 10], BRANCHES[branchIndex]);
}

function getDaewoonDirection(input: LocalSajuInput, yearStem: StemKr): "forward" | "reverse" | "unknown" {
  const gender = normalizeGender(input);
  if (gender === "unknown") return "unknown";
  const isYangYearStem = STEMS.indexOf(yearStem) % 2 === 0;
  return (gender === "male" && isYangYearStem) || (gender === "female" && !isYangYearStem) ? "forward" : "reverse";
}

function calculateDaewoonStart(
  direction: "forward" | "reverse" | "unknown",
  birth: { year: number; month: number; day: number; hour: number; minute: number },
  solarTermWindow: { previous: SolarTermBoundaryLocal | null; next: SolarTermBoundaryLocal | null },
  timezoneOffsetMinutes: number,
): DaewoonStartLocal {
  const baseTerm = direction === "forward"
    ? solarTermWindow.next
    : direction === "reverse"
      ? solarTermWindow.previous
      : null;
  if (!baseTerm) {
    return {
      age: null,
      years: 0,
      months: 0,
      days: 0,
      baseTerm: null,
    };
  }

  const diffHours = Math.abs(boundaryInstantMs(baseTerm, timezoneOffsetMinutes) - wallTimeToInstantMs(birth, timezoneOffsetMinutes)) / 3600000;
  // Traditional daewoon conversion: 3 days = 1 year, 1 day = 4 months, 1 hour = about 5 life-days.
  const age = diffHours / 72;
  const years = Math.floor(age);
  const monthFloat = (age - years) * 12;
  const months = Math.floor(monthFloat);
  const days = Math.round((monthFloat - months) * 30);

  return {
    age: Math.round(age * 100) / 100,
    years,
    months,
    days,
    baseTerm,
  };
}

type ElementKey = "wood" | "fire" | "earth" | "metal" | "water";
export type TenGodName = "비견" | "겁재" | "식신" | "상관" | "편재" | "정재" | "편관" | "정관" | "편인" | "정인";
type PillarKey = "year" | "month" | "day" | "hour";

const ELEMENTS: readonly ElementKey[] = ["wood", "fire", "earth", "metal", "water"] as const;
const TEN_GODS: readonly TenGodName[] = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"] as const;
const PILLAR_KEYS: readonly PillarKey[] = ["year", "month", "day", "hour"] as const;
const ELEMENT_KO: Record<ElementKey, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};
const PRODUCES: Record<ElementKey, ElementKey> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};
const CONTROLS: Record<ElementKey, ElementKey> = {
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
  metal: "wood",
};
const STEM_ELEMENT: Record<StemKr, ElementKey> = {
  [STEMS[0]]: "wood",
  [STEMS[1]]: "wood",
  [STEMS[2]]: "fire",
  [STEMS[3]]: "fire",
  [STEMS[4]]: "earth",
  [STEMS[5]]: "earth",
  [STEMS[6]]: "metal",
  [STEMS[7]]: "metal",
  [STEMS[8]]: "water",
  [STEMS[9]]: "water",
};
const BRANCH_MAIN_ELEMENT: Record<BranchKr, ElementKey> = {
  [BRANCHES[0]]: "water",
  [BRANCHES[1]]: "earth",
  [BRANCHES[2]]: "wood",
  [BRANCHES[3]]: "wood",
  [BRANCHES[4]]: "earth",
  [BRANCHES[5]]: "fire",
  [BRANCHES[6]]: "fire",
  [BRANCHES[7]]: "earth",
  [BRANCHES[8]]: "metal",
  [BRANCHES[9]]: "metal",
  [BRANCHES[10]]: "earth",
  [BRANCHES[11]]: "water",
};
const HIDDEN_STEMS_BY_BRANCH: Record<BranchKr, Array<{ stem: StemKr; weight: number }>> = {
  [BRANCHES[0]]: [{ stem: STEMS[9], weight: 1 }],
  [BRANCHES[1]]: [{ stem: STEMS[5], weight: 0.6 }, { stem: STEMS[9], weight: 0.3 }, { stem: STEMS[7], weight: 0.1 }],
  [BRANCHES[2]]: [{ stem: STEMS[0], weight: 0.6 }, { stem: STEMS[2], weight: 0.25 }, { stem: STEMS[4], weight: 0.15 }],
  [BRANCHES[3]]: [{ stem: STEMS[1], weight: 1 }],
  [BRANCHES[4]]: [{ stem: STEMS[4], weight: 0.6 }, { stem: STEMS[1], weight: 0.3 }, { stem: STEMS[9], weight: 0.1 }],
  [BRANCHES[5]]: [{ stem: STEMS[2], weight: 0.6 }, { stem: STEMS[4], weight: 0.25 }, { stem: STEMS[6], weight: 0.15 }],
  [BRANCHES[6]]: [{ stem: STEMS[3], weight: 0.7 }, { stem: STEMS[5], weight: 0.3 }],
  [BRANCHES[7]]: [{ stem: STEMS[5], weight: 0.6 }, { stem: STEMS[3], weight: 0.25 }, { stem: STEMS[1], weight: 0.15 }],
  [BRANCHES[8]]: [{ stem: STEMS[6], weight: 0.6 }, { stem: STEMS[8], weight: 0.25 }, { stem: STEMS[4], weight: 0.15 }],
  [BRANCHES[9]]: [{ stem: STEMS[7], weight: 1 }],
  [BRANCHES[10]]: [{ stem: STEMS[4], weight: 0.6 }, { stem: STEMS[7], weight: 0.25 }, { stem: STEMS[3], weight: 0.15 }],
  [BRANCHES[11]]: [{ stem: STEMS[8], weight: 0.7 }, { stem: STEMS[0], weight: 0.3 }],
};
const PILLAR_STEM_WEIGHT: Record<PillarKey, number> = { year: 0.8, month: 1.15, day: 1, hour: 0.85 };
const PILLAR_BRANCH_WEIGHT: Record<PillarKey, number> = { year: 0.75, month: 1.5, day: 1.15, hour: 0.95 };
const PILLAR_ROOT_WEIGHT: Record<PillarKey, number> = { year: 0.8, month: 1.55, day: 1.35, hour: 1.1 };
const HIDDEN_STEM_PROTRUSION_WEIGHT: Record<PillarKey, number> = { year: 0.55, month: 1.25, day: 0.9, hour: 0.7 };
const HIDDEN_STEM_PROTRUSION_LEVEL: Record<PillarKey, string> = {
  year: "중간",
  month: "매우 강함",
  day: "강함",
  hour: "중강",
};
const PILLAR_LIFE_AREA: Record<PillarKey, string> = {
  year: "가문, 초기 환경, 사회적 배경",
  month: "월령, 직업 환경, 사회적 실권",
  day: "개인 내면, 배우자궁, 실제 행동 패턴",
  hour: "말년, 자식, 창작, 결과물, 미래 지향성",
};
const EARTH_STORAGE_BRANCHES = new Set<BranchKr>([BRANCHES[4], BRANCHES[10], BRANCHES[1], BRANCHES[7]]);
const EARTH_STORAGE_PROFILE: Partial<Record<BranchKr, Record<string, unknown>>> = {
  [BRANCHES[4]]: {
    type: "습토",
    hiddenPotential: "을목·계수·무토를 품어 목과 수의 잠재력이 살아 있는 변화 전의 봄 흙",
    pressure: "변화 직전의 긴장, 결정 지연, 감정과 현실 사이의 복합성",
    develop: ["목의 성장성", "수의 유연성", "토의 조율력"],
  },
  [BRANCHES[10]]: {
    type: "조토",
    hiddenPotential: "신금·정화·무토를 품어 금과 화의 잔재가 강한 마른 가을 흙",
    pressure: "강한 신념, 고집, 건조한 판단, 오래 묵은 감정의 굳어짐",
    develop: ["금의 정리력", "화의 명료함", "토의 책임감"],
  },
  [BRANCHES[1]]: {
    type: "한습토",
    hiddenPotential: "계수·신금·기토를 품어 수와 금을 저장하는 차갑고 오래 버티는 흙",
    pressure: "신중함, 걱정, 침잠, 늦게 풀리는 현실 부담",
    develop: ["수의 회복력", "금의 기준", "토의 지속력"],
  },
  [BRANCHES[7]]: {
    type: "조습혼합토",
    hiddenPotential: "정화·을목·기토를 품어 화와 목의 잠재력이 숨어 있는 여름 끝의 흙",
    pressure: "감정, 창작 욕구, 관계 피로, 말하지 못한 마음의 누적",
    develop: ["화의 표현력", "목의 관계성", "토의 수용력"],
  },
};

function emptyElementScores(): Record<ElementKey, number> {
  return { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
}

function emptyTenGodScores(): Record<TenGodName, number> {
  return TEN_GODS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Record<TenGodName, number>);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundScores<T extends string>(scores: Record<T, number>): Record<T, number> {
  return Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, round2(Number(value))])) as Record<T, number>;
}

function addElementScore(scores: Record<ElementKey, number>, element: ElementKey, value: number): void {
  scores[element] += value;
}

function getStemPolarity(stem: StemKr): "yang" | "yin" {
  return STEMS.indexOf(stem) % 2 === 0 ? "yang" : "yin";
}

function getProducerOf(element: ElementKey): ElementKey {
  return ELEMENTS.find((candidate) => PRODUCES[candidate] === element) || "water";
}

function getControllerOf(element: ElementKey): ElementKey {
  return ELEMENTS.find((candidate) => CONTROLS[candidate] === element) || "metal";
}

function getSeasonProfile(monthBranch: BranchKr) {
  const weights = emptyElementScores();
  ELEMENTS.forEach((element) => {
    weights[element] = 1;
  });

  let season = "환절기";
  let temperature = 0;
  let humidity = 0;
  let dryness = 0;
  if (monthBranch === BRANCHES[2] || monthBranch === BRANCHES[3]) {
    season = "봄 목왕절";
    Object.assign(weights, { wood: 1.55, fire: 1.15, earth: 0.9, metal: 0.75, water: 0.95 });
    temperature = 0.15;
    humidity = 0.25;
  } else if (monthBranch === BRANCHES[5] || monthBranch === BRANCHES[6]) {
    season = "여름 화왕절";
    Object.assign(weights, { wood: 1.05, fire: 1.6, earth: 1.15, metal: 0.85, water: 0.65 });
    temperature = 1.55;
    dryness = 1.15;
  } else if (monthBranch === BRANCHES[8] || monthBranch === BRANCHES[9]) {
    season = "가을 금왕절";
    Object.assign(weights, { wood: 0.65, fire: 0.85, earth: 1, metal: 1.55, water: 1.1 });
    temperature = -0.15;
    dryness = 1;
  } else if (monthBranch === BRANCHES[11] || monthBranch === BRANCHES[0]) {
    season = "겨울 수왕절";
    Object.assign(weights, { wood: 1.1, fire: 0.65, earth: 0.85, metal: 1, water: 1.6 });
    temperature = -1.55;
    humidity = 1.2;
  } else {
    season = "토왕 환절기";
    Object.assign(weights, { wood: 0.9, fire: 0.95, earth: 1.45, metal: 1, water: 0.95 });
    humidity = monthBranch === BRANCHES[1] || monthBranch === BRANCHES[4] ? 0.85 : 0.15;
    dryness = monthBranch === BRANCHES[7] || monthBranch === BRANCHES[10] ? 0.85 : 0.15;
    temperature = monthBranch === BRANCHES[1] ? -0.7 : monthBranch === BRANCHES[7] ? 0.6 : 0;
  }

  return {
    season,
    dominantElement: BRANCH_MAIN_ELEMENT[monthBranch],
    weights,
    climateBase: {
      temperature,
      humidity,
      dryness,
      coldness: Math.max(0, -temperature),
    },
  };
}

export function tenGodForStem(dayStem: StemKr, targetStem: StemKr): TenGodName {
  const dayElement = STEM_ELEMENT[dayStem];
  const targetElement = STEM_ELEMENT[targetStem];
  const samePolarity = getStemPolarity(dayStem) === getStemPolarity(targetStem);
  if (targetElement === dayElement) return samePolarity ? "비견" : "겁재";
  if (PRODUCES[dayElement] === targetElement) return samePolarity ? "식신" : "상관";
  if (CONTROLS[dayElement] === targetElement) return samePolarity ? "편재" : "정재";
  if (CONTROLS[targetElement] === dayElement) return samePolarity ? "편관" : "정관";
  return samePolarity ? "편인" : "정인";
}

function pairKey(a: BranchKr | StemKr, b: BranchKr | StemKr, order: readonly string[]): string {
  return [a, b].sort((left, right) => order.indexOf(left) - order.indexOf(right)).join("|");
}

const BRANCH_COMBINATION_TO_ELEMENT: Record<string, ElementKey> = {
  [pairKey(BRANCHES[0], BRANCHES[1], BRANCHES)]: "earth",
  [pairKey(BRANCHES[2], BRANCHES[11], BRANCHES)]: "wood",
  [pairKey(BRANCHES[3], BRANCHES[10], BRANCHES)]: "fire",
  [pairKey(BRANCHES[4], BRANCHES[9], BRANCHES)]: "metal",
  [pairKey(BRANCHES[5], BRANCHES[8], BRANCHES)]: "water",
  [pairKey(BRANCHES[6], BRANCHES[7], BRANCHES)]: "earth",
};
const STEM_COMBINATION_TO_ELEMENT: Record<string, ElementKey> = {
  [pairKey(STEMS[0], STEMS[5], STEMS)]: "earth",
  [pairKey(STEMS[1], STEMS[6], STEMS)]: "metal",
  [pairKey(STEMS[2], STEMS[7], STEMS)]: "water",
  [pairKey(STEMS[3], STEMS[8], STEMS)]: "wood",
  [pairKey(STEMS[4], STEMS[9], STEMS)]: "fire",
};
const BRANCH_CLASHES = new Set([
  pairKey(BRANCHES[0], BRANCHES[6], BRANCHES),
  pairKey(BRANCHES[1], BRANCHES[7], BRANCHES),
  pairKey(BRANCHES[2], BRANCHES[8], BRANCHES),
  pairKey(BRANCHES[3], BRANCHES[9], BRANCHES),
  pairKey(BRANCHES[4], BRANCHES[10], BRANCHES),
  pairKey(BRANCHES[5], BRANCHES[11], BRANCHES),
]);
const BRANCH_HARMS = new Set([
  pairKey(BRANCHES[0], BRANCHES[7], BRANCHES),
  pairKey(BRANCHES[1], BRANCHES[6], BRANCHES),
  pairKey(BRANCHES[2], BRANCHES[5], BRANCHES),
  pairKey(BRANCHES[3], BRANCHES[4], BRANCHES),
  pairKey(BRANCHES[8], BRANCHES[11], BRANCHES),
  pairKey(BRANCHES[9], BRANCHES[10], BRANCHES),
]);
const BRANCH_BREAKS = new Set([
  pairKey(BRANCHES[0], BRANCHES[9], BRANCHES),
  pairKey(BRANCHES[3], BRANCHES[6], BRANCHES),
  pairKey(BRANCHES[5], BRANCHES[8], BRANCHES),
  pairKey(BRANCHES[2], BRANCHES[11], BRANCHES),
  pairKey(BRANCHES[1], BRANCHES[4], BRANCHES),
  pairKey(BRANCHES[7], BRANCHES[10], BRANCHES),
]);

function getPillarEntries(pillars: LocalSajuResult["pillars"]) {
  return PILLAR_KEYS.map((key) => ({ key, pillar: pillars[key] })).filter((row): row is { key: PillarKey; pillar: SajuPillarLocal } => Boolean(row.pillar));
}

function analyzeInteractions(pillars: LocalSajuResult["pillars"]) {
  const entries = getPillarEntries(pillars);
  const delta = emptyElementScores();
  const branchRelations: Array<Record<string, unknown>> = [];
  const stemRelations: Array<Record<string, unknown>> = [];

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const left = entries[i];
      const right = entries[j];
      const branchKey = pairKey(left.pillar.branch, right.pillar.branch, BRANCHES);
      const comboElement = BRANCH_COMBINATION_TO_ELEMENT[branchKey];
      if (comboElement) {
        addElementScore(delta, comboElement, 0.35);
        branchRelations.push({ type: "합화", pillars: [left.key, right.key], branches: [left.pillar.branch, right.pillar.branch], element: comboElement });
      }
      if (BRANCH_CLASHES.has(branchKey)) {
        addElementScore(delta, BRANCH_MAIN_ELEMENT[left.pillar.branch], -0.22);
        addElementScore(delta, BRANCH_MAIN_ELEMENT[right.pillar.branch], -0.22);
        branchRelations.push({ type: "충발", pillars: [left.key, right.key], branches: [left.pillar.branch, right.pillar.branch] });
      }
      if (BRANCH_HARMS.has(branchKey)) {
        addElementScore(delta, BRANCH_MAIN_ELEMENT[left.pillar.branch], -0.08);
        addElementScore(delta, BRANCH_MAIN_ELEMENT[right.pillar.branch], -0.08);
        branchRelations.push({ type: "해", pillars: [left.key, right.key], branches: [left.pillar.branch, right.pillar.branch] });
      }
      if (BRANCH_BREAKS.has(branchKey)) {
        addElementScore(delta, BRANCH_MAIN_ELEMENT[left.pillar.branch], -0.1);
        addElementScore(delta, BRANCH_MAIN_ELEMENT[right.pillar.branch], -0.1);
        branchRelations.push({ type: "파", pillars: [left.key, right.key], branches: [left.pillar.branch, right.pillar.branch] });
      }

      const stemKey = pairKey(left.pillar.stem, right.pillar.stem, STEMS);
      const stemComboElement = STEM_COMBINATION_TO_ELEMENT[stemKey];
      if (stemComboElement) {
        addElementScore(delta, stemComboElement, 0.25);
        stemRelations.push({ type: "천간합", pillars: [left.key, right.key], stems: [left.pillar.stem, right.pillar.stem], element: stemComboElement });
      }
    }
  }

  const branchCounts = entries.reduce((acc, row) => {
    acc[row.pillar.branch] = (acc[row.pillar.branch] || 0) + 1;
    return acc;
  }, {} as Partial<Record<BranchKr, number>>);
  const punishments: Array<Record<string, unknown>> = [];
  const branches = new Set(entries.map((row) => row.pillar.branch));
  const hasTriad = (a: BranchKr, b: BranchKr, c: BranchKr) => branches.has(a) && branches.has(b) && branches.has(c);
  if (hasTriad(BRANCHES[2], BRANCHES[5], BRANCHES[8])) punishments.push({ type: "형살", branches: [BRANCHES[2], BRANCHES[5], BRANCHES[8]] });
  if (hasTriad(BRANCHES[1], BRANCHES[7], BRANCHES[10])) punishments.push({ type: "형살", branches: [BRANCHES[1], BRANCHES[7], BRANCHES[10]] });
  if (branches.has(BRANCHES[0]) && branches.has(BRANCHES[3])) punishments.push({ type: "형살", branches: [BRANCHES[0], BRANCHES[3]] });
  [BRANCHES[4], BRANCHES[6], BRANCHES[9], BRANCHES[11]].forEach((branch) => {
    if ((branchCounts[branch] || 0) >= 2) punishments.push({ type: "자형", branches: [branch] });
  });

  const doChung = Object.entries(branchCounts)
    .filter(([, count]) => Number(count) >= 2)
    .map(([branch]) => {
      const index = BRANCHES.indexOf(branch as BranchKr);
      const opposite = BRANCHES[(index + 6) % 12];
      return branches.has(opposite) ? null : { type: "도충", branch, impliedOpposite: opposite };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  return {
    delta,
    branchRelations,
    stemRelations,
    punishments,
    doChung,
  };
}

function normalizeLuckPillars(input: LocalSajuInput) {
  return (Array.isArray(input.luckPillars) ? input.luckPillars : []).map((row) => {
    const ganji = String(row.ganji || "").trim();
    const stem = row.stem || (ganji ? toStemKo(ganji.slice(0, 1)) : undefined);
    const branch = row.branch || (ganji.length >= 2 ? toBranchKo(ganji.slice(1, 2)) : undefined);
    return { ...row, stem, branch };
  }).filter((row) => row.stem || row.branch);
}

const TEN_GOD_OPERATION_DEFAULT: Record<TenGodName, Record<string, string>> = {
    비견: {
      personality: "자기 기준, 독립성, 경쟁심이 직접 드러난다.",
      career: "독립 업무, 공동 창업, 동료 경쟁 구도에서 강하게 작동한다.",
      wealth: "돈을 직접 지키려 하지만 지출과 분배 압박도 함께 커진다.",
      love: "관계에서 주도권과 자존심이 강해져 대등한 관계를 요구한다.",
      luckAmplification: "같은 글자가 대운·세운에 오면 자기 주장과 경쟁 구도가 증폭된다.",
    },
    겁재: {
      personality: "승부욕, 돌파력, 위험 감수 성향이 표면화된다.",
      career: "시장 경쟁, 영업, 협상, 판을 흔드는 역할에서 힘이 난다.",
      wealth: "재물은 크게 움직이나 동업, 손실, 분산 리스크를 같이 부른다.",
      love: "강한 끌림과 갈등이 동시에 커져 관계의 온도가 급격히 오른다.",
      luckAmplification: "같은 글자가 대운·세운에 오면 경쟁자, 비용, 결단 사건이 강해진다.",
    },
    식신: {
      personality: "표현력, 낙관성, 꾸준히 생산하는 능력이 살아난다.",
      career: "콘텐츠, 교육, 기술 생산, 서비스 품질에서 성과가 나온다.",
      wealth: "돈을 버는 기반이 안정적 생산성과 신뢰에서 열린다.",
      love: "다정함과 생활 리듬을 통해 관계를 안정시키는 힘이 커진다.",
      luckAmplification: "같은 글자가 대운·세운에 오면 창작과 결과물이 현실 성과로 커진다.",
    },
    상관: {
      personality: "날카로운 표현, 비판성, 기존 틀을 깨는 기질이 강해진다.",
      career: "기획, 브랜딩, 예술, 혁신 업무에서 두각을 드러낸다.",
      wealth: "재물은 아이디어와 노출에서 열리나 규칙 충돌을 조심해야 한다.",
      love: "매력과 말의 힘이 커지지만 관계의 예민한 선을 건드리기 쉽다.",
      luckAmplification: "같은 글자가 대운·세운에 오면 말, 작품, 반항성이 사건화된다.",
    },
    편재: {
      personality: "외부 기회, 사람을 움직이는 감각, 빠른 판단이 강해진다.",
      career: "사업, 영업, 투자, 네트워크형 일에서 현실성이 커진다.",
      wealth: "큰돈의 흐름과 기회가 열리나 변동성과 과감함이 동반된다.",
      love: "인연의 폭이 넓어지고 매력적 만남이 늘지만 안정성은 따로 관리해야 한다.",
      luckAmplification: "같은 글자가 대운·세운에 오면 돈, 거래, 외부 인연이 증폭된다.",
    },
    정재: {
      personality: "성실함, 소유 감각, 현실 관리 능력이 또렷해진다.",
      career: "관리, 재무, 운영, 안정적 조직 역할에서 힘을 얻는다.",
      wealth: "저축, 급여, 자산 관리처럼 누적되는 재물이 강해진다.",
      love: "책임감 있는 관계와 결혼 현실성이 올라간다.",
      luckAmplification: "같은 글자가 대운·세운에 오면 고정 수입, 계약, 관계 책임이 커진다.",
    },
    편관: {
      personality: "긴장감, 결단력, 위기 대응력이 겉으로 나온다.",
      career: "권한, 경쟁, 리스크 관리, 승부가 있는 직무에서 강하게 작동한다.",
      wealth: "재물은 압박과 성과 보상으로 오며 무리한 승부는 손실을 부른다.",
      love: "강한 상대와의 인연, 긴장과 끌림이 동시에 커진다.",
      luckAmplification: "같은 글자가 대운·세운에 오면 압박, 책임, 승부 사건이 증폭된다.",
    },
    정관: {
      personality: "규범, 책임감, 품위, 사회적 신뢰가 드러난다.",
      career: "조직, 직위, 공적 책임, 자격과 명예에서 힘이 커진다.",
      wealth: "재물은 안정된 직위와 신뢰 기반의 보상으로 이어진다.",
      love: "공식 관계, 결혼, 약속의 무게가 강해진다.",
      luckAmplification: "같은 글자가 대운·세운에 오면 직위, 계약, 결혼 책임이 또렷해진다.",
    },
    편인: {
      personality: "직감, 몰입, 비정형 학습, 예민한 통찰이 강해진다.",
      career: "연구, 상담, 기획, 특수 지식 영역에서 힘이 난다.",
      wealth: "재물은 전문성에서 열리나 고립과 불규칙성이 변수가 된다.",
      love: "관계에서 거리감과 깊은 이해 욕구가 동시에 작동한다.",
      luckAmplification: "같은 글자가 대운·세운에 오면 공부, 직감, 방향 전환이 깊어진다.",
    },
    정인: {
      personality: "학습력, 보호받는 힘, 안정적 판단이 드러난다.",
      career: "문서, 교육, 자격, 연구, 보호자 역할에서 성취가 난다.",
      wealth: "재물은 지식, 자격, 안정된 지원을 통해 쌓인다.",
      love: "돌봄과 신뢰가 커지나 의존성이 강해질 수 있다.",
      luckAmplification: "같은 글자가 대운·세운에 오면 배움, 문서, 보호 운이 증폭된다.",
    },
};

/* 관리자 CMS(운세 콘텐츠 → 사주 해설)에서 고친 값을 코드 기본값 위에 얹는다.
   동물 사주와 사주 수호신이 같은 표를 읽으므로 한 번 고치면 두 화면에 함께 반영된다.
   폴백 우선 — 오버라이드가 없으면 위 기본값이 그대로 쓰인다. */
const TEN_GOD_OPERATION = cmsRecord("saju-reading", "ten-god", TEN_GOD_OPERATION_DEFAULT);

export function getTenGodOperation(tenGod: TenGodName) {
  return TEN_GOD_OPERATION[tenGod];
}

function getRelationTriggerBranches(branch: BranchKr) {
  const relationRows: Array<Record<string, unknown>> = [];
  BRANCHES.forEach((target) => {
    const key = pairKey(branch, target, BRANCHES);
    if (BRANCH_COMBINATION_TO_ELEMENT[key]) relationRows.push({ type: "합", triggerBranch: target, element: BRANCH_COMBINATION_TO_ELEMENT[key] });
    if (BRANCH_CLASHES.has(key)) relationRows.push({ type: "충", triggerBranch: target });
  });
  return relationRows;
}

function buildHiddenStemActivationReport(
  pillars: LocalSajuResult["pillars"],
  dayStem: StemKr,
  protrusions: Array<Record<string, unknown>>,
  luckRows: Array<Record<string, unknown>>,
) {
  const visibleStems = new Set(getPillarEntries(pillars).map((row) => row.pillar.stem));
  const sourceRows = getPillarEntries(pillars).flatMap(({ key, pillar }) => HIDDEN_STEMS_BY_BRANCH[pillar.branch].map((hidden) => {
    const tenGod = tenGodForStem(dayStem, hidden.stem);
    const exposed = visibleStems.has(hidden.stem);
    const operation = getTenGodOperation(tenGod);
    const sameStemLuck = luckRows.filter((row) => row.stem === hidden.stem || (Array.isArray(row.hidden) && row.hidden.some((item) => item.stem === hidden.stem)));
    const relationLuck = luckRows.filter((row) => {
      if (!row.branch) return false;
      const relationKey = pairKey(pillar.branch, row.branch as BranchKr, BRANCHES);
      return Boolean(BRANCH_COMBINATION_TO_ELEMENT[relationKey] || BRANCH_CLASHES.has(relationKey));
    });

    return {
      pillar: key,
      branch: pillar.branch,
      lifeArea: PILLAR_LIFE_AREA[key],
      hiddenStem: hidden.stem,
      element: STEM_ELEMENT[hidden.stem],
      elementKo: ELEMENT_KO[STEM_ELEMENT[hidden.stem]],
      tenGod,
      hiddenWeight: hidden.weight,
      exposedToHeavenlyStem: exposed,
      protrusionStrength: exposed ? HIDDEN_STEM_PROTRUSION_LEVEL[key] : "미투간",
      interpretation: operation,
      luckAmplification: {
        status: sameStemLuck.length ? "matched" : "waiting_for_matching_luck_stem",
        sameStemLuck,
        effect: operation.luckAmplification,
      },
      openingTimingByClashOrCombination: {
        suppliedLuckMatches: relationLuck.map((row) => ({
          scope: row.scope,
          label: row.label,
          branch: row.branch,
          relation: BRANCH_COMBINATION_TO_ELEMENT[pairKey(pillar.branch, row.branch as BranchKr, BRANCHES)] ? "합" : "충",
        })),
        triggerBranches: getRelationTriggerBranches(pillar.branch),
      },
    };
  }));

  const monthRows = sourceRows.filter((row) => row.pillar === "month");
  const exposedMonthRows = monthRows.filter((row) => row.exposedToHeavenlyStem);

  return {
    principle: "지장간은 숨은 작동 원리이며 월지 지장간 투간은 월령의 실제 내용물이 천간으로 드러난 것으로 최우선 가중한다.",
    monthHiddenStemProtrusion: {
      monthBranch: pillars.month.branch,
      hiddenStems: monthRows,
      exposed: exposedMonthRows,
      summary: exposedMonthRows.length
        ? exposedMonthRows.map((row) => `${row.hiddenStem}(${row.tenGod})`).join(", ")
        : "월지 지장간 중 천간에 직접 드러난 글자는 없음",
    },
    byPillar: {
      year: sourceRows.filter((row) => row.pillar === "year"),
      month: monthRows,
      day: sourceRows.filter((row) => row.pillar === "day"),
      hour: sourceRows.filter((row) => row.pillar === "hour"),
    },
    protruded: sourceRows.filter((row) => row.exposedToHeavenlyStem),
    protrusionEvidence: protrusions,
  };
}

function buildEarthStorageAnalysis(
  pillars: LocalSajuResult["pillars"],
  dayStem: StemKr,
  usefulElements: ElementKey[],
  effectivePower: Record<ElementKey, number>,
  luckRows: Array<Record<string, unknown>>,
) {
  const entries = getPillarEntries(pillars);
  const earthStemCount = entries.filter((row) => STEM_ELEMENT[row.pillar.stem] === "earth").length;
  const earthBranchCount = entries.filter((row) => BRANCH_MAIN_ELEMENT[row.pillar.branch] === "earth").length;
  const storageEntries = entries.filter((row) => EARTH_STORAGE_BRANCHES.has(row.pillar.branch));
  const visibleEarthMarkers = earthStemCount + earthBranchCount;
  const earthDisposition = usefulElements.includes("earth")
    ? "용신"
    : effectivePower.earth >= Math.max(...ELEMENTS.map((element) => effectivePower[element])) * 0.9
      ? "기신"
      : "중립";

  const rows = storageEntries.map(({ key, pillar }) => {
    const hiddenRows = HIDDEN_STEMS_BY_BRANCH[pillar.branch].map((hidden) => {
      const element = STEM_ELEMENT[hidden.stem];
      const tenGod = tenGodForStem(dayStem, hidden.stem);
      const usefulState = usefulElements.includes(element)
        ? "용신성"
        : element === "earth" && earthDisposition === "기신"
          ? "기신성"
          : "잠재성";
      const sameStemLuck = luckRows.filter((row) => row.stem === hidden.stem || (Array.isArray(row.hidden) && row.hidden.some((item) => item.stem === hidden.stem)));
      return {
        stem: hidden.stem,
        element,
        elementKo: ELEMENT_KO[element],
        tenGod,
        weight: hidden.weight,
        usefulState,
        operation: getTenGodOperation(tenGod),
        luckAmplification: {
          status: sameStemLuck.length ? "matched" : "waiting_for_matching_luck_stem",
          sameStemLuck,
          effect: sameStemLuck.length
            ? "대운·세운에서 같은 글자가 와 창고 속 성분이 현실 사건으로 증폭된다."
            : "대운·세운에서 같은 글자가 오면 창고 속 성분이 강하게 증폭된다.",
        },
      };
    });
    const openingLuck = luckRows.filter((row) => {
      if (!row.branch) return false;
      const relationKey = pairKey(pillar.branch, row.branch as BranchKr, BRANCHES);
      return BRANCH_CLASHES.has(relationKey) || Boolean(BRANCH_COMBINATION_TO_ELEMENT[relationKey]);
    });
    const storageClashLuck = openingLuck.filter((row) => {
      const relationKey = pairKey(pillar.branch, row.branch as BranchKr, BRANCHES);
      return relationKey === pairKey(BRANCHES[4], BRANCHES[10], BRANCHES) || relationKey === pairKey(BRANCHES[1], BRANCHES[7], BRANCHES);
    });
    const usefulHidden = hiddenRows.filter((row) => row.usefulState === "용신성");
    const unfavorableHidden = hiddenRows.filter((row) => row.usefulState === "기신성");

    return {
      pillar: key,
      branch: pillar.branch,
      lifeArea: PILLAR_LIFE_AREA[key],
      profile: EARTH_STORAGE_PROFILE[pillar.branch],
      hiddenStems: hiddenRows,
      storageOpening: {
        principle: "진술충·축미충은 창고를 여는 충으로 보며, 속의 지장간이 용신이면 길하게 현실화되고 기신이면 문제가 터질 수 있다.",
        triggerBranches: getRelationTriggerBranches(pillar.branch),
        suppliedLuckMatches: openingLuck.map((row) => ({
          scope: row.scope,
          label: row.label,
          branch: row.branch,
          relation: BRANCH_COMBINATION_TO_ELEMENT[pairKey(pillar.branch, row.branch as BranchKr, BRANCHES)] ? "합" : "충",
          storageClash: storageClashLuck.includes(row),
        })),
        result: usefulHidden.length
          ? "창고가 열릴 때 용신성 지장간이 먼저 살아나면 숨은 재능, 재물, 관계, 직업 변화가 길하게 현실화된다."
          : unfavorableHidden.length
            ? "창고가 열릴 때 기신성 지장간이 자극되면 책임, 불안, 정체, 몸의 무거움이 사건으로 터질 수 있다."
            : "창고가 열리면 저장된 성분이 현실 과제로 드러나며, 어떤 오행을 쓰느냐에 따라 길흉이 갈린다.",
      },
    };
  });

  const overburdened = visibleEarthMarkers >= 3 || effectivePower.earth >= 3.2;
  return {
    principle: "진·술·축·미는 단순 토가 아니라 여러 성분을 저장한 창고로 판단한다.",
    earthDisposition,
    earthMarkers: {
      heavenlyStemEarth: earthStemCount,
      branchEarth: earthBranchCount,
      storageBranchCount: storageEntries.length,
      visibleEarthMarkers,
      effectiveEarthPower: round2(effectivePower.earth),
    },
    overburdened,
    commonReading: overburdened
      ? "토가 강해 현실 압박, 책임감, 내면 경직, 걱정, 소화되지 않은 감정이 강하게 누적된다. 동시에 창고 속 지장간을 꺼내 쓰는 숨은 자원이 크다."
      : "토창고는 겉으로는 조용하지만 충·형·합과 운에서 열릴 때 저장된 재능과 관계 사건을 현실화한다.",
    usefulReading: earthDisposition === "용신"
      ? "토가 용신으로 작동하면 안정, 저장, 관리, 축적, 부동산, 조직화 능력으로 나타난다."
      : earthDisposition === "기신"
        ? "토가 기신으로 작동하면 정체, 우울, 불안, 고립, 과도한 책임, 몸의 무거움으로 나타난다."
        : "토는 중립 자원이며, 창고 속 어떤 지장간을 열어 쓰는지가 핵심이다.",
    developmentPrescription: rows.flatMap((row) => (row.hiddenStems as Array<Record<string, unknown>>)
      .filter((hidden) => hidden.usefulState !== "기신성")
      .map((hidden) => ({
        branch: row.branch,
        stem: hidden.stem,
        element: hidden.element,
        tenGod: hidden.tenGod,
        prescription: `${hidden.elementKo} 기운과 ${hidden.tenGod} 작용을 의식적으로 개발한다.`,
      }))),
    rows,
  };
}

function getOppositeBranch(branch: BranchKr): BranchKr {
  return BRANCHES[(BRANCHES.indexOf(branch) + 6) % 12];
}

function getMainHiddenStem(branch: BranchKr): StemKr {
  return HIDDEN_STEMS_BY_BRANCH[branch][0]?.stem || STEMS[0];
}

function getGongMangBranches(dayPillar: SajuPillarLocal): BranchKr[] {
  const stemIndex = STEMS.indexOf(dayPillar.stem);
  const branchIndex = BRANCHES.indexOf(dayPillar.branch);
  let dayIndex = 0;
  for (let i = 0; i < 60; i += 1) {
    if (i % 10 === stemIndex && i % 12 === branchIndex) {
      dayIndex = i;
      break;
    }
  }
  const xunStartBranch = BRANCHES[Math.floor(dayIndex / 10) * 10 % 12];
  const map: Partial<Record<BranchKr, BranchKr[]>> = {
    [BRANCHES[0]]: [BRANCHES[10], BRANCHES[11]],
    [BRANCHES[10]]: [BRANCHES[8], BRANCHES[9]],
    [BRANCHES[8]]: [BRANCHES[6], BRANCHES[7]],
    [BRANCHES[6]]: [BRANCHES[4], BRANCHES[5]],
    [BRANCHES[4]]: [BRANCHES[2], BRANCHES[3]],
    [BRANCHES[2]]: [BRANCHES[0], BRANCHES[1]],
  };
  return map[xunStartBranch] || [];
}

function classifyDoChung(repeatedUseful: boolean, inducedUseful: boolean): string {
  if (!repeatedUseful && inducedUseful) return "기신 과포화 → 용신 도출: 흉에서 길로 급변";
  if (repeatedUseful && !inducedUseful) return "용신 과포화 → 기신 도출: 길에서 흉으로 급변";
  if (!repeatedUseful && !inducedUseful) return "기신 과포화 → 또 다른 기신 도출: 압박 심화";
  return "용신 과포화 → 용신 도출: 큰 전환과 성취";
}

function getLuckScopeWeight(scope: unknown): number {
  const key = String(scope || "").toLowerCase();
  if (key === "daewoon") return 4;
  if (key === "annual") return 3;
  if (key === "monthly") return 2;
  if (key === "daily") return 1;
  return 0;
}

function buildDoChungAnalysis(
  pillars: LocalSajuResult["pillars"],
  dayStem: StemKr,
  usefulElements: ElementKey[],
  effectivePower: Record<ElementKey, number>,
  luckRows: Array<Record<string, unknown>>,
  interactions: ReturnType<typeof analyzeInteractions>,
) {
  const entries = getPillarEntries(pillars);
  const visibleStems = new Set(entries.map((row) => row.pillar.stem));
  const gongMang = getGongMangBranches(pillars.day);
  const natalBranchRows = entries.map((row) => ({ source: "natal", scope: row.key, branch: row.pillar.branch, label: row.pillar.ganji }));
  const luckBranchRows = luckRows.filter((row) => row.branch).map((row) => ({ source: "luck", scope: row.scope, branch: row.branch as BranchKr, label: row.label || "" }));
  const allRows = [...natalBranchRows, ...luckBranchRows];

  const candidates = BRANCHES.map((branch) => {
    const natalMatches = natalBranchRows.filter((row) => row.branch === branch);
    const luckMatches = luckBranchRows.filter((row) => row.branch === branch);
    const totalCount = natalMatches.length + luckMatches.length;
    if (totalCount < 3) return null;

    const opposite = getOppositeBranch(branch);
    const repeatedElement = BRANCH_MAIN_ELEMENT[branch];
    const inducedElement = BRANCH_MAIN_ELEMENT[opposite];
    const inducedMainStem = getMainHiddenStem(opposite);
    const inducedTenGod = tenGodForStem(dayStem, inducedMainStem);
    const repeatedUseful = usefulElements.includes(repeatedElement);
    const inducedUseful = usefulElements.includes(inducedElement);
    const alreadyHasOpposite = allRows.some((row) => row.branch === opposite);
    const inducedStemProtruded = HIDDEN_STEMS_BY_BRANCH[opposite].some((hidden) => visibleStems.has(hidden.stem));
    const strongestLuck = luckMatches
      .sort((a, b) => getLuckScopeWeight(b.scope) - getLuckScopeWeight(a.scope))[0] || null;
    const modifier = {
      monthCommand: pillars.month.branch === branch ? "반복 지지가 월령을 잡아 발동성이 강함" : pillars.month.branch === opposite ? "유도 지지가 월령에 있어 반대 글자의 현실성이 강함" : "월령 직접 장악은 아님",
      combinationPressure: interactions.branchRelations.filter((row) => {
        const branches = row.branches as BranchKr[] | undefined;
        return Array.isArray(branches) && branches.includes(branch);
      }),
      punishmentPressure: interactions.punishments.filter((row) => {
        const branches = row.branches as BranchKr[] | undefined;
        return Array.isArray(branches) && branches.includes(branch);
      }),
      gongMang: {
        repeatedInGongMang: gongMang.includes(branch),
        inducedInGongMang: gongMang.includes(opposite),
        branches: gongMang,
      },
      protrusion: {
        repeatedHiddenProtruded: HIDDEN_STEMS_BY_BRANCH[branch].filter((hidden) => visibleStems.has(hidden.stem)).map((hidden) => hidden.stem),
        inducedHiddenProtruded: HIDDEN_STEMS_BY_BRANCH[opposite].filter((hidden) => visibleStems.has(hidden.stem)).map((hidden) => hidden.stem),
      },
    };
    const operation = getTenGodOperation(inducedTenGod);
    const branchLabel = `${branch}`;
    const oppositeLabel = `${opposite}`;
    const strongestTiming = strongestLuck
      ? `${strongestLuck.scope || "운"} ${strongestLuck.label || branchLabel}`
      : natalMatches.length >= 3
        ? `원국에서 이미 ${branchLabel}가 3개 이상 중첩되어 상시 후보, 대운·세운·월운에서 ${branchLabel} 또는 ${oppositeLabel}가 올 때 극대화`
        : `대운·세운·월운·일운에서 ${branchLabel}가 추가될 때`;

    return {
      repeatedBranch: branch,
      repeatedCount: totalCount,
      natalCount: natalMatches.length,
      luckCount: luckMatches.length,
      sources: [...natalMatches, ...luckMatches],
      inducedOppositeBranch: opposite,
      inducedTenGod,
      repeatedState: repeatedUseful ? "용신" : "기신",
      inducedState: inducedUseful ? "용신" : "기신",
      classification: classifyDoChung(repeatedUseful, inducedUseful),
      hiddenStemsOfRepeated: HIDDEN_STEMS_BY_BRANCH[branch].map((hidden) => ({ ...hidden, tenGod: tenGodForStem(dayStem, hidden.stem), element: STEM_ELEMENT[hidden.stem] })),
      hiddenStemsOfInduced: HIDDEN_STEMS_BY_BRANCH[opposite].map((hidden) => ({ ...hidden, tenGod: tenGodForStem(dayStem, hidden.stem), element: STEM_ELEMENT[hidden.stem] })),
      alreadyHasOpposite,
      inducedStemProtruded,
      inducedAppearsInLuck: luckBranchRows.some((row) => row.branch === opposite),
      modifiers: modifier,
      lifeEvents: [
        operation.career,
        operation.wealth,
        operation.love,
        alreadyHasOpposite ? "원국에 반대 글자가 이미 있어 사건이 내부 갈등과 외부 변화로 동시에 나타날 수 있다." : "원국에 반대 글자가 없으면 운에서 갑작스러운 방향 전환으로 체감되기 쉽다.",
      ],
      strongestActivationTiming: strongestTiming,
      requiredSentences: [
        `같은 지지가 ${totalCount}개 중첩되었는가: ${branchLabel} ${totalCount}개 중첩.`,
        `어떤 반대 글자를 불러오는가: ${branchLabel}는 반대편 ${oppositeLabel}를 불러온다.`,
        `그 반대 글자가 일간에게 어떤 십성인가: ${oppositeLabel}의 본기 ${inducedMainStem}는 일간에게 ${inducedTenGod}이다.`,
        `그 글자가 용신인지 기신인지: ${oppositeLabel}는 ${inducedUseful ? "용신" : "기신"}으로 판정된다.`,
        `이 도충이 실제 삶에서 어떤 사건으로 나타날 수 있는가: ${operation.career} ${operation.wealth} ${operation.love}`,
        `대운·세운·월운 중 언제 가장 강하게 발동하는가: ${strongestTiming}.`,
      ],
    };
  }).filter(Boolean) as Array<Record<string, unknown>>;

  return {
    principle: "같은 지지가 과도하게 반복되면 과포화되어 반대편 충 글자를 유도하는 도충 후보로 본다.",
    oppositeMap: BRANCHES.map((branch) => ({ branch, opposite: getOppositeBranch(branch) })),
    gongMang,
    candidates,
    strongest: candidates.sort((a, b) => Number(b.repeatedCount || 0) - Number(a.repeatedCount || 0))[0] || null,
    evaluatedWith: ["월령", "합", "충", "형", "공망", "투간", "용신/기신", "대운·세운·월운·일운"],
  };
}

const BRANCH_TRIADS: Array<{ branches: BranchKr[]; element: ElementKey; type: string }> = [
  { branches: [BRANCHES[8], BRANCHES[0], BRANCHES[4]], element: "water", type: "삼합" },
  { branches: [BRANCHES[11], BRANCHES[3], BRANCHES[7]], element: "wood", type: "삼합" },
  { branches: [BRANCHES[2], BRANCHES[6], BRANCHES[10]], element: "fire", type: "삼합" },
  { branches: [BRANCHES[5], BRANCHES[9], BRANCHES[1]], element: "metal", type: "삼합" },
];
const BRANCH_DIRECTIONS: Array<{ branches: BranchKr[]; element: ElementKey; type: string }> = [
  { branches: [BRANCHES[2], BRANCHES[3], BRANCHES[4]], element: "wood", type: "방합" },
  { branches: [BRANCHES[5], BRANCHES[6], BRANCHES[7]], element: "fire", type: "방합" },
  { branches: [BRANCHES[8], BRANCHES[9], BRANCHES[10]], element: "metal", type: "방합" },
  { branches: [BRANCHES[11], BRANCHES[0], BRANCHES[1]], element: "water", type: "방합" },
];

function representativeStemForElement(element: ElementKey): StemKr {
  const index = ELEMENTS.indexOf(element) * 2;
  return STEMS[index] || STEMS[0];
}

function getElementUseState(element: ElementKey, usefulElements: ElementKey[]): "용신" | "기신" {
  return usefulElements.includes(element) ? "용신" : "기신";
}

function classifyElementShift(fromState: "용신" | "기신", toState: "용신" | "기신"): string {
  if (fromState === "기신" && toState === "용신") return "흉에서 길로 급변";
  if (fromState === "용신" && toState === "기신") return "길에서 흉으로 급변";
  if (fromState === "기신" && toState === "기신") return "압박 심화";
  return "큰 전환과 성취";
}

function buildAstroRows(pillars: LocalSajuResult["pillars"], luckRows: Array<Record<string, unknown>>) {
  const natalRows = getPillarEntries(pillars).map(({ key, pillar }) => ({
    source: "원국",
    scope: key,
    label: pillar.ganji,
    stem: pillar.stem,
    branch: pillar.branch,
  }));
  const luckAstroRows = luckRows.map((row) => ({
    source: "운",
    scope: row.scope || "unknown",
    label: row.label || "",
    stem: row.stem as StemKr | undefined,
    branch: row.branch as BranchKr | undefined,
  }));
  return [...natalRows, ...luckAstroRows];
}

function getTimingAdvice(rows: Array<Record<string, unknown>>) {
  const luck = rows.filter((row) => row.source === "운");
  if (!luck.length) return { caution: "원국 내부 구조라 같은 글자나 충합 글자가 운에서 올 때 주의", use: "원국의 묶임을 의식적으로 분리하고 해당 십성의 건강한 출구를 만들 때 활용" };
  const strongest = [...luck].sort((a, b) => getLuckScopeWeight(b.scope) - getLuckScopeWeight(a.scope))[0];
  const scope = String(strongest.scope || "운");
  const label = String(strongest.label || "");
  return {
    caution: `${scope} ${label}에서 가장 강하게 사건화되므로 계약, 관계, 건강, 이동 결정을 신중히 본다.`,
    use: `${scope} ${label}에서 묶인 십성을 현실 행동으로 풀어 이동, 협상, 정리, 전환에 활용한다.`,
  };
}

function getEventPrediction(tenGod: TenGodName, relationKind: string, changedState: string) {
  const operation = getTenGodOperation(tenGod);
  return {
    summary: `${relationKind}으로 ${tenGod} 작용이 ${changedState} 흐름을 만들며 직업·재물·연애·관계 사건으로 나타난다.`,
    career: operation.career,
    wealth: operation.wealth,
    love: operation.love,
    health: relationKind.includes("충") ? "충이 몸으로 오면 긴장, 염증, 사고성 피로, 수면 불안으로 나타날 수 있다." : "합이 몸으로 오면 정체, 순환 지연, 의존성 피로로 나타날 수 있다.",
    moveContractRelation: relationKind.includes("충")
      ? "이사, 이직, 분리, 계약 변경, 관계 재정렬로 사건화되기 쉽다."
      : "계약, 연애, 협업, 의존 관계, 직무 배치가 묶이거나 새 방향으로 합쳐지기 쉽다.",
  };
}

function getClashOutcome(
  leftElement: ElementKey,
  rightElement: ElementKey,
  usefulElements: ElementKey[],
) {
  const leftState = getElementUseState(leftElement, usefulElements);
  const rightState = getElementUseState(rightElement, usefulElements);
  if (leftState === "기신" && rightState === "용신") return { shift: "기신 충거 → 문제 해결과 돌파", changedState: "흉에서 길로 급변" };
  if (leftState === "용신" && rightState === "기신") return { shift: "용신 피충 → 기반 손상", changedState: "길에서 흉으로 급변" };
  if (leftState === "기신" && rightState === "기신") return { shift: "기신끼리 충돌 → 압박 심화", changedState: "압박 심화" };
  return { shift: "용신끼리 충동 → 큰 전환과 성취", changedState: "큰 전환과 성취" };
}

function hasBranchRootForElement(branches: BranchKr[], element: ElementKey): boolean {
  return branches.some((branch) => BRANCH_MAIN_ELEMENT[branch] === element || HIDDEN_STEMS_BY_BRANCH[branch].some((hidden) => STEM_ELEMENT[hidden.stem] === element));
}

function buildCombinationClashAnalysis(
  pillars: LocalSajuResult["pillars"],
  dayStem: StemKr,
  usefulElements: ElementKey[],
  effectivePower: Record<ElementKey, number>,
  season: ReturnType<typeof getSeasonProfile>,
  luckRows: Array<Record<string, unknown>>,
  earthStorageAnalysis: Record<string, unknown>,
) {
  const rows = buildAstroRows(pillars, luckRows);
  const visibleStems = new Set(rows.map((row) => row.stem).filter(Boolean) as StemKr[]);
  const branches = rows.map((row) => row.branch).filter(Boolean) as BranchKr[];
  const stemCombinations: Array<Record<string, unknown>> = [];
  const branchCombinations: Array<Record<string, unknown>> = [];
  const clashes: Array<Record<string, unknown>> = [];

  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const left = rows[i];
      const right = rows[j];
      if (left.stem && right.stem) {
        const stemKey = pairKey(left.stem, right.stem, STEMS);
        const transformedElement = STEM_COMBINATION_TO_ELEMENT[stemKey];
        if (transformedElement) {
          const seasonSupport = season.dominantElement === transformedElement || season.weights[transformedElement] >= 1.15;
          const rootSupport = hasBranchRootForElement(branches, transformedElement);
          const powerSupport = effectivePower[transformedElement] >= 1.6;
          const clashInterference = branches.some((branch) => BRANCH_CLASHES.has(pairKey(branch, getOppositeBranch(branch), BRANCHES)) && BRANCH_MAIN_ELEMENT[branch] === transformedElement);
          const score = [seasonSupport, rootSupport, powerSupport].filter(Boolean).length - (clashInterference ? 1 : 0);
          const success = score >= 2;
          const fromElements = [STEM_ELEMENT[left.stem], STEM_ELEMENT[right.stem]];
          const fromStates = fromElements.map((element) => getElementUseState(element, usefulElements));
          const toState = getElementUseState(transformedElement, usefulElements);
          const changedState = fromStates.includes("용신") && toState === "기신"
            ? "길에서 흉으로 급변"
            : fromStates.includes("기신") && toState === "용신"
              ? "흉에서 길로 급변"
              : classifyElementShift(fromStates[0], toState);
          const boundTenGods = [tenGodForStem(dayStem, left.stem), tenGodForStem(dayStem, right.stem)];
          const transformedTenGod = tenGodForStem(dayStem, representativeStemForElement(transformedElement));
          const timing = getTimingAdvice([left, right]);
          stemCombinations.push({
            kind: "천간합",
            rule: `${left.stem}${right.stem}合${ELEMENT_KO[transformedElement]}`,
            actors: { left, right },
            transformedElement,
            transformedElementKo: ELEMENT_KO[transformedElement],
            transformedTenGod,
            success,
            resultType: success ? "합화" : fromStates.includes("용신") ? "합거" : "합반",
            supportEvidence: { seasonSupport, rootSupport, powerSupport, clashInterference, score },
            boundTenGods,
            usefulUnfavorableShift: { fromStates, toState, changedState },
            actualEvents: getEventPrediction(transformedTenGod, success ? "합화" : "합거/합반", changedState),
            timing,
            required: {
              kind: "천간합",
              actedLetters: `${left.source} ${left.scope} ${left.stem}와 ${right.source} ${right.scope} ${right.stem}`,
              transformationSuccess: success,
              resultType: success ? "합화" : "합거/합반",
              usefulUnfavorableShift: changedState,
              actualEvents: getEventPrediction(transformedTenGod, success ? "합화" : "합거/합반", changedState),
              cautionTiming: timing.caution,
              useTiming: timing.use,
            },
          });
        }
      }

      if (left.branch && right.branch) {
        const branchKey = pairKey(left.branch, right.branch, BRANCHES);
        const clash = BRANCH_CLASHES.has(branchKey);
        const liuheElement = BRANCH_COMBINATION_TO_ELEMENT[branchKey];
        if (liuheElement) {
          const seasonSupport = season.dominantElement === liuheElement || season.weights[liuheElement] >= 1.15;
          const rootSupport = hasBranchRootForElement([left.branch, right.branch], liuheElement);
          const protruded = [...visibleStems].some((stem) => STEM_ELEMENT[stem] === liuheElement);
          const clashPressure = clashes.some((row) => {
            const actors = row.actors as Record<string, unknown> | undefined;
            return Boolean(actors && JSON.stringify(actors).includes(String(left.branch)));
          });
          const success = [seasonSupport, rootSupport, protruded].filter(Boolean).length >= 2 && !clashPressure;
          const sourceStates = [getElementUseState(BRANCH_MAIN_ELEMENT[left.branch], usefulElements), getElementUseState(BRANCH_MAIN_ELEMENT[right.branch], usefulElements)];
          const toState = getElementUseState(liuheElement, usefulElements);
          const changedState = sourceStates.includes("용신") && toState === "기신"
            ? "길에서 흉으로 급변"
            : sourceStates.includes("기신") && toState === "용신"
              ? "흉에서 길로 급변"
              : classifyElementShift(sourceStates[0], toState);
          const transformedTenGod = tenGodForStem(dayStem, representativeStemForElement(liuheElement));
          const timing = getTimingAdvice([left, right]);
          branchCombinations.push({
            kind: "지지합",
            subType: "육합",
            actors: { left, right },
            transformedElement: liuheElement,
            transformedElementKo: ELEMENT_KO[liuheElement],
            transformedTenGod,
            success,
            resultType: success ? "합화" : clashPressure ? "합중유충" : "합반",
            supportEvidence: { seasonSupport, rootSupport, protruded, clashPressure },
            usefulUnfavorableShift: { sourceStates, toState, changedState },
            actualEvents: getEventPrediction(transformedTenGod, success ? "지지합화" : "지지합반", changedState),
            timing,
            required: {
              kind: "육합",
              actedLetters: `${left.source} ${left.scope} ${left.branch}와 ${right.source} ${right.scope} ${right.branch}`,
              transformationSuccess: success,
              resultType: success ? "합화" : clashPressure ? "합중유충" : "합반",
              usefulUnfavorableShift: changedState,
              actualEvents: getEventPrediction(transformedTenGod, success ? "지지합화" : "지지합반", changedState),
              cautionTiming: timing.caution,
              useTiming: timing.use,
            },
          });
        }
        if (clash) {
          const leftElement = BRANCH_MAIN_ELEMENT[left.branch];
          const rightElement = BRANCH_MAIN_ELEMENT[right.branch];
          const outcome = getClashOutcome(leftElement, rightElement, usefulElements);
          const rightTenGod = tenGodForStem(dayStem, getMainHiddenStem(right.branch));
          const timing = getTimingAdvice([left, right]);
          const storageOpening = EARTH_STORAGE_BRANCHES.has(left.branch) || EARTH_STORAGE_BRANCHES.has(right.branch)
            ? {
              opensStorage: true,
              earthStorageRows: earthStorageAnalysis.rows,
              result: "창고지 충이므로 지장간 개방 여부를 함께 본다.",
            }
            : { opensStorage: false };
          clashes.push({
            kind: "충",
            subType: `${left.branch}${right.branch}沖`,
            actors: { left, right },
            outcome,
            usefulUnfavorableShift: outcome.changedState,
            storageOpening,
            actualEvents: getEventPrediction(rightTenGod, "충", outcome.changedState),
            timing,
            required: {
              kind: "충",
              actedLetters: `${left.source} ${left.scope} ${left.branch}와 ${right.source} ${right.scope} ${right.branch}`,
              transformationSuccess: false,
              resultType: "충 변이",
              usefulUnfavorableShift: outcome.changedState,
              actualEvents: getEventPrediction(rightTenGod, "충", outcome.changedState),
              cautionTiming: timing.caution,
              useTiming: timing.use,
            },
          });
        }
      }
    }
  }

  [...BRANCH_TRIADS, ...BRANCH_DIRECTIONS].forEach((group) => {
    const matched = group.branches.map((branch) => ({ branch, rows: rows.filter((row) => row.branch === branch) })).filter((row) => row.rows.length);
    if (matched.length < 2) return;
    const complete = matched.length === 3;
    const clashPressure = matched.some((row) => rows.some((candidate) => candidate.branch && BRANCH_CLASHES.has(pairKey(row.branch, candidate.branch, BRANCHES))));
    const protruded = [...visibleStems].some((stem) => STEM_ELEMENT[stem] === group.element);
    const seasonSupport = season.dominantElement === group.element || season.weights[group.element] >= 1.15;
    const success = complete && [seasonSupport, protruded].filter(Boolean).length >= 1 && !clashPressure;
    const transformedTenGod = tenGodForStem(dayStem, representativeStemForElement(group.element));
    const timingRows = matched.flatMap((row) => row.rows);
    const timing = getTimingAdvice(timingRows);
    branchCombinations.push({
      kind: "지지합",
      subType: complete ? group.type : "반합",
      actors: matched,
      transformedElement: group.element,
      transformedElementKo: ELEMENT_KO[group.element],
      transformedTenGod,
      success,
      resultType: success ? "합화" : clashPressure ? "합중유충" : complete ? "합반" : "반합",
      supportEvidence: { complete, seasonSupport, protruded, clashPressure },
      usefulUnfavorableShift: {
        toState: getElementUseState(group.element, usefulElements),
        changedState: getElementUseState(group.element, usefulElements) === "용신" ? "흉에서 길로 급변 가능" : "길에서 흉으로 급변 가능",
      },
      actualEvents: getEventPrediction(transformedTenGod, complete ? group.type : "반합", getElementUseState(group.element, usefulElements)),
      timing,
      required: {
        kind: complete ? group.type : "반합",
        actedLetters: matched.map((row) => `${row.branch}(${row.rows.map((item) => `${item.source} ${item.scope}`).join("/")})`).join(", "),
        transformationSuccess: success,
        resultType: success ? "합화" : clashPressure ? "합중유충" : complete ? "합반" : "반합",
        usefulUnfavorableShift: getElementUseState(group.element, usefulElements),
        actualEvents: getEventPrediction(transformedTenGod, complete ? group.type : "반합", getElementUseState(group.element, usefulElements)),
        cautionTiming: timing.caution,
        useTiming: timing.use,
      },
    });
  });

  return {
    principle: "합은 무조건 길하지 않으며 합화·합거·합반·합중유충으로 나누고, 충도 기신을 치는지 용신을 치는지로 변이를 판정한다.",
    stemCombinations,
    branchCombinations,
    clashes,
    requiredOutputRows: [...stemCombinations, ...branchCombinations, ...clashes].map((row) => row.required),
  };
}

const GEOK_BY_TEN_GOD: Partial<Record<TenGodName, string>> = {
  정관: "정관격",
  편관: "편관격",
  정재: "정재격",
  편재: "편재격",
  식신: "식신격",
  상관: "상관격",
  정인: "정인격",
  편인: "편인격",
};
const GEONROK_BRANCH_BY_STEM: Record<StemKr, BranchKr> = {
  [STEMS[0]]: BRANCHES[2],
  [STEMS[1]]: BRANCHES[3],
  [STEMS[2]]: BRANCHES[5],
  [STEMS[3]]: BRANCHES[6],
  [STEMS[4]]: BRANCHES[5],
  [STEMS[5]]: BRANCHES[6],
  [STEMS[6]]: BRANCHES[8],
  [STEMS[7]]: BRANCHES[9],
  [STEMS[8]]: BRANCHES[11],
  [STEMS[9]]: BRANCHES[0],
};
const YANGIN_BRANCH_BY_STEM: Partial<Record<StemKr, BranchKr>> = {
  [STEMS[0]]: BRANCHES[3],
  [STEMS[2]]: BRANCHES[6],
  [STEMS[4]]: BRANCHES[6],
  [STEMS[6]]: BRANCHES[9],
  [STEMS[8]]: BRANCHES[0],
};

/* 격국별 분야 해설. 어느 격인지는 명식에서 계산되지만 풀이 문장은 고정이라
   관리자 CMS(사주 해설 → gyeokguk)에서 고칠 수 있게 떼둔다. */
const GYEOK_DOMAIN_READING_DEFAULT: Record<string, Record<string, string>> = {
  // 관성격
  gwan: { personality: "책임감, 규범 의식, 긴장 속에서 성취하려는 성향이 강하다.", career: "조직, 관리, 자격, 공적 책임, 리스크 통제 직무와 맞는다.", wealth: "직위와 신뢰를 통해 재물이 축적되며 무리한 투기보다 안정 보상이 유리하다.", loveMarriage: "관계는 책임과 약속을 중시하며 결혼은 공식성, 신뢰, 역할 분담이 핵심이다." },
  // 재성격
  jae: { personality: "현실 감각, 계산력, 소유와 관리 욕구가 분명하다.", career: "사업, 영업, 재무, 운영, 자산 관리, 거래 기반 직무에 적성이 있다.", wealth: "돈의 흐름을 직접 다루는 구조이며 신강하면 큰 재물, 신약하면 재물 압박으로 나타난다.", loveMarriage: "현실 조건과 생활 안정이 관계 판단에 강하게 작동한다." },
  // 식상격
  siksang: { personality: "표현, 생산, 창작, 비판과 설계 능력이 전면에 드러난다.", career: "콘텐츠, 교육, 기획, 기술 생산, 브랜딩, 예술 직무에 맞는다.", wealth: "재물은 결과물과 노출, 생산성을 통해 열리며 지속 루틴이 관건이다.", loveMarriage: "매력과 표현력은 강하지만 말과 기대치 조율이 관계의 관건이다." },
  // 인성격
  in: { personality: "학습, 보호, 직감, 문서와 지식에 기대어 삶을 풀어간다.", career: "연구, 교육, 상담, 문서, 기획, 자격 기반 직무에 강하다.", wealth: "재물은 지식, 권한, 보호 자원, 장기 준비를 통해 안정화된다.", loveMarriage: "돌봄과 신뢰가 중요하며 의존과 거리감의 균형이 필요하다." },
  // 비겁격
  bigyeop: { personality: "자기 기준, 독립성, 강한 추진력과 버티는 힘이 중심이다.", career: "독립 업무, 리더십, 전문 기술, 경쟁 환경에서 힘을 발휘한다.", wealth: "재물은 주도권을 잡을수록 커지지만 비겁 과다 시 분산과 경쟁을 관리해야 한다.", loveMarriage: "관계에서도 독립성과 주도권이 강하므로 상대와 역할 균형이 중요하다." },
  // 기타·종격
  default: { personality: "한 기운에 삶의 방향이 크게 몰려 선택과 환경의 일치가 중요하다.", career: "격이 요구하는 오행과 십성이 살아나는 분야에서 크게 발복한다.", wealth: "격을 돕는 운에서는 재물이 열리고, 격을 깨는 운에서는 혼란이 커진다.", loveMarriage: "관계는 격의 균형을 보완하는 사람과 안정된다." },
};

const GYEOK_DOMAIN_READING = cmsRecord("saju-reading", "gyeokguk", GYEOK_DOMAIN_READING_DEFAULT);

function getGyeokDomainReading(name: string) {
  // 분기 순서를 유지한다 — 격 이름에 여러 글자가 같이 들 수 있어 먼저 걸리는 쪽이 정답이다.
  if (name.includes("관")) return GYEOK_DOMAIN_READING.gwan;
  if (name.includes("재")) return GYEOK_DOMAIN_READING.jae;
  if (name.includes("식") || name.includes("상")) return GYEOK_DOMAIN_READING.siksang;
  if (name.includes("인")) return GYEOK_DOMAIN_READING.in;
  if (name.includes("건록") || name.includes("양인") || name.includes("종왕") || name.includes("종강")) return GYEOK_DOMAIN_READING.bigyeop;
  return GYEOK_DOMAIN_READING.default;
}

function buildLuckTimingForGyeok(
  luckRows: Array<Record<string, unknown>>,
  helpfulElements: ElementKey[],
  breakingElements: ElementKey[],
  dayElement: ElementKey,
  isSpecialFollowing: boolean,
) {
  const asElementRows = luckRows.map((row) => {
    const stemElement = row.stem ? STEM_ELEMENT[row.stem as StemKr] : null;
    const branchElement = row.branch ? BRANCH_MAIN_ELEMENT[row.branch as BranchKr] : null;
    return {
      scope: row.scope || "unknown",
      label: row.label || "",
      stem: row.stem,
      branch: row.branch,
      stemElement,
      branchElement,
    };
  });
  return {
    activated: asElementRows.filter((row) => [row.stemElement, row.branchElement].some((element) => element && helpfulElements.includes(element as ElementKey)))
      .map((row) => ({
        ...row,
        reason: "격의 상신·희신·용신을 도와 격이 살아나는 시기",
      })),
    broken: asElementRows.filter((row) => [row.stemElement, row.branchElement].some((element) => element && (breakingElements.includes(element as ElementKey) || (isSpecialFollowing && element === dayElement))))
      .map((row) => ({
        ...row,
        reason: isSpecialFollowing && (row.stemElement === dayElement || row.branchElement === dayElement)
          ? "종격을 깨는 일간 조력 운"
          : "격을 방해하거나 파격 요소를 자극하는 시기",
      })),
  };
}

function buildGyeokgukAnalysis(
  pillars: LocalSajuResult["pillars"],
  dayStem: StemKr,
  dayMasterStrength: string,
  strengthIndex: number,
  rootingRows: Array<Record<string, unknown>>,
  effectivePower: Record<ElementKey, number>,
  visibleTenGods: Record<TenGodName, number>,
  hiddenTenGods: Record<TenGodName, number>,
  protrusions: Array<Record<string, unknown>>,
  usefulElements: ElementKey[],
  season: ReturnType<typeof getSeasonProfile>,
  interactions: ReturnType<typeof analyzeInteractions>,
  combinationClashAnalysis: Record<string, unknown>,
  luckRows: Array<Record<string, unknown>>,
) {
  const dayElement = STEM_ELEMENT[dayStem];
  const resourceElement = getProducerOf(dayElement);
  const outputElement = PRODUCES[dayElement];
  const wealthElement = CONTROLS[dayElement];
  const officerElement = getControllerOf(dayElement);
  const monthHidden = HIDDEN_STEMS_BY_BRANCH[pillars.month.branch].map((row, index) => ({
    ...row,
    role: index === 0 ? "본기" : index === 1 ? "중기" : "여기",
    element: STEM_ELEMENT[row.stem],
    tenGod: tenGodForStem(dayStem, row.stem),
    protruded: protrusions.some((item) => item.pillar === "month" && item.stem === row.stem),
  }));
  const breakFactors: Array<Record<string, unknown>> = [];
  const supportFactors: Array<Record<string, unknown>> = [];
  const candidates: Array<Record<string, unknown>> = [];

  monthHidden.forEach((row) => {
    const geokName = GEOK_BY_TEN_GOD[row.tenGod as TenGodName];
    if (!geokName) return;
    const protrusionBonus = row.protruded ? 2.2 : 0;
    const mainQiBonus = row.role === "본기" ? 1.2 : row.role === "중기" ? 0.65 : 0.35;
    const tenGodPower = visibleTenGods[row.tenGod as TenGodName] + hiddenTenGods[row.tenGod as TenGodName];
    const score = round2(mainQiBonus + protrusionBonus + tenGodPower * 0.35 + season.weights[row.element as ElementKey] * 0.35);
    candidates.push({
      type: "일반격",
      name: geokName,
      source: "월지 지장간",
      monthHiddenStem: row.stem,
      hiddenRole: row.role,
      tenGod: row.tenGod,
      protruded: row.protruded,
      score,
      reason: row.protruded
        ? `월지 ${pillars.month.branch}의 ${row.role} ${row.stem}가 천간에 투출하여 ${row.tenGod}이 격으로 성립할 힘을 얻음`
        : `월지 ${pillars.month.branch}의 ${row.role} ${row.stem}가 ${row.tenGod}으로 월령의 중심 후보`,
    });
  });

  if (pillars.month.branch === GEONROK_BRANCH_BY_STEM[dayStem]) {
    candidates.push({ type: "일반격", name: "건록격", source: "월지", score: round2(3 + strengthIndex * 3), reason: "월지가 일간의 건록지로 일간의 자립성과 실행력이 월령을 잡음" });
  }
  if (YANGIN_BRANCH_BY_STEM[dayStem] && pillars.month.branch === YANGIN_BRANCH_BY_STEM[dayStem]) {
    candidates.push({ type: "일반격", name: "양인격", source: "월지", score: round2(3.2 + strengthIndex * 3), reason: "월지가 양인지로 강한 돌파력과 경쟁성이 월령을 잡음" });
  }

  const rooted = rootingRows.some((row) => Number(row.score || 0) > 0.45);
  const strongRooted = rootingRows.some((row) => Number(row.score || 0) >= 1.3);
  const totalPower = ELEMENTS.reduce((sum, element) => sum + effectivePower[element], 0) || 1;
  const topElement = [...ELEMENTS].sort((a, b) => effectivePower[b] - effectivePower[a])[0];
  const topRatio = effectivePower[topElement] / totalPower;
  const followingElement = topElement;
  if (strengthIndex < 0.22 && !rooted) {
    const name = followingElement === wealthElement
      ? "종재격"
      : followingElement === officerElement
        ? "종관살격"
        : followingElement === outputElement
          ? "종아격"
          : "종세격 후보";
    candidates.push({
      type: "특수격",
      name,
      source: "종격",
      score: round2(4 + topRatio * 4),
      reason: "일간이 극도로 약하고 거역할 뿌리가 약해 압도 세력에 따르는 종격 후보",
      caution: "인성·비겁의 뿌리나 운이 오면 종격이 깨질 수 있음",
    });
  }
  if (strengthIndex >= 0.5 && strongRooted) {
    candidates.push({
      type: "특수격",
      name: effectivePower[dayElement] >= effectivePower[resourceElement] ? "종왕격" : "종강격",
      source: "종왕/종강",
      score: round2(3.2 + strengthIndex * 3),
      reason: "일간 또는 인비 세력이 강하고 뿌리가 있어 자신을 따르는 구조 후보",
    });
  }
  if (topRatio >= 0.52) {
    candidates.push({
      type: "특수격",
      name: "전왕격",
      source: "오행 집중",
      score: round2(3 + topRatio * 4),
      reason: `${ELEMENT_KO[topElement]} 세력이 사주 전체를 압도하여 한 방향으로 몰리는 구조`,
    });
    candidates.push({
      type: "특수격",
      name: "일행득기격",
      source: "일행 집중",
      score: round2(2.7 + topRatio * 3.5),
      reason: `${ELEMENT_KO[topElement]} 한 기운이 계절과 구조를 얻은 외격 후보`,
    });
  }
  const successfulStemCombination = ((combinationClashAnalysis.stemCombinations as Array<Record<string, unknown>> | undefined) || []).find((row) => row.success);
  if (successfulStemCombination) {
    candidates.push({
      type: "특수격",
      name: "화기격",
      source: "천간합화",
      score: 3.6,
      reason: `천간합이 ${successfulStemCombination.transformedElementKo || ""}로 합화되어 화기격 후보가 됨`,
    });
  }

  if (!candidates.length) {
    candidates.push({
      type: "일반격",
      name: GEOK_BY_TEN_GOD[monthHidden[0]?.tenGod as TenGodName] || "월령중심격",
      source: "월지 본기",
      score: 1.8,
      reason: "월지 본기 중심으로 격을 보되 투출이 약해 보수 판정",
    });
  }

  if (interactions.branchRelations.some((row) => row.type === "충발")) {
    breakFactors.push({ type: "충", reason: "월령 또는 격의 기반이 충으로 흔들릴 수 있음", rows: interactions.branchRelations.filter((row) => row.type === "충발") });
  }
  if (((combinationClashAnalysis.requiredOutputRows as Array<Record<string, unknown>> | undefined) || []).some((row) => String(row.resultType || "").includes("합거"))) {
    breakFactors.push({ type: "합거", reason: "중요 십성이 합으로 묶여 지연·왜곡·관계 의존으로 나타날 수 있음" });
  }
  const officerMixed = (visibleTenGods["편관"] + hiddenTenGods["편관"] > 0.45) && (visibleTenGods["정관"] + hiddenTenGods["정관"] > 0.45);
  if (officerMixed) breakFactors.push({ type: "혼잡", reason: "정관과 편관이 함께 강해 관살혼잡으로 격이 탁해질 수 있음" });
  if (protrusions.some((row) => row.pillar === "month")) {
    supportFactors.push({ type: "월지 투간", reason: "월지 지장간이 천간에 드러나 격의 현실 작용력이 강함", rows: protrusions.filter((row) => row.pillar === "month") });
  }
  usefulElements.forEach((element) => supportFactors.push({ type: "용신", element, elementKo: ELEMENT_KO[element], reason: "격을 조율하는 최종 우선 오행" }));

  const sortedCandidates = candidates.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  const final = sortedCandidates[0];
  const finalName = String(final.name || "월령중심격");
  const isSpecialFollowing = finalName.includes("종");
  const helpfulElements = usefulElements;
  const breakingElements = isSpecialFollowing
    ? [dayElement, resourceElement]
    : ELEMENTS.filter((element) => !usefulElements.includes(element) && effectivePower[element] >= 0.8);
  const luckTiming = buildLuckTimingForGyeok(luckRows, helpfulElements, breakingElements, dayElement, isSpecialFollowing);

  return {
    finalGyeokguk: finalName,
    finalType: final.type || "일반격",
    candidates: sortedCandidates.slice(0, 3),
    judgmentReason: final.reason,
    monthBranch: pillars.month.branch,
    monthHiddenStems: monthHidden,
    protrudedMonthHiddenStems: monthHidden.filter((row) => row.protruded),
    breakFactors,
    supportFactors,
    usefulSupport: {
      sangsin: helpfulElements[0] || null,
      heesin: helpfulElements.slice(1, 3),
      yongshin: usefulElements,
      breakingElements,
    },
    normalOrSpecial: final.type || "일반격",
    domainReading: getGyeokDomainReading(finalName),
    luckTiming,
    requiredOutput: {
      finalGyeokguk: finalName,
      candidates: sortedCandidates.slice(0, 3).map((row) => row.name),
      reason: final.reason,
      breakFactors,
      personality: getGyeokDomainReading(finalName).personality,
      career: getGyeokDomainReading(finalName).career,
      wealth: getGyeokDomainReading(finalName).wealth,
      loveMarriage: getGyeokDomainReading(finalName).loveMarriage,
      activatedLuck: luckTiming.activated,
      brokenLuck: luckTiming.broken,
    },
  };
}

function getElementLocations(pillars: LocalSajuResult["pillars"], element: ElementKey) {
  const entries = getPillarEntries(pillars);
  return {
    present: entries.some((row) => STEM_ELEMENT[row.pillar.stem] === element || BRANCH_MAIN_ELEMENT[row.pillar.branch] === element || HIDDEN_STEMS_BY_BRANCH[row.pillar.branch].some((hidden) => STEM_ELEMENT[hidden.stem] === element)),
    heavenlyStems: entries.filter((row) => STEM_ELEMENT[row.pillar.stem] === element).map((row) => ({ pillar: row.key, stem: row.pillar.stem })),
    branches: entries.filter((row) => BRANCH_MAIN_ELEMENT[row.pillar.branch] === element).map((row) => ({ pillar: row.key, branch: row.pillar.branch })),
    hiddenStems: entries.flatMap((row) => HIDDEN_STEMS_BY_BRANCH[row.pillar.branch]
      .filter((hidden) => STEM_ELEMENT[hidden.stem] === element)
      .map((hidden) => ({ pillar: row.key, branch: row.pillar.branch, stem: hidden.stem, weight: hidden.weight }))),
  };
}

function getLuckElementMatches(luckRows: Array<Record<string, unknown>>, element: ElementKey, scopeFilter?: string) {
  return luckRows.filter((row) => {
    if (scopeFilter && row.scope !== scopeFilter) return false;
    const stemElement = row.stem ? STEM_ELEMENT[row.stem as StemKr] : null;
    const branchElement = row.branch ? BRANCH_MAIN_ELEMENT[row.branch as BranchKr] : null;
    const hiddenMatch = Array.isArray(row.hidden) && row.hidden.some((hidden) => STEM_ELEMENT[(hidden as Record<string, unknown>).stem as StemKr] === element);
    return stemElement === element || branchElement === element || hiddenMatch;
  });
}

function getDiseasePattern(effectivePower: Record<ElementKey, number>) {
  const total = ELEMENTS.reduce((sum, element) => sum + effectivePower[element], 0) || 1;
  const ratio = (element: ElementKey) => effectivePower[element] / total;
  if (ratio("fire") + ratio("earth") >= 0.48 && ratio("water") < 0.14) {
    return { name: "화염토조", diseaseElements: ["fire", "earth"], medicineElements: ["water", "metal"], reason: "화와 토가 뜨겁고 메말라 수의 윤택함과 금의 정리가 약으로 필요하다." };
  }
  if (ratio("metal") + ratio("water") >= 0.48 && ratio("fire") < 0.14) {
    return { name: "금수한랭", diseaseElements: ["metal", "water"], medicineElements: ["fire", "wood"], reason: "금수의 한랭함이 강해 화의 온기와 목의 생발이 약으로 필요하다." };
  }
  if (ratio("wood") >= 0.34 && ratio("earth") < 0.16) {
    return { name: "목다토붕", diseaseElements: ["wood"], medicineElements: ["fire", "earth"], reason: "목이 토를 흔들어 현실 기반이 약하므로 화로 설기하고 토를 세워야 한다." };
  }
  if (ratio("water") >= 0.34 && ratio("wood") < 0.18) {
    return { name: "수다목부", diseaseElements: ["water"], medicineElements: ["earth", "fire"], reason: "수가 많아 목이 떠내려가기 쉬우므로 토로 제방을 세우고 화로 온기를 보탠다." };
  }
  if (ratio("earth") >= 0.34 && ratio("metal") < 0.18) {
    return { name: "토다금매", diseaseElements: ["earth"], medicineElements: ["wood", "water"], reason: "토가 많아 금이 묻히므로 목으로 토를 소통시키고 수로 막힌 기운을 풀어야 한다." };
  }
  return { name: "특정 병약 과중 없음", diseaseElements: [], medicineElements: [], reason: "오행의 가장 큰 병은 조후·격국·억부 판단과 함께 보수적으로 본다." };
}

function getTonggwanBridge(effectivePower: Record<ElementKey, number>) {
  const total = ELEMENTS.reduce((sum, element) => sum + effectivePower[element], 0) || 1;
  const rows = ELEMENTS.flatMap((controller) => {
    const controlled = CONTROLS[controller];
    const controllerRatio = effectivePower[controller] / total;
    const controlledRatio = effectivePower[controlled] / total;
    if (controllerRatio < 0.2 || controlledRatio < 0.2) return [];
    const bridge = PRODUCES[controller];
    return [{
      conflict: `${ELEMENT_KO[controller]}${ELEMENT_KO[controlled]}상전`,
      controller,
      controlled,
      bridge,
      bridgeKo: ELEMENT_KO[bridge],
      reason: `${ELEMENT_KO[controller]}이 ${ELEMENT_KO[controlled]}을 강하게 치므로 ${ELEMENT_KO[bridge]}가 중간에서 흐름을 이어 통관한다.`,
    }];
  });
  return rows.sort((a, b) => (effectivePower[b.controller] + effectivePower[b.controlled]) - (effectivePower[a.controller] + effectivePower[a.controlled]))[0] || null;
}

function uniqueElements(elements: Array<ElementKey | null | undefined>): ElementKey[] {
  return Array.from(new Set(elements.filter(Boolean) as ElementKey[]));
}

function buildYongshinAnalysis(
  pillars: LocalSajuResult["pillars"],
  dayStem: StemKr,
  dayMasterStrength: string,
  strengthIndex: number,
  effectivePower: Record<ElementKey, number>,
  normalizedClimate: Record<string, number>,
  urgentElement: ElementKey,
  suppressingUseful: ElementKey[],
  usefulElements: ElementKey[],
  gyeokgukAnalysis: Record<string, unknown>,
  combinationClashAnalysis: Record<string, unknown>,
  doChungAnalysis: Record<string, unknown>,
  luckRows: Array<Record<string, unknown>>,
) {
  const dayElement = STEM_ELEMENT[dayStem];
  const resourceElement = getProducerOf(dayElement);
  const outputElement = PRODUCES[dayElement];
  const wealthElement = CONTROLS[dayElement];
  const officerElement = getControllerOf(dayElement);
  const disease = getDiseasePattern(effectivePower);
  const tonggwan = getTonggwanBridge(effectivePower);
  const climateUrgent = Math.abs(Number(normalizedClimate.temperature || 0)) >= 1.2 || Number(normalizedClimate.humidity || 0) >= 1.25 || Number(normalizedClimate.dryness || 0) >= 1.25;
  const gyeokSupport = (gyeokgukAnalysis.usefulSupport || {}) as Record<string, unknown>;
  const gyeokYongshin = Array.isArray(gyeokSupport.yongshin) ? gyeokSupport.yongshin as ElementKey[] : usefulElements;
  const finalGyeok = String(gyeokgukAnalysis.finalGyeokguk || "");
  const isFollowingGyeok = finalGyeok.includes("종");
  const topElement = [...ELEMENTS].sort((a, b) => effectivePower[b] - effectivePower[a])[0];
  const eokbuUseful = dayMasterStrength === "과약" || dayMasterStrength === "신약"
    ? [resourceElement, dayElement]
    : dayMasterStrength === "과왕" || dayMasterStrength === "신강"
      ? [outputElement, wealthElement, officerElement]
      : suppressingUseful;
  const diseaseMedicine = (disease.medicineElements || []) as ElementKey[];
  const tonggwanUseful = tonggwan ? [tonggwan.bridge as ElementKey] : [];
  const followingUseful = isFollowingGyeok ? [topElement] : [];
  const priorityPool = uniqueElements([
    climateUrgent ? urgentElement : null,
    ...diseaseMedicine,
    ...tonggwanUseful,
    ...gyeokYongshin,
    ...followingUseful,
    ...eokbuUseful,
  ]);
  const coreYongshin = priorityPool[0] || urgentElement;
  const auxiliaryYongshin = priorityPool.filter((element) => element !== coreYongshin).slice(0, 3);
  const heesin = uniqueElements([...auxiliaryYongshin, getProducerOf(coreYongshin)]).filter((element) => element !== coreYongshin).slice(0, 3);
  const strongestElement = [...ELEMENTS].sort((a, b) => effectivePower[b] - effectivePower[a])[0];
  const gisin = ELEMENTS.filter((element) => ![coreYongshin, ...auxiliaryYongshin, ...heesin].includes(element))
    .sort((a, b) => effectivePower[b] - effectivePower[a])
    .slice(0, 2);
  const gusin = uniqueElements(gisin.map((element) => getProducerOf(element))).filter((element) => ![coreYongshin, ...auxiliaryYongshin, ...heesin].includes(element));
  const hansin = ELEMENTS.filter((element) => ![coreYongshin, ...auxiliaryYongshin, ...heesin, ...gisin, ...gusin].includes(element));
  const locations = getElementLocations(pillars, coreYongshin);
  const daewoonActivation = getLuckElementMatches(luckRows, coreYongshin, "daewoon");
  const annualActivation = getLuckElementMatches(luckRows, coreYongshin, "annual");
  const transformedByCombination = [
    ...((combinationClashAnalysis.stemCombinations as Array<Record<string, unknown>> | undefined) || []),
    ...((combinationClashAnalysis.branchCombinations as Array<Record<string, unknown>> | undefined) || []),
  ].filter((row) => row.transformedElement === coreYongshin);
  const brokenByClash = ((combinationClashAnalysis.clashes as Array<Record<string, unknown>> | undefined) || [])
    .filter((row) => String(row.usefulUnfavorableShift || "").includes("길에서 흉") || JSON.stringify(row).includes(coreYongshin));
  const inducedByDoChung = ((doChungAnalysis.candidates as Array<Record<string, unknown>> | undefined) || [])
    .filter((row) => row.inducedState === "용신" && BRANCH_MAIN_ELEMENT[row.inducedOppositeBranch as BranchKr] === coreYongshin);
  const reasonParts = [
    climateUrgent && `조후가 급해 ${ELEMENT_KO[urgentElement]}가 먼저 필요하다`,
    disease.name !== "특정 병약 과중 없음" && `${disease.name}의 병을 치료하는 약이 ${diseaseMedicine.map((element) => ELEMENT_KO[element]).join(", ")}이다`,
    tonggwan && `${tonggwan.conflict}에는 ${tonggwan.bridgeKo} 통관이 필요하다`,
    isFollowingGyeok && `${finalGyeok}은 종하는 기운 ${ELEMENT_KO[topElement]}를 따라야 한다`,
    `억부상 ${dayMasterStrength} 구조라 ${eokbuUseful.map((element) => ELEMENT_KO[element]).join(", ")}가 균형을 잡는다`,
    `${gyeokgukAnalysis.finalGyeokguk || "격국"}을 살리는 상신·희신을 함께 보았다`,
  ].filter(Boolean);

  const fieldUseful = {
    job: uniqueElements([gyeokYongshin[0], outputElement, officerElement, coreYongshin]).slice(0, 3),
    love: uniqueElements([officerElement, wealthElement, coreYongshin]).slice(0, 3),
    wealth: uniqueElements([wealthElement, outputElement, coreYongshin]).slice(0, 3),
  };

  return {
    coreYongshin,
    coreYongshinKo: ELEMENT_KO[coreYongshin],
    auxiliaryYongshin,
    auxiliaryYongshinKo: auxiliaryYongshin.map((element) => ELEMENT_KO[element]),
    heesin,
    heesinKo: heesin.map((element) => ELEMENT_KO[element]),
    gisin,
    gisinKo: gisin.map((element) => ELEMENT_KO[element]),
    gusin,
    gusinKo: gusin.map((element) => ELEMENT_KO[element]),
    hansin,
    hansinKo: hansin.map((element) => ELEMENT_KO[element]),
    johuYongshin: urgentElement,
    eokbuYongshin: eokbuUseful,
    gyeokgukYongshin: gyeokYongshin,
    jobYongshin: fieldUseful.job,
    loveYongshin: fieldUseful.love,
    wealthYongshin: fieldUseful.wealth,
    disease,
    tonggwan,
    judgment: {
      dayMasterStrength,
      strengthIndex: round2(strengthIndex),
      climate: normalizedClimate,
      gyeokguk: gyeokgukAnalysis.finalGyeokguk,
      isFollowingGyeok,
      strongestElement,
      reason: reasonParts.join(" / "),
    },
    requiredExplanation: {
      whyThisElement: reasonParts,
      existsInNatalChart: locations.present,
      heavenlyStemLocations: locations.heavenlyStems,
      branchLocations: locations.branches,
      hiddenStemLocations: locations.hiddenStems,
      daewoonActivation,
      annualActivation,
      transformedToYongshinByCombination: transformedByCombination,
      yongshinBrokenByClashTiming: brokenByClash,
      yongshinInducedByDoChung: inducedByDoChung,
    },
  };
}

function getElementRelation(from: ElementKey, to: ElementKey): string {
  if (from === to) return "동기";
  if (PRODUCES[from] === to) return "생";
  if (PRODUCES[to] === from) return "생받음";
  if (CONTROLS[from] === to) return "극";
  if (CONTROLS[to] === from) return "극받음";
  return "중립";
}

function findGroupCompletions(branch: BranchKr, natalBranches: BranchKr[]) {
  return [...BRANCH_TRIADS, ...BRANCH_DIRECTIONS].flatMap((group) => {
    if (!group.branches.includes(branch)) return [];
    const matched = group.branches.filter((candidate) => candidate === branch || natalBranches.includes(candidate));
    if (matched.length < 2) return [];
    return [{
      type: matched.length === 3 ? group.type : "반합",
      branches: matched,
      targetElement: group.element,
      complete: matched.length === 3,
    }];
  });
}

function filterRowsByDaewoon(rows: unknown): Array<Record<string, unknown>> {
  return (Array.isArray(rows) ? rows : []).filter((row) => JSON.stringify(row).includes("daewoon")) as Array<Record<string, unknown>>;
}

function buildLuckInteractionDetailAnalysis(
  pillars: LocalSajuResult["pillars"],
  dayStem: StemKr,
  usefulElements: ElementKey[],
  effectivePower: Record<ElementKey, number>,
  season: ReturnType<typeof getSeasonProfile>,
  yongshinAnalysis: Record<string, unknown>,
  combinationClashAnalysis: Record<string, unknown>,
  doChungAnalysis: Record<string, unknown>,
  luckRows: Array<Record<string, unknown>>,
) {
  const natalEntries = getPillarEntries(pillars);
  const currentDaewoon = luckRows.find((row) => row.scope === "daewoon");
  const currentAnnual = luckRows.find((row) => row.scope === "annual");
  const gisin = (Array.isArray(yongshinAnalysis.gisin) ? yongshinAnalysis.gisin : []) as ElementKey[];
  const johuYongshin = yongshinAnalysis.johuYongshin as ElementKey | undefined;
  const stemClashes = new Set([
    pairKey(STEMS[0], STEMS[6], STEMS),
    pairKey(STEMS[1], STEMS[7], STEMS),
    pairKey(STEMS[2], STEMS[8], STEMS),
    pairKey(STEMS[3], STEMS[9], STEMS),
  ]);
  const describeState = (element: ElementKey | null | undefined) => {
    if (!element) return "중립";
    if (usefulElements.includes(element)) return "용신";
    if (gisin.includes(element)) return "기신";
    return "한신";
  };
  const labelOfLuck = (row: Record<string, unknown> | undefined, fallback: string) => String(row?.label || row?.ganji || fallback);
  const hiddenStemRows = (branch: BranchKr | undefined) => branch
    ? HIDDEN_STEMS_BY_BRANCH[branch].map((hidden) => ({
      stem: hidden.stem,
      element: STEM_ELEMENT[hidden.stem],
      elementKo: ELEMENT_KO[STEM_ELEMENT[hidden.stem]],
      tenGod: tenGodForStem(dayStem, hidden.stem),
      weight: hidden.weight,
    }))
    : [];
  const buildStemCombinationChecks = (luck: Record<string, unknown> | undefined, scopeLabel: string) => {
    const luckStem = luck?.stem as StemKr | undefined;
    if (!luckStem) return [];
    return natalEntries.map(({ key, pillar }) => {
      const transformedElement = STEM_COMBINATION_TO_ELEMENT[pairKey(luckStem, pillar.stem, STEMS)] || null;
      const seasonSupport = transformedElement ? season.dominantElement === transformedElement || season.weights[transformedElement] >= 1.15 : false;
      const rootSupport = transformedElement ? hasBranchRootForElement(natalEntries.map((row) => row.pillar.branch), transformedElement) : false;
      const powerSupport = transformedElement ? effectivePower[transformedElement] >= 1.6 : false;
      const clashInterference = transformedElement
        ? natalEntries.some((row) => BRANCH_CLASHES.has(pairKey(row.pillar.branch, getOppositeBranch(row.pillar.branch), BRANCHES)) && BRANCH_MAIN_ELEMENT[row.pillar.branch] === transformedElement)
        : false;
      const success = Boolean(transformedElement && [seasonSupport, rootSupport, powerSupport].filter(Boolean).length >= 2 && !clashInterference);
      const resultType = transformedElement ? success ? "합화" : describeState(STEM_ELEMENT[luckStem]) === "용신" || describeState(STEM_ELEMENT[pillar.stem]) === "용신" ? "합거" : "합반" : "합 없음";
      const transformedTenGod = transformedElement ? tenGodForStem(dayStem, representativeStemForElement(transformedElement)) : null;
      const event = transformedTenGod ? getEventPrediction(transformedTenGod, success ? "천간합화" : "천간합거", describeState(transformedElement)) : null;
      return {
        scope: scopeLabel,
        luckStem,
        natalPillar: key,
        natalStem: pillar.stem,
        natalStemExists: true,
        combinationRule: transformedElement ? `${luckStem}${pillar.stem}合${ELEMENT_KO[transformedElement]}` : `${luckStem}${pillar.stem} 직접 천간합 없음`,
        luckStemTenGod: tenGodForStem(dayStem, luckStem),
        natalStemTenGod: tenGodForStem(dayStem, pillar.stem),
        transformedElement,
        transformedElementKo: transformedElement ? ELEMENT_KO[transformedElement] : null,
        transformedTenGod,
        transformedUseState: describeState(transformedElement),
        combinationConditions: { seasonSupport, rootSupport, powerSupport, clashInterference },
        resultType,
        practicalChange: event ? {
          career: event.career,
          contract: event.moveContractRelation,
          relationship: event.summary,
          love: event.love,
        } : {
          career: "직접 합화보다 생극 관계로 해석한다.",
          contract: "계약·협업은 합거가 아니라 해당 십성의 생극으로 판단한다.",
          relationship: "강한 묶임보다는 상호 자극으로 작동한다.",
          love: "연애 사건성은 지지 합충과 배우자성 발동을 추가 확인한다.",
        },
      };
    });
  };
  const buildStemClashChecks = (luck: Record<string, unknown> | undefined, scopeLabel: string, includeDaewoon = false) => {
    const luckStem = luck?.stem as StemKr | undefined;
    if (!luckStem) return [];
    const targets = [
      ...natalEntries.map(({ key, pillar }) => ({ source: "원국", scope: key, stem: pillar.stem })),
      ...(includeDaewoon && currentDaewoon?.stem ? [{ source: "대운", scope: "daewoon", stem: currentDaewoon.stem as StemKr }] : []),
    ];
    return targets.map((target) => {
      const isClash = stemClashes.has(pairKey(luckStem, target.stem, STEMS));
      const leftElement = STEM_ELEMENT[luckStem];
      const rightElement = STEM_ELEMENT[target.stem];
      const damagesJohuYongshin = isClash && Boolean(johuYongshin && (leftElement === johuYongshin || rightElement === johuYongshin));
      return {
        scope: scopeLabel,
        luckStem,
        targetSource: target.source,
        targetScope: target.scope,
        targetStem: target.stem,
        clashRule: isClash ? `${luckStem}${target.stem}沖` : `${luckStem}${target.stem} 천간충 없음`,
        isClash,
        luckStemTenGod: tenGodForStem(dayStem, luckStem),
        targetStemTenGod: tenGodForStem(dayStem, target.stem),
        elements: [
          { stem: luckStem, element: leftElement, elementKo: ELEMENT_KO[leftElement], useState: describeState(leftElement) },
          { stem: target.stem, element: rightElement, elementKo: ELEMENT_KO[rightElement], useState: describeState(rightElement) },
        ],
        damagesJohuYongshin,
        meaning: isClash
          ? damagesJohuYongshin
            ? "천간충이 조후 용신을 건드리므로 표면 사건보다 컨디션·판단력·관계 온도 저하를 먼저 본다."
            : "천간충은 드러난 사건, 말, 계약, 권한 충돌로 빠르게 사건화된다."
          : "천간충은 아니며 생극과 합 여부를 우선한다.",
      };
    });
  };
  const buildBranchRelations = (luck: Record<string, unknown> | undefined, scopeLabel: string, includeDaewoon = false) => {
    const luckBranch = luck?.branch as BranchKr | undefined;
    if (!luckBranch) return [];
    const targets = [
      ...natalEntries.map(({ key, pillar }) => ({ source: "원국", scope: key, branch: pillar.branch })),
      ...(includeDaewoon && currentDaewoon?.branch ? [{ source: "대운", scope: "daewoon", branch: currentDaewoon.branch as BranchKr }] : []),
    ];
    return targets.flatMap((target) => {
      const relationKey = pairKey(luckBranch, target.branch, BRANCHES);
      const rows: Array<Record<string, unknown>> = [];
      if (BRANCH_COMBINATION_TO_ELEMENT[relationKey]) rows.push({ relation: "합", transformedElement: BRANCH_COMBINATION_TO_ELEMENT[relationKey], transformedElementKo: ELEMENT_KO[BRANCH_COMBINATION_TO_ELEMENT[relationKey]] });
      if (BRANCH_CLASHES.has(relationKey)) rows.push({ relation: "충" });
      if (BRANCH_HARMS.has(relationKey)) rows.push({ relation: "해" });
      if (BRANCH_BREAKS.has(relationKey)) rows.push({ relation: "파" });
      if (!rows.length) rows.push({ relation: "직접 합충형파해 없음" });
      return rows.map((row) => ({
        scope: scopeLabel,
        luckBranch,
        luckBranchMainStem: getMainHiddenStem(luckBranch),
        luckBranchTenGod: tenGodForStem(dayStem, getMainHiddenStem(luckBranch)),
        targetSource: target.source,
        targetScope: target.scope,
        targetBranch: target.branch,
        targetLifeArea: target.source === "원국" ? PILLAR_LIFE_AREA[target.scope as PillarKey] : "현재 대운 환경",
        luckBranchUseState: describeState(BRANCH_MAIN_ELEMENT[luckBranch]),
        targetUseState: describeState(BRANCH_MAIN_ELEMENT[target.branch]),
        ...row,
      }));
    });
  };
  const buildBranchSaturation = (luck: Record<string, unknown> | undefined, scopeLabel: string) => {
    const luckBranch = luck?.branch as BranchKr | undefined;
    if (!luckBranch) return null;
    const natalCount = natalEntries.filter((row) => row.pillar.branch === luckBranch).length;
    const daewoonCount = currentDaewoon?.branch === luckBranch ? 1 : 0;
    const annualCount = currentAnnual?.branch === luckBranch ? 1 : 0;
    const totalCount = natalCount + daewoonCount + annualCount;
    const inducedOppositeBranch = getOppositeBranch(luckBranch);
    const repeatedElement = BRANCH_MAIN_ELEMENT[luckBranch];
    const inducedElement = BRANCH_MAIN_ELEMENT[inducedOppositeBranch];
    return {
      scope: scopeLabel,
      repeatedBranch: luckBranch,
      natalCount,
      daewoonCount,
      annualCount,
      totalCount,
      doChungCandidate: totalCount >= 3,
      inducedOppositeBranch,
      inducedOppositeTenGod: tenGodForStem(dayStem, getMainHiddenStem(inducedOppositeBranch)),
      repeatedUseState: describeState(repeatedElement),
      inducedUseState: describeState(inducedElement),
      classification: totalCount >= 3 ? classifyDoChung(usefulElements.includes(repeatedElement), usefulElements.includes(inducedElement)) : "도충 후보 미달",
      practicalMeaning: totalCount >= 3
        ? "같은 지지 과포화로 반대 글자가 유도되어 관계·직업·건강의 방향이 갑자기 꺾일 수 있다."
        : "중첩은 있으나 도충 발동 기준까지는 약하므로 단순 강화로 먼저 본다.",
    };
  };
  const daewoonBranch = currentDaewoon?.branch as BranchKr | undefined;
  const annualBranch = currentAnnual?.branch as BranchKr | undefined;
  const daewoonBranchElement = daewoonBranch ? BRANCH_MAIN_ELEMENT[daewoonBranch] : null;
  const annualBranchElement = annualBranch ? BRANCH_MAIN_ELEMENT[annualBranch] : null;
  const annualStemClashes = buildStemClashChecks(currentAnnual, "세운", true).filter((row) => row.isClash);
  const annualSaturation = buildBranchSaturation(currentAnnual, "세운");
  const annualUseful = uniqueElements([currentAnnual?.stem ? STEM_ELEMENT[currentAnnual.stem as StemKr] : null, annualBranchElement]).filter((element) => usefulElements.includes(element));
  const annualRisk = uniqueElements([currentAnnual?.stem ? STEM_ELEMENT[currentAnnual.stem as StemKr] : null, annualBranchElement]).filter((element) => gisin.includes(element));
  const finalClassification = annualSaturation?.doChungCandidate
    ? annualSaturation.classification
    : annualStemClashes.some((row) => row.damagesJohuYongshin)
      ? "표면적으로는 움직임이 강하지만 조후 용신을 건드려 주의가 필요한 세운"
      : annualUseful.length && !annualRisk.length
        ? "대운 위에서 세운이 용신을 발동하는 유리한 사건 운"
        : annualRisk.length && !annualUseful.length
          ? "기신 사건성이 강해 확장보다 정비가 필요한 세운"
          : "길흉이 혼재되어 합화·충·도충 결과를 분리해야 하는 세운";

  return {
    principle: "대운과 세운은 간지 한 줄로 단정하지 않고, 천간합·천간충·지지합충형파해·지장간·용신/기신·도충을 분해해 실제 사건으로 번역한다.",
    daewoonFoundation: currentDaewoon ? {
      ganji: currentDaewoon.ganji || "",
      label: labelOfLuck(currentDaewoon, "현재 대운"),
      stem: currentDaewoon.stem || null,
      branch: daewoonBranch || null,
      stemTenGod: currentDaewoon.stem ? tenGodForStem(dayStem, currentDaewoon.stem as StemKr) : null,
      branchMainStem: daewoonBranch ? getMainHiddenStem(daewoonBranch) : null,
      branchTenGod: daewoonBranch ? tenGodForStem(dayStem, getMainHiddenStem(daewoonBranch)) : null,
      branchHiddenStems: hiddenStemRows(daewoonBranch),
      branchUseState: describeState(daewoonBranchElement),
      heavenlyStemCombinationChecks: buildStemCombinationChecks(currentDaewoon, "대운").filter((row) => row.transformedElement),
      heavenlyStemAllChecks: buildStemCombinationChecks(currentDaewoon, "대운"),
      earthlyBranchRelations: buildBranchRelations(currentDaewoon, "대운"),
      groupCompletions: daewoonBranch ? findGroupCompletions(daewoonBranch, natalEntries.map((row) => row.pillar.branch)) : [],
      doChungTriggered: ((doChungAnalysis.candidates as Array<Record<string, unknown>> | undefined) || []).filter((row) => JSON.stringify(row.sources || []).includes("daewoon")),
      interpretation: daewoonBranchElement && usefulElements.includes(daewoonBranchElement)
        ? "대운 지지가 용신이면 생활권, 직업 기반, 관계 환경에서 장기 회복력이 생긴다."
        : daewoonBranchElement && gisin.includes(daewoonBranchElement)
          ? "대운 지지가 기신이면 10년 배경에서 압박, 정체, 반복 문제가 커질 수 있다."
          : "대운 지지는 용신과 기신을 함께 건드리므로 합충 결과를 분리해 보아야 한다.",
    } : { status: "not_supplied", interpretation: "현재 대운 입력이 없어 대운 기반 상세 판별을 보류한다." },
    annualEventTrigger: currentAnnual ? {
      ganji: currentAnnual.ganji || "",
      label: labelOfLuck(currentAnnual, "현재 세운"),
      stem: currentAnnual.stem || null,
      branch: annualBranch || null,
      stemTenGod: currentAnnual.stem ? tenGodForStem(dayStem, currentAnnual.stem as StemKr) : null,
      branchMainStem: annualBranch ? getMainHiddenStem(annualBranch) : null,
      branchTenGod: annualBranch ? tenGodForStem(dayStem, getMainHiddenStem(annualBranch)) : null,
      branchHiddenStems: hiddenStemRows(annualBranch),
      heavenlyStemCombinationChecks: buildStemCombinationChecks(currentAnnual, "세운").filter((row) => row.transformedElement),
      heavenlyStemClashChecks: buildStemClashChecks(currentAnnual, "세운", true),
      damagingJohuClashes: annualStemClashes.filter((row) => row.damagesJohuYongshin),
      earthlyBranchRelations: buildBranchRelations(currentAnnual, "세운", true),
      branchSaturation: annualSaturation,
      doChungMatches: ((doChungAnalysis.candidates as Array<Record<string, unknown>> | undefined) || []).filter((row) => JSON.stringify(row.sources || []).includes("annual")),
      finalClassification,
    } : { status: "not_supplied", finalClassification: "현재 세운 입력이 없어 세운 사건성 판별을 보류한다." },
    integratedFinalReading: {
      daewoonBase: currentDaewoon
        ? `대운의 기반은 ${labelOfLuck(currentDaewoon, "현재 대운")}이며, 천간은 외부 사건성, 지지는 생활권 변화로 본다.`
        : "대운 기반은 입력되지 않았다.",
      annualEvent: currentAnnual
        ? `세운의 사건성은 ${labelOfLuck(currentAnnual, "현재 세운")}에서 발생하며, 천간충·지지 중첩·도충 여부를 먼저 확인한다.`
        : "세운 사건성은 입력되지 않았다.",
      natalWeakPoint: annualStemClashes.some((row) => row.damagesJohuYongshin)
        ? "원국의 취약 지점은 조후 용신이 천간충으로 흔들리는 부분이다."
        : ((combinationClashAnalysis.clashes as Array<Record<string, unknown>> | undefined) || []).length
          ? "원국의 취약 지점은 지지 충이 궁을 건드릴 때 생활권과 관계가 흔들리는 부분이다."
          : "원국 취약점은 구조 이슈보다 운에서 어떤 글자가 용신·기신을 건드리는지에 달려 있다.",
      combinationTurningPoint: [
        ...buildStemCombinationChecks(currentDaewoon, "대운"),
        ...buildStemCombinationChecks(currentAnnual, "세운"),
      ].filter((row) => row.transformedElement).map((row) => ({
        rule: row.combinationRule,
        resultType: row.resultType,
        transformedUseState: row.transformedUseState,
        practicalChange: row.practicalChange,
      })),
      doChungPossibility: annualSaturation,
      practicalPrescription: finalClassification.includes("흉에서 길")
        ? "불리해 보이는 압박을 피하지 말고, 반대 글자가 열어 주는 용신성 출구를 직업·계약·관계 재배치로 사용한다."
        : finalClassification.includes("길에서 흉") || finalClassification.includes("주의")
          ? "겉으로 좋아 보이는 제안도 용신 파손 여부를 먼저 확인하고, 확장보다 계약 조건·건강 리듬·관계 경계를 정비한다."
          : "대운의 기반은 유지하되 세운 사건은 분야별로 쪼개어 직업, 돈, 관계의 실행 순서를 분리한다.",
    },
  };
}

function buildDaewoonAnalysis(
  pillars: LocalSajuResult["pillars"],
  dayStem: StemKr,
  usefulElements: ElementKey[],
  gyeokgukAnalysis: Record<string, unknown>,
  yongshinAnalysis: Record<string, unknown>,
  doChungAnalysis: Record<string, unknown>,
  combinationClashAnalysis: Record<string, unknown>,
  luckRows: Array<Record<string, unknown>>,
) {
  const current = luckRows.find((row) => row.scope === "daewoon");
  if (!current || (!current.stem && !current.branch)) {
    return {
      status: "not_supplied",
      summary: "현재 대운 간지가 입력되지 않아 대운 세부 판별을 보류한다.",
      requiredOutput: null,
    };
  }

  const natalEntries = getPillarEntries(pillars);
  const daewoonStem = current.stem as StemKr | undefined;
  const daewoonBranch = current.branch as BranchKr | undefined;
  const daewoonStemElement = daewoonStem ? STEM_ELEMENT[daewoonStem] : null;
  const daewoonBranchElement = daewoonBranch ? BRANCH_MAIN_ELEMENT[daewoonBranch] : null;
  const gisin = (Array.isArray(yongshinAnalysis.gisin) ? yongshinAnalysis.gisin : []) as ElementKey[];
  const daewoonElements = uniqueElements([daewoonStemElement, daewoonBranchElement]);
  const supportsYongshin = daewoonElements.filter((element) => usefulElements.includes(element));
  const strengthensGisin = daewoonElements.filter((element) => gisin.includes(element));
  const stemTenGod = daewoonStem ? tenGodForStem(dayStem, daewoonStem) : null;
  const branchTenGod = daewoonBranch ? tenGodForStem(dayStem, getMainHiddenStem(daewoonBranch)) : null;

  const stemRelations = daewoonStem
    ? natalEntries.map(({ key, pillar }) => {
      const stemKey = pairKey(daewoonStem, pillar.stem, STEMS);
      const transformedElement = STEM_COMBINATION_TO_ELEMENT[stemKey] || null;
      return {
        natalPillar: key,
        natalStem: pillar.stem,
        daewoonStem,
        relation: transformedElement ? "천간합" : getElementRelation(STEM_ELEMENT[daewoonStem], STEM_ELEMENT[pillar.stem]),
        transformedElement,
        transformedElementKo: transformedElement ? ELEMENT_KO[transformedElement] : null,
      };
    })
    : [];

  const branchRelations = daewoonBranch
    ? natalEntries.flatMap(({ key, pillar }) => {
      const relationKey = pairKey(daewoonBranch, pillar.branch, BRANCHES);
      const rows: Array<Record<string, unknown>> = [];
      if (BRANCH_COMBINATION_TO_ELEMENT[relationKey]) rows.push({ type: "육합", natalPillar: key, natalBranch: pillar.branch, daewoonBranch, element: BRANCH_COMBINATION_TO_ELEMENT[relationKey] });
      if (BRANCH_CLASHES.has(relationKey)) rows.push({ type: "충", natalPillar: key, natalBranch: pillar.branch, daewoonBranch });
      if (BRANCH_HARMS.has(relationKey)) rows.push({ type: "해", natalPillar: key, natalBranch: pillar.branch, daewoonBranch });
      if (BRANCH_BREAKS.has(relationKey)) rows.push({ type: "파", natalPillar: key, natalBranch: pillar.branch, daewoonBranch });
      return rows;
    })
    : [];
  const punishmentRelations = daewoonBranch
    ? analyzeInteractions({
      year: pillars.year,
      month: pillars.month,
      day: pillars.day,
      hour: { stem: representativeStemForElement(daewoonBranchElement || "earth"), branch: daewoonBranch, ganji: `${representativeStemForElement(daewoonBranchElement || "earth")}${daewoonBranch}` },
    }).punishments.filter((row) => JSON.stringify(row).includes(daewoonBranch))
    : [];
  const groupRelations = daewoonBranch ? findGroupCompletions(daewoonBranch, natalEntries.map((row) => row.pillar.branch)) : [];
  const touchedPalaces = branchRelations.map((row) => ({
    pillar: row.natalPillar,
    relation: row.type,
    lifeArea: PILLAR_LIFE_AREA[row.natalPillar as PillarKey],
  }));

  const daewoonCombinationRows = filterRowsByDaewoon(combinationClashAnalysis.requiredOutputRows);
  const daewoonGyeokActivated = ((gyeokgukAnalysis.luckTiming as Record<string, unknown> | undefined)?.activated as Array<Record<string, unknown>> | undefined || []).filter((row) => row.scope === "daewoon");
  const daewoonGyeokBroken = ((gyeokgukAnalysis.luckTiming as Record<string, unknown> | undefined)?.broken as Array<Record<string, unknown>> | undefined || []).filter((row) => row.scope === "daewoon");
  const daewoonDoChung = ((doChungAnalysis.candidates as Array<Record<string, unknown>> | undefined) || []).filter((row) => JSON.stringify(row.sources || []).includes("daewoon"));
  const annualRows = luckRows.filter((row) => row.scope === "annual");
  const bestYears = annualRows.filter((row) => {
    const stemElement = row.stem ? STEM_ELEMENT[row.stem as StemKr] : null;
    const branchElement = row.branch ? BRANCH_MAIN_ELEMENT[row.branch as BranchKr] : null;
    return [stemElement, branchElement].some((element) => element && usefulElements.includes(element as ElementKey));
  }).map((row) => ({ label: row.label || row.ganji || "", reason: "세운이 대운 속 용신 흐름을 보탠다." }));
  const cautionYears = annualRows.filter((row) => {
    const stemElement = row.stem ? STEM_ELEMENT[row.stem as StemKr] : null;
    const branchElement = row.branch ? BRANCH_MAIN_ELEMENT[row.branch as BranchKr] : null;
    return [stemElement, branchElement].some((element) => element && gisin.includes(element as ElementKey));
  }).map((row) => ({ label: row.label || row.ganji || "", reason: "세운이 대운 속 기신 압박을 키운다." }));

  const stemOperation = stemTenGod ? getTenGodOperation(stemTenGod) : null;
  const branchOperation = branchTenGod ? getTenGodOperation(branchTenGod) : null;
  const yongshinChange = supportsYongshin.length && !strengthensGisin.length
    ? "용신을 돕는 대운"
    : strengthensGisin.length && !supportsYongshin.length
      ? "기신을 강화하는 대운"
      : daewoonCombinationRows.some((row) => String(row.usefulUnfavorableShift || "").includes("흉에서 길"))
        ? "기신을 합화해 용신화하는 대운"
        : daewoonCombinationRows.some((row) => String(row.usefulUnfavorableShift || "").includes("길에서 흉"))
          ? "용신을 충하거나 묶어 깨는 대운"
          : "용신과 기신이 혼재된 대운";
  const summary = `${current.label || current.ganji || ""} 대운은 천간 ${daewoonStem || "미상"}의 외부 사건성과 지지 ${daewoonBranch || "미상"}의 생활권 변화를 함께 보며, ${yongshinChange}으로 판정한다.`;

  return {
    status: "calculated",
    currentDaewoon: current,
    summary,
    heavenlyStemAnalysis: {
      stem: daewoonStem,
      tenGod: stemTenGod,
      externalMeaning: stemOperation,
      relationsWithNatalStems: stemRelations,
      rule: "대운 천간은 외부 사건, 사회적 흐름, 드러나는 변화로 본다.",
    },
    earthlyBranchAnalysis: {
      branch: daewoonBranch,
      tenGod: branchTenGod,
      livedEnvironmentMeaning: branchOperation,
      relationsWithNatalBranches: branchRelations,
      punishments: punishmentRelations,
      groupRelations,
      touchedPalaces,
      rule: "대운 지지는 실제 환경, 생활권, 몸으로 체감되는 변화로 본다.",
    },
    relationSummary: {
      stemRelations,
      branchRelations,
      punishments: punishmentRelations,
      groupRelations,
    },
    yongshinGisinChange: {
      result: yongshinChange,
      supportsYongshin,
      strengthensGisin,
      combinationRows: daewoonCombinationRows,
    },
    gyeokgukChange: {
      activated: daewoonGyeokActivated,
      broken: daewoonGyeokBroken,
      result: daewoonGyeokActivated.length && !daewoonGyeokBroken.length
        ? "격국을 살리는 대운"
        : daewoonGyeokBroken.length && !daewoonGyeokActivated.length
          ? "격국을 깨는 대운"
          : "격국 활성과 파격 요인이 함께 있는 대운",
    },
    careerChange: stemOperation?.career || branchOperation?.career || "",
    wealthChange: stemOperation?.wealth || branchOperation?.wealth || "",
    loveMarriageChange: branchOperation?.love || stemOperation?.love || "",
    healthPsychologyChange: branchRelations.some((row) => row.type === "충")
      ? "대운 지지 충이 몸과 생활권을 흔들어 이동, 긴장, 수면, 소화, 심리 불안을 동반할 수 있다."
      : "대운 지지가 안정적으로 작동하면 생활 리듬과 심리 기반이 서서히 재편된다.",
    firstSecondHalf: {
      firstHalf: `전반 5년은 천간 ${daewoonStem || "미상"}의 ${stemTenGod || "십성"}이 먼저 드러나 사회적 사건과 선택 압력이 강하다.`,
      secondHalf: `후반 5년은 지지 ${daewoonBranch || "미상"}의 ${branchTenGod || "십성"}이 생활권, 몸, 관계 환경으로 깊게 체감된다.`,
      interaction: "전반과 후반은 분리하지 않고 천간이 만든 사건이 지지 환경에서 정착되거나 반전되는 흐름으로 본다.",
    },
    doChungTriggered: {
      triggered: daewoonDoChung.length > 0,
      rows: daewoonDoChung,
    },
    bestYears,
    cautionYears,
    howToUse: supportsYongshin.length
      ? "용신이 살아나는 영역에 장기 투자를 배치하고, 관계·직업·재물 결정을 10년 구조 안에서 단계화한다."
      : "기신 압박을 키우는 선택을 줄이고, 합충이 여는 이동·정리·분리 타이밍을 전략적으로 사용한다.",
    requiredOutput: {
      summary,
      heavenlyStemAnalysis: stemRelations,
      earthlyBranchAnalysis: branchRelations,
      natalRelations: { stemRelations, branchRelations, punishments: punishmentRelations, groupRelations },
      yongshinGisinChange: yongshinChange,
      gyeokgukChange: daewoonGyeokActivated.length || daewoonGyeokBroken.length ? { activated: daewoonGyeokActivated, broken: daewoonGyeokBroken } : "격국 변화 직접 매칭 없음",
      careerChange: stemOperation?.career || branchOperation?.career || "",
      wealthChange: stemOperation?.wealth || branchOperation?.wealth || "",
      loveMarriageChange: branchOperation?.love || stemOperation?.love || "",
      healthPsychologyChange: branchRelations.some((row) => row.type === "충") ? "충으로 인한 생활권·심리 긴장" : "생활 리듬 재편",
      firstSecondHalf: "전반은 천간 사건성, 후반은 지지 환경성을 중심으로 보되 상호작용으로 해석",
      bestYears,
      cautionYears,
      howToUse: supportsYongshin.length ? "용신 영역을 장기화" : "기신 압박을 정리하고 합충 전환을 활용",
    },
  };
}

function getRelationRowTiming(row: Record<string, unknown>): string {
  const text = JSON.stringify(row);
  if (text.includes("daewoon")) return "대운";
  if (text.includes("annual")) return "세운";
  if (text.includes("monthly")) return "월운";
  if (text.includes("daily")) return "일운";
  return "원국 내부 구조, 같은 글자가 운에서 올 때";
}

function scoreTransformation(base: number, timing: string, hasStorageOrDoChung = false): number {
  const timingBoost = timing.includes("대운") ? 18 : timing.includes("세운") ? 14 : timing.includes("월운") ? 9 : timing.includes("일운") ? 5 : 0;
  return Math.max(1, Math.min(100, Math.round(base + timingBoost + (hasStorageOrDoChung ? 12 : 0))));
}

function makeTransformationEvent(input: {
  category: string;
  phrase: string;
  beforeElement: ElementKey;
  afterElement: ElementKey;
  beforeTenGod: TenGodName;
  afterTenGod: TenGodName;
  stateShift: string;
  trigger: string;
  timing: string;
  intensity: number;
  eventPossibility: string[];
  strategy: string;
  evidence: Record<string, unknown>;
}) {
  return {
    category: input.category,
    requiredPhrase: input.phrase,
    beforeElement: input.beforeElement,
    beforeElementKo: ELEMENT_KO[input.beforeElement],
    afterElement: input.afterElement,
    afterElementKo: ELEMENT_KO[input.afterElement],
    beforeTenGod: input.beforeTenGod,
    afterTenGod: input.afterTenGod,
    yongshinGisinShift: input.stateShift,
    trigger: input.trigger,
    activationTiming: input.timing,
    intensityScore: input.intensity,
    eventPossibility: input.eventPossibility,
    responseStrategy: input.strategy,
    evidence: input.evidence,
  };
}

function buildTransformationTimingAnalysis(
  pillars: LocalSajuResult["pillars"],
  dayStem: StemKr,
    usefulElements: ElementKey[],
    yongshinAnalysis: Record<string, unknown>,
  combinationClashAnalysis: Record<string, unknown>,
  doChungAnalysis: Record<string, unknown>,
  earthStorageAnalysis: Record<string, unknown>,
  hiddenStemActivation: Record<string, unknown>,
  gyeokgukAnalysis: Record<string, unknown>,
  luckRows: Array<Record<string, unknown>>,
) {
  const gisin = (Array.isArray(yongshinAnalysis.gisin) ? yongshinAnalysis.gisin : []) as ElementKey[];
  const coreYongshin = yongshinAnalysis.coreYongshin as ElementKey | undefined;
  const events: Array<Record<string, unknown>> = [];
  const relationRows = [
    ...((combinationClashAnalysis.stemCombinations as Array<Record<string, unknown>> | undefined) || []),
    ...((combinationClashAnalysis.branchCombinations as Array<Record<string, unknown>> | undefined) || []),
    ...((combinationClashAnalysis.clashes as Array<Record<string, unknown>> | undefined) || []),
  ];

  relationRows.forEach((row) => {
    const timing = getRelationRowTiming(row);
    const outcome = row.outcome as Record<string, unknown> | undefined;
    const required = row.required as Record<string, unknown> | undefined;
    const changed = String(row.usefulUnfavorableShift || outcome?.changedState || required?.usefulUnfavorableShift || "");
    const transformedElement = (row.transformedElement || row.afterElement) as ElementKey | undefined;
    const actorsText = JSON.stringify(row.actors || required || row);
    const beforeElement = (actorsText.includes("fire") ? "fire" : actorsText.includes("water") ? "water" : actorsText.includes("wood") ? "wood" : actorsText.includes("metal") ? "metal" : actorsText.includes("earth") ? "earth" : transformedElement || coreYongshin || "earth") as ElementKey;
    const afterElement = transformedElement || (changed.includes("흉에서 길") && coreYongshin ? coreYongshin : changed.includes("길에서 흉") ? (gisin[0] || beforeElement) : beforeElement);
    const beforeTenGod = tenGodForStem(dayStem, representativeStemForElement(beforeElement));
    const afterTenGod = tenGodForStem(dayStem, representativeStemForElement(afterElement));
    const actualEvents = row.actualEvents as Record<string, unknown> | undefined;
    const eventPossibility = [actualEvents?.career, actualEvents?.wealth, actualEvents?.love, actualEvents?.moveContractRelation]
      .map((value) => String(value || ""))
      .filter(Boolean);

    if (changed.includes("흉에서 길")) {
      events.push(makeTransformationEvent({
        category: "기신 → 용신 변환",
        phrase: "겉으로는 불리한 운처럼 보이지만, 실제로는 구조 변화로 인해 기신이 용신화됩니다.",
        beforeElement,
        afterElement,
        beforeTenGod,
        afterTenGod,
        stateShift: "기신 → 용신",
        trigger: String(row.resultType || row.kind || "합충 변이"),
        timing,
        intensity: scoreTransformation(62, timing, false),
        eventPossibility,
        strategy: "불리해 보이는 압박을 피하지 말고, 합화·충거가 만든 새 출구로 직업·관계·재물 구조를 재배치한다.",
        evidence: row,
      }));
    }
    if (changed.includes("길에서 흉")) {
      events.push(makeTransformationEvent({
        category: "용신 → 기신 변환",
        phrase: "표면적으로는 좋은 운처럼 보이지만, 실제 구조에서는 용신이 파손되어 주의가 필요합니다.",
        beforeElement: coreYongshin || beforeElement,
        afterElement,
        beforeTenGod: tenGodForStem(dayStem, representativeStemForElement(coreYongshin || beforeElement)),
        afterTenGod,
        stateShift: "용신 → 기신",
        trigger: String(row.resultType || row.kind || "합충 변이"),
        timing,
        intensity: scoreTransformation(66, timing, false),
        eventPossibility,
        strategy: "확장보다 방어와 정비를 우선하고, 계약·관계·건강의 기반을 먼저 보호한다.",
        evidence: row,
      }));
    }
  });

  ((doChungAnalysis.candidates as Array<Record<string, unknown>> | undefined) || []).forEach((row) => {
    const beforeElement = BRANCH_MAIN_ELEMENT[row.repeatedBranch as BranchKr] || "earth";
    const afterElement = BRANCH_MAIN_ELEMENT[row.inducedOppositeBranch as BranchKr] || "earth";
    const timing = String(row.strongestActivationTiming || "도충 조건이 중첩되는 운");
    const classification = String(row.classification || "");
    const category = classification.includes("흉에서 길")
      ? "기신 → 용신 변환"
      : classification.includes("길에서 흉")
        ? "용신 → 기신 변환"
        : classification.includes("성취")
          ? "잠재력 개방"
          : "구조 붕괴";
    const phrase = category === "기신 → 용신 변환"
      ? "겉으로는 불리한 운처럼 보이지만, 실제로는 구조 변화로 인해 기신이 용신화됩니다."
      : category === "용신 → 기신 변환"
        ? "표면적으로는 좋은 운처럼 보이지만, 실제 구조에서는 용신이 파손되어 주의가 필요합니다."
        : category === "잠재력 개방"
          ? "오래 숨어 있던 능력과 자원이 현실로 드러나는 시기입니다."
          : "기존 질서가 흔들리므로 확장보다 정비가 우선입니다.";
    events.push(makeTransformationEvent({
      category,
      phrase,
      beforeElement,
      afterElement,
      beforeTenGod: tenGodForStem(dayStem, getMainHiddenStem(row.repeatedBranch as BranchKr)),
      afterTenGod: tenGodForStem(dayStem, getMainHiddenStem(row.inducedOppositeBranch as BranchKr)),
      stateShift: String(row.classification || ""),
      trigger: "도충",
      timing,
      intensity: scoreTransformation(70, timing, true),
      eventPossibility: (row.lifeEvents as string[] | undefined) || [],
      strategy: category.includes("붕괴") || category.includes("기신")
        ? "과포화된 선택을 줄이고 반대 글자가 여는 환경 변화에 맞춰 손실을 차단한다."
        : "반대 글자가 열어 주는 용신성 기회를 직업·관계·재물의 전환점으로 사용한다.",
      evidence: row,
    }));
  });

  ((earthStorageAnalysis.rows as Array<Record<string, unknown>> | undefined) || []).forEach((row) => {
    const hiddenRows = (row.hiddenStems as Array<Record<string, unknown>> | undefined) || [];
    const usefulHidden = hiddenRows.filter((hidden) => hidden.usefulState === "용신성");
    const unfavorableHidden = hiddenRows.filter((hidden) => hidden.usefulState === "기신성");
    const opening = row.storageOpening as Record<string, unknown> | undefined;
    const timing = ((opening?.suppliedLuckMatches as Array<Record<string, unknown>> | undefined) || [])
      .map((item) => `${item.scope || "운"} ${item.label || item.branch || ""}`)
      .join(", ") || `${row.branch} 창고가 충·합으로 열리는 시기`;
    usefulHidden.forEach((hidden) => {
      const element = hidden.element as ElementKey;
      const operation = hidden.operation as Record<string, unknown> | undefined;
      events.push(makeTransformationEvent({
        category: "잠재력 개방",
        phrase: "오래 숨어 있던 능력과 자원이 현실로 드러나는 시기입니다.",
        beforeElement: "earth",
        afterElement: element,
        beforeTenGod: tenGodForStem(dayStem, representativeStemForElement("earth")),
        afterTenGod: hidden.tenGod as TenGodName,
        stateShift: "창고 속 용신 지장간 개방",
        trigger: "창고 충·합",
        timing,
        intensity: scoreTransformation(64, timing, true),
        eventPossibility: [String(operation?.career || ""), String(operation?.wealth || ""), String(operation?.love || "")].filter(Boolean),
        strategy: "숨어 있던 지장간 성분을 직업 기술, 자산 관리, 관계 선택으로 구체화한다.",
        evidence: { row, hidden },
      }));
    });
    unfavorableHidden.forEach((hidden) => {
      const element = hidden.element as ElementKey;
      const operation = hidden.operation as Record<string, unknown> | undefined;
      events.push(makeTransformationEvent({
        category: "구조 붕괴",
        phrase: "기존 질서가 흔들리므로 확장보다 정비가 우선입니다.",
        beforeElement: coreYongshin || element,
        afterElement: element,
        beforeTenGod: tenGodForStem(dayStem, representativeStemForElement(coreYongshin || element)),
        afterTenGod: hidden.tenGod as TenGodName,
        stateShift: "창고 속 기신 지장간 자극",
        trigger: "불리한 창고 개방",
        timing,
        intensity: scoreTransformation(68, timing, true),
        eventPossibility: [String(operation?.career || ""), String(operation?.wealth || ""), String(operation?.love || "")].filter(Boolean),
        strategy: "창고가 열리는 시기에는 확장보다 책임 정리, 건강 관리, 관계 경계 설정을 우선한다.",
        evidence: { row, hidden },
      }));
    });
  });

  const hiddenRows = ((hiddenStemActivation.protruded as Array<Record<string, unknown>> | undefined) || [])
    .filter((row) => usefulElements.includes(row.element as ElementKey));
  hiddenRows.forEach((row) => {
    const timingRows = ((row.luckAmplification as Record<string, unknown> | undefined)?.sameStemLuck as Array<Record<string, unknown>> | undefined) || [];
    const timing = timingRows.map((item) => `${item.scope || "운"} ${item.label || item.stem || ""}`).join(", ") || `${row.stem}가 운에서 다시 드러나는 시기`;
    const interpretation = row.interpretation as Record<string, unknown> | undefined;
    events.push(makeTransformationEvent({
      category: "잠재력 개방",
      phrase: "오래 숨어 있던 능력과 자원이 현실로 드러나는 시기입니다.",
      beforeElement: BRANCH_MAIN_ELEMENT[row.branch as BranchKr] || "earth",
      afterElement: row.element as ElementKey,
      beforeTenGod: tenGodForStem(dayStem, getMainHiddenStem(row.branch as BranchKr)),
      afterTenGod: row.tenGod as TenGodName,
      stateShift: "지장간 용신 투출",
      trigger: "지장간 재등장",
      timing,
      intensity: scoreTransformation(58, timing, false),
      eventPossibility: [String(interpretation?.career || ""), String(interpretation?.wealth || ""), String(interpretation?.love || "")].filter(Boolean),
      strategy: "재등장한 글자의 십성을 실무 능력, 관계 선택, 재물 운용 방식으로 드러낸다.",
      evidence: row,
    }));
  });

  const brokenGyeokRows = ((gyeokgukAnalysis.luckTiming as Record<string, unknown> | undefined)?.broken as Array<Record<string, unknown>> | undefined) || [];
  brokenGyeokRows.forEach((row) => {
    const afterElement = (row.stemElement || row.branchElement || gisin[0] || "earth") as ElementKey;
    events.push(makeTransformationEvent({
      category: "구조 붕괴",
      phrase: "기존 질서가 흔들리므로 확장보다 정비가 우선입니다.",
      beforeElement: coreYongshin || usefulElements[0] || "earth",
      afterElement,
      beforeTenGod: tenGodForStem(dayStem, representativeStemForElement(coreYongshin || usefulElements[0] || "earth")),
      afterTenGod: tenGodForStem(dayStem, representativeStemForElement(afterElement)),
      stateShift: "격국 상신 손상",
      trigger: "격국 파손 운",
      timing: `${row.scope || "운"} ${row.label || ""}`,
      intensity: scoreTransformation(72, String(row.scope || ""), false),
      eventPossibility: ["직업 질서 재편", "계약·조직 내 역할 변화", "심리적 기준 흔들림"],
      strategy: "격을 살리던 루틴과 기준을 복원하고, 무리한 확장보다 구조 보수에 집중한다.",
      evidence: row,
    }));
  });

  const sorted = events.sort((a, b) => Number(b.intensityScore || 0) - Number(a.intensityScore || 0));
  return {
    principle: "합·충·도충·지장간 개방으로 기운이 바뀌는 환골탈태 시기를 별도 탐지한다.",
    categories: {
      gisinToYongshin: sorted.filter((row) => row.category === "기신 → 용신 변환"),
      yongshinToGisin: sorted.filter((row) => row.category === "용신 → 기신 변환"),
      potentialOpening: sorted.filter((row) => row.category === "잠재력 개방"),
      structuralCollapse: sorted.filter((row) => row.category === "구조 붕괴"),
    },
    strongestTransformations: sorted.slice(0, 5),
    requiredPhrases: [
      "겉으로는 불리한 운처럼 보이지만, 실제로는 구조 변화로 인해 기신이 용신화됩니다.",
      "표면적으로는 좋은 운처럼 보이지만, 실제 구조에서는 용신이 파손되어 주의가 필요합니다.",
      "오래 숨어 있던 능력과 자원이 현실로 드러나는 시기입니다.",
      "기존 질서가 흔들리므로 확장보다 정비가 우선입니다.",
    ],
  };
}

function buildPersonalityAnalysis(
  pillars: LocalSajuResult["pillars"],
  dayStem: StemKr,
  dayMasterStrength: string,
  visibleTenGods: Record<TenGodName, number>,
  hiddenTenGods: Record<TenGodName, number>,
  effectivePower: Record<ElementKey, number>,
  season: ReturnType<typeof getSeasonProfile>,
  normalizedClimate: Record<string, number>,
  interactions: ReturnType<typeof analyzeInteractions>,
  doChungAnalysis: Record<string, unknown>,
  earthStorageAnalysis: Record<string, unknown>,
  transformationTimingAnalysis: Record<string, unknown>,
  luckRows: Array<Record<string, unknown>>,
) {
  const dayElement = STEM_ELEMENT[dayStem];
  const mergedTenGods = TEN_GODS.map((tenGod) => ({
    tenGod,
    visible: round2(visibleTenGods[tenGod]),
    hidden: round2(hiddenTenGods[tenGod]),
    total: round2(visibleTenGods[tenGod] + hiddenTenGods[tenGod]),
  })).sort((a, b) => b.total - a.total);
  const dominantTenGod = mergedTenGods[0]?.tenGod || "비견";
  const dominantOperation = getTenGodOperation(dominantTenGod);
  const visibleDominant = TEN_GODS.map((tenGod) => ({ tenGod, score: visibleTenGods[tenGod] })).sort((a, b) => b.score - a.score)[0]?.tenGod || dominantTenGod;
  const hiddenDominant = TEN_GODS.map((tenGod) => ({ tenGod, score: hiddenTenGods[tenGod] })).sort((a, b) => b.score - a.score)[0]?.tenGod || dominantTenGod;
  const dayBranchHidden = HIDDEN_STEMS_BY_BRANCH[pillars.day.branch].map((row) => ({
    ...row,
    tenGod: tenGodForStem(dayStem, row.stem),
    element: STEM_ELEMENT[row.stem],
  }));
  const groupScores = {
    inbi: round2(visibleTenGods.비견 + visibleTenGods.겁재 + visibleTenGods.정인 + visibleTenGods.편인 + hiddenTenGods.비견 + hiddenTenGods.겁재 + hiddenTenGods.정인 + hiddenTenGods.편인),
    output: round2(visibleTenGods.식신 + visibleTenGods.상관 + hiddenTenGods.식신 + hiddenTenGods.상관),
    wealth: round2(visibleTenGods.정재 + visibleTenGods.편재 + hiddenTenGods.정재 + hiddenTenGods.편재),
    officer: round2(visibleTenGods.정관 + visibleTenGods.편관 + hiddenTenGods.정관 + hiddenTenGods.편관),
  };
  const strongestElement = [...ELEMENTS].sort((a, b) => effectivePower[b] - effectivePower[a])[0];
  const conflictRows = [
    ...interactions.branchRelations,
    ...interactions.stemRelations,
    ...interactions.punishments,
  ];
  const doChungRows = (doChungAnalysis.candidates as Array<Record<string, unknown>> | undefined) || [];
  const earthOverburden = Boolean(earthStorageAnalysis.overburdened);
  const climateTension = Math.abs(Number(normalizedClimate.temperature || 0)) >= 1.2 || Number(normalizedClimate.humidity || 0) >= 1.25 || Number(normalizedClimate.dryness || 0) >= 1.25;
  const personalityChangeTiming = [
    ...(((transformationTimingAnalysis.strongestTransformations as Array<Record<string, unknown>> | undefined) || []).map((row) => ({
      timing: row.activationTiming,
      category: row.category,
      reason: row.requiredPhrase,
      strategy: row.responseStrategy,
    }))),
    ...luckRows.filter((row) => row.scope === "daewoon" || row.scope === "annual").map((row) => ({
      timing: `${row.scope || "운"} ${row.label || row.ganji || ""}`,
      category: "운의 십성 활성",
      reason: row.visible ? `${row.visible} 성향이 운에서 드러남` : "운의 지지·지장간이 성향을 자극함",
      strategy: "운에서 강해지는 십성을 의식적으로 건강하게 사용한다.",
    })),
  ];

  const moneyStyle = groupScores.wealth >= groupScores.output && groupScores.wealth >= groupScores.inbi
    ? "돈을 현실적 안전판과 성취의 증거로 보며, 관리와 소유 감각이 강하다."
    : groupScores.output > groupScores.wealth
      ? "돈은 결과물, 기술, 표현, 생산성을 통해 흘러온다고 느끼며 벌어 쓰는 리듬이 중요하다."
      : "돈을 자기 통제와 독립성의 연장으로 대하기 쉬워, 분배와 협업의 기준이 필요하다.";
  const loveStyle = groupScores.officer >= groupScores.wealth
    ? "사랑에서는 책임, 약속, 신뢰를 중시하며 관계의 형식과 지속 가능성을 본다."
    : groupScores.wealth > groupScores.officer
      ? "사랑에서는 현실 조건, 생활 안정, 주고받는 균형을 민감하게 본다."
      : "사랑은 일지와 지장간의 숨은 욕구가 강하게 작동해 겉보다 내면의 안정감이 중요하다.";
  const stressStyle = climateTension || earthOverburden
    ? "스트레스가 쌓이면 생각이 굳고 몸이 무거워지며, 걱정과 책임감을 혼자 끌어안기 쉽다."
    : conflictRows.length
      ? "스트레스가 오면 합충으로 묶인 감정이 말, 결정, 관계 거리감으로 갑자기 튀어나올 수 있다."
      : "스트레스 상황에서도 비교적 자기 리듬을 유지하지만, 강한 십성이 과해질 때 편향이 생긴다.";
  const relationshipWeakness = groupScores.inbi >= Math.max(groupScores.output, groupScores.wealth, groupScores.officer)
    ? "내 기준이 강해 상대의 속도와 욕구를 기다리는 데 약점이 생긴다."
    : groupScores.output >= Math.max(groupScores.inbi, groupScores.wealth, groupScores.officer)
      ? "표현이 빠르고 선명해 상대가 비판이나 압박으로 받아들일 수 있다."
      : groupScores.officer >= groupScores.wealth
        ? "관계에서도 옳고 그름, 책임, 역할을 먼저 보아 정서적 여유가 줄 수 있다."
        : "현실 균형과 손익 감각이 민감해 관계가 거래처럼 느껴질 수 있다.";
  const repeatingPattern = doChungRows.length
    ? "같은 지지의 과포화가 반복되면 한 방향으로 밀어붙이다가 반대 사건을 불러와 삶의 방향이 급히 바뀌는 패턴이 생긴다."
    : earthOverburden
      ? "책임을 저장하고 감정을 소화하지 못한 채 오래 버티다가 창고가 열릴 때 한꺼번에 방향을 바꾸는 패턴이 있다."
      : conflictRows.length
        ? "합으로 묶이고 충으로 풀리는 구조가 반복되어 관계와 선택에서 가까워졌다 멀어지는 리듬이 생긴다."
        : "강한 십성의 장점이 반복될수록 같은 방식의 성공과 같은 방식의 피로가 함께 온다.";
  const improvementPoint = climateTension
    ? "조후를 보완하는 생활 리듬을 만들면 성격의 날카로움과 불안정성이 크게 줄어든다."
    : earthOverburden
      ? "토창고 속 지장간 중 용신성 성분을 실제 기술과 관계 방식으로 꺼내 쓰면 답답함이 자원으로 바뀐다."
      : `${dominantTenGod}의 장점을 살리되 과해질 때의 그림자를 의식적으로 조절하면 삶의 반복 패턴이 좋아진다.`;

  return {
    basis: {
      dayMaster: { stem: dayStem, element: dayElement, elementKo: ELEMENT_KO[dayElement], strength: dayMasterStrength },
      monthCommand: { branch: pillars.month.branch, season: season.season, commandingElement: season.dominantElement },
      dominantTenGod,
      visibleDominantTenGod: visibleDominant,
      hiddenDominantTenGod: hiddenDominant,
      dayBranchPalace: { branch: pillars.day.branch, hiddenStems: dayBranchHidden },
      groupScores,
      climate: normalizedClimate,
      strongestElement,
      conflictCount: conflictRows.length,
      doChungCount: doChungRows.length,
      earthOverburden,
    },
    outwardDisposition: `겉으로는 ${visibleDominant}이 먼저 보이며, 월령 ${pillars.month.branch}의 ${season.season} 기운 때문에 사회적으로는 ${dominantOperation.career}`,
    innerWorld: `실제 내면은 일지 ${pillars.day.branch}와 그 지장간 ${dayBranchHidden.map((row) => `${row.stem}(${row.tenGod})`).join(", ")}이 움직인다. 숨은 ${hiddenDominant}이 반복 감정과 무의식적 선택을 만든다.`,
    stressReaction: stressStyle,
    moneyStyle,
    loveStyle,
    workStrength: dominantOperation.career,
    relationshipWeakness,
    repeatingLifePattern: repeatingPattern,
    improvementPoint,
    personalityChangeTiming,
    evidence: {
      tenGodRanking: mergedTenGods,
      visibleTenGods: roundScores(visibleTenGods),
      hiddenTenGods: roundScores(hiddenTenGods),
      dayBranchHidden,
      conflicts: conflictRows,
      doChung: doChungRows,
      earthStorage: earthStorageAnalysis,
    },
  };
}

function getCareerFieldByElement(element: ElementKey) {
  const rows: Record<ElementKey, Record<string, unknown>> = {
    wood: {
      environment: "성장, 교육, 기획, 브랜드, 콘텐츠, 상담, 디자인, 초기 개발처럼 싹을 틔우고 방향을 세우는 환경",
      jobGroups: ["교육", "기획", "브랜드", "콘텐츠", "문서", "상담", "환경", "디자인", "초기 개발"],
      caution: "성장이 막히고 위계만 강한 반복 업무에서는 재능이 굳기 쉽다.",
    },
    fire: {
      environment: "마케팅, 미디어, 방송, 표현, 강의, 예술, 뷰티, 에너지, 리더십처럼 드러내고 확산하는 환경",
      jobGroups: ["마케팅", "미디어", "방송", "강의", "예술", "뷰티", "에너지", "리더십"],
      caution: "성과 노출만 과하고 회복 시간이 없는 환경에서는 번아웃이 빠르다.",
    },
    earth: {
      environment: "부동산, 관리, 운영, 회계, 조직, 안정 산업, 데이터 정리, 인프라, 중개처럼 축적하고 구조화하는 환경",
      jobGroups: ["부동산", "관리", "운영", "회계", "조직", "데이터 정리", "인프라", "중개"],
      caution: "책임만 쌓이고 권한이 없는 자리에서는 압박과 정체가 커진다.",
    },
    metal: {
      environment: "금융, 법률, 기술, 의사결정, 수술, 엔지니어링, 보안, 품질관리, 전략처럼 자르고 정밀화하는 환경",
      jobGroups: ["금융", "법률", "기술", "의사결정", "엔지니어링", "보안", "품질관리", "전략"],
      caution: "기준이 흐리고 결과 책임이 모호한 환경에서는 장점이 날카로움으로 변한다.",
    },
    water: {
      environment: "연구, 정보, 무역, 이동, 플랫폼, 데이터, 심리, 지식산업, 유통처럼 흐름을 읽고 연결하는 환경",
      jobGroups: ["연구", "정보", "무역", "플랫폼", "데이터", "심리", "지식산업", "유통"],
      caution: "정보는 많지만 결정권과 실행 리듬이 없는 환경에서는 방향을 잃기 쉽다.",
    },
  };
  return rows[element];
}

function buildCareerAnalysis(
  pillars: LocalSajuResult["pillars"],
  dayStem: StemKr,
  dayMasterStrength: string,
  visibleTenGods: Record<TenGodName, number>,
  hiddenTenGods: Record<TenGodName, number>,
  effectivePower: Record<ElementKey, number>,
  season: ReturnType<typeof getSeasonProfile>,
  gyeokgukAnalysis: Record<string, unknown>,
  yongshinAnalysis: Record<string, unknown>,
  daewoonAnalysis: Record<string, unknown>,
  luckRows: Array<Record<string, unknown>>,
) {
  const dayElement = STEM_ELEMENT[dayStem];
  const tenGodTotal = (tenGod: TenGodName) => (visibleTenGods[tenGod] || 0) + (hiddenTenGods[tenGod] || 0);
  const peerScore = tenGodTotal("비견") + tenGodTotal("겁재");
  const outputScore = tenGodTotal("식신") + tenGodTotal("상관");
  const wealthScore = tenGodTotal("편재") + tenGodTotal("정재");
  const officerScore = tenGodTotal("편관") + tenGodTotal("정관");
  const resourceScore = tenGodTotal("편인") + tenGodTotal("정인");
  const totalTenGodPower = peerScore + outputScore + wealthScore + officerScore + resourceScore || 1;
  const tenGodRanking = TEN_GODS.map((tenGod) => ({ tenGod, score: round2(tenGodTotal(tenGod)) })).sort((a, b) => b.score - a.score);
  const dominantTenGod = tenGodRanking[0]?.tenGod || "비견";
  const weakTenGods = [...tenGodRanking].reverse().slice(0, 3);
  const dominantOperation = getTenGodOperation(dominantTenGod);
  const jobYongshin = (Array.isArray(yongshinAnalysis.jobYongshin) ? yongshinAnalysis.jobYongshin : []) as ElementKey[];
  const coreYongshin = yongshinAnalysis.coreYongshin as ElementKey | undefined;
  const gisin = (Array.isArray(yongshinAnalysis.gisin) ? yongshinAnalysis.gisin : []) as ElementKey[];
  const careerElements = uniqueElements([
    ...jobYongshin,
    coreYongshin,
    season.dominantElement,
    [...ELEMENTS].sort((a, b) => effectivePower[b] - effectivePower[a])[0],
  ]).slice(0, 4);
  const strongestCareerElement = careerElements[0] || dayElement;
  const usefulCareerFields = careerElements.map((element) => ({
    element,
    elementKo: ELEMENT_KO[element],
    ...getCareerFieldByElement(element),
  }));
  const avoidedWorkEnvironment = uniqueElements(gisin.length ? gisin : ELEMENTS.filter((element) => !careerElements.includes(element))).map((element) => ({
    element,
    elementKo: ELEMENT_KO[element],
    warning: getCareerFieldByElement(element).caution,
  }));
  const careerStructures = {
    siksangSaengjae: outputScore >= 0.8 && wealthScore >= 0.8,
    jaeSaenggwan: wealthScore >= 0.8 && officerScore >= 0.8,
    gwaninSangsaeng: officerScore >= 0.8 && resourceScore >= 0.8,
    sarinSangsaeng: tenGodTotal("편관") >= 0.45 && resourceScore >= 0.7,
    sanggwanPaein: tenGodTotal("상관") >= 0.45 && resourceScore >= 0.7,
    peerExcess: peerScore / totalTenGodPower >= 0.32,
    wealthManyBodyWeak: wealthScore / totalTenGodPower >= 0.25 && dayMasterStrength.includes("약"),
  };
  const modeScores = {
    organization: round2(officerScore + resourceScore + (String(gyeokgukAnalysis.finalGyeokguk || "").includes("관") ? 0.6 : 0)),
    freelance: round2(outputScore + peerScore * 0.55 + resourceScore * 0.35),
    business: round2(wealthScore + outputScore * 0.75 + peerScore * 0.35),
  };
  const primaryMode = Object.entries(modeScores).sort((a, b) => b[1] - a[1])[0]?.[0] || "organization";
  const businessCaution = careerStructures.wealthManyBodyWeak || careerStructures.peerExcess;
  const annualRows = luckRows.filter((row) => row.scope === "annual");
  const daewoonRows = luckRows.filter((row) => row.scope === "daewoon");
  const rowElements = (row: Record<string, unknown>) => uniqueElements([
    row.stem ? STEM_ELEMENT[row.stem as StemKr] : null,
    row.branch ? BRANCH_MAIN_ELEMENT[row.branch as BranchKr] : null,
  ]);
  const rowTenGods = (row: Record<string, unknown>): TenGodName[] => Array.from(new Set([
    row.stem ? tenGodForStem(dayStem, row.stem as StemKr) : null,
    row.branch ? tenGodForStem(dayStem, getMainHiddenStem(row.branch as BranchKr)) : null,
  ].filter(Boolean) as TenGodName[]));
  const careerRiseByDaewoon = daewoonRows.map((row) => {
    const elements = rowElements(row);
    const matchedYongshin = elements.filter((element) => careerElements.includes(element));
    return {
      label: row.label || row.ganji || "대운",
      ganji: row.ganji || "",
      elements,
      matchedYongshin,
      strength: matchedYongshin.length ? "상승기" : "준비기",
      reason: matchedYongshin.length
        ? "대운의 천간·지지가 직업 용신을 건드려 커리어 판이 열린다."
        : "직업 용신과 직접 맞물리지는 않으므로 기술 정비와 포지션 재배치가 먼저다.",
    };
  });
  const annualCareerTiming = annualRows.map((row) => {
    const elements = rowElements(row);
    const tenGods = rowTenGods(row);
    const matchedYongshin = elements.filter((element) => careerElements.includes(element));
    const timingType = tenGods.some((tenGod) => tenGod === "정관" || tenGod === "편관")
      ? "승진·직위"
      : tenGods.some((tenGod) => tenGod === "식신" || tenGod === "상관" || tenGod === "편재" || tenGod === "정재")
        ? "이직·확장"
        : matchedYongshin.length
          ? "기회 발동"
          : "관망·정비";
    return {
      label: row.label || row.ganji || "세운",
      ganji: row.ganji || "",
      timingType,
      elements,
      tenGods,
      matchedYongshin,
      reason: matchedYongshin.length
        ? "세운이 직업 용신을 깨워 이직, 승진, 확장 판단의 문이 열린다."
        : "세운이 직접 직업 용신을 밀어주지는 않아 무리한 확장보다 조건 확인이 우선이다.",
    };
  });
  const monetizableAbility = careerStructures.siksangSaengjae
    ? "기술, 표현, 콘텐츠, 서비스 결과물을 실제 매출로 연결하는 힘이 돈이 된다."
    : careerStructures.jaeSaenggwan
      ? "거래와 자산 흐름을 조직 신뢰, 직위, 장기 계약으로 바꾸는 능력이 돈이 된다."
      : careerStructures.gwaninSangsaeng || careerStructures.sarinSangsaeng
        ? "압박과 책임을 지식, 자격, 시스템으로 정리해 권한을 얻는 능력이 돈이 된다."
        : dominantOperation.wealth || dominantOperation.career;
  const immediateCareerStrategy = [
    `${ELEMENT_KO[strongestCareerElement]} 용신성 환경인 ${String(getCareerFieldByElement(strongestCareerElement).environment)}으로 업무 중심을 옮긴다.`,
    careerStructures.wealthManyBodyWeak ? "돈 되는 제안이 많아도 체력, 권한, 계약 조건을 먼저 고정한다." : "가장 강한 십성을 수익 모델의 전면에 세운다.",
    daewoonAnalysis.requiredOutput ? String((daewoonAnalysis.requiredOutput as Record<string, unknown>).careerChange || daewoonAnalysis.careerChange || "") : "현재 대운 정보가 부족하면 10년 환경보다 원국의 강점 정리에 집중한다.",
  ].filter(Boolean);

  return {
    basis: {
      finalGyeokguk: gyeokgukAnalysis.finalGyeokguk,
      coreYongshin,
      jobYongshin,
      dominantTenGod,
      weakTenGods,
      monthBranchCareerElement: { branch: pillars.month.branch, element: BRANCH_MAIN_ELEMENT[pillars.month.branch], field: getCareerFieldByElement(BRANCH_MAIN_ELEMENT[pillars.month.branch]) },
      hourBranchCareerElement: pillars.hour ? { branch: pillars.hour.branch, element: BRANCH_MAIN_ELEMENT[pillars.hour.branch], field: getCareerFieldByElement(BRANCH_MAIN_ELEMENT[pillars.hour.branch]) } : null,
      groupScores: { peer: round2(peerScore), output: round2(outputScore), wealth: round2(wealthScore), officer: round2(officerScore), resource: round2(resourceScore) },
      careerStructures,
    },
    bestFitJobGroups: usefulCareerFields,
    avoidedWorkEnvironment,
    monetizableAbility,
    workModeType: {
      primary: primaryMode === "organization" ? "조직형" : primaryMode === "freelance" ? "프리랜서형" : "사업형",
      scores: modeScores,
      reading: primaryMode === "organization"
        ? "조직, 자격, 책임, 공식 권한을 통해 커리어가 안정적으로 커진다."
        : primaryMode === "freelance"
          ? "전문성, 산출물, 이름값을 직접 들고 움직일 때 직업운이 열린다."
          : "거래, 시장 감각, 실행 속도를 수익 구조로 만들 때 사업성이 살아난다.",
    },
    businessFit: {
      fit: primaryMode === "business" && !businessCaution ? "맞음" : primaryMode === "business" ? "조건부로 맞음" : "부업·프로젝트형부터 적합",
      caution: businessCaution ? "비겁 과다 또는 재다신약 성향이 있어 동업, 분배, 현금흐름 통제가 먼저다." : "사업운은 직업 용신이 들어오는 대운·세운에서 키우는 것이 좋다.",
    },
    investmentWealthManagementStyle: careerStructures.wealthManyBodyWeak
      ? "투자와 재물 운용은 공격보다 보전, 현금흐름, 손절 기준이 먼저다."
      : wealthScore >= outputScore
        ? "실물 자산, 장기 계약, 운영 수익처럼 관리 가능한 돈의 흐름에 강하다."
        : "기술, 콘텐츠, 플랫폼, 프로젝트 수익처럼 산출물을 현금화하는 방식에 강하다.",
    daewoonCareerRiseTiming: careerRiseByDaewoon,
    annualJobChangePromotionExpansionTiming: annualCareerTiming,
    immediateCareerStrategy,
    evidence: {
      gyeokRequiredOutput: gyeokgukAnalysis.requiredOutput,
      yongshinRequiredExplanation: yongshinAnalysis.requiredExplanation,
      daewoonRequiredOutput: daewoonAnalysis.requiredOutput,
      tenGodRanking,
      effectivePower: roundScores(effectivePower),
    },
  };
}

function getPeachBlossomBranch(referenceBranch: BranchKr): BranchKr {
  const index = BRANCHES.indexOf(referenceBranch);
  if ([8, 0, 4].includes(index)) return BRANCHES[9];
  if ([2, 6, 10].includes(index)) return BRANCHES[3];
  if ([5, 9, 1].includes(index)) return BRANCHES[6];
  return BRANCHES[0];
}

function getHongyeomBranch(dayStem: StemKr): BranchKr {
  const rows: Record<StemKr, BranchKr> = {
    [STEMS[0]]: BRANCHES[6],
    [STEMS[1]]: BRANCHES[6],
    [STEMS[2]]: BRANCHES[2],
    [STEMS[3]]: BRANCHES[7],
    [STEMS[4]]: BRANCHES[4],
    [STEMS[5]]: BRANCHES[4],
    [STEMS[6]]: BRANCHES[10],
    [STEMS[7]]: BRANCHES[9],
    [STEMS[8]]: BRANCHES[0],
    [STEMS[9]]: BRANCHES[8],
  };
  return rows[dayStem];
}

function getCheonhuiBranch(yearBranch: BranchKr): BranchKr {
  const rows: Record<BranchKr, BranchKr> = {
    [BRANCHES[0]]: BRANCHES[9],
    [BRANCHES[1]]: BRANCHES[8],
    [BRANCHES[2]]: BRANCHES[7],
    [BRANCHES[3]]: BRANCHES[6],
    [BRANCHES[4]]: BRANCHES[5],
    [BRANCHES[5]]: BRANCHES[4],
    [BRANCHES[6]]: BRANCHES[3],
    [BRANCHES[7]]: BRANCHES[2],
    [BRANCHES[8]]: BRANCHES[1],
    [BRANCHES[9]]: BRANCHES[0],
    [BRANCHES[10]]: BRANCHES[11],
    [BRANCHES[11]]: BRANCHES[10],
  };
  return rows[yearBranch];
}

function getHwagaeBranch(referenceBranch: BranchKr): BranchKr {
  const index = BRANCHES.indexOf(referenceBranch);
  if ([8, 0, 4].includes(index)) return BRANCHES[4];
  if ([2, 6, 10].includes(index)) return BRANCHES[10];
  if ([5, 9, 1].includes(index)) return BRANCHES[1];
  return BRANCHES[7];
}

function getYeokmaBranch(referenceBranch: BranchKr): BranchKr {
  const index = BRANCHES.indexOf(referenceBranch);
  if ([8, 0, 4].includes(index)) return BRANCHES[2];
  if ([2, 6, 10].includes(index)) return BRANCHES[8];
  if ([5, 9, 1].includes(index)) return BRANCHES[11];
  return BRANCHES[5];
}

function getCheoneulBranches(dayStem: StemKr): BranchKr[] {
  const rows: Record<StemKr, BranchKr[]> = {
    [STEMS[0]]: [BRANCHES[1], BRANCHES[7]],
    [STEMS[1]]: [BRANCHES[0], BRANCHES[8]],
    [STEMS[2]]: [BRANCHES[11], BRANCHES[9]],
    [STEMS[3]]: [BRANCHES[11], BRANCHES[9]],
    [STEMS[4]]: [BRANCHES[1], BRANCHES[7]],
    [STEMS[5]]: [BRANCHES[0], BRANCHES[8]],
    [STEMS[6]]: [BRANCHES[1], BRANCHES[7]],
    [STEMS[7]]: [BRANCHES[2], BRANCHES[6]],
    [STEMS[8]]: [BRANCHES[3], BRANCHES[5]],
    [STEMS[9]]: [BRANCHES[3], BRANCHES[5]],
  };
  return rows[dayStem];
}

function getMunchangBranch(dayStem: StemKr): BranchKr {
  const rows: Record<StemKr, BranchKr> = {
    [STEMS[0]]: BRANCHES[5],
    [STEMS[1]]: BRANCHES[6],
    [STEMS[2]]: BRANCHES[8],
    [STEMS[3]]: BRANCHES[9],
    [STEMS[4]]: BRANCHES[8],
    [STEMS[5]]: BRANCHES[9],
    [STEMS[6]]: BRANCHES[11],
    [STEMS[7]]: BRANCHES[0],
    [STEMS[8]]: BRANCHES[2],
    [STEMS[9]]: BRANCHES[3],
  };
  return rows[dayStem];
}

function getTaegeukBranches(dayStem: StemKr): BranchKr[] {
  if (dayStem === STEMS[0] || dayStem === STEMS[1]) return [BRANCHES[0], BRANCHES[6]];
  if (dayStem === STEMS[2] || dayStem === STEMS[3]) return [BRANCHES[3], BRANCHES[9]];
  if (dayStem === STEMS[4] || dayStem === STEMS[5]) return [BRANCHES[4], BRANCHES[10], BRANCHES[1], BRANCHES[7]];
  if (dayStem === STEMS[6] || dayStem === STEMS[7]) return [BRANCHES[2], BRANCHES[11]];
  return [BRANCHES[5], BRANCHES[8]];
}

function getWoldeokStem(monthBranch: BranchKr): StemKr {
  const index = BRANCHES.indexOf(monthBranch);
  if ([8, 0, 4].includes(index)) return STEMS[8];
  if ([11, 3, 7].includes(index)) return STEMS[0];
  if ([2, 6, 10].includes(index)) return STEMS[2];
  return STEMS[6];
}

function getCheondeokTarget(monthBranch: BranchKr): { stem?: StemKr; branch?: BranchKr } {
  const rows: Record<BranchKr, { stem?: StemKr; branch?: BranchKr }> = {
    [BRANCHES[2]]: { stem: STEMS[3] },
    [BRANCHES[3]]: { branch: BRANCHES[8] },
    [BRANCHES[4]]: { stem: STEMS[8] },
    [BRANCHES[5]]: { stem: STEMS[7] },
    [BRANCHES[6]]: { branch: BRANCHES[11] },
    [BRANCHES[7]]: { stem: STEMS[0] },
    [BRANCHES[8]]: { stem: STEMS[9] },
    [BRANCHES[9]]: { branch: BRANCHES[2] },
    [BRANCHES[10]]: { stem: STEMS[2] },
    [BRANCHES[11]]: { stem: STEMS[1] },
    [BRANCHES[0]]: { branch: BRANCHES[5] },
    [BRANCHES[1]]: { stem: STEMS[6] },
  };
  return rows[monthBranch];
}

/* 신살 해설 산문. 어느 지지·간지에 걸리는지는 사주 입력마다 계산되지만, 뜻풀이는 고정 문장이라
   따로 떼어 관리자 CMS(사주 해설 → shinsal)에서 고칠 수 있게 한다. */
/* 걸리는 자리(계산)와 뜻풀이(CMS)가 한 항목에 섞이므로 형태를 명시해 둔다.
   자리 조건은 사주마다 달라 계산으로 채우고, 산문 3필드는 SHINSAL_PROSE 에서 스프레드한다. */
type ShinsalDefinition = {
  name: string;
  branches?: BranchKr[];
  stems?: StemKr[];
  ganji?: string[];
  category?: string;
  meaning?: string;
  manifestation?: string;
};

const SHINSAL_PROSE_DEFAULT: Record<string, Record<string, string>> = {
  도화살: { category: "연애·대중성", meaning: "매력, 노출, 관계의 끌림을 보조로 밝힌다.", manifestation: "연애, 인기, 영업, 브랜딩, 무대성으로 나타난다." },
  홍염살: { category: "연애·매력", meaning: "개인적 매혹과 감정의 온도를 보조로 밝힌다.", manifestation: "첫인상, 호감, 표현력, 관계의 빠른 발화로 나타난다." },
  화개살: { category: "성격·예술·종교성", meaning: "고독, 예술성, 정신성, 마무리의 기운을 보조로 밝힌다.", manifestation: "연구, 예술, 상담, 종교성, 혼자 완성하는 일로 나타난다." },
  역마살: { category: "이동·직업", meaning: "이동, 이직, 확장, 외부 활동성을 보조로 밝힌다.", manifestation: "출장, 이사, 해외, 플랫폼, 유통, 이동형 직업으로 나타난다." },
  천을귀인: { category: "귀인운", meaning: "위기에서 도움을 받는 귀인성을 보조로 밝힌다.", manifestation: "상사, 스승, 제도, 후원자, 해결책의 등장으로 나타난다." },
  문창귀인: { category: "학문·문서", meaning: "문장, 학습, 시험, 기록의 재능을 보조로 밝힌다.", manifestation: "글쓰기, 자격, 연구, 문서화, 설계 능력으로 나타난다." },
  태극귀인: { category: "귀인운·정신성", meaning: "큰 틀의 보호와 정신적 회복력을 보조로 밝힌다.", manifestation: "위기 후 회복, 큰 방향 전환, 명예 회복으로 나타난다." },
  월덕귀인: { category: "귀인운", meaning: "월령에서 온 덕과 사회적 완충력을 보조로 밝힌다.", manifestation: "조직의 도움, 평판 회복, 갈등 완화로 나타난다." },
  천덕귀인: { category: "귀인운", meaning: "하늘의 덕처럼 재난을 줄이는 완충력을 보조로 밝힌다.", manifestation: "문제 해결, 보호자, 제도적 구제, 관계 중재로 나타난다." },
  괴강살: { category: "성격·권한", meaning: "강한 결단, 압박, 권위와 승부성을 보조로 밝힌다.", manifestation: "리더십, 강한 직무, 경쟁, 독단, 압박으로 나타난다." },
  백호살: { category: "건강·결단", meaning: "날카로운 결단과 사고성 긴장을 보조로 밝힌다.", manifestation: "수술, 금속, 속도, 충돌, 강한 결단의 사건으로 나타난다." },
  양인살: { category: "성격·직업", meaning: "강한 자존, 칼날 같은 추진력, 독립성을 보조로 밝힌다.", manifestation: "권한, 전문 기술, 경쟁, 과격한 결단으로 나타난다." },
  공망: { category: "공백·지연", meaning: "해당 궁의 작용이 비거나 지연되는 보조 신호다.", manifestation: "기대와 현실의 간극, 지연, 무형화, 정신적 거리감으로 나타난다." },
};

const SHINSAL_PROSE = cmsRecord("saju-reading", "shinsal", SHINSAL_PROSE_DEFAULT);

function buildShinsalAnalysis(
  pillars: LocalSajuResult["pillars"],
  dayStem: StemKr,
  usefulElements: ElementKey[],
  yongshinAnalysis: Record<string, unknown>,
  interactions: ReturnType<typeof analyzeInteractions>,
  luckRows: Array<Record<string, unknown>>,
) {
  const allRows = buildAstroRows(pillars, luckRows);
  const gisin = (Array.isArray(yongshinAnalysis.gisin) ? yongshinAnalysis.gisin : []) as ElementKey[];
  const dayBranch = pillars.day.branch;
  const yearBranch = pillars.year.branch;
  const monthBranch = pillars.month.branch;
  const dangerousGanji = new Set(["경진", "경술", "임진", "무술"]);
  const whiteTigerGanji = new Set(["갑진", "을미", "병술", "정축", "무진", "임술", "계축"]);
  const gwimunPairs = new Set([
    pairKey(BRANCHES[0], BRANCHES[9], BRANCHES),
    pairKey(BRANCHES[1], BRANCHES[6], BRANCHES),
    pairKey(BRANCHES[2], BRANCHES[7], BRANCHES),
    pairKey(BRANCHES[3], BRANCHES[8], BRANCHES),
    pairKey(BRANCHES[4], BRANCHES[11], BRANCHES),
    pairKey(BRANCHES[5], BRANCHES[10], BRANCHES),
  ]);
  const wonjinPairs = new Set([
    pairKey(BRANCHES[0], BRANCHES[7], BRANCHES),
    pairKey(BRANCHES[1], BRANCHES[6], BRANCHES),
    pairKey(BRANCHES[2], BRANCHES[9], BRANCHES),
    pairKey(BRANCHES[3], BRANCHES[8], BRANCHES),
    pairKey(BRANCHES[4], BRANCHES[11], BRANCHES),
    pairKey(BRANCHES[5], BRANCHES[10], BRANCHES),
  ]);
  const definitions: ShinsalDefinition[] = [
    { name: "도화살", branches: [getPeachBlossomBranch(dayBranch), getPeachBlossomBranch(yearBranch)], ...SHINSAL_PROSE["도화살"] },
    { name: "홍염살", branches: [getHongyeomBranch(dayStem)], ...SHINSAL_PROSE["홍염살"] },
    { name: "화개살", branches: [getHwagaeBranch(dayBranch), getHwagaeBranch(yearBranch)], ...SHINSAL_PROSE["화개살"] },
    { name: "역마살", branches: [getYeokmaBranch(dayBranch), getYeokmaBranch(yearBranch)], ...SHINSAL_PROSE["역마살"] },
    { name: "천을귀인", branches: getCheoneulBranches(dayStem), ...SHINSAL_PROSE["천을귀인"] },
    { name: "문창귀인", branches: [getMunchangBranch(dayStem)], ...SHINSAL_PROSE["문창귀인"] },
    { name: "태극귀인", branches: getTaegeukBranches(dayStem), ...SHINSAL_PROSE["태극귀인"] },
    { name: "월덕귀인", stems: [getWoldeokStem(monthBranch)], ...SHINSAL_PROSE["월덕귀인"] },
    { name: "천덕귀인", stems: getCheondeokTarget(monthBranch).stem ? [getCheondeokTarget(monthBranch).stem as StemKr] : [], branches: getCheondeokTarget(monthBranch).branch ? [getCheondeokTarget(monthBranch).branch as BranchKr] : [], ...SHINSAL_PROSE["천덕귀인"] },
    { name: "괴강살", ganji: Array.from(dangerousGanji), ...SHINSAL_PROSE["괴강살"] },
    { name: "백호살", ganji: Array.from(whiteTigerGanji), ...SHINSAL_PROSE["백호살"] },
    { name: "양인살", branches: YANGIN_BRANCH_BY_STEM[dayStem] ? [YANGIN_BRANCH_BY_STEM[dayStem] as BranchKr] : [], ...SHINSAL_PROSE["양인살"] },
    { name: "공망", branches: getGongMangBranches(pillars.day), ...SHINSAL_PROSE["공망"] },
  ];
  const locationOf = (row: Record<string, unknown>) => `${row.source || "원국"} ${row.scope || ""} ${row.label || ""}`.trim();
  const resolveStateForElements = (elements: ElementKey[]) => elements.some((element) => usefulElements.includes(element))
    ? "용신 연결"
    : elements.some((element) => gisin.includes(element))
      ? "기신 연결"
      : "중립 보조";
  const actualManifestation = (base: string, useState: string) => {
    if (useState === "용신 연결") return `${base} 원국의 용신과 닿으면 재능, 귀인, 회복력으로 길하게 작동한다.`;
    if (useState === "기신 연결") return `${base} 기신과 닿으면 과장, 지연, 갈등, 사고성 긴장으로 부작용이 난다.`;
    return `${base} 단독 길흉이 아니라 원국 구조와 운의 합충을 보조해 해석한다.`;
  };
  const rows: Array<Record<string, unknown>> = [];
  definitions.forEach((definition) => {
    const matches = allRows.filter((row) => {
      const ganji = row.stem && row.branch ? `${row.stem}${row.branch}` : "";
      return Boolean(
        (definition.branches || []).includes(row.branch as BranchKr)
        || (definition.stems || []).includes(row.stem as StemKr)
        || (definition.ganji || []).includes(ganji),
      );
    });
    const targetText = [
      ...(definition.branches || []),
      ...(definition.stems || []),
      ...(definition.ganji || []),
    ].join(", ");
    const addRow = (match: Record<string, unknown> | null) => {
      const elements = uniqueElements([
        match?.stem ? STEM_ELEMENT[match.stem as StemKr] : null,
        match?.branch ? BRANCH_MAIN_ELEMENT[match.branch as BranchKr] : null,
      ]);
      const fallbackElements = uniqueElements((definition.branches || []).map((branch) => BRANCH_MAIN_ELEMENT[branch]));
      const state = resolveStateForElements(elements.length ? elements : fallbackElements);
      rows.push({
        shinsalName: definition.name,
        category: definition.category,
        position: match ? locationOf(match) : "원국·입력 운에서 직접 확인되지 않음",
        trigger: {
          occurredFrom: match ? { stem: match.stem || null, branch: match.branch || null, ganji: match.stem && match.branch ? `${match.stem}${match.branch}` : match.label || null } : null,
          target: targetText || "쌍지지 조건",
        },
        elementConnection: elements.map((element) => ({ element, elementKo: ELEMENT_KO[element], useState: getElementUseState(element, usefulElements) })),
        yongshinGisinConnection: state,
        natalMeaning: match?.source === "원국" ? definition.meaning : "원국 고정 신살은 아니며 대운·세운에서 보조 트리거로 발동한다.",
        luckActivation: {
          activated: matches.some((row) => row.source === "운"),
          rows: matches.filter((row) => row.source === "운").map((row) => ({ scope: row.scope, label: row.label, stem: row.stem, branch: row.branch })),
        },
        actualLifeManifestation: actualManifestation(definition.manifestation || "", state),
      });
    };
    if (matches.length) matches.forEach((match) => addRow(match));
    else addRow(null);
  });

  const pairDefinitions = [
    { name: "귀문관살", pairs: gwimunPairs, category: "심리·관계", meaning: "예민한 직감, 몰입, 심리적 문이 열리는 보조 신호다.", manifestation: "불면, 집착, 깊은 통찰, 관계의 오해와 심리적 끌림으로 나타난다." },
    { name: "원진살", pairs: wonjinPairs, category: "관계·갈등", meaning: "이유를 설명하기 어려운 서운함과 거리감을 보조로 밝힌다.", manifestation: "가까운 관계의 오해, 반복 갈등, 미묘한 정서적 거부감으로 나타난다." },
  ];
  pairDefinitions.forEach((definition) => {
    const pairRows: Array<Record<string, unknown>> = [];
    for (let i = 0; i < allRows.length; i += 1) {
      for (let j = i + 1; j < allRows.length; j += 1) {
        const left = allRows[i];
        const right = allRows[j];
        if (!left.branch || !right.branch) continue;
        if (definition.pairs.has(pairKey(left.branch, right.branch, BRANCHES))) {
          const elements = uniqueElements([BRANCH_MAIN_ELEMENT[left.branch], BRANCH_MAIN_ELEMENT[right.branch]]);
          const state = resolveStateForElements(elements);
          pairRows.push({
            shinsalName: definition.name,
            category: definition.category,
            position: `${locationOf(left)} ↔ ${locationOf(right)}`,
            trigger: { occurredFrom: [left.branch, right.branch], target: [left.branch, right.branch].join("·") },
            elementConnection: elements.map((element) => ({ element, elementKo: ELEMENT_KO[element], useState: getElementUseState(element, usefulElements) })),
            yongshinGisinConnection: state,
            natalMeaning: left.source === "원국" && right.source === "원국" ? definition.meaning : "원국 고정 신살은 아니며 대운·세운에서 보조 트리거로 발동한다.",
            luckActivation: {
              activated: left.source === "운" || right.source === "운",
              rows: [left, right].filter((row) => row.source === "운").map((row) => ({ scope: row.scope, label: row.label, branch: row.branch })),
            },
            actualLifeManifestation: actualManifestation(definition.manifestation || "", state),
          });
        }
      }
    }
    if (pairRows.length) rows.push(...pairRows);
    else {
      rows.push({
        shinsalName: definition.name,
        category: definition.category,
        position: "원국·입력 운에서 직접 확인되지 않음",
        trigger: { occurredFrom: null, target: "쌍지지 조건" },
        elementConnection: [],
        yongshinGisinConnection: "중립 보조",
        natalMeaning: "현재 원국과 입력된 운에서는 직접 발동하지 않는다.",
        luckActivation: { activated: false, rows: [] },
        actualLifeManifestation: `${definition.manifestation} 현재는 보조 판단에서 낮은 비중으로 둔다.`,
      });
    }
  });

  interactions.punishments.forEach((row) => {
    const branches = (row.branches as BranchKr[] | undefined) || [];
    const elements = uniqueElements(branches.map((branch) => BRANCH_MAIN_ELEMENT[branch]));
    const state = resolveStateForElements(elements);
    rows.push({
      shinsalName: "형살",
      category: "기타 기존 엔진 신살",
      position: "원국 지지 상호작용",
      trigger: { occurredFrom: branches, target: "기존 형살 판별" },
      elementConnection: elements.map((element) => ({ element, elementKo: ELEMENT_KO[element], useState: getElementUseState(element, usefulElements) })),
      yongshinGisinConnection: state,
      natalMeaning: "원국의 지지 형살은 성격의 긴장, 반복 충돌, 몸의 예민한 압박을 보조로 설명한다.",
      luckActivation: { activated: false, rows: [] },
      actualLifeManifestation: actualManifestation("규칙 충돌, 심리 압박, 관계의 마찰, 직업상 강한 긴장으로 나타난다.", state),
    });
  });

  return {
    principle: "신살은 원국 구조보다 앞세우지 않고, 용신·기신·격국·합충 뒤에서 성격·연애·직업·이동·귀인운을 보조 해석한다.",
    requestedShinsal: ["도화살", "홍염살", "화개살", "역마살", "천을귀인", "문창귀인", "태극귀인", "월덕귀인", "천덕귀인", "괴강살", "백호살", "양인살", "공망", "귀문관살", "원진살"],
    rows,
    activeRows: rows.filter((row) => row.position !== "원국·입력 운에서 직접 확인되지 않음"),
    luckTriggeredRows: rows.filter((row) => (row.luckActivation as Record<string, unknown> | undefined)?.activated),
    usefulLinkedRows: rows.filter((row) => row.yongshinGisinConnection === "용신 연결"),
    unfavorableLinkedRows: rows.filter((row) => row.yongshinGisinConnection === "기신 연결"),
    auxiliaryDomains: {
      personality: rows.filter((row) => String(row.category).includes("성격") || String(row.category).includes("심리")),
      love: rows.filter((row) => String(row.category).includes("연애") || String(row.category).includes("관계")),
      careerMove: rows.filter((row) => String(row.category).includes("직업") || String(row.category).includes("이동")),
      nobleHelp: rows.filter((row) => String(row.category).includes("귀인")),
    },
  };
}

function buildLoveMarriageAnalysis(
  pillars: LocalSajuResult["pillars"],
  dayStem: StemKr,
  gender: "male" | "female" | "unknown",
  visibleTenGods: Record<TenGodName, number>,
  hiddenTenGods: Record<TenGodName, number>,
  usefulElements: ElementKey[],
  yongshinAnalysis: Record<string, unknown>,
  combinationClashAnalysis: Record<string, unknown>,
  doChungAnalysis: Record<string, unknown>,
  interactions: ReturnType<typeof analyzeInteractions>,
  luckRows: Array<Record<string, unknown>>,
) {
  const dayElement = STEM_ELEMENT[dayStem];
  const wealthElement = CONTROLS[dayElement];
  const officerElement = getControllerOf(dayElement);
  const spouseTenGods: TenGodName[] = gender === "male"
    ? ["편재", "정재"]
    : gender === "female"
      ? ["편관", "정관"]
      : ["편재", "정재", "편관", "정관"];
  const relationTenGods: TenGodName[] = ["편재", "정재", "편관", "정관"];
  const spouseElements = uniqueElements(gender === "male"
    ? [wealthElement]
    : gender === "female"
      ? [officerElement]
      : [wealthElement, officerElement]);
  const tenGodScore = (tenGod: TenGodName) => round2((visibleTenGods[tenGod] || 0) + (hiddenTenGods[tenGod] || 0));
  const spouseStarScores = spouseTenGods.map((tenGod) => ({ tenGod, score: tenGodScore(tenGod) }));
  const mixedOfficer = tenGodScore("편관") >= 0.45 && tenGodScore("정관") >= 0.45;
  const mixedWealth = tenGodScore("편재") >= 0.45 && tenGodScore("정재") >= 0.45;
  const outputOfficerConflict = (tenGodScore("식신") + tenGodScore("상관")) >= 0.9 && (tenGodScore("편관") + tenGodScore("정관")) >= 0.8;
  const peerContestingWealth = (tenGodScore("비견") + tenGodScore("겁재")) >= 0.9 && (tenGodScore("편재") + tenGodScore("정재")) >= 0.8;
  const dayBranch = pillars.day.branch;
  const dayBranchMainTenGod = tenGodForStem(dayStem, getMainHiddenStem(dayBranch));
  const dayBranchHidden = HIDDEN_STEMS_BY_BRANCH[dayBranch].map((row) => ({
    ...row,
    element: STEM_ELEMENT[row.stem],
    tenGod: tenGodForStem(dayStem, row.stem),
  }));
  const dayBranchRelations = getPillarEntries(pillars)
    .filter((row) => row.key !== "day")
    .flatMap(({ key, pillar }) => {
      const relationKey = pairKey(dayBranch, pillar.branch, BRANCHES);
      const rows: Array<Record<string, unknown>> = [];
      if (BRANCH_COMBINATION_TO_ELEMENT[relationKey]) rows.push({ targetPillar: key, targetBranch: pillar.branch, type: "합", transformedElement: BRANCH_COMBINATION_TO_ELEMENT[relationKey], lifeArea: PILLAR_LIFE_AREA[key] });
      if (BRANCH_CLASHES.has(relationKey)) rows.push({ targetPillar: key, targetBranch: pillar.branch, type: "충", lifeArea: PILLAR_LIFE_AREA[key] });
      if (BRANCH_HARMS.has(relationKey)) rows.push({ targetPillar: key, targetBranch: pillar.branch, type: "해", lifeArea: PILLAR_LIFE_AREA[key] });
      if (BRANCH_BREAKS.has(relationKey)) rows.push({ targetPillar: key, targetBranch: pillar.branch, type: "파", lifeArea: PILLAR_LIFE_AREA[key] });
      return rows;
    });
  const dayPunishments = interactions.punishments.filter((row) => JSON.stringify(row).includes(dayBranch));
  const astroBranches = {
    dohwaByDay: getPeachBlossomBranch(dayBranch),
    hamjiByYear: getPeachBlossomBranch(pillars.year.branch),
    hongyeom: getHongyeomBranch(dayStem),
    cheonhui: getCheonhuiBranch(pillars.year.branch),
  };
  const astroRows = buildAstroRows(pillars, luckRows).flatMap((row) => {
    if (!row.branch) return [];
    return Object.entries(astroBranches)
      .filter(([, branch]) => branch === row.branch)
      .map(([name, branch]) => ({
        name: name === "dohwaByDay" ? "도화" : name === "hamjiByYear" ? "함지" : name === "hongyeom" ? "홍염" : "천희",
        source: row.source,
        scope: row.scope,
        label: row.label,
        branch,
      }));
  });
  const relationElementInLuck = (row: Record<string, unknown>) => uniqueElements([
    row.stem ? STEM_ELEMENT[row.stem as StemKr] : null,
    row.branch ? BRANCH_MAIN_ELEMENT[row.branch as BranchKr] : null,
  ]);
  const relationTenGodInLuck = (row: Record<string, unknown>): TenGodName[] => Array.from(new Set([
    row.stem ? tenGodForStem(dayStem, row.stem as StemKr) : null,
    row.branch ? tenGodForStem(dayStem, getMainHiddenStem(row.branch as BranchKr)) : null,
    ...(Array.isArray(row.hidden) ? row.hidden.map((hidden) => (hidden as Record<string, unknown>).tenGod as TenGodName | undefined) : []),
  ].filter(Boolean) as TenGodName[]));
  const spousePalaceLuckRows = luckRows.filter((row) => row.branch).map((row) => {
    const relationKey = pairKey(dayBranch, row.branch as BranchKr, BRANCHES);
    const type = BRANCH_COMBINATION_TO_ELEMENT[relationKey]
      ? "배우자궁 합"
      : BRANCH_CLASHES.has(relationKey)
        ? "배우자궁 충"
        : BRANCH_HARMS.has(relationKey)
          ? "배우자궁 해"
          : BRANCH_BREAKS.has(relationKey)
            ? "배우자궁 파"
            : "";
    return type ? { scope: row.scope, label: row.label || row.ganji || "", branch: row.branch, type, transformedElement: BRANCH_COMBINATION_TO_ELEMENT[relationKey] || null } : null;
  }).filter(Boolean) as Array<Record<string, unknown>>;
  const spouseStarLuckRows = luckRows.filter((row) => {
    const tenGods = relationTenGodInLuck(row);
    return tenGods.some((tenGod) => spouseTenGods.includes(tenGod));
  }).map((row) => ({
    scope: row.scope,
    label: row.label || row.ganji || "",
    stem: row.stem,
    branch: row.branch,
    spouseTenGods: relationTenGodInLuck(row).filter((tenGod) => spouseTenGods.includes(tenGod)),
    elements: relationElementInLuck(row),
    meaning: "배우자성이 운에서 투출하거나 지장간으로 들어와 관계 사건의 문을 연다.",
  }));
  const doChungRelationshipRows = ((doChungAnalysis.candidates as Array<Record<string, unknown>> | undefined) || []).filter((row) => {
    const text = JSON.stringify(row);
    return text.includes("love") || text.includes("연애") || text.includes(dayBranch) || spouseElements.some((element) => text.includes(element));
  });
  const annualRows = luckRows.filter((row) => row.scope === "annual");
  const daewoonRows = luckRows.filter((row) => row.scope === "daewoon");
  const hasRelationShinsal = (row: Record<string, unknown>) => astroRows.some((astro) => astro.source === "운" && astro.scope === row.scope && astro.label === (row.label || row.ganji || ""));
  const strongDaewoon = daewoonRows.map((row) => {
    const label = row.label || row.ganji || "대운";
    const hasSpouseStar = spouseStarLuckRows.some((match) => match.scope === row.scope && match.label === label);
    const palace = spousePalaceLuckRows.filter((match) => match.scope === row.scope && match.label === label);
    const elements = relationElementInLuck(row);
    return {
      label,
      ganji: row.ganji || "",
      strength: hasSpouseStar || palace.some((match) => String(match.type).includes("합")) || elements.some((element) => spouseElements.includes(element)) ? "강한 인연 대운" : "관계 정비 대운",
      spouseStarActivated: hasSpouseStar,
      spousePalaceRelations: palace,
      relationshipShinsal: astroRows.filter((astro) => astro.source === "운" && astro.scope === row.scope && astro.label === label),
    };
  });
  const loveEventAnnual = annualRows.filter((row) => {
    const label = row.label || row.ganji || "";
    return spouseStarLuckRows.some((match) => match.scope === row.scope && match.label === label)
      || spousePalaceLuckRows.some((match) => match.scope === row.scope && match.label === label && String(match.type).includes("합"))
      || hasRelationShinsal(row);
  }).map((row) => ({
    label: row.label || row.ganji || "",
    ganji: row.ganji || "",
    reason: "배우자성, 배우자궁 합, 도화·홍염·천희·함지 중 하나가 열려 실제 연애 사건이 생기기 쉽다.",
    tenGods: relationTenGodInLuck(row).filter((tenGod) => relationTenGods.includes(tenGod)),
  }));
  const breakupConflictAnnual = annualRows.filter((row) => {
    const label = String(row.label || row.ganji || "");
    return spousePalaceLuckRows.some((match) => match.scope === row.scope && match.label === label && !String(match.type).includes("합"))
      || relationElementInLuck(row).some((element) => ((yongshinAnalysis.gisin as ElementKey[] | undefined) || []).includes(element))
      || doChungRelationshipRows.some((match) => JSON.stringify(match.sources || []).includes(label));
  }).map((row) => ({
    label: row.label || row.ganji || "",
    ganji: row.ganji || "",
    reason: "배우자궁 충·해·파, 기신성 관계 자극, 도충이 겹쳐 이별·갈등이 쉬운 세운이다.",
  }));
  const marriageDecisionTiming = annualRows.filter((row) => {
    const label = row.label || row.ganji || "";
    const hasSpouse = spouseStarLuckRows.some((match) => match.scope === row.scope && match.label === label);
    const hasPalaceHarmony = spousePalaceLuckRows.some((match) => match.scope === row.scope && match.label === label && String(match.type).includes("합"));
    const useful = relationElementInLuck(row).some((element) => usefulElements.includes(element));
    return (hasSpouse || hasPalaceHarmony) && useful;
  }).map((row) => ({
    label: row.label || row.ganji || "",
    ganji: row.ganji || "",
    reason: "배우자성 또는 배우자궁 합이 용신성 흐름과 맞물려 결혼 결정을 현실화하기 좋다.",
  }));
  const marriageFavorable = spouseStarScores.some((row) => row.score >= 0.55) && !dayBranchRelations.some((row) => row.type === "충") && !mixedOfficer && !mixedWealth;
  const lateOrEarlyMarriage = dayBranchRelations.some((row) => row.type === "충" || row.type === "해" || row.type === "파") || mixedOfficer || mixedWealth || outputOfficerConflict || peerContestingWealth
    ? "늦은 결혼이 유리하다"
    : "빠른 결혼도 가능하지만 운에서 배우자성이 확인되는 해가 좋다";
  const loveStyle = spouseStarScores.some((row) => row.score >= 0.75)
    ? "끌림이 현실 선택으로 빠르게 이어지며, 관계를 생활·책임·약속의 구조 안에서 확인하려는 성향이 강하다."
    : dayBranchRelations.some((row) => row.type === "합")
      ? "인연이 들어오면 쉽게 마음이 묶이고, 관계 속에서 자신을 조율하며 깊어지는 편이다."
      : "관계는 천천히 열리지만 한 번 마음이 움직이면 일지의 지장간처럼 깊고 오래 작동한다.";
  const attractedPersonType = gender === "male"
    ? "현실감, 생활력, 경제 감각, 관계의 안정성을 가진 사람에게 강하게 끌린다."
    : gender === "female"
      ? "책임감, 공적 신뢰, 결단력, 보호와 약속을 보여 주는 사람에게 강하게 끌린다."
      : "현실성 있는 매력과 책임감 있는 태도가 함께 있는 사람에게 관계성이 열린다.";
  const repeatingProblem = mixedOfficer
    ? "강한 사람과 안정적인 사람 사이에서 기준이 흔들리거나, 관계의 긴장과 공식성을 동시에 요구하기 쉽다."
    : mixedWealth
      ? "설렘과 안정, 자유로운 만남과 생활 조건 사이에서 선택이 흔들리기 쉽다."
      : outputOfficerConflict
        ? "표현과 자존감이 강해질수록 상대의 책임·약속 요구와 부딪히기 쉽다."
        : peerContestingWealth
          ? "주변 경쟁, 자존심, 비교 심리가 관계의 소유감과 질투로 번지기 쉽다."
          : "배우자궁 합충이 오는 운에서 가까워짐과 거리 두기가 반복될 수 있다.";
  const avoidedRelationshipPattern = [
    mixedOfficer ? "책임 있는 관계와 긴장감 있는 관계를 동시에 붙잡는 패턴" : null,
    mixedWealth ? "설렘, 조건, 소유감을 한꺼번에 확인하려는 패턴" : null,
    outputOfficerConflict ? "말과 표현으로 관계의 약속을 시험하는 패턴" : null,
    peerContestingWealth ? "비교, 경쟁, 주변 개입으로 관계의 신뢰를 흔드는 패턴" : null,
    dayBranchRelations.some((row) => row.type === "충") ? "배우자궁이 흔들릴 때 즉시 단절로 결론 내리는 패턴" : null,
  ].filter(Boolean);
  const relationshipPrescription = [
    "배우자궁이 합으로 묶이는 시기에는 관계 속도를 늦추고 약속의 범위를 분명히 한다.",
    "배우자궁이 충·해·파 되는 시기에는 이별 결정을 서두르기보다 거리, 돈, 가족, 일정을 분리해 본다.",
    spouseElements.map((element) => `${ELEMENT_KO[element]} 기운의 건강한 생활 리듬을 키우면 배우자성이 안정된다.`).join(" "),
  ];

  return {
    basis: {
      gender,
      spousePalace: { branch: dayBranch, mainTenGod: dayBranchMainTenGod, hiddenStems: dayBranchHidden },
      spouseTenGods,
      spouseElements,
      spouseStarScores,
      dayBranchRelations,
      dayPunishments,
      relationshipShinsal: astroRows,
      mixedOfficer,
      mixedWealth,
      outputOfficerConflict,
      peerContestingWealth,
    },
    loveStyle,
    attractedPersonType,
    recurringRelationshipProblem: repeatingProblem,
    marriageFavorability: marriageFavorable ? "결혼에 유리한 구조" : "결혼은 가능하나 합충과 혼잡을 조율해야 하는 구조",
    lateOrEarlyMarriage,
    strongRelationshipDaewoon: strongDaewoon,
    likelyLoveEventAnnual: loveEventAnnual,
    breakupConflictAnnual,
    goodMarriageDecisionTiming: marriageDecisionTiming,
    avoidedRelationshipPattern,
    relationshipPrescription,
    spousePalaceLuckRows,
    spouseStarLuckRows,
    doChungRelationshipChangeTiming: doChungRelationshipRows,
    evidence: {
      combinationClashRows: combinationClashAnalysis.requiredOutputRows,
      doChungRows: doChungRelationshipRows,
      loveYongshin: yongshinAnalysis.loveYongshin,
      astroBranches,
    },
  };
}

function clampJudgmentScore(value: number): number {
  return Math.max(-100, Math.min(100, Math.round(value)));
}

function getJudgmentGrade(score: number): string {
  if (score >= 70) return "매우 강한 길작용";
  if (score >= 30) return "유리";
  if (score >= -29) return "혼재";
  if (score >= -69) return "불리";
  return "매우 강한 흉작용";
}

function makeScoreItem(key: string, label: string, score: number, naturalReason: string, evidence: Record<string, unknown>) {
  const normalizedScore = clampJudgmentScore(score);
  return {
    key,
    label,
    score: normalizedScore,
    grade: getJudgmentGrade(normalizedScore),
    naturalReason,
    evidence,
  };
}

function buildScoringAnalysis(
  pillars: LocalSajuResult["pillars"],
  dayStem: StemKr,
  dayMasterStrength: string,
  strengthIndex: number,
  effectivePower: Record<ElementKey, number>,
  normalizedClimate: Record<string, number>,
  visibleTenGods: Record<TenGodName, number>,
  hiddenTenGods: Record<TenGodName, number>,
  usefulElements: ElementKey[],
  gyeokgukAnalysis: Record<string, unknown>,
  yongshinAnalysis: Record<string, unknown>,
  combinationClashAnalysis: Record<string, unknown>,
  doChungAnalysis: Record<string, unknown>,
  earthStorageAnalysis: Record<string, unknown>,
  hiddenStemActivation: Record<string, unknown>,
  daewoonAnalysis: Record<string, unknown>,
  careerAnalysis: Record<string, unknown>,
  loveMarriageAnalysis: Record<string, unknown>,
  shinsalAnalysis: Record<string, unknown>,
  structuralIssues: Array<Record<string, unknown>>,
  luckRows: Array<Record<string, unknown>>,
) {
  const totalPower = ELEMENTS.reduce((sum, element) => sum + effectivePower[element], 0) || 1;
  const dayElement = STEM_ELEMENT[dayStem];
  const wealthElement = CONTROLS[dayElement];
  const officerElement = getControllerOf(dayElement);
  const outputElement = PRODUCES[dayElement];
  const gisin = (Array.isArray(yongshinAnalysis.gisin) ? yongshinAnalysis.gisin : []) as ElementKey[];
  const annualRows = luckRows.filter((row) => row.scope === "annual");
  const ratio = (element: ElementKey) => effectivePower[element] / totalPower;
  const usefulPower = usefulElements.reduce((sum, element) => sum + effectivePower[element], 0);
  const gisinPower = gisin.reduce((sum, element) => sum + effectivePower[element], 0);
  const topElement = [...ELEMENTS].sort((a, b) => effectivePower[b] - effectivePower[a])[0];
  const topRatio = ratio(topElement);
  const missingElements = ELEMENTS.filter((element) => effectivePower[element] < 0.25);
  const climatePressure = Math.max(
    Math.abs(Number(normalizedClimate.temperature || 0)),
    Math.abs(Number(normalizedClimate.humidity || 0)),
    Math.abs(Number(normalizedClimate.dryness || 0)),
  );
  const issueSeverity = structuralIssues.reduce((sum, row) => sum + Number(row.severity || 0), 0);
  const tenGodScore = (tenGod: TenGodName) => (visibleTenGods[tenGod] || 0) + (hiddenTenGods[tenGod] || 0);
  const outputScore = tenGodScore("식신") + tenGodScore("상관");
  const wealthScore = tenGodScore("편재") + tenGodScore("정재");
  const officerScore = tenGodScore("편관") + tenGodScore("정관");
  const peerScore = tenGodScore("비견") + tenGodScore("겁재");
  const resourceScore = tenGodScore("편인") + tenGodScore("정인");
  const combinationRows = [
    ...((combinationClashAnalysis.stemCombinations as Array<Record<string, unknown>> | undefined) || []),
    ...((combinationClashAnalysis.branchCombinations as Array<Record<string, unknown>> | undefined) || []),
  ];
  const clashRows = ((combinationClashAnalysis.clashes as Array<Record<string, unknown>> | undefined) || []);
  const requiredRelationRows = ((combinationClashAnalysis.requiredOutputRows as Array<Record<string, unknown>> | undefined) || []);
  const successfulUsefulCombination = combinationRows.filter((row) => {
    const element = row.transformedElement as ElementKey | undefined;
    return Boolean((row.success || row.complete) && element && usefulElements.includes(element));
  });
  const successfulUnfavorableCombination = combinationRows.filter((row) => {
    const element = row.transformedElement as ElementKey | undefined;
    return Boolean((row.success || row.complete) && element && gisin.includes(element));
  });
  const hapgeoRows = requiredRelationRows.filter((row) => String(row.resultType || "").includes("합거") || JSON.stringify(row).includes("합거"));
  const usefulHapgeoRows = hapgeoRows.filter((row) => JSON.stringify(row).includes("길에서 흉") || usefulElements.some((element) => JSON.stringify(row).includes(element)));
  const unfavorableHapgeoRows = hapgeoRows.filter((row) => JSON.stringify(row).includes("흉에서 길") || gisin.some((element) => JSON.stringify(row).includes(element)));
  const positiveClashRows = clashRows.filter((row) => JSON.stringify(row).includes("기신 충거") || JSON.stringify(row).includes("흉에서 길"));
  const negativeClashRows = clashRows.filter((row) => JSON.stringify(row).includes("용신 피충") || JSON.stringify(row).includes("길에서 흉"));
  const doChungRows = ((doChungAnalysis.candidates as Array<Record<string, unknown>> | undefined) || []);
  const positiveDoChungRows = doChungRows.filter((row) => String(row.classification || "").includes("흉에서 길") || String(row.resultCategory || "").includes("흉에서 길"));
  const negativeDoChungRows = doChungRows.filter((row) => String(row.classification || "").includes("길에서 흉") || String(row.resultCategory || "").includes("길에서 흉"));
  const earthStorageRows = ((earthStorageAnalysis.rows as Array<Record<string, unknown>> | undefined) || []);
  const hiddenProtrudedRows = ((hiddenStemActivation.protruded as Array<Record<string, unknown>> | undefined) || []);
  const usefulHiddenRows = hiddenProtrudedRows.filter((row) => usefulElements.includes(row.element as ElementKey));
  const hiddenStorageUsefulRows = earthStorageRows.filter((row) => JSON.stringify(row).includes("용신"));
  const gyeokCandidates = ((gyeokgukAnalysis.candidates as Array<Record<string, unknown>> | undefined) || []);
  const bestGyeokCandidate = [...gyeokCandidates].sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];
  const breakFactors = ((gyeokgukAnalysis.breakFactors as Array<Record<string, unknown>> | undefined) || []);
  const brokenLuckRows = (((gyeokgukAnalysis.luckTiming as Record<string, unknown> | undefined)?.broken as Array<Record<string, unknown>> | undefined) || []);
  const activatedLuckRows = (((gyeokgukAnalysis.luckTiming as Record<string, unknown> | undefined)?.activated as Array<Record<string, unknown>> | undefined) || []);
  const daewoonChange = (daewoonAnalysis.yongshinGisinChange || {}) as Record<string, unknown>;
  const daewoonSupports = Array.isArray(daewoonChange.supportsYongshin) ? daewoonChange.supportsYongshin.length : 0;
  const daewoonGisin = Array.isArray(daewoonChange.strengthensGisin) ? daewoonChange.strengthensGisin.length : 0;
  const bestYears = Array.isArray(daewoonAnalysis.bestYears) ? daewoonAnalysis.bestYears.length : 0;
  const cautionYears = Array.isArray(daewoonAnalysis.cautionYears) ? daewoonAnalysis.cautionYears.length : 0;
  const annualUsefulCount = annualRows.filter((row) => {
    const stemElement = row.stem ? STEM_ELEMENT[row.stem as StemKr] : null;
    const branchElement = row.branch ? BRANCH_MAIN_ELEMENT[row.branch as BranchKr] : null;
    return [stemElement, branchElement].some((element) => element && usefulElements.includes(element as ElementKey));
  }).length;
  const annualGisinCount = annualRows.filter((row) => {
    const stemElement = row.stem ? STEM_ELEMENT[row.stem as StemKr] : null;
    const branchElement = row.branch ? BRANCH_MAIN_ELEMENT[row.branch as BranchKr] : null;
    return [stemElement, branchElement].some((element) => element && gisin.includes(element as ElementKey));
  }).length;
  const careerRiseRows = ((careerAnalysis.daewoonCareerRiseTiming as Array<Record<string, unknown>> | undefined) || []);
  const annualCareerRows = ((careerAnalysis.annualJobChangePromotionExpansionTiming as Array<Record<string, unknown>> | undefined) || []);
  const loveEventRows = ((loveMarriageAnalysis.likelyLoveEventAnnual as Array<Record<string, unknown>> | undefined) || []);
  const breakupRows = ((loveMarriageAnalysis.breakupConflictAnnual as Array<Record<string, unknown>> | undefined) || []);
  const marriageRows = ((loveMarriageAnalysis.goodMarriageDecisionTiming as Array<Record<string, unknown>> | undefined) || []);
  const usefulShinsalRows = ((shinsalAnalysis.usefulLinkedRows as Array<Record<string, unknown>> | undefined) || []);
  const unfavorableShinsalRows = ((shinsalAnalysis.unfavorableLinkedRows as Array<Record<string, unknown>> | undefined) || []);

  const scores = [
    makeScoreItem(
      "dayMasterStrength",
      "일간 강약 점수",
      82 - Math.abs(strengthIndex - 0.37) * 520,
      `일간은 ${dayMasterStrength}이며, 월령·통근·인비 조력까지 반영한 강약 지수가 ${round2(strengthIndex)}로 잡혔다.`,
      { dayMasterStrength, strengthIndex: round2(strengthIndex), dayElement, dayElementKo: ELEMENT_KO[dayElement] },
    ),
    makeScoreItem(
      "johuBalance",
      "조후 균형 점수",
      88 - climatePressure * 65,
      `조후는 온도 ${normalizedClimate.temperature}, 습도 ${normalizedClimate.humidity}, 건조 ${normalizedClimate.dryness}의 압력을 함께 보아 균형 여부를 판단했다.`,
      { climate: normalizedClimate, climatePressure: round2(climatePressure) },
    ),
    makeScoreItem(
      "elementSkew",
      "오행 편중 점수",
      82 - Math.max(0, topRatio - 0.24) * 360 - missingElements.length * 18,
      `${ELEMENT_KO[topElement]} 기운이 가장 강하고, 결핍 오행 ${missingElements.map((element) => ELEMENT_KO[element]).join(", ") || "없음"}까지 합산해 편중도를 보았다.`,
      { topElement, topElementKo: ELEMENT_KO[topElement], topRatio: round2(topRatio), missingElements },
    ),
    makeScoreItem(
      "yongshinActivation",
      "용신 활성 점수",
      usefulPower / totalPower * 185 - 35 + daewoonSupports * 18 + annualUsefulCount * 9 - structuralIssues.filter((row) => row.code === "useful_damaged").length * 28,
      `용신 후보 ${usefulElements.map((element) => ELEMENT_KO[element]).join(", ")}가 원국 세력과 대운·세운에서 얼마나 살아나는지를 함께 보았다.`,
      { usefulElements, usefulPower: round2(usefulPower), usefulRatio: round2(usefulPower / totalPower), daewoonSupports, annualUsefulCount },
    ),
    makeScoreItem(
      "gisinRisk",
      "기신 위험 점수",
      62 - gisinPower / totalPower * 210 - structuralIssues.filter((row) => row.code === "unfavorable_activated").length * 28 - unfavorableShinsalRows.length * 4,
      `기신 ${gisin.map((element) => ELEMENT_KO[element]).join(", ") || "미약"}의 원국 세력, 구조적 병, 신살 부작용 연결을 함께 반영했다.`,
      { gisin, gisinPower: round2(gisinPower), gisinRatio: round2(gisinPower / totalPower), unfavorableShinsalCount: unfavorableShinsalRows.length },
    ),
    makeScoreItem(
      "gyeokEstablished",
      "격국 성립 점수",
      Number(bestGyeokCandidate?.score || 0) * 17 + activatedLuckRows.length * 7 - breakFactors.length * 12,
      `${gyeokgukAnalysis.finalGyeokguk || "격국"} 후보의 성립 점수, 월지 투간, 상신·희신, 파격 요소를 함께 계산했다.`,
      { finalGyeokguk: gyeokgukAnalysis.finalGyeokguk, bestCandidate: bestGyeokCandidate, activatedLuckCount: activatedLuckRows.length, breakFactorCount: breakFactors.length },
    ),
    makeScoreItem(
      "gyeokDamage",
      "격국 파손 점수",
      70 - breakFactors.length * 24 - brokenLuckRows.length * 18 + activatedLuckRows.length * 7,
      `파격 요소와 운에서 격을 깨는 흐름이 많을수록 점수가 낮아지며, 격을 살리는 운이 있으면 일부 회복된다.`,
      { breakFactors, brokenLuckRows, activatedLuckRows },
    ),
    makeScoreItem(
      "combinationTransform",
      "합화 성공 가능성 점수",
      successfulUsefulCombination.length * 32 - successfulUnfavorableCombination.length * 28 + combinationRows.length * 4,
      `천간합·지지합은 계절 지원, 뿌리, 합화 오행의 세력, 용신/기신 전환을 함께 보아 합화 가능성을 점수화했다.`,
      { combinationCount: combinationRows.length, successfulUsefulCombination, successfulUnfavorableCombination },
    ),
    makeScoreItem(
      "hapgeoPossibility",
      "합거 가능성 점수",
      unfavorableHapgeoRows.length * 22 - usefulHapgeoRows.length * 28 - hapgeoRows.length * 5,
      `합거는 묶이는 글자가 용신이면 불리하게, 기신이면 정리와 완충으로 작동할 수 있어 방향을 나누어 계산했다.`,
      { hapgeoRows, usefulHapgeoRows, unfavorableHapgeoRows },
    ),
    makeScoreItem(
      "clashTriggerIntensity",
      "충발 강도 점수",
      positiveClashRows.length * 28 - negativeClashRows.length * 34 - Math.max(0, clashRows.length - positiveClashRows.length - negativeClashRows.length) * 8,
      `충은 무조건 흉이 아니라 기신을 치면 돌파로, 용신을 치면 기반 손상으로 보아 강도를 나누었다.`,
      { clashRows, positiveClashRows, negativeClashRows },
    ),
    makeScoreItem(
      "doChungActivation",
      "도충 발동 점수",
      positiveDoChungRows.length * 42 - negativeDoChungRows.length * 44 - Math.max(0, doChungRows.length - positiveDoChungRows.length - negativeDoChungRows.length) * 8,
      `같은 지지가 과포화될 때 반대 글자를 불러오는 도충은 용신 유도인지 기신 유도인지에 따라 급변 점수를 갈랐다.`,
      { doChungRows, positiveDoChungRows, negativeDoChungRows },
    ),
    makeScoreItem(
      "hiddenStemOpening",
      "지장간 개방 점수",
      usefulHiddenRows.length * 22 + hiddenStorageUsefulRows.length * 18 - (earthStorageAnalysis.overburdened ? 18 : 0),
      `월지·일지·시지 지장간 투간과 진술축미 창고 개방에서 용신성 성분이 현실화되는지를 보았다.`,
      { usefulHiddenRows, hiddenStorageUsefulRows, earthOverburdened: earthStorageAnalysis.overburdened },
    ),
    makeScoreItem(
      "daewoonFortune",
      "대운 길흉 점수",
      daewoonSupports * 34 - daewoonGisin * 34 + bestYears * 6 - cautionYears * 6 + activatedLuckRows.filter((row) => row.scope === "daewoon").length * 8 - brokenLuckRows.filter((row) => row.scope === "daewoon").length * 12,
      `대운 천간·지지가 원국 용신을 돕는지, 기신을 강화하는지, 격국과 도충을 어떻게 건드리는지를 종합했다.`,
      { daewoonSupports, daewoonGisin, bestYears, cautionYears, daewoonStatus: daewoonAnalysis.status },
    ),
    makeScoreItem(
      "annualFortune",
      "세운 길흉 점수",
      annualRows.length ? ((annualUsefulCount - annualGisinCount) / annualRows.length) * 70 + annualUsefulCount * 6 - annualGisinCount * 6 : 0,
      `입력된 세운이 대운 위에서 용신을 발동하는지, 기신을 자극하는지를 연간 단위로 합산했다.`,
      { annualRows, annualUsefulCount, annualGisinCount },
    ),
    makeScoreItem(
      "careerFortune",
      "직업운 점수",
      careerRiseRows.filter((row) => String(row.strength || "").includes("상승")).length * 24 + annualCareerRows.filter((row) => String(row.timingType || "").includes("승진") || String(row.timingType || "").includes("확장")).length * 10 + usefulPower / totalPower * 45 - gisinPower / totalPower * 18,
      `격국이 요구하는 일, 직업 용신, 강한 십성, 대운·세운의 상승 타이밍을 직업운으로 묶었다.`,
      { careerRiseRows, annualCareerRows, jobYongshin: yongshinAnalysis.jobYongshin },
    ),
    makeScoreItem(
      "wealthFortune",
      "재물운 점수",
      wealthScore * 22 + outputScore * 8 + (usefulElements.includes(wealthElement) ? 24 : 0) - (dayMasterStrength.includes("약") && wealthScore / Math.max(1, peerScore + resourceScore) > 0.65 ? 38 : 0) - (gisin.includes(wealthElement) ? 24 : 0),
      `재성 자체보다 식상생재, 일간 감당력, 재성의 용신/기신 여부를 함께 보아 재물운을 산정했다.`,
      { wealthScore: round2(wealthScore), outputScore: round2(outputScore), wealthElement, wealthElementKo: ELEMENT_KO[wealthElement], dayMasterStrength },
    ),
    makeScoreItem(
      "loveFortune",
      "연애운 점수",
      loveEventRows.length * 20 + marriageRows.length * 18 + officerScore * 8 + wealthScore * 7 - breakupRows.length * 24 - (loveMarriageAnalysis.basis && (loveMarriageAnalysis.basis as Record<string, unknown>).mixedOfficer ? 18 : 0),
      `배우자궁, 배우자성, 연애 신살, 합충 세운, 혼잡 구조를 모두 반영해 실제 관계 사건성을 계산했다.`,
      { loveEventRows, marriageRows, breakupRows, officerScore: round2(officerScore), wealthScore: round2(wealthScore) },
    ),
    makeScoreItem(
      "healthPsychPressure",
      "건강·심리 압박 점수",
      70 - issueSeverity * 9 - climatePressure * 18 - clashRows.length * 7 - doChungRows.length * 9 - (earthStorageAnalysis.overburdened ? 22 : 0),
      `조후 압박, 구조적 병, 충·도충, 토창고 과중이 몸과 심리에 누적되는 정도를 낮은 점수로 표시했다.`,
      { issueSeverity, climatePressure: round2(climatePressure), clashCount: clashRows.length, doChungCount: doChungRows.length, earthOverburdened: earthStorageAnalysis.overburdened },
    ),
  ];

  const overallScore = clampJudgmentScore(scores.reduce((sum, row) => sum + Number(row.score), 0) / scores.length);
  const strongestHelpful = [...scores].sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 3);
  const strongestRisk = [...scores].sort((a, b) => Number(a.score) - Number(b.score)).slice(0, 3);

  return {
    scale: {
      min: -100,
      max: 100,
      guide: {
        "70+": "매우 강한 길작용",
        "30~69": "유리",
        "-29~29": "혼재",
        "-69~-30": "불리",
        "-70 이하": "매우 강한 흉작용",
      },
    },
    principle: "점수는 단순 오행 개수가 아니라 월령, 투간, 통근, 조후, 격국, 합화, 충, 도충, 지장간 개방, 대운·세운 중첩을 함께 반영한 내부 판별값이다.",
    overallScore,
    overallGrade: getJudgmentGrade(overallScore),
    naturalSummary: `전체 판별은 ${getJudgmentGrade(overallScore)} 흐름이다. 가장 강한 길작용은 ${strongestHelpful.map((row) => row.label).join(", ")}에서 나오고, 가장 주의할 압박은 ${strongestRisk.map((row) => row.label).join(", ")}에 모인다.`,
    items: scores,
    strongestHelpful,
    strongestRisk,
    evidence: {
      effectivePower: roundScores(effectivePower),
      usefulElements,
      gisin,
      structuralIssueCount: structuralIssues.length,
      structuralIssueSeverity: issueSeverity,
      combinationCount: combinationRows.length,
      clashCount: clashRows.length,
      doChungCount: doChungRows.length,
      usefulShinsalCount: usefulShinsalRows.length,
      unfavorableShinsalCount: unfavorableShinsalRows.length,
    },
  };
}

function calculateNatalAnalysis(pillars: LocalSajuResult["pillars"], input: LocalSajuInput): NatalAnalysisLocal {
  const dayStem = pillars.day.stem;
  const dayElement = STEM_ELEMENT[dayStem];
  const resourceElement = getProducerOf(dayElement);
  const outputElement = PRODUCES[dayElement];
  const wealthElement = CONTROLS[dayElement];
  const officerElement = getControllerOf(dayElement);
  const season = getSeasonProfile(pillars.month.branch);
  const interactions = analyzeInteractions(pillars);
  const entries = getPillarEntries(pillars);
  const visibleStems = new Set(entries.map((row) => row.pillar.stem));

  const heavenlyStems = emptyElementScores();
  const branchMainQi = emptyElementScores();
  const hiddenStems = emptyElementScores();
  const basePower = emptyElementScores();
  const effectivePower = emptyElementScores();
  const visibleTenGods = emptyTenGodScores();
  const hiddenTenGods = emptyTenGodScores();
  const monthHiddenProtruded = emptyTenGodScores();
  const protrusions: Array<Record<string, unknown>> = [];

  entries.forEach(({ key, pillar }) => {
    const stemElement = STEM_ELEMENT[pillar.stem];
    addElementScore(heavenlyStems, stemElement, 1);
    addElementScore(basePower, stemElement, PILLAR_STEM_WEIGHT[key]);
    visibleTenGods[tenGodForStem(dayStem, pillar.stem)] += PILLAR_STEM_WEIGHT[key];

    const mainElement = BRANCH_MAIN_ELEMENT[pillar.branch];
    addElementScore(branchMainQi, mainElement, 1);
    addElementScore(basePower, mainElement, PILLAR_BRANCH_WEIGHT[key]);

    HIDDEN_STEMS_BY_BRANCH[pillar.branch].forEach((hidden) => {
      const hiddenElement = STEM_ELEMENT[hidden.stem];
      const hiddenPower = PILLAR_BRANCH_WEIGHT[key] * hidden.weight * 0.8;
      addElementScore(hiddenStems, hiddenElement, hidden.weight);
      addElementScore(basePower, hiddenElement, hiddenPower);
      hiddenTenGods[tenGodForStem(dayStem, hidden.stem)] += hiddenPower;
      if (visibleStems.has(hidden.stem)) {
        const protrusionPower = hiddenPower * HIDDEN_STEM_PROTRUSION_WEIGHT[key];
        addElementScore(basePower, hiddenElement, protrusionPower);
        hiddenTenGods[tenGodForStem(dayStem, hidden.stem)] += protrusionPower;
        protrusions.push({
          pillar: key,
          branch: pillar.branch,
          stem: hidden.stem,
          tenGod: tenGodForStem(dayStem, hidden.stem),
          strength: HIDDEN_STEM_PROTRUSION_LEVEL[key],
          addedPower: round2(protrusionPower),
          lifeArea: PILLAR_LIFE_AREA[key],
        });
        if (key === "month") monthHiddenProtruded[tenGodForStem(dayStem, hidden.stem)] += hiddenPower + protrusionPower;
      }
    });
  });

  ELEMENTS.forEach((element) => {
    effectivePower[element] = Math.max(0, basePower[element] * season.weights[element] + interactions.delta[element]);
  });

  const totalPower = ELEMENTS.reduce((sum, element) => sum + effectivePower[element], 0) || 1;
  const daySidePower = effectivePower[dayElement] + effectivePower[resourceElement];
  const strengthIndex = daySidePower / totalPower;
  const dayMasterStrength = strengthIndex < 0.22
    ? "과약"
    : strengthIndex < 0.32
      ? "신약"
      : strengthIndex > 0.5
        ? "과왕"
        : strengthIndex > 0.42
          ? "신강"
          : "중화";

  const rootingRows = entries.map(({ key, pillar }) => {
    const hidden = HIDDEN_STEMS_BY_BRANCH[pillar.branch];
    const peerRoot = hidden.filter((row) => STEM_ELEMENT[row.stem] === dayElement).reduce((sum, row) => sum + row.weight, 0);
    const resourceRoot = hidden.filter((row) => STEM_ELEMENT[row.stem] === resourceElement).reduce((sum, row) => sum + row.weight, 0);
    const exactRoot = hidden.some((row) => row.stem === dayStem);
    const mainRoot = BRANCH_MAIN_ELEMENT[pillar.branch] === dayElement ? 0.8 : 0;
    const score = (mainRoot + peerRoot * 0.75 + resourceRoot * 0.35 + (exactRoot ? 0.3 : 0)) * PILLAR_ROOT_WEIGHT[key];
    return {
      pillar: key,
      branch: pillar.branch,
      score: round2(score),
      level: score >= 1.3 ? "강근" : score > 0.45 ? "통근" : "무근",
      exactRoot,
      peerRoot: round2(peerRoot),
      resourceRoot: round2(resourceRoot),
    };
  });
  const monthHidden = HIDDEN_STEMS_BY_BRANCH[pillars.month.branch];
  const monthSupport = monthHidden.some((row) => row.stem === dayStem || STEM_ELEMENT[row.stem] === dayElement || STEM_ELEMENT[row.stem] === resourceElement);

  const luckRows = normalizeLuckPillars(input).map((row) => {
    const visible = row.stem ? tenGodForStem(dayStem, row.stem) : null;
    const hidden = row.branch ? HIDDEN_STEMS_BY_BRANCH[row.branch].map((entry) => ({ stem: entry.stem, tenGod: tenGodForStem(dayStem, entry.stem), weight: entry.weight })) : [];
    return { scope: row.scope || "unknown", label: row.label || row.ganji || "", stem: row.stem, branch: row.branch, visible, hidden };
  });
  const hiddenStemActivation = buildHiddenStemActivationReport(pillars, dayStem, protrusions, luckRows);

  const climate = {
    temperature: season.climateBase.temperature + effectivePower.fire * 0.06 - effectivePower.water * 0.06,
    humidity: season.climateBase.humidity + effectivePower.water * 0.06 - effectivePower.fire * 0.035,
    dryness: season.climateBase.dryness + effectivePower.fire * 0.04 + effectivePower.metal * 0.04 - effectivePower.water * 0.05,
  };
  const normalizedClimate = {
    temperature: round2(climate.temperature),
    humidity: round2(climate.humidity),
    dryness: round2(climate.dryness),
    coldness: round2(Math.max(0, -climate.temperature)),
  };
  const lackingElement = [...ELEMENTS].sort((a, b) => effectivePower[a] - effectivePower[b])[0];
  const urgentElement: ElementKey = climate.temperature <= -1.1
    ? "fire"
    : climate.temperature >= 1.25
      ? "water"
      : climate.dryness >= 1.2
        ? "water"
        : climate.humidity >= 1.2
          ? "earth"
          : lackingElement;

  const suppressingUseful = dayMasterStrength === "과약" || dayMasterStrength === "신약"
    ? [resourceElement, dayElement]
    : dayMasterStrength === "과왕" || dayMasterStrength === "신강"
      ? [outputElement, wealthElement, officerElement]
      : [urgentElement, outputElement];
  const usefulElements = Array.from(new Set([urgentElement, ...suppressingUseful]));
  const strongestElement = [...ELEMENTS].sort((a, b) => effectivePower[b] - effectivePower[a])[0];
  const earthStorageAnalysis = buildEarthStorageAnalysis(pillars, dayStem, usefulElements, effectivePower, luckRows);
  const doChungAnalysis = buildDoChungAnalysis(pillars, dayStem, usefulElements, effectivePower, luckRows, interactions);
  const combinationClashAnalysis = buildCombinationClashAnalysis(pillars, dayStem, usefulElements, effectivePower, season, luckRows, earthStorageAnalysis);
  const gyeokgukAnalysis = buildGyeokgukAnalysis(
    pillars,
    dayStem,
    dayMasterStrength,
    strengthIndex,
    rootingRows,
    effectivePower,
    visibleTenGods,
    hiddenTenGods,
    protrusions,
    usefulElements,
    season,
    interactions,
    combinationClashAnalysis,
    luckRows,
  );
  const yongshinAnalysis = buildYongshinAnalysis(
    pillars,
    dayStem,
    dayMasterStrength,
    strengthIndex,
    effectivePower,
    normalizedClimate,
    urgentElement,
    suppressingUseful,
    usefulElements,
    gyeokgukAnalysis,
    combinationClashAnalysis,
    doChungAnalysis,
    luckRows,
  );
  const daewoonAnalysis = buildDaewoonAnalysis(
    pillars,
    dayStem,
    usefulElements,
    gyeokgukAnalysis,
    yongshinAnalysis,
    doChungAnalysis,
    combinationClashAnalysis,
    luckRows,
  );
  const luckInteractionDetailAnalysis = buildLuckInteractionDetailAnalysis(
    pillars,
    dayStem,
    usefulElements,
    effectivePower,
    season,
    yongshinAnalysis,
    combinationClashAnalysis,
    doChungAnalysis,
    luckRows,
  );
  const transformationTimingAnalysis = buildTransformationTimingAnalysis(
    pillars,
    dayStem,
    usefulElements,
    yongshinAnalysis,
    combinationClashAnalysis,
    doChungAnalysis,
    earthStorageAnalysis,
    hiddenStemActivation,
    gyeokgukAnalysis,
    luckRows,
  );
  const personalityAnalysis = buildPersonalityAnalysis(
    pillars,
    dayStem,
    dayMasterStrength,
    visibleTenGods,
    hiddenTenGods,
    effectivePower,
    season,
    normalizedClimate,
    interactions,
    doChungAnalysis,
    earthStorageAnalysis,
    transformationTimingAnalysis,
    luckRows,
  );
  const careerAnalysis = buildCareerAnalysis(
    pillars,
    dayStem,
    dayMasterStrength,
    visibleTenGods,
    hiddenTenGods,
    effectivePower,
    season,
    gyeokgukAnalysis,
    yongshinAnalysis,
    daewoonAnalysis,
    luckRows,
  );
  const loveMarriageAnalysis = buildLoveMarriageAnalysis(
    pillars,
    dayStem,
    normalizeGender(input),
    visibleTenGods,
    hiddenTenGods,
    usefulElements,
    yongshinAnalysis,
    combinationClashAnalysis,
    doChungAnalysis,
    interactions,
    luckRows,
  );
  const shinsalAnalysis = buildShinsalAnalysis(
    pillars,
    dayStem,
    usefulElements,
    yongshinAnalysis,
    interactions,
    luckRows,
  );
  const structuralIssues: Array<Record<string, unknown>> = [];
  const pushIssue = (condition: boolean, code: string, label: string, severity: number, evidence: Record<string, unknown>) => {
    if (condition) structuralIssues.push({ code, label, severity, evidence });
  };

  const wealthPower = effectivePower[wealthElement];
  const officerPower = effectivePower[officerElement];
  const outputPower = effectivePower[outputElement];
  const resourcePower = effectivePower[resourceElement];
  const peerPower = effectivePower[dayElement];
  pushIssue(effectivePower[strongestElement] / totalPower >= 0.36, "element_excess", "한쪽 오행 과다", 2, { element: strongestElement, ratio: round2(effectivePower[strongestElement] / totalPower) });
  ELEMENTS.forEach((element) => pushIssue(effectivePower[element] < 0.25, "element_missing", "특정 오행 완전 결핍", 2, { element, power: round2(effectivePower[element]) }));
  pushIssue(dayMasterStrength === "과약", "day_master_overweak", "일간 과약", 3, { strengthIndex: round2(strengthIndex) });
  pushIssue(dayMasterStrength === "과왕", "day_master_overstrong", "일간 과왕", 3, { strengthIndex: round2(strengthIndex) });
  pushIssue(wealthPower / totalPower >= 0.25 && strengthIndex < 0.32, "wealth_many_body_weak", "재다신약", 3, { wealthPower: round2(wealthPower), strengthIndex: round2(strengthIndex) });
  pushIssue((visibleTenGods.편관 + hiddenTenGods.편관 > 0.45) && (visibleTenGods.정관 + hiddenTenGods.정관 > 0.45), "mixed_officer_killing", "관살혼잡", 2, { directOfficer: round2(visibleTenGods.정관 + hiddenTenGods.정관), sevenKilling: round2(visibleTenGods.편관 + hiddenTenGods.편관) });
  pushIssue(outputPower / totalPower >= 0.28, "output_excess", "식상과다", 2, { outputPower: round2(outputPower) });
  pushIssue(resourcePower / totalPower >= 0.32, "resource_excess", "인성과다", 2, { resourcePower: round2(resourcePower) });
  pushIssue(peerPower / totalPower >= 0.32, "peer_excess", "비겁과다", 2, { peerPower: round2(peerPower) });
  pushIssue(Math.abs(climate.temperature) >= 1.2 || climate.humidity >= 1.25 || climate.dryness >= 1.25, "johu_imbalance", "조후 불균형", 3, { climate: normalizedClimate, urgentElement });
  pushIssue(usefulElements.some((element) => effectivePower[element] < 0.35), "useful_damaged", "용신 파손", 3, { usefulElements, effectivePower: roundScores(effectivePower), interactionDelta: roundScores(interactions.delta) });
  pushIssue(!usefulElements.includes(strongestElement) && effectivePower[strongestElement] / totalPower >= 0.34, "unfavorable_activated", "기신 발동", 2, { element: strongestElement, ratio: round2(effectivePower[strongestElement] / totalPower) });
  pushIssue(interactions.stemRelations.some((row) => {
    const stems = row.stems as StemKr[];
    const target = row.element as ElementKey;
    return stems.some((stem) => usefulElements.includes(STEM_ELEMENT[stem])) && !usefulElements.includes(target);
  }), "stem_combination_removal", "합거", 2, { stemRelations: interactions.stemRelations });
  pushIssue(interactions.branchRelations.some((row) => row.type === "충발"), "clash_trigger", "충발", 2, { branchRelations: interactions.branchRelations.filter((row) => row.type === "충발") });
  pushIssue(interactions.punishments.length > 0, "punishment", "형살", 2, { punishments: interactions.punishments });
  pushIssue(Boolean((doChungAnalysis.candidates as Array<unknown>).length), "remote_clash", "도충", 3, { doChung: doChungAnalysis.candidates });
  pushIssue(Boolean((combinationClashAnalysis.requiredOutputRows as Array<unknown>).length), "combination_clash_shift", "합화·합거·충 변이", 2, {
    rows: combinationClashAnalysis.requiredOutputRows,
  });
  pushIssue(Boolean(earthStorageAnalysis.overburdened), "earth_storage_overburden", "진술축미 토창고 과중", 3, {
    earthMarkers: earthStorageAnalysis.earthMarkers,
    disposition: earthStorageAnalysis.earthDisposition,
    prescription: earthStorageAnalysis.developmentPrescription,
  });
  const scoringAnalysis = buildScoringAnalysis(
    pillars,
    dayStem,
    dayMasterStrength,
    strengthIndex,
    effectivePower,
    normalizedClimate,
    visibleTenGods,
    hiddenTenGods,
    usefulElements,
    gyeokgukAnalysis,
    yongshinAnalysis,
    combinationClashAnalysis,
    doChungAnalysis,
    earthStorageAnalysis,
    hiddenStemActivation,
    daewoonAnalysis,
    careerAnalysis,
    loveMarriageAnalysis,
    shinsalAnalysis,
    structuralIssues,
    luckRows,
  );

  return {
    dayMaster: {
      stem: dayStem,
      element: dayElement,
      elementKo: ELEMENT_KO[dayElement],
      polarity: getStemPolarity(dayStem),
      strength: dayMasterStrength,
      strengthIndex: round2(strengthIndex),
      allTenGodsRebasedToDayMaster: true,
    },
    monthCommand: {
      branch: pillars.month.branch,
      season: season.season,
      commandingElement: season.dominantElement,
      commandingElementKo: ELEMENT_KO[season.dominantElement],
      priority: "월령은 신강/신약, 격국, 조후, 용신 판단의 최우선 근거",
      hiddenStems: HIDDEN_STEMS_BY_BRANCH[pillars.month.branch].map((row) => ({ ...row, tenGod: tenGodForStem(dayStem, row.stem) })),
      monthSupport,
    },
    fiveElements: {
      simpleCounts: {
        heavenlyStems: roundScores(heavenlyStems),
        branchMainQi: roundScores(branchMainQi),
        hiddenStems: roundScores(hiddenStems),
      },
      basePower: roundScores(basePower),
      seasonalWeights: roundScores(season.weights),
      interactionDelta: roundScores(interactions.delta),
      effectivePower: roundScores(effectivePower),
      ranking: [...ELEMENTS].sort((a, b) => effectivePower[b] - effectivePower[a]).map((element) => ({ element, elementKo: ELEMENT_KO[element], power: round2(effectivePower[element]) })),
      rootAndProtrusionApplied: true,
    },
    tenGods: {
      visible: roundScores(visibleTenGods),
      hidden: roundScores(hiddenTenGods),
      monthHiddenProtruded: roundScores(monthHiddenProtruded),
      protrusions,
      activatedByLuck: {
        status: luckRows.length ? "calculated" : "not_supplied",
        rows: luckRows,
      },
    },
    hiddenStemActivation,
    earthStorageAnalysis,
    doChungAnalysis,
    combinationClashAnalysis,
    gyeokgukAnalysis,
    yongshinAnalysis,
    daewoonAnalysis,
    luckInteractionDetailAnalysis,
    transformationTimingAnalysis,
    personalityAnalysis,
    careerAnalysis,
    loveMarriageAnalysis,
    shinsalAnalysis,
    scoringAnalysis,
    rooting: {
      rooted: rootingRows.some((row) => row.score > 0.45),
      strongRooted: rootingRows.some((row) => row.score >= 1.3),
      rows: rootingRows,
      monthBranchSupport: monthSupport,
      weightedPriority: "월지 > 일지 > 시지 > 년지",
    },
    johu: {
      climate: normalizedClimate,
      urgentElement,
      urgentElementKo: ELEMENT_KO[urgentElement],
      priorityOverSuppressing: (Math.abs(climate.temperature) >= 1.2 || climate.humidity >= 1.25 || climate.dryness >= 1.25) && !suppressingUseful.includes(urgentElement),
    },
    structuralIssues,
    usefulElements: {
      suppressingUseful,
      johuUseful: urgentElement,
      finalPriority: usefulElements,
      finalPriorityKo: usefulElements.map((element) => ELEMENT_KO[element]),
    },
    evidence: {
      interactions: {
        branchRelations: interactions.branchRelations,
        stemRelations: interactions.stemRelations,
        punishments: interactions.punishments,
        doChung: interactions.doChung,
      },
      relationRulesApplied: ["합화", "충", "형", "파", "해", "도충"],
    },
  };
}

function asReportRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asReportRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((row) => row && typeof row === "object") as Array<Record<string, unknown>> : [];
}

function displayValue(value: unknown, fallback = "해당 없음"): string {
  if (value === null || value === undefined || value === "") return fallback;
  if (Array.isArray(value)) return value.length ? value.map((row) => displayValue(row, "")).filter(Boolean).join(" / ") : fallback;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.ganji) return String(record.ganji);
    if (record.label) return String(record.label);
    if (record.name) return String(record.name);
    if (record.elementKo) return String(record.elementKo);
    return JSON.stringify(record);
  }
  return String(value);
}

function pillarText(pillar: SajuPillarLocal | null | undefined): string {
  return pillar ? `${pillar.ganji}(${pillar.stem}${pillar.branch})` : "출생 시각 미입력으로 시주 미산출";
}

function rowSummary(rows: Array<Record<string, unknown>>, keys: string[], fallback: string, limit = 4): string {
  if (!rows.length) return fallback;
  return rows.slice(0, limit).map((row) => keys.map((key) => displayValue(row[key], "")).filter(Boolean).join(" ")).filter(Boolean).join(" / ") || fallback;
}

function reportSection(index: number, title: string, entries: Array<Record<string, unknown>>) {
  return { index, title, entries };
}

function renderFinalReportMarkdown(title: string, sections: Array<Record<string, unknown>>): string {
  return [
    `[${title}]`,
    ...sections.flatMap((section) => [
      "",
      `${section.index}. ${section.title}`,
      ...asReportRows(section.entries).map((entry) => {
        const label = displayValue(entry.label, "");
        const value = displayValue(entry.value, "");
        const why = displayValue(entry.why, "");
        const action = displayValue(entry.action, "");
        return `- ${label}: ${[value, why && `근거: ${why}`, action && `처방: ${action}`].filter(Boolean).join(" ")}`;
      }),
    ]),
  ].join("\n");
}

const QUANTUM_MYEONGRI_ENGINE_VERSION = "QUANTUM_MYEONGRI_ENGINE_V2";
const QUANTUM_MYEONGRI_PRICE_COINS = 100;

function formatInputDate(input: LocalSajuInput): string {
  return `${input.year}-${String(input.month).padStart(2, "0")}-${String(input.day).padStart(2, "0")}`;
}

function formatInputTime(input: LocalSajuInput): string {
  if (!input.hasTime) return "";
  return `${String(Number(input.hour || 0)).padStart(2, "0")}:${String(Number(input.minute || 0)).padStart(2, "0")}`;
}

function flattenReportRowGroups(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return asReportRows(value);
  const record = asReportRecord(value);
  return Object.values(record).flatMap((row) => asReportRows(row));
}

function pickReportRows(record: Record<string, unknown>, keys: string[]): Array<Record<string, unknown>> {
  for (const key of keys) {
    const rows = asReportRows(record[key]);
    if (rows.length) return rows;
  }
  return [];
}

function scoreItem(scoringItems: Array<Record<string, unknown>>, key: string): Record<string, unknown> {
  return scoringItems.find((row) => row.key === key) || {};
}

function scoreNumber(scoringItems: Array<Record<string, unknown>>, key: string, fallback = 0): number {
  const value = Number(scoreItem(scoringItems, key).score);
  return Number.isFinite(value) ? value : fallback;
}

function calculationConfidenceScore(input: LocalSajuInput, solarTermBoundary: LocalSajuResult["solarTermBoundary"], trueSolarTimeUsed: boolean): number {
  const activeSource = String(solarTermBoundary.active?.source || "");
  let score = activeSource === "fixed-fallback" ? 72 : 88;
  if (input.hasTime) score += 5;
  else score -= 8;
  if (trueSolarTimeUsed) score += 4;
  else if (resolveHourPillarTimePolicy(input) !== "KST_CLOCK_TIME") score -= 4;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function structuredPillar(pillar: SajuPillarLocal | null | undefined, dayStem: StemKr, dayMaster = false): Record<string, unknown> {
  if (!pillar) {
    return {
      stem: "",
      branch: "",
      tenGod: "",
      hiddenStems: [],
      timeUnknown: true,
    };
  }

  return {
    stem: pillar.stem,
    branch: pillar.branch,
    ...(dayMaster ? { dayMaster: true } : { tenGod: tenGodForStem(dayStem, pillar.stem) }),
    hiddenStems: HIDDEN_STEMS_BY_BRANCH[pillar.branch].map((hidden) => ({
      stem: hidden.stem,
      tenGod: tenGodForStem(dayStem, hidden.stem),
      element: STEM_ELEMENT[hidden.stem],
      elementKo: ELEMENT_KO[STEM_ELEMENT[hidden.stem]],
      weight: hidden.weight,
    })),
  };
}

function buildStructuredAdvancedReport(args: {
  input: LocalSajuInput;
  pillars: LocalSajuResult["pillars"];
  solarTermBoundary: LocalSajuResult["solarTermBoundary"];
  daewoonStart: DaewoonStartLocal;
  daewoonDirection: "forward" | "reverse" | "unknown";
  timezone: string;
  trueSolarTimeUsed: boolean;
  natalAnalysis: NatalAnalysisLocal;
  finalAdvancedReport: Record<string, unknown>;
}) {
  const { input, pillars, solarTermBoundary, daewoonStart, daewoonDirection, timezone, trueSolarTimeUsed, natalAnalysis, finalAdvancedReport } = args;
  const dayStem = pillars.day.stem;
  const dayMaster = asReportRecord(natalAnalysis.dayMaster);
  const monthCommand = asReportRecord(natalAnalysis.monthCommand);
  const rooting = asReportRecord(natalAnalysis.rooting);
  const johu = asReportRecord(natalAnalysis.johu);
  const gyeokguk = asReportRecord(natalAnalysis.gyeokgukAnalysis);
  const yongshin = asReportRecord(natalAnalysis.yongshinAnalysis);
  const hiddenStemActivation = asReportRecord(natalAnalysis.hiddenStemActivation);
  const earthStorage = asReportRecord(natalAnalysis.earthStorageAnalysis);
  const doChung = asReportRecord(natalAnalysis.doChungAnalysis);
  const combinationClash = asReportRecord(natalAnalysis.combinationClashAnalysis);
  const daewoon = asReportRecord(natalAnalysis.daewoonAnalysis);
  const tenGods = asReportRecord(natalAnalysis.tenGods);
  const luckRows = asReportRows(asReportRecord(tenGods.activatedByLuck).rows);
  const currentAnnual = luckRows.find((row) => row.scope === "annual") || {};
  const monthlyHighlights = luckRows.filter((row) => row.scope === "monthly");
  const luckInteraction = asReportRecord(natalAnalysis.luckInteractionDetailAnalysis);
  const annualDetail = asReportRecord(luckInteraction.annualEventTrigger);
  const integratedLuck = asReportRecord(luckInteraction.integratedFinalReading);
  const transformation = asReportRecord(natalAnalysis.transformationTimingAnalysis);
  const personality = asReportRecord(natalAnalysis.personalityAnalysis);
  const career = asReportRecord(natalAnalysis.careerAnalysis);
  const loveMarriage = asReportRecord(natalAnalysis.loveMarriageAnalysis);
  const scoring = asReportRecord(natalAnalysis.scoringAnalysis);
  const scoringItems = asReportRows(scoring.items);
  const doChungCandidate = asReportRows(doChung.candidates)[0] || {};
  const repeatedBranch = doChungCandidate.repeatedBranch as BranchKr | undefined;
  const inducedBranch = doChungCandidate.inducedOppositeBranch as BranchKr | undefined;
  const finalSections = asReportRows(finalAdvancedReport.sections);
  const actionSection = finalSections.find((section) => Number(section.index) === 15);
  const earthRows = asReportRows(earthStorage.rows);
  const combinationRows = [
    ...asReportRows(combinationClash.stemCombinations),
    ...asReportRows(combinationClash.branchCombinations),
    ...asReportRows(combinationClash.groupCombinations),
    ...asReportRows(combinationClash.directionalCombinations),
    ...asReportRows(combinationClash.requiredOutputRows),
  ];
  const clashRows = asReportRows(combinationClash.requiredOutputRows).filter((row) => displayValue(row.relationType, "").includes("충") || displayValue(row.type, "").includes("충"));

  return {
    metadata: {
      engineVersion: QUANTUM_MYEONGRI_ENGINE_VERSION,
      priceCoins: QUANTUM_MYEONGRI_PRICE_COINS,
      calculatedAt: new Date().toISOString(),
      timezone,
      trueSolarTimeUsed,
      calculationConfidence: calculationConfidenceScore(input, solarTermBoundary, trueSolarTimeUsed),
    },
    input: {
      birthDate: formatInputDate(input),
      birthTime: formatInputTime(input),
      birthPlace: input.birthplace || "",
      calendarType: input.calendarType || "solar",
      gender: normalizeGender(input),
    },
    fourPillars: {
      year: structuredPillar(pillars.year, dayStem),
      month: structuredPillar(pillars.month, dayStem),
      day: structuredPillar(pillars.day, dayStem, true),
      hour: structuredPillar(pillars.hour, dayStem),
    },
    strengthAnalysis: {
      dayMasterStrength: displayValue(dayMaster.strength, ""),
      seasonalSupport: displayValue(monthCommand.monthSupport ? "월령 조력 있음" : "월령 조력 약함", ""),
      rootSupport: rowSummary(asReportRows(rooting.rows), ["pillar", "branch", "score"], "통근 근거 없음"),
      stemSupport: displayValue(asReportRecord(natalAnalysis.tenGods).visible, ""),
      overallScore: scoreNumber(scoringItems, "dayMasterStrength"),
    },
    climateAnalysis: {
      temperature: displayValue(johu.climate, ""),
      humidity: displayValue(johu.climate, ""),
      dryness: displayValue(johu.climate, ""),
      primaryClimateIssue: displayValue(johu.climate, ""),
      climateYongshin: displayValue(johu.urgentElementKo, ""),
    },
    gyeokguk: {
      primary: displayValue(gyeokguk.finalGyeokguk, ""),
      candidates: asReportRows(gyeokguk.candidates),
      reasoning: displayValue(asReportRecord(gyeokguk.requiredOutput).reason || gyeokguk.reasoning, ""),
      brokenElements: pickReportRows(gyeokguk, ["brokenElements", "breakingFactors", "pagyeokFactors"]),
      supportingElements: pickReportRows(gyeokguk, ["supportingElements", "supportFactors", "sangshinFactors"]),
    },
    yongshin: {
      primary: displayValue(yongshin.coreYongshinKo, ""),
      secondary: displayValue(yongshin.auxiliaryYongshinKo, ""),
      huishin: yongshin.heesinKo || [],
      gishin: yongshin.gisinKo || [],
      gushin: yongshin.gusinKo || [],
      hanshin: yongshin.hansinKo || [],
      reasoning: displayValue(asReportRecord(yongshin.requiredExplanation).whyThisElement || yongshin.reasoning, ""),
    },
    hiddenStemAnalysis: {
      monthBranchHiddenStems: asReportRows(monthCommand.hiddenStems),
      revealedHiddenStems: asReportRows(hiddenStemActivation.protruded),
      strongRevealedStars: asReportRows(hiddenStemActivation.protruded).filter((row) => displayValue(row.strength, "") !== "미투간"),
      latentPotentials: flattenReportRowGroups(hiddenStemActivation.hidden),
    },
    earthStorageAnalysis: {
      hasChenXuChouWei: earthRows.length > 0,
      storageBranches: earthRows,
      mentalPressureLevel: Number(earthStorage.overburdened ? 85 : Math.min(70, earthRows.length * 25)),
      hiddenPotential: earthRows.flatMap((row) => asReportRows(row.hiddenStems)).filter((row) => displayValue(row.usefulState, "").includes("용신") || displayValue(row.usefulState, "").includes("잠재")),
      storageOpeningPeriods: earthRows.flatMap((row) => asReportRows(asReportRecord(row.storageOpening).suppliedLuckMatches)),
    },
    dochungAnalysis: {
      activated: Object.keys(doChungCandidate).length > 0,
      repeatedBranch: displayValue(doChungCandidate.repeatedBranch, ""),
      count: Number(doChungCandidate.totalCount || doChungCandidate.count || 0),
      inducedOppositeBranch: displayValue(doChungCandidate.inducedOppositeBranch, ""),
      beforeElement: repeatedBranch ? BRANCH_MAIN_ELEMENT[repeatedBranch] : "",
      afterElement: inducedBranch ? BRANCH_MAIN_ELEMENT[inducedBranch] : "",
      beforeTenGod: repeatedBranch ? tenGodForStem(dayStem, getMainHiddenStem(repeatedBranch)) : "",
      afterTenGod: inducedBranch ? tenGodForStem(dayStem, getMainHiddenStem(inducedBranch)) : "",
      yongshinGishinShift: displayValue(doChungCandidate.classification, ""),
      interpretation: displayValue(doChungCandidate.lifeEvent || doChungCandidate.interpretation, ""),
    },
    combinationTransformation: {
      heavenlyStemCombinations: asReportRows(combinationClash.stemCombinations),
      earthlyBranchCombinations: [
        ...asReportRows(combinationClash.branchCombinations),
        ...asReportRows(combinationClash.groupCombinations),
        ...asReportRows(combinationClash.directionalCombinations),
      ],
      successfulTransformations: combinationRows.filter((row) => displayValue(row.resultType, "").includes("합화") || row.transformationSuccess === true),
      failedTransformations: combinationRows.filter((row) => displayValue(row.resultType, "").includes("합반") || displayValue(row.resultType, "").includes("실패")),
      hapgeoCases: combinationRows.filter((row) => displayValue(row.resultType, "").includes("합거")),
      goodToBadShifts: asReportRows(transformation.yongshinToGisin),
      badToGoodShifts: asReportRows(transformation.gisinToYongshin),
    },
    clashAnalysis: {
      clashes: clashRows,
      usefulClashes: clashRows.filter((row) => displayValue(row.usefulUnfavorableShift, "").includes("기신") || displayValue(row.changedState, "").includes("길")),
      harmfulClashes: clashRows.filter((row) => displayValue(row.usefulUnfavorableShift, "").includes("용신") || displayValue(row.changedState, "").includes("흉")),
      yongshinDamages: clashRows.filter((row) => displayValue(row.usefulUnfavorableShift, "").includes("용신")),
      gishinRemovals: clashRows.filter((row) => displayValue(row.usefulUnfavorableShift, "").includes("기신")),
    },
    daewoon: {
      current: asReportRecord(daewoon.currentDaewoon),
      direction: daewoonDirection,
      startAge: daewoonStart.age ?? 0,
      periods: asReportRows(daewoon.periods).length ? asReportRows(daewoon.periods) : luckRows.filter((row) => row.scope === "daewoon"),
      currentAnalysis: displayValue(daewoon.summary || asReportRecord(daewoon.requiredOutput).totalReview, ""),
    },
    sewoon: {
      currentYear: currentAnnual,
      analysis: displayValue(annualDetail.finalClassification || integratedLuck.annualEvent, ""),
      monthlyHighlights,
    },
    lifeDomains: {
      personality: displayValue(personality.outwardDisposition || personality.innerWorld, ""),
      career: displayValue(career.immediateCareerStrategy || career.monetizableAbility, ""),
      wealth: displayValue(career.investmentWealthManagementStyle || scoreItem(scoringItems, "wealthFortune").naturalReason, ""),
      romance: displayValue(loveMarriage.loveStyle || loveMarriage.relationshipPrescription, ""),
      healthMind: displayValue(scoreItem(scoringItems, "healthPsychPressure").naturalReason, ""),
      relationships: displayValue(personality.relationshipWeakness || loveMarriage.recurringRelationshipProblem, ""),
    },
    actionPrescription: asReportRows(asReportRecord(actionSection).entries),
    userReport: {
      title: finalAdvancedReport.title || "QUANTUM MYEONGRI Engine v.2 고급 분석 리포트",
      markdown: finalAdvancedReport.markdown || "",
      sections: finalAdvancedReport.sections || [],
    },
  };
}

function buildFinalAdvancedReport(args: {
  input: LocalSajuInput;
  pillars: LocalSajuResult["pillars"];
  solarTermBoundary: LocalSajuResult["solarTermBoundary"];
  daewoonStart: DaewoonStartLocal;
  daewoonDirection: "forward" | "reverse" | "unknown";
  timezone: string;
  trueSolarTimeUsed: boolean;
  natalAnalysis: NatalAnalysisLocal;
}) {
  const { input, pillars, solarTermBoundary, daewoonStart, daewoonDirection, timezone, trueSolarTimeUsed, natalAnalysis } = args;
  const dayMaster = asReportRecord(natalAnalysis.dayMaster);
  const monthCommand = asReportRecord(natalAnalysis.monthCommand);
  const fiveElements = asReportRecord(natalAnalysis.fiveElements);
  const tenGods = asReportRecord(natalAnalysis.tenGods);
  const hiddenStemActivation = asReportRecord(natalAnalysis.hiddenStemActivation);
  const earthStorage = asReportRecord(natalAnalysis.earthStorageAnalysis);
  const doChung = asReportRecord(natalAnalysis.doChungAnalysis);
  const combinationClash = asReportRecord(natalAnalysis.combinationClashAnalysis);
  const gyeokguk = asReportRecord(natalAnalysis.gyeokgukAnalysis);
  const yongshin = asReportRecord(natalAnalysis.yongshinAnalysis);
  const daewoon = asReportRecord(natalAnalysis.daewoonAnalysis);
  const luckInteraction = asReportRecord(natalAnalysis.luckInteractionDetailAnalysis);
  const transformation = asReportRecord(natalAnalysis.transformationTimingAnalysis);
  const personality = asReportRecord(natalAnalysis.personalityAnalysis);
  const career = asReportRecord(natalAnalysis.careerAnalysis);
  const loveMarriage = asReportRecord(natalAnalysis.loveMarriageAnalysis);
  const shinsal = asReportRecord(natalAnalysis.shinsalAnalysis);
  const scoring = asReportRecord(natalAnalysis.scoringAnalysis);
  const johu = asReportRecord(natalAnalysis.johu);
  const usefulElements = asReportRecord(natalAnalysis.usefulElements);
  const luckRows = asReportRows(asReportRecord(tenGods.activatedByLuck).rows);
  const daewoonRows = luckRows.filter((row) => row.scope === "daewoon");
  const annualRows = luckRows.filter((row) => row.scope === "annual");
  const monthlyRows = luckRows.filter((row) => row.scope === "monthly");
  const currentAnnual = annualRows[0];
  const luckDaewoonDetail = asReportRecord(luckInteraction.daewoonFoundation);
  const luckAnnualDetail = asReportRecord(luckInteraction.annualEventTrigger);
  const luckIntegratedReading = asReportRecord(luckInteraction.integratedFinalReading);
  const activeSource = solarTermBoundary.active?.source || "fixed-fallback";
  const calculationConfidence = activeSource === "fixed-fallback"
    ? "중간: 절기 fallback 근거를 함께 확인해야 한다"
    : input.hasTime === false
      ? "중상: 절기 기준은 확보되었으나 출생 시각 미입력으로 시주 판단은 제한된다"
      : trueSolarTimeUsed || resolveHourPillarTimePolicy(input) === "KST_CLOCK_TIME"
        ? "상: 절기·시간대 기준이 확보되었다"
        : "중상: 절기 기준은 확보되었으나 출생지 좌표가 없어 시주 시각 보정을 적용하지 못했다";
  const scoringItems = asReportRows(scoring.items);
  const scoreOf = (key: string) => scoringItems.find((row) => row.key === key);
  const helpfulTransforms = asReportRows(transformation.gisinToYongshin);
  const riskyTransforms = asReportRows(transformation.yongshinToGisin);
  const opportunityTransforms = asReportRows(transformation.potentialOpening);
  const collapseTransforms = asReportRows(transformation.structureCollapse);
  const title = localSajuCalculatorText("lsc_4823_attr_title");

  const sections = [
    reportSection(1, "계산 기준 요약", [
      { label: localSajuCalculatorText("lsc_4827_prop_label"), value: input.calendarType === "lunar" ? `음력 입력을 양력 기준으로 변환${input.lunarLeap ? "했고 윤달 정보를 반영" : ""}` : "양력 입력 기준", why: "원국은 실제 태양력 날짜와 절기 경계를 기준으로 재산출한다." },
      { label: localSajuCalculatorText("lsc_4828_prop_label"), value: "사용", why: `년주는 입춘, 월주는 절입 기준이며 현재 절기 근거는 ${activeSource}이다.` },
      { label: localSajuCalculatorText("lsc_4829_prop_label"), value: timezone, why: "일주 경계와 시주는 출생지 시간대를 기준으로 판단한다." },
      { label: localSajuCalculatorText("lsc_4830_prop_label"), value: trueSolarTimeUsed ? "사용" : "미사용", why: !trueSolarTimeUsed ? "좌표 또는 옵션 조건이 충족되지 않아 표준시 기준으로 산출했다." : resolveHourPillarTimePolicy(input) === "TRUE_SOLAR_TIME" ? "출생지 경도와 균시차를 반영했다." : "출생지 경도를 반영했다(평균태양시)." },
      { label: localSajuCalculatorText("lsc_4831_prop_label"), value: daewoonStart.age ?? "미산출", why: "절입 시각까지의 시간 차이를 전통 환산법으로 나누었다." },
      { label: localSajuCalculatorText("lsc_4832_prop_label"), value: daewoonDirection, why: "양남음녀 순행, 음남양녀 역행 원칙을 기본값으로 적용했다." },
      { label: localSajuCalculatorText("lsc_4833_prop_label"), value: calculationConfidence, why: "절기 소스, 출생 시각, 진태양시 보정 여부를 함께 본다." },
    ]),
    reportSection(2, "사주 원국", [
      { label: "년주", value: pillarText(pillars.year), why: "입춘 이전 출생이면 전년도 년주로 넘기는 절기 기준이다." },
      { label: "월주", value: pillarText(pillars.month), why: "월령은 음력 월이 아니라 24절기 절입 기준으로 잡았다." },
      { label: "일주", value: pillarText(pillars.day), why: "일간은 전체 십성 판단의 중심이다." },
      { label: "시주", value: pillarText(pillars.hour), why: "출생 시각과 진태양시 옵션을 반영한다." },
      { label: localSajuCalculatorText("lsc_4840_prop_label"), value: `${displayValue(dayMaster.stem)} ${displayValue(dayMaster.elementKo)}`, why: `현재 강약은 ${displayValue(dayMaster.strength)}로 판정된다.` },
      { label: localSajuCalculatorText("lsc_4841_prop_label"), value: `${displayValue(monthCommand.branch)} ${displayValue(monthCommand.season)}`, why: displayValue(monthCommand.priority) },
      { label: localSajuCalculatorText("lsc_4842_prop_label"), value: rowSummary(asReportRows(monthCommand.hiddenStems), ["stem", "tenGod"], "월지 지장간 없음"), why: "월지 지장간은 격국과 현실 작용력의 핵심 재료다." },
      { label: localSajuCalculatorText("lsc_4843_prop_label"), value: `천간 ${displayValue(tenGods.visible)} / 지장간 ${displayValue(tenGods.hidden)}`, why: "드러난 십성과 숨은 십성을 분리해 본다." },
      { label: localSajuCalculatorText("lsc_4844_prop_label"), value: rowSummary(asReportRows(fiveElements.ranking), ["elementKo", "power"], "오행 분포 없음", 5), why: "단순 개수보다 계절 가중치, 투간, 합충 변화를 반영한 실제 세력이다." },
      { label: localSajuCalculatorText("lsc_4845_prop_label"), value: `${displayValue(johu.urgentElementKo)} 필요`, why: `기후값 ${displayValue(johu.climate)}를 기준으로 가장 급한 조후를 잡았다.` },
    ]),
    reportSection(3, "원국 핵심 진단", [
      { label: localSajuCalculatorText("lsc_4848_prop_label"), value: displayValue(dayMaster.strength), why: displayValue(scoreOf("dayMasterStrength")?.naturalReason) },
      { label: localSajuCalculatorText("lsc_4849_prop_label"), value: displayValue(johu.urgentElementKo), why: displayValue(scoreOf("johuBalance")?.naturalReason) },
      { label: localSajuCalculatorText("lsc_4850_prop_label"), value: displayValue(gyeokguk.finalGyeokguk), why: displayValue(asReportRecord(gyeokguk.requiredOutput).reason) },
      { label: localSajuCalculatorText("lsc_4851_prop_label"), value: displayValue(yongshin.coreYongshinKo), why: displayValue(asReportRecord(yongshin.requiredExplanation).whyThisElement) },
      { label: localSajuCalculatorText("lsc_4852_prop_label"), value: displayValue(yongshin.heesinKo), why: "핵심 용신을 돕거나 흐름을 부드럽게 이어 주는 보조 기운이다." },
      { label: localSajuCalculatorText("lsc_4853_prop_label"), value: displayValue(yongshin.gisinKo), why: displayValue(scoreOf("gisinRisk")?.naturalReason) },
      { label: localSajuCalculatorText("lsc_4854_prop_label"), value: displayValue(yongshin.gusinKo), why: "기신을 돕는 배후 기운으로 과해지면 구조적 부담을 키운다." },
      { label: localSajuCalculatorText("lsc_4855_prop_label"), value: displayValue(asReportRecord(yongshin.disease).name), why: displayValue(asReportRecord(yongshin.disease).reason) },
      { label: localSajuCalculatorText("lsc_4856_prop_label"), value: displayValue((asReportRecord(yongshin.disease).medicineElements as unknown[] | undefined)?.map((element) => ELEMENT_KO[element as ElementKey])), why: "병을 치료하는 오행이 실제 처방의 핵심이다." },
      { label: localSajuCalculatorText("lsc_4857_prop_label"), value: displayValue(scoring.naturalSummary), why: "18개 판별 점수를 숫자보다 자연어 근거 중심으로 요약했다." },
    ]),
    reportSection(4, "지장간·투간 분석", [
      { label: localSajuCalculatorText("lsc_4860_prop_label"), value: rowSummary(asReportRows(asReportRecord(hiddenStemActivation.monthHiddenStemProtrusion).hiddenStems), ["stem", "tenGod", "strength"], "월지 투간 없음"), why: "월령에서 천간으로 드러난 글자는 현실 작용력이 강하다." },
      { label: localSajuCalculatorText("lsc_4861_prop_label"), value: rowSummary(asReportRows(hiddenStemActivation.protruded), ["pillar", "branch", "stem", "tenGod"], "투출 없음"), why: "투출된 지장간은 성격·직업·재물·연애의 실제 사건으로 올라온다." },
      { label: localSajuCalculatorText("lsc_4862_prop_label"), value: displayValue(asReportRecord(hiddenStemActivation.monthHiddenStemProtrusion).summary), why: "월지 내용물이 천간으로 드러나는지 보아 재능의 표면화를 본다." },
      { label: localSajuCalculatorText("lsc_4863_prop_label"), value: rowSummary(asReportRows(hiddenStemActivation.hidden), ["branch", "stem", "tenGod"], "강하게 억눌린 지장간 표시 없음"), why: "숨은 십성은 운에서 같은 글자가 오거나 충합으로 열릴 때 사건화된다." },
      { label: localSajuCalculatorText("lsc_4864_prop_label"), value: rowSummary(asReportRows(asReportRecord(hiddenStemActivation.luckAmplification).rows), ["scope", "label", "effect"], "입력 운에서 직접 확인되지 않음"), why: "같은 글자, 합, 충이 들어올 때 지장간이 열린다." },
    ]),
    reportSection(5, "진술축미·창고 분석", [
      { label: localSajuCalculatorText("lsc_4867_prop_label"), value: earthStorage.overburdened ? "과중" : "과중 아님", why: displayValue(earthStorage.earthDisposition) },
      { label: localSajuCalculatorText("lsc_4868_prop_label"), value: displayValue(earthStorage.pressureReading), why: "辰戌丑未는 단순 토가 아니라 책임과 감정의 저장고로 본다." },
      { label: localSajuCalculatorText("lsc_4869_prop_label"), value: displayValue(earthStorage.usefulReading), why: "창고 속 지장간이 용신이면 충이 오히려 자원 개방이 된다." },
      { label: localSajuCalculatorText("lsc_4870_prop_label"), value: rowSummary(asReportRows(earthStorage.openingTiming), ["scope", "label", "relation"], "직접 매칭 없음"), why: "진술충·축미충과 운의 합충을 창고 개방 신호로 본다." },
      { label: localSajuCalculatorText("lsc_4871_prop_label"), value: rowSummary(asReportRows(earthStorage.riskTiming), ["scope", "label", "risk"], "직접 위험 매칭 없음"), why: "창고 속 기신이 열리면 압박과 문제 노출로 나타난다." },
    ]),
    reportSection(6, "도충 분석", [
      { label: localSajuCalculatorText("lsc_4874_prop_label"), value: rowSummary(asReportRows(doChung.candidates), ["repeatedBranch", "totalCount"], "도충 후보 없음"), why: "같은 지지가 3개 수준으로 중첩될 때 과포화가 발생한다." },
      { label: localSajuCalculatorText("lsc_4875_prop_label"), value: rowSummary(asReportRows(doChung.candidates), ["inducedOppositeBranch", "inducedTenGod"], "반대 지지 유도 없음"), why: "도충은 단순 강화가 아니라 반대편 충 글자를 불러오는 구조다." },
      { label: localSajuCalculatorText("lsc_4876_prop_label"), value: rowSummary(asReportRows(doChung.candidates), ["classification"], "변화 없음"), why: displayValue(scoreOf("doChungActivation")?.naturalReason) },
      { label: localSajuCalculatorText("lsc_4877_prop_label"), value: rowSummary(asReportRows(transformation.gisinToYongshin), ["requiredPhrase", "activationTiming"], "확인된 전환 없음"), why: "기신 과포화가 용신을 유도하면 판이 바뀐다." },
      { label: localSajuCalculatorText("lsc_4878_prop_label"), value: rowSummary(asReportRows(transformation.yongshinToGisin), ["requiredPhrase", "activationTiming"], "확인된 전환 없음"), why: "용신 과포화가 반대 기신을 불러오면 기반이 흔들린다." },
      { label: localSajuCalculatorText("lsc_4879_prop_label"), value: rowSummary(asReportRows(doChung.candidates), ["lifeEvent"], "직접 사건 후보 없음"), why: "직업·재물·연애·이동 사건으로 현실화될 수 있다." },
    ]),
    reportSection(7, "합화·충 변이 분석", [
      { label: localSajuCalculatorText("lsc_4882_prop_label"), value: rowSummary(asReportRows(combinationClash.stemCombinations), ["type", "leftLabel", "rightLabel", "resultType"], "천간합 없음"), why: "계절 지원과 뿌리가 있어야 합화로 본다." },
      { label: localSajuCalculatorText("lsc_4883_prop_label"), value: rowSummary(asReportRows(combinationClash.branchCombinations), ["type", "leftLabel", "rightLabel", "resultType"], "지지합 없음"), why: "합은 길흉이 아니라 무엇을 묶고 무엇으로 변하는지가 핵심이다." },
      { label: localSajuCalculatorText("lsc_4884_prop_label"), value: rowSummary(asReportRows(combinationClash.groupCombinations), ["type", "branches", "changedState"], "삼합 없음"), why: "흩어진 지지가 한 방향으로 모이면 운의 성격이 바뀐다." },
      { label: localSajuCalculatorText("lsc_4885_prop_label"), value: rowSummary(asReportRows(combinationClash.directionalCombinations), ["type", "branches", "changedState"], "방합 없음"), why: "계절 방향성이 모이면 생활권의 기운이 강하게 기울어진다." },
      { label: localSajuCalculatorText("lsc_4886_prop_label"), value: rowSummary(asReportRows(combinationClash.requiredOutputRows), ["relationType", "resultType", "usefulUnfavorableShift"], "직접 변이 없음"), why: displayValue(scoreOf("clashTriggerIntensity")?.naturalReason) },
      { label: localSajuCalculatorText("lsc_4887_prop_label"), value: rowSummary(asReportRows(combinationClash.requiredOutputRows), ["transformationSuccess", "resultType", "usefulUnfavorableShift"], "직접 전환 없음"), why: "합과 충은 용신·기신 변화까지 재계산해야 한다." },
    ]),
    reportSection(8, "현재 대운 분석", [
      { label: localSajuCalculatorText("lsc_4890_prop_label"), value: displayValue(asReportRecord(daewoon.currentDaewoon).label || asReportRecord(daewoon.currentDaewoon).ganji || rowSummary(daewoonRows, ["label", "ganji"], "대운 입력 없음")), why: "대운은 10년짜리 배경 운이다." },
      { label: localSajuCalculatorText("lsc_4891_prop_label"), value: displayValue(luckIntegratedReading.daewoonBase), why: "대운은 단순 길흉이 아니라 천간의 외부 사건성과 지지의 생활권 변화를 분리해 본다." },
      { label: localSajuCalculatorText("lsc_4892_prop_label"), value: rowSummary(asReportRows(luckDaewoonDetail.heavenlyStemCombinationChecks), ["combinationRule", "resultType", "transformedUseState"], "대운 천간의 직접 합화·합거 없음"), why: "원국에 합하는 천간이 실제로 있는지, 합화 조건이 되는지, 안 되면 합거인지까지 본다." },
      { label: localSajuCalculatorText("lsc_4893_prop_label"), value: rowSummary(asReportRows(luckDaewoonDetail.branchHiddenStems), ["stem", "tenGod", "elementKo"], "대운 지장간 없음"), why: "대운 지지의 본기와 지장간이 어떤 십성으로 들어오는지 확인한다." },
      { label: localSajuCalculatorText("lsc_4894_prop_label"), value: rowSummary(asReportRows(luckDaewoonDetail.earthlyBranchRelations), ["luckBranch", "relation", "targetScope", "targetLifeArea"], "대운 지지의 직접 합충형파해 없음"), why: "대운 지지가 원국 어느 궁을 건드리는지에 따라 사건 영역이 달라진다." },
      { label: localSajuCalculatorText("lsc_4895_prop_label"), value: `${rowSummary(asReportRows(luckDaewoonDetail.groupCompletions), ["type", "branches", "targetElement"], "삼합/방합 직접 완성 없음")} / ${rowSummary(asReportRows(luckDaewoonDetail.doChungTriggered), ["repeatedBranch", "classification"], "대운 도충 직접 발동 없음")}`, why: "대운 지지는 10년 환경에서 삼합·도충 조건을 길게 깔아 둔다." },
      { label: localSajuCalculatorText("lsc_4896_prop_label"), value: displayValue(asReportRecord(daewoon.yongshinGisinChange).supportsYongshin), why: "용신을 돕는지 기신을 강화하는지부터 본다." },
      { label: localSajuCalculatorText("lsc_4897_prop_label"), value: `${displayValue(asReportRecord(daewoon.heavenlyStemAnalysis).tenGod)} / ${displayValue(asReportRecord(daewoon.earthlyBranchAnalysis).tenGod)}`, why: "천간은 드러난 사건, 지지는 생활 환경으로 본다." },
      { label: localSajuCalculatorText("lsc_4898_prop_label"), value: displayValue(daewoon.relationSummary), why: "원국 천간·지지와 합충형파해를 비교했다." },
      { label: localSajuCalculatorText("lsc_4899_prop_label"), value: displayValue(daewoon.gyeokgukChange), why: "대운이 격을 살리는지 깨는지 본다." },
      { label: localSajuCalculatorText("lsc_4900_prop_label"), value: displayValue(asReportRecord(daewoon.yongshinGisinChange).result), why: displayValue(scoreOf("daewoonFortune")?.naturalReason) },
      { label: localSajuCalculatorText("lsc_4901_prop_label"), value: displayValue(asReportRecord(daewoon.firstSecondHalf).firstHalf), why: "천간의 사회적 사건성이 먼저 드러난다." },
      { label: localSajuCalculatorText("lsc_4902_prop_label"), value: displayValue(asReportRecord(daewoon.firstSecondHalf).secondHalf), why: "지지의 생활권 변화가 깊게 체감된다." },
      { label: localSajuCalculatorText("lsc_4903_prop_label"), value: displayValue(daewoon.summary), why: "간지와 원국 상호작용을 통합한 판정이다." },
      { label: localSajuCalculatorText("lsc_4904_prop_label"), value: displayValue(daewoon.howToUse), action: "좋은 운은 구조화하고, 불리한 운은 합충이 여는 정리 타이밍으로 쓴다." },
    ]),
    reportSection(9, "현재 세운 분석", [
      { label: localSajuCalculatorText("lsc_4907_prop_label"), value: displayValue(currentAnnual?.label || currentAnnual?.ganji, "세운 입력 없음"), why: "세운은 대운 위에 얹히는 해당 연도의 사건 트리거다." },
      { label: localSajuCalculatorText("lsc_4908_prop_label"), value: displayValue(luckIntegratedReading.annualEvent), why: "세운은 대운의 배경 위에서 실제 사건을 촉발한다." },
      { label: localSajuCalculatorText("lsc_4909_prop_label"), value: rowSummary(asReportRows(luckAnnualDetail.heavenlyStemCombinationChecks), ["combinationRule", "resultType", "transformedUseState"], "세운 천간의 직접 합화·합거 없음"), why: "세운 천간이 원국 천간과 합하는지, 합화가 되는지, 합거로 묶이는지 확인한다." },
      { label: localSajuCalculatorText("lsc_4910_prop_label"), value: rowSummary(asReportRows(luckAnnualDetail.heavenlyStemClashChecks).filter((row) => row.isClash), ["clashRule", "targetScope", "damagesJohuYongshin", "meaning"], "세운 천간충 없음"), why: "천간충이 조후 용신을 건드리면 표면 길운도 몸과 판단에서 흔들릴 수 있다." },
      { label: localSajuCalculatorText("lsc_4911_prop_label"), value: displayValue(luckAnnualDetail.branchSaturation), why: "같은 지지가 원국·대운·세운에서 3개 수준으로 중첩되는지 확인한다." },
      { label: localSajuCalculatorText("lsc_4912_prop_label"), value: displayValue(luckAnnualDetail.finalClassification), why: "용신/기신, 천간충, 도충, 합화 결과를 종합한 사건성 판정이다." },
      { label: localSajuCalculatorText("lsc_4913_prop_label"), value: displayValue(asReportRecord(daewoon.requiredOutput).bestYears || asReportRecord(daewoon.requiredOutput).cautionYears), why: "세운이 대운의 좋은 구조를 완성하는지 깨는지 본다." },
      { label: localSajuCalculatorText("lsc_4914_prop_label"), value: rowSummary(asReportRows(combinationClash.requiredOutputRows).filter((row) => JSON.stringify(row).includes("annual")), ["relationType", "resultType"], "직접 세운 합충 입력 없음"), why: "세운 지지가 원국 궁을 건드리는지를 본다." },
      { label: localSajuCalculatorText("lsc_4915_prop_label"), value: rowSummary(asReportRows(transformation.strongestTransformations), ["category", "activationTiming"], "강한 전환 이벤트 없음"), why: "합충·도충·지장간 개방 중 올해와 겹치는 항목을 우선한다." },
      { label: localSajuCalculatorText("lsc_4916_prop_label"), value: rowSummary(asReportRows(career.annualJobChangePromotionExpansionTiming), ["label", "timingType"], "세운 직업 타이밍 입력 없음"), why: displayValue(scoreOf("careerFortune")?.naturalReason) },
      { label: localSajuCalculatorText("lsc_4917_prop_label"), value: displayValue(scoreOf("wealthFortune")?.naturalReason), why: "재성 자체보다 감당력과 식상생재 흐름을 본다." },
      { label: localSajuCalculatorText("lsc_4918_prop_label"), value: rowSummary(asReportRows(loveMarriage.likelyLoveEventAnnual), ["label", "reason"], "세운 연애 사건 입력 없음"), why: displayValue(scoreOf("loveFortune")?.naturalReason) },
      { label: localSajuCalculatorText("lsc_4919_prop_label"), value: displayValue(scoreOf("healthPsychPressure")?.naturalReason), why: "조후·충·도충·토창고 압박을 함께 본다." },
      { label: localSajuCalculatorText("lsc_4920_prop_label"), value: rowSummary(monthlyRows.filter((row) => displayValue(row.label).includes("주의") || displayValue(row.ganji).includes("충")), ["label", "ganji"], "월운 입력 없음: 원국 용신을 충하는 달을 조심"), why: "월운은 세운의 사건을 단기화한다." },
      { label: localSajuCalculatorText("lsc_4921_prop_label"), value: rowSummary(monthlyRows.filter((row) => displayValue(row.label).includes("기회") || displayValue(row.ganji).includes("합")), ["label", "ganji"], "월운 입력 없음: 용신·희신이 들어오는 달을 기회로 사용"), why: "월운에서 용신이 투출하거나 합으로 살아나면 실행 창이 열린다." },
    ]),
    reportSection(10, "성격 분석", [
      { label: localSajuCalculatorText("lsc_4924_prop_label"), value: displayValue(personality.outwardDisposition), why: "천간에 드러난 십성과 월령의 사회성이 먼저 보인다." },
      { label: localSajuCalculatorText("lsc_4925_prop_label"), value: displayValue(personality.innerWorld), why: "일지와 지장간은 실제 내면과 반복 감정을 보여 준다." },
      { label: localSajuCalculatorText("lsc_4926_prop_label"), value: displayValue(personality.workStrength), why: "가장 강한 십성이 일할 때의 장점으로 나타난다." },
      { label: localSajuCalculatorText("lsc_4927_prop_label"), value: displayValue(personality.relationshipWeakness), why: "강한 십성이 과해질 때 인간관계의 그림자가 된다." },
      { label: localSajuCalculatorText("lsc_4928_prop_label"), value: displayValue(personality.stressReaction), why: "조후 압박, 토다 구조, 합충이 심리 반응을 바꾼다." },
      { label: localSajuCalculatorText("lsc_4929_prop_label"), value: displayValue(personality.repeatingLifePattern), why: "도충·합충·강한 십성의 반복을 함께 본다." },
      { label: localSajuCalculatorText("lsc_4930_prop_label"), value: displayValue(personality.improvementPoint), action: "강한 십성을 억누르지 말고 건강한 출구로 반복 사용한다." },
    ]),
    reportSection(11, "진로·재물 분석", [
      { label: localSajuCalculatorText("lsc_4933_prop_label"), value: rowSummary(asReportRows(career.bestFitJobGroups), ["elementKo", "jobGroups"], "직업군 미산출"), why: "격국·용신·강한 십성·월지/시지 직업성을 종합했다." },
      { label: localSajuCalculatorText("lsc_4934_prop_label"), value: displayValue(career.monetizableAbility), why: displayValue(scoreOf("wealthFortune")?.naturalReason) },
      { label: localSajuCalculatorText("lsc_4935_prop_label"), value: displayValue(asReportRecord(career.workModeType).primary), why: displayValue(asReportRecord(career.workModeType).reading) },
      { label: localSajuCalculatorText("lsc_4936_prop_label"), value: rowSummary(asReportRows(career.daewoonCareerRiseTiming), ["label", "strength", "reason"], "대운 상승기 입력 없음"), why: "대운이 직업 용신을 건드리는 시기를 본다." },
      { label: localSajuCalculatorText("lsc_4937_prop_label"), value: rowSummary(asReportRows(career.avoidedWorkEnvironment), ["elementKo", "warning"], "명확한 회피 환경 없음"), why: "기신 환경은 재능을 소모시키거나 결과를 흐린다." },
      { label: localSajuCalculatorText("lsc_4938_prop_label"), value: displayValue(career.immediateCareerStrategy), action: "직업 용신이 살아나는 업무·시장·역할로 현재 선택을 재배치한다." },
    ]),
    reportSection(12, "연애·결혼 분석", [
      { label: localSajuCalculatorText("lsc_4941_prop_label"), value: displayValue(loveMarriage.loveStyle), why: "배우자궁과 배우자성, 도화·홍염·합충을 함께 본다." },
      { label: localSajuCalculatorText("lsc_4942_prop_label"), value: displayValue(loveMarriage.attractedPersonType), why: "성별 입력이 있으면 전통 배우자성을, 미입력은 재성·관성을 모두 관계 지표로 본다." },
      { label: localSajuCalculatorText("lsc_4943_prop_label"), value: displayValue(loveMarriage.recurringRelationshipProblem), why: "관살혼잡, 재성혼잡, 식상관성 충돌, 비겁쟁재를 함께 본다." },
      { label: localSajuCalculatorText("lsc_4944_prop_label"), value: displayValue(loveMarriage.marriageFavorability), why: displayValue(loveMarriage.lateOrEarlyMarriage) },
      { label: localSajuCalculatorText("lsc_4945_prop_label"), value: rowSummary(asReportRows(loveMarriage.strongRelationshipDaewoon), ["label", "strength"], "강한 인연 대운 입력 없음"), why: "대운에서 배우자성 또는 배우자궁 합이 살아나는지 본다." },
      { label: localSajuCalculatorText("lsc_4946_prop_label"), value: rowSummary(asReportRows(loveMarriage.breakupConflictAnnual), ["label", "reason"], "직접 주의 세운 없음"), why: "배우자궁 충·해·파와 기신성 관계 자극을 본다." },
      { label: localSajuCalculatorText("lsc_4947_prop_label"), value: displayValue(loveMarriage.relationshipPrescription), action: "합에는 속도 조절, 충에는 거리·돈·일정 분리를 먼저 적용한다." },
    ]),
    reportSection(13, "신살 분석", [
      { label: localSajuCalculatorText("lsc_4950_prop_label"), value: rowSummary(asReportRows(shinsal.activeRows), ["shinsalName", "position"], "강한 활성 신살 없음"), why: displayValue(shinsal.principle) },
      { label: localSajuCalculatorText("lsc_4951_prop_label"), value: rowSummary(asReportRows(shinsal.rows), ["shinsalName", "position"], "위치 없음"), why: "원국과 입력 운에서 어느 글자에 걸렸는지 표시한다." },
      { label: localSajuCalculatorText("lsc_4952_prop_label"), value: rowSummary(asReportRows(shinsal.rows), ["shinsalName", "actualLifeManifestation"], "작용 없음"), why: "신살은 단독 길흉이 아니라 성격·연애·직업·이동·귀인운 보조 지표다." },
      { label: localSajuCalculatorText("lsc_4953_prop_label"), value: rowSummary(asReportRows(shinsal.luckTriggeredRows), ["shinsalName", "position"], "운 발동 없음"), why: "대운·세운에 같은 글자나 쌍지지 조건이 들어오면 발동한다." },
    ]),
    reportSection(14, "운의 환골탈태 요약", [
      { label: localSajuCalculatorText("lsc_4956_prop_label"), value: rowSummary(helpfulTransforms, ["requiredPhrase", "activationTiming"], "뚜렷한 기신 용신화 없음"), why: "기신이 합화·충거·도충·창고 개방으로 용신화되는지 본다." },
      { label: localSajuCalculatorText("lsc_4957_prop_label"), value: rowSummary(riskyTransforms, ["requiredPhrase", "activationTiming"], "뚜렷한 용신 파손 없음"), why: "용신이 합거·충·도충·불리한 창고 개방으로 손상되는지 본다." },
      { label: localSajuCalculatorText("lsc_4958_prop_label"), value: rowSummary(asReportRows(luckIntegratedReading.combinationTurningPoint), ["rule", "resultType", "transformedUseState"], "현재 대운·세운에서 직접 합화 전환점 없음"), why: "합화가 성립하면 오행과 십성이 바뀌고, 성립하지 않으면 합거·합반으로 작용한다." },
      { label: localSajuCalculatorText("lsc_4959_prop_label"), value: displayValue(luckIntegratedReading.doChungPossibility), why: "같은 지지 과포화가 반대 글자를 유도하는지 확인한다." },
      { label: localSajuCalculatorText("lsc_4960_prop_label"), value: displayValue(scoring.strongestRisk), action: "가장 낮은 점수 항목을 먼저 정비하고, 가장 높은 점수 항목에 자원을 집중한다." },
      { label: localSajuCalculatorText("lsc_4961_prop_label"), value: rowSummary(opportunityTransforms, ["requiredPhrase", "activationTiming"], "잠재력 개방 이벤트 없음"), why: "오래 숨어 있던 지장간·창고·삼합 구조가 현실화되는 시점이다." },
      { label: localSajuCalculatorText("lsc_4962_prop_label"), value: rowSummary(collapseTransforms, ["requiredPhrase", "activationTiming"], "구조 붕괴 이벤트 없음"), why: "격국 상신, 조후 용신, 원국 균형을 잡던 글자가 손상되는지 본다." },
      { label: localSajuCalculatorText("lsc_4963_prop_label"), value: displayValue(luckIntegratedReading.practicalPrescription), why: "대운 기반과 세운 사건성을 분리해 실제 선택 순서를 정한다." },
    ]),
    reportSection(15, "천기적 액션 처방", [
      { label: localSajuCalculatorText("lsc_4966_prop_label"), value: displayValue(career.immediateCareerStrategy), action: "직업 용신 분야를 주력 업무로 올리고 기신 환경은 계약·역할·시간으로 제한한다." },
      { label: "돈", value: displayValue(career.investmentWealthManagementStyle), action: "재성이 과하면 보전과 현금흐름, 식상이 강하면 산출물 현금화를 우선한다." },
      { label: localSajuCalculatorText("lsc_4968_prop_label"), value: displayValue(loveMarriage.relationshipPrescription), action: "관계의 속도, 약속 범위, 돈과 시간의 경계를 먼저 정한다." },
      { label: localSajuCalculatorText("lsc_4969_prop_label"), value: displayValue(scoreOf("healthPsychPressure")?.naturalReason), action: `조후상 ${displayValue(johu.urgentElementKo)} 기운을 생활 리듬으로 보완한다.` },
      { label: localSajuCalculatorText("lsc_4970_prop_label"), value: displayValue(personality.relationshipWeakness), action: "반복되는 약점은 설명보다 구조 조정으로 줄인다." },
      { label: localSajuCalculatorText("lsc_4971_prop_label"), value: `${displayValue(yongshin.coreYongshinKo)} 용신을 상징하는 색상·동선·습관을 작게 반복`, action: "부족한 오행을 장식보다 수면, 식사, 업무 리듬, 공간 정리로 먼저 채운다." },
      { label: localSajuCalculatorText("lsc_4972_prop_label"), value: displayValue(daewoon.howToUse), action: "대운 전반은 드러난 사건을 정리하고 후반은 생활권에 정착시킨다." },
      { label: localSajuCalculatorText("lsc_4973_prop_label"), value: rowSummary(asReportRows(loveMarriage.breakupConflictAnnual), ["label", "reason"], displayValue(scoreOf("gisinRisk")?.naturalReason)), action: "기신이 발동하는 선택은 확장보다 정비·분리·보류로 대응한다." },
    ]),
  ];

  return {
    title,
    brandPhrases: ["팩트 폭행", "운의 환골탈태", "천기적 액션 처방"],
    calculationConfidence,
    scoreSnapshot: {
      overallScore: scoring.overallScore,
      overallGrade: scoring.overallGrade,
      naturalSummary: scoring.naturalSummary,
    },
    sections,
    markdown: renderFinalReportMarkdown(title, sections),
  };
}

/**
 * 십이운성 동물점 전용 정밀 사주 계산기.
 * - 양력/음력(윤달 포함) 입력 지원
 * - KASI 절기 기준과 동일한 간지 수식으로 연/월/일/시주 계산
 * - 진태양시는 옵션과 출생지 좌표가 있을 때만 보정
 */
export function calculateLocalSaju(input: LocalSajuInput): LocalSajuResult {
  if (input.locationType === "current" || input.usingCurrentLocation === true) {
    throw new Error("Birthplace coordinates are required; current-location coordinates cannot be used for natal saju.");
  }

  const timezoneInfo = normalizeTimezone(input);
  const solarDate = resolveSolarDate(input);

  const hour = input.hasTime && Number.isFinite(input.hour) ? clamp(Number(input.hour), 0, 23) : 12;
  const minute = input.hasTime && Number.isFinite(input.minute) ? clamp(Number(input.minute), 0, 59) : 0;
  const standardClock = input.daylightSavingTime
    ? shiftWallTimeByMinutes(solarDate.year, solarDate.month, solarDate.day, hour, minute, -60)
    : { ...solarDate, hour, minute };
  const hourPillarTimePolicy = resolveHourPillarTimePolicy(input);
  const correctedByPolicy = input.hasTime
    ? applyHourPillarTimeCorrection(
      standardClock.year,
      standardClock.month,
      standardClock.day,
      standardClock.hour,
      standardClock.minute,
      input,
      timezoneInfo.offsetMinutes,
      hourPillarTimePolicy,
    )
    : null;
  const corrected = correctedByPolicy || standardClock;
  // 시주 시각 보정이 실제로 적용됐는가(정책 무관). 어떤 정책이었는지는 hourPillarTimePolicy 로 구분한다.
  const trueSolarTimeUsed = Boolean(correctedByPolicy);
  const zashiMode = normalizeZashiMode(input);

  const kasiByYear = buildKasiSolarTermBoundariesByYear(input.kasiSolarTerms);
  // 절기(입춘·월령) 판정은 표준시로 한다. 절입 시각 자체가 표준시로 발표되므로 한쪽만 경도 보정하면
  // 절기 경계 ±32분에 태어난 사람의 연주·월주가 통째로 밀린다. 시각 보정은 시주 전용이며
  // 워커 엔진(destiny-bias-engine.js)도 연·월·일주는 보정 전 시계로 세운다.
  const yearPillarResult = getYearPillar(standardClock, timezoneInfo.offsetMinutes, kasiByYear);
  const solarTermWindow = getSolarTermWindow(standardClock, timezoneInfo.offsetMinutes, kasiByYear);
  const monthPillar = getMonthPillar(yearPillarResult.pillar.stem, solarTermWindow.active);
  // 일주(日柱)는 표준시 민용일(달력 날짜) 기준으로 판정한다. 시주 시각 보정(경도, 정책에 따라 균시차)은
  // 일주 날짜 경계를 자정 너머로 밀지 않는다.
  // (예: 1981-01-27 00:30 대구는 진태양시로 전날 23:52가 되지만 일주는 1/27=을사가 정답)
  const dayPillarDate = getDayPillarDate(standardClock, zashiMode);
  const dayPillar = getDayPillar(dayPillarDate);
  // 시지(時支)는 진태양시 보정된 시각의 2시간지, 시간(時干)은 민용일 일간에서 오자둔으로 파생된다.
  const hourPillar = input.hasTime
    ? getHourPillar(dayPillar.stem, corrected)
    : null;
  const pillars = {
    year: yearPillarResult.pillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
  };
  const daewoonDirection = getDaewoonDirection(input, yearPillarResult.pillar.stem);
  // 대운 시작도 절기까지의 거리로 세므로 절기와 같은 표준시 축을 쓴다.
  const daewoonStart = calculateDaewoonStart(daewoonDirection, standardClock, solarTermWindow, timezoneInfo.offsetMinutes);
  const longitude = getInputLongitude(input);
  const latitude = getInputLatitude(input);
  const solarTermBoundary = {
    active: solarTermWindow.active,
    previous: solarTermWindow.previous,
    next: solarTermWindow.next,
    ipchun: yearPillarResult.ipchun,
  };
  const natalAnalysis = calculateNatalAnalysis(pillars, input);
  const finalAdvancedReport = buildFinalAdvancedReport({
    input,
    pillars,
    solarTermBoundary,
    daewoonStart,
    daewoonDirection,
    timezone: timezoneInfo.timezone,
    trueSolarTimeUsed,
    natalAnalysis,
  });
  const structuredAdvancedReport = buildStructuredAdvancedReport({
    input,
    pillars,
    solarTermBoundary,
    daewoonStart,
    daewoonDirection,
    timezone: timezoneInfo.timezone,
    trueSolarTimeUsed,
    natalAnalysis,
    finalAdvancedReport,
  });

  return {
    pillars,
    fourPillars: pillars,
    dayStem: dayPillar.stem,
    timeUnknown: !input.hasTime,
    solarTermBoundary,
    daewoonStartAge: daewoonStart.age,
    daewoonStart,
    daewoonDirection,
    timezone: timezoneInfo.timezone,
    trueSolarTimeUsed,
    hourPillarTimePolicy,
    natalAnalysis,
    structuredAdvancedReport,
    finalAdvancedReport,
    calculationEvidence: {
      input: {
        calendarType: input.calendarType || "solar",
        lunarLeap: Boolean(input.lunarLeap),
        gender: normalizeGender(input),
        hasTime: Boolean(input.hasTime),
        timezone: timezoneInfo.timezone,
        timezoneOffsetMinutes: timezoneInfo.offsetMinutes,
        daylightSavingTime: Boolean(input.daylightSavingTime),
        zashiMode,
        hourPillarTimePolicy,
        birthplace: input.birthplace || "",
        latitude,
        longitude,
      },
      solarDate,
      standardClock,
      correctedClock: corrected,
      hourPillarTimeCorrection: correctedByPolicy
        ? {
          policy: hourPillarTimePolicy,
          status: "applied",
          longitude: resolveHourPillarLongitude(input, timezoneInfo.offsetMinutes),
          standardMeridian: Number.isFinite(input.standardMeridian) ? Number(input.standardMeridian) : (timezoneInfo.offsetMinutes / 60) * 15,
          // 균시차는 TRUE_SOLAR_TIME 일 때만 실제로 더해진다. LOCAL_MEAN_TIME 은 경도 보정만 쓴다.
          equationOfTimeMinutes: hourPillarTimePolicy === "TRUE_SOLAR_TIME"
            ? equationOfTimeMinutes(standardClock.year, standardClock.month, standardClock.day)
            : 0,
        }
        : {
          policy: hourPillarTimePolicy,
          status: hourPillarTimePolicy === "KST_CLOCK_TIME"
            ? "not_requested"
            : (input.hasTime ? "not_applied_missing_birthplace_coordinates" : "not_applied_birth_time_unknown"),
        },
      solarTerms: {
        active: solarTermWindow.active,
        next: solarTermWindow.next,
        previous: solarTermWindow.previous,
        ipchun: yearPillarResult.ipchun,
        source: solarTermWindow.active?.source || "fixed-fallback",
        rule: "month and year pillars use solar-term ingress boundaries, not lunar months",
      },
      dayPillar: {
        method: "UTC serial day with local timezone date boundary",
        zashiMode,
        dateUsed: dayPillarDate,
      },
      daewoon: {
        direction: daewoonDirection,
        rule: "yang male/yin female forward; yin male/yang female reverse",
        conversion: "3 days = 1 year; 1 day = 4 months; 1 hour = about 5 days",
        baseTerm: daewoonStart.baseTerm,
        startAge: daewoonStart.age,
      },
      natalAnalysis: {
        dayMaster: natalAnalysis.dayMaster,
        monthCommand: natalAnalysis.monthCommand,
        structuralIssueCount: natalAnalysis.structuralIssues.length,
      },
    },
  };
}

/* 관리자 CMS 기본값 노출용(app/admin/cms/_lib/base-values.ts).
   화면에서 '지금 코드에 들어 있는 문장'을 보여 주기 위해만 쓴다. */
export const __cmsSajuReadingDefaults = {
  tenGod: TEN_GOD_OPERATION_DEFAULT as Record<string, unknown>,
  gyeokguk: GYEOK_DOMAIN_READING_DEFAULT as Record<string, unknown>,
  shinsal: SHINSAL_PROSE_DEFAULT as Record<string, unknown>,
};
