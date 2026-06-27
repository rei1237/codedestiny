import { fortuneTeaHouseAssets } from "./assets";

export type TarotAtlasSheetKey = "mapping1" | "mapping2" | "mapping3" | "mapping4";

export type TarotAtlasSlice = {
  cardId: string;
  sheet: TarotAtlasSheetKey;
  sheetWidth: number;
  sheetHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  nameKo: string;
  nameEn: string;
};

export const tarotAtlasSheets: Record<TarotAtlasSheetKey, string> = {
  mapping1: fortuneTeaHouseAssets.tarot.frameSheet,
  mapping2: fortuneTeaHouseAssets.tarot.majorArcana,
  mapping3: fortuneTeaHouseAssets.tarot.minorWandsCups,
  mapping4: fortuneTeaHouseAssets.tarot.minorSwordsPentacles,
};

const majorSheet = {
  sheet: "mapping2" as const,
  sheetWidth: 1122,
  sheetHeight: 1402,
};

export const tarotAtlasSlices: Record<string, TarotAtlasSlice> = {
  major_00_fool: { ...majorSheet, cardId: "major_00_fool", x: 66, y: 136, width: 148, height: 253, nameKo: "바보", nameEn: "The Fool" },
  major_01_magician: { ...majorSheet, cardId: "major_01_magician", x: 247, y: 137, width: 146, height: 252, nameKo: "마법사", nameEn: "The Magician" },
  major_02_high_priestess: { ...majorSheet, cardId: "major_02_high_priestess", x: 411, y: 137, width: 146, height: 252, nameKo: "여사제", nameEn: "The High Priestess" },
  major_03_empress: { ...majorSheet, cardId: "major_03_empress", x: 576, y: 144, width: 145, height: 245, nameKo: "여황제", nameEn: "The Empress" },
  major_04_emperor: { ...majorSheet, cardId: "major_04_emperor", x: 746, y: 136, width: 146, height: 253, nameKo: "황제", nameEn: "The Emperor" },
  major_05_hierophant: { ...majorSheet, cardId: "major_05_hierophant", x: 912, y: 148, width: 142, height: 241, nameKo: "교황", nameEn: "The Hierophant" },
  major_06_lovers: { ...majorSheet, cardId: "major_06_lovers", x: 66, y: 449, width: 148, height: 252, nameKo: "연인", nameEn: "The Lovers" },
  major_07_chariot: { ...majorSheet, cardId: "major_07_chariot", x: 247, y: 449, width: 145, height: 253, nameKo: "전차", nameEn: "The Chariot" },
  major_08_strength: { ...majorSheet, cardId: "major_08_strength", x: 412, y: 456, width: 144, height: 246, nameKo: "힘", nameEn: "Strength" },
  major_09_hermit: { ...majorSheet, cardId: "major_09_hermit", x: 576, y: 456, width: 145, height: 245, nameKo: "은둔자", nameEn: "The Hermit" },
  major_10_wheel_of_fortune: { ...majorSheet, cardId: "major_10_wheel_of_fortune", x: 746, y: 454, width: 145, height: 248, nameKo: "운명의 수레바퀴", nameEn: "Wheel of Fortune" },
  major_11_justice: { ...majorSheet, cardId: "major_11_justice", x: 911, y: 449, width: 143, height: 253, nameKo: "정의", nameEn: "Justice" },
  major_12_hanged_man: { ...majorSheet, cardId: "major_12_hanged_man", x: 67, y: 763, width: 147, height: 239, nameKo: "매달린 사람", nameEn: "The Hanged Man" },
  major_13_death: { ...majorSheet, cardId: "major_13_death", x: 247, y: 764, width: 145, height: 238, nameKo: "죽음", nameEn: "Death" },
  major_14_temperance: { ...majorSheet, cardId: "major_14_temperance", x: 412, y: 763, width: 144, height: 239, nameKo: "절제", nameEn: "Temperance" },
  major_15_devil: { ...majorSheet, cardId: "major_15_devil", x: 576, y: 766, width: 145, height: 236, nameKo: "악마", nameEn: "The Devil" },
  major_16_tower: { ...majorSheet, cardId: "major_16_tower", x: 746, y: 764, width: 144, height: 238, nameKo: "탑", nameEn: "The Tower" },
  major_17_star: { ...majorSheet, cardId: "major_17_star", x: 911, y: 759, width: 142, height: 244, nameKo: "별", nameEn: "The Star" },
  major_18_moon: { ...majorSheet, cardId: "major_18_moon", x: 202, y: 1074, width: 126, height: 184, nameKo: "달", nameEn: "The Moon" },
  major_19_sun: { ...majorSheet, cardId: "major_19_sun", x: 364, y: 1074, width: 124, height: 185, nameKo: "태양", nameEn: "The Sun" },
  major_20_judgement: { ...majorSheet, cardId: "major_20_judgement", x: 523, y: 1074, width: 128, height: 184, nameKo: "심판", nameEn: "Judgement" },
  major_21_world: { ...majorSheet, cardId: "major_21_world", x: 760, y: 1078, width: 126, height: 176, nameKo: "세계", nameEn: "The World" },
};

export const legacyTarotAtlasCardIds: Record<string, string> = {
  "the-fool": "major_00_fool",
  "the-magician": "major_01_magician",
  "the-high-priestess": "major_02_high_priestess",
  "the-empress": "major_03_empress",
  "the-emperor": "major_04_emperor",
  "the-hierophant": "major_05_hierophant",
  "the-lovers": "major_06_lovers",
  "the-chariot": "major_07_chariot",
  strength: "major_08_strength",
  "the-hermit": "major_09_hermit",
  "wheel-of-fortune": "major_10_wheel_of_fortune",
  justice: "major_11_justice",
  "the-hanged-man": "major_12_hanged_man",
  death: "major_13_death",
  temperance: "major_14_temperance",
  "the-devil": "major_15_devil",
  "the-tower": "major_16_tower",
  "the-star": "major_17_star",
  "the-moon": "major_18_moon",
  "the-sun": "major_19_sun",
  judgement: "major_20_judgement",
  "the-world": "major_21_world",
};

export function resolveTarotAtlasSlice(cardId: string) {
  const normalizedId = legacyTarotAtlasCardIds[cardId] || cardId;
  return tarotAtlasSlices[normalizedId] || tarotAtlasSlices.major_00_fool;
}

export function getTarotAtlasSheetSrc(sheet: TarotAtlasSheetKey) {
  return tarotAtlasSheets[sheet];
}
