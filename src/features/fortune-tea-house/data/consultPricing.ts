import type { FortuneTeaHouseConsultMode } from "./consult";

export type FortuneTeaHousePriceKey = FortuneTeaHouseConsultMode | "sajuCompatibility";

export const fortuneTeaHouseConsultPricing: Record<FortuneTeaHousePriceKey, {
  featureKey: string;
  amountKRW: number;
  label: string;
}> = {
  tarot: {
    featureKey: "fortune-tea-house-tarot-consultation",
    amountKRW: 5000,
    label: "5,000원",
  },
  saju: {
    featureKey: "fortune-tea-house-saju-consultation",
    amountKRW: 10000,
    label: "10,000원",
  },
  sajuCompatibility: {
    featureKey: "fortune-tea-house-saju-compatibility-consultation",
    amountKRW: 20000,
    label: "20,000원",
  },
  sukuyo: {
    featureKey: "fortune-tea-house-sukuyo-compatibility-consultation",
    amountKRW: 20000,
    label: "20,000원",
  },
};

export function getFortuneTeaHouseConsultPriceLabel(mode: FortuneTeaHousePriceKey) {
  return fortuneTeaHouseConsultPricing[mode].label;
}

export function getFortuneTeaHouseResultButtonLabel(mode: FortuneTeaHouseConsultMode) {
  if (mode === "tarot") return `타로 결과 보기 · ${getFortuneTeaHouseConsultPriceLabel("tarot")}`;
  if (mode === "sukuyo") return `숙요점 궁합 결과 보기 · ${getFortuneTeaHouseConsultPriceLabel("sukuyo")}`;
  return `사주 결과 보기 · ${getFortuneTeaHouseConsultPriceLabel("saju")}`;
}
