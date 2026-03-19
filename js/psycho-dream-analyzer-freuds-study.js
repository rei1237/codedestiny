(function () {
  'use strict';
  if (window.__cdPsychoDreamBridgeLoaded) return;
  window.__cdPsychoDreamBridgeLoaded = true;

  function load(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('load failed: ' + src)); };
      document.head.appendChild(s);
    });
  }

  function boot() {
    if (typeof window.openPsychoDreamModal === 'function') return;
    load('/public/js/psycho-dream-analyzer-freuds-study.js').catch(function () {
      console.error('[psycho-dream-bridge] failed to load /public/js/psycho-dream-analyzer-freuds-study.js');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
