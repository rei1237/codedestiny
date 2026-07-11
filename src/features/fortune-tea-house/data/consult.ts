import type { TarotOrientation } from "./tarotCards";
import type { TenGodId } from "./tenGods";

export type TeaHouseEmotionTone = "pink" | "purple" | "blue" | "gold" | "green";
export type FortuneTeaHouseConsultMode = "tarot" | "saju" | "sajuCompatibility" | "sukuyo";
export type FortuneTeaHouseCalendarType = "solar" | "lunar";
export type FortuneTeaHouseServiceScope = "FORTUNE_TEA_HOUSE";
export type FortuneTeaTarotSpread = "three" | "five";

export type FortuneTeaHouseSukuyoPersonInput = {
  name?: string;
  birthDate?: string;
  calendarType?: FortuneTeaHouseCalendarType;
  gender?: string;
};

export type FortuneTeaHouseSukuyoInput = {
  user: FortuneTeaHouseSukuyoPersonInput;
  partner: FortuneTeaHouseSukuyoPersonInput;
  relationshipType?: string;
  focus?: string;
  currentSituation?: string;
};

export type FortuneTeaHouseSajuCompatPersonInput = {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  calendarType?: FortuneTeaHouseCalendarType;
  gender?: string;
  birthPlace?: string;
};

export type FortuneTeaHouseSajuCompatInput = {
  user: FortuneTeaHouseSajuCompatPersonInput;
  partner: FortuneTeaHouseSajuCompatPersonInput;
  relationshipType?: string;
  focus?: string;
  currentSituation?: string;
};

export type FortuneTeaHouseConsultRequest = {
  consultationMode?: FortuneTeaHouseConsultMode;
  attemptId?: string;
  resultId?: string;
  jobId?: string;
  nickname?: string;
  concernTopic?: string;
  birthInfo?: string;
  profileId?: string;
  birthDate?: string;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  birthPlace?: string;
  timezone?: string;
  gender?: string;
  calendarType?: FortuneTeaHouseCalendarType;
  tarotSpread?: FortuneTeaTarotSpread;
  sukuyo?: FortuneTeaHouseSukuyoInput;
  sajuCompatibility?: FortuneTeaHouseSajuCompatInput;
  selectedTeaCupId: string;
  selectedTeaCupName: string;
  selectedTeaCupTopic: string;
  question: string;
};

export type FortuneTeaHouseQuestionInput = {
  consultationMode: FortuneTeaHouseConsultMode;
  nickname?: string;
  concernTopic: string;
  birthInfo?: string;
  profileId?: string;
  birthDate?: string;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  birthPlace?: string;
  timezone?: string;
  gender?: string;
  calendarType?: FortuneTeaHouseCalendarType;
  tarotSpread?: FortuneTeaTarotSpread;
  sukuyo?: FortuneTeaHouseSukuyoInput;
  sajuCompatibility?: FortuneTeaHouseSajuCompatInput;
  question: string;
};

export type FortuneTeaHouseHoneyDropsState = {
  serviceScope?: FortuneTeaHouseServiceScope;
  balance?: number;
  fortuneTeaHouseHoneyDrops?: number;
  currentHoneyDrops: number;
  totalHoneyDrops: number;
  totalEarned?: number;
  totalSpent?: number;
  lastEarnedAt?: string;
  tarotAlbumUnlocked?: boolean;
  tarotAlbumUnlockedAt?: string;
  resultId?: string;
  earnedThisResult?: boolean;
  duplicateResult?: boolean;
  unlocked: boolean;
  authenticated?: boolean;
  disabled?: boolean;
  reason?: string;
};

export type FortuneTeaHouseHoneyLetter = {
  title: string;
  body: string;
  createdAt?: string;
  provider?: string;
  model?: string;
};

export type FortuneTeaSajuTenGodSnapshot = {
  available: boolean;
  primaryTenGod?: TenGodId;
  secondaryTenGods?: TenGodId[];
  tenGodLabels?: string[];
  reason?: string;
  source: "existing-saju-engine" | "fallback" | "unavailable";
};

export type FortuneTeaSajuDaewoonRow = {
  pillar: string;
  label?: string;
  startAge?: number;
  startYear?: number;
  isCurrent?: boolean;
};

export type FortuneTeaSajuSnapshot = {
  available: boolean;
  dayMaster?: string;
  pillars?: {
    year?: string;
    month?: string;
    day?: string;
    hour?: string;
  };
  fiveElements?: Record<string, number>;
  tenGods?: string[];
  tenGodSnapshot?: FortuneTeaSajuTenGodSnapshot;
  strongElements?: string[];
  weakElements?: string[];
  usefulElements?: string[];
  // 프롬프트 factInput용 심화 사실 — 엔진이 이미 계산하지만 버려지던 값(빈 필드 수복)
  monthBranch?: string;
  season?: string;
  daewoon?: FortuneTeaSajuDaewoonRow[];
  coreSummary?: string;
  caution?: string;
};

export type FortuneTeaSajuPillarKey = "year" | "month" | "day" | "hour";

export type FortuneTeaSajuPillar = {
  key: FortuneTeaSajuPillarKey;
  label: string;
  ganji?: string;
  heavenlyStem?: string;
  earthlyBranch?: string;
  element?: string;
  tenGod?: string;
  available: boolean;
  note?: string;
};

export type FortuneTeaFiveElementKey = "wood" | "fire" | "earth" | "metal" | "water";

export type FortuneTeaFiveElementBalance = {
  key: FortuneTeaFiveElementKey;
  nameKo: string;
  value: number;
  strengthLabel: string;
  reading: string;
  tone: "green" | "rose" | "gold" | "silver" | "blue";
};

export type FortuneTeaSajuBirthSummary = {
  nickname: string;
  profileId?: string;
  birthDate?: string;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  hasBirthTime: boolean;
  calendarType?: "solar" | "lunar";
  gender?: string;
  birthPlace?: string;
  timezone?: string;
};

export type FortuneTeaSajuTenGodReading = {
  id: TenGodId;
  nameKo: string;
  roleInTeaHouse: string;
  reading: string;
};

export type FortuneTeaSajuSecondaryTenGod = {
  id: TenGodId;
  nameKo: string;
  roleInTeaHouse: string;
};

export type FortuneTeaSajuDeepSection = {
  id: string;
  title: string;
  body: string;
  tone?: "summary" | "element" | "tenGod" | "flow" | "advice" | "caution";
};

export type FortuneTeaTarotSnapshot = {
  cardId: string;
  number: number;
  nameKo: string;
  nameEn: string;
  orientation: TarotOrientation;
  keywords: string[];
  meaning: string;
  topicReadingSeed?: string;
  source: "existing-ai-tarot" | "existing-card-data" | "fallback";
};

export type FortuneTeaTarotSpreadCard = FortuneTeaTarotSnapshot & {
  positionId: string;
  positionLabel: string;
  positionMeaning: string;
  reading?: string;
};

export type FortuneTeaSukuyoPersonSnapshot = {
  name: string;
  birthDate?: string;
  calendarType?: FortuneTeaHouseCalendarType;
  gender?: string;
  sukuyoName?: string;
  sukuyoHanja?: string;
  index?: number;
  element?: string;
  direction?: string;
  keywords?: string[];
};

export type FortuneTeaSukuyoCalculationPerson = {
  lunarYear?: number;
  lunarMonth?: number;
  lunarDay?: number;
  isLeapMonth?: boolean;
  source?: string;
  group?: string;
  guardian?: string;
  yinYang?: string;
  keyword?: string;
};

export type FortuneTeaSukuyoRelationDetail = {
  typeAToB?: string;
  typeBToA?: string;
  intensity?: string;
  userToPartnerMeaning?: string;
  partnerToUserMeaning?: string;
  directionalDistanceGuide?: string;
};

export type FortuneTeaSukuyoScoreSummary = {
  total: number;
  destiny: number;
  harmony: number;
  emotion: number;
  growth: number;
  stability: number;
  label: string;
};

export type FortuneTeaSukuyoElementHarmony = {
  userElement?: string;
  partnerElement?: string;
  relation?: string;
  summary: string;
};

export type FortuneTeaSukuyoCompatibilitySnapshot = {
  available: boolean;
  calculationSource?: string;
  title: string;
  summary: string;
  relationshipType?: string;
  focus?: string;
  currentSituation?: string;
  user: FortuneTeaSukuyoPersonSnapshot;
  partner: FortuneTeaSukuyoPersonSnapshot;
  calculationBasis?: {
    user: FortuneTeaSukuyoCalculationPerson;
    partner: FortuneTeaSukuyoCalculationPerson;
  };
  relationDetail?: FortuneTeaSukuyoRelationDetail;
  relationType?: string;
  relationTypeHan?: string;
  distanceLabel?: string;
  distanceTier?: "same" | "near" | "middle" | "far";
  forwardDistance?: number;
  reverseDistance?: number;
  shortestDistance?: number;
  compatibilityIndex?: number;
  scores?: FortuneTeaSukuyoScoreSummary;
  elementHarmony?: FortuneTeaSukuyoElementHarmony;
  direction?: string;
  strengths: string[];
  cautions: string[];
  adviceKeywords: string[];
  roleGuide?: {
    userAction: string;
    partnerAction: string;
  };
};

export type FortuneTeaSajuCompatPersonSnapshot = {
  name: string;
  birthDate?: string;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  calendarType?: FortuneTeaHouseCalendarType;
  gender?: string;
  dayMaster?: string;
  pillars?: {
    year?: string;
    month?: string;
    day?: string;
    hour?: string;
  };
  dominantElements?: string[];
  primaryTenGod?: string;
  keyPoints?: string[];
  // 워커 프롬프트 factInput 주입용 — 상대 명식 전체 스냅샷을 함께 실어 보낸다.
  saju?: FortuneTeaSajuSnapshot;
};

export type FortuneTeaSajuCompatInteraction = {
  dayMasterRelation?: string;
  elementHarmony?: string;
  summary?: string;
  strengths?: string[];
  cautions?: string[];
};

export type FortuneTeaSajuCompatibilitySnapshot = {
  available: boolean;
  calculationSource?: string;
  title: string;
  summary: string;
  relationshipType?: string;
  focus?: string;
  currentSituation?: string;
  user: FortuneTeaSajuCompatPersonSnapshot;
  partner: FortuneTeaSajuCompatPersonSnapshot;
  interaction?: FortuneTeaSajuCompatInteraction;
  adviceKeywords?: string[];
};

export type FortuneTeaHouseConsultResponse = {
  resultId?: string;
  consultationMode?: FortuneTeaHouseConsultMode;
  serviceScope?: FortuneTeaHouseServiceScope;
  featureKey?: string;
  pricing?: {
    amountKRW?: number;
    amountKrw?: number;
    paymentAmount?: number;
    [key: string]: unknown;
  };
  sessionTitle: string;
  questionSummary: string;
  teaCup: {
    id: string;
    name: string;
    topic: string;
    reading: string;
    resultPrelude?: string;
  };
  saju: {
    available: boolean;
    title: string;
    summary: string;
    keyPoints: string[];
    birthSummary?: FortuneTeaSajuBirthSummary;
    dayMaster?: string;
    dominantElements?: string[];
    pillars?: FortuneTeaSajuPillar[];
    fiveElements?: FortuneTeaFiveElementBalance[];
    primaryTenGod?: FortuneTeaSajuTenGodReading;
    secondaryTenGods?: FortuneTeaSajuSecondaryTenGod[];
    deepSections?: FortuneTeaSajuDeepSection[];
    monthBranch?: string;
    season?: string;
    daewoon?: FortuneTeaSajuDaewoonRow[];
    caution?: string;
    cautionReading?: string;
    actionPrescription?: string;
    oneLineAdvice?: string;
    tarotBridgeReady?: string;
    tenGodSnapshot?: FortuneTeaSajuTenGodSnapshot;
  };
  tarot: {
    cardId: string;
    number: number;
    nameEn: string;
    nameKo: string;
    orientation: TarotOrientation;
    keywords: string[];
    meaning: string;
    reading: string;
  };
  tarotSpread?: FortuneTeaTarotSpread;
  tarotSpreadCards?: FortuneTeaTarotSpreadCard[];
  sukuyoCompatibility?: FortuneTeaSukuyoCompatibilitySnapshot;
  sajuCompatibility?: FortuneTeaSajuCompatibilitySnapshot;
  emotionAnalysis: Array<{
    label: string;
    value: number;
    description: string;
    tone: TeaHouseEmotionTone;
  }>;
  yeoniReading: {
    intro: string;
    main: string;
    advice: string;
    caution: string;
  };
  synthesis: {
    title: string;
    summary: string;
    sajuTarotBridge: string;
  };
  choiceSimulation: Array<{
    id: string;
    title: string;
    subtitle: string;
    result: string;
    caution: string;
  }>;
  actionPrescription: string;
  luckyKeywords: string[];
  honeyLetter?: FortuneTeaHouseHoneyLetter;
  closingLine: string;
};
