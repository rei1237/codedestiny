// Accepted attribution is an untrusted campaign label, never payment evidence.
// v1: Threads campaign codes. v2 (2026-10-12 4-week campaign): utm_campaign=growth_20261012 on
// naver_blog|youtube|tiktok|x, stored as growth_20261012_<source> with an optional public content code (B01_ko).
const V1 = /^(threads_[0-9]{8}_(saju|ziwei|vedic|numerology)|threads_queue_t[0-9]{2}_v1)$/;
const V2 = /^growth_(20261012_(naver_blog|youtube|tiktok|x)|20261021_(naver_blog|youtube))$/;
const V2_CONTENT = /^(W[0-9]{2}-)?[A-Z][A-Z0-9-]{1,10}_(ko|en|ja)$/;
// entry-20261114-v1: fixed entry-source codes set by js/core/analytics.js when no campaign applies. No free-form UTM.
const ENTRY = /^(organic_naver|organic_google|organic_daum|organic_bing|paid_search|social|email|ai)$/;
export function normalizeGrowthAttribution(value) {
  if (!value || typeof value.campaignId !== 'string' || value.consent !== true) return undefined;
  const device = ['mobile','desktop'].includes(value.device)?value.device:'unknown';
  if (value.version === 'paid-20261028-v1' && /^(paid_20261028_naver|paid_20261028_brand|ggulggul_2027_test)$/.test(value.campaignId)) {
    return {campaignId:value.campaignId,version:value.version,consent:true,device,
      ...(typeof value.content === 'string' && /^([A-E]_ko|yearly_[abc])$/.test(value.content) ? {content:value.content} : {}),
      ...(typeof value.keyword === 'string' && /^K(0[1-9]|10)$/.test(value.keyword) ? {keyword:value.keyword} : {})};
  }
  if (value.version === 'entry-20261114-v1' && ENTRY.test(value.campaignId)) return {campaignId:value.campaignId,version:value.version,consent:true,device};
  if (value.version === 'growth-20260929-v1' && V1.test(value.campaignId)) return {campaignId:value.campaignId,version:value.version,consent:true,device};
  if (value.version === 'growth-20261012-v2' && V2.test(value.campaignId)) {
    return {campaignId:value.campaignId,version:value.version,consent:true,device,
      ...(typeof value.content === 'string' && V2_CONTENT.test(value.content) ? {content:value.content} : {})};
  }
  return undefined;
}

// Campaign labels are untrusted metadata, never payment evidence.
export function readCheckoutAttribution(request, value) {
  const cookies = String(request.headers.get('cookie') || '').split(';').map(v => v.trim());
  const consent = cookies.filter(v => v.startsWith('cd_cookie_consent='));
  if (consent.length !== 1 || consent[0] !== 'cd_cookie_consent=accepted' || cookies.includes('cd_analytics_revoke_pending=1')) return undefined;
  if (value === undefined) {
    const labels = cookies.filter(v => v.startsWith('cd_paid_campaign='));
    if (labels.length !== 1) return undefined;
    try { value = JSON.parse(decodeURIComponent(labels[0].slice('cd_paid_campaign='.length))); } catch { return undefined; }
  }
  return normalizeGrowthAttribution(value);
}
