import { calculateLocalSaju, type LocalSajuResult, type SajuPillarLocal } from "../../app/saju/animal-destiny/engine/localSajuCalculator";
import { getTwelveStagesForPillars } from "../../app/saju/animal-destiny/lib/twelveStages";
import {
  categoryToSlug,
  famousSajuCategories,
  getCelebrityAnnotation,
  getCelebrityBySlug,
  getCelebrityStaticSlugs,
  getFamousSajuArticleOverride,
  getCelebritiesByCategory,
  publishedCelebritySajuSeeds,
  type CelebritySajuAnnotation,
  type CelebritySajuAnnotationFact,
  type CelebritySajuSeed,
} from "./celebrity-data";

const elementByStem: Record<string, string> = {
  甲: "목",
  乙: "목",
  丙: "화",
  丁: "화",
  戊: "토",
  己: "토",
  庚: "금",
  辛: "금",
  壬: "수",
  癸: "수",
  갑: "목",
  을: "목",
  병: "화",
  정: "화",
  무: "토",
  기: "토",
  경: "금",
  신: "금",
  임: "수",
  계: "수",
};

const elementByBranch: Record<string, string> = {
  子: "수",
  丑: "토",
  寅: "목",
  卯: "목",
  辰: "토",
  巳: "화",
  午: "화",
  未: "토",
  申: "금",
  酉: "금",
  戌: "토",
  亥: "수",
  자: "수",
  축: "토",
  인: "목",
  묘: "목",
  진: "토",
  사: "화",
  오: "화",
  미: "토",
  신: "금",
  유: "금",
  술: "토",
  해: "수",
};

const stemTone: Record<string, string> = {
  甲: "큰 나무처럼 방향을 세우고 앞을 향해 뻗는 힘이 강합니다.",
  乙: "덩굴과 꽃처럼 섬세하게 이어 붙이고 관계를 살리는 힘이 있습니다.",
  丙: "태양처럼 존재감이 크고 메시지를 밝히는 힘이 있습니다.",
  丁: "촛불처럼 집중된 온기로 장면을 깊게 밝히는 기운입니다.",
  戊: "산처럼 중심을 지키고 오래 버티는 힘이 있습니다.",
  己: "기름진 흙처럼 현실을 돌보고 성과를 키우는 힘이 있습니다.",
  庚: "단단한 쇠처럼 결단과 실행이 빠르고 선명합니다.",
  辛: "보석처럼 정교한 감각과 기준으로 자신을 빛냅니다.",
  壬: "큰 물처럼 넓게 흐르며 판을 읽는 감각이 좋습니다.",
  癸: "비와 안개처럼 섬세하게 스며들어 깊은 통찰을 만듭니다.",
  갑: "큰 나무처럼 방향을 세우고 앞을 향해 뻗는 힘이 강합니다.",
  을: "덩굴과 꽃처럼 섬세하게 이어 붙이고 관계를 살리는 힘이 있습니다.",
  병: "태양처럼 존재감이 크고 메시지를 밝히는 힘이 있습니다.",
  정: "촛불처럼 집중된 온기로 장면을 깊게 밝히는 기운입니다.",
  무: "산처럼 중심을 지키고 오래 버티는 힘이 있습니다.",
  기: "기름진 흙처럼 현실을 돌보고 성과를 키우는 힘이 있습니다.",
  경: "단단한 쇠처럼 결단과 실행이 빠르고 선명합니다.",
  신: "보석처럼 정교한 감각과 기준으로 자신을 빛냅니다.",
  임: "큰 물처럼 넓게 흐르며 판을 읽는 감각이 좋습니다.",
  계: "비와 안개처럼 섬세하게 스며들어 깊은 통찰을 만듭니다.",
};

const elementTone: Record<string, string> = {
  목: "성장과 기획의 흐름이 강해 새로운 방향을 열고 사람을 움직이는 힘이 돋보입니다.",
  화: "표현과 확산의 기운이 살아 있어 존재감과 메시지를 밝히는 힘이 큽니다.",
  토: "중심을 잡고 결과를 쌓아가는 힘이 강해 신뢰와 지속성을 자산으로 만듭니다.",
  금: "선택과 완성의 기운이 선명해 기준을 세우고 성과를 다듬는 능력이 돋보입니다.",
  수: "감각과 통찰의 흐름이 깊어 보이지 않는 흐름을 읽고 유연하게 움직이는 힘이 있습니다.",
};

const engineElementLabel: Record<string, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
  목: "목",
  화: "화",
  토: "토",
  금: "금",
  수: "수",
};

type ElementKey = "목" | "화" | "토" | "금" | "수";
type ImageSectionKey = "default" | "career" | "love" | "wealth";
type FamousSajuCalculationStatus = "calculated" | "needs_review";
type FamousSajuReliabilityLevel = "높음" | "보통" | "제한";
const FAMOUS_SAJU_PUBLISHED_AT = "2026-06-04T00:00:00+09:00";
const FAMOUS_SAJU_UPDATED_AT = "2026-06-11T00:00:00+09:00";
const FAMOUS_SAJU_OG_IMAGE = "/fuctionassets/%EC%9C%A0%EB%AA%85%EC%9D%B8%20%EC%82%AC%EC%A3%BC%20%EB%B6%84%EC%84%9D.webp";
export const CELEBRITY_SAJU_DIRECT_READING_VERSION = "celebrity-saju-direct-reading.v2";
export const CELEBRITY_SAJU_MAGAZINE_SCHEMA_VERSION = "celebrity-saju-magazine-json.v1";
export const CELEBRITY_SAJU_DIRECT_READING_CONTRACT = [
  `directReadingVersion: ${CELEBRITY_SAJU_DIRECT_READING_VERSION}`,
  `schemaVersion: ${CELEBRITY_SAJU_MAGAZINE_SCHEMA_VERSION}`,
  "유명인 사주 본문은 계산 엔진이 산출한 년주·월주·일주·시주, 오행, 십성, 신살, 12운성 값을 바탕으로 직접 구성한다.",
  "본문은 공개 생년월일과 로컬 사주 계산 결과 밖의 값을 임의로 채우지 않는다.",
  "생시 미상은 반드시 3주 기준으로 쓰고 시주를 추정하지 않는다.",
  "공개 생년월일과 로컬 계산값 밖의 건강, 사고, 범죄, 연애, 가족 문제는 추측하지 않는다.",
  "단정형 예언 대신 명리학적으로 읽을 수 있는 결, 흐름, 주의 신호로 부드럽게 쓴다.",
].join("\n");

type FamousSajuNatalAnalysis = {
  dayMaster?: unknown;
  monthCommand?: unknown;
  fiveElements?: unknown;
  tenGods?: unknown;
  usefulElements?: unknown;
};

type FamousSajuEngineResult = LocalSajuResult & {
  natalAnalysis?: FamousSajuNatalAnalysis;
  daewoonStartAge?: number | null;
  daewoonDirection?: "forward" | "reverse" | string | null;
};

type FamousSajuInsightCard = {
  label: string;
  value: string;
  description: string;
};

type FamousSajuReliabilityNote = {
  label: string;
  level: FamousSajuReliabilityLevel;
  description: string;
};

type FamousSajuArticleSection = {
  title: string;
  imageQuery: string;
  imageSection: ImageSectionKey;
  body: string;
};

type FamousSajuElementProfile = {
  counts: Record<ElementKey, number>;
  ratios: Record<string, number>;
  dominantElement: string;
  weakElement: string;
};

export type CelebritySajuMagazineStar = {
  name: string;
  category: string;
  position: string;
  reading: string;
};

export type CelebritySajuMagazinePillar = {
  label: CelebritySajuMagazinePillarLabel;
  ganji: string;
  stem: string;
  stemTenGod: string;
  branch: string;
  branchTenGod: string;
  hiddenStemCore: string;
  twelveStage: string;
  twelveGod: string;
  majorStars: string;
  isUnknown?: boolean;
};

export type CelebritySajuMagazineResult = {
  schemaVersion: typeof CELEBRITY_SAJU_MAGAZINE_SCHEMA_VERSION;
  directReadingVersion: typeof CELEBRITY_SAJU_DIRECT_READING_VERSION;
  threePillarBasis: boolean;
  profile: {
    name: string;
    displayName: string;
    groupOrJob?: string;
    birthDate: string;
    calendarType: "solar" | "lunar";
    birthTimeKnown: boolean;
    birthTimeLabel: string;
    sourceNote: string;
  };
  pillars: {
    year: CelebritySajuMagazinePillar;
    month: CelebritySajuMagazinePillar;
    day: CelebritySajuMagazinePillar;
    hour: CelebritySajuMagazinePillar | null;
  };
  summary: {
    title: string;
    subtitle: string;
    coreMetaphor: string;
    dayMasterImagery?: string;
    oneLineReading: string;
    cautionNote: string;
  };
  fiveElements: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
    strongest: string[];
    weakest: string[];
    /** 요약 카드용 한 줄 핵심 */
    summaryLine: string;
    /** 오행 섹션/차트용 구조 설명 */
    structureLine: string;
    /** 상세 본문용 생활 처방(가장 긴 층위) */
    interpretation: string;
  };
  /** 일간(日干) 오행: 목/화/토/금/수 — 액센트 컬러 등 UI 판별용. 미상이면 "" */
  dayElement: string;
  /** 행적↔명리 매핑(수동 큐레이션). 없으면 빈 배열 */
  deeds: Array<{
    deed: string;
    link: string;
    linkType: "tenGod" | "element";
    note: string;
  }>;
  tenGods: {
    highlights: Array<{
      name: string;
      meaning: string;
      reading: string;
    }>;
  };
  stars: {
    goodStars: CelebritySajuMagazineStar[];
    neutralStars: CelebritySajuMagazineStar[];
    cautionStars: CelebritySajuMagazineStar[];
  };
  sections: Array<{
    id: string;
    title: string;
    body: string;
    cards?: Array<{
      label: string;
      title: string;
      description: string;
    }>;
  }>;
  faq: Array<{
    question: string;
    answer: string;
  }>;
  cta: {
    title: string;
    description: string;
    buttonText: string;
  };
};

export type FamousSajuCalculatedChart = {
  status: FamousSajuCalculationStatus;
  person: CelebritySajuSeed;
  saju: FamousSajuEngineResult | null;
  elementProfile: FamousSajuElementProfile;
  engineInput: {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    hasTime: boolean;
    calendarType: "solar" | "lunar";
  };
  reliabilityNotes: FamousSajuReliabilityNote[];
  failureReason?: string;
};

export type FamousSajuArticle = {
  celebrity: CelebritySajuSeed;
  person: CelebritySajuSeed;
  saju: FamousSajuEngineResult | null;
  calculationStatus: FamousSajuCalculationStatus;
  magazine: CelebritySajuMagazineResult;
  dayElement: string;
  dayMasterLabel: string;
  hourText: string;
  elementProfile: FamousSajuElementProfile;
  engineInputSummary: string;
  heroImageQuery: string;
  heroCopy: string;
  coreKeywords: string[];
  analysisBadge: string;
  timeNotice: string;
  summary: string;
  sections: FamousSajuArticleSection[];
  insightCards: FamousSajuInsightCard[];
  reliabilityNotes: FamousSajuReliabilityNote[];
  conclusion: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
};

type CraftedFamousSajuArticle = {
  heroCopy: string;
  summary: string;
  conclusion: string;
  sections: FamousSajuArticleSection[];
};

const FAMOUS_SAJU_COPY_KO = {
  "section.firstImpression": "명식의 첫 인상",
  "section.elementTenGod": "오행과 십성의 결",
  "section.luckFlow": "운의 흐름",
  "section.destinySentence": "운명의 한 문장",
  "section.chartFlow": "명식 핵심 흐름",
  "section.gyeokUseful": "격국과 보완 기운",
  "section.relationshipPattern": "관계성과 인간관계 패턴",
  "section.daewoonDoor": "대운의 문이 열리는 방식",
  "section.annualStandard": "세운을 읽는 기준",
  "magazine.chartReviewNeeded": "명식 기준 확인 필요",
  "magazine.standard": "기준",
  "magazine.chart": "명식",
  "magazine.chartUnavailable": "공개 생년월일이 명식으로 정리되기 전이라 원국의 결을 비워 두었습니다.",
  "magazine.interpretation": "해석",
  "magazine.interpretationLimited": "팔자·격국·보완 기운을 꾸며 쓰지 않고 확인 가능한 기준만 조용히 남겼습니다.",
  "magazine.originalChart": "원국",
  "magazine.tenGodElements": "십성·오행",
  "magazine.tenGodElementsDesc": "일간의 힘, 오행의 밝고 어두운 결, 십성의 표면 리듬을 함께 읽었습니다.",
  "magazine.gyeokUseful": "격국·보완 기운",
  "magazine.gyeokUsefulDesc": "전문 기준의 용신·희신·기신 판단은 월령과 조후, 억부의 균형을 겹쳐 보되 확정이 어려운 부분은 잠정 기준으로 낮춰 보았습니다.",
  "magazine.cycles": "대운·세운",
  "magazine.selfReadingTitle": "내 사주는 한 편의 이야기로 더 선명하게 열립니다",
  "magazine.selfReadingDesc": "생년월일과 생시를 직접 입력하면 계산값에 맞춘 사주 흐름을 볼 수 있습니다.",
  "magazine.thisChartIs": "[일주의 결]",
  "magazine.dayPillar": "일주",
  "magazine.dayPillarMeeting": "[일주의 결]",
  "magazine.elementBalance": "[오행의 흐름]",
  "magazine.strongElement": "강한 오행",
  "magazine.strongElementDesc": "먼저 몸을 일으키는 기질입니다.",
  "magazine.weakElement": "약한 오행",
  "magazine.weakElementDesc": "의식적으로 숨을 고르게 해야 하는 기운입니다.",
  "magazine.tenGodTalent": "[십성 해석]",
  "magazine.sinsalTexture": "[신살의 결]",
  "magazine.twelveStageSpeed": "[12운성과 기운의 성숙도]",
  "magazine.publicActivity": "원국의 작동 방식",
  "magazine.strengthCaution": "[오행의 흐름]",
  "magazine.strength": "강점",
  "magazine.strengthDesc": "원국에서 선명한 인상을 만드는 힘입니다.",
  "magazine.caution": "주의",
  "magazine.cautionDesc": "휴식과 균형으로 다듬으면 더 부드러워지는 지점입니다.",
  "magazine.closingSentence": "[이 명식이 남기는 문장]",
  "magazine.personalStoryTitle": "유명인처럼 내 사주도 한 편의 이야기로 읽어보세요",
  "magazine.personalStoryDesc": "계산값을 바탕으로 내 일주, 오행, 십성의 결을 차분히 이어 볼 수 있습니다.",
  "magazine.chartStatus": "명식 상태",
  "magazine.confirmableBirthOnly": "확정 가능한 생년월일 기준만 남겼습니다.",
  "magazine.dayMaster": "일간",
  "magazine.monthCommand": "월령",
  "magazine.elements": "오행",
  "magazine.elementsDesc": "가장 강하게 빛나는 기운과 보완할 기운입니다.",
  "magazine.usefulElement": "보완 기운",
  "magazine.usefulElementDesc": "명식을 맑게 여는 방향을 조심스럽게 잡은 기준입니다.",
  "magazine.daewoon": "대운",
  "magazine.annual": "세운",
  "pillar.year": "년주",
  "pillar.month": "월주",
  "pillar.day": "일주",
  "pillar.hour": "시주",
} as const;

const FAMOUS_SAJU_COPY_EN: Record<keyof typeof FAMOUS_SAJU_COPY_KO, string> = {
  "section.firstImpression": "First impression of the chart",
  "section.elementTenGod": "Texture of the elements and Ten Gods",
  "section.luckFlow": "Flow of fortune",
  "section.destinySentence": "One sentence of destiny",
  "section.chartFlow": "Core chart flow",
  "section.gyeokUseful": "Structure and balancing energy",
  "section.relationshipPattern": "Relationship pattern",
  "section.daewoonDoor": "How the major cycle opens",
  "section.annualStandard": "Standard for reading the annual flow",
  "magazine.chartReviewNeeded": "Chart basis needs review",
  "magazine.standard": "Standard",
  "magazine.chart": "Chart",
  "magazine.chartUnavailable": "The public birth date has not yet opened enough chart detail, so the natal texture is left blank.",
  "magazine.interpretation": "Reading",
  "magazine.interpretationLimited": "Only verifiable standards are shown without inventing structure, useful energy, or hidden chart details.",
  "magazine.originalChart": "Natal chart",
  "magazine.tenGodElements": "Ten Gods and elements",
  "magazine.tenGodElementsDesc": "The day master, bright and shadowed elements, and surface rhythm of the Ten Gods are read together.",
  "magazine.gyeokUseful": "Structure and balancing energy",
  "magazine.gyeokUsefulDesc": "Useful and challenging energies are held as provisional when month command, climate, and strength balance cannot be fully confirmed.",
  "magazine.cycles": "Major and annual cycles",
  "magazine.selfReadingTitle": "Your own Saju opens more clearly as a story.",
  "magazine.selfReadingDesc": "Enter your birth date and time to see a reading aligned with your calculated chart.",
  "magazine.thisChartIs": "[Day Pillar Texture]",
  "magazine.dayPillar": "Day pillar",
  "magazine.dayPillarMeeting": "[Day Pillar Texture]",
  "magazine.elementBalance": "[Element Flow]",
  "magazine.strongElement": "Strong element",
  "magazine.strongElementDesc": "The temperament that rises first.",
  "magazine.weakElement": "Weak element",
  "magazine.weakElementDesc": "The energy that needs conscious rhythm.",
  "magazine.tenGodTalent": "[Ten Gods Reading]",
  "magazine.sinsalTexture": "[Fortune Star Texture]",
  "magazine.twelveStageSpeed": "[Twelve Stage Maturity]",
  "magazine.publicActivity": "How the natal chart works",
  "magazine.strengthCaution": "[Element Flow]",
  "magazine.strength": "Strength",
  "magazine.strengthDesc": "A force that creates a clear impression in the natal chart.",
  "magazine.caution": "Caution",
  "magazine.cautionDesc": "A point that becomes softer with rest and balance.",
  "magazine.closingSentence": "[The Sentence This Chart Leaves]",
  "magazine.personalStoryTitle": "Read your Saju as a story, just like a famous chart.",
  "magazine.personalStoryDesc": "Your day pillar, elements, and Ten Gods can be connected calmly from calculated values.",
  "magazine.chartStatus": "Chart status",
  "magazine.confirmableBirthOnly": "Only the confirmable birth-date basis is shown.",
  "magazine.dayMaster": "Day master",
  "magazine.monthCommand": "Month command",
  "magazine.elements": "Elements",
  "magazine.elementsDesc": "The strongest energy and the energy to replenish are shown together.",
  "magazine.usefulElement": "Balancing energy",
  "magazine.usefulElementDesc": "A careful standard for opening the chart with clearer balance.",
  "magazine.daewoon": "Major cycle",
  "magazine.annual": "Annual flow",
  "pillar.year": "Year pillar",
  "pillar.month": "Month pillar",
  "pillar.day": "Day pillar",
  "pillar.hour": "Hour pillar",
};

const FAMOUS_SAJU_COPY = {
  ko: FAMOUS_SAJU_COPY_KO,
  en: FAMOUS_SAJU_COPY_EN,
  ja: FAMOUS_SAJU_COPY_EN,
  "zh-CN": FAMOUS_SAJU_COPY_EN,
  "zh-TW": FAMOUS_SAJU_COPY_EN,
} as const;

type FamousSajuCopyLocale = keyof typeof FAMOUS_SAJU_COPY;
type FamousSajuCopyKey = keyof typeof FAMOUS_SAJU_COPY_KO;
type CelebritySajuMagazinePillarLabel = "년주" | "월주" | "일주" | "시주";

function normalizeFamousSajuCopyLocale(locale?: string | null): FamousSajuCopyLocale {
  const normalized = String(locale || "ko").trim().replace("_", "-").toLowerCase();
  if (!normalized || normalized === "ko" || normalized === "ko-kr") return "ko";
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant") return "zh-TW";
  if (normalized === "ja" || normalized === "ja-jp") return "ja";
  return "en";
}

function famousSajuCopy(key: FamousSajuCopyKey, locale?: string | null): string {
  const activeLocale = normalizeFamousSajuCopyLocale(locale);
  const copy = FAMOUS_SAJU_COPY[activeLocale]?.[key] || FAMOUS_SAJU_COPY.en[key];
  if (!copy && process.env.NODE_ENV !== "production") {
    console.warn("[i18n] Missing famous saju copy: " + key + " (" + activeLocale + ")");
  }
  return copy || key;
}

const craftedFamousSajuArticles: Record<string, CraftedFamousSajuArticle> = {
  "yi-sun-sin": {
    heroCopy: "이순신의 명식은 칼끝 같은 관성의 압박 속에서도 스스로의 중심을 잃지 않는 장수의 구조로 읽힙니다. 두려움을 지우는 사주가 아니라, 두려움을 군율과 전략으로 바꾸는 사주입니다.",
    summary: "이순신 사주의 핵심은 충성과 전략이 따로 놀지 않는다는 데 있습니다. 강한 책임의 별은 명예욕으로 흐르지 않고 백성을 살리는 방어의 칼로 정련되며, 고립과 누명은 그의 격을 꺾기보다 더 맑게 벼립니다. 이 명식은 승리를 탐한 팔자가 아니라 반드시 지켜야 할 것을 지키기 위해 운명과 정면으로 맞선 장수의 명식입니다.",
    conclusion: "이순신의 사주는 바다가 흔들릴수록 더 맑아지는 장수의 별입니다. 큰 운은 그에게 편안한 길을 주지 않았지만, 혹독한 압박 속에서 오히려 이름을 불멸로 새기게 했습니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Korean admiral sea battle night stars destiny", imageSection: "default", body: "이순신의 명식을 펼치면 가장 먼저 느껴지는 것은 흔들림을 허락하지 않는 기강입니다. 장수의 사주가 힘만 강하면 흉하게 흐르기 쉬우나, 이 명식은 힘을 백성의 생명과 국가의 경계 안에 묶어 두는 절제가 함께 보입니다. 그래서 그의 용기는 격정이 아니라 냉정에 가깝고, 분노가 아니라 책임으로 움직입니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "moonlit ocean five elements military strategy", imageSection: "default", body: "수의 흐름은 전장을 읽는 지혜로, 목의 기운은 꺾이지 않는 신념으로, 금의 기운은 명령과 결단으로 드러납니다. 관성의 압박은 사람을 무너뜨리기도 하지만, 이순신에게는 두려움을 군율로 바꾸고 고립을 전략으로 바꾸는 힘이 됩니다. 물은 바다를 알고, 나무는 방향을 잃지 않으며, 쇠는 칼처럼 마무리를 짓습니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "stormy sea lone commander destiny", imageSection: "default", body: "이 명식의 대운은 편안한 상승보다 시련 속에서 격을 드러내는 흐름입니다. 억울함, 고립, 모함이 들어와도 그것이 곧 무너짐으로 이어지지 않고 오히려 내면의 칼날을 더 선명하게 만듭니다. 살아나는 운은 그에게 화려한 보상이 아니라 필요한 순간 필요한 결단을 잃지 않는 형태로 왔습니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "stars over Korean sea admiral destiny", imageSection: "default", body: "이순신은 승리를 좇은 사람이 아니라, 물러설 수 없는 자리에 섰기 때문에 승리가 따라온 명식입니다." },
    ],
  },
  "king-sejong": {
    heroCopy: "세종대왕의 명식은 왕의 권위보다 학자의 등불이 먼저 보이는 구조입니다. 백성을 향한 큰 마음과 문자를 창조하는 지성이 함께 놓여, 통치가 곧 보살핌이고 학문이 곧 나라의 운을 바꾸는 힘으로 작동합니다.",
    summary: "세종대왕 사주의 핵심은 밝히는 힘과 품는 힘의 조화입니다. 화의 빛은 지식과 창조성으로 나타나고, 수의 깊이는 백성의 고통을 읽는 통찰로 흐릅니다. 이 명식은 높은 자리에 올라 군림하는 팔자가 아니라, 높은 자리에서 더 낮은 곳을 비추는 군왕의 명식입니다.",
    conclusion: "세종대왕의 사주는 하늘의 빛을 글자로 내리고, 백성의 숨을 제도로 품은 창조 군왕의 별입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "King Sejong Hangul stars royal study", imageSection: "default", body: "세종대왕의 명식을 보면 권력의 무게보다 먼저 지성의 온기가 느껴집니다. 왕의 사주가 강하면 위엄으로 흐르기 쉬우나, 이 명식은 위엄을 학문과 제도 속에 녹여 백성에게 돌려주는 구조입니다. 머리의 밝음과 마음의 넓이가 함께 움직이므로 한 시대의 언어와 과학을 새로 여는 힘이 생깁니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "Hangul manuscript five elements royal palace", imageSection: "default", body: "화의 기운은 밝히고 드러내며, 수의 기운은 깊이 헤아립니다. 세종의 명식에서 빛은 허영이 아니라 깨우침으로 작용하고, 물은 흔들림이 아니라 사려 깊은 정책 감각으로 흐릅니다. 재성의 넓은 시야와 인성의 학문성이 만나 세상에 필요한 것을 실제 형태로 빚어냅니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "king study candle illness destiny", imageSection: "default", body: "세종의 운은 빛만 많은 운이 아닙니다. 몸의 부담과 책임의 과중함이 함께 오기 때문에, 큰 업적 뒤에는 스스로를 태우는 기운이 놓입니다. 그러나 이 명식은 소모를 무의미하게 흘려보내지 않고, 짧은 몸의 여력을 긴 문화의 생명으로 바꾸는 힘이 있습니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "golden Hangul letters night sky destiny", imageSection: "default", body: "세종대왕은 권력으로 이름을 남긴 군왕이 아니라, 백성의 입에 빛을 심어 이름이 된 명식입니다." },
    ],
  },
  "yu-gwan-sun": {
    heroCopy: "유관순의 명식은 거대한 물기운 속에서도 꺼지지 않는 작은 불꽃처럼 읽힙니다. 몸은 어렸으나 신념은 오래된 별처럼 단단했고, 시대의 어둠 앞에서 자신의 생을 횃불로 바꾼 구조입니다.",
    summary: "유관순 사주의 핵심은 약해 보이는 불이 강한 물을 만나 오히려 정신의 빛으로 승화된다는 데 있습니다. 수의 압박은 두려움이 아니라 시대의 아픔을 받아들이는 깊은 감수성으로 작용했고, 정화의 불빛은 작지만 끝까지 꺼지지 않는 신념으로 남았습니다.",
    conclusion: "유관순의 사주는 짧은 생을 긴 울림으로 바꾼 신념의 불꽃입니다. 그 별은 작아서 약한 것이 아니라, 어둠 속에서 더욱 분명해지는 빛입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Korean independence movement young woman stars", imageSection: "default", body: "유관순의 명식은 크고 화려한 힘으로 밀어붙이는 구조가 아닙니다. 오히려 깊은 물속에 숨은 촛불처럼, 외부의 압박이 강할수록 안쪽의 신념이 더 또렷해지는 형상입니다. 이런 사주는 삶의 길이가 아니라 정신의 밀도로 운명을 말합니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "candle in rain Korean flag destiny", imageSection: "default", body: "수의 기운은 시대의 슬픔을 깊이 느끼게 하고, 화의 기운은 그 슬픔을 외침으로 바꿉니다. 정관의 별은 세상의 권위에 순응하는 힘이 아니라 더 높은 하늘의 법을 따르는 힘으로 작용합니다. 그래서 어린 나이에도 무엇이 옳고 그른지 판단이 흔들리지 않았습니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "prison light young martyr destiny", imageSection: "default", body: "유관순의 운은 평탄한 성장으로 열리지 않았습니다. 강한 수의 압박은 고난과 감금, 외부 권력의 억압으로 드러났지만, 그 속에서 화의 기운은 오히려 순도를 높였습니다. 명리적으로 보면 이 고난은 빛을 꺼뜨린 것이 아니라 빛의 의미를 시대 전체에 번지게 했습니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "Korean flag stars candle destiny", imageSection: "default", body: "유관순은 시대가 꺼뜨리려 한 작은 불이었으나, 그 불은 나라의 새벽을 부르는 별이 되었습니다." },
    ],
  },
  "an-jung-geun": {
    heroCopy: "안중근의 명식은 칼처럼 선명한 금기운과 사상가의 고독한 별이 함께 놓인 구조입니다. 그의 결단은 순간의 격분이 아니라 오래 벼린 신념이 한 점으로 모인 운명의 작용입니다.",
    summary: "안중근 사주의 핵심은 의로움이 행동으로 내려오는 힘입니다. 강한 금의 기운은 판단과 절단의 능력으로 나타나고, 편인의 별은 독자적 사상과 역사적 책임의식을 깊게 만듭니다. 이 명식은 타협보다 명분을, 생존보다 의를 먼저 세운 결단의 사주입니다.",
    conclusion: "안중근의 사주는 몸은 묶여도 뜻은 꺾이지 않는 금의 명식입니다. 그의 운명은 칼끝의 사건보다 더 깊은 곳에서 동양 평화라는 큰 문장을 향해 있었습니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "An Jung-geun Harbin stars destiny", imageSection: "default", body: "안중근의 명식은 부드럽게 흘러가기보다 선을 긋고 방향을 정하는 힘이 강합니다. 금의 기운이 살아 있으면 세상의 모순을 날카롭게 보고, 무엇을 끊어야 하는지 본능적으로 압니다. 이 사주는 평온한 시대보다 불의가 드러난 시대에 자신의 역할을 더 분명히 깨닫는 구조입니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "metal sword philosophy stars East Asia", imageSection: "default", body: "금은 결단이고 수는 사유입니다. 안중근의 명식에서는 이 두 기운이 만나 생각이 행동으로 굳어지는 흐름을 만듭니다. 편인의 별은 홀로 깊이 파고드는 정신의 별이며, 그에게는 세상과 조금 다른 시선과 시대를 뛰어넘어 큰 질서를 보려는 철학으로 작용합니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "prison calligraphy righteous destiny", imageSection: "default", body: "이 명식에서 고난은 피할 수 없는 길목처럼 보입니다. 강한 금은 부딪힘을 만들고, 편인은 외로운 길을 걷게 합니다. 그러나 그 외로움은 패배가 아니라 사명의 농도를 높이는 자리입니다. 옥중에서도 글과 뜻이 무너지지 않은 이유가 여기에 있습니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "Harbin snow stars justice destiny", imageSection: "default", body: "안중근은 칼로만 기억될 사람이 아니라, 뜻을 칼보다 높이 세운 금의 별입니다." },
    ],
  },
  "kim-gu": {
    heroCopy: "김구의 명식은 불의 열기와 목의 신념이 함께 살아 있는 독립운동가의 구조입니다. 격동의 시대를 지나며 권력보다 나라의 혼을 먼저 붙잡았고, 통합과 문화의 이상을 운명의 큰 축으로 세웠습니다.",
    summary: "김구 사주의 핵심은 뜨거운 신념을 오래 견디는 힘입니다. 화의 기운은 대중 앞에 뜻을 밝히는 힘으로, 목의 기운은 이상을 포기하지 않는 생명력으로 나타납니다. 이 명식은 정치적 계산보다 정신의 독립을 먼저 세우는 사주이며, 백범이라는 이름처럼 큰 바탕 위에 스스로를 낮추는 길을 택합니다.",
    conclusion: "김구의 사주는 불처럼 뜨겁고 나무처럼 굽히지 않는 독립의 명식입니다. 그의 운명은 나라를 되찾는 일에서 끝나지 않고, 어떤 나라가 되어야 하는지를 묻는 데까지 이어집니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Kim Gu Korean independence stars destiny", imageSection: "default", body: "김구의 명식은 한 자리에 조용히 머무르는 구조가 아닙니다. 시대의 불길 속으로 들어가 스스로도 타오르면서 주변의 뜻을 모으는 형상입니다. 화의 기운이 강하면 성급해질 수 있으나, 이 사주는 목의 신념이 그 불을 이상과 민족의 방향으로 붙잡습니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "Korean provisional government fire wood destiny", imageSection: "default", body: "화는 뜻을 드러내고 목은 그 뜻을 자라게 합니다. 김구의 사주에서 불은 분노만이 아니라 희망의 횃불이며, 나무는 꺾여도 다시 살아나는 독립의 생명력입니다. 말과 행동으로 시대를 움직이되, 그 표현이 공적 책임으로 이어질 때 가장 크게 빛납니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "exile provisional government night stars", imageSection: "default", body: "김구의 운은 고향의 안온함보다 떠돌며 지켜야 하는 길로 열립니다. 망명과 투옥, 위협 같은 거친 흐름이 많지만, 이 사주는 그런 고난 속에서 오히려 이름의 무게를 키웁니다. 편한 운은 아니나, 큰 뜻을 가진 사람에게 필요한 단련의 운입니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "Korean independence flag stars destiny", imageSection: "default", body: "김구는 권력을 꿈꾼 정치인이 아니라, 나라의 혼이 어디로 가야 하는지를 물은 불의 별입니다." },
    ],
  },
  "jeong-yak-yong": {
    heroCopy: "정약용의 명식은 물의 깊은 사유와 흙의 실용 감각이 함께 놓인 학자의 구조입니다. 유배의 고독 속에서도 학문을 현실의 약으로 빚어 냈고, 생각을 백성을 위한 제도로 내려놓는 힘이 강하게 보입니다.",
    summary: "정약용 사주의 핵심은 고난을 지식의 창고로 바꾸는 능력입니다. 수의 기운은 깊은 탐구와 성찰로, 토의 기운은 구체적 제도와 실학의 감각으로 나타납니다. 이 명식은 세상과 떨어진 자리에서 오히려 세상을 더 정밀하게 읽어 낸 학자의 명식입니다.",
    conclusion: "정약용의 사주는 유배의 어둠을 학문의 등불로 바꾼 실학의 명식입니다. 그의 운명은 높은 벼슬보다 오래 남는 문장과 제도 속에서 빛납니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Jeong Yak-yong scholar exile stars", imageSection: "default", body: "정약용의 명식은 화려한 권세보다 깊은 책상 앞의 기운이 먼저 보입니다. 물은 생각을 깊게 하고, 흙은 그 생각을 현실의 밭에 심습니다. 그래서 이 사주는 관념에 머무르는 학자가 아니라, 백성의 생활과 제도의 허점을 집요하게 살피는 실천형 지성으로 읽힙니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "Korean scholar books water earth destiny", imageSection: "default", body: "수의 기운은 끝없이 묻고 살피는 힘이며, 토의 기운은 답을 생활 속에 고정하는 힘입니다. 인성의 별은 학문을 낳고, 식상의 흐름은 그 학문을 글과 제안으로 밖으로 내보냅니다. 생각이 깊어도 뜬구름이 되지 않고, 현실을 보아도 천박한 계산에 머물지 않습니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "exile hut candle books destiny", imageSection: "default", body: "정약용에게 유배는 흉한 운이면서 동시에 학문의 문이 열린 운입니다. 세상과 떨어지는 고통은 컸지만, 그 고립은 사유를 맑게 하고 문장을 깊게 만들었습니다. 이 명식은 억울한 시간을 허비하지 않고, 운이 막힌 곳에서 오히려 후대의 길을 뚫습니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "Dasan scholar stars manuscript destiny", imageSection: "default", body: "정약용은 유배지에 갇힌 사람이 아니라, 그 고요한 자리에서 조선의 미래를 다시 설계한 물의 학자입니다." },
    ],
  },
  "bts-rm": {
    heroCopy: "BTS RM의 명식은 언어의 물길과 무대의 불빛이 함께 흐르는 창작자의 구조입니다. 리더의 별은 앞에서 명령하기보다 흩어진 감정과 생각을 한 문장으로 모으는 방식으로 빛납니다.",
    summary: "BTS RM 사주의 핵심은 사유를 리듬으로 바꾸는 힘입니다. 깊이 생각하는 기운은 혼자 안으로만 잠기지 않고, 음악과 말, 팀의 방향성으로 밖으로 흘러나옵니다. 이 명식은 대중의 환호를 단순한 인기운으로 쓰지 않고, 시대의 언어를 번역하는 창작자의 운으로 다룹니다.",
    conclusion: "BTS RM의 사주는 말이 길이 되고, 사유가 무대의 별빛으로 바뀌는 창작 리더의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "BTS RM cosmic stage poetry stars", imageSection: "career", body: "BTS RM의 명식을 보면 먼저 생각의 밀도가 느껴집니다. 이 사주는 가볍게 반응하는 팔자가 아니라, 한 번 받아들인 감정과 질문을 오래 숙성시킨 뒤 자신만의 언어로 내보내는 구조입니다. 리더십 역시 강압보다 해석의 힘에 가깝습니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "music lyrics ink five elements stars", imageSection: "default", body: "수의 깊이는 철학적 질문과 자기 성찰로 흐르고, 화의 기운은 그 생각을 무대 위 메시지로 밝힙니다. 식상은 언어와 음악으로 자신을 표현하게 하고, 인성은 그 표현이 쉽게 소모되지 않도록 사유의 뿌리를 붙잡습니다. 그래서 그의 창작은 즉흥보다 축적의 향이 강합니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "global concert road stars destiny", imageSection: "default", body: "이 명식의 운은 개인의 재능이 팀의 운과 맞물릴 때 크게 열립니다. 혼자 빛나는 운도 있으나, 더 큰 길은 여러 사람의 목소리를 하나의 상징으로 묶을 때 옵니다. 대운이 확장될수록 중요한 것은 속도가 아니라 자기 언어의 중심을 잃지 않는 일입니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "poetry microphone night sky destiny", imageSection: "default", body: "BTS RM은 무대 위에서 노래하는 사람을 넘어, 한 세대의 마음을 문장으로 정리하는 별입니다." },
    ],
  },
  iu: {
    heroCopy: "IU의 명식은 맑은 화기와 섬세한 수기가 함께 놓인 서정의 구조입니다. 노래와 연기, 글과 이미지가 하나의 결로 이어지며, 부드러운 목소리 안에 강한 자기 기준이 숨어 있습니다.",
    summary: "IU 사주의 핵심은 여린 감각을 오래가는 작품성으로 바꾸는 힘입니다. 감정의 물결은 쉽게 흩어지지 않고, 표현의 불빛을 만나 노래와 서사로 정돈됩니다. 이 명식은 사랑받는 운만 강한 것이 아니라, 사랑받은 뒤에도 자신을 잃지 않는 절제의 별이 함께 작동합니다.",
    conclusion: "IU의 사주는 작은 떨림을 긴 울림으로 바꾸는 서정의 명식입니다. 부드러움 안에 중심이 있고, 중심 안에 오래가는 빛이 있습니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "IU moonlit stage lyrical stars destiny", imageSection: "career", body: "IU의 명식은 화려함보다 맑은 여운이 먼저 남습니다. 이 사주는 감정을 과장해 터뜨리기보다, 아주 작은 결을 놓치지 않고 붙잡아 오래 들리는 목소리로 바꾸는 구조입니다. 대중성은 표면이고, 안쪽에는 자기 작품을 끝까지 다듬는 장인의 기운이 있습니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "moon song water fire five elements", imageSection: "default", body: "수의 감수성은 사람의 마음을 읽고, 화의 표현력은 그 마음을 밝힙니다. 식상의 별은 노래와 글, 연기로 자신을 밖에 세우게 하고, 관성의 절제는 그 표현이 흐트러지지 않도록 품격을 줍니다. 그래서 IU의 운은 감성만으로 설명되지 않고 완성도와 책임감까지 함께 보아야 합니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "singer actress moon road stars", imageSection: "default", body: "이 명식은 어린 시절부터 빨리 세상 앞에 서는 운을 갖지만, 빠른 등장이 곧 가벼운 운을 뜻하지는 않습니다. 시간이 갈수록 목소리의 순수함보다 자기 해석의 깊이가 더 중요해지고, 작품을 고르는 기준이 운의 품격을 결정합니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "silver microphone moon destiny", imageSection: "default", body: "IU는 사랑받는 목소리를 넘어, 한 사람의 마음이 계절처럼 변하는 법을 노래하는 별입니다." },
    ],
  },
  "son-heung-min": {
    heroCopy: "손흥민의 명식은 속도의 불빛과 절제된 금기가 함께 살아 있는 승부사의 구조입니다. 빠르게 달리되 흩어지지 않고, 강하게 겨루되 팀의 흐름을 읽는 균형이 돋보입니다.",
    summary: "손흥민 사주의 핵심은 순발력과 자기관리의 결합입니다. 화의 추진력은 폭발적인 스피드와 결정력으로 나타나고, 금의 절제는 훈련과 반복, 정확한 마무리로 이어집니다. 이 명식은 재능만 믿고 뛰는 팔자가 아니라, 재능을 매일 단련해 운으로 만드는 선수의 사주입니다.",
    conclusion: "손흥민의 사주는 달리는 불꽃이면서도 끝내 팀의 길을 비추는 별입니다. 속도는 그의 재능이고, 성실은 그의 운을 지키는 그릇입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Son Heung-min football stadium stars destiny", imageSection: "career", body: "손흥민의 명식은 움직임이 빠르고 장면 전환이 선명합니다. 이런 사주는 머뭇거릴수록 빛이 줄고, 순간의 판단을 믿고 치고 나갈 때 운이 열립니다. 다만 단순한 공격성만 있는 것이 아니라, 팀 안에서 자기 자리를 아는 균형감이 함께 보입니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "football fire metal five elements stars", imageSection: "default", body: "화는 폭발적인 추진력이고, 금은 정확한 마무리입니다. 손흥민의 사주에서 이 둘이 만나면 속도와 결정력이 동시에 살아납니다. 비겁의 경쟁심은 자신을 계속 밀어 올리고, 관성의 절제는 그 경쟁심을 훈련과 책임감 안에 묶어 둡니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "football road stadium night destiny", imageSection: "default", body: "이 명식의 운은 낯선 무대에 나가 스스로를 증명하는 방식으로 커집니다. 해외 무대와 강한 경쟁은 부담이면서 동시에 길입니다. 운이 강해질수록 중요한 것은 몸의 리듬을 아끼고, 승부의 불을 오래 유지할 수 있는 관리의 힘입니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "football goal stars destiny", imageSection: "default", body: "손흥민은 빠르게 달리는 선수이기 전에, 매일의 반복으로 자신의 별을 지켜 온 승부사의 명식입니다." },
    ],
  },
  "newjeans-hanni": {
    heroCopy: "뉴진스 하니의 명식은 맑은 목기와 부드러운 수기가 어우러진 청량한 무대의 구조입니다. 자연스럽게 사람을 끌어당기는 기운이 강하고, 밝은 이미지 안에 섬세한 감각의 결이 숨어 있습니다.",
    summary: "뉴진스 하니 사주의 핵심은 꾸미지 않은 매력을 무대의 호흡으로 바꾸는 힘입니다. 목의 생동감은 성장과 신선함으로, 수의 감각은 음색과 표정의 여백으로 드러납니다. 이 명식은 강하게 밀어붙이는 스타성보다 자연스럽게 스며드는 스타성이 돋보입니다.",
    conclusion: "뉴진스 하니의 사주는 청량한 바람처럼 다가와 오래 기억되는 무대의 별입니다. 맑음이 곧 힘이 되는 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "NewJeans Hanni fresh stage stars destiny", imageSection: "career", body: "뉴진스 하니의 명식은 처음부터 강하게 압도하기보다 어느새 시선을 머물게 하는 구조입니다. 목의 기운이 살아 있어 성장성과 신선함이 좋고, 수의 기운은 감정의 여백을 만들어 무대 위 표정과 음색에 자연스러운 깊이를 줍니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "fresh pop stage water wood five elements", imageSection: "default", body: "목은 새싹처럼 자라는 힘이고, 수는 그 새싹을 적시는 감각입니다. 하니의 사주에서 식상은 표현력으로 열리고, 인성은 분위기를 받아들이는 섬세함으로 작용합니다. 그래서 과한 힘보다 호흡, 과장보다 자연스러움이 운을 살립니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "idol stage soft light destiny", imageSection: "default", body: "이 명식은 성장 과정 자체가 운의 핵심입니다. 빠르게 완성형으로 굳어지기보다, 해마다 이미지와 표현의 폭이 넓어질수록 더 좋아집니다. 운이 열리는 흐름은 무리한 변신보다 본래의 맑은 결을 잃지 않으면서 새로운 색을 조금씩 더하는 방식으로 옵니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "soft pop stage spring stars", imageSection: "default", body: "뉴진스 하니는 큰 소리로 자신을 증명하기보다, 맑은 결 하나로 사람의 기억에 스며드는 별입니다." },
    ],
  },
  "yu-hae-jin": {
    heroCopy: "유해진의 명식은 흙의 생활감과 금의 절도가 어우러진 배우의 구조입니다. 화려한 포장보다 사람 냄새가 먼저 닿고, 평범해 보이는 장면 안에서 깊은 진심을 길어 올리는 힘이 큽니다.",
    summary: "유해진 사주의 핵심은 현실감과 진정성입니다. 토의 기운은 일상의 질감과 안정감을 만들고, 금의 기운은 연기의 선을 정확히 잡아 줍니다. 이 명식은 과장된 스타성보다 오래 볼수록 믿음이 생기는 배우의 운으로 읽힙니다.",
    conclusion: "유해진의 사주는 사람의 체온을 연기로 바꾸는 흙의 명식입니다. 소박함은 약점이 아니라 가장 오래가는 매력입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Korean actor warm cinema stars destiny", imageSection: "career", body: "유해진의 명식은 눈부신 장식보다 단단한 질감이 먼저 느껴집니다. 이런 사주는 큰 말 없이도 존재감이 쌓이고, 시간이 지날수록 사람들에게 신뢰를 줍니다. 배우로서는 캐릭터를 꾸미기보다 인물의 생활과 숨결을 살리는 데 강합니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "earth metal cinema actor five elements", imageSection: "default", body: "토는 사람을 땅에 붙이고, 금은 장면의 선을 정리합니다. 유해진의 사주에서 식상은 자연스러운 표현력으로, 재성은 현실을 읽는 감각으로 나타납니다. 그래서 웃음도 가볍게 날아가지 않고, 슬픔도 지나치게 꾸며지지 않습니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "film road actor night stars", imageSection: "default", body: "이 명식은 단번에 폭발하는 운보다 시간이 쌓일수록 진가가 드러나는 운입니다. 조연과 주연, 코미디와 드라마를 넘나드는 폭은 우연이 아니라 토의 넓은 수용력에서 나옵니다. 운이 크게 열리는 순간은 꾸준함과 신뢰가 한계점을 넘을 때 찾아옵니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "warm movie light stars destiny", imageSection: "default", body: "유해진은 평범한 얼굴 속에서 비범한 온기를 꺼내는 배우의 별입니다." },
    ],
  },
  "bong-joon-ho": {
    heroCopy: "봉준호의 명식은 수의 통찰과 금의 구조감이 맞물린 감독의 사주입니다. 웃음과 불안, 현실과 상징을 한 화면 안에 배치하며, 보이지 않는 사회의 균열을 정교하게 드러내는 힘이 큽니다.",
    summary: "봉준호 사주의 핵심은 장면 뒤에 숨어 있는 구조를 읽는 능력입니다. 수의 기운은 인간 심리와 사회의 어두운 물길을 감지하고, 금의 기운은 그것을 정확한 미장센과 서사 구조로 다듬습니다. 이 명식은 이야기를 꾸미는 팔자가 아니라, 세계의 모순을 영화라는 그릇에 담아내는 창작자의 명식입니다.",
    conclusion: "봉준호의 사주는 현실의 그림자를 예술의 언어로 번역하는 감독의 별입니다. 불편함을 피하지 않을 때 그의 운은 가장 크게 빛납니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Bong Joon-ho cinema stairs stars destiny", imageSection: "career", body: "봉준호의 명식은 겉으로 웃고 있으나 안쪽에서는 매우 정밀한 계산이 돌아가는 구조입니다. 수의 통찰은 사람의 욕망과 불안을 깊이 읽고, 금의 절도는 그 복잡한 감정을 정확한 장면으로 잘라 냅니다. 그래서 그의 영화는 재미와 불편함이 동시에 남습니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "film director water metal five elements", imageSection: "default", body: "수는 보이지 않는 흐름을 읽고, 금은 그것을 형태로 고정합니다. 봉준호의 사주에서 식상은 독특한 이야기의 배출구가 되고, 편인의 기운은 남들이 지나치는 균열을 집요하게 바라보게 합니다. 이 별의 조합은 대중성과 작가성을 한 화면에 넣는 힘을 줍니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "Oscar cinema night road destiny", imageSection: "default", body: "이 명식의 운은 좁은 장르 안에 갇힐 때보다 경계를 넘어설 때 커집니다. 한국적 현실에서 출발한 이야기가 세계의 언어로 읽히는 흐름은, 수의 보편성과 금의 완성도가 함께 작동한 결과입니다. 큰 운은 기이함을 숨기지 않을 때 열립니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "cinema frame shadow stars destiny", imageSection: "default", body: "봉준호는 세계의 어두운 계단을 웃음과 서늘함으로 비추는 감독의 명식입니다." },
    ],
  },
  "ryu-hyun-jin": {
    heroCopy: "류현진의 명식은 물의 침착함과 흙의 버티는 힘이 어우러진 투수의 구조입니다. 빠른 기세보다 흐름을 읽는 감각이 강하고, 흔들리는 경기 속에서도 자기 리듬으로 승부를 정돈하는 별이 보입니다.",
    summary: "류현진 사주의 핵심은 압박 속에서 속도를 낮추고 판을 읽는 능력입니다. 수의 기운은 타자와 경기 흐름을 읽는 감각으로, 토의 기운은 긴 이닝을 버티는 안정감으로 작용합니다. 이 명식은 힘으로만 누르는 투수가 아니라, 제구와 완급으로 상대의 운을 끊는 투수의 사주입니다.",
    conclusion: "류현진의 사주는 조용히 흐르다 결정적 순간에 판을 잠그는 물의 명식입니다. 침착함이 곧 그의 승부수입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Ryu Hyun-jin baseball mound stars destiny", imageSection: "career", body: "류현진의 명식은 요란하게 타오르는 구조가 아니라, 묵직하게 흐름을 붙잡는 구조입니다. 이런 사주는 위기에서 더 차분해지고, 상대가 흔들릴수록 자신의 템포를 잃지 않을 때 강합니다. 투수로서는 공 하나의 속도보다 경기 전체의 호흡을 읽는 힘이 큽니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "baseball water earth five elements mound", imageSection: "default", body: "수는 흐름을 읽고, 토는 중심을 세웁니다. 류현진의 사주에서 관성은 경기의 규율과 자기관리로 나타나고, 식상은 공의 변화와 타이밍 조절로 드러납니다. 그래서 그의 힘은 폭발보다 조절에 있고, 조절이 쌓여 압도감이 됩니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "baseball stadium night recovery destiny", imageSection: "default", body: "이 명식은 부상과 회복, 국내와 해외 무대를 오가며 운의 깊이를 키우는 흐름입니다. 몸의 리듬이 곧 운의 그릇이므로 무리한 확장보다 오래 던질 수 있는 균형이 중요합니다. 살아나는 운은 한 번의 강속구보다 흔들리지 않는 복귀력에서 옵니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "baseball mound moon stars destiny", imageSection: "default", body: "류현진은 빠르게 압도하기보다, 조용히 흐름을 잠그며 승부를 자기 쪽으로 돌리는 별입니다." },
    ],
  },
  "miyazaki-hayao": {
    heroCopy: "미야자키 하야오의 명식은 목의 상상력과 수의 깊은 생명감이 맞물린 창작자의 구조입니다. 그의 세계는 단순한 환상이 아니라, 자연과 인간의 상처를 오래 바라본 영혼의 지도처럼 펼쳐집니다.",
    summary: "미야자키 하야오 사주의 핵심은 순수한 상상력을 장인적 집요함으로 끝까지 완성하는 힘입니다. 목의 기운은 생명과 성장, 숲과 비행의 이미지를 만들고, 수의 기운은 그 세계에 그리움과 두려움, 치유의 깊이를 더합니다. 이 명식은 어린이를 위한 이야기를 만들지만, 실제로는 어른의 잃어버린 혼을 되찾게 하는 창작자의 사주입니다.",
    conclusion: "미야자키 하야오의 사주는 바람과 숲, 소녀와 기계가 모두 하나의 생명으로 숨 쉬는 상상력의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Hayao Miyazaki forest sky animation stars destiny", imageSection: "career", body: "미야자키 하야오의 명식은 현실을 떠나는 사주가 아니라, 현실의 상처를 다른 세계의 언어로 치유하는 구조입니다. 목의 기운은 숲과 성장, 생명의 회복으로 나타나고, 수의 기운은 기억과 상실, 그리움의 물결을 작품 속에 흐르게 합니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "animation forest water wood five elements", imageSection: "default", body: "목은 자라나는 세계이고, 수는 그 세계를 적시는 감정입니다. 여기에 식상의 별이 강하게 작용하면 머릿속의 풍경이 화면과 서사로 흘러나옵니다. 이 명식의 상상력은 가볍게 떠오르는 꿈이 아니라, 손으로 수천 번 그려야 비로소 완성되는 수행에 가깝습니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "studio ghibli road wind stars destiny", imageSection: "default", body: "이 명식은 시간이 갈수록 자기 세계가 더 깊어지는 운입니다. 젊은 시절의 기술과 노동은 중년 이후 거대한 세계관으로 바뀌고, 말년에는 한 작품 한 작품이 유언 같은 밀도를 갖습니다. 운이 좋을수록 쉬워지는 것이 아니라, 더 높은 완성도를 요구받는 구조입니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "flying castle forest stars destiny", imageSection: "default", body: "미야자키 하야오는 하늘을 나는 그림으로 땅의 생명을 다시 사랑하게 만드는 별입니다." },
    ],
  },
  naruhito: {
    heroCopy: "나루히토 일왕의 명식은 물의 유연함과 금의 품격이 왕실의 상징성 안에서 조용히 빛나는 구조입니다. 강한 권력보다 균형과 의례, 관계의 조율을 통해 시대의 흐름을 잇는 별이 보입니다.",
    summary: "나루히토 일왕 사주의 핵심은 부드러운 외교성과 안정적 계승의 기운입니다. 수의 기운은 세계와 소통하는 감각으로, 금의 기운은 왕실의 형식과 품위를 지키는 힘으로 나타납니다. 이 명식은 앞장서서 시대를 흔드는 팔자라기보다, 조용히 흐름을 받아들이며 상징의 무게를 관리하는 사주입니다.",
    conclusion: "나루히토 일왕의 사주는 흐르는 물처럼 시대를 잇고, 단정한 금처럼 왕실의 격을 지키는 상징의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Naruhito imperial ceremony water stars destiny", imageSection: "default", body: "나루히토 일왕의 명식은 강한 돌파보다 조용한 조율의 기운이 먼저 보입니다. 이런 사주는 자기 목소리를 크게 내기보다 주어진 자리의 의미를 잃지 않는 데 힘을 씁니다. 왕실이라는 오래된 형식 안에서 현대의 흐름을 받아들이는 균형감이 중요합니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "imperial palace water metal five elements", imageSection: "default", body: "수는 외부 세계와의 유연한 소통이고, 금은 의례와 품위의 선입니다. 나루히토의 사주에서 관성은 자리의 책임으로 작용하고, 인성은 전통과 배움을 통해 그 책임을 감당하게 합니다. 그래서 화려한 카리스마보다 단정한 안정감이 운을 살립니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "imperial bridge river stars destiny", imageSection: "default", body: "이 명식의 운은 개인적 확장보다 계승과 전환의 흐름 속에서 읽어야 합니다. 시대가 바뀌는 문턱에서 과한 주장보다 안정된 상징성이 필요하고, 그 역할을 오래 지키는 것이 곧 운의 길입니다. 물처럼 낮게 흐를수록 더 멀리 갑니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "imperial moon river destiny", imageSection: "default", body: "나루히토 일왕은 크게 흔드는 별이 아니라, 오래된 강의 물길을 새 시대까지 이어 주는 명식입니다." },
    ],
  },
  "otani-shohei": {
    heroCopy: "오타니 쇼헤이의 명식은 불의 도전성과 금의 완성도가 동시에 살아 있는 이도류의 구조입니다. 하나의 길에 머무르지 않고, 두 개의 재능을 한 몸에서 조화시키려는 큰 그릇이 보입니다.",
    summary: "오타니 쇼헤이 사주의 핵심은 한계를 깨는 확장성과 철저한 자기관리입니다. 화의 기운은 새로운 도전을 향한 열망으로, 금의 기운은 기술을 정밀하게 완성하는 집중력으로 나타납니다. 이 명식은 재능이 많아 흩어지는 사주가 아니라, 두 재능을 하나의 운명적 상징으로 묶는 특별한 운동가의 사주입니다.",
    conclusion: "오타니 쇼헤이의 사주는 두 개의 태양을 한 하늘에 띄우려는 승부사의 명식입니다. 도전은 그의 언어이고, 절제는 그의 운을 지키는 법입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Shohei Ohtani baseball two way star destiny", imageSection: "career", body: "오타니 쇼헤이의 명식은 한쪽으로만 흐르기에는 그릇이 큽니다. 투수와 타자, 수비와 공격, 절제와 폭발이 동시에 살아야 운이 열립니다. 이런 사주는 평범한 기준으로 재단하면 오히려 빛이 줄고, 불가능해 보이는 균형을 실제 훈련으로 만들 때 크게 빛납니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "baseball fire metal five elements destiny", imageSection: "default", body: "화는 도전의 불이고, 금은 완성의 칼날입니다. 오타니의 사주에서 비겁은 자기 한계를 계속 밀어붙이는 경쟁심으로, 관성은 그 경쟁심을 루틴과 몸 관리 안에 묶어 두는 힘으로 작용합니다. 그래서 천재성은 즉흥이 아니라 엄격한 반복 속에서 살아납니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "baseball stadium two way road stars", imageSection: "default", body: "이 명식의 운은 낯선 판으로 갈수록 더 커집니다. 일본에서 미국으로, 하나의 역할에서 두 개의 역할로, 안정된 길에서 기록을 새로 쓰는 길로 운이 움직입니다. 다만 큰 불은 몸의 그릇을 태울 수 있으므로 회복과 절제가 곧 장기 운의 열쇠입니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "baseball bat glove stars destiny", imageSection: "default", body: "오타니 쇼헤이는 재능을 둘로 나눈 사람이 아니라, 두 재능을 하나의 별자리로 만든 명식입니다." },
    ],
  },
  "takeshi-kitano": {
    heroCopy: "기타노 다케시의 명식은 금의 냉정함과 화의 기괴한 웃음이 함께 놓인 예술가의 구조입니다. 코미디와 폭력, 침묵과 폭발을 한 화면 안에 넣으며 인간의 낯선 얼굴을 드러냅니다.",
    summary: "기타노 다케시 사주의 핵심은 모순을 자기 색으로 만드는 힘입니다. 금의 기운은 차갑고 간결한 연출로, 화의 기운은 갑작스러운 웃음과 충격으로 나타납니다. 이 명식은 부드럽게 설명하기보다 장면 하나로 관객의 감각을 깨우는 감독이자 배우의 사주입니다.",
    conclusion: "기타노 다케시의 사주는 웃음과 침묵, 상처와 아름다움이 동시에 번쩍이는 금화의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Takeshi Kitano cinema silence stars destiny", imageSection: "career", body: "기타노 다케시의 명식은 친절하게 감정을 설명하지 않습니다. 차갑게 비워 둔 공간 안에서 갑자기 웃음이나 폭력이 튀어나오는 식입니다. 이런 사주는 평범한 호감보다 독자적 색이 중요하며, 자기만의 리듬을 지킬 때 운이 크게 살아납니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "film comedy violence metal fire destiny", imageSection: "default", body: "금은 절단과 침묵, 화는 순간의 폭발입니다. 기타노의 사주에서 식상은 예측하기 어려운 표현으로 나오고, 편인의 기운은 보통 사람이 지나치는 어긋남과 공허를 오래 바라보게 합니다. 그래서 그의 작품은 웃긴데 슬프고, 잔혹한데 묘하게 맑습니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "Japanese cinema road night destiny", imageSection: "default", body: "이 명식은 한 분야에만 머무르면 답답해지는 흐름입니다. 코미디, 방송, 연기, 영화 연출이 서로 충돌하는 듯하지만 실제로는 한 사주의 다른 얼굴입니다. 운은 변신 속에서 열리고, 변신은 자기 중심을 잃지 않을 때 작품성이 됩니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "silent cinema stars blue destiny", imageSection: "default", body: "기타노 다케시는 웃음 뒤의 공허를 영화의 칼날로 깎아 내는 별입니다." },
    ],
  },
  "murakami-haruki": {
    heroCopy: "무라카미 하루키의 명식은 수의 고독과 목의 서사가 깊게 흐르는 작가의 구조입니다. 현실과 꿈의 경계를 조용히 열어 두고, 상실과 음악, 기억을 긴 문장 속에 흐르게 합니다.",
    summary: "무라카미 하루키 사주의 핵심은 고독을 세계관으로 바꾸는 능력입니다. 수의 기운은 무의식과 기억의 물길로, 목의 기운은 그 물길을 따라 자라는 서사로 나타납니다. 이 명식은 사건을 크게 외치는 작가가 아니라, 텅 빈 방 안에서 들리는 아주 작은 소리를 끝까지 따라가는 작가의 사주입니다.",
    conclusion: "무라카미 하루키의 사주는 고독이 문장이 되고, 문장이 또 다른 세계의 문이 되는 수목의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Haruki Murakami jazz night stars destiny", imageSection: "default", body: "무라카미 하루키의 명식은 겉으로 조용하지만 안쪽에는 깊은 물길이 흐릅니다. 이런 사주는 사람들 사이에서보다 혼자 있는 시간 속에서 더 많은 것을 듣습니다. 현실의 틈, 꿈의 잔향, 잃어버린 감각들이 그의 문장 속에서 천천히 형태를 얻습니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "jazz literature water wood five elements", imageSection: "default", body: "수는 무의식과 기억이고, 목은 이야기가 자라는 힘입니다. 인성은 읽고 사유하는 내면의 방을 만들고, 식상은 그 방에서 들려오는 소리를 문장으로 내보냅니다. 그래서 그의 작품은 줄거리보다 분위기, 설명보다 여백, 결론보다 긴 여운으로 운을 씁니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "writer desk night city destiny", imageSection: "default", body: "이 명식의 운은 반복과 고독 속에서 깊어집니다. 매일 쓰고, 달리고, 듣는 생활의 리듬이 작품 운을 지탱합니다. 큰 변곡점은 외부 사건보다 내면의 문이 열리는 순간에 오며, 세계적 확장은 오히려 가장 개인적인 고독을 끝까지 밀고 간 결과입니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "lonely writer moon jazz stars", imageSection: "default", body: "무라카미 하루키는 혼자 있는 밤의 소리를 세계의 언어로 번역하는 작가의 별입니다." },
    ],
  },
  "bruce-lee": {
    heroCopy: "이소룡의 명식은 불의 속도와 금의 절도가 번개처럼 만나는 무인의 구조입니다. 몸은 철저히 단련된 도구이고, 움직임은 철학을 드러내는 언어로 작동합니다.",
    summary: "이소룡 사주의 핵심은 몸과 정신을 하나로 만드는 힘입니다. 화의 기운은 폭발적인 속도와 존재감으로, 금의 기운은 동작의 정확성과 절단력으로 나타납니다. 이 명식은 싸움을 잘하는 팔자가 아니라, 무술을 통해 삶의 원리를 보여 주는 사주입니다.",
    conclusion: "이소룡의 사주는 번개처럼 짧았지만, 몸의 한 동작으로 세계의 무술관을 바꾼 불금의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Bruce Lee martial arts lightning stars destiny", imageSection: "career", body: "이소룡의 명식은 멈춰 있는 순간에도 속도가 느껴집니다. 화의 기운이 강하면 존재감이 커지고, 금의 기운이 살아 있으면 움직임이 군더더기 없이 날카로워집니다. 이 사주는 육체가 단순한 힘의 그릇이 아니라 정신의 칼날이 되는 구조입니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "martial arts fire metal five elements", imageSection: "default", body: "화는 순간의 폭발이고, 금은 정확한 절단입니다. 이소룡의 사주에서 식상은 몸으로 표현되는 철학이고, 비겁은 자기 한계를 밀어붙이는 투지입니다. 그래서 그의 무술은 형식에 갇히지 않고, 불필요한 것을 잘라 내며 본질만 남기는 방향으로 흐릅니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "martial artist cinema road stars", imageSection: "default", body: "이 명식의 운은 짧고 강한 불꽃처럼 전개됩니다. 동양과 서양, 무술과 영화, 몸과 철학의 경계를 넘으면서 세계적 상징이 됩니다. 다만 불기운이 강한 사주는 소모도 빠르므로, 그의 삶은 강렬한 빛과 짧은 시간의 비극을 함께 품습니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "dragon martial arts stars destiny", imageSection: "default", body: "이소룡은 싸움의 기술을 넘어, 움직임 하나로 자유의 철학을 보여 준 별입니다." },
    ],
  },
  "jackie-chan": {
    heroCopy: "성룡의 명식은 토의 버티는 힘과 화의 유쾌한 움직임이 결합된 액션 배우의 구조입니다. 위험을 웃음으로 바꾸고, 몸의 고통을 관객의 즐거움으로 전환하는 독특한 운이 보입니다.",
    summary: "성룡 사주의 핵심은 몸으로 운을 개척하는 능력입니다. 토의 기운은 넘어져도 다시 일어나는 회복력으로, 화의 기운은 장면을 밝히는 유머와 활력으로 나타납니다. 이 명식은 영웅처럼 완벽해 보이기보다, 다치고 구르면서도 끝내 웃게 만드는 생활형 영웅의 사주입니다.",
    conclusion: "성룡의 사주는 상처를 장면으로, 위험을 웃음으로 바꾸는 액션의 명식입니다. 몸이 곧 그의 운명이고, 유쾌함이 곧 그의 부적입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Jackie Chan action comedy stars destiny", imageSection: "career", body: "성룡의 명식은 고고한 거리감보다 현장에서 직접 부딪히는 힘이 강합니다. 토의 기운은 몸으로 버티고 쌓아 올리는 근성을 주며, 화의 기운은 그 고생을 무겁게만 보이지 않게 하는 밝은 활력을 줍니다. 그래서 그의 액션은 위험하지만 친근합니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "action cinema earth fire five elements", imageSection: "default", body: "토는 몸의 기억이고, 화는 장면의 생기입니다. 성룡의 사주에서 식상은 몸을 통한 표현으로 크게 열리고, 비겁은 수많은 시도와 실패를 견디는 현장성을 줍니다. 완벽한 초인이 아니라 계속 넘어지고 다시 일어나는 힘이 그의 별입니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "Hong Kong action film road destiny", imageSection: "default", body: "이 명식의 운은 어린 수련과 혹독한 현장을 지나 세계적 확장으로 열립니다. 살아나는 운은 편안한 자리보다 몸을 던지는 장면에서 찾아오고, 위험을 통제하는 경험이 쌓일수록 브랜드가 됩니다. 다만 몸의 손상이 운의 그릇을 약하게 만들 수 있어 관리가 매우 중요합니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "action comedy cinema stars destiny", imageSection: "default", body: "성룡은 넘어지는 순간까지 관객에게 웃음을 건네는 몸의 장인입니다." },
    ],
  },
  "jack-ma": {
    heroCopy: "마윈의 명식은 목의 확장성과 화의 설득력이 상업의 무대 위에서 크게 살아나는 기업가의 구조입니다. 작은 판을 크게 키우고, 보이지 않는 시장의 흐름을 사람들의 욕망과 연결하는 힘이 강합니다.",
    summary: "마윈 사주의 핵심은 말과 비전을 통해 사람과 자본, 기술의 흐름을 움직이는 능력입니다. 목의 기운은 새로운 판을 키우는 성장성으로, 화의 기운은 대중 앞에서 비전을 밝히는 설득력으로 나타납니다. 이 명식은 이미 있는 길을 걷는 팔자가 아니라, 아직 믿지 않는 사람들에게 미래의 문을 먼저 보여 주는 창업가의 사주입니다.",
    conclusion: "마윈의 사주는 시장의 빈틈을 보고 사람들의 마음에 불을 붙이는 확장형 기업가의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Jack Ma business stage stars destiny", imageSection: "career", body: "마윈의 명식은 조용히 계산만 하는 상인의 사주가 아닙니다. 사람 앞에 서서 가능성을 말하고, 그 말이 다시 사람과 돈과 기술을 움직이게 만드는 구조입니다. 목의 성장성이 강하면 처음에는 작아 보여도 판을 키우는 운이 있고, 화의 표현력이 붙으면 그 판에 대중의 시선이 모입니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "commerce platform fire wood five elements", imageSection: "default", body: "목은 확장이고 화는 설득입니다. 마윈의 사주에서 재성은 시장을 읽는 감각으로, 식상은 비전을 말로 풀어내는 힘으로 작용합니다. 그래서 사업은 단순한 거래가 아니라 이야기와 신뢰를 팔아 판을 여는 방식으로 전개됩니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "digital marketplace road stars destiny", imageSection: "default", body: "이 명식의 운은 작은 실패와 거절을 지나 큰 플랫폼으로 열립니다. 초년의 좌절은 운이 막힌 것이 아니라 설득력과 생존감을 단련하는 자리입니다. 큰 운에서는 확장이 빠르지만, 확장 이후에는 규율과 균형이 부족하면 운의 압박도 함께 커집니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "marketplace lights destiny stars", imageSection: "default", body: "마윈은 사람들이 보지 못한 시장의 문을 말과 비전으로 먼저 열어 보인 별입니다." },
    ],
  },
  confucius: {
    heroCopy: "공자의 명식은 토의 질서와 목의 도덕성이 깊게 뿌리내린 스승의 구조입니다. 혼란한 시대 속에서 예와 배움, 관계의 바른 자리를 세우려는 힘이 강하게 보입니다.",
    summary: "공자 사주의 핵심은 세상을 힘으로 고치기보다 사람의 마음과 질서를 바로 세우려는 기운입니다. 토의 중심성은 사회의 기틀과 예법으로, 목의 성장성은 교육과 수양의 길로 나타납니다. 이 명식은 한 시대의 권력을 얻는 팔자가 아니라, 여러 시대의 정신을 기르는 스승의 사주입니다.",
    conclusion: "공자의 사주는 혼란한 땅에 예의 뿌리를 심고, 배움을 통해 사람의 길을 세운 스승의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Confucius ancient scholar stars destiny", imageSection: "default", body: "공자의 명식은 빠르게 바꾸는 혁명가의 결보다 오래 세우는 스승의 결이 강합니다. 이런 사주는 당대에는 답답하게 보일 수 있어도, 시간이 지날수록 말의 무게가 커집니다. 중심을 잃은 시대에 무엇이 사람의 도리인지 묻는 힘이 그의 운을 이룹니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "ancient Chinese scholar earth wood five elements", imageSection: "default", body: "토는 질서와 중심이고, 목은 사람을 기르는 교육의 힘입니다. 공자의 사주에서 인성은 배움과 전통을 품고, 관성은 사회적 도리와 책임을 세웁니다. 그래서 그의 사상은 개인의 재능 과시가 아니라, 사람 사이의 관계를 바로잡는 길로 흐릅니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "ancient road teacher disciples destiny", imageSection: "default", body: "이 명식의 운은 현실 권력과 완전히 맞아떨어지기보다, 제자와 후대의 시간을 통해 열립니다. 당대의 좌절은 이름을 지우지 않고 오히려 사상의 순도를 높였습니다. 공자의 큰 운은 살아 있는 동안의 성공보다 죽은 뒤 오래 이어지는 가르침에서 완성됩니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "bamboo scroll stars wisdom destiny", imageSection: "default", body: "공자는 왕이 되지 않고도 수천 년의 마음을 다스린 스승의 별입니다." },
    ],
  },
  "taylor-swift": {
    heroCopy: "테일러 스위프트의 명식은 화의 무대성과 수의 서사 감각이 섬세하게 맞물린 작곡가형 스타의 구조입니다. 사랑과 상처, 기억과 복수를 모두 노래의 세계로 바꾸는 힘이 강합니다.",
    summary: "테일러 스위프트 사주의 핵심은 개인적 감정을 대중적 서사로 확장하는 능력입니다. 수의 기운은 기억과 관계의 미세한 감정을 길어 올리고, 화의 기운은 그것을 무대와 브랜드, 시대의 목소리로 밝힙니다. 이 명식은 단순한 팝 스타가 아니라 자기 인생을 거대한 이야기로 편집하는 창작자의 사주입니다.",
    conclusion: "테일러 스위프트의 사주는 사적인 일기를 세계의 합창으로 바꾸는 서사의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Taylor Swift concert stars destiny", imageSection: "career", body: "테일러 스위프트의 명식은 감정을 숨기지 않고 작품의 중심으로 가져오는 구조입니다. 상처와 설렘, 관계의 흔적을 그대로 흘려보내지 않고 노래와 이미지, 공연의 서사로 재구성합니다. 그래서 대중은 음악을 듣는 동시에 한 사람의 성장사를 따라가게 됩니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "pop music water fire five elements", imageSection: "default", body: "수는 기억이고 화는 무대의 빛입니다. 식상의 별은 작곡과 가사, 공연으로 자신을 표현하게 하고, 재성의 감각은 그 표현을 거대한 산업과 브랜드로 연결합니다. 감정이 상품으로만 흐르면 얕아질 수 있으나, 이 명식은 서사와 통제력으로 그 위험을 넘습니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "stadium tour road stars destiny", imageSection: "default", body: "이 명식의 운은 시대마다 자신의 이미지를 새로 편집할 때 열립니다. 컨트리에서 팝으로, 소녀의 고백에서 거대한 공연 서사로 변하는 과정은 단순한 변신이 아니라 운의 장르가 바뀐 것입니다. 운이 가장 강해지는 때는 자기 이야기를 남에게 빼앗기지 않을 때입니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "red microphone stadium stars destiny", imageSection: "default", body: "테일러 스위프트는 마음의 기록을 시대의 노래로 바꾸는 서사형 스타의 별입니다." },
    ],
  },
  "elon-musk": {
    heroCopy: "일론 머스크의 명식은 화의 돌파력과 금의 공학적 절단력이 강하게 충돌하는 개척자의 구조입니다. 안정된 길을 넓히기보다 불가능해 보이는 문을 부수고 새 판을 열려는 기운이 큽니다.",
    summary: "일론 머스크 사주의 핵심은 위험을 피하지 않고 미래의 물질적 형태로 밀어붙이는 힘입니다. 화의 기운은 비전과 속도로, 금의 기운은 기술과 시스템으로 나타납니다. 이 명식은 평온한 운영자보다 경계선을 깨는 창업가의 사주이며, 운이 강할수록 성취와 과열이 함께 커지는 구조입니다.",
    conclusion: "일론 머스크의 사주는 미래를 말로 예언하기보다 로켓과 공장, 코드와 배터리로 밀어붙이는 돌파형 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Elon Musk rocket technology stars destiny", imageSection: "career", body: "일론 머스크의 명식은 적당한 성공에 머물기 어렵습니다. 한계를 보면 돌아가기보다 뚫고 지나가려는 기운이 강하고, 현실의 저항이 클수록 오히려 더 큰 판을 상상합니다. 이런 사주는 강한 추진력이 복이지만, 동시에 과열을 조심해야 합니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "rocket fire metal technology five elements", imageSection: "default", body: "화는 미래를 밝히는 비전이고, 금은 그 비전을 기계와 시스템으로 자르는 힘입니다. 재성은 거대한 자본과 시장을 움직이고, 식상은 아이디어를 제품과 선언으로 밖에 내보냅니다. 다만 관성의 균형이 약해질 때는 규율과 관계의 마찰이 운의 부담으로 돌아옵니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "space road electric car destiny stars", imageSection: "default", body: "이 명식의 운은 한 산업 안에서 끝나지 않습니다. 결제, 전기차, 우주, 인공지능처럼 판을 옮길수록 강한 별이 살아납니다. 그러나 확장이 빠를수록 정리와 검증의 운도 필요합니다. 큰 불은 어둠을 밝히지만, 그릇이 약하면 주변을 태울 수 있습니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "rocket launch night stars destiny", imageSection: "default", body: "일론 머스크는 미래라는 이름의 불가능을 현실의 기계로 끌어내리려는 별입니다." },
    ],
  },
  "michael-jackson": {
    heroCopy: "마이클 잭슨의 명식은 화의 무대성과 수의 깊은 감수성이 극단적으로 빛나는 예술가의 구조입니다. 몸짓 하나가 음악이 되고, 음악 하나가 세계의 기억이 되는 강한 별이 보입니다.",
    summary: "마이클 잭슨 사주의 핵심은 무대 위에서 영혼 전체가 발광하는 힘입니다. 화의 기운은 압도적 존재감과 퍼포먼스로, 수의 기운은 상처와 감수성, 어린 영혼의 떨림으로 나타납니다. 이 명식은 대중의 사랑을 먹고 자라지만, 그 사랑의 압력에 마음이 쉽게 다칠 수 있는 예술가의 사주입니다.",
    conclusion: "마이클 잭슨의 사주는 춤과 목소리로 시대의 심장을 움직인 무대의 명식입니다. 빛이 너무 컸기에 그림자도 깊었습니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Michael Jackson moonwalk stage stars destiny", imageSection: "career", body: "마이클 잭슨의 명식은 무대에 오르는 순간 일상적 인간의 크기를 넘어섭니다. 화의 기운은 관객의 시선을 한 점에 모으고, 수의 감수성은 그 빛 아래에 외로움과 상처를 남깁니다. 그래서 그의 예술은 환희와 슬픔이 동시에 들립니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "pop dance fire water five elements", imageSection: "default", body: "화는 퍼포먼스의 태양이고, 수는 내면의 깊은 밤입니다. 식상의 별은 춤과 노래, 이미지로 폭발하고, 인성은 어린 시절부터 쌓인 감정의 기억을 붙잡습니다. 이 조합은 천재적 무대를 만들지만, 마음의 경계가 약해질 때 큰 소모를 부릅니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "global pop stage moon destiny", imageSection: "default", body: "이 명식의 운은 어린 나이에 세상 앞에 서며 매우 빠르게 열립니다. 큰 운은 세계적 상징을 만들지만, 동시에 사적인 삶을 보호하기 어렵게 합니다. 운을 오래 지키려면 빛의 크기만큼 어둠을 쉬게 할 공간이 필요했을 명식입니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "white glove moon stars destiny", imageSection: "default", body: "마이클 잭슨은 몸짓 하나로 지구의 리듬을 바꾼 무대의 별입니다." },
    ],
  },
  "steve-jobs": {
    heroCopy: "스티브 잡스의 명식은 금의 미감과 화의 선언력이 결합된 창조 경영자의 구조입니다. 기술을 차가운 도구로 두지 않고, 사람의 욕망과 감각을 건드리는 하나의 의식으로 바꾸는 힘이 강합니다.",
    summary: "스티브 잡스 사주의 핵심은 불필요한 것을 잘라 내고 본질만 남기는 능력입니다. 금의 기운은 디자인과 선택의 칼날로, 화의 기운은 세상 앞에 제품의 의미를 밝히는 무대성으로 나타납니다. 이 명식은 발명가와 예술가, 사업가의 기운이 한곳에서 충돌하며 강한 완성도를 만들어 내는 사주입니다.",
    conclusion: "스티브 잡스의 사주는 기술에 영혼의 형태를 입힌 금화의 명식입니다. 단순함은 그의 미학이고, 집요함은 그의 운명이었습니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Steve Jobs design technology stars destiny", imageSection: "career", body: "스티브 잡스의 명식은 많은 것을 더하기보다 끝까지 덜어내는 힘이 강합니다. 금의 기운은 무엇이 필요한지보다 무엇을 버려야 하는지를 알게 하고, 화의 기운은 남겨진 하나를 세상 앞에서 빛나게 합니다. 그래서 그의 창조는 기능보다 경험의 의식에 가깝습니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "minimal design metal fire five elements", imageSection: "default", body: "금은 완성의 기준이고, 화는 메시지의 빛입니다. 재성은 시장과 욕망을 읽고, 식상은 제품과 프레젠테이션으로 비전을 구체화합니다. 관성이 강하게 작동할 때는 기준이 품질이 되지만, 과하면 주변 사람에게 날카로운 압박으로 느껴질 수 있습니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "garage computer stage road destiny", imageSection: "default", body: "이 명식의 운은 추방과 복귀를 통해 더 강해집니다. 한 번 밀려난 경험은 단순한 좌절이 아니라 미감과 통제력의 순도를 높이는 시간으로 작용합니다. 큰 운은 두 번째 등장에서 열리며, 제품이 곧 철학이 되는 순간 이름이 시대의 상징이 됩니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "black turtleneck stage stars destiny", imageSection: "default", body: "스티브 잡스는 차가운 기계 위에 인간의 욕망과 아름다움을 새긴 별입니다." },
    ],
  },
  "martin-luther-king-jr": {
    heroCopy: "마틴 루터 킹의 명식은 목의 도덕성과 화의 연설력이 강하게 살아 있는 예언자형 지도자의 구조입니다. 꿈을 말하되 공허하게 띄우지 않고, 억눌린 사람들의 존엄을 시대의 언어로 세웁니다.",
    summary: "마틴 루터 킹 사주의 핵심은 정의를 말로 밝히고 사람들의 마음을 한 방향으로 모으는 힘입니다. 목의 기운은 평등과 성장의 이상으로, 화의 기운은 강력한 연설과 대중적 울림으로 나타납니다. 이 명식은 갈등을 증폭시키는 팔자가 아니라, 고통 속에서도 인간의 품격을 잃지 않으려는 영적 지도자의 사주입니다.",
    conclusion: "마틴 루터 킹의 사주는 꿈을 외친 사람이 아니라, 꿈이라는 말로 시대의 양심을 깨운 목화의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Martin Luther King speech stars destiny", imageSection: "default", body: "마틴 루터 킹의 명식은 말이 곧 촛불이 되는 구조입니다. 목의 기운은 사람을 살리고 키우려는 도덕적 방향으로, 화의 기운은 그 방향을 군중 앞에서 밝히는 연설의 힘으로 드러납니다. 그의 카리스마는 지배가 아니라 깨움에 가깝습니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "civil rights fire wood five elements", imageSection: "default", body: "목은 정의와 성장이고, 화는 말씀과 확산입니다. 관성은 더 높은 법과 양심을 세우고, 식상은 그 양심을 대중의 언어로 풀어냅니다. 그래서 그의 연설은 정치적 구호를 넘어 영적인 울림을 갖습니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "civil rights march road destiny", imageSection: "default", body: "이 명식의 운은 개인의 안온함보다 시대의 고통 속에서 열립니다. 강한 이상은 거센 저항을 부르지만, 그 저항이 오히려 사명의 무게를 증명합니다. 큰 운은 오래 사는 안정이 아니라 짧은 시간에 시대의 방향을 바꾸는 밀도로 나타납니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "I have a dream stars destiny", imageSection: "default", body: "마틴 루터 킹은 꿈을 말해 잠든 양심을 깨운 시대의 목소리입니다." },
    ],
  },
  "elvis-presley": {
    heroCopy: "엘비스 프레슬리의 명식은 화의 무대성과 금의 매력이 강하게 결합된 로큰롤의 구조입니다. 몸짓과 목소리, 반항과 달콤함이 한 몸에서 터져 나와 대중문화의 문을 새로 열었습니다.",
    summary: "엘비스 프레슬리 사주의 핵심은 억눌린 리듬을 대중 앞에서 폭발시키는 힘입니다. 화의 기운은 무대 위 존재감과 관능적 에너지로, 금의 기운은 목소리의 색과 스타의 윤곽으로 나타납니다. 이 명식은 단순한 가수가 아니라 한 시대의 몸짓과 욕망을 바꾼 상징의 사주입니다.",
    conclusion: "엘비스 프레슬리의 사주는 목소리와 몸짓으로 세대의 금기를 흔든 로큰롤의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Elvis Presley rock and roll stars destiny", imageSection: "career", body: "엘비스 프레슬리의 명식은 무대 위에서 즉시 시선을 끌어당기는 힘이 강합니다. 화의 기운은 관객의 열기를 만들고, 금의 기운은 그 열기에 선명한 윤곽과 매력을 줍니다. 이런 사주는 시대의 금기와 욕망을 몸으로 먼저 표현합니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "rock music fire metal five elements", imageSection: "default", body: "화는 폭발하는 리듬이고, 금은 스타의 선명한 이미지입니다. 식상은 노래와 몸짓으로 크게 열리고, 재성은 대중의 욕망을 끌어당기는 매력으로 작용합니다. 그래서 엘비스의 운은 음악적 재능만이 아니라 이미지와 시대 분위기가 함께 만든 큰 파도입니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "vintage stage road neon destiny", imageSection: "default", body: "이 명식은 젊은 시절의 폭발력이 매우 강합니다. 빠른 상승은 대중문화의 왕좌를 주지만, 동시에 몸과 마음의 소모도 크게 만듭니다. 화려한 운일수록 사적인 안정과 건강의 그릇이 필요했으며, 그 균형이 흔들릴 때 그림자가 깊어집니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "rock and roll microphone stars destiny", imageSection: "default", body: "엘비스 프레슬리는 한 시대의 심장 박동을 몸으로 먼저 들려준 무대의 별입니다." },
    ],
  },
  "bill-gates": {
    heroCopy: "빌 게이츠의 명식은 금의 체계성과 수의 지적 흐름이 결합된 설계자의 구조입니다. 보이지 않는 논리를 소프트웨어의 질서로 만들고, 축적된 부를 다시 사회적 책임의 물길로 돌리는 힘이 보입니다.",
    summary: "빌 게이츠 사주의 핵심은 복잡한 세계를 규칙과 시스템으로 정리하는 능력입니다. 금의 기운은 코드와 구조, 선택의 정확성으로 나타나고, 수의 기운은 정보와 전략의 흐름을 읽는 감각으로 작용합니다. 이 명식은 빠른 감각보다 긴 판을 보는 지성이 강한 기업가의 사주입니다.",
    conclusion: "빌 게이츠의 사주는 지식과 체계를 부로 바꾸고, 부를 다시 책임으로 돌리는 금수의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Bill Gates software library stars destiny", imageSection: "career", body: "빌 게이츠의 명식은 번쩍이는 쇼맨십보다 차갑고 정밀한 설계의 힘이 먼저 보입니다. 이런 사주는 세계를 감정으로 보기보다 구조와 규칙으로 읽습니다. 운이 열릴 때는 하나의 제품보다 표준과 생태계를 장악하는 방식으로 커집니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "software metal water five elements", imageSection: "default", body: "금은 체계와 기준이고 수는 정보의 흐름입니다. 재성은 시장을 읽는 감각으로, 인성은 지식과 분석의 축적으로 작용합니다. 그래서 그의 부는 단순한 장사 운이 아니라 기술의 표준을 선점한 구조적 재물운으로 읽힙니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "technology philanthropy road stars", imageSection: "default", body: "이 명식의 운은 초년의 집중과 중년의 확장, 후반의 환원으로 흐릅니다. 강한 금수의 기운은 지식과 돈을 쌓는 데 유리하지만, 말년 운에서는 그 축적을 어디로 흘려보내느냐가 격을 결정합니다. 자선과 공공 보건은 재성이 책임으로 바뀌는 흐름입니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "code window stars destiny", imageSection: "default", body: "빌 게이츠는 코드를 산업의 질서로 바꾸고, 질서를 다시 책임의 언어로 돌린 별입니다." },
    ],
  },
  "park-chan-ho": {
    heroCopy: "박찬호의 명식은 토의 인내와 금의 승부 감각이 함께 놓인 개척자의 구조입니다. 낯선 리그와 언어, 긴 마운드의 고독을 견디며 한국 야구의 길을 먼저 뚫은 별입니다.",
    summary: "박찬호 사주의 핵심은 버티는 힘으로 문을 여는 능력입니다. 토의 기운은 긴 훈련과 고독을 견디는 기반으로, 금의 기운은 승부의 순간에 공을 꽂아 넣는 결단으로 나타납니다. 이 명식은 한 번의 화려함보다 길을 만드는 책임이 큰 스포츠 개척자의 사주입니다.",
    conclusion: "박찬호의 사주는 낯선 마운드 위에서 나라의 길을 먼저 연 토금의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Park Chan-ho baseball mound stars destiny", imageSection: "career", body: "박찬호의 명식은 쉬운 길보다 먼저 건너는 길에 강합니다. 토의 기운은 흔들리는 환경에서도 중심을 잡고, 금의 기운은 승부의 선을 날카롭게 세웁니다. 해외 무대의 외로움은 이 사주에서 약점이 아니라 길을 여는 단련으로 작용합니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "baseball pitcher earth metal destiny", imageSection: "default", body: "토는 오래 버티는 힘이고 금은 정확한 결단입니다. 관성은 규율과 책임으로, 비겁은 경쟁 속에서 자신을 밀어 올리는 힘으로 작용합니다. 그래서 박찬호의 운은 개인 성적뿐 아니라 한국 야구 전체의 상징을 짊어지는 형태로 커졌습니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "major league road night destiny", imageSection: "default", body: "이 명식의 운은 국내의 안정된 무대보다 낯선 곳으로 나갈 때 더 크게 열립니다. 처음에는 고독하고 거칠지만, 버틴 시간이 후대의 길이 됩니다. 큰 운은 승수보다 개척의 의미에서 더 오래 남습니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "baseball road Korea stars", imageSection: "default", body: "박찬호는 혼자 오른 마운드 위에서 뒤따라올 세대의 길을 밝힌 별입니다." },
    ],
  },
  "kim-yuna": {
    heroCopy: "김연아의 명식은 금의 완성도와 수의 우아한 흐름이 결합된 예술형 승부사의 구조입니다. 얼음 위에서 감정은 절제되고, 절제는 다시 세계가 인정한 아름다움으로 빛납니다.",
    summary: "김연아 사주의 핵심은 압박 속에서도 선을 흐트러뜨리지 않는 힘입니다. 금의 기운은 기술의 정확성과 완성도로, 수의 기운은 유려한 흐름과 감정의 깊이로 나타납니다. 이 명식은 재능을 과시하는 팔자가 아니라, 재능을 극도로 정제해 품격으로 만드는 스포츠 예술가의 사주입니다.",
    conclusion: "김연아의 사주는 차가운 얼음 위에서 가장 맑은 선을 그린 금수의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Yuna Kim figure skating stars destiny", imageSection: "career", body: "김연아의 명식은 격정적인 폭발보다 완벽한 선의 긴장감이 먼저 보입니다. 금의 기운이 강하면 기준이 높고, 수의 기운이 흐르면 움직임이 굳지 않습니다. 그래서 그녀의 무대는 승부이면서 동시에 하나의 의식처럼 느껴집니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "figure skating metal water five elements", imageSection: "default", body: "금은 기술의 정확성이고 수는 흐름과 음악성입니다. 관성은 압박을 견디는 규율로, 식상은 몸으로 표현되는 예술성으로 작용합니다. 이 조합은 흔들림 없는 점프와 깊은 표현력을 동시에 가능하게 합니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "ice rink gold medal stars destiny", imageSection: "default", body: "이 명식의 운은 어린 나이부터 큰 압박과 함께 열립니다. 기대가 클수록 흔들릴 수 있으나, 금수의 균형이 살아 있으면 압박은 오히려 집중력의 통로가 됩니다. 은퇴 이후에도 이름의 품격이 유지되는 것은 운의 선이 흐트러지지 않았기 때문입니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "ice queen stars destiny", imageSection: "default", body: "김연아는 차가운 무대에서 세계가 숨을 죽이게 만든 완성의 별입니다." },
    ],
  },
  "park-se-ri": {
    heroCopy: "박세리의 명식은 토의 집념과 목의 개척성이 강하게 살아 있는 승부사의 구조입니다. 한 번 박힌 의지는 쉽게 흔들리지 않고, 어려운 판에서도 길을 만들어 후대를 이끄는 힘이 큽니다.",
    summary: "박세리 사주의 핵심은 버티며 돌파하는 개척운입니다. 토의 기운은 긴 훈련과 흔들리지 않는 멘탈로, 목의 기운은 새로운 무대를 향한 성장성과 도전으로 나타납니다. 이 명식은 개인 우승을 넘어 한국 골프의 문을 연 선구자의 사주입니다.",
    conclusion: "박세리의 사주는 진흙 속에서도 흔들리지 않고 길을 만든 토목의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Pak Se-ri golf stars destiny", imageSection: "career", body: "박세리의 명식은 강한 뿌리와 긴 호흡이 먼저 보입니다. 순간적인 화려함보다 끝까지 버티는 힘이 크고, 위기에서 포기하지 않는 근성이 운을 엽니다. 이런 사주는 한 사람의 성취가 곧 후대의 길이 되는 경우가 많습니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "golf earth wood five elements destiny", imageSection: "default", body: "토는 중심이고 목은 성장입니다. 비겁은 경쟁심과 자기 확신으로, 관성은 훈련과 경기 규율로 작용합니다. 박세리의 강점은 감정의 파도보다 목표를 향해 몸을 묵묵히 움직이는 지속성에 있습니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "golf green road victory destiny", imageSection: "default", body: "이 명식의 운은 어려운 환경을 뚫는 순간 크게 열립니다. 해외 무대와 큰 경기의 압박은 부담이지만 동시에 이름을 새기는 자리입니다. 맨발 투혼으로 상징되는 장면은 이 사주의 토기운이 가장 선명하게 드러난 순간입니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "golf green stars Korea destiny", imageSection: "default", body: "박세리는 한 번의 우승보다 한 세대의 가능성을 깨운 개척의 별입니다." },
    ],
  },
  "park-chung-hee": {
    heroCopy: "박정희의 명식은 금의 통제력과 화의 추진력이 강하게 맞물린 권력형 구조입니다. 산업화의 속도와 국가 운영의 강한 의지가 보이지만, 그만큼 권위와 균형의 그림자도 함께 읽히는 사주입니다.",
    summary: "박정희 사주의 핵심은 질서와 속도를 통해 시대를 밀어붙이는 힘입니다. 금의 기운은 규율과 통제, 군사적 판단으로 나타나고, 화의 기운은 빠른 실행과 국가적 동원력으로 드러납니다. 이 명식은 성취와 논쟁이 분리되지 않는 권력자의 사주입니다.",
    conclusion: "박정희의 사주는 강한 금화의 추진력으로 시대를 바꾸되, 그 힘의 그림자까지 함께 남긴 권력의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Park Chung-hee industrial Korea stars destiny", imageSection: "default", body: "박정희의 명식은 부드러운 조율보다 강한 명령과 추진이 먼저 보입니다. 금의 기운이 강하면 체계와 질서를 만들고, 화의 기운이 붙으면 빠르게 실행합니다. 이런 사주는 한 시대를 압축적으로 움직이는 힘이 있지만, 균형이 약하면 경직과 갈등도 커집니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "industrialization metal fire five elements", imageSection: "default", body: "금은 통제이고 화는 동원입니다. 관성은 국가와 조직의 규율로 작용하고, 재성은 경제 개발과 현실 성과를 향한 집착으로 나타납니다. 이 조합은 빠른 성과를 만들 수 있으나, 사람의 숨을 충분히 살피지 못하면 운의 빚이 남습니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "Korean industrial road night destiny", imageSection: "default", body: "이 명식의 운은 전쟁과 빈곤 이후의 강한 재건 흐름과 맞물려 열립니다. 시대가 속도를 요구할 때 그의 사주는 크게 작동했습니다. 그러나 권력운은 오래 잡을수록 스스로를 태우는 성질이 있어, 말년에는 강한 기운이 충돌로 돌아오기 쉽습니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "factory lights iron stars destiny", imageSection: "default", body: "박정희는 국가를 빠르게 움직인 강한 별이지만, 그 빛과 그림자를 함께 남긴 권력의 명식입니다." },
    ],
  },
  "kim-dae-jung": {
    heroCopy: "김대중의 명식은 수의 지혜와 목의 신념이 오래 버티는 정치가의 구조입니다. 거듭된 고난 속에서도 말과 사상을 잃지 않고, 민주주의와 평화의 물길을 끝까지 붙잡는 힘이 큽니다.",
    summary: "김대중 사주의 핵심은 고난을 사상과 외교의 힘으로 바꾸는 능력입니다. 수의 기운은 깊은 전략과 언어의 유연함으로, 목의 기운은 꺾이지 않는 민주주의의 신념으로 나타납니다. 이 명식은 박해 속에서 무너지는 팔자가 아니라, 박해를 통해 뜻의 뿌리가 더 깊어지는 정치가의 사주입니다.",
    conclusion: "김대중의 사주는 깊은 물처럼 오래 흐르고, 마침내 평화의 문을 두드린 수목의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Kim Dae-jung democracy peace stars destiny", imageSection: "default", body: "김대중의 명식은 빠른 힘보다 오래 견디는 지혜가 먼저 보입니다. 수의 기운은 복잡한 정세를 읽고, 목의 기운은 옳다고 믿는 방향을 끝까지 붙잡게 합니다. 이런 사주는 고난이 많을수록 말의 무게와 신념의 깊이가 커집니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "democracy water wood five elements", imageSection: "default", body: "수는 외교와 전략이고 목은 신념과 성장입니다. 인성은 사유와 독서, 사상으로 작용하고, 관성은 공적 책임과 민주주의의 원칙으로 나타납니다. 그래서 김대중의 정치운은 단순한 권력 쟁취보다 생존과 설득, 화해의 긴 흐름으로 읽힙니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "peace bridge Korea stars destiny", imageSection: "default", body: "이 명식의 운은 죽음의 문턱과 긴 박해를 지나 늦게 크게 열립니다. 젊은 시절의 고난은 운을 막은 것이 아니라 정치적 내공을 깊게 만들었습니다. 말년의 평화운은 오래 참은 물길이 마침내 넓은 강으로 열린 모습입니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "Nobel peace stars Korea destiny", imageSection: "default", body: "김대중은 오래 막힌 물길을 끝내 평화의 강으로 이끈 정치가의 별입니다." },
    ],
  },
  "han-kang": {
    heroCopy: "한강의 명식은 수의 심연과 금의 문장 감각이 고요하게 빛나는 작가의 구조입니다. 상처와 침묵, 몸과 기억을 깊이 들여다보며 말로 다할 수 없는 것을 문장으로 길어 올립니다.",
    summary: "한강 사주의 핵심은 고통의 밑바닥을 아름답지만 서늘한 언어로 바꾸는 힘입니다. 수의 기운은 인간 내면의 어둠과 기억을 깊이 살피고, 금의 기운은 그 감각을 날카롭고 절제된 문장으로 다듬습니다. 이 명식은 소리 높여 외치는 작가가 아니라 침묵의 중심을 오래 바라보는 작가의 사주입니다.",
    conclusion: "한강의 사주는 상처의 깊은 물을 맑고 차가운 문장으로 건져 올리는 금수의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Han Kang writer quiet night stars destiny", imageSection: "default", body: "한강의 명식은 화려한 서사보다 침묵의 무게가 먼저 느껴집니다. 수의 기운은 말해지지 않은 고통을 감지하고, 금의 기운은 그 고통을 과장 없이 정제합니다. 그래서 그의 문장은 조용하지만 오래 몸에 남습니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "literature water metal five elements", imageSection: "default", body: "수는 기억과 심연이고 금은 절제된 문장입니다. 인성은 깊은 사유로, 식상은 말과 이미지의 형태로 밖으로 나옵니다. 이 사주는 감정을 크게 폭발시키기보다, 차갑게 비워 둔 자리에서 독자가 스스로 떨림을 느끼게 합니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "writer desk rain night destiny", imageSection: "default", body: "이 명식의 운은 느리게 깊어지는 흐름입니다. 빠른 대중성보다 작품의 밀도가 먼저 쌓이고, 시간이 지나 세계가 그 침묵을 알아보는 방식으로 열립니다. 운이 깊어지는 자리는 더 크게 말하는 것이 아니라 더 정확히 침묵하는 데서 옵니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "white book rain stars destiny", imageSection: "default", body: "한강은 고통의 침묵을 세계가 읽을 수 있는 문장으로 바꾼 별입니다." },
    ],
  },
  "toyotomi-hideyoshi": {
    heroCopy: "도요토미 히데요시의 명식은 토의 야망과 화의 상승력이 거칠게 분출하는 권력자의 구조입니다. 낮은 자리에서 권력의 정상까지 치고 올라가는 힘이 강하지만, 확장이 과하면 운의 균형도 흔들립니다.",
    summary: "도요토미 히데요시 사주의 핵심은 신분의 한계를 돌파하는 현실 장악력입니다. 토의 기운은 판을 움켜쥐는 실용성과 권력욕으로, 화의 기운은 빠른 상승과 대중적 존재감으로 나타납니다. 이 명식은 난세에서 빛나는 출세운을 갖지만, 말년의 과도한 확장은 스스로 운의 균형을 무너뜨리는 흐름으로 읽힙니다.",
    conclusion: "도요토미 히데요시의 사주는 난세의 흙먼지 속에서 태양처럼 치솟았으나, 과한 확장으로 그림자를 부른 권력의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Toyotomi Hideyoshi samurai castle stars destiny", imageSection: "default", body: "도요토미 히데요시의 명식은 낮은 곳에 머무르지 못하는 상승의 기운이 강합니다. 토의 현실감은 권력의 판을 읽게 하고, 화의 기운은 기회를 잡는 순간 빠르게 이름을 키웁니다. 난세는 이 사주에게 위험이면서 동시에 사다리입니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "samurai earth fire five elements destiny", imageSection: "default", body: "토는 권력의 기반이고 화는 상승의 속도입니다. 재성은 현실적 이익과 판세를 읽는 감각으로, 비겁은 경쟁 속에서 자신을 밀어 올리는 힘으로 나타납니다. 그러나 강한 야망은 균형을 잃으면 정복욕으로 흐르기 쉽습니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "Japanese castle war road destiny", imageSection: "default", body: "이 명식의 운은 초중년에 크게 솟구칩니다. 낮은 출발은 오히려 권력 감각을 날카롭게 만들고, 통일의 성취로 운이 절정에 이릅니다. 다만 말년의 원정과 확장은 강한 토화가 과열된 모습으로, 큰 운의 끝에는 반드시 절제가 필요했음을 보여 줍니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "gold castle moon stars destiny", imageSection: "default", body: "도요토미 히데요시는 난세를 딛고 올랐지만, 정점에서 절제를 잃은 권력의 별입니다." },
    ],
  },
  "akira-kurosawa": {
    heroCopy: "쿠로사와 아키라의 명식은 금의 구도감과 수의 인간 이해가 결합된 영화 거장의 구조입니다. 칼과 비, 침묵과 군중을 한 화면 안에 배치하며 인간의 명예와 욕망을 깊게 응시합니다.",
    summary: "쿠로사와 아키라 사주의 핵심은 장면을 운명처럼 조각하는 힘입니다. 금의 기운은 화면 구성과 서사의 절도로, 수의 기운은 인간 심리와 비극의 깊이로 나타납니다. 이 명식은 영화를 찍는 기술자가 아니라, 인간의 내면을 거대한 시각 언어로 세운 감독의 사주입니다.",
    conclusion: "쿠로사와 아키라의 사주는 비와 칼, 인간의 얼굴을 영화적 운명으로 새긴 금수의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Akira Kurosawa samurai cinema rain stars", imageSection: "career", body: "쿠로사와 아키라의 명식은 장면 하나도 허투루 놓지 않는 금의 결이 강합니다. 수의 깊이는 인물의 고독과 갈등을 들여다보게 하고, 금의 절도는 그 감정을 화면의 구조로 고정합니다. 그래서 그의 영화는 거칠면서도 정교합니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "cinema rain sword metal water destiny", imageSection: "default", body: "금은 화면의 선이고 수는 인간의 심연입니다. 식상은 강력한 이미지와 연출로 밖으로 나오고, 편인의 기운은 세계를 독자적 시선으로 바라보게 합니다. 이 조합은 시대극을 넘어 보편적 인간 드라마를 만드는 힘입니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "film set rain road destiny stars", imageSection: "default", body: "이 명식의 운은 국내의 거장성을 넘어 세계 영화의 문법으로 확장됩니다. 초년의 훈련은 중년의 걸작으로, 말년의 고독은 더 깊은 작품 세계로 바뀝니다. 운은 흥행보다 장면의 생명력으로 오래 남습니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "samurai silhouette rain stars destiny", imageSection: "default", body: "쿠로사와 아키라는 비 내리는 화면 속에 인간의 운명을 칼처럼 새긴 별입니다." },
    ],
  },
  "namie-amuro": {
    heroCopy: "아무로 나미에의 명식은 화의 무대성과 금의 스타일 감각이 선명한 팝 아이콘의 구조입니다. 빠른 리듬과 절제된 이미지, 시대를 앞서는 감각으로 한 세대의 스타일을 바꿨습니다.",
    summary: "아무로 나미에 사주의 핵심은 무대 위 자기 완성도와 시대적 감각입니다. 화의 기운은 퍼포먼스와 대중적 열기로, 금의 기운은 스타일과 이미지의 정확성으로 나타납니다. 이 명식은 오래 설명하기보다 한 장면, 한 실루엣, 한 리듬으로 시대를 움직이는 스타의 사주입니다.",
    conclusion: "아무로 나미에의 사주는 무대와 스타일로 시대의 속도를 바꾼 금화의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Namie Amuro J-pop stage stars destiny", imageSection: "career", body: "아무로 나미에의 명식은 무대 위에서 이미지가 곧 언어가 되는 구조입니다. 화의 기운은 관객의 열기를 만들고, 금의 기운은 그 열기를 세련된 스타일로 정리합니다. 그래서 그의 존재감은 노래뿐 아니라 시대의 감각 전체에 남습니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "J-pop dance fire metal five elements", imageSection: "default", body: "화는 퍼포먼스이고 금은 스타일의 선입니다. 식상은 춤과 노래로 크게 열리고, 재성은 대중의 취향을 민감하게 끌어당깁니다. 이 조합은 유행을 따르는 것이 아니라 유행의 기준을 바꾸는 힘으로 작용합니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "pop queen farewell tour destiny", imageSection: "default", body: "이 명식의 운은 젊은 시절 빠르게 열리고, 긴 시간 자기 이미지를 지키며 완성됩니다. 중요한 것은 계속 노출되는 것이 아니라 퇴장까지 하나의 미학으로 만드는 감각입니다. 은퇴의 선택 또한 금의 절제가 살아 있는 운의 마무리로 읽힙니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "J-pop queen lights stars destiny", imageSection: "default", body: "아무로 나미에는 무대 위의 움직임으로 한 시대의 스타일을 다시 쓴 별입니다." },
    ],
  },
  "napoleon-bonaparte": {
    heroCopy: "나폴레옹의 명식은 금의 군사적 결단과 토의 권력 장악력이 강하게 솟은 정복자의 구조입니다. 시대의 혼란을 자신의 질서로 재편하려는 힘이 크지만, 과한 팽창은 운의 균형을 무너뜨립니다.",
    summary: "나폴레옹 사주의 핵심은 전략과 야망이 결합된 압도적 실행력입니다. 금의 기운은 전쟁의 판단과 법제의 정비로, 토의 기운은 제국의 중심을 세우려는 권력욕으로 나타납니다. 이 명식은 난세에서 비상하는 별이지만, 한계를 인정하지 않을 때 몰락의 문도 함께 열리는 사주입니다.",
    conclusion: "나폴레옹의 사주는 전쟁과 법, 야망과 몰락을 한 몸에 품은 금토의 제왕 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Napoleon battlefield empire stars destiny", imageSection: "default", body: "나폴레옹의 명식은 작은 판에 머무르기 어렵습니다. 금의 기운은 전장의 질서를 읽고, 토의 기운은 그 질서를 제국의 중심으로 묶으려 합니다. 난세의 혼란은 그에게 위험보다 기회의 얼굴로 다가옵니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "empire metal earth five elements destiny", imageSection: "default", body: "금은 결단이고 토는 지배의 기반입니다. 비겁은 강한 자기 확신으로, 관성은 군사와 법의 질서로 작용합니다. 이 조합은 압도적인 추진력을 만들지만, 자신과 세계를 동일시할 때 운의 과열이 시작됩니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "European campaign road snow destiny", imageSection: "default", body: "이 명식의 운은 혁명기의 혼란 속에서 급상승합니다. 전쟁과 제도 정비에서 큰 이름을 얻지만, 러시아 원정처럼 한계를 넘는 확장은 강한 금토가 얼어붙는 형상입니다. 큰 운일수록 멈출 줄 아는 절제가 필요했습니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "imperial crown battlefield stars", imageSection: "default", body: "나폴레옹은 시대를 자신의 발아래 모았지만, 끝내 운명의 경계까지 정복하지는 못한 별입니다." },
    ],
  },
  "zhang-yimou": {
    heroCopy: "장이머우의 명식은 토의 장대한 화면감과 화의 색채 감각이 강하게 살아 있는 영상 시인의 구조입니다. 역사와 인간의 운명을 붉은 색, 넓은 공간, 집단의 리듬으로 펼쳐내는 힘이 큽니다.",
    summary: "장이머우 사주의 핵심은 시각적 질서와 색채의 권능입니다. 토의 기운은 거대한 무대와 역사적 무게로, 화의 기운은 강렬한 색과 감정의 빛으로 나타납니다. 이 명식은 이야기를 말로 설명하기보다 화면 전체의 압력으로 관객을 움직이는 감독의 사주입니다.",
    conclusion: "장이머우의 사주는 색채와 군무, 역사와 인간을 거대한 화면으로 엮는 토화의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Zhang Yimou red lantern cinema stars destiny", imageSection: "career", body: "장이머우의 명식은 작은 장면보다 큰 화면에서 빛납니다. 토의 기운은 역사와 공간의 무게를 만들고, 화의 기운은 그 공간에 강렬한 색과 감정을 입힙니다. 그래서 그의 영화는 이야기 이전에 색채와 구도가 먼저 운을 압도합니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "cinema color earth fire five elements", imageSection: "default", body: "토는 무대의 기반이고 화는 색의 폭발입니다. 식상은 영상적 표현으로 크게 열리고, 재성은 대중성과 규모의 감각으로 작용합니다. 이 조합은 예술영화와 국가적 이벤트, 개인 서사와 집단 미학을 함께 다루게 합니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "Olympic ceremony red stage destiny", imageSection: "default", body: "이 명식의 운은 초기의 예술적 인정에서 대형 연출의 흐름으로 확장됩니다. 작은 인간의 비극을 다루던 감각이 거대한 국가적 장면으로 커지는 것은 토화의 스케일이 넓어진 모습입니다. 운은 색채가 곧 권력이 되는 자리에서 크게 열립니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "red cinema lantern stars destiny", imageSection: "default", body: "장이머우는 색채로 역사를 말하고, 화면으로 시대의 숨을 지휘하는 별입니다." },
    ],
  },
  "mao-zedong": {
    heroCopy: "마오쩌둥의 명식은 수의 이념적 깊이와 금의 권력적 절단력이 강하게 충돌하는 혁명가의 구조입니다. 거대한 시대를 움직인 힘이 크지만, 그 힘은 빛과 그림자를 함께 남깁니다.",
    summary: "마오쩌둥 사주의 핵심은 사상을 현실 권력으로 밀어붙이는 압도적 의지입니다. 수의 기운은 이념과 전략, 장기 투쟁의 물길로 나타나고, 금의 기운은 적과 아군을 가르는 강한 절단력으로 작용합니다. 이 명식은 대중을 움직이는 혁명운이 강하지만, 균형을 잃으면 거대한 시대적 상처도 함께 만드는 사주입니다.",
    conclusion: "마오쩌둥의 사주는 혁명의 물길과 권력의 칼날이 함께 흐른 거대한 시대의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Mao Zedong revolution stars destiny", imageSection: "default", body: "마오쩌둥의 명식은 개인의 안온한 삶보다 거대한 집단의 흐름을 움직이는 데 기운이 쏠립니다. 수의 깊이는 장기 전략과 이념의 물길을 만들고, 금의 강함은 그 물길을 권력의 방향으로 자릅니다. 이런 사주는 시대를 바꾸지만, 동시에 시대를 크게 흔듭니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "revolution water metal five elements", imageSection: "default", body: "수는 사상과 대중의 흐름이고 금은 절단과 통제입니다. 편인은 독자적 이념으로, 관성은 권력과 조직의 장악으로 나타납니다. 이 조합은 흔들리는 시대에는 강한 구심점이 되지만, 과하면 사람의 삶을 이념의 도구로 만들 위험이 있습니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "long march revolution road destiny", imageSection: "default", body: "이 명식의 운은 긴 투쟁과 생존, 권력 장악을 통해 커집니다. 초기의 고난은 혁명적 정당성을 키우고, 집권 이후에는 강한 기운이 국가 전체에 작용합니다. 다만 대운의 후반에는 통제의 과잉이 운의 그림자로 깊게 남습니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "red flag mountain stars destiny", imageSection: "default", body: "마오쩌둥은 한 나라의 물길을 바꾼 별이지만, 그 물결의 거센 상처까지 함께 남긴 명식입니다." },
    ],
  },
  "barack-obama": {
    heroCopy: "버락 오바마의 명식은 수의 유연한 지성과 목의 이상주의가 정치의 언어로 빛나는 지도자의 구조입니다. 분열된 흐름을 말과 상징으로 잇고, 새로운 세대의 가능성을 부드럽게 열어 보입니다.",
    summary: "버락 오바마 사주의 핵심은 설득과 조율의 힘입니다. 수의 기운은 복잡한 정세와 사람의 마음을 읽는 감각으로, 목의 기운은 성장과 변화의 이상으로 나타납니다. 이 명식은 강압보다 언어와 품격, 상징을 통해 운을 여는 정치가의 사주입니다.",
    conclusion: "버락 오바마의 사주는 말의 물길로 사람들을 잇고, 변화의 나무를 시대 위에 세운 수목의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Barack Obama speech stars destiny", imageSection: "default", body: "버락 오바마의 명식은 거친 힘보다 부드러운 설득의 결이 강합니다. 수의 기운은 상대의 언어를 이해하게 하고, 목의 기운은 그 이해를 미래의 방향으로 자라게 합니다. 그래서 그의 리더십은 압도보다 연결에 가깝습니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "politics speech water wood five elements", imageSection: "default", body: "수는 지성과 외교이고 목은 변화와 성장입니다. 인성은 학습과 사유로, 식상은 연설과 대중적 메시지로 나타납니다. 관성은 공적 책임과 품격으로 작용해 그의 정치적 이미지를 단정하게 만듭니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "White House road stars destiny", imageSection: "default", body: "이 명식의 운은 개인의 배경을 시대적 상징으로 바꿀 때 크게 열립니다. 다층적 정체성은 혼란이 아니라 연결의 언어가 되었고, 변화의 메시지는 대중의 기대를 모았습니다. 다만 이상이 클수록 현실 정치의 벽도 함께 높아지는 구조입니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "hope speech stars destiny", imageSection: "default", body: "버락 오바마는 갈라진 시대에 말의 다리를 놓은 정치의 별입니다." },
    ],
  },
  "steve-wozniak": {
    heroCopy: "스티브 워즈니악의 명식은 금의 공학적 정밀함과 수의 놀이 같은 지성이 결합된 창조 기술자의 구조입니다. 권력보다 만들기의 기쁨이 먼저이며, 복잡한 회로를 사람에게 가까운 도구로 바꾸는 힘이 큽니다.",
    summary: "스티브 워즈니악 사주의 핵심은 순수한 기술적 창의성입니다. 금의 기운은 회로와 구조, 정확한 구현력으로 나타나고, 수의 기운은 호기심과 유연한 사고로 흐릅니다. 이 명식은 시장을 지배하는 사주라기보다, 기술의 본질을 즐기며 새 문을 여는 엔지니어의 사주입니다.",
    conclusion: "스티브 워즈니악의 사주는 회로 속에 장난기와 천재성을 함께 숨긴 금수의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Steve Wozniak computer circuit stars destiny", imageSection: "career", body: "스티브 워즈니악의 명식은 과시보다 순수한 만들기의 기쁨이 먼저 보입니다. 금의 정밀함은 회로와 설계로, 수의 유연함은 새로운 방식의 문제 해결로 나타납니다. 이런 사주는 권력보다 작동하는 아름다움에 더 큰 만족을 느낍니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "computer engineering metal water five elements", imageSection: "default", body: "금은 구조이고 수는 아이디어의 흐름입니다. 인성은 깊은 이해로, 식상은 실제로 작동하는 장치로 밖으로 나옵니다. 그래서 그의 창의성은 추상적 발상이 아니라 손끝에서 완성되는 발명으로 빛납니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "garage computer stars destiny", imageSection: "default", body: "이 명식의 운은 작은 작업실과 친구 관계 속에서 크게 열립니다. 거대한 조직보다 자유로운 실험의 공간이 운을 살리고, 순수한 기술이 시대의 산업으로 확장됩니다. 이름의 격은 시장 지배보다 원형을 만든 사람의 깊이에서 나옵니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "circuit board stars destiny", imageSection: "default", body: "스티브 워즈니악은 기술을 권력보다 놀이와 자유에 가깝게 만든 엔지니어의 별입니다." },
    ],
  },
  madonna: {
    heroCopy: "마돈나의 명식은 화의 도발성과 금의 자기 연출력이 강하게 살아 있는 변신형 스타의 구조입니다. 시대의 금기를 읽고, 그 금기를 무대와 이미지로 뒤집어 자신의 왕국을 만듭니다.",
    summary: "마돈나 사주의 핵심은 끊임없는 재창조입니다. 화의 기운은 대담한 무대성과 욕망의 표현으로, 금의 기운은 이미지와 스타일의 통제력으로 나타납니다. 이 명식은 사랑받기 위해 맞추는 팔자가 아니라, 기준을 흔들어 대중이 자신을 따라오게 만드는 사주입니다.",
    conclusion: "마돈나의 사주는 변신을 무기로 시대의 욕망을 지휘한 금화의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Madonna pop queen stage stars destiny", imageSection: "career", body: "마돈나의 명식은 순응보다 도발의 힘이 강합니다. 화의 기운은 무대 위 욕망을 숨기지 않고, 금의 기운은 그 욕망을 선명한 이미지로 다듬습니다. 그래서 그는 유행을 따르기보다 논쟁을 통해 유행을 새로 만듭니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "pop icon fire metal five elements", imageSection: "default", body: "화는 폭발과 노출이고 금은 통제와 스타일입니다. 식상은 몸과 음악, 이미지로 크게 열리고, 재성은 대중의 시선을 자산으로 바꿉니다. 이 사주는 금기를 두려워하지 않을 때 운이 열리지만, 자기 통제력을 잃으면 소모도 빠르게 커집니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "pop reinvention road stars destiny", imageSection: "default", body: "이 명식의 운은 한 번의 성공에 머물지 않고 계속 껍질을 갈아입을 때 살아납니다. 시대가 변할 때마다 이미지와 메시지를 새로 구성하는 능력이 장기 운의 핵심입니다. 변신 자체가 그의 운을 지키는 의식입니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "pop queen neon cross stars", imageSection: "default", body: "마돈나는 금기를 무대의 왕관으로 바꾼 변신의 별입니다." },
    ],
  },
  "martin-scorsese": {
    heroCopy: "마틴 스코세이지의 명식은 화의 강렬한 죄의식과 금의 영화적 절단력이 결합된 감독의 구조입니다. 폭력과 신앙, 욕망과 구원을 한 화면 안에 몰아넣는 힘이 큽니다.",
    summary: "마틴 스코세이지 사주의 핵심은 인간의 죄와 구원을 집요하게 파고드는 시선입니다. 화의 기운은 격렬한 감정과 도시의 열기로, 금의 기운은 편집과 리듬, 장면의 칼날로 나타납니다. 이 명식은 편안한 이야기를 만드는 감독이 아니라, 인간의 어두운 심장을 영화로 해부하는 사주입니다.",
    conclusion: "마틴 스코세이지의 사주는 도시의 불빛 아래 죄와 구원을 동시에 바라보는 금화의 영화 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Martin Scorsese cinema city stars destiny", imageSection: "career", body: "마틴 스코세이지의 명식은 고요한 균형보다 강한 내적 긴장이 먼저 느껴집니다. 화의 기운은 분노와 욕망, 신앙적 갈등을 끌어올리고, 금의 기운은 그 뜨거운 감정을 영화의 리듬으로 잘라 냅니다. 그래서 그의 작품은 살아 있는 상처처럼 박동합니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "cinema city fire metal five elements", imageSection: "default", body: "화는 인간의 죄와 열망이고 금은 편집과 판단의 칼입니다. 편인의 기운은 어두운 인간 심리를 오래 응시하게 하고, 식상은 그 응시를 강렬한 이미지와 음악, 카메라 움직임으로 밖에 냅니다. 영화는 그에게 고백이자 심판입니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "New York cinema road destiny", imageSection: "default", body: "이 명식의 운은 도시와 남성성, 폭력과 구원의 주제를 반복하며 깊어집니다. 반복은 한계가 아니라 자신의 업을 계속 다른 각도에서 닦는 수행입니다. 말년으로 갈수록 영화사의 기억과 개인적 신앙이 더 크게 겹쳐집니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "film reel city night stars", imageSection: "default", body: "마틴 스코세이지는 인간의 죄를 영화의 리듬으로 고백하게 만든 감독의 별입니다." },
    ],
  },
  "leonardo-da-vinci": {
    heroCopy: "레오나르도 다 빈치의 명식은 목의 호기심과 수의 무한한 관찰력이 결합된 천재의 구조입니다. 예술과 과학, 해부와 비행, 미와 기계를 하나의 우주처럼 바라보는 별입니다.",
    summary: "레오나르도 다 빈치 사주의 핵심은 세계 전체를 배우고 연결하려는 힘입니다. 목의 기운은 끝없는 성장과 탐구로, 수의 기운은 자연의 숨은 원리를 읽는 관찰력으로 나타납니다. 이 명식은 한 분야의 장인이 아니라, 모든 분야가 서로 통한다고 믿는 르네상스형 천재의 사주입니다.",
    conclusion: "레오나르도 다 빈치의 사주는 붓과 해부도, 날개와 물길을 하나의 우주로 엮은 수목의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Leonardo da Vinci notebooks stars destiny", imageSection: "default", body: "레오나르도 다 빈치의 명식은 한곳에 머물기에는 질문이 너무 많습니다. 목의 기운은 계속 자라고, 수의 기운은 보이지 않는 원리를 끝없이 비춥니다. 이런 사주는 세상의 모든 현상을 서로 연결된 비밀로 바라봅니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "renaissance art science water wood five elements", imageSection: "default", body: "목은 탐구의 가지이고 수는 지혜의 샘입니다. 인성은 관찰과 학습으로, 식상은 그림과 설계, 발명으로 밖으로 나옵니다. 예술과 과학이 따로 갈라지지 않는 이유는 명식 안에서 감각과 원리가 함께 흐르기 때문입니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "Renaissance workshop stars destiny", imageSection: "default", body: "이 명식의 운은 완성보다 탐구 자체에서 깊어집니다. 미완성도 실패가 아니라 다음 질문으로 넘어가는 문입니다. 후대가 그의 노트를 다시 읽는 것은, 그의 운이 당대보다 훨씬 넓은 시간 속에서 열리기 때문입니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "Mona Lisa flying machine stars", imageSection: "default", body: "레오나르도 다 빈치는 세계를 하나의 살아 있는 수수께끼로 본 별입니다." },
    ],
  },
  "albert-einstein": {
    heroCopy: "알베르트 아인슈타인의 명식은 수의 우주적 통찰과 목의 자유로운 상상력이 결합된 사상가형 과학자의 구조입니다. 보이지 않는 시간과 공간의 결을 직관으로 붙잡아 새로운 세계관을 열었습니다.",
    summary: "알베르트 아인슈타인 사주의 핵심은 상상력으로 우주의 법칙을 다시 읽는 힘입니다. 수의 기운은 깊은 사유와 직관으로, 목의 기운은 기존 틀을 넘어서는 자유로운 사고로 나타납니다. 이 명식은 계산만 강한 학자가 아니라, 우주의 언어를 이미지처럼 느끼고 다시 수식으로 옮기는 천재의 사주입니다.",
    conclusion: "알베르트 아인슈타인의 사주는 시간과 빛, 중력과 상상력을 하나의 통찰로 묶은 수목의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "Albert Einstein cosmos stars destiny", imageSection: "default", body: "알베르트 아인슈타인의 명식은 책상 위 계산보다 먼저 머릿속 우주가 움직이는 구조입니다. 수의 깊이는 보이지 않는 원리를 감지하고, 목의 자유는 기존 권위의 틀을 넘어섭니다. 이런 사주는 남들이 당연하다고 여기는 것을 다시 묻습니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "relativity water wood five elements cosmos", imageSection: "default", body: "수는 직관과 심연이고 목은 새로운 사고의 성장입니다. 편인의 기운은 독창적 관점으로, 식상은 그 관점을 논문과 이론으로 밖으로 냅니다. 그래서 그의 천재성은 외운 지식보다 세계를 다르게 보는 능력에서 나옵니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "physics blackboard stars destiny", imageSection: "default", body: "이 명식의 운은 주류의 중심에서 곧장 열리기보다 주변부의 고독한 사유 속에서 깊어집니다. 특허청의 시간과 독립적 사고는 오히려 운의 문이 됩니다. 이후 세계적 명성은 개인의 발견을 인류의 세계관으로 바꾸는 흐름입니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "light beam universe stars destiny", imageSection: "default", body: "아인슈타인은 빛을 따라가며 시간의 문을 연 우주의 사상가입니다." },
    ],
  },
  "william-shakespeare": {
    heroCopy: "윌리엄 셰익스피어의 명식은 수의 인간 심리와 화의 극적 표현력이 결합된 극작가의 구조입니다. 왕과 광대, 사랑과 질투, 욕망과 죽음을 한 무대 위에 올려 인간 전체를 비춥니다.",
    summary: "윌리엄 셰익스피어 사주의 핵심은 인간의 마음을 끝없이 다른 얼굴로 말하게 하는 힘입니다. 수의 기운은 심리의 어둠과 욕망을 읽고, 화의 기운은 그것을 대사와 장면, 무대의 열기로 밝힙니다. 이 명식은 특정 시대의 작가를 넘어 인간 자체의 거울이 되는 사주입니다.",
    conclusion: "윌리엄 셰익스피어의 사주는 인간의 모든 얼굴을 무대 위 별자리로 바꾼 수화의 명식입니다.",
    sections: [
      { title: famousSajuCopy("section.firstImpression"), imageQuery: "William Shakespeare theatre stars destiny", imageSection: "default", body: "셰익스피어의 명식은 인간을 단순하게 보지 않습니다. 수의 깊이는 마음의 모순을 읽고, 화의 표현력은 그 모순을 대사와 사건으로 밝힙니다. 그래서 그의 인물들은 선악 중 하나로 갇히지 않고 살아 있는 인간처럼 흔들립니다." },
      { title: famousSajuCopy("section.elementTenGod"), imageQuery: "theatre water fire five elements", imageSection: "default", body: "수는 심리와 비밀이고 화는 무대와 언어의 빛입니다. 식상은 대사와 희곡으로 크게 열리고, 편인의 기운은 인간 본성을 독자적으로 해석하게 합니다. 이 조합은 웃음과 비극, 왕권과 욕망을 한 작품 안에서 동시에 살립니다." },
      { title: famousSajuCopy("section.luckFlow"), imageQuery: "Globe Theatre night stars destiny", imageSection: "default", body: "이 명식의 운은 극장이라는 살아 있는 공간에서 열립니다. 대중의 웃음과 귀족의 취향, 시대의 정치와 인간의 본능을 모두 흡수해 작품으로 내보냅니다. 시간이 흐를수록 그의 운은 영국을 넘어 인간 보편의 언어로 확장됩니다." },
      { title: famousSajuCopy("section.destinySentence"), imageQuery: "quill theatre moon stars destiny", imageSection: "default", body: "셰익스피어는 인간의 마음을 무대 위에 풀어 놓아 시대가 바뀌어도 다시 살아나게 만든 별입니다." },
    ],
  },
};

function parseBirthDate(birthDate: string) {
  const [year, month, day] = birthDate.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) throw new Error(`Invalid birthDate: ${birthDate}`);
  return { year, month, day };
}

function parseBirthTime(birthTime?: string | null) {
  if (!birthTime) return null;
  const [hourText, minuteText = "0"] = birthTime.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return { hour, minute };
}

function countPillarElements(pillar: SajuPillarLocal | null, counts: Record<ElementKey, number>) {
  if (!pillar) return;
  const stemEl = elementByStem[pillar.stem] as ElementKey | undefined;
  const branchEl = elementByBranch[pillar.branch] as ElementKey | undefined;
  if (stemEl) counts[stemEl] += 1;
  if (branchEl) counts[branchEl] += 1;
}

function buildEmptyElementProfile(): FamousSajuElementProfile {
  return {
    counts: { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 },
    ratios: { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 },
    dominantElement: "확인 필요",
    weakElement: "확인 필요",
  };
}

function buildElementProfile(saju: LocalSajuResult): FamousSajuElementProfile {
  const counts: Record<ElementKey, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  countPillarElements(saju.pillars.year, counts);
  countPillarElements(saju.pillars.month, counts);
  countPillarElements(saju.pillars.day, counts);
  countPillarElements(saju.pillars.hour, counts);
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1;
  const ratios = Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, Math.round((value / total) * 100)]));
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    counts,
    ratios,
    dominantElement: sorted[0]?.[0] || "목",
    weakElement: Object.entries(counts).sort((a, b) => a[1] - b[1])[0]?.[0] || "수",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getNatalAnalysis(saju: FamousSajuEngineResult) {
  return asRecord(saju.natalAnalysis);
}

function getDaewoonStartAge(saju: FamousSajuEngineResult) {
  return typeof saju.daewoonStartAge === "number" ? saju.daewoonStartAge : null;
}

function recordString(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function recordNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function recordStringArray(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function uniqueKeywords(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function buildFamousSajuTitleHook(person: CelebritySajuSeed) {
  const seededHooks: Record<string, string> = {
    "yi-sun-sin": "강한 책임감과 전략의 운을 품은 명장 코드",
    "king-sejong": "학문과 창조성이 제도와 만나는 군주의 사주 구조",
    iu: "감성과 재능이 만나는 예술가의 사주 구조",
    "bts-rm": "언어와 리더십이 무대 위에서 살아나는 창작 코드",
    "son-heung-min": "속도와 집중이 경기장에서 빛나는 스포츠 스타의 리듬",
  };
  if (seededHooks[person.slug]) return seededHooks[person.slug];

  const tagText = formatTagPair(getReadableTags(person));
  if (!tagText) return `${person.category} 인물의 사주 구조`;
  if (person.category === "K-스타") return `${subjectParticle(tagText)} 대중 앞에서 선명해지는 사주 리듬`;
  if (person.category === "가수") return `${subjectParticle(tagText)} 목소리의 결로 피어나는 사주 리듬`;
  if (person.category === "배우") return `${subjectParticle(tagText)} 인물의 깊이를 여는 사주 결`;
  if (person.categoryKey === "sports" || person.tags.some((tag) => ["야구", "축구", "피겨", "골프", "스포츠"].includes(tag))) return `${subjectParticle(tagText)} 승부의 호흡으로 살아나는 사주 리듬`;
  if (person.categoryKey === "politics") return `${subjectParticle(tagText)} 책임의 자리에서 드러나는 사주 구조`;
  if (person.categoryKey === "business") return `${subjectParticle(tagText)} 판을 키우는 사주 리듬`;
  if (person.categoryKey === "creator") return `${subjectParticle(tagText)} 오래 남는 작품성으로 이어지는 사주 결`;
  if (person.categoryKey === "historical") return `${subjectParticle(tagText)} 시대의 문장으로 남은 사주 구조`;
  return `${subjectParticle(tagText)} 삶의 상징으로 드러나는 사주 구조`;
}

function buildFamousSajuSeoTitle(person: CelebritySajuSeed) {
  return `${person.nameKo} 사주 분석｜${buildFamousSajuTitleHook(person)}`;
}

function buildFamousSajuSeoDescription(person: CelebritySajuSeed, article: Pick<FamousSajuArticle, "dayMasterLabel" | "dayElement" | "elementProfile" | "calculationStatus">) {
  if (article.calculationStatus !== "calculated") {
    return `${person.nameKo}의 공개 생년월일 기준이 확인되는 범위 안에서, 명식을 억지로 꾸미지 않고 조심스럽게 읽는 유명인 사주 분석입니다.`;
  }

  return `${person.nameKo}의 ${article.dayMasterLabel}, ${article.dayElement} 일간, ${article.elementProfile.dominantElement} 오행 흐름을 바탕으로 원국의 기질과 운의 리듬을 읽는 유명인 사주 분석입니다.`;
}

function hasFinalConsonant(value: string) {
  const last = value.trim().charCodeAt(value.trim().length - 1);
  if (!Number.isFinite(last)) return false;
  const code = last - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

function subjectParticle(value: string) {
  return `${value}${hasFinalConsonant(value) ? "이" : "가"}`;
}

function objectParticle(value: string) {
  return `${value}${hasFinalConsonant(value) ? "을" : "를"}`;
}

// 주제격 조사 은/는 (예: "겁재는", "비견은"). 받침 없는 십성/신살명에서
// "겁재은" 류 오류를 막기 위해 하드코딩 대신 이 유틸을 쓴다.
function topicParticle(value: string) {
  return `${value}${hasFinalConsonant(value) ? "은" : "는"}`;
}

function formatTagPair(tags: string[]) {
  const [firstTag, secondTag] = tags.slice(0, 2).map((tag) => String(tag || "").trim()).filter(Boolean);
  if (!firstTag) return "";
  if (!secondTag) return firstTag;
  return `${firstTag}${hasFinalConsonant(firstTag) ? "과" : "와"} ${secondTag}`;
}

function getReadableTags(person: CelebritySajuSeed) {
  const blocked = new Set([person.category, person.categoryKey === "sports" ? "스포츠" : "", person.categoryKey === "entertainer" ? person.category : ""]);
  const filtered = person.tags.filter((tag) => tag && !blocked.has(tag));
  return filtered.length ? filtered : person.tags;
}

type FamousSajuCategoryVoice = {
  heroOpening: string;
  publicSignal: string;
  hiddenRhythm: string;
  firstImpressionFocus: string;
  careerTitle: string;
  careerAngle: string;
  wealthAngle: string;
  relationshipAngle: string;
  adviceTitle: string;
  adviceFocus: string;
  adviceLens: string;
};

function getFamousSajuCategoryVoice(person: CelebritySajuSeed): FamousSajuCategoryVoice {
  if (person.category === "배우") {
    return {
      heroOpening: `${person.nameKo}의 작품 속 표정과 배역의 결을 명식 위에 올려 보면`,
      publicSignal: "작품과 장면 속에서 반복되는 인상",
      hiddenRhythm: "인물을 입는 힘 뒤에도",
      firstImpressionFocus: "연기·장면·감정선",
      careerTitle: "작품성과 배역의 흐름",
      careerAngle: "작품 선택과 캐릭터의 깊이",
      wealthAngle: "작품의 선택권과 장기 신뢰",
      relationshipAngle: "작품 몰입과 실제 거리감의 균형",
      adviceTitle: "배우의 운을 쓰는 법",
      adviceFocus: "역할의 깊이와 회복의 간격",
      adviceLens: "배우의 운은 장면을 오래 품을수록 맑아집니다.",
    };
  }

  if (person.category === "가수") {
    return {
      heroOpening: `${person.nameKo}의 목소리와 무대의 호흡을 명식 위에 놓으면`,
      publicSignal: "노래와 무대에서 반복되는 울림",
      hiddenRhythm: "목소리의 빛 뒤에도",
      firstImpressionFocus: "목소리·가사·무대 호흡",
      careerTitle: "목소리와 서사의 흐름",
      careerAngle: "음색과 공연의 방향",
      wealthAngle: "공연·음원·브랜드의 지속성",
      relationshipAngle: "감정 표현과 사적인 회복의 경계",
      adviceTitle: "목소리의 운을 조율하는 법",
      adviceFocus: "표현의 강도와 감정의 회복",
      adviceLens: "가수의 운은 감정을 오래 태우되 목소리의 그릇을 지킬 때 깊어집니다.",
    };
  }

  if (person.category === "K-스타" || person.categoryKey === "entertainer") {
    return {
      heroOpening: `${person.nameKo}의 무대 위 시선과 팬덤의 리듬을 명식 위에 놓으면`,
      publicSignal: "무대와 이미지에서 반복되는 결",
      hiddenRhythm: "스포트라이트 뒤에도",
      firstImpressionFocus: "무대·표현·이미지",
      careerTitle: "무대성과 팬덤의 결",
      careerAngle: "퍼포먼스와 이미지의 호흡",
      wealthAngle: "팬덤 신뢰와 이미지 확장",
      relationshipAngle: "팬덤의 가까움과 개인 리듬의 거리",
      adviceTitle: "무대 뒤 운의 조율",
      adviceFocus: "표현의 강도와 휴식의 리듬",
      adviceLens: "스타의 운은 빛을 키우는 일만큼 빛을 쉬게 하는 감각에서 맑아집니다.",
    };
  }

  if (person.categoryKey === "sports" || person.tags.some((tag) => ["야구", "축구", "피겨", "골프", "스포츠"].includes(tag))) {
    return {
      heroOpening: `${person.nameKo}의 승부 장면과 몸의 리듬을 명식 위에 올려 보면`,
      publicSignal: "경기와 훈련에서 반복되는 결",
      hiddenRhythm: "기록과 승부 뒤에도",
      firstImpressionFocus: "승부감·훈련·몸의 리듬",
      careerTitle: "승부 감각과 몸의 리듬",
      careerAngle: "경기 운영과 반복 훈련의 방향",
      wealthAngle: "기록 가치와 커리어 관리",
      relationshipAngle: "승부 긴장과 팀워크의 호흡",
      adviceTitle: "승부 운을 쓰는 법",
      adviceFocus: "집중의 폭발력과 회복의 주기",
      adviceLens: "선수의 운은 한 번의 기록보다 반복된 회복과 기준에서 오래 살아납니다.",
    };
  }

  if (person.categoryKey === "business") {
    return {
      heroOpening: `${person.nameKo}의 사업 감각과 판을 키우는 결단을 명식 위에 놓으면`,
      publicSignal: "시장과 기술의 흐름 속에서 보이는 판단",
      hiddenRhythm: "확장과 성취 뒤에도",
      firstImpressionFocus: "판단·확장·시스템",
      careerTitle: "판을 키우는 재성과 판단력",
      careerAngle: "사업 구조와 시장 감각",
      wealthAngle: "현금 흐름과 위험 관리",
      relationshipAngle: "동맹과 계약의 신뢰선",
      adviceTitle: "확장의 운을 다루는 법",
      adviceFocus: "속도와 검증의 균형",
      adviceLens: "사업가의 운은 판을 넓히는 손과 위험을 재는 눈이 함께 움직일 때 단단해집니다.",
    };
  }

  if (person.categoryKey === "politics") {
    return {
      heroOpening: `${person.nameKo}의 책임의 자리와 시대적 선택을 명식 위에 놓으면`,
      publicSignal: "연설과 결단 속에서 드러나는 결",
      hiddenRhythm: "권한과 책임 뒤에도",
      firstImpressionFocus: "책임·명분·조율",
      careerTitle: "책임의 자리와 관성의 흐름",
      careerAngle: "공적 역할과 시대적 선택",
      wealthAngle: "자원 배분과 공적 신뢰",
      relationshipAngle: "공적 명분과 협상 거리",
      adviceTitle: "책임의 운을 다루는 법",
      adviceFocus: "명분과 균형의 거리",
      adviceLens: "정치가의 운은 뜻을 세우는 힘과 반대편을 견디는 그릇이 함께 필요합니다.",
    };
  }

  if (person.categoryKey === "creator") {
    return {
      heroOpening: `${person.nameKo}의 작품 세계와 창작의 호흡을 명식 위에 올려 보면`,
      publicSignal: "작품과 문장 속에서 살아나는 결",
      hiddenRhythm: "창작의 빛 뒤에도",
      firstImpressionFocus: "작품성·관찰·표현",
      careerTitle: "창작성과 작품의 결",
      careerAngle: "작품 세계와 표현 방식",
      wealthAngle: "작품의 축적과 저작 가치",
      relationshipAngle: "몰입의 고독과 신뢰 관계",
      adviceTitle: "창작 운을 오래 쓰는 법",
      adviceFocus: "몰입과 고독의 균형",
      adviceLens: "창작자의 운은 영감보다 오래 바라보는 힘에서 더 깊게 열립니다.",
    };
  }

  if (person.categoryKey === "historical") {
    return {
      heroOpening: `${person.nameKo}의 시대적 기록과 남은 상징을 명식 위에 놓으면`,
      publicSignal: "기록과 시대의 문장 속에 남은 결",
      hiddenRhythm: "역사적 이름 뒤에도",
      firstImpressionFocus: "시대성·책임·상징",
      careerTitle: "시대의 역할과 남은 상징",
      careerAngle: "기록 속 역할과 시대적 무게",
      wealthAngle: "시대가 남긴 상징 자산",
      relationshipAngle: "기록 속 관계망과 시대적 역할",
      adviceTitle: "역사적 명식의 읽는 법",
      adviceFocus: "상징과 기록의 거리",
      adviceLens: "역사 인물의 운은 사실의 빈자리를 꾸미기보다 남은 상징을 조심스럽게 읽어야 맑습니다.",
    };
  }

  return {
    heroOpening: `${person.nameKo}의 삶에 남은 상징을 명식 위에 놓으면`,
    publicSignal: "공개된 활동 속에서 반복되는 결",
    hiddenRhythm: "겉으로 보이는 성취 뒤에도",
    firstImpressionFocus: "역할·선택·상징",
    careerTitle: "역할과 선택의 흐름",
    careerAngle: "사회적 역할과 반복되는 선택",
    wealthAngle: "사회적 신뢰와 지속성",
    relationshipAngle: "공개 역할과 사적 거리의 균형",
    adviceTitle: "운을 조율하는 법",
    adviceFocus: "강한 기운과 회복의 균형",
    adviceLens: "이 명식은 성취를 키우는 힘과 그 힘을 담는 그릇을 함께 보아야 합니다.",
  };
}

function sentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /[.!?。]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function softSentence(value: string) {
  return toFamousSajuHonorificText(sentence(value));
}

function polishFortuneSentence(value: string) {
  return String(value || "")
    .replace(/갑가/g, "갑이")
    .replace(/을가/g, "을이")
    .replace(/병가/g, "병이")
    .replace(/정가/g, "정이")
    .replace(/경가/g, "경이")
    .replace(/신가/g, "신이")
    .replace(/임가/g, "임이")
    .replace(/정재으로/g, "정재로")
    .replace(/편재으로/g, "편재로")
    .replace(/겁재으로/g, "겁재로")
    .replace(/얻음/g, "얻은 흐름")
    .replace(/금가/g, "금이")
    .replace(/목가/g, "목이")
    .replace(/금는/g, "금은")
    .replace(/목는/g, "목은")
    .replace(/금를/g, "금을")
    .replace(/목를/g, "목을");
}

function toFamousSajuHonorificText(value: string) {
  return polishFortuneSentence(value)
    .replace(/아니다\./g, "아닙니다.")
    .replace(/않는다\./g, "않습니다.")
    .replace(/한다\./g, "합니다.")
    .replace(/된다\./g, "됩니다.")
    .replace(/이다\./g, "입니다.")
    .replace(/있다\./g, "있습니다.")
    .replace(/없다\./g, "없습니다.")
    .replace(/좋다\./g, "좋습니다.")
    .replace(/깊다\./g, "깊습니다.")
    .replace(/크다\./g, "큽니다.")
    .replace(/강하다\./g, "강합니다.")
    .replace(/약하다\./g, "약합니다.")
    .replace(/중요하다\./g, "중요합니다.")
    .replace(/필요하다\./g, "필요합니다.")
    .replace(/부족하다\./g, "부족합니다.")
    .replace(/어렵다\./g, "어렵습니다.")
    .replace(/선명하다\./g, "선명합니다.")
    .replace(/정확하다\./g, "정확합니다.")
    .replace(/분명하다\./g, "분명합니다.")
    .replace(/살아난다\./g, "살아납니다.")
    .replace(/드러난다\./g, "드러납니다.")
    .replace(/나타난다\./g, "나타납니다.")
    .replace(/생긴다\./g, "생깁니다.")
    .replace(/흐른다\./g, "흐릅니다.")
    .replace(/읽는다\./g, "읽습니다.")
    .replace(/본다\./g, "봅니다.")
    .replace(/살핀다\./g, "살핍니다.")
    .replace(/보인다\./g, "보입니다.")
    .replace(/보여 준다\./g, "보여 줍니다.")
    .replace(/만든다\./g, "만듭니다.")
    .replace(/남긴다\./g, "남깁니다.")
    .replace(/묶는다\./g, "묶습니다.")
    .replace(/묶어 둔다\./g, "묶어 둡니다.")
    .replace(/다룬다\./g, "다룹니다.")
    .replace(/움직인다\./g, "움직입니다.")
    .replace(/작동한다\./g, "작동합니다.")
    .replace(/작용한다\./g, "작용합니다.")
    .replace(/가리킨다\./g, "가리킵니다.")
    .replace(/굳힌다\./g, "굳힙니다.")
    .replace(/다듬는다\./g, "다듬습니다.")
    .replace(/밝힌다\./g, "밝힙니다.")
    .replace(/바꾼다\./g, "바꿉니다.")
    .replace(/키운다\./g, "키웁니다.")
    .replace(/솟는다\./g, "솟습니다.")
    .replace(/버틴다\./g, "버팁니다.")
    .replace(/떠오른다\./g, "떠오릅니다.")
    .replace(/강해진다\./g, "강해집니다.")
    .replace(/선명해진다\./g, "선명해집니다.")
    .replace(/중요해진다\./g, "중요해집니다.")
    .replace(/숨어든다\./g, "숨어듭니다.")
    .replace(/깨어난다\./g, "깨어납니다.")
    .replace(/걸린다\./g, "걸립니다.")
    .replace(/잡는다\./g, "잡습니다.")
    .replace(/품는다\./g, "품습니다.")
    .replace(/난다\./g, "납니다.")
    .replace(/낸다\./g, "냅니다.")
    .replace(/고른다\./g, "고릅니다.")
    .replace(/중시한다\./g, "중시합니다.")
    .replace(/지나치다\./g, "지나칩니다.")
    .replace(/넓힌다\./g, "넓힙니다.")
    .replace(/일으킨다\./g, "일으킵니다.")
    .replace(/밝아진다\./g, "밝아집니다.")
    .replace(/흐려진다\./g, "흐려집니다.")
    .replace(/태어난다\./g, "태어납니다.")
    .replace(/접고 간다\./g, "접고 갑니다.")
    .replace(/지킨다\./g, "지킵니다.")
    .replace(/붙든다\./g, "붙듭니다.")
    .replace(/세운다\./g, "세웁니다.")
    .replace(/얻는다\./g, "얻습니다.")
    .replace(/맑아진다\./g, "맑아집니다.")
    .replace(/깊어진다\./g, "깊어집니다.")
    .replace(/커진다\./g, "커집니다.")
    .replace(/늦어진다\./g, "늦어집니다.")
    .replace(/줄어든다\./g, "줄어듭니다.")
    .replace(/흔들린다\./g, "흔들립니다.")
    .replace(/올라간다\./g, "올라갑니다.")
    .replace(/끌어당긴다\./g, "끌어당깁니다.")
    .replace(/넘어간다\./g, "넘어갑니다.")
    .replace(/밀고 간다\./g, "밀고 갑니다.")
    .replace(/따라간다\./g, "따라갑니다.")
    .replace(/받아들인다\./g, "받아들입니다.")
    .replace(/말한다\./g, "말합니다.")
    .replace(/요구한다\./g, "요구합니다.")
    .replace(/맡는다\./g, "맡습니다.")
    .replace(/놓인다\./g, "놓입니다.")
    .replace(/나뉜다\./g, "나뉩니다.")
    .replace(/이어진다\./g, "이어집니다.")
    .replace(/열린다\./g, "열립니다.")
    .replace(/닿는다\./g, "닿습니다.")
    .replace(/느껴진다\./g, "느껴집니다.")
    .replace(/새겨진다\./g, "새겨집니다.")
    .replace(/비춘다\./g, "비춥니다.")
    .replace(/묻는다\./g, "묻습니다.")
    .replace(/태도다\./g, "태도입니다.")
    .replace(/구조다\./g, "구조입니다.")
    .replace(/자리다\./g, "자리입니다.")
    .replace(/별이다\./g, "별입니다.")
    .replace(/기운이다\./g, "기운입니다.")
    .replace(/흐름이다\./g, "흐름입니다.")
    .replace(/감각이다\./g, "감각입니다.")
    .replace(/기준이다\./g, "기준입니다.")
    .replace(/지도다\./g, "지도입니다.")
    .replace(/신호다\./g, "신호입니다.")
    .replace(/리듬이다\./g, "리듬입니다.")
    .replace(/문이다\./g, "문입니다.")
    .replace(/힘이다\./g, "힘입니다.")
    .replace(/언어다\./g, "언어입니다.")
    .replace(/방식이다\./g, "방식입니다.")
    .replace(/해석이다\./g, "해석입니다.")
    .replace(/상징이다\./g, "상징입니다.")
    .replace(/중심이다\./g, "중심입니다.")
    .replace(/색이다\./g, "색입니다.")
    .replace(/팔자다\./g, "팔자입니다.")
    .replace(/사주다\./g, "사주입니다.")
    .replace(/명식이다\./g, "명식입니다.");
}

function polishFamousSajuOutput<T>(value: T): T {
  if (typeof value === "string") return toFamousSajuHonorificText(value) as T;
  if (Array.isArray(value)) return value.map((item) => polishFamousSajuOutput(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, polishFamousSajuOutput(item)])
    ) as T;
  }
  return value;
}

function polishFamousSajuArticle(article: FamousSajuArticle): FamousSajuArticle {
  return {
    ...article,
    magazine: polishFamousSajuOutput(article.magazine),
    heroCopy: toFamousSajuHonorificText(article.heroCopy),
    coreKeywords: article.coreKeywords.map((item) => toFamousSajuHonorificText(item)),
    analysisBadge: toFamousSajuHonorificText(article.analysisBadge),
    timeNotice: toFamousSajuHonorificText(article.timeNotice),
    summary: toFamousSajuHonorificText(article.summary),
    sections: polishFamousSajuOutput(article.sections),
    insightCards: polishFamousSajuOutput(article.insightCards),
    reliabilityNotes: polishFamousSajuOutput(article.reliabilityNotes),
    conclusion: toFamousSajuHonorificText(article.conclusion),
    seoTitle: toFamousSajuHonorificText(article.seoTitle),
    seoDescription: toFamousSajuHonorificText(article.seoDescription),
    seoKeywords: article.seoKeywords.map((item) => toFamousSajuHonorificText(item)),
  };
}

function formatAccessibleFortuneTerms(value: string) {
  const text = toFamousSajuHonorificText(value)
    .replace(/계절 균형이 급해/g, "계절의 온도 균형이 먼저 필요해")
    .replace(/금과 수가 차갑게 치우친 흐름의 병을 치료하는 약이/g, "차갑게 치우친 금·수의 흐름을 누그러뜨리는 기운은")
    .replace(/화염토조의 병을 치료하는 약이/g, "뜨겁고 건조한 흐름을 누그러뜨리는 기운은")
    .replace(/토가 많아 금이 묻히는 흐름의 병을 치료하는 약이/g, "토가 많아 금이 묻히는 흐름을 풀어 주는 기운은")
    .replace(/목다토붕의 병을 치료하는 약이/g, "목이 지나쳐 토가 흔들리는 흐름을 바로잡는 기운은")
    .replace(/수다목부의 병을 치료하는 약이/g, "수가 많아 목이 떠오르는 흐름을 붙잡는 기운은")
    .replace(/토와 수가 부딪히는 흐름에는 ([목화토금수])의 막힌 기운을 이어 주는 흐름이 필요하다/g, "토와 수가 부딪힐 때는 $1 기운이 흐름을 이어 줍니다")
    .replace(/화금상전에는 ([목화토금수])의 막힌 기운을 이어 주는 흐름이 필요하다/g, "화와 금이 맞설 때는 $1 기운이 흐름을 이어 줍니다")
    .replace(/금목상전에는 ([목화토금수])의 막힌 기운을 이어 주는 흐름이 필요하다/g, "금과 목이 맞설 때는 $1 기운이 흐름을 이어 줍니다")
    .replace(/([목화토금수])([목화토금수])상전에는 ([목화토금수])의 막힌 기운을 이어 주는 흐름이 필요하다/g, "$1·$2가 맞설 때는 $3 기운이 흐름을 이어 줍니다")
    .replace(/강약 균형상/g, "강약의 균형에서")
    .replace(/격을 살리는 기운과 돕는 기운을 함께 보았다/g, "격을 살리는 흐름과 돕는 기운을 함께 살폈다")
    .replace(/용신과 기신/g, "보완 기운과 부담 기운")
    .replace(/용신·기신/g, "보완 기운·부담 기운")
    .replace(/용신\/기신/g, "보완 기운/부담 기운")
    .replace(/희신·기신/g, "돕는 기운·부담 기운")
    .replace(/상신·희신/g, "격을 살리는 기운과 돕는 기운")
    .replace(/조후와 억부/g, "계절 균형과 강약 균형")
    .replace(/조후·억부/g, "계절 균형·강약 균형")
    .replace(/조후, 억부/g, "계절 균형, 강약 균형")
    .replace(/토수상전/g, "토와 수가 부딪히는 흐름")
    .replace(/토다금매/g, "토가 많아 금이 묻히는 흐름")
    .replace(/금수한랭/g, "금과 수가 차갑게 치우친 흐름")
    .replace(/용신/g, "보완 기운")
    .replace(/희신/g, "돕는 기운")
    .replace(/기신/g, "부담 기운")
    .replace(/상신/g, "격을 살리는 기운")
    .replace(/조후/g, "계절 균형")
    .replace(/억부/g, "강약 균형")
    .replace(/통관/g, "막힌 기운을 이어 주는 흐름")
    .replace(/계절 균형가/g, "계절 균형이")
    .replace(/강약 균형가/g, "강약 균형이")
    .replace(/([목화토금수]) 막힌 기운을 이어 주는 흐름/g, "$1의 막힌 기운을 이어 주는 흐름")
    .replace(/계절 균형이 급해/g, "계절의 온도 균형이 먼저 필요해")
    .replace(/금과 수가 차갑게 치우친 흐름의 병을 치료하는 약이/g, "차갑게 치우친 금·수의 흐름을 누그러뜨리는 기운은")
    .replace(/뜨겁고 건조한 흐름의 병을 치료하는 약이/g, "뜨겁고 건조한 흐름을 누그러뜨리는 기운은")
    .replace(/토가 많아 금이 묻히는 흐름의 병을 치료하는 약이/g, "토가 많아 금이 묻히는 흐름을 풀어 주는 기운은")
    .replace(/목다토붕의 병을 치료하는 약이/g, "목이 지나쳐 토가 흔들리는 흐름을 바로잡는 기운은")
    .replace(/수다목부의 병을 치료하는 약이/g, "수가 많아 목이 떠오르는 흐름을 붙잡는 기운은")
    .replace(/토와 수가 부딪히는 흐름에는 ([목화토금수])의 막힌 기운을 이어 주는 흐름이 필요하다/g, "토와 수가 부딪힐 때는 $1 기운이 흐름을 이어 줍니다")
    .replace(/화금상전에는 ([목화토금수])의 막힌 기운을 이어 주는 흐름이 필요하다/g, "화와 금이 맞설 때는 $1 기운이 흐름을 이어 줍니다")
    .replace(/금목상전에는 ([목화토금수])의 막힌 기운을 이어 주는 흐름이 필요하다/g, "금과 목이 맞설 때는 $1 기운이 흐름을 이어 줍니다")
    .replace(/([목화토금수])([목화토금수])상전에는 ([목화토금수])의 막힌 기운을 이어 주는 흐름이 필요하다/g, "$1·$2가 맞설 때는 $3 기운이 흐름을 이어 줍니다")
    .replace(/강약 균형상/g, "강약의 균형에서")
    .replace(/격을 살리는 기운과 돕는 기운을 함께 보았다/g, "격을 살리는 흐름과 돕는 기운을 함께 살폈다")
    .replace(/얻음로/g, "얻은 흐름으로")
    .replace(/계절의 온도 균형이 먼저 필요해 ([목화토금수])(?:이|가) 먼저 필요하다/g, "계절의 온도 균형에서는 $1 기운이 먼저 필요합니다")
    .replace(/([가-힣]+격)을 살리는 격을 살리는 흐름과 돕는 기운을 함께 살폈다/g, "$1은 격을 살리는 흐름과 돕는 기운을 함께 살펴야 합니다")
    .replace(/기운은 ([목화토금수]), ([목화토금수]), ([목화토금수])이다/g, "기운은 $1·$2·$3입니다")
    .replace(/기운은 ([목화토금수]), ([목화토금수])이다/g, "기운은 $1·$2입니다")
    .replace(/구조라 ([목화토금수]), ([목화토금수]), ([목화토금수])(?:이|가) 균형을 잡는다/g, "구조라 $1·$2·$3 기운이 균형을 잡습니다")
    .replace(/구조라 ([목화토금수]), ([목화토금수])(?:이|가) 균형을 잡는다/g, "구조라 $1·$2 기운이 균형을 잡습니다")
    .replace(/종하는 기운 ([목화토금수])(?:을|를) 따라야 한다/g, "종하는 $1 기운을 따라야 합니다");
  return toFamousSajuHonorificText(text);
}

function formatReasonSentences(value: string, name = "") {
  return String(value || "")
    .split(/\s*\/\s*/)
    .map((part) => softSentence(personalizeFamousFortuneSentence(part.trim(), name)))
    .filter(Boolean)
    .join(" ");
}

function personalizeFamousFortuneSentence(value: string, name: string) {
  const label = String(name || "이 명식").trim() || "이 명식";
  return String(value || "")
    .replace(/^전왕격은 /, `${label}의 전왕격은 `)
    .replace(/^계절의 온도 균형에서는 /, `${label}의 계절 균형에서는 `)
    .replace(/^차갑게 치우친 금·수의 흐름/, `${label}의 차갑게 치우친 금·수 흐름`)
    .replace(/^뜨겁고 건조한 흐름/, `${label}의 뜨겁고 건조한 흐름`);
}

function alignGyeokStrengthLanguage(value: string, gyeokguk: string) {
  let text = String(value || "");
  if (/전왕격|종왕격|종강격/.test(gyeokguk)) {
    text = text
      .replace(/강약의 균형에서 신약 구조라/g, "강한 세력을 따르는 구조라")
      .replace(/강약의 균형에서 과약 구조라/g, "강한 세력을 따르는 구조라")
      .replace(/강약의 균형에서 과왕 구조라/g, "강한 세력을 따르는 구조라")
      .replace(/강약의 균형에서 신강 구조라/g, "강한 세력을 따르는 구조라");
  }
  if (/종관살격|종재격/.test(gyeokguk)) {
    text = text
      .replace(/강약의 균형에서 과왕 구조라/g, "압도 세력을 따르는 구조라")
      .replace(/강약의 균형에서 신강 구조라/g, "압도 세력을 따르는 구조라");
  }
  return text
    .replace(/강약의 균형에서 과왕 구조라/g, "기운이 지나치게 강한 구조라")
    .replace(/강약의 균형에서 신강 구조라/g, "기운이 강하게 버티는 구조라")
    .replace(/강약의 균형에서 신약 구조라/g, "기운을 보강해야 하는 구조라");
}

function pickFamousVariant(list: string[], seed: string, offset = 0) {
  if (!list.length) return "";
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return list[(Math.abs(hash) + offset) % list.length] || "";
}

function trimFortuneLead(value: string, leads: string[]) {
  const text = softSentence(value);
  const lead = leads.find((item) => text.startsWith(item));
  return lead ? text.slice(lead.length).trimStart() : text;
}

function formatRelationshipChangeForCategory(person: CelebritySajuSeed, categoryVoice: FamousSajuCategoryVoice, value: string, seed: string) {
  const text = softSentence(value);
  if (!/^관계 흐름은 속도보다 약속의 범위와 거리감 조절이 중요합니다\.?$/.test(text)) return text;
  return pickFamousVariant([
    `${person.nameKo}의 관계운은 ${objectParticle(categoryVoice.relationshipAngle)} 중심으로, 가까워질 때와 물러설 때의 박자를 나누어 볼수록 안정됩니다.`,
    `${person.nameKo}의 관계 흐름은 ${categoryVoice.relationshipAngle}에서 결이 드러납니다. 빠른 친밀감보다 ${person.nameKo}에게는 신뢰가 머무를 그릇을 먼저 세우는 편이 좋습니다.`,
    `${person.nameKo}의 대운 속 관계 신호는 ${objectParticle(categoryVoice.relationshipAngle)} 다듬으라는 쪽으로 움직입니다. 약속의 크기보다 ${person.nameKo}가 오래 지킬 수 있는 거리와 호흡이 중요합니다.`,
  ], seed, 4);
}

function formatCareerChangeForCategory(categoryVoice: FamousSajuCategoryVoice, value: string, dominantElement: string, seed: string) {
  const text = softSentence(value);
  if (!/^직업(?:과 역할| 흐름|운)은 강한 십성이 현실에서 쓰이는 방향으로 정리됩니다\.?$/.test(text)) return text;
  return pickFamousVariant([
    `직업 흐름은 ${objectParticle(categoryVoice.careerAngle)} 통해 강한 ${dominantElement} 기운을 실제 역할과 성과로 묶는 방향입니다.`,
    `직업운은 ${categoryVoice.careerAngle}에서 강한 ${dominantElement} 기운이 반복된 선택과 책임으로 드러날 때 안정됩니다.`,
    `직업과 역할은 ${objectParticle(categoryVoice.careerAngle)} 기준으로 삼을 때 더 선명해집니다.`,
  ], seed, 5);
}

function formatWealthChangeForCategory(categoryVoice: FamousSajuCategoryVoice, value: string, seed: string) {
  const text = softSentence(value);
  if (!/^재물(?: 흐름|의 흐름|운)은 확장보다 감당 가능한 구조를 먼저 보아야 합니다\.?$/.test(text)) return text;
  return pickFamousVariant([
    `재물 흐름은 ${objectParticle(categoryVoice.wealthAngle)} 먼저 안정시켜야 확장운이 맑게 열립니다.`,
    `재물운은 ${categoryVoice.wealthAngle}에서 신뢰가 쌓일 때, 숫자보다 구조가 먼저 단단해지는 흐름입니다.`,
    `재물의 흐름은 ${objectParticle(categoryVoice.wealthAngle)} 과하게 넓히기보다 오래 유지할 그릇을 세울 때 좋아집니다.`,
  ], seed, 6);
}

function ensureMandatoryDaewoonSection(primarySections: FamousSajuArticleSection[] | undefined, generatedSections: FamousSajuArticleSection[]) {
  const sections = Array.isArray(primarySections) && primarySections.length ? primarySections : generatedSections;
  const hasDaewoon = sections.some((section) => /대운|10년/.test(`${section.title} ${section.body}`));
  if (hasDaewoon) return sections;

  const daewoonSection = generatedSections.find((section) => /대운|10년/.test(`${section.title} ${section.body}`));
  if (!daewoonSection) return sections;

  const closingIndex = sections.findIndex((section) => /운명의 한 문장|결론|마지막/.test(section.title));
  if (closingIndex < 0) return [...sections, daewoonSection];
  return [...sections.slice(0, closingIndex), daewoonSection, ...sections.slice(closingIndex)];
}

function toEngineElementKo(value: string) {
  return engineElementLabel[value] || value;
}

function formatLuckStatus(value: string) {
  if (value === "calculated") return "읽을 수 있는";
  if (value === "not_supplied") return "운 흐름 제한";
  return value || "운 흐름 확인 필요";
}

function formatEngineInput(chart: FamousSajuCalculatedChart) {
  const { engineInput } = chart;
  if (!engineInput.year || !engineInput.month || !engineInput.day) return "명식 기준 확인 필요";
  const dateText = `${engineInput.year}-${String(engineInput.month).padStart(2, "0")}-${String(engineInput.day).padStart(2, "0")}`;
  const timeText = engineInput.hasTime && typeof engineInput.hour === "number"
    ? `${String(engineInput.hour).padStart(2, "0")}:${String(engineInput.minute || 0).padStart(2, "0")}`
    : "출생 시간 미상 / 삼주 기반";
  return `${engineInput.calendarType === "lunar" ? "음력 입력" : "양력 입력"} ${dateText} · ${timeText}`;
}

function buildCalendarNotice(person: CelebritySajuSeed) {
  if (person.isHistoricalDateUncertain) {
    return "역사 인물의 생년월일은 기록 체계와 양력 환산에 불확실성이 있을 수 있어, 공개 자료의 양력 기준 추정값으로만 읽습니다.";
  }
  if (person.birthCalendar === "lunar") {
    return "공개 생년월일이 음력 기준으로 제공된 인물은 음력 변환을 거쳐 사주를 계산합니다.";
  }
  if (person.birthCalendar === "unknown") {
    return "생년월일의 양력·음력 체계가 불명확한 인물은 명식 기준 확인이 필요합니다.";
  }
  return "";
}

function buildContentNotice(person: CelebritySajuSeed, saju: LocalSajuResult | null, failureReason?: string) {
  const calendarNotice = buildCalendarNotice(person);
  const timeNotice = saju
    ? saju.timeUnknown
      ? "출생 시간이 공개되지 않아 시주는 제외하고 연주·월주·일주 중심으로 살폈습니다."
      : `공개된 출생 시간 ${person.birthTime} 기준으로 시주(${saju.pillars.hour?.ganji})까지 함께 계산했습니다.`
    : `명식 기준 확인 필요 상태입니다.${failureReason ? ` ${failureReason}` : ""}`;
  return [calendarNotice, timeNotice, "확인 가능한 공개 자료를 바탕으로 한 상징 해석입니다."].filter(Boolean).join(" ");
}

function getFamousSajuImageMood(person: CelebritySajuSeed) {
  if (person.categoryKey === "historical") return "ancient constellation cosmic stars mystical history";
  if (person.categoryKey === "sports") return "cosmic stadium stars spotlight destiny";
  if (person.categoryKey === "business") return "gold stars cosmic city destiny";
  if (person.categoryKey === "politics") return "cosmic hall stars leadership destiny";
  if (person.categoryKey === "entertainer" || ["K-스타", "배우", "가수"].includes(person.category)) {
    return "cosmic stage spotlight stars mystical performance";
  }
  return "mystical cosmic portrait silhouette stars";
}

function formatElementRanking(saju: FamousSajuEngineResult) {
  const natalAnalysis = getNatalAnalysis(saju);
  const fiveElements = asRecord(natalAnalysis.fiveElements);
  const ranking = fiveElements.ranking;
  if (!Array.isArray(ranking)) return "";
  return ranking
    .map((row) => {
      const item = asRecord(row);
      const elementKo = recordString(item, "elementKo");
      const power = recordNumber(item, "power");
      return elementKo ? `${elementKo}${power !== null ? ` ${power}` : ""}` : "";
    })
    .filter(Boolean)
    .slice(0, 5)
    .join(" · ");
}

function formatTopRecordScores(record: Record<string, unknown>, limit = 3) {
  return Object.entries(record)
    .filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, value]) => `${key} ${value.toFixed(2)}`)
    .join(" · ");
}

function recordRows(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return Array.isArray(value) ? value.map((item) => asRecord(item)).filter((item) => Object.keys(item).length > 0) : [];
}

function displayRecordValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "있음" : "없음";
  if (Array.isArray(value)) return value.map(displayRecordValue).filter(Boolean).join(" · ");

  const record = asRecord(value);
  return recordString(record, "label")
    || recordString(record, "ganji")
    || recordString(record, "reason")
    || recordString(record, "classification")
    || recordString(record, "result")
    || recordString(record, "practicalMeaning")
    || "";
}

function firstRecordText(record: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const text = displayRecordValue(record[key]);
    if (text) return text;
  }
  return fallback;
}

function formatRecordHighlights(rows: Array<Record<string, unknown>>, keys: string[], fallback: string, limit = 3) {
  const text = rows
    .map((row) => keys.map((key) => displayRecordValue(row[key])).filter(Boolean).join(" "))
    .filter(Boolean)
    .slice(0, limit)
    .join(" · ");
  return text || fallback;
}

function formatScoreReason(rows: Array<Record<string, unknown>>, key: string, fallback = "") {
  const row = rows.find((item) => recordString(item, "key") === key);
  return row ? firstRecordText(row, ["naturalReason", "label"], fallback) : fallback;
}

function buildReliabilityNotes(person: CelebritySajuSeed, saju: FamousSajuEngineResult | null): FamousSajuReliabilityNote[] {
  if (!saju) {
    return [
      { label: famousSajuCopy("magazine.chart"), level: "제한", description: famousSajuCopy("magazine.chartUnavailable") },
      { label: famousSajuCopy("magazine.interpretation"), level: "제한", description: famousSajuCopy("magazine.interpretationLimited") },
    ];
  }

  const hasTime = !saju.timeUnknown;
  const natalAnalysis = getNatalAnalysis(saju);
  const activatedByLuck = asRecord(asRecord(natalAnalysis.tenGods).activatedByLuck);
  const luckStatus = recordString(activatedByLuck, "status", "not_supplied");
  return [
    {
      label: famousSajuCopy("magazine.originalChart"),
      level: hasTime ? "높음" : "보통",
      description: hasTime ? "연주·월주·일주·시주가 모두 열려 명식의 중심을 안정적으로 잡았습니다." : "시주의 문은 닫아 두고 연주·월주·일주의 흐름으로 중심을 잡았습니다.",
    },
    {
      label: famousSajuCopy("magazine.tenGodElements"),
      level: hasTime ? "높음" : "보통",
      description: famousSajuCopy("magazine.tenGodElementsDesc"),
    },
    {
      label: famousSajuCopy("magazine.gyeokUseful"),
      level: person.isHistoricalDateUncertain || !hasTime ? "제한" : "보통",
      description: famousSajuCopy("magazine.gyeokUsefulDesc"),
    },
    {
      label: famousSajuCopy("magazine.cycles"),
      level: luckStatus === "calculated" && hasTime ? "보통" : "제한",
      description: luckStatus === "calculated" ? "10년의 배경 운과 해마다 들어오는 사건 기운을 원국 위에 조심스럽게 올려 읽었습니다." : "대운과 세운은 공개 자료가 허락하는 큰 방향 안에서만 절제해 읽었습니다.",
    },
  ];
}

const pillarLabels: Record<"year" | "month" | "day" | "hour", CelebritySajuMagazinePillar["label"]> = {
  year: "년주",
  month: "월주",
  day: "일주",
  hour: "시주",
};

const tenGodMeaning: Record<string, string> = {
  비견: "자기 기준과 독립성",
  겁재: "경쟁심과 돌파력",
  식신: "꾸준한 표현과 생산성",
  상관: "개성 있는 표현과 변주",
  편재: "대중성, 무대성, 현실 감각",
  정재: "신뢰, 축적, 관리 감각",
  편관: "압박을 견디는 승부성",
  정관: "책임감과 자기관리",
  편인: "독창적 관찰과 몰입",
  정인: "학습, 보호, 정리하는 힘",
};

const elementMetaphor: Record<string, string> = {
  목: "달빛 아래 곧게 피는 꽃나무",
  화: "밤무대 위로 번지는 붉은 꽃빛",
  토: "오래 머무는 정원의 흙빛 중심",
  금: "은빛 달칼처럼 정교한 기준",
  수: "별그림자를 품은 깊은 물결",
};

const elementSurgeTone: Record<ElementKey, string> = {
  목: "목이 강하면 방향을 먼저 세운다. 새 가지가 빛을 찾아 뻗듯 생각이 빠르게 자라고, 멈춘 판에서도 새 길을 열려는 힘이 살아난다.",
  화: "화가 강하면 존재가 먼저 밝아진다. 마음의 온도가 높고 반응이 빠르며, 한 번 불이 붙으면 장면 전체를 밀어 올리는 힘이 생긴다.",
  토: "토가 강하면 중심을 잡고 버틴다. 흩어진 것을 한곳에 모아 결과로 굳히며, 느려 보여도 쉽게 무너지지 않는 지속성이 생긴다.",
  금: "금이 강하면 기준이 선명하다. 판단이 빠르고 경계가 또렷하며, 거친 광석을 벼려 칼날로 만드는 듯 성과를 다듬는다.",
  수: "수가 강하면 흐름을 먼저 읽는다. 겉으로 드러난 말보다 그 아래의 기류를 감지하고, 방향을 바꾸는 유연성이 깊다.",
};

const elementEmptyTone: Record<ElementKey, string> = {
  목: "목이 약하면 시작의 방향을 오래 붙들기 어렵다. 싹이 트기 전 흙속에서 망설이듯, 결심은 있어도 첫 줄기를 세우는 데 시간이 걸린다.",
  화: "화가 약하면 마음의 불씨가 안으로 숨어든다. 표현이 늦어지고 존재감을 드러내는 순간을 지나치기 쉬우므로, 스스로 온도를 올리는 의식이 필요하다.",
  토: "토가 약하면 끝을 다지는 힘이 흔들린다. 많이 움직여도 결과를 저장하는 그릇이 얕아질 수 있어, 마무리와 반복의 리듬을 따로 세워야 한다.",
  금: "금이 약하면 기준선이 흐려진다. 무엇을 남기고 무엇을 끊을지 늦게 정해지므로, 선택의 칼날을 의식적으로 벼리는 과정이 중요하다.",
  수: "수가 약하면 멈추고 식히는 힘이 부족하다. 달리는 힘은 있어도 속도를 낮추는 내면의 물길이 얕아져, 회복의 시간을 배워야 한다.",
};

const tenGodReadingTone: Record<string, { nature: string; motion: string; caution: string }> = {
  비견: {
    nature: "비견은 같은 기운이 나란히 서는 힘이다. 자기 기준을 쉽게 넘기지 않고, 타인의 시선보다 스스로 세운 원칙을 먼저 붙든다.",
    motion: "독립성이 강해 혼자 결정하고 혼자 책임지는 장면에서 힘이 살아난다.",
    caution: "다만 비견이 지나치면 원칙이 고집으로 굳어 타인의 조언을 늦게 받아들일 수 있다.",
  },
  겁재: {
    nature: "겁재는 나와 같은 힘이 경쟁의 얼굴로 나타난 십성이다. 밀리면 꺾이는 것이 아니라 더 날이 서고, 긴장 속에서 돌파력이 솟는다.",
    motion: "비슷한 힘을 가진 상대와 부딪힐 때 승부 감각이 살아나며, 협상보다 직접 돌파를 고르는 기질이 강해진다.",
    caution: "다만 겁재가 넘치면 나누어 쌓아야 할 것까지 한 번에 밀어붙이려는 압박이 생긴다.",
  },
  식신: {
    nature: "식신은 일간이 밖으로 흘려보내는 안정된 표현이다. 급히 폭발하기보다 꾸준히 만들고 먹이고 기르는 생산성이 살아난다.",
    motion: "말과 결과물이 반복을 통해 단단해지며, 실력은 과시보다 지속에서 드러난다.",
    caution: "다만 식신이 약하게 받쳐지면 편안함에 머물러 더 큰 변화 앞에서 속도가 늦어질 수 있다.",
  },
  상관: {
    nature: "상관은 규격 밖으로 튀어나오는 표현의 힘이다. 기존 틀을 그대로 따르기보다 비틀고 변주하며, 막힌 문장에 균열을 낸다.",
    motion: "감각이 예리해 말과 행동에 개성이 생기고, 답답한 구조를 만나면 먼저 흔들어 깨우려 한다.",
    caution: "다만 상관이 거칠어지면 필요한 질서까지 밀어내 관계와 약속의 선이 흔들릴 수 있다.",
  },
  편재: {
    nature: "편재는 넓은 판을 보고 움직이는 현실 감각이다. 한곳에만 머물지 않고 흐르는 자원과 사람의 관심을 읽어 기회를 잡는다.",
    motion: "빠른 판단과 외부 감각이 살아나며, 손에 쥔 것을 굴려 더 큰 흐름으로 바꾸려는 힘이 강하다.",
    caution: "다만 편재가 넘치면 확장 속도가 빨라져 깊이 쌓기 전에 다음 판으로 넘어갈 수 있다.",
  },
  정재: {
    nature: "정재는 쌓고 지키는 기운이다. 눈앞의 성과를 현실의 그릇에 담고, 약속과 신뢰를 반복으로 굳힌다.",
    motion: "생활의 리듬과 관리 감각이 살아나며, 크고 화려한 한 번보다 안정적인 축적을 중시한다.",
    caution: "다만 정재가 눌리면 지나친 계산과 부담 때문에 움직임이 조심스러워질 수 있다.",
  },
  편관: {
    nature: "편관은 압박을 정면으로 받는 승부의 별이다. 어려운 조건이 오면 피하기보다 몸을 세우고, 위험한 자리에서 집중력이 선명해진다.",
    motion: "긴장과 책임이 추진력으로 바뀌며, 불리한 판에서도 결단을 앞세우는 힘이 생긴다.",
    caution: "다만 편관이 거칠면 스스로를 몰아붙이는 방식이 강해져 몸과 마음의 여백이 줄어든다.",
  },
  정관: {
    nature: "정관은 질서와 책임의 십성이다. 기준을 세우고 그 기준 안에서 자신을 다스리며, 흐트러진 힘을 공적인 형식으로 정리한다.",
    motion: "약속과 역할이 분명할수록 안정감이 커지고, 꾸준한 자기관리로 신뢰를 만든다.",
    caution: "다만 정관이 무거워지면 바른길을 지키려는 마음이 부담으로 변해 유연성이 줄어들 수 있다.",
  },
  편인: {
    nature: "편인은 비스듬히 보는 지성이다. 남들이 지나친 기호를 붙잡고, 낯선 생각 속으로 깊이 들어가 독창적인 해석을 만든다.",
    motion: "혼자 몰입하는 시간이 길수록 감각이 깊어지며, 직선보다 우회로에서 답을 찾는 힘이 살아난다.",
    caution: "다만 편인이 넘치면 생각이 안쪽으로만 감겨 현실의 실행 속도가 늦어질 수 있다.",
  },
  정인: {
    nature: "정인은 배우고 받아들이며 보호하는 기운이다. 흩어진 경험을 지식과 의미로 정리하고, 안정된 바탕 위에서 자신을 키운다.",
    motion: "신뢰할 만한 기준과 배움의 구조가 있을 때 마음이 편안해지고, 오래 익힌 것이 힘이 된다.",
    caution: "다만 정인이 과하면 보호받는 자리에 머물러 직접 부딪히는 힘이 약해질 수 있다.",
  },
};

const twelveStageTone: Record<string, { phase: "성장기" | "절정기" | "쇠퇴기"; text: string }> = {
  장생: { phase: "성장기", text: "장생은 기운이 막 태어나 길을 여는 자리입니다. 시작의 힘이 싱싱하고, 낯선 환경에서도 살아나려는 생기가 강하게 드러납니다." },
  목욕: { phase: "성장기", text: "목욕은 감각이 물 위로 올라오는 자리입니다. 재능이 눈에 띄게 흔들리며 드러나고, 외부 자극에 민감하게 반응합니다." },
  관대: { phase: "성장기", text: "관대는 몸을 세우고 밖으로 나가는 자리입니다. 아직 완성은 아니지만 자신을 드러내려는 의지가 선명하게 흐릅니다." },
  건록: { phase: "절정기", text: "건록은 자기 힘으로 서는 자리입니다. 일간의 뼈대가 단단해지고, 선택을 남에게 기대기보다 스스로 밀고 갑니다." },
  제왕: { phase: "절정기", text: "제왕은 기운이 가장 크게 솟는 자리입니다. 장악력이 강하고, 한 번 중심을 잡으면 주변 흐름까지 끌어당깁니다." },
  쇠: { phase: "쇠퇴기", text: "쇠는 넘친 힘을 줄이고 핵심만 남기는 자리입니다. 화려한 확장보다 익은 힘을 절제해 쓰는 감각이 중요하게 떠오릅니다." },
  병: { phase: "쇠퇴기", text: "병은 기운이 피로를 느끼는 자리입니다. 계속 밀어붙이기보다 회복과 조율을 배울 때 흐름이 맑아집니다." },
  사: { phase: "쇠퇴기", text: "사는 한 흐름을 접고 다음 문을 준비하는 자리입니다. 겉의 움직임은 줄어도 안쪽 판단은 깊어집니다." },
  묘: { phase: "쇠퇴기", text: "묘는 힘을 안으로 저장하는 자리입니다. 밖으로 뻗기보다 간직하고 정리하며, 숨은 축적이 생깁니다." },
  절: { phase: "쇠퇴기", text: "절은 끊고 다시 잇는 자리입니다. 기존 흐름이 멈추는 듯 보여도 새 국면을 위한 전환의 칼날이 됩니다." },
  태: { phase: "성장기", text: "태는 가능성이 씨앗처럼 맺히는 자리입니다. 아직 작지만 앞으로 자랄 기운이 안쪽에서 숨을 쉽니다." },
  양: { phase: "성장기", text: "양은 보호 속에서 기운을 기르는 자리입니다. 서두르기보다 바탕을 채울수록 다음 움직임이 안정됩니다." },
};

const repeatedTwelveStageTone: Record<string, string> = {
  장생: "장생이 여러 주에 반복되면 시작성, 적응력, 새로운 환경을 여는 힘이 겹쳐집니다. 초반 추진력과 생존 감각이 강해지고, 낯선 판에서도 길을 찾아내려는 생기가 원국 전반에 흐릅니다.",
  목욕: "목욕이 여러 주에 반복되면 감각, 표현력, 대중 반응성이 예민해집니다. 매력과 재능이 밖으로 쉽게 드러나며, 주변의 시선과 분위기를 빠르게 읽는 힘이 강해집니다.",
  관대: "관대가 여러 주에 반복되면 자기표현, 성장 욕구, 사회적 등장성이 강해집니다. 아직 완성되기 전에도 앞으로 나서려는 의지가 뚜렷하고, 자신의 이름과 역할을 세우려는 흐름이 커집니다.",
  건록: "건록이 여러 주에 반복되면 독립성, 자기 기준, 지속력이 단단해집니다. 남에게 기대기보다 스스로 버티고 밀고 가려는 힘이 강하며, 삶의 중요한 선택에서 주도권을 놓치려 하지 않습니다.",
  제왕: "제왕이 여러 주에 반복되면 장악력, 중심성, 리더십이 크게 떠오릅니다. 한 번 판을 잡으면 주변 흐름까지 끌어당기려는 힘이 강해지고, 존재감이 쉽게 묻히지 않습니다.",
  쇠: "쇠가 여러 주에 반복되면 절제, 선별, 성숙한 판단이 강해집니다. 무리한 확장보다 핵심을 남기는 감각이 발달하며, 경험을 압축해 필요한 순간에 쓰려는 흐름이 깊어집니다.",
  병: "병이 여러 주에 반복되면 회복 리듬, 민감성, 조율의 필요성이 커집니다. 에너지를 몰아 쓰기보다 몸과 마음의 속도를 살피며, 과로한 흐름을 정돈할 때 명식의 맑은 힘이 살아납니다.",
  사: "사가 여러 주에 반복되면 내면 판단, 정리, 다음 국면 준비가 깊어집니다. 겉으로 크게 움직이지 않아도 안쪽에서는 선택과 포기가 분명해지고, 오래된 흐름을 접어 새 문을 여는 힘이 생깁니다.",
  묘: "묘가 여러 주에 반복되면 저장, 축적, 숨은 자산화의 힘이 강해집니다. 밖으로 즉시 드러내기보다 안쪽에 모으고 익히는 기운이 깊어져, 시간이 지난 뒤 묵직한 결과로 나타나기 쉽습니다.",
  절: "절이 여러 주에 반복되면 단절과 전환, 판을 바꾸는 힘이 강해집니다. 익숙한 흐름을 과감히 끊고 새 국면으로 넘어가는 기운이 뚜렷해져, 삶의 방향 전환이 선명하게 드러납니다.",
  태: "태가 여러 주에 반복되면 잠재력, 준비성, 보이지 않는 가능성이 커집니다. 아직 표면화되지 않은 씨앗이 많고, 시간이 무르익을수록 안쪽에서 자라던 힘이 현실의 형태를 갖춥니다.",
  양: "양이 여러 주에 반복되면 보호, 기반 형성, 후원과 안정 욕구가 강해집니다. 서두르기보다 안전한 바탕을 먼저 만들려는 흐름이 커지고, 좋은 울타리를 얻을수록 다음 움직임이 안정됩니다.",
};

function buildUnknownMagazinePillar(label: CelebritySajuMagazinePillar["label"], text = "알 수 없음"): CelebritySajuMagazinePillar {
  return {
    label,
    ganji: text,
    stem: text,
    stemTenGod: text,
    branch: text,
    branchTenGod: text,
    hiddenStemCore: text,
    twelveStage: text,
    twelveGod: text,
    majorStars: text,
    isUnknown: true,
  };
}

function getMagazineStructuredPillar(saju: FamousSajuEngineResult, key: "year" | "month" | "day" | "hour") {
  const advanced = asRecord(saju.structuredAdvancedReport);
  const fourPillars = asRecord(advanced.fourPillars);
  return asRecord(fourPillars[key]);
}

function getMagazinePillarStarText(rows: Array<Record<string, unknown>>, key: "year" | "month" | "day" | "hour", pillar: SajuPillarLocal | null | undefined) {
  if (!pillar) return "생시 미상으로 제외";
  const keyHints = [key, pillarLabels[key], pillar.ganji, pillar.stem, pillar.branch].filter(Boolean);
  const names = rows
    .filter((row) => {
      const position = recordString(row, "position");
      return position && !position.includes("직접 확인되지") && keyHints.some((hint) => position.includes(String(hint)));
    })
    .map((row) => recordString(row, "shinsalName"))
    .filter(Boolean);
  return uniqueKeywords(names).slice(0, 3).join(" · ") || "알 수 없음";
}

function toMagazinePillar(
  saju: FamousSajuEngineResult,
  key: "year" | "month" | "day" | "hour",
  activeShinsalRows: Array<Record<string, unknown>>,
): CelebritySajuMagazinePillar | null {
  const pillar = saju.pillars[key];
  if (!pillar) return key === "hour" ? null : buildUnknownMagazinePillar(pillarLabels[key]);

  const structured = getMagazineStructuredPillar(saju, key);
  const hiddenStems = recordRows(structured, "hiddenStems");
  const stages = getTwelveStagesForPillars(saju as unknown as Parameters<typeof getTwelveStagesForPillars>[0]);
  const hiddenStemCore = hiddenStems
    .slice(0, 3)
    .map((row) => [recordString(row, "stem"), recordString(row, "tenGod") ? `(${recordString(row, "tenGod")})` : ""].join(""))
    .filter(Boolean)
    .join(" · ");
  const branchTenGod = firstRecordText(hiddenStems[0] || {}, ["tenGod"], "알 수 없음");

  return {
    label: pillarLabels[key],
    ganji: pillar.ganji,
    stem: pillar.stem,
    stemTenGod: key === "day" ? "일간" : recordString(structured, "tenGod", "알 수 없음"),
    branch: pillar.branch,
    branchTenGod,
    hiddenStemCore: hiddenStemCore || "알 수 없음",
    twelveStage: String(stages[key] || "알 수 없음"),
    twelveGod: "알 수 없음",
    majorStars: getMagazinePillarStarText(activeShinsalRows, key, pillar),
  };
}

function classifyMagazineStars(rows: Array<Record<string, unknown>>) {
  const goodNames = new Set(["천을귀인", "문창귀인", "태극귀인", "월덕귀인", "천덕귀인"]);
  const cautionNames = new Set(["괴강살", "백호살", "양인살", "귀문관살", "원진살", "형살", "공망"]);
  const toStar = (row: Record<string, unknown>): CelebritySajuMagazineStar => ({
    name: recordString(row, "shinsalName", "알 수 없음"),
    category: recordString(row, "category", "보조 신호"),
    position: recordString(row, "position", "알 수 없음"),
    reading: formatAccessibleFortuneTerms(firstRecordText(row, ["actualLifeManifestation", "natalMeaning"], "명리학적 보조 신호로만 살핍니다.")),
  });
  const activeRows = rows
    .filter((row) => !recordString(row, "position").includes("직접 확인되지"))
    .filter((row) => recordString(row, "shinsalName"));

  return {
    goodStars: activeRows.filter((row) => goodNames.has(recordString(row, "shinsalName"))).map(toStar).slice(0, 6),
    neutralStars: activeRows.filter((row) => {
      const name = recordString(row, "shinsalName");
      return !goodNames.has(name) && !cautionNames.has(name);
    }).map(toStar).slice(0, 6),
    cautionStars: activeRows.filter((row) => cautionNames.has(recordString(row, "shinsalName"))).map(toStar).slice(0, 6),
  };
}

function getElementExtremes(counts: Record<ElementKey, number>, mode: "max" | "min") {
  const values = Object.entries(counts) as Array<[ElementKey, number]>;
  const target = mode === "max"
    ? Math.max(...values.map(([, count]) => count))
    : Math.min(...values.map(([, count]) => count));
  return values.filter(([, count]) => count === target).map(([element]) => element);
}

function buildElementFlowText(strongest: ElementKey[], weakest: ElementKey[]) {
  if (!strongest.length) return "오행의 흐름이 아직 충분히 열리지 않았습니다. 계산된 원국이 부족하면 기운을 꾸며 붙이지 않고, 확인된 자리만 남기는 것이 명리의 바른 태도입니다.";
  if (strongest.length === 5 && weakest.length === 5) {
    return "오행이 한쪽으로 크게 쏠리지 않습니다. 특정 기운 하나가 판을 독점하기보다 목·화·토·금·수가 서로 견제하며 명식의 호흡을 나눕니다. 이런 원국은 속도가 폭발적으로 치솟기보다 상황에 맞춰 힘을 배분하는 데 강점이 있습니다. 다만 균형형 명식은 결정적인 순간에 어느 기운을 앞세울지 의식적으로 선택해야 사주의 쓰임이 더 선명해집니다.";
  }

  const strongBody = strongest.map((element) => elementSurgeTone[element]).join(" ");
  const weakBody = weakest.map((element) => elementEmptyTone[element]).join(" ");
  return `${strongest.join("·")} 기운이 먼저 명식을 움직입니다. ${strongBody} 그러나 ${weakest.join("·")} 기운이 약하면 흐름의 한쪽이 비어 속도와 균형 사이에 간극이 생깁니다. ${weakBody} 명리적으로는 강한 오행을 단순히 꺾기보다, 약한 오행이 맡아야 할 역할을 생활 리듬과 선택의 방식 안에서 되살리는 것이 중요합니다. 이때 보완 기운은 부족한 성향을 억지로 더하는 장식이 아니라, 원국의 과열과 공백을 조율하는 실제 처방의 축으로 보아야 합니다.`;
}

// 요약 카드용: 오행의 한 줄 핵심 (가장 짧은 층위)
function buildElementSummaryLine(strongest: ElementKey[], weakest: ElementKey[]) {
  if (!strongest.length) return "오행 분포가 아직 충분히 열리지 않았습니다.";
  if (strongest.length >= 5) return "다섯 기운이 고르게 나뉜 균형형 명식입니다.";
  const strongestText = strongest.join("·");
  const weakestText = weakest.join("·");
  return `${topicParticle(strongestText)} 가장 선명하고, ${topicParticle(weakestText)} 의식적으로 채워야 하는 결입니다.`;
}

// 오행 섹션/차트용: 기운이 어떻게 배치되어 작동하는지 구조 설명 (중간 층위)
function buildElementStructureLine(strongest: ElementKey[], weakest: ElementKey[]) {
  if (!strongest.length) return "계산된 오행이 부족하면 구조를 임의로 그리지 않고 비워 둡니다.";
  if (strongest.length >= 5) return "특정 기운이 판을 독점하지 않고 다섯 오행이 서로 견제하며 명식의 축을 나눠 잡는 구조입니다. 힘을 배분하는 데 강점이 있는 대신, 결정적 순간에 어느 기운을 앞세울지 스스로 골라야 방향이 또렷해집니다.";
  const strongestText = strongest.join("·");
  const weakestText = weakest.join("·");
  return `${topicParticle(strongestText)} 명식의 축을 잡고 ${topicParticle(weakestText)} 뒤로 물러선 구조입니다. 강한 오행이 방향과 속도를 정하는 사이, 약한 오행이 맡아야 할 역할은 생활 리듬 안에서 따로 세워야 좌우의 균형이 섭니다.`;
}

function connectStemTone(text: string) {
  return text
    .replace(/합니다\.$/, "하며")
    .replace(/습니다\.$/, "으며")
    .replace(/입니다\.$/, "이며")
    .replace(/[.。]\s*$/, "");
}

function buildDayPillarTexture(saju: FamousSajuEngineResult, dayPillar: string, dayElement: string) {
  const branchElement = elementByBranch[saju.pillars.day.branch] || "지지";
  const stemText = connectStemTone(stemTone[saju.dayStem] || `${dayElement} 일간은 자기 결을 따라 움직입니다.`);
  return `${dayPillar}. ${stemText}, 일지 ${saju.pillars.day.branch}는 ${branchElement} 기운으로 그 성정을 현실의 자리와 감정의 온도에 묶어 둡니다. 일주는 이 명식이 세상을 받아들이는 첫 기준이므로, 천간의 의지와 지지의 생활 감각을 함께 보아야 실제 기질이 선명해집니다.`;
}

function findTenGodPositions(name: string, pillars: Array<CelebritySajuMagazinePillar | null>) {
  const positions = pillars
    .filter((pillar): pillar is CelebritySajuMagazinePillar => Boolean(pillar && !pillar.isUnknown))
    .filter((pillar) => [pillar.stemTenGod, pillar.branchTenGod, pillar.hiddenStemCore].some((value) => String(value || "").includes(name)))
    .map((pillar) => pillar.label);
  return uniqueKeywords(positions).join("·") || "원국의 표면 점수";
}

function buildTenGodReading(
  name: string,
  positionText: string,
  dayElement: string,
  strongestText: string,
  weakestText: string,
  fact?: CelebritySajuAnnotationFact,
) {
  const tone = tenGodReadingTone[name] || {
    nature: `${topicParticle(name)} 일간이 세상과 만나는 독자적인 작용이다. 단순한 성격표가 아니라 힘이 어디로 흐르고 무엇을 먼저 선택하는지를 가리킨다.`,
    motion: "이 힘은 원국의 다른 오행과 섞이며 행동의 습관과 관계의 반응으로 드러난다.",
    caution: "다만 약한 오행이 받쳐 주지 못하면 작용이 한쪽으로 기울어 조율이 필요하다.",
  };

  // annotation이 있으면 인물의 실제 행적을 증거로 인용해 고유 문장을 만든다.
  // 없으면 명식의 자리·오행 힘으로 십성별 고유 문장을 구성한다(공통 꼬리 문장 없음).
  const evidence = fact
    ? `${fact.deed}. ${fact.note}.`
    : `이 명식에서 ${topicParticle(name)} ${positionText}에 걸립니다. ${dayElement} 일간이 ${strongestText} 기운 위에 설 때 그 색이 가장 진해지고, ${weakestText} 기운이 옅은 자리에서는 반대로 속도를 늦추는 조율이 필요해집니다.`;

  return `${tone.nature} ${tone.motion}\n\n${evidence} ${tone.caution}`;
}

function buildMagazineTenGodHighlights(
  saju: FamousSajuEngineResult,
  pillars: Array<CelebritySajuMagazinePillar | null>,
  dayElement: string,
  strongestText: string,
  weakestText: string,
  annotation?: CelebritySajuAnnotation | null,
) {
  const visible = asRecord(asRecord(getNatalAnalysis(saju).tenGods).visible);
  const highlights = Object.entries(visible)
    .filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => {
      const positionText = findTenGodPositions(name, pillars);
      const fact = annotation?.facts.find((item) => item.linkType === "tenGod" && item.link === name);
      return {
        name,
        meaning: tenGodMeaning[name] || "명식 안에서 드러나는 재능의 작용",
        reading: buildTenGodReading(name, positionText, dayElement, strongestText, weakestText, fact),
      };
    });

  return highlights.length ? highlights : [
    {
      name: "십성 확인 필요",
      meaning: "계산값 보강 필요",
      reading: "십성 점수가 충분히 드러나지 않으면 작용을 꾸며 붙이지 않는다. 이 경우 일간과 오행의 흐름을 먼저 세우고, 십성은 확인된 자리 안에서만 낮게 읽는다.\n\n원국의 표면 점수가 열리지 않은 명식은 강한 단정 대신 구조를 남긴다. 일간이 어떤 오행 위에 서 있는지, 월령과 지지가 어떤 방향으로 힘을 주는지가 우선 기준이다.",
    },
  ];
}

function buildStarReading(name: string) {
  if (name.includes("귀인")) return "귀인은 막힌 흐름에 숨통을 여는 별이다. 위기의 순간 기운이 완전히 끊기지 않고, 필요한 사람이나 조건이 옆에서 받쳐 주는 식으로 나타난다.";
  if (name.includes("문창")) return "문창은 말과 글, 배움의 문을 밝히는 별이다. 생각을 정리해 형태로 남기는 힘이 살아나고, 지식이 품격으로 변한다.";
  if (name.includes("도화")) return "도화는 시선을 모으는 꽃의 기운이다. 매력은 부드럽지만 주변의 반응을 크게 흔들 수 있어, 감각과 관계의 온도가 함께 올라간다.";
  if (name.includes("역마")) return "역마는 머무는 기운보다 움직이는 기운이 강한 신살이다. 이동, 확장, 환경 변화 속에서 명식의 힘이 깨어난다.";
  if (name.includes("화개")) return "화개는 화려함을 안쪽으로 접어 깊이를 만드는 별이다. 고독한 몰입과 전문성이 살아나며, 보이는 자리보다 혼자 닦은 시간이 힘이 된다.";
  if (["괴강", "백호", "양인"].some((keyword) => name.includes(keyword))) return "날이 선 신살은 강한 압력과 결단의 기운을 품는다. 부드럽게 흐르기보다 한 번에 치고 나가는 힘이 강해, 원국의 속도를 더 날카롭게 만든다.";
  if (name.includes("공망")) return "공망은 한 자리가 비어 있는 감각을 만든다. 비어 있음은 약점만이 아니라, 집착을 덜고 다른 방식으로 길을 여는 여백이 된다.";
  return `${topicParticle(name)} 원국의 결을 한 겹 더 선명하게 만드는 신살이다. 이름 하나로 길흉을 정하지 않고, 오행과 십성의 흐름 속에서 어떤 색을 더하는지 보아야 한다.`;
}

function buildSinsalTextureText(stars: CelebritySajuMagazineStar[], strongestText: string, primaryTenGod: string) {
  const activeStars = stars.filter((star) => star.name && star.name !== "알 수 없음").slice(0, 4);
  if (!activeStars.length) {
    return `원국에서 크게 앞서는 신살은 두드러지지 않는다. 이런 명식은 별의 이름보다 일간, 오행, 십성의 기본 구조가 해석의 중심이 된다. 신살이 약하게 잡히면 외부 표식보다 원국 자체의 균형이 더 중요해진다. ${strongestText} 기운과 ${primaryTenGod}의 작용을 먼저 읽어야 전체 결이 흐트러지지 않는다.`;
  }

  return activeStars
    .map((star) => {
      const position = star.position && star.position !== "알 수 없음" ? `${star.position}에서 ` : "";
      return `${topicParticle(star.name)} ${position}작동한다. ${buildStarReading(star.name)} 이 명식에서는 ${strongestText} 기운과 ${primaryTenGod}의 작용을 통과하므로, ${star.name}도 따로 떠 있는 표식이 아니라 원국의 속도와 관계의 압력을 조율하는 색으로 드러난다.`;
    })
    .join("\n\n");
}

function formatKoreanLabelList(labels: string[]) {
  if (labels.length <= 1) return labels[0] || "";
  if (labels.length === 2) return `${labels[0]}와 ${labels[1]}`;
  return `${labels.slice(0, -1).join("·")}와 ${labels[labels.length - 1]}`;
}

function toPositionedTwelveStageText(stage: string, text?: string) {
  const fallback = "일간의 힘이 해당 지지에서 쓰이는 방식을 보여 줍니다.";
  const safeText = text || fallback;
  return safeText.startsWith(`${stage}은 `) ? safeText.slice(`${stage}은 `.length) : safeText;
}

function buildTwelveStageMaturityText(pillars: Array<CelebritySajuMagazinePillar | null>, birthTimeKnown: boolean) {
  const rows = pillars
    .filter((pillar): pillar is CelebritySajuMagazinePillar => Boolean(pillar && !pillar.isUnknown))
    .map((pillar) => ({ label: pillar.label, stage: pillar.twelveStage, tone: twelveStageTone[pillar.twelveStage] }))
    .filter((row) => row.stage && row.stage !== "알 수 없음");
  if (!rows.length) return "12운성의 흐름이 충분히 열리지 않았습니다. 이럴 때는 성장과 절정, 쇠퇴를 임의로 꾸미지 않고 일간과 오행의 기본 힘을 먼저 봅니다.";

  const counts = rows.reduce<Record<"성장기" | "절정기" | "쇠퇴기", number>>((acc, row) => {
    const phase = row.tone?.phase || "성장기";
    acc[phase] += 1;
    return acc;
  }, { 성장기: 0, 절정기: 0, 쇠퇴기: 0 });
  const dominantPhase = (Object.entries(counts) as Array<["성장기" | "절정기" | "쇠퇴기", number]>).sort((a, b) => b[1] - a[1])[0][0];
  const groupedRows = Array.from(rows.reduce<Map<string, typeof rows>>((acc, row) => {
    const group = acc.get(row.stage) || [];
    group.push(row);
    acc.set(row.stage, group);
    return acc;
  }, new Map()).values());
  const details = groupedRows
    .map((group) => {
      const [first] = group;
      if (group.length === 1) {
        return `${first.label}의 ${first.stage}은 ${toPositionedTwelveStageText(first.stage, first.tone?.text)}`;
      }
      const labels = formatKoreanLabelList(group.map((row) => row.label));
      const repeatText = repeatedTwelveStageTone[first.stage] || `${first.stage}이 여러 주에 반복되면 같은 운성의 결이 원국 안에서 겹쳐 흐릅니다. 한 자리의 의미로만 보지 않고, 삶의 속도와 반응 방식 전체에 반복적으로 작동하는 힘으로 읽어야 합니다.`;
      return `${labels}에 ${first.stage}이 함께 드러납니다. ${repeatText} 기본 성정으로 보면 ${toPositionedTwelveStageText(first.stage, first.tone?.text)}`;
    })
    .join("\n\n");

  return `${details}\n\n${birthTimeKnown ? "4주 전체로" : "3주 기준으로"} 보면 이 명식은 ${dominantPhase} 흐름이 가장 뚜렷합니다. 성장기는 시작과 감각을, 절정기는 자기 힘의 장악을, 쇠퇴기는 정리와 절제를 맡습니다. 같은 운성이 반복되는 자리는 단순한 강조가 아니라, 일간이 비슷한 방식으로 여러 삶의 장면을 통과한다는 뜻으로 읽습니다. 그래서 이 진단은 좋고 나쁨의 판정이 아니라, 어느 속도로 힘을 쓰고 어디에서 성숙도가 깊어지는지를 보여 주는 지도입니다.`;
}

function buildSajuAnnotation(person: CelebritySajuSeed, birthTimeKnown: boolean) {
  const basis = birthTimeKnown
    ? "생시가 공개되어 시주를 포함한 4주(년·월·일·시주)"
    : "생시가 공개되지 않아 시주를 제외한 3주(년·월·일주)";
  return `${person.nameKo}의 ${basis} 기준으로 풀이했습니다. 이 풀이는 공개 생년월일 기준 명리학 이론으로 계산된 기질 분석이며, 당사자의 실제 성격·사생활·미래를 단정하지 않습니다.`;
}

function buildCelebritySajuMagazineResult(person: CelebritySajuSeed, chart: FamousSajuCalculatedChart): CelebritySajuMagazineResult {
  const { saju, elementProfile } = chart;
  const calendarType = chart.engineInput.calendarType || (person.calendarType === "lunar" ? "lunar" : "solar");
  const birthTimeKnown = Boolean(chart.engineInput.hasTime && saju && !saju.timeUnknown);
  const birthTimeLabel = birthTimeKnown && person.birthTime ? person.birthTime : "시 미상";
  const sourceNote = buildSajuAnnotation(person, birthTimeKnown);

  if (!saju) {
    return {
      schemaVersion: CELEBRITY_SAJU_MAGAZINE_SCHEMA_VERSION,
      directReadingVersion: CELEBRITY_SAJU_DIRECT_READING_VERSION,
      threePillarBasis: true,
      profile: {
        name: person.name,
        displayName: person.nameKo,
        groupOrJob: person.category,
        birthDate: person.birthDate || "알 수 없음",
        calendarType,
        birthTimeKnown: false,
        birthTimeLabel,
        sourceNote,
      },
      pillars: {
        year: buildUnknownMagazinePillar("년주"),
        month: buildUnknownMagazinePillar("월주"),
        day: buildUnknownMagazinePillar("일주"),
        hour: null,
      },
      summary: {
        title: `${person.nameKo} 사주, 공개 기준 확인이 필요한 결`,
        subtitle: `${person.birthDate || "생년월일 미상"} · ${calendarType === "lunar" ? "음력" : "양력"} · ${birthTimeLabel}`,
        coreMetaphor: "아직 닫혀 있는 달빛 기록",
        oneLineReading: "확인되지 않은 명식은 꾸며 말하지 않고 비워 두는 편이 가장 정직합니다.",
        cautionNote: sourceNote,
      },
      fiveElements: {
        wood: 0,
        fire: 0,
        earth: 0,
        metal: 0,
        water: 0,
        strongest: [],
        weakest: [],
        summaryLine: "오행 분포가 아직 열리지 않았습니다.",
        structureLine: "계산값이 충분하지 않아 오행 구조를 표시하지 않습니다.",
        interpretation: "계산값이 충분하지 않아 오행 분포를 표시하지 않습니다.",
      },
      tenGods: { highlights: [] },
      stars: { goodStars: [], neutralStars: [], cautionStars: [] },
      dayElement: "",
      deeds: [],
      sections: [
        {
          id: "calculation-needed",
          title: famousSajuCopy("magazine.chartReviewNeeded"),
          body: `${person.nameKo}의 공개 생년월일 또는 날짜 체계가 명식 기준으로 확정되지 않았습니다. 확인되지 않은 팔자와 격국, 신살을 꾸며 쓰지 않고 공개 자료로 확인 가능한 범위만 남깁니다.`,
        },
      ],
      faq: [
      ],
      cta: {
        title: famousSajuCopy("magazine.selfReadingTitle"),
        description: famousSajuCopy("magazine.selfReadingDesc"),
        buttonText: "내 사주 보러가기",
      },
    };
  }

  const activeShinsalRows = recordRows(asRecord(saju.natalAnalysis.shinsalAnalysis), "activeRows");
  const allShinsalRows = recordRows(asRecord(saju.natalAnalysis.shinsalAnalysis), "rows");
  const magazineStars = classifyMagazineStars(allShinsalRows);
  const year = toMagazinePillar(saju, "year", activeShinsalRows) || buildUnknownMagazinePillar("년주");
  const month = toMagazinePillar(saju, "month", activeShinsalRows) || buildUnknownMagazinePillar("월주");
  const day = toMagazinePillar(saju, "day", activeShinsalRows) || buildUnknownMagazinePillar("일주");
  const hour = birthTimeKnown ? toMagazinePillar(saju, "hour", activeShinsalRows) : null;
  const counts = elementProfile.counts;
  const strongest = getElementExtremes(counts, "max");
  const weakest = getElementExtremes(counts, "min");
  const dayElement = elementByStem[saju.dayStem] || elementProfile.dominantElement;
  const coreMetaphor = elementMetaphor[dayElement] || `${dayElement} 기운의 꽃`;
  const strongestText = strongest.join("·") || "알 수 없음";
  const weakestText = weakest.join("·") || "알 수 없음";
  const annotation = getCelebrityAnnotation(person.slug);
  const magazinePillars = [year, month, day, hour];
  const tenGodHighlights = buildMagazineTenGodHighlights(saju, magazinePillars, dayElement, strongestText, weakestText, annotation);
  const primaryTenGod = tenGodHighlights[0]?.name || "십성";
  const dayPillar = `${saju.pillars.day.ganji}일주`;
  const oneLineReading = `${strongestText} 기운 위에 선 ${topicParticle(dayPillar)} ${primaryTenGod}의 방식으로 자기 날을 세우는 명식입니다. 일간의 기세, 월령의 계절감, 드러난 십성의 작용을 함께 보면 이 명식은 단순한 성향보다 반복되는 선택의 문법으로 읽힙니다.`;
  const dayPillarTexture = buildDayPillarTexture(saju, dayPillar, dayElement);
  const elementSummaryLine = buildElementSummaryLine(strongest, weakest);
  const elementStructureLine = buildElementStructureLine(strongest, weakest);
  const elementInterpretation = buildElementFlowText(strongest, weakest);
  const deeds = (annotation?.facts || []).map((fact) => ({
    deed: fact.deed,
    link: fact.link,
    linkType: fact.linkType,
    note: fact.note,
  }));
  const deedsSectionBody = deeds.length
    ? `계산된 명식은 기질의 골격을 보여 주고, 실제 삶은 그 골격이 어떻게 쓰였는지를 보여 줍니다. ${person.nameKo}의 확인되는 행적을 원국의 십성·오행과 나란히 놓으면, 추상적인 성향 설명이 아니라 "이 기운이 이렇게 쓰였다"는 증거로 사주가 읽힙니다.`
    : "";
  const sinsalTexture = buildSinsalTextureText(
    [...magazineStars.goodStars, ...magazineStars.neutralStars, ...magazineStars.cautionStars],
    strongestText,
    primaryTenGod,
  );
  const twelveStageTexture = buildTwelveStageMaturityText(magazinePillars, birthTimeKnown);

  return {
    schemaVersion: CELEBRITY_SAJU_MAGAZINE_SCHEMA_VERSION,
    directReadingVersion: CELEBRITY_SAJU_DIRECT_READING_VERSION,
    threePillarBasis: !birthTimeKnown,
    profile: {
      name: person.name,
      displayName: person.nameKo,
      groupOrJob: person.subCategory || person.category,
      birthDate: person.birthDate || "알 수 없음",
      calendarType,
      birthTimeKnown,
      birthTimeLabel,
      sourceNote,
    },
    pillars: {
      year,
      month,
      day,
      hour,
    },
    summary: {
      title: `${person.nameKo} ${dayPillar}, ${coreMetaphor}의 결`,
      subtitle: `${person.birthDate || "생년월일 미상"} · ${calendarType === "lunar" ? "음력" : "양력"} · ${birthTimeLabel}`,
      coreMetaphor,
      dayMasterImagery: annotation?.dayMasterImagery,
      oneLineReading,
      cautionNote: sourceNote,
    },
    fiveElements: {
      wood: counts.목,
      fire: counts.화,
      earth: counts.토,
      metal: counts.금,
      water: counts.수,
      strongest,
      weakest,
      summaryLine: elementSummaryLine,
      structureLine: elementStructureLine,
      interpretation: elementInterpretation,
    },
    tenGods: {
      highlights: tenGodHighlights,
    },
    stars: magazineStars,
    dayElement,
    deeds,
    sections: [
      {
        id: "day-pillar-texture",
        title: famousSajuCopy("magazine.thisChartIs"),
        body: dayPillarTexture,
      },
      {
        id: "five-elements",
        title: famousSajuCopy("magazine.elementBalance"),
        body: elementInterpretation,
        cards: [
          { label: famousSajuCopy("magazine.strongElement"), title: strongestText, description: famousSajuCopy("magazine.strongElementDesc") },
          { label: famousSajuCopy("magazine.weakElement"), title: weakestText, description: famousSajuCopy("magazine.weakElementDesc") },
        ],
      },
      {
        id: "ten-gods",
        title: famousSajuCopy("magazine.tenGodTalent"),
        body: `${tenGodHighlights.map((item) => item.name).join(" · ")}이 먼저 떠오릅니다. 십성은 일간이 세상과 부딪히고, 만들고, 지키고, 받아들이는 방식을 가리키는 명리의 언어입니다. 단순한 재능 목록으로 보지 않고, 천간에 드러난 십성은 외부로 표현되는 역할로, 지장간에 숨은 십성은 반복되는 심리와 선택의 습관으로 나누어 읽어야 합니다. 아래의 각 십성은 원국 안에서 놓인 자리와 오행의 힘을 함께 보아야 제 색을 드러냅니다.`,
        cards: tenGodHighlights.map((item) => ({
          label: item.name,
          title: item.meaning,
          description: item.reading,
        })),
      },
      {
        id: "stars",
        title: famousSajuCopy("magazine.sinsalTexture"),
        body: sinsalTexture,
      },
      {
        id: "twelve-stage",
        title: famousSajuCopy("magazine.twelveStageSpeed"),
        body: twelveStageTexture,
      },
      ...(deeds.length
        ? [{
            id: "deeds-and-chart",
            title: "[행적과 사주의 결]",
            body: deedsSectionBody,
            cards: deeds.map((item) => ({
              label: item.linkType === "tenGod" ? `십성 · ${item.link}` : `오행 · ${item.link}`,
              title: item.deed,
              description: item.note,
            })),
          }]
        : []),
      {
        id: "final-texture",
        title: famousSajuCopy("magazine.closingSentence"),
        body: oneLineReading,
      },
      {
        id: "annotation",
        title: "[주석]",
        body: sourceNote,
      },
    ],
    faq: [],
    cta: {
      title: famousSajuCopy("magazine.personalStoryTitle"),
      description: famousSajuCopy("magazine.personalStoryDesc"),
      buttonText: "내 사주 보러가기",
    },
  };
}

export function resolveFamousSajuSlug(rawSlug: string) {
  return getCelebrityBySlug(rawSlug)?.slug || null;
}

export function getFamousSajuPersonBySlug(slug: string) {
  return getCelebrityBySlug(slug);
}

export function calculateFamousSaju(person: CelebritySajuSeed): FamousSajuCalculatedChart {
  const baseChart = {
    status: "needs_review" as const,
    person,
    saju: null,
    elementProfile: buildEmptyElementProfile(),
    engineInput: { hasTime: false, calendarType: "solar" as const },
  };

  if (!person.birthDate) {
    return {
      ...baseChart,
      reliabilityNotes: buildReliabilityNotes(person, null),
      failureReason: "공개 생년월일이 없어 사주 계산을 구성할 수 없습니다.",
    };
  }

  if (person.birthCalendar === "unknown" && !person.calendarType) {
    return {
      ...baseChart,
      reliabilityNotes: buildReliabilityNotes(person, null),
      failureReason: "양력·음력 기준이 불명확해 계산을 보류했습니다.",
    };
  }

  try {
    const birth = parseBirthDate(person.birthDate);
    const time = person.birthTimeStatus === "verified" && person.isBirthTimeKnown ? parseBirthTime(person.birthTime) : null;
    const calendarType = person.calendarType || (person.birthCalendar === "lunar" ? "lunar" : "solar");
    const engineInput = {
      ...birth,
      hour: time?.hour,
      minute: time?.minute,
      hasTime: Boolean(time),
      calendarType,
      gender: person.gender || "unknown",
      birthplace: person.birthPlace || undefined,
    };

    // 사주 엔진 연결 핵심부: 유명인 데이터의 공개 생년월일만 입력하고, 시간이 검증되지 않으면 hasTime=false로 넘긴다.
    // calculateLocalSaju는 이 경우 내부 기준 시각을 계산 편의용으로만 쓰고 hourPillar를 null로 돌려주므로, 화면에는 삼주만 노출된다.
    const saju = calculateLocalSaju(engineInput) as FamousSajuEngineResult;
    return {
      status: "calculated",
      person,
      saju,
      elementProfile: buildElementProfile(saju),
      engineInput,
      reliabilityNotes: buildReliabilityNotes(person, saju),
    };
  } catch (error) {
    void error;
    return {
      ...baseChart,
      reliabilityNotes: buildReliabilityNotes(person, null),
      failureReason: "공개 생년월일과 날짜 기준을 다시 확인해야 합니다.",
    };
  }
}

export function buildFamousSajuArticle(person: CelebritySajuSeed, calculatedChart = calculateFamousSaju(person)): FamousSajuArticle {
  const { saju, elementProfile } = calculatedChart;
  const timeNotice = buildContentNotice(person, saju, calculatedChart.failureReason);
  const engineInputSummary = formatEngineInput(calculatedChart);
  const magazine = buildCelebritySajuMagazineResult(person, calculatedChart);

  if (!saju) {
    const heroCopy = `${person.nameKo}의 사주는 공개 생년월일 기준을 더 확인한 뒤 조심스럽게 읽어야 합니다.`;
    const coreKeywords = uniqueKeywords(["명식 기준 확인 필요", person.category, ...person.tags.slice(0, 3)]).slice(0, 5);
    const analysisBadge = "명식 기준 확인 필요";
    const summary = `${person.nameKo}의 유명인 사주 분석은 명식 기준 확인이 먼저 필요한 상태입니다. 확인되지 않은 팔자·격국·보완 기운·대운을 임의로 꾸미지 않습니다.`;
    return polishFamousSajuArticle({
      celebrity: person,
      person,
      saju: null,
      calculationStatus: "needs_review",
      magazine,
      dayElement: "확인 필요",
      dayMasterLabel: "명식 기준 확인 필요",
      hourText: "명식 기준 확인 필요",
      elementProfile,
      engineInputSummary,
      heroImageQuery: "starry sky destiny silhouette mystical atmosphere",
      heroCopy,
      coreKeywords,
      analysisBadge,
      timeNotice,
      summary,
      sections: [
        {
          title: famousSajuCopy("magazine.chartReviewNeeded"),
          imageQuery: "archive document candle desk",
          imageSection: "default",
          body: `${person.nameKo}의 공개 생년월일 또는 날짜 체계가 명식 기준으로 확정되지 않았습니다. 확인되지 않은 사주팔자, 격국, 보완 기운, 대운, 성격, 직업운을 꾸며내지 않기 위해 본문 해석을 조용히 보류합니다.`,
        },
      ],
      insightCards: [
        { label: famousSajuCopy("magazine.chartStatus"), value: "확인 필요", description: calculatedChart.failureReason || "명식 기준이 아직 충분히 열리지 않았습니다." },
        { label: famousSajuCopy("magazine.standard"), value: engineInputSummary, description: famousSajuCopy("magazine.confirmableBirthOnly") },
      ],
      reliabilityNotes: calculatedChart.reliabilityNotes,
      conclusion: "명식 기준이 확인되기 전까지는 조용히 비워두는 것이 가장 정직한 해석입니다.",
      seoTitle: buildFamousSajuSeoTitle(person),
      seoDescription: `${person.nameKo}의 명식 기준이 확인되기 전까지 임의 해석을 만들지 않고, 공개 자료로 확인 가능한 범위만 조심스럽게 남기는 유명인 사주 분석입니다.`,
      seoKeywords: uniqueKeywords([...person.seoKeywords, `${person.nameKo} 사주`, "유명인 사주", "명식 기준 확인 필요"]),
    });
  }

  const dayStem = saju.dayStem;
  const natalAnalysis = getNatalAnalysis(saju);
  const dayMaster = asRecord(natalAnalysis.dayMaster);
  const monthCommand = asRecord(natalAnalysis.monthCommand);
  const tenGods = asRecord(natalAnalysis.tenGods);
  const usefulElements = asRecord(natalAnalysis.usefulElements);
  const gyeokgukAnalysis = asRecord(natalAnalysis.gyeokgukAnalysis);
  const yongshinAnalysis = asRecord(natalAnalysis.yongshinAnalysis);
  const gyeokRequired = asRecord(gyeokgukAnalysis.requiredOutput);
  const yongshinJudgment = asRecord(yongshinAnalysis.judgment);
  const yongshinRequired = asRecord(yongshinAnalysis.requiredExplanation);
  const visibleTenGods = asRecord(tenGods.visible);
  const activatedByLuck = asRecord(tenGods.activatedByLuck);
  const daewoonAnalysis = asRecord(natalAnalysis.daewoonAnalysis);
  const daewoonRequired = asRecord(daewoonAnalysis.requiredOutput);
  const currentDaewoon = asRecord(daewoonAnalysis.currentDaewoon);
  const daewoonYongshinChange = asRecord(daewoonAnalysis.yongshinGisinChange);
  const daewoonHalf = asRecord(daewoonAnalysis.firstSecondHalf);
  const luckInteraction = asRecord(natalAnalysis.luckInteractionDetailAnalysis);
  const luckDaewoonFoundation = asRecord(luckInteraction.daewoonFoundation);
  const luckAnnualTrigger = asRecord(luckInteraction.annualEventTrigger);
  const luckIntegratedReading = asRecord(luckInteraction.integratedFinalReading);
  const transformationTiming = asRecord(natalAnalysis.transformationTimingAnalysis);
  const scoringAnalysis = asRecord(natalAnalysis.scoringAnalysis);
  const scoringRows = recordRows(scoringAnalysis, "items");
  const luckRows = recordRows(activatedByLuck, "rows");
  const daewoonRows = luckRows.filter((row) => recordString(row, "scope") === "daewoon");
  const annualRows = luckRows.filter((row) => recordString(row, "scope") === "annual");
  const monthlyRows = luckRows.filter((row) => recordString(row, "scope") === "monthly");
  const usefulElementKo = recordStringArray(usefulElements, "finalPriorityKo");
  const johuUseful = toEngineElementKo(recordString(usefulElements, "johuUseful"));
  const yongshinReasons = recordStringArray(yongshinRequired, "whyThisElement");
  const inferredMonthElement = elementByBranch[saju.pillars.month.branch] || elementProfile.dominantElement;
  const dayElement = recordString(dayMaster, "elementKo", elementByStem[dayStem] || elementProfile.dominantElement);
  const dayStrength = recordString(dayMaster, "strength", `${elementProfile.dominantElement} 기운 우세`);
  const strengthIndex = recordNumber(dayMaster, "strengthIndex");
  const monthElement = recordString(monthCommand, "commandingElementKo", inferredMonthElement);
  const monthSeason = recordString(monthCommand, "season", `${monthElement} 계절감`);
  const monthPriority = formatAccessibleFortuneTerms(recordString(monthCommand, "priority", "월지는 사주 전체의 계절감을 읽는 핵심 기준입니다."));
  const elementRanking = formatElementRanking(saju);
  const topTenGods = formatTopRecordScores(visibleTenGods) || "십성 점수 확인 필요";
  const luckStatus = recordString(activatedByLuck, "status", "not_supplied");
  const luckStatusText = formatLuckStatus(luckStatus);
  const dayMasterLabel = `${saju.pillars.day.ganji} 일주`;
  const hourText = saju.pillars.hour?.ganji || "출생 시간 미상";
  const daewoonStartAge = getDaewoonStartAge(saju);
  const daewoonText = daewoonStartAge !== null
    ? `${saju.daewoonDirection === "forward" ? "순행" : saju.daewoonDirection === "reverse" ? "역행" : "방향 확인"} · 시작 ${daewoonStartAge}세`
    : "대운 시작값 확인 필요";
  const usefulText = usefulElementKo.length ? usefulElementKo.join(" · ") : johuUseful || "보완 기운 확인 필요";
  const visibleUsefulText = usefulText;
  const finalGyeokguk = recordString(gyeokgukAnalysis, "finalGyeokguk")
    || recordString(gyeokRequired, "finalGyeokguk")
    || "격국 확인 필요";
  const gyeokReason = personalizeFamousFortuneSentence(formatAccessibleFortuneTerms(
    recordString(gyeokgukAnalysis, "judgmentReason")
      || recordString(gyeokRequired, "reason")
      || "월령과 일간 강약을 함께 보아 잠정 기준으로만 읽습니다."
  ), person.nameKo);
  const gyeokReasonLens = /[흐름힘]$/.test(gyeokReason) ? `${gyeokReason}으로` : `${gyeokReason}로`;
  const yongshinReason = personalizeFamousFortuneSentence(alignGyeokStrengthLanguage(
    formatAccessibleFortuneTerms(
      recordString(yongshinJudgment, "reason")
        || yongshinReasons.slice(0, 2).join(" / ")
        || "조후와 억부, 격국의 균형을 함께 보아 보완 기운의 축을 조심스럽게 잡습니다."
    ),
    finalGyeokguk
  ), person.nameKo);
  const structuralIssues = Array.isArray(natalAnalysis.structuralIssues)
    ? natalAnalysis.structuralIssues
      .map((item) => asRecord(item))
      .map((item) => recordString(item, "label") || recordString(item, "name") || recordString(item, "code"))
      .filter(Boolean)
      .slice(0, 2)
    : [];
  const structureText = structuralIssues.length ? formatAccessibleFortuneTerms(structuralIssues.join(" · ")) : "큰 구조 경고 없음";
  const structureSignalText = structureText === "큰 구조 경고 없음"
    ? `${person.nameKo}에게 큰 구조 경고가 두드러지지 않는 흐름`
    : `${person.nameKo}에게 ${structureText}로 읽히는 구조`;
  const daewoonLabel = firstRecordText(currentDaewoon, ["label", "ganji"])
    || firstRecordText(luckDaewoonFoundation, ["label", "ganji"])
    || formatRecordHighlights(daewoonRows, ["label", "ganji"], daewoonText, 1);
  const daewoonSummary = formatAccessibleFortuneTerms(
    recordString(daewoonAnalysis, "summary")
      || recordString(daewoonRequired, "summary")
      || `${daewoonText} 흐름을 원국의 균형 위에서 조심스럽게 읽습니다.`
  );
  const daewoonChange = formatAccessibleFortuneTerms(
    recordString(daewoonYongshinChange, "result")
      || recordString(daewoonRequired, "yongshinGisinChange")
      || "보완 기운과 부담 기운이 함께 움직이는 대운"
  );
  const sectionVariantSeed = `${person.slug}:${person.category}:${finalGyeokguk}`;
  const daewoonNeedsConfirmation = /확인 필요|확정하기 어렵|미상|없음/.test(daewoonLabel);
  const daewoonSummaryLead = daewoonNeedsConfirmation
    ? pickFamousVariant([
      `대운은 ${person.nameKo}의 공개 자료 기준에서 시작값 확인이 필요하며`,
      `장기 운의 문은 공개 기준만으로 단정하지 않고`,
      `대운 시작점은 확정하지 않은 채 원국의 균형을 먼저 놓고`,
      `대운은 공개 명식의 한계를 인정하며 조심스럽게 비워 두고`,
    ], sectionVariantSeed, 20)
    : `대운은 ${daewoonLabel} 축을 중심으로 보며`;
  const daewoonConclusionLead = daewoonNeedsConfirmation
    ? pickFamousVariant([
      `대운은 ${person.nameKo}의 공개 기준에서 조심스럽게 비워 두고`,
      `${person.nameKo}의 장기 운은 공개 자료의 경계를 넘지 않는 선에서`,
      `${person.nameKo}의 대운 시작점은 단정하지 않고 원국의 흐름 안에서`,
      "대운은 확정된 연령표보다 명식의 균형을 중심에 두고",
    ], sectionVariantSeed, 21)
    : `대운은 ${daewoonLabel}의 문으로`;
  const daewoonFoundationText = formatAccessibleFortuneTerms(
    recordString(luckDaewoonFoundation, "interpretation")
      || firstRecordText(luckIntegratedReading, ["daewoonBase"])
      || "대운은 천간의 외부 사건성과 지지의 생활권 변화를 나누어 읽습니다."
  );
  const categoryVoice = getFamousSajuCategoryVoice(person);
  const daewoonFirstHalf = formatAccessibleFortuneTerms(recordString(daewoonHalf, "firstHalf") || "전반 5년은 드러난 선택과 사회적 사건성이 먼저 움직입니다.");
  const daewoonSecondHalf = formatAccessibleFortuneTerms(recordString(daewoonHalf, "secondHalf") || "후반 5년은 생활권, 몸, 관계의 환경 변화로 깊게 체감됩니다.");
  const daewoonCareerChange = formatCareerChangeForCategory(
    categoryVoice,
    formatAccessibleFortuneTerms(recordString(daewoonAnalysis, "careerChange") || recordString(daewoonRequired, "careerChange") || "직업과 역할은 강한 십성이 현실에서 쓰이는 방향으로 정리됩니다."),
    elementProfile.dominantElement,
    `${person.slug}:${person.category}:${finalGyeokguk}:career`
  );
  const daewoonWealthChange = formatWealthChangeForCategory(
    categoryVoice,
    formatAccessibleFortuneTerms(recordString(daewoonAnalysis, "wealthChange") || recordString(daewoonRequired, "wealthChange") || "재물 흐름은 확장보다 감당 가능한 구조를 먼저 보아야 합니다."),
    `${person.slug}:${person.category}:${finalGyeokguk}:wealth`
  );
  const daewoonLoveChange = formatRelationshipChangeForCategory(
    person,
    categoryVoice,
    formatAccessibleFortuneTerms(recordString(daewoonAnalysis, "loveMarriageChange") || recordString(daewoonRequired, "loveMarriageChange") || "관계 흐름은 속도보다 약속의 범위와 거리감 조절이 중요합니다."),
    `${person.slug}:${person.category}:${finalGyeokguk}:relationship`
  );
  const daewoonHealthChange = formatAccessibleFortuneTerms(recordString(daewoonAnalysis, "healthPsychologyChange") || recordString(daewoonRequired, "healthPsychologyChange") || "몸과 마음은 강한 기운을 오래 담을 수 있는 리듬을 필요로 합니다.");
  const daewoonHowToUse = formatAccessibleFortuneTerms(
    recordString(daewoonAnalysis, "howToUse")
      || recordString(daewoonRequired, "howToUse")
      || `보완 기운 ${visibleUsefulText}의 쓰임이 살아나는 선택은 길게 가져가고, 과한 기운은 정리와 휴식으로 덜어내는 것이 좋습니다.`
  );
  const bestYearRows = recordRows(daewoonAnalysis, "bestYears").length ? recordRows(daewoonAnalysis, "bestYears") : recordRows(daewoonRequired, "bestYears");
  const cautionYearRows = recordRows(daewoonAnalysis, "cautionYears").length ? recordRows(daewoonAnalysis, "cautionYears") : recordRows(daewoonRequired, "cautionYears");
  const bestYearText = formatAccessibleFortuneTerms(formatRecordHighlights(bestYearRows, ["label", "reason"], "보완 기운이 살아나는 해에는 장기 기회와 신뢰를 키우는 쪽으로 운을 씁니다.", 3));
  const cautionYearText = formatAccessibleFortuneTerms(formatRecordHighlights(cautionYearRows, ["label", "reason"], "부담 기운이 과해지는 해에는 확장보다 정리, 건강, 관계 경계를 먼저 살핍니다.", 3));
  const annualLabel = firstRecordText(luckAnnualTrigger, ["label", "ganji"])
    || formatRecordHighlights(annualRows, ["label", "ganji"], "세운 흐름 확인 필요", 1);
  const annualSummaryFocus = annualLabel === "세운 흐름 확인 필요"
    ? "특정 세운을 단정하기보다 대운 위에 얹히는 사건성"
    : `${annualLabel}의 사건성`;
  const annualClassification = formatAccessibleFortuneTerms(
    recordString(luckAnnualTrigger, "finalClassification")
      || firstRecordText(luckIntegratedReading, ["annualEvent"])
      || "세운은 대운 위에 얹히는 사건의 기운으로, 원국의 보완 기운과 부담 기운을 어떻게 흔드는지에 따라 달라집니다."
  );
  const annualPrescription = formatAccessibleFortuneTerms(
    recordString(luckIntegratedReading, "practicalPrescription")
      || "세운의 사건은 직업, 돈, 관계를 한꺼번에 판단하지 말고 먼저 움직이는 영역부터 차분히 분리해 보아야 합니다."
  );
  const annualScoreReason = formatAccessibleFortuneTerms(formatScoreReason(scoringRows, "annualFortune", "세운은 대운 위에서 보완 기운이 살아나는지, 부담 기운이 과해지는지를 함께 보아야 합니다."));
  const transformationText = formatAccessibleFortuneTerms(
    formatRecordHighlights(
      [
        ...recordRows(transformationTiming, "gisinToYongshin"),
        ...recordRows(transformationTiming, "yongshinToGisin"),
        ...recordRows(transformationTiming, "strongestTransformations"),
      ],
      ["requiredPhrase", "category", "activationTiming"],
      "합충과 지장간 개방은 확인되는 지점에서만 조심스럽게 사건성으로 읽습니다.",
      3,
    )
  );
  const monthlyText = monthlyRows.length
    ? formatAccessibleFortuneTerms(formatRecordHighlights(monthlyRows, ["label", "ganji", "effect", "reason"], "월운은 세운의 사건을 짧은 리듬으로 드러냅니다.", 3))
    : "월운은 원국의 보완 기운을 살리는 달과 과한 기운을 덜어야 하는 달로 나누어 보면 좋습니다.";
  const quantumAxis = `${dayMasterLabel} · ${monthElement} 월령 · ${finalGyeokguk} · 보완 기운 ${visibleUsefulText}`;
  const analysisBadge = saju.timeUnknown ? "명리 해석 · 출생 시간 미상 / 시주 제외" : "명리 해석 · 시주 포함";
  const coreKeywords = uniqueKeywords([dayMasterLabel, `${dayElement} 일간`, `${elementProfile.dominantElement} 기운`, finalGyeokguk, ...person.tags]).slice(0, 5);
  const annualPrescriptionForBody = /^대운의 기반은 유지하되 세운 사건은 분야별로 쪼개어 직업, 돈, 관계의 실행 순서를 분리한다\.?$/.test(annualPrescription)
    ? pickFamousVariant([
      `${person.nameKo}의 세운 사건은 직업, 돈, 관계를 한꺼번에 묶지 말고 먼저 흔들리는 영역부터 분리해 보아야 합니다.`,
      `${person.nameKo}에게 들어오는 올해의 사건은 일·돈·관계 중 어느 문이 먼저 열리는지 나누어 볼 때 정확해집니다.`,
      `${person.nameKo}의 세운은 큰 흐름을 뒤집는 말이 아니라, 직업·재물·관계의 실행 순서를 다시 배열하게 하는 신호입니다.`,
      `${person.nameKo}의 올해 흐름은 하나의 길흉으로 묶기보다, 일의 압력과 돈의 흐름, 관계의 반응을 따로 읽어야 덜 흔들립니다.`,
      `세운은 ${categoryVoice.careerAngle}의 속도와 ${categoryVoice.relationshipAngle}의 반응을 따로 비추므로, 먼저 움직이는 영역을 확인하는 일이 중요합니다.`,
      `올해의 운은 ${person.nameKo}의 강한 ${elementProfile.dominantElement} 기운이 어디서 쓰이고 어디서 과해지는지 살필 때 상담적으로 선명해집니다.`,
    ], sectionVariantSeed, 3)
    : softSentence(annualPrescription);
  const careerChangeForBody = trimFortuneLead(daewoonCareerChange, ["직업과 역할은", "직업 흐름은", "직업운은"]);
  const wealthChangeForBody = trimFortuneLead(daewoonWealthChange, ["재물 흐름은", "재물의 흐름은", "재물운은"]);
  const tagSummaryText = person.tags.join(" · ") || person.category;
  const adviceLensForBody = categoryVoice.adviceLens
    .replace(/^스타의 운은/, `${person.nameKo} 같은 스타의 운은`)
    .replace(/^운의 조언은/, `${person.nameKo}의 운 조언은`);
  const careerBody = pickFamousVariant([
    `${person.nameKo}에게 ${person.category} 분야에서 먼저 읽히는 명리 표지는 ${tagSummaryText}입니다. ${categoryVoice.careerAngle}을 중심에 놓고 보면 ${elementTone[elementProfile.dominantElement] || ""} 여기에 ${finalGyeokguk}의 결이 더해지면 이 표지는 단순한 인기보다 역할, 기준, 반복되는 선택의 방식으로 드러납니다. 직업 흐름은 ${careerChangeForBody} 재물의 흐름은 ${wealthChangeForBody} 강한 오행이 현실의 그릇을 만나 어떤 방식으로 성과를 빚는지가 핵심입니다.`,
    `${person.nameKo}의 명식에서 먼저 보이는 표지는 ${tagSummaryText}입니다. 이 표지를 ${categoryVoice.careerAngle} 쪽으로 읽으면 ${elementProfile.dominantElement} 기운의 쓰임과 ${finalGyeokguk}의 결이 함께 살아납니다. 직업 흐름은 ${careerChangeForBody} 돈의 흐름은 ${wealthChangeForBody} 일간이 어떤 역할을 오래 붙들 때 힘이 맑아지는지가 중심입니다.`,
    `대표 키워드인 ${tagSummaryText}의 흐름을 따라가면 ${person.nameKo}의 명리 표지는 ${categoryVoice.careerAngle} 쪽으로 모입니다. 강한 ${elementProfile.dominantElement} 기운은 무대와 일의 방식에 선명한 색을 남기고, ${finalGyeokguk}의 문은 그 색을 반복되는 선택으로 굳힙니다. 대운의 직업 신호는 ${careerChangeForBody} 재물 신호는 ${wealthChangeForBody} 강한 기운을 오래 쓰려면 보완 기운의 그릇이 함께 필요합니다.`,
  ], sectionVariantSeed, 1);
  const relationshipBody = pickFamousVariant([
    `관계성은 ${elementProfile.dominantElement}의 강한 흐름과 ${elementProfile.weakElement}의 보완 지점 사이에서 읽습니다. ${objectParticle(categoryVoice.relationshipAngle)} 중심에 놓으면 강한 기운은 선명한 인상을 만들고, 약한 기운은 거리와 속도를 조율하는 숙제로 나타납니다. ${softSentence(daewoonLoveChange)} 명식에는 ${structureSignalText}가 드러나므로, 사적인 결론보다 공개 명식의 관계 리듬만 조심스럽게 살핍니다.`,
    `${person.nameKo}의 관계 패턴은 강한 ${elementProfile.dominantElement} 기운이 먼저 앞서고, 약한 ${elementProfile.weakElement} 기운이 뒤에서 균형을 요구하는 모습으로 읽힙니다. ${objectParticle(categoryVoice.relationshipAngle)} 함께 보면 가까워지는 속도보다 신뢰가 머무는 방식이 중요합니다. ${softSentence(daewoonLoveChange)} 구조적으로는 ${structureSignalText}가 있으니, 관계운은 단정이 아니라 리듬의 해석으로 보는 편이 정확합니다.`,
    `${person.nameKo}의 관계운은 일간과 오행이 만드는 반응의 리듬이다. 이 명식에서는 강한 ${elementProfile.dominantElement} 기운이 인상을 선명하게 만들고, 약한 ${elementProfile.weakElement} 기운이 ${categoryVoice.relationshipAngle}의 조율점을 남깁니다. ${softSentence(daewoonLoveChange)} ${structureSignalText}까지 겹치면 가까워지는 속도보다 오래 머무는 방식이 더 중요해집니다.`,
  ], sectionVariantSeed, 8);
  const adviceBody = pickFamousVariant([
    `${person.nameKo}에게는 ${objectParticle(categoryVoice.adviceFocus)} 좋은 그릇에 담는 조율이 중요합니다. ${softSentence(daewoonHowToUse)} ${annualPrescriptionForBody} ${adviceLensForBody} ${person.nameKo}에게 대운은 삶의 배경을 바꾸고, 세운은 그 배경 위에 사건을 올립니다. 그러니 큰 선택은 대운의 방향으로, 당장의 대응은 ${person.nameKo}의 세운 결로 나누어 보면 운을 쓰는 손이 훨씬 부드러워집니다.`,
    `${person.nameKo}의 운을 오래 쓰려면 ${objectParticle(categoryVoice.adviceFocus)} 먼저 살펴야 합니다. ${softSentence(daewoonHowToUse)} ${annualPrescriptionForBody} ${adviceLensForBody} 큰 흐름은 서두르지 말고 대운의 방향에서 잡고, 가까운 사건은 ${person.nameKo}의 세운 신호에 맞춰 차분히 나누는 편이 좋습니다.`,
    `상담식으로 보면 ${person.nameKo}에게 중요한 열쇠는 ${categoryVoice.adviceFocus}입니다. ${softSentence(daewoonHowToUse)} ${annualPrescriptionForBody} ${adviceLensForBody} ${person.nameKo}에게 운을 쓰는 법은 거창한 예언이 아니라, 커지는 흐름과 쉬어야 할 흐름을 구분하는 감각에서 시작됩니다.`,
  ], sectionVariantSeed, 2);
  const daewoonUnavailableBody = pickFamousVariant([
    `${person.nameKo}의 대운 시작값은 현재 공개 기준에서 확정하지 않습니다. 그래서 특정 연령대의 길흉을 꾸미기보다, 강한 ${elementProfile.dominantElement} 기운과 ${subjectParticle(`보완 기운 ${visibleUsefulText}`)} ${categoryVoice.careerAngle}에 어떻게 쓰이는지를 먼저 봅니다. ${person.nameKo}의 대운 세부 흐름은 ${luckStatusText} 상태이므로 장기 운은 속도보다 방향과 균형의 감각으로 읽어야 합니다. 과한 기운이 반복될 때는 ${person.nameKo}에게 확장보다 정리, 회복, 관계 경계를 먼저 세우는 편이 상담적으로 더 정확합니다.`,
    `${person.nameKo}처럼 공개 자료만으로 대운 시작값을 단정하기 어려울 때는 연령표보다 원국의 힘을 먼저 읽습니다. 이 명식은 강한 ${elementProfile.dominantElement} 기운과 보완 기운 ${visibleUsefulText}의 쓰임이 ${categoryVoice.adviceFocus}에서 갈립니다. ${person.nameKo}의 대운 세부 흐름은 ${luckStatusText} 상태라 특정 시기를 예언하기보다, ${objectParticle(categoryVoice.relationshipAngle)} 무리 없이 다루는 방식이 중요합니다. ${person.nameKo}의 장기 운은 급한 확장보다 오래 버틸 구조를 만드는 쪽에서 맑아집니다.`,
    `${person.nameKo}의 대운 문이 정확히 열리는 나이는 공개 기준만으로 비워 둡니다. 대신 원국의 강한 ${elementProfile.dominantElement} 기운, 보완 기운 ${visibleUsefulText}, 그리고 ${categoryVoice.careerAngle}의 반복 패턴을 함께 봅니다. ${person.nameKo}의 대운 세부 흐름은 ${luckStatusText} 상태이므로 큰 선택은 단정하지 않고, 먼저 흔들리는 영역을 직업·돈·관계·몸으로 나누어 살피는 편이 좋습니다. 이렇게 읽을 때 ${person.nameKo}의 장기 운은 불안을 키우는 말이 아니라 균형을 되찾는 기준이 됩니다.`,
  ], sectionVariantSeed, 7);
  const heroCopy = `${categoryVoice.heroOpening} ${dayElement} 일간이 ${monthElement} 월령을 지나며 ${elementProfile.dominantElement}의 색을 크게 띠는 흐름이 먼저 살아납니다. 여기에 ${finalGyeokguk}의 흐름과 보완 기운 ${visibleUsefulText}의 축이 맞물리니, ${categoryVoice.hiddenRhythm} 조심스럽게 읽을 운의 리듬이 있습니다.`;
  const monthPrioritySentence = pickFamousVariant([
    `${person.nameKo}의 명식에서 ${monthPriority.replace(/근거$/, "중심으로 작동합니다")}`,
    `월령은 ${person.nameKo}의 계절 감각을 정하는 자리라, ${monthElement} 기운이 ${dayStem} 일간의 표현 방식을 먼저 물들입니다.`,
    `${saju.pillars.month.ganji} 월령은 ${monthSeason}의 온도와 ${monthElement}의 압력을 함께 품어, 격국과 보완 기운 판단의 첫 문이 됩니다.`,
    `명리에서 월령은 명식의 계절 중심이므로, ${person.nameKo}의 강한 ${elementProfile.dominantElement} 흐름도 이 자리에서 먼저 힘을 얻습니다.`,
  ], sectionVariantSeed, 17);
  const firstImpressionClosing = pickFamousVariant([
    `${person.nameKo}의 명식은 힘이 여기저기 흩어지는 팔자라기보다, 한 번 잡은 방향을 오래 밀고 가며 자기 이름의 결을 남기는 구조로 해석해 볼 수 있습니다.`,
    `이 배열은 순간의 인기보다 누적된 인상으로 강해지는 편이라, ${person.nameKo}의 상징은 시간이 지날수록 더 뚜렷한 윤곽을 얻습니다.`,
    `${person.nameKo}에게 명리적으로 중요한 것은 재능이 밖으로만 튀는 구조가 아니라, 내면의 기준을 반복해서 다듬을수록 대중 앞의 존재감이 깊어지는 흐름입니다.`,
  ], sectionVariantSeed, 10);
  const monthCommandClosing = pickFamousVariant([
    `여기에 일간 강약, 오행 세력, 십성의 표면 리듬, 보완 기운을 겹쳐 보면 ${person.nameKo}의 운명 지도가 조금씩 입체적으로 살아납니다. 오행 분포는 ${elementRanking || "확인 필요"}이고, 십성 흐름은 ${topTenGods} 순서가 두드러집니다. 그래서 ${person.nameKo}의 배열은 성향만 말하는 것이 아니라, 어떤 환경에서 빛이 커지고 어떤 과잉에서 스스로 지치는지까지 함께 보여 줍니다.`,
    `일간의 힘과 오행의 쏠림, 십성의 드러나는 결, 보완 기운 ${visibleUsefulText}을 함께 놓으면 이 명식의 쓰임이 훨씬 분명해집니다. 오행 분포는 ${elementRanking || "확인 필요"}이고, 십성 흐름은 ${topTenGods} 순서가 두드러지므로, 강점은 어디서 살아나고 피로는 어느 대목에서 쌓이는지 구분할 수 있습니다.`,
    `월령만 따로 떼어 보면 평면적인 성향 분석에 머물지만, ${dayElement} 일간의 강약과 ${elementProfile.dominantElement}의 쏠림, 십성의 표면 리듬을 겹치면 실제 무대에서 쓰이는 힘이 보입니다. 오행 분포는 ${elementRanking || "확인 필요"}이고, 십성은 ${topTenGods} 순서로 선명합니다.`,
  ], sectionVariantSeed, 11);
  const gyeokClosing = pickFamousVariant([
    `명리에서 ${person.nameKo}의 운을 볼 때 길흉은 칼로 자르듯 한 번에 나뉘지 않습니다. ${person.nameKo}의 명식에서는 어떤 기운이 들어올 때 표현이 맑아지고, 어떤 기운이 과해질 때 관계와 선택의 속도가 흔들리는지를 구분하는 일이 훨씬 중요합니다.`,
    `따라서 ${person.nameKo}의 명식은 좋고 나쁨을 한마디로 재단하기보다, 보완 기운이 들어올 때 무엇이 안정되고 과한 기운이 반복될 때 어떤 선택이 급해지는지를 나누어 읽어야 합니다.`,
    `${person.nameKo}에게 운의 판단은 길흉 단어보다 균형의 감각에 가깝습니다. ${person.nameKo}의 명식에서는 살아나는 기운과 넘치는 기운을 구별할 때 직업, 관계, 컨디션의 리듬이 더 정확하게 드러납니다.`,
  ], sectionVariantSeed, 12);
  const annualKnownLead = pickFamousVariant([
    `${person.nameKo}의 세운은 대운 위에 얹히는 한 해의 사건 기운입니다.`,
    `${person.nameKo}에게 세운은 큰 배경 위로 들어오는 그해의 현실 신호입니다.`,
    `${person.nameKo}의 한 해 운은 대운의 바탕을 흔드는 작은 파동처럼 읽습니다.`,
  ], sectionVariantSeed, 13);
  const annualUnknownLead = pickFamousVariant([
    `${person.nameKo}의 세운은 대운 위에 얹히는 한 해의 사건 기운입니다.`,
    `${person.nameKo}의 세운은 원국과 대운 사이에서 그해의 선택 순서를 드러내는 흐름입니다.`,
    `${person.nameKo}의 연도별 운은 단정된 예언보다 원국의 강약이 현실에서 어디를 먼저 흔드는지 살피는 해석입니다.`,
  ], sectionVariantSeed, 14);
  const annualUnknownClosing = pickFamousVariant([
    `${person.nameKo}에게 좋은 해는 보완 기운이 현실 선택으로 살아나는 해이고, 부담이 큰 해는 과한 기운이 건강·관계·계약의 균형을 흔드는 해입니다. 그래서 ${person.nameKo}의 세운 상담은 올해의 운을 맞히는 말보다, 들어오는 사건을 어떤 순서로 다루면 덜 흔들리는지를 잡아 주는 쪽이 더 정확합니다.`,
    `${person.nameKo}에게 흐름이 편한 해에는 보완 기운이 선택을 안정시키고, 부담이 큰 해에는 과한 기운이 몸과 관계, 약속의 속도를 흔들 수 있습니다. 그러므로 ${person.nameKo}의 세운은 맞고 틀리는 예언이 아니라 먼저 정리할 영역을 알려 주는 상담의 기준입니다.`,
    `${person.nameKo}의 좋은 흐름은 오래 미뤄 둔 선택을 현실로 옮기게 하고, 무거운 흐름은 과로와 관계의 압박을 통해 조율을 요구합니다. 이때 ${person.nameKo}에게 중요한 것은 올해를 한 단어로 묶는 일이 아니라, 돈·일·관계·건강 중 어디부터 다듬을지 정하는 것입니다.`,
  ], sectionVariantSeed, 15);
  const conclusion = pickFamousVariant([
    `${person.nameKo}의 사주는 ${elementProfile.dominantElement}의 큰 물결 위에 ${dayElement} 일간의 기준이 서고, ${finalGyeokguk}의 문이 ${person.tags.slice(0, 2).join("·") || person.category}의 상징과 맞물리는 명식입니다. 결국 ${person.nameKo}의 명식은 재능만으로 반짝이는 구조라기보다, 자기 흐름을 오래 붙잡을수록 깊이가 살아나는 팔자라고 볼 수 있습니다.`,
    `${person.nameKo}의 명식은 ${elementProfile.dominantElement}의 힘이 전면에 서고, ${dayElement} 일간의 기준이 ${finalGyeokguk}의 문을 통해 현실의 이름으로 굳어지는 구조입니다. 타고난 상징은 분명하지만, 그 상징을 오래 쓰게 하는 힘은 결국 보완 기운 ${visibleUsefulText}을 얼마나 품위 있게 다루느냐에 달려 있습니다.`,
    `이 사주는 ${dayElement} 일간이 ${monthElement} 월령을 지나며 ${elementProfile.dominantElement}의 무게를 얻고, ${finalGyeokguk}의 결이 ${person.tags.slice(0, 2).join("·") || person.category}의 이미지와 맞물리는 명식입니다. ${person.nameKo}에게는 빛나는 순간보다 오래 남는 리듬이 중요하므로, 운을 쓰는 핵심은 강한 기운을 정교하게 다듬는 데 있습니다.`,
  ], sectionVariantSeed, 16);

  const summaryTags = getReadableTags(person).slice(0, 2).join("·") || person.category;
  const summary = `${person.nameKo}의 명식에서 가장 먼저 보이는 것은 ${summaryTags}의 상징을 ${elementProfile.dominantElement} 기운으로 빚어내는 결입니다. ${saju.timeUnknown ? "연주·월주·일주 중심으로 보면" : "시주까지 함께 놓고 보면"} ${dayMasterLabel}의 기준과 ${monthElement} 월령이 맞물리며, ${categoryVoice.publicSignal} 속에 ${finalGyeokguk}의 리듬이 흐릅니다. ${daewoonSummaryLead}, 세운은 ${annualSummaryFocus}을 중심으로 조심스럽게 읽습니다.`;
  const sections: FamousSajuArticleSection[] = [
    {
      title: famousSajuCopy("section.firstImpression"),
      imageQuery: getFamousSajuImageMood(person),
      imageSection: "default",
      body: `${objectParticle(person.nameKo)} 명리적으로 보면 먼저 ${dayMasterLabel}의 결이 눈에 들어옵니다. ${dayStem} 일간은 ${stemTone[dayStem] || "자기만의 결을 따라 움직이는 힘이 있습니다."} 이 기운이 ${monthElement} 월령을 지나며 ${elementProfile.dominantElement}의 색을 크게 띠니, 대중 앞에서는 ${categoryVoice.firstImpressionFocus}의 이미지가 자연스럽게 선명해집니다. ${firstImpressionClosing}`,
    },
    {
      title: famousSajuCopy("section.chartFlow"),
      imageQuery: "mystical astrology stars cosmic sky five elements",
      imageSection: "default",
      body: `${saju.pillars.month.ganji} 월주는 ${monthSeason} 흐름과 ${monthElement} 기운을 품고 있습니다. ${monthPrioritySentence} ${monthCommandClosing}`,
    },
    {
      title: famousSajuCopy("section.gyeokUseful"),
      imageQuery: "purple galaxy stars destiny chart mystical",
      imageSection: "default",
      body: `격국은 ${finalGyeokguk}의 결로 읽힙니다. 이런 격국은 ${gyeokReasonLens}에서 비롯되며, 보완 기운은 ${visibleUsefulText} 축으로 놓습니다. 판단 근거는 ${formatReasonSentences(yongshinReason, person.nameKo)} ${gyeokClosing}`,
    },
    {
      title: categoryVoice.careerTitle,
      imageQuery: "cosmic stage spotlight stars destiny",
      imageSection: "career",
      body: careerBody,
    },
    {
      title: famousSajuCopy("section.relationshipPattern"),
      imageQuery: "mystical stars soft light cosmic love",
      imageSection: "love",
      body: relationshipBody,
    },
    {
      title: famousSajuCopy("section.daewoonDoor"),
      imageQuery: "night sky stars cosmic road destiny",
      imageSection: "default",
      body: daewoonStartAge !== null
        ? `대운은 10년 단위로 삶의 배경을 바꾸는 큰 흐름입니다. 이 명식의 대운 방향과 시작값은 ${daewoonText}이고, 현재 대운 축은 ${daewoonLabel}로 읽힙니다. 장기 흐름은 ${daewoonChange}로 정리됩니다. ${softSentence(daewoonSummary)} ${softSentence(daewoonFoundationText)} ${softSentence(daewoonFirstHalf)} ${softSentence(daewoonSecondHalf)} 여기서 중요한 것은 살아나는 운을 급하게 소비하는 것이 아니라, 보완 기운 ${visibleUsefulText}의 쓰임이 오래 갈 수 있는 구조를 만드는 일입니다. 건강과 심리의 리듬은 ${softSentence(daewoonHealthChange)} 향후 조언으로는 확장할 때도 루틴, 회복, 관계의 경계를 함께 세우는 쪽이 좋습니다.`
        : daewoonUnavailableBody,
    },
    {
      title: famousSajuCopy("section.annualStandard"),
      imageQuery: "constellation calendar stars yearly fortune",
      imageSection: "default",
      body: annualRows.length
        ? `${annualKnownLead} 현재 세운 축은 ${annualLabel}로 읽히고, 핵심 분류는 ${annualClassification}입니다. ${annualScoreReason} 좋은 해의 문은 ${bestYearText}로 열리고, 조심해야 할 해의 경계는 ${cautionYearText}로 나타납니다. ${transformationText} 월운은 더 짧은 호흡의 신호이므로 ${monthlyText} 이 흐름에서는 한 해를 한 단어로 길흉 단정하기보다, 직업·돈·관계·몸 중 어느 영역이 먼저 움직이는지 차례대로 보는 것이 좋습니다.`
        : `${annualUnknownLead} 현재 연도별 흐름이 충분하지 않을 때는 특정 해를 꾸며 말하지 않고, 원국의 강한 기운과 보완 기운 ${visibleUsefulText}, 그리고 대운의 ${daewoonChange} 흐름이 만나는 방식을 먼저 봅니다. ${annualPrescriptionForBody} ${annualUnknownClosing}`,
    },
    {
      title: categoryVoice.adviceTitle,
      imageQuery: "mystical candle stars consultation destiny",
      imageSection: "default",
      body: adviceBody,
    },
    {
      title: famousSajuCopy("section.destinySentence"),
      imageQuery: "mystical cosmos stars nebula night sky",
      imageSection: "default",
      body: `${conclusion} ${person.nameKo}의 강한 ${elementProfile.dominantElement} 기운은 활동의 선명한 추진력을 만들고, 약한 ${elementProfile.weakElement} 기운은 균형과 휴식의 감각을 통해 보완될 때 더 맑게 흐릅니다. ${daewoonConclusionLead}, 세운은 ${annualLabel}의 사건성으로 조심스럽게 읽습니다. 이 명식의 핵심 축은 ${quantumAxis}입니다.`,
    },
  ];

  const insightCards: FamousSajuInsightCard[] = [
    { label: famousSajuCopy("magazine.dayMaster"), value: `${dayElement} · ${dayMasterLabel}`, description: `${dayStrength}${strengthIndex !== null ? ` ${strengthIndex}` : ""} 기준으로 읽은 핵심 기운입니다.` },
    { label: famousSajuCopy("magazine.monthCommand"), value: `${saju.pillars.month.ganji} · ${monthElement}`, description: `${monthSeason} 계절감이 명식의 우선 기준으로 작동합니다.` },
    { label: famousSajuCopy("magazine.elements"), value: `${elementProfile.dominantElement} 강 / ${elementProfile.weakElement} 약`, description: famousSajuCopy("magazine.elementsDesc") },
    { label: famousSajuCopy("magazine.usefulElement"), value: visibleUsefulText, description: famousSajuCopy("magazine.usefulElementDesc") },
    { label: famousSajuCopy("magazine.daewoon"), value: daewoonLabel, description: `${daewoonChange} 흐름으로 장기 선택의 배경을 봅니다.` },
    { label: famousSajuCopy("magazine.annual"), value: annualLabel, description: annualClassification },
  ];
  const seoKeywords = uniqueKeywords([...person.seoKeywords, `${person.nameKo} 사주`, `${dayElement} 일간`, dayMasterLabel, `${person.nameKo} 유명인 사주`, saju.timeUnknown ? "출생 시간 미상 분석" : "사주팔자 분석"]);
  const craftedArticle = craftedFamousSajuArticles[person.slug];
  const magazineArticleSections: FamousSajuArticleSection[] = magazine.sections.map((section) => ({
    title: section.title,
    imageQuery: section.id === "five-elements"
      ? "five elements saju cosmic balance"
      : section.id === "ten-gods"
        ? "mystical destiny chart ten gods"
        : section.id === "stars"
          ? "constellation stars purple night"
          : section.id === "twelve-stage"
            ? "moon phases cosmic road destiny"
            : "mystical cosmos stars nebula night sky",
    imageSection: "default",
    body: [
      section.body,
      ...(section.cards || []).map((card) => `${card.label}\n${card.description}`),
    ].filter(Boolean).join("\n\n"),
  }));
  const fallbackArticleSections = ensureMandatoryDaewoonSection(craftedArticle?.sections, sections);
  const articleSections = magazineArticleSections.length ? magazineArticleSections : fallbackArticleSections;
  const articleHeroCopy = magazine.sections.find((section) => section.id === "day-pillar-texture")?.body || craftedArticle?.heroCopy || heroCopy;
  const articleSummary = magazine.sections
    .filter((section) => section.id !== "annotation")
    .slice(0, 3)
    .map((section) => section.body)
    .join(" ") || craftedArticle?.summary || summary;
  const articleConclusion = magazine.summary.oneLineReading || craftedArticle?.conclusion || conclusion;

  return polishFamousSajuArticle({
    celebrity: person,
    person,
    saju,
    calculationStatus: "calculated",
    magazine,
    dayElement,
    dayMasterLabel,
    hourText,
    elementProfile,
    engineInputSummary,
    heroImageQuery: getFamousSajuImageMood(person),
    heroCopy: articleHeroCopy,
    coreKeywords,
    analysisBadge,
    timeNotice,
    summary: articleSummary,
    sections: articleSections,
    insightCards,
    reliabilityNotes: calculatedChart.reliabilityNotes,
    conclusion: articleConclusion,
    seoTitle: buildFamousSajuSeoTitle(person),
    seoDescription: buildFamousSajuSeoDescription(person, {
      dayMasterLabel,
      dayElement,
      elementProfile,
      calculationStatus: "calculated",
    }),
    seoKeywords,
  });
}

export function getFamousSajuSeoMetadata(person: CelebritySajuSeed, article: FamousSajuArticle) {
  return {
    path: `/insights/famous-saju/${person.slug}`,
    title: article.seoTitle,
    description: article.seoDescription,
    keywords: article.seoKeywords,
    image: FAMOUS_SAJU_OG_IMAGE,
    publishedAt: FAMOUS_SAJU_PUBLISHED_AT,
    updatedAt: FAMOUS_SAJU_UPDATED_AT,
    articleSection: "유명인 사주 분석",
    headline: article.seoTitle,
  };
}

export function calculateCelebritySaju(celebrity: CelebritySajuSeed) {
  const chart = calculateFamousSaju(celebrity);
  if (chart.status !== "calculated" || !chart.saju) return null;
  return { saju: chart.saju, elementProfile: chart.elementProfile, chart };
}

export function buildCelebrityReading(celebrity: CelebritySajuSeed) {
  const article = buildFamousSajuArticle(celebrity, calculateFamousSaju(celebrity));
  const override = getFamousSajuArticleOverride(celebrity.slug);
  if (!override) return article;
  return {
    ...article,
    heroCopy: override.heroCopy || article.heroCopy,
    summary: override.summary || article.summary,
    conclusion: override.conclusion || article.conclusion,
    seoTitle: override.seoTitle || article.seoTitle,
    seoDescription: override.seoDescription || article.seoDescription,
  };
}

export function getCelebritySajuPage(slug: string) {
  const celebrity = getFamousSajuPersonBySlug(slug);
  return celebrity ? buildCelebrityReading(celebrity) : null;
}

export function getCelebrityRelatedList(celebrity: CelebritySajuSeed, limit = 6) {
  const sameCategory = publishedCelebritySajuSeeds.filter((item) => item.slug !== celebrity.slug && item.category === celebrity.category);
  const sameTags = publishedCelebritySajuSeeds.filter((item) => item.slug !== celebrity.slug && item.category !== celebrity.category && item.tags.some((tag) => celebrity.tags.includes(tag)));
  return [...sameCategory, ...sameTags].slice(0, limit);
}

export function getPublishedCelebrityStaticSlugs() {
  return getCelebrityStaticSlugs();
}

export function getPublishedCelebrityCategoryRoutes() {
  return Array.from(new Set(publishedCelebritySajuSeeds.map((item) => categoryToSlug(item.category)))).map((slug) => `/famous-saju/category/${slug}`);
}

export { categoryToSlug, famousSajuCategories, getCelebritiesByCategory, publishedCelebritySajuSeeds };
