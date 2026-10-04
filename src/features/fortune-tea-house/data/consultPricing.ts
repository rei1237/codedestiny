import { resolveServerFeaturePricing } from "@/lib/payment/server-feature-pricing";
import type { FortuneTeaHouseConsultMode, FortuneTeaTarotSpread } from "./consult";

// Keep existing product keys; amounts are resolved from the server registry below.
export type FortuneTeaHousePriceKey = FortuneTeaHouseConsultMode | "sajuCompatibility" | "tarotFive";

export const fortuneTeaHouseConsultPricing: Record<FortuneTeaHousePriceKey, {
  featureKey: string;
  amountKRW: number;
  label: string;
}> = {
  tarot: {
    featureKey: "fortune-tea-house-tarot-consultation",
    amountKRW: 0,
    label: "가격 확인 중",
  },
  tarotFive: {
    featureKey: "fortune-tea-house-tarot-five-consultation",
    amountKRW: 0,
    label: "가격 확인 중",
  },
  saju: {
    featureKey: "fortune-tea-house-saju-consultation",
    amountKRW: 0,
    label: "가격 확인 중",
  },
  sajuCompatibility: {
    featureKey: "fortune-tea-house-saju-compatibility-consultation",
    amountKRW: 0,
    label: "가격 확인 중",
  },
  sukuyo: {
    featureKey: "fortune-tea-house-sukuyo-compatibility-consultation",
    amountKRW: 0,
    label: "가격 확인 중",
  },
};

// The same resolver used by checkout owns every displayed amount.
for (const item of Object.values(fortuneTeaHouseConsultPricing)) {
  const pricing = resolveServerFeaturePricing({ featureKey: item.featureKey });
  if (pricing) {
    item.amountKRW = pricing.amountKRW;
    item.label = new Intl.NumberFormat("ko-KR").format(pricing.amountKRW) + "원";
  }
}

/** 타로 상담은 스프레드로 상품이 갈리므로, 모드+스프레드를 가격표 키로 변환한다. */
export function resolveFortuneTeaHousePriceKey(mode: FortuneTeaHousePriceKey, tarotSpread?: FortuneTeaTarotSpread): FortuneTeaHousePriceKey {
  if (mode === "tarot" && tarotSpread === "five") return "tarotFive";
  return mode;
}

export function getFortuneTeaHouseConsultPriceLabel(mode: FortuneTeaHousePriceKey, tarotSpread?: FortuneTeaTarotSpread) {
  return fortuneTeaHouseConsultPricing[resolveFortuneTeaHousePriceKey(mode, tarotSpread)].label;
}

export function getFortuneTeaHouseConsultFeatureKey(mode: FortuneTeaHousePriceKey, tarotSpread?: FortuneTeaTarotSpread) {
  return fortuneTeaHouseConsultPricing[resolveFortuneTeaHousePriceKey(mode, tarotSpread)].featureKey;
}

export function getFortuneTeaHouseResultButtonLabel(
  mode: FortuneTeaHouseConsultMode,
  priceLabel?: string,
  tarotSpread?: FortuneTeaTarotSpread,
) {
  priceLabel = priceLabel ?? getFortuneTeaHouseConsultPriceLabel(mode, tarotSpread);
  if (mode === "tarot") return `타로 결과 보기 · ${priceLabel}`;
  if (mode === "sukuyo") return `숙요점 궁합 결과 보기 · ${priceLabel}`;
  if (mode === "sajuCompatibility") return `사주 궁합 결과 보기 · ${priceLabel}`;
  return `사주 결과 보기 · ${priceLabel}`;
}

// 결과 생성 후(접근권 확보 상태)의 리빌 버튼용 라벨. 이 시점엔 이미 결제/이용권이 확인됐으므로
// 가격을 노출하지 않는다. 타로/사주/숙요 공통 문구.
export function getFortuneTeaHouseRevealButtonLabel() {
  return "연이 상담문 펼쳐보기";
}
