(function (window, document) {
  'use strict';

  function copyWithFallback(url) {
    var value = String(url || '');
    if (!value) return Promise.reject(new Error('GUARDIAN_FORTUNE_SHARE_URL_EMPTY'));
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(value).then(function () {
        return { ok: true, method: 'clipboard' };
      });
    }
    return new Promise(function (resolve, reject) {
      var input = document.createElement('input');
      input.type = 'text';
      input.value = value;
      input.readOnly = true;
      input.setAttribute('aria-label', '공유 링크');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.focus();
      input.select();
      var copied = false;
      try { copied = Boolean(document.execCommand('copy')); } catch (_) { copied = false; }
      input.remove();
      if (copied) resolve({ ok: true, method: 'execCommand' });
      else reject(new Error('GUARDIAN_FORTUNE_SHARE_COPY_FAILED'));
    });
  }

  async function shareWithWebShare(payload) {
    if (!navigator.share) return { ok: false, supported: false };
    try {
      await navigator.share({
        title: String(payload.title || '오늘의 귀인 운세'),
        text: String(payload.text || ''),
        url: String(payload.url || '')
      });
      return { ok: true, method: 'web-share' };
    } catch (error) {
      if (error && error.name === 'AbortError') return { ok: false, cancelled: true, supported: true };
      return { ok: false, supported: true, error: error };
    }
  }

  async function shareWithKakao(payload) {
    var kakao = window.Kakao;
    if (!kakao || !kakao.Share || typeof kakao.Share.sendDefault !== 'function') {
      return { ok: false, supported: false };
    }
    if (typeof kakao.isInitialized === 'function' && !kakao.isInitialized()) {
      return { ok: false, supported: false };
    }
    try {
      kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: String(payload.title || '오늘의 귀인 운세'),
          description: String(payload.text || ''),
          imageUrl: String(payload.imageUrl || ''),
          link: { mobileWebUrl: String(payload.url || ''), webUrl: String(payload.url || '') }
        },
        buttons: [{
          title: '내 귀인 운세 보기',
          link: { mobileWebUrl: String(payload.url || ''), webUrl: String(payload.url || '') }
        }]
      });
      return { ok: true, method: 'kakao' };
    } catch (error) {
      return { ok: false, supported: true, error: error };
    }
  }

  async function sharePreferred(method, payload) {
    if (method === 'copy') return copyWithFallback(payload.url);
    if (method === 'kakao') {
      var kakaoResult = await shareWithKakao(payload);
      if (kakaoResult.ok || kakaoResult.cancelled) return kakaoResult;
    }
    var webResult = await shareWithWebShare(payload);
    if (webResult.ok || webResult.cancelled) return webResult;
    return copyWithFallback(payload.url);
  }

  window.CDGuardianFortuneShare = {
    copyWithFallback: copyWithFallback,
    shareWithWebShare: shareWithWebShare,
    shareWithKakao: shareWithKakao,
    sharePreferred: sharePreferred
  };
})(window, document);
