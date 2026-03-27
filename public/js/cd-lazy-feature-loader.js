(function () {
  'use strict';

  var loaded = false;

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

  function onCollectionOpened(event) {
    var detail = event && event.detail;
    if (!detail || detail.isOpen !== true) return;
    loadDeferredFeatureScripts();
  }

  document.addEventListener('cd:collection-toggle', onCollectionOpened, { passive: true });
})();

