/**
 * @jest-environment node
 *
 * 결제 이력 요약(formatPaymentSummaryResponse)은 승인번호·영수증 URL·merchantUid 를 빼고 나간다.
 * handleMe(/api/payments/me)가 이 함수를 쓰므로 계약이 살아 있다.
 *
 * 🔴 주문 상세(formatOrderDetailResponse)에 대한 단언은 여기서 제거했다 — 그 함수는 유일한
 * 호출자였던 handleOrderDetail 과 함께 삭제됐고, GET /api/payments/orders/:id 는 이제 V2
 * (worker/payments/)가 답한다. 같은 계약(주문번호·승인번호 마스킹, receiptAvailable,
 * rawPortOne 미노출)은 살아 있는 쪽에서 계속 지켜진다:
 *   · worker/payments/compat.js:70-74  (toLegacyOrderDetail)
 *   · __tests__/worker/payments-v2.compat.test.js:103-120  (마스킹 · receiptAvailable 양방향 · PII 제외)
 *   · __tests__/worker/payments-v2.context.test.js:109      (응답 본문에 rawPortOne 이 새지 않는다)
 * 죽은 구현을 되살려 이 파일에서 다시 재는 대신, 그쪽 가드를 정본으로 둔다.
 */

test("payment history summary excludes receipt and approval details", async () => {
  const { __paymentsTestUtils: utils } = await import("../../worker/routes/payments.js");
  const payment = {
    _id: "64f0a1b2c3d4e5f678901234",
    merchantUid: "md_user_order_123456",
    paymentAmount: 9900,
    paymentMethod: "CARD",
    paymentType: "membership_pass",
    productId: "moonlight_pass_family",
    status: "success",
    rawPortOne: {
      apply_num: "APPROVAL-123456",
      receipt_url: "https://receipt.invalid/private",
    },
  };

  const summary = utils.formatPaymentSummaryResponse(payment);

  expect(summary).toMatchObject({ id: payment._id, paymentAmount: 9900, status: "success" });
  expect(summary).not.toHaveProperty("approvalNumber");
  expect(summary).not.toHaveProperty("receiptUrl");
  expect(summary).not.toHaveProperty("merchantUid");
  expect(summary).not.toHaveProperty("rawPortOne");
});
