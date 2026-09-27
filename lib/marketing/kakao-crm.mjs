// Channel/profile ID verified in Kakao Partner Center on 2026-09-28.
export const KAKAO_CHANNEL = Object.freeze({ publicId: '_GgxaGX', url: 'https://pf.kakao.com/_GgxaGX', addUrl: 'https://pf.kakao.com/_GgxaGX/friend', name: '꿀꿀 운세' });
export const CRM_CONSENT_VERSION = 'kakao-crm-2026-09-28-v1';
export const CRM_CONSENT_TEXT = '선택: 꿀꿀 운세의 운세 콘텐츠, 유료 상담 추천 및 이벤트 등 광고성 정보를 카카오톡으로 받는 데 동의합니다. 동의하지 않아도 가입·상담·결제가 가능하며 언제든 철회할 수 있습니다. 채널 친구 추가와는 별도입니다.';
export const CRM_SOURCES = ['signup_complete', 'free_result', 'product_detail', 'preferences'];
export const CRM_CAMPAIGNS = Object.freeze([
  { id: 'yeoni-weekly', title: '연이의 이번 주 운세', body: '이번 주, 마음의 속도를 살펴볼까요?\n무료 운세를 읽고 나에게 필요한 한 걸음을 찾아보세요.', button: '무료 운세 보기', path: '/channel/', image: 'yeoni-weekly.png', paid: false },
  { id: 'neo-depth', title: '네오의 깊은 해석', body: '같은 고민이 반복된다면, 선택의 기준부터.\n네오의 팩폭 작전실에서 상담 방식과 제공 내용을 확인하세요.', button: '상담 알아보기', path: '/neo-operation-room/', image: 'neo-depth.png', paid: true },
  { id: 'yeongnyangi-ask', title: '영냥이의 질문 상담', body: '마음에 걸리는 질문 하나, 영냥이에게.\n상담 가격과 결과 범위를 확인하고 나에게 맞는 깊이를 골라보세요.', button: '질문 상담 보기', path: '/yeongnyangi/1000-won-fortune/', image: 'yeongnyangi-ask.png', paid: true },
  { id: 'autumn-pause', title: '연휴 끝, 나를 돌보는 시간', body: '분주했던 연휴 뒤, 내 마음도 돌봐주세요.\n연이와 무료 사주를 살펴보며 일상으로 돌아갈 작은 방향을 찾아요.', button: '나의 흐름 보기', path: '/saju/', image: 'autumn-pause.png', paid: false },
]);
export function campaignUrl(id, operationId = '') {
  const c = CRM_CAMPAIGNS.find(c => c.id === id);
  if (!c) throw new Error('UNKNOWN_CAMPAIGN');
  if (operationId && !/^[a-z0-9][a-z0-9-]{2,79}$/.test(operationId)) throw new Error('INVALID_CAMPAIGN_ID');
  const url = new URL(c.path, 'https://code-destiny.com');
  url.searchParams.set('utm_source', 'kakao');
  url.searchParams.set('utm_medium', 'channel');
  url.searchParams.set('utm_campaign', operationId ? `crm-${operationId}` : c.id);
  url.searchParams.set('utm_content', `${c.id}-wideimage-v1`);
  return url.href;
}
export function validAmount(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0; }
export function estimateCampaign({ recipients, unitCostKRW, vatRate, budgetKRW }) {
  if (!Number.isSafeInteger(recipients) || recipients < 1 || !validAmount(unitCostKRW) || unitCostKRW <= 0 || !validAmount(vatRate) || vatRate > 1 || !validAmount(budgetKRW)) throw new Error('INVALID_BUDGET');
  const expectedKRW = Math.ceil(Number((recipients * unitCostKRW * (1 + vatRate)).toFixed(6)));
  if (!Number.isSafeInteger(expectedKRW)) throw new Error('INVALID_BUDGET');
  return { expectedKRW, withinBudget: expectedKRW <= budgetKRW };
}
// Deliberately narrower operational window than the legal overnight restriction.
export function isCrmSendTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  const h = new Date(date.getTime() + 9 * 3600000).getUTCHours();
  return h >= 9 && h < 20;
}
export function recipientExclusion(state, now = Date.now()) {
  if (state?.consent?.granted !== true) return 'consent_missing';
  if (state.relationship !== 'friend') return 'friend_unverified_or_blocked';
  const verified = new Date(state.verifiedAt || 0).getTime();
  if (!(verified > 0) || now - verified > 24 * 3600000 || verified > now) return 'relationship_stale';
  const added = new Date(state.addedAt || 0).getTime();
  if (!(added > 0) || now - added < 24 * 3600000) return 'welcome_cooldown';
  const last = new Date(state.lastCampaignAt || 0).getTime();
  if (last && now - last < 7 * 86400000) return 'frequency_cap';
  return null;
}
// Null costs are unknown, never zero. Net revenue must already exclude refunds/tax.
export function contribution({ netRevenueKRW, messageCostKRW, couponCostKRW, pgCostKRW, llmCostKRW }) {
  const values = [netRevenueKRW, messageCostKRW, couponCostKRW, pgCostKRW, llmCostKRW];
  return values.every(validAmount) ? netRevenueKRW - messageCostKRW - couponCostKRW - pgCostKRW - llmCostKRW : null;
}
