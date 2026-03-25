(function () {
  function loadScript(src) {
    if (typeof window.__loadScriptOnce === 'function') {
      return window.__loadScriptOnce(src, { defer: true });
    }
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.onload = resolve;
      s.onerror = resolve;
      document.body.appendChild(s);
    });
  }

  function scheduleUiAssistScripts() {
    var scripts = ['/js/fate-scroll-reveal.js', '/js/fate-scroll-top.js', '/js/fsn-navbar.js'];
    var chain = Promise.resolve();
    for (var i = 0; i < scripts.length; i += 1) {
      (function (src) {
        chain = chain.then(function () { return loadScript(src); });
      })(scripts[i]);
    }
  }

  function scheduleMobileBootstrapLoader() {
    var isMobile = window.matchMedia('(max-width: 900px)').matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (!isMobile) return;
    loadScript('/js/mobile-performance-bootstrap.js');
  }

  function scheduleTouchPerfLoader() {
    var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;
    loadScript('/js/touch-perf.js');
  }

  function scheduleOptionalFeatureBundles() {
    // Delay non-critical feature bundles to reduce desktop startup cost.
    var optionalScripts = [
      '/js/dream-meaning-library.js',
      '/lib/ai-engine.js',
      '/js/luck-sync-diary.js',
      '/js/dream-ledger.js',
      '/js/psycho-dream-analyzer-freuds-study.js',
      '/js/entertain-engine.js'
    ];

    function loadAllOptional(profile) {
      var cfg = profile || { maxParallel: 1 };
      var maxParallel = Math.max(1, Number(cfg.maxParallel || 1));
      var queue = optionalScripts.slice();
      var active = 0;

      function tick() {
        while (active < maxParallel && queue.length) {
          active += 1;
          loadScript(queue.shift()).finally(function () {
            active -= 1;
            tick();
          });
        }
      }

      tick();
    }

    function detectRuntimeProfile() {
      return new Promise(function (resolve) {
        var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        var fallback = {
          lowEnd: false,
          deferMs: 900,
          idleTimeout: 2200,
          maxParallel: 2
        };

        if (!('Worker' in window)) {
          resolve(fallback);
          return;
        }

        var worker = null;
        var timeoutId = setTimeout(function () {
          if (worker) worker.terminate();
          resolve(fallback);
        }, 450);

        try {
          worker = new Worker('/js/workers/runtime-profile.worker.js');
          worker.onmessage = function (ev) {
            clearTimeout(timeoutId);
            worker.terminate();
            resolve(ev && ev.data ? ev.data : fallback);
          };
          worker.onerror = function () {
            clearTimeout(timeoutId);
            worker.terminate();
            resolve(fallback);
          };
          worker.postMessage({
            cores: navigator.hardwareConcurrency || 0,
            deviceMemory: navigator.deviceMemory || 0,
            effectiveType: conn && conn.effectiveType ? conn.effectiveType : '',
            saveData: !!(conn && conn.saveData)
          });
        } catch (_e) {
          clearTimeout(timeoutId);
          if (worker) worker.terminate();
          resolve(fallback);
        }
      });
    }

    function scheduleOptionalLoad() {
      detectRuntimeProfile().then(function (profile) {
        var delay = Math.max(400, Number(profile && profile.deferMs || 900));
        var timeout = Math.max(1200, Number(profile && profile.idleTimeout || 2200));

        function run() {
          loadAllOptional(profile);
        }

        if (typeof requestIdleCallback === 'function') {
          requestIdleCallback(run, { timeout: timeout });
          return;
        }
        window.setTimeout(run, delay);
      });
    }

    if (document.readyState === 'complete') {
      scheduleOptionalLoad();
    } else {
      window.addEventListener('load', scheduleOptionalLoad, { once: true });
    }
  }

  function scheduleWebVitalsConsoleLoader() {
    try {
      var q = new URLSearchParams(location.search || '');
      var debugVitals = window.__ENABLE_WEB_VITALS_CONSOLE__ === true
        || q.get('debugVitals') === '1'
        || localStorage.getItem('debug.vitals') === '1';
      if (!debugVitals) return;
    } catch (e) {
      if (window.__ENABLE_WEB_VITALS_CONSOLE__ !== true) return;
    }

    try {
      var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      var saveData = !!(conn && conn.saveData);
      var et = conn && conn.effectiveType ? String(conn.effectiveType).toLowerCase() : '';
      var isSlow = et === 'slow-2g' || et === '2g';
      var isMobile = window.matchMedia('(max-width: 900px)').matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent);
      if ((isMobile && (saveData || isSlow)) || saveData) return;

      var loadVitals = function () {
        var s = document.createElement('script');
        s.type = 'module';
        s.src = '/js/web-vitals-console.js';
        document.body.appendChild(s);
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(loadVitals, { timeout: 3500 });
      } else {
        setTimeout(loadVitals, 1200);
      }
    } catch (e) {}
  }

  function onWindowLoad() {
    setTimeout(scheduleUiAssistScripts, 700);
  }

  if (document.readyState === 'complete') {
    onWindowLoad();
  } else {
    window.addEventListener('load', onWindowLoad, { once: true });
  }

  scheduleMobileBootstrapLoader();
  scheduleTouchPerfLoader();
  scheduleOptionalFeatureBundles();
  scheduleWebVitalsConsoleLoader();
})();
