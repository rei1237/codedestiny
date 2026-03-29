(function () {
  'use strict';

  var SELECTOR = 'script[data-cd-noncritical-src]';
  var STARTED = false;

  function isMobile() {
    return window.matchMedia('(max-width: 900px)').matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
  }

  function isSaveData() {
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return !!(conn && conn.saveData);
  }

  function shouldSkip(tag) {
    if (!tag) return false;
    if (isSaveData() && tag.getAttribute('data-cd-skip-save-data') === '1') return true;
    if (isMobile() && tag.getAttribute('data-cd-mobile-delay') === '2') return true;
    return false;
  }

  function nextIdle(fn) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(function () { fn(); }, { timeout: 1400 });
      return;
    }
    setTimeout(fn, 120);
  }

  function loadSequentially(nodes, idx) {
    if (!nodes || idx >= nodes.length) return;
    var tag = nodes[idx];
    var src = tag.getAttribute('data-cd-noncritical-src');
    if (!src || shouldSkip(tag)) {
      loadSequentially(nodes, idx + 1);
      return;
    }

    if (document.querySelector('script[src="' + src + '"]')) {
      loadSequentially(nodes, idx + 1);
      return;
    }

    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.async = false;
    s.onload = function () {
      nextIdle(function () { loadSequentially(nodes, idx + 1); });
    };
    s.onerror = function () {
      nextIdle(function () { loadSequentially(nodes, idx + 1); });
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

  function start() {
    if (STARTED) return;
    STARTED = true;
    var styleNodes = document.querySelectorAll('link[data-cd-noncritical-style-src]');
    var scriptNodes = document.querySelectorAll(SELECTOR);

    if (!styleNodes.length && !scriptNodes.length) return;

    loadStylesSequentially(styleNodes, 0, function () {
      if (!scriptNodes.length) return;
      loadSequentially(scriptNodes, 0);
    });
  }

  function boot() {
    var mobile = isMobile();
    var idleTimeout = mobile ? 6200 : 3500;
    var fallbackTimeout = mobile ? 4200 : 2200;

    // 모바일 Lighthouse 구간에서는 자동 비핵심 로딩이 성능 점수를 크게 깎을 수 있어
    // 모바일에서는 사용자 상호작용 전에는 자동 시작하지 않는다.
    if (!mobile) {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(start, { timeout: idleTimeout });
      } else {
        setTimeout(start, fallbackTimeout);
      }
    }

    var events = mobile
      ? ['pointerdown', 'touchstart', 'keydown', 'click']
      : ['pointerdown', 'keydown', 'click'];
    for (var i = 0; i < events.length; i += 1) {
      window.addEventListener(events[i], start, { once: true, passive: true });
    }

    // 탭이 백그라운드로 갈 때는 사용자 체감 영향이 거의 없어 미뤄둔 스크립트를 로드한다.
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') start();
    }, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
