/**
 * @jest-environment node
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
  const detail = utils.formatOrderDetailResponse(payment);

  expect(summary).toMatchObject({ id: payment._id, paymentAmount: 9900, status: "success" });
  expect(summary).not.toHaveProperty("approvalNumber");
  expect(summary).not.toHaveProperty("receiptUrl");
  expect(summary).not.toHaveProperty("merchantUid");
  expect(detail).toMatchObject({
    id: payment._id,
    orderNumberMasked: "••••3456",
    approvalNumberMasked: "••••3456",
    receiptAvailable: true,
  });
  expect(detail).not.toHaveProperty("rawPortOne");
});
