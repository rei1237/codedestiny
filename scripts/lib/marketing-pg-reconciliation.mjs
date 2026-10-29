// PortOne V2 SelectedChannel.type is the source of LIVE/TEST classification.
// A live-channel payment may still be an operator's test; never infer customer revenue.
export function classifyMarketingPayment(row, raw) {
  if (!raw || raw.id !== row.merchantUid || raw.currency !== 'KRW'
      || typeof raw.amount?.total !== 'number' || !Number.isSafeInteger(raw.amount.total)
      || raw.amount.total <= 0 || raw.amount.total !== Number(row.paymentAmount)) {
    return {kind:'mismatch'};
  }
  if (raw.channel?.type === 'TEST') return {kind:'test'};
  if (raw.channel?.type !== 'LIVE') return {kind:'unknown'};
  const total=raw.amount.total, cancelled=raw.amount.cancelled;
  if (!Number.isSafeInteger(cancelled) || cancelled < 0 || cancelled > total
      || !['PAID','CANCELLED','PARTIAL_CANCELLED'].includes(raw.status)
      || (raw.status === 'PAID' && cancelled !== 0)
      || (raw.status === 'CANCELLED' && cancelled !== total)
      || (raw.status === 'PARTIAL_CANCELLED' && (cancelled === 0 || cancelled === total))) {
    return {kind:'unknown'};
  }
  return {kind:'live',grossKRW:total,cancelledKRW:cancelled,netKRW:total-cancelled};
}
