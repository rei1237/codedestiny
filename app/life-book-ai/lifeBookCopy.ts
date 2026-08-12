// 인생의 책 · 인생 총운의 사용자 노출 문구 정본.
//
// 🔴 개발자 문구(Error / Failed / undefined)가 화면에 뜨지 않게 하는 것이 이 파일의 목적이다.
//    마지막 안전망은 기존 friendlyErrorMessage(app/_lib/friendly-error.ts) — 한글이 없는 메시지는
//    콘솔로만 보내고 폴백을 쓴다. 새 안전망을 만들지 말고 그것을 쓴다.

export type LifeBookMode = "lifeBook" | "lifeFortune";

export const MODE_FEATURE_KEY: Record<LifeBookMode, string> = {
  lifeBook: "life-book-ai-consultation",
  lifeFortune: "life-fortune-ai-consultation",
};

export const MODE_TITLE: Record<LifeBookMode, string> = {
  lifeBook: "인생의 책 전문가 상담",
  lifeFortune: "인생 총운 전문가 상담",
};

// 서버 레지스트리(worker/lib/paid-feature-registry.js)와 같은 값. degraded 로 서버 금액을
// 못 받았을 때만 쓰는 폴백이며, 실제 금액은 coin-gate 가 featureKey 로 재확정한다.
export const MODE_FALLBACK_PRICE: Record<LifeBookMode, { coinPrice: number; amountKRW: number; membershipCreditCost: number }> = {
  lifeBook: { coinPrice: 200, amountKRW: 20000, membershipCreditCost: 2000 },
  lifeFortune: { coinPrice: 300, amountKRW: 30000, membershipCreditCost: 3000 },
};

export const PHASE_COPY: Record<string, string> = {
  idle: "아직 쓰이지 않은 다음 장이 기다리고 있습니다",
  opening: "✦ 인생의 장을 준비하는 중...",
  payment: "✦ 달빛으로 책값을 헤아리는 중...",
  navigating: "✦ 완성된 책을 펼치는 중...",
  completed: "인생의 책이 완성되었습니다",
  error: "잠시 운명의 잉크가 번졌습니다",
};

// 집필 단계는 서버 progress(completed/total)에 맞춰 고른다. 서버 값이 없을 때만 경과 시간으로 대체한다.
export const WRITING_STAGES = [
  "✦ 명리학자가 당신의 명식을 펼치고 있습니다...",
  "✦ 타고난 오행과 십성의 균형을 살피는 중...",
  "✦ 이야기의 흐름을 엮는 중...",
  "✦ AI가 인생의 책을 집필하고 있습니다...",
  "✦ 마지막 장의 문장을 다듬는 중...",
];

export const FAILURE_COPY = {
  headline: "잠시 운명의 잉크가 번졌습니다.",
  retrying: "다시 한 번 이야기를 이어가겠습니다.",
  exhausted: "오늘은 잉크가 자꾸 번지네요. 잠시 뒤 다시 펼쳐 주세요.",
  refunded: "이용권과 결제는 이미 되돌려 드렸습니다. 새로 한 권을 여시겠어요?",
} as const;

// 서버 reason → 세계관 문구. 여기에 없는 reason 은 friendlyErrorMessage 가 걸러 준다.
export const REASON_COPY: Record<string, string> = {
  LLM_ERROR: "책장을 넘기다 잉크가 번졌습니다. 다시 펼쳐 주세요.",
  GENERATION_ALREADY_FAILED: "이 원고는 잉크가 번진 채로 남았습니다. 새 원고로 다시 시작해 주세요.",
  GENERATION_STALLED: "집필이 오래 멈춰 있었습니다. 새 원고로 다시 시작합니다.",
  LIFE_FORTUNE_REPORT_INVALID: "총운의 장이 다 채워지지 않았습니다. 다시 펼쳐 주세요.",
  PAYMENT_VERIFY_FAILED: "달빛 값이 아직 책방에 닿지 않았습니다. 잠시 후 다시 시도해 주세요.",
  PAYMENT_REQUIRED: "이 책은 이용권 또는 결제 확인 후 펼쳐집니다. 결제창을 확인해 주세요.",
  PAYMENT_CANCELLED: "결제를 멈추셨습니다. 필요할 때 다시 펼칠 수 있습니다.",
  LOGIN_REQUIRED: "책방 문을 열려면 먼저 이름을 밝혀 주세요. 로그인 후 다시 시도해 주세요.",
  INVALID_INPUT: "책을 열기 위한 정보가 부족합니다. 생년월일과 성별을 다시 확인해 주세요.",
  SAJU_CALCULATION_FAILED: "명식을 다 세우지 못했습니다. 이용권과 결제는 차감되지 않았습니다.",
  PRICE_NOT_FOUND: "책값을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  NETWORK: "바람에 페이지가 넘어갔습니다. 연결을 확인하고 다시 시도해 주세요.",
  SERVER_ERROR: "책방이 잠시 술렁였습니다. 이용권과 결제는 차감되지 않았습니다.",
};

export function reasonCopy(reason: string, fallback = REASON_COPY.SERVER_ERROR) {
  return REASON_COPY[String(reason || "").toUpperCase()] || fallback;
}
