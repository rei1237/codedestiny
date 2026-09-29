// Accepted attribution is an untrusted campaign label, never payment evidence.
export function normalizeGrowthAttribution(value) {
  if (!value || typeof value.campaignId !== 'string' || value.consent !== true || value.version !== 'growth-20260929-v1' ||
      !/^(threads_[0-9]{8}_(saju|ziwei|vedic|numerology)|threads_queue_t[0-9]{2}_v1)$/.test(value.campaignId || '')) return undefined;
  return {campaignId:value.campaignId,version:value.version,consent:true,
    device:['mobile','desktop'].includes(value.device)?value.device:'unknown'};
}
