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
    s.onload = function () {
      nextIdle(function () { loadSequentially(nodes, idx + 1, done); });
    };
    s.onerror = function () {
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

  function boot() {
    var mobile = isMobile();
    MOBILE_DELAY_LEVEL = 0;

    var events = mobile
      ? ['pointerdown', 'touchstart', 'keydown', 'scroll']
      : ['pointerdown', 'keydown', 'click', 'scroll'];
    for (var i = 0; i < events.length; i += 1) {
      window.addEventListener(events[i], function () {
        start(1);
      }, { once: true, passive: true });
    }

    // 사용자 상호작용이 전혀 없는 긴 세션에서도 기능이 준비되도록 매우 늦게 로드한다.
    setTimeout(function () {
      start(1);
    }, mobile ? 18000 : 14000);

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
