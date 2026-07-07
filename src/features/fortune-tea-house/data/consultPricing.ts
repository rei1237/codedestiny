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

export function getFortuneTeaHouseResultButtonLabel(mode: FortuneTeaHouseConsultMode, priceLabel = getFortuneTeaHouseConsultPriceLabel(mode)) {
  if (mode === "tarot") return `타로 결과 보기 · ${priceLabel}`;
  if (mode === "sukuyo") return `숙요점 궁합 결과 보기 · ${priceLabel}`;
  return `사주 결과 보기 · ${priceLabel}`;
}

// 결과 생성 후(접근권 확보 상태)의 리빌 버튼용 라벨. 이 시점엔 이미 결제/이용권이 확인됐으므로
// 가격을 노출하지 않는다. 타로/사주/숙요 공통 문구.
export function getFortuneTeaHouseRevealButtonLabel() {
  return "연이 상담문 펼쳐보기";
}
