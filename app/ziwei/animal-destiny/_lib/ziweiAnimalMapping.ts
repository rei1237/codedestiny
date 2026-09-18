import type { AnimalId } from "@/app/saju/animal-destiny/lib/types";

/**
 * chart.mingGong(app/_lib/ziwei-engine.ts) 은 항상 ZHI_LIST 12지지 중 하나다.
 * 기존 사주 12종 캐릭터(animalTwelveData.ts)를 재사용하며 신규 동물 자산은 만들지 않는다.
 * 오(午)→달빛 고양이, 술(戌)→새싹 사슴은 로스터 안에 자연스러운 동물 대응이 없어 배정한
 * 약한 연결이므로 콘텐츠(ziweiAnimalContent.ts) 작성 시 이 두 쌍에 더 공을 들인다.
 */
export const BRANCH_TO_ANIMAL: Record<string, AnimalId> = {
  자: "raccoon",
  축: "koala",
  인: "tiger",
  묘: "rhino",
  진: "pegasus",
  사: "elephant",
  오: "monkey",
  미: "fawn",
  신: "black-panther",
  유: "sheep",
  술: "cheetah",
  해: "wolf",
};

/** animalCollection × STAGE_KEY_TO_ID(animalTwelveData.ts) 대조로 확정한 이모지. AnimalId 문자열 자체는 표시 동물과 무관하다. */
export const ANIMAL_EMOJI: Record<AnimalId, string> = {
  cheetah: "🦌",
  monkey: "🐈",
  "black-panther": "🦊",
  koala: "🐶",
  tiger: "🦁",
  raccoon: "🦉",
  rhino: "🐰",
  elephant: "🦋",
  sheep: "🐹",
  pegasus: "🐈‍⬛",
  wolf: "🐣",
  fawn: "🐑",
};

export function getAnimalIdByMingGong(mingGong: string): AnimalId {
  const animalId = BRANCH_TO_ANIMAL[mingGong];
  if (!animalId) {
    throw new Error(`getAnimalIdByMingGong: 알 수 없는 명궁 지지 "${mingGong}"`);
  }
  return animalId;
}
