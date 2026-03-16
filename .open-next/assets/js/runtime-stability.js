;(function () {
  'use strict';

  var APP_ERR_BOX_ID = 'appStabilityFallback';
  var MAX_OVERLAY_MS = 8000;
  var INIT_FALLBACK_MS = 5000;
  var overlayWatch = { startedAt: 0, active: false };
  var _initDone = false;
  var _longTaskCount = 0;

  function now() { return Date.now(); }

  function showFallback(msg) {
    // Disabled per UX request: do not show runtime fallback toasts.
    var cur = document.getElementById(APP_ERR_BOX_ID);
    if (cur && cur.parentNode) cur.parentNode.removeChild(cur);
  }

  function hardHide(el, removeNode) {
    if (!el) return;
    el.style.display = 'none';
    el.style.visibility = 'hidden';
    el.style.opacity = '0';
    el.classList.remove('show');
    el.classList.add('done');
    if (removeNode && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  function stopBlockingOverlays(reason) {
    if (window._perf && typeof window._perf.unlockBody === 'function') {
      window._perf.unlockBody();
    }

    var splash = document.getElementById('codeSplash');
    if (splash) {
      splash.style.display = 'none';
      if (splash.parentNode) splash.parentNode.removeChild(splash);
    }

    var libOv = document.getElementById('lib-overlay');
    if (libOv) {
      libOv.style.display = 'none';
      if (libOv.parentNode) libOv.parentNode.removeChild(libOv);
    }

    var loader = document.getElementById('sajuLoaderOverlay');
    if (loader) {
      hardHide(loader, false);
    }

    if (reason) showFallback();
  }

  function hideLoadingScreen(reason) {
    stopBlockingOverlays(reason || 'hide-loading');
  }

  function ensureMainUiVisible() {
    var main = document.querySelector('main');
    if (main) {
      main.style.display = '';
      main.style.visibility = 'visible';
      main.style.opacity = '1';
    }
    var wrap = document.querySelector('.wrap');
    if (wrap) {
      wrap.style.visibility = 'visible';
      wrap.style.opacity = '1';
    }
    document.body.style.visibility = 'visible';
  }

  function watchLoaderLifetime() {
    var loader = document.getElementById('sajuLoaderOverlay');
    if (!loader) return;

    var checkTimer = setInterval(function () {
      var visible = loader.style.display !== 'none' && getComputedStyle(loader).display !== 'none';
      if (visible && !overlayWatch.active) {
        overlayWatch.active = true;
        overlayWatch.startedAt = now();
      }
      if (!visible && overlayWatch.active) {
        overlayWatch.active = false;
        overlayWatch.startedAt = 0;
      }
      if (overlayWatch.active && now() - overlayWatch.startedAt > MAX_OVERLAY_MS) {
        stopBlockingOverlays('loader-timeout');
        overlayWatch.active = false;
        overlayWatch.startedAt = 0;
      }
    }, 900);

    window.addEventListener('pagehide', function () {
      clearInterval(checkTimer);
    }, { once: true });
  }

  function patchGlobalHandlers() {
    window.addEventListener('error', function (e) {
      try {
        var src = e && e.target && e.target.src ? e.target.src : '';
        if (src) {
          console.error('[runtime-stability] script load error:', src);
        } else {
          console.error('[runtime-stability] global error:', e && e.message ? e.message : e);
        }
      } catch(ex) {}
      stopBlockingOverlays('global-error');
      ensureMainUiVisible();
    }, true);

    window.addEventListener('unhandledrejection', function (e) {
      try { console.error('[runtime-stability] unhandled rejection:', e.reason); } catch(ex) {}
      stopBlockingOverlays('promise-rejection');
      ensureMainUiVisible();
    });
  }

  function wrapCriticalFn(name) {
    var fn = window[name];
    if (typeof fn !== 'function' || fn.__wrappedSafe__) return;

    var wrapped = function () {
      try {
        var res = fn.apply(this, arguments);
        if (res && typeof res.then === 'function') {
          return res.catch(function (err) {
            try { console.error('[runtime-stability] async ' + name + ' failed', err); } catch (e) {}
            showFallback();
            return null;
          });
        }
        return res;
      } catch (err) {
        try { console.error('[runtime-stability] sync ' + name + ' failed', err); } catch (e) {}
        showFallback();
        return null;
      }
    };
    wrapped.__wrappedSafe__ = true;
    window[name] = wrapped;
  }

  function patchCriticalFns() {
    [
      'calculate',
      'startSajuCalculationFlow',
      'renderSummary',
      'renderZiwei',
      'renderAstroInsight',
      'renderSukuyo'
    ].forEach(wrapCriticalFn);
  }

  function runSafeTask(label, fn) {
    try {
      var out = fn();
      if (out && typeof out.then === 'function') {
        return out.catch(function (err) {
          try { console.error('[runtime-stability] task failed: ' + label, err); } catch (e) {}
          return null;
        });
      }
      return Promise.resolve(out);
    } catch (err) {
      try { console.error('[runtime-stability] task crashed: ' + label, err); } catch (e) {}
      return Promise.resolve(null);
    }
  }

  function loadCoreFeatures() {
    return Promise.all([
      runSafeTask('setDynamicVhVar', function () { setDynamicVhVar(); }),
      runSafeTask('patchGlobalHandlers', function () { patchGlobalHandlers(); }),
      runSafeTask('patchCriticalFns', function () { patchCriticalFns(); }),
      runSafeTask('watchLoaderLifetime', function () { watchLoaderLifetime(); }),
      runSafeTask('ensureMainUiVisible', function () { ensureMainUiVisible(); })
    ]);
  }

  function installSafeFetch() {
    if (window.__appSafeFetch) return;
    window.__appSafeFetch = function(url, opts) {
      var options = opts || {};
      var timeoutMs = typeof options.timeout === 'number' ? options.timeout : 8000;
      var controller = null;
      var timer = null;
      var fetchOpts = Object.assign({}, options);
      delete fetchOpts.timeout;

      if (typeof AbortController !== 'undefined') {
        controller = new AbortController();
        fetchOpts.signal = controller.signal;
        timer = setTimeout(function() {
          try { controller.abort(); } catch (e) {}
        }, timeoutMs);
      }

      return fetch(url, fetchOpts)
        .finally(function() {
          if (timer) clearTimeout(timer);
        })
        .catch(function(err) {
          try { console.error('[runtime-stability] safeFetch failed:', url, err); } catch (e) {}
          return null;
        });
    };
  }

  function monitorLongTasks() {
    if (!('PerformanceObserver' in window)) return;
    try {
      var obs = new PerformanceObserver(function(list) {
        var entries = list.getEntries();
        _longTaskCount += entries.length;
        if (_longTaskCount >= 5) {
          document.documentElement.classList.add('runtime-safe-lite');
        }
        entries.forEach(function(entry) {
          if (entry && entry.duration > 50) {
            try { console.warn('[runtime-stability] long task detected:', Math.round(entry.duration) + 'ms'); } catch (e) {}
          }
        });
      });
      obs.observe({ type: 'longtask', buffered: true });
      window.addEventListener('pagehide', function () {
        try { obs.disconnect(); } catch (e) {}
      }, { once: true });
    } catch (e) {}
  }

  function setDynamicVhVar() {
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--app-vh', vh + 'px');
  }

  function installRuntimeSafeStyles() {
    var id = 'runtimeSafeLiteStyle';
    if (document.getElementById(id)) return;
    var st = document.createElement('style');
    st.id = id;
    st.textContent = ''
      + '.runtime-safe-lite .smoke-layer,'
      + '.runtime-safe-lite .flickering-lamp,'
      + '.runtime-safe-lite .saju-vortex,'
      + '.runtime-safe-lite .saju-vortex::before,'
      + '.runtime-safe-lite .saju-vortex::after,'
      + '.runtime-safe-lite .ritual-particle{animation:none !important;}'
      + '.runtime-safe-lite .tarot-focus-overlay,'
      + '.runtime-safe-lite .astral-modal-overlay,'
      + '.runtime-safe-lite .dp-sheet,'
      + '.runtime-safe-lite .card{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}'
      + '.runtime-safe-lite .orb{display:none !important;}';
    document.head.appendChild(st);
  }

  async function initApp() {
    if (_initDone) return;
    _initDone = true;

    var hardTimeout = setTimeout(function () {
      hideLoadingScreen('init-fallback-timeout');
      ensureMainUiVisible();
    }, INIT_FALLBACK_MS);

    try {
      await loadCoreFeatures();
      installSafeFetch();
      installRuntimeSafeStyles();
      monitorLongTasks();
    } catch (err) {
      try { console.error('[runtime-stability] initApp failed', err); } catch (e) {}
      showFallback();
    } finally {
      clearTimeout(hardTimeout);
      hideLoadingScreen('init-finally');
      ensureMainUiVisible();
    }

    // Multi-phase cleanup to ensure stale overlays never survive.
    setTimeout(stopBlockingOverlays, 2500);
    setTimeout(stopBlockingOverlays, 7000);
    setTimeout(stopBlockingOverlays, 14000);

    window.addEventListener('resize', function () {
      setDynamicVhVar();
    }, { passive: true });

    window.addEventListener('orientationchange', function () {
      setTimeout(setDynamicVhVar, 80);
      setTimeout(stopBlockingOverlays, 1200);
    }, { passive: true });

    window.addEventListener('pageshow', function () {
      patchCriticalFns();
      setTimeout(stopBlockingOverlays, 250);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp, { once: true });
  } else {
    initApp();
  }
})();
