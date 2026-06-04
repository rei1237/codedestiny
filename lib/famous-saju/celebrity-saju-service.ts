import { calculateLocalSaju, type LocalSajuResult, type SajuPillarLocal } from "../../app/saju/animal-destiny/engine/localSajuCalculator";
import {
  categoryToSlug,
  famousSajuCategories,
  getCelebrityBySlug,
  getCelebrityStaticSlugs,
  getCelebritiesByCategory,
  publishedCelebritySajuSeeds,
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
const FAMOUS_SAJU_UPDATED_AT = "2026-06-04T18:20:00+09:00";
const FAMOUS_SAJU_OG_IMAGE = "/fuctionassets/%EC%9C%A0%EB%AA%85%EC%9D%B8%20%EC%82%AC%EC%A3%BC%20%EB%B6%84%EC%84%9D.webp";

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

  const tagText = person.tags.slice(0, 2).join("과 ");
  return tagText ? `${tagText}으로 읽는 ${person.category} 사주 구조` : `${person.category} 인물의 사주 구조`;
}

function buildFamousSajuSeoTitle(person: CelebritySajuSeed) {
  return `${person.nameKo} 사주 분석｜${buildFamousSajuTitleHook(person)}`;
}

function buildFamousSajuSeoDescription(person: CelebritySajuSeed, article: Pick<FamousSajuArticle, "dayMasterLabel" | "dayElement" | "elementProfile" | "calculationStatus">) {
  if (article.calculationStatus !== "calculated") {
    return `Code:Destiny 무료 운세 인사이트의 유명인 사주 분석 콘텐츠입니다. ${person.nameKo}의 공개 생년월일 기준을 확인한 뒤 사주 엔진 계산값으로만 해석합니다.`;
  }

  return `Code:Destiny 무료 운세 인사이트의 유명인 사주 콘텐츠입니다. 사주 엔진을 바탕으로 ${person.nameKo}의 ${article.dayMasterLabel}, ${article.dayElement} 일간, ${article.elementProfile.dominantElement} 오행 흐름을 문화 콘텐츠로 해석합니다.`;
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

function sentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /[.!?。]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function toEngineElementKo(value: string) {
  return engineElementLabel[value] || value;
}

function formatLuckStatus(value: string) {
  if (value === "calculated") return "계산됨";
  if (value === "not_supplied") return "운 표 미공급";
  return value || "운 표 확인 필요";
}

function formatEngineInput(chart: FamousSajuCalculatedChart) {
  const { engineInput } = chart;
  if (!engineInput.year || !engineInput.month || !engineInput.day) return "계산 입력값 확인 필요";
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
    return "생년월일의 양력·음력 체계가 불명확한 인물은 계산 데이터 확인이 필요합니다.";
  }
  return "";
}

function buildContentNotice(person: CelebritySajuSeed, saju: LocalSajuResult | null, failureReason?: string) {
  const calendarNotice = buildCalendarNotice(person);
  const timeNotice = saju
    ? saju.timeUnknown
      ? "출생 시간 미상 / 삼주 기반 분석입니다. 시주는 제외하고 연주·월주·일주 중심으로 계산했습니다."
      : `공개된 출생 시간 ${person.birthTime} 기준으로 시주(${saju.pillars.hour?.ganji})까지 함께 계산했습니다.`
    : `계산 데이터 확인 필요 상태입니다.${failureReason ? ` ${failureReason}` : ""}`;
  return [calendarNotice, timeNotice, "이 글은 문화/엔터테인먼트 목적의 사주 콘텐츠입니다."].filter(Boolean).join(" ");
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

function buildReliabilityNotes(person: CelebritySajuSeed, saju: FamousSajuEngineResult | null): FamousSajuReliabilityNote[] {
  if (!saju) {
    return [
      { label: "사주 계산", level: "제한", description: "사주 계산이 완료되지 않아 원국·십성·오행 해석을 생성하지 않았습니다." },
      { label: "블로그 본문", level: "제한", description: "계산값 없이 임의 해석을 만들지 않도록 계산 데이터 확인 상태만 표시합니다." },
    ];
  }

  const hasTime = !saju.timeUnknown;
  const natalAnalysis = getNatalAnalysis(saju);
  const activatedByLuck = asRecord(asRecord(natalAnalysis.tenGods).activatedByLuck);
  const luckStatus = recordString(activatedByLuck, "status", "not_supplied");
  return [
    {
      label: "원국",
      level: hasTime ? "높음" : "보통",
      description: hasTime ? "연주·월주·일주·시주를 모두 계산했습니다." : "시주를 만들지 않고 연주·월주·일주만 계산했습니다.",
    },
    {
      label: "십성·오행",
      level: hasTime ? "높음" : "보통",
      description: "일간 강약, 오행 흐름, 십성의 두드러진 결을 계산값에서 읽어 문장화했습니다.",
    },
    {
      label: "격국·용신 후보",
      level: person.isHistoricalDateUncertain || !hasTime ? "제한" : "보통",
      description: "용신 후보 계산값과 월령 정보를 후보로만 표시하며 단정형 격국 판단은 피했습니다.",
    },
    {
      label: "대운·세운",
      level: luckStatus === "calculated" && hasTime ? "보통" : "제한",
      description: luckStatus === "calculated" ? "운의 흐름 계산값이 있을 때만 십성의 움직임을 표시합니다." : "현재 공개 자료 기준에서는 대운·세운 해석을 제한적으로 표시합니다.",
    },
  ];
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

  if (!saju) {
    const heroCopy = `${person.nameKo}의 사주는 공개 생년월일 기준을 더 확인한 뒤 조심스럽게 읽어야 합니다.`;
    const coreKeywords = uniqueKeywords(["계산 데이터 확인 필요", person.category, ...person.tags.slice(0, 3)]).slice(0, 5);
    const analysisBadge = "사주 계산값 확인 필요";
    const summary = `${person.nameKo}의 유명인 사주 분석은 계산 데이터 확인 필요 상태입니다. 계산값 없이 팔자·격국·용신·대운을 임의로 구성하지 않습니다. ${timeNotice}`;
    return {
      celebrity: person,
      person,
      saju: null,
      calculationStatus: "needs_review",
      dayElement: "확인 필요",
      dayMasterLabel: "계산 데이터 확인 필요",
      hourText: "계산 데이터 확인 필요",
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
          title: "계산 데이터 확인 필요",
          imageQuery: "archive document candle desk",
          imageSection: "default",
          body: `${person.nameKo}의 공개 생년월일 또는 날짜 체계가 사주 계산 기준으로 확정되지 않았습니다. 계산값 없이 사주팔자, 격국, 용신, 대운, 성격, 직업운을 꾸며내지 않기 위해 본문 해석을 보류합니다.`,
        },
      ],
      insightCards: [
        { label: "계산 상태", value: "확인 필요", description: calculatedChart.failureReason || "사주 계산이 완료되지 않았습니다." },
        { label: "입력 기준", value: engineInputSummary, description: "확정 가능한 입력값만 표시합니다." },
      ],
      reliabilityNotes: calculatedChart.reliabilityNotes,
      conclusion: "계산이 확인되기 전까지는 조용히 비워두는 것이 가장 정직한 해석입니다.",
      seoTitle: buildFamousSajuSeoTitle(person),
      seoDescription: `Code:Destiny 무료 운세 인사이트의 유명인 사주 분석 콘텐츠입니다. ${person.nameKo}의 사주 계산값이 확인되기 전까지 임의 해석을 만들지 않습니다.`,
      seoKeywords: uniqueKeywords([...person.seoKeywords, `${person.nameKo} 사주`, "유명인 사주", "계산 데이터 확인 필요"]),
    };
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
  const usefulElementKo = recordStringArray(usefulElements, "finalPriorityKo");
  const johuUseful = toEngineElementKo(recordString(usefulElements, "johuUseful"));
  const yongshinReasons = recordStringArray(yongshinRequired, "whyThisElement");
  const inferredMonthElement = elementByBranch[saju.pillars.month.branch] || elementProfile.dominantElement;
  const dayElement = recordString(dayMaster, "elementKo", elementByStem[dayStem] || elementProfile.dominantElement);
  const dayStrength = recordString(dayMaster, "strength", `${elementProfile.dominantElement} 기운 우세`);
  const strengthIndex = recordNumber(dayMaster, "strengthIndex");
  const monthElement = recordString(monthCommand, "commandingElementKo", inferredMonthElement);
  const monthSeason = recordString(monthCommand, "season", `${monthElement} 계절감`);
  const monthPriority = recordString(monthCommand, "priority", "월지는 사주 전체의 계절감을 읽는 핵심 기준입니다.");
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
  const usefulText = usefulElementKo.length ? usefulElementKo.join(" · ") : johuUseful ? `${johuUseful} 후보` : "용신 후보 확인 필요";
  const finalGyeokguk = recordString(gyeokgukAnalysis, "finalGyeokguk")
    || recordString(gyeokRequired, "finalGyeokguk")
    || "격국 후보 확인";
  const gyeokReason = recordString(gyeokgukAnalysis, "judgmentReason")
    || recordString(gyeokRequired, "reason")
    || "월령과 일간 강약을 함께 보아 후보로만 읽습니다.";
  const yongshinReason = recordString(yongshinJudgment, "reason")
    || yongshinReasons.slice(0, 2).join(" / ")
    || "조후와 억부, 격국의 균형을 함께 보아 후보를 잡습니다.";
  const structuralIssues = Array.isArray(natalAnalysis.structuralIssues)
    ? natalAnalysis.structuralIssues
      .map((item) => asRecord(item))
      .map((item) => recordString(item, "label") || recordString(item, "name") || recordString(item, "code"))
      .filter(Boolean)
      .slice(0, 2)
    : [];
  const structureText = structuralIssues.length ? structuralIssues.join(" · ") : "큰 구조 경고 없음";
  const quantumAxis = `${dayMasterLabel} · ${monthElement} 월령 · ${finalGyeokguk} · 용신 후보 ${usefulText}`;
  const analysisBadge = saju.timeUnknown ? "퀀텀 명리 엔진 · 출생 시간 미상 / 삼주 분석" : "퀀텀 명리 엔진 · 시주 포함";
  const coreKeywords = uniqueKeywords([dayMasterLabel, `${dayElement} 일간`, `${elementProfile.dominantElement} 기운`, finalGyeokguk, ...person.tags]).slice(0, 5);
  const heroCopy = `${person.nameKo}의 명식은 ${dayElement} 일간이 ${monthElement} 월령을 통과하며 ${elementProfile.dominantElement}의 빛을 크게 드러내는 구조입니다. 퀀텀 명리 엔진은 이 흐름을 ${finalGyeokguk}과 용신 후보 ${usefulText}의 축으로 읽습니다.`;
  const conclusion = `${person.nameKo}의 사주는 ${elementProfile.dominantElement}의 큰 물결 위에 ${dayElement} 일간의 기준이 서고, ${finalGyeokguk}의 문이 ${person.tags.slice(0, 2).join("·") || person.category}의 상징과 맞물리는 명식입니다.`;

  // 블로그 본문 생성 핵심부: 아래 문단은 모두 calculateLocalSaju의 원국/natalAnalysis/대운 시작값에서 읽은 값만 사용한다.
  // 격국·용신·대운처럼 출생 시간과 추가 운 표에 민감한 항목은 후보·참고값으로 낮춰 표현한다.
  const summary = `${person.nameKo} 사주 분석의 핵심은 ${quantumAxis}입니다. 공개 생년월일 기준 계산에서 ${elementProfile.dominantElement} 기운이 가장 선명하고, 일간 강약은 ${dayStrength}${strengthIndex !== null ? `, 지수 ${strengthIndex}` : ""}로 정리됩니다. 여기에 십성의 표면 흐름 ${topTenGods}, 구조 신호 ${structureText}를 겹쳐 보면 대중 앞에서 드러난 재능과 운의 결이 한층 또렷해집니다. ${timeNotice}`;
  const sections: FamousSajuArticleSection[] = [
    {
      title: "명식의 첫 인상",
      imageQuery: getFamousSajuImageMood(person),
      imageSection: "default",
      body: `${objectParticle(person.nameKo)} 명리적으로 보면 먼저 ${dayMasterLabel}의 결이 눈에 들어옵니다. ${dayStem} 일간은 ${stemTone[dayStem] || "자기만의 결을 따라 움직이는 힘이 있습니다."} 이 기운이 ${monthElement} 월령을 지나며 ${elementProfile.dominantElement}의 색을 크게 띠기 때문에, 대중 앞에서는 ${person.tags.slice(0, 3).join("·") || person.category}의 상징이 선명하게 남습니다.`,
    },
    {
      title: "퀀텀 명리 핵심장",
      imageQuery: "mystical astrology stars cosmic sky five elements",
      imageSection: "default",
      body: `${saju.pillars.month.ganji} 월주는 ${monthSeason} 흐름과 ${monthElement} 기운을 품습니다. ${sentence(monthPriority.replace(/근거$/, "근거로 사용됩니다"))} 퀀텀 명리 엔진은 이 월령 위에 일간 강약, 오행 세력, 십성 노출, 용신 후보를 겹쳐 읽습니다. 오행 순위는 ${elementRanking || "확인 필요"}이며, 십성 흐름은 ${topTenGods} 순서가 두드러집니다.`,
    },
    {
      title: "격국과 용신 후보",
      imageQuery: "purple galaxy stars destiny chart mystical",
      imageSection: "default",
      body: `격국 후보는 ${finalGyeokguk}로 읽히며, 근거는 ${gyeokReason}입니다. 용신 후보는 ${usefulText}이고, 판단 축은 ${yongshinReason}입니다. 이 조합은 좋은 운과 나쁜 운을 단순히 나누기보다, 어떤 기운이 명식을 맑게 열고 어떤 기운이 과열을 만드는지를 구분해 줍니다.`,
    },
    {
      title: "재능과 커리어 코드",
      imageQuery: "cosmic stage spotlight stars destiny",
      imageSection: "career",
      body: `${person.category} 분야에서 읽히는 재능의 코드는 ${person.tags.join(", ")}입니다. ${elementTone[elementProfile.dominantElement] || ""} 여기에 ${finalGyeokguk}의 결이 더해지면 재능은 단순한 인기보다 역할, 기준, 반복되는 선택의 방식으로 드러납니다. 살아있는 인물에 대해서는 직업운을 단정하지 않고, 공개 활동에서 드러난 상징적 강점으로만 풀이합니다.`,
    },
    {
      title: "관계성과 인간관계 패턴",
      imageQuery: "mystical stars soft light cosmic love",
      imageSection: "love",
      body: `관계성은 ${elementProfile.dominantElement}의 강한 흐름과 ${elementProfile.weakElement}의 보완 지점 사이에서 읽을 수 있습니다. 강한 기운은 사람들에게 선명한 인상을 남기고, 약한 기운은 관계의 속도와 거리감을 조절하는 숙제로 나타날 수 있습니다. 구조 신호는 ${structureText}로 정리되며, 개인의 사적인 영역을 단정하지 않고 명식이 보여주는 관계 리듬만 조심스럽게 읽습니다.`,
    },
    {
      title: "운의 흐름",
      imageQuery: "night sky stars cosmic road destiny",
      imageSection: "default",
      body: daewoonStartAge !== null
        ? `대운의 방향과 시작값은 ${daewoonText}로 표시됩니다. 공개 자료 기준에서 개별 대운·세운의 세부 흐름은 ${luckStatusText} 상태이므로, 여기서는 운의 문이 어느 방향으로 열리는지에 집중합니다. 용신 후보 ${usefulText}가 살아나는 시기에는 명식의 장점이 더 맑게 드러나고, 반대로 과한 기운이 반복되면 속도보다 정리가 중요해집니다.`
        : `대운 시작값은 현재 계산 범위에서 확정하지 않습니다. 공개 자료 기준에서 개별 대운·세운의 세부 흐름은 ${luckStatusText} 상태이므로, 운의 흐름은 큰 방향을 참고하는 정도로만 읽는 것이 좋습니다. 용신 후보 ${usefulText}는 균형을 보는 나침반으로만 사용합니다.`,
    },
    {
      title: "Code식 한 줄 결론",
      imageQuery: "mystical cosmos stars nebula night sky",
      imageSection: "default",
      body: `${conclusion} 강한 ${elementProfile.dominantElement} 기운은 활동의 선명한 추진력을 만들고, 약한 ${elementProfile.weakElement} 기운은 균형과 휴식의 감각을 통해 보완될 때 더 맑게 흐릅니다. 이 글의 핵심 축은 ${quantumAxis}입니다. ${timeNotice}`,
    },
  ];

  const insightCards: FamousSajuInsightCard[] = [
    { label: "일간", value: `${dayElement} · ${dayMasterLabel}`, description: `${dayStrength}${strengthIndex !== null ? ` ${strengthIndex}` : ""} 기준으로 읽은 핵심 기운입니다.` },
    { label: "월령", value: `${saju.pillars.month.ganji} · ${monthElement}`, description: `${monthSeason} 계절감이 명식의 우선 기준으로 작동합니다.` },
    { label: "오행", value: `${elementProfile.dominantElement} 강 / ${elementProfile.weakElement} 약`, description: "연주·월주·일주·검증된 시주만 집계했습니다." },
    { label: "용신 후보", value: usefulText, description: "용신 후보 계산값을 확정이 아닌 후보로 표시합니다." },
    { label: "대운 참고", value: daewoonText, description: "개별 대운·세운 표는 공급된 경우에만 확장 해석합니다." },
  ];
  const seoKeywords = uniqueKeywords([...person.seoKeywords, `${person.nameKo} 사주`, `${dayElement} 일간`, dayMasterLabel, `${person.nameKo} 유명인 사주`, saju.timeUnknown ? "삼주 기반 분석" : "사주팔자 분석"]);

  return {
    celebrity: person,
    person,
    saju,
    calculationStatus: "calculated",
    dayElement,
    dayMasterLabel,
    hourText,
    elementProfile,
    engineInputSummary,
    heroImageQuery: getFamousSajuImageMood(person),
    heroCopy,
    coreKeywords,
    analysisBadge,
    timeNotice,
    summary,
    sections,
    insightCards,
    reliabilityNotes: calculatedChart.reliabilityNotes,
    conclusion,
    seoTitle: buildFamousSajuSeoTitle(person),
    seoDescription: buildFamousSajuSeoDescription(person, {
      dayMasterLabel,
      dayElement,
      elementProfile,
      calculationStatus: "calculated",
    }),
    seoKeywords,
  };
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
  return buildFamousSajuArticle(celebrity, calculateFamousSaju(celebrity));
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

export function getPublishedCelebrityRoutes() {
  return publishedCelebritySajuSeeds.map((item) => `/famous-saju/${item.slug}`);
}

export function getPublishedCelebrityStaticSlugs() {
  return getCelebrityStaticSlugs();
}

export function getPublishedCelebrityCategoryRoutes() {
  return Array.from(new Set(publishedCelebritySajuSeeds.map((item) => categoryToSlug(item.category)))).map((slug) => `/famous-saju/category/${slug}`);
}

export { categoryToSlug, famousSajuCategories, getCelebritiesByCategory, publishedCelebritySajuSeeds };
