(function () {
  'use strict';

  var loading = false;
  var loadedSrcMap = Object.create(null);
  var interactionCount = 0;

  function isMobile() {
    return window.matchMedia('(max-width: 900px)').matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
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

  function loadSeq(srcList, idx) {
    if (idx >= srcList.length) return;
    var s = document.createElement('script');
    s.src = srcList[idx];
    s.defer = true;
    s.async = false;
    s.onload = function () { loadSeq(srcList, idx + 1); };
    s.onerror = function () { loadSeq(srcList, idx + 1); };
    document.body.appendChild(s);
  }

  function preconnectOrigins(srcList) {
    try {
      var seen = {};
      var thirdPartyCount = 0;
      for (var i = 0; i < srcList.length; i++) {
        var raw = srcList[i];
        if (!raw) continue;
        var u = new URL(raw, window.location.href);
        if (!u || !u.origin || seen[u.origin]) continue;
        if (u.origin === window.location.origin) continue;
        if (thirdPartyCount >= 2) continue;
        seen[u.origin] = true;
        thirdPartyCount += 1;
        var ln = document.createElement('link');
        ln.rel = 'preconnect';
        ln.href = u.origin;
        ln.crossOrigin = 'anonymous';
        document.head.appendChild(ln);
      }
    } catch (_) {}
  }

  function loadDeferredFeatureScripts() {
    if (loading) return;

    var nodes = document.querySelectorAll('script[data-cd-lazy-src]');
    var srcList = [];
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (isLowEndAndroid() && node.getAttribute('data-cd-lowend-skip') === '1') continue;
      var delayLevel = Number(node.getAttribute('data-cd-mobile-delay') || '0');
      if (isMobile() && delayLevel > interactionCount) continue;
      var src = node.getAttribute('data-cd-lazy-src');
      if (!src || loadedSrcMap[src]) continue;
      srcList.push(src);
    }
    if (!srcList.length) return;

    loading = true;

    preconnectOrigins(srcList);

    var start = function () {
      loadSeq(srcList, 0);
      for (var i = 0; i < srcList.length; i += 1) {
        loadedSrcMap[srcList[i]] = 1;
      }
      loading = false;
    };
    if (typeof window.requestIdleCallback === 'function') {
      requestIdleCallback(start, { timeout: 1200 });
      return;
    }
    setTimeout(start, 0);
  }

  function onCollectionOpened(event) {
    var detail = event && event.detail;
    if (!detail || detail.isOpen !== true) return;
    interactionCount = Math.max(interactionCount, 1);
    loadDeferredFeatureScripts();
  }

  function isFeatureIntentEvent(event) {
    var target = event && event.target;
    if (!target || !(target instanceof Element)) return false;
    return !!target.closest('[data-action], [data-touchend-action], .tarot-tile, .feature-card, .feat-collection-toggle, .fc-toggle-btn');
  }

  function onFirstInteraction(event) {
    if (isMobile() && !isFeatureIntentEvent(event)) return;
    interactionCount = Math.max(interactionCount + 1, 1);
    loadDeferredFeatureScripts();
  }

  function boot() {
    document.addEventListener('cd:collection-toggle', onCollectionOpened, { passive: true });

    var events = ['pointerdown', 'touchstart', 'keydown', 'click'];
    for (var i = 0; i < events.length; i += 1) {
      window.addEventListener(events[i], onFirstInteraction, { passive: true });
    }

    setTimeout(function () {
      interactionCount = Math.max(interactionCount, 1);
      loadDeferredFeatureScripts();
    }, isMobile() ? 50000 : 24000);

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        interactionCount = Math.max(interactionCount, 1);
        loadDeferredFeatureScripts();
      }
    }, { once: true });
  }

  boot();
})();

