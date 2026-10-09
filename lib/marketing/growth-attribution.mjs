// Accepted attribution is an untrusted campaign label, never payment evidence.
// v1: Threads campaign codes. v2 (2026-10-12 4-week campaign): utm_campaign=growth_20261012 on
// naver_blog|youtube|tiktok|x, stored as growth_20261012_<source> with an optional public content code (B01_ko).
const V1 = /^(threads_[0-9]{8}_(saju|ziwei|vedic|numerology)|threads_queue_t[0-9]{2}_v1)$/;
const V2 = /^growth_20261012_(naver_blog|youtube|tiktok|x)$/;
const V2_CONTENT = /^(W[0-9]{2}-)?[A-Z][A-Z0-9-]{1,10}_(ko|en|ja)$/;
export function normalizeGrowthAttribution(value) {
  if (!value || typeof value.campaignId !== 'string' || value.consent !== true) return undefined;
  const device = ['mobile','desktop'].includes(value.device)?value.device:'unknown';
  if (value.version === 'growth-20260929-v1' && V1.test(value.campaignId)) return {campaignId:value.campaignId,version:value.version,consent:true,device};
  if (value.version === 'growth-20261012-v2' && V2.test(value.campaignId)) {
    return {campaignId:value.campaignId,version:value.version,consent:true,device,
      ...(typeof value.content === 'string' && V2_CONTENT.test(value.content) ? {content:value.content} : {})};
  }
  return undefined;
}
