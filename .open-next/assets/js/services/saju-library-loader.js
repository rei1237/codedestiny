(function (w) {
  'use strict';

  var CDN_URLS = [
    'https://cdn.jsdelivr.net/npm/lunar-javascript@latest/lunar.js',
    'https://unpkg.com/lunar-javascript@latest/lunar.js',
    'https://cdn.jsdelivr.net/npm/lunar-javascript/lunar.js',
    'https://unpkg.com/lunar-javascript/lunar.js',
    'https://cdn.jsdelivr.net/npm/lunar-javascript@latest/lunar.min.js',
    'https://unpkg.com/lunar-javascript@latest/lunar.min.js'
  ];

  var tried = 0;
  var libReady = false;
  var libLoading = false;

  function setRunButtonToRetry() {
    var btnEl = document.getElementById('run-btn');
    if (!btnEl) return;
    btnEl.disabled = false;
    btnEl.textContent = '🔄 라이브러리 다시 시도';
    btnEl.onclick = function () {
      retry();
    };
  }

  function hideOverlay() {
    var ov = document.getElementById('lib-overlay');
    if (!ov) return;
    ov.style.display = 'none';
    ov.classList.add('done');
    if (ov.parentNode) {
      ov.parentNode.removeChild(ov);
    }
  }

  function onLibReady() {
    libLoading = false;
    libReady = true;
    hideOverlay();

    var btn = document.getElementById('run-btn');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🐷 사주 분석하기';
      btn.onclick = function () {
        if (typeof w.checkPrivacyAndCalculate === 'function') {
          w.checkPrivacyAndCalculate();
        }
      };
    }
  }

  function waitForSolar(n) {
    if (n > 30) {
      loadNext();
      return;
    }
    if (typeof Solar !== 'undefined' && typeof Solar.fromYmdHms === 'function') {
      onLibReady();
    } else {
      setTimeout(function () {
        waitForSolar(n + 1);
      }, 100);
    }
  }

  function loadNext() {
    libLoading = true;

    if (tried >= CDN_URLS.length) {
      libLoading = false;

      var msgEl = document.getElementById('lib-msg');
      var subEl = document.getElementById('lib-sub');
      var btnEl = document.getElementById('run-btn');
      if (msgEl) msgEl.textContent = '❌ 라이브러리 로드 실패';
      if (subEl) subEl.textContent = '새로고침 후 다시 시도해주세요';
      if (btnEl) btnEl.textContent = '⚠️ 로드 실패 (다시 시도)';

      setTimeout(function () { hideOverlay(); }, 900);
      setRunButtonToRetry();
      return;
    }

    var url = CDN_URLS[tried];
    var sub = document.getElementById('lib-sub');
    if (sub) sub.textContent = 'CDN ' + (tried + 1) + '/' + CDN_URLS.length + ' 시도 중...';
    tried += 1;

    var done = false;
    var s = document.createElement('script');
    s.src = url;
    s.async = false;

    var failTimer = setTimeout(function () {
      if (done) return;
      done = true;
      try {
        if (s && s.parentNode) s.parentNode.removeChild(s);
      } catch (e) {}
      loadNext();
    }, 6000);

    s.onload = function () {
      if (done) return;
      done = true;
      clearTimeout(failTimer);
      waitForSolar(0);
    };

    s.onerror = function () {
      if (done) return;
      done = true;
      clearTimeout(failTimer);
      loadNext();
    };

    document.head.appendChild(s);
  }

  function retry() {
    if (libLoading) return;

    tried = 0;
    libReady = false;
    libLoading = true;

    var btnEl = document.getElementById('run-btn');
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = '🔄 라이브러리 재시도 중...';
    }

    loadNext();
  }

  function isReady() {
    return libReady;
  }

  function isLoading() {
    return libLoading;
  }

  function setReady(v) {
    libReady = !!v;
  }

  function setLoading(v) {
    libLoading = !!v;
  }

  w.SajuLibraryLoader = {
    retry: retry,
    loadNext: loadNext,
    waitForSolar: waitForSolar,
    onLibReady: onLibReady,
    hideOverlay: hideOverlay,
    isReady: isReady,
    isLoading: isLoading,
    setReady: setReady,
    setLoading: setLoading,
    setRunButtonToRetry: setRunButtonToRetry
  };

  w.retrySajuLibraryLoad = retry;

  // Preserve existing safety behavior that clears stale overlay.
  setTimeout(function () {
    hideOverlay();
  }, 15000);
})(window);
