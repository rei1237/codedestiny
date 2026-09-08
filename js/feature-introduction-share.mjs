import { publicShareUrl, shareThrough } from './share-service.mjs';

/** Public introductions only: no current location, profile, payment, or result data. */
export function introductionShareData(detail, kind = 'feature', channel = 'native') {
  if (!detail || detail.verification !== 'verified' || !/^[a-z0-9-]+$/.test(detail.slug)) throw new Error('INVALID_PUBLIC_INTRODUCTION');
  const site = kind === 'site';
  const url = new URL(publicShareUrl(site ? '/' : `/features/${detail.slug}/`));
  url.searchParams.set('utm_source', channel === 'copy' ? 'copy' : 'native');
  url.searchParams.set('utm_medium', 'share');
  url.searchParams.set('utm_campaign', 'public_share');
  return {
    title: site ? 'CODE DESTINY · 내 질문에 맞는 운세 찾기' : `${detail.title} | CODE DESTINY`,
    text: site ? '관계, 나의 성향, 앞으로의 흐름. 지금 궁금한 질문에 맞는 운세를 함께 찾아보세요.' : String(detail.journey?.questions?.[0] || detail.headline || detail.title),
    url: url.href,
  };
}

const busy = new WeakSet();
export async function shareIntroductionFromButton(button, detail, host = window) {
  const section = button.closest('[data-feature-share-section]');
  if (!section || busy.has(section)) return;
  busy.add(section);
  button.disabled = true;
  const kind = button.dataset.featureShare.startsWith('site') ? 'site' : 'feature';
  const channel = button.dataset.featureShare.endsWith('copy') ? 'copy' : 'native';
  const status = section.querySelector('[role="status"]');
  const manual = section.querySelector('input');
  const track = (name, params) => { try { host.cdTrack?.(name, params); } catch { /* analytics must not block sharing */ } };
  const params = { contentType: kind === 'site' ? 'website' : 'software', source: 'feature_introduction', content_id: kind === 'site' ? 'site' : detail.slug, shareChannel: channel };
  try {
    const data = introductionShareData(detail, kind, channel);
    track('share_button_click', params);
    let outcome = await shareThrough(channel, data, host);
    // Cancellation is not a request to copy. Native sharing is optional on desktop.
    if (outcome.status === 'unavailable') outcome = await shareThrough('copy', data, host);
    if (manual) { manual.hidden = true; manual.value = data.url; }
    const messages = { copied: '소개 링크를 복사했어요. 카카오톡이나 원하는 곳에 붙여 넣어 주세요.', shared: '공유 창에서 전달했어요.', cancelled: '공유를 취소했어요.', manual: '아래 소개 링크를 선택해 복사해 주세요.', failed: '공유를 열지 못했어요. 링크 복사를 이용해 주세요.' };
    if (status) status.textContent = messages[outcome.status] || messages.failed;
    if (manual && outcome.status === 'manual') { manual.hidden = false; manual.focus(); manual.select(); }
    track(`share_${channel === 'copy' ? 'copy_link' : channel}`, { ...params, outcome: outcome.status });
  } catch {
    if (status) status.textContent = '공유 링크를 준비하지 못했어요. 잠시 후 다시 시도해 주세요.';
  } finally { button.disabled = false; busy.delete(section); }
}

// The homepage uses the same public-site payload and interaction, without a new
// SDK, referral reward, modal, or current-location sharing path.
if (typeof document !== 'undefined') document.addEventListener('click', event => {
  const button = event.target instanceof Element ? event.target.closest('#cdPublicSiteShare [data-feature-share]') : null;
  if (button) void shareIntroductionFromButton(button, { slug: 'site', title: 'CODE DESTINY', verification: 'verified' });
});
