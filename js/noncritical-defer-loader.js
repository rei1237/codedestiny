(function () {
  'use strict';

  var SELECTOR = 'script[data-cd-noncritical-src]';
  var STARTED = false;
  var MOBILE_DELAY_LEVEL = 0;

  function isMobile() {
    return window.matchMedia('(max-width: 900px)').matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
  }

  function isSaveData() {
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return !!(conn && conn.saveData);
  }

  function isLowEndAndroid() {
    var ua = String(navigator.userAgent || '').toLowerCase();
    if (ua.indexOf('android') === -1) return false;
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
    var mem = Number(navigator.deviceMemory || 0);
    var cores = Number(navigator.hardwareConcurrency || 0);
    var et = String(conn.effectiveType || '').toLowerCase();
    return !!(
      conn.saveData ||
      (mem > 0 && mem <= 4) ||
      (cores > 0 && cores <= 4) ||
      et === 'slow-2g' || et === '2g' || et === '3g'
    );
  }

  function shouldSkip(tag) {
    if (!tag) return false;
    if (isSaveData() && tag.getAttribute('data-cd-skip-save-data') === '1') return true;
    if (isLowEndAndroid() && tag.getAttribute('data-cd-lowend-skip') === '1') return true;
    if (isMobile()) {
      var mobileDelay = Number(tag.getAttribute('data-cd-mobile-delay') || '0');
      if (mobileDelay > MOBILE_DELAY_LEVEL) return true;
    }
    return false;
  }

  function nextIdle(fn) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(function () { fn(); }, { timeout: 1400 });
      return;
    }
    setTimeout(fn, 120);
  }

  function loadSequentially(nodes, idx, done) {
    if (!nodes || idx >= nodes.length) {
      if (typeof done === 'function') done();
      return;
    }
    var tag = nodes[idx];
    var src = tag.getAttribute('data-cd-noncritical-src');
    if (!src || shouldSkip(tag)) {
      loadSequentially(nodes, idx + 1, done);
      return;
    }

    if (document.querySelector('script[src="' + src + '"]')) {
      loadSequentially(nodes, idx + 1, done);
      return;
    }

    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.async = false;
    s.dataset.loading = '1';
    s.onload = function () {
      s.dataset.loading = '0';
      s.dataset.loaded = '1';
      nextIdle(function () { loadSequentially(nodes, idx + 1, done); });
    };
    s.onerror = function () {
      s.dataset.loading = '0';
      s.dataset.loaded = '0';
      nextIdle(function () { loadSequentially(nodes, idx + 1, done); });
    };
    document.body.appendChild(s);
  }

  function loadStylesSequentially(nodes, idx, done) {
    if (!nodes || idx >= nodes.length) {
      if (typeof done === 'function') done();
      return;
    }

    var tag = nodes[idx];
    var href = tag.getAttribute('data-cd-noncritical-style-src') || tag.getAttribute('href');

    if (!href || shouldSkip(tag)) {
      loadStylesSequentially(nodes, idx + 1, done);
      return;
    }

    var existing = document.querySelector('link[rel="stylesheet"][href="' + href + '"]');
    if (!existing || existing === tag) {
      if (tag.getAttribute('rel') !== 'stylesheet') {
        tag.setAttribute('rel', 'stylesheet');
      }
      if (!tag.getAttribute('href')) {
        tag.setAttribute('href', href);
      }
      tag.media = 'all';
      nextIdle(function () { loadStylesSequentially(nodes, idx + 1, done); });
      return;
    }

    nextIdle(function () { loadStylesSequentially(nodes, idx + 1, done); });
  }

  function start(level) {
    if (typeof level === 'number') {
      MOBILE_DELAY_LEVEL = Math.max(MOBILE_DELAY_LEVEL, level);
    }

    if (STARTED) return;
    STARTED = true;
    var styleNodes = document.querySelectorAll('link[data-cd-noncritical-style-src]');
    var scriptNodes = document.querySelectorAll(SELECTOR);

    if (!styleNodes.length && !scriptNodes.length) {
      STARTED = false;
      return;
    }

    loadStylesSequentially(styleNodes, 0, function () {
      if (!scriptNodes.length) {
        STARTED = false;
        return;
      }
      loadSequentially(scriptNodes, 0, function () {
        STARTED = false;
      });
    });
  }

  // 🔴 #dpMasterCard 는 data-action 도 .feature-card 도 아니다(버튼이 <button class="dp-mc-load-btn">).
  //    그래서 홈에서 다른 카드를 건드리지 않고 곧장 프로필 카드를 누른 모바일 사용자는 여기에
  //    걸리지 않아, styles/fortune-ui.css 가 아래 45초 폴백까지 오지 않았다. 그 시트에 프로필
  //    카드가 여는 운세 유형 선택 모달과 실제 운세 화면의 규칙이 들어 있다.
  function isFeatureIntentEvent(event) {
    var target = event && event.target;
    if (!target || !(target instanceof Element)) return false;
    return !!target.closest('[data-action], [data-touchend-action], .tarot-tile, .feature-card, .feat-collection-toggle, .fc-toggle-btn, #dpMasterCard');
  }

  function boot() {
    var mobile = isMobile();
    MOBILE_DELAY_LEVEL = 0;

    // 스타일 지연 적용으로 초기 화면이 깨지는 문제를 막기 위해 CSS는 즉시 연결한다.

    var events = mobile
      ? ['pointerdown', 'touchstart', 'keydown']
      : ['pointerdown', 'keydown', 'click'];

    function onIntent(event) {
      if (mobile && !isFeatureIntentEvent(event)) return;
      start(1);
    }

    for (var i = 0; i < events.length; i += 1) {
      window.addEventListener(events[i], onIntent, { passive: true });
    }

    document.addEventListener('cd:collection-toggle', function (event) {
      var detail = event && event.detail;
      if (detail && detail.isOpen === true) {
        start(1);
      }
    }, { passive: true });

    // 사용자 상호작용이 전혀 없는 긴 세션에서도 기능이 준비되도록 매우 늦게 로드한다.
    setTimeout(function () {
      start(1);
    }, mobile ? 45000 : 22000);

    // 탭이 백그라운드로 갈 때는 사용자 체감 영향이 거의 없어 미뤄둔 스크립트를 로드한다.
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') start(2);
    }, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
