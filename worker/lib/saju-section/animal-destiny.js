import { createAnimalDestinyRuntime } from "./runtime.generated.mjs";

// 십이운성 동물점(animal-destiny-unlock) 유료 풀이. 원국 네 기둥으로 화면(store.calculate · AnimalResultScreen)과 같은
// 순서를 밟는다: 대표 운성 → 동물 → 결과 카드(result) · 10개 탭(sections) · 심층 리포트(detailed) · 12동물 도감 설명(dex).
// 탭은 화면처럼 한국어 문장이다(buildTwelveAnimalSections 기본 locale).
const rt = createAnimalDestinyRuntime();

function pillar(ganji) {
  if (!ganji) return null;
  const [stemRaw, branchRaw] = Array.from(String(ganji));
  const stem = rt.normalizeStem(stemRaw);
  const branch = rt.normalizeBranch(branchRaw);
  return stem && branch ? { stem, branch, ganji: `${stem}${branch}` } : null;
}

/**
 * @param {{year:string, month:string, day:string, hour?:string|null}} natalPillars calculateNatalSaju 의 간지(한자)
 * @param {boolean} timeUnknown
 */
export function buildAnimalDestinyReading(natalPillars, timeUnknown = false) {
  const pillars = { year: pillar(natalPillars.year), month: pillar(natalPillars.month), day: pillar(natalPillars.day), hour: pillar(natalPillars.hour) };
  if (!pillars.day) return null;
  // sajuAdapter.calculateLocalResult 와 같은 모양.
  const sajuResult = {
    dayStem: pillars.day.stem, pillars, timeUnknown,
    yearPillar: pillars.year, monthPillar: pillars.month, dayPillar: pillars.day, hourPillar: pillars.hour,
  };
  const { animalId } = rt.getAnimalBySajuResult(sajuResult);
  const animal = rt.getAnimalDisplayData(animalId);
  if (!animal) return null;
  const result = rt.resolveTwelveGrowthAnimalResult(animal);
  return {
    animalId, stageKey: result.stageKey, result,
    sections: rt.buildTwelveAnimalSections(result),
    detailed: rt.buildDetailedInterpretation({ animal, pillars: rt.getFourPillarStageItems(sajuResult) }),
    dex: rt.ANIMAL_DESTINY_LIST.map((entry) => {
      const r = rt.resolveTwelveGrowthAnimalResult(entry);
      return { stageKey: r.stageKey, personality: r.personality, growthMission: r.growthMission, elementTags: r.elementTags };
    }),
  };
}
