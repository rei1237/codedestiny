(function () {
  'use strict';

  var loaded = false;
  var watcherBound = false;
  var INTENT_SELECTOR = '[data-action="openDreamLedger"], [data-action="analyzeDream"], [data-action="openPsychoDream"], [data-action="openEntertainHub"], #dreamLedgerModal, #psychoDreamModal';
  var intentBound = false;

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
      for (var i = 0; i < srcList.length; i++) {
        var raw = srcList[i];
        if (!raw) continue;
        var u = new URL(raw, window.location.href);
        if (!u || !u.origin || seen[u.origin]) continue;
        seen[u.origin] = true;
        var ln = document.createElement('link');
        ln.rel = 'preconnect';
        ln.href = u.origin;
        ln.crossOrigin = 'anonymous';
        document.head.appendChild(ln);
      }
    } catch (_) {}
  }

  function loadDeferredFeatureScripts() {
    if (loaded) return;
    loaded = true;

    var nodes = document.querySelectorAll('script[data-cd-lazy-src]');
    var srcList = [];
    for (var i = 0; i < nodes.length; i++) {
      var src = nodes[i].getAttribute('data-cd-lazy-src');
      if (src) srcList.push(src);
    }
    if (!srcList.length) return;

    preconnectOrigins(srcList);

    var start = function () { loadSeq(srcList, 0); };
    if (typeof window.requestIdleCallback === 'function') {
      requestIdleCallback(start, { timeout: 1200 });
      return;
    }
    setTimeout(start, 0);
  }

  function maybeLoadByIntent(e) {
    var t = e && e.target;
    if (!t || !t.closest) return;
    if (t.closest(INTENT_SELECTOR)) {
      loadDeferredFeatureScripts();
      unbindIntentListeners();
    }
  }

  function bindIntentListeners() {
    if (intentBound) return;
    intentBound = true;
    document.addEventListener('click', maybeLoadByIntent, { passive: true });
    document.addEventListener('pointerenter', maybeLoadByIntent, { passive: true, capture: true });
    document.addEventListener('focusin', maybeLoadByIntent, { passive: true });
    document.addEventListener('touchstart', maybeLoadByIntent, { passive: true });
  }

  function unbindIntentListeners() {
    if (!intentBound) return;
    intentBound = false;
    document.removeEventListener('click', maybeLoadByIntent, { passive: true });
    document.removeEventListener('pointerenter', maybeLoadByIntent, { passive: true, capture: true });
    document.removeEventListener('focusin', maybeLoadByIntent, { passive: true });
    document.removeEventListener('touchstart', maybeLoadByIntent, { passive: true });
  }

  function bindViewportPrefetch() {
    if (watcherBound || loaded) return;
    watcherBound = true;

    var nodes = document.querySelectorAll(INTENT_SELECTOR + ', .feature-card-grid .feat-collection, .feature-card-grid .tarot-collection');
    if (!nodes || !nodes.length) return;

    if (typeof IntersectionObserver !== 'undefined') {
      var obs = new IntersectionObserver(function(entries, observer) {
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].isIntersecting) continue;
          observer.disconnect();
          loadDeferredFeatureScripts();
          unbindIntentListeners();
          return;
        }
      }, {
        root: null,
        rootMargin: '220px 0px',
        threshold: 0.01
      });

      for (var j = 0; j < nodes.length; j++) {
        obs.observe(nodes[j]);
      }
      return;
    }

    // Fallback: throttle scroll/resize checks where IntersectionObserver is unavailable.
    var ticking = false;
    function checkNearViewport() {
      if (loaded) return;
      var vh = window.innerHeight || 0;
      for (var i = 0; i < nodes.length; i++) {
        var rect = nodes[i] && nodes[i].getBoundingClientRect ? nodes[i].getBoundingClientRect() : null;
        if (!rect) continue;
        if (rect.top <= vh + 220 && rect.bottom >= -120) {
          loadDeferredFeatureScripts();
          unbindIntentListeners();
          window.removeEventListener('scroll', onScroll, { passive: true });
          window.removeEventListener('resize', onScroll);
          return;
        }
      }
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function() {
        ticking = false;
        checkNearViewport();
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    checkNearViewport();
  }

  bindIntentListeners();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindViewportPrefetch, { once: true });
  } else {
    bindViewportPrefetch();
  }
})();

