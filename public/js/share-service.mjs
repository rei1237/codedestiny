// Shared by the static shell and React. No SDK/network work at module import.
// Kakao contract: https://developers.kakao.com/docs/ko/kakaotalk-share/js-link
export const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js';
let sdkPromise;

export function publicShareUrl(value, origin = 'https://code-destiny.com') {
  const base = new URL(origin);
  const url = new URL(value, base);
  if (!['https:', 'http:'].includes(url.protocol) || url.origin !== base.origin) throw new Error('UNSAFE_SHARE_URL');
  // Never propagate birth/profile/payment/query text from the current location.
  const id = url.searchParams.get('id');
  url.search = '';
  url.hash = '';
  if (url.pathname.replace(/\/$/, '') === '/fortune/share' && /^gf_[A-Za-z0-9_-]{24,80}$/.test(id || '')) url.searchParams.set('id', id);
  return url.toString();
}

export function prepareKakao(key, host = window) {
  if (!key) return Promise.resolve(false);
  if (host.Kakao?.isInitialized?.()) return Promise.resolve(Boolean(host.Kakao.Share));
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise(resolve => {
    const script = host.document.createElement('script');
    let settled = false;
    const finish = ready => {
      if (settled) return;
      settled = true;
      host.clearTimeout(timer);
      script.onload = script.onerror = null;
      if (!ready) script.remove();
      resolve(ready);
    };
    const timer = host.setTimeout(() => finish(false), 8000);
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      try {
        if (!host.Kakao?.isInitialized?.()) host.Kakao?.init(key);
        finish(Boolean(host.Kakao?.isInitialized?.() && host.Kakao?.Share));
      } catch { finish(false); }
    };
    script.onerror = () => finish(false);
    try { host.document.head.appendChild(script); }
    catch { finish(false); }
  }).catch(() => false).then(ready => {
    if (!ready) sdkPromise = undefined;
    return ready;
  });
  return sdkPromise;
}

/** Invoke on a user gesture; preload SDK when the share choices open. */
export async function shareThrough(channel, data, host = window) {
  if (channel === 'copy') {
    try {
      if (!host.navigator.clipboard?.writeText) return { status: 'manual' };
      await host.navigator.clipboard.writeText(data.url);
      return { status: 'copied' };
    } catch { return { status: 'manual' }; }
  }
  if (channel === 'native') {
    if (!host.navigator.share) return { status: 'unavailable' };
    try {
      await host.navigator.share({ title: data.title, text: data.text, url: data.url });
      return { status: 'shared' };
    } catch (error) {
      return { status: error?.name === 'AbortError' ? 'cancelled' : 'failed' };
    }
  }
  if (channel === 'kakao') {
    if (!host.Kakao?.isInitialized?.() || !host.Kakao.Share?.sendDefault) return { status: 'unavailable' };
    try {
      host.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: { title: data.title, description: data.text, imageUrl: data.image, link: { mobileWebUrl: data.url, webUrl: data.url } },
        buttons: [{ title: '나도 확인하기', link: { mobileWebUrl: data.url, webUrl: data.url } }],
      });
      // SDK opening is not evidence that a recipient actually received a message.
      return { status: 'opened' };
    } catch { return { status: 'failed' }; }
  }
  return { status: 'unavailable' };
}
