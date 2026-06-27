import { fortuneTeaHouseAssets } from "../data/assets";
import { majorArcanaCards } from "../data/tarotCards";

export type TarotVisualMeta = {
  sheet: "majorArcana";
  index: number;
  nameKo: string;
  nameEn: string;
  positionX: string;
  positionY: string;
};

const majorArcanaPositions = [
  { positionX: "0%", positionY: "0%" },
  { positionX: "20%", positionY: "0%" },
  { positionX: "40%", positionY: "0%" },
  { positionX: "60%", positionY: "0%" },
  { positionX: "80%", positionY: "0%" },
  { positionX: "100%", positionY: "0%" },
  { positionX: "0%", positionY: "33.333%" },
  { positionX: "20%", positionY: "33.333%" },
  { positionX: "40%", positionY: "33.333%" },
  { positionX: "60%", positionY: "33.333%" },
  { positionX: "80%", positionY: "33.333%" },
  { positionX: "100%", positionY: "33.333%" },
  { positionX: "0%", positionY: "66.666%" },
  { positionX: "20%", positionY: "66.666%" },
  { positionX: "40%", positionY: "66.666%" },
  { positionX: "60%", positionY: "66.666%" },
  { positionX: "80%", positionY: "66.666%" },
  { positionX: "100%", positionY: "66.666%" },
  { positionX: "20%", positionY: "100%" },
  { positionX: "40%", positionY: "100%" },
  { positionX: "60%", positionY: "100%" },
  { positionX: "80%", positionY: "100%" },
] as const;

export const tarotVisualMetaMap = majorArcanaCards.reduce(
  (map, card) => {
    const position = majorArcanaPositions[card.number] || majorArcanaPositions[0];
    map[card.id] = {
      sheet: "majorArcana",
      index: card.number,
      nameKo: card.nameKo,
      nameEn: card.nameEn,
      positionX: position.positionX,
      positionY: position.positionY,
    };
    return map;
  },
  {} as Record<string, TarotVisualMeta>,
);

export function resolveTarotVisual(cardId: string) {
  return tarotVisualMetaMap[cardId] || tarotVisualMetaMap.major_00_fool;
}

export const tarotAssetSheets = {
  frameSheet: fortuneTeaHouseAssets.tarot.frameSheet,
  majorArcana: fortuneTeaHouseAssets.tarot.majorArcana,
  minorWandsCups: fortuneTeaHouseAssets.tarot.minorWandsCups,
  minorSwordsPentacles: fortuneTeaHouseAssets.tarot.minorSwordsPentacles,
} as const;
