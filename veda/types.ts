// ============================================================
// src/types.ts
// 베다 점성술 엔진 전체에서 사용되는 타입 정의
// ============================================================

/** 9개의 베다 행성 이름 */
export type PlanetName =
  | "Sun"
  | "Moon"
  | "Mars"
  | "Mercury"
  | "Jupiter"
  | "Venus"
  | "Saturn"
  | "Rahu"
  | "Ketu";

/** 12 황도대 별자리 */
export type SignName =
  | "Aries"
  | "Taurus"
  | "Gemini"
  | "Cancer"
  | "Leo"
  | "Virgo"
  | "Libra"
  | "Scorpio"
  | "Sagittarius"
  | "Capricorn"
  | "Aquarius"
  | "Pisces";

/** 27 낙샤트라 이름 */
export type NakshatraName =
  | "Ashwini"
  | "Bharani"
  | "Krittika"
  | "Rohini"
  | "Mrigashira"
  | "Ardra"
  | "Punarvasu"
  | "Pushya"
  | "Ashlesha"
  | "Magha"
  | "Purva Phalguni"
  | "Uttara Phalguni"
  | "Hasta"
  | "Chitra"
  | "Swati"
  | "Vishakha"
  | "Anuradha"
  | "Jyeshtha"
  | "Mula"
  | "Purva Ashadha"
  | "Uttara Ashadha"
  | "Shravana"
  | "Dhanishtha"
  | "Shatabhisha"
  | "Purva Bhadrapada"
  | "Uttara Bhadrapada"
  | "Revati";

/** 요소(Element) 타입 */
export type Element = "Fire" | "Earth" | "Air" | "Water";

/** 7 차크라 */
export type ChakraName =
  | "Muladhara"
  | "Svadhisthana"
  | "Manipura"
  | "Anahata"
  | "Vishuddha"
  | "Ajna"
  | "Sahasrara";

/** 행성의 황경·황위·속도 정보 */
export interface PlanetPosition {
  /** 황도 경도 (0–360°, Sidereal) */
  longitude: number;
  /** 황도 위도 */
  latitude: number;
  /** 일일 이동 속도 (°/day) */
  speed: number;
  /** 위치한 별자리 인덱스 (0=Aries … 11=Pisces) */
  sign: number;
  /** 별자리 이름 */
  signName: SignName;
  /** 별자리 내 각도 (0–30°) */
  degreeInSign: number;
  /** 역행 여부 */
  isRetrograde: boolean;
  /** 항진(Exaltation) 상태 */
  dignity: "Exalted" | "Own" | "Neutral" | "Debilitated";
}

/** 낙샤트라 정보 */
export interface NakshatraInfo {
  index: number; // 0–26
  name: NakshatraName;
  lord: PlanetName;
  pada: 1 | 2 | 3 | 4;
  degreeInNakshatra: number;
}

/** 대운(Mahadasha) 기간 */
export interface Mahadasha {
  planet: PlanetName;
  startDate: Date;
  endDate: Date;
  durationYears: number;
  antardashas: Antardasha[];
}

/** 세운(Antardasha) 기간 */
export interface Antardasha {
  planet: PlanetName;
  startDate: Date;
  endDate: Date;
  durationDays: number;
}

/** D-1 기본 출생 차트 */
export interface RasiChart {
  ascendant: number; // Lagna 황경
  ascendantSign: SignName;
  planets: Record<PlanetName, PlanetPosition>;
  houses: HouseInfo[];
}

/** 하우스 정보 */
export interface HouseInfo {
  number: number; // 1–12
  sign: SignName;
  signIndex: number;
  planets: PlanetName[];
  lord: PlanetName; // 해당 하우스를 지배하는 행성
}

/** 분할 차트 (Varga) */
export interface VargaChart {
  type: "D1" | "D2" | "D9" | "D10";
  planets: Record<PlanetName, { sign: number; signName: SignName }>;
}

/** 전체 차트 데이터 */
export interface BirthChartData {
  input: BirthInput;
  rasi: RasiChart;
  nakshatra: NakshatraInfo;
  dashas: Mahadasha[];
  currentDasha: { mahadasha: Mahadasha; antardasha: Antardasha };
  varga: {
    d2: VargaChart;
    d9: VargaChart;
    d10: VargaChart;
  };
}

/** 출생 정보 입력 */
export interface BirthInput {
  /** UTC 기준 생년월일시 */
  datetime: Date;
  /** 위도 */
  latitude: number;
  /** 경도 */
  longitude: number;
  /** 타임존 오프셋 (시간, 예: KST = 9) */
  timezoneOffset: number;
  /** 성별 */
  gender: "M" | "F";
  /** 이름 (선택) */
  name?: string;
}

// ─── Phase 3 결과 타입 ─────────────────────────────────────

/** 1. 타고난 성향 결과 */
export interface PersonalityResult {
  lagnaSign: SignName;
  lagnaLord: PlanetName;
  lagnaLordPosition: string;
  moonNakshatra: NakshatraName;
  moonNakshatraLord: PlanetName;
  coreTraits: string[];
  subconscious: string[];
  lifeTheme: string;
  elementBalance: Record<Element, number>;
  modalityBalance: Record<"Cardinal" | "Fixed" | "Mutable", number>;
}

/** 2. 재물운 결과 */
export interface WealthResult {
  wealthScore: number; // 0–100
  primarySource: string;
  house2Status: string;
  house11Status: string;
  jupiterInfluence: string;
  horaStrength: string;
  wealthYogas: string[];
  peakWealthPeriods: string[];
  advice: string;
}

/** 3. 천직 결과 */
export interface CareerResult {
  primaryCareer: string[];
  secondaryCareer: string[];
  house10Lord: PlanetName;
  house10Planets: PlanetName[];
  dasamsaStrength: string;
  careerYogas: string[];
  bestPeriod: string;
  advice: string;
}

/** 4. 차크라 에너지 결과 */
export interface ChakraResult {
  chakras: ChakraStatus[];
  dominantChakra: ChakraName;
  blockedChakra: ChakraName;
  overallBalance: number; // 0–100
  healingAdvice: string[];
}

export interface ChakraStatus {
  name: ChakraName;
  planet: PlanetName;
  activationScore: number; // 0–100
  status: "Overactive" | "Balanced" | "Underactive" | "Blocked";
  description: string;
}

/** 5. 연애운 결과 */
export interface RomanceResult {
  house7Sign: SignName;
  house7Lord: PlanetName;
  venusOrJupiterSign: SignName;
  partnerTraits: string[];
  romanticStyle: string;
  marriageTimingHint: string;
  challengeAreas: string[];
  navamsaInsight: string;
  advice: string;
}

/** 6. 궁합 결과 */
export interface CompatibilityResult {
  totalScore: number; // 0–36
  percentage: number;
  verdict: string;
  breakdown: AshtakootItem[];
  strengths: string[];
  challenges: string[];
  advice: string;
}

export interface AshtakootItem {
  name: string;
  maxScore: number;
  actualScore: number;
  description: string;
}

/** 7. 요가 추천 결과 */
export interface YogaResult {
  dominantElement: Element;
  deficientElement: Element;
  dominantModality: string;
  primaryYoga: string;
  secondaryYoga: string;
  practices: YogaPractice[];
  avoidPractices: string[];
  bestPracticeTime: string;
}

export interface YogaPractice {
  name: string;
  type: string;
  chakraTarget: ChakraName;
  benefit: string;
  duration: string;
}

/** 최종 7대 운명 분석 결과 */
export interface DestinyReport {
  meta: {
    name?: string;
    birthDatetime: string;
    location: { lat: number; lon: number };
    generatedAt: string;
    currentDasha: string;
  };
  personality: PersonalityResult;
  wealth: WealthResult;
  career: CareerResult;
  chakra: ChakraResult;
  romance: RomanceResult;
  yoga: YogaResult;
}

/** 궁합 전용 결과 (두 사람) */
export interface FullCompatibilityReport {
  person1: { name?: string; moonNakshatra: NakshatraName };
  person2: { name?: string; moonNakshatra: NakshatraName };
  compatibility: CompatibilityResult;
  generatedAt: string;
}
