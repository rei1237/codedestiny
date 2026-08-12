;(function () {
  'use strict';

  var APP_ERR_BOX_ID = 'appStabilityFallback';
  var MAX_OVERLAY_MS = 8000;
  var INIT_FALLBACK_MS = 5000;
  var overlayWatch = { startedAt: 0, active: false };
  var _initDone = false;
  var _longTaskCount = 0;
  var _runtimeDebug = false;

  function now() { return Date.now(); }

  function shouldDebugRuntimeLog() {
    if (_runtimeDebug) return true;
    try {
      var q = new URLSearchParams(location.search || '');
      var queryOn = q.get('debugRuntime') === '1' || q.get('debugPerf') === '1';
      var localOn = localStorage.getItem('debug.runtime') === '1' || localStorage.getItem('debug.perf') === '1';
      _runtimeDebug = !!(queryOn || localOn || window.__ENABLE_RUNTIME_DEBUG__ === true);
    } catch (e) {
      _runtimeDebug = !!(window.__ENABLE_RUNTIME_DEBUG__ === true);
    }
    return _runtimeDebug;
  }

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

  function shouldKeepSplashForProfile() {
    return window.__cdMainSplashWaitingForProfile === true
      && window.__cdDestinyProfileServerReady !== true;
  }

  function stopBlockingOverlays(reason) {
    if (window._perf && typeof window._perf.unlockBody === 'function') {
      window._perf.unlockBody();
    }

    var splash = document.getElementById('codeSplash');
    if (splash && !shouldKeepSplashForProfile()) {
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
      /* 🔴 단건 결제창을 여는 동안은 시계를 계속 되감는다.
         이 감시견은 "멈춘 로더"를 구제하려는 것인데, 카드 결제의 대기 화면은 멈춘 게 아니라
         **설계상 오래 걸리는 것**이다 — checkout(클라 예산 25초) → SDK → 주문 설정 → PortOne
         requestPayment 까지 한 번도 내리지 않고 붙든다(index.html 의 '오버레이는 finally 에서만
         내린다' 주석). 8초에 강제로 끄면 사용자는 대기 화면이 사라졌다가 다음 단계에서 다시 뜨는
         것을 보고 **결제 대기가 두 번 뜬다**고 느낀다. 느릴수록 반드시 겪는다.
         정지가 아니라 리셋인 이유: 플래그가 걸린 채 잊혀도 결국 8초 뒤 구제가 돌아온다. 플래그
         자체도 억제 창(45초·600초 상한)과 수명이 같아 영구히 남지 않는다. */
      if (overlayWatch.active && document.body && document.body.classList.contains('cd-direct-pg-open')) {
        overlayWatch.startedAt = now();
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

  function getErrorText(reason) {
    try {
      if (typeof reason === 'string') return reason;
      if (reason && reason.message) return String(reason.message || '');
      return String(reason || '');
    } catch (e) {
      return '';
    }
  }

  function isWalletExtensionError(reason) {
    return /metamask|ethereum|wallet extension|extension not found|failed to connect to metamask/i.test(getErrorText(reason));
  }

  function isRecoverableSessionRestoreError(reason) {
    return /restore session|restoring session|restoresession|session restore/i.test(getErrorText(reason));
  }

  function isExtensionSource(src) {
    return /^(chrome|moz|safari)-extension:\/\//i.test(String(src || ''));
  }

  function preventRuntimeDefault(e) {
    try { if (e && typeof e.preventDefault === 'function') e.preventDefault(); } catch (_) {}
  }

  function patchGlobalHandlers() {
    window.addEventListener('error', function (e) {
      try {
        var src = e && e.target && e.target.src ? e.target.src : '';
        var tag = e && e.target && e.target.tagName ? String(e.target.tagName).toUpperCase() : '';
        var pageRoot = '';
        try { pageRoot = String(location.origin || '') + '/'; } catch (__) { pageRoot = ''; }
        if (isExtensionSource(src) || isWalletExtensionError(e && (e.error || e.message)) || isRecoverableSessionRestoreError(e && (e.error || e.message))) {
          preventRuntimeDefault(e);
          ensureMainUiVisible();
          return;
        }
        if (src) {
          if (tag === 'IMG') {
            // Some themes probe the page root as an image URL; ignore this noisy false-positive.
            if (src === pageRoot) return;
            console.warn('[runtime-stability] image load error:', src);
          }
          else if (tag === 'AUDIO' || tag === 'SOURCE') console.warn('[runtime-stability] audio load error:', src);
          else console.error('[runtime-stability] script load error:', src);
        } else {
          console.error('[runtime-stability] global error:', e && e.message ? e.message : e);
        }
      } catch(ex) {}
      stopBlockingOverlays('global-error');
      ensureMainUiVisible();
    }, true);

    window.addEventListener('unhandledrejection', function (e) {
      if (isWalletExtensionError(e && e.reason) || isRecoverableSessionRestoreError(e && e.reason)) {
        preventRuntimeDefault(e);
        ensureMainUiVisible();
        return;
      }
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
            if (shouldDebugRuntimeLog()) {
              try { console.warn('[runtime-stability] long task detected:', Math.round(entry.duration) + 'ms'); } catch (e) {}
            }
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
      /* 스플래시는 splash.js가 3초 후 제거 — init 완료 시 즉시 숨기지 않음 */
      ensureMainUiVisible();
    }

    /* 스플래시 3초 노출 후 정리 (splash.js와 동기화) */
    setTimeout(stopBlockingOverlays, 4000);
    setTimeout(stopBlockingOverlays, 7000);

    window.addEventListener('resize', function () {
      setDynamicVhVar();
    }, { passive: true });

    window.addEventListener('orientationchange', function () {
      setTimeout(setDynamicVhVar, 80);
      setTimeout(stopBlockingOverlays, 3000);
    }, { passive: true });

    window.addEventListener('pageshow', function () {
      patchCriticalFns();
      setTimeout(stopBlockingOverlays, 3000);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp, { once: true });
  } else {
    initApp();
  }
})();
