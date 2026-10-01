/**
 * 연이·네오 상담(/api/fortune-chat/consultations)의 결제 버튼 판정.
 *
 * 🔴 서버 카드 prepare 가드(worker/yeongnyangi/payment-intent.js assertChatPaymentIntent)가 이미 열린
 *    `fc-<id>` 상담의 결제창을 FORTUNE_ALREADY_PAID 로 거절한다. 이 판정은 그 앞에서 결제 버튼 자체를
 *    내지 않는 화면 방어이며, 두 겹으로 막는다:
 *    1. 렌더 — 결제 전(CREATED)이고 열린 흔적이 하나도 없을 때만 버튼을 그린다.
 *    2. 클릭 — 결제창을 열기 직전 서버에서 상담을 다시 읽어 같은 판정을 한 번 더 한다.
 *       다시 읽기가 실패하면 결제창을 열지 않는다(fail-closed).
 */
export type CheckoutCandidate = {
  paid?: boolean;
  state?: string;
  accessMethod?: string | null;
  freeTrialAvailable?: boolean;
};

export function canOfferCheckout(row: CheckoutCandidate | null | undefined): boolean {
  return Boolean(row) && row!.paid !== true && row!.state === "CREATED" && !row!.accessMethod;
}

export function canOfferFreeTrial(row: CheckoutCandidate | null | undefined): boolean {
  return canOfferCheckout(row) && row!.freeTrialAvailable === true;
}

export type GuardedCheckout<Row, Result> =
  | { opened: true; row: Row; result: Result }
  | { opened: false; row: Row | null; error?: unknown };

/**
 * `reread` 는 결제 증빙을 붙여 보는 서버 읽기여야 한다(다른 탭에서 결제만 끝나고 아직 연결되지 않은
 * 상담도 여기서 열린다). 판정이 결제를 허락할 때만 `open` 을 부른다.
 */
export async function guardCheckout<Row extends CheckoutCandidate, Result>(
  reread: () => Promise<Row>,
  open: (row: Row) => Promise<Result>,
): Promise<GuardedCheckout<Row, Result>> {
  let row: Row;
  try {
    row = await reread();
  } catch (error) {
    return { opened: false, row: null, error };
  }
  if (!canOfferCheckout(row)) return { opened: false, row };
  return { opened: true, row, result: await open(row) };
}
