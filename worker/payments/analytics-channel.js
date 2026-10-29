// Only PG evidence determines channel type. Never trust checkout request flags.
export function analyticsPaymentChannel(order) {
  const evidence=order?.rawPortOne;
  const type=evidence?.channelType || evidence?.rawV2?.channel?.type || evidence?.channel?.type;
  return type === 'LIVE' || type === 'TEST' ? type : 'UNKNOWN';
}
