import { calculateLocalSaju, type LocalSajuResult, type SajuPillarLocal } from "../../app/saju/animal-destiny/engine/localSajuCalculator";
import {
  categoryToSlug,
  famousSajuCategories,
  getCelebrityBySlug,
  getCelebritiesByCategory,
  publishedCelebritySajuSeeds,
  type CelebritySajuSeed,
} from "./celebrity-data";

const elementByStem: Record<string, string> = { 갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수" };
const elementByBranch: Record<string, string> = { 자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화", 오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수" };
const stemTone: Record<string, string> = {
  갑: "큰 나무처럼 방향을 세우고 앞으로 뻗는 힘이 강합니다.",
  을: "풀꽃처럼 섬세하게 이어 붙이고 관계를 살리는 힘이 있습니다.",
  병: "태양처럼 존재감이 크고 메시지를 밝히는 힘이 있습니다.",
  정: "촛불처럼 집중된 온기로 한 장면을 깊게 밝힙니다.",
  무: "큰 산처럼 중심을 지키고 오래 버티는 힘이 있습니다.",
  기: "기름진 흙처럼 현실을 돌보고 성과를 키워내는 힘이 있습니다.",
  경: "단단한 쇠처럼 결단과 실행의 칼날이 또렷합니다.",
  신: "보석처럼 정교한 미감과 기준을 통해 자신을 빛냅니다.",
  임: "큰 물처럼 넓게 흐르며 판을 읽는 감각이 뛰어납니다.",
  계: "비와 안개처럼 섬세하게 스며들어 깊은 영감을 남깁니다.",
};
const elementTone: Record<string, string> = {
  목: "성장과 기획의 흐름이 강해 새로운 방향을 열고 사람을 이끄는 힘이 돋보입니다.",
  화: "표현과 확산의 기운이 선명해 무대 위 존재감과 메시지를 밝히는 힘이 큽니다.",
  토: "중심을 잡고 결과를 쌓아가는 힘이 강해 신뢰와 지속성이 큰 자산이 됩니다.",
  금: "선택과 완성의 기운이 또렷해 기준을 세우고 성과를 다듬는 능력이 돋보입니다.",
  수: "감각과 통찰의 흐름이 깊어 보이지 않는 흐름을 읽고 유연하게 움직이는 힘이 있습니다.",
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

function countPillarElements(pillar: SajuPillarLocal | null, counts: Record<string, number>) {
  if (!pillar) return;
  const stemEl = elementByStem[pillar.stem] || "";
  const branchEl = elementByBranch[pillar.branch] || "";
  if (stemEl) counts[stemEl] += 1;
  if (branchEl) counts[branchEl] += 1;
}

function buildElementProfile(saju: LocalSajuResult) {
  const counts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
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
  return {
    celebrity,
    saju,
    dayElement,
    dayMasterLabel,
    hourText: saju.pillars.hour?.ganji || "출생 시간 미상",
    elementProfile,
    summary: `${celebrity.name}의 사주는 ${dayMasterLabel}를 중심으로 ${elementProfile.dominantElement}의 기운이 두드러집니다. ${stemTone[dayStem] || ""}`,
    sections: [
      { title: "일간 분석", body: `${dayStem} 일간은 ${stemTone[dayStem] || "자기만의 결을 따라 움직이는 기운"}을 품고 있습니다. 이 기운은 ${celebrity.name}의 활동에서 직업적 선택과 대중 앞의 인상으로 자연스럽게 드러납니다.` },
      { title: "오행 흐름", body: `${elementProfile.dominantElement} 기운이 가장 강하게 나타납니다. ${elementTone[elementProfile.dominantElement] || ""} 보완이 필요한 흐름은 ${elementProfile.weakElement}이며, 휴식과 관계의 균형에서 부드럽게 채워질 때 좋습니다.` },
      { title: "직업운과 재능", body: `${celebrity.category} 분야에서 오래 남는 힘은 반복 가능한 장점에서 나옵니다. ${celebrity.tags.join(", ")}의 키워드는 이 사주의 재능이 현실에서 표현되는 통로로 볼 수 있습니다.` },
      { title: "연애운과 관계", body: "관계에서는 빠른 판단보다 흐름을 읽는 감각이 중요합니다. 일간의 색이 강하게 드러날수록 상대에게 보여지는 매력도 또렷해지고 관계의 리듬도 선명해집니다." },
      { title: "재물운과 자산관리", body: "재물 흐름은 재능을 꾸준히 구조화할 때 안정됩니다. 강한 오행은 추진력을 주지만, 약한 오행을 보완하는 루틴이 있을 때 결과가 더 오래 갑니다." },
      { title: "종합 운세 요약", body: `${celebrity.name}의 명식은 대중에게 보이는 이미지와 내면의 선택 기준이 함께 움직이는 구조입니다. 출생 시간이 공개되지 않은 경우 시주는 제외하고 연주·월주·일주 중심으로만 해석했습니다.` },
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
