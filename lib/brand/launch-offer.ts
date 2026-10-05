// 영냥이 정식 상담 오픈 전 체험가 표기(2026-10-02 사용자 결정). 표시 전용이며 실결제가는 worker/lib/paid-feature-registry.js 그대로다.
// 2026-10-05 종료: 예정가가 그대로 실결제가가 되었다(registry). active 를 false 로 내려 체험가 표기를 모두 거둔다.
// 🔴 '정가'라고 쓰지 않는다 — 이 금액에 판 적이 없어 종전가처럼 보이면 표시광고법상 허위 할인 표시가 된다. 늘 '정식 오픈 예정가'로 쓴다.
// 선착순 1,000명은 자동 집계하지 않는다. 판매가 1,000건에 닿으면 운영자가 active 를 false 로 바꿔 모든 체험가 표기를 내린다.
// 2026-10-05 가격 정정: 생선 1:3:5:10, 모둠 50,000원, 오마카세 80,000원(사용자 확정).
export const launchOffer = {
  active: false,
  limit: 1000,
  plannedPriceKRW: {mackerel: 3000, salmon: 9000, flounder: 15000, tuna: 30000, assorted: 50000, omakase: 80000},
} as const;

export type LaunchFish = keyof typeof launchOffer.plannedPriceKRW;

const isFish = (fishId: string): fishId is LaunchFish => Object.prototype.hasOwnProperty.call(launchOffer.plannedPriceKRW, fishId);

/** 단건 상담의 정식 오픈 예정가. 이벤트가 끝났거나 예정가가 지금 가격보다 높지 않으면 null(표기하지 않음). */
export function plannedPriceFor(fishId: string, priceKRW: number): number | null {
  if (!launchOffer.active || !isFish(fishId) || !(priceKRW > 0)) return null;
  const planned = launchOffer.plannedPriceKRW[fishId];
  return planned > priceKRW ? planned : null;
}

/** 생선 팩(영냥이 전용 이용권)의 예정가. 팩 실가에 그 생선의 단건 배율을 곱해 100원 단위로 반올림한다 — 팩 할인율은 그대로 남는다. */
export function plannedPackPriceFor(fishId: string, unitPriceKRW: number, packPriceKRW: number): number | null {
  const unitPlanned = plannedPriceFor(fishId, unitPriceKRW);
  if (unitPlanned === null || !(packPriceKRW > 0)) return null;
  return Math.round((packPriceKRW * unitPlanned) / unitPriceKRW / 100) * 100;
}
