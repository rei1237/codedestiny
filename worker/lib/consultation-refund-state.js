// Pure response contract shared by paid routes, billing and browser fixtures.
export function consultationRefundState(doc) {
  const status = doc?.llmMeta?.deliveryRefund?.status;
  return ['pending', 'refunded', 'manual_review'].includes(status) ? status : '';
}

export function consultationRefundResponse(doc) {
  const state = consultationRefundState(doc);
  if (!state) return null;
  return { status: state === 'refunded' ? 403 : 409, body: {
    ok: false, reason: state === 'refunded' ? 'PAYMENT_REFUNDED' : 'REFUND_PENDING',
    refundStatus: state, retryable: state === 'pending',
    message: state === 'refunded' ? '이 상담의 결제·이용 처리가 취소되었습니다. 결제 내역을 확인해 주세요.'
      : state === 'manual_review' ? '결제·이용 복원을 운영자가 확인 중입니다. 결제 내역에서 처리 상태를 확인해 주세요.'
        : '결과 미완성에 따른 환불을 확인하고 있습니다. 결제 내역에서 처리 상태를 확인해 주세요.',
  } };
}
