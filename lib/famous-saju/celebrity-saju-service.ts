import { calculateLocalSaju, type LocalSajuResult, type SajuPillarLocal } from "../../app/saju/animal-destiny/engine/localSajuCalculator";
import {
  categoryToSlug,
  famousSajuCategories,
  getCelebrityBySlug,
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
};

const elementTone: Record<string, string> = {
  목: "성장과 기획의 흐름이 강해 새로운 방향을 열고 사람을 움직이는 힘이 돋보입니다.",
  화: "표현과 확산의 기운이 살아 있어 존재감과 메시지를 밝히는 힘이 큽니다.",
  토: "중심을 잡고 결과를 쌓아가는 힘이 강해 신뢰와 지속성을 자산으로 만듭니다.",
  금: "선택과 완성의 기운이 선명해 기준을 세우고 성과를 다듬는 능력이 돋보입니다.",
  수: "감각과 통찰의 흐름이 깊어 보이지 않는 흐름을 읽고 유연하게 움직이는 힘이 있습니다.",
};

type ElementKey = "목" | "화" | "토" | "금" | "수";

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

function buildElementProfile(saju: LocalSajuResult) {
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

export function calculateCelebritySaju(celebrity: CelebritySajuSeed) {
  if (!celebrity.birthDate) return null;
  const birth = parseBirthDate(celebrity.birthDate);
  const time = celebrity.birthTimeStatus === "verified" ? parseBirthTime(celebrity.birthTime) : null;
  const saju = calculateLocalSaju({
    ...birth,
    hour: time?.hour,
    minute: time?.minute,
    hasTime: Boolean(time),
    calendarType: celebrity.calendarType || "solar",
  });
  return { saju, elementProfile: buildElementProfile(saju) };
}

export function buildCelebrityReading(celebrity: CelebritySajuSeed) {
  const result = calculateCelebritySaju(celebrity);
  if (!result) return null;
  const { saju, elementProfile } = result;
  const dayStem = saju.dayStem;
  const dayElement = elementByStem[dayStem] || elementProfile.dominantElement;
  const dayMasterLabel = `${saju.pillars.day.ganji} 일주`;
  const timeNotice = saju.timeUnknown
    ? "출생 시간이 공개되어 있지 않아 시주는 제외하고 연주·월주·일주 중심으로 분석했습니다."
    : `공개된 출생 시간 ${celebrity.birthTime} 기준으로 시주(${saju.pillars.hour?.ganji})까지 함께 계산했습니다.`;

  return {
    celebrity,
    saju,
    dayElement,
    dayMasterLabel,
    hourText: saju.pillars.hour?.ganji || "출생 시간 미상",
    elementProfile,
    timeNotice,
    summary: `${celebrity.name}의 사주는 ${dayMasterLabel}를 중심으로 ${elementProfile.dominantElement}의 기운이 두드러집니다. ${stemTone[dayStem] || "자신만의 결을 따라 움직이는 기운이 강합니다."}`,
    sections: [
      {
        title: "일간 분석",
        imageQuery: `${celebrity.category} portrait calm light destiny`,
        imageSection: "destiny" as const,
        body: `${dayStem} 일간은 ${stemTone[dayStem] || "자기만의 결을 따라 움직이는 힘"}을 품고 있습니다. 이 기운은 ${celebrity.name}의 행보에서 선택의 기준, 대중 앞의 인상, 오래 남는 개성으로 드러납니다.`,
      },
      {
        title: "오행 흐름",
        imageQuery: "five elements nature balance",
        imageSection: "wisdom" as const,
        body: `${elementProfile.dominantElement} 기운이 가장 강하게 나타납니다. ${elementTone[elementProfile.dominantElement] || ""} 보완이 필요한 흐름은 ${elementProfile.weakElement}이며, 휴식과 관계의 균형에서 부드럽게 채워질 때 전체 운의 안정감이 높아집니다.`,
      },
      {
        title: "직업운과 재능",
        imageQuery: `${celebrity.category} creative career success`,
        imageSection: "career" as const,
        body: `${celebrity.category} 분야에서 오래 남는 힘은 반복 가능한 강점에서 나옵니다. ${celebrity.tags.join(", ")} 키워드는 사주가 현실에서 표현되는 재능의 통로로 볼 수 있습니다.`,
      },
      {
        title: "연애운과 관계",
        imageQuery: "warm relationship connection soft light",
        imageSection: "love" as const,
        body: "관계에서는 빠른 판단보다 흐름을 읽는 감각이 중요합니다. 일간의 색이 강하게 드러날수록 상대에게 각인되는 매력이 선명해지고, 관계의 리듬 역시 분명해집니다.",
      },
      {
        title: "재물운과 자산관리",
        imageQuery: "wealth planning golden light",
        imageSection: "wealth" as const,
        body: "재물 흐름은 재능을 구조화할 때 안정됩니다. 강한 오행은 추진력을 주지만, 약한 오행을 보완하는 루틴이 있을 때 성과가 더 오래 갑니다.",
      },
      {
        title: "종합 운세 요약",
        imageQuery: "night sky destiny stars",
        imageSection: "default" as const,
        body: `${celebrity.name}의 명식은 대중에게 보이는 이미지와 내면의 선택 기준이 함께 움직이는 구조입니다. ${timeNotice}`,
      },
    ],
  };
}

export function getCelebritySajuPage(slug: string) {
  const decoded = decodeURIComponent(String(slug || ""));
  const celebrity = getCelebrityBySlug(slug) || publishedCelebritySajuSeeds.find((item) => item.name === decoded || item.nameEn === decoded) || null;
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

export function getPublishedCelebrityCategoryRoutes() {
  return Array.from(new Set(publishedCelebritySajuSeeds.map((item) => categoryToSlug(item.category)))).map((slug) => `/famous-saju/category/${slug}`);
}

export { categoryToSlug, famousSajuCategories, getCelebritiesByCategory, publishedCelebritySajuSeeds };
