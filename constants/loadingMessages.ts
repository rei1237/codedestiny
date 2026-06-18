export const LOADING_MESSAGES = {
  pg_processing: {
    subscription: {
      title: "월정석 결제를 처리하고 있어요",
      sub: "잠시만 기다려 주세요",
    },
    single: {
      title: "결제를 처리하고 있어요",
      sub: "창을 닫지 말아 주세요",
    },
  },
  result_loading: {
    subscription: {
      title: "월정석이 활성화되고 있어요",
      sub: "곧 이용 가능해져요",
    },
    single: {
      title: "결제가 완료됐어요",
      sub: "결과를 불러오는 중이에요",
    },
    pass: {
      title: "이용권을 확인했어요",
      sub: "결과를 불러오는 중이에요",
    },
  },
  access_check: {
    subscription: {
      title: "월정석 정보를 확인하는 중이에요",
      sub: "",
    },
    single: {
      title: "잔액을 확인하는 중이에요",
      sub: "",
    },
    pass: {
      title: "이용권을 확인하는 중이에요",
      sub: "",
    },
  },
} as const;

export type LoadingStage = keyof typeof LOADING_MESSAGES;
export type PaymentType = "subscription" | "single" | "pass";

export const FALLBACK_LOADING_MESSAGE = {
  title: "처리 중이에요",
  sub: "잠시만 기다려 주세요",
} as const;

export function resolveLoadingMessage(stage?: LoadingStage, paymentType?: PaymentType) {
  if (!stage || !paymentType) return FALLBACK_LOADING_MESSAGE;
  return LOADING_MESSAGES[stage]?.[paymentType] ?? FALLBACK_LOADING_MESSAGE;
}
