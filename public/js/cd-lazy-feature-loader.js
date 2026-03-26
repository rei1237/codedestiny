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
    loadSeq(srcList, 0);
  }

  function maybeLoadByIntent(e) {
    var t = e && e.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-action="openDreamLedger"], [data-action="analyzeDream"], [data-action="openPsychoDream"], [data-action="openEntertainHub"], #dreamLedgerModal, #psychoDreamModal')) {
      loadDeferredFeatureScripts();
    }
  }

  document.addEventListener('click', maybeLoadByIntent, { passive: true });
})();

